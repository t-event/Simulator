-- UTKAST – IKKE KJØRT. Eieren (1.10, B-399): kjøres rett etter 2.10-rapporten, og tidspunktet dokumenteres.
-- Blir den kjørt, flyttes fila til supabase/ med neste ledige nummer.
-- Retter bare målinger og utbetalinger framover. Målingene som alt er tatt (verk målt som under bygging), og dager før
-- rettingen for den som solgte sitt siste verk, rettes av en egen etterbetaling – dry-run per spiller og dato først
-- (betalt, riktig beløp, differanse, usikkerhet), og bare med eierens godkjenning.
--
-- 099 Utbyttet for ferdige verk og for det siste verket som selges (B-397, funn 3 og 4 i kodegjennomgangen 1.10):
-- 1. Målingene hvert kvarter (`sample_contributions`) gjør ferdige byggeprosjekter ferdige først (`konsern_settle`).
--    Før ble de gjort ferdige bare når spilleren lagret, og i `pay_dividends` ved midnatt: en spiller som var borte,
--    fikk verket målt som under bygging (0 i utbytte) resten av dagen etter at det var ferdig. 1.10 gjaldt det 3 spillere.
-- 2. `pay_dividends` tar også med spillere uten verk som har målinger med utbytte som ikke er betalt – den som solgte
--    sitt siste verk før midnatt, fikk ikke utbyttet for den delen av dagen verket sto.

do $$
declare
  d text := pg_get_functiondef('public.sample_contributions()'::regprocedure);
  o text := d;
begin
  -- Etter 101 (B-401) står målingen i løkka per spiller: oppgjøret gjøres for denne spilleren, i spillerens egen
  -- deltransaksjon, så en feil hos én spiller ikke stopper målingene for de andre
  d := replace(d, $a$      insert into public.contribution_samples as c (user_id, day, n, sum_full, sum_t, sum_margin, sum_div, n_div, last_at)$a$,
                  $a$      -- Ferdige byggeprosjekter gjøres ferdige før målingen, også for den som er borte (B-397). Sjekker uten lås først
      perform public.konsern_settle(k.user_id, now()) from public.konsern k where k.user_id = u.user_id;
      insert into public.contribution_samples as c (user_id, day, n, sum_full, sum_t, sum_margin, sum_div, n_div, last_at)$a$);
  if d = o then
    raise exception 'sample_contributions: fant ikke teksten som skulle byttes';
  end if;
  execute d;
end;
$$;

do $$
declare
  d text := pg_get_functiondef('public.pay_dividends()'::regprocedure);
  o text := d;
begin
  d := replace(d, $a$      and jsonb_array_length(k.plants) > 0$a$,
                  $a$      -- Også den som har solgt sitt siste verk, men har målinger med utbytte som ikke er betalt (B-397)
      and (jsonb_array_length(k.plants) > 0
           or exists (select 1 from public.contribution_samples c
                      where c.user_id = s.user_id and c.day < today and c.sum_div > 0
                        -- Bare dager fra rettingen: eldre dager går gjennom etterbetalingen (dry-run, eierens svar)
                        and c.day >= date '2026-10-02'
                        and not exists (select 1 from public.dividends dd where dd.user_id = c.user_id and dd.day = c.day)))$a$);
  if d = o then
    raise exception 'pay_dividends: fant ikke teksten som skulle byttes';
  end if;
  execute d;
end;
$$;
