-- Stålverket: sesongresultat ved kallenavnet og egen sesonghistorikk (B-143). Kjørt som migrasjonen
-- «sesongresultat».
--
-- Når en sesong er over, regnes resultatet ut i `season_results` (B-129). Nå vises det: topplista gir spillerens beste
-- plassering i en avsluttet sesong («Sesong 1: 3. plass», kolonnen honor), og season_history() gir spilleren sine
-- egne resultater (til historikken på topplista og beskjeden når en sesong er over).

drop function if exists public.my_rank(text, int);
drop function if exists public.leaderboard(text, int, int);

create or replace function public.leaderboard(kind text, lim int default 50, season int default null)
returns table (plass int, nickname text, value numeric, day int, is_me boolean, league text, stage smallint, honor text)
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
    where season is not null and s.season_id = season
    order by s.user_id, s.day desc
  ),
  sesong as (
    select ok.id, ok.nickname, latest.day, latest.stage, public.league_of(latest.stage, latest.equity) as league,
      case kind
        when 'verdi' then latest.equity::numeric
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
        else r.best_equity_day
      end as day,
      r.best_stage as stage,
      public.league_of(r.best_stage, r.best_equity) as league,
      case kind
        when 'verdi' then r.best_equity::numeric
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
        case when kind in ('verdi', 'omdomme') then value end desc,
        day asc
    ))::int as plass,
    nickname,
    value,
    day,
    id = auth.uid() as is_me,
    league,
    stage,
    -- Beste plassering i en sesong som er over (B-143), f.eks. «Sesong 1: 3. plass»
    (select format('%s: %s. plass', se.name, sr.plass)
       from public.season_results sr
       join public.seasons se on se.id = sr.season_id
      where sr.user_id = rader.id
      order by sr.plass asc, se.ends_at desc
      limit 1) as honor
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

-- Spillerens egne sesongresultater, nyeste først. Tabellene kan leses av alle, så funksjonen kjører som spilleren.
create or replace function public.season_history()
returns table (season_id int, name text, plass int, players int, equity bigint, day int, stage smallint, ended_at timestamptz)
language sql
security invoker
set search_path = public
stable
as $$
  select r.season_id, s.name, r.plass,
    (select count(*) from public.season_results x where x.season_id = r.season_id)::int as players,
    r.equity, r.day, r.stage, s.ends_at
  from public.season_results r
  join public.seasons s on s.id = r.season_id
  where r.user_id = auth.uid()
  order by s.ends_at desc;
$$;
revoke execute on function public.season_history() from public, anon;
grant execute on function public.season_history() to authenticated;
