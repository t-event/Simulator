-- B-219: Granes rekorder på «Alle tider» (Hall of Fame) lagt tilbake (2026-09-27).
--
-- Den gamle kontoen til Grane ble slettet med «Slett konto», og en ny konto med samme brukernavn ble laget kl. 22.05
-- (UTC). Rekordene, tidslinja og sikkerhetskopiene følger kontoen og ble slettet med den (B-217).
--
-- Eieren: «Hall of fame til [Grane] skal jo være rundt 8500 mrd. men det er jo ikke det han faktisk skal ha på sin
-- bruker i sesongen nå». Bare rekordraden endres – spillet, kassa (11,29 mrd.) og sesonglista står.
-- Tallene er de siste kjente fra den gamle kontoen: konsernverdi 8 562,6 mrd. dag 2 190 (rekorden etter B-213), kasse
-- 8 285,9 mrd. dag 2 190, storverk og «ferdig» (10 mrd.) dag 610, omdømme 100 dag 610. update_records bruker
-- greatest/least, så nye tall kan bare forbedre rekordene. «Koblet til på dag» regnes fra tidslinja og står på 2 273.

do $$
declare
  uid uuid := (select id from public.profiles where nickname = 'Grane');
begin
  if uid is null then
    raise exception 'Fant ikke spilleren';
  end if;
  update public.records
  set best_equity_day = case when best_equity < 8562614856251 then 2190 else best_equity_day end,
      best_equity = greatest(best_equity, 8562614856251),
      best_cash_day = case when best_cash < 8285899956251 then 2190 else best_cash_day end,
      best_cash = greatest(best_cash, 8285899956251),
      best_rep_day = case when best_rep <= 100 then least(best_rep_day, 610) else best_rep_day end,
      best_rep = greatest(best_rep, 100),
      best_stage = greatest(best_stage, 4),
      storverk_day = least(coalesce(storverk_day, 610), 610),
      ferdig_day = least(coalesce(ferdig_day, 610), 610),
      updated_at = now()
  where user_id = uid;
  if not found then
    raise exception 'Ingen rekordrad';
  end if;
  if (select best_equity from public.records where user_id = uid) <> 8562614856251
     or (select storverk_day from public.records where user_id = uid) <> 610
     or (select (state->>'cash')::numeric from public.saves where user_id = uid) > 20000000000 then
    raise exception 'Kontrollen feilet – ingenting er endret';
  end if;
end $$;
