import { useEffect, useState } from "react";
import type { FurnaceState, ScenarioInfo } from "../types";

interface Props {
  state: FurnaceState;
  sendCommand: (action: string, payload?: Record<string, unknown>) => void;
  sendInstructor: (action: string, payload?: Record<string, unknown>) => void;
}

export function InstructorPanel({ state, sendCommand, sendInstructor }: Props) {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? `http://${window.location.hostname}:8000`;

  useEffect(() => {
    fetch(`${apiBase}/api/scenarios`)
      .then((r) => r.json())
      .then(setScenarios)
      .catch(() => setScenarios([]));
  }, [apiBase]);

  return (
    <div className="instructor-panel">
      <div className="panel-title">Instruktørpanel</div>

      <div className="panel-subtitle">Scenarioer</div>
      <ul className="scenario-list">
        {scenarios.map((s) => (
          <li key={s.id} className={state.scenario === s.id ? "scenario-active" : ""}>
            <div>
              <strong>{s.name}</strong>
              <p>{s.briefing}</p>
            </div>
            <button onClick={() => sendInstructor("load_scenario", { id: s.id })}>Last inn</button>
          </li>
        ))}
      </ul>

      <div className="panel-subtitle">Injiser feil</div>
      <div className="control-row">
        {state.electrodes.map((e) => (
          <button key={e.index} onClick={() => sendInstructor("inject_fault", { fault: "electrode_break", electrode: e.index })}>
            Brekk E{e.index + 1}
          </button>
        ))}
      </div>
      <div className="control-row">
        {Object.keys(state.cooling).map((name) => (
          <button key={name} onClick={() => sendInstructor("inject_fault", { fault: "water_leak", circuit: name, severity: 0.6 })}>
            Lekkasje {name}
          </button>
        ))}
      </div>
      <div className="control-row">
        <button onClick={() => sendInstructor("inject_fault", { fault: "scrap_cave_in" })}>Skrapras nå</button>
        <button onClick={() => sendInstructor("inject_fault", { fault: "clear_all" })}>Fjern alle feil</button>
      </div>

      <div className="panel-subtitle">Simulering</div>
      <div className="control-row">
        <button className="btn-danger" onClick={() => sendCommand("reset")}>
          Nullstill ovn
        </button>
      </div>
    </div>
  );
}
