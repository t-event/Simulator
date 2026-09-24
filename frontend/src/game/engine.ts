/**
 * Spillmotoren: tid, produksjon, marked, kontrakter, folk og hendelser.
 *
 * advance() flytter spillet fram i steg på maks STEP_MIN spillminutter.
 * Produksjonen følger stålet gjennom kjeden skraplager → ovn → øse →
 * støping → (valseverk) → lager → kunde, og hver del kan bli flaskehals.
 */
import {
  BANKRUPTCY_DAYS,
  CUSTOMERS,
  FIRST_NAMES,
  GRADES,
  LAST_NAMES,
  LOAN_INTEREST_PER_DAY,
  MIN_PER_DAY,
  PRODUCTS,
  ROLES,
  SCRAP_IDS,
  SCRAP_TYPES,
  SPOT_DISCOUNT,
  STAGES,
  START_CASH,
  START_REPUTATION,
  WIN_CASH,
} from "./data";
import { knowledgeCard } from "./knowledge";
import { hasResearch } from "./research";
import { maybeCreateDecision } from "./decisions";
import {
  castingType,
  computePlantStats,
  day,
  energyPrice,
  gradeFailures,
  has,
  isOpen,
  productPrice,
  rollingActive,
  rollingTph,
  ROLLING_YIELD,
  satisfies,
  satisfiedGrades,
  type PlantStats,
} from "./plant";
import { chance, noise, pick, rand, randInt, uniform } from "./random";
import type {
  Analysis,
  Contract,
  CostCategory,
  DayFinance,
  FurnaceUnit,
  GameState,
  GradeId,
  IncomeCategory,
  LiquidBatch,
  Lot,
  ManualRequest,
  ProductId,
  RoleId,
  ScrapId,
  ScrapStock,
  Worker,
} from "./types";

export const SAVE_VERSION = 1;
const STEP_MIN = 10;
const LOG_MAX = 150;
const HISTORY_MAX = 120;

/** Karbonet ovnen sikter på for hver kvalitet */
export const TARGET_C: Record<GradeId, number> = {
  enkel: 0.2,
  standard: 0.2,
  armering: 0.22,
  lavkarbon: 0.05,
  hoykarbon: 0.7,
  premium: 0.25,
};

// ------------------------------------------------------------------ //
// Oppstart
// ------------------------------------------------------------------ //
function emptyStock(): ScrapStock {
  return { t: 0, p: 0, tramp: 0, c: 0, dirt: 0, radioactive: false };
}

export function newFurnaceUnit(): FurnaceUnit {
  return {
    wear: 0,
    heat: null,
    holding: null,
    downUntilMin: 0,
    downReason: null,
    heatsOnLining: 0,
    waitReason: null,
  };
}

function newDay(dayNumber: number, cash: number): DayFinance {
  return { day: dayNumber, income: {}, costs: {}, producedT: 0, heats: 0, cashEnd: cash };
}

export function newGame(seed = Date.now()): GameState {
  const scrap = Object.fromEntries(SCRAP_IDS.map((id) => [id, emptyStock()])) as Record<ScrapId, ScrapStock>;
  const g: GameState = {
    version: SAVE_VERSION,
    rng: seed >>> 0,
    // Første dag starter kl. 06 når du låser opp garasjen
    minute: 6 * 60,
    speed: 1,
    cash: START_CASH,
    loan: 0,
    reputation: START_REPUTATION,
    stage: 0,
    owned: [],
    furnaceType: "digel",
    furnaceCount: 1,
    castingType: "sandformer",
    furnaces: [newFurnaceUnit()],
    castQueue: [],
    castProgressT: 0,
    castDownUntilMin: 0,
    castWait: null,
    rollProgressT: 0,
    scrap,
    recipe: { blandet: 30, tungt: 60, shredder: 0, spon: 0, rent: 0, rajern: 0, retur: 10 },
    targetGrade: "standard",
    lots: [],
    nextLotId: 1,
    contracts: [],
    nextContractId: 1,
    complaints: [],
    workers: [],
    candidates: [],
    nextWorkerId: 1,
    ownerSkill: 2,
    market: {
      steelFactor: 1,
      scrapFactor: Object.fromEntries(SCRAP_IDS.map((id) => [id, 1])) as Record<ScrapId, number>,
      powerFactor: 1,
      powerSpikeDays: 0,
      spotSoldToday: {},
    },
    settings: {
      autoReline: true,
      relineAt: 0.9,
      maxPowerPrice: null,
      autoBuy: false,
      autoBuyDays: 1.5,
      autoSpot: false,
      rolling: true,
      manualNext: false,
    },
    log: [],
    nextLogId: 1,
    today: newDay(1, START_CASH),
    history: [],
    totals: { producedT: 0, heats: 0, manualHeats: 0, contractsDone: 0, complaints: 0 },
    negativeDays: 0,
    gameOver: false,
    won: false,
    pendingManual: null,
    researchPoints: 0,
    researched: [],
    pendingDecision: null,
    celebrate: null,
    knowledge: [],
    unreadKnowledge: 0,
  };
  // Naboen har ryddet låven og gir deg et lass med skrap å starte på
  addScrap(g, "blandet", 0.35, SCRAP_TYPES.blandet);
  addScrap(g, "tungt", 0.65, SCRAP_TYPES.tungt);
  unlock(g, "start");
  unlock(g, "skrap");
  log(g, "Du låser opp garasjen. Digelen er fyrt opp, og naboen har gitt deg ett tonn skrap.", "info");
  generateOffers(g, computePlantStats(g), 2);
  return g;
}

// ------------------------------------------------------------------ //
// Hjelpere
// ------------------------------------------------------------------ //
export function log(g: GameState, text: string, kind: "info" | "good" | "bad" | "event" = "info"): void {
  g.log.push({ id: g.nextLogId++, min: g.minute, text, kind });
  if (g.log.length > LOG_MAX) g.log.splice(0, g.log.length - LOG_MAX);
}

export function unlock(g: GameState, id: string): void {
  if (g.knowledge.includes(id) || !knowledgeCard(id)) return;
  g.knowledge.push(id);
  g.unreadKnowledge += 1;
}

export function addCost(g: GameState, category: CostCategory, amount: number): void {
  if (amount <= 0) return;
  g.cash -= amount;
  g.today.costs[category] = (g.today.costs[category] ?? 0) + amount;
}

export function addIncome(g: GameState, category: IncomeCategory, amount: number): void {
  if (amount <= 0) return;
  g.cash += amount;
  g.today.income[category] = (g.today.income[category] ?? 0) + amount;
}

/** Fagpoeng til forskning. */
export function awardPoints(g: GameState, points: number): void {
  if (points > 0) g.researchPoints += points;
}

export function adjustReputation(g: GameState, delta: number): void {
  g.reputation = Math.max(0, Math.min(100, g.reputation + delta));
}

function addScrap(
  g: GameState,
  id: ScrapId,
  t: number,
  quality: { p: number; tramp: number; c: number; dirt: number },
  radioactive = false,
): void {
  const s = g.scrap[id];
  const total = s.t + t;
  if (total <= 0) return;
  s.p = (s.p * s.t + quality.p * t) / total;
  s.tramp = (s.tramp * s.t + quality.tramp * t) / total;
  s.c = (s.c * s.t + quality.c * t) / total;
  s.dirt = (s.dirt * s.t + quality.dirt * t) / total;
  s.t = total;
  s.radioactive = s.radioactive || radioactive;
}

