import type { FurnaceState } from "../types";

interface Props {
  state: FurnaceState;
}

const OXIDE_ORDER = ["CaO", "SiO2", "FeO", "MgO", "Al2O3", "MnO", "Cr2O3", "P2O5"];

function BasicityBar({
  label,
  value,
  target,
  window: win,
}: {
  label: string;
  value: number;
  target: number;
  window: number;
}) {
  const min = target - win * 2;
  const max = target + win * 2;
  const pos = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const targetPos = ((target - min) / (max - min)) * 100;
  const inWindow = Math.abs(value - target) <= win;
  return (
    <div className="basicity">
      <div className="basicity-head">
        <span>{label}</span>
        <strong className={inWindow ? "value-ok" : "value-off"}>{value.toFixed(2)}</strong>
        <span className="basicity-target">mål {target.toFixed(2)}</span>
      </div>
      <div className="basicity-track">
        <div
          className="basicity-window"
          style={{ left: `${((target - win - min) / (max - min)) * 100}%`, width: `${(2 * win / (max - min)) * 100}%` }}
        />
        <div className="basicity-tick" style={{ left: `${targetPos}%` }} />
        <div
          className={`basicity-marker ${inWindow ? "marker-ok" : "marker-off"}`}
          style={{ left: `${pos}%` }}
        />
      </div>
    </div>
  );
}

export function SlagPanel({ state }: Props) {
  const grade = state.grade;
  const pOverLimit = grade ? state.phosphorus_pct > grade.phosphorus_max_pct : false;
  const cInWindow =
    grade &&
    state.carbon_pct >= grade.tap_carbon_min_pct &&
    state.carbon_pct <= grade.tap_carbon_max_pct;

  return (
    <div className="slag-panel">
      <div className="panel-title">Slagg og kjemi</div>

      <BasicityBar label="B2 = CaO/SiO₂" value={state.b2} target={state.b2_target} window={state.b2_window} />
      <BasicityBar
        label="B3 = CaO/(SiO₂+Al₂O₃)"
        value={state.b3}
        target={state.b3_target}
        window={state.b2_window * 0.7}
      />

      <div className="slag-meta">
        <span>Slaggmasse {(state.slag_mass_kg / 1000).toFixed(1)} t</span>
        <span>Skum {(state.slag_foam_index * 100).toFixed(0)} %</span>
      </div>

      <table className="slag-table">
        <tbody>
          {OXIDE_ORDER.map((ox) => {
            const pct = state.slag_pct[ox] ?? 0;
            return (
              <tr key={ox}>
                <td className="slag-ox">{ox}</td>
                <td className="slag-bar-cell">
                  <div className="slag-bar" style={{ width: `${Math.min(100, pct * 2.5)}%` }} />
                </td>
                <td className="slag-val">{pct.toFixed(1)} %</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="panel-subtitle">Badanalyse</div>
      <table className="chem-table">
        <tbody>
          <tr>
            <td>Karbon</td>
            <td className={cInWindow ? "value-ok" : "value-off"}>{state.carbon_pct.toFixed(3)} %</td>
            <td className="chem-limit">
              {grade ? `${grade.tap_carbon_min_pct.toFixed(2)}–${grade.tap_carbon_max_pct.toFixed(2)}` : "–"}
            </td>
          </tr>
          <tr>
            <td>Fosfor</td>
            <td className={pOverLimit ? "value-off" : "value-ok"}>
              {state.phosphorus_pct.toFixed(4)} %
            </td>
            <td className="chem-limit">
              {grade ? `maks ${grade.phosphorus_max_pct.toFixed(3)}` : "–"}
            </td>
          </tr>
          <tr>
            <td>Silisium</td>
            <td>{state.silicon_pct.toFixed(3)} %</td>
            <td className="chem-limit" />
          </tr>
          <tr>
            <td>Mangan</td>
            <td>{state.manganese_pct.toFixed(3)} %</td>
            <td className="chem-limit" />
          </tr>
        </tbody>
      </table>

      <div className="panel-subtitle">Forbruk</div>
      <div className="consumption">
        <span>Kalk {(state.lime_total_kg / 1000).toFixed(2)} t</span>
        <span>Dolomitt {(state.dolomite_total_kg / 1000).toFixed(2)} t</span>
        <span>Karbon {state.carbon_total_kg.toFixed(0)} kg</span>
        <span>O₂ {state.oxygen_total_nm3.toFixed(0)} Nm³</span>
      </div>
    </div>
  );
}
