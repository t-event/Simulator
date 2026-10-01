-- Tester for utkastet 103 (V0/K-1 i skygge, B-409). Kjøres ALLTID i én transaksjon som rulles tilbake:
--
--   begin;
--   <innholdet i 103_v0_k1_skygge.sql>
--   <innholdet i denne fila>
--   select name, ok, detail from t_res order by n;
--   rollback;
--
-- Ingenting blir liggende: tabellene, funksjonene, config-endringen og radene forsvinner med rollback. Testene leser
-- ekte utbytte og bidrag (bare lesing) og skriver skyggerader for ekte spillere inne i transaksjonen.

create temp table t_res (n serial, name text, ok boolean, detail text) on commit drop;

do $$
declare
  c jsonb;
  v numeric;
  sh jsonb;
  n int;
  n2 int;
  uid uuid;
  d date;
  today date := public.world_today();
  g numeric;
  reg text;
  ev_id bigint;
  row_ public.program_shadow_day;
  rep jsonb;
  pl jsonb;
  before_div numeric;
  before_tre numeric;
  before_con numeric;
  before_fund numeric;
  after_div numeric;
  after_tre numeric;
  after_con numeric;
  after_fund numeric;
  per_region numeric;
  boom_share numeric;
  min_gap int;
  bad_len int;
