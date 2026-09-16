import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface TrendPoint {
  t: number;
  power_mw: number;
  temp_c: number;
}

interface Props {
  data: TrendPoint[];
}

export function TrendChart({ data }: Props) {
  return (
    <div className="trend-chart">
      <div className="panel-title">Trender</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <XAxis dataKey="t" tick={{ fill: "#8a94a6", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 60)}m`} />
          <YAxis yAxisId="power" tick={{ fill: "#8a94a6", fontSize: 11 }} width={36} />
          <YAxis yAxisId="temp" orientation="right" tick={{ fill: "#8a94a6", fontSize: 11 }} width={36} />
          <Tooltip
            contentStyle={{ background: "#1b2330", border: "1px solid #384357" }}
            labelFormatter={(v) => `t=${Math.round(Number(v))}s`}
          />
          <Line yAxisId="power" type="monotone" dataKey="power_mw" stroke="#4fc3f7" dot={false} strokeWidth={2} name="Effekt (MW)" />
          <Line yAxisId="temp" type="monotone" dataKey="temp_c" stroke="#ff8a3d" dot={false} strokeWidth={2} name="Temp (°C)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
