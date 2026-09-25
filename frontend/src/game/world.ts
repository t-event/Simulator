/**
 * Felles hendelser og sesong i spilltilstanden (B-129). Ren TypeScript: nettlaget henter hendelsene, og
 * `applyWorldEvents` legger dem inn her. Prisene i motoren ganges med faktorene så lenge hendelsene ligger i lista.
 */
import { log } from "./engine";
import type { GameState, WorldEvent } from "./types";

/** Startkapital og fagpoeng for den som var med i forrige sesong: med vilje lite (brukerens beskjed) */
export const SEASON_BONUS_CASH = 1.05;
export const SEASON_BONUS_FP = 10;

/** Produktet av faktorene til hendelsene som pågår, for skrap, stål eller strøm */
export function worldFactor(g: GameState, key: "scrap" | "steel" | "power"): number {
  const events = g.world?.events;
  if (!events || events.length === 0) return 1;
  let f = 1;
  for (const e of events) f *= e[key];
  return f;
}

/** Bytter ut hendelsene med det serveren sier pågår nå, og logger dem som er nye for spilleren */
export function applyWorldEvents(g: GameState, events: WorldEvent[]): void {
  if (!g.world) g.world = { events: [], seenEventIds: [] };
  const before = g.world.events.map((e) => e.id).join(",");
  g.world.events = events;
  if (events.map((e) => e.id).join(",") === before) return;
  for (const e of events) {
    if (g.world.seenEventIds.includes(e.id)) continue;
    g.world.seenEventIds.push(e.id);
    log(g, `${e.title}: ${e.text}`, "event");
  }
  if (g.world.seenEventIds.length > 50) g.world.seenEventIds.splice(0, g.world.seenEventIds.length - 50);
}

/** Kobler et nytt spill til sesongen, med fordelen for den som var med sist */
export function joinSeason(g: GameState, seasonId: number, bonus: boolean): void {
  g.season = seasonId;
  g.seasonPromptSeen = seasonId;
  if (bonus) {
    g.cash = Math.round(g.cash * SEASON_BONUS_CASH);
    g.researchPoints += SEASON_BONUS_FP;
    log(g, `Du var med i forrige sesong: ${SEASON_BONUS_FP} fagpoeng og 5 % mer startkapital.`, "good");
  }
}
