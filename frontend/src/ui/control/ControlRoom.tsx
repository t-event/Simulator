/**
 * Kontrollrommet (B-175): spilleren kjører én charge som et kort spill i fire runder – smelt, blås, rak og tapp.
 * Logikken ligger i chargeGame.ts; her tegnes den, og trykk og hold gjøres om til handlinger.
 * Resultatet går tilbake til spillet som en vanlig charge.
 */
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import type { ManualResult } from "../../game/engine";
import { GRADES } from "../../game/data";
import type { ManualRequest } from "../../game/types";
import { fmtNum } from "../format";
import { buzz } from "../haptics";
import { Icon, type IconName } from "../icons";
import {
  BUCKET_WARN_S,
  ChargeGame,
  LADLE_BAND,
  MELT_BAND,
  ROUNDS,
  SLAG_S,
  TAP_OK_C,
  type GameEvent,
  type Score,
} from "./chargeGame";
import "./control.css";

interface Props {
  request: ManualRequest;
  /** Beste poengsum så langt */
  best: number;
  /** again: spilleren vil ta neste charge også */
  onDone: (result: ManualResult | null, chapter?: string, again?: boolean) => void;
}

/** Ikonet for hver runde (B-216: ikoner i stedet for emoji) */
const ROUND_ICON: Record<string, IconName> = { smelt: "flame", rens: "wind", slagg: "rake", tapp: "droplet" };

const fmt = (v: number, d: number) => v.toFixed(d).replace(".", ",");

function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="cg-stars" aria-label={`${n} av ${of} stjerner`}>
      {"★".repeat(n)}
      <span className="off">{"★".repeat(of - n)}</span>
    </span>
  );
}

/** Måler med grønt felt. Symbolet i tillegg til fargen er for fargeblinde og sterkt sollys (B-087). */
function Gauge(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  zone: [number, number];
  digits: number;
  unit: string;
  danger?: boolean;
}) {
  const { label, value, min, max, zone, digits, unit } = props;
  const pos = (v: number) => `${Math.max(0, Math.min(1, (v - min) / (max - min))) * 100}%`;
  const ok = value >= zone[0] && value <= zone[1];
  const side = value < zone[0] ? "lav" : value > zone[1] ? "hoy" : "ok";
  return (
    <div className={`cg-gauge${props.danger ? " is-danger" : ""}`}>
      <div className="cg-gauge-head">
        <span>{label}</span>
        <strong className={ok ? "is-ok" : "is-off"}>
          <span aria-label={ok ? "i det grønne" : side === "lav" ? "for lavt" : "for høyt"}>
            {ok ? "✓" : side === "lav" ? "▼" : "▲"}
          </span>{" "}
          {fmt(value, digits)} {unit}
        </strong>
      </div>
      <div className="cg-gauge-track">
        <div
          className="cg-gauge-zone"
          style={{ left: pos(zone[0]), width: `calc(${pos(zone[1])} - ${pos(zone[0])})` }}
        />
        <div className="cg-gauge-marker" style={{ left: pos(value) }} />
      </div>
    </div>
  );
}

