-- B-387: «Ukens kontrollrom» – ukekonkurranse i kontrollrommet, variant A (UKENS-KONTROLLROM.md, eierens svar B-387).
--
-- - Tre tellende forsøk per uke. Serveren bestemmer tre frø (A, B, C) og kvaliteten – like for alle, i samme rekkefølge:
--   forsøk 1 = frø A, forsøk 2 = frø B, forsøk 3 = frø C. Frøene regnes av en hemmelig nøkkel, så de kan ikke regnes ut
--   før forsøket startes. Trening bruker egne frø i appen (aldri A/B/C).
-- - Et forsøk er brukt når det startes. Et startet forsøk kan leveres med samme id til fristen (15 min) – også etter en
--   nettfeil ved innsending (innleveringen er idempotent). Et avbrutt eller utløpt forsøk teller 0.
-- - Innleveringen sjekkes: eget forsøk, levert mellom 20 s og 15 min etter start, poeng 0–5 000 og stjerner 0–5 (samme
--   tak som kontrollromsrekorden, B-295). Inndataene lagres (høyst 32 kB) så topp 3 kan etterprøves.
-- - Ukelista (`weekly_scores`) tar beste leverte forsøk per spiller i kontrollromsukene. Kistene virker som før.
-- - Rotasjon fra uka 5.10.2026: aktive dager → mer stål enn før → kontrollrom. Ukene før står som de var.

create table if not exists public.weekly_control_keys (
  id int primary key default 1 check (id = 1),
  secret text not null
);
alter table public.weekly_control_keys enable row level security;
revoke all on public.weekly_control_keys from anon, authenticated;
insert into public.weekly_control_keys (id, secret)
values (1, encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (id) do nothing;

create table if not exists public.weekly_control_attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  attempt smallint not null check (attempt between 1 and 3),
  seed bigint not null,
  grade text not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  abandoned boolean not null default false,
  points int,
  stars smallint,
  log jsonb,
  unique (user_id, week_start, attempt)
);
alter table public.weekly_control_attempts enable row level security;
revoke all on public.weekly_control_attempts from anon, authenticated;
create index if not exists weekly_control_week on public.weekly_control_attempts (week_start, user_id);

update public.config
set value = value || jsonb_build_object('weekly_control', jsonb_build_object(
  'attempts', 3, 'min_s', 20, 'max_s', 900, 'max_points', 5000, 'log_max_bytes', 32768))
where id = 'world';

-- Rotasjonen: fra 5.10.2026 dager → tonn → kontroll
create or replace function public.week_kind(w date)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when w < date '2026-10-05' then (array['vekst', 'tonn', 'dager'])[(((w - date '2026-09-21') / 7) % 3 + 3) % 3 + 1]
    else (array['dager', 'tonn', 'kontroll'])[(((w - date '2026-10-05') / 7) % 3 + 3) % 3 + 1]
  end;
$$;

-- Kvaliteten for uka (offentlig, så man kan trene på den)
create or replace function public.weekly_control_grade(w date)
returns text
language sql
immutable
set search_path = public
as $$
  select (array['standard', 'armering', 'lavkarbon', 'hoykarbon', 'premium'])[
    (((w - date '2026-10-05') / 7) % 5 + 5) % 5 + 1];
$$;

-- Frø nr. n (1–3) for uka: likt for alle, hemmelig til forsøket startes
create or replace function public.weekly_control_seed(w date, n int)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select ('x' || substr(md5(k.secret || ':' || w::text || ':' || n::text), 1, 8))::bit(32)::bigint % 2147483646 + 1
  from public.weekly_control_keys k where k.id = 1;
$$;
revoke execute on function public.weekly_control_seed(date, int) from public, anon, authenticated;

create or replace function public.weekly_control_cfg(p_key text, p_default numeric)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce((select (value -> 'weekly_control' ->> p_key)::numeric from public.config where id = 'world'), p_default);
$$;

-- Status for uka (brukes av weekly_status)
create or replace function public.weekly_control_state(p_user uuid, w date)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'grade', public.weekly_control_grade(w),
    'attempts', public.weekly_control_cfg('attempts', 3)::int,
    'used', (select count(*) from public.weekly_control_attempts a where a.user_id = p_user and a.week_start = w),
    'best', (select max(a.points) from public.weekly_control_attempts a
             where a.user_id = p_user and a.week_start = w and a.submitted_at is not null),
    'open', (select json_build_object('id', a.id, 'attempt', a.attempt,
                                      'deadline', a.started_at + make_interval(secs => public.weekly_control_cfg('max_s', 900)))
             from public.weekly_control_attempts a
             where a.user_id = p_user and a.week_start = w and a.submitted_at is null and not a.abandoned
               and a.started_at > now() - make_interval(secs => public.weekly_control_cfg('max_s', 900))
             order by a.attempt desc limit 1)
  );
$$;
revoke execute on function public.weekly_control_state(uuid, date) from public, anon, authenticated;

