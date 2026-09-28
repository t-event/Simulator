# CLAUDE.md – minne for Claude i dette prosjektet

Denne fila leses automatisk når en ny samtale starter i repoet. Den er
Claudes langtidsminne sammen med `docs/`. Hold den kort og oppdatert.

## Før du begynner

1. Les **`docs/LOGG.md`** – siste økt øverst: hva som ble gjort og hva som står igjen.
2. Les **`docs/BESLUTNINGER.md`** – hvorfor ting er som de er. Ikke gjør om en
   beslutning uten at brukeren ber om det; skriv i så fall en ny beslutning som
   erstatter den gamle.
3. Les **`docs/DESIGN.md`** hvis oppgaven gjelder spillmekanikk eller grensesnitt, og **`docs/RETNING.md`** hvis den
   gjelder sluttspillet, konsernet, økonomien eller konkurranse mellom spillere (hovedretningen, B-180).
4. Les **`docs/PLAN-NETT.md`** hvis oppgaven gjelder konto, lagring på nett, toppliste, sesonger eller konkurranse.
   Les **`docs/UI.md`** hvis oppgaven gjelder utseende, layout, PC-versjonen eller designsystemet (B-187).
5. Se **`docs/FORSLAG.md`** – åpne spørsmål til brukeren og forslag. Når noe avgjøres: ny beslutning, og oppdater lista.
6. Skal du lage noe nytt, avgjør om det **krever konto** etter reglene i **`docs/KONTO.md`** (se «Faste regler»).

## Før du avslutter en økt

- Legg til en ny økt øverst i `docs/LOGG.md`: dato, hva brukeren ba om, hva
  som ble gjort, hva som ble testet, og hva som gjenstår.
- Legg til nye beslutninger i `docs/BESLUTNINGER.md` (neste nummer, aldri
  slett gamle – marker dem som erstattet).
- **Endringsloggen (B-179, brukerens beskjed: hver eneste gang):** legg til en oppføring øverst i
  `frontend/src/game/changelog.ts` med det spillerne merker, skrevet med vanlige ord, og `b:` lik det nyeste
  beslutningsnummeret. `npm test` og publiseringen stopper hvis den mangler (`scripts/sjekk-endringslogg.mjs`).
  En beslutning som ikke endrer noe i spillet (ren planlegging), får linja `Endringslogg: nei` og hoppes over.
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
- **Nøkler (brukerens beskjed, B-126):** ingen nøkler i repoet, heller ikke den offentlige. URL og offentlig nøkkel
  til Supabase ligger i GitHub Secrets (`SUPABASE_URL`, `SUPABASE_KEY`) og legges inn av bygget som
  `VITE_SUPABASE_URL` og `VITE_SUPABASE_KEY`. Lokalt: `frontend/.env.local` (ignorert av git). Den hemmelige
  nøkkelen (service_role) skal aldri committes, logges eller brukes av spillet. Se `docs/PLAN-NETT.md`.
- **Konto (B-149):** Hver ny funksjon avgjøres etter reglene i `docs/KONTO.md`. Selve spillet krever aldri konto; det
  som lagres på nett, sammenlignes med andre eller belønner virkelig tid, krever konto. Skriv svaret i beslutningen,
  legg funksjonen i tabellen i KONTO.md og, hvis den krever konto, i `ACCOUNT_FEATURES` (`net/features.ts`). Uten
  konto vises funksjonen med `NeedsAccount` (flere på samme sted: ett `AccountFeaturesCard`, B-191), ikke skjult. Serverfunksjonen sjekker `auth.uid()` og er tatt fra `anon`.
- **Enkelt for nybegynnere:** Alt spilleren må gjøre skal kunne forstås uten
  fagkunnskap. Forklar med vanlige ord; fagordene kan stå i fagboka.
