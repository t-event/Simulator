# Beslutninger

Nummererte beslutninger med begrunnelse. Nyeste nederst. Slett aldri en
beslutning – marker den som **erstattet av B-xxx** hvis den ikke gjelder lenger.

Mal:

```
## B-xxx Tittel (dato)
Status: gjelder | erstattet av B-yyy
Bakgrunn: hvorfor spørsmålet kom opp
Beslutning: hva vi valgte
Begrunnelse: hvorfor, og hva vi valgte bort
```

---

## B-001 Nettapp i React + TypeScript + Vite (tidligere økt)
Status: gjelder
Bakgrunn: Brukeren ville ha noe som kunne kjøres fra kontrollrom og deles enkelt.
Beslutning: Alt kjører i nettleseren. Ingen server. Publiseres på GitHub Pages via Actions.
Begrunnelse: Null drift, fungerer på PC og mobil, delbar som lenke. Python-backend ble fjernet.

## B-002 Generiske tall og ingen identifiserende informasjon (tidligere økt)
Status: gjelder
Bakgrunn: Prosessmodellen ble tidlig kalibrert mot konfidensielt materiale fra industrien.
Beslutning: Repoet inneholder bare generiske tall og tekst. Ingen dokumenter, bedriftsnavn,
stedsnavn, personnavn, interne prosedyrenumre, leverandørnavn eller interne kvalitetskoder.
Kvaliteter i prosessmodellen har oppdiktede koder (AR20, LK08, HK80).
Begrunnelse: Repoet er offentlig. Git-historikken er allerede skrevet om én gang for å fjerne
et dokument – det skal ikke skje igjen.

## B-003 Prosessmodellen for lysbueovnen beholdes som «ekte» motor (tidligere økt)
Status: gjelder
Beslutning: `src/sim/eaf.ts` er en lumped-parameter-modell (smelting, slaggkjemi, B2/B3,
oksygen, skumslagg, avfosforering med fosforbom, elektroder, overslag, ildfast).
`src/sim/validate.ts` sjekker nøkkeltallene i CI.
Begrunnelse: Gir et troverdig kontrollrom når spilleren tar styringen.

## B-004 Simulatoren erstattes av et tycoonspill (tidligere økt)
Status: gjelder
Bakgrunn: Brukeren ville heller ha et spill enn et opplæringsverktøy, og spillet skal erstatte verktøyet.
Beslutning: Spillet «Stålverket»: fra garasje med gassfyrt digel til storverk. Hele verket
modelleres (skrap, ovn, støping, valsing, salg, folk), ikke bare ovnen. Relay for flere maskiner,
instruktørpanel og scenarioer er fjernet.
Begrunnelse: Et spill motiverer mer, og hele kjeden gir bedre forståelse enn bare ovnen.

## B-005 Spilltilstand som ren JSON, lagret i nettleseren (tidligere økt)
Status: gjelder (utvidet av B-013)
Beslutning: `GameState` er ren JSON. Motoren endrer tilstanden på stedet. Lagres i
`localStorage` under `stalverk-spill-v1`. Tilfeldighet er seedet og lagres i tilstanden.
Begrunnelse: Enkel lagring, deterministisk testspiller, ingen server.

## B-006 Balansen styres av en automatisk testspiller i CI (tidligere økt)
Status: gjelder (målene endret i B-016 og B-018)
Beslutning: `src/game/balance.ts` spiller seks spill. Medianen for når hvert nivå nås skal
ligge i målvinduet, ingen får gå konkurs, og en charge fra kontrollrommet skal komme riktig
tilbake. Mål: Verksted 4–14, Støperi 20–50, Stålverk 50–115, Storverk 100–185 dager.
Begrunnelse: Balanse faller lett sammen ved små endringer; testspilleren fanget blant annet
dødsspiraler ved produktbytte og tom kasse.

## B-007 Kassekreditt følger omsetningen (tidligere økt)
Status: gjelder
Beslutning: Kreditt = maks(25 000 × 5^nivå, to døgns produksjon × produktpris). Skrap og
omforing kan kjøpes på kreditt; investeringer krever kontanter. Konkurs etter 7 døgn under grensen.
Begrunnelse: Uten dette gikk verket konkurs når produksjonen økte kraftig før inntektene kom.

