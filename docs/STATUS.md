# STATUS – slik virker Stålverket nå

**Fasit for hvordan spillet virker i dag** (sist oppdatert 3.10.2026, B-445). Hvorfor ting er som de er, står i
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
- **Verkskontoen på storverket** (B-455): råd og «!» på Verket når kassa holder til et nabolagsbygg og kortet
  «Byggeprosjekter» ikke er sett (`neighborHintDue`). Når alle seks byggene står, kan de utvides til trinn 2 (3 × prisen)
  og 3 (9 ×) uten ny fordel, og **verkets stiftelse** gir penger til byen i trinn (1, 2, 5, 10 … mrd., så dobling) for
  titler, prestasjoner og pynt. **Slitasje:** storverket slites over 180 spilldøgn (ikke i sommerstansen); over 50 %
  havarerer ovnene oftere (helt slitt: 2 ×). Fornyelsen koster 20 % av utstyrets pris × slitasjen; reparatøren fornyer
  selv ved 70 % med «Reparatøren bytter foringen» på. Alt dette føres som `investering`, som marginen i bidraget ikke
  teller.
- **Kontrakter på Salg** (B-461): vurderingen regner med det verket lager (snittet av de siste døgnene med produksjon),
  men null når hele verket står til spilleren gjør noe (ingen penger til omforing, ingen folk). «Signer likevel…» spør
  med boten. Råd på Verket når verket står og når kontrakter i køen ikke rekker fristen; avbryting foreslås bare når
  den er billigere enn boten ved fristen (bot av ulevert ved fristen mot 60 % av det som gjenstår).
- Ingen hendelseskort om forhold mellom ansatte (trakassering, diskriminering, varsling) – tatt ut etter eierens ønske
  (B-444).
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
  Ferdige byggeprosjekter gjøres ferdige ved hver måling, også for den som er borte, og den som har solgt sitt siste
  verk, får utbyttet for målingene som er tatt (111, B-423). Dager før 2.10 betales aldri automatisk (114, B-425).
- **Verving** (B-459): 10 mill. per venn som har spilt minst 3 ekte dager og nådd støperiet, høyst 5 venner. Regnes når
  kortet hentes (`referral_settle`), føres som `justering` og øker ikke lånerammen.
- **Selskapsinntekt** for den som eier et strategisk selskap (skraplageret er det eneste aktive).
- Dagen skifter ved midnatt norsk tid (`world_today`).
- **Verdensjobbene** (B-401): hver spiller (hvert selskap) behandles for seg i målingene, utbyttet, bidraget og
  selskapsinntekten. En feil rulles tilbake bare for den spilleren, logges, og prøves igjen neste kjøring (hvert 5. min);
  en betaling krediteres bare når raden ble satt inn, så nye forsøk betaler aldri dobbelt. Status: `world_health()` (per
  jobb) og `world_health_players()` (per spiller: siste måling, betalt til og med, siste vellykkede behandling, feil).

**Ut:** nye verk og modernisering, anbud på selskaper, investering i Kontroll, oppkjøpsbud og motbud.

**Konsernbanken** (B-437, 120/121): lån bare til bestillinger i konsernet (nye verk, utbygging, modernisering, bytte til
kompleks) – aldri anbud, oppkjøpsbud, motbud eller Kontroll. Rammen er 10 dagers inntekt (snittet av utbyttet og
bidraget de siste 7 ekte dagene). Lånet tas i bestillingen (`konsern_order_loan`): kassa betaler det den har, banken
resten. Rente 1 % per ekte dag, regnet for hele dager før lånet endres (`bank_accrue`, B-443); hver natt går halvparten av
utbyttet og bidraget siden forrige nedbetaling (`repay_at`) til lånet (`bank_service` i `world_tick`). Salg, avbestilling
og bytte til kompleks betaler lånet først. Lånet trekkes fra konsernverdien. Tallene i `config.world.bank`.

**Innskudd fra kassa hjemme er stengt «fail-closed»** (B-382): grensen er 0 med mindre `config.world` har
`treasury_deposit_enabled = true` og et positivt `treasury_base_per_day`. Ingen av delene er satt.

