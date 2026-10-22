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
  havarerer ovnene oftere (helt slitt: 2 ×). Fornyelsen koster 20 % av utstyrets pris × slitasjen (ovnene med utstyret
  på hver ovn, støpemaskinen og tilleggsutstyret, B-472); reparatøren fornyer
  selv ved 70 % med «Reparatøren bytter foringen» på. Alt dette føres som `investering`, som marginen i bidraget ikke
  teller.
- **Kontrakter på Salg** (B-461): vurderingen regner med det verket lager (snittet av de siste døgnene med produksjon),
  men null når hele verket står til spilleren gjør noe (ingen penger til omforing, ingen folk). «Signer likevel…» spør
  med boten. Råd på Verket når verket står og når kontrakter i køen ikke rekker fristen; avbryting foreslås bare når
  den er billigere enn boten ved fristen (bot av ulevert ved fristen mot 60 % av det som gjenstår).
- **Sperren i garasjen og på verkstedet** (B-482): på nivå 0–1 kan en kontrakt som ikke rekker fristen («Rekker det ikke»),
  ikke signeres – bare avslås (`signBlocked`, også i `acceptContract`). Fra støperiet er det advarsel og spørsmål som før.
  Hendelseskortene og salgsdirektøren sperres ikke.
- **«Lån og bytt foringen»** (B-482): står en ovn fordi kassa (med kreditten) ikke har råd til ny foring, låner knappen ved
  ovnen det som mangler (rundet opp til hele tusen) og bytter med én gang (`relineOnLoan`). Låner banken ikke nok, står
  det hva som hjelper i stedet.
- Ingen hendelseskort om forhold mellom ansatte (trakassering, diskriminering, varsling) – tatt ut etter eierens ønske
  (B-444).
- **Grønt stål** (B-506): med forskningen «Grønt stål» vises CO₂ per tonn på Resept. Innsatsen teller: råjern 1,9,
  jernsvamp 0,15, skrap ca. 0,03; i tillegg kommer strøm og 0,08 fast. Hver femte forespørsel vil ha høyst 0,30 til samme
  pris. Holder snittet kravet, gir det 50 % ekstra omdømme og teller mot prestasjonen «Grønt stål»; ellers ingen bot.
  «Hydrogenbasert jernsvamp» (350 fagpoeng) åpner jernsvamp (6 200 kr/t, nesten uten sporelementer).
- **Støpemaskinen og valseverket i kontrollrommet** (B-505): «Ta styringen selv» i utstyrsarket for Støping (med
  strengstøping / valseverk). Tre runder hver. Fagpoeng én gang per spilldøgn per spill. 4–5 stjerner gir i 24/48 timer
  halvparten så mange strenggjennombrudd, eller 1/2 prosentpoeng mer utbytte i valseverket.
- **Planleggeren og landemerker** (B-503): planleggeren sorterer ordrekøen etter frist og setter et landemerke (ingen
  frist) så tidlig det går uten at en kontrakt eller ukeleveranse blir for sen (90 % av døgnproduksjonen). Ellers venter
  det bakerst. Uten planlegger går landemerket først når det tas. Salgsdirektøren regner med landemerkene først.
- **Fast jobb til avløsere** (B-499): står avløsere fast på plasser uten egne folk (folk har sluttet eller gått av med
  pensjon), kan de få fast jobb der (Folk → Skift, eller «Mer» per avløser). De beholder ferdigheten, får lønna til
  rollen, og resten av avløserne blir ledige til fravær. Skiftene er like fulle. Ikke lærlinger.
  Med en skiftleder kan det skje av seg selv (valget i Folk → Skift, B-500). Beskjedene om oppsigelse og pensjon har
  lenke til Folk → Skift eller Folk → Ansett (B-501).
- **Råd om gjelden etter konkursen** (B-498): når kassa har mer enn en ukes lønn og skrap til overs, sier et råd på
  Verket hvor mye som kan betales i banken (Verket → Økonomi).
