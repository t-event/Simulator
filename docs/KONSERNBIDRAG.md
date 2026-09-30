# Hovedverket og konsernet: analyse av koblingen (B-313)

> **Status 29.9:** eieren har svart på avsnitt 14 (se B-318). Steg 1 er bygget: bidraget betales av serveren fra
> 30.9, fast 50 %, gulv 30 %, dempet over 30 mill. per dag. Kassa i spillet røres ikke. Steg 2 (B-319): innskuddet
> er borte. Steg 4 (B-320): ny liste «Konsernverdi» regnet av serveren; den gamle heter «Verdi i spillet». Valg av utbyttepolitikk er utsatt.

Bestilt av eieren 2026-09-29, etter B-311: «Hovedverket har driftsøkonomi i simulert spilltid. Konsernet har
kapitaløkonomi i ekte tid.» Dette er en analyse, ikke en reform. Ingen tall på kontoer endres, ingen kode er bygget.
Tallene kommer fra lagringene og tidslinja 29.9 (spillerne er anonymisert), koden i `frontend/src` og SQL-en i
`supabase/`. Simuleringen står i avsnitt 11 (skriptet lå i økta, ikke i repoet – formlene er gjengitt her).

**Kort fortalt:** i dag er det to økonomier med en tynn, manuell sluse mellom seg (10 mill. per ekte døgn). Forslaget
er å erstatte slusa med et **automatisk konsernbidrag fra hovedverket i ekte tid**, regnet av serveren av det verket
*faktisk* lager og tjener per tonn – én normal spilldag per ekte dag, som skraplageret alt gjør – og la spilleren velge
utbyttepolitikk. Kassa hjemme blir driftskapital. Ti timer på 10× gir samme bidrag som tjue minutter på 1×, men et
godt drevet verk gir 5–10 ganger mer enn et dårlig drevet. Det manuelle innskuddet kan fjernes. Taket for kassa kan
stå som sikkerhetsnett, og «utbetalt til eierne» får en naturlig forklaring: det verket betaler i utbytte hvert
spilldøgn, og som konsernet bare får i menneskelig tempo.

---

## 1. Slik flyter pengene i dag

```
                 SPILLTID (mobilen, 1×–10×)                          EKTE TID (serveren)
 ┌──────────────────────────────────────────────┐        ┌──────────────────────────────────────────┐
 │ HOVEDVERKET                                   │        │ KONSERNKASSA (treasury)                   │
 │  kontrakter + spot ──► kassa (g.cash)         │  10 mill/døgn, manuelt   │  ◄── innskudd (deposit_to_treasury)   │
 │  skrap, strøm, lønn, vedlikehold, utstyr ◄── │ ───────────────────────► │  ◄── utbytte fra datterverkene        │
 │  datterverk kjøpes/selges (60 %) ◄──────────  │        │       (dividend_from_state, 0,5/2/6 mill)  │
 │  kassa > 10 mrd ──► «utbetalt til eierne»     │        │  ◄── inntekt fra strategiske selskaper    │
 │        (paidOut, historikk, ikke penger)      │        │       (skraplageret: 50 kr/t av andres tonn)│
 │  daglig belønning / borte-tid ──► kassa       │        │  ──► bud i anbud (eneste sluk)             │
 └──────────────────────────────────────────────┘        └──────────────────────────────────────────┘
```

| Strøm | Hvor | Tempo | Størrelse i dag (toppen) |
| --- | --- | --- | --- |
| Drift hjemme (kontrakt + spot − drift) | `engine.ts`, lokalt | per spilldøgn | 27–150 mill. per spilldøgn på 25–31 000 t (845–5 900 kr/t); ett verk med én ovn i drift: −13 mill. |
| Spilldøgn per ekte dag | tidslinja | – | 600–6 000 for aktive (10× i 2–24 timer); 80–200 for dem som spiller lite |
| Kjøp/salg av datterverk | `konsern.ts`, lokal kasse | ett prosjekt om gangen, timer i ekte tid (B-311) | 0,6–3,6 mrd. per verk; salg 60 % |
| Taket for kassa | `reserve.ts` | hvert tidssteg | 2,7–116 mrd. «utbetalt til eierne» per spiller |
| Manuelt innskudd | `deposit_to_treasury` (031) | ≤ 10 mill. per rullerende 24 t | 100–210 mill. innskutt i alt per spiller |
| Utbytte datterverk | `pay_dividends` (051/055) | én gang per ekte dag | 0–36,7 mill. per dag (14 verk: 36,7; 5 verk: 14–27) |
| Skraplageret | `world_tick` (030/043) | én gang per ekte dag, eierens kasse | ca. 15 mill. per dag ved 50 kr/t |
| Bud | `place_bid` | anbud hver 14. dag | konsernkassene i dag: 0–30 mill. |

