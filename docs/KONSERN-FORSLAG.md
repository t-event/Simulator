# Forslag: konsernet i ekte tid (punkt 1, 2, 3 og 5 fra OKONOMI-KONTROLL avsnitt 16)

> **Historisk analyse.** Tallene og reglene her er slik de var da dokumentet ble skrevet; kassetaket ble fjernet i B-381, og gulvet gir bare tittelen – kjøp følger opptjent nivå (B-383). Slik spillet virker nå: `docs/STATUS.md`.

Status 29.9.2026: **eieren sa ja; bygget** som B-325 (nivåene), B-326 (kjøp fra konsernkassa), B-327 (aktivitetskravet)
og B-328 (mesterskapet, valg A). Simuleringen etter byttet står nederst (B-329). Tallene er regnet med
`konsern_forslag.py` (kladd, ikke i repoet) med de samme formlene som serveren bruker i dag (utbyttet i 051, bidraget i
061) og eksisterende byggetider (2/6/12 t, modernisering 4 t, utbygging 6 t).

**Prisene er endret siden (B-373, 30.9.2026):** stålverk 5 mill., storverk 20 mill., stålkompleks 60 mill. (en firedel
av forslaget under), fordi et kjøp tok hundrevis av dager å betale tilbake. Tabellene under er forslaget slik det ble
godkjent.

Målet for fasen: **Hovedverket avgjør hvor godt du driver industri. Konsernkassa avgjør hvor raskt du bygger imperiet.
Ekte tid styrer makten mellom spillerne.**

Tre spillertyper brukes i alle tabellene (alle starter fra null datterverk og tom konsernkasse):

| Type | Hovedverk | Bidrag til kassa | Spiller |
|---|---|---|---|
| Liten | 6 000 t/døgn, 1 500 kr/t | 4,5 mill./dag | 5 av 7 dager |
| Middels | 20 000 t/døgn, 1 100 kr/t | 11,0 mill./dag | 6 av 7 dager |
| Stor | 32 800 t/døgn, 3 000 kr/t (taket) | 38,4 mill./dag (dempet) | hver dag |

---

## 1. Konsernnivåer etter eiendeler, ikke kasse

### Problemet i dag

Titlene (Stålmagnat … Stålikon) regnes av «Verdi i spillet» = lokal kasse + verdien av verkene. Med kassetaket på 10 mrd.
stopper en ny spiller på ca. 35 mrd. (8 storverk på trinn 4) og kan aldri nå Stålfyrste – og dermed aldri kompleks,
trinn 5 eller flere plasser. Titlene avgjøres også av lokal kasse, som bryter B-190.

### Forslaget

Serveren regner **konsernnivået** av verkene den selv har solgt spilleren (se del 2). Hvert nivå krever et antall verk av
en type på minst et trinn. Kassa teller ikke. Nivåene gir de samme opplåsingene og de samme fagpoengene som titlene gjør i
dag, i samme rekkefølge, så ingenting i spillet må læres på nytt.

| Nivå | Tittel | Krav (verk ferdig bygget) | Åpner |
|---|---|---|---|
| 0 | (konsernet åpnet) | – | 6 verk (8 med «Større konsern»), stålverk og storverk, trinn 3 |
| 1 | Stålmagnat | 3 storverk på trinn 3 | trinn 4 |
| 2 | Stålfyrste | 6 storverk (eller kompleks) på trinn 4 | stålkompleks, +2 plasser |
| 3 | Stålkonge | 2 kompleks på trinn 3 | trinn 5 |
| 4 | Stålkeiser | 4 kompleks på trinn 5 | +2 plasser |
| 5 | Stållegende | 6 kompleks på trinn 5 | – |
| 6 | Stålgigant | 8 kompleks på trinn 5 | +2 plasser (14 med «Større konsern») |
| 7 | Stålkolosse | 10 kompleks på trinn 5 | trinn 6 |
| 8 | Stålmyte | 12 kompleks på trinn 6 | – |
| 9 | Stålikon | 14 kompleks på trinn 6 (fullt konsern) | – |

- Nivåene tas i rekkefølge, og et nivå går aldri ned (selger man verk, beholder man nivået).
- **Konsernverdien** (den serverkjente, B-320) brukes ikke som krav. Den inneholder kassa, og da kunne man «kjøpe» et nivå
  ved å spare i stedet for å bygge. Den står på topplista som før.
