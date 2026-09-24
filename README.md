# Stålverket

Et tycoonspill der du bygger et skrapbasert stålverk fra bunnen av – fra en
kald garasje med en gassfyrt digel til et storverk med lysbueovner,
strengstøping, valseverk og hundrevis av ansatte.

Spillet er laget for å lære bort hvordan et stålverk henger sammen. Det du må
gjøre for å tjene penger, er det samme som gjelder i virkeligheten: velge
riktig skrap, treffe analysen, holde ovnen og foringen i drift, bemanne
skiftene og levere riktig kvalitet i tide. En fagbok låses opp kapittel for
kapittel etter hvert som du møter nye deler av prosessen.

Spillet kjører helt i nettleseren, fungerer på mobil, nettbrett og PC, og
lagres automatisk i nettleseren. Det publiseres på GitHub Pages.

## Slik spiller du

1. **Salg** – signer kontrakter. Hver kontrakt har mengde, kvalitet, pris og
   frist. Spillet viser om resepten din holder kravet og om du rekker det.
2. **Marked** – kjøp skrap og sett sammen resepten. Anslaget viser hvilke
   kvaliteter resepten gir i ovnen du har.
3. **Verket** – ovnen smelter automatisk etter resepten og kvaliteten du kjører
   mot. Stålet støpes og legges på lager, og partier som holder kravet leveres
   automatisk til aktive kontrakter.
4. **Folk** – fra verkstedet og oppover trenger du ansatte. Hvert anlegg har et
   fast mannskap per skift; flere skift gir flere driftstimer i døgnet.
5. **Bygg** – kjøp nytt utstyr og flytt inn i neste nivå når du har penger og
   omdømme nok.

| Nivå | Typisk utstyr | Hva som er nytt |
|---|---|---|
| Garasje | Gassfyrt digel, sandformer | Du gjør alt selv, 10 timer om dagen |
| Verksted | Induksjonsovn 1 t, formlinje | De første ansatte, analysator, strålingsportal |
| Støperi | Induksjonsovn 5 t, blokkstøping | Skiftarbeid, spektrometer, du blir daglig leder |
| Stålverk | Lysbueovn 30 t, strengstøping | Avfosforering, øseovn, valseverk, *ta styringen* |
| Storverk | Lysbueovn 90 t, fire strenger | Eksportkunder og fullskala drift |

### Ta styringen

Når verket har lysbueovn, kan du ta styringen på neste charge. Spillet
pauses, og du havner i kontrollrommet med den fulle prosessmodellen og
skrapet fra din egen resept: conveyor og forvarming, trafo-tapp, kalk og
dolomitt, karbon og oksygen, avslagging og tapping. Resultatet – analyse,
energiforbruk og slitasje – går tilbake inn i spillet som en vanlig charge.
Godt kjørte charger bruker mindre strøm, får lavere fosfor og gir omdømme.

## Hva spillet lærer bort

| Tema | Hvordan det virker i spillet |
|---|---|
| Sporelementer | Cu, Sn, Ni, Cr og Mo kan bare tynnes ut med rent skrap eller råjern. Resepten bestemmer hvilke kvaliteter du kan lage. |
| Karbon | Kan alltid legges til, men bare fjernes med oksygen i lysbueovnen. Råjern i en induksjonsovn gir høykarbonstål, enten du vil eller ikke. |
| Fosfor | Fjernes bare i lysbueovnen med basisk, oksiderende slagg. Induksjonsovnen gir ut det som kommer inn. |
| Skrapkvalitet | Billig skrap har mer skitt: mindre stål per tonn, mer energi, og av og til et dårlig parti med mye fosfor. |
| Analyse | Uten laboratorium er analysen anslått, og avvik oppdages av kunden. En håndholdt analysator måler sporelementer, et spektrometer måler alt. |
| Radioaktivitet | Uten strålingsportal kan en skjult kilde havne i ovnen, med dyr opprydding. |
| Ildfast | Foringen slites for hver charge og må byttes før den brenner gjennom. |
| Støping | Utbytte fra sandstøping til strengstøping, støpefeil ved feil temperatur, strenggjennombrudd. |
| Strøm | Prisen varierer over døgnet og med været. Du kan la være å starte charger når strømmen er dyr. |
| Flaskehalser | Skraplager, ovn, øse, støping, valsing og ferdigvarelager kan alle stoppe produksjonen. |

Tallene i spillet er oppfunnet. De er satt slik at retning og
størrelsesorden stemmer med vanlig stålverksdrift, men de beskriver ikke noe
bestemt anlegg.

## Arkitektur

```
frontend/
  src/game/                 Spillmotoren (ren TypeScript, ingen React)
    types.ts                 Spilltilstanden – ren JSON, lagres i nettleseren
    data.ts                  Skrap, kvaliteter, produkter, utstyr, roller, kunder
    plant.ts                 Utledede tall: kapasitet, bemanning, skift, priser
    engine.ts                Tid, produksjon, marked, kontrakter, hendelser
    actions.ts               Det spilleren kan gjøre
    knowledge.ts             Fagboka
    save.ts                  Lagring i nettleseren
    useGame.ts               Spilløkka for React
    balance.ts               Automatisk testspiller for balansering
  src/ui/                   Spillets grensesnitt (mobil først)
    ControlRoom.tsx          Kontrollrommet for «ta styringen»
  src/sim/                  Prosessmodellen for lysbueovnen
    eaf.ts                   Lumped-parameter-modell av en conveyormatet lysbueovn
    validate.ts              Referansekjøring med nøkkeltall
  src/components/           HMI-komponentene i kontrollrommet
```

Prosessmodellen i `src/sim/` gjengir koblingene en ovnsoperatør må håndtere:
smelting drevet av overheting over likvidus, massebasert slaggkjemi med B2 og
B3, oksygen fordelt i Ellingham-rekkefølge, skumslagg, avfosforering med
fosforbom ved feil rekkefølge, elektrodeslitasje, overslag og slitasje på
ildfast. Parametrene er representative for en lysbueovn i 100-tonnsklassen.

## Kjøre lokalt

```bash
cd frontend
npm install
npm run dev
```

Åpne `http://localhost:5173`.

Sjekker (kjøres også i CI før hver publisering):

```bash
cd frontend
npx tsx src/sim/validate.ts     # prosessmodellen gir forventede nøkkeltall
npx tsx src/game/balance.ts     # testspilleren når hvert nivå innenfor målene, uten konkurs
npm run lint
```

`balance.ts` spiller seks spill med ulike frø. Den sjekker at medianen for når
hvert nivå nås ligger innenfor målvinduet, at ingen går konkurs, og at en
charge kjørt i kontrollrommet kommer riktig tilbake inn i spillet. Legg til
`--verbose` for dag-for-dag-utskrift og `--finance` for kostnadsfordeling.

## Publisere

Arbeidsflyten i `.github/workflows/pages.yml` bygger og publiserer ved hver
push til `main`. Pages må stå på **Settings → Pages → Source: GitHub Actions**.
