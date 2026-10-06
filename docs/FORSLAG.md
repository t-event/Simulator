# Åpne spørsmål og forslag

Ting som ble funnet i gjennomgangen i økt 87 (B-141), men som brukeren bør bestemme, og forslag til videre
utvikling. Når et punkt er avgjort: skriv en beslutning i `BESLUTNINGER.md` og stryk punktet her (eller flytt det
til «Avgjort» nederst).

## Spørsmål til brukeren

- **Ukens kontrollrom** er bygget (B-387, variant A). Venter: variant B (avspilling på serveren) – eieren 1.10: venter til
  stabiliseringen er ferdig (B-401). Tidslinja samler nå
  tallene til stål per kWh og leveringspresisjon (B-396, fra 1.10). Grensene er satt (B-457): 5 000 t, 50 leveranser,
  små verk utenfor, absolutt tall – og «Mer stål enn før» er tatt bort.
- **Utbyttet for ferdige verk (B-397, B-399):** besvart – kjøres rett etter 2.10-rapporten; etterbetaling med dry-run per
  spiller og dato (allerede utbetalt, korrigert, differanse, usikkerhet), medregnet det migrasjonen selv utløser, og
  eierens godkjenning. Rapportens grunnlag bevares; korrigeringen dokumenteres separat. Planlagt sjekk 2.10 kl. 07:45 UTC.
- **Datakvalitetsoversikt for tidslinjetallene (B-396, B-401):** første oversikt 5.10 (B-456, `docs/DATAKVALITET.md`).
  Anbefalingene er bygget (B-457, eieren: «kjør dine anbefalinger»): «Mest stål per kWh» fra uka 12.10 og «Leveranser i
  tide» fra 26.10. Ny oversikt om et par uker – se om grensene (5 000 t, 50 leveranser) holder.
- ~~Anbudsgulvet i oppkjøpene~~ **Bygget 3.10 (B-451):** F – minstebudet høyst 12 dagers inntekt, øvrige regler beholdes.
  Om gamle anbud også skal dempe budstyrke og Kontroll (begrensningen i B-450), tas senere med ekte data.
- **Verkskontoen – mer å bruke penger på hjemme (eieren 3.10):** nabolagsprosjektene koster til sammen 28 mrd., og store
  hjemmeverk har ofte ingen av dem. Etter dem trengs flere valg for store hjemmeverk, mens kassa fortsatt kan vokse fritt
  (B-381). Lokal kasse skal ikke gi makt mellom spillere (B-190, B-323). Bygget i B-455 (V1–V4, eieren: «bygg alt»).
  Mulig senere: vise stiftelsens tittel på profilen (krever at serveren leser trinnet, vurderes mot B-419).
- **Nye spillere som står fast (analyse 5.10, B-459-økta) – (b) og (c) bygget i B-461, ny oversikt ca. 12.10:** ingen kontoer står på støperiet eller stålverket – alle er på
  verkstedet eller lavere (12) eller på storverket (21). Halvparten på verkstedet har negativ kasse. Driften går i pluss
  hver dag (20–35 000 kr inn, 8–30 000 ut); det som tar kassa, er **bøter for fristene som går ut** – én spiller har 35
  kontrakter og 23 misligholdte, andre har 3–5 bøter på 3 000–60 000 kr, og omdømmet faller til 0. Spillerne tar flere
  kontrakter enn verkstedet rekker. Forslag til eieren: (a) høyst så mange aktive kontrakter som verket rekker på
  verkstedet (sperre i Salg med forklaring), (b) tydeligere advarsel før signering når køen ikke rekker fristen, og
  (c) et råd «Du har tatt på deg mer enn verket rekker» med «avbryt den minst lønnsomme». Anbefalt: (b) + (c) først,
  (a) hvis det ikke hjelper.
