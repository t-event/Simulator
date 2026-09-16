import type { FurnaceState } from "../types";

interface Props {
  state: FurnaceState;
}

const ELECTRODE_X = [330, 390, 450];

export function FurnaceMimic({ state }: Props) {
  const arcOn = state.power_on;
  const chargeProgress =
    state.charge_total_kg > 0
      ? 1 - state.charge_remaining_kg / state.charge_total_kg
      : 0;
  const bathFill = Math.min(1, state.liquid_mass_kg / 120000);
  const solidPile = Math.min(1, state.solid_scrap_kg / 12000);

  return (
    <svg viewBox="0 0 760 400" className="furnace-mimic" role="img" aria-label="Prosessdiagram stålovn">
      <rect x="0" y="0" width="760" height="400" fill="var(--panel-bg)" />

      {/* --- Conveyor med forvarmingsdel --- */}
      <g>
        <text x="20" y="40" className="mimic-label">
          SKRAPLASTING
        </text>
        <rect x="20" y="52" width="110" height="26" rx="3" fill="#2a3340" stroke="#4a5568" />
        <text x="75" y="69" textAnchor="middle" className="mimic-value">
          {(state.charge_remaining_kg / 1000).toFixed(1)} t igjen
        </text>

        {/* beltet */}
        <rect
          x="20"
          y="92"
          width="176"
          height="12"
          fill={state.conveyor_running ? "#3d5568" : "#2a3340"}
          stroke="#4a5568"
        />
        {state.conveyor_running &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={26 + i * 32}
              y="86"
              width="14"
              height="8"
              fill="#6b7a8c"
              className="conveyor-scrap"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}

        {/* forvarmingsdel */}
        <rect x="196" y="80" width="118" height="34" rx="3" fill="#4a2f28" stroke="#8a5a45" />
        <text x="255" y="74" textAnchor="middle" className="mimic-label">
          FORVARMING
        </text>
        <text x="255" y="102" textAnchor="middle" className="mimic-value">
          {state.preheat_temp_c.toFixed(0)} °C
        </text>
        {!state.static_seal_ok && (
          <text x="255" y="130" textAnchor="middle" className="mimic-alarm">
            falskluft
          </text>
        )}

        {/* charge-fremdrift */}
        <rect x="20" y="112" width="176" height="5" fill="#2a3340" />
        <rect x="20" y="112" width={176 * chargeProgress} height="5" fill="var(--accent)" />
      </g>

      {/* --- Avgass til renseanlegg --- */}
      <g>
        <path d="M 470 150 L 560 150 L 560 40 L 700 40" fill="none" stroke="#4a5568" strokeWidth="10" />
        <text x="610" y="30" textAnchor="middle" className="mimic-label">
          AVGASS → RENSEANLEGG
        </text>
        <text x="610" y="60" textAnchor="middle" className="mimic-value">
          {state.offgas_temp_c.toFixed(0)} °C · CO {state.offgas_co_pct.toFixed(1)} %
        </text>
      </g>

      {/* --- Ovnen --- */}
      <g transform={`rotate(${state.tilt_deg} 390 300)`}>
        {/* potte */}
        <path
          d="M 280 300 Q 280 375 390 375 Q 500 375 500 300 L 500 215 L 280 215 Z"
          fill="#3b3228"
          stroke="#6b5a45"
          strokeWidth="3"
        />

        {/* stålbad */}
        <path
          d={`M 286 ${360 - 60 * bathFill} L 494 ${360 - 60 * bathFill} L 494 360 Q 494 369 390 369 Q 286 369 286 360 Z`}
          fill="#ff7a3d"
          opacity={0.92}
        />

        {/* slagglag */}
        {state.slag_mass_kg > 800 && (
          <rect
            x="286"
            y={360 - 60 * bathFill - 8 - 10 * state.slag_foam_index}
            width="208"
            height={8 + 10 * state.slag_foam_index}
            fill={state.slag_foam_index > 0.4 ? "#7a6a4a" : "#5a5040"}
            opacity={0.9}
          />
        )}

        {/* umeltet skrap */}
        {solidPile > 0.02 && (
          <path
            d={`M 320 ${360 - 60 * bathFill} l ${40 + 60 * solidPile} 0 l ${-20 - 30 * solidPile} ${-14 - 22 * solidPile} Z`}
            fill="#6b7a8c"
          />
        )}

        {/* overdel og hvelv */}
        <ellipse cx="390" cy="215" rx="112" ry="18" fill="#4a4038" stroke="#6b5a45" strokeWidth="3" />

        {/* tappehull / tappetut */}
        <path d="M 496 320 L 530 342 L 530 350 L 496 330 Z" fill="#4a4038" stroke="#6b5a45" />

        {/* slaggdør */}
        <rect
          x="266"
          y="298"
          width="16"
          height="30"
          fill={state.slag_door_open ? "#ffb020" : "#555"}
          stroke="#6b5a45"
        />
      </g>

      {/* --- Elektroder --- */}
      {state.electrodes.map((e, i) => {
        const x = ELECTRODE_X[i];
        const topY = 148;
        const lengthPx = 90 + (e.position_pct / 100) * 60;
        const bottomY = topY + lengthPx;
        return (
          <g key={e.index}>
            <rect
              x={x - 7}
              y={topY}
              width="14"
              height={lengthPx}
              fill={e.broken ? "#7a2020" : "#2b2b2b"}
              stroke={e.broken ? "#ff4d4d" : "#555"}
            />
            {arcOn && !e.broken && e.current_ka > 1 && (
              <line
                x1={x}
                y1={bottomY}
                x2={x + (i - 1) * 4}
                y2={bottomY + 16}
                stroke="#8ecbff"
                strokeWidth={2 + e.current_ka / 22}
                className="arc-flicker"
              />
            )}
            <text x={x} y={topY - 20} textAnchor="middle" className="mimic-value">
              E{e.index + 1}
            </text>
            <text x={x} y={topY - 8} textAnchor="middle" className="mimic-label">
              {e.broken ? "BRUDD" : `${e.length_m.toFixed(1)}m`}
            </text>
          </g>
        );
      })}

      {/* --- Nøkkeltall --- */}
      <g>
        <text x="600" y="200" className="mimic-label">
          BAD
        </text>
        <text x="600" y="222" className="mimic-big">
          {state.bath_temp_c.toFixed(0)} °C
        </text>
        <text x="600" y="244" className="mimic-value">
          mål {state.tap_target_temp_c.toFixed(0)} °C
        </text>
        <text x="600" y="262" className="mimic-value">
          likvidus {state.liquidus_c.toFixed(0)} °C
        </text>
        <text x="600" y="292" className="mimic-label">
          MASSE
        </text>
        <text x="600" y="312" className="mimic-value">
          {(state.liquid_mass_kg / 1000).toFixed(1)} t flytende
        </text>
        <text x="600" y="330" className="mimic-value">
          {(state.solid_scrap_kg / 1000).toFixed(1)} t umeltet
        </text>
        <text x="600" y="358" className="mimic-value">
          {state.tilt_deg.toFixed(0)}° tipp
        </text>
      </g>
    </svg>
  );
}
