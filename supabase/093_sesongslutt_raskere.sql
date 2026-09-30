-- B-384: close_season fra 092 regnet Konsernverdien for hver rad i tidslinja før `distinct on` (tusenvis av kall) og
-- ble for treg (tidsavbrudd i dry-run). Nå velges siste tall per spiller først, og Konsernverdien regnes én gang per
-- spiller. Samme rangering: Konsernverdi, så verdien i eget verk for dem uten konsern.

create or replace function public.close_season(sid integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.season_results (season_id, user_id, nickname, equity, day, stage, plass, konsern_value, rank_by)
  select sid, r.user_id, r.nickname, r.equity, r.day, r.stage,
    (row_number() over (order by r.kv desc nulls last, r.equity desc, r.day asc))::int,
    r.kv, 'konsern'
  from (
    select l.*,
      (select round(public.konsern_value(l.user_id)) from public.saves sv
        where sv.user_id = l.user_id
          and coalesce((sv.state ->> 'stage')::int, 0) >= 4
          and coalesce((sv.state -> 'konsern' ->> 'unlocked')::boolean, false)) as kv
    from (
      select distinct on (s.user_id) s.user_id, p.nickname, s.equity, s.day, s.stage
      from public.snapshots s
      join public.profiles p on p.id = s.user_id
      where s.season_id = sid and not s.pre_reform and p.nickname is not null and not p.banned and p.flagged_at is null
      order by s.user_id, s.day desc
    ) l
  ) r
  on conflict (season_id, user_id) do nothing;
end;
$$;
revoke execute on function public.close_season(integer) from public, anon, authenticated;
