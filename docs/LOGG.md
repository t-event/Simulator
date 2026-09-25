# Arbeidslogg

Nyeste økt øverst. Hver økt: hva brukeren ba om, hva som ble gjort, hva som
ble testet, og hva som gjenstår.

---

## Økt 69 – 2026-09-25: konto og lagring på nett (fase 0 og 1)

**Brukeren ba om:** Konto med e-post og passord, nåværende lagring koblet til kontoen, Supabase. Svar på de åpne
spørsmålene: ingen grupper på topplista ennå, sesonger erstatter nytt spill+ med en pitteliten fordel, lett å starte
ny sesong, forslag til storkunder.

**Gjort:** B-125, svarene notert i `docs/PLAN-NETT.md`.
- `src/net/`: klient mot Supabase over fetch, økt, lagring på nett, kobling ved innlogging, funksjonsbryter.
- `ui/Account.tsx`: kontokortet på startskjermen og i innstillingene, sky i toppen.
- `supabase/001_grunnlag.sql`.
- CI kjører også nettestene.

**Testet:**
- tsc, lint, `npm test` (12 nye tester av nettlaget mot en falsk tjeneste), validate, balanse exit 0, build.
- Playwright på iPhone 13 og desktop med falsk Supabase (`page.route`):
  - opprett konto → beskjed om bekreftelse; logg inn ubekreftet → beskjed; logg inn → ingen spill ennå
  - nytt spill lastes opp med eier, sky i toppen, innstillingene viser «Lagret på nett kl.»
  - logg ut; tom nettleser + logg inn → spillet hentes og «Fortsett» vises
  - lokalt spill uten konto + spill på nett → valg, «Herfra» laster opp
  - sikkerhetskopi fra en annen konto avvises
  - lenke for nytt passord viser skjemaet og rydder adressen
  - ingen feil, ingen horisontal scrolling, alle knapper minst 40 px
- Ekte innlogging kan ikke testes fra sandkassen (den når ikke supabase.co). Brukeren tester.

**Gjenstår:**
- Brukeren limer inn `supabase/001_grunnlag.sql` og setter Site URL i Supabase.
- Brukeren tester opprett konto, bekreftelse, innlogging på to enheter og glemt passord.
- Fase 2: toppliste.

---

## Økt 68 – 2026-09-25: plan for konto, lagring på nett, toppliste og konkurranse

**Brukeren ba om:** Svar på om toppliste og lagring uten fil er mulig med GitHub Pages, uten at noen mister spillet,
og en skikkelig plan for et spill man ikke blir ferdig med – med konto (e-post og passord), Supabase, nivå 1 og 2,
og litt ventetid som varierer.

**Gjort:** B-124 og `docs/PLAN-NETT.md` med svar på spørsmålene, grunnlaget i Supabase, tabeller, reglene for å
utvikle uten at noen mister spillet, seks faser, ventetidene og juksesperren.

**Testet:** Ingen kode endret.

**Gjenstår:**
- Brukeren oppretter Supabase-prosjekt og sender URL og offentlig nøkkel.
- Brukeren svarer på de åpne spørsmålene i planen (grupper på topplista, sesongfordel, storkunder).
- Deretter fase 0 og 1.

---

## Økt 67 – 2026-09-25: kortere Konsern-side

**Brukeren ba om:** Konsern-siden er for lang og bør bli mer intuitiv.

**Gjort:** B-123. Forklaringen er foldet sammen, hvert verk har én hovedknapp, kjøp og felles funksjoner er samlet i
ett kort, salgsdirektøren er kortere, og alle knapper er minst 40 px høye.

**Testet:**
- tsc, lint, `npm test`, validate, balanse exit 0, build.
- Playwright på iPhone 13:
  - uten verk og med tre verk og salgsdirektør
  - siden er 2 393 px høy, mot 3 475 px før
  - ingen knapper under 40 px
  - utbygging, salg og innstillingene for salgsdirektøren virker
  - ingen feil og ingen horisontal scrolling
- Desktop 1280 px: ingen feil.

**Gjenstår:** Ingenting.

---

## Økt 66 – 2026-09-25: skru salgsdirektøren av og på

**Brukeren ba om:** En bryter under Forespørsler for å skru salgsdirektøren av og på. Brukeren spurte også hva
«Elveverket» er, men fant selv ut at det er navnet på et datterverk.

**Gjort:** B-122. Bryteren står under Salg → Forespørsler og på Konsern.

**Testet:**
- tsc, lint, `npm test` (direktøren signerer ingenting når den er av), balanse exit 0.
- Playwright på iPhone 13 med en gammel lagring uten det nye feltet:
  - bryteren er på fra start
  - klikk skrur den av
  - valget er lagret etter at siden er lastet på nytt
  - ingen feil og ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 65 – 2026-09-25: det skal lønne seg å investere i konsernet

**Brukeren ba om:**
- Å kunne gå fra stålverk til storverk i konsernet.
- At det ikke skal lønne seg å bare spare til 10 mrd.

**Gjort:** B-121.
- Et verk er verdt 60 døgns overskudd, så et kjøp senker ikke konsernverdien.
- Høyere overskudd: stålverk 5 mill. kr og storverk 20 mill. kr per døgn.
- Man kan selge datterverk.
- «Bygg ut til storverk» er hovedknappen på hvert stålverk.
- Nytt flagg i testspilleren: `--sparer`.

**Testet:**
- tsc, lint, `npm test`.
- Balanse exit 0.
- `--vansker` med og uten `--sparer`: å investere vinner omtrent 150 døgn før (flink) og 300 døgn før (nybegynner).
- Playwright på iPhone 13:
  - to stålverk, ett bygget ut til storverk og ett solgt
  - kassa og konsernverdien stemmer
  - ingen feil og ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 64 – 2026-09-25: konsernforskning

**Brukeren ba om:** Flere ting å forske på når konsernet åpnes.

**Gjort:** B-120. Ni konsernprosjekter, et nytt kapittel i fagboka med quiz, egen gruppe under Forskning og en
statuslinje på Konsern-fanen.

