-- Stålverket: konsernbidraget er snittet over den ekte dagen, ikke et øyeblikksbilde (B-361).
--
-- Før regnet serveren bidraget av de siste 30 spilldøgnene i det lagrede spillet (margin) og målerens tonn per
-- spilldøgn (normal dag) – i det øyeblikket det ble betalt. På 10× er 30 spilldøgn ca. 6 ekte minutter, så tallet hoppet
-- fra 7 til 24 mill. kr per dag på 20 minutter (fellesferie, stans, store kjøp), og betalingen ble et tilfeldig
-- øyeblikksbilde. Nå tar serveren en måling av hver spiller med konsern hvert 15. minutt (fra world_tick), og:
--   - betalingen for en dag bruker snittet av dagens målinger (dager uten målinger: forrige dag med målinger)
--   - tallet appen viser, og konsernverdien, bruker snittet av dagens målinger – de første to timene sammen med gårsdagens
-- Regelen for selve bidraget (andel, tak, aktivitet, demping) er som i 061.

update public.config
set value = jsonb_set(value, '{contribution,sample_minutes}', '15'::jsonb)
where id = 'world' and not (value -> 'contribution' ? 'sample_minutes');

create table if not exists public.contribution_samples (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  n int not null default 0,
  sum_full numeric not null default 0,
  sum_t numeric not null default 0,
  sum_margin numeric not null default 0,
  last_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.contribution_samples enable row level security;
revoke all on public.contribution_samples from anon, authenticated;

alter table public.world_tick_state add column if not exists samples_at timestamptz not null default 'epoch';

-- Én måling av alle med konsern, høyst hvert `sample_minutes`. Spillere som ikke spiller, måles også (spillet står
-- slik det ble lagret), så snittet gjelder hele dagen.
create or replace function public.sample_contributions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  mins int;
  today date := (now() at time zone 'utc')::date;
begin
  select coalesce((value -> 'contribution' ->> 'sample_minutes')::int, 15) into mins from public.config where id = 'world';
  update public.world_tick_state set samples_at = now()
  where id = 1 and samples_at <= now() - make_interval(mins => mins);
  if not found then
    return;
  end if;
  insert into public.contribution_samples as c (user_id, day, n, sum_full, sum_t, sum_margin, last_at)
  select s.user_id, today, 1, public.contribution_full(s.user_id), public.meter_normal_rate(s.user_id),
         public.contribution_margin(s.state), now()
  from public.saves s join public.profiles p on p.id = s.user_id
  where p.flagged_at is null and not p.banned
    and coalesce((s.state ->> 'stage')::int, 0) >= 4
    and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
  on conflict (user_id, day) do update
    set n = c.n + 1, sum_full = c.sum_full + excluded.sum_full, sum_t = c.sum_t + excluded.sum_t,
        sum_margin = c.sum_margin + excluded.sum_margin, last_at = now();
  delete from public.contribution_samples where day < today - 20;
end;
$$;
revoke execute on function public.sample_contributions() from public, anon, authenticated;

-- Snittet for en dag: dagens målinger, ellers siste dag før med målinger, ellers et øyeblikksbilde nå
create or replace function public.contribution_avg(p_user uuid, p_day date,
  out full_day numeric, out normal_t numeric, out margin numeric, out samples int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.contribution_samples c
  where c.user_id = p_user and c.day <= p_day and c.n > 0 order by c.day desc limit 1;
  if found then
    full_day := r.sum_full / r.n;
    normal_t := r.sum_t / r.n;
    margin := r.sum_margin / r.n;
    samples := r.n;
  else
    full_day := public.contribution_full(p_user);
    normal_t := public.meter_normal_rate(p_user);
    margin := public.contribution_margin((select state from public.saves where user_id = p_user));
    samples := 0;
  end if;
end;
$$;
revoke execute on function public.contribution_avg(uuid, date) from public, anon, authenticated;

-- Det appen viser og konsernverdien bruker: dagens snitt, de første to timene (8 målinger) sammen med gårsdagens
create or replace function public.contribution_now(p_user uuid,
  out full_day numeric, out normal_t numeric, out margin numeric, out samples int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'utc')::date;
  n_today int;
  r record;
begin
  select coalesce(max(c.n), 0) into n_today from public.contribution_samples c where c.user_id = p_user and c.day = today;
  select sum(c.sum_full) sf, sum(c.sum_t) st, sum(c.sum_margin) sm, sum(c.n)::int sn into r
  from public.contribution_samples c
  where c.user_id = p_user and (c.day = today or (c.day = today - 1 and n_today < 8));
  if coalesce(r.sn, 0) > 0 then
    full_day := r.sf / r.sn;
    normal_t := r.st / r.sn;
    margin := r.sm / r.sn;
    samples := r.sn;
  else
    select a.full_day, a.normal_t, a.margin, a.samples into full_day, normal_t, margin, samples
    from public.contribution_avg(p_user, today) a;
  end if;
end;
$$;
revoke execute on function public.contribution_now(uuid) from public, anon, authenticated;

-- Betalingen: som i 061, men hver dag med sitt eget snitt
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
  f numeric;
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
  end loop;
end;
$$;
revoke execute on function public.pay_contributions() from public, anon, authenticated;

-- Konsernverdien (topplista, 063): bidraget som dagens snitt
create or replace function public.konsern_value(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select balance from public.treasury where user_id = p_user), 0)
       + 60 * (public.dividend_per_day(p_user)
               + public.contribution_amount((select full_day from public.contribution_now(p_user)), 1))
       - coalesce((select greatest(0, coalesce((state ->> 'loan')::numeric, 0)) from public.saves where user_id = p_user), 0);
$$;

-- Verden: målingene tas her, som betalingene (072 som mal)
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
  perform public.resolve_tenders();
  perform public.resolve_takeovers();
  perform public.pay_company_income();
  perform public.pay_dividends();
  perform public.pay_contributions();
  perform public.sample_contributions();
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

-- Det spilleren ser: bidraget som dagens snitt (per_day, margin, normal_t), og hvor mange målinger det bygger på
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
        'region', c.region,
        'control', public.company_control(c.id),
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
    'contribution', (select json_build_object(
      'per_day', round(public.contribution_amount(cn.full_day, 1)),
      'margin', round(cn.margin),
      'normal_t', round(cn.normal_t),
      'samples', cn.samples,
      'activity', (select activity from public.contributions where user_id = uid order by day desc limit 1),
      'yesterday', (select amount from public.contributions where user_id = uid and day = (now() at time zone 'utc')::date - 1),
      'total', (select coalesce(sum(amount), 0) from public.contributions where user_id = uid))
      from public.contribution_now(uid) cn),
    'konsern', case when exists (select 1 from public.konsern where user_id = uid)
                    or coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
               then public.konsern_status(uid) end
  ) into out
  from (select (select state from public.saves where user_id = uid) as state) s;
  return out;
end;
$$;
revoke execute on function public.world_status() from public, anon;
grant execute on function public.world_status() to authenticated;
