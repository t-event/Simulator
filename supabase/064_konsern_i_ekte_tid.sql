-- Stålverket: konsernet i ekte tid (B-325, B-326). Kjørt som migrasjonen «konsern_i_ekte_tid».
--
-- Datterverkene kjøpes, bygges ut, moderniseres og selges fra konsernkassa på serveren, ikke fra kassa i spillet.
-- Serveren holder verkene (tabellen `konsern`) og køen (`konsern_orders`); det lagrede spillet får en kopi (065).
-- Konsernnivået (titlene) regnes av verkene serveren har solgt spilleren, ikke av kassa: `konsern_ladder_level`.
-- Regelen speiles i `frontend/src/game/konsernWorld.ts`; endres den, endres begge, og testene kjøres mot begge.
--
-- Denne migrasjonen lager bare tabellene og funksjonene. Ingenting bruker dem før 065 (byttet).

update public.config
set value = value || jsonb_build_object('konsern', jsonb_build_object(
  'price', jsonb_build_object('stalverk', 20000000, 'storverk', 80000000, 'kompleks', 250000000),
  'mod_share', 0.3, 'sell_share', 0.6,
  'build_h', jsonb_build_object('stalverk', 2, 'storverk', 6, 'kompleks', 12),
  'mod_h', 4, 'upg_h', 6, 'queue_max', 3, 'slots', 6, 'slots_big', 8,
  -- Forskningen «Oppkjøpsavdeling» og «Standardverk» (B-120)
  'discount_buy', 0.85, 'discount_mod', 0.75,
  -- Nivåstigen (B-325): antall verk av typene på minst trinnet, i rekkefølge
  'ladder', jsonb_build_array(
    jsonb_build_object('title', 'Stålmagnat', 'count', 3, 'types', jsonb_build_array('storverk', 'kompleks'), 'level', 3),
    jsonb_build_object('title', 'Stålfyrste', 'count', 6, 'types', jsonb_build_array('storverk', 'kompleks'), 'level', 4),
    jsonb_build_object('title', 'Stålkonge', 'count', 2, 'types', jsonb_build_array('kompleks'), 'level', 3),
    jsonb_build_object('title', 'Stålkeiser', 'count', 4, 'types', jsonb_build_array('kompleks'), 'level', 5),
    jsonb_build_object('title', 'Stållegende', 'count', 6, 'types', jsonb_build_array('kompleks'), 'level', 5),
    jsonb_build_object('title', 'Stålgigant', 'count', 8, 'types', jsonb_build_array('kompleks'), 'level', 5),
    jsonb_build_object('title', 'Stålkolosse', 'count', 10, 'types', jsonb_build_array('kompleks'), 'level', 5),
    jsonb_build_object('title', 'Stålmyte', 'count', 12, 'types', jsonb_build_array('kompleks'), 'level', 6),
    jsonb_build_object('title', 'Stålikon', 'count', 14, 'types', jsonb_build_array('kompleks'), 'level', 6)),
  'names', jsonb_build_array('Elveverket', 'Fjordverket', 'Dalverket', 'Havneverket', 'Skogverket', 'Fjellverket',
    'Nesverket', 'Sletteverket', 'Øyverket', 'Viksverket', 'Bakkeverket', 'Strandverket')))
where id = 'world' and not (value ? 'konsern');

-- Verkene per spiller. `floor` er titlene spilleren hadde ved byttet (065) – nivået går aldri under dem
create table if not exists public.konsern (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plants jsonb not null default '[]'::jsonb,
  next_id int not null default 1,
  floor int not null default 0,
  level int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.konsern enable row level security;
revoke all on public.konsern from anon, authenticated;

-- Køen: betalt når den bestilles, bygges én om gangen i rekkefølge (tidene er regnet ut på forhånd)
create table if not exists public.konsern_orders (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('bygg', 'modernisering', 'utbygging')),
  plant_id int not null,
  type text,
  name text,
  bought_day int,
  cost numeric not null,
  starts_at timestamptz not null,
  ready_at timestamptz not null,
  status text not null default 'kø' check (status in ('kø', 'i gang', 'ferdig', 'avbestilt')),
  created_at timestamptz not null default now()
);
create index if not exists konsern_orders_user_status on public.konsern_orders (user_id, status);
alter table public.konsern_orders enable row level security;
revoke all on public.konsern_orders from anon, authenticated;

