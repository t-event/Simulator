/**
 * Privat formue (B-303, B-306, B-359) – fryst historikk fra B-381. Fram til B-381 hadde kassa et tak på 10 mrd., og det
 * verket tjente over taket, ble betalt ut til eierne. Taket er fjernet: kassa i hovedverket kan vokse fritt, fordi lokale
 * penger ikke gir makt i verden (B-323). Det som alt er betalt ut, står som historikk («Privat formue» på Økonomi og i
 * Hall of Fame). Ingen får det tilbake, og ingenting nytt legges til.
 *
 * Den bundne konsernreserven (B-193) er avviklet: det som sto der, regnes som utbetalt til eierne fra før. Feltet
 * `lockedReserve` beholdes urørt i lagringen (eldre utgaver av appen skriver fortsatt til det), og `paidOutTotal`
 * teller begge. Ingen migrering av lagringene trengs.
 */
import { fmtKr, log } from "./engine";
import { day } from "./plant";
import type { GameState } from "./types";

export const CASH_RESERVE: { softCap: number | null } = {
  /** Taket for kassa i kroner. null = uten tak (B-381); var 10 mrd. fra B-306 */
  softCap: null,
};

/** Kroner betalt ut til eierne i alt, medregnet den gamle bundne reserven (B-193) */
export function paidOutTotal(g: GameState): number {
  return (g.lockedReserve?.total ?? 0) + (g.paidOut?.total ?? 0);
}

/** Ble noe betalt ut før taket ble fjernet (B-381)? Da vises den fryste formuen (gradvis synlighet, B-180) */
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
      `Kassa har nådd ${fmtKr(cap)} – mer enn alt som kan kjøpes. Det verket tjener utover, flyttes nå til din private formue. Den teller ikke i konsernverdien, men står i Hall of Fame som «Privat formue». Se Verket → Økonomi.`,
      "info",
    );
  return moved;
}

/** Ved nytt døgn: én linje om hva som ble betalt ut døgnet før (bare når taket er på) */
export function paidOutDayLog(g: GameState): void {
  const p = g.paidOut;
  if (!p || p.today <= 0) return;
  if (CASH_RESERVE.softCap !== null)
    log(
      g,
      `Over taket for kassa: ${fmtKr(p.today)} ble flyttet til din private formue i går (${fmtKr(paidOutTotal(g))} i alt).`,
      "info",
    );
  p.today = 0;
}
