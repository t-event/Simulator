-- B-488: verksjefer for datterverkene – V1 (verksjef og mandat) og V2 (samtalene), docs/VERKSJEF-FORSLAG.md avsnitt 10.
-- Eieren 13.10: «Vi må bygge mer idag, folk har fortsatt ikke noe å gjøre» og valgte «Bygg nå» framfor å vente på
-- skyggerapporten 2.11 (B-409).
-- * Tre kandidater per konsern per ekte dag (manager_draw_candidates). Egenskapene Drift, Økonomi og Folk er 1–5,
--   summen 6–10 og aldri 5 på to. Trekket avgjør hva verksjefen velger når eieren ikke svarer.
-- * Mandat: Lønnsomhet (0,92 + 0,04 × snittet av Drift og Økonomi, men moderniseringen koster 20 % mer og tar 25 % lenger),
--   Vekst (0,95, men moderniseringen koster 13–25 % mindre og tar 14–30 % kortere), Stabilitet (0,98 + 0,01 × Folk, og
--   dårlige utfall i samtalene kommer halvparten så ofte). Lønn 3–6 % av verkets utbytte. Byttes høyst én gang i uka.
-- * Oppgjøret (managers_settle, jobben `verksjefer`): for hver dag utbyttet er betalt, får hvert verk med verksjef
--   andelen sin × det fulle utbyttet × (faktor − 1 − lønn), og samtalenes tidsbegrensede faktorer, ført som «justering»
--   (verksjef:<dag>) i konsernkassa. Uten verksjef skjer ingenting: utbyttet er nøyaktig som før.
-- * Avslutt: sluttpakke 5 dagers lønn og 3 dagers karantene for verket. Solgt eller byttet verk: verksjefen går.
-- * Samtalene: ca. hver 55.–84. time per konsern med verksjef, høyst én åpen, 48 timers frist, varsel på mobilen.
--   Engangsbeløp regnes i dager av verkets utbytte nå. Svarer eieren ikke, velger verksjefen etter trekket.
-- * Konsernverdien er uendret (som for programmene, B-392). Ingen Kontroll.
-- * Bryteren `config.world.managers.enabled` står av til appen er publisert.

-- Tallene og kortene (samme som MANAGERS og CALL_CARDS i game/managers.ts). Bryteren står av til appen er ute.
update public.config
set value = jsonb_set(value, '{managers}', jsonb_build_object(
  'enabled', false,
  'from', to_char(public.world_today(), 'YYYY-MM-DD'),
  'salary_min', 0.03, 'salary_max', 0.06, 'sum_min', 6, 'sum_max', 10,
  'vekst_factor', 0.95, 'lonn_mod_cost', 1.2, 'lonn_mod_time', 1.25,
  'severance_days', 5, 'quarantine_days', 3, 'mandate_days', 7,
  'call_deadline_h', 48, 'call_gap_h', jsonb_build_array(55, 84), 'card_repeat_days', 30, 'stability_risk', 0.5,
  'cards', '{"foring":{"title":"Ovnen bør fores om","options":[{"tags":["trygg"],"mandate":"stabilitet","sure":{"cash":-1},"risk":null},{"tags":["dristig","billig"],"mandate":"lonnsomhet","sure":{},"risk":{"chance":0.35,"effect":{"days":5,"factor":0.5}}}]},"lonn":{"title":"Lønnskrav","options":[{"tags":["trygg"],"mandate":"stabilitet","sure":{"days":10,"factor":0.97},"risk":null},{"tags":["dristig","billig"],"mandate":"lonnsomhet","sure":{},"risk":{"chance":0.3,"effect":{"days":3,"factor":0.3}}}]},"hastejobb":{"title":"Hastejobb","options":[{"tags":["dristig"],"mandate":"lonnsomhet","sure":{"days":3,"factor":1.25},"risk":{"chance":0.3,"effect":{"days":6,"factor":0.9}}},{"tags":["trygg","billig"],"mandate":"stabilitet","sure":{},"risk":null}]},"styring":{"title":"Ny styring av ovnene","options":[{"tags":["dristig"],"mandate":"vekst","sure":{"cash":-2,"days":14,"factor":1.15},"risk":null},{"tags":["trygg","billig"],"mandate":"lonnsomhet","sure":{},"risk":null}]},"laerling":{"title":"Lærlinger","options":[{"tags":["trygg"],"mandate":"vekst","sure":{"cash":-0.5,"days":10,"factor":1.06},"risk":null},{"tags":["billig"],"mandate":"lonnsomhet","sure":{},"risk":null}]},"strom":{"title":"Strømavtalen","options":[{"tags":["trygg"],"mandate":"stabilitet","sure":{"days":10,"factor":0.98},"risk":null},{"tags":["dristig","billig"],"mandate":"lonnsomhet","sure":{"days":10,"factor":1.06},"risk":{"chance":0.5,"effect":{"days":10,"factor":0.92}}}]},"messe":{"title":"Kundemesse","options":[{"tags":["dristig"],"mandate":"lonnsomhet","sure":{"cash":-0.3,"days":7,"factor":1.06},"risk":null},{"tags":["trygg","billig"],"mandate":"stabilitet","sure":{},"risk":null}]},"skrapparti":{"title":"Billig skrapparti","options":[{"tags":["dristig"],"mandate":"vekst","sure":{"cash":-1,"days":7,"factor":1.18},"risk":null},{"tags":["trygg","billig"],"mandate":"stabilitet","sure":{},"risk":null}]}}'::jsonb))
