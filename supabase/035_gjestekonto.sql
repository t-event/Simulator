-- 035 Gjestekonto og juksesperren (B-212)
--
-- 1) Juksesperren: taket på konsernverdi per nivå gjaldt hvert tall på tidslinja. En spiller som ble lenge på
--    stålverket og sparte, ble flagget (51,5 mill. etter 300 døgn, jevn vekst). Nå gjelder taket bare det første
--    tallet i sesongen; etterpå passer vekstsperren på.
-- 2) Gjestekonto (Supabase «anonymous sign-ins»): appen lager en gjest i bakgrunnen, så spillet lagres på nett fra
--    første stund. En gjest får IKKE gjøre noe mer før hen oppretter konto (eierens beslutning): bare lagre spillet og
--    tidslinja, og lese det alle kan lese. Sperren står i én funksjon som PostgREST kjører før hvert kall
--    (pgrst.db_pre_request), med en liste over det gjester får lov til. Nye funksjoner er derfor stengt for gjester.
--    Gjester teller ikke som aktive spillere og gir ikke skraplageret inntekt. Oppretter gjesten konto, flyttes
--    tidslinja til kontoen (hvis den er ny) og gjesten slettes.

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
  pct numeric;
  back record;
  eqback record;
  pctback numeric;
  win record;
  need numeric;
  took numeric;
begin
  -- En gjest som oppretter konto, tar med seg tidslinja (B-212): adopt_guest flytter tallene uten ny sjekk
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    return new;
  end if;

  -- Tida er serverens, ikke appens (B-176)
  new.at := now();

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

  select day, equity, produced_t into prev
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

  -- Taket per nivå gjelder bare det første tallet i sesongen (B-212). Etterpå passer vekstsperren på: en spiller kan
  -- bli lenge på samme nivå og spare opp (enzo ble flagget med 51,5 mill. på stålverket etter 300 ærlige døgn)
  if maxeq is not null and prev.day is null and new.equity > maxeq then
    reason := format('konsernverdi %s på nivå %s', new.equity, new.stage);
  end if;
  -- Etter sluttmålet (10 mrd.) kan kjøp av stålkomplekser og modernisering gi et stort hopp på ett døgn (B-150)
  pct := case when new.stage >= 4 and coalesce(prev.equity, 0) >= 10000000000 then 0.5 else 0.25 end;
  if prev.day is not null
     and (new.equity - prev.equity) > (cap + pct * greatest(prev.equity, 0)) * (greatest(new.day - prev.day, 1) + bonus) then
    -- B-194: et kjøp gir et hopp på ett døgn. Flagg bare hvis også veksten fra minst tre døgn tilbake er for høy
    select day, equity into eqback
    from public.snapshots
    where user_id = new.user_id and day <= new.day - 3 and not pre_reform
      and (season_id is not distinct from new.season_id)
    order by day desc
    limit 1;
    pctback := case when new.stage >= 4 and coalesce(eqback.equity, 0) >= 10000000000 then 0.5 else 0.25 end;
    if eqback.day is null
       or (new.equity - eqback.equity) > (cap + pctback * greatest(eqback.equity, 0)) * ((new.day - eqback.day) + bonus) then
      reason := format('vekst %s på %s døgn (+%s døgn belønning), nivå %s', new.equity - prev.equity, new.day - prev.day, bonus, new.stage);
    end if;
  end if;
  -- Tonn (B-158, B-162): 100 000 t per døgn, og også snittet fra minst tre døgn tilbake må være for høyt
  if prev.day is not null and prev.produced_t is not null and new.produced_t is not null
     and (new.produced_t - prev.produced_t) > 100000 * greatest(new.day - prev.day, 1) then
    select day, produced_t into back
    from public.snapshots
    where user_id = new.user_id and day <= new.day - 3 and produced_t is not null
      and (season_id is not distinct from new.season_id)
    order by day desc
    limit 1;
    if back.day is null or (new.produced_t - back.produced_t) > 100000 * (new.day - back.day) then
      reason := format('%s tonn på %s døgn', new.produced_t - prev.produced_t, new.day - prev.day);
    end if;
  end if;

  -- Fart (B-176): spillminuttene siden en lagring minst 10 minutter tilbake må ha tatt minst så lang tid
  if new.game_min is not null and new.boost_min is not null then
    select s.day, s.at, s.game_min, s.boost_min into win
    from public.snapshots s
    where s.user_id = new.user_id and (s.season_id is not distinct from new.season_id)
      and s.day < new.day and s.game_min is not null and s.boost_min is not null
      and s.at <= now() - interval '10 minutes'
    order by s.at desc
    limit 1;
    if win.day is not null and new.game_min > win.game_min then
      need := greatest(0, (new.game_min - win.game_min) - greatest(0, new.boost_min - win.boost_min)) / 120.0
        + greatest(0, new.boost_min - win.boost_min) / 720.0;
      took := extract(epoch from now() - win.at);
      if took < need * 0.85 - 60 then
        reason := format('for fort: %s døgn på %s min (minst %s min med 10×)', new.day - win.day,
          round(took / 60), round(need / 60));
      end if;
    end if;
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

