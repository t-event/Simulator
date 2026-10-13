-- B-484: den nattlige eksporten (B-345, 073) hentes tabell for tabell, og store tabeller i deler.
-- backup_export() samlet alt i ett kall; med 24 MB JSON tok det over 7 s og nådde tidsgrensen på 8 s i PostgREST –
-- eksporten feilet 7 av de 13 nettene fra 1.10 til 13.10 («canceling statement due to statement timeout»).
-- Nå spør edge-funksjonen `eksport` først om lista (backup_export_tables) og henter så hver del for seg
-- (backup_export_table), hvert kall langt under grensen. Fila får samme form som før: { laget, versjon, tabeller }.
-- En del er radene der hashen av første kolonne i primærnøkkelen gir delnummeret – en rad bytter aldri del, så ingen
-- rad kommer med to ganger eller faller ut fordi andre rader legges til mellom kallene.
-- backup_export() står igjen for bruk i SQL-editoren, men brukes ikke av eksporten.

-- Tabellene som eksporteres og hvor mange deler hver hentes i: én per påbegynte MB på disk (bare med primærnøkkel)
create or replace function public.backup_export_tables()
returns json
language sql
stable
set search_path = public
as $$
  select coalesce(json_agg(json_build_object(
           'name', c.relname,
           'parts', case when exists (select 1 from pg_index i where i.indrelid = c.oid and i.indisprimary)
                         then greatest(1, ceil(pg_total_relation_size(c.oid) / 1048576.0))::int else 1 end)
           order by c.relname), '[]'::json)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'save_backups';
$$;
revoke execute on function public.backup_export_tables() from public, anon, authenticated;
grant execute on function public.backup_export_tables() to service_role;

-- Radene i én del av én tabell som JSON-liste. p_parts = 1 gir hele tabellen.
create or replace function public.backup_export_table(p_table text, p_part int default 0, p_parts int default 1)
returns json
language plpgsql
stable
set search_path = public
as $$
declare
  rel oid;
  key text;
  r text;
begin
  select c.oid into rel from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relname = p_table and c.relname <> 'save_backups';
  if rel is null then raise exception 'ukjent tabell: %', p_table; end if;
  if p_parts is null or p_parts < 1 or p_part is null or p_part < 0 or p_part >= p_parts then
    raise exception 'ugyldig del: % av %', p_part, p_parts;
  end if;
  if p_parts = 1 then
    execute format('select coalesce(json_agg(x), ''[]''::json)::text from public.%I x', p_table) into r;
    return r::json;
  end if;
  select a.attname into key from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
  where i.indrelid = rel and i.indisprimary;
  if key is null then raise exception 'tabellen % har ingen primærnøkkel og kan ikke deles', p_table; end if;
  execute format('select coalesce(json_agg(x), ''[]''::json)::text from public.%I x '
                 'where (hashtext(x.%I::text) & 2147483647) %% $1 = $2', p_table, key)
    into r using p_parts, p_part;
  return r::json;
end;
$$;
revoke execute on function public.backup_export_table(text, int, int) from public, anon, authenticated;
grant execute on function public.backup_export_table(text, int, int) to service_role;

-- Eksporten melder seg i world_health som jobben «eksport» (start, ferdig, feil fra edge-funksjonen). Den går én gang
-- i døgnet og prøves igjen hver time til kl. 06:17 UTC, så den «står» først etter 29 timer uten en ferdig eksport.
do $$
declare
  def text := pg_get_functiondef('public.world_health'::regproc);
  old text := $o$when 'skygge_v0' then interval '75 minutes'$o$;
begin
  if position('''eksport''' in def) = 0 then
    if position(old in def) = 0 then raise exception 'world_health har endret seg'; end if;
    execute replace(def, old, old || $n$
                when 'eksport' then interval '29 hours'$n$);
  end if;
end $$;

-- Prøv igjen hver time fra 02:17 til 06:17 UTC. Edge-funksjonen hopper over når dagens fil alt finnes.
select cron.alter_job(
  (select jobid from cron.job where jobname = 'eksport-daglig'),
  schedule := '17 2-6 * * *'
);
