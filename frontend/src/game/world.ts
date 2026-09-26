/**
 * Felles hendelser og sesong i spilltilstanden (B-129). Ren TypeScript: nettlaget henter hendelsene, og
 * `applyWorldEvents` legger dem inn her. Prisene i motoren ganges med faktorene så lenge hendelsene ligger i lista.
 */
import { log } from "./engine";
import type { GameState, SeasonTwist, WorldEvent } from "./types";

/** Startkapital og fagpoeng for den som var med i forrige sesong: med vilje lite (brukerens beskjed) */
export const SEASON_BONUS_CASH = 1.05;
export const SEASON_BONUS_FP = 10;

/** Produktet av faktorene til hendelsene som pågår, for skrap, stål eller strøm */
export function worldFactor(g: GameState, key: "scrap" | "steel" | "power"): number {
  const events = g.world?.events;
  // Sesongens vri (B-152) regnes med som en hendelse som varer hele sesongen
  let f = g.world?.twist?.[key] ?? 1;
  if (!events || events.length === 0) return f;
  for (const e of events) f *= e[key];
  return f;
}

/**
 * Sesongens vri (B-152): legges inn når spillet er med i sesongen som pågår, og fjernes ellers. Første gang står den i
 * loggen.
 */
export function applySeasonTwist(g: GameState, seasonId: number | null, twist: SeasonTwist | null): void {
  if (!g.world) g.world = { events: [], seenEventIds: [] };
  const next = twist && seasonId !== null && g.season === seasonId ? twist : null;
  const before = g.world.twist?.id ?? null;
  g.world.twist = next;
  if (next && next.id !== before) log(g, `Sesongens vri – ${next.title}: ${next.text}`, "event");
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

/**
 * Et spill som fortsatt er i garasjen (bare veiledningen og litt til), blir med i sesongen direkte (B-133).
 * Har man flyttet videre, må man starte sesongen på nytt i garasjen. Nytt spill+ blir aldri med direkte: det
 * starter med mer penger, fagpoeng og omdømme, og det ville vært urettferdig i sesongen (B-140).
 */
export function canJoinDirectly(g: GameState): boolean {
  return g.stage === 0 && (g.round ?? 1) <= 1;
}

/** Hvorfor spillet ikke kan bli med i sesongen direkte, i vanlige ord */
export function notJoinableReason(g: GameState): string {
  if ((g.round ?? 1) > 1) return `Spillet ditt er nytt spill+ (runde ${g.round}) og starter med en fordel`;
  return `Spillet ditt (dag ${Math.floor(g.minute / 1440) + 1}) har kommet lenger enn garasjen`;
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
