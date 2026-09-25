-- Stålverket: «Mest penger på bok» på topplista (B-144). Kjørt som migrasjonen «toppliste_kasse».
--
-- Ny liste (kind = 'kasse'): kassa slik den står i tidslinja (snapshots.cash). I sesongen gjelder siste døgn i
-- spillet man har nå; på «Alle tider» den største kassa kontoen noen gang har hatt (records.best_cash). Lån teller med
-- i kassa, men lånegrensen er liten mot det et verk tjener, så det flytter ikke lista.

alter table public.records add column if not exists best_cash bigint not null default 0;
alter table public.records add column if not exists best_cash_day int;

-- Rekordene oppdateres ved hver snapshot. Alle uttrykkene i SET leser den gamle raden (r), så dagen følger verdien.
create or replace function public.update_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.records as r
    (user_id, best_equity, best_equity_day, best_cash, best_cash_day, best_rep, best_rep_day, best_stage,
     storverk_day, ferdig_day)
  values (
    new.user_id, new.equity, new.day, greatest(new.cash, 0), new.day, new.reputation, new.day, new.stage,
    case when new.stage >= 4 then new.day end,
    case when new.equity >= 10000000000 then new.day end
  )
  on conflict (user_id) do update set
    best_equity_day = case when excluded.best_equity > r.best_equity then excluded.best_equity_day else r.best_equity_day end,
    best_equity = greatest(r.best_equity, excluded.best_equity),
    best_cash_day = case when excluded.best_cash > r.best_cash then excluded.best_cash_day else r.best_cash_day end,
    best_cash = greatest(r.best_cash, excluded.best_cash),
    best_rep_day = case when excluded.best_rep > r.best_rep then excluded.best_rep_day else r.best_rep_day end,
    best_rep = greatest(r.best_rep, excluded.best_rep),
    best_stage = greatest(r.best_stage, excluded.best_stage),
    storverk_day = case when excluded.storverk_day is null then r.storverk_day
                        else least(coalesce(r.storverk_day, excluded.storverk_day), excluded.storverk_day) end,
    ferdig_day = case when excluded.ferdig_day is null then r.ferdig_day
                      else least(coalesce(r.ferdig_day, excluded.ferdig_day), excluded.ferdig_day) end,
    updated_at = now();
  return null;
end;
$$;
revoke execute on function public.update_records() from public, anon, authenticated;

-- Største kassa fra tidslinja som finnes fra før (spill som er slettet fra tidslinja, er borte)
update public.records r
set best_cash = t.best_cash, best_cash_day = t.best_cash_day
from (
  select s.user_id, max(s.cash) as best_cash, (array_agg(s.day order by s.cash desc, s.day))[1] as best_cash_day
  from public.snapshots s
  group by s.user_id
) t
where t.user_id = r.user_id and t.best_cash > r.best_cash;

-- Topplista med den nye lista. Samme signatur og rettigheter som i 011.
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
    select distinct on (s.user_id) s.user_id, s.day, s.cash, s.equity, s.reputation, s.stage
    from public.snapshots s
    join ok on ok.id = s.user_id
    where season is not null and s.season_id = season
    order by s.user_id, s.day desc
  ),
  sesong as (
    select ok.id, ok.nickname, latest.day, latest.stage, public.league_of(latest.stage, latest.equity) as league,
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
