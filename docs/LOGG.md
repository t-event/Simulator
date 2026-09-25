# Arbeidslogg

Nyeste økt øverst. Hver økt: hva brukeren ba om, hva som ble gjort, hva som
ble testet, og hva som gjenstår.

---

## Økt 32 – 2026-09-25: tekstene i spillet

**Brukeren ba om:** Endre quiz-spørsmålet om analyse, og se over tekst i spillet så den gir mening.

**Gjort (B-059):** Gikk gjennom quiz, fagbok, forskning, beskrivelser, hendelser, tips, meldinger og skjermtekst.
Rettet utdaterte henvisninger (digel, «Foreslå billigste resept», lån under Forskning), dager/døgn, fagord uten
forklaring og desimalpunktum. Innleid planlegger virker uten automatikk-forskning.

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 159).

**Feil i publiseringen av #39:** kontrollrom-sjekken i `balance.ts` sammenlignet farten etterpå med farten
før et hendelseskort satte 1×. Rettet til å sammenligne med farten da kontrollrommet åpnet. Lærdom lagt i CLAUDE.md.

---

## Økt 31 – 2026-09-25: avbryte ordrer, flere forespørsler og reseptguide

**Brukeren ba om:** Avbryte ordrer med straff; flere ordrer å lage i garasje og verksted; gjennomgang av hvordan
man lager riktig resept når en ny kvalitet låses opp.

**Gjort:** B-056 (flere forespørsler, mest i kvaliteter man kan lage), B-057 (avbryt ordre), B-058
(reseptguide).

**Testet:** tsc, lint, balanse (8 / 26 / 66 / 159). I Node: guiden går gjennom alle stegene når spilleren gjør
dem; avbrutt ordre gir bot og omdømmetap. Playwright (iPhone 13): guide med «Vis meg», bekreftelse ved avbryt,
lenke i Resept-fanen, 390 px, ingen feil.

---

## Økt 30 – 2026-09-25: gjennomgang av koden

**Brukeren ba om:** Se over all kode og fiks feil.

**Gjort (B-055):** Fuzz-test av motoren (tilfeldige handlinger, invarianter, lagring) og klikk-gjennom av alle
sider på alle nivåer. Fire feil rettet (støpefeil solgt mot spillerens valg, ansettelse for fravær, ferdighet for
fraværende, natt-tipset).

**Testet:** tsc, lint, build, balanse (8 / 26 / 65 / 161), prosessmodellen (validate). Ingen krasj, NaN eller
konsollfeil; ingen horisontal scrolling.

---

## Økt 29 – 2026-09-25: fagpoeng, vikarer og automatikk som forskning

**Brukeren ba om:** For mange fagpoeng i støperiet; automatiske vikarer kom for sent; all automatikk skal låses
opp med fagpoeng; se over koden og fiks feil.

**Gjort:** B-052 (færre fagpoeng per charge, testspilleren tar quiz), B-053 (vikarer rett etter sykdom),
B-054 (automatikk som forskning, `AutoToggle`).

**Testet:** tsc, lint, balanse (8 / 26 / 67 / 149). I Node: gammel lagring beholder automatikken, nytt spill
starter uten; automatiske vikarer gir 0 timer med færre skift på 20 døgn. Playwright (iPhone 13): låste brytere
på Verket, Marked, Folk og Salg, forskningene vises, 390 px, ingen feil.

---

## Økt 28 – 2026-09-24: Marked og Forskning med underfaner

**Brukeren ba om:** Kortere og mer intuitive Marked- og Forskning-sider.

**Gjort (B-051):** Underfaner på begge sider, sammenfoldede beskrivelser og innstillinger, gruppert
forskningsliste, lenker fra Verket til riktig fane.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). Playwright (iPhone 13): Marked Skrap 1 118 px (før ca.
3 000), Forskning 1 304 px (før ca. 2 800), alle faner 390 px brede, tips åpner riktig fane, ingen feil.

---

## Økt 27 – 2026-09-24: vikarer når verket mangler folk

