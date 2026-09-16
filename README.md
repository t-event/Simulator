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
termodynamisk nøyaktig gjengivelse av anlegget. En normalt kjørt charge lander
på rundt 380 kWh/t, ca. 55 min tapp-til-tapp og en slaggsammensetning nær
slaggprøven i kompendiet (FeO ≈ 29 %, B2 ≈ 1,7).

## Scenarioer

- **Normal charge** – komplett charge på TP26 uten forstyrrelser.
- **Fosforbom** – høyfosfor-skrap som krever riktig rekkefølge: avfosforer, slagg av, og først deretter kjør opp temperaturen.
- **Overslag og vannlekkasje** – støvfylt hvelv og høy elektrodekjøling.
- **Kjølevannslekkasje i hvelv** – overvåk delta-T og reager før panelet tar skade.
- **Falskluft i static seal** – kaldere skrap inn og høyere energiforbruk.
- **Lavkarbon TP28** – mer oksygen, høyere FeO, dårligere stålutbytte.

## Arkitektur

```
backend/   Python (FastAPI) – prosessmodell og sanntidssimulering
  app/main.py                WebSocket-server og REST-endepunkter
  app/simulation/
    constants.py              Prosessparametre, merket [K] der de kommer fra kompendiet
    model.py                  Datamodeller for ovnstilstand
    grades.py                 TP-kvaliteter med tappevindu
    eaf.py                    Simuleringsmotor
    scenarios.py              Treningsscenarioer
    serialize.py              Tilstand -> JSON

frontend/  React + TypeScript (Vite) – kontrollrom-HMI
  src/hooks/useSimSocket.ts   WebSocket-klient
  src/components/
    FurnaceMimic.tsx           Prosessdiagram med conveyor, forvarming og ovn
    ControlPanel.tsx           Operatørbetjening
    SlagPanel.tsx              Slaggkjemi, B2/B3 og badanalyse
    InstructorPanel.tsx        Scenarioer og feilinjeksjon
    AlarmPanel.tsx / TrendChart.tsx / Readout.tsx
```

Backend kjører en sanntidsløkke på 4 Hz som stepper prosessmodellen og
kringkaster tilstanden til alle tilkoblede klienter over WebSocket (`/ws`).
Kommandoer fra operatør og instruktør går samme vei.

## Kjøre lokalt

**Backend:**
```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

**Frontend** (i en annen terminal):
```bash
cd frontend
npm install
npm run dev
```

Åpne `http://localhost:5173`. Frontend kobler som standard til
`ws://<host>:8000/ws`, som kan overstyres med `VITE_WS_URL` og `VITE_API_URL`.

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
7. Tilbake til vannrett, kjør opp mot tappemålet, og trykk **Start tapping**.
   Tapperapporten viser avvik mot kravene til kvaliteten.

## Videre arbeid

- Øseovnen som eget område (kompendiets kapittel 6), slik at temperatur og
  legering kan følges videre etter tapping.
- Flerbruker-/sesjonsstøtte – i dag er det én global ovn per backend.
- Elektrodeskjøting som prosedyre i stedet for at brudd krever pottebytte.
- Logging av øvelser for evaluering i etterkant.
- Validering av tidskonstanter og tilsatsrater mot faktiske driftsdata.
