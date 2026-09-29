# Spilldesign – Stålverket

## Visjon

Et mobilspill der du bygger et skrapbasert stålverk fra en garasje til et storverk og et stålkonsern, og lærer
hvordan et stålverk henger sammen underveis. Målgruppen er folk uten forkunnskaper – nye ansatte, elever og
nysgjerrige. Spillet skal være like enkelt å komme i gang med som Game Dev Tycoon, og like vanskelig å legge fra seg:
et godt tycoon- og strategispill som tilfeldigvis lærer deg mye om stål og industri.

**Hovedretning (B-180):** rollen vokser fra operatør via daglig leder, verkseier og konserneier til industrimagnat.
Stålproduksjonen er inngangen; sluttspillet handler om eierskap, ledelse og kontroll over industrien rundt verkene, i
konkurranse med ekte spillere. Starten beskyttes. Overgangsplanen står i `RETNING.md`.

> Jeg bygde ikke bare det største stålverket. Jeg bygde et industriimperium – og nå prøver de andre å ta det fra meg.

Spillet blir aldri helt ferdig: topplista, felles hendelser og sesonger (uten fast sluttdato, B-221) gir en ny grunn
til å spille (se `PLAN-NETT.md`). Sesongene skal revurderes mot langsiktige æraer (B-180). Nytt spill+ er fjernet (B-141).

## Plattformer: mobil og PC (B-187)

Stålverket er både mobilspill og PC-/nettleserspill. **Mobil** er perfekt til korte økter: sjekke driften, kjøpe skrap,
signere ordre, reagere på varsler, små investeringer. **PC** er perfekt til lange økter: planlegging,
produksjonsoversikt, økonomi, ansatte, sammenligning, konsernstyring og store beslutninger. Samme spill – forskjellig
mengde informasjon synlig samtidig. UI-et skal vokse med spilleren: enkelt og nesten koselig i garasjen, et ordentlig
stålverk i midtspillet, profesjonell industriledelse sent, og kontrollsenteret til et industriimperium til slutt – uten at
spilleren noen gang føler seg kastet inn i et regneark. Designsystem, brytepunkter og plan: `docs/UI.md`.

## Designpilarer (B-180)

Gjelder for alt nytt:

1. **Gradvis synlighet.** Spør: *når trenger spilleren å vite at dette finnes?* Er svaret «senere», vises det ikke –
   ikke som låst kort, ikke som hengelås i en meny. Forklar rett før spilleren trenger det: kort forklaring → én
   konkret handling → lært. Ingen lange veiledninger eller tekstvegger.
2. **Ingen unødvendige valutaer.** Penger og fagpoeng holder. Nye egenskaper er avledede verdier (Industrimakt på
   profilen, Kontroll for én bedrift), ikke poeng man bruker.
3. **Valg, ikke regneark.** Avansert under panseret, forståelige valg på skjermen.
4. **Størrelse skaper nye problemer.** Garasje: hvordan lager jeg stål? Stålverk: hvordan driver jeg effektivt?
   Storverk: kapasitet mot marked. Konsern: hvordan leder jeg flere virksomheter? Industrimagnat: hvordan beholder jeg
   kontrollen?
5. **Penger er viktige, men ikke makt alene.** Kapital virker med sterkt avtagende effekt i alt som gjelder andre
   spillere.
6. **Serveren avgjør alt mellom spillere**, og utfallet skal kunne forklares.
7. **Ikke avhengig av å sjekke mobilen.** Det som skjer i ekte tid mellom spillere, varer døgn, ikke minutter.
8. **Spilltid og ekte tid (B-323).** Spilltid gir kunnskap, optimalisering og lokal progresjon. Ekte tid styrer
   akkumulering av kapital og makt som påvirker andre spillere.

## Hva vi lærer av Game Dev Tycoon

Game Dev Tycoon lar deg starte et spillselskap i en garasje og vokse til et stort studio. Det er kjent for å være
enkelt i presentasjonen, lett å spille i korte økter og vanskelig å legge fra seg.

| Game Dev Tycoon | Hvorfor det virker | Slik gjør vi det |
|---|---|---|
| Start alene i en garasje | Personlig og lite; veksten føles fortjent | Du starter alene i en garasje med en liten induksjonsovn og 25 000 kr |
| Kjerne-loop: lag spill → anmeldelser → lær → lag bedre spill | Hver runde er kort og gir en dom du kan forbedre | Ta ordre → sett resept → smelt og støp → levering eller reklamasjon → lær → bygg ut |
| Utviklingsfaser med glidebrytere | Få, meningsfulle valg per runde | Resept og kvalitet per ordre; i kontrollrommet fire korte runder med én handling hver |
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
| Konsern | Du eier flere verk | Datterverk bygget i ekte tid (ett prosjekt om gangen), felles innkjøp og salg, salgsdirektør, konsernkassa med utbytte og bidrag fra hovedverket i ekte tid, milepæler mot 10 mrd. (planlagt: verksjefer med mandat) |
| Industrien (B-180) | Du konkurrerer om kontrollen | Skraplageret er bygget (anbud, eierskap og inntekt i ekte tid); slagghåndtering og mekanisk verksted er klare, men slått av. Planlagt: Kontroll, overtakelser, Industrimakt – se `RETNING.md` |

Konsernet åpner seg på storverket når alt utstyret der er kjøpt, eller egenkapitalen når 1 mrd. (B-106).

Etter 10 mrd. (tittelen Stålbaron) fortsetter spillet (B-150). Pengemilepælene og titlene under beholdes som
historikk, men det lages ingen nye pengemål (B-180):
- Stålmilepæler ved 25, 50, 100 og 250 mrd. og 1 billion gir nye titler (Stålmagnat … Stållegende), fagpoeng og mer å
  bruke pengene på: modernisering til trinn 5, stålkomplekser og flere datterverk.
