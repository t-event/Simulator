/**
 * Konsernet i ekte tid (B-325, B-326) – speiler `supabase/064_konsern_i_ekte_tid.sql`. Datterverkene kjøpes, bygges
 * ut, moderniseres og selges fra konsernkassa på serveren, og serveren holder verkene og køen. Appen viser det serveren
 * sier; denne fila regner det samme, så knappene, rådene, testene og testspilleren ser det samme som serveren.
 * Endres regelen, endres SQL-en og denne fila sammen.
 *
 * - Priser fra konsernkassa: stålverk 20 mill., storverk 80 mill., stålkompleks 250 mill., modernisering 30 % per
 *   trinn, utbygging forskjellen. «Oppkjøpsavdeling» gir −15 % på kjøp og utbygging, «Standardverk» −25 % på
 *   modernisering.
 * - Et prosjekt betales når det bestilles. Inntil tre i køen; ett bygges om gangen, i rekkefølge.
 * - Det siste i køen kan avbestilles før det starter (full refusjon). Salg gir 60 % av pris med trinn, til kassa.
 * - Konsernnivået (titlene) regnes av verkene: stigen under, i rekkefølge. Det går aldri ned, og aldri under titlene
 *   spilleren hadde ved byttet (gulvet).
 * Ingen import av motoren, så fila kan brukes av tester og av testspilleren uten sirkler.
 */
import { defaultRegion, isRegion } from "./regions";
import type { KonsernOrder, PolicyId, RegionId, SisterPlant, SisterProject, SisterType } from "./types";

export const WORLD_KONSERN = {
  price: { stalverk: 5_000_000, storverk: 20_000_000, kompleks: 60_000_000 } as Record<SisterType, number>,
  modShare: 0.3,
  sellShare: 0.6,
  buildHours: { stalverk: 2, storverk: 6, kompleks: 12 } as Record<SisterType, number>,
  modHours: 4,
  upgradeHours: 6,
  queueMax: 3,
  slots: 6,
  slotsBig: 8,
  discountBuy: 0.85,
  discountMod: 0.75,
};

export interface LadderStep {
  title: string;
  count: number;
  types: SisterType[];
  level: number;
}

/** Nivåstigen (B-325): antall verk av typene på minst trinnet. Samme rekkefølge og titler som før (B-150, B-173) */
export const LADDER: LadderStep[] = [
  { title: "Stålmagnat", count: 3, types: ["storverk", "kompleks"], level: 3 },
  { title: "Stålfyrste", count: 6, types: ["storverk", "kompleks"], level: 4 },
  { title: "Stålkonge", count: 2, types: ["kompleks"], level: 3 },
  { title: "Stålkeiser", count: 4, types: ["kompleks"], level: 5 },
  { title: "Stållegende", count: 6, types: ["kompleks"], level: 5 },
  { title: "Stålgigant", count: 8, types: ["kompleks"], level: 5 },
  { title: "Stålkolosse", count: 10, types: ["kompleks"], level: 5 },
  { title: "Stålmyte", count: 12, types: ["kompleks"], level: 6 },
  { title: "Stålikon", count: 14, types: ["kompleks"], level: 6 },
];

/** Navnene på nye verk, i rekkefølge (vanlige ord, ingen ekte steder) */
export const PLANT_NAMES = [
  "Elveverket",
  "Fjordverket",
  "Dalverket",
  "Havneverket",
  "Skogverket",
  "Fjellverket",
  "Nesverket",
  "Sletteverket",
  "Øyverket",
  "Viksverket",
  "Bakkeverket",
  "Strandverket",
];

const HOUR_MS = 3_600_000;

/** Hvor mange verk som oppfyller ett trinn i stigen (verk som bygges, teller ikke) */
export function ladderCount(plants: SisterPlant[], step: LadderStep): number {
  return plants.filter((p) => p.project?.kind !== "bygg" && step.types.includes(p.type) && p.level >= step.level)
    .length;
}

