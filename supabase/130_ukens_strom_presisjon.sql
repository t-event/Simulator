-- B-457: ukens utfordring får «Mest stål per kWh» og «Leveranser i tide» (anbefalingene i B-456, eieren 5.10:
-- «kjør dine anbefalinger»). «Mer stål enn før» tas ut av rotasjonen.
--
-- * Rotasjon fra uka 12.10.2026: strom → kontroll → presisjon → dager (uka 19.10 er fortsatt den første
--   kontrollromsuka).
--   Ukene før 12.10 gir samme type som før, så gamle resultater regnes likt.
-- * strom: kg stål per kWh i uka (1 000 × tonn / kWh – ikke det avrundede kWh/t, som gir likt for mange) fra tidslinja
--   (`timeline_energy`): minst 5 000 t og et rimelig forhold (120–3 000 kWh/t). Små verk kommer ikke med (andre ovner,
--   for lite stål). Absolutt tall, ikke forbedring – variasjonen fra dag til dag er like stor som en ukes forbedring
--   (B-456).
-- * presisjon: andel leveranser i tide i uka (levert / (levert + misligholdt + avbrutt)) fra `timeline_metrics`, med
--   minst 50 leveranser i alt.
-- * Begge regnes av serveren fra forskjellen mellom radene i tidslinja (tellerne fra B-396), i ekte uker – farten i
--   spillet gir ikke bedre forhold.

create or replace function public.week_kind(w date)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when w < date '2026-10-05' then (array['vekst', 'tonn', 'dager'])[(((w - date '2026-09-21') / 7) % 3 + 3) % 3 + 1]
    when w < date '2026-10-12' then 'dager'
    else (array['strom', 'kontroll', 'presisjon', 'dager'])[(((w - date '2026-10-12') / 7) % 4 + 4) % 4 + 1]
  end;
$$;

create or replace function public.weekly_scores(w date)
returns table(user_id uuid, league text, value numeric, day integer)
language sql
stable
security definer
set search_path = public
as $function$
  with win as (
    select (w::timestamp at time zone 'Europe/Oslo') as a, ((w + 7)::timestamp at time zone 'Europe/Oslo') as b
  ),
  last as (
    select distinct on (s.user_id) s.user_id, s.season_id, s.day, s.equity, s.produced_t
    from public.snapshots s, win
    where s.at >= win.a and s.at < win.b and not s.pre_reform and public.week_kind(w) in ('vekst', 'tonn', 'dager')
    order by s.user_id, s.at desc
  ),
  -- Ekte aktive dager i uka (norsk tid), uansett fart
  active as (
    select s.user_id, count(distinct (s.at at time zone 'Europe/Oslo')::date)::numeric as n
    from public.snapshots s, win
    where s.at >= win.a and s.at < win.b
    group by s.user_id
  ),
  -- Ekte dager med lagring før uka (B-235)
  before_days as (
    select s.user_id, count(distinct (s.at at time zone 'Europe/Oslo')::date) as n
    from public.snapshots s, win
    where s.at < win.a and not s.pre_reform
    group by s.user_id
  ),
  -- Spillerne med lagring i uka (stål per kWh og leveranser i tide, B-457)
  players as (
    select distinct s.user_id
    from public.snapshots s, win
    where s.at >= win.a and s.at < win.b and public.week_kind(w) in ('strom', 'presisjon')
  )
  select l.user_id, 'alle'::text,
    round(case public.week_kind(w)
      when 'vekst' then 100.0 * (l.equity - b.equity) / greatest(abs(b.equity), 50000000)
      when 'tonn' then
        100.0 * ((l.produced_t - b.produced_t)::numeric / greatest(l.day - b.day, 1))
          / greatest((b.produced_t - q.produced_t)::numeric / greatest(b.day - q.day, 1), 1)
      else a.n
    end, 1) as value,
    l.day
  from last l
  join public.profiles p on p.id = l.user_id and p.nickname is not null and not p.banned and p.flagged_at is null
  join active a on a.user_id = l.user_id
  cross join win
  left join before_days bd on bd.user_id = l.user_id
  -- Verket da uka startet: siste lagring før uka
  left join lateral (
    select x.day, x.equity, x.produced_t, x.at
    from public.snapshots x
    where x.user_id = l.user_id and (x.season_id is not distinct from l.season_id) and x.day < l.day and x.at < win.a
      and not x.pre_reform
    order by x.at desc
    limit 1
  ) b on true
  -- Uka før: siste lagring minst sju dager før uka, ellers den første som finnes
  left join lateral (
    select x.day, x.produced_t
    from public.snapshots x
    where x.user_id = l.user_id and (x.season_id is not distinct from l.season_id) and x.day < b.day and x.at < win.a
      and not x.pre_reform
    order by (x.at < win.a - interval '7 days') desc,
      case when x.at < win.a - interval '7 days' then x.at end desc nulls last, x.at asc
    limit 1
  ) q on true
  where public.week_kind(w) = 'dager'
    or (b.day is not null and coalesce(bd.n, 0) >= 2 and (public.week_kind(w) = 'vekst' or q.day is not null))
  union all
  -- Ukens kontrollrom (B-387): beste leverte forsøk
  select c.user_id, 'alle'::text, max(c.points)::numeric, null::int
  from public.weekly_control_attempts c
  join public.profiles p on p.id = c.user_id and p.nickname is not null and not p.banned and p.flagged_at is null
  where public.week_kind(w) = 'kontroll' and c.week_start = w and c.submitted_at is not null
  group by c.user_id
  union all
  -- Mest stål per kWh (B-457): kg per kWh, minst 5 000 t og et rimelig forhold
  select x.user_id, 'alle'::text, round(1000.0 * e.tonn / nullif(e.kwh, 0), 3), null::int
  from players x
  join public.profiles p on p.id = x.user_id and p.nickname is not null and not p.banned and p.flagged_at is null
  cross join win
  cross join lateral public.timeline_energy(x.user_id, win.a, win.b, 5000) e
  where public.week_kind(w) = 'strom' and e.gyldig
  union all
  -- Leveranser i tide (B-457): prosent, minst 50 leveranser
  select x.user_id, 'alle'::text, round(100 * m.presisjon, 1), null::int
  from players x
  join public.profiles p on p.id = x.user_id and p.nickname is not null and not p.banned and p.flagged_at is null
  cross join win
  cross join lateral public.timeline_metrics(x.user_id, win.a, win.b) m
  where public.week_kind(w) = 'presisjon' and m.presisjon is not null
    and coalesce(m.levert, 0) + coalesce(m.misligholdt, 0) + coalesce(m.avbrutt, 0) >= 50;
$function$;
