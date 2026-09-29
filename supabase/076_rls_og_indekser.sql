-- Stålverket: tilgangsreglene regner ut innloggingen én gang per spørring, og fremmednøkler får indeks (B-360).
-- Rådene fra Supabase (auth_rls_initplan, unindexed_foreign_keys): `auth.uid()` rett i regelen regnes ut for hver rad;
-- `(select auth.uid())` regnes ut én gang. Reglene er ellers de samme.

alter policy "daglig: les egen" on public.daily using (user_id = (select auth.uid()));
alter policy "profil: les egen" on public.profiles using (id = (select auth.uid()));
alter policy "rekord: les egen" on public.records using (user_id = (select auth.uid()));
alter policy "spill: eget" on public.saves using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "tidslinje: les egen" on public.snapshots using (user_id = (select auth.uid()));
alter policy "tidslinje: oppdater egen" on public.snapshots
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "tidslinje: skriv egen" on public.snapshots with check (user_id = (select auth.uid()));

create index if not exists guest_handover_guest_id_idx on public.guest_handover (guest_id);
create index if not exists project_guard_log_user_id_idx on public.project_guard_log (user_id);
create index if not exists season_points_season_id_idx on public.season_points (season_id);
create index if not exists season_results_user_id_idx on public.season_results (user_id);
create index if not exists season_track_claims_season_id_idx on public.season_track_claims (season_id);
create index if not exists seasons_twist_idx on public.seasons (twist);
create index if not exists takeovers_owner_id_idx on public.takeovers (owner_id);
create index if not exists weekly_results_user_id_idx on public.weekly_results (user_id);