alter table public.treasury_ledger drop constraint if exists treasury_ledger_kind_check;
alter table public.treasury_ledger add constraint treasury_ledger_kind_check
  check (kind in ('innskudd', 'anbud', 'refusjon', 'inntekt', 'utbetaling', 'justering', 'utbytte', 'bidrag',
                  'prosjekt', 'salg'));

create or replace function public.konsern_cfg()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value -> 'konsern' from public.config where id = 'world'), '{}'::jsonb);
$$;
revoke execute on function public.konsern_cfg() from public, anon, authenticated;

-- Nivået verkene gir (ren regel): trinnene i stigen tas i rekkefølge, verk som bygges teller ikke
create or replace function public.konsern_ladder_level(p_plants jsonb, p_ladder jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  n int := 0;
  step jsonb;
  cnt int;
begin
  for step in select s from jsonb_array_elements(coalesce(p_ladder, '[]'::jsonb)) with ordinality as t(s, i) order by i loop
    select count(*) into cnt
    from jsonb_array_elements(coalesce(p_plants, '[]'::jsonb)) p
    where coalesce(p -> 'project' ->> 'kind', '') <> 'bygg'
      and (step -> 'types') ? (p ->> 'type')
      and coalesce((p ->> 'level')::int, 0) >= coalesce((step ->> 'level')::int, 0);
    exit when cnt < coalesce((step ->> 'count')::int, 0);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.konsern_ladder_level(jsonb, jsonb) from public, anon, authenticated;

-- Plasser, høyeste trinn og kompleks etter nivået (B-150, B-173)
create or replace function public.konsern_slots(p_level int, p_big boolean)
returns int
language sql
immutable
set search_path = public
as $$
  select (case when p_big then 8 else 6 end)
    + 2 * ((p_level >= 2)::int + (p_level >= 4)::int + (p_level >= 6)::int);
$$;
create or replace function public.konsern_mod_max(p_level int)
returns int
language sql
immutable
set search_path = public
as $$
  select 3 + (p_level >= 1)::int + (p_level >= 3)::int + (p_level >= 7)::int;
$$;
revoke execute on function public.konsern_slots(int, boolean) from public, anon, authenticated;
revoke execute on function public.konsern_mod_max(int) from public, anon, authenticated;

-- Ett verk etter et prosjekt
create or replace function public.konsern_after(p_plant jsonb, p_kind text)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case p_kind
    when 'modernisering' then (p_plant - 'project') || jsonb_build_object('level', coalesce((p_plant ->> 'level')::int, 0) + 1)
    when 'utbygging' then (p_plant - 'project') || jsonb_build_object('type', 'storverk', 'level', 0)
    else p_plant - 'project'
  end;
$$;
revoke execute on function public.konsern_after(jsonb, text) from public, anon, authenticated;

-- Start og fullfør prosjektene som er kommet til i ekte tid, og løft nivået. Kalles før alt som leser verkene
create or replace function public.konsern_settle(p_user uuid, p_now timestamptz default now())
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k record;
  o record;
  v_plants jsonb;
  ms_start numeric;
  ms_ready numeric;
  now_ms numeric := extract(epoch from p_now) * 1000;
  lvl int;
begin
  select * into k from public.konsern where user_id = p_user for update;
  if not found then
    return;
  end if;
  v_plants := k.plants;
  for o in select * from public.konsern_orders
           where user_id = p_user and status in ('kø', 'i gang') order by starts_at, id loop
    exit when o.starts_at > p_now;
    ms_start := extract(epoch from o.starts_at) * 1000;
    ms_ready := extract(epoch from o.ready_at) * 1000;
    if o.status = 'kø' then
      if o.kind = 'bygg' then
        v_plants := v_plants || jsonb_build_array(jsonb_build_object('id', o.plant_id, 'type', o.type, 'name', o.name,
          'level', 0, 'boughtDay', coalesce(o.bought_day, 0), 'downUntilDay', 0,
          'project', jsonb_build_object('kind', 'bygg', 'startedAt', ms_start, 'readyAt', ms_ready)));
      else
        select coalesce(jsonb_agg(case when (p ->> 'id')::int = o.plant_id
                                       then p || jsonb_build_object('project', jsonb_build_object('kind', o.kind,
                                              'startedAt', ms_start, 'readyAt', ms_ready))
                                       else p end order by i), '[]'::jsonb)
          into v_plants from jsonb_array_elements(v_plants) with ordinality as t(p, i);
      end if;
      update public.konsern_orders set status = 'i gang' where id = o.id;
    end if;
    if o.ready_at <= p_now then
      -- Ferdig før neste prosjekt i køen starter (to trinn på samme verk etter hverandre)
      select coalesce(jsonb_agg(case when (p ->> 'id')::int = o.plant_id and p ? 'project'
                                     then public.konsern_after(p, p -> 'project' ->> 'kind') else p end
                                order by i), '[]'::jsonb)
        into v_plants from jsonb_array_elements(v_plants) with ordinality as t(p, i);
      update public.konsern_orders set status = 'ferdig' where id = o.id;
    end if;
  end loop;
  -- Alle prosjekter som er ferdige, også de som sto i det lagrede spillet før byttet (065)
  select coalesce(jsonb_agg(case when p ? 'project' and (p -> 'project' ->> 'readyAt')::numeric <= now_ms
                                 then public.konsern_after(p, p -> 'project' ->> 'kind') else p end order by i), '[]'::jsonb)
    into v_plants from jsonb_array_elements(v_plants) with ordinality as t(p, i);
  lvl := greatest(k.level, k.floor, public.konsern_ladder_level(v_plants, public.konsern_cfg() -> 'ladder'));
  if v_plants is distinct from k.plants or lvl <> k.level then
    update public.konsern set plants = v_plants, level = lvl, updated_at = now() where user_id = p_user;
  end if;
end;
$$;
revoke execute on function public.konsern_settle(uuid, timestamptz) from public, anon, authenticated;

-- Verkene slik de blir når alt i køen er ferdig (til sjekken av plasser og trinn)
create or replace function public.konsern_planned(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plants jsonb;
  o record;
begin
  select coalesce(jsonb_agg(case when p ? 'project' then public.konsern_after(p, p -> 'project' ->> 'kind') else p end
                            order by i), '[]'::jsonb)
    into v_plants
  from public.konsern k, jsonb_array_elements(k.plants) with ordinality as t(p, i)
  where k.user_id = p_user;
  for o in select * from public.konsern_orders where user_id = p_user and status = 'kø' order by starts_at, id loop
    if o.kind = 'bygg' then
      v_plants := v_plants || jsonb_build_array(jsonb_build_object('id', o.plant_id, 'type', o.type, 'name', o.name, 'level', 0));
    else
      select coalesce(jsonb_agg(case when (p ->> 'id')::int = o.plant_id then public.konsern_after(p, o.kind) else p end
                                order by i), '[]'::jsonb)
        into v_plants from jsonb_array_elements(v_plants) with ordinality as t(p, i);
    end if;
  end loop;
  return coalesce(v_plants, '[]'::jsonb);
end;
$$;
revoke execute on function public.konsern_planned(uuid) from public, anon, authenticated;

-- Det appen trenger: verkene, køen, nivået og kassa
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
                          'type', o.type, 'name', o.name, 'cost', o.cost,
                          'starts_at', round(extract(epoch from o.starts_at) * 1000),
                          'ready_at', round(extract(epoch from o.ready_at) * 1000), 'status', o.status)
                          order by o.starts_at, o.id)
                        from public.konsern_orders o where o.user_id = p_user and o.status in ('kø', 'i gang')),
                       '[]'::json),
    'bound', coalesce((select sum(cost) from public.konsern_orders o
                       where o.user_id = p_user and o.status in ('kø', 'i gang')), 0),
    'balance', coalesce((select balance from public.treasury where user_id = p_user), 0))
  from (select 1) x left join public.konsern k on k.user_id = p_user;
