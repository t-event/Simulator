# Åpne spørsmål og forslag

Ting som ble funnet i gjennomgangen i økt 87 (B-141), men som brukeren bør bestemme, og forslag til videre
utvikling. Når et punkt er avgjort: skriv en beslutning i `BESLUTNINGER.md` og stryk punktet her (eller flytt det
til «Avgjort» nederst).

## Spørsmål til brukeren

- **Ukens kontrollrom** er bygget (B-387, variant A). Venter: variant B (avspilling på serveren) og nye ukekonkurranser
  når tidslinja har tallene – stål per kWh og leveringspresisjon – så rotasjonen blir større og «Mer stål enn før» kan
  tas bort (den kan påvirkes med en svak uke først).
- **Konsernkapital etter fullt konsern (B-386, B-387):** eieren har svart (B-387): to aktive programmer av fem, men før
  K-1 bygges skal to programøkonomier simuleres (A: store permanente trinn, B: aktivt programbudsjett med binding) og
  sammenlignes. Oppkjøp endres først etter ekte data; forberedelsen skal ikke avsløre kjøperen før budet er lagt inn.
  Selskaper: ca. 1 per 4 aktive konserneiere, serveren foreslår, eieren godkjenner. Eierutbytte venter.
- **K-1 med modell B (B-389, `K1-PROGRAMMER.md`):** besvart (B-390): V0 ja (eget lag, nøytralt i forventning, skygge
  først), satsinger 1/3/8 %, trekk fra hver utbetaling. Bygges etter rapporten 2.10 i skygge og bak avslått bryter. Neste
  spørsmål til eieren: skyggedataene (fordelingen av hendelser, utslag med dagens plassering, hypotetiske programresultater)
  – før V0 og K-1 får virkning. Grunnlaget er avgjort (datterverksutbyttet, B-392) og Konsernverdi står. Åpent: skal
  satsingene bli 0,5/1,5/4 % (forslaget, oppfyller eierens fem mål i simuleringen) før skyggen, eller stå på 1/3/8 % til
  skyggedataene er samlet?

- **Slå på gjestekontoer (B-212):** eieren må slå på «Allow anonymous sign-ins» under Authentication → Sign In /
  Providers i dashbordet (connectoren kan ikke). **29.9: eieren slår det på** – sjekk etterpå at det kommer gjester
  (`select count(*) from auth.users where is_anonymous`). Til det er gjort, prøver appen én gang i døgnet og gjør ellers ingenting.
  **29.9 ca. 23:07: slått på av eieren.** Sjekk 30.9 at det kommer gjester og at de lagrer (påminnelse satt).
  Supabase anbefaler også CAPTCHA mot misbruk; grensen er 30 nye gjester i timen per IP.

## Venter

- **Pynt for sesong 3 (B-287, B-291):** pynten for sesong 2 er klar. Før `start_season` kjøres for sesong 3, legg inn ny
  pynt i `COSMETICS` med `season: 3` – både i butikken og på stigen (trinn 10–50). Ellers har sesong 3 ingen egen pynt.

- **Slå på slagghåndteringen (B-253):** skraplageret fikk sin første eier 29.9. 01:33 UTC og betalte første gang for 29.9
  (13,8 mill., rett etter midnatt norsk tid, B-369). Når det har betalt ut i noen dager uten feil: `update public.companies set active = true where type = 'slagg'; select public.world_tick();`
  Sjekk så kortet under Konsern → Industrien.
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

- **Stabilisering (B-380, spørsmål til eieren):** se `docs/STABILISERING.md` – kassetaket, legacy-gulvet, sesonglistene og
  innskuddet (fire spørsmål nederst). Verksjefene venter til dette er avklart.

- **Verksjefer for datterverkene (B-379, spørsmål til eieren):** se `docs/VERKSJEF-FORSLAG.md` – fem spørsmål i avsnitt 9.

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
- **Varsel på mobilen** når et anbud er avgjort, et verk er ferdig bygget (fase 4–5) eller dagens belønning er klar.
  Krever konto. Brukeren: «Ingen varsel på mobilen enda» (B-149).

## Avgjort

- **Forlatte gjester (B-377):** eieren sa ja 30.9. Gjester som ikke har lagret på 60 dager, slettes hver natt av
  `cleanup_guests()` (pg_cron `gjester-rydding`).

- **Oppkjøp og investeringer (B-375):** eieren sa ja 30.9. Minstebudet er 10 dagers inntekt; eieren som blir kjøpt ut,
  får inntekten for dagene hen mister og 85 % av det hen investerte, høyst 85 % av budet. Investeringene teller ikke i
  verdien. (Erstatter forslaget om å legge investeringene til verdien, B-372.)

- **Budet på skraplageret i gamle penger (B-374):** ingen penger tilbake – delingen på 10 kom etter anbudet, så budet
  kostet 20 mill. i dagens penger. Appen viser gamle bud med dagens verdi.

- **Vern mot lekkede passord (B-363):** finnes bare på Supabase Pro. Eieren 29.9: «Vi dropper det». Rådet
  `auth_leaked_password_protection` i `get_advisors` står derfor, og er kjent.

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
