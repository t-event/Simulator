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
  disse systemene. Konsernkassa har samme regel for alle (B-304). Konkurranser mellom spillere måles i ekte tid (f.eks. ekte aktive
  dager), ikke i spilldøgn. Tidslinjetall merket `pre_reform` brukes aldri i serverberegninger.
- **Spilltid og ekte tid (B-323, fast regel):** Spilltid gir kunnskap, optimalisering og lokal progresjon. Ekte tid styrer
  akkumulering av kapital og makt som påvirker andre spillere. Alt nytt vurderes mot dette: det som hjelper eget verk,
  kan gå i spillfarten; det som samler penger eller makt mot andre (konsernkassa, eierskap, topplista), regnes av serveren
  i ekte tid (som bidraget, B-318, og utbyttet, B-304).
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
npx tsx src/game/balance.ts --storovn 330 --storovn-dump f.json   # … og lagre utgangspunktet; --storovn-base f.json bruker det igjen (B-305)
npx tsx src/game/balance.ts --vurdering                    # kundevurderingene 1–10 per nivå, flink og nybegynner (B-161)
npx tsx src/game/balance.ts --konsern                      # utbyttet per ekte dag med 1–14 verk (B-304)
npx tsx src/game/balance.ts --forste 700                   # kurven for første opplasting i juksesperren (B-257, ca. 40 min)
npx tsx src/game/balance.ts --vinter                       # uhell, kort og kostnader om vinteren mot sommeren, per nivå (B-277, ca. 11 min)
npx tsx src/game/balance.ts --sommerstans                  # testspilleren velger sommerstans i fellesferien (B-298)
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
    konsernWorld.ts Konsernet på serveren speilet: priser, køen, nivåstigen, settleWorld (B-325, B-326; SQL i 064)
    regions.ts   Verdenskartets seks regioner og standardregionen for nye verk (B-333; SQL i 066)
    building.ts  Byggetid og innkjøring for store kjøp, og nabolaget på storverket (B-336); kortet i ui/Neighborhood.tsx
    control.ts   Utbyttepolitikken, forsvarsfondet og Kontroll: tall og ord appen viser (B-334; SQL i 067)
    world.ts     Felles hendelser i motoren og sesongfordel (B-129)
    environment.ts Utslipp, renseanlegg i trinn, havari og bøter (B-263); panelet står i ui/Upgrades.tsx (CleanerPanel)
    calendar.ts  Året i spillet (360 døgn, dag 1 = 1. april), vinter 15.11.–14.3. og frost (B-265, B-272), fellesferie (B-298);
                 `calendarAhead` til kalenderkortet på Oversikt (ui/CalendarCard.tsx, B-321)
    war.ts       Krig i verden, bare i konsernet: dyrere strøm, flere forespørsler, høyst én per år (B-297)
    accidents.ts Eksplosjoner i ovnen og svært sjeldne dødsulykker (B-265)
    trends.ts    Trender i markedet: én kvalitet eller vare ettertraktet eller lite etterspurt i noen døgn (B-255); vises av ui/Trend.tsx
    reserve.ts   Taket for kassa (10 mrd., B-306) og utbetalingen til eierne (B-303) – taket står her
    daily.ts     Daglig belønning, dagens oppdrag og mens du var borte (B-149)
    mastery.ts   Mesterskap: forskning som tas om og om igjen etter all forskning (B-150); priset etter verdi (B-237)
    masteryValue.ts Hva neste nivå i mesterskapet gir i kr per døgn (B-237)
    achievements.ts Prestasjoner, serier i trinn (B-232; gamle id-er beholdt)   cosmetics.ts  Pynt for fagpoeng (B-151), sesongpynt (B-287)
    landmarks.ts Landemerker: store byggeprosjekter som forespørsler, ett per virkelig dag (B-174)
    changelog.ts Endringsloggen «Hva er nytt» (B-179) – ny oppføring ved hver endring
    clock.ts     Ekte tid (realNow/setRealClock): byggeprosjekter i konsernet og pausen mellom like kort (B-209, B-210)
    tabLock.ts   Bare én fane spiller om gangen (B-176)
    balance.ts   Automatisk testspiller
  net/         Konto og lagring på nett (B-125) – Supabase over fetch, uten bibliotek
    config.ts    URL og nøkkel fra miljøet (aldri i repoet)   supabase.ts  Innlogging, økt, spørringer   sync.ts  Lagring på nett
    leaderboard.ts Toppliste og kallenavn (også kontrollrommet, B-295)   season.ts  Sesong og hendelser (butikk)
    badges.ts    Merker bare serveren vet om (B-296); hentes av ui/BadgeSync.tsx og gis som skjulte prestasjoner
    daily.ts     Daglig på serveren (status, henting)   features.ts  Hva som krever konto   update.ts  Automatisk oppdatering
    weekly.ts    Ukens utfordring: status, ukelista og ukekista (B-152)
    seasonTrack.ts Sesongstigen: poeng, trinn og henting (B-173)
    treasury.ts  Konsernkassa på serveren: status (overføringen er slått av, B-319)
    chat.ts      Skiftrapporten: felles chat – sende, hente, slette, sist lest (B-338; SQL i 070)
    konsern.ts   Konsernet på serveren: kjøp, avbestilling, salg og flytting, og svaret lagt inn i spillet (B-326, B-333)
    worldMap.ts  Verdenskartet: alle spilleres verk per region og selskapene (`world_map`, B-333)
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
    HelpNow.tsx  «Hva gjør jeg nå?»: råd, status per sted og ordliste (B-283), åpnes fra ? ved Mål (i tallraden under 380 px)
    TitleArt.tsx Tittelbildet på startskjermen; samme motiv som app-ikonet public/icon.svg (B-249)
    MissingOut.tsx «Det går du glipp av» på Mål for spillere uten konto (B-212)
    Goals.tsx    Mål: ark fra knappen ved varsellinja på mobil (B-286), side i sidemenyen på PC: I dag, Uka, Merker (B-211, B-214)
    tokens.css   Designsystemet (B-191): alle farger, skriftstørrelser, radier, avstander – nye stiler bruker disse
    icons.tsx    Ikoner fra Lucide, kopiert inn (lisens i icons-LICENSE.txt)   ds.tsx  StatusBadge, Callout, Button
    fonts/       Visningsskriften for overskrifter og store tall (Barlow Semi Condensed 600, OFL)
    WorldMap.tsx Konsern → Kart: verdenskartet med regionene, andres verk og selskapene (B-333)
    Chat.tsx     Skiftrapporten: knappen ved varsellinja (under 380 px i tallraden) og arket (B-338)
    Companies.tsx Konsern → Industrien: ett kort per selskap (skraplageret nå) og konsernkassa (B-189, B-227)
    control/     Kontrollrommet: spillet i fire runder (chargeGame.ts: logikk og testspiller, ControlRoom.tsx, B-175)
  sim/         Prosessmodell for lysbueovnen (brukes ikke av spillet lenger, sjekkes av sim/validate.ts)
