-- B-423: dry-run av etterbetalingen for utbyttet 30.9 og 1.10 (bare lesing – betaler ingenting).
-- Kjørt 2.10.2026 ca. 12:05 UTC. Resultatet står i docs/RAPPORT-2026-10-02.md, avsnitt 7, med bokstaver i stedet for navn.
-- Type a: verk som ble ferdige (bygg, modernisering, utbygging) før midnatt, men ble målt som før prosjektet til spilleren
--   lagret (eller til midnatt). Andelen f = tiden fra ferdig til første lagring, av døgnet. Forskjellen i utbytte for
--   verket ganges med f og legges på snittet; politikk og aktivitet som i pay_dividends.
-- Type b: dager med utbyttemålinger, men uten betaling (den som solgte sitt siste verk). Ingen rader 29.9–1.10.
-- Usikkerhet: dagens lagrede spill brukes for gamle dager (omdømme, kvalitet, forskning, politikk kan ha endret seg).
-- Ingen betaling uten eierens godkjenning. En betaling skrives som egen migrasjon med on conflict-vern og logg.
with o as (
  select o.id, o.user_id, o.kind, o.plant_id, o.ready_at, public.world_day(o.ready_at) d,
         ((public.world_day(o.ready_at) + 1)::timestamp at time zone 'Europe/Oslo') day_end,
         (select min(sn.at) from snapshots sn where sn.user_id = o.user_id and sn.at > o.ready_at) first_save
  from konsern_orders o
  where o.ready_at < timestamptz '2026-10-02 00:00+02' and o.status = 'ferdig' and o.kind in ('bygg','modernisering','utbygging')
),
w as (
  select o.*, least(coalesce(o.first_save, o.day_end), o.day_end) settle_at,
         greatest(0, least(1, extract(epoch from (least(coalesce(o.first_save, o.day_end), o.day_end) - o.ready_at)) / 86400.0)) f,
         s.state
  from o join saves s on s.user_id = o.user_id
),
delta as (
  select w.*,
    public.dividend_from_state(w.state) - public.dividend_from_state(
      jsonb_set(w.state, '{konsern,plants}', coalesce((
        select jsonb_agg(case when (p->>'id')::int = w.plant_id then
                 case w.kind
                   when 'bygg' then p || jsonb_build_object('project', jsonb_build_object('kind','bygg'))
                   when 'modernisering' then p || jsonb_build_object('level', greatest(0, coalesce((p->>'level')::int,0) - 1))
                   when 'utbygging' then p || jsonb_build_object('type', case p->>'type' when 'kompleks' then 'storverk' else 'stalverk' end)
                 end
               else p end order by i)
        from jsonb_array_elements(w.state->'konsern'->'plants') with ordinality t(p,i)), '[]'::jsonb))) dplant,
    exists (select 1 from jsonb_array_elements(w.state->'konsern'->'plants') p where (p->>'id')::int = w.plant_id) plant_exists
  from w
),
per_day as (
  select user_id, d, count(*) n_orders, sum(f * dplant) add_base, max(f) max_f, bool_and(plant_exists) all_exist
  from delta where f > 0 group by user_id, d
),
a as (
  select pd.user_id, pd.d, 'a' typ, pd.n_orders, pd.max_f, pd.all_exist,
         coalesce(dv.amount, 0) paid,
         round(public.dividend_to_treasury(public.dividend_avg(pd.user_id, pd.d) + pd.add_base, public.policy_keep(pd.user_id)) * public.activity_factor(pd.user_id, pd.d)) korrigert
  from per_day pd left join dividends dv on dv.user_id = pd.user_id and dv.day = pd.d
),
b as (
  select c.user_id, c.day d, 'b' typ, 0 n_orders, null::numeric max_f, true all_exist, 0 paid,
         round(public.dividend_to_treasury(c.sum_div / c.n_div, public.policy_keep(c.user_id)) * public.activity_factor(c.user_id, c.day)) korrigert
  from contribution_samples c
  where c.day between date '2026-09-29' and date '2026-10-01' and c.sum_div > 0 and c.n_div > 0
    and not exists (select 1 from dividends dd where dd.user_id = c.user_id and dd.day = c.day)
)
select x.typ, dense_rank() over (order by x.user_id) spiller, x.d, x.n_orders, round(x.max_f, 2) maks_andel, x.all_exist verk_finnes,
       round(x.paid) betalt, x.korrigert, round(x.korrigert - x.paid) differanse
from (select * from a union all select * from b) x
order by spiller, d, typ;
