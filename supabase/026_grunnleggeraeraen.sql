-- B-182: Grunnleggeræraen, ingen automatisk sesong 2, og aktive dager registrert av serveren (fase 1A i RETNING.md).
-- Kjørt som migrasjonen «grunnleggeraeraen», og season_status() på nytt som «grunnleggeraeraen_uten_sesong» (den første
-- utgaven feilet når ingen sesong pågår – testet i en transaksjon som ble rullet tilbake, før det kunne skje).
--
-- 1. Verdensinnstillinger i `config` (id 'world'). `auto_next_season` = false: season_status() starter ikke neste
--    sesong av seg selv når Sesong 1 er over (B-167 står i koden, men er slått av). Koden og historikken slettes ikke.
-- 2. `eras`: perioden spillet er i. Nå: Grunnleggeræraen, fra starten av Sesong 1 og uten slutt. Navnet på neste æra
--    og hva som nullstilles da, er ikke bestemt.
-- 3. `activity_days`: dagene (UTC) serveren har fått en lagring fra spilleren. Aktiv spiller = aktiv minst
--    `active_min_days` forskjellige dager de siste `active_window_days` (2 av 14). Teller kontoer som faktisk spiller,
--    ikke antall kontoer. Brukes senere til overtakelser og anbud – bare av serverfunksjoner.

insert into public.config (id, value)
values ('world', '{"auto_next_season": false, "active_min_days": 2, "active_window_days": 14}')
on conflict (id) do update set value = excluded.value || public.config.value;

-- ------------------------------------------------------------------ æraer
create table if not exists public.eras (
  id serial primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  -- Hva som nullstilles eller beholdes når æraen slutter (ikke bestemt ennå)
  rules jsonb not null default '{}'::jsonb
);
alter table public.eras enable row level security;
drop policy if exists "æraer: alle leser" on public.eras;
create policy "æraer: alle leser" on public.eras for select to anon, authenticated using (true);

insert into public.eras (name, starts_at)
select 'Grunnleggeræraen', coalesce((select min(starts_at) from public.seasons), now())
where not exists (select 1 from public.eras);

-- ------------------------------------------------------------------ aktive dager
create table if not exists public.activity_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
alter table public.activity_days enable row level security;
-- Ingen regler: bare serverfunksjoner leser og skriver

create or replace function public.note_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_days (user_id, day)
  values (new.user_id, (now() at time zone 'utc')::date)
  on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.note_activity() from public, anon, authenticated;

drop trigger if exists saves_note_activity on public.saves;
create trigger saves_note_activity
  after insert or update on public.saves
  for each row execute function public.note_activity();

-- Dagene før: fra tidslinja (tidspunktet er serverens) og siste lagring
insert into public.activity_days (user_id, day)
select distinct user_id, (at at time zone 'utc')::date from public.snapshots
on conflict do nothing;
insert into public.activity_days (user_id, day)
select user_id, (updated_at at time zone 'utc')::date from public.saves
on conflict do nothing;

-- Aktive spillere etter innstillingene i config 'world'
create or replace function public.active_players()
returns table (user_id uuid, days int)
language sql
stable
security definer
set search_path = public
as $$
  with w as (
    select coalesce((value->>'active_min_days')::int, 2) as min_days,
           coalesce((value->>'active_window_days')::int, 14) as window_days
    from public.config where id = 'world'
  )
  select a.user_id, count(*)::int
  from public.activity_days a, w
  where a.day > (now() at time zone 'utc')::date - w.window_days
  group by a.user_id, w.min_days
  having count(*) >= w.min_days;
$$;
revoke execute on function public.active_players() from public, anon, authenticated;

-- ------------------------------------------------------------------ sesongstatus
-- Som i 020, men neste sesong starter bare når `auto_next_season` er på, og svaret har med æraen
create or replace function public.season_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  cur record;
  prev record;
  ended record;
  tw record;
  era record;
  cur_json json;
  era_json json;
  played boolean := false;
  latest record;
  next_start timestamptz;
  auto_next boolean;
begin
  for ended in
    select s.id from public.seasons s
    where s.ends_at <= now() and not exists (select 1 from public.season_results r where r.season_id = s.id)
  loop
    perform public.close_season(ended.id);
  end loop;

  select coalesce((value->>'auto_next_season')::boolean, true) into auto_next from public.config where id = 'world';

  -- B-167: er sesongen over, starter neste av seg selv, 26 uker fra der den forrige sluttet – bare når det er slått
  -- på (B-182). Låsen hindrer at to spillere som spør samtidig, starter hver sin
  if coalesce(auto_next, true)
     and not exists (select 1 from public.seasons where now() >= starts_at and now() < ends_at) then
    perform pg_advisory_xact_lock(hashtext('stalverk_neste_sesong'));
    select id, ends_at into latest from public.seasons order by ends_at desc limit 1;
    if latest.id is not null and latest.ends_at <= now()
       and not exists (select 1 from public.seasons where now() >= starts_at and now() < ends_at) then
      next_start := case when latest.ends_at + make_interval(weeks => 26) > now() then latest.ends_at else now() end;
      insert into public.seasons (name, starts_at, ends_at)
      values ('Sesong ' || ((select count(*) from public.seasons) + 1), next_start,
              next_start + make_interval(weeks => 26));
    end if;
  end if;

  select id, name, starts_at, ends_at, twist into cur
  from public.seasons where now() >= starts_at and now() < ends_at
  order by starts_at desc limit 1;

  if cur.id is not null then
    select id into prev from public.seasons where ends_at <= cur.starts_at order by ends_at desc limit 1;
    if prev.id is not null and auth.uid() is not null then
      played := exists (select 1 from public.snapshots where user_id = auth.uid() and season_id = prev.id);
    end if;
    select * into tw from public.season_twists where id = cur.twist;
  end if;

  -- Postene er tomme når ingen sesong pågår; da kan feltene ikke leses (slik blir det når Sesong 1 er over)
  if cur.id is not null then
    cur_json := json_build_object(
      'id', cur.id, 'name', cur.name, 'starts_at', cur.starts_at, 'ends_at', cur.ends_at,
      'twist', case when tw.id is null then null else json_build_object(
        'id', tw.id, 'title', tw.title, 'text', tw.text, 'scrap', tw.scrap, 'steel', tw.steel, 'power', tw.power) end);
  end if;

  select id, name, starts_at into era from public.eras
  where starts_at <= now() and (ends_at is null or ends_at > now())
  order by starts_at desc limit 1;
  if era.id is not null then
    era_json := json_build_object('id', era.id, 'name', era.name, 'starts_at', era.starts_at);
  end if;

  return json_build_object('current', cur_json, 'played_previous', played, 'era', era_json);
end;
$$;