- **Konkurs og rekonstruksjon** (B-495): konkurs etter 7 døgn under kredittgrensen eller 3 døgn uten råd til foring.
  Fra støperiet og opp kan banken **rekonstruere** i stedet for nytt spill: ett nivå ned (utstyret fra det tapte nivået
  selges, ovner og støping derfra blir grunnversjonen for nivået under), forskning og mesterskap fra de siste 30
  spilldøgnene og fagpoeng kjøpt for penger i perioden tas tilbake, lager og ordrer er borte, folk over taket slutter
  (hver rolle beholder sin andel, de flinkeste blir), omdømmet halveres og blir høyst halvparten av det nivået under
  krever. Lånet slettes; gjelden blir halvparten av lånet
  og minuset, pluss startkassa (sju døgns lønn, faste kostnader og skrap) og prisen på utstyr fra de siste 30 døgnene som
  beholdes, og 10 % av salget går til den hvert døgn (posten «renter», som bidraget ikke teller); den kan også betales ned
  i banken. Verket kan ikke flytte opp igjen før gjelden er betalt. Høyst
  én gang per 30 ekte dager (serverens klokke) og ikke før gjelden er betalt. Konsernet, topplistene og prestasjonene
  er urørt. Regnes lokalt (`game/reconstruction.ts`); kontoen trengs ikke.
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
- **Regionmester** (B-487, 151): i hver region er konsernet med sterkest ferdige verk regionmester. Styrken er per verk
  12 (kompleks), 4 (storverk) eller 1 (stålverk) × (1 + 0,25 × trinnet), og summen ganges med aktiviteten
  (`activity_factor`); verk som bygges, teller ikke. Tittelen byttes bare når en annen er strengt sterkere. Jobben
  `regionmester` (cron hvert 10. min) bytter, skriver i Skiftrapporten og varsler (tema `konsern`, lenke `kart`).
  Merket «Regionmester» på topplista så lenge man har minst én region. Ingen penger. Speilet i `regionPoints`.
- **Fellesprosjekter** (B-508, 156; bryteren `config.world.projects.enabled` står av til appen er publisert): ett prosjekt
  per region om gangen, der minst to aktive konsern har ferdige verk. Målet er det største av 4 dagers utbytte fra verkene
  i regionen og 2 % av kassene der, fristen 21 ekte dager, et nytt 7 dager etter at det forrige er avgjort. Man gir fra
  konsernkassa (minst 1 mill., bare med ferdig verk i regionen; posten `fellesprosjekt`). Målet nådd: pengene er brukt,
  nr. 1 får merket «Hovedbidragsyter» og +25 % regionmester-styrke i regionen i 30 dager, nr. 2 +10 % (høyeste gjelder,
  `region_project_boost` i `region_strengths`, speilet i `boostedStrength`), og alle med minst 10 % av målet merket
  «Fellesprosjekt». Bom: halvparten tilbake. Jobben `fellesprosjekter` (hvert 10. min). Kortet på Konsern → Oversikt.
