# Sluttspillet videre – plan for spillere som er «ferdige» (B-504)

**Bakgrunn (eieren 21.10.2026):** den spilleren som har kommet lengst, har ikke mer å gjøre i spillet. Supabase-connectoren
svarte ikke da planen ble skrevet, så lagringen er ikke sett på. Planen bygger på STATUS, KONSERNKAPITAL-FORSLAG, K1-PROGRAMMER
og koden. Alle steg som rører verdensøkonomien, simuleres først (`worldSim.ts`, `programSim.ts`) og godkjennes av eieren
(B-180, B-190, B-323).

## 0. Kort fortalt

En spiller som er «ferdig» i dag, har gjort alt dette:
- **Hjemme:** storverket, all forskning, nabolaget i tre trinn og stiftelsen. Bare mesterskapet og stiftelsen går videre,
  og begge er tall uten valg.
- **Konsernet:** alle plasser fylt med komplekser på høyeste trinn, verksjefer og regionmester. Det tar 1–2 måneder.
- **Konsernkassa** fylles med 40–70 mill. per dag. Det eneste å bruke den på er tre selskaper med anbud, Kontroll og
  oppkjøp. Simuleringen viser at 0 % av inntekten brukes i år 2.
- **Sesong 1** har ingen sluttdato, så det kommer ingen nye mål.

Tre ting mangler: **nye mål** (noe å strekke seg etter), **valg for pengene** (noe som koster og gir noe, ikke sluk) og
**noe å gjøre sammen med eller mot andre**. Planen tar dem i den rekkefølgen, fra det som alt er bygget og bare venter, til
det som må lages.

| Fase | Innhold | Gir den ferdige spilleren | Tid | Krever |
|---|---|---|---|---|
| 1 | Sesongslutt og sesong 2 | Nye mål for alle, Hall of Fame | 1 økt | Eierens dato og vri |
| 1 | Regionmester i Hall of Fame, ukelista «Mest modernisert» | Nye titler og lister | 1–2 økter | Server |
| 1 | Nye spill i kontrollrommet (støping, valsing) | Ferdighet, ukelister | 2–3 økter | Mest app |
| 2 | Konsernprogrammene K-1 slås på | Strategivalg for kassa | 1–2 økter | Skyggerapporten (2.11) og eierens ja |
| 2 | Flere selskaper (1 per 4 aktive konserneiere) | Flere ting å kjempe om | 2–3 økter | Eierens ja (S-1) |
| 2 | Regionale fellesprosjekter | Store mål sammen med andre | 3–4 økter | Ny beslutning |
| 3 | Grønt stål hjemme (læring) | Ny kunnskap, nye kontrakter | 4–6 økter | Balanse |
| 3 | Industriklynger (samarbeid) | Lag med andre spillere | 4+ økter | Når det er flere aktive |

## 1. Fase 1 – nye mål nå (det meste er alt bygget)

### 1.1 Avslutt sesong 1 og start sesong 2 – tatt ut (eieren 21.10: sesong 1 fortsetter, B-505)

- **Hva:** `end_season()` → Hall of Fame (Konsernverdi, B-384) → `start_season('…', vri)`. Pynten for sesong 2 ligger klar i
  `COSMETICS` (B-287). Sesongstigen starter på nytt (50 trinn, ny pynt), og alle får en ny plass på «Industriverden · sesong».
- **Hvorfor:** det er det raskeste som gir alle – også den som er ferdig – et nytt mål. Det lagrede spillet nullstilles
  ikke (B-141), så ingen mister noe.
- **Vri for sesong 2** (eieren velger én). Vrien er lik for alle og regnes i spillet som i dag (B-129, `SeasonTwist`).
  - **Uten ny kode** (dagens vri er tre faktorer: skrap, stål, strøm): «Skrapmangel» (skrap × 1,15), «Dyr strøm»
    (strøm × 1,2) eller «Høy stålpris» (stål × 1,1).
  - **Med litt ny kode:** «Grønn sesong» (utslippsbøtene dobbelt, bonus for rene verk) eller «Lang vinter» (vinterreglene,
    B-265/B-279, hele sesongen).
- **Før start:** sjekk `season_status()` og `close_season` mot ekte tall i en DO-blokk som rulles tilbake, og lag pynten for
  sesong 3 mens sesong 2 pågår.
