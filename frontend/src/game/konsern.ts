/**
 * Konsernet (B-106): når storverket er ferdig bygget, kan spilleren kjøpe datterverk. De gir overskudd hver dag,
 * som svinger med markedet og av og til stopper opp. Sluttmålet er 10 mrd. i konsernverdi: egenkapital pluss
 * verdien av datterverkene.
 */
import {
  acceptAgreement,
  acceptContract,
  addCost,
  agreementWeeks,
  agreementLoadUntil,
  assessOffer,
  awardPoints,
  committedT,
  extraOffer,
  fmtKr,
  log,
  queueFit,
  realisticDailyT,
  recipeEstimate,
  unlock,
} from "./engine";
import { computePlantStats, day, gradeRecipe, productCapT } from "./plant";
import { summerStop } from "./calendar";
import { auto, hasResearch } from "./research";
import { masteryLevel } from "./mastery";
import { DIVIDEND, dividendPerDay, dividendShares, flagshipOf, type DividendInput } from "./dividend";
import { chance } from "./random";
import { realNow, setRealClock } from "./clock";
import {
  buildCost,
  earnedLevel,
  kompleksOpenAt,
  LADDER,
  ladderCount,
  modCost,
  modMaxAt,
  MOVE_REFUSAL,
  movePlant,
  ORDER_REFUSAL_TEXT,
  orderQuote,
  placeOrder,
  PLANT_NAMES,
  salePrice,
  sellPlant,
  cancelOrder,
  plannedPlants as plannedPlantsOf,
  settleWorld,
  slotsAt,
  upgradeCostWorld,
  WORLD_KONSERN,
  type KonsernWorld,
  type OrderRequest,
  type SettleEvent,
} from "./konsernWorld";
import { regionName } from "./regions";
import { paidOutTotal } from "./reserve";
import type { GameState, KonsernOrder, RegionId, SisterPlant, SisterType } from "./types";

export interface SisterSpec {
  name: string;
  price: number;
  /** Overskudd per døgn ved normalt marked og uten modernisering */
  profitPerDay: number;
  description: string;
}

export const SISTER_TYPES: Record<SisterType, SisterSpec> = {
  stalverk: {
    name: "Stålverk",
    // Priser fra konsernkassa (B-326): WORLD_KONSERN i konsernWorld.ts, samme som på serveren
    price: WORLD_KONSERN.price.stalverk,
    profitPerDay: 5_000_000,
    description: "Et skrapbasert stålverk med én lysbueovn og strengstøping. Egen ledelse og egne folk.",
  },
  storverk: {
    name: "Storverk",
    price: WORLD_KONSERN.price.storverk,
    profitPerDay: 20_000_000,
    description: "Et fullskala stålverk med flere ovner, valseverk og havn.",
  },
  kompleks: {
    name: "Stålkompleks",
    // Trimmet i B-209: 110 mill. per døgn til 60 mill.
    price: WORLD_KONSERN.price.kompleks,
    profitPerDay: 60_000_000,
    description:
      "Flere storverk på ett sted med egen havn, eget kraftverk og valseverk for plater og profiler. Åpnes med tittelen Stålfyrste.",
  },
};

/**
 * Konsernnivåene (B-150, B-173, B-325): titler ved kallenavnet, fagpoeng (til mesterskapet) og mer å bygge. Før B-325
 * kom de av verdien i spillet, som den lokale kassa avgjorde; nå regner serveren dem av verkene (nivåstigen i
 * konsernWorld.ts, samme som `konsern_ladder_level`). Titlene spilleren hadde ved byttet, beholdes. `like` sier hva
 * konsernet kan sammenlignes med; tallene er runde og omtrentlige. Sluttmålet 10 mrd. gir fortsatt tittelen Stålbaron.
 */
export const WIN_TITLE = "Stålbaron";
const LEGEND_TEXT: { fp: number; unlocks: string; like: string }[] = [
  { fp: 150, unlocks: "Datterverkene kan moderniseres til trinn 4.", like: "et stort stålkonsern i ett land" },
  {
    fp: 250,
    unlocks:
      "Stålkomplekser kan kjøpes, og det er plass til to datterverk til. Et kompleks tjener like mye som tre storverk – bytt ut de små verkene etter hvert.",
    like: "et av de store stålkonsernene i Europa",
  },
  { fp: 400, unlocks: "Datterverkene kan moderniseres til trinn 5.", like: "et av de største stålkonsernene i Europa" },
  { fp: 700, unlocks: "Plass til to datterverk til.", like: "et av de ti største stålselskapene i verden" },
  { fp: 1500, unlocks: "Du er en legende i stålverdenen.", like: "det mest verdifulle stålselskapet i verden" },
  { fp: 2500, unlocks: "Plass til to datterverk til.", like: "nesten dobbelt så mye som noe stålselskap i verden" },
  {
    fp: 4000,
    unlocks: "Datterverkene kan moderniseres til trinn 6.",
    like: "de fem største stålselskapene i verden til sammen",
  },
  { fp: 6000, unlocks: "Du er en myte i stålverdenen.", like: "over halvparten av all stålindustri i verden" },
  { fp: 10000, unlocks: "Ingen har kommet lenger.", like: "hele stålindustrien i verden" },
];

/** «3 storverk på trinn 3», «8 stålkomplekser på trinn 5» */
function needText(count: number, types: SisterType[], level: number): string {
  const name =
    types.length > 1
      ? count === 1
        ? "storverk eller kompleks"
        : "storverk eller komplekser"
      : count === 1
        ? "stålkompleks"
        : "stålkomplekser";
  return `${count} ${name} på trinn ${level}`;
}

export const LEGENDS: { title: string; fp: number; unlocks: string; like: string; need: string }[] = LADDER.map(
  (step, i) => ({ title: step.title, need: needText(step.count, step.types, step.level), ...LEGEND_TEXT[i] }),
);

/** Tittelen spilleren har (det høyeste nivået), eller null før sluttmålet */
export function titleOf(g: GameState): string | null {
  const n = g.konsern?.legends ?? 0;
  if (n > 0) return LEGENDS[n - 1].title;
  return g.won ? WIN_TITLE : null;
}

/**
 * Opptjent nivå (B-383): det verkene har gitt, uten gulvet fra byttet – som `konsern.earned` på serveren. Nye verk,
 * trinn og komplekser følger dette. Tittelen (`legends`) kan være høyere for dem som hadde den før byttet.
 */
export function earnedOf(g: GameState): number {
  return earnedLevel({ plants: g.konsern?.plants ?? [], earned: g.konsern?.earned ?? 0 });
}

/** Er tittelen høyere enn det verkene har gitt? Da forklares det at nye kjøp følger det opptjente nivået */
export function titleAboveEarned(g: GameState): boolean {
  return (g.konsern?.legends ?? 0) > earnedOf(g);
}

