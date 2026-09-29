-- Stålverket: hovedverkets konsernbidrag i ekte tid (B-318, steg 1 av KONSERNBIDRAG.md).
--
-- Hovedverket betaler et bidrag til konsernkassa én gang per ekte (UTC-)dag, regnet av serveren av det verket faktisk
-- lager og tjener – ikke av spillfarten. Eierens valg (29.9): automatisk, gulv 30 % på dager uten spill, fast 50 %,
-- kvadratrot over 30 mill. per dag. Ingen penger trekkes fra kassa i spillet; kassa er driftskapital (taket på 10 mrd.
-- betaler alt over ut til eierne, B-306).
--
-- Regelen for én spiller én dag:
--   normal dag  = tonn per normal spilldag (meter_normal_rate, samme måler som skraplageret, B-188)
--   margin      = driftsresultat per tonn over de siste 30 spilldøgn i lagringen: (kontrakt + spot − skrap − energi
--                 − forbruk − lønn − vedlikehold − bøter − faste − nett) / tonn, mellom 0 og 3 000 kr/t.
--                 Investering, konsern, renter og «annet» (belønninger, salg av verk) er ikke med.
--   full dag    = 50 % × normal dag × margin
--   aktivitet   = andelen av en normal spilldag som ble spilt den dagen (production_days), men aldri under
--                 0,9 × gårsdagens aktivitet, og aldri under 0,3. Å spille litt er aldri verre enn å ikke spille.
--   bidrag      = full dag × aktivitet, dempet over 30 mill.: 30 mill. × (x / 30 mill.)^0,5
-- Tallene står i config.world.contribution. Betales «lat» fra world_tick, som utbyttet (051), høyst 14 dager tilbake,
-- fra og med 30.9 (første betaling gjelder den dagen). Konsernet må være åpnet, kontoen ikke flagget.

update public.config
set value = value || jsonb_build_object('contribution', jsonb_build_object(
  'share', 0.5, 'margin_cap', 3000, 'window', 30, 'floor', 0.3, 'decay', 0.9,
  'load_from', 30000000, 'load_power', 0.5, 'max_days', 14, 'from', '2026-09-30'))
where id = 'world' and not (value ? 'contribution');

create table if not exists public.contributions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  amount numeric not null,
  activity numeric not null,
  counted_t numeric not null default 0,
  full_day numeric not null default 0,
  paid_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.contributions enable row level security;
revoke all on public.contributions from anon, authenticated;

alter table public.treasury_ledger drop constraint if exists treasury_ledger_kind_check;
alter table public.treasury_ledger add constraint treasury_ledger_kind_check
  check (kind in ('innskudd', 'anbud', 'refusjon', 'inntekt', 'utbetaling', 'justering', 'utbytte', 'bidrag'));

-- Driftsresultat per tonn over de siste spilldøgnene i et lagret spill (ren regel), mellom 0 og taket
create or replace function public.contribution_margin(s jsonb)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select coalesce((value -> 'contribution' ->> 'window')::int, 30) as win,
           coalesce((value -> 'contribution' ->> 'margin_cap')::numeric, 3000) as cap
    from public.config where id = 'world'
  ),
  h as (
    select x.h from c, lateral (
      select h from jsonb_array_elements(coalesce(s -> 'history', '[]'::jsonb)) with ordinality as t(h, i)
      order by i desc limit c.win) x
  ),
  sums as (
    select
      sum(coalesce((h -> 'income' ->> 'kontrakt')::numeric, 0) + coalesce((h -> 'income' ->> 'spot')::numeric, 0)
          - coalesce((h -> 'costs' ->> 'skrap')::numeric, 0) - coalesce((h -> 'costs' ->> 'energi')::numeric, 0)
          - coalesce((h -> 'costs' ->> 'forbruk')::numeric, 0) - coalesce((h -> 'costs' ->> 'lonn')::numeric, 0)
          - coalesce((h -> 'costs' ->> 'vedlikehold')::numeric, 0) - coalesce((h -> 'costs' ->> 'bot')::numeric, 0)
          - coalesce((h -> 'costs' ->> 'faste')::numeric, 0) - coalesce((h -> 'costs' ->> 'nett')::numeric, 0)) as drift,
      sum(coalesce((h ->> 'producedT')::numeric, 0)) as t
    from h
  )
  select coalesce((select case when t > 0 then least(c.cap, greatest(0, drift / t)) else 0 end from sums, c), 0);
