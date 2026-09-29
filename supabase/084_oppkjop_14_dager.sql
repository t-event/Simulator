-- Stålverket: den som kjøper et selskap ved oppkjøp, eier det i 14 dager fra kjøpet (B-372), ikke bare resten av
-- konsesjonen. Vernet for ny eier (3 dager) og pausen etter et oppkjøpsforsøk (14 dager) er som før, men serveren sier nå
-- selv til når ingen kan legge inn oppkjøpsbud (`protected_until` i company_control), så appen viser riktig tid.

create or replace function public.resolve_takeovers()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  c record;
  att numeric;
  def numeric;
  won boolean;
  to_owner numeric;
  back numeric;
  back_fund numeric;
  new_until timestamptz;
begin
  for o in select * from public.takeovers where status = 'åpent' and closes_at <= now() order by closes_at for update loop
    select * into c from public.companies where id = o.company_id for update;
    att := public.takeover_attack(o.id);
    def := public.takeover_defense(o.id);
    if c.owner_id is distinct from o.owner_id then
      update public.takeovers set status = 'avbrutt', resolved_at = now(), attack_score = att, defense_score = def
      where id = o.id;
      insert into public.treasury (user_id, balance, updated_at) values (o.attacker_id, o.bid, now())
      on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      insert into public.treasury_ledger (user_id, amount, kind, ref) values (o.attacker_id, o.bid, 'overtakelse', 'avbrutt:' || o.id);
      if o.defense - o.defense_fund > 0 then
        insert into public.treasury (user_id, balance, updated_at) values (o.owner_id, o.defense - o.defense_fund, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      end if;
      update public.konsern set fund = fund + o.defense_fund, updated_at = now() where user_id = o.owner_id and o.defense_fund > 0;
      continue;
    end if;
    won := att > def;
    back := round((o.defense - o.defense_fund) * public.takeover_cfg_num('defense_refund', 0.95));
    back_fund := round(o.defense_fund * public.takeover_cfg_num('defense_refund', 0.95));
    if back > 0 then
      insert into public.treasury (user_id, balance, updated_at) values (o.owner_id, back, now())
      on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      insert into public.treasury_ledger (user_id, amount, kind, ref) values (o.owner_id, back, 'overtakelse', 'forsvar tilbake:' || o.id);
    end if;
    if back_fund > 0 then
      update public.konsern set fund = fund + back_fund, updated_at = now() where user_id = o.owner_id;
    end if;
    if won then
      to_owner := round(o.bid * public.takeover_cfg_num('to_owner', 0.85));
      insert into public.treasury (user_id, balance, updated_at) values (o.owner_id, to_owner, now())
      on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      insert into public.treasury_ledger (user_id, amount, kind, ref) values (o.owner_id, to_owner, 'overtakelse', 'solgt:' || o.id);
      -- B-372: 14 dager fra kjøpet. Har neste eier alt vunnet et anbud (eller et anbud er åpent), står den datoen.
      if exists (select 1 from public.company_owners where company_id = o.company_id and from_at > now())
         or exists (select 1 from public.tenders where company_id = o.company_id and status = 'åpent') then
        new_until := c.concession_until;
      else
        new_until := greatest(c.concession_until,
                              now() + make_interval(days => coalesce((select (value->>'concession_days')::int
                                                                      from public.config where id = 'world'), 14)));
      end if;
      update public.company_owners set until_at = now()
      where company_id = o.company_id and user_id = o.owner_id and from_at <= now() and until_at > now();
      insert into public.company_owners (company_id, user_id, from_at, until_at, tender_id)
      values (o.company_id, o.attacker_id, now(), new_until, null);
      update public.companies set owner_id = o.attacker_id, concession_until = new_until where id = o.company_id;
    else
      back := round(o.bid * public.takeover_cfg_num('fail_refund', 0.9));
      insert into public.treasury (user_id, balance, updated_at) values (o.attacker_id, back, now())
      on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      insert into public.treasury_ledger (user_id, amount, kind, ref) values (o.attacker_id, back, 'overtakelse', 'avverget:' || o.id);
    end if;
    update public.takeovers set status = case when won then 'overtatt' else 'avverget' end, resolved_at = now(),
      attack_score = round(att, 1), defense_score = round(def, 1)
    where id = o.id;
  end loop;
end;
$$;
revoke execute on function public.resolve_takeovers() from public, anon, authenticated;

-- Til når ingen kan legge inn oppkjøpsbud på selskapet: vernet for ny eier, pausen etter et forsøk, eller resten av
-- konsesjonen når den er nær slutten. Samme regler som takeover_window (068). Null hvis bud er mulig nå.
create or replace function public.company_protected_until(p_company integer)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c record;
  since timestamptz;
  v timestamptz;
begin
  select * into c from public.companies where id = p_company;
  if c.id is null or c.owner_id is null then
    return null;
  end if;
  select max(from_at) into since from public.company_owners
  where company_id = p_company and user_id = c.owner_id and from_at <= now();
  v := greatest(
    since + make_interval(days => public.takeover_cfg_num('protect_days', 3)::int),
    (select max(resolved_at) from public.takeovers where company_id = p_company and status in ('overtatt', 'avverget'))
      + make_interval(days => public.takeover_cfg_num('cooldown_days', 14)::int));
  if c.concession_until is not null
     and coalesce(v, now()) >= c.concession_until - make_interval(days => public.takeover_cfg_num('last_days', 5)::int) then
    v := c.concession_until;
  end if;
  return case when v > now() then v end;
end;
$$;
revoke execute on function public.company_protected_until(integer) from public, anon, authenticated;

do $$
declare
  def text;
begin
  def := pg_get_functiondef('public.company_control'::regproc);
  if position('''protected_until''' in def) > 0 then
    return;
  end if;
  def := replace(def, '''since'', run_start);', '''since'', run_start, ''protected_until'', public.company_protected_until(p_company));');
  if position('''protected_until''' in def) = 0 then
    raise exception 'fant ikke stedet i company_control';
  end if;
  execute def;
end;
$$;

-- Pausen på 14 dager gjelder bare når eieren beholdt selskapet (avverget). Etter et oppkjøp har den nye eieren det vanlige
-- vernet på 3 dager (B-372, eierens ønske) – ellers ville pausen vernet den nye eieren hele perioden.
do $$
declare
  f text;
  def text;
begin
  foreach f in array array['takeover_window', 'company_protected_until'] loop
    def := pg_get_functiondef(('public.' || f)::regproc);
    def := replace(def, 'status in (''overtatt'', ''avverget'')', 'status = ''avverget''');
    if def ~ 'status in \(''overtatt'', ''avverget''\)' then
      raise exception 'fant ikke pausen i %', f;
    end if;
    execute def;
  end loop;
end;
$$;
