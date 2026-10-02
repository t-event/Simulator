-- LAGT INN 2.10.2026 (B-424), etter rapporten 2.10 og en prøvekjøring som ble rullet tilbake: alle testene besto, ingen
-- penger flyttet (utbytte, kasser, bidrag, fond, kassabok, selskapsinntekt) og konsernverdien uendret for alle. Var utkast
-- 103 (klargjort 1.10, B-409). Spesifikasjonen: docs/K1-PROGRAMMER.md (B-389–B-393). Testene:
-- supabase/utkast/113_v0_k1_skygge_test.sql. Skyggejobben (cron «verden-skygge») startet samme dag – se nederst.
--
-- Hva det gjør når det legges inn:
-- * Hendelsene (strømsjokk, driftsuro, høykonjunktur) trekkes per region og lagres i world_events med shadow = true.
--   De vises ikke, varsles ikke og virker ikke på noe.
-- * Skyggeloggen (program_shadow_day, world_event_exposure) leser utbyttet og bidraget som alt er betalt og regner hva
--   hendelsene ville gjort, og hva hvert program på hver satsing ville kostet og spart – for 0,5/1,5/4 % og 1/3/8 %.
--   Ingen penger flyttes, og pay_dividends, pay_contributions og world_tick er urørt.
-- * Skyggen går i en egen funksjon (world_shadow_tick) med egen cron-jobb. Feiler den, merkes det i world_health() som
--   jobben «skygge», og de vanlige verdensjobbene merker ingenting.
-- * K-1-tabellene lages tomme. Ingen funksjon bruker dem før K-1 bygges bak bryteren (enabled = false).
--
-- Det som ikke skjer: ingen bryter slås på (enabled og events_enabled er false), ingen hendelse vises, ingen utbetaling
-- endres, Konsernverdi og konkurransene er urørt.

-- ------------------------------------------------------------------------------------------------- innstillingene
-- config.world.programs (K1-PROGRAMMER.md avsnitt 9). Legges bare inn hvis den mangler; shadow_from settes til dagen
-- utkastet legges inn, så dager før det aldri logges.
update public.config
set value = jsonb_set(value, '{programs}', jsonb_build_object(
  'enabled', false,
  'events_enabled', false,
  'events_shadow', true,
  'shadow_from', public.world_today(),
  'budget', '[0.005, 0.015, 0.04]'::jsonb,
  'shadow_budgets', '[[0.005, 0.015, 0.04], [0.01, 0.03, 0.08]]'::jsonb,
  'cost_base', 'utbytte',
  'effect', '[0.25, 0.6, 1]'::jsonb,
  'max_active', 2,
  'bind_days', 14,
  'establish_days', 3,
  'establish_income_days', 2,
  'protect', 0.8,
  'drift_gain', 1.05,
  'drift_harder', 0.5,
  'warn_share', 0.15,
  'events', jsonb_build_object(
    'gap_days', 45,
    'warn_days', 2,
    'strom', '[0.4, 8, 12]'::jsonb,
    'uro', '[0.35, 5, 9]'::jsonb,
    'boom_days', '[10, 16]'::jsonb,
    'mix', jsonb_build_object(
      'normal', jsonb_build_object('konjunktur', 0.5, 'uro', 0.25, 'strom', 0.25),
      'winter', jsonb_build_object('konjunktur', 0.4, 'uro', 0.2, 'strom', 0.4)))))
where id = 'world' and not (value ? 'programs');

-- -------------------------------------------------------------------------------------------------------- tabellene
-- Hendelsene. Datoene er ekte dager i norsk tid (world_today). ends_on er første dag etter hendelsen.
create table if not exists public.world_events (
  id bigserial primary key,
  region text not null,
  kind text not null check (kind in ('strom', 'uro', 'konjunktur')),
  -- Andelen av utbyttet fra regionen: tap for strømsjokk og uro, gevinst for høykonjunktur
  size numeric not null check (size >= 0 and size <= 1),
  warn_on date not null,
  starts_on date not null,
  ends_on date not null,
  shadow boolean not null default true,
  drawn_at timestamptz not null default now(),
  check (warn_on <= starts_on and ends_on > starts_on)
);
create index if not exists world_events_region_end on public.world_events (region, ends_on desc);
create index if not exists world_events_days on public.world_events (starts_on, ends_on);
alter table public.world_events enable row level security;
revoke all on public.world_events from anon, authenticated;

