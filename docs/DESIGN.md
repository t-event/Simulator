# Spilldesign – Stålverket

## Visjon

Et mobilspill der du bygger et skrapbasert stålverk fra en garasje til et storverk og et stålkonsern, og lærer
hvordan et stålverk henger sammen underveis. Målgruppen er folk uten forkunnskaper – nye ansatte, elever og
nysgjerrige. Spillet skal være like enkelt å komme i gang med som Game Dev Tycoon, og like vanskelig å legge fra seg.

Spillet blir aldri helt ferdig: sesonger på et halvt år, topplista og felles hendelser gir en ny grunn til å spille
(se `PLAN-NETT.md`). Nytt spill+ er fjernet; sesongene har tatt over den rollen (B-141).

## Hva vi lærer av Game Dev Tycoon

Game Dev Tycoon lar deg starte et spillselskap i en garasje og vokse til et stort studio. Det er kjent for å være
enkelt i presentasjonen, lett å spille i korte økter og vanskelig å legge fra seg.

| Game Dev Tycoon | Hvorfor det virker | Slik gjør vi det |
|---|---|---|
| Start alene i en garasje | Personlig og lite; veksten føles fortjent | Du starter alene i en garasje med en liten induksjonsovn og 25 000 kr |
| Kjerne-loop: lag spill → anmeldelser → lær → lag bedre spill | Hver runde er kort og gir en dom du kan forbedre | Ta ordre → sett resept → smelt og støp → levering eller reklamasjon → lær → bygg ut |
| Utviklingsfaser med glidebrytere | Få, meningsfulle valg per runde | Resept og kvalitet per ordre; i kontrollrommet fire steg med én handling hver |
| Design- og teknikkbobler under utvikling | Konstant, liten belønning man ser | Bobler med tonn, kroner og fagpoeng stiger opp fra anlegget |
| Forskningspoeng og forskning | Fremgang som ikke bare er penger | Fagpoeng fra charger, leveranser, quiz og feil; forskning låser opp utstyr, automatikk og forbedringer |
| Spillrapporten viser hva som var bra og dårlig | Lær gjennom oppdagelse | Tapperapport med stjerner og forklaring; reklamasjoner forklarer hva som var galt; fagboka låses opp |
| Kontraktarbeid for trygg inntekt | Sikkerhetsnett tidlig | Små kontrakter fra smia og gårdbrukeren |
| Flytting til større kontor med høyere kostnader | Tydelige milepæler med risiko | Fem nivåer; faste kostnader per døgn (200 kr i garasjen → 150 000 kr i storverket) og lønn hopper ved hver flytting; feiring ved flytting |
| Hendelser som krever et valg | Variasjon og personlighet | Hendelseskort med to eller tre valg (billig skrapparti, hasteordre, lønnskrav, avisintervju …) |
| Ansatte med ferdigheter som vokser | Folk du blir glad i | Ansatte med stjerner som blir flinkere av å jobbe, trivsel, kurs, ferie og sykdom |
| Pause og fart | Spilleren styrer tempoet | Pause, 1×, 3×, 10× (farten låses opp med forskning) |
| Én hovedskjerm med kontoret i midten | Oversiktlig på liten skjerm | Anleggsbildet øverst, én tydelig neste handling under |

## Kjerne-loopen

1. **Ordre:** Signer en kontrakt – mengde, kvalitet, pris, frist.
2. **Resept:** Velg skrap. Anslaget viser hvilke kvaliteter resepten gir.
3. **Produksjon:** Ovnen smelter automatisk. Stålet støpes og legges på lager. Med lysbueovn kan du ta styringen selv.
4. **Dom:** Levering gir penger, omdømme og fagpoeng. Feil gir reklamasjon – og fagpoeng, fordi du lærte noe.
5. **Utvikling:** Forsk, kjøp utstyr, ansett folk, flytt til neste nivå – og til slutt: bygg et konsern.

## Nivåene

| Nivå | Følelse | Nytt |
|---|---|---|
| Garasje | Alene, alt for hånd | Liten induksjonsovn (250 kg), sandstøping, små kontrakter, veiledet start |
| Verksted | De første ansatte | Induksjonsovn 1 t, formlinje, analysator, strålingsportal, strømavtaler, skrapklasser |
| Støperi | Skiftarbeid; du blir leder | Induksjonsovn 5 t, blokkstøping, spektrometer, planlegger |
| Stålverk | Tungindustri | Lysbueovn, strengstøping, øseovn, valseverk, rammeavtaler, ta styringen |
| Storverk | Hundrevis av ansatte | Store ovner, fire eller seks strenger, eksport, utfordringer |
| Konsern | Du eier flere verk | Datterverk, felles innkjøp og salg, salgsdirektør, milepæler mot 10 mrd. |

Konsernet åpner seg på storverket når alt utstyret der er kjøpt, eller egenkapitalen når 1 mrd. (B-106).

Etter sluttmålet (10 mrd., tittelen Stålbaron) fortsetter spillet (B-150):
- Stålmilepæler ved 25, 50, 100 og 250 mrd. og 1 billion gir nye titler (Stålmagnat … Stållegende), fagpoeng og mer å
  bruke pengene på: modernisering til trinn 5, stålkomplekser og flere datterverk.
- Når all forskning er gjort, åpner mesterskapet: fire prosjekter som kan tas om og om igjen, så fagpoengene alltid
  har noe å gå til.