/** Høyeste moderniseringstrinn: 3, 4 ved nivå 1, 5 ved nivå 3 (B-150), 6 ved nivå 7 (B-173) – opptjent nivå (B-383) */
export function modernizeMax(g: GameState): number {
  return modMaxAt(earnedOf(g));
}

/** Stålkomplekser åpnes ved opptjent nivå 2 (Stålfyrste, B-383) */
export function kompleksOpen(g: GameState): boolean {
  return kompleksOpenAt(earnedOf(g));
}

/**
 * Hvor langt verkene er kommet mot neste nivå: «4 av 6 storverk eller komplekser på trinn 4», eller null på toppen.
 * Standard er neste tittel; `n` = earnedOf(g) gir neste opptjente nivå (B-383).
 */
export function nextLevelProgress(
  g: GameState,
  n = g.konsern?.legends ?? 0,
): { have: number; need: number; text: string } | null {
  const step = LADDER[n];
  if (!step) return null;
  const have = Math.min(step.count, ladderCount(g.konsern?.plants ?? [], step));
  return { have, need: step.count, text: LEGENDS[n].need };
}

/**
 * Løft konsernnivået til `level` (fra serveren eller køen i appen): fagpoeng, feiring og en god nyhet for hvert nytt
 * nivå. Nivået går aldri ned.
 */
export function raiseLevel(g: GameState, level: number): void {
  const k = g.konsern;
  if (!k) return;
  while (k.legends < Math.min(level, LEGENDS.length)) {
    const l = LEGENDS[k.legends];
    k.legends += 1;
    awardPoints(g, l.fp);
    g.legendCelebrate = k.legends - 1;
    log(
      g,
      `Ny tittel: ${l.title}! Konsernet har ${l.need}, omtrent som ${l.like}. +${l.fp} fagpoeng. ${l.unlocks}`,
      "good",
    );
  }
}

/** Modernisering av et datterverk: 30 % av prisen, +25 % overskudd per trinn, inntil tre trinn */
export const MODERNIZE_SHARE = 0.3;
export const MODERNIZE_GAIN = 0.25;
export const MODERNIZE_MAX = 3;
export const MAX_SISTERS = 6;
/** Med forskningen «Større konsern» er det plass til flere (B-120) */
export const MAX_SISTERS_BIG = 8;

export function maxSisters(g: GameState): number {
  // Stålfyrste, Stålkeiser og Stålgigant gir plass til to til hver (B-150, B-173) – opptjent nivå (B-383)
  return slotsAt(earnedOf(g), hasResearch(g, "storkonsern"));
}

/** Hvordan konsernet får plass til flere datterverk: forskningen, neste tittel som gir plasser, eller ingen (B-367) */
export function moreSlotsText(g: GameState): string {
  const lvl = earnedOf(g);
  const big = hasResearch(g, "storkonsern");
  if (!big) {
    const more = slotsAt(lvl, true) - slotsAt(lvl, false);
    return `Forskningen «Større konsern» gir plass til ${more} til.`;
  }
  const now = slotsAt(lvl, big);
  for (let l = lvl + 1; l <= LEGENDS.length; l++) {
    if (slotsAt(l, big) > now)
      return `Når verkene har gitt nivået ${LEGENDS[l - 1].title} (${LEGENDS[l - 1].need}), får du plass til ${slotsAt(l, big) - now} til.`;
  }
  return `${now} datterverk er det meste et konsern kan ha. Bytt små verk til stålkomplekser og moderniser.`;
}

/** Pris på et nytt datterverk fra konsernkassa, med oppkjøpsavdelingen (B-120, B-326) */
export function sisterPrice(g: GameState, type: SisterType): number {
  return buildCost(type, g.researched);
}

/** Navn på datterverkene, i kjøpsrekkefølge (vanlige ord, ingen ekte steder) */
export const SISTER_NAMES = PLANT_NAMES;

/** Milepæler for konsernverdien på veien mot sluttmålet, med fagpoeng som belønning (B-119) */
export const KONSERN_MILESTONES = [2_000_000_000, 4_000_000_000, 6_000_000_000, 8_000_000_000];
export const MILESTONE_FP = 40;

/** Konsernfunksjoner som gjelder hele konsernet */
export const KONSERN_SHARED = {
  innkjop: {
    name: "Felles innkjøp",
    price: 150_000_000,
    description: "Konsernet kjøper skrap samlet. 5 % billigere skrap hjemme og 5 % mer overskudd i datterverkene.",
  },
  salg: {
    name: "Felles salgskontor",
    price: 250_000_000,
    description: "Ett salgskontor for alle verkene. 3 % bedre pris hjemme og 5 % mer overskudd i datterverkene.",
  },
} as const;
export type SharedId = keyof typeof KONSERN_SHARED;

/** Egenkapital som låser opp konsernet, og det nye sluttmålet */
export const KONSERN_UNLOCK_EQUITY = 1_000_000_000;

export function hasShared(g: GameState, id: SharedId): boolean {
  return !!g.konsern?.shared.includes(id);
}

// ------------------------------------------------------------------ //
// Byggetid i ekte tid (B-209)
// ------------------------------------------------------------------ //
/**
 * Å bygge, bygge ut og modernisere datterverk tar ekte timer, uansett spillfart. Før betalte et stålkompleks seg på
 * 10–18 minutter på 10×, og hele konsernet var ferdig utbygd på noen timer. Nå er det døgnene som avgjør hvor fort
 * konsernet vokser, ikke fartsknappen.
 */
export const BUILD_HOURS: Record<SisterType, number> = WORLD_KONSERN.buildHours;
export const UPGRADE_HOURS = WORLD_KONSERN.upgradeHours;
export const MODERNIZE_HOURS = WORLD_KONSERN.modHours;

// Klokka ligger i clock.ts, så også hendelseskortene kan bruke den (B-210)
export { realNow, setRealClock };

/** Et nytt verk som ikke er ferdig bygget: det tjener ingenting og har ingen ledelse ennå */
export function underConstruction(p: SisterPlant): boolean {
  return p.project?.kind === "bygg";
}

/** Verket slik det blir når prosjektet er ferdig */
export function plannedPlant(p: SisterPlant): SisterPlant {
  if (!p.project) return p;
  if (p.project.kind === "utbygging") return { ...p, type: "storverk", level: 0 };
  if (p.project.kind === "modernisering") return { ...p, level: p.level + 1 };
  return p;
}

/** Verket som bygges, bygges ut eller moderniseres nå – konsernet bygger ett prosjekt om gangen (B-311) */
export function activeProject(g: GameState): SisterPlant | null {
  return g.konsern.plants.find((p) => p.project) ?? null;
}

