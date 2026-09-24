import type { ReactNode } from "react";
import { requestReline } from "../game/actions";
import { day, type PlantStats } from "../game/plant";
import { hasResearch } from "../game/research";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card } from "./common";
import { fmtKr, fmtPct } from "./format";

const PLAN_OPTIONS = [4, 6, 8, 10, 14];

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
  return (
    <Card title="Vedlikehold" right={right}>
      <p className="g-muted">
        Foringen slites for hver charge. Planlagt stans koster {fmtKr(f0.relineCost)} og {f0.relineHours} timer. Brenner
        den gjennom, blir det havari: {fmtKr(f0.relineCost * 3)}, {f0.relineHours * 3} timer og tapt omdømme.
      </p>
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
                  ? "Bytt foring etter denne chargen"
                  : `Bytt foring nå (${fmtKr(f0.relineCost)})`}
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
              {PLAN_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  Hvert {d}. døgn
                </option>
              ))}
            </select>
          </label>
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
