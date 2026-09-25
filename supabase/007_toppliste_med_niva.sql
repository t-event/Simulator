-- Stålverket: topplista viser nivået (B-139). Kjørt som migrasjonen «toppliste_med_niva».
-- Metallnavnene på ligaene (bronse, sølv, gull) så ut som plassering, så appen viser nivået i stedet.
-- Ligaen beholdes i svaret og på profilen, men brukes bare til å skille ut Konsern (gull).

drop function if exists public.my_rank(text, int);
drop function if exists public.leaderboard(text, int, int);

create or replace function public.leaderboard(kind text, lim int default 50, season int default null)
returns table (plass int, nickname text, value numeric, day int, is_me boolean, league text, stage smallint)
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
    select ok.id, ok.nickname, latest.day, latest.stage, public.league_of(latest.stage, latest.equity) as league,
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
    league,
    stage
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
