# Forslag: konsernkapital etter fullt konsern (B-386)

**Status:** designforslag til eieren 30.9.2026. Ingenting er bygget, og ingen tall i verden er endret. Eieren valgte
modell B (avsnitt 9); spesifikasjonen av K-1 står i `K1-PROGRAMMER.md` (B-389).

**Eierens svar (B-387):**
1. **To aktive programmer av fem** (ikke tre). Navnene vurderes når mekanikken er ferdig («Kapasitet og vekst» passer
   dårlig for et konsern som alt har 14 verk – f.eks. «Driftsytelse»).
2. **Skeptisk til 0,5 / 1,5 / 4 mrd. som permanent sunk cost.** Store permanente trinn og tap ved bytte gjør at man finner
   de to beste programmene og aldri rører dem – et nytt oppgraderingstre. Før K-1 bygges: simuler **A** (dette forslaget)
   mot **B** (aktivt programbudsjett: etableres i prosjektlinja, løpende budsjett på lav/middels/høy satsing, bundet i
   f.eks. 14–30 ekte dager, det som er brukt refunderes ikke, men ingen milliarder brennes ved bytte). Sammenlign kasse
   etter 180/365/730 dager, hvor mye programmene konkurrerer med oppkjøp om kapitalen, om liten spiller kan delta, om stor
   spiller må velge, og hvor ofte et fornuftig bytte skjer. Finn nivåene i simuleringen.
3. **Fordelene skal ikke bare være penger.** Programmene flytter hva konsernet er godt på; ingen er riktig for alle hele
   tiden. Vær særlig forsiktig med et rent «betal → mer utbytte»-program.
4. **Bytte:** med budsjettmodellen – etableres i prosjektlinja, høyst to aktive, minst 14 dagers binding, endring tar ekte
   tid, det som er brukt refunderes ikke.
5. **Oppkjøp:** retningen er riktig, men ingen formelendring før ekte data. Forberedelsen skal **ikke** avsløre kjøper og
   mål for eieren: undersøkelse/forberedelse → offentlig oppkjøpsbud → 72 timers motbud. Regional styrke skal gjøre kapital
   mindre avgjørende, ikke være én binær regel.
6. **Selskaper:** ca. 1 per 4 aktive konserneiere, minst 1, geografisk fordelt, ulik nytte, serveren foreslår og eieren
   godkjenner manuelt. Ikke automatisk ennå. Sjekken 2.10 gjelder før slagghåndteringen.
7. **Eierutbytte:** vent (enig i kritikken).

Rekkefølge (eieren): Ukens kontrollrom → sjekken 2.10 → simulering av programmodellene → valg av modell → verksjef V1 →
flere selskaper etter spillerbasen → oppkjøpsendringer etter ekte data → eierutbytte langt senere. Bygger på
simulatoren (`worldSim.ts`, STATUS.md avsnitt 8) og eierens premiss:

> **Penger skal gi valg. De skal ikke forsvinne fordi vi trenger å få et tall ned.**

Ikke med i forslaget (eierens beskjed): høyere priser på datterverk, lavere bidrag eller utbytte, tak på konsernkassa,
tilfeldige skatter eller avgifter.

## 0. Kort fortalt

1. **Problemet er ikke inntekten, men at pengene ikke koster noe.** Etter fullt konsern (dag 19–68) går 93–100 % av
   inntekten rett i kassa, fordi det ikke finnes noe å bruke den på. Penger uten alternativ bruk har null
   «alternativkostnad» – derfor blir det rasjonelt å bruke dem på hva som helst, også en oppkjøpskrig som ødelegger verdi.
2. **Løsningen er konkurrerende gode bruksområder**, ikke sluk: noen få, store konsernprogrammer i den samme
   prosjektlinja som i dag bygger verk (én om gangen), flere strategiske selskaper som er verdt ulikt for ulike spillere,
   og verksjefer som gjør 14 verk til noe man leder.
3. **Oppkjøp må avgjøres av mer enn saldoen.** I dag vinner et maksbud alltid over det beste forsvaret. Når begge har
   10+ mrd., er det bare tempo og saldo som skiller. Forslaget: oppkjøp krever forberedelse i prosjektlinja, regional
   tilstedeværelse og ledelse – men ingen formelendring før vi har ekte oppkjøpsdata.
4. **Frivillig eierutbytte:** kan passe, men ikke nå. Det er bare et ekte valg når det finnes andre gode ting å bruke
   pengene på; ellers blir det et pengesluk med et finere navn.

