import type { FurnaceState } from "../types";
import { PHASE_LABEL } from "../types";
import { GRADES } from "../sim/grades";

interface Props {
  state: FurnaceState;
  sendCommand: (action: string, payload?: Record<string, unknown>) => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  disabled?: boolean;
  onChange: (value: number) => void;
  hint?: string;
}

function Slider({ label, value, min, max, step = 1, unit, disabled, onChange, hint }: SliderProps) {
  return (
    <div className="control-row">
      <label>
        <span className="slider-label" title={hint}>
          {label}
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="slider-value">
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </span>
      </label>
    </div>
  );
}

export function ControlPanel({ state, sendCommand }: Props) {
  const canStartCharge = state.phase === "klar" || state.phase === "klargjoring";
  const canTap = state.phase === "raffinering" || state.phase === "avslagging";
  const inSlagPosition = state.tilt_deg <= state.slag_position_deg + 1;

  return (
    <div className="control-panel">
      <div className="panel-title">Betjening</div>

      <div className="control-row status-row">
        <span>
          Fase: <strong>{PHASE_LABEL[state.phase]}</strong>
        </span>
        <span>Charge #{state.heat_number}</span>
        <span>{state.grade?.code ?? "–"}</span>
      </div>

      <div className="control-row">
        {GRADES.map(({ code }) => (
          <button
            key={code}
            className={state.grade?.code === code ? "btn-primary" : ""}
            disabled={!canStartCharge}
            onClick={() => sendCommand("start_charge", { grade: code })}
          >
            Start {code}
          </button>
        ))}
      </div>

      <div className="control-row">
        <button
          className={state.power_on ? "btn-danger" : "btn-primary"}
          onClick={() => sendCommand("set_power", { value: !state.power_on })}
        >
          {state.power_on ? "Slå av lysbue" : "Slå på lysbue"}
        </button>
        <button disabled={!canTap} onClick={() => sendCommand("start_tap")}>
          Start tapping
        </button>
        <button disabled={state.power_on} onClick={() => sendCommand("vacuum_hvelv")}>
          Støvsug hvelv
        </button>
      </div>

      <div className="panel-subtitle">Conveyor og forvarming</div>
      <div className="control-row">
        <button
          className={state.conveyor_running ? "btn-primary" : ""}
          onClick={() => sendCommand("set_conveyor", { value: !state.conveyor_running })}
        >
          Conveyor {state.conveyor_running ? "GÅR" : "STOPP"}
        </button>
        <span className="control-note">
          Igjen: {(state.charge_remaining_kg / 1000).toFixed(1)} t · Forvarming{" "}
          {state.preheat_temp_c.toFixed(0)} °C
        </span>
      </div>
      <Slider
        label="Conveyorhastighet"
        value={state.conveyor_rate_t_min}
        min={0}
        max={3.5}
        step={0.1}
        unit="t/min"
        hint="Lavere hastighet gir lengre tid i forvarmingsdelen og varmere skrap"
        onChange={(v) => sendCommand("set_conveyor_rate", { value: v })}
      />

      <div className="panel-subtitle">Elektrisk</div>
      <Slider
        label="Trafo-tapp"
        value={state.transformer_tap + 1}
        min={1}
        max={8}
        unit="/ 8"
        onChange={(v) => sendCommand("set_transformer_tap", { value: v - 1 })}
      />
      {state.electrodes.map((e) => (
        <div className="electrode-row" key={e.index}>
          <span className="electrode-label">E{e.index + 1}</span>
          <button
            className={e.mode === "auto" ? "btn-primary" : ""}
            onClick={() =>
              sendCommand("set_regulation_mode", {
                electrode: e.index,
                value: e.mode === "auto" ? "manual" : "auto",
              })
            }
          >
            {e.mode === "auto" ? "AUTO" : "MAN"}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            disabled={e.mode !== "manual" || e.broken}
            value={e.target_position_pct}
            onChange={(ev) =>
              sendCommand("set_electrode_position", {
                electrode: e.index,
                value: Number(ev.target.value),
              })
            }
          />
          <span className="electrode-readout">
            {e.broken ? "BRUDD" : `${e.current_ka.toFixed(0)} kA · ${e.length_m.toFixed(1)} m`}
          </span>
        </div>
      ))}
      <Slider
        label="Elektrodekjøling"
        value={state.electrode_cooling_pct}
        min={0}
        max={100}
        unit="%"
        hint="Mer kjøling sparer elektrode, men øker faren for overslag"
        onChange={(v) => sendCommand("set_electrode_cooling", { value: v })}
      />

      <div className="panel-subtitle">Tilsatser og KT-lanser</div>
      <Slider
        label="Brent kalk"
        value={state.lime_rate_kg_min}
        min={0}
        max={250}
        step={5}
        unit="kg/min"
        hint="Hever CaO og dermed B2. Binder fosfor i slaggen."
        onChange={(v) => sendCommand("set_lime_rate", { value: v })}
      />
      <Slider
        label="Brent dolomitt"
        value={state.dolomite_rate_kg_min}
        min={0}
        max={120}
        step={2}
        unit="kg/min"
        hint="Kilde til MgO, reduserer slitasje på ildfast"
        onChange={(v) => sendCommand("set_dolomite_rate", { value: v })}
      />
      <Slider
        label="Magnesitt"
        value={state.magnesite_rate_kg_min}
        min={0}
        max={80}
        step={2}
        unit="kg/min"
        onChange={(v) => sendCommand("set_magnesite_rate", { value: v })}
      />
      <Slider
        label="Karbon (KT)"
        value={state.carbon_injection_kg_min}
        min={0}
        max={120}
        step={2}
        unit="kg/min"
        hint="Reduserer FeO til CO-gass og gir skumslagg"
        onChange={(v) => sendCommand("set_carbon_injection", { value: v })}
      />
      <Slider
        label="Oksygen (KT)"
        value={state.oxygen_flow_nm3h}
        min={0}
        max={4500}
        step={100}
        unit="Nm³/h"
        hint="Ferskning av karbon, tilfører energi. Lite karbon i badet gir mer FeO."
        onChange={(v) => sendCommand("set_oxygen_flow", { value: v })}
      />

      <div className="panel-subtitle">Slaggdør og tipping</div>
      <div className="control-row">
        <button
          className={state.slag_door_open ? "btn-primary" : ""}
          onClick={() => sendCommand("set_slag_door", { value: !state.slag_door_open })}
        >
          Slaggdør {state.slag_door_open ? "ÅPEN" : "LUKKET"}
        </button>
        <button
          className={inSlagPosition ? "btn-primary" : ""}
          onClick={() => sendCommand("set_tilt", { value: state.slag_position_deg })}
        >
          Slaggstilling
        </button>
        <button onClick={() => sendCommand("set_tilt", { value: 0 })}>
          Vannrett
        </button>
      </div>
      <Slider
        label="Tipp"
        value={state.tilt_deg}
        min={state.slag_position_deg - 2}
        max={state.tap_position_deg + 2}
        unit="°"
        onChange={(v) => sendCommand("set_tilt", { value: v })}
      />

      <div className="panel-subtitle">Simulering</div>
      <Slider
        label="Tidsskalering"
        value={state.time_scale}
        min={0}
        max={20}
        step={0.5}
        unit="x"
        onChange={(v) => sendCommand("set_time_scale", { value: v })}
      />
    </div>
  );
}
