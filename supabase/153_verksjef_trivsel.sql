-- B-489: verksjefenes trivsel (V3, VERKSJEF-FORSLAG.md avsnitt 6) og seks nye saker i «Verksjefen ringer».
-- * Trivsel 0–100 (`plant_managers.loyalty`), starter på 60. Per betalt utbyttedag: passformen mellom mandatet og
--   egenskapene minus 3 (Lønnsomhet = snittet av Drift og Økonomi, Vekst = Drift, Stabilitet = Folk; 1 stjerne = −2,
--   3 = 0, 5 = +2). Svarer eieren selv: +3 når svaret er det verksjefen selv ville valgt (rådet), −4 ellers. Bytte av
--   mandat: −8. Lojale verksjefer tar minusene halvt så tungt.
-- * Under 20 kommer saken «Tilbud fra en konkurrent» med én gang: lønnstillegg (+1 prosentpoeng, høyst 8 %, trivsel
--   55) eller la verksjefen gå (ingen sluttpakke, ingen karantene). Svarer eieren ikke, velger verksjefen etter trekket.
-- * Seks nye kort (vedlikehold, elektroder, kurs, støv, eksport, rabatt), samme regler som før. Speilet i
--   game/managers.ts (CALL_CARDS, LOYALTY, loyaltyDaily/loyaltyAnswer/loyaltySwitch).

alter table public.plant_managers add column if not exists loyalty smallint not null default 60;

-- Hvor godt mandatet passer egenskapene (mandateFit)
create or replace function public.manager_fit(p_mandate text, p_drift int, p_okonomi int, p_folk int)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case p_mandate when 'lonnsomhet' then (p_drift + p_okonomi) / 2.0 when 'vekst' then p_drift::numeric
    else p_folk::numeric end;
$$;

-- Lojale verksjefer tar minusene halvt så tungt (avrundet mot null)
create or replace function public.manager_loyalty_delta(p_trait text, p_delta int)
returns int
language sql
immutable
set search_path = public
as $$
  select case when p_trait = 'lojal' and p_delta < 0 then trunc(p_delta / 2.0)::int else p_delta end;
$$;

