/**
 * Byggetid og innkjøring for store kjøp, og nabolagsprosjekter (B-336, spor B i KONTROLL-FORSLAG, godkjent i B-332).
 *
 * - Store kjøp (fra 50 mill., ikke flytting) bygges i spilltid: 2 døgn + 1 per 100 mill., høyst 10. Bare ett stort
 *   prosjekt om gangen. En ovn som bygges om, står mens den bygges. Når det er ferdig, kjøres ovnen eller
 *   støpemaskinen inn: 70 % fart første døgnet, full fart etter 5 døgn.
 * - Nabolagsprosjekter: store, synlige bygg i byen rundt storverket, for penger hjemme. Hvert gir en liten, varig fordel,
 *   tar noen døgn å bygge og står i anleggsbildet. Ett om gangen, i rekkefølge.
 * - Verkskontoen (B-455): når alle seks står, kan de utvides to ganger (trinn 2 = 3 × prisen, trinn 3 = 9 ×) uten ny
 *   effekt – bare større bygg i bildet – og verkets stiftelse gir penger til byen i trinn med stigende pris (titler og pynt).
 *   Alt føres som investering, som marginen i bidraget ikke teller (B-318), så penger hjemme gir aldri mer i verden.
 * Alt gjelder bare eget spill (spilltid, B-323) og krever ikke konto.
 */
import type { GameState, NeighborId } from "./types";

export const BIG_BUILD = {
  /** Kjøp fra denne prisen bygges i spilltid */
  minPrice: 50_000_000,
  baseDays: 2,
  /** Døgn ekstra per 100 mill. */
  perHundredMill: 1,
  maxDays: 10,
  /** Innkjøringen: fart første døgnet og antall døgn til full fart */
  rampStart: 0.7,
  rampDays: 5,
};

/** Et stort kjøp (B-336): ikke flytting til nytt sted, og minst 50 mill. */
export function isBigPurchase(o: { kind: string; price: number }): boolean {
  return o.kind !== "stage" && o.price >= BIG_BUILD.minPrice;
}

/** Hvor mange spilldøgn et stort kjøp tar å bygge */
export function buildDays(price: number): number {
  const b = BIG_BUILD;
  return Math.max(b.baseDays, Math.min(b.maxDays, Math.round(b.baseDays + (b.perHundredMill * price) / 100_000_000)));
}

/** Døgn igjen av byggingen (rundet opp), eller 0 */
export function bigBuildDaysLeft(g: GameState): number {
  const b = g.bigBuild;
  return b ? Math.max(0, Math.ceil((b.readyMin - g.minute) / 1440)) : 0;
}

/** Farten under innkjøringen: 70 % det første døgnet etter at det ble ferdig, så jevnt opp til 100 % etter 5 døgn */
export function rampFactor(fromDay: number | undefined, today: number): number {
  if (fromDay === undefined) return 1;
  const d = today - fromDay;
  if (d >= BIG_BUILD.rampDays || d < 0) return 1;
  return BIG_BUILD.rampStart + ((1 - BIG_BUILD.rampStart) * d) / BIG_BUILD.rampDays;
}

export interface NeighborProject {
  id: NeighborId;
  name: string;
  price: number;
  days: number;
  /** Hva det gir, med vanlige ord */
  gives: string;
}

/** I rekkefølge: det neste vises når det forrige er bygget (gradvis synlighet) */
export const NEIGHBOR_PROJECTS: NeighborProject[] = [
  { id: "idrettshall", name: "Idrettshall", price: 1_000_000_000, days: 3, gives: "Bedre trivsel blant de ansatte." },
  { id: "kulturhus", name: "Kulturhus", price: 2_000_000_000, days: 4, gives: "Naboene klager ikke lenger på verket." },
  { id: "bro", name: "Bro over fjorden", price: 3_500_000_000, days: 5, gives: "Flere kunder finner fram til verket." },
  { id: "skole", name: "Ny skole", price: 5_000_000_000, days: 6, gives: "Søkerne er flinkere fra første dag." },
  { id: "sykehus", name: "Sykehus", price: 7_000_000_000, days: 7, gives: "Færre sykemeldinger." },
  {
    id: "konserthus",
    name: "Konserthus",
    price: 9_500_000_000,
    days: 8,
    gives: "Omdømmet synker aldri under 70.",
  },
];

/** Er prosjektet bygget (og ferdig)? */
export function hasNeighbor(g: GameState, id: NeighborId): boolean {
  return g.neighborhood?.built.includes(id) ?? false;
}

/** Det neste prosjektet som kan bygges, eller null når alt er bygget */
export function nextNeighbor(g: GameState): NeighborProject | null {
  return NEIGHBOR_PROJECTS.find((p) => !hasNeighbor(g, p.id)) ?? null;
}

