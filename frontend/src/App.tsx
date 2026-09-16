import { useEffect, useRef, useState } from "react";
import "./App.css";
import { useSimSocket } from "./hooks/useSimSocket";
import { Readout } from "./components/Readout";
import { FurnaceMimic } from "./components/FurnaceMimic";
import { TrendChart, type TrendPoint } from "./components/TrendChart";
import { AlarmPanel } from "./components/AlarmPanel";
import { ControlPanel } from "./components/ControlPanel";
import { InstructorPanel } from "./components/InstructorPanel";
import { PHASE_LABEL } from "./types";

const MAX_TREND_POINTS = 400;

function App() {
  const { state, status, sendCommand, sendInstructor } = useSimSocket();
  const [tab, setTab] = useState<"control" | "instructor">("control");
  const trendRef = useRef<TrendPoint[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const lastTRef = useRef<number>(-1);

  useEffect(() => {
    if (!state || state.time_s === lastTRef.current) return;
    lastTRef.current = state.time_s;
    trendRef.current = [
      ...trendRef.current,
      { t: state.time_s, power_mw: state.total_power_mw, temp_c: state.bath_temp_c },
    ].slice(-MAX_TREND_POINTS);
    setTrend(trendRef.current);
  }, [state]);

  if (!state) {
    return (
      <div className="app-loading">
        Kobler til simulator ({status})…
      </div>
    );
  }

  const activeAlarms = state.alarms.filter((a) => a.active).length;

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Stålovn Simulator — Kontrollrom</h1>
        <div className="header-status">
          <span className={`ws-status ws-${status}`}>{status === "open" ? "Tilkoblet" : status}</span>
          <span>Fase: {PHASE_LABEL[state.phase]}</span>
          <span>t = {Math.round(state.time_s)}s</span>
          {activeAlarms > 0 && <span className="header-alarm-badge">{activeAlarms} aktive alarmer</span>}
        </div>
        <nav className="tab-nav">
          <button className={tab === "control" ? "tab-active" : ""} onClick={() => setTab("control")}>
            Kontrollrom
          </button>
          <button className={tab === "instructor" ? "tab-active" : ""} onClick={() => setTab("instructor")}>
            Instruktør
          </button>
        </nav>
      </header>

      <section className="gauge-row">
        <Readout label="Total effekt" value={state.total_power_mw.toFixed(1)} unit="MW" />
        <Readout
          label="Badtemperatur"
          value={state.bath_temp_c.toFixed(0)}
          unit="°C"
          status={state.bath_temp_c > 1700 ? "warning" : "normal"}
        />
        <Readout label="Fast andel" value={(state.solid_fraction * 100).toFixed(0)} unit="%" />
        <Readout label="Karbon" value={state.carbon_pct.toFixed(2)} unit="%" />
        <Readout label="Slaggskum" value={(state.slag_foam_index * 100).toFixed(0)} unit="%" />
        <Readout
          label="Avgass CO"
          value={state.offgas_co_pct.toFixed(1)}
          unit="%"
          status={state.offgas_co_pct > 15 ? "critical" : state.offgas_co_pct > 8 ? "warning" : "normal"}
        />
        <Readout label="Energi total" value={state.energy_total_mwh.toFixed(1)} unit="MWh" />
        {Object.entries(state.cooling).map(([name, c]) => (
          <Readout
            key={name}
            label={`ΔT ${name}`}
            value={c.delta_t_c.toFixed(1)}
            unit="°C"
            status={c.delta_t_c > 25 ? "critical" : c.delta_t_c > 20 ? "warning" : "normal"}
          />
        ))}
      </section>

      <main className="main-grid">
        <div className="main-col main-col-wide">
          <FurnaceMimic state={state} />
          <TrendChart data={trend} />
        </div>
        <div className="main-col">
          {tab === "control" ? (
            <ControlPanel state={state} sendCommand={sendCommand} />
          ) : (
            <InstructorPanel state={state} sendCommand={sendCommand} sendInstructor={sendInstructor} />
          )}
        </div>
        <div className="main-col">
          <AlarmPanel alarms={state.alarms} onAck={(id) => sendCommand("ack_alarm", { id })} />
        </div>
      </main>
    </div>
  );
}

export default App;
