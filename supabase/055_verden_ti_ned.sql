-- Stålverket: verdensøkonomien 10× ned (B-311). Kjørt som migrasjonen «verden_ti_ned» 2026-09-29 etter tørrkjøring.
--
-- Eieren: «Jeg vil ha det slik at spillet blir en rettferdig kamp mellom spillerne. Nå er det for enkelt å tjene en
-- milliard.» Alt som teller mellom spillere, skaleres sammen til en tidel, så verden går i et menneskelig tempo (et
-- fullt konsern ca. 30 mill. per ekte dag; én milliard tar ca. en måned, som et ekte europeisk konsern):
--   dividend.base 0,5/2/6 mill. per verk (speilet i game/dividend.ts), dividend.load_from 10 mill.
--   treasury_base_per_day 10 mill. (innskudd per ekte døgn, treasury_limit leser den)
--   scrap_fee_per_t 50 (speilet i net/scrapIncome.ts), slag_fee_per_t 500, maint_cap_per_t 100, bid_min 100 000
-- Konsernkassene deles på 10 med en post «justering» i boka. Det avgjorte anbudet står som historie.
-- Tørrkjøringen: ti kasser (100 → 10, 200 → 20 mill.), toppspillerens utbytte 36,7 mill./dag, skraplageret 14,8 mill./dag.
do $$
declare r record; n int := 0;
begin
  update public.config set value = value
    || jsonb_build_object('treasury_base_per_day', 10000000, 'scrap_fee_per_t', 50, 'slag_fee_per_t', 500, 'maint_cap_per_t', 100, 'bid_min', 100000)
    || jsonb_build_object('dividend', (value->'dividend')
         || jsonb_build_object('base', jsonb_build_object('stalverk', 500000, 'storverk', 2000000, 'kompleks', 6000000), 'load_from', 10000000))
  where id = 'world';
  for r in select t.user_id, t.balance from public.treasury t where t.balance > 0 loop
    update public.treasury set balance = round(r.balance / 10), updated_at = now() where user_id = r.user_id;
    insert into public.treasury_ledger (user_id, amount, kind, ref) values (r.user_id, -(r.balance - round(r.balance / 10)), 'justering', 'B-311: verden 10x ned');
    n := n + 1;
  end loop;
  raise notice 'Verden 10x ned: % kasser justert', n;
end $$;
