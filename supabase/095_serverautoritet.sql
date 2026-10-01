-- 095 Serverautoritet, trinn 1 (B-395): typevakt på lagringene, harde regler for forskning og felles funksjoner,
-- og en skyggelogg som skiller mellom det mobilen hevder, det serveren mener er mulig og det serveren bruker.
--
-- Harde regler (på med én gang – ingen av dagens 22 lagringer brytes, sjekket 30.9):
--   * lagringer med feil type i felt serveren leser for alle spillere (nivå, omdømme, lån, konsern åpnet, forskning,
--     felles funksjoner, døgnregnskapet) avvises. Før kunne én lagring med tekst der et tall skulle stå, stoppe målingene
--     og utbetalingene for alle;
--   * felles funksjoner og konsernforskning telles som unike – før ga samme id flere ganger ekstra utbytte for hver kopi;
--   * forskning teller bare med forutsetningene (standardverk ← konsernstyring, stort konsern ← oppkjøp,
--     grønt konsern ← konsernstyring + grønt stål);
--   * mesterskapet i utbyttet har standard 0 når config mangler (det er 0 i config, B-328).
-- Skygge (bare logg, ingen virkning før eieren har sett tallene etter 2.10): margin, omdømme, kvalitet, tilgang, tonn og
-- nye forsknings-/funksjonskrav etter grunnlaget.

-- 1. Typevakt ---------------------------------------------------------------------------------------------------------

