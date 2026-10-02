-- B-431: grunnlaget for etterbetalingen (utkast 112) frosset 2.10.2026, før eierens beslutning om beløpet.
--
-- Utkast 112 leste levende tabeller (saves, konsern, ordrene, tidslinja, posteringene, målingene, aktiviteten og
-- config), så summen kunne endre seg fra kjøring til kjøring etter hvert som spillerne spilte videre. Nå tas alt 112
-- trenger, i én transaksjon, inn i tabeller med prefikset `basis_112_` – bare for spillerne med ferdige konsernordre
-- før 2.10 (de eneste som kan få noe). Tabellene endres aldri; 112 leser bare dem og de rene funksjonene
-- (`dividend_from_state`, `dividend_to_treasury`, `world_day`). Funksjonene leser `config.world.dividend`, så 112
-- stopper hvis den er endret siden grunnlaget ble tatt (`basis_112_meta.config_world`).
-- Ingen penger flyttes. Tabellene har RLS uten regler og ingen tilgang for spillerne, som de andre `basis_`-tabellene.

create table public.basis_112_meta as
select now() as taken_at, (select value from public.config where id = 'world') as config_world;

create table public.basis_112_users as
select distinct ko.user_id from public.konsern_orders ko
where ko.status = 'ferdig' and ko.kind in ('bygg', 'modernisering', 'utbygging')
  and ko.ready_at < timestamptz '2026-10-02 00:00+02';

-- Alle ordrene til spillerne (også etter 2.10): 112 angrer dem fra den nyeste for å finne verket slik det var
create table public.basis_112_orders as
select o.* from public.konsern_orders o join public.basis_112_users u using (user_id);

-- Det lagrede spillet med serverens verk (det `save_game` skriver inn), slik det var da grunnlaget ble tatt
create table public.basis_112_state as
select s.user_id, jsonb_set(s.state, '{konsern,plants}', k.plants) as state
from public.saves s join public.konsern k on k.user_id = s.user_id join public.basis_112_users u on u.user_id = s.user_id;

create table public.basis_112_snapshots as
select sn.user_id, sn.at from public.snapshots sn join public.basis_112_users u using (user_id)
where sn.at >= timestamptz '2026-09-29 00:00+02';

create table public.basis_112_ledger as
select l.user_id, l.at, l.kind, l.ref from public.treasury_ledger l join public.basis_112_users u using (user_id)
where l.at >= timestamptz '2026-09-29 00:00+02';

create table public.basis_112_samples as
select c.* from public.contribution_samples c join public.basis_112_users u using (user_id)
where c.day in (date '2026-09-30', date '2026-10-01');

create table public.basis_112_dividends as
select d.* from public.dividends d join public.basis_112_users u using (user_id)
where d.day in (date '2026-09-30', date '2026-10-01');

-- Politikken og aktiviteten slik serveren regner dem nå, for dagene som betales etter
create table public.basis_112_factors as
select u.user_id, dg.day, public.policy_keep(u.user_id) as keep, public.activity_factor(u.user_id, dg.day) as act
from public.basis_112_users u cross join (values (date '2026-09-30'), (date '2026-10-01')) as dg(day);

do $$
declare
  t text;
begin
  foreach t in array array['basis_112_meta', 'basis_112_users', 'basis_112_orders', 'basis_112_state',
                           'basis_112_snapshots', 'basis_112_ledger', 'basis_112_samples', 'basis_112_dividends',
                           'basis_112_factors'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