- **Verksjefer** (B-488, 152):
  - Hvert ferdige datterverk kan få en verksjef fra dagens tre kandidater. Drift, Økonomi og Folk er 1–5 med summen
    6–10, og verksjefen har ett trekk.
  - Mandatet:
    - Lønnsomhet gir × (0,92 + 0,04 × snittet av Drift og Økonomi), og moderniseringen koster 20 % mer og tar 25 % lenger.
    - Vekst gir × 0,95, og moderniseringen koster (10 + 3 × Drift) % mindre og tar (10 + 4 × Drift) % kortere.
    - Stabilitet gir × (0,98 + 0,01 × Folk), og det dårlige utfallet i samtalene kommer halvparten så ofte.
  - Lønnen er 3–6 % av verkets utbytte. Mandatet kan byttes én gang i uka. Avslutt koster 5 dagers lønn, og verket må
    vente 3 dager på en ny.
  - **Oppgjøret** (jobben `verksjefer`, hvert 10. min): etter hvert betalt utbytte får konsernkassa per verk andelen ×
    det fulle utbyttet × (faktor − 1 − lønn), pluss samtalenes faktorer, som `justering` (`verksjef:<dag>`). Det teller
    ikke i lånerammen og ikke i konsernverdien. Uten verksjef er alt som før.
  - **«Verksjefen ringer»:** ca. 2–3 saker i uka, 48 timers frist og varsel på mobilen. Uten svar velger verksjefen
    etter trekket.
  - **Trivsel** (B-489): 0–100, starter på 60, vises med ord. Per betalt dag endres den med passformen mellom mandat og
    egenskaper minus 3. Følges rådet i en sak, gir det +3, svar mot rådet −4, og nytt mandat −8 (lojale tar minusene
    halvt). Under 20 kommer «Tilbud fra en konkurrent»: lønnstillegg (+1 prosentpoeng, høyst 8 %) eller la verksjefen
    gå (uten sluttpakke og karantene).
  - 14 vanlige saker. En sak som venter, gir «!» på Konsern og en linje i varsellinja.
  - Bryteren er `config.world.managers.enabled`. Reglene er speilet i `game/managers.ts`.

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

- **Inntektsanslaget** (B-464): det betalingen ville gitt – snittet av de siste 7 ekte dagene av det som telles per
  spiller, minus eieren (kjøperens anslag: minus kjøperen), regnet én gang per dag (`company_estimate_refresh`). Brukes til
  V (10 dager), høyeste anbud (14 dager), minstebudet i anbud (5 dager) og «Tjener nå».
- Anbud (48 t skjult) og pilotkonsesjon 14 dager; `world_tick` avgjør «lat» (pg_cron hvert 5. min).
- Varsel om åpent anbud (B-453): i varsellinja når det åpner og når 12 timer er igjen, til den som ikke har bydd, med
  lenke til Konsern → Industrien. Ved budfeltet: budet kommer tilbake til den som taper, og «Lønner det seg?» (14 dager ×
  kjøperens eget anslag mot budet).
- Fornyelsen: anbudet åpner 48 timer før konsesjonen går ut, og eieren stiller likt med alle. Eieren får egen beskjed
  (kortet, Konsern → Oversikt, varsellinja og varselet på mobilen) om at selskapet går tapt uten bud (B-481).
- Tre selskaper: skraplageret, slagghåndteringen (fra 3.10, B-445) og mekanisk verksted (fra 13.10, B-486). Verkstedets
  eier får 0,2 av vedlikeholdet som teller hos de andre (`workshop_share`), ca. 7 mill. kr per dag – det minste selskapet.
- Kraftverket (B-509, 157) i Østskogen: eieren får 12 øre per kWh de andre bruker (`power_fee_per_kwh`) – stålet som teller
  × spillerens kWh per tonn siste 7 ekte dager fra tidslinja (`power_kwh_per_t`, 150–800, ellers 300). Anslaget 22.10:
  ca. 11 mill. kr per dag. Bygget, men slått av (`active = false`) til appen som kjenner typen, er publisert.
- Kontroll regnes av `company_control` (aktivitet, investering, region, eiertid); vises som kroner (B-370).
- Oppkjøpsbud og motbud er på (fra 29.9.2026). Budet teller 60 × √(bud / V) × (0,5 + 0,5 × aktivitet) + region, inntil
  10 × verdien (verdi V = det høyeste av 10 dagers inntekt og siste anbudspris); eieren kan alltid miste selskapet.
  Minstebudet for et nytt forsøk er V, men aldri over 12 dagers inntekt (B-451, 128, `takeover_min_bid`); V er fortsatt
  skalaen for budstyrke, motbud, Kontroll og inntektsøkning. Står bud og motbud likt,
  beholder eieren selskapet (`att > def`). Eieren får `takeover_payout` ved salg (B-375), regnet med dagene som er
  igjen når budet avgjøres – appen viser anslaget ved fristen (`buyoutAt`, B-478). Nye bud kan legges inn til 5 dager før
  perioden går ut (`last_days`); kjøperen ser datoen, og når neste bud kan legges inn: dagen både vernet og pausen er over
  (`company_protected_until`), eller «vent på det nye anbudet» hvis de varer til budene stenger (B-478, B-480). Anbud fra før 29.9 regnes i
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
- Slagghåndteringen er aktiv fra 3.10.2026 (B-445, første anbud stenger 5.10 kl. 10:38), mekanisk verksted fra 13.10 (B-486).
  Kraftverket er ikke aktivt ennå (B-509).

