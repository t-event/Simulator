-- 101 Verdensjobbene behandler hver spiller for seg, og overvåkes (B-401).
--
-- Før gikk målingene, utbyttet, bidraget og selskapsinntekten i én løkke (målingene i én setning) over alle spillere:
-- en uventet feil hos én spiller stoppet jobben for alle, og `world_tick` rullet alt tilbake. Nå:
--   * hver spiller (selskap for selskapsinntekten) behandles i en egen deltransaksjon: feiler noe, rulles bare den
--     spillerens behandling tilbake, feilen logges, og resten fortsetter;
--   * nye forsøk kan ikke gi dobbel utbetaling: betalingene skrives med `on conflict do nothing`, og kassa krediteres
--     bare når raden faktisk ble satt inn – i samme deltransaksjon som raden;
--   * hver jobb i `world_tick` kjøres for seg; én jobb som feiler, stopper ikke de andre;
--   * overvåkingen viser siste start, siste fullførte og siste feilfrie kjøring per jobb, og siste vellykkede behandling
--     og siste feil per spiller (`world_health()`, `world_health_players()`).
-- Reglene for beløpene er uendret. Prøvekjøringen 1.10 (rullet tilbake, «i morgen» med en midlertidig `world_today`):
-- gammel og ny versjon betalte samme utbytte (13), bidrag (15), selskapsinntekt (1), kasseposter og målinger for alle
-- feilfrie spillere; én spiller med bevisst feil fikk status «feil», og et nytt forsøk etter feilen betalte spilleren
-- samme beløp én gang (to kasseposter, fortsatt to etter enda en kjøring).
-- Oppryddingen (feilloggen og gamle målinger) står i én setning i `world_prune`.

-- 1. Overvåking ---------------------------------------------------------------------------------------------------------

create table if not exists public.world_jobs (
  job text primary key,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_ok_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  ok_units int not null default 0,
  failed_units int not null default 0
);
alter table public.world_jobs enable row level security;
revoke all on public.world_jobs from anon, authenticated;

create table if not exists public.world_job_units (
  job text not null,
  unit text not null,
  last_ok_at timestamptz,
  last_ok_day date,
  last_error_at timestamptz,
  last_error text,
  errors_in_row int not null default 0,
  primary key (job, unit)
);
alter table public.world_job_units enable row level security;
revoke all on public.world_job_units from anon, authenticated;

create table if not exists public.world_job_errors (
  id bigserial primary key,
  job text not null,
  unit text,
  at timestamptz not null default now(),
  error text not null
);
alter table public.world_job_errors enable row level security;
revoke all on public.world_job_errors from anon, authenticated;

create or replace function public.world_job_start(p_job text)
returns void language sql security definer set search_path = public as $$
  insert into public.world_jobs (job, last_started_at) values (p_job, now())
  on conflict (job) do update set last_started_at = now();
$$;

/** Jobben ble fullført; feilfri bare når ingen enheter feilet */
create or replace function public.world_job_finish(p_job text, p_ok int, p_failed int)
returns void language sql security definer set search_path = public as $$
  insert into public.world_jobs (job, last_started_at, last_finished_at, last_ok_at, ok_units, failed_units)
  values (p_job, now(), now(), case when p_failed = 0 then now() end, p_ok, p_failed)
  on conflict (job) do update
    set last_finished_at = now(), ok_units = p_ok, failed_units = p_failed,
        last_ok_at = case when p_failed = 0 then now() else public.world_jobs.last_ok_at end;
$$;

/** Hele jobben feilet (f.eks. utvalget av spillere) */
create or replace function public.world_job_error(p_job text, p_error text)
returns void language sql security definer set search_path = public as $$
  insert into public.world_jobs (job, last_error_at, last_error) values (p_job, now(), left(p_error, 500))
  on conflict (job) do update set last_error_at = now(), last_error = left(p_error, 500);
  insert into public.world_job_errors (job, unit, error) values (p_job, null, left(p_error, 500));