Hjemmeverket tjener altså 30–150 mill. per *spilldøgn* og spiller 600–6 000 spilldøgn per *ekte dag* – 20–900 mrd.
per ekte dag i bokført overskudd, som taket gjør om til «utbetalt». Konsernkassa får 10 mill. per dag hvis spilleren
husker å flytte dem, pluss 0–37 mill. i utbytte. Det er dette som føles galt: «Jeg eier 10 milliarder, men får flytte
10 millioner».

## 2. Hva som antar at lokal kasse er hele formuen

| System | Hvor | Bruker | Følge hvis kassa blir «driftskapital» |
| --- | --- | --- | --- |
| Konsernverdi (`konsernEquity` = kasse − lån + verkenes verdi) | `konsern.ts` | topplista (`snapshots.equity`), ligaer (`league_of`), titler (`title_of`), sesonglista, ukelista, sesongstigen | Fortsatt rimelig: kassa er en del av formuen, men bør *ikke* være det viktigste tallet mellom spillere. Kan bytte til konsernverdi = verk + konsernkasse − lån (serverautoritativ). |
| Vekstsperren (`check_snapshot`, 015/032) | server | vekst i equity per døgn | Uendret så lenge kassa har tak. |
| Første opplasting (`first_upload`, 044) | server | kassa på dag N | Uendret. |
| Milepæler (2/4/6/8 mrd.) og legendetitler (25/50 … mrd. equity) | `konsern.ts`, `achievements.ts` | equity | Legendetitlene er alt urealistiske med taket på 10 mrd. (magnat 25 mrd. nås bare via verk). Bør flyttes til serververdier (konsernkasse + verk) eller ekte dager. |
| Sluttmålet 10 mrd. (`WIN_CASH`) | `data.ts` | kassa | Står. |
| Dagens oppdrag «konsernverdi» | `daily.ts` | equity | Bytt til serververdi eller behold. |
| Kjøp i konsernet, direktøren, oppgraderinger, forskning | `konsern.ts`, `actions.ts` | kassa | Riktig: det er driftsinvesteringer betalt av driftskapital. |
| Innskudd (`deposit_to_treasury`) | 031 | kassa − lån | Bortfaller med forslaget. |
| Bank/lån | `Settings.tsx` | kassa | Står. |
| Hall of Fame «utbetalt til eierne» | 050 | paidOut | Får ny mening (avsnitt 6). |

Kort: **ingenting mellom spillere trenger den lokale kassa** – topplista kan bygge på verk + konsernkasse, som
begge er serverkjente. Alt lokalt (kjøp, forskning, direktør) bruker kassa som driftskapital allerede.

## 3. Forslaget: hovedverkets konsernbidrag i ekte tid

Regel, én spiller, én ekte dag (norsk tid fra B-369) – regnet av serveren i `world_tick`, som utbyttet:

```
bidrag = politikk × tonn_som_teller × min(margin, MARGIN_TAK) × aktivitet

tonn_som_teller = min(nye tonn i dag (tidslinja, hwm), én normal spilldag)     ← produksjonsmåleren (029/043)
margin          = driftsresultat per tonn, tonnvektet over de siste 30 spilldøgn i lagringen
                  (kontrakt + spot − alle driftskostnader; ikke investering, ikke kjøp/salg av verk)
MARGIN_TAK      = 3 000 kr/t (det som teller; virkelige lysbueovnsverk: 300–1 500 kr/t i EBITDA)
politikk        = 0,25 konservativ / 0,50 normal / 0,75 aggressiv (spillerens valg, avsnitt 7)
aktivitet       = 1 den dagen det er nye tonn; ellers 0,9 × forrige, aldri under 0,3 (driftsledelsen kjører videre)
```

