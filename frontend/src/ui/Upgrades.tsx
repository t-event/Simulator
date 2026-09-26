import { useState } from "react";
import {
  buyUpgrade,
  keyUpgrade,
  scheduleCastingSwitch,
  switchCashNeeded,
  upgradeOptions,
  type UpgradeOption,
} from "../game/actions";
import { STATION_NAMES, stationOptions, type Station } from "./stations";
import { STAGES, stageRef, WIN_CASH } from "../game/data";
import { KONSERN_UNLOCK_EQUITY, konsernEquity } from "../game/konsern";
import { computePlantStats, unitType } from "../game/plant";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card } from "./common";
import { fmtKr, fmtNum, fmtRep } from "./format";
import { buzz } from "./haptics";
import { Portal } from "./Portal";

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

/** Hvorfor noe ikke kan kjøpes. Mangler forskningen, er det den spilleren må gjøre først (B-144) */
function reasonText(reason: string): string {
  return reason.startsWith("Forsk fram: ")
    ? `🔬 Forsk fram «${reason.slice("Forsk fram: ".length)}» under Forskning først`
    : reason;
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
        <span className="g-muted">
          {/* Stormodellene (B-154) er låst på storverket til konsernet, sluttmålet eller Stålmagnat */}
          {o.stage <= stage && o.reason ? o.reason : `Krever ${stageRef(o.stage, stage)}`}
        </span>
      ) : (
        <div className="g-row">
          <button
            className="g-primary g-small"
            disabled={!o.available}
            onClick={() => (o.confirm ? setAsking(true) : buy())}
          >
            Kjøp
          </button>
          {o.reason && <span className="g-muted">{reasonText(o.reason)}</span>}
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
          Byttet skjer av seg selv når ordrene er levert og det er penger til noen døgns drift i tillegg. Nye
          forespørsler på det gamle produktet er stoppet imens.
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

/**
 * Utstyret delt i tre (B-112): det du kan kjøpe nå står øverst, det som er i drift og det som kommer på neste nivå
 * er lagt sammen, så menyen ikke blir lang.
 */
function OptionList({ g, options, act }: { g: GameState; options: UpgradeOption[]; act: GameApi["act"] }) {
  const owned = options.filter((o) => o.owned);
  const later = options.filter((o) => !o.owned && o.locked);
  const now = options
    .filter((o) => !o.owned && !o.locked)
    .sort((a, b) => Number(b.available) - Number(a.available) || a.price - b.price);
  return (
    <>
      {now.length ? (
        <div className="g-upgrades">
          {now.map((o) => (
            <UpgradeCard key={o.id} o={o} stage={g.stage} act={act} scheduled={g.pendingCastingSwitch === o.id} />
          ))}
        </div>
      ) : (
        <p className="g-muted">Ingenting mer å kjøpe her nå.</p>
      )}
      {owned.length > 0 && (
        <details className="g-role-group g-sheet-group">
          <summary>I drift ({owned.length})</summary>
          <ul className="g-owned-list">
            {owned.map((o) => (
              <li key={o.id}>✓ {o.name}</li>
            ))}
          </ul>
        </details>
      )}
      {later.length > 0 && (
        <details className="g-role-group g-sheet-group">
          <summary>
            {g.stage >= 4 ? "Kommer senere" : "Kommer på neste nivå"} ({later.length})
          </summary>
          <div className="g-upgrades">
            {later.map((o) => (
              <UpgradeCard key={o.id} o={o} stage={g.stage} act={act} />
            ))}
          </div>
        </details>
      )}
    </>
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
  const units = station === "ovn" && g.furnaces.length > 1 ? [undefined, ...g.furnaces.map((_, i) => i)] : null;
  const unitList = (unit: number | undefined) => options.filter((o) => o.unit === unit);
  const buyable = (unit: number | undefined) => unitList(unit).filter((o) => o.available).length;
  // Én fane per ovn (B-112): start på den første som har noe du kan kjøpe
  const [unit, setUnit] = useState<number | undefined>(() => {
    if (!units) return undefined;
    const i = units.findIndex((u) => buyable(u) > 0);
    return units[i >= 0 ? i : 1];
  });
  return (
    <Portal>
      <div className="g-modal" role="dialog" aria-modal="true" aria-label={STATION_NAMES[station]} onClick={onClose}>
        <div className="g-modal-card" onClick={(e) => e.stopPropagation()}>
          <header className="g-card-head g-sheet-head">
            <h2>{STATION_NAMES[station]}</h2>
            <span className="g-sheet-cash">Du har {fmtKr(Math.floor(Math.max(0, g.cash)))}</span>
            <button onClick={onClose} aria-label="Lukk">
              ✕
            </button>
          </header>
          {units ? (
            <>
              <div className="g-subtabs" role="tablist" aria-label="Ovner">
                {units
                  .filter((u) => unitList(u).length)
                  .map((u) => (
                    <button
                      key={u ?? "verket"}
                      role="tab"
                      aria-selected={unit === u}
                      className={unit === u ? "is-active" : ""}
                      onClick={() => setUnit(u)}
                    >
                      {u === undefined ? "Verket" : `Ovn ${u + 1}`}
                      {buyable(u) > 0 && <span className="g-badge">{buyable(u)}</span>}
                    </button>
                  ))}
              </div>
              <p className="g-muted">
                {unit === undefined
                  ? "Utstyr for hele verket."
                  : `Ovn ${unit + 1} – ${unitType(g, unit).name}. Hver ovn får utstyr for seg.`}
              </p>
              <OptionList
                g={g}
                options={unitList(unit).map((o) => ({ ...o, name: o.name.replace(/ – ovn \d+$/, "") }))}
                act={act}
              />
            </>
          ) : (
            <OptionList g={g} options={options} act={act} />
          )}
        </div>
      </div>
    </Portal>
  );
}

/** Det store neste kjøpet på dette nivået, og hva som mangler for å kjøpe det (B-062) */
function KeyUpgrade({ g }: { g: GameState }) {
  const k = keyUpgrade(g);
  if (!k) return null;
  // Nytt produkt (B-170): uten et planlagt bytte kommer det stadig nye ordrer på det gamle, og byttet skjer aldri
  const why = k.canSchedule
    ? g.pendingCastingSwitch === k.id
      ? "Byttet er planlagt: det skjer av seg selv når ordrene på det gamle produktet er levert."
      : g.cash < switchCashNeeded(g, k.price)
        ? `Spar opp til ca. ${fmtKr(Math.ceil(switchCashNeeded(g, k.price)))} (prisen og noen døgns drift) og ta ordrer som før. Trykk så «Bytt når ordrene er levert» på støpingen under Anlegg.`
        : `${k.reason}. Trykk «Bytt når ordrene er levert» på støpingen under Anlegg – ellers kommer det stadig nye ordrer på det gamle produktet.`
    : k.available
      ? "Du har råd nå – kjøp det under Anlegg."
      : k.reason === "For lite penger"
        ? `Spar opp: du har ${fmtKr(Math.floor(Math.max(0, g.cash)))}.`
        : k.reason?.startsWith("Forsk fram: ")
          ? `Forsk fram «${k.reason.slice("Forsk fram: ".length)}» under Forskning først.`
          : `${k.reason}.`;
  // Hva som holder produksjonen igjen (B-170): ovnene eller støpingen
  const stats = computePlantStats(g);
  const melt = fmtNum(stats.meltTph, 1);
  const cast = fmtNum(stats.castTph, 1);
  const neck =
    k.kind === "casting" && stats.castTph < stats.meltTph
      ? `Ovnene smelter mer enn støpingen tar unna (${melt} mot ${cast} t i timen), så støpingen er flaskehalsen. `
      : k.kind === "furnace" && stats.meltTph < stats.castTph
        ? `Støpingen tar unna mer enn ovnene smelter (${cast} mot ${melt} t i timen), så ovnene er flaskehalsen. `
        : "";
  return (
    <p className="g-note">
      <strong>Neste store steg:</strong> {k.name} ({fmtKr(k.price)}) gir mer produksjon. {neck}
      {why}
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
        {!g.konsern.unlocked ? (
          <>
            <p>
              Du har bygget et fullskala stålverk. Neste steg er et konsern med flere verk: det åpner seg når alt
              utstyret her er kjøpt, eller egenkapitalen når {fmtKr(KONSERN_UNLOCK_EQUITY)}.
            </p>
            <Bar value={Math.max(0, g.cash - g.loan) / KONSERN_UNLOCK_EQUITY} tone="ok" label="Egenkapital" />
            <p className="g-muted">
              Egenkapital {fmtKr(Math.floor(g.cash - g.loan))} av {fmtKr(KONSERN_UNLOCK_EQUITY)}
              {g.loan > 0 ? ` (kassa minus lånet på ${fmtKr(g.loan)})` : ""}.
            </p>
          </>
        ) : (
          <>
            <p>
              Sluttmålet: et stålkonsern verdt {fmtKr(WIN_CASH)} – egenkapital pluss datterverkene. Se Verket → Konsern.
            </p>
            {!g.won && (
              <>
                <Bar value={Math.max(0, konsernEquity(g)) / WIN_CASH} tone="ok" label="Konsernverdi" />
                <p className="g-muted">
                  Konsernverdi {fmtKr(Math.floor(konsernEquity(g)))} av {fmtKr(WIN_CASH)}.
                </p>
              </>
            )}
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
