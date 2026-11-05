/**
 * «Bygg på nytt» (B-517): kortet på Mål → I dag for veteraner som er ferdige med storverket, og arket som forklarer hva
 * som står og hva som starter på nytt. Gradvis synlighet: kortet vises først når spilleren kan velge det (`canRebuild`).
 */
import { useState } from "react";
import { canRebuild, REBUILD, rebuildFp } from "../game/rebuild";
import type { GameState } from "../game/types";
import { Card } from "./common";
import { Button, Callout, SheetHead } from "./ds";
import { Portal } from "./Portal";

export function RebuildCard({ g, onRebuild }: { g: GameState; onRebuild: () => boolean }) {
  const [open, setOpen] = useState(false);
  if (!canRebuild(g)) return null;
  const times = g.rebuilds ?? 0;
  return (
    <Card title="Bygg på nytt" className="g-rebuild-card">
      <p>
        {times > 0
          ? `Du har bygget storverket ${times + 1} ganger. Klarer du det raskere enda en gang?`
          : "Du har bygget storverket. Vil du ta reisen fra garasjen igjen – med alt du har lært?"}{" "}
        Konsernet og merkene dine blir stående.
      </p>
      <Button icon="refresh" onClick={() => setOpen(true)}>
        Se hva det betyr
      </Button>
      {open && <RebuildSheet g={g} onClose={() => setOpen(false)} onRebuild={onRebuild} />}
    </Card>
  );
}

function RebuildSheet({ g, onClose, onRebuild }: { g: GameState; onClose: () => void; onRebuild: () => boolean }) {
  const [sure, setSure] = useState(false);
  const next = (g.rebuilds ?? 0) + 1;
  return (
    <Portal>
      <div className="g-modal g-side-sheet" role="dialog" aria-modal="true" aria-label="Bygg på nytt" onClick={onClose}>
        <div className="g-modal-card g-rebuild-sheet" onClick={(e) => e.stopPropagation()}>
          <SheetHead title="Bygg på nytt" icon="refresh" onClose={onClose} />
          <p>Du selger storverket og starter i garasjen igjen. Ingen må – det er for deg som vil ha reisen tilbake.</p>
          <h3>Det som står</h3>
          <ul className="g-small-text">
            <li>Konsernet, konsernkassa og selskapene dine. Utbyttet fra datterverkene betales som før.</li>
            <li>Prestasjoner, pynt, merker, fagboka og rekordene dine.</li>
          </ul>
          <h3>Det som starter på nytt</h3>
          <ul className="g-small-text">
            <li>Hjemmeverket, kassa hjemme, forskning, mesterskap, fagpoeng og de ansatte.</li>
            <li>Salgsdirektøren slutter, siden jobben hørte til storverket.</li>
          </ul>
          <Callout tone="heat">
            Bidraget fra hjemmeverket til konsernkassa følger verket hjemme, så det blir lite til storverket står igjen.
          </Callout>
          <h3>Det du får</h3>
          <ul className="g-small-text">
            <li>
              Forskning fra start: 3× fart og flere skrapleverandører ({REBUILD.freeResearch.length} forskninger), og{" "}
              {rebuildFp(next)} fagpoeng.
            </li>
            <li>Prestasjonen «Bygget på nytt», og et nytt forsøk på topplista «Raskest til storverk».</li>
          </ul>
          <label className="g-toggle">
            <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} />
            <span>Jeg vil selge storverket og starte i garasjen.</span>
          </label>
          <div className="g-row g-end-actions">
            <Button onClick={onClose}>Avbryt</Button>
            <Button
              variant="danger"
              icon="refresh"
              disabled={!sure}
              onClick={() => {
                if (onRebuild()) onClose();
              }}
            >
              Bygg på nytt
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
