import { doResearch } from "../game/actions";
import { STAGES } from "../game/data";
import { researchOptions } from "../game/research";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Card } from "./common";
import { buzz } from "./haptics";

/** Forskning: fagpoeng brukes på å låse opp utstyr og forbedringer. */
export function Research({
  g,
  act,
  openBook,
}: {
  g: GameState;
  act: GameApi["act"];
  openBook: (chapter?: string) => void;
}) {
  const options = researchOptions(g);
  // Vis det som er aktuelt nå og ett nivå fram; resten som en teaser
  const rank = (r: (typeof options)[number]) => (r.available ? 0 : r.locked ? 2 : 1);
  const open = options.filter((r) => !r.done && r.stage <= g.stage + 1).sort((a, b) => rank(a) - rank(b));
  const done = options.filter((r) => r.done);
  const ready = options.filter((r) => r.available).length;
  return (
    <Card
      title="Forskning"
      right={
        <span className="g-fp" title="Fagpoeng">
          {Math.floor(g.researchPoints)} fagpoeng
        </span>
      }
      className="g-research"
    >
      <p className="g-muted">
        Fagpoeng tjener du på å smelte, levere og kjøre charger selv, på quizer og oppdrag i fagboka – og på feil,
        fordi du lærer av dem. Før du forsker, må du lese kapitlet om det i fagboka.
        {ready > 0 && ` Du kan forske på ${ready} ting nå.`}
      </p>
      {open.length === 0 && <p className="g-muted">Alt som finnes på dette nivået, er forsket fram.</p>}
      <div className="g-upgrades">
        {open.map((r) => (
          <div key={r.id} className={`g-upgrade${r.done ? " is-owned" : ""}${r.locked ? " is-locked" : ""}`}>
            <div className="g-contract-head">
              <strong>{r.name}</strong>
              {!r.done && <span className="g-fp-cost">{r.cost} FP</span>}
            </div>
            <p className="g-muted">{r.description}</p>
            <p className="g-effect">{r.effect}</p>
            {r.done ? (
              <span className="g-badge-ok">Forsket fram</span>
            ) : r.locked ? (
              <span className="g-muted">Krever {STAGES[r.stage].name.toLowerCase()}</span>
            ) : (
              <div className="g-row">
                <button
                  className="g-primary g-small"
                  disabled={!r.available}
                  onClick={() => {
                    act((gg) => doResearch(gg, r.id));
                    buzz(20);
                  }}
                >
                  Forsk
                </button>
                {r.reads && !g.readChapters.includes(r.reads) ? (
                  <button className="g-small" onClick={() => openBook(r.reads)}>
                    📖 Les kapitlet
                  </button>
                ) : (
                  r.reason && <span className="g-muted">{r.reason}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {done.length > 0 && (
        <details className="g-role-group g-research-done">
          <summary>Forsket fram ({done.length})</summary>
          <ul className="g-closed">
            {done.map((r) => (
              <li key={r.id} className="ok">
                {r.name} – {r.effect.toLowerCase()}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
