-- Stålverket: rekordene på «Alle tider» lagres for seg (B-142). Kjørt som migrasjonen «rekorder».
--
-- Før ble «Alle tider» regnet fra tidslinja (snapshots). En ny start sletter eller overskriver tidslinja (B-141), så
-- rekorden fra et tidligere spill kunne forsvinne – f.eks. når man startet et nytt spill utenfor en sesong, eller et
-- sesongspill gikk konkurs. Nå har hver konto én rad i `records` med det beste den noen gang har nådd. Raden oppdateres
-- ved hver snapshot og blir bare bedre. En spiller står alltid bare én gang på lista.

create table if not exists public.records (
  user_id uuid primary key references auth.users (id) on delete cascade,
  best_equity bigint not null default 0,
  best_equity_day int,
  best_rep numeric not null default 0,
  best_rep_day int,
  best_stage smallint not null default 0,
  storverk_day int,
  ferdig_day int,
  updated_at timestamptz not null default now()
);
alter table public.records enable row level security;
drop policy if exists "rekord: les egen" on public.records;
create policy "rekord: les egen" on public.records for select to authenticated using (user_id = auth.uid());

-- Oppdaterer rekorden etter hver snapshot. Alle uttrykkene i SET leser den gamle raden (r), så dagen følger verdien.
create or replace function public.update_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.records as r
    (user_id, best_equity, best_equity_day, best_rep, best_rep_day, best_stage, storverk_day, ferdig_day)
  values (
    new.user_id, new.equity, new.day, new.reputation, new.day, new.stage,
    case when new.stage >= 4 then new.day end,
    case when new.equity >= 10000000000 then new.day end
  )
  on conflict (user_id) do update set
    best_equity_day = case when excluded.best_equity > r.best_equity then excluded.best_equity_day else r.best_equity_day end,
    best_equity = greatest(r.best_equity, excluded.best_equity),
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

drop trigger if exists snapshots_records on public.snapshots;
create trigger snapshots_records
  after insert or update on public.snapshots
  for each row execute function public.update_records();

-- Rekordene fra tidslinja som finnes fra før
insert into public.records (user_id, best_equity, best_equity_day, best_rep, best_rep_day, best_stage, storverk_day, ferdig_day)
select s.user_id,
  max(s.equity), (array_agg(s.day order by s.equity desc, s.day))[1],
  max(s.reputation), (array_agg(s.day order by s.reputation desc, s.day))[1],
  max(s.stage),
  min(s.day) filter (where s.stage >= 4),
  min(s.day) filter (where s.equity >= 10000000000)
from public.snapshots s
group by s.user_id
on conflict (user_id) do nothing;

-- Topplista: i en sesong gjelder spillet man har nå (siste døgn i sesongen). På «Alle tider» gjelder rekorden.
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
    stage
  from rader
  where value is not null
  order by plass
  limit lim;
$$;