- **Gradvis synlighet (B-180):** spør alltid «når trenger spilleren å vite at dette finnes?». Er svaret «senere»,
  vises det ikke – heller ikke som låst kort eller hengelås. Forklar rett før spilleren trenger det: kort forklaring →
  én handling. Ingen tekstvegger.
- **Ingen nye valutaer (B-180):** penger og fagpoeng holder. Nye egenskaper er avledede verdier (Industrimakt,
  Kontroll), ikke poeng man bruker. Spilleren tar valg, ikke administrerer regneark.
- **Serveren avgjør alt mellom spillere (B-180):** eierskap, overtakelser, frister i ekte tid, inntekt fra andres
  aktivitet og økonomireformen regnes på serveren. Penger fra eget spill (spilltid, opptil 10×) kan bare flyttes inn i
  verdenen (ekte tid) i et begrenset tempo. Ekte spillerdata endres aldri uten dry-run og eierens godkjenning først.
- **Felles klokke (B-190, fast regel):** Industrimakt, Kontroll, strategisk eierskap og overtakelser skal baseres på
  serverautoritative verdier og ekte tid. Lokal kasse, lokal egenkapital og lokal spillfart skal aldri direkte avgjøre
  disse systemene. Konsernkassa har lik grense for alle. Konkurranser mellom spillere måles i ekte tid (f.eks. ekte aktive
  dager), ikke i spilldøgn. Tidslinjetall merket `pre_reform` brukes aldri i serverberegninger.
- **Mobil og PC (B-187):** mobil = rask drift, PC = kontrollrom/hovedkontor med mer oversikt. Samme spill og
  komponenter; ingen viktig funksjon bare på PC. Test alltid på iPhone-størrelse (390 px) og 320 px – ingen horisontal
  scrolling, knapper minst ca. 44 px høye – og, når layout endres, på de 7 størrelsene i `docs/UI.md` (opp til
  2 560×1 080). Nye stiler bruker tokens og komponentene i designsystemet (`docs/UI.md`), ikke nye faste farger.
- **Balanse:** Endringer i økonomi eller progresjon skal gjennom
  `npx tsx src/game/balance.ts` (kjøres også i CI). Justeres målene, skriv hvorfor
  i `docs/BESLUTNINGER.md`.
- **Lagrede spill:** Spilltilstanden (`src/game/types.ts`) lagres i
  nettleseren. Nye felt må ha en standardverdi i `migrate()` i
  `src/game/save.ts`, ellers går gamle lagringer tapt.
- **Git:** Utvikle på en egen gren og push dit. `main` publiseres automatisk,
  så endringer dit går via PR. Aldri force-push til `main`.
- **PR og merge (brukerens stående beskjed):** Når en endring er ferdig og alle sjekker er grønne
  lokalt, oppretter Claude selv PR til `main` og merger den, uten å spørre – også UI-faser (B-204: skjermbildene
  sendes, men det ventes ikke på svar). Deretter sjekkes at
  publiseringen i Actions («Publiser til GitHub Pages») går grønt. Er den rød, rettes feilen
  med én gang (se B-017).

## Kommandoer (fra `frontend/`)