## 6. Konkurranse og lister

- **Sesongen avgjøres på Konsernverdi** (B-384): `close_season` rangerer på `konsern_value` (konsernkassa + 60 dagers
  utbytte og bidrag + verkene med salgssummen og betalte prosjekter med prisen (`konsern_assets`, B-475) + selskapene man eier med anslaget × dagene igjen av konsesjonen,
  høyst 60 (`konsern_companies_value`, B-476) − lån, i ekte tid; på topplista fra et lager som regnes hvert minutt, B-477); de uten konsern kommer etter, på verdien i eget verk. Bidraget i verdien regnes
  med aktiviteten i siste betalte bidrag, eller dagens produksjon hvis den er høyere (B-417, 104) – en som ikke spiller,
  står med det hen faktisk får betalt (gulvet 0,3), ikke med fullt bidrag. Verdien i eget verk fryses
  også (Hall of Fame). Sesonger startes og avsluttes bare manuelt.
- **Topplista** har to grupper: «Industriverden · sesong» (Konsernverdi) og «Eget verk» (Verdi, Mest penger på bok,
  Produksjon, Raskest til storverk, Raskest til 10 mrd., Kontrollrom, Privat formue – fryst). Eget verk er ære, ikke makt.
- **Dagens oppdrag «Kjøp eller moderniser et datterverk»** teller kjøpene i konsernet (`totals.konsernBuys`, B-470):
  et kjøp teller når serveren har godtatt det, ikke når verket er bygget; en avbestilling trekker fra bare et kjøp som er
  talt samme dag (B-472).
- **Sesongstigen** (gratis sesongpass, B-173, B-452, 129): poeng for hver dag med spill (1), dagens belønning (2), dagens
  oppdrag (3) og topp 3 på ukelista (12/9/7), regnet på serveren i ekte tid. 50 trinn: trinn 1 ved 6 poeng, trinn 2 ved 12,
  så 20 poeng per trinn (972 for trinn 50; `season_tier_of`, speilet i `tierOf`/`tierPoints`). Hvert trinn gir 20 + 2 ×
  trinn fagpoeng én gang; trinn 1, 10, 20, 30, 40 og 50 gir sesongpynt. Pynt for trinn som alt er hentet, legges inn uten
  nye fagpoeng. Neste premie står på Dagens oppdrag og i velkomstvinduet; premiene hentes med «Hent alt» på Mål.