- **Topplista** viser tittelen fra nivået (i dag `title_of(equity)`), og ligaene som bruker verdi i spillet, står urørt.
- **Stormodellene på hovedverket** åpnes i dag ved Stålmagnat. De flyttes til den lokale grensen «25 mrd. i verdi i
  spillet», som er det de betyr i dag – da endres ikke lokaløkonomien.

### Eksisterende spillere (ingenting tas fra noen)

Nivået blir **det høyeste av** titlene de har i dag (fryses på serveren på byttedagen) og nivået verkene gir. Ingen mister
en tittel, en plass eller et trinn. Titlene kan etter byttet bare øke ved eiendeler.

| Spiller | Titler i dag | Nivå av verkene | Nivå etter byttet |
|---|---|---|---|
| Tuster | 6 | 7 (10 kompleks trinn 5) | 7 – får trinn 6 |
| Grane | 6 | 5 (7 kompleks trinn 5) | 6 |
| H4WK3N5 | 6 | 1 | 6 |
| Figen | 5 | 1 | 5 |
| GruberMogg67, Einmo | 3 | 0 | 3 |
| 2bajjas, The New Guy | 2 | 0 | 2 |
| Big Boss, enzo | 1 | 0 | 1 |
| Lord_Magni | 0 | 0 | 0 |

Nye spillere kan nå nivå 9 (to over dagens toppspillere) med samme regler som alle andre – se tidene i del 2.

---

## 2. Datterverk kjøpes fra konsernkassa, med nye priser

### Priser (forslag)

Dagens lokale priser (300 mill. / 1,2 mrd. / 3,6 mrd.) er satt for en kasse som fylles på minutter i spilltid. Konsernkassa
fylles i ekte tid (11 mill. om dagen for en middels spiller), så prisene må ned omtrent 15 ganger:

| | I dag (lokal kasse) | **Forslag (konsernkassa)** |
|---|---|---|
| Stålverk | 300 mill. | **20 mill.** |
| Storverk | 1,2 mrd. | **80 mill.** |
| Utbygging stålverk → storverk | 900 mill. | **60 mill.** (forskjellen, som i dag) |
| Stålkompleks | 3,6 mrd. | **250 mill.** |
| Modernisering, per trinn | 30 % av prisen | **30 % av prisen** (6 / 24 / 75 mill.) |
| Salg | 60 % av pris med trinn | 60 % av **den nye** prisen med trinn, inn i konsernkassa |

Byggetidene står som i dag (2/6/12 t, modernisering 4 t, utbygging 6 t). Forskningen «Oppkjøpsavdeling» (−15 %) og
«Standardverk» (−25 % på modernisering) beholdes – de er engangs kunnskap alle kan forske fram.

### Simulert tid fra null (ekte dager)

| Milepæl | Liten | Middels | Stor |
|---|---|---|---|
| Første stålverk | 8 | 3 | 2 |
| Første modernisering | 9 | 4 | 3 |
| Første storverk | 23 | 11 | 5 |
| 3 utviklede verk (trinn 3) = Stålmagnat | 65 | 34 | 16 |
| 6 utviklede verk = Stålfyrste | 102 | 60 | 28 |
| Første kompleks | 117 | 70 | 33 |
| 10 utviklede verk | 204 | 135 | 76 |
| 14 utviklede verk | 318 | 225 | 164 |
| Grane i dag (8 kompleks trinn 5) = Stålgigant | 288 | 200 | 104 |
| Fullt konsern (14 kompleks trinn 6) = Stålikon | 409 | 299 | 167 |

Flyt inn i konsernkassa (bidrag + utbytte) per ekte dag:

| | Dag 30 | Dag 60 | Dag 90 | Dag 180 | Dag 365 |
|---|---|---|---|---|---|
| Liten | 7,4 mill. | 13,0 | 16,6 | 26,3 | 38,5 |
| Middels | 18,5 | 25,7 | 30,6 | 41,3 | 50,0 |
| Stor | 53,9 | 63,1 | 67,7 | 77,4 (fullt) | 77,4 |

Forholdet stor/liten i flyt går fra 7,3× (dag 30) til 2,0× (dag 365): de små tar igjen, men de store er først. Et fullt
konsern gir ca. 39 mill. i utbytte per dag; resten er bidraget.