/** Legger et skrapparti med gitt innhold på lageret (brukes av hendelseskort). */
export function addScrapParti(
  g: GameState,
  id: ScrapId,
  t: number,
  q: { p: number; tramp: number; c: number; dirt: number; radioactive: boolean },
): void {
  addScrap(g, id, t, q, q.radioactive);
}

export function scrapPrice(g: GameState, id: ScrapId): number {
  return SCRAP_TYPES[id].price * g.market.scrapFactor[id];
}

/** Kassekreditten følger nivået og omsetningen verket kan ha (to døgns produksjon). */
export function creditLimit(g: GameState, stats = computePlantStats(g)): number {
  const turnover = stats.dailyProductT * PRODUCTS[stats.mainProduct].price;
  return Math.round(Math.max(25_000 * 5 ** g.stage, turnover * 2));
}

export function maxLoan(g: GameState): number {
  const base = [0, 60_000, 500_000, 5_000_000, 18_000_000][g.stage];
  return Math.round(base * (0.5 + g.reputation / 100));
}

// ------------------------------------------------------------------ //
// Skrapinnkjøp
// ------------------------------------------------------------------ //
export interface PurchaseResult {
  ok: boolean;
  message: string;
}

/** Kjøper skrap. Kan gi dårlige partier og, uten portal, skjulte strålekilder. */
export function buyScrap(g: GameState, id: ScrapId, t: number, stats = computePlantStats(g)): PurchaseResult {
  const type = SCRAP_TYPES[id];
  if (!type.buyable) return { ok: false, message: `${type.name} kan ikke kjøpes.` };
  const free = stats.yardT - stats.yardUsed;
  const amount = Math.min(t, free);
  if (amount <= 0.001) return { ok: false, message: "Skraplageret er fullt." };
  const cost = amount * scrapPrice(g, id);
  // Skrap kan kjøpes på kassekreditten, ellers stopper verket for godt når kassa er tom
  if (g.cash - cost < -creditLimit(g))
    return { ok: false, message: "Du har ikke råd, og kassekreditten er brukt opp." };
  addCost(g, "skrap", cost);

  // Et dårlig parti: mer fosfor og kobber enn normalt, uten at det synes på skrapet
  const quality = { p: type.p, tramp: type.tramp, c: type.c, dirt: type.dirt };
  if ((id === "blandet" || id === "spon" || id === "shredder") && chance(g, 0.05)) {
    quality.p *= uniform(g, 1.6, 2.4);
    quality.tramp *= uniform(g, 1.2, 1.6);
  }

  const radioChance = 1 - (1 - type.radioPerT) ** amount;
  let radioactive = false;
  if (radioChance > 0 && chance(g, radioChance)) {
    if (has(g, "portal")) {
      const fee = 15_000;
      addCost(g, "annet", fee);
      addIncome(g, "annet", cost);
      log(
        g,
        `Strålingsportalen slo ut på et lass ${type.name.toLowerCase()}. Lasset er sendt i retur (gebyr ${fmtKr(fee)}).`,
        "event",
      );
      unlock(g, "radioaktivitet");
      return { ok: true, message: "Lasset ble stoppet i strålingsportalen og sendt i retur." };
    }
    radioactive = true;
  }
  addScrap(g, id, amount, quality, radioactive);
  const note = amount < t - 0.001 ? ` (bare plass til ${fmtT(amount)})` : "";
  return { ok: true, message: `Kjøpte ${fmtT(amount)} ${type.name.toLowerCase()}${note}.` };
}

interface Mix {
  analysis: Analysis;
  expected: Analysis;
  dirt: number;
  energy: number;
  radioactive: boolean;
}

/** Tar skrap fra lageret etter resepten. Mangler en type, fylles det opp med resten. */
export function takeScrap(g: GameState, sizeT: number, dryRun = false): Mix | null {
  const recipeIds = SCRAP_IDS.filter((id) => g.recipe[id] > 0);
  const totalWeight = recipeIds.reduce((a, id) => a + g.recipe[id], 0);
  const amounts = Object.fromEntries(SCRAP_IDS.map((id) => [id, 0])) as Record<ScrapId, number>;
  if (totalWeight > 0) {
    for (const id of recipeIds) amounts[id] = Math.min(g.scrap[id].t, (sizeT * g.recipe[id]) / totalWeight);
  }
  let short = sizeT - Object.values(amounts).reduce((a, b) => a + b, 0);
  // Fyll opp med andre typer i resepten, deretter hva som helst som ligger på lageret
  for (const pool of [recipeIds, SCRAP_IDS]) {
    for (let pass = 0; pass < 4 && short > 1e-9; pass++) {
      const spare = pool.map((id) => ({ id, spare: g.scrap[id].t - amounts[id] })).filter((x) => x.spare > 1e-9);
      const spareTotal = spare.reduce((a, x) => a + x.spare, 0);
      if (spareTotal <= 1e-9) break;
      for (const x of spare) {
        const take = Math.min(x.spare, (short * x.spare) / spareTotal);
        amounts[x.id] += take;
      }
      short = sizeT - Object.values(amounts).reduce((a, b) => a + b, 0);
    }
  }
  if (short > 1e-6) return null;

  const sorting = has(g, "sortering");
  const mix: Mix = {
    analysis: { c: 0, p: 0, tramp: 0 },
    expected: { c: 0, p: 0, tramp: 0 },
    dirt: 0,
    energy: 0,
    radioactive: false,
  };
  for (const id of SCRAP_IDS) {
    const t = amounts[id];
    if (t <= 0) continue;
    const w = t / sizeT;
    const stock = g.scrap[id];
    const type = SCRAP_TYPES[id];
    const sorted = sorting && (id === "blandet" || id === "shredder" || id === "spon");
    const trampF = sorted ? 0.85 : 1;
    const dirtF = sorted ? 0.5 : 1;
    mix.analysis.c += w * stock.c;
    mix.analysis.p += w * stock.p;
    mix.analysis.tramp += w * stock.tramp * trampF;
    // Returskrapet kjenner du analysen på; resten anslår du ut fra skraptypen
    const known = id === "retur" ? stock : type;
    mix.expected.c += w * known.c;
    mix.expected.p += w * known.p;
    mix.expected.tramp += w * known.tramp * trampF;
    mix.dirt += w * stock.dirt * dirtF;
    mix.energy += w * type.energy;
    if (stock.radioactive) mix.radioactive = true;
  }
  mix.energy *= 1 + mix.dirt;
  if (!dryRun) {
    for (const id of SCRAP_IDS) {
      const stock = g.scrap[id];
      stock.t -= amounts[id];
      if (amounts[id] > 0 && stock.radioactive) stock.radioactive = false;
      if (stock.t < 1e-9) g.scrap[id] = emptyStock();
    }
  }
  return mix;
}

