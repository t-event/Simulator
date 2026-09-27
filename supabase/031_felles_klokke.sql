-- B-190: felles klokke og samme mulighet for alle i fellesverdenen. Kjørt som migrasjonene «felles_klokke» (punkt 1 og 2
-- til og med merket) og «felles_klokke_lister» (sesongliste, sesongresultat og ukens utfordring). Første forsøk stoppet og
-- ble rullet tilbake: juksesperrens trigger kjørte da merket ble satt, så triggerne er av mens merket settes.
--
-- Lokalt spill: spill så mye og så fort du vil. Fellesverden: samme klokke og samme grunnleggende mulighet for alle.
--
-- 1. **Konsernkassa:** grensen er lik for alle, 100 mill. kr per ekte døgn (`treasury_log_step` = 0). Grensen leser ikke
--    lenger kasse eller egenkapital fra spillet i det hele tatt. En høyere grense kan senere tjenes gjennom
--    serverautoritative ting i ekte tid (strategisk eierskap, historikk, omdømme) – aldri lokal kasse eller egenkapital.
-- 2. **Tidslinjetall fra før økonomireformen** (B-186) merkes `pre_reform` og brukes ikke i serverberegninger:
--    sesonglista, sesongresultatet og ukens utfordring. Rekordene i Hall of Fame står som før (B-186). Merket kan ikke
--    endres fra appen (spillere kan skrive sine egne tall i tidslinja).
-- 3. **Ukens utfordring, «dager»:** ekte aktive dager (dager i uka med minst én lagring på tidslinja), ikke spilldøgn.
--    En konkurranse mellom spillere skal ikke vinnes av den som lar 10× stå lengst. Maks 7.
-- 4. **Likt resultat på ukelista** gir delt plass (rank), ikke en tilfeldig rekkefølge etter spilldag. Alle som var
--    aktive alle sju dagene, deler førsteplassen.

update public.config set value = value || '{"treasury_log_step": 0}' where id = 'world';

-- ------------------------------------------------------------------ 1. konsernkassa uten lokal egenkapital
drop function if exists public.treasury_limit(numeric);
create or replace function public.treasury_limit(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  -- Lik for alle. p_user er med så en senere grense kan bygge på serverautoritative verdier for spilleren.
  select coalesce((value->>'treasury_base_per_day')::numeric, 100000000) from public.config where id = 'world';
$$;
revoke execute on function public.treasury_limit(uuid) from public, anon, authenticated;

create or replace function public.treasury_status()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  lim numeric;
  used numeric;
  bal numeric;
  freed timestamptz;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  lim := public.treasury_limit(uid);
  select coalesce(sum(amount), 0), min(at) + interval '24 hours' into used, freed
  from public.treasury_ledger where user_id = uid and kind = 'innskudd' and at > now() - interval '24 hours';
  select balance into bal from public.treasury where user_id = uid;
  return json_build_object('balance', coalesce(bal, 0), 'limit', lim, 'used', used,
    'left', greatest(0, lim - used), 'freed_at', freed);
end;
$$;
revoke execute on function public.treasury_status() from public, anon;
grant execute on function public.treasury_status() to authenticated;

create or replace function public.deposit_to_treasury(p_amount numeric, p_base_rev bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s record;
  amt numeric := floor(coalesce(p_amount, 0));
  cash numeric;
  loan numeric;
  lim numeric;
  used numeric;
  new_rev bigint;
  bal numeric;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if amt <= 0 then
    return json_build_object('ok', false, 'reason', 'belop');
  end if;
  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  select * into s from public.saves where user_id = uid for update;
  if s.user_id is null or s.rev is distinct from p_base_rev then
    return json_build_object('ok', false, 'reason', 'lagre_forst');
  end if;
  if coalesce((s.state->>'stage')::int, 0) < 4 or coalesce((s.state->'konsern'->>'unlocked')::boolean, false) = false then
    return json_build_object('ok', false, 'reason', 'konsern');
  end if;
  cash := coalesce((s.state->>'cash')::numeric, 0);
  loan := coalesce((s.state->>'loan')::numeric, 0);
  -- Bare egne penger (ikke lånte) – men hvor mye man har, gir ingen høyere grense
  if amt > cash - loan then
    return json_build_object('ok', false, 'reason', 'kasse');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || uid::text));
  lim := public.treasury_limit(uid);
  select coalesce(sum(amount), 0) into used
  from public.treasury_ledger where user_id = uid and kind = 'innskudd' and at > now() - interval '24 hours';
  if used + amt > lim then
    return json_build_object('ok', false, 'reason', 'grense', 'left', greatest(0, lim - used));
  end if;

  update public.saves
  set state = jsonb_set(jsonb_set(state, '{cash}', to_jsonb(cash - amt)), '{treasuryOut}',
                        to_jsonb(coalesce((state->>'treasuryOut')::numeric, 0) + amt)),
      device = 'server'
  where user_id = uid
  returning rev into new_rev;

  insert into public.treasury (user_id, balance, deposited_total, updated_at)
  values (uid, amt, amt, now())
  on conflict (user_id) do update
    set balance = public.treasury.balance + amt, deposited_total = public.treasury.deposited_total + amt,
        updated_at = now()
  returning balance into bal;
  insert into public.treasury_ledger (user_id, amount, kind) values (uid, amt, 'innskudd');

  return json_build_object('ok', true, 'rev', new_rev, 'amount', amt, 'balance', bal, 'left', lim - used - amt);