Anbefalt rekkefølge: (1) ekte oppkjøpsdata og sjekken 2.10, (2) konsernprogrammene (K-1), (3) verksjef V1, (4) flere
selskaper etter aktive spillere og regioner, (5) oppkjøp med forberedelse, (6) eventuelt eierutbytte.

## 1. Situasjonen i tall

| | Liten | Middels | Stor | Legacy (12 verk) |
|---|---|---|---|---|
| Ferdig utbygd | dag 68 | dag 46 | dag 33 | dag 19 |
| Inntekt per ekte dag når fullt | ca. 40 mill. | ca. 52 mill. | ca. 67 mill. | ca. 61 mill. |
| Konsernkassa etter 1 år | 11,8 mrd. | 16,7 mrd. | 22,4 mrd. | 21,1 mrd. |
| Andel av inntekten brukt, år 2 | 0 % | 0 % | 0 % | 0 % |
| Maksbud (1,7 mrd.) man har råd til etter 1 år | 6 | 9 | 13 | 12 |

Det finnes i dag fire ting å bruke konsernkassa på etter fullt konsern: anbud på det ene aktive selskapet,
investering i Kontroll, oppkjøpsbud/motbud og flytting (én gang per verk). Alle er knyttet til ett eneste selskap.

## 2. Designmål

Med 3 mrd. i kassa skal spilleren tenke: *«Jeg har flere gode ting jeg kunne brukt dette på. Hva er smartest nå?»*

Det betyr:

- **Få, store valg.** Et valg koster en betydelig del av kassa og ekte tid. Ikke 20 små «+5 %».
- **Ekte avveininger.** A gir noe B ikke gir, og omvendt. Hva som er best, avhenger av situasjonen (region, konkurrenter,
  hendelser i verden, egne verk), ikke av en fasit.
- **Ingen endelig sjekkliste.** Det skal ikke gå an å kjøpe alt én gang og stå med samme problem seks måneder senere.
- **Å holde penger er også et valg** – en krigskasse for anbud og motbud er en strategi, ikke en feil.
- **Alt i ekte tid på serveren** (B-190, B-323). Spilltid hjemme påvirker ikke dette.

## 3. Konsernprogrammer: kapitalallokering i konsernet (K-1)

### 3.1 Prosjektlinja fortsetter

Regelen «ett stort konsernprosjekt om gangen, inntil 3 i kø» (B-311, `konsern_orders`) gjenbrukes. Når verkene er
bygget, går linja fra *bygg nytt verk* til *utvikle konsernet*. Samme kø, samme byggetid i ekte tid, samme
avbestilling. Det gjør at et program koster to ting: **penger og en plass i linja**. Å kjøre et program betyr at du ikke
bygger, moderniserer eller forbereder et oppkjøp samtidig (se 5.3).

### 3.2 Fem programmer, to aktive om gangen

Konsernet kan ha **høyst to programmer aktive**. Et program har trinn 1–3 (dyrere for hvert trinn). Å bytte ut et aktivt
program mot et annet tar tid (programmet trappes ned over f.eks. 14 ekte dager) og gir ikke pengene tilbake. Det er det
som gjør det til et valg, ikke en handleliste.

| Program | Gir | Koster / ulempe | Passer når |
|---|---|---|---|
| **Kapasitet og vekst** | Mer utbytte fra alle verk (f.eks. +6/+10/+13 %) | Mer belastning: verkene er mer utsatt for driftsstans, og flere selskaper tynger Kontrollen mer | Du vil maksimere inntekt og tåler risiko |
| **Vedlikehold og robusthet** | Færre og kortere driftsstans, jevnere utbytte, halvparten så mange dårlige saker hos verksjefene | Ingen ekstra inntekt i gode perioder | Du har mange verk og vil ha forutsigbarhet |
| **Marked, eksport og logistikk** (velg én region) | Verkene i valgt region gir mer, og konsernet står sterkere i regionen (tilstedeværelse, se 5.3) | Bundet til én region; bytte region = nytt program | Du satser på en region – og kanskje et selskap der |
| **Teknologi og effektivitet** | Lavere energikostnad i datterverkene; demper strømsjokk (krig, vinter) | Gir mest når strømmen er dyr, lite ellers | Når verden har dyr strøm eller du venter det |
| **Arbeidsmiljø og kompetanse** | Bedre verksjefkandidater, høyere lojalitet, færre streiker og ulykker | Ingen direkte inntekt | Når du har verksjefer og vil lede godt |

