/**
 * Landemerker (B-174): samlingen på Verket – de som er levert, det som pågår, og når det neste kommer.
 */
import { LANDMARKS, landmarkContract, nextLandmark, todayKey } from "../game/landmarks";
import type { GameState } from "../game/types";
import { Card } from "./common";
import { fmtT } from "./format";

export function LandmarksCard({ g, onSales }: { g: GameState; onSales: () => void }) {
  const lm = g.landmarks;
  if (!lm) return null;
  const done = LANDMARKS.filter((l) => lm.done.includes(l.id));
  const c = landmarkContract(g);
  const next = nextLandmark(g);
  // Vises når det første landemerket er kommet
  if (!done.length && !c && !lm.date) return null;
  return (
    <Card
      title="Landemerker"
      right={
        <span className="g-muted">
          {done.length} av {LANDMARKS.length}
        </span>
      }
    >
      {done.length > 0 && (
        <p className="g-landmarks" aria-label={`Levert: ${done.map((l) => l.name).join(", ")}`}>
          {done.map((l) => (
            <span key={l.id} title={l.name}>
              {l.icon}
            </span>
          ))}
        </p>
      )}
      {c ? (
        <p>
          <strong>{c.customer}</strong>:{" "}
          {c.status === "tilbud"
            ? "venter på svar. "
            : `${fmtT(c.delivered)} av ${fmtT(c.tonnes)} levert, frist dag ${c.deadlineDay}. `}
          {c.status === "tilbud" && (
            <button className="g-link" onClick={onSales}>
              Se forespørselen under Salg
            </button>
          )}
        </p>
      ) : next ? (
        <p className="g-muted">
          {lm.date === todayKey() ? "Neste landemerke kommer i morgen" : "Neste landemerke kommer snart"}: {next.icon}{" "}
          {next.name}.
        </p>
      ) : done.length === LANDMARKS.length ? (
        <p>Alle landemerkene er levert. 🏛️</p>
      ) : (
        <p className="g-muted">Flere landemerker kommer når verket blir større.</p>
      )}
      <p className="g-muted g-small-text">
        Ett nytt landemerke per dag: bruer, stadioner, vindparker og mer. De betaler godt og gir fagpoeng og omdømme. Du
        tar dem selv på Salg – salgsdirektøren lar dem stå.
      </p>
    </Card>
  );
}
