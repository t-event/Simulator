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
Status: gjelder, men stegene er endret av B-076, og ekspertmodusen er fjernet (B-077)
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

## B-027 Vinnergrense 1 mrd., planlegger med grense og kreditt-valg, veiledet start (2026-09-24)
Status: gjelder, men vinnergrensen er erstattet av B-106 (10 mrd. i konsernverdi)
Brukeren svarte på spørsmålene fra tilbakemeldingsrunde 2: vinnergrensen må opp, planleggeren må få en
grense og et valg om kreditt, og spillet skal ha en veiledet start som gamle spillere kan hoppe over.
Beslutning:
- **Vinnergrense:** 1 mrd. kr i egenkapital (`WIN_CASH`). Testspilleren har 400–700 mill. kr på dag 240,
  så 300 mill. ville fortsatt kommet for tidlig. Beløp over en milliard vises som «mrd. kr».
- **Planleggeren:** handler ikke lenger på kassekreditten med mindre spilleren huker av for det
  (`autoBuyCredit`, av som standard). Uten kreditt lar den lønn og faste kostnader for ett døgn ligge
  igjen i kassa. Spilleren kan sette et tak for innkjøp per døgn (`autoBuyMaxPerDay`, valg tilpasset
  nivået). Marked viser hva planleggeren har brukt i dag.
- **Veiledet start** (`game/tutorial.ts`): sju steg (velkommen, ta en kontrakt, kjøp skrap, se ovnen
  jobbe, lever, les i fagboka, ferdig) i et kort nederst på skjermen. Stegene går videre av seg selv når
  spilleren har gjort dem, og fanen steget gjelder, blinker. Startskjermen har «Start med veiledning» og
  «Start uten veiledning», og kortet har «Hopp over». Gamle lagringer får ikke veiledning.
- **Lavkarbon i lysbueovn uten øseovn:** reseptsjekken advarer om at karbonet varierer og at en del
  charger vil bomme. (Mekanikken er uendret.)
- **Testspilleren:** bytter ikke støping til et nytt produkt før kontraktene på det gamle er levert, tar
  ikke lavkarbon uten øseovn, og forsker på øsemetallurgi rett etter strengstøping. Uten dette gikk den
  i stålverket inn i bøter og omdømmefall som en forsiktig spiller ville unngått.
- Balanse: 10 / 32 / 83 / 161, alle frø når storverket, ingen konkurs.

## B-028 Foringen holder ca. ni døgn; menyen for planlagt omforing følger levetiden (2026-09-24)
Status: gjelder (erstatter slitasjetallene i B-022)
Brukeren meldte at foringen ble slitt på ett døgn, og at den bør holde minst sju døgn når alt går etter
planen. Menyen for planlagt omforing hadde faste valg (4–14 døgn) som ikke passet med levetiden.
Beslutning:
- `wearPerHeat` er satt så foringen blir 85 % slitt etter ca. ni døgn døgnkontinuerlig drift med normal
  syklustid (digel 0,0072, induksjon 1 t 0,0046, induksjon 5 t 0,0052, lysbue 30 t 0,0049, lysbue 90 t
  0,0039). Med kortere drift per døgn varer den lenger. Feil temperatur og flinke folk (kortere
  charger) trekker litt ned, derfor ni døgn og ikke sju.
- En foring som varer tre ganger så lenge, er en større jobb: omforing koster og tar mer (digel
  5 000 kr / 4 t, induksjon 1 t 25 000 kr / 10 t, induksjon 5 t 120 000 kr / 16 t, lysbue 30 t
  750 000 kr / 30 t, lysbue 90 t 1,8 mill. kr / 36 t). Havari er fortsatt tre ganger dette.
- Menyen for planlagt omforing lager valgene ut fra levetiden med dagens drift (50, 65, 80 og 90 % av
  den), og viser hvor slitt foringen omtrent er på den dagen. Kortet sier hvor mange døgn foringen
  holder, og advarer hvis planen er lengre enn det.
- Med vedlikeholdsplan byttes foringen også hvis den blir 88 % slitt før planlagt dag.
- Balanse: 10 / 32 / 74 / 154. Testspilleren blir rikere (0,06–1,1 mrd. kr på dag 240), så følg med
  på om vinnergrensen på 1 mrd. kommer for tidlig.

## B-029 Skrapklasser, og quiz med ett forsøk (2026-09-24)
Status: gjelder (erstatter omprøving av quiz i B-025)
Brukeren ba om en skrapklasser som gir riktig skrapmiks til resepten, og at feil svar på quizen gir færre
eller ingen poeng uten mulighet til å svare på nytt.
Beslutning:
- **Ny rolle: Skrapklasser** (fra verkstedet, 1 800 kr/døgn, ikke en del av skiftmannskapet).
  - Uten skrapklasser blir blandingen i hver charge omtrentlig: hver skraptype i resepten kan bomme med
    opptil ±25 %, og mangler en type, fylles chargen med det som ligger på lageret.
  - Med skrapklasser følger chargen resepten nøyaktig, og manglende skrap fylles bare med andre typer i
    resepten. Ellers venter ovnen («Mangler skrap til resepten»).
  - Skrapklasseren stopper også dårlige lass (mye kobber og fosfor) ved porten og sender dem i retur for
    full refusjon.
  - Fagboka («Skrapvalg og sporelementer») forklarer rollen. Testspilleren ansetter én når verket går to
    skift.
- **Quiz:** bare ett forsøk per kapittel. Fagpoengene står i forhold til antall riktige svar
  (1 av 2 gir halvparten, 0 gir ingenting). Forklaringene vises etter at svarene er levert, og resultatet
  lagres (`quizScores`). Kapitler med quiz man allerede har bestått, regnes som 2 av 2.
- Balanse: 12 / 36 / 74 / 146.

## B-030 To potter per lysbueovn, og murere som murer opp reservepotta (2026-09-24)
Status: gjelder
Brukeren: «Vi trenger to potter per EAF. Man skal kunne ansette murere som bygger opp den ene potta mens
den andre er i bruk. Dette skal ta ca. fire dager.»
Beslutning:
- Hver lysbueovn har en reservepott (`spareProgress` på ovnen, 0–1). Står den klar når foringen skal
  byttes, blir det et pottebytte: stans på 20 % av omforingstida (minst 4 timer, f.eks. 6 t for 30 t-ovnen),
  og den slitte potta går til murerne. Ildfast stein betales ved byttet (samme pris som en omforing).
- Er reservepotta ikke klar, mures foringen om inne i ovnen som før (full stans), og loggen sier hvorfor.
- Ny rolle **Murer** (fra stålverket, 1 900 kr/døgn, ikke på skift). Oppmuring tar 4 døgn med 2 murere per
  pott, 8 døgn med én. Murerne deles likt mellom pottene som trenger det. Uten murere blir potta ikke murt opp.
- Vedlikeholdskortet viser reservepotta (klar, hvor langt murerne har kommet og døgn igjen, eller «venter på
  murere»), og knappen blir «Bytt pott nå (6 timer)». Verket varsler hvis reservepotta ikke blir murt opp.
  Fagboka (Ildfast foring) forklarer to potter.
- Gamle lagringer får en ferdig reservepott. Testspilleren ansetter to murere per lysbueovn.
- Test i Node (to lysbueovner, 40 døgn): uten murere 74 ovnstimer planlagt stans og 3 omforinger i ovnen;
  med to murere 18 ovnstimer og bare pottebytter. Balanse: 12 / 36 / 74 / 144.

## B-031 Fravær: automatisk ferie, sykdom, influensa og vikarer (2026-09-24)
Status: gjelder (erstatter influensakortet som bare fjernet ett skift)
Brukeren godtok forslaget: automatisk ferie, influensa der flere er borte, og valget mellom å gå ned på
skiftgangen eller leie inn vikarer. Allrounderne blir reserven som dekker fravær.
Beslutning:
- **Ferie:** hver ansatt får 3–5 døgns ferie omtrent hvert 100.–140. døgn, varslet i loggen tre døgn før.
  Høyst en tidel av de ansatte har ferie samtidig; ellers flyttes ferien tre døgn.
- **Sykdom:** 0,5 % sjanse per ansatt per døgn for 1–3 døgn, opptil dobbelt så ofte med lav trivsel og
  30 % oftere med nattskift.
- **Influensa** (hendelseskort, fra 6 ansatte): 20–35 % av de ansatte er syke i 2–4 døgn. Valg: leie
  vikarer (1,5 × lønna til de syke) eller gå ned på skiftgangen til de er tilbake.
- Den som er borte, teller ikke i bemanningen. Ledige allroundere dekker plassene automatisk; ellers går
  verket færre skift. Også planlegger, skrapklasser, murere, reparatører og selgere mangler når de er borte.
- **Vikarer** kan leies manuelt under Folk i 1 eller 3 døgn når noen er borte (1,5 × lønna). Mens vikarene
  er der, dekker de alt fravær.
- Folk-fanen har kortet **Fravær** (hvem som er borte, ferie som kommer, hva det koster i skift) og merker
  ansatte som er borte. Verket varsler når fravær koster skift.
- Test i Node over 60 døgn: støperi med 11 ansatte fikk 5 fravær og mistet et skift ca. 20 % av tida;
  storverk med 50 ansatte og allroundere i reserve fikk 20 fravær uten tapte skift. Balanse 12 / 31 / 73 / 150.

## B-032 «Hopp over steget» og «Avslutt veiledningen» (2026-09-24)
Status: gjelder (endrer «Hopp over» i B-027)
Brukeren trykket «Hopp over» og ventet å komme til neste steg, men hele veiledningen forsvant.
Beslutning: Veiledningskortet har «Hopp over steget» (neste steg) på steg som ellers venter på at
spilleren gjør noe, og lenken «Avslutt veiledningen» øverst for å fjerne hele veiledningen.

## B-033 Raskere start, engangstips, murere på dagtid, 1× etter kort, konkurs uten råd til foring (2026-09-24)
Status: gjelder
Brukeren: starten tar for lang tid; murerne skal gå dagtid; varsel første gang verket stopper om kvelden,
tips om fart etter «Faste rutiner», varsel om foring i starten, bedre varsel om tomt skraplager og
kreditt, 1× etter popup (trykket feil på 10×), konkurs hvis man ikke har råd til omforing med fullt lån.
Beslutning:
- **Små første ordre:** de to første kontraktene i garasjen er 0,4–0,8 døgns produksjon (ellers 1,5–4).
- **Spoling om natta:** når verket står utenfor arbeidstida og ingenting er i gang (ingen charge, ingen
  støping, ikke mangel på folk), går tida 6 ganger så fort. Toppfeltet viser «⏩ natt». Kan slås av under
  Forskning → Spillet (`skipIdleNights`). En natt i garasjen tar ca. 11 sekunder i stedet for ca. ett minutt.
- **Engangstips** (`game/tips.ts`), vist som et kort med «Skjønner»: arbeidsdagen er over (og hvordan man
  utvider med folk og skift), farten kan skrus opp (etter «Faste rutiner»), foringen slites (ved 55 %),
  skraplageret er tomt, kassa er tom (kassekreditt). Gamle lagringer fra verkstedet og oppover har sett
  tipsene om foring og skrap.
- **Varsler** (rød melding) når ovnen blir stående uten skrap, og når kassa går under null.
- **Etter et kort går spillet på 1×**, og knappene på kortet virker først etter 0,8 sekunder.
- **Murere** jobber dagtid 07–15; oppmuringen er fortsatt ca. fire døgn med to murere per potte.
  Nattillegg gjelder bare dem som går skift (ikke murere, selgere, planleggere osv.).
- **Konkurs** når alle ovner står fordi det ikke er råd til omforing, og lånet er fullt, i tre døgn.
  Sluttskjermen sier hvorfor spillet er over.
- Balanse: 11 / 33 / 77 / 153.

## B-034 Omdømme og reklamasjoner i starten, realistiske frister, søkere ved flytting (2026-09-24)
Status: gjelder
Brukeren: for vanskelig å få omdømme i starten (200 000 kr før omdømme 5), mange reklamasjoner på samme
ordre (flere −0,5 på rad), reklamasjoner når ingen ordre er aktiv, innleid kvalitetsingeniør virket ikke,
rekker nesten ikke ordrene i verkstedet uten ansatte, bryter for nye forespørsler, ingen søkere til de nye
plassene ved flytting.
Beslutning:
- **Én reklamasjon per kontrakt:** flere dårlige partier til samme kontrakt samles, og omdømmet trekkes
  bare én gang per kontrakt. Meldingen sier hvilken dag stålet ble levert (reklamasjoner kommer 0,5–2,5
  døgn etter leveransen).
- **Små kunder er tålmodige:** i garasjen og verkstedet godtar kundene opptil 10 % over kravet, og
  reklamerer i 60 % av tilfellene (ellers 80 %). Dårlige skrappartier er sjeldnere der (3 % mot 5 %).
- **Mer omdømme i garasjen:** kontrakter der gir 1,5 ganger så mye omdømme.
- **Kvalitetsingeniøren** måler også alt på lager med en gang, så dårlige partier ikke leveres, og sier at
  reklamasjoner på stål som alt er levert, kan komme.
- **Frister og anslag** bygger på det verket faktisk har laget de siste døgnene (`realisticDailyT`), ikke
  bare kapasiteten. Salg viser «Blir ferdig ca. dag X (frist dag Y)» og advarer når det ikke rekkes.
- **Bryter** «Ta imot nye forespørsler» i Salg (`pauseOffers`).
- **Søkere:** det finnes alltid søkere til plassene som mangler for neste skift, og nye søkere kommer med
  en gang man flytter.
- **Radioaktive kilder** kom nesten ved hvert store innkjøp i storverket (sjansen var per tonn). Nå høyst
  1 % per innkjøp og høyst én gang per 30 døgn; meldingen sier at det koster omdømme −12.
- Støperiet koster 750 000 kr (var 550 000), fordi pengene kom raskere med færre bøter og tilbakebetalinger.
- Balanse: 10 / 24 / 68 / 141.

## B-035 Verket i underfaner, ny resept-editor, lagerliste og støpefeil (2026-09-24)
Status: gjelder (erstatter reseptslideren og «Resepten gir»-kortet fra B-023)
Brukeren: produksjonskortet tar for stor plass og Verket er for lang; slideren for skraptyper gir ikke
mening; «Foreslå billigste resept» er for langt ned og det bør finnes en dyrere «beste» resept; pris ved
kjøpsknappene; gjør skrapklasseren resepten riktig?; lista på ferdigvarelageret blir svært lang; hva med
støpefeil?
Beslutning:
- **Verket har tre underfaner:** *Oversikt* (anleggsbilde, tips, kompakt produksjonslinje på én rad,
  produksjon nå, mål, fagboka), *Anlegg* (hele kjeden med utstyrsknapper, vedlikehold, kvalitet) og
  *Økonomi* (økonomi og logg). Den kompakte linja viser skrap, ovn(er), støping og lager, og en knapp
  «Bytt foring» når foringen er over 60 % slitt.
- **Resepten** står øverst på Marked: hver skraptype har − og + (10 prosentpoeng); de andre typene i
  resepten justeres i samme forhold, så summen alltid er 100 % (`nudgeRecipe`). To forslag med pris per
  tonn: *Billigst* (holder kravet med margin) og *Sikrest* (lengst unna grensene, dyrere). Kravsjekken og
  kostnadene står i samme kort.