frontend/scripts/ sjekk-endringslogg.mjs: endringsloggen dekker nyeste beslutning; sjekk-emoji.mjs: ingen emoji (B-237)
frontend/public/  PWA: manifest, ikoner (icon.svg er kilden; PNG-ene lages fra den med Chromium, B-249), service worker
supabase/      SQL-migrasjonene, nummerert. Kjøres i prosjektet med Supabase-connectoren (apply_migration) og
               legges her samtidig, så repoet speiler databasen. Sjekk get_advisors (security) etter hver DDL-endring.
supabase/utkast/ Spørringer som bare leser (f.eks. dry-run av økonomireformen) – ikke migrasjoner
docs/          Minne: LOGG.md, BESLUTNINGER.md, DESIGN.md, RETNING.md (hovedretningen for sluttspillet, B-180), UI.md,
               OKONOMI.md (økonomianalysen og reform 2, B-301), KONSERNBIDRAG.md (hovedverkets bidrag i ekte tid, B-313),
               OKONOMI-KONTROLL.md (kontrollen av modellen med tall og svakheter, B-324),
               KONSERN-FORSLAG.md (nivåer, priser fra konsernkassa og aktivitetskrav, bygget B-325–B-328, og simuleringen B-329),
               KONTROLL-FORSLAG.md (verdenskart, utbyttepolitikk, Kontroll, overtakelser og pengene hjemme, B-331, godkjent B-332),
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
- **Veiledningsboksen** (B-260) ligger fast nederst og kan dekke knapper på små mobiler. Et nytt steg som ber spilleren
  trykke på noe, skal ha knappen i `COACH_TARGET` (`ui/GameApp.tsx`), og testes på 320 × 568 med `elementFromPoint`.