**Testet:**
- tsc, lint, `npm test` (ny test for konsernforskningen), og skriptet som sjekker at alle id-er finnes.
- Balanse exit 0, `--vansker`.
- Playwright på iPhone 13, låst og åpnet konsern:
  - gruppen «Kommer når konsernet åpnes» vises når konsernet er låst
  - kapitlet åpnes fra Forskning, og det går an å forske
  - statuslinja på Konsern-fanen stemmer
  - ingen feil og ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 63 – 2026-09-25: fullt lager og et tydeligere konsern

**Brukeren ba om:**
- Varsel når lageret er fullt og ovnene står.
- Konsernet var rart: med bare stålverk fikk man ikke kjøpt storverk eller felles innkjøp og salgskontor. Det
  skulle bli mer intuitivt, morsomt og bedre forklart.

**Gjort:**
- B-118: varsel om fullt lager.
- B-119 for konsernet:
  - forklaring i steg og «Neste steg»
  - grunner og nedtelling på grå knapper
  - utbygging fra stålverk til storverk
  - navn på verkene, milepæler og produksjonsrekorder
- Testspilleren følger «Neste steg».

**Testet:**
- tsc, lint, `npm test` (nye tester for konsernet og varselet om fullt lager), bygg.
- Balanse og `--vansker`.
- Playwright på iPhone 13 med bare stålverk og lite penger:
  - «Neste steg» foreslår det det er råd til
  - alle 8 grå knapper forklarer hvorfor de er grå
  - «Bygg ut til storverk» vises
  - ingen feil og ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 62 – 2026-09-25: salgsdirektør i konsernet

**Brukeren ba om:** Når konsernet er åpnet, skal man kunne ansette noen som tar kontraktene og avtalene automatisk.
Det skal være meget dyrt.

**Gjort:** B-117. Salgsdirektør under Verket → Konsern. `assessOffer` er felles for Salg og direktøren.

**Testet:**
- tsc, lint, `npm test` (ny test for direktøren), bygg, balanse.
- Skript: 30 døgn med og uten direktør på tre lagrede storverk.
- Playwright på iPhone 13:
  - en gammel lagring uten direktørfeltet åpner uten feil
  - ansettelse fra Konsern-fanen virker, og merknaden vises på Salg
  - ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 61 – 2026-09-25: egen plass for varslene

**Brukeren ba om:** Varslene bør ha en egen plass. De kommer i veien for å signere kontrakter og kjøpe ting, så man
må pause og krysse dem ut først.

**Gjort:** B-116. Varsellinja er en fast linje i toppfeltet med bjella. De flytende varslene er fjernet.

**Testet:**
- tsc, lint, `npm test`, bygg.
- Playwright på iPhone 13 og på desktop:
  - linja er alltid 40 px høy
  - ingen varsler ligger oppå siden
  - 13 kontrakter ble signert på 10× uten å pause
  - trykk åpner varsellista
  - nytt spill starter uten feil
  - ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 60 – 2026-09-25: tekst om overslag

**Brukeren ba om:** «Støv i hvelvet må suges bort» så ut som en skrivefeil.

**Gjort:** Teksten er skrevet om med vanlige ord: «Overslag i ovn 1: en gnist slo over i støvet på ovnstaket
(hvelvet). Taket må støvsuges.» Fagordet står i parentes, som regelen om nybegynnere sier.

**Testet:** tsc, `npm test`, balanse exit 0. Varselet havner fortsatt under «Drift og havarier».

---

## Økt 59 – 2026-09-25: varselinnstillinger

**Brukeren ba om:** Mer spesifikke varselinnstillinger med flere valg.

**Gjort:** B-115. Sju temaer som kan slås av og på, og valg av hvor lenge et varsel står.

**Testet:**
- tsc, lint, `npm test` (ny test for temaene), bygg.
- Skript: alle varseltekster fra 40 døgn i fem lagrede spill får et tema.
- Playwright på iPhone 13:
  - en gammel lagring uten de nye feltene åpner uten feil
  - med «Ferie og sykdom» slått av kom ingen ferie- eller sykdomsvarsler på 10×
  - ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 58 – 2026-09-25: varslene er i veien

**Brukeren ba om:** Varslene som kommer opp, er litt i veien. Brukeren valgte «én smal linje» blant fire forslag.

**Gjort:** B-114. Ett varsel på én linje med «+N», trykk åpner varsellista, ✕ eller sveip fjerner.

**Testet:**
- tsc, lint, `npm test`, bygg.
- Playwright på iPhone 13 på 10×:
  - varselet er 42 px høyt og viser «+1» når et til venter
  - trykk åpner varsellista og tømmer køen
  - ingen feil og ingen horisontal scrolling

**Gjenstår:** Ingenting.

---

## Økt 57 – 2026-09-25: gjennomgang av hele spillkoden (runde 2)

**Brukeren ba om:** Sjekk over hele spillkoden, se etter feil og bugs, og fiks dem.

**Gjort:** B-113. Åtte feil rettet, se beslutningen. Ny test for støpingen ved fullt lager.

**Testet:**
- tsc, lint, `npm test` (15 tester), `validate.ts`, bygg.
- Balanse: exit 0.
- Skript: alle id-er i tabellene finnes; invariantsjekker på lagrede spill i 60 døgn uten funn (de eneste avvikene
  lå i håndlagde testfiler).

**Gjenstår:** Ingenting fra brukerens liste.

---

## Økt 56 – 2026-09-25: bjella, kontrollrommet, elektrodebrudd, lageret, støtteroller og utstyrsmenyer

**Brukeren ba om:**
- Ikke tall på bjella for gode nyheter.
- At man ikke må slå på oksygenet for tidlig i smeltingen.
- At rensingen starter med strømmen av.
- Færre elektrodebrudd med alt oppgradert.
- At ferdigvarelageret ikke går over maks.
- At anbefalte planleggere og skrapklassere tar høyde for fravær, og at avløsere anbefales.
- Å se pengene i utstyrsmenyen.
- At støpingen åpner menyen slik ovnen gjør.
- Kortere og mer intuitive utstyrsmenyer.

**Gjort:** B-107 til B-112.

