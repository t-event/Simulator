# Arbeidslogg

Nyeste økt øverst. Hver økt: hva brukeren ba om, hva som ble gjort, hva som
ble testet, og hva som gjenstår.

---

## Økt 14 – 2026-09-24: to potter per lysbueovn og murere

**Brukeren ba om:** To potter per lysbueovn, og murere som bygger opp den ene mens den andre er i bruk
(ca. fire døgn).

**Gjort (B-030):** Reservepott per lysbueovn, pottebytte på noen timer når den er klar, ny rolle Murer
(fire døgn med to murere per pott), visning i vedlikeholdskortet, varsel på Verket og nytt avsnitt i
fagboka.

**Testet:** Node-test med 0, 2 og 4 murere (se B-030). Playwright på iPhone 13: vedlikeholdskortet viser
reservepott, fremdrift og «Bytt pott nå». Balanse 12 / 36 / 74 / 144. Ingen konsollfeil.

**Gjenstår:** Brukeren vurderer forslaget om fravær (sykdom/ferie) der allroundere dekker opp.

---

## Økt 13 – 2026-09-24: bemanningstabellen var forvirrende

**Brukeren meldte (skjermbilde fra støperiet):** «Antall per skift stemmer vel ikke.» Tabellen viste
2 ovnsoperatører per skift, 1 ansatt og likevel 3 av 3 skift.

**Årsak:** Tallene var riktige, men tabellen viste ikke at allroundere fylte hullene (5 av 7 var
ovnsoperatører), og ansatte som ikke går skift (selger, planlegger, skrapklasser) var ikke med.

**Gjort:** Ny tabell: hvor mange som trengs for 3 skift (eller neste skift), hvor mange egne og hvor
mange allroundere som fyller plassene, og hva som mangler. Under står hvor mange allroundere som er i bruk,
ansatte som ikke går skift, og roller med flere enn skiftene trenger. Fordelingen regnes med samme
metode som bemanningen (`crewCoverage` i `plant.ts`).

**Testet:** Playwright på iPhone 13 med støperi på 3 og 2 skift; summene stemmer med antall ansatte.

---

## Økt 12 – 2026-09-24: «fryser» → «størkner»

**Brukeren meldte (skjermbilde av quizen):** Stål fryser ikke, det størkner.

**Gjort:** Rettet ordet i fagboka (støping), to quizalternativer og en melding i kontrollrommet.
Ingen andre forekomster.

**Lærdom:** Bruk fagordet «størkne» om stål som går fra flytende til fast.

---

## Økt 11 – 2026-09-24: skrapklasser og strengere quiz

**Brukeren ba om:** En skrapklasser som gir riktig skrapmiks til resepten. Feil svar på quiz skal gi
færre eller ingen poeng, uten ny sjanse.

**Gjort (B-029):** Ny rolle Skrapklasser. Uten en blir blandingen omtrentlig og erstattes med hva som
helst ved mangel. Med en følger chargen resepten, og dårlige lass sendes i retur. Quizen har ett forsøk
med fagpoeng etter antall riktige.

**Testet:** Playwright på iPhone 13: quiz med ett feil svar gir «1 av 2 riktige, +1 fagpoeng» og kan
ikke tas igjen; skrapklasser kan ansettes under Folk. Balanse 12 / 36 / 74 / 146. Ingen konsollfeil.

---

## Økt 10 – 2026-09-24: foringen varer for kort

**Brukeren meldte:** Foringen slites på ett døgn; ovnen bør holde minst sju døgn når alt går etter
planen. Valgene i menyen for planlagt omforing må fikses.

**Gjort (B-028):** Slitasjen per charge er satt ned så foringen holder ca. ni døgn døgnet rundt.
Omforing koster og tar mer til gjengjeld. Menyvalgene lages ut fra levetiden og viser hvor slitt
foringen er på den dagen. Planen bytter også ved 88 % slitasje.

**Testet:** Balanse 10 / 32 / 74 / 154, ingen konkurs. Playwright på iPhone 13: menyen viser «Hvert
5.–8. døgn» med slitasje, og teksten om levetid. Ingen konsollfeil.

**Gjenstår:** Følg med på lønnsomheten i storverket mot vinnergrensen.

---

## Økt 9 – 2026-09-24: vinnergrense, planleggerens grense og veiledet start

