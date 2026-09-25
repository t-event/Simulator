import { useState } from "react";
import { borrow, repay } from "../game/actions";
import { LOAN_INTEREST_PER_DAY } from "../game/data";
import { creditLimit, maxLoan } from "../game/engine";
import type { PlantStats } from "../game/plant";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { AutoToggle } from "./AutoToggle";
import { InstallTip } from "./InstallTip";
import { Card } from "./common";
import { fmtKr, fmtPct } from "./format";

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

/** Banken: lån og kassekreditt. Står under Verket → Økonomi, der pengene er (B-072). */
export function BankCard({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const loanRoom = Math.max(0, maxLoan(g) - g.loan);
  const loanStep = Math.max(10_000, Math.round(maxLoan(g) / 4 / 10_000) * 10_000);
  return (
    <Card title="Banken">
      <p>
        Lån: <strong>{fmtKr(g.loan)}</strong> av maks {fmtKr(maxLoan(g))}
      </p>
      <p className="g-muted">
        Rente {fmtPct(LOAN_INTEREST_PER_DAY * 365, 0)} per år, trukket daglig. Banken låner mer til større verk med godt
        omdømme. Kassekreditt: {fmtKr(creditLimit(g))} – blir du stående under den i en uke, er det konkurs.
      </p>
      <div className="g-row">
        <button disabled={loanRoom <= 0} onClick={() => act((gg) => borrow(gg, loanStep))}>
          Lån {fmtKr(Math.min(loanStep, loanRoom))}
        </button>
        <button disabled={g.loan <= 0 || g.cash <= 0} onClick={() => act((gg) => repay(gg, loanStep))}>
          Betal ned {fmtKr(Math.min(loanStep, g.loan, Math.max(0, g.cash)))}
        </button>
      </div>
    </Card>
  );
}

/** Innstillinger bak ⚙️ i toppen: nytt spill, sikkerhetskopi, valsing og nattspoling (B-072) */
export function SettingsSheet({
  g,
  stats,
  act,
  onQuit,
  onLoadBackup,
  onNextRound,
  onClose,
}: {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
  onQuit: () => void;
  onLoadBackup: (text: string) => boolean;
  onNextRound: () => void;
  onClose: () => void;
}) {
  const [confirmQuit, setConfirmQuit] = useState(false);
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-label="Innstillinger" onClick={onClose}>
      <div className="g-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="g-card-head">
          <h2>Innstillinger</h2>
          <button onClick={onClose} aria-label="Lukk">
            ✕
          </button>
        </header>
        <AutoToggle g={g} act={act} k="skipIdleNights" label="Spol fram om natta når verket står og ingenting skjer" />
        {stats.furnace.arc && (
          <label className="g-toggle">
            <input
              type="checkbox"
              checked={g.settings.rolling}
              disabled={!g.owned.includes("valseverk")}
              onChange={(e) => act((gg) => void (gg.settings.rolling = e.target.checked))}
            />
            <span>Valse emner til armeringsstål (emner som kontrakter venter på, blir liggende)</span>
          </label>
        )}
        <h3 className="g-subhead">Varsler på skjermen</h3>
        <p className="g-muted">Alt samles uansett i varsellista bak 🔔 øverst.</p>
        <div className="g-choice" role="radiogroup" aria-label="Varsler på skjermen">
          {(
            [
              ["alle", "Alle hendelser"],
              ["problemer", "Bare problemer"],
              ["ingen", "Ingen"],
            ] as const
          ).map(([id, label]) => (
            <label key={id} className="g-toggle">
              <input
                type="radio"
                name="toasts"
                checked={(g.settings.toasts ?? "alle") === id}
                onChange={() => act((gg) => void (gg.settings.toasts = id))}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <h3 className="g-subhead">Lagring</h3>
        <p className="g-muted">
          Spillet lagres automatisk i denne nettleseren. Safari kan slette lagrede data for nettsider som ikke er brukt
          på en uke – legg spillet på hjemskjermen, eller ta en sikkerhetskopi.
        </p>
        <div className="g-row">
          <button onClick={() => downloadBackup(g)}>Last ned sikkerhetskopi</button>
          <BackupInput onLoad={onLoadBackup} />
        </div>
        <h3 className="g-subhead">Spill på mobilen</h3>
        <InstallTip />
        <h3 className="g-subhead">Nytt spill</h3>
        {g.won && (
          <p>
            Du har vunnet og spiller videre. Når du vil, kan du starte runde {(g.round ?? 1) + 1} med mer startkapital,
            fagpoeng og omdømme.{" "}
            <button className="g-primary g-small" onClick={onNextRound}>
              Nytt spill+ (runde {(g.round ?? 1) + 1})
            </button>
          </p>
        )}
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
      </div>
    </div>
  );
}