- **Én normal spilldag per ekte dag** er nøyaktig regelen skraplageret bruker (B-188): «tonn som teller» finnes
  allerede i `production_days.gained_t` og `scrap_counted_t`, testet for 1×/3×/10×, pause, borte, uten nett, gammel
  lagring og skiftdrift (`net/scrapTests.ts`). Ingen ny normalisering trengs.
- **Marginen** leses av `state.history` i lagringen på serveren, akkurat som `dividend_from_state` leser verkene og
  kvaliteten. Ingen ny app trengs for at det skal virke – eldre apper får bidrag fra dag én.
- **Grunnbeløpet på 10 mill.** (dagens innskuddsgrense) forsvinner: et nytt storverk på 6 000 t med 1 500 kr/t gir
  4,5 mill. per dag av seg selv; et fullt storverk på 31 000 t med 1 100 kr/t gir 17 mill.; ekstremt drevet (≥ 3 000
  kr/t, aggressiv) 70 mill.

Bidrag per dag for ett fullt storverk (31 000 t), etter margin og politikk (mill. kr):

| kr/t | konservativ | normal | aggressiv |
| --- | --- | --- | --- |
| 300 | 2,3 | 4,7 | 7,0 |
| 800 | 6,2 | 12,4 | 18,6 |
| 1 100 (typisk topp i dag) | 8,5 | 17,1 | 25,6 |
| 1 500 | 11,6 | 23,2 | 34,9 |
| 2 000 | 15,5 | 31,0 | 46,5 |
| 3 000 og over (taket) | 23,2 | 46,5 | 69,8 |

Dårlig, ok, god og ekstremt god drift skiller seg altså 1 : 3 : 5 : 10 – nær eierens skisse (5/15/30/40).

## 4. Hvorfor det ikke kan manipuleres

| Angrep | Hva skjer |
| --- | --- |
| **10× hele kvelden** | Tonn som teller er høyst én normal spilldag per ekte dag. 2 400 spilldøgn gir samme bidrag som 1 (vist i `scrapTests.ts`). |
| **Én ekstremt lønnsom charge, så pause** | Marginen er tonnvektet over 30 spilldøgn (~900 000 t på toppen); én charge er 420 t. Pausen gir ingen nye tonn, så aktiviteten faller til gulvet 30 % på ca. 11 dager. Marginen har tak. |
| **Save/load og tilbakespoling** | Måleren bruker høyeste tall (hwm): et eldre spill gir ingen nye tonn før det har passert det gamle toppunktet. Tidslinja etter en tilbakespoling flyttes bort (B-261). |
| **Offline i 30 dager** | Ingen nye tonn → 0,9^n ned til 30 % av bidraget (5 mill. for et fullt storverk). Datterverkene betaler som før. Aktive spillere får full sats; ingen taper alt. Alternativ: 0 uten aktivitet (eierens valg). |
| **Bytte av spillfart** | Spiller ingen rolle; bare ekte dager teller. |
| **Kjøp og salg av datterverk for å pumpe «inntekt»** | Kjøp/salg og «investering»/«konsern»-poster er ikke med i driftsresultatet. |
| **Daglig belønning, borte-tid, landemerker** | Er «annet»-inntekt, ikke drift. Holdes utenfor. |
| **Redigert lagring (history med 50 000 kr/t)** | Marginen har tak (3 000 kr/t) og sjekkes mot nivået (et storverk kan ikke ha over ca. 6 000 kr/t; juksesperren flagger). Samme tillit som verkene i lagringen i dag. |
| **Sende opp tonn uten å spille (falsk tidslinje)** | Samme vern som skraplageret: fartskontrollen (B-176), tonnsperren (B-158) og første opplasting (B-257). |
| **Flere kontoer som «kunder»** | Gjelder ikke bidraget (det regnes av egne tonn), bare skraplageret som før. |

## 5. Lokal kasse som driftskapital

Ja. Kassa bør forstås som **driftskapitalen i hovedverket**: den betaler skrap, strøm, lønn, utstyr, forskning,
direktøren og kjøp av datterverk – og den kan ikke brukes mot andre spillere. Tre ting følger:

1. **Ordet.** Under Verket → Økonomi og i toppfeltet: «Driftskapital» (eller «Kassa i verket») når konsernet er åpnet.
   Før konsernet er det bare «kassa» som i dag.
