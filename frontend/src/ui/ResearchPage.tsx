import { useState } from "react";
import { borrow, repay } from "../game/actions";
import { LOAN_INTEREST_PER_DAY } from "../game/data";
import { creditLimit, maxLoan } from "../game/engine";
import type { PlantStats } from "../game/plant";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Card } from "./common";
import { Research } from "./Research";
import { fmtKr, fmtPct } from "./format";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
  onQuit: () => void;
}

export function ResearchPage({ g, stats, act, onQuit }: Props) {
  const [confirmQuit, setConfirmQuit] = useState(false);
  const loanRoom = Math.max(0, maxLoan(g) - g.loan);
  const loanStep = Math.max(10_000, Math.round(maxLoan(g) / 4 / 10_000) * 10_000);

  return (
    <div className="g-grid">
      <div className="g-col-wide">
        <Research g={g} act={act} />
      </div>

      <div className="g-col">
        <Card title="Banken">
          <p>
            Lån: <strong>{fmtKr(g.loan)}</strong> av maks {fmtKr(maxLoan(g))}
          </p>
          <p className="g-muted">
            Rente {fmtPct(LOAN_INTEREST_PER_DAY * 365, 0)} per år, trukket daglig. Banken låner mer til større verk med
            godt omdømme. Kassekreditt: {fmtKr(creditLimit(g))} – blir du stående under den i en uke, er det konkurs.
          </p>
          <div className="g-row">
            <button disabled={loanRoom <= 0} onClick={() => act((gg) => borrow(gg, loanStep))}>
              Lån {fmtKr(Math.min(loanStep, loanRoom))}
            </button>
            <button disabled={g.loan <= 0 || g.cash <= 0} onClick={() => act((gg) => repay(gg, loanStep))}>
              Betal ned {fmtKr(Math.min(loanStep, g.loan))}
            </button>
          </div>
        </Card>

        {stats.furnace.arc && (
          <Card title="Valsing">
            <label className="g-toggle">
              <input
                type="checkbox"
                checked={g.settings.rolling}
                disabled={!g.owned.includes("valseverk")}
                onChange={(e) => act((gg) => void (gg.settings.rolling = e.target.checked))}
              />
              <span>Valse emner til armeringsstål (emner som kontrakter venter på, blir liggende)</span>
            </label>
          </Card>
        )}

        <Card title="Spillet">
          {confirmQuit ? (
            <div className="g-row">
              <button className="g-danger" onClick={onQuit}>
                Ja, slett og start på nytt
              </button>
              <button onClick={() => setConfirmQuit(false)}>Avbryt</button>
            </div>
          ) : (
            <button onClick={() => setConfirmQuit(true)}>Start nytt spill</button>
          )}
          <p className="g-muted">Spillet lagres automatisk i denne nettleseren.</p>
        </Card>
      </div>
    </div>
  );
}
