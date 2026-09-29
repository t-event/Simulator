-- Stålverket: overtakelser av strategiske selskaper (B-335, K8). Kjørt som migrasjonen «overtakelser».
--
-- Regelen (B-331, B-332): bare strategiske selskaper kan overtas, aldri datterverk. Et bud er minst selskapets verdi,
-- betales fra konsernkassa med én gang og er offentlig. Eieren har 72 timer til å forsvare seg med kapital (fra kassa
-- eller forsvarsfondet); fondet teller også av seg selv, inntil selskapets verdi. Utfallet regnes uten tilfeldighet:
--   angrep  = 60 × √(bud / V) × (0,5 + 0,5 × angriperens aktivitet) + 2,5 per egne verk i regionen (høyst 10)
--   forsvar = Kontroll + 40 × √((forsvarskapital + fond, høyst V) / V)
--   bud og forsvar teller høyst 3 × V. Angriperen vinner hvis angrep > forsvar.
-- Overtatt: den gamle eieren får 85 % av budet, 15 % forsvinner; den nye eieren får resten av konsesjonen og
-- investeringene. Avverget: angriperen får 90 % tilbake. Forsvaret får 95 % tilbake, dit det kom fra.
-- Vinduet: ny eier er beskyttet de 3 første dagene, og budet må legges senest 5 dager før konsesjonen går ut. Samme
-- selskap kan ikke angripes igjen på 14 dager, og hver spiller har høyst ett forsøk om gangen.
-- Bryteren `config.world.takeover.enabled` er 0 til eieren slår den på. Speilet i `frontend/src/game/control.ts`.

update public.config
set value = value || jsonb_build_object('takeover', jsonb_build_object(
  'enabled', 0, 'defense_hours', 72, 'protect_days', 3, 'last_days', 5, 'cooldown_days', 14,
  'attack_w', 60, 'defense_w', 40, 'cap', 3, 'fund_cap', 1, 'region_per', 2.5, 'region_max', 10,
  'to_owner', 0.85, 'fail_refund', 0.9, 'defense_refund', 0.95))
where id = 'world' and not (value ? 'takeover');

create table if not exists public.takeovers (
  id bigserial primary key,
  company_id int not null references public.companies (id) on delete cascade,
  attacker_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  bid numeric not null,
  defense numeric not null default 0,
  defense_fund numeric not null default 0,
  opened_at timestamptz not null default now(),
  closes_at timestamptz not null,
  status text not null default 'åpent' check (status in ('åpent', 'overtatt', 'avverget', 'avbrutt')),
  attack_score numeric,
  defense_score numeric,
  resolved_at timestamptz
);
create index if not exists takeovers_company_status on public.takeovers (company_id, status);
create index if not exists takeovers_attacker_status on public.takeovers (attacker_id, status);
alter table public.takeovers enable row level security;
revoke all on public.takeovers from anon, authenticated;

alter table public.treasury_ledger drop constraint if exists treasury_ledger_kind_check;
alter table public.treasury_ledger add constraint treasury_ledger_kind_check
  check (kind in ('innskudd', 'anbud', 'refusjon', 'inntekt', 'utbetaling', 'justering', 'utbytte', 'bidrag',
                  'prosjekt', 'salg', 'investering', 'overtakelse'));

create or replace function public.takeover_cfg_num(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (value -> 'takeover' ->> p_key)::numeric from public.config where id = 'world'), p_default);
$$;
revoke execute on function public.takeover_cfg_num(text, numeric) from public, anon, authenticated;

-- Angrepsstyrken for et bud (ren regel, speilet i control.ts)
create or replace function public.takeover_attack_of(p_bid numeric, p_value numeric, p_activity numeric, p_region int)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select public.takeover_cfg_num('attack_w', 60)
         * sqrt(least(p_bid, public.takeover_cfg_num('cap', 3) * p_value) / greatest(1, p_value))
         * (0.5 + 0.5 * least(1, greatest(0, p_activity)))
       + least(public.takeover_cfg_num('region_max', 10), public.takeover_cfg_num('region_per', 2.5) * p_region);
$$;
revoke execute on function public.takeover_attack_of(numeric, numeric, numeric, int) from public, anon, authenticated;