$$;
revoke execute on function public.contribution_margin(jsonb) from public, anon, authenticated;

-- En full normal dag for en konto nå (uten aktivitet og demping); 0 uten åpnet konsern eller når kontoen er flagget
create or replace function public.contribution_full(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select coalesce((w.value -> 'contribution' ->> 'share')::numeric, 0.5)
           * public.meter_normal_rate(s.user_id) * public.contribution_margin(s.state)
    from public.saves s join public.profiles p on p.id = s.user_id, public.config w
    where s.user_id = p_user and w.id = 'world' and p.flagged_at is null and not p.banned
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
      and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
  ), 0);
$$;
revoke execute on function public.contribution_full(uuid) from public, anon, authenticated;

-- Bidraget av en full dag og en aktivitet, dempet over grensen (ren regel)
create or replace function public.contribution_amount(p_full numeric, p_activity numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case when x > lf and lf > 0 then lf * power(x / lf, lp) else x end
  from (select greatest(0, coalesce(p_full, 0) * coalesce(p_activity, 0)) as x,
               coalesce((value -> 'contribution' ->> 'load_from')::numeric, 30000000) as lf,
               coalesce((value -> 'contribution' ->> 'load_power')::numeric, 0.5) as lp
        from public.config where id = 'world') q;
$$;
revoke execute on function public.contribution_amount(numeric, numeric) from public, anon, authenticated;

-- Betal bidraget for hele dager som er over og ikke betalt
create or replace function public.pay_contributions()
returns void
language plpgsql
security definer
set search_path = public
as $$
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
  today date := (now() at time zone 'utc')::date;
begin
  select coalesce((value -> 'contribution' ->> 'from')::date, date '2026-09-30'),
         coalesce((value -> 'contribution' ->> 'max_days')::int, 14),
         coalesce((value -> 'contribution' ->> 'floor')::numeric, 0.3),
         coalesce((value -> 'contribution' ->> 'decay')::numeric, 0.9)
    into from_day, max_days, fl, decay_f
  from public.config where id = 'world';
  for u in
    select s.user_id
    from public.saves s join public.profiles p on p.id = s.user_id
    where p.flagged_at is null and not p.banned
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
      and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
  loop
    select day, activity into last_day, prev from public.contributions where user_id = u.user_id order by day desc limit 1;
    d := greatest(from_day, coalesce(last_day + 1, from_day), today - max_days);
    if d >= today then
      continue;
    end if;
    full_day := public.contribution_full(u.user_id);
    rate := public.meter_normal_rate(u.user_id);
    while d < today loop
      gained := coalesce((select gained_t from public.production_days where user_id = u.user_id and day = d), 0);
      act := case when rate > 0 then least(1, gained / rate) else 0 end;
      act := greatest(act, fl, coalesce(prev * decay_f, fl));
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
  end loop;
end;
$$;
revoke execute on function public.pay_contributions() from public, anon, authenticated;

-- Verden: også bidraget, hver gang noen spør
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
revoke execute on function public.world_tick() from public, anon, authenticated;

-- Det spilleren ser: som i 051, pluss bidraget (en full dag nå, marginen, en normal dag, betalt i går og i alt)
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
    'treasury', public.treasury_status(),
    'dividend', json_build_object(
      'per_day', round(public.dividend_per_day(uid)),
      'yesterday', (select amount from public.dividends where user_id = uid and day = (now() at time zone 'utc')::date - 1),
      'total', (select coalesce(sum(amount), 0) from public.dividends where user_id = uid)),
    'contribution', json_build_object(
      'per_day', round(public.contribution_amount(public.contribution_full(uid), 1)),
      'margin', round(public.contribution_margin(s.state)),
      'normal_t', round(public.meter_normal_rate(uid)),
      'activity', (select activity from public.contributions where user_id = uid order by day desc limit 1),
      'yesterday', (select amount from public.contributions where user_id = uid and day = (now() at time zone 'utc')::date - 1),
      'total', (select coalesce(sum(amount), 0) from public.contributions where user_id = uid))
  ) into out
  from (select (select state from public.saves where user_id = uid) as state) s;
  return out;
end;
$$;
revoke execute on function public.world_status() from public, anon;
grant execute on function public.world_status() to authenticated;
