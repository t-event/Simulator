-- B-382: innskuddet fra kassa hjemme til konsernkassa er stengt «fail-closed» (eieren: manglende config = 0,
-- eksplisitt 0 = 0, bare en eksplisitt framtidig beslutning kan åpne det).
--
-- Før: treasury_limit ga 100 mill. per døgn hvis nøkkelen `treasury_base_per_day` manglet i config.world, og NULL
-- (ingen grense i det hele tatt) hvis hele raden `world` manglet – `used + amt > NULL` er ikke sant, så innskuddet gikk
-- gjennom. Innskuddet var bare stengt fordi tallet tilfeldigvis sto på 0 (B-319).
--
-- Nå: grensen er 0 med mindre config.world har `treasury_deposit_enabled = true` OG et positivt
-- `treasury_base_per_day`. deposit_to_treasury avviser med 'av' før den leser eller låser noe når grensen ikke er
-- positiv. Bryteren settes ikke her; den står av (mangler) til eieren bestemmer noe annet.

create or replace function public.treasury_limit(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case
              when (w.value->>'treasury_deposit_enabled') = 'true'
                then greatest(0, coalesce((w.value->>'treasury_base_per_day')::numeric, 0))
              else 0
            end
     from public.config w where w.id = 'world'),
    0);
$$;

do $$
declare
  def text := pg_get_functiondef('public.deposit_to_treasury(numeric, bigint)'::regprocedure);
  old_check text := E'  if exists (select 1 from public.profiles where id = uid and (flagged_at is not null or banned)) then';
  new_check text := E'  -- B-382: stengt med mindre en eksplisitt bryter åpner det (grensen er 0 uten config)\n'
    || E'  if coalesce(public.treasury_limit(uid), 0) <= 0 then\n'
    || E'    return json_build_object(''ok'', false, ''reason'', ''av'', ''left'', 0);\n'
    || E'  end if;\n' || old_check;
  old_lim text := E'  if used + amt > lim then';
  new_lim text := E'  if lim is null or lim <= 0 or used + amt > lim then';
begin
  if position(old_check in def) = 0 or position(old_lim in def) = 0 then
    raise exception 'deposit_to_treasury har endret seg – sjekk før endringen';
  end if;
  def := replace(def, old_check, new_check);
  def := replace(def, old_lim, new_lim);
  execute def;
end;
$$;