- **Skrapklasser i resepten:** med skrapklasser står det at blandingen blir nøyaktig, med valget «Vent
  heller enn å fylle med skrap som ikke står i resepten» (`graderStrict`). Uten skrapklasser viser kortet
  hva en dårlig charge kan gi (±25 % per skraptype) og om det fortsatt holder.
- **Kjøpsknappene** viser hva kjøpet koster.
- **Ferdigvarelageret** viser de seks største partiene, med «Vis alle».
- **Støpefeil** håndteres automatisk: selg på spot (standard), smelt om som returskrap (kjent analyse,
  gratis skrap) eller behold (`secondsAction`). Det er ikke laget noen egen «spare til senere»-plan, fordi
  omsmelting til returskrap gir den muligheten på en enkel måte.

## B-036 Småfeil og tekst: potte, porten, nattillegg, fagbok-kapitler, vedlikehold, nestenulykke (2026-09-24)
Status: gjelder
Beslutning:
- «pott» → **«potte»** (reservepotte, bytt potte, per potte).
- «porten» er ikke riktig ord: skrapet måles **«når det kommer inn på verket»**; skrapklasseren stopper
  dårlige partier **«før de tas imot»**.
- Skiftplanen viser **«Ingen nattillegg med dette skiftet»** i stedet for «0 %».
- Forskning: knappen heter **«Les «kapittelnavn»»**, og kapitlet åpnes (og låses opp) selv om det ikke
  var kommet i fagboka ennå.
- Vedlikehold: planlagt omforing vises som en tydelig **låst boks** til «Vedlikeholdsplan» er forsket fram,
  og **skjules** når reparatøren bytter foringen automatisk. Er reparatøren borte (ferie/syk), sier kortet
  at foringen ikke byttes før hen er tilbake.
- **Nestenulykke:** verneutstyr gir trivsel +5 og omdømme +1; å la det gå gir alltid trivsel −5 og
  omdømme −1, i tillegg til risikoen for skade.

## B-037 Øseovnsoperatør i stedet for laborant (2026-09-24)
Status: gjelder (erstatter laborant-rollen)
Brukeren: laboranten byttes med øseovnsoperatør, som tar prøver, sjekker spektro og legerer øsa så stålet
er innenfor kravet før strengstøpingen. For dårlig stål fra stålovnen gir bom; feil temperatur kan få
strengene til å gro igjen; stål utenfor kravet må skrapes eller sperres.
Beslutning:
- Rollen `lab` heter nå **Øseovnsoperatør** (1 900 kr/døgn). Den trengs én per skift når verket har
  øseovn (ikke lenger for spektrometeret), og søkere kommer fra stålverket.
- Ferdigheten til øseovnsoperatørene på jobb (`ladleSkill`) styrer:
  - hvor presist karbonet treffes (spredning 0,012 × (1,6 − 0,15 × ferdighet)),
  - sjansen for feil temperatur til støping (0,03 × (1,8 − 0,2 × ferdighet)); for kaldt stål gir
    meldingen «strengen grodde igjen»,
  - om stål som ikke holder kravet blir oppdaget (0,45 + 0,12 × ferdighet): karbon rettes i øsa;
    fosfor og kobber kan ikke rettes, og da **sperres** stålet (2. sortering). Blir avviket ikke oppdaget,
    sperres stålet når det oppdages senere.
- Fagboka (Øseovnen) forklarer rollen. Reseptsjekken advarer nå også om armering (smalt karbonvindu)
  uten øseovn, og testspilleren tar ikke armering uten øseovn eller spektrometer.
- Balanse: 10 / 24 / 62 / 138.

## B-038 Ny ovn er «byttet» dagen den kjøpes (2026-09-24)
Status: gjelder
Brukeren meldte at «døgn siden omforing» var feil for ovn nummer to rett etter kjøpet (62 døgn).
Beslutning: En ny ovn og en ny ovnstype får `lastRelineDay` = dagen de settes i drift. Gamle lagringer med
«byttet dag 1» får dagen anslått ut fra antall charger på foringen og hvor mange charger verket kjører per døgn.

## B-039 To kvaliteter samtidig, og vikarer som ikke går hjem for tidlig (2026-09-24)
Status: gjelder
Brukeren ville kunne lage to kvaliteter samtidig med to ovner, få varsel om ferie og sykdom, og meldte at
skiftgangen gikk ned selv om vikarer var leid inn.
Beslutning:
- Hver ovn kan ha sin egen kvalitet (`FurnaceUnit.grade`, null = samme som ovn 1). Med «Følg ordrekøen» og
  «To kvaliteter samtidig» (`settings.splitGrades`, på som standard) tar ovn 2 neste kvalitet i køen når den er
  en annen enn ovn 1 sin. Uten å følge køen velges kvaliteten for ovn 2 på Verket. Hver ovn bruker resepten for
  sin kvalitet (`gradeRecipes`); Resept-kortet får én fane per kvalitet som er i bruk. Støpingen er som før: én
  kø, én øse av gangen. Automatisk innkjøp kjøper etter alle ovnenes resepter.
- Vikarer: i test dekket de fraværet så lenge de var leid inn. Men de gikk hjem etter antall døgn som var
  valgt, selv om folk fortsatt var borte eller nye ble syke. Nå: knapp «Vikarer til alle er tilbake», varsel
  når vikarene går hjem mens fraværet fortsatt koster skift, og et valg om å leie inn vikarer automatisk
  (`settings.autoTemps`, av som standard). Vikarer koster bare for døgnene hver enkelt er borte.
- Ferie varsles som hendelse (toast) når den avtales, og igjen dagen den starter. Sykdom varsles som før.

## B-040 Rammeavtaler fra stålverket (2026-09-24)
Status: gjelder
Brukeren ville ha faste kontrakter som varer lenger, senere i spillet.
Beslutning: Fra Stålverk (nivå 3) tilbyr store kunder av og til rammeavtaler (ca. 20 % sjanse per døgn når
ingen tilbud står åpent). Maks 2 aktive avtaler i stålverket og 3 i storverket. En avtale er 20–40 % av en ukes
realistiske produksjon, i 4–10 uker, til fast pris (markedspris ±3–4 % ved signering). Hver uke legges en
vanlig kontrakt med sju døgns frist i ordrekøen, så levering, bot og omdømme går som før. Alle uker i tide gir
bonus (5 % av avtalens verdi, omdømme 2 + 0,4 per uke og fagpoeng). To uker uten full leveranse gjør at kunden
sier opp, og omdømmet trekkes like mye som bonusen ville gitt. Lager verket ikke lenger varen (ny støping eller
valseverk), avsluttes avtalen uten straff. «Ta imot nye forespørsler» gjelder også rammeavtaler.
Balanse: testspilleren tar avtaler som er under 35 % av en ukes produksjon og i kvaliteten den kjører.
Nivådager: 10 / 24 / 62 / 142.

## B-041 Utstyrsknapp på hver ovn (2026-09-24)
Status: gjelder
Brukeren ville at ovn 2 skulle ha egen «utstyrsbutikk» som ovn 1.
Beslutning: «Utstyr» vises på hver ovn i Anlegg og åpner ovnsutstyret. Alle ovnene er av samme type, og ny
ovnstype eller nytt ovnsutstyr gjelder alle ovnene samtidig. Det står nå i butikken når verket har flere
ovner. Egen ovnstype per ovn er ikke laget; det ville krevd at kapasitet, mannskap og strøm regnes per ovn.

## B-042 Strømavtalen går ut, og valg av forespørsler (2026-09-24)
Status: gjelder (erstatter delen av B-024 om at fastpris fornyes av seg selv)
Brukeren ville se hvor lenge strømavtalen varer, få varsel når den går ut, vite hvilken avtale som er standard,
og kunne velge hvilke forespørsler som kommer.
Beslutning:
- Spotpris er standard. Når bindingstida (30 døgn) er ute, går verket tilbake til spotpris, med mindre
  «Forny fastpris og nattariff av seg selv» (`settings.powerAutoRenew`) er på. Da fornyes avtalen, fastpris til
  dagens tilbudspris. Før B-042 ble fastpris fornyet av seg selv, så gamle lagringer med fastpris får valget på.
- Strømkortet viser «N døgn igjen» og hvilken dag avtalen gjelder til. Varsel tre døgn og ett døgn før, og
  når avtalen går ut eller fornyes.
- Salg: spilleren velger hvilke kvaliteter hen vil ha forespørsler på (`settings.offerGrades`, tom = alle).
  Nye forespørsler og rammeavtaler kommer bare fra kunder som kjøper noen av dem, og åpne forespørsler i en
  kvalitet som velges bort, avslås. Forespørslene kan sorteres etter svarfrist, verdi, pris per tonn eller
  kvalitet (`settings.offerSort`). Uten filter trekkes kunde og kvalitet som før, så balansen er uendret.

## B-043 Lavkarbon, resept ved kvalitetsbytte, allroundere som stedfortredere (2026-09-24)
Status: gjelder
Brukeren meldte at skrapklasseren ikke fikset lavkarbon, at planleggeren ikke kjøpte skrap til lavkarbon, at
vikarer ikke dekket støpere, og ville at allroundere flytter seg dit de trengs.
Funn: Når ordrekøen byttet til en kvalitet uten lagret resept, ble den gamle resepten beholdt. Da fulgte
skrapklasseren og planleggerens innkjøp feil blanding. I tillegg bommet lavkarbon ca. 4 av 10 charger i
induksjonsovn selv med riktig resept, fordi rent nyskrap lå helt oppe ved grensen (C 0,08) og karbonet spriket.
Beslutning:
- Ved kvalitetsbytte (ovn 1 og ovn 2) sjekkes resepten. Holder den ikke, legger skrapklasseren eller
  planleggeren om til sikreste blanding av åpent skrap; uten dem får spilleren varsel.
- Rent nyskrap har C 0,06 (gamle lagre rettes ved lasting). Med skrapklasser spriker karbonet i ovner uten
  avkulling 60 % mindre.
- Vikarer: motoren dekket fraværet riktig i test. Bemanningstabellen viser nå «herav N vikarer» og «N borte»,
  så det synes hvem som dekkes.
- Allroundere fylte allerede hull på skiftene; det står nå tydelig. ~~I tillegg går en allrounder som ikke trengs
  på skiftene inn som reparatør, skrapklasser eller murer når alle med den rollen er borte.~~ (Erstattet av B-047.)
- Testspilleren forsker på strålevern og kjøper strålingsportal etter en radioaktiv kilde, slik en fornuftig
  spiller ville gjort (ellers ble balansen avhengig av flaks).

## B-044 Salg med underfaner (2026-09-24)
Status: gjelder
Brukeren syntes Salg-siden var for lang.
Beslutning: Salg har underfanene Forespørsler, Ordrekø, Lager og Avtaler (sistnevnte bare når rammeavtaler er
låst opp, fra Stålverk – ingen låst forhåndsvisning). Kvalitetsvalg og sortering, krav/omdømme/bot på hver
forespørsel og lagerinnstillingene er foldet sammen.

## B-045 Liten induksjonsovn i garasjen (2026-09-24)
Status: gjelder (erstatter gassfyrt digel fra B-001)
Brukeren ville starte med en liten induksjonsovn i stedet for gassfyrt digel.
Beslutning: Garasjen starter med «Liten induksjonsovn 250 kg» (strøm, 750 kWh/t, 100 min per charge).
Forskningen «Induksjonssmelting» heter nå «Større induksjonsovn». I garasjen vises bare strømprisen;
strømavtaler og effekttariff kommer fra verkstedet. Gamle lagringer med digel får den nye ovnen.
Balanse: 8 / 24 / 63 / 136.

## B-046 Strengstøping med to kvaliteter: sekvenser og overgangsemner (2026-09-24)
Status: gjelder (utfyller B-039)
Brukeren påpekte at støpingen må vente med å kjøre en ny kvalitet, fordi det blir overgangsemner som må skrapes.
Beslutning: Gjelder bare strengstøping (blokk- og formstøping støper hver øse for seg).
- Maskinen støper én kvalitet om gangen. Står en øse med samme kvalitet som sist i køen, tas den først.
- En øse med annen kvalitet venter til støpingen har stått i 30 min (sekvensen er slutt og fordeleren tom) –
  da starter den nye kvaliteten uten tap.
- Har øsa ventet i 90 min, byttes kvaliteten midt i sekvensen. Da skrapes overgangsemnene (5 % av en times
  støpekapasitet, høyst halve øsa) og går til returskrap. Første gang forklares det i et varsel; Kvalitet-kortet
  viser tonn overgangsemner siste uke.
- Mens øsa venter, står den i køen, og ovnen kan bli stående med ferdig stål («Venter på støping»).
Test: 2 × 30 t lysbueovn på 1-strengs maskin: 525 t på 48 t med to kvaliteter mot 584 t med én, 8 t
overgangsemner. Små induksjonsøser gir ingen tap, fordi støpingen uansett står mellom øsene.
Balanse uendret: 8 / 24 / 63 / 136.

## B-047 Avløser i stedet for allrounder, og Folk med underfaner (2026-09-24)
Status: gjelder (erstatter stedfortreder-delen av B-043)
Brukeren ville ikke at allroundere skal kunne være reparatør, skrapklasser eller murer, ville kalle rollen
«Avløser», og syntes Folk-siden var rotete.
Beslutning:
- Rollen heter Avløser (intern id er fortsatt `allround`, så lagrede spill virker). Avløsere tar bare plasser på
  skiftene (ovn, støping, kran, øseovn, valsing), også når noen er borte. De står ikke for reparatør,
  skrapklasser eller murer.
- Folk har underfanene Skift, Ansett, Ansatte og Fravær. Skift viser hovedlinja («Verket går N av 3 skift»),
  hva som mangler for neste skift med knapp for å ansette, varsel når fravær koster skift, og bemanningstabellen
  sammenfoldet. Ansett har søkerne og rollebeskrivelsene (sammenfoldet). Ansatte har trivsel og listen.
  Fravær har vikarer og ferie. Fravær-fanen blir oransje når fraværet koster skift.

## B-048 Lager-knappen og skrapinnkjøp som stopper (2026-09-24)
Status: gjelder
Brukeren meldte at Lager-knappen på Verket åpnet Forespørsler, og at ovnen fortsatt stoppet fordi skrapet til
lavkarbon ikke ble kjøpt inn.
Beslutning:
- Navigasjonen kan åpne en underfane: Lager-knappen, «Til salg» og tipset om fullt lager åpner Salg → Lager.
- Innkjøpet virket i test når planleggeren var på jobb og det var penger og plass. Men det stoppet helt når
  planleggeren hadde ferie eller var syk. Nå går planleggerens faste bestillinger videre mens hen er borte.
- Får planleggeren ikke kjøpt det resepten trenger, lagres grunnen (for lite penger og kreditt ikke tillatt,
  kreditten brukt opp, døgngrensen nådd, eller fullt skraplager). Grunnen står i varselet når ovnen stopper, i
  tipset på Verket og under planleggeren på Marked.
- Startmeldingen i garasjen nevner ikke lenger digel.

## B-049 Si hvilket skrap ovnen venter på (2026-09-24)
Status: gjelder
Brukeren sendte skjermbilder der ovn 1 sto med «Mangler skrap til resepten» for lavkarbon (bildene var fra før
B-048 ble publisert). I test kjøper planleggeren rent nyskrap som den skal; uten planlegger må spilleren kjøpe selv.
Beslutning: Varselet og tipset på Verket sier hvilke skraptyper resepten mangler til neste charge
(«Resepten trenger rent nyskrap»). Under Marked er de skraptypene merket med oransje ramme og en linje om at
ovnen venter på dem.

