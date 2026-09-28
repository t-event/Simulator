-- B-256: fase 2 – det mekaniske verkstedet, det tredje strategiske selskapet. Bygget ferdig, men **slått av**
-- (`active = false`), som slagghåndteringen (042). Kjørt som migrasjonen «mekanisk_verksted».
--
-- Verkstedet tjener på vedlikeholdet og reparasjonene hos de andre spillerne. Det finnes ikke i tidslinja fra før, så
-- appen rapporterer det nå: `snapshots.maint_kr` er kroner brukt på vedlikehold og havarier i alt (`g.totals.maintKr`).
--
-- Tellingen bygger på produksjonsmåleren (029), så ekte tid og juksesperren gjelder likt:
-- 1. Høyeste vedlikehold (`maint_hwm`): bare kroner over det høyeste spilleren har hatt, teller som nye. Nye kroner
--    samles per ekte UTC-dag i `production_days.gained_maint`, ved siden av de nye tonnene samme dag.
-- 2. Det som teller en ekte dag: stålet som teller den dagen (skraplagerets tonn / 1,1 – høyst én normal spilldag)
--    × vedlikehold per tonn samme dag, høyst `maint_cap_per_t` (1 000 kr/t; et storverk bruker ca. 100–130 kr/t).
--    Lokal fart gir derfor ikke mer, og ett stort havari etter en tilbakerulling kan ikke gi mer enn taket.
-- 3. Eieren får `workshop_share` (halvparten) av kronene som teller, til konsernkassa.
-- Første gang vedlikeholdet måles, blir dagens tall startpunktet – historien fra før teller ikke.
-- Slås på med: update public.companies set active = true where type = 'verksted'; select public.world_tick();

insert into public.config (id, value)
values ('world', '{"maint_cap_per_t": 1000, "maint_typical_per_t": 120, "workshop_share": 0.5}')
on conflict (id) do update set value = excluded.value || public.config.value;

alter table public.snapshots add column if not exists maint_kr bigint;
alter table public.production_meter add column if not exists maint_hwm numeric;
alter table public.production_days add column if not exists gained_maint numeric not null default 0;