2. **Konsernverdien mellom spillere** bør bli serverkjent: datterverkene (fra lagringen, som utbyttet) + konsernkassa
   − lån. Lokal kasse ute av topplista. Ligaer og titler følger. (Eget steg; tallene på topplista endrer seg da for
   alle, så det må varsles.)
3. **Taket** står som sikkerhetsnett (avsnitt 6), men får ny forklaring.

## 6. Det manuelle innskuddet og taket for kassa

**Innskuddet:** fjernes som hovedmekanisme. Det er den «kunstige slusa» eieren peker på, og bidraget gjør jobben
bedre: automatisk, avhengig av driften, umulig å glemme. Anbefaling: når appen med bidraget er ute, settes
`treasury_base_per_day` til 0 og knappen skjules (gradvis synlighet). Ingen «ekstraordinært innskudd» – det ville
gjeninnføre 10×-fordelen bakveien, og enhver grense over null blir en ny sluse å forklare. Det som alt er skutt inn
(100–210 mill. per spiller), står.

**Taket (10 mrd.) og «utbetalt til eierne»:** kan stå urørt, men får en naturlig rolle i forslaget – **utbyttepolitikken
betales lokalt hvert spilldøgn.** Verket setter av politikkens andel av døgnets driftsresultat som utbytte til eierne
*hvert spilldøgn* (som et ekte selskap), og konsernet får den normaliserte delen i ekte tid. Det som betales i
spilltid utover én normal spilldag per ekte dag, står som «utbetalt til eierne» – det er da bokstavelig talt det: eierne
fikk pengene, konsernet fikk sin del i menneskelig tempo. Da gjør «utbetalt» det taket gjør i dag, men med mening, og
taket kan senere senkes eller tas bort. Med normal politikk på et fullt storverk går 50 % av 30 mill. per spilldøgn
til eierne; kassa vokser med resten, som er mer enn nok til alt som kan kjøpes. Aggressiv politikk gir konsernet mer,
men verket beholder bare 25 % – det merkes på 1× og på små verk (avsnitt 7).

## 7. Utbyttepolitikk

| Politikk | Andel | Verket beholder | Konsernet får (fullt storverk, 1 100 kr/t) | Passer |
| --- | --- | --- | --- | --- |
| Konservativ | 25 % | 75 % | 8,5 mill./dag | verk som bygger ut, sparer til datterverk, lav margin |
| Normal (standard) | 50 % | 50 % | 17 mill./dag | de fleste |
| Aggressiv | 75 % | 25 % | 26 mill./dag | ferdig utbygde verk som vil vokse i verden |

Regler som gjør det til et valg, ikke en bryter man setter på maks:
- Bytte tar **7 ekte dager** å tre i kraft (som en generalforsamling). Da kan man ikke gå aggressiv før et anbud og
  konservativ etter.
- Aggressiv politikk med lån eller negativ dag: verket får ikke låne mer, og et døgn i minus koster omdømme (eierne
  «tapper» selskapet). Konservativ gir +5 % på lokale kjøp av datterverk (bedre kredittvurdering).
- Vises som ett kort på Konsern → Oversikt: «Utbyttepolitikk: Normal. Konsernbidrag i går: 17,1 mill. Anslag i dag:
  16,8 mill.» – gradvis synlighet: kortet finnes ikke før konsernet er åpnet.

Vurdering: det forbedrer systemet fordi (a) det gir én forståelig setning – «verket betaler utbytte, konsernet får
det i ekte tid» – (b) det er et ekte valg med kostnad, (c) det erstatter en regel spillerne ikke forstår (10 mill.
per døgn) med en de kjenner fra virkeligheten. Det er ikke nødvendig for kjernen (avsnitt 3 virker med fast 50 %),
så det kan komme som steg 2.

## 8. Migrering uten tap

- **Ingen tall endres.** Kasser, verk, konsernkasser, «utbetalt», innskutt: alt står. Ingen reform 3.
- **Server:** `config.world.contribution` (politikk-andeler, margintak, aktivitetsgulv, `from`-dato), tabell
  `contributions (user_id, day, amount)` som `dividends`, `contribution_from_state(state, counted_t)` ved siden av
  `dividend_from_state`, betalt i `pay_dividends`-mønsteret fra `world_tick`; `treasury_ledger.kind` får `'bidrag'`.
  `treasury_base_per_day` → 0 når appen er ute. Eldre apper: bidraget virker (leser lagringen), knappen for innskudd
  gir «grense» – akseptabelt i noen dager.
