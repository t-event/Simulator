-- B-189: fase 1B – skraplageret, skjult anbud i 48 timer og pilotkonsesjon i 14 dager. Kjørt som migrasjonene
-- «skraplageret» (tabeller og funksjoner), «skraplageret_rettelse» (to feil funnet av testen før noe anbud fantes:
-- en postvariabel kalt `c` kolliderte med tabellaliaset `c` i resolve_tenders, og place_bid brukte insert … on conflict
-- med negativ saldo, som stoppes av sjekken på saldoen), «skraplageret_anslag» (anslaget bruker tidslinja når
-- måleren ikke har nok punkter) og «skraplageret_start» (selskapet og det
-- første anbudet, kjørt samtidig med at appen fikk kortet).
--
-- Det første strategiske selskapet. Alt avgjøres på serveren, i ekte tid:
-- - **Anbud:** 48 ekte timer. Bud legges fra konsernkassa (B-183) og holdes av (trekkes fra saldoen) til anbudet er
--   avgjort. Budene er skjulte – ingen ser andres bud, heller ikke hvor mange som har budt – til anbudet stenger.
--   Høyeste bud vinner; ved likt bud avgjøres det ved trekning (regelen står i spillet). De som ikke vinner, får budet
--   tilbake. Taket på budet følger selskapets anslåtte verdi (inntekten i en konsesjon), ikke spillerens rikdom.
-- - **Pilotkonsesjon:** vinneren driver skraplageret i 14 ekte dager (B-186). Et nytt anbud åpner 48 timer før
--   konsesjonen går ut, så det alltid er en eier. Ikke fast eierskap før overtakelser finnes.
-- - **Inntekt:** hver ekte (UTC-)dag får eieren gebyr × tonn skrap som teller fra alle andre spillere (B-188:
--   høyst én normal spilldag per spiller per ekte dag, så lokal fart ikke gir mer). Betales inn i konsernkassa dagen
--   etter, én gang (merket i `company_income` og `treasury_ledger`). Eierens egne tonn og flaggede spillere teller ikke.
-- Ingen planlagt jobb: `world_status()` avgjør anbud og betaler inntekt «lat» når noen spør (som season_status()).

insert into public.config (id, value)
values ('world', '{"tender_hours": 48, "concession_days": 14, "bid_min": 1000000}')
on conflict (id) do update set value = excluded.value || public.config.value;

