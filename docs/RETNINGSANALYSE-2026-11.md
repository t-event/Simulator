# Retningsanalyse 5.11.2026 – hvorfor spillet står stille, og hva vi gjør med det

Eieren: «Studer spillet og finn ut hva vi har gjort slik at spillet har gått i feil retning. Vi har 10 aktive spillere og
får ikke flere. Spillerne har ikke mer å gjøre. Her må vi gjøre drastiske tiltak.» (B-514)

Grunnlaget er databasen 5.11 (kontoer, lagringer, tidslinja, konsernet), beslutningsloggen og koden. Ingen navn.

## 0. Kort fortalt

Spillet har to problemer samtidig, og vi har jobbet med ingen av dem:

1. **Det kommer nesten ingen nye spillere, og de få som kommer, slutter første dag.** 2 nye kontoer på tre uker, og 9 av
   10 som startet etter 5.10, var borte før dagen var omme.
2. **Veteranene er ferdige.** Alle 12 aktive er på storverket med all forskning, 20 har nådd sluttmålet, og
   sluttspillet er bygget som venting i ekte tid. De logger inn for å hente, ikke for å spille: spilletida per dag er
   omtrent en tidel av det den var i slutten av september.

Det vi har brukt tida på siden 26.9, er et stort flerspillersystem (konsernkasse, anbud, oppkjøp, bank, Kontroll,
verksjefer, K-1, fellesprosjekter) for en verden med 10–15 spillere, pluss mange reformer og rettinger. Det treffer
verken nybegynneren eller veteranen.

**Anbefaling:** en ny sesong med blanke ark for alle, en ordentlig fiks av den første timen før den starter, stopp i nye
sluttspillsystemer, og en lansering av sesongen for å hente nye spillere. Detaljer i avsnitt 3.

## 1. Tallene

### Tilførselen har stoppet
| Uke (start) | Nye kontoer | Slutt første dag | Nådde storverket | Aktive nå |
|---|---|---|---|---|
| 21.9 | 10 | 1 | 8 | 3 |
| 28.9 | 24 | 8 | 13 | 7 |
| 5.10 | 8 | 7 | 0 | 0 |
| 12.10 | 4 | 1 | 3 | 2 |
| 19.10 | 1 | 1 | 0 | 0 |
| 26.10 | 1 | 1 | 0 | 0 |
| 2.11 | 0 | – | – | – |

48 kontoer i alt (8 av dem gjester). «Verv en venn» har gitt 8 vervinger totalt. Det finnes ingen kanal som henter nye
spillere: alle kom i de to første ukene, trolig fra eierens nettverk.

### Nybegynnerne står fast i garasjen
- 20 av 48 kom aldri forbi nivå 1. De har omdømme 0–23 og ofte minus på kassa etter 10–60 spilldøgn.
- Typisk tid fra start til siste lagring: 10–40 minutter.
- Testspilleren «nybegynner» klarer storverket på dag 183, men den følger rådene perfekt. Ekte nybegynnere gjør det ikke.
  Vi har målt spillet med en robot, ikke med mennesker.

### Veteranene har ikke noe igjen å gjøre
- 12 aktive siste uke, alle på storverket. Alle har 49–51 forskninger, som er alt.
- 20 av 48 har nådd sluttmålet (10 mrd.).
- 4 av de 12 har fullt konsern (nivå 9, 14 verk) og har ikke bestilt noe på 7 dager.
- **Lagringer per spiller per døgn** (et mål på tid i spillet):
  - Ca. 450 rundt 29.9.
  - Ca. 30 nå.
  - Spillerne har gått fra 17 til 10 per dag, men tida hver av dem bruker, har falt mye mer.

### Det sosiale er tomt
- Skiftrapporten har 0 meldinger på 14 dager (99 totalt).
- Privatmeldinger: 3 totalt.
- Oppkjøp: 5 totalt.
- Alle fire selskapene har eier.

Systemer som trenger mange spillere for å virke, står tomme.

## 2. Hva vi har gjort som har ført hit

1. **Sluttspillet ble bygget for en stor verden som ikke finnes.**
   - B-180 (26.9, to dager etter lansering) satte retningen «fra stålverk til industrimakt».
   - Siden har det meste av arbeidet gått til systemer mellom spillere: konsernkasse, anbud, oppkjøp i to regelsett,
     Kontroll, utbyttepolitikk, konsernbank, verksjefer, regionmester, fellesprosjekter og K-1 i skygge.
   - Med 10 spillere blir det ingen kamp. Selskapene er fordelt, og ingen byr.
