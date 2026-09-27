# Hovedretning: fra stålverk til industrimakt

Vedtatt i B-180 (2026-09-26), godkjent av eieren etter en ekstern gjennomgang av spillet. Dette dokumentet er
overgangsplanen: hva retningen er, hvordan den passer med dagens arkitektur, hva som må endres, og i hvilken
rekkefølge. Det er **ikke** en ordre om å bygge alt på en gang. Hver fase publiseres for seg, og hver fase får sin egen
beslutning (B-xxx) når den bygges.

`DESIGN.md` beskriver spillet slik det er og skal være. `PLAN-NETT.md` beskriver det som er bygget på nett. Dette
dokumentet beskriver veien mellom dem for sluttspillet.

## 1. Kort fortalt

Spillet begynner som i dag: du starter alene i en garasje og lærer å lage stål. Rollen vokser gradvis:

**Operatør → daglig leder → verkseier → konserneier → industrimagnat.**

Sluttspillet skal ikke handle om enda større ovner og enda større tall på konto, men om **eierskap, ledelse og kontroll
over industrien rundt verkene** – i konkurranse med ekte spillere. Stålproduksjonen er grunnmuren og inngangen, ikke
noe som skal erstattes.

Følelsen vi sikter mot til slutt:

> Jeg bygde ikke bare det største stålverket. Jeg bygde et industriimperium – og nå prøver de andre å ta det fra meg.

De 15 prinsippene fra eieren (behold disse hvis alt annet glemmes):

1. Bevar den gode garasjestarten.
2. Spilleren skal aldri se mer kompleksitet enn hen trenger akkurat nå.
3. Stålproduksjonen er inngangen – industriell makt er sluttspillet.
4. Penger er viktige, men kan ikke alene kjøpe seier.
5. Strategiske bedrifter er få, ekte og deles av spillerverdenen.
6. Bedrifter tjener penger fordi andre spillere faktisk bruker dem.
7. Spillere skal kunne bygge enorme industriimperier.
8. Jo større imperiet blir, desto vanskeligere blir det å kontrollere.
9. Mindre spillere skal kunne finne reelle svakheter hos store aktører.
10. Tap av en viktig bedrift skal gjøre vondt gjennom økonomien, ikke gjennom tilfeldige straffetall.
11. Datterverk styres av mennesker med personlighet, styrker og svakheter.
12. Eieren tar strategiske beslutninger – ikke mikrostyrer alle verk.
13. Konkurs er et stort tilbakeslag, ikke nødvendigvis full garasjerestart.
14. Sesonger må revurderes; langsiktige æraer er mer interessante.
15. Ikke bygg alt på én gang.

**Fast regel (B-190): Industrimakt, Kontroll, strategisk eierskap og overtakelser skal baseres på serverautoritative
verdier og ekte tid. Lokal kasse, lokal egenkapital og lokal spillfart skal aldri direkte avgjøre disse systemene.**
Lokalt spill: spill så mye og så fort du vil. Fellesverden: samme klokke og samme grunnleggende mulighet for alle. Det
eneste som flytter verdi fra eget spill inn i verden, er konsernkassa – med lik grense for alle (100 mill. per ekte døgn).
Karrierelistene (konsernverdi, kasse) kan påvirkes av 10×, men brukes aldri som grunnlag for fordeler i verden.

## 2. Rollen gjennom spillet

Hvert nivå gir et nytt hovedspørsmål, og et nytt system dukker opp først når spilleren trenger det.

| Nivå | Rolle | Spørsmålet spilleren løser | Nytt system (vises først her) |
|---|---|---|---|
| Garasje | Operatør | Hvordan lager jeg stål? | Ovn, resept, kontrakter (som i dag) |
| Verksted–støperi | Daglig leder | Hvordan får jeg folk og skift til å gå? | Ansatte, skift, forskning (som i dag) |
| Stålverk | Verksleder | Hvordan driver jeg effektivt? | Lysbueovn, rammeavtaler, kontrollrom (som i dag) |
| Storverk | Verkseier | Hvordan balanserer jeg kapasitet og marked? | Eksport, utfordringer (som i dag) |
| Konsern | Konserneier | Hvordan leder jeg flere virksomheter? | Datterverk med verksjef og mandat (fase 5) |
| Industrien | Industrimagnat | Hvordan beholder jeg kontrollen over imperiet? | «Industrien rundt verket»: strategiske bedrifter, kontroll, overtakelser (fase 2–4) |

Alt til og med storverket er dagens spill og skal beskyttes. Den nye retningen gjør midt- og sluttspillet bedre, den
river ikke opp starten.

## 3. Designpilarer

Disse gjelder fra nå for alt nytt (står også i `DESIGN.md` og `CLAUDE.md`):