**Brukeren meldte (skjermbilde):** «Vikarene fungerer ikke. Skiftet går ned uansett?»

**Funn:** Vikarene dekket fraværet. Skiftet gikk ned fordi det manglet én støper for tre skift, og verket var
fullt (24 av 24 ansatte).

**Gjort (B-050):** Innleie av vikarer til plassene som mangler, tydelig tekst når verket er fullt, og visning
av ansatte som ikke står på skift.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). I Node: 2 → 3 skift med innleie, tilbake til 2 med varsel
etter 3 døgn. Playwright (iPhone 13) med fullt verk: knappen virker, tabellen viser «+ 1 innleid», 390 px.

---

## Økt 26 – 2026-09-24: hvilket skrap ovnen venter på

**Brukeren sendte:** Skjermbilder av ovn 1 som venter på skrap til lavkarbon (fra før B-048 var publisert).

**Gjort (B-049):** Varsel og tips sier hvilke skraptyper som mangler; Marked merker dem.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). I Node: med planlegger ingen stopp på 48 t; uten planlegger
sier varselet «Resepten trenger rent nyskrap». Playwright (iPhone 13): rent nyskrap merket under Marked, 390 px.

---

## Økt 25 – 2026-09-24: Lager-knappen og skrap til lavkarbon

**Brukeren meldte:** Lager-knappen på Verket går til Forespørsler; ovnen stopper fordi lavkarbon-skrapet ikke
kjøpes inn.

**Gjort (B-048):** Lager-knappen åpner Salg → Lager. Innkjøpet går videre når planleggeren er borte, og
grunnen vises når planleggeren ikke får kjøpt.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). I Node: planlegger på ferie gir ingen stopp; lite penger
gir riktig grunn. Playwright (iPhone 13): Lager og «Til salg» åpner Lager-fanen, vanlig Salg åpner
Forespørsler, ingen feil.

**Gjenstår:** Hvis ovnen fortsatt stopper hos brukeren, vil varselet nå si hvorfor.

---

## Økt 24 – 2026-09-24: Avløser og ryddigere Folk-side

**Brukeren ba om:** Allroundere skal ikke kunne være reparatør, skrapklasser eller murer; nytt navn «Avløser»;
Folk-siden mer intuitiv.

**Gjort (B-047):** Stedfortreder-logikken fjernet, rollen heter Avløser, Folk har fire underfaner.

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 135). Playwright (iPhone 13): alle fire faner, 390 px bredt og
høyst ca. 860 px høyt, ingen feil.

---

## Økt 23 – 2026-09-24: sekvenser og overgangsemner i strengstøpingen

**Brukeren påpekte:** Med to kvaliteter må støpingen vente med den ene kvaliteten, ellers blir det
overgangsemner som må skrapes.

**Gjort (B-046):** Strengstøpingen støper én kvalitet om gangen, venter på slutt av sekvens (30 min stopp)
eller bytter etter 90 min med skrapede overgangsemner. Tekst på Verket og tonn i Kvalitet-kortet.

**Testet:** tsc, lint, balanse (uendret). I Node med to kvaliteter: lysbueovn 525 t mot 584 t på 48 t, 8 t
overgangsemner; induksjonsovn uten tap. Playwright (iPhone 13): teksten på Verket, 390 px, ingen feil.

---

## Økt 22 – 2026-09-24: Salg, folk, lavkarbon og ny startovn

**Brukeren ba om:** Kortere og mer intuitiv Salg-side; vikarer som dekker støpere; skrapklasser og planlegger
som fikser lavkarbon; allroundere som flytter seg dit de trengs; liten induksjonsovn i stedet for digel;
rammeavtaler skjult til de er låst opp.

**Gjort:** B-043 (resept ved kvalitetsbytte, lavkarbon, allroundere som stedfortredere, vikarer synlige i
bemanningstabellen), B-044 (Salg med underfaner), B-045 (liten induksjonsovn i garasjen).

