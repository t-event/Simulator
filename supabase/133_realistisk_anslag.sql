-- B-464: realistisk inntektsanslag for selskapene og minstebud i anbudene (eieren 5.10: «Ta din anbefaling og fortsett»).
--
-- Funnet 5.10: `company_estimate` regnet som om alle aktive spillere når taket for det som telles hver ekte dag
-- (`meter_normal_rate × scrap_cap_game_days`). Betalingen (`pay_company_income`) teller bare det de faktisk lager den
-- dagen (`company_counted_t` fra `production_days`), og det er ca. halvparten: skraplageret ble anslått til 25,6 mill.
-- per dag, men betalte 10,6–16,7 mill. Anslaget styrer høyeste anbud (14 dager), selskapsverdien V (10 dager) – og
-- dermed minstebudet ved oppkjøp, budstyrken og Kontrollen – og «Lønner det seg?».
--
-- * Anslaget er nå det betalingen ville gitt: snittet over de siste 7 ekte dagene (som har tall) av det som telles per
--   spiller, minus eieren (kjøperens eget anslag: minus kjøperen), ganget med gebyret. Uten investeringsøkningen, som før.
-- * Tallene per spiller regnes én gang per ekte dag (`company_estimate_refresh`, pg_cron `selskapsanslag`) og ligger i
--   `company_estimate_parts`, så `world_status` ikke regner dem mange ganger per kall. Med færre enn 3 dager med tall
--   brukes det gamle anslaget (`company_estimate_cap`).
-- * Minstebud i anbudene: 5 dagers anslått inntekt (`config.world.tender_floor_days`), rundet ned til hele millioner,
--   aldri under `bid_min` og aldri over halvparten av høyeste bud. Høyeste bud er 14 dagers inntekt som før.
-- * Lagt inn 6.10, etter at oppkjøp 12 var avgjort (5.10 kl. 22:21), så et bud som var lagt inn, ble avgjort med verdien det
--   ble lagt inn med.

create table if not exists public.company_estimate_parts (
  company_id integer not null references public.companies(id),
  user_id uuid not null references public.profiles(id) on delete cascade,
  counted_avg numeric not null default 0,
  primary key (company_id, user_id)
);
create table if not exists public.company_estimate_meta (
  company_id integer primary key references public.companies(id),
  computed_day date not null,
  days integer not null,
  updated_at timestamptz not null default now()
);
alter table public.company_estimate_parts enable row level security;
alter table public.company_estimate_meta enable row level security;
revoke all on public.company_estimate_parts from anon, authenticated;
revoke all on public.company_estimate_meta from anon, authenticated;

update public.config set value = value || jsonb_build_object('tender_floor_days', 5, 'estimate_min_days', 3)
 where id = 'world';

-- Det gamle anslaget (taket for hver spiller hver dag), brukt til det finnes nok tall
create or replace function public.company_estimate_cap(p_company integer, p_exclude uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case c.type
    when 'slagg' then public.scrap_yard_estimate(p_exclude)
                      / (coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
                         * coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000))
                      * coalesce((w.value->>'slag_per_steel')::numeric, 0.12)
                      * coalesce((w.value->>'slag_fee_per_t')::numeric, 5000)
    when 'verksted' then public.scrap_yard_estimate(p_exclude)
                      / (coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
                         * coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000))
                      * public.maint_rate_estimate(p_exclude)
                      * coalesce((w.value->>'workshop_share')::numeric, 0.5)
    else public.scrap_yard_estimate(p_exclude)
  end
  from public.companies c, public.config w
  where c.id = p_company and w.id = 'world';
$$;
revoke all on function public.company_estimate_cap(integer, uuid) from public, anon, authenticated;

-- Tallene per spiller for de siste 7 ekte dagene, én gang per dag (eller med p_force)
create or replace function public.company_estimate_refresh(p_force boolean default false)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  today date := public.world_today();
  nd integer;
  n integer := 0;
begin
  for c in select id, type from public.companies where active loop
    if not p_force and exists (select 1 from public.company_estimate_meta m
                                where m.company_id = c.id and m.computed_day = today) then
      continue;
    end if;
    select count(distinct pd.day) into nd from public.production_days pd where pd.day between today - 7 and today - 1;
    update public.company_estimate_parts set counted_avg = 0 where company_id = c.id;
    insert into public.company_estimate_parts (company_id, user_id, counted_avg)
    select c.id, pd.user_id, sum(public.company_counted_t(c.type, pd.user_id, pd.day)) / greatest(nd, 1)
    from public.production_days pd
    join public.profiles p on p.id = pd.user_id and p.flagged_at is null and not p.banned
    where pd.day between today - 7 and today - 1
    group by pd.user_id
    on conflict (company_id, user_id) do update set counted_avg = excluded.counted_avg;
    insert into public.company_estimate_meta (company_id, computed_day, days) values (c.id, today, nd)
    on conflict (company_id) do update set computed_day = excluded.computed_day, days = excluded.days, updated_at = now();
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.company_estimate_refresh(boolean) from public, anon, authenticated;

-- Anslått inntekt per dag uten en gitt spiller (eieren eller kjøperen): det betalingen ville gitt
create or replace function public.company_estimate_without(p_company integer, p_exclude uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case when coalesce(m.days, 0) >= coalesce((w.value->>'estimate_min_days')::int, 3)
    then coalesce((select sum(e.counted_avg) from public.company_estimate_parts e
                    where e.company_id = c.id and e.user_id is distinct from p_exclude), 0)
         * public.company_fee(c.type)
    else public.company_estimate_cap(c.id, p_exclude)
  end
  from public.companies c
  cross join public.config w
  left join public.company_estimate_meta m on m.company_id = c.id
  where c.id = p_company and w.id = 'world';
$$;
revoke all on function public.company_estimate_without(integer, uuid) from public, anon, authenticated;

create or replace function public.company_estimate(p_company integer)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select public.company_estimate_without(c.id, c.owner_id) from public.companies c where c.id = p_company;
$$;

-- Kjøperens eget anslag (til «Lønner det seg?»): uten kjøperens egen produksjon, med eierens
create or replace function public.company_estimate_for(p_company integer, p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select public.company_estimate_without(p_company, p_user);
$$;
revoke all on function public.company_estimate_for(integer, uuid) from public, anon, authenticated;

-- Anbud: høyeste bud 14 dagers anslått inntekt som før, minstebud 5 dager (aldri over halvparten av høyeste)
create or replace function public.open_tender(p_company integer, p_from timestamp with time zone)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  w jsonb;
  per_day numeric;
  base numeric;
  mn numeric;
  mx numeric;
  tid int;
begin
  select value into w from public.config where id = 'world';
  base := coalesce((w->>'bid_min')::numeric, 1000000);
  per_day := coalesce(public.company_estimate(p_company), 0);
  mx := greatest(base * 10, round(per_day * coalesce((w->>'concession_days')::numeric, 14) / 1000000) * 1000000);
  mn := greatest(base, least(floor(per_day * coalesce((w->>'tender_floor_days')::numeric, 5) / 1000000) * 1000000,
                             floor(mx / 2 / 1000000) * 1000000));
  insert into public.tenders (company_id, opens_at, closes_at, min_bid, max_bid)
  values (p_company, p_from, p_from + make_interval(hours => coalesce((w->>'tender_hours')::int, 48)), mn, mx)
  returning id into tid;
  return tid;
end;
$function$;

select public.company_estimate_refresh(true);

select cron.schedule('selskapsanslag', '7,37 * * * *', $$select public.company_estimate_refresh()$$);
