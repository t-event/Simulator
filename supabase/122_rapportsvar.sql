-- B-438: svar på rapporter – eieren kan spørre den som rapporterte (eller den som skrev meldingen) før et valg tas, og
-- begge får varsel.
--
-- Eierens beskjed 2.10.2026: «Her må jeg kunne svare på rapporten slik at jeg kan finne ut av problemet før et valg
-- tas. Man bør også få varsel på om noen har sendt rapport til meg. Og de bør få varsel om jeg svarer.»
--
-- * report_messages: én samtale per rapport og spiller (`player`). Eieren skriver (`from_admin`), spilleren svarer.
--   Spilleren kan bare svare når eieren har skrevet til hen i den rapporten – ingen kan starte en samtale med eieren
--   her. Grenser: høyst 500 tegn, ingen lenker (samme filter som dm_send, B-428), ikke oftere enn hvert 3. sekund og
--   høyst 20 svar per ekte dag.
-- * Varsel: report_unread() gir spilleren antall uleste svar fra eieren, og eieren antall nye rapporter (siden
--   adminpanelet sist ble åpnet, admins.reports_seen_at) og uleste svar fra spillere. Appen legger det på prikken ved
--   Skiftrapporten.
-- * Spilleren ser bare sine egne samtaler (my_report_threads): meldingen det gjelder, eierens meldinger og egne svar –
--   aldri hvem som rapporterte.
-- Alt er tatt fra anon og public; gjester slipper ikke gjennom guest_gate (035).

