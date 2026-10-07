-- B-479: jobben `konsernverdi` (144, B-477) regnet alle spillerne i én setning. Feilet `konsern_value` for én spiller
-- (f.eks. et uventet felt i lagringen), rullet hele kjøringen tilbake: topplista «Konsernverdi» sto stille for alle, og
-- ingenting sa fra – jobben var ikke med i `world_health`.
--
-- Nå følger den mønsteret til de andre verdensjobbene (B-401): én spiller per deltransaksjon, feil logges med
-- `world_job_unit_error`, og kjøringen telles med `world_job_start`/`world_job_finish` (står etter 20 minutter uten
-- kjøring). En spiller som feiler, beholder forrige verdi på lista (raden får nytt tidspunkt, ikke ny verdi) i stedet for
-- å forsvinne.

create or replace function public.konsern_value_refresh()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  u record;
  n_ok int := 0;
  n_fail int := 0;
  today date := public.world_today();
begin
  -- Én om gangen; en annen kjøring som holder på, er nok
  if not pg_try_advisory_xact_lock(hashtext('stalverk_konsernverdi')) then
    return 0;
  end if;
  perform public.world_job_start('konsernverdi');
  for u in
    select p.id, (sv.state ->> 'stage')::smallint as stage, sv.day
    from public.profiles p
    join public.saves sv on sv.user_id = p.id
    where p.nickname is not null and not p.banned and p.flagged_at is null
      and coalesce((sv.state ->> 'stage')::int, 0) >= 4
      and coalesce((sv.state -> 'konsern' ->> 'unlocked')::boolean, false)
  loop
    begin
      insert into public.konsern_value_cache (user_id, value, stage, day, eligible, at)
      values (u.id, round(public.konsern_value(u.id)), u.stage, u.day, true, now())
      on conflict (user_id) do update
        set value = excluded.value, stage = excluded.stage, day = excluded.day, eligible = true, at = excluded.at;
      perform public.world_job_unit_ok('konsernverdi', u.id::text, today, false);
      n_ok := n_ok + 1;
    exception when others then
      perform public.world_job_unit_error('konsernverdi', u.id::text, sqlerrm);
      -- Forrige verdi blir stående på lista til regningen virker igjen
      update public.konsern_value_cache set at = now() where user_id = u.id;
      n_fail := n_fail + 1;
    end;
  end loop;
  -- Den som ikke lenger hører hjemme på lista (sperret, flagget, uten konsern), tas av uten å slette raden
  update public.konsern_value_cache set eligible = false where eligible and at < now();
  perform public.world_job_finish('konsernverdi', n_ok, n_fail);
  return n_ok;
end;
$function$;
revoke all on function public.konsern_value_refresh() from public, anon, authenticated;
