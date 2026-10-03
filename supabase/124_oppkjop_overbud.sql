-- B-442: flere kan by i samme oppkjøpsrunde, fristen forlenges ved sene bud.
--
-- Eierens spørsmål 3.10.2026: «Om en spiller byr uten å kan reglene … Da kan jo ikke flere som faktisk har spart og er
-- klar for oppkjøp, prøve seg». Med regelsett 2 (B-441) stengte et dårlig bud alle andre ute i 72 timer, og etterpå i 14
-- dagers pause.
--
-- * Overbud (bare regelsett 2): mens et oppkjøpsbud står åpent, kan en annen spiller by minst 5 % (og minst 1 mill.)
--   over. Det sterkeste budet tar over runden; den som ble overbudt, får hele budet tilbake (hen tapte ikke mot eieren).
--   Eierens motbud står. Samme regler som for et nytt bud: ikke eieren, ikke sperret, ett åpent bud om gangen.
-- * Fristen: kommer et bud (nytt, økt eller overbud) de siste 12 timene, flyttes fristen til 12 timer fra budet, så
--   eieren rekker å svare.
-- * Pausen på 14 dager kommer først etter en runde der alle kunne by.
-- * Bud fra før B-441 (regelsett 1) avgjøres som de ble lagt inn: ingen overbud og ingen forlenget frist.
-- * takeover_bids: alle bud i runden (hvem, beløp, når) – til visningen «du ble overbudt» og til ettersyn.
--
-- world_status er patchet med replace() (overbud i runden) – den levende kroppen er den patchede.

create table if not exists public.takeover_bids (
  id bigserial primary key,
  takeover_id bigint not null references public.takeovers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric not null,
  kind text not null check (kind in ('bud', 'okt', 'overbud')),
  created_at timestamptz not null default now()
);
create index if not exists takeover_bids_takeover on public.takeover_bids (takeover_id, created_at);
create index if not exists takeover_bids_user on public.takeover_bids (user_id);
alter table public.takeover_bids enable row level security;
revoke all on public.takeover_bids from anon, authenticated;
revoke all on sequence public.takeover_bids_id_seq from anon, authenticated;

update public.config
   set value = jsonb_set(value, '{takeover}', (value -> 'takeover') || jsonb_build_object(
         'raise_step', 0.05, 'raise_min', 1000000, 'extend_hours', 12))
 where id = 'world';

