-- B-508: regionale fellesprosjekter – modell C fra FELLESPROSJEKT-FORSLAG.md (B-507), simulert i game/projectSim.ts.
-- Eieren (21.10): «Vi skal fortsette med sesong 1. Kjør på med resten av dine anbefalinger.» De som er ferdige, har
-- penger som hoper seg opp i konsernkassa og ingenting å bruke dem på sammen med andre.
--
-- I hver region åpner et stort prosjekt i ekte tid (f.eks. «Ny kraftlinje»). Alle med ferdige verk i regionen kan gi
-- fra konsernkassa. Målet er det største av 4 dagers utbytte fra verkene i regionen og 2 % av konsernkassene til
-- spillerne der, fristen 21 ekte dager.
--   - Nås målet: pengene er brukt (ingen penger tilbake og ingen pengefordel – det er meningen, B-507). Den som ga mest,
--     blir «Hovedbidragsyter» (varig merke) og får +25 % regionmester-styrke i regionen i 30 dager, nummer to +10 %.
--     Alle som ga minst 10 % av målet, får merket «Fellesprosjekt». Prosjektet står på verdenskartet med navnet til
--     hovedbidragsyteren.
--   - Nås det ikke: halvparten tilbake til alle som ga, og ingen merker.
-- Ett prosjekt per region om gangen, et nytt 7 dager etter at det forrige er avgjort, og bare der minst to aktive
-- konsern har ferdige verk. Ingen fordel for gratispassasjerer: regionmester-styrken går bare til de to som ga mest.
--
-- Pengene føres i kassaboka som `fellesprosjekt`, ikke `utbytte`/`bidrag`, så lånerammen (`bank_limit`) ikke endres.
-- Låsene: rådgivende lås per spiller, så `konsern`, så `treasury` – samme rekkefølge som `konsern_order` (B-433), med
-- prosjektraden først. Bryteren er `config.world.projects.enabled` (av til appen er publisert).

alter table public.treasury_ledger drop constraint treasury_ledger_kind_check;
alter table public.treasury_ledger add constraint treasury_ledger_kind_check check (kind = any (array[
  'innskudd', 'anbud', 'refusjon', 'inntekt', 'utbetaling', 'justering', 'utbytte', 'bidrag', 'prosjekt', 'salg',
  'investering', 'overtakelse', 'lån', 'fellesprosjekt']));

update public.config
set value = jsonb_set(value, '{projects}', jsonb_build_object(
  'enabled', false,
  'goal_days', 4,
  'goal_kassa', 0.02,
  'deadline_days', 21,
  'refund', 0.5,
  'pause_days', 7,
  'min_owners', 2,
  'min_gift', 1000000,
  'round_to', 10000000,
  'boost_top1', 0.25,
  'boost_top2', 0.10,
  'boost_days', 30,
  'badge_share', 0.1,
  'remind_hours', 72), true)
where id = 'world' and not (value ? 'projects');

create table if not exists public.region_projects (
  id bigserial primary key,
  region text not null,
  kind text not null,
  name text not null,
  goal numeric not null check (goal > 0),
  total numeric not null default 0,
  opened_at timestamptz not null default now(),
  deadline timestamptz not null,
  status text not null default 'apen' check (status in ('apen', 'ferdig', 'bom')),
  settled_at timestamptz,
  reminded_at timestamptz,
  top1_user uuid references public.profiles(id) on delete set null,
  top2_user uuid references public.profiles(id) on delete set null,
  boost_until timestamptz
);
alter table public.region_projects enable row level security;
create unique index if not exists region_projects_one_open on public.region_projects (region) where status = 'apen';
create index if not exists region_projects_region_idx on public.region_projects (region, opened_at desc);
create index if not exists region_projects_top1_idx on public.region_projects (top1_user);
create index if not exists region_projects_top2_idx on public.region_projects (top2_user);