create or replace function public.jnum_ok(v jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select v is null or jsonb_typeof(v) in ('number', 'null');
$$;

create or replace function public.jobj_nums_ok(v jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when v is null or jsonb_typeof(v) = 'null' then true
    when jsonb_typeof(v) <> 'object' then false
    else not exists (select 1 from jsonb_each(v) e where jsonb_typeof(e.value) not in ('number', 'null'))
  end;
$$;

/** Felt i lagringen som har feil type, blant dem serveren leser for alle spillere (tom liste = i orden) */
create or replace function public.state_type_problems(s jsonb)
returns text[]
language plpgsql
immutable
set search_path = public
as $$
declare
  p text[] := '{}';
  h jsonb;
begin
  if s is null or jsonb_typeof(s) <> 'object' then
    return array['state'];
  end if;
  if not public.jnum_ok(s -> 'stage') then p := p || 'stage'::text; end if;
  if not public.jnum_ok(s -> 'reputation') then p := p || 'reputation'::text; end if;
  if not public.jnum_ok(s -> 'loan') then p := p || 'loan'::text; end if;
  if not public.jnum_ok(s -> 'controlBest') then p := p || 'controlBest'::text; end if;
  if s ? 'mastery' and jsonb_typeof(s -> 'mastery') not in ('object', 'null') then
    p := p || 'mastery'::text;
  elsif not public.jnum_ok(s -> 'mastery' -> 'datterverk') then
    p := p || 'mastery.datterverk'::text;
  end if;
  if s ? 'researched' and jsonb_typeof(s -> 'researched') not in ('array', 'null') then
    p := p || 'researched'::text;
  end if;
  if s ? 'konsern' and jsonb_typeof(s -> 'konsern') not in ('object', 'null') then
    p := p || 'konsern'::text;
  elsif jsonb_typeof(s -> 'konsern') = 'object' then
    if jsonb_typeof(s -> 'konsern' -> 'unlocked') not in ('boolean', 'null') then p := p || 'konsern.unlocked'::text; end if;
    if jsonb_typeof(s -> 'konsern' -> 'shared') not in ('array', 'null') then p := p || 'konsern.shared'::text; end if;
  end if;
  if s ? 'history' then
    if jsonb_typeof(s -> 'history') not in ('array', 'null') then
      p := p || 'history'::text;
    elsif jsonb_typeof(s -> 'history') = 'array' then
      for h in select value from jsonb_array_elements(s -> 'history') loop
        if jsonb_typeof(h) <> 'object' then
          p := p || 'history[]'::text;
          exit;
        end if;
        if not (public.jnum_ok(h -> 'producedT') and public.jnum_ok(h -> 'onGradeT') and public.jnum_ok(h -> 'offGradeT')
                and public.jnum_ok(h -> 'secondT') and public.jobj_nums_ok(h -> 'income')
                and public.jobj_nums_ok(h -> 'costs')) then
          p := p || 'history.tall'::text;
          exit;
        end if;
      end loop;
    end if;
  end if;
  return p;
end;
$$;

create or replace function public.saves_type_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  p text[];
begin
  p := public.state_type_problems(new.state);
  if cardinality(p) > 0 then
    raise exception 'ugyldig lagring: feil type i %', array_to_string(p, ', ') using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists saves_type_guard on public.saves;
create trigger saves_type_guard before insert or update of state on public.saves
for each row execute function public.saves_type_guard();

revoke execute on function public.state_type_problems(jsonb) from public, anon;
revoke execute on function public.saves_type_guard() from public, anon, authenticated;

-- 2. Harde regler i utbyttet og kjøpene ---------------------------------------------------------------------------

/** Konsernforskning som påvirker verden og teller – med forutsetningene oppfylt (B-395) */
create or replace function public.world_research(r jsonb)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(array_agg(x order by x), '{}') from (
    select distinct x from jsonb_array_elements_text(case when jsonb_typeof(r) = 'array' then r else '[]'::jsonb end) x
    where (x = 'konsernstyring')
       or (x = 'oppkjop')
       or (x = 'standardverk' and r ? 'konsernstyring')
       or (x = 'storkonsern' and r ? 'oppkjop')
       or (x = 'gronnkonsern' and r ? 'konsernstyring' and r ? 'gronnstal')
  ) q;
$$;

/** Felles funksjoner som teller: unike, og bare kjente */
create or replace function public.world_shared(v jsonb)
returns text[]
language sql
immutable
set search_path = public
as $$
  select coalesce(array_agg(x order by x), '{}') from (
    select distinct x from jsonb_array_elements_text(case when jsonb_typeof(v) = 'array' then v else '[]'::jsonb end) x
    where x in ('innkjop', 'salg')
  ) q;
$$;

do $$
declare
  d text := pg_get_functiondef('public.dividend_from_state(jsonb)'::regprocedure);
  o text := d;
begin
  -- Unike felles funksjoner (før: count(*), så samme id flere ganger ga mer)
  d := replace(d,
    $a$(select count(*) from jsonb_array_elements_text(coalesce(s -> 'konsern' -> 'shared', '[]'::jsonb)) x
        where x in ('innkjop', 'salg')) as shared_n,$a$,
    $a$cardinality(public.world_shared(s -> 'konsern' -> 'shared')) as shared_n,$a$);
  -- Konsernforskning: unik og med forutsetningene
  d := replace(d,
    $a$(select count(*) from jsonb_array_elements_text(coalesce(s -> 'researched', '[]'::jsonb)) x
        where x in ('konsernstyring', 'gronnkonsern')) as research_n,$a$,
    $a$(select count(*) from unnest(public.world_research(s -> 'researched')) x
        where x in ('konsernstyring', 'gronnkonsern')) as research_n,$a$);
  -- Mesterskapet er av (B-328): standard 0, ikke 0,3, hvis config mangler
  d := replace(d, $a$coalesce((w.d ->> 'mastery_max')::numeric, 0.3) as mastery_max$a$,
                  $a$coalesce((w.d ->> 'mastery_max')::numeric, 0) as mastery_max$a$);
  if d = o or position('world_shared' in d) = 0 or position('world_research' in d) = 0
     or position($a$'mastery_max')::numeric, 0) as$a$ in d) = 0 then
    raise exception 'dividend_from_state: fant ikke teksten som skulle byttes';
  end if;
  execute d;
end;
$$;

do $$
declare
  d text := pg_get_functiondef('public.konsern_order(text,integer,text,text)'::regprocedure);
  o text := d;