## B-050 Innleide vikarer til plasser som mangler (2026-09-24)
Status: gjelder
Brukeren meldte at skiftgangen gikk ned selv med vikarer. Skjermbildet viste at vikarene dekket den som hadde
ferie, men at verket manglet én støper for tre skift og hadde fullt antall ansatte (24 av 24). Vikarer for
fravær erstatter bare folk som er borte, ikke plasser ingen har.
Beslutning:
- «Lei inn vikarer i 3 døgn» fyller plassene som mangler for neste skift. Innleide koster halvannen gang lønna,
  betales på forhånd og teller ikke mot antall ansatte. De går hjem når tida er ute, med varsel.
- Skift-fanen sier når verket er fullt, og hva man kan gjøre: leie inn, si opp noen som ikke trengs på
  skiftene, eller flytte.
- Bemanningstabellen viser «+ N innleid», og under tabellen står andre jobber (ikke på skift) og ansatte i
  roller verket ikke bruker nå (f.eks. øseovnsoperatører uten øseovn) som tar plass blant de ansatte.

## B-051 Marked og Forskning med underfaner (2026-09-24)
Status: gjelder
Brukeren syntes Marked- og Forskning-sidene var for lange.
Beslutning:
- Marked har underfanene Skrap, Resept, Strøm/Energi og Priser. Skrap er standard. Fanen blir oransje når
  ovnen mangler skrap (Skrap) eller resepten ikke holder kravet (Resept). Tips og knapper på Verket åpner riktig
  fane. Beskrivelsen av hver skraptype vises når man trykker på navnet (ⓘ), og planleggerens innstillinger er
  foldet sammen (åpne når planleggeren ikke får kjøpt).
- Forskning har underfanene Forskning, Bank og Innstillinger (nytt spill, sikkerhetskopi, spoling, valsing).
  Forskningslista er delt i «Klar til å forske» (kort med knapp), «Trenger mer fagpoeng eller lesing» (kompakt
  liste med leseknapp) og neste nivå / forsket fram (sammenfoldet).
- Felles `SubTabs`-komponent i `ui/common.tsx`.

## B-052 Færre fagpoeng per charge, og testspilleren tar quiz (2026-09-25)
Status: gjelder (justerer B-026)
Brukeren fikk fagpoeng for fort i støperiet. Testspilleren tok ikke quiz, så den fikk langt færre fagpoeng enn
en ekte spiller, og balansen målte feil ting.
Beslutning: Fagpoeng per charge er 0,5 / 0,2 / 0,15 / 0,2 / 0,15 per nivå (støperiet ned fra 0,25), og deles på
kvadratroten av antall ovner (to like ovner lærer deg ikke dobbelt så mye). Testspilleren tar quizene med ca. tre
av fire riktige. Nivådager etter endringen: 8 / 26 / 67 / 149.

## B-053 Automatiske vikarer ved sykdom om natta (2026-09-25)
Status: gjelder
Brukeren meldte at automatiske vikarer kom for sent. Sykdom settes i døgnsjekken ved midnatt, som går etter
timesjekken; vikarene ble først leid inn en time senere. Nå sjekkes vikarene rett etter at fraværet er satt.
Test: 20 døgn med automatiske vikarer ga ingen timer med færre skift enn fullt.

## B-054 Automatikk låses opp med fagpoeng (2026-09-25)
Status: gjelder
Brukeren ville at all automatikk skal forskes fram, så ikke alt skjer av seg selv fra start.
Beslutning: Nye forskninger: «Faste salgsrutiner» (garasje, 5 FP: automatisk spot-salg og støpefeil),
«Ordreplanlegging» (verksted, 10 FP: følg ordrekøen, to kvaliteter, planleggeren sorterer), «Innkjøpsplan»
(støperi, 25 FP: planleggerens innkjøp) og «Bemanningsplan» (støperi, 20 FP: automatiske vikarer). Eksisterende
forskning låser opp resten: «Vedlikeholdsplan» (reparatøren bytter foring), «Energistyring» (fornyelse av
strømavtaler) og «Stødig drift» (spoling om natta). Låst automatikk vises med 🔒 og navnet på forskningen.
Uten salgsrutiner blir støpefeil liggende på lageret. Uten ordreplanlegging får spilleren et tips når første
ordre vil ha en annen kvalitet enn ovnen lager. Gamle lagringer får de nye forskningene for nivået sitt, så
ingenting slutter å virke. Felles sjekk: `auto(g, key)` i `research.ts`, bryter: `ui/AutoToggle.tsx`.

## B-055 Gjennomgang: småfeil rettet (2026-09-25)
Status: gjelder
Brukeren ba om en gjennomgang av koden. Testet med en «tilfeldig spiller» (16 spill fra verksted til storverk,
alle handlinger i tilfeldig rekkefølge, sjekk av NaN, negative lagre, lagring/lasting) og en klikk-gjennom av
alle sider og underfaner på alle nivåer på mobil og desktop. Ingen krasj eller konsollfeil.
Rettet:
- Fullt lager med automatisk salg solgte alle støpefeil, også når spilleren hadde valgt omsmelting eller å
  beholde dem.
- «Ansett til manglende plasser» og innleie regnet syke og folk på ferie som manglende, så man ansatte fast folk
  for et kortvarig fravær. Nå telles bare plasser ingen har; fravær dekkes av vikarer.
- Folk som er borte, ble flinkere av å jobbe.
- Tipset om natta lovte spoling, som nå krever «Stødig drift».

## B-056 Flere forespørsler i garasjen og verkstedet (2026-09-25)
Status: gjelder
Brukeren fikk for få ordrer å lage i garasjen og verkstedet. Målt: ca. 1,1 forespørsel i døgnet i garasjen og
1,4 i verkstedet, og i verkstedet kunne én av fem ikke lages med skrapet som var åpent.
Beslutning: Grunnraten er 2,2 i garasjen og 2,6 i verkstedet (før 1,2 og 1,8); nivåene over er uendret. Inntil
fire åpne forespørsler samtidig (før tre). Ber en kunde om en kvalitet verket ikke kan lage med åpent skrap,
byttes den i tre av fire tilfeller til en kvalitet kunden også kjøper og verket kan lage – resten viser hva som
kan forskes fram. Balanse: 8 / 26 / 66 / 159.

## B-057 Avbryte ordrer mot straff (2026-09-25)
Status: gjelder
Brukeren ville kunne avbryte ordrer, med straff. Beslutning: «Avbryt ordren…» i ordrekøen, med bekreftelse.
Straffen er 60 % av boten for ulevert stål og halve omdømmetapet ved sen levering – billigere enn å bomme på
fristen, fordi kunden får vite det i tide. En avbrutt ukeleveranse i en rammeavtale teller som en uke for sent.

## B-058 Gjennomgang av resepten for nye kvaliteter (2026-09-25)
Status: gjelder
Brukeren ville få en gjennomgang av hvordan man lager riktig skrapresept når en bedre kvalitet låses opp.
Beslutning: En reseptguide i samme boks som veiledningen i starten, i seks steg: kravene forklart, rent nok
skrap (hvilken forskning som trengs), velg kvaliteten, lag resepten («Billigst»/«Sikrest»), kjøp skrapet og
klar. Stegene går videre av seg selv når de er gjort, og «Vis meg» åpner riktig fane. Guiden starter når verket
flytter til et nivå med nye kvaliteter, og kan startes fra Resept-fanen for kvaliteten som vises.
Filer: `game/recipeGuide.ts`, `ui/RecipeGuide.tsx`.

## B-059 Gjennomgang av tekstene i spillet (2026-09-25)
Status: gjelder
Brukeren ba om at spørsmålet «Hvorfor lønner det seg å måle analysen?» heter «… å analysere stålet?», og om
en gjennomgang av teksten i spillet.
Rettet:
- Quiz: spørsmålet over; fagord forklart («basisk (kalkrik) slagg», oksygen/jernoksid i stedet for bare FeO);
  «spektrometer» i stedet for «gnistspektrometer».
- Fagboka: «digel- eller induksjonsovn» → «induksjonsovn» (garasjen har ikke digel lenger), «analyseutstyr»
  i stedet for «laboratorium», FeO forklart.
- Rådgiveren viste til knappen «Foreslå billigste resept», som ikke finnes; nå «Sikrest» under Marked → Resept.
  Den innleide planleggeren sorterer og kjøper nå også uten forskningen for automatikk.
- Beskrivelser: lavkarbon (kan lages med rent skrap med lite karbon), planleggeren (krever forskning), verkstedet
  (større induksjonsovn), energistyring (ikke «digel»).
- «innen to dager» → «døgn», «de neste dagene» → «døgnene»; «under kredittgrensen» → «over».
- Tips som viste til steder som er flyttet: lån under Forskning → Bank; «Bytt foring» på Verket.
- Desimaltall i meldinger vises med komma (omdømme −4,8, 1,5 timer) i stedet for punktum.

## B-060 Nivåene nevnes så en ny spiller forstår dem (2026-09-25)
Status: gjelder
Brukeren påpekte at «Fra støperiet kan du …» ikke sier en ny spiller noe: man vet ikke at støperiet er et nivå,
eller hvor langt unna det er.
- Ny hjelper `stageRef(nivå, nåværende)` i `data.ts` gir «støperiet (neste nivå)» når det er neste nivå, ellers
  «stålverket (nivå 4 av 5)».
- Tekstene sier «når du har flyttet til …» i stedet for «fra …»: planlegger og strømavtaler på Marked, ansatte og
  daglig leder under Folk, låst utstyr, låst forskning («Kommer i …»), søkere i garasjen og natt-tipset.
- Målkortet på Verket heter «Mål: Støperi (nivå 3 av 5)», så «neste nivå» henger sammen med det spilleren ser.

## B-061 Varselet om foringen åpner vedlikehold, og Anlegg viser utstyr du har råd til (2026-09-25)
Status: gjelder
Brukeren meldte at varselet om å bytte foring ikke førte til vedlikeholdskortet, og ville ha et merke på Anlegg
når en oppgradering kan kjøpes.
- Hintet «Foringen er nesten slitt gjennom» og varselet i produksjonslinja («Foringen er 84 % slitt. Se
  vedlikehold →») åpner underfanen Anlegg og ruller til Vedlikehold-kortet. Kort med `id` har `scroll-margin-top`,
  så de ikke havner under den faste toppen.
- Underfanen Anlegg har et gult tall (`readyUpgrades` i `stations.ts`): utstyr på dette nivået som kan kjøpes nå og
  som du har råd til.

## B-062 Balanse hele veien: nybegynner i testspilleren, fagpoeng på stålverket og feller fjernet (2026-09-25)
Status: gjelder (justerer B-052)
Brukeren ba om en test av om spillet er for lett eller for vanskelig på de forskjellige nivåene.
Nytt verktøy: `npx tsx src/game/balance.ts --vansker` viser per nivå hva som sperrer flyttingen, hvor ofte ny ovn
eller støping venter på forskning, fagpoeng per døgn, minste kasse, resultat, leveranser og forsinkelser, for en
flink spiller og en **nybegynner**. Nybegynneren ser innom hver tredje time, svarer riktig på halve quizen, tar bare
kontrakter Salg viser grønt, bruker sikreste resept, forsker på det utstyrskortene sier mangler og følger
«Neste store steg» og hintene. Den kjøres også i CI (storverket innen dag 240, ingen konkurs).
Funn og tiltak:
- **Fagpoeng på stålverket:** fagpoeng per døgn lå på 4–6 hele spillet, mens forskningen koster ti ganger mer.
  Lysbueovnen (færre, større charger) ga bare en firedel av fagpoengene. Nå ganges fagpoeng per charge med
  kvadratroten av chargestørrelsen over 5 t, og forskningen for nivå 4 koster ca. 25 % mindre (lysbue,
  strengstøping og øsemetallurgi 150, forvarming og høyeffekt 120, skumslagg 150, valsing 180, eksport 300).
  Nivå 0–3 er uendret (brukeren syntes fagpoengene kom for fort i støperiet).
- **Bytte av støping:** å gå fra støpegods til blokker med støpegodskontrakter i køen ga en kjede av forsinkelser
  som tok omdømmet fra 25 til 0. Nå kan støpingen ikke kjøpes før kontraktene på det gamle produktet er levert
  (det som ligger på lager, teller med): «Lever først kontraktene på støpegods (X t igjen)».
- **Tom kasse etter store kjøp:** planleggeren handler ikke på kreditt som standard, så et kjøp som tømte kassa
  stoppet skrapinnkjøpet og verket til konkurs. Utstyr får en advarsel når det etter kjøpet er penger til under to
  døgns drift, og hintet sier hva spilleren kan gjøre (gi planleggeren lov til kreditt, lån, selg fra lageret).
- **Anslaget på Salg** regner med ukeleveransene fra rammeavtalene som kommer før fristen, og viser gult «Knapt»
  når kontrakten tar mer enn 80 % av tida (`CONTRACT_MARGIN`). Før bommet selv forsiktige spillere på grønne
  kontrakter.
- **«Neste store steg»** på målkortet: den neste ovnen eller støpingen på nivået og hva som mangler (penger,
  forskning eller levering). Nybegynneren brukte før pengene på småutstyr og sparte aldri til ovnen.
Resultat: flink spiller 8 / 26 / 66 / 133 (før 8 / 26 / 66 / 159), nybegynner når storverket rundt dag 170, ingen
konkurs. Penger og omdømme kommer nesten samtidig på hvert nivå.
Ikke endret: på storverket tjener spilleren 10–12 mill. kr i døgnet og har lite å kjøpe, så de siste ca. 90 døgnene
fram til vinnergrensen (1 mrd., B-027) er venting. Det er et spørsmål til brukeren (mer innhold eller lavere grense).

## B-063 Ingen skjult automatikk for foring og resept, og varsel på Skrap (2026-09-25)
Status: gjelder (justerer B-043)
Brukeren mistenkte at omforing skjer av seg selv uten reparatør eller plan, og at resepten ordner seg uten
skrapklasser. Ønsket også et varsel på Skrap-knappen når resepten mangler en skraptype.
Funn:
- **Foring:** motoren bytter bare foring når spilleren ber om det, etter vedlikeholdsplanen, av reparatøren (med
  automatikken på) eller av vedlikeholdsspesialisten fra rådgiveren (ti døgn). En test med alt av i 25 døgn på tre
  nivåer ga ingen omforinger, bare havarier (etter et havari er foringen ny). Men spesialisten ble logget som
  «av reparatøren», og alle omforinger het «Planlagt stans», så det så ut som automatikk.
- **Resept:** når ovnen byttet kvalitet etter ordrekøen, la **planleggeren** om resepten selv – også uten
  skrapklasser.
Beslutning:
- Bare skrapklasseren legger om resepten (B-043 sa skrapklasser eller planlegger). Planleggeren kjøper bare inn.
  Beskrivelsene av planlegger og skrapklasser er rettet.
- Loggen sier hvem som bestilte omforingen («du bestilte det», planen, reparatøren, spesialisten).
- Vedlikehold-kortet sier alltid hvem som bytter foringen nå, og «Ingen bytter foringen for deg» i gult når ingen
  gjør det.
- Skrap i produksjonslinja (Oversikt) og Skraplager under Anlegg får et «!» og «Mangler …» når lageret ikke har
  nok av en skraptype til neste charge etter resepten, med forklaring på hva som skjer med og uten skrapklasser.

