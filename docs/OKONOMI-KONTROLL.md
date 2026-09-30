# Kontroll av økonomimodellen etter reform 2 og konsernbidraget (B-324, 29.9.2026)

> **Historisk analyse.** Tallene og reglene her er slik de var da dokumentet ble skrevet; kassetaket ble fjernet i B-381, og sesongen avgjøres på Konsernverdi (B-384). Slik spillet virker nå: `docs/STATUS.md`.

Eierens bestilling: «Kontroller om den nye økonomimodellen faktisk er på riktig spor. Ingen nye store endringer først;
konkrete tall og dagens faktiske logikk.» Tallene er fra koden (`konsern.ts`, `dividend.ts`, `reserve.ts`, `plant.ts`),
`config.world` på serveren og spillernes lagringer 29.9 (kallenavn). Simuleringen ligger i økta
(`okonomi_sjekk.py`), formlene er de samme som i 051 og 061.

## Faste tall som gjelder nå

| Hva | Tall |
| --- | --- |
| Fart | 1× = 12 spillminutter per sekund → ett spilldøgn per 2 min; 10× → ett spilldøgn per 12 s. 5 timer på 10× = 1 500 spilldøgn |
| Kassetaket | 10 mrd. Alt over betales ut til eierne (`paidOut`): en historikk og en liste, ikke penger |
| Datterverk | stålverk 300 mill (2 t bygging), storverk 1,2 mrd (6 t), kompleks 3,6 mrd (12 t). Utbygging 900 mill (6 t). Modernisering 30 % av prisen per trinn (4 t): 90 mill / 360 mill / 1,08 mrd. Ett prosjekt om gangen. Alt betales fra **kassa i spillet** |
| Grenser | 6 verk (8 med «storkonsern»), +2 ved Stålfyrste, Stålkeiser og neste. Trinn 3 (+1 ved Stålmagnat, Stålkonge, og etter Stållegende). Kompleks krever Stålfyrste. Titlene gis av «Verdi i spillet» (kasse − lån + verkenes verdi): 25, 50, 100, 200, 400 mrd |
| Konsernkassa (server, ekte tid) | + hovedverkets bidrag (50 % × normal spilldag × margin ≤ 3 000 kr/t, aktivitet 0,3–1, kvadratrot over 30 mill) + utbytte (grunntall 0,5/2/6 mill × trinn og bonuser, 70 % løftes, 1/(1+0,1·plass), flaggskip +20 %, kvadratrot over 10 mill) + inntekt fra selskap man eier. Innskudd = 0 |
| Konsernkassa brukes til | bare bud på selskaper (`place_bid`). Ingenting annet |
| Skraplageret | 50 kr/t × alle andres tellende tonn (én normal spilldag per spiller): 14,2 mill per dag nå (18 aktive). Anbud hver 14. dag, bud 1 mill–923 mill (14 dagers anslag); vunnet 29.9 for 200 mill |
| Utbytte per ekte dag (alle bonuser, mesterskap 0) | 1 kompleks trinn 5: 12,3 mill · 3: 20,3 · 6: 27,2 · 10: 32,9 · 14: 37,0. Storverk trinn 5: 5,0 / 11,7 / 15,7 / 19,0 / 21,3. 14 komplekser trinn 5 uten bonuser: 29,2 |

## 1. Toppverk på 10× i 5 ekte timer (Grane-tall: 32 800 t, 219 mill per spilldøgn, margin over taket)

- **Lokal kasse:** 1 500 spilldøgn × 219 mill = **329 mrd brutto**. Kassa stopper på 10 mrd; resten (319 mrd) blir
  «utbetalt til eierne». Kassa fylles fra 0 til taket på **9 minutter** på 10×.
- **Konsernkassa:** +38,4 mill i bidrag (én full normal dag, dempet fra 49,3) + 30–34 mill i utbytte = **ca. 70 mill**.
  Nøyaktig det samme som etter 30 minutter.
- **Konsernverdi (topplista):** + ca. 70 mill per dag i flyt, uavhengig av spilletid. «Verdi i spillet» står stille
  (kassa i taket, verkene uendret til et prosjekt er ferdig).
