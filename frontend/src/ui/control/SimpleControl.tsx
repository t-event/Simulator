/**
 * Enkel styring av kontrollrommet (standard).
 *
 * Laget for folk uten forkunnskaper: fire steg, én forklaring, én måling med
 * grønt felt og én hovedhandling per steg. Automatikken tar resten. Under
 * ligger den samme prosessmodellen som i ekspertmodus, så valgene gir ekte
 * konsekvenser for temperatur, karbon, fosfor, strøm og foring.
 */
import { useEffect, useState, type ReactNode } from "react";
import type { ManualResult } from "../../game/engine";
import { GRADES } from "../../game/data";
import type { ManualRequest } from "../../game/types";
import type { EAFSimulation } from "../../sim/eaf";
import { buzz } from "../haptics";
import {
  fmt,
  LADLE_BAND,
  MELT_BAND,
  SimpleRunner,
  SLAG_DONE_KG,
  SLAG_SPILL_KG,
  STEPS,
  TAP_TEMP_OK_C,
} from "./simpleRunner";
import "./control.css";

const TICK_MS = 100;

interface Props {
  sim: EAFSimulation;
  startWear: number;
  request: ManualRequest;
  onDone: (result: ManualResult | null) => void;
  onExpert: () => void;
}

// ------------------------------------------------------------------ //
// Visning
// ------------------------------------------------------------------ //
function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="sc-stars" aria-label={`${n} av ${of} stjerner`}>
      {"★".repeat(n)}
      <span className="off">{"★".repeat(of - n)}</span>
    </span>
  );
}

interface GaugeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  zone: [number, number];
  digits: number;
  unit: string;
}

function ZoneGauge({ label, value, min, max, zone, digits, unit }: GaugeProps) {
  const pos = (v: number) => `${Math.max(0, Math.min(1, (v - min) / (max - min))) * 100}%`;
  const inZone = value >= zone[0] && value <= zone[1];
  const side = value < zone[0] ? "lav" : value > zone[1] ? "hoy" : "ok";
  return (
    <div className="sc-gauge">
      <div className="sc-gauge-head">
        <span>{label}</span>
        <strong className={inZone ? "is-ok" : "is-off"}>
          {fmt(value, digits)} {unit}
        </strong>
      </div>
      <div className="sc-gauge-track" data-side={side}>
        <div
          className="sc-gauge-zone"
          style={{ left: pos(zone[0]), width: `calc(${pos(zone[1])} - ${pos(zone[0])})` }}
        />
        <div className="sc-gauge-marker" style={{ left: pos(value) }} />
      </div>
      <div className="sc-gauge-scale">
        <span>
          Grønt: {fmt(zone[0], digits)}–{fmt(zone[1], digits)} {unit}
        </span>
      </div>
    </div>
  );
}

/** Ovnen sett fra siden: glød etter temperatur, slagglag, lysbue og oksygenlanse. */
function Furnace({ sim, blowing }: { sim: EAFSimulation; blowing: boolean }) {
  const s = sim.state;
  const heat = Math.max(0, Math.min(1, (s.bathTempC - 1500) / 250));
  const bath = `hsl(${30 - heat * 20}, 100%, ${45 + heat * 20}%)`;
  const slag = Math.min(14, (sim.slagMassKg / 8000) * 14);
  const scrapLeft = s.solidScrapKg / 20000;
  return (
    <svg className="sc-furnace" viewBox="0 0 220 130" aria-hidden="true">
      <g transform={`rotate(${s.tiltDeg} 110 90)`}>
        <path d="M40 60 L180 60 L170 118 Q110 128 50 118 Z" fill="#4a3b30" stroke="#7a6350" strokeWidth={2} />
        <path d="M50 96 L170 96 L166 114 Q110 123 54 114 Z" fill={bath} className={s.powerOn ? "sc-bath-live" : ""} />
        {slag > 0.5 && <rect x={49} y={96 - slag} width={122} height={slag} fill="#8a8f55" opacity={0.85} />}
        {scrapLeft > 0.02 && (
          <path
            d={`M60 ${96 - slag} L80 ${96 - slag - 18 * Math.min(1, scrapLeft)} L100 ${96 - slag} Z`}
            fill="#6b5b4b"
          />
        )}
        {[85, 110, 135].map((x) => (
          <g key={x}>
            <rect x={x - 4} y={14} width={8} height={62} fill="#2b2b2b" />
            {s.powerOn && (
              <path
                className="sc-arc"
                d={`M${x} 76 L${x - 3} 84 L${x + 2} 88 L${x} ${94 - slag}`}
                stroke="#fff5b0"
                strokeWidth={2}
                fill="none"
              />
            )}
          </g>
        ))}
        {blowing && (
          <line className="sc-lance" x1={180} y1={40} x2={140} y2={92 - slag} stroke="#9ad7ff" strokeWidth={3} />
        )}
      </g>
      {s.conveyorRunning && (
        <g>
          <rect x={0} y={52} width={42} height={4} fill="#555" />
          <rect className="sc-belt" x={0} y={46} width={40} height={6} fill="#6b5b4b" />
        </g>
      )}
    </svg>
  );
}

