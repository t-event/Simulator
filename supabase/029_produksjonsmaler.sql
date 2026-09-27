-- B-188: produksjonsmåleren – grunnlaget for inntekt fra andres aktivitet i ekte tid (RETNING.md avsnitt 14).
-- Kjørt som migrasjonen «produksjonsmaler».
--
-- Hvert spill går i sin egen fart (pause–10×), men skraplagerets inntekt skal følge ekte tid. Måleren gjør to ting hver
-- gang tidslinja får et tall (`snapshots.produced_t`, sjekket av juksesperren og fartskontrollen):
-- 1. **Høyeste tonn (hwm):** bare tonn over det høyeste spilleren noen gang har hatt, teller som nye. Lagres et eldre spill
--    (en annen nettleser, en tilbakerulling, juks), og de samme dagene spilles om igjen, teller de ikke på nytt.
--    Nye tonn samles per ekte UTC-dag i `production_days` – tidspunktet er serverens, ikke appens.
-- 2. **Normal fart:** tonn per spilldøgn over de siste 8 tallene i tidslinja (ca. 7–9 hele spilldøgn). Det er verkets
--    størrelse, uavhengig av hvor fort spilldøgnene går. Regnes med spillminuttene (`game_min`, B-176), ikke hele
--    spilldager. Testene i `frontend/src/net/scrapTests.ts` fant to feil før migrasjonen ble kjørt: med hele spilldager
--    ble farten målt opptil 37 % for høy på 10×, og medianen av enkeltintervaller var 12 % ujevn med skiftdrift.
--    Går tidslinja bakover (en gammel lagring), starter målingen på nytt. Eldre apper uten `game_min` gir ingen fart.
-- Det som teller for skraplageret en ekte dag: min(nye tonn den dagen, normal fart × 1 spilldøgn) × 1,1 t skrap per tonn
-- stål. Hvor mange spilldøgn man rekker (1×, 3×, 10×, 5 minutter eller 8 timer) spiller ingen rolle når man har spilt
-- minst én normal spilldag. Samme regel er speilet i `frontend/src/net/scrapIncome.ts`, og testene der viser tallene.
-- Første gang en spiller måles, blir dagens tonn startpunktet – historien fra før teller ikke.

insert into public.config (id, value)
values ('world', '{"scrap_per_steel": 1.1, "scrap_cap_game_days": 1, "scrap_rate_window": 8, "scrap_fee_per_t": 1000}')
on conflict (id) do update set value = excluded.value || public.config.value;

create table if not exists public.production_meter (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  season_id int,
  hwm numeric not null default 0,
  pts_min bigint[] not null default '{}',
  pts_prod numeric[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.production_meter enable row level security;

create table if not exists public.production_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  gained_t numeric not null default 0,
  primary key (user_id, day)
);
alter table public.production_days enable row level security;
-- Ingen regler på tabellene: bare serverfunksjoner leser og skriver

-- Registrer et tall fra tidslinja. Tidspunktet kommer fra serveren (`snapshots.at` settes av check_snapshot).
create or replace function public.meter_register(p_user uuid, p_season int, p_game_min bigint, p_produced numeric,
                                                 p_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  win int;
  gained numeric;
  n int;
  mins bigint[];
  prods numeric[];
begin
  if p_produced is null then
    return;
  end if;
  select coalesce((value->>'scrap_rate_window')::int, 8) into win from public.config where id = 'world';
  select * into m from public.production_meter where user_id = p_user for update;
  -- Første gang, eller nytt spill i en ny sesong: dagens tonn er startpunktet
  if m.user_id is null or m.season_id is distinct from p_season then
    insert into public.production_meter (user_id, season_id, hwm, pts_min, pts_prod, updated_at)
    values (p_user, p_season, p_produced,
            case when p_game_min is null then '{}' else array[p_game_min] end,
            case when p_game_min is null then '{}' else array[p_produced] end, p_at)
    on conflict (user_id) do update
      set season_id = excluded.season_id, hwm = excluded.hwm, pts_min = excluded.pts_min,
          pts_prod = excluded.pts_prod, updated_at = excluded.updated_at;
    return;
  end if;
  gained := greatest(0, p_produced - m.hwm);
  if gained > 0 then
    insert into public.production_days (user_id, day, gained_t)
    values (p_user, (p_at at time zone 'utc')::date, gained)
    on conflict (user_id, day) do update set gained_t = public.production_days.gained_t + excluded.gained_t;
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
  set hwm = greatest(m.hwm, p_produced), pts_min = mins, pts_prod = prods, updated_at = p_at
  where user_id = p_user;
end;
$$;
revoke execute on function public.meter_register(uuid, int, bigint, numeric, timestamptz) from public, anon, authenticated;

create or replace function public.meter_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.meter_register(new.user_id, new.season_id, new.game_min, new.produced_t, coalesce(new.at, now()));
  return new;
end;
$$;
revoke execute on function public.meter_snapshot() from public, anon, authenticated;

drop trigger if exists snapshots_meter on public.snapshots;
create trigger snapshots_meter
  after insert or update of produced_t, game_min on public.snapshots
  for each row execute function public.meter_snapshot();

-- Normal fart: tonn stål per spilldøgn over punktene (første til siste)
create or replace function public.meter_normal_rate(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(case when cardinality(m.pts_min) >= 2 and m.pts_min[cardinality(m.pts_min)] > m.pts_min[1] then
    (m.pts_prod[cardinality(m.pts_prod)] - m.pts_prod[1])
      / ((m.pts_min[cardinality(m.pts_min)] - m.pts_min[1]) / 1440.0) end, 0)
  from public.production_meter m where m.user_id = p_user;
$$;
revoke execute on function public.meter_normal_rate(uuid) from public, anon, authenticated;

-- Tonn skrap som teller for skraplageret fra én spiller én ekte dag
create or replace function public.scrap_counted_t(p_user uuid, p_day date)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(least(
           coalesce((select gained_t from public.production_days where user_id = p_user and day = p_day), 0),
           public.meter_normal_rate(p_user) * coalesce((w.value->>'scrap_cap_game_days')::numeric, 1)
         ) * coalesce((w.value->>'scrap_per_steel')::numeric, 1.1), 0)
  from public.config w where w.id = 'world';
$$;
revoke execute on function public.scrap_counted_t(uuid, date) from public, anon, authenticated;

-- Startpunkt for dem som finnes: siste tall i tidslinja (historien teller ikke)
insert into public.production_meter (user_id, season_id, hwm, pts_min, pts_prod)
select distinct on (user_id) user_id, season_id, produced_t,
  case when game_min is null then '{}'::bigint[] else array[game_min] end,
  case when game_min is null then '{}'::numeric[] else array[produced_t] end
from public.snapshots where produced_t is not null
order by user_id, at desc
on conflict (user_id) do nothing;
