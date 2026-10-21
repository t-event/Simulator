/**
 * Støpemaskinen og valseverket i kontrollrommet (B-505): samme stil og knapper som chargen (B-175), tre korte runder.
 * Logikken ligger i miniGame.ts; her tegnes den, og trykk og hold gjøres om til handlinger. Det spillet gir i verket
 * (fagpoeng, rekord og en kort fordel), står i game/minis.ts.
 */
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { fmtNum } from "../format";
import { buzz } from "../haptics";
import { Button, Metric } from "../ds";
import { changeDelta } from "../delta";
import { Icon } from "../icons";
import { Gauge, Stars } from "./ControlRoom";
import { MiniGame, newMiniGame, type HoldRound, type MiniId, type MiniScore, type TimingRound } from "./miniGame";
import "./control.css";

interface Props {
  kind: MiniId;
  /** Beste poengsum så langt */
  best: number;
  /** Fagpoeng spilleren får nå (0 når de alt er gitt i dag) */
  fpNow: number;
  /** Spillet er ferdig: kalles én gang med poengene og stjernene */
  onScore: (score: MiniScore) => void;
  /** Lukk (again: spill én gang til) */
  onClose: (again?: boolean) => void;
  /** Lukk og åpne et kapittel i fagboka */
  onChapter: (chapter: string) => void;
}

/** Bildet i en hold-runde: mellomkaret, strengen, ovnen eller kjølingen, med verdien som fyll eller farge */
function HoldStage({ game, r }: { game: MiniGame; r: HoldRound }) {
  const share = Math.max(0, Math.min(1, (game.value - r.min) / (r.max - r.min)));
  const [lo, hi] = game.band;
  const y = (v: number) => 150 - Math.max(0, Math.min(1, (v - r.min) / (r.max - r.min))) * 130;
  const hot = r.id === "ovn" || r.id === "kjol";
  // Glød etter temperatur: mørk rød (kald) til gul (varm)
  const heat = hot ? share : 0.6;
  const steel = `hsl(${12 + heat * 34}, 100%, ${30 + heat * 32}%)`;
  return (
    <svg className="cg-furnace" viewBox="0 0 200 160" role="img" aria-label={r.title}>
      {r.id === "kar" && (
        <>
          {/* Øsa øverst, strålen når den er åpen, og mellomkaret med nivået */}
          <path d="M70 6 h60 l-8 24 h-44 z" fill="var(--art-ladle)" />
          {game.holding && (
            <line className="cg-stream" x1="100" y1="30" x2="100" y2={y(game.value)} stroke={steel} strokeWidth="6" />
          )}
          <path d="M30 20 L40 150 H160 L170 20" fill="none" stroke="var(--art-ladle)" strokeWidth="6" />
          <rect
            x="40"
            y={y(game.value)}
            width="120"
            height={150 - y(game.value)}
            fill={steel}
            className="cg-bath-live"
          />
          <line className="cg-ladle-mark" x1="34" x2="166" y1={y(hi)} y2={y(hi)} />
          <line className="cg-ladle-mark" x1="34" x2="166" y1={y(lo)} y2={y(lo)} />
        </>
      )}
      {r.id === "fart" && (
        <>
          {/* Strengen går ut av kokillen; stripene går fortere med farten */}
          <rect x="70" y="4" width="60" height="30" fill="var(--art-ladle)" rx="4" />
          <rect x="84" y="34" width="32" height="122" fill={steel} />
          <line
            className="cg-stream"
            x1="100"
            y1="34"
            x2="100"
            y2="156"
            stroke="var(--art-ladle)"
            strokeWidth="32"
            strokeOpacity="0.35"
            style={{ animationDuration: `${Math.max(0.12, 0.9 - share * 0.75)}s` }}
          />
          {[50, 80, 110, 140].map((yy) => (
            <circle key={yy} cx="70" cy={yy} r="7" fill="var(--art-ladle)" />
          ))}
          {[50, 80, 110, 140].map((yy) => (
            <circle key={-yy} cx="130" cy={yy} r="7" fill="var(--art-ladle)" />
          ))}
        </>
      )}
      {r.id === "ovn" && (
        <>
          {/* Ovnen med emnene, glødende etter temperaturen */}
          <rect x="16" y="30" width="168" height="100" rx="10" fill="none" stroke="var(--art-ladle)" strokeWidth="6" />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={30 + i * 30} y="70" width="22" height="44" rx="3" fill={steel} className="cg-bath-live" />
          ))}
          {game.holding && (
            <path
              className="cg-arc"
              d="M20 136 q20 -14 40 0 q20 -14 40 0 q20 -14 40 0 q20 -14 40 0"
              stroke={steel}
              fill="none"
              strokeWidth="4"
            />
          )}
        </>
      )}
      {r.id === "kjol" && (
        <>
          {/* Stangen går gjennom kjølingen; vannspray mens man holder */}
          <rect x="6" y="72" width="188" height="16" rx="8" fill={steel} className="cg-bath-live" />
          <rect x="70" y="50" width="60" height="60" rx="6" fill="none" stroke="var(--art-ladle)" strokeWidth="5" />
          {game.holding &&
            [80, 92, 104, 116].map((x) => (
              <line
                key={x}
                className="cg-lance"
                x1={x}
                y1="54"
                x2={x}
                y2="70"
                stroke="var(--art-bubble)"
                strokeWidth="3"
              />
            ))}
        </>
      )}
    </svg>
  );
}