1. **Gradvis synlighet (progressive disclosure).** Spør alltid: *når trenger spilleren å vite at dette finnes?* Er
   svaret «senere», vises det ikke nå – ikke som låst kort, ikke som hengelås i en meny. Forklar en mekanikk rett før
   spilleren trenger den: kort forklaring → én konkret handling → mekanikken er lært. Ingen tekstvegger.
2. **Ingen unødvendige valutaer.** Ingen maktpoeng, kontrollpoeng eller «tokens». Bruk avledede egenskaper:
   *Industrimakt* er en verdi på profilen, *Kontroll* er tilstanden til én bedrift. Penger er penger.
3. **Valg, ikke regneark.** Simuleringen kan være avansert under panseret, men spilleren tar forståelige valg
   («Verksjefen vil utsette stansen to uker for å rekke en stor ordre. Godkjenn?»), ikke 17 glidebrytere.
4. **Størrelse skaper nye problemer.** En oppgradering skal ikke bare gjøre alt enklere; gamle problemer byttes mot
   nye (se tabellen over).
5. **Penger er viktige, men ikke makt alene.** Kapital virker med kraftig avtagende effekt i alt som handler om
   andre spillere.
6. **Serveren avgjør alt mellom spillere.** Eierskap, overtakelser, frister i ekte tid, inntekt fra andre spilleres
   aktivitet, økonomireformen og Industrimakt på topplista regnes på serveren, aldri i appen.
7. **Forklarbart utfall.** Spilleren skal forstå hvorfor hen vant eller tapte. Litt usikkerhet er greit, et skjult
   terningkast som hovedavgjørelse er det ikke.
8. **Ikke avhengig av å sjekke mobilen.** Alt i ekte tid mellom spillere varer lenge nok (døgn, ikke minutter) til
   at skiftarbeidere og folk som sover rekker å svare.

## 4. Det vi beholder

Garasje → verksted → støperi → stålverk → storverk, fagboka og quizene, prosesskunnskapen, kontrakter, skrap og
resepter, ansatte, forskning og mesterskap, produksjonsflyten og flaskehalsene, hendelseskortene, kontrollrommet
(B-175 – ikke en del av denne retningen nå), konto og lagring på nett, juksesperren med fartskontroll, sikkerhetskopiene,
prestasjoner og pynt, og testspilleren i CI.

## 5. Kritisk vurdering mot dagens arkitektur

Retningen er god, men noen deler må løses annerledes teknisk enn det er naturlig å tro. Funnene under er det viktigste
i hele dokumentet.

### 5.1 Inntektsmotoren er problemet, ikke bare kassa

Dry-run-tallene (avsnitt 9) viser at de tre største spillerne har 12–14 stålkomplekser på modernisering 5 og tjener
**5–6 mrd. per spilldøgn**. Et spilldøgn er 12 sekunder på 10×, så det er ca. 1 500–1 800 mrd. i timen.

**Kutter vi bare kassa, er den tjent inn igjen på 1–5 timer.** En økonomireform som bare gjelder likviditet, er
dermed nesten virkningsløs. Reformen må derfor også treffe *inntekten* – datterverkenes overskudd og hvor raskt penger
kan flyttes inn i konkurransen (5.2).

### 5.2 To klokker: spilltid og verdenstid

Hvert spill har sin egen klokke: pause, 1×, 3× og 10×, og alt regnes på mobilen. Den felles verdenen (strategiske
bedrifter, overtakelser) må gå i **ekte tid på serveren** – ellers vinner den som spiller mest på 10×, og frister i
ekte tid gir ikke mening.

Konsekvens:

- Alt mellom spillere går i ekte tid, med serverens klokke (som sesongene og daglig belønning i dag).
- Pengene fra ditt eget spill (spilltid) kan bare flyttes inn i verdenen (ekte tid) i et **begrenset tempo per virkelige
  døgn**, målt mot det serveren har sett i tidslinja. Forslag: en *konsernkasse* på serveren. Det er vanlige kroner, ikke
  en ny valuta – bare penger som er flyttet fra verket til konsernet, og som brukes til kjøp av bedrifter, investeringer
  i dem og forsvar. Innskudd per virkelige døgn begrenses (f.eks. til noen døgns bekreftet overskudd).
- Da betyr ikke 8 500 mrd. i det lokale spillet at man kan kjøpe hele verdenen på et sekund, og en spiller som spiller
  én time om dagen, kan henge med en som spiller ti.

### 5.3 Klienten eier økonomien

Kassa ligger i lagringen på mobilen. Serveren ser bare tidslinja (dag, kasse, konsernverdi, tonn) og hele lagringen.
Alt som påvirker andre spillere, må derfor bygges slik at serveren kan kontrollere det:

