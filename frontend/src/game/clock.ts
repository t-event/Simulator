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