/**
 * Trinnet verket får når det som er bestilt, er ferdig (B-394): trinnet nå + moderniseringer som bygges eller står i
 * køen. Grensesnittet viser det som «Trinn 3 → 4».
 */
export function plannedLevel(g: GameState, p: SisterPlant): number {
  const ordered = g.konsern.orders.filter((o) => o.kind === "modernisering" && o.plantId === p.id).length;
  return p.level + (ordered || (p.project?.kind === "modernisering" ? 1 : 0));
}

/** Tittelen som åpner neste moderniseringstrinn, eller null når alle trinn er åpnet (B-394) */
export function nextTierTitle(g: GameState): string | null {
  const now = earnedOf(g);
  const max = modMaxAt(now);
  for (let lvl = now + 1; lvl <= LEGENDS.length; lvl++) if (modMaxAt(lvl) > max) return LEGENDS[lvl - 1].title;
  return null;
}

/** Hva som pågår, med vanlige ord */
export function projectLabel(p: SisterPlant): string {
  const k = p.project?.kind;
  if (k === "bygg") return `Bygges (${SISTER_TYPES[p.type].name.toLowerCase()})`;
  if (k === "utbygging") return "Bygges ut til storverk";
  if (k === "modernisering") return `Moderniseres til trinn ${p.level + 1}`;
  return "";
}

/** Et prosjekt i køen, med vanlige ord: «Nytt storverk (Dalverket)», «Modernisering av Elveverket» */
export function orderLabel(g: GameState, o: KonsernOrder): string {
  if (o.kind === "bygg")
    return `Nytt ${SISTER_TYPES[o.type ?? "stalverk"].name.toLowerCase()} (${o.name ?? ""}${o.region ? `, ${regionName(o.region)}` : ""})`;
  const name = g.konsern.plants.find((p) => p.id === o.plantId)?.name ?? "verket";
  return o.kind === "utbygging" ? `Utbygging av ${name} til storverk` : `Modernisering av ${name}`;
}

/** Hvor langt prosjektet er kommet (0–1) */
export function projectProgress(p: SisterPlant, now = realNow()): number {
  const pr = p.project;
  if (!pr) return 1;
  return Math.min(1, Math.max(0, (now - pr.startedAt) / Math.max(1, pr.readyAt - pr.startedAt)));
}

/** Konsernet slik serveren holder det, bygget av kopien i spillet (B-326) */
export function worldOf(g: GameState): KonsernWorld {
  const k = g.konsern;
  return {
    plants: k.plants.map((p) => ({ ...p })),
    orders: (k.orders ?? []).map((o) => ({ ...o })),
    nextId: k.nextId,
    level: k.legends,
    floor: k.legends,
    earned: k.earned ?? 0,
    balance: k.treasury?.balance ?? 0,
  };
}

/** Skriv det som skjedde i køen i loggen */
function logEvents(g: GameState, events: SettleEvent[]): void {
  for (const e of events) {
    const p = e.plant;
    if (e.kind === "start") {
      if (e.order?.kind === "bygg")
        log(g, `Byggingen av ${p.name} (${SISTER_TYPES[p.type].name.toLowerCase()}) har startet.`, "info");
      continue;
    }
    const kind = e.order?.kind ?? "bygg";
    log(
      g,
      kind === "bygg"
        ? `${p.name} er ferdig bygget og i drift. Det gir utbytte til konsernkassa hver ekte dag.`
        : kind === "utbygging"
          ? `${p.name} er bygget ut til storverk!`
          : `${p.name} er modernisert (trinn ${p.level}): mer utbytte hver dag.`,
      "good",
    );
  }
}

/** Legg konsernet fra serveren (eller køen i appen) inn i spillet: verkene, køen, nivået og kassa */
export function applyWorld(g: GameState, w: KonsernWorld, events: SettleEvent[] = []): void {
  const k = g.konsern;
  // Stans etter havari (B-106) er noe spillet vet, ikke serveren: den beholdes for verk med samme id
  const down = new Map(k.plants.map((p) => [p.id, p.downUntilDay]));
  k.plants = w.plants.map((p) => ({ ...p, downUntilDay: Math.max(p.downUntilDay ?? 0, down.get(p.id) ?? 0) }));
  k.orders = w.orders.map((o) => ({ ...o }));
  k.nextId = Math.max(k.nextId, w.nextId);
  if (k.treasury) k.treasury = { ...k.treasury, balance: w.balance };
  k.earned = Math.max(k.earned ?? 0, earnedLevel(w));
  logEvents(g, events);
  raiseLevel(g, Math.max(w.level, w.floor));
}

/**
 * Start og fullfør prosjektene i køen i ekte tid, i takt med serveren (`konsern_settle`). Kalles fra spilløkka, også
 * når spillet står på pause. Gir hvor mange prosjekter som ble ferdige.
 */
export function finishKonsernProjects(g: GameState): number {
  if (!g.konsern?.plants.some((p) => p.project) && !g.konsern?.orders?.length) return 0;
  const w = worldOf(g);
  const events = settleWorld(w, realNow());
  if (!events.length && w.level === g.konsern.legends && (w.earned ?? 0) === (g.konsern.earned ?? 0)) return 0;
  applyWorld(g, w, events);
  return events.filter((e) => e.kind === "ferdig").length;
}

/** Overskudd per døgn for ett datterverk nå (uten tilfeldig svingning) */
export function sisterProfit(g: GameState, p: SisterPlant): number {
  const spec = SISTER_TYPES[p.type];
  const shared = 1 + (hasShared(g, "innkjop") ? 0.05 : 0) + (hasShared(g, "salg") ? 0.05 : 0);
  // Konsernforskningen (B-120). Mesterskapet «Konsernledelse» gjelder hjemmeverket fra B-328, ikke datterverkene
  const research = (hasResearch(g, "konsernstyring") ? 1.1 : 1) * (hasResearch(g, "gronnkonsern") ? 1.1 : 1);
  return spec.profitPerDay * (1 + MODERNIZE_GAIN * p.level) * shared * research * g.market.steelFactor;
}

/**
 * Et verk er verdt det det tjener (B-121): omtrent 60 døgns overskudd ved normal stålpris. Da går konsernverdien
 * ikke ned når man kjøper et verk, og alt verket tjener etterpå, er gevinst. Et nytt verk er verdt det det koster.
 */
export const VALUE_DAYS = 60;

export function sisterValue(g: GameState, p: SisterPlant): number {
  // Verdien regnes som om prosjektet er ferdig (B-209): pengene er betalt, så konsernverdien faller ikke imens
  p = plannedPlant(p);
  const steel = g.market?.steelFactor || 1;
  return (sisterProfit(g, p) / steel) * VALUE_DAYS;
}

