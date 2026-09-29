-- B-343: verdensoppdateringen (world_tick) uten kø.
-- world_status() kjørte world_tick() hver gang, og world_tick ventet på en lås (pg_advisory_xact_lock). Med flere apper
-- åpne samtidig sto kallene i kø: world_status tok opptil 7,7 s (snitt 0,24 s), og lagringen ventet på de samme radene.
-- Nå: world_tick kjøres høyst én gang per 30 sekunder (world_tick_state), og hopper over i stedet for å vente når en annen
-- transaksjon holder på (pg_try_advisory_xact_lock). Fristene er i timer og dager, så 30 s forsinkelse merkes ikke.
-- Selve arbeidet (anbud, overtakelser, inntekt, utbytte, bidrag, nye anbud) er uendret.

create table if not exists public.world_tick_state (
  id int primary key check (id = 1),
  last_at timestamptz not null default 'epoch'
);
insert into public.world_tick_state (id) values (1) on conflict (id) do nothing;
alter table public.world_tick_state enable row level security;
revoke all on public.world_tick_state from anon, authenticated;

create or replace function public.world_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  hours int;
  gap int;
begin
  -- En annen app oppdaterer verden akkurat nå: den gjør jobben, vi venter ikke
  if not pg_try_advisory_xact_lock(hashtext('stalverk_verden')) then
    return;
  end if;
  select coalesce((value->>'tick_seconds')::int, 30) into gap from public.config where id = 'world';
  update public.world_tick_state set last_at = now()
  where id = 1 and last_at <= now() - make_interval(secs => gap);
  if not found then
    return;
  end if;
  select coalesce((value->>'tender_hours')::int, 48) into hours from public.config where id = 'world';
  perform public.resolve_tenders();
  perform public.resolve_takeovers();
  perform public.pay_company_income();
  perform public.pay_dividends();
  perform public.pay_contributions();
  for c in select * from public.companies where active loop
    if not exists (select 1 from public.tenders where company_id = c.id and status = 'åpent')
       and (c.concession_until is null or c.concession_until - make_interval(hours => hours) <= now())
       and not exists (select 1 from public.company_owners where company_id = c.id and from_at > now()) then
      perform public.open_tender(c.id, now());
    end if;
  end loop;
end;
$$;
revoke execute on function public.world_tick() from public, anon, authenticated;
