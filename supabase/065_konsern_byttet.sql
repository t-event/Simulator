-- Stålverket: byttet til konsernet i ekte tid (B-325–B-328). Kjørt som migrasjonen «konsern_byttet».
--
-- 1. Verkene flyttes fra det lagrede spillet til tabellen `konsern` (064). Titlene spilleren har, blir gulvet (B-325):
--    ingen mister en tittel, en plass eller et trinn. Prosjekter som var i gang, fullføres i ekte tid som før.
-- 2. `save_game` legger serverens verk, kø og nivå inn i det lagrede spillet hver gang (kopien i appen teller ikke).
--    Byggetidsvakten (057–060) trengs ikke for dem som har en rad: verkene kommer fra serveren.
-- 3. Utbyttet regnes av serverens verk, uten mesterskapet (B-328), og med aktivitetskravet (B-327).
-- 4. Gulvet i konsernbidraget følger aktivitetskravet (B-327).
-- 5. `world_status` sender konsernet; topplista viser tittelen fra nivået (`title_for`).

-- 1. Radene for dem som har åpnet konsernet
insert into public.konsern (user_id, plants, next_id, floor, level)
select s.user_id,
       coalesce(s.state -> 'konsern' -> 'plants', '[]'::jsonb),
       greatest(1, coalesce((s.state -> 'konsern' ->> 'nextId')::int, 1),
                coalesce((select max((p ->> 'id')::int) + 1 from jsonb_array_elements(s.state -> 'konsern' -> 'plants') p), 1)),
       coalesce((s.state -> 'konsern' ->> 'legends')::int, 0),
       greatest(coalesce((s.state -> 'konsern' ->> 'legends')::int, 0),
                public.konsern_ladder_level(coalesce(s.state -> 'konsern' -> 'plants', '[]'::jsonb), public.konsern_cfg() -> 'ladder'))
from public.saves s
where coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
on conflict (user_id) do nothing;

select public.konsern_settle(user_id, now()) from public.konsern;

-- Mesterskapet teller ikke i utbyttet (B-328)
update public.config set value = jsonb_set(value, '{dividend,mastery_max}', '0'::jsonb) where id = 'world';