// ------------------------------------------------------------------ //
// Utbytte og konsernkostnader (B-181)
// ------------------------------------------------------------------ //
/**
 * Utbytte og imperiebelastning (B-181, B-251) – siden reform 2 (B-304) regnes utbyttet i ekte tid av serveren og
 * betales rett til konsernkassa. Regelen ligger i `game/dividend.ts` (speilet i SQL); her bygges bare inngangen fra
 * spilltilstanden, så «Neste steg», knappene, mesterskapet og testspilleren ser det samme som serveren. Ingenting av
 * dette går inn i den lokale kassa lenger.
 */
export const KONSERN_ECONOMY = {
  /** Del av driftsresultatet som blir igjen i verket (vedlikehold, lokal ledelse, arbeidskapital) */
  keepShare: DIVIDEND.keep,
  /** Hvor mye mindre av overskuddet som kan løftes opp for hvert verk nedover i rekken (sortert etter overskudd) */
  upstreamDecay: DIVIDEND.decay,
};

/** Andel av stålet hjemme som holdt kvaliteten de siste sju døgnene (0 uten produksjon) */
function recentQuality(g: GameState): number {
  const days = g.history.slice(-7);
  const good = days.reduce((a, d) => a + (d.onGradeT ?? 0), 0);
  const all = days.reduce((a, d) => a + (d.onGradeT ?? 0) + (d.offGradeT ?? 0) + (d.secondT ?? 0), 0);
  return all > 0 ? good / all : 0;
}

/** Inngangen til utbytteregelen fra spilltilstanden, slik serveren leser det lagrede spillet */
export function dividendInput(g: GameState, plants = g.konsern.plants, masteryAt?: number): DividendInput {
  return {
    plants: plants.map((p) => ({ type: p.type, level: p.level, building: underConstruction(p) })),
    shared: (["innkjop", "salg"] as SharedId[]).filter((id) => hasShared(g, id)).length,
    research: ["konsernstyring", "gronnkonsern"].filter((id) => hasResearch(g, id)).length,
    // Mesterskapet teller ikke i utbyttet lenger (B-328): DIVIDEND.masteryMax er 0
    mastery: masteryAt ?? masteryLevel(g, "datterverk"),
    reputation: g.reputation,
    quality: recentQuality(g),
  };
}

/** Andelen av det verket har igjen, som kan løftes opp: det beste verket gir full andel, det neste litt mindre */
export function upstreamShare(rank: number): number {
  return 1 / (1 + DIVIDEND.decay * Math.max(0, rank - 1));
}

/** Utbytte til konsernkassa per ekte dag fra hvert verk, i samme rekkefølge som `plants` (etter imperiebelastningen) */
export function dividends(g: GameState, plants: SisterPlant[]): number[] {
  return dividendShares(dividendInput(g, plants));
}

/**
 * Flaggskipet (B-209): går hjemmeverket godt, får datterverkene bedre ledelse og mer utbytte – inntil +20 % med
 * omdømme 100 og bare stål som holder kvaliteten de siste sju døgnene. Da lønner det seg fortsatt å drive verket godt.
 */
export const FLAGSHIP_MAX = DIVIDEND.flagship;
export function flagshipBonus(g: GameState): number {
  return flagshipOf(g.reputation, recentQuality(g));
}

/** Utbytte til konsernkassa per ekte dag fra ett verk i konsernet */
export function sisterDividend(g: GameState, p: SisterPlant, plants = g.konsern.plants): number {
  const i = plants.indexOf(p);
  return i < 0 ? 0 : dividends(g, plants)[i];
}

/** Utbytte til konsernkassa per ekte dag med disse verkene (etter imperiebelastningen) */
export function konsernNetFor(g: GameState, plants: SisterPlant[], masteryAt?: number): number {
  return dividendPerDay(dividendInput(g, plants, masteryAt));
}

/** Verdien av datterverkene til sammen */
export function konsernValue(g: GameState): number {
  return (g.konsern?.plants ?? []).reduce((a, p) => a + sisterValue(g, p), 0);
}

/** Egenkapital (kasse minus lån) pluss datterverkene. Det som er betalt ut til eierne (B-303), teller ikke */
export function konsernEquity(g: GameState): number {
  return g.cash - g.loan + konsernValue(g);
}

/**
 * Verdien spilleren har skapt (B-341): konsernverdien pluss den fryste private formuen (det som ble betalt ut mens kassa
 * hadde et tak, fjernet i B-381). Uten formuen ville de som nådde taket, tapt verdi da taket ble fjernet. Brukes bare til det
 * som hører til eget spill – sluttmålet, stormodellene og prestasjonene – aldri til topplistene eller serveren (B-303).
 */
export function valueCreated(g: GameState): number {
  return konsernEquity(g) + paidOutTotal(g);
}

/** Et trinn modernisering fra konsernkassa: 30 % av prisen, −25 % med «Standardverk» (B-120, B-326) */
export function modernizeCost(p: SisterPlant, g?: GameState): number {
  return modCost(p.type, g?.researched ?? []);
}

/** Å bygge ut et stålverk til storverk koster forskjellen i pris; moderniseringen starter på nytt (B-119, B-326) */
export function upgradeCost(g?: GameState): number {
  return upgradeCostWorld(g?.researched ?? []);
}

function plantOf(type: SisterType, level: number, id = -1): SisterPlant {
  return { id, type, name: "", level, boughtDay: 0, downUntilDay: 0 };
}

/** Verkene slik de blir når køen er ferdig – det nye kjøp regnes mot */
export function plannedKonsern(g: GameState): SisterPlant[] {
  return plannedPlantsOf(worldOf(g));
}

/** Hvor mye mer konsernkassa får per ekte dag hvis verkene (etter køen) byttes med disse (B-181) */
function netGain(g: GameState, base: SisterPlant[], next: SisterPlant[]): number {
  return konsernNetFor(g, next) - konsernNetFor(g, base);
}

/** Gjennomsnitt per døgn de siste tre døgnene for noen inntekts- eller kostnadsposter */
function recentPerDay(g: GameState, pick: (d: GameState["today"]) => number): number {
  const days = g.history.slice(-3);
  return days.length ? days.reduce((a, d) => a + pick(d), 0) / days.length : 0;
}

/** Omtrentlig overskudd per døgn for hjemmeverket de siste døgnene (uten investeringer) */
export function konsernProfitPerDay(g: GameState): number {
  return recentPerDay(g, (d) => {
    const inc = Object.values(d.income).reduce<number>((a, b) => a + (b ?? 0), 0);
    const cost = Object.entries(d.costs)
      .filter(([k]) => k !== "investering")
      .reduce<number>((a, [, b]) => a + (b ?? 0), 0);
    return inc - cost;
  });
}

