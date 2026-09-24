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
