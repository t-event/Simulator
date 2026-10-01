-- 098 Rettinger i kontrollene fra 095 og 096 (B-398), etter ny kodegjennomgang 1.10.
--
-- 1. Typevakten slapp gjennom lagringer som kunne stoppe verdensjobbene for alle: `history: null` (marginen og
--    utbyttet leser den som en liste), og tall som ikke er heltall eller er for store der serveren gjør dem om til
--    heltall (`stage` til int og smallint, `serverEdit`, `konsern.nextId`, `minute`). `konsern.plants: null` ble også
--    sluppet gjennom. Nå avvises de. Ingen av dagens 24 lagringer har noe av dette (sjekket 1.10).
-- 2. Energivakten forkastet gyldige målinger: strømmen bokføres når chargen starter, mens tonnene telles når de støpes,
--    så et intervall kan ha mange tonn og ingen ny strøm (støpekøen tømmes). Vakten har nå bare grenser som tåler
--    forskyvningen (ingen nedre grense per intervall); forholdet kWh/t vurderes over en lengre periode i
--    `timeline_energy` (`gyldig`). Ingen målinger var forkastet ennå (26 av 26 godtatt).

-- 1. Typevakten ---------------------------------------------------------------------------------------------------------

/** Et heltall mellom `lo` og `hi`, eller tomt (manglende felt / null) */
create or replace function public.jint_ok(v jsonb, lo numeric, hi numeric)
returns boolean
language sql
immutable
set search_path = public
as $$
  select v is null or jsonb_typeof(v) = 'null'
    or (jsonb_typeof(v) = 'number' and (v #>> '{}')::numeric = trunc((v #>> '{}')::numeric)
        and (v #>> '{}')::numeric between lo and hi);
$$;

/** Et tall mellom `lo` og `hi`, eller tomt */
create or replace function public.jrange_ok(v jsonb, lo numeric, hi numeric)
returns boolean
language sql
immutable
set search_path = public
as $$
  select v is null or jsonb_typeof(v) = 'null'
    or (jsonb_typeof(v) = 'number' and (v #>> '{}')::numeric between lo and hi);
$$;

/** Felt i lagringen som har feil type eller verdi, blant dem serveren leser for alle spillere (tom liste = i orden) */
create or replace function public.state_type_problems(s jsonb)
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  p text[] := '{}';
  h jsonb;
  max_int constant numeric := 2147483647;
begin
  if s is null or jsonb_typeof(s) <> 'object' then
    return array['state'];
  end if;
  -- Gjøres om til int (og smallint på topplista) av serveren
  if not public.jint_ok(s -> 'stage', 0, 100) then p := p || 'stage'::text; end if;
  if not public.jint_ok(s -> 'serverEdit', 0, max_int) then p := p || 'serverEdit'::text; end if;
  if not public.jrange_ok(s -> 'minute', 0, max_int) then p := p || 'minute'::text; end if;
  if not public.jnum_ok(s -> 'reputation') then p := p || 'reputation'::text; end if;
  if not public.jnum_ok(s -> 'loan') then p := p || 'loan'::text; end if;
  if not public.jnum_ok(s -> 'controlBest') then p := p || 'controlBest'::text; end if;
  if s ? 'mastery' and jsonb_typeof(s -> 'mastery') not in ('object', 'null') then
    p := p || 'mastery'::text;
  elsif not public.jnum_ok(s -> 'mastery' -> 'datterverk') then
    p := p || 'mastery.datterverk'::text;
  end if;
  if s ? 'researched' and jsonb_typeof(s -> 'researched') not in ('array', 'null') then
    p := p || 'researched'::text;
  end if;
  if s ? 'konsern' and jsonb_typeof(s -> 'konsern') not in ('object', 'null') then
    p := p || 'konsern'::text;
  elsif jsonb_typeof(s -> 'konsern') = 'object' then
    if jsonb_typeof(s -> 'konsern' -> 'unlocked') not in ('boolean', 'null') then p := p || 'konsern.unlocked'::text; end if;
    if jsonb_typeof(s -> 'konsern' -> 'shared') not in ('array', 'null') then p := p || 'konsern.shared'::text; end if;
    -- Leses som en liste (utbyttet); null er ikke en liste
    if s -> 'konsern' ? 'plants' and jsonb_typeof(s -> 'konsern' -> 'plants') <> 'array' then
      p := p || 'konsern.plants'::text;
    end if;
    if not public.jint_ok(s -> 'konsern' -> 'nextId', 0, max_int) then p := p || 'konsern.nextId'::text; end if;
  end if;
  -- Døgnregnskapet leses som en liste av marginen og utbyttet; null er ikke en liste (B-398)
  if s ? 'history' then
    if jsonb_typeof(s -> 'history') <> 'array' then
      p := p || 'history'::text;
    else
      for h in select value from jsonb_array_elements(s -> 'history') loop
        if jsonb_typeof(h) <> 'object' then
          p := p || 'history[]'::text;
          exit;
        end if;
        if not (public.jnum_ok(h -> 'producedT') and public.jnum_ok(h -> 'onGradeT') and public.jnum_ok(h -> 'offGradeT')
                and public.jnum_ok(h -> 'secondT') and public.jobj_nums_ok(h -> 'income')
                and public.jobj_nums_ok(h -> 'costs')) then
          p := p || 'history.tall'::text;
          exit;
        end if;
      end loop;
    end if;
  end if;
  return p;
end;
$$;

revoke execute on function public.jint_ok(jsonb, numeric, numeric) from public, anon;
revoke execute on function public.jrange_ok(jsonb, numeric, numeric) from public, anon;
revoke execute on function public.state_type_problems(jsonb) from public, anon;

-- 2. Energivakten -------------------------------------------------------------------------------------------------------

/** Plausibilitetsvakten for de nye tallene: nuller det som ikke kan stemme, avviser aldri (B-396, B-398) */
create or replace function public.snapshot_metrics_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  notes text[] := '{}';
  dt numeric;
  dk numeric;
  days numeric;
  per_day constant int := 200;
  -- Strøm som kan være brukt på charger som ennå ikke er støpt (smeltet, men ikke telt som tonn)
  lag_kwh constant numeric := 1500000;
  fresh boolean;
begin
  -- Tall som legges tilbake (B-261), er sjekket før
  if current_setting('stalverk.restore', true) = 'on' then
    return new;
  end if;
  -- Negative tellere kan ikke stemme
  if new.kwh_total < 0 then new.kwh_total := null; notes := notes || 'kwh_negativ'::text; end if;
  if new.deliveries < 0 then new.deliveries := null; notes := notes || 'leveranser_negativ'::text; end if;
  if new.missed < 0 then new.missed := null; notes := notes || 'misligholdt_negativ'::text; end if;
  if new.cancelled < 0 then new.cancelled := null; notes := notes || 'avbrutt_negativ'::text; end if;
  if new.complaints < 0 then new.complaints := null; notes := notes || 'reklamasjoner_negativ'::text; end if;

  -- Forrige rad i tid. `season_key` er generert og står tom i en BEFORE-trigger, så den regnes fra `season_id` her
  select s.produced_t, s.game_min, s.kwh_total, s.deliveries, s.missed, s.cancelled, s.complaints into p
  from public.snapshots s
  where s.user_id = new.user_id and (s.season_key, s.day) is distinct from (coalesce(new.season_id, 0), new.day)
    and s.at <= coalesce(new.at, now())
  order by s.at desc
  limit 1;

  if found then
    -- Nytt spill (tonnene går ned): tellerne starter på nytt, raden blir et nytt utgangspunkt
    fresh := new.produced_t < p.produced_t;
    if fresh then
      notes := notes || 'ny_start'::text;
    else
      days := greatest(1, coalesce(new.game_min - p.game_min, 0) / 1440.0);
      -- Tellere som går ned uten at spillet er nytt, kan ikke stemme
      if new.kwh_total < p.kwh_total then new.kwh_total := null; notes := notes || 'kwh_synker'::text; end if;
      if new.deliveries < p.deliveries then new.deliveries := null; notes := notes || 'leveranser_synker'::text; end if;
      if new.missed < p.missed then new.missed := null; notes := notes || 'misligholdt_synker'::text; end if;
      if new.cancelled < p.cancelled then new.cancelled := null; notes := notes || 'avbrutt_synker'::text; end if;
      if new.complaints < p.complaints then new.complaints := null; notes := notes || 'reklamasjoner_synker'::text; end if;
      -- Strøm: bare en øvre grense som tåler forskyvningen mellom smelting og støping (B-398). Et intervall kan ha
      -- mange tonn og ingen ny strøm (støpekøen tømmes), eller strøm uten tonn (chargene er ikke støpt ennå), så
      -- ingen nedre grense her: forholdet vurderes over en lengre periode (`timeline_energy`)
      dt := greatest(0, new.produced_t - p.produced_t);
      dk := new.kwh_total - p.kwh_total;
      if dk > lag_kwh + 3000 * dt then
        new.kwh_total := null; notes := notes || 'kwh_for_hoy'::text;
      end if;
      -- Kontrakter per spilldøgn: romslig tak
      if new.deliveries - p.deliveries > per_day * days then
        new.deliveries := null; notes := notes || 'leveranser_per_dogn'::text;
      end if;
      if new.missed - p.missed > per_day * days then
        new.missed := null; notes := notes || 'misligholdt_per_dogn'::text;
      end if;
      if new.cancelled - p.cancelled > per_day * days then
        new.cancelled := null; notes := notes || 'avbrutt_per_dogn'::text;
      end if;
      if new.complaints - p.complaints > per_day * days then
        new.complaints := null; notes := notes || 'reklamasjoner_per_dogn'::text;
      end if;
    end if;
  end if;

  -- En rad som skrives etter at en senere rad finnes (en eldre dag lastes opp på nytt), sjekkes også mot den senere,
  -- så forskjellen mellom de to ikke slipper forbi uten sjekk
  select s.produced_t, s.kwh_total, s.deliveries, s.missed, s.cancelled, s.complaints into p
  from public.snapshots s
  where s.user_id = new.user_id and (s.season_key, s.day) is distinct from (coalesce(new.season_id, 0), new.day)
    and s.at > coalesce(new.at, now())
  order by s.at
  limit 1;
  if found and new.produced_t <= p.produced_t then
    dt := p.produced_t - new.produced_t;
    dk := p.kwh_total - new.kwh_total;
    if dk < 0 or dk > lag_kwh + 3000 * dt then
      new.kwh_total := null; notes := notes || 'kwh_mot_senere'::text;
    end if;
    if new.deliveries > p.deliveries or new.missed > p.missed or new.cancelled > p.cancelled then
      new.deliveries := null; new.missed := null; new.cancelled := null; notes := notes || 'kontrakter_mot_senere'::text;
    end if;
    if new.complaints > p.complaints then
      new.complaints := null; notes := notes || 'reklamasjoner_mot_senere'::text;
    end if;
  end if;
  new.metric_note := case when cardinality(notes) > 0 then notes end;
  return new;
end;
$$;

revoke execute on function public.snapshot_metrics_guard() from public, anon, authenticated;

/**
 * Strøm per tonn over en periode (B-398), vurdert samlet: forskyvningen mellom smelting og støping jevner seg ut når
 * perioden har minst `p_min_t` tonn. `gyldig` er sann når det er nok tonn og forholdet er rimelig (120–3 000 kWh/t).
 * `timeline_metrics` står som før (forholdet uten vurdering).
 */
create or replace function public.timeline_energy(p_user uuid, p_from timestamptz, p_to timestamptz default now(),
                                                  p_min_t numeric default 5000)
returns table (tonn numeric, kwh numeric, kwh_per_tonn numeric, gyldig boolean)
language sql
stable
security definer
set search_path = public
as $$
  select m.tonn, m.kwh, m.kwh_per_tonn,
         coalesce(m.tonn >= p_min_t and m.kwh_per_tonn between 120 and 3000, false)
  from public.timeline_metrics(p_user, p_from, p_to) m;
$$;

revoke execute on function public.timeline_energy(uuid, timestamptz, timestamptz, numeric) from public, anon, authenticated;