/** Nivået verkene gir: trinnene tas i rekkefølge */
export function ladderLevel(plants: SisterPlant[]): number {
  let n = 0;
  for (const step of LADDER) {
    if (ladderCount(plants, step) < step.count) break;
    n++;
  }
  return n;
}

/** Plasser for datterverk: 6 (8 med «Større konsern»), +2 ved nivå 2, 4 og 6 */
export function slotsAt(level: number, big: boolean): number {
  return (big ? WORLD_KONSERN.slotsBig : WORLD_KONSERN.slots) + 2 * (+(level >= 2) + +(level >= 4) + +(level >= 6));
}

/** Høyeste moderniseringstrinn: 3, 4 ved nivå 1, 5 ved nivå 3, 6 ved nivå 7 */
export function modMaxAt(level: number): number {
  return 3 + +(level >= 1) + +(level >= 3) + +(level >= 7);
}

/** Stålkomplekser fra nivå 2 (Stålfyrste) */
export function kompleksOpenAt(level: number): boolean {
  return level >= 2;
}

/** Ett verk etter et prosjekt */
export function afterProject(p: SisterPlant, kind: SisterProject["kind"]): SisterPlant {
  const out: SisterPlant = { ...p };
  delete out.project;
  if (kind === "modernisering") out.level = p.level + 1;
  if (kind === "utbygging") {
    out.type = "storverk";
    out.level = 0;
  }
  return out;
}

export interface WorldCosts {
  buy: number;
  mod: number;
}
/** Rabattene fra forskningen */
export function discounts(researched: readonly string[]): WorldCosts {
  return {
    buy: researched.includes("oppkjop") ? WORLD_KONSERN.discountBuy : 1,
    mod: researched.includes("standardverk") ? WORLD_KONSERN.discountMod : 1,
  };
}

export function buildCost(type: SisterType, researched: readonly string[]): number {
  return Math.round(WORLD_KONSERN.price[type] * discounts(researched).buy);
}
export function modCost(type: SisterType, researched: readonly string[]): number {
  return Math.round(WORLD_KONSERN.price[type] * WORLD_KONSERN.modShare * discounts(researched).mod);
}
export function upgradeCostWorld(researched: readonly string[]): number {
  return Math.round((WORLD_KONSERN.price.storverk - WORLD_KONSERN.price.stalverk) * discounts(researched).buy);
}
/** Salgssummen: 60 % av det det ville kostet å bygge verket på nytt med trinnene (B-307) */
export function salePrice(p: Pick<SisterPlant, "type" | "level">): number {
  return Math.round(WORLD_KONSERN.price[p.type] * (1 + WORLD_KONSERN.modShare * p.level) * WORLD_KONSERN.sellShare);
}

/** Konsernet slik serveren holder det */
export interface KonsernWorld {
  plants: SisterPlant[];
  orders: KonsernOrder[];
  nextId: number;
  /** Tittelen (historisk): stigen med gulvet fra byttet, går aldri ned */
  level: number;
  floor: number;
  /** Opptjent nivå (B-383): det høyeste verkene har gitt, uten gulvet. Avgjør plasser, trinn og komplekser */
  earned?: number;
  /** Konsernkassa */
  balance: number;
  /** Utbyttepolitikken og forsvarsfondet (B-334), når serveren sender dem */
  policy?: { kind: PolicyId; changedAt: number | null; fund: number };
}

export type OrderRequest =
  | { kind: "bygg"; type: SisterType; region?: RegionId }
  | { kind: "modernisering"; plant: number }
  | { kind: "utbygging"; plant: number }
  | { kind: "bytt"; plant: number };

export type OrderRefusal =
  | "ko_full"
  | "fullt"
  | "niva"
  | "forst_stalverk"
  | "verk"
  | "trinn"
  | "kasse"
  | "type"
  | "sperret"
  | "konsern"
  | "startet"
  | "flyttet"
  | "uke"
  | "nett";

