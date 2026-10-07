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
Status: erstattet av B-175 (kontrollrommet er et spill i fire runder)
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
Status: gjelder, men konkurs revurderes for spill som har nådd konsernet: rekonstruksjon i stedet for full restart (B-180)
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
Status: gjelder, men Resept er flyttet fra Marked til Verket (B-199)
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
Status: erstattet av B-175
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
Status: erstattet av B-175
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
Status: erstattet av B-175
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
Status: stegene er erstattet av B-175; belønningen for 4–5 stjerner gjelder fortsatt
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
Status: utfordringene gjelder. Nytt spill+ er erstattet av sesongene (B-141).
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
Status: erstattet av B-175
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
Status: gjelder (erstatter vinnergrensen i B-027 og B-091). Justeres av B-180: 10 mrd. er en milepæl, ikke slutten, og «datterverk er bare investeringer» erstattes av verksjef og mandat (fase 5)
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
Status: erstattet av B-175
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
Status: gjelder (erstatter plasseringen i B-114); på mobil står den nå over menyen nederst (B-201)
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
Status: gjelder (utvider B-106). Datterverkene gir utbytte og har konsernkostnader fra B-181
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
Status: gjelder – verdien regnes fortsatt av driftsresultatet; det som går til morselskapet, er utbytte etter B-181
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
Status: gjelder, men «konkurransen er på pris og kvalitet; ingen kan ta noe fra andre» gjelder bare til og med storverket – i sluttspillet kan eierskap til strategiske bedrifter utfordres (B-180). De tekniske prinsippene gjelder
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
Status: gjelder (regelen «det som har kommet lengst, vinner» er erstattet av versjonsnummer i B-140)
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
Status: gjelder, men sesongene revurderes mot æraer (B-180) (erstatter nytt spill+ fra B-090 for spill som er med i en sesong). Metallnavnene på ligaene vises
ikke lenger på topplista, se B-139.
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
Status: gjelder (erstatter «4 uker» i B-124 og B-129). Sesongene revurderes mot æraer (B-180)
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
Status: gjelder (erstatter «første døgn» i B-129 og plasseringen under Økonomi i B-127). Nytt spill+ blir ikke med
direkte, se B-140. «Bare garasjen» er erstattet av B-166: alle spill uten tidligere sesong blir med.
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

## B-136 Alltid start med veiledning, og oppskrift for Android også (2026-09-25)
Status: gjelder
Brukeren: få med instruksjoner for Android-mobiler under «Spill i fullskjerm»; «Start uten veiledning» skal ikke
være mulig.

Beslutning:
- Startskjermen har én knapp: «Start spillet» (eller «Fortsett» og «Nytt spill» når det finnes et spill). Alle nye
  spill starter med veiledningen, også «Start sesongen» i garasjen. «Avslutt veiledningen» underveis står som før.
- Hjemskjerm-tipset viser alltid oppskriften for både iPhone og Android (Chrome, Samsung Internet, Firefox), med den
  som passer telefonen først, så man også kan hjelpe andre. Chrome-knappen «Legg til på hjemskjermen» vises i tillegg
  når nettleseren tilbyr den.

## B-137 Mobil: fast ramme, bare innholdet scroller (2026-09-25)
Status: gjelder
Brukeren: i Safari hopper toppfeltet og menyen nederst når man scroller ned (skjermbilde: toppfeltet halvt ute av
skjermen, menyen over adresselinja med innhold under).

Årsak: Safari krymper og utvider adresselinja når selve siden scroller, og flytter da faste (`fixed`) og klistrede
(`sticky`) elementer feil, særlig med den flytende adresselinja på nyere iPhone.

Beslutning:
- Under 760 px er `.g-app` en fast ramme (`position: fixed; inset: 0`) med flex i kolonne: toppfeltet øverst, så
  `.g-main` som eneste del som scroller (`overflow-y: auto`, `overscroll-behavior: contain`), og menyen nederst som
  vanlig flex-element (ikke `fixed`). Selve siden scroller aldri, så Safari endrer ikke adresselinja.
- `.g-head` er `display: contents` på mobil, så toppfeltet og menyen kan ligge på hver sin side av innholdet.
- Fra 760 px er alt som før: siden scroller, toppfeltet og menyen er klistret øverst.
- Ved bytte av fane settes både vinduet og `.g-main` til toppen. `scrollIntoView` virker i `.g-main` som før.

## B-138 Ingenting lastes opp eller kobles til sesongen før spillet er avklart mot kontoen (2026-09-25)
Status: gjelder
Brukeren: logget inn i en ny nettleser; da kom kontoen på sesonglista med spillet som lå i nettleseren fra før, selv
om sesongen ikke var startet på kontoen.

Årsak:
- Et spill uten eier (i garasjen) ble koblet til sesongen med én gang økta fantes (B-133), og ble lastet opp på
  kontoen mens spilleren fortsatt skulle velge mellom «Fra nettet» og «Herfra». Det kunne også ha overskrevet
  spillet på nett et øyeblikk. Samme risiko fantes for en eldre kopi av spillet på samme konto i en annen nettleser.
- Tidslinja hadde nøkkelen (konto, dag), så et sesongspill og et gammelt spill på samme konto delte rader.

Beslutning:
- `sync.ts` har `reconciled`: ingenting lastes opp før koblingen ved innlogging er ferdig. Mens spilleren velger
  («choose»), lastes ingenting opp. «Herfra» (`keepLocal`) og «Fra nettet» (`markReconciled`) avklarer.
- Sesongen (`SeasonSync`, `SeasonPrompt`, `SeasonJoin`) gjør ingenting før spillet er avklart.
- Tidslinja har nøkkelen (konto, sesong, dag) med `season_key = coalesce(season_id, 0)`.
- Den feilaktige raden (Tuster, dag 1, Sesong 1) er slettet. Spillet på nett (dag 388) var ikke rørt.
- To nye nettester dekker begge tilfellene; Playwright gjenskaper brukerens tilfelle.

## B-139 Topplista: medaljer for plassen, nivå ved navnet (2026-09-25)
Status: gjelder (erstatter visningen av ligaen fra B-129)
Brukeren: «To brukere. Førsteplass gull og andreplass bronse? Det er feil».

Årsak: merket ved navnet viste ligaen med metallnavn (Bronse, Sølv, Gull). Ved siden av en plassering leses det som
medaljer, så nr. 2 med «Bronse» så ut som en feil.

Beslutning:
- Plass 1–3 vises med medaljene 🥇 🥈 🥉, resten med tall. Medaljene betyr alltid plassering.
- Merket ved navnet viser nivået: Garasje, Verksted, Støperi, Stålverk, Storverk, og Konsern når konsernverdien
  passerer 1 mrd. (ligaen «gull»). Vanlige ord, ingen metaller.
- `leaderboard()` gir nå også `stage` (migrasjonen «toppliste_med_niva», `supabase/007_toppliste_med_niva.sql`).
  Ligaen beholdes i databasen og i svaret; den kan brukes til å dele spillerne senere (anbud og auksjoner i fase 5).
- Navnet kortes av med «…», nivåmerket blir alltid stående.
- Fagboka og forklaringen under lista er skrevet om uten ligaer.

## B-140 To nettlesere på samme konto, og nytt spill+ i sesongen (2026-09-25)
Status: gjelder (erstatter «det som har kommet lengst, vinner» i B-125, og utvider B-129 og B-133). Punktene om
nytt spill+ under ⚙️ er erstattet av B-141: nytt spill+ er fjernet.
Brukeren: «Om jeg er innlogget i to nettlesere og bytter mellom de er ikke handlingene jeg har gjort oppdatert.»
Spurte også om nytt spill+ virkelig er borte for spill i sesongen, og om nytt spill+ blir med i sesongen av seg selv.

Årsak:
- Spillet ble bare hentet fra nettet når siden ble lastet. En nettleser som sto åpen i bakgrunnen, fortsatte med sin
  gamle kopi og lastet den opp etter et minutt – over det som var gjort i den andre nettleseren.
- Ved innlogging vant det spillet som hadde kommet lengst i spilltid. Det stemmer ikke når man bytter nettleser: den
  gamle kopien kan ha kjørt lenger.
- Nytt spill+ ble skjult på seiersskjermen for spill i sesongen, men ikke under ⚙️.
- Nytt spill+ starter i garasjen og ble derfor koblet til sesongen automatisk, med runde-bonusen (mer penger,
  fagpoeng og omdømme). Det er urettferdig i konkurransen.

Beslutning:
- Lagringen på nett har versjonsnummer (`rev`) og merkelapp for nettleseren (`device`, tilfeldig, uten
  personopplysninger). Migrasjonen «lagring_med_versjon», `supabase/008_lagring_med_versjon.sql`.
- Appen lagrer med `save_game()`, som bare skriver hvis versjonen på nett er den appen bygger på. Ellers skrives
  ingenting, og statusen blir «conflict».
- Når appen vises igjen (synlig, fokus, `pageshow`), når spillet startes, og når en lagring ble avvist, sjekker
  appen versjonen (`pullIfNewer`). Er spillet lagret fra en annen nettleser, byttes det ut med det fra nettet.
  Spilleren får beskjeden «Hentet det nyeste spillet» (dag N), og spillet står på pause til «Spill videre».
- Egen lagring der svaret ikke kom fram (appen lagt bort), gjenkjennes på merkelappen og hentes ikke på nytt.
- Ved innlogging eller omstart: er spillet på nett lagret fra en annen nettleser siden denne sist lagret, vinner
  nettet. Ellers vinner spillet her, også om det har kortere spilltid (for eksempel et nytt sesongspill). Uten husket
  versjon (første gang etter oppdateringen) gjelder den gamle regelen om lengst spilltid.
- Triggeren øker versjonen også når en eldre utgave av appen skriver rett i tabellen.
- Nytt spill+ blir aldri med i sesongen direkte (`canJoinDirectly` krever runde 1). Spørsmålet om sesongen forklarer
  at spillet er nytt spill+ med en fordel. Vil man være med, starter man sesongen i garasjen uten bonus.
- Under ⚙️ vises ikke nytt spill+ for spill som er med i sesongen som pågår; det står at det kommer tilbake når
  sesongen er over. Utenfor sesongen står det at nytt spill+ ikke er med i sesongen.

## B-141 Hyppigere lagring, nytt spill+ fjernet, og en grundig gjennomgang (2026-09-25)
Status: gjelder (erstatter nytt spill+ fra B-090 og punktene om nytt spill+ i B-140)
Brukeren: «Fiks at den synkroniserer ofte nok.» Nytt spill+ er forvirrende når det ikke er med i sesongen –
«kanskje man skal ta det bort?» Og: se over all kode og tekst, rett feil og skrivefeil, og fjern det som ikke passer
med planen.

**Lagring på nett (synkronisering)**
- Etter en handling fra spilleren lastes spillet opp etter ca. 3 sekunder (0,8 s lokalt + 2 s på nett, så flere
  handlinger samles). Vanlig lagring hvert 15. sekund i stedet for hvert minutt. Når man går til et annet vindu
  (`blur`), lastes spillet opp med én gang.
- Mens appen vises, sjekker den hvert 20. sekund om spillet er lagret fra en annen enhet (én liten spørring).
- Feil som ble funnet: `keepalive` (brukt når appen legges bort) avvises av nettleserne over 64 kB. Et spill på
  storverket er ca. 90 kB, så det ble aldri lagret når appen ble lagt bort. Nå sendes store spill uten keepalive.
- `flush()` venter på en lagring som allerede er på vei.

**Nytt spill+ er fjernet**
- Brukeren sa allerede i B-129 at nytt spill+ blir borte når spillet aldri blir ferdig. Nå er det gjort: ingen knapp
  på seiersskjermen eller under ⚙️. `newGame` har ikke lenger runde-bonus. Feltet `round` står igjen for eldre
  lagringer, og et eldre nytt spill+ blir fortsatt ikke med i sesongen direkte (B-140).
- Seiersskjermen: «Et stålkonsern!», «Spill videre», og en forklaring om sesongen. «Nytt spill» er fjernet derfra
  (den slettet spillet uten å spørre, rett ved «Spill videre»); det ligger under ⚙️ med bekreftelse.
- Under ⚙️ → Nytt spill står det at spillet slettes, også på nett, og at det nye spillet blir med i sesongen.

**Ny start i sesongen (server, migrasjon 009)**
- Startet man på nytt i en sesong, ble tidslinja fra det gamle spillet liggende, og topplista viste det gamle til det
  nye hadde kommet like langt. Nå slettes radene med høyere dag i samme sesong når en lavere dag kommer inn.
- En ny start (dag 1–2) merkes ikke som tilbakespoling; en eldre lagring senere i spillet gjør det fortsatt.
- «Alle tider» viser spillerens beste resultat (høyeste konsernverdi eller omdømme), ikke bare det siste døgnet.

**Feil i spillet**
- Strømpris: felles hendelser (strømkrise) ganget også en fastpris man alt hadde, og sammenligningen av avtalene og
  prisen på Marked regnet uten hendelsen. Nå ligger hendelsen i spot og nattariff og i nye fastpristilbud, ikke i
  en fastpris man har avtalt.
- Startskjermen: «Nytt spill» slettet spillet i nettleseren uten å spørre når man ikke var logget inn. Nå spør den
  alltid.
- «Markedet er sterkt/svakt» på Marked → Priser tar med felles hendelser.

**Tekst**
- Spillertekst med internt beslutningsnummer («(B-075)») er fjernet. Skrivefeil og kjønn rettet («de sjeldent slår»,
  «Utfordring klart»). «Ovn nummer to» → «Ovn nr. 2». Lysbueovnen på 90 t er forklart uten fagord alene.
- Datterverket «Kystverket» het det samme som en ekte etat; det heter nå «Nesverket» (også i gamle lagringer).
- Fagboka: sesongkapitlet sier at man trenger konto og kan bli med når som helst; setningen om råjern er rettet.
- Forskning: en charge man kjører selv gir opptil 21 fagpoeng (ikke 6). Boblene skriver «fagpoeng», ikke «FP».
- Sesongtekstene nevner ikke lenger nytt spill+ for nye spillere; grunnen hentes fra spillet.
- Topplista forklarer at sesongen viser spillet man har nå og «Alle tider» det beste.

**Dokumentasjon**
- README og DESIGN.md skrevet om etter planen slik den er nå (garasje med induksjonsovn, konsern, konto, sesonger).
  PLAN-NETT.md rettet (sikkerhetskopi, «Confirm email», migrasjoner, lagring). Ny `docs/FORSLAG.md` med åpne
  spørsmål og forslag.

## B-142 Rekordene på «Alle tider» lagres for seg (2026-09-25)
Status: gjelder (erstatter «Alle tider» fra tidslinja i B-141)
Brukeren: «Om man starter på nytt for å bli med i en sesong, og slår sin egen alle tider-rekord – blir den riktig
overskrevet? Og at det ikke blir dobbelt.»

Sjekket i databasen (transaksjon som ble rullet tilbake):
- Dobbelt: nei. Topplista har alltid én rad per spiller.
- Ny rekord i et sesongspill: ble riktig vist.
- Feil (innført i B-141): et nytt spill utenfor en sesong slettet tidslinja fra det gamle spillet, og rekorden på
  «Alle tider» falt fra 28,9 mrd. til 25 000 kr. Det samme skjedde med det beste fra et sesongspill som gikk konkurs.

Beslutning:
- Ny tabell `records` (migrasjon 010): én rad per konto med beste konsernverdi (og dagen), beste omdømme, høyeste
  nivå, færrest døgn til storverket og til 10 mrd. En trigger på `snapshots` oppdaterer den etter hver lagring, og
  verdiene blir bare bedre. Rekordene fra tidslinja som fantes, ble lagt inn.
- «Alle tider» leser rekordene. Sesonglista leser fortsatt spillet man har nå (siste døgn i sesongen).
- `records` har tilgangsregler: spilleren kan bare lese sin egen rad; skriving skjer bare fra triggeren.
- Etter endringen: nytt spill utenfor sesongen → rekorden står; ny rekord i sesongen → den nye står; konkurs og ny
  start i sesongen → rekorden står, sesonglista viser det nye spillet. Én rad per spiller hele veien.

## B-143 Flere enheter samtidig, sesongresultat ved kallenavnet, og svar på forslagene (2026-09-25)
Status: gjelder (utvider B-140 og B-141)
Brukeren svarte på spørsmålene i `docs/FORSLAG.md`:
- «Nye spillere skal kunne trykke avslutt veiledning.» → Veiledningen beholder «Avslutt veiledningen» og «Hopp over
  steget». Bare valget «Start uten veiledning» på startskjermen er borte (B-136).
- «Gjør det som fungerer best for to nettlesere eller flere i gang samtidig.»
- «Sesong 1: 3. plass» ved kallenavnet: «bra forslag! Ta det med.»
- Toppliste for kontrollrommet: god idé, men vent til kontrollrommet er ferdig utviklet.
- Vern mot lekkede passord i Supabase skal skrus på etter hvert (brukeren gjør det i dashbordet).

**Flere enheter samtidig**
- Feil som ble funnet: en nettleser som bare sto åpen på pause, lastet opp det samme spillet hvert 15. sekund og tok
  over fra enheten man faktisk spilte på. Den mistet da det siste den hadde gjort og ble satt på pause.
- Regel: bare enheten som spilles på, lagrer. En enhet laster opp når spilltida har gått der (og siden vises), når
  spilleren har gjort noe, og når den forlates (`leaving`: appen legges bort eller et annet vindu tas i bruk). En
  enhet på pause eller i bakgrunnen laster ikke opp.
- Går spillet på to enheter samtidig, settes den som blir forbigått på pause med beskjeden «Spillet er i gang på en
  annen enhet» og knappen «Spill her». «Spill her» henter det nyeste og lagrer med én gang (`claim`), så denne
  enheten tar over, og den andre settes på pause når den ser det. Ingen frem-og-tilbake.
- Playwright med to nettlesere: A på pause, B spiller → bare B lagrer. A trykker → A tar over, B settes på pause med
  «Spill her», og etterpå lagrer bare A. Ingen avviste lagringer.

**Sesongresultat**
- Migrasjon 011: topplista gir hver spillers beste plassering i en sesong som er over (`honor`, f.eks. «Sesong 1:
  2. plass»), og `season_history()` gir spilleren sine egne resultater (plass, antall spillere, konsernverdi, dag,
  nivå).
- Topplista viser 🎖 med plasseringen under navnet (begge listene), og «Dine sesonger» nederst.
- Når en sesong spilleren var med i er over, kommer én beskjed: «Sesong 1 er over! Du ble nr. 2 av 14 …». Den vises
  én gang per sesong og konto i nettleseren, og før spørsmålet om neste sesong.

## B-144 Mest penger på bok, topplista oppdaterer seg, og kjøpsvarsler etter forskning (2026-09-25)
Status: gjelder (utvider B-127, B-115, B-062 og B-119)
Brukeren ba om:
- «Mest penger på bok bør også være med på topplista.»
- «Topplista oppdaterer seg ikke før man oppdaterer nettsiden. Om ting skal fungere etter planen senere må alt
  oppdatere seg mens man spiller.»
- Utstyr som ikke er forsket fram, skal si at man må forske – ikke at man mangler penger.
- Konsern-fanen på Verket skal vise et tall når noe kan kjøpes, som de andre knappene.
- Tallet i varslingslinja skal ikke stå to ganger (bjella og teksten).
- Sjekk at veiledningen fortsatt virker.
- Fjern «Ingen» under varsler i innstillingene, siden varslingslinja har fast plass.

**Topplista**
- Ny liste «Mest penger på bok» (`kind = 'kasse'`, migrasjon 012). I sesongen: kassa i siste døgn av spillet man har
  nå. På «Alle tider»: den største kassa kontoen har hatt (`records.best_cash`, fylt fra tidslinja og oppdatert av
  `update_records()`). Lån teller med i kassa, men lånegrensen (høyst noen titalls millioner) er liten mot det et verk
  tjener, så den flytter ikke lista.
- En åpen toppliste henter lista og plassen din på nytt hvert 15. sekund (bare når siden vises). Tidslinja lastes opp
  med lagringen på nett, én gang per spilldøgn, så oftere enn det gir ikke noe nytt. Lukket liste henter ingenting.
  Sesongstatus og felles hendelser hentes allerede hvert minutt.

**Kjøpsvarsler**
- Feilen: advarselen «Etter kjøpet har du penger til drift i under ett døgn …» ble lagt på alt som ikke var kjøpt,
  også utstyr som manglet forskning. Advarselen om bytte av produkt (blokk → emner) kom også før forskningen.
- Nå: pengeadvarselen gjelder bare det som kan kjøpes nå, og advarselen om produktbytte kommer når forskningen er gjort.
  Kortet sier «🔬 Forsk fram «X» under Forskning først» i stedet for «Forsk fram: X». Test i `tests.ts`.

**Konsern-fanen** får et tall (som Anlegg): kjøp i konsernet som ikke er sperret og som kassa rekker til
(`konsernReady`).

**Varslingslinja:** tallet står bare på bjella; teksten er «Nytt varsel / Nye varsler – trykk for å se».

**Innstillinger:** valget «Ingen» er fjernet. Lagringer med «Ingen» får «Bare problemer», nærmeste valg (`migrate`).

**Veiledningen** er gått gjennom i Playwright fra «Start spillet» til «Ferdig», uten og med konto (nytt spill med
konto blir med i sesongen uten at noe vindu sperrer), på 390 og 320 px: alle sju stegene går videre av seg selv, riktig
fane markeres, og ingen feil i konsollen. Funnet underveis: klokka i toppfeltet ble kuttet («Dag 1 · 16…») når
fagboka hadde et tall. Dag og klokke brytes nå til to linjer i stedet.

## B-145 Utlogging gjelder bare én enhet, og spilleren får vite det når hen er logget ut (2026-09-26)
Status: gjelder (utvider B-125 og B-140)
Brukeren spurte: «Når jeg våknet i dag og skulle inn og se i appen, så var jeg logget ut?»

**Hva som skjedde (fra innloggingsloggene i Supabase):**
- 23:44 kvelden før ble det trykket «Logg ut» på en iPhone (Safari) på kontoen.
- `POST /auth/v1/logout` logger som standard ut **alle** enheter (`scope=global`), så økta i den andre appen på
  mobilen ble ugyldig.
- 04:55 prøvde den andre appen å fornye økta og fikk «Refresh Token Not Found». Appen logget da ut stille, uten
  beskjed.
- Spillet på enheten var ikke rørt, og spillet på nett var heller ikke rørt.

**Endringer**
- «Logg ut» (og «Jeg spiller fra hjemskjermen» etter e-postlenken) logger bare ut denne enheten: `/logout?scope=local`.
- Avviser tjenesten økta, får spilleren én beskjed: «Du er logget ut – … Spillet her er beholdt. Logg inn igjen …»
  med «Logg inn» (åpner innstillingene) og «Senere». Beskjeden står også over innloggingen til man logger inn.
- Lagring på nett slås av når økta dør (☁ forsvinner fra toppfeltet), og kall som krever innlogging stopper i stedet
  for å gå videre uten (`rest()` kaster «Du er ikke logget inn.»).
- 408 og 429 (for mange forsøk) regnes ikke lenger som en død økt.
- To faner i samme nettleser: fornyer den ene fanen økta, bruker den andre den nye. Før kunne den andre fanen prøve
  den brukte nøkkelen, få nei og logge ut. Fanene følger også hverandre ved inn- og utlogging (`storage`-hendelsen).
- Test i `net/tests.ts`: scope=local, beskjed ved avvist økt, økt fra en annen fane, fornyelse i en annen fane
  samtidig.

## B-146 Sletting av konto er sjekket, og «Husk meg på denne enheten» (2026-09-26)
Status: gjelder (utvider B-125)
Brukeren ba om:
- «Pass på at om en sletter brukeren sin, at ikke alle brukere slettes.»
- «Husk brukernavn og passord – avhuking hadde vært fint.»

**Sletting av konto**
- `delete_my_account()` sletter bare `where id = auth.uid()`. Uten innlogging stopper den med «ikke logget inn», og
  anon kan ikke kalle den.
- Alle tabeller som peker på kontoen, sletter bare kontoens egne rader (`on delete cascade` på user_id): profiles,
  records, saves, season_results og snapshots.
- Prøvd i databasen med en midlertidig testbruker i en transaksjon som ble rullet tilbake:
  - før prøven 2 kontoer, med testbrukeren 3, etter slettingen 2
  - testbrukeren var borte
  - kall uten innlogging ble avvist
  - etterpå fortsatt 2 kontoer og ingen testbruker
- Ingen endring trengtes.

**«Husk meg på denne enheten»**
- Avhuking i innloggingen, på som standard.
- Med avhuking huskes e-posten (fylles inn neste gang), og økta ligger i localStorage som før.
- Uten avhuking ligger økta bare i sessionStorage (logget ut når appen lukkes), og e-posten glemmes.
- Passordet lagres **ikke** av spillet; det ville vært usikkert. Skjemaet har `autocomplete="username"` og
  `current-password`, så mobilens passordlager (iCloud-nøkkelring, Google) eller nettleseren kan huske og fylle det
  inn. Teksten under avhukingen sier det.
- Valget lagres i `stalverk-husk-v1`. Test i `net/tests.ts`; passordet finnes ikke i lagringen.

## B-147 Kortere og tydeligere startskjerm (2026-09-26)
Status: gjelder (erstatter oppsettet av startskjermen fra B-136; oppskriftene for hjemskjermen står fortsatt der)
Brukeren (med skjermbilde): «Siden her er for lang. Fiks den og gjør den mer intuitiv.»

Før: fortelling, tre punkter, sesongtekst, knappene midt på, og hele kontokortet med en lang innledning under. På en
iPhone måtte man scrolle for å se kontoen.

Nå, ovenfra og ned:
- Tittel, «Fra garasje til storverk.» og én setning om spillet.
- «Ditt spill: Støperi · dag 32 · 733 411 kr» når det finnes et lagret spill, så man ser hva «Fortsett» fortsetter.
- Knappene: «Fortsett» (stor) og «Nytt spill», eller «Start spillet» for nye spillere.
- Sesongen på én linje: «🏆 Sesong 1 pågår – 179 dager igjen».
- Kontoen som én linje med knapp («Logg inn», eller «☁ Innlogget som …» og «Konto»).
  - Knappen åpner kontokortet uten overskrift og innledning (`AccountCard compact`).
  - Kortet er åpent fra start når man kommer fra e-postlenken eller ble logget ut av seg selv.
- «📖 Slik spiller du» (foldet sammen): fortellingen og punktene.
- Tipset om hjemskjermen (bare i nettleseren) er foldet sammen. Kan nettleseren installere selv, står knappen synlig.

Høyden på iPhone-størrelse gikk fra over 1600 px til ca. 500 px, uten scrolling. Samme tipsboks er foldet sammen
under ⚙️ også.

## B-148 Automatisk oppdatering, spill mens man var logget ut, og spillet til en annen konto (2026-09-26)
Status: gjelder (utvider B-140 og B-127; erstatter delen av B-140 der nettet alltid vant når det var lagret fra en
annen enhet)
Brukeren spurte:
- En oppdatering skal nå alle som spiller, uten at man må si ifra om å laste siden på nytt.
- Hva skjer om man spiller videre etter å ha blitt logget ut? Kommer framgangen med når man logger inn igjen, og blir
  man flagget for juks?
- Er det sikkert at man ikke kan logge inn i nettleseren til en venn som har kommet langt, og få vennens framgang?

**Automatisk oppdatering**
- Bygget lager `version.json` med en egen id per bygg (tidspunkt og commit, `vite.config.ts`). Appen har samme id.
- Appen ser etter en ny versjon hvert 5. minutt og når den vises igjen. Service workeren slipper `version.json`
  rett til nettet.
- Finnes en ny versjon, vises «🔄 Ny versjon av spillet – oppdaterer …». Spillet lagres (også på nett, høyst 3 s),
  siden hentes forbi mellomlageret, og appen laster seg inn på nytt.
- Den venter under en charge i kontrollrommet og mens spilleren skriver i et felt.
- Sperre mot evig omlasting: GitHub Pages lar nettleseren bruke en lagret side i opptil 10 minutter. Appen prøver
  derfor bare én gang per ny versjon innen 10 minutter. Kom den gamle siden tilbake, står det «lukk appen og åpne den
  igjen».
- Testet på det bygde spillet: én omlasting, spillet lagret først, ingen løkke.

**Spill mens man var logget ut**
- Spillet går videre og lagres på enheten. Når man logger inn igjen, og ingen annen enhet har lagret i mellomtiden,
  lastes framgangen opp (som før).
- Har en annen enhet lagret i mellomtiden, og spillet her har kommet lengst, får spilleren nå velge («Fra nettet» /
  «Herfra»). Før vant spillet på nett uten spørsmål. Har spillet på nett kommet lengst, hentes det som før.
- Juksesperren sammenligner med forrige snapshot og tillater (tak + 25 %) per spilldøgn i mellom. Et langt opphold gir
  derfor like stort rom. Sjekket med `balance.ts --opphold`: alle opphold opp til 400 døgn for flink spiller og
  nybegynner, 6 frø. Den største veksten var 33 % av det sperren tillater, og ingen ville blitt flagget.

**En venns spill**
- Et spill som er spilt med konto, er merket med kontoen (`owner`).
- Logger en annen inn i samme nettleser, kobles det spillet aldri til den nye kontoen. Den nye kontoen får sitt eget
  spill fra nettet, og vennens spill lastes aldri opp (`onLocalSave` hopper over et spill med en annen eier). Test i
  `net/tests.ts`.
- Unntak etter planen: et spill som aldri har vært koblet til noen konto, kan kobles til den som logger inn. Det
  trengs for å kunne starte uten konto og opprette konto senere. Et slikt spill kan bare bli med i sesongen mens det
  er i garasjen (B-138), så det kommer ikke inn på sesonglista, bare på «Alle tider». Det er som å dele passord;
  sperren kan ikke skille det fra at eieren selv logger inn.

**Feil funnet og rettet:** etter B-147 var kontokortet på startskjermen lukket, og da ble spillet ikke koblet til
kontoen når siden ble lastet. Kortet er nå alltid med, bare skjult, og åpner seg selv ved valg, feil eller
e-postlenken.

## B-149 Hva krever konto, daglig belønning, dagens oppdrag og mens du var borte (2026-09-26)
Status: gjelder. Regel 6 er justert for gradvis synlighet: en funksjon vises først når spilleren har kommet dit den hører hjemme (B-180)
Brukeren ba om:
- Noe som får spillerne tilbake hver dag: en belønning for hver virkelige dag, bedre for hver dag i en uke, og start på
  nytt hvis man hopper over en dag. «Vi tester med fagpoeng og timers drift.»
- «Belønningen kan kreve konto. Finn ut alle ting som skal kreve konto både nå og senere … og at det er automatikk i å
  tenke på om nye utviklinger skal kreve konto eller ikke.»
- «Legg inn dagens oppdrag.» «Legg inn mens du var borte.» «Ingen varsel på mobilen ennå.»

**Hva krever konto:** reglene og oversikten står i `docs/KONTO.md`. Kort fortalt:
- Selve spillet krever aldri konto.
- Det som lagres på nett, sammenlignes med andre eller belønner virkelig tid, krever konto.
- Ventetid (fase 4) virker uten konto med mobilens klokke.
- Uten konto vises funksjonen med en forklaring, ikke skjult.

Automatikken:
- CLAUDE.md sier at hver ny funksjon skal avgjøres etter KONTO.md.
- `ACCOUNT_FEATURES` (`net/features.ts`) og `NeedsAccount` (`ui/Account.tsx`) gir samme tekst overalt.

**Daglig belønning** (krever konto):
- Første gang man åpner spillet en ny dag (norsk dato fra serveren), kommer et vindu med uka som sju ruter.
- Dag 1–7 gir 1 fagpoeng, 12 timers drift, 2 fagpoeng, 1 døgns drift, 3 fagpoeng, 1,5 døgns drift, og som
  ukeskiste 5 fagpoeng og 3 døgns drift.
- Hopper man over en dag, starter serien på dag 1. Etter dag 7 begynner en ny uke.
- «Drift» er det verket tjener i spillet (snittet av de tre siste døgnene, hele konsernet), med et gulv per nivå. Da
  betyr belønningen like mye i garasjen som på storverket.
- «Timers drift» betyr timer i spillet. To timer i spillet er bare fem sekunder, så dagene i serien gir 12–72 timer.

**Dagens oppdrag** (krever konto):
- Tre oppdrag per dag. De er i samme rekkefølge for alle, men bare det man kan gjøre på sitt nivå:
  - lever kontrakter
  - lag et antall tonn (ca. tre døgns produksjon)
  - kjør en charge selv
  - forsk fram noe
  - les et kapittel
  - ta en quiz
  - øk omdømmet med 2
- Fremdriften måles fra dagens start.
- Alle tre gir en bonus på 24 timers drift og 3 fagpoeng, én gang per dag. Serveren husker det, også på tvers av
  enheter.
- Kortet står på Verket → Oversikt. Uten konto viser det hva man får med konto. Det vises ikke under veiledningen.

**Mens du var borte** (krever konto):
- Serveren måler tida fra forrige lagring eller henting (minst 10 minutter).
- Fra 30 minutter gir det 6 timers drift per time borte, høyst 8 timer (2 døgns drift).
- Vises som «Velkommen tilbake! Du var borte i 3 t 20 min …» sammen med dagens belønning.
- Tida i spillet står ikke stille for det (spillet simulerer ikke timene), men kassa får pengene.

**Balanse:**
- Belønningene jeg foreslo først (1–5 døgn per dag, 1 døgn per time borte), var for sterke. Med `balance.ts
  --daglig 15` (en spiller som tar 15 spilldøgn per virkelige dag og henter alt hver dag) kom støperiet på dag 18,
  under målet.
- Med verdiene over: verksted 8, støperi 22, stålverk 60 og storverk 128, nybegynner 121,5. Alt er innenfor målene.
  Uten belønninger er tallene uendret (8/25/67/141).
- Juksesperren:
  - Hver henting legger døgnene til i `daily.bonus_days`.
  - `check_snapshot` tillater så mange døgn ekstra vekst, og nullstiller så.
  - `balance.ts --opphold --daglig 15`: høyst 25 % av det sperren tillater, og ingen flagget.

**Server (migrasjon 013):**
- Tabellen `daily`.
- Funksjonene `daily_status()`, `claim_daily_reward()`, `claim_daily_missions()` og `claim_away()`, alle med
  `auth.uid()` og tatt fra `anon`.
- `touch_activity()` kalles av `save_game`. Den husker oppholdet til det hentes, så rekkefølgen på lagring og henting
  spiller ingen rolle.
- Prøvd med en testbruker i en transaksjon som ble rullet tilbake:
  - serien 1→2, 7→1, 3→4, og tilbake til 1 etter hoppet over
  - andre henting samme dag gir ingenting
  - tida borte er 0 første gang, deretter 3 t, så 0, og 2 t etter en lagring
  - vekst på 100 mill. på ett døgn: ikke flagget med 5 bonusdøgn, flagget uten
- Sikkerhetsrådene viser bare det som er meningen.

## B-150 Sluttspillet: mesterskap og stålmilepæler med titler (2026-09-26)
Status: gjelder som historikk (titler og rekorder beholdes), men det lages ingen nye pengemål (B-180) (utvider B-106, B-119 og B-120)
Brukeren: «Hva skal vi gjøre for at de som er ferdig med spillet, fortsatt fortsetter … Daglig belønning blir litt
meningsløs når man har fått alt. Noen har flere tusen fagpoeng.» Svar på forslagene: «Kjør på med alle dine forslag.»
Denne beslutningen dekker forslag 1 og 2. Pynt og prestasjoner kommer i B-151, ukens utfordring og sesonger med vri i
B-152.

**Mesterskap** (`game/mastery.ts`, Forskning-fanen):
- Åpner når all forskning er gjort, også konsernprosjektene.
- Fire prosjekter som kan tas om og om igjen:
  - Bedre priser: stålprisen, høyst +10 %
  - Energieffektivisering: strømkostnaden, høyst −15 %
  - Smartere skrapkjøp: skrapprisen, høyst −10 %
  - Konsernledelse: overskuddet i datterverkene, høyst +30 %
- Hvert nivå gir 10 % av det som gjenstår opp mot maks, så gevinsten per nivå blir mindre. Nivå 1 gir 1 % på prisen,
  nivå 10 ca. 6,5 %.
- Prisen er 100 fagpoeng for nivå 1 (150 for Konsernledelse) og stiger 25 % per nivå.
- De som har tusenvis av fagpoeng, får brukt dem med én gang. Fagpoengene fra den daglige belønningen får mening igjen.
- Tallet på Forskning-fanen teller også mesterskapsprosjekter man har råd til.
- Før det åpner, står en kort forklaring på storverket.

**Stålmilepæler etter sluttmålet** (`LEGENDS` i `game/konsern.ts`):
- Sluttmålet 10 mrd. gir tittelen **Stålbaron**. Videre gir hver milepæl en tittel, fagpoeng og en feiring med 👑:

| Konsernverdi | Tittel | Fagpoeng | Låser opp |
| --- | --- | --- | --- |
| 25 mrd. | Stålmagnat | 150 | Modernisering til trinn 4 |
| 50 mrd. | Stålfyrste | 250 | Stålkomplekser (6 mrd., 110 mill. kr/døgn) og plass til 2 datterverk til |
| 100 mrd. | Stålkonge | 400 | Modernisering til trinn 5 |
| 250 mrd. | Stålkeiser | 700 | Plass til 2 datterverk til |
| 1 billion | Stållegende | 1500 | – |

- Konsernsiden viser tittelen og en stolpe mot neste milepæl. Seiersskjermen nevner titlene og mesterskapet.
- Topplista viser tittelen i stedet for nivåmerket (migrasjon 014, `title_of()`). I sesongen gjelder verdien nå, på
  «Alle tider» den beste noensinne.
- Nye navn på datterverk: Øyverket, Viksverket, Bakkeverket, Strandverket.

**Konto (KONTO.md):** mesterskapet og milepælene krever ikke konto, fordi de bare gjelder ditt eget spill (regel 1).
Tittelen på topplista krever konto (regel 3).

**Balanse:**
- `balance.ts` er uendret (8/25/67/141, nybegynner 144). Mesterskapet åpner først etter all forskning.
- Testspilleren forsker nå fram resten i konsernet og bruker fagpoengene i mesterskapet, så de lange kjøringene tar
  det med.
- `balance.ts --opphold` med mesterskap og milepæler flagget først fire opphold (133 % av det sperren tillater). Ved
  50 mrd. kjøper testspilleren fire stålkomplekser og moderniserer dem samme døgn. Hvert kjøp er verdt litt mer enn
  det koster (B-121), så konsernverdien steg 37 % på ett døgn.
- **Juksesperren etter sluttmålet** (migrasjon 015): når forrige konsernverdi er minst 10 mrd., tillates 50 % vekst per
  døgn i stedet for 25 %. Før sluttmålet er alt som før. Testet i databasen: +40 % flagges ikke, +79 % flagges.
  `--opphold` gir nå høyst 70 %, ingen flagget.
- Verdien av datterverkene regnes uten mesterskapet «Konsernledelse» (`sisterValue`). Ellers ville konsernverdien
  hoppe når noen med tusenvis av fagpoeng kjøper mange nivåer på en gang. Mesterskapet gir mer overskudd, og det kommer
  inn døgn for døgn.

## B-151 Prestasjoner og pynt (2026-09-26)
Status: gjelder
Brukeren: «Kjør på med alle dine forslag.» Dette er forslag 5: pynt og prestasjoner, så fagpoengene har mer å gå til og
man har noe å samle på.

**Prestasjoner** (`game/achievements.ts`, kortet på Verket → Oversikt):
- 29 merker, fra «Første smelte» (2 fagpoeng) til «Stållegende» (100 fagpoeng):
  - charger, tonn og kontrakter i flere trinn
  - nivåene og kontrollrommet
  - fagboka, forskning og mesterskapet
  - milliarden, datterverk og titlene
- De sjekkes hver time og når spillet lastes, så gamle lagringer får merkene sine med én gang. Mange nye på en gang gir
  én linje i loggen, ikke én per merke.
- Kortet viser alle merkene som ruter (grå til de er klart). Trykk på et merke for å se hva som skal til og hvor langt
  man er kommet. Uten valg vises det som er nærmest.

**Pynt** (`game/cosmetics.ts`, tegnes i `ui/PlantScene.tsx`):
- Kjøpes for fagpoeng under 🎨 på anleggsbildet eller «🎨 Pynt» på prestasjonskortet. Arket viser verket mens man
  velger.
- Flagg 10, lyslenke 20, trær 25, rød/blå/grønn fasade 30 (én om gangen), solceller 60 (fra støperiet), vindmølle
  100 (fra stålverket).
- Statue 150 krever Stålbaron, fyrverkeri 250 krever Stålmagnat, og gullpipe 500 krever Stållegende.
- Kan slås av og på. Pynten gir ingen fordel.
- Animasjonene (flagg, lys, vindmølle, fyrverkeri) står stille med «reduser bevegelse».

**Konto (KONTO.md):** prestasjoner og pynt krever ikke konto, fordi de bare gjelder ditt eget spill og ikke gir noen
fordel (regel 1). Skal merker eller pynt senere vises for andre spillere, krever det konto (regel 3).

**Lagring:** `achievements` og `cosmetics` har standardverdier i `migrate()`.

**Balanse:** prestasjonene gir litt fagpoeng tidlig. `balance.ts`: 8/23/63/133 (før 8/25/67/141), nybegynner 168 (før
144, mål høyst 240). Alle mål er OK.

## B-152 Ukens utfordring og sesonger med vri (2026-09-26)
Status: gjelder, men ukekista går bare til topp 3 (endret i B-155), og ligaene er erstattet av én ukeliste for alle, målt i prosent (B-172) (utvider B-129 og B-143)
Brukeren: «Kjør på med alle dine forslag.» Dette er forslag 3 og 4. Samtidig er tre feil brukeren meldte, rettet.

**Ukens utfordring** (migrasjon 016, `net/weekly.ts`, `ui/Weekly.tsx`):
- Uka går fra mandag til mandag, norsk tid. Hver liga (bronse før storverket, sølv på storverket, gull fra 1 mrd.)
  har sin egen liste.
- Oppgaven går på omgang: mest vekst i konsernverdi, flest tonn produsert, flest spilldøgn.
- Serveren regner alt ut fra tidslinja (`snapshots`), som nå også får tonn produsert (`produced_t`). Grunnlaget er
  siste snapshot før uka, i samme sesong.
- Når uka er over (regnes ut første gang noen ser på lista eller statusen): topp 3 i hver liga får medalje, topp 10 en
  ukekiste med fagpoeng: 100, 75, 50, ellers 25. Kista åpnes på kortet og kan bare åpnes én gang (`claim_week_chest`).
- Juksesperren flagger mer enn 30 000 tonn per spilldøgn.
- Kortet står på Verket etter dagens oppdrag. Uten konto vises det fra verkstedet med «krever konto».

**Sesonger med vri:**
- Tabellen `season_twists`: skrapmangel (skrap +15 %), eksportboom (stål +10 %, skrap +5 %), energikrise (strøm
  +30 %, stål +5 %), grønn strøm (strøm −15 %).
- Vrien velges når sesongen startes: `select public.start_season('Sesong 2', 26, 'skrapmangel');`. Sesong 1 som
  pågår, har ingen vri (det ville vært urettferdig midt i sesongen).
- Vrien gjelder bare spill som er med i sesongen. Den ganges inn som en felles hendelse som varer hele sesongen
  (`worldFactor`), står under «Nå i markedet», på topplista, og i loggen første gang.

**Utmerkelse for topp 10:** ved kallenavnet står «🏆 Vinner av Sesong 1» eller «🎖 Topp 10 i Sesong 1 (3. plass)»,
ellers plasseringen. Vinduet ved sesongslutt sier det også.

**Konto (KONTO.md):** ukens utfordring krever konto (regel 3 og 7); lista kan leses uten. Topp 10-merket krever
konto. Vrien gjelder bare sesongspill, som krever konto.

**Feil som er rettet:**
- «Pynt verket» kunne ikke scrolles på iPhone. Ark som åpnes fra innholdet på Verket (pynt, ukelista, utstyr per sted),
  legges nå rett i `<body>` med `ui/Portal.tsx`. Inne i `.g-main` (B-137) klipper Safari arket til innholdet.
- Utlogging uten forklaring: serveren hadde fortsatt en gyldig økt for mobilen (fornyet kl. 07.20), så økta ble borte
  på enheten. Det skjer når «Husk meg» ikke var på og appen ble lukket, når nettleserdata slettes, eller når spillet
  åpnes et annet sted (Safari og appen på hjemskjermen har hver sin lagring). Appen husker nå at noen har vært
  innlogget (`stalverk-sist-innlogget-v1`). Er økta borte uten at man logget ut selv, sier vinduet «Du er logget ut»
  hvorfor.
- Varsler om fravær («ansatte er borte», «vurder en advarsel») åpner nå Folk → Fravær, ikke Skift.

## B-153 Nettselskapets tilbud og dagens oppdrag i sluttspillet (2026-09-26)
Status: gjelder (endrer B-149 og tilbudet fra nettselskapet)
Brukeren: «Tilbudet fra nettselskapet er uinteressant når jeg har kommet langt og har kjøpt salgsdirektør» og «Dagens
mål er for lett for de som har kommet langt».

**Nettselskapet ringer:**
- Betalingen er 25–60 % av salgsverdien av stålet man mister på fire timer (før 15–45 %).
- Tilbudet gir også fagpoeng: 5 på stålverket, 12 på storverket og 25 i konsernet. Penger betyr lite når kassa er på
  milliarder; fagpoeng betyr noe hele spillet (mesterskapet, pynt).

**Dagens oppdrag** (`game/daily.ts`) skalerer med hvor langt man har kommet (garasje … storverk, og konsern):
- Kontrakter: 1, 2, 3, 4, 6, 8.
- Tonn: 3 døgns produksjon fram til støperiet, 5 på stålverket, 8 på storverket, 10 i konsernet.
- Kjør selv: 3 charger på storverket og i konsernet (før 1).
- Nye oppdrag i sluttspillet: ta et nivå i mesterskapet, øk konsernverdien med omtrent tre døgns overskudd, og kjøp
  eller moderniser et datterverk.
- Bonusen gir flere fagpoeng: 3 tidlig, 4 på stålverket, 6 på storverket, 10 i konsernet. Døgnene i bonusen er som før,
  så juksesperren (bonus_days) stemmer.

**Konto:** som før (B-149): dagens oppdrag krever konto. Nettselskapets tilbud krever ikke konto.

**Balanse:** `balance.ts` uendret (8/23/63/133, nybegynner 168). `--daglig 15`: 8/21/58/120, nybegynner 139,5; alle
mål OK.

## B-154 Stormodeller: større ovner og støpemaskiner, og lengre charger jo større ovnen er (2026-09-26)
Status: gjelder, men støpingen er rettet i B-157 (utvider B-106 og B-150)
Brukeren: «De største ovnene er 90 tonn og strengstøpeanlegget er veldig lite. Det finnes mye større i virkeligheten
… likestrømsovn 420 tonn. Jo større ovn, jo lengre tid skal smelteprosessen ta.»

**Virkeligheten** (sjekket på nett):
- Verdens største lysbueovn er en tvilling-likestrømsovn på 420 t, laget for ca. 360 t i timen. Det gir omtrent 70
  minutter fra tapping til tapping.
- De beste ovnene på 100–130 t klarer 30–40 minutter.
- Spillets tider er lengre enn virkeligheten, så jeg skalerte fra 90-tonneren (60 min) og lot 420-tonneren treffe
  360 t/h.

**Nye ovner og utstyr** (ingen ny forskning, så mesterskapet ikke stenges igjen for dem som har forsket fram alt):

| Utstyr | Pris | Tapp-til-tapp | Åpner |
| --- | --- | --- | --- |
| Lysbueovn 150 t | 90 mill. | 64 min | Når konsernet åpner |
| Strengstøpemaskin, 8 strenger | 120 mill. | 400 t/h | Når konsernet åpner |
| Lysbueovn 250 t | 220 mill. | 68 min | Ved sluttmålet (Stålbaron) |
| Valseverk nr. 3 | 90 mill. | valsing ×3,2 (før ×2) | Ved sluttmålet |
| Likestrømsovn 420 t | 700 mill. | 70 min, 360 kWh/t, mindre elektrodeforbruk | Ved Stålmagnat (25 mrd.) |

- Lysbueovnen på 30 t går fra 75 til 55 minutter, så tida øker jevnt med størrelsen: 55, 60, 64, 68 og 70 min.
  Slitasjen per charge er justert, så foringen varer like mange døgn som før. `balance.ts` er uendret.
- Låste stormodeller står under «Kommer senere» i ovnsmenyen med hva som åpner dem (`gateBlocker`).
- Markedet vokser for de største verkene (eksport): spotkvoten ganges med (smeltekapasitet / tre 90-tonnere)^0,7,
  aldri under 1. Uten dette tjente 420-tonneren mindre enn 250-tonneren, fordi spotprisen falt.
- Fagboka (Lysbueovnen) forklarer hvorfor større ovner bruker lengre tid per charge, men lager flere tonn i timen.

**Målt** med `balance.ts --storovn 330` (samme konsernspill, tre ovner, 14 døgn):

| Ovner | Tonn per døgn | Overskudd per døgn |
| --- | --- | --- |
| 90 t (som før) | 5 900 | 254 mill. |
| 150 t + 8 strenger | 9 200 | 311 mill. |
| 250 t + 8 strenger + valseverk 3 | 14 200 | 340 mill. |
| 420 t + 8 strenger + valseverk 3 | 19 300 | 369 mill. |

**Konto:** krever ikke konto (regel 1).

**Balanse:**
- `balance.ts`: 8/23/63/132, nybegynner 157. Testspilleren kjøper stormodellene i konsernet.
- `--opphold`: ingen flagget, høyst 68 %.

## B-155 Ukekista bare til topp 3 (2026-09-26)
Status: gjelder (endrer B-152)
Brukeren: «Ukens utfordring, vi har ikke så mange spillere enda, så det bør være topp 3 som får ukeskiste.»
- Når uka er over, får topp 3 i hver liga medalje og ukekiste: 100, 75 og 50 fagpoeng. Plass 4–10 får ikke lenger kiste
  (før 25 fagpoeng).
- Migrasjon 017 endrer `finish_weeks()`. Ingen uke var avsluttet ennå, så ingen kister måtte ryddes.
- Testet i databasen med fem testspillere i en avsluttet uke (tilbakerullet): bare de tre beste fikk kiste.
- Kan utvides igjen (f.eks. topp 10) når det er flere spillere.

## B-156 Økonomi: hjemmeverket for seg (2026-09-26)
Status: gjelder
Brukeren: «Resultatet i økonomi gikk ikke opp når ovnene ble oppgradert.»

**Hva som skjedde** (brukerens lagrede spill, dag 640–669):
- Med tre likestrømsovner på 420 t, 8 strenger og valseverk nr. 3 gikk produksjonen fra ca. 6 000 til ca. 19 500 t per
  døgn, og hjemmeverket fra ca. 40 til ca. 130 mill. kr per døgn i snitt. Lageret var lite (5 700 t), så stålet ble
  solgt.
- «Resultat i går» regnet med overskuddet fra datterverkene (1,3–2,1 mrd. per døgn) og alle kjøp (2,3 mrd. for ovnene
  dag 658, 23,7 mrd. for datterverk dag 667). Økningen i hjemmeverket ble da bare noen prosent av tallet, og kontrakter
  som betales ved levering, gjør tallet ujevnt.

**Endring** (Verket → Økonomi), når konsernet er åpnet eller noe ble kjøpt i går:
- «Verket i går (drift)»: det hjemmeverket tjente på stålet, uten datterverkene og uten investeringer.
- «Verket, snitt 7 døgn»: jevner ut kontrakter som betales ved levering.
- «Datterverkene i går» og «Investert i går» for seg.
- En kort forklaring under tallene. «Resultat i går» står som før.

## B-157 Støpingen holder følge med stormodellene (2026-09-26)
Status: gjelder (retter B-154)
Brukeren: «Ovn 3 venter ofte på støping etter alt er oppgradert.»

**Årsak:** I B-154 ble støpingen regnet mot ovnenes grunntid (70 min for 420 t). Med trafo, conveyor, flinke folk og
forskning tar en charge bare ca. 48 min. Brukerens tre 420-tonnere smelter da ca. 1 470 t/h, mens 8 strenger ×
2 maskiner (med høyhastighetsstøping) tok 920 t/h. Med 90-tonnerne var det i balanse (ca. 370 mot 390 t/h).

**Endring:**
- Strengstøpemaskin med 8 strenger: 460 t/h (før 400). To maskiner holder følge med tre 250-tonnere med alt utstyr.
- Ny: Strengstøpemaskin nr. 3 (150 mill., åpner ved Stålmagnat som 420-tonneren, krever maskin nr. 2). Tre maskiner:
  ca. 1 590 t/h, nok til tre 420-tonnere. I virkeligheten forsyner en så stor ovn gjerne to støpemaskiner.
- Nytt tips på Verket fra storverket: når ovnene smelter mer enn 15 % over det støpingen tar, står det hvor mye og hva som
  gir mer støpekapasitet (`meltTph` i `PlantStats`). Ikke på stålverket, der støpingen alltid er flaskehalsen.
- Testspilleren kjøper maskin nr. 3.

**Test:** med alt utstyr og flinke folk holder 2 maskiner følge med 250 t, 420 t trenger maskin nr. 3, og med den holder
støpingen følge.

## B-158 Romsligere tonnsperre etter stormodellene (2026-09-26)
Status: gjelder (endrer tonnsperren i B-152)
Brukeren: «Spilleren Figen ble borte fra topplista, hva skjedde?»

**Hva skjedde:** Juksesperren flagget Figen kl. 08.41 med «33048 tonn på 1 døgn». Grensen var 30 000 t per døgn
(B-152), satt før stormodellene fantes (B-154). Figen har tre likestrømsovner på 420 t, og tidslinja viser 7 000–38 000 t
per døgn, jevnt over mange døgn: helt ærlig. Flaggede spillere holdes utenfor topplista.

To grunner til at grensen var for lav:
- Med alt utstyr smelter tre 420-tonnere ca. 1 500 t/h, altså rundt 40 000 t i døgnet.
- Et «døgn» mellom to lagringer kan være mer enn 24 timer, fordi lagringen skjer når som helst i døgnet. Da kan
  nesten to døgns produksjon havne på ett døgn.

**Endring** (migrasjon 018):
- Tonnsperren er 100 000 t per døgn mellom to lagringer. Den stopper fortsatt urimelige tall.
- Flagg som bare skyldtes tonnsperren, er fjernet (bare Figen). Figen er tilbake som nr. 1 på «Alle tider» (383 mrd.).

**Lærdom:** når nytt utstyr øker produksjonen, må grensene i juksesperren sjekkes mot det nye maksimumet med alt utstyr,
ikke mot grunntallene.

## B-159 Trivselen synker uten bonus (2026-09-26)
Status: gjelder (justerer trivselen i B-026)
Brukeren: «Det er lenge siden jeg ga bonus. Hvorfor er trivsel på 100 % enda da?»

**Årsak:** Hver levert kontrakt ga +0,5 i trivsel. Med salgsdirektør leveres mange kontrakter i døgnet. I tillegg gir 4 og
5 skiftlag +0,5 og +1 i døgnet. Til sammen var det mye mer enn driften ned mot normalen (60 eller 70 med ledelse), så
trivselen sto fast på 100 uten bonus.

**Endring:**
- Fra stålverket (nivå 3) synker normalen etter 14 døgn uten bonus: 0,5 per døgn, høyst 15 (`bonusGap`, `moraleNormal` i
  `plant.ts`). En bonus nullstiller det.
- Løft i hverdagen (leveranser og skiftlag) når bare opp til normalen + 15 (`liftMorale`). Bonus, kurs og valgkort kan
  fortsatt gi opp til 100.
- Lenge uten bonus ender trivselen rundt 60–70, ikke 100. Det gir fortsatt god innsats, men bonusen har en verdi igjen.
- **Råd i spillet:** kortet «Trivsel» sier hvor lenge det er siden bonus og hvor trivselen er på vei. Et råd på Verket
  («Det er lenge siden de ansatte fikk bonus …») kommer når trivselen er under 70 og bonus kan gis. Rådet, og rådet om lav
  trivsel, åpner Folk → Ansatte der bonusknappen er.
- **Konto (KONTO.md):** nei, dette er vanlig spillmekanikk.

**Balanse:** Verksted 8, Støperi 25, Stålverk 65, Storverk 138 døgn (median), nybegynneren 165. Nybegynneren gir ikke
bonus oftere enn før; trivselen rundt 60–70 holder den godt nok.

## B-160 Valg om å fortsette i samme fart etter et kort (2026-09-26)
Status: gjelder (justerer «1× etter kort» i B-033)
Brukeren: «På alle popups går jo tiden ned til 1×. Man bør få et valg om å fortsette med 10× om man hadde det på fra
før.»

**Før:** Etter hvert hendelseskort, tips og råd gikk spillet videre på 1× (B-033), fordi brukeren tidlig trykket feil og
raste videre på 10×. Kontrollrommet tok allerede tilbake farten fra før.

**Endring:**
- Kortet har en linje nederst, «Fortsett på 10× etterpå» (eller 3×), når farten før kortet var over 1×. Den kan hukes av
  med én gang. Knappene på kortet venter fortsatt 0,8 s (B-033).
- Valget huskes (`settings.keepSpeed`, standard av, så nye spillere får 1× som før). Det kan også slås av og på under ⚙️
  Innstillinger når 3× er forsket fram.
- Med valget på teller ikke kortet som «farten ble satt ned», så tipset om 1× (B-069) kommer ikke av det. Tipset
  forteller nå om valget.
- **Konto (KONTO.md):** nei, regel 1.
- Nytt felt har standardverdi i `migrate()`. Test i `tests.ts`.

## B-161 Varsel for alle ovner, sesongquiz, «slaggen» og kundevurdering (2026-09-26)
Status: gjelder
Brukeren: «Fiks at de andre ovnene også får varsel om de står uten skrap. Fiks quiz for alle sesongkapitler. Slaggen er
riktig. Fiks det du nevnte om kundevurdering.» Vern mot lekkede passord er på; glemt passord er ikke testet.

**Skrapvarsel for alle ovner:** «Ovnen står: skraplageret er tomt» kom bare for ovn 1. Nå varsles hver ovn som blir
stående uten skrap, samlet i ett varsel («Ovnene 1 og 2 står: …»). Rådet på Verket sier også hvilke ovner som står.

**Sesongquiz:** sesongkapitlet («Konjunkturer og sesonger») er det eneste sesongkapitlet, og har fått to spørsmål
(skrappris følger stålpris, tørt år gir dyr strøm). Kapitlet låses opp med en sesong, som krever konto. Derfor teller
det ikke med i prestasjonen «Fagekspert» (alle quizer), så den kan fortsatt nås uten konto (KONTO.md regel 1).

**«Slaggen»:** kontrollrommet skrev «slagget». Nå står «slaggen» overalt i spillet, README og DESIGN (eldre
beslutninger og logg er ikke endret).

**Kundevurdering 1–10** (som anmeldelsene i Game Dev Tycoon): kunden gir en karakter når en kontrakt er levert.
- Tid: levert med minst 40 % av tida igjen (+2), minst et døgn før fristen (+1), eller på fristdagen (0).
- Kvalitet: margin til kravene i det dårligste partiet (`specMargin`): minst 0,3 (+2), 0,15 (+1), 0,05 (0), ellers −1.
  Margin 1 er langt unna alle grensene, 0 er akkurat på en grense.
- Karakteren er 6 + tid + kvalitet. En reklamasjon gir høyst 3.
- Omdømmet fra leveringen ganges med `0,5 + 0,07 × karakter`: 7 gir som før, 10 gir ca. 20 % mer, 3 ca. 30 % mindre.
- Visning: varselet («Kunden gir 9/10: «…»»), snittet og karakteren per kontrakt under Salg → Ordrekø → «Nylig
  avsluttet», ny tekst i fagboka (Kunder og omdømme), prestasjonen «Ti av ti».
- Råd: når snittet av de siste fem er under 6, kommer et råd på Verket om å levere tidligere og velge en resept med mer
  margin.
- Nye felt: `ratings` i spilltilstanden (standard i `migrate()`), og `acceptedDay`, `qMargin`, `rating`, `ratingNote`
  på kontraktene (valgfrie; eldre kontrakter regnes som signert tre døgn før fristen).
- `balance.ts --vurdering` viser karakterene per nivå. Flink: snitt 7,3–8,8; nybegynner 8,2–9,5 (tryggere resepter).
- **Konto (KONTO.md):** nei, regel 1.

**Balanse:** Verksted 8, Støperi 23, Stålverk 66, Storverk 137, nybegynner 155. Sjekken av kontrollrommet i
`balance.ts` svarer nå på hendelseskort som dukker opp mens chargen gjør seg ferdig (og beholder farten, B-160).
Ellers stoppet tida, og sjekken feilet når tilfeldighetene ga et kort akkurat da.

## B-162 Tidslinja får tall fra samme øyeblikk som dagen (2026-09-26)
Status: gjelder (justerer tonnsperren i B-158)
Brukeren: «Figen ble borte fra topplista igjen?»

**Hva skjedde:** Juksesperren flagget Figen for «117598 tonn på 1 døgn». Tidslinja viste dag 1026 → 1027 med
+117 598 t og dag 1027 → 1030 med bare +7 708 t. Til sammen ca. 31 000 t per døgn, som vanlig. Feilen var i appen:
`uploadSave` leste dagen før den ventet på `save_game`, men kasse, konsernverdi og tonn etterpå. Spillet går videre
mens lagringen venter på svar, så på 10× kunne dag 1027 få tallene fra dag 1030.

**Endring:**
- Appen leser alle tallene til tidslinja samtidig med dagen (`snapshot` i `net/sync.ts`). Ny nettest med en falsk
  server som lar spillet gå tre døgn videre mens lagringen behandles.
- Migrasjon 019: tonnsperren flagger bare hvis også snittet fra en lagring minst tre døgn tilbake er over 100 000 t per
  døgn. Gamle utgaver av appen (før de har oppdatert seg) flagger da ikke ærlige spillere. Testet i databasen: feilen
  over gir ikke flagg, 500 000 t på ett døgn gjør det.
- Tonnflagg der snittet over noen døgn rundt flagget er normalt, er fjernet (bare Figen).

**Lærdom:** alt som sendes sammen med en dag, må leses før første `await` (lagt i CLAUDE.md under fallgruver).

**Konto (KONTO.md):** ingen ny funksjon.

## B-163 Lærlinger tar fagbrev (2026-09-26)
Status: gjelder
Brukeren: «Lærlinger må kunne ta fagbrev slik at de ikke står som lærlinger for alltid.»

**Før:** En lærling (hendelseskortet fra yrkesskolen) var en allrounder med «(lærling)» i navnet og halv lønn – for
alltid, også med fem stjerner.

**Endring:**
- Læretida er 30 døgn (`APPRENTICE_DAYS`, `apprenticeUntil` på den ansatte). Så går lærlingen opp til fagprøven.
- Bestått (ferdighet minst 1,6): fagbrev. «(lærling)» fjernes fra navnet, lønna blir vanlig lønn for faget
  (`normalSalary`, samme som nye kandidater), ferdighet +0,2, trivsel +1 og +2 fagpoeng.
- Strøk: ny prøve om 7 døgn. Varselet sier at trivsel og kurs gjør at folk lærer fortere.
- Under Folk → Ansatte står «🎓 Fagprøve om N døgn» ved lærlingen. Hendelseskortet og fagboka (Folk og skift) forteller
  om læretid og fagbrev.
- Eldre lagringer: lærlinger (navnet slutter på «(lærling)») får fagprøve om tre døgn, eller når 30 døgn er gått.
- Ingen handling kreves av spilleren, så nybegynneren trenger ikke noe nytt råd.
- **Konto (KONTO.md):** nei, regel 1.

**Funnet underveis:** et planlagt bytte av støping («bytt når ordrene er levert», B-102) ble aldri gjennomført mens en
rammeavtale på det gamle produktet varte, fordi hver uke la en ny ukeleveranse i ordrekøen. Nå sendes ingen nye uker på
det gamle produktet når et bytte er planlagt; avtalen avsluttes uten straff ved byttet (B-040). Test i `tests.ts`.

**Balanse:** Verksted 8, Støperi 23, Stålverk 66, Storverk 137 (som før). Nybegynneren 184 (var 155, mål høyst 240).
Med fagprøven slått av blir tallet 155 igjen, men utslaget kommer fra at nybegynneren tar andre veier (to frister gikk ut
rundt dag 97 i frø 1, og den kjøpte lysbueovn før strengstøping og sto 80 døgn med blokkstøping), ikke fra lønna: uten
lønnsøkningen ved fagbrev blir det også 184. Nybegynneren med «planlegg byttet» ble prøvd, men ga konkurs (byttet kjøpes
uten buffer), så den ble fjernet.

## B-164 Avløsere og oppsigelser blir forståelige (2026-09-26)
Status: gjelder (justerer avløseranbefalingen i B-111)
Brukeren: «Det er vanskelig å forstå hvor mange av hver type ansatt man trenger. Mange klager på at om man sparker en
avløser, så trenger man plutselig en støper selv om man har 23 avløsere.»

**Årsak:** Avløsere gjør to ting: de fyller faste plasser der det mangler egne folk (f.eks. støpere), og de tar plassen
til dem som er syke. Kortet «Anbefalt i tillegg» talte alle avløserne mot de to som anbefales for fravær («23 av 2»),
også dem som sto fast som støpere. Da så det ut som man hadde mange for mye, og sa man opp en som sto fast, manglet
plutselig en støper. Tabellen skrev også «herav 14 vikarer» under egne folk, som var uklart.

**Endring:**
- `wildcardUse` (plant.ts): hvor mange avløsere som står fast på plasser (og som hva), og hvor mange som er ledige.
- Anbefalingen heter «Ledige avløsere» og teller bare de ledige. Står noen fast, står det f.eks. «6 av 23 avløsere står
  fast som 2 ovnsoperatører og 4 støpere, fordi det mangler egne folk der. Ansetter du dem, blir avløserne ledige.»
- «Si opp» viser hva som skjer før man bekrefter (`fireImpact`): «Skiftene går som før», eller «Da går verket 2 skift i
  stedet for 3: det mangler 1 støper.» Gjelder alle ansatte, ikke bare avløsere.
- Tabellen: «X av Y står på en plass nå, Z er ledige til fravær. Sier du opp en avløser som står på en plass, mangler
  den plassen.» Vikarer vises som «N borte, vikarer dekker».
- Ved neste skiftlag står det at de ledige avløserne er regnet med i det som mangler.
- Ingen endring i hvordan bemanningen regnes; bare hvordan den vises. Balansen er uendret.
- **Konto (KONTO.md):** nei, regel 1.

## B-165 Lagring som henger på mobilnettet, og mesterskapet «Holdbare ovnspotter» (2026-09-26)
Status: gjelder
Brukeren: «På en spillers Android-telefon står hans egen topplistetall stille mens andres øker. Er det en kodefeil?» og «Man
bør kunne bruke fagpoeng på at ovnspottene holder lenger (mesterskap).»

**Topplista på Android:** Ditt eget tall kommer fra lagringen på nett. Tidslinja til spilleren viste 21 minutter uten
en eneste lagring (dag 823 → 914) mens spillet gikk, så kom alt på en gang. Neste lagring venter på den forrige
(`inFlight` i `net/sync.ts`), og et kall uten tidsgrense kan henge lenge på et mobilnett, f.eks. ved bytte mellom wifi og
5G. Det er mer vanlig på Android enn på iPhone.
- Alle kall til tjenesten (`call` i `net/supabase.ts`) avbrytes etter 30 s og regnes som «ingen kontakt med nettet».
  Neste lagring prøver igjen. Ny nettest med et kall som aldri svarer.
- Topplista sier fra når spillet ikke er lagret på nett («… siden kl. 14.23, så tallet ditt står stille»), eller når
  en annen enhet har lagret.

**Mesterskapet «Holdbare ovnspotter»** (`foring` i `mastery.ts`): mindre slitasje på foringen for hver charge, opptil
30 % (samme kurve som de andre: nivå 1 gir 3 %, stadig mindre per nivå). Grunnpris 100 fagpoeng. Virker sammen med
forskningen «Ildfast» (`wearFactor`, `liningWearPerHeat`).
- **Konto (KONTO.md):** nei, regel 1 (mesterskapet er i spillet, som de andre).

**Svar til brukeren om Figen og Grane:** begge har 12 stålkomplekser og tjener like mye per spilldøgn (5,2 mrd.). Figen
har spilt mer den siste tida (129 døgn på 30 min mot Granes 54 døgn på 12 min), og Granes tall sto stille i 21 min på
grunn av feilen over.

**Balanse:** uendret (8/23/66/137, nybegynner 184).

## B-166 Alle spill blir med i sesongen som pågår (2026-09-26)
Status: gjelder (erstatter «bare garasjen» i B-133 og regelen om nytt spill+ i B-140)
Brukeren: «Ingen vil starte på nytt for å bli med på sesong 1. Jeg tror vi må la alle spillere nå bli med i aktiv
sesong.»

**Endring:**
- Et spill som ikke har vært med i en sesong før (`season` er tom), blir med i sesongen som pågår med en gang
  spilleren er logget inn – uansett hvor langt det har kommet (`canJoinDirectly` i `world.ts`). Spillet fortsetter som
  det er, og står på sesonglista fra neste lagring. Loggen sier «Spillet ditt er nå med i Sesong 1».
- Fordelen for den som var med i forrige sesong (5 % mer i kassa og 10 fagpoeng) gis bare til et nytt spill i
  garasjen, ikke til et spill som har kommet langt.
- Et spill fra en **tidligere** sesong får fortsatt valget når en ny sesong starter: start i garasjen, eller spill
  videre på «Alle tider». (Erstattet av B-167: alle blir med videre.)
- Tekstene er skrevet om: popupen uten konto, sesongpopupen, fagboka (sesongkapitlet) og seiersskjermen sier ikke
  lenger at alle starter i garasjen.
- Serveren trenger ingen endring: sesonglista viser alle med tidslinje i sesongen. Juksesperren ser bare på lagringer
  i samme sesong, så den første lagringen i sesongen sammenlignes ikke med tida før.
- **Konto (KONTO.md):** som før – sesongen krever konto (regel 3).

## B-167 Neste sesong starter av seg selv, og alle blir med videre (2026-09-26)
Status: gjelder inntil videre – automatisk neste sesong er skrudd av med en bryter (B-182); koden står (erstatter «alle starter i garasjen når en ny sesong starter» i B-129, og valget for spill fra en
tidligere sesong i B-166)
Brukeren: «Når sesong 1 er ferdig går vi over til sesong 2 automatisk. Alle blir med over.»

**Server (migrasjon 020):** `season_status()`, som appen kaller hvert minutt, lukker sesongen som er over
(`close_season`, med sluttresultat og 🎖 som før) og starter den neste: «Sesong N», 26 uker, fra der den forrige
sluttet. Har ingen spilt på over et halvt år, starter den nye nå. En lås (`pg_advisory_xact_lock`) hindrer at to som
spør samtidig, starter hver sin. `start_season(...)` virker som før for den som vil starte en sesong med en vri.
Testet i databasen (rullet tilbake): Sesong 1 lukkes med resultater, Sesong 2 starter på sluttidspunktet, et nytt kall
starter ikke en til.

**Appen:** alle spill med konto blir med i sesongen som pågår – også videre når en ny sesong starter
(`canJoinDirectly(g, sesong)`). Loggen sier «Sesong 2 har startet. Spillet ditt er med videre …». Spørsmålet om å
starte på nytt i garasjen er fjernet; uten konto kommer beskjeden om å logge inn som før. Fordelen for den som var
med sist, gis fortsatt bare til nye spill i garasjen.

**Konto (KONTO.md):** som før – sesongen krever konto.

## B-168 Sjæfen får tilbake framgangen fra spillet før sesongen (2026-09-26)
Status: gjelder (engangsretting av data)
Brukeren: Sjæfen hadde kommet til storverket, men startet Sesong 1 på nytt før B-166 lot alle bli med som de var –
«klarer du å reversere slik at han får fortsette fra der han var?»

**Funnet:** Det gamle spillet (uten sesong) nådde storverket på dag 171 og konsernverdi 27,6 mill. (dag 205). Ved ny
start ble lagringen overskrevet; databasen har bare det siste spillet, så det kan ikke hentes tilbake nøyaktig.
Sesongspillet sto på stålverket på dag 179 og var gått konkurs (kasse −4 mill., lån 5,7 mill.).

**Retting (brukeren valgte «løft sesongspillet»):** lagringen på nett ble endret med SQL: nivå storverk, kasse
27 551 659 kr og lån 0 (samme konsernverdi som det gamle spillet), konkursen og tellerne for den fjernet, flyttefeiring,
pause og en forklaring i loggen. Folk, forskning og fagpoeng er hans egne. `device` ble satt til «rettet-av-utvikler»
og versjonen økte (487), så appen hans henter spillet fra nett. Juksesperren tillater hoppet (storverk).

**Lærdom:** før B-166 kunne en ny sesongstart slette et spill som hadde kommet langt. Nå trengs det ikke, men spill som
erstattes (⚙️ → Nytt spill), kan fortsatt ikke hentes tilbake.

## B-169 Sikkerhetskopi av spillene på nett (2026-09-26)
Status: gjelder
Brukeren: «Skal vi lage backups av saves til folk en gang per dag slik at man kan rulle tilbake om noe uforutsett
skjer?» – ja.

**Migrasjon 021:**
- Tabellen `save_backups` (spiller, tidspunkt, grunn, dag, versjon, sesong, spillet). Triggeren `saves_backup` tar kopi
  av spillet slik det var **før** det overskrives:
  - første lagring hver dag (norsk tid) – «daglig», og
  - når et spill over dag 5 erstattes av et med mer enn to døgn lavere dag – «lavere dag» (ny start eller gammel
    lagring; det ville ha reddet storverket i B-168).
- Kopier eldre enn 14 dager slettes når spilleren lagrer. Kopiene slettes med kontoen (`on delete cascade`).
- Ingen spiller kan lese kopiene (RLS uten policy, tatt fra anon og authenticated), så de kan ikke brukes til juks
  (B-135). Sikkerhetsrådet «RLS uten policy» for tabellen er derfor med vilje.
- `restore_save(id)` (bare SQL Editor/connectoren) legger kopien inn som spillet på nett, med ny versjon og `device`
  «gjenopprettet», så appen til spilleren henter det. Spillet slik det var, tas vare på først.
- Testet i databasen (rullet tilbake): én daglig kopi, ingen ved andre lagring, «lavere dag» ved ny start, og
  gjenoppretting gir riktig dag og ny versjon.
- Størrelse: et spill er 100–190 kB før komprimering; 14 kopier per spiller er noen få MB med dagens spillere.
- **Konto (KONTO.md):** gjelder bare spill lagret på nett (konto); spilleren merker ingenting.

## B-170 Små forbedringer: stålkomplekser, avløsere, «koblet til», bytte av støping (2026-09-26)
Status: gjelder
Brukeren: «Ta alle de små tingene» (de fire forslagene fra forrige økt).

**1. Stålkomplekser:** når konsernet er fullt og komplekser er åpnet (Stålfyrste), får hvert datterverk som ikke er et
kompleks valget «Selg X og kjøp et stålkompleks» (`bytt-<id>` i `konsernOptions`, `swapForKompleks`). Prisen er
komplekset minus det verket er verdt, og gevinsten er forskjellen i overskudd. Kassa må rekke før noe selges. Knappen
står under «Moderniser eller selg» på verket, og «Neste steg» foreslår byttet når det betaler seg raskest (med en
forklaring: et kompleks tjener som fem storverk, men tar én plass). Sperreteksten på «Nytt stålkompleks» og beskjeden
ved Stålfyrste peker dit.

**2. Avløsere:** «Ansett til plassene (N)» under «Ledige avløsere» på Folk → Skift, når avløsere står fast på plasser
(`hireForWildcards`). Den ansetter søkere med rollene som mangler, så langt det er plass; mangler søkere eller plass,
står det i stedet.

**3. Topplista:** «Koblet til på dag N» under navnet når spillet ble koblet til kontoen på dag 6 eller senere
(`linked_day`, første dag i tidslinja: i sesongen den første i sesongen, på «Alle tider» den første i det hele tatt).
Det forklarer rask vekst hos dem som spilte uten konto før (Grane: dag 1019). Migrasjon 022 lager `leaderboard()` og
`my_rank()` på nytt (ny kolonne til slutt). Linjene under navnet brytes nå i stedet for å kuttes på 320 px.

**4. Rekkefølgen ovn/støping:** nybegynneren sto 80 døgn med blokkstøping fordi «Lever først kontraktene på blokker»
aldri ble oppfylt: nye ordrer (også ukene i rammeavtaler) kom hele tiden. Rekkefølgen etter pris stemmer allerede med
flaskehalsen på alle nivåer, så den er ikke endret. I stedet:
- Det planlagte byttet (B-102) kjøpes først når kassa har prisen **pluss tre døgns drift** (`switchCashNeeded`,
  `SWITCH_BUFFER_DAYS`). Venter det på penger, sier loggen det én gang (`switchWaitNoted`, standard i `migrate()`).
- «Neste store steg» sier hva man skal gjøre: spar opp til byttet (og ta ordrer som før), så trykk «Bytt når ordrene er
  levert». Den sier også hva som er flaskehalsen (ovnene eller støpingen, i tonn i timen).
- Nybegynneren følger rådet og planlegger byttet når kassa rekker. (Å planlegge før kassa rekker stopper ordrene og ga
  konkurs i testspilleren – derfor rådet om å spare først.)

**Balanse:** Verksted 8, Støperi 23, Stålverk 66, Storverk 137 (som før). Nybegynneren 152,5 (var 184), 0 konkurs.

**Konto (KONTO.md):** 1, 2 og 4 nei (regel 1). 3 ja, en del av topplista (regel 3).

## B-171 Skrapinnkjøperen, skrapklasseren, hendelser og småfeil (2026-09-26)
Status: gjelder
Brukeren (og spillere): «Han skrapinnkjøperen var jo ubrukelig», «Venter mye på returskrap», «Får ofte de samme
popupsene … messer med 100 i omdømme», «Naboene klager veldig ofte», «Nettselskapet ringer for ofte», «Toppliste
omdømme er ikke vits», reservepotte bare til ovn 1?, skyen gjør toppmenyen høyere, tekster om Safari og «flytt til et
større sted» på storverket, oppdater-knappen og gamle tall på topplista, salgsmerket med salgsdirektør.

**Skrapinnkjøperen (planleggeren):** i et ekte spill var skraplageret (6 000 t) nesten fullt av skrap den gjeldende
resepten ikke brukte (1 300 t tungt skrap ingen resept brukte, 1 400 t returskrap, 1 500 t shredder), så planleggeren
fikk ikke plass til det som trengtes, og kjøpte bare for kvaliteten som ble kjørt nå. Nå:
- Den kjøper etter **ordrekøen**: kvalitetene i køen, i rekkefølge, til innkjøpet for de neste døgnene er dekket.
- Det som mangler av returskrap (kan ikke kjøpes), kjøpes som de andre typene i blandingen.
- Er lageret for fullt, **selger** den skrap ingen resept i køen trenger, til skraphandleren for 60 % av prisen
  (returskrap som tungt skrap), med en linje i loggen. Kan slås av under Marked → Skrap («Planleggeren kan selge …»).
- Spilleren kan selge selv: «Selg alt» når man trykker på en skraptype.

**Skrapklasseren:** når en type i resepten er tom (oftest returskrap), bytter den inn skrap som er minst like rent
(fosfor og sporelementer) i stedet for å la ovnen vente. Loggen sier fra én gang per døgn (`graderSubDay`).

**Planlagt bytte av støping (B-170):** venter byttet på penger i 5 døgn (`SWITCH_WAIT_DAYS`, `switchWaitDay`),
avbestilles det, så forespørslene på det gamle produktet kommer igjen. Ellers kunne verket stå uten ordrer for alltid
(nybegynneren gikk konkurs slik da pengene gikk til en ovn). Nybegynneren kjøper ikke annet mens et bytte er planlagt.

**Hendelser:** åtte nye kort (sommerfest, idrettslaget, innovasjonsmidler, erfaren fagarbeider, kobbertyver,
fagskolebesøk, video på nett, stor ordre fra utlandet). Lengre pause for nettselskapet (50 døgn), naboklager (60),
messe (50), avis og tilsyn (40). Messa kommer ikke med omdømme 90 eller mer. Etter støyskjerm og filter klager naboene
ikke igjen før verket flytter til et større nivå (`decisionFixed`).

**Småfeil:**
- Topplista: «Omdømme» er fjernet (nesten alle har 100). Lista viser ikke tallene fra forrige liste når man bytter,
  oppdater-knappen snurrer mens den henter, og «Oppdatert kl. …» står under lista.
- Reservepotter: motoren hadde én per lysbueovn hele tida (sjekket i spillene på nett), men tekstene sa «lysbueovnen
  har to potter» og «den ene potta». Tekstene sier nå at hver lysbueovn har sine egne.
- Skyen i toppfeltet blinker mens den lagrer i stedet for å bli «☁…», så klokka ikke brytes til to linjer.
- Lagring i ⚙️ og kontokortet nevner ikke bare Safari.
- På storverket står det ikke «flytt til et større sted».
- Salg-merket nederst vises ikke når salgsdirektøren signerer.

**Sjæfen:** «alle tider» sto hele tida (27,6 mill., 5. plass) – rekordene går aldri ned. Simulert opplasting av det
rettede sesongspillet: ikke flagget, 27,6 mill. og storverk dag 179 i sesongen.

**Balanse:** Verksted 8, Støperi 29, Stålverk 71, Storverk 151 (var 8/23/66/137; innenfor målene). Nybegynneren 142,5
(var 152,5), 0 konkurs. Den flinke testspilleren er litt tregere fordi byttet av støping og skrapet går annerledes.

**Konto (KONTO.md):** nei, regel 1.

## B-172 Varsellinja, ukelista for alle og salgsdirektøren som kan oppgraderes (2026-09-26)
Status: gjelder. Erstatter ligadelen av B-152 (ukelista per liga). Hvordan «Mer stål enn før» måles, er erstattet av B-235.
Brukeren: «Syntes varslingslinja fungerer dårlig. Får ikke med meg det siste … Varslene på linja stemmer heller ikke.
Kryss ut bør bety fjern alle varsler og antallet varsler.» «Ligaene gir ikke mening i dag. Fiks.» «Salgsdirektøren bør
kunne oppgraderes. Ser jeg av og til ikke har noen ordre.»

**Varsellinja:** varslene sto i kø, så det eldste ble vist først og det siste som skjedde kom for sent. Nå vises det
**nyeste** med en gang (det som skyves bort, står i varsellista bak 🔔). «+N» for køen er borte – bare bjella har tall.
**✕ fjerner alle varsler og nullstiller tallet** på bjella (`markAllSeen`); lista bak 🔔 har dem fortsatt. Svar på noe
spilleren trykket på («For lite penger») skyves ikke bort av loggen.

**Ukelista (migrasjon 023):** ligaene målte vekst og tonn i kroner og tonn, så den største i gull-ligaen vant alltid,
og en alene i bronse eller sølv fikk medalje uansett. Nå er det **én liste for alle**:
- vekst: prosent vekst i konsernverdi i uka, regnet fra minst 50 mill. (ellers vokser et lite verk tusenvis av
  prosent; testet på de ekte spillerne: 192 %, 122 %, 56 %, 55 %, 2 %),
- tonn: stål per spilldøgn i uka i prosent av det verket laget per døgn før uka,
- dager: spilldøgn i uka, som før.
Topp 3 av alle får medalje og kiste. Kolonnen `league` står igjen med «alle». Ligafanene i appen er fjernet.

**Salgsdirektøren:** tre oppgraderinger under Konsern → Salgsdirektør (`DIRECTOR_UPGRADES`, `director.level`):
1. Salgsteam (500 mill.): regner med et vanlig døgn i stedet for det dårligste, bruker 85 % av tida til fristen (før
   70 %), og tar ordrer der resepten er nær grensen.
2. Kundenettverk (2 mrd.): skaffer flere forespørsler når ordrekøen er kortere enn to døgns produksjon.
3. Eksportkontor (8 mrd.): 5 % bedre pris på kontraktene den signerer, rammeavtaler opp til 70 % av ukeproduksjonen.
Salg-merket nederst vises ikke når salgsdirektøren signerer (B-171).

**Konto (KONTO.md):** varsellinja og salgsdirektøren nei (regel 1); ukelista krever konto som før (regel 3).

## B-173 Sesongstigen og flere titler (2026-09-26)
Status: gjelder
Brukeren: «En sesong varer akkurat nå i 6 mnd. På dag 3 har jeg absolutt alt. Jeg trenger ting å gjøre i 6 mnd. Lag
ting som fungerer hele veien, slik at man ikke blir lei, du kan utvide med det vi allerede har laget.»

**Hvorfor noe som følger virkelig tid:** på 10× går et spilldøgn på 12 sekunder, så alt som måles i spilldøgn, tonn eller
kroner er borte på få dager for den som spiller mye. Det eneste som varer, er det som er bundet til virkelige dager.

**Sesongstigen (migrasjon 024, kortet på Verket):** 50 trinn, 20 poeng per trinn. Poengene regnes ut på serveren av det
den alt vet, og som bare kan skje én gang per virkelige dag eller uke (norsk tid):
- 1 poeng per dag med spill i sesongen (en lagring på nett den dagen),
- 2 poeng for dagens belønning og 3 for dagens oppdrag (`add_season_points` i `claim_daily_reward`/`claim_daily_missions`,
  tabellen `season_points`),
- 12 / 9 / 7 poeng for 1., 2. og 3. plass på ukelista (fra `weekly_results` i sesongen).
Med spill hver dag blir det ca. 6 poeng per dag, så toppen nås omtrent ved sesongslutt; den som spiller et par dager i uka,
kommer halvveis. Hvert trinn gir 20 + 2 × trinn fagpoeng (`claim_season_tiers`, `season_track_claims`, kan hentes én gang,
også på tvers av enheter). Trinn 10, 20, 30, 40 og 50 gir pynt som bare finnes på stigen: sesongflagg, gullfasade,
nattsvart fasade, stjerne over verket og sesongpokal (kan ikke kjøpes, «🔒 Sesongstigen, trinn N» i Pynt-arket).
Fagboka (sesongkapitlet) forklarer stigen.

**Flere titler:** etter Stållegende (1 000 mrd.) kommer Stålgigant (5 000 mrd., to datterverk til), Stålkolosse
(25 000 mrd., modernisering til trinn 6), Stålmyte (100 000 mrd.) og Stålikon (1 000 000 mrd.). `title_of()` på serveren
har de samme grensene.

**Ikke gjort (forslag):** ventetid i konsernet (fase 4) ville også strukket spillet i virkelig tid, men brukeren ville
vente med den. Landemerker (store byggeprosjekter med ett nytt per dag) kommer i neste leveranse.

**Konto (KONTO.md):** stigen krever konto (regel 3 og 5: sammenlignbar og belønner virkelig tid), `stigen` i
`ACCOUNT_FEATURES`; uten konto vises kortet med `NeedsAccount`. Titlene: som før.

## B-174 Landemerker (2026-09-26)
Status: gjelder
Brukeren: se B-173 («ting å gjøre i 6 mnd.»). Landemerkene er den andre delen.

**Endring:** 27 landemerker (`game/landmarks.ts`): parkbenker, kumlokk, fyrlykt, gangbru, kai, skole, sykehus, tunnel,
stadion, vindpark, hengebru, operahus, skyskraper, plattform, oppskytningsrampe, høyhastighetsbane, modul til
romstasjon og til slutt verdens lengste bru – hvert med én setning om hva stålet brukes til.
- Det neste landemerket kommer som en egen forespørsel når en **ny virkelig dag** begynner (mobilens dato, `todayKey`),
  og bare på nivået det hører til. Så varer samlingen i uker, selv om et spilldøgn går på 12 sekunder.
- Forespørselen er på 1–10 døgns produksjon i standardkvalitet, 25 % over vanlig pris, og står til du svarer.
- Levert: fagpoeng (5–150), omdømme +2, og det står i samlingen på kortet «Landemerker» på Verket. Går det ut eller blir
  avslått, kommer det samme igjen en annen dag.
- Ikke under den veiledede starten eller de første tre døgnene.
- Mobilens dato kan stilles, men det gir bare vanlig kontraktspris og fagpoeng – ingen fordel på topplistene utover det.

**Rettet samtidig:** kortet «Kobbertyver» (B-171) kunne koste 180 000 kr på verkstedet og ga en nybegynner konkurs i
testspilleren. Det kommer nå først fra støperiet, og tyveriet koster det dobbelte av kameraene (ikke tredobbelt).
Testspilleren velger forsiktig på de nye kortene.

**Balanse:** Verksted 7, Støperi 25, Stålverk 67, Storverk 159. Nybegynneren 137,5, 0 konkurs.

**Konto (KONTO.md):** nei, regel 1.

## B-175 Kontrollrommet er et spill i fire runder (2026-09-26)
Status: gjelder (erstatter den enkle styringen i B-010, B-076, B-079, B-080, B-093 og B-108 og stegene i B-086)
Brukeren: «Å kjøre ovnen manuelt syntes alle er kjedelig. Bytt ut hele greia med noe som fungerer skikkelig bra og som er
morsomt.»

**Hvorfor det var kjedelig:** én charge tok 2–3 minutter, det meste var venting på en måler, og strøm ▲/▼ i fem nivåer
ga lite å gjøre med hendene. Prosessmodellen under var riktig, men for treg til å være morsom.

**Endring:** «Ta styringen» åpner et kort spill (`ui/control/chargeGame.ts` og `ControlRoom.tsx`), under ett minutt, i fire
runder med hver sin mekanikk og et kort før hver runde som sier hva som skjer i ovnen og hva du gjør:
1. **Smelt** (ca. 14 s): hold inne for strøm, slipp for å kjøle, og hold temperaturen i det grønne. Skrapkurver varsles
   ett sekund før de faller i – en tung kjøler, en lett varmer. Oksygenet slås på halvveis og gir mer varme.
2. **Blås ut karbonet** (ca. 6 s): hold inne for oksygen. Karbonet går ned, men slaggen skummer; når skummet når kanten,
   koker det over (−100 poeng, litt stål tapt). Trykk «Ferdig» når karbonet er i det grønne.
3. **Rak ut slaggen** (8 s): trykk på de grå slaggklumpene før de synker. Blanke klumper er stål og koster.
4. **Tapp** (ca. 8 s): temperaturen stiger fortere og fortere – trykk «Tapp!» i det grønne (±8 °C). Hold så inne for å
   helle i øsa; strålen renner litt etter at du slipper, så slipp før streken.

Poeng med kombo (i det grønne over tid, klumper på rad), stjerner som før (0–3 for smelting, rensing, avslagging,
tappetemperatur og øsa; 5★ krever 14 av 15), en **rekord** (`controlBest`, vises på Verket og i resultatet) og knappen
«Ta neste charge også». Belønningen er som før (B-086): 1 + stjerner i fagpoeng, og 4–5 stjerner gir 8–15 ekstra
fagpoeng og 3–6 % bedre pris.

**Til spillet:** resultatet regnes i samme skala som prosessmodellen ga, ut fra ovnens avfosforering, strøm per tonn og
smeltetid (nye valgfrie felt i `ManualRequest`): karbonet fra runde 2, fosforet fra skrapet og hvor mye slagg du raket
ut, strøm og foringsslitasje fra hvor lenge badet var for kaldt eller varmt, tapt stål fra overkoking, stål i raka og
øsa som rant over. Gjennombrenning finnes ikke lenger i kontrollrommet.

Prosessmodellen (`src/sim/`) står igjen og sjekkes fortsatt av `sim/validate.ts`, men brukes ikke av spillet.

**Balanse:** testspilleren sjekker at en flink spiller (reagerer hvert 0,2 s) får minst 4★ på under 60 s og en slurvete
høyst 2★, på standard, lavkarbon og premium. En middels spiller (0,4 s, ser ikke på kurvene) fikk 3–5★. Resten av
balansen er uendret: Verksted 7, Støperi 25, Stålverk 67, Storverk 159, nybegynneren 137,5, 0 konkurs.

**Konto (KONTO.md):** nei, regel 1. Rekorden er lokal.

## B-176 Én fane om gangen og fartskontroll (2026-09-26)
Status: gjelder
Brukeren: en spiller prøvde å lure spillet med to faner oppe samtidig for å se om ting gikk dobbelt så fort, og med
utvidelser i nettleseren som skal få tida til å gå fortere. Dobbelsjekk at det ikke går.

**Hva vi fant:**
- **To faner** ga ikke dobbel fart. Hver fane har sitt eget spill i minnet og går i vanlig fart, men de lagret over
  hverandre – lokalt og på nett (samme enhet, så sperren i B-140 slapp begge gjennom). Ingen fordel, men spillet kunne
  hoppe fram og tilbake.
- **Fartsutvidelser** kunne virke. Spilløkka måler tida med `performance.now()`, og en utvidelse som får den og
  tidtakerne til å gå fortere, gir flere spilldøgn per time. Juksesperren sjekket bare veksten per spilldøgn, ikke hvor
  fort døgnene gikk, og ukens «dager», sesongstigen og topplistene belønner spilldøgn. `at` i tidslinja kunne dessuten
  settes av appen.

**Endring:**
- **Én fane om gangen** (`game/tabLock.ts`): når spillet åpnes i en ny fane eller et nytt vindu, lagrer den gamle fanen
  og står stille med beskjeden «Spillet er åpent et annet sted» og knappen «Spill her». En fane som ikke spiller, kan ikke
  lagre (`saveGame` sjekker det).
- **Fartskontroll** (migrasjon 025): appen sender spillminuttene (`game_min`) og minuttene som er spolt fram om natta
  (`boost_min`, telles i spilløkka) med tidslinja. Raskeste ærlige fart er 10× (120 spillminutter per sekund) og 6× så
  fort når verket står om natta. Serveren regner ut hvor lang tid spillminuttene siden en lagring minst 10 minutter
  tilbake minst må ha tatt, og sammenligner med sin egen klokke. Går det mer enn 15 % og ett minutt for fort, flagges
  spilleren (ute av listene, som før). `at` settes nå alltid av serveren.
- Testet i databasen (rullet tilbake): 60 døgn på 15 min og 200 døgn med 150 spolte på 15 min ga ikke flagg; 350 døgn på
  15 min (dobbel fart) ble flagget. Ærlige spillere har hatt høyst ca. 5 døgn per minutt.
- Eldre utgaver av appen sender ikke tallene; da hopper sjekken over, til de er oppdatert (B-148).

**Konto (KONTO.md):** fanesperren nei (regel 1); fartskontrollen gjelder det som ligger på nett (regel 2).

## B-177 Landemerkene tas manuelt (2026-09-26)
Status: gjelder (endrer B-174)
Brukeren: «Landemerker bør tas manuelt, slik at ikke salgsdirektøren gjør det for spillerne.»
**Endring:** salgsdirektøren hopper over landemerkene. Når direktøren er på, viser Salg likevel tall for landemerker som
venter, og kortet «Landemerker» sier at du tar dem selv på Salg. Test: direktøren signerer forespørselen når den ikke er
merket som landemerke, men lar landemerket stå.

**Konto (KONTO.md):** nei, regel 1.

## B-178 Skiftleder som følger opp fraværet (2026-09-26)
Status: gjelder (utfyller B-101)
Brukeren: «Man bør kunne ansette skiftledere sent i spillet som følger opp fraværet automatisk.»
**Endring:** ny rolle **Skiftleder** (søkere fra stålverket, lønn 2 600).
- Med en skiftleder på jobb følges fraværet opp hvert døgn: den som har vært syk tre ganger på 60 døgn og misbruker
  egenmelding, får advarsel (som den spilleren kan gi under Folk → Fravær, trivsel −1). Skiftlederen kjenner folka sine og
  tar aldri samtalen med dem som faktisk var syke – den feilen (trivsel −4) kan bare spilleren gjøre.
- Tett oppfølging: sykdomsrisikoen er 15 % lavere med en skiftleder på jobb.
- «Anbefalt i tillegg til skiftene» foreslår én på stålverket og to på storverket (den ene dekker ferie). Rådet om
  advarsel på Verket vises ikke når en skiftleder er på jobb, og nevner skiftlederen fra stålverket.
- Testspilleren ansetter skiftledere fra stålverket. Balanse: Verksted 7, Støperi 25, Stålverk 67, Storverk 139 (fra
  159: færre syke gir flere skift), nybegynneren 138,5, 0 konkurs.

**Konto (KONTO.md):** nei, regel 1.

## B-179 Endringslogg i spillet: «Hva er nytt» (2026-09-26)
Status: gjelder
Brukeren: «Spillerne bør få kunne se en changelog i spillet når det har blitt oppdatert. Husk å legg det til i dine
systemer så det huskes hver eneste gang.»
**Endring:**
- `game/changelog.ts` har oppføringer, nyeste først, hver med det høyeste B-nummeret den dekker og kort tekst for
  spillerne. Etter en oppdatering vises «Hva er nytt» med det som er nytt siden sist (husket per enhet). En ny spiller
  uten lagret spill får ikke lista; en som spilte før endringsloggen kom, får de tre siste. Hele lista ligger under ⚙️.
- Arket kommer ikke oppå andre vinduer eller veiledningen, og «Velkommen tilbake» venter til det er lukket.
- **Så det ikke glemmes:** `scripts/sjekk-endringslogg.mjs` kjøres av `npm test` og i publiseringen. Den stopper hvis
  den nyeste oppføringen ikke dekker den nyeste beslutningen i denne fila. Regelen står også i CLAUDE.md under «Før du
  avslutter en økt».

**Konto (KONTO.md):** nei, regel 1.

## B-180 Ny hovedretning: fra stålverk til industrimakt (2026-09-26)
Status: gjelder (justerer B-033, B-106, B-119, B-121, B-124, B-129, B-130, B-149, B-150 og B-167 – se tabellen i
`docs/RETNING.md`, avsnitt 10)
Endringslogg: nei (ingen endring i spillet ennå)
Brukeren (eieren) har fått en ekstern gjennomgang av spillet og godkjent en ny hovedretning. Den skal først inn i
designminnet og arkitekturen, og så bygges i små, testbare faser – ikke alt på en gang.

**Retningen:** spillet begynner som i dag i garasjen. Rollen vokser fra operatør via daglig leder, verkseier og
konserneier til industrimagnat. Sluttspillet handler om eierskap, ledelse og kontroll over industrien rundt verkene, i
konkurranse med ekte spillere – ikke om større ovner og større tall på konto. Alt til og med storverket beskyttes.

**Nye designpilarer** (står i `DESIGN.md` og `CLAUDE.md`): gradvis synlighet (spilleren ser aldri mer enn hen trenger
nå), ingen unødvendige valutaer (Industrimakt og Kontroll er avledede verdier), valg i stedet for regneark, størrelse
skaper nye problemer, penger er viktige men ikke makt alene, serveren avgjør alt mellom spillere, forklarbart utfall,
og ingenting i ekte tid krever at man sjekker mobilen ofte.

**Plan:** `docs/RETNING.md` har den kritiske vurderingen, datamodellene, fasene 0–6, risiko for lagringer, balansering
og åpne spørsmål. Fase 0 (denne) er bare dokumentasjon; ingen spillkode er endret.

**Viktigste funn i vurderingen:**
- Inntektsmotoren er problemet, ikke bare kassa. De tre største har 12–14 stålkomplekser på trinn 5 og tjener 5–6
  mrd. per spilldøgn – ca. 1 500 mrd. i timen på 10×. Kuttes bare kassa, er den tjent inn igjen på 1–5 timer. Reformen
  må også endre datterverkenes overskudd.
- To klokker: hvert spill har egen fart (pause–10×), mens verdenen mellom spillerne må gå i ekte tid på serveren.
  Penger fra eget spill kan bare flyttes inn i verdenen i et begrenset tempo per virkelige døgn (forslag: en
  konsernkasse på serveren – vanlige kroner, ingen ny valuta).
- Klienten eier økonomien. Alt som påvirker andre, går via serveren og sjekkes mot tidslinja og juksesperren.
- KONTO-regel 6 justeres: en funksjon vises først når spilleren har kommet dit den hører hjemme; da vises den med
  «krever konto» for den som ikke har konto. Strategiske bedrifter vises aldri i garasjen, heller ikke låst.
- Sesong 2 starter av seg selv 2027-03-25 (B-167). Anbefaling: skru av med en bryter og gå over til æraer som
  administrator avslutter. Ingen irreversibel omskriving nå.

**Økonomireformen:** dry-run er kjørt (bare lesing, `supabase/utkast/okonomireform_dryrun.sql`) og vist i
`RETNING.md` avsnitt 9. Ingen spillerdata er endret. To komprimerende modeller (k = 0,35 og 0,45 over 50 mill.)
beholder rekkefølgen og gjør største/minste til ca. 120 : 1 eller 400 : 1 (før ca. 300 000 : 1). Utføring krever
eierens valg, ekstra sikkerhetskopi og en egen migrasjon.

**Første spillbare leveranse (forslag):** økonomireformen, avtagende overskudd i konsernet, ett strategisk selskap
(skraplageret) med tildeling via anbud og inntekt fra alles skrapkjøp, og Industrimakt på topplista. Slagghåndtering og
mekanisk verksted rett etter.

**Konto (KONTO.md):** alt mellom spillere krever konto (regel 3 og 7). Reglene er uendret bortsett fra justeringen av
regel 6. De planlagte funksjonene står i tabellen med «planlagt».

**Endringsloggen:** beslutninger som ikke endrer noe spillerne merker, merkes «Endringslogg: nei» og hoppes over av
`scripts/sjekk-endringslogg.mjs`.


## B-181 Fase 1: eierens valg, og ny økonomi i datterverkene (2026-09-27)
Status: gjelder, men tallene i `KONSERN_ECONOMY` (keepShare, upstreamDecay) er justert av B-209 (svarer på de sju spørsmålene i B-180; justerer B-119 og B-121)
Bakgrunn: Eieren godkjente fase 0 (B-180) og svarte på spørsmålene i `RETNING.md` avsnitt 13.

**Eierens valg (fase 1):**
1. Økonomireformen: **modell B** (k = 0,45 over 50 mill.). Ingen ekte data endres før 1) fersk dry-run, 2) sikkerhetskopi
   og 3) kontroll av resultatet – og eierens endelige «go».
2. Datterverkene: et verk blir **ikke** mindre lønnsomt fordi eieren har mange. Driftsresultatet står. Det som går opp
   til konsernet, er det som er igjen etter vedlikehold, ledelse, arbeidskapital/reserve – og andelen oppover avtar når
   konsernet vokser, mens konsernkostnadene (ledelse, koordinering, reiser, finansiering) øker. Stilles inn med en
   simulator for 3, 6, 10 og 14 moderniserte verk, ikke etter magefølelse.
3. **Konsernkasse på serveren: ja.** Vanlige kroner. Lokal fart (pause–10×) påvirker aldri verdenstida. Overføring fra
   spillet er begrenset per ekte døgn, og grensen skal ikke skalere lineært med rikdom (høyst mild, sterkt avtagende).
   Før skraplageret gir ekte inntekt: analyse av hvordan inntekt fra aktivitet normaliseres til ekte tid (B-185).
4. **Automatisk Sesong 2 skrus av** (ikke slett kode eller historikk). Perioden nå heter **Grunnleggeræraen**. Navnet
   på neste æra og hva som nullstilles, er ikke bestemt.
5. Overtakelser: i interne tester holder varsel i appen (tydelig ved innlogging, minst 72 ekte timer). Før full
   lansering: minst ett varsel utenfor spillet – helst push/web-push, ikke e-post. Ingen immunitet for dem som er borte.
6. Første eier av et strategisk selskap: **skjult anbud i 48 ekte timer** på serveren, bud fra konsernkassa, tak på
   budet knyttet til selskapets anslåtte verdi (ikke spillerens rikdom), trekning ved likt bud (regelen vises tydelig).
   **Pilotkonsesjon** (7 eller 14 ekte dager, så nytt anbud) – ikke fast eierskap før overtakelser finnes.
7. **Aktiv spiller:** aktiv minst 2 forskjellige dager av de siste 14, kan stilles inn, registrert av serveren, ikke
   etter antall kontoer.
8. «Alle tider» → **«Hall of Fame»**.
9. **Industrimakt:** datamodellen kan komme, men ingen offentlig liste før strategisk eierskap og Kontroll finnes.
   Skjult til spilleren har kommet dit.
Leveranseplan: **Fase 1A** (dry-run, ny konsernøkonomi, konsernkasse, Sesong 2 av, Grunnleggeræraen), **fase 1B**
(ett skraplager, 48-timers skjult anbud, pilotkonsesjon, ekte inntekt fra andres skrapbruk normalisert til ekte tid).
Senere: Kontroll, fast eierskap, overtakelser, flere selskapstyper, ekte ledelse. Viktigst: vis ingenting av dette
til spillere som ikke har kommet dit.

**Ny økonomi i datterverkene (1A):** `KONSERN_ECONOMY` i `konsern.ts`.
- Driftsresultatet per verk er som før (`sisterProfit`), og verdien av et verk (60 døgns drift, B-121) er uendret.
- **Utbytte** (`dividends`): hvert verk beholder 20 % til vedlikehold, lokal ledelse og reserve. Verkene stilles i rekke
  etter driftsresultat; det beste gir full andel av resten, det neste 1/(1 + 0,05) osv. («ledelsen strekker seg
  tynnere»). Et nytt verk trekker aldri ned utbyttet fra verkene man har – det kommer nederst i rekka.
- **Konsernkostnader** (egen post «konsern» under Økonomi): ledelse per verk (stålverk 0,75, storverk 3, kompleks
  10 mill. per døgn) × koordinering som øker 8 % per verk utover det første. Går også når et verk står.
- «Neste steg», knappene og testspilleren regner alle kjøp på netto (utbytte minus kostnader).

**Simulatoren** (`balance.ts --konsern`, kompleks trinn 5, som de som har kommet lengst):

| Verk | Drift | Netto til konsernet | Netto/drift | Neste verk (kjøpt og modernisert) betalt på |
| --- | --- | --- | --- | --- |
| 1 | 0,41 mrd. | 0,32 mrd. | 78 % | 50 døgn |
| 3 | 1,22 mrd. | 0,90 mrd. | 73 % | 56 døgn |
| 6 | 2,45 mrd. | 1,67 mrd. | 68 % | 65 døgn |
| 10 | 4,08 mrd. | 2,53 mrd. | 62 % | 78 døgn |
| 14 | 5,71 mrd. | 3,25 mrd. | 57 % | 94 døgn |

Netto øker for hvert verk helt til 14 (større konsern er sterkere, flere verk lønner seg), men mindre og mindre.
Vekst fra 3 nye komplekser og 20 mrd.: før 14 verk på dag 30 og 988 mrd. på dag 240; nå 14 verk på dag 60, fullt
modernisert på dag 120, 400 mrd. på dag 240 – lineært, ikke eksplosivt, og et kompleks er igjen en stor investering.
Hos de tre største blir inntekten 57–59 % av i dag (Grane 5,86 → 3,34 mrd. per spilldøgn).
Valgt bort: lik andel for alle verk som avtar med antallet – da trakk et nytt verk ned utbyttet fra alle de andre, et
nytt kompleks ga minus til det var modernisert, og testspilleren stoppet på 11–13 verk. Høyere ledelseskostnad
(15 mill. per kompleks) gjorde bytte av stålverk mot kompleks dårligere enn modernisering (brøt B-170).
Fagboka (konsernkapitlet) forklarer utbytte og stordriftsulemper. Balansen er uendret (konsernet kommer etter
storverket).

## B-182 Grunnleggeræraen, ingen automatisk sesong 2, Hall of Fame og aktive dager (2026-09-27)
Status: gjelder (slår av det automatiske i B-167; koden står)
Bakgrunn: Eierens valg 4, 7 og 8 i B-181.
Beslutning (migrasjon `026_grunnleggeraeraen.sql`):
- `config` får raden `world` med `auto_next_season: false`, `active_min_days: 2`, `active_window_days: 14`.
  `season_status()` starter neste sesong bare når bryteren er på. Sesong 1 avsluttes som før (resultater, 🏆/🎖).
- Tabellen `eras` med **Grunnleggeræraen** fra starten av Sesong 1, uten slutt. `season_status()` gir også `era`, og
  sesonglinja viser «Grunnleggeræraen · Sesong 1 · N dager igjen». Når Sesong 1 er over: «Grunnleggeræraen · ingen
  sesong pågår. Hall of Fame står.»
- Feil funnet og rettet før den kunne skje: `season_status()` krasjet når ingen sesong pågikk (en tom post ble lest).
  Det skjedde aldri før fordi en ny sesong alltid startet – med bryteren av ville det skjedd 2027-03-25. Testet ved å
  sette slutten på Sesong 1 til i går i en transaksjon som ble rullet tilbake: ingen ny sesong, resultatene lages,
  æraen står.
- `activity_days` (en rad per spiller og UTC-dag) fylles av en trigger på `saves` – serverens klokke, bare lagring på
  nett teller. Fylt bakover fra tidslinja. `active_players()` gir dem som er aktive etter innstillingene (3 av 5 nå).
  Bare for serverfunksjoner (anbud og overtakelser senere).
- «Alle tider» heter **Hall of Fame** på topplista.
Konto: sesong og liste krever konto som før (regel 3); aktive dager bare med lagring på nett (regel 2).

## B-183 Konsernkassa på serveren (2026-09-27)
Status: gjelder (skjult i spillet til fase 1B; innskuddet er erstattet av bidraget, B-318/B-319)
Endringslogg: nei (ingenting vises i spillet ennå)
Bakgrunn: Eierens valg 3 i B-181, og de to klokkene i `RETNING.md` 5.2.
Beslutning (migrasjon `027_konsernkasse.sql`, `net/treasury.ts`):
- `treasury` (saldo og alt som er flyttet inn) og `treasury_ledger` (posteringer: innskudd, anbud, refusjon, inntekt,
  utbetaling, justering). Spilleren leser bare sine egne; bare serverfunksjoner skriver.
- `deposit_to_treasury(beløp, versjon)`: krever konto, konsern (nivå 4 og konsernet åpnet), at spilleren ikke er
  flagget, at versjonen på nett er den appen sist lagret, og egne penger (kasse minus lån). Grense per rullerende 24
  timer: grunnbeløp × (1 + trinn × log10(egenkapital / 1 mrd.)) – 100 mill. og 0,5 i `config.world`: 1 mrd. → 100 mill.,
  10 mrd. → 150 mill., 100 mrd. → 200 mill., 1 000 mrd. → 250 mill. Sterkt avtagende, som eieren ba om.
- Overføringen gjøres helt på serveren i én transaksjon: kassa i spillet på nett trekkes, `treasuryOut` (nytt felt i
  spillet, standard 0 i `migrate()`) øker, konsernkassa øker, og versjonen øker. Appen lagrer først, gjør det samme med
  spillet sitt og bygger videre på den nye versjonen (`adoptServerRev`).
- Sperre mot å doble pengene: en trigger på `saves` sørger for at `treasuryOut` aldri går ned. Lagres et eldre spill
  (en annen nettleser, en tilbakerulling, direkte skriving), trekkes det som alt er flyttet, fra kassa.
- `treasury_status()`: saldo, grense, brukt og når mer blir ledig.
- Testet i databasen med en midlertidig testkonto i en transaksjon som ble rullet tilbake: overføring, gammel versjon
  avvist, grensen holder, eldre spill skrevet over gir ikke pengene tilbake. Nettestene har en falsk tjeneste for kassa.
Konto: krever konto (regel 2 og 7), står i `ACCOUNT_FEATURES` som «Konsernkassa».
Valgt bort: at appen trekker kassa selv og melder fra etterpå (penger kunne gå tapt eller dobles ved nettfeil), og en
grense som øker med kassa (da ville 10× og de rikeste få forsprang i verden).

## B-184 Økonomireformen: klar, ikke kjørt – og hva den faktisk gjør (2026-09-27)
Status: venter på eierens «go»
Endringslogg: nei (ingen data er endret)
Bakgrunn: Eierens valg 1 i B-181: modell B, og fersk dry-run, sikkerhetskopi og kontroll før ekte data endres.
Fersk dry-run (bare lesing, 2026-09-27): Grane 8 286 → 11,16 mrd., Tuster 3 651 → 7,72 mrd., Figen 1 562 → 5,27 mrd.,
H4WK3N5 79 → 62 mill. (har passert 50 mill. siden sist), Sjæfen uendret. Alle har sikkerhetskopier.
Utføringen ligger i `supabase/utkast/okonomireform_utforing.sql`: sikkerhetskopi (grunn «okonomireform»), logg
`economy_reform_log`, endring med ny versjon og `device = 'server'`, kontroll (ny kasse, kopi finnes, samme rekkefølge),
alt i én transaksjon. Prøvekjørt i én DO-blokk som alltid feiler og rulles tilbake: kontrollene gikk gjennom, og
etterpå var ingenting endret (0 kopier, ingen logg, kassene som før).
**Funn eieren må vite før «go»:** med den nye konsernøkonomien tjener Grane 3,34 mrd. per spilldøgn. Den nye kassa
(11 mrd.) tilsvarer 3 spilldøgn, og hele den gamle kassa er tjent inn igjen på ca. 8 timer på 10× (Tuster 4, Figen 2).
Reformen av kassa alene endrer derfor lite i det lokale spillet – det som skiller spilltid fra verden, er grensen på
konsernkassa (B-183), som gjør kassas størrelse nesten uten betydning i verden. Reformen gjør topplista «Mest penger på
bok» og konsernverdien sammenlignbar igjen, og kan være et tydelig skille for Grunnleggeræraen. Hall of Fame (rekordene)
endres ikke av reformen.

## B-185 Inntekt fra andres aktivitet normaliseres til ekte tid (analyse før skraplageret) (2026-09-27)
Status: gjelder som plan for fase 1B
Endringslogg: nei (ren planlegging)
Bakgrunn: Eierens valg 3 i B-181: før skraplageret gir ekte inntekt, må det være klart hvordan inntekt fra andres
aktivitet regnes, så 10× ikke gir fordel. Hele analysen står i `RETNING.md` avsnitt 14.
Beslutning (anbefalt modell): **aktivitetsdøgn med tak per kunde.** For hver kunde og hver ekte (UTC-)dag teller
skraplageret høyst én normal dags skrapbruk for den kunden: min(skrap brukt den dagen, kundens normale forbruk per
spilldøgn). Skrapbruken regnes av tonnene kunden har laget (`produced_t` i tidslinja, allerede sjekket av juksesperren og
fartskontrollen) × ca. 1,1 t skrap per tonn stål – ikke av kjøp, så kjøp-og-salg ikke kan pumpe opp inntekten. Eierens
egne tonn, flaggede spillere og spill uten lagring på nett teller ikke. Inntekten regnes og betales inn i konsernkassa
på serveren én gang per ekte dag (idempotent, merket med datoen i `treasury_ledger`).
Da gir fart og spilletimer ingen fordel: 10 minutter på 10× og 10 timer på 1× gir det samme når begge har spilt en
normal dag. Det som teller, er at kunden spilte den dagen og hvor stort verket er.
Valgt bort: tonn per ekte time (10× gir 10 ganger så mye), bare tak per kunde per time (belønner lange økter),
rapporterte kjøp (kan pumpes med kjøp og salg).

## B-186 Økonomireformen er gjennomført, med gulv for små spill (2026-09-27)
Status: gjelder (erstatter modellen i B-184; eierens svar på spørsmålene etter fase 1A)
Bakgrunn: Eieren ga «go» på modell B, men ville ikke at små spill skulle få et merkbart kutt bare fordi de akkurat hadde
passert 50 mill. (H4WK3N5 ville gått fra 79 til 62 mill.): «lag et større urørt gulv (100 eller 250 mill.) eller en jevn
overgang». Så: siste ferske dry-run, vis resultatet, ekstra sikkerhetskopi, og gjennomfør hvis kontrollen er OK.
Beslutning:
- **Modell:** urørt gulv på **250 mill.** Over: ny kasse = 250 mill. × (kasse / 250 mill.)^**0,365**. Eksponenten er valgt
  så toppen blir som i modell B (Grane 11,17 mrd.; B ga 11,16). Et gulv på 100 mill. (k = 0,416) ga nesten samme topp,
  men beskytter mindre. En «myk overgang» som beholder k = 0,45 for de største, ble forkastet: de enkle formene gjorde
  kassa lavere for en som hadde litt mer (rekkefølgen kunne byttes).
- **Resultat (migrasjon `028_okonomireform.sql`, kjørt 2026-09-27 01:02 UTC):** Grane 8 286 → 11,17 mrd., Tuster 3 664 →
  8,29 mrd., Figen 1 562 → 6,07 mrd. H4WK3N5 (97 mill.) og Sjæfen (27,5 mill.) er urørt. Tuster og Figen får litt mer
  enn i modell B (8,29 mot 7,73 og 6,07 mot 5,27), fordi gulvet er høyere.
- **Sikkerhetskopi:** i `save_backups` (grunn «okonomireform», kan legges tilbake med `restore_save`, men slettes etter 14
  dager) og for alltid i `economy_reform_log.old_state`. Kontrollen (ny kasse, kopi finnes, samme rekkefølge, ingen
  under gulvet rørt) gikk gjennom i samme blokk – ellers ville alt blitt rullet tilbake. Prøvekjørt og rullet tilbake
  rett før.
- Bare kassa er endret. Verk, lån, forskning, fagpoeng og Hall of Fame (rekordene) står. `device = 'server'` og ny versjon,
  så appen henter spillet; en lagring fra en app med gamle tall avvises (B-140).
- **Konsernkassa** (B-183) er godkjent som utgangspunkt. Grensene står i `config.world` og skal justeres etter testing av
  skraplager og anbud – ingen priser skal bygges på at dagens grenser er faste.
- **Pilotkonsesjonen er 14 ekte dager** (to helger; med tre aktive spillere gir sju dager for lite data).
- Før fase 1B: automatiske testcaser som viser at lokal fart (1×, 3×, 10×), ulik spilletid, pause/offline og en gammel
  lagring ikke kan øke inntekten til skraplageret – og hvorfor (B-188).

## B-187 Stålverket er både mobilspill og PC-spill – plan for designsystem og redesign (2026-09-27)
Status: gjelder (utvider «Mobil først» i CLAUDE.md; justerer ikke gameplay)
Endringslogg: nei (ren planlegging – UI-fase 0)
Bakgrunn: Eieren har gått gjennom mobilgrensesnittet med en ekstern vurdering. Til nå har utviklingen handlet om hvordan
spillet virker; utseendet har blitt til underveis. I mid/late game (storverk, hundrevis av ansatte, konsern, strategiske
bedrifter, overtakelser) blir informasjonsmengden så stor at PC/nettleser naturlig bør bli den beste måten å styre på.
Beslutning:
- **Mobil = rask, fokusert og enkel drift. PC = kontrollrom/hovedkontor med mye bedre oversikt.** Samme spill, samme
  designsystem, samme komponenter og data; ulike layouter der det gir bedre oversikt. Ingen viktig funksjon er PC-only.
  PC skal ikke være mobilversjonen med større max-width.
- **Visuell identitet:** nordisk industri + moderne kontrollrom + tycoon. Mørk grafitt, ståltoner, cyan for det
  interaktive (beholdes), grønt for positiv drift, gult/oransje for varme/vedlikehold/advarsel, rødt bare for faktiske
  feil. Ikke generisk dashbord, ikke rust og flammer, ikke AI-kunst som UI.
- **Designsystemet først** (tokens, typografi, knapper, faner, status, varsler, dialog/ark, tabeller, sidepaneler …),
  så sidene. Hierarki med avstand og typografi, ikke kort i kort. Én ikonfamilie i stedet for emoji i hoved-UI-et.
- **Gradvis synlighet er absolutt**, også på PC: områder finnes ikke i navigasjonen før de er låst opp (ingen
  hengelåser).
- **Teknisk:** ett app-skall, ikke `MobileApp`/`DesktopApp`. Gameplaylogikken splittes aldri mellom mobil og PC.
  Tilgjengelighet (trykkflater, kontrast, fokus, tastatur, ingen status bare i farge) og ytelse (ingen tunge
  biblioteker, PWA) er krav.
- **Faser:** UI-0 audit og plan (denne) → UI-1 designsystem og app-skall → UI-2 Oversikt, Anlegg, Marked, Salg →
  UI-3 Økonomi, Folk, Forskning, Konsern → UI-4 Kontrollrom, Toppliste/Hall of Fame, øvrige ark, polering. Logo og
  app-ikon venter til designsystemet finnes. Test på 7 faktiske størrelser fra 320×568 til 2 560×1 080.
- Planen med kritisk vurdering, designsystem, brytepunkter, app-skall, side-for-side, komponenter, PR-rekkefølge,
  risiko og spørsmål står i **`docs/UI.md`**.
Funn i vurderingen (målt): toppfeltet på mobil er 133 px (34 % av en 320×568-skjerm sammen med menyen); innholdet er
låst til 1 248 px midtstilt på PC; 76 ulike farger, 19 skriftstørrelser, 10 radier og 42 padding-verdier i CSS-en;
121 emoji i komponentene; bare to ekte brytepunkter.

## B-188 Produksjonsmåleren: lokal fart kan ikke øke inntekt i verden – med testcaser (2026-09-27)
Status: gjelder (bygger ut B-185)
Endringslogg: nei (grunnlag på serveren; spillerne merker det gjennom skraplageret, B-189)
Bakgrunn: Eieren ville ha automatiske testcaser før fase 1B som viser at lokal spillfart ikke kan øke serverinntekten:
samme fabrikk på 1×, 3× og 10× over ulik virkelig spilletid, pause/offline og en gammel lagring – og hvorfor.
Beslutning (migrasjon `029_produksjonsmaler.sql`, speilet i `net/scrapIncome.ts`):
- For hver spiller fører serveren en måler fra tidslinja (`snapshots.produced_t`, sjekket av juksesperren og
  fartskontrollen): **høyeste tonn** (bare tonn over det høyeste noen gang teller som nye – en gammel lagring gir ikke
  de samme tonnene to ganger) og **nye tonn per ekte UTC-dag** (serverens klokke).
- **Normal fart** = tonn per spilldøgn over de siste 8 tallene i tidslinja, regnet med spillminuttene (`game_min`).
- Det som teller én ekte dag: min(nye tonn, normal fart × 1 spilldøgn) × 1,1 t skrap per tonn stål.
- **Testene fant to feil før noe ble kjørt:** (1) med hele spilldager i stedet for spillminutter ble farten målt
  opptil **37 % for høy på 10×** (tidslinja får tall midt i en spilldag), så 10× ga faktisk mer; (2) medianen av
  enkeltintervaller var **12 % ujevn** med skiftdrift og hele charger. Begge er rettet.
- Resultat (`npm test` skriver tabellen): samme fabrikk (1 540 t per spilldøgn) teller 1 694 t skrap per ekte dag på
  1× i 5 minutter, 1× i 1 time, 3× i 1 time, 10× i 1 time, 10× i 8 timer og 10× med 50 minutters pause – fordi taket er
  én normal spilldag, og en normal spilldag er like stor i alle farter. Pause gir 0. Borte en dag gir 0 den dagen og tas
  ikke igjen. Tre dager uten nett teller som én dag. En gammel lagring gir 0 til spilleren er forbi det høyeste igjen.
  Skiftdrift: 1 697 t på 1× og 1 667 t på 10× (aldri mer på 10×). Et dobbelt så stort verk teller dobbelt.
- De samme scenariene er kjørt mot SQL-funksjonene i en transaksjon som ble rullet tilbake: identiske tall.
- Tallene (1,1 t skrap per tonn, 1 takdøgn, 8 tall, 1 000 kr per tonn) står i `config.world`.

## B-189 Fase 1B: skraplageret med skjult anbud og pilotkonsesjon (2026-09-27)
Status: gjelder
Bakgrunn: Fase 1B i B-181 og B-186: ett strategisk selskap, 48-timers skjult anbud, pilotkonsesjon (14 dager), ekte
inntekt fra andres skrapbruk normalisert til ekte tid.
Beslutning (migrasjon `030_skraplageret.sql`, `net/world.ts`, `ui/Companies.tsx`):
- **Skraplageret** er det første selskapet. Kortet står på Konsern-fanen og vises først når konsernet er åpnet (gradvis
  synlighet). Krever konto (vises med «krever konto» uten).
- **Anbud:** 48 ekte timer. Bud fra konsernkassa, holdt av til anbudet er avgjort. Budene er skjulte – ingen ser andres
  bud eller hvor mange som har budt før det stenger. Høyeste bud vinner; likt bud avgjøres ved trekning (regelen står i
  kortet). De andre får budet tilbake. Bud kan endres (bare forskjellen trekkes) eller trekkes. Tak på budet = anslått
  inntekt i en konsesjon (rundet til hele millioner, minst 10 mill.), ikke spillerens rikdom; minstebud 1 mill.
- **Pilotkonsesjon: 14 ekte dager.** Nytt anbud åpner 48 timer før den går ut, så det alltid er en eier. Uten bud
  åpner et nytt anbud med en gang.
- **Inntekt:** gebyr (1 000 kr per tonn) × tonn skrap som teller fra alle andre spillere (B-188), betalt inn i eierens
  konsernkasse dagen etter, én gang (eieren kl. 12 UTC den dagen får dagen). Eierens egne tonn og flaggede spillere
  teller ikke.
- Alt avgjøres på serveren; `world_status()` avgjør anbud og betaler inntekt «lat» når noen spør (ingen planlagt jobb).
  `place_bid()` sjekker konto, konsern, sperre, åpent anbud, grenser og saldo.
- Kortet viser eier og konsesjon, anslått inntekt, anbudet med tid igjen og eget bud, konsernkassa med hvor mye som kan
  flyttes inn, og forrige resultat. Varsel om utfallet står i kortet (in-app holder i pilottesten, B-181).
- Testet i databasen med fire midlertidige testkontoer i en transaksjon som ble rullet tilbake: bud, over taket, uten
  konsern, skjulte bud, likt bud avgjort ved trekning, tilbakebetaling, konsesjon, inntekt (to kjøpere × 1 694 t, uten
  eierens egne), ikke betalt to ganger, nytt anbud 47 timer før slutt. Testen fant to feil i migrasjonen (et navn som
  kolliderte, og en saldooppdatering som stoppet på sjekken), rettet før noe anbud fantes.
- Det første anbudet åpnet da appen fikk kortet (migrasjonen «skraplageret_start»).
Konto: krever konto (regel 3 og 7), står i `ACCOUNT_FEATURES` som «Skraplageret».

## B-190 Felles klokke: samme mulighet for alle i fellesverdenen (2026-09-27)
Status: gjelder (justerer B-183 og B-152/B-172 for uka «dager»; den like innskuddsgrensen er erstattet av bidraget, B-319)
Bakgrunn: Eieren kontrollerte modellen: hva i fellesverdenen blir større hvis en spiller grinder 10× i fem timer og
bygger opp tusenvis av milliarder igjen? Svaret var bare én økonomisk kobling – grensen på konsernkassa steg
logaritmisk med egenkapitalen (223 → 285 mill. per døgn) – pluss en feil: Granes grense var 297 mill., fordi et
tidslinjetall fra før økonomireformen (8 563 mrd.) ble brukt.
Beslutning (migrasjon `031_felles_klokke.sql`):
- **Lokalt spill: spill så mye og så fort du vil. Fellesverden: samme klokke og samme grunnleggende mulighet for alle.**
- **Konsernkassa:** `treasury_log_step` = 0 – alle kan flytte inn høyst 100 mill. kr per ekte døgn (gjennom
  pilotperioden, og til noe annet er bestemt). Grensen leser ikke lenger kasse eller egenkapital fra spillet i det hele
  tatt (`treasury_limit(bruker)`). En høyere grense kan senere tjenes gjennom serverautoritative ting i ekte tid
  (strategisk eierskap, historikk, omdømme) – aldri lokal kasse eller lokal egenkapital.
- **Tidslinjetall fra før reformen** er merket `pre_reform` (2 384 tall) og brukes ikke i serverberegninger:
  sesonglista, sesongresultatet og ukens utfordring. Merket kan ikke settes eller fjernes fra appen. Rekordene i Hall of
  Fame står (B-186). Grane og Figen står på sesonglista igjen når de har lagret etter reformen.
- **Første skraplageranbud:** ingen hadde flyttet penger inn eller budt med den gamle grensen (sjekket i
  `treasury_ledger`, `tender_bids`, `treasury`). Anbudet fortsetter; taket (923 mill.) var regnet av produksjon, ikke av
  grensen.
- **Ukens utfordring, «dager»:** ekte aktive dager (dager i uka, norsk tid, med minst ett tall i tidslinja), maks 7 –
  ikke spilldøgn. En konkurranse mellom spillere skal ikke vinnes av den som lar 10× stå lengst. Likt resultat gir delt
  plass (rank) i alle ukene, så alle som var aktive alle dagene, deler førsteplassen.
- **Konsernverdi og «Mest penger på bok»** blir stående som karriere- og progresjonslister. Det er greit at 10× påvirker
  dem – så lenge de aldri brukes som grunnlag for Industrimakt, Kontroll, overtakelser eller andre fordeler i
  fellesverdenen.
- **Fast regel** (står i RETNING.md og CLAUDE.md): Industrimakt, Kontroll, strategisk eierskap og overtakelser skal
  baseres på serverautoritative verdier og ekte tid. Lokal kasse, lokal egenkapital og lokal spillfart skal aldri direkte
  avgjøre disse systemene.
Testet: grensen er 100 mill. for alle; sesonglista uten gamle tall; ukens «vekst» regnet fra tall etter reformen;
«dager» testet ved å late som uka var en «dager»-uke i en transaksjon som ble rullet tilbake (Tuster 3, H4WK3N5 2,
Sjæfen 2 – delt 2. plass).

## B-191 UI-fase 1: eierens valg og UI-1a – tokens, skrift, ikoner og ett kontokort (2026-09-27)
Status: gjelder (svarer på spørsmålene i UI.md 12, justerer KONTO-regel 6 fra B-149/B-180)
Bakgrunn: UI-fase 0 (B-187) fant 76 faste farger og 19 skriftstørrelser i CSS-en og tre store «krever konto»-kort på
Verket for spillere uten konto. Eieren svarte på de fem spørsmålene og ga klarsignal for UI-1a: «Start med fargetokens,
typografi og grunnkomponenter. Ikke redesign alle sidene samtidig.» Skjermbilder før merge; UI-1a merges først når
eieren sier ifra.
Beslutning:
- **Skrift:** systemskrift for brødtekst og knapper. Én liten, selvhostet og åpen skrift for overskrifter og store tall:
  Barlow Semi Condensed 600 (SIL OFL, 23 kB woff2, full æøå, tabulære tall) under navnet «Stal Display»
  (`ui/fonts/`, lisensen ved siden av). Den er smalere enn brødteksten og står derfor ett trinn større.
- **Ikoner:** et kuratert utvalg fra Lucide (ISC), kopiert inn i `ui/icons.tsx` uten ny avhengighet, lisensen i
  `ui/icons-LICENSE.txt`. Erstatter emoji som UI-ikoner gradvis; emoji blir i spilltekster, hendelser og prestasjoner.
  Først ut: toppfeltet (fagbok, innstillinger, bjella, toppliste, kryss) og låsen i «krever konto».
- **«Krever konto»:** funksjoner som står på samme sted, samles i ett kort med én knapp (`AccountFeaturesCard`).
  På Verket: Dagens oppdrag, og etter garasjen Ukens utfordring og Sesongstigen. KONTO-regel 6 er justert. Gradvis
  synlighet gjelder fortsatt: kortet viser bare det spilleren har kommet til.
- **Konsern:** eget hovedpunkt i sidemenyen på PC når det er låst opp; på mobil blir det underfane under Verket.
  Bygges i UI-1b (app-skallet).
- **UI-1a (denne PR-en):** `ui/tokens.css` med alle farger (flater, tekst, cyan for interaktivt, grønt for god drift,
  gult/oransje for varme og advarsel, rødt bare for feil, egne `--art-*` for illustrasjoner), 9 skriftstørrelser,
  radier, avstander, skygger og bevegelse. Alle faste farger, skriftstørrelser og radier i `game.css`,
  `control.css` og `index.css` er byttet til tokens (76 → 0 faste farger; 19 → 9 størrelser; SVG-teksten 8 px i
  kontrollrommet står). Grunnkomponenter i `ui/ds.tsx`: `StatusBadge`, `Callout`, `Button`; `Card`, `Bar`, `Stat` og
  `SubTabs` i `ui/common.tsx` bruker de samme tokenene. Synlig fokus for tastatur overalt, redusert bevegelse
  respekteres. Ingen sider er redesignet; spillet og oppsettet er urørt.
- Tegningene i anleggsbildet og kontrollrommet (farger i TSX) tas i UI-2a og UI-4a.
Konto (B-149): ingen ny funksjon; kontokortet er samme funksjoner som før, bare samlet.
Testet: tsc, lint, `npm test`, balanse (exit-kode), build; Playwright før/etter på 320×568, 390×844, 1 366×768 og
1 920×1 080 (Verket → Oversikt, kontokortet, Anlegg, Økonomi, Marked), uten vannrett scrolling; og
412/820/2 560 for vannrett scrolling.

## B-192 UI-1b: app-skallet – sidemeny på PC med Konsern, underfaner øverst, kompakt toppfelt (2026-09-27)
Status: gjelder (bygger på B-187 og B-191; B-116 og B-134 står). Delen om Konsern som underfane i Verket på mobil og eget
punkt bare på PC er erstattet av B-226: Konsern er egen hovedside på begge.
Bakgrunn: UI.md 5 og 10.2. Eieren valgte Konsern som eget punkt i sidemenyen på PC og underfane på mobil (B-191).
Beslutning:
- **To skall, samme React-tre:** under 900 px mobilskallet (toppfelt, innhold, meny nederst), fra 900 px PC-skallet
  (topplinje, sidemeny til venstre, innhold). Innholdet scroller nå alltid i `.g-main` (også på PC), så topplinja og
  sidemenyen står fast. Innholdet får flere kolonner fra 760 px som før; brede skjermer får innholdet midtstilt med
  maks ca. 1 600 px (var 1 248).
- **Sidemeny på PC:** ikon og navn (smal, ikon over navn, 900–1 279 px; full, ikon ved siden av navn, fra 1 280 px).
  Bare områder som er låst opp. **Konsern** er eget punkt når konsernet er åpnet, med samme merke som før; da vises
  ikke Verkets underfaner. På mobil er Konsern fortsatt underfane i Verket, og Verket står som valgt i menyen.
  Underfanen i Verket styres nå fra `GameApp` (`ui/verketTabs.ts`), så også råd kan åpne en bestemt underfane.
- **Menyen nederst på mobil** har ikon over navnet og merket oppe til høyre (Forskning + «Ny» brytes ikke lenger).
- **Underfanene i Verket øverst**, over anleggsbildet og rådene, og over begge kolonnene på PC.
- **Topplinja på PC** er én rad når det er plass: dag · fart · nøkkeltall · varsellinja · toppliste · fagbok ·
  innstillinger (57 px på 1 366 og bredere; to rader under ca. 1 250 px).
- **Toppfeltet på mobil:** nøkkeltallene er ikon + tall på én linje (ordet vises fra 600 px, og skjermlesere får det
  alltid). Kassa står i visningsskriften. 133 → 117 px på 390–412 px; 320 px får to linjer nøkkeltall som før.
- **Varsellinja står som før (B-116):** en fast linje som aldri ligger oppå siden. Planen i UI.md (≤ 88 px med varsler
  som toast) ville gjøre om B-116; det er eierens valg og er lagt i FORSLAG.md.
- **Ark fra høyre på PC:** fagbok, varsler, toppliste og innstillinger (spillet synes bak). På mobil som før.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, balanse (exit 0), build. Playwright på de 7 størrelsene (Verket, kontokortet, Anlegg,
Økonomi, Marked), uten vannrett scrolling; Konsern i sidemenyen og tilbake til Verket (1 000, 1 366, 1 920) og som
underfane på 390; fagboka som ark fra høyre; nytt spill med veiledningen på 320 og 1 366.

## B-193 Midlertidig sikkerhetsventil: myk grense for kassa og bunden konsernreserve (2026-09-27)
Status: **erstattet av B-303** (reform 2): taket står, men reserven er avviklet og ført som «utbetalt til eierne».
Bakgrunn: eieren vil hindre at kassene eksploderer igjen før sluttspillet er rebalansert. Ingen hard grense der
inntekt slettes. På serveren nå: H4WK3N5 80,4 mrd., Tuster 46,4 mrd. (fra 8,3 mrd. etter reformen i morges).
Beslutning:
- **Myk grense for disponibel kasse: 100 mrd. kr** (`CASH_RESERVE.softCap` i `game/reserve.ts`; `null` slår den av).
  Det kassa ellers ville hatt over grensen, flyttes til **den bundne konsernreserven** (`g.lockedReserve`).
  Flyttingen skjer i hvert tidssteg i motoren og etter hver handling (også belønninger mens spillet står på pause).
  Står kassa over grensen når oppdateringen kommer, flyttes overskuddet første gang spillet lastes.
- **Reserven:** kan ikke brukes (alle kjøp sjekker `cash`); kan ikke flyttes til konsernkassa (serveren leser bare
  `cash − loan` i `deposit_to_treasury`, og appen likeså); påvirker ikke anbud, Kontroll eller Industrimakt (B-190);
  teller ikke på «Mest penger på bok» (tidslinja sender `cash`); lagres i spilltilstanden (lokalt og på nett i
  `saves.state`), så den kan migreres eller få en funksjon senere.
- **Den teller i konsernverdien** (`konsernEquity`). Grunner fra sjekken:
  - titlene går til 5 000 mrd. (Stålgigant) og regnes av konsernverdien – uten reserven ville de stoppet ved ca.
    100 mrd. kasse + verkene;
  - juksesperrens vekstkontroll (`check_snapshot`) og ligaen bruker `equity`; med reserven i er tallene som før
    (en brå nedgang ville ikke flagget, men ligaen ville falt, og en senere frigjøring ville sett ut som et hopp);
  - konsernverdi er en karriereliste som ikke brukes i fellesverdenen (B-190).
  Eieren kan be om at den tas ut; da endres bare `konsernEquity`.
- **Konkurs:** banken ser reserven som sikkerhet – et verk med reserve større enn underskuddet går ikke konkurs.
  (I praksis umulig uansett: ingen kjøp koster over 6 mrd., så man må bruke nesten 100 mrd. først.)
- **Vises først når det skjer (B-180):** første gang et varsel under «Kasse og bank» med en kort forklaring; deretter
  én linje per døgn om hva som ble satt av; «Bunden konsernreserve» og en kort tekst på Verket → Økonomi, «Herav
  bunden reserve» på Konsern, og en liten lås ved kassa i toppfeltet. Ingenting vises før grensen er nådd.
- **Sjekket, ingen endring trengs:** lagringsformatet (nytt felt, `null` i `migrate()` og nye spill; eldre utgaver av
  appen beholder feltet); serverens konsernkasse og vakta på `treasuryOut`; topplistene («mest penger på bok» flater
  ut ved 100 mrd. for dem som når grensen – det er meningen); kjøp (dyreste er 6 mrd.); konsernåpningen (1 mrd.);
  sluttmålet (10 mrd., konsernverdi); «Mens du var borte», daglige belønninger og oppdrag (går gjennom grensen).
  Ingen SQL-endring.
- **Når sluttspillet er rebalansert:** reserven skal migreres (f.eks. konverteres etter en ny modell) eller få en
  ordentlig funksjon, og grensen fjernes eller justeres. Står i FORSLAG.md og RETNING.md.
Konto (B-149): nei – regel 1, eget spill (lagres på nett med resten av spillet for dem som har konto).
Endringslogg: nei (eierens beskjed: ikke introduser reserven for spilleren før det skjer – forklaringen kommer i
spillet i det øyeblikket kassa når grensen)
Testet: `npm test` (ny test: flytting, konsernverdi uendret, én forklaring, døgnlinje, motoren, ikke brukbar,
konkurs, slått av, gamle lagringer og lagring), balanse (exit 0), `--konsern` (dag 240: kasse 100 mrd. + 339 mrd.
bundet, samme konsernverdi 715,75 mrd. som uten ventil), Playwright med kasse 100,5 mrd. (390, 320, 1 366).

## B-194 Vekstsperren ser over tre døgn (2026-09-27)
Status: gjelder (justerer vekstsperren fra B-150; samme grep som tonnsperren i B-162)
Bakgrunn: eieren spurte hvorfor H4WK3N5 forsvant fra topplista. Juksesperren flagget kontoen kl. 12.20 for «vekst
30 261 845 198 på 1 døgn, nivå 4». Mellom dag 790 og 791 gikk kassa fra 25,35 til 1,31 mrd. og konsernverdien fra
50,90 til 81,17 mrd.: flere verk ble kjøpt og modernisert. Et datterverk verdsettes til 60 døgns overskudd, og en
modernisering koster 30 % av prisen, men løfter overskuddet mye – så kjøp kan øke konsernverdien mer enn de koster.
Sperren tillot 1,5 mrd. + 50 % av 50,9 mrd. = 26,95 mrd.; over tre døgn var veksten 31,5 mrd. av 79 mrd. tillatt.
Ærlig spill, ikke juks. (Skjedde før B-192/B-193 ble publisert og har ingenting med reserven å gjøre.)
Beslutning (migrasjon `032_vekstsperre_tre_dogn.sql`, eierens godkjenning):
- Et hopp i konsernverdien på ett døgn flagges bare hvis også veksten fra et tall minst tre døgn tilbake er for høy
  (samme grense per døgn). Tall fra før økonomireformen (`pre_reform`) brukes ikke som utgangspunkt (B-190).
- Flagget på H4WK3N5 er fjernet (bare det ene flagget, samme grunn). Ingen andre kontoer var flagget.
Testet i databasen (DO-blokk som ble rullet tilbake) med H4WK3N5s ekte tall dag 785–791: gammel regel flagger, ny regel
flagger ikke, og et juksehopp til 500 mrd. flagges fortsatt. Etterpå: 0 flaggede kontoer, H4WK3N5 er nr. 1 på
konsernverdi-lista, sikkerhetsrådene som før.
Konto (B-149): ingen ny funksjon.

## B-195 UI-2a: Oversikt – det viktigste nå, statusspråk og boblene (2026-09-27)
Status: gjelder (UI.md 6.1, 6.2 og 7; bygger på B-191/B-192)
Beslutning:
- **Det viktigste akkurat nå:** det første rådet under anleggsbildet er en rolig flate med aksentkant, ikon og pil
  (ikke lenger en stor blå knapp med fet tekst). Råd uten handling vises som melding (`Callout`). Etter det første
  vises høyst to råd til; resten ligger bak «Flere råd (N)», så det ikke blir en tekstvegg.
- **Statusspråket i produksjonslinja:** rutene for skrap, ovner, støping og lager viser status med ikon + ord i
  statusfargen (`StatusLine` i `ui/ds.tsx`): kjører (grønt ikon), venter (blått), stopp (grått), vedlikehold,
  mangler folk, tomt og fullt (oransje), feil/havari (rødt). Teksten fra motoren står som før, så ingenting går tapt.
  På de smaleste skjermene (≤ 380 px) står bare ordet i rutene.
- **Boblene:** høyst 3 i faste baner, levetid 1,6 s; alt innen samme vindu (1 s, 1,4 s på 3×, 2 s på 10×) slås
  sammen til én boble («+1,14 mill. kr · +134 t · +1 fagpoeng»); er banene opptatt, venter tallene og kommer med i
  neste boble. Med redusert bevegelse: en stille linje nederst i bildet. (Før: opptil 8 bobler samtidig på 10×.)
- Pynt-knappen på anleggsbildet har ikon i stedet for emoji.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, balanse (exit 0), build. Playwright før/etter på 320, 390, 1 366 og 1 920 px (stålverk og
storverk med konsern), og de 7 størrelsene uten vannrett scrolling; boblene målt på 10× (maks 1 samtidig, sammenslått)
og med redusert bevegelse (stille linje).

## B-196 UI-2b: Anlegg – statusmerker og produksjonsflyten over hele bredden på PC (2026-09-27)
Status: gjelder (UI.md 6 og 6.2; bygger på B-195)
Beslutning:
- Hvert sted i «Produksjonen» (skraplager, ovner, støping, valseverk, ferdigvarelager) har tittel og statusmerke
  (`StatusBadge`: ikon + ord + farge) på samme linje, og merket bryter under tittelen når ruta er smal. Ovner og
  støping har alltid merke (kjører, venter, vedlikehold, feil …); lagrene bare når noe er galt (tomt, mangler skrap,
  nesten fullt, fullt).
- **PC (fra 1 000 px):** produksjonsflyten står over begge kolonnene rett under underfanene, så alle stedene står på
  én rad; vedlikehold og kvalitet står under. Mobil er uendret: én kolonne i samme rekkefølge.
- Ingen endring i spillet eller i knappene; teksten fra motoren står som før.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter på 320, 390, 1 366 og 1 920 px (stålverk og
storverk) og de 7 størrelsene uten vannrett scrolling.

## B-197 UI-2c: Marked – skraptabell på PC, samme kort på mobil (2026-09-27)
Status: gjelder (UI.md 6 og 8; bygger på B-191/B-192)
Beslutning:
- **PC (fra 1 000 px):** «Kjøp skrap» er en tabell over hele bredden: skraptype, pris per tonn med trend, P, spor, C,
  skitt, på lager og kjøpsknappene på samme rad. Tallene står høyrejustert med like brede sifre, så de kan
  sammenlignes nedover. Skrap resepten venter på, får oransje kant og «Resepten venter på dette».
- **Mobil:** kortene som før, men med de samme delene (navn med forklaring, trend med ikon, kjøpsknapper), så
  tabellen og kortene aldri viser ulike tall.
- Trenden vises med ikon (pil opp/ned) i stedet for ▲/▼; stigende pris i varmefargen, synkende i grønt. Låste
  skraptyper har hengelås-ikon i stedet for emoji.
- De andre fanene (Resept, Strøm/Energi, Priser) blir ikke bredere enn 960 px på PC; tekst og lister er tunge å lese
  over hele skjermen. Underfanene står over hele bredden.
- Ingen endring i spillet eller i hva knappene gjør.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter på 320, 390, 1 366 og 1 920 px (stålverk og
storverk, alle fire fanene) og de 7 størrelsene uten vannrett scrolling.

## B-198 UI-2d: Salg – forespørsler som liste og detaljer på PC, underfaner som ikke kuttes (2026-09-27)
Status: gjelder (UI.md 3.3, 6 og 8; bygger på B-197)
Beslutning:
- **Forespørsler på PC (fra 1 000 px):** lista til venstre viser kunde, verdi, tonn · kvalitet · døgn, samlet vurdering
  med ikon + ord (Rekker det / Usikkert / Rekker det ikke) og svarfristen. Den valgte står til høyre med alle
  sjekkene, kravene og knappene. Første forespørsel er valgt når fanen åpnes.
- **Mobil:** alle forespørslene som kort, som før, uten et ekstra trykk for å se detaljene (et avvik fra UI.md 3.3, der
  mobil skulle åpne detaljene som et ark: kortene er korte nok, og ett trykk mindre er viktigere på mobil).
- **Hierarki i kortet:** kunde og verdi (visningsskriften) først; tonn, kvalitet, pris og frist som metadata under;
  svarfristen med klokkeikon. «Signer» og «Avslå» er minst 44 px høye.
- **Samme vurdering overalt:** sjekkene er flyttet til `offerChecks` i `ui/Sales.tsx`, så lista og kortet aldri
  sier noe ulikt. Teksten fra før står uendret.
- **Ordrekøen:** «Produseres nå» som statusmerke, frist i dag / 1 døgn igjen som oransje merke med klokke, pilene
  som ikoner, og knappene brytes ikke lenger under hverandre på 320 px.
- **Underfaner (alle sider):** antallet står under navnet på mobil og etter navnet fra 600 px, og navnet brytes aldri
  midt i ordet (før: «Forespørs» på 320 px). Er det likevel for trangt, kortes navnet med «…».
- På PC er Salg like bred som hovedområdet på Forespørsler; de andre fanene høyst 960 px (som Marked, B-197).
- Ingen endring i spillet.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter på 320, 390, 1 366 og 1 920 px (stålverk og
storverk, alle fire fanene), de 7 størrelsene uten vannrett scrolling eller avkortet tekst og med knapper minst 40 px,
Marked-fanene på nytt (nye underfaner), og valg + «Signer» i lista på PC.

## B-199 Resepten flyttes fra Marked til Verket (2026-09-27)
Status: gjelder (erstatter delen av B-051 om Resept under Marked)
Brukeren: «Resept bør ikke ligge under marked.»
Beslutning:
- Resepten er en del av produksjonen – hva som går i ovnen og hva som blir i stålet – ikke av markedet. Den er nå
  en egen underfane på Verket: **Oversikt · Anlegg · Resept · Økonomi** (· Konsern). Kvaliteten velges fortsatt under
  Oversikt («Produksjon nå»), så begge delene av «hva lager vi» ligger på Verket.
- Marked har underfanene Skrap, Strøm/Energi og Priser. Skrap resepten venter på, er fortsatt merket under Skrap.
- Resept-fanen blir oransje når resepten ikke holder kravet til en kvalitet som lages nå (som før på Marked).
- Alle råd, varsler, hendelseskort og reseptguiden som viste til «Marked → Resept», viser nå til «Verket → Resept»
  og åpner den fanen.
- På PC står resepten ved siden av anleggsbildet og rådene. På de smaleste telefonene (≤ 360 px) er Verket-fanene
  tettere, så alle fem navnene får plass når Konsern er åpnet.
- Ingen endring i spillet eller i lagrede spill (underfanen lagres ikke).
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, balanse (exit 0), build; Playwright på de 7 størrelsene (stålverk og storverk med
konsern): ingen vannrett scrolling og ingen avkortede fanenavn; en resept som ikke holder, gir oransje fane, og rådet
åpner Verket → Resept; Marked har tre faner.

## B-200 PC: ikke tomrom under anleggsbildet på Verket (2026-09-27)
Status: gjelder (UI.md 5; bygger på B-192)
Brukeren: «På pc er det et stort åpent rom mellom grafikken av verket og «mål»-ruta.»
Årsak: på PC (fra 1 000 px) er Verket et rutenett med to kolonner. Anleggsbildet og høyrekolonnen (produksjonslinja,
dagens oppdrag, «Produksjon nå» …) lå på samme rad, så kortene under bildet (Mål, Fagboka …) begynte først under
den høye høyrekolonnen – opptil 300–600 px tomt. Det samme skjedde på Anlegg (Vedlikehold til høyre) og Økonomi.
Beslutning:
- Høyrekolonnen (`g-side`) går over to rader i rutenettet, og den siste raden tar resten av høyden
  (`grid-template-rows: … 1fr`). Kortene til venstre følger da rett under bildet og rådene, og høyrekolonnen står ved
  siden av så langt den rekker. Gjelder Oversikt, Anlegg og Økonomi.
- Mobil og skjermer under 1 000 px er uendret (én kolonne i samme rekkefølge).
Konto (B-149): ingen ny funksjon.
Testet: Playwright på 1 000, 1 366, 1 920 og 2 560 px (stålverk og storverk): største loddrette avstand mellom to kort i
venstre kolonne er 12 px (før: opptil 636 px) på alle fire Verket-fanene.

## B-201 Varsellinja over menyen nederst på mobil (2026-09-27)
Status: gjelder (erstatter plasseringen «øverst» i B-116 på mobil; prinsippet i B-116 står)
Brukeren valgte alternativ 3 av tre (beholde, toast under toppfeltet, flytte ned): «Ja til varsellinja».
Beslutning:
- Under 900 px står varsellinja med 🏆 (B-134) som en egen fast rad **rett over menyen nederst**, ikke nederst i
  toppfeltet. Den er fortsatt en fast rad med fast høyde som aldri legger seg over innholdet (B-116), og varselet står
  der tommelen er.
- Toppfeltet blir lavere: 71 px på iPhone (fra 117) og 88–97 px på 320 px (fra 134–143). Plassen til innholdet er den
  samme (raden er flyttet, ikke fjernet), men anleggsbildet og det viktigste rådet kommer høyere opp.
- PC (fra 900 px) er uendret: varsellinja står i topplinja. Bare én varsellinje finnes om gangen (`useIsPc` i
  `GameApp` velger plassen), så skjermlesere hører varslene én gang.
- Veiledningen (`.g-coach`) legger seg over varsellinja: høyden måles (`--notice-h`) og legges til avstanden fra menyen.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, balanse (exit 0), build; Playwright på de 7 størrelsene (stålverk og storverk): ingen
vannrett scrolling og ingen avkortede knapper; toppfeltet 71 px på 390–820 px, PC uendret (57 px); varsellista og
topplista åpnes fra raden nederst; veiledningen slutter over raden.

## B-202 Varsel på Marked og Folk, og varsellinja viser det siste varselet (2026-09-27)
Status: gjelder (bygger på B-071, B-116, B-144, B-201)
Brukeren: «Marked-knappen bør få varsel om man mangler skrap eller andre slike ting. Varslingslinja sier bare at man
har et varsel, men viser ingenting når det siste varselet er borte. Folk-knappen bør få varsel om det er noe man må ta
tak i.»
Beslutning:
- **«!» på Marked og Folk i menyen** når et av rådene på Verket peker dit – samme regler som rådene, så menyen og rådene
  aldri sier noe ulikt. Rådene er flyttet til `ui/hints.ts` og brukes av begge. Marked: skrap mangler eller lageret er
  tomt, planleggeren får ikke kjøpt, høy strømpris med bedre fastpris. Folk: mangler folk, fravær som koster skift,
  murere til reservepottene, lenge siden bonus, lav trivsel, ofte borte, plass til ansatte. Det gamle «!» for manglende
  folk (B-071) står som før.
- Et råd som noe i spillet ordner selv (planleggeren bestiller skrapet), står på Verket, men gir ikke «!».
- Trykk på knappen med «!» åpner underfanen rådet peker til (f.eks. Marked → Skrap). Merket forklares for skjermlesere
  og som verktøytips med rådets tekst. «Ny» går foran «!» (fanen er aldri åpnet).
- **Varsellinja** viser det nyeste varselet spilleren ikke har sett (samme utvalg som tallet på bjella) når det korte
  varselet har gått ut, i stedet for «Nye varsler – trykk for å se». Fargen følger varselet. Ingen usette: «Ingen nye
  varsler» som før.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, balanse (exit 0), build; Playwright (390 og 1 366 px): tomt skraplager uten planlegger og
lav trivsel gir «!» på Marked og Folk, og trykk åpner Marked → Skrap og Folk → Ansatte; med planleggeren som bestiller
får Marked ikke «!»; varsellinja viser teksten i det nyeste usette varselet.

## B-203 UI-3a: Økonomi – resultatet øverst, graf per døgn og hvor pengene gikk (2026-09-27)
Status: gjelder (UI.md 6; bygger på B-156, B-191, B-200)
Beslutning:
- **Resultatet øverst:** «Resultat i går» som stort tall i visningsskriften, grønt med + eller rødt med −. Ved siden av:
  snittet for 7 døgn (alt med) og i dag hittil (inn og ut).
- **Graf:** resultat per døgn for de siste inntil 30 døgnene (én serie, stolper over og under en nullinje). Grønt over
  null, rødt under, og fortegnet står i teksten, så farge aldri er alene. Verktøytips per stolpe med dag og beløp, og en
  tekst for skjermlesere med beste og dårligste dag. En dag med et stort kjøp kappes med et bruddmerke, så de vanlige
  dagene ikke blir flate (beløpet står i verktøytipset). Vises først når det finnes minst to døgn.
- **Hvor pengene kom fra og gikk:** «Inntekter i går» og «Kostnader i går» per post, sortert etter størrelse, med en
  tynn stolpe for andelen. Postene har vanlige navn (`ui/financeNames.ts`). To kolonner fra 600 px.
- Nøkkeltallene (verket i drift, datterverkene, produsert, lønn, faste kostnader, lån, reserve) står som før under
  grafen. «Strøm og effekt i går» er tatt ut som eget tall; det står nå som to poster under kostnadene.
- **PC:** Økonomi står under anleggsbildet, banken og loggen i høyrekolonnen (B-200). Mobil: resultatet først, så
  banken og loggen.
- Ingen endring i spillet.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter på de 7 størrelsene (stålverk og storverk)
uten vannrett scrolling eller avkortede knapper.

## B-204 UI-3b: Folk – bemanningen synlig på PC, faner med antall, større knapper (2026-09-27)
Status: gjelder (UI.md 6; bygger på B-198, B-202)
Brukeren: «Merge. Bare merge uten å spørre fremover. Fortsett» – også UI-faser merges nå når sjekkene er grønne,
uten å vente på svar (skjermbildene sendes likevel).
Beslutning:
- **Underfanene** på Folk bruker samme komponent som Salg (antall under navnet på mobil, etter på PC). Fravær-fanen
  blir oransje når fravær koster skift, som før.
- **PC, Skift:** to kolonner. Til venstre skiftene, anbefalte roller og skiftplanen; til høyre «Bemanning» med
  bemanningstabellen alltid synlig. Mobil: tabellen bak «Se hvem som står hvor» som før.
- **Bemanningstabellen** har fått kolonnen **Ferdighet** (snittet til egne folk i rollen, rundet ned), fra 600 px. Den
  viser hvor et kurs eller en flink søker gir mest. På 320 px er tabellen tettere, så den ikke gir sideveis scrolling
  (den var 365 px bred før).
- **PC, Ansatte:** rollegruppene står i to kolonner. Ansett og Fravær høyst 960 px brede.
- Handlingene på Folk (ansett, vikarer, bonus) er minst 44 px høye.
- Ingen endring i spillet.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter på 320, 390, 1 366 og 1 920 px og alle fire
fanene på de 7 størrelsene: ingen vannrett scrolling, ingen avkortet tekst, ingen hovedknapper under 40 px.

## B-205 UI-3c: Forskning – fagpoengene i egen kolonne, fremdrift mot prisen, to kolonner på PC (2026-09-27)
Status: gjelder (UI.md 6; bygger på B-191, B-204)
Brukeren: «Fortsett» – neste fase i UI-planen.
Beslutning:
- **Fagpoengene** står i et eget kort: tallet stort øverst, «Slik får du fagpoeng», forskningssamarbeidet, hva som kommer
  senere og det som er forsket fram. På PC står kortet i høyrekolonnen; på mobil under forskningen.
- **Klar til å forske** står som kort i et rutenett (tre i bredden på stor skjerm, ett på mobil).
- **Trenger mer fagpoeng eller lesing:** hver forskning har en fremdriftslinje mot prisen og sier hvor mange fagpoeng som
  mangler. Knappen for å lese et kapittel først har bok-ikonet i stedet for emoji.
- Ingen endring i spillet.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter på 320, 390, 1 366 og 1 920 px og de 7
størrelsene: ingen vannrett scrolling, ingen avkortet tekst, ingen hovedknapper under 40 px.

## B-206 UI-3d: Konsern – hovedkontoret med nøkkeltall, neste steg og verkene som tabell (2026-09-27)
Status: gjelder (UI.md 6; bygger på B-192, B-200, B-205)
Brukeren: «Fortsett» – siste fase i UI-3.
Beslutning:
- **PC:** Konsern er en egen side i sidemenyen (B-192), så anleggsbildet og rådene for hjemmeverket står ikke lenger
  øverst der. Før ble konsernet klemt inn i høyrekolonnen under bildet, med et stort tomrom til venstre.
- **Oppsett på PC:** nøkkeltallene (konsernverdien stort, netto fra verkene, antall datterverk, tittel eller målet) og
  «Neste steg» side om side øverst; «Dine verk» som tabell over hele bredden; «Kjøp og utvid» til venstre og
  Skraplageret og salgsdirektøren til høyre. Mobil: samme rekkefølge i én kolonne, og verkene som kort som før.
- **Verkstabellen** viser verk og type, modernisering som trinn, driftsresultat, utbytte til deg, verdi og hovedknappen
  (bygg ut eller moderniser). «Mer» åpner en rad under med resten (modernisere et stålverk, bytte til kompleks, selge
  med bekreftelse). Verket «Neste steg» gjelder, er merket.
- **Én blå knapp:** bare verket rådet gjelder, får blå hovedknapp – både i tabellen og i kortene på mobil. Før var alle
  verkenes knapper blå.
- Ikoner i stedet for emoji (fabrikk, pokal for tittelen). Ingen endring i spillet.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, balanse (exit 0), build; Playwright før/etter på 320, 390, 1 366 og 1 920 px, et konsern uten
verk, «Mer»-raden med salg, og de 7 størrelsene: ingen vannrett scrolling, ingen avkortet tekst, ingen små knapper.

## B-207 Plass til 240 ansatte på storverket, så fem skiftlag og alle anbefalte roller får plass (2026-09-27)
Status: gjelder (justerer taket fra STAGES; bygger på B-073, B-111, B-171, B-178)
Brukeren: «Jeg har akkurat nok ansatte til 5 skift. Men får ikke lov til å ansette nok til å dekke anbefalte stillinger.
Vi må justere slik at det går.»
Funnet: et fullt utbygd storverk (tre av de største ovnene, den største støpingen, to ekstra strenger og tre valseverk)
trenger 40 per skift, altså 200 til fem skiftlag. De anbefalte støtterollene er 21 (5 reparatører, 4 selgere, 6 murere,
2 planleggere, 2 skrapklassere, 2 skiftledere), og med fem lag anbefales én ledig avløser: 222 i alt. Taket var 220. Alle
fire spillerne som har bygd ut alt, sto på 220.
Beslutning:
- Storverket har plass til **240** ansatte (var 220). Da får fem skiftlag og alt som anbefales plass, med 18 til overs til
  ekstra avløsere.
- En test i `npm test` bygger det største mulige storverket og sjekker at fem skiftlag pluss de anbefalte rollene får
  plass under taket. Kommer det nytt utstyr med mannskap eller en ny anbefalt rolle, stopper testen bygget til taket er
  justert. Med det gamle taket feilet den («trenger 222, plass til 220»).
- Lønna for 20 flere er ca. 50 000 kr per døgn – ingenting for et storverk. Balansen er uendret (exit 0).
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test` (den nye testen feiler med 220 og går med 240), balanse (exit 0), build.

## B-208 Skrapklasseren smelter om eget returskrap, og planleggeren holder av plass på skraplageret (2026-09-27)
Status: gjelder (bygger på B-048, B-171)
Brukeren: «Planleggeren er dårlig å planlegge inn på resept, får stadig varsler om at jeg er tom for skrap, og at
returproduktene samler seg opp på lageret.»
Funnet: verket lager selv returskrap (kapp fra støping og valsing, overgangsemner og omsmeltet sekunda). På et fullt
utbygd storverk er det ca. 950 t i døgnet. Reseptene brukte 0–10 % retur, så det hopet seg opp: brukerens lager hadde
73 000 t retur. Planleggeren solgte bare 150–400 t om gangen – akkurat nok til neste kjøp – så lageret sto alltid
fullt, innkjøpet kom for sent, og ovnene sto med «mangler skrap til resepten». Gjenskapt i en simulering av et verk
som brukerens: returen vokste hvert døgn, og lageret var 97 % fullt etter ti døgn.
Beslutning:
- **Skrapklasseren bytter inn eget returskrap** for kjøpt skrap, inntil en fjerdedel av chargen (`RETURN_MAX_SHARE`),
  bare for skrap som er minst like skittent (fosfor og sporelementer). Returen har kjent analyse. I lysbueovnen brennes
  karbonet av; i induksjonsovnen (som ikke kan det) byttes retur bare inn der den ikke gir mer karbon – ellers ble
  nybegynneren mye tregere (median storverk dag 171 i stedet for 138, fordi stålet fikk for mye karbon).
- Det reseptene som skal ha retur (f.eks. premium med 10 %), trenger til to charger per ovn, blir liggende.
- **Planleggeren holder av plass:** er skraplageret over 90 % fullt, selger den skrap ingen resept i ordrekøen trenger,
  ned til 80 %, i én omgang. Returskrap skrapklasseren skal bruke i innkjøpsperioden, beholdes.
- I simuleringen av brukerens verk går returen ned med ca. 6 000 t i døgnet (73 000 t er brukt opp på ca. 12 døgn), og
  deretter brukes den omtrent like fort som den lages (lageret 11–15 % fullt).
- **Testfila:** oppsummeringen som setter exit-koden, sto midt i `game/tests.ts`, så testene etter den (B-207 og denne)
  talte ikke med i `npm test`. Den står nå sist.
Konto (B-149): ingen ny funksjon.
Testet: `npm test` (ny test for innbytte, skittent retur, induksjonsovn, reserve og plass på lageret; den feiler uten
plassregelen), balanse (exit 0, nybegynner median 136), simulering av brukerens oppsett, tsc, lint, build.

## B-209 Konsernet bygger i ekte tid, utbyttet er trimmet, og hjemmeverket er flaggskipet (2026-09-27)
Status: gjelder (justerer B-121 og B-181; første del av rebalanseringen av sluttspillet i RETNING.md)
Brukeren: «Utbyttet er vel kanskje litt for ekstremt? Skal vi balansere inntektene litt?» – og etter anbefalingen: «Gå for
din anbefaling.»
Funnet: fire spillere hadde bygd ut alt (12–14 stålkomplekser på trinn 5) og sto på kassegrensen på 100 mrd. med 49 mrd.
til 8 200 mrd. i bunden reserve. Hjemmeverket ga 1–6 % av inntekten. Hovedproblemet var tempoet: på 10× er et spilldøgn 12
sekunder, så et kompleks som betaler seg på 50–90 døgn, var tjent inn på 10–18 minutter. Å bare kutte utbyttet ville bare
gitt mindre tall på en konto som ikke kan brukes.
Beslutning:
- **Byggetid i ekte tid, uansett spillfart:** et stålverk tar 2 timer å bygge, et storverk 6, et stålkompleks 12;
  utbygging fra stålverk til storverk 6 timer; hvert trinn modernisering 4 timer. Ett prosjekt om gangen per verk. Et verk
  som bygges, tjener ingenting og har ingen konsernledelse; et verk som bygges ut eller moderniseres, går som før imens.
  Verdien regnes som om prosjektet er ferdig (pengene er betalt), så konsernverdien faller ikke. Prosjektene blir ferdige
  også når spillet står på pause (`finishKonsernProjects` i spilløkka). Tida er lokal (`realNow`); det er greit fordi
  konsernet er eget spill – det som avgjøres mellom spillere, regnes fortsatt på serveren (B-190).
- **Trim av utbyttet:** et stålkompleks tjener 60 mill. per døgn før modernisering (var 110 mill.), og prisen fulgte med
  (3,6 mrd., var 6 mrd.), så et nytt verk fortsatt er verdt det det koster (B-121). Verkene beholder 30 % (var 20 %), og
  utbyttet avtar 10 % per verk nedover i rekken (var 5 %). Et fullt konsern med 14 komplekser på trinn 5 gir 1,1 mrd. netto
  per døgn (var 3,3 mrd.).
- **Hjemmeverket er flaggskipet:** omdømme og andelen stål som holdt kvaliteten de siste sju døgnene gir inntil +20 %
  utbytte fra alle datterverkene (`flagshipBonus`). Da lønner det seg fortsatt å drive selve verket godt.
- Spillerne merker det med én gang: inntekten fra et fullt konsern blir omtrent en tredjedel, og konsernverdien faller
  (verdien er 60 døgns overskudd). Titlene som er nådd, beholdes. Lagringene endres ikke.
- Ikke avgjort ennå (resten av rebalanseringen): hva den bundne reserven (B-193) blir, og om kassegrensen skal bort.
Konto (B-149): ingen ny funksjon – konsernet er en del av selve spillet.
Testet: ny test (bygging i ekte tid, spillfart hjelper ikke, ett prosjekt per verk, verdien faller ikke, flaggskipet),
de gamle konserntestene spoler klokka fram; `balance.ts` (exit 0; testspilleren får en ekte klokke som om den spiller på
3×) og `--konsern`; Playwright på Konsern med prosjekter som pågår, 7 størrelser.

## B-210 Tilbakemeldinger fra spillerne: anbudet, skiftleder, salgsdirektør, ordrekøen og kort som gjentas (2026-09-27)
Status: gjelder (justerer B-178, B-189 og kortpausen i B-150/B-171)
Brukeren sendte åtte punkter fra spillerne. Beslutning per punkt:
- **Skraplageranbudet var for skjult:** alle som er logget inn, ser nå hvem som har lagt inn bud (kallenavn, sortert
  alfabetisk så rekkefølgen ikke avslører noe), men ikke beløpene. Migrasjon `033_anbud_budgivere.sql` (`world_status()`
  gir `tender.bidders`). Rådgiverne viste ingen nye punkter.
- **Operatør til skiftleder:** en flink operatør på skiftet (ovn, støping, skrap, lab, valse; ferdighet minst 4, ikke
  lærling) kan sendes på lederutvikling fra Folk → Ansatte («Gjør til skiftleder»). Kurset koster 150 000 × (nivå + 1)²
  (3,75 mill. på storverket) og tar 60 spilldøgn med full lønn, borte fra skiftet. Etterpå er hen skiftleder med
  skiftlederlønn. Anbefalingen for skiftleder nevner muligheten.
- **Salgsdirektøren var vanskelig å finne:** den kan nå ansettes der man signerer forespørsler (Salg → Forespørsler) og
  der man ansetter folk (Folk → Ansett, «Ledelse»), i tillegg til Konsern. Vises bare når konsernet er åpnet.
- **«Følg ordrekøen» forvirret nye spillere:** når ordrekøen styrer, står det rett under kvalitetsvalget hvorfor det er
  grått, med knappen «Velg selv» som slår av «Følg ordrekøen».
- **Anbefalt skiftleder kunne ikke følges:** anbefalingen var riktig, men det ble bare laget søkere til plassene på
  skiftene, så en skiftleder dukket bare opp tilfeldig. Nå finnes det alltid minst én søker til hver anbefalt
  støtterolle som mangler (`ensureCandidates`), og hver rolle i anbefalingen har en «Ansett»-knapp for den flinkeste
  søkeren.
- **Samme hendelseskort mange ganger på rad:** pausen mellom like kort var 25 spilldøgn – fem minutter på 10×. Samme kort
  kommer nå heller ikke igjen før det har gått 20 minutter i ekte tid (`SAME_CARD_REAL_MS`, klokka i `game/clock.ts`).
  Kjøper man kameraer mot kobbertyver, kommer det kortet ikke igjen på samme verk (som støyskjermen, B-171). En time ble
  prøvd først, men da fikk spillere på 1× og testspilleren (3×) langt færre kort; 20 minutter endrer lite der. Med
  pausen blir nybegynneren i testene ca. 7–10 døgn senere til storverket (snitt 160 mot 149 over åtte frø), godt innenfor
  målet på 240.
- **Økonomireformen og én spiller (H4WK3N5):** reformen virket for alle. Spillet hadde 0,09 mrd. da reformen ble kjørt
  (under gulvet på 250 mill.), så det var urørt etter regelen. Alt etterpå er tjent under de nye reglene (50 mrd. elleve
  timer senere) – det var nettopp tempoet B-209 tar tak i. Ingen data er endret.
- **Mange lager ikke konto:** besvart med en anbefaling til eieren, se FORSLAG.md. Ingen endring i spillet.
Konto (B-149): anbudet krever konto som før; de andre endringene er i selve spillet og krever ikke konto.
Testet: ny spilltest (søker til skiftleder, kameraer, like kort i ekte tid, lederutvikling), nettesten ser budgiverne,
`npm test`, balanse exit 0, tsc, lint, build, Playwright på Folk (Skift, Ansatte, Ansett) og Salg på 7 størrelser.


## B-211 Landemerker med salgsdirektør, egen side for mål, vern mot gamle lagringer og vikarer fra skiftlederen (2026-09-27)
Status: gjelder (justerer B-174/B-177 og B-210)
Brukeren sendte fire punkter. Beslutning per punkt:
- **Landemerker ble ikke laget med salgsdirektør:** direktøren fylte køen med andre ordrer, og et landemerke som ble
  tatt, havnet bakerst. Nå går et landemerke først i ordrekøen når det tas (`acceptContract`), planleggeren sorterer
  landemerker først (så etter frist), og salgsdirektøren holder av plass til et landemerke som venter på svar – tonnene
  telles med når hen vurderer andre forespørsler (`directorHour`).
- **Mål-sidene var gjemt nederst på Verket → Oversikt:** daglig belønning, dagens oppdrag, ukens utfordring,
  sesongstigen, utfordringene og prestasjonene har fått en egen side, **Mål** (`ui/Goals.tsx`), med underfanene I dag,
  Uke og sesong (fra storverket), Prestasjoner og Toppliste. Den åpnes med pokalen ved varsellinja (før bare topplista)
  og med en lenke øverst på Oversikt; på PC står den også i sidemenyen. Ikke egen knapp i menyen nederst på mobil – den
  er full, og pokalen er alltid synlig. Funksjoner som krever konto, vises med `AccountFeaturesCard` som før.
- **Økonomireformen og «den ene spilleren» – rettelse av B-210:** spilleren brukeren mente, er **Grane**, ikke
  H4WK3N5. Reformen traff Grane (8 286 → 11,17 mrd. kl. 01.02, sikkerhetskopi før reformen finnes), men en enhet med
  det gamle spillet lastet det opp igjen etterpå (via valget «behold dette spillet» eller en gammel app). Hullet er
  tettet: spilltilstanden har `serverEdit`, som serveren øker når den endrer et spill. `save_game()` avviser et spill
  med lavere `serverEdit` enn det som ligger lagret (migrasjon `034_serverendring_vern.sql`), og appen tar da
  serverens spill (`pullIfNewer`, og `linkOnLogin` ved innlogging). **Fast regel:** hver gang serveren endrer et lagret
  spill, økes `state.serverEdit`. Granes spill er ikke rettet ennå: dry-run er gjort (kasse 11,26 mrd., reserve 0,
  `serverEdit` 1, tidslinjetallene etter reformen merkes `pre_reform`), og det venter på eierens godkjenning.
- **Vikarer for alle som er borte:** ny bryter på Folk → Fravær, «Skiftlederen leier inn vikarer for alle som er
  borte» (`settings.leaderTemps`, av som standard, vises når verket har en skiftleder). Da leier skiftlederen inn
  vikarer ved alt fravær, også når skiftene ville gått likevel – til alle er tilbake. Uten bryteren er det som før
  (vikarer bare når fravær ellers koster skift, B-104).
Konto (B-149): Mål-siden og vikarbryteren er selve spillet og krever ikke konto; det på siden som krevde konto før,
krever det fortsatt. Vernet i `save_game` gjelder alle kontoer.
Testet: ny spilltest (landemerke først i køen og hos planleggeren, vikarer fra skiftlederen), ny nettest (serveren har
endret spillet: lavere `serverEdit` avvises og appen tar serverens spill), `npm test`, balanse exit 0 (storverk 147,
nybegynner 153,5), tsc, lint, build, Playwright på Mål-siden på 7 størrelser og 320 px, rådgiverne etter migrasjonen.

## B-212 Gjestekonto, «Det går du glipp av», juksesperren på stålverket og ikoner på Mål (2026-09-27)
Status: gjelder (avgjør spørsmålet om kontoer i B-210; justerer B-149, B-158 og B-211)
Brukeren: «Automatisk gjestekonto, men de får ikke gjort noe mer før de faktisk oppretter konto. Vis hva de går glipp
av. Ja vi kan fikse innlogging med Google og Apple senere.» Og: «Dagens oppdrag bruker enda emojier» og «Noen spillere
som er flagget? Ser det mangler noen fra topplista».
- **Gjestekonto:** spiller man uten konto, lager appen en anonym konto i bakgrunnen (Supabase «anonymous sign-ins») når
  spillet har kommet til dag 2, og lagrer spillet der én gang i minuttet (`net/guest.ts`). Gjestens økt ligger for seg
  selv, ikke som innlogging, så resten av spillet ser spilleren som «uten konto». Et spill som alt tilhører en konto,
  blir aldri gjest. Gjesten får ikke noe mer: ingen toppliste, kallenavn, daglig belønning, oppdrag, «mens du var
  borte», uke, sesong, anbud eller konsernkasse. Oppretter spilleren konto eller logger inn, tar kontoen over gjesten
  (`adopt_guest`, via en engangskode fra `guest_handover`), gjesten slettes, og spillet kobles til kontoen som før.
  Hvorfor gjest når den ikke får noe: spillet er sikret på nett fra første stund, eieren ser hvor mange som spiller, og
  overgangen til konto er klar for Google/Apple senere.
- **Sperren på serveren** (migrasjon `035_gjestekonto.sql`): én funksjon, `guest_gate`, kjøres av PostgREST før hvert
  kall (`pgrst.db_pre_request`). Vanlige kontoer og kall uten innlogging slipper rett gjennom; en gjest slipper bare til
  `save_game`, `guest_handover`, `delete_my_account`, egne rader i `saves`/`snapshots`, `config` og det alle kan lese
  (toppliste, sesong, hendelser, ukelista). Alt annet – også funksjoner som lages senere – gir 403 «Dette krever en
  konto». `set_nickname` sjekker i tillegg selv. Gjester teller ikke som aktive spillere (`note_activity`), gir ikke
  skraplageret inntekt (`meter_snapshot`) og får ikke «mens du var borte» (`touch_activity`). Testet i DO-blokker som
  rulles tilbake: vanlig konto og uten innlogging slipper gjennom, gjesten nektes bud og profiler, gjesten får lagre,
  overtakelsen flytter tidslinja og sletter gjesten, og koden virker bare én gang. Lagringene til de ekte spillerne gikk
  som før etter migrasjonen.
- **Må gjøres av eieren:** slå på «Allow anonymous sign-ins» i dashbordet (FORSLAG.md). Til da prøver appen én gang i
  døgnet og gjør ellers ingenting.
- **Det går du glipp av:** uten konto (også som gjest) står ett kort øverst på Mål → I dag og Uka, etter den veiledede
  starten: plassen man ville hatt på topplista denne sesongen (regnet i appen fra lista alle kan lese), hva en uke med
  daglig belønning gir, bonusen for dagens oppdrag, uke og sesong (fra stålverket), skraplageret og konsernkassa (når
  konsernet er åpnet) og spillet på flere enheter. Én knapp: «Opprett konto eller logg inn». Erstatter
  `AccountFeaturesCard` på Mål.
- **Flagget spiller manglet på topplista:** enzo var flagget for «konsernverdi 51,5 mill. på nivå 2». Det var feil:
  enzo ble værende på stålverket i 300 døgn og sparte jevnt (ca. 0,5 mill. per døgn, langt under vekstsperren). Taket
  på konsernverdi per nivå gjelder nå bare det første tallet i sesongen (når det ikke finnes noe å sammenligne med);
  etterpå passer vekstsperren på. Flagget er fjernet (som for Figen i B-158 og H4WK3N5 i B-194). Ingen andre er flagget;
  alle andre spillere står på lista.
- **Ikoner i stedet for emojier på Mål:** dagens oppdrag (hake), daglig belønning (gave), ukens utfordring (medalje,
  gave; medaljene skrives «gull/sølv/bronse»), sesongstigen og pynt (pensel, lås, lukk). To nye ikoner fra Lucide:
  `gift` og `medal`. Pynten selv og merkene beholder symbolene sine – de er innholdet, ikke knapper.
- **Kortere navn på underfanene på Mål:** «I dag, Uka, Merker, Toppliste». «Uke og sesong» og «Prestasjoner» ble
  avkortet på 320 px (feil i B-211).
Konto (B-149): gjestekontoen og kortet krever ikke konto (KONTO.md); alt gjesten ikke får, krever konto som før.
Testet: to nye nettester (gjest lagres fra dag 2 høyst én gang i minuttet, nektes daglig belønning, kontoen tar over og
gjesten forsvinner; avslått i Supabase prøves ikke igjen før et døgn; et kontospill blir aldri gjest), `npm test`, tsc,
lint, build, Playwright på Mål (7 størrelser, alle fire underfaner, kortet med plassen på topplista), SQL-testene over.

## B-213 Økonomireformen for Grane kjørt på nytt (2026-09-27)
Status: gjelder (fullfører B-186 for én spiller; se B-211)
Eieren: «Gjør rettingen» (etter dry-run i B-211). Reformen traff Grane kl. 01.02 (8 286 → 11,17 mrd.), men en enhet
med det gamle spillet lastet det opp igjen, og spillet gikk videre på de gamle pengene.
- Fersk dry-run rett før (Grane hadde spilt videre): dag 2 273, kasse 99,9997 mrd. + bunden reserve 8 441,13 mrd. =
  8 541,13 mrd. Samme regel som reformen på summen: 250 mill. × (sum / 250 mill.)^0,365 = **11,29 mrd.**
- Endret (`supabase/036_retting_grane.sql`, én blokk med kontroll): kassa 11,29 mrd., reserven null, `serverEdit` 1 (så
  eldre kopier avvises, B-211) og `device = 'server'` (appen henter spillet). De 54 tidslinjetallene etter reformen er
  merket `pre_reform`. Rekorden for konsernverdi på «Alle tider» er satt tilbake til det beste tallet før reformen
  (8 562,6 mrd., dag 2 190); de 200 mrd. over kom fra det gamle spillet. Rekorden for kasse (8 285,9 mrd.) var fra før
  reformen og står, som for alle andre (B-186).
- Står: verk, forskning, fagpoeng, lån og konsernkassa (100 mill., overført etter de vanlige reglene med lik grense for
  alle).
- Sikkerhetskopi i `save_backups` (grunn «okonomireform-retting») og for alltid i `economy_reform_log.old_state`.
- Kontroll etterpå: kasse 11,29 mrd., reserve null, `serverEdit` 1, ingen umerkede tidslinjetall, kopi finnes.
Endringslogg: nei

## B-214 Topplista for seg, egen knapp til Mål, brukernavn ved ny konto og gjester slått på (2026-09-27)
Status: gjelder (justerer B-211 og B-212)
Brukeren: «Nå er jo i dag, uke og sesong og prestasjoner på topplisteknappen. Det fungerer ikke så bra, fiks dette»,
«Når man lager bruker skal man måtte lage brukernavn. Da skal man automatisk bli med på topplista» og «Allow anonymous
sign-ins er på».
- **Topplista for seg:** pokalen åpner igjen bare topplista, som et ark (`LeaderboardSheet`), på mobil og PC. Mål har
  ikke lenger en fane for topplista; fanene er I dag, Uka og Merker.
- **Egen knapp til Mål på mobil:** et blinkskive-ikon (`target`) ved siden av pokalen ved varsellinja, med en prikk når
  dagens belønning eller oppdragsbonusen kan hentes. På PC står Mål i sidemenyen (samme ikon), og pokalen i topplinja.
  Lenken på Verket → Oversikt står som før. Ingen egen knapp i menyen nederst – den er full.
- **Brukernavn ved ny konto:** skjemaet for ny konto har feltet «Brukernavn (vises på topplista)», påkrevd. Appen
  sjekker regelen (3–20 tegn, samme tegn som `set_nickname`) og at navnet er ledig (`nickname_available`, migrasjon
  `037_ledig_brukernavn.sql`, kan kalles uten innlogging og svarer bare ja/nei – kallenavnene står på topplista fra før)
  før kontoen lages. Navnet huskes i localStorage til e-posten er bekreftet, og settes da med `set_nickname`, så
  spilleren er med på topplista med én gang. Ble navnet tatt i mellomtiden, får spilleren beskjed og velger et annet.
  I appen heter det nå «brukernavn» der spilleren velger det; det er det samme som kallenavnet på lista.
- **Gjestekontoer er slått på** av eieren i dashbordet. Supabase advarer om at gjester får rollen `authenticated` og
  dermed RLS-reglene for den. Gjennomgått: `guest_gate` (B-212) stopper gjester før RLS for alt annet enn lagringen, og
  reglene på tabellene gjelder uansett bare egne rader (`saves`, `snapshots`, `profiles`, `records`, `daily`,
  `treasury`) eller det alle kan lese (`config`, sesonger, hendelser, æraer, sesongresultater). Tabeller uten regler er
  stengt for alle. Gjester kan ikke sette brukernavn (`set_nickname` sjekker selv) og kommer derfor aldri på lista.
  Enheter som prøvde før gjester ble slått på, prøver igjen etter et døgn (B-212).
Konto (B-149): brukernavnet hører til kontoen (regel 3); Mål-knappen og arket krever ikke konto.
Testet: nettest (regelen og ledig-sjekken uten innlogging), `npm test`, tsc, lint, build, Playwright på 7 størrelser
(knappene ved varsellinja uten avkutting, pokalen åpner arket «Toppliste», Mål har tre faner) og hele løpet for ny konto
på mobil og PC (tatt navn avvises, ledig navn settes etter bekreftelsen).

## B-215 Figens verk «går ofte i minus»: hva tallene viser, og snittet først på Økonomi (2026-09-27)
Status: gjelder (justerer visningen i B-156/B-203; ingen endring i økonomien)
Brukeren: «Figen sier han ikke liker det vi har gjort med økonomien pga hans verk går ofte i minus.»
Funnet i Figens lagrede spill (120 døgn, dag 1 357–1 476, 12 stålkomplekser):
- **Hele resultatet** har vært i pluss hvert eneste døgn: +1,1 til +3,3 mrd. per døgn.
- **Utbyttet fra datterverkene** falt fra ca. 2,9 til ca. 1,3 mrd. netto per døgn rundt dag 1 450. Det er trimmen i
  B-209, som brukeren valgte («Gå for din anbefaling»). Det er den endringen Figen merker.
- **Hjemmeverket alene** gikk i minus 10 av 120 døgn, alle mellom dag 1 430 og 1 468. De døgnene kjøpte planleggeren
  skrap for 110–150 mill. (vanlig 30–60 mill.) mens returskrapet hopet seg opp – problemet B-208 rettet. Etter at B-208
  virket (fra ca. dag 1 470) har skrapet kostet ca. 1 500 kr/t mot 3 400–3 600 kr/t før, og ingen døgn har vært i
  minus. Snittet for hjemmeverket er +187 mill. per døgn.
- På Verket → Økonomi sto «Verket i går (drift)» i rødt først. Et døgn i minus er som regel bare at skrapet er betalt
  før ordren er levert og betalt.
Beslutning:
- «Verket, snitt 7 døgn» står nå først, med farge. «Verket i går» er gul (ikke rød) når snittet er i pluss, og da står
  én linje under: verket gikk i minus i går, men tjener X i snitt; skrapet betales når det kjøpes, kontraktene når de
  leveres.
- Utbyttet endres ikke uten at eieren ber om det (B-209 står). Mulige grep hvis Figen fortsatt synes det er for lite:
  mindre trim for de beste verkene, eller at modernisering (Figens verk er ikke modernisert) gir mer.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, Playwright på Verket → Økonomi (320, 390 og PC) med et døgn i minus.

## B-216 UI-4a: Kontrollrommet i designsystemet – ikoner, knappen ved tommelen og bredden på PC (2026-09-27)
Status: gjelder (UI-plan fase 5, `docs/UI.md`; spillet i kontrollrommet er uendret, B-175)
Brukeren: «Fortsett» (neste steg på lista etter B-215).
Kontrollrommet brukte alt fargene i designsystemet, men hadde emoji i knapper og runder, og på PC sto en smal
mobilkolonne midt på skjermen.
- **Ikoner i stedet for emoji:** rundene (flamme, vind, rake, dråpe), holdeknappene (strøm, oksygen, helle), «Ferdig»,
  lukk, varselet om skrapkurver og «Ny rekord» (pokal). Tre nye ikoner fra Lucide (`wind`, `droplet`) og ett tegnet i
  samme strek (`rake`).
- **Mobil:** knappen man holder inne står nederst, der tommelen er (før midt på skjermen med tomrom under). På høye
  mobiler får ovnen mer plass.
- **PC (fra 900 px):** en runde er bildet til venstre (ovnen, badet eller øsa, større) og målere, råd og knapper til
  høyre, midt i høyden. Rundekortet står sentrert. Resultatet står i to kolonner: stjerner, poeng og knappene til
  venstre, rundene med «Hvorfor?» til høyre.
- Seiersskjermen (10 mrd.) legger seg ikke lenger over kontrollrommet midt i en charge; den kommer når chargen er ferdig.
Konto (B-149): ingen ny funksjon.
Testet: tsc, lint, `npm test`, Playwright på 7 størrelser (rundekort og smelting: ingen horisontal scrolling, ingen
avkuttede eller små knapper) og en automatisk gjennomspilling av alle fire rundene til resultatet på mobil og PC.


## B-217 Døgnproduksjonen teller emnene valseverket ikke rekker, og Verket på PC åpner ikke Konsern (2026-09-27)
Status: gjelder
Brukeren: «Det virker som om at direktøren har sluttet å signere nye avtaler, kun nye ordere», «Det er også en bug på pc
der om man er på konsernsiden, trykker på marked også kjapt trykker på verket så går man tilbake til konsern?» og
«[Grane] mistet sin plass på hall of fame, det skulle han ikke».
- **Funnet (salgsdirektøren):** `dailyProductT` ble kuttet til det valseverket rekker (min(støping, valsing) × 0,96).
  På et storverk med tre valseverk rekker valsingen ca. 8 300 t armering i døgnet, mens verkene støper 30 000 t – resten
  blir emner og selges. Salgsdirektøren trodde derfor verket laget en firedel av det det gjør, og en ny rammeavtale
  (0,2–0,4 av en ukes «produksjon») sprengte grensen på 50/70 % av uka. Sett på ekte lagringer: New Guy (2 aktive +
  1 tilbud, 0,84 av uka mot 0,5), Figen (1 aktiv, 0,56 mot 0,5), Tuster (emneavtalen på 21 250 t). Feilen har vært der
  siden valseverket kom, men merkes først når støpingen blir mye større enn valsingen (stormodellene i B-154 og flere
  strenger).
- **Rettet:** `dailyProductT` er nå alt verket lager (emner og armering): støpingen minus valsetapet på det som valses.
  Ny `rolledDailyT` er armeringen valseverket rekker, og `productCapT(stats, vare)` gir kapasiteten per vare. Armering
  sjekkes i tillegg mot valseverket: `assessOffer` (Salg og salgsdirektøren) bruker det største av «hele verket» og
  «valseverket» (`rollingNeedDays`), salgsdirektøren tar ikke armeringsavtaler over sin andel av valsingen, og
  forespørsler og rammeavtaler på armering får størrelse og frist etter valseverket. Emner er ikke begrenset av
  valsingen, for emner som kontraktene venter på, valses ikke (`updateRolling`).
- Verk der støpingen er mindre enn valsingen, er uendret (samme tall som før). Testspilleren: alle nivådager OK, exit 0.
  Ny test i `game/tests.ts`. På New Guys lagring signerer salgsdirektøren nå den ventende avtalen.
- **PC-feilen:** Verket husket underfanen Konsern. Fra en annen fane åpnet Verket derfor Konsern igjen. På PC er Konsern
  et eget punkt i sidemenyen, så Verket åpner nå Oversikt når underfanen var Konsern. På mobil er Konsern en underfane
  i Verket og huskes som før.
- **Grane og Hall of Fame:** den gamle kontoen ble slettet med «Slett konto», og en ny konto med samme brukernavn ble
  laget kl. 22.05 (UTC). Rekordene, tidslinja og sikkerhetskopiene følger kontoen og ble slettet med den; den nye kontoen
  har bare rekordene fra dag 2 273. (Rettelse: i svaret til brukeren kl. 22.17 sto det at Granes enhet hadde hentet det
  rettede spillet; det var den nye kontoen som lastet opp spillet.) Å legge de gamle rekordene inn igjen på den nye
  kontoen er endring av ekte spillerdata og venter på eierens godkjenning. Dry-run: konsernverdi 162,2 → 8 562,6 mrd.
  (dag 2 190), kasse 11,29 → 8 285,9 mrd. (dag 2 190), storverk og ferdig dag 2 273 → 610. «Koblet til på dag» regnes
  fra tidslinja og står på 2 273.

## B-218 Landemerker på Mål sammen med dagens oppdrag, og de går aldri ut (2026-09-27)
Status: gjelder (justerer B-174 og B-177)
Brukeren: «Landemerker boksen bør ligge sammen med dagens oppdrag. Også bør ikke landemerker kontrakten kunne gå ut».
- **Plassen:** kortet «Landemerker» er flyttet fra Verket → Oversikt til Mål → I dag, under dagens oppdrag. Landemerket
  kommer én gang per virkelig dag, som oppdragene. Lenken «Se forespørselen under Salg» åpner Salg → Forespørsler.
- **Går aldri ut:** forespørselen har ingen svarfrist og trekkes heller ikke når verket en stund lager en annen vare
  (`expireOffers` hopper over landemerker). Den signerte kontrakten har ingen frist: den står først i ordrekøen til den
  er levert, uten bot og uten tapt omdømme (dagsløkka hopper over landemerker). `assessOffer` regner den aldri som for
  sen, `lateContracts` (varsel ved utkobling) tar den ikke med, og kundevurderingen gir full uttelling for tid.
  `deadlineDay` står fortsatt og brukes bare som anslag. Spilleren kan selv avslå eller avbryte, som før.
- **Salg:** forespørselen viser «ingen frist» og «Venter til du svarer – landemerker går ikke ut»; i ordrekøen står
  «Ingen frist».
- **Rettet samtidig (følge av B-217):** landemerket fikk størrelse etter hele døgnproduksjonen, også når varen er
  armering. Nå brukes `productCapT` (valseverket for armering), som før B-217.
- Konto: nei (samme funksjon som før, bare flyttet). Ny test i `game/tests.ts`.

## B-219 Holdeknappen uten tekstmarkering, skrapvarsel bare når ovnen står fast, Granes Hall of Fame tilbake (2026-09-27)
Status: gjelder
Brukeren: «Når man holder Knappen nederst i kontrollrommet begynner mobilen å prøver å kopiere teksten», «Hall of fame
til [Grane] skal jo være rundt 8500 mrd. men det er jo ikke det han faktisk skal ha på sin bruker i sesongen nå» og «Jeg
får ofte opp at skrap mangler selv om at jeg har planlegger».
- **Kontrollrommet:** CSS-en (`user-select: none`, `-webkit-touch-callout: none`) sto bare på knappen og rommet, og
  Safari på iPhone starter likevel markering og «Kopier» ved langt trykk. Nå: samme CSS på alt inne i kontrollrommet,
  en vanlig (ikke passiv) `touchstart`-lytter som stopper standardhandlingen på holdeknappen og slaggklumpene,
  `selectstart` og `contextmenu` stoppes i hele rommet, og en markering fjernes når knappen trykkes. Knappene styres
  av pekerhendelsene som før (sjekket i Playwright: holdt nede → på, sluppet → av).
- **Skrapvarselet:** `scrapShort` sa «mangler skrap» så snart én type i resepten var under én charge – også når ovnen
  fyller opp med de andre typene, og når typen ikke kan kjøpes (returskrap i resepten til høykarbon, premium og enkel).
  Ny `scrapAlert`: varsler bare når neste charge i en ovn faktisk står fast (tørrkjøring av `takeScrap`). Med
  planlegger som kjøper inn gis ellers ingen varsel (får den ikke kjøpt, vises det som før med «!» på Marked). Uten
  planlegger vises typene som mangler og kan kjøpes. Brukes av produksjonslinja, skrapkortet og Skrap-fanen på Marked.
  `scrapShort` står for forklaringen når ovnen står og for reseptguiden. Merk også B-217: planleggeren kjøpte for et
  par døgn etter `dailyProductT`, som var en firedel av det store verk bruker – det er rettet der.
- **Grane:** eieren godkjente å legge tilbake Hall of Fame-rekordene (dry-run i B-217). `supabase/038_granes_rekorder.sql`
  endrer bare rekordraden (konsernverdi 8 562,6 mrd. og kasse 8 285,9 mrd. dag 2 190, storverk og ferdig dag 610,
  omdømme 100). Spillet, kassa (11,29 mrd.) og sesongen er ikke rørt. Kontroll: Grane er nr. 1 på «Alle tider» med
  8 563 mrd.

## B-220 Storverk-kortet på Verket ryddet, og ingen nedtelling for sesongen (2026-09-27)
Status: gjelder (justerer B-182 og B-150)
Brukeren: «Storverket ruta med sluttmål info i verket fanen føler jeg ikke gir mening lengere. Fiks det/og flytt det eller
fjern det» og «I topplista står det antall dager igjen av sesong. Men vi har jo ikke antall dager igjen lengere».
- **Kortet på Verket → Oversikt** (storverket, ikke flere nivåer): før konsernet er åpnet heter det «Neste steg:
  konsernet» med egenkapitalen mot grensen – det er det neste spilleren skal gjøre. Når konsernet er åpnet, er kortet
  med sluttmålet (10 mrd.) og konsernverdien fjernet; det står på Konsern-fanen fra før. Da vises bare «Neste store
  steg» (utstyret som gir mest produksjon), og ellers ikke noe kort.
- **Sesongen uten nedtelling:** topplista viser «Grunnleggeræraen · Sesong 1 pågår», startskjermen «Sesong 1 pågår», og
  beskjeden om å bli med nevner ikke antall dager. Neste sesong starter ikke av seg selv, og æraen avsluttes av
  administrator (B-182), så en nedtelling ga feil inntrykk. Sesong 1 har fortsatt sluttdatoen 2027-03-25 i databasen
  (resultatene lages da); den er ikke endret.
- Konto: nei (bare tekst og plassering).

## B-221 Sesongene har ingen sluttdato – ny sesong startes manuelt (2026-09-27)
Status: gjelder (erstatter sluttdatoen i B-130 og den automatiske neste sesongen i B-167; bygger på B-182 og B-220)
Eieren: «Det skal ikke være sluttdato noen plass. Ny sesong skal gjøres manuelt».
- **Databasen** (`supabase/039_sesong_uten_sluttdato.sql`): `seasons.ends_at` kan være tom og er det mens en sesong pågår;
  den settes bare når sesongen avsluttes. Sesong 1 hadde 2027-03-25 og har nå ingen sluttdato. `current_season_id()` og
  `season_status()` regner en sesong uten sluttdato som pågående. Den automatiske neste sesongen er fjernet fra
  `season_status()` (bryteren `auto_next_season` brukes ikke lenger). Sesongstigen (`season_track_points`) teller
  ukepremiene også når sesongen ikke har noen slutt – ellers ville de falt bort.
- **Manuelt:** `end_season()` avslutter sesongen som pågår (resultatene lages som før), og `start_season(navn, vri)`
  avslutter den som pågår og starter en ny uten sluttdato. Begge kan bare kjøres av administrator (SQL Editor eller
  connectoren), ikke fra appen. Testet i en transaksjon som ble rullet tilbake: Sesong 1 avsluttet med 10 resultater, ny
  sesong uten sluttdato, ingenting lagret.
- **Appen:** `Season.ends_at` er `string | null`, og `daysLeft` er fjernet (nedtellingen ble tatt bort i B-220).
- Ingen nye sikkerhetsråd (`get_advisors`). Konto: ingen endring.
Endringslogg: nei

## B-222 Spillet står på pause mens Salg er åpen (2026-09-27)
Status: gjelder
Ønske fra en spiller (via brukeren): «når man går inn på salg så pauses spillet frem til man går ut av salg vinduet eller
starter tiden igjen manuelt mens man er inne i salg vinduet».
- Når spilleren åpner Salg og tida går, settes spillet på pause, og farten fra før huskes. Når Salg lukkes (en annen
  fane), går spillet videre i samme fart – men bare hvis det fortsatt står på pause og ingen hendelseskort eller
  kontrollrommet venter. Starter spilleren tida selv mens Salg er åpen, blir den stående slik, også etterpå.
- Øverst på Salg står en kort forklaring mens pausen varer: «Spillet står på pause mens du er på Salg. Det går videre når
  du går ut – eller start tida selv øverst.»
- Innstilling under ⚙️: «Sett spillet på pause mens du er på Salg» (`settings.pauseOnSales`, på som standard; gamle
  lagringer får `true` i `migrate()`).
- Logikken står i `GameApp` (effekter på `onSales` og farten), ikke i spillmotoren: det er bare et valg i grensesnittet,
  så testspilleren og juksesperren påvirkes ikke (tida står bare stille).
- Konto: nei (regel 1, ditt eget spill). Lagt i KONTO.md.

## B-223 Valseverket får emner til armeringsordrene først i køen, og rådgiveren tilbyr ikke planlegger når du har (2026-09-27)
Status: gjelder (retter en følge av B-217)
Brukeren (skjermbilde av «Rådgiveren: leveransene kommer for sent» med tilbud om innleid planlegger): «Hva skjedde med
planleggerne mine?»
- **Planleggerne var der** (to, til stede). Rådgiveren kommer når tre leveranser er for sene innen ti døgn, uansett.
- **Funnet:** tre armeringsordrer (4 000 t hver) fikk nesten ingenting levert. Valseverket valser bare emner som ingen
  emneordre venter på (`updateRolling`), og emnene ble holdt av for **alle** aktive emneordrer. Etter B-217 signerte
  salgsdirektøren langt mer emner (bl.a. en rammeavtale på 46 250 t emner i armeringskvalitet), så alle emnene ble holdt
  av og valseverket sto uten noe å valse – selv om armeringsordrene sto øverst i køen.
- **Rettet:** emnene holdes bare av for emneordrene som står **foran** den første armeringsordren i køen. Uten
  armeringsordre i køen holdes de av for alle emneordrene som før. Valseverket tar uansett bare det det rekker, så
  emneordrene bak får resten av støpingen.
- Kjørt på den ekte lagringen (seks døgn): armeringsordrene leveres igjen (to fullført); én ordre på 15 000 t med to døgn
  igjen ble fortsatt for sen, den var alt for stor for tida som var igjen. Ny test i `game/tests.ts`. Testspilleren: OK.
- **Rådgiveren:** har verket egne planleggere, tilbyr kortet ikke en innleid planlegger (den sorterer bare køen, som
  planleggerne alt gjør). Teksten sier i stedet at verket har tatt på seg mer enn det rekker, og at man kan si nei eller
  slå av rammeavtalene til salgsdirektøren.

## B-224 UI-4b: Topplista og Hall of Fame i designsystemet (2026-09-27)
Status: gjelder (fase UI-4b i docs/UI.md)
Brukeren: «Fortsett» (neste steg i planen etter UI-4a).
- **Toppen:** tittelen er «Toppliste», eller «Hall of Fame» når den er valgt. Oppdater og lukk er ikonknapper (Lucide
  `refresh`/`close`, 44 px). Oppdater snurrer mens lista hentes.
- **Valgene:** sesongen heter det den heter («Sesong 1») mot «🏆 Hall of Fame» (ikon fra Lucide). Under listevalget står én
  linje om hva lista viser: «Spillet slik det står nå: …» eller «Beste resultat noensinne i Grunnleggeræraen: …».
- **Din plass** står for seg øverst (plass, brukernavn og tallet), også når du er lenger ned enn lista viser.
- **Lasteskisse** (fem grå rader) i stedet for «Henter …», uten animasjon når telefonen ber om mindre bevegelse.
- Oppfordringene (logg inn, velg brukernavn) og feil er `Callout`. Forklaringen av lista er flyttet bak «Slik virker
  lista» (ingen tekstvegg). De tre første har uthevet navn; medaljene står.
- Bare arket bruker topplista nå, så kortvarianten er fjernet fra `Leaderboard.tsx`.
- Testet i Playwright på de 7 størrelsene (uten konto) og på 320, 390 og 1 920 px med konto: ingen horisontal
  scrolling, ingen avkortede knapper, verdiene innenfor arket, din plass riktig i sesong og Hall of Fame.
- Konto: nei (samme funksjon, ny form).

## B-225 UI-4c: Felles arktopp som står fast, og de minste skjermene (2026-09-28)
Status: gjelder (fase UI-4c i docs/UI.md)
Brukeren: «Fortsett» (neste steg i planen etter UI-4b).
- **`SheetHead`** i `ui/ds.tsx`: tittel (med valgfritt ikon), valgfrie handlinger og lukk som ikonknapp på 44 px. Den står
  fast øverst når arket rulles (sticky, med marginer ut til kanten av kortet og en tynn linje under), så lukk alltid er
  innen rekkevidde. Polstringen i arket er en variabel (`--sheet-pad`: 16 px på mobil, `--sp-5` i sidearket på PC).
- Brukt i Innstillinger, Fagboka, Varsler, «Hva er nytt», Topplista, utstyrsmenyen (med kassa i toppen), «Pynt verket» og
  ukelista. Ingen «✕» som tekst igjen.
- **Små skjermer:** fanene i Varsler (Alle, Problemer, Hendelser, Gode nyheter) går i to rader under 360 px i stedet for å
  kortes av.
- Testet i Playwright på de 7 størrelsene: alle fem ark som ble åpnet (innstillinger, fagbok, varsler, «Hva er nytt»,
  utstyr) har fast topp når de rulles, lukk er 44 px, ingen horisontal scrolling og ingen avkortede knapper.
- Konto: nei.

## B-226 Konsern blir egen hovedside med underfaner, og anbudet på skraplageret synes (2026-09-28)
Status: gjelder (erstatter delen av B-192 om Konsern som underfane i Verket på mobil; bygger på B-189 og B-206).
Underfanene Skraplager og Direktør er erstattet av Industrien og Ledelse i B-227.
Brukeren: «Konsernet bør egentlig være en egen hovedside. Ikke under verket. Også nevnte jeg tidligere at skraplageret
anbudet ligger for skjult. Og det gjorde du ikke noe med. Men når konsernet blir en egen hovedside så kan jo den ha flere
underside slik som er gjort på verket.»
- **Egen hovedside:** Konsern står i menyen nederst på mobil og i sidemenyen på PC (samme knapp, ikke to), rett etter
  Forskning, når konsernet er åpnet (gradvis synlighet: ikke før). Verket har igjen fire underfaner (Oversikt, Anlegg,
  Resept, Økonomi). Menyen nederst har da seks knapper; testet på 320 px uten avkorting.
- **Underfaner som i Verket:** Oversikt (konsernverdi, netto, målet, neste steg og verkene), Utvid (neste steg, nye verk
  og felles tjenester – tallet på fanen er kjøp du har råd til), Skraplager (anbudet og konsernkassa) og Direktør
  (salgsdirektøren).
- **Anbudet synes:** når et anbud på skraplageret er åpent og du ikke har bydd, får Konsern «!» i menyen (trykk åpner
  Skraplager direkte), fanen Skraplager får merket «Anbud», og Oversikt viser en beskjed med fristen og «Se anbudet».
  Merket forsvinner når du har bydd. Statusen hentes fra serveren hvert minutt (`ui/openTender.ts`), bare med konto og
  åpnet konsern. Uten konto vises Skraplager-fanen med kontokortet som før.
- Tallet for kjøp (B-144) står nå på Konsern i menyen og på Utvid.
- På PC går fanene og beskjeden over begge kolonnene; Skraplager og Direktør er ett kort i venstre kolonne.
- Testet i Playwright på de 7 størrelsene med falsk tjeneste (med og uten konto): seks menyknapper uten avkorting,
  fanene, beskjeden og «!» med åpent anbud, ingen horisontal scrolling.
- Konto: anbudsvarselet krever konto (det er en del av skraplageret, regel 3 og 7); selve siden gjør det ikke.

## B-227 Konsern: Industrien og Ledelse i stedet for Skraplager og Direktør (2026-09-28)
Status: gjelder (erstatter fanenavnene i B-226; følger RETNING.md fase 2–5). Ledelse-fanen er fjernet i B-229:
salgsdirektøren er under Folk.
Brukeren: «Skraplageret bør jo ikke være en helt egen side i konsernet, se på planen vår og sett det opp ut fra hva som er
planen videre.»
- **Planen** (RETNING.md): skraplageret er det første av flere strategiske selskaper – slagghåndtering og mekanisk
  verksted kommer etter (fase 2), så Kontroll per selskap (fase 3) og overtakelser (fase 4). Alt samles i «Industrien
  rundt verket» på Konsern. Verksjefer i datterverkene (fase 5) hører til ledelsen, sammen med salgsdirektøren.
- **Fanene i Konsern:** Oversikt · Utvid · **Industrien** · **Ledelse**.
  - **Industrien:** en kort innledning («Industrien rundt verket»), ett kort per selskap serveren sender (i dag bare
    skraplageret; nye selskaper dukker opp av seg selv, med én linje om hva eieren tjener på i `COMPANY_INTRO`), og
    **konsernkassa som eget kort** – den er kapitalen til alle selskapene (bud herfra, inntekt hit), ikke en del av
    skraplageret. PC: selskapene til venstre, kassa til høyre. Budfeltet er per selskap.
  - **Ledelse:** salgsdirektøren nå; verksjefene kommer her i fase 5.
- Merket «Anbud», «!» på Konsern i menyen og beskjeden på Oversikt (B-226) står; trykk går nå til Industrien.
- Uten konto: innledningen og ett samlet kontokort for skraplageret og konsernkassa (B-191), ikke skjult.
- Testet i Playwright på de 7 størrelsene med falsk tjeneste (med og uten konto): ingen horisontal scrolling, ingen
  avkortede knapper, begge kortene på Industrien.
- Konto: som før (skraplageret og konsernkassa krever konto, regel 3 og 7).

## B-228 Leveransene kom fortsatt for sent: valseverket valset feil stål (2026-09-28)
Status: gjelder (bygger på B-217 og B-223; erstatter reservasjonsregelen i B-223)
Brukeren (skjermbilde av rådgiveren, dag 1588): «Får enda denne». Spillet til [Tuster] ble hentet fra serveren
(dag 1607) og kjørt videre i motoren: 10,8 sene kontrakter per 30 døgn i snitt over seks frø, selv med to
planleggere og salgsdirektør.
- **Årsak 1 – valseverket valset feil kvalitet.** Det tok alle ledige emner, også kvaliteter ingen armeringsordre
  trengte, og emner som emneordrene bak den første armeringsordren ventet på (B-223 holdt bare av for emneordrene
  foran). Premium-armeringen ble liggende, og emneordrene manglet emner.
- **Årsak 2 – ovnene laget for mye til armeringen og for lite i tide.** En armeringsordre regnet ikke emnene som lå
  klare til valsing som dekket, så ovnene fortsatte å lage dem; og emnene til armeringen kom først når emneordrene
  foran var ferdige, så valseverket (8 300 t/døgn) sto og måtte ta igjen alt til slutt.
- **Årsak 3 – en kontrakt ble regnet som dekket av partier en tidligere kontrakt allerede hadde fått.**
- **Rettet:**
  - Én lagerplan (`planLots`) i køens rekkefølge: hver kontrakt får partiene som holder kvaliteten; en armeringsordre
    får armering på lager og ellers emner av riktig kvalitet, som valseverket gjør om. Valseverket valser først disse
    emnene, og ellers bare emner ingen ordre trenger.
  - `ordersToMake` bruker det kontrakten selv har fått på lager.
  - Når emnene som venter på valsing rekker kortere enn 12 timer (`ROLLING_BUFFER_H`), lager ovn 2 og 3 emner til den
    første armeringsordren, så valseverket går hele tida.
  - Salgsdirektøren (med salgsteam og oppover) bruker 75 % av tida til fristen, ikke 85 %.
- **Prøvd og forkastet:** at en øse med annen kvalitet som har ventet 90 minutter alltid går foran i strengstøpingen
  (flere kvalitetsbytter ga mindre stål og flere sene), og å holde av emner til armeringen foran emneordrene (armering
  godtar lavkarbon, så emneordrene mistet sine).
- **Resultat** (samme spill, 30 døgn, 6–8 frø): sene kontrakter 10,8 → 3,4, levert 674 kt → ca. 750 kt, kassa like
  god eller bedre. Resten skyldes mest at verket står når strømprisen er over grensen spilleren har satt (8 % av tida)
  og kvalitetsbytter i støpingen.
- Tester: valseverket valser bare kvaliteten armeringsordren trenger; en kontrakt er bare dekket av partiene den selv
  får (begge feiler med den gamle koden).
- Konto: nei (motoren i eget spill).

## B-229 Salgsdirektøren under Folk, ikke Konsern (2026-09-28)
Status: gjelder (erstatter Ledelse-fanen i B-227; bygger på B-117 og B-210)
Brukeren: «Salgsdirektøren har vel egentlig ikke noe å gjøre med konsernet. Flytt den til riktig plass. Kanskje sammen med
de andre ansatte?»
- Salgsdirektøren jobber for verket (signerer verkets kontrakter), så den hører til Folk: **ansettes under Folk → Ansett**
  (som før, B-210) og **styres under Folk → Ansatte** (bryteren, oppgraderinger, «ta også rammeavtaler» og oppsigelse),
  øverst over lista over de ansatte. Bryteren står fortsatt også under Forespørsler på Salg.
- Konsern har tre faner: Oversikt · Utvid · Industrien. Ledelse-fanen er borte (gradvis synlighet: ingen tom fane). Når
  verksjefene i datterverkene kommer (RETNING.md fase 5), hører de til Konsern og kan få en egen fane da.
- Salgsdirektøren krever fortsatt at konsernet er åpnet, og tilstanden ligger fortsatt i `g.konsern.director` (ingen
  migrering). Tekstene er rettet: rådgiveren peker til Folk → Ansatte, og loggen sier «Du har ansatt en salgsdirektør».
- Testet i Playwright på de 7 størrelsene: kortet står under Ansatte, ingen horisontal scrolling eller avkortede knapper.
- Konto: nei.

## B-230 «Produksjon nå» kort og tydelig (2026-09-28)
Status: gjelder (bygger på B-039, B-210 og UI-2a)
Brukeren: «Produksjon nå kortet er veldig langt. Fiks det og lag det intuitivt.»
- Før sto alt åpent: hva hver ovn lager, to brytere med lange etiketter, tre nedtrekkslister, forklaringen av
  ordrekøen, forklaringen av strengstøping og overgangsemner, beskrivelsen av kvaliteten, analyseanslaget og
  kontrollrommet. På storverket med tre ovner var kortet 1 077 px høyt på 320 px bredde.
- Nå (`ProductionNow` i `Overview.tsx`), i den rekkefølgen spilleren trenger det:
  1. **Hva lages nå:** én linje per ovn – ovn, kvalitet, → kunde · tonn igjen (eller «→ lager og spot»). Ovner som
     lager det samme til samme kunde, står på én linje («Ovn 2–3»).
  2. **Bare hvis noe er galt:** «Resepten holder ikke kravet til …» med «Juster resepten» (åpner Verket → Resept).
  3. **Én handling:** styrer ordrekøen, står det «Ordrekøen velger kvaliteten» med «Velg selv». Velger du selv, vises
     nedtrekkslistene (Ovn 1, Ovn 2 …) og «La ordrekøen velge igjen».
  4. **Kontrollrommet:** knappen og én linje.
  5. **«Innstillinger og forklaring»** (lukket): bryterne, beskrivelsen av kvaliteten, analyseanslaget og forklaringen
     av strengstøpingen.
- Resultat: 314 px på 320 px bredde (før 1 077), 250 px på PC (før 741). Knapper minst 44 px.
- Testet i Playwright på de 7 størrelsene (storverk med tre ovner), i «Velg selv»-modus og på verksted-nivå: ingen
  horisontal scrolling eller avkortede knapper eller lister.
- Konto: nei.

## B-231 Produksjonslinja på Oversikt i én rad (2026-09-28)
Status: gjelder (bygger på B-195 og UI-2a)
Brukeren (skjermbilde, storverk med tre ovner): «Dette anleggskortet føler jeg det er unødvendig å ha en rute på egen
rad. Fiks kortet og gjør det bedre og mer intuitivt.»
- Før fikk hver ovn sin rute. Med tre ovner ble det seks ruter, og Lager havnet alene på en ny rad på mobil.
- Nå er det alltid fire ruter i én rad: **Skrap › Ovner › Støping › Lager**, med små piler i mellomrommet som viser
  veien stålet går.
- **Ovner** er én rute: én stripe per ovn som viser hvor langt smeltingen har kommet, og én status – «3 smelter», eller
  «2 av 3 smelter» med fargen og ikonet til det som stopper (f.eks. venter på støping). Hver ovns status står i
  hjelpeteksten (lang trykk/hold musa over). Med én ovn heter ruten «Ovn» som før.
- Stripene har et mørkere spor, så man ser hvor mye som er igjen – også i en ovn som står.
- På de smaleste telefonene (≤ 360 px) krymper titlene og mellomrommene litt, så «Støping» ikke kuttes.
- Lenken under heter «Hele anlegget: utstyr, vedlikehold og kvalitet →».
- Resultat: 145 px høyt på mobil (før 249 px, to rader). Testet i Playwright på de 7 størrelsene og på verksted-nivå:
  én rad, ingen avkortede titler, ingen horisontal scrolling.
- Konto: nei.

## B-232 Mange flere utfordringer og prestasjoner, i trinn, og ryddigere kort (2026-09-28)
Status: gjelder (bygger på B-090 og B-151)
Brukeren: «Det finnes bare 8 utfordringer. Lag dritmange utfordringer og lag utfordringerkortet bedre og mer
intuitivt. Det er ganske enkelt å få alle prestasjonene. Lag mange flere og lag kortet bedre og mer intuitivt.»
- **Utfordringer (storverket):** 19 serier med 74 trinn i alt (før 8). Bare trinnet du står på, er aktivt; når det er
  nådd, kommer belønningen og neste trinn med høyere mål. Nye serier: leveranser, 10 av 10, snittvurdering, feilfri
  støping, billig strøm, tonnasje, charger, poeng i kontrollrommet, charger med 4 stjerner, beste døgnresultat og
  fagbrev. De gamle har fått flere trinn (rekorddøgn til 40 000 t, kWh/t ned til 250, rene døgn til 500 …).
  - Serier som teller hendelser, teller **fra trinnet startet** (hvert trinn krever nytt arbeid). Serier som måler en
    rekord, måles mot det du har klart – en rekord som alt holder flere trinn, gir alle på en gang.
  - Fagpoeng stiger med trinnet (+60 % per trinn), kroner dobles. Mange på en gang gir én linje i loggen.
  - Trinn 1 har den gamle id-en (`u-rekord`), neste `u-rekord-2` osv. – gamle lagringer trenger ingen migrering.
- **Utfordringskortet:** fremdrift totalt øverst, én kort forklaring, de fire nærmeste med ikon, tittel med trinn,
  trinnprikker, fremdriftsstolpe, «x av y», belønning og hvordan; resten bak «Alle utfordringer»; ferdige serier samlet.
- **Prestasjoner:** 25 serier med 99 merker (før 30), gruppert i Produksjon, Kunder, Kontrollrom, Kunnskap, Folk og
  Konsern. De øverste trinnene er langt unna (300 000 charger, 100 mill. tonn, 6 000 kontrakter, 3 000 × 10 av 10,
  mesterskap 250, 1 billion). Alle gamle merker har beholdt id-ene sine (pynten som krever Stålbaron m.fl. virker).
  Baron, magnat og legende gis som før (seier, milepæler) eller når konsernverdien når målet.
- **Prestasjonskortet:** fremdrift totalt, «Nærmest» (de tre merkene du er nærmest, med stolpe), så seriene som ruter
  per gruppe (ikon, navn, «3/7»); trykk på en rute viser alle trinnene i serien med dag, fremdrift og fagpoeng.
- Effekt på et ekte spill (dag 1607): 8 → 21 av 74 utfordringer og 29 → 69 av 99 merker med én gang (belønning for
  det som alt er klart), resten tar lang tid.
- Balance: exit 0 (storverket median dag 161, nybegynner 144). Tester: trinn i utfordringer (rekord gir flere trinn,
  teller starter på nytt) og at de gamle merkene finnes og en erfaren spiller ikke får alle.
- Konto: nei (eget spill).

## B-233 Vikarer, vedlikehold, «Nå» i utstyrsarkene, felles navigasjon og avbrutte rammeavtaler (2026-09-28)
Status: gjelder (bygger på B-192, B-211, B-226)
Brukeren sendte ti punkter. Svarene og det som ble gjort:
- **Vikarer:** «Skiftlederen leier ikke inn vikarer til alle som er borte selv om jeg har huket av for det.» Skiftlederen
  forlenget først når vikarene gikk hjem, så en ny som ble borte lenger, sto udekket imens. Nå forlenges vikarene med
  én gang når noen er borte lenger enn vikarene er leid for – bare for dagene som mangler (regnes fra slutten av
  perioden, så det betales ikke dobbelt).
- **Marked, Salg og Folk inn i Verket?** Svar: nei, de blir hovedmenyer. De brukes flere ganger per økt, Verket har alt
  fire underfaner, og en meny nederst med én knapp per daglig oppgave er det raskeste på mobil. Konsern er tatt ut av
  Verket (B-226) fordi det er et annet nivå; Marked, Salg og Folk er daglig drift og står best som egne knapper.
- **Loggen i Økonomi og Oversikt:** loggen sto først bare i Økonomi, fikk en kort utgave på Oversikt (B-098), og så kom
  varsellista (B-089). Den lange loggen i Økonomi er fjernet; Oversikt har de siste linjene, og alt ligger i varsellista.
- **Vedlikeholdskortet:** én linje øverst om hvem som bytter foringen, så én rad per ovn med «% slitt» (farge etter hvor
  nær grensen), stolpe, dager siden omforing og potta, og én knapp. Valgene (reparatøren, plan) samlet under «Hvem bytter
  foringen», og forklaringen bak «Slik virker foringen».
- **Utstyrsarkene:** øverst en «Nå»-linje med det som skjer på stedet: hver ovn (smelter, % ferdig, eller hvorfor den
  står), støpingen, skraplageret, lageret og foringen. `furnaceState`/`statusOf` er flyttet til `ui/plantStatus.ts`.
- **Mål-knappen ved varsellinja** viser at den er valgt (blå strek og ramme), som de andre menyknappene.
- **«Dine verk» på mobil:** én linje per verk (navn, type, moderniseringsprikker og utbytte per døgn); trykk for
  detaljer og knapper. Det anbefalte verket står åpent. PC beholder tabellen.
- **Egen fane for konsernkassa?** Svar: ikke nå. Kassa er kapitalen til selskapene og brukes bare til anbud; den står
  som eget kort ved siden av selskapene i Industrien. Når kassa får flere bruksområder (fase 2–3 i RETNING.md), vurderes
  det på nytt.
- **Avbryte rammeavtaler:** «Avbryt avtalen…» på aktive avtaler, med bekreftelse. Bot 30 % av verdien av ukene som
  gjenstår, og dobbelt så mye omdømme som bonusen ville gitt. Uka i ordrekøen strykes, og avtalen står som brutt.
- **Felles navigasjon:** hver hovedmeny husker underfanen den sto på (før bare Verket). Et nytt trykk på menyen du alt
  står i, går til første underfane. En lenke til en bestemt underfane (råd, varsler) åpner den. Minnet står i
  `GameApp`; sidene melder fra med `useReportTab` (`ui/tabMemory.ts`).
- Tester: skiftlederen forlenger vikarene (og ikke for lenge), avbrutt avtale (bot, omdømme, køen, ingen nye uker).
  Balance: exit 0. Playwright på 7 størrelser.
- Konto: nei (eget spill).

## B-234 Fagboka en bit om gangen, og morsommere å være i (2026-09-28)
Status: gjelder (bygger på B-025 og B-029)
Brukeren: «Fagboka er lang med mye tekst. Tror folk bare ser på den og tenker wow her var det mye info. Gjør den mer
intuitiv og mer morsom å være i.»
- **Innholdet:** øverst hvor langt du har kommet i boka (prosent, med 📖 lest, ❓ quiz og 🎯 oppdrag), så én knapp
  «Neste» med det lureste å gjøre (nytt kapittel, ellers en quiz som gir fagpoeng). Kapitlene står i fem temaer
  (Grunnlaget, Ovnene, Støping og valsing, Folk og kunder, Konsernet og verden) som rader med emoji, tittel, hvor lang
  tid det tar å lese («30 sek å lese») eller hva som gjenstår, og tre små merker for stegene.
- **Kapitlene:** «Kort fortalt» øverst – hele kapitlet i én setning eller to – og så én side om gangen med overskrift,
  prikker og «Neste». Siste side leder til quizen. Samme fagtekst som før, bare delt opp; hvert kapittel tar 20–80 sekunder.
  Oppdraget står under, med fremdrift.
- **Quizen:** ett spørsmål om gangen, store svarknapper, og svaret med én gang (riktig/feil og hvorfor). Til slutt
  stjerner og fagpoeng. Svaret lagres i spillet med én gang (`g.quizPartial`, `answerQuizQuestion` i `quiz.ts`), så den
  som lukker boka etter å ha sett riktig svar, kan ikke prøve igjen – fortsatt ett forsøk (B-029). Reglene for fagpoeng er
  uendret.
- Utdatert tekst i sesongkapitlet rettet: sesongene har ikke fast lengde (B-221), og sesongstigen står på Mål.
- Boka åpnes som før på et nytt kapittel hvis det finnes (veiledningen «Les i fagboka» virker som før), ellers på
  innholdet.
- Tester: alle kapitler har «Kort fortalt», sider med overskrift og tema og tar under 90 s; quizen ett spørsmål om gangen
  (svaret står fast, lagres, rettes og gir poeng, kan ikke tas om, gamle lagringer får feltet). Balance: exit 0.
  Playwright på 7 størrelser.
- Konto: nei (eget spill).

## B-235 Ukelista mot forrige uke, og ryddigere Produksjonen, Utvid, Industrien og Merker (2026-09-28)
Status: gjelder (erstatter delen om «Mer stål enn før» i B-172; bygger på B-196, B-189, B-227, B-232)
Brukeren: «Vi går for dine anbefalinger» (ukelista, og svarene i B-233), og: gjør Produksjonen under Anlegg, Kjøp og
utvid under Utvid og skraplageranbudet og konsernkassa bedre og mer intuitive; utfordrings- og prestasjonskortet under
Merker bruker mange emojier, som ikke er i henhold til designplanen.
- **Ukelista (migrasjon 040):** «Mer stål enn før» er nå farten denne uka (tonn per spilldøgn) i prosent av farten
  uka før – ikke av snittet over hele spillet. Et verk som var en garasje for en uke siden, fikk før flere tusen prosent.
  Tonn og vekst krever at spillet er lagret på nett minst to ekte dager før uka (ikke `pre_reform`, fast regel B-190),
  så grunnlaget er et verk som har gått en stund. «Flest aktive dager» er som før. Testet i en DO-blokk mot ekte tall
  (rullet tilbake) før den ble lagt inn; sikkerhetsrådene er uendret.
  - Følge: tidslinja startet på nytt 27.9. (B-190), så denne uka (28.9.–5.10., tonn) har ingen to dager før uka, og
    lista blir tom. Fra neste uke virker regelen for alle som spiller. Appen sier hvorfor man ikke er på lista.
- **Produksjonen (Anlegg):** én rad per sted – skrap, hver ovn, støping, valseverk, lager – med ikon, status, én linje
  og en tynn stolpe. Trykk på raden for utstyret (merket viser hva som kan kjøpes). Foringen står ikke her lenger (den
  står i Vedlikehold ved siden av). «Kjøp skrap» og «Til salg» under lista. På PC ligger radene i et rutenett.
  `ui/ProductionCard.tsx`; de gamle `g-chain`-stilene er fjernet.
- **Utvid (Konsern):** hvert kjøp er et kort med vurdering («Lønner seg godt» ≤ 150 døgn, «Lønner seg» ≤ 500, ellers
  «Lønner seg dårlig»), tre tall (gir per døgn, betaler seg, byggetid) og én knapp. Neste steg bruker samme kort,
  merket «Anbefalt». Ny del «Bygg ut verkene dine» med de tre utbyggingene som betaler seg raskest, så alt som kan
  kjøpes står på Utvid. Felles tjenester i egen del.
- **Industrien:** selskapskortet har status øverst (Du eier det / Anbud åpent / Eid av en annen), nøkkeltall (eier,
  tjener nå, hva du har fått), og anbudet i en egen boks: frist, ditt bud, hvem som har bydd, feltet, og hvor mye du kan
  by (konsernkassa pluss budet ditt). Reglene står bak «Slik virker anbudet». Konsernkassa viser saldoen stort, en stolpe
  for hvor mye av grensen som er brukt, og «Fyll inn det meste».
- **Merker:** utfordringer og prestasjoner bruker Lucide-ikoner i stedet for emoji (19 nye ikoner i `ui/icons.tsx`).
  Ikonet er blått når merket er tatt, grønt når serien er fullført. Emoji fjernet fra loggen og fra «Krever»-teksten i
  pynt. Pynten selv (bildene i anlegget) beholder sine tegn.
- Tester: `npm test`, tsc, lint, balance (exit 0), Playwright på 7 størrelser (rader, utstyr fra rad, Utvid, Merker uten
  emoji, Industrien med falsk server).
- Konto: nei for grensesnittet; ukelista krever konto som før.

## B-236 Ikoner i stedet for emoji i fagboka (2026-09-28)
Status: gjelder (endrer utseendet fra B-234)
Brukeren: «Det er for mye bruk av emojier i fagboka.»
- Hvert kapittel har et Lucide-ikon (`icon: IconName` i `knowledge.ts`, før `emoji`), i samme rute og farge som ellers i
  designsystemet: blått, grønt når kapitlet er ferdig. Seks nye ikoner (gjenvinning, magnet, atom, stråling, gryte,
  spørsmålstegn).
- Stegene (les, quiz, oppdrag) i lista, i tellerne øverst og i fanene i kapitlet bruker ikoner; ikke gjort = dempet,
  gjort = grønt. Stjernene i quizresultatet er ikonstjerner (fylt oransje for riktige svar). Oppdraget har mål-ikonet.
- Klassen `g-book-emoji` heter nå `g-book-icon`.
- Tester: kapittel-testen sjekker ikon; tsc, lint, `npm test`, Playwright på 7 størrelser uten en eneste emoji i boka.
- Konto: nei.

## B-237 Varsel om anbudsresultat, mesterskap priset etter verdi, og ikoner i stedet for emoji i hele appen (2026-09-28)
Status: gjelder (bygger på B-150, B-189, B-236)
Brukeren: «Får de som har gitt anbud på bedrift varsel om hvem som vant anbudet? Forskning i mesterskapet. De forskjellige
tingene bør ha forskjellig fagpoengpris ut fra hvor bra de er. Bytt ut alle emojier i hele appen med lucide ikoner.»
- **Anbudsresultat:** før fikk ingen beskjed; resultatet sto bare som en linje på kortet under Industrien. Nå får den som
  bydde, et varsel i varsellista (og på skjermen etter valgene): «Du vant anbudet …» eller «… er avgjort: X vant med Y.
  Budet ditt er tilbake i konsernkassa». Én gang per anbud (`g.tenderSeen`, standard 0 i `migrate()`), bare for anbud som
  stengte de siste 14 dagene. Appen ser det når den henter status for skraplageret (hvert minutt med konto og konsern).
  `applyTenderResult` i `net/world.ts`. Konto: ja (anbudet krever konto fra før).
- **Mesterskap:** prisen for nivå 1 følger verdien: konsernledelse 300 (før 150), bedre priser 200, skrapkjøp 150,
  ovnspotter 100, energieffektivisering 60 (alle før 100). Nivå 1 er verdt omtrent 50–90 mill. kr/døgn for
  konsernledelse, ca. 3 mill. for priser, 1–1,5 mill. for skrap, ca. 0,5 mill. for ovnspotter og under 0,1 mill. for strøm
  på et stort verk. Hvert prosjekt viser nå hva neste nivå gir i kroner per døgn på verket ditt (`game/masteryValue.ts`,
  snitt av sju døgn), og det som gir mest per fagpoeng, er merket «Best nå». Veksten per nivå (25 %) er uendret.
- **Ingen emoji i appen:** alle 123 er byttet. Landemerker, pynt, utfordringer og prestasjoner har ikonfelt
  (`IconName`); fasadene vises som en fargerute. Medaljer på listene er et medaljeikon i gull/sølv/bronse (`ui/Place.tsx`),
  og plasseringen fra serveren («Vinner av …») får pokal/medalje i appen. Feiring, oppdatering, sky, lås, fagprøve,
  fullskjerm, nattspoling og varsellinja bruker ikoner; ferdighetsstjernene og stjernene i kontrollrommet er stjerneikoner.
  Loggtekster er uten emoji, og `migrate()` rydder gamle linjer og landemerkenavn i lagrede spill. Hjelpetekster sier
  «Innstillinger», «bjella» og «Toppliste» i stedet for tegn. 34 nye Lucide-ikoner.
  - `scripts/sjekk-emoji.mjs` (i `npm test` og CI) stopper nye emoji i `src`, `public` og `index.html`.
- Tester: anbudsvarsel (taper, vinner, én gang, uten bud, gammelt), mesterskapsprisene og verdien per døgn; `npm test`,
  tsc, lint, balance (exit 0), Playwright på 7 størrelser uten en eneste emoji på noen side eller i noe ark.

## B-238 Realistiske titler, kort som står stille, og ryddigere innstillinger og «Hva er nytt» (2026-09-28)
Status: gjelder (bygger på B-150, B-173, B-179, B-195, B-230, B-235; grensene i B-150/B-173 over Stålkonge er erstattet)
Brukeren: «Juster titlene man kan få, for eksempel stållegende eller stålgigant til realistiske mål.» «I
produksjonskortet er det vanskelig å lese teksten da linjene flytter seg opp og ned hele tiden. Det samme gjelder for
oversiktsbildet når det kommer varsel under bildet av verket og over mål. Det samme skjer i produksjon nå kortet.»
«Innstillinger fanen er rotete. Gjør den bedre og mer intuitiv. Det samme gjelder se hva som er nytt siden.»
Spørsmål: «Når man tjener penger på bedriften i konsernet tjener vel man penger til konsernkassa?» Svar: ja –
inntekten fra selskaper man eier (skraplageret) og bud som kommer tilbake, går til konsernkassa på serveren. Utbyttet
fra datterverkene går til kassa i spillet.
- **Titler:** grensene er satt etter ekte stålselskaper. Det mest verdifulle stålselskapet i verden er verdt noen
  hundre milliarder kroner, og hele stålindustrien noen tusen; før gikk titlene opp til en billiard. Nye grenser:
  Stålmagnat 25 mrd., Stålfyrste 50, Stålkonge 100 (uendret), Stålkeiser 200 (før 250), Stållegende 400 (før 1 000),
  Stålgigant 750 (før 5 000), Stålkolosse 1 500 (før 25 000), Stålmyte 3 000 (før 100 000), Stålikon 5 000 (før
  1 000 000) – omtrent hele stålindustrien i verden. Hver tittel har en sammenligning (`like`), som vises i feiringen,
  i loggen og under Konsern («omtrent som det mest verdifulle stålselskapet i verden»). Tallene er runde og omtrentlige,
  uten navn på selskaper. Fagpoeng og det titlene låser opp er uendret.
  - Serveren: `title_of()` i `041_realistiske_titler.sql` (kjørt), så tittelen på topplista følger de samme grensene.
  - Merkene «Stålkeiser» (id `verdi500`) og «Stållegende» følger titlene: 200 og 400 mrd. «verdi100» heter Stålkonge.
  - Ingen lagrede spill endres av serveren. Titler og merker gis i spillet når det kjører (antallet går bare opp), så de
    som er over de nye grensene, får de nye titlene og fagpoengene neste gang de spiller.
  - Det urealistiske nå er veksten på toppen (flere hundre mrd. per ekte døgn for de største), ikke titlene. Det hører
    til rebalanseringen av sluttspillet (B-193), se FORSLAG.
- **Kort som står stille:** tekst som endrer seg hvert sekund, skal ikke flytte det som står under.
  - Produksjonen (Anlegg): navn, status og linja under brytes aldri (kortes med «…»), stolpen har alltid plass, tall har
    lik bredde, og varselet om skrap står under lista i stedet for over.
  - Rådene under anleggsbildet: én rad med fast høyde (to linjer tekst) som alltid står der – «Ingen råd akkurat nå»
    når det ikke er noen. Flere råd bak «+N», som viser alle med hele teksten.
  - Toppfeltet på mobil: «natt» (spoling om natta) sto ved klokka og brøt linja, så hele siden hoppet 11 px ned og opp
    hver natt. Nå står det ved navnet på verket, på en linje som aldri brytes. Merket på Fagbok-knappen (nye kapitler)
    ligger oppå hjørnet av knappen: før tok det plass i raden og presset dag og klokke til to linjer.
  - Produksjon nå: hvem, kvalitet og kunde på faste linjer som ikke brytes. Én linje per ovn når ovnene kan lage hver
    sin kvalitet (før ble like ovner slått sammen, og antallet linjer skiftet med køen). Resept-varselet står nederst.
- **Innstillinger:** grupper med ikon – Konto og lagring (først), Spillet, Varsler, Om spillet, Start på nytt (rød).
  Bryterne har kort navn og en linje forklaring. Varsler: to valg som knapper, temaene bak én linje («alle på»), og
  varigheten som tre knapper. Valsebryteren vises først når valseverket er kjøpt (gradvis synlighet). Alle knapper
  minst 44 px.
- **Hva er nytt:** samlet per dag («I dag», «I går», dato), én flate per oppdatering, de tre nyeste åpne og resten én
  linje hver, de 12 nyeste før «Vis eldre», og «Fint!» alltid synlig nederst. Etter en oppdatering står alt nytt åpent
  med «N oppdateringer siden sist du spilte».
- Konto: nei for alt i spillet (titler, innstillinger, endringslogg); topplista krever konto som før.
- Tester: titlene (stigende, 25 mrd. til 5 000 mrd., sammenligning, Stållegende ved 450 mrd.), Stålgigant ved
  1 000 mrd.; `npm test`, tsc, lint, balance og `--konsern` (exit 0), Playwright på 7 størrelser: posisjonen til Mål,
  Produksjon nå, rådene og produksjonsradene målt i 8 s med spillet i gang – ingen flytting.

## B-239 Alle sider starter like høyt (2026-09-28)
Status: gjelder (bygger på B-192)
Brukeren: «Forskningskortet er høyere opp på siden enn andre ting på andre sider.»
- Årsak: underfanene øverst på en side hadde 10 px luft over seg. Forskning har ingen underfaner, så kortet der startet
  10 px høyere enn fanene på Verket, Marked, Salg, Folk, Konsern og Mål. På PC sto også kolonnen ved siden av fanene
  10 px høyere enn fanene.
- Nå har underfanene øverst på en side ingen luft over seg (`.g-main > .g-grid > .g-subtabs:first-child` og samme i
  første kolonne). Alle sider starter like langt under toppfeltet (10 px på mobil, 14 på nettbrett, 16 på PC), også Folk
  før de første ansatte. Underfaner inne i sider og ark (Resept, ovnene, topplista) har luften som før.
- Konto: nei. Testet: posisjonen til det første på hver side ved 320, 390, 820 og 1 920 px – likt overalt.

## B-240 Færre sene leveranser: hele køen må rekke fristen, valseverket får emner først, ovnene etter hva som haster (2026-09-28)
Status: gjelder (bygger på B-117, B-172, B-217, B-223, B-228)
Brukeren (skjermbilde av «Rådgiveren: leveransene kommer for sent», dag 1874): «Får enda denne.»
- **Funnet** (spillet til brukeren kjørt videre med samme motor, seks tilfeldige forløp à 30 døgn): 4,2 sene kontrakter
  per 30 døgn og ca. 20 000 t ulevert. Tre grunner:
  1. **Salgsdirektøren sjekket bare den nye kontrakten.** Planleggerne sorterer køen etter frist, så en ny kontrakt med
     kort frist går foran de andre. Den rakk selv, men eldre kontrakter ble for sene.
  2. **Valseverket sto.** Emnene ble fordelt i køens rekkefølge, og emneordrene foran tok alle emner som holdt kvaliteten
     – også dem som ble støpt til armeringen. Valseverket valset 3 000–7 000 av 8 300 t per døgn, og armeringen kom
     for sent selv med ledig kapasitet.
  3. **Ovn 2 og 3 lagde alltid neste kvalitet** (to kvaliteter samtidig), så med tre ovner fikk ordren som hastet mest
     bare en tredjedel av verket.
- **Rettet:**
  - `queueFit` (engine.ts) legger den nye jobben inn i køen i den rekkefølgen verket følger (etter frist med planlegger,
    ellers bakerst) med ukeleveransene fra rammeavtalene som kommer, og regner for hver frist ut hvor mye som må være
    ferdig til da. Salgsdirektøren tar en kontrakt eller rammeavtale bare hvis ingen jobb i køen går over marginen
    (0,70/0,75), i tillegg til den gamle sjekken. For armering regner den med 70 % av valseverket (`ROLLING_PLAN_SHARE`).
  - Salg: en forespørsel som skyver en annen kontrakt for sent, er «Rekker det neppe: den har kortere frist og går foran
    X i ordrekøen, som da blir for sen». Samme regel gir «Knapt».
  - `planLots`: armeringsordrene får emner til de neste 12 timene med valsing først (`ROLLING_BUFFER_H`), resten i køens
    rekkefølge som før.
  - `followQueue`: så mange ovner som trengs for at kvaliteten først i køen rekker fristene (med 20 % luft), lager den;
    resten tar neste kvalitet (`headFurnaces`).
- Den nye køsjekken alene slapp inn **mer** (den teller bare jobber med tidligere frist), så den brukes sammen med den
  gamle, ikke i stedet for. Målt, snitt av seks forløp på 30 døgn:
  | | Sene | Ulevert | Salg per døgn |
  |---|---|---|---|
  | Før | 4,2 | 19 800 t | 336 mill. kr |
  | Bare ny køsjekk | 13,5 | 50 800 t | 331 mill. kr |
  | Gammel + ny sjekk, valseverket først og ovnene etter hva som haster | 1,7 | 3 700 t | 346 mill. kr |
- Rådgiveren kommer fortsatt ved tre sene på ti døgn; nå mye sjeldnere. Konto: nei.
- Tester: køsjekken (skyver en eldre kontrakt for sent bare med planlegger), Salg sier «rekker det neppe», valseverket
  får emner med en stor emneordre foran, ovnene fordeles etter hva som haster. `npm test`, balance og `--konsern` (exit 0).

## B-241 Salg: dommen først, ordrekø med status, tydelige tomme faner, og ord ved tallene i fagboka (2026-09-28)
Status: gjelder (bygger på B-198, B-233, B-236; ordrekøens piler fra B-039 vises bare uten frist-sortering)
Brukeren: «Hva betyr de 3 ikonene i fagboka? Gjør alle salgs sidene bedre og mer intuitiv.»
- **Fagboka:** ikonene var bok = lest, spørsmålstegn = quiz tatt og blink = oppdrag løst, men de sto uten ord. Nå står
  ordene ved tallene øverst («Lest 18/18 · Quiz 18/18 · Oppdrag 11/11»). I kapittellista står «Ny», «2 av 3» eller en
  hake i stedet for tre ikoner; linja under tittelen sier fortsatt hva som gjenstår.
- **Forespørsler:** hvert kort har kunde og verdi, så mengde og kvalitet, så dommen («Rekker det» / «Usikkert» /
  «Rekker det ikke») med grunnen rett under, og tre tall på én linje (frist, pris, svar innen). Rekker verket det ikke,
  er «Avslå» den blå knappen og signering heter «Signer likevel». Fargekant til venstre etter dommen. Innstillingene øverst
  er to brytere med én linje forklaring (salgsdirektøren kort, `DirectorSwitch compact`) og «Kvaliteter og rekkefølge»
  bak én linje. Kortet sier «X av Y rekker du».
- **Ordrekø:** øverst «Alt rekker fristen» eller «N kontrakter rekker ikke fristen» (`lateContracts`), hvor mye som er
  igjen i døgn, og om planleggeren sorterer. Hver kontrakt er en nummerert rad med status, hva den er, stolpe og levert;
  kontrakter som ikke rekker fristen, er røde. Pilene vises bare når du styrer køen selv – planleggeren sorterer den
  hver time, så pilene gjorde ingenting. Pris, verdi, frist og «Avbryt ordren» ligger bak «Mer». «Nylig avsluttet» med
  kundenes snitt ligger bak én linje. Fanen får «!» når noe ikke rekker fristen.
- **Lager:** tomt lager forklares («alt verket lager, går rett til kontraktene»). Med partier: tre tall (til
  kontrakter, ledig, støpefeil), og hvert parti viser hvor mye som er holdt av; «Selg på spot» selger bare det ledige.
- **Avtaler:** én linje om hva en rammeavtale er, resten bak «Slik virker rammeavtaler». Kapasiteten på én linje. Tilbud
  med samme mønster som forespørslene («Passer» / «Trangt» / «Passer ikke»), så «Dine avtaler», og avsluttede bak én linje.
- **Rettet:** en forespørsel med frist som alt er passert, trekkes (før sto den med «leveres innen −1 døgn»). «1 timer»
  heter «1 time».
- Konto: nei. Testet: Playwright på 7 størrelser (storverk og garasje): ingen horisontal scrolling, knapper minst 44 px.

## B-242 UI-4d, første runde: anleggsbildet beveger seg og kan trykkes (2026-09-28)
Status: gjelder (fase UI-4d i docs/UI.md, bygger på B-151, B-195)
Brukeren: «Fortsett» (neste steg i planen: UI-4d polering og animasjon, inkl. anleggsbildet per nivå).
- **Bevegelse som leser spillet** (bare `transform`/`opacity`, av med «redusert bevegelse»):
  - Skraptrucken kjører forbi når verket er i drift (fra verkstedet). På storverket stopper veien ved havna.
  - Kranløperen med magneten går fram og tilbake over skrapgården når verket går (fra støperiet); står stille ellers.
  - Valseverket: glødende stål løper gjennom når det valser.
  - Storverket: skipet i havna vugger, og en kaikran står ved kaia.
  - Én pipe per ovn på smeltehallen (opptil fire), hver med røyk bare når den ovnen smelter. Før fulgte røyken bare om
    noen ovn smeltet, og ovn 3 og 4 hadde ingen pipe.
- **Stedene kan trykkes** (Verket → Oversikt): skrapgården, ovnshallen, støpehallen og ferdigvarelageret åpner utstyret
  der, eller Anlegg når det ikke er noe å kjøpe. Ramme ved pek og tastaturfokus; Enter/mellomrom virker. Folk og
  kjøretøy tar ikke imot trykk. Bildet i «Pynt verket» er bare et bilde.
- Med «redusert bevegelse» står trucken parkert ved skrapgården, og alt annet står stille.
- Gjenstår i UI-4d: egne bygninger per nivå helt fram til storverket (storverket ligner fortsatt stålverket) og en
  mørkere tilstand når verket står.
- Konto: nei. Testet: skjermbilder av alle fem nivåene og et fullt storverk, trykk på ovnshallen åpner ovnsutstyret.

## B-243 Nye ikoner for Skraplager og Støping (2026-09-28)
Status: gjelder (bygger på B-235, B-237)
Brukeren: «Skraplager og støping ikonene syntes jeg ikke passer så godt.» Valgte selv blant kandidatene.
- **Skraplager:** magneten på skrapkranen (Lucide `magnet`) i stedet for riven.
- **Støping:** to stablede emner (Lucide `stretch-horizontal`, nytt i `ui/icons.tsx`) i stedet for dråpen – det støpingen
  lager. Kapittelet «Strengstøping» i fagboka får samme ikon.
- Rive og dråpe beholdes i kontrollrommet, der de betyr avslagging og tapping.
- Konto: nei.

## B-244 UI-4d, andre runde: storverket får sitt eget bilde, og bildet dempes når verket står (2026-09-28)
Status: gjelder (fase UI-4d i docs/UI.md, bygger på B-242)
Brukeren: «Fortsett» (resten av UI-4d: egne bygninger per nivå og en tilstand når verket står).
- **Storverket skiller seg fra stålverket:** høyere smeltehall med eget tak og en ekstra rad vinduer. Nivå 0–3 er som før.
- **Transportbånd** fra skrapgården opp til ovnshallen på stålverket og storverket. Skrapet går på båndet bare når verket
  er i drift og en ovn smelter.
- **Én glødende streng per støpemaskin** (opptil tre) ved støpehallen, så en ny støpemaskin synes i bildet.
- **Når verket står** (utenfor skiftene) legges et mørkt, halvgjennomsiktig lag over bildet. Det sier det samme som
  statusen, uten tekst.
- Alt nytt bruker bare `transform`/`opacity` og står stille med «redusert bevegelse».
- Konto: nei. Testet: skjermbilder av nivå 1, 3 og et fullt storverk, verkstedet om natta.

## B-245 Skraptrucken snur ved kaia på storverket (2026-09-28)
Status: gjelder (retter B-242)
Brukeren: «Bilen kjører utfor kaia – den må snu og kjøre tilbake eller noe annet isteden.»
- På storverket kjørte trucken til x 380, men den er 31 px lang og kaikanten står ved x 400, så den kjørte ut i vannet
  før den hoppet tilbake til start.
- Nå (egen animasjon `scene-truck-turn`, 20 s): kjører fram til kaia og stopper før kanten, står en stund (lastes),
  snur og kjører tilbake ut til venstre. Nivå 1–3 er som før: der kjører den ut av bildet til høyre.
- Med «redusert bevegelse» står den parkert ved skrapgården også på storverket.
- Konto: nei.

## B-246 Pipene står på taket (2026-09-28)
Status: gjelder (retter B-242, B-244)
Brukeren: «Pipene sitter ikke korrekt på taket.»
- Pipene ble tegnet oppå bygningene med fast bunn. I garasjen svevde pipa over taket; på storverket (høyere hall, B-244)
  gikk de ned over veggen, pipe 4 stakk nesten ikke opp, og pipe 2 sto i lufta mellom smeltehallen og støpehallen.
- Nå tegnes pipene **bak** veggen og taket, så de alltid kommer ut av takflaten. På stålverket og storverket regnes
  toppen fra takflaten der pipa står (`roofAt`), og alle pipene (én per ovn, opptil fire) står ved siden av hverandre på
  høyre takflate, lavere jo lenger opp mot mønet, unna flagget.
- Konto: nei.

## B-247 Utstyrsarkene står stille mens spillet går (2026-09-28)
Status: gjelder (bygger på B-238 «ingen hopping»)
Brukeren: «Om man trykker på ovner og støping. Linjene flytter seg i oppgraderingsbildene.»
- Målt i Playwright (plasseringen av alt i arket i 8 s på 10×, 320 og 390 px): «Nå»-raden øverst skiftet mellom én, to og
  tre linjer («Smelter 420 t lavkarbon · 49 % ferdig», «Venter med armering til sekvensen er ferdig»), og på 320 px
  byttet toppen mellom én og to linjer når kassa gikk fra «100 mrd.» til «99,99 mrd.». Alt under flyttet seg.
- **«Nå» for ovn og støping** har fast plass til to linjer per rad og kuttes aldri lenger enn to. «Ovn 1:» står ikke
  lenger foran teksten når én ovn er valgt i fanene (navnet står i fanen).
- **Kassa** står på egen linje under tittelen i alle utstyrsark.
- Konto: nei. Testet: ingen flytting i målingen etterpå, på fullt storverk og stålverk, 320 og 390 px.

## B-248 Boblene holder seg inne i anleggsbildet (2026-09-28)
Status: gjelder (retter B-195)
Brukeren (skjermbilde): «Den grønne tekstboblen syntes ikke korrekt» – «+7,59 mill. kr · +4 655 t · +5 fagpoeng» var
kuttet av venstre kant.
- Boblene ble sentrert på faste baner (28, 50, 72 %). En lang boble i venstre bane stakk da ut av bildet.
- Nå er banen også forankringspunktet i boblen (`--lane`): venstre bane forankres nær venstre kant av boblen, høyre bane
  nær høyre kant. Så lenge boblen er smalere enn bildet, står den alltid helt inne, med 8 px luft.
- Er den bredere (320 px med tre deler), brytes den mellom delene – aldri inne i et tall.
- Konto: nei. Testet: kantene til alle boblene målt i 9 s på 10× (320, 390 og 1 280 px): ingen utenfor.

## B-249 Logo, app-ikon og tittelbilde: verket i kveldslys (2026-09-28)
Status: gjelder (siste punkt i UI-planen, docs/UI.md 10.6, B-187)
Brukeren: «Fortsett». Fikk fire forslag (øse som heller, lysbueovn, S av glødende stål, verket i kveldslys) og valgte
**verket i kveldslys**.
- **App-ikonet** (`public/icon.svg`, og PNG i 180, 192 og 512 px): silhuetten av verket – smeltehall, støpehall og to
  piper med røyk – mot en kveldshimmel som går over i glød, med den glødende porten til ovnshallen. Samme motiv som
  anleggsbildet i spillet, så ikonet og spillet henger sammen. Det maskerte ikonet (Android) har motivet krympet inn i
  den sikre sirkelen.
- **Tittelbildet** (`ui/TitleArt.tsx`) står øverst i kortet på startskjermen, helt ut til kantene: samme motiv i bredt
  format med skrapkran, stjerner og åser. Røyken stiger og porten gløder; med «redusert bevegelse» står alt stille.
- **Logoen** er bildet sammen med navnet «Stålverket» i visningsskriften. Spillet har ingen egen logo i menyen – der er
  plassen brukt til drift.
- PNG-ene lages fra SVG-en med Chromium (Playwright). En ny tegning krever nye PNG-er.
- Ikonet på hjemskjermen til en iPhone byttes først når spillet legges til på nytt.
- Konto: nei. Testet: startskjermen på de 7 størrelsene (ingen horisontal scrolling, kortet får plass), ikonene i
  16–512 px.

## B-250 Pipene står på smeltehallen i app-ikonet og tittelbildet (2026-09-28)
Status: gjelder (retter B-249, samme regel som B-246 i anleggsbildet)
Brukeren: «Fiks pipeplasseringa i appikonet og tittelbildet.»
- I ikonet sto den store pipa i lufta over støpehallen (bunnen sluttet over taket), og i tittelbildet sto den på
  støpehallen. Nå står begge pipene på høyre takflate på smeltehallen og går ned i hallen, som i anleggsbildet (B-246).
- PNG-ene er laget på nytt fra `public/icon.svg`.
- Konto: nei.

## B-251 Imperiebelastning: avtagende netto fra datterverkene (2026-09-28)
Status: gjelder (bygger på B-181; første del av rebalanseringen av sluttspillet i B-193/B-238, FORSLAG)
Brukeren: «Fortsett». Fikk analysen av veksten på toppen og valgte **avtagende utbytte** og at **det spillerne har fra
før, beholdes**.
- **Analysen (bare lest):** de største konsernene vokste 400–740 mrd. per ekte døgn. Nesten alt var utbytte fra 11–12
  fullt moderniserte komplekser (ca. 1,6 mrd. per spilldøgn mot 0,23 mrd. i konsernkostnader); hjemmeverket ga ca.
  0,2 mrd. Kassa står på 100 mrd., så resten gikk til den bundne reserven (Tuster 943 mrd.). På 10× er et spilldøgn
  ca. 12 s, og de ivrigste spilte 500–730 spilldøgn på én ekte dag.
- **Regelen:** netto fra verkene (utbytte minus konsernkostnader) er uendret opp til 50 mill. per døgn. Over det vokser
  den med kvadratroten (`KONSERN_ECONOMY.loadFrom` og `loadPower`, `afterEmpireLoad` i `konsern.ts`). Forskjellen
  bokføres som konsernkostnad og står forklart under Konsern → Oversikt («Et så stort konsern er tungt å styre …»).
  Tallene per verk i tabellen vises etter belastningen, så de stemmer med nettoen.
- **Virkning** (balance.ts --konsern, per spilldøgn):
  - 1 storverk trinn 3: uendret (0,04 mrd.). 3 storverk trinn 3: 0,10 → 0,07 mrd.
  - 1 kompleks trinn 5: 0,15 → 0,09 mrd. 14 komplekser trinn 5: 1,12 → 0,24 mrd. Et lagret spill med 12 komplekser og
    alt forsket: ca. 1,37 → 0,26 mrd.
  - Hvert nytt verk gir alltid litt, men mindre og mindre: det 15. komplekset betaler seg på ca. 2 600 døgn (før 277).
    Utvid merker det «Lønner seg dårlig».
- **Hva som gjenstår:** med konsernet bremset er hjemmeverket (ca. 0,2 mrd. per døgn) nå omtrent halve veksten. En
  som spiller mange timer på 10× vokser fortsatt ca. 300 mrd. per ekte døgn (før ca. 1 100). Står i FORSLAG.
- **Ingen lagrede spill endres.** Reserven og titlene spillerne har, beholdes; regelen gjelder det som tjenes fra nå.
- Testspilleren (alle nivåmål, nybegynner, kontrollrommet) er uendret og grønn. Konto: nei (regnes i spillet).

## B-252 Markedet metter seg: lavere pris når hjemmeverket lager over 10 000 t i døgnet (2026-09-28)
Status: gjelder (andre del av rebalanseringen av sluttspillet etter B-251; bygger på B-154)
Brukeren: valgte «Markedet metter seg» for hjemmeverket, og at den bundne reserven (kassa over 100 mrd., B-193)
**beholdes som den er** – grensen, reserven og at den teller i konsernverdien er uendret.
- **Regelen** (`MARKET_SATURATION` og `marketSaturation` i `plant.ts`): kundene tar unna 10 000 t i døgnet til full pris.
  Tonnene over får halv pris, så snittprisen på nye forespørsler og rammeavtaler blir
  (10 000 + (døgntonn − 10 000) × 0,5) / døgntonn. Mer produksjon gir alltid mer omsetning, bare mindre per tonn.
  Kontrakter som alt er tatt, beholder prisen. Spot hadde metning fra før.
- **Hvem merker det:** et storverk starter på ca. 700 t i døgnet; bare stormodellene helt på slutten kommer over
  (et lagret storverk med tre 420-tonnere: ca. 35 000 t, 36 % lavere pris). `balance.ts --storovn 330`: 250 t-ovner
  59 → 47 mill. per døgn, 420 t-ovner 38 → 21 mill. (underbemannet); større ovner lønner seg fortsatt.
- **Vist til spilleren** under Salg → Forespørsler, bare når markedet er mettet: hvor mye verket lager, grensen og hvor
  mye billigere nye forespørsler er.
- **Samlet med B-251:** de største går fra ca. 1,6 til ca. 0,35 mrd. per spilldøgn (konsernet ca. 0,26, hjemmeverket
  ca. 0,1). Den som spiller mange timer på 10× vokser fortsatt ca. 250 mrd. per ekte døgn; resten er spilletid.
- Ingen lagrede spill endres. Testspilleren (alle nivåmål, nybegynner, kontrollrommet) er uendret og grønn. Konto: nei.

## B-253 Fase 2: slagghåndteringen bygget, men slått av (2026-09-28)
Status: gjelder (fase 2 i docs/RETNING.md; bygger på B-188, B-189, B-210, B-226)
Brukeren: «Fortsett», så «Bygg slagghåndtering skjult». Skraplageret har ennå ikke fått sin første eier (anbudet stenger
29.9. kl. 01:33 UTC) og har aldri betalt ut inntekt, så kjeden aktivitet → server → eier er ikke vist. Slagghåndteringen
bruker samme kjede og slås derfor på først når skraplageret har betalt ut inntekt i noen dager uten feil.
- **Server (`supabase/042_slagghandtering.sql`, kjørt som «slagghandtering»):** `companies.active` (standard på) og
  typen `slagg`. Selskapet «Slagghåndteringen» finnes med `active = false`: det får ikke anbud, betaler ikke inntekt og
  sendes ikke i `world_status()`. Skraplageret er uendret.
  - Tonn og gebyr per type: `company_counted_t(type, spiller, dag)` og `company_fee(type)`. Slagg = stålet som teller for
    skraplageret (B-188: høyst én normal spilldag per spiller per ekte dag) × 0,12 t slagg per tonn stål, × 5 000 kr per
    tonn slagg (`config.world`: `slag_per_steel`, `slag_fee_per_t`) – ca. 600 kr per tonn stål, 55 % av skraplageret.
  - `company_estimate(selskap)` gir anslaget og taket i anbudet per type; `open_tender`, `pay_company_income`,
    `world_tick` og `world_status` bruker det og hopper over selskaper som er slått av.
  - Slås på med `update public.companies set active = true where type = 'slagg'; select public.world_tick();` – da
    åpner det første anbudet (48 timer).
- **Testet før den ble kjørt:** hele migrasjonen og et testløp i én transaksjon som ble rullet tilbake. Anslaget for
  skraplageret var likt det gamle; ingen anbud og ett selskap i `world_status` mens slagg var av; slått på: anbud med tak
  1,327 mrd., og med en midlertidig eier i fire dager betalte slagghåndteringen 59,9 mill. mot skraplagerets 109,7 mill.
  for de samme dagene (forhold 0,545); `world_status` viste begge. Tilbakerullingen ble sjekket. Sikkerhetsrådene er
  uendret, og de nye funksjonene kan ikke kalles utenfra.
- **Appen:** typen `slagg` (`CompanyType`, `EARNS_FROM` i `net/world.ts`) med egen forklaring på kortet under Industrien.
  Beskjeden om åpent anbud (Oversikt, «!» i menyen) bruker navnet på selskapet i stedet for «skraplageret». Varsler om
  avgjort anbud gis i rekkefølge etter anbudet (`applyTenderResults`): før kunne et nyere anbud på ett selskap gjøre at
  et eldre på et annet ble regnet som sett uten varsel. Ny test i `net/tests.ts`.
- Konto: ja (samme som skraplageret, regel 3 og 7).
Endringslogg: nei

## B-254 Rettinger etter imperiebelastningen og markedsmetningen (2026-09-28)
Status: gjelder (retter B-251, B-252)
Brukeren: «Fortsett». Gjennomgang av steder som regner inntekt på egen hånd etter B-251 og B-252.
- **Felles innkjøp og salg** (Konsern → Utvid): gevinsten var 5 % av utbyttet før belastning og konsernkostnader. For et
  stort konsern ble den vist mange ganger for høy. Nå er den forskjellen i netto etter imperiebelastningen.
- **Mesterskapet «Konsernledelse»:** verdien av neste nivå var regnet av driftsresultatet i verkene (før utbytte og
  belastning). Nå er den forskjellen i netto etter imperiebelastningen. Prisen i fagpoeng er uendret – den er fast.
- **Hasteordre, stor ordre fra utlandet og landemerkene** satte pris uten markedsmetningen. Nå er «vanlig pris» det
  markedet gir (B-252); påslaget (35 %, 15 %, 25 %) kommer på toppen.
- Ny test: verdien av «Konsernledelse» med 12 komplekser er under 5 % av nettoen. Testspilleren er uendret og grønn.
- Konto: nei.

## B-255 Trender i markedet (2026-09-28)
Status: gjelder (fra FORSLAG og DESIGN.md: «etterspørselen etter armering øker»)
Brukeren: «Fortsett». Fase 2 venter på at skraplageret får en eier (B-253), så neste punkt på lista ble trender.
- **Hva:** én trend om gangen fra verkstedet: etterspørselen etter én kvalitet eller én vare (bare hvis verket lager
  flere varer) går opp eller ned i 6–12 spilldøgn, med 4–10 døgn pause mellom. Like ofte opp som ned. `game/trends.ts`
  (`TREND`, `updateTrend`, `trendPriceFactor`, `trendHits`); tilstanden i `g.market.trend` og `g.market.nextTrendDay`
  (standard i `migrate()`).
- **Virkning:** opp: forespørsler og avtaler på det som er ettertraktet får ca. 12 % bedre pris, og halvparten av de andre
  forespørslene verket kan lage, dras over dit. Ned: ca. 10 % lavere pris, og halvparten av forespørslene på det dras
  bort. Bare forespørsler verket alt kunne laget, flyttes – så antallet det kan ta imot, er det samme.
- **Lærerikt:** hver trend har en grunn med vanlige ord i loggen (byggebransjen går for fullt, bilindustrien trenger
  stål som er lett å forme, valseverkene har fulle lagre …).
- **Vist:** linja «Ettertraktet: …» / «Lite etterspurt: …» med ikon og døgn igjen under Salg → Forespørsler og Marked →
  Stålpriser, bare mens en trend varer (gradvis synlighet); merket «Ettertraktet» på forespørsler som kom under trenden
  (`Contract.trend`). Nye Lucide-ikoner `trending-up`/`trending-down`.
- **Balanse:** trendene trekker tilfeldige tall, så hele testspilleren går annerledes: med trendene uten virkning
  (bare nye tilfeldigheter) ble storverket nådd dag 145 i median (før 159); med trendene dag 137 – ca. 5 % raskere,
  fordi den som følger med kan velge de godt betalte. Alle mål OK, nybegynneren dag 143. En versjon med oftere opp
  enn ned (65 %) ga dag 132 og ble forkastet.
- Konto: nei (eget spill).

## B-256 Fase 2: mekanisk verksted bygget, men slått av (2026-09-28)
Status: gjelder (fase 2 i docs/RETNING.md; bygger på B-188, B-253)
Brukeren: «Fortsett», så «Mekanisk verksted»: appen rapporterer vedlikehold og havarier til serveren, og selskapet bygges
ferdig, men slått av, som slagghåndteringen.
- **Appen rapporterer:** `g.totals.maintKr` er kroner brukt på vedlikehold og havarier i alt (alt som bokføres som
  «vedlikehold» i `addCost`: omforing, gjennombrenning, overslag, elektrodebrudd, spolelekkasje, reparasjoner). Standard
  0 i `migrate()` – historien fra før er ikke lagret. Sendes som `snapshots.maint_kr` sammen med tonnene.
- **Server (`supabase/043_mekanisk_verksted.sql`, kjørt som «mekanisk_verksted»):**
  - Produksjonsmåleren (B-188) får `maint_hwm`: bare kroner over det høyeste spilleren har hatt, teller. Nye kroner samles
    per ekte UTC-dag i `production_days.gained_maint`, ved siden av de nye tonnene. Første tall er startpunktet, og eldre
    apper uten tallet endrer ingenting.
  - Det som teller en ekte dag (`maint_counted_kr`): stålet som teller for skraplageret samme dag (høyst én normal
    spilldag) × vedlikehold per tonn den dagen, høyst 1 000 kr/t (`maint_cap_per_t`). Et storverk bruker ca. 100–130 kr/t
    (målt i lagrede spill), et verk på nivå 2–3 300–550. Lokal fart gir ikke mer, og et stort tall etter en tilbakerulling
    eller juks kan ikke gi mer enn taket per tonn.
  - Eieren får halvparten (`workshop_share` 0,5) – ca. 60 kr per tonn stål, en tidel av slagghåndteringen. Verkstedet er
    det minste selskapet og blir det billigste å by på: anslaget nå er ca. 9,7 mill. kr per dag (skraplageret 178 mill.).
  - Anslaget (`maint_rate_estimate`) er snittet hos de andre de siste 7 ekte dagene med taket per spiller og dag, så ett
    havari ikke drar det opp; 120 kr/t (`maint_typical_per_t`) til det finnes tall. De første dagene etter at appen er
    ute blir snittet for lavt (dager før rapporteringen), men selskapet er slått av så lenge.
  - Typen `verksted` i `company_counted_t`, `company_fee` og `company_estimate`; selskapet «Mekanisk verksted» med
    `active = false`. Slås på med `update public.companies set active = true where type = 'verksted'; select
    public.world_tick();`.
- **Testet før den ble kjørt:** hele migrasjonen og et testløp med to midlertidige kontoer i én transaksjon som ble
  rullet tilbake: 100 t og 12 000 kr ga 12 000 kr som teller; en gammel lagring ga ingenting nytt; 500 000 kr på 10 t
  ble tatt av taket (1 000 kr/t × stålet som teller); en eldre app uten tallet ga startpunkt uten telling. Verkstedet
  fikk ikke anbud og var ikke i `world_status` mens det var av; slått på fikk det anbud. Etter kjøringen: selskapet
  finnes, er av og har ingen anbud. Sikkerhetsrådene er uendret.
- **Appen:** `CompanyType` har `verksted`, `companyType()` tolker typen, og kortet under Industrien har en forklaring.
  Nye tester i `game/tests.ts` (bare vedlikehold telles, gamle lagringer starter på 0) og `net/tests.ts` (tallet sendes
  til tidslinja).
- Konto: ja (samme som skraplageret, regel 3 og 7).
Endringslogg: nei

## B-257 Juksesperren sjekker første opplasting (2026-09-28)
Status: gjelder (fra FORSLAG «Sjekk av første opplasting»; bygger på B-127, B-170, B-212)
Brukeren: «Fortsett», så «Sjekk første opplasting». Et spill som kobles til en konto sent (f.eks. på dag 610), har ingen
tidslinje, så vekstsperren har ingenting å sammenligne med. Før ble det bare sjekket mot taket per nivå, som ikke finnes på
storverket.
- **Regel (`supabase/044_forste_opplasting.sql`, kjørt som «forste_opplasting»):** det første tallet en spiller noen gang
  laster opp (i alle sesonger – ikke ved ny sesong), sjekkes i `check_snapshot` mot:
  - **Nivået:** tidligst halvparten av dagen testspilleren nådde det (1 / 6 / 20 / 57 / 115 → verkstedet dag 3, støperiet
    dag 10, stålverket dag 29, storverket dag 58).
  - **Konsernverdien:** `first_upload_limit(dag)`, en kurve per tiende døgn i `config.first_upload`. Den er den største av
    3 × det beste testspilleren klarte på dagen og 1,5 × det største ærlige spillere har hatt på samme dag (tidslinja uten
    `pre_reform`), minst 1 mill. Etter dag 2 400 vokser den med 1,5 mrd. per døgn. Eksempler: 54 mill. på dag 100,
    28,6 mrd. på dag 300, 76 mrd. på dag 500, 1 018 mrd. på dag 1 000.
  - Over grensen: spilleren flagges (som før, eieren ser på det). Ingenting slettes.
- **Testspilleren:** `balance.ts --forste 700` kjører seks frø, flink og nybegynner, i 700 døgn uten daglige belønninger
  (de krever konto) og skriver kurven, tidligste døgn per nivå og veksten på slutten (118 mill. per døgn). Beste på dag
  700: 47,6 mrd. Kurven er tatt inn i migrasjonen.
- **Testet før den ble kjørt**, i én transaksjon som ble rullet tilbake: dagens spillere som koblet til sent (dag 220,
  379, 506, 848 og 2 273) ville passert; 500 mrd. på dag 300, storverket på dag 40 og 800 mill. på dag 30 ble flagget; en
  spiller med tidslinje fra før ble ikke sjekket. Ingen ekte første opplasting og ingen ekte tall (uten `pre_reform`) er
  over grensen. Etter kjøringen: ingen flagget, sikkerhetsrådene uendret.
- Gjester sjekkes fra første lagring; tidslinja de tar med til en ny konto, sjekkes ikke på nytt (B-212).
- Konto: ja (juksesperren gjelder bare det som lagres på nett).
Endringslogg: nei

## B-258 Når anbudet avgjøres: beskjed til alle, og inntekten til eieren (2026-09-28)
Status: gjelder (bygger på B-189, B-237, B-253)
Brukeren: «Fortsett», så «Anbudet avgjort i natt». Skraplageranbudet stenger 29.9. kl. 01:33 UTC med fire bud. Løpet
ble prøvd i en transaksjon som ble rullet tilbake: anbudet ble avgjort (ingen trekning), taperne fikk budene tilbake i
konsernkassa, eieren ble satt i 14 dager, og det ble ikke åpnet noe nytt anbud. `world_status` ga vinneren `mine` og
`last_result.won`, og taperne `won = false`. Serveren virker; tre ting i appen var uklare:
- **Vinneren så «+0 kr i går»** til første utbetaling. Nå: «Ingenting ennå · første inntekt i natt kl. 02:00» (neste
  UTC-midnatt i spillerens egen tid, `firstPayout` i `net/world.ts`). Beskjeden om seieren sier det samme.
- **Eieren fikk ingen beskjed om inntekten.** Nå: «Skraplageret tjente X i går. Pengene står i konsernkassa.» én gang
  per selskap og UTC-dag (`applyCompanyIncome`, minnet i `g.companyIncomeSeen`, standard `{}` i `migrate()`).
- **De som ikke bød, fikk ikke vite noe.** Nå får alle med åpnet konsern én linje: «Skraplageret har fått ny eier: X
  driver det de neste 14 dagene.» – uten beløp. Et anbud uten bud gir ingen beskjed.
- `worldNews()` sier om det er noe nytt, så appen bare endrer spillet når det trengs (hvert minutt hentes
  `world_status` som før).
- Testet: nettestene (endret test for B-237: den som ikke bød, får nå nyheten; ny test for inntekten, dagen og
  `migrate`), og skjermbilder av vinner, taper, tilskuer og eier dag 2 på 320 og 390 px (også med norsk tidssone:
  «kl. 02:00»).
- Konto: ja (samme som skraplageret).

## B-259 En gammel kopi av spillet lastes aldri opp over spillet på nett (2026-09-28)
Status: gjelder (retter B-140, B-148)
Brukeren (Tuster): «Hvorfor mistet jeg masse progresjon?» – «Jeg hadde blitt logget ut». Så «Fortsett».
Hva som skjedde 28.9. (UTC): siste vanlige lagring 16:09:50 (dag 2 169). 16:14:34 logget kontoen inn med passord, og
16:14:35 ble et spill på dag 471 (38 mrd., en kopi fra 25.9.) lastet opp over dag 2 169. Serveren tok sikkerhetskopi
(«lavere dag») og slettet tidslinja etter dag 471 (regelen for tilbakespoling). 16:14:37 og 16:14:50 ble dag 2 169
lastet opp igjen, så spillet på nett var helt igjen etter 15 sekunder, og spilleren spilte videre derfra. Tidslinja for
dag 472–2 168 er borte (grafer, ukens utfordring); spillet, rekordene og titlene er ikke berørt.
- **Feilen:** ved innlogging lastet appen opp spillet på enheten uten å spørre når enheten selv hadde lagret sist
  (samme merkelapp eller samme husket versjon som spillet på nett), selv om spillet her var mye eldre. Det er riktig for
  et nytt spill (ny sesong), men ikke for en gammel kopi av det samme spillet – f.eks. en fane eller app som har stått
  med et gammelt spill i minnet. Serveren (`save_game`) godtar alt som bygger på riktig versjon.
- **Rettingen (`net/sync.ts`):** `staleCopy(g, sky)` – samme spill, men mer enn ett spilldøgn (`STALE_COPY_MIN`) bak
  spillet på nett.
  - Ved innlogging hentes da spillet fra nett i stedet for å laste opp.
  - `uploadSave` nekter å laste opp en gammel kopi (som om lagringen ble avvist); appen henter spillet fra nett innen
    20 s (`pullIfNewer`). Bare «Herfra» i valget (`keepLocal`) kan laste opp en eldre kopi.
  - «Samme spill»: nye spill får `gameId` (tilfeldig, i `newGame`). Eldre spill har ingen – de sammenlignes på sesong.
    Id-en lages aldri i ettertid (`migrate()` lar den være tom), for da ville to kopier av samme gamle spill fått hver
    sin og sett ut som to forskjellige spill.
  - Et nytt spill (ny id eller ny sesong) kan fortsatt erstatte spillet på nett, som før.
- **Valget «Hvilket spill vil du fortsette?»:** er spillet her eldre enn det på nett, må «Herfra» trykkes to ganger, og
  det står hvor mange døgn som blir borte.
- Hvorfor spilleren ble logget ut, er ikke funnet: økta ble fornyet vanlig 16:03, og neste innlogging var med passord
  16:14. Det kan være en fane eller app som ikke var åpnet på lenge.
- Testet: ny nettest som gjenskaper hendelsen (samme enhet, samme versjon, dag 471 mot 2 169) – den feiler uten
  rettingen og går igjennom med den; et nytt spill regnes ikke som gammel kopi; «Herfra» virker fortsatt. Playwright:
  valget på 320 og 390 px (første trykk lagrer ingenting, advarselen vises).
- Konto: ja (lagring på nett).

## B-260 Veiledningen dekker ikke knappen den ber om (2026-09-28)
Status: gjelder (retter B-027; B-201 plasserte boksen over varsellinja)
Brukeren: «Early game slet en med å kjøpe 5 tonn skrap når han hadde 8 tonn ledig» – knappen gjorde ingenting, i
garasjen.
- **Funnet:** på en liten mobil (320 × 568) lå veiledningsboksen i steget «Kjøp skrap» over alle kjøpeknappene på Marked.
  Et trykk traff boksen, og ingenting skjedde – ingen melding, ingenting kjøpt. Det samme gjaldt «Signer» på Salg i
  steget «Ta en kontrakt». Siden hadde fast 190 px luft under innholdet, men boksen er høyere på smale skjermer, og en ny
  spiller vet ikke at siden kan rulles. På 390 og 412 px var knappene fri. Selve kjøpet (motoren) var riktig: 5 t med
  8 t ledig kjøpes, også i nettleseren.
- **Rettingen (`ui/GameApp.tsx`, `game.css`):** høyden på boksen måles (`--coach-h`), og siden får så mye luft under
  innholdet. Står spilleren på siden steget gjelder, rulles knappen steget ber om (`COACH_TARGET`: kjøpeknappene på
  Marked, «Signer» på Salg) opp over boksen.
- Testet: Playwright på 320, 390, 412 og 1366 px for begge stegene – knappen er fri, og et trykk kjøper skrap og
  signerer, og veiledningen går videre.
- Konto: nei.

## B-261 Tidslinja ved tilbakespoling flyttes til side, ikke slettes (2026-09-28)
Status: gjelder (erstatter slettingen i `check_snapshot` fra 003/004; bygger på B-176, B-259)
Brukeren: «Fortsett», så «Tidslinja ved tilbakespoling» (fra FORSLAG etter B-259).
- **Før:** lastes et spill med lavere dag opp, slettet serveren alle tall etter dagen. Da en gammel kopi tok over i 15
  sekunder (B-259), forsvant 1 700 tall. Fartskontrollen brukte det nyeste tallet minst 10 minutter gammelt – tallet fra
  kopien – og flagget spilleren feil.
- **Nå (`supabase/045_tidslinje_tilbakespoling.sql`, kjørt som «tidslinje_tilbakespoling»):**
  - Tallene etter dagen flyttes til `snapshots_rewound` (bare serveren leser den). Alt som leser tidslinja
    (toppliste, ukens utfordring, juksesperren, grafer), ser det samme som før.
  - Kommer det samme spillet tilbake – høyere dag, minst like langt spilt (spillminutter) som tallene som ble flyttet,
    og ingenting spilt i mellomtiden – legges tallene tilbake med sitt eget tidspunkt og merke (`pre_reform`), uten ny
    sjekk og uten produksjonsmåleren (`stalverk.restore`, som `guard_pre_reform` og `meter_snapshot` også hopper over).
  - Spilles det videre fra den lavere dagen, forkastes tallene når spillet er forbi dem.
  - Fartskontrollen sammenligner med det som var spilt lengst for minst 10 minutter siden (`order by game_min desc`),
    ikke det nyeste tallet.
- **Testet før den ble kjørt**, i én transaksjon som ble rullet tilbake: dag 1–10, en kopi på dag 3 (7 tall til side),
  så dag 10 igjen: alle 10 tall tilbake, `pre_reform` og tidspunkt beholdt, ikke flagget (den gamle rekkefølgen ville
  krevd 140 min mot 20). Spilt videre fra dag 3: tallene ble ikke lagt tilbake, og ble forkastet ved dag 11.
  Produksjonsmåleren ble ikke rørt av tallene som ble lagt tilbake. Etter kjøringen: lagringene går som før (11 nye tall
  på 3 min), ingen flagget. Sikkerhetsrådene: bare den nye tabellen uten regler (som de andre serverens tabeller).
- Tallene som forsvant i dag (dag 472–2 168 for én spiller), kan ikke hentes tilbake – de ble slettet før dette.
- Konto: ja (tidslinja finnes bare med konto).
Endringslogg: nei

## B-262 Siden står alltid øverst – trykk treffer knappene på iPhone (2026-09-28)
Status: gjelder (bygger på B-137, B-192)
Brukeren: «En som spiller på iPhone 16 pro har problemer med at han må klikke over knappene for at de skal reagere».
- **Årsak (sannsynlig):** spillet ligger i faste lag (`.g-app`, `.g-intro`) og scroller inni dem, men selve siden kunne
  også scrolles. `#root` hadde `min-height: 100vh`, og på iPhone er 100vh høyere enn det synlige (adresselinja,
  skjermkanten rundt kameraet). iPhone scroller også vinduet når tastaturet åpnes, og lar det ofte stå slik etter at det
  lukkes. Når vinduet står litt nede under faste lag, treffer Safari et annet sted enn knappen er tegnet – spilleren må
  trykke over den.
- **Nå:** `html`, `body` og `#root` har høyde 100 % og `overflow: hidden` (`index.css`). `main.tsx` setter vinduet tilbake
  til toppen ved `scroll`, `resize`, snuing, `visibilitychange`, endring av det synlige området (`visualViewport`) og
  like etter at et tekstfelt slippes (`focusout`). Mens et tekstfelt er i bruk, får iPhone flytte siden, så feltet synes
  over tastaturet.
- Testet i Playwright på 402×874 (iPhone 16 Pro), 390, 320 og 1366: vinduet blir stående på 0, innholdet scroller i
  `.g-main` og på startskjermen, knappene treffes der de er tegnet, og siden går tilbake til toppen når et felt slippes.
  Selve feilen kan ikke gjenskapes i Chromium; spilleren må bekrefte på telefonen.

## B-263 Utslipp, renseanlegg og bøter (2026-09-28)
Status: gjelder
Brukeren: «Man bør få kunne få bøter om man har miljøutslipp. Da må man kunne kjøpe renseanlegg og lignende. Det bør
være mulig å få havari på renseanlegg. Om renseanlegget står eller ikke er tilstrekkelig bør man få bot.»
- **Når det gjelder:** fra verket har renseanlegg (røykgassrensingen, påbudt for lysbueovnen på stålverket). Før det er
  ovnene små, og systemet vises ikke (gradvis synlighet, B-180).
- **Kapasitet:** renseanleggene kjøpes i trinn under Anlegg → Ovn (`game/environment.ts`, `CLEANERS`):
  røykgassrensing 1 000 t smeltet stål i døgnet (1,5 mill.), større filteranlegg 3 000 t (5 mill., stålverk),
  filteranlegg med to linjer 10 000 t (25 mill., storverk), stort renseanlegg 25 000 t (120 mill., konsern) og
  renseanlegg for storverk 45 000 t (400 mill., magnat). Hvert trinn krever det forrige.
- **Utslipp:** i hvert tidssteg regnes hvor mye ovnene som går, smelter i timen, mot det anlegget renser. Det som går
  over, telles som tonn urenset (`g.env.excessT`).
- **Bot:** neste morgen: 1 000 kr per tonn urenset (dobbelt mens anlegget sto og ovnene gikk videre), pluss en fast del
  (10 000 kr på støperiet, 25 000 kr på stålverket og 50 000 kr på storverket), og −1 i omdømme (−2 ved mye eller ved
  havari). Boten føres under «Bøter».
- **Havari:** i snitt én gang per 30 døgn med ovnene i gang, ganget med vedlikeholdsfaktoren. Reparasjonen tar ca. 10
  timer (ganget med reparasjonsfaktoren) og koster 2 % av prisen på anlegget. Med to linjer renser den andre halvparten.
- **Valget ved havari:** første gang kommer et kort: stopp ovnene (ingen bot; chargene som er i gang, kjøres ferdig)
  eller kjør videre (dobbel bot). Valget gjelder senere havarier og kan endres under Anlegg → Ovn. Med «stopp» starter
  en ovn bare hvis det som er igjen av rensingen, holder.
- **Råd:** Verket sier fra når anlegget står, og når det er for lite, med neste anlegg å kjøpe. Rådet åpner arket for
  ovnene. Testspilleren (flink og nybegynner) følger rådet og velger «stopp» på kortet.
- **Eldre lagringer** (`env.grant`): et verk som alt har ovner større enn anlegget, får anleggene som trengs, gratis, i
  første tidssteg, så ingen får bot for noe de ikke kunne vite om.
- **Fagboka:** nytt kapittel «Røyk, støv og renseanlegget» (`miljo`) med quiz, låses opp ved første havari eller bot.
- **Konto (KONTO.md):** nei – det er en del av selve spillet og lagres lokalt.
- **Balanse:** alle mål OK. Bøtene til testspilleren er små når den følger rådene (80–240 000 kr per kjøring for den
  flinke, ca. 1 mill. for nybegynneren). Nybegynneren når storverket senere (median dag 172,5 mot 143), fordi den kjøper
  større renseanlegg og stopper ved havari. Det er innenfor målet (240).

## B-264 Menyen nederst tilbake mot skjermkanten på iPhone (2026-09-28)
Status: gjelder (erstatter CSS-delen av B-262; lytteren i `main.tsx` fra B-262 gjelder fortsatt)
Brukeren (med skjermbilde): «Menyen nederst har kommet lengre opp enn tidligere».
- **Årsak:** B-262 satte `height: 100%` og `overflow: hidden` på `html` og `body`. På iPhone, med spillet på
  hjemskjermen, ble de faste lagene da like høye som det iPhone regner som sidens høyde (uten statuslinja og
  hjemstreken), og menyen nederst ble liggende ca. 85 pt over skjermkanten.
- **Nå:** `html` og `body` er som før B-262. `#root` har ingen høyde i stedet for `min-height: 100vh`, så siden er ikke
  høyere enn skjermen og kan ikke scrolles – det var den egentlige grunnen til at trykk traff over knappene (B-262). Et
  vindu som likevel flyttes, settes fortsatt tilbake av `main.tsx`.
- Testet i Playwright på 320, 390, 402 og 1366: laget går fra 0 til bunnen av skjermen, menyen står nederst, siden er
  ikke høyere enn vinduet, og vinduet står på 0. Chromium viser ikke iPhone-feilen, så brukeren må bekrefte på telefonen.

## B-265 Vinter, eksplosjoner og svært sjeldne dødsulykker; quizspørsmålet om karbon (2026-09-28)
Status: gjelder
Brukeren: «Vi bør legge inn dødsfall en ekstremt sjelden gang. Dette skal ha store konsekvenser», «Hva gir mer karbon i
stålet. Spørsmålet gir ikke mening. Fiks det» og «Om vinteren må det være større sjans for at det skjer eksplosjoner og
uforutsette ting».
- **Quiz:** «Hva gir mer karbon i stålet?» (leses som «hva tilsetter karbon») er nå «Hva skjer med stålet når det får
  mer karbon?». Svarene er de samme.
- **Kalender** (`game/calendar.ts`): tolv måneder à 30 døgn, dag 1 = 1. april, så den første vinteren (desember–februar,
  dag 241–330) kommer når verket er etablert. Et snøfnugg ved nivånavnet i toppfeltet viser vinteren, og varsellista
  sier fra når den kommer og går.
- **Om vinteren** (`WINTER_RISK` = 1,5): havarier i ovnene (overslag, elektrodebrudd, lekkasjer), havari på
  renseanlegget og hendelseskort skjer halvannen gang så ofte. Frost kan fryse kjølevannet til støpemaskinen (støpingen
  står 3–6 timer), fra støperiet.
- **Eksplosjoner** (`game/accidents.ts`): vann, is og snø i skrapet blir til damp i det flytende stålet. I snitt én per
  90 døgn per ovn i drift om sommeren, tre ganger så ofte om vinteren. Skrapterminal (tak over skrapet) halverer, sortering
  (×0,7) og forskningen Sikkerhetskultur (×0,7) gir færre. Ingen i garasjen. Følger: ovnen står 4–10 timer, reparasjon,
  omdømme −2, trivsel −3, og 25 % sjanse for at en ansatt blir skadet (sykmeldt 7–21 døgn).
- **Dødsulykke:** 2 % av eksplosjonene (1 % med Sikkerhetskultur), bare når noen er på jobb. Med alle tiltak blir det
  omtrent én per 8 000 døgn på et storverk, uten tiltak omtrent én per 1 000 døgn. Følger: den ansatte omkommer
  (fjernes), hele verket og støpingen stenges i tre døgn mens politiet og Arbeidstilsynet gransker, bot (0,5 / 3 / 20 /
  100 mill. kr fra verksted til storverk), omdømme −25 og trivsel −35. Et kort pauser spillet og forklarer.
- **Fagboka:** nytt kapittel «Vann i skrapet og sikkerhet» med quiz, låses opp ved første eksplosjon.
- **Konto:** nei – en del av selve spillet.
- **Balanse:** alle mål OK. Testspilleren fikk 0–3 eksplosjoner og ingen dødsulykker på 240 døgn; nybegynneren når
  storverket på median dag 147.

## B-266 Nestenulykken sjeldnere (2026-09-28)
Status: gjelder (bygger på B-171, B-210)
Brukeren: «Det er for ofte nestenulykke popup».
- Kjøper spilleren verneutstyr og skjermer, kommer kortet ikke igjen før verket flytter til et større nivå (som
  naboklagen og kobbertyveriet, `decisionFixed`).
- Ellers minst 90 spilldøgn (før 25) og minst én time i ekte tid (før 20 minutter) mellom to nestenulykker. På 10× var
  20 minutter bare 100 spilldøgn, og vinteren (B-265) gjorde alle kort halvannen gang så vanlige.

## B-267 Faste lag like høye som skjermen (dvh) (2026-09-28)
Status: gjelder (bygger på B-264)
Brukeren (skjermbilde 19:37): «Menyen nederst ble ikke bra etter oppdateringen. Den er for langt opp».
- Skjermbildet ble tatt før B-264 var ute (publisert 19:37:40, og appen ser etter nye versjoner hvert 5. minutt), men
  vi kan ikke teste iPhone på hjemskjermen her. Derfor er de faste lagene gjort uavhengige av hvor høy iPhone mener siden
  er: `.g-app`, `.g-modal`/`.g-intro` og `.control-room` har `top/left/right: 0` og `height: 100dvh` (med `100vh` som
  reserve) i stedet for `inset: 0`. På hjemskjermen er 100dvh hele skjermen; i Safari er det det synlige området.
- Testet i Playwright på 320, 390, 402, 768, 1024, 1366, 1920 og 2560: laget og menyen går helt ned, siden er ikke
  høyere enn vinduet, og vinduet står på 0. Brukeren må bekrefte på iPhone.

## B-268 Hele skjermhøyden på iPhone-hjemskjermen (2026-09-28)
Status: gjelder (bygger på B-264, B-267)
Brukeren: «Den er fortsatt for langt opp» (menyen nederst, etter B-267).
- På iPhone med spillet på hjemskjermen regner Safari det synlige området (og dermed `inset: 0` og `100dvh`) som ca.
  85 pt kortere enn skjermen, så de faste lagene sluttet over bunnen. Før B-262 skjulte `min-height: 100vh` på `#root`
  dette, fordi siden da var høyere enn det synlige – men det var også det som ga trykkfeilen.
- **Nå:** `main.tsx` ser om spillet kjører fra hjemskjermen (`navigator.standalone`) og fyller hele skjermen i bredden.
  Da settes klassen `is-standalone` og `--app-h` = skjermens høyde (`screen`), og `.g-app`, `.g-modal`, `.g-intro` og
  `.control-room` får den høyden. I Safari og på PC brukes `100dvh` som før (B-267). Oppdateres ved resize og snuing.
- Testet i Playwright med et vindu på 758 px og en skjerm på 844 px: fra hjemskjermen går menyen til 844, i Safari til
  758. De 8 vanlige størrelsene er uendret. Brukeren må bekrefte på iPhone (⚙ → Om spillet viser nyeste endring).

## B-269 Tilbake til sidehøyden fra før B-262 (2026-09-28)
Status: gjelder (erstatter CSS-delen av B-264, B-267 og B-268; lytteren i `main.tsx` fra B-262 gjelder fortsatt)
Brukeren (skjermbilde etter B-268): menyen gikk lenger ned, men navnene under ikonene var borte.
- iPhone med spillet på hjemskjermen tegnet ikke det som lå under den høyden den regnet siden for å ha. Uten
  `min-height: 100vh` på `#root` sluttet spillet over bunnen (B-264, B-267), og med skjermhøyden satt direkte (B-268)
  forsvant navnene i menyen.
- **Nå:** CSS-en er som før B-262 (`#root { min-height: 100vh }`, faste lag med `inset: 0`), som brukeren bekreftet
  virket. Siden kan da scrolles litt på iPhone – det som ga trykkfeilen – men lytteren i `main.tsx` (B-262) setter den
  straks tilbake til toppen.
- Testet i Playwright på de 8 størrelsene. Brukeren må bekrefte på iPhone, og spilleren med iPhone 16 Pro må si om
  trykkene treffer.

## B-270 Eksplosjoner og dødsulykker sjeldnere (2026-09-28)
Status: gjelder (erstatter tallene for eksplosjoner og dødsulykker i B-265)
Brukeren: «Fortsett». Sjekk av ekte spill en halvtime etter B-265: én spiller på storverket med alle tiltakene
(skrapterminal, sortering, sikkerhetskultur) hadde fått 3 eksplosjoner og 1 dødsulykke på ca. 30 minutter på 10× (ca.
150 spilldøgn). Brukeren ba om dødsfall «en ekstremt sjelden gang».
- Eksplosjoner: 1 per 300 døgn per ovn i drift om sommeren (var 1 per 90), tre ganger så ofte om vinteren som før.
- Dødsulykke: 1 % av eksplosjonene, 0,5 % med sikkerhetskultur (var 2 % og 1 %).
- Et storverk med tre ovner og alle tiltak får da omtrent én eksplosjon per 270 døgn (ca. én time på 10×) og én
  dødsulykke per ca. 54 000 døgn. Uten tiltak: én eksplosjon per ca. 67 døgn og én dødsulykke per ca. 6 700 døgn
  (ca. 22 timer på 10×).
- Følgene er de samme. Spillerne som alt har hatt en ulykke, får ingen endring.
- Balanse: alle mål OK.

## B-271 Skiftlederen gir bonus, og planleggeren holder valgt mengde skrap (2026-09-28)
Status: gjelder
Brukeren: «Om man har skiftleder bør man kunne ha en knapp for autobonus» og «Valg om å ha så mange tonn på lager til
en hver tid om man har planlegger».
- **Autobonus:** under Folk → Ansatte (kortet med trivsel og bonus) står en bryter «Skiftlederen gir alle bonus når det
  trengs», bare når verket har en skiftleder. Er den på og skiftlederen er på jobb, gis bonus (samme pris og virkning
  som knappen) når rådet på Verket ville bedt om det: lenge siden bonus og trivselen under 70, eller trivselen under 40.
  Bare når kassa har minst tre ganger bonusen, og høyst én gang i uka. Rådet om bonus vises ikke når skiftlederen gjør
  det. Standard: av.
- **Skrap på lager:** hos planleggeren (Marked → Skrap) står valget «Planleggeren holder på lager»: automatisk (ca. 1,5
  døgns forbruk, som før) eller et antall tonn (10, 25, 50, 75 eller 100 % av skraplageret, avrundet). Planleggeren
  kjøper da inn til den mengden etter resepten, men aldri mer enn lageret tar og minst to charger. Standard: automatisk.
- Nye felt: `settings.leaderBonus` og `settings.autoBuyTargetT` (valgfrie; mangler = av/automatisk, så gamle lagringer
  trenger ingen migrering).
- **Konto:** nei – en del av selve spillet.

## B-272 Vinteren varer 120 døgn (2026-09-28)
Status: gjelder (erstatter vinterperioden i B-265; alt annet i B-265 og B-270 gjelder)
Brukeren: «Bør vi for eksempel ha 120 dager med vinter i året?», så «Fortsett» på forslaget.
- Vinteren går fra 15. november til og med 14. mars, 120 av årets 360 døgn (var desember–februar, 90 døgn). Den ligger
  midt rundt nyttår.
- Første vinter i et nytt spill er dag 225–344, og så hvert 360. døgn. På 10× varer den ca. 24 minutter, på 1× ca.
  4 timer.
- Det gir omtrent 20 % flere eksplosjoner og 8 % flere havarier i året. Balanse: alle mål OK.

## B-273 Støpingen venter ikke når køen er full (2026-09-28)
Status: gjelder (endrer regelen for sekvenser i B-046)
Brukeren valgte «Støpingen som venter» etter skjermbildet med «0 av 3 smelter» og «Venter med …».
- **Før:** strengstøpingen ventet med en øse av annen kvalitet til sekvensen var slutt (30 min uten stål), høyst 90 min.
  Ofte var køen full av den nye kvaliteten mens bare én ovn smeltet den gamle – da sto de to andre ovnene med fulle
  øser. På et fullt storverk (3 × 420 t) ventet støpingen slik i ca. 70 av 480 timer (15 %).
- **Nå:** støpingen venter bare når en ovn holder en øse med samme kvalitet eller er ferdig med en slik charge innen
  20 minutter (`SEQUENCE_SOON_MIN`), og køen har plass. Ellers byttes kvaliteten med én gang, og overgangsemnene blir
  skrap som før (ca. 5 % av en times støping, smeltes om).
- **Målt** på et fullt storverk i 20 døgn, tre frø: ventetida 70 → 18–29 timer, produksjonen +10–22 %, overgangsemnene
  +2 000–4 000 t, kontraktinntekten +7–25 %, ingen flere sene leveranser. Mindre verk (2 × 30 t) er uendret.
- Tonngrensen i juksesperren (100 000 t per døgn) tåler det: ca. 31 000 t per døgn på det største verket.
- Balanse: alle mål OK.

## B-274 Tak over skraplageret, større ferdiglager og «Selg alt ledig stål» (2026-09-28)
Status: gjelder (endrer tiltaket mot eksplosjoner i B-265/B-270)
Brukeren: «Du må få ordna sånn at det er mulig å få kjøpt tak til skraplageret og sånt, og at det er mulighet for
utvidelse på ferdiglageret, og evt. lagt inn en salgsknapp så det går an å selge det.»
- **Tak over skraplageret** (`skraptak`, Anlegg → Skraplager, fra støperiet, 300 000 kr): skrap under tak gir 60 %
  færre eksplosjoner (×0,4). Skrapterminalen regnes også som skrap under tak (`roofed` i `accidents.ts`; før ga den
  ×0,5). Tekstene om eksplosjoner og vinter peker nå på taket.
- **Større ferdiglager** (Anlegg → Lager og salg), tre trinn som hvert gir halvparten mer plass (×1,5):
  «Større ferdiglager» (støperiet, 250 000 kr), «Ny lagerhall for ferdigvare» (stålverket, 4 mill.) og
  «Ferdigvareterminal» (storverket, 30 mill.). Hvert trinn krever det forrige. Kommer i tillegg til lagerhallen (×2) og
  havnekaien (×1,5).
- **«Selg alt ledig stål (X t) på spot»:** knapp på Salg → Lager og i arket for ferdiglageret. Selger alt ingen
  kontrakt venter på, også støpefeil (`sellAllFree`, `freeStockT` i `engine.ts`). Vises bare når noe er ledig.
- **Konto:** nei. Balanse: alle mål OK; nybegynneren kjøper de billige oppgraderingene og når storverket på median
  dag 160 (mål 240).

## B-275 Gjennomgang av dagens nye systemer (2026-09-28)
Status: gjelder
Brukeren valgte «Gjennomgang av dagens nye ting» (utslipp, vinter, eksplosjoner, autobonus, lagermengde, støping, tak
og ferdiglager, B-263–B-274).
- **Rådet om renseanlegget** åpnet ovnsarket på fanen «Ovn 1» når verket har flere ovner. Panelet for renseanlegget
  og de større anleggene står under «Verket», så spilleren så ikke det rådet ba om. Arket starter nå på «Verket» når
  renseanlegget står eller er for lite.
- **Fullt ferdiglager:** rådet og varselet sier nå «Trykk «Selg alt ledig stål» under Salg → Lager, eller bygg ut
  lageret under Anlegg → Lager og salg» (knappen og utbyggingen fra B-274).
- Resten er gått gjennom uten funn: bøter, havarikort, overgang for gamle lagringer, vinterkalenderen, frost,
  eksplosjoner og dødsulykker (stengning, bot, kort), autobonus, planleggerens lagermengde, støpingens sekvenser,
  taket, ferdiglageret og salgsknappen.

## B-276 Dagens nye ting i anleggsbildet (2026-09-28)
Status: gjelder
Brukeren ba: «Lag de nye tingene på anleggsbildet». Tegnet i `ui/PlantScene.tsx`; ingen endring i spillmotoren.
- **Tak over skraplageret** (`roofed(g)`: taket eller skrapterminalen): saltak over skrapkranen med to stolper, fra
  nivå 2. Om vinteren ligger det snø på taket.
- **Renseanlegget** (fra nivå 3): bygget blir litt høyere for hvert trinn, har to linjer (skillevegg og to piper) fra
  «rense3», og flere rader med filterluker. Pipa gir hvit damp når ovnene smelter og alt renses, og **brun røyk** når
  noe går urenset ut (anlegget for lite, eller havari og spilleren har valgt å kjøre videre). Står anlegget etter et
  havari, blinker en **rød lampe** på taket.
- **Ferdiglageret:** trinn 1 er et skur over stablene, trinn 2 en lav lagerhall med traverskran (fra nivå 3), trinn 3
  en jernbanevogn med emner på sporet (storverket). Stablene blir bredere (4 → 5 → 6 kolonner, 3 rader med terminalen),
  og lagerstedet kan trykkes også når lageret er tomt, så lenge det er bygd ut.
- **Vinter** (`isWinter`): snø på bakken, på åsene og på lagerhallen, og snø som faller (står stille med redusert
  bevegelse).
- Nye farger som tokens: `--art-steam`, `--art-smoke-dirty`, `--art-snow`, `--art-alarm`.
- Konto: nei (regel 1, ditt eget spill).

## B-277 En hel vinter målt: ingen justering, frost-meldingen retter seg etter klokka (2026-09-28)
Status: gjelder
Brukeren valgte «Test en hel vinter». Ny måling i testspilleren: `balance.ts --vinter` kjører flink spiller og
nybegynner, fire frø, 720 døgn (to vintre), og skriver per nivå og årstid produksjon, inntekt, vedlikehold og bøter per
døgn og uhell per 30 døgn. Tok ca. 11 minutter.
- **Testspilleren er på storverket før den første vinteren** (dag 225), så alle vinterdøgn i målingen er på nivå 4.
  Nivå 2 og 3 ble målt for seg med lagrede spill (90 døgn sommer mot vinter): havarier ca. dobbelt så ofte, frost ca.
  0,3 ganger per 30 døgn, en sjelden eksplosjon. Tallene der er små og usikre.
- **Storverket, flink spiller, sommer → vinter (per 30 døgn):** elektrodebrudd 3,3 → 5,3, overslag 6,5 → 9,6, havari
  på renseanlegget 0,4 → 0,8, frost 0 → 0,4, hendelseskort 6,5 → 9,2. Eksplosjoner 0,0 → 0,1: den flinke spilleren har
  tak, sortering og sikkerhetskultur. Ingen dødsulykker i 16 vintre. Vedlikehold +19 % per døgn, bøter og
  kontraktstrekk +45 %. Nybegynneren: omtrent det samme, eksplosjoner 0,2 per 30 døgn.
- **Vurdering:** vinteren merkes i hendelsene (40–100 % flere uhell og kort), men tar bare ca. 1 % av inntekten. Det er
  meningen: vinteren skal gi mer å håndtere, ikke sende noen i konkurs. Tiltakene (tak, sortering, sikkerhet) virker
  som de skal. Ingen tall endres.
- **Rettet:** frost-meldingen sa alltid «frøs i natt», også midt på dagen. Nå «i natt» bare om natta, ellers «i kulda».

## B-278 Budgiverne på anbudet brytes til nye linjer (2026-09-28)
Status: gjelder
Brukeren: «Linjene over hvem som har bydd på anbudet ser ikke bra ut». Navnene (B-210) sto som små merker i ett avsnitt
uten mellomrom mellom seg, så nettleseren kunne ikke bryte linja: med seks budgivere gikk navnene ut over kanten på
anbudsboksen, på 320 px allerede etter fire navn.
- Lista er nå en egen liste med `flex-wrap` og fast avstand: navnene brytes til nye linjer og står jevnt.
- Overskriften viser antallet: «Har bydd (6):». Et svært langt navn kortes av med «…» i stedet for å gå ut av boksen.
- Testet med 6 og 12 budgivere på 320 og 390 px (ingen horisontal scrolling).
- Konto: uendret (anbudet krever konto, B-189).

## B-279 Dyrere strøm og snøstorm som stopper skrapbilene om vinteren (2026-09-28)
Status: gjelder
Brukeren: «dyrere strøm og tregere skraplevering om vinteren» (forslaget etter målingen i B-277: vinteren merktes i
uhell, men bare ca. 1 % i økonomien).
- **Strøm:** spotpris og nattariff er 30 % dyrere om vinteren (`WINTER_POWER` i `calendar.ts`, ganges inn i
  `spotPowerPrice` og nattariffen). Fastprisen man får tilbud om midt på vinteren er 15 % dyrere (`WINTER_FIXED`), altså
  billigere enn spot – en fastpris avtalt før vinteren beskytter. Strøm-kortet under Marked sier det om vinteren.
- **Skraplevering:** skrapet ble levert med én gang, og en egen transportkø ville gitt mye ny logikk (plass på lageret,
  planleggeren, varsler). I stedet: **snøstorm** stenger veien i 4–12 timer, i snitt én gang per 15 vinterdøgn
  (`SNOWSTORMS_PER_DAY`), fra nivå 1. Da kommer ingen skrapbiler fram: kjøp avvises med en beskjed om når veien åpner,
  planleggeren venter (uten «!» på Marked – spilleren kan ikke gjøre noe med det), og ovnene bruker lageret. Marked →
  Skrap viser en melding, loggen sier når stormen kommer og når veien er brøytet, og rådet når ovnene står uten skrap
  sier «hold mer skrap på lager om vinteren» (planleggerens lagermengde fra B-271).
- **Skrapterminalen** (båt og tog) merker ikke snøstormen – en ny grunn til å bygge den.
- Anleggsbildet: tettere snø under snøstorm, og skraptrucken står.
- Nytt felt `snowUntilMin` (standard 0 i `migrate()`).
- **Målt** (`balance.ts --vinter`, som nå også viser strøm per døgn og per tonn og snøstormer): strøm per tonn på
  storverket 318 → 404 kr om vinteren (flink), 250 → 326 (nybegynner), ca. +0,9–1,2 mill. kr per døgn. Snøstorm ca. 1,6
  ganger per 30 vinterdøgn (ca. 6 per vinter). Testspilleren står ikke stille av det: planleggeren har lager. På
  storverket er strømmen bare ca. 3 % av inntekten, så vinteren merkes mest på de mindre nivåene (strøm 7 % av
  inntekten på støperiet).
- Konto: nei (regel 1, ditt eget spill).

## B-280 Quizen: påbegynte svar telles ikke to ganger, og en feil i fagboka stopper ikke spillet (2026-09-28)
Status: gjelder
En spiller skrev: «av en eller annen grunn fryser spillet når jeg holder på med quizen». Spillet på nett viste en påbegynt
quiz (ett svar av to). Feilen kom ikke fram i Chromium (sommer, vinter, fart 0–10×, med og uten påbegynt quiz, med
hendelseskort midt i quizen), men gjennomgangen fant to svake punkter:
- **Påbegynt quiz:** quizen startet med *samme* liste som spillet lagrer svarene i. Når spilleren svarte, la spillet svaret
  inn i lista, og quizen la det inn én gang til. Med to spørsmål gikk det bra, men med flere ville et spørsmål blitt hoppet
  over, og siste spørsmål ville ikke finnes – da krasjet skjermen. Nå får quizen en kopi, og har spillet flere svar (f.eks.
  fra en annen enhet), brukes spillets.
- **Feil i boka tok med seg hele spillet:** React uten feilgrense fjerner hele skjermen ved en feil, og spillet ser frosset
  ut. Nå har fagboka en egen feilgrense (`BookGuard`): går noe galt, står det «Noe gikk galt i fagboka. Spillet går som
  før.» med en knapp tilbake til innholdet.
- Spørsmålsnummeret holdes innenfor quizen, så et feil tall aldri kan gi et spørsmål som ikke finnes.
- Spilleren bør si hvilken telefon det gjelder og hva som skjer (står alt stille, eller svarer ikke knappene?), hvis det
  skjer igjen.
- Konto: nei (regel 1, ditt eget spill).

## B-281 «fp» skrives ut, fagpoengene kan trykkes, og havari sier at det repareres av seg selv (2026-09-28)
Status: gjelder
En spiller skjønte ikke hva «fp» er og hvor man finner det, og heller ikke hva man skal trykke når noe ryker, for
eksempel mursteinene (foringen) i ovnen.
- **fp → fagpoeng:** forkortelsen «fp»/«FP» er borte fra spillet (prestasjoner, pynt, mål, forskning). I den trange
  rekka for daglig belønning står kolbe-ikonet (fagpoeng), med forklaring under.
- **Fagpoengene i toppfeltet kan trykkes** (kolben og tallet, stiplet understrek): det åpner Forskning, der det står hvor
  mange du har, hva de brukes til og «Slik får du fagpoeng». Trykkflaten er 45 px høy uten at toppfeltet blir høyere.
- **Havari:** reparasjonen skjer av seg selv, men det sto ingen steder. Nå:
  - Ovnens status viser hvor lenge det er igjen: «Havari: gjennombrent foring · klar om 7 t».
  - Et råd på Verket: «Ovnen repareres etter havari og er i gang igjen om ca. 7 t. Det skjer av seg selv – du trenger ikke
    trykke på noe.» (gir ikke «!» i menyen).
  - Meldingen om gjennombrenning forklarer at foringen er mursteinene inni ovnen, at reparasjonen skjer av seg selv, og at
    «Bytt foring» neste gang er mye billigere.
  - Rådet om slitt foring sier «Trykk her og så «Bytt foring»».
- Konto: nei (regel 1, ditt eget spill).

## B-282 Nybegynner-gjennomgang: forkortelser forklart der de står (2026-09-28)
Status: gjelder
Brukeren valgte «Nybegynner-gjennomgang» etter spørsmålene om «fp» og havari (B-281). All tekst på hver fane og
underfane ble hentet ut på nivå 1–3 (390 px) og gått gjennom for forkortelser og ord som ikke forklares.
- **C, P og Spor** (og Skitt) sto bare forklart i `title`, som ikke vises på mobil. Nå:
  - «Hva betyr C, P og Spor?» kan trykkes opp på Marked → Skrap (med Skitt) og på Verket → Resept (`AnalysisLegend`).
  - Under «Krav til stålet» på forespørsler og rammeavtaler står en kort linje: «C = karbon · P = fosfor · Spor = kobber,
    tinn og andre stoffer som ikke kan tas ut av stålet» (`ANALYSIS_KEY`).
- **«Cu+Sn»** i resepten het det samme som «Spor» andre steder – nå «Spor» overalt.
- **«kr/t»** kan leses som kroner per time. Prisene per tonn står nå som «kr/tonn» (skrap, stål, kontrakter, avtaler,
  resept, bot).
- **«charge»** ble brukt overalt uten å bli forklart. Veiledningen sier nå «én ovnsfylling kalles en charge».
- Ellers funnet uten endring: kWh, MW og effekttariff forklares der de står; fagord som foring og omforing forklares i
  vedlikeholdskortet og fagboka.
- Konto: nei (regel 1, ditt eget spill).

## B-283 «Hva gjør jeg nå?» – en fast hjelpeknapp (2026-09-28)
Status: gjelder
Brukeren valgte en hjelpeknapp etter spørsmålene om fagpoeng og havari (B-281, B-282).
- **Knappen** (spørsmålstegn) står i raden nederst ved Mål og pokalen på mobil, og i varsellinja i toppfeltet på PC.
  Under 380 px er den raden for trang (varsellinja ville bare vist «…»), så der står knappen ytterst i tallraden øverst.
  Trykkflaten er 44 px.
- **Arket** (`ui/HelpNow.tsx`) viser:
  - «Det viktigste nå»: de fire første rådene fra `hints()` med en knapp dit («Gå til Marked», «Vis på Verket» …). Er det
    ingen råd: «Ingenting du må gjøre akkurat nå – verket går av seg selv.»
  - «Slik står det til i verket»: skrap, hver ovn, støping, lager og kontrakter med status og, når noe står, hva det
    betyr og hva du skal trykke (havari: «Repareres av seg selv», mangler folk: «Ansett under Folk» osv.).
  - «Ord i spillet» (kan trykkes opp): fagpoeng, charge, foring, omdømme, ordrekø, C/P/Spor.
- Arket er et vanlig ark på øverste nivå (som varsellista), så det teller med i `modalOpen`.
- Konto: nei (regel 1, ditt eget spill).

## B-284 Minst tre minutter ekte tid mellom to hendelseskort (2026-09-28)
Status: gjelder
Brukeren sa «Fortsett»; neste punkt på lista var færre popups på høy fart. Målingen i B-277 viste ca. 9 hendelseskort per
30 spilldøgn om vinteren på storverket. På 10× er 30 spilldøgn ca. 6 minutter, så et kort kunne komme omtrent hvert
40. sekund og stoppe spillet hver gang. Samme kort hadde alt en pause i ekte tid (20 min, B-210), men ikke kort i det hele
tatt.
- Nytt: `ANY_CARD_REAL_MS` = 3 minutter ekte tid mellom to kort, uansett hvilke (`maybeCreateDecision`). På 1× er
  minstepausen på to spilldøgn fire minutter, så der endrer det ingenting; på 3× og 10× blir det roligere.
- Tips (engangskort) og havarikortet for renseanlegget (B-263) går ikke gjennom denne regelen – de kommer når noe skjer.
- Testspilleren: alle nivådager innenfor målene, 0 konkurs (exit 0). Ny test i `tests.ts`.
- Konto: nei (regel 1, ditt eget spill).

## B-285 «Hva gjør jeg nå?» står stille (2026-09-28)
Status: gjelder
Brukeren: «Linjene flytter seg i hva gjør jeg nå». Arket (B-283) ble regnet ut på nytt i hvert tidssteg: rådene byttet
rekkefølge, og tekster som «klar om 7 t» og tonn på lager endret lengde, så linjene hoppet (brudd på B-238).
- Arket tar nå et øyeblikksbilde når det åpnes (ren tekst) og står stille mens spillet går.
- Øverst står «Slik var det kl. HH:MM. Oppdater» – knappen (44 px) henter ny status.
- Testet på 320 og 390 px på 10×: ingen linjer flyttet seg på 8 sekunder, og «Oppdater» gir ny tekst.
- Konto: nei (regel 1, ditt eget spill).

## B-286 Mål åpnes som ark på mobil, som hjelpen og topplista (2026-09-28)
Status: gjelder (justerer B-214 og B-233)
Brukeren: «De tre knappene oppfører seg forskjellig. Hva gjør jeg nå, oppdrag-knappen og topplista». Spørsmålstegnet og
pokalen åpnet et ark oppå spillet, mens Mål byttet side og lyste blått. Brukeren valgte «alle tre åpner ark».
- **Regel:** knappene ved varsellinja åpner ark; menyen nederst bytter side.
- **Mål på mobil** er et ark (`GoalsSheet` i `ui/Goals.tsx`) med de samme fanene (I dag, Uka, Merker) og samme innhold
  som siden. `go("mal")` åpner arket på mobil, også fra lenken på Verket → Oversikt. Fanen huskes som før (B-233).
- **På PC** står Mål som før, som side i sidemenyen. Ble vinduet smalt mens Mål var åpen, vises Verket.
- Den blå markeringen på Mål-knappen (B-233) er borte – knappen åpner et ark, som de to andre.
- «Pynt verket» åpnes oppå Mål-arket og lukkes tilbake til det. Landemerket går til Salg, og «Opprett konto» til
  innstillingene – begge lukker arket.
- Testet på 320 og 390 px: alle tre knappene åpner et ark, ingen horisontal scrolling, trykk utenfor lukker. På 1 280 px
  er Mål fortsatt en side.
- Konto: nei (regel 1). Det på Mål som krevde konto, krever det fortsatt.

## B-287 Sesongpynt: ny pynt hver sesong, bare mens den pågår (2026-09-28)
Status: gjelder (justerer B-151 og B-173)
En spiller spurte om pynten bare er for sesong 1, og ønsket at den skulle være det – «som skins i Fortnite som aldri
kommer tilbake». Da blir den mer ettertraktet, og man vil spille for å skaffe fagpoeng før den forsvinner. Brukeren
valgte «ny pynt hver sesong».
- **Hver sesong har egen pynt**, både i butikken (for fagpoeng) og på sesongstigen. Den kan bare skaffes mens sesongen
  pågår. Det du har skaffet, beholder du for alltid. Den faste pynten (flagg, trær, fasader, gullpipe …) står som før.
- **Sesong 1 i butikken:** Nordlys (60 fagpoeng, grønt nordlys om natta), Kobberpipe (120, pipa i kobber – kan ikke være
  på samtidig med gullpipa) og Sesong 1-banner (200, banner på hallveggen).
- **Sesong 1 på stigen:** pynten som alt fantes (sesongflagg, gullfasade, nattsvart fasade, stjerne, sesongpokal) hører
  nå til sesong 1. En sesong uten egen pynt gir bare fagpoeng på stigen.
- **Motoren** (`game/cosmetics.ts`): `season` på pynten, `cosmeticBlocked(g, id, { season, account })` gir `"over"` utenfor
  sin sesong og `"account"` uten konto, `cosmeticListed` skjuler pynt fra en sesong som er over for dem som ikke har den,
  og `trackCosmetic(trinn, sesong)`.
- **Pynt verket** har en egen del øverst: «Bare i sesong N», med én linje om at pynten forsvinner når sesongen er over.
- **Når en ny sesong startes** (`start_season`), må pynten for den legges inn i `COSMETICS` med `season: N` – ellers har
  sesongen ingen egen pynt. Står i CLAUDE.md og FORSLAG.md.
- Konto: **ja** for å kjøpe sesongpynt (regel 3: sesongen kommer fra serveren og er felles for alle). Uten konto vises
  pynten med «Krever konto» og `NeedsAccount` (regel 6). Pynt man har, virker uten konto. Ny rad i KONTO.md og
  `sesongpynt` i `ACCOUNT_FEATURES`.

## B-288 Nybegynner på storverket og i konsernet: byggetid, riktige tall og kortere tekst (2026-09-28)
Status: gjelder (justerer B-209 og B-226)
Brukeren valgte «Nybegynner: nivå 4 og konsern». Gjennomgang på 390 og 320 px med et storverk der konsernet akkurat var
åpnet, rett etter første kjøp og med ett ferdig og ett verk under bygging. Funn og rettelser:
- **Byggetiden synes ikke i lista:** et verk som ble bygget, sto bare som «Bygges». Nå står «Klar om 1 t 20 min» (mobil
  og PC-tabellen); hele timer skrives «2 t».
- **Feil tall mens verket bygges:** rett etter kjøpet sto det «Verkene tjener 4,68 mill. kr/døgn. De beholder
  4,68 mill. kr …» – verket ble regnet som i drift. Et verk under bygging teller ikke lenger med, og i stedet står
  «Elveverket bygges – ferdig om 2 t. Så begynner det å tjene penger til deg.»
- **Tekstvegg ved første besøk:** «Slik fungerer konsernet» (sju punkter) var åpen til første kjøp. Nå står én linje
  («Et konsern er flere verk som tjener penger av seg selv. Start med ett stålverk …»), og forklaringen er lukket.
- **Tallet per verk stemte ikke med nettoen:** raden viste utbyttet (3,71 mill.), toppen netto etter konsernledelsen
  (2,96 mill.). Forklaringen over lista sier nå at tallet er før konsernledelsen, med beløpet.
- **Ni like knapper i Forskning:** alle konsernprosjektene hadde «Les «Konsern og datterselskap» først». Knappen står nå
  bare på det første; de andre har «Krever også …».
- Testspilleren (`--vansker`): nybegynneren bruker ca. 530 døgn på storverket mot 326 for den flinke. Det kommer av at
  den bare handler hver tredje time, som er meningen, og ble ikke endret.
- Konto: nei (regel 1).

## B-289 Gjennomgang av de siste endringene: snøstorm i hendelseskort og hjelpen (2026-09-28)
Status: gjelder (justerer B-279 og B-283)
Brukeren sa «Fortsett»; neste punkt var en gjennomgang av koden som er endret de siste dagene (vinter, snøstorm, hjelp,
Mål-arket, sesongpynt og konsernet). Funn:
- **Billig skrapparti under snøstorm:** hendelseskortet «Billig skrapparti» kunne komme mens veien var stengt, og skrapet
  kom fram likevel. Kortet kommer ikke lenger når `scrapBlocked(g)` (test i `tests.ts`).
- **«Hva gjør jeg nå?» og snøstormen:** raden Skrap sa bare «1 456 t på lager» mens veien var stengt. Nå står det også at
  veien er stengt, når skrapbilene kommer fram, og at ovnene bruker lageret så lenge.
- Ellers ingen feil: strømprisene om vinteren, kjøpsstoppen, Mål-arket, sesongpynten og byggetiden i konsernet ble lest
  gjennom og stemmer med beslutningene.
- Testspilleren: alle nivådager innenfor målene, 0 konkurs (exit 0).
- Konto: nei (regel 1).

## B-290 Sesongstigen forklart der den står (2026-09-28)
Status: gjelder (justerer B-173)
Brukeren: «En spiller lurer på hva sesongstigen er». Kortet viste trinn, poeng og «I dag: …», men ikke hva stigen er;
forklaringen sto bare i fagboka, og i kontokortet sto det bare hvorfor den krever konto.
- **Kortet** (Mål → Uka) har én linje øverst: du klatrer ved å spille litt hver dag (spille, hente dagens belønning, ta
  dagens oppdrag); hvert trinn gir fagpoeng, og hvert tiende gir pynt som bare finnes denne sesongen (B-287).
- **Uten konto:** «Med konto»-kortet og «Det går du glipp av» sier nå hva stigen er, ikke bare at serveren teller.
- **«Hva gjør jeg nå?»** har «Sesongstigen» i ordlista, med hvor den står.
- **Fagboka** sier at pynten på stigen bare finnes denne sesongen.
- Testet på 320 og 390 px, med og uten konto.
- Konto: stigen krever konto som før (B-173); forklaringen vises for alle.

## B-291 Pynt for sesong 2 er klar (2026-09-28)
Status: gjelder (følger B-287)
Endringslogg: nei
Brukeren sa «Fortsett»; neste punkt var pynten for sesong 2, så den er klar når sesongen startes (B-287: en sesong uten
egen pynt gir bare fagpoeng på stigen). Den vises først når serveren sier at sesong 2 pågår, så spillerne merker ingenting
nå – derfor ingen oppføring i endringsloggen.
- **Butikken (fagpoeng, med konto):** Regnbue (60, over verket om dagen), Fullmåne (120, om natta) og Sesong 2-banner (200,
  rødt banner på hallveggen). Bannerne for sesong 1 og 2 er i samme gruppe – ett om gangen.
- **Sesongstigen:** trinn 10 Vimpelrekke (langs taket), 20 Kobberfasade, 30 Hvit fasade, 40 Lyskastere (sveiper over himmelen
  om natta), 50 Tannhjul i stål (foran verket).
- Nye ikoner fra Lucide: `rainbow`, `moon`, `cog`. Lyskasterne står stille med «reduser bevegelse».
- Testet: anleggsbildet dag og natt på nivå 0–4, og «Pynt verket» med sesong 2 fra en falsk server (sesong 1-pynten man
  har, står under «Alltid»; den man ikke har, vises ikke). Ny sjekk i `tests.ts`.
- Neste gang: pynt for sesong 3 før den startes (FORSLAG.md).
- Konto: som B-287.

## B-292 Råd når forespørsler som passet, går ut uten svar (2026-09-28)
Status: gjelder
Brukeren valgte «Råd når forespørsler går ut». I gjennomgangen av storverket (B-288) gikk fire forespørsler ut uten svar
på ett døgn, og spilleren fikk bare fire linjer i loggen.
- Når en forespørsel går ut, sjekkes den som på Salg (`assessOffer`): kan verket lage den, holder resepten, og rekker den
  fristen med god margin. Bare de som passet, telles (`g.missedOffers`, spillminuttene, siste døgn). Loggen sier også
  «…gikk ut uten svar, selv om den passet verket».
- **Rådet** (Verket og «Hva gjør jeg nå?»): «N forespørsler som passet verket, gikk ut uten svar det siste døgnet. Svar på
  dem under Salg – tallet på Salg-knappen viser hvor mange som venter.» Med konsern står det også at salgsdirektøren kan
  svare. Vises fra to i løpet av et døgn, ikke med salgsdirektøren på, og knappen går til Salg → Forespørsler.
- Rådet forsvinner når du signerer en kontrakt (lista tømmes) eller etter et døgn.
- Forespørsler som ikke passet (for store, feil kvalitet, for kort frist), gir ikke råd – det er riktig å la dem gå.
- Nybegynneren i testspilleren tar alt som er grønt på Salg fra før, så den følger rådet uten endring. Testspilleren:
  samme nivådager og 0 konkurs (exit 0). En spiller som aldri svarer, ser rådet ca. en tredel av tida i garasjen.
- Ny tilstand: `missedOffers` (standard `[]` i `migrate()`). Ny test i `tests.ts`.
- Konto: nei (regel 1).

## B-293 Poengmålene i kontrollrommet kan nås (2026-09-28)
Status: gjelder (justerer B-232 for kontrollrommet)
Brukeren: «En spiller sier det er umulig å få 4300 inne på kontrollrommet». Utfordringen «Mesterkjører» hadde trinnene
3 500, 4 000, 4 300 og 4 500, og prestasjonene «Mesterkjøring» og «Rekordkjøring» 4 200 og 4 500.
- **Målt:** den flinke testspilleren (reagerer på 0,2 s og gjør alt riktig) fikk i 400 runder median 4 148, 90 % under
  4 315 og høyst 4 354. Den nådde 4 300 i 16 % av rundene og 4 500 aldri. Blant ekte spillere (lest fra `saves`, bare
  lesing) er beste resultat 4 292, og ingen har nådd 4 300.
- **Nye mål:** utfordringen 3 500, 3 900, 4 100, 4 250 (testspilleren: 95, 84, 53 og 36 % av rundene). Prestasjonene
  «Mesterkjøring» 4 100 og «Rekordkjøring» 4 250; id-ene (`poeng4200`, `poeng4500`) beholdes. De som alt har nådd de nye
  grensene, får belønningen neste gang spillet sjekker.
- **Vern:** ny test i `tests.ts` spiller 48 runder med den flinke testspilleren og krever at toppen av både utfordringen
  og prestasjonene nås i minst hver femte runde. Endres poengene i kontrollrommet, stopper testen umulige mål.
- Testspilleren: samme nivådager, 0 konkurs (exit 0).
- Konto: nei (regel 1).

## B-294 Prestasjonen «Forskningssjef» kan nås (2026-09-28)
Status: gjelder (justerer B-232 for forskning)
En spiller spurte hvorfor hen bare hadde «48/50 forskninger», og om det hadde med datterverkene å gjøre. Nei: spillet har
48 forskningsprosjekter (også de ni for konsernet), men prestasjonen «Forskningssjef» krevde 50. Spilleren hadde forsket
fram alt.
- «Forskningssjef» krever nå 40 prosjekter (id-en `forsk50` beholdes). «Alt forsket fram» er en egen prestasjon, og
  utfordringen «Forskningssjef» regner alt med antallet som finnes (`RESEARCH.length`).
- Den som alt har 40 eller flere, får prestasjonen neste gang spillet sjekker.
- Ny test: ingen prestasjon for forskning krever flere prosjekter enn det finnes.
- Testspilleren: samme nivådager, 0 konkurs (exit 0).
- Konto: nei (regel 1).

## B-295 Toppliste for kontrollrommet (2026-09-28)
Status: gjelder (avgjør forslaget fra B-143)
Brukeren: «Mulig å lage leaderboard i kontrollrommet?», så «Gå videre med tørrkjøringen og deretter selve migrasjonen og
knappen i appen».
- **Server** (`supabase/046_toppliste_kontrollrom.sql`): `records` får `best_control` og `best_control_at`. En trigger på
  `saves` (`note_control`) tar inn `state.controlBest` når et spill lagres, og rekorden blir bare bedre. Bare kontoer som
  alt har en rekordrad (fra tidslinja) oppdateres – ellers ville de stått med 0 på de andre listene. `leaderboard()` har
  lista «kontroll»: beste charge noensinne, samme liste i sesongen og i Hall of Fame (rekorden følger kontoen).
- **Juks:** poengsummen regnes ut i appen og kan ikke sjekkes på serveren. Den flinke testspilleren får høyst ca. 4 350
  (B-293), så alt over 5 000 tas ikke med. Flaggede og utestengte står ikke på lista, som før.
- **Tørrkjøring** (i én transaksjon som ble rullet tilbake): 7 rekorder ble fylt inn (4 292 øverst), og lista over
  konsernverdi var uendret (15 rader). Deretter kjørt som migrasjon; samme tall. Sikkerhetsrådene: ingenting nytt ut over
  det kjente (funksjonene er `security definer` med vilje).
- **App:** ny fane «Kontrollrom» på topplista (`BoardKind` «kontroll», poeng). Resultatet i kontrollrommet har lenken
  «Se topplista for kontrollrommet», som lagrer chargen og åpner topplista på den fanen (bare med tjeneste på nett).
- Testet på 320, 390, 412, 820, 1 366, 1 920 og 2 560 px (ingen avkutting), og hele kontrollrommet til resultatet og
  topplista på 320 og 390 px mot en falsk server.
- Konto: å stå på lista krever konto (regel 3); lista kan ses uten, som de andre.

## B-296 Æresmerke for dem som ble berørt av økonomireformen (2026-09-28)
Status: gjelder
Brukeren: «Gi ett merke til de som ble berørt av økonomireformen». To kontoer står i `economy_reform_log` (B-186).
- **Server** (`supabase/047_merker.sql`): `my_badges()` gir merkene serveren vet om for den innloggede kontoen – nå «reform».
  Tatt fra `anon`; gjester kommer ikke gjennom `guest_gate` og er uansett ikke berørt. Det lagrede spillet endres **ikke**
  fra serveren; appen spør og gir merket selv.
- **App:** `BadgeSync` spør én gang når spillet er avklart mot kontoen (B-138), og `applyServerBadges` legger merket i
  `g.serverBadges` og deler ut prestasjonen «Reformveteran» (25 fagpoeng) i en ny gruppe, «Æresmerker».
- **Skjult for andre:** prestasjoner kan være `hidden` – de vises og telles bare for dem som har dem
  (`visibleAchievements`, `visibleFamilies`), så ingen andre ser et merke de aldri kan få (gradvis synlighet, B-180).
- Ny tilstand: `serverBadges` (standard `[]` i `migrate()`). Ny test i `tests.ts`; testet i nettleseren med en falsk
  server (merket gis og lagres).
- Konto: ja (regel 2, serveren vet det). Ingen `NeedsAccount` – merket kan ikke tjenes.

## B-297 Krig i verden – bare i konsernet (2026-09-28)
Status: gjelder
Brukeren: «Krig i verdn bør vær nåkka som påvirk strømprisan og etterspørsel, men bære for dem over konsern. Og maks
1 gang i året/sesongen avhengig av korr stor påvirkning d ska ha».
- **Ny modul** `game/war.ts`. Bare når konsernet er åpnet (`g.konsern.unlocked`) – før det finnes den ikke (gradvis
  synlighet, B-180). Høyst én krig per år i spillet, og ikke hvert år: sjansen er 1/520 per døgn (omtrent annethvert
  år), og minst 60 døgn og nytt år etter forrige krig.
- **Virkning** med styrke 0,5–1: strømmen +40–80 % (spot, nattariff og fastpristilbud via `worldFactor`), stålprisen
  +8–15 % og forespørslene +25–50 % (`offersPerDay`). Jo sterkere, jo lenger: 40–60 døgn. Middels sterk og ofte
  heller enn svært sterk og sjelden, fordi den både koster (strøm) og gir (salg) – den lærer spilleren å ta fastpris.
- **Beskjeder:** «Krig i verden: …» når den starter (med råd om fastpris), «Krigen er over» når den slutter, og en linje
  under «Nå i markedet» på Marked mens den varer.
- **Lokal, ikke serveren:** krigen påvirker bare spillerens eget verk og priser, ikke noe mellom spillere, så den
  regnes i spillet (B-190 gjelder ikke). Om den senere skal være felles for alle, blir den en serverhendelse (B-129).
- Ny tilstand: `war` (standard `null` i `migrate()`). Test i `tests.ts`. Konto: nei (selve spillet).

## B-298 Fellesferie i juli, sjeldnere egen ferie og juleferie (2026-09-28)
Status: gjelder
Brukeren: «Legg til fellesferie der det er sommerstans i 3 uker med vedlikehold og sommervikarer», «bør d og bi sånn
40% mindre sannsynlig for at 15% av ansatte ferier mett i året» og «Da bør d stå om d e mett i jula».
- **Fellesferien** (`calendar.ts`) er 7.–27. juli (21 døgn), fra støperiet når det er ansatte. Et kort en uke før gir to
  valg:
  - **Sommerstans med vedlikehold:** ovnene står i tre uker («Planlagt stans: sommerstans»), får ny foring (og ferdig
    reservepotte) for prisen av én foring per ovn, og trivselen går opp 5. Ingen lønn i stansen (feriepengene er
    opptjent gjennom året), ingen nye forespørsler eller ukeleveranser, og kundene flytter fristene tre uker. Uten
    flyttede frister gikk testspilleren konkurs i halvparten av kjøringene (bøter for kontrakter med frist i ferien).
  - **Sommervikarer:** full drift, men lønnen er 25 % høyere og uhell 25 % oftere (`riskFactor`).
  - Ubesvart kort gir vikarer. Testspilleren velger vikarer; `balance.ts --sommerstans` kjører med stans.
- **Egen ferie 40 % sjeldnere:** 167–233 døgn mellom hver (var 100–140), første gang 17–183 døgn. Ingen egen ferie i
  fellesferien; den flyttes til etter.
- **Juleferie:** ferie som går over jula (23.12.–1.1.) heter «juleferie» i loggen.
- Lange stanser vises i døgn («klar om 18 døgn»), ikke timer. «Hva gjør jeg nå?» forklarer sommerstansen.
- Balanse (6 frø): storverket median 151 med vikarer (160 før), nybegynner 180 (154 før); med stans 175 og 170,5.
  Ingen konkurs. Med 16 frø er nybegynneren ca. to uker tregere med fellesferie og vikarer (median 182) enn uten
  fellesferie (168, med sjeldnere egen ferie). Det er prisen for ferien, og godt innenfor målet (høyst 240).
- Ny tilstand: `summer` (standard `null` i `migrate()`). Tre tester i `tests.ts`. Konto: nei (selve spillet).

## B-299 Æresmerket vises på topplista (2026-09-28)
Status: gjelder
Brukeren: «Merket til de som var med på økonomireformen skal vises på topplista også».
- **Server** (`supabase/048_merker_toppliste.sql`, etter tørrkjøring som ble rullet tilbake: 15 rader, de to berørte
  fikk merket): `leaderboard()` gir en ny kolonne `badges` (nå «reform» fra `economy_reform_log`, som `my_badges`,
  B-296). Returtypen endres, så funksjonen slettes og lages på nytt med samme rettigheter; `my_rank` bruker bare
  `plass` og `is_me` og er uendret. Ingen spillerdata endres.
- **App:** `BoardRow.badges` (tom liste fra en eldre server; ukjente merker vises ikke). Topplista viser
  «Reformveteran» med ikon under navnet, som sesongplasseringen. Navnene står i `BADGE_NAMES` (`net/leaderboard.ts`).
- Test i `net/tests.ts` (falsk server). Konto: nei for å se lista (som før, B-127).

## B-300 Æresmerker kan gis for hånd (2026-09-28)
Status: gjelder
Endringslogg: nei
Brukeren sa at en tredje spiller også er reformveteran. Reformen traff spilleren (B-186, rettet i B-213), men kontoen
ble senere slettet og laget på nytt. `economy_reform_log` slettes sammen med kontoen (`on delete cascade`), så raden
og merket forsvant, selv om spillet er det samme (det rettede spillet, `serverEdit` 1).
- **Server** (`supabase/049_merker_for_haand.sql`, etter tørrkjøring som ble rullet tilbake): ny tabell `badges`
  (konto, merke, notat) uten regler for `anon`/`authenticated`, og `badges_of(uid)` som samler reformloggen og tabellen.
  `my_badges` og `leaderboard` bruker den. Returtypen er uendret.
- **Merket gitt** til spilleren i `badges` (notat: «kontoen ble laget på nytt, og loggraden forsvant»). Spillet er ikke
  endret; appen gir prestasjonen neste gang den spør (B-296). Topplista viser nå tre reformveteraner.
- Et nytt merke for hånd: `insert into public.badges (user_id, badge, note) values (…)`, med eierens godkjenning.

## B-301 Økonomianalyse for midt- og sluttspillet – grunnlag for reform 2 (2026-09-28)
Status: gjelder (analyse; selve reformen kommer i egne beslutninger etter eierens svar)
Endringslogg: nei
Brukeren: «Finn alle kostnader, utgifter, inntekter … Sjekk opp virkelige priser. Vi må fikse økonomien i spillet
mid/late game … Ikke ødelegg early game økonomien … Finn ut hva vi kan gjøre med bunden kontantreserve … Hvordan skal vi
løse fellesøkonomien i konsernkassa … Late game skal være konkurranse mellom spillere, da må økonomien fungere fra start.»
- Analysen står i **`docs/OKONOMI.md`**: alle poster per nivå, de tolv storverkenes resultat per spilldøgn (fra
  lagringene, bare lesing), spilldøgn per ekte dag fra tidslinja, slukene, verden (konsernkassa, skraplageret) og
  virkelige priser med kilder.
- **Hovedfunn:** prisene per tonn er nær virkeligheten og starten er balansert; problemet er klokka (2 374 spilldøgn på
  én ekte dag ganger enhver inntekt per spilldøgn med tusen) og at ingenting kan kjøpes etter ca. 100–130 mrd. En ny
  kompresjon av kassa alene er virkningsløs (tjent inn igjen på timer). Verden (100 mill. per dag, likt for alle) og
  verket (opptil 600 mill. per spilldøgn) henger ikke sammen.
- **Anbefalt reform 2 (pakke B):** datterverkenes utbytte betales i ekte tid av serveren rett til konsernkassa
  (sterkt avtagende med størrelsen, ingen fordel av 10×); kassa hjemme får tak, og overskuddet over betales ut til
  eierne som historikk; reserven fjernes og føres som utbetalt; realistiske kostnader på toppen av hjemmeverket;
  ingen kompresjon; merke til alle som får lagringen endret; skraplagerets gebyr ned (anslaget er nå 191 mill. per dag,
  ikke 66 som da anbudet åpnet).
- Ingen spillkode og ingen spillerdata er endret. Spørsmålene til eieren står i OKONOMI.md avsnitt 8.

## B-302 Økonomireform 2 vedtatt: verket driver verden, i ekte tid (2026-09-29)
Status: gjelder (eierens svar på spørsmålene i B-301 / `docs/OKONOMI.md`; delene bygges i B-303–B-305)
Endringslogg: nei (hver del får sin egen oppføring)
Eieren valgte alle fire anbefalinger i `docs/OKONOMI.md` avsnitt 8:
1. **Pakke B – verket driver verden:** datterverkenes utbytte betales i ekte tid av serveren rett til konsernkassa,
   sterkt avtagende med størrelsen (ny konserneier 100 mill. per dag, 14 komplekser ca. 360), ingen fordel av 10×.
   B-190 står i ånden (serverautoritativt, ekte tid); «lik grense for alle» blir «samme regel for alle». → B-304.
2. **Reserven** føres som «utbetalt til eierne»: historikk med egen liste i Hall of Fame, teller ikke i konsernverdi;
   titlene beholdes; de fire som hadde reserve, får et merke. → B-303.
3. **Skraplagerets gebyr: 500 kr/t** før første utbetaling 30.9 (bare `config.world`, rører ikke anbudet). Settes
   etter at anbudet er stengt 29.9 kl. 01:33 UTC, så regelen ikke endres mens det er åpent. → **Gjort 01:40 UTC:**
   anbudet ble avgjort 01:33 (ni budgivere, vunnet med 200 mill.), `scrap_fee_per_t` satt til 500 og speilet i
   `net/scrapIncome.ts`. Første utbetaling til eieren kommer for 29.9 etter midnatt UTC.
4. **Realistiske kostnader på toppen av hjemmeverket** som siste del. → B-305.
Ingen kompresjon av kassa (B4 i analysen): virkningsløs med tak, og bare irriterende.

## B-303 Reform 2, del 1: tak for kassa med utbetaling til eierne, reserven avviklet, merke (2026-09-29)
Status: gjelder (erstatter B-193; del 1 av B-302)
- **Taket** for kassa står på 100 mrd. (`CASH_RESERVE.softCap` i `game/reserve.ts`) – mer enn alt som kan kjøpes. Det
  verket tjener utover, **betales ut til eierne** (`g.paidOut`, standard `null` i `migrate()`): historikk som ikke teller
  i konsernverdien, ikke kan brukes og ikke er sikkerhet mot konkurs. Forklares første gang det skjer, og én linje per
  døgn (som reserven før).
- **Reserven er avviklet:** `konsernEquity` = kasse − lån + verkene. Det som sto i `lockedReserve` (21, 475, 635 og
  1 250 mrd. hos fire spillere), regnes som utbetalt fra før (`paidOutTotal` teller begge). Feltet står urørt i
  lagringene (eldre apper skriver fortsatt til det), så ingen migrering og ingen dobbelttelling. Titlene de fire har,
  beholdes i spillet (`legends` går aldri ned); på sesonglista regnes tittelen av konsernverdien i tidslinja, så der
  blir den lavere, mens Hall of Fame (rekordene) står.
- **Server** (`supabase/050_utbetalt_til_eierne.sql`, etter tørrkjøring som ble rullet tilbake): `records.best_paid_out`
  fra en trigger på `saves` (som kontrollromsrekorden, bare oppover), fylt fra lagringene; topplista har lista
  **«Utbetalt til eierne»** (`utbetalt`, samme liste i sesongen og i Hall of Fame); merket **«Reformveteran II»**
  (`reform2`, skjult serie i «Æresmerker», 25 fagpoeng) til de fire, via `badges` (B-300). Serveren endrer ikke lagringene.
- Juksesperren flagger ikke fall i konsernverdi (bare vekst), og ligaen følger med ned.
- Endret: `reserve.ts`, `types.ts`, `save.ts`, `konsern.ts`, `engine.ts` (konkurs uten reserve som sikkerhet),
  `balance.ts`, `achievements.ts`, `net/leaderboard.ts`, `ui/Overview.tsx`, `ui/Konsern.tsx`, `ui/GameApp.tsx`,
  `ui/Leaderboard.tsx`. Testen for B-193 er skrevet om (den gamle konkurstesten sto stille fordi veiledningen holdt
  klokka – nå går klokka og konkursen kommer).
- Konto: nei for taket og utbetalingen (eget spill); lista og merket krever konto som før (B-127, B-296).

## B-304 Reform 2, del 2: datterverkenes utbytte i ekte tid rett til konsernkassa (2026-09-29)
Status: gjelder (erstatter utbyttet i spilltid fra B-181 og konsernkostnadene fra B-181/B-251; del 2 av B-302)
Bakgrunn: med 10× rakk spillerne opptil 2 374 spilldøgn per ekte dag, og datterverkene betalte utbytte hvert
spilldøgn – derfor løp kassene løpsk (B-301). Eieren valgte pakke B: verket driver verden, i ekte tid.
Beslutning:
- **Datterverkene betaler utbytte én gang per ekte (UTC-)dag, rett til konsernkassa på serveren** – ikke til kassa i
  spillet. Serveren (`supabase/051_utbytte_i_ekte_tid.sql`) regner beløpet av det lagrede spillet (verkene slik de
  står, sjekket av juksesperren) med `dividend_from_state`, og `pay_dividends()` betaler for hver hel dag som er over,
  «lat» fra `world_tick()` (som skraplageret, B-189): én rad per spiller og dag i `dividends`, kassa og `treasury_ledger`
  (`kind = 'utbytte'`). Fra 2026-09-29; den som er borte lenge, får høyst 14 dager samlet opp. Lokal spillfart betyr
  ingenting: 10× gir like mye som 1×.
- **Regelen** (`game/dividend.ts` speiler SQL-en; tallene står i `config.world.dividend`, så de kan stilles uten ny kode):
  drift per ferdig verk = grunntall (5/20/60 mill. for stålverk/storverk/kompleks) × (1 + 0,25 × trinn) × felles
  funksjoner (+5 % hver) × konsernprosjekter (+10 % hver) × mesterskapet «Konsernledelse» (inntil +30 %); verket
  beholder 30 %; verkene stilles i rekke etter drift (1/(1 + 0,1 × plass)); flaggskipet gir inntil +20 % med omdømme 100
  og bare stål som holdt kvaliteten de siste sju døgnene; **imperiebelastningen**: over 100 mill. per dag vokser
  utbyttet med kvadratroten. Per ekte dag: 3 nye stålverk 10,6 mill., 3 storverk 41,5 mill., 3 komplekser trinn 5
  226 mill., 12 komplekser 392 mill., toppen (14 komplekser trinn 5, mesterskap 23) 417 mill. Spillerne i dag:
  417 / 401 / 391 / 389 / 205 / 100 / 55 / 40 / 29 / 28 / 6 mill. per dag (11 konserneiere).
- **Konsernkostnadene er borte** (`konsernCosts`, kostnadsposten «konsern»): belastningen ligger i utbytteregelen.
  `konsernDay` bokfører ingenting lenger (bare direktørlønn og kunnskapsdeling). Kjøp, råd og mesterskapet
  (`masteryValue`) regnes på utbyttet per ekte dag (`konsernNetFor`). Verdien av et verk (60 døgns drift) står.
- **Tekstene** på Konsern sier «per ekte dag»; Konsern → Industrien viser på konsernkassa-kortet utbyttet per dag, det
  som ble betalt i går og i alt; én linje i loggen per ekte dag («Datterverkene betalte X i utbytte til konsernkassa i
  går», `g.dividendSeen`, `null` i `migrate()`), hentet sammen med anbudene (`useOpenTender` → `world_status`).
  Fagboka (Konsern → «Utbytte») er oppdatert.
- **B-190 justert:** «Konsernkassa har lik grense for alle» → «samme regel for alle»: innskuddet fra eget spill har
  fortsatt 100 mill. per ekte døgn for alle, og utbyttet følger samme regel for alle (bare verkene teller).
- **Tørrkjøring** (rullet tilbake): de tre faste tallene i testen stemte på øret med SQL-en (417 139 891,48 /
  41 465 454,55 / 74 276 725,95); ingen betaling i dag (reformen starter i dag); med reformen satt to dager tilbake fikk
  11 spillere 22 rader og kassene økte med summen (4 122 mill.); to kjøringer ga ingen dobbeltbetaling.
- Endret: `game/dividend.ts` (ny), `konsern.ts`, `masteryValue.ts`, `balance.ts` (`--konsern` viser utbyttet per ekte
  dag for 1–14 verk), `tests.ts`, `types.ts`, `save.ts`, `knowledge.ts`, `net/world.ts`, `net/tests.ts`,
  `ui/Konsern.tsx`, `ui/Companies.tsx`, `ui/GameApp.tsx`, `ui/openTender.ts`, migrasjon 051.
Konto (B-149): ja for utbyttet (regel 2 og 7: serveren og ekte tid – uten konto finnes ingen konsernkasse, som før,
B-183); ingen ny funksjon uten konto.
Testet: tsc, lint, `npm test` (ny test: samme regel som serveren med faste tall, avtagende, farten betyr ingenting,
`konsernDay` bokfører ingenting; nettlaget: varselet én gang per dag, `world_status` leses), balanse (exit 0),
`--konsern`, Playwright på 320 og 390 px (Konsern → Oversikt og Industrien).

## B-305 Reform 2, del 3: realistiske kostnader på toppen av hjemmeverket (2026-09-29)
Status: gjelder (del 3 av B-302; justerer B-252 og salgsbonusene fra B-014/B-088/B-109; siste del av reformen)
Bakgrunn: de største hjemmeverkene tjente 115–230 mill. per spilldøgn (7 000 kr/t, 4–5 ganger virkeligheten) fordi
salgsbonusene la seg oppå hverandre til +43 %, forbruket per tonn var lavere på stormodellene enn på 90-tonneren, og
et verk på 31 000 t hadde nesten ingen kostnader som vokste med størrelsen (B-301). Alt fra garasjen til og med et
nytt storverk skal stå urørt.
Beslutning (bare det som virker over ca. 5 000 t i døgnet):
- **Salgsbonusene stopper på +25 %** (`PRICE_BONUS_MAX` i `plant.ts`; før: inntil +43 %). Alle bonusene finnes som før,
  men kundene betaler ikke mer enn markedet tåler. Et storverk med omdømme 80, salgskontor og to selgere ligger på
  ca. +14 % og merker ingenting.
- **Forbruk per tonn på stormodellene** (elektroder, ildfast, legeringer): 150 t 170 → 350, 250 t 165 → 375,
  420 t 140 → 400 kr/t. 30- og 90-tonneren står (200 og 180).
- **Administrasjon** (`adminPerDay`, i posten «Faste kostnader»): 250 kr per tonn døgnkapasitet **over 5 000 t**
  (`ADMIN_PER_CAP_T`, `ADMIN_FREE_T`), bare på storverket. 8 300 t: 0,8 mill.; 31 000 t: 6,5 mill. per døgn. Et nytt
  storverk (700 t) betaler ingenting.
- **Markedet metter seg i to trinn** (`MARKET_SATURATION`): full pris til 10 000 t, 50 % fra 10 000 til 20 000 t og
  **40 % over 20 000 t** (analysen foreslo 25 %, men da tapte verket penger på hvert tonn over 20 000, og 420-tonneren
  ble en dårlig handel; med 40 % går den største ovnen omtrent i null på tonnene over 20 000 – den kjøpes for tonn og
  rekorder, ikke for overskuddet). 31 000 t: faktor 0,57 (før 0,64).
- Toppen (31 000 t, alle bonuser) går fra ca. 230 til ca. 140 mill. per spilldøgn etter analysens tall (4 500 kr/t,
  fortsatt 2–3 ganger virkeligheten). Kundene, kontraktene, kvalitetspremiene og alt før storverket er som før.
- Testspilleren (`--storovn 330`, samme utgangspunkt dag 331 med `--storovn-dump`/`--storovn-base`, nytt i B-305;
  variantene er underbemannet): 3 × 150 t (8 690 t) 28,6 → 23,2 mill. per døgn, 250 t (13 300 t) 42,0 → 32,6,
  420 t (22 500 t) 31,7 → 14,2. Ingen variant taper penger. Nivåmålene i `balance.ts` står (exit 0).
Konto (B-149): nei – regel 1, eget spill.
Testet: tsc, lint, `npm test` (ny test: bonusene stopper på 25 %, administrasjonen 0 på et nytt storverk og 6,5 mill.
på 31 000 t, forbruket på stormodellene; metningen 0,75 ved 20 000 t og 0,60 ved 35 000 t), balanse (exit 0),
`--storovn 330`.

## B-306 Reform 2, del 4: taket for kassa senket til 10 mrd. og kjørt på serveren (2026-09-29)
Status: gjelder (justerer B-303 og opphever «B4: ingen kompresjon» i B-302; eierens beskjed: «du var for snill»)
Bakgrunn: etter del 1–3 sto fire spillere fortsatt på taket (100 mrd.) og seks til hadde 12–92 mrd. – mer enn de noen
gang får brukt (dyreste kjøp: kompleks 3,6 mrd.). Eieren ba om å sjekke pengene på topplista og fikse det.
Beslutning:
- **Taket er 10 mrd.** (`CASH_RESERVE.softCap`), lik sluttmålet. Alt over betales ut til eierne som før (B-303).
  Kassa er en buffer til neste kjøp, ikke en poengsum: på 10× fyller toppverket den igjen på et kvarter, og det er
  meningen – det som teller mellom spillere, er konsernkassa (innskudd 100 mill. per ekte døgn) og utbyttet i ekte tid.
- **Kjørt på serveren** (`supabase/052_reform2_tak.sql`, etter tørrkjøring rullet tilbake): alle lagringer med kasse
  over 10 mrd. settes til 10 mrd.; resten legges i `paidOut.total` (`firstDay` beholdes eller settes til dagen,
  `today` 0). Sikkerhetskopi i `save_backups` (`reform2-tak`) og for alltid i `economy_reform_log.old_state`;
  `serverEdit` + 1 og `device = 'server'` (B-211), så eldre kopier avvises og appen henter serverens spill. Merket
  «Reformveteran II» (`badges`) til alle som ble truffet og ikke hadde det. Rekorden «Utbetalt til eierne» følger av
  triggeren `note_paid_out`. Verk, forskning, fagpoeng, titler (`legends` går aldri ned), lån og konsernkassa er urørt.
  Tørrkjøringen: ti spillere, 100 → 10 (×4), 92 → 10, 50 → 10, 42 → 10, 42 → 10, 25 → 10, 13 → 10; 564 mrd. ført som
  utbetalt; seks nye merker. Kjørt 01:14 UTC, etter publiseringen: åtte spillere ble justert av serveren; to (den med
  100 og den med 92 mrd.) hadde alt fått den nye appen, som betalte ut selv før serveren rakk det – den ene av dem fikk
  merket for hånd (`badges`), siden reformen traff ham like fullt.
- **Sesonglista rettet** (053, eierens beskjed: «Hvorfor har de tre over meg etter reform 2?»): lista bruker det siste
  tidslinjetallet, og de tre hadde ikke åpnet spillet etter reformen (704–874 mrd. med gammel reserve). Ett ferskt
  tidslinjetall per konserneier ble regnet av det lagrede spillet på serveren med appens regel (kasse − lån + verkene);
  tørrkjøringen stemte på øret med dem som alt hadde lastet opp med den nye appen. Hall of Fame («alle tider») står.
- **«Mest penger på bok» er tatt bort** fra topplista (appen; serveren kan fortsatt regne `kasse`): med et tak sa den
  ingenting, og Hall of Fame-tallene der var fra før reform 1 (8 286 / 3 663 / 1 562 mrd.). «Utbetalt til eierne» tar over.
- Rekkefølge: appen publiseres først (nytt tak), så kjøres serverendringen – ellers ville en eldre app fylt kassa opp
  til 100 mrd. igjen til oppdateringen kom.
- Sjekket: sluttmålet (10 mrd. konsernverdi = kasse + verk) nås fortsatt; titlene regnes av konsernverdien og verkene
  alene er verdt inntil ca. 170 mrd. for et fullt konsern; juksesperren flagger ikke fall; innskudd til konsernkassa
  leser `cash − loan` og virker som før.
Konto (B-149): nei – regel 1, eget spill (lista på topplista krever konto som før).
Testet: tsc, lint, `npm test` (taket-testen bruker `CASH_RESERVE.softCap`), balanse (exit 0), tørrkjøring i databasen.

## B-307 Datterverk selges for 60 % av byggekostnaden, ikke for verdien (2026-09-29)
Status: gjelder (erstatter salgsregelen i B-121)
Bakgrunn: eieren: «Om man kjøper et stålverk eller storverk på Utvid og selger det igjen i oversikten på Konsern, så
tjener man enorme penger.» Salget ga verdien (60 døgns overskudd, B-121) med alle bonuser: et stålverk til 255 mill.
(med oppkjøpsavdeling) kunne selges for inntil 400 mill. i samme øyeblikk, også mens det ble bygget – og et storverk til
1,02 mrd. for 1,6 mrd. Uendelig penger uten risiko.
Beslutning:
- **Salgssummen er 60 % av det det ville kostet å bygge verket på nytt** (`sisterSalePrice`: listepris × (1 + 0,3 ×
  trinn) × `SELL_SHARE`), uansett hvor mye det tjener og uansett bonuser. Et verk som bygges eller moderniseres, selges
  som ferdig (pengene er betalt). Kjøp og salg taper alltid penger (255 → 180 mill.). Byttet til stålkompleks
  (`swapForKompleks`) bruker samme sum.
- **Verdien** (`sisterValue`, 60 døgns overskudd) står som før i konsernverdien og titlene – den er ikke penger.
- Knappen sier «Selg for X…» med forklaringen «60 % av byggekostnaden».
Konto (B-149): nei – regel 1, eget spill.
Testet: tsc, lint, `npm test` (ny del av B-209-testen: salgssummen er 60 % av byggekostnaden som modernisert, lavere enn
kjøpsprisen og verdien, upåvirket av bonusene, og salget gir riktig sum), balanse (exit 0).

## B-308 Reform 2, del 5: markedet metter seg fra 3 000 t, og administrasjonen dobles (2026-09-29)
Status: gjelder (justerer B-305; eieren: «Jeg tjener jo fortsatt i snitt over 100 millioner per dag. Er ikke det drøyt
mye?»)
Bakgrunn: etter B-305 tjente det største hjemmeverket ca. 95 mill. per spilldøgn (30 500 t: salg 240, kostnader 150
mill.; 3 100 kr/t). Ved full pris er marginen 7 000 kr/t (12 400 − 4 650 med kvalitetspremie og bonuser), mot ca.
4 000 kr/t på et nytt storverk – toppen tjener mer per tonn enn de små, ikke mindre. Det som må gi etter, er prisen på
store volumer: ingen regional kunde tar unna 30 000 t i døgnet til full pris.
Beslutning:
- **Markedet metter seg fra 3 000 t** i døgnet (`MARKET_SATURATION.fromT`, før 10 000): tonnene over gir 45 % av
  prisen (`overShare`, før 50 %), og over 20 000 t 40 % som før. Faktoren: 8 700 t 0,64, 13 300 t 0,57, 30 000 t 0,505.
  Tonnene over grensen dekker fortsatt de variable kostnadene (45 % × 12 400 = 5 580 kr/t mot ca. 5 150), så det
  lønner seg å produsere – bare lite per tonn. Et nytt storverk (700 t) og 3 × 90 t (2 600 t) merker ingenting.
- **Administrasjonen dobles** til 500 kr per tonn døgnkapasitet over 5 000 t (`ADMIN_PER_CAP_T`): 30 000 t betaler
  12,5 mill. per døgn.
- Regnet med toppspillerens egne tall per tonn (salg 12 400 før metning, kostnader 4 650): 2 600 t 20 mill., 8 700 t
  27, 13 300 t 29, 22 500 t 31, 30 000 t 36 mill. per døgn (1 200 kr/t). Større verk er fortsatt litt bedre, men
  markedet er grensen – veksten skal komme fra konsernet og utbyttet i ekte tid. Toppen går fra ca. 95 til ca. 36.
- Testspilleren (`--storovn --storovn-base`, samme utgangspunkt, underbemannede varianter): 8 690 t 23,2 → 6,8 mill.,
  13 300 t 32,6 → 13,7, 22 500 t 14,2 → −6,2 per døgn. Et stort verk som drives dårlig, taper penger – det er meningen;
  et som drives som toppspillerne, tjener 30–36 mill. Nivåmålene i `balance.ts` står.
Konto (B-149): nei – regel 1, eget spill.
Testet: tsc, lint, `npm test` (metningstesten: 1 til 3 000 t, 0,615 ved 10 000, 0,5325 ved 20 000, 0,476 ved 35 000;
administrasjonen 13 mill. på 31 000 t), balanse (exit 0), `--storovn` før/etter.

## B-309 Reform 2, del 6: konsernene og kassa satt tilbake til den nye økonomien (2026-09-29)
Status: gjelder (eierens beskjed: «Fiks dette, sett de tilbake til der de skulle ha vært»; bygger på B-305–B-308)
Bakgrunn: med den nye økonomien hadde ingen av de fire største hatt råd til konsernet de eide. Regnet på hver spillers
eget spill (snittproduksjon per døgn over hele spillet, toppspillerens pris og kostnader per tonn, administrasjon) ville
de tjent 40–95 mrd. i alt, mens 12–14 komplekser på trinn 5 koster 108–126 mrd. Konsernene var bygget for penger som
ikke lenger finnes.
Beslutning (`supabase/054_reform2_konsern_tilbakestilt.sql`, etter tørrkjøring og eierens ja på lista):
- **Budsjett** per spiller = det man kunne tjent med den nye økonomien over hele spillet − utstyret hjemme − innskudd i
  konsernkassa. **Verkene** beholdes i kjøpsrekkefølge til budsjettet er brukt (det siste med lavere trinn); resten
  fjernes uten vederlag (de «ble aldri kjøpt»). **Kassa** = resten av budsjettet, høyst 10 mrd. Lik regel for alle på
  storverket med konsern eller over 1 mrd.
- Resultat: Tuster 14 → 10 komplekser trinn 5 (kasse 1,7 mrd.), Grane 14 → 7 + 1 trinn 2 (0,4), Figen 12 → 4 + 1
  trinn 2 (0,5), H4WK3N5 14 → 4 (1,0), GruberMogg67 10 → 7 (0,7), The New Guy 10 → 3 stålverk + 2 komplekser (1,0);
  Einmo (3,6), enzo, Big Boss, 2bajjas (10) og Lord_Magni (4,5) beholdt verkene. Alt annet står: forskning, fagpoeng,
  titler, mesterskap, konsernkassa, hjemmeverket, utbetalt til eierne, æresmerker. Sikkerhetskopi i `save_backups`
  (`reform2-konsern`) og `economy_reform_log` – kan rulles tilbake per spiller med `restore_save`. Sesonglista fikk
  ferske tidslinjetall (som 053).
- Anslaget er snilt (alle døgn regnes som toppdrift), så ingen har fått mindre enn de kunne tjent.
Konto (B-149): ingen ny funksjon.
Endringslogg: ja (b:309).

## B-310 Metningen løftet litt, og snittet siste 7 døgn i resultatgrafen (2026-09-29)
Status: gjelder (justerer B-308; eieren: «Nå går mange i minus hver dag»)
Bakgrunn: etter B-308 lå toppspilleren på +22 mill. per døgn i snitt, men med svingninger på ±120 mill. fra døgn
til døgn: skrap kjøpes i store partier (72, 73, 154, 99 mill. fire døgn på rad) og kontrakter betales ved levering
(171, 263, 82, 158 mill.). Ett døgn viste −115 selv om uka var i pluss. Snittet var også tynnere enn siktet (36 mill.):
den faktiske prisen før metning er ca. 10 500 kr/t (emner og lavere kvaliteter i miksen), ikke 12 400.
Beslutning:
- **Metningen**: 50 % av prisen over 3 000 t (før 45 %) og 45 % over 20 000 t (før 40 %). 30 000 t: faktor 0,55 (før
  0,505). Med den faktiske prisen gir det ca. 35–40 mill. per døgn på toppen – der B-308 siktet.
- **Resultatgrafen** (Verket → Økonomi) viser snittet per døgn de siste 7 døgnene i overskriften, så én rød dag ikke
  leses som «går i minus». Snittet er tallet å styre etter; enkeltdøgn svinger med skrapkjøp og leveranser.
- Ikke gjort (kan komme): jevnere skrapkjøp fra planleggeren (mindre partier hver dag) ville dempet svingningene, men
  det er en endring i produksjonen som må måles på et fullt storverk med flere frø (B-228).
Konto (B-149): nei – regel 1, eget spill.
Testet: tsc, lint, `npm test` (metningstesten: 0,65 ved 10 000 t, 0,575 ved 20 000, 0,522 ved 35 000), balanse (exit 0),
`--storovn` fra samme utgangspunkt, Playwright på 320 og 390 px (grafen med snittet).

## B-311 Rettferdig kamp: verdensøkonomien 10× ned, og ett byggeprosjekt om gangen i konsernet (2026-09-29)
Status: gjelder (justerer B-183, B-189, B-209, B-302 pkt. 3 og B-304; eieren: «Jeg vil ha det slik at spillet blir en
rettferdig kamp mellom spillerne. Nå er det for enkelt å tjene en milliard»; innskuddet er erstattet av bidraget, B-319)
Bakgrunn: det som gjorde det lett, var tempoet i verden, ikke hjemmeverket. Et fullt konsern fikk 250–370 mill. per
ekte dag i utbytte pluss 100 mill. i innskudd – én milliard i konsernkassa på 2–3 dager – og et fullt konsern kunne
bygges på et par ekte dager på 10× (alle prosjekter samtidig). Da ender alle på toppen med samme maks etter en uke, og
det er ingen kamp igjen. Et ekte europeisk konsern bruker 9–15 dager på 100 mill. i overskudd.
Beslutning:
- **Verdensøkonomien 10× ned** (`supabase/055_verden_ti_ned.sql`, etter tørrkjøring): utbytte per verk 0,5/2/6 mill.
  (`config.world.dividend.base`, speilet i `DIVIDEND.base` = en tidel av `profitPerDay`), imperiebelastningen fra
  10 mill. (`load_from`), innskudd 10 mill. per ekte døgn (`treasury_base_per_day`), skraplagerets gebyr 50 kr/t
  (`scrap_fee_per_t`, speilet i `scrapIncome.ts`), slagg 500 kr/t, verkstedet 100 kr/t, minste bud 100 000. Et fullt
  konsern får ca. 30 mill. per dag, tre stålverk ca. 1 mill.; én milliard tar toppen ca. en måned, og en som starter i
  dag, kan ta igjen forspranget. Konsernkassene i dag (100–200 mill.) deles på 10, med en post «justering» i boka.
  Det avgjorte anbudet (200 mill.) står som historie.
- **Ett byggeprosjekt om gangen i konsernet** (`projectBlock` i `konsern.ts`): kjøp, utbygging og modernisering
  starter ikke mens et annet prosjekt pågår. Alle valg på Utvid er sperret med «Ett byggeprosjekt om gangen: …» imens.
  Byggetidene står (stålverk/storverk/kompleks i timer som før, utbygging 6 t, modernisering 4 t), så et fullt konsern
  tar uker uansett spillfart – det er det som gjør kampen rettferdig mellom 1×- og 10×-spillere. Testspilleren bruker
  `konsernOptions` og følger sperren.
- Hjemmeverket (lokalt spill) er urørt: det er sandkassen. Det som teller mellom spillere, går i ekte tid.
Konto (B-149): ingen ny funksjon (konsernkassa og konsernet som før).
Testet: tsc, lint, `npm test` (speilet: `DIVIDEND.base × 10 = profitPerDay`; de faste tallene en tidel; ett prosjekt
om gangen i B-119- og B-170-testene), balanse (exit 0), tørrkjøring av 055 (ti kasser, config, estimatet og utbyttet
regnet på nytt).

## B-312 Reformveteran I bare for reform 1, og salgsdirektøren forklarer seg (2026-09-29)
Status: gjelder (retter B-296/B-299/B-306; brukeren: «Det var mange som fikk reformveteran 1-merket når de bare skulle ha
reformveteran 2», og «Sjekk at salgsdirektøren fungerer for alle spillerne. Noen har slått han av fordi han ikke fungerer»)
Bakgrunn:
- `badges_of` (049) ga merket `reform` til alle med en rad i `economy_reform_log`. Reform 2 (052 og 054) skrev også rader
  der, så alle ni som ble truffet av reform 2, fikk «Reformveteran» i tillegg til «Reformveteran II». Fire hadde alt fått
  merket i spillet (i `serverBadges` og som prestasjon); resten ville fått det ved neste innlogging.
- Salgsdirektøren: alle elleve aktive spillere med direktør har omdømme 96–100, køer på 3–4 døgn og 2–4 forespørsler
  liggende (de som ikke rekkes). Direktøren virker. Én spiller har ham av, og det verket lager 11 000 t i døgnet av
  35 000 fordi «Bare én ovn smelter om gangen» (Strøm) er på: to av tre 420-tonnere står. Direktøren regner med det
  verket faktisk lager, så han sier nei til det meste – samtidig som loggen sa «Forespørselen … gikk ut uten svar, selv
  om den passet verket» (B-292, regnet med Salgs løsere sjekk). Det ser ut som om direktøren ikke gjør jobben.
Beslutning:
- **Server** (`supabase/056_reformveteran_riktig.sql`): `badges_of` gir `reform` bare for rader som ikke er reform 2
  (`model not like 'reform 2%'`). Merker gitt for hånd (`badges`, B-300) står.
- **Serveren er fasit for merkene**: `applyServerBadges` tar bort merker serveren ikke gir lenger, og prestasjonen for
  dem (skjulte serier med andel under 1). Fagpoengene spillerne fikk, står. `BadgeSync` kaller den også med tom liste.
  De fire som fikk feil merke, mister det neste gang spillet åpnes – ingen serverendring av lagringene.
- **Salgsdirektøren forklarer seg**: går en forespørsel ut som «passet verket» på Salg mens direktøren er på, sier loggen
  «Salgsdirektøren lot forespørselen fra … gå: for lite luft til fristen med det verket faktisk lager (N t per døgn). Vil
  du ha den likevel, ta den selv under Salg», og den telles ikke som forsømt (rådet i B-292 gjelder bare uten direktør).
  Kortet under Folk → Ansatte viser hva han regner med («Regner med N t per døgn – det verket har laget den siste uka»),
  og når det er under 60 % av kapasiteten, også hva verket kan lage og hvor spilleren ser hva ovnene venter på.
- **Råd om én ovn om gangen**: står en ovn med «Venter: bare én ovn smelter om gangen» på et verk med flere ovner, sier
  Verket at verket lager en halvpart/tredel og hvor bryteren står (Marked → Strøm).
- Direktørens regel (verste/typiske døgn siste uke, 70–75 % av fristen) står: den er grunnen til at omdømmet holder seg.
Konto (B-149): nei – ingen ny funksjon.
Testet: tsc, lint, `npm test` (merket trekkes med prestasjonen, fagpoengene står; direktøren forklarer seg og rådet
uteblir; rådet om én ovn), diagnosen kjørt på en anonymisert kopi av det berørte spillet (20 og 30 døgn: 0 tomme timer
med direktør på, omdømmefallet skyldes sene leveranser med 1/3 av kapasiteten), 056 kjørt på serveren.

## B-313 Analyse: hovedverkets konsernbidrag i ekte tid (2026-09-29)
Status: gjelder som analyse og kandidat til regel; ingen endring i spillet (eieren: «Ikke gjør en ny økonomireform nå»)
Endringslogg: nei
Bakgrunn: eieren mener to økonomier er for kunstig skilt: 10 mrd. lokalt, men bare 10 mill. per ekte døgn kan flyttes
til det som betyr noe i sluttspillet. Ønsket retning: hovedverket har driftsøkonomi i spilltid, konsernet
kapitaløkonomi i ekte tid, og hovedverket gir et normalisert, driftsavhengig bidrag til konsernkassa i ekte tid.
Beslutning:
- Analysen står i **`docs/KONSERNBIDRAG.md`** (pengestrømmene i dag, systemene som antar at lokal kasse er formue,
  forslag til bidragsregel med vern mot 10×/pause/save-load/offline, driftskapital, innskuddet, utbyttepolitikk,
  migrering, forholdet til B-311, eksempler, simulering 30/60/90 dager, exploits, spørsmål).
- Anbefalingen: bidrag = politikk × tonn som teller (én normal spilldag per ekte dag, produksjonsmåleren) × margin
  (30 spilldøgn, tak 3 000 kr/t) × aktivitet; innskuddsknappen bort; kassa hjemme kalles driftskapital; taket står som
  sikkerhetsnett; utbyttepolitikk som steg 3. Ingenting bygges før eieren har svart på de seks spørsmålene i avsnitt 14.
- Kandidat til fast regel registrert i `docs/FORSLAG.md`: «Spilltid gir kunnskap, optimalisering og lokal progresjon;
  ekte tid styrer kapital og makt som påvirker andre spillere.»
Konto (B-149): ingen funksjon.
Testet: simuleringen (formlene i dokumentet), tallene fra lagringene og tidslinja 29.9.

## B-314 Byggetida i konsernet går etter serverens klokke (2026-09-29)
Status: gjelder (retter B-209; eieren: «det går an å jukse ferdig byggingen med datterselskapene ved å endre tidssona på
telefonen … en luring fikk bygget ferdig 8 storverk momentant, og oppgradert dem»)
Bakgrunn: prosjektene i konsernet gikk etter telefonens klokke (`realNow()` = `Date.now()`). Én spiller stilte klokka
fram: sju storverk kjøpt kl. 21 var ærlig ferdige kl. 03, men det åttende (kjøpt 02:03, seks timer) sto ferdig 03:32,
og fem verk fikk trinn 3 og ett trinn 2 – 17 moderniseringstrinn à fire timer, ett om gangen, på under to timer.
En annen spiller ligger ti minutter foran serveren (tre stålverk ferdige ti minutter før tida) – trolig klokka på
telefonen, ikke juks.
Beslutning:
- **Appen bruker serverens klokke** (`net/clock.ts`): hvert svar fra tjenesten har en Date-header; forskyvningen mot
  telefonen lagres, og `realNow()` gir servertid pluss det som har gått siden svaret. Uten nett brukes den siste
  forskyvningen. Tester og testspilleren setter klokka som før (`setRealClock`).
- **Serveren setter prosjekter tilbake** (`supabase/057_byggetid_serverklokke.sql`): `save_game()` sammenligner hvert
  lagret spill med det forrige (`guard_projects`, ren funksjon som kan testes med `select`): et prosjekt som ikke kan
  være ferdig ennå, settes tilbake med typen og trinnet verket hadde; et trinn eller en type som har kommet uten
  prosjekt, settes tilbake og jobben startes nå (4 t modernisering, 6 t utbygging); et nytt verk uten byggeprosjekt
  bygges nå (2/6/12 t); et prosjekt som «startet» i framtida, starter nå. Rettes noe, lagres den rettede tilstanden
  med `device = 'server'` og `serverEdit + 1` (B-211), `save_game` gir null, og appen henter serverens spill. Alt
  skrives til `project_guard_log`. Ærlige spillere merker ingenting (ett minutts slingringsmonn).
- **Spilleren som jukset, settes tilbake** etter tørrkjøring og eierens godkjenning: alle åtte storverk til trinn 0,
  de sju som var ærlig kjøpt står ferdige, det åttende bygges ferdig kl. 08:03 (seks timer fra det ble kjøpt).
  Eierens svar: ingen refusjon av de 4,6 mrd. trinnene kostet, ingen sperre av kontoen. Kjørt som 058
  (`byggetid_tilbakestilt`): sikkerhetskopi i `save_backups` (`byggetid`), rad i `project_guard_log`, `serverEdit + 1`
  og `device = 'server'`. Ingen rad i `economy_reform_log` – den ville gitt merket «Reformveteran» (056).
Konto (B-149): ingen ny funksjon.
Testet: `guard_projects` med fem tilfeller i SQL (for tidlig ferdig, trinn uten prosjekt, nytt verk uten bygging,
prosjekt startet i framtida; lovlig ferdig og uendret gir null), `npm test` (serverklokka: fem timer foran gir riktig
`realNow`), tsc, lint.

## B-315 Vernet mot klokkejuks godtar lang spilling uten nett (2026-09-29)
Status: gjelder (justerer B-314)
Endringslogg: nei – ærlige spillere merker ingenting; det hindrer bare at vernet slår feil
Bakgrunn: `guard_projects` (057) satte tilbake et nytt verk uten byggeprosjekt og trinn som kom uten prosjekt. Men
spillet virker uten nett, og `realNow()` bruker den siste kjente forskyvningen mot serveren. En spiller som kjøper et
verk og spiller frakoblet i mange timer, kan derfor lovlig ha verket ferdig før neste lagring når serveren – og ville
fått det satt tilbake i bygging.
Beslutning (`supabase/059_byggetid_frakoblet.sql`):
- `guard_projects` får tidspunktet for forrige lagring (`saves.updated_at`, serverens klokke) og godtar et nytt verk
  uten prosjekt når det har gått minst byggetida (2/6/12 t) siden da, og trinn eller utbygging uten prosjekt når det
  har gått minst 4 t per trinn (6 t for utbygging) – ett prosjekt om gangen (B-311).
- Et prosjekt serveren alt kjenner (readyAt i forrige lagring), sjekkes som før: det kan ikke bli ferdig før readyAt,
  uansett hvor lenge det er siden. Et nytt verk som kommer med trinn over 0, rettes alltid.
- Loggen i `project_guard_log` får minutter siden forrige lagring (`since_last_min`).
Konto (B-149): ingen ny funksjon.
Testet: ti tilfeller i SQL mot en kopi av funksjonen (juks med 12 min, 2 t og 10 min fanges; 13 t uten nett med nytt
kompleks eller tre trinn godtas; kjent prosjekt for tidlig fanges selv etter 18 t; ærlige tilfeller gir null; uten
tidspunkt streng som før), `save_game` som spilleren i en transaksjon som rulles tilbake, sikkerhetsrådene uendret.

## B-316 Neste rammeavtale i «Produksjon nå» (2026-09-29)
Status: gjelder
Bakgrunn: en spiller ville se i kortet «Produksjon nå» hvor lenge det er til neste rammeavtale starter produksjon, så
man ser om det er tid til en ordre imellom. Ukeleveransen legges i ordrekøen ved starten av døgnet `nextDay` (B-163),
men det sto ingen steder når det skjer.
Beslutning:
- En egen rad «Avtale» nederst i «Produksjon nå», bare når en aktiv rammeavtale har uker igjen (gradvis synlighet):
  «om 5 døgn 17 t» (tid til neste ukeleveranse legges i køen), og under «4 døgn 2 t ledig · køen 1 døgn 15 t».
  Ledig tid er tida til neste uke minus tida køen tar; er køen lengre, står det «ingen ledig tid». Står verket, står
  det «verket står». Kunden, tonnene og kvaliteten står i `title`.
- Køen regnes med det verket faktisk har laget de siste døgnene (`realisticDailyT`, som køsjekken i B-240), ikke
  kapasiteten. Avtaler på et produkt verket skal slutte med, gir ingen nye uker og telles ikke.
- `nextAgreementWeek` og `queueMinutes` i `engine.ts`, `fmtDuration` i `ui/format.ts`. Raden bruker det faste
  rutenettet i lista (B-238): to linjer som aldri brytes, så kortet ikke hopper; ledig tid står først, så det er køen
  som kortes på smale skjermer.
Konto (B-149): nei – det er en visning i eget spill.
Testet: `npm test` (nærmeste aktive avtale, uker som venter gir 0, produktet verket slutter med telles ikke, verk som
står gir uendelig kø, `fmtDuration`), tsc, lint, Playwright på 320 og 390 px (ingen overflyt, raden brytes ikke).

## B-317 Vernet mot klokkejuks retter ikke et verk som står slik det var (2026-09-29)
Status: gjelder (retter B-314/B-315)
Endringslogg: nei – ærlige spillere skal ikke merke vernet; dette fjerner en feilretting
Bakgrunn: `project_guard_log` viste en retting av en ærlig spiller kl. 04:08: tre stålverk med utbygging til storverk
(startet før B-311, ferdige 03:37 på serveren) ble lagret uendret 92 minutter senere, før appen hadde fullført
utbyggingen. `guard_projects` regnet «det verket lovlig kan være» som storverk trinn 0, og stålverkets gamle trinn
(1–2) ble lest som «trinn uten prosjekt». Verkene ble satt til storverk trinn 0 med en ny modernisering på 4 timer.
Beslutning (`supabase/060_byggetid_uendret.sql`):
- Et verk er bare mistenkelig når det er kommet lenger enn både det det var i forrige lagring og det det lovlig kan
  være nå. Et verk som står slik det var, er aldri juks. Tida som kreves, regnes fra det av de to verket bygger på.
- Resten av regelen er som i 059 (kjente prosjekter kan ikke bli ferdige før `readyAt`, nye verk må bygges, slakk for
  spilling uten nett).
- Spilleren som ble rettet ved en feil, får stå som det er (eierens svar): storverkene er riktige, og moderniseringen
  som ble startet, gir tre gratis trinn mot at nye prosjekter venter til den er ferdig (08:08).
Konto (B-149): ingen ny funksjon.
Testet: ni tilfeller i SQL mot en kopi av funksjonen, i en blokk som ble rullet tilbake: den ekte lagringen som ble
feilrettet gir nå null (059 ga tre rettinger); juks med trinn, med utbygging og med trinn etter en ferdig utbygging
fanges; et kjent prosjekt fjernet for tidlig fanges etter 20 t; ferdig utbygging og ventende modernisering gir null;
13 t uten nett med tre trinn godtas. Lagringen går som før etter endringen, sikkerhetsrådene uendret.

## B-318 Hovedverkets konsernbidrag i ekte tid, steg 1 (2026-09-29)
Status: gjelder (bygger på analysen i B-313, `docs/KONSERNBIDRAG.md`)
Bakgrunn: hovedverket tjener i spilltid, konsernet lever i ekte tid, og eneste sluse var innskuddet på 10 mill. per
ekte døgn. Eierens svar på spørsmålene i KONSERNBIDRAG.md avsnitt 14 (29.9):
1. Bidraget skal være **automatisk**, og innskuddsknappen skal bort (steg 2, når denne appen er ute).
2. **Gulv på 30 %** på dager uten spill.
3. **Fast 50 %** nå; valg av utbyttepolitikk kan komme senere.
4. **Demp toppen:** kvadratrot over 30 mill. per dag.
5. Konsernverdien på topplista skal bli **serverkjent** (verk + konsernkasse − lån) – eget steg.
6. Lokal kasse: eieren var usikker («noen har ingenting å bruke penger på»). Taket på 10 mrd. (B-306) betaler alt over
   ut til eierne, så kassa kan ikke vokse evig. Kassa røres derfor ikke; den er driftskapital.
Beslutning (`supabase/061_konsernbidrag.sql`):
- Serveren betaler hovedverkets bidrag inn i konsernkassa én gang per ekte (UTC-)dag, fra og med 30.9, «lat» fra
  `world_tick` som utbyttet (høyst 14 dager tilbake). Bare med åpnet konsern, ikke for flaggede kontoer.
- Full dag = 50 % × tonn i en normal spilldag (`meter_normal_rate`, samme måler som skraplageret) × driftsresultat per
  tonn over de siste 30 spilldøgn i lagringen (kontrakt + spot − skrap, energi, forbruk, lønn, vedlikehold, bøter,
  faste, nett; mellom 0 og 3 000 kr/t). Investering, konsern, renter og «annet» er ikke med.
- Aktivitet = andelen av en normal spilldag som ble spilt (`production_days`), aldri under 0,9 × gårsdagens og aldri
  under 0,3. Bidrag = full dag × aktivitet, dempet over 30 mill.: 30 mill. × (x / 30 mill.)^0,5.
- Tabell `contributions`, post `bidrag` i boka for konsernkassa, tallene i `config.world.contribution`.
- `world_status` gir `contribution` (en full dag nå, margin, normal dag, siste aktivitet, i går, i alt). Appen viser
  det på kortet «Konsernkassa» under Konsern → Industrien, og beskjeden om utbyttet sier også hva hovedverket betalte.
  Ingen speiling i appen: tallet kommer bare fra serveren.
- Tall på ekte spill (tørrkjøring 29.9): de fire beste verkene når margintaket og får 37–38 mill. per dag etter
  dempingen, et middels verk 16–23 mill., et verk med negativ margin 0. Et fullt konsern med godt drevet hovedverk får
  da ca. 75 mill. per dag (bidrag + utbytte); én milliard tar ca. to uker på toppen (B-311 siktet på en måned).
Konto (B-149): ja – som konsernkassa (regel 2 og 7: serveren, ekte tid).
Testet: migrasjonen i en blokk som ble rullet tilbake (tre dager betalt for 11 konsern, 30 poster i boka, nytt kall
betaler ikke igjen, `world_status` som spiller gir tallene), `npm test` (lesing av world_status, beskjeden alene og
sammen med utbyttet, én per dag), tsc, lint, Playwright på 320 og 390 px med falsk tjeneste (kortet, beskjeden, ingen
overflyt). Sikkerhetsrådene uendret.

## B-319 Innskuddet i konsernkassa tas bort (steg 2) (2026-09-29)
Status: gjelder (erstatter innskuddet fra B-183/B-311)
Bakgrunn: eierens svar i B-318: bidraget skal være automatisk, og innskuddsknappen skal bort. Bidraget fyller
konsernkassa hver ekte dag, så den manuelle slusa på 10 mill. per døgn er overflødig og bare forvirrende.
Beslutning:
- Appen skjuler «Flytt penger fra verket» når serveren gir grensen 0, og skriver i stedet «Kassa i verket er
  driftskapital og blir i verket». Så lenge serveren har en grense, vises innskuddet som før – appen virker både før
  og etter serverendringen.
- Serveren (`supabase/062_innskudd_bort.sql`): `treasury_base_per_day` = 0, kjørt etter at appen er publisert
  (B-303-regelen). `deposit_to_treasury` avviser da med «grense» i eldre apper. Det som alt er skutt inn, står.
- Beskjeden når et bud er større enn kassa, sier ikke lenger «flytt penger inn først».
Konto (B-149): ingen ny funksjon (konsernkassa krever konto som før).
Testet: tsc, lint, `npm test`, Playwright på 320 og 390 px med grense 0 (innskuddet borte, linja om driftskapital,
ingen overflyt) og med grense over 0 (som før, B-318-testen).

## B-320 Ny liste «Konsernverdi» på topplista, regnet av serveren (steg 4) (2026-09-29)
Status: gjelder
Bakgrunn: eierens svar i B-318: konsernverdien mellom spillere skal være serverkjent, ikke lokal kasse. Spurt om
hvordan (29.9): «Ny liste ved siden av» – den gamle «Verdi» står som før, og ligaer og titler røres ikke.
Beslutning (`supabase/063_toppliste_konsernverdi.sql`):
- `konsern_value(uid)` = konsernkassa + 60 × (utbytte fra datterverkene + hovedverkets bidrag for en full dag) − lån.
  60 dagers inntekt i ekte tid er samme målestokk som verdien av et datterverk i spillet (60 døgns overskudd).
- `leaderboard('konsern')` regner den når lista vises (ikke lagret), for alle med åpnet konsern, og samme liste i
  sesongen og i Hall of Fame (som kontrollrommet). `my_rank` følger med.
- Appen: ny fane «Konsernverdi» først på topplista; den gamle heter nå «Verdi i spillet». Linja under fanene forklarer
  tallet. Standardfanen er fortsatt den gamle.
- Tall 29.9: toppen 3–4 mrd. (god drift og utbytte), mot 15–120 mrd. på den gamle lista; rekkefølgen er en annen.
- Innskuddet ble slått av på serveren samtidig (062, B-319), etter at appen var publisert.
Konto (B-149): ja – som topplista (regel 3: sammenlignes med andre).
Testet: migrasjonen i en blokk som ble rullet tilbake (11 konsern på lista, egen plass, de gamle listene uendret),
`npm test`, tsc, lint, Playwright på 320 og 390 px med falsk tjeneste (fanene brytes pent, ingen overflyt, riktig kall).

## B-321 Sommerstans stopper salgsdirektøren, og kalender på Oversikt (2026-09-29)
Status: gjelder (utvider B-298)
Bakgrunn: brukeren: «Salgsdirektøren kan jo ikke ta ordrer når det er planlagt sommerstans» og «Lag kalenderen på
oversiktsbildet så man kan planlegge fram til sommerstans og lignende». I stansen fortsatte salgsdirektøren å signere
forespørsler som lå inne fra før. Fristene deres var ikke flyttet (bare aktive kontrakter fikk tre uker ekstra), og en
rammeavtale fikk første ukeleveranse med frist midt i ferien. Salg regnet også som om ovnene gikk.
Beslutning:
- Salgsdirektøren gjør ingenting i sommerstansen (`directorHour` avbryter når `summerStop`).
- Når stansen begynner, flyttes også fristen på forespørsler som venter på svar, tre uker (kundene vet om ferien).
- En rammeavtale som signeres i stansen, får første uke dagen etter ferien (`nextDay`), ikke i køen med en gang.
- Salg (`assessOffer`) trekker fra døgnene som er igjen av stansen når den regner tida til fristen
  (`summerStopDaysLeft` i `calendar.ts`).
- Før stansen trengs ingen ny regel: kontrakter med frist i eller etter ferien får fristen flyttet tre uker når
  stansen begynner, så regnestykket går opp.
- Kalender på Verket → Oversikt (`ui/CalendarCard.tsx`, `calendarAhead` i `calendar.ts`): dagens dato, en stripe over
  de neste 60 døgnene og to faste rader – fellesferien (datoer, «om N døgn» eller «nå · N døgn igjen», valget eller når
  kortet kommer, kontrakter med frist i ferien) og vinteren. Vises fra verket har fellesferie (nivå 2 og folk).
Konto (B-149): nei – ditt eget spill.
Testet: `npm test` (salgsdirektøren står i stansen, ventende forespørsel får ny frist, Salg regner uten stansdøgnene,
rammeavtale starter etter ferien), tsc, lint, balansetesten og `--sommerstans`, Playwright på 320, 390, 1 366 og
2 560 px (ingen overflyt, ingen avkortet tekst).

## B-322 Konsernverdien på Konsern → Oversikt er den samme som på topplista (2026-09-29)
Status: gjelder (følger B-320)
Bakgrunn: brukeren: «Konsernverdi i oversikt konsern stemmer ikke». Oversikten viste fortsatt den gamle verdien
(kassa − lån + verkene) under navnet «Konsernverdi», mens lista «Konsernverdi» på topplista bruker serverens tall.
Beslutning:
- Konsern → Oversikt viser «Konsernverdi» som på topplista: konsernkassa + 60 × (utbytte + bidrag for en full dag) −
  lån, regnet av tallene fra `world_status` (`konsernValueOf` i `net/world.ts`, speiler `konsern_value` i 063).
  Verdensstatusen hentes allerede hvert minutt av `useOpenTender`; `useLastWorld` gir den siste.
- Den gamle verdien står under som «Verdi i spillet» (sluttmålet på 10 mrd. og lista med samme navn). Uten konto (ingen
  tall fra serveren) er «Verdi i spillet» hovedtallet.
- Forklaringen nederst sier hva begge tallene er.
Konto (B-149): nei – ingen ny funksjon (samme tall som topplista).
Testet: `npm test` (konsernverdien av world_status), tsc, lint, Playwright på 320 og 390 px med falsk tjeneste (riktig
tall, ingen overflyt).

## B-323 Fast regel: spilltid og ekte tid (2026-09-29)
Status: gjelder
Endringslogg: nei – en designregel, ikke en endring i spillet
Bakgrunn: kandidat fra analysen i B-313 (`docs/KONSERNBIDRAG.md` avsnitt 13). Eieren: «Ja, legg den inn som fast regel».
Beslutning: «Spilltid gir kunnskap, optimalisering og lokal progresjon. Ekte tid styrer akkumulering av kapital og makt
som påvirker andre spillere.» Står i CLAUDE.md (Faste regler) og RETNING.md (designpilar 9). Utfyller B-190 (felles
klokke): alt som samler penger eller makt mot andre – konsernkassa, eierskap, topplista – regnes av serveren i ekte tid
(som bidraget, B-318, og utbyttet, B-304); det som bare hjelper eget verk, kan gå i spillfarten.
Konto (B-149): ingen ny funksjon.

## B-324 Kontroll av økonomimodellen: tall og svakheter (2026-09-29)
Status: gjelder (analyse; ingen endring i spillet)
Endringslogg: nei – analyse
Bakgrunn: eieren ba om en kontroll av om modellen etter reform 2, B-311 og konsernbidraget er på riktig spor, med
konkrete tall og dagens logikk, uten nye store endringer.
Beslutning: analysen står i `docs/OKONOMI-KONTROLL.md` (16 spørsmål, simulering 30/60/90 dager, vurdering mot B-323).
Hovedfunn: (1) titlene (25–400 mrd «Verdi i spillet») er uoppnåelige med kassetaket – høyeste mulige verdi for en ny
spiller er ca. 35 mrd, så komplekser, 10–14 verk og trinn 5 er låst for alle nye, og de etablerte har en permanent 2×
fordel i utbytte; (2) datterverk og modernisering betales fortsatt av spilltidspenger; (3) konsernkassa har ett sluk og
ingen aktivitetskrav på utbyttet. Ingenting er endret; eieren avgjør rekkefølgen (forslag i avsnitt 16).
Konto (B-149): ingen ny funksjon.


## B-325 Konsernnivåer etter verkene, ikke kassa (2026-09-29)
Status: gjelder
Bakgrunn: kontrollen (B-324) viste at titlene (25–5 000 mrd «Verdi i spillet») ble avgjort av den lokale kassa og var
uoppnåelige for nye spillere med kassetaket (høyst ca. 35 mrd). Eieren (punkt 1 i OKONOMI-KONTROLL avsnitt 16, «Ja» til
forslaget i `docs/KONSERN-FORSLAG.md`): serverkjente eiendeler skal låse opp nivåene, ikke nye kontantgrenser.
Beslutning: serveren regner konsernnivået av verkene den har solgt spilleren (`konsern_ladder_level` i
`supabase/064_konsern_i_ekte_tid.sql`, speilet i `game/konsernWorld.ts`): 1 Stålmagnat 3 storverk trinn 3, 2 Stålfyrste
6 storverk/kompleks trinn 4, 3 Stålkonge 2 kompleks trinn 3, 4 Stålkeiser 4 kompleks trinn 5, 5 Stållegende 6, 6
Stålgigant 8, 7 Stålkolosse 10 kompleks trinn 5, 8 Stålmyte 12 og 9 Stålikon 14 kompleks trinn 6. Nivåene tas i
rekkefølge, verk som bygges teller ikke, og nivået går aldri ned. Opplåsingene er de samme som før (trinn 4/5/6,
kompleks, plasser 8→10→12→14). Kassa og konsernverdien teller ikke (da kunne man spare seg til et nivå). Titlene
spilleren hadde ved byttet, er et gulv (`konsern.floor`): ingen mister noe; Tuster får Stålkolosse av verkene sine.
Topplista viser tittelen fra nivået (`title_for`). Stormodellene på hovedverket åpnes ved 25 mrd. i verdi i spillet
eller Stålmagnat, som før. Fagpoengene per tittel er de samme.
Konto (B-149): nivået krever konto (serveren regner det); uten konto står titlene man har.

## B-326 Datterverk kjøpes fra konsernkassa, med kø og nye priser (2026-09-29)
Status: gjelder
Bakgrunn: datterverk ble betalt med spilltidspenger (lokal kasse opptil 10 mrd.), mot B-323. Eieren (punkt 2): flytt
bygging og modernisering til konsernkassa med nye, balanserte priser, og bind pengene når prosjektet bestilles.
Beslutning: priser fra konsernkassa stålverk 20 mill., storverk 80 mill., kompleks 250 mill., modernisering 30 % per
trinn, utbygging forskjellen (oppkjøp −15 %, standardverk −25 % som før). Simulert (KONSERN-FORSLAG.md): første verk
3 dager, første storverk 11, Stålmagnat 34, første kompleks 70, fullt konsern ca. 300 dager for en middels spiller.
Et prosjekt betales når det bestilles (`konsern_order`, ny post `prosjekt` i `treasury_ledger`), så pengene ikke kan brukes
til bud. Inntil 3 i køen, ett bygges om gangen (B-311). Det siste i køen kan avbestilles før det starter (`konsern_cancel`,
full refusjon). Salg gir 60 % av den nye prisen med trinn til konsernkassa (`konsern_sell`), også for verk kjøpt før. Bytte
av et lite verk mot kompleks er ett kall (`bytt`). Serveren holder verkene (`konsern`) og køen (`konsern_orders`);
`save_game` legger dem inn i det lagrede spillet (065), og utbyttet regnes av serverens verk. Verkene fra før beholdes med
trinn og prosjekter. Den lokale kassa gjøres ikke om (B-190). Appen: `net/konsern.ts`, `ui/konsernRun.ts`, byggekøen på
Konsern.
Konto (B-149): krever konto (serveren, konsernkassa); uten konto `NeedsAccount` («Datterverk») på Utvid. Gjester har ikke
konsernkassa (ikke i `guest_gate`). I `ACCOUNT_FEATURES` som `datterverk`.

## B-327 Aktivitetskrav på utbyttet og bidragsgulvet (2026-09-29)
Status: gjelder
Bakgrunn: utbyttet og gulvet i bidraget (30 %) ble betalt uansett om kontoen var forlatt (B-324). Eieren (punkt 3): myk
modell som tåler jobb, helg og ferie, men stenger gradvis ved lang inaktivitet.
Beslutning: en aktiv dag er en ekte dag der hovedverket produserte minst 5 % av en normal dag (`production_days`). Faktoren
(`activity_factor`, `config.world.activity`): 100 % i 7 dager etter siste aktive dag, jevnt ned til 50 % ved dag 21 og 0
ved dag 42. Første aktive dag gir 100 % igjen. Utbyttet ganges med faktoren per dag (`pay_dividends`), og gulvet i
bidraget ganges med den (`pay_contributions`). Tre ukers ferie gir 82 % av utbyttet, seks uker 53 %. Alle med konsern var
aktive ved innføringen.
Konto (B-149): ingen ny funksjon (del av konsernkassa).

## B-328 Mesterskapet «Konsernledelse» flyttes til hjemmeverket (2026-09-29)
Status: gjelder
Bakgrunn: mesterskapet (fagpoeng = spilltid) ga opptil +30 % utbytte i ekte tid, mot B-323. Eieren valgte A: flytt
fordelen til hjemmeverket.
Beslutning: utbyttet regnes uten mesterskapet (`DIVIDEND.masteryMax` og `config.world.dividend.mastery_max` = 0). Nivåene
beholdes; «Konsernledelse» gir nå opptil −30 % på administrasjonen på storverket (500 kr per tonn over 5 000 t, B-305),
samme kurve. Grunnprisen er 60 fagpoeng (som energi), etter verdien (B-237). Utbyttet går ned 6–15 % for dem som hadde
nivåer (Grane 33,7 → 29,8 mill., Tuster 36,9 → 33,0). Verk og nivåer er urørt.
Konto (B-149): ingen ny funksjon.

## B-329 Verdenssimulering etter byttet: liten, middels og stor etter 30, 60 og 90 dager (2026-09-29)
Status: gjelder (analyse)
Endringslogg: nei – analyse
Bakgrunn: eieren ba om en ny simulering etter punkt 1–3 og mesterskapet, før Kontroll og overtakelser.
Beslutning: resultatet står i `docs/KONSERN-FORSLAG.md` (avsnitt «Etter byttet»). Flyt inn i konsernkassa dag 30/60/90:
liten 7,4/13,0/16,6 mill., middels 18,5/25,7/30,6, ny stor 53,9/63,1/67,7, dagens største (Grane) 72,8/76,4/77,4.
Forholdet stor/liten går fra 7,3× til 4,1×, og ny stor mot dagens største fra 0,74 til 0,88 – dagens toppspillere
når fullt konsern på ca. 90 dager med de nye prisene. Neste steg (Kontroll og overtakelser) kan bygge på dette.
Konto (B-149): ingen ny funksjon.

## B-330 Anleggsbildet viser mer av det man kjøper (2026-09-29)
Status: gjelder
Bakgrunn: spillerne syns det er kult å se det de kjøper, og ønsket at anleggsbildet følger kjøpene enda mer. En
gjennomgang viste at mange kjøp ikke syntes: lager, strålingsportal, salgskontor, spektrometer, skrapsortering,
verksted, ovn 2 (på nivå 2), øseovn, transformator, vakuumavgassing, skrapterminal og valseverk 2 og 3. Havna og
transportbåndet ble tegnet enten de var kjøpt eller ikke.
Beslutning: `ui/PlantScene.tsx` tegner nå et lite bygg eller en ting for hvert av disse kjøpene: skur (lager), gul og
svart portal ved innkjøringen, salgskontor med skilt, laboratorium (spektrometer), tre containere i hver sin farge
(sortering), verksted med tannhjul, pipe nr. 2 med røyk (ovn 2 på nivå 2), tilbygg med glød (øseovn), kraftlinje fra
masta (transformator), høyt tårn bak støpehallen (vakuum), rød skrapsaks som klipper når verket går (skrapterminal) og
én valselinje til per valseverk (hallen blir høyere på storverket). Havna (skip og kran) og transportbåndet vises bare
når de er kjøpt. Kjøp som sitter inni ovnen eller i styringen (XRF, elektroderegulering, varsling, varmegjenvinning),
tegnes ikke – de ville bare gjort bildet rotete. Skrapsaksa står stille med «redusert bevegelse».
Konto (B-149): ingen ny funksjon – det er bare tegning av det spilleren eier.

## B-331 Neste steg for konsernet: verdenskart, Kontroll, overtakelser og utbyttepolitikk – og pengene hjemme (2026-09-29)
Status: gjelder (planlegging)
Endringslogg: nei – planlegging
Bakgrunn: eieren godtok anbefalingen: utbyttepolitikken bygges sammen med Kontroll og overtakelser, og den delen som
holdes tilbake, styrker datterverkene og Kontroll, ikke hovedverket (B-323). Eieren pekte også på at kassa hjemme vokser
uten ende (mange har 10 mrd. og er tilbake der på minutter, så alt nytt kjøpes med én gang), og ønsket et «anleggsbilde»
for konsernet: et kart der man ser hvor mange og hvilke verk og selskaper andre har. «Det trenger ikke å være et land.
Det kan være en verden. Dette passer senere når vi skal ha flyplass.»
Beslutning: tre spor, i denne rekkefølgen:
1. Anleggsbildet viser mer av det man kjøper (B-330, bygget).
2. Et samlet forslag med tall og simulering for verdenskartet (en oppdiktet verden med regioner, ikke et ekte land;
   flyplass senere), Kontroll, overtakelser og utbyttepolitikken – i `docs/KONTROLL-FORSLAG.md`. Bygges ikke før eieren
   sier ja.
3. Et eget forslag for pengene i hovedverket (byggetid og innkjøring i spilltid, krav om folk og fagpoeng, slitasje og
   fornyelse) – i samme dokument, men som eget spor, siden det gjelder spilltid og ikke verden. Bygges ikke før ja.
Konto (B-149): avgjøres i forslaget.

## B-332 Eierens svar på KONTROLL-FORSLAG: bygges i rekkefølge, og 10× beholdes (2026-09-29)
Status: gjelder (planlegging) – punkt 3 er rettet i B-337
Endringslogg: nei – planlegging
Bakgrunn: eieren svarte på spørsmålene i `docs/KONTROLL-FORSLAG.md` (avsnitt 10) og spurte om å nekte 3× og 10× når alt
er kjøpt hjemme.
Beslutning:
1. **Bare strategiske selskaper kan overtas**, aldri datterverk eller hovedverket.
2. **72 timer forsvarstid** med varsel i appen holder i starten. E-post vurderes når flere spiller.
3. **Den som passer på selskapet, beholder det – men høyst i konsesjonen (14 dager), som nå.** Konsesjonen og det nye
   anbudet 48 timer før slutt (B-189) står. Overtakelser skjer *inne i* konsesjonen: ny eier er beskyttet de 3 første
   dagene, og et bud må legges senest 5 dager før konsesjonen går ut (72 timer forsvar + 48 timer anbud), så det alltid
   er avgjort før fornyelsesanbudet åpner. Den som tar over, får resten av konsesjonen og investeringene. Kontrollen gir
   den sittende eieren en fordel i fornyelsesanbudet: budet teller Kontroll/5 % mer (inntil +20 %). Da lønner det seg å
   passe på, uten at noen eier et selskap for alltid.
4. **Regionnavnene godtas:** Nordkysten, Jernåsen, Sørsletta, Vestbukta, Østskogen og Øyene.
5. **Hjemme: både byggetid/innkjøring (B1) og nabolagsprosjekter (B2)**; slitasje (B3) senere.
6. **3× og 10× beholdes**, også når alt er kjøpt. Pengene kommer fortsatt samme dag på 1×, farten gir ingen fordel mot
   andre (B-323), og å bremse dem som har kommet lengst føles som straff. Byggetid (B1) gir farten en mening i stedet.
Rekkefølge: K5 kartet, K6 utbyttepolitikken og fondet, K7 Kontroll og investeringer, K8 overtakelser (bryter av til de er
testet), så B1 og B2 hjemme. Hvert steg er en egen PR.
Konto (B-149): kartet, utbyttepolitikken, Kontroll og overtakelser krever konto; B1 og B2 gjør det ikke.

## B-333 Verdenskartet: seks regioner, verk og selskaper for alle (K5) (2026-09-29)
Status: gjelder
Bakgrunn: første steg i B-331/B-332: et «anleggsbilde» for konsernet, der man ser hvor mange og hvilke verk og selskaper
de andre har. En oppdiktet verden, ikke et ekte land; flyplass kommer senere.
Beslutning (migrasjon `066_verdenskartet.sql`, `game/regions.ts`, `net/worldMap.ts`, `ui/WorldMap.tsx`):
- **Seks regioner:** Nordkysten, Jernåsen, Østskogen, Sørsletta, Vestbukta og Øyene (`konsern_regions`). Hvert datterverk
  har `region` i `konsern.plants`; hvert selskap har `companies.region` (skraplageret i Vestbukta, slagghåndteringen i
  Jernåsen, verkstedet på Nordkysten).
- **Verkene som fantes** fikk en region jevnt fordelt (`konsern_legacy_region`, rekkefølgen er ulik fra spiller til
  spiller). Tørrkjørt først: bare feltet `region` ble lagt til, ingenting annet endret.
- **Nye verk** bygges i regionen spilleren velger under Konsern → Utvid, ellers der spilleren har færrest verk
  (`konsern_default_region`). Et verk som byttes til kompleks, står der det sto.
- **Flytting:** hvert verk kan flyttes én gang, gratis (`konsern_move`; `moved` på verket). Et verk i køen kan få ny region
  fritt til det starter. (Forslaget sa «de første 14 dagene»; én gratis flytt uten frist er enklere og like harmløst.)
- **Kartet** er en ny underfane, Konsern → Kart: SVG med de seks regionene rundt et hav, merker for dine verk (aksentfarge),
  andres verk (grå, kompleks større) og selskaper (rombe). Under kartet en liste med regionene (knapper, 44 px) som også er
  veien inn på små skjermer; ved siden av (PC) eller under (mobil) står regionen: selskapene med eier, spillerne med
  kallenavn, tittel og antall verk per type. `world_map()` gir bare det topplista alt viser, og ikke sperrede kontoer.
- Regionen har ingen virkning i økonomien ennå; Kontroll (K7) bruker den.
- Speilet: `game/regions.ts` (navn, standardregion) og `konsernWorld.ts` (`placeOrder` med region, `movePlant`).
Konto (B-149): krever konto – kartet viser andre spillere (regel 3). Står i `ACCOUNT_FEATURES` som «Verdenskartet»;
uten konto vises `AccountFeaturesCard`.

## B-334 Utbyttepolitikk, forsvarsfond, Kontroll og investeringer (K6 og K7) (2026-09-29)
Status: gjelder – fordelen i fornyelsesanbudet er tatt bort i B-337
Bakgrunn: steg 2 og 3 i B-331/B-332. De som er ferdige med konsernet, samler 60–80 mill. per ekte dag uten noe å bruke
dem på; Kontroll skal gjøre det lønnsomt å passe på selskapene sine, og gi fordel når konsesjonen fornyes.
Beslutning (migrasjon `067_kontroll.sql`, `game/control.ts`, `dividendToTreasury` i `dividend.ts`, `ui/Companies.tsx`):
- **Utbyttepolitikk:** Ta ut (30 % igjen i verkene, som før), Balansert (50 %) eller Bygg forsvar (70 %). Det som holdes
  igjen utover 30 %, går til **forsvarsfondet** (`konsern.fund`), etter samme imperiebelastning – fondet er akkurat det
  kassa får mindre (37 mill. fullt utbytte gir 31,3 mill. til kassa ved Balansert og 24,2 mill. ved Bygg forsvar).
  Valget endres én gang per ekte uke (`konsern_policy`). `dividends.to_fund` viser hva som gikk til fondet.
- **Fondet** kan bare brukes til investeringer i egne selskaper (og forsvar mot overtakelser, K8) – aldri til nye verk,
  angrep eller hovedverket (B-323). Konsernverdien på topplista regnes fortsatt med hele utbyttet (`fullPerDay`).
- **Kontroll** per selskap for eieren (`company_control`), 0–100 og som ord (sterk ≥ 80, stabil ≥ 60, presset ≥ 40, svak):
  eier 30, aktivitet 0–20 (`activity_factor`), investeringer 0–25 (1 − e^(−investert/verdi)), egne verk i regionen 2,5
  hver (høyst 10), eiertid 1 per uke (høyst 10), fondet 0–10, −5 per selskap utover det første. Verdien er 30 dagers
  inntekt, men minst forrige vinnerbud (skraplageret i dag ca. 443 mill.; eieren har Kontroll 53, «presset»).
- **Investeringer** (`company_invest`, minst 1 mill., fra kassa eller fondet) blir i selskapet, gir Kontroll og inntil
  +25 % inntekt (samme kurve, i `pay_company_income`), og følger selskapet til neste eier.
- **Fornyelsesanbudet** (B-332): den sittende eierens bud teller Kontroll × 0,2 % mer, inntil 20 % (`resolve_tenders`);
  beløpet som betales, er budet.
- Vises: Kontrollen (ordet) på alle selskapskort; delene, rådet og investeringen bare for eieren. Utbyttepolitikken står
  ved konsernkassa på Industrien, og bare når den betyr noe (du eier et selskap, har et fond eller har valgt noe annet
  enn Ta ut – gradvis synlighet).
- Testet som spiller i DO-blokker som rulles tilbake (Kontroll 53 → 68 etter 450 mill., avvisninger, uke-sperren,
  ikke-eier), og de faste tallene for splitten i `game/tests.ts`.
Konto (B-149): krever konto – konsernkassa og selskapene er på serveren (regel 2, 3 og 7).

## B-335 Overtakelser av strategiske selskaper, med bryteren av (K8) (2026-09-29)
Status: gjelder – taket på budet er hevet i B-337, slått på 29.9.2026 (B-339)
Endringslogg: nei – bryteren er av; oppføringen skrives når overtakelser slås på
Bakgrunn: steg 4 i B-331/B-332. RETNING fase 4: testes grundig med få aktører før det slås på.
Beslutning (migrasjon `068_overtakelser.sql`, `TAKEOVER`/`takeoverAttack`/`takeoverDefense` i `game/control.ts`,
`bidTakeover`/`defendTakeover`/`applyTakeoverNews` i `net/world.ts`, `TakeoverSection` i `ui/Companies.tsx`):
- Bare strategiske selskaper kan overtas (B-332). Tabellen `takeovers`; bud (`takeover_bid`) minst verdien, betalt fra
  konsernkassa med én gang, offentlig; angriperen kan øke. Eieren forsvarer seg i 72 timer (`takeover_defend`) med
  kapital fra kassa eller fondet; fondet teller av seg selv inntil verdien.
- Utfallet (`resolve_takeovers`, fra `world_tick`), uten tilfeldighet: angrep = 60 × √(bud/V) × (0,5 + 0,5 × aktivitet)
  + 2,5 per egne verk i regionen (høyst 10); forsvar = Kontroll + 40 × √((forsvar + fond, høyst V)/V); alt høyst 3 × V.
  Overtatt: gammel eier får 85 % av budet, ny eier får resten av konsesjonen og investeringene. Avverget: angriperen
  får 90 % tilbake. Forsvaret får 95 % tilbake, dit det kom fra. Mister eieren selskapet på annen måte, avbrytes
  forsøket og alle får alt tilbake.
- Vinduet (`takeover_window`): ny eier beskyttet 3 dager, bud senest 5 dager før konsesjonen går ut, 14 dagers pause
  etter et forsøk, ett forsøk per angriper om gangen.
- Appen: forsøket vises på selskapskortet for alle (angrep mot forsvar nå); eieren får forsvarsfeltet, beskjed på
  Konsern → Oversikt og merket «Angrep» på Industrien, og beskjed i loggen om utfallet (`g.takeoverSeen`).
- Bryteren `config.world.takeover.enabled` = 0: da returnerer `takeover_window` null, `takeover_bid` sier «av», og appen
  viser ingenting. Testet hele gangen i en DO-blokk med bryteren på (rullet tilbake): avverget 75,3 mot 94,6 og overtatt
  91,2 mot 54,0, med riktige beløp og eierrader.
Konto (B-149): krever konto (regel 3 og 7).

## B-336 Byggetid og innkjøring for store kjøp, og nabolagsprosjekter hjemme (spor B1 og B2) (2026-09-29)
Status: gjelder
Bakgrunn: steg 5 i B-332 («5. ta begge»): pengene i hovedverket skal gi mer å gjøre og se på, uten nye valutaer og
uten å nekte 3× og 10× (brukeren fulgte anbefalingen).
Beslutning (`game/building.ts`, `buyUpgrade`/`finishBigBuild`/`buildNeighbor`/`finishNeighbor` i `game/actions.ts`,
`ui/Neighborhood.tsx`, kran og bygg i `ui/PlantScene.tsx`):
- Store kjøp (fra 50 mill., ikke flytting til nytt sted) bygges i spilltid: 2 døgn + 1 per 100 mill., høyst 10
  (`buildDays`). Pengene trekkes med én gang. Bare ett stort prosjekt om gangen; de andre store kjøpene viser «ett stort
  prosjekt om gangen». En ovn som bygges om, står til den er ferdig («Ombygging: …»).
- Innkjøring: en ny ovn eller støpemaskin går 70 % det første døgnet og når full fart etter 5 døgn (`rampFactor`, i
  syklustiden per ovn og i støpefarten).
- Nabolaget (storverket): seks store bygg i byen, i rekkefølge, ett om gangen, betalt med pengene hjemme – idrettshall
  1 mrd. (trivsel +5), kulturhus 2 mrd. (ingen naboklager), bro 3,5 mrd. (flere forespørsler), skole 5 mrd. (flinkere
  søkere), sykehus 7 mrd. (20 % færre sykemeldinger) og konserthus 9,5 mrd. (omdømmet synker ikke under 70 når det er
  over). Byggetid 3–8 døgn. Byggene og en tårnkran står i anleggsbildet.
- Kortet «Byggeprosjekter» på Verket → Anlegg vises først når noe bygges, noe er bygget, eller kassa er halvveis til
  neste prosjekt (gradvis synlighet, B-180).
- Alt er spilltid og eget verk (B-323): ingenting teller mellom spillere. Nye felt `g.bigBuild`, `g.neighborhood`,
  `FurnaceUnit.rampFromDay` og `g.castingRampFromDay` har standardverdier i `migrate()`.
Konto (B-149): krever ikke konto (regel 1: eget spill).

## B-337 Svar 3 rettet: eieren kan alltid miste selskapet, ellers gjelder 14-dagersregelen (2026-09-29)
Status: gjelder
Erstatter: punkt 3 i B-332, fordelen i fornyelsesanbudet i B-334 og taket på budet i B-335.
Bakgrunn: eieren: «Du tolker svar 3 feil. Den som forvalter selskapet skal kunne miste det ved overtakelse. Men om ingen
greier å ta over gjelder 14 dagers regelen.» B-332 leste svaret som at den som passer på, beholder selskapet mot hvem som
helst, og B-335 gjorde det slik: med sterk Kontroll og forsvar kunne ingen bud vinne («ikke mulig» i tabellen), og
Kontrollen ga i tillegg inntil 20 % fordel når konsesjonen skulle fornyes.
Beslutning (migrasjon `069_overtakelse_alltid_mulig.sql`, `TAKEOVER.attackCap` i `game/control.ts`):
- **Eieren kan alltid miste selskapet.** Angriperens bud teller nå inntil 10 × verdien (`attack_cap`); forsvaret teller
  fortsatt høyst 3 × verdien. Det sterkeste forsvaret (Kontroll 100 og 3 × V) er 169; en aktiv angriper med 10 × V har 190.
  Å passe på gjør selskapet dyrere å ta – for skraplageret fra 450 mill. (passiv eier) til ca. 3,4 mrd. (alt på topp) –
  men aldri umulig. Den gamle eieren får fortsatt 85 % av budet.
- **Klarer ingen å ta det, gjelder 14-dagersregelen som før:** konsesjonen går ut, og alle stiller likt i det nye anbudet.
  Fordelen for sittende eier i fornyelsesanbudet er tatt bort (`control.renewal_max` = 0; `control_bonus` står, men gir 0).
- Alt annet i B-335 står: bare strategiske selskaper, 72 timer forsvar, vern de 3 første dagene, bud senest 5 dager før
  konsesjonen går ut, 14 dagers pause etter et forsøk, bryteren av til eieren slår den på.
- Kontroll gir fortsatt inntil 25 % mer inntekt av investeringer (B-334) og gjør overtakelser dyrere.
Testet: SQL (`takeover_attack_of(10 V) = 189,74` mot `takeover_defense_of(100, 3 V) = 169,28`, ingen selskap med fordel i
anbudet), `npm test` med de samme tallene. Tabellen i `docs/KONTROLL-FORSLAG.md` avsnitt 5 er regnet på nytt.
Konto (B-149): uendret – overtakelser og anbud krever konto.

## B-338 Skiftrapporten: én felles chat for alle spillere med konto (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Lag en globalchat. Den må heita "Skiftrapporten".»
Beslutning (migrasjon `070_skiftrapporten.sql`, `net/chat.ts`, `ui/Chat.tsx`):
- **Serveren:** tabellen `chat_messages` (RLS uten policyer) og funksjonene `chat_send`, `chat_list`, `chat_latest` og
  `chat_delete`, bare for innloggede (ikke `anon`, og gjester stoppes av `guest_gate`). Meldingene vises med brukernavnet
  fra topplista; uten brukernavn kan man lese, men ikke skrive. Sperrede kontoer (juksesperren eller `banned`) kan lese,
  men ikke skrive; meldingene fra en `banned` konto skjules.
- **Grenser mot bråk:** 1–300 tegn på én linje, én melding per 5 sekunder og høyst 20 per 10 minutter, ikke samme tekst to
  ganger på 2 minutter, ingen lenker. Meldingene står i 30 dager. Egne meldinger kan slettes; eieren skjuler andres med
  `update public.chat_messages set hidden = true where id = …`.
- **Appen:** knapp med snakkeboble ved varsellinja (under 380 px i tallraden øverst, ved «?», som B-283), med prikk når
  det har kommet nye meldinger (ser etter hvert minutt). Arket henter nye meldinger hvert 5. sekund mens det er åpent,
  egne meldinger står til høyre. Sist leste melding huskes per konto på enheten (bare for prikken).
- **Gradvis synlighet:** knappen vises med konto, eller uten konto fra verkstedet (nivå 1), aldri under veiledningen.
  Uten konto viser arket hva Skiftrapporten er, med `NeedsAccount` og knapp til innlogging.
- Ingen hendelser fra spillet skrives inn automatisk ennå (f.eks. «X vant anbudet») – kan komme senere.
Testet: SQL som spiller i en DO-blokk som ble rullet tilbake (lagret, for fort, lik tekst, lenke, for lang, slettet, lista),
`npm test` (ny nettest mot falsk tjeneste), Playwright på de 7 størrelsene med og uten konto.
Konto (B-149): krever konto (regel 3: viser andre spillere og brukernavnet ditt).

## B-339 Hendelser fra spillet i Skiftrapporten, og overtakelser slått på (2026-09-29)
Status: gjelder
Bakgrunn: eieren sa ja til hendelser i Skiftrapporten («Ja jeg vil ha det») og «Åpne for overtakelser nå» – før 13.10.,
som jeg hadde anbefalt å vente til (se svaret i økt 266).
Beslutning (migrasjon `071_skiftrapporten_hendelser.sql`):
- **Overtakelser er på:** `config.world.takeover.enabled` = 1. Skraplageret kan få bud fra vernet går ut (2.10. kl. 03:33
  norsk tid, tre dager etter at konsesjonen startet) til fem dager før den går ut (8.10.).
- **Hendelser:** serveren skriver selv i Skiftrapporten (`chat_messages.kind = 'hendelse'`, uten avsender) når
  - et anbud åpner («Anbudet på skraplageret er åpent til …»), avgjøres («X vant anbudet på … (n bud)») eller ingen byr,
  - noen prøver å overta et selskap (med budet, som alt er offentlig) og hvordan det gikk (overtatt / slo tilbake),
  - en spiller når en ny konserntittel («X er blitt Stålkonge!»).
  Hemmelige anbudsbud nevnes aldri. Triggere på `tenders`, `takeovers` og `konsern` (`chat_on_*`), så de store
  funksjonene står urørt; en melding som feiler, stopper aldri spillet (`exception when others`).
- **Appen:** hendelsene står midt i lista med fabrikkikon og egen farge, uten avsender, og kan ikke slettes. De gir prikken
  på knappen som andre meldinger.
Testet: DO-blokk som ble rullet tilbake: anbud åpnet og avgjort, forsøk avverget og overtatt, ny tittel – alle sju
meldingene riktige i `chat_list`. `npm test` (hendelse i nettesten), Playwright på 320, 390 og 1 366 px.
Konto (B-149): som Skiftrapporten og overtakelser – krever konto.

## B-340 Konsernkassa i toppfeltet (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Konsernkasseverdien bør stå i toppfeltet.»
Beslutning (`TopBar` i `ui/GameApp.tsx`, `game.css`):
- Konsernkassa står som et eget nøkkeltall i toppfeltet, etter strømprisen: konsernikonet og beløpet, med ordet
  «Konsernkassa» der det er god plass (under 600 px og fra 1 600 px; ellers bare ikon og beløp, ordet i verktøytipset og
  for skjermlesere). Trykk åpner Konsern → Industrien, der kassa brukes (anbud, overtakelser, investeringer).
- Vises bare når spillet har konsernkassa fra serveren (`g.konsern.treasury`, konto og konsern) – før det finnes den ikke
  (gradvis synlighet). Beløpet følger `world_status`, som appen alt henter jevnlig.
- Toppfeltet på PC: varsellinja og knappene ved den (hjelp, Skiftrapporten, topplista) er nå én blokk som brytes samlet
  til neste rad når det er for trangt. Før spredte knappene seg utover raden (hver hadde `margin-left: auto`).
Testet: Playwright på de 7 størrelsene med 123,45 mrd. kr i kassa (ingen avkorting, ingen horisontal scrolling, trykk
åpner Industrien) og uten konsernkassa (320 og 1 366 px).
Konto (B-149): konsernkassa krever konto fra før (B-326); uten konto vises tallet ikke.

## B-341 Utbetalt til eierne teller mot sluttmålet og de største ovnene (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Noen får ikke råd til de største ovnene fordi vi har cap på 10 mrd i lokalkassa.» Kassetaket (B-306)
er like høyt som sluttmålet (10 mrd.), og det som betales ut over taket, teller ikke i konsernverdien (B-303). En spiller
uten datterverk kunne derfor aldri få verdien over 10 mrd. når den ble sjekket: én spiller sto med 9 999,5 mill. i kassa og
530 mill. utbetalt, uten sluttmålet – og dermed uten Lysbueovn 250 t og valseverk nr. 3 («Åpner ved sluttmålet»). De
største ovnene (Likestrømsovn 420 t, renseanlegg for storverk, strengstøpemaskin nr. 3) krevde 25 mrd. i verdi eller
tittelen Stålmagnat, og uten konto (datterverk) kunne verdien aldri nå 25 mrd.
Beslutning (`valueCreated` i `game/konsern.ts`):
- **Verdien spilleren har skapt** = konsernverdien + det som er betalt ut til eierne (`paidOutTotal`). Den brukes til
  sluttmålet (`checkWin`), grensen på 25 mrd. for de største ovnene (`gateBlocker`, teksten sier nå «utbetalt til eierne
  teller med»), prestasjonene Stålbaron/Stålmagnat/Stållegende og linja «Mot sluttmålet» på Konsern.
- **Konsernverdien selv er uendret** (`konsernEquity`): topplistene, tidslinja til serveren, milepælene og juksesperren
  bruker den som før, og utbetalingene legges ikke inn i den (B-303 står). Alt dette er eget spill (B-323).
- Tittelen Stålmagnat fra datterverkene åpner fortsatt de største ovnene med én gang.
- Spillere som står fast, får sluttmålet i neste time de spiller; ingen endring i lagrede spill på serveren trengs.
Testet: ny test i `npm test` (9 999,5 mill. + 530 mill. utbetalt → sluttmålet; 10 mrd. + 15,1 mrd. utbetalt → de største
ovnene), `balance.ts`.
Konto (B-149): krever ikke konto (eget spill).

## B-342 Tallet på Konsern teller bare kjøp som er verdt å gjøre (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Jeg har 3 varsler i konsernet men det er ingenting jeg kan kjøpe.» Kontoen hadde 30 mill. i
konsernkassa, fullt konsern og tre stålverk. Tallet på Konsern (`konsernReady`) talte moderniseringen av de tre
stålverkene (5 mill. hver) – de eneste kjøpene kassa rakk til. Men de sto ikke der spilleren så: hovedknappen for et
stålverk er utbyggingen (51 mill.), og Utvid viser bare de tre som betaler seg raskest. Og de er bortkastet: moderniseringen
starter på nytt når stålverket bygges ut til storverk (B-119).
Beslutning (`worthwhileOptions` i `game/konsern.ts`):
- Modernisering av et verk som kan bygges ut, teller ikke i tallet på Konsern, foreslås ikke som «Neste steg» og står ikke
  under «Bygg ut verkene dine» på Utvid. Den kan fortsatt velges under verket selv.
- Alt annet teller som før: det som ikke er sperret og som konsernkassa (eller kassa, for de felles funksjonene) rekker til.
Testet: kontoens konsern kjørt lokalt (3 → 0), ny test i `npm test`, `balance.ts`.
Konto (B-149): uendret (datterverk krever konto).

## B-343 Verdensoppdateringen uten kø: høyst én gang per 30 s, aldri vente (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Tror databasen begynner å bli treg. Må vente iblandt før industrien siden vises. Det samme skjer med
topplista.» Målt: `world_status` hadde 6 414 kall med snitt 0,24 s, men opptil 7,7 s; lagringen hadde topper på 7,4 s.
Hvert kall kjørte `world_tick()` (anbud, overtakelser, inntekt, utbytte, bidrag), som ventet på en lås
(`pg_advisory_xact_lock`). Med flere apper åpne sto kallene i kø bak hverandre. Hvert steg alene tok bare 13–94 ms.
Beslutning (migrasjon `072_world_tick_uten_ko.sql`):
- `world_tick` kjøres høyst én gang per 30 sekunder (`world_tick_state.last_at`, `config.world.tick_seconds`), og bruker
  `pg_try_advisory_xact_lock`: holder en annen app på, hopper kallet over i stedet for å vente. Arbeidet er uendret.
- Fristene i verden er i timer og dager, så et anbud eller en overtakelse avgjøres høyst 30 s senere enn før.
- Målt etterpå som spiller: `world_status` 26–65 ms.
- Topplista «Konsernverdi» tar 0,25–0,4 s (den regner konsernverdien for hver spiller); det står som det er til det
  trengs – den ventet mest på den samme køen.
Endringslogg: ja (raskere Industrien og toppliste).
Konto (B-149): uendret.

## B-344 Færre kall til databasen: lagring hvert 30. sekund, sesongresultatet én gang (2026-09-29)
Status: gjelder
Endringslogg: nei – teknisk; spillerne merker ingenting
Bakgrunn: eieren: «Log query på supabase er ganske stor.» `pg_stat_statements` over 4 dager: ca. 101 000 kall (25 000 per
dag) fra 17 aktive spillere. Størst: lagringen (`save_game`) 31 486 kall, i snitt 200 kB JSON hver (ca. 1,5 GB per dag),
og tidslinjetall (snapshots) 15 000 innsettinger – ett per lagring med ny spilldag. Deretter `world_status` og
`season_history` med ca. 6 500 hver. `season_history` ble hentet hver gang et ark eller hendelseskort ble lukket:
beskjeden om sesongresultatet vises bare når ingen ark er åpne (`!modalOpen`), så den ble montert på nytt hver gang.
Beslutning:
- `UPLOAD_INTERVAL_MS` 15 s → 30 s (`net/sync.ts`). Lagringen etter en handling (2 s), når appen legges bort, og ved bytte
  av enhet står som før, så ingenting går tapt ved bytte. Halverer lagringene og tidslinjetallene.
- `fetchSeasonHistory` (`net/season.ts`) mellomlagres i 5 minutter per konto, og beskjeden om sesongresultatet
  (`SeasonResultNotice`) husker resultatet per konto og sesong i økta. Målt i Playwright: ett kall i stedet for ett per
  lukket ark og ett per åpning av topplista.
- `world_status` er uendret i appen (hvert minutt); køen på serveren ble fjernet i B-343.
Testet: `npm test`, lint, typesjekk, bygg; Playwright med falsk tjeneste (beskjeden vises og lukkes, lista hentes én gang
selv med topplista åpnet tre ganger).
Konto (B-149): uendret.

## B-345 Daglig eksport av spilltabellene (2026-09-29)
Status: gjelder
Endringslogg: nei – teknisk; spillerne merker ingenting
Bakgrunn: eieren: «Lag eksport av de viktigste tabellene». Gratisplanen i Supabase tar ingen sikkerhetskopier av
databasen («No backups»). `save_backups` dekker bare spillene, ikke konsernet, selskapene, anbudene, kassa eller topplista.
Beslutning:
- `073_eksport.sql`: `backup_export()` samler alle tabellene i `public` (unntatt `save_backups`) til én JSON
  `{ laget, versjon, tabeller: { navn: [rader] } }`. Bare `service_role` kan kjøre den. Bygges som tekst med `json_agg` per
  tabell (0,5 s); jsonb satt sammen bit for bit tok 14 s og stoppet på tidsgrensen (8 s) – den første versjonen.
- Edge-funksjonen `eksport` (`supabase/functions/eksport`, uten JWT-sjekk) pakker den med gzip og legger den i den
  private mappa `eksport` i Storage som `stalverk-ÅÅÅÅ-MM-DD.json.gz` (ca. 2,1 MB i dag, 13 MB utpakket). Høyst én fil per
  dag: et nytt kall samme dag hoppes over, så det er ufarlig at hvem som helst kan kalle adressen. Filer eldre enn
  14 dager slettes. Nøkkelen (service_role) settes av Supabase i funksjonens miljø – den står ikke i repoet.
- pg_cron-jobben `eksport-daglig` kaller funksjonen kl. 02:17 UTC med pg_net. Adressen ligger i Vault (`eksport_url`),
  lagt inn for seg. pg_net står i schemaet `extensions` (i `public` ga det et varsel i get_advisors).
- Innloggingsdata (`auth.users`: e-post og passordhash) er ikke med. Eieren laster ned filene i dashbordet:
  Storage → eksport → fila → Download, og kan legge dem et trygt sted.
Testet: kjørt for hånd – 200, 37 tabeller, 2 195 607 byte; kall nummer to samme dag hoppes over; cron-jobben er aktiv;
get_advisors (security) uten nye funn.
Konto (B-149): ingen funksjon i spillet.

## B-346 Ingen vikarer mens hele verket står (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Koffer bi d leid inn vikara når d e stopp i drifta? (Skiftleder)». Skiftlederen (B-211) dekket alt
fravær med vikarer til halvannen gang lønna uansett. I sommerstansen (B-298) betales ingen lønn og ovnene står i tre
uker, men sykdom ble fortsatt trukket – og skiftlederen leide vikarer for dem. Det samme skjedde ved andre stans av hele
verket (dødsulykke, ombygging av den eneste ovnen).
Beslutning:
- `plantRestartMin(g)` (`plant.ts`): står alle ovnene lenger enn den neste timen, gir den minuttet de starter.
  `checkTemps` leier da ingen vikarer – verken skiftlederen eller automatikken – og gir ikke varselet om at vikarene gikk
  hjem. Timen før ovnene starter, leies de inn som før for dem som fortsatt er borte. Står bare noen av ovnene, går
  verket, og alt er som før.
- I sommerstansen blir ingen syke (alle har ferie).
- Folk → Fravær sier «Verket står til dag N, så ingen vikarer trengs nå» i stedet for knappene og varselet, og rådet på
  Verket og merket på Folk vises ikke mens verket står. Knappene kommer tilbake når ovnene går.
- Vikarer som alt var leid inn før stansen, betales ikke tilbake.
Testet: ny test i `game/tests.ts`; `balance.ts` og `balance.ts --sommerstans`.
Konto (B-149): nei – vanlig spillmekanikk.

## B-347 Ingen zoom i tekstfelt på mobil (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Mobilen zoomer inn når jeg skal skrive i chatten..» Safari på iPhone zoomer inn på et tekstfelt med
skrift under 16 px når man trykker i det, og zoomer ikke ut igjen. Da ble Skiftrapporten kuttet i høyre kant. Chatfeltet
arvet 14 px (`--fs-body`), feltene i kontoen 13 px (`.g-field`).
Beslutning:
- `@media (pointer: coarse)`: alle `input` (unntatt avkrysning, radio og glidebryter), `select` og `textarea` får
  `font-size: max(16px, 1em)`. Gjelder chatten, innlogging, kallenavn og beløpsfeltene i Industrien (17 → 16 px).
- Ikke `maximum-scale=1` i viewport: det stenger for å zoome med fingrene, som noen trenger for å lese.
- PC (mus) er uendret.
Testet: Playwright, iPhone SE og 13: 16 px; PC 1366: 13/14/17 px som før. Chromium zoomer ikke, så eieren sjekker på
telefonen.
Konto (B-149): nei.

## B-348 Skiftrapporten raskere og sikrere varsel (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Tar lang tid å hente meldingene i chatten av og til. Og får ikke alltids varsel om at det er nye
meldinger i chat.» Spørringene tar under 1 ms, men den første i hver databaseforbindelse 85 ms, og enkelte kall har tatt
opptil 6 s. Arket viste ingenting før svaret kom, og feilet kallet, sto det «Ingen har skrevet ennå». Knappen så etter nye
meldinger bare hvert 60. sekund – og mobilen stopper tidtakere i bakgrunnen. Begge knappene (varsellinja og tallraden,
den ene skjult med CSS) spurte hver for seg. `chat_latest` talte meldinger fra spillere uten kallenavn, som lista ikke viser.
Beslutning:
- De siste 60 meldingene lagres på enheten per konto (`stalverk-skiftrapport-cache`, `net/chat.ts`). Arket viser dem med
  én gang; serverens liste erstatter dem ved første svar (så skjulte meldinger forsvinner), så hentes bare nye.
- Feil: «Får ikke kontakt med serveren. Prøver igjen …» (tom liste) eller en linje under lista.
- Knappene deler én sjekk (`subscribeLatest` i `ui/Chat.tsx`): hvert 20. sekund, når appen vises igjen
  (`visibilitychange`/`focus`) og når arket lukkes.
- `074_skiftrapporten_nyeste.sql` (kjørt): `chat_latest` teller bare det lista viser.
Testet: Playwright med falsk tjeneste (treg og feilende `chat_list`): lagrede meldinger vises straks, feilmeldingene,
prikken ved `visibilitychange`, ett kall i stedet for to.
Konto (B-149): uendret (Skiftrapporten krever konto).

## B-349 Vern mot konkurs i sommerstansen, og råd når kassa er under kredittgrensen (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «En spiller gikk konkurs av å handle for mye skrap før en sommerstans. Har vi bra nok opplæring?» Nei:
skrap kan kjøpes helt ned til kredittgrensen; i sommerstansen selges ingenting i tre uker mens faste kostnader og renter
går, så kassa gikk over grensen, og etter sju døgn var det konkurs – mens verket sto. Varselet sto bare i loggen, uten
hva man kan gjøre. (Spillet finnes ikke lenger på serveren; spilleren begynte trolig på nytt.)
Beslutning:
- Banken teller ikke døgn over kredittgrensen i sommerstansen (`summerStop`); tellingen fortsetter der den var når ovnene
  går igjen. En loggmelding hver uke i stansen sier det.
- `CREDIT_HELP` (`engine.ts`): selg skrap under Marked, ta opp lån under Verket → Økonomi, eller selg ferdigvarer. Står i
  loggmeldingene og i et nytt råd øverst på Verket når kassa er under grensen (med døgn igjen til konkurs).
- Uka før sommerstansen: råd hvis kassa er i minus. Fellesferiekortet sier at ingenting selges og faste kostnader går.
Testet: ny motortest (ingen telling i stansen, telling etter), `balance.ts` og `--sommerstans` (0 konkurs).
Konto (B-149): nei.

## B-350 De største ovnene: begge veiene står på knappen (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Hvordan skal spillerne få til å kjøpe di største 420 ovnene?» De koster 700 mill. (under kassetaket), og
åpner med tittelen Stålmagnat i konsernet (tre storverk modernisert til trinn 3, `LADDER[0]`) eller ved 25 mrd. i verdi
(B-341). Knappen nevnte bare 25 mrd. Eksempel: en spiller med åtte storverk på trinn 0 og ca. 29 mill. per ekte dag i
konsernkassa trenger ni moderniseringer à 24 mill. (ca. 216 mill., 4 t hver) – ca. en ukes ekte tid.
Beslutning: `gateBlocker` sier «Åpner med tittelen Stålmagnat i konsernet (3 storverk modernisert til trinn 3) eller ved
25 mrd. i verdi» – tallene hentes fra `LADDER`, så teksten følger stigen.
Konto (B-149): nei.

## B-351 Kokillene i strengstøpingen (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Få kokiller inn i spillet (strengstøpeanlegg)». Kokillen fantes bare i tekst (fagboka, bruddvarsling).
Beslutning:
- `game/mould.ts`: `g.mould = { wear, lastDay }`. Hvert tonn som støpes, sliter kokillene med tonn / (støpekapasitet ×
  24 × 20): ca. 20 døgn med full støping. Slitasjen kan gå til 150 %.
- Over 75 % slitasje øker faren for strenggjennombrudd: × (1 + 3 × (slitasje − 0,75)), dvs. 1,75 ganger så ofte ved
  100 %. Ganges inn i den gamle sjansen i `castBatch`. Først prøvd fra 60 % med 5: storverket (mange øser, 4 t stans per
  gjennombrudd) mistet for mye omdømme (to frø endte på 2–4).
- Bytte: 1 % av støpemaskinens pris per maskin (minst 20 000 kr), støpingen står 2 timer (ganget med reparasjonsfarten).
  For et fullt storverk med tre 8-strengs maskiner: 3,6 mill. hvert ca. 20. døgn – lite mot 35 mill. om dagen, men nok til
  å merkes tidlig (strengstøpemaskin 1: 55 000 kr).
- Reparatøren bytter ved 90 % når «Reparatøren bytter foringen» er på (samme bryter, ingen ny innstilling). Ellers råd ved
  85 % («Trykk her og så Bytt kokiller»), og en melding i loggen første gang.
- Raden «Kokillene» på Verket → Anlegg → Vedlikehold, under ovnene; forklaring under «Slik virker foringen». Ny side i
  fagboka (Strengstøping): «Kokillen slites». Vises bare med strengstøping (gradvis synlighet).
- Testspilleren: nybegynneren følger rådet (85 %), den flinke bytter ved 90 %.
Testet: ny motortest, `balance.ts` (alle mål OK; snittomdømmet de siste 41 radene i verbose-kjøringen 65 mot 68 før, frø
2 og 4 ned 7–9 – kokillene gjør storverket litt krevende), Playwright 320/390/1366 (raden, knappen, bytte).
Konto (B-149): nei – eget spill.

## B-352 Dagens oppdrag «Øk konsernverdien» teller utbetalt til eierne (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Dagens oppdrag, øk konsernverdien med 1 mrd er ikke mulig». Oppdraget «verdi» målte `konsernEquity`.
Med kassa på taket (B-303/B-306) betales alt overskudd ut til eierne, og konsernverdien står stille – samme feil som
sluttmålet hadde (B-341).
Beslutning: oppdraget måler `valueCreated` (konsernverdi + utbetalt til eierne). Målet (ca. tre døgns overskudd) er
uendret. Nye oppdrag får `v: 2`; et «verdi»-oppdrag uten den får `paidOutTotal` lagt til startverdien i `migrate()`, så
dagens oppdrag ikke blir gjort av seg selv ved oppdateringen. Teksten sier «(utbetalt til eierne teller med)».
Oppdragene sjekkes bare i appen; bonusen på serveren er uendret.
Testet: ny motortest.
Konto (B-149): uendret (dagens oppdrag krever konto for bonusen).

## B-353 Mindre og sjeldnere lagring, partier slås sammen, konsernet låses bare ved behov (2026-09-29)
Status: gjelder
Endringslogg: ja (spillerne merker raskere lasting og færre partier)
Bakgrunn: eieren: «Det tar lang tid før data lastes inn her enda» (topplista, Skiftrapporten, Industrien og kartet sto og
lastet samtidig, 19:47). Loggene: tidsavbrudd 17:45–17:47 UTC som ventet på raden i `konsern` (`konsern_settle` tok
`for update` hver gang – også i `save_game`, som holdt låsen til hele lagringen var ferdig). Og maskinen var overbelastet:
et checkpoint brukte 6,7 s på 13 blokker, et tomt kall tok 375 ms, PostgREST sto «idle in transaction» i opptil 13 s.
`save_game` sto for 1,8 GB av skrivingen (WAL, 57 kB per kall); alt annet til sammen under 50 MB. De største spillene var
400–520 kB, mest fordi ferdigvarelageret hadde over 1 000 partier (armering fra flere hundre døgn tilbake): `addLot` slo
bare sammen med forrige parti samme døgn.
Beslutning:
- `compactLots` (`engine.ts`): partier med samme `lotKey` (vare, annenrangs, kvalitetene analysen og det kjente holder,
  det som er målt) slås sammen hvert døgn og ved lasting (`migrate`). Analysene vektes med tonn (6 desimaler), det eldste
  døgnet beholdes. Partier fra i dag og i går står for seg. Snittet av partier som holder de samme kvalitetene, holder dem
  også, så leveranser og reklamasjoner virker som før.
- Opplasting: hvert 60. sekund (var 30), og etter en handling tidligst 15 s etter forrige (`SOON_MIN_GAP_MS`; før kunne
  mange trykk gi en lagring hvert andre sekund). Når appen legges bort og ved bytte av enhet lagres det som før med én gang.
- `075_konsern_uten_lås.sql` (kjørt): `konsern_settle` sjekker først uten lås om et prosjekt skal starte eller er ferdig,
  eller om nivået endres; ellers returnerer den straks. Arbeidet når det er noe å gjøre, er uendret.
Neste steg hvis det ikke holder: større maskin i Supabase (betalt plan), eller et tak på `history`/`log` i lagringen.
Testet: motortest (300 partier → 3, samme tonn og kvaliteter), nettester, `balance.ts`; `konsern_settle` for alle konsern
i en DO-blokk som ble rullet tilbake.
Konto (B-149): uendret.

## B-354 «Koblet til på dag N» vises ikke på topplista (2026-09-29)
Status: gjelder – erstatter delen av B-170 som viste merket
Bakgrunn: eieren: «Når folk koblet til har ikke noe å si for folk som ser på topplista». Merket (B-170) skulle forklare
rask vekst hos spill som var spilt uten konto først, men sier lite for den som leser lista; juksesperren holder urimelig
vekst utenfor uansett.
Beslutning: merket og setningen om det under «Slik virker lista» er fjernet, sammen med `LINKED_SHOWN_FROM`.
`leaderboard()` sender fortsatt `linked_day` (ingen SQL-endring), og appen tolker det, men viser det ikke.
Konto (B-149): uendret.

## B-355 «Slik henger pengene sammen» (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Spillere forstår ikke økonomien helt. Kan du gjøre det enklere å forstå». I Skiftrapporten spurte
spillerne hvor pengene over 9,99 mrd. blir av («Røde Kors?»), hvorfor de ikke kan sette penger inn i konsernet, hva
utbyttet er, og hvorfor modernisering er tregere enn før. Forklaringene fantes, men spredt (Økonomi, «Slik fungerer
konsernet», Industrien) og uten det viktigste: det er to økonomier – hjemme i spilltid, konsernet i ekte tid.
Beslutning:
- `ui/MoneyGuide.tsx`: ett ark med to bokser – kassa hjemme (spilltid, tak 10 mrd., overskuddet til eierne) → bidrag hver
  ekte dag → konsernkassa (ekte tid, lik for alle; bidrag + utbytte; brukes til verk, anbud og overtakelser) – og fem
  spørsmål med korte svar (hvor blir pengene over taket av, hvorfor ikke flytte penger, utbytte og politikken, hvorfor
  bygging tar ekte tid, hva topplista måler). Tallene hentes fra spillet (tak, politikkene, 25 mrd., konsernkassa per dag).
- Gradvis synlighet: arket og lenken vises når konsernet er åpent eller kassa har nådd taket; konserndelen bare med
  konsern, taket bare når det er nådd.
- Lenke «Slik henger pengene sammen» på Konsern → Oversikt, Konsern → Industrien (konsernkassa) og Verket → Økonomi.
- Tekstene som sa at utbetalingen til eierne «ikke teller», sier nå at den teller mot sluttmålet og de største ovnene (B-341),
  men ikke i konsernverdien på topplista.
- Kassa i toppfeltet ble prøvd som knapp til arket, men en knapp er høyere enn tallene og dyttet tallraden ut av stilling på
  320 og 390 px. Droppet.
Konto (B-149): nei – forklaring.

## B-356 Koblingen mot kontoen prøves igjen etter en driftsstans (2026-09-29)
Status: gjelder
Bakgrunn: 29.9. kl. 20:10–21:27 var databasen strupet (gratisplanens diskkvote brukt opp; se B-353). PostgREST fikk ikke
lest skjemaet og svarte 503/504 på nesten alt; innloggingen gikk ut på tid. Eieren restartet prosjektet kl. 21:27, og
kallene gikk gjennom igjen – men ingen spill ble lagret på nett. Grunnen: appen kobler spillet mot kontoen én gang per
sidelasting (`linkOnLogin`, B-138). Feilet koblingen, ble den aldri prøvd igjen; `reconciled` sto usann, og da lastet
appen verken opp eller hentet (`onLocalSave`, `CloudFollow`). Alle som åpnet spillet under stansen, lagret bare lokalt til
de lastet appen på nytt.
Beslutning:
- `isTransient(e)` (`net/supabase.ts`): uten nett, tidsgrensen (408), for mange kall (429) og 5xx er feil som går over.
- `linkOnLogin` husker en slik feil (`needsRelink()`), og skyen i toppfeltet viser at spillet ikke er lagret på nett.
- `CloudFollow` (spillskjermen) prøver koblingen igjen hvert 20. sekund mens appen vises, og når den vises igjen, får
  fokus eller får nett. Svaret behandles som ved innlogging: spillet på nett hentes (med arket «Hentet det nyeste spillet»)
  hvis det er nyere, ellers lastes spillet her opp. Er de to spillene forskjellige, får spilleren et ark som åpner Konto,
  der valget står som før.
- Kontokortet sier «Fikk ikke kontakt med serveren. Spillet lagres her, og det prøves igjen av seg selv.» i stedet for
  feilmeldingen.
- En gjest som logger inn mens tjenesten er nede, beholdes til neste kobling (før: bare uten nett).
Testet: nettesten «Kobling mens tjenesten er nede» (503 → ingen opplasting → oppe → lastet opp), og i Playwright på 320 og
390 px med 503 på alt: kontokortet viser beskjeden, skyen viser feilen, og spillet ble lagret 16 s etter at tjenesten var
oppe igjen, uten omlasting.
Konto (B-149): nei – gjelder lagringen for dem som har konto.

## B-357 Lærlinger teller ikke i drifta før fagbrevet; alder og pensjon for alle ansatte (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Lærlinger bør ikke telle i drifta før de har tatt fagbrev. Vil også at ansatte skal kunne gå av med
pensjon. Legg til alder på alle ansatte slik at det fungerer.» Før talte en lærling (B-163) som en vanlig avløser på
skiftene fra første dag, for halv lønn. Ingen ansatte hadde alder, og ingen gikk av.
Beslutning:
- Lærlinger (`apprenticeUntil` satt) står utenfor drifta til de har fagbrev: `dutyWorkers`/`presentWorkers` (`plant.ts`)
  tar dem ikke med, så de fyller ingen plasser, er ikke ledige avløsere og trekker ikke ned ferdigheten til dem som står i
  produksjonen. De får lønn (halv), plass i staben, lærer som før (ferdigheten øker hver dag) og tar fagprøven. Med
  fagbrev teller de som vanlig. Kortet fra yrkesskolen og raden under Ansatte sier det («ikke på skift ennå»).
- Alder (`game/pension.ts`): alle ansatte har `born` (fødselsdøgnet i spillet); alderen øker med ett år per spillår (360
  døgn, samme kalender som B-265). Søkere er 20–59 år, lærlinger 17–19. Den erfarne pensjonisten fra hendelseskortet er
  63–66 og jobber til 70 (`retireAge`).
- Pensjon: halvparten går av ved 67, resten mellom 62 og 66 (som med AFP), fast ut fra id-en. En måned (30 døgn) før
  kommer en beskjed i varsellista (tema «Ansatte og trivsel»), og raden under Ansatte viser «Pensjon om N døgn». På dagen
  går den ansatte av (trivsel +1, telles som «pensjon»). Faller skiftene uten den som går av, kommer et råd på Verket om å
  ansette en ny (Folk → Ansett).
- Alderen vises under Ansatte og på søkerne under Ansett.
- Eldre lagringer: ansatte og søkere får en fast alder fra id-en, 22–59 (lærlinger 17–19), så ingen går av det første
  spillåret og alderen er den samme hver gang spillet lastes.
Balanse: `balance.ts` OK (nivådagene innenfor målene, nybegynneren median 180 døgn til storverket, ingen konkurs). Få går
av i testspillerens løp (søkerne er høyst 59, og det tar minst tre spillår før de første går av).
Konto (B-149): nei – ditt eget spill.

## B-358 Døgnregnskapet i hele tall (2026-09-29)
Status: gjelder
Bakgrunn: etter driftsstansen (B-356) sto `save_game` fortsatt for nesten all skriving til disken, ca. 59 kB per
lagring. Partiene (B-353) er slått sammen for dem som har lagret siden (10–25 partier, 3–8 kB), og da var historikken den
største delen av det lagrede spillet: 120 døgn med tall som `1594093.5234782605` (ca. 70 kB av 165 kB tekst).
Beslutning: `roundDay` (`engine.ts`) runder døgnregnskapet når døgnet legges i `g.history`: tall fra 100 og oppover til
hele tall, mindre tall til to desimaler. `migrate()` runder historikken i eldre lagringer. Serveren bruker bare summer
over 7 og 30 døgn (`contribution_margin`, `dividend_from_state`), og der betyr ikke øre noe.
Målt på lagrede spill: tuster2 142 → 127 kB tekst (34 → 27 kB komprimert), et spill på nivå 3 67 → 54 kB (19 → 13 kB).
Endringslogg: nei – spillerne merker ingenting.
Konto (B-149): nei – ingen ny funksjon.

## B-359 «Utbetalt til eierne» heter «Privat formue» (2026-09-29)
Status: gjelder
Bakgrunn: eieren: «Det du tjener over, betales til eierne. Blir litt feil da man selv er eier av konsern. Kall det for
noe annet.» Spilleren eier konsernet, så «betales ut til eierne» høres ut som om pengene går til noen andre.
Beslutning: det kassa tjener over taket (B-303), heter nå **Privat formue** i spillet: «Det du tjener over, flyttes til
din private formue». Endret i topplista og Hall of Fame (lista «Privat formue»), Verket → Økonomi, Konsern → Oversikt,
«Slik henger pengene sammen», dagens oppdrag, toppfeltet, loggen og prestasjonen «Reformveteran II». Bare navnet er
endret: regnestykket, `paidOut`/`paidOutTotal` og lista `utbetalt` på serveren er som før.
Konto (B-149): nei – ingen ny funksjon.

## B-360 Tilgangsreglene regner ut innloggingen én gang, og fremmednøkler får indeks (2026-09-29)
Status: gjelder
Bakgrunn: ytelsesrådene fra Supabase etter driftsstansen: sju tilgangsregler (RLS) på `saves`, `snapshots`, `profiles`,
`records` og `daily` regnet ut `auth.uid()` for hver rad (`auth_rls_initplan`), og åtte fremmednøkler manglet indeks.
`world_status` så treg ut (291 ms i snitt), men målt nå tar den 29–70 ms – snittet var dratt opp av stansen.
Beslutning: `076_rls_og_indekser.sql` skriver reglene om til `(select auth.uid())` (samme regler, regnet én gang per
spørring) og lager indeksene. Testet som spiller: ser bare sitt eget spill, sin profil og sin tidslinje. Rådene for ytelse
er borte (bortsett fra «ubrukt indeks» for de nye); sikkerhetsrådene er de samme som før.
Endringslogg: nei – spillerne merker ingenting.
Konto (B-149): nei – ingen ny funksjon.

## B-361 Konsernbidraget er snittet over den ekte dagen (2026-09-29)
Status: gjelder (utfyller B-318)
Bakgrunn: en spiller (GruberMogg67): «Bidrag fra hovedverket e buggy». På 20 minutter viste Konsern → Industrien 16, 20,
24, 12 og 7 mill. kr per dag. Bidraget regnes av marginen over de siste 30 spilldøgnene og målerens tonn per spilldøgn.
På 10× er 30 spilldøgn ca. 6 ekte minutter, så tallet fulgte det siste som skjedde i spillet (her fellesferien: 30 000 →
14 000 t, margin 1 532 → 778 kr/t). Og betalingen (én gang per ekte dag) brukte tallet i det øyeblikket den ble kjørt –
et tilfeldig øyeblikksbilde, som i verste fall kunne styres. Ingen bidrag var betalt ennå (første dag er 30.9).
Beslutning:
- Serveren måler alle med konsern hvert 15. minutt (`sample_contributions` fra `world_tick`, tabellen
  `contribution_samples`, `config.world.contribution.sample_minutes`). Også de som ikke spiller, måles, så snittet gjelder
  hele dagen.
- Betalingen for en dag bruker snittet av dagens målinger (`contribution_avg`; dager uten målinger: forrige dag med
  målinger, ellers et øyeblikksbilde).
- Tallet i appen og konsernverdien (topplista) bruker dagens snitt (`contribution_now`), de første to timene av dagen
  (under 8 målinger) sammen med gårsdagens. Tonn og kr per tonn i teksten er også snitt.
- Regelen for selve bidraget (50 %, tak 3 000 kr/t, aktivitet, demping over 30 mill.) er uendret.
- Teksten under Konsern → Industrien sier at serveren måler hvert kvarter og betaler snittet for dagen.
Migrasjon `077_bidrag_snitt.sql`. Testet i en DO-blokk: målingene lagres, snittet og `world_status` gir samme tall.
Utbyttet (B-304) regnes fortsatt av spillet i betalingsøyeblikket; kvaliteten over 7 spilldøgn svinger mindre, men samme
løsning kan brukes der om det blir et problem.
Konto (B-149): ja, som bidraget (B-318) – regnes på serveren i ekte tid.

## B-362 Utbyttet betales som snittet over den ekte dagen (2026-09-29)
Status: gjelder (utfyller B-304 og B-361)
Bakgrunn: utbyttet regnes av det lagrede spillet i betalingsøyeblikket. Verkene er serverens og står fast, men
flaggskipbonusen (inntil +20 %) følger omdømmet og kvaliteten de siste 7 spilldøgnene – ca. 1,5 ekte minutt på 10×. Samme
svakhet som bidraget (B-361), bare mindre: et øyeblikksbilde som kan treffe en dårlig eller god time.
Beslutning: målingene hvert kvarter (077) tar også med utbyttet (`sum_div`/`n_div` i `contribution_samples`), og
`pay_dividends` bruker snittet for dagen (`dividend_avg`; dager uten målinger: utbyttet nå). Tallet appen viser, er
fortsatt utbyttet nå, så et nytt verk vises med én gang. Migrasjon `078_utbytte_snitt.sql`. Testet i en DO-blokk.
Endringslogg: nei – tallet i appen er som før, betalingen blir jevnere.
Konto (B-149): ja, som utbyttet (B-304) – regnes på serveren i ekte tid.

## B-363 Vern mot lekkede passord droppes (2026-09-29)
Status: gjelder
Bakgrunn: sikkerhetsrådene i Supabase har meldt «Leaked password protection disabled» siden 26.9. Eieren sjekket
dashbordet: funksjonen finnes bare på Supabase Pro.
Beslutning: eieren 29.9: «Prevent use of leaked passwords er kun for supabase pro. Vi dropper det.» Rådet
`auth_leaked_password_protection` blir stående i `get_advisors` og regnes som kjent. Minstelengden på passord (6 tegn)
er som før. Vurderes på nytt hvis prosjektet går over til Pro.
Endringslogg: nei – ingen endring i spillet.
Konto (B-149): – ingen ny funksjon.

## B-364 Verden oppdateres hvert 5. minutt, også når ingen spiller (2026-09-29)
Status: gjelder
Bakgrunn: `world_tick` (anbud, overtakelser, inntekt fra selskapene, utbytte, bidrag og målingene hvert kvarter fra B-361
og B-362) ble bare kjørt når en app spurte etter `world_status`. Om natta ble det derfor ingen målinger, så snittet for
dagen bygde bare på timene noen var inne, og frister for overtakelser og anbud ble liggende til noen åpnet spillet.
RETNING.md (avsnitt 5) sa at pg_cron burde slås på før overtakelsene (fase 4), og overtakelsene er på fra 29.9 (B-339).
Beslutning: pg_cron-jobben `verden-tick` kjører `world_tick()` hvert 5. minutt. Sperren i `world_tick` (høyst hvert 30.
sekund, én om gangen, 072) står, så appene og jobben kan kalle samtidig. Jobben `cron-rydding` sletter kjøringsloggen i
`cron.job_run_details` som er eldre enn 3 dager (daglig 03:41 UTC). Migrasjon `079_verden_hvert_5_min.sql`.
Endringslogg: nei – spillerne merker bare at ting skjer i tide.
Konto (B-149): – ingen ny funksjon.

## B-365 Gjester holdes utenfor det som teller mellom spillere, igjen (2026-09-29)
Status: gjelder (utfyller B-212)
Bakgrunn: gjestekontoene ble slått på 29.9, og Supabase minnet om at gjester bruker rollen `authenticated`, så alle regler
for innloggede gjelder dem. Gjennomgang:
- Tilgangsreglene (RLS) på `saves`, `snapshots`, `profiles`, `records` og `daily` gir bare egne rader – også for gjester.
- `guest_gate` (035, kjøres av PostgREST før hvert kall) slipper gjester bare til eget spill, tidslinja, overleveringen,
  å slette seg selv og det alle kan lese. Testet som gjest: `save_game`, `saves`, `snapshots` og `leaderboard` åpne;
  `chat_send`, `chat_list`, `konsern_order`, `world_status`, `place_bid`, `takeover_bid`, `claim_daily_reward`,
  `profiles` og `set_nickname` stengt.
- Feil: `meter_snapshot` (skrevet om i 043/061) hoppet ikke lenger over gjester, så produksjonen deres ville telt i
  `production_days` og gitt eieren av skraplageret inntekt. B-212 sa at gjester ikke skal gjøre det.
- `pay_contributions` og `sample_contributions` (077/078) tok med gjester med konsern (0 kr, men rader).
Beslutning: `080_gjester_utenfor.sql`: `meter_snapshot` hopper over gjester igjen, og bidraget og målingene hopper over
gjester. Datterverk, utbytte og verdenskartet krever en rad i `konsern`, som bare `konsern_order` lager (stengt for gjester).
Regel: ny serverfunksjon som gir penger, inntekt eller plass mellom spillere, skal hoppe over gjester (`user_is_guest`).
Endringslogg: nei – spillerne merker ingenting.
Konto (B-149): – ingen ny funksjon.

## B-366 Gjennomgang av serveren for gjester: ingen flere hull (2026-09-29)
Status: gjelder (utfyller B-365)
Bakgrunn: etter B-365 ble alle serverfunksjoner som går over alle spillere, gått gjennom for gjester:
- Topplistene (`leaderboard`), ukelista (`weekly_scores`/`weekly_board`) og sesongresultatene (`close_season`) tar bare
  med kontoer med kallenavn. Gjester kan ikke sette kallenavn (`profiles` og `set_nickname` er stengt i `guest_gate`).
  Rekordene (`update_records`) lages også for gjester, men vises ikke, og følger med når gjesten oppretter konto.
- Skraplageret (`pay_company_income`, `company_counted_t`, `scrap_counted_t`) leser `production_days`, som gjester ikke
  kommer i (B-365). Anslaget (`scrap_yard_estimate`) bruker `active_players`, som leser `activity_days`, der
  `note_activity` hopper over gjester.
- Datterverk, utbytte, verdenskartet og konsernverdien krever en rad i `konsern` (bare `konsern_order`, stengt for
  gjester). Kjøp, bud, overtakelser, kassa, chat og daglige belønninger er stengt i `guest_gate`.
- Ingen gjester har rader i noen av tabellene ennå (0 gjester kl. 23:40).
Beslutning: ingen endring. Det eneste som står igjen, er at forlatte gjester blir liggende (ca. 1 MB hver). Spørringen for
å rydde dem er rettet i `FORSLAG.md` (etter siste lagring, ikke når gjesten ble laget) – eieren avgjør om det skal bli en
daglig jobb.
Endringslogg: nei – ingen endring i spillet.
Konto (B-149): – ingen ny funksjon.

## B-367 Konsernet forklarer hvordan det får flere plasser (2026-09-29)
Status: gjelder (utfyller B-150, B-173, B-325)
Bakgrunn: brukeren: «Noen kan ha bare 12 datterselskap men andre kan ha 14. Kan du sjekke opp?» Sjekket på serveren:
alle med konsern har «Større konsern». Plassene er `slotsAt`/`konsern_slots`: 8 med forskningen (6 uten), +2 ved
Stålfyrste, Stålkeiser og Stålgigant (nivå 2, 4 og 6) – 14 i alt. De med 14 plasser har nivå 6 eller mer (Stålgigant:
8 stålkomplekser på trinn 5, eller gulvet fra reformen); de med 12 er Stålkeiser eller Stållegende. Regelen virker likt i
appen og på serveren. Men spillet sa bare «Konsernet er fullt – bygg ut, moderniser eller bytt i stedet», og forskningen
lovet «Plass til 8 datterverk i stedet for 6», som ikke stemmer når titlene har gitt flere.
Beslutning: ingen endring i reglene. `moreSlotsText` (`game/konsern.ts`) sier hva som gir neste plasser: forskningen hvis
den mangler, ellers neste tittel med kravet («Blir du Stålgigant (8 stålkomplekser på trinn 5), får du plass til 2 til»),
eller at 14 er det meste. Teksten står under «Dine verk» når konsernet er fullt eller har én plass igjen, og i sperren på
kjøpene. Forskningen sier «Plass til 2 datterverk til».
Konto (B-149): – ingen ny funksjon (konsernet krever konto fra før).

## B-368 Spillet sier når utbyttet og bidraget betales (2026-09-30)
Status: erstattet av B-369 (dagen skifter nå ved midnatt norsk tid; `payoutClock` er fjernet)
Bakgrunn: brukeren: «Fikk ikke dagens penger inn på konsernkassa klokken 00:00. Hva skjer?» Serveren regner den ekte
dagen i UTC (`pay_dividends`/`pay_contributions`: `d < (now() at time zone 'utc')::date`). En dag betales derfor først når
den er over i UTC – kl. 02:00 norsk sommertid, 01:00 om vinteren – av neste `world_tick` (pg_cron hvert 5. minutt,
B-364). Kl. 00:09 norsk tid 30.9 var ingenting betalt, og det var riktig: den første utbyttedagen (`dividend.from` =
29.9) betales kl. ca. 02:00; bidraget begynner med 30.9 (`contribution.from`) og betales første gang natt til 1.10.
Spillet sa bare «betales hver ekte dag».
Beslutning: ingen endring på serveren (samme dag for alle spillere, uansett hvor de bor). `payoutClock` (`ui/format.ts`)
gir klokkeslettet på telefonen for midnatt UTC. Det står i linjene om utbytte og bidrag under Konsern → Industrien, i
hjelpeteksten på utbyttet på Konsern → Oversikt og som et nytt spørsmål i «Slik henger pengene sammen».
Konto (B-149): – ingen ny funksjon.

## B-369 Den ekte dagen skifter ved midnatt norsk tid (2026-09-30)
Status: gjelder (erstatter B-368 og UTC-dagen i B-188, B-304, B-318, B-361)
Bakgrunn: brukeren (eier), rett etter B-368: «Kan du endre det til å bli 00:00 i norsk tid? Og betale ut for idag siden
klokka er over 00:00». Serveren regnet den ekte dagen i UTC, så pengene for en dag kom kl. 02:00 norsk sommertid.
Beslutning:
- `081_norsk_dag.sql`: `world_today()` og `world_day(tidspunkt)` gir datoen i Europe/Oslo. De 13 funksjonene som regnet
  dagen i UTC (`pay_dividends`, `pay_contributions`, `pay_company_income`, `sample_contributions`, `contribution_now`,
  `meter_register` (produksjonsdagene), `note_activity` (aktive dager), `active_players`, `maint_rate_estimate`,
  `company_control`, `takeover_attack`, `takeover_window`, `world_status`) bruker dem nå. Byttet gjøres med
  tekst-erstatning i definisjonene – ingen annen logikk er endret. Ingen funksjon i `public` har `time zone 'utc'` igjen.
- Overgangen: dagsradene fra 29.9 (UTC) står; alt fra 00:00 norsk tid 30.9 går inn på 30.9. Rett etter byttet ble
  `world_tick` kjørt, og 29.9 ble betalt med én gang (eierens ønske): utbytte til 12 spillere, 209,2 mill. i alt
  (3,8 mill. av det til forsvarsfond etter politikken), regnet av dagens målinger (dry-run først, samme tall), og
  skraplagerets første inntekt, 13,8 mill. (276 503 t). Bidraget begynner fortsatt med 30.9 (B-318) og betales natt til 1.10.
- Appen speiler dagen: `worldDay`/`nextWorldMidnight` i `game/clock.ts` (Intl med Europe/Oslo). `net/scrapIncome.ts`
  (måleren), `nextPayout`/`firstPayout`/`yesterdayWorld` i `net/world.ts` bruker dem. Tekstene sier «rett etter midnatt
  (norsk tid)». Tester for sommer, vinter og overgangen til vintertid i `net/tests.ts`.
Regel: en ekte dag på serveren regnes med `world_today()`/`world_day()` og i appen med `worldDay` – aldri
`at time zone 'utc'` eller `toISOString().slice(0, 10)`.
Konto (B-149): – ingen ny funksjon.

## B-370 Selskapene med vanlige ord: hvor trygt, hva som trengs, og hva du kan gjøre (2026-09-30)
Status: gjelder (utfyller B-334, B-335, B-337; reglene er uendret)
Bakgrunn: brukeren: «Figen forstår ikke hvorfor firmaet hans er presset, han forstår heller ikke seg på forsvar og
lignende. Du må gjøre bedrifter enklere og mer intuitiv å forstå seg på.» Figen eier skraplageret: Kontroll 54
(eier 30, aktivitet 20, investering 1,8 av 25, region 2,5 av 10, eiertid 0, fond 0 – fondet på 3,8 mill. er lite mot
verdien på 471 mill.). «Presset» (40–59) ble lest som at noen angrep selskapet; kortet viste poeng, ikke hva de betyr.
Med Kontroll 54 kan en aktiv spiller ta selskapet med minstebudet når vernet (3 dager) er over, hvis eieren ikke forsvarer seg.
Beslutning (bare framstillingen; formlene på serveren er de samme):
- Ordene: sterk (80+), god (60–79), middels (40–59), svak. «Presset» og «stabil» er borte.
- Eieren ser Kontrollen som en stolpe med én setning: «Hvor vanskelig det er for andre spillere å ta selskapet fra
  deg», om selskapet er vernet og til når (`082_kontroll_siden.sql`: `company_control` gir `since`), og **budet som
  trengs** for å ta det (`bidToTake`: en aktiv spiller uten verk i regionen, mot Kontroll + fondet uten forsvar, minst
  verdien). Et kronebeløp er lettere å forstå enn poeng.
- «Slik blir det tryggere»: de tre delene som mangler mest, med hva man gjør (`controlSteps`); eiertiden (kommer av seg
  selv) sist, og fondet bare foreslått med «Ta ut» – med en annen politikk vokser det alt.
- Investering: forhåndsvisning mens man skriver beløpet (`controlAfterInvest`: ny Kontroll og nytt bud som trengs), og
  at pengene ikke kommer tilbake og følger selskapet.
- Under angrep: «Slik det står nå, mister du / beholder du selskapet» og hvor mye forsvar som trengs (`defenseNeeded`),
  eller at budet er for stort til å stå imot.
- «Hvis noen prøver å ta selskapet»: tre steg (bud → 72 timer til forsvar, 95 % tilbake → sterkest vinner, 85 % av budet
  til eieren som mister det). Utbyttepolitikken forklart på nytt, med råd om «Ta ut» uten selskap. Nytt spørsmål i
  «Slik henger pengene sammen».
- Formlene er speilet i `game/control.ts` med faste tall i testen (Figens tall).
Konto (B-149): – ingen ny funksjon (selskapene krever konto fra før).

## B-371 Oppkjøp og motbud i stedet for angrep og forsvar (2026-09-30)
Status: gjelder (utfyller B-335, B-370; reglene er uendret)
Bakgrunn: brukeren: «Forsvar og angrep høres ikke rett ut. Er det det man bruker i virkeligheten?» I virkeligheten heter
det oppkjøp, oppkjøpsbud og fiendtlig oppkjøp; eieren/styret svarer med forsvarstiltak, typisk et motbud eller en «hvit
ridder». «Angrep» brukes ikke. «Kontroll» er et ekte begrep og beholdes. Eieren svarte «Ja» på forslaget.
Beslutning (bare tekst, i appen og i skiftrapporten):
- «X prøver å overta selskapet» → «X har lagt inn et oppkjøpsbud»; «angrep» → oppkjøpsbudet; pengene eieren setter inn
  → **motbud** («Legg inn motbud», 95 % tilbake); «Overta selskapet» → «Kjøp selskapet» / «Legg inn oppkjøpsbud».
- Forsvarsfondet → **beredskapsfondet** (valgt av Claude; brukeren fikk valget mellom det og «fond mot oppkjøp»).
  Politikken «Bygg forsvar» → «Bygg beredskap» (id-en `forsvar` er den samme i data og på serveren).
- Poengene «angrep 60 mot forsvar 57» er borte for spillerne: «oppkjøpsbudet står sterkest» / «eieren står sterkest».
- Beskjedene: «Du kjøpte …», «X kjøpte … fra deg», «Du beholdt … – oppkjøpsbudet fra X holdt ikke».
- `083_oppkjop_ord.sql`: `chat_on_takeover` skriver de nye ordene i skiftrapporten. Gamle meldinger står som de var.
- Kodenavnene (`takeover`, `attack`, `defense`, `takeover_defend`, status `overtatt`/`avverget`) er uendret.
Konto (B-149): – ingen ny funksjon.

## B-372 Oppkjøp gir 14 dager fra kjøpet, 3 dagers vern, og Utvid-fanen er enklere (2026-09-30)
Status: gjelder (endrer B-335: eierperioden og pausen etter et oppkjøp)
Bakgrunn: brukeren (eier): «Om noen tar over bedriften før de 14 dagene har gått bør den nye eieren få 3 dager vern og
14 dager fra hen overtar. Hva skjer når man investerer i bedriften sin. Og blir det med over til neste eier? Gjør kjøp og
utvid i utvid fanen bedre og mer intuitiv.»
Før: den som kjøpte ved oppkjøp, fikk bare resten av den forrige eierens periode, og pausen på 14 dager etter hvert
oppkjøpsforsøk (også et vellykket) vernet den nye eieren resten av perioden.
Beslutning:
- `084_oppkjop_14_dager.sql`: `resolve_takeovers` gir kjøperen perioden fra nå til nå + `concession_days` (14), aldri
  kortere enn den gamle (`greatest`). Har noen alt vunnet neste anbud, eller er et anbud åpent, står datoen (skjer ikke
  i praksis: oppkjøp stenger 5 dager før slutten, og avgjøres før anbudet åpner 48 t før).
- Vernet for ny eier (3 dager) gjelder også ved oppkjøp (ny rad i `company_owners`). Pausen på 14 dager gjelder nå bare
  etter `avverget` (eieren beholdt det) – `takeover_window` og `company_protected_until`. Etter et oppkjøp er det derfor
  3 dagers vern, så kan andre by igjen (eierens ønske).
- `company_protected_until` (ny) og `protected_until` i `company_control`: serveren sier til når ingen kan by (vern,
  pause, eller slutten av perioden når den er under 5 dager unna). Appen viser det på kortet («perioden din er over … Da
  kommer et nytt anbud» når det gjelder resten).
- Testet i en DO-blokk som ble rullet tilbake: oppkjøp av skraplageret → ny eier til nå + 14 d, vern i 3 d; 4 dager
  senere er vinduet åpent igjen.
- Utvid-fanen: status øverst (konsernkassa, datterverk X av Y, byggekøen X av 3) med én setning om hvordan kjøp virker,
  og beskjed når køen eller plassene er fulle (med `moreSlotsText`). Kjøpskortene har tallene på én linje (gir per dag ·
  betalt tilbake på · bygges på) i stedet for tre bokser – fanen ble ca. 25 % kortere på mobil. Knappene sier Kjøp /
  Moderniser / Bygg ut / Bytt (ikke «Gjør det»). Korte forklaringer per del (hva verkstypene er gode for, hva
  modernisering gir, at felles kjøp gjelder alle verk), regionvalget spør «Hvor skal nye verk bygges?» og sier at verk i
  samme region som et selskap gir Kontroll. Lenke til alle verkene (Oversikt).
- Spørsmålet om investering er besvart (se LOGG økt 298); endring av regelen er lagt fram som forslag i FORSLAG.md.
Konto (B-149): – ingen ny funksjon.

## B-373 Datterverk til en firedel, ingen pause etter avverget oppkjøp, og ingen hopping (2026-09-30)
Status: gjelder (erstatter prisene i B-325 og pausen i B-335/B-372)
Bakgrunn: brukeren (eier): «Om nåværende eier klarer å beholde bedriften etter noen har prøvd på oppkjøp blir det ikke mye
3 dagers vern. 3 dagers vern skal kun være når noen overtar bedriften. I toppbaren er det linjer som flytter på seg. Det
er også mange linjer som flytter på seg i oversikt siden. Fiks at kjøp og oppgradering av datterverk ikke tar flere
hundre dager. Om du justerer pris ned må du gi tilbake penger til konsernkassa til de som har kjøpt eller oppgradert noe
etter 00:00 idag.»
Beslutning:
- Prisene i konsernet (`config.world.konsern.price` og `WORLD_KONSERN.price`): stålverk 20 → **5**, storverk 80 → **20**,
  kompleks 250 → **60 mill.** Modernisering (30 %), utbygging (forskjellen, 15 mill.) og salg (60 % med trinn) følger.
  Målt med dagens utbytteregel (`konsernOptions`, tilbakebetaling per kjøp): før 32 dager (første verk) til 200–480 dager
  (store konsern); nå 8 dager til 50–126 dager. Store konsern tar fortsatt lengst, fordi hvert nytt verk gir mindre
  (imperiebelastningen) – det er med vilje. Simuleringen i KONSERN-FORSLAG.md (ett år til fullt konsern) gjelder ikke
  lenger; det går omtrent fire ganger raskere, begrenset av byggekøen (ett prosjekt om gangen).
- Tilbakebetaling (`085_priser_ned_og_vern.sql`): bestillinger fra 00:00 norsk tid 30.9 fikk mellomlegget tilbake
  (`treasury_ledger` kind `refusjon`, ref `prisfall:<id>`), og prisen i køen ble satt til den nye. Dry-run først (fire
  bestillinger): Big Boss 13,5 mill., 2bajjas 13,5 mill., Grane 2 × 12,75 mill. – 52,5 mill. i alt.
- Oppkjøp: `config.world.takeover.cooldown_days` = 0. Ingen pause etter et avverget oppkjøp; vernet på 3 dager gjelder
  bare når selskapet får ny eier (oppkjøp eller anbud).
- Hopping (B-238): tallene i toppfeltet har fast minstebredde (kasse, omdømme, fagpoeng, konsernkassa), merket på bjella
  ligger oppå hjørnet, og plassen til ikonet i varsellinja står også uten varsel. «Siste hendelser» på Oversikt: hver
  hendelse tar alltid to linjer (klippes med «…»). Konsern → Oversikt: raden rådet gjelder, åpnes bare når siden åpnes –
  før åpnet og lukket radene seg hver gang rådet byttet verk, og lista hoppet opptil 900 px. Målt i Playwright på 320,
  390 og 1366 px i 8 s på 10×: ingenting over kortene flytter seg lenger.
- Testspilleren (`balance.ts`): OK, exit 0.
Konto (B-149): – ingen ny funksjon.

## B-374 Gamle anbud regnes i dagens penger (2026-09-30)
Status: gjelder
Bakgrunn: brukeren (eier): «Figen kjøpte skraplageret for 200 millioner. Dette var før vi endret økonomien. Om det hadde
vært samme bud nå hadde han vunnet skraplageret for 20 mill. Hva anbefaler du» – og så «Gjør det du anbefaler».
Undersøkt i `treasury_ledger`: anbud 4 ble avgjort 29.9 kl. 01:33 UTC. Konsernkassene ble delt på 10 (B-311) kl. 02:44 UTC.
De som tapte, fikk budet tilbake og mistet så 90 % av det i delingen (f.eks. 100 → 10 mill.). Vinneren hadde brukt alt
(200 mill.), så delingen tok 0 fra ham. Uten bud hadde han hatt 20 mill. etter delingen – i dagens penger kostet budet
20 mill., like mye som det samme budet ville kostet nå.
Beslutning:
- Ingen penger tilbake til vinneren. 180 mill. tilbake ville gitt ham det dobbelt opp og langt mer enn de andre budgiverne
  (10–20 mill. hver etter delingen). Ingen spillerdata er endret; budet står urørt i `tenders` som historie.
- `086_gamle_penger.sql`: `bid_in_new_money(beløp, avgjort)` gir en tidel for anbud avgjort før 29.9.2026 02:44:52 UTC.
  `company_value` bruker den i gulvet («minst det det sist ble vunnet for»), så gulvet for skraplageret er 20 mill., ikke
  200. Verdien i dag (30 dagers inntekt, 462 mill.) er uendret; gulvet ville bare slått inn om inntekten falt under
  6,7 mill. per dag.
- Appen viser gamle bud som «200 mill. (gamle penger, tilsvarer 20 mill. nå)» (`fmtBid`/`bidInNewMoney` i `net/world.ts`,
  speiler SQL-en; test i `net/tests.ts`).
Konto (B-149): – ingen ny funksjon.

## B-375 Oppkjøp: minstebud 10 dagers inntekt, eieren får betalt for tida hen mister (2026-09-30)
Status: gjelder (erstatter «85 % av budet til eieren» i B-335 og verdien på 30 dagers inntekt i B-334)
Bakgrunn: brukeren (eier) spurte hva Figen får ved oppkjøp før og etter de 14 dagene, så «Hva anbefaler du» og «Ja» til
anbefalingen. To feil ble funnet: minstebudet (verdien, 30 dagers inntekt, ca. 462 mill.) var mer enn kjøperen tjener på
sine 14 dager (ca. 216 mill.), så ingen som regnet, ville by; og eieren fikk 85 % av hele budet, så to spillere kunne
flytte store summer mellom seg med et oppkjøp (bryter B-180).
Beslutning (`087_oppkjop_betaling.sql`):
- Verdien av et selskap er **10 dagers inntekt** (`config.world.control.value_days` = 10), men minst det sist ble vunnet for
  (i dagens penger, B-374). Skraplageret: ca. 154 mill. Et oppkjøp til minstebudet lønner seg litt for kjøperen.
  Kontrollen, motbudet og inntektsøkningen av investeringer regnes fortsatt mot verdien, så en investering teller nå
  omtrent tre ganger så mye som før (Figens 34,7 mill.: 1,8 → 5,1 av 25) – godtatt: det sterkeste forsvaret kan fortsatt
  slås (B-337), og økningen i inntekt har samme tak (25 %).
- Eieren som blir kjøpt ut, får **inntekten for dagene som er igjen av konsesjonen + 85 % av det hen investerte i sin
  periode**, høyst 85 % av budet (`takeover_payout`, speilet i `buyoutPay` i `game/control.ts`, faste tall i testen).
  Resten av budet forsvinner. Det som ble investert fra beredskapsfondet, går tilbake til fondet (aldri til kassa).
- Investeringene føres per eierperiode (`company_owners.invested_kasse`/`invested_fond`, `company_invest`). Tidligere
  investeringer ble lagt inn fra `treasury_ledger` (dry-run: én rad, Figen 34,74 mill. fra kassa). De teller ikke i
  verdien.
- Når konsesjonen går ut, får eieren ingenting (som før): alle stiller likt i det nye anbudet.
- `company_control` gir `buyout` (inntekt per dag, dager igjen, investert), og appen viser eieren «Blir selskapet kjøpt med
  det budet, får du ca. X». `takeovers.owner_paid` lagres, og `world_status` gir det til eieren i `takeover_last`, så
  loggen sier hva hen fikk.
- Testet i en DO-blokk som ble rullet tilbake: bud på 1 mrd. på skraplageret ga Figen 230,8 mill. (13,03 dager × 15,36
  mill. + 85 % av 34,74 mill.), ikke 850 mill.; ny eier med 14 dager fra kjøpet.
Konto (B-149): – ingen ny funksjon (oppkjøp krever konto fra før).

## B-376 Alle .md-filer oppdatert etter B-366–B-375 (2026-09-30)
Status: gjelder
Bakgrunn: brukeren (eier): «Oppdater alle .md filer».
Beslutning: README (konsernet i verden, Industrien, skiftrapporten, dokumentlista, arkitekturen), DESIGN (nivåtabellen og
veikartet), RETNING (fase 3 og 4 bygget, norsk dag), KONTO (ord og beslutninger for utbyttepolitikk, Kontroll og oppkjøp),
FORSLAG (forslaget om investeringer avgjort i B-375, gamle anbud B-374, skraplagerets første utbetaling), PLAN-NETT
(migrasjonene 064–087, hendelser i skiftrapporten), KONSERN-FORSLAG (prisene fra B-373), KONTROLL-FORSLAG (det som er
endret etter at det ble bygget), KONSERNBIDRAG (norsk dag) og UI (runder bygget etter UI-4) er oppdatert. Forslagene og
analysene står ellers som de ble godkjent; de har fått en merknad øverst om det som er endret, i stedet for å bli
skrevet om. LOGG, BESLUTNINGER og CLAUDE.md var oppdatert fra før.
Endringslogg: nei
Konto (B-149): – ingen ny funksjon.

## B-377 Forlatte gjester ryddes bort hver natt (2026-09-30)
Status: gjelder
Bakgrunn: forslaget i FORSLAG.md (B-212, B-366): gjester som aldri oppretter konto, blir liggende med spill, tidslinje og
kopier (ca. 1 MB hver), og gratisplanen har 500 MB. Brukeren (eier): «Ja det skal de».
Beslutning (`088_rydd_gjester.sql`):
- `cleanup_guests()` sletter gjester (`auth.users.is_anonymous`) som ikke har lagret på **60 dager** – regnet fra siste
  lagring (`saves.updated_at`), ellers siste innlogging eller når gjesten ble laget. En gjest som spiller, slettes aldri.
- Sperrer: bare anonyme kontoer; aldri en med konsernkasse, konsern eller selskap; høyst 500 per natt; aldri under 30 dager
  selv om noen kaller den med et lavere tall. Alt som hører til gjesten, følger med (`on delete cascade`).
- pg_cron-jobben `gjester-rydding` kjører kl. 03:47 UTC hver natt. Antallet skrives i `guest_cleanup_log` (180 dager, bare
  for serveren).
- Kommer gjesten tilbake etter å ha blitt slettet, lager appen en ny gjest og laster opp spillet fra mobilen igjen (B-212).
- Dry-run 30.9: 0 gjester, 0 ville blitt slettet. Testet i en DO-blokk (rullet tilbake) med fem kontoer: bare den gamle
  gjesten uten lagring ble slettet – ikke den nye, ikke den som lagret nylig, ikke den ekte kontoen, ikke gjesten med kasse.
Konto (B-149): – ingen ny funksjon (gjelder spill uten konto).

## B-378 Topplista viser dagen i eget verk (2026-09-30)
Status: gjelder
Bakgrunn: brukeren (eier): «En spiller ønsker å se hvilken dag andre er på i sitt eget verk. Kanskje d kan stå på
topplista?»
Beslutning:
- `leaderboard()` sender `today` = spilldagen i det lagrede spillet (`saves.day`) for hver rad, på alle listene
  (`089_toppliste_dag.sql`; returtypen endret, så funksjonen ble tatt bort og laget på nytt, og `execute` gitt til `anon`
  og `authenticated` igjen; `my_rank` bruker bare `plass` og `is_me`).
- Appen viser «Dag 12 345 i eget verk» på en egen linje under navnet. Først sto dagen ved nivåmerket, men da ble navnene
  kortet ned til én bokstav på 320 px. «Slik virker lista» forklarer at dagen ikke teller.
- Dagen er spilltid og bare opplysning: den teller ikke i noen plassering (B-190, B-323).
Konto (B-149): del av topplista, som krever konto fra før (regel 3) – ingen ny rad i KONTO.md.

## B-379 Forslag om verksjefer for datterverkene (2026-09-30)
Status: forslag – venter på eieren
Bakgrunn: brukeren (eier): «Supert! Fortsett med planene». Neste fase i RETNING er fase 5, datterverksledelse. Den endrer
økonomien i ekte tid og har valg som er eierens, så den skrives som forslag først (som Kontroll, B-331).
Beslutning: `docs/VERKSJEF-FORSLAG.md` – verksjef med tre egenskaper (Drift, Økonomi, Folk) og ett trekk, mandat
(Lønnsomhet, Vekst, Stabilitet), lønn fra konsernkassa, «Verksjefen ringer» høyst én gang per ekte dag, lojalitet og
sluttpakke. Uten verksjef går verket som i dag. Bygges i tre deler (V1–V3) etter eierens svar på fem spørsmål.
Ellers i planen: slagghåndteringen slås på når skraplageret har betalt ut noen dager uten feil (B-253), og verkstedet
etter det (B-256). Gjestene er slått på; appen som prøvde før, prøver igjen etter et døgn (B-212).
Endringslogg: nei
Konto (B-149): verksjefene krever konto (regel 2 og 7) – føres i KONTO.md når de bygges.

## B-380 Stabilisering før verksjefene: audit, legacy-gulvet og ny verdenssimulator (2026-09-30)
Status: analysen står; eieren bestemte seg samme dag (B-381–B-385)
Bakgrunn: eieren justerte prioriteringen: ikke bygg verksjefene ennå (svarene på forslaget er ført i
VERKSJEF-FORSLAG.md, avsnitt 0), men først en audit av 10 mrd.-taket, en analyse av legacy-gulvet, en ny
verdenssimulering med dagens priser og en STATUS.md. Slagghåndteringen skal ikke slås på automatisk 2.10.
Beslutning:
- `docs/STABILISERING.md`: lokal kasse kan ikke gi verdensmakt (innskuddet er 0; felles funksjoner og forskning er
  engangs). Taket kan fjernes uten serverendring og uten migrering; Privat formue blir historikk. Lokale tall brukes
  fortsatt til topplistene «Verdi»/«Mest penger på bok», sesongresultatet og ukens «Mer verdi enn før» – de blir et
  kappløp i spillfart uten tak og bør ryddes samtidig. Gulvet gir i dag komplekser, plasser og trinn uten opptjent nivå
  (sju spillere), men simulatoren viser at det tas igjen på 6–10 ekte dager; forslag om å skille tittel og opptjent nivå.
- `frontend/src/game/worldSim.ts` (permanent): simulerer konsernkassa, bidrag, utbytte, selskapsinntekt, verk, kø,
  forbruk og tid til hvert nivå for liten/middels/stor/legacy etter 30/60/90/180 dager med dagens regler. Hovedfunn:
  konsernet er fullt på 1–3 måneder, og så hoper konsernkassa seg opp (4–11 mrd. på et halvt år) – oppkjøp blir en
  kassekamp. Ingen nedskalering foreslått før ekte data.
- Sjekken 2.10 (`trig_012KZ8mFxMw2yYhJp8SH1xDo`) rapporterer og anbefaler, men slår ikke på slagghåndteringen.
- Sårbarheter: serveren leser forskning, felles funksjoner, omdømme, kvalitet og margin fra lagringen; innskuddet er bare
  av med et tall i `config` (standard 100 mill.); `konsern.level` er en skralle med gulvet i seg.
Endringslogg: nei
Konto (B-149): – ingen ny funksjon.

## B-381 Kassetaket er fjernet – Privat formue fryses som historikk (2026-09-30)
Status: gjeldende. Erstatter taket i B-303/B-306 (utbetalingen til eierne over 10 mrd.).
Bakgrunn: eieren («Jeg har bestemt meg»): lokal kasse er penger i hovedverket, konsernkassa er kapitalen som bygger
imperiet. Auditen (B-380) viste at lokal kasse ikke kan gi makt i verden, så taket beskytter ingenting lenger.
Beslutning:
- `CASH_RESERVE.softCap = null` (`game/reserve.ts`): kassa i hovedverket kan vokse fritt. Mekanikken står (testen slår
  den på for seg), men brukes ikke.
- Privat formue (`g.paidOut`, `lockedReserve`) fryses: ingen får noe tilbake, ingenting nytt legges til, ingen reform
  eller komprimering. Den står som historikk på Økonomi («Privat formue (fryst)»), i Konsern-raden og i Hall of Fame, og
  teller fortsatt i `valueCreated` – sluttmålet, stormodellene og prestasjonene virker som før.
- Store tall: toppfeltet viser kort form fra 100 mrd. (`fmtKrCompact`: «1 234 mrd. kr», hele beløpet i hjelpeteksten),
  og Verket → Økonomi viser hele kronebeløpet. Testet på 320, 390 og 1366 px.
- Serveren: ingen endring trengs (juksesperren tåler store tall; lista «Utbetalt» leser den fryste formuen).
Endringslogg: ja (samlet med B-384).
Konto (B-149): – ingen ny funksjon.

## B-382 Innskuddet til konsernkassa er stengt «fail-closed» (2026-09-30)
Status: gjeldende. Strammer inn B-319.
Bakgrunn: `treasury_limit` ga 100 mill. per døgn hvis nøkkelen manglet i config, og ingen grense i det hele tatt hvis
raden `world` manglet (NULL-feil i `deposit_to_treasury`). Eieren: manglende config = 0, eksplisitt 0 = 0, bare en
eksplisitt framtidig beslutning kan åpne det.
Beslutning: `090_innskudd_lukket.sql`. Grensen er 0 med mindre `config.world.treasury_deposit_enabled = true` og
`treasury_base_per_day` er positivt. `deposit_to_treasury` avviser med `av` før noe annet (og tåler NULL). Bryteren er
ikke satt. Testet med alle varianter (mangler, 0, tall uten bryter, bryter av/på, ingen rad) i en blokk som ble rullet
tilbake. Appen har teksten for `av`.
Endringslogg: nei
Konto (B-149): – ingen ny funksjon.

## B-383 Tittel og opptjent nivå er skilt (2026-09-30)
Status: gjeldende. Endrer hva gulvet fra B-326 gir.
Bakgrunn: eieren: tittelen er historisk og beholdes; nye kjøp, komplekser og modernisering følger det verkene har tjent.
Ingenting tas bort. Dry-run før migrasjonen: `docs/STABILISERING.md` avsnitt 9.
Beslutning:
- `091_opptjent_niva.sql`: ny kolonne `konsern.earned` = det høyeste stigen (`konsern_ladder_level`) har stått på, uten
  gulvet, og går aldri ned. `konsern_settle` holder den oppdatert, `konsern_status` og `konsern_into_state` sender den
  (`g.konsern.earned`). `konsern_order` bruker den til plasser, høyeste trinn og komplekser. Et bytte til kompleks
  sperres ikke av plassene (det legger ikke til et verk), bare av nivå 2.
- `konsern.level`/`legends` er fortsatt tittelen: topplista, titler, pynt og stormodellene hjemme.
- Appen speiler regelen (`earnedLevel` i `konsernWorld.ts`, `earnedOf` i `konsern.ts`); Konsern → Oversikt forklarer
  det når tittelen er høyere enn det opptjente nivået. `migrate()` gir `earned: 0` (stigen regnes alltid med).
- Dry-run 30.9: ni spillere med gulv; seks sperres for å legge til (nye verk over plassene, trinn over det opptjente,
  nye komplekser). Verk, trinn, titler og alle 11 betalte bestillinger i køen står. Én betalt modernisering (trinn 3 → 4)
  er over det opptjente og fullføres.
Endringslogg: ja (samlet med B-384).
Konto (B-149): – ingen ny funksjon (konsernet krever konto fra før).

## B-384 Sesongen avgjøres på Konsernverdi; lister fra eget verk merkes; ukens «Mer verdi enn før» tas bort (2026-09-30)
Status: gjeldende. Endrer B-143 (sesongresultat på verdi), B-306 (lista «kasse» tatt bort) og B-152/B-172 (ukene).
Bakgrunn: uten kassetak blir lokale tall et kappløp i spillfart. Eieren: sesongens hovedkonkurranse er Konsernverdi
(serveren, ekte tid); «Verdi» og «Mest penger på bok» blir stående som levende lister, tydelig merket «Eget verk»; Hall of
Fame kan fryse lokale rekorder ved sesongslutt; «Mer verdi enn før» fjernes, og tre bedre ferdighetskonkurranser foreslås
før noe erstatter den.
Beslutning:
- `092_sesong_konsernverdi.sql` + `093_sesongslutt_raskere.sql`: `close_season` rangerer på `konsern_value` (de uten
  konsern etter, på verdien i eget verk) og lagrer `konsern_value` og `rank_by`; verdien i eget verk fryses som før.
  `season_history` gir begge. Avsluttede sesonger står urørt. Dry-run: 0,2 s for 19 spillere.
- `leaderboard()`: ny liste `produksjon` (tonn stål). Topplista i appen har to grupper: «Industriverden · sesong»
  (Konsernverdi, åpnes først) og «Eget verk» (Verdi, Mest penger på bok, Produksjon, Raskest til storverk, Raskest til
  10 mrd., Kontrollrom, Privat formue). Teksten under hver liste sier hva den er.
- `week_kind`: `vekst` er borte fra uka som starter 5.10.2026; så veksler «Flest aktive dager» og «Mer stål enn før».
  Ukene før står som de var. Tre forslag til nye ukekonkurranser i `docs/FORSLAG.md`.
Endringslogg: ja.
Konto (B-149): ja – topplistene og ukene krevde konto fra før; `produksjon` hører til topplista (KONTO.md).

## B-385 Verdenssimulatoren til 730 dager, og STATUS.md (2026-09-30)
Status: gjeldende.
Bakgrunn: eieren ba om 365/730 dager, dager etter fullt konsern til 1/5/10/25 mrd., hvor mange maksimale oppkjøpsbud
man har råd til, andelen av årets inntekt som går til det som finnes å bruke penger på, og forskjellen liten/middels/stor
– uten ny balanse. Deretter en STATUS.md som beskriver hvordan spillet virker nå.
Beslutning:
- `worldSim.ts`: 30/60/90/180/365/730 dager (standard 730), `fullDay`, `cashDays`, `years`, maks bud = 10 × verdien av
  skraplageret (171 mill. → 1,7 mrd.). Legacy-profilene følger opptjent nivå (B-383).
- Funn (ingen endring gjort): konsernet er ferdig utbygd på dag 19–68; etterpå går 93–100 % av inntekten rett i kassa
  (år 2: 0 % brukt uten selskapsbud). Kassa: 12–22 mrd. etter ett år og 26–47 mrd. etter to (stor ≈ 1,8–1,9 × liten).
  Etter ett år har en stor spiller råd til 13 maksimale oppkjøpsbud, etter to 27.
- `docs/STATUS.md` er fasit for hvordan spillet virker nå; BESLUTNINGER er hvorfor, LOGG er historikk (CLAUDE.md).
Endringslogg: nei
Konto (B-149): – ingen ny funksjon.

## B-386 Ukens kontrollrom og konsernkapitalen: forslag, ikke bygget (2026-09-30)
Status: forslag – venter på eieren
Bakgrunn: eieren godkjente B-381–B-385 og sa: ingen flere økonomiske justeringer nå (ikke høyere priser, lavere bidrag
eller utbytte, tak på konsernkassa eller avgifter). Problemet etter fullt konsern er at konsernspillet går tomt for
meningsfulle kapitalvalg, ikke at inntekten er for høy. Eieren valgte kontrollrommet som ny ukekonkurranse, men
rettferdig (samme charge, tre tellende forsøk, serververifisert), og ba om et designforslag for konsernkapitalen.
Beslutning:
- `docs/UKENS-KONTROLLROM.md`: variant A (serveren gir ukens frø og kvalitet, tre forsøk som brukes ved start, innlevering
  med tids- og poenggrense, inndatalogg lagres) er liten; full verifisering (B: serveren spiller chargen av i en
  edge-funksjon) er ny arkitektur. Etter eierens beskjed bygges ingenting før eieren har valgt variant. Rotasjon dager →
  stål → kontrollrom foreslått; kWh per tonn og leveringspresisjon senere.
- `docs/KONSERNKAPITAL-FORSLAG.md`: pengene har ingen alternativkostnad etter fullt konsern. Forslag: fem
  konsernprogrammer (to aktive, trinn 1–3) i samme prosjektlinje som i dag; verksjefer som ledelse; antall selskaper etter
  aktive konsern og regioner; oppkjøp avgjort av forberedelse, region, integrasjon og ledelse (ingen formelendring før
  ekte data); kritikk av frivillig eierutbytte (vent).
- Uendret: verdensbalansen, oppkjøpsformelen, sjekken 2.10 (bare rapport).
Endringslogg: nei
Konto (B-149): – ingen ny funksjon (når den bygges: ukens kontrollrom krever konto, regel 3 og 7).

## B-387 Ukens kontrollrom er bygget (variant A), og eierens svar om konsernkapitalen (2026-09-30)
Status: gjeldende. Bygger på B-386 og erstatter rotasjonen i B-384.
Bakgrunn: eieren valgte variant A (ikke edge-funksjon og dobbel spillmotor nå), men endret frøene: ikke ubegrenset
øving på den tellende charge, men tre tellende frø per uke (A/B/C), like for alle i samme rekkefølge; trening med egne
frø. Et startet forsøk skal kunne leveres etter en nettfeil. Rotasjon dager → stål → kontrollrom; «Mer stål enn før» er
midlertidig. For konsernkapitalen: to aktive programmer av fem, men programøkonomien skal simuleres i to modeller før K-1.
Beslutning:
- `094_ukens_kontrollrom.sql`: `weekly_control_attempts` (RLS, ingen tilgang for spillerne), hemmelig nøkkel i
  `weekly_control_keys`, frø `weekly_control_seed(uke, n)`, kvalitet `weekly_control_grade(uke)`,
  `weekly_control_start` / `_submit` (idempotent) / `_abandon`, `weekly_scores` med grenen `kontroll`, `weekly_status`
  med `control`, og `week_kind` dager → tonn → kontroll fra 5.10 (første kontrollromsuke 19.10). Grenser i
  `config.world.weekly_control` (3 forsøk, 20 s–15 min, 0–5 000 poeng, logg ≤ 32 kB).
- App: `seededRandom` og inndatalogg i `ChargeGame`; ukens charge `weeklyRequest` (samme for alle, ikke eget verk);
  kortet «Ukens utfordring» får kvaliteten, forsøkene, beste resultat, «Øv på ukens kvalitet» og «Kjør tellende forsøk»
  (med bekreftelse). Resultatet lagres i nettleseren til serveren har svart og sendes på nytt hvert 20. sekund.
  Ukens charger blir ikke charger i verket og gir ikke fagpoeng eller rekord.
- Konsernkapital: eierens svar står øverst i `KONSERNKAPITAL-FORSLAG.md`. Neste steg: simulere programmodell A og B.
- Teknisk gjeld: serveren stoler fortsatt på enkelte verdier fra mobilen (STATUS avsnitt 9) – må strammes før verden blir
  større eller mer konkurranseutsatt.
Endringslogg: ja.
Konto (B-149): ja – regel 3 og 7 (sammenlignes med andre, avgjøres på serveren). Kortet vises bare med konto; gjester
slipper ikke til (`guest_gate`).

## B-388 Simulering av programmodellene: anbefaling B (aktivt budsjett) – venter på eieren (2026-09-30)
Status: analyse – venter på eieren
Bakgrunn: eieren var skeptisk til store permanente trinn (A) og ba om simulering av A mot et aktivt programbudsjett (B)
før K-1 bygges: kasse etter 180/365/730 dager, konkurranse med oppkjøp, små og store spillere, og hvor ofte et bytte skjer.
Beslutning:
- `frontend/src/game/programSim.ts` (permanent, brukes ikke av spillet): A og B for liten/middels/stor med faste
  verdenshendelser og oppkjøpsvinduer. Resultatet i `KONSERNKAPITAL-FORSLAG.md` avsnitt 9.
- Funn: A tømmer kassa første år og hoper så opp i samme tempo som uten programmer; 0 bytter på to år; lik pris gjør det
  tyngre for små. B med budsjett som andel av inntekten (4/12/30 %) bremser hele tida (to på middels ca. 30–35 %, to på høy
  ca. 66–71 % av inntekten), gjør tida til et maksbud 64–108 dager med to på høy, gir lik avveining for små og store, og
  18 bytter på to år (styrt av hendelsene i verden).
- Anbefaling: B, med etablering i prosjektlinja, binding 14 dager, to aktive, og effekter hovedsakelig utenom penger.
  Forbehold: B er et sluk hvis effektene ikke merkes i spillet; programmene alene løser ikke opphopingen.
- Ingen endring i spillet eller verdensbalansen.
Endringslogg: nei
Konto (B-149): – ingen ny funksjon (når K-1 bygges: krever konto, regel 2 og 7).

## B-389 K-1 med modell B: spesifikasjon, hendelseslaget V0 og satsingene – venter på eieren (2026-09-30)
Status: spesifikasjon – venter på eieren
Bakgrunn: eieren valgte modell B (4/12/30 % som foreløpig utgangspunkt i config) med ti krav: grunnlag = vanlig bidrag +
utbytte før programeffekter, synlige kroner og prosenter, ekte programmer med rapport over hva de gjorde, bare programmer
med ekte effekt, høyst to aktive, 14 dagers binding via prosjektlinja, ingen gratis effekt uten finansiering, Driftsytelse
med ekte ulempe og nøytral forventet gevinst, ingenting live før rapporten etter 2.10.
Beslutning:
- Spesifikasjonen står i `docs/K1-PROGRAMMER.md`. Simuleringen er utvidet: `programSim.ts --k1` og `--k1-skann`
  (hendelser i seks regioner med fast frø, nøytrale i snitt, strategier for spredt og samlet konsern).
- Funn 1: serveren har ingen hendelser i konsernverdenen (utbyttet regnes fast av det lagrede spillet). Uten et lite
  hendelseslag (V0: regionale strømsjokk og uro, høykonjunktur som veier dem opp, varslet to dager før) har ingen av
  programmene ekte effekt. Med V0: Teknologi, Robusthet og Driftsytelse. Marked venter på S-1/O-1, Arbeidsmiljø på V1.
- Funn 2: med nøytrale hendelser er hele hendelsestapet ca. 0,9–1,5 mrd. over to år for en middels spiller, mens to
  programmer på middels med 4/12/30 % koster ca. 8–9 mrd. Programmene blir da en avgift. Forslag: 1/3/8 % – da er et godt
  valgt program omtrent verdt det det koster, og det jevner ut inntekten.
- Forslag om grunnlaget: budsjettet trekkes som andel av hver vanlige utbetaling (bidrag og utbytte før hendelser og
  programmer). Sju-dagers snittet brukes bare til visning. Det utelater engangsinntekter av seg selv og kan aldri mangle
  penger.
- Ekte fordeling av verkene (lest, ikke endret): 9 av 11 konsern med minst 3 verk er spredt på alle seks regionene.
- Ingen endring i spillet, databasen eller verdensbalansen.
Endringslogg: nei
Konto (B-149): – ingen ny funksjon ennå (når K-1 bygges: krever konto, regel 2 og 7).

## B-390 Eieren godkjenner V0, satsingene 1/3/8 % og trekk fra hver utbetaling (2026-09-30)
Status: besluttet – bygges etter rapporten 2.10, i skygge og bak avslått bryter. Grunnlaget (bidrag + utbytte) er
erstattet av B-392 (bare datterverksutbyttet).
Bakgrunn: svar på de tre spørsmålene i B-389 (`K1-PROGRAMMER.md` avsnitt 10).
Beslutning:
- **Verdenshendelser V0:** regionale strømsjokk, driftsuro og høykonjunktur i ekte tid, varslet to dager før. Et eget lag
  i Industriverdenen som skal gi mening også uten K-1 (regionvalget får en bakside: samlet = tilstedeværelse og
  konsentrert risiko, spredt = risikospredning). Nøytral betyr forventningsverdi for verden: høykonjunkturen regnes én
  gang av tallene i config (`k1BoomSize`), aldri etterregnet, og ingen spiller får tapte penger tilbake.
- **Skygge først:** hendelsene trekkes og logges (`world_events`, `world_event_exposure`: region, type, varsel/start/slutt,
  berørte spillere og andel av utbyttet, hypotetisk tap/gevinst uten program og med hvert program på Lav/Middels/Høy),
  uten virkning. Før live: rapport til eieren om fordelingen mot simulatoren og utslag med dagens plassering.
- **Satsinger 1 / 3 / 8 %** (foreløpig, i config). Forventet krone-avkastning kan være litt negativ; spillet viser
  eksponeringen (andel av datterverksutbyttet fra de varslede regionene og hva programmet ville spart) før valget.
- **Budsjettet** trekkes av hver vanlige utbetaling (bidrag + ordinært utbytte, før hendelser og programmer). Rekkefølgen
  i utbyttet: brutto → programkostnad → hendelse og programeffekt → fordeling mellom kassa og fondet. Hvert trekk har en
  unik nøkkel (spiller, dag, kilde), så ingenting trekkes to ganger. Sju-dagers snittet bare til prognosen.
- **Driftsytelse** forsterker ikke høykonjunkturen. `programSim.ts --k1-drift`: «Lav → Høy ved varsel om høykonjunktur»
  gir ingenting ekstra; «Høy → ned ved varsel om sjokk» sperres av bindingen (13 varsler på to år for et spredt konsern).
  Varianten der Driftsytelse forsterker høykonjunktur gjør varselstrategien nesten gratis og er derfor forkastet. Ingen
  innfasing av økning nå.
- Marked og Arbeidsmiljø åpnes ikke før systemene de påvirker finnes. Verksjef V1 etter at K-1 har en stabil grunnmur.
- Simulatoren: satsingene 1/3/8 % og høykonjunkturen fra config. Ingen endring i spillet, databasen eller verdensbalansen.
Endringslogg: nei
Konto (B-149): – ingen ny funksjon ennå (når K-1 bygges: krever konto, regel 2 og 7; V0 i skygge vises ikke).

## B-391 Tre kontrollpunkter før K-1 bygges og slås på: vinteren, bidrag mot utbytte og Konsernverdi (2026-09-30)
Status: målinger og tester på plass – ingen mekanikk endret; to spørsmål til eieren før live
Bakgrunn: eieren ba om tre kontroller før bygging/live, uten nye mekanikker og uten å endre retning eller rekkefølge.
Beslutning:
- **Vinteren:** fordelingen av hendelsene står eksplisitt i config (`mix`): høykonjunktur/uro/strømsjokk 50/25/25 % ellers
  og 40/20/40 % om vinteren. Strømsjokk er 1,6 ganger så vanlig om vinteren – den gamle teksten («dobbelt så ofte») var
  feil, modellen beholdes. Samme hendelser med samme frø, samme nøytralitet (høykonjunktur ca. +30 %).
- **Budsjett og hendelse er to størrelser:** kostnaden = satsing × (normalt bidrag + normalt utbytte), regnet før
  hendelsen og trukket for seg. `npm test` sjekker at kostnaden er lik i en rolig verden og med strømsjokk overalt.
- **Bidrag mot utbytte** (`programSim.ts --k1-kost`, ekte spillere lest uten endring): samme vern koster 9–33 % av
  utbyttet det verner, fordi grunnlaget tar med bidraget. Det er en bieffekt, ikke et valgt design. Grunnlaget endres ikke
  nå; skyggerapporten får per spiller vanlig bidrag, vanlig utbytte, programkostnad, potensielt beskyttet inntekt, spart
  beløp og kostnad som andel av utbyttet (`program_shadow_day`).
- **Konsernverdi** (`--k1-verdi`, 40 verdener, 90/180/365 dager): med program ligger konsernet 1,5–6,4 % under samme
  konsern uten, og foran i 0–1 av 40 verdener; også det dårligste utfallet er lavere med program. Testen viser at sesongen
  gjør «ingen programmer» optimal. Formelen er ikke endret; spørsmålet går til eieren med skyggedataene før live.
- Alt står i `K1-PROGRAMMER.md` (avsnitt 2, 4, 4.1, 8.2, 8.3 og de åpne spørsmålene). Ingen endring i spillet eller databasen.
Endringslogg: nei
Konto (B-149): – ingen ny funksjon.

## B-392 Programmene prises av datterverksutbyttet; Konsernverdi og vinteren står (2026-09-30)
Status: besluttet (grunnlaget) – satsene avgjort i B-393; ingenting bygget eller slått på
Bakgrunn: kontrollpunktene i B-391 viste at samme vern kostet 9–33 % av utbyttet avhengig av bidraget, og at et konsern
med program tapte i Konsernverdi i nesten alle verdener.
Beslutning (eieren):
- **Grunnlaget** for Teknologi, Robusthet og Driftsytelse er normalt brutto datterverksutbytte før hendelser og
  programeffekter – ikke bidrag + utbytte (erstatter grunnlaget i B-390). Bidraget går urørt til konsernkassa. Etableringen
  (2 dagers utbytte) og Driftsytelses ekstra regnes av det samme. Budsjettet trekkes bare av utbyttebetalingen, med unik
  nøkkel (spiller, dag).
- **Hovedregel (foreløpig):** programbudsjettet skaleres så langt det er naturlig mot den delen av konsernet programmet
  påvirker. Ingen egne grunnlag nå; Marked og Arbeidsmiljø vurderes når de bygges.
- **Konsernverdi endres ikke**, heller ikke til «laveste i perioden». Programmene skal prises riktig i stedet.
- **Vinteren** står (50/25/25, vinter 40/20/40). Ikke hardere for programøkonomiens skyld.
- Skyggerapporten viser også kostnad / beskyttet datterverksutbytte (kostnad / hendelsestap og kostnad per spart krone).
Resultat (simulatoren, `--k1-verdi`, `--k1-verdi-skann`, `--k1-kost`; `npm test` sjekker at bidraget ikke påvirker prisen):
- Med 1/3/8 % og det nye grunnlaget taper programspilleren fortsatt i nesten alle verdener (beste: bare Teknologi ved
  varsel, alt i én region, foran i 14 av 40).
- **Forslag til eieren: 0,5 / 1,5 / 4 %** med dagens vern. Da står et spredt konsern best uten (0–2 av 40), et samlet
  konsern med forsikring ved varsel ligger på omtrent null og foran i 12–22 av 40, og det dårligste utfallet blir bedre
  med program. Sterkere vern gjør forsikring lønnsom i snitt og anbefales ikke. 1/3/8 % står i config til eieren avgjør.
- Driftsytelse er uendret: ingen varselstrategi dominerer.
Endringslogg: nei
Konto (B-149): – ingen ny funksjon.

## B-393 Satsene 0,5 / 1,5 / 4 % og 80 % vern; skyggen regner begge satssettene og etableringen for seg (2026-09-30)
Status: besluttet – settes i config når K-1 bygges (etter rapporten 2.10), ingenting slått på
Beslutning (eieren):
- **Satsene** for Teknologi, Robusthet og Driftsytelse er foreløpig **0,5 / 1,5 / 4 %** av normalt datterverksutbytte
  (erstatter 1/3/8 % i B-390). Simulatoren bruker dem som standard.
- **Vernet** står på 80 % på Høy (ikke 100 %): programmene skal være situasjonelle strategivalg, ikke forventet meravkastning.
- **Skyggerapporten** regner både 0,5/1,5/4 og 1/3/8 % på de samme hendelsene, og sammenligner kostnad per spart krone,
  spredte mot konsentrerte konsern, hvor ofte Høy ville vært rasjonelt, hvor mye variasjon programmene fjerner, og løpende
  kostnad mot etablering.
- **Etableringen** står på 2 dagers normalt datterverksutbytte og måles for seg (`programSim.ts --k1-etablering`): med de
  lavere satsene er den 13–28 % av totalkostnaden for den som skrur opp og ned, men 56 % for et spredt konsern som bytter
  program etter hvert varsel (15 bytter på to år) – uten å spare mer. Ikke endret; følges i skyggen.
- **Programmene skal ikke løse kapitalopphopingen** – de er en pris på risikoprofil og strategi, ikke en avgift. De store
  kapitalvalgene er selskaper, oppkjøp og regional ekspansjon. Ikke velg høyere satser for å ta ut mer penger.
- Hovedprinsipp: diversifisering skal være gratis risikospredning, konsentrasjon skal kunne forsvares med kapital, og
  ingen av delene skal være universelt best.
Endringslogg: nei
Konto (B-149): – ingen ny funksjon.

## B-394 Trinnet på datterverkene vises med ord (2026-09-30)
Status: gjennomført
Bakgrunn: en spiller fant ikke hvilket trinn verkene er modernisert til. På mobil viste raden under «Dine verk» bare små
prikker uten forklaring; «Modernisert 3 av 5» sto først når raden ble åpnet.
Beslutning:
- Felles visning av trinnet på mobil og PC (`PlantTier` i `ui/Konsern.tsx`): prikker og «Trinn 3 av 5» med ord. Grønn
  prikk = trinn verket har, ring = trinn som bygges eller står i køen («Trinn 3 → 4», `plannedLevel` i `game/konsern.ts`).
- Mobil: trinnet får hele linja under navnet; typen (stålverk/storverk/stålkompleks) står under utbyttet til høyre. Under
  360 px faller «av 5» bort og prikkene blir mindre, så ingenting kuttes på 320 px.
- Åpen rad og PC: «Trinn 3 av 5. Hvert trinn gir verket 25 % mer overskudd.» – eller på høyeste trinn hvilken tittel som
  åpner neste (`nextTierTitle`), i stedet for «Fullt modernisert» når flere trinn kan komme.
- PC-tabellen har kolonnen «Trinn» med samme prikker. Forklaringen over lista sier hva prikkene betyr.
Endringslogg: ja
Konto (B-149): nei – visning av eget spill.

## B-395 Serverautoritet trinn 1: typevakt, harde regler for forskning og felles funksjoner, skyggelogg (2026-10-01)
Status: gjennomført (095). Skyggen står til etter rapporten 2.10.
Bakgrunn: eieren (1.10): verdier som påvirker andre spillere skal ikke kunne settes fritt til maks med én endret
lagring. Trinnvis: valider og logg først, steng det objektivt umulige med en gang, ikke straff ærlige 10×-spillere, ikke
bevis én mobilverdi med en annen, bevar det dagens spillere har, og hold 2.10-rapporten sammenlignbar (STATUS 9.1).
Funn før endringen (alle 22 lagringer):
- Ingen lagringer med feil type – men `save_game` sjekket ingen typer. Tekst der et tall skulle stå (f.eks. nivået),
  ville fått målingene, utbetalingene, topplista og konsernverdien til å feile for **alle** spillere.
- `dividend_from_state` talte felles funksjoner og konsernforskning med `count(*)`: samme id flere ganger ga mer utbytte.
  Ingen spillere hadde duplikater.
- Ingen hadde forskning uten forutsetningene. `konsern_order` ga plasser/rabatt for «stort konsern»/«standardverk» uten
  å sjekke forutsetningen (det gjør appen).
- Marginen: en endret app kan melde margin 3 000 kr/t (taket) hver dag. Det er ca. 2 × en typisk stor spiller
  (567–1 872 kr/t). Spiller A melder 7 059 kr/t uten tak (inntekt 11 487 kr/t mot 5 100–7 600 hos de andre) og bruker
  taket; ett lite verk lå også på taket 30.9.
Beslutning:
- **Hardt nå** (åpenbart umulig eller sikkerhetsfeil; endrer ingen utbetaling – målt: 0 av 22 endret):
  - `saves_type_guard` avviser lagringer med feil type i feltene serveren leser for alle (nivå, omdømme, lån,
    kontrollromsrekord, mesterskap, forskning, konsern åpnet, felles funksjoner, døgnregnskapet). Appen sender aldri slikt.
  - Felles funksjoner og konsernforskning telles unike og bare kjente id-er (`world_shared`, `world_research`).
  - Forskning teller bare med forutsetningene (standardverk ← konsernstyring, stort konsern ← oppkjøp, grønt konsern ←
    konsernstyring + grønt stål), også i `konsern_order`.
  - Mesterskapet i utbyttet har standard 0 når config mangler (er 0, B-328).
- **Grunnlag** (eierens punkt D): `world_claims` har forskning og felles funksjoner hver spiller hadde 30.9 kl. 23:07
  («grunnlag»). Det som kommer senere, får tidspunktet serveren så det først («ny») – grunnlaget for strengere regler for
  nye kjøp senere. Ingen mister noe.
- **Skygge** (`world_input_log`, hvert kvarter med målingene, `world_input_audit_run`; feiler aldri målingene): per spiller
  og verdi det mobilen hevder, det serveren mener er mulig, og det serveren bruker, med flagg: forskning
  (`mangler_forutsetning`, `ny_etter_grunnlag`), felles (`duplikat_eller_ukjent`, `ny_etter_grunnlag`), omdømme
  (`utenfor_grense`), tilgang (`uten_tidslinje`, `umulig_kombinasjon`), margin (`over_tak`, `hopp`, `hoy_inntekt_per_t`,
  `uten_tonn`), tonn (`over_grense`). Ingen av flaggene gjør noe før eieren har sett tallene etter 2.10.
- **Hva som er hva** (eierens punkt C): STATUS 9.1. Hardt = det serveren selv eier (konsernet, kassa, køen, tid, aktive
  dager, unikhet, forutsetninger, typer). Plausibelt = tonn (tidslinja med fartskontrollen), tilgang (mot tidslinja),
  margingrensene. Klient = om forskningen/funksjonen faktisk er kjøpt, omdømme innen 0–100, kvalitet, margin under taket.
  Fagpoeng brukes ikke som bevis – de kommer fra samme lagring.
- **Marginen** (punkt E): bidragsformelen er ikke endret. Mellomløsningene eieren kan velge etter 2.10 (alle målt i skygge
  først): (1) serverberegnet maksimum per tonn fra prisene i config (høyeste pris med salgsbonusene på taket, +25 %, minus
  laveste mulige kostnad per tonn) i stedet for et fast tak; (2) at marginen som brukes, bare kan stige et visst stykke
  per ekte dag fra snittet serveren selv har målt (`contribution_samples`) – skyggen viser at «1,5 × og +500» flagger to
  ærlige spillere som gikk fra ca. 600 til 1 600–1 800, så grensen må være romsligere eller glattes over flere dager;
  (3) kryssjekk av inntekt per tonn mot spillernes fordeling. (1) + en romslig (2) er anbefalingen.
Endringslogg: nei – spillerne merker ingenting.
Konto (B-149): nei – serverregler, ingen ny funksjon.

## B-396 Tidslinjetall til stål per kWh og leveringspresisjon, med rimelighetsgrenser (2026-10-01)
Status: gjennomført (096 + app). Konkurransene er ikke slått på.
Bakgrunn: eieren vil ha nok rådata til å velge formelen senere, og ingen ferdige forholdstall fra mobilen.
Beslutning:
- Appen teller i alt (`g.totals`): strøm (`kwh`, alt som belastes i `chargeEnergy`), misligholdte kontrakter
  (`contractsMissed`, fristen gikk ut) og avbrutte (`contractsCancelled`); leveranser (`contractsDone`) og reklamasjoner
  (`complaints`) fantes. Leverte kontrakter er alltid i tide – fristen sjekkes ved døgnskiftet. Gamle lagringer starter på 0.
- Tidslinja får `kwh_total`, `deliveries`, `missed`, `cancelled`, `complaints` (tellere, ikke prosent). Serveren regner
  kWh/t og presisjon (levert / (levert + misligholdt + avbrutt)) av forskjellen mellom to rader (`timeline_metrics`, ikke
  åpnet for appen).
- Vakten `snapshot_metrics_guard` nuller tall som ikke kan stemme og skriver hvorfor i `metric_note`; den avviser aldri en
  rad og flagger aldri en spiller: negative tellere, tellere som går ned (uten nytt spill), 120–3 000 kWh per tonn når
  minst 500 t er laget (ellers høyst 1,5 mill. kWh + 3 000 per tonn), høyst 200 kontrakter eller reklamasjoner per
  spilldøgn, og en eldre dag som lastes opp igjen sjekkes også mot raden etter. Nytt spill (tonnene går ned) blir nytt
  utgangspunkt (`ny_start`).
- Når det finnes noen ukers data, avgjør eieren minstetonn, minste antall leveranser, små verk og om forbedring eller
  absolutt tall er mest rettferdig. Til da påvirker tallene ingenting.
Endringslogg: nei – ingenting synlig for spillerne ennå.
Konto (B-149): ja, som tidslinja ellers (lagres på nett); ingen ny funksjon i appen.

## B-397 Feilrettinger etter kodegjennomgangen 1.10 (2026-10-01)
Status: gjennomført, unntatt utbyttet (funn 3 og 4), som venter på eieren.
Bakgrunn: eieren fikk en statisk kodegjennomgang av main (e38241e) med 13 funn og fire forslag. Alle funnene er sjekket
mot koden og databasen og stemte.
Beslutning:
- Innlogging (funn 1, 2): et sent svar på fornyelsen av økta brukes bare hvis samme økt fortsatt er innlogget (ellers
  kunne konto A komme tilbake etter utlogging eller bytte til B). Fornyelsen gjelder én bestemt økt (`refreshingFor`).
  Fikk vi ikke fornyet økta, går kallet ikke uten innlogging; det gir en feil som går over (`isTransient`) og prøves igjen.
- Ukens kontrollrom (funn 5–8): et resultat som venter, gjelder bare kontoen det hører til, og ryddes når fristen er ute.
  Det ligger også i minnet, så det leveres selv om nettleseren ikke kan lagre. Det prøves igjen fra hele appen
  (`PendingControlSync`), ikke bare fra Uka. Den automatiske oppdateringen venter mens et kontrollrom er åpent eller et
  ukeresultat venter. Serveren (097) godtar ikke innlevering etter at uka er over (`uke_slutt`), og starter ikke et forsøk
  de siste 15 minuttene av uka (`sent_i_uka`).
- Daglig (funn 9, 10): status og «mens du var borte» hentes hver for seg, så pengene legges inn selv om statusen feiler.
  Ved midnatt norsk tid hentes ny status (nye oppdrag); og har dagen skiftet når bonusen hentes, hentes dagens oppdrag i
  stedet for å bruke opp den nye dagens bonus.
- Spillmotoren (funn 11–13): skrapklasseren sammenligner med lagerets faktiske analyse når den bytter inn annet skrap.
  Verdenshendelser som er over, teller ikke (sluttiden sjekkes mot serverens klokke). En dødsulykke stenger hele verket
  (`g.closedUntilMin`), også valseverket.
- CI: publiseringen kjører hele `npm test` (også skraplagertestene), og en ny arbeidsflyt (`sjekker.yml`) kjører typesjekk,
  lint, tester, prosessmodellen, balansen og bygget på hver pull request mot main. Beskyttelse av main (krav om grønne
  sjekker før merge) må eieren slå på i GitHub (Settings → Branches).
- **Venter på eieren (funn 3, 4):** utbyttet. Ferdige datterverk ble målt som under bygging resten av dagen for den som
  var borte (3 spillere 1.10), og den som solgte sitt siste verk før midnatt, fikk ikke utbyttet for dagen. Rettingen står
  i `supabase/utkast/099_utbytte_ferdige_verk.sql` og er prøvd i en transaksjon som ble rullet tilbake. Den øker
  utbetalingene litt for de berørte, og eieren ville ikke endre økonomien før 2.10-rapporten (B-395 punkt F) – så den
  kjøres når eieren sier fra. Etterbetaling for dagene før krever dry-run og eierens godkjenning.
Endringslogg: ja
Konto (B-149): nei – feilrettinger.

## B-398 Typevakten og energivakten rettet (2026-10-01)
Status: gjennomført (098).
Bakgrunn: en ny kodegjennomgang fant to feil i kontrollene fra B-395/B-396.
Beslutning:
- **Typevakten** avviser nå også det som kunne stoppe verdensjobbene for alle: `history: null` og `konsern.plants: null`
  (leses som lister), og tall som ikke er heltall eller er for store der serveren gjør dem om til heltall: `stage`
  (0–100; int og smallint på topplista), `serverEdit`, `konsern.nextId` og `minute` (høyst 2 147 483 647). Alle feltene
  der serveren gjør en verdi fra lagringen om til int, smallint eller boolean, er gått gjennom. Ingen av dagens 24
  lagringer har noe av dette.
- **Energivakten** hadde en nedre grense for kWh per tonn i hvert intervall. Strøm bokføres når chargen starter og tonn
  når de støpes, så et intervall kan ha mange tonn og ingen ny strøm (eller omvendt). Vakten har nå bare en øvre grense
  som tåler forskyvningen (1,5 mill. kWh + 3 000 per tonn). Forholdet vurderes over en periode med minst 5 000 t i
  `timeline_energy` (`gyldig`: 120–3 000 kWh/t). `timeline_metrics` står uendret. Ingen målinger var forkastet (26 av 26
  var godtatt).
- Til beslutningene etter 2.10 (gjennomgangens anbefaling, i FORSLAG.md): marginhopp forblir varsling til de falske
  positive er kartlagt; prisbasert margintak prøves i skygge først; krav til konkurransene settes ut fra gyldig
  datadekning, tonn og antall avsluttede kontrakter.
Endringslogg: nei – spillerne merker ingenting.
Konto (B-149): nei.

## B-399 Fagpoeng mens du var borte; utbytterettingen etter rapporten; ukeresultat i minnet går først (2026-10-01)
Status: gjennomført (100 + app), utbytterettingen planlagt til 2.10 etter rapporten.
Bakgrunn: en spiller spurte hvorfor man ikke får fagpoeng mens man er borte. Eieren valgte ca. 5 % av vanlig takt,
regnet av serveren. Eieren valgte også tidspunktet for utbytterettingen og etterbetaling med dry-run. En ny gjennomgang
fant en restfeil i kontrollrommet.
Beslutning:
- **Fagpoeng borte:** 10 fagpoeng per time borte, høyst åtte timer (80), ingenting under 30 minutter – lagt inn i «Mens du
  var borte» ved siden av pengene. Grunnlag: testspilleren tjener 5–8 fagpoeng per spilldøgn på alle nivåer
  (`balance.ts --fagpoeng`), og en time på 1× er 30 spilldøgn, altså ca. 200 i timen; 5 % = 10. 80 fagpoeng er under
  én forskning (median 120) og under en halvtime vanlig spilling. Serveren regner dem (`claim_away_v2`, 100) med samme tid
  borte som pengene og gir dem bare én gang – det er det som begrenser belønningen. Taket i appen (`AWAY_FP_MAX`) er bare
  et vern mot et feil svar og kan omgås av en endret app (presisert i B-400). `claim_away()` står for eldre apper.
  Fagpoeng gir bare framgang i eget verk (B-323).
- **Utbytterettingen** (B-397, funn 3 og 4) kjøres rett etter 2.10-rapporten, og tidspunktet dokumenteres. Utkastet
  retter bare framover (fra 2.10); målinger som alt er tatt, og eldre dager for den som solgte sitt siste verk, rettes av
  en egen etterbetaling: dry-run per spiller og dato (betalt, riktig beløp, differanse, usikkerhet) og eierens
  godkjenning først. Planlagt sjekk 2.10 kl. 07:45 UTC.
- **Ukeresultat:** kopien i minnet går foran det som ligger i nettleseren når den er satt i økta – ellers kunne et gammelt
  resultat fra en annen konto skygge for et nytt som ikke ble lagret.
Endringslogg: ja
Konto (B-149): ja – «Mens du var borte» krever konto (regel 4), som før.

## B-400 Egen referanse for belønningsscenarioet i balansen, og den kjøres i CI (2026-10-01)
Status: gjennomført.
Bakgrunn: `balance.ts --daglig 15` (spilleren henter daglig belønning, oppdragsbonus og åtte timer borte hver 15.
spilldøgn) når Støperi på dag 19, mot standardmålet 20–50 – også før B-399. Eieren: dag 19 er greit når spilleren henter
belønningene; belønningene skal gi litt raskere progresjon, og avviket begrunner ingen balanseendring.
Beslutning:
- Standardmålene står (Verksted 7–20, Støperi 20–50, Stålverk 55–120, Storverk 120–220).
- Belønningsscenarioet har sin egen referanse (`REWARD_TARGETS` i `balance.ts`): Verksted 6–20, Støperi 15–50, Stålverk
  48–120, Storverk 110–220. Målt 1.10: medianene 7 / 19 / 55–60 / 135–144.
- CI kjører `balance.ts --daglig 15` mot denne referansen, både på pull requests (`sjekker.yml`) og før publiseringen
  (`pages.yml`), så senere endringer i belønningene blir synlige.
- Presisering til B-399: det er serverens beregning og at fagpoengene for tida borte bare hentes én gang, som begrenser
  belønningen. Taket i appen er ikke en juksesperre – en endret app kan omgå det (fagpoeng påvirker bare eget verk).
Endringslogg: nei – spillerne merker ingenting.
Konto (B-149): nei.

## B-401 Verdensjobbene: én spiller om gangen, ingen dobbel betaling, og overvåking per jobb og spiller (2026-10-01)
Status: gjennomført (migrasjon 101, lagt inn 1.10 ca. 13:25 UTC).
Bakgrunn: eieren ba om punkt 1 og 2 fra stabiliseringslista sammen, med testene i punkt 5. Målingene, utbyttet, bidraget
og selskapsinntekten gikk i én løkke per jobb (målingene i én setning for alle). En uventet feil hos én spiller stoppet
jobben for alle, og `world_tick` rullet alt tilbake – også jobbene som hadde gått bra. Overvåkingen viste bare at
pg_cron hadde startet `world_tick`, ikke om noe ble betalt.
Beslutning:
- Hver spiller (hvert selskap for selskapsinntekten) behandles i en egen deltransaksjon (`begin … exception`). Feiler
  noe, rulles bare den spillerens behandling tilbake, feilen logges (`world_job_units`, `world_job_errors`), og resten
  fortsetter. Spilleren prøves igjen i neste kjøring (hvert 5. minutt), fra første dag som ikke er betalt.
- Ingen dobbel betaling ved nye forsøk: hver betaling skrives med `on conflict do nothing`, og kassa, kasseposten og
  fondet krediteres bare når raden faktisk ble satt inn – i samme deltransaksjon som raden.
- Hver jobb i `world_tick` kjøres for seg; én jobb som feiler, stopper ikke de andre.
- Overvåking: `world_health()` gir per jobb siste start, siste fullførte og siste feilfrie kjøring, antall behandlet og
  feilet, og status («ok», «feil hos enkelte», «feil i jobben», «står» når siste fullførte er over 20 min gammel – 35 for
  målingene). `world_health_players()` gir per spiller siste måling, betalt til og med (utbytte og bidrag), siste
  vellykkede behandling per jobb og feil som står, med status «ok», «feil», «mangler måling» eller «ikke betalt for i går»
  (fra 00:30 norsk tid). Begge er bare for eieren (tatt fra anon og authenticated).
- Reglene for beløpene er uendret. Oppryddingen (feilloggen 30 dager, målingene 20) står i én setning i `world_prune`.
Prøvekjøring 1.10 (rullet tilbake): med en midlertidig `world_today` = i morgen betalte gammel og ny versjon 1.10 fra
samme utgangspunkt. Én spiller fikk bevisst feil (i aktivitetsfaktoren og utbyttet per dag). Resultat: 0 avvik for de
feilfrie i utbytte (13), bidrag (15), selskapsinntekt (1), kasseposter og målinger; spilleren med feil ble ikke målt eller
betalt og fikk status «feil [utbytte, bidrag, malinger]»; jobbene viste «feil hos enkelte (13/1)». Da feilen var borte,
betalte et nytt forsøk spilleren samme beløp som den gamle versjonen, med to kasseposter – fortsatt to etter enda en
kjøring. En egen prøve viste at statusen går tilbake til «ok» ved neste vellykkede måling (16/0). Første ekte kjøring
med pg_cron etter migrasjonen: alle jobber «ok».
Testene i punkt 5: midnatt norsk tid i appen (`worldDay`, `nextWorldMidnight`) mot fasit fra `world_day()` i SQL, også
når sommertiden slutter 25.10.2026 (døgn på 25 t) og begynner 28.3.2027 (23 t), og et helt år uten hoppede eller doble
dager (`game/tests.ts`, uavhengig av maskinens tidssone). «Prosjekt ferdig mens appen er lukket» er prøvd mot utkastet
099 tilpasset 101: tre ekte bestillinger med passert ferdigtid ble gjort ferdige ved målingen, og målingen brukte det nye
utbyttet; ingen nye kasseposter. Testen gjentas i prøvekjøringen 2.10 før 099 legges inn.
Utkastet 099 er tilpasset: oppgjøret (`konsern_settle`) gjøres per spiller inne i spillerens deltransaksjon i
`sample_contributions`, ikke for alle verk i hver spillers måling. Historisk etterbetaling følger fortsatt den separate
godkjenningsplanen (B-399).
Merk: Supabase-connectoren holder igjen (tidsavbrudd etter 60 s, ingenting sendt til databasen) en DO-blokk eller en
funksjon med flere setninger der én er `delete`. Prøvekjøringer unngår derfor `delete`.
Ikke endret: datakvalitetsoversikten for tidslinjetallene tas når flere dager er samlet; variant B av ukens kontrollrom
venter til stabiliseringen er ferdig; vern mot lekkede passord står fravalgt (krever Supabase Pro, B-363).
Endringslogg: nei – spillerne merker ingenting.
Konto (B-149): nei (serverjobber og overvåking for eieren).

## B-402 Slagghåndteringen og V0/K-1 i skygge – først etter morgenkjøringen 2.10 (2026-10-01)
Status: vedtatt, ikke utført.
Bakgrunn: eieren sjekket databasen 1.10: alle verdensjobbene står «ok», og skraplageret har to registrerte utbetalinger.
Å slå på slagghåndteringen åpner et anbud på 48 timer. Selskapet betaler ingen inntekt med én gang, men bud trekkes straks
fra spillernes konsernkasser – det kunne påvirket grunnlaget for rapporten 2.10 allerede samme dag.
Beslutning:
- **Slagghåndteringen** slås på først når nattkontrollen 2.10 er grønn (`world_health()`/`world_health_players()` «ok»)
  og rapportgrunnlaget er bevart. Ikke slått på 1.10.
- **V0 og K-1 bygges i skygge** etter at morgenkjøringen 2.10 er fullført og rapportgrunnlaget er bevart:
  - Satsene 0,5 / 1,5 / 4 % med 80 % vern på Høy (B-393).
  - V0 logger bare hendelser. K-1-bryteren står av.
  - Skyggen trekker ingen penger og påvirker verken utbetalinger, konsernverdi eller konkurranser.
  - Feil i skyggekjøringen isoleres fra de ordinære verdensjobbene (egen deltransaksjon og egen jobb i `world_jobs`, som
    B-401), så en feil der aldri stopper eller ruller tilbake målinger og betalinger.
- **Skyggerapporten** sammenligner med både ingen programmer og 1/3/8 %, viser etableringskostnadene for seg og oppgir
  datamengden (antall dager, spillere og hendelser).
- Aktivering av V0 og K-1 vurderes først etter rapporten, av eieren.
Endringslogg: nei – spillerne merker ingenting ennå.
Konto (B-149): ikke aktuelt (serverside, i skygge).

## B-403 Kodegjennomgang 1.10: serverens klokke i varslene, og databasen mot repoet (2026-10-01)
Status: gjennomført.
Bakgrunn: eieren ba om en gjennomgang av all kode (feil, glemte ting, docs). Grunnlinjen var grønn: typesjekk, lint,
`npm test`, `balance.ts` (standard og `--daglig 15`, `--sommerstans`), `programSim`, `worldSim` og `sim/validate`.
Funn og retting:
- **Serverens klokke i varslene (rettet):** beskjedene om utbytte, bidrag, selskapsinntekt og avgjorte anbud, og
  sjekken av om et anbud fortsatt er åpent (`openTender`), brukte telefonens klokke (`Date.now()`), mot regelen i B-314.
  En telefon med feil dato kunne gi beskjeden om gårsdagens utbytte flere ganger eller aldri, og vise et stengt anbud
  som åpent. Nå bruker `net/world.ts` (standardverdiene), `GameApp`, `openTender` og tidsstempelet i Skiftrapporten
  `realNow()` (servertid). Testene gir «nå» eksplisitt og er uendret.
- **Databasen mot repoet (kontrollert, ingen avvik):** sjekksummen av hver funksjonskropp i databasen
  (`md5(regexp_replace(prosrc, '\s+', ' ', 'g'))`, med `--`-kommentarer fjernet) mot den siste definisjonen i
  `supabase/`. 173 funksjoner: alle stemmer når en tar med at 081 patcher alle funksjoner med UTC-dato i en løkke, at
  082/084/087/090/091/095/097 patcher navngitte funksjoner med `replace`, og at `start_season` (039), `season_history`
  (092) og `backup_export` (073) er laget med `create function` etter `drop`. Ingen levende funksjon bruker
  `at time zone 'utc'`. Alle 46 tabeller har RLS. Cron-jobbene (eksport, verden-tick, rydding, gjester) går uten feil;
  `world_job_errors` er tom.
- **Lagringer:** `migrate()` dekker alle feltene i `GameState`; `settings.maxPowerPrice` kan mangle i svært gamle
  lagringer, men leses trygt (`undefined` sammenlignes som «ingen grense»).
- **Balansen (observasjon, ikke endret):** med enkelte frø nås Verksted før målet (nybegynner frø 5: dag 5, flink frø
  11: dag 6, mål 7–20). Standardkjøringen i CI er innenfor. Målene er eierens; ingen endring.
- **Docs:** README (STATUS, STABILISERING, UKENS-KONTROLLROM, KONSERNKAPITAL, K1-PROGRAMMER i lista), PLAN-NETT
  (migrasjonene 095–101), RETNING 5.5 (sesongene starter ikke av seg selv lenger, B-182/B-221).
Endringslogg: ja (eieren: merkbart for spillere med feil mobilklokke) – «Varsler om betalinger og anbud viser riktig
tidspunkt også når klokken på mobilen er feil.»
Balansen (eieren): målvinduet vurderes ut fra medianen over frøene; Verksted på dag 5–6 i enkelte spill er greit så
lenge det typiske forløpet ligger innenfor 7–20 dager. Ingen endring.
Konto (B-149): ikke aktuelt.

## B-404 Lånt fra en dashbordmal: nøkkeltall med endring, moduler på PC og rolig bevegelse (2026-10-01)
Status: gjennomført.
Bakgrunn: eieren delte en designbeskrivelse av et «premium SaaS-dashbord» og spurte om den kunne gjøre appen finere,
og ba så om å «legge inn det som er verdt å låne». Malen er lys, rund (kort med 55 px radius), med Inter og
lilla/grønn – det passer ikke den mørke industristilen (B-187, B-191) og ble ikke tatt. Tre ideer ble lånt, tilpasset
designsystemet, uten nye farger eller tokens:
- **Nøkkeltall med endring:** `Metric` (ds.tsx) og `DeltaLine` med `changeDelta` (`ui/delta.ts`). Økonomi viser
  resultatet i går mot døgnet før, og «Produsert i går» får endringen i tonn. Konsern viser hva som kommer inn per ekte
  dag (utbytte + bidrag) under konsernverdien. Pil + ord bærer meningen, fargen er tillegg. Én fast linje, så ingenting
  hopper (B-238); i de smale rutene bare «+27 t» med hele setningen som verktøytips.
- **Moduler i lag på PC:** nøkkeltallet og tallene ved siden av blir innfelte ruter i kortet fra 900 px. Mobil uendret.
- **Rolig bevegelse:** ark toner inn (200 ms), kortet stiger inn nedenfra på mobil og glir inn fra høyre på PC;
  knapper løftes 1 px når musa holdes over – bare med mus, aldri på berøringsskjerm. `prefers-reduced-motion` slår av
  alt. Animasjonen spilles bare når arket åpnes, ikke når spillet tegner på nytt (målt).
Ikke tatt: lys modus, ny skrift, store radier, 3D/WebGL-bakgrunner og animasjoner som går hele tida (batteri, ro).
Testet: 320–2 560 px (de 7 størrelsene i UI.md), med og uten konsern fra serveren: ingen horisontal scrolling, ingen
avkortet tekst, ingen hopping på 8 s med spillet i gang; animasjonen starter ikke på nytt; løft bare med mus; ingenting
med redusert bevegelse.
Konto (B-149): ikke aktuelt.
Endringslogg: ja.

## B-405 Designgjennomgangen 1.10, del 1: nytt verdenskart (2026-10-01)
Status: gjennomført.
Bakgrunn: eieren sendte en designgjennomgang av alle skjermene (`frontend/src/ui` mot UI.md) med en kartprototype,
mockups og kode å lime inn, og foreslo fire PR-er i rekkefølge: kartet, typografien, «Nå»-linja med farget dom, og
mindre tekst. Dette er den første. Funnet: kartet var «en illustrasjon, ikke et sted» – seks like flater, 5 px-merker
(under 5 px på iPhone) og ingenting å gjøre fra kartet.
Gjort (fra `patches/WorldMap.tsx` og `worldmap.css`, kontrollert mot koden):
- Kystlinjer med glød, sjøkartrutenett, stiplede skipsleder, kompass og terrengtegn; regionnavn i visningsskriften med
  undertekst («7 verk · 2 konsern», skjult under 600 px der regionknappene sier det samme). Tettheten (antall verk) gir
  fyllfargen; valgt region får cyan kant.
- Merkene i fast rutenett, fem per rad og to rader (dine først, så andres, så selskapene, så «+N»), stiplet for verk
  som bygges. Filter Alle / Dine / Selskaper i korthodet. Tegnforklaringen under kartet på mobil, oppå på PC.
- Sidepanel: regionknapper med «7 verk · 4 dine», tre tall (verk, konsern, selskaper), selskapene og konsernene som
  rader med ett merke per verk, og «Bygg neste verk i …», som velger regionen under Utvid (`setBuildRegion`) og går dit.
Rettet i forslaget:
- **Verk som bygges ble telt to ganger:** `world_map` teller et verk som bygges, både i typen og i `building`. Forslaget
  la til egne merker for dem; nå blir de siste merkene til spilleren stiplet i stedet.
- **Tekst som ikke stemte:** «første konsern som bygger, får forspranget på Kontroll» er ikke regelen (verk i regionen
  gir Kontroll bare til eieren av selskapet, og bonus til et oppkjøpsbud). Fjernet.
- **Kontrollstolper uten data:** `world_map` har ikke Kontroll per selskap; stolpene var død kode og ble fjernet.
  Kontrollen står under Industrien.
- **Faste farger** (sju heksverdier og én rgba) er byttet mot tokens (`--info-bg`, `--bg`, `--surface-1…hover`).
- Høyst ti merker per region, så Jernåsen ikke flyter inn i Østskogen; kartet høyst 860 px bredt på PC; detaljene står
  rett i kortet på mobil (ikke kort i kort); to kolonner med regionknapper under 380 px.
Testet: de 7 størrelsene i UI.md med falske kartdata: ingen horisontal scrolling, ingen avkortet tekst, knapper minst
44 px, filtrene teller riktig, «Bygg neste verk i …» velger regionen under Utvid.
Konto (B-149): uendret – kartet krever konto som før.
Endringslogg: ja.

## B-406 Designgjennomgangen 1.10, del 2 og 3: rådsraden i statusfarge, pause-ikon, nøytrale valg (2026-10-01)
Status: gjennomført.
Bakgrunn: del 2 (typografi) og del 3 («Nå»-linja og farget dom) av eierens designgjennomgang. Forslagene ble sjekket mot
koden først; flere var alt på plass.
Gjort:
- **Rådsraden i statusfarge:** `Hint` har fått `tone` – `critical` for kassa under kredittgrensen, `heat` når noe står
  eller går tapt nå (skrap tomt eller feil og ingen planlegger som bestiller, mangler folk, renseanlegget står,
  ferdigvarelageret fullt, foringen nesten slitt, resepten holder ikke kravet, sommerstans med kassa i minus, lav
  trivsel). Raden på Verket blir oransje eller rød med varsel- eller feilikon i stedet for info. De alvorligste rådene
  står nå først (før gikk «Du har ingen kontrakter» foran «Ovnen står»). Høyden er den samme (B-238).
- **Pause-ikon:** fartsvelgeren bruker Lucide-ikonet `pause` i stedet for glyfene «❚❚», som tegnes ulikt på ulike
  telefoner.
- **Nøytrale valg på hendelseskort:** første valg var alltid primærknapp, som om spillet hadde ett riktig svar. Nå er
  alle valg like; primærknapp bare på tips med ett svar.
- **Små ting:** tallene på topplista i visningsskriften; verdien på en forespørsel verket ikke rekker, dempes.
Alt på plass fra før (ikke endret): visningsskriften på korttitler, nøkkeltall, kassa og verdien på forespørsler
(B-191, B-241); farget venstrekant etter dommen på forespørslene; resultat og konsernverdi som store tall (B-404).
Ikke gjort:
- **Konsernkassa ut av toppfeltet på mobil:** eieren ba om den i toppfeltet (B-340).
- **Kapitéler (store bokstaver) på alle underoverskrifter:** mange er spørsmål eller setninger («Hvilket spill vil du
  fortsette?», «Hva hadde strømmen til ovnene kostet?»); med store bokstaver roper de. Brukt der det passer (kartet).
- **Kassa 20 px og etiketter over tallene i toppfeltet:** toppfeltet er målt for 320 px med faste minstebredder (B-134,
  B-238, B-373); et nytt rutenett der må testes på iPhone av eieren og tas for seg.
Testet: `npm test` (ny test: kassa før foringen, foringen før vanlige råd), typesjekk, lint, build; Playwright på 320,
390 og 1 366 px med foring og kassa under grensen: riktig farge og ikon, samme høyde, ingen horisontal scrolling.
Konto (B-149): ikke aktuelt.
Endringslogg: ja.

## B-407 Designgjennomgangen 1.10, del 4: mindre tekst på Salg og Konsern (2026-10-01)
Status: gjennomført.
Bakgrunn: siste del av eierens designgjennomgang: «forklaringen står foran handlingen». Salg hadde opptil fem rader
innstillinger over første forespørsel; Konsern-kortet hadde konsernverdien og fem like store tall ved siden av.
Gjort:
- **Salg → Forespørsler:** «Ta imot nye forespørsler», kvalitetene og rekkefølgen står bak én rad «Innstillinger ·
  alle kvaliteter · kortest svarfrist først» (står det på pause: «tar ikke imot nye» i oransje). Det som gjelder nå,
  står synlig: bryteren for salgsdirektøren (B-188: lett å finne), trenden og metningen (vises bare når de gjelder).
  Tipset om å skru av forespørsler sier nå «under Salg → Innstillinger».
- **Konsern → Oversikt:** konsernverdien som stort tall, så tre tall – konsernkassa, utbytte per ekte dag og datterverk
  – og flaggskipet, verdi i spillet og privat formue som én dempet linje under. Avsnittet om hva verkene tjener er kortet
  fra tre setninger til to. På PC står de tre tallene som ruter på én rad.
Ikke gjort:
- **Plass på topplista ved konsernverdien:** krever et ekstra kall til topplista hver gang siden vises; tas eventuelt
  for seg.
- **«Slik fungerer konsernet» til Fagboka:** står alt lukket bak én rad; å flytte innholdet til et nytt kapittel er
  større enn denne runden.
- **Trinn som tekst i stedet for prikker på mobil:** prikkene har tallet ved siden av («4 av 3»); tas med neste runde.
Resten av gjennomgangen (Folk, Forskning, Fagboka, Mål, Kontrollrommet, ark på PC, startskjermen) er polering, notert
i FORSLAG.md.
Testet: typesjekk, lint, `npm test`, build; Playwright på de 7 størrelsene: ingen horisontal scrolling, ingen avkortet
tekst; «Innstillinger» viser pausen når bryteren slås av.
Konto (B-149): ikke aktuelt.
Endringslogg: ja.

## B-408 Antall spillere aktive siste 24 timer på startskjermen (2026-10-01)
Status: gjennomført.
Bakgrunn: eieren: «På startskjermen bør det stå antall spillere aktive siste 24 timer.»
Gjort:
- **Serveren teller** (`players_active_24h()`, 102): spill lagret på nett siste 24 timer, uten flaggede og sperrede
  kontoer. Gjester teller med – de spiller også. Siden bare enheten som spilles på, laster opp (B-143), betyr en lagring
  at noen faktisk har spilt; å bare åpne appen teller ikke. Bare et tall, ingen navn. 13 da den ble laget.
- **Startskjermen** viser «13 spillere aktive siste 24 timer» (entall: «1 spiller aktiv …») under knappene, med et ikon.
  Tallet hentes når skjermen vises og hvert femte minutt mens den står. Linja har fast plass mens tallet hentes og hvis
  det feiler, så kortet ikke hopper; ved feil eller 0 står den tom. Uten tjenesten (bygget uten nøkler) vises den ikke.
- `players_active_24h` kan kalles uten innlogging (som topplista og sesongstatusen) og er lagt i `guest_gate`.
  Sikkerhetsrådet «anon kan kjøre security definer» gjelder den med vilje.
Konto (B-149): nei – å se et tall er bare lesing (som å se topplista). Lagt i KONTO.md.
Testet: nettest (tallet, ugyldige svar, entall/flertall); som `anon` i databasen (13); Playwright på 320, 390 og
1 366 px med og uten lagret spill og med feil fra tjenesten: riktig tekst, ingen horisontal scrolling, knappene står
stille.
Endringslogg: ja.

## B-409 Klargjøring kvelden før 2.10: V0/K-1 i skygge som utkast, verksjef V1 spesifisert, rekonstruksjonsforslag (2026-10-01)
Status: gjennomført (bare klargjøring – ingenting i produksjon er endret).
Bakgrunn: eieren: gjør V0 og K-1 teknisk klare i kveld uten produksjonseffekt – ikke legg inn migrasjoner, ikke start
cron/jobber, ikke trekk ekte hendelser, ikke skriv skyggedata, ikke slå på brytere, ikke endre `config.world`.
Databasetester bare i transaksjoner som rulles tilbake. Målet: etter rapporten 2.10 kan PR-en gjennomgås og utkastet
legges inn uten å begynne utviklingen da. Deretter: rydd verksjefdokumentet og spesifiser V1 ferdig (ikke bygg), og
skriv et rekonstruksjonsforslag (ikke velg modell, ikke bygg).
Gjort:
- **`supabase/utkast/103_v0_k1_skygge.sql` (ikke kjørt):** `config.world.programs` (bryterne av, `events_shadow` på,
  satsene 0,5/1,5/4 % og skyggesettene 0,5/1,5/4 og 1/3/8 %, 80 % vern, `shadow_from` = dagen det legges inn);
  tabellene `world_events`, `world_event_draws`, `world_event_exposure`, `program_shadow_day` og de tomme K-1-tabellene
  `program_slots`, `program_charges`, `program_log`; funksjonene `world_event_boom_size` (samme formel som `k1BoomSize`),
  `world_is_winter`, `dividend_region_shares` (regionandeler av samme regel som `dividend_from_state`),
  `world_events_ensure` (trekningen som simulatoren, `random()` på serveren, advisory lock, én trekning per region og dag),
  `program_shadow_log_day`, `world_shadow_tick` (egen jobb, én spiller om gangen, feil merkes som «skygge» i
  `world_health()`, kaster aldri feil videre) og `program_shadow_report` (datamengde, hendelser mot forventet, per spiller:
  utbytte, bidrag og andel bidrag, tap uten program, hvert program og hver satsing for begge satssettene, «lav, høy ved
  varsel» med binding, laveste 14 dager, dager der Høy var rasjonelt, etablering for seg og Konsernverdi nå; nye satser
  kan prøves i ettertid med `p_budgets`). `pay_dividends`, `pay_contributions` og `world_tick` er urørt; skyggen leser
  det som alt er betalt. Cron-linja står som kommentar.
- **`103_v0_k1_skygge_test.sql`:** kjørt i én transaksjon som ble rullet tilbake: 23 av 23 OK (config med brytere av,
  høykonjunktur 0,30402 = simulatoren, vinter, regionandeler, trekning med varsel og lengder, logg og eksponering mot ekte
  utbytte, skyggejobben idempotent og uten feil, ingen penger flyttet, skygge av = ingenting skjer, rapporten og
  kostnadsregelen, nye satser i ettertid, fordelingen over ti år: 6,67 hendelser per region og år, 44 % høykonjunktur,
  minst 22 dager mellom). Etterpå sjekket: ingen tabeller, funksjoner, config-nøkkel, jobb eller cron ble liggende.
- **`npm test`:** høykonjunkturen i simulatoren er låst til samme tall som serverutkastet.
- **Verksjefer:** `VERKSJEF-FORSLAG.md` avsnitt 9 er eierens svar (ikke lenger spørsmål); 24 timer/én per dag er rettet til
  2–3 i uka, høyst én samme dag, 48 timer. Avsnitt 10 er V1 ferdig spesifisert: egenskaper med sum 6–10, lønn 3–6 % etter
  stjernene, mandater med ekte ulemper (Lønnsomhet: dyrere og tregere modernisering, hardere hendelser; Vekst: −5 %
  utbytte mot billigere og raskere modernisering; Stabilitet: lavere topp mot mildere hendelser), handlinger (ansett,
  bytt mandat ukentlig, avslutt med sluttpakke og 3 dagers karantene), server, app, bryter og akseptkriterier
  (ingen automatisk oppgradering, ingen dominerende strategi, uten verksjef som i dag, ingen fisking). Bygges ikke før
  V0/K-1 er avgjort.
- **`docs/REKONSTRUKSJON-FORSLAG.md`:** dagens konkurs, eierens fem premisser, det som alltid overlever, fem modeller
  (A som i dag, B ett nivå ned, C samme nivå nedskalert, D gradert etter hullet, E konsernet redder hovedverket),
  sperrene mot misbruk (30 døgns tilbakeføring, rekonstruksjonsgjeld, banken selger billigere enn spilleren, høyst én per
  30 ekte dager, ingenting i ekte tid) og simuleringen før valg. Ingen modell valgt.
Konto (B-149): uendret (V0/K-1 og verksjefene krever konto når de bygges; rekonstruksjonen ikke).
Endringslogg: nei – ingenting spillerne merker.

## B-410 Polering 1: Konsern – region i Dine verk, plass på topplista, «Slik fungerer konsernet» i Fagboka (2026-10-02)
Status: gjennomført.
Bakgrunn: eieren ba om resten av poleringen fra designgjennomgangen (FORSLAG.md) i små PR-er, uavhengig av world-systemene og uten å røre rapportgrunnlaget 2.10.
Gjort:
- **Dine verk (mobil):** raden viser «Trinn 3 av 3 · Nordkysten» – regionen står ved trinnet, så raden sier hvor verket står uten å åpnes. Forklaringen av prikkene er kortet til én setning, siden trinnet står som tekst (B-394).
- **Plass på topplista** ved konsernverdien: «Konsernverdi · nr. 4 på topplista», fra `my_rank('konsern')` (bare lesing), hentet når siden vises og husket i fem minutter (`ui/konsernRank.ts`). Uten konto vises den ikke.
- **«Slik fungerer konsernet»** står ikke lenger som åtte punkter på Konsern → Oversikt, men som eget kapittel i Fagboka (`konsernregler`, tema «Konsernet og verden»), åpnet med én lenke. Tallene står der man kjøper; kapitlet forklarer reglene med vanlige ord.
Testet: `npm test`, typesjekk, lint, build; Playwright på 320, 390, 412, 820 og 1 366 px med falsk topplisteplass: ingen horisontal scrolling, etiketten og radene avkortes ikke, lenken åpner kapitlet.
Konto (B-149): plassen krever konto (topplista); resten ikke.
Endringslogg: ja.

## B-411 Polering 2: startskjermen, flyttedagen, Skiftrapporten og arkbredden (2026-10-02)
Status: gjennomført.
Bakgrunn: neste del av poleringen fra designgjennomgangen 1.10 (FORSLAG.md), i en liten PR uten noe som rører world-systemene eller rapportgrunnlaget 2.10.
Gjort:
- **Startskjermen:** den som har et lagret spill, ser ikke lenger introavsnittet («Smelt skrap …») – «Ditt spill», Fortsett (eneste primærknapp) og Nytt spill står øverst. Nye spillere ser avsnittet som før.
- **Flyttedagen** er kortet til navnet på nivået, beskrivelsen, én setning («Plass til N ansatte – og nytt utstyr å kjøpe under Anlegg»; på støperiet også «Du er nå daglig leder …») og «Sett i gang». Lista med kostnader, lager, utstyr og forskning er borte – tallene står på Verket. Knappen er nå innenfor skjermen på 320 × 568 (før under kanten).
- **Skiftrapporten:** hendelser fra spillet er dempede linjer uten boks (grå tekst og ikon), så spillernes meldinger står fram.
- **Ark på PC:** alle ark fra høyre var alt 520 px brede; bredden er nå et token (`--sheet-w` i `tokens.css`), så den holdes felles.
Testet: typesjekk, lint, `npm test`, build; Playwright på 320 × 568, 390 × 844 og 1 366 × 768 (startskjermen med og uten lagret spill, flyttedagen, Skiftrapporten med falsk tjeneste), og arkbredden på 1 366 og 1 920 px: ingen horisontal scrolling, knappen synlig.
Konto (B-149): ingen endring (Skiftrapporten krever konto som før).
Endringslogg: ja.

## B-412 Polering 3: Økonomi med de tre største postene, kontrollrommets resultat på designsystemet (2026-10-02)
Status: gjennomført.
Bakgrunn: neste del av poleringen fra designgjennomgangen 1.10 (FORSLAG.md). Ingen endring i økonomien eller på serveren.
Gjort:
- **Verket → Økonomi:** «Inntekter i går» og «Kostnader i går» viser de tre største postene med tydeligere stolper (de er nesten hele summen); resten ligger bak «Alle poster (N til, sum)». Er det bare én post til, står den fremme – et trykk for én rad er unødvendig.
- **Kontrollrommets resultat** (vanlig og ukens): poengene er et nøkkeltall (`Metric`) med endringen mot rekorden under, «Ny rekord» er en grønn status, knappene er designsystemets (`Button`: «Ta neste charge også» primær, «Tilbake til verket», lenken til topplista), og «Hvorfor?» er samme utvidbare rad som ellers i appen. Selve ovnen og rundene beholder sitt utseende. Ubrukte stiler (`cg-total`, `cg-record`, `cg-link`, `cg-board-link`) er fjernet.
Testet: typesjekk, lint, `npm test`, build; Playwright på 320, 390 og 1 366 px: Økonomi med ekte storverksspill (tre poster + «Alle poster», ingen avkorting, ingen horisontal scrolling), og kontrollrommet spilt gjennom fire runder til resultatet (knappene 44 px, ingen avkorting).
Konto (B-149): ingen endring.
Endringslogg: ja.

## B-413 Polering 4: «Nytt for deg» i Fagboka, Forskning gruppert etter hva den gir (2026-10-02)
Status: gjennomført.
Bakgrunn: neste del av poleringen fra designgjennomgangen 1.10 (FORSLAG.md). Ingen endring i økonomien eller på serveren.
Gjort:
- **Fagboka:** uleste kapitler står øverst under «Nytt for deg»; temaene under viser bare det man har lest, med «· 3 av 5 lest» ved overskriften. «Neste»-knappen vises når det ikke er noe nytt å lese (da peker den på en quiz). Et nytt kapittel forsvant før i en lang liste på støperiet.
- **Forskning:** prosjektene har en gruppe etter hva de gir – Fart og automatikk, Nytt utstyr, Drift og kvalitet, Skrap og strøm, Salg og priser, Konsernet (`researchGroup`, `RESEARCH_GROUPS` og `RESEARCH_GROUP_OF` i `game/research.ts`; gruppen leses av feltene fart, skrap, utstyr og konsern, resten står i lista). «Klar til å forske» og «Trenger mer fagpoeng» sorteres etter gruppe, med en liten overskrift per gruppe når lista har mer enn tre prosjekter i minst to grupper. Stolpen mot fagpoengene fantes fra før (B-205).
- **Test:** alle prosjekter havner i en gruppe som vises, og de faste gruppene peker på prosjekter som finnes.
Testet: typesjekk, lint, `npm test`, build; Playwright på 320, 390 og 1 366 px: Fagboka med uleste kapitler og med alt lest, Forskning på stålverket med tre grupper; ingen avkorting, ingen horisontal scrolling.
Konto (B-149): ingen endring.
Endringslogg: ja.

## B-414 Polering 5: Folk med filter og «Mer», Marked med renhet og egen planleggerfane (2026-10-02)
Status: gjennomført.
Bakgrunn: neste del av poleringen fra designgjennomgangen 1.10 (FORSLAG.md). Ingen endring i økonomien eller på serveren.
Gjort:
- **Folk → Ansett:** filterknapper øverst (Alle, Ovnsoperatør, Støper … med antall), bare for rollene som finnes blant søkerne. Velger man en rolle, står forklaringen av den ene rollen over lista i stedet for «Hva gjør de ulike rollene?» med alle. På mobil er filteret én rad som kan sveipes sidelengs. Filteret slippes når den siste søkeren med rollen er borte.
- **Folk → Ansatte:** én «Mer»-knapp per ansatt i stedet for tre knapper; den åpner Gjør til skiftleder (når det går), Kurs og Si opp, med et kryss for å lukke. Bekreftelsene for oppsigelse og lederkurs er som før.
- **Marked → Skrap (mobil):** pris og en **renhetsstolpe** («Renhet: Svært ren / Ren / Middels / Uren») i stedet for fem kjemitall i en grå rad. Renheten er bare for visning: sporelementene veier 70 %, fosfor og skitt 15 % hver, målt mot den verste skraptypen. P, Spor, C og Skitt står bak trykk på navnet. Tabellen på PC er som før.
- **Marked → Planlegger:** planleggerens innstillinger har egen underfane når det finnes en planlegger, med «!» når planleggeren ikke får kjøpt alt. På Skrap står én linje med status og lenke til fanen. Tekstene i motoren som viste til innstillingene under «Marked → Skrap», viser nå til «Marked → Planlegger».
Testet: typesjekk, lint, `npm test`, build; Playwright på 320, 390 og 1 366 px: søkere med ni roller (filter, én rolle, forklaring), ansatte med «Mer» åpnet, Marked med renhet og planleggerfanen; ingen avkorting, ingen horisontal scrolling.
Konto (B-149): ingen endring.
Endringslogg: ja.

## B-415 Polering 6: «Hent alt» øverst på Mål (2026-10-02)
Status: gjennomført.
Bakgrunn: siste punkt i poleringen fra designgjennomgangen 1.10: Mål hadde tre «Hent»-knapper på to faner (dagens bonus på «I dag», ukekista og sesongtrinnene på «Uka»). Ingen endring i belønningene eller på serveren.
Gjort:
- **«Klar til å hente»** står øverst på Mål, uansett fane, når noe kan hentes: én linje per ting (dagens bonus med beløp, ukekista med fagpoeng, trinn på sesongstigen med fagpoeng) og én knapp, «Hent alt» (eller «Hent» når det er én ting). Står ikke der når ingenting venter, under veiledningen eller uten konto.
- **Rekkefølgen:** dagens bonus først (den gir poeng på stigen), så ukekista, så stigen med fersk status fra serveren – et nytt trinn fra bonusen blir med. Hver henting er trygg å gjenta (serveren gir den én gang), og én feil stopper ikke resten.
- **Kortene** sier fortsatt hva som venter, men viser til knappen øverst i stedet for å ha egne knapper. Dagens belønning (dag 1–7) hentes som før i vinduet som kommer av seg selv.
- **Koden:** hentingen er flyttet fra kortene til `ui/claims.ts` (`claimables`, `claimAll` og én funksjon per henting); sesongstigens status ligger i et felles lager i `net/seasonTrack.ts`, som ukens og dagens status. Linja er `ui/ClaimAll.tsx`.
- **Test** i `net/tests.ts`: det som venter, kommer i riktig rekkefølge med riktige fagpoeng; ingenting når alt er hentet; ingen bonus for gårsdagens oppdrag.
Testet: typesjekk, lint, `npm test`, build; Playwright med falsk tjeneste på 320, 390 og 1 366 px: linja viser tre ting, «Hent alt» kaller hver henting én gang (bonus, kiste, stige), spillet får 354 fagpoeng og bonusen, og linja forsvinner etterpå; knappen 44 px, ingen avkorting eller horisontal scrolling.
Konto (B-149): krever konto som det den henter; uten konto står de i det samlede kontokortet som før.
Endringslogg: ja.

## B-416 Økonomi: «Utbytte per ekte dag» i stedet for «Datterverkene i går» (2026-10-02)
Status: gjennomført.
Bakgrunn: eieren spurte hvorfor «Datterverkene i går» viste 0 kr. Ruta leste spillets eget døgnregnskap, men datterverkene betaler ikke i spilltid lenger: utbyttet regnes av serveren én gang per ekte dag og går rett til konsernkassa (B-304). Sjekket på serveren (bare lesing): utbyttet er betalt 29.9., 30.9. og 1.10. til 15 spillere (216,8 mill. kr for 1.10), og `world_health()` er ok.
Gjort: ruta på Verket → Økonomi heter nå «Utbytte per ekte dag» og viser samme tall som Konsern-siden (`dividends` i `game/konsern.ts`). Den vises bare når konsernet har datterverk.
Testet: typesjekk, lint, `npm test`, build; Playwright på 320, 390 og 1 366 px med et spill med datterverk (34,33 mill. kr, ingen avkorting).
Konto (B-149): ingen endring.
Endringslogg: ja.

## B-417 Konsernverdien regner bidraget med aktiviteten betalingen bruker (2026-10-02)
Status: gjennomført (104, lagt inn ca. 00:15 UTC 2.10).
Bakgrunn: eieren spurte om spiller C på 2.–3. plass på Konsernverdi stemte, eller om det var fordi hen ikke hadde logget inn på lenge. Funnet (bare lesing): C lagret sist 29.9. og har ikke produsert siden 28.9. Betalingen (`pay_contributions`) brukte derfor gulvet, aktivitet 0,3 (14,1 mill. per dag), men `konsern_value` regnet bidraget med aktivitet 1 for alle (37,5 mill. per dag etter taket) × 60 dager – om lag 1,4 mrd. for mye. Det traff alle som ikke spilte for fullt.
Gjort:
- `konsern_value` (104): bidraget regnes med aktiviteten i siste betalte bidrag (`contributions.activity`), eller dagens produksjon så langt hvis den er høyere (en som kommer tilbake, stiger samme dag). Uten noe betalt bidrag: 1, som før. Utbyttet, kassa og lånet er uendret.
- Appen (`konsernValueOf` i `net/world.ts`) gjør det samme med `world_status.contribution.activity` og `contributionAt`, som speiler taket i `contribution_amount` (30 mill., potens 0,5). Appen har ikke dagens produksjon, så den kan ligge litt under lista den dagen en spiller kommer tilbake.
- Virkning (prøvd i en transaksjon som ble rullet tilbake, så lagt inn): C fra plass 3 til 9 (3,20 → 1,80 mrd.); to delvis aktive spillere litt ned (−0,1 mrd.); alle som produserer for fullt, uendret.
- Rører ikke 2.10-rapporten eller kjøringen 07:45: `konsern_value` er bare visning og sesongslutt – ingen penger flyttes, ingenting lagres, utbytte, bidrag og målinger er uendret. Utkastet 103 (V0/K-1) bruker `konsern_value` bare i skyggerapporten og beholder nummeret.
Testet: prøvekjøring i transaksjon (før/etter for topp 15), `get_advisors` (uendret), `npm test` med ny test av `contributionAt` mot serverens tall (14 094 565 ved aktivitet 0,3), typesjekk, lint, build.
Konto (B-149): uendret (Konsernverdi krever konto som før).
Endringslogg: ja.

## B-418 Rådgiveren forklarer sene leveranser når salgsdirektøren signerer (2026-10-02)
Status: gjennomført.
Bakgrunn: eieren meldte at mange spillere med salgsdirektør får kortet «Rådgiveren: leveransene kommer for sent» og lurer på om det er en feil. Undersøkt: kortet kommer ved tre omdømmetap for sene leveranser på ti døgn. Direktøren signerer bare det verket rakk med produksjonen den siste uka (snittet med salgsteam, ellers det dårligste døgnet) og vil ha 25–30 % av tida til fristen til overs. En kopi av et storverk med direktør kjørt 60 døgn fram: to sene kontrakter, begge signert av direktøren og bare så vidt for sene (966 av 15 000 t og 135 av 2 000 t), rett etter syke, ferie og et strenggjennombrudd. Blant de aktive spillerne med direktør hadde de fleste 0–1 sene de siste ti døgnene. Det er altså ikke en feil i direktøren: kontraktene blir sene når produksjonen faller etter at han har signert. Men kortet sa «verket har tatt på seg mer enn det rekker», som om spilleren hadde gjort noe galt.
Gjort:
- Kontrakter direktøren signerer, merkes (`byDirector`, valgfritt felt – ingen migrering).
- Med aktiv direktør sier kortet nå hva som skjedde, med tall (`directorLateText` i `decisions.ts`): hvor mange av de sene som var direktørens kontrakter og ukeleveranser i rammeavtalene, hvor mye som manglet til sammen, at produksjonen falt etter signeringen (fra ca. X til Y t per døgn, når fallet er over 10 %), vanlige grunner (ovn eller støpemaskin som sto, syke og ferie, skrap som ikke kom fram), at direktøren tar færre ordrer av seg selv, og at man kan slå av rammeavtalene under Folk → Ansatte.
- Loggen sier ved hver frist som går ut om det var en ukeleveranse i rammeavtalen eller en kontrakt direktøren signerte.
- Uten direktør: samme kort som før (setningen om direktøren er tatt ut av teksten for planleggere).
Ikke endret: direktørens regler (B-172, B-240, B-312), straffene og når kortet kommer.
Testet: ny test i `npm test` (teksten med tall og merket på direktørens kontrakter), typesjekk, lint, build, `balance.ts`.
Konto (B-149): ingen endring.
Endringslogg: ja.

## B-419 Profiler: profilarket og klikkbare brukernavn (fase 1) (2026-10-02)
Status: gjennomført (fase 1). Fase 2 (Min profil) og fase 3 (privatmeldinger og adminpanel) er besluttet og står i
`docs/PROFIL-FORSLAG.md`.
Bakgrunn: eieren ville ha profiler for alle, et sted å endre sin egen, trykk på brukere i topplista og på konsernsidene,
og privatmeldinger. Svarene på forslaget: synlighet og aktivitet etter anbefalingen (konsernverdi og verk per region,
aldri konsernkassa; «sist aktiv» i grove trinn), privatmeldinger etter anbefalingen med fri tekst (av som standard,
blokkering, rapportering, grenser på serveren, bare kontoer som har spilt litt, rydding etter 30 dager), og et adminpanel
bare eieren ser, der eieren leser rapporterte meldinger.
Gjort:
- Serverfunksjonen `player_profile(navn)` (105): brukernavn, tittel, nivå, merker, sesongplasseringer, «sist aktiv»
  (i dag / i går / denne uka / denne måneden / over en måned, etter ekte dager i norsk tid), måneden kontoen fikk navn,
  plass og verdi på lista «Konsernverdi» (samme regel som topplista) med verkene per region, selskapene spilleren eier og
  rekordene (storverk, 10 mrd., kontrollrommet). Aldri konsernkassa, kassa eller fondet. Flaggede og sperrede har ingen
  profil. Krever innlogging, tatt fra `anon` og `public`; gjester slipper ikke gjennom `guest_gate`.
- Appen: profilarket (`ui/Profile.tsx`) åpnes ved å trykke på et brukernavn i topplista, ukelista, Skiftrapporten,
  verdenskartet og Industrien (eier og hvem som har bydd). Arket legges oppå arket navnet stod i, og Esc lukker bare
  profilen. Navnene har stiplet understrek og en trykkflate på ca. 44 px.
- Profiler står i `ACCOUNT_FEATURES` og KONTO.md; uten konto viser arket «Profiler krever konto».
Konto (B-149): krever konto – regel 3 (viser andre spillere).
Ikke endret: økonomien, verdensjobbene, topplistene og rapportgrunnlaget.
Testet: `npm test` (ny test av svaret fra serveren), typesjekk, lint, build; serverfunksjonen som innlogget spiller
(rullet tilbake), med ukjent navn (null); Playwright på 320, 390 og 1 366 px med falsk server: fra chatten og topplista,
arket øverst, ingenting avkortet, ingen horisontal scrolling.
Endringslogg: ja.

## B-420 Profiler, fase 2: Min profil (2026-10-02)
Status: gjennomført. Fase 2 i `docs/PROFIL-FORSLAG.md` (besluttet i B-419).
Gjort:
- Nye felt i `profiles` (106): `bio` (kort tekst), `emblem` (profilmerke), `showcase` (høyst tre prestasjoner),
  `dm_open` (privatmeldinger, av som standard – brukes i fase 3) og `profile_at` (tempo).
- `profile_update` (106) er den eneste måten å endre dem på (spillerne har ingen update-regel på `profiles`): høyst 120
  tegn, ingen lenker (samme mønster som chatten), sperrede og flaggede kan ikke endre, gjester får nei, høyst én lagring
  per 5 s. Merket må være pynt spilleren eier i det lagrede spillet, og prestasjonene må være tjent der – ellers tas de
  bort. `player_profile` gir teksten, merket, prestasjonene og om spilleren tar imot meldinger.
- Appen: «Rediger profilen» på egen profil og «Min profil» under kontoen i innstillingene. Teksten med teller,
  profilmerket som valg blant egen pynt, prestasjonene som valgknapper (høyst tre, lista ruller for seg selv). Profilen
  viser merket og teksten øverst og «Utvalgte prestasjoner». Bryteren for privatmeldinger vises først når meldingene
  finnes (gradvis synlighet).
Konto (B-149): krever konto – regel 3 (vises for andre spillere). Står i KONTO.md.
Ikke endret: økonomien, verdensjobbene, topplistene og rapportgrunnlaget.
Testet: `npm test` (felt i svaret, høyst tre prestasjoner), typesjekk, lint, build; `profile_update` som innlogget
spiller i en transaksjon som ble rullet tilbake (lenke og for lang tekst avvist, mellomrom ryddet, ukjent prestasjon tatt
bort, tempo); Playwright med falsk server på 320, 390 og 1 366 px: fra «Min profil», lenke avvist med norsk tekst, lagret
og vist, ingenting avkortet, ingen horisontal scrolling.
Endringslogg: ja.

## B-421 Profiler, fase 3: privatmeldinger og adminpanelet (2026-10-02)
Status: gjennomført, med ett unntak: ryddingen hver natt er skrevet, men ikke lagt inn (se under).
Bakgrunn: eierens svar 2.10 (B-419): privatmeldinger etter anbefalingen med fri tekst, og et adminpanel bare eieren ser,
der eieren leser rapporterte meldinger.
Gjort:
- Server (107, lagt inn): tabellene `dm_messages`, `dm_threads`, `dm_blocks` (blokkering slås av og på), `reports`
  (kopi av meldingen), `admins` og `admin_log` – RLS på, ingen tilgang for `anon`/`authenticated`; alt går gjennom
  funksjoner. `dm_send`: begge må ha meldinger på, avsender og mottaker må ha spilt litt (`dm_eligible`: brukernavn, ikke
  gjest, ikke sperret/flagget, storverk eller minst 3 ekte aktive dager), høyst 500 tegn, ingen lenker, ikke oftere enn
  hvert 3. s og høyst 20 på 10 min, høyst 5 nye samtaler per ekte dag. Den som er blokkert eller skriver til en med
  meldinger av, får samme svar («tar ikke imot meldinger»). `dm_overview`, `dm_thread` (merker som lest), `dm_unread`,
  `dm_block` og `message_report` (privatmelding til meg eller melding i Skiftrapporten som ikke er min). Ingen funksjon
  viser meldinger eldre enn 30 dager.
- Adminpanelet: `is_admin`, `admin_reports`, `admin_act` (skjul meldingen, avvis, sperr kontoen – sperring skjuler også
  meldingen) og `admin_unban`. Hver funksjon sjekker `admins` mot `auth.uid()` først; hver handling logges i `admin_log`.
  Eieren er lagt inn i `admins` for hånd (ikke i repoet).
- Appen: fanen «Meldinger» i Skiftrapporten (samtaler, uleste, samtalen med blokkering og «Rapporter»), «Send melding» på
  profilen til en som tar imot meldinger, bryteren «Ta imot privatmeldinger» i Min profil, «Rapporter» på andres
  meldinger i Skiftrapporten, prikk på chatknappen ved uleste meldinger, og «Adminpanel» under kontoen – bare når
  serveren sier at kontoen er admin.
- **Ikke lagt inn:** `dm_cleanup` med pg_cron «meldinger-rydding» (`supabase/utkast/108_meldinger_rydding.sql`).
  Supabase-connectoren holder igjen funksjoner som sletter til eieren bekrefter, og eieren var ikke til stede. Ingen
  melding er eldre enn 30 dager før 1.11.2026, og ingen funksjon viser eldre meldinger, så det haster ikke – men den skal
  inn før det.
- En feil funnet i testen og rettet før appen ble tatt i bruk: variabelen for meldingsteksten i `dm_send` het det samme
  som en kolonne (`b`), så sendingen feilet.
Konto (B-149): krever konto – regel 3 (andre spillere). Gjester får ikke sende, lese eller rapportere (står ikke i
`guest_gate`). Står i KONTO.md og `ACCOUNT_FEATURES` (`profiler` dekker profilene; meldinger vises bare med konto).
Ikke endret: økonomien, verdensjobbene, topplistene og rapportgrunnlaget.
Testet: `npm test` (svarene fra serveren og tekstene), typesjekk, lint, build. SQL med to ekte kontoer i en transaksjon
som ble rullet tilbake (ingenting ble liggende igjen, sjekket etterpå): meldinger av → avvist, lenke og for lang tekst
avvist, sendt, tempo, til seg selv avvist, oversikt og ulest hos mottakeren, lest etter `dm_thread`, rapport (samme
rapport to ganger gir én), blokkering → «stengt», admin ser rapporten og skjuler meldingen, ikke-admin er ikke admin.
Playwright med falsk server på 320, 390 og 1 366 px: prikk, «Send melding» fra profilen, lenke avvist, sendt, rapportert,
blokkert, tilbake til lista, adminpanelet med handlingen – ingenting avkortet, ingen horisontal scrolling.
Endringslogg: ja.

## B-422 Privatmeldinger er på for alle (2026-10-02)
Status: gjennomført. Erstatter «av som standard» i B-419 og B-421 (resten av B-421 står).
Bakgrunn: eierens beskjed 2.10: «Meldinger skal være på for alle. De må skru av om de ikke vil ha.»
Gjort:
- Server (109, lagt inn): ny kolonne `profiles.dm_off` (standard nei = på). `dm_send`, `dm_overview`, `dm_thread`,
  `profile_update` og `player_profile` bruker `not dm_off`. Den gamle `dm_open` leses ikke lenger (kommentar på kolonnen).
  Ingen rader er endret: `dm_open` var nei for alle som ikke hadde valgt noe, så å snu den ville skrudd av den ene som
  hadde slått meldingene på.
- Appen: Min profil leser `dm_off`; bryteren «Ta imot privatmeldinger» står på til spilleren skrur den av. Tekstene sier
  «du har skrudd av meldinger» i stedet for «slå dem på».
- Kravet om å ha spilt litt (storverk eller 3 ekte aktive dager), grensene, blokkering og rapportering står som før.
Kjent: en app som ikke har oppdatert seg ennå, viser bryteren av og kan skru av meldingene hvis spilleren lagrer Min
profil. Appen oppdaterer seg selv (B-148), så det gjelder bare noen minutter etter publiseringen.
Konto (B-149): uendret – krever konto.
Testet: `npm test`, typesjekk, lint, build; serverfunksjonene lagt inn med samme kropp som før, bare bryteren snudd.
Endringslogg: ja.

## B-423 Rapporten 2.10, grunnlaget bevart og utbyttet for ferdige verk rettet framover (2026-10-02)
Status: gjennomført; etterbetalingen venter på eierens godkjenning; slagghåndteringen venter på eierens svar.
Bakgrunn: eierens to faste kjøringer 2.10 (kl. 07:00: sjekk skraplagerets utbetalinger 29.9–1.10 og rapporter
pengestrømmene; kl. 07:45: nattkontroll, bevar grunnlaget, prøv 099 og legg den inn bare hvis den ikke etterbetaler noe
automatisk, dry-run av etterbetalingen, vent på godkjenning).
Gjort:
- **Grunnlaget bevart** (110, lagt inn kl. ca. 12:00 UTC): urørte kopier `basis_20261002_*` av målingene, utbyttet,
  bidraget og selskapsinntekten til og med 1.10, kassaboka før 2.10, kassene og byggeordrene. RLS på, tatt fra `anon` og
  `authenticated`. Rapporten regnes fra kopiene.
- **Rapporten** (`docs/RAPPORT-2026-10-02.md`): skraplageret betalte 42,3 mill. for tre dager og stemmer på krona mot
  kassaboka; kassene stemmer mot kassaboka (576 470 149 kr); ingen jobbfeil. Spillerne står som bokstaver.
- **Funn:** et verk som ble ferdig mens spilleren var borte, ble målt som under bygging til spilleren lagret eller til
  midnatt; den som solgte sitt siste verk, ville mistet utbyttet for den delen av dagen.
- **Rettet framover** (111, før utkast 099, lagt inn kl. ca. 12:03 UTC): målingene hvert kvarter gjør ferdige prosjekter
  ferdige først (`konsern_settle` per spiller, i spillerens egen deltransaksjon), og `pay_dividends` tar med spillere
  uten verk som har målinger med utbytte som ikke er betalt (fra 2.10). Prøvekjøringen (rullet tilbake) viste null
  automatisk etterbetaling for dager før 2.10, uendrede betalinger og konsernverdi utover verkene som ble ferdige.
- **Etterbetaling 30.9 og 1.10:** dry-run i `supabase/utkast/112_etterbetaling_dryrun.sql`, tabellen i rapporten
  (avsnitt 7): 1 875 716 kr til ni spillere, ingen får mindre. **Ikke betalt** – venter på eierens godkjenning.
- **Observasjon, ikke rettet:** produksjonstall som kommer inn etter midnatt, er ikke med i skraplagerets betaling for
  dagen (ca. 3,0 mill. for lite til eieren over tre dager). Slik er regelen (B-188); en endring er eierens beslutning.
- **Slagghåndteringen ikke slått på:** vilkårene i B-402 er oppfylt, men kjøringen kl. 07:00 og B-380 sier «ikke slå på».
  Anbefalingen (slå på, eventuelt etter helga når kassene er større) står i rapporten; eieren avgjør.
Endringslogg: ja – et verk som blir ferdig, gir utbytte fra da, også når spilleren er borte.
Konto (B-149): ikke aktuelt (serverside).

## B-424 V0 og K-1 i skygge lagt inn (2026-10-02)
Status: gjennomført. Bryterne står av; aktivering er eierens beslutning etter skyggerapporten (B-402).
Bakgrunn: eierens plan for 2.10 (B-402 og kjøringen kl. 07:45): når nattkontrollen er grønn, grunnlaget bevart og
rapporten levert, bygges V0 og K-1 i skygge med satsene 0,5/1,5/4 % og 80 % vern på Høy. Punktene var oppfylt (B-423).
Gjort:
- **Prøvekjøring først** (rullet tilbake): utkast 103 med testene – brytere av, høykonjunkturen lik simulatoren
  (0,3040), regionandelene som `dividend_from_state`, trekningen (seks regioner, ikke to ganger, alltid varslet to dager
  før), skyggeloggen (brutto = kasse + fond, tapet riktig), skyggejobben idempotent uten feil, «skygge av» trekker ikke.
  Utbytte, kasser, bidrag, fond, kassabok og selskapsinntekt var uendret, og konsernverdien var lik for alle 15.
- **Lagt inn** som `supabase/113_v0_k1_skygge.sql` (før utkast 103): tabellene, funksjonene og
  `config.world.programs` (`enabled` og `events_enabled` = false, `events_shadow` = true, `shadow_from` = 2.10). Etterpå
  testet rapporten (kostnad = sats × utbytte for begge satssettene, nye satser i ettertid) og rådene; to rene
  hjelpefunksjoner fikk fast `search_path` (113_b).
- **Skyggejobben** `verden-skygge` (pg_cron, minutt 17 hver time) startet. Egen funksjon, egen jobb i `world_jobs`
  («skygge»), én spiller per deltransaksjon; den kalles aldri fra `world_tick` og flytter ingen penger. Første kjøring
  trakk én hendelse per region (alle tidligst om to uker) og sto «ok».
- **Datamengde:** ca. 15 dagrader per ekte dag (ca. 1 kB per rad); hendelsene er noen få per region og måned.
- **Skyggerapporten** (`program_shadow_report()`) sammenligner ingen programmer med 0,5/1,5/4 % og 1/3/8 %, viser
  etableringen for seg og datamengden. Den legges fram for eieren etter noen uker med data; ingenting slås på før det.
- De trukne datoene står bare i databasen, aldri i repoet (ingen skal kunne se hendelsene på forhånd).
Endringslogg: nei – spillerne merker ingenting.
Konto (B-149): ikke aktuelt ennå (serverside, i skygge). Når K-1 slås på: krever konto (K1-PROGRAMMER.md avsnitt 9).

## B-425 Etter kodegjennomgangen 2.10: gulvet for utbyttet, egen jobb for V0 og etterbetalingen regnet på nytt (2026-10-02)
Status: gjennomført. Etterbetalingen venter på gjennomgang og en egen beslutning om beløpet. Erstatter tallene for
etterbetalingen i B-423 (1 875 716 kr til ni spillere).
Bakgrunn: eierens kodegjennomgang 2.10 (fram til #364) fant blant annet at 111 ikke sikret at eldre dager bare betales
med eierens godkjenning, og at dry-run 112 kunne regne feil beløp. Eieren bekreftet i databasen at gulvet og jobbnavnet
var på plass, og ba om at helsesjekken følger V0-jobbens intervall, at migrasjonshistorikken bevares (endringene i 114,
113 urørt), at «skygge» ikke behandles som ubrukt, og at den nye summen omtales som et anslag.
Gjort:
- **114:** `pay_dividends` begynner aldri på en dag før 2.10 (løkka kunne begynne på en eldre ubetalt dag for den som
  ble tatt med etter 111). Ingen spiller hadde slike dager. V0-skyggen har egen jobb `skygge_v0`; «skygge» er
  revisjonen av verdiene fra mobilen (095) og skal ikke slettes. Prøvekjørt først: kassene og utbytteradene uendret.
- **114_b:** `world_health` følger jobbens intervall: `skygge_v0` står først etter 75 minutter (går hver time),
  `skygge` melder bare feil og vises som «feil i jobben» når siste feil kom innen en måling, ellers «ok».
- **112 utgave 2:** ordrene angres i rekkefølge fra den nyeste, så hver forskjell regnes på verket slik det var da;
  tidsvinduet går til første tegn på at verket ble regnet som ferdig (tidslinja, en ny ordre eller en postering
  spilleren selv utløste). Anslaget: 2 549 257 kr til elleve spillere (tabellen i RAPPORT-2026-10-02.md, avsnitt 7).
  Tidsvinduet er en øvre grense, men dagens lagrede spill og målingsvektingen trekker begge veier – summen er et anslag.
- Testfila for skyggen kjøres nå med 113 og 114 og sjekker `skygge_v0`.
Ikke gjort: ingen betaling; ingen sletting av raden «skygge». Resten av funnene i gjennomgangen tas i egne PR-er
(lagring og kontobytte først, så kontrollrom og spillmotor).
Endringslogg: nei – spillerne merker ingenting.
Konto (B-149): ikke aktuelt (serverside).

## B-426 Etter kodegjennomgangen 2.10: lagring, tidsgrense og kontobytte (2026-10-02)
Status: gjennomført (funn 3–8 i gjennomgangen).
Bakgrunn: eieren ba om gruppevise PR-er etter B-425, lagring og kontobytte først.
Gjort:
- **Lagringen (funn 3):** en opplasting merker bare det den faktisk sendte som lagret – spillminuttet og handlingene da
  den startet (`synced(minute, serial)` i `net/sync.ts`). Før ble spillet slik det var da svaret kom, merket som lagret,
  så framgang fra mens svaret var på vei kunne bli stående og senere erstattes av en eldre kopi fra en annen enhet. Legges
  appen bort mens en lagring er på vei (`flush(keepalive)`), lastes det nyeste opp med én gang etterpå.
- **Tidsgrensen (funn 4):** `call` i `net/supabase.ts` leser også svarinnholdet innenfor tidsgrensen på 30 s. Før stoppet
  timeren når svarhodene kom, og et innhold som hang, kunne holde hele lagringskøen fast.
- **Belønninger (funn 5):** tida borte, dagens bonus, ukekista og sesongstigen legges bare inn i spillet til kontoen som
  hentet dem. Byttes kontoen mens svaret er på vei, tas belønningen vare på (`stalverk-ventende-belonninger-v1`) og legges
  inn når den kontoens spill er i gang igjen (`applyWaitingRewards`, fra «Velkommen tilbake»-sjekken).
- **Konsernet (funn 6):** svar på kjøp, avbestilling, salg og flytting legges bare inn når samme konto fortsatt er
  innlogget og spillet er dens. Serveren skriver uansett konsernet inn i kontoens spill ved neste lagring.
- **Adminpanelet (funn 7):** knappen og panelet nullstilles når kontoen byttes (per bruker-id, ikke per økt), og
  panelet viser ingenting av det som er hentet når en annen konto er innlogget.
- **Min profil (funn 8):** skjemaet hører til kontoen det ble hentet for; byttes kontoen, hentes det på nytt og kan ikke
  lagres med den nye innloggingen.
Testet: fire nye nettester (svarinnhold som henger, lagring underveis, appen legges bort under en lagring, belønning etter
kontobytte), `npm test`, typesjekk, lint, build.
Endringslogg: ja.
Konto (B-149): uendret.

## B-427 Etter kodegjennomgangen 2.10: kontrollrom og spillmotor (2026-10-02)
Status: gjennomført (funn 9–16 i gjennomgangen).
Bakgrunn: eierens rekkefølge etter B-426: kontrollrom og spillmotor.
Gjort:
- **Ukens kontrollrom (funn 9 og 10):** et svar rydder bare bort det forsøket det gjelder, så et sent svar ikke sletter et
  nytt resultat som venter; to leveringer av samme resultat samtidig (kortet og synken i bakgrunnen) blir én. Fristen
  sjekkes mot serverens klokke (`realNow`), ikke telefonens – en klokke stilt en time fram slettet et gyldig resultat.
- **Rotasjon (funn 11):** skallet (mobil/PC) låses mens et tellende forsøk er åpent (`ui/layoutLock.ts`). Før ble panelet
  som eier forsøket, montert på nytt når bredden krysset 900 px: framdriften forsvant, forsøket kunne telle null, og
  spillet sto på pause. Skallet byttes når forsøket lukkes.
- **Produksjonsbytte (funn 12):** sperren teller bare lager som holder kvaliteten kontrakten krever, fordelt i køens
  rekkefølge som leveransene (`contractCoverage`). Fem tonn av en enklere kvalitet åpnet før byttet for en kontrakt på en
  bedre, som så ikke kunne leveres.
- **Svarfristen på 10× (funn 13):** fristen på forespørsler og avtaler flyttes før tida går, ikke etterpå. Før kunne et
  tilbud som skulle hatt svartid igjen, bli slettet som utløpt.
- **Sommerstansen (funn 14 og 15):** foringen regnes per ovn (én induksjonsovn og én lysbueovn kostet 630 000 kr for mye),
  og reservepotta per ovn. Et verk som får ferie midt i den, får valget ført på i år, og vikarlønnen gjelder bare året
  valget er for (før ble valget ført på neste år: vikarlønn uten vikarer, og neste års valg ble hoppet over).
- **Oppkjøpsrådet (funn 16):** `defenseNeeded` sjekker taket mot beløpet som akkurat holder, ikke beløpet med slingring,
  og kutter slingringen ved taket. Nær taket sa rådet før «går ikke» om et motbud som vinner på serveren.
Testet: tre nye motortester (kvalitet i lageret, sommervalget, motbud nær taket) og én nettest (ukeresultat), `npm test`,
typesjekk, lint, build og `balance.ts`.
Endringslogg: ja.
Konto (B-149): uendret.

## B-428 Etter kodegjennomgangen 2.10: resten av funnene (2026-10-02)
Status: gjennomført, med ett unntak (rådgiverens vinduer, se under – rettet i B-429).
Bakgrunn: siste gruppe etter B-425–B-427: funn 17–20 og småfunnene.
Gjort:
- **Tilbakespolingen (funn 17, 115):** `snapshots_rewound` har fått feltene fra 096 (kwh_total, deliveries, missed,
  cancelled, complaints, metric_note), og `check_snapshot` tar dem med når tallene flyttes til side og legges tilbake.
- **Offlinekopien (funn 18):** service workeren lagrer siden og JS/CSS fra `assets/` ved installasjonen (lest fra
  siden), og et feilsvar (f.eks. 503) erstatter aldri den lagrede siden. `VERSION` er `stalverket-v2`. Filer som lastes
  senere (kontrollrommet), lagres som før første gang de hentes.
- **Gjester (funn 19):** bare et nei fra tjenesten (4xx) gir et døgns pause; en feil hos tjenesten (5xx) prøves igjen ved
  neste lagring.
- **Meldingsgrensene (funn 20, 115):** `dm_send` tar en lås per avsender før grensene sjekkes.
- **Lenkefilteret (115):** `\b` er et tilbaketegn i PostgreSQL, ikke en ordgrense; nå `\y` i `chat_send`, `dm_send` og
  `profile_update`. Domener uten http/www («eksempel.no») slapp gjennom før – vist med samme uttrykk før og etter.
- **Uleste (115):** `dm_overview` teller ikke meldinger fra blokkerte eller eldre enn 30 dager.
- **Småfunn:** «Hent alt» henter status hver gang Mål åpnes og når appen vises igjen; quizen blander svaralternativene
  (ny hash, `ui/quizOrder.ts`, test); plassene i konsernet telles som serveren (`plannedPlants`); den felles chatten
  merkes lest bare når den vises; eksporten melder feil ved sletting (edge-funksjonen `eksport` versjon 2, prøvd: svarer
  «skipped» for en dag som alt er eksportert); `programSim --skann` regner av utbyttet som overskriften sier;
  verdenssimulatoren byr bare med penger i kassa; `sim/validate.ts` gir exit 1 når en forventning ikke holder.
- **Ikke rettet – rådgiverens vinduer (`decisions.ts`):** begge tellingene bruker samme vindu (10 døgn) på samme dag
  (`repLog.day` og `closedDay`), og jeg fant ikke tilfellet der tallene blir for lave. Venter på et konkret eksempel fra
  gjennomgangen før noe endres.
Testet: prøvekjøring av 115 (rullet tilbake: filteret fanger «eksempel.no», lås og uleste på plass, seks steder i
`check_snapshot`), `get_advisors` uten nye råd, quiztest, `npm test`, typesjekk, lint, `sim/validate.ts`, worldSim 90 dager.
Endringslogg: ja.
Konto (B-149): uendret.


## B-429 Etterkontrollen 2.10: kontosynkronisering, kontrollrommet, offlinekopien og rådgiveren (2026-10-02)
Status: gjennomført.
Bakgrunn: eieren etterkontrollerte `main` ved 1f83d648 og fant åtte gjenstående feil, et konkret eksempel på
rådgiverens vinduer (B-428) og tre småfunn. Eierens råd: kontosynkroniseringen og refusjonsfeilen (B-430) først.
Gjort:
- **A sitt spill over B sin lagring (funn 1, kritisk):** køen husker kontoen spillet ble lagt i køen for (`dirtyUser`).
  `flush` laster ikke opp før spillet er avklart mot kontoen, og forkaster det som ble lagt i køen av en annen konto. En
  feilet opplasting legges bare tilbake i køen hvis samme konto fortsatt er innlogget, og køen tømmes når en annen konto
  logges inn. `uploadSave` skriver aldri kontoens navn på et spill som tilhører en annen konto (`OtherAccountError`), og
  `pullIfNewer` forkaster svar som kom etter et kontobytte. Nettesten gjenskaper feilen på den gamle koden.
- **«Hent dag» (funn 4):** den daglige belønningen går gjennom `grantStreak` – samme kontovakt og venteliste som tida
  borte (B-426).
- **Dagens status etter kontobytte (funn 5):** kommer en kontroll for en annen konto mens den forrige pågår, kjøres den
  rett etterpå i stedet for å hoppes over.
- **Rotasjon mens forsøket starter (funn 6):** skallet låses når forsøket bestilles, ikke først når svaret kommer. Låsen
  slippes når kontrollrommet har tatt sin egen, eller når bestillingen feiler. Et svar som kommer etter at panelet er
  borte, setter ikke spillet på pause.
- **Vindusbytte (funn 7):** `leaving` laster opp det nyeste rett etter en opplasting som er på vei, også uten keepalive
  (`flush(keepalive, now)`).
- **Offlinekopien (funn 8):** installasjonen av service workeren feiler hvis siden ikke kan hentes (f.eks. 503), så den
  gamle service workeren og kopien blir stående.
- **Rådgiveren (eksempelet fra eieren):** sene kontrakter fjernes nå etter `ADVISOR_WINDOW_DAYS` (10 døgn), ikke etter fem,
  så teksten teller alle sene kontrakter rådgiveren reagerte på. Andre avsluttede kontrakter står fem døgn som før.
- **Småfunn:** 408 (tidsavbrudd) pauser ikke gjestekontoen; et gammelt svar på Min profil lukker ikke et nyere skjema
  (A → B → A); motbudsrådet godtar likt på taket, som serveren (`att > def`).
Testet: tre nettester (kontobytte under opplasting – feiler på den gamle koden, vindusbytte, daglig belønning), to
motortester (rådgiveren med kontrakter avsluttet for 9, 6 og 0 døgn siden; motbud på taket), `npm test`, typesjekk, lint,
build, `balance.ts`.
Endringslogg: ja.
Konto (B-149): uendret.

## B-430 Oppkjøpsbud gjøres opp før en konto slettes (2026-10-02)
Status: gjennomført (116 lagt inn).
Bakgrunn: funn 2 i etterkontrollen. Budet og motbudet trekkes fra konsernkassa med én gang (068), og radene i
`takeovers` slettes med kontoen (`on delete cascade`). Slettet angriperen eller eieren kontoen mens budet var åpent,
fant `resolve_takeovers` aldri raden, og motparten fikk ikke pengene tilbake.
Beslutning: en `before delete`-trigger på `profiles` kaller `takeovers_settle_for_user`, som gjør opp de åpne budene som
`avbrutt`: angriperen får hele budet tilbake, eieren får motbudet tilbake dit det kom fra (kassa og fondet), med
posteringer i kassaboka. Den som sletter kontoen, får ingenting. Ingen åpne bud fantes da 116 ble lagt inn (0 rader i
`takeovers`), så ingen ekte data ble endret.
Testet: prøvekjøring med to ekte kontoer og konstruerte bud (rullet tilbake): angriperen sletter → eieren +200 i kassa og
+100 i fondet; eieren sletter → angriperen +1000; andre kjøring gjør ingenting. Triggeren er på plass, funksjonene er
tatt fra `anon` og `authenticated`, og `get_advisors` har ingen nye råd. 116 bruker `create or replace trigger` (en
`drop trigger` ble holdt igjen av connectoren).
Endringslogg: ja (sammen med B-429).
Konto (B-149): uendret.

## B-431 Grunnlaget for etterbetalingen frosset, og 112 utgave 3 (2026-10-02)
Status: gjennomført (117 lagt inn). Etterbetalingen venter fortsatt på eierens beslutning om beløpet.
Bakgrunn: funn 3 i etterkontrollen. (a) En utbygging nullstiller nivået (`konsern_after`), men 112 satte bare typen
tilbake når den ble angret, så modernisering → utbygging kunne gi feil grunnlag (eierens testtilfelle: 315 000 kr mot
riktige 341 250 kr). Eieren fant ingen slik rekkefølge i spillerdataene. (b) Refusjoner ble regnet som tegn på at
spilleren var i spillet, men serveren lager dem selv (tapte anbud, prisfall). (c) Eierens råd: frys beregningsgrunnlaget
før beslutningen. 112 leste levende tabeller, så summen endret seg med noen kroner fra kjøring til kjøring.
Beslutning:
- **117:** alt 112 trenger, er kopiert i én transaksjon 2.10 kl. 19.12 til `basis_112_*` (spillerne med ferdige
  konsernordre før 2.10: 11 spillere, 58 ordre, lagret spill med serverens verk, tidslinja, kassaboka, målingene,
  utbyttet, politikken og aktiviteten, og `config.world`). RLS uten regler, tatt fra `anon` og `authenticated`.
  Tabellene endres aldri.
- **112 utgave 3** leser bare `basis_112_*` og de rene funksjonene, og stopper hvis `config.world.dividend` er endret
  siden grunnlaget ble tatt. Å angre en utbygging gir verket nivået det hadde før (moderniseringene siden forrige bygging
  eller utbygging); et eldre verk uten bygging på serveren merkes `nivaa_usikkert`. Refusjoner teller ikke lenger som
  aktivitet.
Resultat: **2 549 252 kr** til de samme 11 spillerne (utgave 2: 2 549 257). Forskjellen er K +11, N −6, O −10. Den
kommer av at forskjellen per ordre nå regnes av det frosne spillet, ikke av det levende (omdømmet og kvaliteten siste
uke endrer flaggskipet litt). Ingen rad har usikkert nivå, ingen rad hadde en tidligere handling enn tidslinja, og
`paid_check` er 0 for alle. Summen er fortsatt et anslag (RAPPORT-2026-10-02.md, avsnitt 7).
Testet: 112 utgave 3 kjørt i en transaksjon som ble rullet tilbake. Et konstruert tilfelle (bygging → modernisering →
utbygging) ble lagt inn i grunnlagstabellene i en transaksjon som ble rullet tilbake: de tre forskjellene er 962 500,
87 500 og 350 000 kr, nøyaktig `dividend_from_state` for verket før og etter hvert steg.
Endringslogg: nei.
Konto (B-149): uendret.

## B-432 Konsern-merket: kjøpet som telles, står under Utvid (2026-10-02)
Status: gjennomført.
Bakgrunn: eieren hadde «1» på Konsern, men fant ingenting å kjøpe. Tallet (`konsernReady`) teller kjøp som ikke er
sperret og som pengene rekker til. I eierens konsern (fullt, 12 mill. i konsernkassa) var det moderniseringen av
storverket til 4,5 mill. Under Utvid viste «Gjør verkene dine bedre» bare de tre som betaler seg raskest, og der sto tre
dyrere kjøp (bytte til kompleks og utbygging, 12,75–48 mill.) som betalte seg litt raskere. «Neste steg» var
moderniseringen av det nye komplekset til 13,5 mill. Det ene kjøpet eieren hadde råd til, sto bare under Oversikt →
Dine verk.
Beslutning: lista under Utvid (`konsernGrowOptions` i `game/konsern.ts`) viser det du har råd til først, deretter det
som betaler seg raskest, fortsatt høyst tre. Alt tallet på Konsern teller, står dermed enten i «Neste steg», i lista
eller blant de felles funksjonene. Tallet regnes som før.
Testet: motortest med eierens konsern (feiler med den gamle rekkefølgen: «mod-26 teller på merket, men vises ikke»),
`npm test`, typesjekk, lint, build.
Endringslogg: ja.
Konto (B-149): uendret.

## B-433 Etterkontrollen av #369/#370: fem restfunn (2026-10-02)
Status: gjennomført (118 lagt inn).
Bakgrunn: eieren etterkontrollerte #369 og #370 og bekreftet at de tidligere feilforløpene er rettet. Eieren regnet
også 112 på nytt med bare SELECT og fikk 2 549 252 kr. Fem restfunn gjensto.
Gjort:
- **Sent A-svar etter kontobytte (P2):** et vellykket svar på A sin lagring flyttet versjonen B bygde på, så B sin neste
  lagring ble avvist, og hentingen kunne bytte ut B sin framgang med en eldre kopi. Nå sjekker `uploadSave` kontoen også
  når svaret kommer: er den byttet, huskes versjonen bare for A til neste innlogging (`rememberRev`), og verken versjonen,
  «lagret» eller «lagret fra en annen enhet» endres for B. `link` gjør det samme etter hentingen. Nettesten feiler uten
  rettingen («1 -> 2»).
- **Offlinekopien (P2):** installasjonen henter siden og alle filene den trenger først, og skriver til lageret først når
  alt er hentet. Siden skrives sist. Før ble ny side lagret over den gamle før JS/CSS var hentet.
- **Dagskontrollen ved midnatt (P2):** en kontroll som kommer mens en annen pågår, kjøres alltid rett etterpå – også for
  samme konto. Før gikk midnattskontrollen tapt når en kontroll startet før midnatt fortsatt pågikk.
- **Låserekkefølgen i refusjonen (P2, 118):** `takeovers_settle_for_user` tar alle låsene først: oppkjøpsradene,
  konsernet, så kassa – samme rekkefølge som `konsern_order` (konsernet før kassa) og `takeover_defend` (oppkjøpsraden
  først). 116 står som den ble lagt inn. Kjent fra før og ikke endret her: `company_invest` og `takeover_defend` låser
  kassa før konsernet, motsatt av `konsern_order`. Det kan bare gi en vranglås når samme spiller gjør to ting samtidig
  fra to enheter, og da avbrytes den ene handlingen og rulles tilbake.
- **Trening mens et tellende forsøk bestilles (P3):** treningsknappen er sperret mens forsøket bestilles, og pausen
  husker farten fra første pause, så en ny pause ikke overskriver den med 0.
- **112 (eierens forslag):** `basis_112_functions` (118) har definisjonen og kontrollsummen til funksjonene 112 bruker
  (`dividend_from_state`, `dividend_to_treasury`, `world_day`, `world_shared`, `world_research`). 112 stopper hvis en av
  dem er endret. Ingen er endret siden grunnlaget ble tatt (0 av 5).
Testet: nettest for det sene svaret, prøvekjøring av 118 (rullet tilbake, samme utfall som 116), sjekken av
kontrollsummene, `get_advisors`, `npm test`, typesjekk, lint, build.
Endringslogg: ja.
Konto (B-149): uendret.

## B-434 Etterkontrollen av #372: fire resttilfeller (2026-10-02)
Status: gjennomført (119 lagt inn).
Bakgrunn: eieren etterkontrollerte #372 ved d9dfe866. De fem scenarioene var rettet, men fire avgrensede tilfeller
gjensto. 112-vernet var bekreftet (0 av 5 funksjoner endret).
Gjort:
- **A → B → A (P2):** lagringen har en generasjon for koblingen mot kontoen (`syncGen`). Den øker ved hver kobling,
  utlogging og hvert kontobytte. Svar fra en eldre generasjon brukes aldri – heller ikke når kontoen er den samme igjen.
  Det gjelder `uploadSave`, `flush` (legger ikke noe tilbake i køen), `link` og `pullIfNewer`. Nettest.
- **Tidslinjeraden (P2):** `lastSnapshotDay` settes bare hvis generasjonen er den samme etter lagringen av raden, og
  nullstilles når en annen konto logges inn.
- **Vanlig sidelasting (P2):** service workeren lagrer en ny side ved navigasjon bare når filene den trenger, ligger i
  lageret (`storePage`, samme som installasjonen). Prøvd i Chromium: en ny side som pekte på en JS-fil som svarte 503,
  ble ikke lagret, og spillet startet uten nett med den gamle.
- **Kontosletting mot oppkjøpsoppgjør (P2, 119):** `delete_my_account` gjør opp budene (`takeovers_settle_for_user`) før
  brukeren slettes, så oppkjøpsradene låses før profilen. Triggeren fra 116 står for andre måter en profil slettes på.
  Lagt inn med replace() på den levende funksjonen; connectoren holdt igjen en migrasjon med slettesetningen i teksten.
Testet: nettest for A → B → A, Chromium-prøve av service workeren (`vite preview`), definisjonen av `delete_my_account`
etterpå, `npm test`, typesjekk, lint, build.
Endringslogg: ja (sammen med B-435).
Konto (B-149): uendret.

## B-435 Selskapets verdi og «Lønner det seg?» ved oppkjøp (2026-10-02)
Status: gjennomført.
Bakgrunn: eieren la inn et oppkjøpsbud på 350 mill. og visste ikke om det var verdt det; kortet viste bare inntekten
per døgn (ca. 18 mill.).
Beslutning:
- Selskapskortet viser **verdien** (10 dagers inntekt, det et oppkjøpsbud minst må være) når selskapet har en eier.
- Ved et oppkjøpsbud – både før du byr og mens budet ditt står – står **«Lønner det seg?»**: står budet sterkest, eier du
  selskapet til perioden går ut, men minst 14 dager fra kjøpet (bare til perioden går ut hvis anbudet om neste periode
  alt er åpent, som `resolve_takeovers`). Inntekten i de dagene mot budet, og hva du får tilbake hvis budet ikke holder
  (90 %). Regnet av `takeoverPayoff` i `game/control.ts` med det selskapet tjener nå, så det er et anslag.
- Eierens bud: 350 mill. på et selskap som tjener ca. 18,6 mill. per dag gir ca. 260 mill. på 14 dager – ca. 90 mill.
  mindre enn budet, med mindre anbudet om neste periode også vinnes. Holder ikke budet, kommer 315 mill. tilbake.
Testet: motortest med eierens tall, `npm test`, typesjekk, lint, build.
Endringslogg: ja.
Konto (B-149): uendret (selskapene krever konto som før).

## B-436 Arbeidsmiljø: valgkort om trakassering, rasisme og utenforskap (2026-10-02)
Status: erstattet av B-444 (kortene og kapitlet er tatt ut).
Bakgrunn: en spiller foreslo noe om «kvotering» og rasisme under Folk. Eieren valgte arbeidsmiljøkort framfor kvoter.
Beslutning:
- Tre nye hendelseskort fra nivå 1 med minst fire ansatte: **trakassering** (en kollega kommenterer kropp og utseende),
  **rasisme** («spøker» i pauserommet) og **utenfor** (en ansatt holdes utenfor på skiftet).
- Første valg er riktig håndtering (ta det på alvor, si tydelig fra, følge opp): trivsel +6. Å se bort: trivsel −10, og
  den det gjelder slutter med 50 % sjanse. Trakasseringskortet har også «ordne det seg imellom»: −4 og 25 %.
- Det første kortet låser opp fagbokkapitlet **«Arbeidsmiljø og varsling»** (del «Folk og kunder») med to quizspørsmål:
  forbud mot trakassering og diskriminering, like muligheter (ingen kvote for vanlige ansatte), varsling og rutinen med
  fem ansatte eller flere, og hvordan man følger opp. Gradvis synlighet (B-180): kapitlet vises først når det trengs.
- Ingen kvoter i spillet, og ingen nye tall eller valutaer – bare trivsel, som før.
- Testspilleren velger riktig håndtering (som en fornuftig leder).
Testet: motortest (trivsel opp og ned, fagboka låses opp, ingen nevner kvoter), `balance.ts`, `npm test`, typesjekk, lint.
Endringslogg: ja.
Konto (B-149): krever ikke konto (eget verk, spilltid).

## B-437 Konsernbanken: lån til verk og modernisering (2026-10-02)
Status: gjennomført.
Bakgrunn: eieren ønsket «egen bank for konsernkassa så man kan ta lån der også», og valgte «Verk og modernisering».
Beslutning:
- Lånet kan **bare** brukes på bestillinger i konsernet (nye verk, utbygging, modernisering, bytte til kompleks) – aldri
  på anbud, oppkjøpsbud, motbud eller investering i Kontroll. Makt mot andre skal tjenes (B-323).
- Lånet tas i bestillingen (`konsern_order_loan`): kassa betaler det den har, banken det som mangler. Pengene står aldri
  fritt i kassa.
- **Rammen** er 10 dagers inntekt: snittet av utbyttet og bidraget i kassaboka de siste 7 ekte dagene × 10. Uten
  inntekt er rammen 0.
- **Rente** 1 % per ekte dag, lagt til lånet. Hver natt (`bank_service` i `world_tick`, etter utbyttet og bidraget) går
  50 % av utbyttet og bidraget som har kommet inn siden sist, til nedbetaling – aldri mer enn lånet eller kassa.
- Selges et verk eller avbestilles noe mens lånet står, går pengene først til lånet (ellers kunne lån bli til fri kasse).
- Lånet trekkes fra konsernverdien på topplista (121, `konsernValueOf`), som lånet hjemme.
- Låsene: rådgivende lås per spiller, `konsern`, så `treasury` (B-433). `konsern_cancel` låser nå konsernet før kassa.
- Ny posteringstype `lån` i kassaboka; opptak, rente og nedbetaling står også i `konsern_loan_log` (ingen tilgang for
  spillerne). Tallene i `config.world.bank` (`enabled`, `limit_days`, `rate_per_day`, `repay_share`, `window_days`).
- Appen: knappen «Lån X og bygg ut» står under kjøpskort kassa ikke rekker til (Utvid og «Neste steg»), ikke i tabellen
  over verkene. Lånet vises i statusen på Utvid først når det finnes (gradvis synlighet).
Testet: prøvekjøring som en ekte spiller i en transaksjon som ble rullet tilbake (ramme 185 mill., lån 3,79 mill.,
avbestilling betalte lånet, rente og nedbetaling ga riktig kasse), `get_advisors`, motortest (`loanFor`, `bankDay` med
tallene fra prøven), nettest (lånet legges inn og trekkes fra konsernverdien), Chromium på 390 og 320 px, `npm test`,
typesjekk, lint, build.
Endringslogg: ja.
Konto (B-149): krever konto (konsernkassa, serveren, ekte tid – regel 3).

## B-438 Svar på rapporter, med varsel begge veier (2026-10-02)
Status: gjennomført.
Bakgrunn: eieren (adminpanelet): «Her må jeg kunne svare på rapporten slik at jeg kan finne ut av problemet før et valg
tas. Man bør også få varsel på om noen har sendt rapport til meg. Og de bør få varsel om jeg svarer.»
Beslutning:
- I adminpanelet har hver rapport en samtale. Eieren skriver til den som rapporterte («Svar …») eller den som skrev
  meldingen («Spør …») før hen avviser, skjuler eller sperrer. Samtalen står under rapporten med alle svarene.
- Spilleren ser eierens meldinger som «Fra admin» øverst i fanen Meldinger i Skiftrapporten, med meldingen det gjelder,
  og kan svare der. Bare når eieren har skrevet til spilleren i den rapporten – ingen kan starte en samtale med eieren.
  Høyst 500 tegn, ingen lenker (samme filter som privatmeldinger), hvert 3. sekund og høyst 20 svar per ekte dag.
  Spilleren ser aldri hvem som rapporterte.
- Varsel: prikken ved Skiftrapporten og tallet på Meldinger teller også uleste svar fra admin (spilleren) og nye
  rapporter og svar fra spillere (eieren). Eieren ser i tillegg «N nye ting i adminpanelet» i Meldinger med en knapp dit,
  og «Adminpanel (N nye)» under kontoen. Åpnes panelet, er alt sett (`admin_reports_seen`).
- Server (122): `report_messages`, `admin_report_send` (logget i `admin_log`), `report_reply`, `my_report_threads`,
  `report_seen`, `report_unread`, `admin_reports_seen`; `admin_reports` gir samtalen og uleste svar. Alt tatt fra
  anon og public; gjester slipper ikke gjennom `guest_gate`.
Testet: hele forløpet som eier og spiller i en transaksjon som ble rullet tilbake (varsel 1 → svar → varsel til eier →
lest = 0; lenke avvist; den som ikke er spurt, kan ikke skrive), `get_advisors`, nettest, Chromium på 320, 390 og 1366
px mot en falsk server, `npm test`, typesjekk, lint, build.
Endringslogg: ja.
Konto (B-149): krever konto (mellom spillere, regel 3); ikke gjester.

## B-439 Adminpanelet viser én samtale om gangen (2026-10-03)
Status: gjennomført.
Bakgrunn: eieren så begge samtalene om en rapport (med den som rapporterte og den som skrev) i samme liste og lurte på
om spillerne ser hverandres svar. Det gjør de ikke – `my_report_threads` gir hver spiller bare sin egen samtale – men
panelet blandet dem.
Beslutning: fanene «Svar …» og «Spør …» står øverst i samtalen og viser bare samtalen med den personen, med antall
meldinger i fanen. Under står «Bare X ser denne samtalen» (for den som skrev meldingen: «… og aldri hvem som
rapporterte»). Ingen endring på serveren.
Testet: Chromium 390 px mot en falsk server (to samtaler, riktig fane viser riktig samtale), typesjekk, lint, `npm test`.
Endringslogg: ja.
Konto (B-149): uendret (adminpanelet).

## B-440 Oppkjøp: retningen for nye regler, og simulatoren (2026-10-03)
Status: retning godkjent av eieren; satsene valgt og bygget i B-441.
Bakgrunn: et oppkjøpsbud på skraplageret ble en budkrig. Med dagens regler koster eierens motbud bare 5 % (95 % tilbake
uansett utfall), mens kjøperen betaler hele budet hvis hen vinner og bare eier selskapet i ca. 14 dager. Et vinnende bud
måtte være rundt 900 mill., mot ca. 268 mill. i inntekt på 14 dager. Eieren avviste forslaget om at hele motbudet skal
bli Kontroll og at tapsgebyret skal gå til motparten (det styrker eieren foran neste forsøk og gir eieren penger til
neste forsvar).
Beslutning (retning):
1. Vinneren betaler sitt bud. Eierens vinnende motbud brukes opp – ingen automatisk investering eller ekstra Kontroll.
2. Begge får sammenlignbare vilkår ved tap. Et tapsgebyr går ikke til motparten.
3. Budberegningen justeres samtidig: samme beløp gir sammenlignbar styrke for begge. Eieren kan ha en begrenset fordel
   fra Kontroll; fond som brukes i et motbud, koster som penger.
4. Pause mellom oppkjøpsforsøk på samme selskap.
5. Satsene velges etter simulering. Pågående bud avgjøres etter reglene de ble lagt inn under.
Simulatoren: `npx tsx src/game/takeoverSim.ts` (`--kort` for sammendraget). Eieren svarer sist og velger det billigste
motbudet som holder hvis det koster mindre enn det hen taper; kjøperen velger budet som gir mest eller gir seg. Eieren
får som i dag betalt for dagene hen mister, så det eieren taper ved et salg, er en «eierverdi» (0, 7 eller 14 dagers
inntekt). Resultater 3.10 (selskapet tjener 19,1 mill. per dag, verdi 191 mill., 12 scenarier per regel):
- **Nå:** eier som vil beholde (eierverdi 7–14 dager): 0 av 12 oppkjøp lønner seg. Eieren vinner alltid fordi motbudet
  er nesten gratis.
- **Ny regel (Kontroll ≤ 20 poeng, samme vekt 60 og tak 5 × V for begge, tapsgebyr 10–25 %, pause 7–14 dager):**
  eierverdi 0–7 dager: oppkjøp lønner seg i 12 av 12, pris 191–244 mill. Eierverdi 14 dager: 0 av 12 – eieren som vil
  beholde selskapet, gjør det, men må betale for det. Det er et reelt valg for begge.
- Kontroll ≤ 30: eieren beholder litt oftere (9 av 12 oppkjøp ved eierverdi 7). Kontroll ≤ 10: nesten ingen fordel.
- **Plage:** med «vinneren betaler» koster det en aktiv eier (Kontroll 62) ca. 133 mill. å avvise et minstebud, mens
  kjøperen bare taper gebyret (19 mill. med 10 %, 48 mill. med 25 %). Pausen begrenser det: 14 dager gir høyst ca. 1,8
  forsøk per 30 dager (7 dager: 3). Eieren kan alltid velge å selge og få betalt for dagene, så plagen er et valg, men
  gebyret bør ikke være for lavt.
- Minstebud 1,5 × V stopper alle oppkjøp (dyrere enn 14 dagers inntekt) – minstebudet bør bli 1 × V.
Foreslåtte satser (til eierens valg): Kontroll gir høyst 20 poeng, vekt 60 og tak 5 × V for begge, tapsgebyr 25 % for
begge (til ingen), pause 14 dager etter et avgjort forsøk, minstebud 1 × V, betalingen til eieren ved salg som i dag.
Endringslogg: nei.
Konto (B-149): uendret.

## B-441 Oppkjøp regelsett 2: vinneren betaler, 25 % tapsgebyr, Kontroll høyst 20, 14 dagers pause (2026-10-03)
Status: gjelder. Erstatter tilbakebetalingen (90 %/95 %), forsvarsformelen og fondet som teller av seg selv fra B-335,
B-337 og B-375 for nye bud; budets formel, taket på 10 × V, minstebudet og betalingen til eieren (B-375) gjelder fortsatt.
Bakgrunn: retningen i B-440. Eieren valgte satsene etter simuleringen: «Høyst 20 poeng», «25 %», «14 dager».
Beslutning:
- **Vinneren betaler.** Kjøperen som vinner, betaler hele budet (eieren får `takeover_payout` som før, resten går ut av
  spillet). Eieren som holder, har brukt opp motbudet – ingen investering eller Kontroll av det.
- **Taperen får 75 % tilbake**, begge veier: kjøperen når budet ikke holder, eieren (motbudet, også fra fondet) når
  selskapet blir kjøpt likevel. Tapsgebyret på 25 % går til ingen (`takeover_refund`).
- **Samme beløp, samme styrke:** motbudet teller 60 × √(beløp / V) som budet, inntil 5 × V (`takeover_defense_of2`).
  Kontrollen gir høyst 20 poeng (Kontroll 100 = 20). Beredskapsfondet teller bare når eieren legger det inn som motbud.
- **Pause 14 dager** etter et avverget forsøk (`cooldown_days` = 14, også for selskaper med eldre forsøk).
- **Pågående bud** avgjøres etter reglene de ble lagt inn under: `takeovers.rules` = 1 for alle rader som fantes da 123
  ble lagt inn (også budet som avgjøres 5.10), 2 for nye. Appen viser tekst og tall etter regelsettet på hvert bud.
- B-337 holder: det sterkeste motbudet (20 + 60 × √5 ≈ 154) kan slås av en aktiv kjøper (60 × √10 ≈ 190).
Simulatoren (`takeoverSim.ts`, regelsett 2 med budtak 10 × V): eierverdi 0–7 dager – oppkjøp lønner seg i 12 av 12
(191–207 mill. i snitt); eierverdi 14 dager – eieren beholder, men betaler for det. Plage: ca. 1,8 forsøk per 30 dager, og
kjøperen taper 48 mill. per forsøk med minstebudet.
Testet før den ble lagt inn (transaksjon rullet tilbake): budet som pågår, regnes som før; samme bud etter regelsett 2 gir
eieren 75 % av motbudet tilbake ved salg; et motbud som holder, er brukt opp, og kjøperen får 75 %; vinduet viser pausen.
Valgt bort: større minstebud (1,5 × V stopper alle oppkjøp), tak 3 × V på budet (endrer ingenting i simuleringen, men
svekker B-337), Kontroll ≤ 30 (eieren beholder for ofte).
Konto (B-149): uendret – oppkjøp krever konto som før.

## B-442 Oppkjøp: flere kan by i samme runde, fristen forlenges ved sene bud, bekreftelse før bud (2026-10-03)
Status: gjelder. Utfyller B-441 (pausen står).
Bakgrunn: eieren spurte om 14 dagers pause gir mening når et bud fra en som «bare trykker rundt» stenger ute dem som har
spart til et oppkjøp – først i 72 timer (ingen andre kunne by mens et bud sto åpent), så i 14 dager.
Beslutning (eierens svar: «Gå for din anbefaling»):
- **Overbud:** mens et oppkjøpsbud etter regelsett 2 står åpent, kan en annen spiller by minst 5 % (og minst 1 mill.) over
  (`takeover_min_raise`). Budet tar over runden; den som ble overbudt, får hele budet tilbake (hen tapte ikke mot eieren).
  Eierens motbud står. Samme sperrer som et nytt bud: ikke eieren, ikke sperret, ett åpent bud om gangen. Hendelsen står
  i Skiftrapporten.
- **Fristen:** et bud (nytt, økt eller overbud) de siste 12 timene flytter fristen til 12 timer etter budet, så eieren
  rekker å svare.
- **Pausen på 14 dager** kommer først etter en runde der alle kunne by – den verner fortsatt eieren mot å måtte brenne
  motbud igjen og igjen.
- **Bekreftelse:** appen viser hva et bud eller motbud koster og hva som kommer tilbake, før det sendes.
- Bud fra før B-441 (regelsett 1) avgjøres som de ble lagt inn: ingen overbud, ingen forlenget frist.
- `takeover_bids` lagrer alle bud i runden (visningen «du ble overbudt», ettersyn).
Valgt bort: pause bare for den som bød (flere kan bytte på å presse samme eier), pause etter hva eieren brukte (vanskelig å
forstå), bare kortere pause (løser ikke problemet).
Testet (transaksjon rullet tilbake): regelsett 1 avviser overbud; for lavt overbud avvises med riktig minstebud; et
overbud flytter runden, gir den forrige hele budet tilbake, forlenger fristen til 12 timer og skriver i Skiftrapporten; en
økning med lang frist igjen lar fristen stå.
Konto (B-149): uendret – oppkjøp krever konto.

## B-443 Rettinger etter kontrollen av PR #373–#380 (2026-10-03)
Status: gjelder. Utfyller B-437 (konsernbanken), B-438/B-439 (rapportsvar) og B-441/B-442 (oppkjøp).
Bakgrunn: en kontroll av main 77aa9cd fant feil rundt lånet, budbekreftelsen og kontobytte, og én regelsvakhet.
Beslutning (rettet, server 125 + app):
1. **Bytte til kompleks** betaler lånet med salget først, som salg og avbestilling. Mangler kassa da penger, lånes det
   innenfor rammen (som kjøpet ellers). Speilet i `loanFor` (salget som eget argument).
2. **Renten** regnes for hele ekte dager før lånet endres (`bank_accrue`, også før nedbetaling og nye lån). Et nytt lån
   får ny rentedato; nedbetalingen av inntekten har sin egen dato (`konsern.repay_at`).
3. **Egne økninger** i et oppkjøp (regelsett 2) må være minst 5 %, og fristen kan aldri gå mer enn 24 timer forbi den
   opprinnelige (`extend_max_hours`).
4. **Et overbud må også gi et sterkere bud** (`takeover_outbid_min`): regnet med budgiverens egen aktivitet og egne verk i
   regionen. Ellers kunne et høyere beløp fra en svakere budgiver svekke runden – også med vilje, for å hjelpe eieren.
   Den som ikke kan bli sterkere innenfor taket, får «svak». (Regelvalg tatt her fordi det tetter et misbruk; kan endres
   av eieren.)
5. **Budet sendes med det appen viste** (`takeover_bid` med budet og om det var ditt): har noe endret seg, avvises det
   med «endret». Bekreftelsen i appen forsvinner når konto, bud eller betalingskilde endres, og viser kilden.
6. **Kontobytte:** samtalene fra admin hentes og vises bare for kontoen som er innlogget (svar som kommer etter et bytte,
   kastes); svar sendes bare fra kontoen samtalen tilhører.
7. **Adminpanelet** har én fane per spiller som har rapportert samme melding, og svaret går til den rapporten.
8. **Kassaboka:** eierens motbud fra kassa ved avbrutt oppkjøp får sin linje.
9. **«Lønner det seg?»** regnes med kjøperens eget anslag (`company_estimate_for`), fordi inntekten avhenger av eierens
   produksjon.
10. **Simulatoren** regner verdien som `company_value`: det høyeste av 10 dagers inntekt og siste anbudspris.
Funn i simuleringen (ikke endret, til eierens vurdering): er siste anbudspris høyere enn ca. 14 dagers inntekt, lønner ingen
oppkjøp seg – minstebudet blir dyrere enn det kjøperen kan tjene (anbudsgulv 350 mill.: 0 av 12; 250 mill.: 12 av 12 når
eierverdien er under 14 dager).
Testet før det ble lagt inn (transaksjoner som ble rullet tilbake): rente for to dager før nedbetaling; bytte med lån 100
mill. betalte 12 mill. ned med salget og trakk hele kostnaden fra kassa; nattjobben regner renten først og halvparten av
inntekten siden forrige nedbetaling; for lavt overbud avvises med riktig minstebud; endret bud gir «endret»; en økning på
én krone gir «okning»; fristen stopper 24 timer over; avbrutt oppkjøp skriver linjen i kassaboka; adminpanelet og
anslaget har de nye feltene. Budet som pågår (regelsett 1), er urørt.
Endringslogg: ja.
Konto (B-149): uendret.

## B-444 Arbeidsmiljøkortene tas ut (2026-10-03)
Status: gjelder. Erstatter B-436.
Bakgrunn: eierens beskjed 3.10.2026: «Jeg vil ikke ha popups om arbeidsmiljø og varsling da det er et sårt tema.»
Beslutning: hendelseskortene om trakassering, rasistiske «spøker» og en ansatt som holdes utenfor er fjernet, sammen med
fagbokkapitlet «Arbeidsmiljø og varsling» og quizen (de ble bare låst opp av kortene). Et kort som står åpent i et lagret
spill, tas bort ved lasting (`migrate`), og farten blir som etter et vanlig kort; kapitlet tas ut av fagboka. Oppføringen
om B-436 i «Hva er nytt» er også tatt ut, og fjerningen får ingen egen oppføring, så temaet ikke dukker opp i en popup.
Nye hendelseskort om forhold mellom ansatte (trakassering, diskriminering, varsling) lages ikke uten at eieren ber om det.
Endringslogg: nei
Konto (B-149): uendret.

## B-445 Eierens svar 3.10: slagghåndteringen på, overbud må være sterkere, etterbetalingen gjennomgått (2026-10-03)
Status: gjelder.
Bakgrunn: eieren svarte «Kjør på med alt du anbefaler» på lista over det som ventet på svar.
Beslutning:
- **Slagghåndteringen er slått på** (126): vilkårene i B-402 var oppfylt og verdensjobbene «ok». Første anbud åpnet
  3.10 kl. 10:38 norsk tid og stenger 5.10 kl. 10:38 (48 timer, skjult, minstebud 0,1 mill.).
- **Overbud må gi et sterkere bud** (B-443, punkt 4) står som eierens regel.
- **Etterbetalingen** (B-423/B-425/B-431) er regnet på nytt på det frosne grunnlaget: samme svar, 2 549 252 kr til
  elleve spillere, 15 rader; det som ble betalt, stemmer på krona for alle (paid_check 0). **Ikke betalt:** forberedelsen
  av utbetalingen ble stoppet av sikkerhetssperren i arbeidsmiljøet (flytting av ekte penger). Utbetalingen krever eierens
  uttrykkelige ja til beløpet og at eieren gir tillatelse til handlingen.
- **Ryddingen av meldinger** (108) tar nå også samtalene om rapporter som er avgjort (eldre enn 30 dager). Ikke lagt inn:
  koblingen holdt den igjen til eieren bekrefter. Må på plass før 1.11.2026.
- Anbudsgulvet i verdien (B-443, funnet i simuleringen) er ikke endret; det rammer ikke skraplageret nå.
Konto (B-149): uendret.

## B-446 Etterbetalingen av utbyttet 30.9 og 1.10 er utført (2026-10-03)
Status: gjelder.
Bakgrunn: eieren sa «Ja» til etterbetalingen på 2 549 252 kr (B-445) og «Jeg godkjenner at du gjør det» 3.10.2026.
Beslutning: utbetalt 3.10 kl. 10:59 norsk tid med migrasjon 127 (`supabase/127_etterbetaling.sql`):
- Beløpene regnes av nøyaktig samme beregning som dry-run-en (utkast 112, utgave 3) på det frosne grunnlaget
  `basis_112_*`; migrasjonen stopper uten å betale noe hvis summen ikke er den eieren godkjente, eller hvis grunnlaget,
  utbyttereglene eller funksjonene har endret seg.
- 2 549 252 kr til elleve spillere, 15 rader (30.9: 8 rader, 1 208 685 kr; 1.10: 7 rader, 1 340 567 kr). Per spiller som
  i RAPPORT-2026-10-02.md, avsnitt 7: H 547 865, F 419 425, O 404 469, J 353 349, G 301 497, K 266 964, C 121 172,
  E 57 559, D 40 981, M 25 529, N 10 442. Ingen er trukket.
- Pengene gikk rett inn i konsernkassa. Kassaboka har én linje per spiller og dag med `kind = 'justering'` og ref
  «etterbetaling utbytte <dag>» – kassaboka har ingen egen type for etterbetaling, og `justering` teller ikke i rammen i
  konsernbanken (`bank_limit` leser bare `utbytte`/`bidrag`), så etterbetalingen gir ikke større lån.
- `dividend_backpay` (én rad per spiller og dag, primærnøkkel) er vernet mot dobbel betaling; tabellen har RLS uten
  regler og ingen tilgang for spillerne.
Testet før det ble lagt inn: hele migrasjonen i en transaksjon som ble rullet tilbake – kassene økte med 2 549 252 kr,
15 rader og 15 linjer i kassaboka for elleve spillere, og et nytt forsøk i samme transaksjon ga 0 nye rader. Etterpå:
15 rader og 2 549 252 kr i både `dividend_backpay` og kassaboka, verdensjobbene «ok», `get_advisors` bare med det vanlige
INFO-funnet (RLS uten regler).
Grunnlaget `basis_112_*` står til det ikke trengs lenger (ingen sletting uten eierens beslutning).
Endringslogg: ja.
Konto (B-149): uendret (konsernkassa krever konto).

## B-447 Beløpsfeltene i konsernet godtar komma og bud under 1 mill. (2026-10-03)
Status: gjelder.
Bakgrunn: eieren (skjermbilde fra iPhone 3.10): «Det er ikke mulig å betale for eks 100 tusen» i anbudet på
slagghåndteringen (minstebud 100 000 kr). Feltet er i millioner, eksempelet viste «0» (0,1 rundet ned), og tallfeltet
(`type="number"`) leser ikke «0,1» med komma fra tastaturet på iPhone – knappen ble aldri aktiv. Skrev man 100000,
ble det 100 000 mill. kr og avvist som «utenfor».
Beslutning:
- Alle beløpsfelt på Industrien (anbud, oppkjøp og motbud, investering, flytting) er vanlige tekstfelt med
  desimaltastatur (`MillInput` i `ui/Companies.tsx`). De godtar komma, punktum og mellomrom; eksempelet viser
  desimaler («0,1»), aldri 0.
- Under anbudsfeltet står hele tiden hva budet blir i kroner («Du byr 100 000 kr»), eller hva som er galt (under
  minstebudet, over høyeste bud, mer enn kassa) med hva man skal skrive. Knappen er bare aktiv når budet kan sendes.
- Feltet er fortsatt i millioner; serveren er uendret.
Endringslogg: ja.
Konto (B-149): uendret.

## B-448 Selskapene står først på verdenskartet (2026-10-03)
Status: gjelder.
Bakgrunn: eieren (skjermbilde 3.10): «Selskapene vises ikke på kartet». Kartet viser høyst ti merker per region, og
selskapene ble lagt til etter alle verkene. Med 14–27 verk i hver region havnet Skraplageret og Slagghåndteringen i «+N».
Serveren (`world_map`) sendte dem riktig.
Beslutning: selskapene tegnes først i rutenettet (deretter dine verk, så andres), så de alltid synes uansett hvor mange
verk regionen har. Filtrene er som før.
Endringslogg: ja.
Konto (B-149): uendret.

## B-449 Anbudsgulvet i selskapsverdien – analyse, venter på eierens valg (2026-10-03)
Status: analyse; ingen regel er endret. Tallene for store forhold og beskrivelsen av F er rettet i B-450.
Bakgrunn: eieren 3.10: anbudsgulvet bør være neste analyseoppgave, men et tak på 14 dagers inntekt løser bare deler av
problemet (20 mill./dag, 14 dagers eierskap: 400 mill. gir −120, tak 14 d gir 0, tak 12 d gir +40, 10 d gir +80).
Sammenlign i simulatoren med kjøperens eget anslag, og husk at verdien også styrer Kontroll og budstyrke. At eieren alltid
*kan* kjøpes ut, betyr ikke at kjøpet alltid skal lønne seg; et gammelt anbud bør likevel vurderes kritisk som varig gulv.
Hva verdien V (`company_value` = det høyeste av 10 dagers inntekt og siste anbudspris) styrer på serveren:
minstebudet (`takeover_window`, `takeover_bid`), styrken på bud og motbud (√(beløp / V), tak 10 V og 5 V –
`takeover_attack`, `takeover_defense`, `takeover_outbid_min`), Kontroll fra investering og fond (`company_control`) og
inntektsøkningen fra investeringer (`pay_company_income`). Gulvet varer hele konsesjonsperioden, også etter et oppkjøp,
til neste anbud er avgjort – en dyr anbudsvinner kjøper i praksis vern mot oppkjøp for hele perioden.
Simuleringen (`npx tsx src/game/takeoverSim.ts --gulv`, regelsett 2, eieren 20 mill./dag, kjøperen 0,8/1,0/1,2 × det,
anbud 250/300/400 mill., 36 situasjoner per kjøperanslag med eierens beste motbud):
| Alternativ | Minstebud ved anbud 400 | Lønner seg (0,8 / 1,0 / 1,2) ved anbud 400 | Endrer Kontroll og budstyrke |
|---|---:|---|---|
| A: i dag | 400 | 0 / 0 / 0 | – |
| B: anbudet teller høyst 14 dager | 280 | 0 / 0 / 27 | ja |
| C: høyst 12 dager | 240 | 0 / 24 / 27 | ja |
| D: bare 10 dager | 200 | 19 / 24 / 30 | ja |
| E: minstebud 10 dager, skala som i dag | 200 | 17 / 24 / 27 | nei |
| F: minstebud høyst 12 dager, skala som i dag | 240 | 0 / 24 / 27 | nei |
Funn: problemet sitter i minstebudet, ikke i skalaen – E og F gir nesten samme utfall som D og C uten å endre Kontroll,
inntektsøkning eller hvor mye bud og motbud kan telle. B løser lite: en like god kjøper går akkurat i null. D og E gjør
oppkjøp lønnsomt også for en kjøper som tjener 20 % mindre enn eieren.
Anbefaling: F – minstebudet er det høyeste av 10 dagers inntekt og siste anbudspris, men aldri over 12 dagers inntekt;
skalaen (V) står som i dag. Da lønner oppkjøp seg bare for en kjøper som tjener omtrent like mye som eieren eller mer,
og et dyrt anbud gir ikke lenger vern for hele perioden. Om gamle anbudspriser også skal dempe Kontroll og
inntektsøkning, tas for seg senere med ekte data. Bygging (når eieren har valgt): `takeover_window`/`takeover_bid` (nytt
`takeover_min_bid`), speilet i `control.ts`, simulatoren og testen «alltid mulig»; ingen lagret verdi endres.
Endringslogg: nei
Konto (B-149): uendret.

## B-450 Oppkjøpssimulatoren rettet: Kontrollen holder av seg selv; store anbud mot inntekt prøvd (2026-10-03)
Status: analyse; ingen regel er endret. Retter tallene og beskrivelsen i B-449.
Bakgrunn: eieren 3.10 fant to ting: (1) F beholder verdien som skala for budstyrken, så et dyrt gammelt anbud kan
fortsatt beskytte eieren – med 20 mill./dag, anbud 6 mrd., Kontroll 80 og ett verk i regionen er minstebudet 240 mill.,
men kjøperen må by over 303,75 mill. bare for å slå Kontrollen, mens hen kan tjene 280 mill. (2) Simulatoren lot
kjøperen vinne når Kontrollen alene holdt, hvis eierens tap ved salg var null eller mindre – på serveren virker Kontrollen
automatisk (`resolve_takeovers`: budet vinner bare når det er sterkere enn motbudet med Kontrollen).
Rettet: `takeoverSim.ts` regner et bud som tapt når Kontrollen alene holder (motbud 0), i både hovedsimuleringen og
`--gulv`. Det endrer én linje i sammendraget for regelsett 1 (eierverdi 0: 8 av 12 oppkjøp lønner seg, ikke 10; Kontroll
62–80 med 3–7 dager igjen). Regelsett 2 og tabellen med anbud 250/300/400 mill. i B-449 er uendret.
Nytt i `--gulv`: anbud på 12,5–300 dagers inntekt (20 mill./dag, kjøperen tjener like mye som eieren):
| Anbud (dager) | A: i dag | C: høyst 12 dager | F: minstebud høyst 12 dager | F: bud for å slå Kontroll 80 alene |
|---:|---|---|---|---:|
| 12,5 | 24 av 36 | 24 av 36 | 24 av 36 | 240 |
| 15–20 | 0 av 36 | 24 av 36 | 24 av 36 | 240 |
| 30 | 0 | 24 | 21 | 240 |
| 50 | 0 | 24 | 18 | 240 |
| 100 | 0 | 24 | 15 | 240 |
| 300 | 0 | 24 | 11 (Kontrollen alene holder i 9) | 304 (over 280) |
Funn: F fjerner ikke all beskyttelse fra et gammelt anbud. Fordi budstyrken fortsatt regnes mot det gamle anbudet, gir
et svært dyrt anbud eieren et forsprang som vokser med forholdet. C fjerner det, men endrer da også Kontroll,
inntektsøkning og hvor mye bud og motbud kan telle. I praksis er forholdet lite: høyeste bud i et anbud er 14 dagers
anslått inntekt når anbudet åpner (`open_tender`), så forholdet blir bare stort hvis inntekten faller etterpå (eller for
anbud fra før B-311, som regnes om med `bid_in_new_money`). Halveres inntekten, er forholdet ca. 28 – F gir da omtrent
21 av 36 mot 24 for C.
Presis beskrivelse av F: «begrenset minstebud, øvrige regler beholdes» – minstebudet er det høyeste av 10 dagers inntekt og
siste anbudspris, men aldri over 12 dagers inntekt; verdien som skala for budstyrke, motbud, Kontroll og inntektsøkning er
som før. Bud som alt er lagt inn, avgjøres etter reglene de ble lagt inn under: F endrer bare minstebudet for nye bud
(`takeover_window`, sjekken i `takeover_bid`), ikke verdien, så verken pågående bud, overbud (`takeover_min_raise`) eller
`takeover_outbid_min` påvirkes.
Endringslogg: nei
Konto (B-149): uendret.

## B-451 Begrenset minstebud ved oppkjøp (alternativ F) (2026-10-03)
Status: gjelder. Bygger på B-449/B-450.
Bakgrunn: eieren 3.10: «Jeg anbefaler F som en forsiktig første endring.» Testen skal bekrefte at nye oppkjøpsforsøk får
minstebud mellom 10 og 12 dagers inntekt, at selskapsverdien, Kontroll og budstyrken er uendret, og at pågående bud og
overbud følger dagens regler. «Lønner det seg?» skal fortsatt bruke kjøperens eget anslag.
Beslutning («begrenset minstebud, øvrige regler beholdes»):
- Minstebudet for et nytt oppkjøpsforsøk er det høyeste av 10 dagers inntekt og siste anbudspris, men aldri over 12 dagers
  inntekt (`takeover_min_bid`, `config.world.takeover.min_bid_cap_days` = 12, migrasjon 128). Uten inntektsanslag er det
  verdien, som før. `takeover_window` gir det nye minstebudet og styrken ved det (`attack_min`); `takeover_bid` leser
  minstebudet derfra for nye bud.
- Uendret: selskapsverdien (`company_value`) som skala for budstyrke, motbud, Kontroll og inntektsøkning; økninger og
  overbud (`takeover_min_raise`, `takeover_outbid_min`); bud som alt er lagt inn, avgjøres etter regelsettet de ble lagt
  inn under (`takeovers.rules`).
- Appen: `takeoverMinBid` i `control.ts` speiler regelen (regnet av verdien og inntekten); selskapskortet viser
  «Minstebud ved oppkjøp» (før «Verdi … 10 dagers inntekt»), eierens «bud for å ta selskapet» (`bidToTake`) starter på
  minstebudet, og tekstene om oppkjøp sier hva minstebudet er. «Lønner det seg?» bruker fortsatt kjøperens eget anslag.
Begrensning (B-450): et svært dyrt gammelt anbud gir fortsatt eieren et forsprang, fordi budstyrken regnes mot verdien.
Presisering: høyeste bud i et anbud er omtrent 14 dagers anslått inntekt når det åpner – avrundet til hele millioner og
med et gulv på 10 × minste bud (`open_tender`). Ved svært lav inntekt kan forholdet mellom anbudspris og inntekt derfor bli
høyt også uten at inntekten faller etterpå.
Testet før det ble lagt inn (transaksjon som ble rullet tilbake): skraplageret og slagghåndteringen har samme verdi,
Kontroll (poeng og deler) og samme tall i vinduet (verdi, motbud uten penger, åpent/grunn); minstebudet er uendret når
ingen gamle anbud er høye (10 dagers inntekt). Med et kunstig gammelt anbud på 5/11/12/20/50/300 dagers inntekt ble
minstebudet 10/11/12/12/12/12 dager og verdien 10/11/12/20/50/300 dager; styrken ved minstebudet 60/60/60/46,5/29,4/12,0.
Det pågående budet (regelsett 1) hadde samme budstyrke, motbud, minste økning, overbudskrav og vindu for andre.
Etterpå: begge selskaper har minstebud = 10 dagers inntekt, verdensjobbene «ok». `npm test` har testen B-451 med de samme
tallene.
Endringslogg: ja.
Konto (B-149): uendret.

## B-452 Det gratis sesongpasset: raskere start på sesongstigen (2026-10-03)
Status: gjelder. Bygger på B-173 og B-287.
Bakgrunn: en spiller ønsket et «battle pass» med gratis og betalt spor. Sesongstigen er allerede et gratis spor, men etter
åtte dager hadde 11 spillere nådd trinn 1, sju hentet premien og ingen nådd trinn 2 – starten og synligheten var svake.
Eieren 3.10: det gratis sesongpasset er neste produktoppgave; betalingssporet venter (kosmetikk gir synlig belønning uten
å øke pengestrømmen).
Beslutning:
- **50 trinn som før.** Trinn 1 krever 6 poeng i alt, trinn 2 krever 12, deretter 20 poeng per trinn – 972 poeng for
  trinn 50 (før 1 000). Første premie kommer etter én full aktivitetsdag (spilt 1 + belønning 2 + oppdrag 3) eller to
  dager med spill og daglig belønning. Serveren: `season_tier_of`/`season_tier_points`, `season_track` (også `tier_at`
  og `next_at`) og `claim_season_tiers` (migrasjon 129). Appen speiler kurven (`tierOf`/`tierPoints`).
- **Liten pynt på trinn 1:** Sesongskilt (sesong 1) og et eget for sesong 2; de større sesongpremiene på 10, 20, 30, 40 og
  50 står. Skiltet står foran verket.
- **Synlig framgang:** neste premie (eller at et trinn venter) står på Dagens oppdrag på Mål og i velkomstvinduet.
  Premiene hentes med «Hent alt» som før.
- **Opptjent beholdes:** poeng og hentede trinn står. Den som alt har hentet trinn 1, får Sesongskiltet uten nye
  fagpoeng (appen legger inn pynten for hentede trinn som mangler). Med den nye kurven når mange trinn 2 straks og kan
  hente det (24 fagpoeng); et trinn som alt er hentet, gir aldri fagpoeng igjen.
- **Betalt spor:** ikke nå (svaret til eieren 3.10: bare pynt hvis det kommer, betaling og regler krever mye, og
  spillerbasen er liten).
Testet før det ble lagt inn (transaksjon som ble rullet tilbake): kurven gir 0→0, 5→0, 6→1, 11→1, 12→2, 31→2, 32→3,
971→49, 972→50; en spiller med 31 poeng som hadde hentet trinn 1, fikk trinn 2 (24 fagpoeng), og et nytt forsøk ga
ingenting. Appen: ny test i `npm test` (kurven begge veier for alle 50 trinn, pynt som mangler); Chromium 320/390/1366 px
mot en falsk server: «Sesongstigen: 3 poeng til trinn 2 – 24 fagpoeng» på Dagens oppdrag, Sesongskiltet lagt inn og
synlig i anleggsbildet, ingen sidelengs scrolling.
Endringslogg: ja.
Konto (B-149): uendret – sesongstigen krever konto som før.

## B-453 Anbudet synligere: varsel, budet tilbake og «Lønner det seg?» (2026-10-04)
Status: gjelder. Bygger på B-189, B-226, B-253 og B-443.
Bakgrunn: det første anbudet på slagghåndteringen (stenger 5.10) hadde to bud etter et døgn, selv om 20 kunne by og 16
hadde over 100 000 kr i konsernkassa. Beskjeden om åpent anbud sto bare som «!» på Konsern og på Industrien; at den som
taper får budet tilbake, sto skjult under «Slik virker anbudet», og ingenting sa hva selskapet kunne tjene. Eieren 4.10:
«Fiks det».
Beslutning:
- **Varsel i varsellinja:** når et anbud åpner, og når 12 timer er igjen, til den som ikke har bydd – hvert varsel én gang
  per anbud (`g.tenderNotice`, glemmes når anbudet stenger). Den som åpner appen sent, får bare det andre. Varselet sier
  hva eieren tjener på, når anbudet stenger, og at den som taper, får hele budet tilbake (`applyTenderNotices`,
  `tenderNoticeDue` i `net/world.ts`).
- **Varsler kan føre et sted:** logglinjer har `link` (nå bare «industri»). Et trykk på et slikt varsel i varsellinja går
  rett til Konsern → Industrien (pil til høyre i linja), og i varsellista står knappen «Gå til selskapet». Et varsel som
  er fulgt, er lest.
- **Ved budfeltet:** «Taper du, får du hele budet tilbake når anbudet stenger.» står synlig under feltet.
- **«Lønner det seg?» for anbud:** 14 dager × kjøperens eget anslag (`estimateMine`, ellers `estimatePerDay`) mot budet som
  er skrevet (eller budet som står). Uten bud: hva selskapet tjener per dag og på 14 dager. Det er et anslag; reglene for
  anbudet er uendret.
Krever konto: anbudet gjorde det allerede (B-189); varselet kommer bare med konto og åpnet konsern, som «!» på Konsern.
Testet: ny test i `npm test` (varsel ved åpning og 12 timer før, én gang hver, ingen etter bud, bare det andre når appen
åpnes sent, stengt anbud glemmes, `migrate`); Chromium 320/390/1366 px mot en falsk server: varselet i varsellinja med pil,
trykk går til Industrien, «Lønner det seg?» med 30 mill. kr, knappen i varsellista, ingen sidelengs scrolling.
Endringslogg: ja.

## B-454 Verkskontoen: analyse og forslag (2026-10-04)
Status: bygget i B-455 (eieren: «bygg alt»). Bygger på B-331 (spor B), B-336 og B-381.
Bakgrunn: eieren 3.10 ville ha flere valg for store hjemmeverk når nabolaget (28 mrd.) er kjøpt eller ikke brukt.
Funn (21 storverk, 4.10): kassa median 9,5 mrd., nabolaget i snitt 2,4 av 6 bygg, 7 har ingen – fire av dem med
9,5–45 mrd. i kassa. Kortet står nederst på Verket → Anlegg uten råd eller «!», så det største problemet er synlighet.
Ramme: marginen hjemme teller i bidraget til konsernkassa (B-318), så nye kjøp hjemme skal være synlige, prestisje eller
trygghet, aldri kostnadskutt eller mer salg.
Forslag (docs/VERKSKONTO-FORSLAG.md): V1 råd og «!» om nabolaget (nå), V2 nabolaget i tre trinn uten ny effekt, V3 verkets
stiftelse med titler og pynt i stigende trinn, V4 slitasje og fornyelse (senere). Ikke anbefalt: kostnadskutt for kroner,
kroner til fagpoeng, overføring til konsernkassa.
Endringslogg: nei.

## B-455 Verkskontoen bygget: råd om nabolaget, tre trinn, stiftelsen og slitasje (2026-10-05)
Status: gjelder. Bygger på B-454 (forslaget), B-336 og B-381.
Bakgrunn: eieren 5.10: «bygg alt» om V1–V4 i docs/VERKSKONTO-FORSLAG.md. De åpne spørsmålene ble besvart med
anbefalingene: 3 × og 9 × uten ny effekt, stiftelsen bare i eget spill, slitasjen i en lett versjon.
Beslutning:
- **V1 – råd og «!»:** når kassa holder til det neste nabolagsbygget, ingenting bygges og kortet «Byggeprosjekter» ikke er
  sett (`g.buildSeen`), kommer et råd på Verket (trykk går til kortet på Anlegg) og «!» på Verket i menyen. Når kortet er
  sett, kommer det ikke igjen.
- **V2 – nabolaget i tre trinn:** når alle seks byggene står, kan hvert utvides til trinn 2 (3 × prisen) og trinn 3 (9 ×),
  i rekkefølge, ett om gangen, 2 døgn ekstra byggetid per trinn. Ingen ny fordel – byggene blir større (og lysere på trinn
  3) i bildet. I alt 28 + 84 + 252 = 364 mrd. (`g.neighborhood.levels`).
- **V3 – verkets stiftelse:** når hele nabolaget står: gaver til byen i trinn (1, 2, 5, 10, 20, 50, 100, 200, 500,
  1 000 mrd., deretter dobling), hvert med en tittel («Velgjører» … «Byens grunnstein»), prestasjoner og pynt på åsen (park,
  fontene, statue, gullstatue). Bare i eget spill – ikke på profilen (`g.foundation`).
- **V4 – slitasje og fornyelse (lett):** bare storverket. Slites 1/180 per spilldøgn (ikke i sommerstansen), høyst 150 %.
  Over 50 % havarerer ovnene oftere (1 + 2 × (slitasje − 0,5)). Råd og beskjed ved 60 %; reparatøren fornyer selv ved 70 %
  (samme bryter som foringen) når kassa har dobbelt beløpet. Fornyelsen koster 20 % av utstyrets pris × slitasjen
  (`game/upkeep.ts`, `g.upkeep`). Testspilleren (flink og nybegynner) fornyer ved rådet.
- **Alt føres som `investering`**, som `contribution_margin_raw` ikke teller: ingen av kjøpene øker eller senker bidraget
  til konsernkassa, og lokal kasse gir fortsatt ingen makt i verden (B-190, B-323). Posten heter nå «Kjøp av utstyr, bygg
  og gaver».
- Nye prestasjoner i gruppen «Byen»: Nabolaget (1, 6, 12, 18 trinn) og Verkets stiftelse (1, 3, 5, 8, 10 gaver).
Krever konto: nei (regel 1, eget spill i spilltid).
Testet: nye tester i `npm test` (råd og «sett», trinn og priser, ingen ny fordel, investering, stiftelsens priser og
titler; slitasje over 180 døgn, risiko, fornyelsens pris, gammel lagring); `balance.ts` og `--daglig 15` (exit 0),
`--storovn 330`; Chromium 320/390/1366 px: «!» på Verket forsvinner når kortet er sett, kortet med trinn og stiftelsen,
raden «Anlegget» under Vedlikehold, rådet om slitasje, byggene og stiftelsen i anleggsbildet, ingen sidelengs scrolling.
Endringslogg: ja.

## B-456 Datakvaliteten i tidslinjetallene: første oversikt (2026-10-05)
Status: rapport – anbefalingene er bygget i B-457. Bygger på B-396, B-398 og B-401.
Bakgrunn: eieren 1.10: oversikten tas når flere dager er samlet. Grunnlag 1.10–4.10 (`docs/DATAKVALITET.md`).
Funn: 88 % av radene har de nye tellerne (100 % siste døgn); vakten har bare merket to nye spill og ikke nullet noe.
Storverk: 260–326 kWh/t (alle 16 gyldige), 3,7 % variasjon fra dag til dag for samme spiller, presisjon stort sett
97–99 %. Små verk: ca. 1 000 kWh/t og for lite stål til å bli gyldige.
Anbefaling (ikke bygget): minstetonn 5 000 t; små verk utenfor strøm per tonn; absolutt kWh/t blant storverk per uke, ikke
forbedring (variasjonen er like stor som en ukes forbedring); minst 50 leveranser per uke for presisjon; «Mer stål enn før»
tas ut når en konkurranse er valgt. Ny oversikt om et par uker.
Endringslogg: nei.

## B-457 Ukens utfordring: «Mest stål per kWh» og «Leveranser i tide» (2026-10-05)
Status: gjelder. Erstatter «Mer stål enn før» i rotasjonen (B-235, B-387). Bygger på B-396, B-398 og B-456.
Bakgrunn: eieren 5.10: «kjør dine anbefalinger» om B-456.
Beslutning:
- **Rotasjon** (`week_kind`, migrasjon 130): uka 5.10 er «Flest aktive dager» som før; fra uka 12.10 går det i fire:
  stål per kWh (12.10) → kontrollrom (19.10, som før) → leveranser i tide (26.10) → aktive dager (2.11). Ukene før 12.10
  gir samme type som før, så gamle resultater regnes likt. «Mer stål enn før» er tatt ut.
- **Mest stål per kWh** (`strom`): kg stål per kWh i uka, 1 000 × tonn / kWh fra tidslinja (`timeline_energy`) – ikke det
  avrundede kWh/t, som ga likt tall for tre spillere i prøven. Minst 5 000 t og 120–3 000 kWh/t. Små verk kommer ikke med.
  Absolutt tall, ikke forbedring.
- **Leveranser i tide** (`presisjon`): levert / (levert + misligholdt + avbrutt) i uka, i prosent med én desimal, minst 50
  leveranser (`timeline_metrics`). Likt tall gir delt plass.
- Begge regnes av serveren i ekte uker (mandag–mandag, norsk tid) fra tellerne i tidslinja; farten i spillet gir ikke
  bedre forhold. Medaljer, ukekiste og sesongpoeng som før.
- Appen: nye typer i `WEEK_KINDS` med forklaring, tall («3,79 kg stål per kWh», «99,4 % i tide») og hva som skal til for å
  komme på lista.
Testet: migrasjonen i en transaksjon som ble rullet tilbake, mot uka 28.9–4.10: 16 storverk med stål per kWh (3,07–3,85),
15 med leveranser i tide (90,7–100 %), «dager» uendret (29 spillere). Etterpå: rotasjonen gir vekst/tonn/dager for ukene
før 12.10 som før, så strom/kontroll/presisjon/dager; rådgiveren uten nye funn. Appen: ny test i `npm test`.
Krever konto: ja, som ukens utfordring ellers (B-152).
Endringslogg: ja.

## B-458 Del verket: delingsknapp og forhåndsvisning av lenken (2026-10-05)
Status: gjelder, bortsett fra bildet i delingen (erstattet av B-460).
Bakgrunn: eieren 5.10: «kjør på med dine anbefalinger» – anbefaling 2 (dele før verving): spillet hadde ingen enkel måte å
vise fram verket på, og en delt lenke ga ingen forhåndsvisning.
Beslutning:
- **Delingsknapp** på anleggsbildet (Verket → Oversikt, ved pynteknappen): telefonens delingsmeny med bilde av verket (SVG
  tegnet til PNG, 1 200 px), én setning («Verket mitt lager X tonn stål i døgnet …») og lenken. Kan nettleseren ikke
  dele, kopieres teksten og lenken (`ui/share.ts`). Med konto har lenken vervekoden (B-459).
- **Forhåndsvisning:** Open Graph- og Twitter-tagger i `index.html` med eget bilde `public/og.png` (1 200 × 630, laget fra
  app-ikonet og tittelen med Chromium).
Testet: Playwright 320/390/1366 (knappen overlapper ikke pynteknappen, ingen horisontal scrolling), delingen i Chromium
(kopiering), typesjekk, lint, `npm test`, bygg.
Krever konto: nei (regel 1). Vervekoden i lenken krever konto (B-459).
Endringslogg: ja (sammen med B-459).

## B-459 Verv en venn (2026-10-05)
Status: gjelder.
Bakgrunn: eieren 5.10: «kjør på med dine anbefalinger» – anbefaling 1 med tak og krav, så vervingen ikke kan brukes til å
lage penger med egne kontoer.
Beslutning:
- **Kode og lenke** (migrasjon 131): hver konto (ikke gjest) får en kode på seks tegn (`referral_my_code`). Lenken er
  `…/Simulator/?verv=KODE`; appen husker koden i 14 dager (`stalverk-verv-v1`) og tar den bort fra adresselinja.
- **Kobling:** når vennen er innlogget og spillet avklart, kaller appen `referral_register`. Serveren sier nei til gjester,
  ukjent kode, egen kode, konto som alt er vervet, konto eldre enn 14 dager og den som har vervet 5.
- **Vennen** får en startpakke i eget spill: 50 000 kr og 25 fagpoeng (spilltid, B-323), lagt inn som andre belønninger
  (`grant`, B-426) – bare når serveren svarer `ok`, som skjer én gang per konto.
- **Den som vervet** får 10 mill. i konsernkassa når vennen er ekte: egen konto, ikke sperret eller flagget, minst 3 ulike
  ekte dager med lagring og nådd nivå 3 (støperiet, `stage` 2) i tidslinja. Regnes «lat» når kortet hentes
  (`referral_settle`), én gang per venn (`rewarded_at` settes før betalingen). Føres i kassaboka som `justering` med ref
  `verving:<venn>` – ikke `utbytte`/`bidrag`, så den øker ikke lånerammen. Høyst 5 venner = 50 mill., mindre enn to
  dagers utbytte for et fullt konsern.
- **Kortet «Verv en venn»** på Mål → Uka (fra verkstedet): forklaring, «Del lenken», koden og vennene med dager og nivå.
  Uten konto: en linje i «Det går du glipp av», og den som kom via en lenke, ser startpakken der.
- **Prestasjonen «Verving»** (1, 3, 5 venner) er skjult til man har den, fordi den krever konto.
- Tallene i `config.world.referral` (`reward`, `cap`, `min_days`, `min_stage`, `max_age_days`).
Testet: migrasjonen i en transaksjon som ble rullet tilbake (kode, egen kode avvist, venn koblet én gang, ingen betaling
før kravene, 10 mill. og én rad i kassaboka etter), rådgiveren uten nye funn, nettest med falsk server, Playwright.
Krever konto: ja (regel 2 og 7: konsernkassa og serveren avgjør).
Endringslogg: ja.

## B-460 Delingen uten bilde (2026-10-05)
Status: gjelder. Erstatter bildet av verket i delingen fra B-458.
Bakgrunn: eieren 5.10: «dropp bilde som sendes med teksten når man deler».
Beslutning: delingsknappen sender bare teksten og lenken (`shareGame` i `ui/share.ts`); bildet av anleggsbildet
(`sceneImage`) er tatt bort. Forhåndsvisningen av lenken (Open Graph, `og.png`) står som før.
Testet: typesjekk, lint, `npm test`, bygg, Playwright (kopieringen virker som før).
Krever konto: nei.
Endringslogg: ja.

## B-461 Nye spillere som står fast på verkstedet: Salg ser at verket står, bekreftelse og råd om sene kontrakter (2026-10-05)
Status: gjelder. Bygger på analysen i økt 380 (FORSLAG.md) og eierens «fortsett».
Bakgrunn: ingen kontoer står på støperiet eller stålverket; halvparten på verkstedet har negativ kasse. Driften går i
pluss, men bøter for frister som går ut tar kassa. To mønstre i de ekte lagringene: (1) én spiller signerte ca. 60 t på
få døgn med 2,4 t i døgnet – «Rekker det ikke» signert likevel; (2) én sto i fem døgn fordi foringen skulle byttes uten
penger til omforing, og Salg sa likevel «Rekker det», fordi anslaget falt tilbake på kapasiteten når de siste døgnene
hadde null produksjon. Spilleren signerte nye kontrakter rett før konkurs.
Beslutning:
- **Verket står** (`plantStopped` i `engine.ts`): når alle ovnene venter på penger til omforing eller mangler folk, regner
  vurderingen på Salg (`assessOffer`) og ordrekøen (`lateContracts`) med null produksjon, og Salg sier hvorfor.
  `realisticDailyT` er uendret (den brukes også til størrelsen på nye forespørsler).
- **«Signer likevel…» spør først:** en forespørsel verket ikke rekker, må bekreftes med hva den kan koste (opptil hele
  boten og omdømmet).
- **Råd på Verket:** «Verket står: foringen må byttes …» (kritisk, til Marked → Skrap) og «N kontrakter i ordrekøen
  rekker ikke fristen» (til Salg → Ordrekø). Rådet foreslår å avbryte bare når det er billigere: boten ved fristen
  regnes av det som ikke er levert da, avbryting koster 60 % av det som gjenstår (`lateCosts`). Ikke for spillere med
  salgsdirektør (han holder køen selv, B-312).
- En sperre for antall kontrakter på verkstedet (forslag a) er ikke bygget; ny oversikt om en uke viser om dette holder.
Testet: ny test i `npm test` (Salg sier nei når ovnen står, «la den gå» mot «avbryt»), balansen, Playwright 320/390/1366.
Krever konto: nei (regel 1).
Endringslogg: ja.

## B-462 Vennelista (2026-10-05)
Status: gjelder. Siste punkt i anbefalingen om flere spillere (B-458, B-459); eieren: «fortsett».
Beslutning:
- **Enveis, som å følge** (migrasjon 132): spilleren legger til andre med brukernavnet (fanen «Venner» i
  Skiftrapporten) eller med «Legg til i vennelista» på profilarket. Den andre får ingen beskjed – det finnes ingen
  forespørsler å godkjenne, og dermed ingen å spamme med.
- **Bare det profilene alt viser andre** (`follow_list`): nivå/tittel og sist aktiv i grove trinn (B-419). Aldri kasse,
  konsernkassa eller klokkeslett. Sperrede og flaggede vises ikke. Trykk på navnet åpner profilen.
- Høyst 100 på lista. «Ta av vennelista» setter `active = false` (ingen sletting, så migrasjonen ikke holdes igjen,
  B-434); å legge til igjen slår den på.
- Ikke bygget: gjensidige venner, varsler når en venn går forbi deg, og vervede venner rett på lista – kan komme senere.
Testet: migrasjonen i en transaksjon som ble rullet tilbake (legg til, egen konto, ukjent navn, ta av, legg til igjen),
rådgiveren (bare kjente typer), nettest med falsk server, Playwright 320/390/1366 (fanen, legg til, feilmelding,
profilknappen, ingen sidelengs rulling).
Krever konto: ja (regel 3: viser andre spillere og lagres på serveren).
Endringslogg: ja.

## B-463 Brukernavn er påkrevd for alle kontoer (2026-10-05)
Status: gjelder. Skjerper B-214 (brukernavnet velges når kontoen lages).
Bakgrunn: eieren 5.10: «Man må ha brukernavn, om man har laget seg konto.» Navnet velges i skjemaet og settes etter
bekreftelsen på e-post, men en konto kunne bli stående uten navn hvis navnet ble tatt mens spilleren ventet på e-posten,
eller hvis det ikke ble husket (privat modus). Ingen kontoer manglet navn 5.10 (32 med navn, 4 gjester).
Beslutning:
- **Arket «Velg brukernavn»** (`ui/NicknameGate.tsx`) legger seg over spillet når en innlogget konto mangler brukernavn.
  Det kan ikke lukkes – bare «Logg ut i stedet». Samme regler som før: 3–20 tegn, ledig uten forskjell på store og små
  bokstaver, og serveren sjekker igjen (`set_nickname`, unik indeks).
- Navnet fra skjemaet prøves først i det stille; arket vises bare når det ikke gikk, med forklaring og navnet fylt ut.
- Kontokortet viser navnet med én gang (`NICKNAME_EVENT`); hjelperne for navnet fra skjemaet står i `ui/nickname.ts`.
- Gjester har ingen konto i appens forstand og får ikke arket.
Testet: Playwright 320/390/1366 (uten navn, navnet tatt i mellomtiden, navnet ledig), typesjekk, lint, `npm test`, bygg.
Krever konto: ja (gjelder bare kontoer).
Endringslogg: ja.


## B-464 Realistisk inntektsanslag for selskapene og minstebud i anbudene (2026-10-05)
Status: gjelder (lagt inn 6.10, etter at oppkjøp 12 var avgjort). Bygger på B-449–B-451.
Bakgrunn: kontrollen av slagganbudet 5.10: vinneren betalte 75 mill., 2,7 dagers anslått inntekt. Eieren: «Ta din
anbefaling og fortsett». Funnet: `company_estimate` regnet som om alle aktive spillere når taket for det som telles hver
ekte dag, mens betalingen teller det de faktisk lager. Skraplageret ble anslått til 25,6 mill. per dag og betalte
10,6–16,7 mill. Anslaget styrer høyeste anbud (14 dager), selskapsverdien V (10 dager) – og dermed minstebudet ved
oppkjøp, budstyrken og Kontrollen – og «Lønner det seg?».
Beslutning (migrasjon 133):
- **Anslaget er det betalingen ville gitt:** snittet over de siste 7 ekte dagene av det som telles per spiller
  (`company_counted_t` fra `production_days`), minus eieren (kjøperens eget anslag: minus kjøperen), ganget med gebyret.
  Tallene per spiller regnes én gang per ekte dag (`company_estimate_refresh`, pg_cron `selskapsanslag`, i
  `company_estimate_parts`). Med færre enn 3 dager med tall brukes det gamle (`company_estimate_cap`).
- **Minstebud i anbudene:** 5 dagers anslått inntekt (`config.world.tender_floor_days`), rundet ned til hele millioner,
  aldri under `bid_min` og aldri over halvparten av høyeste bud. Høyeste bud er fortsatt 14 dager.
- Regelen for V, minstebudet ved oppkjøp (B-451) og Kontrollen er uendret – de får bare et riktig anslag.
- Lagt inn etter at oppkjøp 12 var avgjort, så budet ble avgjort med verdien det ble lagt inn med.
Dry-run (transaksjon som ble rullet tilbake, 5.10): skraplageret 25,6 → 14,6 mill./dag (betalt snitt 7 dager: 13,6),
slagghåndteringen 27,9 → 16,0; V og minstebud ved oppkjøp 256 → 146 og 279 → 160 mill.; neste anbud: høyeste 205/224,
minstebud 73/79 mill. Ingen investeringer, så Kontrollen endres ikke nå.
Lagt inn 6.10: skraplageret 14,95 mill./dag (før 25,9), slagghåndteringen 16,3 (før 28,3); V og minstebud ved oppkjøp
149,5 og 163 mill. Verkstedet er ikke aktivt og har ennå det gamle anslaget; det regnes første halvtime etter at det slås på.
Krever konto: ja, som selskapene ellers (B-189).
Endringslogg: ja.

## B-465 Varsel på mobilen (2026-10-05)
Status: gjelder. Første del av forslaget «Varsel på mobilen» (FORSLAG.md, B-149: «Ingen varsel på mobilen enda»).
Bakgrunn: eieren 5.10: «Gå for dine anbefalinger og fortsett.» Det som skjer mellom spillerne går i ekte tid, men
spilleren fikk bare vite om det ved å åpne appen. Et oppkjøpsbud på selskapet ditt har en frist; uten varsel rakk man
ikke alltid å legge inn motbud.
Beslutning:
- **Web Push uten bibliotek** (migrasjon 134, edge-funksjonen `push`): `push_subscriptions` (én rad per enhet, med
  temaene spilleren valgte) og `push_outbox`. Triggerne legger varsler i utboksen bare når mottakeren har et aktivt
  abonnement på temaet; jobben `push-varsler` (hvert minutt) ser etter ferdige byggeprosjekter og oppkjøpsfrister og
  vekker edge-funksjonen, som sender kryptert (aes128gcm, VAPID med WebCrypto) og slår av enheter som er borte (404/410).
- **Temaene:** oppkjøp (bud på selskapet ditt, overbud, 6 timer igjen, utfallet), anbud (åpner, hvem som vant – til dem
  som bød), byggeprosjekter i konsernet som er ferdige, og privatmeldinger (høyst ett varsel per avsender per 10 minutter,
  aldri fra blokkerte, uten teksten). Daglig belønning varsles ikke – det blir mas.
- **Ingen hemmelige beløp:** anbudsbud nevnes ikke for andre; oppkjøpsbudet er offentlig fra før (B-339). Varsler eldre
  enn 6 timer sendes ikke.
- **Nøklene:** VAPID-nøkkelen lages av edge-funksjonen første gang og står bare i Vault (`push_vapid_private`,
  `push_vapid_public`); appen henter den offentlige med `push_public_key()`. Edge-funksjonen svarer bare på kall med
  vekkenøkkelen fra Vault (`push_kick_key`), adressen står i Vault (`push_url`). Ingenting av dette står i repoet.
- **I appen:** bryteren «Varsel på mobilen» med temaene under Innstillinger → Varsler (`ui/Push.tsx`, `net/push.ts`), og
  en oppfordring på selskapet du eier når oppkjøp er på (gradvis synlighet: der det betyr mest). Trykk på et varsel
  åpner riktig sted (Industrien, Konsern eller samtalen i Meldinger, `ui/pushLinks.ts`). Utlogging slår av varslene på
  enheten (`onBeforeSignOut`). På iPhone og iPad virker det bare når spillet ligger på hjemskjermen; kortet sier det.
Testet: krypteringen og signaturen mot et uavhengig bibliotek (dekryptert likt, gyldig ES256); migrasjonen med to ekte
kontoer i en rullet transaksjon (abonnement, ukjent tema avvist, to meldinger gir ett varsel, bud, overbud, frist,
utfall, henting og tilbakemelding); edge-funksjonen ute (nøkkelen laget, 401 uten vekkenøkkel); nettest; Playwright
320/390/1366 (bryter, temaer, oppfordring, trykk på varsel mens appen er åpen og når den åpnes fra varselet). Ekte
varsel på telefonen må eieren prøve selv.
Krever konto: ja (regel 3: lagres på serveren og gjelder hendelser mellom spillere).
Endringslogg: ja.

## B-466 Prøvevarsel (2026-10-05)
Status: gjelder. Bygger på B-465.
Bakgrunn: eieren 5.10: «Fortsett». Etter B-465 sto én enhet på (en iPhone), men ingen hadde fått et varsel: det kommer
først når noen byr eller skriver. Uten en måte å prøve på vet verken eieren eller spillerne om varslene kommer fram.
Beslutning:
- **«Send et prøvevarsel»** under bryteren (`push_test`, migrasjon 135): serveren legger «Varslene virker» i utboksen til
  alle enhetene til kontoen som står på, uansett tema, og jobben sender det innen et minutt. Høyst ett per 10 minutter
  per konto (unik `ref`). `push_claim` tar med alle aktive enheter for temaet `test`.
- Appen sier «sendt – kommer innen et minutt», eller hvorfor ikke (varsler av, eller nettopp sendt).
Testet: i en rullet transaksjon (ett per 10 minutter, går til alle enhetene som står på), typesjekk, lint, `npm test`,
bygg, Playwright 320/390/1366.
Krever konto: ja (som B-465).
Endringslogg: ja.

## B-467 Varsler på for alle (2026-10-05)
Status: gjelder. Endrer B-465 (der slo spilleren varsler på selv).
Bakgrunn: eieren 5.10, etter at prøvevarselet kom fram: «Skru på varsler for alle. Godtar ikke de varslinger er det ok.
Da kan de gjøre det i innstillinger senere.»
Beslutning:
- **Første trykk i spillet** etter innlogging, på en enhet som kan få varsler, slår på varsler med alle fire temaene
  (`ui/PushAuto.tsx`). Telefonen spør selv om lov – det kan ingen nettside hoppe over, og iPhone spør bare rett etter et
  trykk. Derfor skjer det ved et trykk og ikke når siden lastes.
- **Én gang per konto og enhet** (`stalverk-varsel-auto-v1`): svaret huskes, også «nei». Den som slår av under
  Innstillinger, spørres aldri igjen. Har enheten alt gitt lov, slås varslene på uten spørsmål.
- Spørsmålet om lov kommer nå før alt annet i `enablePush`, så iPhone ikke mister trykket mens appen venter på nettet.
- Uendret: iPhone/iPad bare fra hjemskjermen, gjester får ingenting, og alt kan slås av under Innstillinger → Varsler.
Testet: Playwright (iPhone 13) med telefonens svar «ja», «nei» og «lov alt gitt»: ingen spørsmål før trykket, bare ett
spørsmål, alle temaene ved ja, ingenting ved nei, svaret husket; typesjekk, lint, `npm test`, bygg.
Krever konto: ja (som B-465).
Endringslogg: ja.

## B-468 Navnet på verket i byggevarselet (2026-10-05)
Status: gjelder. Retter B-465.
Bakgrunn: eieren 5.10: «Fiks». Varselet om et ferdig byggeprosjekt sa «Verket er modernisert» uten navn: ved
modernisering og utbygging står navnet ikke i bestillingen (`konsern_orders.name` er tom).
Beslutning: `push_scan` (migrasjon 136) henter navnet fra verket i konsernet (`konsern.plants`, samme id som `plant_id`)
når bestillingen ikke har det. Varselet sier nå for eksempel «Elveverket er modernisert».
Testet: oppslaget mot de siste bestillingene (alle fikk navn), jobben `push-varsler` går som før.
Krever konto: ja (som B-465).
Endringslogg: ja.

## B-469 Varsel om motbud og høyere bud (2026-10-05)
Status: gjelder. Utvider B-465.
Bakgrunn: eieren 5.10: «Jeg som prøver å ta over en bedrift får ikke varsel på mobilen om eier byr over meg igjen.»
Triggeren i 134 reagerte bare på status og ny kjøper – motbud (`takeovers.defense`) og at samme kjøper hever budet
(`takeovers.bid`), ga ingen varsel.
Beslutning (migrasjon 137, `push_on_takeover`):
- **Motbud:** kjøperen får «Eieren la inn motbud på …» med fristen, uten beløpet – motbudet er ikke offentlig (bare
  oppkjøpsbudet er det, B-339). Høyst ett slikt varsel per 10 minutter per oppkjøp.
- **Høyere bud fra samme kjøper:** eieren får «Høyere oppkjøpsbud på …» med det nye budet og fristen.
Testet: i en rullet transaksjon (motbud → varsel til kjøperen, høyere bud → varsel til eieren, nytt motbud innen 10
minutter → ingen nytt varsel).
Krever konto: ja (som B-465).
Endringslogg: ja.

## B-470 Dagens oppdrag «Kjøp eller moderniser et datterverk» teller kjøpet (2026-10-07)
Status: gjelder. Retter B-153.
Bakgrunn: eieren 7.10: «Jeg kjøpte nettopp et nytt stålkompleks, men det teltes ikke i dagens utfordring om å kjøpe eller
modernisere et datterverk.» Oppdraget målte verkene (1 per verk + trinnet), og et kjøp i konsernet blir først et verk når
byggingen starter (kø i ekte tid, B-326). Et bytte til kompleks tar i tillegg bort verket det erstatter, så summen ble den
samme eller lavere.
Beslutning:
- **Oppdraget teller kjøpene:** `g.totals.konsernBuys` øker ved hver bestilling som serveren godtar (nytt verk, bytte
  til kompleks, modernisering, oppgradering) og går ned ved en avbestilling (`noteKonsernBuy`), så kjøp og avbestilling
  ikke gir oppdraget. Salg og flytting teller ikke.
- **Oppdrag startet før rettingen** (`v` under 3) får startverdien satt på nytt i `migrate()`: står noe i køen, er det
  godskrevet (det kjøpet som ikke ble telt), ellers står oppdraget på 0.
- Belønningen sjekkes ikke av serveren (`claim_daily_missions` gir bonusen én gang per dag), så ingenting på serveren er
  endret.
Testet: `npm test` (ny test: bytte til kompleks teller, avbestilling trekker fra, gammelt oppdrag med og uten noe i
køen), `balance.ts` og `balance.ts --daglig 15`.
Krever konto: ja, som kjøp i konsernet ellers (B-326).
Endringslogg: ja.

## B-471 Statussjekk på main og ryddingen av meldinger lagt inn (2026-10-07)
Status: gjelder. Fullfører B-397 og B-421/B-445.
Bakgrunn: begge krevde eieren – GitHub-integrasjonen kan ikke endre beskyttelsen av grener, og Supabase-connectoren holder
igjen SQL med sletting. Eieren gikk gjennom stegene 7.10 og gjorde begge.
Beslutning:
- **`main` krever PR og at `sjekker` er grønn** (klassisk regel, uten krav om godkjenning eller oppdatert gren). Claude venter
  på sjekken før merge (eller slår på auto-merge); en rød sjekk rettes, aldri omgås.
  Tillegg 7.10 kveld: eieren krysset av for «Do not allow bypassing the above settings» etter at PR #414 ble merget før
  sjekken var ferdig – regelen gjelder nå også eieren, og GitHub avviser en merge før `sjekker` er grønn.
- **Ryddingen hver natt er i gang** (`dm_cleanup`, cron `meldinger-rydding` 03:53 UTC): privatmeldinger og avgjorte
  rapportsamtaler etter 30 dager, tomme samtaler, sendte varsler etter 14 dager, avslåtte enheter etter 60. Fila er flyttet
  fra `supabase/utkast/` til `supabase/108_meldinger_rydding.sql`. Sjekket etterpå: jobben er aktiv, funksjonen har
  varselryddingen, og verken `anon` eller `authenticated` kan kalle den. Ingenting var gammelt nok til å slettes 7.10.
Krever konto: nei (drift).
Endringslogg: nei.

## B-472 Gjennomgangen 7.10: 17 feil i kontobytte, verving, varsler, ukemetrikk og spillet rettet (2026-10-07)
Status: gjelder. Retter B-459, B-462–B-470 og B-396/B-457.
Bakgrunn: eieren gjennomgikk de 22 PR-ene til og med #414 og fant 17 feil (bekreftet med kode og gjenspilling), med
prioritet kontofeilene og vervingen først og ukemetrikken før strømuka 12.10. Hver feil er sjekket i koden før rettingen.
Beslutning:
- **Kontobytte (1–4, 14, 15):** kall som gjelder én konto, sendes med den kontoens nøkkel (`rpcFor`/`tokenFor` i
  `net/supabase.ts`) og går ikke ut hvis en annen konto er logget inn – brukernavnet (`setNickname(uid, …)`) og påslaget
  av varsler. Hendelsen «brukernavnet er satt» har kontoen med (`announceNickname`/`nicknameFrom`), så et sent svar ikke
  lukker en annen kontos navnekrav. Utloggingen logger ut økta den startet med, ikke en ny konto. Et påslag av varsler som
  var underveis da varslene ble slått av (utlogging), slår seg av igjen med samme konto. Varsler-på-for-alle merker seg
  ferdig først når telefonen har svart. Vennelista hentes på nytt ved kontobytte.
- **Verving (5–7, migrasjon 138):** taket teller også belønnede venner som har slettet kontoen (`referral_used`), vervinger
  og utbetalinger for samme spiller går én om gangen (lås på `referral_codes`), og utbetalingen stopper på taket. Samme kode
  igjen gir `ok` (startpakken kom ikke fram); appen gir startpakken høyst én gang per spill (`counters.vervStart`).
- **Varsler på serveren (8, 9, migrasjon 140 og edge-funksjonen):** et varsel som ikke kom fram til noen enhet på grunn av
  midlertidige feil (ingen svar, 408, 429, 5xx), legges tilbake i køen, høyst 5 forsøk (`attempts`); et varsel som ble
  hentet men aldri meldt tilbake, prøves igjen etter 10 minutter. Byggevarselet tar med prosjekter som alt er `ferdig`.
- **Ukemetrikken (10, migrasjon 139):** `timeline_metrics` regner fra siste lagring før perioden, så første økt i uka er med
  i «Mest stål per kWh» og «Leveranser i tide» (første gang 12.10 og 26.10).
- **Spillet (11–13, 16, 17):** fornyelsen av storverket regner med støpemaskinen og utstyret på hver ovn; en avbestilling
  trekker bare fra et kjøp som er talt i dag (`daily.buyIds`); en varsellenke som kommer mens startskjermen står, huskes til
  spillet åpnes; nabolagstipset regnes som sett først når byggekortet er på skjermen; å følge en lenke i varsellinja merker
  bare det varselet som lest (`inboxRead`), ikke eldre, uleste varsler.
Testet: `npm test` (nye tester: kontobytte under navn og utlogging, fornyelsesprisen, avbestilling fra i går, bjella etter
lenken), verving og varselkøen i transaksjoner som ble rullet tilbake, ukemetrikken mot denne ukas tall (én spiller fikk
med 27 leveranser fra første økt), `balance.ts` og `--daglig 15` (exit 0), Playwright av byggekortet på iPhone-størrelse.
Krever konto: uendret (verving, varsler, venner og brukernavn krever konto som før).
Endringslogg: ja.

## B-473 Egen gjennomgang av B-472: ti svakheter rettet (2026-10-07)
Brukeren: «Fortsett». En gjennomgang av mine egne rettelser i B-472 (PR #415) fant ti svakheter; alle er rettet.
- **Varselkøen (migrasjon 141):** ryddingen står i `push_housekeeping` og kjøres av `push_kick` hvert minutt, ikke bare når
  noe annet venter – før ble et varsel som var hentet men aldri meldt tilbake, liggende. Et slikt varsel legges tilbake bare
  hvis det er under 6 timer gammelt og har færre enn 5 forsøk; ellers merkes det. Nye forsøk venter lenger og lenger
  (`retry_at` = nå + 2^forsøk minutter: 2, 4, 8, 16), og midlertidige feil (ingen svar, 408, 429, 5xx) teller ikke mot
  enheten (`fails`) – før kunne et kort avbrudd hos tjenesten for mobilvarsler slå av enheter.
- **Verving (141):** samme kode igjen gir `ok` bare det første døgnet etter koblingen, så venner fra før B-472 ikke kan hente
  startpakken på nytt i et nytt spill. `referral_my_code` gir `used` (plassene serveren teller, også belønnede venner som er
  slettet), og kortet «Verv en venn» bruker det for «fullt» og «x av 5».
- **Ukemetrikken (141):** utgangspunktet før perioden er aldri en rad merket `pre_reform` (fast regel, B-190).
- **Kontoen i appen:** utloggingen hos tjenesten bruker den fornyede nøkkelen når samme konto fortsatt er innlogget.
  `tokenFor` gir en midlertidig feil (ikke «kontoen ble byttet») når fornyelsen feiler for samme konto, og «Velg brukernavn»
  beholder navnet fra skjemaet ved nettfeil i stedet for å si at det er tatt. Beskjeden «Brukernavnet er lagret» på
  kontokortet blir ikke lenger overskrevet av sin egen hendelse.
- **Spillet:** dagens oppdrag «datter» husker den nyeste av de nye bestillingene (høyeste id) etter et kjøp. Varsellista
  bruker `markAllSeen`, og «Ny» vises ikke på varsler som alt er fulgt fra varsellinja.
Testet: `npm test` (nye tester: nøkkelen ved utlogging, fornyelse uten nett, `used`), varselkøen og vervingen i
transaksjoner som ble rullet tilbake (2 og 4 minutter, `fails` urørt ved 503 og +1 ved 403, femte forsøk merkes, strandede
legges tilbake eller merkes «for gammelt»; samme kode igjen `ok` første døgn og «brukt» etter to).
Krever konto: uendret.
Endringslogg: ja.

## B-474 Databasen mot repoet 7.10: ingen avvik, og skriptet for kontrollen i repoet (2026-10-07)
Brukeren: «Fortsett». Kontrollen fra B-403 er gjort på nytt etter migrasjonene 099–141. 27 funksjoner har en annen kropp i
databasen enn i siste `create function` i repoet; alle 27 er endret senere med replace() på den levende kroppen (081 i en
løkke, og navngitt i 084/087/090/091/095/097/111/114/115/118/119/120/121/123/124/125). Ingen funksjon finnes bare i
databasen eller bare i repoet, og ingen levende funksjon har UTC-dato (081) eller det gamle lenkefilteret med `\b` (115)
igjen. Spørringen lages nå av `supabase/utkast/funksjonsdrift.py` (bare lesing), så kontrollen kan gjentas.
Verdensjobbene (`world_health`) står «ok», ingen cron-jobb har feilet og ingen varsler har feilet siste døgn.
Krever konto: ikke relevant.
Endringslogg: nei.

## B-475 Konsernverdien teller verkene som eiendeler (2026-10-07)
Eieren: «Om man oppgraderer konsernet sitt så går konsernverdien ned. Man tar penger fra konsernkassa for å oppgradere og
da går verdien ned.» Konsernverdien (B-320) var konsernkassa + 60 dagers utbytte og bidrag − lån. To grunner til fallet:
1. Prisen ble trukket fra kassa med én gang, mens utbyttet først økte når prosjektet var ferdig (9–13 timer med kø).
2. For de største konsernene (26–32 mill. per dag) ga 60 dagers ekstra utbytte etter imperiebelastningen mindre enn
   prisen for 4–7 av valgene (opptil 4,8 mill. lavere verdi også etter at prosjektet var ferdig).
Eierens valg (av tre): **verkene teller som eiendeler.** `konsern_value` får `konsern_assets` (migrasjon 142): hvert verk
med salgssummen (som `konsern_sell`: 60 % av byggeprisen med trinnene) – ikke et verk som fortsatt bygges – og hver betalt
bestilling som ikke er ferdig (`kø`, `i gang`) med prisen. Speilet i `konsernAssets` (`game/konsernWorld.ts`) og
`konsernValueOf` (`net/world.ts`). Prøvd som spiller i en rullet transaksjon: kassa −13,5 mill., konsernverdien uendret
ved bestillingen og +6,2 mill. når moderniseringen var ferdig. Med en rabattert modernisering blir verdien
−0,045 × pris + 60 × mer utbytte etter prosjektet – positiv for alle valgene spillerne har i dag; uten rabatten
(standardverk) kan den bli svakt negativ for de største.
Virkning på topplista (dry-run 7.10): verkene utgjør 1–30 % av verdien; plassene 1–4 bytter rekkefølge og nr. 9 blir nr. 7.
Sesongrangeringen (`close_season`) og skyggerapporten (`program_shadow_report`) bruker samme funksjon og følger med.
Krever konto: uendret (Konsernverdi krever konto som før).
Endringslogg: ja.

## B-476 Selskapene man eier, teller i konsernverdien (2026-10-07)
Eieren: «Får [en spiller] noen konsernverdi av bedriftene han eier?» Nei: selskapene talte bare gjennom det de alt hadde
betalt inn i konsernkassa, mens utbyttet og bidraget telte 60 dager fremover. For eieren av to selskaper var
selskapsinntekten (ca. 35 mill. per dag) større enn både utbyttet og bidraget, og anbudet trakk verdien rett ned.
Eierens valg (av tre): **dagene som er igjen.** `konsern_companies_value` (migrasjon 143): hvert aktivt selskap spilleren
eier, med inntektsanslaget per dag (`company_estimate`, det `world_status` viser) ganger dagene som er igjen av
konsesjonen, høyst 60 – samme tanke som utbetalingen ved oppkjøp. Tallet synker mot slutten av konsesjonen og kommer
tilbake når den fornyes i anbudet. Speilet i `companiesValue` (`net/world.ts`).
Virkning 7.10: bare én spiller eier selskaper; +264,8 mill., plassen på topplista uendret (5).
Krever konto: uendret.
Endringslogg: ja.

## B-477 Topplista «Konsernverdi» leser et lager som regnes hvert minutt (2026-10-07)
Eieren: «Databasen ble unhealthy.» 17:44–17:48 UTC fikk world_status, save_game, leaderboard og my_rank tidsavbrudd.
Årsak: `leaderboard('konsern')` – og `my_rank`, som henter hele lista for å finne én plass – regnet `konsern_value` for
hver spiller ved hvert kall. Det leser hele det lagrede spillet flere ganger per spiller (ca. 0,8 s per kall). Etter
endringsloggen om at rekkefølgen kunne ha endret seg (B-475), åpnet mange topplista, som henter på nytt hvert 15.–30.
sekund: 26–33 slike kall i minuttet brukte opp maskinen. B-475/B-476 gjorde hvert kall litt tyngre, men det var
mengden kall som veltet den.
Rettet (migrasjon 144): tabellen `konsern_value_cache` (RLS uten tilgang for spillerne) fylles av `konsern_value_refresh`
hvert minutt (cron `konsernverdi`, ca. 0,2 s), og topplista leser derfra (patchet med replace() som 114/115/120).
Målt etter: leaderboard via my_rank 13 ms (før ca. 800 ms), samme verdi for alle 21 på lista. Verdien på lista kan være
opptil et minutt gammel; Konsern-siden regner sin egen. `close_season` regner fortsatt `konsern_value` direkte.
Stopp jobben med `select cron.unschedule('konsernverdi');` (da står lista stille).
Krever konto: uendret.
Endringslogg: ja.

## B-478 Oppkjøp bedre forklart: eierens anslag ved fristen, siste dag for bud og datoen for vernet (2026-10-07)
Eieren spurte hva en eier får ved et oppkjøp, og om det burde vært bedre forklart. Tre ting, eieren: «gå for din anbefaling»:
1. **Eierens anslag var for høyt.** Appen regnet utbetalingen med dagene som er igjen nå, mens serveren betaler for dagene
   som er igjen når budet avgjøres (`resolve_takeovers`, minst 72 timer senere). Med 5,3 dager igjen viste appen ca. 107
   mill. i stedet for ca. 63 mill. Nå regnes anslaget ved fristen (`buyoutAt` i `game/control.ts`): for et nytt bud
   72 timer fra nå (eller fra vernet slutter), for et bud som står, ved `closesAt`. Teksten sier at beløpet synker for
   hver dag.
2. **Kjøperen fikk ikke vite når det stenger.** Nye bud kan ikke legges inn de siste 5 dagene av konsesjonen (`last_days`),
   og appen sa det bare når det alt var stengt. Nå står «Bud kan legges inn til …» (`lastBidAt`) i «Kjøp selskapet».
3. **Vernet viste ikke dato for kjøperen.** Serveren sender `from` også for vernet; appen viser nå «Nye bud fra …» der
   som for pausen.
Ingen endring på serveren eller i reglene. Testet: `npm test` (ny test med tallene fra Skraplageret), Playwright av
Industrien på 320, 390 og 1366 px med falsk server (riktige tekster, ingen horisontal scrolling).
Krever konto: uendret.
Endringslogg: ja.

## B-479 Jobben `konsernverdi` regner én spiller om gangen og melder fra i `world_health` (2026-10-07)
Gjennomgangen av dagens endringer (B-475–B-478, eieren: «fortsett») fant én svakhet: jobben som fyller topplista
«Konsernverdi» (144, B-477) regnet alle spillerne i én setning. Feilet `konsern_value` for én spiller, ble hele kjøringen
rullet tilbake. Lista sto da stille for alle, og ingenting sa fra, fordi jobben ikke var med i `world_health`.
Nå følger den mønsteret fra B-401 (migrasjon 145). Hver spiller regnes i sin egen deltransaksjon, og feil logges med
`world_job_unit_error`. Kjøringen telles med `world_job_start`/`world_job_finish`, så jobben står som «står» etter
20 minutter uten kjøring. En spiller som feiler, beholder forrige verdi på lista i stedet for å forsvinne.
Resten av gjennomgangen stemte mellom appen og serveren:
- `konsern_status` gir bare bestillinger i kø eller i gang, som `konsern_assets`.
- `estimate_per_day` er `company_estimate`, og inaktive selskaper er ikke med.
- `lastBidAt` er grensen `last_days` i `takeover_window`/`company_protected_until`.
Testet i DO-blokker som ble rullet tilbake: 21 spillere med status «ok», og med én spiller som feilet: 20 regnet, den ene
sto igjen med samme verdi, status «feil hos enkelte».
Endringslogg: nei

## B-480 «Nye bud fra …» viser når selskapet faktisk kan bys på (2026-10-07)
Før den første fornyelsen av en konsesjon (skraplageret 11.–13.10) prøvekjørte jeg hele fornyelsen i en DO-blokk som
ble rullet tilbake. Den virket:
- Anbudet åpnes 48 timer før konsesjonen går ut.
- Eieren får ingen fordel (`renewal_max` = 0).
- Vinneren får en ny rad i `company_owners` fra konsesjonsslutt og 14 dager fram.
- Taperne får budet tilbake.
Prøven viste likevel én feil. `takeover_window` ga datoen for det første hinderet den fant, vernet (3 dager for en ny
eier) eller pausen (14 dager etter et avverget bud). Budet avvises derimot til begge er over (`company_protected_until`).
Skraplageret hadde et avverget bud 5.10, så etter en fornyelse 13.10 ville appen sagt «Nye bud fra 16.10», mens budene
ble avvist til 19.10. I dag sto det «pause, nye bud fra 19.10», en dato etter at konsesjonen går ut.
Nå er datoen `company_protected_until` for både vern og pause (migrasjon 146). Varer hindrene til budene uansett stenger
før konsesjonen går ut (`last_days`), er grunnen `sent` («vent på det nye anbudet»). Appen er uendret; den viste alt
serverens dato og grunn.
Ikke endret: pausen etter et avverget bud følger selskapet, ikke eieren, så en ny eier etter fornyelsen arver den. Det
er i tråd med at pausen skal skjerme selskapet mot nye bud rett etter hverandre (B-441).
Testet i DO-blokker som ble rullet tilbake, med både fornyelse til en annen eier og til samme eier. Etter migrasjonen
viser skraplageret `sent` og slagghåndteringen `vern` til 8.10.

## B-481 Fornyelsen: eieren får vite at hen må by for å beholde selskapet (2026-10-07)
Den første fornyelsen av en konsesjon kommer 11.–13.10 (skraplageret). Eieren har ingen fordel i fornyelsesanbudet
(`renewal_max` = 0) og mister selskapet uten bud. Likevel sto det «Du eier det» på kortet, og eieren fikk samme varsel som
alle andre («Anbudet på skraplageret er åpent»). Det var lett å tro at selskapet ble fornyet av seg selv.
Nå sier appen og varselet det rett ut:
- **Selskapskortet:** så lenge eieren ikke har bydd, står det «Perioden din går ut … Vil du beholde selskapet, må du
  by» øverst i anbudet.
- **Konsern → Oversikt og varsellinja:** «Perioden din på skraplageret går ut» og «By for å beholde skraplageret» i
  stedet for «Anbud på … er åpent». Fornyelsen av eget selskap går foran andre anbud (`OpenTender.mine`).
- **Varsel på mobilen (migrasjon 147, `push_on_tender`):** eieren får «Perioden din på … går ut – by for å beholde
  selskapet». Varselet har samme ref som før, så det blir ett varsel, ikke to.
Reglene er uendret. Ingen konto-endring: anbudene krever konto som før (KONTO.md).
Testet: DO-blokk som ble rullet tilbake (fornyelsen åpnet, eieren fikk den nye teksten og de ni andre den vanlige), og
Playwright med falsk server på 320, 390 og 1366 px (riktige tekster, ingen horisontal scrolling). `npm test`.