-- 2. Serverens konsern i det lagrede spillet: verkene (stans etter havari beholdes fra spillet), nivået, køen
create or replace function public.konsern_into_state(p_user uuid, p_state jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when k.user_id is null or p_state -> 'konsern' is null or jsonb_typeof(p_state -> 'konsern') <> 'object'
    then p_state
    else jsonb_set(jsonb_set(jsonb_set(jsonb_set(p_state,
      '{konsern,plants}', coalesce((
        select jsonb_agg(p || jsonb_build_object('downUntilDay', greatest(coalesce((p ->> 'downUntilDay')::int, 0),
          coalesce((select (x ->> 'downUntilDay')::int from jsonb_array_elements(coalesce(p_state -> 'konsern' -> 'plants', '[]'::jsonb)) x
                    where x ->> 'id' = p ->> 'id' limit 1), 0))) order by i)
        from jsonb_array_elements(k.plants) with ordinality as t(p, i)), '[]'::jsonb)),
      '{konsern,legends}', to_jsonb(greatest(k.level, k.floor))),
      '{konsern,nextId}', to_jsonb(greatest(k.next_id, coalesce((p_state -> 'konsern' ->> 'nextId')::int, 1)))),
      '{konsern,orders}', coalesce((
        select jsonb_agg(jsonb_build_object('id', o.id, 'kind', o.kind, 'plantId', o.plant_id, 'type', o.type,
          'name', o.name, 'cost', o.cost, 'startsAt', round(extract(epoch from o.starts_at) * 1000),
          'readyAt', round(extract(epoch from o.ready_at) * 1000), 'status', o.status) order by o.starts_at, o.id)
        from public.konsern_orders o where o.user_id = p_user and o.status in ('kø', 'i gang')), '[]'::jsonb))
  end
  from (select 1) x left join public.konsern k on k.user_id = p_user;
$$;
revoke execute on function public.konsern_into_state(uuid, jsonb) from public, anon, authenticated;

create or replace function public.save_game(p_state jsonb, p_minute integer, p_day integer, p_client_version text,
  p_season_id integer, p_device text, p_base_rev bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  r bigint;
  old_state jsonb;
  old_at timestamptz;
  fixed jsonb;
  uid uuid := auth.uid();
  has_konsern boolean;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  perform public.touch_activity();
  -- Konsernet i ekte tid (B-326): verkene, køen og nivået er serverens
  has_konsern := exists (select 1 from public.konsern where user_id = uid);
  if has_konsern then
    perform public.konsern_settle(uid, now());
    p_state := public.konsern_into_state(uid, p_state);
  end if;
  select state, updated_at into old_state, old_at from public.saves where user_id = uid and rev = p_base_rev;
  if old_state is not null and not has_konsern then
    fixed := public.guard_projects(old_state, p_state, now(), old_at);
    if fixed is not null then
      update public.saves
      set state = fixed, minute = p_minute, day = p_day, client_version = p_client_version,
          season_id = p_season_id, device = 'server'
      where user_id = uid and rev = p_base_rev
        and coalesce((p_state->>'serverEdit')::int, 0) >= coalesce((state->>'serverEdit')::int, 0);
      insert into public.project_guard_log (user_id, detail)
      values (uid, jsonb_build_object('notes', fixed -> 'projectGuard', 'client_version', p_client_version,
                                      'device', p_device, 'since_last_min', round(extract(epoch from (now() - old_at)) / 60)));
      return null;
    end if;
  end if;
  update public.saves
  set state = p_state, minute = p_minute, day = p_day, client_version = p_client_version,
      season_id = p_season_id, device = p_device
  where user_id = uid and rev = p_base_rev
    and coalesce((p_state->>'serverEdit')::int, 0) >= coalesce((state->>'serverEdit')::int, 0)
  returning rev into r;
  if r is not null then
    return r;
  end if;
  if exists (select 1 from public.saves where user_id = uid) then
    return null;
  end if;
  insert into public.saves (user_id, state, minute, day, client_version, season_id, device)
  values (uid, p_state, p_minute, p_day, p_client_version, p_season_id, p_device)
  returning rev into r;
  return r;
end;
$$;

-- 3. Utbyttet av serverens verk
create or replace function public.dividend_per_day(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select public.dividend_from_state(case when k.user_id is null then s.state
                                           else jsonb_set(s.state, '{konsern,plants}', k.plants) end)
    from public.saves s join public.profiles p on p.id = s.user_id
    left join public.konsern k on k.user_id = s.user_id
    where s.user_id = p_user and p.flagged_at is null and not p.banned
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
      and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
  ), 0);
$$;
revoke execute on function public.dividend_per_day(uuid) from public, anon, authenticated;

create or replace function public.pay_dividends()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
  d date;
  from_day date;
  max_days int;
  paid date;
  base numeric;
  amt numeric;
  today date := (now() at time zone 'utc')::date;
begin
  select coalesce((value -> 'dividend' ->> 'from')::date, date '2026-09-29'),
         coalesce((value -> 'dividend' ->> 'max_days')::int, 14)
    into from_day, max_days
  from public.config where id = 'world';
  for u in
    select s.user_id
    from public.saves s join public.profiles p on p.id = s.user_id
    join public.konsern k on k.user_id = s.user_id
    where p.flagged_at is null and not p.banned
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
      and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
      and jsonb_array_length(k.plants) > 0
  loop
    select max(day) into paid from public.dividends where user_id = u.user_id;
    d := greatest(from_day, coalesce(paid + 1, from_day), today - max_days);
    if d >= today then
      continue;
    end if;
    perform public.konsern_settle(u.user_id, now());
    base := public.dividend_per_day(u.user_id);
    while d < today loop
      -- Aktivitetskravet (B-327): fullt i 7 dager etter siste aktive dag, så ned til 0 ved dag 42
      amt := round(base * public.activity_factor(u.user_id, d));
      insert into public.dividends (user_id, day, amount) values (u.user_id, d, amt) on conflict do nothing;
      if found and amt > 0 then
        insert into public.treasury (user_id, balance, updated_at) values (u.user_id, amt, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
        insert into public.treasury_ledger (user_id, amount, kind, ref) values (u.user_id, amt, 'utbytte', 'utbytte:' || d);
      end if;
      d := d + 1;
    end loop;
  end loop;
end;
$$;
revoke execute on function public.pay_dividends() from public, anon, authenticated;

-- 4. Gulvet i bidraget følger aktivitetskravet
create or replace function public.pay_contributions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
  d date;
  from_day date;
  max_days int;
  fl numeric;
  decay_f numeric;
  last_day date;
  prev numeric;
  full_day numeric;
  rate numeric;
  gained numeric;
  act numeric;
  amt numeric;
  f numeric;
  today date := (now() at time zone 'utc')::date;
begin
  select coalesce((value -> 'contribution' ->> 'from')::date, date '2026-09-30'),
         coalesce((value -> 'contribution' ->> 'max_days')::int, 14),
         coalesce((value -> 'contribution' ->> 'floor')::numeric, 0.3),
         coalesce((value -> 'contribution' ->> 'decay')::numeric, 0.9)
    into from_day, max_days, fl, decay_f
  from public.config where id = 'world';
  for u in
    select s.user_id
    from public.saves s join public.profiles p on p.id = s.user_id
    where p.flagged_at is null and not p.banned
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
      and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
  loop
    select day, activity into last_day, prev from public.contributions where user_id = u.user_id order by day desc limit 1;
    d := greatest(from_day, coalesce(last_day + 1, from_day), today - max_days);
    if d >= today then
      continue;
    end if;
    full_day := public.contribution_full(u.user_id);
    rate := public.meter_normal_rate(u.user_id);
    while d < today loop
      gained := coalesce((select gained_t from public.production_days where user_id = u.user_id and day = d), 0);
      act := case when rate > 0 then least(1, gained / rate) else 0 end;
      -- Aktivitetskravet (B-327): gulvet på 30 % følger faktoren, så en forlatt konto slutter å tjene etter 42 dager
      f := public.activity_factor(u.user_id, d);
      act := greatest(act, fl * f, case when f > 0 then coalesce(prev * decay_f, fl * f) else 0 end);
      amt := round(public.contribution_amount(full_day, act));
      insert into public.contributions (user_id, day, amount, activity, counted_t, full_day)
      values (u.user_id, d, amt, round(act, 4), least(gained, rate), round(full_day))
      on conflict do nothing;
      if found and amt > 0 then
        insert into public.treasury (user_id, balance, updated_at) values (u.user_id, amt, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
        insert into public.treasury_ledger (user_id, amount, kind, ref) values (u.user_id, amt, 'bidrag', 'bidrag:' || d);
      end if;
      prev := act;
      d := d + 1;
    end loop;
  end loop;
end;
$$;
revoke execute on function public.pay_contributions() from public, anon, authenticated;

-- 5. world_status med konsernet, og titlene på topplista fra nivået
create or replace function public.world_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  out json;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  perform public.world_tick();
  perform public.konsern_settle(uid, now());
  select json_build_object(
    'companies', coalesce((select json_agg(json_build_object(
        'id', c.id, 'type', c.type, 'name', c.name,
        'owner', (select nickname from public.profiles where id = c.owner_id),
        'mine', c.owner_id = uid,
        'concession_until', c.concession_until,
        'next_owner', (select p.nickname from public.company_owners o join public.profiles p on p.id = o.user_id
                       where o.company_id = c.id and o.from_at > now() order by o.from_at limit 1),
        'next_mine', exists (select 1 from public.company_owners o where o.company_id = c.id and o.from_at > now()
                             and o.user_id = uid),
        'income_yesterday', (select amount from public.company_income i where i.company_id = c.id
                             and i.day = (now() at time zone 'utc')::date - 1),
        'income_mine', (select coalesce(sum(amount), 0) from public.company_income i where i.company_id = c.id
                        and i.owner_id = uid),
        'estimate_per_day', round(public.company_estimate(c.id)),
        'tender', (select json_build_object('id', t.id, 'opens_at', t.opens_at, 'closes_at', t.closes_at,
                     'min_bid', t.min_bid, 'max_bid', t.max_bid,
                     'my_bid', (select amount from public.tender_bids b where b.tender_id = t.id and b.user_id = uid),
                     'bidders', coalesce((select json_agg(p.nickname order by lower(p.nickname))
                                          from public.tender_bids b join public.profiles p on p.id = b.user_id
                                          where b.tender_id = t.id), '[]'::json))
                   from public.tenders t where t.company_id = c.id and t.status = 'åpent'
                   order by t.closes_at limit 1),
        'last_result', (select json_build_object('id', t.id, 'closed_at', t.closes_at, 'status', t.status,
                          'winner', (select nickname from public.profiles where id = t.winner_id),
                          'won', t.winner_id = uid, 'winning_bid', t.winning_bid, 'bidders', t.bidders,
                          'tie', t.tie,
                          'my_bid', (select amount from public.tender_bids b where b.tender_id = t.id and b.user_id = uid))
                        from public.tenders t where t.company_id = c.id and t.status <> 'åpent'
                        order by t.closes_at desc limit 1)
      ) order by c.id) from public.companies c where c.active), '[]'::json),
    'treasury', public.treasury_status(),
    'dividend', json_build_object(
      'per_day', round(public.dividend_per_day(uid)),
      'yesterday', (select amount from public.dividends where user_id = uid and day = (now() at time zone 'utc')::date - 1),
      'total', (select coalesce(sum(amount), 0) from public.dividends where user_id = uid)),
    'contribution', json_build_object(
      'per_day', round(public.contribution_amount(public.contribution_full(uid), 1)),
      'margin', round(public.contribution_margin(s.state)),
      'normal_t', round(public.meter_normal_rate(uid)),
      'activity', (select activity from public.contributions where user_id = uid order by day desc limit 1),
      'yesterday', (select amount from public.contributions where user_id = uid and day = (now() at time zone 'utc')::date - 1),
      'total', (select coalesce(sum(amount), 0) from public.contributions where user_id = uid)),
    -- Konsernet i ekte tid (B-326): verkene, køen, nivået og kassa; null uten rad (ikke åpnet ennå)
    'konsern', case when exists (select 1 from public.konsern where user_id = uid)
                    or coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
               then public.konsern_status(uid) end
  ) into out
  from (select (select state from public.saves where user_id = uid) as state) s;
  return out;
end;
$$;

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
  -- Konsernverdien (B-320): nå, fra serverens tall – samme liste i sesongen og i Hall of Fame
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
    -- Æresmerker bare serveren vet om (B-296, B-299), også de som er gitt for hånd (B-300)
    public.badges_of(rader.id) as badges
  from rader
  where value is not null
  order by plass
  limit lim;
$$;