```bash
npm install
npm run dev                      # utviklingsserver på http://localhost:5173
npx tsc -b                       # typesjekk
npm run lint                     # oxlint
npm test                         # raske tester av spillmotoren og nettlaget, endringsloggen er oppdatert, ingen emoji (også i CI)
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
npx tsx src/game/balance.ts --vekst                        # største vekst per døgn og per nivå – grunnlaget for juksesperren
npx tsx src/game/balance.ts --opphold                      # juksesperren med lange opphold (spill uten innlogging)
npx tsx src/game/balance.ts --daglig 15                    # som over/vanlig kjøring, men henter daglige belønninger (B-149)
npx tsx src/game/balance.ts --storovn 330                  # samme konsernspill med ulike ovner: tonn og overskudd (B-154)
npx tsx src/game/balance.ts --vurdering                    # kundevurderingene 1–10 per nivå, flink og nybegynner (B-161)
npx tsx src/game/balance.ts --konsern                      # konsernøkonomien med 1–14 verk og vekst over tid (B-181)
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
    challenges.ts Utfordringer på storverket, serier i trinn (B-232)   inbox.ts   Varsellista (hva som er viktig og nytt)
    tests.ts     Raske tester av motoren (npm test)
    decisions.ts Hendelseskort med valg     knowledge.ts Fagboka: tema, «Kort fortalt» og sider (B-234)
    save.ts      Lagring + migrering        useGame.ts   Spilløkka for React
    tutorial.ts  Veiledet start          tips.ts      Engangstips
    recipeGuide.ts Reseptguide for nye kvaliteter (vises av ui/RecipeGuide.tsx)
    konsern.ts   Datterverk, byggeprosjekter i ekte tid og flaggskipet (B-209); vises av ui/Konsern.tsx
    world.ts     Felles hendelser i motoren og sesongfordel (B-129)
    reserve.ts   Midlertidig myk grense for kassa (100 mrd.) og bunden konsernreserve (B-193) – grensen står her
    daily.ts     Daglig belønning, dagens oppdrag og mens du var borte (B-149)
    mastery.ts   Mesterskap: forskning som tas om og om igjen etter all forskning (B-150); priset etter verdi (B-237)
    masteryValue.ts Hva neste nivå i mesterskapet gir i kr per døgn (B-237)
    achievements.ts Prestasjoner, serier i trinn (B-232; gamle id-er beholdt)   cosmetics.ts  Pynt for fagpoeng (B-151)
    landmarks.ts Landemerker: store byggeprosjekter som forespørsler, ett per virkelig dag (B-174)
    changelog.ts Endringsloggen «Hva er nytt» (B-179) – ny oppføring ved hver endring
    clock.ts     Ekte tid (realNow/setRealClock): byggeprosjekter i konsernet og pausen mellom like kort (B-209, B-210)
    tabLock.ts   Bare én fane spiller om gangen (B-176)
    balance.ts   Automatisk testspiller
  net/         Konto og lagring på nett (B-125) – Supabase over fetch, uten bibliotek
    config.ts    URL og nøkkel fra miljøet (aldri i repoet)   supabase.ts  Innlogging, økt, spørringer   sync.ts  Lagring på nett
    leaderboard.ts Toppliste og kallenavn   season.ts  Sesong og hendelser (butikk)
    daily.ts     Daglig på serveren (status, henting)   features.ts  Hva som krever konto   update.ts  Automatisk oppdatering
    weekly.ts    Ukens utfordring: status, ukelista og ukekista (B-152)
    seasonTrack.ts Sesongstigen: poeng, trinn og henting (B-173)
    treasury.ts  Konsernkassa på serveren: status og overføring (B-183)
    world.ts     Strategiske selskaper: status, anbud og bud (B-189)
    scrapIncome.ts Skraplagerets inntekt i ekte tid – speiler SQL-en i 029 (B-188); scrapTests.ts viser at fart ikke hjelper
    guest.ts     Gjestekonto i bakgrunnen: lagrer spillet, overtas av kontoen ved innlogging (B-212)
    tests.ts     Tester uten nett (falsk tjeneste)
  ui/          Spillets skjermer (mobil først) og kontrollrommet
    Overview.tsx Verket med underfanene Oversikt, Anlegg, Resept, Økonomi (valget i verketTabs.ts/GameApp)
    ProductionCard.tsx «Produksjonen» på Anlegg: én rad per sted, trykk for utstyret (B-235)
    Konsern.tsx  Konsern-siden (B-226, B-227): Oversikt, Utvid, Industrien; openTender.ts gir «!» ved åpent anbud.
                 Salgsdirektørens kort ligger her, men vises under Folk → Ansatte (B-229)
    hints.ts     Rådene på Verket; gir også «!» på Marked og Folk i menyen (B-202)
    plantStatus.ts Status for ovnene (furnaceState/statusOf), brukt av Oversikt og utstyrsarkene (B-233)
    tabMemory.ts Felles navigasjon: hver hovedmeny husker underfanen (useReportTab, minnet i GameApp, B-233)
    Finance.tsx  Resultatgrafen og postene på Verket → Økonomi (B-203); navnene på postene i financeNames.ts
    Recipe.tsx  Resepten (Verket → Resept, B-199)
    Agreements.tsx Rammeavtaler under Salg   AutoToggle.tsx  Brytere for automatikk (låst til den er forsket fram)
    views.ts     Fanene og når de låses opp   Upgrades.tsx, stations.ts  Utstyr per sted i anlegget
    ResearchPage.tsx  Forskning-fanen   Settings.tsx  ⚙️ innstillinger og banken (på Verket → Økonomi)
    InstallTip.tsx    Tips om hjemskjerm på startskjermen   Power.tsx  Strøm og skiftplan
    Handbook.tsx Fagboka: innhold, kapitler som sider, quiz ett spørsmål om gangen (B-234)   Inbox.tsx  Varsellista (åpnes fra varsellinja)
    Account.tsx  Konto: logg inn, opprett, glemt passord, velg spill ved konflikt (på startskjermen og i ⚙️)
    Leaderboard.tsx Topplista (arket bak pokalen, B-214)   Place.tsx  Plassering med medaljeikon (B-237)   Season.tsx  Sesongspørsmål, hendelser på Marked, sesonglinje (uten nedtelling, B-220)
    Daily.tsx    Velkommen tilbake, daglig belønning og kortet «Dagens oppdrag» på Mål
    Achievements.tsx Prestasjonskortet på Mål og arket «Pynt verket» (🎨 på anleggsbildet)
    Weekly.tsx   Kortet «Ukens utfordring» på Mål og ukelista   Portal.tsx  Ark fra Verket legges i <body>
    SeasonTrack.tsx Kortet «Sesongstigen» på Mål (B-173)   Landmarks.tsx  Kortet «Landemerker» på Mål → I dag (B-218)
    Changelog.tsx «Hva er nytt» etter en oppdatering og under ⚙️ (B-179)
    TitleArt.tsx Tittelbildet på startskjermen; samme motiv som app-ikonet public/icon.svg (B-249)
    MissingOut.tsx «Det går du glipp av» på Mål for spillere uten konto (B-212)
    Goals.tsx    Mål-siden (egen knapp ved varsellinja på mobil, sidemenyen på PC): I dag, Uka, Merker (B-211, B-214)
    tokens.css   Designsystemet (B-191): alle farger, skriftstørrelser, radier, avstander – nye stiler bruker disse
    icons.tsx    Ikoner fra Lucide, kopiert inn (lisens i icons-LICENSE.txt)   ds.tsx  StatusBadge, Callout, Button
    fonts/       Visningsskriften for overskrifter og store tall (Barlow Semi Condensed 600, OFL)
    Companies.tsx Konsern → Industrien: ett kort per selskap (skraplageret nå) og konsernkassa (B-189, B-227)
    control/     Kontrollrommet: spillet i fire runder (chargeGame.ts: logikk og testspiller, ControlRoom.tsx, B-175)
  sim/         Prosessmodell for lysbueovnen (brukes ikke av spillet lenger, sjekkes av sim/validate.ts)
frontend/scripts/ sjekk-endringslogg.mjs: endringsloggen dekker nyeste beslutning; sjekk-emoji.mjs: ingen emoji (B-237)
frontend/public/  PWA: manifest, ikoner (icon.svg er kilden; PNG-ene lages fra den med Chromium, B-249), service worker
supabase/      SQL-migrasjonene, nummerert. Kjøres i prosjektet med Supabase-connectoren (apply_migration) og
               legges her samtidig, så repoet speiler databasen. Sjekk get_advisors (security) etter hver DDL-endring.
supabase/utkast/ Spørringer som bare leser (f.eks. dry-run av økonomireformen) – ikke migrasjoner
docs/          Minne: LOGG.md, BESLUTNINGER.md, DESIGN.md, RETNING.md (hovedretningen for sluttspillet, B-180), UI.md
               (designsystem, mobil + PC, plan for redesignet, B-187),
               PLAN-NETT.md (det som er bygget på nett), FORSLAG.md, KONTO.md (hva som krever konto)
```

