# Forslag: verdenskartet, Kontroll, overtakelser og utbyttepolitikken – og pengene hjemme (B-331)

**Status:** godkjent 29.9.2026 med svarene i B-332 (overtakelser inne i konsesjonen på 14 dager, fordel i
fornyelsesanbudet, 3× og 10× beholdes). Bygges i rekkefølgen i avsnitt 8. Tallene er regnet med `game/dividend.ts` (samme regel som
serveren), flyten fra verdenssimuleringen i B-329 og ekte tall fra serveren 29.9.2026. Simuleringen står nederst.

To spor:

- **Spor A – verden (ekte tid, serveren):** kartet, utbyttepolitikken, Kontroll og overtakelser. Dette er det som skal
  gi konsernkassa noe å brukes til når konsernet er fullt, og det som gjør at spillerne møter hverandre.
- **Spor B – hjemme (spilltid, appen):** pengene i hovedverket vokser uten ende. Det kan ikke løses av verden, for
  spilltid skal aldri gi makt over andre (B-323). Det må løses hjemme.

---

## 1. Hvor vi står (ekte tall 29.9.2026)

| | |
|---|---|
| Spillere med konsern på serveren | 12 (nivå 0–7; 3 har 8–11 komplekser) |
| Kassa hjemme | 5 av 12 står på eller like under taket på 10 mrd. |
| Utbetalt til eierne over taket (B-303) | 2,7–121,8 mrd. per spiller – penger som ikke kan brukes |
| Overskudd hjemme per spilldøgn (snitt siste 14) | 35–226 mill. |
| Tid til 10 mrd. igjen på 10× | 9–58 minutter |
| Strategiske selskaper | 3: skraplageret (eid, konsesjon til 13.10.), slagghåndteringen og verkstedet (bygget, slått av) |
| Skraplageret | vunnet for 200 mill. i anbud; anslått inntekt ca. 15 mill. per ekte dag |

Det betyr:

- **Hjemme** er det ingenting igjen å kjøpe, og det som kommer, kjøpes med én gang (spor B).
- **I verden** har de største snart fullt konsern (ca. 90 dager, B-329) og får da 60–80 mill. per ekte dag inn i
  konsernkassa uten noe å bruke dem på (spor A).

---

## 2. Verdenskartet – «anleggsbildet» for konsernet

### Idé

En **oppdiktet verden**, ikke et ekte land. Seks regioner rundt et hav, tegnet i samme stil som anleggsbildet:

| Region | Preg (bare tegning i første versjon) |
|---|---|
| Nordkysten | fjorder og havner |
| Jernåsen | fjell og gruver |
| Sørsletta | jordbruk og byer |
| Vestbukta | stor havneby |
| Østskogen | skog og elver |
| Øyene | øyer ute i havet – her kommer flyplassen først (senere) |

Navnene er vanlige ord, ikke steder som finnes. Flyplass og reise (fase 6 i RETNING) passer inn senere: hver region kan få
en flyplass, og reise mellom regionene gir mer informasjon og flere valg ved store saker.

### Hva kartet viser

- **Dine verk:** et lite symbol per datterverk (stålverk, storverk, kompleks) i regionen det står i. Bygges det, vises det
  som byggeplass. Trykk → samme ark som på Konsern i dag.
- **Andres verk:** samme symboler i en annen farge, med kallenavn og tittel (Stålmagnat …). Ikke tall om økonomien deres.
- **Strategiske selskaper:** ett merke per selskap i sin region, med eierens kallenavn og Kontroll som ord («sterk»,
  «stabil», «presset», «svak»). Pågående overtakelser vises med et eget merke – alle ser dem (RETNING fase 4).
- **Mobil:** kartet fyller bredden (som anleggsbildet), trykk på en region åpner lista over verk og selskaper der.
  Lista er også vei inn uten kartet (tilgjengelighet, små skjermer). **PC:** kartet til venstre, regionen til høyre.

### Region for verkene

- Nye verk: spilleren velger region når verket bestilles (standard: regionen med færrest av egne verk).
- Verkene som finnes: fordeles automatisk (etter id), og hvert verk kan flyttes én gang gratis de første 14 dagene.
- Første versjon: regionen har bare én virkning – **egne verk i samme region som et selskap styrker Kontrollen** over det
  (avsnitt 4). Det gir en grunn til å samle seg, uten flere tall å passe på.

### Gradvis synlighet og konto