- **Finansiering av verk:** ingen forskjell. Alle prosjekter koster ≤ 3,6 mrd og kassa er alltid full; det eneste som
  begrenser, er 2–12 timer ekte tid per prosjekt.

## 2. Samme verk, 30 minutter samme dag

| Område | 5 timer på 10× | 30 min på 10× | Faktisk fordel for 5-timersspilleren |
| --- | --- | --- | --- |
| Lokal progresjon | 1 500 spilldøgn | 150 spilldøgn | Reell: 10 × flere charger, kontrakter og fagpoeng → mesterskap (opp til +30 % utbytte, +10 % pris), prestasjoner, ukens utfordring |
| Konsernkapital | +70 mill | +70 mill | **Ingen** (bidraget teller høyst én normal spilldag; utbyttet er per ekte dag) |
| Datterverk | ett prosjekt per 2–12 t | samme | **Ingen** (tid, ikke penger, begrenser når kassa er over ~3 mrd) |
| Strategiske selskaper | bud fra konsernkassa | samme | **Ingen** |
| Framtidig PvP/makt | utbytte + bidrag | samme | **Indirekte, avgrenset:** mesterskapet «Konsernledelse» kjøpes for fagpoeng fra spilltid og gir inntil +30 % utbytte (Grane har nivå 23 → +27 %) |

Med 30 min på **1×** (15 spilldøgn, 3,3 mrd) er alt konsern fortsatt likt, men kassa fylles saktere – det merkes
bare hvis man kjøper komplekser i kø (3,6 mrd per 12 t).

## 3. Pengestrømmen slik den faktisk er

```
   SPILLTID (mobilen, 1×–10×)                                  EKTE TID (serveren)
 ┌────────────────────────────────────────────┐              ┌───────────────────────────────────────────┐
 │ produksjon ──► lokal kasse (tak 10 mrd) ───┼── (A) ─────► │ bidrag: 0,5 × normal dag × margin,        │
 │      │               │                      │  én normal   │   aktivitet 0,3–1, √ over 30 mill/dag     │
 │      │               ├─ utstyr, folk,       │  spilldag    │                                           │
 │      │               │  forskning, direktør │  per ekte    │ utbytte fra verkene: per ekte dag,        │
 │      │               │                      │  dag         │   √ over 10 mill/dag ◄──────────────────┐ │
 │      │               ├─ (B) datterverk og   │              │                                          │ │
 │      │               │  modernisering ──────┼── ett ───────┼──► verkene (type, trinn) ────────────────┘ │
 │      │               │  (fra lokal kasse!)  │  prosjekt    │                                           │
 │      │               │                      │  om gangen   │ inntekt fra selskap man eier (50 kr/t)    │
 │      └─ over taket ──► «utbetalt» (liste)   │  (2–12 t)    │        │                                  │
 │                                             │              │        ▼                                  │
 │ fagpoeng ──► mesterskap (+30 % utbytte) ────┼──────────────┼──► KONSERNKASSA ──► bud (eneste sluk)     │
 └────────────────────────────────────────────┘              └───────────────────────────────────────────┘
```

| Begrensning | Type |
| --- | --- |
| Kassetaket 10 mrd | kunstig tak (spilltid) |
| Bidraget: høyst én normal spilldag per ekte dag, margintak 3 000 kr/t, kvadratrot over 30 mill | ekte tid + kunstig tak |
| Utbyttet per ekte dag, kvadratrot over 10 mill | ekte tid + kunstig demping |
| Ett prosjekt om gangen, 2–12 t | ekte tid (serverens klokke) |
| Antall verk, trinn og komplekser (titler etter «Verdi i spillet») | **spilltid** – og nå et hardt tak (pkt. 9) |
| Bud: 1 mill–14 dagers anslag; konsesjon 14 dager | ekte tid + kunstig tak |
| Prisen på verk og modernisering | spilltid (kassa) – ikke bindende over ~300 mill per spilldøgn |

## 4. Når kassa treffer taket

Videre overskudd blir `paidOut`: teller ikke i konsernverdien, kan ikke brukes, gir bare lista «Utbetalt til eierne»
og en prestasjon. Alle toppspillerne står der (Grane 90 mrd, Tuster 120 mrd utbetalt).