## B-064 Forskningssamarbeid: kjøp fagpoeng når forskningen står fast, og «Flytt inn» som er lett å finne (2026-09-25)
Status: gjelder
En kollega av brukeren sto fast på stålverket fordi fagpoengene kom for sakte, og fant ikke «Flytt inn» (målkortet
lå nederst på Oversikt).
Beslutning:
- **Forskningssamarbeid** under Forskning: kjøp fagpoeng for penger, én gang per døgn (`fpDealDay`). Verksted
  5 FP for 15 000 kr, støperi 8 FP for 60 000 kr, stålverk 15 FP for 250 000 kr, storverk 30 FP for 1,5 mill. kr
  (`FP_DEAL`). Omtrent et døgns fagpoeng for en fjerdedel til halvparten av et døgns overskudd. Pengene hoper seg
  opp mens spilleren venter på omdømme, så dette gir en vei videre uten å gjøre forskningen gratis.
  Første forsøk (dobbel pris) gjorde nybegynneren tregere, fordi pengene manglet til neste nivå.
- Står ny ovn eller støping fast på forskning og fagpoengene mangler, viser Verket hvor mange som mangler og
  hvordan man får flere (samarbeid, «Ta styringen», kontrakter og quiz).
- «Slik får du fagpoeng» står på Forskning.
- Hintet «Du kan flytte inn …» åpner Oversikt og ruller til målkortet, og målkortet står øverst når flyttingen er
  mulig.
- Nybegynneren i testspilleren kjøper samarbeid bare når hovedutstyret står fast og den har god råd (minst ti
  ganger prisen). Den når storverket rundt dag 165 (før 174), og forskningen sperrer hovedutstyret på stålverket
  14 % av tida (før 47–69 %).

## B-065 Tall på Ovn, Støping, Skrap og Lager på Oversikt (2026-09-25)
Status: gjelder (utvider B-061)
Brukeren ville se på Ovn-knappen i produksjonslinja (Oversikt) når en oppgradering kan kjøpes; B-061 la bare
merket på underfanen Anlegg.
Beslutning: knappene Skrap, Ovn, Støping og Lager viser hvor mye utstyr på det stedet du kan kjøpe og har råd til
(`stationReady` i `stations.ts`). Har knappen et tall, åpner et trykk utstyret for stedet direkte; ellers går den dit
den gikk før. Mangler resepten skrap, vinner «!» på Skrap-knappen, og den går til Marked.

## B-066 Oversikt hopper ikke, og oppsigelser sier hvilken stilling (2026-09-25)
Status: gjelder
Brukeren meldte at Oversikt flyttet seg opp og ned på noen enheter når «Venter på …» kom under Ovn, og at
varselet om oppsigelse burde si hvilken stilling personen hadde.
- Teksten under knappene i produksjonslinja har alltid plass til to linjer (og kuttes etter to), så knappene har
  samme høyde uansett tilstand. Ovnstilstanden under Anlegg har også fast høyde. Målt med spillet på 10×:
  knapperaden hadde én og samme høyde hele tida på både iPhone SE og iPhone 13.
- Oppsigelser (lav trivsel, lønnskrav) og skader sier navn og stilling, f.eks. «Kari Berg (støper) har sagt opp»,
  og at man ansetter en ny under Folk → Ansett (`workerLabel`, `quitText` i `engine.ts`).

## B-067 Hint når en kvalitet trenger skrap som ikke er forsket fram (2026-09-25)
Status: gjelder
En spiller forsto ikke at han måtte forske fram en ny skraptype for å lage høykarbon. Reseptguiden (B-058) sier
det, men bare én gang når nivået skiftes.
Beslutning: `scrapResearchFor` i `recipe.ts` finner den billigste skrapforskningen som gjør en kvalitet mulig når
ingen blanding av åpent skrap holder kravet (mellomlagret; under 10 ms uten). Rådet («Høykarbon kan ikke lages med
skrapet du har tilgang til – det trengs rent nyskrap. Forsk fram «Rent nyskrap» under Forskning.») vises
- som hint på Verket for kvaliteter ovnen kjører mot eller har aktive kontrakter på,
- på Marked → Resept i stedet for «Ingen blanding … holder kravet»,
- på forespørsler under Salg i stedet for «Resepten gir …».
«Rent nyskrap» i forskningen sier nå at det trengs til høykarbon, premium og lavkarbon (testet: uten det kan de
ikke lages på noe nivå med induksjonsovn).

## B-068 Flytte-hintet bare når målkortet ikke synes (2026-09-25)
Status: gjelder (justerer B-064)
Brukeren påpekte at «Du kan flytte inn … Trykk her» ga lite mening når målkortet med flytteknappen sto rett under.
Beslutning: på Oversikt vises ikke flytte-hintet; målkortet står øverst og får grønn ramme (`is-ready`). På Anlegg
og Økonomi vises hintet fortsatt, og det åpner Oversikt ved målkortet.

## B-069 Tips første gang farten settes ned (2026-09-25)
Status: gjelder (utfyller B-033)
Brukeren ville ha en forklaring første gang spillet setter farten ned av seg selv.
Beslutning: når et hendelseskort eller tips løses og farten var 3× eller 10×, telles det (`counters.fartNed`).
Første gang kommer engangstipset «Hvorfor gikk farten ned til 1×?»: spillet setter farten ned når det skjer noe du
må ta stilling til, så du ikke raser videre på 10× mens verket har problemer; trykk 3× eller 10× igjen når alt er i
orden. Engangstipsene husker nå farten før de dukket opp (før sto det alltid 1×), så også de teller.

## B-070 Sjekk av alle ansatte, og Folk viser hva støtterollene gjør (2026-09-25)
Status: gjelder
Brukeren spurte om murere, selgere og de andre ansatte virker som de skal. Målt med lagrede spill (med og uten
rollen, fravær slått av):
- Selgere: 3 selgere ga 50 % flere forespørsler (2,8 → 4,1 per døgn) og ca. 4 % bedre pris. Virker.
- Murere: to murere per potte gir en ferdig reservepotte på ca. fire døgn, fire murere dobbelt så fort. Virker.
- Reparatører: full dekning (én per nivå) ga 36 % færre elektrodebrudd, færre overslag og 22 % raskere
  reparasjon. Virker.
- Planlegger: uten planlegger stopper innkjøpet (280 mot 683 t på fem døgn). Virker.
- Skrapklasser: færre bom på analysen; effekten er liten med en trygg resept og størst nær grensene.
- Øseovnsoperatør, støper, kranfører, avløser: bemanningen regnes riktig; avløsere fyller hull i rolle-rekkefølge.
Ingen feil i rollene, men Folk viste ikke hva de gjorde. Folk → Ansatte har nå en linje under hver støtterolle med
effekten akkurat nå (f.eks. «3 på jobb: ca. 1,4 flere forespørsler per døgn og 6 % bedre pris», «Før du har
lysbueovn, har de ingenting å gjøre»).
Funnet under testen: testspilleren (frø 7) gikk konkurs fordi den sluttet å ta kontrakter for å bytte støping
(«Lever først», B-062) uten å ha råd til byttet. Nå gjør den det bare når pengene er der. `--dump` henger ikke
lenger ved konkurs.

## B-071 Fagpoeng ukentlig, «!» på Folk, svarfrist i vanlig tempo og hjemskjerm (2026-09-25)
Status: gjelder (justerer B-064)
- Forskningssamarbeidet kan brukes én gang per uke (`FP_DEAL_DAYS`), ikke per døgn – man fikk kjøpt ekstreme
  mengder. Pakkene er større: verksted 10 FP/30 000 kr, støperi 16/120 000, stålverk 30/500 000, storverk
  60/3 mill. (`FP_DEAL`).
- Folk-fanen får «!» når verket står, går færre skift enn det kunne på grunn av fravær, eller (fra støperiet) går
  under tre skift og har ledige plasser.
- Svarfristen på forespørsler og rammeavtaler går i vanlig tempo (1×) også på 3× og 10×, så man rekker å svare.
- Startskjermen tipser om å legge spillet til på hjemskjermen (fullskjerm). Android/Chrome får en knapp når
  nettleseren tilbyr det; ellers vises en oppskrift for iPhone (Del → Legg til på Hjem-skjerm) og Android (⋮ →
  Legg til på startskjermen), og at appen på iPhone har egen lagring.

## B-072 Innstillinger bak ⚙️, banken under Verket → Økonomi (2026-09-25)
Status: gjelder
Brukeren ville ikke ha innstillinger og bank under Forskning. Banken står nå under Verket → Økonomi (der pengene
er), og innstillingene (nattspoling, valsing, sikkerhetskopi, nytt spill) åpnes med ⚙️ øverst ved fagboka.
Forskning-fanen har bare forskning. Tekster som viste til «Forskning → Bank» er rettet. Topplinja strammes inn på
smale telefoner, så farten, fagboka og ⚙️ får plass på iPhone SE.

## B-073 4- og 5-skift (2026-09-25)
Status: gjelder
Brukeren spurte hva man skal med 200 ansatte når man bare kan ha tre skift.
Beslutning: døgnet har fortsatt tre vakter (8 timer), men verket kan ha inntil fem fulle **skiftlag**
(`staffing().crews`, `MAX_CREWS`). Med fire eller fem lag får turnusen fridager når verket går døgnet rundt
(`crewBenefits`):
- 4-skift: trivselen trekkes mot 70 i stedet for 60, 20 % færre sykemeldinger, folk lærer 25 % fortere.
- 5-skift: trivselen mot 80, 40 % færre sykemeldinger, 50 % raskere læring.
- De ekstra lagene dekker fravær: skiftene regnes av dem som er på jobb, så verket mister ikke skift.
Kostnaden er lønn til ett eller to lag til, og plass: i praksis stålverket (4-skift) og storverket (5-skift).
Folk → Skift viser skiftordningen, hva neste lag gir, hva som mangler og en knapp «Ansett til 4-skift».
«Ansett til manglende plasser» ansetter som før bare til tre skift (`hireForMissing(g, targetCrews)`).
Målt på storverket i 30 døgn: 3 lag mistet 151 skifttimer til fravær, 4 og 5 lag ingen; 5 lag ga 25 % færre
sykemeldinger per ansattdøgn (fem spill). Testspilleren bruker ikke 4- og 5-skift; balansen er uendret.

## B-074 Oppgraderinger per ovn (2026-09-25)
Status: gjelder (erstatter at ovnstype og ovnsutstyr gjaldt alle ovnene, fra runden med «Ovn 2 skal ha egen
utstyrsbutikk»)
Brukeren: når man kjøper en oppgradering på ovn 1, skal den ikke komme på ovn 2 også.
Beslutning:
- Hver ovn har sin egen **type** (`FurnaceUnit.type`) og sitt eget **ovnsutstyr** (`FurnaceUnit.addons`:
  transformator og conveyor, `Addon.perFurnace`). De kjøpes for én ovn om gangen, til enkeltpris. Utstyr for ovn 2
  har id-en «trafo@1» osv. (`unitId`, `UpgradeOption.unit`/`baseId`). Utstyr for hele verket (røykgassrensing,
  øseovn, ovn nr. 2 …) er som før.
- Charger, strøm, effekt, slitasje, foring og pottebytte regnes per ovn med `unitView(stats, i)`; kapasitet og
  mannskap summeres over ovnene. Verkets ovnstype (`furnaceType`, `g.furnaceType`) er den mest avanserte ovnen og
  brukes til det som gjelder hele verket (lysbue eller ikke, forskning, kontrollrommet).
- Bygges en lysbueovn om til induksjonsovn, forsvinner lysbueutstyret fra den ovnen. En ny ovn nr. 2 er av samme
  type som ovn 1, uten ekstra utstyr. Murerne bygger bare potter til lysbueovner.
- Utstyrsarket for Ovn viser «Hele verket», «Ovn 1 – …» og «Ovn 2 – …».
- Gamle lagringer: `migrate` gir hver ovn verkets type og flytter transformator/conveyor fra `owned` til ovnene.
- Testspilleren kjøper ovnstyper og ovnsutstyr til alle ovnene. Balanse 8 / 26 / 66 / 134.

## B-075 Flere oppgraderinger på storverket (2026-09-25)
Status: gjelder (svar på spørsmålet om storverket fra B-062)
En kollega av brukeren hadde storverket i ti minutter og alle oppgraderingene. Storverket hadde bare to egne
(lysbueovn 90 t og strengstøping med 4 strenger).
Nye oppgraderinger på nivå 5 (storverket), 20–60 mill. kr, alle med tydelig effekt:
- **Ovn nr. 3** (krever ovn nr. 2): en tredje ovn, 70 % av prisen på ovn 1.
- **Strengstøpemaskin, 6 strenger** (45 mill., 170 t/t) – tar unna stålet fra tre ovner.
- **Vakuumavgassing** (30 mill., krever øseovn): 5 % bedre pris.
- **Havnekai** (40 mill., krever forskningen «Eksportsertifisering»): flere forespørsler, 2 % bedre pris,
  halvannen gang så stort ferdigvarelager.
- **Skrapterminal med skrapsaks** (25 mill.): dobbelt skraplager og 6 % billigere skrap.
- **Varmegjenvinning** (20 mill., krever røykgassrensing): lysbueovnene bruker 8 % mindre strøm.
- **Valseverk nr. 2** (35 mill., krever valseverk): dobbel valsekapasitet.
I tillegg kjøpes lysbueovn 90 t og ovnsutstyr nå per ovn (B-074). Samtidig rettet: en mindre støping på samme nivå
(4 strenger når man har 6) vises ikke lenger som kjøp – testspilleren byttet fram og tilbake.
Resultat: den flinke testspilleren når 1 mrd. rundt dag 207 (før ca. 230) og har kjøp å jobbe mot på storverket;
nybegynneren rundt dag 243. Nivådagene er uendret (8 / 26 / 66 / 134).

## B-076 Kontrollrommet: oksygen samtidig med strøm, manuell avslagging og øse som kan renne over (2026-09-25)
Status: gjelder (endrer stegene i B-010)
Brukeren: oksygenet skal kunne styres mens strømmen går, slaggen skal ikke tømmes av seg selv (for mye avslagging
sender stål ut slaggdøra), ovnen må rettes opp når øsa er full (ellers renner den over), og det var for lett å få
perfekt charge.
Beslutning:
- Smelt, Rens og Tapp har samme kontroller: strøm ▼/▲ og en oksygenbryter. Oksygen hjelper smeltingen og brenner
  karbon, men gir mer slagg og varme.
- **Slagg av:** spilleren tipper ovnen mot slaggdøra og retter den opp selv. Målet er å få slaggen under ca. 1,2 t.
  Fortsetter man under 0,5 t, renner stål ut døra (150 kg/s), og det tapte stålet trekkes fra chargen.
- **Tapping:** en øse-måler viser fyllingen. Spilleren retter opp ovnen når øsa er full (93–100 %). Renner den over,
  går stålet tapt; stopper man for tidlig, blir stål igjen i ovnen og teller som tap.
- Stjernene regnes nå av fem deler, hver 0–3 poeng: smelting, rensing, avslagging, tappetemperatur og øsa.
  5★ krever minst 14 av 15 poeng, 4★ 11, 3★ 8 og 2★ 5. Grønt temperaturvindu ved tapping er ±8 °C.