**Testet:**
- tsc, lint, `npm test` (14 tester), `validate.ts`, bygg.
- Balanse: 8 / 25 / 67 / 141, nybegynner 144, kontrollrommet 5★ og 1★, exit 0.
- Egne skript:
  - Temperaturen i smeltingen og rensingen.
  - Lageret: før gikk det 16 t over, nå stopper det på 39 992 av 40 000 t.
- Playwright på iPhone 13: støpingen åpner menyen, kassa vises, ovnsfanene virker. Ingen feil og ingen horisontal
  scrolling.

**Gjenstår:** Ingenting fra brukerens liste.

---

## Økt 55 – 2026-09-25: konsern og nytt sluttmål

**Brukeren ba om:** Når storverket er ferdig bygget, skal man kunne utvide til et konsern med flere verk, så spillet
ikke blir så fort ferdig. Milliardmålet skal bli mye større.

**Gjort:**
- B-106: fanen Verket → Konsern med datterverk, modernisering og felles innkjøp og salg.
- Sluttmålet er 10 mrd. i konsernverdi. Storverk-kortet og sluttskjermen er oppdatert.
- Testspillerne bygger konsern.
- Underfanene på Verket krymper, så fire faner får plass på 320 px.

**Testet:**
- tsc, lint, `npm test` (12 tester, ny test for konsernet), `validate.ts`, bygg.
- Balanse: 8 / 25 / 67 / 141, nybegynner 142,5, exit 0.
- `--vansker`: flink vinner ca. dag 342, nybegynner ca. dag 380. Ingen konkurs.
- Playwright på iPhone 13 og 320 px: Konsern-fanen og kjøp av datterverk virker. Ingen feil og ingen horisontal
  scrolling.

**Gjenstår:** Ingenting fra brukerens liste.

---

## Økt 54 – 2026-09-25: strøm, fravær, kurs, varsler og mye småtteri

**Brukeren ba om:**
- Strømavtaler med mer å si.
- Nytt spill+ etter «Spill videre».
- For mange fagpoeng ved seier.
- Fravær per ansatt og advarsler.
- Å se om produksjonen holder ved utkobling.
- Skrapklasser og reseptkrav i forespørsler.
- Hjelp til å installere på hjemskjermen.
- Sjeldnere kurs.
- Varsler som forsvinner for fort, og en logg som ligger for gjemt.
- Konsern.
- Automatisk bytte blokk → emner.
- Kapasitet for rammeavtaler.

**Gjort:**
- B-098 til B-105.
- Nytt spill+ og hjemskjerm-hjelp ligger også under ⚙️.
- Fagpoengene ved seier ble håndtert i forrige runde (B-085/B-092): mer å forske på og lavere sats på storverket.

**Testet:**
- tsc, lint, `npm test` (11 tester), bygg.
- Balanse: 8 / 25 / 67 / 141, nybegynner 142,5, exit 0.
- Playwright på iPhone 13:
  - «Siste hendelser» og advarsel-hintet
  - kapasiteten for avtaler
  - «Gi advarsel» under Fravær
  - teksten om kursrunder
  - hjemskjerm-hjelp i ⚙️
  - ingen feil og ingen horisontal scrolling
- Headless: strømsammenligningen samles per døgn.

**Gjenstår:** Konsern med flere verk og et større sluttmål (neste runde).

---

## Økt 53 – 2026-09-25: storverket, slutten av spillet, kontrollrommet og tester

**Brukeren ba om:**
- For lite å forske på etter storverket.
- Å gjennomføre alle forbedringsforslagene (kontrollrom, varselliste, symboler på målere, utfordringer og nytt spill+,
  fagboka fra kontrollrommet, tester).
- Oksygenråd i smeltingen, fosfor i avslaggingen og ikke oksygen i tappingen.
- Ekstreme fagpoeng på storverket.
- Mange overslag, strenggjennombrudd og elektrodebrudd.
- Anbefalte støtteroller når skiftene er fulle.
- Ingenting skjedde ved 1 mrd.
- Tredje ovn er bortkastet fordi støpingen er for treg.

**Gjort:** B-085 til B-097 (se BESLUTNINGER).

**Underveis:** En `git checkout` av `simpleRunner.ts` tok med seg endringer som ikke var committet. De ble lagt inn
på nytt og kontrollert mot tidligere diff og balansetall. Et forsøk på en kalk-knapp ble forkastet fordi den ikke
ga målbar effekt.

**Testet:**
- tsc, lint, prettier, `npm test` (10 tester), `validate.ts`, bygg.
- Balanse: 8 / 26 / 66 / 137, nybegynner 154, exit 0. Den flinke testspilleren vinner rundt dag 200.
- Playwright på iPhone 13 og 320 px bredde:
  - toppfeltet uten kutt og uten horisontal scrolling
  - varsellista, utfordringskortet, anbefalte roller, varselvalg og det nye utstyret
  - en hel charge i kontrollrommet med oksygenråd, uten oksygen i tappingen, med «Hvorfor?» i resultatet

**Gjenstår:** Følge med på om fagpoeng og havarier føles riktige på storverket nå.

---

## Økt 52 – 2026-09-25: blokk-forespørsler, varsel før produktbytte og fravær med 4–5 skift

**Brukeren ba om:**
- Hvorfor det kom forespørsler på blokker når verket ikke kunne lage dem.
- Et varsel før man går fra blokker til emner.
- Ingen fraværsvarsler med 4–5 skift, med mindre skiftgangen går ned.

**Gjort:**
- B-082: forespørsler og avtaletilbud på produkter verket ikke lager lenger, trekkes tilbake.
- B-083: fravær som de ekstra lagene dekker, står bare i loggen. Utløpt fravær fjernes før varslene.
- B-084: engangstips når strengstøping kan kjøpes, og bekreftelse ved «Kjøp» med konsekvensene.

**Testet:**
- tsc, lint, bygg og balanse (8 / 26 / 66 / 134, nybegynner 155, exit 0). Et første forsøk med sperre på aktive
  rammeavtaler ga −17 mill. kr for frø 1 og ble forkastet.
