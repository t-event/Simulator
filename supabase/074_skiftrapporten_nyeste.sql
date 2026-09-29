-- B-348: «nyeste melding» (prikken på knappen) teller bare meldinger lista viser. chat_list tar ikke med spillere uten
-- kallenavn; chat_latest gjorde det, så prikken kunne stå uten at noe nytt var å se.
create or replace function public.chat_latest()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(c.id), 0)
  from public.chat_messages c left join public.profiles p on p.id = c.user_id
  where auth.uid() is not null and not c.hidden
    and (c.kind = 'hendelse' or (not p.banned and p.nickname is not null))
    and c.created_at > now() - interval '30 days';
$$;
revoke execute on function public.chat_latest() from public, anon;
grant execute on function public.chat_latest() to authenticated;