**Testet:** tsc, lint, balanse (8 / 24 / 63 / 136). I Node: lavkarbon-treff med riktig resept, automatisk
omlegging av resept, stedfortreder for reparatør. Playwright (iPhone 13): nytt spill med induksjonsovn, Salg-
faner (maks ca. 920 px høy i stedet for en lang rull), Folk med vikarer, 390 px, ingen feil.

---

## Økt 21 – 2026-09-24: strømavtalen og valg av forespørsler

**Brukeren ba om:** Vise hvor lenge strømavtalen varer, varsel når den går ut, avklare hvilken avtale som er
standard, og kunne sortere etter ønskede forespørselstyper.

**Gjort (B-042):** Spotpris er standard og det man går tilbake til; valg for automatisk fornyelse; nedtelling
og varsler. Salg: velg kvaliteter du vil ha forespørsler på, og sorter forespørslene.

**Testet:** tsc, lint, balanse (10 / 24 / 62 / 142). I Node: nattariff varsles 3 og 1 døgn før og går tilbake
til spotpris; med bare standard valgt kommer bare standard-forespørsler. Playwright (iPhone 13): strømkortet
og kvalitetsvalget i Salg, 390 px, ingen feil.

---

## Økt 20 – 2026-09-24: utstyr på ovn 2

**Brukeren meldte (skjermbilde):** Ovn 2 skal ha egen «utstyrsbutikk» som ovn 1.

**Gjort (B-041):** Knappen «Utstyr» vises på hver ovn. Butikken sier at ovnstype og utstyr gjelder alle ovnene.
Testet med Playwright (iPhone 13): knappen på ovn 2 åpner ovnsutstyret, 390 px, ingen feil.

---

## Økt 19 – 2026-09-24: to kvaliteter, fraværsvarsler, rammeavtaler og vikarer

**Brukeren ba om:** To kvaliteter samtidig med to linjer, varsel når noen tar ferie eller blir syk, faste
kontrakter som varer lenger senere i spillet, og meldte at skiftgangen gikk ned selv med vikarer.

**Gjort:**
- B-039: egen kvalitet og resept per ovn, bryter «To kvaliteter samtidig» og valg for ovn 2 på Verket,
  resept-faner, Salg viser hvilken ovn som lager hvilken kontrakt. Vikarer til alle er tilbake, automatisk
  innleie, varsel når vikarene går hjem. Ferie varsles som hendelse.
- B-040: rammeavtaler fra stålverket (nytt kort under Salg, `Agreements.tsx`).

**Testet:** tsc, lint, balanse (10 / 24 / 62 / 142, alle OK). I Node: automatisk innleie og varsel når vikarer
går hjem; to ovner med standard og armering samtidig. Playwright iPhone 13: Verket, Salg (signere
rammeavtale), Marked (resept-faner) og Folk (fravær), 390 px uten horisontal scrolling, ingen konsollfeil.

**Gjenstår:** Digel-spørsmålet (induksjonsovn i garasjen?) venter på svar fra brukeren.

---

## Økt 18 – 2026-09-24: «døgn siden omforing» for ny ovn

**Brukeren meldte (skjermbilde):** Ovn 2 var nylig kjøpt, men viste 62 døgn siden omforing.

**Gjort (B-038):** Ny ovn og ny ovnstype får omforingsdag = kjøpsdagen; gamle lagringer rettes med et
anslag ut fra antall charger. Testet i Node (kjøp dag 32 → «byttet dag 32»; gammel lagring → dag 22).

---

## Økt 17 – 2026-09-24: ny tilbakemeldingsrunde (pakke 1 av 5: start og varsler)

**Brukeren ba om:** Lang liste (se oppgavene i denne økta): murere på dagtid, raskere start, varsler og
tips, 1× etter popup, konkurs uten råd til omforing, omdømme i starten, reklamasjoner, kvalitetsingeniør,
Verket for lang, Marked uintuitiv, støpefeil, fagbok-kapitler, potte/porten, nattillegg, vedlikehold,
nestenulykke, søkere ved flytting, bryter for forespørsler, lang lagerliste, øseovnsoperatør, digel.
Delt i fem pakker.

