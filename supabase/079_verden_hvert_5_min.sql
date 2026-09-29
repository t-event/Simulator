-- Stålverket: verden oppdateres hvert 5. minutt, også når ingen spiller (B-364).
--
-- `world_tick` (anbud, overtakelser, inntekt, utbytte, bidrag og målingene hvert kvarter, B-361/B-362) ble bare kjørt når
-- en app spurte etter `world_status`. Om natta, når ingen spiller, ble det derfor ingen målinger, og snittet for dagen
-- bygde bare på timene noen var inne; frister for overtakelser og anbud ble liggende til noen åpnet spillet.
-- Nå kjører pg_cron `world_tick` hvert 5. minutt. Den har fortsatt sin egen sperre (høyst hvert 30. sekund, én om
-- gangen, 072), så det gjør ingenting om en app kaller samtidig. Loggen over kjøringene ryddes daglig (3 dager beholdes).

select cron.unschedule(jobid) from cron.job where jobname in ('verden-tick', 'cron-rydding');
select cron.schedule('verden-tick', '*/5 * * * *', 'select public.world_tick()');
select cron.schedule('cron-rydding', '41 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '3 days'$$);