$$;
revoke execute on function public.konsern_status(uuid) from public, anon, authenticated;

-- Bestill et prosjekt: kjøp (bygg), modernisering, utbygging, eller bytt et verk mot et stålkompleks. Betales med én
-- gang fra konsernkassa, så de samme pengene ikke kan brukes til bud
create or replace function public.konsern_order(p_kind text, p_plant int default null, p_type text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s record;
  k record;
  cfg jsonb := public.konsern_cfg();
  researched jsonb;
  planned jsonb;
  pl jsonb;
  pending int;
  lvl int;
  big boolean;
  kind text := p_kind;
  typ text;
  pid int;
  pname text;
  cost numeric;
  hours numeric;
  sale numeric := 0;
  bal numeric;
  starts timestamptz;
  new_id bigint;
  buy numeric;
  modd numeric;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  select state, day into s from public.saves where user_id = uid;
  if s.state is null or coalesce((s.state ->> 'stage')::int, 0) < 4
     or coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false) = false then
    return json_build_object('ok', false, 'reason', 'konsern');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || uid::text));
  insert into public.konsern (user_id) values (uid) on conflict do nothing;
  perform public.konsern_settle(uid, now());
  select * into k from public.konsern where user_id = uid for update;
  researched := coalesce(s.state -> 'researched', '[]'::jsonb);
  big := researched ? 'storkonsern';
  buy := case when researched ? 'oppkjop' then coalesce((cfg ->> 'discount_buy')::numeric, 0.85) else 1 end;
  modd := case when researched ? 'standardverk' then coalesce((cfg ->> 'discount_mod')::numeric, 0.75) else 1 end;
  lvl := greatest(k.level, k.floor);
  select count(*) into pending from public.konsern_orders where user_id = uid and status in ('kø', 'i gang');
  if pending >= coalesce((cfg ->> 'queue_max')::int, 3) then
    return json_build_object('ok', false, 'reason', 'ko_full');
  end if;

  if kind = 'bytt' then
    -- Selg verket og kjøp et stålkompleks på plassen. Verket må stå uten prosjekt og uten noe i køen
    if lvl < 2 then
      return json_build_object('ok', false, 'reason', 'niva');
    end if;
    select p into pl from jsonb_array_elements(k.plants) p where (p ->> 'id')::int = p_plant;
    if pl is null or pl ? 'project' or pl ->> 'type' = 'kompleks'
       or exists (select 1 from public.konsern_orders where user_id = uid and status = 'kø' and plant_id = p_plant) then
      return json_build_object('ok', false, 'reason', 'verk');
    end if;
    sale := round((cfg -> 'price' ->> (pl ->> 'type'))::numeric
                  * (1 + coalesce((cfg ->> 'mod_share')::numeric, 0.3) * coalesce((pl ->> 'level')::int, 0))
                  * coalesce((cfg ->> 'sell_share')::numeric, 0.6));
    kind := 'bygg';
    typ := 'kompleks';
  elsif kind = 'bygg' then
    typ := p_type;
  end if;

  planned := public.konsern_planned(uid);
  if p_kind = 'bytt' then
    select coalesce(jsonb_agg(p), '[]'::jsonb) into planned from jsonb_array_elements(planned) p
    where (p ->> 'id')::int <> p_plant;
  end if;

  if kind = 'bygg' then
    if typ is null or not (cfg -> 'price' ? typ) then
      return json_build_object('ok', false, 'reason', 'type');
    end if;
    if jsonb_array_length(planned) >= public.konsern_slots(lvl, big) then
      return json_build_object('ok', false, 'reason', 'fullt');
    end if;
    if typ = 'kompleks' and lvl < 2 then
      return json_build_object('ok', false, 'reason', 'niva');
    end if;
    if typ = 'storverk' and jsonb_array_length(planned) = 0 then
      return json_build_object('ok', false, 'reason', 'forst_stalverk');
    end if;
    cost := round((cfg -> 'price' ->> typ)::numeric * buy);
    hours := coalesce((cfg -> 'build_h' ->> typ)::numeric, 6);
    pid := k.next_id;
    select n into pname from jsonb_array_elements_text(cfg -> 'names') with ordinality as t(n, i)
    where not exists (select 1 from jsonb_array_elements(k.plants || planned) p where p ->> 'name' = n)
      and not exists (select 1 from public.konsern_orders o where o.user_id = uid and o.status in ('kø', 'i gang')
                      and o.name = n)
    order by i limit 1;
    pname := coalesce(pname, 'Verk nr. ' || (jsonb_array_length(planned) + 2));
  elsif kind in ('modernisering', 'utbygging') then
    select p into pl from jsonb_array_elements(planned) p where (p ->> 'id')::int = p_plant;
    if pl is null then
      return json_build_object('ok', false, 'reason', 'verk');
    end if;
    pid := p_plant;
    if kind = 'modernisering' then
      if coalesce((pl ->> 'level')::int, 0) >= public.konsern_mod_max(lvl) then
        return json_build_object('ok', false, 'reason', 'trinn');
      end if;
      cost := round((cfg -> 'price' ->> (pl ->> 'type'))::numeric * coalesce((cfg ->> 'mod_share')::numeric, 0.3) * modd);
      hours := coalesce((cfg ->> 'mod_h')::numeric, 4);
    else
      if pl ->> 'type' <> 'stalverk' then
        return json_build_object('ok', false, 'reason', 'verk');
      end if;
      cost := round(((cfg -> 'price' ->> 'storverk')::numeric - (cfg -> 'price' ->> 'stalverk')::numeric) * buy);
      hours := coalesce((cfg ->> 'upg_h')::numeric, 6);
    end if;
  else
    return json_build_object('ok', false, 'reason', 'type');
  end if;

  select balance into bal from public.treasury where user_id = uid for update;
  if cost > coalesce(bal, 0) + sale then
    return json_build_object('ok', false, 'reason', 'kasse', 'balance', coalesce(bal, 0), 'cost', cost);
  end if;

  if sale > 0 then
    update public.konsern
    set plants = (select coalesce(jsonb_agg(p order by i), '[]'::jsonb)
                  from jsonb_array_elements(plants) with ordinality as t(p, i) where (p ->> 'id')::int <> p_plant),
        updated_at = now()
    where user_id = uid;
    insert into public.treasury (user_id, balance, updated_at) values (uid, sale, now())
    on conflict (user_id) do update set balance = public.treasury.balance + sale, updated_at = now();
    insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, sale, 'salg', 'salg:' || p_plant);
  end if;
  if kind = 'bygg' then
    update public.konsern set next_id = next_id + 1, updated_at = now() where user_id = uid;
  end if;

  select coalesce(max(ready_at), now()) into starts
  from public.konsern_orders where user_id = uid and status in ('kø', 'i gang');
  starts := greatest(now(), starts);
  insert into public.konsern_orders (user_id, kind, plant_id, type, name, bought_day, cost, starts_at, ready_at)
  values (uid, kind, pid, typ, pname, s.day, cost, starts, starts + make_interval(secs => hours * 3600))
  returning id into new_id;
  update public.treasury set balance = balance - cost, updated_at = now() where user_id = uid;
  insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, -cost, 'prosjekt', 'prosjekt:' || new_id);
  perform public.konsern_settle(uid, now());
  return json_build_object('ok', true, 'order', new_id, 'cost', cost, 'sale', sale, 'konsern', public.konsern_status(uid));