Stormodeller (B-154): lysbueovn 150 t og strengstøping med 8 strenger når konsernet åpner, 250 t og valseverk nr. 3
ved sluttmålet, og en likestrømsovn på 420 t ved Stålmagnat. Jo større ovn, jo lengre charge (55–70 min), men flere
tonn i timen. Tre 420-tonnere trenger strengstøpemaskin nr. 3 (B-157).

Dagens oppdrag blir større jo lenger man har kommet, og i konsernet kommer oppdrag om mesterskap, konsernverdi og
datterverk (B-153).

Ukens utfordring og sesonger med vri (B-152):
- Hver uke en toppliste per liga (bronse, sølv, gull) med en oppgave som går på omgang: mest vekst i konsernverdi,
  flest tonn og flest spilldøgn. Topp 3 får medalje og ukekiste med 50–100 fagpoeng (B-155). Kortet står på Verket.
- En sesong kan ha en vri som gjelder hele sesongen (skrapmangel, eksportboom, energikrise, grønn strøm). Den står
  under «Nå i markedet» og på topplista. Topp 10 i en sesong får 🎖, vinneren 🏆, ved kallenavnet.

Prestasjoner og pynt (B-151):
- 29 prestasjoner fra første charge til Stållegende gir merker på Verket og litt fagpoeng. Trykk på et merke for å se
  hva som skal til.
- Pynt til anleggsbildet kjøpes for fagpoeng (🎨): flagg, lyslenke, trær, fasadefarge, solceller, vindmølle, statue,
  fyrverkeri og gullpipe. Pynten gir ingen fordel, og de dyreste krever en prestasjon.

## Kontrollrommet – enkel styring

Kravet: en person uten fagkunnskap skal klare å kjøre en charge. Hvert steg har **én forklaring i vanlige ord, én
måling med grønt felt og én hovedhandling**. Automatikken tar alt annet.

| Steg | Mål | Handling | Automatikk | Fart |
|---|---|---|---|---|
| 1. Smelt skrapet | Hold temperaturen i det grønne feltet mens skrapet mates inn | ▲ Mer strøm / ▼ Mindre strøm (5 nivåer) og oksygenbryter | Conveyor, kalk, dolomitt og karbon. Matingen varierer («tung kasse på vei») | 40× |
| 2. Rens stålet | Få karbonet ned i det grønne feltet | Oksygenbryter, strøm ▲/▼ (helt av). Blir karbonet for lavt, vises «Karbon» (B-079) | Kalk | 20× |
| 3. Slagg av | Få slaggen under ca. 1,2 t uten å søle stål | «Tipp mot slaggdøra» / «Rett opp ovnen» (kan hoppes over – da kommer fosforet tilbake). Under 0,5 t renner stål ut døra | Døra åpnes | 15× |
| 4. Varm opp og tapp | Tapp når temperaturen er i det grønne vinduet (±8 °C), rett opp ovnen når øsa er 93–100 % full | Strøm ▲/▼, oksygen, «Tapp nå!», «Rett opp ovnen» | – | 10× / 8× |

Etterpå: 0–3 stjerner for smelting, rensing, avslagging, tappetemperatur og øsa, en samlet karakter (5★ krever 14 av
15) og en forklaring i vanlige ord. Stjernene gir fagpoeng, og 4–5 stjerner gir ekstra betalt for stålet (B-086).
Stål som søles eller renner over, går tapt (B-076).

## Forskning og fagpoeng

Fagpoeng tjenes på charger (avtar med størrelsen på verket), leverte kontrakter (1 + nivå), rammeavtaler, quizene og
oppdragene i fagboka, charger du kjører selv (1 + stjerner, og 8–15 ekstra for 4–5 stjerner), og på reklamasjoner og
havarier (2–3). Forskning koster fagpoeng, er umiddelbar, krever at kapitlet i fagboka er lest, og låser opp utstyr,
automatikk (B-054), forbedringer og kapitler. Se `src/game/research.ts`.

## Hendelseskort

Omtrent ett kort hver fjerde dag. Spillet pauses til du har valgt. Se `src/game/decisions.ts`. I tillegg kommer
engangstips (`tips.ts`) og rådgiveren når omdømmet faller flere ganger av samme grunn.

## Veikart

Konto, lagring på nett, toppliste og sesonger er bygget, og det samme er daglig belønning, dagens oppdrag og «mens du
var borte» (B-149). Neste steg står i `PLAN-NETT.md` (fase 4: ventetid i konsernet, fase 5: anbud og
skrapauksjoner). Hva som krever konto, står i `KONTO.md`. Åpne spørsmål og mindre forslag står i `FORSLAG.md`.

Kundevurdering 1–10 per levert kontrakt er bygget (B-161), og prestasjoner finnes (B-151).

Ideer som ikke er bestemt:

- Trender i markedet («etterspørselen etter armering øker») som styrer hvilke kontrakter som dukker opp.
- Lyd ved viktige hendelser.
- Flere produkter (tråd, profiler, plater) og ulike markeder.
- App Store / Google Play via Capacitor, hvis ønsket (se B-009).

## Historikk

Tilbakemeldingsrunde 2 (2026-09-24) ga arbeidslistene A–G (småfeil og språk, planlegging, foring, gradvis opplåsing,
strøm, fagboka og ansatte). Alt på lista er gjort; se `LOGG.md` for detaljene. Sikkerhetskopi som fil ble lagt inn
der, men er fjernet igjen (B-135) – et spill flyttes nå med konto.
