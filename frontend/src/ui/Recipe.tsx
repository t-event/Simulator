import { useState } from "react";
import { applyRecipe, nudgeRecipe } from "../game/actions";
import { startRecipeGuide } from "../game/recipeGuide";
import { GRADES, SCRAP_IDS, SCRAP_TYPES } from "../game/data";
import { recipeEstimate } from "../game/engine";
import { furnaceGrade, gradeRecipe, gradesInUse, hasGrader, satisfies, type PlantStats } from "../game/plant";
import { gradeChecks, suggestRecipe, worstCase } from "../game/recipe";
import { scrapUnlocked } from "../game/research";
import type { GameState, GradeId } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Card, GradeChips } from "./common";
import { fmtKr, fmtNum, fmtPct } from "./format";

/**
 * Resepten (B-035): hvor mye av hver skraptype som går i ovnen, med knapper for mer og mindre,
 * sjekk mot kravet, forslag (billigst og sikrest) og hva som skjer uten skrapklasser.
 */
export function RecipeCard({ g, stats, act }: { g: GameState; stats: PlantStats; act: GameApi["act"] }) {
  // Med to kvaliteter samtidig har hver ovn sin resept (B-039)
  const [picked, setPicked] = useState<GradeId | null>(null);
  const inUse = gradesInUse(g);
  const grade = picked && inUse.includes(picked) ? picked : g.targetGrade;
  const recipe = gradeRecipe(g, grade);
  const est = recipeEstimate(g, grade, stats, recipe);
  const total = SCRAP_IDS.reduce((a, id) => a + recipe[id], 0) || 1;
  const rows = SCRAP_IDS.filter((id) => scrapUnlocked(g, id) || recipe[id] > 0);
  const ovens = g.furnaces.map((_, i) => i).filter((i) => furnaceGrade(g, i) === grade);
  const checks = gradeChecks(g, grade, est.analysis, stats);
  const cheap = suggestRecipe(g, grade, stats, "billig");
  const safe = suggestRecipe(g, grade, stats, "sikker");
  const grader = hasGrader(g);
  const worst = worstCase(g, grade, stats, recipe);
  const worstOk = satisfies(worst, grade);
  const spec = GRADES[grade];

  return (
    <Card title={`Resepten for ${spec.name.toLowerCase()}`}>
      {inUse.length > 1 && (
        <div className="g-subtabs" role="tablist" aria-label="Resept for kvalitet">
          {inUse.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={id === grade}
              className={id === grade ? "is-active" : ""}
              onClick={() => setPicked(id)}
            >
              {GRADES[id].name}
            </button>
          ))}
        </div>
      )}
      <button className="g-link g-guide-link" onClick={() => act((gg) => startRecipeGuide(gg, grade))}>
        Vis meg steg for steg hvordan jeg lager resepten for {spec.name.toLowerCase()}
      </button>
      <p className="g-muted">
        Resepten sier hvor mye av hver skraptype som går i ovnen. Den bestemmer hva som blir i stålet. Kvaliteten velger
        du på Verket.
        {inUse.length > 1 && ` Denne resepten brukes i ovn ${ovens.map((i) => i + 1).join(" og ")}.`}
      </p>

      <div className="g-recipe-suggest">
        <button
          className="g-primary"
          disabled={!cheap}
          onClick={() => act((gg) => cheap && applyRecipe(gg, cheap.recipe, grade))}
        >
          Billigst{cheap ? ` · ${fmtKr(cheap.costPerT)}/t` : ""}
        </button>
        <button disabled={!safe} onClick={() => act((gg) => safe && applyRecipe(gg, safe.recipe, grade))}>
          Sikrest{safe ? ` · ${fmtKr(safe.costPerT)}/t` : ""}
        </button>
      </div>
      <p className="g-muted g-small-text">
        {cheap
          ? "Billigst holder kravet med litt margin. Sikrest ligger lengst unna grensene og tåler dårlige partier – men koster mer."
          : `Ingen blanding av skrapet du har tilgang til, holder kravet til ${spec.name.toLowerCase()}.`}
      </p>

      <ul className="g-recipe-rows">
        {rows.map((id) => {
          const share = recipe[id] / total;
          const type = SCRAP_TYPES[id];
          return (
            <li key={id}>
              <div className="g-recipe-name">
                <strong>{type.name}</strong>
                <span className="g-muted">
                  P {fmtNum(type.p, 3)} · Cu+Sn {fmtNum(type.tramp, 2)}
                </span>
              </div>
              <div className="g-stepper">
                <button
                  aria-label={`Mindre ${type.name.toLowerCase()}`}
                  disabled={share <= 0}
                  onClick={() => act((gg) => nudgeRecipe(gg, id, -10, grade))}
                >
                  −
                </button>
                <span className="g-recipe-share">{fmtPct(share)}</span>
                <button
                  aria-label={`Mer ${type.name.toLowerCase()}`}
                  disabled={share >= 1 || !scrapUnlocked(g, id)}
                  onClick={() => act((gg) => nudgeRecipe(gg, id, 10, grade))}
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <ul className="g-checks g-recipe-checks">
        {checks.map((c) => (
          <li key={c.key} className={c.ok ? (c.close ? "warn" : "ok") : "bad"}>
            {c.label}: {fmtNum(c.value, c.key === "p" ? 3 : 2)} (krav {c.limit})
            {c.fix && <span className="g-fix">{c.fix}</span>}
            {c.close && <span className="g-fix">Nær grensen – skrapet varierer, så legg inn litt margin.</span>}
          </li>
        ))}
      </ul>
      <div className="g-estimate">
        <span>Holder kravet til:</span>
        <GradeChips grades={est.grades.filter((id) => GRADES[id].minStage <= g.stage)} highlight={grade} />
      </div>

      {grader ? (
        <>
          <p className="g-note">Skrapklasseren sørger for at hver charge får nøyaktig denne blandingen.</p>
          <label className="g-toggle">
            <input
              type="checkbox"
              checked={g.settings.graderStrict}
              onChange={(e) => act((gg) => void (gg.settings.graderStrict = e.target.checked))}
            />
            <span>Vent heller enn å fylle med skrap som ikke står i resepten</span>
          </label>
        </>
      ) : (
        <p className={worstOk ? "g-muted" : "g-note g-warn"}>
          Uten skrapklasser blir blandingen omtrentlig (±25 % per skraptype). En dårlig charge kan gi P{" "}
          {fmtNum(worst.p, 3)} og Cu+Sn {fmtNum(worst.tramp, 2)}
          {worstOk
            ? " – det holder fortsatt."
            : " – det holder ikke kravet. Velg «Sikrest», eller ansett en skrapklasser."}
        </p>
      )}

      <div className="g-stats">
        <div className="g-stat">
          <span>Skrap per tonn</span>
          <strong>{fmtKr(est.scrapCostPerT)}</strong>
        </div>
        <div className="g-stat">
          <span>Stål per tonn skrap</span>
          <strong>{fmtPct(est.metallicYield)}</strong>
        </div>
        <div className="g-stat">
          <span>Energibehov</span>
          <strong>{fmtPct(est.energyFactor)}</strong>
        </div>
      </div>
      {stats.dephos === 0 && (
        <p className="g-muted">
          Denne ovnen fjerner verken fosfor eller kobber og tinn, og karbon kan bare legges til. Det du legger i, får du
          ut.
        </p>
      )}
    </Card>
  );
}
