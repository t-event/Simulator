import type { GameState } from "../game/types";

/** «mal» (Mål, B-211) står ikke i menyen nederst på mobil: den åpnes med pokalen ved varsellinja */
export type View = "verket" | "marked" | "salg" | "folk" | "forskning" | "konsern" | "mal";

export const VIEWS: { id: View; label: string }[] = [
  { id: "verket", label: "Verket" },
  { id: "marked", label: "Marked" },
  { id: "salg", label: "Salg" },
  { id: "folk", label: "Folk" },
  { id: "forskning", label: "Forskning" },
  // Egen hovedside når konsernet er åpnet (B-226); før var den en underfane i Verket
  { id: "konsern", label: "Konsern" },
];

/**
 * Fanene låses opp etter hvert, så nye spillere ikke møter alt på en gang (B-023):
 * Folk når det er plass til ansatte, Forskning når de første fagpoengene er tjent.
 */
export function viewUnlocked(g: GameState, view: View): boolean {
  if (view === "folk") return g.stage >= 1 || g.workers.length > 0;
  if (view === "forskning") return g.researchPoints >= 1 || g.researched.length > 0 || g.stage >= 1;
  if (view === "konsern") return !!g.konsern?.unlocked;
  return true;
}