where id = 'world';

create table if not exists public.plant_managers (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plant_id integer not null,
  name text not null,
  drift smallint not null,
  okonomi smallint not null,
  folk smallint not null,
  trait text not null,
  mandate text not null,
  salary numeric not null,
  hired_at timestamptz not null default now(),
  hired_day date not null,
  mandate_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_day date,
  end_reason text
);
create unique index if not exists plant_managers_active_idx on public.plant_managers (user_id, plant_id) where ended_at is null;
create index if not exists plant_managers_user_idx on public.plant_managers (user_id);
alter table public.plant_managers enable row level security;

create table if not exists public.manager_candidates (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  slot smallint not null,
  name text not null,
  drift smallint not null,
  okonomi smallint not null,
  folk smallint not null,
  trait text not null,
  hired boolean not null default false,
  primary key (user_id, day, slot)
);
alter table public.manager_candidates enable row level security;

create table if not exists public.manager_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  amount numeric not null,
  detail jsonb,
  at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.manager_days enable row level security;

create table if not exists public.manager_calls (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plant_id integer not null,
  manager_id bigint references public.plant_managers(id) on delete set null,
  card text not null,
  created_at timestamptz not null default now(),
  deadline timestamptz not null,
  choice smallint,
  chosen_by text,
  outcome text,
  cash numeric,
  resolved_at timestamptz
);
create index if not exists manager_calls_user_idx on public.manager_calls (user_id, created_at desc);
create index if not exists manager_calls_open_idx on public.manager_calls (deadline) where resolved_at is null;
create index if not exists manager_calls_manager_idx on public.manager_calls (manager_id);
alter table public.manager_calls enable row level security;

create table if not exists public.manager_effects (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plant_id integer not null,
  from_day date not null,
  to_day date not null,
  factor numeric not null,
  call_id bigint references public.manager_calls(id) on delete set null
);
create index if not exists manager_effects_user_idx on public.manager_effects (user_id, to_day);
create index if not exists manager_effects_call_idx on public.manager_effects (call_id);
alter table public.manager_effects enable row level security;

create table if not exists public.manager_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  next_call_at timestamptz
);
alter table public.manager_state enable row level security;

create or replace function public.manager_cfg()
returns jsonb
language sql
stable
set search_path = public
as $$
  select coalesce(value -> 'managers', '{}'::jsonb) from public.config where id = 'world';
$$;

-- Lønnen som andel av verkets utbytte: 3 % (sum 6) til 6 % (sum 10)
create or replace function public.manager_salary(p_drift int, p_okonomi int, p_folk int)
returns numeric
language sql
stable
set search_path = public
as $$
  select round((c.smin + (c.smax - c.smin)
                * least(1, greatest(0, (p_drift + p_okonomi + p_folk - c.lo) / nullif(c.hi - c.lo, 0))))::numeric, 4)
  from (select coalesce((m ->> 'salary_min')::numeric, 0.03) smin, coalesce((m ->> 'salary_max')::numeric, 0.06) smax,
               coalesce((m ->> 'sum_min')::numeric, 6) lo, coalesce((m ->> 'sum_max')::numeric, 10) hi
        from public.manager_cfg() m) c;
$$;

-- Faktoren på verkets del av utbyttet etter mandatet (mandateFactor i game/managers.ts)
create or replace function public.manager_factor(p_mandate text, p_drift int, p_okonomi int, p_folk int)
returns numeric
language sql
stable
set search_path = public
as $$
  select case p_mandate
    when 'lonnsomhet' then 0.92 + 0.04 * ((p_drift + p_okonomi) / 2.0)
    when 'vekst' then coalesce((public.manager_cfg() ->> 'vekst_factor')::numeric, 0.95)
    when 'stabilitet' then 0.98 + 0.01 * p_folk
    else 1 end;
