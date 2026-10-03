-- B-445: slagghåndteringen slås på (eierens ja 3.10.2026, «Kjør på med alt du anbefaler»). Vilkårene i B-402 er oppfylt
-- (nattkontrollen grønn, grunnlaget bevart), og verdensjobbene sto «ok». world_tick åpnet det første anbudet (48 timer,
-- skjult) med én gang.
update public.companies set active = true where type = 'slagg';
