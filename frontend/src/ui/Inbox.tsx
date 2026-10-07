import { useEffect, useState } from "react";
import { SheetHead } from "./ds";
import { importantLog, markAllSeen } from "../game/inbox";
import type { GameState, LogLink } from "../game/types";
import type { GameApi } from "../game/useGame";
import { fmtClock } from "./format";

/**
 * Varsellista (B-089): de siste viktige hendelsene samlet på ett sted, så ingenting går tapt
 * når varslene på skjermen forsvinner fort (særlig på 10×). Vanlig info står bare i loggen.
 */
type Filter = "alle" | "bad" | "event" | "good";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "bad", label: "Problemer" },
  { id: "event", label: "Hendelser" },
  { id: "good", label: "Gode nyheter" },
];

/** Teksten på knappen for et varsel med lenke (B-453) */
const LINK_LABEL: Record<LogLink, string> = { industri: "Gå til selskapet" };

export function InboxSheet({
  g,
  act,
  onClose,
  onLink,
}: {
  g: GameState;
  act: GameApi["act"];
  onClose: () => void;
  /** Et varsel med lenke fører rett dit (B-453) */
  onLink: (to: LogLink) => void;
}) {
  const [filter, setFilter] = useState<Filter>("alle");
  // Det som var nytt da lista ble åpnet, merkes, og alt regnes som sett
  // (de som alt var fulgt fra varsellinja, er ikke nye – B-473)
  const [seenBefore] = useState(() => ({ id: g.inboxSeenId ?? 0, read: new Set(g.inboxRead ?? []) }));
  const isNew = (id: number) => id > seenBefore.id && !seenBefore.read.has(id);
  useEffect(() => {
    act((gg) => markAllSeen(gg));
  }, [act]);
  const entries = importantLog(g)
    .filter((e) => filter === "alle" || e.kind === filter)
    .slice(-60)
    .reverse();
  return (
    <div className="g-modal g-side-sheet" role="dialog" aria-modal="true" aria-label="Varsler" onClick={onClose}>
      <div className="g-modal-card g-inbox" onClick={(e) => e.stopPropagation()}>
        <SheetHead title="Varsler" icon="bell" onClose={onClose} />
        <div className="g-subtabs g-inbox-tabs" role="tablist" aria-label="Vis">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className={filter === f.id ? "is-active" : ""}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        {entries.length ? (
          <ul className="g-log">
            {entries.map((e) => (
              <li key={e.id} className={`log-${e.kind}${isNew(e.id) ? " is-new" : ""}`}>
                <span className="g-log-time">
                  Dag {Math.floor(e.min / 1440) + 1} {fmtClock(e.min)}
                  {isNew(e.id) && <span className="g-badge g-badge-new">Ny</span>}
                </span>
                {e.text}
                {e.link && (
                  <button className="g-link g-log-go" onClick={() => onLink(e.link!)}>
                    {LINK_LABEL[e.link]}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="g-muted">Ingen varsler her ennå.</p>
        )}
        <p className="g-muted">
          Under Innstillinger (tannhjulet) kan du velge hvilke varsler som dukker opp på skjermen.
        </p>
      </div>
    </div>
  );
}