## B-008 Game Dev Tycoon som hovedinspirasjon (2026-09-24)
Status: gjelder
Bakgrunn: Brukeren ba om å studere Game Dev Tycoon og hente inspirasjon.
Beslutning: Vi tar over kjerne-loopen (lag noe → få dom → lær → bli bedre), liten start i
garasje, fagpoeng og forskning, flytende bobler som belønning, hendelseskort med valg og
feiring ved flytting. Se `docs/DESIGN.md`.
Begrunnelse: Game Dev Tycoon er kjent for å være enkelt, vanedannende og godt egnet på mobil.

## B-009 Mobilspill som PWA (2026-09-24)
Status: gjelder
Beslutning: Spillet er en installerbar PWA (manifest, ikoner, service worker, offline, stående
format). App Store/Google Play er ikke med nå.
Begrunnelse: Kan installeres på hjemskjermen uten butikk, og vi beholder én kodebase og
GitHub Pages. Kan pakkes med Capacitor senere hvis det blir ønsket.

## B-010 Kontrollrommet: enkel styring som standard (2026-09-24)
Status: gjelder
Bakgrunn: Brukeren: «Kontrollromstyringen må være veldig enkel, slik at en uten kunnskap klarer å kjøre manuelt.»
Beslutning: Fire guidede steg med én hovedhandling hver: Smelt (mer/mindre strøm),
Rens (hold for oksygen), Slagg av (ett trykk), Tapp (trykk når temperaturen er grønn).
Automatikk tar alt annet (kalk, dolomitt, karbon, conveyor, elektroder). Stjerner og forklaring
etterpå. Den fulle HMI-en finnes fortsatt som «ekspertmodus», bare én vei (enkel → ekspert).
Begrunnelse: Målt i prosessmodellen: trafo-tapp 3 holder temperaturen i det grønne,
tapp ≥ 5 overoppheter og sliter mye ildfast – så «mer/mindre strøm» gir ekte konsekvenser.

## B-011 Høykarbon tappes som vanlig og legeres opp i øsa (2026-09-24)
Status: gjelder
Beslutning: I kontrollrommet kjøres alle kvaliteter mot tappevinduet til AR20, unntatt
lavkarbon (LK08). Spillet legger på karbon i øsa for høykarbon.
Begrunnelse: Karboninjeksjon løser seg for sakte i badet til å nå 0,25–0,45 % C.

## B-012 Forskning med fagpoeng (2026-09-24)
Status: gjelder
Beslutning: Fagpoeng (FP) tjenes på charger, leverte kontrakter, charger kjørt selv og på feil
(reklamasjoner og havarier – «du lærte noe»). FP brukes på forskning som låser opp utstyr og
gir forbedringer. Forskning låser også opp kapitler i fagboka.
Begrunnelse: Kjernen i Game Dev Tycoon; knytter læring til fremgang.

## B-013 Migrering av lagrede spill (2026-09-24)
Status: gjelder
Beslutning: `migrate()` i `save.ts` fyller inn standardverdier for felt som mangler i gamle
lagringer. `SAVE_VERSION` økes bare når en lagring ikke kan migreres.
Begrunnelse: Spillere skal ikke miste spillet sitt når vi legger til funksjoner.

## B-014 Fagpoeng per charge avtar med størrelsen på verket (2026-09-24)
Status: erstattet av B-018 (lavere satser)
Bakgrunn: Med 1 fagpoeng per charge hopet poengene seg opp fra støperiet og oppover
(2 900 ubrukte på dag 150), fordi antall charger per døgn øker mye.
Beslutning: 1 FP per charge i garasje og verksted, 0,6 i støperiet, 0,4 fra stålverket.
Leverte kontrakter gir 2 + nivå. Forskning på nivå 2–4 koster 50–300 FP.
Begrunnelse: Nå styrer forskningen tempoet på stålverksnivå (testspilleren forsker så snart
poengene holder), uten at progresjonen havner utenfor målvinduene i B-006.

## B-015 Den enkle styringen er testet med simulerte spillere (2026-09-24)
Status: gjelder
Beslutning: `balance.ts` kjører den enkle styringen (`SimpleRunner`) som en nybegynner som bare
følger rådene på skjermen (krav: minst 4 stjerner, under 3 minutter) og som en slurvete spiller
(krav: høyst 2 stjerner). Logikken ligger i `src/ui/control/simpleRunner.ts`, uten React, nettopp
for å kunne testes slik.
Begrunnelse: Kravet om at en uten kunnskap skal klare å kjøre manuelt skal ikke brytes i stillhet.
Målt: nybegynner 4–5★ på ca. 105 s og 386 kWh/t; slurvete 1★ og ca. 418 kWh/t.

