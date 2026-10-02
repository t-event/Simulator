-- B-417: Konsernverdien på topplista regner bidraget med den aktiviteten betalingen faktisk bruker.
-- Før regnet konsern_value bidraget som om alle produserte for fullt hver dag (aktivitet 1). En spiller som ikke hadde
-- spilt på flere dager, ble betalt med gulvet (0,3), men sto på topplista med 60 dager fullt bidrag – plass 2–3 med
-- om lag 1,4 mrd. for mye. Nå: aktiviteten i siste betalte bidrag (contributions.activity), eller dagens produksjon så
-- langt hvis den er høyere (en som kommer tilbake, stiger samme dag). Uten noe betalt bidrag ennå: 1, som før.
-- Bare visning og sesongslutt: ingen penger flyttes, ingenting lagres, betalingene (pay_contributions) er uendret.
create or replace function public.konsern_value(p_user uuid)
 returns numeric
 language sql
 stable security definer
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
       - coalesce((select greatest(0, coalesce((state ->> 'loan')::numeric, 0)) from public.saves where user_id = p_user), 0);
$function$;
