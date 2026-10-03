/**
 * Pynt (B-151): ting som bare gjør verket finere i anleggsbildet – flagg, lyslenke, fasadefarge, trær og mer. Kjøpes
 * for fagpoeng og kan slås av og på. Pynten gir ingen fordel i spillet, så ingen konto trengs (KONTO.md, regel 1).
 *
 * Sesongpynt (B-287): hver sesong har sin egen pynt, både i butikken og på sesongstigen. Den kan bare skaffes mens
 * sesongen pågår, og kommer aldri tilbake – men den du har, beholder du. Sesongen kommer fra serveren, så pynten i
 * butikken krever konto for å kjøpes. **Når en ny sesong startes, legges pynten for den inn her** (`season: N`).
 */
import { hasAchievement } from "./achievements";
import type { GameState } from "./types";
import type { IconName } from "../ui/icons";

export interface Cosmetic {
  id: string;
  /** Ikon fra designsystemet (B-237). Fasadene vises med fargen sin i stedet */
  icon: IconName;
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
  /** Sesongen pynten hører til (B-287): kan bare skaffes mens den pågår */
  season?: number;
}

/** Sesongen spilleren er i og om hen har konto – fra serveren (B-287). Uten nett: ingen sesong */
export interface SeasonCtx {
  season: number | null;
  account: boolean;
}

const NO_SEASON: SeasonCtx = { season: null, account: false };

export const COSMETICS: Cosmetic[] = [
  { id: "flagg", icon: "flag", name: "Flagg på taket", description: "Et rødt flagg vaier på taket.", fp: 10 },
  {
    id: "lys",
    icon: "lightbulb",
    name: "Lyslenke",
    description: "Fargede lys langs taket. Lyser best om natta.",
    fp: 20,
  },
  { id: "traer", icon: "trees", name: "Trær", description: "Grønne trær rundt verket.", fp: 25 },
  { id: "rod", icon: "paint-roller", name: "Rød fasade", description: "Mal hallene røde.", fp: 30, group: "fasade" },
  { id: "bla", icon: "paint-roller", name: "Blå fasade", description: "Mal hallene blå.", fp: 30, group: "fasade" },
  {
    id: "gronn",
    icon: "paint-roller",
    name: "Grønn fasade",
    description: "Mal hallene grønne.",
    fp: 30,
    group: "fasade",
  },
  {
    id: "sol",
    icon: "sun",
    name: "Solceller",
    description: "Solcellepaneler på taket.",
    fp: 60,
    minStage: 2,
  },
  {
    id: "vind",
    icon: "wind",
    name: "Vindmølle",
    description: "En vindmølle på åsen bak verket.",
    fp: 100,
    minStage: 3,
  },
  {
    id: "statue",
    icon: "person-standing",
    name: "Statue av grunnleggeren",
    description: "Deg, i stål, foran verket.",
    fp: 150,
    needs: "baron",
  },
  {
    id: "fyrverkeri",
    icon: "sparkles",
    name: "Fyrverkeri",
    description: "Fyrverkeri over verket om natta.",
    fp: 250,
    needs: "magnat",
  },
  {
    id: "gullpipe",
    icon: "factory",
    name: "Gullpipe",
    description: "Pipa blir forgylt.",
    fp: 500,
    group: "pipe",
    needs: "legende",
  },
  // Sesong 1 i butikken (B-287): bare mens sesongen pågår, og med konto
  {
    id: "nordlys",
    icon: "sparkles",
    name: "Nordlys",
    description: "Grønt nordlys over verket om natta.",
    fp: 60,
    season: 1,
  },
  {
    id: "kobberpipe",
    icon: "factory",
    name: "Kobberpipe",
    description: "Pipa blir kledd i blankt kobber.",
    fp: 120,
    group: "pipe",
    season: 1,
  },
  {
    id: "banner1",
    icon: "flag",
    name: "Sesong 1-banner",
    description: "Et langt banner på hallveggen – du var med i den første sesongen.",
    fp: 200,
    group: "banner",
    season: 1,
  },
  // Sesongstigen i sesong 1 (B-173, B-287): bare som belønning, aldri til salgs. Trinn 1 fra B-452
  {
    id: "sesongskilt",
    icon: "award",
    name: "Sesongskilt",
    description: "Et lite skilt foran verket – du tok det første trinnet på sesongstigen i sesong 1.",
    fp: 0,
    seasonTier: 1,
    season: 1,
  },
  {
    id: "sesongflagg",
    icon: "flag-triangle-right",
    name: "Sesongflagg",
    description: "Et gyllent flagg på taket – du har klatret ti trinn på sesongstigen.",
    fp: 0,
    seasonTier: 10,
    season: 1,
  },
  {
    id: "gullfasade",
    icon: "paint-roller",
    name: "Gullfasade",
    description: "Hallene i gull.",
    fp: 0,
    group: "fasade",
    seasonTier: 20,
    season: 1,
  },
  {
    id: "nattfasade",
    icon: "paint-roller",
    name: "Nattsvart fasade",
    description: "Matt svarte haller.",
    fp: 0,
    group: "fasade",
    seasonTier: 30,
    season: 1,
  },
  {
    id: "stjerne",
    icon: "star",
    name: "Stjerne over verket",
    description: "En stjerne som lyser over verket.",
    fp: 0,
    seasonTier: 40,
    season: 1,
  },
  {
    id: "pokal",
    icon: "trophy",
    name: "Sesongpokal",
    description: "En stor pokal foran verket – toppen av sesongstigen.",
    fp: 0,
    seasonTier: 50,
    season: 1,
  },
  // Sesong 2 (B-291): klar før sesongen startes. Vises først når serveren sier at sesong 2 pågår
  {
    id: "regnbue",
    icon: "rainbow",
    name: "Regnbue",
    description: "En regnbue over verket om dagen.",
    fp: 60,
    season: 2,
  },
  {
    id: "fullmane",
    icon: "moon",
    name: "Fullmåne",
    description: "En stor fullmåne over verket om natta.",
    fp: 120,
    season: 2,
  },
  {
    id: "banner2",
    icon: "flag",
    name: "Sesong 2-banner",
    description: "Et rødt banner på hallveggen – du var med i sesong 2.",
    fp: 200,
    group: "banner",
    season: 2,
  },
  {
    id: "sesongskilt2",
    icon: "award",
    name: "Sesongskilt (sesong 2)",
    description: "Et lite rødt skilt foran verket – det første trinnet på sesongstigen i sesong 2.",
    fp: 0,
    seasonTier: 1,
    season: 2,
  },
  {
    id: "vimpler",
    icon: "flag-triangle-right",
    name: "Vimpelrekke",
    description: "Fargerike vimpler langs taket – ti trinn på sesongstigen.",
    fp: 0,
    seasonTier: 10,
    season: 2,
  },
  {
    id: "kobberfasade",
    icon: "paint-roller",
    name: "Kobberfasade",
    description: "Hallene i kobber.",
    fp: 0,
    group: "fasade",
    seasonTier: 20,
    season: 2,
  },
  {
    id: "hvitfasade",
    icon: "paint-roller",
    name: "Hvit fasade",
    description: "Kritthvite haller.",
    fp: 0,
    group: "fasade",
    seasonTier: 30,
    season: 2,
  },
  {
    id: "lyskastere",
    icon: "lightbulb",
    name: "Lyskastere",
    description: "Lyskastere som sveiper over himmelen om natta.",
    fp: 0,
    seasonTier: 40,
    season: 2,
  },
  {
    id: "tannhjul",
    icon: "cog",
    name: "Tannhjul i stål",
    description: "Et stort tannhjul i stål foran verket – toppen av stigen i sesong 2.",
    fp: 0,
    seasonTier: 50,
    season: 2,
  },
];