/** Bildet i en tidsrunde: strengen eller stangen som går forbi, med det grønne og merket */
function TimingStage({ game, r }: { game: MiniGame; r: TimingRound }) {
  const p = game.passes[Math.min(game.pass, game.passes.length - 1)];
  const last = game.lastTap && game.t - game.lastTap.at < 0.5 ? game.lastTap : null;
  return (
    <div className="cg-track" role="img" aria-label={`${r.title}: ${game.pass} av ${r.count}`}>
      <div
        className="cg-track-zone"
        style={{ left: `${(p.center - p.width / 2) * 100}%`, width: `${p.width * 100}%` }}
      />
      <div className="cg-track-bar" style={{ width: `${Math.min(1, game.pos) * 100}%` }} />
      <div className="cg-track-marker" style={{ left: `${Math.min(1, game.pos) * 100}%` }} />
      {last && (
        <span className={`cg-track-hit ${last.quality > 0 ? "is-good" : "is-bad"}`}>
          <Icon name={last.quality > 0 ? "check" : "close"} />
        </span>
      )}
    </div>
  );
}

function Play({ stage, children }: { stage: ReactNode; children: ReactNode }) {
  return (
    <div className="cg-play">
      <div className="cg-stage">{stage}</div>
      <div className="cg-panel">{children}</div>
    </div>
  );
}