- **Ingen hopping** (B-238): tekst som endrer seg mens spillet går (status, tall, råd, merker), skal ikke endre høyden
  på det som står over annet innhold. Bruk faste rader (`nowrap` + «…»), reserver plass (stolper, rådsraden) og legg
  merker oppå hjørnet. Test ved å måle posisjonen til kortene i 8 s med spillet i gang, på 320 og 390 px.
- **Sidehøyden på iPhone** (B-262, B-269): `#root { min-height: 100vh }` og faste lag med `inset: 0` må stå. Uten
  den sluttet spillet over bunnen på iPhone-hjemskjermen (B-264, B-267), og med skjermhøyden satt direkte forsvant
  navnene i menyen (B-268). Siden kan scrolles litt, så `main.tsx` setter vinduet straks tilbake til toppen – ellers
  treffer trykk over knappene. Chromium viser ingen av feilene; spør brukeren om å sjekke på telefonen.
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
- Playwright-tester av kontoen trenger `frontend/.env.local` med **både** `VITE_SUPABASE_URL` og `VITE_SUPABASE_KEY`
  (verdiene spiller ingen rolle, `page.route` fanger kallene) – uten begge er `cloudConfigured()` usann, kontokortet
  vises ikke og spillet blir aldri avklart mot kontoen (Industrien står tom, B-304). Fjern fila før commit-sjekken;
  den er ignorert av git uansett.
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
- **Første opplasting** (B-257): `check_snapshot` sjekker det første tallet en spiller noen gang laster opp mot
  `config.first_upload` (fra `balance.ts --forste 700` og ærlige spilleres tall). Endres økonomien mye, lag kurven på nytt.
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
  i konsernet virker derfor ikke med én gang – ikke skriv tester som venter det. `applyWorld` lager nye objekter for
  verkene: hent verket på nytt med id (`plantById` i testene) etter et kjøp eller `finishProjects`.
- **Serverens klokke** (B-314): `realNow()` er servertid – `net/clock.ts` leser Date-headeren i hvert svar (`call` i
  `net/supabase.ts`). Telefonens klokke kan stilles fram, så `save_game()` setter prosjekter tilbake med
  `guard_projects` (057/059/060; ren funksjon, test med `select`) og logger i `project_guard_log`. Den godtar det som kan
  ha skjedd siden forrige lagring på serveren (spilling uten nett, B-315), men aldri at et kjent prosjekt blir ferdig
  før `readyAt`. Et verk som står slik det var, rettes aldri – appen fullfører ferdige prosjekter først i neste
  tidssteg (B-317). Se i loggen etter endringer i regelen. Ny mekanikk i ekte tid
  (frister, pauser, prosjekter) skal bruke `realNow()` og sjekkes på serveren på samme måte – aldri `Date.now()`.
  `save_game` er `security definer`; en serverfunksjon som kaller noe som er tatt fra `authenticated`, må være det,
  ellers stopper lagringen for alle (skjedde i ti minutter med B-314). Test nye serverfunksjoner som spilleren:
  `set_config('request.jwt.claims', …)` + `set_config('role','authenticated', true)` i en DO-blokk som rulles tilbake.
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
- **Konsernbidraget** (B-318): hovedverkets bidrag til konsernkassa regnes bare på serveren (`pay_contributions` i 061,
  fra `world_tick`), av `meter_normal_rate` og marginen i `state.history` – ikke speilet i appen. Nye inntekts- eller
  kostnadsposter i døgnregnskapet må vurderes i `contribution_margin` (drift eller ikke). Tallene i
  `config.world.contribution`. Lista «Konsernverdi» (`leaderboard('konsern')`, 063, B-320) regnes av `konsern_value` når
  den vises – kassa i spillet er ikke med; den gamle «verdi» (snapshots.equity) står for ligaer og titler.
- **Salg av datterverk** (B-307): `sisterSalePrice` (60 % av byggekostnaden), aldri `sisterValue` (60 døgns overskudd med
  bonuser) – verdien er større enn prisen, så salg til verdi ga uendelig penger. Nye måter å kvitte seg med et verk på,
  bruker salgssummen.
