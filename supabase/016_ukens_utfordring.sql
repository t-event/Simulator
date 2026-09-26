-- Stålverket: ukens utfordring og sesonger med vri (B-152). Kjørt som migrasjonen «ukens_utfordring».
--
-- Ukens utfordring: hver uke (mandag til mandag, norsk tid) en egen toppliste per liga (bronse, sølv, gull). Oppgaven
-- går på omgang: mest vekst i konsernverdi, flest tonn produsert og flest spilldøgn. Serveren regner alt ut fra
-- tidslinja (`snapshots`). Når uka er over, får topp 3 medalje og topp 10 en ukekiste med fagpoeng.
--
-- Sesonger med vri: en sesong kan ha en vri som gjelder hele sesongen (dyrere skrap, billig strøm …). Den gjelder bare
-- spill som er med i sesongen. Topp 10 i en sesong får en utmerkelse ved kallenavnet.

-- ------------------------------------------------------------------ tidslinja og juksesperren

-- Tonn produsert (totalt i spillet), til ukens utfordring
alter table public.snapshots add column if not exists produced_t bigint;

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

  if maxeq is not null and new.equity > maxeq then
    reason := format('konsernverdi %s på nivå %s', new.equity, new.stage);
  end if;
  -- Etter sluttmålet (10 mrd.) kan kjøp av stålkomplekser og modernisering gi et stort hopp på ett døgn (B-150)
  pct := case when new.stage >= 4 and coalesce(prev.equity, 0) >= 10000000000 then 0.5 else 0.25 end;
  if prev.day is not null
     and (new.equity - prev.equity) > (cap + pct * greatest(prev.equity, 0)) * (greatest(new.day - prev.day, 1) + bonus) then
    reason := format('vekst %s på %s døgn (+%s døgn belønning), nivå %s', new.equity - prev.equity, new.day - prev.day, bonus, new.stage);
  end if;
  -- Tonn: storverket lager noen tusen tonn i døgnet; 30 000 er god margin (B-152)
  if prev.day is not null and prev.produced_t is not null and new.produced_t is not null
     and (new.produced_t - prev.produced_t) > 30000 * greatest(new.day - prev.day, 1) then
    reason := format('%s tonn på %s døgn', new.produced_t - prev.produced_t, new.day - prev.day);
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

-- ------------------------------------------------------------------ ukens utfordring

create table if not exists public.weekly_results (
  week_start date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  league text not null,
  kind text not null,
  plass int not null,
  value numeric not null,
  fp int not null,
  claimed_at timestamptz,
  primary key (week_start, user_id)
);
alter table public.weekly_results enable row level security;
-- Ingen tilgang direkte: bare gjennom funksjonene under

create table if not exists public.weekly_weeks (
  week_start date primary key,
  finished_at timestamptz not null default now()
);
alter table public.weekly_weeks enable row level security;

-- Mandagen uka starter (norsk tid)
create or replace function public.week_start_of(t timestamptz)
returns date
language sql
stable
set search_path = public
as $$
  select date_trunc('week', t at time zone 'Europe/Oslo')::date;
$$;

-- Oppgaven går på omgang; uka som startet 2026-09-21 er den første
create or replace function public.week_kind(w date)
returns text
language sql
immutable
set search_path = public
as $$
  select (array['vekst', 'tonn', 'dager'])[(((w - date '2026-09-21') / 7) % 3 + 3) % 3 + 1];
$$;

-- Hva hver spiller har fått til i uka: siste snapshot i uka minus det siste før uka (eller det første i uka), i samme
-- sesong. Bare spillere med kallenavn som ikke er flagget.
create or replace function public.weekly_scores(w date)
returns table (user_id uuid, league text, value numeric, day int)
language sql
security definer
stable
set search_path = public
as $$
  with win as (
    select (w::timestamp at time zone 'Europe/Oslo') as a, ((w + 7)::timestamp at time zone 'Europe/Oslo') as b
  ),
  last as (
    select distinct on (s.user_id) s.user_id, s.season_id, s.day, s.equity, s.produced_t
    from public.snapshots s, win
    where s.at >= win.a and s.at < win.b
    order by s.user_id, s.at desc
  )
  select l.user_id, p.league,
    case public.week_kind(w)
      when 'vekst' then (l.equity - b.equity)::numeric
      when 'tonn' then (l.produced_t - b.produced_t)::numeric
      else (l.day - b.day)::numeric
    end as value,
    l.day
  from last l
  join public.profiles p on p.id = l.user_id and p.nickname is not null and not p.banned and p.flagged_at is null
  cross join win
  cross join lateral (
    select x.day, x.equity, x.produced_t
    from public.snapshots x
    where x.user_id = l.user_id and (x.season_id is not distinct from l.season_id) and x.day < l.day and x.at < win.b
    order by (x.at >= win.a), case when x.at < win.a then x.day end desc nulls last, x.day asc
    limit 1
  ) b;
$$;
revoke execute on function public.weekly_scores(date) from public, anon, authenticated;

