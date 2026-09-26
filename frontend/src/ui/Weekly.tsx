/**
 * Ukens utfordring (B-152): kortet på Verket med ukas oppgave, plassen din i ligaen, medaljene og ukekista, og lista
 * for uka. Krever konto for å være med (docs/KONTO.md); lista kan leses uten.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { awardPoints, log } from "../game/engine";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { getSession, onSessionChange } from "../net/supabase";
import { isReconciled, onCloudStatus } from "../net/sync";
import {
  chestFp,
  claimWeekChest,
  fetchWeeklyBoard,
  fetchWeeklyStatus,
  LEAGUES,
  onWeeklyChange,
  setWeeklyStatus,
  WEEK_KINDS,
  weekDaysLeft,
  weeklyStatus,
  type League,
  type WeekKind,
  type WeeklyRow,
} from "../net/weekly";
import { placeLabel } from "../net/leaderboard";
import { NeedsAccount } from "./Account";
import { Card } from "./common";
import { fmtKr, fmtNum, fmtT } from "./format";
import { buzz } from "./haptics";
import { Portal } from "./Portal";

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
  if (kind === "vekst") return `+${fmtKr(v)}`;
  if (kind === "tonn") return fmtT(v);
  return `${fmtNum(v, 0)} døgn`;
}

export function WeeklyCard({ g, act, onLogin }: { g: GameState; act: GameApi["act"]; onLogin?: () => void }) {
  const session = useSession();
  const reconciled = useReconciled();
  const status = useWeekly();
  const [board, setBoard] = useState(false);
  const [busy, setBusy] = useState(false);
  const user = session?.user.id ?? null;

  // Status ved innlogging og hvert femte minutt; plassen endrer seg når spillet lagres på nett
  useEffect(() => {
    if (!user || !reconciled) return;
    const load = () => void fetchWeeklyStatus().then(setWeeklyStatus, () => {});
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, [user, reconciled]);

  // Uten konto: vises først etter garasjen, så nybegynneren ikke møter to låste kort med én gang
  if (!session)
    return g.stage < 1 ? null : (
      <Card title="Ukens utfordring">
        <NeedsAccount feature="ukens" onLogin={onLogin} />
      </Card>
    );
  if (!status) return null;
  const kind = WEEK_KINDS[status.kind];
  const left = weekDaysLeft(status);
  const m = status.medals;
  const open = async () => {
    setBusy(true);
    try {
      const fp = await claimWeekChest();
      if (fp > 0)
        act((gg) => {
          awardPoints(gg, fp);
          log(gg, `🎁 Ukekista er åpnet: +${fp} fagpoeng.`, "good");
        });
      buzz(40);
      setWeeklyStatus({ ...status, chest: null });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card
      title="Ukens utfordring"
      right={
        <button className="g-small" onClick={() => setBoard(true)}>
          🏅 Lista
        </button>
      }
    >
      {status.chest && (
        <div className="g-note g-week-chest">
          <span>
            🎁 <strong>Ukekiste!</strong>{" "}
            {status.chest.count > 1
              ? `${status.chest.count} kister venter`
              : `Du ble nr. ${status.chest.best} i ligaen forrige uke`}{" "}
            – {status.chest.fp} fagpoeng.
          </span>
          <button className="g-primary" disabled={busy} onClick={() => void open()}>
            Åpne kista
          </button>
        </div>
      )}
      <p>
        <strong>{kind.title}</strong> i {LEAGUES[status.league].toLowerCase()}.{" "}
        <span className="g-muted">{kind.how}</span>
      </p>
      <p>
        {status.plass
          ? `Du er nr. ${status.plass} av ${status.players} (${fmtValue(status.kind, status.value ?? 0)}).`
          : "Du er ikke på lista ennå – den fylles når spillet lagres på nett."}{" "}
        <span className="g-muted">
          {left <= 1 ? "Siste dag!" : `${left} dager igjen.`} Topp 3 får medalje og ukekiste ({chestFp(3)}–{chestFp(1)}{" "}
          fagpoeng).
        </span>
      </p>
      {m.gold + m.silver + m.bronze > 0 && (
        <p className="g-muted">
          Dine medaljer: 🥇 {m.gold} · 🥈 {m.silver} · 🥉 {m.bronze}
        </p>
      )}
      {board && <WeeklyBoard g={g} league={status.league} kind={status.kind} onClose={() => setBoard(false)} />}
    </Card>
  );
}

function WeeklyBoard({
  league: mine,
  kind,
  onClose,
}: {
  g: GameState;
  league: League;
  kind: WeekKind;
  onClose: () => void;
}) {
  const [league, setLeague] = useState<League>(mine);
  // Svaret huskes med ligaen det gjelder, så en annen liga viser «Henter …» til den er hentet
  const [data, setData] = useState<{ league: League; rows: WeeklyRow[] | null } | null>(null);
  const rows = data?.league === league ? data.rows : null;
  const error = data?.league === league && data.rows === null;
  useEffect(() => {
    let alive = true;
    fetchWeeklyBoard(league).then(
      (r) => alive && setData({ league, rows: r }),
      () => alive && setData({ league, rows: null }),
    );
    return () => {
      alive = false;
    };
  }, [league]);
  return (
    <Portal>
      <div className="g-modal" role="dialog" aria-modal="true" aria-label="Ukens utfordring" onClick={onClose}>
        <div className="g-modal-card" onClick={(e) => e.stopPropagation()}>
          <header className="g-card-head">
            <h2>🏅 {WEEK_KINDS[kind].title}</h2>
            <button onClick={onClose} aria-label="Lukk">
              ✕
            </button>
          </header>
          <div className="g-chips" role="tablist" aria-label="Liga">
            {(Object.keys(LEAGUES) as League[]).map((l) => (
              <button
                key={l}
                role="tab"
                aria-selected={league === l}
                className={league === l ? "g-chip-btn is-on" : "g-chip-btn"}
                onClick={() => setLeague(l)}
              >
                {LEAGUES[l]}
              </button>
            ))}
          </div>
          {error ? (
            <p className="g-muted">Fikk ikke hentet lista. Prøv igjen senere.</p>
          ) : !rows ? (
            <p className="g-muted">Henter …</p>
          ) : rows.length === 0 ? (
            <p className="g-muted">Ingen på lista i denne ligaen ennå denne uka.</p>
          ) : (
            <ol className="g-board">
              {rows.map((r) => (
                <li key={r.plass} className={r.isMe ? "is-me" : ""}>
                  <span className={`g-board-rank${r.plass <= 3 ? " is-medal" : ""}`}>{placeLabel(r.plass)}</span>
                  <span className="g-board-name">
                    <span className="g-board-line">
                      <span className="g-board-nick">{r.nickname}</span>
                    </span>
                    {r.gold > 0 && (
                      <span className="g-board-honor">
                        🥇 vunnet {r.gold} {r.gold === 1 ? "uke" : "uker"}
                      </span>
                    )}
                  </span>
                  <span className="g-board-value">{fmtValue(kind, r.value)}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="g-muted g-small-text">
            Uka går fra mandag til mandag. Ligaen følger hvor langt du har kommet: bronse før storverket, sølv på
            storverket og gull fra 1 mrd. Når uka er over, får topp 3 i hver liga medalje og en ukekiste med fagpoeng.
          </p>
        </div>
      </div>
    </Portal>
  );
}
