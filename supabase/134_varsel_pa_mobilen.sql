-- B-465: varsel på mobilen (Web Push). Eieren 5.10: «Gå for dine anbefalinger» – varsler om det som skjer i ekte tid
-- mens spilleren er borte: oppkjøpsbud på selskapet (og fristen), overbud, utfallet, anbud som åpner og avgjøres,
-- byggeprosjekter i konsernet som blir ferdige, og nye privatmeldinger.
--
-- * Krever konto (KONTO.md): abonnementet står på serveren og gjelder hendelser mellom spillere. Ikke for gjester.
-- * Ett abonnement per enhet (nettleseren gir `endpoint` og nøklene); spilleren velger temaene per enhet.
-- * Triggerne legger varsler i `push_outbox` bare når mottakeren har et aktivt abonnement på temaet. Et varsel som feiler,
--   stopper aldri spillet (`exception when others`). `ref` er unik, så samme hendelse varsles én gang.
-- * Jobben `push-varsler` (hvert minutt) ser etter ferdige byggeprosjekter og frister, og vekker edge-funksjonen `push`
--   når noe venter. Den henter varslene med `push_claim`, sender dem kryptert og melder tilbake med `push_done`.
-- * VAPID-nøkkelen lages av edge-funksjonen første gang og står bare i Vault (`push_vapid_private`) – aldri i repoet eller
--   i loggen. Den offentlige delen hentes av appen med `push_public_key()`. Adressen til funksjonen står i Vault (`push_url`).
-- * Ingen hemmelige beløp: anbudsbud nevnes ikke for andre enn vinneren; oppkjøpsbudet er offentlig (B-339).
--   Privatmeldinger varsles uten teksten, og ikke fra blokkerte.

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  kinds text[] not null default array['oppkjop', 'anbud', 'konsern', 'melding'],
  active boolean not null default true,
  fails int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id) where active;
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

create table if not exists public.push_outbox (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  ref text not null unique,
  title text not null,
  body text not null,
  link text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  sent int,
  error text
);
create index if not exists push_outbox_waiting on public.push_outbox (id) where sent_at is null;
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon, authenticated;

-- Temaene spilleren kan velge
create or replace function public.push_kinds()
returns text[]
language sql
immutable
set search_path = public
as $$ select array['oppkjop', 'anbud', 'konsern', 'melding'] $$;

-- Den offentlige VAPID-nøkkelen (null til edge-funksjonen har laget den)
create or replace function public.push_public_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_public' limit 1;
$$;
revoke all on function public.push_public_key() from public, anon;
grant execute on function public.push_public_key() to authenticated;

-- Abonner (eller oppdater temaene) for denne enheten. En enhet tilhører kontoen som sist abonnerte på den.
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_kinds text[])
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  k text[];
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if public.user_is_guest(uid) then
    return json_build_object('ok', false, 'reason', 'gjest');
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1000
     or coalesce(length(p_p256dh), 0) not between 80 and 100 or coalesce(length(p_auth), 0) not between 16 and 30 then
    return json_build_object('ok', false, 'reason', 'ugyldig');
  end if;
  select coalesce(array_agg(distinct x order by x), '{}') into k
    from unnest(coalesce(p_kinds, '{}')) x where x = any (public.push_kinds());
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, kinds)
  values (p_endpoint, uid, p_p256dh, p_auth, k)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, kinds = excluded.kinds,
        active = true, fails = 0, updated_at = now();
  -- Høyst 10 enheter per konto: de eldste slås av
  update public.push_subscriptions s set active = false, updated_at = now()
   where s.user_id = uid and s.active
     and s.endpoint not in (select endpoint from public.push_subscriptions
                             where user_id = uid and active order by updated_at desc limit 10);
  return json_build_object('ok', true, 'kinds', k);
end;
$$;
revoke all on function public.push_subscribe(text, text, text, text[]) from public, anon;
grant execute on function public.push_subscribe(text, text, text, text[]) to authenticated;

-- Slå av varsler på denne enheten
create or replace function public.push_unsubscribe(p_endpoint text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  update public.push_subscriptions set active = false, updated_at = now()
   where endpoint = p_endpoint and user_id = uid;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.push_unsubscribe(text) from public, anon;
grant execute on function public.push_unsubscribe(text) to authenticated;

-- Står denne enheten på for kontoen, og med hvilke temaer?
create or replace function public.push_status(p_endpoint text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select json_build_object('active', s.active, 'kinds', s.kinds) from public.push_subscriptions s
      where s.endpoint = p_endpoint and s.user_id = auth.uid()),
    json_build_object('active', false, 'kinds', public.push_kinds()));
$$;
revoke all on function public.push_status(text) from public, anon;
grant execute on function public.push_status(text) to authenticated;

