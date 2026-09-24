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
