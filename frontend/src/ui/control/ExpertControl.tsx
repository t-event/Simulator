/**
 * Ekspertmodus i kontrollrommet: hele HMI-et med alle styregrep.
 *
 * Brukes av dem som vil kjøre chargen helt selv. Standard er den enkle
 * styringen i SimpleControl.
 */
import { useEffect, useState } from "react";
import "../../controlroom.css";
import { MOBILE_QUERY, useMediaQuery } from "../../hooks/useMediaQuery";
import { Readout } from "../../components/Readout";
import { FurnaceMimic } from "../../components/FurnaceMimic";
import { TrendChart, type TrendPoint } from "../../components/TrendChart";
import { AlarmPanel } from "../../components/AlarmPanel";
import { ControlPanel } from "../../components/ControlPanel";
import { SlagPanel } from "../../components/SlagPanel";
import type { EAFSimulation } from "../../sim/eaf";
import { applyOperatorCommand } from "../../sim/commands";
import { serializeState } from "../../sim/serialize";
import { COOLING_LABEL, PHASE_LABEL, type FurnaceState } from "../../types";
import type { ManualResult } from "../../game/engine";
import { GRADES } from "../../game/data";
import type { ManualRequest } from "../../game/types";
import { buildResult } from "./simSetup";

const TICK_MS = 250;
const MAX_ELAPSED_S = 2;
const MAX_SUBSTEP_S = 1;
const MAX_TREND_POINTS = 600;
const START_TIME_SCALE = 5;

type MobileView = "ovn" | "styring" | "kjemi" | "alarmer";

const MOBILE_NAV: { id: MobileView; label: string }[] = [
  { id: "ovn", label: "Ovn" },
  { id: "styring", label: "Styring" },
  { id: "kjemi", label: "Kjemi" },
  { id: "alarmer", label: "Alarmer" },
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
  const pStatus: ReadoutStatus = grade && state.phosphorus_pct > grade.phosphorus_max_pct ? "critical" : "normal";
  return { tempDeviation, tempStatus, pStatus };
}

interface Props {
  sim: EAFSimulation;
  startWear: number;
  request: ManualRequest;
  onDone: (result: ManualResult | null) => void;
}

