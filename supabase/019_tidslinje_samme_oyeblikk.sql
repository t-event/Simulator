-- B-162: tidslinja fikk tonn fra senere døgn enn dagen (appen leste tallene etter at lagringen var ferdig), og
-- juksesperren flagget en ærlig spiller for «117598 tonn på 1 døgn». Appen er rettet. Sperren ser nå også på snittet
-- fra minst tre døgn tilbake, så gamle utgaver av appen ikke flagger noen før de har oppdatert seg.

create or replace function public.check_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prev record;
  cap numeric;
  maxeq numeric;
  reason text;
  bonus numeric;
  pct numeric;
  back record;
begin
  if exists (
    select 1 from public.snapshots
    where user_id = new.user_id and day > new.day + 1 and (season_id is not distinct from new.season_id)
  ) then
    if new.day > 2 then
      update public.profiles set rewound_at = now() where id = new.user_id;
    end if;
    delete from public.snapshots
    where user_id = new.user_id and day > new.day and (season_id is not distinct from new.season_id);
  end if;

  select day, equity, produced_t into prev
  from public.snapshots
  where user_id = new.user_id and day < new.day
    and (season_id is not distinct from new.season_id)
  order by day desc
  limit 1;

  select coalesce(d.bonus_days, 0) into bonus from public.daily d where d.user_id = new.user_id;
  bonus := coalesce(bonus, 0);

  cap := case new.stage
    when 0 then 100000
    when 1 then 600000
    when 2 then 2500000
    when 3 then 20000000
    else 1500000000
  end;
  maxeq := case new.stage
    when 0 then 1000000
    when 1 then 6000000
    when 2 then 50000000
    when 3 then 250000000
    else null
  end;

  if maxeq is not null and new.equity > maxeq then
    reason := format('konsernverdi %s på nivå %s', new.equity, new.stage);
  end if;
  -- Etter sluttmålet (10 mrd.) kan kjøp av stålkomplekser og modernisering gi et stort hopp på ett døgn (B-150)
  pct := case when new.stage >= 4 and coalesce(prev.equity, 0) >= 10000000000 then 0.5 else 0.25 end;
  if prev.day is not null
     and (new.equity - prev.equity) > (cap + pct * greatest(prev.equity, 0)) * (greatest(new.day - prev.day, 1) + bonus) then
    reason := format('vekst %s på %s døgn (+%s døgn belønning), nivå %s', new.equity - prev.equity, new.day - prev.day, bonus, new.stage);
  end if;
  -- Tonn (B-158): tre likestrømsovner på 420 t med alt utstyr lager ca. 40 000 t i døgnet, og et «døgn» mellom to
  -- lagringer kan inneholde nesten to døgns produksjon. 100 000 per døgn stopper bare urimelige tall.
  -- B-162: eldre utgaver av appen kunne sende tonn fra noen døgn senere enn dagen. Derfor må også snittet fra en
  -- lagring minst tre døgn tilbake være for høyt før spilleren flagges
  if prev.day is not null and prev.produced_t is not null and new.produced_t is not null
     and (new.produced_t - prev.produced_t) > 100000 * greatest(new.day - prev.day, 1) then
    select day, produced_t into back
    from public.snapshots
    where user_id = new.user_id and day <= new.day - 3 and produced_t is not null
      and (season_id is not distinct from new.season_id)
    order by day desc
    limit 1;
    if back.day is null or (new.produced_t - back.produced_t) > 100000 * (new.day - back.day) then
      reason := format('%s tonn på %s døgn', new.produced_t - prev.produced_t, new.day - prev.day);
    end if;
  end if;

  if reason is not null then
    update public.profiles
    set flagged_at = now(), flag_reason = reason
    where id = new.user_id and flagged_at is null;
  end if;

  if bonus > 0 then
    update public.daily set bonus_days = 0 where user_id = new.user_id;
  end if;

  update public.profiles set league = public.league_of(new.stage, new.equity) where id = new.user_id;
  return new;
end;
$$;

-- Tonnflagg der snittet over noen døgn rundt flagget er normalt, oppheves (feilen i appen, ikke juks)
update public.profiles p
set flagged_at = null, flag_reason = null
where p.flag_reason like '% tonn på % døgn'
  and exists (
    select 1
    from public.snapshots a
    join public.snapshots b on b.user_id = a.user_id and (b.season_id is not distinct from a.season_id)
    where a.user_id = p.id
      and b.day - a.day between 2 and 10
      and a.at <= p.flagged_at and b.at >= p.flagged_at
      and a.produced_t is not null and b.produced_t is not null
      and (b.produced_t - a.produced_t) <= 100000 * (b.day - a.day)
  );
