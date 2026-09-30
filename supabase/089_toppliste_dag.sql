-- B-378: topplista viser hvilken dag hver spiller er på i sitt eget verk (spilldagen i det lagrede spillet, `saves.day`).
-- En spiller ville se det. Dagen er spilltid og teller ikke i noen plassering (B-190) – det er bare opplysning.
-- Returtypen får kolonnen `today`, så funksjonen må tas bort og lages på nytt (my_rank bruker bare plass og is_me).

drop function if exists public.leaderboard(text, integer, integer);

create function public.leaderboard(kind text, lim integer default 50, season integer default null::integer)
returns table(plass integer, nickname text, value numeric, day integer, is_me boolean, league text, stage smallint,
              honor text, title text, linked_day integer, badges text[], today integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
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
      public.title_for(ok.id, latest.equity) as title,
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
      public.title_for(ok.id, r.best_equity) as title,
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
  konsern as (
    select ok.id, ok.nickname, sv.day, coalesce((sv.state ->> 'stage')::smallint, r.best_stage) as stage,
      public.league_of(r.best_stage, r.best_equity) as league,
      public.title_for(ok.id, r.best_equity) as title,
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
    public.badges_of(rader.id) as badges,
    (select sv.day from public.saves sv where sv.user_id = rader.id)::int as today
  from rader
  where value is not null
  order by plass
  limit lim;
$function$;

grant execute on function public.leaderboard(text, integer, integer) to anon, authenticated;
