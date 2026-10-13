-- B-487: kamp om regionene – regionmester på verdenskartet.
-- Eieren (13.10): «Vi trenger mer å gjøre i spillet. De fleste har kommet så langt at man bare driver å moderniserer
-- verkene sine og ingenting mer.» Regionene (B-333) hadde nesten ingen virkning. Nå har hver region en regionmester:
-- det aktive konsernet med sterkest verk der. Det gir valg om hvor man bygger og flytter verk, og en tittel andre kan
-- ta fra en. Ingen penger: styrken er en avledet verdi (B-180), og tittelen gir bare ære (merke, Skiftrapporten).
--
-- Styrken til et konsern i en region: per ferdig verk 12 (stålkompleks), 4 (storverk) eller 1 (stålverk), ganget med
-- 1 + 0,25 × trinnet – samme forhold som grunnutbyttet og trinnøkningen (B-304) – og så med aktiviteten
-- (`activity_factor`, B-327), så et forlatt konsern ikke holder en region. Verk som bygges, teller ikke ennå.
-- Speilet i `regionPoints` (game/regions.ts).
--
-- Regionmesteren byttes bare når en annen er strengt sterkere enn den som har tittelen (likt: den som har den,
-- beholder den). Jobben `regionmester` (cron hvert 10. minutt) gjør byttet, skriver i Skiftrapporten og varsler den som
-- mistet tittelen og den som fikk den. Flaggede, sperrede og gjester er ikke med.

create table if not exists public.region_masters (
  region text primary key,
  user_id uuid references public.profiles(id) on delete set null,
  strength numeric not null default 0,
  since timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.region_masters enable row level security;

create table if not exists public.region_master_log (
  id bigserial primary key,
  region text not null,
  user_id uuid references public.profiles(id) on delete set null,
  prev_user uuid references public.profiles(id) on delete set null,
  strength numeric not null default 0,
  at timestamptz not null default now()
);
alter table public.region_master_log enable row level security;
create index if not exists region_master_log_user_idx on public.region_master_log (user_id);
create index if not exists region_master_log_prev_idx on public.region_master_log (prev_user);
create index if not exists region_masters_user_idx on public.region_masters (user_id);

-- Navnet på regionen med vanlige ord (som REGIONS i game/regions.ts)
create or replace function public.region_name(p_region text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_region
    when 'nord' then 'Nordkysten' when 'jern' then 'Jernåsen' when 'ost' then 'Østskogen'
    when 'sor' then 'Sørsletta' when 'vest' then 'Vestbukta' when 'oy' then 'Øyene' else 'en region' end;
$$;

-- Styrken ett ferdig verk gir i regionen sin (før aktiviteten)
create or replace function public.region_points(p_type text, p_level numeric)
returns numeric
language sql
immutable
set search_path = public
as $$
  select (case p_type when 'kompleks' then 12 when 'storverk' then 4 else 1 end)
         * (1 + 0.25 * greatest(coalesce(p_level, 0), 0));
$$;

-- Styrken til hvert konsern i hver region der det har ferdige verk
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
  select per.region, per.user_id, per.raw, act.f, round(per.raw * act.f, 1)
  from per join act on act.user_id = per.user_id;
$$;
revoke execute on function public.region_strengths() from public, anon, authenticated;

-- Bytter regionmester der en annen er blitt sterkere, og sier fra
create or replace function public.region_masters_refresh()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  nick text;
  rname text;
  changed integer := 0;
  ok integer := 0;
  failed integer := 0;
  stamp bigint := extract(epoch from now())::bigint;
begin
  perform public.world_job_start('regionmester');
  for rec in
    with s as (select * from public.region_strengths()),
    regs as (select unnest(public.konsern_regions()) as region)
    select g.region,
           t.user_id as top_user, coalesce(t.strength, 0) as top_strength,
           m.user_id as cur_user,
           coalesce((select s.strength from s where s.region = g.region and s.user_id = m.user_id), 0) as cur_strength
    from regs g
    left join public.region_masters m on m.region = g.region
    left join lateral (
      select s.user_id, s.strength from s where s.region = g.region and s.strength > 0
      order by s.strength desc, s.user_id limit 1
    ) t on true
  loop
    begin
      rname := public.region_name(rec.region);
      if rec.top_user is not null
         and rec.top_user is distinct from rec.cur_user
         and (rec.cur_user is null or rec.top_strength > rec.cur_strength) then
        insert into public.region_masters (region, user_id, strength, since, updated_at)
        values (rec.region, rec.top_user, rec.top_strength, now(), now())
        on conflict (region) do update
          set user_id = excluded.user_id, strength = excluded.strength, since = now(), updated_at = now();
        insert into public.region_master_log (region, user_id, prev_user, strength)
        values (rec.region, rec.top_user, rec.cur_user, rec.top_strength);
        select coalesce(nickname, 'Et konsern') into nick from public.profiles where id = rec.top_user;
        perform public.chat_event(format('%s er ny regionmester i %s.', nick, rname));
        perform public.push_enqueue(rec.top_user, 'konsern', format('regionmester:%s:%s:ny', rec.region, stamp),
          format('Du er regionmester i %s', rname),
          'Konsernet ditt har de sterkeste verkene i regionen. Andre kan ta tittelen ved å bygge og modernisere der.',
          'kart');
        if rec.cur_user is not null then
          perform public.push_enqueue(rec.cur_user, 'konsern', format('regionmester:%s:%s:tapt', rec.region, stamp),
            format('Du har mistet %s', rname),
            format('%s er ny regionmester. Bygg eller moderniser verk der for å ta tittelen tilbake.', nick),
            'kart');
        end if;
        changed := changed + 1;
      elsif rec.cur_user is not null and rec.cur_strength <= 0 and rec.top_user is null then
        -- Ingen har verk som teller i regionen lenger: tittelen står ledig
        update public.region_masters set user_id = null, strength = 0, since = now(), updated_at = now()
        where region = rec.region;
        insert into public.region_master_log (region, user_id, prev_user, strength)
        values (rec.region, null, rec.cur_user, 0);
        changed := changed + 1;
      elsif rec.cur_user is not null then
        update public.region_masters set strength = rec.cur_strength, updated_at = now()
        where region = rec.region and strength is distinct from rec.cur_strength;
      end if;
      ok := ok + 1;
    exception when others then
      failed := failed + 1;
      perform public.world_job_unit_error('regionmester', rec.region, sqlerrm);
    end;
  end loop;
  perform public.world_job_finish('regionmester', ok, failed);
  return changed;
end;
$$;
revoke execute on function public.region_masters_refresh() from public, anon, authenticated;

-- Merket «regionmester» på topplista så lenge spilleren har minst én region
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
  ) m;
$$;

-- Verdenskartet med styrken per spiller og regionmesteren per region
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
            from public.companies c where c.active and c.region = r), '[]'::json))
        order by i) from unnest(public.konsern_regions()) with ordinality as t(r, i))));
end;
$function$;

-- Jobben i world_health: går hvert 10. minutt, så standardregelen (20 minutter) holder
select cron.unschedule('regionmester') where exists (select 1 from cron.job where jobname = 'regionmester');
select cron.schedule('regionmester', '*/10 * * * *', $$ select public.region_masters_refresh() $$);
