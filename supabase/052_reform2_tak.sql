-- Stålverket: reform 2, del 4 – taket for kassa senket til 10 mrd. og kjørt på serveren (B-306).
--
-- Eieren: «Jeg har jo enda 100 mrd. på kontoen. Jeg syntes du var for snill med reform 2.» Alle lagringer med kasse
-- over 10 mrd. settes til 10 mrd.; resten føres som utbetalt til eierne (`state.paidOut.total`, B-303). Sikkerhetskopi
-- i save_backups (reform2-tak) og for alltid i economy_reform_log.old_state. serverEdit + 1 og device = 'server' (B-211),
-- så eldre kopier avvises og appen henter serverens spill. Merket «Reformveteran II» til dem som ble truffet.
-- Rekorden «Utbetalt til eierne» følger av triggeren note_paid_out. Kjørt ETTER at appen med det nye taket var
-- publisert. Tørrkjørt først med `raise exception` (ti spillere, 564 mrd. flyttet, seks nye merker).

do $$
declare
  cap numeric := 10000000000;
  r record;
  n int := 0; moved numeric := 0; badges int := 0;
  old jsonb; excess numeric; d int; po jsonb;
begin
  for r in select s.user_id, s.state from public.saves s where (s.state->>'cash')::numeric > cap loop
    old := r.state;
    excess := (old->>'cash')::numeric - cap;
    d := floor((old->>'minute')::numeric / 1440) + 1;
    po := jsonb_build_object(
      'total', coalesce((old->'paidOut'->>'total')::numeric, 0) + excess,
      'firstDay', coalesce((old->'paidOut'->>'firstDay')::int, d),
      'today', 0);
    insert into public.save_backups (user_id, reason, day, rev, season_id, state)
    select user_id, 'reform2-tak', day, rev, season_id, state from public.saves where user_id = r.user_id;
    insert into public.economy_reform_log (user_id, model, old_cash, new_cash, old_state)
    values (r.user_id, 'reform 2 (B-306): tak 10 mrd., resten utbetalt til eierne', (old->>'cash')::numeric, cap, old);
    update public.saves
    set state = state || jsonb_build_object('cash', cap, 'paidOut', po, 'serverEdit', coalesce((old->>'serverEdit')::int, 0) + 1),
        device = 'server'
    where user_id = r.user_id;
    insert into public.badges (user_id, badge, note)
    values (r.user_id, 'reform2', 'Kassa over taket da reform 2 ble kjørt på serveren (B-306); ført som utbetalt til eierne')
    on conflict do nothing;
    if found then badges := badges + 1; end if;
    n := n + 1; moved := moved + excess;
  end loop;
  -- Kontroll: ingen over taket, én kopi per spiller, alle merket som serverens
  if exists (select 1 from public.saves where (state->>'cash')::numeric > cap)
     or (select count(*) from public.save_backups where reason = 'reform2-tak') <> n
     or (select count(*) from public.saves where device = 'server' and (state->>'cash')::numeric = cap) < n then
    raise exception 'Kontrollen feilet – ingenting er endret';
  end if;
  raise notice 'Reform 2 tak: % spillere, % mrd. ført som utbetalt, % nye merker', n, round(moved / 1e9, 1), badges;
end $$;