- Stål som går tapt (`lossFraction`) trekkes fra det flytende stålet når chargen leveres til spillet.
Testet: nybegynneren i `balance.ts` (følger rådene på skjermen, reagerer på 0,5 s i avslagging og tapping) får 4★ på
ca. 120 s; den slurvete får 1★. Playwright på iPhone 13 gikk gjennom alle stegene til resultatet.

## B-077 Det fulle kontrollrommet er fjernet (2026-09-25)
Status: gjelder (erstatter delen av B-010 om ekspertmodus)
Brukeren: «fjern den fulle styringen, og kun bruk den enkle».
Beslutning: Kontrollrommet har bare den enkle styringen. Knappen «Fullt kontrollrom (for viderekomne)» og hele
HMI-et er tatt bort: `ExpertControl.tsx`, `src/components/`, `controlroom.css`, `hooks/useMediaQuery.ts`,
`sim/commands.ts` og biblioteket `recharts`. Prosessmodellen i `src/sim/` er uendret og brukes fortsatt under den
enkle styringen og i `validate.ts`.
Begrunnelse: Den enkle styringen har fått de viktigste grepene (oksygen, avslagging, øse – B-076), og spillet skal
være enkelt. Mindre kode å vedlikeholde og et mindre bygg.

## B-078 «Skift» og «skiftlag» vises hver for seg (2026-09-25)
Status: gjelder (presiserer visningen i B-073)
Brukeren hadde 4-skift, men Folk viste «3 av 3 skift». Døgnet har bare tre skift à 8 timer. 4- og 5-skift betyr
antall **skiftlag** som bytter på dem.
Beslutning: Når verket går døgnet rundt, står det «Verket går døgnet rundt med N skiftlag · N-skift». Ellers står det
«X av 3 skift · T timer i døgnet». Skiftlagene telles uten fravær. Gjør fraværet at færre lag er fulle, står det i
tillegg. Bemanningstabellen viser «Trengs N lag» og «per lag» når verket har mer enn tre lag.

## B-079 Kontrollrommet: strømmen kan slås av, og karbonet kan hentes tilbake (2026-09-25)
Status: gjelder (utfyller B-076)
Brukeren kom ikke videre i rensingen. Karbonet var 0,002 %, og temperaturen steg selv om «alt var av».
Årsaker, målt i prosessmodellen:
- Med oksygen på gjennom hele smeltingen brente oksygenet karbonet ned til 0,005 % før rensingen startet.
  Automatikken blåste bare inn en fast mengde karbon, og i rensingen fantes det ingen måte å få karbonet opp igjen.
- Laveste strømnivå var trafo-tapp 0, ikke av. Det varmet et flatt bad med ca. 2 °C per minutt.
Beslutning:
- Strømmen har nivå 0 = av («Strøm av»). Da kjøles badet ned (ca. 1,3 °C per sekund på skjermen ved 1650 °C).
- Under smeltingen blåser automatikken inn mer karbon når karbonet er under 0,12 %. Rensingen starter da alltid
  over det grønne feltet (0,115 % selv med oksygen hele smeltingen). Grensen er lav med vilje: mer karbon reduserer
  FeO i slagget og gir mindre fosforfjerning (P 0,0201 i testen mot 0,0255 med grense 0,3).
- I rensingen vises knappen «Karbon: av/PÅ» når karbonet er under det grønne feltet (120 kg/min, ca. 9 s fra
  0,01 til 0,05 %). Oksygen og karbon kan ikke stå på samtidig.
- Nybegynneren i `balance.ts` slår på karbon hvis det blir for lavt. Resultatet er fortsatt 4★ og 1★.

## B-080 Kontrollrommet: knappene sier når det er riktig å trykke (2026-09-25)
Status: gjelder (utfyller B-076)
Brukeren syntes avslaggingen og tappingen ikke var intuitive. Målt:
- Slagget rant jevnt ut med ca. 0,4 t i sekundet på skjermen, så det grønne feltet (0,5–1,2 t) varte bare ca. 1,7 s.
- Slaggmåleren gikk til 8 t og sto fast helt til høyre de første sekundene.
- «Rett opp ovnen» og «Tapp nå!» var blå fra start og så klare ut før det var riktig tidspunkt.
- Hintet «Varmer …» sa ikke om temperaturen faktisk steg.
Beslutning:
- Hovedknappen i avslagging, tapping og øse er **grå** til det er riktig tidspunkt, og **oransje og pulserende** når
  det er riktig. Før temperaturen er i det grønne, heter tappeknappen «Tapp likevel (for kaldt)».
- Slaggmåleren går fra 0 til mengden slagg da tippingen startet, så markøren beveger seg fra første sekund.
- Avslaggingen går fortere med mye slagg (fart 20) og saktere under 2,5 t (fart 6). Det grønne feltet varer nå ca. 4 s.
- Hintene viser trenden: «Slagget renner ut … (ca. 14 s)» og «Stiger 1,0 °C i sekundet – grønt om ca. 18 s. Mer strøm
  går fortere.» Stiger ikke temperaturen, står det «gi mer strøm». Trenden jevnes ut over ca. 0,8 s og starter på nytt
  i hvert steg.
- Ovnstegningen kuttes ikke lenger nederst når den tippes.

## B-081 Avtaler-fanen viser antall aktive avtaler (2026-09-25)
Status: gjelder
Brukeren ville se hvor mange aktive rammeavtaler man har, rett på fanen under Salg.
Beslutning: Fanen heter «Avtaler (N)» med N = aktive avtaler. Nye tilbud vises med et grønt merke («Ny» eller «2 nye»)
i stedet for i parentesen, så fanen holder seg på to linjer på mobil.

## B-082 Forespørsler på produkter verket ikke lager lenger, trekkes tilbake (2026-09-25)
Status: gjelder
Brukeren fikk forespørsler på blokker etter at verket var gått over til strengstøping. Nye forespørsler lages bare for
produkter verket kan lage. Gamle, ubesvarte forespørsler ble derimot liggende etter byttet: kjøpssperren (B-062) ser
bare på aktive kontrakter.
Beslutning: Hver time trekkes ubesvarte forespørsler og tilbud om rammeavtaler på produkter verket ikke lager lenger
tilbake, med en linje i loggen («… trakk forespørselen på blokker – verket lager ikke det lenger»). Aktive
rammeavtaler avsluttes fortsatt uten straff (B-040).

## B-083 Med 4- og 5-skift varsles ikke fravær som de ekstra lagene dekker (2026-09-25)
Status: gjelder (justerer fraværsvarslene fra B-039/B-050)
Brukeren: med 4 og 5 skift trengs det ikke varsel om ferie og sykdom, med mindre skiftgangen går ned.
Beslutning: Med flere enn tre fulle skiftlag (uten fravær) står ferie og sykdom bare i loggen, ikke som varsel på
skjermen. Forhåndsvarselet om ferie står også bare i loggen. Mister verket likevel et skift, blir meldingen på selve dagen
et varsel som før. Fravær som er over, fjernes nå før varslene, så telleren ikke regner med folk som er tilbake.
Målt over 30 døgn med 4 lag: 14 av 58 fraværsmeldinger er varsel, og alle gjelder dager da verket ellers ville mistet et
skift.

## B-084 Varsel og bekreftelse før man bytter produkt (blokker → emner) (2026-09-25)
Status: gjelder (utfyller B-062)
Brukeren: man bør få beskjed før man går fra blokker til emner, fordi verket ikke kan lage blokker etterpå.
Beslutning:
- Et engangstips («Før du bytter støping») kommer når en støping med nytt produkt kan kjøpes. Det sier at man skal levere
  ordrene på det gamle produktet først, ikke ta nye forespørsler (eventuelt skru av «Ta imot nye forespørsler»), og at
  ubesvarte forespørsler trekkes tilbake ved byttet. Tipset gjelder bare støping et steg opp, ikke eldre typer.
- «Kjøp» spør først: «Bytte fra blokker til emner? Etterpå kan verket ikke lage blokker lenger.» Spørsmålet sier også
  hvor mange forespørsler som trekkes tilbake, om rammeavtaler avsluttes uten straff (men uten bonus), og hvor mye
  som ligger på lageret og fortsatt kan selges.
- Aktive rammeavtaler sperrer ikke byttet. Det ble prøvd, men da ble testspilleren stående på blokkstøping resten av
  spillet (frø 1 endte på −17 mill. kr). Avtalene avsluttes i stedet uten straff (B-040).

## B-085 Mer å forske på for storverket (2026-09-25)
Status: gjelder
Brukeren gikk tom for forskning kort etter storverket (det fantes bare «Eksportsertifisering»).
Beslutning: Ni nye forskninger på nivå 4, til sammen ca. 3 000 fagpoeng, hver med tydelig effekt:
- Prosessoptimering med data: 5 % kortere tid per charge.
- Elektroderegulering: 5 % mindre strøm i lysbueovnene.
- Skraplogistikk: 5 % billigere skrap.
- Kvalitetsledelse: 40 % færre støpefeil.
- Prediktivt vedlikehold: 25 % færre havarier.
- Høyhastighetsstøping: 15 % mer støpekapasitet.
- Ledelse og arbeidsmiljø: 30 % mindre sykdom, og trivselen driver mot 70 i stedet for 60.
- Produktutvikling: +4 % pris.
- Grønt stål: +5 % pris og flere forespørsler.
Med ca. 15–20 fagpoeng i døgnet varer de i 150–200 døgn. Testspilleren forsker på dem sist.

## B-086 Kontrollrommet: mildere smelting, strømnivå per steg og belønning for godt håndverk (2026-09-25)
Status: gjelder (utfyller B-076)
- Smeltingen: 3★ ved 80 % av tida i det grønne (før 92 %), 2★ ved 60 %, 1★ ved 35 %. Hintene viser om temperaturen
  stiger eller synker.
- Strømmen settes til nivå 2 når rensingen starter og nivå 4 når tappingen starter, så spilleren ikke arver «strøm av».
- 4★ gir 3 % og 5★ 6 % ekstra betaling for stålet i chargen, i tillegg til 8 eller 15 ekstra fagpoeng. 5★ gir også
  omdømme +0,5. Før ga en god charge bare rundt +5 fagpoeng.

## B-087 Symbol i tillegg til farge (2026-09-25)
Status: gjelder
Kontrollromsmålerne viser ✓ når verdien er i det grønne, og ▲/▼ når den er for høy eller lav. Stolpene i
varsel- og faresonen får skrå striper. Da kan fargeblinde lese dem, og de synes bedre i sterkt sollys.

## B-088 Fra kontrollrommet til fagboka (2026-09-25)
Status: gjelder
Steg som får under 3★, får «Hvorfor?» med en kort forklaring på vanlige ord og en knapp til kapitlet i fagboka
(smelting → lysbue, rensing → karbon, avslagging → fosfor, tapping → ildfast, øse → øseovn).

## B-089 Varselliste og valg for varsler (2026-09-25)
Status: gjelder
Varslene på skjermen forsvinner fort, særlig på 10×. 🔔 på raden med nøkkeltall åpner en liste over de siste viktige
hendelsene. Lista kan filtreres på problemer, hendelser og gode nyheter, og merket på 🔔 viser hvor mange som er nye.
Under ⚙️ velger spilleren hva som skal vises på skjermen: alle hendelser, bare problemer eller ingen. Knappen lå først
på toppraden, men da ble «10×» kuttet på smale telefoner, så den ble flyttet ned.

## B-090 Utfordringer på storverket og nytt spill+ (2026-09-25)
Status: gjelder
- Åtte utfordringer på storverket, med fagpoeng og penger (Verket → Oversikt):
  - rekorddøgn på 4 500 t
  - et døgn under 420 kWh/t
  - 30 døgn der alt stålet holder kvaliteten
  - tre perfekte charger i kontrollrommet
  - tre rammeavtaler med bonus
  - omdømme 100
  - 5-skift
  - forsk fram alt

  Tilstanden lagres i `g.missions` med id-er som starter på «u-».
- Seiersskjermen har «Nytt spill+». Neste runde starter i garasjen med mer startkapital (×2 per runde, inntil ×5),
  10 fagpoeng og +3 omdømme per runde. Runden lagres i `g.round`.

## B-091 Seieren ved 1 milliard (2026-09-25)
Status: gjelder, men målet er nå 10 mrd. i konsernverdi (B-106)
Brukeren nådde 1 mrd., men ingenting skjedde. Seieren krever egenkapital (kasse minus lån) på 1 mrd. og ble bare
sjekket ved midnatt. Samtidig rundet beløpene opp, så 999,996 mill. ble vist som «1 000,00 mill.».
Beslutning:
- Seieren sjekkes hver time.
- Beløp rundes ned.
- Storverk-kortet viser egenkapitalen med en stolpe mot målet, og sier om lånet trekkes fra.
- At seiersskjermen er sett, lagres i spillet (`g.winSeen`), så den vises én gang per spill også etter nytt spill+.

## B-092 Færre fagpoeng per charge på storverket (2026-09-25)
Status: gjelder (justerer B-014/B-026)
Tre store ovner ga ca. 35 fagpoeng i døgnet uten noe å bruke dem på, og brukeren syntes de eksploderte. Satsen per
charge på storverket er senket fra 0,15 til 0,1 (før størrelse og antall ovner). Nå er det rundt 15–20 i døgnet, og
forskningen i B-085 bruker dem.

## B-093 Kontrollrommet: oksygenråd, fosfor forklart, ikke oksygen i tappingen (2026-09-25)
Status: gjelder (endrer B-076)
- Smeltingen har en fast linje om oksygenet: vent til halvparten er smeltet, slå det på da, og en advarsel hvis det
  står på for tidlig.
- Avslaggingen: brukeren kunne ikke justere fosforet. Målt: ekstra kalk eller kaldere bad i rensingen flytter fosforet
  under 0,0003 %. Fosforet bestemmes av skrapet og smeltingen. I stedet for en knapp uten effekt forklarer steget at
  man styrer fosforet ved å få slagget ut.
- Tappingen har ikke lenger oksygenbryter; badet varmes bare med strøm.

## B-094 Utstyr mot havarier (2026-09-25)
Status: gjelder
Havariene skjer per charge, så et storverk med mange charger får mange av dem. Nye kjøp:
- Hydraulisk elektroderegulering (per ovn, 4 mill., stålverket): 60 % færre elektrodebrudd og 30 % færre overslag.
- Paneler med lekkasjevarsling (per ovn, 6 mill., storverket): halvparten så mange overslag, og 10 % i stedet for
  30 % av dem slår hull.
- Bruddvarsling i kokillen (8 mill., strengstøping): 60 % færre strenggjennombrudd.

## B-095 Strengstøpemaskin nr. 2 (2026-09-25)
Status: gjelder
Tre lysbueovner på 90 t lager rundt 390 t/t, mens 6 strenger bare støper 170 t/t. Tredje ovn sto derfor og ventet.
«Strengstøpemaskin nr. 2» (40 mill., storverket, 3 støpere per skift) dobler støpekapasiteten. Testspilleren
produserer nå 420 000–540 000 t i stedet for rundt 380 000 t, og vinner rundt dag 200.

## B-096 Anbefalte støtteroller (2026-09-25)
Status: gjelder
Når skiftene er fulle, viser Folk hvilke roller som ikke står på skift, hvor mange som anbefales, og hvorfor:
- reparatører: én per nivå, pluss én i store verk
- selgere: inntil 4
- murere: 2 per lysbueovn
- planlegger: 1
- skrapklasser: 1
- avløsere: 2, men ingen med 4–5 skiftlag

Logikken ligger i `supportAdvice` i `plant.ts`.

