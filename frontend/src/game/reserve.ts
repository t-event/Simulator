/**
 * Midlertidig sikkerhetsventil for kassa (B-193): en myk grense for disponibel lokal kasse. Det som ville gått over
 * grensen, flyttes til en **bunden konsernreserve** i stedet for å slettes.
 *
 * Reserven kan ikke brukes eller flyttes til konsernkassa på serveren (den leser bare `cash`), teller ikke på lista
 * «mest penger på bok» (tidslinja sender `cash`), og påvirker ikke anbud, Kontroll eller Industrimakt (B-190).
 * Den teller i konsernverdien, så titler, sluttmål og juksesperrens vekstkontroll regner som før.
 *
 * Dette er ikke rebalanseringen av sluttspillet. Når den kommer, skal reserven migreres eller få en ordentlig funksjon.
 * Grensen justeres eller slås av her (`softCap: null`).
 */
import { fmtKr, log } from "./engine";
import { day } from "./plant";
import type { GameState } from "./types";

export const CASH_RESERVE: { softCap: number | null } = {
  /** Myk grense for disponibel kasse i kroner; null slår ventilen av */
  softCap: 100_000_000_000,
};

/** Kroner i den bundne konsernreserven */
export function reserveTotal(g: GameState): number {
  return g.lockedReserve?.total ?? 0;
}

/** Flytter det som er over grensen, fra kassa til reserven. Gir beløpet som ble flyttet. */
export function applyCashCap(g: GameState): number {
  const cap = CASH_RESERVE.softCap;
  if (cap === null || !(g.cash > cap)) return 0;
  const moved = g.cash - cap;
  g.cash = cap;
  const first = !g.lockedReserve;
  g.lockedReserve ??= { total: 0, firstDay: day(g), movedToday: 0 };
  g.lockedReserve.total += moved;
  g.lockedReserve.movedToday += moved;
  // Forklares først når det skjer (gradvis synlighet, B-180)
  if (first)
    log(
      g,
      `Kassa har nådd ${fmtKr(cap)}. Det du tjener utover, settes nå av i en bunden konsernreserve: pengene er dine og teller i konsernverdien, men kan ikke brukes ennå. Se Verket → Økonomi.`,
      "info",
    );
  return moved;
}

/** Ved nytt døgn: én linje om hva som ble satt av i reserven døgnet før */
export function reserveDayLog(g: GameState): void {
  const r = g.lockedReserve;
  if (!r || r.movedToday <= 0) return;
  log(
    g,
    `Over grensen for kassa: ${fmtKr(r.movedToday)} ble satt av i den bundne konsernreserven i går (i alt ${fmtKr(r.total)}).`,
    "info",
  );
  r.movedToday = 0;
}