**Pakke 5 (B-037):** Øseovnsoperatør i stedet for laborant, med prøver, legering, temperatur og sperret
stål. Balanse 10 / 24 / 62 / 138.

**Digel:** brukeren spurte om digelovn bare hører til aluminium. Svar i samtalen; ikke endret ennå.

**Pakke 4 (B-036):** potte, porten, nattillegg, «Les «kapittel»» fra Forskning, låst/skjult planlagt
omforing, varsel når reparatøren er borte, belønning og straff ved nestenulykke. Testet i Playwright.

**Pakke 3 (B-035):** Verket i underfaner med kompakt produksjonslinje (siden er ca. 20 % kortere, og alt
viktig står øverst), resept-editor med −/+ og forslagene Billigst og Sikrest, skrapklasser-info, pris på
kjøpsknapper, kortere lagerliste, automatisk håndtering av støpefeil. Testet i Playwright på iPhone 13.

**Pakke 2 (B-034):** Én reklamasjon per kontrakt, tålmodige små kunder, mer omdømme i garasjen,
kvalitetsingeniør måler lageret, realistiske frister og «blir ferdig ca. dag X», bryter for forespørsler,
søkere ved flytting, sjeldnere radioaktive kilder, støperiet 750 000 kr. Balanse 10 / 24 / 68 / 141.

**Pakke 1 (B-033):** Små første ordre, spoling om natta, engangstips, varsel ved tomt skraplager og
kreditt, 1× og klikksperre på kort, murere dagtid, nattillegg bare for skiftfolk, konkurs uten råd til
foring. Testet i Playwright: første tilbud 0,4–0,6 døgn, tips kl. 16:00, knappene sperret et øyeblikk,
1× etter kortet, natta på 11 s. Balanse 11 / 33 / 77 / 153.

---

## Økt 16 – 2026-09-24: «Hopp over» i veiledningen

**Brukeren meldte:** «Hopp over» hoppet over hele veiledningen, ikke bare til neste steg.

**Gjort (B-032):** «Hopp over steget» går til neste steg; «Avslutt veiledningen» fjerner den helt.

**Testet:** Playwright på iPhone 13: alle stegene kan hoppes over ett og ett til «Ferdig», og «Avslutt
veiledningen» fjerner kortet. Ingen konsollfeil.

---

## Økt 15 – 2026-09-24: fravær, influensa og vikarer

**Brukeren ba om:** Forslaget om fravær, med automatisk ferie, influensa der flere er borte, og valget
mellom å gå ned på skiftgangen eller leie vikarer.

**Gjort (B-031):** Fravær per ansatt (ferie og sykdom), allroundere som dekker, nytt influensakort,
vikarer under Folk, kort for fravær og varsel på Verket.

**Testet:** Node-test av fravær over 60 døgn (se B-031). Playwright på iPhone 13: fraværskortet viser syk
ansatt, tapt skift og ferie som kommer; vikarer i 1 døgn dekker fraværet. Balanse 12 / 31 / 73 / 150.
Ingen konsollfeil.

---

## Økt 14 – 2026-09-24: to potter per lysbueovn og murere

**Brukeren ba om:** To potter per lysbueovn, og murere som bygger opp den ene mens den andre er i bruk
(ca. fire døgn).

**Gjort (B-030):** Reservepott per lysbueovn, pottebytte på noen timer når den er klar, ny rolle Murer
(fire døgn med to murere per pott), visning i vedlikeholdskortet, varsel på Verket og nytt avsnitt i
fagboka.

**Testet:** Node-test med 0, 2 og 4 murere (se B-030). Playwright på iPhone 13: vedlikeholdskortet viser
reservepott, fremdrift og «Bytt pott nå». Balanse 12 / 36 / 74 / 144. Ingen konsollfeil.

**Gjenstår:** Brukeren vurderer forslaget om fravær (sykdom/ferie) der allroundere dekker opp.

---

## Økt 13 – 2026-09-24: bemanningstabellen var forvirrende

