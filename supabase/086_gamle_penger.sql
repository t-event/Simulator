-- B-374: bud fra før økonomien ble delt på 10 (B-311, 29.9.2026 kl. 02:44:52 UTC) regnes i dagens penger.
-- Konsernkassene ble delt på 10 etter at skraplageranbudet (200 mill.) var avgjort. Vinneren hadde alt betalt, så
-- delingen tok ingenting fra ham – i dagens penger kostet budet 20 mill. Budet står urørt i `tenders` (historie);
-- bare gulvet i verdien av selskapet bruker tallet i dagens penger. Appen viser det samme (`bidInNewMoney`).

-- Et bud i dagens penger: en tidel for anbud som ble avgjort før B-311
create or replace function public.bid_in_new_money(p_amount numeric, p_closed timestamptz)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case when p_closed < timestamptz '2026-09-29 02:44:52+00' then p_amount / 10 else p_amount end;
$$;
revoke execute on function public.bid_in_new_money(numeric, timestamptz) from public, anon, authenticated;

-- Verdien av et selskap: 30 dagers inntekt, men minst det det sist ble vunnet for (i dagens penger)
create or replace function public.company_value(p_company int)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    public.control_cfg_num('value_days', 30) * coalesce(public.company_estimate(p_company), 0),
    coalesce((select public.bid_in_new_money(winning_bid, closes_at) from public.tenders
              where company_id = p_company and status = 'avgjort'
              order by closes_at desc limit 1), 0),
    1);
$$;
revoke execute on function public.company_value(int) from public, anon, authenticated;
