-- B-423/B-425: dry-run av etterbetalingen for utbyttet 30.9 og 1.10 – bare lesing, betaler ingenting. Kjøres i én
-- transaksjon som rulles tilbake (temp-tabellene forsvinner):  begin; <denne fila>; rollback;
-- Utgave 2 (2.10.2026, B-425), etter kodegjennomgangen. Utgave 1 angret hver ordre på dagens verk, så en bygging
-- fulgt av en utbygging ga grunnlaget for et storverk (fire ganger for mye), og en modernisering fulgt av en utbygging
-- kunne gi null. Resultatet står i docs/RAPPORT-2026-10-02.md, avsnitt 7, med bokstaver i stedet for navn.
--
-- Slik regnes det:
-- 1. Forskjellen per ordre: alle ferdige ordre for spilleren angres i rekkefølge fra den nyeste (også ordre etter 2.10),
--    så hver ordre angres på verket slik det var rett etter at den ble ferdig. delta = dividend_from_state(etter) -
--    dividend_from_state(før). Ordre på et verk som ikke finnes lenger, får ok = false og regnes ikke.
-- 2. Andelen av døgnet ordren ble målt som før: fra ready_at til det første tegnet på at verket ble gjort ferdig –
--    første tidslinjerad etter ready_at, en ny ordre eller en postering spilleren selv utløste (prosjekt, investering,
--    anbud, refusjon) – og høyst til midnatt. Verket kan ha blitt gjort ferdig tidligere (world_status gjør det uten at
--    appen laster opp), og serveren lagrer ikke de enkelte målingene, så andelen er en øvre grense for tidsvinduet.
-- 3. Grunnlaget er snittet av målingene den dagen (sum_div / n_div) – det samme som ble betalt (paid_check = 0).
--    Differansen = (dividend_to_treasury(grunnlag + Σ andel × delta) - dividend_to_treasury(grunnlag)) × aktiviteten.
--
-- Usikkerhet (summen er et anslag, ikke en fasit – den kan bli både for høy og for lav):
-- * Tidsvinduet er en øvre grense (punkt 2).
-- * delta regnes av dagens lagrede spill: forskning, mesterskap, felles funksjoner, flaggskipet, lasttaket og
--   politikken kan ha vært annerledes 30.9/1.10 og trekker begge veier.
-- * Målingene er ikke jevnt fordelt over døgnet (hvert 15. til 20. minutt, og flere bestillinger samme dag), så
--   andel av døgnet er ikke nøyaktig andel av målingene.
-- At grunnlaget gjenskaper betalingen, viser bare at utgangspunktet er riktig – ikke at korrigeringen er det.
-- Ingen betaling uten eierens godkjenning. En betaling skrives som egen migrasjon med on conflict-vern og logg.

create temp table t_delta (user_id uuid, order_id bigint, kind text, plant_id int, ready_at timestamptz, delta numeric,
  ok boolean) on commit drop;

do $$
declare
  u record;
  rec record;
  st jsonb;
  before jsonb;
begin
  for u in
    select distinct ko.user_id from public.konsern_orders ko
    where ko.status = 'ferdig' and ko.kind in ('bygg', 'modernisering', 'utbygging')
      and ko.ready_at < timestamptz '2026-10-02 00:00+02'
  loop
    select jsonb_set(s.state, '{konsern,plants}', k.plants) into st
    from public.saves s join public.konsern k on k.user_id = s.user_id where s.user_id = u.user_id;
    for rec in
      select * from public.konsern_orders o2
      where o2.user_id = u.user_id and o2.status = 'ferdig' and o2.kind in ('bygg', 'modernisering', 'utbygging')
      order by o2.ready_at desc, o2.id desc
    loop
      if not exists (select 1 from jsonb_array_elements(st -> 'konsern' -> 'plants') p
                     where (p ->> 'id')::int = rec.plant_id) then
        insert into t_delta values (u.user_id, rec.id, rec.kind, rec.plant_id, rec.ready_at, null, false);
        continue;
      end if;
      before := jsonb_set(st, '{konsern,plants}', (
        select jsonb_agg(case when (p ->> 'id')::int = rec.plant_id then
                 case rec.kind
                   when 'bygg' then p || '{"project": {"kind": "bygg"}}'::jsonb
                   when 'modernisering' then p || jsonb_build_object('level', greatest(0, coalesce((p ->> 'level')::int, 0) - 1))
                   else p || jsonb_build_object('type', case p ->> 'type' when 'kompleks' then 'storverk' else 'stalverk' end)
                 end else p end order by i)
        from jsonb_array_elements(st -> 'konsern' -> 'plants') with ordinality t(p, i)));
      insert into t_delta values (u.user_id, rec.id, rec.kind, rec.plant_id, rec.ready_at,
        public.dividend_from_state(st) - public.dividend_from_state(before), true);
      st := before;
    end loop;
  end loop;
end $$;

create temp table t_res on commit drop as
with w as (
  select d.*, public.world_day(d.ready_at) dag,
    ((public.world_day(d.ready_at) + 1)::timestamp at time zone 'Europe/Oslo') day_end,
    (select min(sn.at) from public.snapshots sn where sn.user_id = d.user_id and sn.at > d.ready_at) snap,
    least(
      (select min(o2.created_at) from public.konsern_orders o2 where o2.user_id = d.user_id and o2.created_at > d.ready_at),
      (select min(l.at) from public.treasury_ledger l where l.user_id = d.user_id and l.at > d.ready_at
         and l.kind in ('prosjekt', 'investering', 'anbud', 'refusjon'))) action_at
  from t_delta d where d.ready_at < timestamptz '2026-10-02 00:00+02'
),
f as (
  select w.*,
    greatest(0, least(1, extract(epoch from (least(w.day_end, coalesce(w.snap, w.day_end), coalesce(w.action_at, w.day_end))
                                             - w.ready_at)) / 86400.0)) fr
  from w
),
per_day as (
  select user_id, dag, count(*) n_orders, sum(fr * delta) add_base, bool_and(ok) all_ok, max(fr) max_fr,
    bool_or(action_at is not null and action_at < coalesce(snap, day_end)) earlier_action
  from f group by user_id, dag
)
select pd.*, dv.amount paid,
  (select c.sum_div / c.n_div from public.contribution_samples c where c.user_id = pd.user_id and c.day = pd.dag and c.n_div > 0) base,
  public.policy_keep(pd.user_id) keep, public.activity_factor(pd.user_id, pd.dag) act
from per_day pd left join public.dividends dv on dv.user_id = pd.user_id and dv.day = pd.dag;

-- nr = plassen etter konsernkassa da grunnlaget ble tatt (1 = A, 2 = B …), som i rapporten
select r.nr, t.dag, t.n_orders, round(t.max_fr, 2) maks_andel, t.all_ok verk_finnes, t.earlier_action,
  round(t.paid) betalt,
  round((public.dividend_to_treasury(t.base + coalesce(t.add_base, 0), t.keep) - public.dividend_to_treasury(t.base, t.keep))
        * t.act) differanse,
  round(t.paid - public.dividend_to_treasury(t.base, t.keep) * t.act) paid_check
from t_res t
left join (select user_id, row_number() over (order by balance desc) nr from public.basis_20261002_treasury) r using (user_id)
order by r.nr, t.dag;