**Brukeren meldte (skjermbilde fra støperiet):** «Antall per skift stemmer vel ikke.» Tabellen viste
2 ovnsoperatører per skift, 1 ansatt og likevel 3 av 3 skift.

**Årsak:** Tallene var riktige, men tabellen viste ikke at allroundere fylte hullene (5 av 7 var
ovnsoperatører), og ansatte som ikke går skift (selger, planlegger, skrapklasser) var ikke med.

**Gjort:** Ny tabell: hvor mange som trengs for 3 skift (eller neste skift), hvor mange egne og hvor
mange allroundere som fyller plassene, og hva som mangler. Under står hvor mange allroundere som er i bruk,
ansatte som ikke går skift, og roller med flere enn skiftene trenger. Fordelingen regnes med samme
metode som bemanningen (`crewCoverage` i `plant.ts`).

**Testet:** Playwright på iPhone 13 med støperi på 3 og 2 skift; summene stemmer med antall ansatte.

---

## Økt 12 – 2026-09-24: «fryser» → «størkner»

**Brukeren meldte (skjermbilde av quizen):** Stål fryser ikke, det størkner.

**Gjort:** Rettet ordet i fagboka (støping), to quizalternativer og en melding i kontrollrommet.
Ingen andre forekomster.

**Lærdom:** Bruk fagordet «størkne» om stål som går fra flytende til fast.

---

## Økt 11 – 2026-09-24: skrapklasser og strengere quiz

**Brukeren ba om:** En skrapklasser som gir riktig skrapmiks til resepten. Feil svar på quiz skal gi
færre eller ingen poeng, uten ny sjanse.

**Gjort (B-029):** Ny rolle Skrapklasser. Uten en blir blandingen omtrentlig og erstattes med hva som
helst ved mangel. Med en følger chargen resepten, og dårlige lass sendes i retur. Quizen har ett forsøk
med fagpoeng etter antall riktige.

**Testet:** Playwright på iPhone 13: quiz med ett feil svar gir «1 av 2 riktige, +1 fagpoeng» og kan
ikke tas igjen; skrapklasser kan ansettes under Folk. Balanse 12 / 36 / 74 / 146. Ingen konsollfeil.

---

## Økt 10 – 2026-09-24: foringen varer for kort

**Brukeren meldte:** Foringen slites på ett døgn; ovnen bør holde minst sju døgn når alt går etter
planen. Valgene i menyen for planlagt omforing må fikses.

**Gjort (B-028):** Slitasjen per charge er satt ned så foringen holder ca. ni døgn døgnet rundt.
Omforing koster og tar mer til gjengjeld. Menyvalgene lages ut fra levetiden og viser hvor slitt
foringen er på den dagen. Planen bytter også ved 88 % slitasje.

**Testet:** Balanse 10 / 32 / 74 / 154, ingen konkurs. Playwright på iPhone 13: menyen viser «Hvert
5.–8. døgn» med slitasje, og teksten om levetid. Ingen konsollfeil.

**Gjenstår:** Følg med på lønnsomheten i storverket mot vinnergrensen.

---

## Økt 9 – 2026-09-24: vinnergrense, planleggerens grense og veiledet start

**Brukeren ba om:** Høyere vinnergrense. En grense for planleggeren, og et valg om den får handle på
kreditt. Veiledet start med mulighet for å hoppe over.

**Gjort (B-027):** Vinnergrensen er 1 mrd. kr. Planleggeren handler bare på kreditt hvis spilleren
tillater det, og kan få et tak per døgn. Veiledet start i sju steg med «Hopp over», og startskjermen har
valg med eller uten veiledning. Testspilleren er rettet for produktbytte ved ny støping og lavkarbon uten
øseovn (den gikk i bøter i stålverket), og reseptsjekken advarer om lavkarbon uten øseovn.

**Testet:** Playwright på iPhone 13: veiledningen gjennom stegene (kontrakt, skrap, første charge) og
«Hopp over», planleggervalgene i Marked. Planleggerens tak og kreditt testet i Node (taket 50 000 kr
holdt; uten kreditt holdt kassa seg rundt null). Balanse 10 / 32 / 83 / 161. Ingen konsollfeil.

