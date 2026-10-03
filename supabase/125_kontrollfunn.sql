-- B-443: rettinger etter kontrollen av PR #373–#380 (main 77aa9cd).
--
-- 1. Bytte til kompleks betaler lånet med salget først (som salg og avbestilling, B-437). Før ble salgspengene brukt i
--    kjøpet mens lånet sto, så kassa ble stående med penger som ellers hadde gått til lånet.
-- 2. Renten regnes før lånet endres (`bank_accrue`): full nedbetaling etter midnatt hoppet over dagens rente, og et nytt
--    lån arvet rentedatoen til det gamle. Nedbetalingen av inntekten har sin egen dato (`konsern.repay_at`).
-- 3. Egne økninger i et oppkjøp (regelsett 2) må være minst 5 % (som et overbud), og fristen kan forlenges til høyst
--    `extend_max_hours` (24) timer etter den opprinnelige fristen. Før kunne én krone kjøpe nye 12 timer igjen og igjen.
-- 4. Et overbud må også gi et sterkere oppkjøpsbud (`takeover_outbid_min`): budgiveren regnes med egen aktivitet og egne
--    verk i regionen. Ellers kunne et høyere beløp med svakere budgiver svekke runden – også med vilje, for å hjelpe eieren.
-- 5. Budet sendes med det appen viste (`takeover_bid` med p_seen_bid/p_seen_mine): har budet endret seg siden, avvises
--    det med «endret» i stedet for å bli et overbud på hele beløpet.
-- 6. Avbrutt oppkjøp: eierens motbud fra kassa får sin linje i kassaboka.
-- 7. Adminpanelet: hver melding i samtalene har rapporten den hører til, og lista over alle som har rapportert samme
--    melding, så «Svar B» aldri viser samtalen med A.
-- 8. Kjøperens anslag: `company_estimate_for(selskap, spiller)` – inntekten avhenger av eierens produksjon, så «Lønner det
--    seg?» regnes med kjøperens egen (`world_status.companies[].estimate_mine`).
--
-- konsern_order, resolve_takeovers, admin_reports og world_status endres med replace() på den levende funksjonen; den
-- levende kroppen er den patchede.
--
-- Kolonnen repay_at og extend_max_hours ble lagt inn først for seg (migrasjonen konsern_repay_at), fordi koblingen holder
-- igjen `alter table` i prøvekjøringene; resten som kontrollfunn. Begge er gjentakbare.

alter table public.konsern add column if not exists repay_at timestamptz;
update public.konsern set repay_at = loan_at where loan > 0 and repay_at is null;

update public.config
   set value = jsonb_set(value, '{takeover}', (value -> 'takeover') || jsonb_build_object('extend_max_hours', 24))
 where id = 'world';

