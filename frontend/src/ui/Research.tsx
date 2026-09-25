import { doResearch } from "../game/actions";
import { STAGES, stageRef } from "../game/data";
import { knowledgeCard } from "../game/knowledge";
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
  const current = options.filter((r) => !r.done && r.stage <= g.stage);
  // Klar nå: nok fagpoeng og kapitlet er lest. Nesten: mangler fagpoeng eller lesing. Neste nivå: bare navnet.
  const ready = current.filter((r) => r.available);
  const later = current.filter((r) => !r.available);
  const nextStage = options.filter((r) => !r.done && r.stage === g.stage + 1);
  const done = options.filter((r) => r.done);
  const card = (r: (typeof options)[number]) => (
    <div key={r.id} className="g-upgrade">
      <div className="g-contract-head">
        <strong>{r.name}</strong>
        <span className="g-fp-cost">{r.cost} FP</span>
      </div>
      <p className="g-effect">{r.effect}</p>
      <p className="g-muted g-small-text">{r.description}</p>
      <div className="g-row">
        {r.available ? (
          <button
            className="g-primary g-small"
            onClick={() => {
              act((gg) => doResearch(gg, r.id));
              buzz(20);
            }}
          >
            Forsk
          </button>
        ) : r.reads && !g.readChapters.includes(r.reads) ? (
          <button className="g-small" onClick={() => openBook(r.reads)}>
            📖 Les «{knowledgeCard(r.reads)?.title ?? "kapitlet"}» først
          </button>
        ) : (
          r.reason && <span className="g-muted">{r.reason}</span>
        )}
      </div>
    </div>
  );
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
        Fagpoeng får du av å smelte, levere, kjøre charger selv, quizer og oppdrag i fagboka – og av feil. Les kapitlet
        i fagboka før du forsker.
      </p>
      {ready.length > 0 && (
        <>
          <h3 className="g-subhead">Klar til å forske ({ready.length})</h3>
          <div className="g-upgrades">{ready.map(card)}</div>
        </>
      )}
      {later.length > 0 && (
        <>
          <h3 className="g-subhead">Trenger mer fagpoeng eller lesing ({later.length})</h3>
          <ul className="g-research-later">
            {later.map((r) => (
              <li key={r.id}>
                <div className="g-contract-head">
                  <strong>{r.name}</strong>
                  <span className="g-fp-cost">{r.cost} FP</span>
                </div>
                <span className="g-muted g-small-text">{r.effect}</span>
                {r.reads && !g.readChapters.includes(r.reads) ? (
                  <button className="g-small" onClick={() => openBook(r.reads)}>
                    📖 Les «{knowledgeCard(r.reads)?.title ?? "kapitlet"}» først
                  </button>
                ) : (
                  r.reason && <span className="g-muted g-small-text"> · {r.reason.toLowerCase()}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {ready.length === 0 && later.length === 0 && (
        <p className="g-muted">Alt som finnes på dette nivået, er forsket fram.</p>
      )}
      {nextStage.length > 0 && (
        <details className="g-role-group">
          <summary>
            Kommer i {stageRef(Math.min(STAGES.length - 1, g.stage + 1), g.stage)} ({nextStage.length})
          </summary>
          <ul className="g-closed">
            {nextStage.map((r) => (
              <li key={r.id}>
                {r.name} – {r.effect.toLowerCase()}
              </li>
            ))}
          </ul>
        </details>
      )}
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