Grunner til å drive hjemmeverket etter det: bidraget krever én normal spilldag med god margin (ikke mer), fagpoeng
til mesterskapet (som løfter utbyttet), ukens utfordring, prestasjoner, kontrollrommet. **Økonomisk: nei.** Utover ett
normalt spilldøgn per ekte dag gir driften ingenting som teller.

## 5. «10 mrd i kassa + lite konsernkapital»

Ja – det er nå normaltilstanden: 2bajjas 10,0 mrd / 10 mill, enzo 10,1 mrd / 10 mill, GruberMogg67 10,0 / 10. Det er
riktig etter regelen (kassa er driftskapital, konsernkassa fylles i ekte tid), og bidraget gjør at konsernkassa vokser
fra nå. Det er god design bare hvis ingenting i verden avhenger av kassa. Det gjør det fortsatt (pkt. 8 og 9).

## 6. Dagens tall etter 10×-nedskaleringen

| Post | Tall |
| --- | --- |
| Daglig innskudd | **0** (slått av 29.9, B-319); erstattet av bidraget 0–38 mill per dag (nye storverk 4–5 mill, middels 11–23, toppen 37–38) |
| Utbytte, komplekser trinn 5 | 1: 12,3 · 3: 20,3 · 6: 27,2 · 10: 32,9 · 14: 37,0 mill per dag (med mesterskap 23: ca. +27 %) |
| Skraplageret | 14,2 mill per dag til eieren (18 aktive spillere) – vunnet for 200 mill; 14 dager gir ca. 200 mill: ingen gevinst |
| Anbud | min 1 mill, tak 923 mill, 9 budgivere, vinner 200 mill; kapital bundet 48 t, taperne får budet tilbake |
| Kapital per 30 dager | nytt konsern 0,3 mrd · middels 0,8 · stort 2,1 (uten bud) |

## 7. Ekte tid med ett prosjekt om gangen

| | Stålverk (2 t) | Storverk (6 t) | Kompleks (12 t) |
| --- | --- | --- | --- |
| 1 → 3 verk | 4 t | 12 t | 24 t |
| 3 → 6 | 6 t | 18 t | 36 t |
| 6 → 10 | 8 t | 24 t | 48 t |
| 10 → 14 | 8 t | 24 t | 48 t |
| 14 verk til trinn 5 | 280 t = 11,7 d | 11,7 d | 11,7 d |
| Alt (14 verk + trinn 5) | 12,8 d | 15,2 d | 18,7 d |
| Pris i alt | 10,5 mrd | 42 mrd | 126 mrd |

Kompleksene krever Stålfyrste, 10 verk Stålfyrste, 12 Stålkeiser, 14 tittelen etter; trinn 4 Stålmagnat, trinn 5
Stålkonge.

## 8. Lang prosjektkø fra en stor kasse?

Ja. Over ca. 300 mill per spilldøgn er penger aldri bindende (10× fyller kassa på minutter), så en spiller med full
kasse er garantert vekst i tempoet 2–12 t per prosjekt. De andre begrensningene er antall verk, trinn og komplekser –
og de styres av titlene.

## 9. Ett-prosjekt-regelen og de som alt har mange verk

Grane og Tuster har titler 6 (14 verk, trinn 5, komplekser), bygget på to dager før B-311 med den gamle økonomien.
En ny spiller kan **aldri** komme dit: «Verdi i spillet» = kasse (høyst 10 mrd) + verkenes verdi (60 døgns overskudd).
8 storverk trinn 4 med alle bonuser er verdt 25,5 mrd → høyeste mulige verdi er ca. 35 mrd → **Stålfyrste (50 mrd) er
uoppnåelig**. Da får den nye aldri komplekser, aldri mer enn 8 verk, aldri trinn 5. Utbytte: 8 storverk trinn 4 gir
16,5 mill per dag mot 33–37 for de etablerte. **Det er en permanent fordel, og den skyldes ikke ett-prosjekt-regelen,
men at titlene fortsatt måles på spilltidsverdien etter at kassetaket kom.** Uten dette taket ville en ny toppspiller
nådd 14 komplekser trinn 5 på 19 ekte dager.

## 10. Simulering 30/60/90 ekte dager (uten bud, ett prosjekt om gangen, kjøp fra lokal kasse, dagens regler)