-- Renten for hele ekte dager siden rentedatoen, før lånet endres. Kalles med konsernet låst (eller låser det)
create or replace function public.bank_accrue(p_user uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  k record;
  today date := public.world_today();
  days int;
  interest numeric;
begin
  select loan, loan_at into k from public.konsern where user_id = p_user for update;
  if coalesce(k.loan, 0) <= 0 or (k.loan_at is not null and public.world_day(k.loan_at) >= today) then
    return 0;
  end if;
  days := case when k.loan_at is null then 1 else today - public.world_day(k.loan_at) end;
  interest := round(k.loan * coalesce((public.bank_cfg() ->> 'rate_per_day')::numeric, 0.01) * days);
  update public.konsern set loan = loan + interest, loan_at = now(), repay_at = coalesce(repay_at, k.loan_at, now()),
         updated_at = now()
  where user_id = p_user;
  if interest > 0 then
    insert into public.konsern_loan_log (user_id, kind, amount, loan_after, ref)
    values (p_user, 'rente', interest, k.loan + interest, 'dager:' || days);
  end if;
  return interest;
end;
$$;
revoke execute on function public.bank_accrue(uuid) from public, anon, authenticated;

create or replace function public.bank_repay_from(p_user uuid, p_amount numeric, p_ref text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan numeric;
  v_repay numeric;
begin
  -- Renten fram til nå først (B-443), så en nedbetaling etter midnatt ikke hopper over dagens rente
  perform public.bank_accrue(p_user);
  select loan into v_loan from public.konsern where user_id = p_user for update;
  v_repay := least(coalesce(v_loan, 0), greatest(0, p_amount));
  if v_repay <= 0 then
    return 0;
  end if;
  update public.konsern set loan = loan - v_repay,
         loan_at = case when loan - v_repay > 0 then loan_at end,
         repay_at = case when loan - v_repay > 0 then repay_at end,
         updated_at = now()
  where user_id = p_user;
  update public.treasury set balance = balance - v_repay, updated_at = now() where user_id = p_user;
  insert into public.treasury_ledger (user_id, amount, kind, ref) values (p_user, -v_repay, 'lån', 'nedbetalt ' || p_ref);
  insert into public.konsern_loan_log (user_id, kind, amount, loan_after, ref)
  values (p_user, 'nedbetaling', v_repay, v_loan - v_repay, p_ref);
  return v_repay;
end;
$$;
revoke execute on function public.bank_repay_from(uuid, numeric, text) from public, anon, authenticated;

-- Rente for dagene siden rentedatoen, og repay_share av utbyttet og bidraget siden forrige nedbetaling (repay_at)
create or replace function public.bank_service()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
  cfg jsonb := public.bank_cfg();
  share numeric := coalesce((cfg ->> 'repay_share')::numeric, 0.5);
  today date := public.world_today();
  k record;
  interest numeric;
  income numeric;
  bal numeric;
  repay numeric;
  n_ok int := 0;
  n_fail int := 0;
begin
  perform public.world_job_start('bank');
  for u in
    select user_id from public.konsern
    where loan > 0 and (coalesce(repay_at, loan_at) is null or public.world_day(coalesce(repay_at, loan_at)) < today
                        or loan_at is null or public.world_day(loan_at) < today)
  loop
    begin
      perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || u.user_id::text));
      interest := public.bank_accrue(u.user_id);
      select * into k from public.konsern where user_id = u.user_id for update;
      if k.loan > 0 and (k.repay_at is null or public.world_day(k.repay_at) < today) then
        income := coalesce((select sum(l.amount) from public.treasury_ledger l
                            where l.user_id = u.user_id and l.kind in ('utbytte', 'bidrag') and l.amount > 0
                              and l.at > coalesce(k.repay_at, '-infinity'::timestamptz)), 0);
        select balance into bal from public.treasury where user_id = u.user_id for update;
        repay := greatest(0, least(k.loan, round(share * income), coalesce(bal, 0)));
        update public.konsern
        set loan = k.loan - repay,
            loan_at = case when k.loan - repay > 0 then k.loan_at end,
            repay_at = case when k.loan - repay > 0 then now() end,
            updated_at = now()
        where user_id = u.user_id;
        if repay > 0 then
          update public.treasury set balance = balance - repay, updated_at = now() where user_id = u.user_id;
          insert into public.treasury_ledger (user_id, amount, kind, ref)
          values (u.user_id, -repay, 'lån', 'nedbetalt dag:' || (today - 1));
          insert into public.konsern_loan_log (user_id, kind, amount, loan_after, ref)
          values (u.user_id, 'nedbetaling', repay, k.loan - repay, 'dag:' || (today - 1));
        end if;
      end if;
      perform public.world_job_unit_ok('bank', u.user_id::text, today - 1);
      n_ok := n_ok + 1;
    exception when others then
      perform public.world_job_unit_error('bank', u.user_id::text, sqlerrm);
      n_fail := n_fail + 1;
    end;
  end loop;
  perform public.world_job_finish('bank', n_ok, n_fail);
end;
$$;
revoke execute on function public.bank_service() from public, anon, authenticated;