$$;

-- Pris (p_what = 'cost') eller tid ('time') på en modernisering av verket etter mandatet (modFactors)
create or replace function public.manager_mod_factor(p_user uuid, p_plant int, p_what text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case m.mandate
      when 'lonnsomhet' then case p_what when 'cost' then coalesce((c ->> 'lonn_mod_cost')::numeric, 1.2)
                                         else coalesce((c ->> 'lonn_mod_time')::numeric, 1.25) end
      when 'vekst' then case p_what when 'cost' then 1 - (0.10 + 0.03 * m.drift) else 1 - (0.10 + 0.04 * m.drift) end
      else 1 end
    from public.plant_managers m, public.manager_cfg() c
    where m.user_id = p_user and m.plant_id = p_plant and m.ended_at is null
      and coalesce((c ->> 'enabled')::boolean, false)), 1);
$$;
revoke execute on function public.manager_mod_factor(uuid, int, text) from public, anon, authenticated;

-- Andelen av utbyttet hvert ferdige verk står for (samme regel som dividend_region_shares, per verk)
create or replace function public.manager_plant_shares(p_user uuid)
returns table(plant_id int, share numeric, name text)
language sql
stable
security definer
set search_path = public
as $$
  with w as (select coalesce(value -> 'dividend', '{}'::jsonb) as d from public.config where id = 'world'),
  k as (
    select coalesce((w.d -> 'base' ->> 'stalverk')::numeric, 500000) as b_stalverk,
           coalesce((w.d -> 'base' ->> 'storverk')::numeric, 2000000) as b_storverk,
           coalesce((w.d -> 'base' ->> 'kompleks')::numeric, 6000000) as b_kompleks,
           coalesce((w.d ->> 'level_gain')::numeric, 0.25) as level_gain,
           coalesce((w.d ->> 'decay')::numeric, 0.1) as decay
    from w),
  plants as (
    select (p ->> 'id')::int as pid, p ->> 'name' as pname,
           case p ->> 'type' when 'stalverk' then k.b_stalverk when 'storverk' then k.b_storverk
             when 'kompleks' then k.b_kompleks else 0 end
             * (1 + k.level_gain * coalesce((p ->> 'level')::numeric, 0)) as drift, i
    from public.konsern kk
    cross join lateral jsonb_array_elements(case when jsonb_typeof(kk.plants) = 'array' then kk.plants else '[]' end)
      with ordinality as t(p, i)
    cross join k
    where kk.user_id = p_user and coalesce(p -> 'project' ->> 'kind', '') <> 'bygg'),
  ranked as (
    select pid, pname, drift / (1 + k.decay * (row_number() over (order by drift desc, i) - 1)) as term
    from plants, k)
  select r.pid, round(r.term / nullif(sum(r.term) over (), 0), 6), r.pname from ranked r;
$$;
revoke execute on function public.manager_plant_shares(uuid) from public, anon, authenticated;

