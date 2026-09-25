import { guideSteps, nextRecipeGuideStep } from "../game/recipeGuide";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import type { View } from "./views";

/** Reseptguiden (B-058): samme boks som veiledningen i starten, med knapp som går til riktig fane */
export function RecipeGuideCoach({
  g,
  act,
  go,
}: {
  g: GameState;
  act: GameApi["act"];
  go: (v: View, sub?: string) => void;
}) {
  const guide = g.recipeGuide;
  if (!guide || g.tutorial !== null) return null;
  const steps = guideSteps(g, guide.grade);
  const step = steps[guide.step];
  if (!step) return null;
  const last = guide.step === steps.length - 1;
  return (
    <aside className="g-coach" aria-live="polite" aria-label="Gjennomgang av resepten">
      <div className="g-coach-head">
        <span className="g-muted">
          Resept {guide.step + 1} av {steps.length}
        </span>
        {!last && (
          <button className="g-link" onClick={() => act((gg) => void (gg.recipeGuide = null))}>
            Avslutt
          </button>
        )}
      </div>
      <strong>{step.title}</strong>
      <p>{step.text}</p>
      <div className="g-row g-coach-row">
        {step.view && (
          <button className="g-small" onClick={() => go(step.view as View, step.sub)}>
            Vis meg
          </button>
        )}
        {step.done ? (
          <button className="g-coach-skip" onClick={() => act((gg) => nextRecipeGuideStep(gg))}>
            Hopp over steget
          </button>
        ) : (
          <button className="g-primary" onClick={() => act((gg) => nextRecipeGuideStep(gg))}>
            {last ? "Ferdig" : "Neste"}
          </button>
        )}
      </div>
    </aside>
  );
}
