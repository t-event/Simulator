-- Stålverket: reform 2, del 6 – konsernene og kassa satt tilbake til det den nye økonomien hadde gitt (B-309).
-- Kjørt som migrasjonen «reform2_konsern_tilbakestilt» 2026-09-29 ca. 01:40 UTC, etter tørrkjøring (raise exception).
--
-- Eieren: «Fiks dette, sett de tilbake til der de skulle ha vært.» Regelen (lik for alle på storverket med konsern eller
-- over 1 mrd. i kassa):
--   budsjett  = det spilleren kunne tjent med den nye økonomien over hele spillet (snittproduksjon per døgn fra
--               totals.producedT / dag; pris 12 400 kr/t før metning (B-308), kostnader 4 650 kr/t, administrasjon
--               500 kr/t over 5 000 t) − utstyret hjemme (listepris) − innskudd i konsernkassa (treasuryOut)
--   verkene   beholdes i kjøpsrekkefølge til budsjettet er brukt (listepris × (1 + 0,3 × trinn), prosjekter regnes som
--             ferdige); det første som ikke får plass, beholdes med så høyt trinn budsjettet rekker; resten fjernes
--   kassa     = budsjettet minus verkene, høyst 10 mrd. (B-306), minst 0
-- Alt annet står: forskning, fagpoeng, titler, mesterskap, konsernkassa, hjemmeverket, utbetalt til eierne.
-- Sikkerhetskopi i save_backups (reform2-konsern) og economy_reform_log.old_state (kan rulles tilbake per spiller med
-- restore_save). serverEdit + 1 og device = 'server' (B-211). Merket «Reformveteran II» til alle som ble truffet.
-- Sesonglista fikk ferske tidslinjetall etterpå (som 053, client_version server-B-309).
-- Resultat: Tuster 14 → 10 kompleks trinn 5, Grane 14 → 7 + 1 trinn 2, Figen 12 → 4 + 1 trinn 2, H4WK3N5 14 → 4,
-- GruberMogg67 10 → 7, The New Guy 10 → 5; Einmo, enzo, Big Boss, 2bajjas, Lord_Magni beholdt verkene. Kassene 0,4–10 mrd.

do $$
declare
  r record; x jsonb; n int := 0;
  budget numeric; spent numeric; price numeric; lvl int; c numeric; keep jsonb; cut boolean; newlvl int; newcash numeric;
  tpd numeric; per_dogn numeric; earned numeric; equip numeric;
begin
  for r in
    select s.user_id, p.nickname, s.state, floor((s.state->>'minute')::numeric/1440)::int + 1 as dag,
      (s.state->'totals'->>'producedT')::numeric as tonn
    from public.saves s join public.profiles p on p.id = s.user_id
    where not p.banned and (s.state->>'stage')::int = 4
      and (jsonb_array_length(coalesce(s.state->'konsern'->'plants','[]'::jsonb)) > 0 or (s.state->>'cash')::numeric > 1e9)
    order by dag desc
  loop
    tpd := r.tonn / r.dag;
    per_dogn := tpd * (12400 * (case when tpd <= 3000 then 1 else (3000 + (least(tpd,20000) - 3000) * 0.45 + greatest(0, tpd - 20000) * 0.4) / tpd end) - 4650)
                - 500 * greatest(0, tpd - 5000);
    earned := per_dogn * r.dag;
    select coalesce(sum(pr.price),0) into equip from (
      values ('lysbue30',7500000),('lysbue90',22000000),('lysbue150',90000000),('lysbue250',220000000),('likestrom420',700000000),
             ('streng1',5500000),('streng4',16000000),('streng6',45000000),('streng8',120000000),('ferdiglager2',4000000),('ferdiglager3',30000000),
             ('renseanlegg',1500000),('rense2',5000000),('rense3',25000000),('rense4',120000000),('rense5',400000000),('oseovn',3000000),
             ('conveyor',3500000),('trafo',2500000),('vakuum',30000000),('havn',40000000),('skrapterminal',25000000),('elektroderegulering',4000000),
             ('panelvarsling',6000000),('bruddvarsling',8000000),('varmegjenvinning',20000000),('streng2',40000000),('streng3',150000000),
             ('valseverk2',35000000),('valseverk3',90000000),('valseverk',9000000)) pr(id, price)
    where pr.id in (select f->>'type' from jsonb_array_elements(r.state->'furnaces') f)
       or pr.id = r.state->>'castingType'
       or pr.id in (select o from jsonb_array_elements_text(r.state->'owned') o);
    -- ovnene telles én gang per ovn (lista over teller typen én gang)
    select equip + coalesce((select sum(case f->>'type' when 'lysbue150' then 90000000 when 'lysbue250' then 220000000 when 'likestrom420' then 700000000 when 'lysbue90' then 22000000 when 'lysbue30' then 7500000 else 0 end) from jsonb_array_elements(r.state->'furnaces') f),0)
      - coalesce((select max(case f->>'type' when 'lysbue150' then 90000000 when 'lysbue250' then 220000000 when 'likestrom420' then 700000000 when 'lysbue90' then 22000000 when 'lysbue30' then 7500000 else 0 end) from jsonb_array_elements(r.state->'furnaces') f),0)
    into equip;
    budget := earned - equip - coalesce((r.state->>'treasuryOut')::numeric, 0);
    spent := 0; keep := '[]'::jsonb; cut := false;
    for x in select y from jsonb_array_elements(coalesce(r.state->'konsern'->'plants','[]'::jsonb)) y order by (y->>'id')::int loop
      if cut then continue; end if;
      price := case x->>'type' when 'stalverk' then 3e8 when 'storverk' then 1.2e9 else 3.6e9 end;
      lvl := coalesce((x->>'level')::int,0) + case when x->'project'->>'kind' = 'modernisering' then 1 else 0 end;
      c := price * (1 + 0.3 * lvl);
      if spent + c <= budget then
        spent := spent + c; keep := keep || x;
      else
        newlvl := floor(((budget - spent) / price - 1) / 0.3);
        if newlvl >= 0 then
          spent := spent + price * (1 + 0.3 * newlvl);
          keep := keep || ((x - 'project') || jsonb_build_object('level', newlvl));
        end if;
        cut := true;
      end if;
    end loop;
    newcash := least(1e10, greatest(0, budget - spent));
    insert into public.save_backups (user_id, reason, day, rev, season_id, state)
    select user_id, 'reform2-konsern', day, rev, season_id, state from public.saves where user_id = r.user_id;
    insert into public.economy_reform_log (user_id, model, old_cash, new_cash, old_state)
    values (r.user_id, format('reform 2 (B-309): budsjett %s mrd, verk %s -> %s', round(budget/1e9,1),
            jsonb_array_length(coalesce(r.state->'konsern'->'plants','[]'::jsonb)), jsonb_array_length(keep)),
            (r.state->>'cash')::numeric, newcash, r.state);
    update public.saves
    set state = jsonb_set(state, '{konsern,plants}', keep)
                || jsonb_build_object('cash', newcash, 'serverEdit', coalesce((r.state->>'serverEdit')::int, 0) + 1),
        device = 'server'
    where user_id = r.user_id;
    insert into public.badges (user_id, badge, note)
    values (r.user_id, 'reform2', 'Konsernet og kassa satt tilbake til den nye økonomien (B-309)')
    on conflict do nothing;
    n := n + 1;
  end loop;
  if (select count(*) from public.save_backups where reason = 'reform2-konsern') <> n then
    raise exception 'Kontrollen feilet – ingenting er endret';
  end if;
  raise notice 'Reform 2 konsern: % spillere', n;
end $$;
