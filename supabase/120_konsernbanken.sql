-- B-437: konsernbanken – lån fra serveren til nye verk og modernisering.
--
-- Eieren valgte «Verk og modernisering»: lånet kan bare brukes på bestillinger i konsernet (`konsern_order`: nye verk,
-- utbygging, modernisering og bytte til kompleks), aldri på anbud, oppkjøpsbud, motbud eller investering i Kontroll.
-- Makt mot andre spillere skal fortsatt tjenes (B-323).
--
-- Regelen:
-- - Rammen er `limit_days` (10) dagers inntekt: snittet av utbyttet og bidraget de siste `window_days` (7) ekte dagene,
--   fra kassaboka. Uten inntekt er rammen 0.
-- - Lånet tas bare i en bestilling: kassa betaler det den har, lånet resten (`konsern_order_loan`). Pengene står aldri i
--   kassa, så de kan ikke brukes på noe annet.
-- - Renten er `rate_per_day` (1 %) per ekte dag og legges til lånet. Hver ekte dag går `repay_share` (halvparten) av
--   utbyttet og bidraget som har kommet inn siden sist, til nedbetaling (`bank_service`, fra `world_tick`).
-- - Selges et verk eller avbestilles noe mens lånet står, går pengene først til lånet – ellers kunne et lån bli til
--   penger i kassa.
-- - Låsene: rådgivende lås per spiller, så `konsern`, så `treasury` – samme rekkefølge som `konsern_order` (B-433).

alter table public.konsern
  add column if not exists loan numeric not null default 0 check (loan >= 0),
  add column if not exists loan_at timestamptz;

alter table public.treasury_ledger drop constraint treasury_ledger_kind_check;
alter table public.treasury_ledger add constraint treasury_ledger_kind_check check (kind = any (array[
  'innskudd', 'anbud', 'refusjon', 'inntekt', 'utbetaling', 'justering', 'utbytte', 'bidrag', 'prosjekt', 'salg',
  'investering', 'overtakelse', 'lån']));

-- Lånet for seg: opptak, rente og nedbetaling (kassaboka viser bare det som går inn og ut av kassa)
create table if not exists public.konsern_loan_log (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null check (kind in ('lån', 'rente', 'nedbetaling')),
  amount numeric not null,
  loan_after numeric not null,
  ref text
);
create index if not exists konsern_loan_log_user on public.konsern_loan_log (user_id, at desc);
alter table public.konsern_loan_log enable row level security;
revoke all on public.konsern_loan_log from anon, authenticated;
revoke all on sequence public.konsern_loan_log_id_seq from anon, authenticated;

update public.config
set value = jsonb_set(value, '{bank}',
  '{"enabled": true, "limit_days": 10, "rate_per_day": 0.01, "repay_share": 0.5, "window_days": 7}'::jsonb)
where id = 'world' and not (value ? 'bank');

create or replace function public.bank_cfg()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value -> 'bank' from public.config where id = 'world'), '{}'::jsonb);
$$;
revoke execute on function public.bank_cfg() from public, anon, authenticated;

-- Rammen: limit_days × snittet av utbyttet og bidraget per ekte dag de siste window_days dagene (0 når banken er av)
create or replace function public.bank_limit(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with c as (select public.bank_cfg() as cfg)
  select case when coalesce((c.cfg ->> 'enabled')::boolean, false) then
    round(coalesce((c.cfg ->> 'limit_days')::numeric, 10) / greatest(1, coalesce((c.cfg ->> 'window_days')::int, 7))
          * coalesce((select sum(l.amount) from public.treasury_ledger l
                      where l.user_id = p_user and l.kind in ('utbytte', 'bidrag') and l.amount > 0
                        and l.at >= now() - make_interval(days => greatest(1, coalesce((c.cfg ->> 'window_days')::int, 7)))),
                     0))
  else 0 end
  from c;
$$;
revoke execute on function public.bank_limit(uuid) from public, anon, authenticated;

create or replace function public.bank_status(p_user uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'enabled', coalesce((public.bank_cfg() ->> 'enabled')::boolean, false),
    'loan', coalesce(k.loan, 0),
    'limit', public.bank_limit(p_user),
    'rate', coalesce((public.bank_cfg() ->> 'rate_per_day')::numeric, 0.01),
    'share', coalesce((public.bank_cfg() ->> 'repay_share')::numeric, 0.5))
  from (select 1) x left join public.konsern k on k.user_id = p_user;
$$;
revoke execute on function public.bank_status(uuid) from public, anon, authenticated;

-- Pengene fra et salg eller en avbestilling går først til lånet. Kalles med kassa og konsernet alt låst
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
  select loan into v_loan from public.konsern where user_id = p_user for update;
  v_repay := least(coalesce(v_loan, 0), greatest(0, p_amount));
  if v_repay <= 0 then
    return 0;
  end if;
  update public.konsern set loan = loan - v_repay, loan_at = case when loan - v_repay > 0 then loan_at end,
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

create or replace function public.konsern_status(p_user uuid)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'level', coalesce(k.level, 0),
    'floor', coalesce(k.floor, 0),
    'earned', coalesce(k.earned, 0),
    'next_id', coalesce(k.next_id, 1),
    'plants', coalesce(k.plants, '[]'::jsonb),
    'orders', coalesce((select json_agg(json_build_object('id', o.id, 'kind', o.kind, 'plant_id', o.plant_id,
                          'type', o.type, 'name', o.name, 'cost', o.cost, 'region', o.region,
                          'starts_at', round(extract(epoch from o.starts_at) * 1000),
                          'ready_at', round(extract(epoch from o.ready_at) * 1000), 'status', o.status)
                          order by o.starts_at, o.id)
                        from public.konsern_orders o where o.user_id = p_user and o.status in ('kø', 'i gang')),
                       '[]'::json),
    'bound', coalesce((select sum(cost) from public.konsern_orders o
                       where o.user_id = p_user and o.status in ('kø', 'i gang')), 0),
    'balance', coalesce((select balance from public.treasury where user_id = p_user), 0),
    'policy', coalesce(k.policy, 'ut'),
    'policy_at', case when k.policy_at is null then null else round(extract(epoch from k.policy_at) * 1000) end,
    'fund', coalesce(k.fund, 0),
    'bank', public.bank_status(p_user))
  from (select 1) x left join public.konsern k on k.user_id = p_user;
