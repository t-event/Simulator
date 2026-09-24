import { useEffect, useRef, useState } from "react";
import "./App.css";
import { useSimulation, type ConnectionStatus } from "./hooks/useSimulation";
import { MOBILE_QUERY, useMediaQuery } from "./hooks/useMediaQuery";
import { Readout } from "./components/Readout";
import { FurnaceMimic } from "./components/FurnaceMimic";
import { TrendChart, type TrendPoint } from "./components/TrendChart";
import { AlarmPanel } from "./components/AlarmPanel";
import { ControlPanel } from "./components/ControlPanel";
import { SlagPanel } from "./components/SlagPanel";
import { InstructorPanel } from "./components/InstructorPanel";
import { COOLING_LABEL, PHASE_LABEL, type FurnaceState } from "./types";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  lokal: "Lokal",
  connecting: "kobler til…",
  open: "Tilkoblet",
  closed: "frakoblet",
  erstattet: "erstattet",
  feil: "ingen relay",
};

const MAX_TREND_POINTS = 600;

type MobileView = "ovn" | "styring" | "kjemi" | "alarmer" | "instruktor";

const MOBILE_NAV: { id: MobileView; label: string }[] = [
  { id: "ovn", label: "Ovn" },
  { id: "styring", label: "Styring" },
  { id: "kjemi", label: "Kjemi" },
  { id: "alarmer", label: "Alarmer" },
  { id: "instruktor", label: "Instruktør" },
];

type ReadoutStatus = "normal" | "warning" | "critical";

function statusFor(state: FurnaceState) {
  const tempDeviation = state.bath_temp_c - state.tap_target_temp_c;
  const tempStatus: ReadoutStatus =
    Math.abs(tempDeviation) <= state.tap_window_c
      ? "normal"
      : Math.abs(tempDeviation) <= state.tap_window_c * 2.5
        ? "warning"
        : "critical";
  const grade = state.grade;
  const pStatus: ReadoutStatus =
    grade && state.phosphorus_pct > grade.phosphorus_max_pct ? "critical" : "normal";
  return { tempDeviation, tempStatus, pStatus };
}