- Når all forskning er gjort, åpner mesterskapet: fem prosjekter som kan tas om og om igjen (pris, strøm, skrap,
  datterverk, foring), så fagpoengene alltid har noe å gå til.

Stormodeller (B-154): lysbueovn 150 t og strengstøping med 8 strenger når konsernet åpner, 250 t og valseverk nr. 3
ved sluttmålet, og en likestrømsovn på 420 t ved Stålmagnat. Jo større ovn, jo lengre charge (55–70 min), men flere
tonn i timen. Tre 420-tonnere trenger strengstøpemaskin nr. 3 (B-157).

Dagens oppdrag blir større jo lenger man har kommet, og i konsernet kommer oppdrag om mesterskap, konsernverdi og
datterverk (B-153).

Ukens utfordring og sesonger med vri (B-152):
- Hver uke en toppliste per liga (bronse, sølv, gull) med en oppgave som går på omgang: mest vekst i konsernverdi,
  flest tonn og flest spilldøgn. Topp 3 får medalje og ukekiste med 50–100 fagpoeng (B-155). Kortet står under Mål.
- En sesong kan ha en vri som gjelder hele sesongen (skrapmangel, eksportboom, energikrise, grønn strøm). Den står
  under «Nå i markedet» og på topplista. Topp 10 i en sesong får medalje, vinneren pokal, ved kallenavnet (ikoner, B-237).

Prestasjoner og pynt (B-151):
- Prestasjoner i serier med trinn (B-232), fra første charge til Stållegende, gir merker under Mål → Merker og litt
  fagpoeng. Trykk på et merke for å se hva som skal til.
- Pynt til anleggsbildet kjøpes for fagpoeng (🎨): flagg, lyslenke, trær, fasadefarge, solceller, vindmølle, statue,
  fyrverkeri og gullpipe. Pynten gir ingen fordel, og de dyreste krever en prestasjon.

## Året i spillet

Spillåret har 360 døgn (dag 1 er 1. april) og gir planlegging utover neste ordre (`calendar.ts`, B-265):
- **Vinter** 15. november–14. mars: flere uhell, dyrere strøm, frost og snøstorm som stopper skrapkjøp (B-272, B-279).
- **Fellesferie** 7.–27. juli: sommerstans med vedlikehold (ovnene står, frister flyttes tre uker, salgsdirektøren tar
  ikke ordrer) eller sommervikarer (full drift, dyrere lønn) – valgt på et kort en uke før (B-298, B-321).
- **Kalenderen** på Verket → Oversikt viser når ferien og vinteren kommer, så ordrene kan planlegges (B-321).
- **Trender** i markedet (én kvalitet eller vare ettertraktet i noen døgn, B-255) og **krig** i verden i konsernet
  (dyrere strøm og flere forespørsler, høyst én per år, B-297).

## Kontrollrommet – et spill i fire runder (B-175)

Kravet: kort, morsomt og forståelig uten fagkunnskap. Under ett minutt, én ting å gjøre per runde, og et kort før hver
runde som sier hva som skjer i ovnen og hva du gjør.

| Runde | Mål | Handling |
|---|---|---|
| 1. Smelt | Hold temperaturen i det grønne til alt er smeltet. Skrapkurver varsles (tung kjøler, lett varmer) | Hold inne for strøm |
| 2. Blås ut karbonet | Karbonet i det grønne uten at slaggen koker over | Hold inne for oksygen, «Ferdig» |
| 3. Rak ut slaggen | Få ut slaggklumpene (fosforet) før de synker, ikke ta stålet | Trykk på klumpene |
| 4. Tapp | Tapp ved riktig temperatur (±8 °C) og fyll øsa til 93–100 % | «Tapp!», hold inne for å helle |

Etterpå: poeng med kombo og rekord, 0–3 stjerner per del og en samlet karakter (5★ krever 14 av 15). Stjernene gir
fagpoeng, og 4–5 stjerner gir ekstra betalt for stålet (B-086).

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
var borte» (B-149). **Hovedretningen i `RETNING.md` (B-180)** bygges i faser: økonomireformen (B-186, reform 2 B-302),
konsernkassa og det første strategiske selskapet (skraplageret, B-189) og konsernbidraget i ekte tid (B-318) er
bygget. Neste er slagghåndtering og mekanisk verksted (klare, slått av), så Kontroll, overtakelser, verksjefer og æraer. Fase 4 og 5 i `PLAN-NETT.md` (ventetid, anbud og
auksjoner) står på vent og vurderes inn i den. Hva som krever konto, står i `KONTO.md`. Åpne spørsmål og mindre
forslag står i `FORSLAG.md`.

Kundevurdering 1–10 per levert kontrakt er bygget (B-161), og prestasjoner finnes (B-151).

Ideer som ikke er bestemt:

- Trender i markedet («etterspørselen etter armering øker») som styrer hvilke kontrakter som dukker opp. **Bygget (B-255).**
- Lyd ved viktige hendelser.
- Flere produkter (tråd, profiler, plater) og ulike markeder.
- App Store / Google Play via Capacitor, hvis ønsket (se B-009).

## Historikk

Tilbakemeldingsrunde 2 (2026-09-24) ga arbeidslistene A–G (småfeil og språk, planlegging, foring, gradvis opplåsing,
strøm, fagboka og ansatte). Alt på lista er gjort; se `LOGG.md` for detaljene. Sikkerhetskopi som fil ble lagt inn
der, men er fjernet igjen (B-135) – et spill flyttes nå med konto.
