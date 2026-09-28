-- B-253: fase 2 – slagghåndteringen, det andre strategiske selskapet. Bygget ferdig, men **slått av** (`active = false`)
-- til skraplageret har fått sin første eier og betalt ut inntekt i noen dager uten feil (RETNING.md avsnitt 8).
-- Kjørt som migrasjonen «slagghandtering».
--
-- Samme maskineri som skraplageret (030): anbud i 48 ekte timer, pilotkonsesjon i 14 ekte dager, inntekt til
-- konsernkassa dagen etter, eierens egne tonn og flaggede spillere teller ikke. Forskjellen er hva det tjener på:
-- - **Skraplageret:** tonn skrap de andre bruker (stål × 1,1) × 1 000 kr.
-- - **Slagghåndteringen:** tonn slagg de andre lager (stål × 0,12) × 5 000 kr – ca. 600 kr per tonn stål, litt over
--   halvparten av skraplageret. Stålet telles likt (B-188: høyst én normal spilldag per spiller per ekte dag), så lokal
--   fart gir ikke mer.
-- Et selskap med `active = false` får ikke anbud, betaler ikke inntekt og vises ikke i world_status().
-- Slås på med: update public.companies set active = true where type = 'slagg'; select public.world_tick();

insert into public.config (id, value)
values ('world', '{"slag_per_steel": 0.12, "slag_fee_per_t": 5000}')
on conflict (id) do update set value = excluded.value || public.config.value;

alter table public.companies add column if not exists active boolean not null default true;
alter table public.companies drop constraint if exists companies_type_check;
alter table public.companies add constraint companies_type_check check (type in ('skraplager', 'slagg'));

-- Tonn som teller for et selskap fra én spiller én ekte dag: skrap for skraplageret, slagg for slagghåndteringen
create or replace function public.company_counted_t(p_type text, p_user uuid, p_day date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case p_type
    when 'slagg' then public.scrap_counted_t(p_user, p_day)
                      / coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
                      * coalesce((w.value->>'slag_per_steel')::numeric, 0.12)
    else public.scrap_counted_t(p_user, p_day)
  end
  from public.config w where w.id = 'world';
$$;
revoke execute on function public.company_counted_t(text, uuid, date) from public, anon, authenticated;

-- Kroner per tonn som teller, per type
create or replace function public.company_fee(p_type text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case p_type
    when 'slagg' then coalesce((w.value->>'slag_fee_per_t')::numeric, 5000)
    else coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000)
  end
  from public.config w where w.id = 'world';
$$;
revoke execute on function public.company_fee(text) from public, anon, authenticated;

-- Anslått inntekt per ekte dag for et selskap: skraplagerets anslag regnet om til selskapets tonn og gebyr
create or replace function public.company_estimate(p_company int)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case c.type
    when 'slagg' then public.scrap_yard_estimate(c.owner_id)
                      / (coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
                         * coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000))
                      * coalesce((w.value->>'slag_per_steel')::numeric, 0.12)
                      * coalesce((w.value->>'slag_fee_per_t')::numeric, 5000)
    else public.scrap_yard_estimate(c.owner_id)
  end
  from public.companies c, public.config w
  where c.id = p_company and w.id = 'world';
$$;
revoke execute on function public.company_estimate(int) from public, anon, authenticated;

-- Anbudet: taket følger selskapets eget anslag (før: alltid skraplagerets)
create or replace function public.open_tender(p_company int, p_from timestamptz)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  w jsonb;
  est numeric;
  mn numeric;
  mx numeric;
  tid int;
begin
  select value into w from public.config where id = 'world';
  mn := coalesce((w->>'bid_min')::numeric, 1000000);
  est := public.company_estimate(p_company) * coalesce((w->>'concession_days')::numeric, 14);
  mx := greatest(mn * 10, round(est / 1000000) * 1000000);
  insert into public.tenders (company_id, opens_at, closes_at, min_bid, max_bid)
  values (p_company, p_from, p_from + make_interval(hours => coalesce((w->>'tender_hours')::int, 48)), mn, mx)
  returning id into tid;
  return tid;
end;
$$;
revoke execute on function public.open_tender(int, timestamptz) from public, anon, authenticated;

-- Inntekten: bare selskaper som er slått på; tonn og gebyr etter selskapets type (ellers lik 030)
create or replace function public.pay_company_income()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  d date;
  own uuid;
  fee numeric;
  tons numeric;
  nb int;
  first_owner date;
  paid date;
begin
  for c in select * from public.companies where active loop
    fee := public.company_fee(c.type);
    select min(from_at at time zone 'utc')::date into first_owner from public.company_owners where company_id = c.id;
    if first_owner is null then
      continue;
    end if;
    select max(day) into paid from public.company_income where company_id = c.id;
    d := greatest(first_owner, coalesce(paid + 1, first_owner));
    while d < (now() at time zone 'utc')::date loop
      select user_id into own from public.company_owners
      where company_id = c.id and from_at <= (d + time '12:00') at time zone 'utc'
        and until_at > (d + time '12:00') at time zone 'utc'
      order by from_at desc limit 1;
      if own is not null then
        select coalesce(sum(public.company_counted_t(c.type, pd.user_id, d)), 0), count(*) filter (where pd.gained_t > 0)
          into tons, nb
        from public.production_days pd join public.profiles p on p.id = pd.user_id
        where pd.day = d and pd.user_id <> own and p.flagged_at is null and not p.banned;
        insert into public.company_income (company_id, day, owner_id, counted_t, buyers, amount)
        values (c.id, d, own, tons, nb, round(tons * fee))
        on conflict do nothing;
        if found and tons > 0 then
          insert into public.treasury (user_id, balance, updated_at) values (own, round(tons * fee), now())
          on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
          insert into public.treasury_ledger (user_id, amount, kind, ref)
          values (own, round(tons * fee), 'inntekt', c.type || ':' || d);
        end if;
      else
        insert into public.company_income (company_id, day, owner_id, counted_t, buyers, amount)
        values (c.id, d, null, 0, 0, 0)
        on conflict do nothing;
      end if;
      d := d + 1;
    end loop;
  end loop;
end;
$$;
revoke execute on function public.pay_company_income() from public, anon, authenticated;

-- Nye anbud bare for selskaper som er slått på (ellers lik 030)
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
  perform public.pay_company_income();
  for c in select * from public.companies where active loop
    if not exists (select 1 from public.tenders where company_id = c.id and status = 'åpent')
       and (c.concession_until is null or c.concession_until - make_interval(hours => hours) <= now())
       and not exists (select 1 from public.company_owners where company_id = c.id and from_at > now()) then
      perform public.open_tender(c.id, now());
    end if;
  end loop;
end;
$$;
revoke execute on function public.world_tick() from public, anon, authenticated;

-- Det spilleren ser: bare selskaper som er slått på, med anslag etter type (ellers lik 033)
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
    'treasury', public.treasury_status()
  ) into out;
  return out;
end;
$$;
revoke execute on function public.world_status() from public, anon;
grant execute on function public.world_status() to authenticated;

-- Slagghåndteringen, slått av til den skal i bruk
insert into public.companies (type, name, active)
select 'slagg', 'Slagghåndteringen', false
where not exists (select 1 from public.companies where type = 'slagg');