-- Legg et varsel i utboksen – bare når mottakeren har en enhet som vil ha temaet
create or replace function public.push_enqueue(p_user uuid, p_kind text, p_ref text, p_title text, p_body text,
                                               p_link text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then
    return;
  end if;
  if not exists (select 1 from public.push_subscriptions s
                  where s.user_id = p_user and s.active and p_kind = any (s.kinds)) then
    return;
  end if;
  insert into public.push_outbox (user_id, kind, ref, title, body, link)
  values (p_user, p_kind, left(p_ref, 200), left(p_title, 80), left(p_body, 200), p_link)
  on conflict (ref) do nothing;
end;
$$;
revoke all on function public.push_enqueue(uuid, text, text, text, text, text) from public, anon, authenticated;

-- Oppkjøp: budet, overbud og utfallet
create or replace function public.push_on_takeover()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  co text := lower((select name from public.companies where id = new.company_id));
  bidder text := public.chat_nick(new.attacker_id);
begin
  if tg_op = 'INSERT' then
    perform public.push_enqueue(new.owner_id, 'oppkjop', format('oppkjop:%s:bud:%s', new.id, new.bid),
      format('Oppkjøpsbud på %s', co),
      format('%s byr %s. Du kan legge inn motbud til %s.', bidder, public.chat_kr(new.bid), public.chat_when(new.closes_at)),
      'industri');
  elsif new.status = 'åpent' and new.attacker_id is distinct from old.attacker_id then
    perform public.push_enqueue(old.attacker_id, 'oppkjop', format('oppkjop:%s:overbydd:%s', new.id, new.bid),
      format('Du er overbydd på %s', co),
      format('%s byr %s. Du kan by over til %s.', bidder, public.chat_kr(new.bid), public.chat_when(new.closes_at)),
      'industri');
    perform public.push_enqueue(new.owner_id, 'oppkjop', format('oppkjop:%s:bud:%s', new.id, new.bid),
      format('Nytt oppkjøpsbud på %s', co),
      format('%s byr %s. Du kan legge inn motbud til %s.', bidder, public.chat_kr(new.bid), public.chat_when(new.closes_at)),
      'industri');
  elsif new.status is distinct from old.status then
    if new.status = 'overtatt' then
      perform public.push_enqueue(new.attacker_id, 'oppkjop', format('oppkjop:%s:ut', new.id),
        format('Du har kjøpt %s', co), 'Oppkjøpet gikk gjennom. Selskapet er ditt.', 'industri');
      perform public.push_enqueue(new.owner_id, 'oppkjop', format('oppkjop:%s:ut', new.id) || ':eier',
        format('%s er solgt', upper(left(co, 1)) || substr(co, 2)), format('%s kjøpte selskapet. Se oppgjøret under Industrien.', bidder),
        'industri');
    elsif new.status = 'avverget' then
      perform public.push_enqueue(new.owner_id, 'oppkjop', format('oppkjop:%s:ut', new.id) || ':eier',
        format('Du beholder %s', co), format('Motbudet holdt mot %s.', bidder), 'industri');
      perform public.push_enqueue(new.attacker_id, 'oppkjop', format('oppkjop:%s:ut', new.id),
        format('Oppkjøpet av %s gikk ikke gjennom', co), 'Eieren beholder selskapet. Se oppgjøret under Industrien.',
        'industri');
    end if;
  end if;
  return new;
exception when others then
  return new;
end;
$$;
revoke all on function public.push_on_takeover() from public, anon, authenticated;
create or replace trigger push_on_takeover after insert or update of status, attacker_id on public.takeovers
  for each row execute function public.push_on_takeover();

-- Anbud: åpnet (alle som vil ha anbud) og avgjort (de som bød)
create or replace function public.push_on_tender()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  co text := lower((select name from public.companies where id = new.company_id));
  r record;
begin
  if tg_op = 'INSERT' and new.status = 'åpent' then
    for r in select distinct s.user_id from public.push_subscriptions s where s.active and 'anbud' = any (s.kinds) loop
      perform public.push_enqueue(r.user_id, 'anbud', format('anbud:%s:apent:%s', new.id, r.user_id),
        format('Anbudet på %s er åpent', co),
        format('Høyeste bud blir eier i 14 dager. Budene er hemmelige til %s.', public.chat_when(new.closes_at)),
        'industri');
    end loop;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.status = 'avgjort' then
    for r in select distinct b.user_id from public.tender_bids b where b.tender_id = new.id loop
      if r.user_id = new.winner_id then
        perform public.push_enqueue(r.user_id, 'anbud', format('anbud:%s:ut:%s', new.id, r.user_id),
          format('Du vant anbudet på %s', co), 'Selskapet er ditt i 14 dager fra nå.', 'industri');
      else
        perform public.push_enqueue(r.user_id, 'anbud', format('anbud:%s:ut:%s', new.id, r.user_id),
          format('Anbudet på %s er avgjort', co),
          format('%s vant. Neste anbud kommer når konsesjonen går ut.', public.chat_nick(new.winner_id)), 'industri');
      end if;
    end loop;
  end if;
  return new;
exception when others then
  return new;
end;
$$;
revoke all on function public.push_on_tender() from public, anon, authenticated;
create or replace trigger push_on_tender after insert or update of status on public.tenders
  for each row execute function public.push_on_tender();

-- Privatmeldinger: høyst ett varsel per avsender per 10 minutter, aldri fra blokkerte, uten teksten
create or replace function public.push_on_dm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nick text := public.chat_nick(new.sender);
begin
  if coalesce(new.hidden, false) then
    return new;
  end if;
  if exists (select 1 from public.dm_blocks b where b.user_id = new.recipient and b.blocked = new.sender and b.active) then
    return new;
  end if;
  perform public.push_enqueue(new.recipient, 'melding',
    format('dm:%s:%s:%s', new.recipient, new.sender, floor(extract(epoch from new.created_at) / 600)::bigint),
    format('Ny melding fra %s', nick), 'Åpne Skiftrapporten for å lese den.', 'meldinger:' || nick);
  return new;
exception when others then
  return new;
end;
$$;
revoke all on function public.push_on_dm() from public, anon, authenticated;
create or replace trigger push_on_dm after insert on public.dm_messages
  for each row execute function public.push_on_dm();

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
    select o.id, o.user_id, o.kind, o.name from public.konsern_orders o
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

-- Hvert minutt: se etter nye hendelser og vekk edge-funksjonen når noe venter
create or replace function public.push_kick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  url text;
  kick text;
begin
  perform public.push_scan();
  if not exists (select 1 from public.push_outbox where sent_at is null) then
    return;
  end if;
  select decrypted_secret into url from vault.decrypted_secrets where name = 'push_url' limit 1;
  select decrypted_secret into kick from vault.decrypted_secrets where name = 'push_kick_key' limit 1;
  if url is not null and kick is not null then
    perform net.http_post(url := url, body := '{}'::jsonb,
                          headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-key', kick),
                          timeout_milliseconds := 30000);
  end if;
end;
$$;
revoke all on function public.push_kick() from public, anon, authenticated;

-- For edge-funksjonen (service_role): varslene som venter, med enhetene de skal til. Hvert varsel hentes én gang.
-- Varsler eldre enn 6 timer sendes ikke (kom tjenesten tilbake etter en stans, er de ikke nyheter lenger).
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
                     where s.user_id = c.user_id and s.active and c.kind = any (s.kinds)))
           order by c.id), '[]')
    into out from c;
  return out;
