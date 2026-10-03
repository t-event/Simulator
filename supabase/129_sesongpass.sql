-- B-452: det gratis sesongpasset – raskere start på sesongstigen. Eierens forslag 3.10.2026: behold 50 trinn; trinn 1
-- krever 6 poeng i alt, trinn 2 krever 12, deretter 20 poeng per trinn (972 for trinn 50, før 1 000). Første premie kommer
-- etter én full aktivitetsdag (spilt 1 + belønning 2 + oppdrag 3) eller to dager med spill og daglig belønning.
--
-- * Poengene og hentede trinn beholdes. Den som når et nytt trinn med kurven, kan hente det som før (fagpoeng per trinn
--   uendret, 20 + 2 × trinn); et trinn som alt er hentet, gir aldri fagpoeng igjen (`season_track_claims`).
-- * `season_track` gir også `tier_at` (poengene for trinnet du står på) og `next_at` (for neste trinn, null på toppen).
--   `per_tier` = 20 står for eldre apper.
-- * Pynten på trinn 1 er i appen (`COSMETICS`, `seasonTier: 1`); den som alt har hentet trinn 1, får den uten fagpoeng.

create or replace function public.season_tier_points(p_tier integer)
returns integer
language sql
immutable
set search_path = public
as $$
  select case when p_tier <= 0 then 0 when p_tier = 1 then 6 else 12 + 20 * (p_tier - 2) end;
$$;
revoke all on function public.season_tier_points(integer) from public, anon, authenticated;

create or replace function public.season_tier_of(p_points integer)
returns integer
language sql
immutable
set search_path = public
as $$
  select case when p_points < 6 then 0 when p_points < 12 then 1 else least(50, 2 + (p_points - 12) / 20) end;
$$;
revoke all on function public.season_tier_of(integer) from public, anon, authenticated;

create or replace function public.season_track()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  sid integer;
  pts integer;
  tr integer;
  t date := public.oslo_today();
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  sid := public.current_season_id();
  if sid is null then
    return json_build_object('season_id', null);
  end if;
  pts := public.season_track_points(auth.uid(), sid);
  tr := public.season_tier_of(pts);
  return json_build_object(
    'season_id', sid,
    'points', pts,
    'per_tier', 20,
    'max_tier', 50,
    'tier', tr,
    'tier_at', public.season_tier_points(tr),
    'next_at', case when tr >= 50 then null else public.season_tier_points(tr + 1) end,
    'claimed', coalesce((select json_agg(tier order by tier) from public.season_track_claims
                         where user_id = auth.uid() and season_id = sid), '[]'::json),
    'played_today', exists (select 1 from public.snapshots s where s.user_id = auth.uid() and s.season_id = sid
                            and (s.at at time zone 'Europe/Oslo')::date = t),
    'reward_today', exists (select 1 from public.season_points p where p.user_id = auth.uid() and p.season_id = sid
                            and p.day = t and p.source = 'belonning'),
    'missions_today', exists (select 1 from public.season_points p where p.user_id = auth.uid() and p.season_id = sid
                              and p.day = t and p.source = 'oppdrag')
  );
end;
$$;

create or replace function public.claim_season_tiers()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  sid integer;
  reached integer;
  got integer[];
  total integer;
begin
  if auth.uid() is null then
    raise exception 'ikke logget inn';
  end if;
  sid := public.current_season_id();
  if sid is null then
    return json_build_object('tiers', '[]'::json, 'fp', 0);
  end if;
  reached := public.season_tier_of(public.season_track_points(auth.uid(), sid));
  with ins as (
    insert into public.season_track_claims (user_id, season_id, tier, fp)
    select auth.uid(), sid, t, 20 + 2 * t from generate_series(1, reached) t
    on conflict do nothing
    returning tier, fp
  )
  select coalesce(array_agg(tier order by tier), '{}'), coalesce(sum(fp), 0)::integer into got, total from ins;
  return json_build_object('tiers', to_json(got), 'fp', total);
end;
$$;