begin
  -- 1. Innstillingene ligger der, og ingen bryter er på
  c := public.world_programs_config();
  insert into t_res (name, ok, detail) values ('config: brytere av, skygge på',
    (c ->> 'enabled')::boolean = false and (c ->> 'events_enabled')::boolean = false
      and (c ->> 'events_shadow')::boolean = true and (c -> 'budget' ->> 2)::numeric = 0.04
      and (c ->> 'protect')::numeric = 0.8,
    c::text);

  -- 2. Høykonjunkturen: samme tall som k1BoomSize i simulatoren (0,3040)
  v := public.world_event_boom_size(c);
  insert into t_res (name, ok, detail) values ('høykonjunktur = k1BoomSize', abs(v - 0.30402) < 0.0001, v::text);

  -- 3. Vinter nov.–mars
  insert into t_res (name, ok, detail) values ('vinter nov.–mars',
    public.world_is_winter(date '2026-11-01') and public.world_is_winter(date '2027-03-31')
      and not public.world_is_winter(date '2026-10-31') and not public.world_is_winter(date '2027-04-01'), '');

  -- 4. Regionandelene: to storverk i Nord, ett stålverk i Vest, ett som bygges (ikke med)
  sh := public.dividend_region_shares('{"konsern": {"plants": [
      {"type": "storverk", "level": 0, "region": "nord"},
      {"type": "storverk", "level": 0, "region": "nord"},
      {"type": "stalverk", "level": 0, "region": "vest"},
      {"type": "kompleks", "level": 0, "region": "ost", "project": {"kind": "bygg"}}]}}'::jsonb);
  -- 20 + 20/1,1 = 38,18 mill. mot 5/1,2 = 4,17 mill. → 0,9016 / 0,0984
  insert into t_res (name, ok, detail) values ('regionandeler som dividend_from_state',
    abs((sh ->> 'nord')::numeric - 0.901606) < 0.00001 and abs((sh ->> 'vest')::numeric - 0.098394) < 0.00001
      and not (sh ? 'ost'),
    sh::text);
  insert into t_res (name, ok, detail) values ('regionandeler: tomt konsern gir {}',
    public.dividend_region_shares('{}'::jsonb) = '{}'::jsonb, '');

  -- 5. Trekningen: én hendelse per region, alltid varslet to dager før, lengder i intervallet, ikke to ganger samme dag
  perform setseed(0.42);
  n := public.world_events_ensure(today);
  n2 := public.world_events_ensure(today);
  insert into t_res (name, ok, detail) values ('trekning: 6 regioner, ikke to ganger',
    n = 6 and n2 = 0 and (select count(*) from public.world_events) = 6, n || ' / ' || n2);
  insert into t_res (name, ok, detail) values ('trekning: varslet minst 2 dager før, shadow',
    not exists (select 1 from public.world_events where starts_on < today + 2 or warn_on <> starts_on - 2 or not shadow), '');
  select count(*) into bad_len from public.world_events
  where (kind = 'strom' and (ends_on - starts_on not between 8 and 12 or size <> 0.4))
     or (kind = 'uro' and (ends_on - starts_on not between 5 and 9 or size <> 0.35))
     or (kind = 'konjunktur' and (ends_on - starts_on not between 10 and 16 or abs(size - 0.304) > 0.001));
  insert into t_res (name, ok, detail) values ('trekning: lengde og størrelse per type', bad_len = 0, bad_len::text);

  -- 6. Skyggeloggen for én ekte spiller med utbytte, med en egen hendelse i regionen der hen har mest
  select dv.user_id, dv.day, dv.amount + coalesce(dv.to_fund, 0) into uid, d, g
  from public.dividends dv where dv.amount + coalesce(dv.to_fund, 0) > 0 order by dv.day desc limit 1;
  sh := public.dividend_region_shares((select state from public.saves where user_id = uid));
  select key into reg from jsonb_each_text(sh) order by value::numeric desc limit 1;
  insert into public.world_events (region, kind, size, warn_on, starts_on, ends_on)
  values (reg, 'strom', 0.4, d - 2, d, d + 10) returning id into ev_id;

  select sum(amount) into before_div from public.dividends;
  select sum(balance) into before_tre from public.treasury;
  select sum(amount) into before_con from public.contributions;
  select sum(fund) into before_fund from public.konsern;

  insert into t_res (name, ok, detail) values ('logg: første gang true, så false',
    public.program_shadow_log_day(uid, d) and not public.program_shadow_log_day(uid, d), '');
  select * into row_ from public.program_shadow_day where user_id = uid and day = d;
  insert into t_res (name, ok, detail) values ('logg: brutto = kasse + fond',
    row_.gross = round(g), row_.gross || ' / ' || g);
  -- Tapet = brutto × andel × 0,4 (pluss eventuelle andre strømsjokk samme dag – det finnes ingen i en tom tabell)
  insert into t_res (name, ok, detail) values ('logg: strømsjokk-tap = brutto × andel × 0,4',
    abs(row_.strom_loss - round(g * (sh ->> reg)::numeric * 0.4)) <= 1,
    row_.strom_loss || ' vs ' || round(g * (sh ->> reg)::numeric * 0.4));
  insert into t_res (name, ok, detail) values ('logg: eksponering skrevet',
    exists (select 1 from public.world_event_exposure where event_id = ev_id and user_id = uid and day = d
              and effect_none = -round(g * (sh ->> reg)::numeric * 0.4)), '');

  -- 7. Skyggejobben: logger alle dager fra shadow_from, er idempotent og rører ikke pengene
  update public.config set value = jsonb_set(value, '{programs,shadow_from}', to_jsonb(today - 3)) where id = 'world';
  perform public.world_shadow_tick();
  select count(*) into n from public.program_shadow_day;
  perform public.world_shadow_tick();
  select count(*) into n2 from public.program_shadow_day;
  insert into t_res (name, ok, detail) values ('skyggejobb: logger dagene med utbytte, idempotent',
    n > 0 and n = n2
      and n = (select count(*) from public.dividends dv where dv.day >= today - 3 and dv.day < today
                 and not public.user_is_guest(dv.user_id)) + (case when d < today - 3 then 1 else 0 end),
    n || ' / ' || n2);
  insert into t_res (name, ok, detail) values ('skyggejobb: world_health «skygge» uten feil',
    exists (select 1 from public.world_jobs where job = 'skygge' and failed_units = 0 and last_ok_at is not null),
    coalesce((select failed_units::text from public.world_jobs where job = 'skygge'), 'mangler'));

  select sum(amount) into after_div from public.dividends;
  select sum(balance) into after_tre from public.treasury;
  select sum(amount) into after_con from public.contributions;
  select sum(fund) into after_fund from public.konsern;
  insert into t_res (name, ok, detail) values ('ingen penger flyttet (utbytte, kasse, bidrag, fond)',
    before_div = after_div and before_tre = after_tre and before_con = after_con and before_fund = after_fund, '');

  -- 8. Skygge av: jobben gjør ingenting
  update public.config set value = jsonb_set(value, '{programs,events_shadow}', 'false') where id = 'world';
  select count(*) into n from public.world_events;
  perform public.world_shadow_tick();
  insert into t_res (name, ok, detail) values ('skygge av: ingen trekning',
    (select count(*) from public.world_events) = n, '');
  update public.config set value = jsonb_set(value, '{programs,events_shadow}', 'true') where id = 'world';

  -- 9. Rapporten: struktur, kostnad = sats × brutto, spart = 80 % × effekt × tap
  rep := public.program_shadow_report();
  pl := (select x from jsonb_array_elements(rep -> 'spillere') x
         where x ->> 'spiller' = (select coalesce(nickname, 'Ukjent') from public.profiles where id = uid));
  insert into t_res (name, ok, detail) values ('rapport: datamengde, hendelser og spillere',
    rep ? 'datamengde' and rep ? 'hendelser' and jsonb_array_length(rep -> 'spillere') > 0
      and jsonb_array_length(pl -> 'satssett') = 2,
    left(rep::text, 300));
  insert into t_res (name, ok, detail) values ('rapport: Teknologi Høy = 4 % / 8 % av utbyttet, spart = 0,8 × tap',
    abs((pl -> 'satssett' -> 0 -> 'programmer' -> 'teknologi' -> 2 ->> 'kostnad')::numeric
        - round(0.04 * (pl ->> 'utbytte')::numeric)) <= 1
    and abs((pl -> 'satssett' -> 1 -> 'programmer' -> 'teknologi' -> 2 ->> 'kostnad')::numeric
        - round(0.08 * (pl ->> 'utbytte')::numeric)) <= 1
    and abs((pl -> 'satssett' -> 0 -> 'programmer' -> 'teknologi' -> 2 ->> 'spart')::numeric
        - round(0.8 * (pl -> 'uten_program' ->> 'strom_tap')::numeric)) <= 1,
    (pl -> 'satssett' -> 0 -> 'programmer' -> 'teknologi' -> 2)::text);
  -- Kostnaden avhenger bare av utbyttet, ikke av hendelsene (k1CostCheck) eller bidraget (k1BaseCheck)
  insert into t_res (name, ok, detail) values ('rapport: kostnad uavhengig av hendelser og bidrag',
    (select bool_and(abs((x -> 'satssett' -> 0 -> 'programmer' -> 'robusthet' -> 1 ->> 'kostnad')::numeric
                          - round(0.015 * (x ->> 'utbytte')::numeric)) <= 1)
     from jsonb_array_elements(rep -> 'spillere') x), '');
  insert into t_res (name, ok, detail) values ('rapport: nye satser i ettertid (p_budgets)',
    (public.program_shadow_report(null, null, '[[0.02, 0.05, 0.1]]'::jsonb) -> 'spillere' -> 0 -> 'satssett' -> 0
       -> 'satser' ->> 2)::numeric = 0.1, '');

  -- 10. Fordelingen over ti år (sist, siden den fyller tabellen): ca. 6,5 hendelser per region og år, halvparten
  --     høykonjunktur, aldri to samtidig i en region, minst 22 dager mellom to hendelser i samme region
  perform setseed(0.7);
  for i in 1 .. 3650 loop
    perform public.world_events_ensure(today + i);
  end loop;
  select count(*)::numeric / 6 / 10 into per_region from public.world_events where starts_on > today + 30;
  select avg((kind = 'konjunktur')::int) into boom_share from public.world_events where starts_on > today + 30;
  select min(gap) into min_gap from (
    select starts_on - lag(ends_on) over (partition by region order by starts_on) as gap
    from public.world_events where id <> ev_id) x where gap is not null;
  insert into t_res (name, ok, detail) values ('fordeling: ca. 6,5 per region og år',
    per_region between 5.5 and 7.5, round(per_region, 2)::text);
  insert into t_res (name, ok, detail) values ('fordeling: ca. 46 % høykonjunktur (vinter 40, ellers 50)',
    boom_share between 0.38 and 0.54, round(boom_share, 3)::text);
  insert into t_res (name, ok, detail) values ('fordeling: aldri overlapp, minst 22 dager mellom',
    min_gap >= 22, min_gap::text);
exception when others then
  insert into t_res (name, ok, detail) values ('UVENTET FEIL', false, sqlerrm);
end;
$$;