begin
  -- Stort konsern (plasser) krever oppkjøp, standardverk (rabatt) krever konsernstyring – som i appen
  d := replace(d, $a$big := researched ? 'storkonsern';$a$,
                  $a$big := researched ? 'storkonsern' and researched ? 'oppkjop';$a$);
  d := replace(d, $a$modd := case when researched ? 'standardverk' then$a$,
                  $a$modd := case when researched ? 'standardverk' and researched ? 'konsernstyring' then$a$);
  if d = o or position($a$? 'storkonsern' and researched ? 'oppkjop'$a$ in d) = 0
     or position($a$? 'standardverk' and researched ? 'konsernstyring'$a$ in d) = 0 then
    raise exception 'konsern_order: fant ikke teksten som skulle byttes';
  end if;
  execute d;
end;
$$;

revoke execute on function public.world_research(jsonb) from public, anon;
revoke execute on function public.world_shared(jsonb) from public, anon;

-- 3. Grunnlag og skyggelogg -----------------------------------------------------------------------------------------

/** Forskning og felles funksjoner serveren har sett hos hver spiller, og når de dukket opp første gang */
create table if not exists public.world_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  first_seen_at timestamptz not null default now(),
  basis text not null,
  primary key (user_id, key)
);
alter table public.world_claims enable row level security;
revoke all on public.world_claims from anon, authenticated;

/** Avvik: det mobilen hevder, det serveren mener er mulig, og det serveren bruker – én rad per spiller, dag og verdi */
create table if not exists public.world_input_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  key text not null,
  claimed jsonb,
  allowed jsonb,
  used jsonb,
  flags text[] not null,
  n int not null default 1,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (user_id, day, key)
);
alter table public.world_input_log enable row level security;
revoke all on public.world_input_log from anon, authenticated;

-- Grunnlaget: det dagens spillere har, godtas som det er (B-395, eierens punkt D)
insert into public.world_claims (user_id, key, first_seen_at, basis)
select s.user_id, 'forskning:' || x, now(), 'grunnlag 2026-09-30'
from public.saves s, unnest(public.world_research(s.state -> 'researched')) x
on conflict do nothing;
insert into public.world_claims (user_id, key, first_seen_at, basis)
select s.user_id, 'felles:' || x, now(), 'grunnlag 2026-09-30'
from public.saves s, unnest(public.world_shared(s.state -> 'konsern' -> 'shared')) x
on conflict do nothing;

/** Marginen slik den er i døgnregnskapet, uten taket og uten gulvet (til skyggeloggen) */
create or replace function public.contribution_margin_raw(s jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select coalesce((value -> 'contribution' ->> 'window')::int, 30) as win
    from public.config where id = 'world'
  ),
  h as (
    select x.h from c, lateral (
      select h from jsonb_array_elements(coalesce(s -> 'history', '[]'::jsonb)) with ordinality as t(h, i)
      order by i desc limit c.win) x
  ),
  sums as (
    select
      sum(coalesce((h -> 'income' ->> 'kontrakt')::numeric, 0) + coalesce((h -> 'income' ->> 'spot')::numeric, 0)) as inn,
      sum(coalesce((h -> 'costs' ->> 'skrap')::numeric, 0) + coalesce((h -> 'costs' ->> 'energi')::numeric, 0)
          + coalesce((h -> 'costs' ->> 'forbruk')::numeric, 0) + coalesce((h -> 'costs' ->> 'lonn')::numeric, 0)
          + coalesce((h -> 'costs' ->> 'vedlikehold')::numeric, 0) + coalesce((h -> 'costs' ->> 'bot')::numeric, 0)
          + coalesce((h -> 'costs' ->> 'faste')::numeric, 0) + coalesce((h -> 'costs' ->> 'nett')::numeric, 0)) as ut,
      sum(coalesce((h ->> 'producedT')::numeric, 0)) as t
    from h
  )
  select jsonb_build_object('margin', case when t > 0 then round((inn - ut) / t) end,
                            'income_per_t', case when t > 0 then round(inn / t) end,
                            't', round(t))
  from sums;
$$;
revoke execute on function public.contribution_margin_raw(jsonb) from public, anon, authenticated;

/**
 * Skyggerevisjonen for én spiller (B-395): én rad per verdi som påvirker Industriverdenen, med det mobilen hevder,
 * det serveren mener er mulig, det serveren faktisk bruker, klassen (hard / plausibel / klient) og flagg.
 */