- Headless: blokk-forespørsler trekkes tilbake en time etter byttet. Over 30 døgn med 4 lag er 14 av 58
  fraværsmeldinger varsel (bare når et skift ellers ville gått tapt), med 3 lag 53 av 53.
- Playwright på iPhone 13: tipset vises, bekreftelsen vises, og «Ja, bytt» setter strengstøpingen i drift. Ingen feil.

**Gjenstår:** –

---

## Økt 51 – 2026-09-25: antall aktive avtaler på fanen

**Brukeren ba om:** Avtaler-knappen under Salg skal vise hvor mange aktive avtaler man har.

**Gjort (B-081):** «Avtaler (1)» med antall aktive. Nye tilbud får et grønt «Ny»-merke.

**Testet:** tsc, lint, bygg, balanse (exit 0). Playwright på iPhone 13: «Avtaler (1)» og «Avtaler (1) Ny», fanen
på to linjer, ingen horisontal scrolling.

**Gjenstår:** –

---

## Økt 50 – 2026-09-25: avslagging og tapping mer intuitivt

**Brukeren ba om:** Avslaggingen (8,6 t slagg, måler helt til høyre) og tappingen (1614 °C, grønt fra 1616 °C)
fungerte ikke intuitivt.

**Gjort (B-080):**
- Hovedknappene er grå til riktig tidspunkt og oransje når det er riktig. «Tapp likevel (for kaldt)» når badet er for kaldt.
- Slaggmåleren er skalert til slagget da tippingen startet.
- Avslaggingen går saktere på slutten, så det grønne feltet varer ca. 4 s.
- Hintene viser sekunder igjen og om temperaturen stiger. Ovnstegningen kuttes ikke lenger nederst når den tippes.

**Testet:** tsc, lint, bygg, balanse (exit 0, 4★ / 1★). Playwright på iPhone 13 gjennom en hel charge med skjermbilder
midt i avslagging og tapping, ingen feil, ingen horisontal scrolling.

**Gjenstår:** –

---

## Økt 49 – 2026-09-25: karbonet for lavt og temperaturen stiger i rensingen

**Brukeren ba om:** I rensingen kunne ikke karbonet justeres (0,002 %), og temperaturen steg selv om alt var av.

**Gjort (B-079):** Strømmen kan nå slås helt av (nivå 0). Automatikken holder karbonet over 0,12 % under
smeltingen. Rensingen har fått en «Karbon»-knapp når karbonet er for lavt, og hintene i rensing og tapping er nye.
Testspilleren følger rådet.

**Testet:** tsc, lint, bygg, balanse (exit 0, 4★ / 1★, P 0,0201). Headless: oksygen hele smeltingen gir 0,115 % C
ved rensing. Strøm av kjøler 1650 → 1620 °C på 30 s. Karbon på: 0,01 → 0,05 % på 9 s. Playwright på iPhone 13:
blåste for lenge, strøm av, karbon inn igjen, tappet med 4★, ingen feil.

**Gjenstår:** –

---

## Økt 48 – 2026-09-25: «3 av 3 skift» med 4-skift

**Brukeren ba om:** Folk viste «3 av 3 skift» selv om verket hadde flere skiftlag.

**Gjort (B-078):** Skiftkortet skiller nå skift i døgnet og skiftlag: «døgnet rundt med 4 skiftlag · 4-skift». Det
står også når fraværet gjør at færre lag er fulle. Bemanningstabellen regner og viser per lag når det er 4–5 lag.

**Testet:** tsc, lint, bygg, balanse (exit 0). Playwright på iPhone 13 med en lagring med 4 lag og 2 borte: teksten
stemmer, tabellen viser «Trengs 4 lag», ingen horisontal scrolling.

**Gjenstår:** –

---

## Økt 47 – 2026-09-25: bare den enkle styringen i kontrollrommet

**Brukeren ba om:** Fjerne den fulle styringen og bare bruke den enkle.

**Gjort (B-077):** Knappen til det fulle kontrollrommet er borte. `ExpertControl.tsx`, HMI-komponentene i
`src/components/`, `controlroom.css`, `useMediaQuery`, `sim/commands.ts` og `recharts` er slettet. README, DESIGN og
CLAUDE.md er oppdatert (også tabellen over stegene etter B-076).

**Testet:** tsc, lint, `validate.ts`, balanse (exit 0, enkel styring 4★ / 1★), bygg, Playwright på iPhone 13
gjennom en hel charge (ingen feil, ingen horisontal scrolling).

**Gjenstår:** Ingenting fra denne økta.

---

## Økt 46 – 2026-09-25: kontrollrommet med oksygen, avslagging og øse

**Brukeren ba om:** Oksygen styrt samtidig med strømmen, ikke automatisk avslagging (for mye → stål ut
slaggdøra), rette opp ovnen når øsa er full (ellers renner den over), og vanskeligere å få perfekt charge.

**Gjort (B-076):** `simpleRunner.ts` og `SimpleControl.tsx` er skrevet om: oksygenbryter ved siden av
strømknappene, manuell tipping mot slaggdøra med slaggmåler og søl-alarm, øse-måler og «Rett opp ovnen» ved
tapping, fem deler i stjerneberegningen og strengere krav. Tapt stål trekkes fra chargen i `engine.ts`.
Testspilleren i `balance.ts` følger de nye stegene. Tappingen går litt fortere (fart 8).

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 134, nybegynner 155, enkel styring 4★ / 1★, exit 0), Playwright
på iPhone 13 gjennom alle stegene (ingen feil i konsollen, ingen horisontal scrolling).

**Gjenstår:** Følge med på om spillerne synes avslaggingen og øsa er for vanskelig eller for lett.

---

## Økt 45 – 2026-09-25: flere oppgraderinger på storverket

**Brukeren ba om:** Flere oppgraderinger på storverket (en kollega hadde alle etter ti minutter).

**Gjort (B-075):** Sju nye oppgraderinger (ovn nr. 3, 6 strenger, vakuumavgassing, havnekai, skrapterminal,
varmegjenvinning, valseverk nr. 2). Mindre støping på samme nivå skjules.