## B-016 Kontrakter er små prosjekter på 1,5–4 døgns produksjon (2026-09-24)
Status: gjelder
Bakgrunn: Brukeren: «Det bør ta lengre tid å gjøre kontrakter. Det går altfor fort nå.»
Målt: en kontrakt tok 0,6 min i garasjen og ca. 1 min i verkstedet og støperiet (1 døgn = 1 min på 1×).
Beslutning: Kontraktstørrelsen settes ut fra verkets kapasitet: 1,5–4 døgns produksjon
(`CONTRACT_DAYS` i `engine.ts`), begrenset av kundens minste og største ordre. Kundenes største
ordre er hevet så de ikke kutter kontraktene. Fristene følger med som før.
Resultat: garasje ca. 5 min, verksted 2,5 min, støperi og stålverk ca. 5 min per kontrakt.
Testspilleren leverer ca. 80 kontrakter på 150 døgn i stedet for 240. Målet for Verksted er
utvidet fra dag 4–14 til 5–18, fordi garasjefasen nå bevisst tar lengre tid (median dag 13).
Spillklokka (1 døgn = 1 minutt) er ikke endret.

## B-017 Claude oppretter og merger PR selv (2026-09-24)
Status: gjelder
Bakgrunn: Brukeren: «Opprett PR og merge hver gang selv.»
Beslutning: Når en endring er ferdig, sjekket lokalt (typesjekk, lint, `validate.ts`,
`balance.ts`, bygg, og nettlesertest der grensesnittet er endret) og pushet til utviklingsgrenen,
oppretter Claude PR til `main` og merger den med vanlig merge-commit, uten å spørre først.
Etterpå sjekkes Actions-kjøringen for publisering; feiler den, rettes det straks.
Begrunnelse: Brukeren tester spillet på mobilen via GitHub Pages og vil se endringene uten ekstra runder.

## B-018 Vanskeligere spill: faste kostnader, lavere marginer, færre fagpoeng (2026-09-24)
Status: gjelder
Bakgrunn: Brukeren (skjermbilde fra garasjen dag 9: 71 000 kr, omdømme 2,4 av 5, 50 fagpoeng):
«Man har for mye penger i forhold til omdømme. Også får man for fort fagpoeng. Spillet må være
litt vanskeligere.» Målt med `balance.ts --sperrer`: pengene til Verksted var på plass dag 3–4,
omdømmet dag 8–17; 50–250 fagpoeng lå ubrukt ved slutten av hvert nivå.
Beslutning:
- Faste kostnader per døgn (`fixedPerDay` i `STAGES`): 200 / 1 500 / 8 000 / 40 000 / 150 000 kr,
  som overhead i Game Dev Tycoon. Vises før flytting, ved flytting og på Verket.
- Støpegods 16 000 → 13 500 kr/t. Nivåpriser: Verksted 80 000, Støperi 550 000, Stålverk 6,5 mill.,
  Storverk 32 mill. Induksjonsovn 1 t 60 000 → 50 000 (så verkstedet ikke blir en felle).
- Fagpoeng: 0,5 / 0,3 / 0,2 per charge (garasje+verksted / støperi / stålverk+), 1 + nivå per
  levert kontrakt, 2 per reklamasjon, 1 + stjerner for egne charger. Forskning ca. 1,5× dyrere.
- Bransjemessa koster 8 000 × (1 + nivå)² (var 15 000 ×), så den ikke tømmer kassa i verkstedet.
Første forsøk (husleie 2 500 i verkstedet og støpegods 12 000) ga konkurs: verkstedet ble en
felle der man aldri fikk råd til induksjonsovnen. Derfor de mildere tallene over.
Resultat: pengene sperrer nå fra støperiet og oppover, omdømmet i garasjen; få ubrukte fagpoeng.
Median nivådager 13 / 36 / 89 / 169 (var 13 / 27 / 77 / 152). Nye mål: Verksted 7–20,
Støperi 20–50, Stålverk 55–120, Storverk 120–220; testspilleren kjører 240 døgn.
Kassa på dag 240 er 15–55 mill. (var 400–800 mill.).