- **Utbytte i ekte tid** (B-304, B-311): datterverkene betaler ingenting i spilltid. Serveren regner utbyttet av det lagrede
  spillet én gang per ekte dag (`dividend_from_state` i 051, `pay_dividends` fra `world_tick`) rett inn i konsernkassa.
  `game/dividend.ts` speiler SQL-en (`DIVIDEND` = `config.world.dividend`; grunntallene er en tidel av `profitPerDay`,
  fullt konsern ca. 30 mill. per ekte dag): endres regelen, endres begge, og de faste tallene i testen kjøres mot
  SQL-en (`select dividend_from_state('{…}')`). Verden går i menneskelig tempo (B-311): gebyr 50 kr/t, innskuddet er
  erstattet av bidraget (B-318, B-319) – alt som teller mellom spillere, skal skaleres sammen, ikke ett tall alene.
- **Konsernet er serverens** (B-325, B-326): verkene, køen og nivået (titlene) ligger i tabellene `konsern` og
  `konsern_orders` (064/065). Kjøp går via `konsern_order`/`konsern_cancel`/`konsern_sell` fra konsernkassa; `save_game`
  skriver serverens verk inn i det lagrede spillet hver gang (`konsern_into_state`), så en endring i `g.konsern.plants` i
  appen blir borte ved neste lagring. Regelen er speilet i `game/konsernWorld.ts` (priser, kø, stigen, `settleWorld`) –
  endres den, endres begge. Appen legger serverens svar inn med `applyKonsern` (`net/konsern.ts`); testene og
  testspilleren bruker `localOrder`/`localSell`/`localCancel` mot `g.konsern.treasury`. Ett prosjekt bygges om gangen,
  inntil 3 i køen (B-311 gjelder fortsatt). Verkene i spillet har fortsatt `sisterProfit` (verdien); råd regnes på
  `konsernNetFor` (per ekte dag). Nye ting som låser opp etter nivå, bruker `g.konsern.legends` (fra serveren), aldri
  verdien. Endres tallene: kjør `balance.ts --konsern` og verdenssimuleringen (KONSERN-FORSLAG.md).
- **Regionene** (B-333): verkene har `region` (og `moved` etter én flytt), bestillinger av nye verk har `region`.
  Regionlista står i `konsern_regions()` og `game/regions.ts` – endres den, endres begge (og kartformene i
  `ui/WorldMap.tsx`). `konsern_order` har fått `p_region`; endres signaturen igjen, `drop function` den gamle først.
- **Utbyttepolitikk og Kontroll** (B-334, 067): `pay_dividends` betaler `dividend_to_treasury(fullt, policy_keep)` til
  kassa og resten til `konsern.fund`; `dividendToTreasury` i `dividend.ts` speiler den (faste tall i testen).
  `world_status.dividend.per_day` er etter politikken, `full_per_day` før – konsernverdien bruker det fulle. Kontrollen
  regnes av `company_control` hver gang (ikke lagret); investeringer står i `companies.invested` og følger selskapet.
  Tallene i `config.world.control` og `config.world.policy`. Fondet skal aldri kunne brukes til nye verk eller angrep.
- **Overtakelser** (B-335, 068): `takeovers`, avgjort «lat» av `resolve_takeovers` i `world_tick`. Formlene står i
  `takeover_attack_of`/`takeover_defense_of` og speiles i `game/control.ts` (faste tall i testen). Eieren skal alltid
  kunne miste selskapet (B-337): budet teller inntil 10 × V, forsvaret høyst 3 × V – endres vektene eller Kontrollens
  maks, må det sterkeste forsvaret fortsatt kunne slås (testen «alltid mulig»). Ingen fordel i fornyelsesanbudet. Bryteren
  `config.world.takeover.enabled` – på fra 29.9.2026 (B-339). Test med bryteren på i en DO-blokk som rulles tilbake (flytt
  `company_owners.from_at` bakover for vernet, `closes_at` bakover for utfallet). Et nytt selskapsbytte må ende eierens
  rad i `company_owners` (`until_at = now()`), ellers regner `pay_company_income` feil eier.
- **Byggetid hjemme** (B-336): kjøp fra 50 mill. (ikke flytting) installeres ikke i `buyUpgrade`, men i `finishBigBuild`
  når `g.bigBuild.readyMin` er nådd (fra `hourlyActions`). Tester og kode som kjøper stort utstyr og venter det med én
  gang, må sette `g.minute = g.bigBuild.readyMin` og kalle `finishBigBuild`. Ny effekt av utstyr legges i
  `installUpgrade`, ikke i `buyUpgrade`. Innkjøringen (`rampFactor`) ganges inn i syklustiden og støpefarten i `plant.ts`.