## B-097 Automatiske tester av spillmotoren (2026-09-25)
Status: gjelder
`src/game/tests.ts` (`npm test`) har små tester som bygger sin egen tilstand og kjører på under ett sekund. De
dekker blant annet nedrunding av beløp, seier, nytt spill+, migrering, forskningsdata, tilbaketrekking av
forespørsler, støpemaskin nr. 2, anbefalte roller, utfordringer og kontrollrommet. Testene kjøres i CI før
balansetesten.

## B-098 Varsler i kø og loggen synlig på Oversikt (2026-09-25)
Status: gjelder (utfyller B-089)
Brukeren: varslene forsvinner for fort på 10×, og loggen ligger for gjemt.
Beslutning:
- Varslene står i kø i stedet for å skyve hverandre bort. Maks 3 vises samtidig, og hvert står minst 7 sekunder.
  Køen holder inntil 12; resten ligger i varsellista bak 🔔.
- Verket → Oversikt har kortet «Siste hendelser» med de fem siste linjene i loggen.

## B-099 Skrapklasseren og reseptkravet i forespørsler (2026-09-25)
Status: gjelder
Brukeren: forespørselen sa at resepten ikke holder kravet, selv om skrapklasseren kan legge den om.
Beslutning: Holder ikke resepten, men skrapklasseren finner en blanding som gjør det, sier forespørselen det. Den er
grønn når ovnen følger ordrekøen, og gul ellers. Skrapklasseren retter nå også resepten til kvaliteten som alt kjøres,
ikke bare når kvaliteten skifter.

## B-100 Kursrunder hos bedriftshelsetjenesten og sikkerhetssenteret (2026-09-25)
Status: gjelder (endrer B-026)
Brukeren: man bør ikke kunne sende folk på kurs så ofte. Kurs er noe bedriftshelsetjenesten og sikkerhetssenteret
holder med jevne mellomrom.
Beslutning: Kurs holdes hver 14. dag med påmelding i to døgn og 2 + nivå plasser. Samme ansatt må vente 30 døgn
mellom kurs (før 10). Folk viser når neste kursrunde er og hvor mange plasser som er ledige.

## B-101 Fravær per ansatt og advarsel om egenmelding (2026-09-25)
Status: gjelder
Brukeren ville se fraværet til hver ansatt, så man kan gi advarsel når egenmelding misbrukes.
Beslutning:
- Hver ansatt har en historikk over sykefravær. Folk → Fravær viser dem som har vært syke to ganger eller mer på 60
  døgn, og ansattlista merker dem med tre eller mer.
- Omtrent hver femte er «ofte syk» (risiko × 2). Resten har risiko × 0,75, så snittet er som før. Dette avgjøres av
  den ansattes id, ikke av tilfeldighetsgeneratoren, så resten av spillet trekker de samme tallene.
- Etter tre sykefravær på 60 døgn kan man gi en advarsel. Hos den som misbruker, blir risikoen normal i 90 døgn og
  trivselen −1. Var personen faktisk syk, synes kollegene det er urettferdig (trivsel −4).
- Et hint på Verket foreslår advarsel. Begge testspillerne følger det. Uten hint nådde nybegynneren storverket først på
  dag 236 på ett frø.

## B-102 Planlagt bytte av støping (2026-09-25)
Status: gjelder (utfyller B-084)
Brukeren: man bør kunne trykke «oppgrader» og få byttet fra blokk til emner når blokk-ordrene er levert.
Beslutning: Når byttet er sperret av ordrer på det gamle produktet, har støpekortet knappen «Bytt når ordrene er
levert». Byttet gjøres av seg selv hver time når det går og det er penger nok, og kommer da uten spørsmål. Imens kommer
det ingen nye forespørsler eller avtaletilbud på det gamle produktet. Motoren kaller byttet gjennom
`setScheduledSwitch`, så `engine.ts` ikke importerer `actions.ts`.

## B-103 Kapasitet for rammeavtaler (2026-09-25)
Status: gjelder
Avtaler-fanen viser hvor mye av ukeproduksjonen de aktive avtalene tar, hvor mye som er ledig til vanlige kontrakter,
og hvor mange avtaler man kan ha. Hvert tilbud viser også hvor mye avtalene tar til sammen hvis man signerer det. Over
50 % er gult, over 70 % rødt.

## B-104 Utkobling: rekker ordrekøen det? (2026-09-25)
Status: gjelder
Brukeren måtte gjette om produksjonen holdt når nettselskapet ba om stopp. Kortet regner nå ut hvor mange kontrakter
som blir for sene med og uten de fire timene stans (`lateContracts` i `engine.ts`). «Nei takk» merkes som anbefalt når
utkoblingen gjør leveranser for sene.

## B-105 Strømavtalene har mer å si (2026-09-25)
Status: gjelder (utfyller B-024)
Brukeren vant spillet uten å røre strømavtalen. Strøm var ca. 4–5 % av inntektene og effekttariffen ca. 0,3 %.
Beslutning:
- Spotprisen er mer urolig. Pristopper kommer oftere (5 % per døgn, 2,2–3,2 × i 2–4 døgn).
- Tørre perioder (1,2 % per døgn) holder prisen rundt 1,7 × i 12–25 døgn. Fastpris beskytter mot dem.
- Effekttariffen er hevet fra 1 200 til 4 000 kr per MW, så toppen merkes.
- Strøm-siden viser hva strømmen til ovnene hadde kostet med hver avtale de siste sju døgnene, og hvilken som var
  billigst.
- Et hint på Verket foreslår fastpris i starten av en tørr periode når fastprisen er billigere. Det gjelder ikke korte
  pristopper: der går prisen ned igjen før en 30-dagers fastpris lønner seg (målt: rådet ga mest ingenting eller tap).
- Testspillerne følger rådet. Målt med og uten råd: høyere kasse på 5 av 6 frø.

## B-106 Konsern med flere verk, og sluttmålet 10 mrd. (2026-09-25)
Status: gjelder (erstatter vinnergrensen i B-027 og B-091)
Brukeren syntes spillet ble for fort ferdig og ville utvide storverket til et konsern med flere verk. Sluttmålet skulle
bli mye større, så det er det siste man når.
Beslutning:
- Konsernet åpner seg på storverket når alt utstyret er kjøpt, eller når egenkapitalen når 1 mrd. (det gamle målet).
  Da kommer fanen Verket → Konsern (`konsern.ts`, `ui/Konsern.tsx`).
- Datterverk har egen ledelse og egne folk. Spilleren bestemmer bare investeringene, så det blir ikke et nytt spill i
  spillet.
  - Stålverk: 300 mill., ca. 3,5 mill. per døgn.
  - Storverk: 1,2 mrd., ca. 14 mill. per døgn. Krever et stålverk først.
  - Begge betaler seg på ca. 86 døgn. Overskuddet følger stålprisen.
  - Høyst seks datterverk.
- Et datterverk kan stå 2–5 døgn etter et havari (1,2 % per døgn).
- Modernisering: 30 % av prisen gir +25 % overskudd, inntil tre trinn.
- Felles innkjøp (150 mill.) gir 5 % billigere skrap hjemme. Felles salgskontor (250 mill.) gir 3 % bedre pris
  hjemme. Hver av dem gir også 5 % mer overskudd i datterverkene.
- Sluttmålet er 10 mrd. i konsernverdi: kasse minus lån, pluss 80 % av det som er investert i datterverkene. Da teller
  et kjøp nesten fullt med én gang, og spilleren straffes ikke for å investere.
- Testspillerne kjøper felles funksjoner når de har et datterverk, ellers nye verk og så modernisering. De holder
  100 mill. i reserve.
- Målt med `--vansker`:
  - Flink vinner dag 324–356.
  - Nybegynneren vinner dag 337–449.
  - Før vant den flinke rundt dag 200.
  - Ingen konkurs.
- `--vansker` kjører nå inntil 700 døgn.

## B-107 Bjella teller bare problemer og hendelser (2026-09-25)
Status: gjelder (justerer B-089)
Brukeren ville ikke ha tall på bjella for gode nyheter. Gode nyheter står fortsatt i varsellista under «Gode nyheter»,
men bare problemer og hendelser gir tall på bjella.

## B-108 Kontrollrommet: sterkere strøm i smeltingen, rensingen starter med strømmen av (2026-09-25)
Status: gjelder (justerer B-086 og B-093)
Smeltingen: selv på full strøm falt temperaturen under det grønne feltet fra ca. 20 % til 50 % smeltet. Spilleren måtte
slå på oksygenet før rådet sa det. Strømnivå 4 og 5 bruker nå trafo-tapp 4 og 6 i stedet for 3 og 4. Da holder nivå 4
temperaturen til halvparten er smeltet, og nivå 5 har noe å gå på.
Rensingen: med strømnivå 2 steg temperaturen ca. 5 °C/s med én gang, før spilleren rakk å reagere. Rensingen starter
nå med strømmen av. Oksygenet alene gir ca. 2 °C/s, og tekstene sier at du gir litt strøm bare hvis badet blir for kaldt.
Testspilleren som følger rådene, får nå 5★ (før 4★). Den slurvete får fortsatt 1★.

## B-109 Færre elektrodebrudd med alt kjøpt (2026-09-25)
Status: gjelder (justerer B-094)
Tre store ovner kjører over 100 charger i døgnet, og sjansen for brudd er per charge. Med alt kjøpt kom det fortsatt
et brudd med få dagers mellomrom.
- Hydraulisk elektroderegulering gir nå 75 % færre brudd (før 60 %).
- Forskningen «Elektroderegulering» halverer bruddene i tillegg.
- Med alt kjøpt og forsket fram er bruddene ca. åtte ganger sjeldnere enn før.
- Loggen sier hva som gir færre brudd når noe mangler.

## B-110 Ferdigvarelageret går ikke over maks (2026-09-25)
Status: gjelder
På 10× kan ett tidssteg støpe flere øser, og lageret ble bare sjekket før det første. Lageret viste 60 041 av 60 000
t. Nå sjekkes plassen før hver øse støpes. Er lageret fullt, venter støpingen (salg på spot hjelper hvis det er
slått på). Et tomt lager tar alltid imot, så en stor øse ikke låser støpingen.

## B-111 Anbefalte støtteroller tar høyde for fravær (2026-09-25)
Status: gjelder (justerer B-096)
Planleggeren og skrapklasseren jobber bare når de er på jobb. Med én står jobben når den er syk eller har ferie.
- Fra stålverket anbefales to av hver.
- Avløsere anbefales også med fire og fem skiftlag: to med fire lag og én med fem. Ekstra lag dekker mye fravær, men
  ikke når flere er borte i samme rolle.

## B-112 Oppgraderingsmenyene: kassa øverst, én fane per ovn, kortere lister (2026-09-25)
Status: gjelder (justerer B-065 og B-074)
- Menyen viser hvor mye penger du har, og den linja står fast øverst når du blar.
- Med flere ovner har menyen én fane per ovn pluss «Verket», med tall for det du har råd til. Den starter på den
  første fanen der du har råd til noe.
- Det du kan kjøpe nå står øverst, og det du har råd til kommer først. Det som er i drift og det som kommer på neste
  nivå er lagt sammen, og kan åpnes.
- Trykk på ovnen og støpingen på Oversikt åpner alltid utstyret der. Før åpnet de bare når det var noe du hadde råd
  til, så støpingen virket annerledes enn ovnen.

## B-113 Gjennomgang av koden, runde 2: feil som ble rettet (2026-09-25)
Status: gjelder
Brukeren ba om en gjennomgang av hele spillkoden. Alle filene i `game/`, `ui/` og `ui/control/` ble lest, tabellene
ble sjekket med et skript (alle id-er i `requires`, `unlocks`, `reads`, kapitler og tellere finnes), og lagrede spill
ble kjørt 60 døgn med invariantsjekker (ingen NaN, ingen negative lagre, ferdigvarelageret under maks, kontrakter og
fravær konsistente). Rettet:
- **Støpingen samlet opp framdrift** mens den ventet på plass i lageret (etter B-110), så flere øser ble støpt på én
  gang når det ble plass. Nå venter støpingen uten framdrift. Egen test.
- **Ny støpemaskin** arvet sekvensen fra den gamle, så første øse kunne regnes som et kvalitetsbytte med overgangstap.
- **Folk → Skiftene:** «verket går 2 skift i stedet for .» – variabelen var «verket er fullt», ikke antall skift.
- **Banken:** «Betal ned»-knappen viste et beløp kassa ikke dekket.
- **Verket:** lastes en sikkerhetskopi uten konsern mens Konsern-fanen står valgt, faller valget tilbake til Oversikt.
- **Kontrollrommet:** slaggmålerens minste skala var 3 kg, ikke 3 t.
- **Lagring:** forskningslista fylles inn før blokkene som leser den (svært gamle lagringer), og fravær som bare er
  halvt satt, ryddes bort.
- **Oppdraget «Fem døgn på rad»** teller døgn til sammen; teksten sier nå det.
Sett over, men ikke endret: fagpoeng, økonomi, rammeavtaler, fravær, planleggeren, hendelseskortene og
prosessmodellen.

## B-114 Ett varsel om gangen, på én linje (2026-09-25)
Status: gjelder, men plasseringen er erstattet av B-116 (varsellinja øverst)
Brukeren syntes varslene var i veien: opptil tre store varsler sto over menyen nederst og dekket knapper. Brukeren
valgte «én smal linje» blant fire forslag.
Beslutning:
- Ett varsel om gangen, på én linje (ca. 40 px) rett over menyen. Står det flere i kø, vises «+N».
- Hvert varsel står i 6 sekunder, eller 3,5 sekunder når flere venter, så køen ikke henger etter spillet.
- Trykk på varselet åpner varsellista bak 🔔 med hele teksten, og tømmer køen. ✕ eller sveip fjerner det.
- Svar på noe spilleren trykket på (f.eks. «For lite penger») står ikke i varsellista, så de vises helt (inntil to
  linjer), og et trykk fjerner dem.
- Valget under ⚙️ (alle, bare problemer, ingen) gjelder som før.

## B-115 Varselinnstillinger per tema og varighet (2026-09-25)
Status: gjelder (utvider B-089 og B-114)
Brukeren ville ha mer spesifikke valg for varslene på skjermen.
Beslutning:
- Under ⚙️: «Velg selv», «Bare problemer» eller «Ingen».
- Med «Velg selv» kan sju temaer slås av og på:
  - Ferie og sykdom
  - Drift og havarier
  - Kasse og bank
  - Forskning, oppdrag og utbygging
  - Kunder og omdømme
  - Marked og strøm
  - Ansatte og trivsel
- «Bare problemer» viser alle problemer, uansett tema, så noe viktig ikke skjules ved et uhell.
- Hvor lenge et varsel står: 3, 6 eller 10 sekunder. Står flere i kø, går hvert på 60 % av tida.
- Temaet leses ut fra teksten (`logTopic` i `inbox.ts`), så gamle lagringer og logglinjer virker uten endring.
  Reglene prøves i rekkefølge. Det som ikke passer noe tema («annet»), vises alltid med «Velg selv».
- Sjekket med et skript som samlet alle ulike varseltekster fra 40 døgn i fem lagrede spill: alle havnet i et tema.
- Varsellista bak 🔔 viser fortsatt alt.

