-- B-421/B-445: rydding av privatmeldinger og samtaler om rapporter hver natt (eldre enn 30 dager). Kjørt av eieren i
-- SQL-editoren 7.10.2026 (B-471) – Supabase-connectoren holder igjen migrasjoner som sletter. pg_cron `meldinger-rydding`
-- kl. 03:53 UTC. Rapportene (public.reports) har sin egen kopi av meldingen og ryddes ikke; samtalene om en rapport som
-- fortsatt er åpen, står til rapporten er avgjort. Rydder også varselboksen (B-465): sendte varsler etter 14 dager og
-- avslåtte enheter etter 60 dager. Kjøres den to ganger, er det ufarlig (funksjonen erstattes, jobben legges inn på nytt).

create or replace function public.dm_cleanup()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.dm_messages where created_at < now() - interval '30 days';
  delete from public.dm_threads t
   where t.started_at < now() - interval '1 day'
     and not exists (select 1 from public.dm_messages m
                      where (m.sender = t.a and m.recipient = t.b) or (m.sender = t.b and m.recipient = t.a));
  delete from public.report_messages rm
   where rm.created_at < now() - interval '30 days'
     and exists (select 1 from public.reports r where r.id = rm.report_id and r.status <> 'open');
  -- Varsel på mobilen (B-465): varsler som er sendt (eller for gamle), etter 14 dager, og enheter som har vært slått av i
  -- 60 dager
  delete from public.push_outbox where sent_at is not null and sent_at < now() - interval '14 days';
  delete from public.push_subscriptions where not active and updated_at < now() - interval '60 days';
end;
$$;
revoke all on function public.dm_cleanup() from public, anon, authenticated;

select cron.unschedule('meldinger-rydding') where exists (select 1 from cron.job where jobname = 'meldinger-rydding');
select cron.schedule('meldinger-rydding', '53 3 * * *', 'select public.dm_cleanup()');