**Testet:** tsc, lint, balanse (exit 0), `--vansker` (vinner rundt dag 207), headless-liste over utstyret per sted.

**Gjenstår:** kontrollrommet (oksygen samtidig med strøm, manuell avslagging, tapping som renner over,
vanskeligere 5★).

---

## Økt 44 – 2026-09-25: oppgraderinger per ovn

**Brukeren ba om:** Oppgraderinger skal kjøpes per ovn, ikke komme på begge.

**Gjort (B-074):** Egen type og eget utstyr per ovn, per-ovn-beregning av charger/strøm/slitasje (`unitView`),
utstyrsark gruppert per ovn, migrering av gamle lagringer, testspilleren kjøper per ovn.

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 134, nybegynner 155, exit 0), headless: bare ovn 1 bygges om til
lysbue med transformator, ovn 2 lager fortsatt 5 t-charger; Playwright: utstyrsarket per ovn.

**Gjenstår:** flere oppgraderinger på storverket, kontrollrommet.

---

## Økt 43 – 2026-09-25: 4- og 5-skift

**Brukeren ba om:** 4 og 5 skift, så mange ansatte gir mening.

**Gjort (B-073):** Skiftlag inntil fem, med fridager i turnusen: bedre trivsel, mindre sykdom, raskere læring og
dekning av fravær. Folk → Skift viser ordningen og har «Ansett til 4-skift/5-skift».

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 142, nybegynner 155, exit 0), headless-test på storverket med 3, 4 og
5 lag.

**Gjenstår:** oppgraderinger per ovn, flere oppgraderinger på storverket, kontrollrommet.

---

## Økt 42 – 2026-09-25: ansatte, småfikser, innstillinger og bank

**Brukeren ba om:** Sjekk om murere, selgere og alle ansatte virker; hjemskjerm-tips før start; varsel på Folk
når folk mangler; fagpoeng én gang i uka; 4 og 5 skift; flere oppgraderinger på storverket; kontrollrommet med
oksygen samtidig som strøm, manuell avslagging og tapping som kan renne over, og vanskeligere 5★; innstillinger og
bank ut av Forskning; oppgraderinger per ovn; for lite tid til å svare på 10×.

**Gjort i denne runden:** B-070 (målt alle roller, Folk viser effekten, testspiller-feil ved bytte av støping),
B-071 (fagpoeng ukentlig, «!» på Folk, svarfrist i 1×, hjemskjerm-tips), B-072 (⚙️ og bank under Økonomi).

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 136, nybegynner 150, exit 0), frø 7–10, headless-målinger av
rollene, Playwright på iPhone SE og iPhone 13.

**Gjenstår:** 4 og 5 skift, oppgraderinger per ovn, flere oppgraderinger på storverket, kontrollrommet – tas i
neste runder. Spørsmålet om storverket henger sammen med flere oppgraderinger.

---

## Økt 41 – 2026-09-25: tips når farten går ned

**Brukeren ba om:** Et hint første gang farten går ned automatisk, og hvorfor.

**Gjort (B-069):** Engangstipset «Hvorfor gikk farten ned til 1×?» etter første kort som setter ned farten fra
3× eller 10×.

**Testet:** tsc, lint, balanse (exit 0), headless-test: kort på 10× → farten 1× → tipset kommer, og bare én gang.

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense).

---

## Økt 40 – 2026-09-25: flytte-hintet rett over målkortet

**Brukeren ba om:** «Du kan flytte inn … Trykk her» og målkortet rett under ga ikke mening (skjermbilde).

**Gjort (B-068):** Hintet skjules på Oversikt; målkortet får grønn ramme når du kan flytte. På Anlegg og Økonomi
vises hintet fortsatt.

**Testet:** tsc, lint, Playwright på iPhone-størrelse (ingen hint på Oversikt, hint på Økonomi som åpner målkortet).

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense).

---

## Økt 39 – 2026-09-25: hint om skrapforskning for nye kvaliteter

**Brukeren ba om:** En spiller skjønte ikke at han måtte forske fram flere skraptyper for å lage høykarbon – det
bør være et hint.

**Gjort (B-067):** Hint på Verket, råd på Resept og på forespørsler under Salg når kvaliteten trenger skrap som
ikke er forsket fram. Beskrivelsen av «Rent nyskrap» nevner kvalitetene.

**Testet:** tsc, lint, balanse (exit 0), headless-test av hvilke kvaliteter som trenger hvilken forskning på nivå
1–3, Playwright på iPhone-størrelse (hint på Verket og Resept, ingen konsollfeil).

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense).

---

## Økt 38 – 2026-09-25: Oversikt som hopper, og stilling i oppsigelser

**Brukeren ba om:** Oversikt hoppet opp og ned når «Venter på» kom under ovnen; oppsigelsesvarselet skal si
hvilken stilling personen hadde.

**Gjort (B-066):** Fast høyde på teksten i produksjonslinja og ovnstilstanden under Anlegg. Oppsigelser og skader
viser stilling og peker til Folk → Ansett.

**Testet:** tsc, lint, balanse (exit 0), Playwright på iPhone SE og iPhone 13 med spillet på 10× i 18 sekunder:
knapperaden hadde samme høyde hele tida.

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense).

---

## Økt 37 – 2026-09-25: tall på Ovn-knappen

**Brukeren ba om:** Varsel på Ovn-knappen i Oversikt når man kan kjøpe oppgraderinger (B-061 dekket bare Anlegg).

**Gjort (B-065):** Tall på Skrap, Ovn, Støping og Lager i produksjonslinja; et trykk åpner utstyret for stedet.

**Testet:** tsc, lint, Playwright på iPhone-størrelse (tallet på Ovn, trykk åpner Ovn-utstyret, ingen konsollfeil).

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense).

---

## Økt 36 – 2026-09-25: fagpoeng når man står fast, og «Flytt inn»

**Brukeren ba om:** En kollega på stålverket syntes det var for vanskelig å få fagpoeng – man må kunne tjene
fagpoeng når man står fast. «Flytt inn under Mål lenger ned» ble ikke funnet.

