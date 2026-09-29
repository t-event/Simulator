-- Stålverket (B-373, eierens ønske 30.9):
-- 1) Datterverkene koster en firedel: stålverk 5, storverk 20, stålkompleks 60 mill. Modernisering er fortsatt 30 % av
--    prisen, utbygging stålverk → storverk forskjellen (15 mill.). Før tok et kjøp 30–480 ekte dager å betale seg; nå 8–126.
-- 2) Bestillinger gjort etter 00:00 norsk tid 30.9 (29.9 22:00 UTC) får mellomlegget tilbake i konsernkassa, og prisen i
--    køen settes til den nye (så en avbestilling gir riktig beløp). Dry-run 30.9 kl. 01:27: fire bestillinger, 52,5 mill.
-- 3) Ingen pause etter et avverget oppkjøp: vernet på 3 dager gjelder bare når selskapet får ny eier.

update public.config
set value = jsonb_set(jsonb_set(value, '{konsern,price}',
                                '{"stalverk": 5000000, "storverk": 20000000, "kompleks": 60000000}'::jsonb),
                      '{takeover,cooldown_days}', '0'::jsonb)
where id = 'world';

with ny as (
  select o.id, o.user_id, o.cost,
         round(o.cost * case
           when o.kind = 'bygg' and o.type = 'stalverk' then 5.0 / 20
           when o.kind = 'bygg' and o.type = 'storverk' then 20.0 / 80
           when o.kind = 'bygg' and o.type = 'kompleks' then 60.0 / 250
           when o.kind = 'utbygging' then 15.0 / 60
           when o.kind = 'modernisering' then case p.type when 'stalverk' then 5.0 / 20 when 'storverk' then 20.0 / 80
                                                           else 60.0 / 250 end
           else 1 end) as new_cost
  from public.konsern_orders o
  left join lateral (select x ->> 'type' as type from public.konsern k, jsonb_array_elements(k.plants) x
                     where k.user_id = o.user_id and (x ->> 'id')::int = o.plant_id) p on true
  where o.created_at >= timestamptz '2026-09-29 22:00:00+00' and o.status in ('kø', 'i gang')
    and not exists (select 1 from public.treasury_ledger l where l.ref = 'prisfall:' || o.id)
), upd as (
  update public.konsern_orders o set cost = ny.new_cost from ny where o.id = ny.id and ny.new_cost < ny.cost
  returning o.id, o.user_id, ny.cost - ny.new_cost as back
), led as (
  insert into public.treasury_ledger (user_id, amount, kind, ref)
  select user_id, back, 'refusjon', 'prisfall:' || id from upd
  returning user_id, amount
)
update public.treasury t set balance = t.balance + s.back, updated_at = now()
from (select user_id, sum(amount) as back from led group by user_id) s
where t.user_id = s.user_id;