create table if not exists public.companies (
  id serial primary key,
  type text not null check (type in ('skraplager')),
  name text not null,
  owner_id uuid references public.profiles (id) on delete set null,
  concession_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.company_owners (
  company_id int not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  from_at timestamptz not null,
  until_at timestamptz not null,
  tender_id int,
  primary key (company_id, from_at)
);

create table if not exists public.tenders (
  id serial primary key,
  company_id int not null references public.companies (id) on delete cascade,
  opens_at timestamptz not null default now(),
  closes_at timestamptz not null,
  min_bid numeric not null,
  max_bid numeric not null,
  status text not null default 'åpent' check (status in ('åpent', 'avgjort', 'ingen bud')),
  winner_id uuid references public.profiles (id) on delete set null,
  winning_bid numeric,
  bidders int,
  tie boolean not null default false,
  resolved_at timestamptz
);
create index if not exists tenders_company on public.tenders (company_id, closes_at desc);

create table if not exists public.tender_bids (
  tender_id int not null references public.tenders (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric not null check (amount > 0),
  placed_at timestamptz not null default now(),
  primary key (tender_id, user_id)
);
create index if not exists tender_bids_user on public.tender_bids (user_id);

create table if not exists public.company_income (
  company_id int not null references public.companies (id) on delete cascade,
  day date not null,
  owner_id uuid references public.profiles (id) on delete set null,
  counted_t numeric not null,
  buyers int not null,
  amount numeric not null,
  paid_at timestamptz not null default now(),
  primary key (company_id, day)
);

alter table public.companies enable row level security;
alter table public.company_owners enable row level security;
alter table public.tenders enable row level security;
alter table public.tender_bids enable row level security;
alter table public.company_income enable row level security;
-- Ingen regler: alt går gjennom world_status() og place_bid(), så skjulte bud aldri kan leses

create index if not exists company_owners_user on public.company_owners (user_id);
create index if not exists company_income_owner on public.company_income (owner_id);
create index if not exists companies_owner on public.companies (owner_id);
create index if not exists tenders_winner on public.tenders (winner_id);

-- Fart fra tidslinja (de siste 8 tallene med spillminutter) – til anslaget når måleren ikke har nok punkter ennå
create or replace function public.snapshot_rate(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with s as (select game_min, produced_t from public.snapshots
             where user_id = p_user and game_min is not null and produced_t is not null order by at desc limit 8)
  select case when max(game_min) > min(game_min)
         then (max(produced_t) - min(produced_t)) / ((max(game_min) - min(game_min)) / 1440.0) end
  from s;
$$;
revoke execute on function public.snapshot_rate(uuid) from public, anon, authenticated;

-- Anslått inntekt per ekte dag nå: gebyr × normal skrapbruk hos aktive spillere (uten eieren)
create or replace function public.scrap_yard_estimate(p_owner uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(coalesce(nullif(public.meter_normal_rate(a.user_id), 0), public.snapshot_rate(a.user_id), 0)), 0)
         * coalesce((w.value->>'scrap_cap_game_days')::numeric, 1)
         * coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
         * coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000)
  from public.config w
  left join public.active_players() a on a.user_id is distinct from p_owner
  left join public.profiles p on p.id = a.user_id
  where w.id = 'world' and (p.id is null or (p.flagged_at is null and not p.banned))
  group by w.value;
$$;
revoke execute on function public.scrap_yard_estimate(uuid) from public, anon, authenticated;

-- Åpne et anbud: taket er anslått inntekt i én konsesjon (rundet til hele millioner), minst 10 × minstebudet
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
  est := public.scrap_yard_estimate((select owner_id from public.companies where id = p_company))
         * coalesce((w->>'concession_days')::numeric, 14);
  mx := greatest(mn * 10, round(est / 1000000) * 1000000);
  insert into public.tenders (company_id, opens_at, closes_at, min_bid, max_bid)
  values (p_company, p_from, p_from + make_interval(hours => coalesce((w->>'tender_hours')::int, 48)), mn, mx)
  returning id into tid;
  return tid;
end;
$$;
revoke execute on function public.open_tender(int, timestamptz) from public, anon, authenticated;

-- Avgjør anbud som er stengt: høyeste bud, trekning ved likt bud; de andre får budet tilbake
create or replace function public.resolve_tenders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
  win record;
  co record;
  n int;
  top_count int;
  start_at timestamptz;
  days int;
begin
  select coalesce((value->>'concession_days')::int, 14) into days from public.config where id = 'world';
  for t in select * from public.tenders where status = 'åpent' and closes_at <= now() order by closes_at for update loop
    select count(*) into n from public.tender_bids where tender_id = t.id;
    select * into co from public.companies where id = t.company_id for update;
    if n = 0 then
      update public.tenders set status = 'ingen bud', bidders = 0, resolved_at = now() where id = t.id;
      continue;
    end if;
    select count(*) into top_count from public.tender_bids
    where tender_id = t.id and amount = (select max(amount) from public.tender_bids where tender_id = t.id);
    select * into win from public.tender_bids where tender_id = t.id order by amount desc, random() limit 1;
    -- Budene som ikke vant, går tilbake til konsernkassa
    update public.treasury tr set balance = tr.balance + b.amount, updated_at = now()
    from public.tender_bids b where b.tender_id = t.id and b.user_id <> win.user_id and tr.user_id = b.user_id;
    insert into public.treasury_ledger (user_id, amount, kind, ref)
    select b.user_id, b.amount, 'refusjon', 'anbud:' || t.id from public.tender_bids b
    where b.tender_id = t.id and b.user_id <> win.user_id;
    -- Ny konsesjon fra der den gamle slutter (anbudet åpner 48 timer før), ellers fra nå
    start_at := greatest(t.closes_at, coalesce(co.concession_until, t.closes_at));
    insert into public.company_owners (company_id, user_id, from_at, until_at, tender_id)
    values (t.company_id, win.user_id, start_at, start_at + make_interval(days => days), t.id);
    update public.tenders
    set status = 'avgjort', winner_id = win.user_id, winning_bid = win.amount, bidders = n, tie = top_count > 1,
        resolved_at = now()
    where id = t.id;
  end loop;
  -- Eieren nå, etter konsesjonene
  update public.companies c
  set owner_id = o.user_id, concession_until = o.until_at
  from (select distinct on (company_id) company_id, user_id, until_at from public.company_owners
        where from_at <= now() order by company_id, from_at desc) o
  where o.company_id = c.id and (c.owner_id is distinct from o.user_id or c.concession_until is distinct from o.until_at);
  update public.companies c set owner_id = null
  where c.concession_until is not null and c.concession_until <= now()
    and not exists (select 1 from public.company_owners o where o.company_id = c.id and o.from_at <= now()
                    and o.until_at > now());
end;
$$;
revoke execute on function public.resolve_tenders() from public, anon, authenticated;

-- Betal inntekten for hele dager som er over og ikke betalt (eieren kl. 12 UTC den dagen)
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
  select coalesce((value->>'scrap_fee_per_t')::numeric, 1000) into fee from public.config where id = 'world';
  for c in select * from public.companies loop
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
        select coalesce(sum(public.scrap_counted_t(pd.user_id, d)), 0), count(*) filter (where pd.gained_t > 0)
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
        -- Ingen eier den dagen: merkes som behandlet, uten inntekt
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

-- Hold verden i gang: avgjør anbud, betal inntekt, og åpne nytt anbud når det trengs
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
  for c in select * from public.companies loop
    if not exists (select 1 from public.tenders where company_id = c.id and status = 'åpent')
       and (c.concession_until is null or c.concession_until - make_interval(hours => hours) <= now())
       and not exists (select 1 from public.company_owners where company_id = c.id and from_at > now()) then
      perform public.open_tender(c.id, now());
    end if;
  end loop;
end;
$$;
revoke execute on function public.world_tick() from public, anon, authenticated;

-- Det spilleren ser: selskapene, anbudet (bare eget bud), siste resultat, konsernkassa og anslått inntekt
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
        'estimate_per_day', round(public.scrap_yard_estimate(c.owner_id)),
        'tender', (select json_build_object('id', t.id, 'opens_at', t.opens_at, 'closes_at', t.closes_at,
                     'min_bid', t.min_bid, 'max_bid', t.max_bid,
                     'my_bid', (select amount from public.tender_bids b where b.tender_id = t.id and b.user_id = uid))
                   from public.tenders t where t.company_id = c.id and t.status = 'åpent'
                   order by t.closes_at limit 1),
        'last_result', (select json_build_object('id', t.id, 'closed_at', t.closes_at, 'status', t.status,
                          'winner', (select nickname from public.profiles where id = t.winner_id),
                          'won', t.winner_id = uid, 'winning_bid', t.winning_bid, 'bidders', t.bidders,
                          'tie', t.tie,
                          'my_bid', (select amount from public.tender_bids b where b.tender_id = t.id and b.user_id = uid))
                        from public.tenders t where t.company_id = c.id and t.status <> 'åpent'
                        order by t.closes_at desc limit 1)
      ) order by c.id) from public.companies c), '[]'::json),
    'treasury', public.treasury_status()
  ) into out;
  return out;