## Testing i nettleseren

Playwright er installert globalt. Bruk Chromium fra `/opt/pw-browsers/chromium`
og `NODE_PATH=$(npm root -g)`. Test med `devices['iPhone 13']` og en
desktop-viewport. Et lagret spill kan legges inn med `addInitScript` under
nøkkelen `stalverk-spill-v1` i `localStorage`.

## Kjente fallgruver

- `pkill` returnerer 144 og avbryter resten av en `&&`-kjede – kjør det alene.
- Prettier har ingen config-fil i repoet: kjør `npx prettier --print-width 120 …`. Uten den brytes mange urørte linjer
  (og objekter som først er brutt, blir stående brutt), og diffen blir stor.
- Ikke bruk `git checkout <fil>` for å angre en liten endring: det fjerner også alle andre endringer i fila som
  ikke er committet (skjedde med den gamle kontrollromsfila). Angre med en målrettet redigering i stedet.
- «Ingen horisontal scrolling» er ikke nok i toppfeltet: sjekk også at knapper og tekst ikke avkortes
  (`scrollWidth > clientWidth`) eller havner utenfor skjermen, på 320 px bredde. Safari på iPhone har bredere
  skrift enn Chromium, så la det være litt luft (B-134).
- Bare `.g-main` scroller, ikke vinduet – på mobil (B-137) og nå også på PC (B-192). I Playwright: scroll med
  `document.querySelector(".g-main").scrollBy(...)`. Fingersveip (`synthesizeScrollGesture`) virker ikke uten skjerm.
