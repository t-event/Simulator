/**
 * Ukens utfordring (B-152): kortet på Verket med ukas oppgave, plassen din i ligaen, medaljene og ukekista, og lista
 * for uka. Krever konto for å være med (docs/KONTO.md); lista kan leses uten.
 */
import { lockLayout } from "./layoutLock";
import { SheetHead } from "./ds";
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { GRADES } from "../game/data";
import type { GameApi } from "../game/useGame";
import { getSession, onSessionChange } from "../net/supabase";
import { isReconciled, onCloudStatus } from "../net/sync";
import {
  abandonControlAttempt,
  CONTROL_REFUSAL_TEXT,
  flushPendingControl,
  pendingControl,
  pendingIsDurable,
  startControlAttempt,
  submitControlAttempt,
  type ControlAttempt,
  type SubmitOutcome,
  chestFp,
  fetchWeeklyBoard,
  fetchWeeklyStatus,
  onWeeklyChange,
  setWeeklyStatus,
  WEEK_KINDS,
  weekDaysLeft,
  weeklyStatus,
  type WeekKind,
  type WeeklyRow,
} from "../net/weekly";
import { Place } from "./Place";
import { PlayerName } from "./Profile";
import { Card } from "./common";
import { fmtNum } from "./format";
import { Portal } from "./Portal";
import { Icon } from "./icons";
import { trainingSeed, weeklyGrade, weeklyRequest } from "./control/weekly";
import type { WeeklyMode } from "./control/ControlRoom";

const ControlRoom = lazy(() => import("./control/ControlRoom").then((m) => ({ default: m.ControlRoom })));

function useSession() {
  return useSyncExternalStore(onSessionChange, getSession, getSession);
}
function useReconciled() {
  return useSyncExternalStore(onCloudStatus, isReconciled, isReconciled);
}
function useWeekly() {
  return useSyncExternalStore(onWeeklyChange, weeklyStatus, weeklyStatus);
}

function fmtValue(kind: WeekKind, v: number): string {
  if (kind === "vekst") return `+${fmtNum(v, 1)} %`;
  if (kind === "tonn") return `${fmtNum(v, 0)} %`;
  if (kind === "kontroll") return `${fmtNum(v, 0)} poeng`;
  return `${fmtNum(v, 0)} ${v === 1 ? "dag" : "dager"}`;
}