end;
$$;
revoke execute on function public.deposit_to_treasury(numeric, bigint) from public, anon;
grant execute on function public.deposit_to_treasury(numeric, bigint) to authenticated;

-- ------------------------------------------------------------------ 2. tidslinjetall fra før reformen
alter table public.snapshots add column if not exists pre_reform boolean not null default false;

-- Bare merket settes; juksesperren og de andre triggerne på tidslinja skal ikke kjøre for dette
alter table public.snapshots disable trigger user;
update public.snapshots s set pre_reform = true
from public.economy_reform_log l
where l.user_id = s.user_id and s.at < l.at and not s.pre_reform;
alter table public.snapshots enable trigger user;

-- Appen kan ikke sette eller fjerne merket (spillere skriver sine egne tall i tidslinja)
create or replace function public.guard_pre_reform()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.pre_reform := false;
  else
    new.pre_reform := old.pre_reform;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_pre_reform() from public, anon, authenticated;

drop trigger if exists snapshots_guard_reform on public.snapshots;
create trigger snapshots_guard_reform
  before insert or update on public.snapshots
  for each row execute function public.guard_pre_reform();

-- Sesonglista: siste tall etter reformen (dagene storverk/10 mrd. er ikke økonomi og står)
create or replace function public.leaderboard(kind text, lim integer default 50, season integer default null::integer)
returns table(plass integer, nickname text, value numeric, day integer, is_me boolean, league text, stage smallint,
              honor text, title text, linked_day integer)
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
      (select min(x.day) from public.snapshots x where x.user_id = ok.id and x.season_id = season) as linked_day
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
      end as value,
      (select min(x.day) from public.snapshots x where x.user_id = ok.id) as linked_day
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
$$;

