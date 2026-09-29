-- Stålverket: utbyttepolitikken, forsvarsfondet, Kontroll og investeringer (B-334, K6 og K7).
-- Kjørt som migrasjonen «kontroll».
--
-- Utbyttepolitikk: spilleren velger hvor mye datterverkene holder igjen: 30 % (ta ut, som før), 50 % (balansert) eller
-- 70 % (bygg forsvar). Det som holdes igjen utover 30 %, går til forsvarsfondet (`konsern.fund`), etter samme
-- imperiebelastning, så fondet er akkurat det kassa får mindre. Valget kan endres én gang per ekte uke.
-- Fondet kan bare brukes til investeringer i egne selskaper (og forsvar mot overtakelser, K8) – aldri til nye verk,
-- angrep eller hovedverket (B-323). Det gir også Kontroll.
-- Kontroll: tilstanden til ett selskap for eieren, 0–100, vist som ord. Investeringer i selskapet gir Kontroll og inntil
-- +25 % inntekt, og blir med selskapet til neste eier. I fornyelsesanbudet teller eierens bud Kontroll/5 % mer.
-- Speilet i `frontend/src/game/control.ts` og `dividend.ts` (`dividendToTreasury`).

update public.config
set value = value || jsonb_build_object(
  'policy', jsonb_build_object('ut', 0.3, 'balansert', 0.5, 'forsvar', 0.7, 'change_days', 7),
  'control', jsonb_build_object(
    'owner', 30, 'activity', 20, 'invest', 25, 'region_per', 2.5, 'region_max', 10, 'weeks_max', 10,
    'fund', 10, 'load', 5, 'value_days', 30, 'income_max', 0.25, 'invest_min', 1000000,
    'renewal_per', 0.002, 'renewal_max', 0.2))
where id = 'world' and not (value ? 'control');

alter table public.konsern add column if not exists policy text not null default 'ut';
alter table public.konsern drop constraint if exists konsern_policy_check;
alter table public.konsern add constraint konsern_policy_check check (policy in ('ut', 'balansert', 'forsvar'));
alter table public.konsern add column if not exists policy_at timestamptz;
alter table public.konsern add column if not exists fund numeric not null default 0;
alter table public.companies add column if not exists invested numeric not null default 0;
alter table public.dividends add column if not exists to_fund numeric not null default 0;

alter table public.treasury_ledger drop constraint if exists treasury_ledger_kind_check;
alter table public.treasury_ledger add constraint treasury_ledger_kind_check
  check (kind in ('innskudd', 'anbud', 'refusjon', 'inntekt', 'utbetaling', 'justering', 'utbytte', 'bidrag',
                  'prosjekt', 'salg', 'investering'));

create or replace function public.control_cfg_num(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value -> 'control' ->> p_key)::numeric from public.config where id = 'world'), p_default);
$$;
revoke execute on function public.control_cfg_num(text, numeric) from public, anon, authenticated;

-- Hvor mye datterverkene holder igjen for spilleren
create or replace function public.policy_keep(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (c.value -> 'policy' ->> k.policy)::numeric
                   from public.konsern k, public.config c where k.user_id = p_user and c.id = 'world'), 0.3);
$$;
revoke execute on function public.policy_keep(uuid) from public, anon, authenticated;

-- Utbyttet til konsernkassa med en annen andel igjen i verkene: fullt utbytte (30 % igjen) tilbake til før
-- imperiebelastningen, skalert, og belastningen på nytt. Ren regel (speilet i dividend.ts)
create or replace function public.dividend_to_treasury(p_full numeric, p_keep numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with k as (
    select coalesce((value -> 'dividend' ->> 'load_from')::numeric, 10000000) as l,
           coalesce((value -> 'dividend' ->> 'load_power')::numeric, 0.5) as p,
           coalesce((value -> 'dividend' ->> 'keep')::numeric, 0.3) as base_keep
    from public.config where id = 'world'
  ), raw as (
    select case when p_full > k.l and k.l > 0 then k.l * power(p_full / k.l, 1 / k.p) else greatest(0, p_full) end
           * (1 - p_keep) / (1 - k.base_keep) as r, k.l, k.p
    from k
  )
  select case when p_keep <= (select base_keep from k) then greatest(0, p_full)
              when r > l and l > 0 then l * power(r / l, p) else r end
  from raw;
$$;
revoke execute on function public.dividend_to_treasury(numeric, numeric) from public, anon, authenticated;

-- Verdien av et selskap: 30 dagers inntekt, men minst det det sist ble vunnet for
create or replace function public.company_value(p_company int)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    public.control_cfg_num('value_days', 30) * coalesce(public.company_estimate(p_company), 0),
    coalesce((select winning_bid from public.tenders where company_id = p_company and status = 'avgjort'
              order by closes_at desc limit 1), 0),
    1);
