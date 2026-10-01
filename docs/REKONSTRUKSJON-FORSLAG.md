# Forslag: rekonstruksjon etter konkurs (B-409)

**Status:** designforslag til eieren 1.10.2026. Ingen modell er valgt og ingenting er bygget. Eieren velger; så blir
valget en beslutning, og simuleringen i avsnitt 6 kjøres før noe bygges.

## 1. Slik er det i dag

- Konkurs kommer når kassa er under kredittgrensen i **7 døgn på rad** (`BANKRUPTCY_DAYS`, telles ikke i sommerstansen,
  B-349), eller når ovnen trenger ny foring, banken ikke låner mer og verket står i **3 døgn** (`stuckDays`).
- Da settes `gameOver`, og sluttskjermen sier «Banken har tatt over verket». Eneste vei videre er **nytt spill fra
  garasjen**. Alt i hovedverket er borte: nivå, utstyr, folk, forskning, kasse.
- Det som overlever i dag, er det som ikke ligger i det lagrede spillet: kontoen, kallenavnet, topplister og rekorder på
  serveren, Hall of Fame og merker fra serveren. Konsernet (verkene, konsernkassa) eies av serveren og er knyttet til
  kontoen, ikke til hovedverket (B-325). **Må avklares før bygging:** hva som i dag skjer med konsernet på serveren når
  en konsernspiller starter nytt spill fra garasjen.

## 2. Premissene (eierens)

1. Konkurs skal gjøre vondt.
2. Det skal ikke være gratis gjeldssletting.
3. En spiller som har brukt måneder på et stort verk, bør ikke nødvendigvis sendes helt tilbake til garasjen.
4. Historie, prestasjoner og identitet bør i stor grad overleve.
5. Modellen må ikke kunne misbrukes som en optimal strategi.

I tillegg gjelder de faste reglene: hovedverket er spilltid (B-323), så rekonstruksjonen kan regnes lokalt – men den må
aldri gi penger, makt eller plass mellom spillere (konsernkassa, Kontroll, topplista på Konsernverdi), og alt nytt i
spilltilstanden trenger standardverdi i `migrate()`.

## 3. Hva som alltid overlever (felles for alle modellene)

- Kallenavn, konto, rekorder, Hall of Fame, sesongresultater, merker fra serveren.
- Prestasjoner og pynt (pynt kjøpt for fagpoeng og sesongpynt).
- Fagboka: kapitler lest og quizer tatt.
- Konsernet på serveren (verk, kø, konsernkassa) – urørt av konkursen i hovedverket.
- Et nytt merke/prestasjon «Rekonstruert» (bare synlig for dem som har det, som de skjulte seriene, B-296), og en linje i
  spillets historikk: «Konkurs dag 412, rekonstruert som stålverk».

## 4. Modellene

### A. Som i dag: ny start fra garasjen

Alt i hovedverket nullstilles; det i avsnitt 3 overlever. Enklest og helt umulig å misbruke – men bryter premiss 3: en
storverkspiller mister måneder.

### B. Ett nivå ned («banken selger det største»)

Verket flyttes **ett nivå ned** (storverk → stålverk, stålverk → støperi …). Utstyr som hører til det tapte nivået, er
solgt av banken. Utstyr som også finnes på nivået under, beholdes i grunnversjon (ikke oppgraderinger). Forskningen
beholdes. Kassa settes til et lite startbeløp for nivået; lånet slettes, men det kommer en **rekonstruksjonsgjeld** (se
avsnitt 5). Omdømmet halveres. De ansatte som ikke får plass på det mindre nivået, sier opp.

- Gjør vondt: tapt nivå og utstyr, halvt omdømme, gjeld som spiser av inntekten.
- Bevarer: forskning, kunnskap, identitet, og at man slipper garasjen.
- Risiko: må sikres mot «lån maks, kjøp forskning, gå konkurs» (forskning beholdes) – se avsnitt 5.

### C. Samme nivå, nedskalert drift («administrasjon»)

Verket blir på **samme nivå**, men banken selger alt utstyr ut over grunnpakken for nivået (én ovn, enkleste støping og
lager). Forskningen beholdes, men de **siste 30 døgns** forskning tas tilbake. Omdømmet halveres. Lånet slettes mot
rekonstruksjonsgjeld. Folk som ikke trengs, sier opp.

- Gjør vondt: mesteparten av utstyret og 30 døgns forskning, omdømme, gjeld.
- Bevarer: nivået (bygningen og retten til å kjøpe stort utstyr igjen), forskning fra før.
- Risiko: på storverket er grunnpakken fortsatt verdifull; må balanseres så det ikke er billigere å «gjøre konkurs» enn å
  selge utstyr selv.

