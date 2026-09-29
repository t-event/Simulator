/**
 * Kassetaket og utbetalingen til eierne (B-303, reform 2). Alt som kan kjøpes i spillet, koster til sammen rundt
 * 100–130 mrd. Over taket er kassa bare et tall, så det verket tjener utover, betales ut til eierne: en historikk
 * («Utbetalt til eierne», egen liste i Hall of Fame) som ikke teller i konsernverdien og ikke kan brukes.
 *
 * Den bundne konsernreserven (B-193) er avviklet: det som sto der, regnes som utbetalt til eierne fra før. Feltet
 * `lockedReserve` beholdes urørt i lagringen (eldre utgaver av appen skriver fortsatt til det), og `paidOutTotal`
 * teller begge. Ingen migrering av lagringene trengs.
 */
import { fmtKr, log } from "./engine";
import { day } from "./plant";
import type { GameState } from "./types";

export const CASH_RESERVE: { softCap: number | null } = {
  /** Taket for kassa i kroner; null slår det av */
  softCap: 100_000_000_000,
};

/** Kroner betalt ut til eierne i alt, medregnet den gamle bundne reserven (B-193) */
export function paidOutTotal(g: GameState): number {
  return (g.lockedReserve?.total ?? 0) + (g.paidOut?.total ?? 0);
}

/** Har kassa noen gang nådd taket? Da vises utbetalingen (gradvis synlighet, B-180) */
export function hasPaidOut(g: GameState): boolean {
  return paidOutTotal(g) > 0;
}

/** Betaler ut det som er over taket. Gir beløpet som ble betalt ut. */
export function applyCashCap(g: GameState): number {
  const cap = CASH_RESERVE.softCap;
  if (cap === null || !(g.cash > cap)) return 0;
  const moved = g.cash - cap;
  g.cash = cap;
  const first = !hasPaidOut(g);
  g.paidOut ??= { total: 0, firstDay: day(g), today: 0 };
  g.paidOut.total += moved;
  g.paidOut.today += moved;
  // Forklares første gang det skjer (gradvis synlighet, B-180)
  if (first)
    log(
      g,
      `Kassa har nådd ${fmtKr(cap)} – mer enn alt som kan kjøpes. Det verket tjener utover, betales nå ut til eierne. Pengene teller ikke i konsernverdien, men står i Hall of Fame som «Utbetalt til eierne». Se Verket → Økonomi.`,
      "info",
    );
  return moved;
}

/** Ved nytt døgn: én linje om hva som ble betalt ut døgnet før */
export function paidOutDayLog(g: GameState): void {
  const p = g.paidOut;
  if (!p || p.today <= 0) return;
  log(
    g,
    `Over taket for kassa: ${fmtKr(p.today)} ble betalt ut til eierne i går (${fmtKr(paidOutTotal(g))} i alt).`,
    "info",
  );
  p.today = 0;
}
