-- B-466: «Send et prøvevarsel» (eieren 5.10: «Fortsett», etter varsel på mobilen B-465). Spilleren kan se med én gang
-- om varslene kommer fram på telefonen, uten å vente på et bud eller en melding. Høyst ett prøvevarsel per 10 minutter
-- per konto (unik `ref`), bare til enheter som står på. Jobben push-varsler sender det innen et minutt.

create or replace function public.push_test()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  n int;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  select count(*) into n from public.push_subscriptions s where s.user_id = uid and s.active;
  if n = 0 then
    return json_build_object('ok', false, 'reason', 'av');
  end if;
  insert into public.push_outbox (user_id, kind, ref, title, body, link)
  values (uid, 'test', format('test:%s:%s', uid, floor(extract(epoch from now()) / 600)::bigint),
          'Varslene virker', 'Slik ser et varsel fra Stålverket ut. Trykk for å åpne spillet.', null)
  on conflict (ref) do nothing;
  if not found then
    return json_build_object('ok', false, 'reason', 'nylig');
  end if;
  return json_build_object('ok', true, 'devices', n);
end;
$$;
revoke all on function public.push_test() from public, anon;
grant execute on function public.push_test() to authenticated;

-- Prøvevarselet går til alle enhetene som står på, uansett tema
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
  with c as (
    update public.push_outbox o set sent_at = now()
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
