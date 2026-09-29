/**
 * Ekte tid (B-209, B-210): byggeprosjektene i konsernet og pausen mellom like hendelseskort går i ekte tid, uansett
 * spillfart. Testene og testspilleren setter sin egen klokke med setRealClock.
 */
let clock: () => number = () => Date.now();

/** Ekte tid i ms */
export function realNow(): number {
  return clock();
}

export function setRealClock(fn: () => number): void {
  clock = fn;
}

/** Serverens dag skifter ved midnatt norsk tid (B-369), som `world_today()`/`world_day()` i SQL */
const WORLD_TZ = "Europe/Oslo";
const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: WORLD_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: WORLD_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Den ekte dagen på serveren for et tidspunkt, «2026-09-30» (norsk dato) */
export function worldDay(atMs: number): string {
  return dayFmt.format(atMs);
}

/** Hvor mye norsk tid ligger foran UTC i ms (1 eller 2 timer) */
function osloOffsetMs(atMs: number): number {
  const p = Object.fromEntries(partsFmt.formatToParts(atMs).map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(atMs / 1000) * 1000;
}

/** Neste midnatt norsk tid i ms – da betaler serveren for dagen som gikk */
export function nextWorldMidnight(now: number): number {
  const [y, m, d] = worldDay(now).split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d + 1);
  return utcMidnight - osloOffsetMs(utcMidnight);
}
