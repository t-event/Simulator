/**
 * Lagring i nettleseren. Nettleseren kan nekte lagring (privat modus,
 * blokkerte data), så alle kall er pakket inn og spillet fungerer uten.
 */
import { grantResearchForOwned } from "./actions";
import { RESEARCH } from "./research";
import { SAVE_VERSION } from "./engine";
import type { GameState } from "./types";

const KEY = "stalverk-spill-v1";

export function saveGame(g: GameState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as GameState;
    if (g.version !== SAVE_VERSION || typeof g.minute !== "number") return null;
    return migrate(g);
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ingenting å gjøre: lagringen er utilgjengelig
  }
}

/**
 * Fyller inn felt som mangler i lagringer fra eldre versjoner av spillet.
 * Nye felt i GameState må få en standardverdi her (se B-013).
 */
export function migrate(g: GameState): GameState {
  const loose = g as Partial<GameState> & GameState;
  if (loose.researchPoints === undefined) loose.researchPoints = 0;
  if (loose.pendingDecision === undefined) loose.pendingDecision = null;
  if (loose.celebrate === undefined) loose.celebrate = null;
  if (loose.decisionSeen === undefined) loose.decisionSeen = {};
  if (loose.gradeRecipes === undefined) loose.gradeRecipes = {};
  if (loose.seenViews === undefined) {
    // Lagret før gradvis opplåsing (B-023): gi det spilleren allerede hadde tilgang til
    loose.seenViews = ["verket", "marked", "salg", "folk", "forskning"];
    for (const r of RESEARCH) {
      if (g.researched.includes(r.id)) continue;
      const used = r.scrap?.some((id) => g.recipe[id] > 0 || g.scrap[id].t > 0);
      if (r.speed || (r.scrap && (r.stage <= g.stage || used))) g.researched.push(r.id);
    }
  }
  if (g.settings.relinePlanDays === undefined) {
    // Automatisk omforing krever nå en reparatør eller en plan (B-022)
    g.settings.relinePlanDays = null;
    g.settings.autoReline = g.workers.some((w) => w.role === "vedlikehold");
  }
  for (const f of g.furnaces) if (f.relineRequested === undefined) f.relineRequested = false;
  for (const f of g.furnaces) if (f.lastRelineDay === undefined) f.lastRelineDay = Math.max(1, Math.floor(g.minute / 1440) + 1);
  if (g.settings.followQueue === undefined) g.settings.followQueue = true;
  if (g.settings.plannerSorts === undefined) g.settings.plannerSorts = true;
  const active = g.contracts.filter((c) => c.status === "aktiv").sort((a, b) => a.deadlineDay - b.deadlineDay);
  active.forEach((c, i) => {
    if (c.priority === undefined) c.priority = i + 1;
  });
  for (const c of g.contracts) if (c.priority === undefined) c.priority = 0;
  if (loose.sickUntilMin === undefined) loose.sickUntilMin = 0;
  if (loose.bonusOffer === undefined) loose.bonusOffer = false;
  for (const c of g.contracts) {
    const old = c as typeof c & { offerExpiresDay?: number };
    if (c.offerExpiresMin === undefined) c.offerExpiresMin = ((old.offerExpiresDay ?? 0) + 0) * 1440;
  }
  if (loose.researched === undefined) {
    loose.researched = [];
    // Utstyr spilleren alt har, skal ikke kreve forskning i ettertid
    grantResearchForOwned(g);
  }
  return g;
}
