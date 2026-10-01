# Forslag: verksjefer for datterverkene (RETNING fase 5, B-379)

**Status:** eierens spørsmål er besvart (avsnitt 0 og 9, B-379, presisert 1.10 i B-409). V1 er spesifisert ferdig i
avsnitt 10, men **bygges ikke ennå**. Rekkefølgen står: 2.10 → V0 i skygge og K-1 → data → eventuelt live → verksjef V1.

## 0. Eierens svar 30.9.2026 (bygges ikke før stabiliseringen er ferdig, B-380)

1. **Ja** til tre egenskaper (Drift, Økonomi, Folk) og tre mandater (Lønnsomhet, Vekst, Stabilitet).
2. **Uten verksjef omtrent som i dag.** Men en verksjef skal ikke bare gi +10–15 %: mandatene må ha ekte ulemper.
   Lønnsomhet: mer utbytte nå, men en reell ulempe eller risiko. Vekst: mindre utbytte nå mot billigere og raskere
   utvikling. Stabilitet: lavere toppresultat mot mindre risiko og jevnere drift.
3. **Lønn 3–6 %** som utgangspunkt for simulering – ikke lås det før det er vist at det ikke alltid lønner seg å ansette,
   uansett kandidat.
4. **Sjeldnere samtaler:** ca. 2–3 per ekte uke per konsern, høyst én samme dag, **48 timers** frist. Verksjefen velger
   fortsatt selv etter personligheten hvis eieren ikke svarer.
5. **Ingen kobling til Kontroll** ennå.

Rekkefølgen (eieren): kassetaket, legacy-gulvet, ny verdenssimulering og STATUS.md først (`docs/STABILISERING.md`),
så noen ekte dager med data, så slagghåndteringen – deretter verksjefene.

## 1. Hvor vi står

- Et datterverk er i dag en **passiv investering**: man kjøper, moderniserer og venter. Utbyttet regnes av serveren én
  gang per ekte dag etter type, trinn og konsernforskning (B-304, `dividend_from_state`). Etter kjøpet er det ingenting å
  gjøre med verket.
- De største har snart fullt konsern (14 verk). Da er det ingen valg igjen i konsernet utenom utbyttepolitikken (B-334).
- RETNING fase 5 sier: verksjef med egenskaper og personlighet, mandat, og «Verksjefen ringer» med noen få valg. Ingen
  perfekt leder, og det koster å sparke.

Målet: **gi konsernet valg, ikke regneark** (B-180). Én beslutning om gangen, forklart med vanlige ord.

## 2. Idéen kort

- Hvert datterverk kan få en **verksjef**. Uten verksjef går verket **som i dag** – ingen blir straffet for å la være.
- En verksjef har **tre egenskaper** (1–5 stjerner) og **ett trekk** (personlighet). Eieren gir et **mandat**. Passer
  verksjefen til mandatet, gir verket mer; passer hen dårlig, gir det mindre.
- Verksjefen får **lønn fra konsernkassa** hver ekte dag.
- Av og til **ringer verksjefen** med en sak og to valg (ca. 2–3 i uka for hele konsernet). Svarer ikke eieren innen
  48 timer, bestemmer verksjefen selv – etter personligheten sin.

Alt regnes på serveren i ekte tid (B-190, B-323): verksjefen påvirker utbyttet og konsernkassa, som påvirker andre.

## 3. Verksjefen

Forenklet fra RETNING (seks egenskaper og fem mandater blir tre og tre – nok til å gi valg, lite nok til å forstå):

| Egenskap | Hva den gjør |
|---|---|
| **Drift** | Mer stål ut av verket (driftsresultatet) |
| **Økonomi** | Lavere kostnader og bedre priser |
| **Folk** | Færre dårlige saker (streik, oppsigelser, ulykker) og mer lojalitet |

| Trekk | I samtalene | Når eieren ikke svarer |
|---|---|---|
| **Forsiktig** | Foreslår trygge valg | Velger det tryggeste |
| **Ærgjerrig** | Foreslår dristige valg | Velger det som kan gi mest |
| **Sparsom** | Holder igjen på pengene | Velger det billigste |
| **Lojal** | Følger mandatet | Velger det som passer mandatet |

