-- B-384: sesongens hovedkonkurranse er Konsernverdi (serveren, ekte tid). Listene fra eget verk blir stående, merket
-- «Eget verk» i appen: Verdi, Mest penger på bok (`kasse`, tilbake fra B-306 nå som kassa ikke har tak) og ny
-- `produksjon` (tonn stål laget i spillet). Eieren: «Hall of Fame kan fryse lokale rekorder ved sesongslutt».
--
-- 1. leaderboard(): ny liste `produksjon` – i sesongen det siste tallet i tidslinja, for alle tider det høyeste.
-- 2. season_results får `konsern_value` og `rank_by`. close_season rangerer på Konsernverdi (konsern_value, regnet av
--    serveren når sesongen avsluttes); de uten konsern kommer etter, på verdien i eget verk. `equity` (verdien i eget
--    verk) fryses fortsatt, som rekord i Hall of Fame. Sesonger som alt er avsluttet, står urørt (rank_by = 'verdi').
-- 3. season_history() gir `konsern_value` og `rank_by` (ny returtype: drop først).
-- 4. week_kind(): «Mer verdi enn før» (`vekst`) tas bort fra uka som starter 5.10.2026. Ukene før står som de var
--    (resultatene regnes av samme funksjon); fra 5.10 veksler «Flest aktive dager» og «Mer stål enn før».

create or replace function public.leaderboard(kind text, lim integer default 50, season integer default null::integer)
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
    select distinct on (s.user_id) s.user_id, s.day, s.cash, s.equity, s.reputation, s.stage, s.produced_t
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
        when 'produksjon' then latest.produced_t::numeric
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
        when 'produksjon' then (select x.day from public.snapshots x where x.user_id = ok.id and x.produced_t is not null
                                order by x.produced_t desc, x.day asc limit 1)
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
        when 'produksjon' then (select max(x.produced_t) from public.snapshots x where x.user_id = ok.id)::numeric
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
        case when kind in ('verdi', 'kasse', 'produksjon', 'omdomme', 'kontroll', 'utbetalt', 'konsern') then value end desc,
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

alter table public.season_results add column if not exists konsern_value numeric;
alter table public.season_results add column if not exists rank_by text not null default 'verdi';

create or replace function public.close_season(sid integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.season_results (season_id, user_id, nickname, equity, day, stage, plass, konsern_value, rank_by)
  select sid, r.user_id, r.nickname, r.equity, r.day, r.stage,
    (row_number() over (order by r.kv desc nulls last, r.equity desc, r.day asc))::int,
    r.kv, 'konsern'
  from (
    select distinct on (s.user_id) s.user_id, p.nickname, s.equity, s.day, s.stage,
      (select round(public.konsern_value(s.user_id)) from public.saves sv
        where sv.user_id = s.user_id
          and coalesce((sv.state ->> 'stage')::int, 0) >= 4
          and coalesce((sv.state -> 'konsern' ->> 'unlocked')::boolean, false)) as kv
    from public.snapshots s
    join public.profiles p on p.id = s.user_id
    where s.season_id = sid and not s.pre_reform and p.nickname is not null and not p.banned and p.flagged_at is null
    order by s.user_id, s.day desc
  ) r
  on conflict (season_id, user_id) do nothing;
end;
$$;
revoke execute on function public.close_season(integer) from public, anon, authenticated;

drop function if exists public.season_history();
create function public.season_history()
returns table(season_id integer, name text, plass integer, players integer, equity bigint, day integer, stage smallint,
              ended_at timestamptz, konsern_value numeric, rank_by text)
language sql
stable
set search_path = public
as $$
  select r.season_id, s.name, r.plass,
    (select count(*) from public.season_results x where x.season_id = r.season_id)::int as players,
    r.equity, r.day, r.stage, s.ends_at, r.konsern_value, r.rank_by
  from public.season_results r
  join public.seasons s on s.id = r.season_id
  where r.user_id = auth.uid()
  order by s.ends_at desc;
$$;
revoke execute on function public.season_history() from public, anon;
grant execute on function public.season_history() to authenticated;

create or replace function public.week_kind(w date)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when w < date '2026-10-05' then (array['vekst', 'tonn', 'dager'])[(((w - date '2026-09-21') / 7) % 3 + 3) % 3 + 1]
    else (array['dager', 'tonn'])[(((w - date '2026-10-05') / 7) % 2 + 2) % 2 + 1]
  end;
$$;