-- konsern_order: renten før lånet leses, salget i et bytte betaler lånet først, og ny rentedato for nye lån
do $p$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('public.konsern_order(text,integer,text,text)'::regprocedure);
  if position('bank_accrue' in d) > 0 then
    return;
  end if;
  o := d;
  d := replace(d, $a$  draw numeric := 0;
  room numeric;
begin$a$, $a$  draw numeric := 0;
  room numeric;
  repay_sale numeric := 0;
begin$a$);
  d := replace(d, $a$  select * into k from public.konsern where user_id = uid for update;
  researched$a$, $a$  select * into k from public.konsern where user_id = uid for update;
  -- Renten fram til nå før lånet brukes (B-443)
  if public.bank_accrue(uid) > 0 then
    select * into k from public.konsern where user_id = uid for update;
  end if;
  researched$a$);
  d := replace(d, $a$  select balance into bal from public.treasury where user_id = uid for update;
  if cost > coalesce(bal, 0) + sale then$a$, $a$  select balance into bal from public.treasury where user_id = uid for update;
  -- Salget i et bytte går først til lånet, som ved salg og avbestilling (B-443)
  repay_sale := least(coalesce(k.loan, 0), sale);
  if cost > coalesce(bal, 0) + sale - repay_sale then$a$);
  d := replace(d, $a$    draw := cost - coalesce(bal, 0) - sale;
    room := greatest(0, public.bank_limit(uid) - coalesce(k.loan, 0));$a$,
               $a$    draw := cost - coalesce(bal, 0) - sale + repay_sale;
    room := greatest(0, public.bank_limit(uid) - (coalesce(k.loan, 0) - repay_sale));$a$);
  d := replace(d, $a$    insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, sale, 'salg', 'salg:' || p_plant);
  end if;$a$, $a$    insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, sale, 'salg', 'salg:' || p_plant);
    perform public.bank_repay_from(uid, sale, 'bytte:' || p_plant);
  end if;$a$);
  d := replace(d, $a$    update public.konsern set loan = loan + draw, loan_at = coalesce(loan_at, now()), updated_at = now()
    where user_id = uid;$a$, $a$    update public.konsern set loan = loan + draw,
           loan_at = case when loan > 0 then coalesce(loan_at, now()) else now() end,
           repay_at = case when loan > 0 then coalesce(repay_at, loan_at, now()) else now() end,
           updated_at = now()
    where user_id = uid;$a$);
  d := replace(d, $a$values (uid, 'lån', draw, coalesce(k.loan, 0) + draw, 'prosjekt:' || new_id);$a$,
               $a$values (uid, 'lån', draw, coalesce(k.loan, 0) - repay_sale + draw, 'prosjekt:' || new_id);$a$);
  if position('bank_accrue(uid)' in d) = 0 or position('repay_sale := least' in d) = 0
     or position('- sale + repay_sale' in d) = 0 or position('''bytte:''' in d) = 0
     or position('repay_at = case when loan > 0' in d) = 0 or position('- repay_sale + draw' in d) = 0 then
    raise exception 'konsern_order: ikke alle bitene ble byttet (%)', length(d) - length(o);
  end if;
  execute d;
end $p$;

-- resolve_takeovers: eierens motbud fra kassa får en linje i kassaboka når forsøket avbrytes
do $p$
declare
  d text := pg_get_functiondef('public.resolve_takeovers()'::regprocedure);
  a text := $a$        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      end if;
      update public.konsern set fund = fund + o.defense_fund, updated_at = now() where user_id = o.owner_id and o.defense_fund > 0;$a$;
begin
  if position('motbud tilbake avbrutt' in d) > 0 then
    return;
  end if;
  if position(a in d) = 0 then
    raise exception 'resolve_takeovers har endret seg – patchen passer ikke';
  end if;
  d := replace(d, a, $b$        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
        insert into public.treasury_ledger (user_id, amount, kind, ref)
        values (o.owner_id, o.defense - o.defense_fund, 'overtakelse', 'motbud tilbake avbrutt:' || o.id);
      end if;
      update public.konsern set fund = fund + o.defense_fund, updated_at = now() where user_id = o.owner_id and o.defense_fund > 0;$b$);
  execute d;
end $p$;

