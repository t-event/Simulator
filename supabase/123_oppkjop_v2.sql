-- B-441: nye regler for oppkjøp (regelsett 2). Eierens beslutning 2.10.2026, etter simuleringen i B-440
-- (`npx tsx src/game/takeoverSim.ts`):
--
-- 1. Vinneren betaler sitt bud. Eierens vinnende motbud brukes opp – uten automatisk investering eller ekstra Kontroll.
-- 2. Begge får samme vilkår ved tap: den som taper, får 75 % tilbake (tapsgebyret på 25 % går til ingen).
-- 3. Samme pengebeløp gir samme styrke: motbudet teller som budet (60 × √(beløp / V)), inntil 5 × V. Kontrollen gir
--    høyst 20 poeng (Kontroll 100 = 20). Beredskapsfondet teller bare når det brukes som motbud, og koster da som penger.
-- 4. 14 dagers pause etter et avverget forsøk (`cooldown_days`).
--
-- Budet teller fortsatt inntil 10 × V og ganges med aktiviteten: det sterkeste motbudet (20 + 60 × √5 ≈ 154) kan alltid
-- slås av en aktiv kjøper (60 × √10 ≈ 190), så eieren kan alltid miste selskapet (B-337). Minstebudet er fortsatt V, og
-- betalingen til eieren ved salg er som før (`takeover_payout`).
--
-- Bud som alt er lagt inn, avgjøres etter reglene de ble lagt inn under: `takeovers.rules` = 1 for alle rader som finnes
-- nå, 2 for nye. Pausen gjelder fra nå for alle selskaper.
--
-- world_status er patchet med replace() (regelsettet på pågående og forrige forsøk) – den levende kroppen er den patchede.

alter table public.takeovers add column if not exists rules smallint not null default 1;
alter table public.takeovers alter column rules set default 2;

update public.config
   set value = jsonb_set(value, '{takeover}', (value -> 'takeover') || jsonb_build_object(
         'defense_w2', 60, 'cap2', 5, 'control_max2', 20, 'lose_fee2', 0.25, 'cooldown_days', 14))
 where id = 'world';

