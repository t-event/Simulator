-- 097 Ukens kontrollrom og ukeslutt (B-397): et forsøk kan ikke leveres etter at uka er over (lista er låst ved
-- midnatt norsk tid mandag), og et nytt forsøk kan ikke startes når det er mindre enn fristen (15 min) igjen av uka –
-- da rekker ethvert forsøk som startes, å bli levert før lista låses.

do $$
declare
  d text := pg_get_functiondef('public.weekly_control_start()'::regprocedure);
  o text := d;
begin
  d := replace(d, $a$  perform pg_advisory_xact_lock(hashtext('stalverk_ukekontroll_' || uid::text));$a$,
                  $a$  -- Mindre enn fristen igjen av uka: forsøket ville ikke rukket å telle (B-397)
  if ((ws + 7)::timestamp at time zone 'Europe/Oslo') - now() < make_interval(secs => max_s) then
    return json_build_object('ok', false, 'reason', 'sent_i_uka');
  end if;
  perform pg_advisory_xact_lock(hashtext('stalverk_ukekontroll_' || uid::text));$a$);
  if d = o then
    raise exception 'weekly_control_start: fant ikke teksten som skulle byttes';
  end if;
  execute d;
end;
$$;

do $$
declare
  d text := pg_get_functiondef('public.weekly_control_submit(bigint,integer,integer,jsonb)'::regprocedure);
  o text := d;
begin
  d := replace(d, $a$    el := extract(epoch from now() - a.started_at);$a$,
                  $a$    -- Uka er over og lista låst: et resultat nå ville ikke telt (B-397)
    if now() >= ((a.week_start + 7)::timestamp at time zone 'Europe/Oslo') then
      return json_build_object('ok', false, 'reason', 'uke_slutt');
    end if;
    el := extract(epoch from now() - a.started_at);$a$);
  if d = o then
    raise exception 'weekly_control_submit: fant ikke teksten som skulle byttes';
  end if;
  execute d;
end;
$$;
