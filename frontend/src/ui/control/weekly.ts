/**
 * Ukens kontrollrom (B-387): samme charge for alle den uka. Kvaliteten og de tre tellende frøene (A, B, C) kommer fra
 * serveren (`weekly_control_start`); her lages chargen de spilles på, og frøene til trening.
 */
import type { GradeId, ManualRequest } from "../../game/types";

const GRADES_OK: GradeId[] = ["enkel", "standard", "armering", "lavkarbon", "hoykarbon", "premium"];

/** Kvaliteten fra serveren, eller standard hvis den er ukjent */
export function weeklyGrade(g: string | null | undefined): GradeId {
  return GRADES_OK.includes(g as GradeId) ? (g as GradeId) : "standard";
}

/**
 * Ukens charge: den samme for alle – ikke ovnen eller skrapet i eget verk. Samme tall som testene og testspilleren
 * bruker (40 t, vanlig skrap), så poengene kan sammenlignes.
 */
export function weeklyRequest(grade: GradeId): ManualRequest {
  const mix = { c: 0.3, p: 0.03, tramp: 0.2 };
  return {
    furnace: 0,
    sizeT: 40,
    grade,
    mix,
    expectedMix: mix,
    energyFactor: 1,
    metallicYield: 0.92,
    radioactive: false,
    resumeSpeed: 1,
    dephos: 0.62,
    kwhPerT: 420,
    cycleMin: 60,
  };
}

/**
 * Frø til trening: tilfeldig hver gang. De tellende frøene regnes av en hemmelig nøkkel på serveren, så trening kan
 * ikke treffe dem (sjansen er om lag 1 av 700 millioner).
 */
export function trainingSeed(random: () => number = Math.random): number {
  return 1 + Math.floor(random() * 2147483645);
}