end;
$$;
revoke execute on function public.konsern_order(text, int, text) from public, anon;
grant execute on function public.konsern_order(text, int, text) to authenticated;

-- Avbestill det siste prosjektet i køen, før det har startet: full refusjon
create or replace function public.konsern_cancel(p_order bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o record;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || uid::text));
  perform public.konsern_settle(uid, now());
  select * into o from public.konsern_orders where id = p_order and user_id = uid;
  if o.id is null or o.status <> 'kø' or o.starts_at <= now()
     or exists (select 1 from public.konsern_orders x where x.user_id = uid and x.status = 'kø'
                and (x.starts_at, x.id) > (o.starts_at, o.id)) then
    return json_build_object('ok', false, 'reason', 'startet');
  end if;
  update public.konsern_orders set status = 'avbestilt' where id = o.id;
  insert into public.treasury (user_id, balance, updated_at) values (uid, o.cost, now())
  on conflict (user_id) do update set balance = public.treasury.balance + o.cost, updated_at = now();
  insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, o.cost, 'prosjekt', 'avbestilt:' || o.id);
  return json_build_object('ok', true, 'refund', o.cost, 'konsern', public.konsern_status(uid));
end;
$$;
revoke execute on function public.konsern_cancel(bigint) from public, anon;
grant execute on function public.konsern_cancel(bigint) to authenticated;

