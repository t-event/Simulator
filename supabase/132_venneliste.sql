-- B-462: vennelista (siste punkt i anbefalingen 5.10, eieren: «fortsett»).
--
-- * Enveis, som å følge: spilleren legger til andre med brukernavnet og ser hvordan det går med dem. Den andre får ingen
--   beskjed, så det finnes ingen forespørsler å spamme med.
-- * Lista viser bare det profilene alt viser andre (`player_profile`, B-419): nivå, tittel og sist aktiv i grove trinn –
--   aldri kasse, konsernkassa eller klokkeslett. Sperrede og flaggede vises ikke.
-- * Høyst 100 på lista. Å ta noen av lista setter `active = false` (ingen sletting); å legge dem til igjen slår den på.
-- * Krever konto: gjester slipper ikke gjennom guest_gate (035), og funksjonene sier nei til gjester.

create table if not exists public.follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  follow_id uuid not null references public.profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, follow_id)
);

alter table public.follows enable row level security;
revoke all on public.follows from anon, authenticated;

-- Legg til en spiller på vennelista. Svarer hvorfor ikke når det ikke går
create or replace function public.follow_add(p_nick text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pid uuid;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if public.user_is_guest(uid) then
    return json_build_object('ok', false, 'reason', 'gjest');
  end if;
  select p.id into pid from public.profiles p
   where lower(p.nickname) = lower(trim(coalesce(p_nick, ''))) and not coalesce(p.banned, false) and p.flagged_at is null;
  if pid is null then
    return json_build_object('ok', false, 'reason', 'ukjent');
  end if;
  if pid = uid then
    return json_build_object('ok', false, 'reason', 'egen');
  end if;
  if not exists (select 1 from public.follows f where f.user_id = uid and f.follow_id = pid and f.active)
     and (select count(*) from public.follows f where f.user_id = uid and f.active) >= 100 then
    return json_build_object('ok', false, 'reason', 'fullt');
  end if;
  insert into public.follows (user_id, follow_id) values (uid, pid)
  on conflict (user_id, follow_id) do update set active = true, created_at = now();
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.follow_add(text) from public, anon;
grant execute on function public.follow_add(text) to authenticated;

-- Ta en spiller av vennelista
create or replace function public.follow_remove(p_nick text)
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
  update public.follows f set active = false
   where f.user_id = uid and f.active
     and f.follow_id in (select p.id from public.profiles p where lower(p.nickname) = lower(trim(coalesce(p_nick, ''))));
  return json_build_object('ok', true);
end;
$$;
revoke all on function public.follow_remove(text) from public, anon;
grant execute on function public.follow_remove(text) to authenticated;

-- Vennelista: det profilene alt viser andre, sist aktive først
create or replace function public.follow_list()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := public.world_today();
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  return coalesce((
    select json_agg(x.row order by x.last_day desc nulls last, x.nick)
    from (
      select p.nickname as nick, d.last_day,
        json_build_object(
          'nick', p.nickname,
          'stage', (s.state ->> 'stage')::int,
          'title', public.title_for(p.id, coalesce(r.best_equity, 0)),
          'seen', case
            when d.last_day is null then null
            when d.last_day >= today then 'idag'
            when d.last_day = today - 1 then 'igar'
            when d.last_day > today - 7 then 'uke'
            when d.last_day > today - 30 then 'maned'
            else 'lenge'
          end) as row
      from public.follows f
      join public.profiles p on p.id = f.follow_id and not coalesce(p.banned, false) and p.flagged_at is null
        and p.nickname is not null
      left join public.saves s on s.user_id = p.id
      left join public.records r on r.user_id = p.id
      cross join lateral (select case when s.updated_at is null then null else public.world_day(s.updated_at) end as last_day) d
      where f.user_id = uid and f.active
    ) x), '[]'::json);
end;
$$;
revoke all on function public.follow_list() from public, anon;
grant execute on function public.follow_list() to authenticated;
