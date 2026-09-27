-- B-183: konsernkassa på serveren (fase 1A i RETNING.md). Kjørt som migrasjonen «konsernkasse».
--
-- Spillet ditt går i spilltid (pause til 10×); verden rundt går i ekte tid. Kassa i verden (konsernkassa) ligger derfor
-- på serveren, i kroner – ingen ny valuta. Den skal betale strategiske selskaper, anbud og overtakelser, og ta imot
-- inntekt fra selskapene (fase 1B og senere). Ingenting i spillet viser den ennå.
--
-- Penger flyttes fra spillet inn i kassa med deposit_to_treasury(), og bare i et begrenset tempo per ekte døgn
-- (rullerende 24 timer). Grensen vokser svært lite med rikdommen: grunnbeløp × (1 + trinn × log10(egenkapital / 1 mrd.)),
-- minst grunnbeløpet. Med 100 mill. og trinn 0,5: 1 mrd. → 100 mill., 10 mrd. → 150 mill., 100 mrd. → 200 mill.,
-- 1 000 mrd. → 250 mill. Da gir verken 10× eller en enorm kasse noe stort forsprang i verden.
--
-- Overføringen skjer helt på serveren i én transaksjon: kassa i det lagrede spillet går ned, `treasuryOut` (sum flyttet)
-- går opp, og konsernkassa går opp. Appen må ha lagret først (versjonen må stemme), og gjør så det samme med spillet
-- sitt. En sperre på `saves` sørger for at `treasuryOut` aldri går ned igjen: skrives et eldre spill over (en annen
-- nettleser, en tilbakerulling, juks), trekkes det som alt er flyttet, fra kassa i spillet. Pengene kan ikke dobles.

insert into public.config (id, value)
values ('world', '{"treasury_base_per_day": 100000000, "treasury_log_step": 0.5}')
on conflict (id) do update set value = excluded.value || public.config.value;

create table if not exists public.treasury (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance numeric not null default 0 check (balance >= 0),
  -- Alt som er flyttet inn fra spillet (skal være lik `treasuryOut` i spillet)
  deposited_total numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.treasury enable row level security;
drop policy if exists "konsernkasse: les egen" on public.treasury;
create policy "konsernkasse: les egen" on public.treasury for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.treasury_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now(),
  amount numeric not null,
  kind text not null check (kind in ('innskudd', 'anbud', 'refusjon', 'inntekt', 'utbetaling', 'justering')),
  ref text
);
create index if not exists treasury_ledger_user_at on public.treasury_ledger (user_id, at desc);
alter table public.treasury_ledger enable row level security;
drop policy if exists "konsernkasse: les egne posteringer" on public.treasury_ledger;
create policy "konsernkasse: les egne posteringer" on public.treasury_ledger for select to authenticated
  using (user_id = (select auth.uid()));

