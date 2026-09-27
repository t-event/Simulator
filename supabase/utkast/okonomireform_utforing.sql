-- Økonomireformen, modell B – UTFØRING (B-184). IKKE KJØRT. Kjøres bare etter eierens uttrykkelige «go».
-- Rekkefølgen er fast (B-180): 1. fersk dry-run (okonomireform_dryrun.sql), 2. sikkerhetskopi, 3. endring,
-- 4. kontroll av resultatet. Alt i én transaksjon: feiler kontrollen, rulles alt tilbake.
--
-- Modell B: under 50 mill. er kassa uendret. Over: ny kasse = 50 mill. × (kasse / 50 mill.)^0,45.
-- Bare kassa endres. Lån, verk, forskning, fagpoeng og Hall of Fame (records) står. `device` = 'server' og ny versjon,
-- så appen til spilleren henter spillet (som ved tilbakerulling, B-168/B-169). Sikkerhetskopien kan legges tilbake med
-- restore_save(<id>).

begin;

-- 2. Sikkerhetskopi av alle spill som endres (grunn: 'okonomireform')
insert into public.save_backups (user_id, reason, day, rev, season_id, state)
select user_id, 'okonomireform', day, rev, season_id, state
from public.saves
where (state->>'cash')::numeric > 50000000;

-- Logg over hva som ble endret, til kontrollen og til en eventuell forklaring til spillerne
create table if not exists public.economy_reform_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now(),
  model text not null,
  old_cash numeric not null,
  new_cash numeric not null,
  primary key (user_id, at)
);
alter table public.economy_reform_log enable row level security;

insert into public.economy_reform_log (user_id, model, old_cash, new_cash)
select user_id, 'B', (state->>'cash')::numeric,
       round(50000000 * power((state->>'cash')::numeric / 50000000, 0.45))
from public.saves
where (state->>'cash')::numeric > 50000000;

-- 3. Endringen
update public.saves s
set state = jsonb_set(s.state, '{cash}', to_jsonb(l.new_cash)), device = 'server'
from public.economy_reform_log l
where l.user_id = s.user_id and l.at = now();

-- 4. Kontroll: hvert endret spill har en kopi fra i dag, kassa er den nye, og rekkefølgen er den samme som før
do $$
declare bad int;
begin
  select count(*) into bad
  from public.economy_reform_log l
  join public.saves s on s.user_id = l.user_id
  where l.at = now()
    and ((s.state->>'cash')::numeric <> l.new_cash
         or not exists (select 1 from public.save_backups b
                        where b.user_id = l.user_id and b.reason = 'okonomireform' and b.taken_at = now()));
  if bad > 0 then
    raise exception 'Kontrollen feilet for % spill – ingenting er endret', bad;
  end if;
  select count(*) into bad from (
    select l.user_id,
           rank() over (order by l.old_cash desc) as r_old,
           rank() over (order by l.new_cash desc) as r_new
    from public.economy_reform_log l where l.at = now()) x
  where r_old <> r_new;
  if bad > 0 then
    raise exception 'Rekkefølgen mellom spillerne endret seg – ingenting er endret';
  end if;
end $$;

-- Vis resultatet før commit
select p.nickname, round(l.old_cash / 1e9, 3) as gammel_mrd, round(l.new_cash / 1e9, 3) as ny_mrd
from public.economy_reform_log l join public.profiles p on p.id = l.user_id
where l.at = now() order by l.old_cash desc;

commit;