/** Forklaringen på et nei, med vanlige ord */
export const ORDER_REFUSAL_TEXT: Record<OrderRefusal, string> = {
  ko_full: `Køen er full – høyst ${WORLD_KONSERN.queueMax} prosjekter om gangen.`,
  fullt: "Det er ikke plass til flere verk.",
  niva: `Stålkomplekser åpnes når verkene har gitt nivået ${LADDER[1].title} (${LADDER[1].count} storverk eller komplekser på trinn ${LADDER[1].level}).`,
  forst_stalverk: "Kjøp et stålverk først.",
  verk: "Verket kan ikke endres nå – et prosjekt pågår eller står i køen.",
  trinn: "Verket er modernisert så langt det går nå.",
  kasse: "Det er ikke nok i konsernkassa.",
  type: "Ukjent kjøp.",
  sperret: "Kontoen er sperret mens topplista sjekker den.",
  konsern: "Konsernet er ikke åpnet ennå.",
  startet: "Bare det siste i køen kan avbestilles, før det har startet.",
  flyttet: "Hvert verk kan flyttes én gang, og dette er alt flyttet.",
  uke: "Utbyttepolitikken kan endres én gang per uke.",
  nett: "Fikk ikke kontakt med serveren. Prøv igjen om litt.",
};

/** Hvorfor et verk ikke kan flyttes (B-333) */
export const MOVE_REFUSAL = ORDER_REFUSAL_TEXT.flyttet;

/** Verkene slik de blir når alt i køen er ferdig */
export function plannedPlants(w: Pick<KonsernWorld, "plants" | "orders">): SisterPlant[] {
  let plants = w.plants.map((p) => (p.project ? afterProject(p, p.project.kind) : p));
  for (const o of w.orders) {
    if (o.status !== "kø") continue;
    if (o.kind === "bygg")
      plants = [
        ...plants,
        { id: o.plantId, type: o.type ?? "stalverk", name: o.name ?? "", level: 0, boughtDay: 0, downUntilDay: 0 },
      ];
    else plants = plants.map((p) => (p.id === o.plantId ? afterProject(p, o.kind) : p));
  }
  return plants;
}

/** Tittelen: nivået med gulvet (vises, gir titler og låser opp ting hjemme) */
export function worldLevel(w: Pick<KonsernWorld, "level" | "floor">): number {
  return Math.max(w.level, w.floor);
}

/**
 * Opptjent nivå (B-383, som `konsern.earned` på serveren): det høyeste stigen har stått på, uten gulvet. Nye verk,
 * trinn og komplekser følger dette, ikke tittelen – ingenting man har, tas bort.
 */
export function earnedLevel(w: Pick<KonsernWorld, "plants" | "earned">): number {
  return Math.max(w.earned ?? 0, ladderLevel(w.plants));
}

/** Pris og byggetid for en bestilling, eller hvorfor den ikke går (uten å se på kassa) */
export function orderQuote(
  w: KonsernWorld,
  req: OrderRequest,
  researched: readonly string[],
): { cost: number; hours: number; sale: number } | { refusal: OrderRefusal } {
  const lvl = earnedLevel(w);
  const big = researched.includes("storkonsern");
  const pending = w.orders.filter((o) => o.status === "kø" || o.status === "i gang").length;
  if (pending >= WORLD_KONSERN.queueMax) return { refusal: "ko_full" };
  let planned = plannedPlants(w);
  let sale = 0;
  let type: SisterType | null = req.kind === "bygg" ? req.type : null;
  if (req.kind === "bytt") {
    if (!kompleksOpenAt(lvl)) return { refusal: "niva" };
    const p = w.plants.find((x) => x.id === req.plant);
    if (!p || p.project || p.type === "kompleks" || w.orders.some((o) => o.status === "kø" && o.plantId === req.plant))
      return { refusal: "verk" };
    sale = salePrice(p);
    type = "kompleks";
    planned = planned.filter((x) => x.id !== req.plant);
  }
  if (req.kind === "bygg" || req.kind === "bytt") {
    if (!type || !(type in WORLD_KONSERN.price)) return { refusal: "type" };
    // Et bytte legger ikke til et verk, så det sperres ikke av plassene (B-383)
    if (req.kind !== "bytt" && planned.length >= slotsAt(lvl, big)) return { refusal: "fullt" };
    if (type === "kompleks" && !kompleksOpenAt(lvl)) return { refusal: "niva" };
    if (type === "storverk" && planned.length === 0) return { refusal: "forst_stalverk" };
    return { cost: buildCost(type, researched), hours: WORLD_KONSERN.buildHours[type], sale };
  }
  const p = planned.find((x) => x.id === req.plant);
  if (!p) return { refusal: "verk" };
  if (req.kind === "modernisering") {
    if (p.level >= modMaxAt(lvl)) return { refusal: "trinn" };
    return { cost: modCost(p.type, researched), hours: WORLD_KONSERN.modHours, sale: 0 };
  }
  if (p.type !== "stalverk") return { refusal: "verk" };
  return { cost: upgradeCostWorld(researched), hours: WORLD_KONSERN.upgradeHours, sale: 0 };
}

