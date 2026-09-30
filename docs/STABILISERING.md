# Stabilisering før verksjefene: kassetaket, legacy-gulvet og verdensøkonomien (B-380)

**Status:** analyse til eieren 30.9.2026. Ingenting er endret i spillet. Tallene er fra databasen 30.9 og fra
simulatoren `frontend/src/game/worldSim.ts` (`npx tsx src/game/worldSim.ts`), som bruker de samme reglene som appen og
serveren.

## 1. Cash-auditen: hva lokal kasse, verdi og Privat formue fortsatt påvirker

Gjennomgått: alle funksjoner i databasen som leser `cash`, `equity`, `paidOut`, `loan` eller `treasuryOut`, alt i appen
som sendes til serveren (`uploadSave`, `save_game`), og alt i spillet som bruker `softCap`, `valueCreated` og
`konsernEquity`.

### Kan lokal kasse gi verdensmakt?

| Vei fra lokal kasse til verden | I dag | Uten tak |
|---|---|---|
| Innskudd til konsernkassa (`deposit_to_treasury`) | Av: grensen er 0 per døgn (B-319). **Men** funksjonen står, og mangler nøkkelen i `config`, er grensen 100 mill. | Samme. Bør herdes (standard 0) |
| Kjøp av datterverk, modernisering, anbud, oppkjøp, investering | Bare fra konsernkassa (serveren) | Ingen endring |
| Felles innkjøp (150 mill.) og salgskontor (250 mill.), lokal kasse | +5 % utbytte hver, en gang | Ingen endring – engangskjøp, alle har dem |
| Konsernforskning (fagpoeng): «Større konsern», «Oppkjøpsavdeling», «Standardverk», «Konsernstyring», «Grønt konsern» | +2 plasser, −15 % / −25 % på priser, +10 % utbytte hver | Ingen endring – spilltid, engangs |
| Lån hjemme | Trekkes fra Konsernverdi | Ingen gevinst (bare tap) |
| Konsernverdi-lista, utbyttet, bidraget, Kontroll, oppkjøp | Serverens tall, ikke kassa | Ingen endring |

**Konklusjon:** ubegrenset lokal kasse kan ikke kjøpe noe i verden. Det finnes ingen vei der mer penger hjemme gir mer
konsernkasse, flere verk, mer Kontroll eller sterkere bud.

### Det som fortsatt bruker lokale tall (prestisje, ikke makt)

| Sted | Leser | Hva skjer uten tak |
|---|---|---|
| Topplista «Verdi» og «Mest penger på bok» (`snapshots.equity`/`cash`, `records`) | lokal verdi og kasse | Blir et rent kappløp i spillfart (10× vinner) |
| Sesongresultatet (`close_season`) | lokal verdi | Samme – sesongvinneren blir den som spiller mest på 10× |
| Ukens utfordring «Mer verdi enn før» (`weekly_scores`, `vekst`) | lokal verdi | Toppspillerne står på 0 % i dag (taket); uten tak blir de med igjen, i spillfart |
| Ligaen og merket «Konsern» (`league_of`: verdi ≥ 1 mrd.) | lokal verdi | Ingen praktisk endring |
| Tittelen på lista (`title_for`) | konsernnivået på serveren; «Stålbaron» ved verdi ≥ 10 mrd. som reserve | Ingen endring |
| Juksesperren (`check_snapshot`) | vekst i lokal verdi | Grensen er 1,5 mrd. + 25–50 % av verdien per døgn – langt over det et verk tjener. Ingen falske flagg |

Dette strider mot den faste regelen om at konkurranser måles i ekte tid (B-190), men det gjør det også i dag. Det bør
ryddes samtidig med taket, se punkt 2.

## 2. Kan 10 mrd.-taket fjernes trygt? Ja

**Hva brekker med `CASH_RESERVE.softCap = null`:**

- **Spillmotoren:** ingenting. `applyCashCap` gjør ingenting uten tak (det er testet i dag). Sluttmålet, stormodellene,
  milepælene, prestasjonene og dagens oppdrag bruker `valueCreated` (verdi + Privat formue) og virker som før.
- **Tekster i appen** som må endres: låsen ved kassa i toppfeltet og merknaden på Økonomi (vises når `hasPaidOut`, ikke
  når taket er på), setningen «Tak: …» og spørsmålet «Kassa står på 10 mrd. – hvor blir resten av?» i «Slik henger
  pengene sammen», loggmeldingen om Privat formue. Endringsloggen og MoneyGuide må forklare det.
