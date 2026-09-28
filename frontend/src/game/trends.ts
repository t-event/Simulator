/**
 * Trender i markedet (B-255): etterspørselen etter én kvalitet eller én vare går opp eller ned i noen døgn. Når den går
 * opp, gjelder flere forespørsler den og kundene betaler mer; når den går ned, kommer det færre og prisen er lavere.
 * Hver trend har en grunn med vanlige ord, så spilleren lærer hva som styrer markedet. Ren logikk uten logg – motoren
 * skriver beskjedene (`engine.ts`).
 */
import { GRADES, PRODUCTS } from "./data";
import { chance, pick, randInt } from "./random";
import type { GameState, GradeId, MarketTrend, ProductId } from "./types";

export const TREND = {
  /** Døgn en trend varer */
  days: [6, 12] as [number, number],
  /** Døgn uten trend mellom to trender */
  gap: [4, 10] as [number, number],
  /** Prisen på forespørsler og avtaler som treffer trenden */
  priceUp: 1.12,
  priceDown: 0.9,
  /** Hvor ofte en forespørsel dras mot trenden (opp) eller bort fra den (ned) */
  bias: 0.5,
  /** Trendene starter på verkstedet – i garasjen er det nok å lære annet */
  fromStage: 1,
};

/** Grunnen til at etterspørselen går opp, per kvalitet og vare */
const WHY_UP: Record<string, string> = {
  "kvalitet:enkel": "mange kunder vil ha rimelig stål til enkle formål",
  "kvalitet:standard": "flere verksteder og byggefirmaer har fått nye oppdrag",
  "kvalitet:armering": "byggebransjen går for fullt, og det trengs armering i betongen",
  "kvalitet:lavkarbon": "bilindustrien og platefabrikkene trenger stål som er lett å forme",
  "kvalitet:hoykarbon": "produsenter av verktøy, fjærer og skinner trenger hardt stål",
  "kvalitet:premium": "maskinindustrien trenger stål med strenge krav",
  "vare:armering": "byggebransjen går for fullt",
  "vare:emne": "valseverk i markedet mangler emner",
  "vare:blokk": "smiene har mye å gjøre",
  "vare:stopegods": "flere maskiner og pumper skal ha støpte deler",
};

/** Grunnen til at etterspørselen går ned */
const WHY_DOWN: Record<string, string> = {
  "vare:armering": "byggebransjen bremser",
  "vare:emne": "valseverkene har fulle lagre",
};

const key = (t: Pick<MarketTrend, "kind" | "id">) => `${t.kind}:${t.id}`;

/** Kvalitetene med naturlige navn i en setning («etterspørselen etter …») */
const GRADE_WORD: Record<GradeId, string> = {
  enkel: "stål i enkel kvalitet",
  standard: "standardkvalitet",
  armering: "armeringskvalitet",
  lavkarbon: "lavkarbonstål",
  hoykarbon: "høykarbonstål",
  premium: "premiumstål",
};

/** Navnet på det trenden gjelder: «armeringskvalitet», «emner» */
export function trendName(t: Pick<MarketTrend, "kind" | "id">): string {
  return t.kind === "kvalitet"
    ? (GRADE_WORD[t.id as GradeId] ?? GRADES[t.id as GradeId].name.toLowerCase())
    : PRODUCTS[t.id as ProductId].name.toLowerCase();
}

/** Beskjeden når trenden starter */
export function trendStartText(t: MarketTrend): string {
  const name = trendName(t);
  return t.up
    ? `Etterspørselen etter ${name} øker: ${WHY_UP[key(t)] ?? "flere kunder trenger det nå"}. Flere forespørsler, og ca. ${Math.round((TREND.priceUp - 1) * 100)} % bedre pris i noen døgn.`
    : `Etterspørselen etter ${name} faller: ${WHY_DOWN[key(t)] ?? "kundene har fylt lagrene"}. Færre forespørsler, og ca. ${Math.round((1 - TREND.priceDown) * 100)} % lavere pris i noen døgn.`;
}

/** Beskjeden når trenden er over */
export function trendEndText(t: MarketTrend): string {
  return `Etterspørselen etter ${trendName(t)} er normal igjen.`;
}

/** Gjelder trenden denne varen og kvaliteten? */
export function trendHits(t: MarketTrend | null | undefined, product: ProductId, grade: GradeId): boolean {
  return !!t && (t.kind === "kvalitet" ? t.id === grade : t.id === product);
}

/** Gangefaktor på prisen for en ny forespørsel eller avtale */
export function trendPriceFactor(g: GameState, product: ProductId, grade: GradeId): number {
  const t = g.market.trend;
  if (!trendHits(t, product, grade)) return 1;
  return t!.up ? TREND.priceUp : TREND.priceDown;
}

/**
 * Ett døgn: avslutt en trend som er over, og start en ny når pausen er over. `products` er varene verket kan lage,
 * `grades` kvalitetene det kan få forespørsler på – bare de kan få en trend (gradvis synlighet).
 * Gir beskjeden som skal i loggen, eller null.
 */
export function updateTrend(g: GameState, today: number, products: ProductId[], grades: GradeId[]): string | null {
  const m = g.market;
  if (m.trend && today >= m.trend.untilDay) {
    const ended = m.trend;
    m.trend = null;
    m.nextTrendDay = today + randInt(g, TREND.gap[0], TREND.gap[1]);
    return trendEndText(ended);
  }
  if (m.trend || g.stage < TREND.fromStage || today < (m.nextTrendDay ?? 0)) return null;
  const options: Pick<MarketTrend, "kind" | "id">[] = [
    ...(grades.length > 1 ? grades.map((id) => ({ kind: "kvalitet" as const, id })) : []),
    ...(products.length > 1 ? products.map((id) => ({ kind: "vare" as const, id })) : []),
  ];
  if (!options.length) return null;
  const target = pick(g, options);
  // Like ofte opp som ned: oftere opp gjorde spillet merkbart raskere (storverket dag 132 mot 159 i testspilleren)
  const up = chance(g, 0.5);
  m.trend = { ...target, up, fromDay: today, untilDay: today + randInt(g, TREND.days[0], TREND.days[1]) };
  return trendStartText(m.trend);
}
