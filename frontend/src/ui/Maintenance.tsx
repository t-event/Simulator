import type { ReactNode } from "react";
import { requestReline } from "../game/actions";
import { PLAN_SAFETY_WEAR } from "../game/engine";
import {
  day,
  liningDays,
  MASONS_PER_POT,
  POT_REBUILD_DAYS,
  potRebuildPerDay,
  potSwapHours,
  type PlantStats,
} from "../game/plant";
import { hasResearch } from "../game/research";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card } from "./common";
import { fmtKr, fmtNum, fmtPct } from "./format";

/** Valg for planlagt omforing: fra halvveis til nesten slitt, ut fra hvor lenge foringen holder nå (B-028) */
function planOptions(life: number, current: number | null): number[] {
  const days = [0.5, 0.65, 0.8, 0.9].map((f) => Math.max(1, Math.round(life * f)));
  if (current !== null) days.push(current);
  return [...new Set(days)].sort((a, b) => a - b);
}

/** Vedlikehold av foringen: manuelt, etter plan eller av en reparatør. Planlagt stans er billigere enn havari. */
export function Maintenance({
  g,
  stats,
  act,
  right,
}: {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
  right?: ReactNode;
}) {
  const f0 = stats.furnace;
  const hasRepairer = g.workers.some((w) => w.role === "vedlikehold");
  const canPlan = hasResearch(g, "vedlikeholdsplan");
  const life = liningDays(g, stats);
  const potRate = potRebuildPerDay(g);
  const swapHours = Math.round(potSwapHours(g) * stats.repairFactor);
  const relineHours = Math.round(f0.relineHours * stats.repairFactor);
  const plan = g.settings.relinePlanDays;
  // Slitasjen etter et gitt antall døgn, med dagens drift
  const wearAfter = (d: number) => Math.min(1, (d / life) * 0.85);
  return (
    <Card title="Vedlikehold" right={right}>
      <p className="g-muted">
        Foringen slites for hver charge. Planlagt stans koster {fmtKr(f0.relineCost)} og {relineHours} timer. Brenner
        den gjennom, blir det havari: {fmtKr(f0.relineCost * 3)}, {relineHours * 3} timer og tapt omdømme.
      </p>
      {f0.arc && (
        <p className="g-muted">
          Lysbueovnen har to potter. Mens den ene er i bruk, murer murerne opp den andre med ny foring (ca.{" "}
          {POT_REBUILD_DAYS} døgn med {MASONS_PER_POT} murere per pott). Står reservepotta klar, tar et bytte bare{" "}
          {swapHours} timer i stedet for {relineHours}.
        </p>
      )}
      {g.furnaces.map((f, i) => {
        const tone = f.wear > 0.85 ? "critical" : f.wear > 0.6 ? "warning" : "ok";
        const busy = !!f.heat || !!f.holding;
        const down = g.minute < f.downUntilMin;
        return (
          <div className="g-maint" key={i}>
            <div className="g-contract-head">
              <strong>
                {f0.name}
                {g.furnaces.length > 1 ? ` nr. ${i + 1}` : ""}
              </strong>
              <span className="g-muted">Byttet dag {f.lastRelineDay}</span>
            </div>
            <Bar value={f.wear} tone={tone} label="Slitasje på foringen" />
            <p className="g-muted">
              {fmtPct(f.wear)} slitt · {day(g) - f.lastRelineDay} døgn siden omforing
              {down && f.downReason ? ` · ${f.downReason}` : ""}
            </p>
            {f0.arc && (
              <p className={f.spareProgress >= 1 ? "g-muted" : "g-note"}>
                {f.spareProgress >= 1
                  ? "Reservepott: klar ✓ – neste bytte tar bare noen timer."
                  : potRate > 0
                    ? `Reservepott: murerne har kommet ${fmtPct(f.spareProgress)} – ca. ${fmtNum((1 - f.spareProgress) / potRate, 1)} døgn igjen.`
                    : `Reservepott: venter på murere (${fmtPct(f.spareProgress)} ferdig). Ansett murere under Folk.`}
              </p>
            )}
            <button
              className={f.relineRequested ? "g-primary is-on" : ""}
              disabled={down || (f.wear < 0.1 && !f.relineRequested)}
              onClick={() => act((gg) => requestReline(gg, i))}
            >
              {f.relineRequested
                ? "Byttes når chargen er ferdig ✓"
                : f.wear < 0.1
                  ? "Foringen er ny"
                  : busy
                    ? f0.arc && f.spareProgress >= 1
                      ? "Bytt pott etter denne chargen"
                      : "Bytt foring etter denne chargen"
                    : f0.arc && f.spareProgress >= 1
                      ? `Bytt pott nå (${swapHours} timer)`
                      : `${f0.arc ? "Mur om i ovnen" : "Bytt foring nå"} (${fmtKr(f0.relineCost)})`}
            </button>
          </div>
        );
      })}

      {g.stage >= 1 && (
        <>
          <label className="g-field">
            <span>Planlagt omforing</span>
            <select
              value={g.settings.relinePlanDays ?? ""}
              disabled={!canPlan}
              onChange={(e) =>
                act((gg) => void (gg.settings.relinePlanDays = e.target.value === "" ? null : Number(e.target.value)))
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
          <p className="g-muted">
            Med dagens drift ({stats.hours > 0 && stats.hours < 24 ? `${stats.hours} timer i døgnet` : "døgnet rundt"})
            er foringen 85 % slitt etter ca. {fmtNum(life, 0)} døgn.
            {plan !== null && wearAfter(plan) > 0.85 && " Planen er lengre enn foringen holder – velg færre døgn."}
            {canPlan && ` Planen bytter uansett hvis foringen blir ${fmtPct(PLAN_SAFETY_WEAR)} slitt før dagen.`}
          </p>
          {!canPlan && <p className="g-muted">Forsk fram «Vedlikeholdsplan» for å planlegge omforingen.</p>}

          <label className="g-toggle">
            <input
              type="checkbox"
              checked={g.settings.autoReline && hasRepairer}
              disabled={!hasRepairer}
              onChange={(e) => act((gg) => void (gg.settings.autoReline = e.target.checked))}
            />
            <span>
              {hasRepairer
                ? `La reparatøren bytte foringen ved ${fmtPct(g.settings.relineAt)} slitasje`
                : "Med en reparatør kan foringen byttes automatisk når den er slitt"}
            </span>
          </label>
        </>
      )}
    </Card>
  );
}