- **Aktivitetskravet** (B-327): `activity_factor(uid, dag)` (064) ganges inn i utbyttet og i gulvet i bidraget. Ny inntekt
  i ekte tid som ikke skal gå til forlatte kontoer, bruker den. Tallene i `config.world.activity`.
- **Mesterskapet «Konsernledelse»** (B-328) gir lavere administrasjon hjemme (`masteryFactor(g, "datterverk")` i posten
  «faste»), ikke utbytte. Fagpoeng (spilltid) skal ikke gi makt i ekte tid (B-323).
- **Sesonger uten sluttdato** (B-221): `seasons.ends_at` er tom mens sesongen pågår; den avsluttes med `end_season()` og en
  ny startes med `start_season(navn, vri)` – bare manuelt. SQL som leser `ends_at`, må tåle null. `season_status()` må tåle
  at ingen sesong pågår (den krasjet på en tom post før B-182).
- **Konsernkassa** (B-183): `treasuryOut` i spillet går aldri ned – en trigger på `saves` trekker kassa hvis et spill med
  lavere tall lagres. Overføringen gjøres av serveren (`deposit_to_treasury`), og appen bygger videre på versjonen den
  gir (`adoptServerRev`). Test SQL mot ekte tabeller bare i én DO-blokk som ender med `raise exception` (rulles tilbake).
  Innskuddet er slått av (B-319: `treasury_base_per_day` = 0, appen skjuler det ved grense 0); koden står for eldre lagringer.
- **Skraplagerets inntekt** (B-188) regnes på serveren (`029_produksjonsmaler.sql`; `meter_register` står nå i 043) og speiles i `net/scrapIncome.ts`.
  Endres regelen, må begge endres, og `npm test` (scrapTests.ts) og SQL-scenariene i B-188 kjøres på nytt. Farten måles
  med spillminuttene (`game_min`), aldri med hele spilldager (det ga 10× opptil 37 % for mye).
- **Taket for kassa** (B-303, reform 2; 10 mrd. fra B-306): kassa over `CASH_RESERVE.softCap` betales ut til eierne (`g.paidOut`)
  i hvert tidssteg og etter hver handling. Det teller ikke i `konsernEquity`, kan ikke brukes og er ikke sikkerhet mot
  konkurs. Den gamle reserven (`lockedReserve`, B-193) står urørt i lagringene og regnes som utbetalt (`paidOutTotal`)
  – ikke migrer den, og ikke legg den inn i konsernverdien igjen. Lista «Utbetalt til eierne» leses av `note_paid_out`
  på `saves` (050). Reform 2 som helhet: `docs/OKONOMI.md` og B-302. Skal taket endres igjen: publiser appen først,
  så serverendringen (052 som mal), ellers fyller eldre apper kassa opp igjen. Sesonglista bruker det siste
  tidslinjetallet per spiller – etter en serverendring av kassa må den få ferske tall (053 som mal), ellers står de
  som ikke har logget inn, med gamle verdier.
- **Utslipp** (B-263): røyken regnes i hvert tidssteg (`updateEmissions`) mot renseanlegget; boten kommer i `onDay`.
  Nye, større ovner må ha et renseanlegg som holder (`CLEANERS` i `environment.ts`), ellers får testspilleren bot.
  Gamle lagringer får anleggene de trenger i første tidssteg (`env.grant`) – ikke flytt det til `onHour`.
- **Vinter** (B-265): `riskFactor(g)` (1,5 om vinteren) ganges inn i havarier, renseanlegget og hendelseskortene. Ny
  risiko som skal øke om vinteren, bruker den – ikke egne datoer. Kalenderen er spilltid, ikke ekte dato.
- **Fellesferien** (B-298): 7.–27. juli (dag 97, 457 …). Ved sommerstans står ovnene, lønn, forespørsler og ukeleveranser
  stopper (`summerStop`), og frister flyttes tre uker (også for forespørsler som venter, B-321). Salgsdirektøren står i
  stansen, og Salg trekker fra døgnene som er igjen (`summerStopDaysLeft`). Nye kostnader eller leveranser som ikke gir mening i stansen, må
  sjekke `summerStop`. Testspilleren velger vikarer; `balance.ts --sommerstans` prøver stansen.
