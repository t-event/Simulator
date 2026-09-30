# STATUS – slik virker Stålverket nå

**Fasit for hvordan spillet virker i dag** (sist oppdatert 30.9.2026, B-385). Hvorfor ting er som de er, står i
`BESLUTNINGER.md`; hva som ble gjort når, står i `LOGG.md`. Endrer du en regel, oppdater denne fila i samme økt. Står
noe annet i et eldre analyse- eller forslagsdokument, gjelder denne fila.

## 1. To klokker og to kasser

| | Hjemmeverket (eget verk) | Industriverdenen (konsernet) |
|---|---|---|
| Tid | **Spilltid**, på mobilen, 1×/3×/10× | **Ekte tid**, på serveren, likt for alle |
| Penger | **Kassa** (`g.cash`) | **Konsernkassa** (`treasury.balance`) |
| Hva det gir | Kunnskap, optimalisering, lokal progresjon | Kapital og makt som påvirker andre spillere |
| Hvem regner | Appen (`game/`) | Serveren (`supabase/`), appen speiler |

Regelen (B-190, B-323): det som hjelper eget verk, kan gå i spillfarten; det som samler penger eller makt mot andre,
regnes av serveren i ekte tid.

## 2. Hjemmeverket

- Fra garasje til storverk (nivå 0–4) med forskning, folk, strøm, resepter, kontrakter, vinter, fellesferie, utslipp,
  kokiller, byggetid for store kjøp (fra 50 mill.) og nabolagsprosjekter. Balansen sjekkes av `balance.ts` (CI).
- **Kassa har ikke tak** (B-381). Den kan vokse fritt – den gir ingen makt i verden.
- **Privat formue** (`g.paidOut` + gamle `lockedReserve`) er fryst historikk fra da kassa hadde tak (B-303–B-381). Den
  vokser ikke, kan ikke brukes, men teller i `valueCreated` (sluttmålet 10 mrd., stormodellene ved 25 mrd., prestasjoner).
- Visning: toppfeltet viser store beløp kort fra 100 mrd. (`fmtKrCompact`), Verket → Økonomi viser hele beløpet.
- Konsernverdien i spillet (`konsernEquity`: kasse − lån + verkenes verdi) er «Verdi» på lista for eget verk.

## 3. Konsernet (serveren eier det)

- Verk, kø og nivå ligger i `konsern`/`konsern_orders`. Kjøp går via `konsern_order` fra konsernkassa; én bygges om
  gangen, inntil 3 i kø. `save_game` skriver serverens verk inn i spillet (`konsern_into_state`). Appen speiler reglene i
  `game/konsernWorld.ts`.
- Priser: stålverk 5, storverk 20, kompleks 60 mill.; modernisering 30 % av prisen per trinn; salg 60 %.
- **Tittel og opptjent nivå er to ting** (B-383):
  - **Tittel** = `konsern.level` (stigen, tatt med gulvet fra byttet 29.9). Vises på topplista og gir titler, pynt og
    stormodellene hjemme (`g.konsern.legends`). Går aldri ned.
  - **Opptjent nivå** = `konsern.earned` (det høyeste stigen verkene har gitt, uten gulvet). Avgjør **plasser**
    (6, 8 med «Større konsern», +2 ved nivå 2/4/6), **høyeste trinn** (3, +1 ved nivå 1/3/7) og **komplekser** (nivå 2).
    Går aldri ned. Appen: `earnedOf(g)`.
  - Ingenting tas bort: verk, trinn og betalte bestillinger over det opptjente står. Bytte til kompleks sperres ikke av
    plassene, bare av nivå 2.
- Regioner (seks), flytt én gang per verk, verdenskart (B-333).

## 4. Konsernkassa: inn og ut

**Inn (ekte tid, serveren):**
- **Bidrag** fra hovedverket hver ekte dag (`pay_contributions`, snitt av kvartersmålinger, B-318/B-361).
- **Utbytte** fra datterverkene hver ekte dag (`pay_dividends`, `dividend_from_state`, snitt, B-304/B-362), etter
  utbyttepolitikken (resten til forsvarsfondet, B-334) og aktivitetskravet (B-327). Fullt konsern ≈ 35–38 mill./dag.
- **Selskapsinntekt** for den som eier et strategisk selskap (skraplageret er det eneste aktive).
- Dagen skifter ved midnatt norsk tid (`world_today`).

**Ut:** nye verk og modernisering, anbud på selskaper, investering i Kontroll, oppkjøpsbud og motbud.

**Innskudd fra kassa hjemme er stengt «fail-closed»** (B-382): grensen er 0 med mindre `config.world` har
`treasury_deposit_enabled = true` og et positivt `treasury_base_per_day`. Ingen av delene er satt.

## 5. Selskaper, Kontroll og oppkjøp

- Anbud (48 t skjult) og pilotkonsesjon 14 dager; `world_tick` avgjør «lat» (pg_cron hvert 5. min).
- Kontroll regnes av `company_control` (aktivitet, investering, region, eiertid); vises som kroner (B-370).
- Oppkjøpsbud og motbud er på (fra 29.9.2026). Budet teller inntil 10 × verdien (verdi = 10 dagers inntekt), forsvaret
  høyst 3 ×; eieren kan alltid miste selskapet. Eieren får `takeover_payout` (B-375). Anbud fra før 29.9 regnes i dagens
  penger (B-374).
- Slagghåndteringen og andre selskaper er ikke aktive.

## 6. Konkurranse og lister

- **Sesongen avgjøres på Konsernverdi** (B-384): `close_season` rangerer på `konsern_value` (konsernkassa + 60 dagers
  utbytte og bidrag − lån, i ekte tid); de uten konsern kommer etter, på verdien i eget verk. Verdien i eget verk fryses
  også (Hall of Fame). Sesonger startes og avsluttes bare manuelt.