/** Ovnen sett fra siden: glød etter temperatur, lysbue, oksygenlanse, skum og skrapkurv på vei inn */
function Furnace({ game }: { game: ChargeGame }) {
  const r = game.roundId;
  const temp = r === "tapp" ? game.tapTemp - 60 : r === "smelt" ? game.temp : 1600;
  const heat = Math.max(0, Math.min(1, (temp - 1480) / 240));
  const bath = `hsl(${32 - heat * 22}, 100%, ${40 + heat * 25}%)`;
  const arcs = (r === "smelt" && game.holding) || (r === "tapp" && game.tapStage === "varm");
  const lance = (r === "smelt" && game.oxygen) || (r === "rens" && game.holding);
  const foam = r === "rens" ? game.foam : r === "smelt" ? 0.1 : 0.05;
  const foamTop = 104 - foam * 44;
  const scrap = r === "smelt" ? 1 - game.melted : 0;
  const boil = r === "rens" && game.lockS > 0;
  const bucket = r === "smelt" ? game.bucket : null;
  const by = bucket ? -20 + (1 - bucket.inS / BUCKET_WARN_S) * 36 : 0;
  return (
    <svg className="cg-furnace" viewBox="0 0 220 132" aria-hidden="true">
      {/* Skall og foring */}
      <path d="M36 56 L184 56 L172 118 Q110 130 48 118 Z" fill="#4a3b30" stroke="#7a6350" strokeWidth={2} />
      <path d="M47 104 L173 104 L168 116 Q110 126 52 116 Z" fill={bath} className={arcs ? "cg-bath-live" : undefined} />
      {foam > 0.02 && (
        <path
          d={`M${47 - foam * 4} ${foamTop} L${173 + foam * 4} ${foamTop} L173 104 L47 104 Z`}
          className={`cg-foam${foam > 0.85 ? " is-high" : ""}`}
        />
      )}
      {r === "rens" && game.holding && (
        <g className="cg-bubbles">
          {[70, 95, 120, 150].map((x, i) => (
            <circle key={x} cx={x} cy={foamTop + 8} r={2.5 + (i % 2)} style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </g>
      )}
      {boil && (
        <g className="cg-boil">
          <path d="M36 58 Q30 76 34 96 L40 96 Q36 76 42 58 Z" />
          <path d="M184 58 Q190 76 186 96 L180 96 Q184 76 178 58 Z" />
        </g>
      )}
      {scrap > 0.02 && (
        <path
          d={`M58 ${foamTop} L${80 + scrap * 10} ${foamTop - 26 * scrap} L${104 + scrap * 16} ${foamTop} Z`}
          fill="#6b5b4b"
          stroke="#8b7964"
        />
      )}
      {[88, 110, 132].map((x) => (
        <g key={x}>
          <rect x={x - 4} y={8} width={8} height={62} fill="#2b2b2b" />
          {arcs && (
            <path
              className="cg-arc"
              d={`M${x} 70 L${x - 3} 78 L${x + 2} 84 L${x} ${foamTop}`}
              stroke="#fff5b0"
              strokeWidth={2.2}
              fill="none"
            />
          )}
        </g>
      ))}
      {lance && (
        <line className="cg-lance" x1={196} y1={30} x2={150} y2={foamTop + 4} stroke="#9ad7ff" strokeWidth={3} />
      )}
      {bucket && (
        <g transform={`translate(24 ${by})`}>
          <path d="M0 0 L30 0 L26 18 L4 18 Z" fill={bucket.kind === "tung" ? "#5b6b7d" : "#b5895a"} stroke="#ddd" />
          <text x={15} y={13} textAnchor="middle" className="cg-bucket-label">
            {bucket.kind === "tung" ? "TUNG" : "LETT"}
          </text>
        </g>
      )}
    </svg>
  );
}

/** Øsa som fylles, med streken der den er full */
function Ladle({ game }: { game: ChargeGame }) {
  const fill = Math.min(1.08, game.fill);
  const top = 40;
  const bottom = 124;
  const level = bottom - (bottom - top) * Math.min(1, fill);
  const line = (f: number) => bottom - (bottom - top) * f;
  const over = game.fill > 1;
  return (
    <svg className="cg-furnace" viewBox="0 0 220 132" aria-hidden="true">
      <g transform="rotate(18 60 40)">
        <path d="M10 12 L110 12 L102 58 Q60 66 18 58 Z" fill="#4a3b30" stroke="#7a6350" strokeWidth={2} />
      </g>
      {game.flow > 0.04 && (
        <path
          className="cg-stream"
          d={`M104 46 Q116 60 ${120 + game.flow * 2} ${level}`}
          stroke="#ffb347"
          strokeWidth={2 + game.flow * 6}
          fill="none"
        />
      )}
      <path
        d={`M84 ${top} L176 ${top} L168 ${bottom} L92 ${bottom} Z`}
        fill="#2f2a26"
        stroke="#8b7964"
        strokeWidth={3}
      />
      <clipPath id="cg-ladle-clip">
        <path d={`M86 ${top} L174 ${top} L166 ${bottom - 2} L94 ${bottom - 2} Z`} />
      </clipPath>
      <rect
        x={80}
        y={level}
        width={100}
        height={bottom - level}
        fill={over ? "#ff5a36" : "#ff9a2e"}
        clipPath="url(#cg-ladle-clip)"
      />
      <line x1={80} x2={180} y1={line(LADLE_BAND[0])} y2={line(LADLE_BAND[0])} className="cg-ladle-mark" />
      <line x1={80} x2={180} y1={line(1)} y2={line(1)} className="cg-ladle-full" />
      {over && <path d="M176 40 Q186 70 184 124 L190 124 Q192 70 180 40 Z" fill="#ff5a36" />}
    </svg>
  );
}

/**
 * En runde i spill (B-216): bildet (ovnen, badet eller øsa) og måler, råd og knapper. Mobil: under hverandre, med
 * knappen nederst der tommelen er. PC: bildet til venstre og det man styrer med til høyre.
 */
function Play({ stage, children }: { stage: ReactNode; children: ReactNode }) {
  return (
    <div className="cg-play">
      <div className="cg-stage">{stage}</div>
      <div className="cg-panel">{children}</div>
    </div>
  );
}

export function ControlRoom({ request, best, onDone }: Props) {
  const [game] = useState(() => new ChargeGame(request));
  const [, setFrame] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [pop, setPop] = useState<{ text: string; kind: "good" | "bad"; key: number } | null>(null);
  const popKey = useRef(0);
  const redraw = () => setFrame((f) => f + 1);
  const flash = (text: string, kind: "good" | "bad") => setPop({ text, kind, key: ++popKey.current });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const onEvent = (e: GameEvent) => {
      if (e === "kurv") buzz(20);
      else if (e === "kok") {
        buzz([60, 30, 60]);
        flash("Kokte over! −100", "bad");
      } else if (e === "over") {
        buzz([80, 40, 80]);
        flash("Øsa renner over!", "bad");
      } else if (e === "runde" || e === "ferdig") buzz([20, 30, 20]);
    };
    const loop = (now: number) => {
      // Maks 50 ms per bilde, så spillet ikke hopper når fanen har ligget i bakgrunnen
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const e = game.tick(dt);
      if (e) onEvent(e);
      setFrame((f) => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  // Langt trykk på mobil skal ikke markere tekst eller vise «Kopier» (B-219). CSS alene holder ikke i Safari på iPhone:
  // touchstart må stoppes med en vanlig lytter (ikke passiv). Knappene styres av pekerhendelsene, som kommer likevel.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onTouch = (e: TouchEvent) => {
      if ((e.target as Element | null)?.closest?.(".cg-hold, .cg-lump")) e.preventDefault();
    };
    const stop = (e: Event) => e.preventDefault();
    root.addEventListener("touchstart", onTouch, { passive: false });
    root.addEventListener("selectstart", stop);
    root.addEventListener("contextmenu", stop);
    return () => {
      root.removeEventListener("touchstart", onTouch);
      root.removeEventListener("selectstart", stop);
      root.removeEventListener("contextmenu", stop);
    };
  }, []);

  // Mellomrom holder inne på tastatur
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      game.hold(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") game.hold(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [game]);

  const holdProps = {
    onPointerDown: (e: RPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      window.getSelection()?.removeAllRanges();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Noen nettlesere kan ikke fange pekeren; slipp virker likevel
      }
      game.hold(true);
      buzz(8);
    },
    onPointerUp: () => game.hold(false),
    onPointerCancel: () => game.hold(false),
    onLostPointerCapture: () => game.hold(false),
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  };

  const round = ROUNDS[Math.min(game.round, ROUNDS.length - 1)];
  const phase = game.phase;
  let body: ReactNode = null;

  if (phase === "klar") {
    body = (
      <div className="cg-card">
        <div className="cg-card-icon" aria-hidden="true">
          <Icon name={ROUND_ICON[round.id]} />
        </div>
        <p className="cg-muted">
          Runde {game.round + 1} av {ROUNDS.length}
          {game.round === 0 && ` · ${request.sizeT} t ${GRADES[request.grade].name.toLowerCase()}`}
        </p>
        <h2>{round.title}</h2>
        <p>{round.what}</p>
        <p className="cg-how">{round.how}</p>
        {game.round === 0 && (
          <p className="cg-muted">
            Fire korte runder, under ett minutt til sammen. Treff det grønne for stjerner, poeng og kombo.
          </p>
        )}
        <button
          className="cg-main is-ready"
          onClick={() => {
            game.start();
            buzz(20);
            redraw();
          }}
        >
          {game.round === 0 ? "Start" : "Neste runde"}
        </button>
      </div>
    );
  } else if (phase === "spill") {
    switch (game.roundId) {
      case "smelt": {
        const t = game.temp;
        const b = game.bucket;
        body = (
          <Play stage={<Furnace game={game} />}>
            <Gauge label="Temperatur i badet" value={t} min={1480} max={1700} zone={MELT_BAND} digits={0} unit="°C" />
            <div className="cg-progress">
              <span>Smeltet</span>
              <div className="cg-progress-track">
                <div style={{ width: `${game.melted * 100}%` }} />
              </div>
              <span>{Math.round(game.melted * 100)} %</span>
            </div>
            <p className={`cg-hint${b ? " is-warn" : ""}`}>
              {b && <Icon name="warning" />}
              {b
                ? b.kind === "tung"
                  ? "Tung kurv på vei – den kjøler badet. Hold inne i forkant!"
                  : "Lett kurv på vei – den varmer badet. Slipp i forkant!"
                : t < MELT_BAND[0]
                  ? "For kaldt – hold inne for strøm."
                  : t > MELT_BAND[1]
                    ? "For varmt – slipp!"
                    : game.oxygen
                      ? "Oksygenet er på og gir ekstra varme – slipp litt tidligere."
                      : "I det grønne – hold det der."}
            </p>
            <button className={`cg-hold${game.holding ? " is-down" : ""}`} {...holdProps}>
              <Icon name="power" /> Hold for strøm
            </button>
          </Play>
        );
        break;
      }
      case "rens": {
        const [lo, hi] = game.window;
        const inC = game.carbon >= lo && game.carbon <= hi;
        const locked = game.lockS > 0;
        body = (
          <Play stage={<Furnace game={game} />}>
            <Gauge label="Karbon i stålet" value={game.carbon} min={0} max={0.35} zone={[lo, hi]} digits={3} unit="%" />
            <Gauge
              label="Skum"
              value={game.foam * 100}
              min={0}
              max={100}
              zone={[0, 85]}
              digits={0}
              unit="%"
              danger={game.foam > 0.85}
            />
            <p className={`cg-hint${game.foam > 0.8 || locked ? " is-warn" : ""}`}>
              {locked
                ? "Slaggen kokte over! Vent litt, så trykk igjen."
                : game.foam > 0.8
                  ? "Skummet er ved kanten – slipp!"
                  : game.carbon > hi
                    ? "Hold inne for oksygen – karbonet brennes bort."
                    : inC
                      ? "Karbonet er i det grønne – trykk «Ferdig»!"
                      : "For lite karbon – oksygenet brenner jern nå. Trykk «Ferdig»."}
            </p>
            <div className="cg-row">
              <button
                className={`cg-hold${game.holding ? " is-down" : ""}${locked ? " is-locked" : ""}`}
                {...holdProps}
              >
                <Icon name="wind" /> Hold for oksygen
              </button>
              <button
                className={`cg-main cg-side${inC ? " is-ready" : " is-quiet"}`}
                onClick={() => {
                  game.finishRefining();
                  buzz(20);
                  redraw();
                }}
              >
                Ferdig <Icon name="check" />
              </button>
            </div>
          </Play>
        );
        break;
      }
      case "slagg": {
        const left = Math.max(0, SLAG_S - game.t);
        body = (
          <Play
            stage={
              <div className="cg-bath" role="group" aria-label="Badet sett ovenfra">
                {game.targets
                  .filter((o) => o.state === "oppe")
                  .map((o) => {
                    const age = (game.t - o.born) / o.life;
                    return (
                      <button
                        key={o.id}
                        className={`cg-lump is-${o.kind}${age > 0.7 ? " is-sinking" : ""}`}
                        style={{ left: `${o.x * 100}%`, top: `${o.y * 100}%` }}
                        aria-label={o.kind === "slagg" ? "Slaggklump" : "Blankt stål"}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          const hit = game.rake(o.id);
                          if (hit === "slagg") {
                            buzz(12);
                            flash(`+${40 * game.mult}`, "good");
                          } else if (hit === "stal") {
                            buzz([60, 30, 60]);
                            flash("Det var stål!", "bad");
                          }
                          redraw();
                        }}
                      >
                        {o.kind === "slagg" ? "P" : "✦"}
                      </button>
                    );
                  })}
              </div>
            }
          >
            <div className="cg-progress">
              <span>Tid</span>
              <div className="cg-progress-track is-time">
                <div style={{ width: `${(left / SLAG_S) * 100}%` }} />
              </div>
              <span>{Math.ceil(left)} s</span>
            </div>
            <p className="cg-hint">
              Raket ut {game.raked} slaggklumper{game.steelRaked > 0 ? ` · ${game.steelRaked} stål tapt` : ""}. Trykk på
              de grå (P) – ikke det blanke stålet!
            </p>
          </Play>
        );
        break;
      }
      case "tapp": {
        if (game.tapStage === "varm") {
          const zone: [number, number] = [game.tapTarget - TAP_OK_C, game.tapTarget + TAP_OK_C];
          const inZone = game.tapTemp >= zone[0] && game.tapTemp <= zone[1];
          body = (
            <Play stage={<Furnace game={game} />}>
              <Gauge
                label="Temperatur i badet"
                value={game.tapTemp}
                min={game.tapTarget - 100}
                max={game.tapTarget + 45}
                zone={zone}
                digits={0}
                unit="°C"
              />
              <p className={`cg-hint${inZone ? " is-go" : ""}`}>
                {inZone
                  ? "NÅ!"
                  : game.tapTemp < zone[0]
                    ? "Stålet varmes opp – fortere og fortere. Trykk når det er i det grønne."
                    : "For varmt – tapp med en gang!"}
              </p>
              <button
                className={`cg-main cg-big${inZone ? " is-ready" : ""}`}
                onClick={() => {
                  game.tap();
                  buzz([20, 30, 20]);
                  const d = Math.round(Math.abs(game.tapDev ?? 99));
                  flash(d <= TAP_OK_C ? "Perfekt!" : `${d} °C bom`, d <= TAP_OK_C ? "good" : "bad");
                  redraw();
                }}
              >
                Tapp!
              </button>
            </Play>
          );
        } else {
          const f = game.fill;
          body = (
            <Play stage={<Ladle game={game} />}>
              <div className="cg-progress">
                <span>Øsa</span>
                <div className="cg-progress-track is-ladle">
                  <i style={{ left: `${LADLE_BAND[0] * 100 * 0.9}%` }} />
                  <div style={{ width: `${Math.min(110, f * 100) * 0.9}%` }} className={f > 1 ? "is-over" : ""} />
                </div>
                <span>{Math.round(f * 100)} %</span>
              </div>
              <p className={`cg-hint${f > 1 ? " is-warn" : f >= LADLE_BAND[0] ? " is-go" : ""}`}>
                {f > 1
                  ? "Den renner over!"
                  : f >= LADLE_BAND[0]
                    ? "Full – slipp!"
                    : "Hold inne for å helle. Strålen renner litt etter at du slipper – slipp før streken."}
              </p>
              <div className="cg-row">
                <button className={`cg-hold${game.holding ? " is-down" : ""}`} {...holdProps}>
                  <Icon name="droplet" /> Hold for å helle
                </button>
                {f > 0 && (
                  <button
                    className="cg-main cg-side is-quiet"
                    onClick={() => {
                      game.finishPour();
                      redraw();
                    }}
                  >
                    Rett opp
                  </button>
                )}
              </div>
            </Play>
          );
        }
        break;
      }
    }
  } else if (game.score) {
    body = <Result score={game.score} best={best} onDone={onDone} />;
  }

  return (
    <div ref={rootRef} className="control-room cg" role="dialog" aria-modal="true" aria-label="Kontrollrommet">
      <header className="cg-head">
        <h1>Kontrollrommet</h1>
        {phase !== "ferdig" && (
          <button className="cg-close" onClick={() => setConfirm(true)} aria-label="Gi fra deg styringen">
            <Icon name="close" />
          </button>
        )}
      </header>
      {phase !== "ferdig" && (
        <div className="cg-bar">
          <ol className="cg-rounds" aria-label="Runder">
            {ROUNDS.map((x, i) => (
              <li
                key={x.id}
                className={i < game.round ? "done" : i === game.round ? "now" : ""}
                aria-label={`${x.title}${i < game.round ? " (ferdig)" : ""}`}
              >
                <Icon name={i < game.round ? "check" : ROUND_ICON[x.id]} />
              </li>
            ))}
          </ol>
          <div className="cg-points">
            {game.mult > 1 && phase === "spill" && <span className="cg-combo">×{game.mult}</span>}
            <strong>{fmtNum(Math.round(game.points))}</strong>
            <span className="cg-muted"> poeng</span>
          </div>
        </div>
      )}
      <main className="cg-body">
        {pop && (
          <div key={pop.key} className={`cg-pop is-${pop.kind}`} aria-live="polite">
            {pop.text}
          </div>
        )}
        {body}
      </main>

      {confirm && (
        <div className="g-modal" role="alertdialog" aria-modal="true">
          <div className="g-modal-card">
            <p>Gi fra deg styringen? Automatikken kjører chargen ferdig.</p>
            <div className="g-row">
              <button className="g-primary" onClick={() => onDone(null)}>
                Ja
              </button>
              <button onClick={() => setConfirm(false)}>Nei</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Result({ score, best, onDone }: { score: Score; best: number; onDone: Props["onDone"] }) {
  const record = score.points > best;
  const fp = 1 + score.rating + (score.rating >= 5 ? 15 : score.rating >= 4 ? 8 : 0);
  return (
    <div className="cg-result">
      <div className="cg-rating">
        <Stars n={score.rating} of={5} />
        <h2>{score.headline}</h2>
        <p className="cg-total">
          {fmtNum(score.points)} poeng
          {record ? (
            <span className="cg-record">
              {" "}
              <Icon name="trophy" /> Ny rekord!
            </span>
          ) : (
            <span className="cg-muted"> · rekord {fmtNum(best)}</span>
          )}
        </p>
        <p className="cg-muted">
          +{fp} fagpoeng
          {score.rating >= 4 && ` · kundene betaler ${score.rating >= 5 ? 6 : 3} % ekstra for stålet`}
        </p>
      </div>
      <ul>
        {score.lines.map((x) => (
          <li key={x.title}>
            <div className="cg-result-head">
              <strong>{x.title}</strong>
              <Stars n={x.stars} />
            </div>
            <p>{x.text}</p>
            {x.stars < 3 && (
              <details className="cg-lesson">
                <summary>Hvorfor?</summary>
                <p>{x.lesson}</p>
                <button className="cg-link" onClick={() => onDone(score.result, x.chapter)}>
                  Les mer i fagboka
                </button>
              </details>
            )}
          </li>
        ))}
      </ul>
      <div className="cg-result-actions">
        <button className="cg-main is-ready" onClick={() => onDone(score.result, undefined, true)}>
          Ta neste charge også
        </button>
        <button className="cg-main is-quiet" onClick={() => onDone(score.result)}>
          Tilbake til verket
        </button>
      </div>
    </div>
  );
}