| Spiller | Dag | Konsernkasse | Verk (trinn i alt) | Flyt/dag | Lokal kasse | Titler | Konsernverdi (server) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Liten: nytt storverk 6 000 t, 1 500 kr/t, 30 min på 3×, 5 av 7 dager, 1 mrd, 0 verk | 30 | 0,32 mrd | 4 (12) | 14,7 mill | 0,8 mrd | 0 | 1,2 mrd |
| | 60 | 0,80 | 6 (18) | 16,5 | 5,1 | 0 | 1,8 |
| | 90 | 1,29 | 6 (18) | 16,0 | 10,0 | 0 | 2,3 |
| Middels: 20 000 t, 1 100 kr/t, 1 t på 10× daglig, 5 mrd, 3 storverk trinn 2 | 30 | 0,82 | 8 (32) | 27,5 | 10,0 | 1 | 2,5 |
| | 60 | 1,64 | 8 (32) | 27,5 | 10,0 | 1 | 3,3 |
| | 90 | 2,47 | 8 (32) | 27,5 | 10,0 | 1 | 4,1 |
| Stor (Grane): 32 800 t, 3 t på 10× daglig, 10 mrd, 7 kompleks trinn 5 + 1, Stålkonge | 30 | 2,14 | 10 (50) | 71,4 | 10,0 | 3 | 6,4 |
| | 60 | 4,28 | 10 (50) | 71,4 | 10,0 | 3 | 8,6 |
| | 90 | 6,42 | 10 (50) | 71,4 | 10,0 | 3 | 10,7 |
| Stor, 30 min på 1× daglig | 30/60/90 | **identisk** med raden over | | | | | |
| Ny toppspiller (samme verk som Grane, 0 datterverk, Stålmagnat) | 30 | 1,63 | 8 (32) | 55,0 | 10,0 | 1 | 4,9 |
| | 90 | 4,92 | 8 (32) | 55,0 | 10,0 | 1 | 8,2 |

Strategiske selskaper: ett (skraplageret), 14,2 mill per dag til eieren, anbud hver 14. dag. Kapital bundet: bare
budet i 48 t (200–900 mill), ingenting i prosjekter (de betales av lokal kasse).

## 11. Vokser forskjellen?

Forholdet stor/liten i konsernkasse faller fra 6,7× (dag 30) til 5,0× (dag 90) på grunn av kvadratrotdempingen, men
den absolutte avstanden vokser: 1,8 → 3,5 → 5,1 mrd. Mot en **ny toppspiller** er avstanden 16 mill per dag for
alltid (71 mot 55), fordi den nye er låst til 8 storverk (pkt. 9) – **det er matematisk umulig å hente inn**, allerede
før Kontroll. Rettes titlene, blir flyten lik etter ca. 19 dager, og avstanden fryser på 0,5–1 mrd i konsernkasse.
Det er hentbart med bud og Kontroll.

## 12. Late-game-kostnader som finnes i dag (per spilldøgn, toppverk)

Grane/The New Guy (31–32 000 t): skrap 109–132 mill, energi 6–8, forbruksvarer 7, lønn 2,6–3,2 (inkl. salgsdirektør
2–4 mill), vedlikehold 2,6, nett 1,6, faste 0,2 – i alt ca. 130–150 mill mot 360–370 mill i inntekt. Administrasjon
500 kr/t over 5 000 t (13,6 mill på 32 000 t, B-305) er med i «faste» i appen fra 28.9; disse to lagringene har eldre
app. Miljøbøter, vinterstrøm (+), krig (dyrere strøm), foring og havarier kommer i tillegg. Datterverkene koster
ingenting (30 % beholdes internt). Konsernkassa har ingen kostnader. Ingen lån.

## 13. Hva 1, 5 og 10 mrd kan brukes på nå (uten flere datterverk)

- **1 mrd:** modernisering (90 mill / 360 mill / 1,08 mrd per trinn), utbygging stålverk → storverk 900 mill, felles
  innkjøp 150 mill, salgskontor 250 mill, salgsdirektør 250 mill + «Salgsteam» 500 mill, likestrømsovn 420 t 700 mill,
  strengstøping 8 strenger 120 mill, renseanlegg, nedbetaling av lån.
