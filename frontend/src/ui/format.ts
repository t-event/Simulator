import { MIN_PER_DAY } from "../game/data";

export { fmtKr, fmtT } from "../game/engine";

export function fmtClock(minute: number): string {
  const m = Math.floor(minute % MIN_PER_DAY);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function fmtPct(v: number, digits = 0): string {
  return `${(v * 100).toFixed(digits).replace(".", ",")} %`;
}

export function fmtNum(v: number, digits = 0): string {
  return v.toLocaleString("nb-NO", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * Omdømme med én desimal, rundet ned. Kravene sjekker den eksakte verdien, så
 * visningen må aldri runde opp til et tall spilleren ikke har nådd ennå.
 */
export function fmtRep(v: number): string {
  const floored = Math.floor(v * 10 + 1e-9) / 10;
  return Number.isInteger(floored) ? String(floored) : floored.toFixed(1).replace(".", ",");
}

/** «12 timers drift» / «1,5 døgns drift»: det verket tjener på så lang tid i spillet (B-149) */
export function driftText(days: number): string {
  return days < 1 ? `${Math.round(days * 24)} timers drift` : `${fmtNum(days, days % 1 ? 1 : 0)} døgns drift`;
}
