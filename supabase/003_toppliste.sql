-- Stålverket: toppliste, kallenavn og juksesperre (B-127, fase 2). Kjørt som migrasjonen «toppliste».

-- ------------------------------------------------------------------ kolonner

alter table public.snapshots add column if not exists reputation numeric;

alter table public.profiles add column if not exists flagged_at timestamptz;
alter table public.profiles add column if not exists flag_reason text;
alter table public.profiles add column if not exists rewound_at timestamptz;

-- Kallenavn skilles ikke på store og små bokstaver
create unique index if not exists profiles_nickname_lower on public.profiles (lower(nickname));

-- Spilleren skal ikke kunne endre sperre eller liga selv: bare kallenavn, gjennom set_nickname
drop policy if exists "profil: endre egen" on public.profiles;

-- ------------------------------------------------------------------ kallenavn

create or replace function public.set_nickname(name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n text := btrim(name);
begin
  if auth.uid() is null then
    raise exception 'Du er ikke logget inn.';
  end if;
  if length(n) < 3 or length(n) > 20 then
    raise exception 'Kallenavnet må ha 3–20 tegn.';
  end if;
  if n !~ '^[A-Za-z0-9ÆØÅæøåÄÖÜäöüÉéÈè _.-]+$' then
    raise exception 'Bruk bare bokstaver, tall, mellomrom, punktum, bindestrek og understrek.';
  end if;
  if exists (select 1 from public.profiles where lower(nickname) = lower(n) and id <> auth.uid()) then
    raise exception 'Kallenavnet er tatt. Velg et annet.';
  end if;
  update public.profiles set nickname = n where id = auth.uid();
  return n;
end;
$$;
revoke execute on function public.set_nickname(text) from public, anon;
grant execute on function public.set_nickname(text) to authenticated;

-- ------------------------------------------------------------------ juksesperre

-- Største vekst i konsernverdi per spilldøgn og største konsernverdi per nivå, målt med testspilleren
-- (`balance.ts --vekst`) og ganget med 3–5. Over dette merkes kontoen og holdes utenfor topplista til den er sett på.
-- Spilldager som går bakover (en eldre sikkerhetskopi er lastet inn) merkes også (brukes av anbud og auksjoner).
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
begin
  select day, equity into prev
  from public.snapshots
  where user_id = new.user_id and day < new.day
  order by day desc
  limit 1;

  if exists (select 1 from public.snapshots where user_id = new.user_id and day > new.day + 1) then
    update public.profiles set rewound_at = now() where id = new.user_id;
  end if;

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
  if prev.day is not null
     and (new.equity - prev.equity) > (cap + 0.25 * greatest(prev.equity, 0)) * greatest(new.day - prev.day, 1) then
    reason := format('vekst %s på %s døgn, nivå %s', new.equity - prev.equity, new.day - prev.day, new.stage);
  end if;

  if reason is not null then
    update public.profiles
    set flagged_at = now(), flag_reason = reason
    where id = new.user_id and flagged_at is null;
  end if;
  return new;
end;
$$;
revoke execute on function public.check_snapshot() from public, anon, authenticated;

drop trigger if exists snapshots_check on public.snapshots;
create trigger snapshots_check
  before insert or update on public.snapshots
  for each row execute function public.check_snapshot();

-- ------------------------------------------------------------------ topplista

-- kind: 'verdi' (konsernverdi nå), 'omdomme' (omdømme nå), 'storverk' (færrest spilldøgn til storverk),
-- 'ferdig' (færrest spilldøgn til 10 mrd.). Bare kontoer med kallenavn, som ikke er sperret eller merket.
create or replace function public.leaderboard(kind text, lim int default 50)
returns table (plass int, nickname text, value numeric, day int, is_me boolean)
language sql
security definer
set search_path = public
stable
as $$
  with ok as (
    select id, nickname
    from public.profiles
    where nickname is not null and not banned and flagged_at is null
  ),
  latest as (
    select distinct on (s.user_id) s.user_id, s.day, s.equity, s.reputation
    from public.snapshots s
    join ok on ok.id = s.user_id
    order by s.user_id, s.day desc
  ),
  rader as (
    select ok.id, ok.nickname, latest.day,
      case kind
        when 'verdi' then latest.equity::numeric
        when 'omdomme' then latest.reputation
        when 'storverk' then (select min(x.day) from public.snapshots x where x.user_id = ok.id and x.stage >= 4)::numeric
        when 'ferdig' then (select min(x.day) from public.snapshots x where x.user_id = ok.id and x.equity >= 10000000000)::numeric
      end as value
    from ok
    join latest on latest.user_id = ok.id
  )
  select
    (row_number() over (
      order by
        case when kind in ('storverk', 'ferdig') then value end asc,
        case when kind in ('verdi', 'omdomme') then value end desc,
        day asc
    ))::int as plass,
    nickname,
    value,
    day,
    id = auth.uid() as is_me
  from rader
  where value is not null
  order by plass
  limit lim;
$$;
grant execute on function public.leaderboard(text, int) to anon, authenticated;

-- Min plass på lista, også utenfor de første 50
create or replace function public.my_rank(kind text)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select plass from public.leaderboard(kind, 100000) where is_me limit 1;
$$;
revoke execute on function public.my_rank(text) from public, anon;
grant execute on function public.my_rank(text) to authenticated;
