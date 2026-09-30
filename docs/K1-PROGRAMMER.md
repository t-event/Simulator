# K-1: konsernprogrammer med modell B – spesifikasjon (B-389, godkjent B-390)

**Status:** godkjent av eieren 30.9.2026 (B-390) med presiseringene under. Ingenting er bygget, ingen tall i verden er
endret. Rekkefølgen: rapporten etter 2.10 → V0 i skygge og K-1 bak avslått bryter → skyggedata tilbake til eieren →
eieren avgjør om det slås på → verksjef V1. Simuleringen: `npx tsx src/game/programSim.ts --k1`, `--k1-skann` og
`--k1-drift` (fra `frontend/`).

**Eierens svar (B-390):**
1. **V0 ja** – regionale hendelser i ekte tid (strømsjokk, driftsuro, høykonjunktur), varslet to dager før, nøytrale i
   forventning over lang tid. V0 er **et eget lag i Industriverdenen**, ikke en mekanikk for programmenes skyld: det skal
   gi mening også hvis K-1 endres eller fjernes. Samlet i én region = sterk tilstedeværelse, men konsentrert risiko;
   spredt = mindre dominans, men bedre risikospredning.
   **Nøytral i snitt** betyr forventningsverdi for verden, ikke at hver spiller eller måned kompenseres: noen perioder er
   gode, noen dårlige, og noen spillere rammes mer på grunn av hvor de har bygget. Ingen skjult mekanisme som gir tapte
   penger tilbake til samme spiller; høykonjunktur er en verdenshendelse, ikke personlig kompensasjon.
   **Skygge først**, og ikke live bare fordi koden virker: før live skal den faktiske hendelsesfordelingen ligne
   simulatoren og ikke gi rare utslag med dagens plassering av verk.
2. **1 / 3 / 8 %** i config, foreløpig (skyggedataene kan justere). Forventet krone-avkastning kan være litt negativ –
   Teknologi og Robusthet er delvis forsikring – så lenge effekten er tydelig, risikoen reell og man kan stå uten program.
   Spillet skal ikke late som et program er et godt kjøp for alle: vis eksponeringen før valget.
3. **Trekk fra hver utbetaling:** bidrag + ordinært utbytte, av beløpet før hendelser og programeffekter; ikke
   selskapsinntekt, salg, refusjoner, oppkjøpsoppgjør eller annet engangs. Sju-dagers snittet bare til prognosen.
   Programbudsjettet er en konsernkostnad før fordelingen mellom kassa og fondet. Samme krone trekkes aldri to ganger.
4. **Driftsytelse:** test «Lav → Høy ved varsel om høykonjunktur» og «Lav → varsel om strømsjokk → bundet». Innfasing av
   økning legges bare inn hvis skygge eller simulering viser at rask økning dominerer (avsnitt 8).
5. Marked og Arbeidsmiljø åpnes ikke før systemene de skal påvirke finnes.

> **Verdenshendelser skaper situasjoner. Programmer lar spilleren velge hvordan konsernet skal møte dem.** Ikke motsatt.

## 0. Kort fortalt

1. **I dag finnes det ingenting på serveren som tre av programmene kan virke på.** Konsernverdenen har ingen
   hendelser: utbyttet regnes fast av det lagrede spillet, det finnes ingen strømpris, ingen driftsstans og ingen krig
   på serveren (krigen og vinteren i spillet er spilltid hjemme). Teknologi, Robusthet og Driftsytelses ulempe har altså
   ingenting ekte å dempe eller forsterke. Marked og region trenger endringer i Kontroll/oppkjøp (venter på data) og
   flere selskaper. Arbeidsmiljø trenger verksjefer.
2. **Forslag: et lite hendelseslag på serveren (Verdenshendelser V0)** – strømsjokk og driftsuro i én region om gangen,
   varslet to dager før, og høykonjunktur som veier dem opp, så verden er **nøytral i snitt** (uten programmer får man
   like mye som i dag, bare mer ujevnt). Da får tre programmer ekte effekt: **Teknologi, Robusthet og Driftsytelse**.
   Regionene får samtidig en ekte avveining: samlet i få regioner gir mer Kontroll i selskapene der (finnes i dag), men
   rammes hardere av hendelser.