export function SimpleControl({ sim, startWear, request, onDone, onExpert }: Props) {
  const [runner] = useState(() => new SimpleRunner(sim, startWear));
  const [, setVersion] = useState(0);
  const [confirm, setConfirm] = useState<"avbryt" | "ekspert" | null>(null);
  const redraw = () => setVersion((v) => v + 1);

  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min((now - last) / 1000, 0.5);
      last = now;
      const event = runner.tick(elapsed);
      if (event === "steg") buzz(30);
      else if (event === "ferdig") buzz([30, 30, 30]);
      else if (event === "gjennombrenning") buzz([60, 40, 60]);
      else if (event === "søl") buzz([80, 40, 80]);
      setVersion((v) => v + 1);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [runner]);

  const step = runner.step;
  const score = runner.score;
  const s = sim.state;
  const grade = s.grade!;
  const target = sim.tapTargetTempC;
  const melted = runner.melted;
  const stepIndex = STEPS.findIndex((x) => x.id === (step === "tapper" ? "tapp" : step));
  const pMax = grade.phosphorusMaxPct;

  const setLevel = (d: number) => {
    runner.changeLevel(d);
    buzz(10);
    redraw();
  };

  // Strøm og oksygen styres samtidig (B-076)
  const controls = (
    <div className="sc-controls">
      <div className="sc-power">
        <button
          className="sc-step-btn"
          onClick={() => setLevel(-1)}
          disabled={runner.level <= 1}
          aria-label="Mindre strøm"
        >
          ▼ Mindre
        </button>
        <div className="sc-level" aria-label={`Strøm nivå ${runner.level} av 5`}>
          <span>Strøm</span>
          <div>
            {[1, 2, 3, 4, 5].map((l) => (
              <i key={l} className={l <= runner.level ? "on" : ""} />
            ))}
          </div>
        </div>
        <button className="sc-step-btn" onClick={() => setLevel(1)} disabled={runner.level >= 5} aria-label="Mer strøm">
          ▲ Mer
        </button>
      </div>
      <button
        className={`sc-o2${runner.blowing ? " is-on" : ""}`}
        aria-pressed={runner.blowing}
        onClick={() => {
          runner.setOxygen(!runner.blowing);
          buzz(15);
          redraw();
        }}
      >
        Oksygen: {runner.blowing ? "PÅ" : "av"}
      </button>
    </div>
  );

  let body: ReactNode = null;
  switch (step) {
    case "intro":
      body = (
        <div className="sc-intro">
          <p>
            Du skal kjøre én charge – {request.sizeT} tonn {GRADES[request.grade].name.toLowerCase()} – fra skrap til
            flytende stål. Det tar et par minutter. Automatikken tar resten; du styrer det viktigste:
          </p>
          <ol className="sc-plan">
            <li>
              <strong>Smelt</strong> – hold temperaturen i det grønne feltet med strømmen. Slå på oksygen når halve
              skrapet er smeltet.
            </li>
            <li>
              <strong>Rens</strong> – blås oksygen til karbonet er i det grønne feltet, mens strømmen holder varmen.
            </li>
            <li>
              <strong>Slagg av</strong> – tipp ovnen mot slaggdøra, og rett den opp før stålet renner ut.
            </li>
            <li>
              <strong>Tapp</strong> – tapp når temperaturen er riktig, og rett opp ovnen når øsa er full.
            </li>
          </ol>
          <button
            className="sc-main"
            onClick={() => {
              runner.start();
              buzz(20);
              redraw();
            }}
          >
            Start chargen
          </button>
        </div>
      );
      break;
    case "smelt":
      body = (
        <>
          <p className="sc-instruction">Skrapet mates inn og smelter. Hold temperaturen i det grønne feltet.</p>
          <ZoneGauge
            label="Temperatur i badet"
            value={s.bathTempC}
            min={1480}
            max={1720}
            zone={MELT_BAND}
            digits={0}
            unit="°C"
          />
          <div className="sc-progress">
            <span>Smeltet</span>
            <div className="sc-progress-track">
              <div style={{ width: `${melted * 100}%` }} />
            </div>
            <span>{Math.round(melted * 100)} %</span>
          </div>
          {runner.message && <p className="sc-message">{runner.message}</p>}
          {controls}
          <p className="sc-hint">
            {s.bathTempC < MELT_BAND[0]
              ? runner.level >= 5
                ? "Full strøm er på. Badet varmes opp igjen når matingen roer seg."
                : "For kaldt – skrapet smelter sakte. Gi mer strøm."
              : s.bathTempC > MELT_BAND[1]
                ? runner.level <= 1
                  ? "Strømmen er på det laveste. Slå av oksygenet, eller vent på tyngre skrap."
                  : "For varmt – det sliter på foringen og koster strøm. Gi mindre strøm."
                : melted > 0.5 && !runner.blowing
                  ? "Fint! Slå på oksygen nå – det gir ekstra varme og skummende slagg som skjermer lysbuen."
                  : "Fint! Følg med når skrapmatingen endrer seg."}
          </p>
        </>
      );
      break;
    case "rens": {
      const cMax = Math.max(0.3, grade.tapCarbonMaxPct * 2.5);
      const cOk = s.carbonPct >= grade.tapCarbonMinPct && s.carbonPct <= grade.tapCarbonMaxPct;
      body = (
        <>
          <p className="sc-instruction">
            Oksygen brenner bort karbon mens strømmen holder varmen. Blås til karbonet er i det grønne feltet – ikke for
            lenge – og hold badet under tappetemperaturen.
          </p>
          <ZoneGauge
            label="Karbon i stålet"
            value={s.carbonPct}
            min={0}
            max={cMax}
            zone={[grade.tapCarbonMinPct, grade.tapCarbonMaxPct]}
            digits={3}
            unit="%"
          />
          <ZoneGauge
            label="Temperatur i badet"
            value={s.bathTempC}
            min={1480}
            max={target + 60}
            zone={[MELT_BAND[0], target - 15]}
            digits={0}
            unit="°C"
          />
          {controls}
          <p className="sc-hint">
            {s.carbonPct > grade.tapCarbonMaxPct
              ? runner.blowing
                ? "Karbonet går ned …"
                : "Karbonet er for høyt – slå på oksygenet."
              : s.carbonPct < grade.tapCarbonMinPct
                ? "Nå er karbonet for lavt – oksygenet brenner jern i stedet. Slå av oksygenet!"
                : "Karbonet er i det grønne feltet. Slå av oksygenet og gå videre."}
            {s.bathTempC > target - 15 && " Badet er varmt – gi mindre strøm."}
          </p>
          <button
            className={`sc-main${cOk ? "" : " is-quiet"}`}
            onClick={() => {
              runner.finishRefining();
              buzz(20);
              redraw();
            }}
          >
            {cOk ? "Ferdig – videre" : "Videre likevel"}
          </button>
        </>
      );
      break;
    }
    case "slagg": {
      const pagar = runner.deslag === "pagar";
      const spilling = pagar && sim.slagMassKg < SLAG_SPILL_KG;
      body = (
        <>
          <p className="sc-instruction">
            Fosforet ligger nå i slagget oppå stålet. Tipp ovnen mot slaggdøra, og rett den opp når slagget nesten er
            ute – tipper du for lenge, renner stålet etter.
          </p>
          <ZoneGauge
            label="Slagg i ovnen"
            value={sim.slagMassKg / 1000}
            min={0}
            max={Math.max(8, sim.slagMassKg / 1000)}
            zone={[SLAG_SPILL_KG / 1000, SLAG_DONE_KG / 1000]}
            digits={1}
            unit="t"
          />
          <ZoneGauge
            label="Fosfor i stålet"
            value={s.phosphorusPct}
            min={0}
            max={Math.max(0.06, pMax * 1.5)}
            zone={[0, pMax]}
            digits={3}
            unit="%"
          />
          {runner.steelSpilledKg > 0 && (
            <p className={`sc-message${spilling ? " is-alarm" : ""}`}>
              {spilling ? "Stål renner ut slaggdøra! Rett opp ovnen nå!" : "Stål rant ut slaggdøra."} Tapt:{" "}
              {fmt(runner.steelSpilledKg / 1000, 1)} t
            </p>
          )}
          <button
            className={`sc-main${pagar && sim.slagMassKg < SLAG_DONE_KG ? " is-ready" : ""}`}
            onClick={() => {
              if (pagar) runner.stopDeslag();
              else runner.startDeslag();
              buzz(20);
              redraw();
            }}
          >
            {pagar ? "Rett opp ovnen" : "Tipp mot slaggdøra"}
          </button>
          <p className="sc-hint">
            {!pagar
              ? "Slagget renner ut mens ovnen er tippet."
              : sim.slagMassKg > SLAG_DONE_KG
                ? "Slagget renner ut …"
                : spilling
                  ? "Rett opp!"
                  : "Nå er det lite slagg igjen – rett opp ovnen."}
          </p>
          {!pagar && (
            <button
              className="sc-link"
              onClick={() => {
                runner.skipDeslag();
                redraw();
              }}
            >
              Hopp over
            </button>
          )}
        </>
      );
      break;
    }
    case "tapp": {
      const zone: [number, number] = [target - TAP_TEMP_OK_C, target + TAP_TEMP_OK_C];
      const hot = s.bathTempC > zone[1];
      body = (
        <>
          <p className="sc-instruction">
            Varm opp stålet med strømmen, og tapp når temperaturen er i det grønne feltet.
          </p>
          <ZoneGauge
            label="Temperatur i badet"
            value={s.bathTempC}
            min={target - 120}
            max={target + 60}
            zone={zone}
            digits={0}
            unit="°C"
          />
          {controls}
          <p className="sc-hint">
            {s.bathTempC < zone[0]
              ? `Varmer … ${Math.round(zone[0] - s.bathTempC)} °C igjen.${runner.level < 3 ? " Gi mer strøm." : ""}`
              : hot
                ? "For varmt! Tapp med en gang."
                : "Nå! Tapp!"}
          </p>
          <button
            className={`sc-main sc-tap${s.bathTempC >= zone[0] ? " is-ready" : ""}`}
            onClick={() => {
              if (runner.tap()) buzz([20, 30, 20]);
              redraw();
            }}
          >
            Tapp nå!
          </button>
        </>
      );
      break;
    }
    case "tapper": {
      const fill = runner.ladleFill;
      const over = fill > 1;
      body = (
        <>
          <p className="sc-instruction">
            Stålet renner ned i øsa. Rett opp ovnen når øsa er full – ellers renner den over. Litt stål blir igjen i
            ovnen som sump til neste charge.
          </p>
          <ZoneGauge
            label="Øsa"
            value={fill * 100}
            min={0}
            max={110}
            zone={[LADLE_BAND[0] * 100, LADLE_BAND[1] * 100]}
            digits={0}
            unit="%"
          />
          {over && <p className="sc-message is-alarm">Øsa renner over! Rett opp ovnen!</p>}
          <button
            className={`sc-main${fill >= LADLE_BAND[0] ? " is-ready" : ""}`}
            onClick={() => {
              runner.stopTap();
              buzz([20, 30, 20]);
              redraw();
            }}
          >
            Rett opp ovnen
          </button>
          <p className="sc-hint">{fill < LADLE_BAND[0] ? "Fyller …" : over ? "For sent!" : "Full – rett opp nå!"}</p>
        </>
      );
      break;
    }
    case "ferdig":
      body = score && (
        <div className="sc-result">
          <div className="sc-rating">
            <Stars n={score.rating} of={5} />
            <h2>{score.headline}</h2>
          </div>
          <ul>
            {score.steps.map((x) => (
              <li key={x.title}>
                <div className="sc-result-head">
                  <strong>{x.title}</strong>
                  <Stars n={x.stars} />
                </div>
                <p>{x.text}</p>
              </li>
            ))}
          </ul>
          <p className="sc-hint">
            Strøm: {Math.round(score.result.kwhPerT)} kWh per tonn · Tid: {Math.round(score.result.minutes)} minutter i
            ovnen
          </p>
          <button className="sc-main" onClick={() => onDone(score.result)}>
            Tilbake til verket
          </button>
        </div>
      );
      break;
  }

  return (
    <div className="control-room sc" role="dialog" aria-modal="true" aria-label="Kontrollrommet">
      <header className="sc-head">
        <h1>Kontrollrommet</h1>
        {step !== "ferdig" && (
          <button className="sc-close" onClick={() => setConfirm("avbryt")} aria-label="Gi fra deg styringen">
            ✕
          </button>
        )}
      </header>
      {step !== "intro" && step !== "ferdig" && (
        <ol className="sc-steps" aria-label="Steg">
          {STEPS.map((x, i) => (
            <li key={x.id} className={i < stepIndex ? "done" : i === stepIndex ? "now" : ""}>
              <span>{i < stepIndex ? "✓" : i + 1}</span>
              {x.title}
            </li>
          ))}
        </ol>
      )}
      <Furnace sim={sim} blowing={runner.blowing} />
      <main className="sc-body">{body}</main>
      {step !== "ferdig" && (
        <button className="sc-link sc-expert" onClick={() => setConfirm("ekspert")}>
          Fullt kontrollrom (for viderekomne)
        </button>
      )}

      {confirm && (
        <div className="g-modal" role="alertdialog" aria-modal="true">
          <div className="g-modal-card">
            <p>
              {confirm === "avbryt"
                ? "Gi fra deg styringen? Automatikken kjører chargen ferdig."
                : "Bytte til fullt kontrollrom? Der styrer du alt selv, og du kan ikke gå tilbake til den enkle styringen for denne chargen."}
            </p>
            <div className="g-row">
              <button
                className="g-primary"
                onClick={() => {
                  if (confirm === "avbryt") onDone(null);
                  else onExpert();
                }}
              >
                Ja
              </button>
              <button onClick={() => setConfirm(null)}>Nei</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
