import { useState, type ReactNode } from "react";
import { requestManual, setTargetGrade, upgradeOptions } from "../game/actions";
import { Maintenance } from "./Maintenance";
import { researchOptions } from "../game/research";
import { GRADE_IDS, GRADES, PRODUCTS, ROLES, STAGES } from "../game/data";
import { currentOrder, recipeEstimate } from "../game/engine";
import { castingType, rollingActive, shiftStart, type PlantStats } from "../game/plant";
import type { GameState, GradeId, RoleId } from "../game/types";
import type { GameApi } from "../game/useGame";
import { AnalysisLine, Bar, Card, GradeChips, Stat } from "./common";
import { fmtClock, fmtKr, fmtNum, fmtPct, fmtT } from "./format";
import { activeMissions, missionProgress } from "../game/missions";
import { PlantScene } from "./PlantScene";
import { SceneBubbles } from "./SceneBubbles";
import { StageCard, StationButton, UpgradeSheet } from "./Upgrades";
import type { Station } from "./stations";
import type { View } from "./views";

interface Props {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
  go: (view: View) => void;
  openBook: (chapter?: string) => void;
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
  if (g.furnaces.some((f) => f.wear > 0.8 && !f.relineRequested))
    out.push({ text: "Foringen er nesten slitt gjennom. Bytt den under Vedlikehold før den brenner gjennom." });
  const est = recipeEstimate(g, g.targetGrade, stats);
  if (!est.grades.includes(g.targetGrade))
    out.push({
      text: `Resepten din holder ikke kravet til ${GRADES[g.targetGrade].name}. Juster resepten under Marked.`,
      view: "marked",
    });
  const research = researchOptions(g).filter((r) => r.available);
  if (research.length)
    out.push({ text: `Du har fagpoeng nok til å forske på ${research[0].name.toLowerCase()}.`, view: "forskning" });
  const next = upgradeOptions(g).find((o) => o.kind === "stage");
  if (next?.available)
    out.push({ text: `Du kan flytte inn i ${next.name.toLowerCase()}! Trykk «Flytt inn» under Mål lenger ned.` });
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

/** Kvalitet de siste sju døgnene: holdt stålet kvaliteten det ble laget for? */
function Quality({ g, stats, go, right }: { g: GameState; stats: PlantStats; go: (v: View) => void; right: ReactNode }) {
  const days = [...g.history.slice(-6), g.today];
  const on = days.reduce((a, d) => a + (d.onGradeT ?? 0), 0);
  const off = days.reduce((a, d) => a + (d.offGradeT ?? 0), 0);
  const second = days.reduce((a, d) => a + (d.secondT ?? 0), 0);
  const total = on + off + second;
  const lab = ["Ingen måling – du vet ikke sikkert hva som er i stålet", "Håndholdt analysator", "Spektrometer (hele analysen)"][
    stats.lab
  ];
  return (
    <Card title="Kvalitet" right={right}>
      {total <= 0 ? (
        <p className="g-muted">Ikke noe stål støpt ennå denne uka.</p>
      ) : (
        <>
          <div className="g-goal">
            <span>Riktig</span>
            <Bar value={on / total} tone={on / total >= 0.9 ? "ok" : on / total >= 0.75 ? "warning" : "critical"} label="Riktig kvalitet" />
            <span>{fmtPct(on / total)}</span>
          </div>
          <p className="g-muted">
            Siste sju døgn: {fmtPct(on / total)} holdt kvaliteten, {fmtPct(off / total)} bommet på analysen og{" "}
            {fmtPct(second / total)} fikk støpefeil. Stål som bommer, kan ikke leveres på kontrakten og selges billig.
          </p>
          {off / total > 0.05 && (
            <button className="g-small" onClick={() => go("marked")}>
              Se på resepten
            </button>
          )}
          {second / total > 0.08 && (
            <p className="g-muted">Støpefeil kommer oftest av feil temperatur. Erfarne folk gir færre feil.</p>
          )}
        </>
      )}
      <p className="g-muted">Måling: {lab}.</p>
    </Card>
  );
}

/** Fagboka på Verket: nye kapitler og oppdrag i gang (B-025) */
function BookCard({ g, openBook }: { g: GameState; openBook: (chapter?: string) => void }) {
  const active = activeMissions(g);
  const unread = g.knowledge.filter((k) => !g.readChapters.includes(k)).length;
  if (!active.length && !unread) return null;
  return (
    <Card
      title="Fagboka"
      right={
        <button className="g-small" onClick={() => openBook()}>
          📖 Åpne
        </button>
      }
    >
      {unread > 0 && (
        <p className="g-note">
          {unread === 1 ? "Ett nytt kapittel" : `${unread} nye kapitler`}. Les for å kunne forske – og ta quizen for fagpoeng.
        </p>
      )}
      {active.slice(0, 3).map((m) => (
        <button key={m.id} className="g-mission g-mission-btn" onClick={() => openBook(m.chapter)}>
          <strong>Oppdrag: {m.title}</strong>
          <Bar value={missionProgress(g, m) / m.goal} tone="ok" label="Fremdrift" />
          <span className="g-muted">
            {fmtNum(missionProgress(g, m), m.unit === "stjerner" ? 1 : 0)} av {m.goal} {m.unit ?? ""} · {m.fp} fagpoeng
            {m.cash > 0 ? ` og ${fmtKr(m.cash)}` : ""}
          </span>
        </button>
      ))}
    </Card>
  );
}

export function Overview({ g, stats, act, go, openBook }: Props) {
  const [sheet, setSheet] = useState<Station | null>(null);
  const est = recipeEstimate(g, g.targetGrade, stats);
  const order = currentOrder(g);
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
          <SceneBubbles g={g} />
          <div className="g-scene-caption">
            <strong>{stats.stage.name}</strong>
            <span>
              {stats.hours > 0
                ? stats.hours >= 24
                  ? "Døgnkontinuerlig drift"
                  : `Drift ${fmtClock(shiftStart(g) * 60)}–${fmtClock(((shiftStart(g) + stats.hours) % 24) * 60)}`
                : "Står – mangler folk"}
            </span>
          </div>
        </div>

        {tips.length > 0 && (
          <div className="g-cta-wrap">
            {tips[0].view ? (
              <button className="g-primary g-cta" onClick={() => go(tips[0].view!)}>
                {tips[0].text}
              </button>
            ) : (
              <p className="g-note">{tips[0].text}</p>
            )}
            {tips.length > 1 && (
              <ul className="g-more-hints">
                {tips.slice(1).map((t) => (
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
            )}
          </div>
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
              <div className="g-row">
                <button className="g-small" onClick={() => go("marked")}>
                  Kjøp skrap
                </button>
                <StationButton g={g} station="skrap" onOpen={setSheet} />
              </div>
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
                  <p className="g-muted">Foring {fmtPct(f.wear)} slitt</p>
                  {i === 0 && <StationButton g={g} station="ovn" onOpen={setSheet} />}
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
              <StationButton g={g} station="stoping" onOpen={setSheet} />
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
              <div className="g-row">
                <button className="g-small" onClick={() => go("salg")}>
                  Til salg
                </button>
                <StationButton g={g} station="lager" onOpen={setSheet} />
              </div>
            </div>
          </div>
        </Card>
        <Maintenance
          g={g}
          stats={stats}
          act={act}
          right={<StationButton g={g} station="vedlikehold" onOpen={setSheet} />}
        />
        {sheet && <UpgradeSheet g={g} station={sheet} act={act} onClose={() => setSheet(null)} />}
      </div>

      <div className="g-col">
        <Card title="Produksjon nå">
          {order ? (
            <p>
              Produserer <strong>{GRADES[order.grade].name}</strong> til {order.customer} ({fmtT(order.tonnes - order.delivered)}{" "}
              igjen).
            </p>
          ) : (
            <p className="g-muted">Ingen kontrakt venter på produksjon. Verket lager {GRADES[g.targetGrade].name.toLowerCase()} for lager og spot.</p>
          )}
          {(g.stage >= 1 || g.contracts.filter((c) => c.status === "aktiv").length > 1) && (
          <label className="g-toggle">
            <input
              type="checkbox"
              checked={g.settings.followQueue}
              onChange={(e) => act((gg) => void (gg.settings.followQueue = e.target.checked))}
            />
            <span>Følg ordrekøen (kvalitet og resept skifter etter kontrakten som står først)</span>
          </label>
          )}
          <label className="g-field">
            <span>Kjør mot kvalitet</span>
            <select
              value={g.targetGrade}
              disabled={g.settings.followQueue && !!order}
              onChange={(e) => act((gg) => setTargetGrade(gg, e.target.value as GradeId))}
            >
              {GRADE_IDS.filter((id) => GRADES[id].minStage <= g.stage || id === g.targetGrade).map((id) => (
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
            <GradeChips grades={est.grades.filter((id) => GRADES[id].minStage <= g.stage)} highlight={g.targetGrade} />
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
            g.stage >= 2 && <p className="g-muted">Med en lysbueovn kan du ta styringen og kjøre chargene selv.</p>
          )}
        </Card>

        <BookCard g={g} openBook={openBook} />

        <Quality g={g} stats={stats} go={go} right={<StationButton g={g} station="kvalitet" onOpen={setSheet} />} />

        <StageCard g={g} act={act} />

        <Card title="Økonomi">
          <div className="g-stats">
            <Stat label="Inntekter i dag" value={fmtKr(sum(g.today.income))} />
            <Stat label="Utgifter i dag" value={fmtKr(sum(g.today.costs))} />
            {y && (
              <Stat
                label="Resultat i går"
                value={fmtKr(sum(y.income) - sum(y.costs))}
                tone={sum(y.income) - sum(y.costs) >= 0 ? "ok" : "critical"}
              />
            )}
            {y && <Stat label="Produsert i går" value={fmtT(y.producedT)} />}
            {y && stats.furnaceMW > 0 && (
              <Stat label="Strøm og effekt i går" value={fmtKr((y.costs.energi ?? 0) + (y.costs.nett ?? 0))} />
            )}
            {stats.salaryPerDay > 0 && <Stat label="Lønn per døgn" value={fmtKr(stats.salaryPerDay)} />}
            <Stat label="Faste kostnader per døgn" value={fmtKr(STAGES[g.stage].fixedPerDay)} />
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
