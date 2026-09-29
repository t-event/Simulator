-- Stålverket: vernet mot klokkejuks (B-314) godtar lang spilling uten nett (B-315).
--
-- guard_projects satte tilbake et nytt verk uten byggeprosjekt og trinn som kom uten prosjekt. Men en spiller som
-- spiller uten nett i mange timer, kan lovlig kjøpe et verk og se det ferdig bygget før neste lagring når serveren.
-- Nå får funksjonen tidspunktet for forrige lagring (saves.updated_at, serverens klokke) og godtar:
--   - et nytt verk uten prosjekt når det har gått minst byggetida (2/6/12 t) siden forrige lagring;
--   - et trinn eller en utbygging uten prosjekt når det har gått minst 4 t per nytt trinn (6 t for utbygging),
--     ett prosjekt om gangen (B-311).
-- Et prosjekt serveren alt kjenner (readyAt i forrige lagring), sjekkes som før mot serverens klokke. Uten
-- tidspunkt (p_last null) er regelen streng som i 057.

create or replace function public.guard_projects(old_state jsonb, new_state jsonb, p_now timestamptz default now(),
  p_last timestamptz default null)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  now_ms numeric := extract(epoch from p_now) * 1000;
  -- Ekte tid siden forrige lagring på serveren; 0 = ingen slakk
  elapsed_ms numeric := case when p_last is null then 0 else greatest(0, extract(epoch from (p_now - p_last)) * 1000) end;
  grace_ms numeric := 60000;
  hour_ms numeric := 3600000;
  build_h jsonb := '{"stalverk": 2, "storverk": 6, "kompleks": 12}'::jsonb;
  y jsonb;
  x jsonb;
  xp jsonb;
  yp jsonb;
  fixed jsonb;
  plants jsonb := '[]'::jsonb;
  changed boolean := false;
  notes jsonb := '[]'::jsonb;
  x_level int;
  x_type text;
  y_level int;
  y_type text;
  allowed_level int;
  allowed_type text;
  need_ms numeric;
  dur numeric;
begin
  if new_state is null or new_state -> 'konsern' -> 'plants' is null then
    return null;
  end if;
  for y in select * from jsonb_array_elements(new_state -> 'konsern' -> 'plants') loop
    fixed := y;
    x := null;
    select p into x from jsonb_array_elements(coalesce(old_state -> 'konsern' -> 'plants', '[]'::jsonb)) p
      where p ->> 'id' = y ->> 'id' limit 1;
    yp := case when y ? 'project' then y -> 'project' else null end;
    y_level := coalesce((y ->> 'level')::int, 0);
    y_type := y ->> 'type';
    if x is null then
      -- Nytt verk: må bygges, med mindre det alt har et byggeprosjekt eller byggetida kan ha gått uten nett
      need_ms := coalesce((build_h ->> y_type)::numeric, 6) * hour_ms;
      if (yp is null or yp ->> 'kind' <> 'bygg') and (elapsed_ms + grace_ms < need_ms or y_level > 0) then
        fixed := (y - 'project') || jsonb_build_object('level', 0, 'project', jsonb_build_object('kind', 'bygg',
          'startedAt', now_ms, 'readyAt', now_ms + need_ms));
        changed := true;
        notes := notes || jsonb_build_object('id', y -> 'id', 'why', 'nytt verk uten bygging', 'type', y_type, 'level', y_level);
      end if;
    else
      xp := case when x ? 'project' then x -> 'project' else null end;
      x_level := coalesce((x ->> 'level')::int, 0);
      x_type := x ->> 'type';
      allowed_level := x_level;
      allowed_type := x_type;
      if xp is not null and (xp ->> 'readyAt')::numeric <= now_ms + grace_ms then
        if xp ->> 'kind' = 'modernisering' then allowed_level := x_level + 1; end if;
        if xp ->> 'kind' = 'utbygging' then allowed_type := 'storverk'; allowed_level := 0; end if;
      end if;
      if xp is not null and (xp ->> 'readyAt')::numeric > now_ms + grace_ms
         and (yp is null or yp ->> 'kind' <> xp ->> 'kind' or (yp ->> 'readyAt')::numeric <> (xp ->> 'readyAt')::numeric) then
        -- 1. Et prosjekt serveren kjenner, er ikke ferdig ennå: tilbake slik det var
        fixed := (y - 'project') || jsonb_build_object('level', x_level, 'type', x_type, 'project', xp);
        changed := true;
        notes := notes || jsonb_build_object('id', y -> 'id', 'why', 'prosjekt avsluttet for tidlig', 'kind', xp ->> 'kind',
          'readyAt', xp ->> 'readyAt');
      elsif y_level > allowed_level or (y_type = 'storverk' and allowed_type = 'stalverk') then
        -- 2. Trinn eller type uten prosjekt: godtatt hvis tida kan ha gått uten nett, ellers tilbake og start nå
        need_ms := (case when y_type = 'storverk' and allowed_type = 'stalverk' then 6 * hour_ms + y_level * 4 * hour_ms
                         else (y_level - allowed_level) * 4 * hour_ms end);
        if elapsed_ms + grace_ms < need_ms then
          if y_type = 'storverk' and allowed_type = 'stalverk' then
            fixed := (y - 'project') || jsonb_build_object('level', 0, 'type', 'stalverk', 'project',
              jsonb_build_object('kind', 'utbygging', 'startedAt', now_ms, 'readyAt', now_ms + 6 * hour_ms));
          else
            fixed := (y - 'project') || jsonb_build_object('level', allowed_level, 'type', allowed_type, 'project',
              jsonb_build_object('kind', 'modernisering', 'startedAt', now_ms, 'readyAt', now_ms + 4 * hour_ms));
          end if;
          changed := true;
          notes := notes || jsonb_build_object('id', y -> 'id', 'why', 'trinn/type uten prosjekt', 'from', allowed_level,
            'to', y_level, 'type', y_type);
        end if;
      elsif yp is not null and (yp ->> 'startedAt')::numeric > now_ms + 5 * 60000 then
        -- 4. Prosjektet «startet» i framtida: starter nå, like lenge
        dur := greatest(0, (yp ->> 'readyAt')::numeric - (yp ->> 'startedAt')::numeric);
        fixed := y || jsonb_build_object('project', yp || jsonb_build_object('startedAt', now_ms, 'readyAt', now_ms + dur));
        changed := true;
        notes := notes || jsonb_build_object('id', y -> 'id', 'why', 'prosjekt startet i framtida', 'startedAt', yp ->> 'startedAt');
      end if;
    end if;
    plants := plants || fixed;
  end loop;
  if not changed then
    return null;
  end if;
  return jsonb_set(
    jsonb_set(new_state, '{konsern,plants}', plants),
    '{serverEdit}', to_jsonb(coalesce((new_state ->> 'serverEdit')::int, 0) + 1))
    || jsonb_build_object('projectGuard', notes);