-- Minste overbud for en spiller: minst 5 % over, og stort nok til at budet blir sterkere enn det som står med
-- spillerens egen aktivitet og egne verk i regionen. null når ingen bud innenfor taket blir sterkere
create or replace function public.takeover_outbid_min(p_takeover bigint, p_user uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  o record;
  c record;
  v numeric;
  cur numeric;
  act numeric;
  reg numeric;
  mult numeric;
  need numeric;
begin
  select * into o from public.takeovers where id = p_takeover;
  select * into c from public.companies where id = o.company_id;
  if o.id is null or c.id is null then
    return null;
  end if;
  v := public.company_value(o.company_id);
  cur := public.takeover_attack(o.id);
  act := least(1, greatest(0, public.activity_factor(p_user, public.world_today())));
  reg := least(public.takeover_cfg_num('region_max', 10),
               public.takeover_cfg_num('region_per', 2.5) * public.plants_in_region(p_user, c.region));
  mult := public.takeover_cfg_num('attack_w', 60) * (0.5 + 0.5 * act);
  need := case when cur < reg then 0 else greatest(1, v) * ((cur - reg) / mult) ^ 2 end;
  -- Litt over, så budet blir sterkere og ikke bare like sterkt
  need := need * 1.001 + 1;
  if need > public.takeover_cfg_num('attack_cap', 10) * greatest(1, v) then
    return null;
  end if;
  return ceil(greatest(public.takeover_min_raise(o.bid), need) / 1000000) * 1000000;
end;
$$;
revoke all on function public.takeover_outbid_min(bigint, uuid) from public, anon, authenticated;

create or replace function public.takeover_compete(p_takeover bigint, p_user uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  o record;
  c record;
  reason text;
  m numeric;
begin
  if public.takeover_cfg_num('enabled', 0) <= 0 or p_user is null then
    return null;
  end if;
  select * into o from public.takeovers where id = p_takeover and status = 'åpent';
  if o.id is null or o.rules = 1 or o.attacker_id = p_user or o.owner_id = p_user then
    return null;
  end if;
  select * into c from public.companies where id = o.company_id and active;
  if c.id is null or c.owner_id = p_user then
    return null;
  end if;
  m := public.takeover_outbid_min(o.id, p_user);
  reason := case
    when exists (select 1 from public.profiles where id = p_user and (flagged_at is not null or banned)) then 'sperret'
    when exists (select 1 from public.takeovers where attacker_id = p_user and status = 'åpent') then 'ett'
    when m is null then 'svak'
    else null end;
  return json_build_object('open', reason is null, 'reason', reason, 'min_bid', round(coalesce(m, 0)));
end;
$$;
revoke all on function public.takeover_compete(bigint, uuid) from public, anon, authenticated;

create or replace function public.takeover_bid(p_company integer, p_amount numeric)
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
  kind text;
  prev uuid;
  ext timestamptz;
  m numeric;
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
    if o.attacker_id = uid then
      -- Regelsett 2 (B-443): en økning må være minst 5 %, som et overbud – ellers kunne én krone kjøpe ny frist
      if o.rules = 1 and amt <= o.bid then
        return json_build_object('ok', false, 'reason', 'belop');
      end if;
      if o.rules <> 1 and amt < public.takeover_min_raise(o.bid) then
        return json_build_object('ok', false, 'reason', 'okning', 'min_bid', round(public.takeover_min_raise(o.bid)));
      end if;
      v_add := amt - o.bid;
      kind := 'okt';
    else
      -- Overbud (B-442): bare i regelsett 2, ikke eieren, ett åpent bud om gangen, og sterkere enn budet som står (B-443)
      if o.rules = 1 then
        return json_build_object('ok', false, 'reason', 'pagar');
      end if;
      if c.owner_id = uid or o.owner_id = uid then
        return json_build_object('ok', false, 'reason', 'eier');
      end if;
      if exists (select 1 from public.takeovers where attacker_id = uid and status = 'åpent') then
        return json_build_object('ok', false, 'reason', 'ett');
      end if;
      m := public.takeover_outbid_min(o.id, uid);
      if m is null then
        return json_build_object('ok', false, 'reason', 'svak');
      end if;
      if amt < m then
        return json_build_object('ok', false, 'reason', 'overbud', 'min_bid', round(m));
      end if;
      v_add := amt;
      kind := 'overbud';
      prev := o.attacker_id;
    end if;
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
    kind := 'bud';
  end if;
  select balance into bal from public.treasury where user_id = uid for update;
  if coalesce(bal, 0) < v_add then
    return json_build_object('ok', false, 'reason', 'kasse');
  end if;
  update public.treasury set balance = balance - v_add, updated_at = now() where user_id = uid;
  if o.id is not null then
    -- Sene bud i regelsett 2 flytter fristen, så eieren rekker å svare – men aldri mer enn extend_max_hours etter den
    -- opprinnelige fristen (B-443)
    ext := case when o.rules = 1 then o.closes_at
                else greatest(o.closes_at,
                              least(now() + make_interval(hours => public.takeover_cfg_num('extend_hours', 12)::int),
                                    o.opened_at + make_interval(hours => (public.takeover_cfg_num('defense_hours', 72)
                                                                         + public.takeover_cfg_num('extend_max_hours', 24))::int)))
           end;
    if prev is not null then
      insert into public.treasury (user_id, balance, updated_at) values (prev, o.bid, now())
      on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      insert into public.treasury_ledger (user_id, amount, kind, ref) values (prev, o.bid, 'overtakelse', 'overbudt:' || o.id);
      update public.takeovers set attacker_id = uid, bid = amt, closes_at = ext where id = o.id;
      perform public.chat_event(format('%s byr over med %s på %s. Budet fra %s er trukket, og %s har til %s på seg til å svare.',
        public.chat_nick(uid), public.chat_kr(amt), lower(c.name), public.chat_nick(prev), public.chat_nick(o.owner_id),
        to_char(ext at time zone 'Europe/Oslo', 'DD.MM. "kl." HH24:MI')));
    else
      update public.takeovers set bid = amt, closes_at = ext where id = o.id;
    end if;
  else
    insert into public.takeovers (company_id, attacker_id, owner_id, bid, closes_at)
    values (p_company, uid, c.owner_id, amt,
            now() + make_interval(hours => public.takeover_cfg_num('defense_hours', 72)::int))
    returning * into o;
  end if;
  insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, -v_add, 'overtakelse', 'bud:' || o.id);
  insert into public.takeover_bids (takeover_id, user_id, amount, kind) values (o.id, uid, amt, kind);
  return json_build_object('ok', true, 'takeover', o.id);
end;
$$;
revoke all on function public.takeover_bid(integer, numeric) from public, anon;
grant execute on function public.takeover_bid(integer, numeric) to authenticated;

-- Budet med det appen viste (B-443): p_seen_bid er budet som sto (0 når det ikke sto noe), p_seen_mine om det var
-- spillerens eget. Har noe endret seg, avvises budet med «endret» – da kan ikke en økning bli et overbud på hele beløpet
create or replace function public.takeover_bid(p_company integer, p_amount numeric, p_seen_bid numeric,
                                               p_seen_mine boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  o record;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_verden'));
  perform public.resolve_tenders();
  perform public.resolve_takeovers();
  select * into o from public.takeovers where company_id = p_company and status = 'åpent';
  if (o.id is null and coalesce(p_seen_bid, 0) > 0)
     or (o.id is not null and (o.bid <> coalesce(p_seen_bid, 0) or (o.attacker_id = uid) <> coalesce(p_seen_mine, false))) then
    return json_build_object('ok', false, 'reason', 'endret');
  end if;
  return public.takeover_bid(p_company, p_amount);
end;
$$;
revoke all on function public.takeover_bid(integer, numeric, numeric, boolean) from public, anon;
grant execute on function public.takeover_bid(integer, numeric, numeric, boolean) to authenticated;

-- Anslaget for en bestemt eier: inntekten avhenger av eierens egen produksjon (som company_estimate med eieren)
create or replace function public.company_estimate_for(p_company integer, p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case c.type
    when 'slagg' then public.scrap_yard_estimate(p_user)
                      / (coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
                         * coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000))
                      * coalesce((w.value->>'slag_per_steel')::numeric, 0.12)
                      * coalesce((w.value->>'slag_fee_per_t')::numeric, 5000)
    when 'verksted' then public.scrap_yard_estimate(p_user)
                      / (coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
                         * coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000))
                      * public.maint_rate_estimate(p_user)
                      * coalesce((w.value->>'workshop_share')::numeric, 0.5)
    else public.scrap_yard_estimate(p_user)
  end
  from public.companies c, public.config w
  where c.id = p_company and w.id = 'world';
$$;
revoke all on function public.company_estimate_for(integer, uuid) from public, anon, authenticated;

-- world_status: spillerens eget anslag (til «Lønner det seg?»)
do $p$
declare
  d text := pg_get_functiondef('public.world_status()'::regprocedure);
  a text := $a$'estimate_per_day', round(public.company_estimate(c.id)),$a$;
begin
  if position('estimate_mine' in d) > 0 then
    return;
  end if;
  if position(a in d) = 0 then
    raise exception 'world_status har endret seg – patchen passer ikke';
  end if;
  d := replace(d, a, a || $b$ 'estimate_mine', case when c.owner_id = uid then null
                                       else round(public.company_estimate_for(c.id, uid)) end,$b$);
  execute d;
end $p$;

-- admin_reports: rapporten hver melding hører til, og alle som har rapportert samme melding
do $p$
declare
  d text := pg_get_functiondef('public.admin_reports(text)'::regprocedure);
  a text := $a$'role', case when m.player = z.reporter then 'reporter' else 'author' end,$a$;
  b text := $b$'canReporter', r.reporter is not null, 'canAuthor', r.author is not null,$b$;
begin
  if position('''reporters''' in d) > 0 then
    return;
  end if;
  if position(a in d) = 0 or position(b in d) = 0 then
    raise exception 'admin_reports har endret seg – patchen passer ikke';
  end if;
  d := replace(d, a, a || $c$ 'report', m.report_id,$c$);
  d := replace(d, b, b || $c$
               'reporters', (select json_agg(json_build_object('report', z.id, 'nick', coalesce(q2.nickname, z.reporter_nick, ''),
                                                               'can', z.reporter is not null) order by z.reported_at)
                               from public.reports z left join public.profiles q2 on q2.id = z.reporter
                              where z.kind = r.kind and z.message_id = r.message_id),$c$);
  execute d;
end $p$;
