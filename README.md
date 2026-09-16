# Stålovn Simulator

En web-basert lysbueovn-simulator (Electric Arc Furnace) for opplæring av
kontrollromsoperatører. Simulerer en full tapp-til-tapp-syklus (charging,
innboring, smelting, raffinering, tapping) med en fysikkbasert prosessmodell,
og gir et kontrollrom-grensesnitt for operatøren pluss et eget instruktørpanel
for å styre øvelser og injisere feil.

## Arkitektur

```
backend/   Python (FastAPI) – prosessmodell og sanntids-simulering
  app/main.py                 WebSocket-server + REST-endepunkter
  app/simulation/
    constants.py               Fysiske konstanter og ovnsparametre
    model.py                   Datamodeller for ovnstilstand
    eaf.py                     Simuleringsmotor (elektrisk/termisk/kjemi/kjøling)
    scenarios.py                Forhåndsdefinerte treningsscenarioer
    serialize.py                Tilstand -> JSON for frontend

frontend/  React + TypeScript (Vite) – kontrollrom-HMI
  src/hooks/useSimSocket.ts     WebSocket-klient (tilstand inn, kommandoer ut)
  src/components/
    FurnaceMimic.tsx             SVG-diagram av ovnen (elektroder, bad, dør, tilt)
    ControlPanel.tsx             Operatørbetjening
    InstructorPanel.tsx          Scenarioer og feilinjeksjon
    AlarmPanel.tsx / TrendChart.tsx / Readout.tsx
```

Backend kjører en sanntidsløkke (4 Hz) som stepper prosessmodellen og
kringkaster tilstand til alle tilkoblede klienter over WebSocket (`/ws`).
Operatør- og instruktørkommandoer sendes samme vei.

### Prosessmodellen (høy realisme, forenklet)

- **Elektrisk**: transformator med 8 spenningstapp, 3 elektroder med
  automatisk regulering (AER) som søker mot måls-strøm basert på tapp,
  eller manuell posisjonering.
- **Termisk**: energibalanse med smeltevarme, spesifikk varme (fast/flytende),
  strålings-/ledningstap gjennom vegger/tak (redusert av skummende slagg),
  avgasstap og kjølevannsavkjøling.
- **Metallurgi**: karboninnhold reduseres ved oksygenlansing (dekarburisering,
  eksoterm energi), karboninjeksjon for skumming av slagg.
- **Hjelpesystemer**: to kjølevannskretser (tak/vegger) med ΔT-overvåking og
  simulert lekkasjefeil, avgasstemperatur og CO-nivå.
- **Faser**: idle → charging → innboring → smelting → raffinering → tapping → snuoperasjon.
- **Tilfeldige hendelser**: skrapras under smelting som forstyrrer elektrodeposisjon.

Tallene er kalibrert for plausibel dynamikk og prosedyretrening (lesing av
målere, reaksjon på alarmer, riktig rekkefølge av operasjoner) – ikke for
eksakt metallurgisk nøyaktighet.

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
`ws://<host>:8000/ws` (kan overstyres med `VITE_WS_URL` og `VITE_API_URL`).

## Bruk

1. Gå til **Kontrollrom**-fanen. Trykk **Charge skrap** for å laste inn en
   skrapkurv (inntil 3 kurver).
2. Trykk **Slå på lysbue** for å starte innboring, deretter hovedsmelting.
3. Bruk oksygen/karboninjeksjon i raffineringsfasen for å justere karbon og
   temperatur før tapping.
4. Trykk **Start tapping** når temperatur/karbon er innenfor mål, deretter
   **Fullfør tapping** for å nullstille for neste smelte.
5. Bytt til **Instruktør**-fanen for å laste forhåndsdefinerte
   øvelsesscenarioer (f.eks. kjølevannslekkasje, elektrodebrudd) eller
   injisere feil manuelt for å teste operatørens reaksjon.

## Videre arbeid

- Flerbruker-/sesjonsstøtte (i dag er det én global ovn-instans per backend).
- Elektrodebytte-prosedyre (i dag krever brukket elektrode reset av ovnen).
- Lagring/logging av øvelser for evaluering i etterkant.
- Finere kalibrering av tidskonstanter mot en fagperson innen stålproduksjon.
