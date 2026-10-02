-- B-421: rydding av privatmeldinger hver natt. IKKE KJØRT ennå: Supabase-connectoren krever eierens bekreftelse for
-- funksjoner som sletter. Kjøres med apply_migration når eieren er til stede (første melding blir 30 dager tidligst 1.11.2026).
-- Rapportene (public.reports) har sin egen kopi av meldingen og ryddes ikke her.

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
end;
$$;
revoke all on function public.dm_cleanup() from public, anon, authenticated;

select cron.schedule('meldinger-rydding', '53 3 * * *', 'select public.dm_cleanup()');
