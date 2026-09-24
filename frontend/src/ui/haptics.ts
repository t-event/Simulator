/** Kort vibrasjon på telefoner som støtter det (Android). Ignoreres ellers. */
export function buzz(ms: number | number[] = 12): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Noen nettlesere kaster hvis vibrasjon er slått av
  }
}
