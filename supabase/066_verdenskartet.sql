-- Stålverket: verdenskartet (B-333). Kjørt som migrasjonen «verdenskartet».
--
-- En oppdiktet verden med seks regioner (B-331, B-332). Hvert datterverk står i en region (`region` i
-- `konsern.plants`), og hvert strategiske selskap har sin (`companies.region`). Nye verk bygges i regionen spilleren
-- velger (standard: der spilleren har færrest verk); verkene som fantes, er fordelt jevnt. Hvert verk kan flyttes én
-- gang (`konsern_move`). `world_map()` gir kartet: alle spilleres verk per region (kallenavn, tittel, antall per type)
-- og selskapene med eier. Regionen har foreløpig ingen virkning i økonomien; den brukes av Kontroll (K7).
-- Regelen speiles i `frontend/src/game/regions.ts` og `konsernWorld.ts`.

alter table public.konsern_orders add column if not exists region text;
alter table public.companies add column if not exists region text;

create or replace function public.konsern_regions()
returns text[]
language sql
immutable
as $$
  select array['nord', 'jern', 'ost', 'sor', 'vest', 'oy'];
$$;

-- Verkene fra før kartet: jevnt fordelt, i en rekkefølge som er ulik fra spiller til spiller
create or replace function public.konsern_legacy_region(p_user uuid, p_plant int)
returns text
language sql
immutable
as $$
  select (public.konsern_regions())[1 + ((((hashtext(p_user::text)::bigint % 6) + 6) % 6 + p_plant - 1) % 6)];
$$;

-- Regionen der spilleren har færrest verk (også det som står i køen); likt: i rekkefølgen over
create or replace function public.konsern_default_region(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r from unnest(public.konsern_regions()) with ordinality as t(r, i)
  order by (select count(*) from jsonb_array_elements(coalesce((select plants from public.konsern where user_id = p_user),
                                                        '[]'::jsonb)) p where p ->> 'region' = r)
         + (select count(*) from public.konsern_orders o where o.user_id = p_user and o.status = 'kø'
            and o.kind = 'bygg' and o.region = r), i
  limit 1;
$$;
revoke execute on function public.konsern_default_region(uuid) from public, anon, authenticated;

update public.companies set region = case type when 'skraplager' then 'vest' when 'slagg' then 'jern'
                                              when 'verksted' then 'nord' else 'sor' end
where region is null;

-- Verkene som finnes, får en region
update public.konsern k
set plants = (select coalesce(jsonb_agg(case when p ? 'region' then p
                                             else p || jsonb_build_object('region',
                                                  public.konsern_legacy_region(k.user_id, (p ->> 'id')::int)) end
                                        order by i), '[]'::jsonb)
              from jsonb_array_elements(k.plants) with ordinality as t(p, i)),
    updated_at = now()
where exists (select 1 from jsonb_array_elements(k.plants) p where not p ? 'region');

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
    'balance', coalesce((select balance from public.treasury where user_id = p_user), 0))
  from (select 1) x left join public.konsern k on k.user_id = p_user;
$$;

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
          'name', o.name, 'cost', o.cost, 'region', o.region, 'startsAt', round(extract(epoch from o.starts_at) * 1000),
          'readyAt', round(extract(epoch from o.ready_at) * 1000), 'status', o.status) order by o.starts_at, o.id)
        from public.konsern_orders o where o.user_id = p_user and o.status in ('kø', 'i gang')), '[]'::jsonb))
  end
  from (select 1) x left join public.konsern k on k.user_id = p_user;
$$;

-- Samme bestilling som før, med region for nye verk
drop function if exists public.konsern_order(text, int, text);
create or replace function public.konsern_order(p_kind text, p_plant int default null, p_type text default null,
                                                p_region text default null)
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
  v_region text;
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
    -- Komplekset står der verket sto (B-333)
    v_region := coalesce(pl ->> 'region', public.konsern_legacy_region(uid, p_plant));
  elsif kind = 'bygg' then
    typ := p_type;
    v_region := case when p_region = any (public.konsern_regions()) then p_region
                     else public.konsern_default_region(uid) end;
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
  insert into public.konsern_orders (user_id, kind, plant_id, type, name, bought_day, cost, starts_at, ready_at, region)
  values (uid, kind, pid, typ, pname, s.day, cost, starts, starts + make_interval(secs => hours * 3600),
          case when kind = 'bygg' then v_region end)
  returning id into new_id;
  update public.treasury set balance = balance - cost, updated_at = now() where user_id = uid;
  insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, -cost, 'prosjekt', 'prosjekt:' || new_id);
  perform public.konsern_settle(uid, now());
  return json_build_object('ok', true, 'order', new_id, 'cost', cost, 'sale', sale, 'konsern', public.konsern_status(uid));
