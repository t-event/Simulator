-- B-446: etterbetaling av utbyttet 30.9 og 1.10. Eieren godkjente beløpet 3.10.2026 («Ja» til 2 549 252 kr, og «Jeg
-- godkjenner at du gjør det»).
--
-- Beløpene regnes av nøyaktig samme beregning som dry-run-en (`utkast/112_etterbetaling_dryrun.sql`, utgave 3), på det
-- frosne grunnlaget fra 2.10 (`basis_112_*`). Dry-run 3.10: 2 549 252 kr til elleve spillere, 15 rader (spiller og dag).
-- * Én rad per spiller og dag i `dividend_backpay` (primærnøkkel = vern mot dobbel betaling). Kassa krediteres bare når
--   raden ble satt inn, og kassaboka får en linje (`justering`, ref «etterbetaling utbytte <dag>»).
-- * Stopper uten å betale noe hvis summen ikke er den eieren godkjente (`expected_total`).
-- * Bare positive differanser betales; ingen trekkes.

create table if not exists public.dividend_backpay (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  amount numeric not null check (amount > 0),
  paid_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.dividend_backpay enable row level security;
revoke all on public.dividend_backpay from anon, authenticated;

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


do $pay$
declare
  expected_total constant numeric := 2549252;
  r record;
  total numeric;
  n int := 0;
begin
  select coalesce(sum(round((public.dividend_to_treasury(t.base + coalesce(t.add_base, 0), t.keep)
                             - public.dividend_to_treasury(t.base, t.keep)) * t.act)), 0)
    into total from t_res t;
  if total <> expected_total then
    raise exception 'etterbetalingen er % kr, ikke de godkjente % kr – ingenting er betalt', total, expected_total;
  end if;
  for r in
    select t.user_id, t.dag,
           round((public.dividend_to_treasury(t.base + coalesce(t.add_base, 0), t.keep)
                  - public.dividend_to_treasury(t.base, t.keep)) * t.act) amount
    from t_res t
  loop
    continue when r.amount <= 0;
    insert into public.dividend_backpay (user_id, day, amount) values (r.user_id, r.dag, r.amount)
    on conflict do nothing;
    if found then
      perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || r.user_id::text));
      update public.treasury set balance = balance + r.amount, updated_at = now() where user_id = r.user_id;
      insert into public.treasury_ledger (user_id, amount, kind, ref)
      values (r.user_id, r.amount, 'justering', 'etterbetaling utbytte ' || r.dag);
      n := n + 1;
    end if;
  end loop;
  raise notice 'etterbetalt: % rader, % kr', n, total;
end $pay$;