export function MiniRoom({ kind, best, fpNow, onScore, onClose, onChapter }: Props) {
  const [game] = useState(() => newMiniGame(kind));
  // Resultatet legges inn i spillet én gang, uansett hvilken knapp spilleren trykker på etterpå
  const reported = useRef(false);
  useEffect(() => {
    if (game.score && !reported.current) {
      reported.current = true;
      onScore(game.score);
    }
  });
  const [, setFrame] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [pop, setPop] = useState<{ text: string; kind: "good" | "bad"; key: number } | null>(null);
  const popKey = useRef(0);
  const redraw = () => setFrame((f) => f + 1);
  const flash = (text: string, k: "good" | "bad") => setPop({ text, kind: k, key: ++popKey.current });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const e = game.tick(dt);
      if (e === "hendelse") buzz(20);
      else if (e === "bom") {
        buzz([40, 30, 40]);
        flash("Bom!", "bad");
      } else if (e === "runde" || e === "ferdig") buzz([20, 30, 20]);
      setFrame((f) => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  // Langt trykk skal ikke markere tekst (B-219), og mellomrom holder inne / trykker på tastatur
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onTouch = (e: TouchEvent) => {
      if ((e.target as Element | null)?.closest?.(".cg-hold, .cg-main")) e.preventDefault();
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
  const tapNow = () => {
    const q = game.tap();
    if (q !== null) {
      buzz(12);
      flash(q >= 0.9 ? "Perfekt!" : `+${Math.round(60 * q * game.mult)}`, "good");
    } else if (game.phase === "spill") {
      buzz([40, 30, 40]);
      flash("Bom!", "bad");
    }
    redraw();
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      e.preventDefault();
      if (game.current.kind === "hold") game.hold(true);
      else tapNow();
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
  });

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

  const r = game.current;
  const n = game.rounds.length;
  let body: ReactNode = null;
  if (game.phase === "klar") {
    body = (
      <div className="cg-card">
        <div className="cg-card-icon" aria-hidden="true">
          <Icon name={r.icon} />
        </div>
        <p className="cg-muted">
          Runde {game.round + 1} av {n}
        </p>
        <h2>{r.title}</h2>
        <p>{r.what}</p>
        <p className="cg-how">{r.how}</p>
        {game.round === 0 && (
          <p className="cg-muted">{game.def.intro} Tre korte runder. Treff det grønne for stjerner, poeng og kombo.</p>
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
  } else if (game.phase === "spill" && r.kind === "hold") {
    const [lo, hi] = game.band;
    const v = game.value;
    // Retningen på knappen: holder man inne, går verdien opp (holdRate > 0) eller ned
    const up = r.holdRate > 0;
    const tooLow = v < lo;
    const tooHigh = v > hi;
    const notice = game.notice;
    body = (
      <Play stage={<HoldStage game={game} r={r} />}>
        <Gauge label={r.title} value={v} min={r.min} max={r.max} zone={[lo, hi]} digits={r.digits} unit={r.unit} />
        <div className="cg-progress">
          <span>Tid</span>
          <div className="cg-progress-track is-time">
            <div style={{ width: `${Math.max(0, 1 - game.t / r.durationS) * 100}%` }} />
          </div>
          <span>{Math.ceil(Math.max(0, r.durationS - game.t))} s</span>
        </div>
        <p className={`cg-hint${notice ? " is-warn" : ""}`}>
          {notice && <Icon name="warning" />}
          {notice
            ? notice.text
            : tooLow
              ? up
                ? "For lavt – hold inne."
                : "For lavt – slipp."
              : tooHigh
                ? up
                  ? "For høyt – slipp."
                  : "For høyt – hold inne."
                : "I det grønne – hold det der."}
        </p>
        <button className={`cg-hold${game.holding ? " is-down" : ""}`} {...holdProps}>
          <Icon name={r.icon} /> {r.holdLabel}
        </button>
      </Play>
    );
  } else if (game.phase === "spill" && r.kind === "tid") {
    const p = game.passes[Math.min(game.pass, game.passes.length - 1)];
    const inZone = Math.abs(game.pos - p.center) <= p.width / 2;
    body = (
      <Play stage={<TimingStage game={game} r={r} />}>
        <div className="cg-progress">
          <span>{r.id === "kapp" ? "Emner" : "Valsepar"}</span>
          <div className="cg-progress-track">
            <div style={{ width: `${(game.pass / r.count) * 100}%` }} />
          </div>
          <span>
            {Math.min(game.pass + 1, r.count)} av {r.count}
          </span>
        </div>
        <p className={`cg-hint${inZone ? " is-go" : ""}`}>{inZone ? "NÅ!" : r.how}</p>
        <button
          className={`cg-main cg-big${inZone ? " is-ready" : ""}`}
          onPointerDown={(e) => (e.preventDefault(), tapNow())}
        >
          {r.tapLabel}
        </button>
      </Play>
    );
  } else if (game.score) {
    body = <MiniResult score={game.score} best={best} fpNow={fpNow} onClose={onClose} onChapter={onChapter} />;
  }

  return (
    <div ref={rootRef} className="control-room cg" role="dialog" aria-modal="true" aria-label={game.def.title}>
      <header className="cg-head">
        <h1>{game.def.title}</h1>
        {game.phase !== "ferdig" && (
          <button className="cg-close" onClick={() => setConfirm(true)} aria-label="Avslutt">
            <Icon name="close" />
          </button>
        )}
      </header>
      {game.phase !== "ferdig" && (
        <div className="cg-bar">
          <ol className="cg-rounds" aria-label="Runder">
            {game.rounds.map((x, i) => (
              <li
                key={x.id}
                className={i < game.round ? "done" : i === game.round ? "now" : ""}
                aria-label={`${x.title}${i < game.round ? " (ferdig)" : ""}`}
              >
                <Icon name={i < game.round ? "check" : x.icon} />
              </li>
            ))}
          </ol>
          <div className="cg-points">
            {game.mult > 1 && game.phase === "spill" && <span className="cg-combo">×{game.mult}</span>}
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
            <p>Avslutte? Det du har gjort nå, teller ikke.</p>
            <div className="g-row">
              <button className="g-primary" onClick={() => onClose()}>
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

function MiniResult({
  score,
  best,
  fpNow,
  onClose,
  onChapter,
}: {
  score: MiniScore;
  best: number;
  fpNow: number;
  onClose: Props["onClose"];
  onChapter: Props["onChapter"];
}) {
  const record = score.points > best;
  const fp = fpNow > 0 ? 1 + score.rating + (score.rating >= 5 ? 10 : score.rating >= 4 ? 5 : 0) : 0;
  return (
    <div className="cg-result">
      <div className="cg-rating">
        <Stars n={score.rating} of={5} />
        <h2>{score.headline}</h2>
        <Metric
          label="Poeng"
          value={fmtNum(score.points)}
          delta={best > 0 ? changeDelta(score.points, best, fmtNum, { than: "rekorden" }) : null}
        />
        {record && (
          <span className="ds-status is-ok">
            <Icon name="trophy" /> Ny rekord
          </span>
        )}
        <p className="cg-muted">
          {fp > 0 ? `+${fp} fagpoeng` : "Fagpoengene for i dag er alt hentet – nye i morgen (spilldøgn)"}
          {score.rating >= 4 && ` · fordel i drifta i ${score.rating >= 5 ? 48 : 24} timer`}
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
              <details className="g-details cg-lesson">
                <summary>Hvorfor?</summary>
                <p>{x.lesson}</p>
                <Button variant="link" icon="book" onClick={() => onChapter(x.chapter)}>
                  Les mer i fagboka
                </Button>
              </details>
            )}
          </li>
        ))}
      </ul>
      <div className="cg-result-actions">
        <Button variant="primary" onClick={() => onClose(true)}>
          Spill én gang til
        </Button>
        <Button onClick={() => onClose()}>Tilbake til verket</Button>
      </div>
    </div>
  );
}
