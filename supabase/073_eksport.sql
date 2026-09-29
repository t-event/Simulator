-- B-345: daglig eksport av spilltabellene til en privat mappe i Supabase Storage.
-- Gratisplanen tar ingen sikkerhetskopier av databasen. Hver natt samler backup_export() alle tabellene i public
-- (unntatt save_backups, som er spillets egne kopier) til én JSON; edge-funksjonen `eksport`
-- (supabase/functions/eksport) pakker den (gzip) og legger den i mappa `eksport` som stalverk-ÅÅÅÅ-MM-DD.json.gz, og
-- sletter filer eldre enn 14 dager. Innloggingsdata (auth.users: e-post og passord) er ikke med.
-- Adressen til edge-funksjonen ligger i Vault (`eksport_url`), ikke her – lagt inn for seg med vault.create_secret.

-- Alle tabellene som én JSON: { laget, versjon, tabeller: { navn: [rader] } }. Bare serveren (service_role).
-- Bygges som tekst av json_agg per tabell (under 0,5 s); jsonb satt sammen bit for bit tok 14 s og nådde tidsgrensen (8 s).
drop function if exists public.backup_export();
create function public.backup_export()
returns json
language plpgsql
stable
set search_path = public
as $$
declare
  t text;
  r text;
  parts text[] := '{}';
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'save_backups'
    order by c.relname
  loop
    execute format('select coalesce(json_agg(x), ''[]''::json)::text from public.%I x', t) into r;
    parts := parts || (to_json(t)::text || ':' || r);
  end loop;
  return ('{"laget":' || to_json(now())::text || ',"versjon":1,"tabeller":{' || array_to_string(parts, ',') || '}}')::json;
end;
$$;
revoke execute on function public.backup_export() from public, anon, authenticated;
grant execute on function public.backup_export() to service_role;

-- Den private mappa (ingen offentlig tilgang; lastes ned fra dashbordet: Storage → eksport)
insert into storage.buckets (id, name, public) values ('eksport', 'eksport', false) on conflict (id) do nothing;

-- Hver natt kl. 04:17 norsk sommertid (02:17 UTC)
-- pg_net i schemaet extensions (i public ga det et varsel i get_advisors); funksjonene ligger uansett i net
create extension if not exists pg_net schema extensions;
create extension if not exists pg_cron;
select cron.unschedule('eksport-daglig') where exists (select 1 from cron.job where jobname = 'eksport-daglig');
select cron.schedule(
  'eksport-daglig',
  '17 2 * * *',
  $$ select net.http_post(
       url := (select decrypted_secret from vault.decrypted_secrets where name = 'eksport_url'),
       body := '{}'::jsonb,
       timeout_milliseconds := 120000) $$
);
