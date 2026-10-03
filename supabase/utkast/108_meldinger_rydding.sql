-- B-421/B-445: rydding av privatmeldinger og samtaler om rapporter hver natt (eldre enn 30 dager). IKKE KJØRT ennå:
-- Supabase-connectoren holder igjen migrasjoner som sletter, til eieren bekrefter (prøvd to ganger 3.10.2026, også etter
-- eierens godkjenning – tidsavbrudd). Kjøres
-- med apply_migration når eieren kan bekrefte, eller av eieren i SQL-editoren i dashbordet – før 1.11.2026 (første
-- melding blir 30 dager da). Rapportene (public.reports) har sin egen kopi av meldingen og ryddes ikke; samtalene om en
-- rapport som fortsatt er åpen, står til rapporten er avgjort.

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
end;
$$;
revoke all on function public.dm_cleanup() from public, anon, authenticated;

select cron.schedule('meldinger-rydding', '53 3 * * *', 'select public.dm_cleanup()');
