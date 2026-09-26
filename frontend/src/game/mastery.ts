/**
 * Mesterskap (B-150): forskning som kan tas om og om igjen når all vanlig forskning er gjort. Hvert nivå koster mer
 * enn det forrige, og gevinsten per nivå blir mindre, så det tar aldri slutt – men ingen kan løpe helt fra de andre.
 * Da har fagpoengene (også fra den daglige belønningen) alltid noe å gå til.
 *
 * Bare rene regler her (ingen import av engine), så plant.ts og engine.ts kan bruke faktorene.
 */
import { hasResearch, RESEARCH } from "./research";
import type { GameState, MasteryId } from "./types";

export interface MasteryDef {
  name: string;
  description: string;
  /** Hva det gir, med prosent: «x % høyere stålpris» */
  effect: string;
  /** Den største gevinsten man kan nærme seg (andel) */
  max: number;
  /** Pris for nivå 1 i fagpoeng */
  base: number;
}

export const MASTERY: Record<MasteryId, MasteryDef> = {
  pris: {
    name: "Bedre priser",
    description: "Salgsavdelingen blir flinkere til å forhandle, og kundene betaler litt mer for stålet.",
    effect: "høyere pris for stålet",
    max: 0.1,
    base: 100,
  },
  strom: {
    name: "Energieffektivisering",
    description: "Bedre isolasjon, varmegjenvinning og smartere styring av ovnene.",
    effect: "lavere strømkostnad",
    max: 0.15,
    base: 100,
  },
  skrap: {
    name: "Smartere skrapkjøp",
    description: "Bedre sortering og lengre avtaler med skraphandlerne.",
    effect: "lavere skrappris",
    max: 0.1,
    base: 100,
  },
  datterverk: {
    name: "Konsernledelse",
    description: "Erfaringene fra hjemmeverket deles med datterverkene.",
    effect: "mer overskudd i datterverkene",
    max: 0.3,
    base: 150,
  },
};

export const MASTERY_IDS = Object.keys(MASTERY) as MasteryId[];

/** Hvor mye av det største man får per nivå: nivå 1 gir 10 % av maks, så stadig mindre */
const STEP = 0.9;
/** Hvert nivå koster 25 % mer enn det forrige */
const GROWTH = 1.25;

export function masteryLevel(g: GameState, id: MasteryId): number {
  return g.mastery?.[id] ?? 0;
}

/** Gevinsten (andel, f.eks. 0,035 = 3,5 %) på et nivå */
export function masteryEffect(id: MasteryId, level: number): number {
  return MASTERY[id].max * (1 - STEP ** level);
}

/** Pris i fagpoeng for neste nivå når man står på `level` */
export function masteryCost(id: MasteryId, level: number): number {
  return Math.round(MASTERY[id].base * GROWTH ** level);
}

/** Mesterskapet åpner når all vanlig forskning er gjort (også konsernprosjektene) */
export function masteryOpen(g: GameState): boolean {
  return RESEARCH.every((r) => hasResearch(g, r.id));
}

/** Gangefaktoren for prisen/kostnaden i spillet: 1 + gevinst for pris og datterverk, 1 − gevinst for kostnader */
export function masteryFactor(g: GameState, id: MasteryId): number {
  const e = masteryEffect(id, masteryLevel(g, id));
  return id === "pris" || id === "datterverk" ? 1 + e : 1 - e;
}
