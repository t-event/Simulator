/**
 * «Hva er nytt» (B-179, B-238): vises én gang etter en oppdatering, og hele endringsloggen kan åpnes under Innstillinger.
 * Oppføringene er samlet per dag («I dag», «I går», dato). De nyeste står åpne; eldre står som én linje hver og åpnes
 * med et trykk. Før sto alt åpent i én lang vegg av punkter.
 */
import { useState } from "react";
import { SheetHead } from "./ds";
import { CHANGELOG, type ChangelogEntry } from "../game/changelog";
import { Portal } from "./Portal";

/** Så mange oppføringer står åpne i hele loggen; resten åpnes én og én */
const OPEN_ENTRIES = 3;
/** Så mange vises før «Vis eldre» */
const FIRST_ENTRIES = 12;

function dayLabel(iso: string, today = new Date()): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((start.getTime() - date.getTime()) / 86_400_000);
  if (diff === 0) return "I dag";
  if (diff === 1) return "I går";
  return date.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

function Items({ e }: { e: ChangelogEntry }) {
  return (
    <ul>
      {e.items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

export function ChangelogSheet({
  entries = CHANGELOG,
  title = "Hva er nytt",
  onClose,
}: {
  entries?: ChangelogEntry[];
  title?: string;
  onClose: () => void;
}) {
  // Etter en oppdatering er alle oppføringene nye og står åpne; i hele loggen bare de nyeste
  const full = entries === CHANGELOG;
  const [all, setAll] = useState(!full);
  const shown = all ? entries : entries.slice(0, FIRST_ENTRIES);
  const days: { day: string; list: { e: ChangelogEntry; i: number }[] }[] = [];
  shown.forEach((e, i) => {
    const day = dayLabel(e.date);
    const last = days[days.length - 1];
    if (last?.day === day) last.list.push({ e, i });
    else days.push({ day, list: [{ e, i }] });
  });
  return (
    <Portal>
      <div className="g-modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
        <div className="g-modal-card g-changelog" onClick={(e) => e.stopPropagation()}>
          <SheetHead title={title} icon="sparkles" onClose={onClose} />
          {!full && (
            <p className="g-muted g-small-text">
              {entries.length === 1 ? "Dette er nytt" : `${entries.length} oppdateringer`} siden sist du spilte.
            </p>
          )}
          {days.map(({ day, list }) => (
            <section key={day} className="g-news-day">
              <h3 className="g-news-date">{day}</h3>
              {list.map(({ e, i }) =>
                !full || i < OPEN_ENTRIES ? (
                  <article key={e.b} className="g-news-entry">
                    <h4>{e.title}</h4>
                    <Items e={e} />
                  </article>
                ) : (
                  <details key={e.b} className="g-news-entry is-closed">
                    <summary>
                      <span>{e.title}</span>
                      <span className="g-muted">{e.items.length}</span>
                    </summary>
                    <Items e={e} />
                  </details>
                ),
              )}
            </section>
          ))}
          {shown.length < entries.length && (
            <button className="g-news-more" onClick={() => setAll(true)}>
              Vis eldre oppdateringer ({entries.length - shown.length})
            </button>
          )}
          <div className="g-news-foot">
            <button className="g-primary" onClick={onClose}>
              Fint!
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