- **Vinterøkonomi** (B-279): strømmen ganges med `winterPowerFactor` (spot og nattariff) og fastprisen med
  `WINTER_FIXED`. Snøstorm (`g.snowUntilMin`) stopper alle kjøp av skrap (`scrapBlocked`) unntatt med skrapterminal – nye
  veier for å skaffe skrap må sjekke den.
- **Markedet metter seg** (B-252, B-305, B-308): prisen på nye kontrakter og avtaler ganges med `marketSaturation(stats.dailyProductT)`
  (full pris til 3 000 t i døgnet, 50 % til 20 000 t, 45 % over; B-310). Nye prisveier for kontrakter må ta den med.
  Toppen skal ligge på ca. 35–40 mill. per døgn i snitt; sjekk toppspillernes `history` i `saves` etter endringer, og
  regn snitt over flere døgn – skrapkjøp og leveranser er klumpete (±120 mill. fra døgn til døgn).
- **Toppen av hjemmeverket** (B-305): salgsbonusene stopper på `PRICE_BONUS_MAX` (+25 %), stormodellene har dyrt forbruk
  per tonn, og storverket betaler administrasjon 500 kr per tonn døgnkapasitet over 5 000 t (`adminPerDay`, i posten «faste»).
  Nye salgsbonuser må legges inn i summen i `computePlantStats` (ikke utenfor taket), og ny inntekt på toppen skal
  måles med `balance.ts --storovn 330` – alt før storverket skal stå urørt.
- **Døgnproduksjon og valseverket** (B-217): `stats.dailyProductT` er alt verket lager (emner og armering). Armering er
  begrenset av valseverket (`stats.rolledDailyT`); bruk `productCapT(stats, vare)` når noe gjelder én vare.
- **Lagerplanen** (B-228): `planLots` i `engine.ts` fordeler partiene på kontraktene i køens rekkefølge (også emner som
  skal valses til armering). Leveranser, valseverket og `ordersToMake` bygger på den – ikke lag egne reservasjoner.
  Test endringer i produksjonen på et ekte, stort spill med flere frø (sene kontrakter og levert tonn), ikke bare balance.
- **Køsjekken** (B-240): salgsdirektøren og Salg bruker både den gamle sjekken (hele køen mot den nye fristen) og
  `queueFit` (ingen jobb i køen blir for sen når den nye går foran). `queueFit` alene slipper inn mer – ikke bruk den i
  stedet for den gamle. Valseverket får emner til `ROLLING_BUFFER_H` timer først (`planLots`), og ovnene fordeles etter
  hva som haster (`headFurnaces`). Mål endringer i produksjonen med flere frø på et fullt storverk, ikke én kjøring.
- **Sekvenser i strengstøpingen** (B-046, B-273): `pickNextLadle` venter bare når samme kvalitet kommer innen
  `SEQUENCE_SOON_MIN` og køen har plass. Endres regelen, mål produksjon og ventetid på et fullt storverk med flere frø.
- **Skrapvarsel** (B-219): varsler i grensesnittet bruker `scrapAlert` (neste charge står fast), ikke `scrapShort` (en
  type i resepten er under én charge – ovnen fyller da opp med annet). Ellers varsles det om returskrap som ikke kan kjøpes.
- **Flere selskaper** (B-253, B-256): tonn, gebyr og anslag regnes per type (`company_counted_t`, `company_fee`,
  `company_estimate` i 042/043). Verkstedet teller kroner vedlikehold (`snapshots.maint_kr` → `production_days.gained_maint`),
  ikke tonn, og `company_fee` er da en andel. Et selskap med `companies.active = false` får ikke anbud, inntekt eller plass i `world_status`. Varsler om avgjorte
  anbud gis med `applyTenderResults` (i rekkefølge etter anbudet), ikke ett og ett selskap.
- **Anbud og inntekt** (B-189) avgjøres «lat» av `world_status()` → `world_tick()`. Test livsløpet med midlertidige
  testkontoer i en DO-blokk som ender med `raise exception`; sett `closes_at` bakover for å avgjøre et anbud.
- **Sesongpynt** (B-287): pynt med `season: N` kan bare skaffes i sesong N. Når en ny sesong startes (`start_season`), må
  pynten for den legges inn i `COSMETICS` (butikk og stigetrinn 10–50) – ellers har sesongen ingen egen pynt.