- **Topplista** har to grupper: «Industriverden · sesong» (Konsernverdi) og «Eget verk» (Verdi, Mest penger på bok,
  Produksjon, Raskest til storverk, Raskest til 10 mrd., Kontrollrom, Privat formue – fryst). Eget verk er ære, ikke makt.
- **Ukens utfordring:** «Flest aktive dager» (ekte dager) og «Mer stål enn før» veksler fra uka 5.10.2026.
  «Størst vekst i konsernverdi» er tatt bort. Eieren har valgt «Ukens kontrollrom» som neste; forslaget står i
  `UKENS-KONTROLLROM.md` (ikke bygget).
- Juksesperren (`check_snapshot`) sjekker vekst, tonn, fart og første opplasting.

## 7. Konto og gjester

- Selve spillet krever aldri konto (B-149, `KONTO.md`). Lagring på nett, lister, konsern, selskaper og chat krever konto.
- Gjester er anonyme kontoer (B-212) som slippes til det som står i `guest_gate`; de får ingen penger eller plass mellom
  spillere, og slettes etter 60 dager uten lagring (B-377).

## 8. Verdensøkonomien – hva simulatoren viser nå (B-385)

`npx tsx src/game/worldSim.ts` (fra `frontend/`), dagens regler, flink spiller, ingen tilfeldighet. Konsernkassa i mill. kr:

| Spillertype | 30 | 60 | 90 | 180 | 365 | 730 | Ferdig utbygd |
|---|---|---|---|---|---|---|---|
| Liten (bidrag 5 mill./d) | 25 | 49 | 932 | 4 495 | 11 819 | 26 268 | dag 68 |
| Middels (15 mill./d) | 47 | 805 | 2 364 | 7 039 | 16 651 | 35 614 | dag 46 |
| Stor (30 mill./d) | 66 | 1 942 | 3 950 | 9 976 | 22 363 | 46 801 | dag 33 |
| Stor + skraplager halve tida | 72 | 2 140 | 4 288 | 10 734 | 23 726 | 49 609 | dag 32 |
| Legacy (12 verk, gulv 6, opptjent 1) | 750 | 2 575 | 4 400 | 9 875 | 21 130 | 43 335 | dag 19 |
| Legacy (10 komplekser trinn 0, gulv 3) | 58 | 1 396 | 2 817 | 7 077 | 15 834 | 33 112 | dag 32 |

- **Dager etter ferdig utbygd til 1 / 5 / 10 / 25 mrd.:** liten +24 / +125 / +252 / +630; middels +18 / +95 / +191 /
  +480; stor +13 / +73 / +148 / +372; legacy +16 / +81 / +164 / +410.
- **Maksimale oppkjøpsbud** (10 × 171 mill. = 1,7 mrd.) kassa har råd til: dag 365 liten 6, middels 9, stor 13; dag 730
  liten 15, middels 20, stor 27.
- **Andel av årets inntekt som brukes:** år 1 7–12 % (verk og modernisering; 11 % med skraplageret), år 2 **0 %** (5 % med
  selskapsbud). Resten blir liggende i kassa.
- **Liten / middels / stor:** utbyttet er nesten likt når konsernet er fullt (35–37 mill./dag); forskjellen er bidraget.
  Stor har 1,9 × kassa til liten etter ett år og 1,8 × etter to.
- **Hva det betyr:** når konsernet er fullt (1–2 måneder), har konsernkassa nesten ingenting å brukes til. Oppkjøp blir
  en kassekamp om ett selskap. Dette er målt, ikke rettet – ingen ny balanse før eieren bestemmer det.

## 9. Kjente svakheter

1. Serveren leser noen verdier fra spillet på mobilen (forskning, felles funksjoner, omdømme, kvalitet, margin). En
   endret app kunne sette dem (STABILISERING.md avsnitt 7).
2. Konsernkassa hoper seg opp når konsernet er fullt (avsnitt 8).
3. Simulatorens kjøper stopper på nivå 7 for nye spillere (bytter ikke de siste storverkene) – det er simulatorens
   tilbakebetalingsgrense, ikke en regel.

## 10. Forslag som venter (ikke bygget)

- `UKENS-KONTROLLROM.md` – ukekonkurranse i kontrollrommet (B-386).
- `KONSERNKAPITAL-FORSLAG.md` – hva konsernkassa brukes til etter fullt konsern (B-386). Eierens premiss: penger skal
  gi valg, ikke forsvinne. Ingen økonomiske justeringer før eieren har svart.
- `VERKSJEF-FORSLAG.md` – verksjefer (B-379), del av kapitalforslaget.

## 11. Hvor reglene står

| Regel | App | Server |
|---|---|---|
| Kjøp, kø, stige, opptjent nivå | `game/konsernWorld.ts`, `game/konsern.ts` | `konsern_order`, `konsern_settle` (091) |
| Utbytte | `game/dividend.ts` | `dividend_from_state` (051), `pay_dividends` |
| Bidrag | – (bare serveren) | `pay_contributions` (061, 077) |
| Kontroll og oppkjøp | `game/control.ts` | `company_control`, `takeover_*` (067, 068, 087) |
| Innskudd | `net/treasury.ts` | `treasury_limit`, `deposit_to_treasury` (090) |
| Lister og sesong | `net/leaderboard.ts`, `net/season.ts` | `leaderboard`, `close_season`, `season_history` (092, 093) |
| Uker | `net/weekly.ts` | `week_kind` (092) |
| Privat formue | `game/reserve.ts` | `note_paid_out` (050) |