Kandidatene lages av serveren: navn fra de samme oppdiktede navnelistene som de ansatte hjemme, tre egenskaper og ett
trekk. **Ingen perfekt leder:** summen av stjernene er høyst 10 av 15, så en god kandidat er sterk på noe og svak på noe
annet. Tre kandidater å velge mellom, nye hver ekte dag.

## 4. Mandatet

| Mandat | Hva eieren ber om | Hvilken egenskap teller mest |
|---|---|---|
| **Lønnsomhet** | Mest mulig utbytte nå | Drift og Økonomi |
| **Vekst** | Billigere og raskere modernisering av dette verket | Drift |
| **Stabilitet** | Jevnt utbytte og færre dårlige saker | Folk |

**Hva det gir** (første forslag 30.9. – **erstattet av avsnitt 10**, der hvert mandat har en ekte ulempe):

- Lønnsomhet: verkets utbytte × (0,9 + 0,05 × snittet av Drift og Økonomi), fra −5 % til +15 %.
- Vekst: utbyttet × 0,95, men modernisering av verket koster 20 % mindre og tar 25 % kortere tid.
- Stabilitet: utbyttet × (1 + 0,02 × Folk), og dårlige saker kommer halvparten så ofte.
- Mandatet kan byttes én gang per ekte uke (som utbyttepolitikken).

**Lønn:** 3–6 % av verkets utbytte per ekte dag, etter stjernene. For et stålkompleks (ca. 6 mill. per dag) er det
0,2–0,4 mill. En god verksjef på Lønnsomhet (snitt 4–5 stjerner) gir ca. +0,6–0,9 mill. – altså ca. +0,4 mill. per dag
netto. For et fullt konsern (ca. 30 mill. per dag) blir det ca. 2–3 mill. per dag mer netto: merkbart, men ikke avgjørende
mot en som ikke bryr seg.

## 5. «Verksjefen ringer»

- **Ca. 2–3 samtaler per konsern per ekte uke**, høyst én samme dag, trukket blant verkene med verksjef. Eieren får
  beskjed i varsellinja.
- Hver samtale er et kort med to valg og en frist på **48 timer**. Et kort vises ikke igjen på samme verk på 30 dager.
- Virkningen er alltid **tidsbegrenset** (noen ekte dager med høyere eller lavere utbytte, en engangskostnad eller
  -inntekt) eller **lojalitet**. Ingen varige tap, ingen kjede av straff.
- Eksempler (om lag 15 kort, generiske):
  - «Ovn 2 bør fores om nå. Det koster 3 mill., ellers risikerer vi en uke med halv drift.»
  - «Fagforeningen vil ha 4 % mer. Sier vi nei, kan det bli en kort streik.»
  - «En kunde vil ha en hastejobb til god pris, men da må vi utsette vedlikeholdet.»
  - «Jeg har fått tilbud fra en konkurrent.» (lav lojalitet: behold med lønnstillegg eller la gå)
- Svarer eieren ikke, velger verksjefen etter trekket sitt og sier fra om det. Den som er borte en uke, taper lite.

## 6. Lojalitet og å sparke

- Lojalitet 0–100, starter på 60. Går opp når mandatet passer og samtalene besvares, ned når mandatet ofte byttes eller
  forslagene avvises.
- Under 20 kan verksjefen si opp (varsel dagen før). Da står verket uten verksjef, som i dag.
- Å sparke koster en sluttpakke på **5 dagers lønn**, og verket må vente **3 ekte dager** før en ny verksjef kan begynne.
- Selges verket, går verksjefen med salget.

## 7. Konto, synlighet og skjerm

- **Konto (B-149):** ja – regel 2 og 7 (konsernkassa og ekte tid på serveren).
- **Gradvis synlighet (B-180):** verksjefen vises først når det første datterverket er ferdig bygget. Kort forklaring,
  så én handling: «Ansett en verksjef».
