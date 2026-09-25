import { useState } from "react";
import { buyUpgrade, keyUpgrade, scheduleCastingSwitch, upgradeOptions, type UpgradeOption } from "../game/actions";
import { STATION_NAMES, stationOptions, type Station } from "./stations";
import { STAGES, stageRef, WIN_CASH } from "../game/data";
import { unitType } from "../game/plant";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card } from "./common";
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

function UpgradeCard({
  o,
  stage,
  act,
  scheduled,
}: {
  o: UpgradeOption;
  stage: number;
  act: GameApi["act"];
  scheduled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const buy = () => {
    act((g) => buyUpgrade(g, o.id));
    buzz(20);
  };
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
        <span className="g-muted">Krever {stageRef(o.stage, stage)}</span>
      ) : (
        <div className="g-row">
          <button
            className="g-primary g-small"
            disabled={!o.available}
            onClick={() => (o.confirm ? setAsking(true) : buy())}
          >
            Kjøp
          </button>
          {o.reason && <span className="g-muted">{o.reason}</span>}
          {o.canSchedule &&
            (scheduled ? (
              <button className="g-small" onClick={() => act((g) => scheduleCastingSwitch(g, null))}>
                Planlagt – avbestill
              </button>
            ) : (
              <button className="g-small" onClick={() => act((g) => scheduleCastingSwitch(g, o.id))}>
                Bytt når ordrene er levert
              </button>
            ))}
        </div>
      )}
      {o.canSchedule && scheduled && (
        <p className="g-note">
          Byttet skjer av seg selv når ordrene er levert og det er penger nok. Nye forespørsler på det gamle produktet
          er stoppet imens.
        </p>
      )}
      {asking && o.confirm && (
        <div className="g-modal" role="alertdialog" aria-modal="true">
          <div className="g-modal-card">
            <p>{o.confirm}</p>
            <div className="g-row">
              <button
                className="g-primary"
                onClick={() => {
                  setAsking(false);
                  buy();
                }}
              >
                Ja, bytt
              </button>
              <button onClick={() => setAsking(false)}>Nei</button>
            </div>
          </div>
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
        {station === "ovn" && g.furnaces.length > 1 ? (
          <>
            <p className="g-muted">
              Du har {g.furnaces.length} ovner. Hver ovn bygges om og får utstyr for seg, så du kan oppgradere én om
              gangen.
            </p>
            {[undefined, ...g.furnaces.map((_, i) => i)].map((unit) => {
              const list = options.filter((o) => o.unit === unit);
              if (!list.length) return null;
              return (
                <section key={unit ?? "verket"}>
                  <h3 className="g-subhead">
                    {unit === undefined ? "Hele verket" : `Ovn ${unit + 1} – ${unitType(g, unit).name}`}
                  </h3>
                  <div className="g-upgrades">
                    {list.map((o) => (
                      <UpgradeCard
                        key={o.id}
                        o={o}
                        stage={g.stage}
                        act={act}
                        scheduled={g.pendingCastingSwitch === o.id}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        ) : (
          <div className="g-upgrades">
            {options.map((o) => (
              <UpgradeCard key={o.id} o={o} stage={g.stage} act={act} scheduled={g.pendingCastingSwitch === o.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Det store neste kjøpet på dette nivået, og hva som mangler for å kjøpe det (B-062) */
function KeyUpgrade({ g }: { g: GameState }) {
  const k = keyUpgrade(g);
  if (!k) return null;
  const why = k.available
    ? "Du har råd nå – kjøp det under Anlegg."
    : k.reason === "For lite penger"
      ? `Spar opp: du har ${fmtKr(Math.floor(Math.max(0, g.cash)))}.`
      : k.reason?.startsWith("Forsk fram: ")
        ? `Forsk fram «${k.reason.slice("Forsk fram: ".length)}» under Forskning først.`
        : `${k.reason}.`;
  return (
    <p className="g-note">
      <strong>Neste store steg:</strong> {k.name} ({fmtKr(k.price)}) gir mer produksjon. {why}
    </p>
  );
}

/** Neste nivå: krav, hva det gir, og flytteknappen – rett på Verket */
export function StageCard({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const stage = upgradeOptions(g).find((o) => o.kind === "stage");
  const next = STAGES[g.stage + 1];
  if (!next || !stage) {
    return (
      <Card title="Storverket">
        <p>Du har bygget et fullskala stålverk. Klarer du å samle {fmtKr(WIN_CASH)} i egenkapital?</p>
        {!g.won && (
          <>
            <Bar value={Math.max(0, g.cash - g.loan) / WIN_CASH} tone="ok" label="Egenkapital" />
            <p className="g-muted">
              Egenkapital {fmtKr(Math.floor(g.cash - g.loan))} av {fmtKr(WIN_CASH)}
              {g.loan > 0 ? ` (kassa minus lånet på ${fmtKr(g.loan)})` : ""}.
            </p>
          </>
        )}
        <KeyUpgrade g={g} />
      </Card>
    );
  }
  return (
    <Card
      id="mal"
      title={`Mål: ${next.name} (nivå ${g.stage + 2} av ${STAGES.length})`}
      className={`g-stage-card${stage.available ? " is-ready" : ""}`}
    >
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
      <KeyUpgrade g={g} />
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