end;
$$;
revoke execute on function public.konsern_order(text, int, text, text) from public, anon;
grant execute on function public.konsern_order(text, int, text, text) to authenticated;


-- Flytt et verk til en annen region, én gang per verk (også et som bygges eller står i køen)
create or replace function public.konsern_move(p_plant int, p_region text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  k record;
  pl jsonb;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if not (p_region = any (public.konsern_regions())) then
    return json_build_object('ok', false, 'reason', 'type');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || uid::text));
  perform public.konsern_settle(uid, now());
  select * into k from public.konsern where user_id = uid for update;
  select p into pl from jsonb_array_elements(coalesce(k.plants, '[]'::jsonb)) p where (p ->> 'id')::int = p_plant;
  if pl is not null then
    if coalesce((pl ->> 'moved')::boolean, false) then
      return json_build_object('ok', false, 'reason', 'flyttet');
    end if;
    update public.konsern
    set plants = (select jsonb_agg(case when (p ->> 'id')::int = p_plant
                                        then p || jsonb_build_object('region', p_region, 'moved', true) else p end
                                   order by i)
                  from jsonb_array_elements(plants) with ordinality as t(p, i)),
        updated_at = now()
    where user_id = uid;
  elsif exists (select 1 from public.konsern_orders where user_id = uid and status = 'kø' and kind = 'bygg'
                and plant_id = p_plant) then
    -- Står i køen: regionen kan velges fritt til det starter
    update public.konsern_orders set region = p_region
    where user_id = uid and status = 'kø' and kind = 'bygg' and plant_id = p_plant;
  else
    return json_build_object('ok', false, 'reason', 'verk');
  end if;
  return json_build_object('ok', true, 'konsern', public.konsern_status(uid));
end;
$$;
revoke execute on function public.konsern_move(int, text) from public, anon;
grant execute on function public.konsern_move(int, text) to authenticated;

-- Kartet: alle spilleres verk per region og selskapene. Bare det topplista alt viser (kallenavn og tittel), og ingen
-- sperrede kontoer. Spillere uten kallenavn vises som «Ukjent».
create or replace function public.world_map()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  return json_build_object(
    'regions', (select json_agg(json_build_object(
        'id', r,
        'players', coalesce((
          select json_agg(json_build_object(
                   'nick', coalesce(pr.nickname, 'Ukjent'), 'title', public.title_for(k.user_id, 0),
                   'mine', k.user_id = uid, 'stalverk', x.stalverk, 'storverk', x.storverk, 'kompleks', x.kompleks,
                   'building', x.building)
                 order by (k.user_id = uid) desc, x.kompleks desc, x.storverk desc, x.stalverk desc, lower(pr.nickname))
          from public.konsern k
          join public.profiles pr on pr.id = k.user_id
          cross join lateral (
            select count(*) filter (where p ->> 'type' = 'stalverk') as stalverk,
                   count(*) filter (where p ->> 'type' = 'storverk') as storverk,
                   count(*) filter (where p ->> 'type' = 'kompleks') as kompleks,
                   count(*) filter (where p -> 'project' ->> 'kind' = 'bygg') as building
            from jsonb_array_elements(k.plants) p where p ->> 'region' = r) x
          where x.stalverk + x.storverk + x.kompleks > 0 and pr.flagged_at is null and not coalesce(pr.banned, false)),
          '[]'::json),
        'companies', coalesce((
          select json_agg(json_build_object('id', c.id, 'type', c.type, 'name', c.name,
                   'owner', (select nickname from public.profiles where id = c.owner_id), 'mine', c.owner_id = uid)
                 order by c.id)
          from public.companies c where c.active and c.region = r), '[]'::json))
      order by i) from unnest(public.konsern_regions()) with ordinality as t(r, i)));
end;
$$;
revoke execute on function public.world_map() from public, anon;
grant execute on function public.world_map() to authenticated;

-- Rådene i Supabase (migrasjonen «verdenskartet_search_path»)
alter function public.konsern_regions() set search_path = public;
alter function public.konsern_legacy_region(uuid, int) set search_path = public;
