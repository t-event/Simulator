/**
 * Lagring i nettleseren. Nettleseren kan nekte lagring (privat modus,
 * blokkerte data), så alle kall er pakket inn og spillet fungerer uten.
 */
import { grantResearchForOwned } from "./actions";
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
  if (loose.researched === undefined) {
    loose.researched = [];
    // Utstyr spilleren alt har, skal ikke kreve forskning i ettertid
    grantResearchForOwned(g);
  }
  return g;
}