### D. Gradert etter hvor dypt hullet er

Hvor langt ned man faller, avhenger av **gjelden ved konkurs mot verdien av verket**: et lite hull gir modell C, et stort
hull modell B, et svært stort hull (gjeld > 2 × verdien) modell A. Gjelden regnes som `−kasse + lån`, verdien som
utstyrets salgsverdi.

- Gjør vondt i forhold til hvor galt det gikk; mer rettferdig.
- Mer å forstå for spilleren, og mer å balansere. Krever at «verdien av verket» regnes likt overalt.

### E. Konsernet kan redde hovedverket

Har spilleren konsern, kan konsernkassa eller et salg av datterverk (til salgspris, `sisterSalePrice`, B-307) dekke
gjelden **før** konkursen inntreffer – et valg i de 7 døgnene banken venter. Ellers som en av modellene over.

- Gjør konsernet nyttig som sikkerhet og gir et ekte valg (makt i verden mot redning hjemme).
- Går på tvers av retningen: penger fra ekte tid (konsernkassa) inn i spilltid. Den andre veien er stengt med vilje
  (B-319, B-382). Denne veien kan gjøre konsernkassa til en forsikring for risikabel lokal drift, og krever derfor en egen
  vurdering uansett hvilken av A–D som velges.

## 5. Sperrene mot misbruk (gjelder B, C og D)

| Fare | Sperre |
|---|---|
| **Lån maks, bruk pengene på noe som beholdes, gå konkurs** (forskning, mesterskap, fagpoeng via forskningssamarbeid) | Alt som er kjøpt eller forsket fram de siste **30 døgnene** før konkursen, tas tilbake. Fagpoeng kjøpt for penger i perioden trekkes fra. |
| **Gjeldssletting** | Lånet slettes ikke gratis: **rekonstruksjonsgjeld** = en andel (f.eks. 50 %) av gjelden ved konkurs, betalt som en fast andel av omsetningen (f.eks. 10 %) til den er nedbetalt. Ny konkurs før den er betalt = modell A. |
| **Konkurs som snarvei** (raskere enn å selge utstyr selv) | Banken selger til lavere pris enn spilleren selv får (f.eks. 50 % av salgsverdien mot 60–70 %). Å selge selv er alltid bedre enn å gå konkurs. |
| **Gjentatt konkurs** | Rekonstruksjon høyst én gang per **30 ekte dager** (serverens klokke, `realNow()`); ellers modell A. Telles på serveren for kontoer, lokalt for spillere uten konto. |
| **Lister og konkurranser** | Rekonstruksjonen gir aldri noe i ekte tid: konsernkassa, Kontroll, Konsernverdi og sesongen er urørt. Lokale lister (verdi i eget verk) regnes som før – kassa og utstyret er jo mindre. |
| **Juksesperren** | Et lavere nivå og en mindre kasse er et «hopp ned». Serveren må kunne se at det er en rekonstruksjon (et eget felt i spillet), så tilbakespolingen (B-261) og sperrene ikke flagger den. |

## 6. Simuleringen før valg

Testspilleren (`balance.ts`) får en konkursstrategi: «lån maks, kjøp det som beholdes, gå konkurs» og «kjør risikabelt
og gå konkurs», mot «selg utstyr selv og hold deg flytende». For hver modell (B, C, D):

1. Ingen konkursstrategi skal nå neste nivå raskere enn den ærlige (medianen over frøene, som balansen ellers).
2. Tapet ved konkurs skal være klart større enn tapet ved å selge seg ned selv.
3. En storverkspiller som går konkurs, skal være tilbake der hen var etter omtrent like lang tid som det tok å komme fra
   nivået under (ikke fra garasjen) – eller lenger.

## 7. Det eieren velger

1. **Modell:** A (som i dag), B (ett nivå ned), C (samme nivå, nedskalert), D (gradert) – eller en kombinasjon.
2. **Rekonstruksjonsgjelden:** hvor stor andel av gjelden, og hvor stor andel av omsetningen den tar.
3. **Tilbakeføringen:** 30 døgn for kjøp og forskning – eller annen lengde.
4. **Hyppigheten:** én rekonstruksjon per 30 ekte dager – eller annet.
5. **Modell E** (konsernet redder hovedverket): vurderes for seg eller ikke i det hele tatt.

Konto (B-149): selve rekonstruksjonen krever ikke konto (hovedverket er lokalt). Telleren for hvor ofte (avsnitt 5)
holdes på serveren for kontoer.