## B-019 Svar på tilbakemeldingsrunde 2 (2026-09-24)
Status: gjelder
Bakgrunn: Stor tilbakemelding fra brukeren og en testperson (se arbeidslisten i `docs/DESIGN.md`).
Brukerens valg:
- **Fagboka:** alle fire – quiz med belønning, forskning krever lest kapittel, oppdrag, rådgiver
  med kapittelhenvisning og betalt spesialist.
- **Strøm:** alle fire – strømavtale, effekttariff, skiftplan etter strømpris, utkobling.
- **Planlegging:** ordrekø som spilleren sorterer, og en planlegger som kan ansettes senere.
Beslutning: Gjennomføres tema for tema (A–G), én PR per tema, som merges fortløpende (B-017).

## B-020 Tregere klokke, forespørsler med svarfrist, hardere bot, hendelser uten gjentakelse (2026-09-24)
Status: gjelder
Beslutning:
- Spillklokka: ett døgn tar to minutter på 1× (var ett). Brukeren har flere ganger sagt at ting går for fort.
- Forespørsler kommer spredt gjennom døgnet (ikke alle om morgenen), maks 3 åpne om gangen, og
  hver har en synlig svarfrist på 8–20 timer før kunden går videre.
- Ulevert stål ved fristen koster halve kontraktsprisen i bot (var en fjerdedel), og omdømmetapet
  er større (3 × gevinsten + 2).
- 12 hendelseskort (5 nye: kurs, influensa, naboklage, kundebesøk, nestenulykke). Samme kort kommer
  ikke igjen før etter 25 døgn, og det går minst 2 døgn mellom to kort.
- Lønnskrav kan besvares med mottilbud på 2 % (60 % sjanse for enighet, ellers 3 % og én slutter).
- Navn: «Sandformer» → «Sandstøping»; «Lekkasje i spolen» → «Vannlekkasje i induksjonsspolen», med
  forklaring på at kobberspolen rundt digelen er vannkjølt.

## B-021 Ordrekø, resept per kvalitet og planlegger (2026-09-24)
Status: gjelder
Beslutning:
- Aktive kontrakter ligger i en ordrekø (`priority` på kontrakten). Spilleren flytter dem med
  pilknapper. Levering og reservering av lager følger køen (ikke fristen).
- «Følg ordrekøen» (på som standard): ovnen kjører kvaliteten til den øverste kontrakten som ikke
  allerede er dekket av lageret (`currentOrder`).
- Resepten huskes per kvalitet (`gradeRecipes`) og byttes når kvaliteten skifter.
- Ny rolle **Planlegger** fra støperiet: sorterer køen etter frist (kan slås av) og kjøper skrap
  automatisk. **Automatisk innkjøp krever planlegger** – før det kjøper spilleren skrap selv, så
  det er mer å gjøre tidlig i spillet.

## B-022 Foring byttes av spilleren, etter plan eller av reparatør (2026-09-24)
Status: gjelder (erstatter automatisk omforing fra start)
Beslutning:
- Foringen byttes ikke lenger av seg selv. Kortet **Vedlikehold** på Verket viser slitasjen per
  ovn og har knappen «Bytt foring» (nå hvis ovnen står, ellers etter chargen som pågår).
- Forskningen **Vedlikeholdsplan** (verksted, 15 fagpoeng) lar spilleren planlegge omforing hver
  4–14 døgn (`relinePlanDays`).
- Med en **reparatør** ansatt kan «Reparatøren bytter foringen ved 85 % slitasje» slås på
  (`autoReline`, av som standard). Gamle lagringer med reparatør beholder automatikken.
- Planlagt stans heter «Planlagt stans: ny foring» og koster vanlig pris og tid. Havari
  (gjennombrenning, vannlekkasje, strålekilde) heter «Havari: …». Gjennombrenning koster tre ganger
  prisen og tiden, omdømme −5 (var −3), og meldingen sier hva en planlagt omforing ville kostet.
- Testspilleren bestiller ny foring ved 88 % slitasje. Balanse: 11 / 43 / 98 / 182.