3. **Hovedfunnet i simuleringen: med 4/12/30 % av inntekten koster programmene 5–20 ganger mer enn de kan spare.** Med
   hendelser som er nøytrale i snitt, er hele tapet i hendelser ca. 0,9–1,5 mrd. over to år for en middels spiller, mens
   to programmer på middels koster ca. 8 mrd. Da er programmene i praksis en avgift, som eieren ikke vil ha (punkt 3).
   Med **1 / 3 / 8 %** er et godt valgt program omtrent verdt det det koster (−0,3 til −0,9 mrd. over to år for den som
   bruker dem klokt), og det jevner ut inntekten. Se avsnitt 8.
4. **Grunnlaget kan gjøres enklere enn et eget sju-dagers snitt:** budsjettet trekkes som andel av hver vanlige
   utbetaling (bidrag og utbytte før hendelser og programmer). Sju-dagers snittet brukes bare til å vise anslaget før
   man bekrefter. Da kan det aldri mangle penger, og programmet står stille når verket står stille (punkt 7), uten ekstra
   regler.

Spørsmålene i avsnitt 10 er besvart (B-390).

## 1. Hva som finnes i spillet i dag (eierens punkt 4)

| Program | Hva det skal virke på | Finnes på serveren i dag? | Kan åpnes |
|---|---|---|---|
| Teknologi og energi | strømsjokk | Nei – ingen strømpris eller hendelser i konsernverdenen | med V0 |
| Robusthet | driftsstans, uro | Nei – ingen hendelser | med V0 |
| Driftsytelse | mer utbytte, med ulempe | Utbyttet ja, men ulempen (hendelser rammer hardere) trenger V0 | med V0 |
| Marked og region | regional styrke, selskaper | Regioner og +2,5 Kontroll per verk i regionen finnes; å endre Kontroll/oppkjøp venter på ekte data; ett selskap | etter S-1/O-1 |
| Arbeidsmiljø | verksjefer, lojalitet | Nei – verksjefer finnes ikke | med V1 |

Uten V0 kan ingen program åpnes med ekte effekt. Tre gode er bedre enn fem med plassholdere (eierens punkt 4), så
K-1 åpner med **tre programmer**, og rammeverket har plass til Marked og Arbeidsmiljø senere.

Ekte fordeling av verkene i dag (lest 30.9., bare lesing): av 11 konsern med minst 3 verk er 9 spredt på alle seks
regionene (største andel 18–25 %). Ett har alt i én region, og ett har 60 % i én region. Hendelser rammer altså de fleste
lite i dag – det er et valg de kan gjøre annerledes ved å flytte (én gang per verk) eller bygge nytt.

## 2. Grunnlaget for budsjettet (eierens punkt 1)

**Eierens ønske:** normal driftsinntekt = hovedverkets bidrag + vanlig utbytte, uten engangsinntekter, helst stabilt
(sju dagers snitt), og utbyttet *før* programeffekter.

**Forslag (enklere, samme virkning):** budsjettet trekkes **som andel av hver vanlige utbetaling** når den betales:

- `pay_contributions` betaler bidraget → programbudsjettet (sum av satsingene) trekkes av beløpet.
- `pay_dividends` regner utbyttet slik det gjør i dag (fullt, før politikken) → budsjettet regnes av dette tallet
  **før** hendelser og programmer, og trekkes før resten går til kassa og fondet.
- Rekkefølgen i `pay_dividends` (eieren, B-390): **brutto ordinært utbytte → programkostnad → hendelse og
  programeffekt → vanlig fordeling** mellom konsernkassa og fondet (`dividend_to_treasury`).
- **Aldri to ganger:** bidraget og utbyttet trekkes hver for seg, hver av sin egen utbetaling. Hvert trekk føres i
  `program_charges` med en unik nøkkel (spiller, ekte dag, kilde `bidrag`/`utbytte`), så en betaling som kjøres på nytt
  (for eksempel etter en feil i `world_tick`), ikke trekker igjen. Utbytte som betales for flere dager på en gang
  (inntil 14), trekkes per dag.
- Selskapsinntekt, refusjoner, salg, oppkjøpsoppgjør og annet engangs betales av andre funksjoner og er dermed aldri med
  i grunnlaget.

Hvorfor dette er bedre enn et lagret sju-dagers snitt:

