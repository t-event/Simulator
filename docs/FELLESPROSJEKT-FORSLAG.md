# Regionale fellesprosjekter – forslag med simulering (B-507)

**Status:** forslag. Ingenting er bygget på serveren. Supabase-connectoren svarte «ingen tilgang» 21.10, og prosjektene
flytter penger mellom spillere i ekte tid, så de skal simuleres og godkjennes av eieren først (B-180, B-190). Simulatoren
er `npx tsx src/game/projectSim.ts` (fra `frontend/`).

## 1. Idéen (SLUTTSPILL-FORSLAG.md, 2.3)

I hver region åpner det et stort prosjekt i ekte tid, f.eks. «Ny kraftlinje», «Dypvannskai» eller «Skrapterminal».
Prosjektet har et mål og en frist (21 ekte dager). Alle med verk i regionen kan bidra fra konsernkassa. Når målet nås,
får regionen og bidragsyterne noe. Når det ikke nås, får bidragsyterne en del tilbake.

## 2. Hva simuleringen viser

Tre modeller, med tre ferdig utbygde storspillere og to små i regionen (utbytte ca. 35 mill. per dag hver; bidraget 30
eller 5 mill. per dag; halvparten eller 30 % av verkene i regionen):

| Modell | Mål | Fordel | Alle bidrar 25 % | To gratispassasjerer | Én bidrar |
|---|---|---|---|---|---|
| A | 20 dagers utbytte i regionen | +2 % utbytte i regionen, varig, høyst 3 | Ikke ferdig på 21 dager | Ikke ferdig | Ikke ferdig |
| B | 8 dager | +5 % i 90 dager | Ferdig dag 9, netto −0,8 til −1,0 dagers inntekt per spiller | Bidragsyterne −2,1 til −2,3, gratispassasjerene +1,2 | Bidragsyteren −4,4, de andre +1,2 |
| C | 4 dager | Bare titler | Ferdig dag 5, −1 dags inntekt | Ferdig dag 7, −1,7 | Ferdig dag 6, −2,8 |

Det betyr:
1. **Penger tilbake lønner seg nesten aldri for den som betaler.** Fordelen deles med alle i regionen, også dem som ikke
   bidro. Gratispassasjeren vinner hver gang (modell B: +1,2 mot −2,3 dagers inntekt). Det er den klassiske dugnadsfella,
   og den gjør at de som bidrar, føler seg lurt.
2. **En varig pengefordel (A) blir en ny inntektsmotor.** Den lønner seg først etter 2–3 år, og hvert nytt prosjekt
   legger mer utbytte på toppen av en økonomi som alt hoper seg opp (STATUS avsnitt 8). Det går mot B-311 og B-393.
3. **Kassa er ikke problemet.** Etter et år har en stor spiller 11–22 mrd. i konsernkassa, og prosjektene i tabellen
   bruker under 1 % av årsinntekten. Et prosjekt som skal bety noe, må måles mot det som står i kassa, ikke mot dagens
   inntekt.

## 3. Anbefaling: modell C med regionmester-styrke

- **Ingen penger tilbake.** Prosjektet er et valg om ære og regional makt, ikke en investering. Pengene forsvinner (det
  er meningen: kassa hoper seg opp), men spilleren får noe som betyr noe mellom spillere.
- **Målet** er 2 % av konsernkassene til spillerne med verk i regionen da prosjektet åpner, men minst 4 dagers utbytte i
  regionen. Da blir prosjektet stort nok til å merkes, også når kassene vokser.
- **Når målet nås:**
  - Varig titler: «Hovedbidragsyter» til den som ga mest, og et merke til alle som ga minst 10 % av målet.
  - **Regionmester-styrke i 30 dager:** den som ga mest, får +25 % på styrken sin i regionen (B-487), nummer to +10 %.
    Regionmester gir fortsatt ingen penger eller Kontroll – det er konkurransen som allerede finnes, med en ny vei inn.
  - En ny bygning på verdenskartet i regionen med navnet til hovedbidragsyteren.
- **Ikke ferdig:** halvparten tilbake til alle som bidro, og ingen titler.
- **Ett prosjekt per region om gangen**, et nytt 7 dager etter at det forrige er avgjort, og bare i regioner med minst
  to aktive konserneiere (B-327).
- **Ingen fordel for gratispassasjerer.** Det er det som gjør modellen rettferdig.

## 4. Slik bygges det (når connectoren virker og eieren har sagt ja)

**Serveren (ny migrasjon):**
- Tabeller: `region_projects` (region, type, mål, åpnet, frist, status, avgjort) og `region_project_gifts` (prosjekt,
  spiller, beløp, tid). RLS uten regler; alt går gjennom funksjonene.
- Funksjoner:
  - `project_status()`: prosjektene, målet, summen, min andel og topp 3 med brukernavn. Aldri hvor mye andre har i kassa.
  - `project_give(p_project, p_amount)`, `security definer`: sjekker `auth.uid()`, at spilleren har et ferdig verk i
    regionen og ikke er gjest eller flagget. Låser `konsern` før `treasury` (B-433), trekker beløpet og fører det i
    kassaboka som `fellesprosjekt` – ikke `utbytte`/`bidrag`, så det ikke endrer lånerammen.
  - `projects_settle()` (cron hvert 10. min, med egen regel i `world_health`): avgjør prosjekter ved målet eller fristen,
    betaler halvparten tilbake ved bom (én spiller per deltransaksjon, B-401), skriver titlene og styrken.
- Regionmester: `region_points` får en faktor fra prosjektene som er avgjort de siste 30 dagene, speilet i `regionPoints`.
- Hendelser i Skiftrapporten (`chat_event`) og varsel på mobilen (`push_enqueue`, tema `konsern`) når et prosjekt åpner,
  har 3 dager igjen og er ferdig.

**Appen:**
- Et kort på Konsern → Oversikt («Fellesprosjekt i Nord»): målet, summen, fristen, topp 3 og et beløpsfelt (`MillInput`,
  B-447) med bekreftelse.
- Prosjektene på verdenskartet, og titlene på profilen.
- Konto: ja (regel 2 – penger mellom spillere i ekte tid). Legges i `ACCOUNT_FEATURES`.

**Tester:** livsløpet i en DO-blokk som rulles tilbake (åpne, gi, nå målet, bomme, tilbakebetaling), `world_health`, og
simuleringen på nytt med ekte kassetall før noe slås på.

## 5. Spørsmål til eieren

1. Modell C med regionmester-styrke – eller vil du heller ha en liten pengefordel (B), selv om gratispassasjerene vinner?
2. Målet: 2 % av kassene i regionen – for mye eller for lite?
3. Skal pengene forsvinne helt når målet nås, slik anbefalt?

Endringslogg: nei (ingenting i spillet er endret).