-- Selg et verk som står uten prosjekt og uten noe i køen: 60 % av det det ville kostet å bygge (B-307), til kassa
create or replace function public.konsern_sell(p_plant int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cfg jsonb := public.konsern_cfg();
  k record;
  pl jsonb;
  sale numeric;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || uid::text));
  perform public.konsern_settle(uid, now());
  select * into k from public.konsern where user_id = uid for update;
  select p into pl from jsonb_array_elements(coalesce(k.plants, '[]'::jsonb)) p where (p ->> 'id')::int = p_plant;
  if pl is null or pl ? 'project'
     or exists (select 1 from public.konsern_orders where user_id = uid and status = 'kø' and plant_id = p_plant) then
    return json_build_object('ok', false, 'reason', 'verk');
  end if;
  sale := round((cfg -> 'price' ->> (pl ->> 'type'))::numeric
                * (1 + coalesce((cfg ->> 'mod_share')::numeric, 0.3) * coalesce((pl ->> 'level')::int, 0))
                * coalesce((cfg ->> 'sell_share')::numeric, 0.6));
  update public.konsern
  set plants = (select coalesce(jsonb_agg(p order by i), '[]'::jsonb)
                from jsonb_array_elements(plants) with ordinality as t(p, i) where (p ->> 'id')::int <> p_plant),
      updated_at = now()
  where user_id = uid;
  insert into public.treasury (user_id, balance, updated_at) values (uid, sale, now())
  on conflict (user_id) do update set balance = public.treasury.balance + sale, updated_at = now();
  insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, sale, 'salg', 'salg:' || p_plant);
  return json_build_object('ok', true, 'sale', sale, 'konsern', public.konsern_status(uid));