- Kapital som brukes mot andre, går via konsernkassen på serveren (5.2), sjekket mot tidslinja og juksesperren.
- Aktivitet som gir andre spillere inntekt (skrapkjøp, vedlikeholdsstanser, slagg), rapporteres som daglige summer
  med tidslinja og sjekkes mot det som er mulig (samme type grenser som tonnsperren og fartskontrollen i dag).
- Utbetalinger til en eier regnes på serveren og hentes inn i spillet som en belønning (som daglig belønning i dag).
  Juksesperren må kjenne til dem, slik den kjenner til bonusdøgnene (B-149).
- Juks i eget spill kan ikke stoppes helt (PLAN-NETT). Med fem venner er det godt nok, så lenge det som avgjør mellom
  spillere, regnes på serveren.

### 5.4 Pengemålene i sluttspillet

Sluttmålet 10 mrd. (B-106) og milepælene 25 mrd.–1 billion (B-150) gjør penger til målet. De beholdes som historikk
(titler, rekorder), men det lages ikke flere pengemål. Nye mål i sluttspillet handler om eierskap og kontroll.

### 5.5 Sesongene ruller av seg selv

Sesong 1 slutter 2027-03-25, og Sesong 2 starter da av seg selv (B-167). Det passer ikke med æraer. Anbefaling: skru
av den automatiske neste sesongen med en bryter i `config` god tid før, og la administrator avslutte en æra manuelt.
Ukelista, sesongstigen og titlene fortsetter uendret inntil videre. Ingen irreversibel omskriving nå.

### 5.6 Frister i ekte tid og varsler

Overtakelser over 48–72 timer krever:

- Avgjørelse på serveren på et fast tidspunkt. I dag lukkes sesonger «lat» når noen spør (`season_status`). Det går også
  for overtakelser (fristen sjekkes ved hvert kall), men `pg_cron` er ryddigere og bør slås på før fase 4.
- **Varsler.** Spillet har bare varsler inne i appen. Uten varsel på mobilen eller e-post får eieren først vite om
  angrepet neste gang hen åpner spillet. Med 72 timer er det trolig nok for fem venner, men det må avgjøres (se åpne
  spørsmål). E-post krever egen e-postleverandør (FORSLAG).

### 5.7 Gradvis synlighet mot konto-regel 6

KONTO-regel 6 sier at en funksjon som krever konto, vises med «krever konto» i stedet for å skjules. Det kolliderer
med pilar 1 hvis det tolkes som «vis alt». Justering: **en funksjon vises først når spilleren har kommet dit den hører
hjemme. Da, og bare da, vises den med «krever konto» for den som ikke har konto.** Strategiske bedrifter vises altså
aldri i garasjen, heller ikke låst.

### 5.8 Konkurs i dag er alt eller ingenting

`gameOver` gir i dag full restart i garasjen. Rekonstruksjon (fase senere) krever en ny vei ut av `gameOver` for spill
som har nådd konsernet. Det gjelder også spill uten konto (regel 1). Må balanseres så konkurs ikke blir gratis
gjeldssletting.

### 5.9 Formler både i SQL og TypeScript

Kontroll, overtakelsesstyrke og Industrimakt må regnes på serveren (SQL), men balanseres med en simulator i TypeScript
(som `balance.ts`). Risiko: to versjoner av samme formel. Tiltak: konstantene samles i én tabell (`world_config`),
formlene holdes få og enkle, og en test kjører et fast sett tall mot begge ved endring (dry-run i databasen, som vi gjør
med juksesperren i dag).

## 6. Datamodeller

Serveren vokser bare (PLAN-NETT): nye tabeller og kolonner, aldri omdøping. Alt under er utkast; hver fase bestemmer
det endelige.

### Server (Supabase)

