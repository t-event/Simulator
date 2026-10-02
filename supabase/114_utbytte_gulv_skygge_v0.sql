-- B-425: rettinger etter kodegjennomgangen 2.10. Hver del prøvekjørt først (rullet tilbake) og lagt inn 2.10.2026.
-- 113 står slik den ble lagt inn; endringene i funksjonene derfra står her, så en ny database og den migrerte får samme
-- forløp.
--
-- 114 (lagt inn ca. 13:15 UTC; prøvekjøringen: kassene og utbytteradene uendret, begge jobbene «ok»)
-- 1. pay_dividends starter aldri på en dag før 2.10. 111 begrenset bare hvem som tas med (den som har solgt sitt siste
--    verk, målinger fra 2.10); løkka kunne likevel begynne på en eldre ubetalt dag. Eldre dager betales bare gjennom
--    etterbetalingen, med eierens svar (supabase/utkast/112). Ingen spiller hadde slike dager da rettingen ble lagt inn.
-- 2. V0-skyggen (113) har egen jobb «skygge_v0» i world_jobs. «skygge» brukes av revisjonen av verdiene fra mobilen
--    (095, world_job_error('skygge', …) i sample_contributions), så en feil der ville sett ut som en feil i V0 og omvendt.
--    Raden «skygge» er fortsatt revisjonens og skal ikke slettes.
do $$
declare
  d text := pg_get_functiondef('public.pay_dividends()'::regprocedure);
  o text := d;
begin
  d := replace(d, $a$    d := greatest(from_day, coalesce(paid + 1, from_day), today - max_days);$a$,
                  $a$    -- Aldri dager før 2.10 automatisk (B-425): eldre dager går bare gjennom etterbetalingen med eierens svar
    d := greatest(from_day, coalesce(paid + 1, from_day), today - max_days, date '2026-10-02');$a$);
  if d = o then raise exception 'pay_dividends: fant ikke startdagen'; end if;
  execute d;
  d := pg_get_functiondef('public.world_shadow_tick()'::regprocedure);
  o := d;
  d := replace(d, $a$'skygge'$a$, $a$'skygge_v0'$a$);
  if d = o then raise exception 'world_shadow_tick: fant ikke jobbnavnet'; end if;
  execute d;
end $$;

-- 114_b (lagt inn ca. 13:40 UTC): world_health følger jobbens faktiske intervall.
-- * skygge_v0 går én gang i timen (cron minutt 17): «står» først etter 75 minutter, ikke 20.
-- * skygge (revisjonen) melder bare feil, ikke start og slutt: «feil i jobben» når siste feil kom innen en måling
--   (35 minutter), ellers «ok» – aldri «står».
create or replace function public.world_health()
returns table(job text, status text, last_started_at timestamptz, last_finished_at timestamptz, last_ok_at timestamptz,
  minutes_since_finished numeric, ok_units integer, failed_units integer, units_failing bigint, last_error_at timestamptz,
  last_error text)
language sql stable security definer set search_path to 'public' as $function$
  select j.job,
         case
           -- Revisjonen av verdiene fra mobilen (095) melder bare feil, etter hver måling: feil i siste runde = feil
           when j.job = 'skygge' then
             case when j.last_error_at > now() - interval '35 minutes' then 'feil i jobben' else 'ok' end
           when j.last_finished_at is null or j.last_finished_at < now() - case j.job
                when 'malinger' then interval '35 minutes'
                when 'skygge_v0' then interval '75 minutes'
                else interval '20 minutes' end then 'står'
           when j.last_error_at > j.last_finished_at then 'feil i jobben'
           when (select count(*) from public.world_job_units u where u.job = j.job and u.errors_in_row > 0) > 0
             then 'feil hos enkelte'
           else 'ok'
         end,
         j.last_started_at, j.last_finished_at, j.last_ok_at,
         round(extract(epoch from now() - j.last_finished_at) / 60, 1),
         j.ok_units, j.failed_units,
         (select count(*) from public.world_job_units u where u.job = j.job and u.errors_in_row > 0),
         j.last_error_at, j.last_error
  from public.world_jobs j
  order by j.job;
$function$;
