-- 096 Tidslinjetall til «Mest stål per kWh» og «Leveringspresisjon» (B-396). Konkurransene er IKKE slått på.
--
-- Appen sender rådata som tellere i alt (strøm, leveranser i tide, misligholdt, avbrutt, reklamasjoner) – aldri et
-- ferdig forhold. Serveren regner forholdet selv av forskjellen mellom to rader (`timeline_metrics`).
-- Vakten under nuller tall som ikke kan stemme og skriver hvorfor i `metric_note`. Den avviser aldri en rad og flagger
-- aldri en spiller: tidslinja går som før, og tallet teller bare ikke.
-- Leverte kontrakter er alltid i tide (fristen sjekkes ved døgnskiftet), så «i tide» = leveranser.

alter table public.snapshots
  add column if not exists kwh_total bigint,
  add column if not exists deliveries integer,
  add column if not exists missed integer,
  add column if not exists cancelled integer,
  add column if not exists complaints integer,
  add column if not exists metric_note text[];

-- Vakten slår opp raden før og etter i tid for samme spiller
create index if not exists snapshots_user_at on public.snapshots (user_id, at);

/** Plausibilitetsvakten for de nye tallene: nuller det som ikke kan stemme, avviser aldri (B-396) */
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
      -- Strøm per tonn: ovnene bruker 200–1 100 kWh per tonn ferdig stål; grensene har god luft for chargen som
      -- er smeltet, men ikke støpt ennå
      dt := new.produced_t - p.produced_t;
      dk := new.kwh_total - p.kwh_total;
      if dk is not null then
        if dt >= 500 and (dk / dt < 120 or dk / dt > 3000) then
          new.kwh_total := null; notes := notes || 'kwh_per_tonn'::text;
        elsif dt < 500 and dk > 1500000 + 3000 * greatest(dt, 0) then
          new.kwh_total := null; notes := notes || 'kwh_uten_tonn'::text;
        end if;
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
    if dk < 0 or (dt >= 500 and (dk / dt < 120 or dk / dt > 3000)) then
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

drop trigger if exists snapshots_metrics on public.snapshots;
create trigger snapshots_metrics before insert or update on public.snapshots
for each row execute function public.snapshot_metrics_guard();

revoke execute on function public.snapshot_metrics_guard() from public, anon, authenticated;

/**
 * Tallene for én spiller i en periode (B-396), regnet av serveren fra forskjellen mellom radene i tidslinja.
 * Bare par av rader der begge tallene er godtatt og spillet ikke er startet på nytt, teller. Til rapporter og
 * senere konkurranser – ikke åpnet for appen.
 */
create or replace function public.timeline_metrics(p_user uuid, p_from timestamptz, p_to timestamptz default now())
returns table (tonn numeric, kwh numeric, kwh_per_tonn numeric, levert int, misligholdt int, avbrutt int,
               reklamasjoner int, presisjon numeric, rader int)
language sql
stable
security definer
set search_path = public
as $$
  with r as (
    select s.at, s.produced_t, s.kwh_total, s.deliveries, s.missed, s.cancelled, s.complaints, s.metric_note,
           lag(s.produced_t) over w as p_t, lag(s.kwh_total) over w as p_k, lag(s.deliveries) over w as p_d,
           lag(s.missed) over w as p_m, lag(s.cancelled) over w as p_c, lag(s.complaints) over w as p_r
    from public.snapshots s
    where s.user_id = p_user and s.at >= p_from and s.at < p_to
    window w as (order by s.at)
  ),
  d as (
    select
      case when kwh_total is not null and p_k is not null and produced_t >= p_t then produced_t - p_t end as dt,
      case when kwh_total is not null and p_k is not null and produced_t >= p_t then kwh_total - p_k end as dk,
      case when produced_t >= p_t and deliveries is not null and p_d is not null
                and missed is not null and p_m is not null and cancelled is not null and p_c is not null
           then deliveries - p_d end as dd,
      case when produced_t >= p_t and deliveries is not null and p_d is not null
                and missed is not null and p_m is not null and cancelled is not null and p_c is not null
           then missed - p_m end as dm,
      case when produced_t >= p_t and deliveries is not null and p_d is not null
                and missed is not null and p_m is not null and cancelled is not null and p_c is not null
           then cancelled - p_c end as dc,
      case when produced_t >= p_t and complaints is not null and p_r is not null then complaints - p_r end as dr
    from r
    where p_t is not null and not coalesce('ny_start' = any (metric_note), false)
  )
  select sum(dt), sum(dk), round(sum(dk) / nullif(sum(dt), 0)),
         sum(dd)::int, sum(dm)::int, sum(dc)::int, sum(dr)::int,
         round(sum(dd)::numeric / nullif(sum(dd) + sum(dm) + sum(dc), 0), 4),
         count(*)::int
  from d;
$$;

revoke execute on function public.timeline_metrics(uuid, timestamptz, timestamptz) from public, anon, authenticated;
