# Økonomien i midt- og sluttspillet – analyse og forslag til reform 2

Skrevet 2026-09-28 (økt 235, B-301). **Eieren valgte pakke B med alle anbefalingene (B-302).** Status: B2+B6 bygget
(B-303), B1 bygget (B-304: utbytte i ekte tid til konsernkassa), gebyret settes etter anbudet, B3 (B-305) kommer. Analysen under står som den ble skrevet. Tallene er hentet fra
koden (`data.ts`, `plant.ts`, `konsern.ts`), fra spillernes lagrede spill og tidslinje (bare lesing), og fra
virkelige priser (kilder nederst). Spillerne omtales uten navn.

## 1. Kort fortalt

1. **Prisene per tonn er ikke problemet.** Skrap 2 500–4 200 kr/t, armering 8 300 kr/t og strøm rundt 0,7–1 kr/kWh
   ligger nær virkeligheten. Fra garasjen til stålverket er marginene høye (30–55 %), men summene er små og tempoet
   riktig. Det skal stå.
2. **Problemet er klokka.** På 10× er et spilldøgn 12 sekunder. Den ivrigste spilte 2 374 spilldøgn på én ekte dag –
   6,6 spillår. Da blir *alt* som betales per spilldøgn tusenvis av ganger større per ekte dag enn i verden
   (konsernkassa), som går i ekte tid. Selv med helt realistiske marginer (se 3) ville toppen tjent ca. 300 mrd. per
   ekte dag. En ny kutt i kassa (som reform 1) er derfor virkningsløs: den er tjent inn igjen på timer.
3. **Det finnes ingenting å bruke pengene på.** Alt utstyr, 14 datterverk på trinn 5 og all forskning koster til
   sammen ca. 100 mrd. Etter det er kassa bare et tall. Kassegrensen (100 mrd.) og den bundne reserven (B-193) er
   der pengene ender: 21, 475, 635 og 1 250 mrd. hos de fire største.
4. **Verden og verket henger ikke sammen.** Konsernkassa får 100 mill. per ekte dag for alle, uansett verk. Et verk
   som tjener 550 mill. per spilldøgn, teller like mye i verden som et som tjener 60. Det er trygt mot 10×, men det
   gjør hele midt- og sluttspillet hjemme betydningsløst for konkurransen – og strider mot «penger er viktige».
5. **Anbefaling:** ikke en ny kompresjon av kassa, men en reform av *hvor pengene går*: datterverkene betaler utbytte
   i **ekte tid** rett til **konsernkassa på serveren** (verifisert av serveren, sterkt avtagende med størrelsen), kassa
   hjemme får et tak der overskuddet betales ut til eierne (i stedet for reserven), og hjemmeverket får realistiske
   kostnader på toppen. Reserven fjernes og blir historikk. De som får lagringen endret, får et merke.
6. **Anbudet om to timer trenger ingen handling.** Det avgjøres av seg selv 29.9 kl. 01:33 UTC. Men gebyret bør
   settes før første utbetaling (30.9): med dagens 1 000 kr/t får eieren 190–300 mill. per ekte dag – 2–3 ganger det
   alle andre får inn i kassa til sammen. Se 7.

## 2. Slik er økonomien nå

### 2.1 Per nivå – hjemmeverket (fra testspillerens lagrede spill, 14 døgns snitt)

| Nivå | Dag | Tonn/døgn | Inntekt kr/t | Kostnad kr/t | Margin kr/t | Margin | Overskudd/døgn |
|---|---|---|---|---|---|---|---|
| Garasje (250 kg) | 5 | 1 | 13 500 | 5 800 | 7 600 | 57 % | 0,01 mill. |
| Verksted | 11 | 1 | 12 800 | 6 500 | 6 300 | 49 % | 0,01 mill. |
| Støperi (1 t, formlinje) | 26 | 10 | 14 300 | 6 600 | 7 700 | 54 % | 0,08 mill. |
| Stålverk (2 × 5 t, blokk) | 71 | 127 | 7 800 | 5 600 | 2 200 | 28 % | 0,28 mill. |
| Storverk (2 × 30 t, streng) | 128 | 726 | 9 300 | 5 300 | 4 000 | 43 % | 2,9 mill. |

