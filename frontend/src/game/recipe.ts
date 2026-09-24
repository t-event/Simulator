/**
 * Hjelp med resepten: hva holder og hva bommer for en kvalitet, hvordan det
 * rettes, og et forslag til billigste resept med skraptypene spilleren har.
 */
import { GRADES, SCRAP_IDS, SCRAP_TYPES } from "./data";
import { recipeEstimate } from "./engine";
import { energyPrice, has, satisfies, type PlantStats } from "./plant";
import { researchForScrap, scrapUnlocked } from "./research";
import type { Analysis, GameState, GradeId, ScrapId } from "./types";

export interface GradeCheck {
  key: keyof Analysis;
  label: string;
  value: number;
  /** Kravet i klartekst, f.eks. «maks 0,040» */
  limit: string;
  ok: boolean;
  /** Innenfor, men så nær grensen at vanlig variasjon kan gi avvik */
  close: boolean;
  /** Hva spilleren kan gjøre, med vanlige ord */
  fix: string | null;
}

const fmt = (v: number, d: number) => v.toFixed(d).replace(".", ",");

/** Låste skraptyper som ville hjulpet, som tekst til spilleren */
function lockedHint(g: GameState, ids: ScrapId[]): string {
  const locked = ids.filter((id) => !scrapUnlocked(g, id));
  if (!locked.length) return "";
  const names = locked.map((id) => SCRAP_TYPES[id].name.toLowerCase()).join(" og ");
  const r = researchForScrap(locked[0]);
  return ` ${names[0].toUpperCase()}${names.slice(1)} låses opp med forskningen «${r?.name ?? "?"}».`;
}

export function gradeChecks(g: GameState, grade: GradeId, a: Analysis, stats: PlantStats): GradeCheck[] {
  const spec = GRADES[grade];
  const out: GradeCheck[] = [];

  const cOk = a.c >= spec.cMin && a.c <= spec.cMax;
  // Lysbueovnen treffer karbonet omtrent; uten øseovn er et smalt karbonvindu vanskelig
  const cShaky = cOk && stats.furnace.decarb && !has(g, "oseovn") && spec.cMax - spec.cMin < 0.15;
  out.push({
    key: "c",
    label: "Karbon",
    value: a.c,
    limit: spec.cMin > 0 ? `${fmt(spec.cMin, 2)}–${fmt(spec.cMax, 2)}` : `maks ${fmt(spec.cMax, 2)}`,
    ok: cOk,
    close: false,
    fix: cShaky
      ? "Karbonet varierer fra charge til charge i lysbueovnen. Kravet er smalt, så en del charger vil bomme – en øseovn finjusterer karbonet."
      : cOk
        ? null
        : a.c > spec.cMax
          ? stats.furnace.decarb
            ? "For mye karbon."
            : "For mye karbon, og denne ovnen kan ikke brenne det bort. Bruk mindre råjern og spon."
          : "For lite karbon. Ovnen legger til karbon, så dette retter seg vanligvis selv.",
  });

  const pOk = a.p <= spec.pMax;
  out.push({
    key: "p",
    label: "Fosfor",
    value: a.p,
    limit: `maks ${fmt(spec.pMax, 3)}`,
    ok: pOk,
    close: pOk && a.p > spec.pMax * 0.85,
    fix: pOk
      ? null
      : `For mye fosfor. Bruk mindre blandet skrap, spon og råjern, og mer tungt eller rent skrap.${
          stats.dephos === 0 ? " Denne ovnen fjerner ikke fosfor." : ""
        }${lockedHint(g, ["rent"])}`,
  });

  const tOk = a.tramp <= spec.trampMax;
  out.push({
    key: "tramp",
    label: "Kobber og tinn",
    value: a.tramp,
    limit: `maks ${fmt(spec.trampMax, 2)}`,
    ok: tOk,
    close: tOk && a.tramp > spec.trampMax * 0.85,
    fix: tOk
      ? null
      : `For mye kobber og tinn. De kan ikke fjernes, bare tynnes ut: bruk mindre blandet skrap og spon, og mer rent skrap eller råjern.${lockedHint(g, ["rent", "rajern"])}`,
  });
  return out;
}

export interface Suggestion {
  recipe: Record<ScrapId, number>;
  /** Skrap og energi per tonn flytende stål */
  costPerT: number;
}

/**
 * Billigste resept (i steg på 10 %) som holder kvaliteten med litt margin,
 * med skraptypene som er låst opp. Null hvis ingen blanding holder.
 */
export function suggestRecipe(g: GameState, grade: GradeId, stats: PlantStats): Suggestion | null {
  const ids = SCRAP_IDS.filter((id) => id !== "retur" && scrapUnlocked(g, id) && SCRAP_TYPES[id].buyable);
  // Uten full analyse holder en forsiktig spiller litt avstand til grensene
  const margin = stats.lab === 2 ? 0.95 : 0.85;
  const kwh = stats.furnace.kwhPerT * energyPrice(g);
  let best: Suggestion | null = null;
  const weights = Object.fromEntries(SCRAP_IDS.map((id) => [id, 0])) as Record<ScrapId, number>;

  const test = () => {
    const est = recipeEstimate(g, grade, stats, weights);
    const a = est.analysis;
    if (!satisfies({ c: a.c, p: a.p / margin, tramp: a.tramp / margin }, grade)) return;
    const cost = est.scrapCostPerT / est.metallicYield + est.energyFactor * kwh;
    if (!best || cost < best.costPerT - 1e-6) best = { recipe: { ...weights }, costPerT: cost };
  };
  const fill = (i: number, left: number) => {
    if (i === ids.length - 1) {
      weights[ids[i]] = left;
      test();
      weights[ids[i]] = 0;
      return;
    }
    for (let w = 0; w <= left; w += 10) {
      weights[ids[i]] = w;
      fill(i + 1, left - w);
    }
    weights[ids[i]] = 0;
  };
  // Returskrapet fra egen støping er gratis, men det blir aldri mye av det
  for (const retur of [10, 0]) {
    weights.retur = retur;
    if (ids.length) fill(0, 100 - retur);
  }
  return best;
}