-- Én rad per spiller og ekte dag med utbytte: grunnlaget for alt i skyggerapporten. Programresultatene regnes av disse
-- tallene i rapporten, så satsene kan endres etterpå uten å miste data (B-393).
create table if not exists public.program_shadow_day (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  -- Normalt brutto datterverksutbytte før hendelser og programmer (kassa + fondet, etter aktiviteten)
  gross numeric not null,
  -- Hovedverkets bidrag samme dag (bare til rapporten; bestemmer ikke prisen, B-392)
  contribution numeric not null default 0,
  -- Andelen av utbyttet fra hver region, regnet av det lagrede spillet da dagen ble logget
  shares jsonb not null default '{}'::jsonb,
  max_share numeric not null default 0,
  -- Kroner uten program (alltid >= 0): tap i strømsjokk, tap i uro, gevinst i høykonjunktur
  strom_loss numeric not null default 0,
  uro_loss numeric not null default 0,
  boom_gain numeric not null default 0,
  -- Varslet tap (strømsjokk/uro som starter innen varselet) i regioner med minst warn_share av utbyttet – til «høy ved
  -- varsel»-regnestykket
  warned boolean not null default false,
  logged_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists program_shadow_day_day on public.program_shadow_day (day);
alter table public.program_shadow_day enable row level security;
revoke all on public.program_shadow_day from anon, authenticated;

-- Per hendelse, spiller og dag: hvor mye av utbyttet som kom fra regionen og hva hendelsen ville gjort
create table if not exists public.world_event_exposure (
  event_id bigint not null references public.world_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  share numeric not null,
  dividend_before numeric not null,
  effect_none numeric not null,
  primary key (event_id, user_id, day)
);
alter table public.world_event_exposure enable row level security;
revoke all on public.world_event_exposure from anon, authenticated;

-- Hvilke dager og regioner som er trukket, så en ny kjøring aldri trekker to ganger
create table if not exists public.world_event_draws (
  region text not null,
  day date not null,
  event_id bigint references public.world_events (id) on delete set null,
  primary key (region, day)
);
alter table public.world_event_draws enable row level security;
revoke all on public.world_event_draws from anon, authenticated;

-- K-1 (tomme til K-1 bygges bak bryteren, K1-PROGRAMMER.md avsnitt 5–7)
create table if not exists public.program_slots (
  user_id uuid not null references public.profiles (id) on delete cascade,
  program text not null check (program in ('teknologi', 'robusthet', 'drift')),
  level smallint not null check (level between 0 and 2),
  next_level smallint check (next_level between 0 and 2),
  ready_at timestamptz not null,
  locked_until timestamptz not null,
  started_at timestamptz not null default now(),
  primary key (user_id, program)
);
alter table public.program_slots enable row level security;
revoke all on public.program_slots from anon, authenticated;

-- Hvert trekk med unik nøkkel (spiller, ekte dag), så samme krone aldri trekkes to ganger
create table if not exists public.program_charges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  amount numeric not null,
  detail jsonb not null default '{}'::jsonb,
  charged_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.program_charges enable row level security;
revoke all on public.program_charges from anon, authenticated;

-- Programrapporten: per spiller, program og dag – budsjett, spart, ekstra, tapt ekstra
create table if not exists public.program_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  program text not null,
  budget numeric not null default 0,
  saved numeric not null default 0,
  extra numeric not null default 0,
  extra_lost numeric not null default 0,
  primary key (user_id, day, program)
);
alter table public.program_log enable row level security;
revoke all on public.program_log from anon, authenticated;

-- ---------------------------------------------------------------------------------------------- reglene som funksjoner
-- Innstillingene, med standardverdiene over hvis noe mangler
create or replace function public.world_programs_config()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce((select value -> 'programs' from public.config where id = 'world'), '{}'::jsonb);
$$;