/** Trinnene i nabolaget (B-455): 1 = bygget, 2 og 3 = utvidet. Prisen ganges med dette, og hvert trinn tar 2 døgn mer */
export const NEIGHBOR_LEVELS = { max: 3, priceFactor: [1, 3, 9], extraDays: 2 };

/** Trinnet et bygg står på: 0 = ikke bygget, 1–3 */
export function neighborLevel(g: GameState, id: NeighborId): number {
  if (!hasNeighbor(g, id)) return 0;
  return Math.max(1, Math.min(NEIGHBOR_LEVELS.max, g.neighborhood?.levels?.[id] ?? 1));
}

/** Summen av trinnene (0–18): prestasjonene og bildet */
export function neighborSteps(g: GameState): number {
  return NEIGHBOR_PROJECTS.reduce((a, p) => a + neighborLevel(g, p.id), 0);
}

export interface NeighborStep {
  project: NeighborProject;
  /** Trinnet som bygges: 1 = nytt bygg, 2–3 = utvidelse */
  level: number;
  price: number;
  days: number;
}

/** Prisen og byggetiden for et bygg på et trinn */
export function neighborStep(project: NeighborProject, level: number): NeighborStep {
  return {
    project,
    level,
    price: project.price * NEIGHBOR_LEVELS.priceFactor[level - 1],
    days: project.days + NEIGHBOR_LEVELS.extraDays * (level - 1),
  };
}

/**
 * Det neste som kan bygges i nabolaget: først de seks byggene i rekkefølge, så alle til trinn 2, så alle til trinn 3
 * (gradvis synlighet: utvidelsene vises først når hele nabolaget står). Null når alt er på trinn 3.
 */
export function nextNeighborStep(g: GameState): NeighborStep | null {
  for (let level = 1; level <= NEIGHBOR_LEVELS.max; level++) {
    const p = NEIGHBOR_PROJECTS.find((x) => neighborLevel(g, x.id) < level);
    if (p) return neighborStep(p, level);
  }
  return null;
}

/** Alle seks byggene står (utvidelsene og stiftelsen kommer da fram) */
export function neighborhoodDone(g: GameState): boolean {
  return NEIGHBOR_PROJECTS.every((p) => hasNeighbor(g, p.id));
}

/**
 * Verkets stiftelse (B-455): penger til byen i trinn med stigende pris. Hvert trinn gir en tittel, en prestasjon og pynt i
 * bildet – ingen effekt på drift, margin eller andre spillere. Etter tabellen dobles prisen for hvert trinn.
 */
export const FOUNDATION = {
  prices: [1e9, 2e9, 5e9, 1e10, 2e10, 5e10, 1e11, 2e11, 5e11, 1e12],
  titles: [
    "Velgjører",
    "Byens venn",
    "Mesen",
    "Stor mesen",
    "Æresborger",
    "Landets mesen",
    "Filantrop",
    "Stor filantrop",
    "Legendarisk giver",
    "Byens grunnstein",
  ],
};

/** Trinnet i stiftelsen (0 = ingen gave ennå) */
export function foundationTier(g: GameState): number {
  return g.foundation?.tier ?? 0;
}

/** Prisen på trinn nr. `tier` (fra 1) */
export function foundationPrice(tier: number): number {
  const p = FOUNDATION.prices;
  return tier <= p.length ? p[tier - 1] : p[p.length - 1] * 2 ** (tier - p.length);
}

/** Tittelen på et trinn (fra 1); etter tabellen telles «Byens grunnstein» opp */
export function foundationTitle(tier: number): string {
  const t = FOUNDATION.titles;
  if (tier <= 0) return "";
  return tier <= t.length ? t[tier - 1] : `${t[t.length - 1]} ${tier - t.length + 1}`;
}

/** Omdømmet synker ikke under dette (konserthuset) */
export function reputationFloor(g: GameState): number {
  return hasNeighbor(g, "konserthus") ? 70 : 0;
}

/** Kortet «Byggeprosjekter» på Anlegg: når et bygg pågår, noe er bygget eller kassa nærmer seg neste prosjekt */
export function showBuildCard(g: GameState): boolean {
  if (g.stage < 4) return false;
  const next = nextNeighbor(g);
  return (
    !!g.bigBuild ||
    !!g.neighborhood?.building ||
    (g.neighborhood?.built.length ?? 0) > 0 ||
    foundationTier(g) > 0 ||
    (!!next && g.cash >= next.price * 0.5)
  );
}

/**
 * Rådet om nabolaget (B-455, V1): kassa holder til det neste bygget, ingenting bygges, og spilleren har ikke sett kortet
 * «Byggeprosjekter» ennå. Gir også «!» på Verket. Mange store verk hadde milliarder i kassa uten å vite at byggene fantes.
 */
export function neighborHintDue(g: GameState): NeighborStep | null {
  if (g.stage < 4 || g.buildSeen || g.neighborhood?.building) return null;
  const step = nextNeighborStep(g);
  return step && g.cash >= step.price ? step : null;
}
