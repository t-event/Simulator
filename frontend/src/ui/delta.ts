/**
 * Endringen under et nøkkeltall (B-404): retning, ord og om det er bra. Pila og ordet bærer meningen; fargen er et
 * tillegg (grønn bra, rød dårlig, grå uendret). Tegnes av `DeltaLine` i ds.tsx.
 */
export interface Delta {
  text: string;
  /** Hele setningen når `text` er kort (smale ruter), vist som verktøytips og for skjermlesere */
  long?: string;
  dir: "up" | "down" | "flat";
  /** Er endringen bra? Avgjør fargen; mangler den, er linja nøytral */
  good?: boolean;
}

/**
 * Endringen fra `before` til `now`, med ord: «1,2 mill. kr mer enn døgnet før». `higherIsGood` sier om opp er bra.
 * Endringer under `epsilon` regnes som uendret, så avrunding ikke gir en pil. `short` gir bare «+27 t» (for de smale
 * rutene i `Stat`), med hele setningen i `long`.
 */
export function changeDelta(
  now: number,
  before: number,
  fmt: (n: number) => string,
  { than = "døgnet før", higherIsGood = true, epsilon = 0.5, short = false } = {},
): Delta {
  const diff = now - before;
  if (Math.abs(diff) < epsilon) return { text: short ? "Uendret" : `Som ${than}`, long: `Som ${than}`, dir: "flat" };
  const up = diff > 0;
  const long = `${fmt(Math.abs(diff))} ${up ? "mer" : "mindre"} enn ${than}`;
  return {
    text: short ? `${up ? "+" : "\u2212"}${fmt(Math.abs(diff))}` : long,
    long,
    dir: up ? "up" : "down",
    good: up === higherIsGood,
  };
}