// ------------------------------------------------------------------ //
// Ovnen
// ------------------------------------------------------------------ //
/** Karbon ut av ovnen: kan alltid legges til, men bare fjernes med oksygen. */
function finalCarbon(g: GameState, mixC: number, grade: GradeId, stats: PlantStats, exact: boolean): number {
  const target = TARGET_C[grade];
  if (stats.furnace.decarb) {
    if (exact) return target;
    const sd = has(g, "oseovn") ? 0.012 : 0.045;
    return Math.max(0.02, target + noise(g, sd));
  }
  const base = mixC * 0.95;
  if (base < target) return exact ? target : Math.max(0.01, target + noise(g, 0.025));
  return exact ? base : Math.max(0.01, base + noise(g, 0.02));
}

export interface RecipeEstimate {
  /** Anslått analyse ut av ovnen med denne resepten og kvaliteten */
  analysis: Analysis;
  grades: GradeId[];
  /** Skrapkostnad per tonn skrap, etter dagens priser */
  scrapCostPerT: number;
  metallicYield: number;
  energyFactor: number;
}

/** Hva resepten gir i den ovnen du har, ut fra oppgitt innhold i skraptypene. */
export function recipeEstimate(
  g: GameState,
  grade: GradeId = g.targetGrade,
  stats = computePlantStats(g),
): RecipeEstimate {
  const total = SCRAP_IDS.reduce((a, id) => a + g.recipe[id], 0);
  const sorting = has(g, "sortering");
  const mix = { c: 0, p: 0, tramp: 0 };
  let dirt = 0;
  let energy = 0;
  let cost = 0;
  for (const id of SCRAP_IDS) {
    const w = total > 0 ? g.recipe[id] / total : 0;
    if (w <= 0) continue;
    const type = SCRAP_TYPES[id];
    const sorted = sorting && (id === "blandet" || id === "shredder" || id === "spon");
    const known = id === "retur" && g.scrap.retur.t > 0 ? g.scrap.retur : type;
    mix.c += w * known.c;
    mix.p += w * known.p;
    mix.tramp += w * known.tramp * (sorted ? 0.85 : 1);
    dirt += w * type.dirt * (sorted ? 0.5 : 1);
    energy += w * type.energy;
    cost += w * scrapPrice(g, id);
  }
  const analysis: Analysis = {
    c: finalCarbon(g, mix.c, grade, stats, true),
    p: mix.p * (1 - stats.dephos),
    tramp: mix.tramp,
  };
  return {
    analysis,
    grades: satisfiedGrades(analysis),
    scrapCostPerT: cost,
    metallicYield: Math.max(0.6, 1 - dirt - stats.furnace.oxidationLoss),
    energyFactor: energy * (1 + dirt),
  };
}

function wearFactor(g: GameState): number {
  return hasResearch(g, "ildfast") ? 0.85 : 1;
}

function tempOffRisk(g: GameState, stats: PlantStats): number {
  let risk = stats.furnace.id === "digel" ? 0.14 : stats.furnace.arc ? 0.12 : 0.08;
  if (stats.furnace.arc && has(g, "oseovn")) risk = 0.03;
  return risk * (1.3 - 0.1 * stats.crewSkill);
}

function startHeat(g: GameState, index: number, stats: PlantStats): boolean {
  const f = g.furnaces[index];
  const size = stats.sizeT;
  const mix = takeScrap(g, size);
  if (!mix) return false;
  const furnace = stats.furnace;
  const metallicYield = Math.max(0.6, 1 - mix.dirt - furnace.oxidationLoss);

  if (furnace.arc && g.settings.manualNext) {
    // Spilleren tar styringen: spillet pauses og kontrollrommet åpnes
    g.settings.manualNext = false;
    g.pendingManual = {
      furnace: index,
      sizeT: size,
      grade: g.targetGrade,
      mix: mix.analysis,
      expectedMix: mix.expected,
      energyFactor: mix.energy,
      metallicYield,
      radioactive: mix.radioactive,
      resumeSpeed: g.speed > 0 ? g.speed : 1,
    };
    g.speed = 0;
    f.waitReason = "Venter på deg i kontrollrommet";
    return true;
  }

  const dephos = furnace.dephos * uniform(g, 0.85, 1.1);
  const analysis: Analysis = {
    c: finalCarbon(g, mix.analysis.c, g.targetGrade, stats, false),
    p: Math.max(0.003, mix.analysis.p * (1 - dephos) * (1 + noise(g, 0.08))),
    tramp: Math.max(0.005, mix.analysis.tramp * (1 + noise(g, 0.06))),
  };
  const expected: Analysis = {
    c: finalCarbon(g, mix.expected.c, g.targetGrade, stats, true),
    p: mix.expected.p * (1 - furnace.dephos),
    tramp: mix.expected.tramp,
  };
  const tempOff = chance(g, tempOffRisk(g, stats));
  const kwh = stats.kwhPerT * mix.energy * size * (tempOff ? 1.04 : 1);
  addCost(g, "energi", kwh * energyPrice(g));
  // Karburisering koster litt ekstra når karbonet må opp
  const carburize = !furnace.decarb && expected.c > mix.expected.c * 0.95 ? (expected.c - mix.expected.c) * 10 * 25 : 0;
  addCost(g, "forbruk", (furnace.consumablesPerT + carburize + (has(g, "oseovn") ? 60 : 0)) * size);

  let duration = stats.cycleMin * mix.energy * uniform(g, 0.95, 1.08);
  duration += heatEvents(g, index, stats);
  f.wear += furnace.wearPerHeat * (tempOff ? 1.3 : 1) * uniform(g, 0.9, 1.1) * wearFactor(g);
  f.heat = {
    startMin: g.minute,
    endMin: g.minute + duration,
    sizeT: size,
    liquidT: size * metallicYield,
    grade: g.targetGrade,
    analysis,
    expected,
    tempOff,
    manual: false,
    radioactive: mix.radioactive,
    energyKwh: kwh,
  };
  f.waitReason = null;
  return true;
}

/** Hendelser i løpet av en charge. Returnerer ekstra minutter chargen tar. */
function heatEvents(g: GameState, index: number, stats: PlantStats): number {
  const f = g.furnaces[index];
  const m = stats.maintFactor;
  const furnace = stats.furnace;
  let extra = 0;
  if (furnace.arc) {
    if (chance(g, 0.018 * m)) {
      extra += 25;
      addCost(g, "vedlikehold", 15_000);
      if (chance(g, 0.3)) {
        const hours = 3 * stats.repairFactor;
        f.downUntilMin = Math.max(f.downUntilMin, g.minute + stats.cycleMin + hours * 60);
        f.downReason = "Vannlekkasje etter overslag";
        addCost(g, "vedlikehold", 60_000);
        log(
          g,
          `Overslag i ovn ${index + 1} traff et vannkjølt panel. Ovnen stoppes for reparasjon (${hours.toFixed(1)} t).`,
          "bad",
        );
      } else {
        log(g, `Overslag i ovn ${index + 1}. Støv i hvelvet må suges bort.`, "event");
      }
    }
    if (chance(g, 0.014 * m)) {
      extra += 35;
      addCost(g, "vedlikehold", 35_000);
      log(g, `Elektrodebrudd i ovn ${index + 1}. Elektroden skjøtes, og chargen forsinkes.`, "event");
    }
  } else if (furnace.id !== "digel" && chance(g, 0.004 * m)) {
    const hours = 8 * stats.repairFactor;
    f.downUntilMin = Math.max(f.downUntilMin, g.minute + stats.cycleMin + hours * 60);
    f.downReason = "Lekkasje i spolen";
    addCost(g, "vedlikehold", 8_000 * furnace.sizeT + 10_000);
    log(g, `Vannlekkasje i spolen på ovn ${index + 1}. Ovnen tømmes og repareres (${hours.toFixed(0)} t).`, "bad");
  }
  return extra;
}