-- Grensen per ekte døgn for en egenkapital
create or replace function public.treasury_limit(p_equity numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select round(coalesce((value->>'treasury_base_per_day')::numeric, 100000000)
    * (1 + coalesce((value->>'treasury_log_step')::numeric, 0.5) * log(greatest(1, coalesce(p_equity, 0) / 1e9))))
  from public.config where id = 'world';
$$;
revoke execute on function public.treasury_limit(numeric) from public, anon, authenticated;

-- Status for spilleren selv: saldo, grensen, brukt siste 24 timer og når mer blir ledig
create or replace function public.treasury_status()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  eq numeric;
  lim numeric;
  used numeric;
  bal numeric;
  freed timestamptz;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  select coalesce((state->>'cash')::numeric, 0) - coalesce((state->>'loan')::numeric, 0) into eq
  from public.saves where user_id = uid;
  eq := greatest(coalesce(eq, 0), coalesce((select equity from public.snapshots where user_id = uid order by at desc limit 1), 0));
  lim := public.treasury_limit(eq);
  select coalesce(sum(amount), 0), min(at) + interval '24 hours' into used, freed
  from public.treasury_ledger where user_id = uid and kind = 'innskudd' and at > now() - interval '24 hours';
  select balance into bal from public.treasury where user_id = uid;
  return json_build_object('balance', coalesce(bal, 0), 'limit', lim, 'used', used,
    'left', greatest(0, lim - used), 'freed_at', freed);
end;
$$;
revoke execute on function public.treasury_status() from public, anon;
grant execute on function public.treasury_status() to authenticated;

-- Flytt penger fra spillet til konsernkassa. p_base_rev er versjonen appen sist lagret (den må stemme).
create or replace function public.deposit_to_treasury(p_amount numeric, p_base_rev bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s record;
  amt numeric := floor(coalesce(p_amount, 0));
  cash numeric;
  loan numeric;
  eq numeric;
  lim numeric;
  used numeric;
  new_rev bigint;
  bal numeric;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if amt <= 0 then
    return json_build_object('ok', false, 'reason', 'belop');
  end if;
  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  select * into s from public.saves where user_id = uid for update;
  if s.user_id is null or s.rev is distinct from p_base_rev then
    return json_build_object('ok', false, 'reason', 'lagre_forst');
  end if;
  if coalesce((s.state->>'stage')::int, 0) < 4 or coalesce((s.state->'konsern'->>'unlocked')::boolean, false) = false then
    return json_build_object('ok', false, 'reason', 'konsern');
  end if;
  cash := coalesce((s.state->>'cash')::numeric, 0);
  loan := coalesce((s.state->>'loan')::numeric, 0);
  -- Bare egne penger: ikke det som er lånt
  if amt > cash - loan then
    return json_build_object('ok', false, 'reason', 'kasse');
  end if;
  -- Én overføring om gangen per spiller, så to samtidige ikke begge ser samme «brukt»
  perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || uid::text));
  eq := greatest(cash - loan, coalesce((select equity from public.snapshots where user_id = uid order by at desc limit 1), 0));
  lim := public.treasury_limit(eq);
  select coalesce(sum(amount), 0) into used
  from public.treasury_ledger where user_id = uid and kind = 'innskudd' and at > now() - interval '24 hours';
  if used + amt > lim then
    return json_build_object('ok', false, 'reason', 'grense', 'left', greatest(0, lim - used));
  end if;

  update public.saves
  set state = jsonb_set(jsonb_set(state, '{cash}', to_jsonb(cash - amt)), '{treasuryOut}',
                        to_jsonb(coalesce((state->>'treasuryOut')::numeric, 0) + amt)),
      device = 'server'
  where user_id = uid
  returning rev into new_rev;

  insert into public.treasury (user_id, balance, deposited_total, updated_at)
  values (uid, amt, amt, now())
  on conflict (user_id) do update
    set balance = public.treasury.balance + amt, deposited_total = public.treasury.deposited_total + amt,
        updated_at = now()
  returning balance into bal;
  insert into public.treasury_ledger (user_id, amount, kind) values (uid, amt, 'innskudd');

  return json_build_object('ok', true, 'rev', new_rev, 'amount', amt, 'balance', bal, 'left', lim - used - amt);
end;
$$;
revoke execute on function public.deposit_to_treasury(numeric, bigint) from public, anon;
grant execute on function public.deposit_to_treasury(numeric, bigint) to authenticated;

-- Sperren: det som er flyttet til konsernkassa, kan ikke komme tilbake i spillet
create or replace function public.guard_treasury_out()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  total numeric;
  mine numeric;
begin
  select deposited_total into total from public.treasury where user_id = new.user_id;
  if total is null or total <= 0 then
    return new;
  end if;
  mine := coalesce((new.state->>'treasuryOut')::numeric, 0);
  if mine < total then
    new.state := jsonb_set(jsonb_set(new.state, '{cash}',
                   to_jsonb(coalesce((new.state->>'cash')::numeric, 0) - (total - mine))),
                   '{treasuryOut}', to_jsonb(total));
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_treasury_out() from public, anon, authenticated;

drop trigger if exists saves_guard_treasury on public.saves;
create trigger saves_guard_treasury
  before insert or update on public.saves
  for each row execute function public.guard_treasury_out();