**Gjenstår:** Følg med på om storverket blir for lønnsomt (testspilleren tjener ca. 10 mill. kr per
døgn der). Vurder flere spørsmål i quizene.

---

## Økt 8 – 2026-09-24: tilbakemeldingsrunde 2, tema A–G

**Brukeren ba om:** En lang liste forbedringer (se arbeidslisten i `docs/DESIGN.md`), med valg for
fagbok, strøm og planlegging (B-019).

**Gjort (tema A, B-020):** Tregere klokke, forespørsler med svarfrist og maks tre åpne, hardere
bot, nye hendelseskort uten gjentakelse, mottilbud på lønnskrav, bedre norsk i økonomikortet og
riktigere navn. Konsollfeil: ingen funnet.

**Testet:** Balansetest grønn (12 / 37 / 103 / 179), nettlesertest av forespørsler og lønnskort.

**Tema B (B-021):** Ordrekø med pilknapper, «Produseres nå», produksjonskort som følger køen,
resept per kvalitet, planlegger som sorterer køen og kjøper inn. Testet i nettleser og balansetest
(11 / 38 / 94 / 173).

**Tema C (B-022):** Foringen byttes ikke av seg selv lenger: knapp i nytt Vedlikehold-kort,
planlagt omforing via forskning, eller reparatør. Planlagt stans og havari skilles tydelig i
meldinger og straff. Testet på iPhone 13 (knappen bytter tekst, ingen horisontal scroll, ingen
konsollfeil) og balansetest (11 / 43 / 98 / 182).

**Tema D (B-023):** Gradvis opplåsing av faner, fart og skraptyper; utstyr kjøpes fra stedet i
anlegget på Verket; Bygg-fanen erstattet av Forskning; reseptsjekk med forklaring og «Foreslå billigste
resept»; nytt Kvalitet-kort. Testet på iPhone 13 (garasje og nivå 3): riktige faner, låst fart gir
forklaring, forslag setter resepten, utstyrsark åpner, ingen horisontal scroll, ingen konsollfeil.
Balanse 11 / 49 / 100 / 187.

**Tema E (B-024):** Strømavtale (spot, fastpris, nattariff med binding), effekttariff på døgnets
høyeste effekt, skiftplan med nattillegg under Folk, og hendelseskort om betalt utkobling. Testet på
iPhone 13 med et støperi på to skift: nattskift gir 15 % nattillegg og lavere strømpris, nattariff
binder avtalen i 30 døgn, ingen horisontal scroll, ingen konsollfeil. Balanse 12 / 44 / 104 / 185.

**Tema F (B-025):** Forskning krever at kapitlet er lest, quiz per kapittel med fagpoeng, oppdrag
fra fagboka med belønning, og rådgiver med spesialist ved gjentatte omdømmetap. Testet på iPhone 13:
quiz riktig gir +2 FP og åpner Forskning-fanen, feil svar viser forklaring og sperre til neste døgn,
«Les kapitlet» åpner riktig kapittel og låser opp forskningen. Rådgiveren testet i Node (spesialistene
virker). Ingen konsollfeil. Balanse 10 / 40 / 104 / 180.

**Tema G (B-026):** Trivsel med bonus og kurs per ansatt, tregere fagpoeng, testspiller med
prioritert forskning, sikkerhetskopi (last ned/hent) og mindre tegning på pause. Testet på iPhone 13:
bonus løfter trivselen 70 → 85 og låses i en uke, kurs låses etter bruk, sikkerhetskopi lastet ned og
hentet inn igjen fra startskjermen. Ingen konsollfeil. Balanse 10 / 32 / 101 / 185.

**Gjenstår:** Veiledet start de første minuttene (Claudes eget forslag). Følg med på om penger og
omdømme fortsatt føles skjevt i verkstedet, og om storverket blir for lønnsomt (flere testspillere
passerer 100 mill. kr før dag 240).

---

## Økt 7 – 2026-09-24: vanskeligere spill

