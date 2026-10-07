-- B-476: selskapene man eier, teller i konsernverdien (eieren 7.10: «Får [en spiller] noen konsernverdi av bedriftene han
-- eier?»). Før talte selskapene bare gjennom det de alt hadde betalt inn i konsernkassa, mens utbyttet og bidraget telte
-- 60 dager fremover – og anbudet trakk verdien rett ned. Eierens valg: dagene som er igjen.
--
-- Hvert aktivt selskap teller med inntektsanslaget per dag (`company_estimate`, det `world_status` viser som
-- `estimate_per_day`) ganger dagene som er igjen av konsesjonen, høyst 60 – det selskapet faktisk vil gi, samme tanke
-- som utbetalingen ved oppkjøp (`takeover_payout`). Tallet synker mot slutten av konsesjonen og kommer tilbake når den
-- fornyes. Speilet i `companiesValue` (`net/world.ts`).

create or replace function public.konsern_companies_value(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(sum(public.company_estimate(c.id)
                      * least(60, greatest(0, extract(epoch from (c.concession_until - now())) / 86400))), 0)
  from public.companies c
  where c.owner_id = p_user and c.active and c.concession_until is not null;
$function$;
revoke all on function public.konsern_companies_value(uuid) from public, anon, authenticated;

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
       + public.konsern_companies_value(p_user)
       - coalesce((select greatest(0, coalesce((state ->> 'loan')::numeric, 0)) from public.saves where user_id = p_user), 0)
       - coalesce((select loan from public.konsern where user_id = p_user), 0);
$function$;