Kostnadene per tonn er skrap 3 000–3 900, strøm 450–1 500 (små ovner bruker 600–750 kwh/t), lønn 170–770, forbruk
140–290, vedlikehold 100–560, nett 140–420, faste 90–420. Støpegods selges for 13 500 kr/t – virkelig støpegods koster
gjerne 30 000–60 000 kr/t, så starten er om noe forsiktig. **Dette er nivået brukeren kaller balansert, og det røres ikke.**

### 2.2 Toppen – 12 spillere på storverket (30 spilldøgns snitt fra lagringene, mill. kr per spilldøgn)

| | De fire største | De sju i midten | Den minste på storverket |
|---|---|---|---|
| Hjemmeverket, tonn/døgn | 28 000–31 000 | 19 000–31 000 | 7 000 |
| Salg (kontrakt + spot) | 240–375 | 175–330 | 67 |
| Skrap | 100–123 | 75–114 | 62 |
| Strøm + forbruk + vedlikehold + lønn + nett + faste | 24–27 | 20–28 | 8 |
| **Overskudd hjemme** | **115–230** | **70–190** | –3 |
| Datterverk | 12–14 komplekser trinn 5 | 8–10 stålverk/storverk, 1–7 komplekser | 8 blandet |
| Utbytte brutto | 1 570–1 770 | 6–770 | 68 |
| Konsernkostnader (ledelse + imperiebelastning) | 1 190–1 360 | 1–132 | 16 |
| **Netto fra konsernet** | **260–580** | **5–640** | 52 |
| **Samlet per spilldøgn** | **ca. 450–600** | **ca. 100–300** | ca. 50 |

Salgsprisen på toppen er 11 500–12 000 kr/t: armering 8 300 × kvalitetspremie (opptil 1,28) × salgsbonuser som legges
oppå hverandre (salgskontor, selgere, omdømme, kundepleie, eksport, produktutvikling, felles salg, grønt stål, havn,
vakuum: til sammen inntil **+43 %**) × mesterskap (+8 %), delt på markedsmetningen (0,64 ved 31 000 t).

### 2.3 Tid – roten til problemet

`GAME_MIN_PER_REAL_S = 12`: 1× er 12 spillminutter per sekund, 10× er 120. Et spilldøgn tar 12 sekunder på 10×; et
spillår (360 døgn) 72 minutter. Fra tidslinja, spilldøgn per ekte dag den siste dagen: 2 374, 1 141, 906, 778, 730,
690, 545, 258, 242, 176, 104, 76.

Vekst i konsernverdi per ekte dag (samme dag): 1 453 mrd., 770, 429, 110, 100, 63, 62, 43, 31, 25, 25, 19. Den som
spilte 8 timer på 10×, vokste 1 453 mrd.; den som spilte en times tid, 20–60 mrd.

**Konsekvens:** enhver inntekt per spilldøgn, ganget med 500–2 400 spilldøgn per ekte dag, blir absurd mot en verden
som går i ekte tid. Det er ikke marginene, det er multiplikatoren. Byggetid i ekte tid (B-209) var det første grepet
mot dette; det virket på kjøp, men ikke på inntekt.

### 2.4 Sluk – hva pengene kan brukes til

| Sluk | Kroner | Kommentar |
|---|---|---|
| Alt utstyr på storverket (3 × 420 t, 3 støpemaskiner, 3 valseverk, rens 5, havn …) | ca. 3–4 mrd. | engangs |
| 14 stålkomplekser à 3,6 mrd. + modernisering 5 trinn à 1,08 mrd. | ca. 126 mrd. (107 med rabattforskning) | engangs |
| Forskning og mesterskap | 0 kr (fagpoeng) | |
| Konsernkassa | 100 mill. per ekte dag | eneste vei inn i verden |
| Lån, renter, bøter, hendelser | små | |

Etter ca. 100–130 mrd. er det ingenting igjen å kjøpe. Derfra er kassa et tall, og reserven er et tall til.

### 2.5 Verden – konsernkassa og skraplageret

- Konsernkassa: 11 spillere har satt inn 100–200 mill. Alle har samme grense: 100 mill. per rullerende 24 timer
  (`treasury_base_per_day`, `treasury_log_step` = 0, B-190).
