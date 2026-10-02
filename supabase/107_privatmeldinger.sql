-- B-421: Profiler, fase 3 – privatmeldinger med blokkering og rapportering, og adminpanelet for eieren.
--
-- Reglene (docs/PROFIL-FORSLAG.md, eierens svar 2.10.2026):
-- * Av som standard: man kan bare sende til en som har slått meldingene på (profiles.dm_open), og må ha slått dem på
--   selv. Mottakeren som har stengt eller blokkert, gir samme svar («stengt») – den blokkerte ser ikke at hen er blokkert.
-- * Bare kontoer som har spilt litt: brukernavn, ikke gjest, ikke sperret eller flagget, og storverk i eget verk eller
--   minst 3 ekte aktive dager (activity_days).
-- * Grenser her på serveren: høyst 500 tegn, ingen lenker, ikke oftere enn hvert 3. sekund og høyst 20 på 10 minutter,
--   høyst 5 nye samtaler per ekte dag (svar i en samtale som finnes, teller ikke).
-- * Rapporter lagrer en kopi av meldingen (også fra Skiftrapporten). Meldinger eldre enn 30 dager slettes hver natt
--   (dm_cleanup, pg_cron «meldinger-rydding»); rapportene står til eieren har behandlet dem.
-- * Adminpanelet: tabellen admins. Alle adminfunksjoner sjekker auth.uid() mot den først. Eieren legges inn for hånd
--   (ikke i repoet). Hver handling logges i admin_log.
-- Alt her er tatt fra anon og public. Gjester slipper ikke gjennom guest_gate (035).

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

create table if not exists public.dm_threads (
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  started_by uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
create index if not exists dm_threads_started on public.dm_threads (started_by, started_at);

create table if not exists public.dm_messages (
  id bigserial primary key,
  sender uuid not null references auth.users (id) on delete cascade,
  recipient uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  hidden boolean not null default false
);
create index if not exists dm_messages_recipient on public.dm_messages (recipient, created_at);
create index if not exists dm_messages_sender on public.dm_messages (sender, created_at);

create table if not exists public.dm_blocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (user_id, blocked)
);
-- Blokkeringen slås av og på (raden blir stående), så ingen funksjon her trenger å slette noe
alter table public.dm_blocks add column if not exists active boolean not null default true;

create table if not exists public.reports (
  id bigserial primary key,
  kind text not null check (kind in ('dm', 'chat')),
  message_id bigint not null,
  reporter uuid references auth.users (id) on delete set null,
  author uuid references auth.users (id) on delete set null,
  author_nick text,
  reporter_nick text,
  body text not null,
  sent_at timestamptz,
  reason text,
  reported_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'hidden', 'dismissed', 'banned')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  unique (kind, message_id, reporter)
);
create index if not exists reports_open on public.reports (status, reported_at);

