# CLAUDE.md – minne for Claude i dette prosjektet

Denne fila leses automatisk når en ny samtale starter i repoet. Den er
Claudes langtidsminne sammen med `docs/`. Hold den kort og oppdatert.

## Før du begynner

1. Les **`docs/LOGG.md`** – siste økt øverst: hva som ble gjort og hva som står igjen.
2. Les **`docs/BESLUTNINGER.md`** – hvorfor ting er som de er. Ikke gjør om en
   beslutning uten at brukeren ber om det; skriv i så fall en ny beslutning som
   erstatter den gamle.
3. Les **`docs/DESIGN.md`** hvis oppgaven gjelder spillmekanikk eller grensesnitt.

## Før du avslutter en økt

- Legg til en ny økt øverst i `docs/LOGG.md`: dato, hva brukeren ba om, hva
  som ble gjort, hva som ble testet, og hva som gjenstår.
- Legg til nye beslutninger i `docs/BESLUTNINGER.md` (neste nummer, aldri
  slett gamle – marker dem som erstattet).
- Oppdater denne fila hvis kommandoer, struktur eller regler har endret seg.
- Commit og push til utviklingsgrenen.

## Prosjektet

**Stålverket** er et mobilspill (tycoon, inspirert av Game Dev Tycoon) der
spilleren bygger et skrapbasert stålverk fra en garasje til et storverk.
Spillet skal lære bort hvordan et stålverk fungerer, og skal kunne spilles av
folk uten forkunnskaper. Det kjører helt i nettleseren (PWA) og publiseres på
GitHub Pages: https://t-event.github.io/Simulator/

## Faste regler

- **Språk:** snakk norsk (bokmål) med brukeren. All tekst i spillet, docs og
  commit-meldinger skrives på norsk.
- **Konfidensialitet (viktig):** Tallene i spillet er generiske. Ikke legg inn
  dokumenter fra noen bedrift, og skriv aldri bedriftsnavn, stedsnavn,
  personnavn, interne prosedyrenumre, leverandørnavn eller interne
  kvalitetskoder fra ekte anlegg i noe som committes. Repoet er offentlig. Er
  du i tvil, spør brukeren før du committer.
- **Enkelt for nybegynnere:** Alt spilleren må gjøre skal kunne forstås uten
  fagkunnskap. Forklar med vanlige ord; fagordene kan stå i fagboka.
- **Mobil først:** Test alltid på iPhone-størrelse (390 px bred). Ingen
  horisontal scrolling, knapper minst ca. 40 px høye.
- **Balanse:** Endringer i økonomi eller progresjon skal gjennom
  `npx tsx src/game/balance.ts` (kjøres også i CI). Justeres målene, skriv hvorfor
  i `docs/BESLUTNINGER.md`.
- **Lagrede spill:** Spilltilstanden (`src/game/types.ts`) lagres i
  nettleseren. Nye felt må ha en standardverdi i `migrate()` i
  `src/game/save.ts`, ellers går gamle lagringer tapt.
- **Git:** Utvikle på en egen gren og push dit. `main` publiseres automatisk,
  så endringer dit går via PR. Aldri force-push til `main`.
- **PR og merge (brukerens stående beskjed):** Når en endring er ferdig og alle sjekker er grønne
  lokalt, oppretter Claude selv PR til `main` og merger den, uten å spørre. Deretter sjekkes at
  publiseringen i Actions («Publiser til GitHub Pages») går grønt. Er den rød, rettes feilen
  med én gang (se B-017).

## Kommandoer (fra `frontend/`)

```bash
npm install
npm run dev                      # utviklingsserver på http://localhost:5173
npx tsc -b                       # typesjekk
npm run lint                     # oxlint
npx tsx src/sim/validate.ts      # prosessmodellen gir forventede nøkkeltall
npx tsx src/game/balance.ts      # testspilleren: progresjon, ingen konkurs, kontrollrommet
npx tsx src/game/balance.ts --verbose --finance --seed 3   # feilsøking av balansen
npx tsx src/game/balance.ts --dump 3 > lagret.json         # lagret spill på nivå 3, for testing
npx tsx src/game/balance.ts --kontrakter 1                 # hvor lang tid kontraktene tar per nivå
npx tsx src/game/balance.ts --research 1                   # når testspilleren forsker
npx tsx src/game/balance.ts --sperrer                      # hva som sperrer neste nivå: penger, omdømme, fagpoeng
npx tsx src/game/balance.ts --vansker                      # per nivå: hva spilleren venter på, flink og nybegynner
npx tsx src/game/balance.ts --nybegynner --verbose --seed 2  # kjør som nybegynner (også --replog N --nybegynner)
npx tsx src/game/balance.ts --seed 2 --repdrop             # alt som tok omdømmet ned, time for time
npm run build
```

