# Hva krever konto?

Vedtatt i B-149 (2026-09-26). Reglene under avgjør om en funksjon krever konto. Ny funksjon: gå gjennom reglene,
skriv svaret i beslutningen (B-xxx) og legg funksjonen inn i tabellen her. Krever den konto, legges den også i
`ACCOUNT_FEATURES` i `frontend/src/net/features.ts`, så appen bruker samme tekst overalt.

## Reglene

1. **Selve spillet krever aldri konto.** Kampanjen fra garasje til konsern, fagboka, quizene, forskningen,
   kontrollrommet og alt annet som bare skjer i ditt eget spill, skal virke uten konto og uten nett.
2. **Det som lagres på nett, krever konto.** Lagring på nett, flere enheter og alt som skal huskes på serveren.
3. **Det som sammenlignes med eller deles med andre spillere, krever konto.** Topplister, sesonger, merker ved
   kallenavnet, anbud, auksjoner, venner og klubber.
4. **Det som belønner virkelig tid, krever konto.** Daglig belønning, dagens oppdrag, «mens du var borte» og alt
   annet som gir noe for dager eller timer i virkeligheten. Klokka på mobilen kan stilles, så serveren må telle.
5. **Ventetid (fase 4) krever ikke konto.** Med konto kommer tida fra serveren. Uten konto brukes klokka på mobilen.
   Da kan man bare jukse i sitt eget spill, og det er ikke med i konkurransen (PLAN-NETT, fase 4).
6. **Uten konto skjules ikke funksjonen.** Den vises med en kort forklaring om at den krever konto, og en knapp for å
   logge inn. Kontoen er frivillig, men det skal være tydelig hva man får med den.
7. **Det som avgjør noe mellom spillere, avgjøres på serveren**, aldri i appen (anbud, auksjoner, sesongresultat).

Tvilstilfeller: spør brukeren. Er det ikke avklart, velg «krever konto» for alt som gir en fordel på topplista.

## Oversikt

| Funksjon | Krever konto | Hvorfor | Beslutning |
| --- | --- | --- | --- |
| Spille kampanjen, fagbok, quiz, forskning, kontrollrom, konsern | Nei | Regel 1 | – |
| Felles hendelser (skrapmangel, strømkrise …) | Nei | Gjelder alle spill, også uten konto; hentes uten innlogging | B-129 |
| Se topplista | Nei | Motiverer, bare lesing | B-127 |
| Automatisk oppdatering av appen | Nei | Gjelder alle | B-148 |
| Lagring på nett, flere enheter | Ja | Regel 2 | B-125, B-140 |
| Stå på topplista, kallenavn | Ja | Regel 3 | B-127 |
| Sesonger, sesongresultat, 🎖 ved kallenavnet | Ja | Regel 3 | B-129, B-143 |
| Daglig belønning (sju dager) | Ja | Regel 4 | B-149 |
| Dagens oppdrag | Ja | Regel 4 (bonusen én gang per virkelig dag) | B-149 |
| Mens du var borte | Ja | Regel 4 | B-149 |
| Mesterskap (forskning som tas om og om igjen) | Nei | Regel 1 | B-150 |
| Stålmilepæler og titler i spillet | Nei | Regel 1 | B-150 |
| Tittel ved kallenavnet på topplista | Ja | Regel 3 | B-150 |
| Prestasjoner (merker på Verket) | Nei | Regel 1 | B-151 |
| Pynt i anleggsbildet (for fagpoeng) | Nei | Regel 1, gir ingen fordel | B-151 |
| Merker eller pynt vist for andre spillere (senere) | Ja | Regel 3 | B-151 |
| Fortsett i samme fart etter et hendelseskort | Nei | Regel 1 | B-160 |
| Kundevurdering 1–10 og sesongquiz | Nei (sesongquizen krever sesong, men teller ikke i prestasjonene) | Regel 1 | B-161 |
| Lærlinger tar fagbrev | Nei | Regel 1 | B-163 |
| Ventetid i konsernet (fase 4) | Nei (serverklokke med konto) | Regel 5 | PLAN-NETT |
| Anbud og skrapauksjoner (fase 5) | Ja | Regel 3 og 7 | PLAN-NETT |
| Varsel på mobilen (senere) | Ja | Varselet knyttes til kontoen | – |
| Toppliste for kontrollrommet (venter) | Ja | Regel 3 | B-143 |
| Ukens utfordring, medaljer og ukekiste | Ja (lista kan leses uten) | Regel 3 og 7 | B-152 |
| Sesongens vri | Nei for selve vrien, men den gjelder bare spill i sesongen (som krever konto) | Regel 3 | B-152 |
| Utmerkelse for topp 10 i sesongen (🏆/🎖) | Ja | Regel 3 | B-152 |
| Venner, klubber (ideer) | Ja | Regel 3 | – |

## Slik ser det ut i appen

- `ACCOUNT_FEATURES` i `net/features.ts` har navn og en kort grunn for hver funksjon som krever konto.
- `NeedsAccount` (i `ui/Account.tsx`) viser «X krever konto» med grunnen og en knapp til innloggingen.
- Serverfunksjoner som krever konto, starter med `if auth.uid() is null then raise exception 'ikke logget inn'`, og
  `execute` er tatt fra `anon`.
