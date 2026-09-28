/**
 * Topplista (B-127). Arket bak pokalen ved varsellinja (B-133). Fire lister, hentet fra serveren og oppdatert mens den er
 * åpen (B-144). Uten konto vises lista likevel, med en oppfordring om å logge inn. Formen fra UI-4b (B-224).
 */
import { useEffect, useState } from "react";
import { Place } from "./Place";
import { cloudConfigured } from "../net/config";
import {
  BADGE_NAMES,
  BOARDS,
  fetchLeaderboard,
  fetchMyRank,
  fetchProfile,
  levelLabel,
  LINKED_SHOWN_FROM,
  type BoardKind,
  type BoardRow,
} from "../net/leaderboard";
import { SeasonJoin, SeasonLine } from "./Season";
import { fetchSeasonHistory, type SeasonResult } from "../net/season";
import type { GameApi } from "../game/useGame";
import type { GameState } from "../game/types";
import { useSeasonStatus } from "./useSeason";
import { getSession, onSessionChange } from "../net/supabase";
import { cloudStatus, onCloudStatus } from "../net/sync";
import { useSyncExternalStore } from "react";
import { Callout, SheetHead } from "./ds";
import { fmtKr, fmtNum, fmtRep } from "./format";
import { Icon } from "./icons";

/** Spillerens egne resultater fra sesonger som er over (B-143) */
function SeasonHistory() {
  const [results, setResults] = useState<SeasonResult[]>([]);
  useEffect(() => {
    let alive = true;
    void fetchSeasonHistory()
      .then((r) => alive && setResults(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!results.length) return null;
  return (
    <details className="g-details g-season-history">
      <summary>Dine sesonger ({results.length})</summary>
      <ul>
        {results.map((r) => (
          <li key={r.seasonId}>
            <strong>
              {r.name}: {r.plass <= 3 && <Place plass={r.plass} />} {r.plass}. plass
            </strong>{" "}
            av {r.players} · {fmtKr(r.equity)} · {levelLabel({ stage: r.stage, league: resultLeague(r) })}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** «gull» når resultatet var et konsern (storverk og over 1 mrd.), så merket blir «Konsern» */
function resultLeague(r: SeasonResult): string {
  return r.stage >= 4 && r.equity >= 1_000_000_000 ? "gull" : "";
}

/** Hvor ofte en åpen toppliste hentes på nytt (B-144) */
const BOARD_POLL_MS = 15_000;

function fmtValue(kind: BoardKind, v: number): string {
  const unit = BOARDS.find((b) => b.id === kind)?.unit;
  if (unit === "kr") return fmtKr(v);
  if (unit === "rep") return fmtRep(v);
  if (unit === "poeng") return `${fmtNum(Math.floor(v))} poeng`;
  return `dag ${Math.round(v)}`;
}

/**
 * Topplista som eget ark bak pokalen (B-133, B-214). UI-4b (B-224): ikoner i toppen (oppdater, lukk), sesong eller Hall of
 * Fame som valg, din plass for seg øverst, lasteskisse mens lista hentes, og forklaringen bak «Slik virker lista».
 */
export function LeaderboardSheet({
  api,
  g,
  onClose,
  onOpenSettings,
  initialKind = "verdi",
}: {
  api: GameApi;
  g: GameState;
  onClose: () => void;
  onOpenSettings: () => void;
  /** Lista som vises først, f.eks. kontrollrommet fra resultatet der (B-295) */
  initialKind?: BoardKind;
}) {
  if (!cloudConfigured()) return null;
  return (
    <div className="g-modal g-side-sheet" role="dialog" aria-modal="true" aria-label="Toppliste" onClick={onClose}>
      <div className="g-modal-card g-board-sheet" onClick={(e) => e.stopPropagation()}>
        <Leaderboard
          api={api}
          g={g}
          initialKind={initialKind}
          onClose={onClose}
          onOpenSettings={() => {
            onClose();
            onOpenSettings();
          }}
        />
      </div>
    </div>
  );
}

function Leaderboard({
  onOpenSettings,
  onClose,
  api,
  g,
  initialKind,
}: {
  onOpenSettings: () => void;
  onClose: () => void;
  api: GameApi;
  g: GameState;
  initialKind: BoardKind;
}) {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const [kind, setKind] = useState<BoardKind>(initialKind);
  // Denne sesongen eller Hall of Fame (B-129, B-182)
  const [scope, setScope] = useState<"sesong" | "alle">("sesong");
  const status = useSeasonStatus();
  const current = status?.current ?? null;
  // Kontrollrommet har én liste for alle tider (B-295): rekorden følger kontoen, ikke sesongen
  const seasonId = scope === "sesong" && kind !== "kontroll" && kind !== "utbetalt" ? (current?.id ?? null) : null;
  const hallOfFame = seasonId === null;
  // Radene huskes sammen med lista de hører til (B-171): bytter man liste, vises ikke tallene fra den forrige
  const key = `${kind}:${seasonId ?? "alle"}`;
  const [loaded, setLoaded] = useState<{ key: string; rows: BoardRow[]; at: number } | null>(null);
  const rows = loaded && loaded.key === key ? loaded.rows : null;
  const [loading, setLoading] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [nickname, setNickname] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await Promise.resolve();
        if (!alive) return;
        setError(null);
        setLoading(true);
        const [list, rank, profile] = await Promise.all([
          fetchLeaderboard(kind, seasonId),
          session ? fetchMyRank(kind, seasonId).catch(() => null) : Promise.resolve(null),
          session ? fetchProfile().catch(() => null) : Promise.resolve(null),
        ]);
        if (!alive) return;
        setLoaded({ key: `${kind}:${seasonId ?? "alle"}`, rows: list, at: Date.now() });
        setMyRank(rank);
        setNickname(profile ? profile.nickname : null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [kind, session, tick, seasonId]);

  // Lista hentes på nytt mens den er åpen, så den følger med mens man spiller (B-144). Snapshots lastes opp med
  // lagringen på nett (ca. hvert 15. sekund), så oftere enn det gir ikke noe nytt.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setTick((x) => x + 1);
    }, BOARD_POLL_MS);
    return () => clearInterval(t);
  }, []);

  const me = rows?.find((r) => r.is_me) ?? null;
  const board = BOARDS.find((b) => b.id === kind)!;
  return (
    <>
      <SheetHead title={scope === "alle" && current ? "Hall of Fame" : "Toppliste"} onClose={onClose}>
        {/* Knappen viser at den henter, og når lista sist ble hentet (B-171) */}
        <button
          className={`g-icon-btn g-board-reload${loading ? " is-loading" : ""}`}
          onClick={() => setTick((t) => t + 1)}
          aria-label="Oppdater topplista"
          aria-busy={loading}
        >
          <Icon name="refresh" />
        </button>
      </SheetHead>
      <SeasonLine />
      <SeasonJoin api={api} g={g} onOpenSettings={onOpenSettings} />
      {current && (
        <div className="g-subtabs g-board-scope" role="tablist" aria-label="Sesong eller Hall of Fame">
          <button
            role="tab"
            aria-selected={scope === "sesong"}
            className={scope === "sesong" ? "is-active" : ""}
            onClick={() => setScope("sesong")}
          >
            {current.name}
          </button>
          <button
            role="tab"
            aria-selected={scope === "alle"}
            className={scope === "alle" ? "is-active" : ""}
            onClick={() => setScope("alle")}
          >
            <Icon name="trophy" /> Hall of Fame
          </button>
        </div>
      )}
      <div className="g-subtabs g-board-tabs" role="tablist" aria-label="Liste">
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
      <p className="g-muted g-small-text g-board-scope-note">
        {kind === "utbetalt"
          ? "Det verket har tjent over taket for kassa og betalt ut til eierne – samme liste i sesongen og i Hall of Fame."
          : kind === "kontroll"
            ? "Beste charge noensinne i kontrollrommet – samme liste i sesongen og i Hall of Fame."
            : hallOfFame
              ? `Beste resultat noensinne${status?.era ? ` i ${status.era.name}` : ""}: ${board.label.toLowerCase()}.`
              : `Spillet slik det står nå: ${board.label.toLowerCase()}.`}
      </p>
      {!session && (
        <Callout>
          Logg inn for å være med på lista.{" "}
          <button className="g-link" onClick={onOpenSettings}>
            Åpne innstillinger
          </button>
        </Callout>
      )}
      {session && nickname === null && (
        <Callout tone="heat">
          Velg et brukernavn under Innstillinger (tannhjulet) → Konto, så kommer du med på lista.{" "}
          <button className="g-link" onClick={onOpenSettings}>
            Velg brukernavn
          </button>
        </Callout>
      )}
      {session && <OwnSaveNote />}
      {/* Din plass for seg øverst (B-224), også når du står lenger ned enn lista viser */}
      {session && nickname && (me || myRank !== null) && (
        <div className="g-board-me" aria-label="Din plass">
          <span className="g-board-me-rank">
            <Place plass={me?.plass ?? myRank!} />
          </span>
          <span className="g-board-me-name">
            <strong>{nickname}</strong>
            <span className="g-muted g-small-text">Din plass</span>
          </span>
          {me && <span className="g-board-value">{fmtValue(kind, me.value)}</span>}
        </div>
      )}
      {error && <Callout tone="critical">{error}</Callout>}
      {rows === null && !error && (
        <ol className="g-board is-loading" aria-label="Henter topplista">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i}>
              <span className="g-board-skel" />
            </li>
          ))}
        </ol>
      )}
      {rows && rows.length === 0 && <p className="g-muted">Ingen på lista ennå. Du kan bli den første.</p>}
      {rows && rows.length > 0 && (
        <ol className="g-board">
          {rows.map((r) => (
            <li key={r.plass} className={`${r.is_me ? "is-me" : ""}${r.plass <= 3 ? " is-top" : ""}`}>
              <span className={`g-board-rank${r.plass <= 3 ? " is-medal" : ""}`}>
                <Place plass={r.plass} />
              </span>
              <span className="g-board-name">
                <span className="g-board-line">
                  <span className="g-board-nick">{r.nickname}</span>
                  <em className="g-league">{levelLabel(r)}</em>
                </span>
                {/* Æresmerker fra serveren (B-299), f.eks. for dem som var med da økonomireformen kom */}
                {r.badges.map((b) => (
                  <span key={b} className="g-board-honor">
                    <Icon name="scroll-text" /> {BADGE_NAMES[b]}
                  </span>
                ))}
                {/* Beste plassering i en sesong som er over (B-143) */}
                {r.honor && (
                  <span className="g-board-honor">
                    {r.honorIcon && <Icon name={r.honorIcon} />} {r.honor}
                  </span>
                )}
                {/* Spilt uten konto før innloggingen (B-170): forklarer en rask vekst på lista */}
                {r.linked_day !== null && r.linked_day >= LINKED_SHOWN_FROM && (
                  <span className="g-board-honor">Koblet til på dag {r.linked_day}</span>
                )}
              </span>
              <span className="g-board-value">{fmtValue(kind, r.value)}</span>
            </li>
          ))}
        </ol>
      )}
      {rows && loaded && (
        <p className="g-muted g-small-text">
          Oppdatert kl.{" "}
          {new Date(loaded.at).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      )}
      {session && <SeasonHistory />}
      <details className="g-details">
        <summary>Slik virker lista</summary>
        <p className="g-muted g-small-text">
          Lista regnes ut på serveren av det som er lagret på nett, én gang per spilldøgn, og oppdaterer seg mens du
          spiller. I sesongen gjelder spillet du har nå; i «Hall of Fame» står ditt beste resultat. Merket ved navnet
          viser hvor langt spilleren har kommet: fra Garasje til Storverk, Konsern når konsernverdien passerer 1 mrd.,
          og en tittel fra 10 mrd. (Stålbaron, Stålmagnat, Stålfyrste, Stålkonge, Stålkeiser, Stållegende ved 400 mrd.
          og videre til Stålikon ved 5 000 mrd. – omtrent hele stålindustrien i verden). Ved navnet står også den beste
          plasseringen i en sesong som er over: en pokal for vinneren og en medalje for topp 10. «Koblet til på dag N»
          betyr at spillet ble spilt uten konto før det: da kan det ha vokst fort på lista. Kontoer med urimelig vekst
          holdes utenfor.
        </p>
      </details>
    </>
  );
}

/**
 * Ditt eget tall på lista kommer fra lagringen på nett. Virker ikke lagringen, står tallet stille mens de andres øker
 * (B-165): da sier lista det, og når det sist ble lagret.
 */
function OwnSaveNote() {
  const status = useSyncExternalStore(onCloudStatus, cloudStatus, cloudStatus);
  if (status.kind !== "offline" && status.kind !== "error" && status.kind !== "conflict") return null;
  const at =
    status.kind !== "conflict" && status.at
      ? ` siden kl. ${new Date(status.at).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}`
      : "";
  return (
    <p className="g-note g-warn">
      {status.kind === "conflict"
        ? "Spillet er lagret fra en annen enhet, så tallet ditt her oppdateres ikke. Åpne spillet der du vil spille."
        : `Spillet ditt er ikke lagret på nett${at}, så tallet ditt står stille. Det oppdateres av seg selv når nettet virker igjen.`}
    </p>
  );
}