- **Skjerm:** Konsern → Oversikt får verksjefen i raden til hvert verk (navn, mandat, stjerner). Et trykk åpner et ark
  med kandidatene eller verksjefen. Samtalene åpnes fra varsellinja. Samme på mobil og PC (B-187).
- **Server:** tabellene `plant_managers` og `manager_calls`; `pay_dividends` ganger inn verksjefens tall per verk; lønn og
  virkninger føres i `treasury_ledger`. Speilet i `game/dividend.ts` med faste tall i testen, som utbyttet i dag.

## 8. Rekkefølge

1. **V1 – verksjef og mandat:** kandidater, ansettelse, mandat, lønn og virkning på utbyttet. Simuleres først med
   `balance.ts --konsern`.
2. **V2 – samtalene:** kortene, fristen, varsel, verksjefens eget valg.
3. **V3 – lojalitet, oppsigelse og sparking.**

Hver del testes med testkontoer i en DO-blokk som rulles tilbake, og slås på med en bryter i `config`.

## 9. Eierens svar (besvart 30.9., presisert 1.10 – B-379, B-409)

1. **Tre egenskaper og tre mandater:** ja. Drift, Økonomi og Folk; Lønnsomhet, Vekst og Stabilitet.
2. **Uten verksjef går verket omtrent som i dag.** Ingen skal tvinges til å ha verksjef for å unngå en straff.
3. **Lønn 3–6 % av verkets utbytte** som utgangspunkt for simulering – ikke et låst balansetall. V1 må vise at en
   verksjef ikke bare blir en automatisk lønnsom oppgradering.
4. **Samtalene:** ca. 2–3 saker per ekte uke per konsern, høyst én samme dag, **48 timers** svarfrist. Svarer spilleren
   ikke, bestemmer verksjefen selv ut fra personligheten. (Det gamle forslaget om én per dag og 24 timer gjelder ikke.)
5. **Kontroll:** ingen Kontroll-bonus fra verksjefer i V1–V3, ikke før ledermekanikken er testet og virker.

## 10. V1-spesifikasjon: verksjef og mandat (klar til bygging, bygges ikke ennå)

Skrevet ferdig 1.10.2026 (B-409) etter eierens svar. Bygges først når V0/K-1 har gått i skygge, dataene er vurdert og
eieren har avgjort om de skal live (K1-PROGRAMMER.md avsnitt 9). Tallene er **startverdier for simulering**, ikke låste
balansetall; akseptkriteriene i 10.6 avgjør.

### 10.1 Hva V1 inneholder – og ikke

| Med i V1 | Ikke i V1 |
|---|---|
| Kandidater, ansettelse, mandat, lønn, virkning på utbyttet og på modernisering | Samtalene («Verksjefen ringer») – V2 |
| Avslutte en verksjef (sluttpakke, karantene for verket) | Lojalitet, oppsigelse fra verksjefen – V3 |
| Trekket (personlighet) lagres og vises | Trekket brukes først når verksjefen velger selv i V2 |
| Speil i appen og testspilleren | Kontroll-bonus (ingen i V1–V3, eierens svar 5) |

### 10.2 Verksjefen

- **Tre egenskaper**, 1–5 stjerner: **Drift**, **Økonomi**, **Folk**. **Ingen perfekt leder:** summen er 6–10 av 15
  (ingen kan ha 5 stjerner på to egenskaper). Fordelingen trekkes jevnt blant lovlige kombinasjoner, så sterke kandidater
  er sjeldne.
- **Ett trekk:** Forsiktig, Ærgjerrig, Sparsom eller Lojal. I V1 bare tekst; i V2 avgjør det hva verksjefen velger når
  eieren ikke svarer.
- **Kandidater:** tre per konsern per ekte dag (norsk tid, `world_today`), trukket på serveren første gang de vises og
  like hele dagen. Navn fra en fast liste med oppdiktede navn i SQL. Ingen kan trekke nye ved å laste på nytt.
