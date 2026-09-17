# Stålovn Simulator

En web-basert simulator av stålovnen (lysbueovn med conveyor-mating) for
opplæring av kontrollromsoperatører. Prosessen følger slik den er beskrevet i
metallurgikompendiet for Celsa Armeringsstål (Biørnstad & Wiik Asheim,
2. utgave 2024), som ligger i repoet.

Operatøren kjører en komplett charge fra kontrollrommet: mater inn 92 tonn
skrap med conveyor, bygger slagg med kalk og dolomitt, holder skumslagg med
karbon og oksygen gjennom KT-lansene, avfosforerer, slagger av og tapper
innenfor temperaturvinduet. Et eget instruktørpanel styrer øvelser og
injiserer feil.

Hele simuleringen kjører i nettleseren. Det er ingen server å drifte for
vanlig bruk – appen publiseres på GitHub Pages og deles som en URL.

## Hva som er modellert

| Område | Modell |
|---|---|
| Innlasting | Conveyor med vannkjølt forvarmingsdel som varmes av avgassen. Lavere hastighet gir lengre oppholdstid og varmere skrap. Static seal påvirker falskluft og dermed forvarmingen. |
| Smelting | Flatt bad med stålsump (25 t) som smelter skrapet kontinuerlig. Smeltehastigheten drives av overhetingen over likvidus, så mates det inn raskere enn effekten tåler, faller badtemperaturen og skrapet hoper seg opp. |
| Elektrisk | Trafo med 8 spenningstapp, tre elektroder med automatisk regulering (AER) eller manuell posisjonering. |
| Slaggkjemi | Massebasert modell av CaO, MgO, SiO₂, Al₂O₃, FeO, MnO, Cr₂O₃ og P₂O₅ med B2 = CaO/SiO₂ (mål 1,8) og B3 = CaO/(SiO₂+Al₂O₃) (mål 1,25). |
| Oksygen | Fordeles på C, Si, Mn og Fe i Ellingham-rekkefølge. Lavt karboninnhold gir mer jernforbrenning og dermed høyere FeO, slik kompendiet beskriver for lavkarbonkvaliteter. |
| Skumslagg | Krever CO-utvikling fra karboninjeksjon og FeO-reduksjon, kombinert med riktig viskositet (B2 nær målet). Skummet isolerer lysbuen og reduserer strålevarmen. |
| Avfosforering | Fosfor fordeles mellom stål og slagg avhengig av FeO, basisitet og temperatur. Kjøres temperaturen opp mens fosforrik slagg fortsatt ligger i ovnen, går reaksjonen motsatt vei – fosforbom. |
| Elektrodeslitasje | Sideoksidasjon (dempes av elektrodekjøling), tippfordamping per MWh og tippbrudd når elektroden blir for kort. |
| Overslag | Risiko øker med støv i hvelvet og med økt elektrodekjøling. Kan treffe vannkjølte elementer og gi vannlekkasje. |
| Ildfast | Slitasje akkumuleres over charger og eskalerer kraftig ved overoppheting. Gjennombrenning avbryter chargen. |
| Tapping | Temperaturmål ut fra likvidus for ferdig kvalitet (1518 − 70·%C) pluss påslag. Tapperapport sammenligner mot kravene til TP-kvaliteten. |

Modellen er lumped-parameter. Den gjengir riktig retning, rekkefølge og
størrelsesorden på koblingene en operatør må håndtere, men er ikke en
termodynamisk nøyaktig gjengivelse av anlegget.

`frontend/src/sim/validate.ts` kjører referansescenarioene og skriver ut
nøkkeltallene. Den kjøres også i CI ved hver publisering. En normalt kjørt
charge skal lande på:

| Nøkkeltall | Simulator | Kompendiet |
|---|---|---|
| Tapp-til-tapp | ca. 59 min | – |
| Energiforbruk | ca. 390 kWh/t | conveyor sparer ca. 10 % mot korg [K 3.1] |
| FeO i slagg | 29,3 % | 28,8 % i slaggprøve TP26 [K 4.3.1] |
| B2 | 1,74 | 1,74 i samme prøve, mål 1,8 [K 4.3.2] |
| Ildfast per charge | 0,99 % | ca. 100 charger per potte |

## Kjøremodus

Simulatoren kan kjøres på tre måter, styrt av parametre i URL-en.

