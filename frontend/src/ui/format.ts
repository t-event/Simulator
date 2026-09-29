import { MIN_PER_DAY } from "../game/data";

export { fmtKr, fmtT } from "../game/engine";

export function fmtClock(minute: number): string {
  const m = Math.floor(minute % MIN_PER_DAY);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Klokka (telefonens tid) når serverens dag skifter, midnatt UTC: da betales utbyttet og bidraget for dagen før (B-368) */
export function payoutClock(now: number): string {
  const d = new Date(now);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
  return next.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
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

/** Spillminutter som kort tid: «under 1 t», «14 t», «1 døgn 5 t» (B-316) */
export function fmtDuration(minutes: number): string {
  if (!Number.isFinite(minutes)) return "–";
  const h = Math.floor(minutes / 60);
  if (h < 1) return "under 1 t";
  if (h < 24) return `${h} t`;
  const d = Math.floor(h / 24);
  const rest = h % 24;
  return rest ? `${d} døgn ${rest} t` : `${d} døgn`;
}
