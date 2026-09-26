-- Stålverket: daglig belønning, dagens oppdrag og «mens du var borte» (B-149). Kjørt som migrasjonen «daglig».
--
-- Alt som belønner virkelig tid, krever konto og telles på serveren (docs/KONTO.md): dagen er norsk dato fra
-- serverens klokke, og tida borte måles mellom lagringene på serveren. Da hjelper det ikke å stille klokka på
-- mobilen. Selve belønningen legges inn i spillet av appen (src/game/daily.ts).
--
-- Juksesperren (check_snapshot) får plass til belønningene: hver henting legger til like mange «døgns drift» i
-- bonus_days, og neste snapshot tillater så mange døgn ekstra vekst. Så nullstilles bonus_days.

create table if not exists public.daily (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Daglig belønning: dag i serien (1–7) og datoen den sist ble hentet
  streak int not null default 0,
  reward_date date,
  -- Datoen bonusen for dagens oppdrag sist ble hentet
  missions_date date,
  -- Mens du var borte: sist sett (lagring eller henting), et opphold som ikke er hentet ennå
  last_seen timestamptz,
  gap_seconds int not null default 0,
  gap_claimed boolean not null default true,
  -- Døgns drift som er gitt siden forrige snapshot (til juksesperren)
  bonus_days numeric not null default 0
);
alter table public.daily enable row level security;
drop policy if exists "daglig: les egen" on public.daily;
create policy "daglig: les egen" on public.daily for select to authenticated using (user_id = auth.uid());

-- Dagens dato i Norge
create or replace function public.oslo_today()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'Europe/Oslo')::date;
$$;

-- Døgns drift for dag 1–7 i serien. Må stemme med STREAK_REWARDS i src/game/daily.ts
create or replace function public.streak_days(s int)
returns numeric
language sql
immutable
set search_path = public
as $$
  select (array[0, 0.5, 0, 1, 0, 1.5, 3]::numeric[])[greatest(1, least(7, s))];
$$;

-- Status uten å hente noe: dagens dato, om belønningen er hentet, og hvilken dag i serien som står for tur
create or replace function public.daily_status()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d public.daily;
  t date := public.oslo_today();
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  select * into d from public.daily where user_id = auth.uid();
  return json_build_object(
    'today', t,
    'claimed', coalesce(d.reward_date = t, false),
    'streak', coalesce(d.streak, 0),
    'next', case when d.reward_date = t then d.streak
                 when d.reward_date = t - 1 then d.streak % 7 + 1
                 else 1 end,
    'missions_claimed', coalesce(d.missions_date = t, false)
  );
end;
$$;