export interface KonsernOption {
  key: string;
  title: string;
  price: number;
  /** Omtrent hvor mye mer konsernkassa får per ekte dag (utbytte) – eller hjemme per døgn for felles funksjoner */
  gain: number;
  /** Dager før kjøpet har betalt seg */
  payback: number;
  /** Hvorfor det ikke kan kjøpes nå (utenom penger), eller null */
  blocked: string | null;
  /** Ekte timer før det er ferdig (B-209); 0 for det som virker med én gang */
  hours: number;
  /**
   * Hva som betaler (B-326): konsernkassa på serveren for verkene (bestilles med `request`), kassa i spillet for de
   * felles funksjonene (kjøpes med `run`)
   */
  pay: "konsernkasse" | "kasse";
  /** Salget av det gamle verket i et bytte til kompleks (allerede trukket fra `price`, B-443: betaler lånet først) */
  sale?: number;
  request?: OrderRequest;
  run?: (g: GameState) => { ok: boolean; message: string };
}

/** Pengene som betaler for et kjøp: konsernkassa (kopien fra serveren, 0 uten konto) eller kassa i spillet */
export function moneyFor(g: GameState, o: Pick<KonsernOption, "pay">): number {
  return o.pay === "kasse" ? g.cash : (g.konsern.treasury?.balance ?? 0);
}

/**
 * Alle kjøp i konsernet med hva de gir og hvor fort de betaler seg (B-119). Verkene kjøpes fra konsernkassa og
 * bestilles på serveren (B-326); samme regel som serveren sier nei eller ja etter (konsernWorld.ts). Brukes til
 * «Neste steg», til å forklare hver knapp og av testspilleren.
 */
export function konsernOptions(g: GameState): KonsernOption[] {
  const k = g.konsern;
  const out: KonsernOption[] = [];
  const add = (o: Omit<KonsernOption, "payback">) =>
    out.push({ ...o, payback: o.gain > 0 ? o.price / o.gain : Infinity });
  const w = worldOf(g);
  const base = plannedPlantsOf(w);
  // Uten konto finnes ikke konsernkassa (B-149): verkene vises, men kan ikke kjøpes
  const noAccount = k.treasury === null ? "Datterverk kjøpes fra konsernkassa – det krever en konto." : null;
  const world = (
    key: string,
    title: string,
    req: OrderRequest,
    next: SisterPlant[],
    fallback: { price: number; hours: number },
  ) => {
    const q = orderQuote(w, req, g.researched);
    const refused = "refusal" in q ? q.refusal : null;
    const blocked =
      noAccount ??
      (refused === "fullt"
        ? `Konsernet er fullt (${maxSisters(g)} datterverk). ${moreSlotsText(g)}`
        : refused
          ? ORDER_REFUSAL_TEXT[refused]
          : null);
    add({
      key,
      title,
      price: "refusal" in q ? fallback.price : q.cost - q.sale,
      sale: "refusal" in q ? undefined : q.sale,
      gain: netGain(g, base, next),
      blocked,
      hours: "refusal" in q ? fallback.hours : q.hours,
      pay: "konsernkasse",
      request: req,
    });
  };
  for (const type of ["stalverk", "storverk", "kompleks"] as SisterType[]) {
    // Stålkomplekset åpnes med tittelen Stålfyrste (B-150); før det vises det ikke
    if (type === "kompleks" && !kompleksOpen(g)) continue;
    world(
      `kjop-${type}`,
      `Kjøp et ${SISTER_TYPES[type].name.toLowerCase()}`,
      { kind: "bygg", type },
      [...base, plantOf(type, 0)],
      { price: sisterPrice(g, type), hours: BUILD_HOURS[type] },
    );
  }
  // Felles funksjoner: 5 % mer i alle datterverkene, og litt hjemme. Betales fra kassa i spillet
  const input = dividendInput(g, base);
  const sisterGain = Math.max(0, dividendPerDay({ ...input, shared: input.shared + 1 }) - dividendPerDay(input));
  const scrapPerDay = recentPerDay(g, (d) => d.costs.skrap ?? 0);
  const salesPerDay = recentPerDay(g, (d) => (d.income.kontrakt ?? 0) + (d.income.spot ?? 0));
  for (const id of Object.keys(KONSERN_SHARED) as SharedId[]) {
    if (hasShared(g, id)) continue;
    add({
      key: `felles-${id}`,
      title: KONSERN_SHARED[id].name,
      price: KONSERN_SHARED[id].price,
      gain: sisterGain + (id === "innkjop" ? scrapPerDay * 0.05 : salesPerDay * 0.03),
      blocked: null,
      hours: 0,
      pay: "kasse",
      run: (gg) => buyShared(gg, id),
    });
  }
  const full = base.length >= maxSisters(g);
  for (const p of base) {
    // Et verk med noe i køen eller et prosjekt som pågår, tar neste steg når det er ferdig (planlagt trinn)
    // Når konsernet er fullt, er et stålkompleks i stedet for et lite verk det som gir mest (B-170)
    if (full && kompleksOpen(g) && p.type !== "kompleks")
      world(
        `bytt-${p.id}`,
        `Selg ${p.name} og kjøp et stålkompleks`,
        { kind: "bytt", plant: p.id },
        base.map((x) => (x === p ? plantOf("kompleks", 0, x.id) : x)),
        { price: sisterPrice(g, "kompleks") - salePrice(p), hours: BUILD_HOURS.kompleks },
      );
    if (p.type === "stalverk")
      world(
        `bygg-${p.id}`,
        `Bygg ut ${p.name} til storverk`,
        { kind: "utbygging", plant: p.id },
        base.map((x) => (x === p ? plantOf("storverk", 0, x.id) : x)),
        { price: upgradeCost(g), hours: UPGRADE_HOURS },
      );
    if (p.level < modernizeMax(g))
      world(
        `mod-${p.id}`,
        `Moderniser ${p.name}`,
        { kind: "modernisering", plant: p.id },
        base.map((x) => (x === p ? plantOf(p.type, p.level + 1, x.id) : x)),
        { price: modernizeCost(p, g), hours: MODERNIZE_HOURS },
      );
  }
  return out;
}

/** Kjøp i konsernet som ikke er sperret og som pengene rekker til nå – tallet på Konsern i menyen og på Utvid (B-144, B-226) */
export function konsernReady(g: GameState): number {
  if (!g.konsern.unlocked) return 0;
  const options = worthwhileOptions(konsernOptions(g));
  return options.filter((o) => !o.blocked && moneyFor(g, o) >= o.price).length;
}

