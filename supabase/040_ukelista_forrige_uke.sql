-- B-235: ukens utfordring måles mot forrige uke, ikke mot hele spillet.
-- «Mer stål enn før» (tonn) sammenlignet farten denne uka med snittet over hele spillet. Et verk som var en garasje for
-- en uke siden, fikk da flere tusen prosent. Nå: farten denne uka (tonn per spilldøgn) i prosent av farten uka før.
-- Tonn og vekst krever at verket er lagret på nett minst to ekte dager før uka (ikke pre_reform), så grunnlaget er et
-- verk som har gått en stund. «Flest aktive dager» er som før.
create or replace function public.weekly_scores(w date)
returns table(user_id uuid, league text, value numeric, day integer)
language sql
stable
security definer
set search_path = public
as $$
  with win as (
    select (w::timestamp at time zone 'Europe/Oslo') as a, ((w + 7)::timestamp at time zone 'Europe/Oslo') as b
  ),
  last as (
    select distinct on (s.user_id) s.user_id, s.season_id, s.day, s.equity, s.produced_t
    from public.snapshots s, win
    where s.at >= win.a and s.at < win.b and not s.pre_reform
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
    or (b.day is not null and coalesce(bd.n, 0) >= 2 and (public.week_kind(w) = 'vekst' or q.day is not null));
$$;
revoke execute on function public.weekly_scores(date) from public, anon, authenticated;
