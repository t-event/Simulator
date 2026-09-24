import { useState } from "react";
import { borrow, buyUpgrade, repay, upgradeOptions, type UpgradeOption } from "../game/actions";
import { LOAN_INTEREST_PER_DAY, STAGES } from "../game/data";
import { creditLimit, maxLoan } from "../game/engine";
import type { PlantStats } from "../game/plant";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Card } from "./common";
import { Research } from "./Research";
import { fmtKr, fmtPct, fmtRep } from "./format";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
  onQuit: () => void;
}

const SECTIONS: { kind: UpgradeOption["kind"]; title: string }[] = [
  { kind: "furnace", title: "Ovn" },
  { kind: "casting", title: "Støping" },
  { kind: "addon", title: "Utstyr og bygg" },
];

function UpgradeCard({ o, act }: { o: UpgradeOption; act: GameApi["act"] }) {
  return (
    <div className={`g-upgrade${o.owned ? " is-owned" : ""}${o.locked ? " is-locked" : ""}`}>
      <div className="g-contract-head">
        <strong>{o.name}</strong>
        {!o.owned && <span>{fmtKr(o.price)}</span>}
      </div>
      <p className="g-muted">{o.description}</p>
      {o.warning && !o.owned && !o.locked && <p className="g-note g-warn">{o.warning}</p>}
      {o.owned ? (
        <span className="g-badge-ok">I drift</span>
      ) : o.locked ? (
        <span className="g-muted">Krever {STAGES[o.stage].name.toLowerCase()}</span>
      ) : (
        <div className="g-row">
          <button className="g-primary g-small" disabled={!o.available} onClick={() => act((g) => buyUpgrade(g, o.id))}>
            Kjøp
          </button>
          {o.reason && <span className="g-muted">{o.reason}</span>}
        </div>
      )}
    </div>
  );
}

export function Build({ g, stats, act, onQuit }: Props) {
  const [confirmQuit, setConfirmQuit] = useState(false);
  const options = upgradeOptions(g);
  const stage = options.find((o) => o.kind === "stage");
  const next = STAGES[g.stage + 1];
  const loanRoom = Math.max(0, maxLoan(g) - g.loan);
  const loanStep = Math.max(10_000, Math.round(maxLoan(g) / 4 / 10_000) * 10_000);

  return (
    <div className="g-grid">
      <div className="g-col-wide">
        {stage && next && (
          <Card title={`Neste nivå: ${next.name}`} className="g-stage-card">
            <p>{next.description}</p>
            <ul className="g-checks">
              <li className={g.reputation >= next.reputation ? "ok" : "bad"}>
                Omdømme {fmtRep(g.reputation)} av {next.reputation}
                {g.reputation < next.reputation && (
                  <span className="g-muted"> – lever flere kontrakter i tide for å komme dit</span>
                )}
              </li>
              <li className={g.cash >= next.price ? "ok" : "bad"}>
                {fmtKr(next.price)} (du har {fmtKr(Math.floor(g.cash))})
              </li>
              <li className="g-muted">
                Plass til {next.staffCap} ansatte, {Math.round(next.yardT)} t skrap og {Math.round(next.storeT)} t
                ferdigvare
              </li>
              <li className="g-muted">
                Faste kostnader øker fra {fmtKr(STAGES[g.stage].fixedPerDay)} til {fmtKr(next.fixedPerDay)} per døgn
              </li>
              {next.id === 2 && (
                <li className="g-muted">
                  Du går over til å være daglig leder og står ikke lenger i produksjonen selv.
                </li>
              )}
            </ul>
            <button
              className="g-primary"
              disabled={!stage.available}
              onClick={() => act((gg) => buyUpgrade(gg, stage.id))}
            >
              Flytt inn i {next.name.toLowerCase()}
            </button>
          </Card>
        )}
        {!next && (
          <Card title="Storverket">
            <p>Du har bygget et fullskala stålverk. Klarer du å samle {fmtKr(100_000_000)} i egenkapital?</p>
          </Card>
        )}

        <Research g={g} act={act} />

        {SECTIONS.map((section) => {
          const items = options.filter((o) => o.kind === section.kind);
          if (!items.length) return null;
          return (
            <Card title={section.title} key={section.kind}>
              <div className="g-upgrades">
                {items.map((o) => (
                  <UpgradeCard key={o.id} o={o} act={act} />
                ))}
              </div>
            </Card>
          );
        })}
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