-- Motbudet etter regelsett 2: Kontroll (0–100) gir høyst control_max2 poeng, pengene teller som budet, inntil cap2 × V
create or replace function public.takeover_defense_of2(p_control numeric, p_defense numeric, p_value numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select least(100, greatest(0, p_control)) / 100 * public.takeover_cfg_num('control_max2', 20)
       + public.takeover_cfg_num('defense_w2', 60)
         * sqrt(least(public.takeover_cfg_num('cap2', 5) * p_value, greatest(0, p_defense)) / greatest(1, p_value));
$$;
revoke all on function public.takeover_defense_of2(numeric, numeric, numeric) from public, anon, authenticated;

create or replace function public.takeover_defense(p_takeover bigint)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case when o.rules = 1 then
           public.takeover_defense_of(coalesce((public.company_control(o.company_id) ->> 'score')::numeric, 0),
             o.defense, coalesce((select fund from public.konsern where user_id = o.owner_id), 0),
             public.company_value(o.company_id))
         else
           public.takeover_defense_of2(coalesce((public.company_control(o.company_id) ->> 'score')::numeric, 0),
             o.defense, public.company_value(o.company_id))
         end
  from public.takeovers o where o.id = p_takeover;
$$;

-- Hva den som taper, får tilbake (andel): regelsett 1 som før (kjøperen 90 %, eieren 95 % uansett utfall)
create or replace function public.takeover_refund(p_rules smallint, p_attacker boolean, p_won boolean)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_rules = 1 and p_attacker then public.takeover_cfg_num('fail_refund', 0.9)
    when p_rules = 1 then public.takeover_cfg_num('defense_refund', 0.95)
    -- Regelsett 2: vinneren betaler (kjøperens bud går til eieren, eierens motbud er brukt opp), taperen får 75 %
    when p_attacker = p_won then 0
    else 1 - public.takeover_cfg_num('lose_fee2', 0.25)
  end;
$$;
revoke all on function public.takeover_refund(smallint, boolean, boolean) from public, anon, authenticated;

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
  pay jsonb;
  per record;
  back numeric;
  back_fund numeric;
  share numeric;
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
    -- Eierens motbud: regelsett 1 gir 95 % tilbake uansett, regelsett 2 75 % ved salg og ingenting når det holdt
    share := public.takeover_refund(o.rules, false, won);
    back := round((o.defense - o.defense_fund) * share);
    back_fund := round(o.defense_fund * share);
    if back > 0 then
      insert into public.treasury (user_id, balance, updated_at) values (o.owner_id, back, now())
      on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
      insert into public.treasury_ledger (user_id, amount, kind, ref) values (o.owner_id, back, 'overtakelse', 'forsvar tilbake:' || o.id);
    end if;
    if back_fund > 0 then
      update public.konsern set fund = fund + back_fund, updated_at = now() where user_id = o.owner_id;
    end if;
    if won then
      select coalesce(sum(invested_kasse), 0) as ik, coalesce(sum(invested_fond), 0) as ifo into per
      from public.company_owners
      where company_id = o.company_id and user_id = o.owner_id and from_at <= now() and until_at > now();
      pay := public.takeover_payout(o.bid, coalesce(public.company_estimate(o.company_id), 0),
                                    greatest(0, extract(epoch from c.concession_until - now()) / 86400), per.ik, per.ifo);
      if (pay ->> 'kasse')::numeric > 0 then
        insert into public.treasury (user_id, balance, updated_at) values (o.owner_id, (pay ->> 'kasse')::numeric, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
        insert into public.treasury_ledger (user_id, amount, kind, ref)
        values (o.owner_id, (pay ->> 'kasse')::numeric, 'overtakelse', 'solgt:' || o.id);
      end if;
      if (pay ->> 'fond')::numeric > 0 then
        update public.konsern set fund = fund + (pay ->> 'fond')::numeric, updated_at = now() where user_id = o.owner_id;
      end if;
      update public.takeovers set owner_paid = (pay ->> 'kasse')::numeric, owner_paid_fund = (pay ->> 'fond')::numeric
      where id = o.id;
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
      back := round(o.bid * public.takeover_refund(o.rules, true, false));
      if back > 0 then
        insert into public.treasury (user_id, balance, updated_at) values (o.attacker_id, back, now())
        on conflict (user_id) do update set balance = public.treasury.balance + excluded.balance, updated_at = now();
        insert into public.treasury_ledger (user_id, amount, kind, ref) values (o.attacker_id, back, 'overtakelse', 'avverget:' || o.id);
      end if;
    end if;
    update public.takeovers set status = case when won then 'overtatt' else 'avverget' end, resolved_at = now(),
      attack_score = round(att, 1), defense_score = round(def, 1)
    where id = o.id;
  end loop;
end;
$$;

-- Vinduet for nye bud: forsvaret uten motbud etter regelsett 2 (fondet teller ikke av seg selv), og regelsettet
create or replace function public.takeover_window(p_company integer, p_user uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c record;
  since timestamptz;
  v numeric;
  reason text;
begin
  if public.takeover_cfg_num('enabled', 0) <= 0 or p_user is null then
    return null;
  end if;
  select * into c from public.companies where id = p_company and active;
  if c.id is null or c.owner_id is null or c.owner_id = p_user then
    return null;
  end if;
  select max(from_at) into since from public.company_owners
  where company_id = p_company and user_id = c.owner_id and from_at <= now();
  v := public.company_value(p_company);
  reason := case
    when exists (select 1 from public.takeovers where company_id = p_company and status = 'åpent') then 'pagar'
    when exists (select 1 from public.takeovers where attacker_id = p_user and status = 'åpent') then 'ett'
    when since > now() - make_interval(days => public.takeover_cfg_num('protect_days', 3)::int) then 'vern'
    when c.concession_until < now() + make_interval(days => public.takeover_cfg_num('last_days', 5)::int) then 'sent'
    when exists (select 1 from public.takeovers where company_id = p_company and status = 'avverget'
                 and resolved_at > now() - make_interval(days => public.takeover_cfg_num('cooldown_days', 14)::int)) then 'pause'
    else null end;
  return json_build_object('open', reason is null, 'reason', reason, 'min_bid', round(v), 'value', round(v),
    'rules', 2,
    'from', case
      when reason = 'vern' then since + make_interval(days => public.takeover_cfg_num('protect_days', 3)::int)
      when reason = 'pause' then (select max(resolved_at) from public.takeovers where company_id = p_company
                                  and status = 'avverget')
                                 + make_interval(days => public.takeover_cfg_num('cooldown_days', 14)::int) end,
    'defense_now', round(public.takeover_defense_of2(coalesce((public.company_control(p_company) ->> 'score')::numeric, 0),
                     0, v), 1),
    'attack_min', round(public.takeover_attack_of(v, v, public.activity_factor(p_user, public.world_today()),
                     public.plants_in_region(p_user, c.region)), 1));
end;
$$;

-- world_status: regelsettet på pågående og forrige forsøk
do $$
declare
  def text := pg_get_functiondef('public.world_status()'::regprocedure);
  a text := $a$'mine_attack', o.attacker_id = uid, 'bid', o.bid,$a$;
  b text := $b$'mine_attack', o.attacker_id = uid, 'mine_owner', o.owner_id = uid,$b$;
begin
  if position('''rules'', o.rules' in def) > 0 then
    return;
  end if;
  if position(a in def) = 0 or position(b in def) = 0 then
    raise exception 'world_status har endret seg – patchen passer ikke';
  end if;
  def := replace(def, a, a || ' ''rules'', o.rules,');
  def := replace(def, b, b || ' ''rules'', o.rules,');
  execute def;
end;
$$;
