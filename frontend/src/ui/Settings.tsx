import { useState, type ReactNode } from "react";
import { SheetHead } from "./ds";
import { Icon, type IconName } from "./icons";
import { CHANGELOG } from "../game/changelog";
import { ChangelogSheet } from "./Changelog";
import { borrow, repay } from "../game/actions";
import { LOAN_INTEREST_PER_DAY } from "../game/data";
import { creditLimit, maxLoan } from "../game/engine";
import { maxSpeed } from "../game/research";
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
import { PushSettings } from "./Push";

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

/** Et valg med få, korte alternativer (B-238): knapper på én rad i stedet for en nedtrekksliste */
function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="g-set-field">
      <span className="g-set-label">{label}</span>
      <div className="g-seg" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button
            key={String(v)}
            role="radio"
            aria-checked={value === v}
            className={value === v ? "is-on" : undefined}
            onClick={() => onChange(v)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** En gruppe i innstillingene: ikon, overskrift og innhold (B-238) */
function SetGroup({
  icon,
  title,
  danger,
  children,
}: {
  icon: IconName;
  title: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`g-set-group${danger ? " is-danger" : ""}`}>
      <h3>
        <Icon name={icon} /> {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Varsler på skjermen (B-115, B-238): alle eller bare problemer, temaene bak én linje og hvor lenge de står.
 * Alt havner uansett i varsellista bak bjella.
 */
function ToastSettings({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const mode = g.settings.toasts ?? "alle";
  const topics = g.settings.toastTopics ?? {};
  const on = LOG_TOPICS.filter((t) => topics[t.id] !== false).length;
  return (
    <>
      <p className="g-muted g-small-text">
        Varslene kommer ett om gangen i varsellinja. Alle samles uansett i varsellista – trykk på linja.
      </p>
      <Segmented
        label="Hvilke varsler"
        value={mode}
        options={[
          ["alle", "Velg temaer"],
          ["problemer", "Bare problemer"],
        ]}
        onChange={(v) => act((gg) => void (gg.settings.toasts = v))}
      />
      {mode === "alle" && (
        <details className="g-details g-set-topics">
          <summary>
            Temaer{" "}
            <span className="g-muted">
              · {on === LOG_TOPICS.length ? "alle på" : `${on} av ${LOG_TOPICS.length} på`}
            </span>
          </summary>
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
        </details>
      )}
      <Segmented
        label="Hvor lenge et varsel står"
        value={g.settings.toastSeconds ?? 6}
        options={[
          [3, "Kort"],
          [6, "Normalt"],
          [10, "Lenge"],
        ]}
        onChange={(v) => act((gg) => void (gg.settings.toastSeconds = v))}
      />
    </>
  );
}

/**
 * Innstillinger bak tannhjulet (B-072, B-238): delt i grupper – konto og lagring, spillet, varsler, om spillet og til
 * slutt «Start på nytt». Før sto alt i én lang liste med lange setninger, og det viktigste (kontoen) lå midt i.
 */
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
  const [news, setNews] = useState(false);
  const season = useSeasonStatus()?.current ?? null;
  const act = api.act;
  const latest = CHANGELOG[0];
  return (
    <div className="g-modal g-side-sheet" role="dialog" aria-modal="true" aria-label="Innstillinger" onClick={onClose}>
      <div className="g-modal-card g-settings" onClick={(e) => e.stopPropagation()}>
        <SheetHead title="Innstillinger" icon="settings" onClose={onClose} />
        <SetGroup icon="cloud" title="Konto og lagring">
          <AccountCard api={api} onDone={onClose} />
          <p className="g-muted g-small-text">
            Spillet lagres av seg selv i denne nettleseren. Nettleseren kan slette det (privat modus, tømt historikk) –
            med konto ligger det trygt på nett og kan spilles på flere enheter.
          </p>
        </SetGroup>
        <SetGroup icon="play" title="Spillet">
          <AutoToggle
            g={g}
            act={act}
            k="skipIdleNights"
            label="Spol fram natta"
            hint="Når verket står om natta og ingenting skjer"
          />
          {maxSpeed(g) > 1 && (
            <label className="g-toggle">
              <input
                type="checkbox"
                checked={g.settings.keepSpeed}
                onChange={(e) => act((gg) => void (gg.settings.keepSpeed = e.target.checked))}
              />
              <span>
                Behold farten etter et hendelseskort
                <small className="g-muted g-toggle-hint">Ellers går spillet ned til 1×</small>
              </span>
            </label>
          )}
          <label className="g-toggle">
            <input
              type="checkbox"
              checked={g.settings.pauseOnSales}
              onChange={(e) => act((gg) => void (gg.settings.pauseOnSales = e.target.checked))}
            />
            <span>
              Pause mens du er på Salg
              <small className="g-muted g-toggle-hint">Spillet går videre i samme fart når du går ut</small>
            </span>
          </label>
          {stats.furnace.arc && g.owned.includes("valseverk") && (
            <label className="g-toggle">
              <input
                type="checkbox"
                checked={g.settings.rolling}
                onChange={(e) => act((gg) => void (gg.settings.rolling = e.target.checked))}
              />
              <span>
                Valse emner til armeringsstål
                <small className="g-muted g-toggle-hint">Emner som kontrakter venter på, blir liggende</small>
              </span>
            </label>
          )}
        </SetGroup>
        <SetGroup icon="bell" title="Varsler">
          <ToastSettings g={g} act={act} />
          <PushSettings />
        </SetGroup>
        <SetGroup icon="info" title="Om spillet">
          <button className="g-set-link" onClick={() => setNews(true)}>
            <Icon name="sparkles" />
            <span>
              <strong>Hva er nytt</strong>
              <small className="g-muted">
                {latest.title} · {latest.date.split("-").reverse().join(".")}
              </small>
            </span>
            <Icon name="chevron-right" />
          </button>
          <InstallTip />
        </SetGroup>
        {news && <ChangelogSheet onClose={() => setNews(false)} />}
        <SetGroup icon="refresh" title="Start på nytt" danger>
          <p className="g-muted g-small-text">
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
        </SetGroup>
      </div>
    </div>
  );
}