- Kartet vises når konsernet er åpnet (samme sted som Konsern → Industrien i dag), ikke før.
- Det viser andre spillere, så det **krever konto** (KONTO.md). Uten konto: `NeedsAccount` på samme sted.
- Serveren: `region` i hvert verk i `konsern.plants`, og en funksjon `world_map()` som gir kallenavn, tittel, verk per
  region (type og om det bygges) og selskapene. Bare det som allerede står på topplista, er offentlig.

---

## 3. Utbyttepolitikken

I dag beholder hvert datterverk 30 % av driftsresultatet (`DIVIDEND.keep`), og resten går til konsernkassa. Forslaget gir
spilleren tre valg:

| Valg | Blir igjen i verkene | Hva det gir |
|---|---|---|
| **Ta ut** (som i dag) | 30 % | Mest til konsernkassa – kjøp, investeringer, angrep |
| **Balansert** | 50 % | Litt mindre i kassa, et forsvarsfond som vokser |
| **Bygg forsvar** | 70 % | Minst i kassa, fondet vokser raskt |

Det som holdes igjen utover 30 %, går til **forsvarsfondet** – penger som er bundet i datterverkene:

- Fondet teller **automatisk** som forsvar når et av selskapene dine angripes (inntil selskapets verdi per selskap). Det
  beskytter den som ikke rekker å svare i løpet av 72 timer.
- Fondet gir inntil +10 i Kontroll på alle selskapene dine.
- Fondet kan brukes til investeringer i egne selskaper (avsnitt 4), men **ikke** til nye verk, angrep eller hovedverket.
- Valget kan endres én gang per ekte uke. Fondet går aldri tilbake til konsernkassa (ellers er det bare en sparekonto).

Ingen ny valuta: det er kroner, og fondet er en del av konsernet (B-180). Alt regnes på serveren, i `pay_dividends`.

**Tall (dag 90, per ekte dag):**

| Profil | Utbytte i dag | Balansert: til kassa / fond | Bygg forsvar: til kassa / fond |
|---|---|---|---|
| Liten | 10,8 mill. | 14,2 / 2,4 | 10,8 / 5,8 |
| Middels | 18,6 | 27,7 / 2,9 | 24,2 / 6,4 |
| Stor | 29,4 | 63,1 / 4,6 | 57,6 / 10,1 |
| Størst (fullt) | 39,0 | 71,4 / 6,0 | 63,9 / 13,5 |

(«Til kassa» er utbytte og bidrag sammen. Imperiebelastningen demper, så å holde igjen koster mindre enn det ser ut som.)

---

## 4. Kontroll

Kontroll er **tilstanden til ett selskap** (0–100), vist som ord med én setning om hvorfor – ikke et tall man jager:
sterk (≥ 80), stabil (60–79), presset (40–59), svak (< 40).

| Del | Poeng | Forklaring til spilleren |
|---|---|---|
| Eier | 30 | Du eier selskapet |
| Aktivitet | 0–20 | Du har spilt den siste uka (`activity_factor`, B-327) |
| Investeringer | 0–25 | Penger du har satt inn i selskapet (avtagende: halvparten ved ca. 0,7 × verdien) |
| Egne verk i regionen | 0–10 | 2,5 per verk |
| Eiertid | 0–10 | 1 per ekte uke |
| Forsvarsfondet | 0–10 | Avtagende med fondets størrelse |
| Imperiebelastning | −5 per selskap utover det første | Mange selskaper er tyngre å holde |

**Investeringer** betales fra konsernkassa (eller fondet), går inn i selskapet og kommer aldri ut igjen – det er slukens
viktigste del. De gir også selskapet inntil +25 % inntekt (samme kurve), så de lønner seg sakte for den som beholder det.
En ny eier overtar investeringene (RETNING fase 4).

Verdien (V) av et selskap er 30 dagers inntekt, men minst det det sist ble solgt for. Skraplageret i dag: ca. 450 mill.

---

## 5. Overtakelser

Bare **strategiske selskaper** kan overtas – aldri datterverk eller hovedverket. Å miste det man har bygget selv, er for
hardt i et spill med fem venner.

**Gangen (ekte tid, serveren avgjør):**

1. **Undersøk** (gratis): se Kontroll-ordet og hva et bud minst må være.
2. **Bud:** angriperen binder minst verdien V fra konsernkassa. Budet er offentlig med én gang – alle ser det på kartet.
   Eieren får varsel i appen.
3. **Forsvar i 72 timer:** eieren kan binde kapital (fra kassa eller fondet), investere eller gjøre ingenting. Angriperen
   kan øke budet. Fondet teller automatisk.
