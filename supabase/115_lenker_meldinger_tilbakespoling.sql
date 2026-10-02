-- B-428: rettinger etter kodegjennomgangen 2.10 (funn 17 og 20, og to småfunn). Endrer de levende funksjonene med
-- replace(), som 114, så det som er lagt inn før, står som det er. Prøvekjørt først (rullet tilbake).
--
-- 1. Lenkefilteret i chat_send, dm_send og profile_update brukte \b som ordgrense. I PostgreSQL er \b et
--    tilbaketegn (backspace), ikke en ordgrense – den heter \y. Domener uten http/www (f.eks. «eksempel.no») slapp derfor
--    gjennom.
-- 2. dm_send: grensene (tempo, 20 per 10 minutter, 5 nye samtaler per dag) sjekkes nå etter en lås per avsender
--    (pg_advisory_xact_lock), så samtidige kall ikke kan passere dem.
-- 3. dm_overview: uleste per samtale teller ikke meldinger fra blokkerte eller eldre enn 30 dager (som dm_unread).
-- 4. Tilbakespolingen (045) tar med tidslinjetallene fra 096 (kwh_total, deliveries, missed, cancelled, complaints,
--    metric_note) når tallene flyttes til side og legges tilbake. Før kom historikken tilbake med disse feltene tomme.

alter table public.snapshots_rewound
  add column if not exists kwh_total bigint,
  add column if not exists deliveries integer,
  add column if not exists missed integer,
  add column if not exists cancelled integer,
  add column if not exists complaints integer,
  add column if not exists metric_note text[];

do $$
declare
  f text;
  d text;
  o text;
begin
  foreach f in array array['public.chat_send(text)', 'public.dm_send(text,text)', 'public.profile_update(text,text,text[],boolean)'] loop
    d := pg_get_functiondef(f::regprocedure);
    o := d;
    d := replace(d, 'xyz)\b)', 'xyz)\y)');
    if d = o then raise exception '%: fant ikke lenkefilteret', f; end if;
    execute d;
  end loop;

  d := pg_get_functiondef('public.dm_send(text,text)'::regprocedure);
  o := d;
  d := replace(d, $a$  if not public.dm_eligible(uid) then
    return json_build_object('ok', false, 'reason', 'ikke_klar');$a$,
                  $a$  -- Én sending om gangen per avsender (B-428): ellers kunne samtidige kall passere grensene under
  perform pg_advisory_xact_lock(hashtext('dm_send'), hashtext(uid::text));
  if not public.dm_eligible(uid) then
    return json_build_object('ok', false, 'reason', 'ikke_klar');$a$);
  if d = o then raise exception 'dm_send: fant ikke starten'; end if;
  execute d;

  d := pg_get_functiondef('public.dm_overview()'::regprocedure);
  o := d;
  d := replace(d, $a$where u.recipient = uid and u.sender = other and u.read_at is null and not u.hidden)$a$,
                  $a$where u.recipient = uid and u.sender = other and u.read_at is null and not u.hidden
                   and u.created_at > now() - interval '30 days' and not public.dm_blocked(uid, u.sender))$a$);
  if d = o then raise exception 'dm_overview: fant ikke uleste'; end if;
  execute d;

  d := pg_get_functiondef('public.check_snapshot()'::regprocedure);
  o := d;
  d := replace(d, 'pre_reform, maint_kr, rewind_day)',
                  'pre_reform, maint_kr, kwh_total, deliveries, missed, cancelled, complaints, metric_note, rewind_day)');
  d := replace(d, 'pre_reform, maint_kr, new.day',
                  'pre_reform, maint_kr, kwh_total, deliveries, missed, cancelled, complaints, metric_note, new.day');
  d := replace(d, 'maint_kr = excluded.maint_kr;',
                  'maint_kr = excluded.maint_kr, kwh_total = excluded.kwh_total, deliveries = excluded.deliveries, '
                  || 'missed = excluded.missed, cancelled = excluded.cancelled, complaints = excluded.complaints, '
                  || 'metric_note = excluded.metric_note;');
  d := replace(d, 'boost_min, pre_reform, maint_kr)',
                  'boost_min, pre_reform, maint_kr, kwh_total, deliveries, missed, cancelled, complaints, metric_note)');
  d := regexp_replace(d, 'pre_reform, maint_kr(\s+)from public\.snapshots_rewound',
                      'pre_reform, maint_kr, kwh_total, deliveries, missed, cancelled, complaints, metric_note\1from public.snapshots_rewound');
  if (length(d) - length(o)) < 300 then raise exception 'check_snapshot: fant ikke alle stedene'; end if;
  execute d;
end $$;