2. **Sluttspillet er venting, med vilje.**
   - B-311 delte økonomien på 10 og innførte ett byggeprosjekt om gangen, «så et fullt konsern tar uker uansett
     spillfart». Det ble rettferdig, men det betyr at det ikke er noe å gjøre mellom innloggingene.
   - Utbytte og bidrag kommer én gang per døgn, og verksjefene styrer verkene selv.
   - Veteranen henter pengene, kjøper én ting og går.
3. **Vi tok fra toppspillerne det de hadde bygget, midt i toppen.**
   - Reform 2 (29.9, B-302–B-311) skjedde på dagen med flest spillere. Seks av de største mistet verk, kassa fikk tak og
     ble så delt på 10, og økonomien ble delt på 10.
   - Det var begrunnet. Men det skjedde samme uke som aktiviteten begynte å falle, og det lærer spillerne at framgang
     kan forsvinne.
4. **For mye, for fort.**
   - Det er tatt 513 beslutninger på seks uker (387 i september, opptil 93 på én dag).
   - Kodebasen er på 155 SQL-migrasjoner, ca. 62 000 linjer kode og 22 000 linjer dokumentasjon. 142 funksjoner står i
     KONTO.md.
   - Spillerne må lære nye regler nesten hver dag. Mye av tida har gått til rettinger, kodegjennomganger, juksesperrer
     og revisjon av pengestrømmer, ikke til opplevelsen.
5. **Nybegynneren ble glemt.**
   - Etter B-180 er det gjort to små grep for de første nivåene: B-461 og B-482.
   - Spillet er målt med testspilleren, ikke med folk som ser det for første gang.
6. **Nytt innhold hjemme kom for sent og for smått.**
   - Grønt stål, spesialstål og trådvalseverket er gode for læringen.
   - Men de er én ny forskning hver for spillere som alt er ferdige. Det gir en kveld, ikke en grunn til å komme tilbake.
7. **Ingen plan for å skaffe spillere.** Delingsknapp og «Verv en venn» finnes, men ingen lansering, ingen kanal og ingen
   anledning å invitere til.

Det beste i spillet er reisen fra garasje til storverk: der var spilletida størst. I dag får ingen den reisen, verken
nye spillere (de faller av i garasjen) eller veteranene (de er ferdige med den).

## 3. Tiltak – anbefalt pakke

### Tiltak 1: Sesong 2 med blanke ark (det store grepet)
- **Hva:** på en fast dato (forslag: mandag 23.11) starter alle i garasjen. Hjemmeverket, konsernet, konsernkassa og
  selskapene nullstilles.
- **Det som beholdes:** titler, merker, pynt, prestasjoner og plass i Hall of Fame for sesong 1. Det gamle spillet
  arkiveres og kan hentes fram (ikke spilles videre).
- **Varighet:** 6 uker med klar slutt og premier (pynt og merke for topp 3 og for alle som når storverket). Rangering
  på konsernverdi, som nå.
- **Hvorfor:**
  - Veteranene får reisen igjen, og nå som et kappløp mot hverandre.
  - Nye spillere stiller likt, i stedet for 5 mrd. bak.
  - Det gir én dag å invitere folk til.
- **Risiko:** noen veteraner kan slutte. Det må forklares godt og varsles en uke før, med premiene klare.
- Dette snur B-505 (sesong 1 uten sluttdato), så det krever eierens ja.

### Tiltak 2: Den første timen, før sesongstart
- **Mål:** halvparten av nye spillere når nivå 2 første dag (i dag nesten ingen).
- **Ingen straff før nivå 2:** ingen tap av omdømme og ingen konkurs.
- **De tre første kontraktene** er laget for å lykkes, og veiledningen holder hånda til første levering.
- **Mindre på skjermen** de første 30 minuttene: bare Verket, Marked og Salg.
- **Måling på serveren:** nivå, kontrakter og tid i de første øktene, så vi ser hvor folk faller av.
- **Eieren lar 3–5 personer prøve** spillet mens hen ser på (det viktigste testgrunnlaget vi mangler).

