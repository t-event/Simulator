-- B-472: varslene til mobilen tåler midlertidige feil, og ferdige byggeprosjekter varsles uansett hvem som fullførte
-- dem (gjennomgangen 7.10).
--
-- * Et varsel merkes som hentet før det sendes. Kom det ikke fram til noen enhet fordi nettet eller tjenesten hos
--   Apple/Google svarte med en midlertidig feil (ingen svar, 408, 429, 5xx), legges det tilbake i køen (`retry` fra
--   edge-funksjonen) og prøves igjen ved neste vekking – høyst 5 ganger, og aldri etter 6 timer. Et varsel som ble hentet,
--   men aldri meldt tilbake (funksjonen stoppet underveis), prøves også igjen etter 10 minutter.
-- * Byggevarselet: målejobben eller en lagring kan fullføre prosjektet (`status = 'ferdig'`) før varseljobben ser det.
--   Søket tar nå med ferdige prosjekter fra de siste 2 timene; `ref` (bygg:<id>) gjør at det aldri varsles to ganger.

alter table public.push_outbox add column if not exists attempts int not null default 0;

create or replace function public.push_claim(p_limit int default 100)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  out json;
begin
  update public.push_outbox set sent_at = now(), sent = 0, error = 'for gammelt'
   where sent_at is null and created_at < now() - interval '6 hours';
  -- Hentet, men aldri meldt tilbake: prøves igjen, høyst 5 ganger
  update public.push_outbox
     set sent_at = case when attempts < 5 then null else sent_at end,
         sent = case when attempts < 5 then null else 0 end,
         error = case when attempts < 5 then null else 'ikke meldt tilbake' end
   where sent_at is not null and sent is null and error is null and sent_at < now() - interval '10 minutes';
  with c as (
    update public.push_outbox o set sent_at = now(), attempts = o.attempts + 1
     where o.id in (select id from public.push_outbox where sent_at is null order by id limit greatest(1, p_limit)
                    for update skip locked)
    returning o.*
  )
  select coalesce(json_agg(json_build_object(
           'id', c.id, 'kind', c.kind, 'title', c.title, 'body', c.body, 'link', c.link, 'ref', c.ref,
           'subs', (select coalesce(json_agg(json_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth)), '[]')
                      from public.push_subscriptions s
                     where s.user_id = c.user_id and s.active and (c.kind = 'test' or c.kind = any (s.kinds))))
           order by c.id), '[]')
    into out from c;
  return out;
end;
$$;
revoke all on function public.push_claim(int) from public, anon, authenticated;
grant execute on function public.push_claim(int) to service_role;

create or replace function public.push_done(p_results jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  for r in select * from jsonb_array_elements(coalesce(p_results, '[]')) loop
    if (r ->> 'endpoint') is not null then
      if coalesce((r ->> 'gone')::boolean, false) then
        update public.push_subscriptions set active = false, updated_at = now() where endpoint = r ->> 'endpoint';
      elsif coalesce((r ->> 'status')::int, 0) between 200 and 299 then
        update public.push_subscriptions set fails = 0, last_ok_at = now() where endpoint = r ->> 'endpoint';
      else
        update public.push_subscriptions set fails = fails + 1, active = active and fails + 1 < 10
         where endpoint = r ->> 'endpoint';
      end if;
    end if;
    if (r ->> 'id') is not null then
      if coalesce((r ->> 'retry')::boolean, false) and coalesce((r ->> 'status')::int, 0) = 0 then
        -- Kom ikke fram til noen enhet, og bare midlertidige feil: tilbake i køen (høyst 5 forsøk)
        update public.push_outbox
           set sent_at = case when attempts < 5 then null else sent_at end,
               sent = case when attempts < 5 then null else 0 end,
               error = case when attempts < 5 then null else coalesce(left(r ->> 'error', 200), error) end
         where id = (r ->> 'id')::bigint;
      else
        update public.push_outbox
           set sent = coalesce(sent, 0) + case when coalesce((r ->> 'status')::int, 0) between 200 and 299 then 1 else 0 end,
               error = coalesce(left(r ->> 'error', 200), error)
         where id = (r ->> 'id')::bigint;
      end if;
    end if;
  end loop;
end;
$$;
revoke all on function public.push_done(jsonb) from public, anon, authenticated;
grant execute on function public.push_done(jsonb) to service_role;

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
     where o.status in ('kø', 'i gang', 'ferdig') and o.ready_at <= now() and o.ready_at > now() - interval '2 hours'
       and exists (select 1 from public.push_subscriptions s where s.user_id = o.user_id and s.active
                     and 'konsern' = any (s.kinds))
       and not exists (select 1 from public.push_outbox x where x.ref = format('bygg:%s', o.id))
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
