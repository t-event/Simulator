-- B-221: Sesongene har ingen sluttdato. En sesong varer til administrator avslutter den; ny sesong startes manuelt.
--
-- Eieren: «Det skal ikke være sluttdato noen plass. Ny sesong skal gjøres manuelt». Før hadde Sesong 1 sluttdatoen
-- 2027-03-25, og season_status() kunne starte neste sesong av seg selv (slått av med en bryter i B-182).
-- Nå: seasons.ends_at er tom så lenge sesongen pågår, og settes bare når sesongen avsluttes. Den automatiske neste
-- sesongen er fjernet fra season_status(). Administrator bruker (i SQL-editoren, ikke appen):
--   select end_season();                               -- avslutter sesongen som pågår (resultatene lages)
--   select start_season('Sesong 2');                   -- avslutter den som pågår og starter en ny
--   select start_season('Sesong 2', 'skrapmangel');    -- med vri
-- Æraene (B-182) var allerede uten slutt.

alter table public.seasons alter column ends_at drop not null;

-- Sesong 1 pågår og får ingen sluttdato
update public.seasons set ends_at = null where ends_at > now();

create or replace function public.current_season_id()
returns integer
language sql
stable security definer
set search_path to 'public'
as $$
  select id from public.seasons
  where now() >= starts_at and (ends_at is null or now() < ends_at)
  order by starts_at desc limit 1;
$$;

create or replace function public.season_status()
returns json
language plpgsql
security definer
set search_path to 'public'
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
begin
  -- Sesonger som er avsluttet, men ikke har fått resultater ennå
  for ended in
    select s.id from public.seasons s
    where s.ends_at is not null and s.ends_at <= now()
      and not exists (select 1 from public.season_results r where r.season_id = s.id)
  loop
    perform public.close_season(ended.id);
  end loop;

  -- Ingen automatisk neste sesong (B-221): den startes manuelt med start_season()
  select id, name, starts_at, ends_at, twist into cur
  from public.seasons where now() >= starts_at and (ends_at is null or now() < ends_at)
  order by starts_at desc limit 1;

  if cur.id is not null then
    select id into prev from public.seasons
    where ends_at is not null and ends_at <= cur.starts_at order by ends_at desc limit 1;
    if prev.id is not null and auth.uid() is not null then
      played := exists (select 1 from public.snapshots where user_id = auth.uid() and season_id = prev.id);
    end if;
    select * into tw from public.season_twists where id = cur.twist;
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

-- Sesongstigen: ukepremiene teller for ukene i sesongen, også når den ikke har noen slutt ennå
create or replace function public.season_track_points(p_user uuid, p_season integer)
returns integer
language sql
stable security definer
set search_path to 'public'
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
          and (se.ends_at is null or r.week_start < (se.ends_at at time zone 'Europe/Oslo')::date)
      ), 0)
  )::integer;
$$;

-- Avslutter sesongen som pågår (resultatene lages), uten å starte en ny. Bare for administrator.
create or replace function public.end_season()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  sid int := public.current_season_id();
begin
  if sid is null then
    raise exception 'Ingen sesong pågår';
  end if;
  update public.seasons set ends_at = now() where id = sid;
  perform public.close_season(sid);
  return sid;
end;
$$;

-- Ny sesong, manuelt: avslutter den som pågår og starter en ny uten sluttdato. Bare for administrator.
drop function if exists public.start_season(text, integer, text);
create function public.start_season(name text, twist text default null)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  s record;
  nid int;
begin
  for s in select id from public.seasons where ends_at is null or ends_at > now() loop
    update public.seasons set ends_at = now() where id = s.id;
    perform public.close_season(s.id);
  end loop;
  for s in select id from public.seasons x
    where x.ends_at <= now() and not exists (select 1 from public.season_results r where r.season_id = x.id)
  loop
    perform public.close_season(s.id);
  end loop;
  insert into public.seasons (name, starts_at, ends_at, twist)
  values (name, now(), null, twist)
  returning id into nid;
  return nid;
end;
$$;

revoke all on function public.end_season() from public, anon, authenticated;
revoke all on function public.start_season(text, text) from public, anon, authenticated;
