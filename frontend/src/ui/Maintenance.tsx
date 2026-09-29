import type { ReactNode } from "react";
import { requestReline } from "../game/actions";
import { PLAN_SAFETY_WEAR } from "../game/engine";
import { computePlantStats, unitType } from "../game/plant";
import {
  hasMoulds,
  MOULD,
  mouldCost,
  mouldDaysLeft,
  mouldRisk,
  mouldSwapHours,
  mouldWear,
  replaceMoulds,
} from "../game/mould";
import {
  day,
  liningDays,
  presentWorkers,
  MASONS_PER_POT,
  POT_REBUILD_DAYS,
  potRebuildPerDay,
  potSwapHours,
  type PlantStats,
} from "../game/plant";
import { auto, hasResearch } from "../game/research";
import { AutoToggle } from "./AutoToggle";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card } from "./common";
import { Callout } from "./ds";
import { fmtKr, fmtNum, fmtPct } from "./format";

/** Valg for planlagt omforing: fra halvveis til nesten slitt, ut fra hvor lenge foringen holder nå (B-028) */
function planOptions(life: number, current: number | null): number[] {
  const days = [0.5, 0.65, 0.8, 0.9].map((f) => Math.max(1, Math.round(life * f)));
  if (current !== null) days.push(current);
  return [...new Set(days)].sort((a, b) => a - b);
}

