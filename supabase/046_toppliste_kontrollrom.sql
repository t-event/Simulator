-- Stålverket: toppliste for kontrollrommet (B-295). Kjørt som migrasjonen «toppliste_kontrollrom».
--
-- Den beste poengsummen i kontrollrommet (`state.controlBest`) ligger i det lagrede spillet. Nå tas den også inn i
-- `records` (én rad per konto, blir bare bedre), så den står igjen selv om spilleren starter et nytt spill.
-- Poengsummen regnes ut i appen og kan ikke sjekkes på serveren. Den flinke testspilleren får høyst ca. 4 350 (B-293),
-- så alt over 5 000 regnes som umulig og tas ikke med.

alter table public.records add column if not exists best_control int;
alter table public.records add column if not exists best_control_at timestamptz;

create or replace function public.note_control()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pts int;
begin
  begin
    pts := round((new.state ->> 'controlBest')::numeric);
  exception when others then
    return null;
  end;
  if pts is null or pts <= 0 or pts > 5000 then
    return null;
  end if;
  -- Bare kontoer som alt har en rekordrad (fra tidslinja): ellers ville de stått med 0 på de andre listene
  update public.records
  set best_control = pts, best_control_at = now()
  where user_id = new.user_id and coalesce(best_control, 0) < pts;
  return null;
end;
$$;
revoke execute on function public.note_control() from public, anon, authenticated;

drop trigger if exists saves_note_control on public.saves;
create trigger saves_note_control
  after insert or update on public.saves
  for each row execute function public.note_control();

-- Rekordene som finnes i lagrede spill fra før
update public.records r
set best_control = round((s.state ->> 'controlBest')::numeric)::int, best_control_at = s.updated_at
from public.saves s
where s.user_id = r.user_id
  and (s.state ->> 'controlBest') ~ '^[0-9]+(\.[0-9]+)?$'
  and round((s.state ->> 'controlBest')::numeric) between 1 and 5000
  and coalesce(r.best_control, 0) < round((s.state ->> 'controlBest')::numeric);

-- Topplista med «kontroll»: beste charge noensinne, samme liste i sesongen og i Hall of Fame
create or replace function public.leaderboard(kind text, lim integer default 50, season integer default null::integer)
 returns table(plass integer, nickname text, value numeric, day integer, is_me boolean, league text, stage smallint, honor text, title text, linked_day integer)
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
    linked_day::int
  from rader
  where value is not null
  order by plass
  limit lim;
$function$;