-- Er den som kaller, en gjest? (is_anonymous i JWT-en fra innloggingen)
create or replace function public.is_guest()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'is_anonymous')::boolean, false);
$$;
-- Sperren under kjøres med rollen til den som kaller, også uten innlogging
grant execute on function public.is_guest() to anon, authenticated;

-- Er kontoen en gjest? (for triggere som gjelder en bestemt konto)
create or replace function public.user_is_guest(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.is_anonymous from auth.users u where u.id = p_user), false);
$$;
revoke execute on function public.user_is_guest(uuid) from public, anon, authenticated;

-- Kjøres av PostgREST før hvert kall. Vanlige kontoer og kall uten innlogging slipper rett gjennom.
create or replace function public.guest_gate()
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  p text;
begin
  if not public.is_guest() then
    return;
  end if;
  p := regexp_replace(coalesce(current_setting('request.path', true), ''), '^/?(rest/v1/)?', '');
  if p in ('rpc/save_game', 'rpc/guest_handover', 'rpc/delete_my_account', 'saves', 'snapshots', 'config',
           'rpc/leaderboard', 'rpc/season_status', 'rpc/active_events', 'rpc/weekly_board',
           'seasons', 'events', 'eras', 'season_results') then
    return;
  end if;
  raise sqlstate 'PGRST' using
    message = json_build_object('code', 'GJEST', 'message', 'Dette krever en konto.')::text,
    detail = json_build_object('status', 403)::text;
end;
$$;
grant execute on function public.guest_gate() to anon, authenticated;

alter role authenticator set pgrst.db_pre_request = 'public.guest_gate';
notify pgrst, 'reload config';

-- Kallenavn (og dermed topplister og ukelista) også sperret i selve funksjonen, i tilfelle sperren over faller bort
create or replace function public.set_nickname(name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n text := btrim(name);
begin
  if auth.uid() is null or public.is_guest() then
    raise exception 'Du er ikke logget inn.';
  end if;
  if length(n) < 3 or length(n) > 20 then
    raise exception 'Kallenavnet må ha 3–20 tegn.';
  end if;
  if n !~ '^[A-Za-z0-9ÆØÅæøåÄÖÜäöüÉéÈè _.-]+$' then
    raise exception 'Bruk bare bokstaver, tall, mellomrom, punktum, bindestrek og understrek.';
  end if;
  if exists (select 1 from public.profiles where lower(nickname) = lower(n) and id <> auth.uid()) then
    raise exception 'Kallenavnet er tatt. Velg et annet.';
  end if;
  update public.profiles set nickname = n where id = auth.uid();
  return n;
end;
$$;

-- Gjester får ikke «mens du var borte» (B-149)
create or replace function public.touch_activity()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_guest() then
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

-- Gjester teller ikke som aktive spillere (B-182) ...
create or replace function public.note_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.user_is_guest(new.user_id) then
    return new;
  end if;
  insert into public.activity_days (user_id, day)
  values (new.user_id, (now() at time zone 'utc')::date)
  on conflict do nothing;
  return new;
end;
$$;

-- ... og produksjonen deres gir ikke skraplageret inntekt (B-188)
create or replace function public.meter_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.user_is_guest(new.user_id) then
    return new;
  end if;
  perform public.meter_register(new.user_id, new.season_id, new.game_min, new.produced_t, coalesce(new.at, now()));
  return new;
end;
$$;

-- Overlevering: gjesten lager en engangskode rett før hen logger inn eller oppretter konto, og den nye kontoen
-- bruker koden til å ta over tidslinja. Koden gjelder en time.
create table if not exists public.guest_handover (
  code text primary key,
  guest_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.guest_handover enable row level security;
revoke all on table public.guest_handover from anon, authenticated;

create or replace function public.guest_handover()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null or not public.is_guest() then
    raise exception 'bare for gjester';
  end if;
  delete from public.guest_handover where guest_id = auth.uid() or created_at < now() - interval '1 day';
  insert into public.guest_handover (code, guest_id) values (c, auth.uid());
  return c;
end;
$$;
revoke execute on function public.guest_handover() from public, anon;
grant execute on function public.guest_handover() to authenticated;

-- Kontoen tar over gjesten: tidslinja flyttes hvis kontoen ikke har noen fra før, og gjesten slettes
create or replace function public.adopt_guest(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  g uuid;
  moved int := 0;
begin
  if uid is null or public.is_guest() then
    raise exception 'ikke logget inn';
  end if;
  delete from public.guest_handover
  where code = p_code and created_at > now() - interval '1 hour'
  returning guest_id into g;
  if g is null or g = uid or not public.user_is_guest(g) then
    return json_build_object('ok', false, 'moved', 0);
  end if;
  if not exists (select 1 from public.snapshots where user_id = uid) then
    update public.snapshots set user_id = uid where user_id = g;
    get diagnostics moved = row_count;
    -- Var gjesten flagget av juksesperren, følger flagget med
    update public.profiles p set flagged_at = gp.flagged_at, flag_reason = gp.flag_reason
    from public.profiles gp
    where p.id = uid and gp.id = g and gp.flagged_at is not null and p.flagged_at is null;
  end if;
  delete from auth.users where id = g and is_anonymous;
  return json_build_object('ok', true, 'moved', moved);
end;
$$;
revoke execute on function public.adopt_guest(text) from public, anon;
grant execute on function public.adopt_guest(text) to authenticated;