- Skraplageret: anbudet stenger 29.9 kl. 01:33 UTC; 8 bud fra 69 til 200 mill. Taket på 923 mill. = anslått inntekt i
  én konsesjon (14 dager) *da anbudet åpnet* (66 mill. per dag). **Anslaget nå er 191 mill. per dag** med 9 aktive
  spillere (173 600 t normal skrapbruk × 1 000 kr/t × 1,1); når alle 12 på storverket er «aktive» (2 av 14 dager),
  blir det ca. 300 mill. per dag. Eieren får da 2,7–4,2 mrd. i én konsesjon mot et bud på ≤ 200 mill., mens alle
  andre får 1,4 mrd. hver på 14 dager selv om de sparer alt. Taket på neste anbud blir anslaget (≈ 4 mrd.), og bare
  eieren har råd til å by i nærheten. **Uten justering låser verden seg til den første eieren.**
- Vinnerbudet forsvinner (går ikke til noen), tapernes bud kommer tilbake. Inntekten betales for hele dager som er
  over, til den som eier kl. 12 UTC den dagen, første gang for 29.9 – altså tidligst 30.9 etter midnatt UTC.
- Sluk i verden: bare bud. Kontroll og overtakelser (fase 3–4) er ikke bygget.

## 3. Virkelige priser mot spillet (2026)

| | Virkelig | Spillet | Vurdering |
|---|---|---|---|
| Armering, Nord-Europa | 610–740 €/t ≈ 7 000–8 500 kr/t | 8 300 kr/t (standard) | riktig |
| Emner (billets) | ca. 520–560 €/t ≈ 6 000–6 500 kr/t | 7 000 kr/t | litt høyt, greit |
| Skrap HMS 1&2 | UK 150–220 £/t ≈ 2 000–3 000; Tyrkia import ca. 3 500–4 000 kr/t | 2 500–4 200 kr/t | riktig |
| Strøm, kraftintensiv industri i Norge | 42 øre/kWh (3. kv. 2025, uten nett); spot 2026 ca. 95 øre | 0,85 kr × døgnprofil, minus mesterskap ≈ 0,7 | litt høyt, greit |
| Strøm per tonn i lysbueovn | 350–450 kWh/t | 360–440 kWh/t | riktig |
| Omformingskostnad utenom skrap (strøm, elektroder, ildfast, legeringer, lønn, vedlikehold) | ca. 150–200 $/t ≈ 1 600–2 100 kr/t | ca. 850 kr/t på toppen | **halvparten** |
| Driftsresultat (EBITDA), lysbueverk, normalt år | ca. 50–150 €/t ≈ 600–1 700 kr/t | 4 000 kr/t på dag 128, **7 000 kr/t på toppen** | **4–10 ganger** |
| Verdens største lysbueovnverk | 2,5–3 mill. t per år ≈ 7 000–8 000 t/døgn | 31 000 t/døgn ≈ 11 mill. t per år | **4 ganger det største i verden** |
| Salgspris på toppen | ≤ 8 500 kr/t | 11 500–12 000 kr/t | +40 % (bonusene legges oppå hverandre) |