Tallene er eksempler og må simuleres før bygging (`worldSim.ts` får programmene som valg).

### 3.3 Hvorfor dette ikke blir en ny sjekkliste

1. **To plasser for fem programmer:** du kan aldri ha alt. Valget påvirker hvilke selskaper, regioner og verksjefer som
   passer deg.
2. **Verden endrer seg:** krig og vinter gjør Teknologi verdifull noen måneder; et nytt selskap i en region gjør Marked
   der verdifullt; mange oppkjøpsforsøk gjør Robusthet og tilstedeværelse verdifulle. Da lønner det seg å bytte – og
   bytte koster tid og penger.
3. **Trinn 3 er dyrt med avtagende gevinst:** f.eks. 0,5 / 1,5 / 4 mrd. For et fullt konsern med ca. 60 mill. per dag er
   trinn 3 over to måneders inntekt. Det skal føles som en stor beslutning.
4. **Ikke evig vekst:** effektene er prosent av det verkene gir, med tak. Programmene gjør konsernet *annerledes*, ikke
   bare større.

### 3.4 Hva det koster i verdensøkonomien

Pengene som brukes på programmer, går ut av verden – men fordi spilleren får noe for dem og velger dem selv, er det
kapitalallokering, ikke et sluk. Et fullt program (to programmer på trinn 3) er ca. 11 mrd. – i samme størrelse som et
år med oppsparing for en liten spiller. Mer enn nok til at pengene får en alternativkostnad, uten at noen blir fratatt noe.

## 4. Verksjefer i denne fasen

Planen i `VERKSJEF-FORSLAG.md` avsnitt 0 står: Drift/Økonomi/Folk, Lønnsomhet/Vekst/Stabilitet med ekte avveininger,
ca. 2–3 saker per uke, 48 timers frist, ingen Kontroll i første versjon.

Rollen i kapitalbildet:

- **Verksjefene er ledelse, ikke avløp.** 2–3 mill. netto per dag er småpenger mot 40–70 mill. inn. Det er riktig: de
  skal gjøre det interessant å lede 14 verk.
- **Kobling til programmene** (ikke penger): mandatet og programmet kan trekke i samme retning eller mot hverandre.
  Vekst-mandat + Kapasitetsprogram = mye inntekt og mange dårlige saker; Stabilitet + Robusthet = jevnt og kjedelig
  trygt. Arbeidsmiljø-programmet gjør kandidatene bedre.
- **Sakene kan koste kapital** når det gir mening («fornye ovn 2 for 30 mill. eller risikere en uke halv drift»), men
  aldri som en fast skatt.

## 5. Strategiske selskaper og oppkjøp

### 5.1 Dagens regler, regnet ut

Skraplageret: verdi V = 171 mill. (10 dagers inntekt, ca. 17 mill. per dag).

- **Største angrep:** 60 × √10 = 190 poeng (aktiv spiller, maksbud 10 × V = 1,7 mrd.), + inntil 10 for egne verk i
  regionen = **200**.
- **Største forsvar:** Kontroll 100 + 40 × √3 = **169**.
- Et maksbud slår altså alltid det beste forsvaret, også uten verk i regionen (B-337: eieren skal alltid kunne miste
  selskapet). Vernet for ny eier er 3 dager, og det er ingen pause etter et forsøk (B-373).

### 5.2 Scenarioet eieren ba om: to fullt utviklede spillere, begge med 10+ mrd.

- A kjøper skraplageret med maksbud (1,7 mrd.). Etter 3 dager byr B maksbud. A kan ikke forsvare seg (169 < 190) og
  får oppgjøret: dagene som er igjen × 17 mill. + 85 % av det A investerte, høyst 85 % av budet – typisk 0,3–0,7 mrd.
- Etter 3 nye dager byr A tilbake. Hver runde koster angriperen 1,7 mrd. og gir eieren tilbake en del; **ca. 1 mrd. går
  ut av verden per bytte**, og selskapet tjener bare 17 mill. per dag. Et bud betaler seg på 100 dager, men eierskapet
  varer 3.
- **Hvem vinner?** Den med størst saldo og mest tålmodighet – ingenting annet. Etter ett år har en stor spiller råd til
  13 slike bud, etter to år 27.
- Hvorfor skjer det? Fordi pengene ikke har noen annen bruk. I en økonomi med gode alternativer ville ingen brenne
  1 mrd. hver tredje dag for 17 mill. per dag.

### 5.3 Hva som bør skille en god industriell strategi fra størst saldo

