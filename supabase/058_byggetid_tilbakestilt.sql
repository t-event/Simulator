-- B-314: spilleren som stilte klokka fram, settes tilbake. Kjørt som migrasjonen «byggetid_tilbakestilt» 2026-09-29
-- ca. 03:55 UTC etter tørrkjøring og eierens svar (ingen refusjon av de 4,6 mrd. trinnene kostet, ingen sperre).
-- Alle 8 storverk til trinn 0; verk 11 (kjøpt 02:03:38 UTC) bygges ærlig ferdig 6 timer etter kjøpet (08:03 UTC).
-- Sikkerhetskopi i save_backups (byggetid), rad i project_guard_log, serverEdit + 1 og device = 'server' (B-211).
-- Ingen rad i economy_reform_log: den ville gitt merket «Reformveteran» (badges_of, 056).
do $$
declare
  uid uuid; r record; s jsonb; plants jsonb := '[]'::jsonb; x jsonb; levels int := 0;
begin
  select id into uid from public.profiles where nickname = 'Lord_Magni';
  select * into r from public.saves where user_id = uid for update;
  s := r.state;
  insert into public.save_backups (user_id, reason, day, rev, season_id, state)
  values (uid, 'byggetid', r.day, r.rev, r.season_id, s);
  for x in select * from jsonb_array_elements(s->'konsern'->'plants') loop
    levels := levels + coalesce((x->>'level')::int, 0);
    if (x->>'id')::int = 11 then
      plants := plants || ((x - 'project') || jsonb_build_object('level', 0, 'project',
        jsonb_build_object('kind', 'bygg', 'startedAt', 1790647418394::numeric, 'readyAt', 1790647418394::numeric + 6 * 3600000)));
    else
      plants := plants || ((x - 'project') || jsonb_build_object('level', 0));
    end if;
  end loop;
  s := jsonb_set(s, '{konsern,plants}', plants);
  s := jsonb_set(s, '{serverEdit}', to_jsonb(coalesce((s->>'serverEdit')::int, 0) + 1));
  update public.saves set state = s, device = 'server' where user_id = uid;
  insert into public.project_guard_log (user_id, detail)
  values (uid, jsonb_build_object('why', 'B-314: satt tilbake for hånd etter juks med klokka', 'levels_removed', levels,
                                  'backup_rev', r.rev));
  if levels <> 17 then
    raise exception 'ventet 17 trinn, fant %', levels;
  end if;
end $$;