function finishHeat(g: GameState, index: number, stats: PlantStats): void {
  const f = g.furnaces[index];
  const heat = f.heat;
  if (!heat) return;
  f.heat = null;
  f.heatsOnLining += 1;
  g.totals.heats += 1;
  g.today.heats += 1;
  if (heat.manual) g.totals.manualHeats += 1;

  if (heat.radioactive) {
    const cleanup = 50_000 * (1 + g.stage) ** 2;
    addCost(g, "annet", cleanup);
    adjustReputation(g, -12);
    f.downUntilMin = g.minute + 2 * MIN_PER_DAY;
    f.downReason = "Opprydding etter radioaktiv kilde";
    g.castDownUntilMin = Math.max(g.castDownUntilMin, g.minute + MIN_PER_DAY);
    awardPoints(g, 3);
    log(
      g,
      `En radioaktiv kilde ble smeltet i ovn ${index + 1}! Stålet og støvet er forurenset og må destrueres. Opprydding ${fmtKr(cleanup)}, anlegget står i to døgn.`,
      "bad",
    );
    unlock(g, "radioaktivitet");
    return;
  }

  const breakthrough = f.wear >= 1 || (f.wear > 0.9 && chance(g, (f.wear - 0.9) * 2.5));
  if (breakthrough) {
    const cost = stats.furnace.relineCost * 3;
    const hours = stats.furnace.relineHours * 3 * stats.repairFactor;
    addCost(g, "vedlikehold", cost);
    adjustReputation(g, -3);
    f.wear = 0;
    f.heatsOnLining = 0;
    f.downUntilMin = g.minute + hours * 60;
    f.downReason = "Reparasjon etter gjennombrenning";
    // Litt av stålet berges som skrap
    addScrap(
      g,
      "retur",
      heat.liquidT * 0.5,
      heat.analysis.c > 0 ? { ...heat.analysis, dirt: 0.05 } : SCRAP_TYPES.retur,
    );
    awardPoints(g, 3);
    log(
      g,
      `Gjennombrenning i ovn ${index + 1}! Flytende stål gikk gjennom foringen. Reparasjon ${fmtKr(cost)}, ${hours.toFixed(0)} timer.`,
      "bad",
    );
    unlock(g, "ildfast");
    return;
  }

  // Mange charger i et stort verk lærer deg mindre hver for seg
  awardPoints(g, g.stage <= 1 ? 0.5 : g.stage === 2 ? 0.3 : 0.2);
  f.holding = {
    t: heat.liquidT,
    grade: heat.grade,
    analysis: heat.analysis,
    expected: heat.expected,
    tempOff: heat.tempOff,
    manual: heat.manual,
  };
}

export function startReline(g: GameState, index: number, stats = computePlantStats(g)): PurchaseResult {
  const f = g.furnaces[index];
  if (!f) return { ok: false, message: "Ukjent ovn." };
  if (f.heat || f.holding) return { ok: false, message: "Ovnen må være tom før foringen kan byttes." };
  if (g.minute < f.downUntilMin) return { ok: false, message: "Ovnen står allerede." };
  const cost = stats.furnace.relineCost;
  // Omforing kan tas på kassekreditten: en ovn som står, tjener ingen penger
  if (g.cash - cost < -creditLimit(g)) return { ok: false, message: "Du har ikke råd til ny foring." };
  addCost(g, "vedlikehold", cost);
  const hours = stats.furnace.relineHours * stats.repairFactor;
  f.wear = 0;
  f.heatsOnLining = 0;
  f.downUntilMin = g.minute + hours * 60;
  f.downReason = "Ny foring";
  log(g, `Ovn ${index + 1} fores om (${fmtKr(cost)}, ${hours.toFixed(0)} timer).`, "info");
  unlock(g, "ildfast");
  return { ok: true, message: "Omforing startet." };
}

function maxLadlesWaiting(g: GameState): number {
  return 1 + (has(g, "oseovn") ? 1 : 0) + (g.furnaceCount > 1 ? 1 : 0);
}

function updateFurnaces(g: GameState, stats: PlantStats): void {
  const open = isOpen(g, stats.hours);
  for (let i = 0; i < g.furnaces.length; i++) {
    const f = g.furnaces[i];
    if (f.heat && g.minute >= f.heat.endMin) finishHeat(g, i, stats);
    if (f.holding && g.castQueue.length < maxLadlesWaiting(g)) {
      g.castQueue.push(f.holding);
      f.holding = null;
    }
    if (f.heat) continue;
    if (f.holding) {
      f.waitReason = "Venter på støping";
      continue;
    }
    if (g.minute < f.downUntilMin) {
      f.waitReason = f.downReason;
      continue;
    }
    if (f.downReason) {
      log(g, `Ovn ${i + 1} er i drift igjen etter: ${f.downReason.toLowerCase()}.`, "info");
      f.downReason = null;
    }
    if (g.pendingManual?.furnace === i) continue;
    if (g.settings.autoReline && f.wear >= g.settings.relineAt) {
      if (startReline(g, i, stats).ok) continue;
      f.waitReason = "Foringen er slitt – mangler penger til omforing";
      continue;
    }
    if (stats.shifts === 0) {
      f.waitReason = "Mangler folk";
      continue;
    }
    if (!open) {
      f.waitReason = "Utenfor arbeidstid";
      continue;
    }
    if (
      g.settings.maxPowerPrice !== null &&
      stats.furnace.fuel === "strøm" &&
      energyPrice(g) > g.settings.maxPowerPrice
    ) {
      f.waitReason = "Strømprisen er over grensen";
      continue;
    }
    if (g.pendingManual) {
      f.waitReason = "Venter mens du er i kontrollrommet";
      continue;
    }
    if (!startHeat(g, i, stats)) f.waitReason = "Tomt for skrap";
  }
}

// ------------------------------------------------------------------ //
// Støping og valsing
// ------------------------------------------------------------------ //
function knownAnalysis(batch: LiquidBatch, stats: PlantStats): Pick<Lot, "known" | "measured"> {
  if (stats.lab === 2) {
    return { known: { ...batch.analysis }, measured: { c: true, p: true, tramp: true } };
  }
  if (stats.lab === 1) {
    return {
      known: { c: batch.expected.c, p: batch.expected.p, tramp: batch.analysis.tramp },
      measured: { c: false, p: false, tramp: true },
    };
  }
  return { known: { ...batch.expected }, measured: { c: false, p: false, tramp: false } };
}

function lotKey(l: Pick<Lot, "product" | "second" | "analysis" | "known" | "measured">): string {
  const trueSet = satisfiedGrades(l.analysis).join(",");
  const knownSet = satisfiedGrades(l.known).join(",");
  const m = `${l.measured.c ? 1 : 0}${l.measured.p ? 1 : 0}${l.measured.tramp ? 1 : 0}`;
  return `${l.product}|${l.second ? 1 : 0}|${trueSet}|${knownSet}|${m}`;
}