function App() {
  const { state, status, statusDetail, session, sendCommand, sendInstructor } = useSimulation();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [tab, setTab] = useState<"control" | "instructor">("control");
  const [mobileView, setMobileView] = useState<MobileView>("ovn");
  const trendRef = useRef<TrendPoint[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const lastTRef = useRef<number>(-1);

  useEffect(() => {
    if (!state || state.time_s === lastTRef.current) return;
    // Ny øvelse eller nullstilt ovn: tiden starter på nytt, og det gjør trenden også
    if (state.time_s < lastTRef.current) trendRef.current = [];
    lastTRef.current = state.time_s;
    trendRef.current = [
      ...trendRef.current,
      {
        t: state.time_s,
        power_mw: state.total_power_mw,
        temp_c: state.bath_temp_c,
        carbon_pct: state.carbon_pct,
        phosphorus_pct: state.phosphorus_pct,
      },
    ].slice(-MAX_TREND_POINTS);
    setTrend(trendRef.current);
  }, [state]);

  if (!state) {
    return (
      <div className="app-loading">
        <p>Kobler til øvelsen ({STATUS_LABEL[status]})…</p>
        {statusDetail && <p className="app-loading-detail">{statusDetail}</p>}
      </div>
    );
  }

  const activeAlarms = state.alarms.filter((a) => a.active).length;
  const { tempDeviation, tempStatus, pStatus } = statusFor(state);
  const grade = state.grade;
  const b2Off = Math.abs(state.b2 - state.b2_target) > state.b2_window;
  const deviationText = `${tempDeviation >= 0 ? "+" : ""}${tempDeviation.toFixed(0)}`;

  // På mobil vises én seksjon om gangen; på større skjermer vises alle
  const section = (...views: MobileView[]) =>
    `mobile-section${views.includes(mobileView) ? " is-active" : ""}`;
  const showInstructor = isMobile ? mobileView === "instruktor" : tab === "instructor";

  return (
    <div className="app-shell">
      <div className="app-top">
        <header className="app-header">
          <h1>Stålovn Simulator</h1>
          <div className="header-status">
            <span className={`ws-status ws-${status}`}>{STATUS_LABEL[status]}</span>
            {session.mode !== "lokal" && <span>rom: {session.room}</span>}
            <span>
              Fase: <strong>{PHASE_LABEL[state.phase]}</strong>
            </span>
            <span className="hide-on-mobile">Charge #{state.heat_number}</span>
            <span className="hide-on-mobile">{grade?.name ?? "–"}</span>
            <span>{Math.floor(state.time_s / 60)} min</span>
            <span>{state.time_scale.toFixed(1)}x</span>
            {activeAlarms > 0 && (
              <span className="header-alarm-badge">
                {activeAlarms} {activeAlarms === 1 ? "alarm" : "alarmer"}
              </span>
            )}
          </div>
          <nav className="tab-nav hide-on-mobile">
            <button className={tab === "control" ? "tab-active" : ""} onClick={() => setTab("control")}>
              Kontrollrom
            </button>
            <button
              className={tab === "instructor" ? "tab-active" : ""}
              onClick={() => setTab("instructor")}
            >
              Instruktør
            </button>
          </nav>
        </header>

        {/* Alltid synlig på mobil, så effekten av et inngrep kan følges fra alle seksjoner */}
        <div className="mobile-keybar">
          <div className={`keybar-cell keybar-${tempStatus}`}>
            <span>Bad</span>
            <strong>{state.bath_temp_c.toFixed(0)}°</strong>
          </div>
          <div className={`keybar-cell keybar-${tempStatus}`}>
            <span>Mot mål</span>
            <strong>{deviationText}°</strong>
          </div>
          <div className="keybar-cell">
            <span>MW</span>
            <strong>{state.total_power_mw.toFixed(0)}</strong>
          </div>
          <div className="keybar-cell">
            <span>C %</span>
            <strong>{state.carbon_pct.toFixed(2)}</strong>
          </div>
          <div className={`keybar-cell keybar-${pStatus}`}>
            <span>P %</span>
            <strong>{state.phosphorus_pct.toFixed(3)}</strong>
          </div>
        </div>

        {statusDetail && <div className="status-banner">{statusDetail}</div>}
      </div>

      <section className={`gauge-row ${section("ovn")}`}>
        <Readout label="Effekt" value={state.total_power_mw.toFixed(1)} unit="MW" />
        <Readout label="Badtemperatur" value={state.bath_temp_c.toFixed(0)} unit="°C" status={tempStatus} />
        <Readout label="Mot tappemål" value={deviationText} unit="°C" status={tempStatus} />
        <Readout label="Karbon" value={state.carbon_pct.toFixed(3)} unit="%" />
        <Readout label="Fosfor" value={state.phosphorus_pct.toFixed(4)} unit="%" status={pStatus} />
        <Readout label="B2" value={state.b2.toFixed(2)} unit="" status={b2Off ? "warning" : "normal"} />
        <Readout label="FeO i slagg" value={(state.slag_pct.FeO ?? 0).toFixed(1)} unit="%" />
        <Readout
          label="Skumslagg"
          value={(state.slag_foam_index * 100).toFixed(0)}
          unit="%"
          status={state.slag_foam_index < 0.2 && state.power_on ? "warning" : "normal"}
        />
        <Readout label="Forvarming" value={state.preheat_temp_c.toFixed(0)} unit="°C" />
        <Readout
          label="Avgass"
          value={state.offgas_temp_c.toFixed(0)}
          unit="°C"
          status={state.offgas_temp_c > 1150 ? "warning" : "normal"}
        />
        <Readout label="Energi" value={state.energy_per_tonne_kwh.toFixed(0)} unit="kWh/t" />
        <Readout
          label="Ildfast brukt"
          value={(state.refractory_wear * 100).toFixed(1)}
          unit="%"
          status={
            state.refractory_wear > 0.7 ? "critical" : state.refractory_wear > 0.5 ? "warning" : "normal"
          }
        />
        {Object.entries(state.cooling).map(([name, c]) => (
          <Readout
            key={name}
            label={`ΔT ${COOLING_LABEL[name] ?? name}`}
            value={c.delta_t_c.toFixed(1)}
            unit="°C"
            status={
              c.delta_t_c > state.cooling_critical_dt
                ? "critical"
                : c.delta_t_c > state.cooling_warning_dt
                  ? "warning"
                  : "normal"
            }
          />
        ))}
      </section>

      <main className="main-grid">
        <div className={`main-col main-col-wide ${section("ovn")}`}>
          <FurnaceMimic state={state} compact={isMobile} />
          <TrendChart data={trend} />
          {state.last_tap_result && (
            <div className={`tap-result ${state.last_tap_result.ok ? "tap-ok" : "tap-dev"}`}>
              <div className="panel-title">
                Siste tapping – charge #{state.last_tap_result.heat_number} ({state.last_tap_result.grade})
              </div>
              <div className="tap-figures">
                <span>
                  {state.last_tap_result.tap_temp_c.toFixed(0)} °C (mål{" "}
                  {state.last_tap_result.target_temp_c.toFixed(0)})
                </span>
                <span>C {state.last_tap_result.carbon_pct.toFixed(3)} %</span>
                <span>P {state.last_tap_result.phosphorus_pct.toFixed(4)} %</span>
                <span>FeO {state.last_tap_result.feo_pct.toFixed(1)} %</span>
                <span>B2 {state.last_tap_result.b2.toFixed(2)}</span>
                <span>{state.last_tap_result.energy_mwh.toFixed(1)} MWh</span>
              </div>
              {state.last_tap_result.ok ? (
                <div className="tap-verdict">Innenfor krav</div>
              ) : (
                <ul className="tap-deviations">
                  {state.last_tap_result.deviations.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className={`main-col ${section("styring", "instruktor")}`}>
          {showInstructor ? (
            <InstructorPanel state={state} sendCommand={sendCommand} sendInstructor={sendInstructor} />
          ) : (
            <ControlPanel state={state} sendCommand={sendCommand} />
          )}
        </div>
        <div className="main-col">
          <div className={section("kjemi")}>
            <SlagPanel state={state} />
          </div>
          <div className={section("alarmer")}>
            <AlarmPanel alarms={state.alarms} onAck={(id) => sendCommand("ack_alarm", { id })} />
          </div>
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Seksjoner">
        {MOBILE_NAV.map((item) => (
          <button
            key={item.id}
            className={mobileView === item.id ? "is-active" : ""}
            aria-current={mobileView === item.id ? "page" : undefined}
            onClick={() => {
              setMobileView(item.id);
              window.scrollTo({ top: 0 });
            }}
          >
            {item.label}
            {item.id === "alarmer" && activeAlarms > 0 && (
              <span className="mobile-nav-badge">{activeAlarms}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