| | Sju-dagers snitt | Andel av hver utbetaling |
|---|---|---|
| Engangsinntekter utenfor | må filtreres | automatisk |
| Ingen selvforsterkning | må bruke tallet før program | samme – trekkes av tallet før program |
| Ny eller tilbakevendt spiller | snittet er skjevt de første dagene (delt på 7 med 1 dag data) | riktig fra første dag |
| Inaktiv spiller | snittet kan være større enn det som kommer inn – kassa kan tømmes | ingen inntekt = ingen kostnad = ingen effekt |
| Mangler penger | må håndteres (pause, gjeld) | kan ikke skje |

Snittet over sju dager (delt på antall dager med utbetaling, høyst 7) brukes **bare til visning**: «ca. 18 mill.
kr/dag». Det faktiske beløpet følger inntekten dag for dag og står i rapporten.

## 3. Satsing og visning (eierens punkt 2)

- Lav / Middels / Høy = andel av normal inntekt per program, fra `config.world.programs.budget` (foreløpig, se avsnitt 8).
- Høyst to aktive; høyest mulig nominelt er 2 × Høy.
- Før man bekrefter, vises alltid både kroner og andel, ingen skjulte prosenter:

> **Teknologi – Høy** · Ca. 4,2 mill. kr/dag (8 % av normal inntekt)
> Totalt programbudsjett: ca. 9 % av konsernets normale inntekt
> Demper strømsjokk i alle regioner der du har verk: tapet blir 80 % mindre.
> **Ditt konsern:** 18 % av datterverksutbyttet kommer fra Nord, der strømsjokk er varslet fra torsdag. Med dagens
> plassering ville programmet de siste 90 dagene ha spart ca. 12 mill. kr, mot et budsjett på ca. 380 mill. kr.
> Bundet til 16. oktober. Etablering: 3 dager og ca. 104 mill. kr.

**Eksponeringen vises før valget** (eieren, B-390): hvor stor del av datterverksutbyttet som kommer fra hver region, og
fra regionene som er varslet. Tallet «ville ha spart» regnes av serveren fra hendelsene som faktisk skjedde og
spillerens plassering nå (samme regnestykke som skyggeloggen). For et konsern spredt på seks regioner blir det tydelig at
Teknologi på Høy sjelden forsvarer 8 % – spillet anbefaler ikke programmer, det viser tallene.

## 4. Verdenshendelser V0 (forutsetningen)

**Hva:** serveren trekker hendelser per region i ekte tid og lagrer dem i en tabell (`world_events`: region, type,
varslet, start, slutt, størrelse). De varsles **to dager før** på kartet, i Skiftrapporten (hendelse, som anbud i dag)
og i varsellinja for dem med verk i regionen.

| Type | Virkning på utbyttet fra verkene i regionen | Varighet | Hyppighet |
|---|---|---|---|
| Strømsjokk | −40 % | 8–12 ekte dager | dobbelt så ofte om vinteren (nov.–mars, norsk tid) |
| Driftsuro | −35 % | 5–9 ekte dager | jevnt |
| Høykonjunktur | ca. +30 % (regnet av config, se under) | 10–16 ekte dager | halvparten av hendelsene |

- Snitt ca. 45 ekte dager mellom to hendelser i samme region; én hendelse per region om gangen.
- **Nøytral i forventning, ikke kompensasjon:** størrelsen på høykonjunkturen regnes **én gang av tallene i config**
  (hyppighet, størrelse og varighet på de dårlige hendelsene, og vinterandelen) – `k1BoomSize` i simulatoren, samme
  formel på serveren. Den etterregnes aldri av hendelsene som faktisk ble trukket, og ingen spiller får noe tilbake
  fordi hen ble rammet. I simuleringen havner verdenene fra −0,5 til +0,2 mrd. over to år rundt et snitt som er likt
  verden uten hendelser – noen er heldige, noen uheldige.
- **Et eget lag i Industriverdenen:** hendelsene vises på kartet og i Skiftrapporten også for dem uten programmer, og
  virker på utbyttet uansett. Fjernes K-1, står V0 igjen som det som gjør regionvalget til en avveining (samlet =
  mer Kontroll i selskapet i regionen, men mer risiko; spredt = mindre dominans, jevnere inntekt). Senere systemer
  (selskaper, oppkjøp, verksjefer) kan bruke de samme hendelsene.
- Bare **utbyttet fra datterverkene** påvirkes. Bidraget fra hovedverket og alt hjemme (spilltid) er urørt (B-323).
- Utbyttet betales én gang per ekte dag (`pay_dividends`); faktoren for dagen ganges inn per verk etter regionen.
  Målingene hvert kvarter (`dividend_avg`) er urørt – faktoren brukes på betalingen, ikke på målingen.