/** Legger ferdigvare på lager. Er forrige parti likt, slås de sammen. */
export function addLot(g: GameState, lot: Omit<Lot, "id">): void {
  const last = g.lots.length ? g.lots[g.lots.length - 1] : null;
  if (last && lotKey(last) === lotKey(lot) && last.madeDay === lot.madeDay) {
    const total = last.t + lot.t;
    const mixA = (a: Analysis, b: Analysis): Analysis => ({
      c: (a.c * last.t + b.c * lot.t) / total,
      p: (a.p * last.t + b.p * lot.t) / total,
      tramp: (a.tramp * last.t + b.tramp * lot.t) / total,
    });
    last.analysis = mixA(last.analysis, lot.analysis);
    last.known = mixA(last.known, lot.known);
    last.t = total;
    return;
  }
  g.lots.push({ ...lot, id: g.nextLotId++ });
}

function addReturnScrap(g: GameState, t: number, analysis: Analysis, stats: PlantStats): void {
  const free = Math.max(0, stats.yardT - stats.yardUsed);
  const amount = Math.min(free, t);
  if (amount > 0) addScrap(g, "retur", amount, { ...analysis, dirt: 0.01 });
}

function castBatch(g: GameState, batch: LiquidBatch, stats: PlantStats): void {
  const casting = castingType(g);
  let t = batch.t;
  if (casting.continuous && chance(g, 0.01 * stats.maintFactor * (batch.tempOff ? 2.5 : 1))) {
    const hours = 4 * stats.repairFactor;
    g.castDownUntilMin = g.minute + hours * 60;
    addCost(g, "vedlikehold", 60_000);
    addReturnScrap(g, t * 0.3, batch.analysis, stats);
    t *= 0.7;
    log(g, `Strenggjennombrudd! Skallet revnet under kokillen. Støpemaskinen står i ${hours.toFixed(1)} timer.`, "bad");
    unlock(g, "streng");
  }
  const productT = t * casting.yield;
  addReturnScrap(g, t - productT, batch.analysis, stats);
  const defectRisk = casting.defectRisk * (batch.tempOff ? 3 : 1) * (1.3 - 0.1 * stats.crewSkill);
  const second = chance(g, Math.min(0.9, defectRisk));
  if (second && batch.tempOff) unlock(g, "stoping");
  addLot(g, {
    product: casting.product,
    t: productT,
    analysis: batch.analysis,
    ...knownAnalysis(batch, stats),
    second,
    madeDay: day(g),
  });
  g.today.producedT += productT;
  g.totals.producedT += productT;
}

function updateCasting(g: GameState, stats: PlantStats, dt: number): void {
  g.castWait = null;
  if (!g.castQueue.length) return;
  if (g.minute < g.castDownUntilMin) {
    g.castWait = "Støpemaskinen står";
    return;
  }
  if (stats.storeUsed >= stats.storeT) {
    if (g.settings.autoSpot) sellExcess(g, stats, 0.8);
    if (lotsTonnage(g) >= stats.storeT) {
      g.castWait = "Ferdigvarelageret er fullt";
      return;
    }
  }
  g.castProgressT += stats.castTph * (dt / 60);
  while (g.castQueue.length && g.castProgressT >= g.castQueue[0].t) {
    const batch = g.castQueue.shift()!;
    g.castProgressT -= batch.t;
    castBatch(g, batch, stats);
  }
  if (!g.castQueue.length) g.castProgressT = 0;
}

function lotsTonnage(g: GameState): number {
  return g.lots.reduce((a, l) => a + l.t, 0);
}

function updateRolling(g: GameState, stats: PlantStats, dt: number): void {
  if (!rollingActive(g) || !isOpen(g, stats.hours) || stats.shifts === 0) return;
  let capacity = rollingTph(g) * (dt / 60);
  // Emner som aktive emnekontrakter venter på, blir liggende
  const reserved = g.contracts
    .filter((c) => c.status === "aktiv" && c.product === "emne")
    .map((c) => ({ grade: c.grade, left: c.tonnes - c.delivered }));
  for (const lot of g.lots) {
    if (capacity <= 1e-9) break;
    if (lot.product !== "emne" || lot.second) continue;
    let free = lot.t;
    for (const r of reserved) {
      if (r.left <= 0 || !satisfies(lot.known, r.grade)) continue;
      const hold = Math.min(free, r.left);
      r.left -= hold;
      free -= hold;
    }
    const take = Math.min(free, capacity);
    if (take <= 1e-9) continue;
    lot.t -= take;
    capacity -= take;
    const outT = take * ROLLING_YIELD;
    addReturnScrap(g, take - outT, lot.analysis, stats);
    g.rollProgressT += outT;
    addLot(g, {
      product: "armering",
      t: outT,
      analysis: { ...lot.analysis },
      known: { ...lot.known },
      measured: { ...lot.measured },
      second: false,
      madeDay: day(g),
    });
  }
  g.lots = g.lots.filter((l) => l.t > 1e-6);
}

// ------------------------------------------------------------------ //
// Salg
// ------------------------------------------------------------------ //
export function spotQuota(g: GameState, product: ProductId): number {
  return PRODUCTS[product].spotPerDay * (1 + g.reputation / 50);
}

/** Spotpris per tonn akkurat nå. Prisen faller jo mer du selger samme dag. */
export function spotPrice(g: GameState, product: ProductId, second: boolean): number {
  const sold = g.market.spotSoldToday[product] ?? 0;
  const saturation = Math.max(0.45, 1 - 0.5 * (sold / spotQuota(g, product)));
  return productPrice(g, product, null) * SPOT_DISCOUNT * saturation * (second ? 0.6 : 1);
}

export function sellLot(g: GameState, lotId: number, t?: number): PurchaseResult {
  const lot = g.lots.find((l) => l.id === lotId);
  if (!lot) return { ok: false, message: "Partiet finnes ikke." };
  let remaining = Math.min(t ?? lot.t, lot.t);
  let income = 0;
  const sold = remaining;
  // Selg i biter så prisfallet regnes riktig for store partier
  const chunk = Math.max(0.05, spotQuota(g, lot.product) / 20);
  while (remaining > 1e-9) {
    const part = Math.min(chunk, remaining);
    income += part * spotPrice(g, lot.product, lot.second);
    g.market.spotSoldToday[lot.product] = (g.market.spotSoldToday[lot.product] ?? 0) + part;
    remaining -= part;
  }
  lot.t -= sold;
  g.lots = g.lots.filter((l) => l.t > 1e-6);
  addIncome(g, "spot", income);
  return { ok: true, message: `Solgte ${fmtT(sold)} på spot for ${fmtKr(income)}.` };
}

/** Selger partier ingen kontrakt venter på, til lageret er under målet. */
export function sellExcess(g: GameState, stats: PlantStats, targetFraction: number): void {
  for (const lot of [...g.lots]) {
    if (lot.second) sellLot(g, lot.id);
  }
  const reserved = lotReservations(g);
  for (const lot of [...g.lots]) {
    const over = lotsTonnage(g) - stats.storeT * targetFraction;
    if (over <= 0) break;
    const free = lot.t - (reserved.get(lot.id) ?? 0);
    if (free > 1e-6) sellLot(g, lot.id, Math.min(free, over));
  }
}

