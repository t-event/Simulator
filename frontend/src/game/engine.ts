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
  SHIFT_START_HOUR,
  SPOT_DISCOUNT,
  STAGES,
  START_CASH,
  START_REPUTATION,
  WIN_CASH,
} from "./data";
import { knowledgeCard } from "./knowledge";
import { hasResearch, RESEARCH, scrapUnlocked } from "./research";
import { checkMissions } from "./missions";
import { maybeAdvisor, maybeCreateDecision } from "./decisions";
import { maybeTip, setCreditHint } from "./tips";
import { suggestRecipe } from "./recipe";
import {
  castingType,
  computePlantStats,
  day,
  energyPrice,
  fixedPowerOffer,
  furnaceType,
  furnaceGrade,
  gradeFailures,
  gradeRecipe,
  has,
  hasGrader,
  hasPlanner,
  ladleSkill,
  isOpen,
  nightExtra,
  PEAK_RATE_PER_MW,
  presentWorkers,
  daysUntilAllBack,
  isAbsent,
  staffing,
  tempsActive,
  tempsCost,
  MASON_HOURS,
  masonsAtWork,
  potRebuildPerDay,
  potSwapHours,
  POWER_BINDING_DAYS,
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
  RepCause,
  Agreement,
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

/** En ny ovn (eller ny foring) er «byttet» dagen den settes i drift */
export function newFurnaceUnit(today = 1): FurnaceUnit {
  return {
    wear: 0,
    heat: null,
    holding: null,
    downUntilMin: 0,
    downReason: null,
    heatsOnLining: 0,
    lastRelineDay: today,
    relineRequested: false,
    spareProgress: 1,
    grade: null,
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
    furnaceType: "induksjon025",
    furnaceCount: 1,
    castingType: "sandformer",
    furnaces: [newFurnaceUnit()],
    castQueue: [],
    lastCast: null,
    castProgressT: 0,
    castDownUntilMin: 0,
    castWait: null,
    rollProgressT: 0,
    scrap,
    recipe: { blandet: 30, tungt: 60, shredder: 0, spon: 0, rent: 0, rajern: 0, retur: 10 },
    gradeRecipes: {},
    targetGrade: "standard",
    lots: [],
    nextLotId: 1,
    contracts: [],
    nextContractId: 1,
    agreements: [],
    nextAgreementId: 1,
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
      autoReline: false,
      relineAt: 0.85,
      relinePlanDays: null,
      powerDeal: "spot",
      powerDealUntilDay: 0,
      powerFixedPrice: 0,
      powerAutoRenew: false,
      offerGrades: [],
      offerSort: "frist",
      onePeak: false,
      shiftStart: SHIFT_START_HOUR,
      pauseOffers: false,
      autoTemps: false,
      secondsAction: "spot",
      graderStrict: true,
      skipIdleNights: true,
      maxPowerPrice: null,
      autoBuy: false,
      followQueue: true,
      splitGrades: true,
      plannerSorts: true,
      autoBuyDays: 1.5,
      autoBuyCredit: false,
      autoBuyMaxPerDay: null,
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
    decisionSeen: {},
    sickUntilMin: 0,
    tempsUntilMin: 0,
    bonusOffer: false,
    celebrate: null,
    seenViews: ["verket", "marked", "salg"],
    tipsSeen: [],
    gridCut: null,
    readChapters: [],
    quizDone: [],
    quizScores: {},
    missions: {},
    counters: {},
    repLog: [],
    advisorSeen: {},
    specialists: {},
    tutorial: null,
    morale: 70,
    lastBonusDay: -99,
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
/** Teller hendelser som oppdragene i fagboka følger med på */
export function countEvent(g: GameState, key: string, n = 1): void {
  g.counters[key] = (g.counters[key] ?? 0) + n;
}

/** Omdømmetap med årsak, så rådgiveren kan se mønstre (B-025) */
function repLoss(g: GameState, amount: number, cause: RepCause): void {
  adjustReputation(g, -amount);
  g.repLog.push({ day: day(g), cause });
  if (g.repLog.length > 30) g.repLog.splice(0, g.repLog.length - 30);
}

/** Strøm brukt, for snittprisen per døgn */
function chargeEnergy(g: GameState, kwh: number): void {
  addCost(g, "energi", kwh * energyPrice(g));
  if (furnaceType(g).fuel === "strøm") g.today.kwh = (g.today.kwh ?? 0) + kwh;
}

/** Endrer trivselen blant de ansatte (0–100) */
export function adjustMorale(g: GameState, delta: number): void {
  if (!g.workers.length) return;
  g.morale = Math.max(0, Math.min(100, g.morale + delta));
}

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

setCreditHint((g) => creditLimit(g));

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
  if (!scrapUnlocked(g, id)) return { ok: false, message: `${type.name} låses opp med forskning.` };
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
  if ((id === "blandet" || id === "spon" || id === "shredder") && chance(g, g.stage <= 1 ? 0.03 : 0.05)) {
    if (hasGrader(g)) {
      // Skrapklasseren ser at partiet er dårlig og sender det tilbake (B-029)
      addIncome(g, "annet", cost);
      log(
        g,
        `Skrapklasseren avviste et lass ${type.name.toLowerCase()} med mye kobber og fosfor. Det er sendt i retur, og du har fått pengene tilbake.`,
        "event",
      );
      return { ok: true, message: "Skrapklasseren sendte et dårlig lass i retur." };
    }
    quality.p *= uniform(g, 1.6, 2.4);
    quality.tramp *= uniform(g, 1.2, 1.6);
  }

  // Radioaktive kilder er sjeldne: høyst 1 % per innkjøp og høyst én gang per 30 døgn, også for store verk (B-034)
  const radioChance = Math.min(0.01, 1 - (1 - type.radioPerT) ** amount);
  let radioactive = false;
  if (radioChance > 0 && day(g) - (g.lastRadioDay ?? -99) >= 30 && chance(g, radioChance)) {
    g.lastRadioDay = day(g);
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
export function takeScrap(
  g: GameState,
  sizeT: number,
  dryRun = false,
  recipe: Record<ScrapId, number> = g.recipe,
): Mix | null {
  const grader = hasGrader(g);
  const recipeIds = SCRAP_IDS.filter((id) => recipe[id] > 0);
  // Uten skrapklasser blir blandingen omtrentlig: hver skraptype kan bomme med opptil en fjerdedel (B-029)
  const weights = Object.fromEntries(
    SCRAP_IDS.map((id) => [id, recipe[id] * (grader || dryRun || recipe[id] <= 0 ? 1 : uniform(g, 0.75, 1.25))]),
  ) as Record<ScrapId, number>;
  const totalWeight = recipeIds.reduce((a, id) => a + weights[id], 0);
  const amounts = Object.fromEntries(SCRAP_IDS.map((id) => [id, 0])) as Record<ScrapId, number>;
  if (totalWeight > 0) {
    for (const id of recipeIds) amounts[id] = Math.min(g.scrap[id].t, (sizeT * weights[id]) / totalWeight);
  }
  let short = sizeT - Object.values(amounts).reduce((a, b) => a + b, 0);
  // Fyll opp med andre typer i resepten. Uten skrapklasser tas deretter hva som helst som ligger på
  // lageret; skrapklasseren venter heller på riktig skrap enn å ødelegge analysen.
  for (const pool of grader && g.settings.graderStrict !== false ? [recipeIds] : [recipeIds, SCRAP_IDS]) {
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
    // Øseovnen finjusterer karbonet; hvor presist avhenger av øseovnsoperatøren (B-037)
    const sd = has(g, "oseovn") ? 0.012 * (1.6 - 0.15 * ladleSkill(g)) : 0.045;
    return Math.max(0.02, target + noise(g, sd));
  }
  const base = mixC * 0.95;
  // Med skrapklasser er blandingen i hver charge kjent, så karbonet spriker mindre (B-043)
  const spread = hasGrader(g) ? 0.4 : 1;
  if (base < target) return exact ? target : Math.max(0.01, target + noise(g, 0.025 * spread));
  return exact ? base : Math.max(0.01, base + noise(g, 0.02 * spread));
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
  recipe: Record<ScrapId, number> = g.recipe,
): RecipeEstimate {
  const total = SCRAP_IDS.reduce((a, id) => a + recipe[id], 0);
  const sorting = has(g, "sortering");
  const mix = { c: 0, p: 0, tramp: 0 };
  let dirt = 0;
  let energy = 0;
  let cost = 0;
  for (const id of SCRAP_IDS) {
    const w = total > 0 ? recipe[id] / total : 0;
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

/** Med vedlikeholdsplan byttes foringen også hvis den blir så slitt før planlagt dag (B-028) */
export const PLAN_SAFETY_WEAR = 0.88;

function wearFactor(g: GameState): number {
  return hasResearch(g, "ildfast") ? 0.85 : 1;
}

function tempOffRisk(g: GameState, stats: PlantStats): number {
  let risk = stats.furnace.id === "induksjon025" ? 0.14 : stats.furnace.arc ? 0.12 : 0.08;
  // Riktig temperatur til støping er øseovnsoperatørens jobb (B-037)
  if (stats.furnace.arc && has(g, "oseovn")) return 0.03 * (1.8 - 0.2 * ladleSkill(g));
  return risk * (1.3 - 0.1 * stats.crewSkill);
}

function startHeat(g: GameState, index: number, stats: PlantStats): boolean {
  const f = g.furnaces[index];
  const size = stats.sizeT;
  const grade = furnaceGrade(g, index);
  const mix = takeScrap(g, size, false, gradeRecipe(g, grade));
  if (!mix) return false;
  const furnace = stats.furnace;
  const metallicYield = Math.max(0.6, 1 - mix.dirt - furnace.oxidationLoss);

  if (furnace.arc && g.settings.manualNext) {
    // Spilleren tar styringen: spillet pauses og kontrollrommet åpnes
    g.settings.manualNext = false;
    g.pendingManual = {
      furnace: index,
      sizeT: size,
      grade: grade,
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
    c: finalCarbon(g, mix.analysis.c, grade, stats, false),
    p: Math.max(0.003, mix.analysis.p * (1 - dephos) * (1 + noise(g, 0.08))),
    tramp: Math.max(0.005, mix.analysis.tramp * (1 + noise(g, 0.06))),
  };
  const expected: Analysis = {
    c: finalCarbon(g, mix.expected.c, grade, stats, true),
    p: mix.expected.p * (1 - furnace.dephos),
    tramp: mix.expected.tramp,
  };
  const tempOff = chance(g, tempOffRisk(g, stats));
  const kwh = stats.kwhPerT * mix.energy * size * (tempOff ? 1.04 : 1);
  chargeEnergy(g, kwh);
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
    grade: grade,
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
        f.downReason = "Havari: vannlekkasje etter overslag";
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
  } else if (furnace.id !== "induksjon025" && chance(g, 0.004 * m)) {
    const hours = 8 * stats.repairFactor;
    f.downUntilMin = Math.max(f.downUntilMin, g.minute + stats.cycleMin + hours * 60);
    f.downReason = "Havari: vannlekkasje i induksjonsspolen";
    addCost(g, "vedlikehold", 8_000 * furnace.sizeT + 10_000);
    log(
      g,
      `Vannlekkasje i induksjonsspolen på ovn ${index + 1}. Kobberspolen rundt digelen er vannkjølt; lekker den, må ovnen tømmes og spolen repareres (${hours.toFixed(0)} t).`,
      "bad",
    );
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
    repLoss(g, 12, "havari");
    f.downUntilMin = g.minute + 2 * MIN_PER_DAY;
    f.downReason = "Havari: opprydding etter radioaktiv kilde";
    g.castDownUntilMin = Math.max(g.castDownUntilMin, g.minute + MIN_PER_DAY);
    awardPoints(g, 3);
    log(
      g,
      `En radioaktiv kilde ble smeltet i ovn ${index + 1}! Stålet og støvet er forurenset og må destrueres. Opprydding ${fmtKr(cleanup)}, anlegget står i to døgn, omdømme −12. En strålingsportal ville stoppet kilden.`,
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
    repLoss(g, 5, "havari");
    adjustMorale(g, -4);
    f.wear = 0;
    f.heatsOnLining = 0;
    f.lastRelineDay = day(g);
    f.downUntilMin = g.minute + hours * 60;
    f.downReason = "Havari: gjennombrent foring";
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
      `HAVARI: gjennombrenning i ovn ${index + 1}! Flytende stål gikk gjennom foringen. Reparasjon ${fmtKr(cost)}, ${hours.toFixed(0)} timer, omdømme −5. En planlagt omforing hadde kostet ${fmtKr(stats.furnace.relineCost)} og ${stats.furnace.relineHours} timer.`,
      "bad",
    );
    unlock(g, "ildfast");
    return;
  }

  // Mange charger i et stort verk lærer deg mindre hver for seg
  // Fagpoeng per charge: færre jo flere charger verket kjører (B-026)
  awardPoints(g, [0.5, 0.2, 0.25, 0.2, 0.15][g.stage] ?? 0.15);
  f.holding = {
    t: heat.liquidT,
    grade: heat.grade,
    analysis: heat.analysis,
    expected: heat.expected,
    tempOff: heat.tempOff,
    manual: heat.manual,
  };
}

export function startReline(
  g: GameState,
  index: number,
  stats = computePlantStats(g),
  why: "manuell" | "plan" | "reparatør" = "manuell",
): PurchaseResult {
  const f = g.furnaces[index];
  if (!f) return { ok: false, message: "Ukjent ovn." };
  if (f.heat || f.holding) return { ok: false, message: "Ovnen må være tom før foringen kan byttes." };
  if (g.minute < f.downUntilMin) return { ok: false, message: "Ovnen står allerede." };
  const cost = stats.furnace.relineCost;
  // Omforing kan tas på kassekreditten: en ovn som står, tjener ingen penger
  if (g.cash - cost < -creditLimit(g)) return { ok: false, message: "Du har ikke råd til ny foring." };
  addCost(g, "vedlikehold", cost);
  const who = why === "plan" ? " etter vedlikeholdsplanen" : why === "reparatør" ? " av reparatøren" : "";
  // Lysbueovn med ferdig reservepotte: bytt potte på noen timer, og la murerne mure opp den slitte (B-030)
  if (stats.furnace.arc && f.spareProgress >= 1) {
    const swap = potSwapHours(g) * stats.repairFactor;
    f.wear = 0;
    f.heatsOnLining = 0;
    f.lastRelineDay = day(g);
    f.spareProgress = 0;
    f.downUntilMin = g.minute + swap * 60;
    f.downReason = "Planlagt stans: bytter potte";
    countEvent(g, "omforinger");
    log(
      g,
      `Planlagt stans: ovn ${index + 1} får ny potte${who} (${swap.toFixed(0)} timer). Den slitte potta går til murerne (${fmtKr(cost)} i ildfast stein).`,
      "info",
    );
    unlock(g, "ildfast");
    return { ok: true, message: "Pottebytte startet." };
  }
  const hours = stats.furnace.relineHours * stats.repairFactor;
  f.wear = 0;
  f.heatsOnLining = 0;
  f.lastRelineDay = day(g);
  f.downUntilMin = g.minute + hours * 60;
  f.downReason = "Planlagt stans: ny foring";
  countEvent(g, "omforinger");
  const inPlace = stats.furnace.arc ? " Reservepotta var ikke klar, så foringen mures om inne i ovnen." : "";
  log(g, `Planlagt stans: ovn ${index + 1} fores om${who} (${fmtKr(cost)}, ${hours.toFixed(0)} timer).${inPlace}`, "info");
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
      g.castQueue.push({ ...f.holding, queuedMin: g.minute });
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
    // Planlagt omforing: etter plan (forskning) eller av en reparatør når foringen er slitt
    const planDue =
      g.settings.relinePlanDays !== null &&
      hasResearch(g, "vedlikeholdsplan") &&
      ((day(g) - f.lastRelineDay >= g.settings.relinePlanDays && f.wear > 0.15) || f.wear >= PLAN_SAFETY_WEAR);
    const repairerDue =
      (g.settings.autoReline && presentWorkers(g).some((w) => w.role === "vedlikehold") && f.wear >= g.settings.relineAt) ||
      ((g.specialists.havari ?? 0) > g.minute && f.wear >= 0.8);
    if (f.relineRequested || planDue || repairerDue) {
      if (startReline(g, i, stats, f.relineRequested ? "manuell" : planDue ? "plan" : "reparatør").ok) {
        f.relineRequested = false;
        continue;
      }
      f.waitReason = "Foringen skal byttes – mangler penger til omforing";
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
    if (g.gridCut && g.minute >= g.gridCut.fromMin && g.minute < g.gridCut.untilMin) {
      f.waitReason = "Utkoblet av nettselskapet";
      continue;
    }
    if (g.settings.onePeak && g.furnaces.some((o, j) => j !== i && o.heat)) {
      f.waitReason = "Venter: bare én ovn smelter om gangen";
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
    if (!startHeat(g, i, stats)) {
      const was = f.waitReason;
      f.waitReason =
        hasGrader(g) && stats.yardUsed >= stats.sizeT ? "Mangler skrap til resepten" : "Tomt for skrap";
      // Tydelig varsel når ovnen blir stående uten skrap (B-033)
      if (was !== f.waitReason && i === 0)
        log(g, `Ovnen står: ${f.waitReason === "Tomt for skrap" ? "skraplageret er tomt. Kjøp skrap under Marked" : "mangler skrap til resepten"}.`, "bad");
    }
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
  // Kvalitetsbytte i en sekvens: stålet fra to øser blandes i fordeleren, og emnene i overgangen holder
  // ingen av kvalitetene. De kappes ut og smeltes om (B-046)
  if (casting.continuous) {
    const last = g.lastCast;
    if (last && batch.transition) {
      const cut = Math.min(t * 0.5, casting.tph * 0.05);
      addReturnScrap(g, cut, batch.analysis, stats);
      t -= cut;
      g.today.transitionT = (g.today.transitionT ?? 0) + cut;
      if (!g.tipsSeen.includes("tips-overgang")) {
        g.tipsSeen.push("tips-overgang");
        log(
          g,
          `Strengstøpingen byttet fra ${GRADES[last.grade].name.toLowerCase()} til ${GRADES[batch.grade].name.toLowerCase()}. ${fmtT(cut)} overgangsemner holdt ingen av kvalitetene og ble skrapet. Færre kvalitetsbytter gir mindre tap.`,
          "event",
        );
      }
    }
    g.lastCast = { grade: batch.grade, min: g.minute };
  }
  if (casting.continuous && chance(g, 0.01 * stats.maintFactor * (batch.tempOff ? 2.5 : 1))) {
    const hours = 4 * stats.repairFactor;
    g.castDownUntilMin = g.minute + hours * 60;
    addCost(g, "vedlikehold", 60_000);
    addReturnScrap(g, t * 0.3, batch.analysis, stats);
    t *= 0.7;
    log(
      g,
      batch.tempOff && has(g, "oseovn")
        ? `Strengen grodde igjen: stålet fra øseovnen var for kaldt. Støpemaskinen står i ${hours.toFixed(1)} timer.`
        : `Strenggjennombrudd! Skallet revnet under kokillen. Støpemaskinen står i ${hours.toFixed(1)} timer.`,
      "bad",
    );
    unlock(g, "streng");
  }
  // Øseovnen: operatøren tar prøver og legerer. Karbon kan rettes; fosfor og kobber kan ikke.
  // Oppdages avviket ikke, eller kan det ikke rettes, sperres stålet (B-037)
  let blocked = false;
  if (has(g, "oseovn") && stats.furnace.arc && !satisfies(batch.analysis, batch.grade)) {
    const caught = chance(g, Math.min(0.95, 0.45 + 0.12 * ladleSkill(g)));
    const spec = GRADES[batch.grade];
    const carbonOnly = batch.analysis.p <= spec.pMax && batch.analysis.tramp <= spec.trampMax;
    if (caught && carbonOnly) {
      batch.analysis = { ...batch.analysis, c: TARGET_C[batch.grade] };
    } else {
      blocked = true;
      log(
        g,
        caught
          ? `Øseovnen fant at stålet ikke holder ${spec.name.toLowerCase()} (fosfor eller kobber), og det kan ikke legeres bort. Stålet er sperret.`
          : "Stål som ikke holdt kravet, gikk til støping uten nok prøver. Det er oppdaget og sperret.",
        "event",
      );
    }
  }
  const productT = t * casting.yield;
  addReturnScrap(g, t - productT, batch.analysis, stats);
  const defectRisk = casting.defectRisk * (batch.tempOff ? 3 : 1) * (1.3 - 0.1 * stats.crewSkill);
  const second = blocked || chance(g, Math.min(0.9, defectRisk));
  // Kvalitet: traff stålet kvaliteten det ble laget for, og ble det støpt uten feil?
  if (second) g.today.secondT = (g.today.secondT ?? 0) + productT;
  else if (satisfies(batch.analysis, batch.grade)) g.today.onGradeT = (g.today.onGradeT ?? 0) + productT;
  else g.today.offGradeT = (g.today.offGradeT ?? 0) + productT;
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
  if (g.castProgressT <= 1e-9 && !pickNextLadle(g)) {
    g.castWait = `Venter med ${GRADES[g.castQueue[0].grade].name.toLowerCase()} til sekvensen er ferdig`;
    return;
  }
  g.castProgressT += stats.castTph * (dt / 60);
  while (g.castQueue.length && g.castProgressT >= g.castQueue[0].t) {
    const batch = g.castQueue.shift()!;
    g.castProgressT -= batch.t;
    castBatch(g, batch, stats);
    if (g.castQueue.length && !pickNextLadle(g)) {
      g.castProgressT = 0;
      break;
    }
  }
  if (!g.castQueue.length) g.castProgressT = 0;
}

/** Står strengstøpingen så lenge uten stål, er sekvensen slutt, og neste kvalitet starter uten overgang (B-046) */
export const SEQUENCE_GAP_MIN = 30;
/** Lenger enn dette venter ikke en øse med annen kvalitet; da byttes det midt i sekvensen (B-046) */
export const SEQUENCE_WAIT_MIN = 90;

/**
 * Strengstøpingen støper én kvalitet om gangen (B-046). Står det en øse med samme kvalitet som sist i
 * køen, tas den først. En øse med annen kvalitet venter til sekvensen er slutt (ingen stål på en stund),
 * eller til den har ventet for lenge – da byttes kvaliteten midt i sekvensen, og overgangsemnene blir
 * skrap. Blokk- og formstøping tar øsene i rekkefølge. Returnerer false når støpingen skal vente.
 */
function pickNextLadle(g: GameState): boolean {
  const last = g.lastCast;
  if (!castingType(g).continuous || !last || !g.castQueue.length) return true;
  const head = g.castQueue[0];
  if (head.grade === last.grade) return true;
  const same = g.castQueue.findIndex((b) => b.grade === last.grade);
  if (same > 0) {
    g.castQueue.unshift(...g.castQueue.splice(same, 1));
    return true;
  }
  if (g.minute - last.min >= SEQUENCE_GAP_MIN) return true;
  if (g.minute - (head.queuedMin ?? g.minute) < SEQUENCE_WAIT_MIN) return false;
  head.transition = true;
  return true;
}

/** Støpefeil kan ikke leveres på kontrakt: selg dem, eller smelt dem om som returskrap med kjent analyse */
function handleSeconds(g: GameState): void {
  const action = g.settings.secondsAction ?? "spot";
  if (action === "behold") return;
  for (const lot of [...g.lots]) {
    if (!lot.second) continue;
    if (action === "spot") {
      sellLot(g, lot.id);
      continue;
    }
    const s = computePlantStats(g);
    const free = Math.max(0, s.yardT - s.yardUsed);
    const t = Math.min(free, lot.t);
    if (t <= 1e-6) continue;
    addScrap(g, "retur", t, { ...lot.analysis, dirt: 0.01 });
    lot.t -= t;
  }
  g.lots = g.lots.filter((l) => l.t > 1e-6);
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
  const active = orderQueue(g);
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

/** Aktive kontrakter i ordrekøens rekkefølge. */
export function orderQueue(g: GameState): Contract[] {
  return g.contracts.filter((c) => c.status === "aktiv").sort((a, b) => a.priority - b.priority);
}

/**
 * Kontrakten verket produserer for nå: den øverste i køen som ikke allerede er
 * dekket av det som ligger på lager.
 */
export function currentOrder(g: GameState): Contract | null {
  return ordersToMake(g)[0] ?? null;
}

/** Kontraktene i køen som fortsatt må produseres for, i køens rekkefølge */
export function ordersToMake(g: GameState): Contract[] {
  const reserved = lotReservations(g);
  return orderQueue(g).filter((c) => {
    const left = c.tonnes - c.delivered;
    const inStock = g.lots
      .filter((l) => l.product === c.product && !l.second && satisfies(l.known, c.grade))
      .reduce((a, l) => a + Math.min(l.t, reserved.get(l.id) ?? 0), 0);
    return left - inStock > 1e-6;
  });
}

/** Kontrakten en ovn produserer for: ovn 1 den første i køen, de andre kan ta neste kvalitet (B-039) */
export function furnaceOrder(g: GameState, index: number): Contract | null {
  const grade = furnaceGrade(g, index);
  return ordersToMake(g).find((c) => c.grade === grade) ?? null;
}

/**
 * Når verket bytter til en kvalitet resepten ikke holder, legger skrapklasseren eller planleggeren om
 * resepten selv (sikreste blanding av skrapet som er åpent). Uten dem får spilleren et varsel (B-043).
 */
function ensureRecipe(g: GameState, grade: GradeId, stats: PlantStats): void {
  const recipe = gradeRecipe(g, grade);
  if (recipeEstimate(g, grade, stats, recipe).grades.includes(grade)) return;
  const who = hasGrader(g) ? "Skrapklasseren" : hasPlanner(g) ? "Planleggeren" : null;
  const name = GRADES[grade].name.toLowerCase();
  if (!who) {
    log(g, `Resepten holder ikke kravet til ${name}. Juster den under Marked – eller ansett en skrapklasser.`, "event");
    return;
  }
  const next = suggestRecipe(g, grade, stats, "sikker");
  if (!next) {
    log(g, `${who} finner ingen blanding av skrapet du har tilgang til som holder ${name}.`, "event");
    return;
  }
  if (grade === g.targetGrade) g.recipe = { ...next.recipe };
  g.gradeRecipes[grade] = { ...next.recipe };
  log(g, `${who} la om resepten til ${name}, så den holder kravet.`, "info");
}

/** Ovnen følger ordrekøen: kvaliteten (og resepten for den) til ordren som produseres. */
function followQueue(g: GameState, stats: PlantStats): void {
  if (!g.settings.followQueue) return;
  const orders = ordersToMake(g);
  const order = orders[0];
  if (order && order.grade !== g.targetGrade) {
    g.gradeRecipes[g.targetGrade] = { ...g.recipe };
    g.targetGrade = order.grade;
    const saved = g.gradeRecipes[order.grade];
    if (saved) g.recipe = { ...saved };
    ensureRecipe(g, order.grade, stats);
  }
  // Ovn 2 (og 3 …) tar neste kvalitet i køen, hvis det er en annen (B-039)
  const other = g.settings.splitGrades ? orders.find((c) => c.grade !== g.targetGrade) : undefined;
  const before = g.furnaces[1]?.grade ?? null;
  for (let i = 1; i < g.furnaces.length; i++) g.furnaces[i].grade = other?.grade ?? null;
  if (other && other.grade !== before) ensureRecipe(g, other.grade, stats);
}

/** Planleggeren sorterer køen etter frist. */
function plannerSort(g: GameState): void {
  if (!hasPlanner(g) || !g.settings.plannerSorts) return;
  orderQueue(g)
    .sort((a, b) => a.deadlineDay - b.deadlineDay)
    .forEach((c, i) => (c.priority = i + 1));
}

/**
 * Oppdager kunden at stålet ikke holder? Små kunder i garasjen og verkstedet godtar litt over kravet
 * (10 %) og sjekker ikke alt; større kunder sjekker nesten alltid (B-034).
 */
function complains(g: GameState, a: Analysis, grade: GradeId): boolean {
  if (satisfies(a, grade)) return false;
  if (g.stage <= 1) {
    const spec = GRADES[grade];
    const tolerant = a.p <= spec.pMax * 1.1 && a.tramp <= spec.trampMax * 1.1 && a.c <= spec.cMax * 1.1 && a.c >= spec.cMin * 0.9;
    if (tolerant) return false;
    return chance(g, 0.6);
  }
  return chance(g, 0.8);
}

/** Omtrent hvor mye verket faktisk lager per døgn: snittet av de siste døgnene, eller et forsiktig anslag */
export function realisticDailyT(g: GameState, stats: PlantStats): number {
  const recent = g.history.slice(-3).filter((d) => d.producedT > 0);
  const est = recent.length >= 2 ? recent.reduce((a, d) => a + d.producedT, 0) / recent.length : stats.dailyProductT * 0.8;
  return Math.max(0.05, Math.min(stats.dailyProductT, est));
}

function deliverContracts(g: GameState): void {
  const active = orderQueue(g);
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
      if (complains(g, lot.analysis, c.grade)) {
        const failures = gradeFailures(lot.analysis, c.grade);
        // Flere dårlige partier til samme kontrakt blir én reklamasjon (B-034)
        const open = g.complaints.find((x) => x.contractId === c.id);
        if (open) {
          open.tonnes = (open.tonnes ?? 0) + take;
          open.refund += take * c.pricePerT;
          open.repLoss = Math.max(0.5, (1 + c.repGain * 2) * (open.tonnes / c.tonnes));
          open.text = `${c.customer} reklamerer på ${fmtT(open.tonnes)} ${PRODUCTS[c.product].name.toLowerCase()} levert fra dag ${open.deliveredDay}: ${failures.join(", ")}.`;
        } else {
          g.complaints.push({
            contractId: c.id,
            deliveredDay: day(g),
            tonnes: take,
            dueMin: g.minute + uniform(g, 0.5, 2.5) * MIN_PER_DAY,
            customer: c.customer,
            text: `${c.customer} reklamerer på ${fmtT(take)} ${PRODUCTS[c.product].name.toLowerCase()} levert dag ${day(g)}: ${failures.join(", ")}.`,
            refund: take * c.pricePerT,
            // Omdømmetapet følger hvor stor del av kontrakten som var feil
            repLoss: Math.max(0.5, (1 + c.repGain * 2) * (take / c.tonnes)),
          });
        }
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
      countEvent(g, "leveranser");
      adjustMorale(g, 0.5);
      awardPoints(g, 1 + g.stage);
      log(g, `Kontrakten med ${c.customer} er levert. Omdømme +${gain.toFixed(1)}.`, "good");
      if (g.totals.contractsDone === 1) unlock(g, "omdomme");
      if (c.agreementId) agreementWeekClosed(g, c, true);
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
    // Samme kontrakt trekker omdømme bare én gang (B-034)
    const contract = g.contracts.find((x) => x.id === c.contractId);
    if (contract?.complained) {
      log(g, `${c.text} Kunden får pengene tilbake (${fmtKr(c.refund)}). Samme ordre som før, så ikke mer tap av omdømme.`, "bad");
      continue;
    }
    if (contract) contract.complained = true;
    repLoss(g, c.repLoss, "reklamasjon");
    adjustMorale(g, -1);
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

/**
 * Kunde, vare og kvalitet til en ny forespørsel. Har spilleren valgt hvilke kvaliteter hen vil ha,
 * spør bare kunder som kjøper noen av dem (B-042).
 */
function pickCustomer(
  g: GameState,
  stats: PlantStats,
): { customer: (typeof CUSTOMERS)[number]; product: ProductId; grade: GradeId } | null {
  const wanted = g.settings.offerGrades ?? [];
  const gradesFor = (c: (typeof CUSTOMERS)[number]) => {
    const open = c.grades.filter((id) => GRADES[id].minStage <= g.stage);
    const list = open.length ? open : c.grades;
    return wanted.length ? list.filter((id) => wanted.includes(id)) : list;
  };
  const eligible = CUSTOMERS.filter(
    (c) =>
      c.minStage <= g.stage &&
      c.maxStage >= g.stage &&
      c.products.some((p) => stats.products.includes(p)) &&
      gradesFor(c).length > 0,
  );
  if (!eligible.length) return null;
  const customer = pick(g, eligible);
  const product = pick(
    g,
    customer.products.filter((p) => stats.products.includes(p)),
  );
  return { customer, product, grade: pick(g, gradesFor(customer)) };
}

function makeOffer(g: GameState, stats: PlantStats): Contract | null {
  const picked = pickCustomer(g, stats);
  if (!picked) return null;
  const { customer, product, grade } = picked;
  const capacity = Math.max(0.1, stats.dailyProductT);
  // En kontrakt skal være et lite prosjekt: 1,5–4 døgns produksjon, ikke noe som er ferdig på sekunder
  // De første kontraktene i garasjen er små, så starten går fort og man ser at det virker (B-033)
  const firstOrders = g.stage === 0 && g.totals.contractsDone + g.contracts.filter((c) => c.status === "aktiv").length < 2;
  const workDays = firstOrders ? uniform(g, 0.4, 0.8) : uniform(g, CONTRACT_DAYS[0], CONTRACT_DAYS[1]);
  const tonnes = roundTonnes(Math.max(customer.minT, Math.min(customer.maxT, capacity * workDays)));
  const pricePerT = Math.round(productPrice(g, product, grade) * (1 + stats.priceBonus) * uniform(g, 0.95, 1.1));
  const days = Math.min(30, Math.ceil(tonnes / (Math.min(capacity, realisticDailyT(g, stats)) * 0.6)) + randInt(g, 2, 4));
  const today = day(g);
  const size = Math.min(3, tonnes / capacity);
  // Små verk får mer omdømme per kontrakt, så starten ikke står og stamper på omdømmet (B-034)
  const early = g.stage === 0 ? 1.5 : 1;
  const repGain = Math.round((0.4 + 0.5 * size) * (GRADES[grade].premium > 1.1 ? 1.3 : 1) * early * 10) / 10;
  return {
    id: g.nextContractId++,
    customer: customer.name,
    product,
    grade,
    tonnes,
    delivered: 0,
    pricePerT,
    deadlineDay: today + days,
    // Tilbudet står åpent 8–20 timer før kunden går videre
    offerExpiresMin: g.minute + uniform(g, 8, 20) * 60,
    repGain,
    repLoss: Math.round((repGain * 3 + 2) * 10) / 10,
    // Ulevert stål koster halve kontraktsprisen i bot (se B-020)
    penaltyPerT: Math.round(pricePerT * 0.5),
    status: "tilbud",
    closedDay: null,
    priority: 0,
  };
}

/** Aldri flere åpne forespørsler enn dette samtidig */
const MAX_OPEN_OFFERS = 3;

/** Forespørsler kommer spredt gjennom døgnet i stedet for alle om morgenen. */
function trickleOffers(g: GameState, stats: PlantStats): void {
  if (g.bonusOffer) {
    const offer = makeOffer(g, stats);
    if (offer) {
      offer.pricePerT = Math.round(offer.pricePerT * 1.15);
      offer.repGain = Math.round(offer.repGain * 1.5 * 10) / 10;
      offer.customer = `${offer.customer} (etter besøket)`;
      g.contracts.push(offer);
    }
    g.bonusOffer = false;
    return;
  }
  if (g.settings.pauseOffers) return;
  if (chance(g, (stats.offersPerDay * 0.6) / 24)) generateOffers(g, stats, 1);
}

function expireOffers(g: GameState): void {
  for (const c of g.contracts) {
    if (c.status === "tilbud" && c.offerExpiresMin <= g.minute) {
      c.status = "misligholdt";
      c.closedDay = -1;
      log(g, `Forespørselen fra ${c.customer} gikk ut uten svar.`, "info");
    }
  }
  g.contracts = g.contracts.filter((c) => c.closedDay !== -1);
}

function generateOffers(g: GameState, stats: PlantStats, count?: number): void {
  const n = count ?? Math.floor(stats.offersPerDay + rand(g));
  const open = g.contracts.filter((c) => c.status === "tilbud").length;
  for (let i = 0; i < n && open + i < MAX_OPEN_OFFERS; i++) {
    const offer = makeOffer(g, stats);
    if (offer) g.contracts.push(offer);
  }
}

// ------------------------------------------------------------------ //
// Rammeavtaler (B-040)
// ------------------------------------------------------------------ //
/** Rammeavtaler kommer fra stålverket */
export const AGREEMENT_STAGE = 3;
/** Så mange aktive rammeavtaler kundene gir deg samtidig, per nivå */
const MAX_AGREEMENTS = [0, 0, 0, 2, 3];
/** Uker uten full leveranse før kunden sier opp avtalen */
export const AGREEMENT_MAX_MISSED = 2;

function makeAgreement(g: GameState, stats: PlantStats): Agreement | null {
  const picked = pickCustomer(g, stats);
  if (!picked) return null;
  const { customer, product, grade } = picked;
  // En fast del av det verket faktisk lager: en femdel til to femdeler av en ukes produksjon
  const weekly = Math.min(stats.dailyProductT, realisticDailyT(g, stats)) * 7;
  const weeklyT = roundTonnes(weekly * uniform(g, 0.2, 0.4));
  const weeks = randInt(g, 4, 10);
  const pricePerT = Math.round(productPrice(g, product, grade) * (1 + stats.priceBonus) * uniform(g, 0.97, 1.04));
  return {
    id: g.nextAgreementId++,
    customer: customer.name,
    product,
    grade,
    weeklyT,
    pricePerT,
    weeks,
    weeksSent: 0,
    weeksDone: 0,
    weeksMissed: 0,
    nextDay: 0,
    bonusKr: Math.round((weeklyT * weeks * pricePerT * 0.05) / 1000) * 1000,
    bonusRep: Math.round((2 + weeks * 0.4) * 10) / 10,
    status: "tilbud",
    offerExpiresMin: g.minute + 2 * MIN_PER_DAY,
    closedDay: null,
  };
}

/** Legger ukens leveranse i ordrekøen som en vanlig kontrakt med sju døgns frist */
function sendAgreementWeek(g: GameState, a: Agreement): void {
  const today = day(g);
  a.weeksSent += 1;
  a.nextDay = today + 7;
  const repGain = 0.3;
  g.contracts.push({
    id: g.nextContractId++,
    agreementId: a.id,
    customer: a.customer,
    product: a.product,
    grade: a.grade,
    tonnes: a.weeklyT,
    delivered: 0,
    pricePerT: a.pricePerT,
    deadlineDay: today + 6,
    offerExpiresMin: g.minute,
    repGain,
    repLoss: 2,
    penaltyPerT: Math.round(a.pricePerT * 0.5),
    status: "aktiv",
    closedDay: null,
    priority: Math.max(0, ...g.contracts.filter((x) => x.status === "aktiv").map((x) => x.priority)) + 1,
  });
  log(
    g,
    `Rammeavtalen med ${a.customer}, uke ${a.weeksSent} av ${a.weeks}: ${fmtT(a.weeklyT)} ${GRADES[a.grade].name.toLowerCase()} innen dag ${today + 6}.`,
    "info",
  );
}

/** En ukeleveranse er levert eller gikk ut: tell den, og gi bonus eller si opp avtalen */
function agreementWeekClosed(g: GameState, c: Contract, ok: boolean): void {
  const a = g.agreements.find((x) => x.id === c.agreementId);
  if (!a || a.status !== "aktiv") return;
  if (ok) a.weeksDone += 1;
  else a.weeksMissed += 1;
  if (a.weeksMissed >= AGREEMENT_MAX_MISSED) {
    a.status = "brutt";
    a.closedDay = day(g);
    repLoss(g, a.bonusRep, "sen");
    log(
      g,
      `${a.customer} sa opp rammeavtalen etter ${AGREEMENT_MAX_MISSED} uker uten full leveranse. Omdømme −${a.bonusRep.toFixed(1)}.`,
      "bad",
    );
    return;
  }
  if (a.weeksDone + a.weeksMissed < a.weeks) return;
  a.status = "fullfort";
  a.closedDay = day(g);
  if (a.weeksMissed === 0) {
    addIncome(g, "kontrakt", a.bonusKr);
    adjustReputation(g, a.bonusRep);
    awardPoints(g, 2 + g.stage);
    log(
      g,
      `Rammeavtalen med ${a.customer} er fullført, alle uker i tide! Bonus ${fmtKr(a.bonusKr)} og omdømme +${a.bonusRep.toFixed(1)}.`,
      "good",
    );
  } else {
    log(g, `Rammeavtalen med ${a.customer} er fullført. En uke kom for sent, så det ble ingen bonus.`, "info");
  }
}

/**
 * Lager verket ikke lenger varen i en rammeavtale (ny støping eller valseverk), avsluttes avtalen
 * uten straff, og ukeleveransen som står i køen strykes (B-040).
 */
function endStaleAgreements(g: GameState, stats: PlantStats): void {
  for (const a of g.agreements) {
    if (a.status !== "aktiv" || stats.products.includes(a.product)) continue;
    a.status = "brutt";
    a.closedDay = day(g);
    g.contracts = g.contracts.filter((c) => !(c.agreementId === a.id && c.status === "aktiv"));
    log(
      g,
      `Rammeavtalen med ${a.customer} er avsluttet uten straff: verket lager ikke ${PRODUCTS[a.product].name.toLowerCase()} lenger.`,
      "event",
    );
  }
}

/** Hvert døgn: ukeleveranser, nye tilbud om rammeavtaler og tilbud som går ut */
function updateAgreements(g: GameState, stats: PlantStats): void {
  const today = day(g);
  for (const a of g.agreements) {
    if (a.status === "tilbud" && a.offerExpiresMin <= g.minute) {
      a.status = "brutt";
      a.closedDay = -1;
      log(g, `Tilbudet om rammeavtale fra ${a.customer} gikk ut.`, "info");
    }
    if (a.status === "aktiv" && a.weeksSent < a.weeks && a.nextDay <= today) sendAgreementWeek(g, a);
  }
  g.agreements = g.agreements.filter(
    (a) => a.closedDay !== -1 && (a.status === "tilbud" || a.status === "aktiv" || (a.closedDay ?? 0) >= today - 10),
  );
  const max = MAX_AGREEMENTS[g.stage] ?? 0;
  const active = g.agreements.filter((a) => a.status === "aktiv").length;
  const open = g.agreements.some((a) => a.status === "tilbud");
  if (max > 0 && !open && active < max && !g.settings.pauseOffers && chance(g, 0.2)) {
    const a = makeAgreement(g, stats);
    if (!a) return;
    g.agreements.push(a);
    log(
      g,
      `${a.customer} vil ha en rammeavtale: ${fmtT(a.weeklyT)} i uka i ${a.weeks} uker til fast pris. Se Salg.`,
      "event",
    );
  }
}

export function acceptAgreement(g: GameState, id: number): PurchaseResult {
  const a = g.agreements.find((x) => x.id === id);
  if (!a || a.status !== "tilbud") return { ok: false, message: "Tilbudet finnes ikke lenger." };
  a.status = "aktiv";
  log(g, `Du signerte en rammeavtale med ${a.customer}: ${fmtT(a.weeklyT)} i uka i ${a.weeks} uker.`, "info");
  sendAgreementWeek(g, a);
  return { ok: true, message: "Rammeavtale signert." };
}

export function declineAgreement(g: GameState, id: number): void {
  g.agreements = g.agreements.filter((a) => !(a.id === id && a.status === "tilbud"));
}

export function acceptContract(g: GameState, id: number): PurchaseResult {
  const c = g.contracts.find((x) => x.id === id);
  if (!c || c.status !== "tilbud") return { ok: false, message: "Tilbudet finnes ikke lenger." };
  c.status = "aktiv";
  c.priority = Math.max(0, ...g.contracts.filter((x) => x.status === "aktiv" && x.id !== c.id).map((x) => x.priority)) + 1;
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
    "planlegger",
    "klasser",
    "murer",
  ];
  const r =
    role ??
    pick(
      g,
      roles
        .filter((x) => x !== "valse" || g.stage >= 3)
        .filter((x) => x !== "lab" || g.stage >= 3)
        .filter((x) => x !== "planlegger" || g.stage >= 2)
        .filter((x) => x !== "klasser" || g.stage >= 1)
        .filter((x) => x !== "murer" || g.stage >= 3),
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
  ensureCandidates(g);
}

/** Det skal alltid finnes søkere til plassene som mangler for neste skift (B-034) */
export function ensureCandidates(g: GameState): void {
  if (STAGES[g.stage].staffCap === 0) return;
  const missing = computePlantStats(g).missing;
  for (const [role, count] of Object.entries(missing) as [RoleId, number][]) {
    const have = g.candidates.filter((c) => c.role === role).length;
    for (let i = have; i < Math.min(count, 4); i++) g.candidates.push(makeCandidate(g, role));
  }
}

/** Nye søkere med en gang, f.eks. når man flytter til et nytt nivå */
export function newCandidates(g: GameState): void {
  refreshCandidates(g);
}

// ------------------------------------------------------------------ //
// Døgn og time
// ------------------------------------------------------------------ //
/** Murerne murer opp reservepottene til lysbueovnene (B-030) */
function updatePots(g: GameState, stats: PlantStats, dt: number): void {
  if (!stats.furnace.arc) return;
  const perDay = potRebuildPerDay(g);
  if (perDay <= 0 || !masonsAtWork(g)) return;
  g.furnaces.forEach((f, i) => {
    if (f.spareProgress >= 1) return;
    // Hele døgnets oppmuring gjøres i arbeidstida
    f.spareProgress = Math.min(1, f.spareProgress + (perDay * dt) / (MASON_HOURS * 60));
    if (f.spareProgress >= 1) log(g, `Murerne er ferdige: reservepotta til ovn ${i + 1} er klar.`, "good");
  });
}

/**
 * Fravær (B-031): ferie kommer automatisk med tre døgns varsel, og enkeltpersoner kan bli syke –
 * oftere når trivselen er lav eller verket går nattskift. Ledige avløsere dekker plassene.
 */
/** Leier inn vikarer som dekker alle som er borte, i et antall døgn (B-031, B-039) */
export function bookTemps(g: GameState, days: number, auto = false): void {
  const cost = tempsCost(g, days);
  addCost(g, "lonn", cost);
  g.tempsUntilMin = Math.max(g.tempsUntilMin ?? 0, g.minute) + days * MIN_PER_DAY;
  log(
    g,
    `Vikarer er leid inn${auto ? " automatisk" : ""} til dag ${day(g, g.tempsUntilMin - 1)} (${fmtKr(cost)}). De dekker alle som er borte.`,
    auto ? "event" : "info",
  );
}

/**
 * Vikarer når fravær koster skift: automatisk hvis spilleren har slått det på, ellers et varsel
 * når vikarene går hjem mens folk fortsatt er borte (B-039).
 */
function checkTemps(g: GameState): void {
  if (tempsActive(g)) return;
  const absent = g.workers.filter((w) => isAbsent(g, w));
  if (!absent.length) return;
  const full = staffing(g, true).shifts;
  const now = staffing(g).shifts;
  if (now >= full) return;
  if (g.settings.autoTemps) {
    bookTemps(g, daysUntilAllBack(g), true);
    return;
  }
  const until = g.tempsUntilMin ?? 0;
  if (until > g.minute - 60 && until <= g.minute)
    log(
      g,
      `Vikarene har gått hjem, men ${absent.length === 1 ? absent[0].name : `${absent.length} ansatte`} er fortsatt borte. Verket går ${now} skift i stedet for ${full}. Lei inn nye vikarer under Folk.`,
      "bad",
    );
}

/**
 * Strømavtalen når bindingstida er ute (B-042): fornyes hvis spilleren har valgt det, ellers tilbake til
 * spotpris, som er standard. Varsel tre døgn og ett døgn før.
 */
function updatePowerDeal(g: GameState, today: number): void {
  const s = g.settings;
  if (s.powerDeal === "spot") return;
  const name = s.powerDeal === "fast" ? "Fastprisavtalen" : "Nattariffen";
  const left = s.powerDealUntilDay - today;
  if (left === 3 || left === 1)
    log(
      g,
      `${name} for strøm går ut om ${left === 1 ? "ett døgn" : "tre døgn"} (dag ${s.powerDealUntilDay}). ${s.powerAutoRenew ? "Den fornyes av seg selv." : "Da går du tilbake til spotpris – velg ny avtale under Marked hvis du vil."}`,
      "event",
    );
  if (left > 0) return;
  if (s.powerAutoRenew) {
    s.powerDealUntilDay = today + POWER_BINDING_DAYS;
    if (s.powerDeal === "fast") s.powerFixedPrice = fixedPowerOffer(g);
    log(
      g,
      `${name} for strøm er fornyet i ${POWER_BINDING_DAYS} døgn${s.powerDeal === "fast" ? ` til ${s.powerFixedPrice.toFixed(2).replace(".", ",")} kr/kWh` : ""}.`,
      "event",
    );
    return;
  }
  s.powerDeal = "spot";
  s.powerDealUntilDay = 0;
  log(g, `${name} for strøm gikk ut. Du betaler nå spotpris, time for time, til du velger en ny avtale.`, "event");
}

function updateAbsence(g: GameState, stats: PlantStats): void {
  if (!g.workers.length) return;
  const today = day(g);
  const vacationCap = Math.max(1, Math.floor(g.workers.length * 0.1));
  const onVacation = (from: number, until: number) =>
    g.workers.filter((w) => w.absentReason === "ferie" && w.absentFrom! < until && w.absentUntil! > from).length;
  for (const w of g.workers) {
    if (w.absentUntil !== undefined && g.minute >= w.absentUntil) {
      w.absentFrom = w.absentUntil = w.absentReason = undefined;
    }
    if (w.absentReason === "ferie" && w.absentFrom !== undefined && Math.abs(w.absentFrom - g.minute) < 60)
      log(g, `${w.name} (${ROLES[w.role].name.toLowerCase()}) har ferie fra i dag til dag ${day(g, w.absentUntil! - 1)}.`, "event");
    if (w.nextVacationDay === undefined) w.nextVacationDay = today + randInt(g, 10, 110);
    const busy = w.absentUntil !== undefined;
    // Ferie: varsles tre døgn før, maks en tidel av de ansatte samtidig
    if (!busy && today >= w.nextVacationDay - 3) {
      const len = randInt(g, 3, 5);
      const from = (Math.max(w.nextVacationDay, today + 1) - 1) * MIN_PER_DAY;
      const until = from + len * MIN_PER_DAY;
      if (onVacation(from, until) >= vacationCap) {
        w.nextVacationDay += 3;
        continue;
      }
      w.absentFrom = from;
      w.absentUntil = until;
      w.absentReason = "ferie";
      w.nextVacationDay = day(g, until) + randInt(g, 100, 140);
      log(g, `${w.name} (${ROLES[w.role].name.toLowerCase()}) får ferie dag ${day(g, from)}–${day(g, until - 1)}.`, "event");
      continue;
    }
    // Sykdom
    const risk = 0.005 * (1 + Math.max(0, 60 - g.morale) / 60) * (nightExtra(g, stats.hours) > 0 ? 1.3 : 1);
    if (!busy && chance(g, risk)) {
      const len = randInt(g, 1, 3);
      w.absentFrom = g.minute;
      w.absentUntil = g.minute + len * MIN_PER_DAY;
      w.absentReason = "syk";
      log(g, `${w.name} (${ROLES[w.role].name.toLowerCase()}) er syk ${len === 1 ? "i dag" : `i ${len} døgn`}.`, "event");
    }
  }
}

/** Trivselen driver mot det normale, nattarbeid tærer, og misfornøyde folk slutter (B-026) */
function updateMorale(g: GameState, stats: PlantStats): void {
  if (!g.workers.length) return;
  g.morale += (60 - g.morale) * 0.05;
  if (nightExtra(g, stats.hours) > 0) adjustMorale(g, -1.5);
  if (g.morale < 35) {
    const quitters = g.workers.filter(() => chance(g, ((35 - g.morale) / 35) * 0.04));
    if (quitters.length) {
      g.workers = g.workers.filter((w) => !quitters.includes(w));
      log(
        g,
        `${quitters.map((w) => w.name).join(", ")} sa opp. Trivselen er lav – gi bonus, send folk på kurs eller unngå nattskift.`,
        "bad",
      );
    }
  }
}

function onHour(g: GameState, stats: PlantStats): void {
  // Varsel når kassa går tom og kassekreditten tas i bruk (B-033)
  if (g.cash < 0 && !g.inCredit) {
    g.inCredit = true;
    log(g, `Kassa er tom – du bruker nå kassekreditten (grense ${fmtKr(creditLimit(g, stats))}).`, "bad");
  } else if (g.cash >= 0) g.inCredit = false;
  maybeTip(g, stats);
  checkTemps(g);
  // Kapitlene forskningen krever, kommer i fagboka når forskningen blir synlig (B-025)
  for (const r of RESEARCH) if (r.reads && r.stage <= g.stage) unlock(g, r.reads);
  checkMissions(g);
  expireOffers(g);
  trickleOffers(g, stats);
  deliverContracts(g);
  // Støpefeil håndteres automatisk etter valget (B-035)
  handleSeconds(g);
  if (g.settings.autoSpot) {
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
  plannerSort(g);
  followQueue(g, stats);
  // Automatisk innkjøp krever en planlegger (se B-021)
  if (g.settings.autoBuy && hasPlanner(g)) autoBuy(g, stats);
}

/**
 * Kjøper skrap etter resepten for et par døgns forbruk (planleggerens jobb, eller spillerens).
 * Planleggeren holder seg innenfor døgngrensen, og bruker bare kassekreditten hvis spilleren
 * har tillatt det; ellers lar den lønn og faste kostnader for ett døgn ligge igjen i kassa (B-027).
 */
export function autoBuy(
  g: GameState,
  stats: PlantStats,
  opts: { credit: boolean; cap: number | null } = { credit: g.settings.autoBuyCredit, cap: g.settings.autoBuyMaxPerDay },
): void {
  // Med flere kvaliteter samtidig kjøpes skrap etter alle ovnenes resepter (B-039)
  const recipe = Object.fromEntries(SCRAP_IDS.map((id) => [id, 0])) as Record<ScrapId, number>;
  for (let i = 0; i < g.furnaces.length; i++) {
    const r = gradeRecipe(g, furnaceGrade(g, i));
    const sum = SCRAP_IDS.reduce((a, id) => a + r[id], 0) || 1;
    for (const id of SCRAP_IDS) recipe[id] += (r[id] / sum) * 100;
  }
  const recipeIds = SCRAP_IDS.filter((id) => recipe[id] > 0 && SCRAP_TYPES[id].buyable && scrapUnlocked(g, id));
  const total = SCRAP_IDS.reduce((a, id) => a + recipe[id], 0);
  if (!recipeIds.length || total <= 0) return;
  const need = Math.max(
    stats.sizeT * stats.furnaceCount * 2,
    (stats.dailyProductT / stats.castYield) * 1.1 * g.settings.autoBuyDays,
  );
  for (const id of recipeIds) {
    const target = (need * recipe[id]) / total;
    const stock = g.scrap[id].t;
    if (stock >= target * 0.6) continue;
    const s = computePlantStats(g);
    const reserve = stats.salaryPerDay + STAGES[g.stage].fixedPerDay;
    let money = opts.credit ? g.cash + creditLimit(g) * 0.9 : g.cash - reserve;
    if (opts.cap !== null) money = Math.min(money, opts.cap - (g.today.autoBuyKr ?? 0));
    const afford = Math.max(0, money / scrapPrice(g, id));
    const amount = Math.min(target - stock, afford, s.yardT - s.yardUsed);
    if (amount <= stats.sizeT * 0.1) continue;
    const before = g.cash;
    buyScrap(g, id, amount, s);
    g.today.autoBuyKr = (g.today.autoBuyKr ?? 0) + (before - g.cash);
  }
}

function walk(g: GameState, value: number, mean: number, pull: number, sd: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value + (mean - value) * pull + noise(g, sd)));
}

function onDay(g: GameState, stats: PlantStats): void {
  const today = day(g);
  // Effekttariff for døgnet som er slutt: betales for den høyeste effekten verket trakk
  if (g.today.peakMW) addCost(g, "nett", g.today.peakMW * PEAK_RATE_PER_MW);
  {
    const t = g.today;
    const cast = (t.onGradeT ?? 0) + (t.offGradeT ?? 0) + (t.secondT ?? 0);
    if ((t.onGradeT ?? 0) > 0 && !t.offGradeT) countEvent(g, "rene_dogn");
    if (cast > 0 && (t.secondT ?? 0) / cast < 0.03) countEvent(g, "fine_stopedogn");
    if ((t.kwh ?? 0) > 0 && (t.costs.energi ?? 0) / t.kwh! < 0.7) countEvent(g, "billig_strom");
  }
  g.today.cashEnd = g.cash;
  g.history.push(g.today);
  if (g.history.length > HISTORY_MAX) g.history.splice(0, g.history.length - HISTORY_MAX);
  g.today = newDay(today, g.cash);

  updatePowerDeal(g, today);
  if (g.gridCut && g.minute >= g.gridCut.untilMin) g.gridCut = null;

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
  endStaleAgreements(g, stats);
  for (const c of g.contracts) {
    if (c.status === "aktiv" && c.deadlineDay < today) {
      const remaining = c.tonnes - c.delivered;
      const penalty = remaining * c.penaltyPerT;
      addCost(g, "bot", penalty);
      repLoss(g, c.repLoss, "sen");
      c.status = "misligholdt";
      c.closedDay = today;
      log(
        g,
        `Fristen til ${c.customer} gikk ut med ${fmtT(remaining)} ulevert. Bot ${fmtKr(penalty)}, omdømme −${c.repLoss.toFixed(1)}.`,
        "bad",
      );
      unlock(g, "omdomme");
      if (c.agreementId) agreementWeekClosed(g, c, false);
    }
  }
  updateAgreements(g, stats);
  // Tilbud som gikk ut fjernes; avsluttede kontrakter vises i fem dager
  g.contracts = g.contracts.filter((c) =>
    c.status === "aktiv" ? true : c.status === "tilbud" ? true : (c.closedDay ?? 0) >= today - 5,
  );

  // Folk blir flinkere av å jobbe
  if (stats.hours > 0) {
    const growth = (hasResearch(g, "opplaering") ? 0.04 : 0.025) * (0.5 + g.morale / 100);
    for (const w of g.workers) w.skill = Math.min(5, w.skill + growth);
    if (stats.ownerWorks) g.ownerSkill = Math.min(4.5, g.ownerSkill + 0.04);
  }
  updateMorale(g, stats);
  updateAbsence(g, stats);
  refreshCandidates(g);
  if (!g.pendingDecision) maybeAdvisor(g);
  maybeCreateDecision(g);

  // Står verket fordi det ikke er råd til omforing, og lånet er fullt, er det slutt (B-033)
  const cantReline = g.furnaces.every((f) => (f.waitReason ?? "").includes("mangler penger til omforing"));
  if (cantReline && g.loan >= maxLoan(g) - 1) {
    g.stuckDays = (g.stuckDays ?? 0) + 1;
    if (g.stuckDays === 1)
      log(g, "Verket står: det er ikke råd til ny foring, og banken låner ikke ut mer. Skaff penger innen tre døgn.", "bad");
    if (g.stuckDays >= 3) {
      g.gameOver = true;
      g.speed = 0;
      g.gameOverReason = "Ovnen trengte ny foring, men det var ikke penger til det, og banken ville ikke låne ut mer.";
      log(g, "Banken har begjært verket konkurs.", "bad");
    }
  } else g.stuckDays = 0;

  // Banken
  if (g.cash < -creditLimit(g)) {
    g.negativeDays += 1;
    if (g.negativeDays === 1 || g.negativeDays >= BANKRUPTCY_DAYS - 2) {
      log(g, `Banken er bekymret: du er over kredittgrensen (dag ${g.negativeDays} av ${BANKRUPTCY_DAYS}).`, "bad");
    }
    if (g.negativeDays >= BANKRUPTCY_DAYS) {
      g.gameOver = true;
      g.speed = 0;
      g.gameOverReason = "Du var over kredittgrensen i en uke.";
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
  updatePots(g, stats, dt);
  // Effekttoppen: hvor mange ovner som smelter samtidig
  const mw = g.furnaces.filter((f) => f.heat).length * stats.furnaceMW;
  if (mw > (g.today.peakMW ?? 0)) g.today.peakMW = mw;
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
  chargeEnergy(g, kwh);
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
  if ((result.stars ?? 0) >= 4) countEvent(g, "gode_charger");
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
  chargeEnergy(g, kwh);
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
  if (abs >= 1_000_000_000) return `${sign}${nf2.format(abs / 1_000_000_000)} mrd. kr`;
  if (abs >= 1_000_000) return `${sign}${nf2.format(abs / 1_000_000)} mill. kr`;
  return `${sign}${nf0.format(abs)} kr`;
}

export function fmtT(t: number): string {
  if (t < 1) return `${nf0.format(t * 1000)} kg`;
  if (t < 100) return `${nf1.format(t)} t`;
  return `${nf0.format(t)} t`;
}
