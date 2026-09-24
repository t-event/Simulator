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

## B-027 Vinnergrense 1 mrd., planlegger med grense og kreditt-valg, veiledet start (2026-09-24)
Status: gjelder (erstatter vinnergrensen på 100 mill. kr)
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
