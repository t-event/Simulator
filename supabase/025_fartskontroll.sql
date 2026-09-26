-- B-176: fartskontroll. Juksesperren sjekket bare veksten per spilldøgn, ikke hvor fort spilldøgnene gikk. En
-- utvidelse i nettleseren som får tida i siden til å gå fortere, ga derfor flere spilldøgn per time uten å bli
-- flagget – og ukens «dager», sesongstigen og topplistene belønner spilldøgn.
--
-- Nå sender appen spillminuttene (game_min) og minuttene som er spolt fram om natta (boost_min) med tidslinja.
-- Raskeste ærlige fart er 10× (120 spillminutter per sekund) og 6× så fort når verket står om natta (720 per sekund).
-- Serveren regner ut hvor lang tid spillminuttene siden en lagring minst 10 minutter tilbake må ha tatt, og
-- sammenligner med serverens egen klokke. Går det mer enn 15 % og ett minutt for fort, flagges spilleren.
-- `at` settes alltid av serveren, så klokka i appen ikke betyr noe.
-- Eldre utgaver av appen sender ikke tallene; da hopper sjekken over.

alter table public.snapshots add column if not exists game_min bigint;
alter table public.snapshots add column if not exists boost_min bigint;

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
  win record;
  need numeric;
  took numeric;
begin
  -- Tida er serverens, ikke appens (B-176)
  new.at := now();

  if exists (
    select 1 from public.snapshots
    where user_id = new.user_id and day > new.day + 1 and (season_id is not distinct from new.season_id)
  ) then
    if new.day > 2 then
      update public.profiles set rewound_at = now() where id = new.user_id;
    end if;
    delete from public.snapshots
    where user_id = new.user_id and day > new.day and (season_id is not distinct from new.season_id);
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

  if maxeq is not null and new.equity > maxeq then
    reason := format('konsernverdi %s på nivå %s', new.equity, new.stage);
  end if;
  -- Etter sluttmålet (10 mrd.) kan kjøp av stålkomplekser og modernisering gi et stort hopp på ett døgn (B-150)
  pct := case when new.stage >= 4 and coalesce(prev.equity, 0) >= 10000000000 then 0.5 else 0.25 end;
  if prev.day is not null
     and (new.equity - prev.equity) > (cap + pct * greatest(prev.equity, 0)) * (greatest(new.day - prev.day, 1) + bonus) then
    reason := format('vekst %s på %s døgn (+%s døgn belønning), nivå %s', new.equity - prev.equity, new.day - prev.day, bonus, new.stage);
  end if;
  -- Tonn (B-158): tre likestrømsovner på 420 t med alt utstyr lager ca. 40 000 t i døgnet, og et «døgn» mellom to
  -- lagringer kan inneholde nesten to døgns produksjon. 100 000 per døgn stopper bare urimelige tall.
  -- B-162: eldre utgaver av appen kunne sende tonn fra noen døgn senere enn dagen. Derfor må også snittet fra en
  -- lagring minst tre døgn tilbake være for høyt før spilleren flagges
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
    order by s.at desc
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