-- Én rad per spiller og prosjekt: summen, antall gaver og om halvparten er betalt tilbake
create table if not exists public.region_project_gifts (
  project_id bigint not null references public.region_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null default 0 check (amount >= 0),
  gifts integer not null default 0,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  refunded numeric,
  primary key (project_id, user_id)
);
alter table public.region_project_gifts enable row level security;
create index if not exists region_project_gifts_user_idx on public.region_project_gifts (user_id);

create or replace function public.projects_cfg()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value -> 'projects' from public.config where id = 'world'), '{}'::jsonb);
$$;
revoke execute on function public.projects_cfg() from public, anon, authenticated;

-- Prosjektene som kan åpne, i fast rekkefølge (regionen starter på sitt eget sted i lista)
create or replace function public.project_kinds()
returns table(n integer, kind text, name text)
language sql
immutable
set search_path = public
as $$
  values (1, 'kraftlinje', 'Ny kraftlinje'), (2, 'kai', 'Dypvannskai'), (3, 'skrapterminal', 'Felles skrapterminal'),
         (4, 'jernbane', 'Jernbanespor til verkene'), (5, 'fagskole', 'Fagskole for industrien'),
         (6, 'fjernvarme', 'Fjernvarme fra spillvarmen');
$$;

-- Utbyttet per dag fra verkene i regionen: hvert konsern med sin andel av styrken der (før aktiviteten)
create or replace function public.region_dividend(p_region text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with s as (select * from public.region_strengths()),
  tot as (select user_id, sum(raw) as r from s group by 1)
  select coalesce(sum(s.raw / nullif(tot.r, 0) * public.dividend_avg(s.user_id, public.world_today() - 1)), 0)
  from s join tot on tot.user_id = s.user_id
  where s.region = p_region and s.activity > 0;
$$;
revoke execute on function public.region_dividend(text) from public, anon, authenticated;

-- Regionmester-styrken fra prosjekter: +25 % til den som ga mest, +10 % til nummer to, i 30 dager (høyeste gjelder)
create or replace function public.region_project_boost(p_region text, p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(case when p.top1_user = p_user then coalesce((c ->> 'boost_top1')::numeric, 0.25)
                           else coalesce((c ->> 'boost_top2')::numeric, 0.10) end), 0)
  from public.region_projects p, public.projects_cfg() c
  where p.region = p_region and p.status = 'ferdig' and p.boost_until > now()
    and (p.top1_user = p_user or p.top2_user = p_user);
$$;
revoke execute on function public.region_project_boost(text, uuid) from public, anon, authenticated;

-- Styrken som i 151, nå med fordelen fra fellesprosjektene. Speilet i `regionPoints`/`projectBoost` (game/regions.ts).
create or replace function public.region_strengths()
returns table(region text, user_id uuid, raw numeric, activity numeric, strength numeric)
language sql
stable
security definer
set search_path = public
as $$
  with per as (
    select p ->> 'region' as region, k.user_id,
           sum(public.region_points(p ->> 'type', (p ->> 'level')::numeric)) as raw
    from public.konsern k
    join public.profiles pr on pr.id = k.user_id and pr.flagged_at is null and not coalesce(pr.banned, false)
    cross join lateral jsonb_array_elements(case when jsonb_typeof(k.plants) = 'array' then k.plants else '[]' end) p
    where p ->> 'region' = any (public.konsern_regions())
      and coalesce(p -> 'project' ->> 'kind', '') <> 'bygg'
      and not public.user_is_guest(k.user_id)
    group by 1, 2
  ),
  act as (
    select u.user_id, public.activity_factor(u.user_id, public.world_today()) as f
    from (select distinct per.user_id from per) u
  )
  select per.region, per.user_id, per.raw, act.f,
         round(per.raw * act.f * (1 + public.region_project_boost(per.region, per.user_id)), 1)
  from per join act on act.user_id = per.user_id;
$$;
revoke execute on function public.region_strengths() from public, anon, authenticated;

-- Målet er nådd: hovedbidragsyteren, nummer to, fordelen og beskjedene. Kalles med prosjektraden låst.
create or replace function public.project_complete(p_project bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  c jsonb := public.projects_cfg();
  t1 uuid;
  t2 uuid;
  nick text;
  rname text;
  g record;
begin
  select * into p from public.region_projects where id = p_project;
  if p.id is null or p.status <> 'apen' then
    return;
  end if;
  select user_id into t1 from public.region_project_gifts where project_id = p.id and amount > 0
  order by amount desc, first_at, user_id limit 1;
  select user_id into t2 from public.region_project_gifts where project_id = p.id and amount > 0 and user_id <> t1
  order by amount desc, first_at, user_id limit 1;
  update public.region_projects
  set status = 'ferdig', settled_at = now(), top1_user = t1, top2_user = t2,
      boost_until = now() + make_interval(days => coalesce((c ->> 'boost_days')::int, 30))
  where id = p.id;
  rname := public.region_name(p.region);
  select coalesce(nickname, 'Et konsern') into nick from public.profiles where id = t1;
  perform public.chat_event(format('Fellesprosjektet «%s» i %s er ferdig! Hovedbidragsyter: %s.', p.name, rname, nick));
  for g in select user_id from public.region_project_gifts where project_id = p.id and amount > 0 loop
    perform public.push_enqueue(g.user_id, 'konsern', format('fellesprosjekt:%s:ferdig', p.id),
      format('%s er ferdig', p.name),
      case when g.user_id = t1 then format('Du ga mest og er hovedbidragsyter i %s. Regionmester-styrken din der er 25 %% høyere i 30 dager.', rname)
           when g.user_id = t2 then format('Du ga nest mest i %s. Regionmester-styrken din der er 10 %% høyere i 30 dager.', rname)
           else format('Prosjektet i %s nådde målet. Takk for bidraget!', rname) end,
      'konsern');
  end loop;
end;
$$;
revoke execute on function public.project_complete(bigint) from public, anon, authenticated;

-- Gi fra konsernkassa til prosjektet i en region der du har ferdige verk
create or replace function public.project_give(p_project bigint, p_amount numeric)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c jsonb := public.projects_cfg();
  p record;
  pr record;
  bal numeric;
  amt numeric := round(coalesce(p_amount, 0));
  rest numeric;
  min_gift numeric := coalesce((c ->> 'min_gift')::numeric, 1000000);
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  if not coalesce((c ->> 'enabled')::boolean, false) then
    return json_build_object('ok', false, 'reason', 'av');
  end if;
  select * into pr from public.profiles where id = uid;
  if pr.id is null or pr.flagged_at is not null or coalesce(pr.banned, false) or public.user_is_guest(uid) then
    return json_build_object('ok', false, 'reason', 'sperret');
  end if;
  select * into p from public.region_projects where id = p_project for update;
  if p.id is null or p.status <> 'apen' then
    return json_build_object('ok', false, 'reason', 'ferdig');
  end if;
  if p.deadline <= now() then
    return json_build_object('ok', false, 'reason', 'frist');
  end if;
  if amt < min_gift then
    return json_build_object('ok', false, 'reason', 'lite', 'min', min_gift);
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || uid::text));
  perform 1 from public.konsern k
  where k.user_id = uid and exists (
    select 1 from jsonb_array_elements(case when jsonb_typeof(k.plants) = 'array' then k.plants else '[]' end) x
    where x ->> 'region' = p.region and coalesce(x -> 'project' ->> 'kind', '') <> 'bygg')
  for update;
  if not found then
    return json_build_object('ok', false, 'reason', 'region');
  end if;
  rest := greatest(p.goal - p.total, 0);
  amt := least(amt, rest);
  if amt <= 0 then
    return json_build_object('ok', false, 'reason', 'ferdig');
  end if;
  select balance into bal from public.treasury where user_id = uid for update;
  if coalesce(bal, 0) < amt then
    return json_build_object('ok', false, 'reason', 'kassa', 'balance', coalesce(bal, 0));
  end if;
  update public.treasury set balance = balance - amt, updated_at = now() where user_id = uid;
  insert into public.treasury_ledger (user_id, amount, kind, ref) values (uid, -amt, 'fellesprosjekt', 'prosjekt:' || p.id);
  insert into public.region_project_gifts (project_id, user_id, amount, gifts)
  values (p.id, uid, amt, 1)
  on conflict (project_id, user_id) do update
    set amount = region_project_gifts.amount + excluded.amount, gifts = region_project_gifts.gifts + 1, last_at = now();
  update public.region_projects set total = total + amt where id = p.id;
  if p.total + amt >= p.goal then
    perform public.project_complete(p.id);
  end if;
  return json_build_object('ok', true, 'amount', amt, 'done', p.total + amt >= p.goal, 'balance', bal - amt);