end;
$$;
revoke execute on function public.konsern_sell(int) from public, anon;
grant execute on function public.konsern_sell(int) to authenticated;

-- Tittelen på topplista (B-325): fra konsernnivået; uten nivå Stålbaron ved sluttmålet (10 mrd.) som før
create or replace function public.title_for(p_user uuid, p_equity numeric)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select public.konsern_cfg() -> 'ladder' -> (greatest(k.level, k.floor) - 1) ->> 'title'
     from public.konsern k where k.user_id = p_user and greatest(k.level, k.floor) > 0),
    case when p_equity >= 10000000000 then 'Stålbaron' end);
$$;
revoke execute on function public.title_for(uuid, numeric) from public, anon, authenticated;

-- Aktivitetskravet (B-327): en aktiv dag er en ekte dag der hovedverket produserte minst 5 % av en normal dag.
-- Fullt i 7 dager etter siste aktive dag, så ned til 50 % ved dag 21 og 0 ved dag 42
update public.config
set value = value || jsonb_build_object('activity', jsonb_build_object(
  'full_days', 7, 'half_days', 21, 'zero_days', 42, 'min_share', 0.05))
where id = 'world' and not (value ? 'activity');

create or replace function public.activity_factor(p_user uuid, p_day date)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a jsonb;
  full_d numeric;
  half_d numeric;
  zero_d numeric;
  min_share numeric;
  rate numeric;
  last_day date;
  since numeric;
begin
  select coalesce(value -> 'activity', '{}'::jsonb) into a from public.config where id = 'world';
  full_d := coalesce((a ->> 'full_days')::numeric, 7);
  half_d := coalesce((a ->> 'half_days')::numeric, 21);
  zero_d := coalesce((a ->> 'zero_days')::numeric, 42);
  min_share := coalesce((a ->> 'min_share')::numeric, 0.05);
  rate := public.meter_normal_rate(p_user);
  select max(day) into last_day from public.production_days
  where user_id = p_user and day <= p_day and gained_t > 0 and gained_t >= min_share * rate;
  if last_day is null then
    return 0;
  end if;
  since := p_day - last_day;
  return case
    when since <= full_d then 1
    when since <= half_d then 1 - 0.5 * (since - full_d) / greatest(1, half_d - full_d)
    when since <= zero_d then 0.5 - 0.5 * (since - half_d) / greatest(1, zero_d - half_d)
    else 0 end;
end;
$$;
revoke execute on function public.activity_factor(uuid, date) from public, anon, authenticated;
