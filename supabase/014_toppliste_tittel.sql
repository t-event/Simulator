-- Stålverket: tittel ved kallenavnet på topplista (B-150). Kjørt som migrasjonen «toppliste_tittel».
--
-- Etter sluttmålet (10 mrd.) får spilleren en tittel, og nye titler ved stålmilepælene (LEGENDS i
-- src/game/konsern.ts). Topplista viser tittelen i stedet for nivåmerket. I sesongen gjelder konsernverdien nå, på
-- «Alle tider» den beste noensinne.

create or replace function public.title_of(equity numeric)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when equity >= 1000000000000 then 'Stållegende'
    when equity >= 250000000000 then 'Stålkeiser'
    when equity >= 100000000000 then 'Stålkonge'
    when equity >= 50000000000 then 'Stålfyrste'
    when equity >= 25000000000 then 'Stålmagnat'
    when equity >= 10000000000 then 'Stålbaron'
  end;
$$;

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
    -- Beste plassering i en sesong som er over (B-143), f.eks. «Sesong 1: 3. plass»
    (select format('%s: %s. plass', se.name, sr.plass)
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
