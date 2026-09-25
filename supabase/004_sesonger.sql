-- Stålverket: sesonger, ligaer og felles hendelser (B-129, fase 3). Kjørt som migrasjonen «sesonger».

-- ------------------------------------------------------------------ tabeller

create table if not exists public.seasons (
  id serial primary key,
  name text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.snapshots add column if not exists season_id int references public.seasons (id);
alter table public.saves add column if not exists season_id int;
create index if not exists snapshots_season on public.snapshots (season_id, user_id, day desc);

-- Sluttresultatet per spiller når en sesong er over
create table if not exists public.season_results (
  season_id int not null references public.seasons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  nickname text,
  equity bigint not null,
  day int not null,
  stage smallint not null,
  plass int not null,
  primary key (season_id, user_id)
);

-- Felles hendelser i markedet: ganger prisene så lenge de varer
create table if not exists public.events (
  id serial primary key,
  kind text not null,
  title text not null,
  text text not null,
  scrap numeric not null default 1,
  steel numeric not null default 1,
  power numeric not null default 1,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null
);

alter table public.seasons enable row level security;
alter table public.season_results enable row level security;
alter table public.events enable row level security;

drop policy if exists "sesonger: alle leser" on public.seasons;
create policy "sesonger: alle leser" on public.seasons for select to anon, authenticated using (true);
drop policy if exists "sesongresultat: alle leser" on public.season_results;
create policy "sesongresultat: alle leser" on public.season_results for select to anon, authenticated using (true);
drop policy if exists "hendelser: alle leser" on public.events;
create policy "hendelser: alle leser" on public.events for select to anon, authenticated using (true);

-- ------------------------------------------------------------------ liga

-- Bronse: til og med stålverket. Sølv: storverk. Gull: storverk med konsernverdi over 1 mrd. (konsernet åpner der).
create or replace function public.league_of(stage int, equity bigint)
returns text
language sql
immutable
as $$
  select case
    when stage >= 4 and equity >= 1000000000 then 'gull'
    when stage >= 4 then 'solv'
    else 'bronse'
  end;
$$;

-- Ligaen skrives på profilen ved hver snapshot (juksesperren fra B-127 står i samme trigger)
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
begin
  select day, equity into prev
  from public.snapshots
  where user_id = new.user_id and day < new.day
    and (season_id is not distinct from new.season_id)
  order by day desc
  limit 1;

  if exists (
    select 1 from public.snapshots
    where user_id = new.user_id and day > new.day + 1 and (season_id is not distinct from new.season_id)
  ) then
    update public.profiles set rewound_at = now() where id = new.user_id;
  end if;

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
     and (new.equity - prev.equity) > (cap + 0.25 * greatest(prev.equity, 0)) * greatest(new.day - prev.day, 1) then
    reason := format('vekst %s på %s døgn, nivå %s', new.equity - prev.equity, new.day - prev.day, new.stage);
  end if;

  if reason is not null then
    update public.profiles
    set flagged_at = now(), flag_reason = reason
    where id = new.user_id and flagged_at is null;
  end if;

  update public.profiles set league = public.league_of(new.stage, new.equity) where id = new.user_id;
  return new;
end;
$$;

-- ------------------------------------------------------------------ sesonger

-- Regner ut sluttresultatet for en sesong (én gang; kjøres igjen uten å endre noe)
create or replace function public.close_season(sid int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.season_results (season_id, user_id, nickname, equity, day, stage, plass)
  select sid, r.user_id, r.nickname, r.equity, r.day, r.stage,
    (row_number() over (order by r.equity desc, r.day asc))::int
  from (
    select distinct on (s.user_id) s.user_id, p.nickname, s.equity, s.day, s.stage
    from public.snapshots s
    join public.profiles p on p.id = s.user_id
    where s.season_id = sid and p.nickname is not null and not p.banned and p.flagged_at is null
    order by s.user_id, s.day desc
  ) r
  on conflict (season_id, user_id) do nothing;
end;
$$;
revoke execute on function public.close_season(int) from public, anon, authenticated;

-- Status til appen: sesongen som pågår, og om spilleren var med i forrige (gir en pitteliten fordel).
-- Sesonger som er over, lukkes her hvis ingen har gjort det – da trengs ingen planlagt jobb.
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
  played boolean := false;
begin
  for ended in
    select s.id from public.seasons s
    where s.ends_at <= now() and not exists (select 1 from public.season_results r where r.season_id = s.id)
  loop
    perform public.close_season(ended.id);
  end loop;

  select id, name, starts_at, ends_at into cur
  from public.seasons where now() >= starts_at and now() < ends_at
  order by starts_at desc limit 1;

  if cur.id is not null then
    select id into prev from public.seasons where ends_at <= cur.starts_at order by ends_at desc limit 1;
    if prev.id is not null and auth.uid() is not null then
      played := exists (select 1 from public.snapshots where user_id = auth.uid() and season_id = prev.id);
    end if;
  end if;

  return json_build_object(
    'current', case when cur.id is null then null else json_build_object(
      'id', cur.id, 'name', cur.name, 'starts_at', cur.starts_at, 'ends_at', cur.ends_at) end,
    'played_previous', played
  );
end;
$$;
grant execute on function public.season_status() to anon, authenticated;

-- Starter en ny sesong: den som pågår avsluttes nå, og resultatet regnes ut. Bare fra SQL Editor / connectoren.
-- Eksempel: select public.start_season('Sesong 2', 4);
create or replace function public.start_season(name text, weeks int default 4)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  nid int;
begin
  for s in select id from public.seasons where ends_at > now() loop
    update public.seasons set ends_at = now() where id = s.id;
    perform public.close_season(s.id);
  end loop;
  for s in select id from public.seasons x
    where x.ends_at <= now() and not exists (select 1 from public.season_results r where r.season_id = x.id)
  loop
    perform public.close_season(s.id);
  end loop;
  insert into public.seasons (name, starts_at, ends_at)
  values (name, now(), now() + make_interval(weeks => weeks))
  returning id into nid;
  return nid;
end;
$$;
revoke execute on function public.start_season(text, int) from public, anon, authenticated;

-- ------------------------------------------------------------------ felles hendelser

-- Legger ut en hendelse fra en fast liste. Bare fra SQL Editor / connectoren. Eksempel: select public.add_event('skrapmangel', 7);
create or replace function public.add_event(kind text, days int default 7)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  nid int;
begin
  insert into public.events (kind, title, text, scrap, steel, power, ends_at)
  select kind, t.title, t.text, t.scrap, t.steel, t.power, now() + make_interval(days => days)
  from (values
    ('skrapmangel', 'Skrapmangel', 'Lite skrap på markedet: skrapprisene er 20 % høyere denne perioden.', 1.2, 1.0, 1.0),
    ('stromkrise', 'Strømkrise', 'Tørt og kaldt: strømprisen er 50 % høyere denne perioden.', 1.0, 1.0, 1.5),
    ('eksportboom', 'Eksportboom', 'Sterk etterspørsel fra utlandet: stålprisene er 10 % høyere denne perioden.', 1.0, 1.1, 1.0),
    ('importpress', 'Importpress', 'Billig import presser markedet: stålprisene er 10 % lavere denne perioden.', 1.0, 0.9, 1.0),
    ('transportstreik', 'Transportstreik', 'Streik i transporten: skrap er 10 % dyrere og stålprisene 5 % lavere denne perioden.', 1.1, 0.95, 1.0)
  ) as t(kind, title, text, scrap, steel, power)
  where t.kind = add_event.kind
  returning id into nid;
  if nid is null then
    raise exception 'Ukjent hendelse: %', kind;
  end if;
  return nid;
end;
$$;
revoke execute on function public.add_event(text, int) from public, anon, authenticated;

create or replace function public.active_events()
returns setof public.events
language sql
security definer
set search_path = public
stable
as $$
  select * from public.events where now() >= starts_at and now() < ends_at order by starts_at;
$$;
grant execute on function public.active_events() to anon, authenticated;

-- ------------------------------------------------------------------ topplista per sesong

drop function if exists public.my_rank(text);
drop function if exists public.leaderboard(text, int);

create or replace function public.leaderboard(kind text, lim int default 50, season int default null)
returns table (plass int, nickname text, value numeric, day int, is_me boolean, league text)
language sql
security definer
set search_path = public
stable
as $$
  with ok as (
    select id, nickname
    from public.profiles
    where nickname is not null and not banned and flagged_at is null
  ),
  latest as (
    select distinct on (s.user_id) s.user_id, s.day, s.equity, s.reputation, s.stage
    from public.snapshots s
    join ok on ok.id = s.user_id
    where season is null or s.season_id = season
    order by s.user_id, s.day desc
  ),
  rader as (
    select ok.id, ok.nickname, latest.day, public.league_of(latest.stage, latest.equity) as league,
      case kind
        when 'verdi' then latest.equity::numeric
        when 'omdomme' then latest.reputation
        when 'storverk' then (select min(x.day) from public.snapshots x
                               where x.user_id = ok.id and x.stage >= 4 and (season is null or x.season_id = season))::numeric
        when 'ferdig' then (select min(x.day) from public.snapshots x
                             where x.user_id = ok.id and x.equity >= 10000000000 and (season is null or x.season_id = season))::numeric
      end as value
    from ok
    join latest on latest.user_id = ok.id
  )
  select
    (row_number() over (
      order by
        case when kind in ('storverk', 'ferdig') then value end asc,
        case when kind in ('verdi', 'omdomme') then value end desc,
        day asc
    ))::int as plass,
    nickname,
    value,
    day,
    id = auth.uid() as is_me,
    league
  from rader
  where value is not null
  order by plass
  limit lim;
$$;
grant execute on function public.leaderboard(text, int, int) to anon, authenticated;

create or replace function public.my_rank(kind text, season int default null)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select plass from public.leaderboard(kind, 100000, season) where is_me limit 1;
$$;
revoke execute on function public.my_rank(text, int) from public, anon;
grant execute on function public.my_rank(text, int) to authenticated;