-- Vinter = november–mars (norsk tid); endrer bare hvilken type hendelse det blir, ikke hyppigheten (B-391)
create or replace function public.world_is_winter(p_day date)
returns boolean language sql immutable as $$
  select extract(month from p_day) in (11, 12, 1, 2, 3);
$$;

-- Størrelsen på høykonjunkturen: forventet verdi for verden regnet av config, aldri etterregnet av trukne hendelser
-- (B-390). Samme formel som k1BoomSize i frontend/src/game/programSim.ts; med standardtallene 0,3040.
create or replace function public.world_event_boom_size(c jsonb)
returns numeric language plpgsql immutable as $$
declare
  e jsonb := coalesce(c -> 'events', '{}'::jsonb);
  winter_share numeric := 5.0 / 12;
  strom_size numeric := coalesce((e -> 'strom' ->> 0)::numeric, 0.4);
  strom_days numeric := (coalesce((e -> 'strom' ->> 1)::numeric, 8) + coalesce((e -> 'strom' ->> 2)::numeric, 12)) / 2;
  uro_size numeric := coalesce((e -> 'uro' ->> 0)::numeric, 0.35);
  uro_days numeric := (coalesce((e -> 'uro' ->> 1)::numeric, 5) + coalesce((e -> 'uro' ->> 2)::numeric, 9)) / 2;
  boom_days numeric := (coalesce((e -> 'boom_days' ->> 0)::numeric, 10) + coalesce((e -> 'boom_days' ->> 1)::numeric, 16)) / 2;
  bad numeric := 0;
  boom numeric := 0;
  m record;
begin
  for m in
    select 1 - winter_share as share, coalesce(e -> 'mix' -> 'normal', '{"konjunktur": 0.5, "uro": 0.25, "strom": 0.25}') as mix
    union all
    select winter_share, coalesce(e -> 'mix' -> 'winter', '{"konjunktur": 0.4, "uro": 0.2, "strom": 0.4}')
  loop
    bad := bad + m.share * ((m.mix ->> 'strom')::numeric * strom_size * strom_days
                            + (m.mix ->> 'uro')::numeric * uro_size * uro_days);
    boom := boom + m.share * (m.mix ->> 'konjunktur')::numeric * boom_days;
  end loop;
  return case when boom > 0 then bad / boom else 0 end;
end;
$$;