## B-023 Gradvis opplåsing, utstyr på Verket, reseptforslag og kvalitetskort (2026-09-24)
Status: gjelder (Bygg-fanen er erstattet av Forskning-fanen)
Beslutning:
- **Faner:** Verket, Marked og Salg fra start. Folk kommer når det er plass til ansatte (verkstedet),
  Forskning når de første fagpoengene er tjent. Nye faner får et grønt «Ny»-merke til de er åpnet
  (`seenViews`). Fagpoeng vises i toppfeltet først når man har noen.
- **Fart:** 3× låses opp med forskningen «Faste rutiner» (3 FP), 10× med «Stødig drift» (10 FP).
  Låste knapper vises med hengelås og forklarer hva som trengs når de trykkes.
- **Skrap:** Blandet, tungt og returskrap fra start. «Flere skrapleverandører» (garasjen, 6 FP) gir
  shredder og spon, «Rent nyskrap» (verkstedet, 10 FP) gir rent skrap, «Råjern» (støperiet, 60 FP)
  gir råjern. Marked viser bare låste typer som kan forskes fram på nivået man er på.
- **Utstyr der det brukes:** Hvert sted i anlegget på Verket (skraplager, ovn, støping,
  ferdigvarelager, kvalitet, vedlikehold) har en «Utstyr»-knapp som åpner utstyret for det stedet.
  Målkortet på Verket har «Flytt inn»-knappen. Forskning, bank og spillinnstillinger ligger i
  Forskning-fanen (`ui/ResearchPage.tsx`).
- **Resept:** Marked viser karbon, fosfor og kobber/tinn mot kravet med ✓/!/✗ og sier med vanlige
  ord hva som må endres. «Foreslå billigste resept» (`game/recipe.ts`) prøver alle blandinger i steg
  på 10 % av skrapet man har låst opp, og velger den billigste som holder kravet med margin (15 %,
  eller 5 % med spektrometer).
- **Kvalitet:** Nytt kort viser andelen stål de siste sju døgnene som holdt kvaliteten, bommet på
  analysen eller fikk støpefeil (`onGradeT`, `offGradeT`, `secondT` per døgn), og hva man måler med.
- Kvalitetsvalget på Verket viser bare kvaliteter som finnes på nivået.
- Gamle lagringer får forskningen for fart og for skrap på nivåene de allerede har nådd, så ingen
  mister noe de hadde.
- Balanse etter endringen: 11 / 49 / 100 / 187 (innenfor målene; støperiet er nær øvre grense og
  vurderes igjen i tema G).

## B-024 Strøm: avtale, effekttariff, skiftplan og utkobling (2026-09-24)
Status: gjelder
Beslutning (gjelder når verket har elektrisk ovn; gassdigelen har fast pris):
- **Strømavtale** i Marked: *spotpris* (børsprisen time for time, som før), *fastpris* (samme pris
  hele døgnet, satt ved signering til `0,85 × (0,7 + 0,3 × prisnivå) × 1,1` – en forsikring som
  koster litt; fornyes til dagens pris etter bindingstida) eller *nattariff* (0,6 × grunnpris kl.
  22–06, 1,2 × ellers). Fastpris og nattariff har 30 døgns binding. Kortet viser snittprisen i
  driftstida for hver avtale, så valget blir konkret.
- **Effekttariff:** 1 200 kr per MW av døgnets høyeste effekt (én ovn trekker
  `størrelse × kWh/t ÷ syklustid`, fra 0,5 MW i verkstedet til 36 MW for den største lysbueovnen).
  Med to ovner kan man velge «Bare én ovn smelter om gangen» for å halvere toppen.
- **Skiftplan** under Folk (når verket ikke går døgnet rundt): skiftene kan starte kl. 06, 14 eller
  22. Nattarbeid gir 30 % tillegg for timene 22–06, regnet mot vanlig start kl. 06, så døgnkontinuerlig
  drift ikke blir dyrere enn før.
- **Utkobling:** nytt hendelseskort der nettselskapet betaler for å koble ut ovnene kl. 07–11 neste
  dag. Betalingen er 15–45 % av verdien av stålet man ikke får laget, så det lønner seg bare noen ganger.
- Testspilleren beholder spotpris og dagskift, og sier nei til utkobling. Balanse: 12 / 44 / 104 / 185.

