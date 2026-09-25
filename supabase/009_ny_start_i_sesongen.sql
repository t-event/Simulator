-- Stålverket: ny start i samme sesong, og «Alle tider» viser det beste (B-141). Kjørt som migrasjonen
-- «ny_start_i_sesongen».
--
-- Starter spilleren på nytt i en sesong (konkurs, «Start nytt spill», «Start sesongen» igjen), kommer tidslinja
-- tilbake til dag 1. Før ble radene fra det gamle spillet liggende, og topplista viste det gamle spillet til det nye
-- hadde kommet like langt. Nå slettes radene med høyere dag i samme sesong når en lavere dag kommer inn.
-- En ny start (dag 1–2) merkes ikke som tilbakespoling; det gjør bare en eldre lagring senere i spillet.

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
  -- Rader fra et senere tidspunkt i samme sesong hører til et spill som er erstattet: de fjernes
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

  select day, equity into prev
  from public.snapshots
  where user_id = new.user_id and day < new.day
    and (season_id is not distinct from new.season_id)
  order by day desc
  limit 1;

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

  update public.profiles set league = public.league_of(new.stage, new.equity) where id = new.user_id;
  return new;
end;
$$;

-- Topplista: i en sesong gjelder det siste døgnet. På «Alle tider» gjelder spillerens beste døgn for konsernverdi og
-- omdømme, uansett spill og sesong.
create or replace function public.leaderboard(kind text, lim int default 50, season int default null)
returns table (plass int, nickname text, value numeric, day int, is_me boolean, league text, stage smallint)
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
    select distinct on (s.user_id) s.user_id, s.day, s.equity, s.reputation, s.stage
    from public.snapshots s
    join ok on ok.id = s.user_id
    where season is null or s.season_id = season
    order by s.user_id,
      case when season is null then (case kind when 'omdomme' then s.reputation else s.equity::numeric end) end
        desc nulls last,
      s.day desc
  ),
  rader as (
    select ok.id, ok.nickname, latest.day, latest.stage, public.league_of(latest.stage, latest.equity) as league,
      case kind
        when 'verdi' then latest.equity::numeric
        when 'omdomme' then latest.reputation
        when 'storverk' then (select min(x.day) from public.snapshots x
                               where x.user_id = ok.id and x.stage >= 4 and (season is null or x.season_id = season))::numeric
        when 'ferdig' then (select min(x.day) from public.snapshots x
                             where x.user_id = ok.id and x.equity >= 10000000000 and (season is null or x.season_id = season))::numeric
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
    id = auth.uid() as is_me,
    league,
    stage
  from rader
  where value is not null
  order by plass
  limit lim;
$$;