**Brukeren ba om:** For mye penger i forhold til omdømme, for raske fagpoeng, spillet må være
litt vanskeligere (skjermbilde fra garasjen, dag 9).

**Gjort:** Faste kostnader per nivå, lavere pris på støpegods, dyrere nivåer, færre fagpoeng,
dyrere forskning, billigere messe (B-018). Nytt analyseflagg `--sperrer` i `balance.ts` viser når
penger og omdømme hver for seg holder til neste nivå, og hvor mye fagpoeng som ligger ubrukt.
Faste kostnader vises i «Neste nivå», i flyttefeiringen og i økonomikortet.

**Testet:** Balansetest grønn (13 / 36 / 89 / 169), 14 frø uten konkurs, typesjekk og lint rene.
Første forsøk var for hardt (konkurs i verkstedet) og ble justert.

**Gjenstår:** Følg med på om garasjen fortsatt føles for rik – der sperrer omdømmet fortsatt
litt før pengene (penger dag 6–9, omdømme dag 7–13).

---

## Økt 6 – 2026-09-24: kontrakter tar lengre tid

**Brukeren ba om:** «Det bør ta lengre tid å gjøre kontrakter. Det går altfor fort nå.»

**Gjort:** Kontrakter settes nå til 1,5–4 døgns produksjon (B-016). Kundenes største ordre er
hevet. Nytt analyseflagg `npx tsx src/game/balance.ts --kontrakter <frø>` viser snittid per kontrakt
per nivå.

**Testet:** Før → etter (min på 1×): garasje 0,6 → 5,3, verksted 0,9 → 2,5, støperi 1,1 → 5,0,
stålverk 3,7 → 5,4. Balansetesten grønn (Verksted dag 13, Støperi 27, Stålverk 77, Storverk 152),
ingen konkurs.

**Gjenstår:** Hvis hele spillet fortsatt føles for raskt, er neste grep å senke spillklokka
(`GAME_MIN_PER_REAL_S` i `data.ts`, i dag 1 døgn per minutt).

---

## Økt 5 – 2026-09-24: omdømmet ble vist avrundet opp

**Brukeren meldte (skjermbilde fra mobil):** «Omdømme 5 av 5» med rødt kryss, og knappen
«Flytt inn i verksted» var grå selv om pengene holdt.

**Årsak:** Omdømmet ble vist med `toFixed(0)`, så 4,6 så ut som 5, mens kravet sjekker den
eksakte verdien.

**Gjort:** Ny `fmtRep()` i `ui/format.ts` viser én desimal og runder alltid ned. Brukt i toppfeltet,
i «Neste nivå»-kortet og i målkortet på Verket. Kravlinja forklarer nå hva som mangler («lever
flere kontrakter i tide»). Kassa vises også rundet ned der den sammenlignes med en pris.

**Testet:** Playwright på iPhone 13 med omdømme 4,6: viser «4,6 av 5», knappen er grå, som den skal.
Typesjekk og lint rene.

**Lærdom:** Tall som sjekkes mot et krav må aldri vises avrundet opp.

---

## Økt 4 – 2026-09-24: Game Dev Tycoon-inspirasjon, mobilspill, minne, enkel styring

**Brukeren ba om:** Studere Game Dev Tycoon og hente inspirasjon. Det skal være
et mobilspill. Et system for å huske beslutninger og logge arbeid, og en
CLAUDE.md som minne mellom samtaler. Kontrollromstyringen må være så enkel at
en uten kunnskap klarer å kjøre manuelt.

**Gjort:**
- Studerte Game Dev Tycoon (søk; wiki-sidene var blokkert av nettverket) og skrev
  `docs/DESIGN.md` med hva vi tar over og hvorfor.
