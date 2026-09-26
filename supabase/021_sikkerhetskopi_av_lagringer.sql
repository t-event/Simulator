-- B-169: sikkerhetskopi av spillene på nett, så et spill kan rulles tilbake om noe uforutsett skjer (feil i koden,
-- ny start ved et uhell, rar synkronisering). Serveren tar kopien selv; spillerne kan ikke lese dem eller bruke dem
-- (ingen policy, og tatt fra anon og authenticated), så de kan ikke brukes til juks (se B-135). Tilbakerulling gjøres av
-- utvikleren med restore_save().
--
-- Når tas det kopi (av spillet slik det var før det blir overskrevet)?
-- - første lagring hver dag (norsk tid), og
-- - når et spill som har kommet langt, erstattes av et med mye lavere dag (ny start, eller en gammel lagring), som
--   det som skjedde med et storverk i Sesong 1 (B-168).
-- Kopier eldre enn 14 dager slettes når spilleren lagrer, så ingen planlagt jobb trengs. Kopiene slettes med kontoen.

create table if not exists public.save_backups (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  taken_at timestamptz not null default now(),
  reason text not null,
  day integer not null,
  rev bigint,
  season_id integer,
  state jsonb not null
);
create index if not exists save_backups_user_taken on public.save_backups (user_id, taken_at desc);

alter table public.save_backups enable row level security;
revoke all on table public.save_backups from anon, authenticated;

create or replace function public.backup_save()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Europe/Oslo')::date;
  why text;
begin
  if not exists (
    select 1 from public.save_backups b
    where b.user_id = old.user_id and (b.taken_at at time zone 'Europe/Oslo')::date = today
  ) then
    why := 'daglig';
  end if;
  -- Et spill som har kommet langt, erstattes av et med mye lavere dag: ta vare på det gamle uansett
  if old.day > 5 and new.day < old.day - 2 then
    why := 'lavere dag';
  end if;
  if why is not null then
    insert into public.save_backups (user_id, reason, day, rev, season_id, state)
    values (old.user_id, why, old.day, old.rev, old.season_id, old.state);
    delete from public.save_backups
    where user_id = old.user_id and taken_at < now() - interval '14 days';
  end if;
  return new;
end;
$$;
revoke execute on function public.backup_save() from public, anon, authenticated;

drop trigger if exists saves_backup on public.saves;
create trigger saves_backup
  before update on public.saves
  for each row
  when (old.state is distinct from new.state)
  execute function public.backup_save();

-- Rulle tilbake (bare fra SQL Editor eller connectoren): legger kopien inn som spillet på nett. Versjonen øker, og
-- `device` settes, så appen til spilleren henter det. Spillet slik det var, tas vare på av triggeren over først.
--   select id, taken_at, reason, day from public.save_backups
--     where user_id = (select id from public.profiles where nickname = 'Navn') order by taken_at desc;
--   select public.restore_save(<id>);
create or replace function public.restore_save(p_backup bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
  new_rev bigint;
begin
  select * into b from public.save_backups where id = p_backup;
  if b.id is null then
    raise exception 'Fant ingen sikkerhetskopi med id %', p_backup;
  end if;
  update public.saves
  set state = b.state,
      day = b.day,
      minute = coalesce((b.state->>'minute')::numeric, 0)::int,
      season_id = b.season_id,
      device = 'gjenopprettet',
      updated_at = now()
  where user_id = b.user_id
  returning rev into new_rev;
  return new_rev;
end;
$$;
revoke execute on function public.restore_save(bigint) from public, anon, authenticated;