-- Endrer trivselen til én verksjef, innenfor 0–100
create or replace function public.manager_loyalty_add(p_manager bigint, p_delta int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.plant_managers
  set loyalty = greatest(0, least(100, loyalty + public.manager_loyalty_delta(trait, p_delta)))
  where id = p_manager;
$$;
revoke execute on function public.manager_loyalty_add(bigint, int) from public, anon, authenticated;

create or replace function public.manager_trait_choice(p_card text, p_trait text, p_mandate text)
returns int
language sql
stable
set search_path = public
as $$
  with o as (select public.manager_cfg() -> 'cards' -> p_card -> 'options' as opts),
  t as (select case p_trait when 'forsiktig' then 'trygg' when 'aergjerrig' then 'dristig' when 'sparsom' then 'billig' end as tag)
  select case
    when p_trait = 'lojal' and coalesce((public.manager_cfg() -> 'cards' -> p_card ->> 'special')::boolean, false) then 0
    when p_trait = 'lojal' then
      case when (o.opts -> 1 ->> 'mandate') = p_mandate and (o.opts -> 0 ->> 'mandate') <> p_mandate then 1 else 0 end
    when (o.opts -> 1 -> 'tags') ? t.tag and not ((o.opts -> 0 -> 'tags') ? t.tag) then 1
    else 0 end
  from o, t;
$$;

create or replace function public.manager_resolve_call(p_call bigint, p_choice int, p_by text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  m record;
  opt jsonb;
  eff jsonb;
  v_outcome text := 'sikker';
  chance numeric;
  daily numeric;
  v_cash numeric := 0;
  paid numeric := 0;
  today date := public.world_today();
  lc jsonb := public.manager_cfg() -> 'loyalty';
  special text;
  advice int;
begin
  select * into c from public.manager_calls where id = p_call for update;
  if c.id is null or c.resolved_at is not null then
    return json_build_object('ok', false, 'reason', 'ferdig');
  end if;
  select * into m from public.plant_managers where id = c.manager_id;
  opt := public.manager_cfg() -> 'cards' -> c.card -> 'options' -> p_choice;
  if opt is null then
    return json_build_object('ok', false, 'reason', 'valg');
  end if;
  special := opt ->> 'special';
  -- Trivselen: følger eieren verksjefens råd (det verksjefen selv ville valgt), trives verksjefen bedre (B-489)
  if p_by = 'eier' and m.id is not null and m.ended_at is null and special is null then
    advice := public.manager_trait_choice(c.card, m.trait, m.mandate);
    perform public.manager_loyalty_add(m.id, case when advice = p_choice
      then coalesce((lc ->> 'follow_advice')::int, 3) else coalesce((lc ->> 'reject_advice')::int, -4) end);
  end if;
  if special = 'raise' and m.id is not null and m.ended_at is null then
    update public.plant_managers
    set salary = least(coalesce((lc ->> 'raise_cap')::numeric, 0.08), salary + coalesce((lc ->> 'raise')::numeric, 0.01)),
        loyalty = coalesce((lc ->> 'after_raise')::int, 55)
    where id = m.id;
  elsif special = 'leave' and m.id is not null and m.ended_at is null then
    update public.plant_managers set ended_at = now(), ended_day = today, end_reason = 'sluttet' where id = m.id;
  end if;
  eff := coalesce(opt -> 'sure', '{}'::jsonb);
  if jsonb_typeof(opt -> 'risk') = 'object' then
    chance := coalesce((opt -> 'risk' ->> 'chance')::numeric, 0)
              * case when m.mandate = 'stabilitet' and m.ended_at is null
                     then coalesce((public.manager_cfg() ->> 'stability_risk')::numeric, 0.5) else 1 end;
    if random() < chance then
      eff := coalesce(opt -> 'risk' -> 'effect', '{}'::jsonb);
      v_outcome := 'uhell';
    end if;
  end if;
  -- Verkets utbytte per dag nå (fullt, før politikken)
  select coalesce(sum(s.share), 0) * public.dividend_per_day(c.user_id) into daily
  from public.manager_plant_shares(c.user_id) s where s.plant_id = c.plant_id;
  if coalesce((eff ->> 'cash')::numeric, 0) <> 0 then
    v_cash := round((eff ->> 'cash')::numeric * daily);
    paid := public.manager_cash(c.user_id, v_cash, 'samtale:' || c.id);
  end if;
  if coalesce((eff ->> 'days')::int, 0) > 0 and coalesce((eff ->> 'factor')::numeric, 1) <> 1 then
    insert into public.manager_effects (user_id, plant_id, from_day, to_day, factor, call_id)
    values (c.user_id, c.plant_id, today, today + (eff ->> 'days')::int, (eff ->> 'factor')::numeric, c.id);
  end if;
  update public.manager_calls set choice = p_choice, chosen_by = p_by, outcome = v_outcome, cash = paid, resolved_at = now()
  where id = c.id;
  return json_build_object('ok', true, 'outcome', v_outcome, 'cash', paid, 'special', special,
                           'days', coalesce((eff ->> 'days')::int, 0), 'factor', coalesce((eff ->> 'factor')::numeric, 1));
end;
$$;
revoke execute on function public.manager_resolve_call(bigint, int, text) from public, anon, authenticated;

create or replace function public.manager_set_mandate(p_plant int, p_mandate text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  guard text := public.manager_guard(auth.uid());
  m record;
begin
  if guard is not null then
    return json_build_object('ok', false, 'reason', guard);
  end if;
  if p_mandate not in ('lonnsomhet', 'vekst', 'stabilitet') then
    return json_build_object('ok', false, 'reason', 'mandat');
  end if;
  select * into m from public.plant_managers where user_id = uid and plant_id = p_plant and ended_at is null for update;
  if m.id is null then
    return json_build_object('ok', false, 'reason', 'ingen');
  end if;
  if m.mandate = p_mandate then
    return json_build_object('ok', true);
  end if;
  if m.mandate_at > now() - make_interval(days => coalesce((public.manager_cfg() ->> 'mandate_days')::int, 7)) then
    return json_build_object('ok', false, 'reason', 'uke');
  end if;
  update public.plant_managers set mandate = p_mandate, mandate_at = now() where id = m.id;
  perform public.manager_loyalty_add(m.id, coalesce((public.manager_cfg() -> 'loyalty' ->> 'mandate_switch')::int, -8));
  return json_build_object('ok', true);
end;
$$;
revoke execute on function public.manager_set_mandate(int, text) from public, anon;
grant execute on function public.manager_set_mandate(int, text) to authenticated;

create or replace function public.managers_settle()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg jsonb := public.manager_cfg();
  from_day date := coalesce((public.manager_cfg() ->> 'from')::date, public.world_today());
  today date := public.world_today();
  u record;
  d date;
  dv record;
  full_amt numeric;
  adj numeric;
  detail jsonb;
  c record;
  pick record;
  gap_lo numeric := coalesce((cfg -> 'call_gap_h' ->> 0)::numeric, 55);
  gap_hi numeric := coalesce((cfg -> 'call_gap_h' ->> 1)::numeric, 84);
  new_call bigint;
  pname text;
  low record;
  ins boolean;
  quit_below int := coalesce((cfg -> 'loyalty' ->> 'quit_below')::int, 20);
  n_ok int := 0;
  n_fail int := 0;
begin
  perform public.world_job_start('verksjefer');
  for u in
    select distinct x.user_id from (
      select user_id from public.plant_managers where ended_at is null or ended_day >= today - 3
      union select user_id from public.manager_effects where to_day >= today - 3
      union select user_id from public.manager_calls where resolved_at is null) x
  loop
    begin
      -- Solgte eller byttede verk: verksjefen går med verket (ingen sluttpakke)
      update public.plant_managers m set ended_at = now(), ended_day = today, end_reason = 'solgt'
      where m.user_id = u.user_id and m.ended_at is null
        and not exists (select 1 from public.konsern k, jsonb_array_elements(k.plants) p
                        where k.user_id = m.user_id and (p ->> 'id')::int = m.plant_id);
      -- Dagene som er betalt, men ikke gjort opp (andelene per verk regnes av verkene slik de står nå)
      for dv in
        select x.day, x.amount, x.to_fund from public.dividends x
        where x.user_id = u.user_id and x.day >= from_day and x.day < today
          and not exists (select 1 from public.manager_days md where md.user_id = x.user_id and md.day = x.day)
        order by x.day
      loop
        d := dv.day;
        full_amt := coalesce(dv.amount, 0) + coalesce(dv.to_fund, 0);
        select coalesce(sum(s.share * full_amt * (
                 coalesce((select public.manager_factor(m.mandate, m.drift, m.okonomi, m.folk) - 1 - m.salary
                           from public.plant_managers m
                           where m.user_id = u.user_id and m.plant_id = s.plant_id and m.hired_day < d
                             and (m.ended_day is null or m.ended_day > d)
                           order by m.id desc limit 1), 0)
                 + coalesce((select sum(e.factor - 1) from public.manager_effects e
                             where e.user_id = u.user_id and e.plant_id = s.plant_id and d >= e.from_day and d < e.to_day), 0))), 0),
               coalesce(jsonb_object_agg(s.plant_id, round(s.share, 4)), '{}'::jsonb)
          into adj, detail
        from public.manager_plant_shares(u.user_id) s;
        insert into public.manager_days (user_id, day, amount, detail)
        values (u.user_id, d, round(adj), jsonb_build_object('full', full_amt, 'shares', detail))
        on conflict do nothing;
        ins := found;
        -- Trivselen per betalt dag: passformen mellom mandat og egenskaper minus 3 (B-489)
        if ins then
          update public.plant_managers m
          set loyalty = greatest(0, least(100, m.loyalty + public.manager_loyalty_delta(m.trait,
                          floor(public.manager_fit(m.mandate, m.drift, m.okonomi, m.folk) - 3 + 0.5)::int)))
          where m.user_id = u.user_id and m.ended_at is null and m.hired_day < d;
        end if;
        if ins and round(adj) <> 0 then
          update public.manager_days set amount = public.manager_cash(u.user_id, adj, 'verksjef:' || d)
          where user_id = u.user_id and day = d;
        end if;
      end loop;
      -- Fristen er ute: verksjefen velger selv etter trekket
      for c in
        select mc.id, mc.card, mc.plant_id, m.trait, m.mandate, m.name
        from public.manager_calls mc left join public.plant_managers m on m.id = mc.manager_id
        where mc.user_id = u.user_id and mc.resolved_at is null and mc.deadline < now()
      loop
        perform public.manager_resolve_call(c.id, public.manager_trait_choice(c.card, coalesce(c.trait, 'forsiktig'),
                                                                              coalesce(c.mandate, '')), 'verksjef');
        perform public.push_enqueue(u.user_id, 'konsern', 'verksjef-valgte:' || c.id,
          format('%s valgte selv', coalesce(c.name, 'Verksjefen')),
          format('Du svarte ikke på «%s», så verksjefen bestemte.', public.manager_cfg() -> 'cards' -> c.card ->> 'title'),
          'konsern');
      end loop;
      -- Trives en verksjef dårlig, kommer «Tilbud fra en konkurrent» med én gang (B-489)
      if coalesce((cfg ->> 'enabled')::boolean, false) and (cfg -> 'cards') ? 'tilbud'
         and not exists (select 1 from public.manager_calls where user_id = u.user_id and resolved_at is null) then
        select m.id, m.plant_id, m.name into low from public.plant_managers m
        where m.user_id = u.user_id and m.ended_at is null and m.loyalty < quit_below
        order by m.loyalty, m.id limit 1;
        if low.id is not null then
          insert into public.manager_calls (user_id, plant_id, manager_id, card, deadline)
          values (u.user_id, low.plant_id, low.id, 'tilbud',
                  now() + make_interval(hours => coalesce((cfg ->> 'call_deadline_h')::int, 48)))
          returning id into new_call;
          select s.name into pname from public.manager_plant_shares(u.user_id) s where s.plant_id = low.plant_id;
          perform public.push_enqueue(u.user_id, 'konsern', 'verksjef-ringer:' || new_call,
            format('%s vil kanskje slutte', low.name),
            format('Verksjefen på %s har fått et tilbud fra en konkurrent. Svar innen 48 timer.', coalesce(pname, 'verket')),
            'konsern');
        end if;
      end if;
      -- Ny samtale: 2–3 i uka, høyst én åpen, bare med en verksjef i arbeid
      if coalesce((cfg ->> 'enabled')::boolean, false)
         and exists (select 1 from public.plant_managers where user_id = u.user_id and ended_at is null)
         and not exists (select 1 from public.manager_calls where user_id = u.user_id and resolved_at is null) then
        insert into public.manager_state (user_id, next_call_at)
        values (u.user_id, now() + make_interval(secs => (gap_lo + random() * (gap_hi - gap_lo)) * 3600 / 2))
        on conflict do nothing;
        if (select next_call_at from public.manager_state where user_id = u.user_id) <= now() then
          select m.id, m.plant_id, m.name, card.key as card into pick
          from public.plant_managers m
          cross join lateral jsonb_object_keys(cfg -> 'cards') card(key)
          where m.user_id = u.user_id and m.ended_at is null
            and not coalesce((cfg -> 'cards' -> card.key ->> 'special')::boolean, false)
            and not exists (select 1 from public.manager_calls x
                            where x.user_id = m.user_id and x.plant_id = m.plant_id and x.card = card.key
                              and x.created_at > now() - make_interval(days => coalesce((cfg ->> 'card_repeat_days')::int, 30)))
          order by random() limit 1;
          if pick.id is not null then
            insert into public.manager_calls (user_id, plant_id, manager_id, card, deadline)
            values (u.user_id, pick.plant_id, pick.id, pick.card,
                    now() + make_interval(hours => coalesce((cfg ->> 'call_deadline_h')::int, 48)))
            returning id into new_call;
            select s.name into pname from public.manager_plant_shares(u.user_id) s where s.plant_id = pick.plant_id;
            perform public.push_enqueue(u.user_id, 'konsern', 'verksjef-ringer:' || new_call,
              format('Verksjefen på %s ringer', coalesce(pname, 'verket')),
              format('%s: «%s». Svar innen 48 timer, ellers bestemmer verksjefen selv.', pick.name,
                     cfg -> 'cards' -> pick.card ->> 'title'),
              'konsern');
          end if;
          update public.manager_state
          set next_call_at = now() + make_interval(secs => (gap_lo + random() * (gap_hi - gap_lo)) * 3600)
          where user_id = u.user_id;
        end if;
      end if;
      n_ok := n_ok + 1;
    exception when others then
      n_fail := n_fail + 1;
      perform public.world_job_unit_error('verksjefer', u.user_id::text, sqlerrm);
    end;
  end loop;
  perform public.world_job_finish('verksjefer', n_ok, n_fail);
end;
$$;
revoke execute on function public.managers_settle() from public, anon, authenticated;

create or replace function public.manager_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cfg jsonb := public.manager_cfg();
  per_day numeric;
  guard text;
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  guard := public.manager_guard(uid);
  if guard is not null then
    return json_build_object('enabled', false, 'reason', guard);
  end if;
  perform public.manager_draw_candidates(uid);
  per_day := public.dividend_per_day(uid);
  return json_build_object(
    'enabled', true,
    'perDay', per_day,
    'plants', coalesce((select json_agg(json_build_object('plant', s.plant_id, 'share', s.share, 'daily', round(s.share * per_day)))
                        from public.manager_plant_shares(uid) s), '[]'::json),
    'candidates', coalesce((select json_agg(json_build_object('slot', c.slot, 'name', c.name, 'drift', c.drift,
                              'okonomi', c.okonomi, 'folk', c.folk, 'trait', c.trait) order by c.slot)
                            from public.manager_candidates c
                            where c.user_id = uid and c.day = public.world_today() and not c.hired), '[]'::json),
    'managers', coalesce((select json_agg(json_build_object('plant', m.plant_id, 'name', m.name, 'drift', m.drift,
                            'okonomi', m.okonomi, 'folk', m.folk, 'trait', m.trait, 'mandate', m.mandate, 'salary', m.salary, 'loyalty', m.loyalty,
                            'hiredAt', m.hired_at, 'mandateAt', m.mandate_at,
                            'mandateFrom', m.mandate_at + make_interval(days => coalesce((cfg ->> 'mandate_days')::int, 7))))
                          from public.plant_managers m where m.user_id = uid and m.ended_at is null), '[]'::json),
    'quarantine', coalesce((select json_agg(json_build_object('plant', m.plant_id,
                              'until', m.ended_at + make_interval(days => coalesce((cfg ->> 'quarantine_days')::int, 3))))
                            from public.plant_managers m
                            where m.user_id = uid and m.end_reason = 'avsluttet'
                              and m.ended_at > now() - make_interval(days => coalesce((cfg ->> 'quarantine_days')::int, 3))
                              and not exists (select 1 from public.plant_managers n
                                              where n.user_id = uid and n.plant_id = m.plant_id and n.ended_at is null)),
                           '[]'::json),
    'calls', coalesce((select json_agg(json_build_object('id', c.id, 'plant', c.plant_id, 'card', c.card,
                         'createdAt', c.created_at, 'deadline', c.deadline, 'choice', c.choice, 'chosenBy', c.chosen_by,
                         'outcome', c.outcome, 'cash', c.cash, 'resolvedAt', c.resolved_at,
                         'manager', (select name from public.plant_managers where id = c.manager_id))
                       order by c.created_at desc)
                       from public.manager_calls c
                       where c.user_id = uid and (c.resolved_at is null or c.resolved_at > now() - interval '7 days')), '[]'::json),
    'days', coalesce((select json_agg(json_build_object('day', d.day, 'amount', d.amount) order by d.day desc)
                      from (select * from public.manager_days where user_id = uid order by day desc limit 7) d), '[]'::json),
    'effects', coalesce((select json_agg(json_build_object('plant', e.plant_id, 'factor', e.factor, 'until', e.to_day))
                         from public.manager_effects e where e.user_id = uid and e.to_day > public.world_today()), '[]'::json));
end;
$$;
revoke execute on function public.manager_status() from public, anon;
grant execute on function public.manager_status() to authenticated;

-- Kortene og tallene for trivselen – lagt inn etter at appen med de nye kortene var publisert (eldre apper viser
-- ikke kort de ikke kjenner)
update public.config
set value = jsonb_set(jsonb_set(value, '{managers,cards}', '{"foring":{"title":"Ovnen bør fores om","options":[{"tags":["trygg"],"mandate":"stabilitet","sure":{"cash":-1},"risk":null},{"tags":["dristig","billig"],"mandate":"lonnsomhet","sure":{},"risk":{"chance":0.35,"effect":{"days":5,"factor":0.5}}}]},"lonn":{"title":"Lønnskrav","options":[{"tags":["trygg"],"mandate":"stabilitet","sure":{"days":10,"factor":0.97},"risk":null},{"tags":["dristig","billig"],"mandate":"lonnsomhet","sure":{},"risk":{"chance":0.3,"effect":{"days":3,"factor":0.3}}}]},"hastejobb":{"title":"Hastejobb","options":[{"tags":["dristig"],"mandate":"lonnsomhet","sure":{"days":3,"factor":1.25},"risk":{"chance":0.3,"effect":{"days":6,"factor":0.9}}},{"tags":["trygg","billig"],"mandate":"stabilitet","sure":{},"risk":null}]},"styring":{"title":"Ny styring av ovnene","options":[{"tags":["dristig"],"mandate":"vekst","sure":{"cash":-2,"days":14,"factor":1.15},"risk":null},{"tags":["trygg","billig"],"mandate":"lonnsomhet","sure":{},"risk":null}]},"laerling":{"title":"Lærlinger","options":[{"tags":["trygg"],"mandate":"vekst","sure":{"cash":-0.5,"days":10,"factor":1.06},"risk":null},{"tags":["billig"],"mandate":"lonnsomhet","sure":{},"risk":null}]},"strom":{"title":"Strømavtalen","options":[{"tags":["trygg"],"mandate":"stabilitet","sure":{"days":10,"factor":0.98},"risk":null},{"tags":["dristig","billig"],"mandate":"lonnsomhet","sure":{"days":10,"factor":1.06},"risk":{"chance":0.5,"effect":{"days":10,"factor":0.92}}}]},"messe":{"title":"Kundemesse","options":[{"tags":["dristig"],"mandate":"lonnsomhet","sure":{"cash":-0.3,"days":7,"factor":1.06},"risk":null},{"tags":["trygg","billig"],"mandate":"stabilitet","sure":{},"risk":null}]},"skrapparti":{"title":"Billig skrapparti","options":[{"tags":["dristig"],"mandate":"vekst","sure":{"cash":-1,"days":7,"factor":1.18},"risk":null},{"tags":["trygg","billig"],"mandate":"stabilitet","sure":{},"risk":null}]},"vedlikehold":{"title":"Kranene trenger vedlikehold","options":[{"tags":["trygg"],"mandate":"stabilitet","sure":{"days":2,"factor":0.7},"risk":null},{"tags":["dristig","billig"],"mandate":"lonnsomhet","sure":{},"risk":{"chance":0.3,"effect":{"days":4,"factor":0.5}}}]},"elektroder":{"title":"Billigere elektroder","options":[{"tags":["dristig","billig"],"mandate":"lonnsomhet","sure":{"days":10,"factor":1.04},"risk":{"chance":0.25,"effect":{"days":3,"factor":0.6}}},{"tags":["trygg"],"mandate":"stabilitet","sure":{},"risk":null}]},"kurs":{"title":"Sikkerhetskurs","options":[{"tags":["trygg"],"mandate":"stabilitet","sure":{"cash":-0.4,"days":14,"factor":1.02},"risk":null},{"tags":["dristig","billig"],"mandate":"lonnsomhet","sure":{},"risk":{"chance":0.15,"effect":{"days":2,"factor":0.5}}}]},"stov":{"title":"Naboene klager på støv","options":[{"tags":["trygg"],"mandate":"stabilitet","sure":{"cash":-0.8},"risk":null},{"tags":["dristig","billig"],"mandate":"lonnsomhet","sure":{},"risk":{"chance":0.35,"effect":{"cash":-2}}}]},"eksport":{"title":"Eksportordre","options":[{"tags":["dristig"],"mandate":"vekst","sure":{"days":7,"factor":1.1},"risk":{"chance":0.35,"effect":{"days":7,"factor":0.95}}},{"tags":["trygg","billig"],"mandate":"stabilitet","sure":{},"risk":null}]},"rabatt":{"title":"Storkunden vil ha rabatt","options":[{"tags":["trygg"],"mandate":"stabilitet","sure":{"days":14,"factor":0.97},"risk":null},{"tags":["dristig","billig"],"mandate":"lonnsomhet","sure":{},"risk":{"chance":0.4,"effect":{"days":10,"factor":0.92}}}]},"tilbud":{"title":"Tilbud fra en konkurrent","special":true,"options":[{"tags":["trygg"],"mandate":"stabilitet","sure":{},"risk":null,"special":"raise"},{"tags":["dristig","billig"],"mandate":"lonnsomhet","sure":{},"risk":null,"special":"leave"}]}}'::jsonb),
                      '{managers,loyalty}', jsonb_build_object(
                        'start', 60, 'quit_below', 20, 'follow_advice', 3, 'reject_advice', -4, 'mandate_switch', -8,
                        'raise', 0.01, 'raise_cap', 0.08, 'after_raise', 55))
where id = 'world';
