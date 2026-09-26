-- B-167: når en sesong er over, starter neste automatisk (26 uker), og alle spillene blir med over (i appen).
-- season_status() kalles av appen hvert minutt; den lukker sesongen som er over (close_season) og starter den neste.

create or replace function public.season_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  cur record;
  prev record;
  ended record;
  tw record;
  played boolean := false;
  latest record;
  next_start timestamptz;
begin
  for ended in
    select s.id from public.seasons s
    where s.ends_at <= now() and not exists (select 1 from public.season_results r where r.season_id = s.id)
  loop
    perform public.close_season(ended.id);
  end loop;

  -- B-167: er sesongen over, starter neste av seg selv, 26 uker fra der den forrige sluttet. Låsen hindrer at to
  -- spillere som spør samtidig, starter hver sin
  if not exists (select 1 from public.seasons where now() >= starts_at and now() < ends_at) then
    perform pg_advisory_xact_lock(hashtext('stalverk_neste_sesong'));
    select id, ends_at into latest from public.seasons order by ends_at desc limit 1;
    if latest.id is not null and latest.ends_at <= now()
       and not exists (select 1 from public.seasons where now() >= starts_at and now() < ends_at) then
      -- Har ingen spilt på over et halvt år, starter den nye nå i stedet for i fortida
      next_start := case when latest.ends_at + make_interval(weeks => 26) > now() then latest.ends_at else now() end;
      insert into public.seasons (name, starts_at, ends_at)
      values ('Sesong ' || ((select count(*) from public.seasons) + 1), next_start,
              next_start + make_interval(weeks => 26));
    end if;
  end if;

  select id, name, starts_at, ends_at, twist into cur
  from public.seasons where now() >= starts_at and now() < ends_at
  order by starts_at desc limit 1;

  if cur.id is not null then
    select id into prev from public.seasons where ends_at <= cur.starts_at order by ends_at desc limit 1;
    if prev.id is not null and auth.uid() is not null then
      played := exists (select 1 from public.snapshots where user_id = auth.uid() and season_id = prev.id);
    end if;
    select * into tw from public.season_twists where id = cur.twist;
  end if;

  return json_build_object(
    'current', case when cur.id is null then null else json_build_object(
      'id', cur.id, 'name', cur.name, 'starts_at', cur.starts_at, 'ends_at', cur.ends_at,
      'twist', case when tw.id is null then null else json_build_object(
        'id', tw.id, 'title', tw.title, 'text', tw.text, 'scrap', tw.scrap, 'steel', tw.steel, 'power', tw.power) end
    ) end,
    'played_previous', played
  );
end;
$$;