-- Deler ut medaljer og kister for uker som er over (kalles av weekly_status og weekly_board)
create or replace function public.finish_weeks()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w date;
  cur date := public.week_start_of(now());
begin
  select coalesce(max(week_start) + 7, date '2026-09-21') into w from public.weekly_weeks;
  while w < cur loop
    insert into public.weekly_results (week_start, user_id, league, kind, plass, value, fp)
    select w, r.user_id, r.league, public.week_kind(w), r.plass, r.value,
      case r.plass when 1 then 100 when 2 then 75 when 3 then 50 else 25 end
    from (
      select s.user_id, s.league, s.value,
        (row_number() over (partition by s.league order by s.value desc, s.day asc))::int as plass
      from public.weekly_scores(w) s
      where s.value > 0
    ) r
    where r.plass <= 10
    on conflict do nothing;
    insert into public.weekly_weeks (week_start) values (w) on conflict do nothing;
    w := w + 7;
  end loop;
end;
$$;
revoke execute on function public.finish_weeks() from public, anon, authenticated;

-- Lista for uka som pågår, i én liga (standard: din egen). Kan leses uten konto, som topplista.
create or replace function public.weekly_board(p_league text default null, lim int default 20)
returns table (plass int, nickname text, value numeric, is_me boolean, gold int)
language plpgsql
security definer
set search_path = public
as $$
declare
  lg text;
begin
  perform public.finish_weeks();
  lg := coalesce(p_league, (select league from public.profiles where id = auth.uid()), 'bronse');
  return query
  select (row_number() over (order by s.value desc, s.day asc))::int, pr.nickname, s.value, s.user_id = auth.uid(),
    (select count(*) from public.weekly_results r where r.user_id = s.user_id and r.plass = 1)::int
  from public.weekly_scores(public.week_start_of(now())) s
  join public.profiles pr on pr.id = s.user_id
  where s.league = lg and s.value > 0
  order by 1
  limit lim;
end;
$$;
grant execute on function public.weekly_board(text, int) to anon, authenticated;

-- Status for spilleren: uka, oppgaven, ligaen, plasseringen, en kiste som venter og medaljene
create or replace function public.weekly_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  ws date;
  lg text;
  me record;
  n int;
  chest record;
  g int;
  s int;
  b int;
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  perform public.finish_weeks();
  ws := public.week_start_of(now());
  select league into lg from public.profiles where id = auth.uid();
  lg := coalesce(lg, 'bronse');

  select count(*) into n from public.weekly_scores(ws) x where x.league = lg and x.value > 0;
  select r.plass, r.value into me from (
    select x.user_id, x.value, (row_number() over (order by x.value desc, x.day asc))::int as plass
    from public.weekly_scores(ws) x
    where x.league = lg and x.value > 0
  ) r where r.user_id = auth.uid();

  select coalesce(sum(fp), 0)::int as fp, count(*)::int as n, min(plass) as best, max(week_start) as week into chest
  from public.weekly_results where user_id = auth.uid() and claimed_at is null;

  select count(*) filter (where plass = 1), count(*) filter (where plass = 2), count(*) filter (where plass = 3)
  into g, s, b
  from public.weekly_results where user_id = auth.uid();

  return json_build_object(
    'week_start', ws,
    'ends_at', ((ws + 7)::timestamp at time zone 'Europe/Oslo'),
    'kind', public.week_kind(ws),
    'league', lg,
    'plass', me.plass,
    'value', me.value,
    'players', n,
    'chest', case when chest.n > 0 then json_build_object('fp', chest.fp, 'count', chest.n, 'best', chest.best, 'week', chest.week) end,
    'gold', g, 'silver', s, 'bronze', b
  );
end;
$$;
revoke execute on function public.weekly_status() from public, anon;
grant execute on function public.weekly_status() to authenticated;

-- Åpner alle kister som venter; gir fagpoengene til spillet (0 hvis ingen)
create or replace function public.claim_week_chest()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  with c as (
    update public.weekly_results set claimed_at = now()
    where user_id = auth.uid() and claimed_at is null
    returning fp
  )
  select coalesce(sum(fp), 0)::int into total from c;
  return total;
end;
$$;
revoke execute on function public.claim_week_chest() from public, anon;
grant execute on function public.claim_week_chest() to authenticated;

-- ------------------------------------------------------------------ sesonger med vri

create table if not exists public.season_twists (
  id text primary key,
  title text not null,
  text text not null,
  scrap numeric not null default 1,
  steel numeric not null default 1,
  power numeric not null default 1
);
alter table public.season_twists enable row level security;

insert into public.season_twists (id, title, text, scrap, steel, power) values
  ('skrapmangel', 'Skrapmangel', 'Hele sesongen er skrap vanskelig å få tak i: skrapet koster 15 % mer.', 1.15, 1, 1),
  ('eksportboom', 'Eksportboom', 'Hele verden bygger: stålet selges for 10 % mer, men skrapet koster 5 % mer.', 1.05, 1.1, 1),
  ('energikrise', 'Energikrise', 'Strømmen koster 30 % mer hele sesongen, men stålprisen er 5 % høyere.', 1, 1.05, 1.3),
  ('gronnstrom', 'Grønn strøm', 'Mye vind og regn: strømmen er 15 % billigere hele sesongen.', 1, 1, 0.85)
