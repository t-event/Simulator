/**
 * Byggeprosjekter på storverket (B-336): det store kjøpet som bygges nå (byggetid og innkjøring), og nabolaget –
 * store, synlige bygg i byen for pengene hjemme. Vises når det betyr noe: et bygg pågår, noe er bygget, eller kassa
 * nærmer seg prisen på det neste (gradvis synlighet).
 */
import { bigBuildDaysLeft, hasNeighbor, NEIGHBOR_PROJECTS, nextNeighbor } from "../game/building";
import { buildNeighbor } from "../game/actions";
import { MIN_PER_DAY } from "../game/data";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card } from "./common";
import { fmtKr } from "./format";
import { Icon } from "./icons";

function progress(startMin: number, readyMin: number, now: number): number {
  return Math.min(1, Math.max(0, (now - startMin) / Math.max(1, readyMin - startMin)));
}

export function BuildCard({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const b = g.bigBuild;
  const n = g.neighborhood;
  const next = nextNeighbor(g);
  const building = n.building ? NEIGHBOR_PROJECTS.find((p) => p.id === n.building!.id) : null;
  return (
    <Card title="Byggeprosjekter" className="g-build-card">
      {b && (
        <div className="g-build-now">
          <p className="g-small-text">
            <Icon name="hard-hat" /> <strong>{b.name}</strong> bygges – ferdig om {bigBuildDaysLeft(g)} døgn. Store kjøp
            bygges ett om gangen og kjøres inn over noen døgn.
          </p>
          <Bar value={progress(b.startMin, b.readyMin, g.minute)} tone="accent" label="Bygget" />
        </div>
      )}
      <h3 className="g-subhead">Nabolaget</h3>
      <p className="g-muted g-small-text">
        Store bygg i byen rundt verket. Hvert gir en liten fordel for alltid, og står i bildet av verket.
      </p>
      {n.built.length > 0 && (
        <ul className="g-build-list">
          {NEIGHBOR_PROJECTS.filter((p) => hasNeighbor(g, p.id)).map((p) => (
            <li key={p.id}>
              <Icon name="check" /> <strong>{p.name}</strong> <span className="g-muted">– {p.gives}</span>
            </li>
          ))}
        </ul>
      )}
      {building && n.building ? (
        <div className="g-build-now">
          <p className="g-small-text">
            <strong>{building.name}</strong> bygges – ferdig om{" "}
            {Math.max(0, Math.ceil((n.building.readyMin - g.minute) / MIN_PER_DAY))} døgn.
          </p>
          <Bar
            value={progress(n.building.readyMin - building.days * MIN_PER_DAY, n.building.readyMin, g.minute)}
            tone="accent"
            label="Bygget"
          />
        </div>
      ) : next ? (
        <div className="g-build-next">
          <p className="g-small-text">
            Neste: <strong>{next.name}</strong> – {next.gives} Tar {next.days} døgn.
          </p>
          <button className="g-primary" disabled={g.cash < next.price} onClick={() => act((gg) => buildNeighbor(gg))}>
            Bygg ({fmtKr(next.price)})
          </button>
          {g.cash < next.price && (
            <p className="g-muted g-small-text">Du mangler {fmtKr(Math.ceil(next.price - Math.max(0, g.cash)))}.</p>
          )}
        </div>
      ) : (
        <p className="g-small-text">Alt i nabolaget er bygget. Byen er stolt av verket.</p>
      )}
    </Card>
  );
}
