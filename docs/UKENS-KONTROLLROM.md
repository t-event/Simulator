# Forslag: «Ukens kontrollrom» (B-386)

**Status:** variant A er bygget (B-387, `094_ukens_kontrollrom.sql`) med eierens justeringer:
- **Tre tellende frø per uke** (A, B, C) – forsøk 1 = A, forsøk 2 = B, forsøk 3 = C, likt for alle og i samme rekkefølge.
  Ingen kan øve på de tellende frøene; trening bruker egne, tilfeldige frø på ukens kvalitet.
- Et startet forsøk kan leveres med samme id til fristen, også etter en nettfeil (resultatet lagres i appen og sendes på
  nytt; innleveringen er idempotent).
- Rotasjon fra uka 12.10.2026 (B-457): stål per kWh → kontrollrom (første gang 19.10) → leveranser i tide → aktive dager.
- Variant B (avspilling på serveren) venter.

Det som står under, er forslaget slik det ble lagt fram.

**Opprinnelig status:** forslag til eieren 30.9.2026. Eieren har valgt kontrollrommet som ny ukekonkurranse
(erstatter «Størst vekst i konsernverdi», B-384), men vil ha den rettferdig: samme charge for alle, et begrenset antall
tellende forsøk, og resultater som serveren kan stole på.

## 1. Hva som finnes i dag

- Kontrollrommet er et lite spill i fire runder (`ui/control/chargeGame.ts`, klassen `ChargeGame`). Logikken er ren
  TypeScript uten React, og tilfeldighetene kommer fra én funksjon som gis inn (`random`). Den avhenger bare av
  `game/data.ts` (kvalitetene).
- Charge-scenarioet bestemmes i dag av spillet på mobilen: kvaliteten i ovnen og `Math.random`. En spiller kan kjøre
  kontrollrommet så mange ganger hen vil og beholde den beste.
- Rekorden (`g.controlBest`) lagres i spillet og leses av serveren fra lagringen (`note_control`, B-295), med et tak på
  5 000 poeng. **Serveren kontrollerer altså ikke selve chargen – bare at tallet er rimelig.**

## 2. Hva «rettferdig» krever

| Krav | Hvordan |
|---|---|
| Samme charge for alle den uka | Serveren gir et **frø** og en **kvalitet** per uke. Frøet styrer alle tilfeldigheter i `ChargeGame` (skrapkurvene, karbonet, slaggklumpene, tappingen). |
| Ikke velge en lettere charge | Frøet og kvaliteten kommer fra serveren, ikke fra ovnen i spillet. |
| Tre tellende forsøk | Serveren deler ut forsøkene. **Et forsøk brukes når det startes**, ikke når det leveres – å lukke appen når det går dårlig, gir ikke et nytt forsøk. |
| Beste av de tellende rangeres | Ukelista tar det beste leverte forsøket per spiller. |
| Trening er fri | Vanlige charger fungerer som før og teller ikke. Man kan øve på «ukens charge» uten å bruke forsøk (samme frø, men uten innlevering). |
| Serververifisert | Se avsnitt 3: to nivåer. |

Trening med samme frø er et bevisst valg: den beste operatøren skal vinne, og man kan lære chargen utenat uansett etter
noen forsøk. Det som skiller, er å gjennomføre den godt tre ganger, ikke å få en heldig charge.

## 3. To varianter

### A. Enkleste robuste variant (anbefalt først)

**Server:**
- Tabell `weekly_control_attempts (id, user_id, week_start, seed, grade, started_at, submitted_at, points, stars, log)`.
- `weekly_control_start()` → sjekker konto (ikke gjest), at uka er en kontrollromsuke, og at spilleren har brukt færre enn
  3 forsøk. Lager raden og gir `{ attempt_id, seed, grade, attempts_left }`. Frøet er likt for alle den uka
  (avledet av uka og en hemmelig verdi i config, så det ikke kan regnes ut på forhånd).
- `weekly_control_submit(attempt_id, points, stars, log)` → godtar bare egne forsøk som ikke er levert, levert minst
  20 s og høyst 15 min etter start, og med poeng under en grense for uka. Grensen regnes av serveren fra frøet: den
  flinke testspilleren (`autoPlay`) sin poengsum × 1,25, og aldri over 5 000.
