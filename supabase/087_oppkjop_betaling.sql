-- B-375: oppkjøp som lønner seg for kjøperen, og eieren får betalt for tida hen mister.
-- 1. Verdien av et selskap (minstebudet) er 10 dagers inntekt, ikke 30. Kjøperen får 14 dager, så et oppkjøp til
--    minstebudet lønner seg litt. Kontrollen og motbudet regnes fortsatt mot verdien.
-- 2. Eieren som blir kjøpt ut, får inntekten for dagene som er igjen av konsesjonen pluss 85 % av det hen har investert
--    i sin periode – aldri mer enn 85 % av budet. Resten av budet forsvinner. Det som ble investert fra
--    beredskapsfondet, går tilbake til fondet (fondet skal aldri bli penger i kassa).
-- 3. Investeringer teller ikke i verdien (som før), men telles nå per eierperiode i `company_owners`.

update public.config
set value = jsonb_set(jsonb_set(value, '{control,value_days}', '10'), '{takeover,invest_back}', '0.85')
where id = 'world';

alter table public.company_owners
  add column if not exists invested_kasse numeric not null default 0,
  add column if not exists invested_fond numeric not null default 0;
alter table public.takeovers
  add column if not exists owner_paid numeric,
  add column if not exists owner_paid_fund numeric;

-- Investeringer før B-375 (dry-run: én rad, 34,74 mill. fra kassa, ingen fra fondet)
update public.company_owners o
set invested_kasse = s.amt
from (select o2.company_id, o2.user_id, o2.from_at, -sum(l.amount) as amt
      from public.company_owners o2
      join public.treasury_ledger l on l.user_id = o2.user_id and l.kind = 'investering'
        and l.ref = 'selskap:' || o2.company_id and l.at >= o2.from_at and l.at < o2.until_at
      group by 1, 2, 3) s
where o.company_id = s.company_id and o.user_id = s.user_id and o.from_at = s.from_at;

-- Hva eieren får ved et oppkjøp: {kasse, fond}. Speiles av `buyoutPay` i game/control.ts
create or replace function public.takeover_payout(p_bid numeric, p_per_day numeric, p_days_left numeric,
                                                  p_inv_kasse numeric, p_inv_fond numeric)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  cap numeric := greatest(0, coalesce(p_bid, 0)) * public.takeover_cfg_num('to_owner', 0.85);
  back numeric := public.takeover_cfg_num('invest_back', 0.85);
  kasse numeric;
  fond numeric;
begin
  kasse := least(cap, greatest(0, coalesce(p_per_day, 0)) * greatest(0, coalesce(p_days_left, 0))
                      + back * greatest(0, coalesce(p_inv_kasse, 0)));
  fond := least(cap - kasse, back * greatest(0, coalesce(p_inv_fond, 0)));
  return jsonb_build_object('kasse', round(kasse), 'fond', round(greatest(0, fond)));
end;
$$;
revoke execute on function public.takeover_payout(numeric, numeric, numeric, numeric, numeric)
  from public, anon, authenticated;

-- Investeringen legges også på eierens periode
create or replace function public.company_invest(p_company integer, p_amount numeric, p_source text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c record;
  have numeric;
  amt numeric := round(coalesce(p_amount, 0));
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  if p_source not in ('kasse', 'fond') or amt < public.control_cfg_num('invest_min', 1000000) then
    return json_build_object('ok', false, 'reason', 'belop');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || uid::text));
  perform public.resolve_tenders();
  select * into c from public.companies where id = p_company and active for update;
  if c.id is null or c.owner_id is distinct from uid then
    return json_build_object('ok', false, 'reason', 'eier');
  end if;
  if p_source = 'kasse' then
    select balance into have from public.treasury where user_id = uid for update;
  else
    select fund into have from public.konsern where user_id = uid for update;
  end if;
  if coalesce(have, 0) < amt then
    return json_build_object('ok', false, 'reason', 'kasse');
  end if;
  if p_source = 'kasse' then
    update public.treasury set balance = balance - amt, updated_at = now() where user_id = uid;
    insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, -amt, 'investering', 'selskap:' || p_company);
    update public.company_owners set invested_kasse = invested_kasse + amt
    where company_id = p_company and user_id = uid and from_at <= now() and until_at > now();
  else
    update public.konsern set fund = fund - amt, updated_at = now() where user_id = uid;
    update public.company_owners set invested_fond = invested_fond + amt
    where company_id = p_company and user_id = uid and from_at <= now() and until_at > now();
  end if;
  update public.companies set invested = invested + amt where id = p_company;
  return json_build_object('ok', true, 'control', public.company_control(p_company));