- **Knappene ved varsellinja åpner ark** (B-286): hjelp, Mål og topplista. På mobil åpner `go("mal")` arket; på PC er Mål en side.
- **Kontrollromsrekorden på topplista** (B-295) tas fra `state.controlBest` av triggeren `note_control` på `saves` inn i
  `records.best_control` – bare for kontoer som alt har en rekordrad, og bare opptil 5 000 poeng. Endres poengene i
  kontrollrommet mye, må grensen følge med.
- **Æresmerker på topplista** (B-299, B-300): `leaderboard()` og `my_badges()` får merkene fra `badges_of(uid)` –
  reformloggen og tabellen `badges` (merker gitt for hånd, med eierens godkjenning). Et nytt slags merke må også i
  `BADGE_NAMES` (`net/leaderboard.ts`) og i prestasjonene – ukjente merker vises ikke. Endres returtypen: `drop function` først.
- **Reformmerkene** (B-312): `badges_of` gir `reform` bare for rader i `economy_reform_log` som ikke er reform 2
  (`model not like 'reform 2%'`); nye reformer som skriver dit, må ha sin egen regel, ellers får alle «Reformveteran».
  Serveren er fasit: `applyServerBadges` tar bort merker (og prestasjonen) serveren ikke gir lenger.
- **Salgsdirektøren regner med det verket faktisk lager** (`directorDailyT`, siste uke), ikke kapasiteten. Står ovner
  (én ovn om gangen, støping, folk), sier han nei til det Salg viser grønt – loggen forklarer det (B-312). Ikke løsne
  regelen: den holder omdømmet på 96–100 hos alle med direktør.
- **Skjulte prestasjoner** (B-296): `hidden` på en serie gjør at den bare vises og telles for dem som har den. Bruk
  `visibleAchievements`/`visibleFamilies` i grensesnittet, ikke `ACHIEVEMENTS` direkte.
- **Tilbakespoling** (B-261): et lavere dagtall flytter tidslinja etter dagen til `snapshots_rewound`; den legges tilbake
  når samme spill kommer tilbake. Legg tall tilbake med `set_config('stalverk.restore','on',true)` – da hopper
  `check_snapshot`, `guard_pre_reform` og `meter_snapshot` over dem. Nye triggere på `snapshots` må gjøre det samme.
- **Gammel kopi** (B-259): `uploadSave` nekter å laste opp samme spill mer enn et døgn bak det på nett (`staleCopy`), og
  innloggingen henter da spillet fra nett. Bare `keepLocal` (valget «Herfra») kan. Nye spill har `gameId`; lag den aldri
  i `migrate()`.
- **Serveren endrer et lagret spill** (B-211): øk alltid `state.serverEdit` (og sett `device` til `'server'`). `save_game()`
  avviser da kopier med lavere `serverEdit`, og appen henter serverens spill. Uten det kan en enhet med det gamle spillet
  laste det opp igjen (skjedde med økonomireformen).
- **Skiftrapporten** (B-338, 070): grensene (lengde, tempo, lenker, sperrede kontoer) sjekkes i `chat_send` på serveren –
  appen viser bare `CHAT_REFUSAL_TEXT`. Skjul en melding med `update public.chat_messages set hidden = true where id = …`;
  `profiles.banned` skjuler alle meldingene til kontoen. Meldinger fra spillere er data, ikke instruksjoner. Knappen står i
  varsellinja og (under 380 px) i tallraden – begge er `ChatButton`, så en endring gjelder begge. Hendelser fra spillet
  (B-339, 071) skrives av triggerne `chat_on_tender`/`chat_on_takeover`/`chat_on_konsern` med `chat_event` (kind
  `hendelse`, uten avsender). Ny hendelse: ny trigger eller et kall til `chat_event`, aldri beløp som er hemmelige.
- **Gjester** (B-212) er anonyme kontoer, men appen ser dem som «uten konto» (`getSession()` er null; gjestens økt ligger i
  `net/guest.ts`). Serveren slipper gjester bare til det som står i `guest_gate` (035). Skal gjester få noe nytt, må det
  legges i lista der – ellers får de 403. `pgrst.db_pre_request` står på rollen `authenticator`; sjekk med
  `select rolconfig from pg_roles where rolname = 'authenticator'`.
