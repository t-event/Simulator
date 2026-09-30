# Forslag: verksjefer for datterverkene (RETNING fase 5, B-379)

**Status:** forslag til eieren 30.9.2026. Ingenting er bygget. Svarene blir en beslutning, og så bygges det i
rekkefølgen i avsnitt 8.

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
- Av og til **ringer verksjefen** med en sak og to valg. Svarer ikke eieren innen et døgn, bestemmer verksjefen selv –
  etter personligheten sin.

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

**Hva det gir** (forslag, justeres med simulering før bygging):

- Lønnsomhet: verkets utbytte × (0,9 + 0,05 × snittet av Drift og Økonomi), fra −5 % til +15 %.
- Vekst: utbyttet × 0,95, men modernisering av verket koster 20 % mindre og tar 25 % kortere tid.
- Stabilitet: utbyttet × (1 + 0,02 × Folk), og dårlige saker kommer halvparten så ofte.
- Mandatet kan byttes én gang per ekte uke (som utbyttepolitikken).

**Lønn:** 3–6 % av verkets utbytte per ekte dag, etter stjernene. For et stålkompleks (ca. 6 mill. per dag) er det
0,2–0,4 mill. En god verksjef på Lønnsomhet (snitt 4–5 stjerner) gir ca. +0,6–0,9 mill. – altså ca. +0,4 mill. per dag
netto. For et fullt konsern (ca. 30 mill. per dag) blir det ca. 2–3 mill. per dag mer netto: merkbart, men ikke avgjørende
mot en som ikke bryr seg.

## 5. «Verksjefen ringer»

- Høyst **én samtale per konsern per ekte dag**, trukket blant verkene med verksjef. Eieren får beskjed i varsellinja.
- Hver samtale er et kort med to valg og en frist på 24 timer. Et kort vises ikke igjen på samme verk på 30 dager.
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

## 9. Spørsmål til eieren

1. **Forenklingen:** tre egenskaper og tre mandater i stedet for seks og fem (RETNING) – greit?
2. **Uten verksjef som i dag** (anbefalt), eller skal verk uten verksjef gi litt mindre, så alle må ta stilling?
3. **Lønn fra konsernkassa** hver ekte dag, 3–6 % av verkets utbytte – greit?
4. **Samtalene:** høyst én per ekte dag, 24 timers frist, ellers bestemmer verksjefen – greit? Eller sjeldnere?
5. **Kobling til Kontroll:** skal en god verksjef i en region gi litt Kontroll over selskaper i samme region (f.eks. +2)?
   Anbefaling: ikke nå – vent til V1–V3 virker.