-- Henter dagens belønning. Hoppet man over en dag, starter serien på dag 1; etter dag 7 begynner en ny uke
create or replace function public.claim_daily_reward()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.daily;
  t date := public.oslo_today();
  s int;
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  insert into public.daily (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select * into d from public.daily where user_id = auth.uid() for update;
  if d.reward_date = t then
    return json_build_object('already', true, 'streak', d.streak, 'today', t);
  end if;
  s := case when d.reward_date = t - 1 then d.streak % 7 + 1 else 1 end;
  update public.daily
  set streak = s, reward_date = t, bonus_days = bonus_days + public.streak_days(s) + 0.5
  where user_id = auth.uid();
  return json_build_object('already', false, 'streak', s, 'today', t);
end;
$$;

-- Bonusen for dagens oppdrag, én gang per dag (appen sjekker at oppdragene er gjort)
create or replace function public.claim_daily_missions()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.daily;
  t date := public.oslo_today();
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  insert into public.daily (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select * into d from public.daily where user_id = auth.uid() for update;
  if d.missions_date = t then
    return json_build_object('already', true, 'today', t);
  end if;
  -- 1 døgns drift (MISSION_BONUS i src/game/daily.ts) og litt margin
  update public.daily set missions_date = t, bonus_days = bonus_days + 1.5 where user_id = auth.uid();
  return json_build_object('already', false, 'today', t);
end;
$$;

-- Hvor lenge spilleren har vært borte (sekunder, høyst åtte timer), og merker det som hentet. Et opphold teller
-- når det er gått minst ti minutter siden forrige lagring eller henting.
create or replace function public.claim_away()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.daily;
  gap int;
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  insert into public.daily (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select * into d from public.daily where user_id = auth.uid() for update;
  if d.last_seen is not null and now() - d.last_seen > interval '10 minutes' then
    gap := extract(epoch from now() - d.last_seen)::int;
  elsif not d.gap_claimed then
    gap := d.gap_seconds;
  else
    gap := 0;
  end if;
  gap := least(gap, 8 * 3600);
  update public.daily
  set last_seen = now(), gap_seconds = 0, gap_claimed = true,
      -- 0,25 døgns drift per time (AWAY_DAYS_PER_HOUR i src/game/daily.ts) og litt margin; under 30 min gir ingenting
      bonus_days = bonus_days + case when gap >= 1800 then gap / 3600.0 * 0.25 + 0.5 else 0 end
  where user_id = auth.uid();
  return gap;
end;
$$;

-- Kalles av save_game: husker når spilleren sist lagret. Kommer en lagring etter et opphold, huskes oppholdet til
-- appen henter det (claim_away), så det spiller ingen rolle hva som kommer først.
create or replace function public.touch_activity()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.daily as d (user_id, last_seen) values (auth.uid(), now())
  on conflict (user_id) do update set
    gap_seconds = case when d.last_seen is not null and now() - d.last_seen > interval '10 minutes'
                       then least(extract(epoch from now() - d.last_seen)::int, 8 * 3600)
                       else d.gap_seconds end,
    gap_claimed = case when d.last_seen is not null and now() - d.last_seen > interval '10 minutes'
                       then false
                       else d.gap_claimed end,
    last_seen = now();
end;
$$;

revoke execute on function public.daily_status() from public, anon;
revoke execute on function public.claim_daily_reward() from public, anon;
revoke execute on function public.claim_daily_missions() from public, anon;
revoke execute on function public.claim_away() from public, anon;
revoke execute on function public.touch_activity() from public, anon;
grant execute on function public.daily_status() to authenticated;
grant execute on function public.claim_daily_reward() to authenticated;
grant execute on function public.claim_daily_missions() to authenticated;
grant execute on function public.claim_away() to authenticated;
grant execute on function public.touch_activity() to authenticated;

-- Lagringen husker også når spilleren sist var her (til «mens du var borte»)
create or replace function public.save_game(p_state jsonb, p_minute integer, p_day integer, p_client_version text,
  p_season_id integer, p_device text, p_base_rev bigint)
returns bigint
language plpgsql
set search_path = public
as $$
declare
  r bigint;
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  perform public.touch_activity();
  update public.saves
  set state = p_state, minute = p_minute, day = p_day, client_version = p_client_version,
      season_id = p_season_id, device = p_device
  where user_id = auth.uid() and rev = p_base_rev
  returning rev into r;
  if r is not null then
    return r;
  end if;
  if exists (select 1 from public.saves where user_id = auth.uid()) then
    return null;
  end if;
  insert into public.saves (user_id, state, minute, day, client_version, season_id, device)
  values (auth.uid(), p_state, p_minute, p_day, p_client_version, p_season_id, p_device)
  returning rev into r;
  return r;
end;
$$;

-- Juksesperren med plass til belønningene: bonus_days døgn ekstra, så nullstilles de
create or replace function public.check_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prev record;
  cap numeric;
  maxeq numeric;
  reason text;
  bonus numeric;
begin
  if exists (
    select 1 from public.snapshots
    where user_id = new.user_id and day > new.day + 1 and (season_id is not distinct from new.season_id)
  ) then
    if new.day > 2 then
      update public.profiles set rewound_at = now() where id = new.user_id;
    end if;
    delete from public.snapshots
    where user_id = new.user_id and day > new.day and (season_id is not distinct from new.season_id);
  end if;

  select day, equity into prev
  from public.snapshots
  where user_id = new.user_id and day < new.day
    and (season_id is not distinct from new.season_id)
  order by day desc
  limit 1;

  select coalesce(d.bonus_days, 0) into bonus from public.daily d where d.user_id = new.user_id;
  bonus := coalesce(bonus, 0);

  cap := case new.stage
    when 0 then 100000
    when 1 then 600000
    when 2 then 2500000
    when 3 then 20000000
    else 1500000000
  end;
  maxeq := case new.stage
    when 0 then 1000000
    when 1 then 6000000
    when 2 then 50000000
    when 3 then 250000000
    else null
  end;

  if maxeq is not null and new.equity > maxeq then
    reason := format('konsernverdi %s på nivå %s', new.equity, new.stage);
  end if;
  if prev.day is not null
     and (new.equity - prev.equity) > (cap + 0.25 * greatest(prev.equity, 0)) * (greatest(new.day - prev.day, 1) + bonus) then
    reason := format('vekst %s på %s døgn (+%s døgn belønning), nivå %s', new.equity - prev.equity, new.day - prev.day, bonus, new.stage);
  end if;

  if reason is not null then
    update public.profiles
    set flagged_at = now(), flag_reason = reason
    where id = new.user_id and flagged_at is null;
  end if;

  if bonus > 0 then
    update public.daily set bonus_days = 0 where user_id = new.user_id;
  end if;

  update public.profiles set league = public.league_of(new.stage, new.equity) where id = new.user_id;
  return new;
end;
$$;