**Gjort (B-064):** Forskningssamarbeid (kjøp fagpoeng én gang per døgn), hint på Verket når hovedutstyret
venter på fagpoeng, «Slik får du fagpoeng» på Forskning, flytte-hintet ruller til målkortet, og målkortet står
øverst når du kan flytte. Nytt felt `fpDealDay` med standardverdi i `migrate()`.

**Testet:** tsc, lint, validate, balanse (8 / 26 / 66 / 133, nybegynner storverket median 165, exit 0),
Playwright på iPhone-størrelse (kjøp av samarbeid, hint, flytte-hint til målkortet, ingen konsollfeil).

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense).

---

## Økt 35 – 2026-09-25: skjult automatikk og skrapvarsel

**Brukeren ba om:** Sjekke om omforing skjer automatisk uten reparatør/plan, og om skrapmiksen fikser seg uten
skrapklasser. Varsel på Skrap-knappen når en skraptype mangler.

**Gjort (B-063):** Planleggeren legger ikke lenger om resepten – bare skrapklasseren. Omforing skjer ikke av seg
selv (testet), men loggen og Vedlikehold-kortet sier nå hvem som bytter foringen, og spesialisten fra rådgiveren
kalles ikke lenger «reparatøren». Skrap-knappene har «!» og «Mangler …».

**Testet:** tsc, lint, validate, balanse (8 / 26 / 66 / 133, nybegynner OK, exit 0), headless-test av omforing
uten automatikk, Playwright på iPhone-størrelse (varsel på Skrap og Kjøp skrap, linja på Vedlikehold).

**Gjenstår:** spørsmålet om storverket (mer innhold eller lavere vinnergrense) fra økt 34.

---

## Økt 34 – 2026-09-25: foringsvarsel, merke på Anlegg og balanse

**Brukeren ba om:** Varselet om å bytte foring skal gå til vedlikeholdskortet; Anlegg skal vise når en
oppgradering kan kjøpes; test om spillet er for lett eller vanskelig på de forskjellige nivåene og gjør balansen bra.

**Gjort:** B-061 (varsel åpner Vedlikehold, tall på Anlegg). B-062: ny `--vansker`-rapport og nybegynnerprofil i
testspilleren (også i CI), flere fagpoeng for store charger og billigere forskning på stålverket, bytte av støping
krever at gamle kontrakter er levert, advarsel når et kjøp tømmer kassa, hint om kreditt/lån når planleggeren ikke
får kjøpt, anslaget på Salg regner med rammeavtaler og viser «Knapt», «Neste store steg» på målkortet.

**Testet:** tsc, lint, validate, balanse (8 / 26 / 66 / 133, nybegynner storverket dag 131–198, exit 0).
Playwright på iPhone-størrelse: varselet og hintet åpner Anlegg med Vedlikehold øverst, Anlegg-merket, målkortet,
ingen konsollfeil, ingen horisontal scrolling.

**Gjenstår:** storverket har lite å gjøre de siste ca. 90 døgnene før 1 mrd. – spør brukeren om mer innhold der
eller lavere vinnergrense.

---

## Økt 33 – 2026-09-25: nivåene forklart i teksten

**Brukeren ba om:** «Fra støperiet» er ikke selvforklarende for en ny spiller.

**Gjort (B-060):** `stageRef()` skriver nivået som «støperiet (neste nivå)» eller «stålverket (nivå 4 av 5)».
Brukt på Marked, Folk, utstyr, forskning, søkere og natt-tipset. Målkortet på Verket viser «(nivå X av 5)».

**Testet:** tsc, lint, validate, balanse (8 / 26 / 66 / 159, exit 0), Marked og Folk på iPhone-størrelse
(ingen konsollfeil, ingen horisontal scrolling).

**Gjenstår:** ingenting kjent.

---

## Økt 32 – 2026-09-25: tekstene i spillet

**Brukeren ba om:** Endre quiz-spørsmålet om analyse, og se over tekst i spillet så den gir mening.

**Gjort (B-059):** Gikk gjennom quiz, fagbok, forskning, beskrivelser, hendelser, tips, meldinger og skjermtekst.
Rettet utdaterte henvisninger (digel, «Foreslå billigste resept», lån under Forskning), dager/døgn, fagord uten
forklaring og desimalpunktum. Innleid planlegger virker uten automatikk-forskning.

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 159).

**Feil i publiseringen av #39:** kontrollrom-sjekken i `balance.ts` sammenlignet farten etterpå med farten
før et hendelseskort satte 1×. Rettet til å sammenligne med farten da kontrollrommet åpnet. Lærdom lagt i CLAUDE.md.

---

## Økt 31 – 2026-09-25: avbryte ordrer, flere forespørsler og reseptguide

**Brukeren ba om:** Avbryte ordrer med straff; flere ordrer å lage i garasje og verksted; gjennomgang av hvordan
man lager riktig resept når en ny kvalitet låses opp.

**Gjort:** B-056 (flere forespørsler, mest i kvaliteter man kan lage), B-057 (avbryt ordre), B-058
(reseptguide).

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 159). I Node: guiden går gjennom alle stegene når spilleren gjør
dem; avbrutt ordre gir bot og omdømmetap. Playwright (iPhone 13): guide med «Vis meg», bekreftelse ved avbryt,
lenke i Resept-fanen, 390 px, ingen feil.

---

## Økt 30 – 2026-09-25: gjennomgang av koden

**Brukeren ba om:** Se over all kode og fiks feil.

**Gjort (B-055):** Fuzz-test av motoren (tilfeldige handlinger, invarianter, lagring) og klikk-gjennom av alle
sider på alle nivåer. Fire feil rettet (støpefeil solgt mot spillerens valg, ansettelse for fravær, ferdighet for
fraværende, natt-tipset).

**Testet:** tsc, lint, build, balanse (8 / 26 / 65 / 161), prosessmodellen (validate). Ingen krasj, NaN eller
konsollfeil; ingen horisontal scrolling.

---

## Økt 29 – 2026-09-25: fagpoeng, vikarer og automatikk som forskning

**Brukeren ba om:** For mange fagpoeng i støperiet; automatiske vikarer kom for sent; all automatikk skal låses
opp med fagpoeng; se over koden og fiks feil.

