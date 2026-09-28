/**
 * Status for stedene i anlegget (B-195, B-233): hva en ovn gjør nå, og hvilket statusspråk en tekst fra motoren har.
 * Brukes av produksjonslinja på Oversikt og av statusen øverst i utstyrsarkene.
 */
import { GRADES } from "../game/data";
import type { GameState } from "../game/types";
import type { Status } from "./ds";
import { fmtT } from "./format";

export function furnaceState(g: GameState, index: number): { text: string; progress: number | null } {
  const f = g.furnaces[index];
  if (f.heat) {
    const p = (g.minute - f.heat.startMin) / (f.heat.endMin - f.heat.startMin);
    const who = f.heat.manual ? " (kjørt av deg)" : "";
    return { text: `Smelter ${fmtT(f.heat.sizeT)} ${GRADES[f.heat.grade].name.toLowerCase()}${who}`, progress: p };
  }
  if (g.pendingManual?.furnace === index) return { text: "Venter på deg i kontrollrommet", progress: null };
  return { text: f.waitReason ?? "Klar", progress: null };
}

/** Statusspråket (UI.md 6.2, B-195): hva teksten fra motoren betyr, så ruta får riktig ikon og farge */
export function statusOf(text: string): Status {
  if (/^Havari/.test(text)) return "feil";
  if (/^Planlagt stans|[Ff]oringen skal byttes/.test(text)) return "vedlikehold";
  if (/Mangler skrap/.test(text)) return "tomt";
  if (/fullt/.test(text)) return "fullt";
  if (/Mangler folk/.test(text)) return "folk";
  if (/Utenfor arbeidstid|Strømprisen|Utkoblet|står/.test(text)) return "stopp";
  if (/^Smelter|^Støper/.test(text)) return "kjorer";
  return "venter";
}