## 5. Selskaper, Kontroll og oppkjøp

- Anbud (48 t skjult) og pilotkonsesjon 14 dager; `world_tick` avgjør «lat» (pg_cron hvert 5. min).
- Varsel om åpent anbud (B-453): i varsellinja når det åpner og når 12 timer er igjen, til den som ikke har bydd, med
  lenke til Konsern → Industrien. Ved budfeltet: budet kommer tilbake til den som taper, og «Lønner det seg?» (14 dager ×
  kjøperens eget anslag mot budet).
- Kontroll regnes av `company_control` (aktivitet, investering, region, eiertid); vises som kroner (B-370).
- Oppkjøpsbud og motbud er på (fra 29.9.2026). Budet teller 60 × √(bud / V) × (0,5 + 0,5 × aktivitet) + region, inntil
  10 × verdien (verdi V = det høyeste av 10 dagers inntekt og siste anbudspris); eieren kan alltid miste selskapet.
  Minstebudet for et nytt forsøk er V, men aldri over 12 dagers inntekt (B-451, 128, `takeover_min_bid`); V er fortsatt
  skalaen for budstyrke, motbud, Kontroll og inntektsøkning. Står bud og motbud likt,
  beholder eieren selskapet (`att > def`). Eieren får `takeover_payout` ved salg (B-375). Anbud fra før 29.9 regnes i
  dagens penger (B-374).
- **Regelsett 2** (B-441, 123; alle bud fra 3.10.2026, `takeovers.rules` = 2): motbudet teller som budet (60 × √(beløp /
  V), inntil 5 × V) pluss Kontroll / 5 (høyst 20). Fondet teller bare når det legges inn som motbud. Vinneren betaler:
  eierens motbud som holder, er brukt opp; taperen får 75 % tilbake (kjøperen når budet ikke holder, eieren når selskapet
  blir kjøpt). 14 dagers pause etter et avverget forsøk. Mens et bud står åpent, kan andre by minst 5 % (minst 1 mill.)
  over; den overbudte får hele budet tilbake, og et bud de siste 12 timene flytter fristen til 12 timer etter budet
  (B-442, 124, `takeover_bids`). Et overbud må også gi et sterkere bud med budgiverens egen aktivitet og verk i regionen
  (`takeover_outbid_min`), en egen økning må være minst 5 %, og fristen går aldri mer enn 24 timer forbi den opprinnelige
  (B-443, 125). Appen ber om bekreftelse før bud og motbud og sender budet den viste (`takeover_bid` med `p_seen_bid`/
  `p_seen_mine`, «endret» hvis det er endret). «Lønner det seg?» bruker kjøperens eget anslag (`company_estimate_for`). Regelsett 1 (bud fra før 3.10): forsvar = Kontroll + 40 × √((motbud
  + fond, fondet høyst V) / V), høyst 3 × V; kjøperen får 90 % tilbake, eieren 95 % av motbudet uansett.
- Slettes en konto mens et oppkjøpsbud er åpent, gjøres budet opp først (B-430, 116; i `delete_my_account` før
  slettingen, B-434, 119): angriperen får hele budet tilbake, eieren får motbudet tilbake (kassa og fondet).
- Selskapskortet viser minstebudet ved oppkjøp (B-451) og, ved oppkjøp, «Lønner det seg?»: inntekten i dagene kjøperen eier
  selskapet (til perioden går ut, minst 14 dager) mot budet, og hva som kommer tilbake hvis budet ikke holder (75 %,
  regelsett 1: 90 %; B-435, B-441).
- Slagghåndteringen er aktiv fra 3.10.2026 (B-445, første anbud stenger 5.10 kl. 10:38). Mekanisk verksted er ikke aktivt.

## 6. Konkurranse og lister

