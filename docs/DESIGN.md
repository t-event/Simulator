# Spilldesign – Stålverket

## Visjon

Et mobilspill der du bygger et skrapbasert stålverk fra en garasje til et
storverk, og lærer hvordan et stålverk henger sammen underveis. Målgruppen er
folk uten forkunnskaper – nye ansatte, elever og nysgjerrige. Spillet skal være
like enkelt å komme i gang med som Game Dev Tycoon, og like vanskelig å legge fra seg.

## Hva vi lærer av Game Dev Tycoon

Game Dev Tycoon (Greenheart Games) lar deg starte et spillselskap i en garasje
på 80-tallet og vokse til et stort studio. Det har fått svært gode kritikker på
mobil (bl.a. 5/5 hos TouchArcade og 89 på Metacritic for iOS) for å være enkelt
i presentasjonen, lett å spille i korte økter og vanskelig å legge fra seg.

| Game Dev Tycoon | Hvorfor det virker | Slik gjør vi det |
|---|---|---|
| Start alene i en garasje | Personlig og lite; veksten føles fortjent | Du starter alene i en garasje med digel og 25 000 kr |
| Kjerne-loop: lag spill → anmeldelser → lær → lag bedre spill | Hver runde er kort og gir en dom du kan forbedre | Ta ordre → sett resept → smelt og støp → levering eller reklamasjon → lær → bygg ut |
| Utviklingsfaser med glidebrytere | Få, meningsfulle valg per runde | Resept og kvalitet per ordre; i kontrollrommet fire steg med én handling hver |
| Design- og teknikkbobler under utvikling | Konstant, liten belønning man ser | Bobler med tonn, kroner og fagpoeng stiger opp fra anlegget |
| Forskningspoeng og forskning | Fremgang som ikke bare er penger | Fagpoeng fra charger, leveranser og feil; forskning låser opp utstyr og forbedringer |
| Spillrapporten viser hva som var bra og dårlig | Lær gjennom oppdagelse | Tapperapport med stjerner og forklaring; reklamasjoner forklarer hva som var galt; fagboka låses opp |
| Kontraktarbeid for trygg inntekt | Sikkerhetsnett tidlig | Små kontrakter fra smia og gårdbrukeren |
| Flytting til større kontor med høyere kostnader | Tydelige milepæler med risiko | Fem nivåer; faste kostnader per døgn (200 kr i garasjen → 150 000 kr i storverket) og lønn hopper ved hver flytting; feiring ved flytting |
| Hendelser som krever et valg | Variasjon og personlighet | Hendelseskort med to valg (billig skrapparti, hasteordre, lønnskrav, avisintervju …) |
| Ansatte med ferdigheter som vokser | Folk du blir glad i | Ansatte med stjerner som blir flinkere av å jobbe |
| Pause og fart | Spilleren styrer tempoet | Pause, 1×, 3×, 10× |
| Én hovedskjerm med kontoret i midten | Oversiktlig på liten skjerm | Anleggsbildet øverst, én tydelig neste handling under |

## Kjerne-loopen

1. **Ordre:** Signer en kontrakt – mengde, kvalitet, pris, frist.
2. **Resept:** Velg skrap. Anslaget viser hvilke kvaliteter resepten gir.
3. **Produksjon:** Ovnen smelter automatisk. Stålet støpes og legges på lager.
   Med lysbueovn kan du ta styringen selv.
4. **Dom:** Levering gir penger, omdømme og fagpoeng. Feil gir reklamasjon – og fagpoeng, fordi du lærte noe.
5. **Utvikling:** Forsk, kjøp utstyr, ansett folk, flytt til neste nivå.

## Nivåene

| Nivå | Følelse | Nytt |
|---|---|---|
| Garasje | Alene, alt for hånd | Digel, sandformer, små kontrakter |
| Verksted | De første ansatte | Induksjonsovn, analysator, strålingsportal |
| Støperi | Skiftarbeid; du blir leder | Større induksjonsovn, blokkstøping, spektrometer |
| Stålverk | Tungindustri | Lysbueovn, strengstøping, øseovn, valseverk, ta styringen |
| Storverk | Hundrevis av ansatte | Store ovner, fire strenger, eksport |

## Kontrollrommet – enkel styring

Kravet: en person uten fagkunnskap skal klare å kjøre en charge. Hvert steg har
**én forklaring i vanlige ord, én måling med grønt felt og én hovedhandling**.
Automatikken tar alt annet.

| Steg | Mål | Handling | Automatikk | Fart |
|---|---|---|---|---|
| 1. Smelt skrapet | Hold temperaturen i det grønne feltet mens skrapet mates inn | ▲ Mer strøm / ▼ Mindre strøm (5 nivåer) | Conveyor, kalk, dolomitt, litt oksygen og karbon. Matingen varierer («tung kasse på vei») | 40× |
| 2. Rens stålet | Få karbonet ned i det grønne feltet | Hold inne «Blås oksygen» | Strømmen av, kalk på | 20× |
| 3. Slagg av | Få den fosforrike slaggen ut før oppvarming | Ett trykk: «Tipp ut slagget» (kan hoppes over – da kommer fosforet tilbake) | Døra åpnes, ovnen tippes og rettes opp igjen | 30× |
| 4. Varm opp og tapp | Tapp når temperaturen er i det grønne vinduet | «Tapp nå!» | Strømmen på | 10× |