$$;

/**
 * Én spiller (eller ett selskap) er behandlet. `p_always = false` skriver bare når enheten hadde feil (målingene hvert
 * kvarter skal ikke gi en skriving per spiller – siste måling står i `contribution_samples.last_at`).
 */
create or replace function public.world_job_unit_ok(p_job text, p_unit text, p_day date, p_always boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_always then
    insert into public.world_job_units (job, unit, last_ok_at, last_ok_day, errors_in_row)
    values (p_job, p_unit, now(), p_day, 0)
    on conflict (job, unit) do update set last_ok_at = now(), last_ok_day = p_day, errors_in_row = 0;
  else
    update public.world_job_units set last_ok_at = now(), last_ok_day = p_day, errors_in_row = 0
    where job = p_job and unit = p_unit and errors_in_row > 0;
  end if;
end;
$$;

create or replace function public.world_job_unit_error(p_job text, p_unit text, p_error text)
returns void language sql security definer set search_path = public as $$
  insert into public.world_job_units (job, unit, last_error_at, last_error, errors_in_row)
  values (p_job, p_unit, now(), left(p_error, 500), 1)
  on conflict (job, unit) do update
    set last_error_at = now(), last_error = left(p_error, 500), errors_in_row = public.world_job_units.errors_in_row + 1;
  insert into public.world_job_errors (job, unit, error) values (p_job, p_unit, left(p_error, 500));
$$;

/**
 * Rydding hvert kvarter (med målingene): feilloggen holdes i 30 dager, målingene i 20. Én setning, så oppryddingen
 * står samlet og ikke blandes inn i funksjonene som betaler.
 */
create or replace function public.world_prune(p_today date)
returns void language sql security definer set search_path = public as $$
  with errors as (delete from public.world_job_errors where at < now() - interval '30 days' returning 1)
  delete from public.contribution_samples where day < p_today - 20;
$$;

revoke execute on function public.world_job_start(text) from public, anon, authenticated;
revoke execute on function public.world_job_finish(text, int, int) from public, anon, authenticated;
revoke execute on function public.world_job_error(text, text) from public, anon, authenticated;
revoke execute on function public.world_job_unit_ok(text, text, date, boolean) from public, anon, authenticated;
revoke execute on function public.world_job_unit_error(text, text, text) from public, anon, authenticated;
revoke execute on function public.world_prune(date) from public, anon, authenticated;

-- 2. Jobbene, én spiller om gangen ---------------------------------------------------------------------------------

create or replace function public.pay_dividends()
returns void language plpgsql security definer set search_path = public as $$
declare
  u record;
  d date;
  from_day date;
  max_days int;
  paid date;
  base numeric;
  amt numeric;
  kasse numeric;
  today date := public.world_today();
  n_ok int := 0;
  n_fail int := 0;
begin
  perform public.world_job_start('utbytte');
  select coalesce((value -> 'dividend' ->> 'from')::date, date '2026-09-29'),
         coalesce((value -> 'dividend' ->> 'max_days')::int, 14)
    into from_day, max_days
  from public.config where id = 'world';
  for u in
    select s.user_id
    from public.saves s join public.profiles p on p.id = s.user_id
    join public.konsern k on k.user_id = s.user_id
    where p.flagged_at is null and not p.banned
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
      and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
      and jsonb_array_length(k.plants) > 0
  loop
    select max(day) into paid from public.dividends where user_id = u.user_id;
    d := greatest(from_day, coalesce(paid + 1, from_day), today - max_days);
    if d >= today then
      continue;
    end if;
    -- Én spiller om gangen (B-401): feiler noe, rulles bare denne spillerens dager tilbake og prøves igjen neste gang
    begin
      perform public.konsern_settle(u.user_id, now());
      while d < today loop
        base := public.dividend_avg(u.user_id, d);
        amt := round(base * public.activity_factor(u.user_id, d));
        kasse := round(public.dividend_to_treasury(base, public.policy_keep(u.user_id)) * public.activity_factor(u.user_id, d));
        insert into public.dividends (user_id, day, amount, to_fund)
        values (u.user_id, d, kasse, greatest(0, amt - kasse)) on conflict do nothing;
        if found and amt > 0 then
          insert into public.treasury (user_id, balance, updated_at) values (u.user_id, kasse, now())
          on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
          insert into public.treasury_ledger (user_id, amount, kind, ref) values (u.user_id, kasse, 'utbytte', 'utbytte:' || d);
          update public.konsern set fund = fund + greatest(0, amt - kasse), updated_at = now() where user_id = u.user_id;
        end if;
        d := d + 1;
      end loop;
      perform public.world_job_unit_ok('utbytte', u.user_id::text, today - 1);
      n_ok := n_ok + 1;
    exception when others then
      perform public.world_job_unit_error('utbytte', u.user_id::text, sqlerrm);
      n_fail := n_fail + 1;
    end;
  end loop;
  perform public.world_job_finish('utbytte', n_ok, n_fail);
end;
$$;

create or replace function public.pay_contributions()
returns void language plpgsql security definer set search_path = public as $$
declare
  u record;
  d date;
  from_day date;
  max_days int;
  fl numeric;
  decay_f numeric;
  last_day date;
  prev numeric;
  full_day numeric;
  rate numeric;
  gained numeric;
  act numeric;
  amt numeric;
  f numeric;
  today date := public.world_today();
  n_ok int := 0;
  n_fail int := 0;
begin
  perform public.world_job_start('bidrag');
  select coalesce((value -> 'contribution' ->> 'from')::date, date '2026-09-30'),
         coalesce((value -> 'contribution' ->> 'max_days')::int, 14),
         coalesce((value -> 'contribution' ->> 'floor')::numeric, 0.3),
         coalesce((value -> 'contribution' ->> 'decay')::numeric, 0.9)
    into from_day, max_days, fl, decay_f
  from public.config where id = 'world';
  for u in
    select s.user_id
    from public.saves s join public.profiles p on p.id = s.user_id
    where p.flagged_at is null and not p.banned and not public.user_is_guest(s.user_id)
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
      and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
  loop
    select day, activity into last_day, prev from public.contributions where user_id = u.user_id order by day desc limit 1;
    d := greatest(from_day, coalesce(last_day + 1, from_day), today - max_days);
    if d >= today then
      continue;
    end if;
    -- Én spiller om gangen (B-401)
    begin
      while d < today loop
        select a.full_day, a.normal_t into full_day, rate from public.contribution_avg(u.user_id, d) a;
        gained := coalesce((select gained_t from public.production_days where user_id = u.user_id and day = d), 0);
        act := case when rate > 0 then least(1, gained / rate) else 0 end;
        f := public.activity_factor(u.user_id, d);
        act := greatest(act, fl * f, case when f > 0 then coalesce(prev * decay_f, fl * f) else 0 end);
        amt := round(public.contribution_amount(full_day, act));
        insert into public.contributions (user_id, day, amount, activity, counted_t, full_day)
        values (u.user_id, d, amt, round(act, 4), least(gained, rate), round(full_day))
        on conflict do nothing;
        if found and amt > 0 then
          insert into public.treasury (user_id, balance, updated_at) values (u.user_id, amt, now())
          on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
          insert into public.treasury_ledger (user_id, amount, kind, ref) values (u.user_id, amt, 'bidrag', 'bidrag:' || d);
        end if;
        prev := act;
        d := d + 1;
      end loop;
      perform public.world_job_unit_ok('bidrag', u.user_id::text, today - 1);
      n_ok := n_ok + 1;
    exception when others then
      perform public.world_job_unit_error('bidrag', u.user_id::text, sqlerrm);
      n_fail := n_fail + 1;
    end;
  end loop;
  perform public.world_job_finish('bidrag', n_ok, n_fail);
end;
$$;

create or replace function public.pay_company_income()
returns void language plpgsql security definer set search_path = public as $$
declare
  c record;
  d date;
  own uuid;
  fee numeric;
  tons numeric;
  nb int;
  first_owner date;
  paid date;
  boost numeric;
  amt numeric;
  n_ok int := 0;
  n_fail int := 0;
begin
  perform public.world_job_start('selskapsinntekt');
  for c in select * from public.companies where active loop
    -- Ett selskap om gangen (B-401)
    begin
      fee := public.company_fee(c.type);
      boost := 1 + public.control_cfg_num('income_max', 0.25) * (1 - exp(-c.invested / greatest(1, public.company_value(c.id))));
      select public.world_day(min(from_at)) into first_owner from public.company_owners where company_id = c.id;
      if first_owner is not null then
        select max(day) into paid from public.company_income where company_id = c.id;
        d := greatest(first_owner, coalesce(paid + 1, first_owner));
        if d < public.world_today() then
          while d < public.world_today() loop
            select user_id into own from public.company_owners
            where company_id = c.id and from_at <= (d + time '12:00') at time zone 'Europe/Oslo'
              and until_at > (d + time '12:00') at time zone 'Europe/Oslo'
            order by from_at desc limit 1;
            if own is not null then
              select coalesce(sum(public.company_counted_t(c.type, pd.user_id, d)), 0), count(*) filter (where pd.gained_t > 0)
                into tons, nb
              from public.production_days pd join public.profiles p on p.id = pd.user_id
              where pd.day = d and pd.user_id <> own and p.flagged_at is null and not p.banned;
              amt := round(tons * fee * boost);
              insert into public.company_income (company_id, day, owner_id, counted_t, buyers, amount)
              values (c.id, d, own, tons, nb, amt)
              on conflict do nothing;
              if found and tons > 0 then
                insert into public.treasury (user_id, balance, updated_at) values (own, amt, now())
                on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
                insert into public.treasury_ledger (user_id, amount, kind, ref)
                values (own, amt, 'inntekt', c.type || ':' || d);
              end if;
            else
              insert into public.company_income (company_id, day, owner_id, counted_t, buyers, amount)
              values (c.id, d, null, 0, 0, 0)
              on conflict do nothing;
            end if;
            d := d + 1;
          end loop;
          perform public.world_job_unit_ok('selskapsinntekt', 'selskap:' || c.id, public.world_today() - 1);
          n_ok := n_ok + 1;
        end if;
      end if;
    exception when others then
      perform public.world_job_unit_error('selskapsinntekt', 'selskap:' || c.id, sqlerrm);
      n_fail := n_fail + 1;
    end;
  end loop;
  perform public.world_job_finish('selskapsinntekt', n_ok, n_fail);
end;
$$;

create or replace function public.sample_contributions()
returns void language plpgsql security definer set search_path = public as $$
declare
  mins int;
  today date := public.world_today();
  u record;
  n_ok int := 0;
  n_fail int := 0;
begin
  select coalesce((value -> 'contribution' ->> 'sample_minutes')::int, 15) into mins from public.config where id = 'world';
  update public.world_tick_state set samples_at = now()
  where id = 1 and samples_at <= now() - make_interval(mins => mins);
  if not found then
    return;
  end if;
  perform public.world_job_start('malinger');
  for u in
    select s.user_id
    from public.saves s join public.profiles p on p.id = s.user_id
    where p.flagged_at is null and not p.banned and not public.user_is_guest(s.user_id)
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
      and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
  loop
    -- Én spiller om gangen (B-401): en feil hos én spiller stopper ikke målingene for de andre
    begin
      insert into public.contribution_samples as c (user_id, day, n, sum_full, sum_t, sum_margin, sum_div, n_div, last_at)
      select s.user_id, today, 1, public.contribution_full(s.user_id), public.meter_normal_rate(s.user_id),
             public.contribution_margin(s.state), public.dividend_per_day(s.user_id), 1, now()
      from public.saves s where s.user_id = u.user_id
      on conflict (user_id, day) do update
        set n = c.n + 1, sum_full = c.sum_full + excluded.sum_full, sum_t = c.sum_t + excluded.sum_t,
            sum_margin = c.sum_margin + excluded.sum_margin, sum_div = c.sum_div + excluded.sum_div,
            n_div = c.n_div + 1, last_at = now();
      perform public.world_job_unit_ok('malinger', u.user_id::text, today, false);
      n_ok := n_ok + 1;
    exception when others then
      perform public.world_job_unit_error('malinger', u.user_id::text, sqlerrm);
      n_fail := n_fail + 1;
    end;
  end loop;
  perform public.world_prune(today);
  perform public.world_job_finish('malinger', n_ok, n_fail);
  -- Skyggerevisjonen av verdiene fra mobilen (B-395): feiler den, går målingene likevel
  begin
    perform public.world_input_audit_run();
  exception when others then
    perform public.world_job_error('skygge', sqlerrm);
  end;
end;
$$;

create or replace function public.world_tick()
returns void language plpgsql security definer set search_path = public as $$
declare
  c record;
  hours int;
  gap int;
begin
  if not pg_try_advisory_xact_lock(hashtext('stalverk_verden')) then
    return;
  end if;
  select coalesce((value->>'tick_seconds')::int, 30) into gap from public.config where id = 'world';
  update public.world_tick_state set last_at = now()
  where id = 1 and last_at <= now() - make_interval(secs => gap);
  if not found then
    return;
  end if;
  select coalesce((value->>'tender_hours')::int, 48) into hours from public.config where id = 'world';
  -- Hver jobb for seg (B-401): én jobb som feiler, stopper ikke de andre
  begin
    perform public.world_job_start('anbud');
    perform public.resolve_tenders();
    perform public.world_job_finish('anbud', 1, 0);
  exception when others then
    perform public.world_job_error('anbud', sqlerrm);
  end;
  begin
    perform public.world_job_start('overtakelser');
    perform public.resolve_takeovers();
    perform public.world_job_finish('overtakelser', 1, 0);
  exception when others then
    perform public.world_job_error('overtakelser', sqlerrm);
  end;
  begin
    perform public.pay_company_income();
  exception when others then
    perform public.world_job_error('selskapsinntekt', sqlerrm);
  end;
  begin
    perform public.pay_dividends();
  exception when others then
    perform public.world_job_error('utbytte', sqlerrm);
  end;
  begin
    perform public.pay_contributions();
  exception when others then
    perform public.world_job_error('bidrag', sqlerrm);
  end;
  begin
    perform public.sample_contributions();
  exception when others then
    perform public.world_job_error('malinger', sqlerrm);
  end;
  begin
    perform public.world_job_start('nye_anbud');
    for c in select * from public.companies where active loop
      if not exists (select 1 from public.tenders where company_id = c.id and status = 'åpent')
         and (c.concession_until is null or c.concession_until - make_interval(hours => hours) <= now())
         and not exists (select 1 from public.company_owners where company_id = c.id and from_at > now()) then
        perform public.open_tender(c.id, now());
      end if;
    end loop;
    perform public.world_job_finish('nye_anbud', 1, 0);
  exception when others then
    perform public.world_job_error('nye_anbud', sqlerrm);
  end;
  perform public.world_job_finish('tick', 1, 0);
end;
$$;

-- 3. Helsesjekken -------------------------------------------------------------------------------------------------

/**
 * Status per jobb (B-401): siste start, siste fullførte og siste feilfrie kjøring, og om noe står fast. Jobbene går med
 * `world_tick` hvert 5. minutt (målingene hvert 15.), så en fullført kjøring eldre enn 20 minutter (35 for målingene)
 * betyr at jobben står.
 */
create or replace function public.world_health()
returns table (job text, status text, last_started_at timestamptz, last_finished_at timestamptz, last_ok_at timestamptz,
               minutes_since_finished numeric, ok_units int, failed_units int, units_failing bigint,
               last_error_at timestamptz, last_error text)
language sql stable security definer set search_path = public as $$
  select j.job,
         case
           when j.last_finished_at is null or j.last_finished_at < now() - case when j.job = 'malinger'
                then interval '35 minutes' else interval '20 minutes' end then 'står'
           when j.last_error_at > j.last_finished_at then 'feil i jobben'
           when (select count(*) from public.world_job_units u where u.job = j.job and u.errors_in_row > 0) > 0
             then 'feil hos enkelte'
           else 'ok'
         end,
         j.last_started_at, j.last_finished_at, j.last_ok_at,
         round(extract(epoch from now() - j.last_finished_at) / 60, 1),
         j.ok_units, j.failed_units,
         (select count(*) from public.world_job_units u where u.job = j.job and u.errors_in_row > 0),
         j.last_error_at, j.last_error
  from public.world_jobs j
  order by j.job;
$$;

/**
 * Per spiller med konsern (B-401): siste måling, til og med hvilken dag utbytte og bidrag er betalt, siste vellykkede
 * behandling per jobb, og feil som står. `status` er «ok» når siste måling er under 35 minutter gammel og gårsdagen er
 * betalt (fra 00:30 norsk tid).
 */
create or replace function public.world_health_players()
returns table (user_id uuid, last_sample_at timestamptz, dividends_through date, contributions_through date,
               dividend_ok_at timestamptz, contribution_ok_at timestamptz, failing_jobs text, last_error text, status text)
language sql stable security definer set search_path = public as $$
  with players as (
    select s.user_id
    from public.saves s join public.profiles p on p.id = s.user_id
    where p.flagged_at is null and not p.banned and not public.user_is_guest(s.user_id)
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
      and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
  ),
  info as (
    select pl.user_id,
           (select max(c.last_at) from public.contribution_samples c where c.user_id = pl.user_id) as last_sample_at,
           (select max(d.day) from public.dividends d where d.user_id = pl.user_id) as dividends_through,
           (select max(c.day) from public.contributions c where c.user_id = pl.user_id) as contributions_through,
           (select u.last_ok_at from public.world_job_units u where u.job = 'utbytte' and u.unit = pl.user_id::text) as dividend_ok_at,
           (select u.last_ok_at from public.world_job_units u where u.job = 'bidrag' and u.unit = pl.user_id::text) as contribution_ok_at,
           (select string_agg(u.job, ', ') from public.world_job_units u where u.unit = pl.user_id::text and u.errors_in_row > 0) as failing_jobs,
           (select u.last_error from public.world_job_units u where u.unit = pl.user_id::text and u.errors_in_row > 0
            order by u.last_error_at desc limit 1) as last_error,
           exists (select 1 from public.konsern k where k.user_id = pl.user_id and jsonb_array_length(k.plants) > 0) as has_plants
    from players pl
  )
  select i.user_id, i.last_sample_at, i.dividends_through, i.contributions_through, i.dividend_ok_at, i.contribution_ok_at,
         i.failing_jobs, i.last_error,
         case
           when i.failing_jobs is not null then 'feil'
           when i.last_sample_at is null or i.last_sample_at < now() - interval '35 minutes' then 'mangler måling'
           when now() > (public.world_today()::timestamp + time '00:30') at time zone 'Europe/Oslo'
                and ((i.has_plants and coalesce(i.dividends_through, date '2000-01-01') < public.world_today() - 1)
                     or coalesce(i.contributions_through, date '2000-01-01') < public.world_today() - 1)
             then 'ikke betalt for i går'
           else 'ok'
         end
  from info i
  order by i.user_id;
$$;

revoke execute on function public.world_health() from public, anon, authenticated;
revoke execute on function public.world_health_players() from public, anon, authenticated;