- **To skall** (B-192): under 900 px mobil (meny nederst), fra 900 px PC (sidemeny, topplinje). Varsellinja står over
  menyen nederst på mobil og i topplinja på PC (B-201); `useIsPc` i `GameApp` velger plassen, så det er bare én. Konsern er egen hovedside
  i begge menyene (B-226); bare Mål er eget punkt på PC (`.g-nav-pc`). Underfanen i hver hovedmeny huskes i `GameApp` (B-233, `ui/tabMemory.ts`); et nytt trykk på aktiv meny går til første underfane.
- Ark (`.g-modal`) som åpnes fra innhold inne i `.g-main`, må pakkes i `<Portal>` (B-152). Ellers klipper Safari på
  iPhone arket til innholdet, og det kan ikke scrolles (skjedde med «Pynt verket»).
- **Ingen hopping** (B-238): tekst som endrer seg mens spillet går (status, tall, råd, merker), skal ikke endre høyden
  på det som står over annet innhold. Bruk faste rader (`nowrap` + «…»), reserver plass (stolper, rådsraden) og legg
  merker oppå hjørnet. Test ved å måle posisjonen til kortene i 8 s med spillet i gang, på 320 og 390 px.
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
- Playwright-tester av kontoen trenger `frontend/.env.local` med en URL (verdien spiller ingen rolle, `page.route`
  fanger kallene) – uten den vises ikke kontokortet. Fjern fila før commit-sjekken; den er ignorert av git uansett.
- Sandkassen når ikke supabase.co direkte, men **Supabase-connectoren** (MCP) gir SQL, migrasjoner, tabeller, råd,
  logger og nøkler for prosjektet `qzdwiamiangrjpmglpwy`. Den kan ikke endre Auth-innstillinger (Site URL) eller lage
  nøkler – det gjør brukeren i dashbordet. Nettlaget testes med en falsk tjeneste (`src/net/tests.ts`) og `page.route`
  i Playwright. Ekte innlogging må brukeren teste selv.