**Gjort:** B-052 (færre fagpoeng per charge, testspilleren tar quiz), B-053 (vikarer rett etter sykdom),
B-054 (automatikk som forskning, `AutoToggle`).

**Testet:** tsc, lint, balanse (8 / 26 / 67 / 149). I Node: gammel lagring beholder automatikken, nytt spill
starter uten; automatiske vikarer gir 0 timer med færre skift på 20 døgn. Playwright (iPhone 13): låste brytere
på Verket, Marked, Folk og Salg, forskningene vises, 390 px, ingen feil.

---

## Økt 28 – 2026-09-24: Marked og Forskning med underfaner

**Brukeren ba om:** Kortere og mer intuitive Marked- og Forskning-sider.

**Gjort (B-051):** Underfaner på begge sider, sammenfoldede beskrivelser og innstillinger, gruppert
forskningsliste, lenker fra Verket til riktig fane.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). Playwright (iPhone 13): Marked Skrap 1 118 px (før ca.
3 000), Forskning 1 304 px (før ca. 2 800), alle faner 390 px brede, tips åpner riktig fane, ingen feil.

---

## Økt 27 – 2026-09-24: vikarer når verket mangler folk

**Brukeren meldte (skjermbilde):** «Vikarene fungerer ikke. Skiftet går ned uansett?»

**Funn:** Vikarene dekket fraværet. Skiftet gikk ned fordi det manglet én støper for tre skift, og verket var
fullt (24 av 24 ansatte).

**Gjort (B-050):** Innleie av vikarer til plassene som mangler, tydelig tekst når verket er fullt, og visning
av ansatte som ikke står på skift.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). I Node: 2 → 3 skift med innleie, tilbake til 2 med varsel
etter 3 døgn. Playwright (iPhone 13) med fullt verk: knappen virker, tabellen viser «+ 1 innleid», 390 px.

---

## Økt 26 – 2026-09-24: hvilket skrap ovnen venter på

**Brukeren sendte:** Skjermbilder av ovn 1 som venter på skrap til lavkarbon (fra før B-048 var publisert).

**Gjort (B-049):** Varsel og tips sier hvilke skraptyper som mangler; Marked merker dem.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). I Node: med planlegger ingen stopp på 48 t; uten planlegger
sier varselet «Resepten trenger rent nyskrap». Playwright (iPhone 13): rent nyskrap merket under Marked, 390 px.

---

## Økt 25 – 2026-09-24: Lager-knappen og skrap til lavkarbon

**Brukeren meldte:** Lager-knappen på Verket går til Forespørsler; ovnen stopper fordi lavkarbon-skrapet ikke
kjøpes inn.

**Gjort (B-048):** Lager-knappen åpner Salg → Lager. Innkjøpet går videre når planleggeren er borte, og
grunnen vises når planleggeren ikke får kjøpt.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). I Node: planlegger på ferie gir ingen stopp; lite penger
gir riktig grunn. Playwright (iPhone 13): Lager og «Til salg» åpner Lager-fanen, vanlig Salg åpner
Forespørsler, ingen feil.

**Gjenstår:** Hvis ovnen fortsatt stopper hos brukeren, vil varselet nå si hvorfor.

---

## Økt 24 – 2026-09-24: Avløser og ryddigere Folk-side

**Brukeren ba om:** Allroundere skal ikke kunne være reparatør, skrapklasser eller murer; nytt navn «Avløser»;
Folk-siden mer intuitiv.

**Gjort (B-047):** Stedfortreder-logikken fjernet, rollen heter Avløser, Folk har fire underfaner.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). Playwright (iPhone 13): alle fire faner, 390 px bredt og
høyst ca. 860 px høyt, ingen feil.

---

## Økt 23 – 2026-09-24: sekvenser og overgangsemner i strengstøpingen

**Brukeren påpekte:** Med to kvaliteter må støpingen vente med den ene kvaliteten, ellers blir det
overgangsemner som må skrapes.

**Gjort (B-046):** Strengstøpingen støper én kvalitet om gangen, venter på slutt av sekvens (30 min stopp)
eller bytter etter 90 min med skrapede overgangsemner. Tekst på Verket og tonn i Kvalitet-kortet.

**Testet:** tsc, lint, balanse (uendret). I Node med to kvaliteter: lysbueovn 525 t mot 584 t på 48 t, 8 t
overgangsemner; induksjonsovn uten tap. Playwright (iPhone 13): teksten på Verket, 390 px, ingen feil.

---

## Økt 22 – 2026-09-24: Salg, folk, lavkarbon og ny startovn

**Brukeren ba om:** Kortere og mer intuitiv Salg-side; vikarer som dekker støpere; skrapklasser og planlegger
som fikser lavkarbon; allroundere som flytter seg dit de trengs; liten induksjonsovn i stedet for digel;
rammeavtaler skjult til de er låst opp.

**Gjort:** B-043 (resept ved kvalitetsbytte, lavkarbon, allroundere som stedfortredere, vikarer synlige i
bemanningstabellen), B-044 (Salg med underfaner), B-045 (liten induksjonsovn i garasjen).

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 136). I Node: lavkarbon-treff med riktig resept, automatisk
omlegging av resept, stedfortreder for reparatør. Playwright (iPhone 13): nytt spill med induksjonsovn, Salg-
faner (maks ca. 920 px høy i stedet for en lang rull), Folk med vikarer, 390 px, ingen feil.

---

## Økt 21 – 2026-09-24: strømavtalen og valg av forespørsler

**Brukeren ba om:** Vise hvor lenge strømavtalen varer, varsel når den går ut, avklare hvilken avtale som er
standard, og kunne sortere etter ønskede forespørselstyper.

**Gjort (B-042):** Spotpris er standard og det man går tilbake til; valg for automatisk fornyelse; nedtelling
og varsler. Salg: velg kvaliteter du vil ha forespørsler på, og sorter forespørslene.