| Tabell | Innhold | Fase |
|---|---|---|
| `world_config` | Konstanter og terskler: hva «aktiv spiller» betyr, hvor mange bedrifter per antall aktive, frister, grenser for innskudd, vekter i Industrimakt | 1 |
| `company_types` | Katalog over bedriftstyper (skraplager, mekanisk verksted, slagghåndtering, båtfrakt …) med `active`, terskel for aktive spillere, inntektsmodell | 1 |
| `companies` | Bedriftene som finnes i verdenen: type, navn, eier, opprettet, kapasitet, investeringer, økonomi (inntekt, kostnader, gjeld, likviditet), ledelse | 2 |
| `company_ledger` | Hver inntekt og utgift per bedrift: fra hvem (spiller/aktivitet), beløp, tidspunkt. Eieren ser sine transaksjoner | 2 |
| `player_activity` | Daglige summer per spiller: skrap kjøpt (t og kr), stanser og havarier, slagg (fra tonnene), rapportert med tidslinja og sjekket | 2 |
| `treasury` | Konsernkassen på serveren (5.2): saldo, innskudd per døgn, reservert kapital | 2 |
| `payouts` | Utbetalinger til eiere som hentes inn i spillet (som daglig belønning) | 2 |
| `takeovers` | Overtakelsesforsøk: angriper, bedrift, fase (undersøkelse, forberedelse, offentlig, forsvar), frister, bundet kapital, handlinger, utfall med forklaring | 4 |
| `eras` | Æraer: navn, start, slutt, status. `season_*` beholdes | 1 (bare «Grunnleggeræraen») |
| `hall_of_fame` | Rekorder per æra: rikeste, største konsern, høyest Industrimakt, flest bedrifter, lengst eierskap … Bygger på `records` (B-142) | 1 |
| `economy_reform` | Før og etter per spiller for økonomireformen, med begrunnelse (dry-run og utført) | 1 |

Industrimakt og Kontroll lagres ikke som valuta: de regnes av funksjoner fra tabellene over (og kan hurtiglagres).

**Aktiv spiller** (forslag, konfigurerbart i `world_config`): har lagret på nett (tidslinje) minst 3 forskjellige dager
de siste 14, minst én gang de siste 7, og er ikke flagget eller sperret. Nå har alle fem 1–2 dager med tidslinje siste
14 dager, fordi nettdelen er ny – terskelen må derfor settes lavere i starten (f.eks. 2 av 14). En bedrift som først er
opprettet, forsvinner ikke når antallet aktive synker.

### Spillet (lagringen)

Lite nytt i lagringen – det meste bor på serveren:

- `g.industry?`: hvilke utbetalinger som er hentet, og hva spilleren har sett av introduksjonen (for gradvis
  synlighet).
- Datterverk (fase 5): `SisterPlant.manager?` (egenskaper, personlighet, lønn), `mandate?`, pågående saker
  («telefonen»). Nye felt får standardverdi i `migrate()` som alltid.
- Rekonstruksjon (senere): markering av at spillet er rekonstruert og hva som ble beholdt.

## 7. Faser

Rekkefølgen fra eieren, med det som konkret skal til. Hver fase er én eller flere PR-er og en egen beslutning.

### Fase 0 – design og prosjektminne (denne leveransen)

Retningen er registrert (B-180), gamle beslutninger er gått gjennom (avsnitt 10), DESIGN, PLAN-NETT, FORSLAG, KONTO,
README og CLAUDE.md beskriver samme spill, og dry-run av økonomireformen er vist (avsnitt 9). Ingen spillkode er endret.

### Fase 1 – økonomisk fundament

- Eieren velger modell og tall for reformen (avsnitt 9). Dry-run vises på nytt rett før utføring med ferske tall.
- Sikkerhetskopi av alle lagringer (utover den daglige i `save_backups`), så utføring i én migrasjon: lagringen på
  nett endres, `rev` økes og `device` settes, så appene henter den (samme metode som B-168). `economy_reform` lagrer før
  og etter.
- Inntektsmotoren justeres i samme runde (5.1): datterverkene får avtagende overskudd etter antall («imperiebelastning»)
  og faste lederkostnader, så store konsern fortsatt er store, men ikke tjener tusenvis av milliarder.
- «Grunnleggeræraen»: rekordene fra før reformen fryses i Hall of Fame. «Alle tider» på topplista får et nytt navn.
- `world_config`, `company_types` (alle tre typer i katalogen, ingen aktive ennå), definisjon av aktiv spiller.
- Bryter for automatisk ny sesong skrus av (etter eierens valg).
- Industrimakt som avledet verdi regnes, men vises ikke før fase 2.

**Status fase 1A (2026-09-27, B-181–B-185):** ny konsernøkonomi (utbytte og konsernkostnader, i stedet for avtagende
overskudd per verk – eierens valg), konsernkasse på serveren (skjult), Sesong 2 av med bryter, Grunnleggeræraen,
«Hall of Fame», aktive dager på serveren, fersk dry-run og klar utføring av reformen (venter på «go»), og analysen av
ekte-tids-normalisering (avsnitt 14). **Fase 1B (bygget, B-188/B-189):** ett skraplager, 48-timers skjult anbud,
pilotkonsesjon på 14 ekte dager (B-186), ekte inntekt fra andres skrapbruk etter avsnitt 14.

### Fase 2 – de første strategiske bedriftene

- Rekkefølge: **skraplager** (inntekt fra alles skrapkjøp), **slagghåndtering** (fra tonnene alle lager – finnes
  allerede i tidslinja), **mekanisk verksted** (fra stanser, havarier og vedlikehold – må rapporteres).