$$;

-- Bestilling med lån: samme som `konsern_order`, men det kassa ikke har, lånes (innenfor rammen)
create or replace function public.konsern_order_loan(p_kind text, p_plant integer default null, p_type text default null,
                                                     p_region text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('stalverk.bank', 'on', true);
  return public.konsern_order(p_kind, p_plant, p_type, p_region);
end;
$$;
revoke execute on function public.konsern_order_loan(text, integer, text, text) from public, anon;
grant execute on function public.konsern_order_loan(text, integer, text, text) to authenticated;

-- `konsern_order`, `konsern_cancel` og `konsern_sell` endres med replace() på den levende funksjonen (som 114/115/119),
-- så ingenting annet i dem endres. Etterpå:
-- - `konsern_order`: mangler kassa penger og kallet kom via `konsern_order_loan`, lånes det som mangler (innenfor
--   rammen, ellers «laan»). Lånet krediteres kassa rett før prosjektet trekkes, og svaret har `loan`.
-- - `konsern_cancel`: låser konsernet før kassa (B-433), og refusjonen går først til lånet.
-- - `konsern_sell`: salget går først til lånet.
do $p$
declare
  d text;
  o text;
begin
  d := pg_get_functiondef('public.konsern_order(text,integer,text,text)'::regprocedure);
  o := d;
  d := replace(d, $a$  v_region text;
begin$a$, $a$  v_region text;
  draw numeric := 0;
  room numeric;
begin$a$);
  d := replace(d, $a$  if cost > coalesce(bal, 0) + sale then
    return json_build_object('ok', false, 'reason', 'kasse', 'balance', coalesce(bal, 0), 'cost', cost);
  end if;$a$, $a$  if cost > coalesce(bal, 0) + sale then
    -- Konsernbanken (B-437): bare via `konsern_order_loan`, og bare det kassa mangler, innenfor rammen
    if coalesce(current_setting('stalverk.bank', true), '') <> 'on' then
      return json_build_object('ok', false, 'reason', 'kasse', 'balance', coalesce(bal, 0), 'cost', cost);
    end if;
    draw := cost - coalesce(bal, 0) - sale;
    room := greatest(0, public.bank_limit(uid) - coalesce(k.loan, 0));
    if draw > room then
      return json_build_object('ok', false, 'reason', 'laan', 'balance', coalesce(bal, 0), 'cost', cost, 'room', room);
    end if;
  end if;$a$);
  d := replace(d, $a$  returning id into new_id;
  update public.treasury$a$, $a$  returning id into new_id;
  if draw > 0 then
    update public.konsern set loan = loan + draw, loan_at = coalesce(loan_at, now()), updated_at = now()
    where user_id = uid;
    insert into public.treasury (user_id, balance, updated_at) values (uid, draw, now())
    on conflict (user_id) do update set balance = public.treasury.balance + draw, updated_at = now();
    insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, draw, 'lån', 'lån:' || new_id);
    insert into public.konsern_loan_log (user_id, kind, amount, loan_after, ref)
    values (uid, 'lån', draw, coalesce(k.loan, 0) + draw, 'prosjekt:' || new_id);
  end if;
  update public.treasury$a$);
  d := replace(d, $a$'sale', sale, 'konsern'$a$, $a$'sale', sale, 'loan', draw, 'konsern'$a$);
  if length(d) - length(o) < 900 then
    raise exception 'konsern_order: ikke alle bitene ble byttet (%)', length(d) - length(o);
  end if;
  execute d;

  d := pg_get_functiondef('public.konsern_cancel(bigint)'::regprocedure);
  o := d;
  d := replace(d, $a$  o record;
begin$a$, $a$  o record;
  repaid numeric;
begin$a$);
  d := replace(d, $a$  update public.konsern_orders set status = 'avbestilt' where id = o.id;$a$,
               $a$  -- Konsernet låses før kassa (B-433), og refusjonen går først til lånet (B-437)
  perform 1 from public.konsern where user_id = uid for update;
  update public.konsern_orders set status = 'avbestilt' where id = o.id;$a$);
  d := replace(d, $a$  return json_build_object('ok', true, 'refund', o.cost, 'konsern'$a$,
               $a$  repaid := public.bank_repay_from(uid, o.cost, 'avbestilt:' || o.id);
  return json_build_object('ok', true, 'refund', o.cost, 'repaid', repaid, 'konsern'$a$);
  if length(d) - length(o) < 250 then
    raise exception 'konsern_cancel: ikke alle bitene ble byttet (%)', length(d) - length(o);
  end if;
  execute d;

  d := pg_get_functiondef('public.konsern_sell(integer)'::regprocedure);
  o := d;
  d := replace(d, $a$  sale numeric;
begin$a$, $a$  sale numeric;
  repaid numeric;
begin$a$);
  d := replace(d, $a$  return json_build_object('ok', true, 'sale', sale, 'konsern'$a$,
               $a$  -- Salget går først til lånet (B-437)
  repaid := public.bank_repay_from(uid, sale, 'salg:' || p_plant);
  return json_build_object('ok', true, 'sale', sale, 'repaid', repaid, 'konsern'$a$);
  if length(d) - length(o) < 120 then
    raise exception 'konsern_sell: ikke alle bitene ble byttet (%)', length(d) - length(o);
  end if;
  execute d;
end $p$;

-- Rente og nedbetaling én gang per ekte dag (B-437): rente for dagene siden sist, og repay_share av utbyttet og bidraget
-- som har kommet inn siden sist. Én spiller per deltransaksjon (B-401)
create or replace function public.bank_service()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u record;
  cfg jsonb := public.bank_cfg();
  rate numeric := coalesce((cfg ->> 'rate_per_day')::numeric, 0.01);
  share numeric := coalesce((cfg ->> 'repay_share')::numeric, 0.5);
  today date := public.world_today();
  k record;
  days int;
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
    where loan > 0 and (loan_at is null or public.world_day(loan_at) < today)
  loop
    begin
      perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || u.user_id::text));
      select * into k from public.konsern where user_id = u.user_id for update;
      if k.loan > 0 and (k.loan_at is null or public.world_day(k.loan_at) < today) then
        days := case when k.loan_at is null then 1 else today - public.world_day(k.loan_at) end;
        interest := round(k.loan * rate * days);
        income := coalesce((select sum(l.amount) from public.treasury_ledger l
                            where l.user_id = u.user_id and l.kind in ('utbytte', 'bidrag') and l.amount > 0
                              and l.at > coalesce(k.loan_at, '-infinity'::timestamptz)), 0);
        select balance into bal from public.treasury where user_id = u.user_id for update;
        repay := greatest(0, least(k.loan + interest, round(share * income), coalesce(bal, 0)));
        update public.konsern
        set loan = k.loan + interest - repay,
            loan_at = case when k.loan + interest - repay > 0 then now() end,
            updated_at = now()
        where user_id = u.user_id;
        if interest > 0 then
          insert into public.konsern_loan_log (user_id, kind, amount, loan_after, ref)
          values (u.user_id, 'rente', interest, k.loan + interest, 'dager:' || days);
        end if;
        if repay > 0 then
          update public.treasury set balance = balance - repay, updated_at = now() where user_id = u.user_id;
          insert into public.treasury_ledger (user_id, amount, kind, ref)
          values (u.user_id, -repay, 'lån', 'nedbetalt dag:' || (today - 1));
          insert into public.konsern_loan_log (user_id, kind, amount, loan_after, ref)
          values (u.user_id, 'nedbetaling', repay, k.loan + interest - repay, 'dag:' || (today - 1));
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

create or replace function public.world_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
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
  -- Konsernbanken (B-437): etter utbyttet og bidraget, så dagens inntekt er med i nedbetalingen
  begin
    perform public.bank_service();
  exception when others then
    perform public.world_job_error('bank', sqlerrm);
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
