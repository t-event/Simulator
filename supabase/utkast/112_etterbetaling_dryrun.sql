-- B-423/B-425: dry-run av etterbetalingen for utbyttet 30.9 og 1.10 – bare lesing, betaler ingenting. Kjøres i én
-- transaksjon som rulles tilbake (temp-tabellene forsvinner):  begin; <denne fila>; rollback;
-- Utgave 2 (2.10.2026, B-425), etter kodegjennomgangen. Utgave 1 angret hver ordre på dagens verk, så en bygging
-- fulgt av en utbygging ga grunnlaget for et storverk (fire ganger for mye), og en modernisering fulgt av en utbygging
-- kunne gi null. Resultatet står i docs/RAPPORT-2026-10-02.md, avsnitt 7, med bokstaver i stedet for navn.
-- Utgave 3 (2.10.2026, B-431), etter etterkontrollen:
-- * Leser bare det frosne grunnlaget (`basis_112_*`, migrasjon 117), så summen ikke endrer seg når spillerne spiller
--   videre. Stopper hvis `config.world.dividend` er endret siden grunnlaget ble tatt (funksjonene leser den), eller hvis
--   en av funksjonene er endret (kontrollsummene i `basis_112_functions`, migrasjon 118, B-433).
-- * En utbygging nullstiller nivået (`konsern_after`). Å angre den gir nå verket nivået det hadde før: modernisering-
--   ene på verket etter forrige bygging eller utbygging. Før ble bare typen satt tilbake, så modernisering → utbygging
--   ga feil grunnlag (et testtilfelle ga 315 000 kr mot riktige 341 250 kr). Et eldre verk uten bygging på serveren
--   kan ha hatt nivå fra før (064); det regnes som 0 og merkes `nivaa_usikkert`.
-- * Refusjoner regnes ikke lenger som tegn på at spilleren var i spillet: serveren lager dem selv (tapte anbud,
--   prisfall).
--
-- Slik regnes det:
-- 1. Forskjellen per ordre: alle ferdige ordre for spilleren angres i rekkefølge fra den nyeste (også ordre etter 2.10),
--    så hver ordre angres på verket slik det var rett etter at den ble ferdig. delta = dividend_from_state(etter) -
--    dividend_from_state(før). Ordre på et verk som ikke finnes lenger, får ok = false og regnes ikke.
-- 2. Andelen av døgnet ordren ble målt som før: fra ready_at til det første tegnet på at verket ble gjort ferdig –
--    første tidslinjerad etter ready_at, en ny ordre eller en postering spilleren selv utløste (prosjekt, investering,
--    anbud) – og høyst til midnatt. Verket kan ha blitt gjort ferdig tidligere (world_status gjør det uten at
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
  ok boolean, level_unsure boolean) on commit drop;

do $$
declare
  u record;
  rec record;
  st jsonb;
  before jsonb;
  prev_build timestamptz;
  lvl int;
  unsure boolean;