Etterpå: 0–3 stjerner per steg, en samlet karakter og en forklaring i vanlige
ord («Temperaturen var 12 °C over målet – bra»). Stjernene gir fagpoeng.
Ekspertmodus med full HMI kan åpnes fra den enkle styringen (bare én vei).

## Forskning

Fagpoeng (FP) tjenes slik: 0,5 / 0,3 / 0,2 per charge (avtar med størrelsen på
verket), 1 + nivå per levert kontrakt, 2–6 per charge du kjører selv (etter
stjerner), 2–3 per reklamasjon eller havari. Se B-018. Forskning
koster FP, er umiddelbar og låser opp utstyr, forbedringer og kapitler i
fagboka. Se `src/game/research.ts` for tabellen.

## Hendelseskort

Omtrent ett kort hver fjerde dag. Spillet pauses til du har valgt. Se
`src/game/decisions.ts`.

## Veikart (ikke gjort ennå)

- Kundevurdering 1–10 per levert kontrakt, som anmeldelsene i Game Dev Tycoon.
- Trender i markedet («etterspørselen etter armering øker») som styrer hvilke kontrakter som dukker opp.
- Opplæring av ansatte (kurs som koster penger og tid), ferie og slitne ansatte.
- Prestasjoner (første tonn, første lysbuecharge, ingen reklamasjoner på 30 dager …).
- Lyd og vibrasjon ved viktige hendelser.
- Flere produkter (tråd, profiler, plater) og ulike markeder.
- App Store / Google Play via Capacitor, hvis ønsket (se B-009).

## Tilbakemeldingsrunde 2 (2026-09-24) – arbeidsliste

Brukeren testet på mobil og fikk en annen person til å teste. Hvert punkt har en status.
Oppdater listen når noe blir gjort, så arbeidet kan fortsette i en ny samtale.

**A. Småfeil og språk**
- [x] Velge selv hvilken kontrakt som leveres først (løses i B)
- [x] Færre forespørsler om gangen; forespørsler har synlig svarfrist og avslås automatisk
- [x] Hardere bot når en kontrakt ikke leveres
- [x] Mottilbud på lønnskrav
- [x] Flere hendelseskort, og ikke det samme om og om igjen
- [x] Bedre norsk: «I dag inn/ut», «I går resultat» osv.
- [x] Riktige navn: «Sandformer» → sandstøping; «Lekkasje i spolen» → vannlekkasje i induksjonsspolen
- [x] Se etter og rett konsollfeil (ingen funnet i Chromium, verken utvikling, publisert bygg eller kontrollrom)

**B. Planlegging** (brukerens valg: ordrekø + planlegger)
- [x] Ordrekø: spilleren sorterer aktive kontrakter; levering, kvalitet og resept følger køen
- [x] Planlegger (ansatt) som ordner køen og innkjøp automatisk; automatisk innkjøp krever planlegger

**C. Foring og vedlikehold**
- [x] Ingen automatisk omforing fra start: knapp «Bytt foring», plan hver N døgn (forskning), eller en
      reparatør som gjør det automatisk (kortet «Vedlikehold» på Verket)
- [x] Tydelig forskjell på planlagt stans (billig, kort) og havari (dyrt, langt, omdømme)

**D. Gradvis opplåsing og ryddigere grensesnitt**
- [x] Mindre info i starten; faner og kort låses opp etter hvert (Folk, Forskning, fart, skrap)
- [x] Ovn, støping, utstyr og bygg mer sentralt – «Utstyr»-knapp på hvert sted i anlegget på Verket
- [x] Skraptyper låses opp med fagpoeng; ikke alt fra start
- [x] 3× og 10× fart låses opp med fagpoeng
- [x] Resepten mer intuitiv: vis hva som mangler for kvaliteten og hvordan det rettes, med forslag
- [x] Fokus på flere ting enn å godta kontrakter; kvaliteten man produserer mer sentral (Kvalitet-kort;
      mer kommer med strøm i tema E og ansatte i tema G)

**E. Strøm** (brukerens valg: alle fire)
- [x] Strømavtale: spot, fastpris eller nattariff, med bindingstid
- [x] Effekttariff: døgnets høyeste effektuttak koster; mange ovner samtidig blir dyrt
- [x] Skiftplan: velg når verket smelter (natt er billig strøm, men nattillegg i lønn)
- [x] Utkobling fra nettselskapet mot betaling (hendelse med valg)

**F. Fagboka sentral** (brukerens valg: alle fire)
- [x] Quiz per kapittel som gir belønning
- [x] Forskning krever at kapitlet er lest
- [x] Oppdrag fra fagboka med mål og belønning
- [x] Rådgiver ved gjentatte omdømmetap: forklarer feilen, viser til kapittel, spesialist mot betaling

**G. Ansatte og balanse**
- [x] Ansatte med mer å si (trivsel, bonus, kurs per ansatt; spesialister via rådgiveren i tema F)
- [x] Verkstedet: omdømme 18 og 1,8 mill. kr – pengene har nå flere nyttige formål (utstyr på Verket,
      bonus, kurs), og penger og omdømme holder følge for testspilleren (se B-026)
- [x] Fagpoeng kommer fortsatt for fort
- [x] Ting bør ta mer tid

**Claudes egne forslag**
- [x] Sikkerhetskopi av lagret spill (Safari kan slette data for nettsider som ikke er brukt på 7 dager,
      med mindre spillet er lagt på hjemskjermen)
- [x] Spare batteri: tegne skjermen sjeldnere (ikke på pause eller i bakgrunnen)
- [x] Veiledet start de første minuttene (kan hoppes over, B-027)