## B-116 Varsellinja: en fast plass for varslene øverst (2026-09-25)
Status: gjelder (erstatter plasseringen i B-114)
Brukeren: varslene kom fortsatt i veien for å signere kontrakter og kjøpe ting. Man måtte pause spillet og krysse ut
varslene først. Et varsel som legger seg oppå siden, vil alltid kunne dekke en knapp.
Beslutning:
- Varslene har en egen, fast linje nederst i toppfeltet, under kassa og omdømmet. Linja er alltid 40 px høy og
  ligger ikke oppå noe, så knappene verken dekkes eller flytter seg når et varsel kommer.
- Bjella er flyttet inn i linja, med antall nye varsler.
- Uten varsel viser linja «Ingen nye varsler», eller «3 nye varsler – trykk for å se».
- Trykk på linja åpner varsellista. ✕ fjerner varselet. «+N» viser hvor mange som venter.
- Svar på noe spilleren trykket på (f.eks. «For lite penger») kan bruke to linjer. Da vokser linja et øyeblikk, men
  bare etter spillerens eget trykk.
- De flytende varslene over menyen er fjernet.

## B-117 Salgsdirektør i konsernet (2026-09-25)
Status: gjelder
Brukeren: når konsernet er åpnet, bør man kunne ansette noen som tar seg av kontraktene og avtalene automatisk. Det
skal være meget dyrt.
Beslutning:
- Kortet «Salgsdirektør» står under Verket → Konsern når konsernet er åpnet (B-106).
- Prisen er 250 mill. kr i rekruttering og 4 mill. kr i lønn per døgn. Storverket gir i snitt ca. 51 mill. kr i
  resultat per døgn (median i `--vansker`), så lønna tar ca. 8 %. Tidlig på storverket taper man penger på
  direktøren; den lønner seg først når verket går godt og spilleren vil slippe salgsarbeidet.
- Hver time signerer direktøren forespørsler, mest verdifulle først. Kravene:
  - Verket lager varen.
  - Resepten holder, eller skrapklasseren legger den om og ovnen følger ordrekøen.
  - Forespørselen er «trygg» på Salg.
  - Den rekker fristen også med det dårligste døgnet den siste uka, med minst 30 % av tida til overs.
- Rammeavtaler tas (kan slås av) så lenge de til sammen er under halve ukeproduksjonen i en dårlig uke. Resten blir
  liggende, så spilleren kan ta dem selv.
- Vurderingen av en forespørsel er flyttet til `assessOffer` i `engine.ts`, så Salg og direktøren regner likt.
- Målt i 30 døgn på tre lagrede storverk (der ovnene i tillegg brant gjennom foringen jevnlig): 9–11 leverte
  kontrakter mot 6 uten direktør, og 0, 0 og 1 for sene. Med bare «trygg» som krav ble 3 av 9 for sene; derfor den
  ekstra marginen.
- Testspillerne ansetter ikke direktøren. Den er et valg og påvirker ikke balansen.

## B-118 Varsel når ferdigvarelageret er fullt (2026-09-25)
Status: gjelder
Brukeren: når lageret er fullt og ovnene står på grunn av det, bør man få varsel. Før sto det bare et hint på Verket.
Beslutning:
- Når støpingen stopper fordi lageret er fullt, kommer et problemvarsel («Drift og havarier») med råd:
  - Er automatisk salg av: selg på spot under Salg → Lager, slå på automatisk salg, eller bygg ut lageret.
  - Er automatisk salg på: lageret er fullt av stål som kontraktene venter på. Lever eller avbryt ordrer, eller
    bygg ut lageret.
- Varselet kommer når lageret *blir* fullt, og høyst hver 12. time (`storeFullLogMin`), så det ikke gjentas hele tida.

## B-119 Konsernet: neste steg, grunner på knappene, utbygging og milepæler (2026-09-25)
Status: gjelder (utvider B-106)
Brukeren: med bare stålverk fikk man ikke kjøpt storverk, felles innkjøp eller salgskontor. Konsernet skulle bli mer
intuitivt, morsomt og bedre forklart.
Årsak: knappene ble grå uten forklaring når kassa var for liten (typisk etter noen stålverk). Med seks stålverk var
konsernet fullt, og da gikk det ikke an å kjøpe storverk i det hele tatt.
Beslutning:
- **Forklaring i fire steg** øverst på fanen:
  1. Kjøp et stålverk.
  2. Kjøp felles innkjøp og salg.
  3. Kjøp eller bygg ut til storverk.
  4. Moderniser verkene.
- **Hvert kjøp** viser hva det gir per døgn og hvor mange døgn det tar å betale seg. En grå knapp sier hvorfor den er
  grå: at noe annet må kjøpes først, at konsernet er fullt, eller hvor mye som mangler og omtrent hvor mange døgn det
  tar å spare opp med dagens overskudd.
- **«Neste steg»** foreslår kjøpet som har betalt seg raskest regnet fra i dag: tida det tar å spare opp, pluss tida
  før kjøpet har betalt seg. Da foreslås ikke noe som ligger et halvt år fram i tid. Testspillerne følger forslaget.
- **Bygg ut stålverk til storverk** for prisforskjellen (900 mill. kr). Moderniseringen starter på nytt. Da blir et
  fullt konsern med stålverk ikke en blindvei.
- **Navn på verkene**, i stedet for «Verk nr. 2»: Elveverket, Fjordverket, Dalverket osv. Det er vanlige ord, ikke
  ekte steder. Gamle lagringer beholder navnene de har.
- **Milepæler** ved 2, 4, 6 og 8 mrd. i konsernverdi. Hver gir 40 fagpoeng og en god nyhet.
- **Produksjonsrekord:** et datterverk gir av og til (1,5 % per døgn) dobbelt overskudd det døgnet, med en god
  nyhet.
- Nye felt (`konsern.milestones`, `storeFullLogMin`) har standardverdi i `migrate()`.
- Målt med `--vansker` når testspillerne følger «Neste steg»: flink vinner dag 324–364, nybegynner dag 342–457,
  ingen konkurs. Det er omtrent som før (B-106).

## B-120 Konsernforskning (2026-09-25)
Status: gjelder
Brukeren: man bør ha flere ting å forske på når konsernet åpnes.
Beslutning: ni nye prosjekter (`konsern: true` i `research.ts`) som er låst til konsernet er åpnet. Før det står de i
gruppen «Kommer når konsernet åpnes» under Forskning.

| Prosjekt | FP | Krever | Gir |
| --- | --- | --- | --- |
| Konsernstyring | 250 | – | +10 % overskudd i datterverkene |
| Felles vedlikehold | 300 | – | halvparten så mange havarier, 1–3 døgns stans |
| Kunnskapsdeling | 300 | Konsernstyring | 1 fagpoeng per døgn per datterverk som går |
| Profesjonell ledelse | 350 | Konsernstyring | halv lønn til salgsdirektøren |
| Oppkjøpsavdeling | 400 | – | nye verk og utbygging 15 % billigere |
| Standardiserte verk | 400 | Konsernstyring | modernisering 25 % billigere |
| Kraftavtale for konsernet | 450 | – | 10 % billigere strøm hjemme |
| Større konsern | 600 | Oppkjøpsavdeling | plass til 8 datterverk |
| Grønt konsern | 700 | Grønt stål, Konsernstyring | +10 % overskudd i datterverkene |

- Til sammen 3 750 fagpoeng, omtrent det konsernfasen gir med storverkets fagpoeng, milepælene og kunnskapsdelingen.
- Nytt kapittel i fagboka, «Konsern og datterselskap», med quiz. Det forklarer morselskap og datterselskap,
  stordriftsfordeler, spredning av risiko og hvorfor verkene teller i konsernverdien. Prosjektene krever at det er
  lest, og det låses opp når konsernet åpnes.
- Den bokførte verdien av et verk følger listeprisen, også når oppkjøpsavdelingen gir rabatt. *(Erstattet av B-121:
  verdien følger nå overskuddet.)*
- Den flinke testspilleren forsker på prosjektene etter storverkets, og nybegynneren tar det billigste først.
- Målt med `--vansker`: flink vinner dag 320–362, nybegynner dag 329–435, ingen konkurs. Det er litt raskere enn
  før (324–364 og 342–457).
- «Forsk fram alt» (utfordring) omfatter nå også konsernprosjektene.


## B-121 Konsernet: det skal lønne seg å investere (2026-09-25)
Status: gjelder
Brukeren:
- Har man bare kjøpt stålverk, bør man kunne gå over til storverk.
- Det tar så lang tid å tjene inn et storverk at noen heller vil spare til 10 mrd.

Årsak:
- Et verk ble regnet som 80 % av prisen. Et kjøp senket derfor konsernverdien med en gang.
- Et storverk brukte 86 døgn på å tjene seg inn.
- Målt med det nye flagget `--sparer` (testspilleren kjøper ingen verk):
  - flink sparer vant dag ca. 455, mot ca. 345 for den som investerer
  - en nybegynner som sparte, vant ca. dag 620
  - forskjellen var mindre enn det burde være

Beslutning:
- **Verdien følger det verket tjener:** `VALUE_DAYS = 60` døgns overskudd ved normal stålpris (`sisterValue`).
  - Et nytt verk er verdt omtrent det det koster, så et kjøp senker aldri konsernverdien.
  - Alt verket tjener etterpå, er gevinst.
  - Modernisering, felles funksjoner og forskning gjør verkene mer verdt.
- **Høyere overskudd:**
  - stålverk 5 mill. kr per døgn (var 3,5)
  - storverk 20 mill. kr per døgn (var 14)
  - Storverket tjener seg inn på 60 døgn i stedet for 86.
- **Salg:** «Selg verket…» på hvert datterverk, med et bekreftelsessteg. Man får verdien i kassa. Da kan man for
  eksempel selge et stålverk for å få råd til et storverk.
- **Tydeligere vei til storverk:**
  - «Bygg ut til storverk» er hovedknappen på hvert stålverk.
  - Kjøpekortet for storverk sier at det er billigere å bygge ut et stålverk man har.
- Ny forklaring på Konsern-fanen: «Det lønner seg å investere». Fagboka er oppdatert.

Målt med `--vansker` (flink / nybegynner):
- Den som investerer, vinner dag 290–327 / 284–403.
- Den som sparer, vinner dag 438–478 / 579–681.
- Å investere vinner nå omtrent 150 døgn før for en flink spiller og omtrent 300 døgn før for en nybegynner.
- Ingen konkurs.

## B-122 Salgsdirektøren kan skrus av og på (2026-09-25)
Status: gjelder
Brukeren: når man har ansatt salgsdirektør, bør det være en knapp under Forespørsler for å skru den av og på.

Beslutning:
- Nytt felt `active` på `SalesDirector`. Standardverdien er `true`, også i `migrate()` for gamle lagringer.
- Når direktøren er skrudd av, gjør `directorHour` ingenting.
- Lønna går likevel: direktøren er fortsatt ansatt. Vil man slippe lønna, må man si opp direktøren. Dette står i
  teksten under bryteren.
- Bryteren «Salgsdirektøren signerer for meg» (`DirectorSwitch`) står både øverst under Salg → Forespørsler og på
  kortet for salgsdirektøren under Konsern. Den erstatter den faste teksten om salgsdirektøren på Salg.

## B-123 Kortere og tydeligere Konsern-side (2026-09-25)
Status: gjelder
Brukeren: Konsern-siden er for lang og bør bli mer intuitiv.

Beslutning: rekkefølgen følger det spilleren gjør. Først tallene og målet, så «Neste steg», så verkene man har, og
til slutt det man kan kjøpe.

- **Konsernet:**
  - to tall (konsernverdi og hva datterverkene tjener)
  - en linje mot sluttmålet og neste milepæl
  - forklaringen i fire steg er foldet inn under «Slik fungerer konsernet». Den er åpen bare før man har kjøpt det
    første verket.
  - Forskning og hvordan konsernverdien regnes ut, står nederst i forklaringen.
- **Dine verk:**
  - én hovedknapp per verk: «Bygg ut til storverk» for et stålverk, «Moderniser» for et storverk
  - modernisering av et stålverk og salg ligger under «Moderniser eller selg» eller «Selg verket»
  - kortet vises ikke før man har et verk
- **Kjøp og utvid:** nye verk og felles funksjoner i ett kort. Felles funksjoner som er i drift, står på én linje.
- **Salgsdirektør:**
  - Før ansettelsen: én linje og knappen. Detaljene ligger under «Hva gjør salgsdirektøren?».
  - Etter ansettelsen: tallene, av/på-bryteren (B-122) og «Innstillinger og oppsigelse».
- Alle knapper på siden er minst 40 px høye (før 34 px, og «Selg verket…» var en lenke på 16 px).
- Målt på iPhone 13 med tre verk og salgsdirektør: siden er 2 393 px høy, mot 3 475 px før.

## B-124 Konto, lagring på nett, toppliste og konkurranse – planen (2026-09-25)
Status: gjelder
Brukeren: vil ha toppliste, lagring uten fil, og et spill man ikke blir ferdig med på én dag – med konkurranse om
skrap, kunder og priser, inspirert av spill der man konkurrerer i sanntid. Nåværende lagringer skal ikke gå tapt.
Konto med e-post og passord, ikke bare overføringskode (fare for deling og juks). Supabase er greit. Nivå 1 og 2
(sesonger og toppliste, så konkurranse der serveren avgjør). Litt ventetid, ikke 24 timer, og ulik etter hva man
venter på.

Beslutning: planen står i `docs/PLAN-NETT.md`. Hovedpunktene:
- Supabase som tjeneste. All serverlogikk som SQL i `supabase/`, som brukeren limer inn. Den offentlige nøkkelen ligger
  i koden, den hemmelige aldri.
- Konto med e-post og passord. Den lokale lagringen kobles til kontoen ved første innlogging. Sikkerhetskopi som fil
  virker bare på egen konto.
- Alt på nett er valgfritt, lagringsformat og database vokser bare, funksjonsbrytere i databasen, testspilleren
  kjører uten nett. Slik kan spillerne spille hele tiden mens vi bygger.
- Konkurransen er på pris og kvalitet. Ingen kan ta noe fra andre. Anbud og auksjoner åpner på nivået Stålverk, med
  ligaer etter nivå.
- Ekte ventetid bare i konsernet og konkurransen, fra 30 minutter til 8 timer, og serverens klokke.
- Rekkefølge: fase 0 grunnlag, 1 konto og lagring, 2 toppliste, 3 sesonger, ligaer og felles hendelser, 4 ventetid,
  5 anbud og auksjoner.
- Nivå 3 (én felles verden i sanntid) er ikke med: det ville vært et nytt spill uten pause og fart.

## B-125 Konto og lagring på nett – fase 0 og 1 (2026-09-25)
Status: gjelder
Brukeren: konto med e-post og passord (ikke bare overføringskode, fordi en delt sikkerhetskopi kan brukes til juks),
og nåværende lagring skal kobles til kontoen. Supabase-prosjektet er opprettet, og nøklene er sendt.

Beslutning:
- **Ingen bibliotek.** `src/net/supabase.ts` snakker med innloggingen (GoTrue) og databasen (PostgREST) rett over
  `fetch`. Det holder bygget lite, og alt kan testes uten nett ved å bytte ut `fetch`.
- **Økta** ligger i localStorage (`stalverk-konto-v1`) og fornyes av seg selv. Uten nett beholdes den.
- **Lagring på nett** (`src/net/sync.ts`): spillet lagres lokalt som før. Når man er logget inn, følger en kopi etter
  til `saves` høyst én gang i minuttet, og med én gang når appen legges bort (`fetch` med `keepalive`). Én linje
  per spilldøgn i `snapshots` (dag, kasse, konsernverdi, nivå) – grunnlaget for toppliste og juksesperre.