/** Hvor mye av hvert parti aktive kontrakter vil få, i samme rekkefølge som leveransene. */
export function lotReservations(g: GameState): Map<number, number> {
  const reserved = new Map<number, number>();
  const active = g.contracts.filter((c) => c.status === "aktiv").sort((a, b) => a.deadlineDay - b.deadlineDay);
  for (const c of active) {
    let left = c.tonnes - c.delivered;
    for (const lot of g.lots) {
      if (left <= 1e-9) break;
      if (lot.product !== c.product || lot.second || !satisfies(lot.known, c.grade)) continue;
      const free = lot.t - (reserved.get(lot.id) ?? 0);
      const take = Math.min(free, left);
      if (take <= 0) continue;
      reserved.set(lot.id, (reserved.get(lot.id) ?? 0) + take);
      left -= take;
    }
  }
  return reserved;
}

function deliverContracts(g: GameState): void {
  const active = g.contracts.filter((c) => c.status === "aktiv").sort((a, b) => a.deadlineDay - b.deadlineDay);
  for (const c of active) {
    for (const lot of g.lots) {
      const remaining = c.tonnes - c.delivered;
      if (remaining <= 1e-6) break;
      if (lot.product !== c.product || lot.second || lot.t <= 1e-9) continue;
      if (!satisfies(lot.known, c.grade)) continue;
      const take = Math.min(remaining, lot.t);
      lot.t -= take;
      c.delivered += take;
      addIncome(g, "kontrakt", take * c.pricePerT);
      if (!satisfies(lot.analysis, c.grade) && chance(g, 0.8)) {
        const failures = gradeFailures(lot.analysis, c.grade);
        g.complaints.push({
          dueMin: g.minute + uniform(g, 0.5, 2.5) * MIN_PER_DAY,
          customer: c.customer,
          text: `${c.customer} reklamerer på ${fmtT(take)} ${PRODUCTS[c.product].name.toLowerCase()}: ${failures.join(", ")}.`,
          refund: take * c.pricePerT,
          // Omdømmetapet følger hvor stor del av kontrakten som var feil
          repLoss: Math.max(0.5, (1 + c.repGain * 2) * (take / c.tonnes)),
        });
      }
    }
    if (c.tonnes - c.delivered <= 1e-6) {
      c.delivered = c.tonnes;
      c.status = "fullfort";
      c.closedDay = day(g);
      // Jo høyere omdømme, jo mindre flytter én kontrakt
      const gain = c.repGain * Math.max(0.25, 1 - g.reputation / 150);
      adjustReputation(g, gain);
      g.totals.contractsDone += 1;
      awardPoints(g, 1 + g.stage);
      log(g, `Kontrakten med ${c.customer} er levert. Omdømme +${gain.toFixed(1)}.`, "good");
      if (g.totals.contractsDone === 1) unlock(g, "omdomme");
    }
  }
  g.lots = g.lots.filter((l) => l.t > 1e-6);
}

function processComplaints(g: GameState): void {
  const due = g.complaints.filter((c) => c.dueMin <= g.minute);
  if (!due.length) return;
  g.complaints = g.complaints.filter((c) => c.dueMin > g.minute);
  for (const c of due) {
    addCost(g, "bot", c.refund);
    adjustReputation(g, -c.repLoss);
    g.totals.complaints += 1;
    awardPoints(g, 2);
    log(
      g,
      `${c.text} Kunden får pengene tilbake (${fmtKr(c.refund)}), omdømme −${c.repLoss.toFixed(1)}. Du lærte noe: +2 fagpoeng.`,
      "bad",
    );
    unlock(g, "analyse");
  }
}

// ------------------------------------------------------------------ //
// Kontrakter
// ------------------------------------------------------------------ //
function roundTonnes(t: number): number {
  const step = t < 1 ? 0.05 : t < 10 ? 0.5 : t < 100 ? 5 : t < 1000 ? 25 : 250;
  return Math.max(step, Math.round(t / step) * step);
}

/** Hvor mange døgns produksjon en kontrakt tilsvarer (se B-016) */
const CONTRACT_DAYS: [number, number] = [1.5, 4];

function makeOffer(g: GameState, stats: PlantStats): Contract | null {
  const eligible = CUSTOMERS.filter(
    (c) => c.minStage <= g.stage && c.maxStage >= g.stage && c.products.some((p) => stats.products.includes(p)),
  );
  if (!eligible.length) return null;
  const customer = pick(g, eligible);
  const product = pick(
    g,
    customer.products.filter((p) => stats.products.includes(p)),
  );
  const grades = customer.grades.filter((id) => GRADES[id].minStage <= g.stage);
  const grade = pick(g, grades.length ? grades : customer.grades);
  const capacity = Math.max(0.1, stats.dailyProductT);
  // En kontrakt skal være et lite prosjekt: 1,5–4 døgns produksjon, ikke noe som er ferdig på sekunder
  const workDays = uniform(g, CONTRACT_DAYS[0], CONTRACT_DAYS[1]);
  const tonnes = roundTonnes(Math.max(customer.minT, Math.min(customer.maxT, capacity * workDays)));
  const pricePerT = Math.round(productPrice(g, product, grade) * (1 + stats.priceBonus) * uniform(g, 0.95, 1.1));
  const days = Math.min(30, Math.ceil(tonnes / (capacity * 0.6)) + randInt(g, 2, 4));
  const today = day(g);
  const size = Math.min(3, tonnes / capacity);
  const repGain = Math.round((0.4 + 0.5 * size) * (GRADES[grade].premium > 1.1 ? 1.3 : 1) * 10) / 10;
  return {
    id: g.nextContractId++,
    customer: customer.name,
    product,
    grade,
    tonnes,
    delivered: 0,
    pricePerT,
    deadlineDay: today + days,
    offerExpiresDay: today + 1,
    repGain,
    repLoss: Math.round((repGain * 2 + 1) * 10) / 10,
    penaltyPerT: Math.round(pricePerT * 0.25),
    status: "tilbud",
    closedDay: null,
  };
}

function generateOffers(g: GameState, stats: PlantStats, count?: number): void {
  const n = count ?? Math.floor(stats.offersPerDay + rand(g));
  const open = g.contracts.filter((c) => c.status === "tilbud").length;
  for (let i = 0; i < n && open + i < 8; i++) {
    const offer = makeOffer(g, stats);
    if (offer) g.contracts.push(offer);
  }
}

export function acceptContract(g: GameState, id: number): PurchaseResult {
  const c = g.contracts.find((x) => x.id === id);
  if (!c || c.status !== "tilbud") return { ok: false, message: "Tilbudet finnes ikke lenger." };
  c.status = "aktiv";
  log(
    g,
    `Du signerte med ${c.customer}: ${fmtT(c.tonnes)} ${PRODUCTS[c.product].name.toLowerCase()} (${GRADES[c.grade].name}) innen dag ${c.deadlineDay}.`,
    "info",
  );
  return { ok: true, message: "Kontrakt signert." };
}

export function declineContract(g: GameState, id: number): void {
  g.contracts = g.contracts.filter((c) => !(c.id === id && c.status === "tilbud"));
}