**Brukeren ba om:** Høyere vinnergrense. En grense for planleggeren, og et valg om den får handle på
kreditt. Veiledet start med mulighet for å hoppe over.

**Gjort (B-027):** Vinnergrensen er 1 mrd. kr. Planleggeren handler bare på kreditt hvis spilleren
tillater det, og kan få et tak per døgn. Veiledet start i sju steg med «Hopp over», og startskjermen har
valg med eller uten veiledning. Testspilleren er rettet for produktbytte ved ny støping og lavkarbon uten
øseovn (den gikk i bøter i stålverket), og reseptsjekken advarer om lavkarbon uten øseovn.

**Testet:** Playwright på iPhone 13: veiledningen gjennom stegene (kontrakt, skrap, første charge) og
«Hopp over», planleggervalgene i Marked. Planleggerens tak og kreditt testet i Node (taket 50 000 kr
holdt; uten kreditt holdt kassa seg rundt null). Balanse 10 / 32 / 83 / 161. Ingen konsollfeil.

**Gjenstår:** Følg med på om storverket blir for lønnsomt (testspilleren tjener ca. 10 mill. kr per
døgn der). Vurder flere spørsmål i quizene.

---

## Økt 8 – 2026-09-24: tilbakemeldingsrunde 2, tema A–G

**Brukeren ba om:** En lang liste forbedringer (se arbeidslisten i `docs/DESIGN.md`), med valg for
fagbok, strøm og planlegging (B-019).

**Gjort (tema A, B-020):** Tregere klokke, forespørsler med svarfrist og maks tre åpne, hardere
bot, nye hendelseskort uten gjentakelse, mottilbud på lønnskrav, bedre norsk i økonomikortet og
riktigere navn. Konsollfeil: ingen funnet.

**Testet:** Balansetest grønn (12 / 37 / 103 / 179), nettlesertest av forespørsler og lønnskort.

**Tema B (B-021):** Ordrekø med pilknapper, «Produseres nå», produksjonskort som følger køen,
resept per kvalitet, planlegger som sorterer køen og kjøper inn. Testet i nettleser og balansetest
(11 / 38 / 94 / 173).

**Tema C (B-022):** Foringen byttes ikke av seg selv lenger: knapp i nytt Vedlikehold-kort,
planlagt omforing via forskning, eller reparatør. Planlagt stans og havari skilles tydelig i
meldinger og straff. Testet på iPhone 13 (knappen bytter tekst, ingen horisontal scroll, ingen
konsollfeil) og balansetest (11 / 43 / 98 / 182).

**Tema D (B-023):** Gradvis opplåsing av faner, fart og skraptyper; utstyr kjøpes fra stedet i
anlegget på Verket; Bygg-fanen erstattet av Forskning; reseptsjekk med forklaring og «Foreslå billigste
resept»; nytt Kvalitet-kort. Testet på iPhone 13 (garasje og nivå 3): riktige faner, låst fart gir
forklaring, forslag setter resepten, utstyrsark åpner, ingen horisontal scroll, ingen konsollfeil.
Balanse 11 / 49 / 100 / 187.

**Tema E (B-024):** Strømavtale (spot, fastpris, nattariff med binding), effekttariff på døgnets
høyeste effekt, skiftplan med nattillegg under Folk, og hendelseskort om betalt utkobling. Testet på
iPhone 13 med et støperi på to skift: nattskift gir 15 % nattillegg og lavere strømpris, nattariff
binder avtalen i 30 døgn, ingen horisontal scroll, ingen konsollfeil. Balanse 12 / 44 / 104 / 185.

**Tema F (B-025):** Forskning krever at kapitlet er lest, quiz per kapittel med fagpoeng, oppdrag
fra fagboka med belønning, og rådgiver med spesialist ved gjentatte omdømmetap. Testet på iPhone 13:
quiz riktig gir +2 FP og åpner Forskning-fanen, feil svar viser forklaring og sperre til neste døgn,
«Les kapitlet» åpner riktig kapittel og låser opp forskningen. Rådgiveren testet i Node (spesialistene
virker). Ingen konsollfeil. Balanse 10 / 40 / 104 / 180.

