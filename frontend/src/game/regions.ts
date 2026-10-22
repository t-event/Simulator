/**
 * Verdenskartet (B-331, B-333): en oppdiktet verden med seks regioner rundt et hav. Hvert datterverk står i en region,
 * og hvert strategiske selskap har sin. Regelen står på serveren (`konsern_regions`, `konsern_default_region` i
 * supabase/066_verdenskartet.sql) og speiles her. Navnene er vanlige ord, ikke steder som finnes.
 * Regionen har foreløpig ingen virkning i økonomien; Kontroll (K7) bruker den.
 */
import type { KonsernOrder, RegionId, SisterPlant } from "./types";

export interface Region {
  id: RegionId;
  name: string;
  /** Kort om regionen, med vanlige ord */
  about: string;
}

/** I samme rekkefølge som på serveren (rekkefølgen avgjør standardregionen ved likt antall) */
export const REGIONS: Region[] = [
  { id: "nord", name: "Nordkysten", about: "Fjorder og havner mot nord." },
  { id: "jern", name: "Jernåsen", about: "Fjell og gruver innerst i landet." },
  { id: "ost", name: "Østskogen", about: "Skog og elver i øst." },
  { id: "sor", name: "Sørsletta", about: "Jordbruk og byer på den store sletta." },
  { id: "vest", name: "Vestbukta", about: "Den store havnebyen i vest." },
  { id: "oy", name: "Øyene", about: "Øyer ute i havet." },
];

export const REGION_IDS: RegionId[] = REGIONS.map((r) => r.id);

export function isRegion(v: unknown): v is RegionId {
  return typeof v === "string" && (REGION_IDS as string[]).includes(v);
}

export function regionName(id: RegionId | null | undefined): string {
  return REGIONS.find((r) => r.id === id)?.name ?? "Ukjent sted";
}

/** Regionen der spilleren har færrest verk, også det som står i køen (som `konsern_default_region`) */
export function defaultRegion(plants: readonly SisterPlant[], orders: readonly KonsernOrder[] = []): RegionId {
  const count = (id: RegionId) =>
    plants.filter((p) => p.region === id).length +
    orders.filter((o) => o.status === "kø" && o.kind === "bygg" && o.region === id).length;
  let best = REGION_IDS[0];
  for (const id of REGION_IDS) if (count(id) < count(best)) best = id;
  return best;
}

/**
 * Regionmester (B-487): styrken et ferdig verk gir i regionen sin – 12 for et stålkompleks, 4 for et storverk og 1 for
 * et stålverk, ganget med 1 + 0,25 × trinnet. Serveren ganger summen med aktiviteten (`region_points` og
 * `region_strengths` i supabase/151_regionmester.sql); endres regelen, endres begge.
 */
export const REGION_POINTS: Record<SisterPlant["type"], number> = { kompleks: 12, storverk: 4, stalverk: 1 };
export const REGION_LEVEL_GAIN = 0.25;

export function regionPoints(type: SisterPlant["type"], level: number): number {
  return (REGION_POINTS[type] ?? 1) * (1 + REGION_LEVEL_GAIN * Math.max(0, level));
}

/** Styrken av dine ferdige verk i en region, før aktiviteten (verk som bygges, teller ikke ennå) */
export function regionStrength(plants: readonly SisterPlant[], region: RegionId): number {
  return plants
    .filter((p) => p.region === region && p.project?.kind !== "bygg")
    .reduce((a, p) => a + regionPoints(p.type, p.level), 0);
}

/**
 * Fellesprosjektene (B-508): den som gir mest til et prosjekt som når målet, får 25 % mer styrke i regionen i 30 dager,
 * nummer to 10 %. Serveren ganger det inn i `region_strengths` (`region_project_boost`, supabase/156_fellesprosjekter.sql);
 * endres tallene i `config.world.projects`, endres de her. Bare den høyeste gjelder, de legges ikke sammen.
 */
export const PROJECT_BOOST = { top1: 0.25, top2: 0.1, days: 30 };

/** Styrken i regionen med fordelen fra fellesprosjektene (plass 1 eller 2 i et prosjekt som er ferdig) */
export function boostedStrength(strength: number, ranks: readonly number[]): number {
  const boost = Math.max(0, ...ranks.map((r) => (r === 1 ? PROJECT_BOOST.top1 : r === 2 ? PROJECT_BOOST.top2 : 0)));
  return Math.round(strength * (1 + boost) * 10) / 10;
}
