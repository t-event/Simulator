-- Stålverket: innskuddet i konsernkassa tas bort (B-319, steg 2 av KONSERNBIDRAG.md).
--
-- Hovedverkets bidrag (B-318, 061) fyller konsernkassa automatisk hver ekte dag, så den manuelle slusa på 10 mill. per
-- ekte døgn (B-311) trengs ikke lenger. Grensen settes til 0: treasury_limit gir 0, deposit_to_treasury avviser med
-- «grense», og appen fra B-319 skjuler innskuddet når grensen er 0. Det som alt er skutt inn, står. Kjøres etter at
-- appen er publisert (B-303-regelen).

update public.config
set value = value || jsonb_build_object('treasury_base_per_day', 0)
where id = 'world';