- Konsernverdien (topplista) regnes av det fulle utbyttet uten hendelser, så lista ikke hopper.
- Uten konsern (bare hovedverk): ingen virkning.

Dette er en endring i verdensbalansen i **spredning**, ikke i snitt, og står derfor bak bryteren sammen med K-1.

### 4.1 Skygge (steg 1) – hva som logges

Hendelsene trekkes og lagres som om de var live, men vises ikke og virker ikke på noe. Loggen:

| Tabell | Innhold |
|---|---|
| `world_events` | region, type, størrelse, varslet, start, slutt, `shadow = true` |
| `world_event_exposure` | per hendelse, spiller og ekte dag: andel av datterverksutbyttet fra regionen, utbyttet før hendelsen, hypotetisk tap/gevinst uten program, og hypotetisk virkning med Teknologi / Robusthet / Driftsytelse på Lav, Middels og Høy (hva programmet ville tatt bort eller lagt til, og budsjettet det ville kostet) |

Loggen skrives av `pay_dividends` på den samme utbetalingen som i dag, uten å endre beløpet. Det gjør at tallene er
nøyaktig det spilleren ville fått. Rader for gjester skrives ikke (`user_is_guest`).

**Før live kommer rapporten tilbake til eieren** med: antall hendelser per type og region mot simulatoren, hvor mye hver
spiller ville tapt og tjent (fordelingen, ikke bare snittet), de største utslagene med dagens plassering (for eksempel
konsernet med alt i én region), og hva hvert program på hver satsing ville gitt mot det det ville kostet. Ingenting slås
på fordi koden virker teknisk.

## 5. De tre programmene (eierens punkt 3 og 8)

Effekt på Lav / Middels / Høy = 25 / 60 / 100 % av full effekt (avtagende avkastning: Lav gir mest per krone).

| Program | Full effekt (Høy) | Når det lønner seg | Når det er bortkastet |
|---|---|---|---|
| **Teknologi og energi** | Tapet i strømsjokk blir 80 % mindre | Vinter, varslet strømsjokk der man har mange verk | Sommer, spredt konsern |
| **Robusthet** | Tapet i driftsuro blir 80 % mindre | Varslet uro, samlet konsern | Rolige perioder |
| **Driftsytelse** | Ekstra inntekt ca. 1,05 × budsjettet i hele perioden, **men alle strømsjokk og all uro rammer 50 % hardere** | Rolige perioder, høykonjunktur | Når hendelser er varslet der man har verk |

Driftsytelse (eierens punkt 8): forventet ren gevinst er omtrent null (i simuleringen −0,4 til −1,2 mrd. over to år inkl.
etablering), og ulempen er ekte: den som satser høyt og blir truffet, taper mer enn uten program. Det er et veddemål på
at de neste ukene blir rolige, med varslene som informasjon.

**Driftsytelse forsterker ikke høykonjunkturen** – med vilje. Da ville «Lav hele tida, Høy ved varsel om
høykonjunktur» vært nesten gratis (se avsnitt 8). Ekstrainntekten er den samme hver dag, så det finnes ingen dag der det
lønner seg spesielt å skru opp.

**Etter hvert viser programmet hva det gjorde** (eierens punkt 3), fra tabellen `program_log` (per spiller, program og
dag: budsjett, spart, ekstra, tapt ekstra):

> **Teknologi** siste 30 dager: dempet strømsjokk 3 ganger (Nord, Vest, Nord) · spart beregnet 21 mill. kr ·
> budsjett 34 mill. kr

Spart = det utbyttet ville vært uten programmet minus det faktisk var – regnet av serveren på samme betaling.

## 6. Start, bytte og satsing (eierens punkt 5 og 6)

Tre handlinger, ingen mikrostyring:

| Handling | Hvordan | Når |
|---|---|---|
| **Start eller bytt program** | Strategisk prosjekt i prosjektlinja (`konsern_orders`, kind `program`): 3 ekte dager, etablering = 2 dagers normal inntekt | Et tomt spor, eller et program som er ute av bindingen. Det gamle stopper når det nye begynner å etableres. |
| **Øk satsingen** | Gjelder fra neste utbetaling. Bindingen starter på nytt (14 dager). | Når som helst |
| **Senk eller stopp** | Med én gang | Bare når bindingen er ute |