export function WeeklyCard({ act }: { act: GameApi["act"] }) {
  const session = useSession();
  const reconciled = useReconciled();
  const status = useWeekly();
  const [board, setBoard] = useState(false);
  const user = session?.user.id ?? null;

  // Status ved innlogging og hvert femte minutt; plassen endrer seg når spillet lagres på nett
  useEffect(() => {
    if (!user || !reconciled) return;
    const load = () => void fetchWeeklyStatus().then(setWeeklyStatus, () => {});
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, [user, reconciled]);

  // Uten konto står Ukens utfordring i det samlede kontokortet (AccountFeaturesCard, B-191)
  if (!session) return null;
  if (!status) return null;
  const kind = WEEK_KINDS[status.kind];
  const left = weekDaysLeft(status);
  const m = status.medals;
  return (
    <Card
      title="Ukens utfordring"
      right={
        <button className="g-small" onClick={() => setBoard(true)}>
          <Icon name="medal" /> Lista
        </button>
      }
    >
      {status.chest && (
        <div className="g-note g-week-chest">
          <span>
            <Icon name="gift" /> <strong>Ukekiste!</strong>{" "}
            {status.chest.count > 1
              ? `${status.chest.count} kister venter`
              : `Du ble nr. ${status.chest.best} på ukelista forrige uke`}{" "}
            – {status.chest.fp} fagpoeng. Åpnes med «Hent alt» øverst på Mål.
          </span>
        </div>
      )}
      <p>
        <strong>{kind.title}</strong>. <span className="g-muted">{kind.how}</span>
      </p>
      <p>
        {status.plass
          ? `Du er nr. ${status.plass} av ${status.players} (${fmtValue(status.kind, status.value ?? 0)}).`
          : status.kind === "dager"
            ? "Du er ikke på lista ennå – den fylles når spillet lagres på nett."
            : status.kind === "kontroll"
              ? "Du er ikke på lista ennå – kjør et tellende forsøk."
              : "Du er ikke på lista denne uka: spillet må ha vært lagret på nett minst to dager før uka startet."}{" "}
        <span className="g-muted">
          {left <= 1 ? "Siste dag!" : `${left} dager igjen.`} Topp 3 får medalje og ukekiste ({chestFp(3)}–{chestFp(1)}{" "}
          fagpoeng).
        </span>
      </p>
      {status.kind === "kontroll" && status.control && <WeeklyControlPanel key={user} act={act} user={user!} />}
      {m.gold + m.silver + m.bronze > 0 && (
        <p className="g-muted">
          Dine medaljer: {m.gold} gull · {m.silver} sølv · {m.bronze} bronse
        </p>
      )}
      {board && <WeeklyBoard kind={status.kind} onClose={() => setBoard(false)} />}
    </Card>
  );
}

/** Ukelista: én liste for alle spillerne (B-172) */
function WeeklyBoard({ kind, onClose }: { kind: WeekKind; onClose: () => void }) {
  const [data, setData] = useState<{ rows: WeeklyRow[] | null } | null>(null);
  const rows = data ? data.rows : null;
  const error = !!data && data.rows === null;
  useEffect(() => {
    let alive = true;
    fetchWeeklyBoard(null).then(
      (r) => alive && setData({ rows: r }),
      () => alive && setData({ rows: null }),
    );
    return () => {
      alive = false;
    };
  }, []);
  return (
    <Portal>
      <div className="g-modal" role="dialog" aria-modal="true" aria-label="Ukens utfordring" onClick={onClose}>
        <div className="g-modal-card" onClick={(e) => e.stopPropagation()}>
          <SheetHead title={WEEK_KINDS[kind].title} icon="medal" onClose={onClose} />
          {error ? (
            <p className="g-muted">Fikk ikke hentet lista. Prøv igjen senere.</p>
          ) : !rows ? (
            <p className="g-muted">Henter …</p>
          ) : rows.length === 0 ? (
            <p className="g-muted">Ingen på lista ennå denne uka.</p>
          ) : (
            <ol className="g-board">
              {rows.map((r) => (
                <li key={r.plass} className={r.isMe ? "is-me" : ""}>
                  <span className={`g-board-rank${r.plass <= 3 ? " is-medal" : ""}`}>
                    <Place plass={r.plass} />
                  </span>
                  <span className="g-board-name">
                    <span className="g-board-line">
                      <PlayerName nick={r.nickname} className="g-board-nick" />
                    </span>
                    {r.gold > 0 && (
                      <span className="g-board-honor">
                        <Icon name="medal" /> vunnet {r.gold} {r.gold === 1 ? "uke" : "uker"}
                      </span>
                    )}
                  </span>
                  <span className="g-board-value">{fmtValue(kind, r.value)}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="g-muted g-small-text">
            Uka går fra mandag til mandag. Alle er på samme liste
            {kind === "kontroll"
              ? " og kjører de samme chargene."
              : ", og stålet måles i prosent, så et lite verk kan slå et stort."}{" "}
            Når uka er over, får topp 3 medalje og en ukekiste med fagpoeng. {WEEK_KINDS[kind].how}
          </p>
        </div>
      </div>
    </Portal>
  );
}

// Farten spillet hadde før ukens kontrollrom ble åpnet (settes tilbake etterpå), og nøkkelen til hver ny charge
let speedBefore: number | null = null;
let playKey = 0;
const nextKey = () => ++playKey;
function pauseGame(act: GameApi["act"]): void {
  act((gg) => {
    speedBefore = gg.speed;
    gg.speed = 0;
  });
}
function resumeGame(act: GameApi["act"]): void {
  const sp = speedBefore;
  speedBefore = null;
  if (sp !== null && sp > 0) act((gg) => void (gg.speed = sp));
}

/**
 * Leverer et ukeresultat som venter (nettfeil), uansett hvilken side spilleren står på (B-397). Kortet på Uka gjør det
 * samme mens det vises; serveren gir samme svar på samme innlevering.
 */
export function PendingControlSync() {
  useEffect(() => {
    const t = setInterval(() => {
      const id = getSession()?.user.id ?? null;
      if (id && pendingControl(id)) {
        void flushPendingControl().then((o) => {
          if (o.kind !== "venter") void fetchWeeklyStatus().then(setWeeklyStatus, () => {});
        });
      }
    }, 20_000);
    return () => clearInterval(t);
  }, []);
  return null;
}

/** Hva spilleren kjører i ukens kontrollrom nå */
type Play =
  | { counted: false; seed: number; key: number }
  | { counted: true; attempt: ControlAttempt; key: number; scored: boolean };

function outcomeText(o: SubmitOutcome, attempts: number): string {
  if (o.kind === "levert")
    return `Levert: ${fmtNum(o.points)} poeng. Ditt beste denne uka: ${fmtNum(o.best)}. ${
      o.left > 0 ? `${o.left} av ${attempts} forsøk igjen.` : "Alle forsøkene er brukt."
    }`;
  if (o.kind === "venter")
    return pendingIsDurable()
      ? "Fikk ikke levert ennå. Resultatet er lagret og sendes av seg selv når nettet virker (fristen er 15 minutter)."
      : "Fikk ikke levert ennå. Resultatet sendes av seg selv når nettet virker – la appen stå åpen, for nettleseren " +
          "kunne ikke lagre det (fristen er 15 minutter).";
  return CONTROL_REFUSAL_TEXT[o.reason];
}

/**
 * Ukens kontrollrom (B-387) på kortet: ukens kvalitet, forsøkene, beste resultat, og knappene for trening og tellende
 * forsøk. Et tellende forsøk startes på serveren (brukt fra nå av) og spilles med serverens frø; trening bruker egne frø.
 * Monteres på nytt når kontoen byttes (`key`), så et resultat som venter, bare gjelder kontoen det hører til (B-397).
 */
function WeeklyControlPanel({ act, user }: { act: GameApi["act"]; user: string }) {
  const status = useWeekly();
  const c = status?.control ?? null;
  const [play, setPlay] = useState<Play | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitText, setSubmitText] = useState<string | null>(null);
  const [pending, setPendingState] = useState(() => pendingControl(user));

  const refresh = () => void fetchWeeklyStatus().then(setWeeklyStatus, () => {});

  // Et tellende forsøk eies av dette panelet: skallet låses så panelet ikke monteres på nytt når skjermen snus (B-427)
  const countedOpen = !!play?.counted;
  useEffect(() => (countedOpen ? lockLayout() : undefined), [countedOpen]);

  // Et resultat som ikke ble levert (nettfeil), sendes når kortet vises og deretter hvert 20. sekund
  useEffect(() => {
    if (!pendingControl(user)) return;
    const tryFlush = () =>
      void flushPendingControl().then((o) => {
        setPendingState(pendingControl(user));
        if (o.kind !== "venter") {
          setMessage(outcomeText(o, c?.attempts ?? 3));
          refresh();
        }
      });
    tryFlush();
    const t = setInterval(tryFlush, 20_000);
    return () => clearInterval(t);
  }, [pending?.id, c?.attempts, user]);

  if (!c) return null;
  const grade = weeklyGrade(c.grade);
  const left = Math.max(0, c.attempts - c.used);
  const openWithoutResult = c.open && pending?.id !== c.open.id ? c.open : null;

  const pause = () => pauseGame(act);
  const resume = () => resumeGame(act);
  const startTraining = () => {
    pause();
    setSubmitText(null);
    setPlay({ counted: false, seed: trainingSeed(), key: nextKey() });
  };
  const startCounted = async () => {
    setConfirm(false);
    setBusy(true);
    setMessage(null);
    try {
      const r = await startControlAttempt();
      if (!r.ok) {
        setMessage(CONTROL_REFUSAL_TEXT[r.reason]);
        refresh();
        return;
      }
      pause();
      setSubmitText(null);
      setPlay({ counted: true, attempt: r.attempt, key: nextKey(), scored: false });
    } finally {
      setBusy(false);
    }
  };
  const giveUp = async (id: number) => {
    setBusy(true);
    try {
      await abandonControlAttempt(id);
      setPendingState(pendingControl(user));
      setMessage("Forsøket er gitt opp og teller 0.");
      refresh();
    } catch {
      setMessage(CONTROL_REFUSAL_TEXT.nett);
    } finally {
      setBusy(false);
    }
  };

  const mode: WeeklyMode | null = play
    ? {
        counted: play.counted,
        label: play.counted ? `forsøk ${play.attempt.attempt} av ${c.attempts}` : "trening",
        status: submitText,
        onScore: (score, inputs) => {
          if (!play.counted) return;
          setPlay({ ...play, scored: true });
          setSubmitText("Leverer …");
          void submitControlAttempt({
            user,
            id: play.attempt.id,
            points: score.points,
            stars: score.rating,
            log: inputs,
            deadline: play.attempt.deadline,
          }).then((o) => {
            setPendingState(pendingControl(user));
            setSubmitText(outcomeText(o, c.attempts));
            refresh();
          });
        },
        onClose: (aborted) => {
          if (play.counted && aborted && !play.scored) void giveUp(play.attempt.id);
          setPlay(null);
          resume();
          refresh();
        },
        onAgain: play.counted ? undefined : () => setPlay({ counted: false, seed: trainingSeed(), key: nextKey() }),
      }
    : null;

  return (
    <div className="g-week-control">
      <p>
        Ukens kvalitet: <strong>{GRADES[grade].name}</strong>. Forsøk brukt: {c.used} av {c.attempts}
        {c.best !== null && (
          <>
            {" "}
            · ditt beste: <strong>{fmtNum(c.best)} poeng</strong>
          </>
        )}
        .
      </p>
      {pending && <p className="g-note">Et resultat venter på å bli levert ({fmtNum(pending.points)} poeng) …</p>}
      {openWithoutResult && (
        <p className="g-note g-warn">
          Forsøk {openWithoutResult.attempt} ble startet, men ikke fullført. Det teller 0 når fristen går ut.{" "}
          <button className="g-link" disabled={busy} onClick={() => void giveUp(openWithoutResult.id)}>
            Gi opp nå
          </button>
        </p>
      )}
      {message && (
        <p className="g-muted" aria-live="polite">
          {message}
        </p>
      )}
      <div className="g-row g-week-control-actions">
        <button onClick={startTraining}>
          <Icon name="gamepad-2" /> Øv på ukens kvalitet
        </button>
        <button
          className="g-primary"
          disabled={busy || left === 0 || !!c.open || !!pending}
          onClick={() => setConfirm(true)}
        >
          {left === 0 ? "Alle forsøk er brukt" : `Kjør tellende forsøk (${left} igjen)`}
        </button>
      </div>
      {confirm && (
        <Portal>
          <div className="g-modal" role="alertdialog" aria-modal="true" onClick={() => setConfirm(false)}>
            <div className="g-modal-card" onClick={(e) => e.stopPropagation()}>
              <p>
                Forsøk {c.used + 1} av {c.attempts} brukes når du starter – også hvis du lukker appen. Alle spillerne
                kjører den samme chargen. Klar?
              </p>
              <div className="g-row">
                <button className="g-primary" disabled={busy} onClick={() => void startCounted()}>
                  Start
                </button>
                <button onClick={() => setConfirm(false)}>Vent</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
      {play && mode && (
        <Portal>
          <Suspense fallback={<div className="control-room g-loading">Åpner kontrollrommet …</div>}>
            <ControlRoom
              key={play.key}
              request={weeklyRequest(grade)}
              best={c.best ?? 0}
              seed={play.counted ? play.attempt.seed : play.seed}
              weekly={mode}
              onDone={() => mode.onClose(false)}
            />
          </Suspense>
        </Portal>
      )}
    </div>
  );
}
