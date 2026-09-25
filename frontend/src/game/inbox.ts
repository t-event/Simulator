/** Varsellista (B-089): hvilke logglinjer som er viktige, og hvor mange som er nye. */
import type { GameState, LogEntry } from "./types";

/** Viktige hendelser (ikke vanlig info) */
export function importantLog(g: GameState): LogEntry[] {
  return g.log.filter((e) => e.kind !== "info");
}

/** Antall viktige hendelser siden spilleren sist åpnet varsellista */
export function unseenCount(g: GameState): number {
  return importantLog(g).filter((e) => e.id > (g.inboxSeenId ?? 0)).length;
}