- **Konto:** som i dag (sesongen krever konto, regel 2).

### 1.2 Regionmester i Hall of Fame og ukelista «Mest modernisert»

- **Regionmester i Hall of Fame:** `close_season` lagrer hvem som var regionmester i hver region ved slutt. Merket
  «Regionmester sesong N» er varig. Det er ingen penger og ingen Kontroll (B-487).
- **Ukelista «Mest modernisert»:** antall trinn modernisert i konsernet i ekte uka, fra `konsern_orders` (serveren eier
  dem). Den må få en ny ukestype i rotasjonen (B-457), og ukene før skal gi samme type som før.

### 1.3 Nye spill i kontrollrommet – bygget som trening hjemme (B-505)

- **Hva:** to nye runder i samme stil som kontrollrommet (B-175):
  - **Støpemaskinen:** hold farten mot temperaturen i øsa uten strenggjennombrudd. Det lærer det samme som kokillene
    (B-351).
  - **Valseverket:** treff dimensjonen med temperatur og fart.
  - Begge kan bli tellende uker i «Ukens kontrollrom» med frø fra serveren (B-387).
- **Hvorfor:** det gir ferdighet i stedet for tall, er morsomt å konkurrere i og lærer mer om stålverket. Hjemme gir det
  fagpoeng (spilltid), og på lista gir det ære (ekte uker) – ingen makt (B-323).
- **Konto:** treningen nei, ukelista ja.

## 2. Fase 2 – valg for pengene i konsernet

### 2.1 Konsernprogrammene K-1 (bygget, står av)

- **Status:** V0-hendelsene og K-1 står i skygge siden 2.10 (B-424). Skyggerapporten (`program_shadow_report()`) var
  avtalt etter en måned, altså **2.11**.
- **Plan:** rapporten til eieren → eieren velger satser (0,5/1,5/4 % eller 1/3/8 %, B-393) → bryterne på → appen viser
  programmene og hendelsene på Konsern.
- **Hva det gir:** to av fem programmer aktive om gangen (Teknologi, Robusthet, Driftsytelse, Marked, Arbeidsmiljø). Det er et
  valg av risikoprofil – ikke et sluk og ikke forventet meravkastning (B-393). Hendelser i regionene gjør at valget betyr
  noe fra uke til uke.

### 2.2 Flere selskaper (S-1 i KONSERNKAPITAL-FORSLAG) – kraftverket bygget (B-509)

- **Regel:** omtrent ett aktivt selskap per 4 aktive konserneiere (aktivitetskravet, B-327), i regionen der flest har verk
  uten et selskap. Serveren foreslår, eieren godkjenner.
- **Nye typer med ulik nytte:**
  - **Kraftverk:** lavere strømpris for verkene i regionen, inntekt fra andres forbruk.
  - **Ildfastfabrikk:** foringen og elektrodene blir billigere for alle i regionen, og eieren får andel.
  - **Havn:** frakt for eksport. Det kan knyttes til ordren fra utlandet (B-491).
  - De følger samme anbud, Kontroll og oppkjøp som i dag.
- **Hvorfor:** i dag er det tre selskaper å kjempe om. Flere, og ulike, gjør at ulike spillere vil ha ulike ting
  (regionen, verkene, strategien) – ikke bare den med størst saldo.

### 2.3 Regionale fellesprosjekter – bygget som modell C (B-508, FELLESPROSJEKT-FORSLAG.md)

- **Hva:** i hver region åpner det et stort prosjekt i ekte tid, f.eks. «Ny kraftlinje», «Dypvannskai» eller «Skrapterminal».
  Det har et mål (f.eks. 20 mrd. kr) og en frist (f.eks. 21 ekte dager). Alle med verk i regionen kan bidra fra
  konsernkassa.
- **Ferdig:** prosjektet gir en varig fordel for alle verk i regionen (f.eks. +2 % utbytte, eller lavere strøm). De som
  bidro, får titler og merker etter andel («Hovedbidragsyter»), og den største får litt Kontroll i regionen i en periode.