end;
$$;
revoke execute on function public.project_give(bigint, numeric) from public, anon;
grant execute on function public.project_give(bigint, numeric) to authenticated;

-- Prosjektene for appen: de åpne og de som er avgjort de siste 14 dagene. Aldri hva andre har i kassa – de tre som har
-- gitt mest, vises med andel av målet, ikke beløp.
create or replace function public.project_status()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c jsonb := public.projects_cfg();
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  return json_build_object(
    'enabled', coalesce((c ->> 'enabled')::boolean, false),
    'min_gift', coalesce((c ->> 'min_gift')::numeric, 1000000),
    'refund', coalesce((c ->> 'refund')::numeric, 0.5),
    'boost_top1', coalesce((c ->> 'boost_top1')::numeric, 0.25),
    'boost_top2', coalesce((c ->> 'boost_top2')::numeric, 0.10),
    'boost_days', coalesce((c ->> 'boost_days')::int, 30),
    'badge_share', coalesce((c ->> 'badge_share')::numeric, 0.1),
    'balance', coalesce((select balance from public.treasury where user_id = uid), 0),
    'my_regions', coalesce((
      select json_agg(distinct x ->> 'region')
      from public.konsern k
      cross join lateral jsonb_array_elements(case when jsonb_typeof(k.plants) = 'array' then k.plants else '[]' end) x
      where k.user_id = uid and coalesce(x -> 'project' ->> 'kind', '') <> 'bygg'), '[]'::json),
    'projects', coalesce((
      select json_agg(json_build_object(
               'id', p.id, 'region', p.region, 'kind', p.kind, 'name', p.name, 'goal', p.goal, 'total', p.total,
               'opened_at', p.opened_at, 'deadline', p.deadline, 'status', p.status, 'settled_at', p.settled_at,
               'boost_until', p.boost_until,
               'mine', coalesce((select g.amount from public.region_project_gifts g
                                 where g.project_id = p.id and g.user_id = uid), 0),
               'refunded', (select g.refunded from public.region_project_gifts g
                            where g.project_id = p.id and g.user_id = uid),
               'givers', (select count(*) from public.region_project_gifts g where g.project_id = p.id and g.amount > 0),
               'top', coalesce((
                 select json_agg(json_build_object('nick', coalesce(t.nickname, 'Ukjent'), 'share', t.share,
                                                   'mine', t.user_id = uid) order by t.n)
                 from (select g.user_id, pf.nickname, round(g.amount / p.goal, 3) as share,
                              row_number() over (order by g.amount desc, g.first_at, g.user_id) as n
                       from public.region_project_gifts g join public.profiles pf on pf.id = g.user_id
                       where g.project_id = p.id and g.amount > 0) t
                 where t.n <= 3), '[]'::json),
               'my_rank', (select t.n from (
                             select g.user_id, row_number() over (order by g.amount desc, g.first_at, g.user_id) as n
                             from public.region_project_gifts g where g.project_id = p.id and g.amount > 0) t
                           where t.user_id = uid))
             order by (p.status = 'apen') desc, p.deadline)
      from public.region_projects p
      where p.status = 'apen' or p.settled_at > now() - interval '14 days'), '[]'::json));