begin
  if (select config_world -> 'dividend' from public.basis_112_meta)
     is distinct from (select value -> 'dividend' from public.config where id = 'world') then
    raise exception 'config.world.dividend er endret siden grunnlaget ble tatt (basis_112_meta): 112 må regnes på nytt';
  end if;
  -- Funksjonene 112 regner med, slik de var da grunnlaget ble tatt (118, B-433)
  if exists (select 1 from public.basis_112_functions f
             where f.checksum is distinct from (select md5(pg_get_functiondef(f.signature::regprocedure)))) then
    raise exception 'en av funksjonene 112 bruker, er endret siden grunnlaget ble tatt (basis_112_functions)';
  end if;
  for u in select user_id from public.basis_112_users loop
    select b.state into st from public.basis_112_state b where b.user_id = u.user_id;
    for rec in
      select * from public.basis_112_orders o2
      where o2.user_id = u.user_id and o2.status = 'ferdig' and o2.kind in ('bygg', 'modernisering', 'utbygging')
      order by o2.ready_at desc, o2.id desc
    loop
      if st is null or not exists (select 1 from jsonb_array_elements(st -> 'konsern' -> 'plants') p
                                   where (p ->> 'id')::int = rec.plant_id) then
        insert into t_delta values (u.user_id, rec.id, rec.kind, rec.plant_id, rec.ready_at, null, false, false);
        continue;
      end if;
      lvl := null;
      unsure := false;
      if rec.kind = 'utbygging' then
        -- Nivået før utbyggingen: moderniseringene på verket siden forrige bygging eller utbygging
        select max(b.ready_at) into prev_build from public.basis_112_orders b
        where b.user_id = u.user_id and b.plant_id = rec.plant_id and b.status = 'ferdig'
          and b.kind in ('bygg', 'utbygging') and (b.ready_at, b.id) < (rec.ready_at, rec.id);
        select count(*) into lvl from public.basis_112_orders m
        where m.user_id = u.user_id and m.plant_id = rec.plant_id and m.status = 'ferdig' and m.kind = 'modernisering'
          and (m.ready_at, m.id) < (rec.ready_at, rec.id) and m.ready_at > coalesce(prev_build, '-infinity');
        unsure := prev_build is null;
      end if;
      before := jsonb_set(st, '{konsern,plants}', (
        select jsonb_agg(case when (p ->> 'id')::int = rec.plant_id then
                 case rec.kind
                   when 'bygg' then p || '{"project": {"kind": "bygg"}}'::jsonb
                   when 'modernisering' then p || jsonb_build_object('level', greatest(0, coalesce((p ->> 'level')::int, 0) - 1))
                   else p || jsonb_build_object('type', 'stalverk', 'level', lvl)
                 end else p end order by i)
        from jsonb_array_elements(st -> 'konsern' -> 'plants') with ordinality t(p, i)));
      insert into t_delta values (u.user_id, rec.id, rec.kind, rec.plant_id, rec.ready_at,
        public.dividend_from_state(st) - public.dividend_from_state(before), true, unsure);
      st := before;
    end loop;
  end loop;
end $$;

create temp table t_res on commit drop as
with w as (
  select d.*, public.world_day(d.ready_at) dag,
    ((public.world_day(d.ready_at) + 1)::timestamp at time zone 'Europe/Oslo') day_end,
    (select min(sn.at) from public.basis_112_snapshots sn where sn.user_id = d.user_id and sn.at > d.ready_at) snap,
    least(
      (select min(o2.created_at) from public.basis_112_orders o2 where o2.user_id = d.user_id and o2.created_at > d.ready_at),
      (select min(l.at) from public.basis_112_ledger l where l.user_id = d.user_id and l.at > d.ready_at
         and l.kind in ('prosjekt', 'investering', 'anbud'))) action_at
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
    bool_or(level_unsure) level_unsure,
    bool_or(action_at is not null and action_at < coalesce(snap, day_end)) earlier_action
  from f group by user_id, dag
)
select pd.*, dv.amount paid,
  (select c.sum_div / c.n_div from public.basis_112_samples c where c.user_id = pd.user_id and c.day = pd.dag and c.n_div > 0) base,
  fa.keep, fa.act
from per_day pd
left join public.basis_112_dividends dv on dv.user_id = pd.user_id and dv.day = pd.dag
left join public.basis_112_factors fa on fa.user_id = pd.user_id and fa.day = pd.dag;

-- nr = plassen etter konsernkassa da grunnlaget ble tatt (1 = A, 2 = B …), som i rapporten
select r.nr, t.dag, t.n_orders, round(t.max_fr, 2) maks_andel, t.all_ok verk_finnes, t.earlier_action,
  t.level_unsure nivaa_usikkert,
  round(t.paid) betalt,
  round((public.dividend_to_treasury(t.base + coalesce(t.add_base, 0), t.keep) - public.dividend_to_treasury(t.base, t.keep))
        * t.act) differanse,
  round(t.paid - public.dividend_to_treasury(t.base, t.keep) * t.act) paid_check
from t_res t
left join (select user_id, row_number() over (order by balance desc) nr from public.basis_20261002_treasury) r using (user_id)
order by r.nr, t.dag;