- **Beskytt main (B-397):** slå på «Require status checks» for `sjekker` under Settings → Branches i GitHub.
- **Anbefalinger fra kodegjennomgangen (B-398), til beslutningene etter 2.10:** behold marginhopp som varsling til de
  falske positive er kartlagt (C og D viser hvorfor); prøv et prisbasert margintak i skygge først; sett krav til de nye
  konkurransene ut fra gyldig datadekning, produsert mengde og antall avsluttede kontrakter (kWh/t over minst 5 000 t,
  `timeline_energy`).
- **Serverautoritet etter 2.10 (B-395):** skyggeloggen `world_input_log` vises eieren etter rapporten. Spørsmål: hvilke
  flagg skal håndheves, og hvilken mellomløsning for marginen (serverberegnet maksimum per tonn fra prisene, romslig grense
  for hvor fort marginen kan stige fra serverens egne målinger, kryssjekk av inntekt per tonn)? Bidragsformelen er urørt.
- **Konsernkapital etter fullt konsern (B-386, B-387):** eieren har svart (B-387): to aktive programmer av fem, men før
  K-1 bygges skal to programøkonomier simuleres (A: store permanente trinn, B: aktivt programbudsjett med binding) og
  sammenlignes. Oppkjøp endres først etter ekte data; forberedelsen skal ikke avsløre kjøperen før budet er lagt inn.
  Selskaper: ca. 1 per 4 aktive konserneiere, serveren foreslår, eieren godkjenner. Eierutbytte venter.
- **K-1 med modell B (B-389, `K1-PROGRAMMER.md`):** besvart (B-390): V0 ja (eget lag, nøytralt i forventning, skygge
  først), satsinger 1/3/8 %, trekk fra hver utbetaling. Bygges etter rapporten 2.10 i skygge og bak avslått bryter. Neste
  spørsmål til eieren: skyggedataene (fordelingen av hendelser, utslag med dagens plassering, hypotetiske programresultater)
  – før V0 og K-1 får virkning. **Start (B-402):** etter morgenkjøringen 2.10 og med rapportgrunnlaget bevart; skyggen
  isoleres fra de ordinære jobbene, og rapporten sammenligner med ingen programmer og 1/3/8 %, med etablering for seg og
  datamengden. Avgjort: grunnlaget (datterverksutbyttet, B-392), Konsernverdi står, satsene 0,5/1,5/4 %
  med 80 % vern (B-393). Skyggerapporten sammenligner med 1/3/8 % og viser etableringen for seg.

- **Slå på gjestekontoer (B-212):** eieren må slå på «Allow anonymous sign-ins» under Authentication → Sign In /
  Providers i dashbordet (connectoren kan ikke). **29.9: eieren slår det på** – sjekk etterpå at det kommer gjester
  (`select count(*) from auth.users where is_anonymous`). Til det er gjort, prøver appen én gang i døgnet og gjør ellers ingenting.
  **29.9 ca. 23:07: slått på av eieren.** **Sjekket 30.9 kl. 12 (norsk tid): 0 gjester, 0 lagringer fra gjester, ingen
  403 fra `guest_gate`.** Det eneste forsøket på å lage en gjest i døgnet før kom 29.9 kl. 18:40 – før påslåingen – og fikk
  422 (slått av). Den enheten prøver igjen etter et døgn (`OFF_KEY`, ca. 18:40 30.9); ingen andre spillere uten konto har
  nådd spilldøgn 2 siden. Innstillingen kan ikke leses herfra: sjekk igjen etter 30.9 kl. 19, eller åpne spillet i et
  privat vindu, spill til døgn 2 og se etter en rad i `auth.users` med `is_anonymous`.
  Supabase anbefaler også CAPTCHA mot misbruk; grensen er 30 nye gjester i timen per IP.

## Venter

- **Pynt for sesong 3 (B-287, B-291) – må gjøres før sesong 3 startes (eieren 1.10: venter til da):** pynten for
  sesong 2 er klar. Før `start_season` kjøres for sesong 3, legg inn ny
  pynt i `COSMETICS` med `season: 3` – både i butikken og på stigen (trinn 10–50). Ellers har sesong 3 ingen egen pynt.