- **Toppfeltet:** et tall som «12 345 mrd. kr» er bredere enn i dag; det må testes på 320 px (fast minstebredde, B-373).
- **Testene** for taket (`tests.ts`, «kassetak») må skrives om til «uten tak».
- **Serveren:** ingen endring trengs. Tall er `bigint`/`numeric`. Juksesperren tåler det.
- **Eldre apper** som ikke er oppdatert, fortsetter å flytte overskudd til Privat formue til de oppdateres. Det skader
  ikke noen.

**Gamle lagringer:** trygt. Ingen migrering. `paidOut` blir stående som det er.

**Farten:** en toppspiller tjener 35–226 mill. per spilldøgn, og på 10× er et spilldøgn 12 sekunder. Uten tak kan kassa
vokse 10–70 mrd. per ekte time. Tallet hjemme mister mening fort – det er kjent (punkt 6 i din plan), og det er ikke
farlig, fordi det ikke gir makt.

## 3. Privat formue hvis taket fjernes

- Beholdes som historikk: raden på Økonomi («Privat formue», fra før) og lista «Privat formue» i Hall of Fame står.
- Ingen penger føres tilbake til kassa, og nytt overskudd går ikke dit (`applyCashCap` gjør ingenting).
- `valueCreated` teller den fortsatt, så ingen mister sluttmål, stormodeller eller prestasjoner de har.
- Hall of Fame-lista fryser på dagens tall – det er det riktige for en historisk liste.

**Anbefaling:** fjern taket, og la «Verdi» og «Mest penger på bok» bli historiske lister (Hall of Fame) i stedet for
sesongens hovedlister. Sesongen rangeres på **Konsernverdi** (serveren, ekte tid). Ukens «Mer verdi enn før» byttes mot
noe som ikke går i spillfart, eller tas bort.

## 4. Hva legacy-gulvet gir i dag

Gulvet (`konsern.floor`) er titlene spilleren hadde ved byttet 29.9 (065). Det er lagret en gang og regnes aldri på nytt
– det vokser ikke med kassa. Men det brukes mekanisk: `greatest(level, floor)` gir plasser, høyeste trinn og tilgang til
komplekser. I tillegg er `konsern.level` en skralle som tok med gulvet, så `level` = gulvet for alle med gulv.

| Spiller (30.9) | Gulv | Opptjent | Verk | Plasser nå / opptjent | Trinn nå / opptjent | Komplekser |
|---|---|---|---|---|---|---|
| A | 6 | 1 | 12 | 14 / 8 | 5 / 4 | 9 |
| B | 6 | 5 | 10 | 14 / 12 | 5 / 5 | 8 |
| C | 5 | 1 | 5 | 12 / 8 | 5 / 4 | 5 |
| D | 3 | 0 | 10 | 10 / 8 | 5 / 3 | 7 |
| E | 3 | 0 | 10 | 10 / 8 | 5 / 3 | 10 (trinn 0) |
| F | 2 | 0 | 10 | 10 / 8 | 4 / 3 | 1 |
| G | 2 | 0 | 5 | 10 / 8 | 4 / 3 | 2 |
| H, I | 1 | 0 | 8 | 8 / 8 | 4 / 3 | 0 |
| J (gulv = opptjent) | 6 | 7 | 14 | 14 / 14 | 6 / 6 | 11 |

(Bokstaver i stedet for kallenavn, fordi repoet er offentlig.)

**Den konkrete fordelen:**

1. **Komplekser uten å ha tjent seg opp:** komplekser krever nivå 2 (Stålfyrste: 6 storverk/komplekser på trinn 4). Sju
   spillere med opptjent nivå 0–1 kan kjøpe og bytte til komplekser – det mest lønnsomme i konsernet.
2. **Flere plasser:** opptil 6 plasser mer enn opptjent (A: 14 mot 8).
3. **Høyere trinn:** 1–2 trinn mer modernisering enn opptjent.
4. **Tittel:** vises på topplista (bare prestisje).

**Men den varer kort.** Simulatoren viser at en legacy-spiller med bare opptjent nivå tar igjen gulvet på **6–10 ekte
dager**, fordi verkene de allerede har, gir nivåene fort når de moderniseres. Den varige fordelen er eiendelene
(kompleksene som ble kjøpt med gulvet) – og dem skal ingen miste.

## 5. Forslag: skill tittel fra opptjent nivå, uten å ta noe fra noen

- **Tittel** (historisk, synlig): `greatest(level, floor)` som i dag – på topplista, ved navnet og i spillet (`legends`,
  som låser opp ting hjemme). Ingen mister tittelen sin.