end;
$$;

-- Oppkjøpet avgjøres: eieren får `takeover_payout` i stedet for 85 % av budet
create or replace function public.resolve_takeovers()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  c record;
  att numeric;
  def numeric;
  won boolean;
  pay jsonb;
  per record;
  back numeric;
  back_fund numeric;
  new_until timestamptz;
begin
  for o in select * from public.takeovers where status = 'åpent' and closes_at <= now() order by closes_at for update loop
    select * into c from public.companies where id = o.company_id for update;
    att := public.takeover_attack(o.id);
    def := public.takeover_defense(o.id);
    if c.owner_id is distinct from o.owner_id then
      update public.takeovers set status = 'avbrutt', resolved_at = now(), attack_score = att, defense_score = def
      where id = o.id;
      insert into public.treasury (user_id, balance, updated_at) values (o.attacker_id, o.bid, now())
      on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      insert into public.treasury_ledger (user_id, amount, kind, ref) values (o.attacker_id, o.bid, 'overtakelse', 'avbrutt:' || o.id);
      if o.defense - o.defense_fund > 0 then
        insert into public.treasury (user_id, balance, updated_at) values (o.owner_id, o.defense - o.defense_fund, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      end if;
      update public.konsern set fund = fund + o.defense_fund, updated_at = now() where user_id = o.owner_id and o.defense_fund > 0;
      continue;
    end if;
    won := att > def;
    back := round((o.defense - o.defense_fund) * public.takeover_cfg_num('defense_refund', 0.95));
    back_fund := round(o.defense_fund * public.takeover_cfg_num('defense_refund', 0.95));
    if back > 0 then
      insert into public.treasury (user_id, balance, updated_at) values (o.owner_id, back, now())
      on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      insert into public.treasury_ledger (user_id, amount, kind, ref) values (o.owner_id, back, 'overtakelse', 'forsvar tilbake:' || o.id);
    end if;
    if back_fund > 0 then
      update public.konsern set fund = fund + back_fund, updated_at = now() where user_id = o.owner_id;
    end if;
    if won then
      -- B-375: dagene eieren mister og 85 % av det hen investerte i sin periode, høyst 85 % av budet
      select coalesce(sum(invested_kasse), 0) as ik, coalesce(sum(invested_fond), 0) as ifo into per
      from public.company_owners
      where company_id = o.company_id and user_id = o.owner_id and from_at <= now() and until_at > now();
      pay := public.takeover_payout(o.bid, coalesce(public.company_estimate(o.company_id), 0),
                                    greatest(0, extract(epoch from c.concession_until - now()) / 86400), per.ik, per.ifo);
      if (pay ->> 'kasse')::numeric > 0 then
        insert into public.treasury (user_id, balance, updated_at) values (o.owner_id, (pay ->> 'kasse')::numeric, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
        insert into public.treasury_ledger (user_id, amount, kind, ref)
        values (o.owner_id, (pay ->> 'kasse')::numeric, 'overtakelse', 'solgt:' || o.id);
      end if;
      if (pay ->> 'fond')::numeric > 0 then
        update public.konsern set fund = fund + (pay ->> 'fond')::numeric, updated_at = now() where user_id = o.owner_id;
      end if;
      update public.takeovers set owner_paid = (pay ->> 'kasse')::numeric, owner_paid_fund = (pay ->> 'fond')::numeric
      where id = o.id;
      if exists (select 1 from public.company_owners where company_id = o.company_id and from_at > now())
         or exists (select 1 from public.tenders where company_id = o.company_id and status = 'åpent') then
        new_until := c.concession_until;
      else
        new_until := greatest(c.concession_until,
                              now() + make_interval(days => coalesce((select (value->>'concession_days')::int
                                                                      from public.config where id = 'world'), 14)));
      end if;
      update public.company_owners set until_at = now()
      where company_id = o.company_id and user_id = o.owner_id and from_at <= now() and until_at > now();
      insert into public.company_owners (company_id, user_id, from_at, until_at, tender_id)
      values (o.company_id, o.attacker_id, now(), new_until, null);
      update public.companies set owner_id = o.attacker_id, concession_until = new_until where id = o.company_id;
    else
      back := round(o.bid * public.takeover_cfg_num('fail_refund', 0.9));
      insert into public.treasury (user_id, balance, updated_at) values (o.attacker_id, back, now())
      on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      insert into public.treasury_ledger (user_id, amount, kind, ref) values (o.attacker_id, back, 'overtakelse', 'avverget:' || o.id);
    end if;
    update public.takeovers set status = case when won then 'overtatt' else 'avverget' end, resolved_at = now(),
      attack_score = round(att, 1), defense_score = round(def, 1)
    where id = o.id;
  end loop;
end;
$$;
revoke execute on function public.resolve_takeovers() from public, anon, authenticated;

-- Kontrollen får med det appen trenger for å vise hva eieren får ved et oppkjøp (`buyout`)
create or replace function public.company_control(p_company integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c record;
  v numeric;
  run_start timestamptz;
  parts jsonb;
  total numeric;
  n_owned int;
  n_region int;
  fund numeric;
  per record;
begin
  select * into c from public.companies where id = p_company;
  if c.id is null or c.owner_id is null then
    return null;
  end if;
  v := public.company_value(p_company);
  select min(o.from_at) into run_start from public.company_owners o
  where o.company_id = p_company and o.user_id = c.owner_id and o.from_at <= now()
    and o.from_at >= coalesce((select max(x.until_at) from public.company_owners x
                               where x.company_id = p_company and x.user_id <> c.owner_id and x.until_at <= now()),
                              '-infinity'::timestamptz);
  select count(*) into n_owned from public.companies where owner_id = c.owner_id and active;
  select count(*) into n_region from public.konsern k, jsonb_array_elements(k.plants) p
  where k.user_id = c.owner_id and p ->> 'region' = c.region;
  select coalesce(k.fund, 0) into fund from public.konsern k where k.user_id = c.owner_id;
  select coalesce(sum(invested_kasse), 0) as ik, coalesce(sum(invested_fond), 0) as ifo into per
  from public.company_owners
  where company_id = p_company and user_id = c.owner_id and from_at <= now() and until_at > now();
  parts := jsonb_build_object(
    'eier', public.control_cfg_num('owner', 30),
    'aktivitet', round(public.control_cfg_num('activity', 20)
                       * public.activity_factor(c.owner_id, public.world_today()), 1),
    'investering', round(public.control_cfg_num('invest', 25) * (1 - exp(-c.invested / v)), 1),
    'region', least(public.control_cfg_num('region_max', 10), public.control_cfg_num('region_per', 2.5) * n_region),
    'eiertid', least(public.control_cfg_num('weeks_max', 10),
                     floor(extract(epoch from now() - coalesce(run_start, now())) / (7 * 86400))),
    'fond', round(public.control_cfg_num('fund', 10) * (1 - exp(-coalesce(fund, 0) / (2 * v))), 1),
    'belastning', -public.control_cfg_num('load', 5) * greatest(0, n_owned - 1));
  select sum(value::numeric) into total from jsonb_each_text(parts);
  return jsonb_build_object('score', greatest(0, least(100, round(total))), 'parts', parts, 'value', round(v),
                            'invested', c.invested, 'since', run_start,
                            'protected_until', public.company_protected_until(p_company),
                            'buyout', jsonb_build_object(
                              'per_day', round(coalesce(public.company_estimate(p_company), 0)),
                              'days_left', round(greatest(0, extract(epoch from c.concession_until - now()) / 86400), 2),
                              'invested_kasse', per.ik, 'invested_fond', per.ifo));
end;
$$;
revoke execute on function public.company_control(int) from public, anon, authenticated;

-- world_status: det siste oppkjøpet sier hva eieren fikk (`owner_paid`), så appen kan skrive det i loggen.
-- Resten av funksjonen er urørt (siste hele versjon i 077_bidrag_snitt.sql).
do $$
declare
  d text := pg_get_functiondef('public.world_status()'::regprocedure);
  old text := '''mine_attack'', o.attacker_id = uid, ''mine_owner'', o.owner_id = uid)';
begin
  if position(old in d) = 0 then
    raise exception 'fant ikke takeover_last i world_status';
  end if;
  execute replace(d, old, '''mine_attack'', o.attacker_id = uid, ''mine_owner'', o.owner_id = uid, '
                          '''owner_paid'', case when o.owner_id = uid then o.owner_paid end)');
end;
$$;