**Testet:** tsc, lint, balanse (10 / 24 / 62 / 142). I Node: nattariff varsles 3 og 1 døgn før og går tilbake
til spotpris; med bare standard valgt kommer bare standard-forespørsler. Playwright (iPhone 13): strømkortet
og kvalitetsvalget i Salg, 390 px, ingen feil.

---

## Økt 20 – 2026-09-24: utstyr på ovn 2

**Brukeren meldte (skjermbilde):** Ovn 2 skal ha egen «utstyrsbutikk» som ovn 1.

**Gjort (B-041):** Knappen «Utstyr» vises på hver ovn. Butikken sier at ovnstype og utstyr gjelder alle ovnene.
Testet med Playwright (iPhone 13): knappen på ovn 2 åpner ovnsutstyret, 390 px, ingen feil.

---

## Økt 19 – 2026-09-24: to kvaliteter, fraværsvarsler, rammeavtaler og vikarer

**Brukeren ba om:** To kvaliteter samtidig med to linjer, varsel når noen tar ferie eller blir syk, faste
kontrakter som varer lenger senere i spillet, og meldte at skiftgangen gikk ned selv med vikarer.

**Gjort:**
- B-039: egen kvalitet og resept per ovn, bryter «To kvaliteter samtidig» og valg for ovn 2 på Verket,
  resept-faner, Salg viser hvilken ovn som lager hvilken kontrakt. Vikarer til alle er tilbake, automatisk
  innleie, varsel når vikarene går hjem. Ferie varsles som hendelse.
- B-040: rammeavtaler fra stålverket (nytt kort under Salg, `Agreements.tsx`).

**Testet:** tsc, lint, balanse (10 / 24 / 62 / 142, alle OK). I Node: automatisk innleie og varsel når vikarer
går hjem; to ovner med standard og armering samtidig. Playwright iPhone 13: Verket, Salg (signere
rammeavtale), Marked (resept-faner) og Folk (fravær), 390 px uten horisontal scrolling, ingen konsollfeil.

**Gjenstår:** Digel-spørsmålet (induksjonsovn i garasjen?) venter på svar fra brukeren.

---

## Økt 18 – 2026-09-24: «døgn siden omforing» for ny ovn

**Brukeren meldte (skjermbilde):** Ovn 2 var nylig kjøpt, men viste 62 døgn siden omforing.

**Gjort (B-038):** Ny ovn og ny ovnstype får omforingsdag = kjøpsdagen; gamle lagringer rettes med et
anslag ut fra antall charger. Testet i Node (kjøp dag 32 → «byttet dag 32»; gammel lagring → dag 22).

---

## Økt 17 – 2026-09-24: ny tilbakemeldingsrunde (pakke 1 av 5: start og varsler)

**Brukeren ba om:** Lang liste (se oppgavene i denne økta): murere på dagtid, raskere start, varsler og
tips, 1× etter popup, konkurs uten råd til omforing, omdømme i starten, reklamasjoner, kvalitetsingeniør,
Verket for lang, Marked uintuitiv, støpefeil, fagbok-kapitler, potte/porten, nattillegg, vedlikehold,
nestenulykke, søkere ved flytting, bryter for forespørsler, lang lagerliste, øseovnsoperatør, digel.
Delt i fem pakker.

**Pakke 5 (B-037):** Øseovnsoperatør i stedet for laborant, med prøver, legering, temperatur og sperret
stål. Balanse 10 / 24 / 62 / 138.

**Digel:** brukeren spurte om digelovn bare hører til aluminium. Svar i samtalen; ikke endret ennå.

**Pakke 4 (B-036):** potte, porten, nattillegg, «Les «kapittel»» fra Forskning, låst/skjult planlagt
omforing, varsel når reparatøren er borte, belønning og straff ved nestenulykke. Testet i Playwright.

**Pakke 3 (B-035):** Verket i underfaner med kompakt produksjonslinje (siden er ca. 20 % kortere, og alt
viktig står øverst), resept-editor med −/+ og forslagene Billigst og Sikrest, skrapklasser-info, pris på
kjøpsknapper, kortere lagerliste, automatisk håndtering av støpefeil. Testet i Playwright på iPhone 13.

**Pakke 2 (B-034):** Én reklamasjon per kontrakt, tålmodige små kunder, mer omdømme i garasjen,
kvalitetsingeniør måler lageret, realistiske frister og «blir ferdig ca. dag X», bryter for forespørsler,
søkere ved flytting, sjeldnere radioaktive kilder, støperiet 750 000 kr. Balanse 10 / 24 / 68 / 141.

**Pakke 1 (B-033):** Små første ordre, spoling om natta, engangstips, varsel ved tomt skraplager og
kreditt, 1× og klikksperre på kort, murere dagtid, nattillegg bare for skiftfolk, konkurs uten råd til
foring. Testet i Playwright: første tilbud 0,4–0,6 døgn, tips kl. 16:00, knappene sperret et øyeblikk,
1× etter kortet, natta på 11 s. Balanse 11 / 33 / 77 / 153.

---

## Økt 16 – 2026-09-24: «Hopp over» i veiledningen

**Brukeren meldte:** «Hopp over» hoppet over hele veiledningen, ikke bare til neste steg.

**Gjort (B-032):** «Hopp over steget» går til neste steg; «Avslutt veiledningen» fjerner den helt.

**Testet:** Playwright på iPhone 13: alle stegene kan hoppes over ett og ett til «Ferdig», og «Avslutt
veiledningen» fjerner kortet. Ingen konsollfeil.

---

## Økt 15 – 2026-09-24: fravær, influensa og vikarer

**Brukeren ba om:** Forslaget om fravær, med automatisk ferie, influensa der flere er borte, og valget
mellom å gå ned på skiftgangen eller leie vikarer.

**Gjort (B-031):** Fravær per ansatt (ferie og sykdom), allroundere som dekker, nytt influensakort,
vikarer under Folk, kort for fravær og varsel på Verket.

**Testet:** Node-test av fravær over 60 døgn (se B-031). Playwright på iPhone 13: fraværskortet viser syk
ansatt, tapt skift og ferie som kommer; vikarer i 1 døgn dekker fraværet. Balanse 12 / 31 / 73 / 150.
Ingen konsollfeil.

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
