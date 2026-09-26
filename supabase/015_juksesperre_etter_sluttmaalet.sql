-- Stålverket: juksesperren etter sluttmålet (B-150). Kjørt som migrasjonen «juksesperre_etter_sluttmaalet».
--
-- Ved 50 mrd. åpner stålkompleksene. Kjøper man flere og moderniserer dem samme døgn, øker konsernverdien mer enn 25 %
-- på ett døgn, fordi et verk er verdt litt mer enn det koster (B-121). Etter 10 mrd. tillates derfor 50 % per døgn.
-- Ellers som i 013.

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

  select day, equity into prev
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
