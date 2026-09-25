/**
 * Reseptguiden (B-058): en kort gjennomgang av hvordan man lager en resept for en ny kvalitet – fra kravene,
 * via skrapet som trengs, til en resept som holder og skrap på lager. Stegene går videre av seg selv når
 * spilleren har gjort dem, som veiledningen i starten.
 */
import { GRADE_IDS, GRADES, SCRAP_IDS, SCRAP_TYPES } from "./data";
import { recipeEstimate, scrapShort } from "./engine";
import { computePlantStats, furnaceGrade, gradeRecipe } from "./plant";
import { suggestRecipe } from "./recipe";
import { researchForScrap, scrapUnlocked } from "./research";
import type { GameState, GradeId } from "./types";

export interface GuideStep {
  title: string;
  text: string;
  /** Fanen steget handler om, og eventuelt underfanen */
  view?: "verket" | "marked" | "salg" | "forskning";
  sub?: string;
  done?: (g: GameState) => boolean;
}

const fmt = (v: number, d: number) => v.toFixed(d).replace(".", ",");

/** Kan kvaliteten lages med skrapet som er åpent? */
function makeable(g: GameState, grade: GradeId): boolean {
  return !!suggestRecipe(g, grade, computePlantStats(g), "billig");
}

/** Låst skrap som er rent nok til kvaliteten, og forskningen som åpner det */
function cleanerScrap(grade: GradeId): { scrap: string; research: string }[] {
  const spec = GRADES[grade];
  return SCRAP_IDS.filter(
    (id) => SCRAP_TYPES[id].buyable && SCRAP_TYPES[id].p <= spec.pMax && SCRAP_TYPES[id].tramp <= spec.trampMax,
  )
    .map((id) => ({ scrap: SCRAP_TYPES[id].name.toLowerCase(), research: researchForScrap(id)?.name ?? "" }))
    .filter((x) => x.research);
}

export function guideSteps(g: GameState, grade: GradeId): GuideStep[] {
  const spec = GRADES[grade];
  const name = spec.name.toLowerCase();
  const locked = cleanerScrap(grade).filter(
    (x) => !SCRAP_IDS.some((id) => SCRAP_TYPES[id].name.toLowerCase() === x.scrap && scrapUnlocked(g, id)),
  );
  return [
    {
      title: `Ny kvalitet: ${spec.name}`,
      text: `${spec.description} Kravet: karbon ${fmt(spec.cMin, 2)}–${fmt(spec.cMax, 2)} %, fosfor høyst ${fmt(spec.pMax, 3)} % og kobber+tinn høyst ${fmt(spec.trampMax, 2)} %. Fosfor og kobber kan ikke tas ut i ovnen – de må holdes nede med rent skrap. Denne gjennomgangen viser hvordan.`,
    },
    {
      title: "Skaff rent nok skrap",
      text: makeable(g, grade)
        ? `Skrapet du kan kjøpe, er rent nok til ${name}. Trykk «Neste».`
        : `Skrapet du har tilgang til, har for mye fosfor eller kobber til ${name}. ${
            locked.length
              ? `Forsk fram ${[...new Set(locked.map((x) => `«${x.research}»`))].join(" eller ")}${
                  locked.every((x) => x.research.toLowerCase() === x.scrap)
                    ? ""
                    : ` (gir ${locked.map((x) => x.scrap).join(" og ")})`
                }.`
              : "Du trenger renere skrap."
          }`,
      view: "forskning",
      done: (gg) => makeable(gg, grade),
    },
    {
      title: `Kjør mot ${name}`,
      text: `Velg ${name} i «Kjør mot kvalitet» under «Produksjon nå» på Verket. Følger verket ordrekøen, skjer det av seg selv når du signerer en forespørsel på ${name}.`,
      view: "verket",
      done: (gg) => gg.targetGrade === grade || gg.furnaces.some((_, i) => furnaceGrade(gg, i) === grade),
    },
    {
      title: "Lag resepten",
      text: `Gå til Marked → Resept og trykk «Billigst» – da blandes skrapet så det holder kravet. Uten skrapklasser blir blandingen omtrentlig, og da er «Sikrest» tryggere. Grønne haker betyr at kravet holder.`,
      view: "marked",
      sub: "resept",
      done: (gg) => recipeEstimate(gg, grade, computePlantStats(gg), gradeRecipe(gg, grade)).grades.includes(grade),
    },
    {
      title: "Kjøp skrapet",
      text: "Skraptypene resepten trenger, er merket med oransje ramme under Marked → Skrap. Kjøp nok til et par charger.",
      view: "marked",
      sub: "skrap",
      done: (gg) => scrapShort(gg).length === 0,
    },
    {
      title: "Klar!",
      text: `Nå kan ovnen lage ${name}. Ta forespørsler på ${name} under Salg – de betaler ofte bedre. Du kan se gjennomgangen igjen fra Resept-fanen.`,
    },
  ];
}

/** Starter gjennomgangen for en kvalitet */
export function startRecipeGuide(g: GameState, grade: GradeId): void {
  g.recipeGuide = { grade, step: 0 };
}

/** Kvalitetene som blir tilgjengelige når verket flytter til et nivå */
export function newGradesAt(stage: number): GradeId[] {
  return GRADE_IDS.filter((id) => GRADES[id].minStage === stage);
}

/** Går videre når steget er gjort */
export function advanceRecipeGuide(g: GameState): void {
  while (g.recipeGuide) {
    const steps = guideSteps(g, g.recipeGuide.grade);
    const step = steps[g.recipeGuide.step];
    if (!step) {
      g.recipeGuide = null;
      return;
    }
    if (!step.done?.(g)) return;
    g.recipeGuide.step += 1;
  }
}

/** «Neste» / «Hopp over steget» */
export function nextRecipeGuideStep(g: GameState): void {
  if (!g.recipeGuide) return;
  g.recipeGuide.step += 1;
  if (g.recipeGuide.step >= guideSteps(g, g.recipeGuide.grade).length) g.recipeGuide = null;
  else advanceRecipeGuide(g);
}
