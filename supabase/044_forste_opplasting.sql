-- B-257: første opplasting. Juksesperren (check_snapshot) sjekker veksten mellom to tall på tidslinja. Et spill som
-- kobles til en konto sent (f.eks. på dag 610), har ingen tall før, og ble bare sjekket mot taket per nivå (ikke på
-- storverket). Nå sammenlignes det første tallet en spiller noen gang laster opp (i alle sesonger), med:
-- - Nivået: tidligst halvparten av dagen testspilleren nådde nivået (1 / 6 / 20 / 57 / 115 → f.eks. storverket dag 57).
-- - Konsernverdien: grensen per tiende døgn (`limit_mill`, i millioner) er den største av 3 × det beste testspilleren
--   klarte (`balance.ts --forste 700`, seks frø, flink og nybegynner, uten daglige belønninger) og 1,5 × det største
--   ærlige spillere har hatt på samme dag (tidslinja uten `pre_reform`, 2026-09-28), minst 1 mill. Etter siste punkt
--   (dag 2 400) vokser grensen med 1,5 mrd. per døgn.
-- Et spill over grensen flagges til eieren ser på det (som før); ingenting slettes. Gjester sjekkes fra første lagring,
-- og tidslinja de tar med til en ny konto, sjekkes ikke på nytt (B-212). Kjørt som migrasjonen «forste_opplasting».

insert into public.config (id, value)
values ('first_upload', '{"step":10,"limit_mill":[1,1,3,4,7,16,29,33,33,34,54,102,131,136,247,960,1761,2751,3589,5458,7864,10236,12359,14488,16530,18450,20416,22310,24320,26531,28562,30318,32062,33850,36233,37699,39196,41829,44043,46477,48671,50972,53035,55314,58002,60981,64018,67151,70344,73147,76273,79433,82636,85660,88876,91899,95062,98150,101632,105275,108821,112172,115618,119188,122842,125845,129237,132618,135822,139346,142705,143089,146624,150158,153692,157227,160761,164296,167830,171364,174899,188292,222794,267594,320860,358354,405932,468665,513818,554987,593844,637230,680110,718283,756181,806679,845841,886438,931265,973647,1017791,1054817,1099666,1149882,1155247,1155247,1155247,1155247,1155247,1155247,1163703,1169668,1175029,1186234,1191817,1197319,1203819,1209876,1215182,1219734,1225814,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1229950,1245714,1271493,1294101,1314752,1338750,1360784,1384024,1406202,1430155,1451757,1475385,1498635,1525549,1550393,1574640,1597820,1618426,1638161,1657010,1679337,1701437,1723334,1746369,1770543,1785415,1792810,1799183,1805756,1812222,1818383,1826426,1832202,1837638,1843166,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769,1845769],"after_growth_mill":1500,"stage_day":[1,6,20,57,115],"day_margin":0.5}')
on conflict (id) do update set value = excluded.value;

-- Grensen for konsernverdien på et døgn (kr): rett linje mellom punktene
create or replace function public.first_upload_limit(p_day int)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  fu jsonb;
  n int;
  step numeric;
  i int;
  a numeric;
  b numeric;
  d numeric := greatest(coalesce(p_day, 0), 0);
begin
  select value into fu from public.config where id = 'first_upload';
  if fu is null then
    return null;
  end if;
  step := coalesce((fu->>'step')::numeric, 10);
  n := jsonb_array_length(fu->'limit_mill');
  if d >= (n - 1) * step then
    return ((fu->'limit_mill'->>(n - 1))::numeric
            + (d - (n - 1) * step) * coalesce((fu->>'after_growth_mill')::numeric, 0)) * 1000000;
  end if;
  i := floor(d / step);
  a := (fu->'limit_mill'->>i)::numeric;
  b := (fu->'limit_mill'->>(i + 1))::numeric;
  return (a + (b - a) * (d - i * step) / step) * 1000000;
end;
$$;
revoke execute on function public.first_upload_limit(int) from public, anon, authenticated;

-- Juksesperren med sjekken av første opplasting (ellers lik 035)
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
begin
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

