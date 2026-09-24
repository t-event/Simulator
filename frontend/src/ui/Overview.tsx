import { requestManual, setTargetGrade, upgradeOptions } from "../game/actions";
import { GRADE_IDS, GRADES, PRODUCTS, ROLES, STAGES } from "../game/data";
import { recipeEstimate, startReline } from "../game/engine";
import { castingType, rollingActive, type PlantStats } from "../game/plant";
import type { GameState, GradeId, RoleId } from "../game/types";
import type { GameApi } from "../game/useGame";
import { AnalysisLine, Bar, Card, GradeChips, Stat } from "./common";
import { fmtClock, fmtKr, fmtPct, fmtT } from "./format";
import { PlantScene } from "./PlantScene";
import type { View } from "./views";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
  go: (view: View) => void;
}

interface Hint {
  text: string;
  view?: View;
}

function hints(g: GameState, stats: PlantStats): Hint[] {
  const out: Hint[] = [];
  const active = g.contracts.filter((c) => c.status === "aktiv");
  const offers = g.contracts.filter((c) => c.status === "tilbud");
  const waits = g.furnaces.map((f) => f.waitReason);
  if (!active.length && offers.length)
    out.push({ text: "Du har ingen kontrakter. Se på tilbudene under Salg.", view: "salg" });
  if (waits.includes("Tomt for skrap"))
    out.push({ text: "Ovnen står fordi skraplageret er tomt. Kjøp skrap under Marked.", view: "marked" });
  if (waits.includes("Mangler folk")) {
    const missing = Object.entries(stats.missing)
      .map(
        ([r, n]) => `${n} ${n === 1 ? ROLES[r as RoleId].name.toLowerCase() : ROLES[r as RoleId].plural.toLowerCase()}`,
      )
      .join(", ");
    out.push({ text: `Verket mangler folk for å gå: ${missing}.`, view: "folk" });
  }
  if (g.castWait === "Ferdigvarelageret er fullt")
    out.push({ text: "Ferdigvarelageret er fullt. Selg partier på spot under Salg.", view: "salg" });
  if (g.furnaces.some((f) => f.wear > 0.85) && !g.settings.autoReline)
    out.push({ text: "Foringen er nesten slitt gjennom. Bytt den før den brenner gjennom." });
  const est = recipeEstimate(g, g.targetGrade, stats);
  if (!est.grades.includes(g.targetGrade))
    out.push({
      text: `Resepten din holder ikke kravet til ${GRADES[g.targetGrade].name}. Juster resepten under Marked.`,
      view: "marked",
    });
  const next = upgradeOptions(g).find((o) => o.kind === "stage");
  if (next?.available) out.push({ text: `Du har råd til å flytte inn i ${next.name.toLowerCase()}!`, view: "bygg" });
  if (g.stage >= 1 && stats.staffCount === 0)
    out.push({ text: "Nå har du plass til ansatte. Med flere folk kan verket gå flere skift.", view: "folk" });
  return out.slice(0, 3);
}

function furnaceState(g: GameState, index: number): { text: string; progress: number | null } {
  const f = g.furnaces[index];
  if (f.heat) {
    const p = (g.minute - f.heat.startMin) / (f.heat.endMin - f.heat.startMin);
    const who = f.heat.manual ? " (kjørt av deg)" : "";
    return { text: `Smelter ${fmtT(f.heat.sizeT)} ${GRADES[f.heat.grade].name.toLowerCase()}${who}`, progress: p };
  }
  if (g.pendingManual?.furnace === index) return { text: "Venter på deg i kontrollrommet", progress: null };
  return { text: f.waitReason ?? "Klar", progress: null };
}