Ingen formelendring nå – vi vil ha ekte oppkjøpsdata først. Men retningen for neste runde:

1. **Forberedelse i prosjektlinja.** Et oppkjøpsbud krever et prosjekt «Forbered oppkjøp» (f.eks. 3 ekte dager) i
   konsernets kø. Det koster en plass i linja (ikke bygging eller program samtidig), og eieren ser at noen forbereder seg
   og kan ruste seg. Et raskt motangrep er ikke mulig – den som vil ta tilbake, må også forberede seg.
2. **Regional tilstedeværelse teller mer enn penger ved taket.** Angrep over et visst bud skal bare kunne vinne med
   tilstedeværelse i regionen (egne verk, Marked-programmet der). En spiller uten noe i regionen kan by, men ikke vinne
   over en eier som har bygget seg opp der. Da betyr *hvor* man har bygget noe.
3. **Integrasjon.** Et overtatt selskap gir mindre de første ukene, med mindre kjøperen har verk i regionen eller et
   passende program. Det gjør ping-pong ulønnsomt og belønner den som faktisk vil drive selskapet.
4. **Samme par, ikke alle:** en tidligere eier kan ikke by tilbake på samme selskap i f.eks. 14 dager, men andre kan.
   Det stopper ping-pong uten å gi eieren et skjold mot alle (B-337 holder).
5. **Ledelse:** på sikt kan en verksjef eller programmet Arbeidsmiljø gi selskapet mer Kontroll (ikke i V1).

Til sammen gjør dette at kampen om et selskap avgjøres av **forberedelse, region, program og ledelse** – og budbeløpet
er inngangsbilletten, ikke hele svaret.

### 5.4 Flere selskaper uten å oversvømme spillerbasen

I dag: 3 typer (skraplager aktiv, slagghåndtering og verksted venter), én global bedrift om gangen, slått på for hånd.
19 aktive spillere siste uke, 12 med konsern.

**Forslag: antall aktive selskaper følger aktive konsern, fordelt på regioner.**

- **Mål:** omtrent ett aktivt selskap per 4 aktive konserneiere (aktiv = serverens aktivitetskrav, B-327), minst 1, høyst
  6 (én per region). I dag: 12 konsern → 3 selskaper.
- **Region:** nye selskaper åpnes i regionen der flest spillere har verk uten et selskap. Da blir selskapene verdt mest
  for dem som faktisk er der, og ulike spillere vil ha ulike selskaper – ikke alle det samme.
- **Ulike typer, ulik nytte:** skraplager (inntekt), slagghåndtering (inntekt + utslipp), verksted (vedlikehold,
  andel), og senere f.eks. havn/logistikk (hjelper verk i regionen), kraftselskap (demper strømpris i regionen). Når nytten
  avhenger av egne verk og region, er verdien forskjellig for hver spiller – det gir færre rene budkriger.
- **Færre spillere:** faller antall aktive, går det nyeste selskapet uten eier i dvale. Et selskap med eier går i dvale
  først når konsesjonen er ute – eieren mister aldri noe midt i en periode.
- **Aldri automatisk uten eierens godkjenning i starten:** `world_tick` foreslår (logg og varsel til eieren), eieren
  godkjenner. Når regelen har virket en stund, kan den slås på automatisk med en bryter.
- **Belastning:** Kontrollen synker allerede med antall selskaper (`load`). Det gjør at én spiller ikke kan holde alt,
  uansett saldo.

## 6. Frivillig eierutbytte – kritikk av idéen

**Idéen:** spilleren kan selv ta penger ut av konsernkassa som eierutbytte. Pengene er da ute av verden for alltid og
blir bare prestisje (Hall of Fame). Aldri automatisk, aldri nødvendig.

**Det som taler for:**
- Det er et **ekte offer**: makt i dag mot prestisje for alltid. Det er fundamentalt annerledes enn det gamle taket, fordi
  spilleren velger selv.
- Det tar penger ut av oppkjøpskampen frivillig og gjør verden roligere for dem som ikke vil slåss.
- Det gir en verdig slutt for dem som vil «pensjonere» konsernet sitt.

**Det som taler mot:**
- **Uten andre gode bruksområder er det ikke et valg.** Har du 10 mrd. og ingenting å kjøpe, er eierutbytte bare den
  eneste knappen som gjør noe. Da er det et pengesluk med et finere navn – nettopp det eieren ikke vil ha.