Andre prisnivåer som ble prøvd (middels spiller, fullt konsern): 15/60/200 mill. gir 242 dager (stor 133), 20/100/400 mill.
gir 456 dager, 25/120/500 mill. gir 566 dager. **20/80/250** gir ett års vei for en middels spiller til fullt konsern og
ca. et halvt år til dagens toppnivå, uten at første verk tar mer enn noen dager.

### Reservasjon og kø

- Et prosjekt **betales når det legges i køen**, ikke når det starter. Pengene går ut av kassa med én gang (ny post
  `prosjekt` i `treasury_ledger`), så de kan ikke brukes til bud samtidig. Kassa på Konsern viser «Bundet i prosjekter».
- Køen tar **inntil 3 prosjekter**; ett bygges om gangen (B-311 står). Et prosjekt i kø som ikke har startet, kan
  avbestilles med full refusjon. Et prosjekt som er i gang, kan ikke avbrytes.
- Serveren tar i mot bestillingen (`konsern_order`), sjekker plass, trinn, type og nivå, trekker kassa og skriver
  prosjektet inn i det lagrede spillet (samme mønster som overføringen i B-183: appen bygger videre på versjonen den får).
  En tabell på serveren holder verkene; `guard_projects` retter alt i lagringen som ikke stemmer med den.
- Salg går gjennom serveren (`konsern_sell`) og setter salgssummen inn i konsernkassa.

### Konto og overgang

- **Konto (KONTO.md):** kjøp av datterverk krever konto (eller gjest), fordi pengene er konsernkassa på serveren. Uten konto
  vises Konsern med `NeedsAccount`. Hovedverket krever aldri konto.
- **Lokal kasse:** gjøres **ikke** om til konsernkasse (B-190). Den brukes på hovedverket, salgsdirektøren og forskning som
  før. Taket på 10 mrd. og utbetalingen til eierne står.
- **Verk kjøpt før byttet** beholdes med trinn, men salg gir den nye prisen – ellers kunne 8 kompleks kjøpt med spilltid
  selges for 17 mrd. rett inn i konsernkassa.

---

## 3. Aktivitetskrav på utbyttet (myk modell)

En **aktiv dag** er en ekte dag der hovedverket har produsert (samme måler som bidraget, `production_days`). Det holder
med noen minutter spilling. Utbyttet (og gulvet i bidraget) ganges med en faktor etter hvor mange dager det er siden siste
aktive dag:

| Dager siden sist aktiv | Faktor |
|---|---|
| 0–7 | 100 % |
| 8–21 | ned jevnt til 50 % |
| 22–42 | ned jevnt til 0 % |
| over 42 | 0 % (verkene står, ingenting tas bort) |

- Første aktive dag etter et opphold gir 100 % igjen fra neste utbetaling. Ingenting går tapt, verkene står.
- **Bidraget** har i dag et gulv på 30 % for alltid (B-318). Gulvet ganges med samme faktor, så en konto som er forlatt,
  slutter å tjene etter seks uker.
- Hvor mye av utbyttet man får ved et opphold: 1 uke 100 %, 2 uker 93 %, 3 uker (fellesferie) 82 %, 4 uker 72 %,
  6 uker 53 %, 2 måneder 37 %.
- Spillemønster (middels, tid til fullt konsern): 6 av 7 dager 299 dager, bare helg 342, én dag i uka 378, tre ukers ferie
  hver tredje måned 324. En som slutter etter 60 dager, får 5 mill. dag 90 og ingenting dag 180.
- Alle med konsern i dag har vært aktive 29.9, så **ingen får mindre ved innføringen.**

---

## 5. Mesterskapets +30 % på utbyttet (konsekvenser, ikke bestemt)

«Konsernledelse» i mesterskapet kjøpes for fagpoeng (spilltid) og gir opptil +30 % utbytte i ekte tid. Det bryter B-323:
spilltid gir makt mot andre. Utbyttet per dag i dag, med og uten bonusen:

| Spiller (nivå i mesterskapet) | Med | Uten | Endring |
|---|---|---|---|
| Tuster (17) | 36,9 | 33,0 | −11 % |
| Grane (23) | 33,7 | 29,8 | −12 % |
| Figen (16) | 27,3 | 24,5 | −10 % |
| H4WK3N5 (16) | 25,9 | 23,2 | −10 % |
| GruberMogg67 (12) | 21,4 | 19,4 | −9 % |
| The New Guy (6) | 14,3 | 13,4 | −6 % |
| Big Boss (5) | 12,2 | 11,5 | −6 % |
| Lord_Magni (10) | 12,1 | 11,1 | −8 % |
| enzo (3) | 5,5 | 5,1 | −7 % |
| 2bajjas (8) | 4,0 | 3,4 | −15 % |
| Einmo (11) | 0 | 0 | – |

