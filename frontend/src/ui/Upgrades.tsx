import { buyUpgrade, upgradeOptions, type UpgradeOption } from "../game/actions";
import { STATION_NAMES, stationOptions, type Station } from "./stations";
import { STAGES } from "../game/data";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Card } from "./common";
import { fmtKr, fmtRep } from "./format";
import { buzz } from "./haptics";

/** Knapp som åpner utstyret for et sted; skjules når det ikke finnes noe der ennå */
export function StationButton({
  g,
  station,
  onOpen,
}: {
  g: GameState;
  station: Station;
  onOpen: (s: Station) => void;
}) {
  const options = stationOptions(g, station);
  if (!options.some((o) => !o.locked)) return null;
  const ready = options.filter((o) => o.available).length;
  return (
    <button className="g-small g-station-btn" onClick={() => onOpen(station)}>
      Utstyr{ready > 0 && <span className="g-badge">{ready}</span>}
    </button>
  );
}

function UpgradeCard({ o, act }: { o: UpgradeOption; act: GameApi["act"] }) {
  return (
    <div className={`g-upgrade${o.owned ? " is-owned" : ""}${o.locked ? " is-locked" : ""}`}>
      <div className="g-contract-head">
        <strong>{o.name}</strong>
        {!o.owned && <span>{fmtKr(o.price)}</span>}
      </div>
      <p className="g-muted">{o.description}</p>
      {o.warning && !o.owned && !o.locked && <p className="g-note g-warn">{o.warning}</p>}
      {o.owned ? (
        <span className="g-badge-ok">I drift</span>
      ) : o.locked ? (
        <span className="g-muted">Krever {STAGES[o.stage].name.toLowerCase()}</span>
      ) : (
        <div className="g-row">
          <button
            className="g-primary g-small"
            disabled={!o.available}
            onClick={() => {
              act((g) => buyUpgrade(g, o.id));
              buzz(20);
            }}
          >
            Kjøp
          </button>
          {o.reason && <span className="g-muted">{o.reason}</span>}
        </div>
      )}
    </div>
  );
}

export function UpgradeSheet({
  g,
  station,
  act,
  onClose,
}: {
  g: GameState;
  station: Station;
  act: GameApi["act"];
  onClose: () => void;
}) {
  const options = stationOptions(g, station);
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-label={STATION_NAMES[station]} onClick={onClose}>
      <div className="g-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="g-card-head">
          <h2>{STATION_NAMES[station]}</h2>
          <button onClick={onClose} aria-label="Lukk">
            ✕
          </button>
        </header>
        <div className="g-upgrades">
          {options.map((o) => (
            <UpgradeCard key={o.id} o={o} act={act} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Neste nivå: krav, hva det gir, og flytteknappen – rett på Verket */
export function StageCard({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const stage = upgradeOptions(g).find((o) => o.kind === "stage");
  const next = STAGES[g.stage + 1];
  if (!next || !stage) {
    return (
      <Card title="Storverket">
        <p>Du har bygget et fullskala stålverk. Klarer du å samle {fmtKr(100_000_000)} i egenkapital?</p>
      </Card>
    );
  }
  return (
    <Card title={`Mål: ${next.name}`} className="g-stage-card">
      <p className="g-muted">{next.description}</p>
      <ul className="g-checks">
        <li className={g.reputation >= next.reputation ? "ok" : "bad"}>
          Omdømme {fmtRep(g.reputation)} av {next.reputation}
          {g.reputation < next.reputation && (
            <span className="g-muted"> – lever flere kontrakter i tide for å komme dit</span>
          )}
        </li>
        <li className={g.cash >= next.price ? "ok" : "bad"}>
          {fmtKr(next.price)} (du har {fmtKr(Math.floor(Math.max(0, g.cash)))})
        </li>
      </ul>
      <details className="g-role-group">
        <summary>Hva får jeg?</summary>
        <ul className="g-closed">
          <li>
            Plass til {next.staffCap} ansatte, {Math.round(next.yardT)} t skrap og {Math.round(next.storeT)} t
            ferdigvare
          </li>
          <li>
            Faste kostnader øker fra {fmtKr(STAGES[g.stage].fixedPerDay)} til {fmtKr(next.fixedPerDay)} per døgn
          </li>
          {next.id === 2 && <li>Du blir daglig leder og står ikke lenger i produksjonen selv.</li>}
        </ul>
      </details>
      <button
        className="g-primary"
        disabled={!stage.available}
        onClick={() => {
          act((gg) => buyUpgrade(gg, stage.id));
          buzz(30);
        }}
      >
        Flytt inn i {next.name.toLowerCase()}
      </button>
    </Card>
  );
}