create or replace function public.world_input_audit(p_user uuid)
returns table (key text, klass text, claimed jsonb, allowed jsonb, used jsonb, flags text[])
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s jsonb;
  cap numeric;
  raw jsonb;
  used_margin numeric;
  prev_margin numeric;
  rate numeric;
  rep numeric;
  claimed_r text[];
  allowed_r text[];
  claimed_s text[];
  new_keys text[];
  stage_ok boolean;
begin
  select state into s from public.saves where user_id = p_user;
  if s is null then
    return;
  end if;
  select coalesce((value -> 'contribution' ->> 'margin_cap')::numeric, 3000) into cap from public.config where id = 'world';

  -- Konsernforskning: hevdet (unike, kjente id-er) mot tillatt (med forutsetninger); nye etter grunnlaget flagges
  select coalesce(array_agg(distinct x order by x), '{}') into claimed_r
  from jsonb_array_elements_text(case when jsonb_typeof(s -> 'researched') = 'array' then s -> 'researched' else '[]' end) x
  where x in ('konsernstyring', 'oppkjop', 'standardverk', 'storkonsern', 'gronnkonsern');
  allowed_r := public.world_research(s -> 'researched');
  select coalesce(array_agg(x order by x), '{}') into new_keys from unnest(allowed_r) x
  where not exists (select 1 from public.world_claims c where c.user_id = p_user and c.key = 'forskning:' || x
                      and c.basis like 'grunnlag%');
  key := 'forskning'; klass := 'hard (forutsetninger) / klient (om den er forsket)';
  claimed := to_jsonb(claimed_r); allowed := to_jsonb(allowed_r); used := to_jsonb(allowed_r);
  flags := array_remove(array[
    case when claimed_r <> allowed_r then 'mangler_forutsetning' end,
    case when cardinality(new_keys) > 0 then 'ny_etter_grunnlag' end], null);
  return next;

  -- Felles funksjoner
  claimed_s := public.world_shared(s -> 'konsern' -> 'shared');
  select coalesce(array_agg(x order by x), '{}') into new_keys from unnest(claimed_s) x
  where not exists (select 1 from public.world_claims c where c.user_id = p_user and c.key = 'felles:' || x
                      and c.basis like 'grunnlag%');
  key := 'felles'; klass := 'hard (unike) / klient (om den er kjøpt)';
  claimed := s -> 'konsern' -> 'shared'; allowed := to_jsonb(claimed_s); used := to_jsonb(claimed_s);
  flags := array_remove(array[
    case when jsonb_typeof(s -> 'konsern' -> 'shared') = 'array'
              and jsonb_array_length(s -> 'konsern' -> 'shared') > cardinality(claimed_s) then 'duplikat_eller_ukjent' end,
    case when cardinality(new_keys) > 0 then 'ny_etter_grunnlag' end], null);
  return next;

  -- Omdømme (flaggskipet): klientverdi med harde grenser
  rep := (s ->> 'reputation')::numeric;
  key := 'omdomme'; klass := 'klient (grenser 0–100)';
  claimed := to_jsonb(rep); allowed := '[0, 100]'::jsonb; used := to_jsonb(least(100, greatest(0, coalesce(rep, 0))));
  flags := array_remove(array[case when rep < 0 or rep > 100 then 'utenfor_grense' end], null);
  return next;

  -- Tilgang: nivå 4 og konsernet åpnet – kryssjekk mot tidslinja serveren har tatt imot over tid
  stage_ok := exists (select 1 from public.snapshots x where x.user_id = p_user and x.stage >= 4);
  key := 'tilgang'; klass := 'klient + kryssjekk mot tidslinja';
  claimed := jsonb_build_object('stage', s -> 'stage', 'unlocked', s -> 'konsern' -> 'unlocked');
  allowed := jsonb_build_object('stage4_i_tidslinja', stage_ok);
  used := jsonb_build_object('tilgang', coalesce((s ->> 'stage')::int, 0) >= 4
                                        and coalesce((s -> 'konsern' ->> 'unlocked')::boolean, false));
  flags := array_remove(array[
    case when coalesce((s -> 'konsern' ->> 'unlocked')::boolean, false) and not stage_ok then 'uten_tidslinje' end,
    case when coalesce((s -> 'konsern' ->> 'unlocked')::boolean, false) and coalesce((s ->> 'stage')::int, 0) < 4
         then 'umulig_kombinasjon' end], null);
  return next;

  -- Marginen i konsernbidraget: hevdet (uten tak) mot taket, og mot det serveren registrerte i går
  raw := public.contribution_margin_raw(s);
  used_margin := public.contribution_margin(s);
  select sum_margin / nullif(n, 0) into prev_margin from public.contribution_samples
  where user_id = p_user and day = public.world_today() - 1;
  rate := public.meter_normal_rate(p_user);
  key := 'margin'; klass := 'klient (tak ' || cap || ' kr/t) + kryssjekk mot tonn og i går';
  claimed := raw; allowed := jsonb_build_object('tak', cap, 'i_gar', round(prev_margin));
  used := to_jsonb(round(used_margin));
  flags := array_remove(array[
    case when (raw ->> 'margin')::numeric > cap then 'over_tak' end,
    case when prev_margin is not null and used_margin > prev_margin * 1.5 and used_margin - prev_margin > 500 then 'hopp' end,
    case when (raw ->> 'income_per_t')::numeric > 9000 then 'hoy_inntekt_per_t' end,
    case when used_margin > 0 and rate <= 0 then 'uten_tonn' end], null);
  return next;

  -- Tonn per spilldøgn (målt av serveren fra tidslinja, med fartskontrollen)
  key := 'tonn'; klass := 'plausibel (tidslinja og fartskontrollen)';
  claimed := to_jsonb(round(rate)); allowed := '40000'::jsonb; used := to_jsonb(round(rate));
  flags := array_remove(array[case when rate > 40000 then 'over_grense' end], null);
  return next;
