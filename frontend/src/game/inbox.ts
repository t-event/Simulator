/** Varsellista (B-089): hvilke logglinjer som er viktige, og hvor mange som er nye. */
import type { GameState, LogEntry } from "./types";

/** Viktige hendelser (ikke vanlig info) */
export function importantLog(g: GameState): LogEntry[] {
  return g.log.filter((e) => e.kind !== "info");
}

/**
 * Antall problemer og hendelser siden spilleren sist åpnet varsellista. Gode nyheter står i lista, men gir
 * ikke tall på bjella (B-107) – den skal bare rope når noe trenger oppmerksomhet.
 */
export function unseenCount(g: GameState): number {
  return importantLog(g).filter((e) => e.kind !== "good" && e.id > (g.inboxSeenId ?? 0)).length;
}
