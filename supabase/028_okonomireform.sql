-- B-186: økonomireformen, utført 2026-09-27 etter eierens «go» (B-181, B-184). Kjørt som migrasjonen «okonomireform».
--
-- Modell (justert etter eierens ønske): små spill skal ikke få et merkbart kutt bare fordi de akkurat har passert en
-- grense. Derfor et urørt gulv på 250 mill.: kassa under er uendret. Over: ny kasse = 250 mill. × (kasse / 250 mill.)^0,365.
-- Eksponenten er valgt så toppen blir som i modell B (k = 0,45 over 50 mill.): Grane 8 286 → 11,17 mrd. (B: 11,16).
-- Rekkefølgen beholdes. Bare kassa endres; lån, verk, forskning, fagpoeng og Hall of Fame (records) står.
--
-- Rekkefølgen (B-180): 1. fersk dry-run (vist eieren), 2. ekstra sikkerhetskopi – både i `save_backups` (kan legges
-- tilbake med restore_save, men slettes etter 14 dager) og for alltid i `economy_reform_log.old_state`, 3. endring med
-- ny versjon og `device = 'server'` så appen henter spillet (B-168), 4. kontroll. Alt i én blokk: feiler kontrollen,
-- rulles alt tilbake.
--
-- Rulle tilbake én spiller: update public.saves set state = l.old_state, device = 'server'
--   from public.economy_reform_log l where l.user_id = saves.user_id and saves.user_id = '<id>';

create table if not exists public.economy_reform_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now(),
  model text not null,
  old_cash numeric not null,
  new_cash numeric not null,
  old_state jsonb not null,
  primary key (user_id, at)
);
alter table public.economy_reform_log enable row level security;
-- Ingen regler: bare utvikleren leser den

do $$
declare
  floor_cash constant numeric := 250000000;
  k constant numeric := 0.365;
  bad int;
  n int;
begin
  if exists (select 1 from public.economy_reform_log) then
    raise exception 'Reformen er alt kjørt';
  end if;

  -- 2. Sikkerhetskopi
  insert into public.save_backups (user_id, reason, day, rev, season_id, state)
  select user_id, 'okonomireform', day, rev, season_id, state
  from public.saves where (state->>'cash')::numeric > floor_cash;

  insert into public.economy_reform_log (user_id, model, old_cash, new_cash, old_state)
  select user_id, 'gulv 250 mill., k 0,365', (state->>'cash')::numeric,
         round(floor_cash * power((state->>'cash')::numeric / floor_cash, k)), state
  from public.saves where (state->>'cash')::numeric > floor_cash;
  get diagnostics n = row_count;

  -- 3. Endringen
  update public.saves s
  set state = jsonb_set(s.state, '{cash}', to_jsonb(l.new_cash)), device = 'server'
  from public.economy_reform_log l
  where l.user_id = s.user_id;

  -- 4. Kontroll: ny kasse, kopi finnes, samme rekkefølge, ingen under gulvet er rørt
  select count(*) into bad
  from public.economy_reform_log l join public.saves s on s.user_id = l.user_id
  where (s.state->>'cash')::numeric <> l.new_cash
     or l.new_cash >= l.old_cash
     or l.new_cash < floor_cash
     or not exists (select 1 from public.save_backups b
                    where b.user_id = l.user_id and b.reason = 'okonomireform');
  if bad > 0 then
    raise exception 'Kontrollen feilet for % spill – ingenting er endret', bad;
  end if;
  select count(*) into bad from (
    select rank() over (order by old_cash desc) r1, rank() over (order by new_cash desc) r2
    from public.economy_reform_log) x
  where r1 <> r2;
  if bad > 0 then
    raise exception 'Rekkefølgen endret seg – ingenting er endret';
  end if;
  if exists (select 1 from public.saves s
             where (s.state->>'cash')::numeric <= floor_cash and s.device = 'server'
               and not exists (select 1 from public.economy_reform_log l where l.user_id = s.user_id)) then
    raise exception 'Et spill under gulvet ble endret – ingenting er endret';
  end if;
  raise notice 'Økonomireformen: % spill endret', n;
end $$;