- Minnesystem: `CLAUDE.md`, `docs/LOGG.md`, `docs/BESLUTNINGER.md` (B-001–B-015), `docs/DESIGN.md`.
- **Enkel styring av kontrollrommet** (`src/ui/control/`): fire steg – smelt (mer/mindre strøm
  mens skrapmatingen varierer), rens (hold for oksygen), slagg av (ett trykk), tapp (i grønt
  vindu). Automatikk for resten, stjerner og forklaring etterpå, ca. 2 minutter. Full HMI som
  ekspertmodus. Dynamikken ble målt i prosessmodellen før designet ble valgt (se B-010).
- **Forskning og fagpoeng** (`src/game/research.ts`): 21 forskningsområder som låser opp utstyr,
  forbedringer og fagbokkapitler. Fagpoeng fra charger, kontrakter, egne charger og feil.
- **Hendelseskort** (`src/game/decisions.ts`): billig skrapparti, hasteordre, lønnskrav,
  avisintervju, bransjemesse, lærling, tilsyn. Spillet pauses til du velger.
- Flyttefeiring ved nytt nivå, bobler over anlegget (tonn, kroner, fagpoeng), én tydelig
  hovedhandling under anleggsbildet.
- **PWA:** manifest, ikoner (øse som heller stål), service worker (offline), stående format,
  vibrasjon på Android, ingen overscroll.
- Migrering av gamle lagringer (`migrate()` i `save.ts`).

**Testet:**
- `balance.ts`: alle nivåmål OK (Verksted dag 7, Støperi 25, Stålverk 65, Storverk 125),
  ingen konkurs; enkel styring: nybegynner 5★ på ~105 s, slurvete 1★.
- Playwright på iPhone 13: hele kontrollrommet kjørt i nettleseren («Perfekt charge!» på 99 s),
  hendelseskort, flyttefeiring, forskning, gammel lagring migrert, service worker aktiv og
  offline omstart virker.
- `validate.ts`, typesjekk, lint og bygg rene.

**Gjenstår / ideer:** se veikartet i `docs/DESIGN.md` (kundevurdering 1–10, markedstrender,
opplæring av ansatte, prestasjoner, lyd).

**Avslutning:** PR #3 til `main` opprettet etter brukerens ønske (PR #2 var allerede merget, så
de nye commitene ble flyttet over på nyeste `main` først). Lokale kopier av kildematerialet fra
tidligere økter er slettet etter brukerens ønske – det finnes ingen kopier igjen i miljøet, og alt
spillet trenger ligger som generiske tall i koden.

---

## Økt 3 – tidligere: fra simulator til tycoonspill

**Brukeren ba om:** Droppe simulatoren og lage et tycoonspill som erstatter
opplæringsverktøyet, med hele stålverket, fra en person i en garasje til et
stort verk med mange arbeidere. Økonomi, progresjon og hendelser fra tidligere forslag.

**Gjort:**
- Spillmotor i `frontend/src/game/`: skrap (7 typer), resepter, ovner (digel →
  induksjon → lysbue), støping (sand → blokk → streng), valseverk, lager,
  kontrakter med kvalitet og frist, spotsalg, strømpris over døgnet, ansatte og
  skift, omforing, hendelser, lån og kassekreditt.
- Fagbok med 16 kapitler.
- «Ta styringen» med full HMI og prosessmodellen.
- Automatisk testspiller i CI. Rettet dødsspiraler ved produktbytte, spotsalg
  som solgte emner valseverket trengte, og for skarp startresept.
- Relay, instruktørpanel og scenarioer fjernet.

**Testet:** Playwright på iPhone 13 og desktop, testspiller på 14 frø.

**Gjenstår:** PR til `main` for publisering (brukeren har ikke bedt om det ennå).

---

## Økt 2 – tidligere: kalibrering, GitHub Pages, de-identifisering, mobil

- Prosessmodellen kalibrert mot en conveyormatet lysbueovn; portet fra Python til TypeScript.
- Publisering på GitHub Pages; Python-backend fjernet; relay for flere maskiner.
- Alt identifiserende fjernet og git-historikken skrevet om (se B-002).
- Mobiltilpasning og gjennomgang av all kode.

## Økt 1 – tidligere: stålovnsimulator

- Første versjon av en simulator for lysbueovn med kontrollrom og instruktørpanel.
