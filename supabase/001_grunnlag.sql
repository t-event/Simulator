-- Stålverket: grunnlaget for konto og lagring på nett (B-125, fase 0 og 1).
-- Kjørt i prosjektet som migrasjonen «grunnlag_konto_og_lagring» (økt 71). Kan kjøres flere ganger.

-- ------------------------------------------------------------------ tabeller

-- Én profil per konto. Kallenavn og liga kommer i fase 2 og 3.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text unique,
  league text,
  banned boolean not null default false,
  created_at timestamptz not null default now()
);

-- Spillet til kontoen (ett per konto).
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  day integer not null,
  minute integer not null,
  client_version text,
  updated_at timestamptz not null default now(),
  constraint saves_state_size check (pg_column_size(state) < 4000000)
);

-- Tidslinja: én linje per spilldøgn. Grunnlag for toppliste og juksesperre.
create table if not exists public.snapshots (
  user_id uuid not null references auth.users (id) on delete cascade,
  day integer not null,
  cash bigint not null,
  equity bigint not null,
  stage smallint not null,
  client_version text,
  at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Funksjonsbrytere som appen leser ved start. Kan endres uten ny publisering.
create table if not exists public.config (
  id text primary key,
  value jsonb not null
);
insert into public.config (id, value) values ('features', '{"cloud": true}') on conflict (id) do nothing;

-- ------------------------------------------------------------------ automatikk

-- Profil opprettes når en konto opprettes.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at settes av databasen, ikke av appen.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saves_set_updated_at on public.saves;
create trigger saves_set_updated_at
  before insert or update on public.saves
  for each row execute function public.set_updated_at();

-- Spilleren kan slette kontoen sin selv. Alt annet slettes med den (on delete cascade).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;

-- ------------------------------------------------------------------ tilgang

alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.snapshots enable row level security;
alter table public.config enable row level security;

drop policy if exists "profil: les egen" on public.profiles;
create policy "profil: les egen" on public.profiles
  for select to authenticated using (id = auth.uid());
drop policy if exists "profil: endre egen" on public.profiles;
create policy "profil: endre egen" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "spill: eget" on public.saves;
create policy "spill: eget" on public.saves
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "tidslinje: les egen" on public.snapshots;
create policy "tidslinje: les egen" on public.snapshots
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "tidslinje: skriv egen" on public.snapshots;
create policy "tidslinje: skriv egen" on public.snapshots
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "tidslinje: oppdater egen" on public.snapshots;
create policy "tidslinje: oppdater egen" on public.snapshots
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "config: alle leser" on public.config;
create policy "config: alle leser" on public.config
  for select to anon, authenticated using (true);
