-- Stålverket: utbyttet betales som snittet over den ekte dagen, som bidraget (B-362, utfyller B-361).
--
-- Utbyttet regnes av det lagrede spillet (verkene fra serveren, forskning, mesterskap, omdømme og kvaliteten de siste
-- 7 spilldøgnene – på 10× ca. 1,5 ekte minutt). Flaggskipbonusen (inntil +20 %) fulgte derfor det siste som skjedde, og
-- betalingen var et øyeblikksbilde. Nå tas utbyttet med i målingene hvert kvarter (077), og betalingen for en dag bruker
-- dagens snitt. Tallet appen viser, er fortsatt utbyttet nå – det følger nye verk med én gang.

alter table public.contribution_samples add column if not exists sum_div numeric not null default 0;
alter table public.contribution_samples add column if not exists n_div int not null default 0;

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
  where p.flagged_at is null and not p.banned
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

-- Utbyttet for en dag: snittet av dagens målinger, ellers utbyttet nå
create or replace function public.dividend_avg(p_user uuid, p_day date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select c.sum_div / c.n_div from public.contribution_samples c
     where c.user_id = p_user and c.day = p_day and c.n_div > 0),
    public.dividend_per_day(p_user));
$$;
revoke execute on function public.dividend_avg(uuid, date) from public, anon, authenticated;

-- Betalingen: som før (067), men hver dag med sitt eget snitt
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
  base numeric;
  amt numeric;
  kasse numeric;
  today date := (now() at time zone 'utc')::date;
begin
  select coalesce((value -> 'dividend' ->> 'from')::date, date '2026-09-29'),
         coalesce((value -> 'dividend' ->> 'max_days')::int, 14)
    into from_day, max_days
  from public.config where id = 'world';
  for u in
    select s.user_id
    from public.saves s join public.profiles p on p.id = s.user_id
    join public.konsern k on k.user_id = s.user_id
    where p.flagged_at is null and not p.banned
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
      and coalesce((s.state -> 'konsern' ->> 'unlocked')::boolean, false)
      and jsonb_array_length(k.plants) > 0
  loop
    select max(day) into paid from public.dividends where user_id = u.user_id;
    d := greatest(from_day, coalesce(paid + 1, from_day), today - max_days);
    if d >= today then
      continue;
    end if;
    perform public.konsern_settle(u.user_id, now());
    while d < today loop
      base := public.dividend_avg(u.user_id, d);
      amt := round(base * public.activity_factor(u.user_id, d));
      kasse := round(public.dividend_to_treasury(base, public.policy_keep(u.user_id)) * public.activity_factor(u.user_id, d));
      insert into public.dividends (user_id, day, amount, to_fund)
      values (u.user_id, d, kasse, greatest(0, amt - kasse)) on conflict do nothing;
      if found and amt > 0 then
        insert into public.treasury (user_id, balance, updated_at) values (u.user_id, kasse, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
        insert into public.treasury_ledger (user_id, amount, kind, ref) values (u.user_id, kasse, 'utbytte', 'utbytte:' || d);
        update public.konsern set fund = fund + greatest(0, amt - kasse), updated_at = now() where user_id = u.user_id;
      end if;
      d := d + 1;
    end loop;
  end loop;
end;
$$;
revoke execute on function public.pay_dividends() from public, anon, authenticated;
