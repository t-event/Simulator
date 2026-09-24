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
  openBook: (chapter?: string) => void;
  onLoadBackup: (text: string) => boolean;
}

/** Laster ned hele spillet som en JSON-fil */
function downloadBackup(g: GameState): void {
  const blob = new Blob([JSON.stringify(g)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stalverket-dag-${Math.floor(g.minute / 1440) + 1}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Knapp som henter en sikkerhetskopi fra en fil */
export function BackupInput({ onLoad }: { onLoad: (text: string) => boolean }) {
  const [error, setError] = useState(false);
  return (
    <label className="g-file-btn">
      Hent sikkerhetskopi
      <input
        type="file"
        accept="application/json,.json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setError(!onLoad(await file.text()));
          e.target.value = "";
        }}
      />
      {error && <span className="g-muted"> Fila er ikke et lagret spill.</span>}
    </label>
  );
}

export function ResearchPage({ g, stats, act, onQuit, openBook, onLoadBackup }: Props) {
  const [confirmQuit, setConfirmQuit] = useState(false);
  const loanRoom = Math.max(0, maxLoan(g) - g.loan);
  const loanStep = Math.max(10_000, Math.round(maxLoan(g) / 4 / 10_000) * 10_000);

  return (
    <div className="g-grid">
      <div className="g-col-wide">
        <Research g={g} act={act} openBook={openBook} />
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
          <p className="g-muted">
            Spillet lagres automatisk i denne nettleseren. Safari kan slette lagrede data for nettsider som ikke er
            brukt på en uke – legg spillet på hjemskjermen, eller ta en sikkerhetskopi.
          </p>
          <label className="g-toggle">
            <input
              type="checkbox"
              checked={g.settings.skipIdleNights}
              onChange={(e) => act((gg) => void (gg.settings.skipIdleNights = e.target.checked))}
            />
            <span>Spol fram om natta når verket står og ingenting skjer</span>
          </label>
          <div className="g-row">
            <button onClick={() => downloadBackup(g)}>Last ned sikkerhetskopi</button>
            <BackupInput onLoad={onLoadBackup} />
          </div>
        </Card>
      </div>
    </div>
  );
}
