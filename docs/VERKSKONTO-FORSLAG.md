# Forslag: verkskontoen – mer å bruke penger på hjemme (B-454)

Eieren 3.10: nabolagsprosjektene koster 28 mrd. til sammen, og store hjemmeverk har ofte ingen av dem. Det trengs flere
valg for store hjemmeverk, mens kassa fortsatt kan vokse fritt (B-381). **Bygget i B-455** (eieren 5.10: «bygg alt»), med
anbefalingene som svar: 3 × og 9 × uten ny effekt, stiftelsen bare i eget spill, slitasjen i en lett versjon.

## 1. Ekte tall (4.10.2026, 21 storverk som har lagret de siste 14 dagene)

| | |
|---|---|
| Kassa hjemme | median 9,5 mrd., største 62 mrd. |
| Vekst i kassa (snitt siste 7 spilldøgn) | typisk 30–60 mill. per spilldøgn, enkelte ca. 300 mill. |
| Nabolaget (6 bygg, 28 mrd.) | snitt 2,4 bygg; 2 har alle, 7 har ingen |
| Har ingen bygg, men kassa til flere | 4 verk med 9,5–45 mrd. (den største kunne kjøpt alle) |

**Det største funnet er synlighet, ikke mangel på ting:** kortet «Byggeprosjekter» står nederst på Verket → Anlegg (under
produksjonen, vedlikeholdet og kvaliteten), og ingen råd eller «!» peker dit. De fire rikeste uten bygg har ingen linje om
nabolaget i loggen – de har trolig aldri sett kortet. Samme mønster som anbudet (B-453): noe finnes, men spilleren får ikke
vite det når det er aktuelt.

## 2. Rammer

- **Lokal kasse gir ingen makt** (B-190, B-323): penger hjemme kan ikke flyttes til konsernkassa (stengt, B-382).
- **Men marginen hjemme teller i bidraget** (B-318): bidraget til konsernkassa regnes av marginen i døgnregnskapet (tak
  3 000 kr per tonn og time). Noe som kjøpes hjemme og gjør verket billigere å drive eller mer lønnsomt, gir derfor mer
  penger i ekte tid. Nye kjøp hjemme skal være **synlige, prestisje eller trygghet** – ikke kostnadskutt eller mer salg.
- Ingen nye valutaer (B-180), gradvis synlighet, ingen tekstvegger. Kjøp hjemme krever ikke konto (KONTO.md: eget spill).
- Et rent pengesluk (høye faste kostnader) treffer feil: overskuddet varierer mye mellom store verk (B-331, avsnitt 9).

## 3. Forslag

### V1. Si fra om nabolaget (anbefalt nå – lite)

- Et råd på Oversikt når kassa holder til neste bygg og ingenting bygges: «Kassa holder til Idrettshall (1 mrd.) – store
  bygg i byen gir en liten fordel for alltid.» Trykk går til kortet på Anlegg.
- «!» på Verket (som rådene på Marked og Folk, B-202) til spilleren har sett kortet én gang.
- Testspilleren (nybegynner) følger rådet, så `balance.ts` og `--storovn 330` må kjøres. Fordelene er små og gjelder bare
  storverket.

### V2. Nabolaget i tre trinn (anbefalt neste)

- De seks byggene kan utvides to ganger: trinn 2 koster 3 × prisen, trinn 3 koster 9 × (i alt 28 + 84 + 252 = 364 mrd.).
- Utvidelsen gir **ingen ny effekt** – byggene blir større og lysere i anleggsbildet, og hver utvidelse gir en prestasjon.
  Det holder marginen urørt.
- Byggetid som før (ett om gangen, etter pris), så det blir et valg *når*.

### V3. Verkets stiftelse (anbefalt neste)

- Gi bort penger til byen i trinn med stigende pris (1, 2, 5, 10, 20, 50, 100 … mrd.). Hvert trinn gir en tittel
  i appen («Velgjører», «Mesen» …), en prestasjon og pynt (en statue eller et parkanlegg i bildet).
- Uendelig: det er alltid et neste trinn for den rikeste. Ingen effekt på drift, margin eller andre spillere.
- Spørsmål: skal trinnet vises på profilen? Da må serveren vite det (lagret spill), og det vurderes mot B-419 og KONTO.md.

### V4. Slitasje og fornyelse (senere)

B3 fra B-331: store anlegg slites over ca. 180 spilldøgn, fornyelse koster 20 % av prisen, lav tilstand gir flere havarier
(`riskFactor`). Gir en jobb å gjøre og trekker marginen litt ned – aldri opp. Mest arbeid av de fire.

### Ikke anbefalt

- **Kostnadskutt for kroner** (varmegjenvinning, solcellepark, billigere strøm): øker marginen og dermed bidraget i ekte
  tid – penger hjemme blir makt i verden.
- **Kroner til fagpoeng:** fagpoeng er spilltid og gir mesterskap som senker administrasjonen hjemme (B-328) – samme
  problem i mindre skala, og det gjør fagpoengene verdiløse.
- **Overføring til konsernkassa:** stengt (B-382), og det skal ikke åpnes uten en egen beslutning.

## 4. Anbefaling og spørsmål til eieren

Anbefalt rekkefølge: **V1 nå**, så **V2 og V3** som én byggeoppgave, **V4** senere.

1. Skal V1 bygges nå?
2. V2: er 3 × og 9 × riktige, og skal utvidelsene være uten ny effekt?
3. V3: skal stiftelsen vises på profilen (krever at serveren leser trinnet), eller bare i eget spill?
4. V4: ønsket, eller vente til V2/V3 er prøvd?
