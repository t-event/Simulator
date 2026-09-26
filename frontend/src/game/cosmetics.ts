/**
 * Pynt (B-151): ting som bare gjør verket finere i anleggsbildet – flagg, lyslenke, fasadefarge, trær og mer. Kjøpes
 * for fagpoeng og kan slås av og på. Pynten gir ingen fordel i spillet, så ingen konto trengs (KONTO.md, regel 1).
 */
import { hasAchievement } from "./achievements";
import type { GameState } from "./types";

export interface Cosmetic {
  id: string;
  icon: string;
  name: string;
  description: string;
  /** Pris i fagpoeng */
  fp: number;
  /** Bare én i samme gruppe kan være på om gangen (fasadefarger) */
  group?: string;
  /** Må være på dette nivået eller høyere for å synes (0 = garasjen) */
  minStage?: number;
  /** Prestasjonen som trengs for å kjøpe */
  needs?: string;
  /** Bare som belønning på sesongstigen, på dette trinnet (B-173) – kan ikke kjøpes */
  seasonTier?: number;
}

export const COSMETICS: Cosmetic[] = [
  { id: "flagg", icon: "🚩", name: "Flagg på taket", description: "Et rødt flagg vaier på taket.", fp: 10 },
  { id: "lys", icon: "💡", name: "Lyslenke", description: "Fargede lys langs taket. Lyser best om natta.", fp: 20 },
  { id: "traer", icon: "🌳", name: "Trær", description: "Grønne trær rundt verket.", fp: 25 },
  { id: "rod", icon: "🟥", name: "Rød fasade", description: "Mal hallene røde.", fp: 30, group: "fasade" },
  { id: "bla", icon: "🟦", name: "Blå fasade", description: "Mal hallene blå.", fp: 30, group: "fasade" },
  { id: "gronn", icon: "🟩", name: "Grønn fasade", description: "Mal hallene grønne.", fp: 30, group: "fasade" },
  {
    id: "sol",
    icon: "☀️",
    name: "Solceller",
    description: "Solcellepaneler på taket.",
    fp: 60,
    minStage: 2,
  },
  {
    id: "vind",
    icon: "🌬️",
    name: "Vindmølle",
    description: "En vindmølle på åsen bak verket.",
    fp: 100,
    minStage: 3,
  },
  {
    id: "statue",
    icon: "🗽",
    name: "Statue av grunnleggeren",
    description: "Deg, i stål, foran verket.",
    fp: 150,
    needs: "baron",
  },
  {
    id: "fyrverkeri",
    icon: "🎆",
    name: "Fyrverkeri",
    description: "Fyrverkeri over verket om natta.",
    fp: 250,
    needs: "magnat",
  },
  {
    id: "gullpipe",
    icon: "✨",
    name: "Gullpipe",
    description: "Pipa blir forgylt.",
    fp: 500,
    needs: "legende",
  },
  // Sesongstigen (B-173): bare som belønning, aldri til salgs
  {
    id: "sesongflagg",
    icon: "🏁",
    name: "Sesongflagg",
    description: "Et gyllent flagg på taket – du har klatret ti trinn på sesongstigen.",
    fp: 0,
    seasonTier: 10,
  },
  {
    id: "gullfasade",
    icon: "🟨",
    name: "Gullfasade",
    description: "Hallene i gull.",
    fp: 0,
    group: "fasade",
    seasonTier: 20,
  },
  {
    id: "nattfasade",
    icon: "⬛",
    name: "Nattsvart fasade",
    description: "Matt svarte haller.",
    fp: 0,
    group: "fasade",
    seasonTier: 30,
  },
  {
    id: "stjerne",
    icon: "⭐",
    name: "Stjerne over verket",
    description: "En stjerne som lyser over verket.",
    fp: 0,
    seasonTier: 40,
  },
  {
    id: "pokal",
    icon: "🏆",
    name: "Sesongpokal",
    description: "En stor pokal foran verket – toppen av sesongstigen.",
    fp: 0,
    seasonTier: 50,
  },
];

/** Pynten som gis på et trinn av sesongstigen, eller null */
export function trackCosmetic(tier: number): Cosmetic | null {
  return COSMETICS.find((c) => c.seasonTier === tier) ?? null;
}

/** Gir pynten fra sesongstigen (B-173) og slår den på */
export function grantCosmetic(g: GameState, id: string): void {
  if (!COSMETIC_BY_ID[id] || ownsCosmetic(g, id)) return;
  g.cosmetics.owned.push(id);
  setCosmetic(g, id, true);
}

export const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c])) as Record<string, Cosmetic>;

/** Fargene hallene får med fasadepynten: [hovedhall, hall nummer to] */
export const FACADE: Record<string, [string, string]> = {
  rod: ["#9a4a3c", "#864131"],
  bla: ["#3f6a94", "#365c82"],
  gronn: ["#4f7a55", "#436a48"],
  gullfasade: ["#b8962e", "#a3842a"],
  nattfasade: ["#2b2f36", "#23272d"],
};

export function ownsCosmetic(g: GameState, id: string): boolean {
  return !!g.cosmetics?.owned.includes(id);
}

/** Pynten er kjøpt, slått på og synes på dette nivået */
export function cosmeticOn(g: GameState, id: string): boolean {
  const c = COSMETIC_BY_ID[id];
  return !!c && !!g.cosmetics?.on.includes(id) && g.stage >= (c.minStage ?? 0);
}

/** Hvorfor pynten ikke kan kjøpes nå, eller null */
export function cosmeticBlocked(g: GameState, id: string): string | null {
  const c = COSMETIC_BY_ID[id];
  if (!c) return "Finnes ikke";
  if (ownsCosmetic(g, id)) return null;
  if (c.seasonTier) return "season";
  if (c.needs && !hasAchievement(g, c.needs)) return "needs";
  if (g.researchPoints < c.fp) return "fp";
  return null;
}

export function buyCosmetic(g: GameState, id: string): boolean {
  const c = COSMETIC_BY_ID[id];
  if (!c || ownsCosmetic(g, id) || cosmeticBlocked(g, id)) return false;
  g.researchPoints -= c.fp;
  g.cosmetics.owned.push(id);
  setCosmetic(g, id, true);
  return true;
}

export function setCosmetic(g: GameState, id: string, on: boolean): void {
  const c = COSMETIC_BY_ID[id];
  if (!c || !ownsCosmetic(g, id)) return;
  const list = g.cosmetics.on.filter((x) => x !== id && (!on || !c.group || COSMETIC_BY_ID[x]?.group !== c.group));
  if (on) list.push(id);
  g.cosmetics.on = list;
}

/** Fargen hallene har nå, eller null for vanlig grå */
export function facadeColors(g: GameState): [string, string] | null {
  const id = g.cosmetics?.on.find((x) => FACADE[x]);
  return id ? FACADE[id] : null;
}