/**
 * Kjøpene som er verdt å foreslå (B-342): modernisering av et verk som kan bygges ut, er bortkastet – moderniseringen
 * starter på nytt når stålverket blir storverk (B-119). Den står fortsatt under verket, men teller ikke i tallet på
 * Konsern og foreslås ikke under Utvid. Før ga tre stålverk «3» på Konsern uten at noe kunne kjøpes der.
 */
export function worthwhileOptions(options: KonsernOption[]): KonsernOption[] {
  const canExpand = new Set(options.filter((o) => o.key.startsWith("bygg-")).map((o) => o.key.slice(5)));
  return options.filter((o) => !(o.key.startsWith("mod-") && canExpand.has(o.key.slice(4))));
}

/**
 * Utbyggingen av verkene du har, under Konsern → Utvid (B-432): de tre som betaler seg raskest – men først det du har
 * råd til nå. Tallet på Konsern i menyen (`konsernReady`) teller kjøp du har råd til, og før kunne det ene kjøpet du
 * hadde råd til, mangle i lista når tre dyrere betalte seg litt raskere: «1» på Konsern, men ingenting å kjøpe.
 */
export function konsernGrowOptions(g: GameState, options = konsernOptions(g)): KonsernOption[] {
  const advice = konsernAdvice(g);
  const affordable = (o: KonsernOption) => moneyFor(g, o) >= o.price;
  return worthwhileOptions(options)
    .filter((o) => /^(mod|bygg|bytt)-/.test(o.key) && !o.blocked && o.key !== advice?.key)
    .sort((x, y) => Number(affordable(y)) - Number(affordable(x)) || x.payback - y.payback)
    .slice(0, 3);
}

/**
 * «Neste steg» på Konsern-fanen (B-119): kjøpet som har betalt seg raskest regnet fra i dag – tida det tar å spare
 * opp, pluss tida kjøpet bruker på å betale seg. Da foreslås ikke noe som ligger et halvt år fram i tid.
 */
export function konsernAdvice(g: GameState): KonsernOption | null {
  const score = (o: KonsernOption) => (daysToAfford(g, o.price, o.pay) ?? o.payback * 2) + o.payback;
  return (
    worthwhileOptions(konsernOptions(g))
      .filter((o) => !o.blocked && o.gain > 0)
      .sort((a, b) => score(a) - score(b))[0] ?? null
  );
}

/**
 * Hvor lenge det tar å spare opp til et beløp: i døgn med dagens overskudd hjemme (kassa i spillet), eller i ekte
 * dager med det som kommer inn i konsernkassa (B-326). Null hvis det kommer for lite inn.
 */
export function daysToAfford(g: GameState, price: number, pay: KonsernOption["pay"] = "kasse"): number | null {
  const missing = price - moneyFor(g, { pay });
  if (missing <= 0) return 0;
  const perDay = pay === "kasse" ? konsernProfitPerDay(g) : (g.konsern.treasury?.perDay ?? 0);
  return perDay > 0 ? Math.ceil(missing / perDay) : null;
}

/**
 * Konsernet åpner seg på storverket når alt utstyret der er kjøpt, eller egenkapitalen har nådd 1 mrd.
 * «remaining» er antall kjøp som gjenstår på storverket (fra upgradeOptions i actions.ts).
 */
export function checkKonsernUnlock(g: GameState, remaining: number): void {
  if (g.konsern.unlocked || g.stage < 4) return;
  const equity = g.cash - g.loan;
  if (remaining > 0 && equity < KONSERN_UNLOCK_EQUITY) return;
  g.konsern.unlocked = true;
  unlock(g, "konsern");
  log(
    g,
    remaining === 0
      ? "Storverket er ferdig bygget! Nå kan du bygge et konsern med flere verk – se Konsern i menyen."
      : `Egenkapitalen har passert ${fmtKr(KONSERN_UNLOCK_EQUITY)}! Nå kan du bygge et konsern med flere verk – se Konsern i menyen. Nye prosjekter venter under Forskning.`,
    "good",
  );
}

/** Andelen av byggekostnaden man får igjen ved salg (B-307) */
export const SELL_SHARE = WORLD_KONSERN.sellShare;

/**
 * Salgssummen for et datterverk (B-307): 60 % av det det ville kostet å bygge det på nytt fra konsernkassa (listepris
 * pluss moderniseringene), uansett hvor mye det tjener. Et verk som bygges, selges som ferdig (pengene er betalt).
 */
export function sisterSalePrice(_g: GameState, p: SisterPlant): number {
  return salePrice(plannedPlant(p));
}

/**
 * Konsernet uten server (B-326): testene og testspilleren bestiller, avbestiller og selger mot den samme regelen som
 * serveren, med konsernkassa i `g.konsern.treasury`. Appen med konto går via `net/konsern.ts`.
 */
/** Et kjøp i konsernet er gjort (B-470) – eller avbestilt (`-1`). Til dagens oppdrag «datter» */
export function noteKonsernBuy(g: GameState, n = 1): void {
  g.totals.konsernBuys = Math.max(0, (g.totals.konsernBuys ?? 0) + n);
}

export function localOrder(g: GameState, req: OrderRequest): { ok: boolean; message: string } {
  if (!g.konsern.unlocked) return { ok: false, message: ORDER_REFUSAL_TEXT.konsern };
  if (!g.konsern.treasury) return { ok: false, message: "Datterverk kjøpes fra konsernkassa – det krever en konto." };
  const w = worldOf(g);
  const r = placeOrder(w, req, g.researched, realNow(), day(g));
  if (!r.ok) return { ok: false, message: ORDER_REFUSAL_TEXT[r.reason] };
  applyWorld(g, w);
  noteKonsernBuy(g);
  return { ok: true, message: `Bestilt: ${orderLabel(g, r.order)}.` };
}

export function localCancel(g: GameState, id: number): { ok: boolean; message: string } {
  const w = worldOf(g);
  const r = cancelOrder(w, id, realNow());
  if (!r.ok) return { ok: false, message: ORDER_REFUSAL_TEXT.startet };
  applyWorld(g, w);
  noteKonsernBuy(g, -1);
  return { ok: true, message: `Avbestilt. ${fmtKr(r.refund)} er tilbake i konsernkassa.` };
}

export function localSell(g: GameState, id: number): { ok: boolean; message: string } {
  const w = worldOf(g);
  const name = g.konsern.plants.find((p) => p.id === id)?.name ?? "Verket";
  const r = sellPlant(w, id, realNow());
  if (!r.ok) return { ok: false, message: ORDER_REFUSAL_TEXT.verk };
  applyWorld(g, w);
  log(g, `Konsernet har solgt ${name} for ${fmtKr(r.sale)}. Pengene står i konsernkassa.`, "info");
  return { ok: true, message: `${name} er solgt.` };
}