end;
$$;
revoke execute on function public.project_status() from public, anon;
grant execute on function public.project_status() to authenticated;

-- Jobben `fellesprosjekter` (cron hvert 10. min): avgjør ved fristen, betaler halvparten tilbake ved bom (én spiller per
-- deltransaksjon, B-401), minner om fristen og åpner nye prosjekter.
create or replace function public.projects_settle()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  c jsonb := public.projects_cfg();
  rec record;
  g record;
  n integer := 0;
  ok integer := 0;
  failed integer := 0;
  rname text;
  v_goal numeric;
  v_div numeric;
  v_kassa numeric;
  v_kind text;
  v_name text;
  v_count integer;
  v_id bigint;
  round_to numeric := greatest(coalesce((c ->> 'round_to')::numeric, 10000000), 1);
begin
  perform public.world_job_start('fellesprosjekter');
  if not coalesce((c ->> 'enabled')::boolean, false) then
    perform public.world_job_finish('fellesprosjekter', 0, 0);
    return 0;
  end if;

  -- 1. Målet er nådd (sikkerhetsnett: gaven avgjør det vanligvis med én gang)
  for rec in select id from public.region_projects where status = 'apen' and total >= goal loop
    begin
      perform 1 from public.region_projects where id = rec.id for update;
      perform public.project_complete(rec.id);
      n := n + 1;
      ok := ok + 1;
    exception when others then
      failed := failed + 1;
      perform public.world_job_unit_error('fellesprosjekter', 'ferdig:' || rec.id, sqlerrm);
    end;
  end loop;

  -- 2. Fristen er ute: bom
  for rec in select * from public.region_projects where status = 'apen' and deadline <= now() and total < goal loop
    begin
      update public.region_projects set status = 'bom', settled_at = now() where id = rec.id and status = 'apen';
      perform public.chat_event(format('Fellesprosjektet «%s» i %s nådde ikke målet. Halvparten går tilbake til dem som ga.',
                                       rec.name, public.region_name(rec.region)));
      n := n + 1;
      ok := ok + 1;
    exception when others then
      failed := failed + 1;
      perform public.world_job_unit_error('fellesprosjekter', 'bom:' || rec.id, sqlerrm);
    end;
  end loop;

  -- 3. Halvparten tilbake, én spiller om gangen (prøves igjen neste gang hvis en feiler)
  for g in
    select gi.project_id, gi.user_id, gi.amount, p.name, p.region
    from public.region_project_gifts gi join public.region_projects p on p.id = gi.project_id
    where p.status = 'bom' and gi.refunded is null and gi.amount > 0
  loop
    begin
      perform pg_advisory_xact_lock(hashtext('stalverk_konsernkasse_' || g.user_id::text));
      update public.region_project_gifts set refunded = floor(g.amount * coalesce((c ->> 'refund')::numeric, 0.5))
      where project_id = g.project_id and user_id = g.user_id and refunded is null;
      if found then
        insert into public.treasury (user_id, balance, updated_at) values (g.user_id, 0, now()) on conflict do nothing;
        update public.treasury
        set balance = balance + floor(g.amount * coalesce((c ->> 'refund')::numeric, 0.5)), updated_at = now()
        where user_id = g.user_id;
        insert into public.treasury_ledger (user_id, amount, kind, ref)
        values (g.user_id, floor(g.amount * coalesce((c ->> 'refund')::numeric, 0.5)), 'fellesprosjekt',
                'prosjekt:' || g.project_id || ':tilbake');
        perform public.push_enqueue(g.user_id, 'konsern', format('fellesprosjekt:%s:bom', g.project_id),
          format('%s nådde ikke målet', g.name),
          format('Halvparten av det du ga i %s, er tilbake i konsernkassa.', public.region_name(g.region)), 'konsern');
      end if;
      ok := ok + 1;
    exception when others then
      failed := failed + 1;
      perform public.world_job_unit_error('fellesprosjekter', 'tilbake:' || g.project_id || ':' || g.user_id, sqlerrm);
    end;
  end loop;

  -- 4. Tre dager igjen: én påminnelse til alle med verk i regionen
  for rec in
    select * from public.region_projects
    where status = 'apen' and reminded_at is null
      and deadline - now() <= make_interval(hours => coalesce((c ->> 'remind_hours')::int, 72))
  loop
    begin
      update public.region_projects set reminded_at = now() where id = rec.id;
      rname := public.region_name(rec.region);
      perform public.chat_event(format('Tre dager igjen av «%s» i %s – %s %% av målet er nådd.', rec.name, rname,
                                       floor(100 * rec.total / rec.goal)));
      for g in select distinct s.user_id from public.region_strengths() s where s.region = rec.region and s.activity > 0 loop
        perform public.push_enqueue(g.user_id, 'konsern', format('fellesprosjekt:%s:frist', rec.id),
          format('Tre dager igjen: %s', rec.name),
          format('Fellesprosjektet i %s har nådd %s %% av målet.', rname, floor(100 * rec.total / rec.goal)), 'konsern');
      end loop;
      ok := ok + 1;
    exception when others then
      failed := failed + 1;
      perform public.world_job_unit_error('fellesprosjekter', 'frist:' || rec.id, sqlerrm);
    end;
  end loop;

  -- 5. Nye prosjekter der ingen er åpne og pausen etter det forrige er over
  for rec in
    select r.region, r.i
    from unnest(public.konsern_regions()) with ordinality as r(region, i)
    where not exists (select 1 from public.region_projects p where p.region = r.region and p.status = 'apen')
      and not exists (select 1 from public.region_projects p where p.region = r.region
                      and p.settled_at > now() - make_interval(days => coalesce((c ->> 'pause_days')::int, 7)))
      and (select count(distinct s.user_id) from public.region_strengths() s
           where s.region = r.region and s.activity > 0) >= coalesce((c ->> 'min_owners')::int, 2)
  loop
    begin
      v_div := public.region_dividend(rec.region);
      select coalesce(sum(t.balance), 0) into v_kassa
      from (select distinct s.user_id from public.region_strengths() s where s.region = rec.region and s.activity > 0) u
      join public.treasury t on t.user_id = u.user_id;
      v_goal := greatest(coalesce((c ->> 'goal_days')::numeric, 4) * v_div,
                         coalesce((c ->> 'goal_kassa')::numeric, 0.02) * v_kassa);
      v_goal := greatest(ceil(v_goal / round_to) * round_to, round_to);
      select count(*) into v_count from public.region_projects where region = rec.region;
      select k.kind, k.name into v_kind, v_name from public.project_kinds() k
      where k.n = (v_count + rec.i::int - 1) % 6 + 1;
      insert into public.region_projects (region, kind, name, goal, deadline)
      values (rec.region, v_kind, v_name, v_goal,
              now() + make_interval(days => coalesce((c ->> 'deadline_days')::int, 21)))
      returning id into v_id;
      rname := public.region_name(rec.region);
      perform public.chat_event(format('Nytt fellesprosjekt i %s: «%s». Alle med verk i regionen kan gi fra konsernkassa.',
                                       rname, v_name));
      for g in select distinct s.user_id from public.region_strengths() s where s.region = rec.region and s.activity > 0 loop
        perform public.push_enqueue(g.user_id, 'konsern', format('fellesprosjekt:%s:apen', v_id),
          format('Nytt fellesprosjekt i %s', rname),
          format('«%s» trenger penger fra konsernene i regionen. Den som gir mest, blir hovedbidragsyter.', v_name),
          'konsern');
      end loop;
      n := n + 1;
      ok := ok + 1;
    exception when others then
      failed := failed + 1;
      perform public.world_job_unit_error('fellesprosjekter', 'ny:' || rec.region, sqlerrm);
    end;
  end loop;

  perform public.world_job_finish('fellesprosjekter', ok, failed);
  return n;
