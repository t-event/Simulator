/**
 * Topplista (B-127). Står under Verket → Økonomi. Fire lister, hentet fra serveren.
 * Uten konto vises lista likevel, med en oppfordring om å logge inn.
 */
import { useEffect, useState } from "react";
import { cloudConfigured } from "../net/config";
import { BOARDS, fetchLeaderboard, fetchMyRank, fetchProfile, type BoardKind, type BoardRow } from "../net/leaderboard";
import { getSession, onSessionChange } from "../net/supabase";
import { useSyncExternalStore } from "react";
import { Card } from "./common";
import { fmtKr, fmtRep } from "./format";

function fmtValue(kind: BoardKind, v: number): string {
  const unit = BOARDS.find((b) => b.id === kind)?.unit;
  if (unit === "kr") return fmtKr(v);
  if (unit === "rep") return fmtRep(v);
  return `dag ${Math.round(v)}`;
}

export function Leaderboard({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const [kind, setKind] = useState<BoardKind>("verdi");
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [nickname, setNickname] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!cloudConfigured()) return;
    let alive = true;
    void (async () => {
      try {
        await Promise.resolve();
        if (!alive) return;
        setError(null);
        const [list, rank, profile] = await Promise.all([
          fetchLeaderboard(kind),
          session ? fetchMyRank(kind).catch(() => null) : Promise.resolve(null),
          session ? fetchProfile().catch(() => null) : Promise.resolve(null),
        ]);
        if (!alive) return;
        setRows(list);
        setMyRank(rank);
        setNickname(profile ? profile.nickname : null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [kind, session, tick]);

  if (!cloudConfigured()) return null;

  return (
    <Card
      title="Toppliste"
      right={
        <button className="g-small" onClick={() => setTick((t) => t + 1)} aria-label="Oppdater topplista">
          ↻
        </button>
      }
    >
      <div className="g-subtabs g-board-tabs" role="tablist" aria-label="Toppliste">
        {BOARDS.map((b) => (
          <button
            key={b.id}
            role="tab"
            aria-selected={kind === b.id}
            className={kind === b.id ? "is-active" : ""}
            onClick={() => setKind(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>
      {!session && (
        <p className="g-muted g-small-text">
          Logg inn under ⚙️ Innstillinger for å være med på lista.
          {onOpenSettings && (
            <>
              {" "}
              <button className="g-link" onClick={onOpenSettings}>
                Åpne innstillinger
              </button>
            </>
          )}
        </p>
      )}
      {session && nickname === null && (
        <p className="g-note">
          Velg et kallenavn under ⚙️ Innstillinger → Konto, så kommer du med på lista.
          {onOpenSettings && (
            <>
              {" "}
              <button className="g-link" onClick={onOpenSettings}>
                Velg kallenavn
              </button>
            </>
          )}
        </p>
      )}
      {error && <p className="g-account-error">{error}</p>}
      {rows === null && !error && <p className="g-muted">Henter …</p>}
      {rows && rows.length === 0 && <p className="g-muted">Ingen på lista ennå. Du kan bli den første.</p>}
      {rows && rows.length > 0 && (
        <ol className="g-board">
          {rows.map((r) => (
            <li key={r.plass} className={r.is_me ? "is-me" : ""}>
              <span className="g-board-rank">{r.plass}.</span>
              <span className="g-board-name">{r.nickname}</span>
              <span className="g-board-value">{fmtValue(kind, r.value)}</span>
            </li>
          ))}
        </ol>
      )}
      {session && nickname && myRank !== null && !rows?.some((r) => r.is_me) && (
        <p className="g-muted g-small-text">Du er nr. {myRank}.</p>
      )}
      <p className="g-muted g-small-text">
        Lista regnes ut på serveren av det som er lagret på nett, én gang per spilldøgn. Kontoer med urimelig vekst
        holdes utenfor.
      </p>
    </Card>
  );
}
