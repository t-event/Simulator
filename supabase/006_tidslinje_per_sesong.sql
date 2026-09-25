-- Tidslinja skiller sesongspill fra andre spill (B-138). Kjørt som migrasjonen «tidslinje_per_sesong».
-- Før kunne dag 5 i et sesongspill overskrive dag 5 i det gamle spillet på samme konto, fordi nøkkelen bare var
-- (konto, dag).
alter table public.snapshots add column if not exists season_key int generated always as (coalesce(season_id, 0)) stored;
alter table public.snapshots drop constraint if exists snapshots_pkey;
alter table public.snapshots add constraint snapshots_pkey primary key (user_id, season_key, day);

-- Engangsopprydding (allerede kjørt): én feilaktig sesongrad fra et spill som ble koblet før spilleren hadde valgt.
