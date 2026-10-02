-- B-420: Profiler, fase 2 – Min profil. En kort tekst, ett profilmerke (pynt spilleren eier), tre prestasjoner spilleren
-- velger å vise, og bryteren for privatmeldinger (brukes i fase 3, av som standard).
--
-- Alt endres bare gjennom profile_update (security definer): profiles har ingen update-regel for spillerne, og teksten
-- sjekkes som i Skiftrapporten (070): lengde, ingen lenker, sperrede kontoer kan ikke endre, tempo. Merket og
-- prestasjonene må finnes i det lagrede spillet. Gjester har ingen profil å endre (står ikke i guest_gate).

alter table public.profiles
  add column if not exists bio text,
  add column if not exists emblem text,
  add column if not exists showcase text[] not null default '{}',
  add column if not exists dm_open boolean not null default false,
  add column if not exists profile_at timestamptz;

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
     set bio = b, emblem = e, showcase = sc, dm_open = coalesce(p_dm_open, false), profile_at = now()
   where id = uid;
  return json_build_object('ok', true, 'bio', b, 'emblem', e, 'showcase', to_json(sc), 'dm_open', coalesce(p_dm_open, false));
end;
$$;

revoke all on function public.profile_update(text, text, text[], boolean) from public, anon;
grant execute on function public.profile_update(text, text, text[], boolean) to authenticated;

-- Profilen viser teksten, merket, prestasjonene og om spilleren tar imot meldinger
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
    'dm', pr.dm_open,
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