export function Overview({ g, stats, act, go }: Props) {
  const next = STAGES[g.stage + 1];
  const est = recipeEstimate(g, g.targetGrade, stats);
  const casting = castingType(g);
  const castHead = g.castQueue[0];
  const y = g.history[g.history.length - 1];
  const sum = (o: Partial<Record<string, number>>) => Object.values(o).reduce<number>((a, b) => a + (b ?? 0), 0);
  const tips = hints(g, stats);
  const recent = g.log.slice(-8).reverse();

  return (
    <div className="g-grid">
      <div className="g-col-wide">
        <div className="g-scene-wrap">
          <PlantScene g={g} stats={stats} />
          <div className="g-scene-caption">
            <strong>{stats.stage.name}</strong>
            <span>
              {stats.hours > 0
                ? stats.hours >= 24
                  ? "Døgnkontinuerlig drift"
                  : `Drift ${fmtClock(6 * 60)}–${fmtClock(6 * 60 + stats.hours * 60)}`
                : "Står – mangler folk"}
            </span>
          </div>
        </div>

        {tips.length > 0 && (
          <Card title="Neste steg" className="g-hints">
            <ul>
              {tips.map((t) => (
                <li key={t.text}>
                  {t.view ? (
                    <button className="g-link" onClick={() => go(t.view!)}>
                      {t.text}
                    </button>
                  ) : (
                    t.text
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Produksjonen">
          <div className="g-chain">
            <div className="g-chain-step">
              <h3>Skraplager</h3>
              <Bar
                value={stats.yardUsed / stats.yardT}
                tone={stats.yardUsed < stats.sizeT ? "critical" : "accent"}
                label="Skraplager"
              />
              <p>
                {fmtT(stats.yardUsed)} av {fmtT(stats.yardT)}
              </p>
              <button className="g-small" onClick={() => go("marked")}>
                Kjøp skrap
              </button>
            </div>

            {g.furnaces.map((f, i) => {
              const st = furnaceState(g, i);
              return (
                <div className="g-chain-step" key={i}>
                  <h3>
                    {stats.furnace.name}
                    {g.furnaces.length > 1 ? ` nr. ${i + 1}` : ""}
                  </h3>
                  {st.progress !== null ? (
                    <Bar value={st.progress} tone="warning" label="Smelting" />
                  ) : (
                    <Bar value={0} />
                  )}
                  <p>{st.text}</p>
                  <p className="g-muted">
                    Foring {fmtPct(f.wear)} slitt
                    {f.wear > 0.6 && (
                      <button
                        className="g-small"
                        disabled={!!f.heat || !!f.holding}
                        onClick={() => act((gg) => startReline(gg, i))}
                      >
                        Bytt foring ({fmtKr(stats.furnace.relineCost)})
                      </button>
                    )}
                  </p>
                </div>
              );
            })}

            <div className="g-chain-step">
              <h3>{casting.name}</h3>
              {castHead ? <Bar value={g.castProgressT / castHead.t} tone="ok" label="Støping" /> : <Bar value={0} />}
              <p>
                {g.castWait ??
                  (castHead
                    ? `Støper ${fmtT(castHead.t)}${g.castQueue.length > 1 ? ` (+${g.castQueue.length - 1} i kø)` : ""}`
                    : "Venter på stål")}
              </p>
              <p className="g-muted">
                {PRODUCTS[casting.product].name} · utbytte {fmtPct(casting.yield)}
              </p>
            </div>

            {rollingActive(g) && (
              <div className="g-chain-step">
                <h3>Valseverk</h3>
                <p>Valser emner til armeringsstål</p>
              </div>
            )}

            <div className="g-chain-step">
              <h3>Ferdigvarelager</h3>
              <Bar
                value={stats.storeUsed / stats.storeT}
                tone={stats.storeUsed > stats.storeT * 0.9 ? "critical" : "accent"}
                label="Ferdigvarelager"
              />
              <p>
                {fmtT(stats.storeUsed)} av {fmtT(stats.storeT)}
              </p>
              <button className="g-small" onClick={() => go("salg")}>
                Til salg
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div className="g-col">
        <Card title="Styring av ovnen">
          <label className="g-field">
            <span>Kjør mot kvalitet</span>
            <select value={g.targetGrade} onChange={(e) => act((gg) => setTargetGrade(gg, e.target.value as GradeId))}>
              {GRADE_IDS.map((id) => (
                <option key={id} value={id}>
                  {GRADES[id].name}
                </option>
              ))}
            </select>
          </label>
          <p className="g-muted">{GRADES[g.targetGrade].description}</p>
          <div className="g-estimate">
            <span>Anslag med resepten:</span>
            <AnalysisLine a={est.analysis} />
            <span>Holder:</span>
            <GradeChips grades={est.grades} highlight={g.targetGrade} />
          </div>
          {stats.furnace.arc ? (
            <div className="g-manual">
              <button
                className={g.settings.manualNext ? "g-primary is-on" : "g-primary"}
                onClick={() => act((gg) => requestManual(gg, !gg.settings.manualNext))}
              >
                {g.settings.manualNext ? "Du tar neste charge ✓" : "Ta styringen på neste charge"}
              </button>
              <p className="g-muted">
                Kjør chargen selv i kontrollrommet. God kjøring gir mindre strøm, lavere fosfor og bedre omdømme.
              </p>
            </div>
          ) : (
            <p className="g-muted">Med en lysbueovn kan du ta styringen og kjøre chargene selv.</p>
          )}
        </Card>

        {next && (
          <Card
            title={`Mål: ${next.name}`}
            right={
              <button className="g-small" onClick={() => go("bygg")}>
                Bygg
              </button>
            }
          >
            <p className="g-muted">{next.description}</p>
            <div className="g-goal">
              <span>Penger</span>
              <Bar value={Math.max(0, g.cash) / next.price} tone="ok" label="Penger" />
              <span>
                {fmtKr(Math.max(0, g.cash))} / {fmtKr(next.price)}
              </span>
              <span>Omdømme</span>
              <Bar value={g.reputation / next.reputation} tone="ok" label="Omdømme" />
              <span>
                {g.reputation.toFixed(0)} / {next.reputation}
              </span>
            </div>
          </Card>
        )}

        <Card title="Økonomi">
          <div className="g-stats">
            <Stat label="I dag inn" value={fmtKr(sum(g.today.income))} />
            <Stat label="I dag ut" value={fmtKr(sum(g.today.costs))} />
            {y && (
              <Stat
                label="I går resultat"
                value={fmtKr(sum(y.income) - sum(y.costs))}
                tone={sum(y.income) - sum(y.costs) >= 0 ? "ok" : "critical"}
              />
            )}
            {y && <Stat label="I går produsert" value={fmtT(y.producedT)} />}
            <Stat label="Lønn per dag" value={fmtKr(stats.salaryPerDay)} />
            {g.loan > 0 && <Stat label="Lån" value={fmtKr(g.loan)} tone="warning" />}
          </div>
        </Card>

        <Card title="Logg">
          <ul className="g-log">
            {recent.map((e) => (
              <li key={e.id} className={`log-${e.kind}`}>
                <span className="g-log-time">
                  Dag {Math.floor(e.min / 1440) + 1} {fmtClock(e.min)}
                </span>
                {e.text}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