- Markedet bestemmer prisen. Kjøperen betaler markedspris som før, ser at leverandøren eies av en spiller, og eieren får
  en andel av handelen. Ingen kan sette prisen for andre.
- Enkel drift: faste kostnader, kapasitet, noen få investeringer. Ingen tycoon i tycoonen.
- Første eier: et anbud i ekte tid (48 timer) blant dem som har kommet langt nok, med tak på budet (f.eks. 2 × verdien)
  og kapital fra konsernkassen. Bare første tildeling – overtakelser kommer i fase 4.
- Synlig først for spillere med konto som har åpnet konsernet: kortet «Industrien rundt verket» på Konsern-fanen, med
  én kort introduksjon og én handling.
- Industrimakt vises på profilen (topplista) når spilleren har sett industrien.

### Fase 3 – eierskap og Kontroll

Kontroll per bedrift (lønnsomhet, gjeld, likviditet, ledelse, investeringer, markedsposisjon, konsernets støtte og hvor
komplekst imperiet er). Imperiebelastning: jo flere bedrifter og datterverk, desto mer ledelse og kapital kreves for å
holde Kontrollen oppe. Vises som ord («sterk», «presset») med en kort forklaring, ikke som et tall man jager.

### Fase 4 – overtakelser

Én angriper mot én eier. Undersøkelse → forberedelse (bundet kapital) → offentlig forsøk (alle ser det) → forsvar
(48–72 timer). Utfallet avgjøres på serveren av Kontroll, forberedelse, kapital (sterkt avtagende), ledelse, økonomisk
helse, forsvarerens handlinger og imperiets belastning – og forklares for begge. Den nye eieren overtar investeringene.
Ingen sabotasje; temaet er selskapskontroll. Testes grundig med få aktører før det slås på (bryter i `config`).

### Fase 5 – datterverksledelse

Verksjef med egenskaper (drift, økonomi, personal, risiko, gjennomføring, lojalitet) og personlighet, mandat
(lønnsomhet, vekst, produksjon, kvalitet, stabilitet), og «Verksjefen ringer» med noen få valg. Ingen perfekt leder.
Å sparke koster. Dette erstatter «datterverk er bare investeringer» (B-106).

### Fase 6 – reise og dypere konsernstyring

Bare når ledelsen virker. Telefon = raskt og lite informasjon; reise = mer informasjon og flere valg ved store saker.
Reisetid bare der den har strategisk betydning.

### Senere

Flere bedriftstyper (båtfrakt, logistikk, ildfast, automasjon …) aktiveres etter antall aktive spillere, samarbeid og
allianser, felles markedsdynamikk, rekonstruksjon ved konkurs, æraer med avslutning og Hall of Fame.

## 8. Forslag til første spillbare leveranse

Liten nok til å teste med dagens fem spillere:

1. **Økonomireformen** (fase 1), etter at eieren har godkjent tallene.
2. **Inntektsmotoren** i konsernet med avtagende overskudd og lederkostnader.
3. **Ett strategisk selskap: skraplageret**, med tildeling via anbud, inntekt fra alles skrapkjøp, eierens
   transaksjoner, og kortet «Industrien rundt verket» for dem som har åpnet konsernet.
4. **Industrimakt** på topplista (avledet, ingen valuta).

Slagghåndtering og mekanisk verksted følger rett etter, når skraplageret har vist at kjeden
(aktivitet → server → eier) virker.

## 9. Økonomireformen – dry-run

Hentet fra databasen 2026-09-26/27, bare lesing (tallene for de minste endrer seg mens de spiller). Ingen data er endret. Spørringen ligger i
`supabase/utkast/okonomireform_dryrun.sql` og kjøres på nytt med ferske tall rett før en eventuell utføring.

| Spiller | Dag | Nivå | Datterverk | Kasse | Konsernverdi | Inntekt per spilldøgn | Ny kasse (modell A) | Ny kasse (modell B) | Timer på 10× før kassa er tjent inn igjen (A) |
|---|---|---|---|---|---|---|---|---|---|
| Grane | 2190 | Storverk | 14 komplekser, trinn 5 | 8 286 mrd. | 8 563 mrd. | 5,96 mrd. | 3,36 mrd. | 11,2 mrd. | 4,6 |
| Tuster | 1405 | Storverk | 12 komplekser, trinn 5 | 3 595 mrd. | 3 831 mrd. | 4,99 mrd. | 2,51 mrd. | 7,66 mrd. | 2,4 |
| Figen | 1313 | Storverk | 12 komplekser, trinn 5 | 1 562 mrd. | 1 800 mrd. | 5,51 mrd. | 1,87 mrd. | 5,27 mrd. | 0,9 |
| Sjæfen | 179 | Storverk | – | 27,5 mill. | 27,6 mill. | – | uendret | uendret | – |
| H4WK3N5 | 370 | Storverk | – | 39 mill. | 38 mill. | 3 mill. | uendret | uendret | – |

