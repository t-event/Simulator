-- B-517: «Bygg på nytt». En veteran kan selge storverket og starte hjemmeverket i garasjen igjen (`state.rebuilds` > 0).
-- Konsernet ligger på serveren og blir stående, men utbyttet, kjøp i konsernet, anbud og sesongens konsernverdi krevde
-- at hjemmeverket var på storverket (`state.stage` >= 4). For den som bygger på nytt, og som serveren alt har sett på
-- storverket (`records.best_stage`, fra tidslinja som juksesperren sjekker), teller det høyeste nivået i stedet.
-- Bidraget fra hjemmeverket (contribution_*) følger fortsatt nivået hjemme: et lite verk gir lite.
-- `rebuilds` leses bare når det er et tall (ingen ny sjekk i typevakten).

create or replace function public.konsern_stage(p_user uuid, p_state jsonb)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    coalesce((p_state ->> 'stage')::int, 0),
    case when jsonb_typeof(p_state -> 'rebuilds') = 'number' and (p_state ->> 'rebuilds')::numeric > 0
         then coalesce((select r.best_stage::int from public.records r where r.user_id = p_user), 0)
         else 0 end)
$$;
revoke execute on function public.konsern_stage(uuid, jsonb) from public, anon, authenticated;

-- De fem funksjonene som gjelder konsernet og pengene, rettes med replace (samme mønster som 114/115/119)
do $$
declare
  fix record;
  def text;
  patched text;
begin
  for fix in
    select * from (values
      ('pay_dividends', 'coalesce((s.state ->> ''stage'')::int, 0) >= 4', 'public.konsern_stage(s.user_id, s.state) >= 4'),
      ('dividend_per_day', 'coalesce((s.state ->> ''stage'')::int, 0) >= 4', 'public.konsern_stage(s.user_id, s.state) >= 4'),
      ('close_season', 'coalesce((sv.state ->> ''stage'')::int, 0) >= 4', 'public.konsern_stage(sv.user_id, sv.state) >= 4'),
      ('konsern_order', 'coalesce((s.state ->> ''stage'')::int, 0) < 4', 'public.konsern_stage(uid, s.state) < 4'),
      ('place_bid', 'coalesce((s.state->>''stage'')::int, 0) < 4', 'public.konsern_stage(uid, s.state) < 4')
    ) as v(fn, old_text, new_text)
  loop
    select pg_get_functiondef(p.oid) into def
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = fix.fn;
    if def is null then
      raise exception 'fant ikke %', fix.fn;
    end if;
    if position(fix.new_text in def) > 0 then
      continue; -- alt rettet
    end if;
    if position(fix.old_text in def) = 0 then
      raise exception 'fant ikke nivåsjekken i %', fix.fn;
    end if;
    patched := replace(def, fix.old_text, fix.new_text);
    execute patched;
  end loop;
end $$;