export function ExpertControl({ sim, startWear, request, onDone }: Props) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [mobileView, setMobileView] = useState<MobileView>("ovn");
  useEffect(() => {
    if (sim.state.timeScale < START_TIME_SCALE) sim.setTimeScale(START_TIME_SCALE);
  }, [sim]);
  const [state, setState] = useState<FurnaceState>(() => serializeState(sim));
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [confirmAbort, setConfirmAbort] = useState(false);

  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min((now - last) / 1000, MAX_ELAPSED_S);
      last = now;
      const dt = elapsed * sim.state.timeScale;
      if (dt > 0 && sim.state.phase !== "klargjoring") {
        const n = Math.ceil(dt / MAX_SUBSTEP_S);
        for (let i = 0; i < n; i++) sim.step(dt / n);
      }
      const snap = serializeState(sim);
      setState(snap);
      setTrend((t) =>
        t.length && t[t.length - 1].t === snap.time_s
          ? t
          : [
              ...t,
              {
                t: snap.time_s,
                power_mw: snap.total_power_mw,
                temp_c: snap.bath_temp_c,
                carbon_pct: snap.carbon_pct,
                phosphorus_pct: snap.phosphorus_pct,
              },
            ].slice(-MAX_TREND_POINTS),
      );
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [sim]);

  const send = (action: string, payload: Record<string, unknown> = {}) => {
    applyOperatorCommand(sim, action, payload);
    setState(serializeState(sim));
  };

  const tap = state.last_tap_result;
  const brokeThrough = sim.state.refractoryWear >= 1;
  const finished = state.phase === "klargjoring" && tap !== null;

  const finish = () => onDone(buildResult(sim, startWear));

  const activeAlarms = state.alarms.filter((a) => a.active).length;
  const { tempDeviation, tempStatus, pStatus } = statusFor(state);
  const b2Off = Math.abs(state.b2 - state.b2_target) > state.b2_window;
  const deviationText = `${tempDeviation >= 0 ? "+" : ""}${tempDeviation.toFixed(0)}`;
  const section = (...views: MobileView[]) => `mobile-section${views.includes(mobileView) ? " is-active" : ""}`;

  return (
    <div className="control-room" role="dialog" aria-modal="true" aria-label="Kontrollrommet">
      <div className="app-shell">
        <div className="app-top">
          <header className="app-header">
            <h1>Kontrollrommet</h1>
            <div className="header-status">
              <span>
                Fase: <strong>{PHASE_LABEL[state.phase]}</strong>
              </span>
              <span className="hide-on-mobile">
                {GRADES[request.grade].name} · {state.grade?.code}
              </span>
              <span>{Math.floor(state.time_s / 60)} min</span>
              <span>{state.time_scale.toFixed(1)}x</span>
              {activeAlarms > 0 && (
                <span className="header-alarm-badge">
                  {activeAlarms} {activeAlarms === 1 ? "alarm" : "alarmer"}
                </span>
              )}
            </div>
            <div className="cr-actions">
              {confirmAbort ? (
                <>
                  <span>La automatikken ta over?</span>
                  <button className="btn-danger" onClick={() => onDone(null)}>
                    Ja
                  </button>
                  <button onClick={() => setConfirmAbort(false)}>Nei</button>
                </>
              ) : (
                !finished &&
                !brokeThrough && <button onClick={() => setConfirmAbort(true)}>Gi fra deg styringen</button>
              )}
            </div>
          </header>

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

          <div className="status-banner cr-brief">
            {finished
              ? "Chargen er tappet. Se tapperapporten og gå tilbake til verket."
              : brokeThrough
                ? "Gjennombrenning! Chargen må avbrytes."
                : state.phase === "tapping"
                  ? "Tapper … trykk «Avslutt tapping» i styringen når øsa er full."
                  : `Skrap med ${request.mix.p.toFixed(3)} % P og ${request.mix.tramp.toFixed(2)} % sporelementer. Smelt ned, avfosforer, slagg av og tapp innenfor temperaturvinduet.`}
          </div>
        </div>

        {(finished || brokeThrough) && (
          <div className={`tap-result cr-result ${tap?.ok ? "tap-ok" : "tap-dev"}`}>
            {tap && finished ? (
              <>
                <div className="panel-title">Tapperapport</div>
                <div className="tap-figures">
                  <span>
                    {tap.tap_temp_c.toFixed(0)} °C (mål {tap.target_temp_c.toFixed(0)})
                  </span>
                  <span>C {tap.carbon_pct.toFixed(3)} %</span>
                  <span>P {tap.phosphorus_pct.toFixed(4)} %</span>
                  <span>{state.energy_per_tonne_kwh.toFixed(0)} kWh/t</span>
                  <span>{(sim.state.timeS / 60).toFixed(0)} min</span>
                </div>
                {tap.ok ? (
                  <div className="tap-verdict">Innenfor krav – godt kjørt!</div>
                ) : (
                  <ul className="tap-deviations">
                    {tap.deviations.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="panel-title">Gjennombrenning – foringen må repareres</div>
            )}
            <button className="btn-primary" onClick={finish}>
              Tilbake til verket
            </button>
          </div>
        )}

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
          <Readout label="Energi" value={state.energy_per_tonne_kwh.toFixed(0)} unit="kWh/t" />
          <Readout
            label="Ildfast brukt"
            value={(state.refractory_wear * 100).toFixed(1)}
            unit="%"
            status={state.refractory_wear > 0.9 ? "critical" : state.refractory_wear > 0.7 ? "warning" : "normal"}
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
          </div>
          <div className={`main-col ${section("styring")}`}>
            <ControlPanel state={state} sendCommand={send} hideChargeStart />
          </div>
          <div className="main-col">
            <div className={section("kjemi")}>
              <SlagPanel state={state} />
            </div>
            <div className={section("alarmer")}>
              <AlarmPanel alarms={state.alarms} onAck={(id) => send("ack_alarm", { id })} />
            </div>
          </div>
        </main>

        <nav className="mobile-nav" aria-label="Seksjoner i kontrollrommet">
          {MOBILE_NAV.map((item) => (
            <button
              key={item.id}
              className={mobileView === item.id ? "is-active" : ""}
              aria-current={mobileView === item.id ? "page" : undefined}
              onClick={() => setMobileView(item.id)}
            >
              {item.label}
              {item.id === "alarmer" && activeAlarms > 0 && <span className="mobile-nav-badge">{activeAlarms}</span>}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
