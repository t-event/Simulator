-- B-213: økonomireformen for Grane, kjørt på nytt etter eierens «Gjør rettingen» (2026-09-27).
--
-- Reformen traff Grane kl. 01.02 (8 286 → 11,17 mrd.), men en enhet med det gamle spillet lastet det opp igjen
-- etterpå (B-211). Siden gikk spillet videre på de gamle pengene: kassa låst på 100 mrd. og resten i den bundne
-- reserven (B-193). Samme regel som reformen (028), på kasse + reserve: 250 mill. × (sum / 250 mill.)^0,365.
--
-- Fersk dry-run rett før: dag 2 273, kasse 99,9997 mrd. + reserve 8 441,13 mrd. = 8 541,13 mrd. → 11,29 mrd.
-- Endres: kassa, reserven (null), serverEdit = 1 (B-211: eldre kopier avvises), device = 'server' (appen henter spillet).
-- Tidslinjetallene etter reformen (54) merkes pre_reform (B-190), og rekorden for konsernverdi settes tilbake til det
-- beste tallet før reformen (8 562,6 mrd. dag 2 190) – økningen etter kom fra det gamle spillet. Alt annet står:
-- verk, forskning, fagpoeng, lån, konsernkassa (100 mill., overført etter de vanlige reglene).
-- Sikkerhetskopi i save_backups og for alltid i economy_reform_log.old_state. Alt i én blokk med kontroll.

do $$
declare
  uid uuid := (select id from public.profiles where nickname = 'Grane');
  reform_at timestamptz;
  old jsonb;
  total numeric;
  new_cash numeric;
  best record;
  n int;
begin
  if uid is null then
    raise exception 'Fant ikke spilleren';
  end if;
  select min(at) into reform_at from public.economy_reform_log where user_id = uid;
  select state into old from public.saves where user_id = uid for update;
  if coalesce((old->>'serverEdit')::int, 0) >= 1 then
    raise exception 'Spillet er alt rettet';
  end if;
  total := (old->>'cash')::numeric + coalesce((old->'lockedReserve'->>'total')::numeric, 0);
  new_cash := round(250000000 * power(total / 250000000, 0.365));

  -- Sikkerhetskopi
  insert into public.save_backups (user_id, reason, day, rev, season_id, state)
  select user_id, 'okonomireform-retting', day, rev, season_id, state from public.saves where user_id = uid;
  insert into public.economy_reform_log (user_id, model, old_cash, new_cash, old_state)
  values (uid, 'retting B-213: kasse + reserve, gulv 250 mill., k 0,365', total, new_cash, old);

  -- Spillet
  update public.saves
  set state = state || jsonb_build_object('cash', new_cash, 'lockedReserve', null, 'serverEdit', 1), device = 'server'
  where user_id = uid;

  -- Tidslinja etter reformen (bare merket; juksesperren og de andre triggerne skal ikke kjøre)
  alter table public.snapshots disable trigger user;
  update public.snapshots set pre_reform = true where user_id = uid and at > reform_at and not pre_reform;
  get diagnostics n = row_count;
  alter table public.snapshots enable trigger user;

  -- Rekorden for konsernverdi: det beste før reformen
  select day, equity into best from public.snapshots
  where user_id = uid and at < reform_at order by equity desc, day asc limit 1;
  update public.records set best_equity = best.equity, best_equity_day = best.day, updated_at = now()
  where user_id = uid and best_equity > best.equity;

  -- Kontroll
  if (select (state->>'cash')::numeric from public.saves where user_id = uid) <> new_cash
     or (select state->'lockedReserve' from public.saves where user_id = uid) <> 'null'::jsonb
     or (select (state->>'serverEdit')::int from public.saves where user_id = uid) <> 1
     or new_cash < 250000000 or new_cash >= total
     or exists (select 1 from public.snapshots where user_id = uid and at > reform_at and not pre_reform)
     or not exists (select 1 from public.save_backups where user_id = uid and reason = 'okonomireform-retting') then
    raise exception 'Kontrollen feilet – ingenting er endret';
  end if;
  raise notice 'Grane: % → % (% tidslinjetall merket)', total, new_cash, n;
end $$;
