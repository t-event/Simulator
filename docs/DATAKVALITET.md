# Datakvaliteten i tidslinjetallene (B-456)

Oversikten eieren ba om 1.10 (B-396, B-401): andel gyldige målinger, strøm per tonn over perioder med nok tonn og
leveringspresisjon per spiller. Grunnlaget er tidslinja 1.10–4.10.2026 (4 ekte dager). Spillerne står med nummer etter
tonn, ikke navn. Tallene påvirker fortsatt ingenting (B-396).

## 1. Dekning

| | |
|---|---|
| Rader i tidslinja | 4 052 fra 24 spillere |
| Med de nye tellerne (kWh, leveranser) | 3 547 (88 %) – de 505 uten er fra appen før oppdateringen 1.10 |
| Siste døgn | 1 959 rader, alle med tellerne (100 %) |
| Merknader fra vakten (`metric_note`) | 2, begge `ny_start` (nytt spill) – ingen tall er nullet som urimelige |

Konklusjon: tellerne virker, og vakten har ikke måttet gripe inn. To spillere har bare rader fra den gamle appen og gir
ingen tall ennå.

## 2. Strøm per tonn (`timeline_energy`, minst 5 000 t)

| | Storverk (16 spillere) | Små verk (5 spillere, nivå 1) |
|---|---|---|
| Tonn på 4 dager | 0,2–22 mill. t | 9–35 t |
| kWh per tonn | 260–326 | 1 022–1 112 |
| Gyldig (≥ 5 000 t) | alle 16 | ingen |

- **Per døgn** (norsk tid): 7–13 av de aktive storverkene har gyldig tall hver dag; spennet er 258–335 kWh/t.
- **Samme spiller fra dag til dag:** i snitt 10 kWh/t (3,7 %) mellom beste og dårligste dag, høyst 27 (11 spillere med
  minst to gyldige dager).
- **Mellom spillerne:** 260–326 kWh/t, ca. 25 %. Forskjellen kommer mest av utstyret (ovnstype og tilleggsutstyr).
- Små verk har induksjonsovn (ca. 1 000 kWh/t) og lager for lite til å bli gyldige – de kan ikke sammenlignes med
  lysbueovnene.

## 3. Leveringspresisjon (`timeline_metrics`)

| | Storverk | Små verk |
|---|---|---|
| Leveranser på 4 dager | 23–2 417 | 4–11 |
| Presisjon | 90,7–100 %, de fleste 97–99 % | 45–100 % |
| Reklamasjoner | 3 i alt | 3 i alt |

- **Per døgn:** snittet blant dem med minst 20 leveranser er 95,5–99,2 %.
- Med under ca. 50 leveranser gir én misligholdt kontrakt flere prosentpoeng – for lite til å rangere på.

## 4. Anbefalinger til eierens valg (B-396)

1. **Minstetonn:** 5 000 t holder for storverk (alle aktive når det på én dag). For en ukeskonkurranse er det romslig.
2. **Små verk:** ikke med i strøm per tonn (andre ovner, for lite stål). Skal de ha en konkurranse, bør den være egen
   (f.eks. presisjon med lavere krav), ikke samme liste.
3. **Absolutt eller forbedring:** variasjonen fra dag til dag (3,7 %) er av samme størrelse som en realistisk forbedring
   på en uke. En forbedringskonkurranse ville belønne tilfeldigheter. Anbefalt: **absolutt kWh/t blant storverk**, en uke
   om gangen, minst 5 000 t – og eventuelt forbedring først når det finnes flere ukers grunnlinje per spiller.
4. **Minste antall leveranser:** 50 per uke for presisjon (alle storverk har langt mer; små verk kommer ikke med).
5. **«Mer stål enn før»:** kan tas ut når en av konkurransene over er valgt (B-387).

Ingen av anbefalingene er bygget. Ny oversikt bør tas etter et par uker til, før konkurransene settes på.