/** Første ledige navn */
function nextName(w: KonsernWorld, planned: SisterPlant[]): string {
  const used = new Set([...w.plants, ...planned].map((p) => p.name));
  for (const o of w.orders) if (o.name) used.add(o.name);
  return PLANT_NAMES.find((n) => !used.has(n)) ?? `Verk nr. ${planned.length + 2}`;
}

/**
 * Bestill (som `konsern_order`): betales med én gang, legges sist i køen. Endrer `w`. `day` er dagen i spillet (bare
 * for «kjøpt dag»).
 */
export function placeOrder(
  w: KonsernWorld,
  req: OrderRequest,
  researched: readonly string[],
  now: number,
  day = 0,
): { ok: true; order: KonsernOrder; sale: number } | { ok: false; reason: OrderRefusal } {
  const q = orderQuote(w, req, researched);
  if ("refusal" in q) return { ok: false, reason: q.refusal };
  if (q.cost > w.balance + q.sale) return { ok: false, reason: "kasse" };
  let planned = plannedPlants(w);
  // Regionen (B-333): valgt eller der spilleren har færrest verk; et kompleks står der verket sto
  const region: RegionId | null =
    req.kind === "bytt"
      ? (w.plants.find((p) => p.id === req.plant)?.region ?? defaultRegion(w.plants, w.orders))
      : req.kind === "bygg"
        ? isRegion(req.region)
          ? req.region
          : defaultRegion(w.plants, w.orders)
        : null;
  if (req.kind === "bytt") {
    w.plants = w.plants.filter((p) => p.id !== req.plant);
    w.balance += q.sale;
    planned = planned.filter((p) => p.id !== req.plant);
  }
  const kind: SisterProject["kind"] = req.kind === "bytt" ? "bygg" : req.kind;
  const building = kind === "bygg";
  const type: SisterType | null = req.kind === "bygg" ? req.type : req.kind === "bytt" ? "kompleks" : null;
  const plantId = building ? w.nextId++ : (req as { plant: number }).plant;
  const last = Math.max(now, ...w.orders.map((o) => o.readyAt));
  const order: KonsernOrder = {
    id: Math.max(0, ...w.orders.map((o) => o.id)) + 1,
    kind,
    plantId,
    type,
    name: building ? nextName(w, planned) : null,
    cost: q.cost,
    startsAt: last,
    readyAt: last + q.hours * HOUR_MS,
    status: "kø",
    boughtDay: day,
    region,
  };
  w.balance -= q.cost;
  w.orders.push(order);
  settleWorld(w, now);
  return { ok: true, order, sale: q.sale };
}

/** Avbestill det siste i køen før det har startet (som `konsern_cancel`) */
export function cancelOrder(w: KonsernWorld, id: number, now: number): { ok: true; refund: number } | { ok: false } {
  settleWorld(w, now);
  const o = w.orders.find((x) => x.id === id);
  const last = w.orders.filter((x) => x.status === "kø").at(-1);
  if (!o || o.status !== "kø" || o.startsAt <= now || last !== o) return { ok: false };
  w.orders = w.orders.filter((x) => x !== o);
  w.balance += o.cost;
  return { ok: true, refund: o.cost };
}