- **Sesongen avgjøres på Konsernverdi** (B-384): `close_season` rangerer på `konsern_value` (konsernkassa + 60 dagers
  utbytte og bidrag − lån, i ekte tid); de uten konsern kommer etter, på verdien i eget verk. Bidraget i verdien regnes
  med aktiviteten i siste betalte bidrag, eller dagens produksjon hvis den er høyere (B-417, 104) – en som ikke spiller,
  står med det hen faktisk får betalt (gulvet 0,3), ikke med fullt bidrag. Verdien i eget verk fryses
  også (Hall of Fame). Sesonger startes og avsluttes bare manuelt.
- **Topplista** har to grupper: «Industriverden · sesong» (Konsernverdi) og «Eget verk» (Verdi, Mest penger på bok,
  Produksjon, Raskest til storverk, Raskest til 10 mrd., Kontrollrom, Privat formue – fryst). Eget verk er ære, ikke makt.
- **Sesongstigen** (gratis sesongpass, B-173, B-452, 129): poeng for hver dag med spill (1), dagens belønning (2), dagens
  oppdrag (3) og topp 3 på ukelista (12/9/7), regnet på serveren i ekte tid. 50 trinn: trinn 1 ved 6 poeng, trinn 2 ved 12,
  så 20 poeng per trinn (972 for trinn 50; `season_tier_of`, speilet i `tierOf`/`tierPoints`). Hvert trinn gir 20 + 2 ×
  trinn fagpoeng én gang; trinn 1, 10, 20, 30, 40 og 50 gir sesongpynt. Pynt for trinn som alt er hentet, legges inn uten
  nye fagpoeng. Neste premie står på Dagens oppdrag og i velkomstvinduet; premiene hentes med «Hent alt» på Mål.
- **Ukens utfordring** (B-457, 130): uka 5.10 er «Flest aktive dager»; fra uka 12.10 roterer det **«Mest stål per kWh»
  → «Ukens kontrollrom» (første gang 19.10) → «Leveranser i tide» → «Flest aktive dager»**. Stål per kWh er kg per kWh
  i uka (1 000 × tonn / kWh) fra tidslinja, med minst 5 000 t og et rimelig forhold (`timeline_energy`) – små verk er
  ikke med. Leveranser i tide er levert / (levert + misligholdt + avbrutt) i uka med minst 50 leveranser
  (`timeline_metrics`). Begge regnes av serveren i ekte uker. «Mer stål enn før» og «Størst vekst i konsernverdi» er
  tatt ut (står for gamle resultater).
- **Ukens kontrollrom** (B-387, 094): tre tellende forsøk per uke med tre frø fra serveren (A, B, C) – de samme for alle,
  i samme rekkefølge – og ukens kvalitet. Et forsøk er brukt når det startes; det kan leveres med samme id til fristen
  (15 min), også etter en nettfeil (appen lagrer resultatet og prøver igjen). Serveren sjekker tid (20 s–15 min), poeng
  (0–5 000) og stjerner, og lagrer inndataene (høyst 32 kB). Beste leverte forsøk teller. Trening på ukens kvalitet er
  fri, med egne frø, og teller ikke. De siste 15 minuttene av uka kan ingen starte et tellende forsøk, og
  ingenting leveres etter at uka er over (B-397). Verifiseringen er som for kontrollromsrekorden: rimelige tall, ikke avspilling
  (variant B – avspilling på serveren – venter).
- **Profiler** (B-419, 105): trykk på et brukernavn (topplista, ukelista, chatten, kartet, Industrien) for profilen fra
  `player_profile`: tittel, merker, sesongplasseringer, sist aktiv i grove trinn, plass og verdi på «Konsernverdi» med verkene
  per region, selskaper og rekorder. Aldri konsernkassa, kassa eller fondet; flaggede og sperrede har ingen profil. Krever
  konto. **Min profil** (B-420, 106): kort tekst (≤ 120 tegn, ingen lenker), profilmerke (egen pynt) og tre egne
  prestasjoner, endret bare via `profile_update`.