- **App:** `g.konsern.policy` (standard `"normal"`, i `migrate()`), utbytte per spilldøgn lokalt (`konsernDay`),
  kortet på Konsern, beskjeden «Hovedverket betalte X i konsernbidrag i går» (som `applyDividendNews`), innskuddet
  bort, «Driftskapital» i tekstene. `game/contribution.ts` speiler SQL-en med faste tall i testen, som `dividend.ts`.
- **Rekkefølge (B-303-regelen):** app først, så serverendringen. Én beslutning og PR per steg: (1) bidraget på
  serveren + kortet, (2) innskuddet bort, (3) utbyttepolitikken, (4) konsernverdi = serververdier på topplista.
- **Juksesperren:** bidraget betales inn i konsernkassa, ikke i spillet, så vekst- og tonnsperren rører det ikke. Den
  lokale utbytteposten (spilltid) trekker kassa *ned*, som aldri flagges.

## 9. Sammen med 10×-nedskaleringen (B-311)

Forslaget bygger på den, ikke mot den. Verden skal gå i menneskelig tempo: datterverk 0–37 mill. per dag,
skraplageret ca. 15 mill., og nå hovedverket 5–70 mill. avhengig av drift. Et fullt konsern med et vanlig drevet
hovedverk får ca. 45 mill. per dag (17 + 28), et ekstremt drevet ca. 100. Én milliard tar dermed 10–20 dager på
toppen, ikke 30 – litt fortere enn B-311 siktet på, men fortsatt i ekte tid og fortsatt uavhengig av 10×. Vil eieren
holde 30 dager, kan normal politikk settes til 35 % eller utbyttet fra verkene trekkes 20 % ned. Det viktige:
hovedverket blir igjen den største enkeltkilden for den som driver godt – uten at fart teller.

## 10. Eksempler (per ekte dag, mill. kr)

| Type | Hovedverk | Datterverk | Bidrag (normal) | Utbytte | Sum til konsernkassa |
| --- | --- | --- | --- | --- | --- |
| Nytt konsern | 6 000 t, 1 500 kr/t | ingen | 4,5 | 0 | 4,5 (i dag: 10 hvis man husker innskuddet) |
| Middels | 31 000 t, 1 100 kr/t | 3 storverk trinn 2 | 17,1 | 6,9 | 24 (i dag: 17) |
| Stort | 31 000 t, 1 100 kr/t | 10 komplekser trinn 5 | 17,1 | 28,5 | 46 (i dag: 38,5) |
| Ekstremt optimalisert | 31 000 t, ≥ 3 000 kr/t, aggressiv | 10 komplekser trinn 5 | 69,8 | 28,5 | 98 (i dag: 38,5) |
| Verk med én ovn i drift (som i B-312) | 11 000 t, −1 200 kr/t | 8 verk | 0 | 10,6 | 10,6 (i dag: 20,6) |

## 11. Simulering: 30, 60 og 90 ekte dager (mill. kr i fri konsernkapital, ingenting brukt)

Forutsetninger: nytt konsern spiller 4 av 7 dager, middels 5 av 7, de to største hver dag; «i dag» = 10 mill. innskudd
hver aktive dag + utbytte; «forslag» = bidrag (med aktivitetsgulv) + utbytte. Utbyttet etter B-311 (0,5/2/6 mill.,
30 % beholdes, 10 % avtak per verk, flaggskip +20 %, kvadratrot over 10 mill.).

| Type | 30 dager i dag | 30 forslag | 60 i dag | 60 forslag | 90 i dag | 90 forslag |
| --- | --- | --- | --- | --- | --- | --- |
| Nytt konsern | 180 | 125 | 360 | 250 | 520 | 373 |
| Middels | 427 | 699 | 855 | 1 398 | 1 272 | 2 095 |
| Stort | 1 156 | 1 368 | 2 313 | 2 736 | 3 469 | 4 104 |
| Ekstremt optimalisert | 1 156 | 2 949 | 2 313 | 5 898 | 3 469 | 8 847 |

