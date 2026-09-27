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
6. **Uten konto skjules ikke funksjonen** – når spilleren har kommet dit den hører hjemme. Da vises den med en kort
   forklaring om at den krever konto, og en knapp for å logge inn. Før det vises den ikke i det hele tatt, verken for
   spillere med eller uten konto (gradvis synlighet, B-180). Kontoen er frivillig, men det skal være tydelig hva man
   får med den. **Står flere slike funksjoner på samme sted, samles de i ett kort med én knapp**
   (`AccountFeaturesCard` i `ui/Account.tsx`, B-191) – ikke ett låst kort per funksjon.
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
| Avløsere og «Si opp» viser hva som skjer med skiftene | Nei | Regel 1 | B-164 |
| Mesterskapet «Holdbare ovnspotter» | Nei | Regel 1 | B-165 |
| Sikkerhetskopi av spillet på nett (14 dager, bare utvikleren kan rulle tilbake) | Ja (gjelder lagring på nett) | Regel 2 | B-169 |
| Bytt et lite datterverk mot et stålkompleks, «Ansett til plassene», råd om bytte av støping | Nei | Regel 1 | B-170 |
| «Koblet til på dag N» på topplista | Ja (en del av topplista) | Regel 3 | B-170 |
| Planleggeren selger overskuddsskrap, skrapklasseren bytter inn skrap, nye hendelser | Nei | Regel 1 | B-171 |
| Varsellinja (nyeste, ✕ fjerner alle) og oppgraderinger av salgsdirektøren | Nei | Regel 1 | B-172 |
| Ukelista: én liste for alle, målt i prosent | Ja (som før) | Regel 3 | B-172 |
| Sesongstigen (poeng for spilte dager, belønning, oppdrag og ukeplassering; fagpoeng og pynt) | Ja | Regel 3 og 5 | B-173 |
| Flere titler etter Stållegende | Nei (titlen på topplista krever konto som før) | Regel 1 | B-173 |
| Landemerker (ett per virkelig dag, mobilens dato) | Nei | Regel 1 | B-174 |
| Kontrollrommet som spill, med rekord (lokal) | Nei | Regel 1 | B-175 |
| Én fane om gangen | Nei | Regel 1 | B-176 |
| Fartskontroll i juksesperren (tidslinja på nett) | Ja (gjelder bare det som lagres på nett) | Regel 2 | B-176 |
| Landemerker tas manuelt (ikke av salgsdirektøren) | Nei | Regel 1 | B-177 |
| Skiftleder som følger opp fraværet | Nei | Regel 1 | B-178 |
| «Hva er nytt» (endringslogg) | Nei | Regel 1 | B-179 |
| Ny konsernøkonomi: utbytte og konsernkostnader | Nei | Regel 1: ditt eget spill | B-181 |
| Grunnleggeræraen, Hall of Fame, ingen automatisk sesong 2 | Ja (lista og sesongen krever konto; æranavnet kan leses uten) | Regel 3 | B-182 |
| Aktive dager (registrert av serveren ved lagring) | Ja | Regel 2: bare lagring på nett teller | B-182 |
| Konsernkassa på serveren (flytte penger inn i verden, grense per ekte døgn) | Ja | Regel 2 og 7 | B-183 |
| Produksjonsmåleren (tonn per ekte dag fra tidslinja) | Ja (bare lagring på nett teller) | Regel 2 | B-188 |
| Skraplageret: skjult anbud, pilotkonsesjon og inntekt fra andres skrapbruk | Ja | Regel 3 og 7 | B-189 |
| Ukens utfordring «dager» i ekte aktive dager, delt plass ved likt | Ja (lista kan leses uten) | Regel 3 | B-190 |
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
- `AccountFeaturesCard` (samme fil, B-191) samler flere slike funksjoner på samme sted i ett kort med én knapp.
- Serverfunksjoner som krever konto, starter med `if auth.uid() is null then raise exception 'ikke logget inn'`, og
  `execute` er tatt fra `anon`.

### Planlagt (B-180, `RETNING.md`)

| Funksjon | Krever konto | Hvorfor | Beslutning |
| --- | --- | --- | --- |
| Økonomireformen (engangs) | Gjelder spill på nett | Endrer lagringen på nett | gjennomført 2026-09-27, B-186 |
| Strategiske bedrifter (eie, investere, inntekt fra andres aktivitet) | Ja | Regel 3 og 7: deles med andre, avgjøres på serveren | skraplageret bygget (B-189); flere planlagt |
| Konsernkassen (penger flyttet inn i verdenen) | Ja | Regel 2 og 7 | bygget, B-183; vises på skraplagerkortet (B-189) |
| Kontroll og overtakelser | Ja | Regel 3 og 7 | planlagt, B-180 |
| Industrimakt på profilen og topplista | Ja | Regel 3 | planlagt, B-180 |
| Verksjefer, mandat og «Verksjefen ringer» i datterverkene | Nei | Regel 1: ditt eget spill | planlagt, B-180 |
| Rekonstruksjon ved konkurs | Nei | Regel 1 | planlagt, B-180 |
| Myk grense for kassa og bunden konsernreserve (midlertidig) | Nei | Regel 1: eget spill | B-193 |
| Æraer og Hall of Fame | Ja | Regel 3 | Grunnleggeræraen og navnet «Hall of Fame»: B-182. Neste æra: ikke bestemt |

