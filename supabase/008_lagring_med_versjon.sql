-- Stålverket: lagring på nett med versjon, så to nettlesere ikke skriver over hverandre (B-140).
-- Kjørt som migrasjonen «lagring_med_versjon».
--
-- Hver lagring får et versjonsnummer (rev) og en merkelapp for nettleseren (device). Appen lagrer med
-- save_game(), som bare skriver hvis versjonen på nett er den appen kjenner. Er spillet lagret fra en annen
-- nettleser i mellomtiden, skrives ingenting, og appen henter det nyeste i stedet.

alter table public.saves add column if not exists rev bigint not null default 0;
alter table public.saves add column if not exists device text;
-- Spill som finnes fra før, får versjon 1 (0 betyr «ingen lagring på nett ennå»)
update public.saves set rev = 1 where rev = 0;

-- Versjonen øker ved hver lagring, også fra eldre utgaver av appen som skriver rett i tabellen
create or replace function public.bump_save_rev()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.rev := old.rev + 1;
  else
    new.rev := 1;
  end if;
  return new;
end;
$$;

drop trigger if exists saves_bump_rev on public.saves;
create trigger saves_bump_rev
  before insert or update on public.saves
  for each row execute function public.bump_save_rev();

-- Lagrer spillet hvis versjonen på nett er p_base_rev (0: ingen lagring ennå). Gir den nye versjonen,
-- eller null hvis spillet på nett er endret i mellomtiden. Kjører som spilleren selv (RLS gjelder).
create or replace function public.save_game(
  p_state jsonb,
  p_minute int,
  p_day int,
  p_client_version text,
  p_season_id int,
  p_device text,
  p_base_rev bigint
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  r bigint;
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  update public.saves
  set state = p_state, minute = p_minute, day = p_day, client_version = p_client_version,
      season_id = p_season_id, device = p_device
  where user_id = auth.uid() and rev = p_base_rev
  returning rev into r;
  if r is not null then
    return r;
  end if;
  if exists (select 1 from public.saves where user_id = auth.uid()) then
    return null;
  end if;
  insert into public.saves (user_id, state, minute, day, client_version, season_id, device)
  values (auth.uid(), p_state, p_minute, p_day, p_client_version, p_season_id, p_device)
  returning rev into r;
  return r;
end;
$$;
revoke execute on function public.save_game(jsonb, int, int, text, int, text, bigint) from public, anon;
grant execute on function public.save_game(jsonb, int, int, text, int, text, bigint) to authenticated;