// ------------------------------------------------------------------ //
// Folk
// ------------------------------------------------------------------ //
export function makeCandidate(g: GameState, role?: RoleId): Worker {
  const roles: RoleId[] = [
    "allround",
    "ovn",
    "ovn",
    "stoper",
    "stoper",
    "skrap",
    "lab",
    "vedlikehold",
    "salg",
    "valse",
  ];
  const r =
    role ??
    pick(
      g,
      roles.filter((x) => x !== "valse" || g.stage >= 3).filter((x) => x !== "lab" || g.stage >= 2),
    );
  const skill = Math.min(5, Math.max(1, Math.round((uniform(g, 0.6, 3.6) + (g.stage >= 3 ? 0.5 : 0)) * 10) / 10));
  return {
    id: g.nextWorkerId++,
    name: `${pick(g, FIRST_NAMES)} ${pick(g, LAST_NAMES)}`,
    role: r,
    skill,
    salary: Math.round(ROLES[r].salary * (0.8 + 0.1 * skill) * (1 + 0.05 * g.stage)),
    hiredDay: 0,
  };
}

function refreshCandidates(g: GameState): void {
  if (STAGES[g.stage].staffCap === 0) {
    g.candidates = [];
    return;
  }
  const n = randInt(g, 3, 5) + Math.min(4, g.stage);
  // Noen søkere blir stående, resten erstattes
  g.candidates = g.candidates.filter(() => chance(g, 0.4)).slice(0, n);
  while (g.candidates.length < n) g.candidates.push(makeCandidate(g));
}

// ------------------------------------------------------------------ //
// Døgn og time
// ------------------------------------------------------------------ //
function onHour(g: GameState, stats: PlantStats): void {
  deliverContracts(g);
  if (g.settings.autoSpot) {
    for (const lot of [...g.lots]) if (lot.second) sellLot(g, lot.id);
    // Det ingen kontrakt venter på, selges etter ett døgn – eller straks lageret fylles
    const reserved = lotReservations(g);
    const today = day(g);
    const rolling = rollingActive(g);
    for (const lot of [...g.lots]) {
      // Emner er råvare for valseverket så lenge det går
      if (rolling && lot.product === "emne") continue;
      const free = lot.t - (reserved.get(lot.id) ?? 0);
      if (free > 1e-6 && lot.madeDay < today) sellLot(g, lot.id, free);
    }
    if (lotsTonnage(g) > stats.storeT * 0.85) sellExcess(g, stats, 0.6);
  }
  if (g.settings.autoBuy) autoBuy(g, stats);
}

function autoBuy(g: GameState, stats: PlantStats): void {
  const recipeIds = SCRAP_IDS.filter((id) => g.recipe[id] > 0 && SCRAP_TYPES[id].buyable);
  const total = SCRAP_IDS.reduce((a, id) => a + g.recipe[id], 0);
  if (!recipeIds.length || total <= 0) return;
  const need = Math.max(
    stats.sizeT * stats.furnaceCount * 2,
    (stats.dailyProductT / stats.castYield) * 1.1 * g.settings.autoBuyDays,
  );
  for (const id of recipeIds) {
    const target = (need * g.recipe[id]) / total;
    const stock = g.scrap[id].t;
    if (stock >= target * 0.6) continue;
    const s = computePlantStats(g);
    const afford = Math.max(0, (g.cash + creditLimit(g) * 0.9) / scrapPrice(g, id));
    const amount = Math.min(target - stock, afford, s.yardT - s.yardUsed);
    if (amount > stats.sizeT * 0.1) buyScrap(g, id, amount, s);
  }
}

function walk(g: GameState, value: number, mean: number, pull: number, sd: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value + (mean - value) * pull + noise(g, sd)));
}

function onDay(g: GameState, stats: PlantStats): void {
  const today = day(g);
  g.today.cashEnd = g.cash;
  g.history.push(g.today);
  if (g.history.length > HISTORY_MAX) g.history.splice(0, g.history.length - HISTORY_MAX);
  g.today = newDay(today, g.cash);

  // Faste kostnader
  addCost(g, "lonn", stats.salaryPerDay);
  addCost(g, "faste", STAGES[g.stage].fixedPerDay);
  if (g.loan > 0) addCost(g, "renter", g.loan * LOAN_INTEREST_PER_DAY);

  // Markedet
  const m = g.market;
  m.steelFactor = walk(g, m.steelFactor, 1, 0.12, 0.025, 0.75, 1.3);
  if (chance(g, 0.02)) {
    const up = chance(g, 0.5);
    m.steelFactor = Math.max(0.75, Math.min(1.3, m.steelFactor + (up ? 0.12 : -0.12)));
    log(
      g,
      up
        ? "Stålprisene stiger kraftig etter sterk etterspørsel i byggebransjen."
        : "Stålprisene faller: billig import presser markedet.",
      "event",
    );
  }
  for (const id of SCRAP_IDS) {
    // Skrapprisen følger stålprisen, med egen støy per type
    const mean = 0.4 + 0.6 * m.steelFactor;
    m.scrapFactor[id] = walk(g, m.scrapFactor[id], mean, 0.15, 0.03, 0.6, 1.8);
  }
  if (chance(g, 0.03)) {
    const id = pick(
      g,
      SCRAP_IDS.filter((x) => SCRAP_TYPES[x].buyable),
    );
    m.scrapFactor[id] = Math.min(1.8, m.scrapFactor[id] * 1.4);
    log(g, `Mangel på ${SCRAP_TYPES[id].name.toLowerCase()}: prisen har steget kraftig.`, "event");
  }
  if (m.powerSpikeDays > 0) {
    m.powerSpikeDays -= 1;
    if (m.powerSpikeDays === 0) {
      m.powerFactor = 1.1;
      log(g, "Strømprisen er på vei ned igjen.", "info");
    }
  } else {
    m.powerFactor = walk(g, m.powerFactor, 1, 0.2, 0.08, 0.5, 1.6);
    if (chance(g, 0.04)) {
      m.powerSpikeDays = randInt(g, 1, 3);
      m.powerFactor = uniform(g, 2.0, 2.8);
      log(g, `Kulde og lite vind: strømprisen er ${m.powerFactor.toFixed(1)} ganger normalt de neste dagene.`, "event");
      if (stats.furnace.fuel === "strøm") unlock(g, "strom");
    }
  }
  m.spotSoldToday = {};

  // Kontrakter
  for (const c of g.contracts) {
    if (c.status === "aktiv" && c.deadlineDay < today) {
      const remaining = c.tonnes - c.delivered;
      const penalty = remaining * c.penaltyPerT;
      addCost(g, "bot", penalty);
      adjustReputation(g, -c.repLoss);
      c.status = "misligholdt";
      c.closedDay = today;
      log(
        g,
        `Fristen til ${c.customer} gikk ut med ${fmtT(remaining)} ulevert. Bot ${fmtKr(penalty)}, omdømme −${c.repLoss.toFixed(1)}.`,
        "bad",
      );
      unlock(g, "omdomme");
    }
  }
  // Tilbud som gikk ut fjernes; avsluttede kontrakter vises i fem dager
  g.contracts = g.contracts.filter((c) =>
    c.status === "aktiv" ? true : c.status === "tilbud" ? c.offerExpiresDay >= today : (c.closedDay ?? 0) >= today - 5,
  );
  generateOffers(g, stats);

  // Folk blir flinkere av å jobbe
  if (stats.hours > 0) {
    const growth = hasResearch(g, "opplaering") ? 0.04 : 0.025;
    for (const w of g.workers) w.skill = Math.min(5, w.skill + growth);
    if (stats.ownerWorks) g.ownerSkill = Math.min(4.5, g.ownerSkill + 0.04);
  }
  refreshCandidates(g);
  maybeCreateDecision(g);

  // Banken
  if (g.cash < -creditLimit(g)) {
    g.negativeDays += 1;
    if (g.negativeDays === 1 || g.negativeDays >= BANKRUPTCY_DAYS - 2) {
      log(g, `Banken er bekymret: du er over kredittgrensen (dag ${g.negativeDays} av ${BANKRUPTCY_DAYS}).`, "bad");
    }
    if (g.negativeDays >= BANKRUPTCY_DAYS) {
      g.gameOver = true;
      g.speed = 0;
      log(g, "Banken har begjært verket konkurs.", "bad");
    }
  } else {
    g.negativeDays = 0;
  }
  if (!g.won && g.stage === STAGES.length - 1 && g.cash - g.loan >= WIN_CASH) {
    g.won = true;
    log(g, "Du har bygget et av landets største stålverk. Gratulerer!", "good");
  }
}

