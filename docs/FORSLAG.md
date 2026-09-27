# Åpne spørsmål og forslag

Ting som ble funnet i gjennomgangen i økt 87 (B-141), men som brukeren bør bestemme, og forslag til videre
utvikling. Når et punkt er avgjort: skriv en beslutning i `BESLUTNINGER.md` og stryk punktet her (eller flytt det
til «Avgjort» nederst).

## Spørsmål til brukeren

- **Mange lager ikke konto (B-210).** Anbefaling i tre steg – eieren velger:
  1. **Automatisk gjestekonto** (Supabase «anonymous sign-ins»): alle får en konto i bakgrunnen første gang spillet åpnes,
     med lagring på nett, kallenavn og toppliste. «Sikre kontoen» med e-post og passord kan gjøres når som helst, og da
     beholdes spillet. Fjerner hele terskelen. Krever at eieren slår på «Allow anonymous sign-ins» under Authentication i
     dashbordet (connectoren kan ikke), og at KONTO.md og B-149 skiller mellom gjestekonto og sikret konto (f.eks. at
     konsernkassa og anbud krever sikret konto).
  2. **Vis hva man går glipp av i riktig øyeblikk** (gradvis synlighet): «Du ville vært nr. 3 på topplista», «Daglig
     belønning venter» – ett kort med én knapp når det faktisk betyr noe, ikke en tekstvegg på startskjermen.
  3. **Logg inn med Google/Apple** senere, hvis gjestekonto ikke er nok. Krever oppsett i dashbordet og hos Google/Apple.


## Venter

- **Bunden konsernreserve (B-193)** er midlertidig. Når økonomien i sluttspillet er rebalansert: bestem hva reserven blir
  (konverteres etter ny modell, blir en funksjon, eller utbetales gradvis) og fjern eller juster grensen på 100 mrd.
  Avgjør også om reserven fortsatt skal telle i konsernverdien.

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

- **Varsellinja på mobil** (spørsmål fra UI-1b): eieren valgte å flytte den ned over menyen – B-201.

- Økonomireformen er gjennomført med urørt gulv på 250 mill.; konsernkassa godkjent som utgangspunkt (grensene kan
  justeres); pilotkonsesjonen er 14 dager (B-186).

- Eierens svar på de sju spørsmålene fra B-180 (B-181): modell B; utbytte og konsernkostnader i datterverkene;
  konsernkasse på serveren; Sesong 2 av og Grunnleggeræraen; varsel i appen i testene og push før full lansering;
  skjult anbud i 48 timer med pilotkonsesjon; aktiv = 2 av 14 dager; «Hall of Fame»; Industrimakt skjult inntil videre.

- Sesong 2 starter av seg selv når Sesong 1 er over, og alle spillene blir med videre (B-167).

- Varsel for alle ovner uten skrap, quiz for sesongkapitlet, «slaggen» overalt og kundevurdering 1–10 (B-161).
- Ukens toppliste er bygget som «Ukens utfordring» (B-152).

- Nytt spill+ er fjernet (B-141).
- «Avslutt veiledningen» blir stående – nye spillere kan avslutte veiledningen (B-143).
- Flere enheter samtidig: bare enheten som spilles på, lagrer; den andre settes på pause med «Spill her» (B-143).
- Sesongresultat ved kallenavnet og «Dine sesonger» på topplista (B-143).
