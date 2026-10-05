/**
 * Del spillet (B-458): telefonens egen delingsmeny med én setning og lenken – eller lenken kopiert når nettleseren ikke
 * kan dele. Lenken kan ha en vervekode (`?verv=KODE`, B-459). Uten bilde (B-460): forhåndsvisningen av lenken viser det.
 */
import type { PlantStats } from "../game/plant";
import type { GameState } from "../game/types";
import { fmtNum } from "./format";

/** Adressen til spillet, med vervekoden når spilleren har en */
export function shareUrl(code?: string | null): string {
  const base = `${location.origin}${import.meta.env.BASE_URL}`;
  return code ? `${base}?verv=${encodeURIComponent(code)}` : base;
}

/** Én setning om verket: tonn i døgnet når det er i gang, ellers hvor det står */
export function shareText(g: GameState, stats: PlantStats): string {
  const t = Math.round(stats.dailyProductT);
  if (g.stage >= 1 && t > 0) return `Verket mitt lager ${fmtNum(t, 0)} tonn stål i døgnet i Stålverket. Klarer du mer?`;
  return "Jeg bygger et stålverk fra garasjen i Stålverket – spillet som lærer deg hvordan et stålverk fungerer.";
}

export type ShareResult = "delt" | "kopiert" | "avbrutt" | "feil";

/** Deler med telefonens delingsmeny, ellers kopieres teksten og lenken */
export async function shareGame(text: string, url: string): Promise<ShareResult> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Stålverket", text, url });
      return "delt";
    } catch (e) {
      // Spilleren lukket delingsmenyen: ikke en feil
      if (e instanceof DOMException && e.name === "AbortError") return "avbrutt";
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "kopiert";
  } catch {
    return "feil";
  }
}