- `weekly_scores` får grenen `'kontroll'`: beste leverte poeng per spiller i uka. Kistene og medaljene (`finish_weeks`)
  virker som før.
- `week_kind` roterer `dager` → `tonn` → `kontroll` fra en fast mandag. Ukene før står som de var.

**App:**
- `ChargeGame` får et frø (en enkel seedet tilfeldighetsfunksjon, f.eks. mulberry32) – ingen endring i reglene.
- Kontrollrommet får en ukemodus: «Ukens charge – forsøk 2 av 3». Trykk på «Start» henter forsøket fra serveren (ingen
  nett = ikke start). Resultatet sendes inn automatisk, og det vises om det ble ditt beste.
- Kortet «Ukens utfordring» på Mål får knappene «Øv på ukens charge» og «Kjør tellende forsøk (2 igjen)».
- Inndataene (holder inne, slipper, raker, tapper – med tidspunkt) lagres i `log`, med tak (f.eks. 20 kB), så de kan
  sjekkes og spilles av senere.

**Verifisering:** samme nivå som dagens kontrollromsrekord (et rimelig tall), men strengere: serveren bestemmer
chargen, teller forsøkene og tidspunktene, og setter grensen ut fra ukens charge. En endret app kan fortsatt sende inn et
godt, men rimelig tall. Belønningen er liten (fagpoeng i ukekista), og loggen gjør det mulig å se på topp 3 i ettertid.

**Omfang:** én migrasjon (tabell, to funksjoner, én gren i `weekly_scores`, ny rotasjon), frø i `ChargeGame`, ukemodus
i kontrollrommet og to knapper på kortet. Anslag: én økt, med tester og Playwright. Ingen ny infrastruktur.

### B. Full verifisering (senere, når A virker)

- Ukemodus kjører på fast tidssteg (f.eks. 1/60 s med akkumulator) i stedet for skjermens bildefrekvens, og logger
  inndata per steg.
- En edge-funksjon (samme mønster som `eksport`) har en kopi av `chargeGame.ts` og `data.ts`, spiller loggen av med
  frøet og regner poengene selv. Serveren bruker **sitt** tall, ikke appens.
- Risiko: koden i edge-funksjonen må følge appen (versjonsnummer i forsøket, og sjekk i CI at kopiene er like).
  Bildefrekvens påvirker ikke resultatet lenger, som også gjør konkurransen mer rettferdig mellom telefoner.

**Omfang:** ny edge-funksjon, deploy-rutine og CI-sjekk – mer arkitektur enn resten av ukekonkurransen til sammen.
Derfor foreslås den som steg 2. Loggen fra variant A er formatert slik at B kan etterprøve gamle forsøk.

## 4. Rotasjon av ukekonkurransene

Eieren vil at ukene roterer, så ikke samme type spiller alltid har fordel:

| Uke | Konkurranse | Hvem har fordel |
|---|---|---|
| 1 | Flest aktive dager | Den som spiller jevnt (ekte dager) |
| 2 | ~~Mer stål enn før~~ | Tatt ut fra uka 12.10 (B-457) |
| 3 | Ukens kontrollrom | Den beste operatøren |
| fra 12.10 | Mest stål per kWh | Den som driver effektivt (storverk, minst 5 000 t i uka, B-457) |
| fra 26.10 | Leveranser i tide | Den som planlegger (minst 50 leveranser i uka, B-457) |

Rotasjonen fra uka 12.10: stål per kWh → kontrollrom → leveranser i tide → aktive dager.

## 5. Spørsmål til eieren

1. **Variant A nå, B senere?** (anbefalt) Eller vente og bygge B med én gang?
2. **Forsøket brukes når det startes** (anbefalt) – også hvis nettet faller ut midt i. Greit?
3. **Øving på ukens charge uten å bruke forsøk** (anbefalt) – eller skal ukens charge være ukjent til første forsøk?
4. **Rotasjon dager → stål → kontrollrom** fra første mandag etter at det er bygget?
