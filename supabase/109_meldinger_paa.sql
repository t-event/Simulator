-- B-422: Privatmeldinger er på for alle (eierens beskjed 2.10.2026: «Meldinger skal være på for alle. De må skru av om de
-- ikke vil ha»). Erstatter «av som standard» i B-419/B-421.
--
-- Ny kolonne dm_off (standard false = på). Den gamle dm_open leses ikke lenger: den var false for alle som ikke hadde
-- valgt noe, så å snu den ville skrudd av den ene som hadde slått meldingene på. Ingen rader endres.
-- Kravet om å ha spilt litt (storverk eller 3 ekte aktive dager) og alle grensene står som før.

alter table public.profiles add column if not exists dm_off boolean not null default false;
comment on column public.profiles.dm_open is 'Ikke i bruk fra B-422 (erstattet av dm_off).';

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
  if not coalesce((select not dm_off from public.profiles where id = uid), false) then
    return json_build_object('ok', false, 'reason', 'egen_av');
  end if;
  select id into rid from public.profiles where lower(nickname) = lower(btrim(coalesce(p_to, '')));
  if rid is null or rid = uid then
    return json_build_object('ok', false, 'reason', 'stengt');
  end if;
  if not public.dm_eligible(rid)
     or not coalesce((select not dm_off from public.profiles where id = rid), false)
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
    'open', coalesce((select not dm_off from public.profiles where id = uid), false),
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
    'canSend', public.dm_eligible(uid) and coalesce((select not dm_off from public.profiles where id = uid), false)
               and public.dm_eligible(oid) and coalesce((select not dm_off from public.profiles where id = oid), false)
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

create or replace function public.profile_update(p_bio text, p_emblem text, p_showcase text[], p_dm_open boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b text := nullif(btrim(regexp_replace(coalesce(p_bio, ''), '\s+', ' ', 'g')), '');
  e text := nullif(btrim(coalesce(p_emblem, '')), '');
  sc text[];
  st jsonb;
  last_at timestamptz;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if public.user_is_guest(uid) then
    return json_build_object('ok', false, 'reason', 'gjest');
  end if;
  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  select profile_at into last_at from public.profiles where id = uid;
  if last_at is not null and last_at > now() - interval '5 seconds' then
    return json_build_object('ok', false, 'reason', 'tempo');
  end if;
  if b is not null and char_length(b) > 120 then
    return json_build_object('ok', false, 'reason', 'lang');
  end if;
  if b ~* '(https?://|www\.|[a-z0-9-]+\.(com|no|net|org|io|gg|ly|me|app|dev|xyz)\b)' then
    return json_build_object('ok', false, 'reason', 'lenke');
  end if;

  select state into st from public.saves where user_id = uid;
  -- Merket må være pynt spilleren eier
  if e is not null and not coalesce((st -> 'cosmetics' -> 'owned') ? e, false) then
    e := null;
  end if;
  -- Høyst tre prestasjoner, unike, og bare de spilleren har
  select coalesce(array_agg(x order by o), '{}') into sc
  from (
    select x, min(o) as o
    from unnest(coalesce(p_showcase, '{}')) with ordinality as t(x, o)
    where x is not null and coalesce(st -> 'achievements', '{}'::jsonb) ? x
    group by x
    order by min(o)
    limit 3
  ) y;

  update public.profiles
     set bio = b, emblem = e, showcase = sc, dm_off = not coalesce(p_dm_open, true), profile_at = now()
   where id = uid;
  return json_build_object('ok', true, 'bio', b, 'emblem', e, 'showcase', to_json(sc), 'dm_open', coalesce(p_dm_open, true));
end;
$$;

revoke all on function public.profile_update(text, text, text[], boolean) from public, anon;
grant execute on function public.profile_update(text, text, text[], boolean) to authenticated;

create or replace function public.player_profile(p_nick text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
  pr public.profiles;
  rec public.records;
  sv_stage int;
  sv_at timestamptz;
  unlocked boolean;
  last_day date;
  today date := public.world_today();
  seen text;
  k_rank int;
  k_value numeric;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  select * into pr from public.profiles
   where lower(nickname) = lower(trim(coalesce(p_nick, ''))) and not coalesce(banned, false) and flagged_at is null;
  if not found then
    return null;
  end if;
  pid := pr.id;
  select * into rec from public.records where user_id = pid;
  select (s.state ->> 'stage')::int, s.updated_at, coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
    into sv_stage, sv_at, unlocked
    from public.saves s where s.user_id = pid;

  -- Sist aktiv i grove trinn (ekte dager i norsk tid, B-369) – aldri klokkeslett
  last_day := case when sv_at is null then null else public.world_day(sv_at) end;
  seen := case
    when last_day is null then null
    when last_day >= today then 'idag'
    when last_day = today - 1 then 'igar'
    when last_day > today - 7 then 'uke'
    when last_day > today - 30 then 'maned'
    else 'lenge'
  end;

  -- Plass og verdi på lista «Konsernverdi» – samme regel som topplista (063, 104)
  if coalesce(sv_stage, 0) >= 4 and unlocked then
    select l.plass, l.value into k_rank, k_value from public.leaderboard('konsern', 1000) l where l.nickname = pr.nickname;
  end if;

  return json_build_object(
    'nick', pr.nickname,
    'me', pid = uid,
    'bio', pr.bio,
    'emblem', pr.emblem,
    'showcase', to_json(pr.showcase),
    'dm', not pr.dm_off,
    'since', to_char(pr.created_at at time zone 'Europe/Oslo', 'YYYY-MM-DD'),
    'seen', seen,
    'stage', sv_stage,
    'title', public.title_for(pid, coalesce(rec.best_equity, 0)),
    'league', public.league_of(rec.best_stage, rec.best_equity),
    'badges', public.badges_of(pid),
    'konsern', case when k_value is null then null else json_build_object(
      'rank', k_rank,
      'value', k_value,
      'earned', (select k.earned from public.konsern k where k.user_id = pid),
      'plants', coalesce((
        select json_agg(json_build_object(
                 'name', p ->> 'name', 'type', p ->> 'type', 'region', p ->> 'region', 'level', (p ->> 'level')::int,
                 'building', coalesce(p -> 'project' ->> 'kind' = 'bygg', false))
               order by (p ->> 'id')::int)
        from public.konsern k cross join lateral jsonb_array_elements(k.plants) p
        where k.user_id = pid), '[]'::json)) end,
    'companies', coalesce((
      select json_agg(json_build_object('name', c.name, 'type', c.type, 'region', c.region) order by c.id)
      from public.companies c where c.active and c.owner_id = pid), '[]'::json),
    'seasons', coalesce((
      select json_agg(json_build_object('name', se.name, 'plass', sr.plass) order by se.ends_at desc nulls last)
      from public.season_results sr join public.seasons se on se.id = sr.season_id
      where sr.user_id = pid), '[]'::json),
    'records', json_build_object(
      'storverkDay', rec.storverk_day,
      'ferdigDay', rec.ferdig_day,
      'control', rec.best_control)
  );
end;
$$;

revoke all on function public.player_profile(text) from public, anon;
grant execute on function public.player_profile(text) to authenticated;
