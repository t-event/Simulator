import type { FurnaceState } from "../types";
import { PHASE_LABEL } from "../types";

interface Props {
  state: FurnaceState;
  sendCommand: (action: string, payload?: Record<string, unknown>) => void;
}

export function ControlPanel({ state, sendCommand }: Props) {
  const canCharge = !state.power_on && state.baskets_charged < 3 && state.phase !== "tapping";
  const canPowerOn = !state.power_on && (state.phase === "charging" || state.phase === "bore_in" || state.phase === "melting" || state.phase === "refining");
  const canTap = state.phase === "refining";
  const canFinishTap = state.phase === "tapping";

  return (
    <div className="control-panel">
      <div className="panel-title">Betjening</div>

      <div className="control-row">
        <span className="control-status">Fase: <strong>{PHASE_LABEL[state.phase]}</strong></span>
        <span className="control-status">Charger: {state.baskets_charged}/3</span>
      </div>

      <div className="control-row">
        <button disabled={!canCharge} onClick={() => sendCommand("charge_scrap")}>
          Charge skrap
        </button>
        <button
          className={state.power_on ? "btn-danger" : "btn-primary"}
          disabled={!state.power_on && !canPowerOn}
          onClick={() => sendCommand("set_power", { value: !state.power_on })}
        >
          {state.power_on ? "Slå av lysbue" : "Slå på lysbue"}
        </button>
        <button disabled={!canTap} onClick={() => sendCommand("start_tap")}>
          Start tapping
        </button>
        <button disabled={!canFinishTap} onClick={() => sendCommand("finish_tap")}>
          Fullfør tapping
        </button>
      </div>

      <div className="control-row">
        <label>
          Transformator-tapp
          <input
            type="range"
            min={0}
            max={7}
            value={state.transformer_tap}
            onChange={(e) => sendCommand("set_transformer_tap", { value: Number(e.target.value) })}
          />
          <span>{state.transformer_tap + 1}/8</span>
        </label>
      </div>

      <div className="control-row">
        <label>
          Tidsskalering
          <input
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={state.time_scale}
            onChange={(e) => sendCommand("set_time_scale", { value: Number(e.target.value) })}
          />
          <span>{state.time_scale.toFixed(1)}x</span>
        </label>
      </div>

      <div className="panel-subtitle">Elektroder</div>
      {state.electrodes.map((e) => (
        <div className="electrode-row" key={e.index}>
          <span className="electrode-label">E{e.index + 1}</span>
          <button
            className={e.mode === "auto" ? "btn-primary" : ""}
            onClick={() => sendCommand("set_regulation_mode", { electrode: e.index, value: e.mode === "auto" ? "manual" : "auto" })}
          >
            {e.mode === "auto" ? "AUTO" : "MANUELL"}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            disabled={e.mode !== "manual" || e.broken}
            value={e.target_position_pct}
            onChange={(ev) => sendCommand("set_electrode_position", { electrode: e.index, value: Number(ev.target.value) })}
          />
          <span className="electrode-readout">
            {e.current_ka.toFixed(0)} kA / {e.voltage_v.toFixed(0)} V
          </span>
        </div>
      ))}

      <div className="panel-subtitle">Prosess</div>
      <div className="control-row">
        <label>
          Oksygen
          <input
            type="range"
            min={0}
            max={2500}
            step={50}
            value={state.oxygen_flow_nm3h}
            onChange={(e) => sendCommand("set_oxygen_flow", { value: Number(e.target.value) })}
          />
          <span>{state.oxygen_flow_nm3h.toFixed(0)} Nm³/h</span>
        </label>
      </div>
      <div className="control-row">
        <label>
          Karboninjeksjon
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={state.carbon_injection_kg_min}
            onChange={(e) => sendCommand("set_carbon_injection", { value: Number(e.target.value) })}
          />
          <span>{state.carbon_injection_kg_min.toFixed(0)} kg/min</span>
        </label>
      </div>
      <div className="control-row">
        <button
          className={state.burner_on ? "btn-primary" : ""}
          onClick={() => sendCommand("set_burner", { value: !state.burner_on })}
        >
          Brenner {state.burner_on ? "PÅ" : "AV"}
        </button>
        <button
          className={state.door_open ? "btn-primary" : ""}
          onClick={() => sendCommand("set_door_open", { value: !state.door_open })}
        >
          Slaggdør {state.door_open ? "ÅPEN" : "LUKKET"}
        </button>
      </div>
      <div className="control-row">
        <label>
          Tilt
          <input
            type="range"
            min={-15}
            max={15}
            value={state.tilt_deg}
            onChange={(e) => sendCommand("set_tilt", { value: Number(e.target.value) })}
          />
          <span>{state.tilt_deg.toFixed(0)}°</span>
        </label>
      </div>
    </div>
  );
}
