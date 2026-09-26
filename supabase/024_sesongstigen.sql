-- B-173: Sesongstigen – noe å gjøre hele sesongen (seks måneder). Brukeren: «På dag 3 har jeg absolutt alt. Jeg trenger
-- ting å gjøre i 6 mnd.» Spillet går 12 s per spilldøgn på 10×, så bare det som følger virkelig tid, varer. Stigen får
-- poeng av det serveren alt vet og som bare kan skje én gang per virkelige dag eller uke:
--   1 poeng per dag med spill i sesongen (en lagring på nett den dagen, norsk tid),
--   2 poeng for dagens belønning, 3 for dagens oppdrag (når de hentes),
--   12 / 9 / 7 poeng for 1., 2. og 3. plass på ukelista.
-- 20 poeng per trinn, 50 trinn. Med spill hver dag nås toppen omtrent ved sesongslutt. Hvert trinn gir fagpoeng
-- (20 + 2 × trinn), og trinn 10, 20, 30, 40 og 50 gir pynt som bare finnes på stigen (i appen).

create table if not exists public.season_points (
  user_id uuid not null references auth.users (id) on delete cascade,
  season_id integer not null references public.seasons (id),
  day date not null,
  source text not null,
  points integer not null,
  primary key (user_id, season_id, day, source)
);
alter table public.season_points enable row level security;
revoke all on table public.season_points from anon, authenticated;

create table if not exists public.season_track_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  season_id integer not null references public.seasons (id),
  tier integer not null,
  fp integer not null,
  claimed_at timestamptz not null default now(),
  primary key (user_id, season_id, tier)
);
alter table public.season_track_claims enable row level security;
revoke all on table public.season_track_claims from anon, authenticated;

create or replace function public.current_season_id()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select id from public.seasons where now() >= starts_at and now() < ends_at order by starts_at desc limit 1;
$$;
revoke execute on function public.current_season_id() from public, anon, authenticated;

create or replace function public.add_season_points(p_user uuid, p_source text, p_points integer)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.season_points (user_id, season_id, day, source, points)
  select p_user, x.s, public.oslo_today(), p_source, p_points
  from (select public.current_season_id() as s) x
  where x.s is not null and p_user is not null
  on conflict do nothing;
$$;
revoke execute on function public.add_season_points(uuid, text, integer) from public, anon, authenticated;

-- Poeng på stigen for en spiller i en sesong
create or replace function public.season_track_points(p_user uuid, p_season integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (
    coalesce((select sum(points) from public.season_points where user_id = p_user and season_id = p_season), 0)
    + (select count(distinct (s.at at time zone 'Europe/Oslo')::date)
       from public.snapshots s where s.user_id = p_user and s.season_id = p_season)
    + coalesce((
        select sum(case r.plass when 1 then 12 when 2 then 9 else 7 end)
        from public.weekly_results r
        join public.seasons se on se.id = p_season
        where r.user_id = p_user
          and r.week_start >= (se.starts_at at time zone 'Europe/Oslo')::date
          and r.week_start < (se.ends_at at time zone 'Europe/Oslo')::date
      ), 0)
  )::integer;
$$;
revoke execute on function public.season_track_points(uuid, integer) from public, anon, authenticated;

create or replace function public.season_track()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  sid integer;
  pts integer;
  t date := public.oslo_today();
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  sid := public.current_season_id();
  if sid is null then
    return json_build_object('season_id', null);
  end if;
  pts := public.season_track_points(auth.uid(), sid);
  return json_build_object(
    'season_id', sid,
    'points', pts,
    'per_tier', 20,
    'max_tier', 50,
    'tier', least(50, pts / 20),
    'claimed', coalesce((select json_agg(tier order by tier) from public.season_track_claims
                         where user_id = auth.uid() and season_id = sid), '[]'::json),
    'played_today', exists (select 1 from public.snapshots s where s.user_id = auth.uid() and s.season_id = sid
                            and (s.at at time zone 'Europe/Oslo')::date = t),
    'reward_today', exists (select 1 from public.season_points p where p.user_id = auth.uid() and p.season_id = sid
                            and p.day = t and p.source = 'belonning'),
    'missions_today', exists (select 1 from public.season_points p where p.user_id = auth.uid() and p.season_id = sid
                              and p.day = t and p.source = 'oppdrag')
  );
end;
$$;
revoke execute on function public.season_track() from public, anon;
grant execute on function public.season_track() to authenticated;

-- Henter alle trinn som er nådd og ikke hentet. Gir fagpoengene tilbake (appen legger dem i spillet)
create or replace function public.claim_season_tiers()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  sid integer;
  reached integer;
  got integer[];
  total integer;
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  sid := public.current_season_id();
  if sid is null then
    return json_build_object('tiers', '[]'::json, 'fp', 0);
  end if;
  reached := least(50, public.season_track_points(auth.uid(), sid) / 20);
  with ins as (
    insert into public.season_track_claims (user_id, season_id, tier, fp)
    select auth.uid(), sid, t, 20 + 2 * t from generate_series(1, reached) t
    on conflict do nothing
    returning tier, fp
  )
  select coalesce(array_agg(tier order by tier), '{}'), coalesce(sum(fp), 0)::integer into got, total from ins;
  return json_build_object('tiers', to_json(got), 'fp', total);
end;
$$;
revoke execute on function public.claim_season_tiers() from public, anon;
grant execute on function public.claim_season_tiers() to authenticated;

-- Belønning og oppdrag gir poeng på stigen (som i 013, med én linje til hver)
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
  perform public.add_season_points(auth.uid(), 'belonning', 2);
  return json_build_object('already', false, 'streak', s, 'today', t);
end;
$$;

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
  update public.daily set missions_date = t, bonus_days = bonus_days + 1.5 where user_id = auth.uid();
  perform public.add_season_points(auth.uid(), 'oppdrag', 3);
  return json_build_object('already', false, 'today', t);
end;
$$;

-- Nye titler etter Stållegende (B-173), samme grenser som i appen
create or replace function public.title_of(equity numeric)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when equity >= 1000000000000000 then 'Stålikon'
    when equity >= 100000000000000 then 'Stålmyte'
    when equity >= 25000000000000 then 'Stålkolosse'
    when equity >= 5000000000000 then 'Stålgigant'
    when equity >= 1000000000000 then 'Stållegende'
    when equity >= 250000000000 then 'Stålkeiser'
    when equity >= 100000000000 then 'Stålkonge'
    when equity >= 50000000000 then 'Stålfyrste'
    when equity >= 25000000000 then 'Stålmagnat'
    when equity >= 10000000000 then 'Stålbaron'
  end;
$$;
