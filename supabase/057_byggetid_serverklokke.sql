-- Stålverket: byggetida i konsernet går etter serverens klokke (B-314).
--
-- Prosjektene i konsernet (bygging, utbygging, modernisering) gikk etter telefonens klokke (realNow = Date.now()).
-- Én spiller stilte klokka fram og fikk 17 moderniseringstrinn (4 timer hver) på to timer. Appen henter nå serverens
-- klokke fra svarene (Date-headeren) og bruker den, men appen kan ikke stoles på. Derfor sjekker save_game() hvert
-- lagret spill mot det forrige med serverens klokke:
--   1. Et prosjekt som ikke kan være ferdig ennå (readyAt > now), men er borte eller byttet ut: settes tilbake, med
--      typen og trinnet verket hadde.
--   2. Et verk som har fått høyere trinn eller er blitt storverk uten prosjekt: trinnet/typen settes tilbake, og
--      prosjektet startes nå (4 t modernisering, 6 t utbygging) – spilleren betalte, så jobben gjøres, men på ekte tid.
--   3. Et nytt verk uten prosjekt: bygges nå (2/6/12 timer etter type), trinn 0.
--   4. Et nytt prosjekt som «startet» i framtida (klokka fram): startes nå, med samme varighet.
-- Rettes noe, lagres den rettede tilstanden med device 'server' og serverEdit + 1 (B-211), og save_game gir null, så
-- appen henter serverens spill (pullIfNewer). Alt logges i project_guard_log. Ærlige spillere merker ingenting:
-- prosjektene deres er ferdige når serveren også mener det.

create table if not exists public.project_guard_log (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now(),
  detail jsonb not null
);
alter table public.project_guard_log enable row level security;
revoke all on public.project_guard_log from anon, authenticated;

-- Ren regel: gir den rettede tilstanden, eller null når alt er i orden. Kan testes med select.
create or replace function public.guard_projects(old_state jsonb, new_state jsonb, p_now timestamptz default now())
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  now_ms numeric := extract(epoch from p_now) * 1000;
  grace_ms numeric := 60000;            -- ett minutt slingringsmonn for klokkene
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
  dur numeric;
begin
  if new_state is null or new_state -> 'konsern' -> 'plants' is null then
    return null;
  end if;
  for y in select * from jsonb_array_elements(new_state -> 'konsern' -> 'plants') loop
    fixed := y;
    select p into x from jsonb_array_elements(coalesce(old_state -> 'konsern' -> 'plants', '[]'::jsonb)) p
      where p ->> 'id' = y ->> 'id' limit 1;
    yp := case when y ? 'project' then y -> 'project' else null end;
    y_level := coalesce((y ->> 'level')::int, 0);
    y_type := y ->> 'type';
    if x is null then
      -- Nytt verk: må bygges (trinn 0), med mindre det alt har et byggeprosjekt
      if yp is null or yp ->> 'kind' <> 'bygg' then
        fixed := (y - 'project') || jsonb_build_object('level', 0, 'project', jsonb_build_object('kind', 'bygg',
          'startedAt', now_ms, 'readyAt', now_ms + coalesce((build_h ->> y_type)::numeric, 6) * hour_ms));
        changed := true;
        notes := notes || jsonb_build_object('id', y -> 'id', 'why', 'nytt verk uten bygging', 'type', y_type, 'level', y_level);
      end if;
    else
      xp := case when x ? 'project' then x -> 'project' else null end;
      x_level := coalesce((x ->> 'level')::int, 0);
      x_type := x ->> 'type';
      -- Det verket lovlig kan være nå: prosjektet fra før er ferdig hvis readyAt er passert
      allowed_level := x_level;
      allowed_type := x_type;
      if xp is not null and (xp ->> 'readyAt')::numeric <= now_ms + grace_ms then
        if xp ->> 'kind' = 'modernisering' then allowed_level := x_level + 1; end if;
        if xp ->> 'kind' = 'utbygging' then allowed_type := 'storverk'; allowed_level := 0; end if;
      end if;
      if xp is not null and (xp ->> 'readyAt')::numeric > now_ms + grace_ms
         and (yp is null or yp ->> 'kind' <> xp ->> 'kind' or (yp ->> 'readyAt')::numeric <> (xp ->> 'readyAt')::numeric) then
        -- 1. Prosjektet er ikke ferdig ennå: tilbake slik det var
        fixed := (y - 'project') || jsonb_build_object('level', x_level, 'type', x_type, 'project', xp);
        changed := true;
        notes := notes || jsonb_build_object('id', y -> 'id', 'why', 'prosjekt avsluttet for tidlig', 'kind', xp ->> 'kind',
          'readyAt', xp ->> 'readyAt');
      elsif y_level > allowed_level + (case when yp is not null and yp ->> 'kind' = 'modernisering' then 0 else 0 end)
            or (y_type = 'storverk' and allowed_type = 'stalverk') then
        -- 2. Trinn eller type uten prosjekt: tilbake, og jobben startes nå
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
revoke execute on function public.guard_projects(jsonb, jsonb, timestamptz) from public, anon, authenticated;

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
  fixed jsonb;
begin
  -- security definer (rettelsen «byggetid_serverklokke_rettelse», 03:52 UTC): uten den kjørte save_game som spilleren og
  -- fikk «permission denied for function guard_projects» – ingen fikk lagret i ca. 10 minutter
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  perform public.touch_activity();
  select state into old_state from public.saves where user_id = auth.uid() and rev = p_base_rev;
  if old_state is not null then
    -- Byggetida i konsernet går etter serverens klokke (B-314)
    fixed := public.guard_projects(old_state, p_state, now());
    if fixed is not null then
      update public.saves
      set state = fixed, minute = p_minute, day = p_day, client_version = p_client_version,
          season_id = p_season_id, device = 'server'
      where user_id = auth.uid() and rev = p_base_rev
        and coalesce((p_state->>'serverEdit')::int, 0) >= coalesce((state->>'serverEdit')::int, 0);
      insert into public.project_guard_log (user_id, detail)
      values (auth.uid(), jsonb_build_object('notes', fixed -> 'projectGuard', 'client_version', p_client_version, 'device', p_device));
      return null;
    end if;
  end if;
  update public.saves
  set state = p_state, minute = p_minute, day = p_day, client_version = p_client_version,
      season_id = p_season_id, device = p_device
  where user_id = auth.uid() and rev = p_base_rev
    and coalesce((p_state->>'serverEdit')::int, 0) >= coalesce((state->>'serverEdit')::int, 0)
  returning rev into r;
  if r is not null then
    return r;
  end if;
  if exists (select 1 from public.saves where user_id = auth.uid()) then
    return null;
  end if;
  insert into public.saves (user_id, state, minute, day, client_version, season_id, device)
  values (auth.uid(), p_state, p_minute, p_day, p_client_version, p_season_id, p_device)
  returning rev into r;
  return r;
end;
$function$;

revoke execute on function public.save_game(jsonb, int, int, text, int, text, bigint) from public, anon;
grant execute on function public.save_game(jsonb, int, int, text, int, text, bigint) to authenticated;