4. **Utfallet** regnes når fristen er ute, uten tilfeldighet, og forklares for begge:
   - angrep = 60 × √(bud / V) × (0,5 + 0,5 × aktivitet) + 2,5 per egne verk i regionen (høyst 10)
   - forsvar = Kontroll + 40 × √(forsvarskapital / V)
   - bud og forsvar teller høyst 3 × V (kapital er sterkt avtagende, RETNING)
   - angriperen vinner hvis angrep > forsvar.

**Pengene (sluk):**

| Utfall | Angriperen | Eieren |
|---|---|---|
| Overtatt | Budet er betalt; 85 % går til den gamle eieren, 15 % forsvinner (rådgivere, gebyrer) | Får 85 % av budet og mister selskapet |
| Avverget | Får 90 % av budet tilbake | Får 95 % av forsvarskapitalen tilbake |

**Regler mot plaging (B-332):** ett aktivt angrep per spiller; samme selskap kan ikke angripes igjen på 14 dager etter et
forsøk. Overtakelser skjer inne i konsesjonen på 14 dager: ny eier er beskyttet de 3 første dagene, og budet må legges
senest 5 dager før konsesjonen går ut, så forsøket er avgjort før fornyelsesanbudet åpner. Den som tar over, får resten
av konsesjonen. I fornyelsesanbudet teller den sittende eierens bud Kontroll/5 % mer (inntil +20 %). Bryter i `config`,
som RETNING sier: testes med få spillere før den slås på.

**Hva det koster å ta skraplageret (V = 450 mill.)** – og hvor mange dagers flyt det er for en angriper (dag 90):

| Eieren | Kontroll | Forsvarer ikke | Forsvarer med 1 × V |
|---|---|---|---|
| Passiv (borte 3 uker, ingen investering) | 43 (svak) | 450 mill. (minstebudet): 27 / 15 / 7 / 6 dager | 760 mill.: 46 / 25 / 11 / 10 dager |
| Ny, aktiv, 2 verk i regionen | 56 (presset) | 450 mill.: 27 / 15 / 7 / 6 | 1 035 mill.: 62 / 34 / 15 / 13 |
| Aktiv, investert 1 × V, 4 verk, 10 uker | 86 (sterk) | 816 mill.: 49 / 27 / 12 / 11 | ikke mulig |
| Som over + fond 1 mrd. | 93 (sterk) | ikke mulig | ikke mulig |
| Aktiv, investert, men eier 3 selskaper | 71 (stabil) | 541 mill.: 33 / 18 / 8 / 7 | ikke mulig |

(Dager: liten / middels / stor / størst.)

Det betyr:

- Den som **passer på** selskapet sitt (spiller, investerer, har verk i regionen og svarer på et angrep), beholder det,
  også mot den rikeste. Den som er borte eller har tatt for mye, mister det.
- Et bud koster alltid minst verdien, så ingen kan kjøpe for en slikk. Den gamle eieren får 85 % – å bli overtatt er et
  tap av makt, ikke en katastrofe.
- De små kan også vinne: et passivt selskap kan tas av en liten spiller med en måneds flyt.
- Forsvarsfondet er forsikringen for den som ikke kan følge med i 72 timer.

### Flere selskaper

Med 12 konsern og ett aktivt selskap blir det kamp om én ting. Forslag: slå på slagghåndteringen og verkstedet (bygget,
slått av, B-253/B-256) når overtakelsene slås på, ett selskap per region etter hvert som det blir flere aktive spillere
(RETNING: «hvor mange bedrifter per antall aktive»).

---

## 6. Hvor konsernkassa går (når konsernet er fullt)

| Sluk | Fullt konsern (ca. 70–77 mill. per dag) |
|---|---|
| Investeringer i selskaper | 1 × V = 450 mill. per selskap gir «sterk» Kontroll (ca. 6 dager) |
| Forsvarsfondet | 6–13,5 mill. per dag etter valget |
| Angrep | 15 % av budet forsvinner ved seier, 10 % ved tap |
| Forsvar | 5 % av forsvarskapitalen |

Konsernkassa får da noe å brukes til hele tiden, og det er valg: ta ut, forsvare eller angripe.

---

## 7. Konto (KONTO.md)

| Funksjon | Krever konto? | Hvorfor |
|---|---|---|
| Verdenskartet | Ja | Viser andre spillere |
| Utbyttepolitikken og forsvarsfondet | Ja | Konsernkassa på serveren, ekte tid |
| Kontroll og investeringer | Ja | Mellom spillere |
| Overtakelser | Ja | Mellom spillere |
| Nabolagsprosjekter og byggetid hjemme (spor B) | Nei | Bare eget spill, spilltid |

---

## 8. Rekkefølge når forslaget er godkjent

