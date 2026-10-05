-- B-468: navnet på verket i varselet om ferdige byggeprosjekter (eieren 5.10: «Fiks»). Ved modernisering og utbygging
-- står navnet ikke i bestillingen (`konsern_orders.name` er tom), så varselet sa bare «Verket er modernisert». Nå hentes
-- navnet fra verket i konsernet (`konsern.plants`, samme id som `plant_id`). Ellers som i 134.

-- Det som skjer når tida går: byggeprosjekter som er ferdige, og fristen for et oppkjøpsbud
create or replace function public.push_scan()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select o.id, o.user_id, o.kind,
           coalesce(o.name, (select p ->> 'name' from public.konsern k, jsonb_array_elements(k.plants) p
                              where k.user_id = o.user_id and (p ->> 'id') = o.plant_id::text limit 1)) as name
      from public.konsern_orders o
     where o.status in ('kø', 'i gang') and o.ready_at <= now() and o.ready_at > now() - interval '2 hours'
       and exists (select 1 from public.push_subscriptions s where s.user_id = o.user_id and s.active
                     and 'konsern' = any (s.kinds))
  loop
    perform public.push_enqueue(r.user_id, 'konsern', format('bygg:%s', r.id),
      case r.kind when 'bygg' then format('%s er ferdig bygget', coalesce(r.name, 'Det nye verket'))
                  when 'modernisering' then format('%s er modernisert', coalesce(r.name, 'Verket'))
                  else format('%s er bygget ut', coalesce(r.name, 'Verket')) end,
      case when exists (select 1 from public.konsern_orders q where q.user_id = r.user_id and q.status in ('kø', 'i gang')
                          and q.ready_at > now())
           then 'Neste prosjekt i køen er i gang.'
           else 'Køen er tom. Åpne Konsern for å bestille det neste.' end,
      'konsern');
    n := n + 1;
  end loop;
  for r in
    select t.id, t.owner_id, t.closes_at, lower(c.name) as co from public.takeovers t
      join public.companies c on c.id = t.company_id
     where t.status = 'åpent' and t.closes_at > now() and t.closes_at <= now() + interval '6 hours'
  loop
    perform public.push_enqueue(r.owner_id, 'oppkjop', format('oppkjop:%s:frist', r.id),
      format('Snart avgjort: oppkjøpsbudet på %s', r.co),
      format('Avgjøres %s. Legg inn motbud før det hvis du vil beholde selskapet.', public.chat_when(r.closes_at)),
      'industri');
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.push_scan() from public, anon, authenticated;