create or replace function public.weekly_control_start()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ws date := public.week_start_of(now());
  n int;
  max_s numeric := public.weekly_control_cfg('max_s', 900);
  o record;
  a record;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if public.user_is_guest(uid) then
    return json_build_object('ok', false, 'reason', 'konto');
  end if;
  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  if public.week_kind(ws) <> 'kontroll' then
    return json_build_object('ok', false, 'reason', 'uke');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_ukekontroll_' || uid::text));
  -- Et startet forsøk som ikke er levert: leveres først (eller gis opp) – ikke et nytt
  select * into o from public.weekly_control_attempts
  where user_id = uid and week_start = ws and submitted_at is null and not abandoned
    and started_at > now() - make_interval(secs => max_s)
  order by attempt desc limit 1;
  if found then
    return json_build_object('ok', false, 'reason', 'apen', 'attempt_id', o.id);
  end if;
  select count(*) into n from public.weekly_control_attempts where user_id = uid and week_start = ws;
  if n >= public.weekly_control_cfg('attempts', 3) then
    return json_build_object('ok', false, 'reason', 'brukt');
  end if;
  insert into public.weekly_control_attempts (user_id, week_start, attempt, seed, grade)
  values (uid, ws, n + 1, public.weekly_control_seed(ws, n + 1), public.weekly_control_grade(ws))
  returning * into a;
  return json_build_object('ok', true, 'attempt_id', a.id, 'attempt', a.attempt, 'seed', a.seed, 'grade', a.grade,
    'left', public.weekly_control_cfg('attempts', 3)::int - a.attempt,
    'deadline', a.started_at + make_interval(secs => max_s));
end;
$$;

create or replace function public.weekly_control_submit(p_attempt bigint, p_points int, p_stars int, p_log jsonb default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  a record;
  el numeric;
  best int;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  select * into a from public.weekly_control_attempts where id = p_attempt and user_id = uid for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'ukjent');
  end if;
  -- Idempotent: et forsøk som alt er levert (svaret kom ikke fram), gir samme svar igjen
  if a.submitted_at is null then
    if a.abandoned then
      return json_build_object('ok', false, 'reason', 'avbrutt');
    end if;
    el := extract(epoch from now() - a.started_at);
    if el < public.weekly_control_cfg('min_s', 20) then
      return json_build_object('ok', false, 'reason', 'fort');
    end if;
    if el > public.weekly_control_cfg('max_s', 900) then
      return json_build_object('ok', false, 'reason', 'sent');
    end if;
    if p_points is null or p_points < 0 or p_points > public.weekly_control_cfg('max_points', 5000)
       or p_stars is null or p_stars < 0 or p_stars > 5 then
      return json_build_object('ok', false, 'reason', 'ugyldig');
    end if;
    update public.weekly_control_attempts
    set submitted_at = now(), points = p_points, stars = p_stars,
        log = case when p_log is not null and pg_column_size(p_log) <= public.weekly_control_cfg('log_max_bytes', 32768)
                   then p_log end
    where id = a.id;
  end if;
  select max(points) into best from public.weekly_control_attempts
  where user_id = uid and week_start = a.week_start and submitted_at is not null;
  return json_build_object('ok', true, 'points', coalesce(a.points, p_points), 'best', best,
    'left', public.weekly_control_cfg('attempts', 3)::int
            - (select count(*) from public.weekly_control_attempts where user_id = uid and week_start = a.week_start));
end;
$$;

create or replace function public.weekly_control_abandon(p_attempt bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  update public.weekly_control_attempts set abandoned = true
  where id = p_attempt and user_id = uid and submitted_at is null;
  return json_build_object('ok', true);
end;
$$;

revoke execute on function public.weekly_control_start() from public, anon;
revoke execute on function public.weekly_control_submit(bigint, int, int, jsonb) from public, anon;
revoke execute on function public.weekly_control_abandon(bigint) from public, anon;
grant execute on function public.weekly_control_start() to authenticated;
grant execute on function public.weekly_control_submit(bigint, int, int, jsonb) to authenticated;
grant execute on function public.weekly_control_abandon(bigint) to authenticated;

-- Ukelista: kontrollromsukene tar beste leverte forsøk; de andre ukene som før (samme spørring)
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
    where s.at >= win.a and s.at < win.b and not s.pre_reform and public.week_kind(w) <> 'kontroll'
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
    or (b.day is not null and coalesce(bd.n, 0) >= 2 and (public.week_kind(w) = 'vekst' or q.day is not null))
  union all
  -- Ukens kontrollrom (B-387): beste leverte forsøk
  select c.user_id, 'alle'::text, max(c.points)::numeric, null::int
  from public.weekly_control_attempts c
  join public.profiles p on p.id = c.user_id and p.nickname is not null and not p.banned and p.flagged_at is null
  where public.week_kind(w) = 'kontroll' and c.week_start = w and c.submitted_at is not null
  group by c.user_id;
$function$;

-- Status: kontrollromsukene får forsøkene (brukt, igjen, beste, åpent forsøk)
create or replace function public.weekly_status()
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  ws date;
  me record;
  n int;
  chest record;
  g int;
  s int;
  b int;
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  perform public.finish_weeks();
  ws := public.week_start_of(now());

  select count(*) into n from public.weekly_scores(ws) x where x.value > 0;
  select r.plass, r.value into me from (
    select x.user_id, x.value, (rank() over (order by x.value desc))::int as plass
    from public.weekly_scores(ws) x
    where x.value > 0
  ) r where r.user_id = auth.uid();

  select coalesce(sum(fp), 0)::int as fp, count(*)::int as n, min(plass) as best, max(week_start) as week into chest
  from public.weekly_results where user_id = auth.uid() and claimed_at is null;

  select count(*) filter (where plass = 1), count(*) filter (where plass = 2), count(*) filter (where plass = 3)
  into g, s, b
  from public.weekly_results where user_id = auth.uid();

  return json_build_object(
    'week_start', ws,
    'ends_at', ((ws + 7)::timestamp at time zone 'Europe/Oslo'),
    'kind', public.week_kind(ws),
    'league', 'alle',
    'plass', me.plass,
    'value', me.value,
    'players', n,
    'chest', case when chest.n > 0 then json_build_object('fp', chest.fp, 'count', chest.n, 'best', chest.best, 'week', chest.week) end,
    'gold', g, 'silver', s, 'bronze', b,
    'control', case when public.week_kind(ws) = 'kontroll' then public.weekly_control_state(auth.uid(), ws) end
  );
end;
$function$;