### Tiltak 3: Stopp i nye sluttspillsystemer
- **Ingen nye systemer mellom spillere:** K-1 slås ikke på, og verksjef V1, flere selskaper og industriklynger bygges
  ikke. Skyggejobben kan stoppes.
- **Det som virker, beholdes,** men det tegnes enklere i sesong 2:
  - Konsernet med utbytte.
  - Topplista.
  - Ukens utfordring og kontrollrommet.
- **Selskaper og oppkjøp** åpner først når sesongen har vart en stund.
- **Én oppdatering i uka** med én tydelig nyhet, i stedet for flere publiseringer om dagen.

### Tiltak 4: Lansering av sesong 2
- Eieren deler en kort tekst med lenke i egne kanaler (venner, kolleger, lokale grupper, bransje og skoler). Claude
  lager teksten og et delingsbilde.
- «Verv en venn» gir mer de første to ukene av sesongen.
- Skoler og lærere er en naturlig målgruppe: spillet er laget for å lære bort hvordan et stålverk virker.

### Ikke anbefalt nå
- Mer innhold hjemme for veteraner (som spesialstål og tråd): det hjelper ikke før de får en ny reise.
- Engelsk versjon: stor jobb, og det løser ikke den første timen.
- Flere reformer av økonomien midt i en sesong.

## 4. Spørsmål til eieren

1. Sesong 2 med blanke ark (tiltak 1): ja, eller bare tiltak 2–4?
2. Startdato (forslag 23.11) og lengde (forslag 6 uker)?
3. Skal K-1, verksjef V1, flere selskaper og klynger legges på hylla (tiltak 3)?
4. Kan du la 3–5 personer prøve starten mens du ser på, og har du kanaler for lanseringen (tiltak 4)?

---

# Del 2 – uten ny sesong (5.11, B-515)

Eieren: «Vi kan også endre på alt vi har bygget. Studer dette mer og kom med anbefalinger. Vil helst ikke starte ny
sesong da jeg er redd for at de 10 spillerne slutter da.» Tiltak 1 i del 1 (sesong 2 med blanke ark) er tatt ut.

## 5. Mer om nybegynnerne: spillet går fra dem

Jeg leste varsellista i alle 20 lagringene som står fast på nivå 0–1:

| Hva skjedde | Spillere (av 20) | Ganger |
|---|---|---|
| Forespørsler gikk ut uten svar | 20 | 324 |
| Ovnen sto fordi skraplageret var tomt | 14 | 78 |
| Kassa tom eller banken bekymret | 13 | – |
| Bot og tap av omdømme for sen levering | 11 | – |
| Havari (gjennombrent foring, omdømme −5) | 5 | – |
| Leverte minst én kontrakt | 19 | – |

De forsto altså det grunnleggende: 19 av 20 leverte. Men spillet krever at man passer på hele tida.

- **Klokka går mens nybegynneren ser bort,** og den går fort: 3× og 10× låses opp i løpet av de første minuttene.
- **Når skrapet er tomt, står ovnen.** Forespørslene går ut, og kontraktene blir for sene.
- **Det gir bot og tap av omdømme.** Kravet for å komme videre er omdømme 5 og 18, så én bot (−5,6) eller ett havari
  (−5) kan sende spilleren tilbake til start.
- **Kassa går i minus, og banken begynner å telle ned mot konkurs.**
- **Hjelpen kommer for sent:** planleggeren som kjøper skrap selv, er noe man leier inn senere.

Nybegynneren taper ikke fordi spillet er vanskelig å forstå, men fordi det straffer at man ikke passer på.

## 6. Mer om veteranene: hva de faktisk gjør

| Det som brukes | Tall | Det som nesten ikke brukes | Tall |
|---|---|---|---|
| Bestillinger i konsernet (mest modernisering) | 1 254 | Ukens kontrollrom, forsøk | 7 |
| Lån i konsernbanken (logg) | 737 | Privatmeldinger | 3 |
| Verksjefer ansatt | 159 | Oppkjøp | 5 |
| Trinn hentet på sesongstigen | 100 | Gaver til fellesprosjekter | 9 |
| | | Skiftrapporten siste 14 dager | 0 |

Bestillingene i konsernet går ned uke for uke:

| Uke (start) | 28.9 | 5.10 | 12.10 | 19.10 | 26.10 | 2.11 |
|---|---|---|---|---|---|---|
| Bestillinger | 130 | 366 | 284 | 250 | 159 | 65 |

Det veteranene liker, er å **bygge og forbedre**: først hjemmeverket (der spilletida var størst), så moderniseringen av
datterverkene. Begge stigene er nå på toppen for de fleste. Systemene der spillerne skal møte hverandre, er nesten
ubrukt med 10 spillere.

## 7. Anbefalingene, i rekkefølge

### A. Den første timen (viktigst for å vokse – rører ikke veteranene)
1. **Naboen leverer skrap.** Til og med verkstedet kjøper spillet inn skrap til resepten selv, gratis, med en kort
   forklaring om at det blir ditt ansvar senere. Det er den vanligste grunnen til at ovnen står.
2. **Spillet venter på deg.** I garasjen og verkstedet pauser klokka når en forespørsel venter og køen er tom, eller når
   ovnen står og spilleren må gjøre noe. 10× låses opp i verkstedet, ikke de første minuttene.
3. **Ingen straff før støperiet:**
   - ingen bot og ikke noe tap av omdømme for sen levering, bare et råd om hva som gikk galt,
   - foringen byttes automatisk,
   - ingen konkurs.
   Omdømmet kan ikke synke under kravet for nivået man er på.
4. **Måling:** et lite tidslinjetall for de første øktene (nivå, leveranser, skrap tomt, utgåtte forespørsler), så vi ser
   effekten.
5. **Eieren ser 3–5 personer spille de første 15 minuttene.** Det finnes ingen bedre test.

### B. «Bygg på nytt» for veteraner som vil (i stedet for sesong 2)
- Et valg, aldri tvang. Spilleren kan selge storverket og starte i garasjen igjen.
- Det som blir stående:
  - konsernet, konsernkassa og selskapene (de ligger på serveren og er ikke en del av hjemmeverket),
  - titler, merker, pynt og prestasjoner.
- Gevinsten er synlig, men liten:
  - en stjerne ved navnet,
  - en startfordel neste gang (f.eks. en forskning gratis),
  - en egen liste «Raskest til storverket» i spilldøgn.
- Det gir veteranene reisen tilbake uten at noen mister noe de ikke vil miste. Hvis 3–4 av de 10 velger det, har de noe
  å gjøre i uker.
- Kostnad: bidraget til konsernkassa blir lavere til det nye verket er stort, og spilleren ser det før hen velger.

### C. Ukens scenario (noe nytt hver uke, for alle)
- Et kort, fast oppdrag med samme frø for alle, i en egen sandkasse som ikke rører verket. Det tar ca. 10–20 minutter.
- Eksempler:
  - «Snu et verk på konkursens rand på 30 døgn»,
  - «Lever vinterordren med halvt mannskap»,
  - «Lavest kWh per tonn på 10 døgn».
- Topplista per uke, og en merkevare i sesongstigen.
- Erstatter ukens kontrollrom (7 forsøk totalt), som få bruker.
- For nybegynnere er scenariet også en rask smakebit på storverket.

### D. Rydd og senk tempoet
- **Stopp nye systemer mellom spillere:** K-1, verksjef V1, flere selskaper, klynger.
- **Vurder å ta bort** fellesprosjektene og privatmeldingene. Ingen savner dem, og de gjør spillet tyngre.
- **Skjul for nye spillere** alt de ikke trenger den første uka. I dag er det mange menyer, kort og tall tidlig.
- **Én oppdatering i uka** med én nyhet som forklares godt.

### E. Spør de 10
Send en kort melding til de aktive (Skiftrapporten eller direkte): «Hva ville fått deg til å spille mer? Hva er
kjedelig?» Ti svar fra ekte spillere er verdt mer enn alle simuleringene våre.

### F. Hent nye spillere – når A er ferdig
Det er ingen vits i å invitere folk til en start som mister 9 av 10. Når A er ute og målingene ser bedre ut, lager jeg en
kort tekst og et delingsbilde til eierens kanaler (venner, kolleger, skoler med TIP-fag, bransje). Det kan også prøves
å legge spillet i Google Play som app; det gjør spillet lettere å finne.

**Rekkefølge:** A og E denne uka, så B og C, D underveis og F når tallene for den første timen er bedre.