- Nytt spill+ finnes ikke lenger (B-141): sesongene har tatt over. `round` står i spilltilstanden bare for eldre
  lagringer – ikke bygg ny mekanikk på det.
- `fetch` med `keepalive` avvises over 64 kB, og et stort spill er større. `rest()` i `net/supabase.ts` dropper
  keepalive over `KEEPALIVE_MAX` (B-141) – ikke send store kropper med keepalive andre steder.
- Lagring på nett skjer ca. 3 s etter en handling (`saveGame(g, true)` → `SOON_MS`), hvert 15. sekund ellers, og ved
  `blur`/`pagehide`. Appen sjekker hvert 20. sekund om en annen enhet har lagret (B-141). I Playwright: vent minst
  3 s etter en handling før du ser etter opplastingen.
- Bare enheten som spilles på, laster opp (B-143): `onLocalSave` laster ikke opp når spillminuttet er det samme som
  sist og ingen handling er gjort. Tester som kaller `onLocalSave` må derfor endre `g.minute` (eller bruke `soon`).
- Lagring på nett går gjennom `save_game()` med versjonsnummer (B-140), ikke rett i tabellen `saves`. En falsk
  server i Playwright må svare på `rpc/save_game` og gi `rev` og `device` på `saves?select=…`. To nettlesere
  simuleres med to `browser.newContext()` mot samme falske tilstand. «Appen vises igjen» utløses med
  `document.dispatchEvent(new Event("visibilitychange"))`, «legges bort» med `pagehide`.
- Belønninger i «døgns drift» (B-149) må stemme mellom `game/daily.ts` og `supabase/013_daglig.sql` (`streak_days`,
  bonus i `claim_daily_missions`/`claim_away`), ellers kan juksesperren flagge den som henter dem. Endres
  belønningene: kjør `balance.ts --daglig 15` og `--opphold --daglig 15`.
- Appen oppdaterer seg selv (B-148): `version.json` fra bygget mot `__BUILD_ID__`. Den virker bare i det bygde
  spillet (`vite preview`), ikke i `npm run dev`. Kontokortet på startskjermen må alltid være montert (skjult), for
  det kobler spillet til kontoen når siden lastes.
- Spillet lagrer aldri passordet (B-146). «Husk meg» husker e-posten og holder økta i localStorage; uten den ligger
  økta i sessionStorage. Passord huskes av mobilens passordlager via `autocomplete`.
- Utlogging skal være `scope=local` (B-145): standarden i Supabase logger ut alle enheter. En avvist økt gir
  beskjeden «Du er logget ut» (`loggedOutByServer`); 408/429 er ikke en død økt.
- **Rulle tilbake et spill** (B-169): sikkerhetskopiene ligger i `save_backups` (daglig og før en «lavere dag», 14 dager).
  Finn kopien med `select id, taken_at, reason, day from save_backups where user_id = (select id from profiles where
  nickname = '…') order by taken_at desc;` og kjør `select restore_save(<id>);`. Appen henter spillet selv.
- Grensene i juksesperren (`check_snapshot`) må sjekkes mot det største utstyret **med alt utstyr og flinke folk**,
  ikke mot grunntallene. Tonnsperren på 30 000 t flagget en ærlig spiller med 420-tonnere (B-158).
- Kjøp av datterverk og modernisering kan øke konsernverdien mer enn de koster (verdien er 60 døgns overskudd). Både
  vekst- og tonnsperren flagger derfor bare hvis også tallet fra minst tre døgn tilbake er for høyt (B-162, B-194).
  Test endringer i sperren mot ekte tall i en DO-blokk som ender med `raise exception`.
- Alle kall til tjenesten har en tidsgrense på 30 s (`call` i `net/supabase.ts`, B-165). Uten den kunne ett kall som hang
  på mobilnettet stoppe lagringen på nett i over 20 minutter. Tester kan korte den ned med `setRequestTimeout`.