- **Lønn** (andel av verkets utbytte, ikke kroner): `0,03 + 0,03 × (sum − 6) / 4`, altså 3 % (sum 6) til 6 % (sum 10).
  Bedre kandidat = dyrere. Ingen utbytte (verket står, aktivitet 0) = ingen lønn.

### 10.3 Mandatene – alle med en ekte ulempe (eierens svar 2)

Faktoren ganges inn på verkets del av det ordinære utbyttet. Lønnen trekkes etterpå.

| Mandat | Fordel | Ulempe | Startverdi |
|---|---|---|---|
| **Lønnsomhet** | Mer utbytte nå: × (0,92 + 0,04 × snittet av Drift og Økonomi), fra 0,96 til 1,10 | Verksjefen presser drifta: modernisering av verket koster **20 % mer og tar 25 % lenger**; når V0 er live, rammer strømsjokk og uro verket **25 % hardere** | |
| **Vekst** | Modernisering av verket koster **(10 + 3 × Drift) % mindre** (13–25 %) og tar **(10 + 4 × Drift) % kortere** (14–30 %) | Mindre utbytte nå: × 0,95 | |
| **Stabilitet** | Jevnere drift: når V0 er live, rammer strømsjokk og uro verket **(20 + 8 × Folk) % mildere** (28–60 %); i V2 kommer dårlige saker halvparten så ofte | Lavere topp: × (0,96 + 0,01 × Folk), fra 0,97 til 1,01 | |

Regneeksempler (andel av verkets utbytte, før hendelser):

| Verksjef | Mandat | Faktor | Lønn | Netto |
|---|---|---|---|---|
| Drift 5, Økonomi 4, Folk 1 (sum 10) | Lønnsomhet | 1,10 | 6,0 % | **+4,0 %**, men dyrere modernisering |
| Drift 3, Økonomi 3, Folk 3 (sum 9) | Lønnsomhet | 1,04 | 5,25 % | **−1,25 %** |
| Drift 1, Økonomi 2, Folk 5 (sum 8) | Lønnsomhet | 0,98 | 4,5 % | **−6,5 %** – feil mann på feil plass |
| Drift 5, Økonomi 1, Folk 2 (sum 8) | Vekst | 0,95 | 4,5 % | −9,5 % i utbytte, mot 25 % billigere og 30 % raskere modernisering |
| Drift 1, Økonomi 2, Folk 5 (sum 8) | Stabilitet | 1,01 | 4,5 % | −3,5 %, mot 60 % mildere hendelser når V0 er live |

Slik er det ment: Lønnsomhet lønner seg bare med en god kandidat og et verk som er ferdig modernisert; Vekst lønner seg
mens verket bygges opp (et stålkompleks på trinn 3 sparer ca. 4 mill. per modernisering mot ca. 0,6 mill. per dag i
tapt utbytte og lønn); Stabilitet lønner seg der hendelsene rammer hardt – den har **ingen reell gevinst før V0 er live**
(se 10.7).

### 10.4 Handlinger

| Handling | Regel |
|---|---|
| **Ansett** | Fra dagens tre kandidater, med et mandat. Ingen kostnad ved ansettelse; lønnen begynner neste utbytte. Høyst én verksjef per verk. |
| **Bytt mandat** | Høyst én gang per ekte uke per verk (som utbyttepolitikken, B-334). |
| **Avslutt** | Sluttpakke = 5 dagers lønn fra konsernkassa (regnet av snittet av de siste 7 dagenes lønn). Verket må vente **3 ekte dager** før en ny verksjef kan begynne – det stopper «ansett og avslutt» for å fiske kandidater. |
| **Selg verket** | Verksjefen går med salget, uten sluttpakke. |
| **Flytt verket** | Verksjefen blir med. |

### 10.5 Server og app

- **Tabeller:** `plant_managers` (user_id, plant_id, navn, drift, økonomi, folk, trekk, mandat, lønnsandel, ansatt,
  mandat_byttet, lojalitet 60 – brukes først i V3), `manager_candidates` (user_id, dag, plass 1–3, …), `manager_log`
  (user_id, dag, plant_id, faktor, lønn, kroner). RLS, ingen direkte tilgang.
