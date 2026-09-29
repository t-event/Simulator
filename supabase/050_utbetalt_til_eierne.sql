-- Stålverket: utbetalt til eierne (B-303, reform 2). Kjørt som migrasjonen «utbetalt_til_eierne».
--
-- Kassa hjemme har et tak (100 mrd.), og det verket tjener utover, betales ut til eierne som historikk
-- (`state.paidOut.total`). Den bundne konsernreserven (B-193, `state.lockedReserve.total`) er avviklet og regnes som
-- utbetalt fra før. Her:
--   1. `records.best_paid_out`: det meste en konto har fått utbetalt, fra det lagrede spillet (som kontrollromsrekorden,
--      B-295): en trigger på `saves`, bare oppover, bare for kontoer som alt har en rekordrad.
--   2. Topplista får lista «utbetalt» (samme liste i sesongen og i Hall of Fame, som «kontroll»).
--   3. Merket «reform2» til dem som hadde en bunden reserve da reformen kom (`badges`, B-300). Serveren endrer ikke
--      det lagrede spillet: appen regner den gamle reserven som utbetalt av seg selv.

alter table public.records add column if not exists best_paid_out numeric;

create or replace function public.note_paid_out()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kr numeric;
begin
  begin
    kr := coalesce((new.state -> 'paidOut' ->> 'total')::numeric, 0)
        + coalesce((new.state -> 'lockedReserve' ->> 'total')::numeric, 0);
  exception when others then
    return null;
  end;
  if kr is null or kr <= 0 then
    return null;
  end if;
  update public.records
  set best_paid_out = kr
  where user_id = new.user_id and coalesce(best_paid_out, 0) < kr;
  return null;
end;
$$;
revoke execute on function public.note_paid_out() from public, anon, authenticated;

drop trigger if exists saves_note_paid_out on public.saves;
create trigger saves_note_paid_out
  after insert or update on public.saves
  for each row execute function public.note_paid_out();

-- Det som alt står i lagrede spill (den gamle reserven)
update public.records r
set best_paid_out = t.kr
from (
  select s.user_id,
         coalesce((s.state -> 'paidOut' ->> 'total')::numeric, 0)
         + coalesce((s.state -> 'lockedReserve' ->> 'total')::numeric, 0) as kr
  from public.saves s
) t
where t.user_id = r.user_id and t.kr > 0 and coalesce(r.best_paid_out, 0) < t.kr;

-- Merket til dem som hadde en bunden reserve
insert into public.badges (user_id, badge, note)
select s.user_id, 'reform2', 'Hadde bunden konsernreserve da reform 2 kom (B-303); ført som utbetalt til eierne'
from public.saves s
where coalesce((s.state -> 'lockedReserve' ->> 'total')::numeric, 0) > 0
on conflict do nothing;

-- Topplista med «utbetalt»: som «kontroll» (fra rekordene, samme liste i sesongen og i Hall of Fame)
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
    where season is not null and s.season_id = season and not s.pre_reform and kind not in ('kontroll', 'utbetalt')
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
    where season is null or kind in ('kontroll', 'utbetalt')
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
        case when kind in ('verdi', 'kasse', 'omdomme', 'kontroll', 'utbetalt') then value end desc,
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
