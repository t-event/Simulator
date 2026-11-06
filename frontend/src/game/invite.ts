/**
 * Invitasjon til eierens nye spill i beta (B-519): et kort på Verket → Oversikt som spilleren kan åpne eller lukke.
 * Gradvis synlighet (B-180): ikke i den veiledede starten eller garasjen, der nye spillere skal lære spillet her først
 * (starthjelpen, B-516). Lukket kort huskes i `tipsSeen` (følger med ved «Bygg på nytt», B-517). Kortet forsvinner av
 * seg selv etter `until` (ekte dato).
 */
import { realNow, worldDay } from "./clock";
import type { GameState } from "./types";

export const BETA_INVITE = {
  id: "invitasjon-dynamittdalen-beta",
  name: "Dynamittdalen",
  url: "https://beta.dynamittdalen.no",
  /** Siste ekte dag kortet vises */
  until: "2027-01-31",
};

/** Skal invitasjonen vises? */
export function showBetaInvite(g: GameState, now = realNow()): boolean {
  return (
    g.tutorial === null && g.stage >= 1 && !g.tipsSeen.includes(BETA_INVITE.id) && worldDay(now) <= BETA_INVITE.until
  );
}

/** Spilleren har åpnet eller lukket invitasjonen: den vises ikke igjen */
export function dismissBetaInvite(g: GameState): void {
  if (!g.tipsSeen.includes(BETA_INVITE.id)) g.tipsSeen.push(BETA_INVITE.id);
}