Lesning: den nye får litt mindre enn i dag (4,5 mot 10 mill. – men uten å måtte huske noe; vil eieren ha et gulv for
nye konsern, kan bidraget ha et minimum på 5 mill. de første 30 dagene). Middels og stort får 20–60 % mer, og forskjellen
mellom «stort» og «ekstremt drevet» blir 2,2 : 1 – i dag er de like. Spredningen topp : nytt går fra 6,4 : 1 (i dag)
til 24 : 1 (ekstrem drift) eller 11 : 1 (vanlig drift). Det er den avstanden eieren må mene noe om: er 10–20 : 1
mellom det best drevne og et nytt konsern «rettferdig kamp»? Sammenlign: B-311 siktet på 30 : 1 (30 mot 1 mill.).

## 12. Problemer og exploits denne retningen kan skape

1. **Marginen kan pyntes lovlig:** selge dyrt en periode (trender, landemerker), kjøpe skrap billig på lager før
   30-døgnsvinduet. Taket på 3 000 kr/t begrenser gevinsten til ca. 2× vanlig drift. Akseptabelt – det *er* god drift.
2. **Lagringen er klientens** (5.3 i RETNING): `history` kan i prinsippet redigeres. Vern: tak, rimelighet mot nivå,
   juksesperren, og at gevinsten er 5–70 mill. per dag, ikke milliarder. Samme tillit som datterverkene i dag.
3. **Passive spillere:** aktivitetsgulvet 30 % betyr at et fullt storverk gir 5 mill. per dag uten å spille. Uten gulv
   straffes de som reiser bort; med gulv kan en som spilte én god uke, høste i månedsvis. 0,9^n ned til 0,3 er et
   kompromiss – eieren velger.
4. **Store verk får mer enn små** også i ekte tid (tonn × margin). Det er meningen (drift bygger formue), men det
   gjør at forspranget til dem som alt har et fullt storverk, aldri lukkes helt. Kvadratrot over f.eks. 30 mill.
   (som utbyttet) demper toppen hvis det trengs.
5. **Utbyttepolitikk som ny «valuta»:** nei – det er en bryter med tre stillinger, ikke poeng. Men den må ikke få
   flere knotter (andel per verk, per måned …), ellers blir det regneark (B-180).
6. **To utbyttebegreper:** «utbytte fra datterverkene» og «utbytte til eierne fra hovedverket». Kall det siste
   **konsernbidrag** overalt, så ordet «utbytte» bare betyr datterverkenes.
7. **Lokal fart teller fortsatt for lokal progresjon** – det er ønsket – men også for *når* man når full margin
   (mesterskap, forskning). Den som spiller mest, får raskere topp-margin. Det er «bedre optimalisering», ikke makt.
8. **Konsernverdi på topplista** bytter grunnlag (avsnitt 5.2). Alle rykker; må varsles og forklares i «Hva er nytt».
9. **Serverlast:** én `history`-lesing per spiller per dag, som utbyttet. Ubetydelig.
10. **Innskuddsknappen forsvinner** for dem som liker å styre selv. Kortet med politikk erstatter den.

## 13. Kandidat til ny fast regel (til FORSLAG.md og, om eieren vil, CLAUDE.md)

> **Spilltid gir kunnskap, optimalisering og lokal progresjon. Ekte tid styrer akkumulering av kapital og makt som
> påvirker andre spillere.** En aktiv og dyktig spiller optimaliserer bedre, bygger et bedre hovedverk og får bedre
> normalisert lønnsomhet – men fem timer på 10× skal ikke tilsvare femti timer med kapital i verden.

Den passer med B-190 (felles klokke) og B-311 (verden i menneskelig tempo) og skjerper dem: *også hovedverkets bidrag*
til verden går i ekte tid, normalisert per ekte dag.

## 14. Spørsmål til eieren før noe bygges

1. Skal hovedverkets bidrag være **automatisk** (forslaget) – og innskuddsknappen bort?
2. **Aktivitetsgulv** 30 % for dager uten spill, eller 0?
3. **Utbyttepolitikk** nå (steg 3) eller fast 50 % først?
4. Er **10–20 : 1** mellom best drevne og nytt konsern etter 90 dager riktig avstand, eller skal toppen dempes
   (kvadratrot over 30 mill.)?
5. Skal **konsernverdien på topplista** bli serverkjent (verk + konsernkasse − lån), uten lokal kasse?
6. Skal **utbyttet betales lokalt hvert spilldøgn** (avsnitt 6, gir «utbetalt til eierne» mening), eller bare regnes
   på serveren uten å røre kassa?
