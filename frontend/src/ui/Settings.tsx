import { useState } from "react";
import { borrow, repay } from "../game/actions";
import { LOAN_INTEREST_PER_DAY } from "../game/data";
import { creditLimit, maxLoan } from "../game/engine";
import type { PlantStats } from "../game/plant";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { AccountCard } from "./Account";
import { useSeasonStatus } from "./useSeason";
import { AutoToggle } from "./AutoToggle";
import { InstallTip } from "./InstallTip";
import { Card } from "./common";
import { LOG_TOPICS } from "../game/inbox";
import { fmtKr, fmtPct } from "./format";

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

/**
 * Varsler på skjermen (B-115): hvor mye, hvilke temaer og hvor lenge. Alt havner uansett i varsellista bak 🔔.
 */
function ToastSettings({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const mode = g.settings.toasts ?? "alle";
  const topics = g.settings.toastTopics ?? {};
  return (
    <>
      <h3 className="g-subhead">Varsler på skjermen</h3>
      <p className="g-muted">
        Varslene dukker opp ett om gangen i varsellinja øverst, under kassa. Alt samles uansett i varsellista – trykk på
        linja.
      </p>
      <div className="g-choice" role="radiogroup" aria-label="Hvor mange varsler">
        {(
          [
            ["alle", "Velg selv", "Problemer, hendelser og gode nyheter – i temaene du krysser av under"],
            ["problemer", "Bare problemer", "Bare det som går galt, uansett tema"],
          ] as const
        ).map(([id, label, hint]) => (
          <label key={id} className="g-toggle">
            <input
              type="radio"
              name="toasts"
              checked={mode === id}
              onChange={() => act((gg) => void (gg.settings.toasts = id))}
            />
            <span>
              {label}
              <small className="g-muted g-toggle-hint">{hint}</small>
            </span>
          </label>
        ))}
      </div>
      {mode === "alle" && (
        <fieldset className="g-toast-topics">
          <legend>Temaer</legend>
          {LOG_TOPICS.map((t) => (
            <label key={t.id} className="g-toggle">
              <input
                type="checkbox"
                checked={topics[t.id] !== false}
                onChange={(e) =>
                  act((gg) => void (gg.settings.toastTopics = { ...gg.settings.toastTopics, [t.id]: e.target.checked }))
                }
              />
              <span>
                {t.label}
                <small className="g-muted g-toggle-hint">{t.hint}</small>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <label className="g-field">
        <span>Hvor lenge et varsel står</span>
        <select
          value={g.settings.toastSeconds ?? 6}
          onChange={(e) => act((gg) => void (gg.settings.toastSeconds = Number(e.target.value)))}
        >
          <option value={3}>Kort (3 sekunder)</option>
          <option value={6}>Normalt (6 sekunder)</option>
          <option value={10}>Lenge (10 sekunder)</option>
        </select>
      </label>
    </>
  );
}

/** Innstillinger bak ⚙️ i toppen: konto, nytt spill, valsing og nattspoling (B-072). Sikkerhetskopi er fjernet (B-135). */
export function SettingsSheet({
  g,
  stats,
  api,
  onQuit,
  onClose,
}: {
  g: GameState;
  stats: PlantStats;
  api: GameApi;
  onQuit: () => void;
  onClose: () => void;
}) {
  const [confirmQuit, setConfirmQuit] = useState(false);
  const season = useSeasonStatus()?.current ?? null;
  const act = api.act;
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
        <ToastSettings g={g} act={act} />
        <AccountCard api={api} onDone={onClose} />
        <h3 className="g-subhead">Lagring</h3>
        <p className="g-muted">
          Spillet lagres automatisk i denne nettleseren, og på nett når du er logget inn. Safari kan slette lagrede data
          for nettsider som ikke er brukt på en uke – logg inn, så ligger spillet trygt på nett.
        </p>
        <h3 className="g-subhead">Spill på mobilen</h3>
        <InstallTip />
        <h3 className="g-subhead">Nytt spill</h3>
        <p className="g-muted">
          Et nytt spill starter i garasjen. Spillet du har nå, slettes – også det som er lagret på nett.
          {season && ` ${season.name} pågår: er du logget inn, blir det nye spillet med i sesongen.`}
        </p>
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