end;
$$;
revoke all on function public.push_claim(int) from public, anon, authenticated;
grant execute on function public.push_claim(int) to service_role;

-- For edge-funksjonen: resultatet per enhet. 404/410 = enheten finnes ikke lenger; mange feil på rad slår den av.
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
      update public.push_outbox
         set sent = coalesce(sent, 0) + case when coalesce((r ->> 'status')::int, 0) between 200 and 299 then 1 else 0 end,
             error = coalesce(left(r ->> 'error', 200), error)
       where id = (r ->> 'id')::bigint;
    end if;
  end loop;
end;
$$;
revoke all on function public.push_done(jsonb) from public, anon, authenticated;
grant execute on function public.push_done(jsonb) to service_role;

-- Nøkkelen jobben vekker edge-funksjonen med (funksjonen svarer bare på kall med den)
select vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'push_kick_key',
                           'B-465: nøkkelen push_kick sender til edge-funksjonen push')
 where not exists (select 1 from vault.secrets where name = 'push_kick_key');

-- For edge-funksjonen: VAPID-nøkkelen og vekkenøkkelen fra Vault (VAPID er null til funksjonen har laget den)
create or replace function public.push_vapid()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
           'kickKey', kick,
           'vapid', case when pub is null or priv is null then null
                         else json_build_object('publicKey', pub, 'privateJwk', priv::json,
                                                'subject', 'https://t-event.github.io/Simulator/') end)
    from (select (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_public' limit 1) as pub,
                 (select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_private' limit 1) as priv,
                 (select decrypted_secret from vault.decrypted_secrets where name = 'push_kick_key' limit 1) as kick) k;
$$;
revoke all on function public.push_vapid() from public, anon, authenticated;
grant execute on function public.push_vapid() to service_role;

-- For edge-funksjonen: lagre nøkkelen den laget første gang (bare hvis den ikke finnes – den byttes aldri, ellers
-- slutter alle abonnementer å virke)
create or replace function public.push_vapid_store(p_public text, p_private text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from vault.secrets where name in ('push_vapid_public', 'push_vapid_private')) then
    return false;
  end if;
  perform vault.create_secret(p_private, 'push_vapid_private', 'B-465: VAPID, privat (laget av edge-funksjonen push)');
  perform vault.create_secret(p_public, 'push_vapid_public', 'B-465: VAPID, offentlig');
  return true;
end;
$$;
revoke all on function public.push_vapid_store(text, text) from public, anon, authenticated;
grant execute on function public.push_vapid_store(text, text) to service_role;

select cron.unschedule('push-varsler') where exists (select 1 from cron.job where jobname = 'push-varsler');
select cron.schedule('push-varsler', '* * * * *', $$ select public.push_kick() $$);