**Modellene** (komprimerende, rekkefølgen beholdes):

- Under 50 mill. i kassa: uendret.
- Over: ny kasse = 50 mill. × (kasse / 50 mill.)^k. Modell A: k = 0,35. Modell B: k = 0,45.
- Modell A gir største/minste ca. 120 : 1 (før: ca. 300 000 : 1). Modell B ca. 400 : 1.

**Beholdes:** hovedverket, nivå, utstyr, forskning og mesterskap, fagbok, ansatte, prestasjoner, pynt, historikk,
titler, rekorder (fryses som «Grunnleggeræraen»), profil og kallenavn.

**Må avgjøres:**

- **Datterverkene.** 12–14 komplekser på trinn 5 er selve inntektsmotoren (5.1). Uten endring er modell A tjent inn på
  1–5 timer. Alternativer: (1) beholde verkene, men innføre avtagende overskudd og lederkostnader (anbefalt, se fase 1),
  (2) i tillegg regne verkene om til færre og større, eller (3) selge overskytende verk til en komprimert verdi.
- **Konsernverdien** på topplista faller med reformen. Den gamle toppen fryses i Hall of Fame, så ingen mister æren.
- **Tidspunkt:** helst samtidig med første strategiske bedrift, så reformen oppleves som starten på noe nytt.
- **Sikkerhetskopi:** `save_backups` har kopier av alle fem (daglig, 14 dager). Før utføring tas en ekstra kopi av alle
  lagringene, og `economy_reform` lagrer før og etter, så reformen kan rulles tilbake per spiller.

**Fersk dry-run 2026-09-27 (modell B valgt, B-184):**

| Spiller | Kasse nå | Ny kasse (B) | Inntekt per spilldøgn, ny konsernøkonomi | Gammel kasse tjent inn igjen på 10× |
| --- | --- | --- | --- | --- |
| Grane | 8 286 mrd. | 11,16 mrd. | 3,34 mrd. (før 5,86) | ca. 8 timer |
| Tuster | 3 651 mrd. | 7,72 mrd. | 2,89 mrd. (før 4,87) | ca. 4 timer |
| Figen | 1 562 mrd. | 5,27 mrd. | 2,90 mrd. (før 4,89) | ca. 2 timer |
| H4WK3N5 | 79 mill. | 62 mill. | – | – |
| Sjæfen | 28 mill. | uendret | – | – |

Utføringen er klar i `supabase/utkast/okonomireform_utforing.sql` (sikkerhetskopi → logg → endring → kontroll i én
transaksjon) og er prøvekjørt i en blokk som ble rullet tilbake. **Den er ikke kjørt.** Funnet: selv med den nye
konsernøkonomien er kassa tjent inn igjen på timer i det lokale spillet. Det som beskytter verden, er grensen på
konsernkassa (B-183). Reformen gjør topplista og konsernverdien sammenlignbare og markerer Grunnleggeræraen, men
endrer lite i spillet hjemme. Eieren avgjør om den kjøres.

**Gjennomført 2026-09-27 (B-186)** med urørt gulv på 250 mill. og k = 0,365 (samme topp som modell B): Grane 8 286 →
11,17 mrd., Tuster 3 664 → 8,29 mrd., Figen 1 562 → 6,07 mrd. Små spill er urørt. Kopi av alle endrede spill ligger i
`save_backups` og for alltid i `economy_reform_log`.

**Midlertidig sikkerhetsventil (B-193):** kassa ble tjent inn igjen fort (Tuster 8,3 → 46 mrd. og H4WK3N5 80 mrd. samme
dag). Til rebalanseringen av sluttspillet er ferdig, har disponibel kasse en myk grense på 100 mrd.; overskuddet går til
en bunden konsernreserve som teller i konsernverdien, men ikke kan brukes eller flyttes til verden. Rebalanseringen
må bestemme hva reserven blir, og om grensen skal bort. Ventilen er ikke løsningen.

## 10. Gamle beslutninger – hva gjelder

Ingen historikk slettes. Statuslinjene i `BESLUTNINGER.md` er oppdatert der det står «justeres» eller «revurderes».