$$;
revoke execute on function public.company_value(int) from public, anon, authenticated;

-- Kontrollen over et selskap for eieren nå: delene og summen (0–100). Null uten eier
create or replace function public.company_control(p_company int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c record;
  v numeric;
  run_start timestamptz;
  parts jsonb;
  total numeric;
  n_owned int;
  n_region int;
  fund numeric;
begin
  select * into c from public.companies where id = p_company;
  if c.id is null or c.owner_id is null then
    return null;
  end if;
  v := public.company_value(p_company);
  -- Eiertiden: fra eieren tok over etter en annen (flere konsesjoner på rad teller sammen)
  select min(o.from_at) into run_start from public.company_owners o
  where o.company_id = p_company and o.user_id = c.owner_id and o.from_at <= now()
    and o.from_at >= coalesce((select max(x.until_at) from public.company_owners x
                               where x.company_id = p_company and x.user_id <> c.owner_id and x.until_at <= now()),
                              '-infinity'::timestamptz);
  select count(*) into n_owned from public.companies where owner_id = c.owner_id and active;
  select count(*) into n_region from public.konsern k, jsonb_array_elements(k.plants) p
  where k.user_id = c.owner_id and p ->> 'region' = c.region;
  select coalesce(k.fund, 0) into fund from public.konsern k where k.user_id = c.owner_id;
  parts := jsonb_build_object(
    'eier', public.control_cfg_num('owner', 30),
    'aktivitet', round(public.control_cfg_num('activity', 20)
                       * public.activity_factor(c.owner_id, (now() at time zone 'utc')::date), 1),
    'investering', round(public.control_cfg_num('invest', 25) * (1 - exp(-c.invested / v)), 1),
    'region', least(public.control_cfg_num('region_max', 10), public.control_cfg_num('region_per', 2.5) * n_region),
    'eiertid', least(public.control_cfg_num('weeks_max', 10),
                     floor(extract(epoch from now() - coalesce(run_start, now())) / (7 * 86400))),
    'fond', round(public.control_cfg_num('fund', 10) * (1 - exp(-coalesce(fund, 0) / (2 * v))), 1),
    'belastning', -public.control_cfg_num('load', 5) * greatest(0, n_owned - 1));
  select sum(value::numeric) into total from jsonb_each_text(parts);
  return jsonb_build_object('score', greatest(0, least(100, round(total))), 'parts', parts, 'value', round(v),
                            'invested', c.invested);
end;
$$;
revoke execute on function public.company_control(int) from public, anon, authenticated;

-- Fordelen i fornyelsesanbudet: Kontroll × 0,2 %, inntil 20 %
create or replace function public.control_bonus(p_company int)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select least(public.control_cfg_num('renewal_max', 0.2),
               coalesce((public.company_control(p_company) ->> 'score')::numeric, 0)
               * public.control_cfg_num('renewal_per', 0.002));
$$;
revoke execute on function public.control_bonus(int) from public, anon, authenticated;

create or replace function public.konsern_status(p_user uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'level', coalesce(k.level, 0),
    'floor', coalesce(k.floor, 0),
    'next_id', coalesce(k.next_id, 1),
    'plants', coalesce(k.plants, '[]'::jsonb),
    'orders', coalesce((select json_agg(json_build_object('id', o.id, 'kind', o.kind, 'plant_id', o.plant_id,
                          'type', o.type, 'name', o.name, 'cost', o.cost, 'region', o.region,
                          'starts_at', round(extract(epoch from o.starts_at) * 1000),
                          'ready_at', round(extract(epoch from o.ready_at) * 1000), 'status', o.status)
                          order by o.starts_at, o.id)
                        from public.konsern_orders o where o.user_id = p_user and o.status in ('kø', 'i gang')),
                       '[]'::json),
    'bound', coalesce((select sum(cost) from public.konsern_orders o
                       where o.user_id = p_user and o.status in ('kø', 'i gang')), 0),
    'balance', coalesce((select balance from public.treasury where user_id = p_user), 0),
    -- Utbyttepolitikken og forsvarsfondet (B-334)
    'policy', coalesce(k.policy, 'ut'),
    'policy_at', case when k.policy_at is null then null else round(extract(epoch from k.policy_at) * 1000) end,
    'fund', coalesce(k.fund, 0))
  from (select 1) x left join public.konsern k on k.user_id = p_user;
$$;

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
  kasse numeric;
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
      -- Utbyttepolitikken (B-334): det som holdes igjen utover 30 %, går til forsvarsfondet
      kasse := round(public.dividend_to_treasury(base, public.policy_keep(u.user_id)) * public.activity_factor(u.user_id, d));
      insert into public.dividends (user_id, day, amount, to_fund)
      values (u.user_id, d, kasse, greatest(0, amt - kasse)) on conflict do nothing;
      if found and amt > 0 then
        insert into public.treasury (user_id, balance, updated_at) values (u.user_id, kasse, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
        insert into public.treasury_ledger (user_id, amount, kind, ref) values (u.user_id, kasse, 'utbytte', 'utbytte:' || d);
        update public.konsern set fund = fund + greatest(0, amt - kasse), updated_at = now() where user_id = u.user_id;
      end if;
      d := d + 1;
    end loop;
  end loop;
end;
$$;

create or replace function public.pay_company_income()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  d date;
  own uuid;
  fee numeric;
  tons numeric;
  nb int;
  first_owner date;
  paid date;
  boost numeric;
  amt numeric;
begin
  for c in select * from public.companies where active loop
    fee := public.company_fee(c.type);
    -- Investeringene i selskapet gir inntil +25 % inntekt (B-334), samme kurve som i Kontrollen
    boost := 1 + public.control_cfg_num('income_max', 0.25) * (1 - exp(-c.invested / greatest(1, public.company_value(c.id))));
    select min(from_at at time zone 'utc')::date into first_owner from public.company_owners where company_id = c.id;
    if first_owner is null then
      continue;
    end if;
    select max(day) into paid from public.company_income where company_id = c.id;
    d := greatest(first_owner, coalesce(paid + 1, first_owner));
    while d < (now() at time zone 'utc')::date loop
      select user_id into own from public.company_owners
      where company_id = c.id and from_at <= (d + time '12:00') at time zone 'utc'
        and until_at > (d + time '12:00') at time zone 'utc'
      order by from_at desc limit 1;
      if own is not null then
        select coalesce(sum(public.company_counted_t(c.type, pd.user_id, d)), 0), count(*) filter (where pd.gained_t > 0)
          into tons, nb
        from public.production_days pd join public.profiles p on p.id = pd.user_id
        where pd.day = d and pd.user_id <> own and p.flagged_at is null and not p.banned;
        amt := round(tons * fee * boost);
        insert into public.company_income (company_id, day, owner_id, counted_t, buyers, amount)
        values (c.id, d, own, tons, nb, amt)
        on conflict do nothing;
        if found and tons > 0 then
          insert into public.treasury (user_id, balance, updated_at) values (own, amt, now())
          on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
          insert into public.treasury_ledger (user_id, amount, kind, ref)
          values (own, amt, 'inntekt', c.type || ':' || d);
        end if;
      else
        insert into public.company_income (company_id, day, owner_id, counted_t, buyers, amount)
        values (c.id, d, null, 0, 0, 0)
        on conflict do nothing;
      end if;
      d := d + 1;
    end loop;
  end loop;
end;
$$;

create or replace function public.resolve_tenders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  win record;
  co record;
  n int;
  top_count int;
  start_at timestamptz;
  days int;
  bonus numeric;
begin
  select coalesce((value->>'concession_days')::int, 14) into days from public.config where id = 'world';
  for t in select * from public.tenders where status = 'åpent' and closes_at <= now() order by closes_at for update loop
    select count(*) into n from public.tender_bids where tender_id = t.id;
    select * into co from public.companies where id = t.company_id for update;
    if n = 0 then
      update public.tenders set status = 'ingen bud', bidders = 0, resolved_at = now() where id = t.id;
      continue;
    end if;
    -- Den som eier selskapet nå, får en fordel av Kontrollen i fornyelsesanbudet (B-332, B-334): budet teller
    -- Kontroll/5 % mer, inntil +20 %. Beløpet som betales, er budet
    bonus := case when co.owner_id is not null then public.control_bonus(t.company_id) else 0 end;
    select count(*) into top_count from public.tender_bids b
    where b.tender_id = t.id
      and b.amount * (1 + case when b.user_id = co.owner_id then bonus else 0 end)
          = (select max(x.amount * (1 + case when x.user_id = co.owner_id then bonus else 0 end))
             from public.tender_bids x where x.tender_id = t.id);
    select * into win from public.tender_bids b where b.tender_id = t.id
    order by b.amount * (1 + case when b.user_id = co.owner_id then bonus else 0 end) desc, random() limit 1;
    -- Budene som ikke vant, går tilbake til konsernkassa
    update public.treasury tr set balance = tr.balance + b.amount, updated_at = now()
    from public.tender_bids b where b.tender_id = t.id and b.user_id <> win.user_id and tr.user_id = b.user_id;
    insert into public.treasury_ledger (user_id, amount, kind, ref)
    select b.user_id, b.amount, 'refusjon', 'anbud:' || t.id from public.tender_bids b
    where b.tender_id = t.id and b.user_id <> win.user_id;
    -- Ny konsesjon fra der den gamle slutter (anbudet åpner 48 timer før), ellers fra nå
    start_at := greatest(t.closes_at, coalesce(co.concession_until, t.closes_at));
    insert into public.company_owners (company_id, user_id, from_at, until_at, tender_id)
    values (t.company_id, win.user_id, start_at, start_at + make_interval(days => days), t.id);
    update public.tenders
    set status = 'avgjort', winner_id = win.user_id, winning_bid = win.amount, bidders = n, tie = top_count > 1,
        resolved_at = now()
    where id = t.id;
  end loop;
  -- Eieren nå, etter konsesjonene
  update public.companies c
  set owner_id = o.user_id, concession_until = o.until_at
  from (select distinct on (company_id) company_id, user_id, until_at from public.company_owners
        where from_at <= now() order by company_id, from_at desc) o
  where o.company_id = c.id and (c.owner_id is distinct from o.user_id or c.concession_until is distinct from o.until_at);
  update public.companies c set owner_id = null
  where c.concession_until is not null and c.concession_until <= now()
    and not exists (select 1 from public.company_owners o where o.company_id = c.id and o.from_at <= now()
                    and o.until_at > now());
end;
$$;

-- Velg utbyttepolitikk, én gang per ekte uke
create or replace function public.konsern_policy(p_policy text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  k record;
  days int;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if p_policy not in ('ut', 'balansert', 'forsvar') then
    return json_build_object('ok', false, 'reason', 'type');
  end if;
  select coalesce((value -> 'policy' ->> 'change_days')::int, 7) into days from public.config where id = 'world';
  perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || uid::text));
  select * into k from public.konsern where user_id = uid for update;
  if k.user_id is null then
    return json_build_object('ok', false, 'reason', 'konsern');
  end if;
  if k.policy = p_policy then
    return json_build_object('ok', true, 'konsern', public.konsern_status(uid));
  end if;
  if k.policy_at is not null and k.policy_at > now() - make_interval(days => days) then
    return json_build_object('ok', false, 'reason', 'uke',
                             'next', round(extract(epoch from k.policy_at + make_interval(days => days)) * 1000));
  end if;
  update public.konsern set policy = p_policy, policy_at = now(), updated_at = now() where user_id = uid;
  return json_build_object('ok', true, 'konsern', public.konsern_status(uid));
end;
$$;
revoke execute on function public.konsern_policy(text) from public, anon;
grant execute on function public.konsern_policy(text) to authenticated;

-- Invester i et selskap du eier, fra konsernkassa eller forsvarsfondet. Pengene blir i selskapet
create or replace function public.company_invest(p_company int, p_amount numeric, p_source text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c record;
  have numeric;
  amt numeric := round(coalesce(p_amount, 0));
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  if p_source not in ('kasse', 'fond') or amt < public.control_cfg_num('invest_min', 1000000) then
    return json_build_object('ok', false, 'reason', 'belop');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || uid::text));
  perform public.resolve_tenders();
  select * into c from public.companies where id = p_company and active for update;
  if c.id is null or c.owner_id is distinct from uid then
    return json_build_object('ok', false, 'reason', 'eier');
  end if;
  if p_source = 'kasse' then
    select balance into have from public.treasury where user_id = uid for update;
  else
    select fund into have from public.konsern where user_id = uid for update;
  end if;
  if coalesce(have, 0) < amt then
    return json_build_object('ok', false, 'reason', 'kasse');
  end if;
  if p_source = 'kasse' then
    update public.treasury set balance = balance - amt, updated_at = now() where user_id = uid;
    insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, -amt, 'investering', 'selskap:' || p_company);
  else
    update public.konsern set fund = fund - amt, updated_at = now() where user_id = uid;
  end if;
  update public.companies set invested = invested + amt where id = p_company;
  return json_build_object('ok', true, 'control', public.company_control(p_company));
end;
$$;
revoke execute on function public.company_invest(int, numeric, text) from public, anon;
grant execute on function public.company_invest(int, numeric, text) to authenticated;


-- Det spilleren ser: som i 065, med Kontrollen per selskap og utbyttet etter politikken
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
        -- Kontroll og investeringer (B-334), regionen på kartet (B-333)
        'region', c.region,
        'control', public.company_control(c.id),
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
      'per_day', round(public.dividend_to_treasury(public.dividend_per_day(uid), public.policy_keep(uid))),
      'full_per_day', round(public.dividend_per_day(uid)),
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