- **Privatmeldinger** (B-421, 107; B-422, 109): på for alle – kan skrus av i Min profil (`profiles.dm_off`), og begge må ha spilt litt (storverk
  eller 3 ekte aktive dager; ikke gjester, sperrede eller flaggede). Høyst 500 tegn, ingen lenker, hvert 3. s / 20 på
  10 min, høyst 5 nye samtaler per ekte dag. Blokkering (den blokkerte får «tar ikke imot meldinger»), rapportering (også
  i Skiftrapporten; rapporten er en kopi). Meldinger eldre enn 30 dager vises ikke; ryddingen hver natt venter på eierens
  bekreftelse (`supabase/utkast/108`). **Adminpanelet** (bare `admins`): rapportene, skjul, avvis, sperr og opphev sperre,
  logget i `admin_log`. **Svar på rapporter** (B-438, 122): eieren kan skrive til den som rapporterte eller den som skrev
  meldingen før et valg tas; spilleren ser det som «Fra admin» øverst i Meldinger og kan svare der (bare når eieren har
  skrevet, ≤ 500 tegn, ingen lenker, hvert 3. s / 20 per dag). Varsel begge veier på prikken ved Skiftrapporten
  (`report_unread`): spilleren for svar fra admin, eieren for nye rapporter og svar fra spillere (også i knappen
  «Adminpanel (N nye)»). Spilleren ser aldri hvem som rapporterte, og bare sin egen samtale; panelet viser én samtale
  om gangen (B-439).
- Juksesperren (`check_snapshot`) sjekker vekst, tonn, fart og første opplasting.
- **Tidslinjetall til nye ukekonkurranser** (B-396, ikke slått på): tidslinja samler tellere i alt – strøm (`kwh_total`),
  leveranser (alltid i tide), misligholdt, avbrutt og reklamasjoner. Serveren regner kWh/t og leveringspresisjon selv
  (`timeline_metrics`); vakten nuller urimelige tall (`metric_note`) uten å avvise raden eller flagge spilleren.
  kWh/t vurderes over minst 5 000 t (`timeline_energy`), fordi strøm bokføres ved chargestart og tonn ved støping (B-398).

## 7. Konto og gjester

- Selve spillet krever aldri konto (B-149, `KONTO.md`). «Mens du var borte» (konto) gir penger og 10 fagpoeng per time borte, høyst
  åtte timer (80); serveren regner tida og fagpoengene (`claim_away_v2`, B-399). Lagring på nett, lister, konsern, selskaper og chat krever konto.
- **Verv en venn** (B-459): kode per konto, lenken `?verv=KODE` huskes i 14 dager. Vennen (ny konto, ikke gjest, yngre
  enn 14 dager) får 50 000 kr og 25 fagpoeng i eget spill; den som vervet får belønningen i konsernkassa (avsnitt 4).
  Delingsknappen på anleggsbildet (B-458) sender tekst og lenke, uten bilde (B-460), og tar med koden.
- Gjester er anonyme kontoer (B-212) som slippes til det som står i `guest_gate`; de får ingen penger eller plass mellom
  spillere, og slettes etter 60 dager uten lagring (B-377).
- Startskjermen viser antall spillere aktive siste 24 timer (spill lagret på nett i døgnet, uten flaggede og sperrede;
  gjester teller med), fra `players_active_24h()` – kan leses uten konto (B-408).

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

1. **Serverautoritet (B-395, trinn 1):** serveren leser fortsatt noen verdier fra spillet på mobilen. Slik står det:
   - **Hardt (serveren eier eller håndhever):** konsernets verk, trinn, typer og regioner, konsernkassa, køen og kjøpene,
     utbytte og bidrag regnes på serveren, ekte tid og aktive dager, selskaper og bud. Fra 095 også: lagringer med feil
     type avvises, felles funksjoner og konsernforskning telles unike og bare kjente id-er, og forskning teller bare med
     forutsetningene (også i `konsern_order`).
   - **Plausibelt (sjekket, men tallet kommer fra mobilen):** tonn per spilldøgn (tidslinja med fartskontrollen,
     `meter_normal_rate`), tilgang til konsernet (kryssjekk mot tidslinja), marginen (tak 3 000 kr/t + skyggeflagg),
     kontrollromsrekorden og ukens forsøk (rimelige tall), tidslinjetallene til kWh/t og leveringspresisjon (B-396).
   - **Klient (må stoles på):** om en forskning eller felles funksjon faktisk er kjøpt (grunnlaget 30.9 er lagret i
     `world_claims`, nye får tidspunkt), omdømme innen 0–100, kvalitet (de siste 7 døgnene), marginen under taket.
   - **Skygge til etter 2.10:** `world_input_log` logger hevdet / mulig / brukt med flagg hvert kvarter. Ingen flagg gjør
     noe før eieren har sett tallene. Marginen er viktigst: en endret app kan melde taket hver dag (ca. 2 × en typisk stor
     spiller). Mellomløsningene står i B-395.
