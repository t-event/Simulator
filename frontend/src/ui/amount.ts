/** Beløpsfelt i millioner (B-447): tekst i feltet til kroner og tilbake, brukt av `MillInput` */

/** Beløp i millioner fra et felt, til kroner. Godtar komma og punktum og mellomrom («0,1», «1 000») */
export function millions(v: string): number {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1_000_000) : 0;
}

/** Kroner som millioner til et felt eller et eksempel («0,1», «324») – aldri rundet til 0 */
export function millText(kr: number): string {
  return (kr / 1e6).toLocaleString("nb-NO", { maximumFractionDigits: 2, useGrouping: false });
}