end;
$$;
revoke execute on function public.guard_projects(jsonb, jsonb, timestamptz, timestamptz) from public, anon, authenticated;
drop function if exists public.guard_projects(jsonb, jsonb, timestamptz);

create or replace function public.save_game(p_state jsonb, p_minute integer, p_day integer, p_client_version text,
  p_season_id integer, p_device text, p_base_rev bigint)
 returns bigint
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  r bigint;
  old_state jsonb;
  old_at timestamptz;
  fixed jsonb;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  perform public.touch_activity();
  select state, updated_at into old_state, old_at from public.saves where user_id = uid and rev = p_base_rev;
  if old_state is not null then
    -- Byggetida i konsernet går etter serverens klokke (B-314), med slakk for spilling uten nett (B-315)
    fixed := public.guard_projects(old_state, p_state, now(), old_at);
    if fixed is not null then
      update public.saves
      set state = fixed, minute = p_minute, day = p_day, client_version = p_client_version,
          season_id = p_season_id, device = 'server'
      where user_id = uid and rev = p_base_rev
        and coalesce((p_state->>'serverEdit')::int, 0) >= coalesce((state->>'serverEdit')::int, 0);
      insert into public.project_guard_log (user_id, detail)
      values (uid, jsonb_build_object('notes', fixed -> 'projectGuard', 'client_version', p_client_version,
                                      'device', p_device, 'since_last_min', round(extract(epoch from (now() - old_at)) / 60)));
      return null;
    end if;
  end if;
  update public.saves
  set state = p_state, minute = p_minute, day = p_day, client_version = p_client_version,
      season_id = p_season_id, device = p_device
  where user_id = uid and rev = p_base_rev
    and coalesce((p_state->>'serverEdit')::int, 0) >= coalesce((state->>'serverEdit')::int, 0)
  returning rev into r;
  if r is not null then
    return r;
  end if;
  if exists (select 1 from public.saves where user_id = uid) then
    return null;
  end if;
  insert into public.saves (user_id, state, minute, day, client_version, season_id, device)
  values (uid, p_state, p_minute, p_day, p_client_version, p_season_id, p_device)
  returning rev into r;
  return r;
end;
$function$;

revoke execute on function public.save_game(jsonb, int, int, text, int, text, bigint) from public, anon;
grant execute on function public.save_game(jsonb, int, int, text, int, text, bigint) to authenticated;
