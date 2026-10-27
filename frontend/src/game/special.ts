/**
 * Spesialstål (B-510): legeringsstål laget med øseovnen. Etter forskningen «Spesialstål» kommer noen forespørsler på
 * tre legerte kvaliteter. Ovnen lager stålet som vanlig (karbon, fosfor, kobber og tinn fra resepten), og øseovnen
 * tilsetter legeringen etterpå:
 *
 *   - Seigherdingsstål: krom og molybden (øseovn).
 *   - Verktøystål: krom, molybden og vanadium (øseovn og vakuumavgassing).
 *   - Tannhjulsstål: krom, nikkel og molybden (øseovn og vakuumavgassing).
 *
 * Legeringene er dyre og betales per tonn (posten «forbruk», som serveren alt trekker fra i bidraget, B-455). Prisen
 * er høyere, men stålet går gjennom samme metning av markedet som alt annet (B-252), så det gir omtrent som premium
 * per tonn på toppen – mer å lære og velge, ikke en ny inntektsmotor (B-305). Tallene er generiske, til læring.
 */
import { GRADE_IDS, GRADES } from "./data";
import { has, type PlantStats } from "./plant";
import { hasResearch } from "./research";
import type { AlloyId, GameState, GradeId, ProductId } from "./types";

export interface AlloySpec {
  id: AlloyId;
  /** Grunnstoffene med vanlige ord, f.eks. «krom og molybden» */
  name: string;
  /** Det som legges i øsa, f.eks. «ferrokrom og ferromolybden» */
  additions: string;
  /** Kroner per tonn stål for legeringen, med det som går tapt i slaggen */
  costPerT: number;
}

export const ALLOYS: Record<AlloyId, AlloySpec> = {
  crmo: { id: "crmo", name: "krom og molybden", additions: "ferrokrom og ferromolybden", costPerT: 600 },
  crmov: {
    id: "crmov",
    name: "krom, molybden og vanadium",
    additions: "ferrokrom, ferromolybden og ferrovanadium",
    costPerT: 900,
  },
  crnimo: {
    id: "crnimo",
    name: "krom, nikkel og molybden",
    additions: "ferrokrom, nikkel og ferromolybden",
    costPerT: 1800,
  },
};

export const SPECIAL = {
  /** Hver fjerde forespørsel (nummer 2, 6, 10 …) blir spesialstål når verket kan lage det */
  every: 4,
  remainder: 2,
  /** Spesialstål kjøpes i mindre partier enn vanlig stål */
  sizeFactor: 0.5,
  /** Mer omdømme: krevende kunder snakker om leverandørene sine */
  repFactor: 1.2,
  /** Faren for at legeringen bommer i én øse, før operatørens dyktighet */
  missRisk: 0.05,
  /** Ekstra legering når en bom blir oppdaget og rettet */
  fixExtra: 0.3,
  /** Varene spesialstålet selges som (ikke armering) */
  products: ["emne", "blokk", "stopegods"] as ProductId[],
};

/** Kundene som kjøper spesialstål (vanlige ord, ikke ekte bedrifter) */
export const SPECIAL_CUSTOMERS: Partial<Record<GradeId, string>> = {
  seigherdet: "Akselfabrikken",
  verktoy: "Verktøymakeren",
  tannhjul: "Girfabrikken",
};

/** Kvalitetene som er spesialstål */
export const SPECIAL_GRADES: GradeId[] = GRADE_IDS.filter((id) => !!GRADES[id].alloy);

export function isSpecial(grade: GradeId): boolean {
  return !!GRADES[grade].alloy;
}

/** Er spesialstål forsket fram? */
export function specialOn(g: GameState): boolean {
  return hasResearch(g, "spesialstal");
}

/** Det verket mangler for å legere kvaliteten, med vanlige ord – eller null når alt er på plass */
export function alloyMissing(g: GameState, grade: GradeId, stats: PlantStats): string | null {
  const spec = GRADES[grade];
  if (!spec.alloy) return null;
  if (!stats.furnace.arc || !has(g, "oseovn")) return "Legeringen tilsettes i øseovnen, og verket har ingen øseovn.";
  if (spec.vacuum && !has(g, "vakuum")) return `${spec.name} må vakuumbehandles, og verket har ikke vakuumavgassing.`;
  return null;
}

/** Kan verket legere kvaliteten nå? */
export function alloyReady(g: GameState, grade: GradeId, stats: PlantStats): boolean {
  return alloyMissing(g, grade, stats) === null;
}

/** Legeringen per tonn for en kvalitet (0 for vanlig stål) */
export function alloyCostPerT(grade: GradeId): number {
  const alloy = GRADES[grade].alloy;
  return alloy ? ALLOYS[alloy].costPerT : 0;
}

/**
 * Blir forespørselen med dette nummeret spesialstål? Valgt etter nummeret og det verket kan legere – ingen tilfeldig
 * trekning, så resten av spillet trekker de samme tallene som før (som grønt stål, B-506).
 */
export function specialGradeFor(
  g: GameState,
  stats: PlantStats,
  id: number,
  product: ProductId,
  firstOrders: boolean,
): GradeId | null {
  if (firstOrders || !specialOn(g) || !SPECIAL.products.includes(product)) return null;
  if (id % SPECIAL.every !== SPECIAL.remainder) return null;
  const ready = SPECIAL_GRADES.filter((grade) => alloyReady(g, grade, stats));
  if (!ready.length) return null;
  return ready[Math.floor(id / SPECIAL.every) % ready.length];
}
