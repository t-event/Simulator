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
