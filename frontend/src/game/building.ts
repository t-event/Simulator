/**
 * Byggetid og innkjøring for store kjøp, og nabolagsprosjekter (B-336, spor B i KONTROLL-FORSLAG, godkjent i B-332).
 *
 * - Store kjøp (fra 50 mill., ikke flytting) bygges i spilltid: 2 døgn + 1 per 100 mill., høyst 10. Bare ett stort
 *   prosjekt om gangen. En ovn som bygges om, står mens den bygges. Når det er ferdig, kjøres ovnen eller
 *   støpemaskinen inn: 70 % fart første døgnet, full fart etter 5 døgn.
 * - Nabolagsprosjekter: store, synlige bygg i byen rundt storverket, for penger hjemme. Hvert gir en liten, varig fordel,
 *   tar noen døgn å bygge og står i anleggsbildet. Ett om gangen, i rekkefølge.
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
    (!!next && g.cash >= next.price * 0.5)
  );
}
