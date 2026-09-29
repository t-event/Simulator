-- Stålverket: sesonglista «Konsernverdi» etter reform 2 (B-306, eierens beskjed 2026-09-29 01:20 UTC).
--
-- Sesonglista bruker det siste tidslinjetallet hver spiller har lastet opp. Tre av de fire største hadde ikke åpnet
-- spillet etter reformen, så lista viste 704–874 mrd. (kasse 100 + gammel reserve + verk) mot 154 for den som spilte.
-- Her legges ett ferskt tidslinjetall inn per konserneier, regnet av det lagrede spillet med appens regel:
-- konsernverdi = kasse − lån + verkene (grunntall × (1 + 0,25 × trinn) × felles funksjoner × konsernforskning × 60 døgn,
-- prosjekter regnes som ferdige, uten mesterskap og stålpris – som sisterValue i game/konsern.ts). Raden for samme dag
-- oppdateres (primærnøkkel user_id, season_key, day). Juksesperren og målerne hoppes over (stalverk.restore).
-- Tørrkjørt først: tallene stemte på øret med dem som alt hadde lastet opp med den nye appen (153,6 / 57,8 / 19,0).

do $$
declare r record; n int := 0; eq numeric; v numeric;
begin
  perform set_config('stalverk.restore', 'on', true);
  for r in
    select s.user_id, s.state
    from public.saves s join public.profiles p on p.id = s.user_id
    where not p.banned and p.flagged_at is null and (s.state->>'stage')::int = 4
      and jsonb_array_length(coalesce(s.state->'konsern'->'plants','[]'::jsonb)) > 0
  loop
    select coalesce(sum(
      case pt when 'stalverk' then 5000000 when 'storverk' then 20000000 when 'kompleks' then 60000000 else 0 end
      * (1 + 0.25 * lv) * (1 + 0.05 * sh) * power(1.1, rs) * 60), 0)
    into v
    from (
      select
        case when x->'project'->>'kind' = 'utbygging' then 'storverk' else x->>'type' end as pt,
        case when x->'project'->>'kind' = 'utbygging' then 0
             when x->'project'->>'kind' = 'modernisering' then coalesce((x->>'level')::int,0) + 1
             else coalesce((x->>'level')::int,0) end as lv,
        (select count(*) from jsonb_array_elements_text(coalesce(r.state->'konsern'->'shared','[]'::jsonb)) y where y in ('innkjop','salg')) as sh,
        (select count(*) from jsonb_array_elements_text(coalesce(r.state->'researched','[]'::jsonb)) y where y in ('konsernstyring','gronnkonsern')) as rs
      from jsonb_array_elements(r.state->'konsern'->'plants') x
    ) q;
    eq := (r.state->>'cash')::numeric - coalesce((r.state->>'loan')::numeric,0) + v;
    insert into public.snapshots (user_id, day, cash, equity, stage, client_version, reputation, season_id, produced_t, game_min, boost_min, maint_kr, pre_reform)
    values (r.user_id, floor((r.state->>'minute')::numeric/1440)::int + 1, round((r.state->>'cash')::numeric), round(eq), 4, 'server-B-306',
            round((r.state->>'reputation')::numeric, 1), 1, round((r.state->'totals'->>'producedT')::numeric), floor((r.state->>'minute')::numeric),
            floor(coalesce((r.state->>'boostMin')::numeric,0)), round(coalesce((r.state->'totals'->>'maintKr')::numeric,0)), false)
    on conflict (user_id, season_key, day) do update
      set cash = excluded.cash, equity = excluded.equity, at = now(), client_version = excluded.client_version, pre_reform = false;
    n := n + 1;
  end loop;
  raise notice 'Sesonglista rettet: % konserneiere', n;
end $$;
