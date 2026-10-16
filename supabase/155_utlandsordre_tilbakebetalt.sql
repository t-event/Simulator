-- B-492: bøtene etter den umulige ordren fra utlandet betales tilbake til eieren (eierens «Fiks den umulige
-- utlandsordren», 14.10.2026).
--
-- B-491 fant feilen: hendelseskortet ga en ordre valseverket aldri kunne rekke, og den tok kapasiteten fra en
-- ukeleveranse i rammeavtalen. Fristene gikk ut samme minutt, med to bøter i loggen (id 71122 og 71123):
-- 92,27 mill. kr og omdømme −3,0 for ordren, 72,81 mill. kr og omdømme −2,0 for ukeleveransen.
--
-- Dry-run rett før (bare lesing): kasse 3 059 453 868 kr, omdømme 93,5, serverEdit 1, sist lagret 08:33 UTC.
-- Endres: kassa + 165 080 000 kr, omdømmet + 5 (høyst 100), en linje i loggen, serverEdit + 1 og device = 'server'
-- (B-211: eldre kopier avvises, appen henter spillet). Tidslinja og regnskapet for døgnet står (bota er historikk).
-- Spilleren finnes på loggen og i admins – ingen navn i repoet. Sikkerhetskopi i save_backups. Én blokk med kontroll.

do $$
declare
  uid uuid;
  old jsonb;
  refund numeric := 165080000;
  new_cash numeric;
  new_rep numeric;
  lid int;
begin
  select s.user_id into uid from public.saves s
  where s.user_id in (select user_id from public.admins)
    and s.state->'log' @> '[{"id":71122}]' and s.state->'log' @> '[{"id":71123}]';
  if uid is null then
    raise exception 'Fant ikke spillet';
  end if;
  select state into old from public.saves where user_id = uid for update;
  if exists (select 1 from public.save_backups where user_id = uid and reason = 'utlandsordre-tilbakebetalt') then
    raise exception 'Alt tilbakebetalt';
  end if;
  new_cash := (old->>'cash')::numeric + refund;
  new_rep := least(100, (old->>'reputation')::numeric + 5);
  lid := (old->>'nextLogId')::int;

  insert into public.save_backups (user_id, reason, day, rev, season_id, state)
  select user_id, 'utlandsordre-tilbakebetalt', day, rev, season_id, state from public.saves where user_id = uid;

  update public.saves
  set state = state
      || jsonb_build_object(
        'cash', new_cash,
        'reputation', new_rep,
        'nextLogId', lid + 1,
        'serverEdit', coalesce((old->>'serverEdit')::int, 0) + 1,
        'log', (old->'log') || jsonb_build_array(jsonb_build_object(
          'id', lid, 'min', (old->>'minute')::numeric, 'kind', 'good',
          'text', 'Bøtene for den umulige ordren fra utlandet er betalt tilbake: 165,08 mill. kr, og omdømmet er satt opp igjen. Feilen var i spillet, ikke din.'))),
      device = 'server'
  where user_id = uid;

  if (select (state->>'cash')::numeric from public.saves where user_id = uid) <> new_cash
     or (select (state->>'serverEdit')::int from public.saves where user_id = uid)
        <> coalesce((old->>'serverEdit')::int, 0) + 1
     or not exists (select 1 from public.save_backups where user_id = uid and reason = 'utlandsordre-tilbakebetalt') then
    raise exception 'Kontrollen feilet – ingenting er endret';
  end if;
  raise notice 'Kasse % → %, omdømme % → %', old->>'cash', new_cash, old->>'reputation', new_rep;
end $$;
