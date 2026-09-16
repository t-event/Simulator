import type { FurnaceState } from "../types";

interface Props {
  state: FurnaceState;
}

const ELECTRODE_X = [230, 300, 370];

export function FurnaceMimic({ state }: Props) {
  const anyArc = state.power_on && state.electrodes.some((e) => !e.broken && e.current_ka > 1);
  const fillHeight = 10 + 70 * (1 - state.solid_fraction) * (state.bath_mass_kg > 0 ? 1 : 0);
  const shellRotation = state.tilt_deg;

  return (
    <svg viewBox="0 0 600 360" className="furnace-mimic" role="img" aria-label="Ovnsdiagram">
      <rect x="0" y="0" width="600" height="360" fill="var(--panel-bg)" />

      {/* transformer */}
      <g transform="translate(40,140)">
        <rect x="0" y="0" width="70" height="90" rx="4" fill="#2a3340" stroke="#4a5568" />
        <text x="35" y="-8" textAnchor="middle" className="mimic-label">TRAFO</text>
        <text x="35" y="50" textAnchor="middle" className="mimic-value">Tapp {state.transformer_tap + 1}</text>
      </g>

      {/* furnace shell group, tiltable */}
      <g transform={`rotate(${shellRotation} 300 260)`}>
        <path
          d="M 190 260 Q 190 340 300 340 Q 410 340 410 260 L 410 190 L 190 190 Z"
          fill="#3b3228"
          stroke="#6b5a45"
          strokeWidth="3"
        />
        {/* molten bath fill */}
        {state.bath_mass_kg > 0 && (
          <path
            d={`M 195 ${330 - fillHeight} Q 195 335 300 335 Q 405 335 405 ${330 - fillHeight} L 405 325 Q 405 335 300 335 Q 195 335 195 325 Z`}
            fill={state.solid_fraction > 0.9 ? "#5b6472" : "#ff7a3d"}
            opacity={0.9}
          />
        )}
        {/* roof */}
        <ellipse cx="300" cy="190" rx="112" ry="18" fill="#4a4038" stroke="#6b5a45" strokeWidth="3" />
        {/* tap spout */}
        <path d="M 405 300 L 440 320 L 440 328 L 405 312 Z" fill="#4a4038" stroke="#6b5a45" />
      </g>

      {/* electrodes + arcs (fixed to roof openings, not tilted, for readability) */}
      {state.electrodes.map((e, i) => {
        const x = ELECTRODE_X[i];
        const topY = 40;
        const lengthPx = 130 + (e.position_pct / 100) * 55;
        const bottomY = topY + lengthPx;
        const arcOn = anyArc && !e.broken && e.current_ka > 1;
        return (
          <g key={e.index}>
            <rect
              x={x - 6}
              y={topY}
              width="12"
              height={lengthPx}
              fill={e.broken ? "#7a2020" : "#2b2b2b"}
              stroke={e.broken ? "#ff4d4d" : "#555"}
            />
            {arcOn && (
              <line
                x1={x}
                y1={bottomY}
                x2={x + (i - 1) * 4}
                y2={bottomY + 14}
                stroke="#8ecbff"
                strokeWidth={2 + e.current_ka / 25}
                className="arc-flicker"
              />
            )}
            <text x={x} y={topY - 10} textAnchor="middle" className="mimic-value">
              E{e.index + 1} {e.broken ? "BRUDD" : `${e.position_pct.toFixed(0)}%`}
            </text>
          </g>
        );
      })}

      {/* off-gas duct */}
      <g transform="translate(430,60)">
        <rect x="0" y="0" width="14" height="90" fill="#3a3a3a" stroke="#555" />
        <text x="7" y="-8" textAnchor="middle" className="mimic-label">Avgass</text>
        <text x="7" y="105" textAnchor="middle" className="mimic-value">{state.offgas_temp_c.toFixed(0)}°C</text>
      </g>

      {/* door */}
      <rect x="170" y="280" width="18" height="30" fill={state.door_open ? "#ffb020" : "#555"} />
      <text x="179" y="325" textAnchor="middle" className="mimic-label">Dør</text>
    </svg>
  );
}
