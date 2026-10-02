-- B-423: rapportgrunnlaget for 2.10 tatt vare på urørt (kopier, aldri endret), før utbytterettingen (111).
-- Lagt inn 2.10.2026 ca. 12:00 UTC. treasury er et øyeblikksbilde fra kopitidspunktet; kassene ved dagsslutt regnes
-- fra basis_20261002_treasury_ledger (summen stemte på krona mot treasury da kopien ble tatt).
create table if not exists public.basis_20261002_contribution_samples as
  select * from public.contribution_samples where day <= date '2026-10-01';
create table if not exists public.basis_20261002_dividends as
  select * from public.dividends where day <= date '2026-10-01';
create table if not exists public.basis_20261002_contributions as
  select * from public.contributions where day <= date '2026-10-01';
create table if not exists public.basis_20261002_company_income as
  select * from public.company_income where day <= date '2026-10-01';
create table if not exists public.basis_20261002_treasury_ledger as
  select * from public.treasury_ledger where at < timestamptz '2026-10-02 00:00:00+02';
create table if not exists public.basis_20261002_treasury as
  select *, now() as copied_at from public.treasury;
create table if not exists public.basis_20261002_konsern_orders as
  select * from public.konsern_orders;
alter table public.basis_20261002_contribution_samples enable row level security;
alter table public.basis_20261002_dividends enable row level security;
alter table public.basis_20261002_contributions enable row level security;
alter table public.basis_20261002_company_income enable row level security;
alter table public.basis_20261002_treasury_ledger enable row level security;
alter table public.basis_20261002_treasury enable row level security;
alter table public.basis_20261002_konsern_orders enable row level security;
revoke all on public.basis_20261002_contribution_samples, public.basis_20261002_dividends,
  public.basis_20261002_contributions, public.basis_20261002_company_income, public.basis_20261002_treasury_ledger,
  public.basis_20261002_treasury, public.basis_20261002_konsern_orders from anon, authenticated;