2. Konsernkassa hoper seg opp når konsernet er fullt (avsnitt 8).
3. Simulatorens kjøper stopper på nivå 7 for nye spillere (bytter ikke de siste storverkene) – det er simulatorens
   tilbakebetalingsgrense, ikke en regel.

## 10. Forslag som venter (ikke bygget)

- `UKENS-KONTROLLROM.md` – variant A er bygget (B-387); variant B (avspilling på serveren) venter.
- `KONSERNKAPITAL-FORSLAG.md` – hva konsernkassa brukes til etter fullt konsern (B-386). Eierens premiss: penger skal
  gi valg, ikke forsvinne. Ingen økonomiske justeringer før eieren har svart.
- `VERKSJEF-FORSLAG.md` – verksjefer (B-379), del av kapitalforslaget.
- Programmodell for konsernprogrammene: eieren valgte B (aktivt budsjett, B-388/B-389). Spesifikasjonen står i
  `K1-PROGRAMMER.md` (B-389): serveren har i dag ingen hendelser i konsernverdenen, så K-1 trenger et lite, nøytralt
  hendelseslag (V0) for at Teknologi, Robusthet og Driftsytelse skal ha ekte effekt. Eieren godkjente V0, satsingene
  1/3/8 % og trekk fra hver utbetaling (B-390). V0 i skygge og K-1-tabellene er lagt inn 2.10 (113, B-424): hendelsene
  trekkes og logges hver time uten virkning og uten visning (jobben `skygge_v0` i `world_health`, B-425), K-1-bryteren står av; skyggedataene går til eieren før noe
  slås på. Ingenting er slått på. Programmene prises av normalt
  datterverksutbytte, ikke bidraget (B-392); Konsernverdi endres ikke. Satsene er foreløpig 0,5/1,5/4 % med 80 % vern på
  Høy (B-393); skyggen regner også 1/3/8 % og etableringen for seg.

## 11. Hvor reglene står

| Regel | App | Server |
|---|---|---|
| Kjøp, kø, stige, opptjent nivå | `game/konsernWorld.ts`, `game/konsern.ts` | `konsern_order`, `konsern_settle` (091) |
| Utbytte | `game/dividend.ts` | `dividend_from_state` (051), `pay_dividends` |
| Verdensjobbene og overvåkingen | – | `world_tick`, `world_health()`, `world_health_players()` (101) |
| Bidrag | – (bare serveren) | `pay_contributions` (061, 077) |
| Kontroll og oppkjøp | `game/control.ts` (`TAKEOVER`, `TAKEOVER_V2`, `minOutbid`) | `company_control`, `takeover_*` (067, 068, 087, 123, 124, 125) |
| Innskudd | `net/treasury.ts` | `treasury_limit`, `deposit_to_treasury` (090) |
| Lister og sesong | `net/leaderboard.ts`, `net/season.ts` | `leaderboard`, `close_season`, `season_history` (092, 093) |
| Uker og ukens kontrollrom | `net/weekly.ts`, `ui/Weekly.tsx`, `ui/control/weekly.ts` | `week_kind`, `weekly_scores`, `weekly_control_*` (094) |
| Privat formue | `game/reserve.ts` | `note_paid_out` (050) |