- **5 mrd:** «Kundenettverk» 2 mrd, ett kompleks (3,6 mrd, krever Stålfyrste), 3–4 kompleks-trinn.
- **10 mrd:** «Eksportkontor» 8 mrd (+5 % pris) – det eneste enkeltkjøpet i den størrelsen. Mesterskap og pynt koster
  fagpoeng, ikke kroner. Bud betales fra konsernkassa, ikke fra kassa.

## 14. Står hjemmeverket bare og skriver penger?

Ja. Et fullt automatisert verk gir 100–220 mill per spilldøgn, treffer taket på minutter, og alt videre er
en teller. Bidraget bruker bare én normal dag av det. Utover kassetaket anbefales:

1. **Kjøp av datterverk og modernisering betales fra konsernkassa (ekte tid), ikke fra kassa i spillet.** Det er den
   siste lekkasjen fra spilltid til makt, og det gir konsernkassa et sluk. Prisene må da ned til verdens tempo (i dag
   3,6 mrd for et kompleks mot 70 mill i flyt per dag – ca. 50 dager; storverk 1,2 mrd ≈ 17 dager; trinn ≈ 5 dager).
   Lokal kasse blir da ren driftskapital: ovner, folk, forskning, direktør, renseanlegg.
2. **Titlene og grensene regnes av serverens konsernverdi (eller antall verk/trinn), ikke «Verdi i spillet»** – ellers
   er komplekser og 10–14 verk låst for alle nye (pkt. 9). Kan gjøres uten å ta noe fra de som har titlene.
3. **Aktivitet på utbyttet** som på bidraget (gulv 30 %): i dag får en spiller som aldri åpner spillet, 33–37 mill per
   dag i 14 dager. Passiv makt er i strid med «ekte aktive dager».
4. **Utbyttepolitikk (25/50/75 %)** som valg med kostnad, når 1–3 er inne – det gir en grunn til å tenke på hjemmeverket.

## 15. De tre største svakhetene nå

1. **Titlene er uoppnåelige med kassetaket** – nye spillere kan aldri få komplekser, 10–14 verk eller trinn 5, og de
   etablerte har en permanent 2× fordel i utbytte.
2. **Datterverk kjøpes for spilltidspenger.** Det er den ene igjenværende veien fra 10× til makt (via utbytte og
   Konsernverdi), og det gjør at all kasse over ~3 mrd er meningsløs.
3. **Konsernkassa har ett sluk (bud på ett selskap, tak 923 mill, ingen gevinst ved 200 mill)** og fylles med
   15–70 mill per dag også for passive spillere. Den hoper seg opp uten valg, og utbyttet har ingen aktivitetskrav.

## 16. Før Kontroll og overtakelser

Rekkefølge: (1) titlene/grensene på serververdi – må; (2) verk og modernisering fra konsernkassa med priser i verdens
tempo – bør, for da er både «Verdi i spillet» og prosjektkøen frikoblet fra spilltid, og Kontroll kan bygge på én
kapitalstrøm; (3) aktivitet på utbyttet – bør; (4) utbyttepolitikk – kan vente.

## Vurdering mot regelen (B-323)

«Spilltid gir kunnskap, optimalisering og lokal progresjon. Ekte tid styrer akkumulering av kapital og makt som påvirker
andre spillere.»

**Oppfylt** for konsernkassa, bidraget, utbyttet, bud og byggetida: 5 timer og 30 minutter gir identisk resultat i alt
som teller mellom spillere (simuleringen viser det). **Brudd** på tre steder:

1. Datterverk og modernisering (kapital som gir utbytte og plass på lista «Konsernverdi») betales av spilltidspenger.
   I dag er det tidsbegrenset, ikke pengebegrenset, så lekkasjen er liten – men den finnes, og for spillere under
   ~300 mill per spilldøgn er 10× fortsatt veien til flere verk.
2. Titlene (som styrer antall verk, trinn og komplekser = makt) måles på «Verdi i spillet», en spilltidsverdi – og er
   nå i praksis frosset for alle nye.
3. Mesterskapet (fagpoeng fra spilltid) gir inntil +30 % utbytte og +10 % pris. Avgrenset, men det er spilltid → makt.
