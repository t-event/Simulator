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
