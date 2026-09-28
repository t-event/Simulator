-- Stålverket: merker som gis for hånd (B-300). Kjørt som migrasjonen «merker_for_haand».
--
-- Merkene kom bare fra `economy_reform_log` (B-296). En konto som ble slettet og laget på nytt, mistet raden der (den
-- slettes sammen med kontoen), selv om spillet er det samme. Nå kan eieren gi et merke for hånd i tabellen `badges`.
-- `badges_of` samler begge, og brukes av både `my_badges` (appen) og `leaderboard` (topplista). Tabellen har ingen
-- regler for `anon`/`authenticated`: bare utvikleren skriver i den, med eierens godkjenning.

create table if not exists public.badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge text not null,
  note text,
  at timestamptz not null default now(),
  primary key (user_id, badge)
);
alter table public.badges enable row level security;
revoke all on public.badges from anon, authenticated;

create or replace function public.badges_of(uid uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct b order by b), '{}'::text[])
  from (
    select 'reform'::text as b from public.economy_reform_log l where l.user_id = uid
    union
    select x.badge from public.badges x where x.user_id = uid
  ) m;
$$;
revoke execute on function public.badges_of(uuid) from public, anon, authenticated;

create or replace function public.my_badges()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select public.badges_of(auth.uid());
$$;
revoke execute on function public.my_badges() from public, anon;
grant execute on function public.my_badges() to authenticated;

create or replace function public.leaderboard(kind text, lim integer default 50, season integer default null::integer)
 returns table(plass integer, nickname text, value numeric, day integer, is_me boolean, league text, stage smallint, honor text, title text, linked_day integer, badges text[])
 language sql
 stable security definer
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
    where season is not null and s.season_id = season and not s.pre_reform and kind <> 'kontroll'
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
      end as value,
      (select min(x.day) from public.snapshots x where x.user_id = ok.id) as linked_day,
      r.best_control_at as at
    from ok
    join public.records r on r.user_id = ok.id
    where season is null or kind = 'kontroll'
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
        case when kind in ('verdi', 'kasse', 'omdomme', 'kontroll') then value end desc,
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
$function$;