-- Forsvarsstyrken (ren regel, speilet i control.ts)
create or replace function public.takeover_defense_of(p_control numeric, p_defense numeric, p_fund numeric, p_value numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select p_control + public.takeover_cfg_num('defense_w', 40)
         * sqrt(least(public.takeover_cfg_num('cap', 3) * p_value,
                      p_defense + least(greatest(0, p_fund), public.takeover_cfg_num('fund_cap', 1) * p_value))
                / greatest(1, p_value));
$$;
revoke execute on function public.takeover_defense_of(numeric, numeric, numeric, numeric) from public, anon, authenticated;

-- Egne verk i selskapets region
create or replace function public.plants_in_region(p_user uuid, p_region text)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.konsern k, jsonb_array_elements(k.plants) p
  where k.user_id = p_user and p ->> 'region' = p_region;
$$;
revoke execute on function public.plants_in_region(uuid, text) from public, anon, authenticated;

create or replace function public.takeover_attack(p_takeover bigint)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select public.takeover_attack_of(o.bid, public.company_value(o.company_id),
           public.activity_factor(o.attacker_id, (now() at time zone 'utc')::date),
           public.plants_in_region(o.attacker_id, c.region))
  from public.takeovers o join public.companies c on c.id = o.company_id where o.id = p_takeover;
$$;
revoke execute on function public.takeover_attack(bigint) from public, anon, authenticated;

create or replace function public.takeover_defense(p_takeover bigint)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select public.takeover_defense_of(coalesce((public.company_control(o.company_id) ->> 'score')::numeric, 0),
           o.defense, coalesce((select fund from public.konsern where user_id = o.owner_id), 0),
           public.company_value(o.company_id))
  from public.takeovers o where o.id = p_takeover;
$$;
revoke execute on function public.takeover_defense(bigint) from public, anon, authenticated;

-- Kan spilleren by på selskapet nå? Null hvis ikke (med grunnen), ellers minstebudet og styrken forsvaret har nå
create or replace function public.takeover_window(p_company int, p_user uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c record;
  since timestamptz;
  v numeric;
  reason text;
begin
  if public.takeover_cfg_num('enabled', 0) <= 0 or p_user is null then
    return null;
  end if;
  select * into c from public.companies where id = p_company and active;
  if c.id is null or c.owner_id is null or c.owner_id = p_user then
    return null;
  end if;
  select max(from_at) into since from public.company_owners
  where company_id = p_company and user_id = c.owner_id and from_at <= now();
  v := public.company_value(p_company);
  reason := case
    when exists (select 1 from public.takeovers where company_id = p_company and status = 'åpent') then 'pagar'
    when exists (select 1 from public.takeovers where attacker_id = p_user and status = 'åpent') then 'ett'
    when since > now() - make_interval(days => public.takeover_cfg_num('protect_days', 3)::int) then 'vern'
    when c.concession_until < now() + make_interval(days => public.takeover_cfg_num('last_days', 5)::int) then 'sent'
    when exists (select 1 from public.takeovers where company_id = p_company and status in ('overtatt', 'avverget')
                 and resolved_at > now() - make_interval(days => public.takeover_cfg_num('cooldown_days', 14)::int)) then 'pause'
    else null end;
  return json_build_object('open', reason is null, 'reason', reason, 'min_bid', round(v), 'value', round(v),
    'from', case when reason = 'vern' then since + make_interval(days => public.takeover_cfg_num('protect_days', 3)::int) end,
    'defense_now', round(public.takeover_defense_of(coalesce((public.company_control(p_company) ->> 'score')::numeric, 0), 0,
                     coalesce((select fund from public.konsern where user_id = c.owner_id), 0), v), 1),
    'attack_min', round(public.takeover_attack_of(v, v, public.activity_factor(p_user, (now() at time zone 'utc')::date),
                     public.plants_in_region(p_user, c.region)), 1));
end;
$$;
revoke execute on function public.takeover_window(int, uuid) from public, anon, authenticated;

-- Legg inn eller øk et bud på et selskap
create or replace function public.takeover_bid(p_company int, p_amount numeric)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  w json;
  o record;
  c record;
  bal numeric;
  amt numeric := round(coalesce(p_amount, 0));
  v_add numeric;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if public.takeover_cfg_num('enabled', 0) <= 0 then
    return json_build_object('ok', false, 'reason', 'av');
  end if;
  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_verden'));
  perform public.resolve_tenders();
  perform public.resolve_takeovers();
  select * into c from public.companies where id = p_company and active for update;
  select * into o from public.takeovers where company_id = p_company and status = 'åpent' for update;
  if o.id is not null then
    -- Bare angriperen kan øke sitt eget bud
    if o.attacker_id <> uid then
      return json_build_object('ok', false, 'reason', 'pagar');
    end if;
    if amt <= o.bid then
      return json_build_object('ok', false, 'reason', 'belop');
    end if;
    v_add := amt - o.bid;
  else
    w := public.takeover_window(p_company, uid);
    if w is null then
      return json_build_object('ok', false, 'reason', 'eier');
    end if;
    if (w ->> 'open')::boolean is not true then
      return json_build_object('ok', false, 'reason', w ->> 'reason');
    end if;
    if amt < (w ->> 'min_bid')::numeric then
      return json_build_object('ok', false, 'reason', 'belop', 'min_bid', w ->> 'min_bid');
    end if;
    v_add := amt;
  end if;
  select balance into bal from public.treasury where user_id = uid for update;
  if coalesce(bal, 0) < v_add then
    return json_build_object('ok', false, 'reason', 'kasse');
  end if;
  update public.treasury set balance = balance - v_add, updated_at = now() where user_id = uid;
  if o.id is not null then
    update public.takeovers set bid = amt where id = o.id;
  else
    insert into public.takeovers (company_id, attacker_id, owner_id, bid, closes_at)
    values (p_company, uid, c.owner_id, amt,
            now() + make_interval(hours => public.takeover_cfg_num('defense_hours', 72)::int))
    returning * into o;
  end if;
  insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, -v_add, 'overtakelse', 'bud:' || o.id);
  return json_build_object('ok', true, 'takeover', o.id);
end;
$$;
revoke execute on function public.takeover_bid(int, numeric) from public, anon;
grant execute on function public.takeover_bid(int, numeric) to authenticated;

-- Eieren forsvarer seg med kapital fra kassa eller fondet
create or replace function public.takeover_defend(p_takeover bigint, p_amount numeric, p_source text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o record;
  have numeric;
  amt numeric := round(coalesce(p_amount, 0));
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if p_source not in ('kasse', 'fond') or amt < 1000000 then
    return json_build_object('ok', false, 'reason', 'belop');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_verden'));
  perform public.resolve_takeovers();
  select * into o from public.takeovers where id = p_takeover and status = 'åpent' for update;
  if o.id is null or o.owner_id <> uid then
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
    insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, -amt, 'overtakelse', 'forsvar:' || o.id);
    update public.takeovers set defense = defense + amt where id = o.id;
  else
    update public.konsern set fund = fund - amt, updated_at = now() where user_id = uid;
    update public.takeovers set defense = defense + amt, defense_fund = defense_fund + amt where id = o.id;
  end if;
  return json_build_object('ok', true, 'defense', round(public.takeover_defense(o.id), 1),
                           'attack', round(public.takeover_attack(o.id), 1));
end;
$$;
revoke execute on function public.takeover_defend(bigint, numeric, text) from public, anon;
grant execute on function public.takeover_defend(bigint, numeric, text) to authenticated;

-- Avgjør forsøkene som har passert fristen (lat, fra world_tick og kallene over)
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
  to_owner numeric;
  back numeric;
  back_fund numeric;
begin
  for o in select * from public.takeovers where status = 'åpent' and closes_at <= now() order by closes_at for update loop
    select * into c from public.companies where id = o.company_id for update;
    att := public.takeover_attack(o.id);
    def := public.takeover_defense(o.id);
    -- Har eieren mistet selskapet på annen måte (konsesjonen gikk ut), avbrytes forsøket og alle får alt tilbake
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
    -- Forsvaret: 95 % tilbake, dit det kom fra
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
      to_owner := round(o.bid * public.takeover_cfg_num('to_owner', 0.85));
      insert into public.treasury (user_id, balance, updated_at) values (o.owner_id, to_owner, now())
      on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      insert into public.treasury_ledger (user_id, amount, kind, ref) values (o.owner_id, to_owner, 'overtakelse', 'solgt:' || o.id);
      -- Den nye eieren tar over resten av konsesjonen (og investeringene, som står på selskapet)
      update public.company_owners set until_at = now()
      where company_id = o.company_id and user_id = o.owner_id and from_at <= now() and until_at > now();
      insert into public.company_owners (company_id, user_id, from_at, until_at, tender_id)
      values (o.company_id, o.attacker_id, now(), c.concession_until, null);
      update public.companies set owner_id = o.attacker_id where id = o.company_id;
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

create or replace function public.world_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  hours int;
begin
  perform pg_advisory_xact_lock(hashtext('stalverk_verden'));
  select coalesce((value->>'tender_hours')::int, 48) into hours from public.config where id = 'world';
  perform public.resolve_tenders();
  perform public.resolve_takeovers();
  perform public.pay_company_income();
  perform public.pay_dividends();
  perform public.pay_contributions();
  for c in select * from public.companies where active loop
    if not exists (select 1 from public.tenders where company_id = c.id and status = 'åpent')
       and (c.concession_until is null or c.concession_until - make_interval(hours => hours) <= now())
       and not exists (select 1 from public.company_owners where company_id = c.id and from_at > now()) then
      perform public.open_tender(c.id, now());
    end if;
  end loop;
end;
$$;

-- Det spilleren ser: som i 067, med overtakelsene per selskap og bryteren
create or replace function public.world_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  out json;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  perform public.world_tick();
  perform public.konsern_settle(uid, now());
  select json_build_object(
    'companies', coalesce((select json_agg(json_build_object(
        'id', c.id, 'type', c.type, 'name', c.name,
        'owner', (select nickname from public.profiles where id = c.owner_id),
        'mine', c.owner_id = uid,
        'concession_until', c.concession_until,
        'next_owner', (select p.nickname from public.company_owners o join public.profiles p on p.id = o.user_id
                       where o.company_id = c.id and o.from_at > now() order by o.from_at limit 1),
        'next_mine', exists (select 1 from public.company_owners o where o.company_id = c.id and o.from_at > now()
                             and o.user_id = uid),
        'income_yesterday', (select amount from public.company_income i where i.company_id = c.id
                             and i.day = (now() at time zone 'utc')::date - 1),
        'income_mine', (select coalesce(sum(amount), 0) from public.company_income i where i.company_id = c.id
                        and i.owner_id = uid),
        'estimate_per_day', round(public.company_estimate(c.id)),
        -- Kontroll og investeringer (B-334), regionen på kartet (B-333)
        'region', c.region,
        'control', public.company_control(c.id),
        -- Overtakelser (B-335): pågående forsøk (offentlig), vinduet for et nytt bud og forrige utfall
        'takeover', (select json_build_object('id', o.id, 'attacker', (select nickname from public.profiles where id = o.attacker_id),
                       'mine_attack', o.attacker_id = uid, 'bid', o.bid,
                       'defense', case when o.owner_id = uid then o.defense else null end,
                       'opened_at', o.opened_at, 'closes_at', o.closes_at,
                       'attack', round(public.takeover_attack(o.id), 1), 'defense_score', round(public.takeover_defense(o.id), 1))
                     from public.takeovers o where o.company_id = c.id and o.status = 'åpent' limit 1),
        'takeover_window', public.takeover_window(c.id, uid),
        'takeover_last', (select json_build_object('status', o.status, 'attacker', (select nickname from public.profiles where id = o.attacker_id),
                            'bid', o.bid, 'attack', o.attack_score, 'defense', o.defense_score, 'resolved_at', o.resolved_at,
                            'mine_attack', o.attacker_id = uid, 'mine_owner', o.owner_id = uid)
                          from public.takeovers o where o.company_id = c.id and o.status in ('overtatt', 'avverget')
                          order by o.resolved_at desc limit 1),
        'tender', (select json_build_object('id', t.id, 'opens_at', t.opens_at, 'closes_at', t.closes_at,
                     'min_bid', t.min_bid, 'max_bid', t.max_bid,
                     'my_bid', (select amount from public.tender_bids b where b.tender_id = t.id and b.user_id = uid),
                     'bidders', coalesce((select json_agg(p.nickname order by lower(p.nickname))
                                          from public.tender_bids b join public.profiles p on p.id = b.user_id
                                          where b.tender_id = t.id), '[]'::json))
                   from public.tenders t where t.company_id = c.id and t.status = 'åpent'
                   order by t.closes_at limit 1),
        'last_result', (select json_build_object('id', t.id, 'closed_at', t.closes_at, 'status', t.status,
                          'winner', (select nickname from public.profiles where id = t.winner_id),
                          'won', t.winner_id = uid, 'winning_bid', t.winning_bid, 'bidders', t.bidders,
                          'tie', t.tie,
                          'my_bid', (select amount from public.tender_bids b where b.tender_id = t.id and b.user_id = uid))
                        from public.tenders t where t.company_id = c.id and t.status <> 'åpent'
                        order by t.closes_at desc limit 1)
      ) order by c.id) from public.companies c where c.active), '[]'::json),
    'takeovers_on', public.takeover_cfg_num('enabled', 0) > 0,
    'treasury', public.treasury_status(),
    'dividend', json_build_object(
      'per_day', round(public.dividend_to_treasury(public.dividend_per_day(uid), public.policy_keep(uid))),
      'full_per_day', round(public.dividend_per_day(uid)),
      'yesterday', (select amount from public.dividends where user_id = uid and day = (now() at time zone 'utc')::date - 1),
      'total', (select coalesce(sum(amount), 0) from public.dividends where user_id = uid)),
    'contribution', json_build_object(
      'per_day', round(public.contribution_amount(public.contribution_full(uid), 1)),
      'margin', round(public.contribution_margin(s.state)),
      'normal_t', round(public.meter_normal_rate(uid)),
      'activity', (select activity from public.contributions where user_id = uid order by day desc limit 1),
      'yesterday', (select amount from public.contributions where user_id = uid and day = (now() at time zone 'utc')::date - 1),
      'total', (select coalesce(sum(amount), 0) from public.contributions where user_id = uid)),
    -- Konsernet i ekte tid (B-326): verkene, køen, nivået og kassa; null uten rad (ikke åpnet ennå)
    'konsern', case when exists (select 1 from public.konsern where user_id = uid)
                    or coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
               then public.konsern_status(uid) end
  ) into out
  from (select (select state from public.saves where user_id = uid) as state) s;
  return out;
end;
$$;