Kilder: [Fastmarkets, rebar Nord-Europa](https://eurometal.net/growing-costs-push-european-domestic-rebar-prices-higher/),
[MEPS, Europe rebar](https://mepsinternational.com/gb/en/steel-product/rebar-prices/europe),
[Epignosis, Europe rebar tracker 2026](https://www.openpr.com/news/4643043/europe-steel-rebar-price-tracker-2026-epignosis-insights-data),
[steelprices.co.uk, HMS 1](https://steelprices.co.uk/), [metalcharts, US scrap](https://metalcharts.org/scrap-steel-prices),
[steelonthenet, EAF cost model](https://www.steelonthenet.com/resources/cost-models/eaf.html),
[FRC Global, EAF costs](https://www.frcglobal.com/blog/the-costs-of-producing-steel-with-electric-arc-furnaces),
[SSB, elektrisitetspriser](https://www.ssb.no/en/energi-og-industri/energi/statistikk/elektrisitetspriser),
[GMK, POSCO 2,5 mill. t](https://gmk.center/en/news/posco-is-launching-south-korea-s-largest-electric-arc-furnace/),
[Tata Steel Port Talbot 3 mill. t](https://www.newsx.com/business/tata-steel-to-build-electric-arc-furnace-in-port-talbot-creating-3-million-tonnes-annual-capacity/).

**Merk:** selv om alt ble virkelig (31 000 t × 1 200 kr/t = 37 mill. hjemme + realistisk konsern ca. 250 mill. =
ca. 300 mill. per spilldøgn), ville toppen tjene ca. 700 mrd. per ekte dag på 2 374 spilldøgn. Realisme alene løser
ingenting; den gjør bare tallene penere.

## 4. Diagnose – fem problemer

| # | Problem | Hvor | Virkning |
|---|---|---|---|
| P1 | Inntekt per spilldøgn × 500–2 400 spilldøgn per ekte dag | motoren | tusenvis av mrd.; verden på 100 mill./dag blir usynlig |
| P2 | Ingen sluk etter ca. 100–130 mrd. | konsernet | kassa og reserven er bare tall; titler er det eneste som «skjer» |
| P3 | Flat innskuddsgrense | serveren (B-190) | verkets størrelse betyr ingenting i verden; «penger er viktige» gjelder ikke |
| P4 | Konsernøkonomien er uintuitiv: 3,1 mrd. drift → 1,3 mrd. «konsernkostnader» → 0,3 mrd. netto | konsern.ts (B-181, B-251) | riktig netto, men spilleren ser 1,6 mrd. inn og 1,3 mrd. ut hver dag |
| P5 | Hjemmeverket på toppen: 4 × verdens største, 7 000 kr/t i margin, +43 % salgsbonus | plant.ts, data.ts | urealistisk, men ikke det som lager de store tallene |

Skraplageret (2.5) er et sjette, akutt punkt i verden.

## 5. To hovedretninger for reform 2

### Pakke A – «Verket er score, verden er lik for alle»

Behold flat innskuddsgrense (B-190 bokstavelig). Fjern reserven (→ historikk), hard grense for kassa, og sett gebyret
i skraplageret ned. Ingen kompresjon. Verket etter storverket er en karriereliste (kasse, konsernverdi, titler),
verden er en egen økonomi på 100 mill.-skala.

- + Minst arbeid, ingen ny risiko for lagringene, ingen regelbrudd.
- − Hele midt- og sluttspillet hjemme er uten betydning for konkurransen. Fjorten komplekser gir ingenting i verden.
  Kassa på 100 mrd. og «Stålkolosse» er tall uten funksjon. P1, P3 og P4 står.

### Pakke B – «Verket driver verden, i ekte tid» (anbefalt)

**B1. Datterverkene betaler utbytte i ekte tid, til konsernkassa på serveren.** Datterverkene bygger alt i ekte tid
(B-209); nå går også inntekten deres i ekte tid. Én gang per ekte dag (lat, i `world_tick`, som skraplageret) regner
serveren utbyttet av datterverkene fra listen i det lagrede spillet (verifisert av juksesperren), og betaler det inn i
konsernkassa. Lokal fart hjelper ikke; 14 komplekser gir mer enn 3, men sterkt avtagende (kvadratrot over 100 mill.,
som imperiebelastningen i dag):

| Konsern | Utbytte per ekte dag til konsernkassa (forslag) |
|---|---|
| Ingen datterverk | 0 (+ grunnbeløpet 100 mill., som i dag) |
| 3 storverk | ca. 20 mill. |
| 3 komplekser trinn 5 | ca. 140 mill. |
| 14 komplekser trinn 5 (de fire største) | ca. 260 mill. |

Tallene bygger på realistiske verk: stålverk 3, storverk 10, kompleks 30 mill. per døgn (halvparten av i dag), +25 %
per trinn, 70 % kan løftes opp, kvadratrot over 100 mill. Innskuddsgrensa på 100 mill. per dag står som grunnbeløp
for hjemmeverket. Budsjettet i verden per dag blir da 100 mill. for en ny konserneier og ca. 360 mill. for de største
– 3,6 : 1, «kraftig avtagende», ingen fordel av 10×, alt regnet av serveren. Det er B-190 i ånden (serverautoritativt,
ekte tid); bare setningen «lik grense for alle» blir «samme regel for alle».

Hjemme forsvinner posten «konsern» som inntekt; Konsern-siden viser «Utbytte til konsernkassa: X mill. per ekte
døgn». Datterverk kjøpes fortsatt med lokal kasse. Det gir en klar sløyfe: **drift verket (spilltid) → kjøp datterverk
(lokal kasse) → datterverkene betaler verden (ekte tid) → konkurrer.** P1 (for konsernet), P3 og P4 løses.

**B2. Kassa hjemme: tak, og overskuddet betales ut til eierne.** Grensen på 100 mrd. står (den dekker alt som kan
kjøpes). Over grensen betales pengene ut som «utbytte til eierne» – en historikk (`paidOut`), ikke egenkapital. Ny
liste i Hall of Fame: «Mest utbetalt til eierne». Reserven fjernes: de fire som har reserve (21–1 250 mrd.), får den
ført som utbetalt. Konsernverdien blir kasse − lån + verk (≤ ca. 215 mrd. for et fullt konsern), titlene man har,
beholdes. Hjemmeverkets vekst per ekte dag er dermed bundet av taket, ikke av klokka. P2 løses.

**B3. Hjemmeverket på toppen – realistiske kostnader og pris.** Bare det som virker over ca. 5 000 t/døgn:
salgsbonusene kappes samlet på +25 % (i dag +43 %); forbruk per tonn i de tre stormodellene 140–170 → 350–400 kr/t
(elektroder, ildfast, legeringer); en administrasjonskostnad på 250 kr per tonn *kapasitet* fra storverket (7,8 mill.
per døgn på 31 000 t; 0,2 mill. på 700 t); metningen får et andre knekkpunkt over 20 000 t (25 % av prisen). Toppen
går fra ca. 230 til ca. 110 mill. per spilldøgn (3 500 kr/t, fortsatt 2–3 ganger virkeligheten); et nytt storverk på
700 t merker under 5 %. Testes med `balance.ts` (nivåmålene skal stå). P5 dempes.

**B4. Ingen kompresjon av kassa.** De fire største står på 100 mrd. (taket); de sju i midten (6–84 mrd.) beholder
pengene, som nå kjøper datterverk som betaler verden. Med B2 er en kompresjon virkningsløs (taket nås igjen på under et
døgn på 10×) og bare irriterende.

**B5. Skraplageret.** Gebyret settes så en konsesjon gir omtrent det en sparsom spiller får inn i samme periode:
500 kr/t → 95–150 mill. per dag (1,3–2,1 mrd. per konsesjon). Bare `config.world`, ingen kode. Neste anbud får da et
tak på 1,3–2 mrd., som flere kan nå. Justeres senere mot B1.

**B6. Merke.** Alle som får det lagrede spillet endret av serveren (reserven ført som utbetalt; posten «konsern» i
historikken står), får et æresmerke, som ved reform 1 (`badges`, B-300).

Rekkefølge: B5 (i morgen, før første utbetaling) → B2 + B6 (én migrasjon etter tørrkjøring, og appen) → B1 (SQL +
app, med tester som viser at 1×/3×/10× gir samme utbytte) → B3 (balanse). Hver del sin egen beslutning og PR.

### Forkastet

- **Ny kompresjon av kassa alene** (som reform 1): tjent inn igjen på timer, se 1.2.
- **Marked i ekte tid for hjemmeverket** (kundene tar unna N normale døgn per ekte dag): løser P1 helt, men gjør 10×
  meningsløst i sluttspillet og er en stor endring i følelsen av spillet. Kan komme senere hvis taket ikke holder.
- **Reserven inn i konsernkassa:** 1 250 mrd. inn i en verden på 100 mill. per dag bryter B-190.
- **Realisme alene:** penere tall, samme problem (3).

## 6. Hva som ikke endres

Alt fra garasjen til og med storverket slik det spilles i dag: priser, skrap, strøm, lønn, utstyr, forskning,
kontrakter, hendelser, nivåmålene i `balance.ts`. B3 er laget så et nytt storverk ikke merker det.

## 7. Anbudet om to timer

Ingen handling trengs før det stenger: serveren avgjør det selv (høyeste bud, trekning ved likt, taperne får budet
tilbake). Det som må avgjøres innen 30.9 (før første utbetaling) er **gebyret** (B5). Å endre det rører ikke anbudet
eller budene – bare hva eieren får per dag. Taket på 923 mill. for dette anbudet står.

## 8. Spørsmål til eieren

1. Pakke A eller B? (B anbefalt.)
2. Reserven: føres som «utbetalt til eierne» (historikk, teller ikke i konsernverdi), beholdes, eller noe annet?
3. Skraplagerets gebyr før første utbetaling: 1 000 (som nå), 500 (anbefalt) eller 300 kr/t?
4. B3 (realistiske kostnader på toppen): nå, senere, eller ikke?
