-- B-353: konsern_settle låser raden i konsern bare når det er noe å gjøre.
-- Før tok den `for update` hver gang – også fra save_game, som holdt låsen til hele lagringen var ferdig. Da ventet
-- Industrien, kartet og topplista (world_status, world_map, konsern-kallene) på samme rad, og med en treg disk ble det
-- tidsavbrudd etter 8 s. Nå sjekkes det først uten lås om et prosjekt skal starte eller er ferdig, eller om nivået endres;
-- er svaret nei (nesten alltid), returnerer den med én gang. Selve arbeidet er uendret.
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
  -- Uten lås: er det noe å gjøre?
  select * into k from public.konsern where user_id = p_user;
  if not found then
    return;
  end if;
  if not exists (select 1 from public.konsern_orders
                 where user_id = p_user
                   and ((status = 'kø' and starts_at <= p_now) or (status in ('kø', 'i gang') and ready_at <= p_now)))
     and not exists (select 1 from jsonb_array_elements(k.plants) p
                     where p ? 'project' and (p -> 'project' ->> 'readyAt')::numeric <= now_ms)
     and greatest(k.level, k.floor, public.konsern_ladder_level(k.plants, public.konsern_cfg() -> 'ladder')) = k.level then
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
  lvl := greatest(k.level, k.floor, public.konsern_ladder_level(v_plants, public.konsern_cfg() -> 'ladder'));
  if v_plants is distinct from k.plants or lvl <> k.level then
    update public.konsern set plants = v_plants, level = lvl, updated_at = now() where user_id = p_user;
  end if;
end;
$$;