## Struktur

```
frontend/src/
  game/        Spillmotoren – ren TypeScript uten React
    types.ts     Spilltilstand (JSON)       data.ts      Tabeller: skrap, utstyr, kunder …
    plant.ts     Utledede tall (kapasitet, skift)   engine.ts   Tid, produksjon, marked, hendelser
    actions.ts   Spillerhandlinger          research.ts  Forskning, fagpoeng, låste skraptyper og fart
    recipe.ts    Reseptsjekk og forslag til billigste resept
    quiz.ts      Quiz per kapittel         missions.ts  Oppdrag fra fagboka
    decisions.ts Hendelseskort med valg     knowledge.ts Fagboka
    save.ts      Lagring + migrering        useGame.ts   Spilløkka for React
    tutorial.ts  Veiledet start          tips.ts      Engangstips
    recipeGuide.ts Reseptguide for nye kvaliteter (vises av ui/RecipeGuide.tsx)
    balance.ts   Automatisk testspiller
  ui/          Spillets skjermer (mobil først) og kontrollrommet
    Overview.tsx Verket med underfanene Oversikt, Anlegg og Økonomi   Recipe.tsx  Resepten på Marked
    Agreements.tsx Rammeavtaler under Salg   AutoToggle.tsx  Brytere for automatikk (låst til den er forsket fram)
    views.ts     Fanene og når de låses opp   Upgrades.tsx, stations.ts  Utstyr per sted i anlegget
    ResearchPage.tsx  Forskning-fanen   Settings.tsx  ⚙️ innstillinger og banken (på Verket → Økonomi)
    InstallTip.tsx    Tips om hjemskjerm på startskjermen   Power.tsx  Strøm og skiftplan
    Handbook.tsx Fagboka med quiz og oppdrag
    control/     Kontrollrommet: den enkle styringen (SimpleControl + simpleRunner)
  sim/         Prosessmodell for lysbueovnen (brukes av kontrollrommet)
frontend/public/  PWA: manifest, ikoner, service worker
docs/          Minne: LOGG.md, BESLUTNINGER.md, DESIGN.md
```

## Testing i nettleseren

Playwright er installert globalt. Bruk Chromium fra `/opt/pw-browsers/chromium`
og `NODE_PATH=$(npm root -g)`. Test med `devices['iPhone 13']` og en
desktop-viewport. Et lagret spill kan legges inn med `addInitScript` under
nøkkelen `stalverk-spill-v1` i `localStorage`.

## Kjente fallgruver

- `pkill` returnerer 144 og avbryter resten av en `&&`-kjede – kjør det alene.
- Skjermbilder med `fullPage: true` viser faste menyer midt på siden; det er
  bare et artefakt av skjermbildet.
- Prosessmodellen er kalibrert med steg på maks 1 s – del opp større steg.
- GitHub Pages bygger fra `main`; utviklingsgrenen synes ikke før PR er merget.
- Se over `git status` og `git diff --stat` før commit. `git add -A` tok en gang med en hel
  `node_modules`-mappe fordi en ignore-regel var fjernet. `.gitignore` har nå en generell
  `node_modules/`-regel – ikke fjern den.
- Tall som sammenlignes med et krav (omdømme, penger, fagpoeng) skal vises rundet **ned**
  (`fmtRep`, `Math.floor`), ellers ser et krav oppfylt ut når det ikke er det.
- CI (`pages.yml`) kjører bare ved push til `main`, ikke på PR-er. Kjør sjekkene lokalt før PR.
- Testspilleren har en **nybegynner** (B-062) som følger rådene i spillet. Ny mekanikk som krever at spilleren
  gjør noe, må også gis et råd i spillet (hint, advarsel, «Neste store steg») – og nybegynneren må følge det,
  ellers feiler CI.
- Se på **exit-koden** til `balance.ts`, ikke bare median-linjene: sjekken av kontrollrommet står helt nederst
  og kan være «AVVIK» selv om nivådagene er OK (publiseringen av #39 feilet slik).
