-- Stålverket: den ekte dagen skifter ved midnatt norsk tid, ikke UTC (B-369).
--
-- Utbyttet, bidraget, skraplagerets inntekt, målingene, aktive dager og produksjonsdagene regnet dagen i UTC, så pengene
-- for en dag kom kl. 02:00 norsk sommertid. Eieren vil ha dem ved midnatt. Alle funksjonene bruker nå world_today() /
-- world_day(), og byttet gjøres med tekst-erstatning i definisjonene (samme logikk som før, bare ny tidssone).

create or replace function public.world_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Oslo')::date;
$$;

create or replace function public.world_day(p_at timestamptz)
returns date
language sql
stable
set search_path = ''
as $$
  select (p_at at time zone 'Europe/Oslo')::date;
$$;

do $$
declare
  f record;
  def text;
begin
  for f in
    select p.oid, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname in ('active_players', 'company_control', 'contribution_now', 'maint_rate_estimate', 'meter_register',
                        'note_activity', 'pay_company_income', 'pay_contributions', 'pay_dividends',
                        'sample_contributions', 'takeover_attack', 'takeover_window', 'world_status')
  loop
    def := pg_get_functiondef(f.oid);
    def := replace(def, '(now() at time zone ''utc'')::date', 'public.world_today()');
    def := replace(def, '(p_at at time zone ''utc'')::date', 'public.world_day(p_at)');
    def := replace(def, 'min(from_at at time zone ''utc'')::date', 'public.world_day(min(from_at))');
    def := replace(def, 'at time zone ''utc''', 'at time zone ''Europe/Oslo''');
    if def ~* 'time zone ''utc''' then
      raise exception 'UTC igjen i %', f.proname;
    end if;
    execute def;
  end loop;
end;
$$;
