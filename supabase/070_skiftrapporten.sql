-- B-338: Skiftrapporten – én felles chat for alle spillere med konto.
-- Meldingene ligger i `chat_messages` og nås bare gjennom funksjonene under (RLS uten policyer). Gjester slipper ikke til
-- (de står ikke i `guest_gate`), og sperrede kontoer (juksesperren eller `banned`) kan lese, men ikke skrive.
-- Grenser: 1–300 tegn, én melding per 5 sekunder og høyst 20 per 10 minutter, ikke samme tekst to ganger på 2 minutter,
-- ingen lenker. Meldinger eldre enn 30 dager ryddes bort når noen skriver. Egne meldinger kan slettes; eieren av spillet
-- skjuler andres med `update public.chat_messages set hidden = true where id = …`.

create table if not exists public.chat_messages (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create index if not exists chat_messages_user_at on public.chat_messages (user_id, created_at desc);
alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from anon, authenticated;

-- Skriv en melding. Svarer {ok, id} eller {ok: false, reason}
create or replace function public.chat_send(p_body text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b text;
  nick text;
  new_id bigint;
begin
  if uid is null or public.is_guest() then
    return json_build_object('ok', false, 'reason', 'konto');
  end if;
  select nickname into nick from public.profiles where id = uid;
  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  if nick is null then
    return json_build_object('ok', false, 'reason', 'navn');
  end if;
  -- Kontrolltegn bort, mellomrom samlet
  b := btrim(regexp_replace(regexp_replace(coalesce(p_body, ''), '[[:cntrl:]]', ' ', 'g'), '\s+', ' ', 'g'));
  if char_length(b) = 0 then
    return json_build_object('ok', false, 'reason', 'tom');
  end if;
  if char_length(b) > 300 then
    return json_build_object('ok', false, 'reason', 'lang');
  end if;
  if b ~* '(https?://|www\.|[a-z0-9-]+\.(com|no|net|org|io|gg|ly|me|app|dev|xyz)\b)' then
    return json_build_object('ok', false, 'reason', 'lenke');
  end if;
  if exists (select 1 from public.chat_messages where user_id = uid and created_at > now() - interval '5 seconds')
     or (select count(*) from public.chat_messages where user_id = uid and created_at > now() - interval '10 minutes') >= 20
  then
    return json_build_object('ok', false, 'reason', 'fort');
  end if;
  if exists (select 1 from public.chat_messages
             where user_id = uid and lower(body) = lower(b) and created_at > now() - interval '2 minutes') then
    return json_build_object('ok', false, 'reason', 'likt');
  end if;
  insert into public.chat_messages (user_id, body) values (uid, b) returning id into new_id;
  delete from public.chat_messages where created_at < now() - interval '30 days';
  return json_build_object('ok', true, 'id', new_id);
end;
$$;

-- Meldingene: de siste (p_after = 0) eller de nyere enn p_after, eldst først. Høyst 100
create or replace function public.chat_list(p_after bigint default 0, p_limit int default 60)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(json_build_object('id', m.id, 'nick', m.nickname, 'mine', m.user_id = auth.uid(),
                                             'body', m.body, 'at', round(extract(epoch from m.created_at) * 1000))
                           order by m.id), '[]'::json)
  from (
    select c.id, c.user_id, c.body, c.created_at, p.nickname
    from public.chat_messages c join public.profiles p on p.id = c.user_id
    where auth.uid() is not null and not c.hidden and not p.banned and p.nickname is not null
      and c.id > greatest(0, coalesce(p_after, 0))
      and c.created_at > now() - interval '30 days'
    order by c.id desc
    limit least(100, greatest(1, coalesce(p_limit, 60)))
  ) m;
$$;

-- Nyeste synlige melding (for prikken på knappen), uten innholdet
create or replace function public.chat_latest()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(c.id), 0)
  from public.chat_messages c join public.profiles p on p.id = c.user_id
  where auth.uid() is not null and not c.hidden and not p.banned and c.created_at > now() - interval '30 days';
$$;

-- Slett en egen melding
create or replace function public.chat_delete(p_id bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'reason', 'konto');
  end if;
  update public.chat_messages set hidden = true where id = p_id and user_id = auth.uid();
  return json_build_object('ok', found);
end;
$$;

revoke execute on function public.chat_send(text) from public, anon;
revoke execute on function public.chat_list(bigint, int) from public, anon;
revoke execute on function public.chat_latest() from public, anon;
revoke execute on function public.chat_delete(bigint) from public, anon;
grant execute on function public.chat_send(text) to authenticated;
grant execute on function public.chat_list(bigint, int) to authenticated;
grant execute on function public.chat_latest() to authenticated;
grant execute on function public.chat_delete(bigint) to authenticated;
