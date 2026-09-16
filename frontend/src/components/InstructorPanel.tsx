import { useEffect, useState } from "react";
import type { FurnaceState, ScenarioInfo } from "../types";
import { COOLING_LABEL } from "../types";

interface Props {
  state: FurnaceState;
  sendCommand: (action: string, payload?: Record<string, unknown>) => void;
  sendInstructor: (action: string, payload?: Record<string, unknown>) => void;
}

export function InstructorPanel({ state, sendCommand, sendInstructor }: Props) {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const apiBase =
    (import.meta.env.VITE_API_URL as string | undefined) ??
    `http://${window.location.hostname}:8000`;

  useEffect(() => {
    fetch(`${apiBase}/api/scenarios`)
      .then((r) => r.json())
      .then(setScenarios)
      .catch(() => setScenarios([]));
  }, [apiBase]);

  const active = scenarios.find((s) => s.id === state.scenario);

  return (
    <div className="instructor-panel">
      <div className="panel-title">Instruktørpanel</div>

      {active && (
        <div className="briefing">
          <strong>{active.name}</strong>
          <p>{active.briefing}</p>
        </div>
      )}

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
          <button
            key={e.index}
            onClick={() => sendInstructor("inject_fault", { fault: "electrode_break", electrode: e.index })}
          >
            Brekk E{e.index + 1}
          </button>
        ))}
      </div>
      <div className="control-row">
        {Object.keys(state.cooling).map((name) => (
          <button
            key={name}
            onClick={() =>
              sendInstructor("inject_fault", { fault: "water_leak", circuit: name, severity: 0.6 })
            }
          >
            Lekkasje {COOLING_LABEL[name] ?? name}
          </button>
        ))}
      </div>
      <div className="control-row">
        <button onClick={() => sendInstructor("inject_fault", { fault: "overslag" })}>Overslag</button>
        <button onClick={() => sendInstructor("inject_fault", { fault: "dusty_hvelv" })}>
          Støvfylt hvelv
        </button>
        <button onClick={() => sendInstructor("inject_fault", { fault: "static_seal" })}>
          Falskluft
        </button>
      </div>
      <div className="control-row">
        <button
          onClick={() =>
            sendInstructor("inject_fault", { fault: "high_phosphorus_scrap", value: 0.085 })
          }
        >
          Høyfosfor-skrap
        </button>
        <button onClick={() => sendInstructor("inject_fault", { fault: "new_pot" })}>
          Ny ovnspotte
        </button>
        <button onClick={() => sendInstructor("inject_fault", { fault: "clear_all" })}>
          Fjern alle feil
        </button>
      </div>

      <div className="panel-subtitle">Status</div>
      <div className="instructor-status">
        <span>Støv i hvelv: {(state.hvelv_dust_level * 100).toFixed(0)} %</span>
        <span>Static seal: {state.static_seal_ok ? "OK" : "utett"}</span>
        <span>Ildfast brukt: {(state.refractory_wear * 100).toFixed(1)} %</span>
        <span>
          Elektroder:{" "}
          {state.electrodes.map((e) => (e.broken ? "brudd" : `${e.length_m.toFixed(1)}m`)).join(" · ")}
        </span>
      </div>

      <div className="control-row">
        <button className="btn-danger" onClick={() => sendCommand("reset")}>
          Nullstill ovn
        </button>
      </div>
    </div>
  );
}
