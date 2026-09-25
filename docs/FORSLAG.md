# Åpne spørsmål og forslag

Ting som ble funnet i gjennomgangen i økt 87 (B-141), men som brukeren bør bestemme, og forslag til videre
utvikling. Når et punkt er avgjort: skriv en beslutning i `BESLUTNINGER.md` og stryk punktet her (eller flytt det
til «Avgjort» nederst).

## Spørsmål til brukeren

1. **«Avslutt veiledningen».** B-136 fjernet valget «Start uten veiledning» på startskjermen, men inne i veiledningen
   står fortsatt «Avslutt veiledningen» (og «Hopp over steget» på steg med et mål). Skal nye spillere kunne avslutte
   den? Forslag: behold «Hopp over steget», men fjern «Avslutt veiledningen» de tre første stegene.
2. **To nettlesere åpne samtidig.** Når begge er i gang samtidig, tar de over for hverandre hver gang den ene lagrer
   (B-140, B-141). Forslag: vis «Spillet er åpent på en annen enhet – fortsett her?» og sett den andre på pause.
3. **Merker ved sesongslutt.** Planen (fase 3) nevner merker ved kallenavnet og plassering i historikken når en
   sesong er over. Resultatet lagres (`season_results`), men vises ikke ennå. Skal vi vise «Sesong 1: 3. plass»
   ved navnet og i en liten historikk?
4. **Toppliste for kontrollrommet.** Planen (fase 2) nevner «beste kontrollrom-parti». Den er ikke laget. Ønskes
   den?

## Forslag – spillet

- **Varsel når ovn 2 står uten skrap.** «Ovnen står: skraplageret er tomt» kommer bare for ovn 1. Med to kvaliteter
  kan ovn 2 stå uten at det varsles (den vises likevel som «Mangler skrap» i produksjonslinja).
- **Quiz for sesongkapitlet** («Konjunkturer og sesonger»), som de andre kapitlene har.
- **Samme ord for slagg.** Kontrollrommet skriver «slagget», fagboka «slaggen». Begge er riktig bokmål; velg ett.
- **Kundevurdering** 1–10 per levert kontrakt, som anmeldelsene i Game Dev Tycoon (se `DESIGN.md`).

## Forslag – nett og konkurranse

- **Fase 4 og 5** står i `PLAN-NETT.md`: ventetid i konsernet, og anbud og skrapauksjoner fra stålverket.
- **Lekkede passord.** Supabase kan stoppe passord som finnes i kjente lekkasjer («Leaked password protection»,
  under Authentication i dashbordet). Det slår brukeren på selv; sikkerhetsrådene i Supabase minner om det.
- **Egen e-postleverandør** for kodene (glemt passord), så grensen på ca. 2 e-poster i timen forsvinner. Brukeren
  sa «en annen gang».
- **Varsel på mobilen** når et anbud er avgjort eller et verk er ferdig bygget (fase 4–5).

## Avgjort

- Nytt spill+ er fjernet (B-141).
