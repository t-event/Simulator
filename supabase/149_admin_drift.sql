-- B-485: driftsstatus i adminpanelet. Eieren ser selv om verdensjobbene og den nattlige eksporten gikk, uten å kjøre
-- world_health() i SQL-editoren. Leser bare – endrer ingenting og logges derfor ikke i admin_log (som admin_reports).
-- Bare for kontoer i `admins`; feilteksten fra jobbene kan nevne en spiller-id, men bare eieren ser den.
create or replace function public.admin_health()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'ikke tilgang';
  end if;
  return json_build_object(
    'at', now(),
    'jobs', coalesce((
      select json_agg(json_build_object(
               'job', h.job, 'status', h.status, 'finishedAt', h.last_finished_at, 'okAt', h.last_ok_at,
               'failing', h.units_failing, 'errorAt', h.last_error_at, 'error', h.last_error) order by h.job)
      from public.world_health() h), '[]'::json),
    'export', (
      select json_build_object('file', o.name, 'at', o.created_at, 'kb', round(coalesce((o.metadata ->> 'size')::numeric, 0) / 1024))
      from storage.objects o
      where o.bucket_id = 'eksport' and o.name like 'stalverk-%'
      order by o.name desc
      limit 1));
end;
$$;
revoke execute on function public.admin_health() from public, anon;
grant execute on function public.admin_health() to authenticated, service_role;
