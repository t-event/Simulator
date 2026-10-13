-- B-486: mekanisk verksted (B-256) åpnes, med eierens andel 0,2 av vedlikeholdet som teller (var 0,5).
-- Eieren (13.10): «Åpne mekanisk verksted. Velg modell for meg.» Med 0,5 ble anslaget ca. 17–25 mill. kr per dag – mer
-- enn skraplageret og slagghåndteringen (ca. 20 mill.), fordi kronene for vedlikehold ikke ble delt på ti da resten av
-- økonomien ble det (B-311). Med 0,2 blir anslaget ca. 7 mill. per dag: det minste og billigste selskapet, slik B-256
-- mente det, og et selskap mellomstore konsern kan by på.
-- Anbudet åpnes av verdensjobben (`verden-tick`, hvert 5. minutt) når selskapet er aktivt og ikke har eier.
update public.config set value = jsonb_set(value, '{workshop_share}', '0.2') where id = 'world';
update public.companies set active = true where type = 'verksted';
select public.company_estimate_refresh(true);
