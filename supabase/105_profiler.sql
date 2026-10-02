-- B-419: Profiler, fase 1 – profilarket som åpnes når man trykker på et kallenavn.
--
-- Bare det serveren alt vet og viser andre steder (topplista, verdenskartet, Industrien, sesongresultatene), samlet på
-- ett sted. Aldri konsernkassa, kassa i eget verk, fondet eller e-post. «Sist aktiv» gis bare i grove trinn.
-- Krever konto: tatt fra anon og public, og gjester slipper ikke gjennom guest_gate (035).
-- Spillere som er flagget eller sperret, har ingen profil (som på topplista).

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