-- Andelen av datterverksutbyttet fra hver region, av samme regel som dividend_from_state (051). Felles faktorer
-- (felles funksjoner, forskning, mesterskap, flaggskipet, keep) er like for alle verk og faller bort i andelen; det
-- som skiller verkene, er type, trinn og plassen i rekken (decay). Verk som bygges, tjener ikke og er ikke med.
create or replace function public.dividend_region_shares(s jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  with w as (
    select coalesce(value -> 'dividend', '{}'::jsonb) as d from public.config where id = 'world'
  ),
  k as (
    select
      coalesce((w.d -> 'base' ->> 'stalverk')::numeric, 5000000) as b_stalverk,
      coalesce((w.d -> 'base' ->> 'storverk')::numeric, 20000000) as b_storverk,
      coalesce((w.d -> 'base' ->> 'kompleks')::numeric, 60000000) as b_kompleks,
      coalesce((w.d ->> 'level_gain')::numeric, 0.25) as level_gain,
      coalesce((w.d ->> 'decay')::numeric, 0.1) as decay
    from w
  ),
  plants as (
    select
      coalesce(nullif(p ->> 'region', ''), 'ukjent') as region,
      case p ->> 'type' when 'stalverk' then k.b_stalverk when 'storverk' then k.b_storverk
        when 'kompleks' then k.b_kompleks else 0 end
        * (1 + k.level_gain * coalesce((p ->> 'level')::numeric, 0)) as drift,
      i
    from jsonb_array_elements(coalesce(s -> 'konsern' -> 'plants', '[]'::jsonb)) with ordinality as t(p, i), k
    where coalesce(p -> 'project' ->> 'kind', '') <> 'bygg'
  ),
  ranked as (
    select region, drift / (1 + k.decay * (row_number() over (order by drift desc, i) - 1)) as term
    from plants, k
  ),
  per_region as (
    select region, sum(term) as term from ranked group by region
  ),
  total as (
    select sum(term) as t from per_region
  )
  select coalesce(jsonb_object_agg(r.region, round(r.term / total.t, 6)), '{}'::jsonb)
  from per_region r, total
  where total.t > 0;
$$;

-- Sørger for at hver region har én kommende eller pågående hendelse, som simulatoren (k1Events): første hendelse
-- 2–47 dager fram, deretter 22–67 dager etter at den forrige sluttet (snitt 45). Typen trekkes av fordelingen for
-- startdagen (vinter eller ikke), lengden jevnt i intervallet. Starter alltid minst varselet (2 dager) fram i tid.
-- Tilfeldigheten er random() på serveren – ikke et frø i repoet, så ingen kan regne ut hendelsene på forhånd.
-- Én kjøring om gangen (advisory lock); en region som alt er trukket i dag, trekkes ikke igjen.
create or replace function public.world_events_ensure(p_today date default public.world_today())
returns int language plpgsql security definer set search_path = public as $$
declare
  c jsonb := public.world_programs_config();
  e jsonb := coalesce(c -> 'events', '{}'::jsonb);
  gap int := coalesce((e ->> 'gap_days')::int, 45);
  warn int := coalesce((e ->> 'warn_days')::int, 2);
  boom numeric := public.world_event_boom_size(c);
  r text;
  last_end date;
  start date;
  mix jsonb;
  x numeric;
  kind text;
  lo int;
  hi int;
  len int;
  sz numeric;
  new_id bigint;
  n int := 0;
begin
  if not pg_try_advisory_xact_lock(hashtext('world_events_ensure')) then
    return 0;
  end if;
  foreach r in array public.konsern_regions() loop
    if exists (select 1 from public.world_events where region = r and ends_on > p_today) then
      continue;
    end if;
    if exists (select 1 from public.world_event_draws where region = r and day = p_today) then
      continue;
    end if;
    select max(ends_on) into last_end from public.world_events where region = r;
    if last_end is null then
      start := p_today + warn + floor(random() * gap)::int;
    else
      start := last_end + floor(gap * (0.5 + random()))::int;
    end if;
    start := greatest(start, p_today + warn);
    mix := case when public.world_is_winter(start)
                then coalesce(e -> 'mix' -> 'winter', '{"konjunktur": 0.4, "uro": 0.2, "strom": 0.4}')
                else coalesce(e -> 'mix' -> 'normal', '{"konjunktur": 0.5, "uro": 0.25, "strom": 0.25}') end;
    x := random();
    kind := case when x < (mix ->> 'konjunktur')::numeric then 'konjunktur'
                 when x < (mix ->> 'konjunktur')::numeric + (mix ->> 'uro')::numeric then 'uro'
                 else 'strom' end;
    if kind = 'strom' then
      lo := coalesce((e -> 'strom' ->> 1)::int, 8); hi := coalesce((e -> 'strom' ->> 2)::int, 12);
      sz := coalesce((e -> 'strom' ->> 0)::numeric, 0.4);
    elsif kind = 'uro' then
      lo := coalesce((e -> 'uro' ->> 1)::int, 5); hi := coalesce((e -> 'uro' ->> 2)::int, 9);
      sz := coalesce((e -> 'uro' ->> 0)::numeric, 0.35);
    else
      lo := coalesce((e -> 'boom_days' ->> 0)::int, 10); hi := coalesce((e -> 'boom_days' ->> 1)::int, 16);
      sz := round(boom, 4);
    end if;
    len := lo + floor(random() * (hi - lo + 1))::int;
    insert into public.world_events (region, kind, size, warn_on, starts_on, ends_on, shadow)
    values (r, kind, sz, start - warn, start, start + len, true)
    returning id into new_id;
    insert into public.world_event_draws (region, day, event_id) values (r, p_today, new_id) on conflict do nothing;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Logger én spillers dag i skyggen av det som alt er betalt (dividends + contributions). Endrer ingen beløp.
-- Gir false når det ikke finnes noe utbytte den dagen eller dagen alt er logget.
create or replace function public.program_shadow_log_day(p_user uuid, p_day date)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  c jsonb := public.world_programs_config();
  warn int := coalesce((c -> 'events' ->> 'warn_days')::int, 2);
  warn_share numeric := coalesce((c ->> 'warn_share')::numeric, 0.15);
  g numeric;
  contrib numeric;
  sh jsonb;
  ev record;
  share numeric;
  before numeric;
  eff numeric;
  s_loss numeric := 0;
  u_loss numeric := 0;
  b_gain numeric := 0;
  is_warned boolean := false;
begin
  if exists (select 1 from public.program_shadow_day where user_id = p_user and day = p_day) then
    return false;
  end if;
  select amount + coalesce(to_fund, 0) into g from public.dividends where user_id = p_user and day = p_day;
  if g is null then
    return false;
  end if;
  select coalesce(amount, 0) into contrib from public.contributions where user_id = p_user and day = p_day;
  sh := public.dividend_region_shares((select state from public.saves where user_id = p_user));
  for ev in
    select * from public.world_events where starts_on <= p_day and ends_on > p_day and sh ? region
  loop
    share := (sh ->> ev.region)::numeric;
    before := g * share;
    eff := case when ev.kind = 'konjunktur' then before * ev.size else -before * ev.size end;
    if ev.kind = 'strom' then s_loss := s_loss - eff;
    elsif ev.kind = 'uro' then u_loss := u_loss - eff;
    else b_gain := b_gain + eff;
    end if;
    insert into public.world_event_exposure (event_id, user_id, day, share, dividend_before, effect_none)
    values (ev.id, p_user, p_day, share, round(before), round(eff)) on conflict do nothing;
  end loop;
  -- Varslet: strømsjokk eller uro som starter innen varselet i en region med minst warn_share av utbyttet
  select exists (
    select 1 from public.world_events w
    where w.kind in ('strom', 'uro') and w.starts_on > p_day and w.starts_on <= p_day + warn
      and coalesce((sh ->> w.region)::numeric, 0) >= warn_share
  ) into is_warned;
  insert into public.program_shadow_day
    (user_id, day, gross, contribution, shares, max_share, strom_loss, uro_loss, boom_gain, warned)
  values (p_user, p_day, round(g), round(coalesce(contrib, 0)), sh,
          coalesce((select max(v::numeric) from jsonb_each_text(sh) as t(k, v)), 0),
          round(s_loss), round(u_loss), round(b_gain), is_warned)
  on conflict do nothing;
  return found;
end;
$$;

-- Skyggejobben: trekker hendelser og logger alle dager med betalt utbytte som ikke er logget ennå (fra shadow_from).
-- Egen funksjon og egen cron-jobb, aldri kalt fra world_tick. Én spiller om gangen (B-401); en feil merkes som jobben
-- «skygge» i world_health() og rører ikke de vanlige jobbene. Gjør ingenting når events_shadow er av.
create or replace function public.world_shadow_tick()
returns void language plpgsql security definer set search_path = public as $$
declare
  c jsonb := public.world_programs_config();
  today date := public.world_today();
  from_day date := coalesce((c ->> 'shadow_from')::date, today);
  u record;
  d record;
  n_ok int := 0;
  n_fail int := 0;
begin
  if not coalesce((c ->> 'events_shadow')::boolean, false) then
    return;
  end if;
  perform public.world_job_start('skygge');
  begin
    perform public.world_events_ensure(today);
  exception when others then
    perform public.world_job_unit_error('skygge', 'hendelser', sqlerrm);
    n_fail := n_fail + 1;
  end;
  for u in
    select distinct dv.user_id
    from public.dividends dv
    where dv.day >= from_day and dv.day < today
      and not public.user_is_guest(dv.user_id)
      and not exists (select 1 from public.program_shadow_day p where p.user_id = dv.user_id and p.day = dv.day)
  loop
    begin
      for d in
        select dv.day from public.dividends dv
        where dv.user_id = u.user_id and dv.day >= from_day and dv.day < today
          and not exists (select 1 from public.program_shadow_day p where p.user_id = dv.user_id and p.day = dv.day)
        order by dv.day
      loop
        perform public.program_shadow_log_day(u.user_id, d.day);
      end loop;
      perform public.world_job_unit_ok('skygge', u.user_id::text, today - 1);
      n_ok := n_ok + 1;
    exception when others then
      perform public.world_job_unit_error('skygge', u.user_id::text, sqlerrm);
      n_fail := n_fail + 1;
    end;
  end loop;
  perform public.world_job_finish('skygge', n_ok, n_fail);
exception when others then
  -- Siste vern: skyggen skal aldri kaste en feil videre
  begin
    perform public.world_job_unit_error('skygge', 'jobben', sqlerrm);
  exception when others then
    null;
  end;
end;
$$;

-- ------------------------------------------------------------------------------------------------- skyggerapporten
-- Skyggerapporten for perioden (standard: alt som er logget). Regner av program_shadow_day med satsene i config, så
-- nye satser kan prøves i ettertid (p_budgets overstyrer shadow_budgets). Viser:
-- * datamengden (rader og plass per tabell),
-- * hendelser per type og region mot forventet antall (samme regel som simulatoren),
-- * per spiller: utbytte, bidrag og andelen bidrag, største regionandel, tap og gevinst uten program, og for hvert
--   satssett (0,5/1,5/4 og 1/3/8 %) hver program og satsing: kostnad, spart (eller ekstra og tapt ekstra), netto,
--   kostnad per spart krone og kostnad / beskyttet utbytte,
-- * «lav, høy ved varsel» med 14 dagers binding for Teknologi + Robusthet,
-- * laveste 14 dager med og uten Teknologi + Robusthet på Høy,
-- * dager der Høy ville vært rasjonelt,
-- * etableringen for seg (2 dagers utbytte per start eller bytte) og nettoen som andel av Konsernverdi nå.
create or replace function public.program_shadow_report(
  p_from date default null, p_to date default null, p_budgets jsonb default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  c jsonb := public.world_programs_config();
  e jsonb := coalesce(c -> 'events', '{}'::jsonb);
  sets jsonb := coalesce(p_budgets, c -> 'shadow_budgets', '[[0.005, 0.015, 0.04], [0.01, 0.03, 0.08]]'::jsonb);
  eff jsonb := coalesce(c -> 'effect', '[0.25, 0.6, 1]'::jsonb);
  protect numeric := coalesce((c ->> 'protect')::numeric, 0.8);
  gain numeric := coalesce((c ->> 'drift_gain')::numeric, 1.05);
  harder numeric := coalesce((c ->> 'drift_harder')::numeric, 0.5);
  bind int := coalesce((c ->> 'bind_days')::int, 14);
  est_days numeric := coalesce((c ->> 'establish_income_days')::numeric, 2);
  gap numeric := coalesce((e ->> 'gap_days')::numeric, 45);
  f date;
  t date;
  days int;
  mean_len numeric;
  volume jsonb;
  events jsonb;
  players jsonb := '[]'::jsonb;
  u record;
  s int;
  l int;
  b numeric;
  ef numeric;
  progs jsonb;
  set_out jsonb;
  cost numeric;
  saved numeric;
  extra numeric;
  lost numeric;
  -- «Lav, høy ved varsel»
  r record;
  lvl int;
  locked_until date;
  v_cost numeric;
  v_saved numeric;
  v_changes int;
  low_none numeric;
  low_tr numeric;
  rational int;
  kv numeric;
begin
  select coalesce(p_from, min(day)), coalesce(p_to, max(day)) into f, t from public.program_shadow_day;
  if f is null then
    f := coalesce(p_from, public.world_today());
    t := coalesce(p_to, f);
  end if;
  days := greatest(1, t - f + 1);

  -- Datamengden
  select jsonb_build_object(
    'world_events', jsonb_build_object('rader', (select count(*) from public.world_events),
                                       'bytes', pg_total_relation_size('public.world_events')),
    'world_event_exposure', jsonb_build_object('rader', (select count(*) from public.world_event_exposure),
                                               'bytes', pg_total_relation_size('public.world_event_exposure')),
    'program_shadow_day', jsonb_build_object('rader', (select count(*) from public.program_shadow_day),
                                             'bytes', pg_total_relation_size('public.program_shadow_day')),
    'world_event_draws', jsonb_build_object('rader', (select count(*) from public.world_event_draws),
                                            'bytes', pg_total_relation_size('public.world_event_draws')))
  into volume;

  -- Hendelser som startet i perioden, per type og region, og forventet antall per region (snitt mellom to hendelser +
  -- snittlengden, vektet med vinterandelen 5/12)
  mean_len := (7.0 / 12) * (0.5 * 13 + 0.25 * 7 + 0.25 * 10) + (5.0 / 12) * (0.4 * 13 + 0.2 * 7 + 0.4 * 10);
  select jsonb_build_object(
    'per_type', coalesce((select jsonb_object_agg(kind, n) from (
       select kind, count(*) as n from public.world_events where starts_on between f and t group by kind) x), '{}'),
    'per_region', coalesce((select jsonb_object_agg(region, n) from (
       select region, count(*) as n from public.world_events where starts_on between f and t group by region) x), '{}'),
    'forventet_per_region', round(days / (gap + mean_len), 2),
    'hoykonjunktur_storrelse', round(public.world_event_boom_size(c), 4))
  into events;

  for u in
    select p.user_id, coalesce(pr.nickname, 'Ukjent') as nick, count(*) as n_days,
           sum(p.gross) as gross, sum(p.contribution) as contrib, avg(p.max_share) as max_share,
           sum(p.strom_loss) as strom, sum(p.uro_loss) as uro, sum(p.boom_gain) as boom,
           avg(p.gross) as avg_gross
    from public.program_shadow_day p left join public.profiles pr on pr.id = p.user_id
    where p.day between f and t
    group by p.user_id, pr.nickname
    order by sum(p.contribution) / nullif(sum(p.contribution) + sum(p.gross), 0) desc nulls last
  loop
    set_out := '[]'::jsonb;
    for s in 0 .. jsonb_array_length(sets) - 1 loop
      progs := '{}'::jsonb;
      for l in 0 .. 2 loop
        b := (sets -> s ->> l)::numeric;
        ef := (eff ->> l)::numeric;
        cost := b * u.gross;
        -- Teknologi: strømsjokk; Robusthet: uro
        saved := protect * ef * u.strom;
        progs := jsonb_set(progs, array['teknologi'], coalesce(progs -> 'teknologi', '[]') || jsonb_build_object(
          'kostnad', round(cost), 'spart', round(saved), 'netto', round(saved - cost),
          'kostnad_per_spart_krone', case when saved > 0 then round(cost / saved, 2) end,
          'kostnad_per_beskyttet', case when u.strom > 0 then round(cost / u.strom, 2) end));
        saved := protect * ef * u.uro;
        progs := jsonb_set(progs, array['robusthet'], coalesce(progs -> 'robusthet', '[]') || jsonb_build_object(
          'kostnad', round(cost), 'spart', round(saved), 'netto', round(saved - cost),
          'kostnad_per_spart_krone', case when saved > 0 then round(cost / saved, 2) end,
          'kostnad_per_beskyttet', case when u.uro > 0 then round(cost / u.uro, 2) end));
        -- Driftsytelse: ekstra = gain × budsjettet, men sjokk og uro rammer (1 + harder × effekt) hardere
        extra := gain * cost;
        lost := harder * ef * (u.strom + u.uro);
        progs := jsonb_set(progs, array['drift'], coalesce(progs -> 'drift', '[]') || jsonb_build_object(
          'kostnad', round(cost), 'ekstra', round(extra), 'tapt_ekstra', round(lost),
          'netto', round(extra - lost - cost)));
      end loop;

      -- Teknologi + Robusthet: Lav, Høy ved varsel (varsel i region med minst warn_share), bundet 14 dager etter økning
      v_cost := 0; v_saved := 0; v_changes := 0; lvl := 0; locked_until := null;
      for r in
        select day, gross, strom_loss, uro_loss, warned from public.program_shadow_day
        where user_id = u.user_id and day between f and t order by day
      loop
        if r.warned and lvl < 2 then
          lvl := 2; locked_until := r.day + bind; v_changes := v_changes + 1;
        elsif lvl = 2 and not r.warned and r.day >= locked_until then
          lvl := 0; v_changes := v_changes + 1;
        end if;
        v_cost := v_cost + 2 * (sets -> s ->> lvl)::numeric * r.gross;
        v_saved := v_saved + protect * (eff ->> lvl)::numeric * (r.strom_loss + r.uro_loss);
      end loop;

      set_out := set_out || jsonb_build_object(
        'satser', sets -> s,
        'programmer', progs,
        'tek_rob_lav_hoy_ved_varsel', jsonb_build_object(
          'kostnad', round(v_cost), 'spart', round(v_saved), 'netto', round(v_saved - v_cost), 'okninger_og_senkinger', v_changes,
          'kostnad_per_spart_krone', case when v_saved > 0 then round(v_cost / v_saved, 2) end));
    end loop;

    -- Laveste 14 dager uten program og med Teknologi + Robusthet på Høy (første satssett)
    b := (sets -> 0 ->> 2)::numeric;
    select min(none14), min(tr14) into low_none, low_tr from (
      select sum(gross - strom_loss - uro_loss + boom_gain) over w as none14,
             sum(gross - strom_loss - uro_loss + boom_gain + protect * (strom_loss + uro_loss) - 2 * b * gross) over w as tr14,
             count(*) over w as n
      from public.program_shadow_day where user_id = u.user_id and day between f and t
      window w as (order by day rows between 13 preceding and current row)
    ) x where n = 14;

    -- Dager der Høy ville vært rasjonelt for Teknologi (spart ekstra mot Lav > merkostnad mot Lav)
    select count(*) into rational from public.program_shadow_day
    where user_id = u.user_id and day between f and t
      and protect * ((eff ->> 2)::numeric - (eff ->> 0)::numeric) * strom_loss
          > ((sets -> 0 ->> 2)::numeric - (sets -> 0 ->> 0)::numeric) * gross;

    kv := public.konsern_value(u.user_id);
    players := players || jsonb_build_object(
      'spiller', u.nick,
      'dager', u.n_days,
      'utbytte', round(u.gross),
      'bidrag', round(u.contrib),
      'andel_bidrag', round(u.contrib / nullif(u.contrib + u.gross, 0), 3),
      'storste_regionandel', round(u.max_share, 3),
      'uten_program', jsonb_build_object('strom_tap', round(u.strom), 'uro_tap', round(u.uro),
                                         'hoykonjunktur', round(u.boom), 'netto', round(u.boom - u.strom - u.uro)),
      'satssett', set_out,
      'laveste_14_dager', jsonb_build_object('uten', round(low_none), 'tek_rob_hoy', round(low_tr)),
      'dager_hoy_rasjonelt_teknologi', rational,
      'etablering_per_start', round(est_days * u.avg_gross),
      'konsernverdi_na', round(kv));
  end loop;

  return jsonb_build_object(
    'fra', f, 'til', t, 'dager', days,
    'datamengde', volume,
    'hendelser', events,
    'spillere', players);
end;
$$;

-- Bare serveren og eieren (via connectoren) bruker disse
revoke execute on function public.world_programs_config() from public, anon, authenticated;
revoke execute on function public.world_event_boom_size(jsonb) from public, anon, authenticated;
revoke execute on function public.dividend_region_shares(jsonb) from public, anon, authenticated;
revoke execute on function public.world_events_ensure(date) from public, anon, authenticated;
revoke execute on function public.program_shadow_log_day(uuid, date) from public, anon, authenticated;
revoke execute on function public.world_shadow_tick() from public, anon, authenticated;
revoke execute on function public.program_shadow_report(date, date, jsonb) from public, anon, authenticated;
-- Rådene (get_advisors) etter innleggingen: fast search_path også på de to rene hjelpefunksjonene (113_b)
alter function public.world_event_boom_size(jsonb) set search_path = public;
alter function public.world_is_winter(date) set search_path = public;
revoke execute on function public.world_is_winter(date) from public, anon, authenticated;

-- Cron-jobben startet 2.10.2026 etter innleggingen (eierens plan for 2.10, B-402/B-424) – ikke en del av migrasjonen:
--   select cron.schedule('verden-skygge', '17 * * * *', $$select public.world_shadow_tick()$$);
-- Stopp: select cron.unschedule('verden-skygge');