end;
$$;
revoke execute on function public.world_status() from public, anon;
grant execute on function public.world_status() to authenticated;

-- Legg inn, endre eller trekk (0) et bud. Pengene holdes av i konsernkassa til anbudet er avgjort.
create or replace function public.place_bid(p_tender int, p_amount numeric)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  t record;
  old numeric;
  amt numeric := floor(coalesce(p_amount, 0));
  diff numeric;
  bal numeric;
  s record;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  select state into s from public.saves where user_id = uid;
  if s.state is null or coalesce((s.state->>'stage')::int, 0) < 4
     or coalesce((s.state->'konsern'->>'unlocked')::boolean, false) = false then
    return json_build_object('ok', false, 'reason', 'konsern');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || uid::text));
  select * into t from public.tenders where id = p_tender for update;
  if t.id is null or t.status <> 'åpent' or t.closes_at <= now() then
    return json_build_object('ok', false, 'reason', 'stengt');
  end if;
  if amt <> 0 and (amt < t.min_bid or amt > t.max_bid) then
    return json_build_object('ok', false, 'reason', 'utenfor', 'min', t.min_bid, 'max', t.max_bid);
  end if;
  select amount into old from public.tender_bids where tender_id = t.id and user_id = uid;
  diff := amt - coalesce(old, 0);
  select balance into bal from public.treasury where user_id = uid for update;
  if diff > coalesce(bal, 0) then
    return json_build_object('ok', false, 'reason', 'kasse', 'balance', coalesce(bal, 0));
  end if;
  if diff <> 0 then
    -- Kassa finnes: ved høyere bud er saldoen minst forskjellen, ved lavere bud ble den brukt til budet
    update public.treasury set balance = balance - diff, updated_at = now() where user_id = uid;
    insert into public.treasury_ledger (user_id, amount, kind, ref)
    values (uid, -diff, case when diff > 0 then 'anbud' else 'refusjon' end, 'anbud:' || t.id);
  end if;
  if amt = 0 then
    delete from public.tender_bids where tender_id = t.id and user_id = uid;
  else
    insert into public.tender_bids (tender_id, user_id, amount, placed_at) values (t.id, uid, amt, now())
    on conflict (tender_id, user_id) do update set amount = excluded.amount, placed_at = now();
  end if;
  select balance into bal from public.treasury where user_id = uid;
  return json_build_object('ok', true, 'bid', amt, 'balance', coalesce(bal, 0));
end;
$$;
revoke execute on function public.place_bid(int, numeric) from public, anon;
grant execute on function public.place_bid(int, numeric) to authenticated;

-- Skraplageret, og det første anbudet (48 timer fra nå)
insert into public.companies (type, name)
select 'skraplager', 'Skraplageret'
where not exists (select 1 from public.companies where type = 'skraplager');
select public.world_tick();
