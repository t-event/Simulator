/**
 * Kjøp, avbestilling og salg i konsernet (B-326): verkene går via serveren (konsernkassa), de felles funksjonene via
 * kassa i spillet. Etter svaret legges serverens konsern inn i spillet, og verdensstatusen hentes på nytt.
 */
import type { KonsernOption } from "../game/konsern";
import { ORDER_REFUSAL_TEXT } from "../game/konsernWorld";
import type { GameApi } from "../game/useGame";
import { regionName } from "../game/regions";
import type { RegionId } from "../game/types";
import {
  applyKonsern,
  cancelKonsern,
  moveKonsern,
  orderKonsern,
  sellKonsern,
  type KonsernResult,
} from "../net/konsern";
import { tenderChanged } from "./openTender";

type Act = GameApi["act"];

function done(act: Act, r: KonsernResult, okText: string): boolean {
  if (!r.ok) {
    act(() => ({ ok: false, message: ORDER_REFUSAL_TEXT[r.reason] ?? ORDER_REFUSAL_TEXT.nett }));
    return false;
  }
  const w = r.konsern;
  act((gg) => {
    if (w) applyKonsern(gg, w, gg.konsern.treasury?.perDay ?? 0);
    return { ok: true, message: okText };
  });
  // Konsernkassa og budene på Industrien følger med
  tenderChanged();
  return true;
}

/** Regionen nye verk bygges i (B-333), valgt under Konsern → Utvid. Null: der du har færrest verk (serveren velger) */
let buildRegion: RegionId | null = null;
export function setBuildRegion(r: RegionId | null): void {
  buildRegion = r;
}
export function getBuildRegion(): RegionId | null {
  return buildRegion;
}

/** Kjør et kjøp fra Konsern: bestilling på serveren eller kjøp fra kassa i spillet */
export async function runOption(act: Act, o: KonsernOption): Promise<boolean> {
  if (o.run) return act((gg) => o.run!(gg)).ok;
  if (!o.request) return false;
  const req = o.request.kind === "bygg" && buildRegion ? { ...o.request, region: buildRegion } : o.request;
  return done(act, await orderKonsern(req), `${o.title}: bestilt.`);
}

/** Flytt et verk til en annen region, én gang (B-333) */
export async function movePlantUi(act: Act, id: number, name: string, region: RegionId): Promise<boolean> {
  return done(act, await moveKonsern(id, region), `${name} står nå i ${regionName(region)}.`);
}

export async function cancelOrderUi(act: Act, id: number): Promise<boolean> {
  return done(act, await cancelKonsern(id), "Avbestilt – pengene er tilbake i konsernkassa.");
}

export async function sellPlantUi(act: Act, id: number, name: string): Promise<boolean> {
  return done(act, await sellKonsern(id), `${name} er solgt. Pengene står i konsernkassa.`);
}
