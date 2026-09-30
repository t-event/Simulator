-- B-383: historisk tittel og mekanisk opptjent nivå skilles (eieren: «Ingenting tas bort; nye kjøp, komplekser og
-- modernisering følger opptjent nivå»).
--
-- `konsern.level` er fortsatt tittelen: greatest(level, floor, stigen) – en skralle som tar med gulvet fra økonomi-
-- reformen (B-326). Den står på topplista og i legends i spillet, og gir titler, pynt og stormodellene hjemme.
-- `konsern.earned` (ny) er nivået verkene faktisk har gitt: det høyeste stigen (konsern_ladder_level) har stått på,
-- uten gulvet. Det avgjør nå hvor mange verk man kan ha, hvor høyt man kan modernisere og om man kan bygge
-- stålkomplekser (konsern_order). Det går aldri ned (selger man verk, beholdes det).
--
-- Ingenting tas bort: verkene man har, trinnene de står på, og bestillinger som alt er betalt, blir stående og fullføres.
-- Bytte til stålkompleks («bytt») legger ikke til et verk, så det sperres ikke av plasser – bare av nivå 2.
-- Dry-run 30.9.2026 i docs/STABILISERING.md (avsnitt 9) og B-383.

alter table public.konsern add column if not exists earned int not null default 0;

update public.konsern
set earned = greatest(earned, public.konsern_ladder_level(plants, public.konsern_cfg() -> 'ladder'));

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
  ern int;
  ladder int;
begin
  select * into k from public.konsern where user_id = p_user;
  if not found then
    return;
  end if;
  ladder := public.konsern_ladder_level(k.plants, public.konsern_cfg() -> 'ladder');
  if not exists (select 1 from public.konsern_orders
                 where user_id = p_user
                   and ((status = 'kø' and starts_at <= p_now) or (status in ('kø', 'i gang') and ready_at <= p_now)))
     and not exists (select 1 from jsonb_array_elements(k.plants) p
                     where p ? 'project' and (p -> 'project' ->> 'readyAt')::numeric <= now_ms)
     and greatest(k.level, k.floor, ladder) = k.level
     and greatest(k.earned, ladder) = k.earned then
    return;
  end if;
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
          'region', coalesce(o.region, public.konsern_legacy_region(p_user, o.plant_id)),
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
      select coalesce(jsonb_agg(case when (p ->> 'id')::int = o.plant_id and p ? 'project'
                                     then public.konsern_after(p, p -> 'project' ->> 'kind') else p end
                                order by i), '[]'::jsonb)
        into v_plants from jsonb_array_elements(v_plants) with ordinality as t(p, i);
      update public.konsern_orders set status = 'ferdig' where id = o.id;
    end if;
  end loop;
  select coalesce(jsonb_agg(case when p ? 'project' and (p -> 'project' ->> 'readyAt')::numeric <= now_ms
                                 then public.konsern_after(p, p -> 'project' ->> 'kind') else p end order by i), '[]'::jsonb)
    into v_plants from jsonb_array_elements(v_plants) with ordinality as t(p, i);
  ladder := public.konsern_ladder_level(v_plants, public.konsern_cfg() -> 'ladder');
  lvl := greatest(k.level, k.floor, ladder);
  ern := greatest(k.earned, ladder);
  if v_plants is distinct from k.plants or lvl <> k.level or ern <> k.earned then
    update public.konsern set plants = v_plants, level = lvl, earned = ern, updated_at = now() where user_id = p_user;
  end if;
end;
$$;

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
    'earned', coalesce(k.earned, 0),
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
    'policy', coalesce(k.policy, 'ut'),
    'policy_at', case when k.policy_at is null then null else round(extract(epoch from k.policy_at) * 1000) end,
    'fund', coalesce(k.fund, 0))
  from (select 1) x left join public.konsern k on k.user_id = p_user;
$$;

-- Spillet får det opptjente nivået som `konsern.earned` (legends er fortsatt tittelen)
create or replace function public.konsern_into_state(p_user uuid, p_state jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when k.user_id is null or p_state -> 'konsern' is null or jsonb_typeof(p_state -> 'konsern') <> 'object'
    then p_state
    else jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(p_state,
      '{konsern,plants}', coalesce((
        select jsonb_agg(p || jsonb_build_object('downUntilDay', greatest(coalesce((p ->> 'downUntilDay')::int, 0),
          coalesce((select (x ->> 'downUntilDay')::int from jsonb_array_elements(coalesce(p_state -> 'konsern' -> 'plants', '[]'::jsonb)) x
                    where x ->> 'id' = p ->> 'id' limit 1), 0))) order by i)
        from jsonb_array_elements(k.plants) with ordinality as t(p, i)), '[]'::jsonb)),
      '{konsern,legends}', to_jsonb(greatest(k.level, k.floor))),
      '{konsern,earned}', to_jsonb(k.earned)),
      '{konsern,nextId}', to_jsonb(greatest(k.next_id, coalesce((p_state -> 'konsern' ->> 'nextId')::int, 1)))),
      '{konsern,orders}', coalesce((
        select jsonb_agg(jsonb_build_object('id', o.id, 'kind', o.kind, 'plantId', o.plant_id, 'type', o.type,
          'name', o.name, 'cost', o.cost, 'region', o.region, 'startsAt', round(extract(epoch from o.starts_at) * 1000),
          'readyAt', round(extract(epoch from o.ready_at) * 1000), 'status', o.status) order by o.starts_at, o.id)
        from public.konsern_orders o where o.user_id = p_user and o.status in ('kø', 'i gang')), '[]'::jsonb))
  end
  from (select 1) x left join public.konsern k on k.user_id = p_user;
$$;

-- Kjøp følger opptjent nivå, ikke tittelen
do $$
declare
  def text := pg_get_functiondef('public.konsern_order(text, int, text, text)'::regprocedure);
  old_lvl text := E'  lvl := greatest(k.level, k.floor);';
  new_lvl text := E'  -- B-383: opptjent nivå (verkene), ikke tittelen med gulvet\n'
    || E'  lvl := greatest(k.earned, public.konsern_ladder_level(k.plants, cfg -> ''ladder''));';
  old_slots text := E'    if jsonb_array_length(planned) >= public.konsern_slots(lvl, big) then';
  new_slots text := E'    if p_kind <> ''bytt'' and jsonb_array_length(planned) >= public.konsern_slots(lvl, big) then';
begin
  if position(old_lvl in def) = 0 or position(old_slots in def) = 0 then
    raise exception 'konsern_order har endret seg – sjekk før endringen';
  end if;
  def := replace(def, old_lvl, new_lvl);
  def := replace(def, old_slots, new_slots);
  execute def;
end;
$$;