- **Ikke ferdig innen fristen:** halvparten kommer tilbake. Det er en ekte risiko, men ikke alt forsvinner.
- **Hvorfor:**
  - Det er det første målet spillerne løser **sammen**, og det gir pengene en bruk som ikke er et sluk.
  - Det skaper samtaler i Skiftrapporten («vi mangler 3 mrd. i nord»), og den rike spilleren blir viktig for de andre.
- **Regler:** alt på serveren i ekte tid (B-190). Fordelen må skaleres sammen med utbyttet (B-311) og simuleres i
  `worldSim.ts`, så det ikke blir en ny inntektsmotor. Bidragene føres som egne poster i kassaboka, ikke som `utbytte`.

## 3. Fase 3 – nytt innhold (større)

### 3.1 Grønt stål hjemme – bygget (B-506)

- **Hva:** en ny gren etter storverket – ikke et nytt nivå:
  - Forskning på hydrogenbasert jernsvamp (DRI), som erstatter noe av skrapet, og CO₂-regnskap per tonn.
  - «Grønne kontrakter» med krav til utslipp per tonn i stedet for bare kjemi.
  - Kapitler i fagboka og quiz.
- **Hvorfor:** spillet skal lære bort hvordan et stålverk virker, og dette er det stålindustrien jobber med nå. Det gir den
  ferdige spilleren nye ting å lære og nye resepter å finne.
- **Balanse:** ny inntekt på toppen skal måles med `balance.ts --storovn 330` og holdes under taket (B-305). Grønne
  kontrakter gir heller omdømme, merker og ukelister enn mer penger, ellers øker bidraget i ekte tid (B-455).

### 3.1b Spesialstål – bygget (B-510)

Legeringsstål laget med øseovnen: tre kvaliteter, forskning, forespørsler, fagbok og prestasjon. Spilltid, ingen penger
mellom spillere.

### 3.2 Industriklynger (samarbeid)

- **Hva:** 2–5 spillere med verk i samme region danner en klynge med navn og merke på kartet. De har felles mål (f.eks.
  regionmester som klynge, fellesprosjektene i 2.3) og en egen kanal i Skiftrapporten.
- **Når:** når det er nok aktive konserneiere. Med få spillere blir klyngene tomme.
- **Regler:** klyngen eier ingenting selv. Pengene og eierskapet forblir hos spillerne, og serveren regner alt. Det trenger
  en grundig vurdering mot juks (flere kontoer i samme klynge).

### 3.3 Ikke anbefalt nå

- **Nytt spill+ / prestisjerestart:** tatt ut i B-141. Sesongene gjør den jobben uten at noen mister verket.
- **Frivillig eierutbytte:** bare et pengesluk med et finere navn før det finnes gode alternativer (KONSERNKAPITAL-FORSLAG §6).
- **Høyere tak på konsernet** (flere plasser, nivå 8+): gir samme sjekkliste én gang til og mer penger inn – det motsatte
  av det som trengs.

## 4. Rekkefølge og hva som trengs fra eieren

1. **Nå (uten server):** støpe- og valsespillene i kontrollrommet (1.3) som trening hjemme.
2. **Når connectoren virker igjen:**
   - Se på lagringen til spilleren som er ferdig (hva hen har, hva hen mangler). Planen kalibreres etter det.
   - Sesong 2 (1.1), regionmester i Hall of Fame og «Mest modernisert» (1.2).
3. **2.11:** skyggerapporten for K-1 → eierens valg → K-1 på (2.1).
4. **Deretter:** flere selskaper (2.2) og fellesprosjektene (2.3), begge simulert i `worldSim.ts` før noe slås på.
5. **Senere:** grønt stål (3.1) og klynger (3.2).

**Spørsmål til eieren:**
1. Når skal sesong 1 slutte, og hvilken vri skal sesong 2 ha?
2. Regionale fellesprosjekter (2.3): ja til idéen? Halvparten tilbake ved bom, eller alt?
3. Hvilke nye selskapstyper først: kraftverk, ildfast eller havn?
4. Skal grønt stål gi penger, eller bare omdømme, merker og lister?
5. Supabase-connectoren svarer «ingen tilgang» – kan du sjekke tilkoblingen, så jeg kan se på dataene igjen?

Konto: avgjøres per steg etter KONTO.md (sesong, lister, selskaper, prosjekter og klynger krever konto; treningen i
kontrollrommet og grønt stål hjemme gjør det ikke).
