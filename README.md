# Stålovn Simulator

En web-basert simulator av en lysbueovn med conveyor-mating, laget for
opplæring av kontrollromsoperatører i stålverk.

Operatøren kjører en komplett charge fra kontrollrommet: mater inn 92 tonn
skrap med conveyor, bygger slagg med kalk og dolomitt, holder skumslagg med
karbon og oksygen gjennom lansene, avfosforerer, slagger av og tapper
innenfor temperaturvinduet. Et eget instruktørpanel styrer øvelser og
injiserer feil.

Hele simuleringen kjører i nettleseren. Det er ingen server å drifte for
vanlig bruk – appen publiseres på GitHub Pages og deles som en URL. Den
fungerer på PC, nettbrett og mobil; på mobil vises én seksjon om gangen
(Ovn, Styring, Kjemi, Alarmer, Instruktør) med nøkkeltallene alltid synlige
øverst.

## Hva som er modellert

| Område | Modell |
|---|---|
| Innlasting | Conveyor med vannkjølt forvarmingsdel som varmes av avgassen. Lavere hastighet gir lengre oppholdstid og varmere skrap. Static seal påvirker falskluft og dermed forvarmingen. |
| Smelting | Flatt bad med stålsump (25 t) som smelter skrapet kontinuerlig. Smeltehastigheten drives av overhetingen over likvidus, så mates det inn raskere enn effekten tåler, faller badtemperaturen og skrapet hoper seg opp. |
| Elektrisk | Trafo med 8 spenningstapp, tre elektroder med automatisk regulering (AER) eller manuell posisjonering. |
| Slaggkjemi | Massebasert modell av CaO, MgO, SiO₂, Al₂O₃, FeO, MnO, Cr₂O₃ og P₂O₅ med B2 = CaO/SiO₂ (mål 1,8) og B3 = CaO/(SiO₂+Al₂O₃) (mål 1,25). |
| Oksygen | Fordeles på C, Si, Mn og Fe i Ellingham-rekkefølge. Lavt karboninnhold gir mer jernforbrenning og dermed høyere FeO, slik det er kjent fra lavkarbonkjøring. |
| Skumslagg | Krever CO-utvikling fra karboninjeksjon og FeO-reduksjon, kombinert med riktig viskositet (B2 nær målet). Skummet isolerer lysbuen og reduserer strålevarmen. |
| Avfosforering | Fosfor fordeles mellom stål og slagg avhengig av FeO, basisitet og temperatur. Kjøres temperaturen opp mens fosforrik slagg fortsatt ligger i ovnen, går reaksjonen motsatt vei – fosforbom. |
| Elektrodeslitasje | Sideoksidasjon (dempes av elektrodekjøling), tippfordamping per MWh og tippbrudd når elektroden blir for kort. |
| Overslag | Risiko øker med støv i hvelvet og med økt elektrodekjøling. Kan treffe vannkjølte elementer og gi vannlekkasje. |
| Ildfast | Slitasje akkumuleres over charger og eskalerer kraftig ved overoppheting. Gjennombrenning avbryter chargen. |
| Tapping | Temperaturmål ut fra likvidus for ferdig kvalitet (1518 − 70·%C) pluss påslag. Tapperapport sammenligner mot kravene til kvaliteten. |

Modellen er lumped-parameter. Den gjengir riktig retning, rekkefølge og
størrelsesorden på koblingene en operatør må håndtere, men er ikke en
termodynamisk nøyaktig gjengivelse av noe bestemt anlegg. Parametrene er
representative for en lysbueovn i 100-tonnsklassen, og bør kalibreres mot
faktiske driftsdata før modellen brukes til annet enn prosedyretrening.

`frontend/src/sim/validate.ts` kjører referansescenarioene og skriver ut
nøkkeltallene. Den kjøres også i CI ved hver publisering. En normalt kjørt
charge skal lande på:

| Nøkkeltall | Simulator | Vanlig for lysbueovn |
|---|---|---|
| Tapp-til-tapp | ca. 59 min | 45–70 min |
| Energiforbruk | ca. 390 kWh/t | 350–450 kWh/t, lavere med forvarming |
| FeO i slagg | 29,3 % | 25–30 % |
| B2 | 1,74 | 1,6–2,0 |
| Ildfast per charge | 0,99 % | ca. 100 charger per potte |

## Stålkvaliteter

Tre generiske kvaliteter som spenner ut det operatøren må kunne håndtere.
Tallet i koden er ferdig karboninnhold i hundredeler; karbonvinduet i
simulatoren er det stålovnen skal *tappe* på, siden karbon legeres opp igjen
ved tapping og på øseovnen.

| Kode | Type | Tappevindu %C | Maks %P |
|---|---|---|---|
| AR20 | Armeringskvalitet | 0,04–0,10 | 0,035 |
| LK08 | Lavkarbon | 0,02–0,05 | 0,030 |
| HK80 | Høykarbon | 0,25–0,45 | 0,040 |

## Kjøremodus

