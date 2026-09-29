-- Stålverket: gjester holdes utenfor det som teller mellom spillere, igjen (B-365).
--
-- Gjestekontoene ble slått på 29.9 (B-212). Supabase minner om at gjester bruker rollen `authenticated`. Sperren
-- `guest_gate` (035) står og slipper dem bare til eget spill, tidslinja, overleveringen og det alle kan lese – alt som er
-- laget etterpå (chat, konsern, anbud, overtakelser) er stengt for dem. Men gjennomgangen fant:
--   - `meter_snapshot` (skrevet om i 043/061) hoppet ikke lenger over gjester, så produksjonen deres ville telt i
--     `production_days` og gitt eieren av skraplageret inntekt. B-212 sa at gjester ikke skal gjøre det.
--   - `pay_contributions` og `sample_contributions` (077/078) tok med gjester med konsern (0 kr, men rader). Nå hoppes de over.
-- Datterverk, utbytte og verdenskartet krever en rad i `konsern`, som bare `konsern_order` lager – og den er stengt for gjester.

create or replace function public.meter_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('stalverk.restore', true) = 'on' then
    return new;
  end if;
  -- Gjester gir ikke skraplageret inntekt og teller ikke i produksjonen (B-212, B-365)
  if public.user_is_guest(new.user_id) then
    return new;
  end if;
  perform public.meter_register(new.user_id, new.season_id, new.game_min, new.produced_t, new.maint_kr,
                                coalesce(new.at, now()));
  return new;
end;
$$;

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
    where p.flagged_at is null and not p.banned and not public.user_is_guest(s.user_id)
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
  insert into public.contribution_samples as c (user_id, day, n, sum_full, sum_t, sum_margin, sum_div, n_div, last_at)
  select s.user_id, today, 1, public.contribution_full(s.user_id), public.meter_normal_rate(s.user_id),
         public.contribution_margin(s.state), public.dividend_per_day(s.user_id), 1, now()
  from public.saves s join public.profiles p on p.id = s.user_id
  where p.flagged_at is null and not p.banned and not public.user_is_guest(s.user_id)
    and coalesce((s.state ->> 'stage')::int, 0) >= 4
    and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
  on conflict (user_id, day) do update
    set n = c.n + 1, sum_full = c.sum_full + excluded.sum_full, sum_t = c.sum_t + excluded.sum_t,
        sum_margin = c.sum_margin + excluded.sum_margin, sum_div = c.sum_div + excluded.sum_div,
        n_div = c.n_div + 1, last_at = now();
  delete from public.contribution_samples where day < today - 20;
end;
$$;
revoke execute on function public.sample_contributions() from public, anon, authenticated;
