/**
 * Støpemaskinen og valseverket i kontrollrommet (B-505): det spillet gir i eget verk. Trening i spilltid (B-323) –
 * fagpoeng én gang per spilldøgn per spill, en rekord, og med 4–5 stjerner en kort fordel i drifta:
 *
 *   - Støpemaskinen: halvparten så mange strenggjennombrudd i 24 timer (48 med 5 stjerner).
 *   - Valseverket: utbyttet i valseverket 1 (2) prosentpoeng høyere i like lang tid – mindre kapp og glødeskall.
 *
 * Ingen salgsbonus (B-305) og ingenting mellom spillere. Selve spillet ligger i ui/control/miniGame.ts.
 */
import { awardPoints, log } from "./engine";
import { hasMoulds } from "./mould";
import { day, rollingActive } from "./plant";
import type { GameState, MiniKind, MiniRecord } from "./types";

export type { MiniKind, MiniRecord };

export const MINI_NAMES: Record<MiniKind, string> = { stoping: "Støpemaskinen", valsing: "Valseverket" };

/** Kan spillet spilles i verket nå? Støpemaskinen krever strengstøping, valseverket et valseverk som går */
export function miniAvailable(g: GameState, kind: MiniKind): boolean {
  return kind === "stoping" ? hasMoulds(g) : rollingActive(g);
}

function record(g: GameState, kind: MiniKind): MiniRecord | undefined {
  return g.minis?.[kind];
}

/** Stjernene i fordelen som gjelder nå (0 når ingen) */
export function miniBoost(g: GameState, kind: MiniKind): number {
  const r = record(g, kind);
  return r && r.boostUntilMin > g.minute ? r.boostStars : 0;
}

/** Faren for strenggjennombrudd ganges med denne */
export function castCalmFactor(g: GameState): number {
  return miniBoost(g, "stoping") >= 4 ? 0.5 : 1;
}

/** Ekstra utbytte i valseverket (andel) */
export function rollYieldBonus(g: GameState): number {
  const s = miniBoost(g, "valsing");
  return s >= 5 ? 0.02 : s >= 4 ? 0.01 : 0;
}

/** Fagpoeng for et spill: som i kontrollrommet, men bare én gang per spilldøgn per spill */
export function miniFp(rating: number): number {
  return 1 + rating + (rating >= 5 ? 10 : rating >= 4 ? 5 : 0);
}

/** Om fagpoengene alt er gitt i dag */
export function miniFpToday(g: GameState, kind: MiniKind): boolean {
  return record(g, kind)?.fpDay === day(g);
}

/** Spillet er ferdig: fagpoeng, rekord og fordel. Gir det som skjedde, til resultatet */
export function finishMini(
  g: GameState,
  kind: MiniKind,
  rating: number,
  points: number,
): { fp: number; record: boolean; boostHours: number } {
  const today = day(g);
  const minis = (g.minis ??= {});
  const r = (minis[kind] ??= { best: 0, fpDay: -1, boostUntilMin: 0, boostStars: 0 });
  const fp = r.fpDay === today ? 0 : miniFp(rating);
  if (fp > 0) {
    awardPoints(g, fp);
    r.fpDay = today;
  }
  const isRecord = points > r.best;
  if (isRecord) r.best = points;
  const boostHours = rating >= 5 ? 48 : rating >= 4 ? 24 : 0;
  if (boostHours > 0 && miniAvailable(g, kind)) {
    // En fordel som alt gjelder, kortes aldri ned, og fem stjerner blir ikke fire
    r.boostStars = Math.max(rating, r.boostUntilMin > g.minute ? r.boostStars : 0);
    r.boostUntilMin = Math.max(r.boostUntilMin, g.minute + boostHours * 60);
    log(
      g,
      kind === "stoping"
        ? `Godt kjørt ved støpemaskinen! Operatørene holder farten bedre: halvparten så mange strenggjennombrudd i ${boostHours} timer.`
        : `Godt kjørt i valseverket! Mindre kapp og glødeskall: ${rating >= 5 ? 2 : 1} prosentpoeng mer armering av emnene i ${boostHours} timer.`,
      "good",
    );
  }
  if (fp > 0)
    log(
      g,
      `${MINI_NAMES[kind]}: +${fp} fagpoeng${isRecord ? ` og ny rekord (${Math.round(points)} poeng)` : ""}.`,
      "info",
    );
  return { fp, record: isRecord, boostHours: miniAvailable(g, kind) ? boostHours : 0 };
}