**Lokal** (standard, og det GitHub Pages bruker): simuleringen kjører i denne
nettleseren. Instruktøren bytter til Instruktør-fanen på samme skjerm.

```
https://<bruker>.github.io/Simulator/
```

**Flermaskin**: instruktør og operatør sitter på hver sin maskin. Én maskin er
vert og kjører simuleringen; de andre kobler seg til som deltakere. En liten
relay formidler meldinger mellom dem – den inneholder ingen prosessmodell.

```bash
cd relay
npm install
npm start          # lytter på ws://0.0.0.0:8080
```

```
Vert (operatør):     ...?modus=vert&rom=kurs1&relay=ws://192.168.1.10:8080
Deltaker (instruktør): ...?modus=deltaker&rom=kurs1&relay=ws://192.168.1.10:8080
```

Verten kjører ovnen og sender tilstanden videre; deltakerne ser det samme
bildet og kan gripe inn. `rom` skiller flere samtidige øvelser på samme relay.

Merk at GitHub Pages bare serverer statiske filer. Flermaskin-modus krever
derfor at relayen kjører et sted begge maskinene når – typisk på
instruktørens laptop på treningssenterets nett.

## Scenarioer

- **Normal charge** – komplett charge på TP26 uten forstyrrelser.
- **Fosforbom** – høyfosfor-skrap som krever riktig rekkefølge: avfosforer, slagg av, og først deretter kjør opp temperaturen.
- **Overslag og vannlekkasje** – støvfylt hvelv og høy elektrodekjøling.
- **Kjølevannslekkasje i hvelv** – overvåk delta-T og reager før panelet tar skade.
- **Falskluft i static seal** – kaldere skrap inn og høyere energiforbruk.
- **Lavkarbon TP28** – mer oksygen, høyere FeO, dårligere stålutbytte.

## Arkitektur

```
frontend/
  src/sim/                  Prosessmodellen – eneste implementasjon
    constants.ts             Prosessparametre, merket [K] der de kommer fra kompendiet
    state.ts                 Intern ovnstilstand
    grades.ts                TP-kvaliteter med tappevindu
    eaf.ts                   Simuleringsmotor
    scenarios.ts             Treningsscenarioer
    commands.ts              Kommandodispatch, delt av lokal og fjernstyrt modus
    serialize.ts             Intern tilstand -> flat tilstand for HMI
    validate.ts              Referansekjøring med nøkkeltall
  src/hooks/useSimulation.ts Tick-løkke og eventuell relay-tilkobling
  src/session.ts             Leser modus/rom/relay fra URL
  src/components/            Kontrollrom-HMI

relay/                      Meldingsformidler for flermaskin-øvelser (ingen fysikk)
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
push til `main`. Første gang må Pages slås på i repoet under
**Settings → Pages → Source: GitHub Actions**.

## Kjøre en charge

1. Velg kvalitet og trykk **Start TP26** for å gjøre en skrapkasse klar.
2. Start **conveyor** og sett hastighet (2–2,5 t/min er et greit utgangspunkt).
3. Slå på **lysbue** og velg trafo-tapp. Følg badtemperaturen: mates det inn
   raskere enn effekten tåler, faller temperaturen og skrapet hoper seg opp.
4. Sett **kalk** (ca. 40 kg/min) og **dolomitt** (ca. 34 kg/min) for å styre B2
   mot 1,8, og **karbon** + **oksygen** på KT-lansene for skumslagg og ferskning.
5. Når alt skrapet er smeltet, gå til raffinering: juster karbon og fosfor.
6. **Slagg av før du kjører opp temperaturen** – åpne slaggdøra og tipp til
   slaggstilling. Gjør du det motsatt, kommer fosforet tilbake i stålet.
7. Tilbake til vannrett, kjør opp mot tappemålet med litt margin (badet kjøles
   mens det tappes), og trykk **Start tapping**. Tapperapporten viser avvik mot
   kravene til kvaliteten.

## Videre arbeid

- Øseovnen som eget område (kompendiets kapittel 6), slik at temperatur og
  legering kan følges videre etter tapping.
- Elektrodeskjøting som prosedyre i stedet for at brudd krever pottebytte.
- Logging av øvelser for evaluering i etterkant.
- Validering av tidskonstanter og tilsatsrater mot faktiske driftsdata.