- **Ukens utfordring** (B-457, 130): uka 5.10 er «Flest aktive dager»; fra uka 12.10 roterer det **«Mest stål per kWh»
  → «Ukens kontrollrom» (første gang 19.10) → «Leveranser i tide» → «Flest aktive dager»**. Stål per kWh er kg per kWh
  i uka (1 000 × tonn / kWh) fra tidslinja, med minst 5 000 t og et rimelig forhold (`timeline_energy`) – små verk er
  ikke med. Leveranser i tide er levert / (levert + misligholdt + avbrutt) i uka med minst 50 leveranser
  (`timeline_metrics`). Begge regnes av serveren i ekte uker, fra siste lagring før uka (B-472), så første økt i uka
  er med. «Mer stål enn før» og «Størst vekst i konsernverdi» er
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
  i Skiftrapporten; rapporten er en kopi). Meldinger eldre enn 30 dager vises ikke; de slettes hver natt (`dm_cleanup`,
  cron `meldinger-rydding` kl. 03:53 UTC, fra 7.10, B-471). **Adminpanelet** (bare `admins`): rapportene, skjul, avvis, sperr og opphev sperre,
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
  enn 14 dager) får 50 000 kr og 25 fagpoeng i eget spill (høyst én gang per spill; samme kode igjen det første døgnet
  gir den på nytt hvis svaret gikk tapt, B-472/B-473); den som vervet får belønningen i konsernkassa (avsnitt 4). Taket på 5 venner teller
  også belønnede venner som har slettet kontoen, og vervinger til samme kode går én om gangen (B-472).
  Kortet viser plassene serveren teller (`used`, B-473).
  Delingsknappen på anleggsbildet (B-458) sender tekst og lenke, uten bilde (B-460), og tar med koden.
- **Brukernavn er påkrevd** (B-463): en innlogget konto uten brukernavn får arket «Velg brukernavn», som ikke kan lukkes
  (bare logges ut fra). Navnet fra skjemaet settes i det stille når det er ledig.
- **Vennelista** (B-462): enveis «følg» med brukernavnet (fanen Venner i Skiftrapporten, knapp på profilen), høyst 100.
  Viser bare nivå/tittel og sist aktiv i grove trinn; den andre får ingen beskjed.
  **Varsel om venner** (B-490, 154; tema `venner`): den som følger, får beskjed når en venn går forbi på konsernlista
  (jobben `venner` hvert 10. minutt, høyst én gang per venn og dag), blir regionmester eller tar et selskap. Den som
  følges, får fortsatt ingen beskjed.
  **Venner på listene** (B-493): når vennelista har noen, står «Alle / Venner» over topplista og ukelista. «Venner» viser
  vennene og deg med plassen på hele lista (appen henter hele lista og filtrerer; ingen endring på serveren).
  **Venner på kartet** (B-496): vennenes verk er grønne på Konsern → Kart, står først etter deg i regionlista, og
  filteret «Venner» viser bare dine og deres verk.
- **Varsel på mobilen** (B-465, på som standard fra B-467: første trykk i spillet etter innlogging lar telefonen spørre om lov, én
  gang per konto og enhet; «nei» og «slått av» huskes): bryter med fire temaer under Innstillinger → Varsler (oppkjøp, anbud, byggeprosjekter,
  privatmeldinger), per enhet. Serveren legger varsler i `push_outbox` (triggere, og `push_scan` hvert minutt for ferdige
  byggeprosjekter og 6 timer igjen av et oppkjøpsbud); edge-funksjonen `push` sender dem. Ingen hemmelige beløp, ingen
  meldingstekst, ikke eldre enn 6 timer. Kom et varsel ikke fram på grunn av en midlertidig feil, prøves det igjen
  etter 2, 4, 8 og 16 minutter (høyst 5 forsøk, B-472/B-473); midlertidige feil slår aldri av en enhet. iPhone/iPad: bare fra hjemskjermen. Utlogging slår av varslene på enheten.
  Oppkjøp varsler også motbud (til kjøperen, uten beløp) og høyere bud fra samme kjøper (til eieren), B-469.
  «Send et prøvevarsel» (B-466, `push_test`) sender «Varslene virker» til enhetene som står på, høyst ett per 10 minutter.
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
- `VERKSJEF-FORSLAG.md` – V1–V3 er bygget (B-488, B-489).
- `REKONSTRUKSJON-FORSLAG.md` – modell B er bygget (B-495).
- `SLUTTSPILL-FORSLAG.md` – plan for spillere som er ferdige (B-504): kontrollrommet (B-505), grønt stål (B-506) og
  fellesprosjektene (B-508) er bygget; K-1 og flere selskaper venter.
- `FELLESPROSJEKT-FORSLAG.md` – modell C er bygget (B-508).
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