**Tema G (B-026):** Trivsel med bonus og kurs per ansatt, tregere fagpoeng, testspiller med
prioritert forskning, sikkerhetskopi (last ned/hent) og mindre tegning på pause. Testet på iPhone 13:
bonus løfter trivselen 70 → 85 og låses i en uke, kurs låses etter bruk, sikkerhetskopi lastet ned og
hentet inn igjen fra startskjermen. Ingen konsollfeil. Balanse 10 / 32 / 101 / 185.

**Gjenstår:** Veiledet start de første minuttene (Claudes eget forslag). Følg med på om penger og
omdømme fortsatt føles skjevt i verkstedet, og om storverket blir for lønnsomt (flere testspillere
passerer 100 mill. kr før dag 240).

---

## Økt 7 – 2026-09-24: vanskeligere spill

**Brukeren ba om:** For mye penger i forhold til omdømme, for raske fagpoeng, spillet må være
litt vanskeligere (skjermbilde fra garasjen, dag 9).

**Gjort:** Faste kostnader per nivå, lavere pris på støpegods, dyrere nivåer, færre fagpoeng,
dyrere forskning, billigere messe (B-018). Nytt analyseflagg `--sperrer` i `balance.ts` viser når
penger og omdømme hver for seg holder til neste nivå, og hvor mye fagpoeng som ligger ubrukt.
Faste kostnader vises i «Neste nivå», i flyttefeiringen og i økonomikortet.

**Testet:** Balansetest grønn (13 / 36 / 89 / 169), 14 frø uten konkurs, typesjekk og lint rene.
Første forsøk var for hardt (konkurs i verkstedet) og ble justert.

**Gjenstår:** Følg med på om garasjen fortsatt føles for rik – der sperrer omdømmet fortsatt
litt før pengene (penger dag 6–9, omdømme dag 7–13).

---

## Økt 6 – 2026-09-24: kontrakter tar lengre tid

**Brukeren ba om:** «Det bør ta lengre tid å gjøre kontrakter. Det går altfor fort nå.»

**Gjort:** Kontrakter settes nå til 1,5–4 døgns produksjon (B-016). Kundenes største ordre er
hevet. Nytt analyseflagg `npx tsx src/game/balance.ts --kontrakter <frø>` viser snittid per kontrakt
per nivå.

**Testet:** Før → etter (min på 1×): garasje 0,6 → 5,3, verksted 0,9 → 2,5, støperi 1,1 → 5,0,
stålverk 3,7 → 5,4. Balansetesten grønn (Verksted dag 13, Støperi 27, Stålverk 77, Storverk 152),
ingen konkurs.

**Gjenstår:** Hvis hele spillet fortsatt føles for raskt, er neste grep å senke spillklokka
(`GAME_MIN_PER_REAL_S` i `data.ts`, i dag 1 døgn per minutt).

---

## Økt 5 – 2026-09-24: omdømmet ble vist avrundet opp

**Brukeren meldte (skjermbilde fra mobil):** «Omdømme 5 av 5» med rødt kryss, og knappen
«Flytt inn i verksted» var grå selv om pengene holdt.

**Årsak:** Omdømmet ble vist med `toFixed(0)`, så 4,6 så ut som 5, mens kravet sjekker den
eksakte verdien.

**Gjort:** Ny `fmtRep()` i `ui/format.ts` viser én desimal og runder alltid ned. Brukt i toppfeltet,
i «Neste nivå»-kortet og i målkortet på Verket. Kravlinja forklarer nå hva som mangler («lever
flere kontrakter i tide»). Kassa vises også rundet ned der den sammenlignes med en pris.

**Testet:** Playwright på iPhone 13 med omdømme 4,6: viser «4,6 av 5», knappen er grå, som den skal.
Typesjekk og lint rene.

**Lærdom:** Tall som sjekkes mot et krav må aldri vises avrundet opp.

---

## Økt 4 – 2026-09-24: Game Dev Tycoon-inspirasjon, mobilspill, minne, enkel styring

**Brukeren ba om:** Studere Game Dev Tycoon og hente inspirasjon. Det skal være
et mobilspill. Et system for å huske beslutninger og logge arbeid, og en
CLAUDE.md som minne mellom samtaler. Kontrollromstyringen må være så enkel at
en uten kunnskap klarer å kjøre manuelt.

**Gjort:**
- Studerte Game Dev Tycoon (søk; wiki-sidene var blokkert av nettverket) og skrev
  `docs/DESIGN.md` med hva vi tar over og hvorfor.