end;
$$;
revoke execute on function public.world_input_audit(uuid) from public, anon, authenticated;

/** Kjøres med målingene hvert kvarter: logger avvik og registrerer nye krav. Feiler aldri målingene (B-395) */
create or replace function public.world_input_audit_run()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  u uuid;
  today date := public.world_today();
begin
  for u in
    select s.user_id from public.saves s join public.profiles p on p.id = s.user_id
    where p.flagged_at is null and not p.banned and not public.user_is_guest(s.user_id)
      and coalesce((s.state ->> 'stage')::int, 0) >= 4
  loop
    insert into public.world_input_log as l (user_id, day, key, claimed, allowed, used, flags)
    select u, today, a.key, a.claimed, a.allowed, a.used, a.flags
    from public.world_input_audit(u) a where cardinality(a.flags) > 0
    on conflict (user_id, day, key) do update
      set claimed = excluded.claimed, allowed = excluded.allowed, used = excluded.used,
          flags = (select array_agg(distinct f) from unnest(l.flags || excluded.flags) f),
          n = l.n + 1, last_at = now();
    -- Nye krav etter grunnlaget: tidspunktet serveren så dem første gang
    insert into public.world_claims (user_id, key, basis)
    select u, 'forskning:' || x, 'ny' from public.saves s, unnest(public.world_research(s.state -> 'researched')) x
    where s.user_id = u
    on conflict do nothing;
    insert into public.world_claims (user_id, key, basis)
    select u, 'felles:' || x, 'ny' from public.saves s, unnest(public.world_shared(s.state -> 'konsern' -> 'shared')) x
    where s.user_id = u
    on conflict do nothing;
  end loop;
  delete from public.world_input_log where day < today - 60;
end;
$$;
revoke execute on function public.world_input_audit_run() from public, anon, authenticated;

do $$
declare
  d text := pg_get_functiondef('public.sample_contributions()'::regprocedure);
  o text := d;
begin
  d := replace(d, $a$  delete from public.contribution_samples where day < today - 20;$a$,
                  $a$  delete from public.contribution_samples where day < today - 20;
  -- Skyggerevisjonen av verdiene fra mobilen (B-395): feiler den, går målingene likevel
  begin
    perform public.world_input_audit_run();
  exception when others then
    raise warning 'world_input_audit_run: %', sqlerrm;
  end;$a$);
  if d = o then
    raise exception 'sample_contributions: fant ikke teksten som skulle byttes';
  end if;
  execute d;
end;
$$;