- Høyst to programmer, også mens det ene etableres.
- Bindingen er 14 ekte dager fra start og fra hver økning. Det som er brukt, refunderes aldri.
- Hvorfor økning er rask og bytte er tregt: med to dagers varsel rekker man ikke å etablere et nytt program før en krise
  (3 dager), men den som har et program på Lav, kan skru opp. Det gjør «Lav som forsikring» til en strategi, og en økning
  binder på Høy i 14 dager – dyrt hvis krisen blir kort. Man kan ikke bytte fem sekunder etter at krisen dukker opp, men
  det går heller ikke så tregt at verden har endret seg før det virker.
- Prosjektlinja er delt med bygging, modernisering og (senere) forberedelse til oppkjøp: et programbytte står i køen
  som alt annet.

## 7. Pause og finansiering (eierens punkt 7)

- Budsjettet trekkes av utbetalingen samme dag (avsnitt 2). Ingen utbetaling (aktivitetsfaktor 0, ingen verk i drift)
  = ingen kostnad og **ingen effekt** den dagen.
- Lavere aktivitetsfaktor gir lavere utbetaling, lavere budsjett – og effekten er en andel av det samme lavere utbyttet.
  Effekten følger altså finansieringen av seg selv.
- Bindingen løper videre i ekte tid også i pause (ellers kunne man «parkere» et billig program).

## 8. Simuleringen (programSim.ts --k1)

Hendelsene er trukket med fast frø (snitt av 8 verdener), nøytrale i snitt. Middels spiller (52 mill./dag), kasse etter to år
og forskjellen fra uten programmer:

| Satsing (lav/middels/høy) | Strategi | Spredt på 6 regioner | Samlet i 2 regioner |
|---|---|---|---|
| **4 / 12 / 30 %** | Teknologi + Robusthet, middels hele tida | −8,3 mrd. | −8,3 mrd. |
| | Begge på lav, høy ved varsel | −8,7 mrd. | −4,9 mrd. |
| | Driftsytelse middels + Robusthet lav/høy | −4,1 mrd. | −2,4 mrd. |
| **1 / 3 / 8 %** | Teknologi + Robusthet, middels hele tida | −1,9 mrd. | −1,9 mrd. |
| | Begge på lav, høy ved varsel | −2,0 mrd. | −0,9 mrd. |
| | Driftsytelse høy + Teknologi lav/høy | −1,1 mrd. | −0,5 mrd. |
| **0,5 / 1,5 / 4 %** | Begge på lav, høy ved varsel | −0,7 mrd. | +0,3 mrd. |

- Hele tapet i hendelser over to år er ca. 0,9 mrd. (−40 %-hendelser) til 1,5 mrd. (−70 %) for en middels spiller.
  **Det er taket for hva Teknologi og Robusthet kan spare.** Med 4/12/30 % koster to programmer 8–9 mrd. Selv med
  hendelser på −70 % endrer det seg lite.
- For å gjøre 4/12/30 % ærlig måtte hendelsene ta rundt halve utbyttet i hele konsernet samtidig – en mye mer ustabil
  verden for alle.
- Programmene jevner ut inntekten: laveste 14 dager for et samlet konsern går fra 87 % av snittet uten programmer til
  92 % med to på middels. For et spredt konsern betyr hendelsene lite i utgangspunktet.
- «Lav, høy ved varsel» for et spredt konsern gir ca. 57 endringer på to år – for mye styring. Et spredt konsern gjør
  best i å stå stille; et samlet konsern har grunn til å følge med (26 endringer). Varsler bare om hendelser i regioner
  med minst 15 % av utbyttet.
- Tallene er plassholdere for å sammenligne satsinger; nøyaktige nivåer settes når V0 har gått en stund med ekte
  hendelser (bak bryteren kan hendelsene gå på serveren uten virkning og bare telles).

### 8.1 Driftsytelse og varslene (`--k1-drift`, eierens spørsmål i B-390)

Middels spiller, satsing 1/3/8 %, snitt av 8 verdener, forskjell i kasse etter to år mot uten programmer:

| Strategi | Spredt | Samlet | Merknad |
|---|---|---|---|
| Driftsytelse lav + Teknologi lav, fast | −0,5 mrd. | −0,5 mrd. | utgangspunktet |
| Driftsytelse lav → **høy ved varsel om høykonjunktur** | −0,6 mrd. | −0,5 mrd. | gir ingenting ekstra: gevinsten er lik hver dag, og bindingen holder den på Høy også når sjokk kommer |
| Driftsytelse høy → **ned til lav ved varsel om sjokk/uro** | −0,5 mrd. | −0,4 mrd. | bindingen sperret **13** av varslene for et spredt konsern (2 for et samlet) – man kommer seg ikke billig ut |
| *Variant (ikke foreslått): Driftsytelse forsterker høykonjunktur 50 %* | −0,2 mrd. | −0,1 mrd. | «høy ved varsel om høykonjunktur» blir nesten gratis og best – derfor ikke med |

**Konklusjon:** med forslaget gir ingen av varselstrategiene for Driftsytelse en fordel, og bindingen på 14 dager gjør at
to dagers varsel ikke gjør sjokkene trivielle. Innfasing av økning trengs ikke nå; skyggedataene viser om det endrer seg.
Tilsvarende for forsikring: «Teknologi + Robusthet lav, høy ved varsel» tar bort ca. 80 % av hendelsestapet, men koster
mer enn det sparer (−0,9 til −2,0 mrd. over to år) – det er forsikring, ikke en gratis fasit.

**Konsekvensen for pengene som hoper seg opp:** med ærlige satsinger (ca. 1/3/8 %) bremser programmene kassa med
5–12 % av inntekten, ikke 30–70 %. Det stemmer med eierens punkt 10: programmene er ikke hele løsningen – selskaper,
oppkjøp og regional makt må være de store valgene for kapitalen.

## 9. Bryter, rekkefølge og hva som bygges når (eierens punkt 9 og 10)

`config.world.programs` (foreløpig):

```json
{ "enabled": false, "events_enabled": false, "events_shadow": true,
  "budget": [0.01, 0.03, 0.08], "effect": [0.25, 0.6, 1], "max_active": 2,
  "bind_days": 14, "establish_days": 3, "establish_income_days": 2,
  "protect": 0.8, "drift_gain": 1.05, "drift_harder": 0.5,
  "events": { "gap_days": 45, "warn_days": 2, "strom": [0.4, 8, 12], "uro": [0.35, 5, 9], "boom_days": [10, 16] } }
```

| Steg | Innhold | Når |
|---|---|---|
| 0 | Rapporten etter 2.10 (verdensdata) | 2.10 |
| 1 | V0 i skygge: hendelser trekkes og logges (avsnitt 4.1), ingen virkning og ingen visning | etter rapporten, hvis ingenting alvorlig |
| 2 | K-1 bak avslått bryter: tabeller, `konsern_order` kind `program`, trekk i `pay_contributions`/`pay_dividends` (bare når bryteren er på), app (kort under Konsern → Oversikt, bekreftelse med tallene og eksponeringen, rapport) | samtidig med 1 |
| 3 | Samle skyggedata | noen uker |
| 4 | Tilbake til eieren: faktisk hendelsesfordeling og hypotetiske programresultater | før noe slås på |
| 5 | Eieren avgjør om V0 og K-1 slås på (tre programmer) | eierens beslutning |
| 6 | Verksjef V1 → Arbeidsmiljø åpnes | når K-1 har en stabil grunnmur |
| 7 | Flere selskaper og oppkjøp etter data → Marked og region åpnes | senere |

Konto (B-149): krever konto (regel 2 og 7 – ekte tid mellom spillere). Serverfunksjonene sjekker `auth.uid()`, ikke gjester.

## 10. Spørsmål til eieren (besvart 30.9., B-390: ja på alle tre, med presiseringene øverst)

1. **Hendelseslaget V0:** greit med regionale hendelser som er nøytrale i snitt (mer ujevn inntekt, samme snitt), varslet
   to dager før? Uten dem har ingen av de tre programmene ekte effekt.
2. **Satsingene:** med ærlige effekter koster 4/12/30 % mye mer enn programmene kan gi – de blir en avgift. Forslag:
   **1 / 3 / 8 %** i config (kan justeres når V0 har ekte data). Alternativet er å beholde 4/12/30 % og gjøre hendelsene
   mye større (en langt mer ustabil verden), eller godta at programmene er et sluk.
3. **Grunnlaget:** greit å trekke budsjettet som andel av hver vanlige utbetaling (før hendelser og programmer), og bruke
   sju-dagers snittet bare til visning? Det er enklere og gir samme virkning.