// ------------------------------------------------------------------ //
// Tidssteg
// ------------------------------------------------------------------ //
function step(g: GameState, dt: number): void {
  const before = g.minute;
  g.minute += dt;
  let stats = computePlantStats(g);
  updateFurnaces(g, stats);
  updateCasting(g, stats, dt);
  updateRolling(g, stats, dt);
  processComplaints(g);

  const hourBefore = Math.floor(before / 60);
  const hourNow = Math.floor(g.minute / 60);
  if (hourNow !== hourBefore) {
    stats = computePlantStats(g);
    onHour(g, stats);
  }
  if (Math.floor(g.minute / MIN_PER_DAY) !== Math.floor(before / MIN_PER_DAY)) {
    onDay(g, computePlantStats(g));
  }
}

/** Flytter spillet fram et antall spillminutter. */
export function advance(g: GameState, minutes: number): void {
  let left = minutes;
  while (left > 1e-9 && !g.gameOver && !g.pendingManual && !g.pendingDecision) {
    const dt = Math.min(STEP_MIN, left);
    step(g, dt);
    left -= dt;
  }
}

// ------------------------------------------------------------------ //
// Manuell charge
// ------------------------------------------------------------------ //
export interface ManualResult {
  carbonPct: number;
  phosphorusPct: number;
  tempDeviationC: number;
  kwhPerT: number;
  wear: number;
  minutes: number;
  ok: boolean;
  deviations: string[];
  /** Karakter 1–5 fra den enkle styringen */
  stars?: number;
}

/** Legger en charge spilleren kjørte selv inn i produksjonen. */
export function completeManual(g: GameState, result: ManualResult | null): void {
  const req = g.pendingManual;
  if (!req) return;
  g.pendingManual = null;
  g.speed = req.resumeSpeed;
  const f = g.furnaces[req.furnace];
  const stats = computePlantStats(g);
  if (!result) {
    // Avbrutt: automatikken kjører chargen i stedet
    const heat = autoHeatFromRequest(g, req, stats);
    f.heat = heat;
    f.waitReason = null;
    return;
  }
  const lf = has(g, "oseovn");
  const c = lf ? TARGET_C[req.grade] + noise(g, 0.01) : result.carbonPct + (TARGET_C[req.grade] - 0.07);
  const tempOff = Math.abs(result.tempDeviationC) > 20 && !(lf && Math.abs(result.tempDeviationC) < 40);
  const analysis: Analysis = { c: Math.max(0.02, c), p: result.phosphorusPct, tramp: req.mix.tramp };
  const kwh = result.kwhPerT * req.sizeT;
  addCost(g, "energi", kwh * energyPrice(g));
  addCost(g, "forbruk", (stats.furnace.consumablesPerT + (lf ? 60 : 0)) * req.sizeT);
  f.wear += result.wear * (stats.furnace.wearPerHeat / 0.01) * wearFactor(g);
  f.heat = {
    startMin: g.minute,
    endMin: g.minute + result.minutes,
    sizeT: req.sizeT,
    liquidT: req.sizeT * req.metallicYield,
    grade: req.grade,
    analysis,
    expected: { c: TARGET_C[req.grade], p: result.phosphorusPct, tramp: req.expectedMix.tramp },
    tempOff,
    manual: true,
    radioactive: req.radioactive,
    energyKwh: kwh,
  };
  f.waitReason = null;
  awardPoints(g, result.stars !== undefined ? 1 + result.stars : 3);
  if (result.ok) {
    adjustReputation(g, 0.5);
    log(
      g,
      `Du kjørte charge i ovn ${req.furnace + 1} selv: ${result.kwhPerT.toFixed(0)} kWh/t, P ${result.phosphorusPct.toFixed(3)} %. Innenfor krav – omdømme +0,5.`,
      "good",
    );
  } else {
    log(g, `Du kjørte charge i ovn ${req.furnace + 1} selv, med avvik: ${result.deviations.join("; ")}.`, "event");
  }
  unlock(g, "fosfor");
}

function autoHeatFromRequest(g: GameState, req: ManualRequest, stats: PlantStats) {
  const analysis: Analysis = {
    c: finalCarbon(g, req.mix.c, req.grade, stats, false),
    p: Math.max(0.003, req.mix.p * (1 - stats.dephos * uniform(g, 0.85, 1.1))),
    tramp: req.mix.tramp,
  };
  const kwh = stats.kwhPerT * req.energyFactor * req.sizeT;
  addCost(g, "energi", kwh * energyPrice(g));
  addCost(g, "forbruk", stats.furnace.consumablesPerT * req.sizeT);
  g.furnaces[req.furnace].wear += stats.furnace.wearPerHeat * wearFactor(g);
  return {
    startMin: g.minute,
    endMin: g.minute + stats.cycleMin * req.energyFactor,
    sizeT: req.sizeT,
    liquidT: req.sizeT * req.metallicYield,
    grade: req.grade,
    analysis,
    expected: {
      c: finalCarbon(g, req.expectedMix.c, req.grade, stats, true),
      p: req.expectedMix.p * (1 - stats.dephos),
      tramp: req.expectedMix.tramp,
    },
    tempOff: chance(g, tempOffRisk(g, stats)),
    manual: false,
    radioactive: req.radioactive,
    energyKwh: kwh,
  };
}

// ------------------------------------------------------------------ //
// Formatering
// ------------------------------------------------------------------ //
const nf0 = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 2 });

export function fmtKr(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${nf2.format(abs / 1_000_000)} mill. kr`;
  return `${sign}${nf0.format(abs)} kr`;
}

export function fmtT(t: number): string {
  if (t < 1) return `${nf0.format(t * 1000)} kg`;
  if (t < 100) return `${nf1.format(t)} t`;
  return `${nf0.format(t)} t`;
}
