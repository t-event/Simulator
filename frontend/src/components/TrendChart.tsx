import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendPoint {
  t: number;
  power_mw: number;
  temp_c: number;
  carbon_pct: number;
  phosphorus_pct: number;
}

type View = "process" | "chemistry";

interface Props {
  data: TrendPoint[];
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const axisStyle = { fill: "#8a94a6", fontSize: 11 };
const tooltipStyle = { background: "#1b2330", border: "1px solid #384357" };

export function TrendChart({ data }: Props) {
  const [view, setView] = useState<View>("process");

  return (
    <div className="trend-chart">
      <div className="trend-head">
        <span className="panel-title">Trender</span>
        <div className="trend-tabs">
          <button className={view === "process" ? "tab-active" : ""} onClick={() => setView("process")}>
            Effekt / temp
          </button>
          <button
            className={view === "chemistry" ? "tab-active" : ""}
            onClick={() => setView("chemistry")}
          >
            Kjemi
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="t"
            tick={axisStyle}
            tickFormatter={(v) => formatClock(Number(v))}
          />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => formatClock(Number(v))} />
          {view === "process" ? (
            <>
              <YAxis yAxisId="power" tick={axisStyle} width={38} />
              <YAxis yAxisId="temp" orientation="right" tick={axisStyle} width={44} domain={["auto", "auto"]} />
              <Line
                yAxisId="power"
                type="monotone"
                dataKey="power_mw"
                stroke="#4fc3f7"
                dot={false}
                strokeWidth={2}
                name="Effekt (MW)"
                isAnimationActive={false}
              />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temp_c"
                stroke="#ff8a3d"
                dot={false}
                strokeWidth={2}
                name="Temp (°C)"
                isAnimationActive={false}
              />
            </>
          ) : (
            <>
              <YAxis yAxisId="c" tick={axisStyle} width={44} />
              <YAxis yAxisId="p" orientation="right" tick={axisStyle} width={54} />
              <Line
                yAxisId="c"
                type="monotone"
                dataKey="carbon_pct"
                stroke="#b388ff"
                dot={false}
                strokeWidth={2}
                name="C (%)"
                isAnimationActive={false}
              />
              <Line
                yAxisId="p"
                type="monotone"
                dataKey="phosphorus_pct"
                stroke="#4caf50"
                dot={false}
                strokeWidth={2}
                name="P (%)"
                isAnimationActive={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