/** Vedlikehold av foringen: manuelt, etter plan eller av en reparatør. Planlagt stans er billigere enn havari. */
export function Maintenance({
  id,
  g,
  stats,
  act,
  right,
}: {
  id?: string;
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
  right?: ReactNode;
}) {
  const f0 = stats.furnace;
  const hasRepairer = g.workers.some((w) => w.role === "vedlikehold");
  const canPlan = hasResearch(g, "vedlikeholdsplan");
  const repairerOn = auto(g, "autoReline") && hasRepairer;
  // Reparatøren er borte (ferie eller syk): vis det, så foringen ikke glemmes (B-036)
  const repairersAway = hasRepairer && !presentWorkers(g).some((w) => w.role === "vedlikehold");
  const life = liningDays(g, stats);
  const potRate = potRebuildPerDay(g);
  const swapHours = Math.round(potSwapHours(g) * stats.repairFactor);
  const relineHours = Math.round(f0.relineHours * stats.repairFactor);
  const plan = g.settings.relinePlanDays;
  // Hvem bytter foringen nå? Omforing skjer aldri av seg selv (B-063)
  const specialistUntil = g.specialists.havari ?? 0;
  const whoRelines =
    specialistUntil > g.minute
      ? `Den innleide vedlikeholdsspesialisten bytter foringen ved 80 % slitasje til dag ${Math.floor(specialistUntil / 1440) + 1}. Etter det må du, en plan eller en reparatør gjøre det.`
      : repairerOn && !repairersAway
        ? `Reparatøren bytter foringen ved ${fmtPct(g.settings.relineAt)} slitasje${hasMoulds(g) ? ` og kokillene ved ${fmtPct(MOULD.autoAt)}` : ""}.`
        : canPlan && plan !== null
          ? `Vedlikeholdsplanen bytter foringen hvert ${plan === 1 ? "" : `${plan}. `}døgn.`
          : null;
  // Slitasjen etter et gitt antall døgn, med dagens drift
  const wearAfter = (d: number) => Math.min(1, (d / life) * 0.85);
  const who = whoRelines
    ? repairersAway && repairerOn
      ? `${whoRelines} Men reparatøren er borte nå – bytt selv, eller følg med.`
      : whoRelines
    : "Ingen bytter foringen for deg. Trykk «Bytt» før den er 85 % slitt.";
  return (
    <Card id={id} title="Vedlikehold" right={right}>
      {/* B-233: først hvem som bytter foringen, så én rad per ovn, så valgene – forklaringen bak «Slik virker foringen» */}
      <Callout tone={whoRelines && !(repairersAway && repairerOn) ? "ok" : "heat"}>{who}</Callout>
      <ul className="g-maint-list">
        {g.furnaces.map((f, i) => {
          // Hver ovn har sin egen type (B-074)
          const u = unitType(g, i);
          const tone = f.wear > 0.85 ? "critical" : f.wear > 0.6 ? "warning" : "ok";
          const busy = !!f.heat || !!f.holding;
          const down = g.minute < f.downUntilMin;
          const pot = !u.arc
            ? null
            : f.spareProgress >= 1
              ? "potte klar ✓"
              : potRate > 0
                ? `ny potte om ca. ${fmtNum((1 - f.spareProgress) / potRate, 1)} døgn`
                : "potte venter på murere";
          return (
            <li className="g-maint" key={i}>
              <div className="g-maint-head">
                <strong>{g.furnaces.length > 1 ? `Ovn ${i + 1}` : u.name}</strong>
                <span className={`g-maint-wear is-${tone}`}>{fmtPct(f.wear)} slitt</span>
              </div>
              <Bar value={f.wear} tone={tone} label="Slitasje på foringen" />
              <div className="g-maint-foot">
                <span className="g-muted g-small-text">
                  {down && f.downReason
                    ? f.downReason
                    : [`${day(g) - f.lastRelineDay} døgn siden omforing`, pot].filter(Boolean).join(" · ")}
                </span>
                <button
                  className={`g-small${f.relineRequested ? " g-primary is-on" : ""}`}
                  disabled={down || (f.wear < 0.1 && !f.relineRequested)}
                  onClick={() => act((gg) => requestReline(gg, i))}
                >
                  {f.relineRequested
                    ? "Byttes etter chargen ✓"
                    : f.wear < 0.1
                      ? "Ny foring"
                      : busy
                        ? "Bytt etter chargen"
                        : u.arc && f.spareProgress >= 1
                          ? `Bytt potte (${swapHours} t)`
                          : `Bytt (${fmtKr(u.relineCost)})`}
                </button>
              </div>
            </li>
          );
        })}
        {hasMoulds(g) && <MouldRow g={g} act={act} />}
      </ul>

      {g.stage >= 1 && (hasRepairer || canPlan) && (
        <div className="g-maint-who">
          <h3 className="g-subhead">Hvem bytter foringen</h3>
          {hasRepairer && (
            <AutoToggle
              g={g}
              act={act}
              k="autoReline"
              label={`Reparatøren bytter den ved ${fmtPct(g.settings.relineAt)} slitasje`}
            />
          )}
          {canPlan && !repairerOn && (
            <>
              <label className="g-field">
                <span>Planlagt omforing</span>
                <select
                  value={g.settings.relinePlanDays ?? ""}
                  onChange={(e) =>
                    act(
                      (gg) => void (gg.settings.relinePlanDays = e.target.value === "" ? null : Number(e.target.value)),
                    )
                  }
                >
                  <option value="">Av – jeg bytter selv</option>
                  {planOptions(life, plan).map((d) => (
                    <option key={d} value={d}>
                      {d === 1 ? "Hvert døgn" : `Hvert ${d}. døgn`} (ca. {fmtPct(wearAfter(d))} slitt)
                    </option>
                  ))}
                </select>
              </label>
              {plan !== null && wearAfter(plan) > 0.85 && (
                <p className="g-note g-warn">Planen er lengre enn foringen holder – velg færre døgn.</p>
              )}
            </>
          )}
        </div>
      )}

      <details className="g-details">
        <summary>Slik virker foringen</summary>
        <p className="g-muted">
          Foringen slites for hver charge. Planlagt stans koster {fmtKr(f0.relineCost)} og {relineHours} timer. Brenner
          den gjennom, blir det havari: {fmtKr(f0.relineCost * 3)}, {relineHours * 3} timer og tapt omdømme.
        </p>
        <p className="g-muted">
          Med dagens drift ({stats.hours > 0 && stats.hours < 24 ? `${stats.hours} timer i døgnet` : "døgnet rundt"}) er
          foringen 85 % slitt etter ca. {fmtNum(life, 0)} døgn.
          {canPlan && ` En plan bytter uansett hvis foringen blir ${fmtPct(PLAN_SAFETY_WEAR)} slitt før dagen.`}
        </p>
        {f0.arc && (
          <p className="g-muted">
            {g.furnaces.length > 1 ? "Hver lysbueovn har sine egne to potter." : "Lysbueovnen har to potter."} Mens den
            ene er i bruk, murer murerne opp den andre med ny foring (ca. {POT_REBUILD_DAYS} døgn med {MASONS_PER_POT}{" "}
            murere per potte; murerne jobber dagtid 07–15). Står reservepotta klar, tar et bytte bare {swapHours} timer
            i stedet for {relineHours}.
          </p>
        )}
        {hasMoulds(g) && (
          <p className="g-muted">
            Kokillene er kobberformene stålet størkner i. De slites av hvert tonn som støpes (ca. {MOULD.lifeDays} døgn
            med full støping). Over {fmtPct(MOULD.riskFrom)} slitasje revner skallet lettere, og strengen bryter oftere
            gjennom. Et bytte koster {fmtKr(mouldCost(g))} og stopper støpingen i {fmtNum(mouldSwapHours(stats), 1)}{" "}
            timer.
          </p>
        )}
        {g.stage >= 1 && !hasRepairer && (
          <p className="g-muted">Med en reparatør kan foringen byttes automatisk når den er slitt.</p>
        )}
      </details>
    </Card>
  );
}

/** Kokillene i strengstøpingen (B-351): én rad under ovnene */
function MouldRow({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const wear = mouldWear(g);
  const tone = wear >= MOULD.warnAt ? "critical" : wear > MOULD.riskFrom ? "warning" : "ok";
  const down = g.minute < g.castDownUntilMin;
  return (
    <li className="g-maint">
      <div className="g-maint-head">
        <strong>Kokillene</strong>
        <span className={`g-maint-wear is-${tone}`}>{fmtPct(wear)} slitt</span>
      </div>
      <Bar value={Math.min(1, wear)} tone={tone} label="Slitasje på kokillene" />
      <div className="g-maint-foot">
        <span className="g-muted g-small-text">
          {wear > MOULD.riskFrom
            ? `${fmtNum(mouldRisk(g), 1)} ganger så mange gjennombrudd`
            : `Ca. ${fmtNum(mouldDaysLeft(g), 0)} døgn med full støping igjen`}
        </span>
        <button
          className="g-small"
          disabled={down || wear < 0.05}
          onClick={() => act((gg) => replaceMoulds(gg, computePlantStats(gg)))}
        >
          {wear < 0.05 ? "Nye kokiller" : `Bytt kokiller (${fmtKr(mouldCost(g))})`}
        </button>
      </div>
    </li>
  );
}