## B-025 Fagboka i sentrum: lesing, quiz, oppdrag og rådgiver (2026-09-24)
Status: gjelder
Beslutning:
- **Lesing før forskning:** Hver forskning (unntatt fartsforskningen) har et kapittel som må være
  lest (`reads` i `research.ts`). Kapitlet kommer i fagboka så snart forskningen er synlig på nivået,
  og forskningskortet har knappen «Les kapitlet» som åpner boka der. Et kapittel regnes som lest når
  det er åpnet (`readChapters`). Merket på bokknappen viser uleste kapitler.
- **Quiz:** to spørsmål med tre svar per kapittel (`game/quiz.ts`). Alt riktig første gang gir
  2 × (1 + nivå) fagpoeng. Feil svar: forklaringene vises, og man kan prøve igjen neste døgn.
- **Oppdrag:** elleve kapitler har et oppdrag (`game/missions.ts`) som starter når kapitlet er lest,
  og gir fagpoeng og penger når målet er nådd (f.eks. tre planlagte omforinger, to døgn der alt stål
  holder kvaliteten, tre døgn med billig strøm). Oppdrag i gang vises i Fagboka-kortet på Verket.
- **Rådgiver:** tre omdømmetap av samme grunn (reklamasjon, sen levering eller havari) på ti døgn gir
  et kort som forklarer årsaken med vanlige ord, peker til kapitlet og tilbyr en spesialist i ti døgn
  for 15 000 × (1 + nivå)² kr: kvalitetsingeniør (måler alt som med spektrometer), planlegger
  (sorterer køen og kjøper inn) eller vedlikeholdsspesialist (bytter foring i tide). Samme rådgiver
  kommer ikke igjen før etter 20 døgn.
- Gamle lagringer regner kapitlene de har som lest.
- Testspilleren leser alle kapitler, tar ikke quiz, og leier spesialist når den har god råd.
  Balanse: 10 / 40 / 104 / 180.

## B-026 Trivsel, kurs, tregere fagpoeng, sikkerhetskopi og batteri (2026-09-24)
Status: gjelder (fagpoeng per charge erstatter tallene i B-018)
Beslutning:
- **Trivsel** (`morale`, 0–100, start 70) for de ansatte. Innsatsen ganges med 0,85 + 0,3 × trivsel/100
  (70 gir +6 %), og folk lærer raskere når de trives. Trivselen drar mot 60, synker med nattskift
  (−1,5 per døgn), havari (−4), reklamasjon (−1), avslått lønnskrav (−15) og skade (−15), og stiger med
  leveranser (+0,5), lønnstillegg (+10), kurs og bonus. Under 35 kan folk si opp.
- **Bonus til alle:** to dagers lønn, trivsel +15, én gang i uka. **Kurs per ansatt:**
  3 000 × (1 + nivå) kr, ferdighet +0,6, ett kurs per ti døgn per person.
- **Fagpoeng per charge:** garasje 0,5, verksted 0,2, støperi 0,25, stålverk 0,2, storverk 0,15.
  Før flyttingen fra verkstedet lå testspilleren på 45–150 ubrukte fagpoeng; nå 2–13.
  Lysbueteknikk og strengstøping koster 200 (var 260), så stålverket ikke står fast.
- **Testspilleren** forsker etter en prioritert liste (det som låser opp neste ovn og støping først)
  og sparer opp til det viktigste, som en spiller som vet hva som gir mest. Den gir bonus når
  trivselen er under 50, og sender de minst erfarne på kurs når det er god råd.
- **Penger og omdømme i verkstedet:** testspilleren når kravene til penger og omdømme omtrent samtidig
  (dag 22–29 og 27–32). At brukeren hadde 1,8 mill. kr med omdømme 18, tyder på at pengene manglet
  noe fornuftig å gå til. Nå kan de brukes på utstyr fra Verket, bonus og kurs, og målkortet viser
  tydelig når man kan flytte. Følg med på om det fortsatt føles skjevt.
- **Sikkerhetskopi:** «Last ned sikkerhetskopi» og «Hent sikkerhetskopi» i Forskning-fanen, og henting
  også på startskjermen (Safari kan slette data for nettsider som ikke er brukt på en uke).
- **Batteri:** skjermen tegnes ikke på nytt når spillet står på pause eller ikke vises.
- Balanse: 10 / 32 / 101 / 185, ingen konkurs.
