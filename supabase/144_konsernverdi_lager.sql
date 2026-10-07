-- B-477: databasen ble «unhealthy» 7.10 kl. 17:44–17:48 UTC. Topplista «Konsernverdi» (`leaderboard('konsern')`, og
-- `my_rank`, som henter hele lista for å finne én plass) regnet `konsern_value` for hver spiller ved hvert kall – det
-- leser hele det lagrede spillet flere ganger per spiller (ca. 0,8 s per kall). Etter endringsloggen om ny rekkefølge
-- (B-475) var 26–33 slike kall i minuttet nok til å bruke opp maskinen: tidsavbrudd på world_status, save_game og lista.
--
-- Nå regnes konsernverdiene én gang i minuttet av jobben `konsernverdi` inn i `konsern_value_cache`, og topplista leser
-- derfra. Verdien på lista kan være opptil et minutt gammel; Konsern-siden regner sin egen fra world_status som før.
-- Sesongslutten (`close_season`) regner fortsatt `konsern_value` direkte.

create table if not exists public.konsern_value_cache (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  value numeric not null,
  stage smallint,
  day integer,
  eligible boolean not null default true,
  at timestamptz not null default now()
);
alter table public.konsern_value_cache enable row level security;
revoke all on public.konsern_value_cache from anon, authenticated;

create or replace function public.konsern_value_refresh()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  n integer;
begin
  -- Én om gangen; en annen kjøring som holder på, er nok
  if not pg_try_advisory_xact_lock(hashtext('stalverk_konsernverdi')) then
    return 0;
  end if;
  insert into public.konsern_value_cache (user_id, value, stage, day, eligible, at)
  select p.id, round(public.konsern_value(p.id)), (sv.state ->> 'stage')::smallint, sv.day, true, now()
  from public.profiles p
  join public.saves sv on sv.user_id = p.id
  where p.nickname is not null and not p.banned and p.flagged_at is null
    and coalesce((sv.state ->> 'stage')::int, 0) >= 4
    and coalesce((sv.state -> 'konsern' ->> 'unlocked')::boolean, false)
  on conflict (user_id) do update
    set value = excluded.value, stage = excluded.stage, day = excluded.day, eligible = true, at = excluded.at;
  get diagnostics n = row_count;
  -- Den som ikke lenger hører hjemme på lista (sperret, flagget, uten konsern), tas av uten å slette raden
  update public.konsern_value_cache set eligible = false where eligible and at < now();
  return n;
end;
$function$;
revoke all on function public.konsern_value_refresh() from public, anon, authenticated;

select public.konsern_value_refresh();

-- Topplista leser lageret i stedet for å regne verdien for alle ved hvert kall
do $do$
declare
  d text := pg_get_functiondef('public.leaderboard(text,integer,integer)'::regprocedure);
  o text := d;
begin
  d := replace(d, $a$sv.day, coalesce((sv.state ->> 'stage')::smallint, r.best_stage) as stage,$a$,
                  $a$kv.day, coalesce(kv.stage, r.best_stage) as stage,$a$);
  d := replace(d, $a$round(public.konsern_value(ok.id)) as value,$a$, $a$kv.value as value,$a$);
  d := replace(d, $a$join public.saves sv on sv.user_id = ok.id
    left join public.records r on r.user_id = ok.id
    where kind = 'konsern'
      and coalesce((sv.state ->> 'stage')::int, 0) >= 4
      and coalesce((sv.state -> 'konsern' ->> 'unlocked')::boolean, false)$a$,
                  $a$join public.konsern_value_cache kv on kv.user_id = ok.id and kv.eligible
    left join public.records r on r.user_id = ok.id
    where kind = 'konsern'$a$);
  if d = o or position('konsern_value(ok.id)' in d) > 0 or position('konsern_value_cache kv' in d) = 0
     or position('coalesce(kv.stage' in d) = 0 then
    raise exception 'leaderboard: ikke alle bitene ble byttet';
  end if;
  execute d;
end;
$do$;

select cron.schedule('konsernverdi', '* * * * *', $$select public.konsern_value_refresh()$$);
