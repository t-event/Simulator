/** Linja i varsellinja når en verksjef venter på svar (B-489) */
import { CALL_CARD_BY_ID } from "../game/managers";
import type { GameState } from "../game/types";
import type { ManagerCall } from "../net/managers";

export function managerCallText(g: GameState | null, call: ManagerCall): string {
  const plant = g?.konsern.plants.find((p) => p.id === call.plant)?.name ?? "et datterverk";
  const card = CALL_CARD_BY_ID[call.card];
  return card?.special
    ? `${call.manager ?? "Verksjefen"} på ${plant} har fått et tilbud fra en konkurrent`
    : `Verksjefen på ${plant} ringer: ${card?.title ?? "en sak"}`;
}