- Tall til tidslinja (`snapshots`) leses i **samme øyeblikk** som dagen, før første `await` i `uploadSave` (B-162).
  Spillet går videre mens lagringen venter på svar; ble tallene lest etterpå, fikk én dag flere døgns tonn, og en
  ærlig spiller ble flagget.
- **Byggetid i ekte tid i konsernet** (B-209): prosjektene bruker `realNow()` i `game/konsern.ts`. Tester og
  testspilleren setter klokka med `setRealClock` (testene: `finishProjects(g)`, testspilleren: `simClock(g)` = 3×). Kjøp
  i konsernet virker derfor ikke med én gang – ikke skriv tester som venter det.
- **Ingen emoji** (B-237): bruk ikoner fra `ui/icons.tsx`. `npm test` og CI stopper emoji i `src`, `public` og `index.html`
  (`scripts/sjekk-emoji.mjs`). Tekst fra serveren med tegn (plasseringen på topplista) gjøres om til ikon i appen.
- **Ikoner i spillmotoren** (B-235): utfordringer og prestasjoner har `icon: IconName` (type-import fra `ui/icons.tsx`), og
  grensesnittet tegner dem med `<Icon>`. Ikke skriv `icon` inn i tekst (logg, varsler) – det er et navn, ikke en emoji.
  Nye Lucide-ikoner: kopier fra `lucide-static` og ta med alle attributter (også `x1`, `y2` …).
- Nye tester i `game/tests.ts` skal stå **over** oppsummeringen nederst (`if (failed) … process.exitCode = 1`). Tester
  etter den skriver «FEIL», men `npm test` gir likevel exit 0 (skjedde med B-207, rettet i B-208).
