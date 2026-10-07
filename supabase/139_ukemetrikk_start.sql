-- B-472: tidslinjetallene i en periode (`timeline_metrics`, B-396) regnes fra siste lagring før perioden, ikke fra den
-- første i perioden (gjennomgangen 7.10). Før falt det som skjedde mellom siste lagring før uka og første lagring i uka,
-- ut – ofte hele første økt i uka: 50 leveranser og 10 misligholdte ble 100 % i stedet for 83,3 %, og «Mest stål per
-- kWh» mistet de samme tonnene. Påvirker ukene «strom» og «presisjon» (første gang 12.10) og oversiktene i
-- DATAKVALITET. Samme vakter som før: ingen differanse over en ny start (`ny_start`) eller når produksjonen går ned.

create or replace function public.timeline_metrics(p_user uuid, p_from timestamp with time zone,
                                                   p_to timestamp with time zone default now())
returns table(tonn numeric, kwh numeric, kwh_per_tonn numeric, levert integer, misligholdt integer, avbrutt integer,
              reklamasjoner integer, presisjon numeric, rader integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with rows_in as (
    -- Siste lagring før perioden er utgangspunktet, så første økt i perioden kommer med
    (select s.at, s.produced_t, s.kwh_total, s.deliveries, s.missed, s.cancelled, s.complaints, s.metric_note
       from public.snapshots s
      where s.user_id = p_user and s.at < p_from
      order by s.at desc
      limit 1)
    union all
    (select s.at, s.produced_t, s.kwh_total, s.deliveries, s.missed, s.cancelled, s.complaints, s.metric_note
       from public.snapshots s
      where s.user_id = p_user and s.at >= p_from and s.at < p_to)
  ),
  r as (
    select x.*,
           lag(x.produced_t) over w as p_t, lag(x.kwh_total) over w as p_k, lag(x.deliveries) over w as p_d,
           lag(x.missed) over w as p_m, lag(x.cancelled) over w as p_c, lag(x.complaints) over w as p_r
    from rows_in x
    window w as (order by x.at)
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
    where p_t is not null and at >= p_from and not coalesce('ny_start' = any (metric_note), false)
  )
  select sum(dt), sum(dk), round(sum(dk) / nullif(sum(dt), 0)),
         sum(dd)::int, sum(dm)::int, sum(dc)::int, sum(dr)::int,
         round(sum(dd)::numeric / nullif(sum(dd) + sum(dm) + sum(dc), 0), 4),
         count(*)::int
  from d;
$function$;
