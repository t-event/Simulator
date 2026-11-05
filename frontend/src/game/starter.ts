/**
 * Starthjelpen (B-516): i garasjen og verkstedet går spillet ikke fra nybegynneren.
 *
 * Retningsanalysen (B-515) fant at alle 20 som sto fast på nivå 0–1, hadde levert noe, men mistet kontrollen fordi
 * klokka gikk:
 *   - skrapet tok slutt og ovnen sto,
 *   - forespørslene gikk ut,
 *   - og bot, havari og banken tok omdømmet og kassa.
 * Derfor, til og med verkstedet:
 *   - Skraphandleren kjører på skrap når ovnen ellers ville stått (`starterScrap`).
 *   - Naboen bytter foringen før den brenner gjennom (`starterRelineDue`).
 *   - En frist som går ut, gir et råd, ikke bot eller tap av omdømme.
 *   - Banken slår ikke verket konkurs.
 *   - Spillet venter når køen er tom og en forespørsel venter (`starterWaitOffer`).
 * I tillegg synker omdømmet aldri under kravet for nivået man har nådd (`stageReputationFloor`, alle nivåer).
 */
import { STAGES } from "./data";
import type { Contract, GameState } from "./types";

/** Høyeste nivå med starthjelp: verkstedet (nivå 1) */
export const STARTER_MAX_STAGE = 1;

/** Slitasjen der naboen bytter foringen (før faren for gjennombrenning begynner ved 90 %) */
export const STARTER_RELINE_WEAR = 0.85;

/** Har spilleren starthjelp? */
export function starterHelp(g: GameState): boolean {
  return g.stage <= STARTER_MAX_STAGE;
}

/** Omdømmet synker ikke under kravet for nivået verket har nådd */
export function stageReputationFloor(g: GameState): number {
  return STAGES[g.stage]?.reputation ?? 0;
}

/**
 * Forespørselen spillet venter på: i starthjelpen, når ingen kontrakt er i gang og en forespørsel venter som spillet
 * ikke har ventet på før. Spillet pauser da én gang per forespørsel, så klokka ikke går mens ovnen ikke har noe å lage.
 */
export function starterWaitOffer(g: GameState): Contract | null {
  if (!starterHelp(g) || g.gameOver || g.pendingDecision || g.pendingManual) return null;
  if (g.contracts.some((c) => c.status === "aktiv")) return null;
  const offer = g.contracts
    .filter((c) => c.status === "tilbud" && c.id > (g.starterWaitedFor ?? 0))
    .sort((a, b) => a.id - b.id)[0];
  return offer ?? null;
}