end;
$$;
revoke execute on function public.projects_settle() from public, anon, authenticated;

-- Merkene: «Hovedbidragsyter» og «Fellesprosjekt» (minst 10 % av målet) er varige, fra prosjekter som ble ferdige
create or replace function public.badges_of(uid uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct b order by b), '{}'::text[])
  from (
    select 'reform'::text as b from public.economy_reform_log l where l.user_id = uid and l.model not like 'reform 2%'
    union
    select x.badge from public.badges x where x.user_id = uid
    union
    select 'regionmester' from public.region_masters m where m.user_id = uid
    union
    select 'hovedbidragsyter' from public.region_projects p where p.status = 'ferdig' and p.top1_user = uid
    union
    select 'fellesprosjekt' from public.region_project_gifts g join public.region_projects p on p.id = g.project_id
    where p.status = 'ferdig' and g.user_id = uid
      and g.amount >= p.goal * coalesce((public.projects_cfg() ->> 'badge_share')::numeric, 0.1)
  ) m;
$$;

-- Verdenskartet som i 151, nå med fellesprosjektene per region
create or replace function public.world_map()
returns json
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'ikke logget inn';
  end if;
  return (
    with s as (select * from public.region_strengths())
    select json_build_object(
      'regions', (select json_agg(json_build_object(
          'id', r,
          'master', (select json_build_object('nick', coalesce(pm.nickname, 'Ukjent'), 'strength', m.strength,
                                              'since', m.since, 'mine', m.user_id = uid)
                     from public.region_masters m join public.profiles pm on pm.id = m.user_id
                     where m.region = r and m.user_id is not null),
          'players', coalesce((
            select json_agg(json_build_object(
                     'nick', coalesce(pr.nickname, 'Ukjent'), 'title', public.title_for(k.user_id, 0),
                     'mine', k.user_id = uid, 'stalverk', x.stalverk, 'storverk', x.storverk, 'kompleks', x.kompleks,
                     'building', x.building,
                     'strength', coalesce((select s.strength from s where s.region = r and s.user_id = k.user_id), 0))
                   order by (k.user_id = uid) desc,
                     coalesce((select s.strength from s where s.region = r and s.user_id = k.user_id), 0) desc,
                     x.kompleks desc, x.storverk desc, x.stalverk desc, lower(pr.nickname))
            from public.konsern k
            join public.profiles pr on pr.id = k.user_id
            cross join lateral (
              select count(*) filter (where p ->> 'type' = 'stalverk') as stalverk,
                     count(*) filter (where p ->> 'type' = 'storverk') as storverk,
                     count(*) filter (where p ->> 'type' = 'kompleks') as kompleks,
                     count(*) filter (where p -> 'project' ->> 'kind' = 'bygg') as building
              from jsonb_array_elements(k.plants) p where p ->> 'region' = r) x
            where x.stalverk + x.storverk + x.kompleks > 0 and pr.flagged_at is null and not coalesce(pr.banned, false)),
            '[]'::json),
          'companies', coalesce((
            select json_agg(json_build_object('id', c.id, 'type', c.type, 'name', c.name,
                     'owner', (select nickname from public.profiles where id = c.owner_id), 'mine', c.owner_id = uid)
                   order by c.id)
            from public.companies c where c.active and c.region = r), '[]'::json),
          -- Fellesprosjektet som er åpent, og de som er ferdige (bygningene på kartet, B-508)
          'project', (select json_build_object('id', p.id, 'name', p.name, 'goal', p.goal, 'total', p.total,
                                               'deadline', p.deadline)
                      from public.region_projects p where p.region = r and p.status = 'apen' limit 1),
          'built', coalesce((
            select json_agg(json_build_object('name', p.name, 'kind', p.kind, 'nick', coalesce(pt.nickname, 'Ukjent'),
                                              'at', p.settled_at, 'mine', p.top1_user = uid) order by p.settled_at)
            from public.region_projects p left join public.profiles pt on pt.id = p.top1_user
            where p.region = r and p.status = 'ferdig'), '[]'::json))
        order by i) from unnest(public.konsern_regions()) with ordinality as t(r, i))));
end;
$function$;

-- Jobben går hvert 10. minutt, så standardregelen i world_health (20 minutter) holder
select cron.unschedule('fellesprosjekter') where exists (select 1 from cron.job where jobname = 'fellesprosjekter');
select cron.schedule('fellesprosjekter', '*/10 * * * *', $$ select public.projects_settle() $$);