/** Pynten som gis på et trinn av sesongstigen i en sesong, eller null (B-287: hver sesong har sin egen) */
export function trackCosmetic(tier: number, season: number | null): Cosmetic | null {
  return COSMETICS.find((c) => c.seasonTier === tier && c.season === season) ?? null;
}

/**
 * Skal pynten stå i lista (B-287)? Pynt fra en sesong som er over, står bare hos dem som har den – den kan aldri
 * skaffes igjen. Pynten for sesongen som pågår, vises for alle, også uten konto (KONTO-regel 6)
 */
export function cosmeticListed(g: GameState, c: Cosmetic, ctx: SeasonCtx = NO_SEASON): boolean {
  return !c.season || ownsCosmetic(g, c.id) || c.season === ctx.season;
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
  kobberfasade: ["#a8643a", "#935733"],
  hvitfasade: ["#d9dde2", "#c6ccd3"],
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
export function cosmeticBlocked(g: GameState, id: string, ctx: SeasonCtx = NO_SEASON): string | null {
  const c = COSMETIC_BY_ID[id];
  if (!c) return "Finnes ikke";
  if (ownsCosmetic(g, id)) return null;
  if (c.seasonTier) return "season";
  // Sesongpynt (B-287): bare i sin sesong, og bare med konto – sesongen kommer fra serveren
  if (c.season && c.season !== ctx.season) return "over";
  if (c.season && !ctx.account) return "account";
  if (c.needs && !hasAchievement(g, c.needs)) return "needs";
  if (g.researchPoints < c.fp) return "fp";
  return null;
}

export function buyCosmetic(g: GameState, id: string, ctx: SeasonCtx = NO_SEASON): boolean {
  const c = COSMETIC_BY_ID[id];
  if (!c || ownsCosmetic(g, id) || cosmeticBlocked(g, id, ctx)) return false;
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