Simulatoren kan kjøres på tre måter, styrt av parametre i URL-en.

**Lokal** (standard, og det GitHub Pages bruker): simuleringen kjører i denne
nettleseren. Instruktøren bytter til Instruktør-fanen på samme skjerm.

```
https://<bruker>.github.io/Simulator/
```

**Flermaskin**: instruktør og operatør sitter på hver sin maskin. Én maskin er
vert og kjører simuleringen; de andre kobler seg til som deltakere. En liten
relay på lokalnettet serverer appen og formidler meldinger mellom dem – den
inneholder ingen prosessmodell.

```bash
cd relay
npm install
npm run bygg       # bygger appen som relayen skal servere
npm start          # skriver ut adressene som skal åpnes
```

Relayen skriver ut adresser av typen:

```
Vert (operatør):       http://192.168.1.10:8080/?modus=vert&rom=kurs1
Deltaker (instruktør): http://192.168.1.10:8080/?modus=deltaker&rom=kurs1
```

Verten kjører ovnen og sender tilstanden videre; deltakerne ser det samme
bildet og kan gripe inn – også fra mobil. `rom` skiller flere samtidige
øvelser på samme relay. Starter en ny vert i et rom som allerede har en,
overtar den nye, og den gamle får beskjed om det.

Flermaskin må åpnes fra relayens adresse, ikke fra GitHub Pages. En side
lastet over https får ikke lov av nettleseren til å koble seg til en
ukryptert relay på lokalnettet, og Pages kan ikke selv kjøre en relay.

## Scenarioer

- **Normal charge** – komplett charge på AR20 uten forstyrrelser.
- **Fosforbom** – høyfosfor-skrap som krever riktig rekkefølge: avfosforer, slagg av, og først deretter kjør opp temperaturen.
- **Overslag og vannlekkasje** – støvfylt hvelv og høy elektrodekjøling.
- **Kjølevannslekkasje i hvelv** – overvåk delta-T og reager før panelet tar skade.
- **Falskluft i static seal** – kaldere skrap inn og høyere energiforbruk.
- **Lavkarbon LK08** – mer oksygen, høyere FeO, dårligere stålutbytte.

## Arkitektur

```
frontend/
  src/sim/                  Prosessmodellen – eneste implementasjon
    constants.ts             Prosessparametre
    state.ts                 Intern ovnstilstand
    grades.ts                Stålkvaliteter med tappevindu
    eaf.ts                   Simuleringsmotor
    scenarios.ts             Treningsscenarioer
    commands.ts              Kommandodispatch, delt av lokal og fjernstyrt modus
    serialize.ts             Intern tilstand -> flat tilstand for HMI
    validate.ts              Referansekjøring med nøkkeltall
  src/hooks/useSimulation.ts Tick-løkke (delsteg på maks 1 s) og eventuell relay-tilkobling
  src/session.ts             Leser modus/rom/relay fra URL
  src/components/            Kontrollrom-HMI

relay/                      Serverer appen på lokalnettet og formidler meldinger (ingen fysikk)
.github/workflows/pages.yml Bygger, validerer og publiserer til GitHub Pages
```

## Kjøre lokalt

```bash
cd frontend
npm install
npm run dev
```

Åpne `http://localhost:5173`.

Verifisere prosessmodellen:

```bash
cd frontend
npx tsx src/sim/validate.ts
```

## Publisere

Arbeidsflyten i `.github/workflows/pages.yml` bygger og publiserer ved hver
push til `main`. Pages må stå på **Settings → Pages → Source: GitHub Actions**.

## Kjøre en charge

1. Velg kvalitet og trykk **Start AR20** for å gjøre en skrapkasse klar.
2. Start **conveyor** og sett hastighet (2–2,5 t/min er et greit utgangspunkt).
3. Slå på **lysbue** og velg trafo-tapp. Følg badtemperaturen: mates det inn
   raskere enn effekten tåler, faller temperaturen og skrapet hoper seg opp.
4. Sett **kalk** (ca. 40 kg/min) og **dolomitt** (ca. 34 kg/min) for å styre B2
   mot 1,8, og **karbon** + **oksygen** på lansene for skumslagg og ferskning.
5. Når alt skrapet er smeltet, gå til raffinering: juster karbon og fosfor.
6. **Slagg av før du kjører opp temperaturen** – åpne slaggdøra og tipp til
   slaggstilling. Gjør du det motsatt, kommer fosforet tilbake i stålet.
7. Tilbake til vannrett, kjør opp mot tappemålet, og trykk **Start tapping**.
   Tappetemperaturen er temperaturen når tappingen starter. Tapperapporten
   viser avvik mot kravene til kvaliteten; energi og forbruk er per charge.

## Videre arbeid

- Øseovnen som eget område, slik at temperatur og legering kan følges videre
  etter tapping.
- Elektrodeskjøting som prosedyre i stedet for at brudd krever pottebytte.
- Logging av øvelser for evaluering i etterkant.
- Kalibrering av tidskonstanter og tilsatsrater mot faktiske driftsdata.