| Beslutning | Hva | Status med ny retning |
|---|---|---|
| B-001–B-023, B-025, B-028–B-105 (kjerne) | Motor, nivåer, resept, ansatte, forskning, fagbok, strøm, hendelser | **Gjelder** |
| B-062, B-006 | Testspilleren i CI | **Gjelder**; får en egen simulator for verdenen senere |
| B-033 (konkurs) | Konkurs gir full restart | **Revurderes**: rekonstruksjon for spill som har nådd konsernet (senere fase) |
| B-091, B-106 (sluttmål 10 mrd.) | Sluttmålet i penger | **Justeres**: 10 mrd. er en milepæl, ikke slutten; sluttspillet er eierskap og kontroll |
| B-106, B-119, B-121 (datterverk) | Datterverk er bare investeringer | **Justeres** i fase 1 (inntektsmotor) og **erstattes** i fase 5 (verksjef, mandat) |
| B-117, B-122, B-172 (salgsdirektør) | Automatiske kontrakter | **Gjelder** |
| B-124 (konkurranse) | «Konkurranse bare på pris og kvalitet; ingen kan ta noe fra andre» | **Justeres**: gjelder til og med storverket; i sluttspillet kan eierskap til strategiske bedrifter utfordres. Tekniske prinsipper (Supabase, SQL-migrasjoner, vokser bare, brytere) **gjelder** |
| B-125–B-128, B-140, B-143, B-145–B-148 | Konto og lagring | **Gjelder** |
| B-127, B-142 (toppliste, «Alle tider») | Rekorder | **Gjelder**; «Alle tider» får nytt navn og blir grunnlaget for Hall of Fame |
| B-129, B-130, B-166, B-167 (sesonger) | Halvårssesonger som ruller av seg selv | **Revurderes**: æraer som administrator avslutter; automatisk neste sesong skrus av (eierens valg) |
| B-139, B-152 (ligaer) | Ligaer | Allerede erstattet (B-172) |
| B-149 (konto, daglig) | Kontoreglene | **Gjelder**, men regel 6 er justert for gradvis synlighet (5.7) |
| B-150, B-173 (milepæler, titler) | Pengemilepæler og titler | **Gjelder som historikk**; ingen nye pengemål |
| B-152, B-155, B-172, B-173 (ukelista, sesongstigen) | Ukentlig og sesongvis moro | **Gjelder inntil videre**, revurderes med æraene |
| B-154, B-157 (stormodeller) | Store ovner | **Gjelder** |
| B-169, B-176 (sikkerhetskopi, fartskontroll) | Trygghet og juks | **Gjelder** og brukes i reformen |
| B-175 (kontrollrom) | Kontrollrommet | **Gjelder**; ikke en del av retningen nå |
| PLAN-NETT fase 4 (ventetid) | Ekte ventetid i konsernet | **På vent**; kan inngå i fase 2–6 der det gir mening |
| PLAN-NETT fase 5 (anbud, auksjoner) | Anbud og skrapauksjoner | **På vent**; anbud gjenbrukes til første tildeling av bedrifter |

## 11. Risiko for eksisterende lagringer

- **Reformen endrer ekte lagringer.** Tiltak: dry-run først, ekstra sikkerhetskopi, `economy_reform` med før og etter,
  én spiller om gangen kan rulles tilbake (`restore_save`, B-169). Appen henter den endrede lagringen fordi `rev` økes.
- **En eldre lokal kopi kan overskrive.** Et spill som spilles uten nett med en gammel kopi, kan lagre over etter
  reformen. Tiltak: `save_game` avviser eldre `rev` (B-140), og reformen markeres i lagringen, så appen ikke laster opp
  en kopi fra før reformen.
- **Juksesperren.** Konsernverdien faller brått; det er ikke flagget i dag (bare vekst flagges), men utbetalinger fra
  bedrifter må legges inn som tillatt vekst (som bonusdøgn).
- **Nye felt** i lagringen får standardverdi i `migrate()` som alltid.

## 12. Balansering og tester

Testspilleren (`balance.ts`) beholdes for kampanjen. Verdenen trenger en egen simulator med flere aktører:

- rik mot liten, stort imperium mot konsentrert liten aktør
- dårlig ledelse, økonomisk stress og tap av en viktig inntekt
- mange bedrifter hos samme eier, overtakelser
- kan én spiller bli permanent urørlig? Kan en ny spiller finne en vei inn?

En bot kan vise at systemet henger sammen matematisk, men ikke at det er morsomt. Vi optimaliserer ikke bare mot boten;
de fem spillerne er den viktigste testen.

## 13. Åpne spørsmål til eieren