on conflict (id) do update set title = excluded.title, text = excluded.text, scrap = excluded.scrap,
  steel = excluded.steel, power = excluded.power;

alter table public.seasons add column if not exists twist text references public.season_twists (id);

-- Ny sesong, med en vri om du vil: select public.start_season('Sesong 2', 26, 'skrapmangel');
drop function if exists public.start_season(text, int);
create or replace function public.start_season(name text, weeks integer default 26, twist text default null)
returns integer
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
  insert into public.seasons (name, starts_at, ends_at, twist)
  values (name, now(), now() + make_interval(weeks => weeks), twist)
  returning id into nid;
  return nid;
end;
$$;
revoke execute on function public.start_season(text, int, text) from public, anon, authenticated;

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
  played boolean := false;
begin
  for ended in
    select s.id from public.seasons s
    where s.ends_at <= now() and not exists (select 1 from public.season_results r where r.season_id = s.id)
  loop
    perform public.close_season(ended.id);
  end loop;

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

  return json_build_object(
    'current', case when cur.id is null then null else json_build_object(
      'id', cur.id, 'name', cur.name, 'starts_at', cur.starts_at, 'ends_at', cur.ends_at,
      'twist', case when tw.id is null then null else json_build_object(
        'id', tw.id, 'title', tw.title, 'text', tw.text, 'scrap', tw.scrap, 'steel', tw.steel, 'power', tw.power) end
    ) end,
    'played_previous', played
  );
end;
$$;

-- ------------------------------------------------------------------ utmerkelse for topp 10 i sesongen

-- Som i 014, men utmerkelsen ved kallenavnet: 🏆 for vinneren, 🎖 Topp 10 for de ti beste, ellers plasseringen
drop function if exists public.my_rank(text, int);
drop function if exists public.leaderboard(text, int, int);

create or replace function public.leaderboard(kind text, lim int default 50, season int default null)
returns table (plass int, nickname text, value numeric, day int, is_me boolean, league text, stage smallint, honor text, title text)
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
    select distinct on (s.user_id) s.user_id, s.day, s.cash, s.equity, s.reputation, s.stage
    from public.snapshots s
    join ok on ok.id = s.user_id
    where season is not null and s.season_id = season
    order by s.user_id, s.day desc
  ),
  sesong as (
    select ok.id, ok.nickname, latest.day, latest.stage, public.league_of(latest.stage, latest.equity) as league,
      public.title_of(latest.equity) as title,
      case kind
        when 'verdi' then latest.equity::numeric
        when 'kasse' then latest.cash::numeric
        when 'omdomme' then latest.reputation
        when 'storverk' then (select min(x.day) from public.snapshots x
                               where x.user_id = ok.id and x.stage >= 4 and x.season_id = season)::numeric
        when 'ferdig' then (select min(x.day) from public.snapshots x
                             where x.user_id = ok.id and x.equity >= 10000000000 and x.season_id = season)::numeric
      end as value
    from ok
    join latest on latest.user_id = ok.id
  ),
  alle as (
    select ok.id, ok.nickname,
      case kind
        when 'omdomme' then r.best_rep_day
        when 'storverk' then r.storverk_day
        when 'ferdig' then r.ferdig_day
        when 'kasse' then r.best_cash_day
        else r.best_equity_day
      end as day,
      r.best_stage as stage,
      public.league_of(r.best_stage, r.best_equity) as league,
      public.title_of(r.best_equity) as title,
      case kind
        when 'verdi' then r.best_equity::numeric
        when 'kasse' then r.best_cash::numeric
        when 'omdomme' then r.best_rep
        when 'storverk' then r.storverk_day::numeric
        when 'ferdig' then r.ferdig_day::numeric
      end as value
    from ok
    join public.records r on r.user_id = ok.id
    where season is null
  ),
  rader as (
    select * from sesong
    union all
    select * from alle
  )
  select
    (row_number() over (
      order by
        case when kind in ('storverk', 'ferdig') then value end asc,
        case when kind in ('verdi', 'kasse', 'omdomme') then value end desc,
        day asc
    ))::int as plass,
    nickname,
    value,
    day,
    id = auth.uid() as is_me,
    league,
    stage,
    (select case
         when sr.plass = 1 then format('🏆 Vinner av %s', se.name)
         when sr.plass <= 10 then format('🎖 Topp 10 i %s (%s. plass)', se.name, sr.plass)
         else format('%s: %s. plass', se.name, sr.plass)
       end
       from public.season_results sr
       join public.seasons se on se.id = sr.season_id
      where sr.user_id = rader.id
      order by sr.plass asc, se.ends_at desc
      limit 1) as honor,
    title
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
