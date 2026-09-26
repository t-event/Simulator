-- B-172: ligaene ga ikke mening. Vekst og tonn ble målt i kroner og tonn, så den største i gull-ligaen vant alltid,
-- og med få spillere sto én alene i bronse og sølv og fikk medalje uansett. Nå er det én ukeliste for alle, og
-- vekst og tonn måles i prosent, så små og store verk kan konkurrere:
--   vekst: prosent vekst i konsernverdi i uka, regnet fra minst 50 mill. (tidlig i spillet vokser et lite verk
--          tusenvis av prosent på en uke; da måles veksten mot 50 mill. i stedet)
--   tonn:  stål per spilldøgn i uka i prosent av det verket laget per døgn før uka (100 = like mye som før;
--          bedre drift og større utstyr gir mer)
--   dager: spilldøgn i uka, som før
-- Kolonnen league står igjen (alle får 'alle'), så appen og resultatene fra før virker.

create or replace function public.weekly_scores(w date)
returns table (user_id uuid, league text, value numeric, day integer)
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
    where s.at >= win.a and s.at < win.b
    order by s.user_id, s.at desc
  )
  select l.user_id, 'alle'::text,
    round(case public.week_kind(w)
      when 'vekst' then 100.0 * (l.equity - b.equity) / greatest(abs(b.equity), 50000000)
      when 'tonn' then
        100.0 * ((l.produced_t - b.produced_t)::numeric / greatest(l.day - b.day, 1))
          / greatest(b.produced_t::numeric / greatest(b.day, 1), 1)
      else (l.day - b.day)::numeric
    end, 1) as value,
    l.day
  from last l
  join public.profiles p on p.id = l.user_id and p.nickname is not null and not p.banned and p.flagged_at is null
  cross join win
  cross join lateral (
    select x.day, x.equity, x.produced_t
    from public.snapshots x
    where x.user_id = l.user_id and (x.season_id is not distinct from l.season_id) and x.day < l.day and x.at < win.b
    order by (x.at >= win.a), case when x.at < win.a then x.day end desc nulls last, x.day asc
    limit 1
  ) b;
$$;
revoke execute on function public.weekly_scores(date) from public, anon, authenticated;

-- Topp 3 av alle får medalje og kiste
create or replace function public.finish_weeks()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  w date;
  cur date := public.week_start_of(now());
begin
  select coalesce(max(week_start) + 7, date '2026-09-21') into w from public.weekly_weeks;
  while w < cur loop
    insert into public.weekly_results (week_start, user_id, league, kind, plass, value, fp)
    select w, r.user_id, r.league, public.week_kind(w), r.plass, r.value,
      case r.plass when 1 then 100 when 2 then 75 else 50 end
    from (
      select s.user_id, s.league, s.value,
        (row_number() over (order by s.value desc, s.day asc))::int as plass
      from public.weekly_scores(w) s
      where s.value > 0
    ) r
    where r.plass <= 3
    on conflict do nothing;
    insert into public.weekly_weeks (week_start) values (w) on conflict do nothing;
    w := w + 7;
  end loop;
end;
$$;
revoke execute on function public.finish_weeks() from public, anon, authenticated;

-- Lista: alle, uansett liga (p_league blir ikke brukt lenger)
create or replace function public.weekly_board(p_league text default null, lim int default 20)
returns table (plass int, nickname text, value numeric, is_me boolean, gold int)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.finish_weeks();
  return query
  select (row_number() over (order by s.value desc, s.day asc))::int, pr.nickname, s.value, s.user_id = auth.uid(),
    (select count(*) from public.weekly_results r where r.user_id = s.user_id and r.plass = 1)::int
  from public.weekly_scores(public.week_start_of(now())) s
  join public.profiles pr on pr.id = s.user_id
  where s.value > 0
  order by 1
  limit lim;
end;
$$;

create or replace function public.weekly_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
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
    select x.user_id, x.value, (row_number() over (order by x.value desc, x.day asc))::int as plass
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
    'gold', g, 'silver', s, 'bronze', b
  );
end;
$$;