create table if not exists public.report_messages (
  id bigserial primary key,
  report_id bigint not null references public.reports (id) on delete cascade,
  player uuid not null references auth.users (id) on delete cascade,
  from_admin boolean not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists report_messages_player on public.report_messages (player, created_at);
create index if not exists report_messages_report on public.report_messages (report_id, created_at);
alter table public.report_messages enable row level security;
revoke all on public.report_messages from anon, authenticated;
revoke all on sequence public.report_messages_id_seq from anon, authenticated;

alter table public.admins add column if not exists reports_seen_at timestamptz;

-- Eieren skriver til den som rapporterte (p_to = 'reporter') eller den som skrev meldingen ('author')
create or replace function public.admin_report_send(p_report bigint, p_to text, p_body text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.reports;
  who uuid;
  msg text := btrim(coalesce(p_body, ''));
  new_id bigint;
begin
  if not public.is_admin() then
    raise exception 'ikke tilgang';
  end if;
  select * into r from public.reports where id = p_report;
  if not found then
    return json_build_object('ok', false, 'reason', 'rapport');
  end if;
  who := case p_to when 'reporter' then r.reporter when 'author' then r.author end;
  if who is null or who = uid then
    return json_build_object('ok', false, 'reason', 'mottaker');
  end if;
  if msg = '' then
    return json_build_object('ok', false, 'reason', 'tom');
  end if;
  if char_length(msg) > 500 then
    return json_build_object('ok', false, 'reason', 'lang');
  end if;
  insert into public.report_messages (report_id, player, from_admin, body) values (r.id, who, true, msg)
  returning id into new_id;
  insert into public.admin_log (admin, action, target, report_id, note)
  values (uid, 'svar', who, r.id, p_to);
  return json_build_object('ok', true, 'id', new_id);
end;
$$;
revoke all on function public.admin_report_send(bigint, text, text) from public, anon;
grant execute on function public.admin_report_send(bigint, text, text) to authenticated;

-- Spilleren svarer i en samtale eieren har startet
create or replace function public.report_reply(p_report bigint, p_body text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  msg text := btrim(coalesce(p_body, ''));
  new_id bigint;
begin
  if uid is null or public.user_is_guest(uid) then
    raise exception 'ikke logget inn';
  end if;
  perform pg_advisory_xact_lock(hashtext('report_reply'), hashtext(uid::text));
  if not exists (select 1 from public.report_messages
                  where report_id = p_report and player = uid and from_admin) then
    return json_build_object('ok', false, 'reason', 'stengt');
  end if;
  if msg = '' then
    return json_build_object('ok', false, 'reason', 'tom');
  end if;
  if char_length(msg) > 500 then
    return json_build_object('ok', false, 'reason', 'lang');
  end if;
  if msg ~* '(https?://|www\.|[a-z0-9-]+\.(com|no|net|org|io|gg|ly|me|app|dev|xyz)\y)' then
    return json_build_object('ok', false, 'reason', 'lenke');
  end if;
  if exists (select 1 from public.report_messages
              where player = uid and not from_admin and created_at > now() - interval '3 seconds')
     or (select count(*) from public.report_messages
          where player = uid and not from_admin and created_at > now() - interval '1 day') >= 20 then
    return json_build_object('ok', false, 'reason', 'tempo');
  end if;
  insert into public.report_messages (report_id, player, from_admin, body) values (p_report, uid, false, msg)
  returning id into new_id;
  return json_build_object('ok', true, 'id', new_id);
end;
$$;
revoke all on function public.report_reply(bigint, text) from public, anon;
grant execute on function public.report_reply(bigint, text) to authenticated;

-- Spillerens samtaler med eieren (nyeste først), uten hvem som rapporterte
create or replace function public.my_report_threads()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(t order by t.last_at desc), '[]'::json)
  from (
    select r.id as "reportId",
           case when r.reporter = auth.uid() then 'reporter' else 'author' end as role,
           r.body as body,
           r.kind as kind,
           r.status as status,
           max(m.created_at) as last_at,
           count(*) filter (where m.from_admin and m.read_at is null) as unread,
           json_agg(json_build_object('fromAdmin', m.from_admin, 'body', m.body, 'at', m.created_at)
                    order by m.created_at) as messages
      from public.report_messages m
      join public.reports r on r.id = m.report_id
     where m.player = auth.uid()
     group by r.id
     order by max(m.created_at) desc
     limit 20
  ) t;
$$;
revoke all on function public.my_report_threads() from public, anon;
grant execute on function public.my_report_threads() to authenticated;

-- Spilleren har lest eierens meldinger i en rapport
create or replace function public.report_seen(p_report bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.report_messages set read_at = now()
   where report_id = p_report and player = auth.uid() and from_admin and read_at is null;
$$;
revoke all on function public.report_seen(bigint) from public, anon;
grant execute on function public.report_seen(bigint) to authenticated;

-- Varselet: uleste svar fra eieren, og for eieren nye rapporter og uleste svar fra spillere
create or replace function public.report_unread()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'mine', (select count(*) from public.report_messages
              where player = auth.uid() and from_admin and read_at is null),
    'admin', case when public.is_admin() then
      (select count(*) from public.reports r
        where r.status = 'open'
          and r.reported_at > coalesce((select reports_seen_at from public.admins where user_id = auth.uid()),
                                       '-infinity'::timestamptz))
      + (select count(*) from public.report_messages where not from_admin and read_at is null)
    else 0 end);
$$;
revoke all on function public.report_unread() from public, anon;
grant execute on function public.report_unread() to authenticated;

-- Eieren har åpnet adminpanelet: nye rapporter og svar fra spillere er sett
create or replace function public.admin_reports_seen()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'ikke tilgang';
  end if;
  update public.admins set reports_seen_at = now() where user_id = auth.uid();
  update public.report_messages set read_at = now() where not from_admin and read_at is null;
end;
$$;
revoke all on function public.admin_reports_seen() from public, anon;
grant execute on function public.admin_reports_seen() to authenticated;

-- Adminpanelet: som før, og samtalene på rapporten (alle som har rapportert samme melding) og om det er nye svar
create or replace function public.admin_reports(p_status text default 'open')
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'ikke tilgang';
  end if;
  return json_build_object(
    'reports', coalesce((
      select json_agg(json_build_object(
               'id', r.id, 'kind', r.kind, 'body', r.body, 'author', coalesce(p.nickname, r.author_nick),
               'reporter', coalesce(q.nickname, r.reporter_nick), 'reason', r.reason, 'sentAt', r.sent_at,
               'reportedAt', r.reported_at, 'status', r.status, 'authorBanned', coalesce(p.banned, false),
               'count', (select count(*) from public.reports z where z.kind = r.kind and z.message_id = r.message_id),
               'canReporter', r.reporter is not null, 'canAuthor', r.author is not null,
               'unread', (select count(*) from public.report_messages m join public.reports z on z.id = m.report_id
                           where z.kind = r.kind and z.message_id = r.message_id
                             and not m.from_admin and m.read_at is null),
               'thread', coalesce((
                 select json_agg(json_build_object(
                          'fromAdmin', m.from_admin, 'body', m.body, 'at', m.created_at,
                          'role', case when m.player = z.reporter then 'reporter' else 'author' end,
                          'nick', coalesce(w.nickname, ''))
                        order by m.created_at)
                   from public.report_messages m
                   join public.reports z on z.id = m.report_id
                   left join public.profiles w on w.id = m.player
                  where z.kind = r.kind and z.message_id = r.message_id), '[]'::json))
             order by r.reported_at desc)
      from (select * from (select distinct on (kind, message_id) * from public.reports
                             where (p_status = 'alle' or status = p_status)
                             order by kind, message_id, reported_at desc) d
             order by reported_at desc limit 100) r
      left join public.profiles p on p.id = r.author
      left join public.profiles q on q.id = r.reporter), '[]'::json),
    'banned', coalesce((select json_agg(nickname order by lower(nickname)) from public.profiles
                         where banned and nickname is not null), '[]'::json));
end;
$$;
revoke all on function public.admin_reports(text) from public, anon;
grant execute on function public.admin_reports(text) to authenticated;
