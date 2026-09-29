-- B-337: eierens svar 3 i B-332 rettet. Den som forvalter et strategisk selskap, skal kunne miste det ved overtakelse
-- – å passe godt på gjør det bare dyrere. Klarer ingen å ta det over, gjelder 14-dagersregelen som før: konsesjonen går
-- ut, og alle stiller likt i det nye anbudet.
-- 1. Angriperens bud teller nå inntil 10 × verdien (`attack_cap`); forsvaret teller fortsatt høyst 3 × verdien (`cap`).
--    Sterkeste forsvar er 100 + 40 × √3 ≈ 169; et aktivt angrep med 10 × verdien gir 60 × √10 ≈ 190. Et stort nok bud
--    vinner derfor alltid for en angriper som spiller.
-- 2. Fordelen i fornyelsesanbudet (Kontroll × 0,2 %, B-334) er tatt bort: `renewal_max` = 0. Koden står.
-- Speilet i `frontend/src/game/control.ts`.

update public.config
set value = jsonb_set(value, '{takeover,attack_cap}', '10'::jsonb)
where id = 'world' and value ? 'takeover';

update public.config
set value = jsonb_set(value, '{control,renewal_max}', '0'::jsonb)
where id = 'world' and value ? 'control';

create or replace function public.takeover_attack_of(p_bid numeric, p_value numeric, p_activity numeric, p_region int)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select public.takeover_cfg_num('attack_w', 60)
         * sqrt(least(p_bid, public.takeover_cfg_num('attack_cap', 10) * p_value) / greatest(1, p_value))
         * (0.5 + 0.5 * least(1, greatest(0, p_activity)))
       + least(public.takeover_cfg_num('region_max', 10), public.takeover_cfg_num('region_per', 2.5) * p_region);
$$;
revoke execute on function public.takeover_attack_of(numeric, numeric, numeric, int) from public, anon, authenticated;
