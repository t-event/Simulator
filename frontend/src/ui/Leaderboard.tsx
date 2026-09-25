/**
 * Topplista (B-127). Står under Verket → Økonomi. Fire lister, hentet fra serveren.
 * Uten konto vises lista likevel, med en oppfordring om å logge inn.
 */
import { useEffect, useState } from "react";
import { cloudConfigured } from "../net/config";
import {
  BOARDS,
  fetchLeaderboard,
  fetchMyRank,
  fetchProfile,
  LEAGUE_NAMES,
  type BoardKind,
  type BoardRow,
} from "../net/leaderboard";
import { SeasonJoin, SeasonLine } from "./Season";
import type { GameApi } from "../game/useGame";
import type { GameState } from "../game/types";
import { useSeasonStatus } from "./useSeason";
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

export function Leaderboard({ onOpenSettings, api, g }: { onOpenSettings?: () => void; api?: GameApi; g?: GameState }) {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const [kind, setKind] = useState<BoardKind>("verdi");
  // Denne sesongen eller alle tider (B-129)
  const [scope, setScope] = useState<"sesong" | "alle">("sesong");
  const status = useSeasonStatus();
  const seasonId = scope === "sesong" ? (status?.current?.id ?? null) : null;
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
          fetchLeaderboard(kind, seasonId),
          session ? fetchMyRank(kind, seasonId).catch(() => null) : Promise.resolve(null),
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
  }, [kind, session, tick, seasonId]);

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
      <SeasonLine />
      {api && g && <SeasonJoin api={api} g={g} onOpenSettings={onOpenSettings} />}
      {status?.current && (
        <div className="g-subtabs g-board-scope" role="tablist" aria-label="Sesong eller alle tider">
          <button
            role="tab"
            aria-selected={scope === "sesong"}
            className={scope === "sesong" ? "is-active" : ""}
            onClick={() => setScope("sesong")}
          >
            Denne sesongen
          </button>
          <button
            role="tab"
            aria-selected={scope === "alle"}
            className={scope === "alle" ? "is-active" : ""}
            onClick={() => setScope("alle")}
          >
            Alle tider
          </button>
        </div>
      )}
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
              <span className="g-board-name">
                {r.nickname} <em className={`g-league is-${r.league}`}>{LEAGUE_NAMES[r.league] ?? r.league}</em>
              </span>
              <span className="g-board-value">{fmtValue(kind, r.value)}</span>
            </li>
          ))}
        </ol>
      )}
      {session && nickname && myRank !== null && !rows?.some((r) => r.is_me) && (
        <p className="g-muted g-small-text">Du er nr. {myRank}.</p>
      )}
      <p className="g-muted g-small-text">
        Lista regnes ut på serveren av det som er lagret på nett, én gang per spilldøgn. Ligaer: Bronse til og med
        stålverket, Sølv på storverket, Gull når konsernverdien passerer 1 mrd. Kontoer med urimelig vekst holdes
        utenfor.
      </p>
    </Card>
  );
}
