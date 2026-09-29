-- Stålverket: utbytte fra datterverkene i ekte tid (B-304, reform 2 del 2). Kjørt som migrasjonen «utbytte_i_ekte_tid».
--
-- Datterverkene betaler utbytte én gang per ekte (UTC-)dag rett til konsernkassa på serveren – ikke til kassa i spillet.
-- Regelen speiles i `frontend/src/game/dividend.ts`; de faste tallene i testen der kjøres mot `dividend_from_state`.
-- Lokal spillfart betyr ingenting: det er verkene i det lagrede spillet (sjekket av juksesperren) som teller, én gang
-- per ekte dag. Ingen planlagt jobb: `world_tick()` betaler «lat» når noen spør, som skraplageret (B-189).
--
-- Regelen for én spiller én dag:
--   drift per verk = grunntall(type) × (1 + 0,25 × trinn) × (1 + 0,05 × felles funksjoner) × 1,1^konsernprosjekter
--                    × (1 + 0,3 × (1 − 0,9^mesterskap))            (verk som bygges: 0)
--   utbytte       = Σ drift × 0,7 × 1/(1 + 0,1 × plass i rekka)     (rekka sortert etter drift, best først)
--                    × (1 + 0,2 × min(1, omdømme/100) × kvalitet)    (flaggskipet: andel stål som holdt kvaliteten, siste 7)
--   belastning    = over 100 mill.: 100 mill. × (utbytte / 100 mill.)^0,5
-- Tallene står i config.world.dividend, så de kan stilles inn uten ny kode (speilet i DIVIDEND i dividend.ts).

update public.config
set value = value || jsonb_build_object('dividend', jsonb_build_object(
  'base', jsonb_build_object('stalverk', 5000000, 'storverk', 20000000, 'kompleks', 60000000),
  'level_gain', 0.25, 'shared', 0.05, 'research', 0.1, 'mastery_max', 0.3, 'mastery_step', 0.9,
  'keep', 0.3, 'decay', 0.1, 'flagship', 0.2, 'load_from', 100000000, 'load_power', 0.5,
  'max_days', 14, 'from', '2026-09-29'))
where id = 'world' and not (value ? 'dividend');

