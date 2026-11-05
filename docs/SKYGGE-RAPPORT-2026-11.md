# Skyggerapporten for V0/K-1 – første måned (november 2026)

**Grunnlaget:** `program_shadow_report()` for de 31 ekte dagene etter at skyggen startet (B-424). 23 konsern med datterverk
og utbytte. Spillerne står som bokstaver (A = høyest konsernverdi). Trukne datoer og kallenavn er ikke med (B-424).
Ingenting er slått på: `config.world.programs.enabled` og `events_enabled` står av.

## 0. Kort fortalt

- **For lite å avgjøre på.** I måneden startet 3 hendelser, og alle tre var høykonjunktur. Det kom verken strømsjokk eller
  driftsuro, så Teknologi og Robusthet hadde ingenting å verne mot. «Kostnad per spart krone» kan ikke regnes ennå.
- **Det tekniske stemmer med spesifikasjonen:**
  - Hyppigheten: 3 hendelser mot 3,4 forventet.
  - Varselet kom 2 dager før, varighetene ligger innenfor rammene, og høykonjunkturen er på 0,304 som i config.
  - Datamengden er liten (ca. 460 kB på en måned).
- **Anbefaling: ikke slå på ennå. La skyggen gå én måned til.** Fire nye hendelser er alt trukket og starter de neste
  ukene: én høykonjunktur, ett strømsjokk og to driftsuro. Da kan vernet måles på ekte dårlige hendelser, som var hele
  poenget med skyggen (B-391, B-392).

## 1. Hendelsene mot forventet

| | Strømsjokk | Driftsuro | Høykonjunktur | Sum |
|---|---|---|---|---|
| Forventet på 31 dager (6 regioner × 0,56) | 0,84 | 0,84 | 1,68 | 3,36 |
| Startet | 0 | 0 | 3 | 3 |

- Sjansen for at alle tre blir høykonjunktur, er 12,5 % (0,5³). Det er altså uflaks i trekningen, ikke en feil.
  Fordelingen var 50/25/25 i oktober og er 40/20/40 fra november (vinteren, B-391).
- Høykonjunkturene var i Sørsletta, Vestbukta og Øyene. Jernåsen, Nordkysten og Østskogen hadde ingenting.
- Det er trukket 7 hendelser i alt. De 4 som ikke har startet ennå, er med i neste rapport.

## 2. Utslag for spillerne (V0 alene, uten program)

Samlet utbytte fra datterverkene i perioden var 12,7 mrd. kr (og 8,7 mrd. i bidrag, som V0 ikke rører). Høykonjunkturene
ville gitt 573 mill. mer, altså +4,5 %. Bare oppsiden kom denne måneden.

| Utslag (andel av eget utbytte) | Spillere |
|---|---|
| 0 % (ingen verk i en region med hendelse) | E, T, W |
| 0–2 % | C, I, N, V |
| 2–5 % | F, G, L, M, O, Q, S, U |
| 5–8 % | A, D, J, K, P, R |
| over 8 % | H (8,7 %), B (10,4 %) |

Plasseringen betyr som tenkt:
- B har 59 % av verkene i én region som fikk høykonjunktur, og fikk +10,4 %.
- C har 91 % i én region som ikke fikk noe, og fikk +1,4 %.
- De spredte (D, G, U med høyst 25–27 % i én region) havnet midt på (2,8–5,1 %).
- Ingen fikk rare utslag som ikke kan forklares med hvor verkene står.

## 3. Programmene – hva de ville kostet og gitt

Kostnaden er en fast andel av utbyttet: Lav/Middels/Høy er 0,5/1,5/4 % (config) eller 1/3/8 %.

| Program (alle 23 samlet) | 0,5 / 1,5 / 4 % | 1 / 3 / 8 % |
|---|---|---|
| Teknologi, Middels: kostnad | ca. 190 mill. | ca. 380 mill. |
| Teknologi og Robusthet: spart | 0 (ingen dårlige hendelser) | 0 |
| Teknologi + Robusthet, Lav og Høy ved varsel: netto | ca. −127 mill. | ca. −254 mill. |
| Driftsytelse, Høy: netto | ca. +27 mill. (+0,2 % av utbyttet) | ca. +55 mill. |

- **Teknologi og Robusthet** var rent tap i oktober, som de skal være i en måned uten dårlige hendelser. De er forsikring.
- **Driftsytelse** ga litt i pluss, fordi måneden bare hadde oppside. Ulempen (hardere i dårlige hendelser) ble ikke testet.
- **Høy ville vært rasjonelt** 0 dager for Teknologi: det kom ingen varsler om tap.
- **De laveste 14 dagene:** uten hendelser med tap fjerner programmene ingen variasjon. Med Teknologi og Robusthet på Høy
  blir de laveste 14 dagene bare dyrere (ca. −8 % for alle).

## 4. Etableringen for seg

Etableringen (2 dagers utbytte per start eller bytte) koster mellom 4 mill. (W) og 71 mill. (A). Det er ca. 6,5 % av en
måneds utbytte, altså mer enn én måned med Middels (1,5 %) eller to uker med Høy (4 %). Over to år er den en liten del for
den som bytter sjelden, men stor for den som bytter etter hvert varsel – slik avsnitt 8.4 i K1-PROGRAMMER.md fant.
Ikke endre noe før vi har data med dårlige hendelser. Er den fortsatt tung da, er 1 dag et naturlig forslag.

## 5. Datamengden

| Tabell | Rader | Størrelse |
|---|---|---|
| `program_shadow_day` | 709 | 248 kB |
| `world_event_exposure` | 374 | 104 kB |
| `world_events` | 7 | 64 kB |
| `world_event_draws` | 7 | 32 kB |

Ca. 460 kB i måneden. Det tåler gratisplanen godt (B-353).

## 6. Anbefaling og spørsmål til eieren

**Anbefaling:** ikke slå på V0 eller K-1 nå. La skyggen gå til begynnelsen av desember og ta en ny rapport da, med de fire
hendelsene som alt er trukket (tre av dem dårlige). Bryterne står av til du svarer.

Teknisk er alt klart. Det som mangler, er å se vernet virke på ekte tap:
- kostnad per spart krone,
- hvor ofte Høy er rasjonelt,
- hvor mye variasjon programmene fjerner,
- og om Driftsytelse taper så mye som simuleringen sier i dårlige hendelser.

**Spørsmål:**
1. Skal skyggen gå én måned til (anbefalt), eller vil du slå på V0 alene nå? V0 er nøytral i snitt og et eget lag i
   Industriverdenen (B-390).
2. Satsene: behold 0,5/1,5/4 % til neste rapport (anbefalt)? Oktober sier ingenting om 1/3/8 % ut over at det dobler
   kostnaden.
3. Etableringen: behold 2 dagers utbytte til neste rapport (anbefalt), eller sett ned til 1 dag allerede nå?

**Svar (5.11, B-513):** eieren valgte anbefalingene – skyggen går én måned til, satsene og etableringen beholdes.
Neste rapport er planlagt 2.12.

Endringslogg: nei (ingenting i spillet er endret).
