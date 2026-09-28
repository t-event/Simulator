-- B-261: tidslinja ved tilbakespoling. Kjørt som migrasjonen «tidslinje_tilbakespoling».
--
-- Før: lastes et spill med lavere dag opp, sletter check_snapshot alle tall etter dagen (så en tilbakespoling ikke gir
-- falske tall). 28.9. tok en gammel kopi (dag 471) over i 15 sekunder før dag 2 169 kom tilbake, og 1 700 tall
-- forsvant. Fartskontrollen sammenlignet så med tallet fra kopien og flagget spilleren feil.
-- Nå:
-- - Tallene etter dagen flyttes til `snapshots_rewound` i stedet for å slettes. Alt som leser tidslinja, ser det samme
--   som før.
-- - Kommer det samme spillet tilbake – høyere dag, minst like langt spilt som tallene som ble flyttet, og ingenting
--   spilt i mellomtiden – legges tallene tilbake med sitt eget tidspunkt, uten ny sjekk og uten produksjonsmåleren.
-- - Spilles det videre fra den lavere dagen, forkastes tallene når spillet er forbi dem.
-- - Fartskontrollen sammenligner med det som var spilt lengst for minst 10 minutter siden, ikke det nyeste tallet.

create table if not exists public.snapshots_rewound (
  user_id uuid not null references auth.users (id) on delete cascade,
  day integer not null,
  cash bigint,
  equity bigint,
  stage smallint,
  client_version text,
  at timestamptz,
  reputation numeric,
  season_id integer,
  season_key integer not null,
  produced_t bigint,
  game_min bigint,
  boost_min bigint,
  pre_reform boolean not null default false,
  maint_kr bigint,
  rewind_day integer not null,
  rewound_at timestamptz not null default now(),
  primary key (user_id, season_key, day)
);
alter table public.snapshots_rewound enable row level security;
-- Ingen regler: bare serverfunksjoner leser og skriver

-- Merket for tall fra før reformen skal følge med når tallene legges tilbake (ellers lik 031)
create or replace function public.guard_pre_reform()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('stalverk.restore', true) = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.pre_reform := false;
  else
    new.pre_reform := old.pre_reform;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_pre_reform() from public, anon, authenticated;

-- Produksjonsmåleren skal ikke se tallene som legges tilbake (de er eldre, og ville startet målingen på nytt)
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
  perform public.meter_register(new.user_id, new.season_id, new.game_min, new.produced_t, new.maint_kr,
                                coalesce(new.at, now()));
  return new;
end;
$$;
revoke execute on function public.meter_snapshot() from public, anon, authenticated;

-- Juksesperren med tilbakespoling til side og fartskontrollen etter lengst spilt (ellers lik 044)
create or replace function public.check_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prev record;
  cap numeric;
  maxeq numeric;
  reason text;
  bonus numeric;
  pct numeric;
  back record;
  eqback record;
  pctback numeric;
  win record;
  need numeric;
  took numeric;
  fu jsonb;
  min_day numeric;
  limit_eq numeric;
  rw record;
  live_max int;