- **En prestisjeliste blir en ny konkurranse.** Står eierutbyttet på en liste, blir det et kappløp om å ta ut mest – og
  det premierer igjen den med størst inntekt, ikke den som tar gode valg. Sosialt press kan gjøre det «nødvendig» likevel.
- **Forveksling:** «Privat formue» (fryst, fra spilltid) og «eierutbytte» (ekte tid) er to ting med nesten samme navn.
  Spillerne vil blande dem.
- **Konsernverdien synker** når man tar ut (kassa teller i `konsern_value`). Det er riktig som avveining, men mange vil
  oppleve det som å bli straffet på sesonglista.

**Vurdering:** idéen kan passe, men **ikke før programmene og flere selskaper finnes** – først da er «behold 2 mrd. som
krigskasse eller ta ut 1 mrd.» et ekte valg. Hvis den bygges:
- ingen egen konkurranseliste; bare et æresmerke og en linje i Hall of Fame per æra (ikke «mest uttatt» som løpende liste);
- tydelig eget navn («Eierutbytte» i ekte tid), aldri blandet med Privat formue;
- kun fra konsernkassa, minst X igjen i kassa, kan ikke angres, bekreftes med tydelig tekst;
- ingen mekanisk belønning (ingen fagpoeng, titler eller rabatter).

**Alternativ å vurdere:** «Stiftelse» – pengene gis til noe som hjelper alle (f.eks. et fagskolefond som gjør
verksjefkandidatene litt bedre for alle i en region en periode). Det gir prestisje med en synlig effekt i verden, men er
mer komplisert og kan gi rike spillere påvirkning over andre. Bør ikke bygges før verksjefene finnes.

## 7. Plan (forslag)

| Steg | Innhold | Forutsetning |
|---|---|---|
| 0 | Sjekken 2.10 som avtalt; samle ekte oppkjøpsdata (antall forsøk, bud, utfall, ping-pong) i noen uker | – |
| K-1 | Konsernprogrammene (5, to aktive, trinn 1–3) i prosjektlinja; simuleres i `worldSim.ts` først | Eierens svar på avsnitt 8 |
| V1 | Verksjef og mandat (VERKSJEF-FORSLAG.md), så samtalene (V2) og lojaliteten (V3) | K-1 i drift |
| S-1 | Antall selskaper etter aktive konsern og regioner; nye typer med ulik nytte; foreslått av serveren, godkjent av eieren | Oppkjøpsdata |
| O-1 | Oppkjøp med forberedelse, regional tilstedeværelse, integrasjon og pause for samme par | Oppkjøpsdata, K-1 (Marked-programmet) |
| E-1 | Eventuelt frivillig eierutbytte | K-1 og S-1 i drift |

## 8. Spørsmål til eieren

1. **Konsernprogrammene:** fem programmer, to aktive om gangen, trinn 1–3 i prosjektlinja – riktig retning? Er to
   plasser riktig, eller tre?
2. **Bytte av program:** trappes ned over ca. 14 ekte dager uten refusjon – greit, eller for strengt?
3. **Oppkjøp:** er forberedelse i prosjektlinja og regional tilstedeværelse ved taket riktig retning (etter ekte data)?
4. **Selskaper:** ett aktivt selskap per ca. 4 aktive konserneiere, fordelt på regioner, foreslått av serveren og godkjent
   av deg – greit?
5. **Eierutbytte:** vente til programmene og flere selskaper finnes (anbefalt), eller forkaste?

## 9. Simulering av programmodellene A og B (B-388)

`npx tsx src/game/programSim.ts` (fra `frontend/`, også `--skann` og `--skann-inntekt`). Inntekten per spillertype fra
verdenssimulatoren; programmene starter når konsernet er ferdig utbygd. Verden har faste hendelser (tre strømkriser,
tre urolige perioder, tre nye selskaper, verksjefer fra dag 180) og et oppkjøpsvindu hver 45. dag. Programmenes verdi i
**penger** er med vilje satt rundt null over tid – hvert program er verdt mye i sin situasjon og lite ellers. Det de gir
utenom penger, er ikke i kronene. Tallene er plassholdere; det som skal sammenlignes, er kapitalstrømmene og valgene.

**Modellene:**
- **A:** trinn 0,5 / 1,5 / 4 mrd. (6 mrd. per program), to programmer, kjøpt opp så fort kassa tåler det. Bytte = bygge
  opp fra trinn 1 igjen.