/** Flytt et verk til en annen region, én gang (B-333, som `konsern_move`) */
export function localMove(g: GameState, id: number, region: RegionId): { ok: boolean; message: string } {
  const w = worldOf(g);
  const name = g.konsern.plants.find((p) => p.id === id)?.name ?? g.konsern.orders?.find((o) => o.plantId === id)?.name;
  if (!movePlant(w, id, region, realNow())) return { ok: false, message: MOVE_REFUSAL };
  applyWorld(g, w);
  return { ok: true, message: `${name ?? "Verket"} står nå i ${regionName(region)}.` };
}

/** Milepæler for konsernverdien (B-119): fagpoeng og en god nyhet på veien mot 10 mrd. */
export function checkKonsernMilestones(g: GameState): void {
  const k = g.konsern;
  if (!k?.unlocked) return;
  while (k.milestones < KONSERN_MILESTONES.length && konsernEquity(g) >= KONSERN_MILESTONES[k.milestones]) {
    const value = KONSERN_MILESTONES[k.milestones];
    k.milestones += 1;
    awardPoints(g, MILESTONE_FP);
    log(
      g,
      `Milepæl: konsernet er verdt over ${fmtKr(value)}! +${MILESTONE_FP} fagpoeng. ${k.milestones < KONSERN_MILESTONES.length ? `Neste milepæl: ${fmtKr(KONSERN_MILESTONES[k.milestones])}.` : "Nå gjenstår bare sluttmålet."}`,
      "good",
    );
  }
}

export function buyShared(g: GameState, id: SharedId): { ok: boolean; message: string } {
  const spec = KONSERN_SHARED[id];
  if (!g.konsern.unlocked) return { ok: false, message: "Konsernet er ikke åpnet ennå." };
  if (hasShared(g, id)) return { ok: false, message: "Du har det allerede." };
  if (g.cash < spec.price) return { ok: false, message: "For lite penger" };
  addCost(g, "investering", spec.price);
  g.konsern.shared.push(id);
  log(g, `${spec.name} er etablert i konsernet.`, "good");
  return { ok: true, message: `${spec.name} etablert.` };
}

// ------------------------------------------------------------------ //
// Salgsdirektøren (B-117)
// ------------------------------------------------------------------ //
/** Rekruttering og lønn: meget dyrt, med vilje – det skal koste å slippe salgsarbeidet */
export const DIRECTOR_HIRE = 250_000_000;
export const DIRECTOR_PER_DAY = 4_000_000;

/** Lønna til salgsdirektøren, halvert med «Profesjonell ledelse» (B-120) */
export function directorPerDay(g: GameState): number {
  return DIRECTOR_PER_DAY * (hasResearch(g, "konsernledelse") ? 0.5 : 1);
}
/** Rammeavtalene skal ikke ta mer enn dette av ukeproduksjonen til sammen (samme grense som «gult» på Salg, B-103) */
export const DIRECTOR_AGREEMENT_SHARE = 0.5;
/**
 * Salgsdirektøren er forsiktigere enn «trygg» på Salg: den regner med det dårligste døgnet den siste uka (en
 * stans eller et havari kan komme igjen) og vil ha minst 30 % av tida til fristen til overs.
 */
export const DIRECTOR_MARGIN = 0.7;

/**
 * Tonn per døgn salgsdirektøren regner med: det dårligste av de siste sju døgnene med produksjon. Med salgsteam
 * (B-172) snittet av dem.
 */
export function directorDailyT(g: GameState, stats: ReturnType<typeof computePlantStats>): number {
  const recent = g.history
    .slice(-7)
    .map((d) => d.producedT)
    .filter((t) => t > 0);
  const typical = recent.length
    ? directorLevel(g) >= 1
      ? recent.reduce((a, b) => a + b, 0) / recent.length
      : Math.min(...recent)
    : stats.dailyProductT * 0.6;
  return Math.min(realisticDailyT(g, stats), typical);
}
/**
 * Andelen av valseverkets kapasitet salgsdirektøren regner med (B-240). Valseverket får emnene sammen med emneordrene og
 * står av og til, så det valser ikke alt det kan: på et fullt storverk ble det 60–70 % av kapasiteten.
 */
export const ROLLING_PLAN_SHARE = 0.7;
/** Hvor mye av tida til fristen salgsdirektøren bruker, per oppgradering (B-172; 0,85 → 0,75 i B-228) */
const DIRECTOR_MARGINS = [DIRECTOR_MARGIN, 0.75, 0.75, 0.75];

/** Oppgraderinger av salgsdirektøren (B-172): brukeren så at den av og til ikke hadde noen ordrer */
export const DIRECTOR_UPGRADES: { name: string; price: number; text: string }[] = [
  {
    name: "Salgsteam",
    price: 500_000_000,
    text: "Regner med et vanlig døgn i stedet for det dårligste, trenger mindre luft til fristen og tar også ordrer der resepten er nær grensen.",
  },
  {
    name: "Kundenettverk",
    price: 2_000_000_000,
    text: "Skaffer flere forespørsler selv når ordrekøen er kort, så verket ikke står uten ordrer.",
  },
  {
    name: "Eksportkontor",
    price: 8_000_000_000,
    text: "Forhandler 5 % bedre pris på kontraktene den signerer, og tar rammeavtaler opp til 70 % av ukeproduksjonen.",
  },
];

export function directorLevel(g: GameState): number {
  return g.konsern?.director?.level ?? 0;
}

/** Neste oppgradering av salgsdirektøren, eller null når alt er kjøpt */
export function nextDirectorUpgrade(g: GameState): (typeof DIRECTOR_UPGRADES)[number] | null {
  return g.konsern?.director ? (DIRECTOR_UPGRADES[directorLevel(g)] ?? null) : null;
}

export function upgradeDirector(g: GameState): { ok: boolean; message: string } {
  const d = g.konsern.director;
  if (!d) return { ok: false, message: "Du har ingen salgsdirektør." };
  const up = nextDirectorUpgrade(g);
  if (!up) return { ok: false, message: "Salgsdirektøren har alt." };
  if (g.cash < up.price) return { ok: false, message: "For lite penger" };
  addCost(g, "investering", up.price);
  d.level = directorLevel(g) + 1;
  log(g, `Salgsdirektøren har fått ${up.name.toLowerCase()}: ${up.text}`, "good");
  return { ok: true, message: `${up.name} er på plass.` };
}

export function hireDirector(g: GameState): { ok: boolean; message: string } {
  if (!g.konsern.unlocked) return { ok: false, message: "Konsernet er ikke åpnet ennå." };
  if (g.konsern.director) return { ok: false, message: "Du har allerede en salgsdirektør." };
  if (g.cash < DIRECTOR_HIRE) return { ok: false, message: "For lite penger" };
  addCost(g, "lonn", DIRECTOR_HIRE);
  g.konsern.director = { hiredDay: day(g), contracts: 0, agreements: 0, agreementsOn: true, active: true, level: 0 };
  log(
    g,
    `Du har ansatt en salgsdirektør (${fmtKr(DIRECTOR_HIRE)} i rekruttering, ${fmtKr(directorPerDay(g))} per døgn). Kontraktene som verket rekker, signeres nå av seg selv.`,
    "good",
  );
  return { ok: true, message: "Salgsdirektøren er ansatt." };
}

