/**
 * Kjøp, avbestilling og salg i konsernet (B-326): verkene går via serveren (konsernkassa), de felles funksjonene via
 * kassa i spillet. Etter svaret legges serverens konsern inn i spillet, og verdensstatusen hentes på nytt.
 */
import type { KonsernOption } from "../game/konsern";
import { ORDER_REFUSAL_TEXT } from "../game/konsernWorld";
import type { GameApi } from "../game/useGame";
import { applyKonsern, cancelKonsern, orderKonsern, sellKonsern, type KonsernResult } from "../net/konsern";
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

/** Kjør et kjøp fra Konsern: bestilling på serveren eller kjøp fra kassa i spillet */
export async function runOption(act: Act, o: KonsernOption): Promise<boolean> {
  if (o.run) return act((gg) => o.run!(gg)).ok;
  if (!o.request) return false;
  return done(act, await orderKonsern(o.request), `${o.title}: bestilt.`);
}

export async function cancelOrderUi(act: Act, id: number): Promise<boolean> {
  return done(act, await cancelKonsern(id), "Avbestilt – pengene er tilbake i konsernkassa.");
}

export async function sellPlantUi(act: Act, id: number, name: string): Promise<boolean> {
  return done(act, await sellKonsern(id), `${name} er solgt. Pengene står i konsernkassa.`);
}