- Minnesystem: `CLAUDE.md`, `docs/LOGG.md`, `docs/BESLUTNINGER.md` (B-001–B-015), `docs/DESIGN.md`.
- **Enkel styring av kontrollrommet** (`src/ui/control/`): fire steg – smelt (mer/mindre strøm
  mens skrapmatingen varierer), rens (hold for oksygen), slagg av (ett trykk), tapp (i grønt
  vindu). Automatikk for resten, stjerner og forklaring etterpå, ca. 2 minutter. Full HMI som
  ekspertmodus. Dynamikken ble målt i prosessmodellen før designet ble valgt (se B-010).
- **Forskning og fagpoeng** (`src/game/research.ts`): 21 forskningsområder som låser opp utstyr,
  forbedringer og fagbokkapitler. Fagpoeng fra charger, kontrakter, egne charger og feil.
- **Hendelseskort** (`src/game/decisions.ts`): billig skrapparti, hasteordre, lønnskrav,
  avisintervju, bransjemesse, lærling, tilsyn. Spillet pauses til du velger.
- Flyttefeiring ved nytt nivå, bobler over anlegget (tonn, kroner, fagpoeng), én tydelig
  hovedhandling under anleggsbildet.
- **PWA:** manifest, ikoner (øse som heller stål), service worker (offline), stående format,
  vibrasjon på Android, ingen overscroll.
- Migrering av gamle lagringer (`migrate()` i `save.ts`).

**Testet:**
- `balance.ts`: alle nivåmål OK (Verksted dag 7, Støperi 25, Stålverk 65, Storverk 125),
  ingen konkurs; enkel styring: nybegynner 5★ på ~105 s, slurvete 1★.
- Playwright på iPhone 13: hele kontrollrommet kjørt i nettleseren («Perfekt charge!» på 99 s),
  hendelseskort, flyttefeiring, forskning, gammel lagring migrert, service worker aktiv og
  offline omstart virker.
- `validate.ts`, typesjekk, lint og bygg rene.

**Gjenstår / ideer:** se veikartet i `docs/DESIGN.md` (kundevurdering 1–10, markedstrender,
opplæring av ansatte, prestasjoner, lyd).

**Avslutning:** PR #3 til `main` opprettet etter brukerens ønske (PR #2 var allerede merget, så
de nye commitene ble flyttet over på nyeste `main` først). Lokale kopier av kildematerialet fra
tidligere økter er slettet etter brukerens ønske – det finnes ingen kopier igjen i miljøet, og alt
spillet trenger ligger som generiske tall i koden.

---

## Økt 3 – tidligere: fra simulator til tycoonspill

**Brukeren ba om:** Droppe simulatoren og lage et tycoonspill som erstatter
opplæringsverktøyet, med hele stålverket, fra en person i en garasje til et
stort verk med mange arbeidere. Økonomi, progresjon og hendelser fra tidligere forslag.

**Gjort:**
- Spillmotor i `frontend/src/game/`: skrap (7 typer), resepter, ovner (digel →
  induksjon → lysbue), støping (sand → blokk → streng), valseverk, lager,
  kontrakter med kvalitet og frist, spotsalg, strømpris over døgnet, ansatte og
  skift, omforing, hendelser, lån og kassekreditt.
- Fagbok med 16 kapitler.
- «Ta styringen» med full HMI og prosessmodellen.
- Automatisk testspiller i CI. Rettet dødsspiraler ved produktbytte, spotsalg
  som solgte emner valseverket trengte, og for skarp startresept.
- Relay, instruktørpanel og scenarioer fjernet.

**Testet:** Playwright på iPhone 13 og desktop, testspiller på 14 frø.

**Gjenstår:** PR til `main` for publisering (brukeren har ikke bedt om det ennå).

---

## Økt 2 – tidligere: kalibrering, GitHub Pages, de-identifisering, mobil

- Prosessmodellen kalibrert mot en conveyormatet lysbueovn; portet fra Python til TypeScript.
- Publisering på GitHub Pages; Python-backend fjernet; relay for flere maskiner.
- Alt identifiserende fjernet og git-historikken skrevet om (se B-002).
- Mobiltilpasning og gjennomgang av all kode.

## Økt 1 – tidligere: stålovnsimulator

- Første versjon av en simulator for lysbueovn med kontrollrom og instruktørpanel.