- Se på **exit-koden** til `balance.ts`, ikke bare median-linjene: sjekken av kontrollrommet står helt nederst
  og kan være «AVVIK» selv om nivådagene er OK (publiseringen av #39 feilet slik).
- **Bare én fane spiller** (B-176): åpnes spillet i en ny fane, lagrer den gamle og står stille. To sider i samme
  `browser.newContext()` i Playwright deler localStorage og stopper hverandre – bruk egne kontekster for to nettlesere.
- **Fartskontrollen** (B-176) i `check_snapshot` regner med 120 spillminutter per sekund (10×) og 720 når verket står om
  natta (`g.boostMin`, telles i `useGame`). Kommer en ny fart eller en ny måte tida hopper på, må sjekken følge med,
  ellers flagges ærlige spillere.
- **Konsernøkonomien** (B-181): datterverkene har driftsresultat (`sisterProfit`, også verdien), men morselskapet får
  utbytte (`dividends`, i rekke etter resultat) minus konsernkostnader (`konsernCosts`, egen kostnadspost «konsern»).
  Kjøp og råd regnes på netto (`konsernNetFor`), som også trekker imperiebelastningen (B-251, `afterEmpireLoad`: over
  `loadFrom` vokser netto med `loadPower`). Endres tallene i `KONSERN_ECONOMY`: kjør `balance.ts --konsern`.
- **Sesonger uten sluttdato** (B-221): `seasons.ends_at` er tom mens sesongen pågår; den avsluttes med `end_season()` og en
  ny startes med `start_season(navn, vri)` – bare manuelt. SQL som leser `ends_at`, må tåle null. `season_status()` må tåle
  at ingen sesong pågår (den krasjet på en tom post før B-182).
- **Konsernkassa** (B-183): `treasuryOut` i spillet går aldri ned – en trigger på `saves` trekker kassa hvis et spill med
  lavere tall lagres. Overføringen gjøres av serveren (`deposit_to_treasury`), og appen bygger videre på versjonen den
  gir (`adoptServerRev`). Test SQL mot ekte tabeller bare i én DO-blokk som ender med `raise exception` (rulles tilbake).
- **Skraplagerets inntekt** (B-188) regnes på serveren (`029_produksjonsmaler.sql`) og speiles i `net/scrapIncome.ts`.
  Endres regelen, må begge endres, og `npm test` (scrapTests.ts) og SQL-scenariene i B-188 kjøres på nytt. Farten måles
  med spillminuttene (`game_min`), aldri med hele spilldager (det ga 10× opptil 37 % for mye).
- **Bunden konsernreserve** (B-193, midlertidig): kassa over `CASH_RESERVE.softCap` flyttes til `g.lockedReserve` i
  hvert tidssteg og etter hver handling. Reserven er med i `konsernEquity`, men ikke i `cash` – så den kan ikke brukes,
  ikke flyttes til konsernkassa og teller ikke som penger på bok. Skal migreres når sluttspillet er rebalansert.
- **Markedet metter seg** (B-252): prisen på nye kontrakter og avtaler ganges med `marketSaturation(stats.dailyProductT)`
  (full pris til 10 000 t i døgnet, halv pris over). Nye prisveier for kontrakter må ta den med.
- **Døgnproduksjon og valseverket** (B-217): `stats.dailyProductT` er alt verket lager (emner og armering). Armering er
  begrenset av valseverket (`stats.rolledDailyT`); bruk `productCapT(stats, vare)` når noe gjelder én vare.
- **Lagerplanen** (B-228): `planLots` i `engine.ts` fordeler partiene på kontraktene i køens rekkefølge (også emner som
  skal valses til armering). Leveranser, valseverket og `ordersToMake` bygger på den – ikke lag egne reservasjoner.
  Test endringer i produksjonen på et ekte, stort spill med flere frø (sene kontrakter og levert tonn), ikke bare balance.
- **Køsjekken** (B-240): salgsdirektøren og Salg bruker både den gamle sjekken (hele køen mot den nye fristen) og
  `queueFit` (ingen jobb i køen blir for sen når den nye går foran). `queueFit` alene slipper inn mer – ikke bruk den i
  stedet for den gamle. Valseverket får emner til `ROLLING_BUFFER_H` timer først (`planLots`), og ovnene fordeles etter
  hva som haster (`headFurnaces`). Mål endringer i produksjonen med flere frø på et fullt storverk, ikke én kjøring.
- **Skrapvarsel** (B-219): varsler i grensesnittet bruker `scrapAlert` (neste charge står fast), ikke `scrapShort` (en
  type i resepten er under én charge – ovnen fyller da opp med annet). Ellers varsles det om returskrap som ikke kan kjøpes.
- **Flere selskaper** (B-253): tonn, gebyr og anslag regnes per type (`company_counted_t`, `company_fee`, `company_estimate`
  i 042). Et selskap med `companies.active = false` får ikke anbud, inntekt eller plass i `world_status`. Varsler om avgjorte
  anbud gis med `applyTenderResults` (i rekkefølge etter anbudet), ikke ett og ett selskap.
- **Anbud og inntekt** (B-189) avgjøres «lat» av `world_status()` → `world_tick()`. Test livsløpet med midlertidige
  testkontoer i en DO-blokk som ender med `raise exception`; sett `closes_at` bakover for å avgjøre et anbud.
- **Serveren endrer et lagret spill** (B-211): øk alltid `state.serverEdit` (og sett `device` til `'server'`). `save_game()`
  avviser da kopier med lavere `serverEdit`, og appen henter serverens spill. Uten det kan en enhet med det gamle spillet
  laste det opp igjen (skjedde med økonomireformen).
- **Gjester** (B-212) er anonyme kontoer, men appen ser dem som «uten konto» (`getSession()` er null; gjestens økt ligger i
  `net/guest.ts`). Serveren slipper gjester bare til det som står i `guest_gate` (035). Skal gjester få noe nytt, må det
  legges i lista der – ellers får de 403. `pgrst.db_pre_request` står på rollen `authenticator`; sjekk med
  `select rolconfig from pg_roles where rolname = 'authenticator'`.