create or replace function public.close_season(sid integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.season_results (season_id, user_id, nickname, equity, day, stage, plass)
  select sid, r.user_id, r.nickname, r.equity, r.day, r.stage,
    (row_number() over (order by r.equity desc, r.day asc))::int
  from (
    select distinct on (s.user_id) s.user_id, p.nickname, s.equity, s.day, s.stage
    from public.snapshots s
    join public.profiles p on p.id = s.user_id
    where s.season_id = sid and not s.pre_reform and p.nickname is not null and not p.banned and p.flagged_at is null
    order by s.user_id, s.day desc
  ) r
  on conflict (season_id, user_id) do nothing;
end;
$$;
revoke execute on function public.close_season(integer) from public, anon, authenticated;

-- ------------------------------------------------------------------ 3. ukens utfordring
create or replace function public.weekly_scores(w date)
returns table(user_id uuid, league text, value numeric, day integer)
language sql
stable
security definer
set search_path = public
as $$
  with win as (
    select (w::timestamp at time zone 'Europe/Oslo') as a, ((w + 7)::timestamp at time zone 'Europe/Oslo') as b
  ),
  last as (
    select distinct on (s.user_id) s.user_id, s.season_id, s.day, s.equity, s.produced_t
    from public.snapshots s, win
    where s.at >= win.a and s.at < win.b and not s.pre_reform
    order by s.user_id, s.at desc
  ),
  -- Ekte aktive dager i uka (norsk tid), uansett fart
  active as (
    select s.user_id, count(distinct (s.at at time zone 'Europe/Oslo')::date)::numeric as n
    from public.snapshots s, win
    where s.at >= win.a and s.at < win.b
    group by s.user_id
  )
  select l.user_id, 'alle'::text,
    round(case public.week_kind(w)
      when 'vekst' then 100.0 * (l.equity - b.equity) / greatest(abs(b.equity), 50000000)
      when 'tonn' then
        100.0 * ((l.produced_t - b.produced_t)::numeric / greatest(l.day - b.day, 1))
          / greatest(b.produced_t::numeric / greatest(b.day, 1), 1)
      else a.n
    end, 1) as value,
    l.day
  from last l
  join public.profiles p on p.id = l.user_id and p.nickname is not null and not p.banned and p.flagged_at is null
  join active a on a.user_id = l.user_id
  cross join win
  left join lateral (
    select x.day, x.equity, x.produced_t
    from public.snapshots x
    where x.user_id = l.user_id and (x.season_id is not distinct from l.season_id) and x.day < l.day and x.at < win.b
      and not x.pre_reform
    order by (x.at >= win.a), case when x.at < win.a then x.day end desc nulls last, x.day asc
    limit 1
  ) b on true
  where public.week_kind(w) = 'dager' or b.day is not null;
$$;
revoke execute on function public.weekly_scores(date) from public, anon, authenticated;

-- 4. Delt plass ved likt resultat
create or replace function public.finish_weeks()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w date;
  cur date := public.week_start_of(now());
begin
  select coalesce(max(week_start) + 7, date '2026-09-21') into w from public.weekly_weeks;
  while w < cur loop
    insert into public.weekly_results (week_start, user_id, league, kind, plass, value, fp)
    select w, r.user_id, r.league, public.week_kind(w), r.plass, r.value,
      case r.plass when 1 then 100 when 2 then 75 else 50 end
    from (
      select s.user_id, s.league, s.value, (rank() over (order by s.value desc))::int as plass
      from public.weekly_scores(w) s
      where s.value > 0
    ) r
    where r.plass <= 3
    on conflict do nothing;
    insert into public.weekly_weeks (week_start) values (w) on conflict do nothing;
    w := w + 7;
  end loop;
end;
$$;
revoke execute on function public.finish_weeks() from public, anon, authenticated;

create or replace function public.weekly_board(p_league text default null::text, lim integer default 20)
returns table(plass integer, nickname text, value numeric, is_me boolean, gold integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.finish_weeks();
  return query
  select (rank() over (order by s.value desc))::int, pr.nickname, s.value, s.user_id = auth.uid(),
    (select count(*) from public.weekly_results r where r.user_id = s.user_id and r.plass = 1)::int
  from public.weekly_scores(public.week_start_of(now())) s
  join public.profiles pr on pr.id = s.user_id
  where s.value > 0
  order by 1, pr.nickname
  limit lim;
end;
$$;

create or replace function public.weekly_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  ws date;
  me record;
  n int;
  chest record;
  g int;
  s int;
  b int;
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  perform public.finish_weeks();
  ws := public.week_start_of(now());

  select count(*) into n from public.weekly_scores(ws) x where x.value > 0;
  select r.plass, r.value into me from (
    select x.user_id, x.value, (rank() over (order by x.value desc))::int as plass
    from public.weekly_scores(ws) x
    where x.value > 0
  ) r where r.user_id = auth.uid();

  select coalesce(sum(fp), 0)::int as fp, count(*)::int as n, min(plass) as best, max(week_start) as week into chest
  from public.weekly_results where user_id = auth.uid() and claimed_at is null;

  select count(*) filter (where plass = 1), count(*) filter (where plass = 2), count(*) filter (where plass = 3)
  into g, s, b
  from public.weekly_results where user_id = auth.uid();

  return json_build_object(
    'week_start', ws,
    'ends_at', ((ws + 7)::timestamp at time zone 'Europe/Oslo'),
    'kind', public.week_kind(ws),
    'league', 'alle',
    'plass', me.plass,
    'value', me.value,
    'players', n,
    'chest', case when chest.n > 0 then json_build_object('fp', chest.fp, 'count', chest.n, 'best', chest.best, 'week', chest.week) end,
    'gold', g, 'silver', s, 'bronze', b
  );
end;
$$;