- **Eier:** spillet får feltet `owner` (konto-id) første gang det lastes opp. Standardverdi null i `migrate()`.
- **Kobling ved innlogging** (`linkOnLogin`):
  - ingen spill på nett og et lokalt → lastes opp
  - spill på nett og ikke noe lokalt (eller lokalt fra en annen konto) → spillet fra nettet
  - begge på samme konto → det som har kommet lengst i spilltid
  - begge, det lokale uten konto → spilleren velger («Fra nettet (dag 140)» eller «Herfra (dag 12)»)
- **Sikkerhetskopi** som fil virker fortsatt, men bare på kontoen den tilhører. Fila fra en annen konto avvises.
- **Nytt spill** med konto og et spill fra før spør først, siden det erstatter spillet på nett.
- **Konto-kortet** står på startskjermen (så en ny mobil kan hente spillet før «Fortsett») og under ⚙️ Innstillinger:
  logg inn, opprett konto (må bekreftes på e-post), glemt passord, bytt passord, logg ut og slett konto (SQL-funksjonen
  `delete_my_account`, alt slettes med kontoen). En liten sky ved dagen i toppen viser om spillet er lagret på nett.
- **Lenkene fra e-posten** (bekreftelse og nytt passord) lander på spillet med nøklene i adressen; de leses inn før
  første tegning og adressen ryddes. Krever at Site URL i Supabase er satt til spillets adresse.
- **Funksjonsbryter:** tabellen `config` (`features.cloud`) kan skru av lagring på nett uten ny publisering.
- ~~Nøklene ligger i `frontend/src/net/config.ts`.~~ *(Erstattet av B-126: GitHub Secrets.)*
- **SQL** i `supabase/001_grunnlag.sql`: tabellene `profiles`, `saves`, `snapshots`, `config`, profil-trigger,
  `updated_at`, `delete_my_account` og tilgangsregler (RLS). Brukeren limer inn. Kan kjøres flere ganger.
- **Personvern:** e-post og spillet lagres, ingenting annet. Det står under kontoen.
- Spillmotoren vet ingenting om nettet: `save.ts` har en lytter (`setSaveListener`) som `sync.ts` henger seg på.
  `balance.ts` og `tests.ts` kjører uten nett.

## B-126 Ingen nøkler i repoet – GitHub Secrets (2026-09-25)
Status: gjelder (erstatter nøkkeldelen av B-125)
Brukeren: ingen koder skal ut på GitHub, de skal i GitHub Secrets.

Beslutning:
- `frontend/src/net/config.ts` leser `VITE_SUPABASE_URL` og `VITE_SUPABASE_KEY` fra miljøet. Bygget i `pages.yml`
  får dem fra GitHub Secrets `SUPABASE_URL` og `SUPABASE_KEY`. Lokalt: `frontend/.env.local`, ignorert av git
  (`.env`, `.env.*` unntatt `.env.example`).
- Mangler nøklene (fork, lokal utvikling uten fil), er alt på nett slått av: kontokortet vises ikke, ingenting
  sendes, og spillet virker som før.
- Den offentlige nøkkelen er fortsatt synlig i det publiserte spillet, slik alle nettleserapper har det. Sikkerheten
  ligger i tilgangsreglene i databasen, ikke i at nøkkelen er hemmelig.
- Nøkkelen fra B-125 ligger i git-historikken til `main` (PR #78). Vi skriver aldri om historikken til `main`;
  brukeren lager i stedet en ny publishable-nøkkel i Supabase og sletter den gamle når secrets er på plass.
- Nettestene setter en falsk kobling med `setCloudConfig`.

## B-127 Toppliste, kallenavn og juksesperre – fase 2 (2026-09-25)
Status: gjelder
Brukeren: toppliste, uten grupper foreløpig.

Beslutning:
- **Kallenavn** velges under ⚙️ Innstillinger → Konto («Bli med på topplista»). 3–20 tegn, bokstaver, tall, mellomrom,
  punktum, bindestrek og understrek. Unikt uten hensyn til store og små bokstaver. Settes gjennom SQL-funksjonen
  `set_nickname`, og spilleren kan ikke endre andre felt på profilen sin (ikke sperre, ikke liga).
- **Topplista** står under Verket → Økonomi, også uten konto (da med oppfordring om å logge inn). Fire lister:
  konsernverdi nå, raskest til storverk, raskest til 10 mrd., omdømme nå. Serveren regner dem ut fra tidslinja
  (`snapshots`) med funksjonen `leaderboard(kind, lim)`; appen sender aldri inn poeng. `my_rank` gir min plass også
  utenfor de 50 første. Egen rad er uthevet.
- **Tidslinja** har fått omdømme. Én rad per spilldøgn, skrevet ved første lagring på nett den dagen.
- **Juksesperre** i databasen (trigger `snapshots_check`), målt med `balance.ts --vekst` over fem frø, flink og
  nybegynner, og ganget med 3–5:

  | Nivå | Maks vekst per døgn | Maks konsernverdi |
  | --- | --- | --- |
  | Garasje | 100 000 kr | 1 mill. kr |
  | Verksted | 600 000 kr | 6 mill. kr |
  | Støperi | 2,5 mill. kr | 50 mill. kr |
  | Stålverk | 20 mill. kr | 250 mill. kr |
  | Storverk | 1,5 mrd. kr | – |

  Veksten får i tillegg være 25 % av forrige konsernverdi per døgn (forskning som hever alle verkene, gjør at
  verdien hopper). Over grensen **merkes** kontoen (`profiles.flagged_at`, `flag_reason`) og holdes utenfor topplista
  til brukeren har sett på den i Supabase. Spillet stoppes ikke. Målt i spillet var det største hoppet 2,5 mrd. på
  én dag på storverket med 6–8 datterverk (konsernstyring-forskning), godt innenfor.
- **Tilbakespoling**: en snapshot med lavere dag enn det som finnes fra før, setter `profiles.rewound_at`. Brukes
  av anbud og auksjoner senere (fase 5).
- Funksjonene `leaderboard` (også for anon), `my_rank` og `set_nickname` er med vilje tilgjengelige via API-et;
  sikkerhetsrådene i Supabase peker på dem, og det er tilsiktet.
- SQL i `supabase/003_toppliste.sql`, kjørt som migrasjonen «toppliste».

## B-128 Bekreftelse med kode i stedet for lenke (2026-09-25)
Status: gjelder
Brukeren: lenken i bekreftelses-e-posten åpnet i Safari, ikke i appen på hjemskjermen, og gikk til feil adresse
(uten `/Simulator/`). Redd for at feil spill blir koblet til kontoen.

Årsak: lenker fra e-post åpner alltid i Safari på iPhone, aldri i appen på hjemskjermen, og de to har hver sin
lagring. Site URL i Supabase manglet `/Simulator/`.

Beslutning:
- **Kode i stedet for lenke.** E-posten inneholder en sekssifret kode (`{{ .Token }}` i malene i Supabase) som
  spilleren skriver inn i appen. Da skjer alt i den appen man spiller i. Appen kaller `/auth/v1/verify` med
  `type: signup` (opprett konto) eller `type: recovery` (glemt passord, så nytt passord). Brukeren må endre
  e-postmalene i Supabase (Authentication → Emails) til å inneholde koden.
- **Lenken virker fortsatt** (hvis malen har den), men etter en lenke kobles ikke noe spill før spilleren velger
  «Jeg spiller her i nettleseren». «Jeg spiller fra hjemskjermen» logger ut i Safari, så man logger inn i appen.
- Appen sender `redirect_to` med sin egen adresse (med `/Simulator/`) i opprett- og glemt-passord-kallene, så
  lenkene peker riktig hvis adressen er tillatt i Supabase.
- Feilteksten «Koden er feil eller utløpt» på norsk.

## B-129 Sesonger, ligaer og felles hendelser – fase 3 (2026-09-25)
Status: gjelder (erstatter nytt spill+ fra B-090 for spill som er med i en sesong)
Brukeren: sesonger erstatter nytt spill+; alle starter i garasjen når en ny sesong starter; en pitteliten fordel
for den som var med sist; lett å starte ny sesong; ingen grupper på topplista ennå.

Beslutning:
- **Sesong** = en rad i `seasons` (navn, start, slutt). Serveren eier den. Én sesong om gangen.
  - `start_season('Sesong 2', 4)` (bare fra SQL Editor eller connectoren) avslutter den som pågår, regner ut
    sluttresultatet (`season_results`, rangert etter konsernverdi) og starter en ny på 4 uker. Det er alt som trengs.
  - `season_status()` (appen kaller den) gir sesongen som pågår og om spilleren var med i forrige. Sesonger som er
    over uten resultat, lukkes der, så ingen planlagt jobb trengs.
- **Spillet** har `season` (id eller null) og `seasonPromptSeen`. Tidslinja og lagringen på nett sender `season_id`.
  - Et nytt spill (første døgn) med konto kobles rett til sesongen som pågår, uten spørsmål.
  - Et eldre spill som ikke er med, får spørsmålet «Sesong 1 er i gang» én gang: start sesongen (nytt spill i
    garasjen, med bekreftelse) eller fortsett dette spillet (står bare på «Alle tider»).
  - **Fordelen** for den som var med i forrige sesong: 5 % mer startkapital og 10 fagpoeng (`joinSeason`). Med
    vilje lite.
  - Er spillet med i sesongen, tilbys ikke nytt spill+ på seiersskjermen.
- **Topplista** har «Denne sesongen» og «Alle tider» (`leaderboard(kind, lim, season)`), sesonglinja med dager
  igjen, og liga ved hvert navn.
- **Ligaer** regnes av serveren fra siste tidslinje (`league_of`): Bronse til og med stålverket, Sølv på storverket,
  Gull når konsernverdien passerer 1 mrd. (der konsernet åpner). Skrives på profilen. Brukes til anbud og
  auksjoner i fase 5.
- **Felles hendelser** = rader i `events` med faktorer for skrap, stål og strøm og en sluttid i ekte tid.
  - `add_event('skrapmangel', 7)` (bare admin) legger ut en fra lista: skrapmangel (skrap ×1,2), strømkrise
    (strøm ×1,5), eksportboom (stål ×1,1), importpress (stål ×0,9), transportstreik (skrap ×1,1, stål ×0,95).
  - Appen henter `active_events()` ved start og hvert tiende minutt, og `applyWorldEvents` legger dem i
    `g.world.events`. Motoren ganger `scrapPrice`, `productPrice` og `energyPrice` (bare strøm) med faktorene
    (`worldFactor`). Nye hendelser logges én gang («event»). Marked viser «Nå i markedet».
  - Uten nett eller nøkler: ingen hendelser. Testspilleren kjører uten.
- Nytt kapittel i fagboka: «Konjunkturer, sesonger og ligaer», låses opp når spillet kobles til en sesong.
- Sesong 1 er startet i databasen (4 uker fra 2026-09-25).
- SQL i `supabase/004_sesonger.sql`, kjørt som migrasjonene «sesonger» og «liga_search_path».

## B-130 Sesongen varer i seks måneder (2026-09-25)
Status: gjelder (erstatter «4 uker» i B-124 og B-129)
Brukeren: sesongen må vare i 6 måneder.
Beslutning: Sesong 1 er forlenget til seks måneder fra starten (til 2027-03-25). `start_season` har 26 uker som
standard. Tekstene i spillet og fagboka sier «et halvt år».

## B-131 Sesongbeskjed også uten konto (2026-09-25)
Status: gjelder
Brukeren: de som ikke er logget inn, må også få popupen: for å være med i en sesong må man opprette konto eller
logge inn.
Beslutning: uten konto vises «Sesong 1 er i gang – bli med!» én gang per sesong (`seasonLoginPromptSeen`), ikke
midt i veiledningen. Knappen «Opprett konto eller logg inn» åpner ⚙️ Innstillinger med kontokortet; «Ikke nå»
lukker. Logger man inn, gjelder reglene fra B-129: et nytt spill blir med direkte, et eldre får valget.

## B-132 Sesongvalget har en fast plass på topplista (2026-09-25)
Status: gjelder
Brukeren: krysser man ut popupen om sesongen, må man kunne finne det igjen et annet sted.
Beslutning: øverst på topplista (Verket → Økonomi) står `SeasonJoin` med samme valg som popupen: uten konto «Bli med
i Sesong 1: opprett konto eller logg inn»; med konto og et eldre spill «Spillet ditt er ikke med» med «Start sesongen
(nytt spill)» og bekreftelse; med et spill i sesongen «Spillet ditt er med i Sesong 1». Popupene sier hvor valget
finnes igjen.

## B-133 Garasjen kan bli med i sesongen direkte, og topplista bak 🏆 øverst (2026-09-25)
Status: gjelder (erstatter «første døgn» i B-129 og plasseringen under Økonomi i B-127)
Brukeren: de som bare har gjort veiledningen, skal kunne være med i sesongen; de som har kommet langt, må starte
på nytt. Topplista skal være mer synlig enn under Økonomi, så det blir populært å være med.

Beslutning:
- **Direkte med så lenge man er i garasjen** (`canJoinDirectly`: nivå 0). Veiledningen og de første dagene er i
  garasjen. Har man flyttet til verkstedet eller lenger, må man starte sesongen i garasjen. Tekstene sier det.
- **Topplista bak 🏆** i toppfeltet, ved siden av 📖 og ⚙️, som et eget ark (`LeaderboardSheet`) med sesongvalget
  øverst. Synlig fra alle skjermer. Fjernet fra Verket → Økonomi.
- **Startskjermen** viser «🏆 Sesong 1 pågår – N dager igjen. Logg inn under for å være med.»

## B-134 🏆 ved varsellinja, ikke i toppraden (2026-09-25)
Status: gjelder (erstatter plasseringen av 🏆 i B-133)
Brukeren: med 🏆 i toppraden ble det ikke plass: «10×» og klokka ble kuttet på iPhone.
Beslutning: 🏆 står som en 40 px knapp til høyre for varsellinja (`g-notice-row`). Toppraden har igjen bare dag,
fart, 📖 og ⚙️, som fikk plass før. Playwright-sjekken måler nå også at knapper og tekst i toppfeltet ikke
avkortes eller havner utenfor skjermen (iPhone SE 320 px, iPhone 13 390 px, iPhone 14 Pro Max 430 px), ikke bare
at siden ikke scroller sideveis.

## B-135 Sikkerhetskopi som fil er fjernet (2026-09-25)
Status: gjelder (erstatter B-026 og sikkerhetskopi-delen av B-125)
Brukeren: ta bort muligheten for sikkerhetskopi, da det kan føre til juks mellom spillere; ta bort teksten om at
iPhone-appen har sin egen lagring og at man skal ta en sikkerhetskopi.

Beslutning:
- «Last ned sikkerhetskopi» og «Hent sikkerhetskopi» er borte fra startskjermen og ⚙️ Innstillinger, med
  `downloadBackup`, `BackupInput`, `loadBackup` og `backupOwnerError`. Et spill kan bare flyttes mellom nettlesere og
  enheter med konto.
- Hjemskjerm-tipset sier nå bare «Logg inn i appen på hjemskjermen, så hentes spillet ditt fra nettet.»
- Tekstene som nevnte sikkerhetskopi (lagring i innstillingene, sesongvalget), er skrevet om.
- `parseSave` blir i `save.ts`, men brukes bare av testene.
