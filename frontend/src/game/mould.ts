/**
 * Kokillene i strengstøpingen (B-351). Kokillen er den vannkjølte kobberformen stålet størkner i. Den slites av hvert tonn
 * som støpes; en slitt kokille gir ujevnt skall og flere strenggjennombrudd. Bytte koster litt og stopper støpingen et par
 * timer. Reparatøren bytter den selv, som foringen, når «Reparatøren bytter foringen» er på.
 */
import { addCost, creditLimit, fmtKr, log, unlock, type PurchaseResult } from "./engine";
import { castingType, day, has, presentWorkers, type PlantStats } from "./plant";
import { auto } from "./research";
import type { GameState } from "./types";

export const MOULD = {
  /** Døgn med full støping før kokillene er helt slitt */
  lifeDays: 20,
  /** Fra denne slitasjen øker faren for strenggjennombrudd … */
  riskFrom: 0.75,
  /** … med så mye per 100 % slitasje over grensen (100 % slitt: 1,75 ganger så ofte; 5 ga for mye stans på storverket) */
  riskSlope: 3,
  /** Høyeste slitasje som telles (utslitt) */
  maxWear: 1.5,
  /** Rådet kommer her, og reparatøren bytter her */
  warnAt: 0.85,
  autoAt: 0.9,
  /** Timer støpingen står for bytte (ganget med reparasjonsfarten) */
  swapHours: 2,
  /** Pris per støpemaskin: en hundredel av maskinen, minst 20 000 kr */
  costShare: 0.01,
  minCost: 20_000,
};

/** Har verket kokiller å slite på? (bare strengstøping) */
export function hasMoulds(g: GameState): boolean {
  return castingType(g).continuous === true;
}

export function mouldWear(g: GameState): number {
  return g.mould?.wear ?? 0;
}

/** Hvor mye oftere strengen bryter gjennom med dagens slitasje */
export function mouldRisk(g: GameState): number {
  return 1 + MOULD.riskSlope * Math.max(0, mouldWear(g) - MOULD.riskFrom);
}

function machines(g: GameState): number {
  return has(g, "streng3") ? 3 : has(g, "streng2") ? 2 : 1;
}

export function mouldCost(g: GameState): number {
  return Math.max(MOULD.minCost, Math.round(castingType(g).price * MOULD.costShare * machines(g)));
}

export function mouldSwapHours(stats: PlantStats): number {
  return MOULD.swapHours * stats.repairFactor;
}

/** Døgn til kokillene er slitt med full støping */
export function mouldDaysLeft(g: GameState): number {
  return Math.max(0, (1 - mouldWear(g)) * MOULD.lifeDays);
}

/** Tonn støpt slites kokillene av (fra castBatch) */
export function wearMoulds(g: GameState, t: number, stats: PlantStats): void {
  if (!hasMoulds(g) || t <= 0) return;
  const life = Math.max(1, stats.castTph * 24 * MOULD.lifeDays);
  const m = (g.mould ??= { wear: 0, lastDay: day(g) });
  const before = m.wear;
  m.wear = Math.min(MOULD.maxWear, m.wear + t / life);
  if (before < MOULD.warnAt && m.wear >= MOULD.warnAt) {
    unlock(g, "streng");
    log(
      g,
      "Kokillene i strengstøpingen er slitt. Skallet blir ujevnt, og strengen bryter lettere gjennom. Bytt dem under Anlegg → Vedlikehold.",
      "event",
    );
  }
}

/** Bytter kokillene: koster litt og stopper støpingen et par timer */
export function replaceMoulds(g: GameState, stats: PlantStats, byRepairer = false): PurchaseResult {
  if (!hasMoulds(g)) return { ok: false, message: "Verket har ingen strengstøping." };
  if (mouldWear(g) < 0.05) return { ok: false, message: "Kokillene er nye." };
  const cost = mouldCost(g);
  if (g.cash - cost < -creditLimit(g, stats)) return { ok: false, message: "Du har ikke råd til nye kokiller." };
  addCost(g, "vedlikehold", cost);
  const hours = mouldSwapHours(stats);
  g.castDownUntilMin = Math.max(g.castDownUntilMin, g.minute) + Math.round(hours * 60);
  g.mould = { wear: 0, lastDay: day(g) };
  const h = hours.toFixed(1).replace(".", ",");
  log(
    g,
    `${byRepairer ? "Reparatøren byttet" : "Nye"} kokiller i strengstøpingen (${fmtKr(cost)}). Støpingen står i ${h} timer.`,
    "info",
  );
  return { ok: true, message: `Kokillene byttes – støpingen står i ${h} timer.` };
}

/** Hver time: reparatøren bytter slitte kokiller når han bytter foringen selv (samme bryter) */
export function mouldHour(g: GameState, stats: PlantStats): void {
  if (!hasMoulds(g) || mouldWear(g) < MOULD.autoAt || g.minute < g.castDownUntilMin) return;
  if (!auto(g, "autoReline") || !presentWorkers(g).some((w) => w.role === "vedlikehold")) return;
  replaceMoulds(g, stats, true);
}