**Besvart 2026-09-27 – se B-181.** Kort: modell B; driftsresultatet står, utbyttet oppover avtar og konsernkostnadene
øker; konsernkasse ja, med sterkt avtagende grense per ekte døgn; Sesong 2 av og Grunnleggeræraen; varsel i appen i
testene, push før full lansering, ingen immunitet; skjult anbud i 48 timer med tak etter selskapets verdi, trekning ved
likt bud og pilotkonsesjon; aktiv = 2 av 14 dager; «Hall of Fame»; Industrimakt skjult til eierskap og Kontroll finnes.
Spørsmålene slik de ble stilt:

1. **Reformmodell:** A (k = 0,35) eller B (k = 0,45), og hva gjøres med datterverkene (avsnitt 9)?
2. **Konsernkassen:** er det greit at penger fra eget spill bare kan flyttes inn i verdenen i et begrenset tempo per
   virkelige døgn (5.2)?
3. **Sesongene:** skal automatisk Sesong 2 (2027-03-25) skrus av nå, og skal perioden fram til reformen hete
   «Grunnleggeræraen»?
4. **Varsler:** holder varsel inne i appen for overtakelser over 72 timer, eller trengs e-post (krever egen
   e-postleverandør)?
5. **Første tildeling** av en bedrift: anbud med tak på budet, eller noe annet?
6. **Aktiv spiller:** er «minst 2 av de siste 14 dagene» greit i starten?
7. **Navn på «Alle tider»** når Hall of Fame kommer (f.eks. «Grunnleggeræraen» / «Æraens rekorder»)?

## 14. Inntekt fra andres aktivitet i ekte tid (B-185)

Skraplageret (fase 1B) skal tjene på at andre spillere bruker skrap. Men hvert spill går i sin egen fart: den som
spiller på 10×, bruker ti ganger så mye skrap per time som den som spiller på 1×, og den som lar spillet stå på hele
dagen, bruker mer enn den som spiller et kvarter. Uten normalisering ville skraplageret belønne fart og skjermtid hos
kundene – og kundene kunne pumpe opp inntekten til en venn.

**Vurderte modeller:**

| Modell | 10× gir fordel? | Svakhet |
| --- | --- | --- |
| Tonn per ekte time | Ja, 10 ganger | Belønner fart direkte |
| Kapasitetsnormalisert volum (tonn / verkets kapasitet) | Delvis | Sier ikke noe om hvor mye som faktisk ble spilt |
| Tak per kunde per ekte time | Nei per time, men | Belønner lange økter; mange timer = mer |
| Rapporterte skrapkjøp | Ja | Kan pumpes med kjøp og salg av skrap |
| **Aktivitetsdøgn med tak per kunde (anbefalt)** | Nei | Krever én dags historikk per kunde |

**Anbefalt: aktivitetsdøgn med tak per kunde.** For hver kunde og hver ekte (UTC-)dag:

`bidrag = min(skrap brukt i dag, kundens normale skrapbruk per spilldøgn)`

- *Skrap brukt* regnes av tonnene kunden har laget den dagen (økningen i `produced_t` i tidslinja) × ca. 1,1 t skrap
  per tonn stål. `produced_t` er allerede sjekket av juksesperren og fartskontrollen (B-158, B-176), og tonn kan ikke
  lages ved å kjøpe og selge skrap.
- *Normal skrapbruk per spilldøgn* er tonn per spilldøgn over de siste 8 tallene i tidslinja, regnet med spillminuttene
  (`game_min`), × 1,1. (Planen var medianen av hele spilldager; testene viste at det ga opptil 37 % for mye på 10× og
  var ujevnt med skiftdrift, B-188.)
- Da teller en kunde høyst én normal spilldag per ekte dag, enten hen spilte 10 minutter på 10× eller 10 timer på 1×.
  Det som teller, er at kunden spilte den dagen (aktive dager, B-182) og hvor stort verket er.
- Eierens egne tonn teller ikke. Flaggede spillere og spill uten lagring på nett teller ikke.
- Inntekten = gebyr per tonn × summen av bidragene. Den regnes og betales inn i eierens konsernkasse på serveren én gang
  per ekte dag, merket med datoen i `treasury_ledger` (så den aldri betales to ganger). Ingen planlagt jobb trengs:
  som `season_status()` kan den regnes «lat» første gang noen spør etter dagens status.
- Gebyret og taket står i `config.world`, så de kan stilles inn uten ny kode. Simuleres før lansering med tidslinjene
  til dagens spillere (bare lesing).

**Bygget og testet (B-188, B-189):** måleren (`029_produksjonsmaler.sql`, speilet i `frontend/src/net/scrapIncome.ts`),
testcasene i `frontend/src/net/scrapTests.ts` (1×/3×/10×, 5 minutter til 8 timer, pause, borte, uten nett, gammel
lagring, skiftdrift – alle gir høyst ett tak per ekte dag) og skraplageret med anbud og inntekt (`030_skraplageret.sql`).

