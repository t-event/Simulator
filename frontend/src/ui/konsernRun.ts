/**
 * Kjøp, avbestilling og salg i konsernet (B-326): verkene går via serveren (konsernkassa), de felles funksjonene via
 * kassa i spillet. Etter svaret legges serverens konsern inn i spillet, og verdensstatusen hentes på nytt.
 */
import { noteKonsernBuy, noteKonsernCancel, type KonsernOption } from "../game/konsern";
import { fmtKr } from "./format";
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
import { userId } from "../net/supabase";
import { tenderChanged } from "./openTender";

type Act = GameApi["act"];

/**
 * Svaret fra serveren gjelder kontoen som sendte kjøpet (B-426). Byttes kontoen mens svaret er på vei, legges det ikke
 * inn i det nye spillet – serveren skriver konsernet inn i den første kontoens spill ved neste lagring (save_game).
 */
/** Hva svaret skal telle i dagens oppdrag «datter» (B-470, B-472): et kjøp, eller avbestillingen av en bestilling */
type Count = { buy: true } | { cancel: number } | null;

function done(act: Act, uid: string | null, r: KonsernResult, okText: string, count: Count = null): boolean {
  if (!uid || userId() !== uid) return false;
  if (!r.ok) {
    act(() => ({ ok: false, message: ORDER_REFUSAL_TEXT[r.reason] ?? ORDER_REFUSAL_TEXT.nett }));
    return false;
  }
  const w = r.konsern;
  const applied = act((gg) => {
    if (gg.owner && gg.owner !== uid) return false;
    const before = new Set(gg.konsern.orders.map((o) => o.id));
    if (w) applyKonsern(gg, w, gg.konsern.treasury?.perDay ?? 0);
    // Dagens oppdrag «datter» teller kjøpet med én gang (B-470); bestillingen huskes for dagen (B-472)
    if (count && "buy" in count) {
      // Den nyeste av de nye: kom en bestilling fra en annen enhet med i samme svar, er det ikke den (B-473)
      const fresh = gg.konsern.orders.filter((o) => !before.has(o.id)).map((o) => o.id);
      noteKonsernBuy(gg, fresh.length ? Math.max(...fresh) : null);
    }
    if (count && "cancel" in count) noteKonsernCancel(gg, count.cancel);
    return { ok: true, message: okText };
  });
  if (!applied) return false;
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
export async function runOption(act: Act, o: KonsernOption, loan = 0): Promise<boolean> {
  if (o.run) return act((gg) => o.run!(gg)).ok;
  if (!o.request) return false;
  const req = o.request.kind === "bygg" && buildRegion ? { ...o.request, region: buildRegion } : o.request;
  const uid = userId();
  // Med lån (B-437): serveren låner det kassa mangler, innenfor rammen
  return done(
    act,
    uid,
    await orderKonsern(req, loan > 0),
    loan > 0 ? `${o.title}: bestilt. ${fmtKr(loan)} er lånt i konsernbanken.` : `${o.title}: bestilt.`,
    { buy: true },
  );
}

/** Flytt et verk til en annen region, én gang (B-333) */
export async function movePlantUi(act: Act, id: number, name: string, region: RegionId): Promise<boolean> {
  const uid = userId();
  return done(act, uid, await moveKonsern(id, region), `${name} står nå i ${regionName(region)}.`);
}

export async function cancelOrderUi(act: Act, id: number): Promise<boolean> {
  const uid = userId();
  return done(act, uid, await cancelKonsern(id), "Avbestilt – pengene er tilbake i konsernkassa.", {
    cancel: id,
  });
}

export async function sellPlantUi(act: Act, id: number, name: string): Promise<boolean> {
  const uid = userId();
  return done(act, uid, await sellKonsern(id), `${name} er solgt. Pengene står i konsernkassa.`);
}
