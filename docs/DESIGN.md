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
