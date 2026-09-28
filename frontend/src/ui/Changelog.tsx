/**
 * «Hva er nytt» (B-179): vises én gang etter en oppdatering, og hele endringsloggen kan åpnes under ⚙️.
 */
import { SheetHead } from "./ds";
import { CHANGELOG, type ChangelogEntry } from "../game/changelog";
import { Portal } from "./Portal";

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
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
  return (
    <Portal>
      <div className="g-modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
        <div className="g-modal-card g-changelog" onClick={(e) => e.stopPropagation()}>
          <SheetHead title={`🆕 ${title}`} onClose={onClose} />
          {entries.map((e) => (
            <section key={e.b}>
              <h3>
                {e.title} <span className="g-muted">· {fmtDate(e.date)}</span>
              </h3>
              <ul>
                {e.items.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          ))}
          <button className="g-primary" onClick={onClose}>
            Fint!
          </button>
        </div>
      </div>
    </Portal>
  );
}
