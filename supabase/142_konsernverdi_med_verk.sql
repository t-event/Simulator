-- B-475: konsernverdien teller verkene som eiendeler (eieren 7.10: «Om man oppgraderer konsernet sitt så går
-- konsernverdien ned»). Før var verdien konsernkassa + 60 dagers utbytte og bidrag − lån: en modernisering trakk hele
-- prisen fra kassa med én gang, mens utbyttet først økte når prosjektet var ferdig (9–13 timer med kø), og for de største
-- konsernene ga 60 dagers ekstra utbytte (etter imperiebelastningen) mindre enn prisen.
--
-- Nå legges til:
-- * hvert verk med salgssummen (`konsern_sell`: 60 % av byggeprisen med trinnene, B-307) – men ikke et verk som fortsatt
--   bygges (det har ingen salgssum ennå)
-- * hver betalt bestilling som ikke er ferdig (`kø`, `i gang`) med prisen som er betalt
-- Et nytt verk teller altså med prisen mens det bygges og med salgssummen når det er ferdig; en modernisering teller med
-- prisen mens den pågår, og verket teller med det høyere trinnet etterpå. Lånet trekkes fortsatt fra.
-- Speilet i `konsernAssets` (`game/konsernWorld.ts`) og `konsernValueOf` (`net/world.ts`).

create or replace function public.konsern_assets(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $function$
  with cfg as (select public.konsern_cfg() as c)
  select coalesce((
           select sum(round((cfg.c -> 'price' ->> (p ->> 'type'))::numeric
                            * (1 + coalesce((cfg.c ->> 'mod_share')::numeric, 0.3) * coalesce((p ->> 'level')::int, 0))
                            * coalesce((cfg.c ->> 'sell_share')::numeric, 0.6)))
           from public.konsern k, cfg, jsonb_array_elements(coalesce(k.plants, '[]'::jsonb)) p
           where k.user_id = p_user and coalesce(p -> 'project' ->> 'kind', '') <> 'bygg'), 0)
       + coalesce((select sum(o.cost) from public.konsern_orders o
                    where o.user_id = p_user and o.status in ('kø', 'i gang')), 0);
$function$;
revoke all on function public.konsern_assets(uuid) from public, anon, authenticated;

create or replace function public.konsern_value(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce((select balance from public.treasury where user_id = p_user), 0)
       + 60 * (public.dividend_per_day(p_user)
               + public.contribution_amount(
                   (select full_day from public.contribution_now(p_user)),
                   greatest(
                     coalesce((select c.activity from public.contributions c where c.user_id = p_user
                               order by c.day desc limit 1), 1),
                     coalesce((select least(1, d.gained_t / nullif(public.meter_normal_rate(p_user), 0))
                               from public.production_days d
                               where d.user_id = p_user and d.day = public.world_today()), 0))))
       + public.konsern_assets(p_user)
       - coalesce((select greatest(0, coalesce((state ->> 'loan')::numeric, 0)) from public.saves where user_id = p_user), 0)
       - coalesce((select loan from public.konsern where user_id = p_user), 0);
$function$;