-- Én rad per spiller og dag som er betalt (aldri to ganger)
create table if not exists public.dividends (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  amount numeric not null,
  paid_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.dividends enable row level security;
revoke all on public.dividends from anon, authenticated;

alter table public.treasury_ledger drop constraint if exists treasury_ledger_kind_check;
alter table public.treasury_ledger add constraint treasury_ledger_kind_check
  check (kind in ('innskudd', 'anbud', 'refusjon', 'inntekt', 'utbetaling', 'justering', 'utbytte'));

-- Utbyttet per dag fra et lagret spill (ren regel; kan kjøres på et hvilket som helst spill, også i tester)
create or replace function public.dividend_from_state(s jsonb)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with w as (
    select coalesce(value -> 'dividend', '{}'::jsonb) as d from public.config where id = 'world'
  ),
  k as (
    select
      coalesce((w.d -> 'base' ->> 'stalverk')::numeric, 5000000) as b_stalverk,
      coalesce((w.d -> 'base' ->> 'storverk')::numeric, 20000000) as b_storverk,
      coalesce((w.d -> 'base' ->> 'kompleks')::numeric, 60000000) as b_kompleks,
      coalesce((w.d ->> 'level_gain')::numeric, 0.25) as level_gain,
      coalesce((w.d ->> 'shared')::numeric, 0.05) as shared,
      coalesce((w.d ->> 'research')::numeric, 0.1) as research,
      coalesce((w.d ->> 'mastery_max')::numeric, 0.3) as mastery_max,
      coalesce((w.d ->> 'mastery_step')::numeric, 0.9) as mastery_step,
      coalesce((w.d ->> 'keep')::numeric, 0.3) as keep,
      coalesce((w.d ->> 'decay')::numeric, 0.1) as decay,
      coalesce((w.d ->> 'flagship')::numeric, 0.2) as flagship,
      coalesce((w.d ->> 'load_from')::numeric, 100000000) as load_from,
      coalesce((w.d ->> 'load_power')::numeric, 0.5) as load_power
    from w
  ),
  st as (
    select
      (select count(*) from jsonb_array_elements_text(coalesce(s -> 'konsern' -> 'shared', '[]'::jsonb)) x
        where x in ('innkjop', 'salg')) as shared_n,
      (select count(*) from jsonb_array_elements_text(coalesce(s -> 'researched', '[]'::jsonb)) x
        where x in ('konsernstyring', 'gronnkonsern')) as research_n,
      greatest(0, coalesce((s -> 'mastery' ->> 'datterverk')::numeric, 0)) as mastery,
      least(1, greatest(0, coalesce((s ->> 'reputation')::numeric, 0) / 100)) as rep,
      (select case when sum(coalesce((h ->> 'onGradeT')::numeric, 0) + coalesce((h ->> 'offGradeT')::numeric, 0)
                                + coalesce((h ->> 'secondT')::numeric, 0)) > 0
                   then sum(coalesce((h ->> 'onGradeT')::numeric, 0))
                        / sum(coalesce((h ->> 'onGradeT')::numeric, 0) + coalesce((h ->> 'offGradeT')::numeric, 0)
                              + coalesce((h ->> 'secondT')::numeric, 0))
                   else 0 end
       from (select h from jsonb_array_elements(coalesce(s -> 'history', '[]'::jsonb)) with ordinality as t(h, i)
             order by i desc limit 7) q) as quality
  ),
  plants as (
    select
      case p ->> 'type' when 'stalverk' then k.b_stalverk when 'storverk' then k.b_storverk when 'kompleks' then k.b_kompleks else 0 end
        * (1 + k.level_gain * coalesce((p ->> 'level')::numeric, 0))
        * (1 + k.shared * st.shared_n)
        * power(1 + k.research, st.research_n)
        * (1 + k.mastery_max * (1 - power(k.mastery_step, st.mastery))) as drift,
      i
    from jsonb_array_elements(coalesce(s -> 'konsern' -> 'plants', '[]'::jsonb)) with ordinality as t(p, i), k, st
    where coalesce(p -> 'project' ->> 'kind', '') <> 'bygg'
  ),
  ranked as (
    select drift, row_number() over (order by drift desc, i) as r from plants
  ),
  summed as (
    select coalesce(sum(drift * (1 - k.keep) / (1 + k.decay * (r - 1))), 0) * (1 + k.flagship * st.rep * least(1, greatest(0, st.quality))) as utb
    from ranked, k, st
    group by k.keep, k.decay, k.flagship, st.rep, st.quality
  )
  select coalesce((select case when utb > k.load_from and k.load_from > 0
                                 then k.load_from * power(utb / k.load_from, k.load_power)
                                 else utb end
                   from summed, k), 0);
$$;
revoke execute on function public.dividend_from_state(jsonb) from public, anon, authenticated;

-- Utbyttet per dag for en konto nå: konsernet må være åpnet på storverket, og kontoen ikke flagget
create or replace function public.dividend_per_day(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select public.dividend_from_state(s.state)
    from public.saves s join public.profiles p on p.id = s.user_id
    where s.user_id = p_user and p.flagged_at is null and not p.banned
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
      and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
  ), 0);
$$;
revoke execute on function public.dividend_per_day(uuid) from public, anon, authenticated;

-- Betal utbytte for hele dager som er over og ikke betalt: fra reformen, høyst `max_days` tilbake (den som er borte
-- lenge, får ikke alt), med verkene slik de står i det lagrede spillet nå
create or replace function public.pay_dividends()
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
  paid date;
  amt numeric;
  today date := (now() at time zone 'utc')::date;
begin
  select coalesce((value -> 'dividend' ->> 'from')::date, date '2026-09-29'),
         coalesce((value -> 'dividend' ->> 'max_days')::int, 14)
    into from_day, max_days
  from public.config where id = 'world';
  for u in
    select s.user_id
    from public.saves s join public.profiles p on p.id = s.user_id
    where p.flagged_at is null and not p.banned
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
      and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
      and jsonb_array_length(coalesce(s.state -> 'konsern' -> 'plants', '[]'::jsonb)) > 0
  loop
    select max(day) into paid from public.dividends where user_id = u.user_id;
    d := greatest(from_day, coalesce(paid + 1, from_day), today - max_days);
    if d >= today then
      continue;
    end if;
    amt := round(public.dividend_per_day(u.user_id));
    while d < today loop
      insert into public.dividends (user_id, day, amount) values (u.user_id, d, amt) on conflict do nothing;
      if found and amt > 0 then
        insert into public.treasury (user_id, balance, updated_at) values (u.user_id, amt, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
        insert into public.treasury_ledger (user_id, amount, kind, ref) values (u.user_id, amt, 'utbytte', 'utbytte:' || d);
      end if;
      d := d + 1;
    end loop;
  end loop;
end;
$$;
revoke execute on function public.pay_dividends() from public, anon, authenticated;

-- Verden: også utbyttet, hver gang noen spør
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

-- Det spilleren ser: som i 042/043, pluss utbyttet (anslag per dag nå, betalt for i går, og i alt)
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
      'total', (select coalesce(sum(amount), 0) from public.dividends where user_id = uid))
  ) into out;
  return out;
end;
$$;