Tre valg:

- **A (anbefalt): flytt fordelen til hovedverket.** Nivåene beholdes; «Konsernledelse» gir i stedet opptil −30 % på
  administrasjonen på storverket (500 kr per tonn over 5 000 t, B-305), med samme kurve. Det er ca. 1–2 % av driften for
  toppspillerne, bare i spilltid. Utbyttet går ned 6–12 % for dem som har bonusen. Krever `balance.ts --storovn 330`.
- **B: fjern bonusen og gi fagpoengene tilbake.** Samme nedgang i utbyttet; fagpoengene kan brukes på andre mesterskap.
- **C: behold med tak +10 %.** Mindre nedgang (−3 til −8 %), men spilltid gir fortsatt makt i ekte tid.

Nedgangen er en reduksjon av inntekt, ikke av eiendeler; verkene og nivåene står.

---

## Rekkefølge når forslaget er godkjent

1. Nivåene på serveren (tabell, frys av dagens titler, `konsern_level`), topplista og appen leser nivået.
2. Kjøp fra konsernkassa: priser i `config.world`, `konsern_order`/`konsern_sell`, kø og reservasjon, `guard_projects`
   mot serverens verk, appen først (skjul lokale kjøp) og serveren etterpå.
3. Aktivitetskravet i `pay_dividends` og gulvet i `pay_contributions`.
4. Mesterskapet etter valget i del 5.
5. Ny verdenssimulering: liten/middels/stor etter 30, 60 og 90 dager, før Kontroll og overtakelser.

---

## Etter byttet: verdenssimulering 30, 60 og 90 dager (B-329)

Samme simulering som over, med de endelige reglene: priser 20/80/250 mill., kø med 3, aktivitetskravet og utbyttet uten
mesterskapet. «Dagens største» er Grane slik verkene står (7 kompleks trinn 5 og 1 på trinn 2, nivå 6 som gulv), som
kjøper videre med de nye prisene.

| Flyt inn i konsernkassa per ekte dag | Dag 30 | Dag 60 | Dag 90 |
|---|---|---|---|
| Liten (ny) | 7,4 mill. (1 verk) | 13,0 (3 verk) | 16,6 (5 verk, Stålmagnat) |
| Middels (ny) | 18,5 (2 verk) | 25,7 (6 verk, Stålmagnat) | 30,6 (8 verk, 2 kompleks, Stålfyrste) |
| Stor (ny) | 53,9 (7 verk, Stålfyrste) | 63,1 (10 verk, 3 kompleks, Stålkonge) | 67,7 (11 verk, 6 kompleks, Stållegende) |
| Dagens største | 72,8 (10 kompleks, Stålkolosse) | 76,4 (13 kompleks, Stålmyte) | 77,4 (fullt, Stålikon) |

| Forhold | Dag 30 | Dag 60 | Dag 90 |
|---|---|---|---|
| Stor / liten | 7,3× | 4,9× | 4,1× |
| Stor / middels | 2,9× | 2,5× | 2,2× |
| Middels / liten | 2,5× | 2,0× | 1,8× |
| Dagens største / ny stor | 1,35× | 1,21× | 1,14× |

Hva det betyr før Kontroll og overtakelser:

- **Hovedverket avgjør hvor godt du driver industri:** bidraget (margin og tonn) er det meste av flyten de første månedene,
  og det er det som skiller liten fra stor.
- **Konsernkassa avgjør hvor raskt du bygger imperiet:** en ny stor spiller når Stålfyrste på 4 uker og Stållegende på
  3 måneder; en liten spiller Stålmagnat på 2 måneder.
- **Ekte tid styrer makten:** avstanden krymper over tid fordi utbyttet dempes (imperiebelastningen), men den som spiller
  lenge og ofte, er foran. Dagens største blir ferdige (fullt konsern) på ca. 90 dager med de nye prisene – deres forsprang
  er 14–35 % i flyt, ikke flere ganger.
- Konsernkassa fylles av dem som er ferdige (ca. 77 mill. per dag uten noe å bruke det på). Det er det punkt 4
  (utbyttepolitikk) og Kontroll/overtakelser må gi et sluk for.