- **Opptjent nivå** (mekanisk): en ny kolonne `konsern.earned`, lik stigen verkene gir (`konsern_ladder_level`), og som
  aldri går ned. Startverdi: det verkene gir i dag. Brukes til plasser, høyeste trinn og tilgang til komplekser.
- **Ingenting tas bort:** verk, komplekser og trinn over det opptjente nivået står. Man kan bare ikke *legge til* mer
  før det opptjente nivået har tatt igjen: ikke verk nr. 13 med plass til 8, ikke trinn 5 med høyeste trinn 4, ikke
  nye komplekser før nivå 2.
- **Bytte mot kompleks** når man er over antall plasser: tillatt hvis antallet ikke øker og nivået er 2 (et bytte legger
  ikke til noe).
- Endres i `konsern_order`, `konsern_settle` og speilet i `konsernWorld.ts` (`worldLevel` → `earned` for plasser og
  trinn). Dry-run først: hvilke bestillinger som ville vært avvist de siste dagene.

**Konsekvens for spillerne i tabellen:** A, C, D, E, F og G kan ikke bygge nye verk før de har modernisert seg opp
(ca. 1–2 uker). De kan fortsatt modernisere til sitt opptjente trinn. B, H og I merker nesten ingenting. J merker ingenting.

## 6. Ny simulering: 30/60/90/180 ekte dager (dagens priser)

Forutsetninger: en flink spiller som fyller køen hver time med det som betaler seg raskest (innen 180 dager), full
konsernforskning og felles funksjoner, omdømme 100, aktiv hver uke. Bidraget er fast per type (kalibrert mot ekte tall:
2,5–47 mill. per dag). Kassa er det som ikke er brukt – kapitalen som er ledig til anbud og oppkjøp.

| Spillertype | Dag | Konsernkasse | Bidrag/d | Utbytte/d | Verk | Brukt i alt |
|---|---|---|---|---|---|---|
| Liten (5 mill./d, uten «Større konsern») | 30 | 25 mill. | 5 | 19 | 6 stor, 2 kompl., trinn 3,6 | 478 mill. |
| | 60 | 49 mill. | 5 | 32 | 2 stor, 10 kompl., trinn 4,7 | 1,6 mrd. |
| | 90 | 0,9 mrd. | 5 | 35 | 1 stor, 11 kompl., trinn 6 | 2,0 mrd. |
| | 180 | 4,5 mrd. | 5 | 35 | samme – fullt | 2,0 mrd. |
| Middels (15 mill./d) | 30 | 47 mill. | 15 | 29 | 4 stor, 6 kompl., trinn 4,6 | 1,1 mrd. |
| | 60 | 0,8 mrd. | 15 | 37 | 3 stor, 11 kompl., trinn 6 – fullt | 1,9 mrd. |
| | 180 | 7,0 mrd. | 15 | 37 | fullt | 1,9 mrd. |
| Stor (30 mill./d) | 30 | 66 mill. | 30 | 36 | 3 stor, 10 kompl., trinn 5,8 | 1,7 mrd. |
| | 60 | 1,9 mrd. | 30 | 37 | fullt | 1,8 mrd. |
| | 180 | 10,0 mrd. | 30 | 37 | fullt | 1,8 mrd. |
| Stor + skraplager halve tida | 180 | 10,7 mrd. | 30 | 37 | fullt (+15 mill./d selskap) | 1,7 mrd. |
| Legacy, 12 verk, gulv 6 | 30 | 0,75 mrd. | 23 | 38 | 1 stor, 13 kompl., trinn 6 | 1,1 mrd. |
| | 180 | 9,9 mrd. | 23 | 38 | fullt | 1,1 mrd. |
| Legacy, bare opptjent nivå | – | samme tall | | | tar igjen gulvet (nivå 6) dag 6 | |
| Legacy, 10 kompl. på trinn 0, gulv 3 | 30 | 69 mill. | 9 | 38 | fullt | 1,2 mrd. |
| Samme, bare opptjent nivå | 30 | 58 mill. | 9 | 38 | nesten fullt | 1,2 mrd. |

**Tid til nivåene (ekte dag):**

| | Magnat | Fyrste | Konge | Keiser | Legende | Gigant | Kolosse | Myte |
|---|---|---|---|---|---|---|---|---|
| Liten | 15 | 21 | 32 | 41 | 48 | 54 | 62 | – |
| Middels | 8 | 12 | 18 | 25 | 30 | 36 | 41 | – |
| Stor | 4 | 8 | 11 | 18 | 22 | 25 | 28 | – |
| Legacy trinn 0, gulv 3 → opptjent | 4 | 10 | 10 | 12 | 13 | 17 | 20 | 29 |