-- Måleren med vedlikehold (ellers lik 029)
create or replace function public.meter_register(p_user uuid, p_season int, p_game_min bigint, p_produced numeric,
                                                 p_maint numeric, p_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  win int;
  gained numeric;
  gained_m numeric;
  n int;
  mins bigint[];
  prods numeric[];
begin
  if p_produced is null then
    return;
  end if;
  select coalesce((value->>'scrap_rate_window')::int, 8) into win from public.config where id = 'world';
  select * into m from public.production_meter where user_id = p_user for update;
  -- Første gang, eller nytt spill i en ny sesong: dagens tall er startpunktet
  if m.user_id is null or m.season_id is distinct from p_season then
    insert into public.production_meter (user_id, season_id, hwm, maint_hwm, pts_min, pts_prod, updated_at)
    values (p_user, p_season, p_produced, p_maint,
            case when p_game_min is null then '{}' else array[p_game_min] end,
            case when p_game_min is null then '{}' else array[p_produced] end, p_at)
    on conflict (user_id) do update
      set season_id = excluded.season_id, hwm = excluded.hwm, maint_hwm = excluded.maint_hwm,
          pts_min = excluded.pts_min, pts_prod = excluded.pts_prod, updated_at = excluded.updated_at;
    return;
  end if;
  gained := greatest(0, p_produced - m.hwm);
  -- Vedlikeholdet: startpunkt første gang appen sender det (eldre apper sender ikke)
  gained_m := case when p_maint is null or m.maint_hwm is null then 0 else greatest(0, p_maint - m.maint_hwm) end;
  if gained > 0 or gained_m > 0 then
    insert into public.production_days (user_id, day, gained_t, gained_maint)
    values (p_user, (p_at at time zone 'utc')::date, gained, gained_m)
    on conflict (user_id, day) do update
      set gained_t = public.production_days.gained_t + excluded.gained_t,
          gained_maint = public.production_days.gained_maint + excluded.gained_maint;
  end if;
  -- Punktene til farten: framover i tid legges til (de siste `win`); bakover starter målingen på nytt
  mins := m.pts_min;
  prods := m.pts_prod;
  n := cardinality(mins);
  if p_game_min is not null then
    if n = 0 or (p_game_min > mins[n] and p_produced >= prods[n]) then
      mins := mins || p_game_min;
      prods := prods || p_produced;
      if cardinality(mins) > win then
        mins := mins[cardinality(mins) - win + 1:];
        prods := prods[cardinality(prods) - win + 1:];
      end if;
    elsif p_game_min < mins[n] or p_produced < prods[n] then
      mins := array[p_game_min];
      prods := array[p_produced];
    end if;
  end if;
  update public.production_meter
  set hwm = greatest(m.hwm, p_produced),
      maint_hwm = case when p_maint is null then m.maint_hwm else greatest(coalesce(m.maint_hwm, p_maint), p_maint) end,
      pts_min = mins, pts_prod = prods, updated_at = p_at
  where user_id = p_user;
end;
$$;
revoke execute on function public.meter_register(uuid, int, bigint, numeric, numeric, timestamptz)
  from public, anon, authenticated;

create or replace function public.meter_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.meter_register(new.user_id, new.season_id, new.game_min, new.produced_t, new.maint_kr,
                                coalesce(new.at, now()));
  return new;
end;
$$;
revoke execute on function public.meter_snapshot() from public, anon, authenticated;

drop trigger if exists snapshots_meter on public.snapshots;
create trigger snapshots_meter
  after insert or update of produced_t, game_min, maint_kr on public.snapshots
  for each row execute function public.meter_snapshot();

drop function if exists public.meter_register(uuid, int, bigint, numeric, timestamptz);

-- Kroner vedlikehold som teller for verkstedet fra én spiller én ekte dag
create or replace function public.maint_counted_kr(p_user uuid, p_day date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
           public.scrap_counted_t(p_user, p_day) / coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
           * least(coalesce((w.value->>'maint_cap_per_t')::numeric, 1000),
                   coalesce(d.gained_maint / nullif(d.gained_t, 0), 0)), 0)
  from public.config w
  left join public.production_days d on d.user_id = p_user and d.day = p_day
  where w.id = 'world';
$$;
revoke execute on function public.maint_counted_kr(uuid, date) from public, anon, authenticated;

alter table public.companies drop constraint if exists companies_type_check;
alter table public.companies add constraint companies_type_check check (type in ('skraplager', 'slagg', 'verksted'));

-- Det som teller: tonn skrap, tonn slagg eller kroner vedlikehold (ellers lik 042)
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
    when 'verksted' then public.maint_counted_kr(p_user, p_day)
    else public.scrap_counted_t(p_user, p_day)
  end
  from public.config w where w.id = 'world';
$$;
revoke execute on function public.company_counted_t(text, uuid, date) from public, anon, authenticated;

-- Kroner per enhet som teller: per tonn for skrap og slagg, andel av kronene for verkstedet
create or replace function public.company_fee(p_type text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case p_type
    when 'slagg' then coalesce((w.value->>'slag_fee_per_t')::numeric, 5000)
    when 'verksted' then coalesce((w.value->>'workshop_share')::numeric, 0.5)
    else coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000)
  end
  from public.config w where w.id = 'world';
$$;
revoke execute on function public.company_fee(text) from public, anon, authenticated;

-- Vedlikehold per tonn hos de andre de siste 7 ekte dagene (taket per spiller og dag, så ett havari ikke drar snittet),
-- eller et typisk tall uten data
create or replace function public.maint_rate_estimate(p_owner uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(least(d.gained_maint, d.gained_t * coalesce((w.value->>'maint_cap_per_t')::numeric, 1000)))
                  / nullif(sum(d.gained_t), 0),
                  (w.value->>'maint_typical_per_t')::numeric, 120)
  from public.config w
  left join public.production_days d
    on d.day >= (now() at time zone 'utc')::date - 7 and d.user_id is distinct from p_owner
    and exists (select 1 from public.production_meter pm where pm.user_id = d.user_id and pm.maint_hwm is not null)
    and exists (select 1 from public.profiles p where p.id = d.user_id and p.flagged_at is null and not p.banned)
  where w.id = 'world'
  group by w.value;
$$;
revoke execute on function public.maint_rate_estimate(uuid) from public, anon, authenticated;

-- Anslått inntekt per ekte dag (ellers lik 042)
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
    when 'verksted' then public.scrap_yard_estimate(c.owner_id)
                      / (coalesce((w.value->>'scrap_per_steel')::numeric, 1.1)
                         * coalesce((w.value->>'scrap_fee_per_t')::numeric, 1000))
                      * public.maint_rate_estimate(c.owner_id)
                      * coalesce((w.value->>'workshop_share')::numeric, 0.5)
    else public.scrap_yard_estimate(c.owner_id)
  end
  from public.companies c, public.config w
  where c.id = p_company and w.id = 'world';
$$;
revoke execute on function public.company_estimate(int) from public, anon, authenticated;

-- Det mekaniske verkstedet, slått av til det skal i bruk
insert into public.companies (type, name, active)
select 'verksted', 'Mekanisk verksted', false
where not exists (select 1 from public.companies where type = 'verksted');
