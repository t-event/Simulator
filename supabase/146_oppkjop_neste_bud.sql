-- B-480: «Nye bud fra …» viste bare det første hinderet. `takeover_window` ga datoen for vernet (3 dager) eller pausen
-- (14 dager etter et avverget bud) – den som slo til først i rekkefølgen – mens budet avvises til begge er over
-- (`company_protected_until`). Fornyes en konsesjon mens pausen etter et avverget bud fortsatt gjelder, overlapper de: f.eks.
-- vern til 16.10 og pause til 19.10 ga «Nye bud fra 16.10», og et bud 16.10 ble avvist.
--
-- Nå er datoen `company_protected_until` for begge grunnene. Varer hindrene til budene uansett stenger før konsesjonen går
-- ut (`last_days`), er grunnen `sent` («vent på det nye anbudet») i stedet for en dato ingen kan by på.
-- Endret i den levende funksjonen med replace(), som 114/115/119.

do $do$
declare
  d text := pg_get_functiondef('public.takeover_window(integer,uuid)'::regprocedure);
  o text := d;
begin
  d := replace(d, $a$  reason text;
begin$a$, $a$  reason text;
  pu timestamptz;
begin$a$);
  d := replace(d, $a$    else null end;
  return json_build_object($a$, $a$    else null end;
  -- Neste mulige bud: når både vernet og pausen er over (B-480)
  if reason in ('vern', 'pause') then
    pu := public.company_protected_until(p_company);
    if c.concession_until is not null and pu >= c.concession_until then
      reason := 'sent';
    end if;
  end if;
  return json_build_object($a$);
  d := replace(d, $a$    'from', case
      when reason = 'vern' then since + make_interval(days => public.takeover_cfg_num('protect_days', 3)::int)
      when reason = 'pause' then (select max(resolved_at) from public.takeovers where company_id = p_company
                                  and status = 'avverget')
                                 + make_interval(days => public.takeover_cfg_num('cooldown_days', 14)::int) end,$a$,
                  $a$    'from', case when reason in ('vern', 'pause') then pu end,$a$);
  if d = o or position('pu timestamptz;' in d) = 0 or position('company_protected_until(p_company)' in d) = 0
     or position($a$'from', case when reason in ('vern', 'pause') then pu end,$a$ in d) = 0 then
    raise exception 'takeover_window: ikke alle bitene ble byttet';
  end if;
  execute d;
end;
$do$;