- **B:** etablering 150 mill. og 3 dager i prosjektlinja, så et løpende budsjett per ekte dag, **regnet som andel av hele
  inntekten i konsernkassa** (bidrag + utbytte): lav 4 %, middels 12 %, høy 30 % per program. Binding 14 dager.

**Konsernkassa i mrd. (dag 180 / 365 / 730):**

| | Liten (40 mill./d) | Middels (52 mill./d) | Stor (67 mill./d) |
|---|---|---|---|
| Uten programmer | 4,5 / 11,9 / 26,3 | 7,1 / 16,7 / 35,7 | 10,0 / 22,4 / 46,9 |
| A (permanente trinn) | 1,3 / 2,2 / 19,6 | 0,3 / 7,8 / 30,0 | 3,3 / 13,7 / 41,4 |
| B, to på middels | 3,8 / 10,3 / 23,2 | 5,9 / 14,3 / 30,8 | 8,2 / 18,7 / 39,4 |
| B, to på høy | 3,0 / 8,1 / 17,9 | 4,3 / 10,5 / 22,5 | 5,6 / 12,9 / 27,1 |
| B, satsing etter kassa | 3,4 / 8,5 / 18,3 | 5,1 / 11,3 / 23,3 | 6,7 / 14,1 / 28,2 |

**Svarene på eierens fem spørsmål:**

1. **Kassa etter 180/365/730 dager:** A tømmer kassa det første året (12 mrd. til to programmer på trinn 3) – og **år 2 hoper
   den seg opp i nøyaktig samme tempo som uten programmer** (+17–28 mrd.). B bremser hele tida: to på middels bruker ca.
   30–35 % av inntekten, to på høy ca. 66–71 %.
2. **Konkurransen med oppkjøp:** tid å spare til ett maksbud (1,7 mrd.) etter at konsernet er fullt: uten programmer 26–43
   dager; B to på middels 34–57 dager; **B to på høy 64–108 dager**. Med A konkurrerer programmene med oppkjøp bare det første
   året – etterpå ikke i det hele tatt.
3. **Kan en liten spiller delta?** I A er prisen den samme for alle: 12 mrd. er 46 % av en liten spillers inntekt de første
   to årene, men 26 % av en stor. I B er budsjettet en andel av inntekten, så avveiningen er lik for alle – en liten spiller
   kan kjøre de samme programmene på samme satsing.
4. **Må en stor spiller velge?** I A nei: etter ett år har hen alt og hoper opp igjen. I B ja: to på høy halverer det som
   blir til overs, og det er et reelt valg mellom programmer, krigskasse og selskaper.
5. **Hvor ofte skjer et fornuftig bytte?** A: **aldri** (0 bytter på to år – det som er betalt, er for dyrt å kaste). B: **18 programbytter på to år**
   (ca. hver 5.–6. uke) – ett når en hendelse i verden starter og ett når den slutter (ni hendelser i simuleringen). Et
   bytte koster bare etableringen og bindingen. Hvor ofte det skjer i spillet, styres av hvor ofte verden endrer seg.

**Anbefaling: modell B**, med disse utgangspunktene (justeres i simuleringen når effektene er bestemt):
- Budsjett som **andel av inntekten i konsernkassa** (lav 4 %, middels 12 %, høy 30 % per program), ikke faste kroner – da
  er avveiningen lik for små og store, og den følger med når inntekten endrer seg.
- **Etablering i prosjektlinja** (én ting om gangen, som i dag), noen dager og en etableringssum (ca. 3 dagers inntekt heller
  enn en fast sum, så den er lik for alle).
- **Binding 14 dager**; endring av satsing eller program tar ekte tid; det som er brukt, refunderes ikke.
- **To aktive** programmer.
- Effektene hovedsakelig **utenom penger** (tåle hendelser, regional styrke, energi, ledere), og der de gir penger: rundt
  null over tid, så ingen er riktig for alle. Driftsytelse gir mer utbytte, men med en ekte ulempe (tåler uro dårligere).

**Viktige forbehold:**
- B virker bare hvis effektene utenom penger merkes i spillet (hendelser som programmene demper, selskaper og regioner som
  Marked hjelper i, verksjefsaker). Uten det er B et pengesluk med knapper.
- Selv to på høy lar kassa vokse 9–14 mrd. i året for en stor spiller. Programmene alene løser ikke opphopingen – de gir
  pengene en pris, men selskaper og oppkjøp må fortsatt være den største eksterne bruken (avsnitt 5).
- Effektene og hendelsene i simuleringen er plassholdere; tallene over er for å sammenligne modellene, ikke fasit.