- ~~Etterbetaling av utbyttet 30.9 og 1.10~~ **Utført 3.10 (B-446):** 2 549 252 kr til elleve spillere, 15 rader, med
  eierens godkjenning (migrasjon 127). Tabellen står i `docs/RAPPORT-2026-10-02.md`, avsnitt 7.

- ~~Slå på slagghåndteringen~~ **Gjort 3.10 (B-445):** første anbud stenger 5.10 kl. 10:38.
- **Slå på mekanisk verksted (B-256):** etter slagghåndteringen, og tidligst en uke etter at appen med vedlikeholdstallet er
  ute (så anslaget bygger på ekte tall): `update public.companies set active = true where type = 'verksted'; select
  public.world_tick();`

- **Logg inn med Google og Apple** (eieren: «senere», B-212). Krever oppsett i dashbordet og hos Google/Apple.

- ~~Bunden konsernreserve (B-193)~~ **Avgjort (B-303):** avviklet og ført som «utbetalt til eierne»; taket står.
- ~~Veksten på toppen (B-238)~~ **Avgjort (reform 2, B-302):** taket for kassa (B-303), utbytte i ekte tid til
  konsernkassa (B-304) og realistiske kostnader på toppen (B-305) er bygget. Gebyret på skraplageret (500 kr/t) settes
  etter anbudet.


- ~~Toppliste for kontrollrommet~~ **Bygget (B-295).**
- **Glemt passord** er ikke testet med ekte e-post ennå (brukeren, 2026-09-26). Ekte innlogging virker. Test det
  neste gang: «Glemt passord?» på kontokortet → koden i e-posten → nytt passord. Husk grensen på ca. 2 e-poster i timen.

## Forslag – spillet

- **Designgjennomgangen 1.10 – ferdig (B-405–B-415):** alt fra poleringslista er bygget. Ikke tatt: konsernkassa ut
  av toppfeltet på mobil (B-340), store bokstaver på alle underoverskrifter. ~~Står åpne: samme fanenavn «Strøm» også i
  garasjen, topplista med faner og chips, instruksjonen i kontrollrommet rett over hold-inne-knappen~~ – sjekket 6.10:
  alle tre er alt slik.

- ~~Stabilisering (B-380)~~ **Avgjort (B-381–B-385):** kassetaket fjernet, tittel skilt fra opptjent nivå, sesonglistene og
  innskuddet stengt. Verksjefene venter nå bare på V0/K-1 (B-409).

- **Verksjefer for datterverkene (B-379, besvart, B-409):** `docs/VERKSJEF-FORSLAG.md` – svarene i avsnitt 9 og V1 ferdig
  spesifisert i avsnitt 10. Bygges etter V0/K-1 (2.10 → skygge → data → eventuelt live → V1).
- **Rekonstruksjon etter konkurs (B-409, spørsmål til eieren):** `docs/REKONSTRUKSJON-FORSLAG.md` – fem modeller (A–E)
  sammenlignet, sperrene mot misbruk og hva eieren velger (avsnitt 7). Ingen modell valgt, ikke bygget.

- ~~Trender i markedet~~ **Bygget (B-255).** («etterspørselen etter armering øker») som styrer hvilke kontrakter som dukker opp (se
  `DESIGN.md`).

## Forslag – nett og konkurranse

- ~~Tidslinja ved tilbakespoling (B-259)~~ **Bygget (B-261).** `check_snapshot` sletter alle tall etter dagen når et spill med lavere dag
  lastes opp. Da en gammel kopi tok over i 15 sekunder, forsvant 1 700 tall. Kan heller merke dem eller beholde dem når
  det høyere spillet kommer tilbake. Eieren avgjør.

- **Fase 4 og 5** i `PLAN-NETT.md` (ventetid, anbud og auksjoner) står på vent og vurderes inn i `RETNING.md` (B-180).
- **Egen e-postleverandør** for kodene (glemt passord), så grensen på ca. 2 e-poster i timen forsvinner. Brukeren
  sa «en annen gang».