begin
  -- Tidslinja legges tilbake etter en tilbakespoling (B-261): tallene er sjekket før og beholder tidspunktet sitt
  if current_setting('stalverk.restore', true) = 'on' then
    return new;
  end if;

  -- En gjest som oppretter konto, tar med seg tidslinja (B-212): adopt_guest flytter tallene uten ny sjekk
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    return new;
  end if;

  -- Tida er serverens, ikke appens (B-176)
  new.at := now();

  if exists (
    select 1 from public.snapshots
    where user_id = new.user_id and day > new.day + 1 and (season_id is not distinct from new.season_id)
  ) then
    if new.day > 2 then
      update public.profiles set rewound_at = now() where id = new.user_id;
    end if;
    -- B-261: tallene etter dagen flyttes til side i stedet for å slettes, så de kan legges tilbake hvis det samme
    -- spillet kommer tilbake (en gammel kopi tok over i 15 sekunder, og 1 700 tall forsvant)
    with moved as (
      delete from public.snapshots
      where user_id = new.user_id and day > new.day and (season_id is not distinct from new.season_id)
      returning *
    )
    insert into public.snapshots_rewound (user_id, day, cash, equity, stage, client_version, at, reputation, season_id,
                                          season_key, produced_t, game_min, boost_min, pre_reform, maint_kr, rewind_day)
    select user_id, day, cash, equity, stage, client_version, at, reputation, season_id, season_key, produced_t,
           game_min, boost_min, pre_reform, maint_kr, new.day
    from moved
    on conflict (user_id, season_key, day) do update
      set cash = excluded.cash, equity = excluded.equity, stage = excluded.stage, client_version = excluded.client_version,
          at = excluded.at, reputation = excluded.reputation, produced_t = excluded.produced_t,
          game_min = excluded.game_min, boost_min = excluded.boost_min, pre_reform = excluded.pre_reform,
          maint_kr = excluded.maint_kr;
    update public.snapshots_rewound set rewind_day = new.day, rewound_at = now()
    where user_id = new.user_id and season_key = coalesce(new.season_id, 0);
  else
    -- B-261: kommer det samme spillet tilbake (lenger enn tallene som ble flyttet, og ingenting spilt i mellomtiden),
    -- legges tallene tilbake. Er spilleren spilt forbi dem på en annen gren, trengs de ikke
    select max(day) as max_day, max(game_min) as max_min, max(rewind_day) as rewind_day into rw
    from public.snapshots_rewound
    where user_id = new.user_id and season_key = coalesce(new.season_id, 0);
    if rw.max_day is not null then
      select max(day) into live_max from public.snapshots
      where user_id = new.user_id and (season_id is not distinct from new.season_id) and day <> new.day;
      if new.day > rw.rewind_day and coalesce(live_max, -1) <= rw.rewind_day and new.game_min is not null
         and new.game_min >= coalesce(rw.max_min, 0) then
        perform set_config('stalverk.restore', 'on', true);
        insert into public.snapshots (user_id, day, cash, equity, stage, client_version, at, reputation, season_id,
                                      produced_t, game_min, boost_min, pre_reform, maint_kr)
        select user_id, day, cash, equity, stage, client_version, at, reputation, season_id, produced_t, game_min,
               boost_min, pre_reform, maint_kr
        from public.snapshots_rewound
        where user_id = new.user_id and season_key = coalesce(new.season_id, 0) and day < new.day
        on conflict (user_id, season_key, day) do nothing;
        perform set_config('stalverk.restore', 'off', true);
        delete from public.snapshots_rewound where user_id = new.user_id and season_key = coalesce(new.season_id, 0);
      elsif new.day > rw.max_day then
        delete from public.snapshots_rewound where user_id = new.user_id and season_key = coalesce(new.season_id, 0);
      end if;
    end if;
  end if;

  select day, equity, produced_t into prev
  from public.snapshots
  where user_id = new.user_id and day < new.day
    and (season_id is not distinct from new.season_id)
  order by day desc
  limit 1;

  select coalesce(d.bonus_days, 0) into bonus from public.daily d where d.user_id = new.user_id;
  bonus := coalesce(bonus, 0);

  cap := case new.stage
    when 0 then 100000
    when 1 then 600000
    when 2 then 2500000
    when 3 then 20000000
    else 1500000000
  end;
  maxeq := case new.stage
    when 0 then 1000000
    when 1 then 6000000
    when 2 then 50000000
    when 3 then 250000000
    else null
  end;

  -- Taket per nivå gjelder bare det første tallet i sesongen (B-212). Etterpå passer vekstsperren på: en spiller kan
  -- bli lenge på samme nivå og spare opp (enzo ble flagget med 51,5 mill. på stålverket etter 300 ærlige døgn)
  if maxeq is not null and prev.day is null and new.equity > maxeq then
    reason := format('konsernverdi %s på nivå %s', new.equity, new.stage);
  end if;
  -- Første opplasting (B-257): et spill som kobles til en konto sent, har ingen tidslinje å sjekke veksten mot. Det
  -- første tallet spilleren noen gang laster opp (i alle sesonger), sammenlignes med testspilleren på like mange døgn
  if not exists (select 1 from public.snapshots where user_id = new.user_id) then
    select value into fu from public.config where id = 'first_upload';
    if fu is not null then
      min_day := (fu->'stage_day'->>(new.stage::int))::numeric * coalesce((fu->>'day_margin')::numeric, 0.5);
      if new.stage > 0 and new.day < min_day then
        reason := format('første opplasting: nivå %s på dag %s (tidligst ca. dag %s)', new.stage, new.day, ceil(min_day));
      end if;
      limit_eq := public.first_upload_limit(new.day);
      if new.equity > limit_eq then
        reason := format('første opplasting: konsernverdi %s på dag %s (grense %s)', new.equity, new.day, round(limit_eq));
      end if;
    end if;
  end if;
  -- Etter sluttmålet (10 mrd.) kan kjøp av stålkomplekser og modernisering gi et stort hopp på ett døgn (B-150)
  pct := case when new.stage >= 4 and coalesce(prev.equity, 0) >= 10000000000 then 0.5 else 0.25 end;
  if prev.day is not null
     and (new.equity - prev.equity) > (cap + pct * greatest(prev.equity, 0)) * (greatest(new.day - prev.day, 1) + bonus) then
    -- B-194: et kjøp gir et hopp på ett døgn. Flagg bare hvis også veksten fra minst tre døgn tilbake er for høy
    select day, equity into eqback
    from public.snapshots
    where user_id = new.user_id and day <= new.day - 3 and not pre_reform
      and (season_id is not distinct from new.season_id)
    order by day desc
    limit 1;
    pctback := case when new.stage >= 4 and coalesce(eqback.equity, 0) >= 10000000000 then 0.5 else 0.25 end;
    if eqback.day is null
       or (new.equity - eqback.equity) > (cap + pctback * greatest(eqback.equity, 0)) * ((new.day - eqback.day) + bonus) then
      reason := format('vekst %s på %s døgn (+%s døgn belønning), nivå %s', new.equity - prev.equity, new.day - prev.day, bonus, new.stage);
    end if;
  end if;
  -- Tonn (B-158, B-162): 100 000 t per døgn, og også snittet fra minst tre døgn tilbake må være for høyt
  if prev.day is not null and prev.produced_t is not null and new.produced_t is not null
     and (new.produced_t - prev.produced_t) > 100000 * greatest(new.day - prev.day, 1) then
    select day, produced_t into back
    from public.snapshots
    where user_id = new.user_id and day <= new.day - 3 and produced_t is not null
      and (season_id is not distinct from new.season_id)
    order by day desc
    limit 1;
    if back.day is null or (new.produced_t - back.produced_t) > 100000 * (new.day - back.day) then
      reason := format('%s tonn på %s døgn', new.produced_t - prev.produced_t, new.day - prev.day);
    end if;
  end if;

  -- Fart (B-176): spillminuttene siden en lagring minst 10 minutter tilbake må ha tatt minst så lang tid
  if new.game_min is not null and new.boost_min is not null then
    select s.day, s.at, s.game_min, s.boost_min into win
    from public.snapshots s
    where s.user_id = new.user_id and (s.season_id is not distinct from new.season_id)
      and s.day < new.day and s.game_min is not null and s.boost_min is not null
      and s.at <= now() - interval '10 minutes'
    -- B-261: det som var spilt lengst for minst 10 minutter siden – ikke det nyeste tallet, som kan være fra en
    -- tilbakespoling (dag 471 lagret 16:14 ga «for fort: 1705 døgn på 10 min»)
    order by s.game_min desc
    limit 1;
    if win.day is not null and new.game_min > win.game_min then
      need := greatest(0, (new.game_min - win.game_min) - greatest(0, new.boost_min - win.boost_min)) / 120.0
        + greatest(0, new.boost_min - win.boost_min) / 720.0;
      took := extract(epoch from now() - win.at);
      if took < need * 0.85 - 60 then
        reason := format('for fort: %s døgn på %s min (minst %s min med 10×)', new.day - win.day,
          round(took / 60), round(need / 60));
      end if;
    end if;
  end if;

  if reason is not null then
    update public.profiles
    set flagged_at = now(), flag_reason = reason
    where id = new.user_id and flagged_at is null;
  end if;

  if bonus > 0 then
    update public.daily set bonus_days = 0 where user_id = new.user_id;
  end if;

  update public.profiles set league = public.league_of(new.stage, new.equity) where id = new.user_id;
  return new;
end;
$$;