-- Dagens tre kandidater, trukket første gang de vises og like hele dagen
create or replace function public.manager_draw_candidates(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := public.world_today();
  first_names text[] := array['Anne','Per','Kari','Ola','Ingrid','Lars','Silje','Jonas','Hanne','Erik','Mona','Arild',
    'Tone','Geir','Line','Trond','Nina','Stian','Hilde','Rune','Sara','Tor','Marit','Kjell','Ida','Bjørn','Linn','Espen',
    'Grete','Ali','Fatima','Tomasz','Agnieszka','Mikael','Aisha','Jan','Wenche','Sindre','Eva','Omar'];
  last_names text[] := array['Hansen','Johansen','Olsen','Larsen','Andersen','Pedersen','Nilsen','Kristiansen','Jensen',
    'Karlsen','Berg','Haugen','Hagen','Eriksen','Bakken','Dahl','Lund','Moen','Solberg','Strand','Nowak','Ahmed','Lie',
    'Aas','Holm'];
  traits text[] := array['forsiktig','aergjerrig','sparsom','lojal'];
  s record;
  slot int;
begin
  if exists (select 1 from public.manager_candidates where user_id = p_user and day = today) then
    return;
  end if;
  for slot in 1..3 loop
    -- Jevnt blant de lovlige kombinasjonene: 1–5 stjerner, sum 6–10, aldri 5 på to egenskaper
    select d, o, f into s
    from generate_series(1, 5) d, generate_series(1, 5) o, generate_series(1, 5) f
    where d + o + f between 6 and 10 and (d = 5)::int + (o = 5)::int + (f = 5)::int <= 1
    order by random() limit 1;
    insert into public.manager_candidates (user_id, day, slot, name, drift, okonomi, folk, trait)
    values (p_user, today, slot,
            first_names[1 + floor(random() * array_length(first_names, 1))::int] || ' '
              || last_names[1 + floor(random() * array_length(last_names, 1))::int],
            s.d, s.o, s.f, traits[1 + floor(random() * 4)::int])
    on conflict do nothing;
  end loop;
end;
$$;
revoke execute on function public.manager_draw_candidates(uuid) from public, anon, authenticated;

-- Felles sjekk for handlingene: innlogget, ikke gjest, ikke sperret, bryteren på
create or replace function public.manager_guard(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_user is null then 'innlogging'
    when public.user_is_guest(p_user) then 'gjest'
    when exists (select 1 from public.profiles where id = p_user and (flagged_at is not null or banned)) then 'sperret'
    when not coalesce((public.manager_cfg() ->> 'enabled')::boolean, false) then 'av'
    when not exists (select 1 from public.konsern where user_id = p_user) then 'konsern'
    else null end;
$$;
revoke execute on function public.manager_guard(uuid) from public, anon, authenticated;

-- Pengene til eller fra konsernkassa; et trekk tar aldri mer enn det som står der. Gir beløpet som ble ført.
create or replace function public.manager_cash(p_user uuid, p_amount numeric, p_ref text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  bal numeric;
  amt numeric := round(p_amount);
begin
  if amt = 0 then
    return 0;
  end if;
  insert into public.treasury (user_id, balance, updated_at) values (p_user, 0, now()) on conflict do nothing;
  select balance into bal from public.treasury where user_id = p_user for update;
  amt := greatest(amt, -coalesce(bal, 0));
  if amt = 0 then
    return 0;
  end if;
  update public.treasury set balance = balance + amt, updated_at = now() where user_id = p_user;
  insert into public.treasury_ledger (user_id, amount, kind, ref) values (p_user, amt, 'justering', p_ref);
  return amt;
end;
$$;
revoke execute on function public.manager_cash(uuid, numeric, text) from public, anon, authenticated;

-- Utfallet av en samtale: valget, sjansen (halvparten med Stabilitet), engangsbeløp og en tidsbegrenset faktor
create or replace function public.manager_resolve_call(p_call bigint, p_choice int, p_by text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  m record;
  opt jsonb;
  eff jsonb;
  v_outcome text := 'sikker';
  chance numeric;
  daily numeric;
  v_cash numeric := 0;
  paid numeric := 0;
  today date := public.world_today();
begin
  select * into c from public.manager_calls where id = p_call for update;
  if c.id is null or c.resolved_at is not null then
    return json_build_object('ok', false, 'reason', 'ferdig');
  end if;
  select * into m from public.plant_managers where id = c.manager_id;
  opt := public.manager_cfg() -> 'cards' -> c.card -> 'options' -> p_choice;
  if opt is null then
    return json_build_object('ok', false, 'reason', 'valg');
  end if;
  eff := coalesce(opt -> 'sure', '{}'::jsonb);
  if jsonb_typeof(opt -> 'risk') = 'object' then
    chance := coalesce((opt -> 'risk' ->> 'chance')::numeric, 0)
              * case when m.mandate = 'stabilitet' and m.ended_at is null
                     then coalesce((public.manager_cfg() ->> 'stability_risk')::numeric, 0.5) else 1 end;
    if random() < chance then
      eff := coalesce(opt -> 'risk' -> 'effect', '{}'::jsonb);
      v_outcome := 'uhell';
    end if;
  end if;
  -- Verkets utbytte per dag nå (fullt, før politikken)
  select coalesce(sum(s.share), 0) * public.dividend_per_day(c.user_id) into daily
  from public.manager_plant_shares(c.user_id) s where s.plant_id = c.plant_id;
  if coalesce((eff ->> 'cash')::numeric, 0) <> 0 then
    v_cash := round((eff ->> 'cash')::numeric * daily);
    paid := public.manager_cash(c.user_id, v_cash, 'samtale:' || c.id);
  end if;
  if coalesce((eff ->> 'days')::int, 0) > 0 and coalesce((eff ->> 'factor')::numeric, 1) <> 1 then
    insert into public.manager_effects (user_id, plant_id, from_day, to_day, factor, call_id)
    values (c.user_id, c.plant_id, today, today + (eff ->> 'days')::int, (eff ->> 'factor')::numeric, c.id);
  end if;
  update public.manager_calls set choice = p_choice, chosen_by = p_by, outcome = v_outcome, cash = paid, resolved_at = now()
  where id = c.id;
  return json_build_object('ok', true, 'outcome', v_outcome, 'cash', paid,
                           'days', coalesce((eff ->> 'days')::int, 0), 'factor', coalesce((eff ->> 'factor')::numeric, 1));
end;
$$;
revoke execute on function public.manager_resolve_call(bigint, int, text) from public, anon, authenticated;

-- Valget verksjefen tar selv etter trekket (traitChoice)
create or replace function public.manager_trait_choice(p_card text, p_trait text, p_mandate text)
returns int
language sql
stable
set search_path = public
as $$
  with o as (select public.manager_cfg() -> 'cards' -> p_card -> 'options' as opts),
  t as (select case p_trait when 'forsiktig' then 'trygg' when 'aergjerrig' then 'dristig' when 'sparsom' then 'billig' end as tag)
  select case
    when p_trait = 'lojal' then
      case when (o.opts -> 1 ->> 'mandate') = p_mandate and (o.opts -> 0 ->> 'mandate') <> p_mandate then 1 else 0 end
    when (o.opts -> 1 -> 'tags') ? t.tag and not ((o.opts -> 0 -> 'tags') ? t.tag) then 1
    else 0 end
  from o, t;
$$;

-- Oppgjøret etter utbyttet, fristene og nye samtaler. Jobben `verksjefer` (cron hvert 10. minutt).
create or replace function public.managers_settle()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg jsonb := public.manager_cfg();
  from_day date := coalesce((public.manager_cfg() ->> 'from')::date, public.world_today());
  today date := public.world_today();
  u record;
  d date;
  dv record;
  full_amt numeric;
  adj numeric;
  detail jsonb;
  c record;
  pick record;
  gap_lo numeric := coalesce((cfg -> 'call_gap_h' ->> 0)::numeric, 55);
  gap_hi numeric := coalesce((cfg -> 'call_gap_h' ->> 1)::numeric, 84);
  new_call bigint;
  pname text;
  n_ok int := 0;
  n_fail int := 0;
begin
  perform public.world_job_start('verksjefer');
  for u in
    select distinct x.user_id from (
      select user_id from public.plant_managers where ended_at is null or ended_day >= today - 3
      union select user_id from public.manager_effects where to_day >= today - 3
      union select user_id from public.manager_calls where resolved_at is null) x
  loop
    begin
      -- Solgte eller byttede verk: verksjefen går med verket (ingen sluttpakke)
      update public.plant_managers m set ended_at = now(), ended_day = today, end_reason = 'solgt'
      where m.user_id = u.user_id and m.ended_at is null
        and not exists (select 1 from public.konsern k, jsonb_array_elements(k.plants) p
                        where k.user_id = m.user_id and (p ->> 'id')::int = m.plant_id);
      -- Dagene som er betalt, men ikke gjort opp (andelene per verk regnes av verkene slik de står nå)
      for dv in
        select x.day, x.amount, x.to_fund from public.dividends x
        where x.user_id = u.user_id and x.day >= from_day and x.day < today
          and not exists (select 1 from public.manager_days md where md.user_id = x.user_id and md.day = x.day)
        order by x.day
      loop
        d := dv.day;
        full_amt := coalesce(dv.amount, 0) + coalesce(dv.to_fund, 0);
        select coalesce(sum(s.share * full_amt * (
                 coalesce((select public.manager_factor(m.mandate, m.drift, m.okonomi, m.folk) - 1 - m.salary
                           from public.plant_managers m
                           where m.user_id = u.user_id and m.plant_id = s.plant_id and m.hired_day < d
                             and (m.ended_day is null or m.ended_day > d)
                           order by m.id desc limit 1), 0)
                 + coalesce((select sum(e.factor - 1) from public.manager_effects e
                             where e.user_id = u.user_id and e.plant_id = s.plant_id and d >= e.from_day and d < e.to_day), 0))), 0),
               coalesce(jsonb_object_agg(s.plant_id, round(s.share, 4)), '{}'::jsonb)
          into adj, detail
        from public.manager_plant_shares(u.user_id) s;
        insert into public.manager_days (user_id, day, amount, detail)
        values (u.user_id, d, round(adj), jsonb_build_object('full', full_amt, 'shares', detail))
        on conflict do nothing;
        if found and round(adj) <> 0 then
          update public.manager_days set amount = public.manager_cash(u.user_id, adj, 'verksjef:' || d)
          where user_id = u.user_id and day = d;
        end if;
      end loop;
      -- Fristen er ute: verksjefen velger selv etter trekket
      for c in
        select mc.id, mc.card, mc.plant_id, m.trait, m.mandate, m.name
        from public.manager_calls mc left join public.plant_managers m on m.id = mc.manager_id
        where mc.user_id = u.user_id and mc.resolved_at is null and mc.deadline < now()
      loop
        perform public.manager_resolve_call(c.id, public.manager_trait_choice(c.card, coalesce(c.trait, 'forsiktig'),
                                                                              coalesce(c.mandate, '')), 'verksjef');
        perform public.push_enqueue(u.user_id, 'konsern', 'verksjef-valgte:' || c.id,
          format('%s valgte selv', coalesce(c.name, 'Verksjefen')),
          format('Du svarte ikke på «%s», så verksjefen bestemte.', public.manager_cfg() -> 'cards' -> c.card ->> 'title'),
          'konsern');
      end loop;
      -- Ny samtale: 2–3 i uka, høyst én åpen, bare med en verksjef i arbeid
      if coalesce((cfg ->> 'enabled')::boolean, false)
         and exists (select 1 from public.plant_managers where user_id = u.user_id and ended_at is null)
         and not exists (select 1 from public.manager_calls where user_id = u.user_id and resolved_at is null) then
        insert into public.manager_state (user_id, next_call_at)
        values (u.user_id, now() + make_interval(secs => (gap_lo + random() * (gap_hi - gap_lo)) * 3600 / 2))
        on conflict do nothing;
        if (select next_call_at from public.manager_state where user_id = u.user_id) <= now() then
          select m.id, m.plant_id, m.name, card.key as card into pick
          from public.plant_managers m
          cross join lateral jsonb_object_keys(cfg -> 'cards') card(key)
          where m.user_id = u.user_id and m.ended_at is null
            and not exists (select 1 from public.manager_calls x
                            where x.user_id = m.user_id and x.plant_id = m.plant_id and x.card = card.key
                              and x.created_at > now() - make_interval(days => coalesce((cfg ->> 'card_repeat_days')::int, 30)))
          order by random() limit 1;
          if pick.id is not null then
            insert into public.manager_calls (user_id, plant_id, manager_id, card, deadline)
            values (u.user_id, pick.plant_id, pick.id, pick.card,
                    now() + make_interval(hours => coalesce((cfg ->> 'call_deadline_h')::int, 48)))
            returning id into new_call;
            select s.name into pname from public.manager_plant_shares(u.user_id) s where s.plant_id = pick.plant_id;
            perform public.push_enqueue(u.user_id, 'konsern', 'verksjef-ringer:' || new_call,
              format('Verksjefen på %s ringer', coalesce(pname, 'verket')),
              format('%s: «%s». Svar innen 48 timer, ellers bestemmer verksjefen selv.', pick.name,
                     cfg -> 'cards' -> pick.card ->> 'title'),
              'konsern');
          end if;
          update public.manager_state
          set next_call_at = now() + make_interval(secs => (gap_lo + random() * (gap_hi - gap_lo)) * 3600)
          where user_id = u.user_id;
        end if;
      end if;
      n_ok := n_ok + 1;
    exception when others then
      n_fail := n_fail + 1;
      perform public.world_job_unit_error('verksjefer', u.user_id::text, sqlerrm);
    end;
  end loop;
  perform public.world_job_finish('verksjefer', n_ok, n_fail);
end;
$$;
revoke execute on function public.managers_settle() from public, anon, authenticated;

-- Alt appen trenger: bryteren, dagens kandidater, verksjefene, samtalene og verkenes utbytte per dag
create or replace function public.manager_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cfg jsonb := public.manager_cfg();
  per_day numeric;
  guard text;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  guard := public.manager_guard(uid);
  if guard is not null then
    return json_build_object('enabled', false, 'reason', guard);
  end if;
  perform public.manager_draw_candidates(uid);
  per_day := public.dividend_per_day(uid);
  return json_build_object(
    'enabled', true,
    'perDay', per_day,
    'plants', coalesce((select json_agg(json_build_object('plant', s.plant_id, 'share', s.share, 'daily', round(s.share * per_day)))
                        from public.manager_plant_shares(uid) s), '[]'::json),
    'candidates', coalesce((select json_agg(json_build_object('slot', c.slot, 'name', c.name, 'drift', c.drift,
                              'okonomi', c.okonomi, 'folk', c.folk, 'trait', c.trait) order by c.slot)
                            from public.manager_candidates c
                            where c.user_id = uid and c.day = public.world_today() and not c.hired), '[]'::json),
    'managers', coalesce((select json_agg(json_build_object('plant', m.plant_id, 'name', m.name, 'drift', m.drift,
                            'okonomi', m.okonomi, 'folk', m.folk, 'trait', m.trait, 'mandate', m.mandate, 'salary', m.salary,
                            'hiredAt', m.hired_at, 'mandateAt', m.mandate_at,
                            'mandateFrom', m.mandate_at + make_interval(days => coalesce((cfg ->> 'mandate_days')::int, 7))))
                          from public.plant_managers m where m.user_id = uid and m.ended_at is null), '[]'::json),
    'quarantine', coalesce((select json_agg(json_build_object('plant', m.plant_id,
                              'until', m.ended_at + make_interval(days => coalesce((cfg ->> 'quarantine_days')::int, 3))))
                            from public.plant_managers m
                            where m.user_id = uid and m.end_reason = 'avsluttet'
                              and m.ended_at > now() - make_interval(days => coalesce((cfg ->> 'quarantine_days')::int, 3))
                              and not exists (select 1 from public.plant_managers n
                                              where n.user_id = uid and n.plant_id = m.plant_id and n.ended_at is null)),
                           '[]'::json),
    'calls', coalesce((select json_agg(json_build_object('id', c.id, 'plant', c.plant_id, 'card', c.card,
                         'createdAt', c.created_at, 'deadline', c.deadline, 'choice', c.choice, 'chosenBy', c.chosen_by,
                         'outcome', c.outcome, 'cash', c.cash, 'resolvedAt', c.resolved_at,
                         'manager', (select name from public.plant_managers where id = c.manager_id))
                       order by c.created_at desc)
                       from public.manager_calls c
                       where c.user_id = uid and (c.resolved_at is null or c.resolved_at > now() - interval '7 days')), '[]'::json),
    'days', coalesce((select json_agg(json_build_object('day', d.day, 'amount', d.amount) order by d.day desc)
                      from (select * from public.manager_days where user_id = uid order by day desc limit 7) d), '[]'::json),
    'effects', coalesce((select json_agg(json_build_object('plant', e.plant_id, 'factor', e.factor, 'until', e.to_day))
                         from public.manager_effects e where e.user_id = uid and e.to_day > public.world_today()), '[]'::json));
end;
$$;
revoke execute on function public.manager_status() from public, anon;
grant execute on function public.manager_status() to authenticated;

create or replace function public.manager_hire(p_plant int, p_slot int, p_mandate text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  guard text := public.manager_guard(auth.uid());
  c record;
  cfg jsonb := public.manager_cfg();
begin
  if guard is not null then
    return json_build_object('ok', false, 'reason', guard);
  end if;
  if p_mandate not in ('lonnsomhet', 'vekst', 'stabilitet') then
    return json_build_object('ok', false, 'reason', 'mandat');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_verksjef_' || uid::text));
  if not exists (select 1 from public.manager_plant_shares(uid) s where s.plant_id = p_plant) then
    return json_build_object('ok', false, 'reason', 'verk');
  end if;
  if exists (select 1 from public.plant_managers where user_id = uid and plant_id = p_plant and ended_at is null) then
    return json_build_object('ok', false, 'reason', 'har');
  end if;
  if exists (select 1 from public.plant_managers where user_id = uid and plant_id = p_plant and end_reason = 'avsluttet'
             and ended_at > now() - make_interval(days => coalesce((cfg ->> 'quarantine_days')::int, 3))) then
    return json_build_object('ok', false, 'reason', 'karantene');
  end if;
  select * into c from public.manager_candidates
  where user_id = uid and day = public.world_today() and slot = p_slot and not hired for update;
  if c.user_id is null then
    return json_build_object('ok', false, 'reason', 'kandidat');
  end if;
  update public.manager_candidates set hired = true where user_id = uid and day = c.day and slot = c.slot;
  insert into public.plant_managers (user_id, plant_id, name, drift, okonomi, folk, trait, mandate, salary, hired_day)
  values (uid, p_plant, c.name, c.drift, c.okonomi, c.folk, c.trait, p_mandate,
          public.manager_salary(c.drift, c.okonomi, c.folk), public.world_today());
  return json_build_object('ok', true);
end;
$$;
revoke execute on function public.manager_hire(int, int, text) from public, anon;
grant execute on function public.manager_hire(int, int, text) to authenticated;

create or replace function public.manager_set_mandate(p_plant int, p_mandate text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  guard text := public.manager_guard(auth.uid());
  m record;
begin
  if guard is not null then
    return json_build_object('ok', false, 'reason', guard);
  end if;
  if p_mandate not in ('lonnsomhet', 'vekst', 'stabilitet') then
    return json_build_object('ok', false, 'reason', 'mandat');
  end if;
  select * into m from public.plant_managers where user_id = uid and plant_id = p_plant and ended_at is null for update;
  if m.id is null then
    return json_build_object('ok', false, 'reason', 'ingen');
  end if;
  if m.mandate = p_mandate then
    return json_build_object('ok', true);
  end if;
  if m.mandate_at > now() - make_interval(days => coalesce((public.manager_cfg() ->> 'mandate_days')::int, 7)) then
    return json_build_object('ok', false, 'reason', 'uke');
  end if;
  update public.plant_managers set mandate = p_mandate, mandate_at = now() where id = m.id;
  return json_build_object('ok', true);
end;
$$;
revoke execute on function public.manager_set_mandate(int, text) from public, anon;
grant execute on function public.manager_set_mandate(int, text) to authenticated;

create or replace function public.manager_dismiss(p_plant int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  guard text := public.manager_guard(auth.uid());
  m record;
  pay numeric;
  bal numeric;
begin
  if guard is not null then
    return json_build_object('ok', false, 'reason', guard);
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_verksjef_' || uid::text));
  select * into m from public.plant_managers where user_id = uid and plant_id = p_plant and ended_at is null for update;
  if m.id is null then
    return json_build_object('ok', false, 'reason', 'ingen');
  end if;
  -- Sluttpakke: 5 dagers lønn av verkets utbytte nå
  select round(coalesce((public.manager_cfg() ->> 'severance_days')::numeric, 5) * m.salary * coalesce(sum(s.share), 0)
               * public.dividend_per_day(uid))
    into pay
  from public.manager_plant_shares(uid) s where s.plant_id = p_plant;
  select balance into bal from public.treasury where user_id = uid;
  if coalesce(pay, 0) > coalesce(bal, 0) then
    return json_build_object('ok', false, 'reason', 'kasse', 'cost', pay);
  end if;
  perform public.manager_cash(uid, -coalesce(pay, 0), 'sluttpakke:' || m.id);
  update public.plant_managers set ended_at = now(), ended_day = public.world_today(), end_reason = 'avsluttet'
  where id = m.id;
  return json_build_object('ok', true, 'cost', coalesce(pay, 0));
end;
$$;
revoke execute on function public.manager_dismiss(int) from public, anon;
grant execute on function public.manager_dismiss(int) to authenticated;

create or replace function public.manager_answer(p_call bigint, p_choice int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  guard text := public.manager_guard(auth.uid());
begin
  if guard is not null then
    return json_build_object('ok', false, 'reason', guard);
  end if;
  if p_choice not in (0, 1) then
    return json_build_object('ok', false, 'reason', 'valg');
  end if;
  if not exists (select 1 from public.manager_calls where id = p_call and user_id = uid and resolved_at is null) then
    return json_build_object('ok', false, 'reason', 'ferdig');
  end if;
  return public.manager_resolve_call(p_call, p_choice, 'eier');
end;
$$;
revoke execute on function public.manager_answer(bigint, int) from public, anon;
grant execute on function public.manager_answer(bigint, int) to authenticated;

-- Moderniseringen etter mandatet: Vekst billigere og raskere, Lønnsomhet dyrere og tregere
do $$
declare
  def text := pg_get_functiondef('public.konsern_order(text,integer,text,text)'::regprocedure);
  old text := $o$      hours := coalesce((cfg ->> 'mod_h')::numeric, 4);$o$;
begin
  if position('manager_mod_factor' in def) = 0 then
    if position(old in def) = 0 then raise exception 'konsern_order har endret seg'; end if;
    execute replace(def, old, old || $n$
      cost := round(cost * public.manager_mod_factor(uid, pid, 'cost'));
      hours := hours * public.manager_mod_factor(uid, pid, 'time');$n$);
  end if;
end $$;

-- Jobben i world_health: går hvert 10. minutt, så standardregelen (20 minutter) holder
select cron.unschedule('verksjefer') where exists (select 1 from cron.job where jobname = 'verksjefer');
select cron.schedule('verksjefer', '*/10 * * * *', $$ select public.managers_settle() $$);
