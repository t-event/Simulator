# Åpne spørsmål og forslag

Ting som ble funnet i gjennomgangen i økt 87 (B-141), men som brukeren bør bestemme, og forslag til videre
utvikling. Når et punkt er avgjort: skriv en beslutning i `BESLUTNINGER.md` og stryk punktet her (eller flytt det
til «Avgjort» nederst).

## Spørsmål til brukeren

Fra den nye hovedretningen (B-180, `RETNING.md` avsnitt 13):

1. **Økonomireformen:** modell A (k = 0,35) eller B (k = 0,45), og hva gjøres med datterverkene (12–14 komplekser på
   trinn 5 tjener 5–6 mrd. per spilldøgn)? Se dry-run i `RETNING.md` avsnitt 9.
2. **Konsernkassen:** er det greit at penger fra eget spill bare kan flyttes inn i verdenen mellom spillerne i et
   begrenset tempo per virkelige døgn?
3. **Sesongene:** skal automatisk Sesong 2 (2027-03-25) skrus av nå, og skal tida fram til reformen hete
   «Grunnleggeræraen»?
4. **Varsler ved overtakelser:** holder varsel inne i appen (72 timer), eller trengs e-post (krever egen
   e-postleverandør)?
5. **Første tildeling** av en strategisk bedrift: anbud med tak på budet, eller noe annet?
6. **Aktiv spiller:** er «minst 2 av de siste 14 dagene» greit i starten?
7. **Nytt navn på «Alle tider»** når Hall of Fame kommer?

## Venter

- **Vern mot lekkede passord:** brukeren sa det var skrudd på, men sikkerhetsrådene i Supabase melder det fortsatt av
  (2026-09-26, økt 108). Sjekk under Authentication → «Leaked password protection» at det er lagret.

- **Toppliste for kontrollrommet** («beste kontrollrom-charge»): brukeren liker idéen, men den skal vente til
  kontrollrommet er ferdig utviklet (B-143).
- **Glemt passord** er ikke testet med ekte e-post ennå (brukeren, 2026-09-26). Ekte innlogging virker. Test det
  neste gang: «Glemt passord?» på kontokortet → koden i e-posten → nytt passord. Husk grensen på ca. 2 e-poster i timen.

## Forslag – spillet

- **Trender i markedet** («etterspørselen etter armering øker») som styrer hvilke kontrakter som dukker opp (se
  `DESIGN.md`).

## Forslag – nett og konkurranse

- **Fase 4 og 5** i `PLAN-NETT.md` (ventetid, anbud og auksjoner) står på vent og vurderes inn i `RETNING.md` (B-180).
- **Egen e-postleverandør** for kodene (glemt passord), så grensen på ca. 2 e-poster i timen forsvinner. Brukeren
  sa «en annen gang».
- **Sjekk av første opplasting:** spill som kobles til en konto sent (f.eks. dag 610), sjekkes ikke av juksesperren
  før koblingen. En fornuftssjekk mot det testspilleren klarer på samme døgn (økt 108). «Koblet til på dag N» står nå
  på topplista (B-170).
- **Varsel på mobilen** når et anbud er avgjort, et verk er ferdig bygget (fase 4–5) eller dagens belønning er klar.
  Krever konto. Brukeren: «Ingen varsel på mobilen enda» (B-149).

## Avgjort

- Sesong 2 starter av seg selv når Sesong 1 er over, og alle spillene blir med videre (B-167).

- Varsel for alle ovner uten skrap, quiz for sesongkapitlet, «slaggen» overalt og kundevurdering 1–10 (B-161).
- Ukens toppliste er bygget som «Ukens utfordring» (B-152).

- Nytt spill+ er fjernet (B-141).
- «Avslutt veiledningen» blir stående – nye spillere kan avslutte veiledningen (B-143).
- Flere enheter samtidig: bare enheten som spilles på, lagrer; den andre settes på pause med «Spill her» (B-143).
- Sesongresultat ved kallenavnet og «Dine sesonger» på topplista (B-143).