1. **K5 – kartet (bare visning):** regioner, `region` i verkene, `world_map()`, kartet og lista (mobil og PC).
2. **K6 – utbyttepolitikken og forsvarsfondet:** valget på Konsern → Oversikt, fondet i `pay_dividends`, kortet.
3. **K7 – Kontroll og investeringer:** ordet og forklaringen på selskapskortet og kartet, investering fra kassa/fondet.
4. **K8 – overtakelser:** tabellen `takeovers`, bud, forsvar, utfall, varsler, med bryteren av. Testes med testkontoer i
   DO-blokker og en simulering med alle 12 før den slås på. Så slagghåndteringen og verkstedet.

Hvert steg er en egen PR med beslutning, endringslogg og test.

---

## 9. Spor B – pengene hjemme

Problemet: det tar 9–58 minutter på 10× å tjene 10 mrd., og alt nytt kjøpes med én gang. Pengene kan ikke flyttes inn i
verden (B-323), så det skader ikke konkurransen – men det gjør sluttspillet hjemme kjedelig. Et fullt storverk har
utstyr for ca. 3,5 mrd. (ovner 700 mill. hver, støpemaskiner 120, renseanlegget 400, resten ca. 1 mrd.).

Et rent pengesluk (høye faste kostnader) treffer feil: overskuddet varierer fra 35 til 226 mill. per døgn, så det som
merkes for den beste, gjør den svakeste nesten pengelens. Forslaget er derfor tre ting som gir **valg og noe å se**, ikke
bare kostnader:

### B1. Byggetid og innkjøring for store kjøp (anbefalt)

- Kjøp over 50 mill. bygges i 2–10 spilldøgn (etter pris), og bare **ett stort prosjekt om gangen** hjemme.
- Nytt utstyr kjøres inn: 70 % kapasitet første døgnet, opp til 100 % etter 5 døgn.
- Mens en ovn byttes, står den. Det blir et valg *når* man bygger (sommerstans, lav etterspørsel), ikke bare *om*.
- Anleggsbildet viser byggeplassen (stillas og kran), så man ser det man har kjøpt komme.

### B2. Nabolagsprosjekter – store, synlige kjøp for penger (anbefalt)

Prosjekter i byen rundt verket, bygd for penger hjemme, som står i bakgrunnen av anleggsbildet: idrettshall (1 mrd.),
kulturhus (2,5), bro over fjorden (5), ny skole (8), sykehus (15), og videre. Hvert gir en liten, varig fordel som passer
(færre naboklager, lettere å rekruttere, høyere gulv for omdømmet) og en prestasjon. Prisene stiger, så det alltid er noe
neste for den rikeste, og de tar byggetid (B1). Ingen påvirkning på andre spillere.

### B3. Slitasje og fornyelse (lett versjon)

Store anlegg får en tilstand som synker over ca. 180 spilldøgn. Fornyelse koster 20 % av prisen (ca. 4 mill. per døgn for
et fullt storverk – merkes ikke i kassa, men gir en jobb å gjøre). Lav tilstand gir flere havarier (samme vei som
`riskFactor`). Kan komme etter B1 og B2.

**Balanse:** B1–B3 må gjennom `balance.ts` (flink og nybegynner) og `--storovn 330`. Byggetiden må ikke gjøre de første
nivåene tregere – den gjelder bare kjøp over 50 mill. (storverket).

---

## 10. Spørsmål til eieren (besvart i B-332)

1. Er det riktig at **bare strategiske selskaper** kan overtas (ikke datterverk)?
2. Er **72 timer** forsvarstid og varsel bare i appen godt nok, eller trengs e-post først?
3. Skal den som **passer på** selskapet sitt kunne beholde det mot hvem som helst (som tallene over), eller skal den
   rikeste alltid kunne vinne med nok penger?
4. Regionnavnene over – passer de, eller vil du ha andre?
5. Spor B: B1 og B2 først, B3 senere?

---

## Simuleringen

Regnet med et lite skript mot `game/dividend.ts` (ikke i repoet). Profilene er de samme som i B-329, dag 90:
liten 3 storverk trinn 3 + 2 stålverk trinn 1; middels 6 storverk trinn 4 + 2 kompleks trinn 1; stor 6 kompleks trinn 5 +
5 storverk trinn 4; størst 14 kompleks trinn 6 – alle med begge felles funksjoner, begge konsernprosjektene, omdømme 100
og god kvalitet. Flyten inn i konsernkassa (16,6 / 30,6 / 67,7 / 77,4 mill. per dag) er fra B-329; bidraget er flyten
minus utbyttet. Kontroll og overtakelser er regnet med formlene i avsnitt 4 og 5 og V = 450 mill.
