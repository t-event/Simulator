-- Stålverket: ny liste «Konsernverdi» på topplista, regnet av serveren (B-320, steg 4 av KONSERNBIDRAG.md).
--
-- Eierens valg (29.9): en ny liste ved siden av den gamle «Verdi». Den gamle står som før, og ligaer og titler røres
-- ikke. Den nye er serverkjent og uavhengig av spillfart og kassa i spillet:
--   konsernverdi = konsernkassa + 60 × (utbytte fra datterverkene + hovedverkets bidrag for en full dag) − lån
-- 60 dagers inntekt i ekte tid er samme målestokk som verdien av et datterverk i spillet (60 døgns overskudd).
-- Regnes når lista vises (ikke lagret), så den følger bidraget og utbyttet slik de er nå. Bare med åpnet konsern.

create or replace function public.konsern_value(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select balance from public.treasury where user_id = p_user), 0)
       + 60 * (public.dividend_per_day(p_user) + public.contribution_amount(public.contribution_full(p_user), 1))
       - coalesce((select greatest(0, coalesce((state ->> 'loan')::numeric, 0)) from public.saves where user_id = p_user), 0);
$$;
revoke execute on function public.konsern_value(uuid) from public, anon, authenticated;

create or replace function public.leaderboard(kind text, lim integer default 50, season integer default null)
returns table(plass integer, nickname text, value numeric, day integer, is_me boolean, league text, stage smallint,
              honor text, title text, linked_day integer, badges text[])
language sql
stable
security definer
set search_path = public
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
    where season is not null and s.season_id = season and not s.pre_reform
      and kind not in ('kontroll', 'utbetalt', 'konsern')
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
      end as value,
      (select min(x.day) from public.snapshots x where x.user_id = ok.id and x.season_id = season) as linked_day,
      null::timestamptz as at
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
        when 'kontroll' then null
        when 'utbetalt' then null
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
        when 'kontroll' then r.best_control::numeric
        when 'utbetalt' then r.best_paid_out
      end as value,
      (select min(x.day) from public.snapshots x where x.user_id = ok.id) as linked_day,
      r.best_control_at as at
    from ok
    join public.records r on r.user_id = ok.id
    where kind <> 'konsern' and (season is null or kind in ('kontroll', 'utbetalt'))
  ),
  -- Konsernverdien (B-320): nå, fra serverens tall – samme liste i sesongen og i Hall of Fame
  konsern as (
    select ok.id, ok.nickname, sv.day, coalesce((sv.state ->> 'stage')::smallint, r.best_stage) as stage,
      public.league_of(r.best_stage, r.best_equity) as league,
      public.title_of(r.best_equity) as title,
      round(public.konsern_value(ok.id)) as value,
      (select min(x.day) from public.snapshots x where x.user_id = ok.id) as linked_day,
      null::timestamptz as at
    from ok
    join public.saves sv on sv.user_id = ok.id
    left join public.records r on r.user_id = ok.id
    where kind = 'konsern'
      and coalesce((sv.state ->> 'stage')::int, 0) >= 4
      and coalesce((sv.state -> 'konsern' ->> 'unlocked')::boolean, false)
  ),
  rader as (
    select * from sesong
    union all
    select * from alle
    union all
    select * from konsern
  )
  select
    (row_number() over (
      order by
        case when kind in ('storverk', 'ferdig') then value end asc,
        case when kind in ('verdi', 'kasse', 'omdomme', 'kontroll', 'utbetalt', 'konsern') then value end desc,
        day asc,
        at asc
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
    title,
    linked_day::int,
    -- Æresmerker bare serveren vet om (B-296, B-299), også de som er gitt for hånd (B-300)
    public.badges_of(rader.id) as badges
  from rader
  where value is not null
  order by plass
  limit lim;
$$;