create table if not exists public.admin_log (
  id bigserial primary key,
  admin uuid references auth.users (id) on delete set null,
  action text not null,
  target uuid,
  report_id bigint,
  note text,
  at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;
alter table public.dm_blocks enable row level security;
alter table public.reports enable row level security;
alter table public.admin_log enable row level security;
revoke all on public.admins, public.dm_threads, public.dm_messages, public.dm_blocks, public.reports, public.admin_log
  from anon, authenticated;

-- Kan kontoen bruke privatmeldinger? (uten å se på bryteren)
create or replace function public.dm_eligible(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user is not null
     and not public.user_is_guest(p_user)
     and exists (select 1 from public.profiles p
                  where p.id = p_user and p.nickname is not null and not coalesce(p.banned, false) and p.flagged_at is null)
     and (coalesce((select (s.state ->> 'stage')::int from public.saves s where s.user_id = p_user), 0) >= 4
          or (select count(*) from public.activity_days d where d.user_id = p_user) >= 3);
$$;
revoke all on function public.dm_eligible(uuid) from public, anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Har «by» blokkert «who»?
create or replace function public.dm_blocked(p_by uuid, p_who uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.dm_blocks where user_id = p_by and blocked = p_who and active);
$$;
revoke all on function public.dm_blocked(uuid, uuid) from public, anon, authenticated;

create or replace function public.dm_send(p_to text, p_body text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rid uuid;
  msg text := btrim(coalesce(p_body, ''));
  x uuid;
  y uuid;
  new_id bigint;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if not public.dm_eligible(uid) then
    return json_build_object('ok', false, 'reason', 'ikke_klar');
  end if;
  if not coalesce((select dm_open from public.profiles where id = uid), false) then
    return json_build_object('ok', false, 'reason', 'egen_av');
  end if;
  select id into rid from public.profiles where lower(nickname) = lower(btrim(coalesce(p_to, '')));
  if rid is null or rid = uid then
    return json_build_object('ok', false, 'reason', 'stengt');
  end if;
  if not public.dm_eligible(rid)
     or not coalesce((select dm_open from public.profiles where id = rid), false)
     or public.dm_blocked(rid, uid) then
    return json_build_object('ok', false, 'reason', 'stengt');
  end if;
  if msg = '' then
    return json_build_object('ok', false, 'reason', 'tom');
  end if;
  if char_length(msg) > 500 then
    return json_build_object('ok', false, 'reason', 'lang');
  end if;
  if msg ~* '(https?://|www\.|[a-z0-9-]+\.(com|no|net|org|io|gg|ly|me|app|dev|xyz)\b)' then
    return json_build_object('ok', false, 'reason', 'lenke');
  end if;
  if exists (select 1 from public.dm_messages where sender = uid and created_at > now() - interval '3 seconds')
     or (select count(*) from public.dm_messages where sender = uid and created_at > now() - interval '10 minutes') >= 20 then
    return json_build_object('ok', false, 'reason', 'tempo');
  end if;
  x := least(uid, rid);
  y := greatest(uid, rid);
  -- Ny samtale: ingen tråd, eller ingen meldinger mellom dem de siste 30 dagene (tråden ryddes da bort om natta)
  if not exists (select 1 from public.dm_threads where a = x and b = y) then
    if (select count(*) from public.dm_threads
         where started_by = uid and public.world_day(started_at) = public.world_today()) >= 5 then
      return json_build_object('ok', false, 'reason', 'nye');
    end if;
    insert into public.dm_threads (a, b, started_by) values (x, y, uid) on conflict do nothing;
  end if;
  insert into public.dm_messages (sender, recipient, body) values (uid, rid, msg) returning id into new_id;
  return json_build_object('ok', true, 'id', new_id);
end;
$$;
revoke all on function public.dm_send(text, text) from public, anon;
grant execute on function public.dm_send(text, text) to authenticated;

-- Oversikten: egen status og samtalene, nyeste først
create or replace function public.dm_overview()
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
    'eligible', public.dm_eligible(uid),
    'open', coalesce((select dm_open from public.profiles where id = uid), false),
    'blocked', coalesce((select json_agg(p.nickname order by lower(p.nickname))
                           from public.dm_blocks k join public.profiles p on p.id = k.blocked
                          where k.user_id = uid and k.active and p.nickname is not null), '[]'::json),
    'threads', coalesce((
      select json_agg(json_build_object('nick', t.nick, 'last', t.body, 'at', t.created_at, 'mine', t.sender = uid,
                                        'unread', t.unread) order by t.created_at desc)
      from (
        select distinct on (other) other, pr.nickname as nick, m.body, m.created_at, m.sender,
               (select count(*) from public.dm_messages u
                 where u.recipient = uid and u.sender = other and u.read_at is null and not u.hidden) as unread
        from (select m.*, case when m.sender = uid then m.recipient else m.sender end as other
                from public.dm_messages m
               where (m.sender = uid or m.recipient = uid) and not m.hidden
                 and m.created_at > now() - interval '30 days'
                 and not (m.recipient = uid and public.dm_blocked(uid, m.sender))) m
        join public.profiles pr on pr.id = m.other
        where pr.nickname is not null
        order by other, m.created_at desc
      ) t), '[]'::json));
end;
$$;
revoke all on function public.dm_overview() from public, anon;
grant execute on function public.dm_overview() to authenticated;

-- Samtalen med én spiller (de siste 30 dagene). Merker det som er kommet til meg som lest
create or replace function public.dm_thread(p_with text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  oid uuid;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  select id into oid from public.profiles where lower(nickname) = lower(btrim(coalesce(p_with, '')));
  if oid is null then
    return json_build_object('nick', null, 'messages', '[]'::json);
  end if;
  update public.dm_messages set read_at = now()
   where recipient = uid and sender = oid and read_at is null;
  return json_build_object(
    'nick', (select nickname from public.profiles where id = oid),
    'canSend', public.dm_eligible(uid) and coalesce((select dm_open from public.profiles where id = uid), false)
               and public.dm_eligible(oid) and coalesce((select dm_open from public.profiles where id = oid), false)
               and not public.dm_blocked(oid, uid) and not public.dm_blocked(uid, oid),
    'blocked', public.dm_blocked(uid, oid),
    'messages', coalesce((
      select json_agg(json_build_object('id', m.id, 'mine', m.sender = uid, 'body', m.body, 'at', m.created_at)
                      order by m.created_at, m.id)
      from (select * from public.dm_messages m
             where ((m.sender = uid and m.recipient = oid) or (m.sender = oid and m.recipient = uid))
               and not m.hidden and m.created_at > now() - interval '30 days'
               and not (m.sender = oid and public.dm_blocked(uid, oid))
             order by m.created_at desc limit 200) m), '[]'::json));
end;
$$;
revoke all on function public.dm_thread(text) from public, anon;
grant execute on function public.dm_thread(text) to authenticated;

-- Uleste meldinger til prikken på knappen
create or replace function public.dm_unread()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.dm_messages m
   where m.recipient = auth.uid() and m.read_at is null and not m.hidden
     and m.created_at > now() - interval '30 days'
     and not public.dm_blocked(auth.uid(), m.sender);
$$;
revoke all on function public.dm_unread() from public, anon;
grant execute on function public.dm_unread() to authenticated;

create or replace function public.dm_block(p_nick text, p_on boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  oid uuid;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  select id into oid from public.profiles where lower(nickname) = lower(btrim(coalesce(p_nick, '')));
  if oid is null or oid = uid then
    return json_build_object('ok', false);
  end if;
  insert into public.dm_blocks (user_id, blocked, active, at) values (uid, oid, coalesce(p_on, false), now())
  on conflict (user_id, blocked) do update set active = excluded.active, at = excluded.at;
  return json_build_object('ok', true, 'blocked', p_on);
end;
$$;
revoke all on function public.dm_block(text, boolean) from public, anon;
grant execute on function public.dm_block(text, boolean) to authenticated;

-- Rapporter en privatmelding (bare mottakeren) eller en melding i Skiftrapporten (ikke sin egen, ikke hendelser)
create or replace function public.message_report(p_kind text, p_id bigint, p_reason text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  au uuid;
  bd text;
  st timestamptz;
  r text := left(nullif(btrim(coalesce(p_reason, '')), ''), 200);
begin
  if uid is null or public.user_is_guest(uid) then
    raise exception 'ikke logget inn';
  end if;
  if p_kind = 'dm' then
    select sender, body, created_at into au, bd, st from public.dm_messages where id = p_id and recipient = uid;
  elsif p_kind = 'chat' then
    select user_id, body, created_at into au, bd, st from public.chat_messages
     where id = p_id and user_id is not null and user_id <> uid and coalesce(kind, 'melding') <> 'hendelse';
  end if;
  if au is null then
    return json_build_object('ok', false);
  end if;
  if (select count(*) from public.reports where reporter = uid and reported_at > now() - interval '1 day') >= 20 then
    return json_build_object('ok', false, 'reason', 'tempo');
  end if;
  insert into public.reports (kind, message_id, reporter, author, author_nick, reporter_nick, body, sent_at, reason)
  values (p_kind, p_id, uid, au, (select nickname from public.profiles where id = au),
          (select nickname from public.profiles where id = uid), bd, st, r)
  on conflict (kind, message_id, reporter) do nothing;
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.message_report(text, bigint, text) from public, anon;
grant execute on function public.message_report(text, bigint, text) to authenticated;

-- Adminpanelet: rapportene (åpne først) og sperrede kontoer
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
               'count', (select count(*) from public.reports z where z.kind = r.kind and z.message_id = r.message_id))
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

-- Handling på en rapport: skjul meldingen, avvis rapporten eller sperr forfatteren (skjuler også meldingen)
create or replace function public.admin_act(p_report bigint, p_action text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.reports;
  st text;
begin
  if not public.is_admin() then
    raise exception 'ikke tilgang';
  end if;
  select * into r from public.reports where id = p_report;
  if not found or p_action not in ('hide', 'dismiss', 'ban') then
    return json_build_object('ok', false);
  end if;
  if p_action in ('hide', 'ban') then
    if r.kind = 'dm' then
      update public.dm_messages set hidden = true where id = r.message_id;
    else
      update public.chat_messages set hidden = true where id = r.message_id;
    end if;
  end if;
  if p_action = 'ban' and r.author is not null then
    update public.profiles set banned = true where id = r.author;
  end if;
  st := case p_action when 'hide' then 'hidden' when 'ban' then 'banned' else 'dismissed' end;
  update public.reports set status = st, handled_by = uid, handled_at = now()
   where kind = r.kind and message_id = r.message_id and status = 'open';
  insert into public.admin_log (admin, action, target, report_id) values (uid, p_action, r.author, r.id);
  return json_build_object('ok', true, 'status', st);
end;
$$;
revoke all on function public.admin_act(bigint, text) from public, anon;
grant execute on function public.admin_act(bigint, text) to authenticated;

create or replace function public.admin_unban(p_nick text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  oid uuid;
begin
  if not public.is_admin() then
    raise exception 'ikke tilgang';
  end if;
  select id into oid from public.profiles where lower(nickname) = lower(btrim(coalesce(p_nick, '')));
  if oid is null then
    return json_build_object('ok', false);
  end if;
  update public.profiles set banned = false where id = oid;
  insert into public.admin_log (admin, action, target) values (uid, 'unban', oid);
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.admin_unban(text) from public, anon;
grant execute on function public.admin_unban(text) to authenticated;

-- Ryddingen hver natt (meldinger eldre enn 30 dager, tråder uten meldinger) står i utkast/108_meldinger_rydding.sql. Den
-- legges inn når eieren kan bekrefte den i Supabase-connectoren (den sletter). Til da viser ingen funksjon her meldinger
-- eldre enn 30 dager.
