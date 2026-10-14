-- B-490: varsel om venner. Eieren 14.10: «Hva skal man med vennelista om den ikke brukes til noe» – valgte varsler.
-- Den som har noen på vennelista (B-462), får beskjed på mobilen (nytt tema `venner`) når en venn
--   1. går forbi en på konsernlista (konsern_value_cache, jobben `venner` hvert 10. minutt, høyst én gang per venn og dag),
--   2. blir regionmester (trigger på region_master_log),
--   3. tar over et strategisk selskap (trigger på company_owners, ikke når samme eier fortsetter).
-- Alt dette står alt på topplista, kartet og i Skiftrapporten for alle – ingen hemmelige tall. Den som følges, får
-- fortsatt ingen beskjed (enveis, B-462). Flaggede og sperrede venner varsles det ikke om.

create or replace function public.push_kinds()
returns text[]
language sql
immutable
set search_path = public
as $$ select array['oppkjop', 'anbud', 'konsern', 'melding', 'venner'] $$;

-- Hvem som lå foran hvem sist jobben så på lista (bare par der den ene følger den andre)
create table if not exists public.friend_rank_state (
  user_id uuid not null references public.profiles(id) on delete cascade,
  follow_id uuid not null references public.profiles(id) on delete cascade,
  ahead boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, follow_id)
);
alter table public.friend_rank_state enable row level security;
create index if not exists friend_rank_state_follow_idx on public.friend_rank_state (follow_id);

-- Følgerne som kan få varsel om en spiller (aktiv på lista, og spilleren er ikke flagget eller sperret)
create or replace function public.friend_followers(p_user uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select f.user_id from public.follows f
  join public.profiles p on p.id = f.follow_id and p.flagged_at is null and not coalesce(p.banned, false)
  where f.follow_id = p_user and f.active and f.user_id <> p_user;
$$;
revoke execute on function public.friend_followers(uuid) from public, anon, authenticated;

-- 1. Gikk forbi deg på konsernlista
create or replace function public.friends_push_scan()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
  ok int := 0;
  failed int := 0;
  today date := public.world_today();
begin
  perform public.world_job_start('venner');
  for r in
    with v as (
      select c.user_id, c.value, rank() over (order by c.value desc) as place
      from public.konsern_value_cache c
      join public.profiles p on p.id = c.user_id and p.flagged_at is null and not coalesce(p.banned, false)
      where c.eligible and c.value > 0)
    select f.user_id as me, f.follow_id as friend, vf.value > vm.value as ahead, vf.place as friend_place,
           vm.place as my_place, s.ahead as was_ahead, pf.nickname as nick
    from public.follows f
    join v vm on vm.user_id = f.user_id
    join v vf on vf.user_id = f.follow_id
    join public.profiles pf on pf.id = f.follow_id
    left join public.friend_rank_state s on s.user_id = f.user_id and s.follow_id = f.follow_id
    where f.active and f.user_id <> f.follow_id
  loop
    begin
      if r.was_ahead is null or r.was_ahead is distinct from r.ahead then
        insert into public.friend_rank_state (user_id, follow_id, ahead, updated_at)
        values (r.me, r.friend, r.ahead, now())
        on conflict (user_id, follow_id) do update set ahead = excluded.ahead, updated_at = now();
        if r.was_ahead = false and r.ahead then
          perform public.push_enqueue(r.me, 'venner', format('venn-forbi:%s:%s:%s', r.me, r.friend, today),
            format('%s gikk forbi deg', coalesce(r.nick, 'En venn')),
            format('%s er nå nr. %s på konsernlista, og du er nr. %s.', coalesce(r.nick, 'Vennen din'), r.friend_place, r.my_place),
            'konsern');
          n := n + 1;
        end if;
      end if;
      ok := ok + 1;
    exception when others then
      failed := failed + 1;
      perform public.world_job_unit_error('venner', r.me::text, sqlerrm);
    end;
  end loop;
  perform public.world_job_finish('venner', ok, failed);
  return n;
end;
$$;
revoke execute on function public.friends_push_scan() from public, anon, authenticated;

-- 2. Ble regionmester
create or replace function public.friends_on_region_master()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  f uuid;
  nick text;
begin
  if new.user_id is null then
    return new;
  end if;
  select nickname into nick from public.profiles where id = new.user_id;
  for f in select * from public.friend_followers(new.user_id) loop
    perform public.push_enqueue(f, 'venner', format('venn-region:%s:%s', new.id, f),
      format('%s er regionmester', coalesce(nick, 'En venn')),
      format('%s har de sterkeste verkene i %s nå.', coalesce(nick, 'Vennen din'), public.region_name(new.region)),
      'kart');
  end loop;
  return new;
end;
$$;
revoke execute on function public.friends_on_region_master() from public, anon, authenticated;
create or replace trigger friends_on_region_master after insert on public.region_master_log
  for each row execute function public.friends_on_region_master();

-- 3. Tok over et selskap (ny eier, ikke samme eier som fortsetter etter et nytt anbud)
create or replace function public.friends_on_company_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  f uuid;
  nick text;
  co text;
  prev uuid;
begin
  if new.user_id is null then
    return new;
  end if;
  select o.user_id into prev from public.company_owners o
  where o.company_id = new.company_id and o.from_at < new.from_at
  order by o.from_at desc limit 1;
  if prev is not distinct from new.user_id then
    return new;
  end if;
  select nickname into nick from public.profiles where id = new.user_id;
  select lower(name) into co from public.companies where id = new.company_id;
  for f in select * from public.friend_followers(new.user_id) loop
    perform public.push_enqueue(f, 'venner',
      format('venn-selskap:%s:%s:%s', new.company_id, extract(epoch from new.from_at)::bigint, f),
      case when new.from_at > now() + interval '1 minute'
           then format('%s vant anbudet på %s', coalesce(nick, 'En venn'), coalesce(co, 'et selskap'))
           else format('%s eier nå %s', coalesce(nick, 'En venn'), coalesce(co, 'et selskap')) end,
      case when new.from_at > now() + interval '1 minute'
           then format('Overtar %s. Se selskapet under Konsern → Industrien.', public.chat_when(new.from_at))
           else 'Se selskapet under Konsern → Industrien.' end,
      'industri');
  end loop;
  return new;
end;
$$;
revoke execute on function public.friends_on_company_owner() from public, anon, authenticated;
create or replace trigger friends_on_company_owner after insert on public.company_owners
  for each row execute function public.friends_on_company_owner();

-- Temaet er på som standard (B-467): enheter som har varsler på, får `venner` med
update public.push_subscriptions set kinds = array_append(kinds, 'venner'), updated_at = now()
where active and not ('venner' = any (kinds));

-- Jobben i world_health: går hvert 10. minutt, så standardregelen (20 minutter) holder
select cron.schedule('venner', '*/10 * * * *', $$ select public.friends_push_scan() $$);