-- Minste overbud: 5 % over budet som står, minst 1 mill.
create or replace function public.takeover_min_raise(p_bid numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select p_bid + greatest(public.takeover_cfg_num('raise_min', 1000000),
                          ceil(p_bid * public.takeover_cfg_num('raise_step', 0.05)));
$$;
revoke all on function public.takeover_min_raise(numeric) from public, anon, authenticated;

-- Kan spilleren by over i runden som står? null når det ikke er aktuelt (eier, den som byr, regelsett 1, stengt)
create or replace function public.takeover_compete(p_takeover bigint, p_user uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  o record;
  c record;
  reason text;
begin
  if public.takeover_cfg_num('enabled', 0) <= 0 or p_user is null then
    return null;
  end if;
  select * into o from public.takeovers where id = p_takeover and status = 'åpent';
  if o.id is null or o.rules = 1 or o.attacker_id = p_user or o.owner_id = p_user then
    return null;
  end if;
  select * into c from public.companies where id = o.company_id and active;
  if c.id is null or c.owner_id = p_user then
    return null;
  end if;
  reason := case
    when exists (select 1 from public.profiles where id = p_user and (flagged_at is not null or banned)) then 'sperret'
    when exists (select 1 from public.takeovers where attacker_id = p_user and status = 'åpent') then 'ett'
    else null end;
  return json_build_object('open', reason is null, 'reason', reason, 'min_bid', round(public.takeover_min_raise(o.bid)));
end;
$$;
revoke all on function public.takeover_compete(bigint, uuid) from public, anon, authenticated;

create or replace function public.takeover_bid(p_company integer, p_amount numeric)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  w json;
  o record;
  c record;
  bal numeric;
  amt numeric := round(coalesce(p_amount, 0));
  v_add numeric;
  kind text;
  prev uuid;
  ext timestamptz;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if public.takeover_cfg_num('enabled', 0) <= 0 then
    return json_build_object('ok', false, 'reason', 'av');
  end if;
  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_verden'));
  perform public.resolve_tenders();
  perform public.resolve_takeovers();
  select * into c from public.companies where id = p_company and active for update;
  select * into o from public.takeovers where company_id = p_company and status = 'åpent' for update;
  if o.id is not null then
    if o.attacker_id = uid then
      if amt <= o.bid then
        return json_build_object('ok', false, 'reason', 'belop');
      end if;
      v_add := amt - o.bid;
      kind := 'okt';
    else
      -- Overbud (B-442): bare i regelsett 2, ikke eieren, ett åpent bud om gangen
      if o.rules = 1 then
        return json_build_object('ok', false, 'reason', 'pagar');
      end if;
      if c.owner_id = uid or o.owner_id = uid then
        return json_build_object('ok', false, 'reason', 'eier');
      end if;
      if exists (select 1 from public.takeovers where attacker_id = uid and status = 'åpent') then
        return json_build_object('ok', false, 'reason', 'ett');
      end if;
      if amt < public.takeover_min_raise(o.bid) then
        return json_build_object('ok', false, 'reason', 'overbud', 'min_bid', round(public.takeover_min_raise(o.bid)));
      end if;
      v_add := amt;
      kind := 'overbud';
      prev := o.attacker_id;
    end if;
  else
    w := public.takeover_window(p_company, uid);
    if w is null then
      return json_build_object('ok', false, 'reason', 'eier');
    end if;
    if (w ->> 'open')::boolean is not true then
      return json_build_object('ok', false, 'reason', w ->> 'reason');
    end if;
    if amt < (w ->> 'min_bid')::numeric then
      return json_build_object('ok', false, 'reason', 'belop', 'min_bid', w ->> 'min_bid');
    end if;
    v_add := amt;
    kind := 'bud';
  end if;
  select balance into bal from public.treasury where user_id = uid for update;
  if coalesce(bal, 0) < v_add then
    return json_build_object('ok', false, 'reason', 'kasse');
  end if;
  update public.treasury set balance = balance - v_add, updated_at = now() where user_id = uid;
  if o.id is not null then
    -- Sene bud i regelsett 2 flytter fristen, så eieren rekker å svare
    ext := case when o.rules = 1 then o.closes_at
                else greatest(o.closes_at, now() + make_interval(hours => public.takeover_cfg_num('extend_hours', 12)::int)) end;
    if prev is not null then
      insert into public.treasury (user_id, balance, updated_at) values (prev, o.bid, now())
      on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      insert into public.treasury_ledger (user_id, amount, kind, ref) values (prev, o.bid, 'overtakelse', 'overbudt:' || o.id);
      update public.takeovers set attacker_id = uid, bid = amt, closes_at = ext where id = o.id;
      perform public.chat_event(format('%s byr over med %s på %s. Budet fra %s er trukket, og %s har til %s på seg til å svare.',
        public.chat_nick(uid), public.chat_kr(amt), lower(c.name), public.chat_nick(prev), public.chat_nick(o.owner_id),
        to_char(ext at time zone 'Europe/Oslo', 'DD.MM. "kl." HH24:MI')));
    else
      update public.takeovers set bid = amt, closes_at = ext where id = o.id;
    end if;
  else
    insert into public.takeovers (company_id, attacker_id, owner_id, bid, closes_at)
    values (p_company, uid, c.owner_id, amt,
            now() + make_interval(hours => public.takeover_cfg_num('defense_hours', 72)::int))
    returning * into o;
  end if;
  insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, -v_add, 'overtakelse', 'bud:' || o.id);
  insert into public.takeover_bids (takeover_id, user_id, amount, kind) values (o.id, uid, amt, kind);
  return json_build_object('ok', true, 'takeover', o.id);
end;
$$;
revoke all on function public.takeover_bid(integer, numeric) from public, anon;
grant execute on function public.takeover_bid(integer, numeric) to authenticated;

-- world_status: overbud i runden og om spilleren ble overbudt
do $$
declare
  def text := pg_get_functiondef('public.world_status()'::regprocedure);
  a text := $a$'mine_attack', o.attacker_id = uid, 'bid', o.bid, 'rules', o.rules,$a$;
begin
  if position('''compete''' in def) > 0 then
    return;
  end if;
  if position(a in def) = 0 then
    raise exception 'world_status har endret seg – patchen passer ikke';
  end if;
  def := replace(def, a, a || $b$ 'compete', public.takeover_compete(o.id, uid),
                       'outbid_me', o.attacker_id <> uid and exists (select 1 from public.takeover_bids b
                                                                      where b.takeover_id = o.id and b.user_id = uid),$b$);
  execute def;
end;
$$;