**Det tallene sier:**

1. **Konsernet er fullt på 1–3 måneder.** Med prisene fra B-373 og bidraget fra B-318 fyller selv en liten, ny spiller
   hele konsernet (14 plasser, 11 komplekser på trinn 6) på ca. 60–90 dager. Da er det ingenting mer å bygge.
2. **Etter det hoper konsernkassa seg opp:** 40–70 mill. per ekte dag, 4–11 mrd. etter et halvt år. Det er det samme
   problemet som 10 mrd.-taket prøvde å løse hjemme, bare flyttet til verden.
3. **Oppkjøp blir en ren kassekamp.** Minstebudet er 10 dagers inntekt (ca. 154 mill.), og budet teller fullt til 10 ×
   verdien (ca. 1,5 mrd.). Etter noen måneder har alle aktive spillere råd til det sterkeste budet på alle selskaper.
4. **Legacy-gulvet betyr lite over tid** (6–10 dager) – eiendelene betyr mer.

Simulatoren er en øvre grense: den handler hver time. En spiller som sjekker et par ganger om dagen, bruker lenger tid,
men køen på 3 (4–12 timer per prosjekt) dekker omtrent et døgn, så forskjellen er dager, ikke måneder.

Jeg foreslår **ikke** ny nedskalering nå, slik du ba om. Men det bør følges med de neste dagene: hvor mye konsernkassene
faktisk vokser, og hvor fort de største fyller konsernet. Sjekken 2.10 rapporterer dette.

## 7. Nye sårbarheter

1. **Serveren stoler på spillet fra mobilen for noen verdensverdier:** `researched` (plasser, rabatter), `konsern.shared`
   (+10 % utbytte), omdømme og kvalitet (flaggskipet, +20 % utbytte), `stage`/`unlocked` (tilgang til konsernet) og
   marginen i `history` (bidraget, med tak på 3 000 kr/t). En endret app kunne sette dem uten å spille. Juksesperren ser
   ikke dette. Alvor: lav til middels (krever at noen endrer lagringen). Tiltak senere: la serveren eie kjøpene av felles
   funksjoner og konsernforskning, eller sjekke dem mot tidslinja.
2. **Innskuddet er bare slått av med et tall i `config`.** Mangler nøkkelen, er grensen 100 mill. per døgn. Tiltak:
   standard 0 i `treasury_limit` (liten serverendring).
3. **`konsern.level` er en skralle som tok med gulvet.** Å bruke «bare opptjent» krever egen kolonne; ellers står gulvet
   i `level` for alltid.
4. **Kassekamp om selskapene** (punkt 6.3): ikke en feil, men en svakhet i økonomien når konsernet er fullt.

## 8. Min vurdering av planen

- **Riktig rekkefølge.** Taket og gulvet er små, trygge endringer. Simulatoren er nå permanent og bruker dagens regler.
- **Taket kan fjernes nå**, sammen med oppryddingen i listene (sesongen på Konsernverdi). Uten den oppryddingen blir
  sesongen et kappløp i spillfart.
- **Legacy-gulvet:** forslaget i punkt 5 er rettferdig og tar ingenting fra noen, men gevinsten er liten (6–10 dager). Det
  er verdt å gjøre fordi det gjør regelen enkel: *nivået er det du har tjent*. Det bør ikke få høy prioritet.
- **Det største funnet er ikke taket, men farten i konsernet.** Når konsernet er fullt på 1–3 måneder, trenger
  konsernkassa noe meningsfullt å brukes til – ellers gjentar vi 10 mrd.-problemet i verden. Verksjefene (lønn,
  mandater med ulemper) og flere selskaper er naturlige mottakere. Det er et argument for å ikke vente for lenge med
  dem, men riktig å vente på ekte data først.
- **STATUS.md** bør skrives etter at du har bestemt deg om taket og gulvet, så den beskriver reglene slik de blir.

## Spørsmål

1. Skal taket fjernes, med Privat formue som historikk og sesongen rangert på Konsernverdi?
2. Skal «Verdi» og «Mest penger på bok» bli historiske lister, og ukens «Mer verdi enn før» byttes eller tas bort?
3. Skal gulvet skilles fra opptjent nivå som i punkt 5 (tittel beholdes, nye kjøp etter opptjent nivå)?
4. Skal innskuddet herdes (standard 0) nå? Det er en liten, trygg serverendring.