- ~~Sjekk av første opplasting~~ **Bygget (B-257).** spill som kobles til en konto sent (f.eks. dag 610), sjekkes ikke av juksesperren
  før koblingen. En fornuftssjekk mot det testspilleren klarer på samme døgn (økt 108). «Koblet til på dag N» står nå
  på topplista (B-170).
- ~~Varsel på mobilen~~ **Bygget 5.10 (B-465):** oppkjøp, anbud, byggeprosjekter og privatmeldinger, valgt per enhet.
  Dagens belønning varsles ikke (mas). Eieren bør prøve et ekte varsel på telefonen (fra hjemskjermen på iPhone).

## Avgjort

- **Forlatte gjester (B-377):** eieren sa ja 30.9. Gjester som ikke har lagret på 60 dager, slettes hver natt av
  `cleanup_guests()` (pg_cron `gjester-rydding`).

- **Oppkjøp og investeringer (B-375):** eieren sa ja 30.9. Minstebudet er 10 dagers inntekt; eieren som blir kjøpt ut,
  får inntekten for dagene hen mister og 85 % av det hen investerte, høyst 85 % av budet. Investeringene teller ikke i
  verdien. (Erstatter forslaget om å legge investeringene til verdien, B-372.)

- **Budet på skraplageret i gamle penger (B-374):** ingen penger tilbake – delingen på 10 kom etter anbudet, så budet
  kostet 20 mill. i dagens penger. Appen viser gamle bud med dagens verdi.

- **Vern mot lekkede passord (B-363):** finnes bare på Supabase Pro. Eieren 29.9: «Vi dropper det». Rådet
  `auth_leaked_password_protection` i `get_advisors` står derfor, og er kjent. Bekreftet igjen 1.10 (B-401): beslutningen
  står.

- **Fast regel om spilltid og ekte tid (B-323):** eieren sa ja 29.9; står i CLAUDE.md og RETNING.md.

- **Hovedverkets konsernbidrag (B-313):** eieren svarte 29.9: automatisk bidrag (B-318), innskuddet bort (B-319), gulv
  30 %, fast 50 % (valg av utbyttepolitikk utsatt), dempet over 30 mill., ny liste «Konsernverdi» regnet av serveren ved
  siden av den gamle (B-320). Kassa i spillet røres ikke (taket på 10 mrd. holder den nede).

- **Mange lager ikke konto:** automatisk gjestekonto som ikke får gjøre noe mer før man oppretter konto, og vis hva
  man går glipp av. Google og Apple senere (B-212).

- **Varsellinja på mobil** (spørsmål fra UI-1b): eieren valgte å flytte den ned over menyen – B-201.

- Økonomireformen er gjennomført med urørt gulv på 250 mill.; konsernkassa godkjent som utgangspunkt (grensene kan
  justeres); pilotkonsesjonen er 14 dager (B-186).

- Eierens svar på de sju spørsmålene fra B-180 (B-181): modell B; utbytte og konsernkostnader i datterverkene;
  konsernkasse på serveren; Sesong 2 av og Grunnleggeræraen; varsel i appen i testene og push før full lansering;
  skjult anbud i 48 timer med pilotkonsesjon; aktiv = 2 av 14 dager; «Hall of Fame»; Industrimakt skjult inntil videre.

- Sesong 2 starter av seg selv når Sesong 1 er over, og alle spillene blir med videre (B-167).

- Varsel for alle ovner uten skrap, quiz for sesongkapitlet, «slaggen» overalt og kundevurdering 1–10 (B-161).
- Ukens toppliste er bygget som «Ukens utfordring» (B-152).

- Nytt spill+ er fjernet (B-141).
- «Avslutt veiledningen» blir stående – nye spillere kan avslutte veiledningen (B-143).
- Flere enheter samtidig: bare enheten som spilles på, lagrer; den andre settes på pause med «Spill her» (B-143).
- Sesongresultat ved kallenavnet og «Dine sesonger» på topplista (B-143).