- **Funksjoner** (`auth.uid()`, ikke gjester, tatt fra `anon`): `manager_candidates()`, `manager_hire(plant, plass,
  mandat)`, `manager_set_mandate(plant, mandat)`, `manager_dismiss(plant)`. Konsernkassa endres bare av serveren.
- **Utbyttet:** `pay_dividends` deler dagens utbytte på verkene med samme andeler som `dividend_from_state` (samme regel
  som regionandelene i V0-skyggen, `dividend_region_shares`), ganger verkets del med mandatfaktoren og trekker lønnen.
  Verksjefens faktor er en del av **det ordinære utbyttet** – K-1-programmene prises av utbyttet før hendelser og
  programmer, og det inkluderer verksjefen. Modernisering: `konsern_order` bruker prisen og tiden etter mandatet.
- **Konsernverdi** regnes som i dag (normalt utbytte uten verksjefens faktor), som for programmene (B-392): forskjellen
  viser seg i konsernkassa, ikke i en verdi som hopper når mandatet byttes.
- **Speil:** `game/dividend.ts` og `game/konsernWorld.ts` får mandatfaktor, lønn og moderniseringsregel med faste tall
  i testen mot SQL-en, som utbyttet i dag. Testspilleren (`balance.ts --konsern`) får en strategi med verksjefer.
- **App:** Konsern → Oversikt viser verksjefen i raden til hvert verk (navn, mandat, stjerner, netto per ekte dag). Et
  trykk åpner et ark med kandidatene (med netto anslag for verket før man ansetter) eller verksjefen (mandat, lønn,
  avslutt). Vises først når det første datterverket er ferdig bygget (B-180). Krever konto (B-149, regel 2 og 7).
- **Bryter:** `config.world.managers.enabled` (av). Tester med testkontoer i transaksjoner som rulles tilbake.

### 10.6 Akseptkriterier før V1 slås på (simulering + skygge)

V1 slås ikke på fordi koden virker. Før eieren avgjør, viser simuleringen (`balance.ts --konsern` og en ny
`programSim.ts --v1` over de samme konsernene som K-1-simuleringen):

1. **Ikke en automatisk oppgradering:** med tilfeldige kandidater er snittet av netto (faktor − lønn) per mandat
   omtrent null eller litt negativt; bare godt matchede kandidater gir pluss. Feil match skal kunne gi tydelig minus.
2. **Ingen dominerende strategi:** «verksjef på Lønnsomhet på alle verk» skal ikke slå «ingen verksjefer» med mer enn ca.
   2–3 % av utbyttet over et år, og skal tape mot et konsern som velger mandat etter situasjonen (Vekst mens det bygges,
   Lønnsomhet når verket er ferdig).
3. **Uten verksjef som i dag:** et konsern uten verksjefer får nøyaktig samme utbytte som før V1 (test).
4. **Fullt konsern:** netto effekt av gode verksjefer er merkbar, men ikke avgjørende – i størrelsesorden 0–3 mill. per
   ekte dag for ca. 30 mill. i utbytte.
5. **Ingen fisking:** avslutt + ny kandidat skal koste mer enn det gir (sluttpakke + 3 dager uten verksjef).

### 10.7 Avhengigheter og det som avgjøres i simuleringen

- **Stabilitet og Lønnsomhetens risiko trenger V0 live.** Uten hendelser har Stabilitet bare ulempen og blir aldri
  valgt. Er V0 ikke live når V1 bygges, åpnes Stabilitet først med V2 (færre dårlige saker), og Lønnsomhetens ulempe er da
  bare den dyrere moderniseringen.
- Tallene i 10.2–10.4 (faktorene, 3–6 %, rabattene, 5 dagers sluttpakke, 3 dagers karantene) justeres av
  akseptkriteriene, ikke etter følelse. Endres de, skrives det i en beslutning.