/** Selg et verk uten prosjekt og uten noe i køen (som `konsern_sell`) */
export function sellPlant(w: KonsernWorld, id: number, now: number): { ok: true; sale: number } | { ok: false } {
  settleWorld(w, now);
  const p = w.plants.find((x) => x.id === id);
  if (!p || p.project || w.orders.some((o) => o.status === "kø" && o.plantId === id)) return { ok: false };
  const sale = salePrice(p);
  w.plants = w.plants.filter((x) => x !== p);
  w.balance += sale;
  return { ok: true, sale };
}

/**
 * Flytt et verk til en annen region, én gang per verk (som `konsern_move`). Et verk som står i køen, kan få en ny region
 * fritt til det starter.
 */
export function movePlant(w: KonsernWorld, id: number, region: RegionId, now: number): boolean {
  settleWorld(w, now);
  if (!isRegion(region)) return false;
  const p = w.plants.find((x) => x.id === id);
  if (p) {
    if (p.moved) return false;
    w.plants = w.plants.map((x) => (x === p ? { ...x, region, moved: true } : x));
    return true;
  }
  const o = w.orders.find((x) => x.status === "kø" && x.kind === "bygg" && x.plantId === id);
  if (!o) return false;
  o.region = region;
  return true;
}

export interface SettleEvent {
  kind: "start" | "ferdig";
  order: KonsernOrder | null;
  plant: SisterPlant;
}

/**
 * Start og fullfør det som er kommet til i ekte tid, og løft nivået (som `konsern_settle`). Ferdige ordre fjernes fra
 * køen. Gir hva som skjedde, i rekkefølge, så appen kan skrive det i loggen.
 */
export function settleWorld(w: KonsernWorld, now: number): SettleEvent[] {
  const events: SettleEvent[] = [];
  const finish = (id: number, order: KonsernOrder | null) => {
    w.plants = w.plants.map((p) => {
      if (p.id !== id || !p.project) return p;
      const after = afterProject(p, p.project.kind);
      events.push({ kind: "ferdig", order, plant: after });
      return after;
    });
  };
  for (const o of [...w.orders].sort((a, b) => a.startsAt - b.startsAt || a.id - b.id)) {
    if (o.startsAt > now) break;
    if (o.status === "kø") {
      const project: SisterProject = { kind: o.kind, startedAt: o.startsAt, readyAt: o.readyAt };
      if (o.kind === "bygg") {
        const plant: SisterPlant = {
          id: o.plantId,
          type: o.type ?? "stalverk",
          name: o.name ?? "",
          level: 0,
          boughtDay: o.boughtDay ?? 0,
          downUntilDay: 0,
          ...(o.region ? { region: o.region } : {}),
          project,
        };
        w.plants = [...w.plants, plant];
        events.push({ kind: "start", order: o, plant });
      } else
        w.plants = w.plants.map((p) => {
          if (p.id !== o.plantId) return p;
          const next = { ...p, project };
          events.push({ kind: "start", order: o, plant: next });
          return next;
        });
      o.status = "i gang";
    }
    if (o.readyAt <= now) {
      finish(o.plantId, o);
      w.orders = w.orders.filter((x) => x !== o);
    }
  }
  // Prosjekter uten ordre (fra før byttet) som er ferdige
  for (const p of w.plants) if (p.project && p.project.readyAt <= now) finish(p.id, null);
  w.level = Math.max(w.level, w.floor, ladderLevel(w.plants));
  w.earned = earnedLevel(w);
  return events;
}

/** Når neste i køen er ferdig, eller null */
export function queueEnd(w: Pick<KonsernWorld, "orders">): number | null {
  return w.orders.length ? Math.max(...w.orders.map((o) => o.readyAt)) : null;
}