export function fireDirector(g: GameState): { ok: boolean; message: string } {
  if (!g.konsern.director) return { ok: false, message: "Du har ingen salgsdirektør." };
  g.konsern.director = null;
  log(g, "Salgsdirektøren har sluttet. Nå signerer du kontraktene selv igjen.", "info");
  return { ok: true, message: "Salgsdirektøren har sluttet." };
}

/**
 * Hver time: salgsdirektøren signerer forespørsler verket trygt rekker (også i en dårlig uke), der resepten holder
 * (eller skrapklasseren legger den om), mest verdifulle først. Rammeavtaler tas så lenge de til sammen er under
 * halve ukeproduksjonen i en dårlig uke.
 * Resten får ligge, så spilleren kan ta dem selv.
 */
export function directorHour(g: GameState): void {
  const d = g.konsern?.director;
  if (!d || !d.active) return;
  // Sommerstans (B-321): alle har ferie, ovnene står, og det som signeres nå, rekkes ikke
  if (summerStop(g)) return;
  const stats = computePlantStats(g);
  if (stats.dailyProductT <= 0) return;
  const following = auto(g, "followQueue");
  const perDay = directorDailyT(g, stats);
  if (perDay <= 0) return;
  const level = directorLevel(g);
  // Kundenettverket skaffer en forespørsel til når ordrekøen er kortere enn to døgns produksjon (B-172)
  if (level >= 2 && committedT(g) < perDay * 2 && chance(g, 0.25)) extraOffer(g, stats);
  const offers = g.contracts
    // Landemerkene tar spilleren selv (B-177): de er en samling, ikke vanlig salg
    .filter((c) => c.status === "tilbud" && !c.landmark)
    .sort((a, b) => b.tonnes * b.pricePerT - a.tonnes * a.pricePerT);
  // Et landemerke som venter på svar, går først i køen når du tar det (B-211): salgsdirektøren holder av plass til det
  const landmarkT = g.contracts.filter((c) => c.status === "tilbud" && c.landmark).reduce((a, c) => a + c.tonnes, 0);
  const margin = DIRECTOR_MARGINS[level] ?? DIRECTOR_MARGIN;
  for (const c of offers) {
    const check = assessOffer(g, stats, c, committedT(g) + landmarkT);
    const recipeOk = check.recipeOk || (check.graderFix && following);
    if (!check.canMake || !recipeOk || check.tight || (check.narrow && level < 1)) continue;
    // Samme regnestykke som på Salg, men med det dårligste døgnet og mer margin
    let needDays = (committedT(g) + landmarkT + agreementLoadUntil(g, c.deadlineDay) + c.tonnes) / perDay;
    // Armering må også rekkes av valseverket (B-217)
    if (c.product === "armering" && stats.rolledDailyT > 0) {
      const load = committedT(g, "armering") + agreementLoadUntil(g, c.deadlineDay, "armering") + c.tonnes;
      needDays = Math.max(needDays, load / Math.min(perDay, productCapT(stats, "armering")));
    }
    if (needDays > check.days * margin) continue;
    // …og ingen kontrakt i køen skal bli for sen (B-240): med frist-sortering går en kontrakt med kort frist foran de
    // andre, og da ble eldre kontrakter for sene selv om den nye rakk
    const extra = [{ t: c.tonnes, deadline: c.deadlineDay, product: c.product, customer: c.customer }];
    if (queueFit(g, perDay, extra, { front: landmarkT }).worst > margin) continue;
    // Valseverket får emnene sammen med emneordrene, så direktøren regner med ROLLING_PLAN_SHARE av kapasiteten der
    if (c.product === "armering" && stats.rolledDailyT > 0) {
      const rollPerDay = Math.min(perDay, productCapT(stats, "armering")) * ROLLING_PLAN_SHARE;
      if (queueFit(g, rollPerDay, extra, { product: "armering" }).worst > margin) continue;
    }
    // Eksportkontoret forhandler bedre pris (B-172)
    if (level >= 3) c.pricePerT = Math.round(c.pricePerT * 1.05);
    if (acceptContract(g, c.id, "Salgsdirektøren").ok) d.contracts += 1;
  }
  if (!d.agreementsOn) return;
  const share = level >= 3 ? 0.7 : DIRECTOR_AGREEMENT_SHARE;
  const perWeek = perDay * 7;
  for (const a of g.agreements.filter((x) => x.status === "tilbud")) {
    const active = g.agreements.filter((x) => x.status === "aktiv");
    const used = active.reduce((t, x) => t + x.weeklyT, 0);
    const canMake = stats.products.includes(a.product);
    const recipeOk = recipeEstimate(g, a.grade, stats, gradeRecipe(g, a.grade)).grades.includes(a.grade);
    if (!canMake || !recipeOk || perWeek <= 0 || (used + a.weeklyT) / perWeek > share) continue;
    // Første uke legges i køen med én gang, med frist om seks døgn: den må passe med kontraktene som alt er der (B-240)
    const weeks = agreementWeeks(a, day(g));
    if (queueFit(g, perDay, weeks).worst > margin) continue;
    // Armering: samme andel av det valseverket rekker (B-217)
    if (a.product === "armering" && stats.rolledDailyT > 0) {
      const usedArm = active.filter((x) => x.product === "armering").reduce((t, x) => t + x.weeklyT, 0);
      const rollPerDay = Math.min(perDay, productCapT(stats, "armering")) * ROLLING_PLAN_SHARE;
      if ((usedArm + a.weeklyT) / (rollPerDay * 7) > share) continue;
      if (queueFit(g, rollPerDay, weeks, { product: "armering" }).worst > margin) continue;
    }
    if (acceptAgreement(g, a.id, "Salgsdirektøren").ok) d.agreements += 1;
  }
}

/**
 * Hvert døgn: lønna til salgsdirektøren, og kunnskapsdeling fra verkene som går (B-117, B-120). Utbyttet betales ikke
 * her lenger: serveren regner det i ekte tid og setter det inn i konsernkassa (B-304).
 */
export function konsernDay(g: GameState): void {
  if (g.konsern.director) addCost(g, "lonn", directorPerDay(g));
  if (!hasResearch(g, "kunnskapsdeling")) return;
  for (const p of g.konsern.plants) if (!underConstruction(p)) awardPoints(g, 1);
}
