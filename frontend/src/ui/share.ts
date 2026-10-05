/**
 * Del spillet (B-458): telefonens egen delingsmeny med et bilde av verket, én setning og lenken – eller lenken kopiert
 * når nettleseren ikke kan dele. Lenken kan ha en vervekode (`?verv=KODE`, B-459).
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

/** Anleggsbildet som PNG (1 200 px bredt), eller null hvis nettleseren ikke klarer å tegne det */
export async function sceneImage(svg: SVGSVGElement | null): Promise<File | null> {
  if (!svg) return null;
  try {
    const box = svg.viewBox.baseVal;
    const w = 1200;
    const h = Math.round((w * box.height) / box.width);
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("width", String(w));
    copy.setAttribute("height", String(h));
    const src = new XMLSerializer().serializeToString(copy);
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
    return blob ? new File([blob], "stalverket.png", { type: "image/png" }) : null;
  } catch {
    return null;
  }
}

export type ShareResult = "delt" | "kopiert" | "avbrutt" | "feil";

/** Deler med telefonens delingsmeny (med bildet når det går), ellers kopieres teksten og lenken */
export async function shareGame(text: string, url: string, svg?: SVGSVGElement | null): Promise<ShareResult> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.share === "function") {
    const file = await sceneImage(svg ?? null);
    const withFile: ShareData = file
      ? { title: "Stålverket", text, url, files: [file] }
      : { title: "Stålverket", text, url };
    const data = file && nav.canShare?.(withFile) ? withFile : { title: "Stålverket", text, url };
    try {
      await nav.share(data);
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
