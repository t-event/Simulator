/**
 * Spillmotoren: tid, produksjon, marked, kontrakter, folk og hendelser.
 *
 * advance() flytter spillet fram i steg på maks STEP_MIN spillminutter.
 * Produksjonen følger stålet gjennom kjeden skraplager → ovn → øse →
 * støping → (valseverk) → lager → kunde, og hver del kan bli flaskehals.
 */
import { hasNeighbor, reputationFloor } from "./building";
import {
  BANKRUPTCY_DAYS,
  CUSTOMERS,
  FIRST_NAMES,
  FURNACES,
  GRADES,
  GRADE_IDS,
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
import { auto, hasResearch, RESEARCH, scrapUnlocked, secondsAction } from "./research";
import { masteryFactor } from "./mastery";
import { checkMissions } from "./missions";
import { checkChallenges } from "./challenges";
import { directorDailyT, finishKonsernProjects, konsernDay, valueCreated } from "./konsern";
import { worldFactor } from "./world";
import { maybeAdvisor, maybeCreateDecision } from "./decisions";
import { maybeTip, setCreditHint } from "./tips";
import { envDay, envHour, envStartBlocked, newEnv, updateEmissions } from "./environment";
import { mouldHour, mouldRisk, wearMoulds } from "./mould";
import {
  calendarDay,
  inSummerBreak,
  isChristmas,
  riskFactor,
  roadOpensInH,
  scrapBlocked,
  SUMMER,
  summerStart,
  summerStop,
  summerStopDaysLeft,
  winterHour,
} from "./calendar";
import { warDay } from "./war";
import { explosion, explosionChance } from "./accidents";
import { scrapResearchFor, suggestRecipe } from "./recipe";
import type { Research } from "./research";
import {
  castingType,
  computePlantStats,
  crewBenefits,
  dealPrice,
  day,
  energyPrice,
  fixedPowerOffer,
  furnaceType,
  furnaceGrade,
  plannerOrders,
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
  liftMorale,
  moraleNormal,
  isAbsent,
  staffing,
  supportAdvice,
  plantRestartMin,
  tempsActive,
  tempsCost,
  MASON_HOURS,
  masonsAtWork,
  potRebuildPerDay,
  potSwapHours,
  POWER_BINDING_DAYS,
  productPrice,
  adminPerDay,
  marketSaturation,
  rollingActive,
  productCapT,
  rollingTph,
  ROLLING_YIELD,
  satisfies,
  specMargin,
  satisfiedGrades,
  type PlantStats,
  unitType,
  unitHas,
  unitView,
} from "./plant";
import { chance, noise, pick, rand, randInt, uniform } from "./random";
import { bornAt, pensionMorning, PENSION } from "./pension";
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
import { applyCashCap, paidOutDayLog } from "./reserve";
import { TREND, trendHits, trendPriceFactor, updateTrend } from "./trends";

export const SAVE_VERSION = 1;
const STEP_MIN = 10;
const LOG_MAX = 150;
const HISTORY_MAX = 120;

/**
 * Døgnregnskapet rundes før det legges i historikken (B-358): hele kroner, tonn og kWh holder, og tall som
 * 1594093.5234782605 gjorde historikken til den største delen av det lagrede spillet (ca. 70 kB av 165). Små tall
 * (under 100) beholder to desimaler.
 */
export function roundDay<T>(v: T): T {
  if (typeof v === "number") return (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100) as T;
  if (Array.isArray(v)) return v.map(roundDay) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, roundDay(x)])) as T;
  return v;
}

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
    addons: [],
  };
}

function newDay(dayNumber: number, cash: number): DayFinance {
  return { day: dayNumber, income: {}, costs: {}, producedT: 0, heats: 0, cashEnd: cash };
}

/**
 * Nytt spill i garasjen. Nytt spill+ (runde 2+ med bonus, B-090) er fjernet: sesongene erstatter det (B-141).
 * Feltet `round` står igjen for eldre lagringer.
 */
export function newGame(seed = Date.now()): GameState {
  const scrap = Object.fromEntries(SCRAP_IDS.map((id) => [id, emptyStock()])) as Record<ScrapId, ScrapStock>;
  const g: GameState = {
    version: SAVE_VERSION,
    // Hvilket spill dette er (B-259) – ikke fra frøet, så to nye spill aldri får samme
    gameId: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
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
      powerDryDays: 0,
      spotSoldToday: {},
      trend: null,
      nextTrendDay: 0,
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
      toasts: "alle",
      toastTopics: {},
      toastSeconds: 6,
      keepSpeed: false,
      pauseOnSales: true,
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
      plannerSells: true,
      autoBuyMaxPerDay: null,
      autoSpot: false,
      rolling: true,
      manualNext: false,
    },
    log: [],
    nextLogId: 1,
    today: newDay(1, START_CASH),
    history: [],
    totals: {
      producedT: 0,
      heats: 0,
      manualHeats: 0,
      contractsDone: 0,
      complaints: 0,
      maintKr: 0,
      kwh: 0,
      contractsMissed: 0,
      contractsCancelled: 0,
    },
    negativeDays: 0,
    gameOver: false,
    won: false,
    pendingManual: null,
    researchPoints: 0,
    round: 1,
    winSeen: false,
    courseSeats: null,
    pendingCastingSwitch: null,
    konsern: {
      unlocked: false,
      plants: [],
      shared: [],
      nextId: 1,
      director: null,
      milestones: 0,
      legends: 0,
      earned: 0,
      orders: [],
      treasury: null,
    },
    mastery: {},
    legendCelebrate: null,
    achievements: {},
    cosmetics: { owned: [], on: [] },
    daily: { date: null, missions: [], claimed: false },
    storeFullLogMin: -1e9,
    owner: null,
    season: null,
    seasonPromptSeen: null,
    tenderSeen: 0,
    takeoverSeen: "",
    bigBuild: null,
    neighborhood: { built: [], building: null },
    companyIncomeSeen: {},
    env: newEnv(),
    seasonLoginPromptSeen: null,
    world: { events: [], seenEventIds: [] },
    fpDealDay: -1,
    inboxSeenId: 0,
    researched: [],
    pendingDecision: null,
    decisionSeen: {},
    landmarks: { done: [], date: null, contractId: null },
    controlBest: 0,
    boostMin: 0,
    treasuryOut: 0,
    lockedReserve: null,
    paidOut: null,
    sickUntilMin: 0,
    tempsUntilMin: 0,
    tempCrew: null,
    automationResearch: true,
    recipeGuide: null,
    bonusOffer: false,
    celebrate: null,
    seenViews: ["verket", "marked", "salg"],
    tipsSeen: [],
    gridCut: null,
    readChapters: [],
    quizDone: [],
    quizScores: {},
    quizPartial: {},
    missions: {},
    counters: {},
    ratings: [],
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
  log(g, "Du låser opp garasjen. Induksjonsovnen er klar, og naboen har gitt deg ett tonn skrap.", "info");
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
  if (category === "vedlikehold") g.totals.maintKr += amount;
}

export function addIncome(g: GameState, category: IncomeCategory, amount: number): void {
  if (amount <= 0) return;
  g.cash += amount;
  g.today.income[category] = (g.today.income[category] ?? 0) + amount;
}

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
  g.totals.kwh = (g.totals.kwh ?? 0) + kwh;
  if (furnaceType(g).fuel === "strøm") {
    g.today.kwh = (g.today.kwh ?? 0) + kwh;
    // Hva den samme strømmen ville kostet med de andre avtalene, så spilleren kan sammenligne (B-105)
    const alt = (g.today.altEnergy ??= {});
    for (const deal of ["spot", "fast", "natt"] as const) alt[deal] = (alt[deal] ?? 0) + kwh * dealPrice(g, deal);
  }
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
  // Konserthuset (B-336): omdømmet synker ikke under 70 (når det først er der)
  const floor = g.reputation >= reputationFloor(g) ? reputationFloor(g) : 0;
  g.reputation = Math.max(floor, Math.min(100, g.reputation + delta));
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
  // Skrapterminalen kjøper inn i store partier (B-075); felles hendelser ganger prisen (B-129)
  return (
    SCRAP_TYPES[id].price *
    g.market.scrapFactor[id] *
    worldFactor(g, "scrap") *
    (has(g, "skrapterminal") ? 0.94 : 1) *
    (hasResearch(g, "skraplogistikk") ? 0.95 : 1) *
    (g.konsern?.shared.includes("innkjop") ? 0.95 : 1) *
    masteryFactor(g, "skrap")
  );
}

setCreditHint((g) => creditLimit(g));

/** Kassekreditten følger nivået og omsetningen verket kan ha (to døgns produksjon). */
/** Hva spilleren kan gjøre når kassa er under kredittgrensen (B-349) */
export const CREDIT_HELP =
  "Selg skrap du ikke trenger under Marked, ta opp lån under Verket → Økonomi, eller selg ferdigvarer fra lageret.";

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
  // Snøstorm (B-279): skrapbilene kommer ikke fram før veien er brøytet
  if (scrapBlocked(g))
    return {
      ok: false,
      message: `Veien er stengt av snøstorm. Skrapbilene kommer fram om ca. ${roadOpensInH(g)} timer.`,
    };
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

/** Hva skraphandleren betaler for skrap du selger (B-171): 60 % av prisen. Returskrap betales som tungt skrap */
export const SCRAP_SELL_SHARE = 0.6;
export function scrapSellPrice(g: GameState, id: ScrapId): number {
  return scrapPrice(g, SCRAP_TYPES[id].buyable ? id : "tungt") * SCRAP_SELL_SHARE;
}

/** Selger skrap fra lageret til skraphandleren, f.eks. skrap ingen resept bruker og som tar plass (B-171) */
export function sellScrap(g: GameState, id: ScrapId, t: number): PurchaseResult {
  const stock = g.scrap[id];
  const amount = Math.min(t, stock.t);
  if (amount <= 0.001) return { ok: false, message: "Ingenting å selge." };
  if (stock.radioactive) return { ok: false, message: "Skrapet kan være radioaktivt og kan ikke selges." };
  const value = amount * scrapSellPrice(g, id);
  stock.t -= amount;
  if (stock.t < 1e-9) g.scrap[id] = emptyStock();
  addIncome(g, "annet", value);
  return { ok: true, message: `Solgte ${fmtT(amount)} ${SCRAP_TYPES[id].name.toLowerCase()} for ${fmtKr(value)}.` };
}

interface Mix {
  analysis: Analysis;
  expected: Analysis;
  dirt: number;
  energy: number;
  radioactive: boolean;
}

/** Hva spilleren kan gjøre når ovnen står uten skrap: hvorfor planleggeren ikke har kjøpt, eller at noen må kjøpe (B-048) */
export function scrapStopHelp(g: GameState): string {
  const short = scrapShort(g);
  const what = short.length
    ? `Resepten trenger ${short.map((id) => SCRAP_TYPES[id].name.toLowerCase()).join(" og ")}.`
    : "";
  // Snøstorm (B-279): ingenting å gjøre før veien er brøytet, men neste gang hjelper et større lager
  if (scrapBlocked(g))
    return `${what} Veien er stengt av snøstorm, og skrapbilene kommer fram om ca. ${roadOpensInH(g)} timer. Hold mer skrap på lager om vinteren (planleggerens lagermengde under Marked → Planlegger).`.trim();
  if (!auto(g, "autoBuy") || !plannerOrders(g))
    return `${what} Kjøp det under Marked, eller ansett en planlegger som kjøper inn.`.trim();
  if (g.autoBuyNote && !g.settings.autoBuyCredit && g.autoBuyNote.includes("kassa"))
    return `Planleggeren får ikke kjøpt ${g.autoBuyNote}. Gi planleggeren lov til å bruke kassekreditten under Marked → Planlegger, ta opp lån under Verket → Økonomi, eller selg fra lageret.`;
  if (g.autoBuyNote) return `Planleggeren får ikke kjøpt ${g.autoBuyNote}.`;
  return `${what} Planleggeren bestiller mer.`.trim();
}

/**
 * Skraptypene ovnene mangler for neste charge: det resepten (for hver ovns kvalitet) skal ha, mer enn det som
 * ligger på lageret (B-049).
 */
export function scrapShort(g: GameState, stats = computePlantStats(g)): ScrapId[] {
  const need = Object.fromEntries(SCRAP_IDS.map((id) => [id, 0])) as Record<ScrapId, number>;
  for (let i = 0; i < g.furnaces.length; i++) {
    const r = gradeRecipe(g, furnaceGrade(g, i));
    const sum = SCRAP_IDS.reduce((a, id) => a + r[id], 0) || 1;
    for (const id of SCRAP_IDS) need[id] += ((stats.units[i]?.sizeT ?? stats.sizeT) * r[id]) / sum;
  }
  return SCRAP_IDS.filter((id) => need[id] > 1e-6 && g.scrap[id].t < need[id]);
}

/**
 * Skrapet som bør gi varsel (B-219): før varslet spillet hver gang en type i resepten var under én charge, også når
 * ovnen fyller opp med de andre typene, og når typen ikke kan kjøpes (returskrap). Nå:
 * - står neste charge i en ovn fast (ikke nok skrap å fylle med), vises typene som mangler;
 * - ellers, med planlegger som kjøper inn, ingen varsel – planleggeren kjøper det som mangler, og får den det ikke
 *   til, vises det med «!» på Marked (autoBuyNote);
 * - uten planlegger vises typene som mangler og kan kjøpes, så spilleren vet hva som skal kjøpes.
 */
export function scrapAlert(g: GameState, stats = computePlantStats(g)): ScrapId[] {
  const short = scrapShort(g, stats);
  if (!short.length) return [];
  const stuck = g.furnaces.some(
    (f, i) => !f.heat && !takeScrap(g, stats.units[i]?.sizeT ?? stats.sizeT, true, gradeRecipe(g, furnaceGrade(g, i))),
  );
  if (stuck) return short;
  if (auto(g, "autoBuy") && plannerOrders(g)) return [];
  return short.filter((id) => SCRAP_TYPES[id].buyable && scrapUnlocked(g, id));
}

/** Høyeste andel av en charge skrapklasseren fyller med verkets eget returskrap (B-208) */
export const RETURN_MAX_SHARE = 0.25;

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
  // Skrapklasseren smelter om verkets eget returskrap (B-208): kapp fra støping og valsing og omsmeltet sekunda. Det
  // bytter inn for kjøpt skrap som er minst like skittent (fosfor og sporelementer), inntil en fjerdedel av chargen. Uten dette hopet returskrapet seg opp, og lageret ble for fullt til å kjøpe det resepten trengte.
  if (grader && totalWeight > 0) {
    const ret = g.scrap.retur;
    // Det reseptene som skal ha retur, trenger til to charger per ovn, blir liggende
    const reserve = g.furnaces.reduce((a, _, i) => {
      const r = gradeRecipe(g, furnaceGrade(g, i));
      const sum = SCRAP_IDS.reduce((x, id) => x + r[id], 0) || 1;
      return a + (sizeT * 2 * r.retur) / sum;
    }, 0);
    const room = Math.min(ret.t - amounts.retur - reserve, sizeT * RETURN_MAX_SHARE - amounts.retur);
    // Induksjonsovnen brenner ikke av karbon: der må returen heller ikke gi mer karbon enn det den erstatter
    const decarb = g.furnaces.every((_, i) => unitType(g, i).decarb);
    const swap = SCRAP_IDS.filter((id) => {
      if (id === "retur" || amounts[id] <= 0) return false;
      const a = g.scrap[id].t > 0 ? g.scrap[id] : SCRAP_TYPES[id];
      return a.p >= ret.p && a.tramp >= ret.tramp && (decarb || a.c >= ret.c);
    });
    const swapT = swap.reduce((a, id) => a + amounts[id], 0);
    if (room > 1e-6 && swapT > 1e-6 && !ret.radioactive) {
      const take = Math.min(room, swapT);
      for (const id of swap) amounts[id] -= (take * amounts[id]) / swapT;
      amounts.retur += take;
    }
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
  // Skrapklasseren bytter inn skrap som er minst like rent (fosfor og sporelementer) når en type i resepten er tom,
  // f.eks. returskrap som ikke kan kjøpes, i stedet for å la ovnen vente (B-171)
  let substituted: ScrapId[] = [];
  if (short > 1e-6 && grader && g.settings.graderStrict !== false) {
    const empty = recipeIds.filter((id) => g.scrap[id].t - amounts[id] <= 1e-9);
    const maxP = Math.max(0, ...empty.map((id) => SCRAP_TYPES[id].p));
    const maxTramp = Math.max(0, ...empty.map((id) => SCRAP_TYPES[id].tramp));
    // Lagerets faktiske analyse avgjør, ikke standardanalysen: returskrap fra sekunda kan være skitnere enn vanlig
    // retur og ødelegge kvaliteten (B-397)
    const subs = SCRAP_IDS.filter(
      (id) =>
        !recipeIds.includes(id) &&
        g.scrap[id].p <= maxP &&
        g.scrap[id].tramp <= maxTramp &&
        g.scrap[id].t > 1e-9 &&
        !g.scrap[id].radioactive,
    );
    for (const id of subs) {
      if (short <= 1e-9) break;
      const take = Math.min(g.scrap[id].t, short);
      amounts[id] += take;
      short -= take;
      substituted.push(id);
    }
    if (short > 1e-6) substituted = [];
  }
  if (short > 1e-6) return null;
  if (substituted.length && !dryRun && g.graderSubDay !== day(g)) {
    g.graderSubDay = day(g);
    const missing = recipeIds.filter((id) => g.scrap[id].t - amounts[id] <= 1e-9);
    log(
      g,
      `Skrapklasseren brukte ${joinAnd(substituted.map((id) => SCRAP_TYPES[id].name.toLowerCase()))} i stedet for ${joinAnd(missing.map((id) => SCRAP_TYPES[id].name.toLowerCase()))}, som var tomt, så ovnen slapp å vente.`,
      "info",
    );
  }

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
  // Mesterskapet «Holdbare ovnspotter» (B-165) gjør foringen enda mer holdbar
  return (hasResearch(g, "ildfast") ? 0.85 : 1) * masteryFactor(g, "foring");
}

function tempOffRisk(g: GameState, stats: PlantStats): number {
  let risk = stats.furnace.id === "induksjon025" ? 0.14 : stats.furnace.arc ? 0.12 : 0.08;
  // Riktig temperatur til støping er øseovnsoperatørens jobb (B-037)
  if (stats.furnace.arc && has(g, "oseovn")) return 0.03 * (1.8 - 0.2 * ladleSkill(g));
  return risk * (1.3 - 0.1 * stats.crewSkill);
}

function startHeat(g: GameState, index: number, plant: PlantStats): boolean {
  // Størrelse, tid og strøm etter akkurat denne ovnen (B-074)
  const stats = unitView(plant, index);
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
      dephos: stats.dephos,
      kwhPerT: stats.kwhPerT * mix.energy,
      cycleMin: stats.cycleMin * mix.energy,
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
function heatEvents(g: GameState, index: number, plant: PlantStats): number {
  const stats = unitView(plant, index);
  const f = g.furnaces[index];
  // Om vinteren skjer havarier oftere (B-265)
  const m = stats.maintFactor * riskFactor(g);
  const furnace = stats.furnace;
  let extra = 0;
  // Eksplosjon: vann eller is i skrapet blir til damp i det flytende stålet (B-265)
  if (chance(g, explosionChance(g, stats.cycleMin))) {
    const hours = explosion(g, index, stats.repairFactor);
    const until = g.minute + stats.cycleMin + hours * 60;
    if (until > f.downUntilMin) {
      f.downUntilMin = until;
      f.downReason = "Havari: eksplosjon i ovnen";
    }
    extra += 30;
  }
  if (furnace.arc) {
    // Utstyr mot havarier per ovn (B-094)
    const regulated = unitHas(g, index, "elektroderegulering");
    const panels = unitHas(g, index, "panelvarsling");
    const arcFlash = 0.018 * m * (regulated ? 0.7 : 1) * (panels ? 0.5 : 1);
    if (chance(g, arcFlash)) {
      extra += 25;
      addCost(g, "vedlikehold", 15_000);
      if (chance(g, panels ? 0.1 : 0.3)) {
        const hours = 3 * stats.repairFactor;
        f.downUntilMin = Math.max(f.downUntilMin, g.minute + stats.cycleMin + hours * 60);
        f.downReason = "Havari: vannlekkasje etter overslag";
        addCost(g, "vedlikehold", 60_000);
        log(
          g,
          `Overslag i ovn ${index + 1} traff et vannkjølt panel. Ovnen stoppes for reparasjon (${hours.toFixed(1).replace(".", ",")} t).`,
          "bad",
        );
      } else {
        log(
          g,
          `Overslag i ovn ${index + 1}: en gnist slo over i støvet på ovnstaket (hvelvet). Taket må støvsuges.`,
          "event",
        );
      }
    }
    // Mange charger i døgnet på storverket: regulering og forskning skal til sammen gjøre brudd sjeldne (B-109)
    const steered = hasResearch(g, "elektrodestyring");
    if (chance(g, 0.014 * m * (regulated ? 0.25 : 1) * (steered ? 0.5 : 1))) {
      extra += 35;
      addCost(g, "vedlikehold", 35_000);
      const tip = !regulated
        ? " Hydraulisk elektroderegulering gir færre brudd."
        : !steered
          ? " Forskningen «Elektroderegulering» halverer bruddene."
          : "";
      log(g, `Elektrodebrudd i ovn ${index + 1}. Elektroden skjøtes, og chargen forsinkes.${tip}`, "event");
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

function finishHeat(g: GameState, index: number, plant: PlantStats): void {
  const stats = unitView(plant, index);
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
      `HAVARI: gjennombrenning i ovn ${index + 1}! Flytende stål gikk gjennom foringen (mursteinene inni ovnen). Ovnen repareres av seg selv og er i gang igjen om ca. ${hours.toFixed(0)} timer – du trenger ikke trykke på noe. Reparasjon ${fmtKr(cost)}, omdømme −5. Neste gang: trykk «Bytt foring» når foringen er nesten slitt – det koster bare ${fmtKr(stats.furnace.relineCost)} og ${stats.furnace.relineHours} timer.`,
      "bad",
    );
    unlock(g, "ildfast");
    return;
  }

  // Mange charger i et stort verk lærer deg mindre hver for seg
  // Fagpoeng per charge: færre jo flere charger verket kjører (B-026). To like ovner lærer deg ikke dobbelt
  // så mye: med flere ovner gir hver charge mindre (B-052)
  // En stor charge lærer deg mer enn en liten, men ikke i forhold til størrelsen: faktoren er kvadratroten av
  // størrelsen over 5 t. Ellers ga lysbueovnen (færre, større charger) bare en firedel av fagpoengene (B-062)
  const sizeFactor = Math.sqrt(Math.max(1, stats.sizeT / 5));
  awardPoints(
    g,
    // Storverket kjører så mange store charger at poengene hopet seg opp (B-092): lavere sats der
    (([0.5, 0.2, 0.15, 0.2, 0.1][g.stage] ?? 0.1) * sizeFactor) / Math.sqrt(Math.max(1, g.furnaces.length)),
  );
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
  plant = computePlantStats(g),
  why: "manuell" | "plan" | "reparatør" | "spesialist" = "manuell",
): PurchaseResult {
  // Foring, pris og tid etter akkurat denne ovnen (B-074)
  const stats = unitView(plant, index);
  const f = g.furnaces[index];
  if (!f) return { ok: false, message: "Ukjent ovn." };
  if (f.heat || f.holding) return { ok: false, message: "Ovnen må være tom før foringen kan byttes." };
  if (g.minute < f.downUntilMin) return { ok: false, message: "Ovnen står allerede." };
  const cost = stats.furnace.relineCost;
  // Omforing kan tas på kassekreditten: en ovn som står, tjener ingen penger
  if (g.cash - cost < -creditLimit(g)) return { ok: false, message: "Du har ikke råd til ny foring." };
  addCost(g, "vedlikehold", cost);
  // Hvem som bestilte omforingen, så spilleren ser at den ikke skjer av seg selv (B-063)
  const who = {
    manuell: " – du bestilte det",
    plan: " etter vedlikeholdsplanen",
    reparatør: " av reparatøren",
    spesialist: " av den innleide vedlikeholdsspesialisten",
  }[why];
  // Lysbueovn med ferdig reservepotte: bytt potte på noen timer, og la murerne mure opp den slitte (B-030)
  if (stats.furnace.arc && f.spareProgress >= 1) {
    const swap = potSwapHours(g, index) * stats.repairFactor;
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
  log(
    g,
    `Planlagt stans: ovn ${index + 1} fores om${who} (${fmtKr(cost)}, ${hours.toFixed(0)} timer).${inPlace}`,
    "info",
  );
  unlock(g, "ildfast");
  return { ok: true, message: "Omforing startet." };
}

function maxLadlesWaiting(g: GameState): number {
  return 1 + (has(g, "oseovn") ? 1 : 0) + (g.furnaceCount > 1 ? 1 : 0);
}

function updateFurnaces(g: GameState, stats: PlantStats): void {
  const open = isOpen(g, stats.hours);
  // Ovner som nettopp ble stående uten skrap; varsles samlet etter løkka (B-161)
  const stopped: { i: number; why: string }[] = [];
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
      // Hvor lenge det er igjen (B-281): spillerne trodde de måtte trykke på noe for å reparere
      const h = Math.max(1, Math.ceil((f.downUntilMin - g.minute) / 60));
      // Lange stanser (sommerstans, B-298) i døgn
      const left = h > 48 ? `${Math.ceil(h / 24)} døgn` : `${h} t`;
      f.waitReason = f.downReason ? `${f.downReason} · klar om ${left}` : f.downReason;
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
      auto(g, "autoReline") && presentWorkers(g).some((w) => w.role === "vedlikehold") && f.wear >= g.settings.relineAt;
    // Vedlikeholdsspesialisten fra rådgiveren (ti døgn) bytter ved 80 % slitasje
    const specialistDue = (g.specialists.havari ?? 0) > g.minute && f.wear >= 0.8;
    if (f.relineRequested || planDue || repairerDue || specialistDue) {
      const why = f.relineRequested ? "manuell" : planDue ? "plan" : repairerDue ? "reparatør" : "spesialist";
      if (startReline(g, i, stats, why).ok) {
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
    // Renseanlegget står, og spilleren har valgt å stoppe ovnene (B-263)
    const envWait = envStartBlocked(g, stats, i);
    if (envWait) {
      f.waitReason = envWait;
      continue;
    }
    if (g.settings.onePeak && g.furnaces.some((o, j) => j !== i && o.heat)) {
      f.waitReason = "Venter: bare én ovn smelter om gangen";
      continue;
    }
    if (
      g.settings.maxPowerPrice !== null &&
      unitView(stats, i).furnace.fuel === "strøm" &&
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
        hasGrader(g) && stats.yardUsed >= unitView(stats, i).sizeT ? "Mangler skrap til resepten" : "Tomt for skrap";
      // Tydelig varsel når en ovn blir stående uten skrap (B-033), for alle ovnene (B-161)
      if (was !== f.waitReason) stopped.push({ i, why: f.waitReason });
    }
  }
  if (stopped.length) {
    const who =
      g.furnaces.length === 1
        ? "Ovnen står"
        : `${stopped.length === 1 ? "Ovn" : "Ovnene"} ${joinAnd(stopped.map((s) => String(s.i + 1)))} står`;
    const why = stopped.some((s) => s.why === "Tomt for skrap") ? "skraplageret er tomt" : "mangler skrap til resepten";
    log(g, `${who}: ${why}. ${scrapStopHelp(g)}`, "bad");
  }
}

function joinAnd(parts: string[]): string {
  return parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} og ${parts[parts.length - 1]}`;
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

/**
 * Slår sammen like partier på lageret (B-353): samme vare, samme kvaliteter de holder og det samme som er målt
 * (`lotKey`). Før ble bare partier fra samme døgn slått sammen, og noen hadde over 1 000 partier armering liggende –
 * 300 kB i hver lagring på nett. Snittet av partier som holder de samme kvalitetene, holder dem også. Partier fra i går
 * og i dag står for seg, så salget etter ett døgn (autoSpot) virker som før. Det eldste døgnet beholdes.
 */
export function compactLots(g: GameState): void {
  if (g.lots.length < 20) return;
  const today = day(g);
  const first = new Map<string, Lot>();
  const out: Lot[] = [];
  const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
  for (const lot of g.lots) {
    if (lot.madeDay >= today - 1) {
      out.push(lot);
      continue;
    }
    const key = lotKey(lot);
    const into = first.get(key);
    if (!into) {
      first.set(key, lot);
      out.push(lot);
      continue;
    }
    const total = into.t + lot.t;
    const mix = (a: Analysis, b: Analysis): Analysis => ({
      c: r6((a.c * into.t + b.c * lot.t) / total),
      p: r6((a.p * into.t + b.p * lot.t) / total),
      tramp: r6((a.tramp * into.t + b.tramp * lot.t) / total),
    });
    into.analysis = mix(into.analysis, lot.analysis);
    into.known = mix(into.known, lot.known);
    into.t = total;
    into.madeDay = Math.min(into.madeDay, lot.madeDay);
  }
  g.lots = out;
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
  // Kokillene slites av hvert tonn, og slitte kokiller gir flere gjennombrudd (B-351)
  wearMoulds(g, batch.t, stats);
  if (
    casting.continuous &&
    chance(g, 0.01 * stats.maintFactor * (batch.tempOff ? 2.5 : 1) * (has(g, "bruddvarsling") ? 0.4 : 1) * mouldRisk(g))
  ) {
    const hours = 4 * stats.repairFactor;
    g.castDownUntilMin = g.minute + hours * 60;
    addCost(g, "vedlikehold", 60_000);
    addReturnScrap(g, t * 0.3, batch.analysis, stats);
    t *= 0.7;
    log(
      g,
      batch.tempOff && has(g, "oseovn")
        ? `Strengen grodde igjen: stålet fra øseovnen var for kaldt. Støpemaskinen står i ${hours.toFixed(1).replace(".", ",")} timer.`
        : `Strenggjennombrudd! Skallet revnet under kokillen. Støpemaskinen står i ${hours.toFixed(1).replace(".", ",")} timer.`,
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
  const defectRisk =
    casting.defectRisk *
    (batch.tempOff ? 3 : 1) *
    (1.3 - 0.1 * stats.crewSkill) *
    (hasResearch(g, "kvalitetsledelse") ? 0.6 : 1);
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

/**
 * Får neste øse plass på ferdigvarelageret? Et tomt lager tar alltid imot, så en øse som er større enn lageret
 * ikke låser støpingen (B-110). Selger på spot først hvis det er slått på.
 */
function storeHasRoom(g: GameState, stats: PlantStats, t: number): boolean {
  const fits = () => lotsTonnage(g) <= 0 || lotsTonnage(g) + t <= stats.storeT;
  if (!fits() && auto(g, "autoSpot")) sellExcess(g, stats, 0.8);
  return fits();
}

/**
 * Varsler om fullt ferdigvarelager, med råd (B-118). Varselet kommer når lageret blir fullt (ikke hvert tidssteg),
 * og høyst hver 12. time.
 */
const STORE_FULL = "Ferdigvarelageret er fullt";
function storeFull(g: GameState, wasFull: boolean): void {
  g.castWait = STORE_FULL;
  if (wasFull || g.minute - (g.storeFullLogMin ?? -1e9) < 12 * 60) return;
  g.storeFullLogMin = g.minute;
  log(
    g,
    `${STORE_FULL}: støpingen står, og ovnene stopper når øsene er fulle. ${
      auto(g, "autoSpot")
        ? "Automatisk salg er på, men lageret er fullt av stål som kontraktene venter på. Lever eller avbryt ordrer, eller bygg ut lageret."
        : "Trykk «Selg alt ledig stål» under Salg → Lager, slå på automatisk salg der, eller bygg ut lageret under Anlegg → Lager og salg."
    }`,
    "bad",
  );
}

function updateCasting(g: GameState, stats: PlantStats, dt: number): void {
  const wasFull = g.castWait === STORE_FULL;
  g.castWait = null;
  if (!g.castQueue.length) return;
  if (g.minute < g.castDownUntilMin) {
    g.castWait = "Støpemaskinen står";
    return;
  }
  // Er det ikke plass til øsa som støpes, venter støpingen – uten at framdriften samler seg opp, ellers ville
  // flere øser blitt støpt på én gang når det ble plass (B-113)
  if (!storeHasRoom(g, stats, g.castQueue[0].t)) {
    storeFull(g, wasFull);
    return;
  }
  if (g.castProgressT <= 1e-9 && !pickNextLadle(g)) {
    g.castWait = `Venter med ${GRADES[g.castQueue[0].grade].name.toLowerCase()} til sekvensen er ferdig`;
    return;
  }
  g.castProgressT += stats.castTph * (dt / 60);
  while (g.castQueue.length && g.castProgressT >= g.castQueue[0].t) {
    // Lageret kan fylles midt i et langt tidssteg (10×): ikke støp mer enn det er plass til (B-110)
    if (!storeHasRoom(g, stats, g.castQueue[0].t)) {
      g.castProgressT = g.castQueue[0].t;
      storeFull(g, wasFull);
      break;
    }
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
/** Så nær slutten må en charge med samme kvalitet være for at støpingen skal vente på den (B-273) */
export const SEQUENCE_SOON_MIN = 20;

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
  // Vent bare når det kommer mer av samme kvalitet snart og køen har plass (B-273). Var køen full av en annen kvalitet,
  // sto de andre ovnene med fulle øser mens støpingen ventet på én charge – opptil 15 % av tida på et fullt storverk.
  // Overgangsemnene ved et bytte koster mye mindre enn den ventetida
  const soon = g.furnaces.some(
    (f) =>
      f.holding?.grade === last.grade ||
      (f.heat?.grade === last.grade && f.heat.endMin - g.minute <= SEQUENCE_SOON_MIN),
  );
  const full = g.castQueue.length >= maxLadlesWaiting(g);
  if (soon && !full && g.minute - (head.queuedMin ?? g.minute) < SEQUENCE_WAIT_MIN) return false;
  head.transition = true;
  return true;
}

/** Støpefeil kan ikke leveres på kontrakt: selg dem, eller smelt dem om som returskrap med kjent analyse */
function handleSeconds(g: GameState): void {
  const action = secondsAction(g);
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
  // Stengt etter en dødsulykke: valseverket står også (B-397)
  if (g.minute < (g.closedUntilMin ?? 0)) return;
  let capacity = rollingTph(g) * (dt / 60);
  // Valseverket valser emnene armeringsordrene venter på, i køens rekkefølge, og ellers bare emner ingen ordre
  // trenger (B-228). Emneordrene beholder sine emner, og armeringsordrene får riktig kvalitet (B-223 gjorde halve
  // jobben: den holdt ikke av emner til emneordrene bak den første armeringsordren, og valset feil kvalitet)
  const { reserved, toRoll } = planLots(g);
  const planned = g.lots.filter((l) => (toRoll.get(l.id) ?? 0) > 1e-9);
  const spare = g.lots.filter((l) => l.product === "emne" && !l.second && l.t - (reserved.get(l.id) ?? 0) > 1e-9);
  for (const [lot, room] of [
    ...planned.map((l) => [l, toRoll.get(l.id) ?? 0] as const),
    ...spare.map((l) => [l, l.t - (reserved.get(l.id) ?? 0)] as const),
  ]) {
    if (capacity <= 1e-9) break;
    const take = Math.min(room, lot.t, capacity);
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
  return PRODUCTS[product].spotPerDay * (1 + g.reputation / 50) * bigPlantMarket(g);
}

/**
 * Stormodellene (B-154): et verk som smelter mer enn tre 90-tonnere, selger også til eksport, så markedet vokser –
 * men mindre enn produksjonen (potens 0,7), så det lønner seg ikke uten grense.
 */
function bigPlantMarket(g: GameState): number {
  if (g.stage < 4) return 1;
  let tpm = 0;
  for (const f of g.furnaces) {
    const t = FURNACES.find((x) => x.id === f.type);
    if (t) tpm += t.sizeT / t.cycleMin;
  }
  return Math.max(1, tpm / 4.5) ** 0.7;
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

/** Tonn på ferdiglageret som ingen kontrakt venter på – det som kan selges nå (B-274) */
export function freeStockT(g: GameState): number {
  const reserved = lotReservations(g);
  return g.lots.reduce((a, l) => a + Math.max(0, l.t - (reserved.get(l.id) ?? 0)), 0);
}

/** Selger alt stål ingen kontrakt venter på, også støpefeil, på spot (B-274) */
export function sellAllFree(g: GameState): PurchaseResult {
  const reserved = lotReservations(g);
  const before = g.cash;
  let sold = 0;
  for (const lot of [...g.lots]) {
    const free = lot.t - (reserved.get(lot.id) ?? 0);
    if (free <= 1e-6) continue;
    sellLot(g, lot.id, free);
    sold += free;
  }
  if (sold <= 1e-6) return { ok: false, message: "Alt på lageret er holdt av til kontraktene." };
  return { ok: true, message: `Solgte ${fmtT(sold)} på spot for ${fmtKr(g.cash - before)}.` };
}

/** Selger partier ingen kontrakt venter på, til lageret er under målet. */
export function sellExcess(g: GameState, stats: PlantStats, targetFraction: number): void {
  // Støpefeil selges først, men bare hvis spilleren har valgt at de skal selges (ikke omsmelting eller beholde)
  if (secondsAction(g) === "spot") for (const lot of [...g.lots]) if (lot.second) sellLot(g, lot.id);
  const reserved = lotReservations(g);
  for (const lot of [...g.lots]) {
    const over = lotsTonnage(g) - stats.storeT * targetFraction;
    if (over <= 0) break;
    const free = lot.t - (reserved.get(lot.id) ?? 0);
    if (free > 1e-6) sellLot(g, lot.id, Math.min(free, over));
  }
}

interface LotPlan {
  /** Tonn av hvert parti som en aktiv kontrakt venter på (også emner som skal valses til en armeringsordre) */
  reserved: Map<number, number>;
  /** Tonn emner i hvert parti som skal valses til armeringsordrene (B-228) */
  toRoll: Map<number, number>;
  /** Tonn hver kontrakt har dekket på lager: ferdig vare, og for armering emner som venter på valsing */
  covered: Map<number, number>;
}

/**
 * Lagerplanen, i ordrekøens rekkefølge: hver kontrakt får partiene som holder kvaliteten. En armeringsordre som ikke
 * dekkes av armering på lager, får emner av riktig kvalitet som valseverket gjør om (B-228). Før valset valseverket
 * alle emner som var ledige, også kvaliteter ingen armeringsordre trengte, mens emnene ordren ventet på ble liggende,
 * og ovnene laget mer emner til armeringsordren enn valseverket rakk.
 */
function planLots(g: GameState): LotPlan {
  const reserved = new Map<number, number>();
  const toRoll = new Map<number, number>();
  const covered = new Map<number, number>();
  const rolling = rollingActive(g);
  const take = (c: Contract, product: ProductId, need: number, onTake: (lot: Lot, t: number) => void): number => {
    let left = need;
    for (const lot of g.lots) {
      if (left <= 1e-9) break;
      if (lot.product !== product || lot.second || !satisfies(lot.known, c.grade)) continue;
      const t = Math.min(lot.t - (reserved.get(lot.id) ?? 0), left);
      if (t <= 1e-9) continue;
      reserved.set(lot.id, (reserved.get(lot.id) ?? 0) + t);
      onTake(lot, t);
      left -= t;
    }
    return need - left;
  };
  const queue = orderQueue(g);
  const roll = (c: Contract, billets: number) =>
    take(c, "emne", billets, (lot, t) => toRoll.set(lot.id, (toRoll.get(lot.id) ?? 0) + t)) * ROLLING_YIELD;
  // Valseverket får emner til de neste timene først (B-240). Før fikk armeringsordrene emner først når alle emneordrene
  // foran i køen var dekket – de tok også emnene som ble støpt til armeringen – så valseverket sto store deler av døgnet
  // og armeringen kom for sent, selv med ledig kapasitet. Resten av armeringen får emner i køens rekkefølge som før.
  if (rolling) {
    let buffer = rollingTph(g) * ROLLING_BUFFER_H;
    for (const c of queue) {
      if (buffer <= 1e-6) break;
      if (c.product !== "armering") continue;
      let got = take(c, "armering", c.tonnes - c.delivered, () => {});
      const billets = Math.min(buffer, (c.tonnes - c.delivered - got) / ROLLING_YIELD);
      if (billets > 1e-6) {
        const rolled = roll(c, billets);
        buffer -= rolled / ROLLING_YIELD;
        got += rolled;
      }
      covered.set(c.id, got);
    }
  }
  for (const c of queue) {
    const left = c.tonnes - c.delivered;
    let got = covered.get(c.id) ?? 0;
    got += take(c, c.product, left - got, () => {});
    if (c.product === "armering" && rolling && left - got > 1e-6) got += roll(c, (left - got) / ROLLING_YIELD);
    covered.set(c.id, got);
  }
  return { reserved, toRoll, covered };
}

/** Hvor mye av hvert parti aktive kontrakter vil få, i samme rekkefølge som leveransene. */
export function lotReservations(g: GameState): Map<number, number> {
  return planLots(g).reserved;
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
  // Det kontrakten selv har fått på lager (B-228). Før telte en senere kontrakt med partier en tidligere hadde tatt
  const { covered } = planLots(g);
  return orderQueue(g).filter((c) => c.tonnes - c.delivered - (covered.get(c.id) ?? 0) > 1e-6);
}

/** Kontrakten en ovn produserer for: ovn 1 den første i køen, de andre kan ta neste kvalitet (B-039) */
export function furnaceOrder(g: GameState, index: number): Contract | null {
  const grade = furnaceGrade(g, index);
  return ordersToMake(g).find((c) => c.grade === grade) ?? null;
}

/**
 * Når verket bytter til en kvalitet resepten ikke holder, legger skrapklasseren om resepten selv (sikreste
 * blanding av skrapet som er åpent). Uten skrapklasser får spilleren et varsel (B-043). Planleggeren kjøper
 * bare inn; den rører ikke resepten (B-063).
 */
function ensureRecipe(g: GameState, grade: GradeId, stats: PlantStats): void {
  const recipe = gradeRecipe(g, grade);
  if (recipeEstimate(g, grade, stats, recipe).grades.includes(grade)) return;
  const who = hasGrader(g) ? "Skrapklasseren" : null;
  const name = GRADES[grade].name.toLowerCase();
  if (!who) {
    log(
      g,
      `Resepten holder ikke kravet til ${name}. Juster den under Verket → Resept – eller ansett en skrapklasser.`,
      "event",
    );
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
  if (!auto(g, "followQueue")) return;
  const orders = ordersToMake(g);
  const order = orders[0];
  if (order && order.grade !== g.targetGrade) {
    g.gradeRecipes[g.targetGrade] = { ...g.recipe };
    g.targetGrade = order.grade;
    const saved = g.gradeRecipes[order.grade];
    if (saved) g.recipe = { ...saved };
    ensureRecipe(g, order.grade, stats);
  } else if (order && hasGrader(g)) {
    // Skrapklasseren retter også resepten til kvaliteten som alt kjøres, når en ny ordre krever det (B-099)
    ensureRecipe(g, order.grade, stats);
  }
  // Ovn 2 (og 3 …) tar neste kvalitet i køen, hvis det er en annen (B-039) – men har valseverket lite å gå på, lager
  // de emner til den første armeringsordren (B-228), så valseverket går hele tida og ikke må ta igjen alt til slutt
  const feed = rollingFeed(g, orders);
  const other = auto(g, "splitGrades")
    ? feed && feed.grade !== g.targetGrade
      ? feed
      : orders.find((c) => c.grade !== g.targetGrade)
    : undefined;
  // Så mange ovner som trengs for at kvaliteten først i køen rekker fristen, lager den; resten tar neste kvalitet (B-240).
  // Før tok ovn 2 og 3 alltid neste kvalitet, så med tre ovner fikk ordren som hastet mest bare en tredjedel av verket
  const head = order && other ? headFurnaces(g, stats, orders, order) : 1;
  const before = g.furnaces.map((f) => f.grade);
  for (let i = 1; i < g.furnaces.length; i++) g.furnaces[i].grade = i >= head ? (other?.grade ?? null) : null;
  if (other && g.furnaces.some((f, i) => f.grade === other.grade && before[i] !== other.grade))
    ensureRecipe(g, other.grade, stats);
}

/**
 * Ovner kvaliteten først i køen trenger for å rekke fristene sine med litt å gå på (B-240): tonnene i den kvaliteten
 * som skal være ferdig innen hver frist, mot det så mange ovner lager til da. Minst én ovn, og alle hvis det trengs.
 */
function headFurnaces(g: GameState, stats: PlantStats, orders: Contract[], order: Contract): number {
  const n = g.furnaces.length;
  const perFurnace = realisticDailyT(g, stats) / n;
  if (perFurnace <= 0) return n;
  const { covered } = planLots(g);
  const today = day(g);
  let need = 1;
  let cum = 0;
  for (const c of orders) {
    if (c.grade !== order.grade) continue;
    cum += c.tonnes - c.delivered - (covered.get(c.id) ?? 0);
    if (c.landmark) continue;
    const days = Math.max(0.5, c.deadlineDay - today + 1 - (g.minute % 1440) / 1440);
    need = Math.max(need, Math.ceil(cum / (perFurnace * days * CONTRACT_MARGIN)));
  }
  return Math.min(n, need);
}

/** Timer valsing emnene som venter på valseverket skal rekke til, før ovnene lager mer til armeringsordrene (B-228) */
export const ROLLING_BUFFER_H = 12;

/**
 * Armeringsordren ovnene bør lage emner til nå, så valseverket ikke går tomt (B-228): den første i køen som trenger
 * mer stål, når emnene som venter på valsing rekker kortere enn ROLLING_BUFFER_H.
 */
function rollingFeed(g: GameState, orders: Contract[]): Contract | undefined {
  if (!rollingActive(g) || g.furnaces.length < 2) return undefined;
  const rebar = orders.find((c) => c.product === "armering");
  if (!rebar) return undefined;
  let waiting = 0;
  for (const t of planLots(g).toRoll.values()) waiting += t;
  return waiting < rollingTph(g) * ROLLING_BUFFER_H ? rebar : undefined;
}

/** Planleggeren sorterer køen etter frist. */
function plannerSort(g: GameState): void {
  // Den innleide planleggeren fra rådgiveren sorterer uansett forskning (B-059)
  if (!plannerSortsQueue(g)) return;
  // Landemerker først (B-211), så etter frist
  orderQueue(g)
    .sort((a, b) => (a.landmark ? 0 : 1) - (b.landmark ? 0 : 1) || a.deadlineDay - b.deadlineDay)
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
    const tolerant =
      a.p <= spec.pMax * 1.1 && a.tramp <= spec.trampMax * 1.1 && a.c <= spec.cMax * 1.1 && a.c >= spec.cMin * 0.9;
    if (tolerant) return false;
    return chance(g, 0.6);
  }
  return chance(g, 0.8);
}

/** Andel av tida til fristen en kontrakt bør ta for å regnes som trygg på Salg; mer er «knapt» (B-062) */
export const CONTRACT_MARGIN = 0.8;

/** Ukeleveranser fra rammeavtalene som legges i ordrekøen før en gitt dag, til anslaget på Salg (B-062) */
export function agreementLoadUntil(g: GameState, untilDay: number, product?: ProductId): number {
  let t = 0;
  for (const a of g.agreements) {
    if (a.status !== "aktiv" || (product && a.product !== product)) continue;
    for (let w = a.weeksSent, d = a.nextDay; w < a.weeks && d < untilDay; w++, d += 7) t += a.weeklyT;
  }
  return t;
}

/**
 * Kontraktene i ordrekøen som ikke rekker fristen, hvis verket mister «lostT» tonn produksjon nå
 * (f.eks. ved utkobling fra nettselskapet, B-104). Anslaget bruker samme døgnproduksjon som forespørslene.
 */
export function lateContracts(g: GameState, stats: PlantStats, lostT = 0): Contract[] {
  const perDay = realisticDailyT(g, stats);
  if (perDay <= 0) return orderQueue(g);
  let cum = lostT;
  const late: Contract[] = [];
  for (const c of orderQueue(g)) {
    cum += c.tonnes - c.delivered;
    const doneDay = day(g) + cum / perDay - 1;
    if (doneDay > c.deadlineDay && !c.landmark) late.push(c);
  }
  return late;
}

/** Tonn som gjenstår i ordrekøen (bare én vare hvis «product» er gitt) */
export function committedT(g: GameState, product?: ProductId): number {
  return orderQueue(g)
    .filter((c) => !product || c.product === product)
    .reduce((a, c) => a + c.tonnes - c.delivered, 0);
}

/**
 * Døgn armeringen i køen, rammeavtalene og en ny ordre trenger fra valseverket (B-217). Valseverket rekker bare en del
 * av det som støpes, så armering kan være for mye selv om verket har tonn nok. 0 for andre varer.
 */
export function rollingNeedDays(
  g: GameState,
  stats: PlantStats,
  product: ProductId,
  tonnes: number,
  until: number,
): number {
  if (product !== "armering" || stats.rolledDailyT <= 0) return 0;
  const perDay = Math.min(productCapT(stats, "armering"), realisticDailyT(g, stats));
  return (committedT(g, "armering") + agreementLoadUntil(g, until, "armering") + tonnes) / perDay;
}

/** En jobb i planen over køen (B-240): tonn som gjenstår, fristen og hvor den står i køen */
interface PlanItem {
  id: number | string;
  t: number;
  deadline: number;
  landmark: boolean;
  /** Rekkefølgen uten planlegger: køens prioritet, en ny kontrakt og ukeleveranser som kommer, bakerst */
  order: number;
  product: ProductId;
  customer: string;
}

/** Sorterer planleggeren køen etter frist nå (samme vilkår som i plannerSort) */
export function plannerSortsQueue(g: GameState): boolean {
  const specialist = (g.specialists?.sen ?? 0) > g.minute;
  return hasPlanner(g) && (auto(g, "plannerSorts") || specialist);
}

/** Ny jobb som vurderes: en forespørsel eller ukene i en rammeavtale */
export type PlanExtra = { t: number; deadline: number; product: ProductId; customer: string; landmark?: boolean };

/** Ukeleveransene i en rammeavtale som ennå ikke er lagt i køen, som jobber med frist */
export function agreementWeeks(a: Agreement, first = a.nextDay): PlanExtra[] {
  const out: PlanExtra[] = [];
  for (let w = a.weeksSent, d = first; w < a.weeks; w++, d += 7)
    out.push({ t: a.weeklyT, deadline: d + 6, product: a.product, customer: a.customer });
  return out;
}

/**
 * Neste ukeleveranse fra en rammeavtale (B-316): hvilken avtale, og hvor mange spillminutter til den legges i
 * ordrekøen. Ukene legges inn ved starten av døgnet `nextDay` (onDay). 0 betyr at den skulle vært lagt inn, men venter
 * (sommerstans). Avtaler på et produkt verket skal slutte med, gir ingen nye uker (B-163) og telles ikke. null når
 * ingen aktiv avtale har uker igjen.
 */
export function nextAgreementWeek(g: GameState): { agreement: Agreement; inMin: number } | null {
  const leaving = g.pendingCastingSwitch ? castingType(g).product : null;
  let best: { agreement: Agreement; inMin: number } | null = null;
  for (const a of g.agreements) {
    if (a.status !== "aktiv" || a.weeksSent >= a.weeks || a.product === leaving) continue;
    const inMin = Math.max(0, (a.nextDay - 1) * MIN_PER_DAY - g.minute);
    if (!best || inMin < best.inMin) best = { agreement: a, inMin };
  }
  return best;
}

/** Spillminutter verket bruker på ordrekøen slik den står, med det det faktisk har laget de siste døgnene */
export function queueMinutes(g: GameState, stats: PlantStats): number {
  const perDay = stats.dailyProductT > 0 ? realisticDailyT(g, stats) : 0;
  return perDay > 0 ? (committedT(g) / perDay) * MIN_PER_DAY : Infinity;
}

export interface QueueFit {
  /** Verste forhold mellom tonn som må være ferdig innen en frist og det verket lager til da (1 = akkurat) */
  worst: number;
  /** En kontrakt i køen som rakk før, men ikke med den nye (den nye går foran den) */
  pushesLate: string | null;
  /** Samme, men for grensen «knapt» */
  pushesNarrow: boolean;
}

/**
 * Passer en ny jobb i køen (B-240)? Planen tar køen i rekkefølgen verket følger – etter frist når planleggeren sorterer
 * – med ukeleveransene fra rammeavtalene som kommer, og regner for hver frist ut hvor mye som må være ferdig innen da.
 * Før regnet salgsdirektøren bare med at den nye kontrakten rakk: med frist-sortering går en ny kontrakt med kort frist
 * foran de andre, så eldre kontrakter ble for sene selv om hver ny så trygg ut (26 600 t tatt per døgn mot 25 800 laget).
 * «product» gir planen for én vare (armering med valseverket); «front» er tonn som går først (landemerker som venter).
 */
export function queueFit(
  g: GameState,
  perDay: number,
  extras: PlanExtra[],
  opts: { product?: ProductId; front?: number } = {},
): QueueFit {
  const today = day(g);
  const product = opts.product;
  const byDeadline = plannerSortsQueue(g);
  const items: PlanItem[] = [];
  let order = 0;
  for (const c of orderQueue(g)) {
    if (product && c.product !== product) continue;
    const t = c.tonnes - c.delivered;
    if (t > 1e-6)
      items.push({
        id: c.id,
        t,
        deadline: c.deadlineDay,
        landmark: !!c.landmark,
        order: order++,
        product: c.product,
        customer: c.customer,
      });
  }
  const extraIds = extras.map((_, i) => `ny${i}`);
  const future: PlanItem[] = [];
  for (const a of g.agreements) {
    if (a.status !== "aktiv" || (product && a.product !== product)) continue;
    agreementWeeks(a).forEach((w, i) =>
      future.push({
        id: `a${a.id}-${i}`,
        t: w.t,
        deadline: w.deadline,
        landmark: false,
        order: 0,
        product: a.product,
        customer: a.customer,
      }),
    );
  }
  const news: PlanItem[] = extras
    .filter((e) => !product || e.product === product)
    .map((e, i) => ({
      id: extraIds[i],
      t: e.t,
      deadline: e.deadline,
      landmark: !!e.landmark,
      order: 0,
      product: e.product,
      customer: e.customer,
    }));
  // Uten planlegger: den nye kontrakten bakerst, så ukeleveransene etter hvert som de kommer
  for (const n of news) n.order = order++;
  future.sort((a, b) => a.deadline - b.deadline).forEach((f) => (f.order = order++));
  const sorted = (list: PlanItem[]) =>
    [...list].sort((a, b) =>
      byDeadline
        ? (a.landmark ? 0 : 1) - (b.landmark ? 0 : 1) || a.deadline - b.deadline || a.order - b.order
        : (a.landmark ? 0 : 1) - (b.landmark ? 0 : 1) || a.order - b.order,
    );
  const ratios = (list: PlanItem[]) => {
    const out = new Map<PlanItem["id"], number>();
    let cum = opts.front ?? 0;
    for (const it of sorted(list)) {
      cum += it.t;
      // Landemerker har ingen frist (B-218)
      out.set(it.id, it.landmark ? 0 : cum / (perDay * Math.max(1, it.deadline - today + 1)));
    }
    return out;
  };
  const without = ratios([...items, ...future]);
  const all = [...items, ...future, ...news];
  const withNew = ratios(all);
  let worst = 0;
  let pushesLate: string | null = null;
  let pushesNarrow = false;
  for (const it of all) {
    const r = withNew.get(it.id) ?? 0;
    worst = Math.max(worst, r);
    if (news.includes(it)) continue;
    const before = without.get(it.id) ?? 0;
    if (r > 1 && before <= 1 && !pushesLate) pushesLate = it.customer;
    if (r > CONTRACT_MARGIN && before <= CONTRACT_MARGIN) pushesNarrow = true;
  }
  return { worst, pushesLate, pushesNarrow };
}

export interface OfferCheck {
  /** Verket lager varen */
  canMake: boolean;
  /** Resepten for kvaliteten holder kravet nå */
  recipeOk: boolean;
  /** Hva som bommer med resepten nå */
  failures: string[];
  /** Skrapforskning som mangler før kvaliteten kan lages */
  missingResearch: Research | null;
  /** Skrapklasseren kan legge om resepten så den holder (B-099) */
  graderFix: boolean;
  /** Døgn ordrekøen og kontrakten trenger, og døgn til fristen */
  needDays: number;
  days: number;
  /** Rekker det neppe */
  tight: boolean;
  /** Knapt: lite slingringsmonn (B-062) */
  narrow: boolean;
  doneDay: number;
  /** Kunden som får en for sen kontrakt fordi den nye går foran i køen (B-240), eller null */
  pushesLate: string | null;
}

/**
 * Vurderingen av en forespørsel på Salg (B-034, B-062, B-099): kan verket lage den, holder resepten, og rekker den
 * fristen med ordrekøen og rammeavtalene som alt ligger der. Brukes også av salgsdirektøren (B-117).
 */
export function assessOffer(g: GameState, stats: PlantStats, c: Contract, committed = committedT(g)): OfferCheck {
  const canMake = stats.products.includes(c.product);
  const est = recipeEstimate(g, c.grade, stats, gradeRecipe(g, c.grade));
  const recipeOk = est.grades.includes(c.grade);
  const failures = recipeOk ? [] : gradeFailures(est.analysis, c.grade);
  const missingResearch = canMake && !recipeOk ? scrapResearchFor(g, c.grade, stats) : null;
  const graderFix =
    canMake &&
    !recipeOk &&
    !missingResearch &&
    g.workers.some((w) => w.role === "klasser") &&
    !!suggestRecipe(g, c.grade, stats, "sikker");
  const perDay = stats.dailyProductT > 0 ? realisticDailyT(g, stats) : 0;
  const needDays =
    perDay > 0
      ? Math.max(
          (committed + agreementLoadUntil(g, c.deadlineDay) + c.tonnes) / perDay,
          rollingNeedDays(g, stats, c.product, c.tonnes, c.deadlineDay),
        )
      : Infinity;
  // I sommerstansen står ovnene resten av ferien (B-321): de døgnene kan ikke brukes
  const days = c.deadlineDay - day(g) + 1 - Math.min(summerStopDaysLeft(g), Math.max(0, c.deadlineDay - day(g) + 1));
  // Går den nye kontrakten foran en annen i køen (planleggeren sorterer etter frist), kan den gjøre den andre for sen
  // selv om den selv rekker (B-240). «committed» ut over køen er landemerker som venter på svar, og de går først
  let pushesLate: string | null = null;
  let pushesNarrow = false;
  if (perDay > 0 && !c.landmark) {
    const extra: PlanExtra[] = [{ t: c.tonnes, deadline: c.deadlineDay, product: c.product, customer: c.customer }];
    const fit = queueFit(g, perDay, extra, { front: Math.max(0, committed - committedT(g)) });
    pushesLate = fit.pushesLate;
    pushesNarrow = fit.pushesNarrow;
    if (c.product === "armering" && stats.rolledDailyT > 0) {
      const roll = queueFit(g, Math.min(productCapT(stats, "armering"), perDay), extra, { product: "armering" });
      pushesLate ??= roll.pushesLate;
      pushesNarrow ||= roll.pushesNarrow;
    }
  }
  // Et landemerke har ingen frist (B-218), så det kan ikke bli for sent
  const tight = !c.landmark && (needDays > days || !!pushesLate);
  const narrow = !c.landmark && !tight && (needDays > days * CONTRACT_MARGIN || pushesNarrow);
  return {
    canMake,
    recipeOk,
    failures,
    missingResearch,
    graderFix,
    needDays,
    days,
    tight,
    narrow,
    doneDay: day(g) + Math.ceil(needDays) - 1,
    pushesLate,
  };
}

/** Omtrent hvor mye verket faktisk lager per døgn: snittet av de siste døgnene, eller et forsiktig anslag */
export function realisticDailyT(g: GameState, stats: PlantStats): number {
  const recent = g.history.slice(-3).filter((d) => d.producedT > 0);
  const est =
    recent.length >= 2 ? recent.reduce((a, d) => a + d.producedT, 0) / recent.length : stats.dailyProductT * 0.8;
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
      // Kunden merker seg hvor godt stålet holdt kravene (B-161)
      c.qMargin = Math.min(c.qMargin ?? 1, specMargin(lot.analysis, c.grade));
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
      // Kundens vurdering 1–10 (B-161): fornøyde kunder snakker varmere om verket
      const r = rateDelivery(g, c);
      c.rating = r.score;
      c.ratingNote = r.note;
      g.ratings = [...g.ratings, r.score].slice(-RATINGS_KEPT);
      if (r.score >= 10) countEvent(g, "tiavti");
      // Jo høyere omdømme, jo mindre flytter én kontrakt
      const gain = c.repGain * Math.max(0.25, 1 - g.reputation / 150) * ratingFactor(r.score);
      adjustReputation(g, gain);
      g.totals.contractsDone += 1;
      countEvent(g, "leveranser");
      liftMorale(g, 0.5);
      awardPoints(g, 1 + g.stage);
      log(
        g,
        `Kontrakten med ${c.customer} er levert. Kunden gir ${r.score}/10: «${r.quote}» Omdømme +${gain.toFixed(1).replace(".", ",")}.`,
        r.score >= 5 ? "good" : "bad",
      );
      if (g.totals.contractsDone === 1) unlock(g, "omdomme");
      if (c.agreementId) agreementWeekClosed(g, c, true);
    }
  }
  g.lots = g.lots.filter((l) => l.t > 1e-6);
}

/** Så mange vurderinger huskes, for snittet på Salg (B-161) */
export const RATINGS_KEPT = 20;

/**
 * Kundens vurdering av en levert kontrakt (B-161), som anmeldelsene i Game Dev Tycoon. Tre ting teller:
 * - tid: levert i god tid før fristen (+2), minst et døgn før (+1), eller på fristdagen (0)
 * - kvalitet: margin til kravene i det dårligste partiet: god (+2), grei (+1), nær grensen (0) eller helt på kanten (−1)
 * - reklamasjon: kunden gir høyst 3
 */
export function rateDelivery(g: GameState, c: Contract): { score: number; note: string; quote: string } {
  const left = c.deadlineDay - day(g);
  const span = Math.max(1, c.deadlineDay - (c.acceptedDay ?? c.deadlineDay - 3));
  const time = c.landmark || left / span >= 0.4 ? 2 : left >= 1 ? 1 : 0;
  const margin = c.qMargin ?? 0.5;
  const quality = margin >= 0.3 ? 2 : margin >= 0.15 ? 1 : margin >= 0.05 ? 0 : -1;
  const complained = !!c.complained || g.complaints.some((x) => x.contractId === c.id);
  let score = Math.max(1, Math.min(10, 6 + time + quality));
  if (complained) score = Math.max(1, Math.min(3, score - 4));
  const note = complained
    ? "stålet holdt ikke kravene"
    : `${time === 2 ? "i god tid" : time === 1 ? "før fristen" : "i siste liten"} · ${quality === 2 ? "god margin" : quality === 1 ? "grei margin" : "nær grensene"}`;
  const quote = complained
    ? "Stålet holdt ikke kravene våre. Det er skuffende."
    : score >= 10
      ? "Før fristen og god margin på alt. Dere er de beste vi har!"
      : score >= 8
        ? time < 2
          ? "Fint stål. Litt tidligere levering, så er det perfekt."
          : "God levering. Litt mer margin på kvaliteten, så er det perfekt."
        : score >= 6
          ? time === 0
            ? "Greit, men det var i siste liten."
            : "Greit levert, men kvaliteten var nær grensene."
          : "Vi fikk det vi ba om, men så vidt. Både tida og kvaliteten var på kanten.";
  return { score, note, quote };
}

/** Hvor mye mer (eller mindre) omdømme en levering gir etter kundens vurdering: 7 er vanlig, 10 gir 20 % mer */
export function ratingFactor(score: number): number {
  return 0.5 + score * 0.07;
}

/** Snittet av de siste vurderingene, eller null uten noen */
export function avgRating(g: GameState, n = RATINGS_KEPT): number | null {
  const r = g.ratings.slice(-n);
  return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null;
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
      log(
        g,
        `${c.text} Kunden får pengene tilbake (${fmtKr(c.refund)}). Samme ordre som før, så ikke mer tap av omdømme.`,
        "bad",
      );
      continue;
    }
    if (contract) contract.complained = true;
    repLoss(g, c.repLoss, "reklamasjon");
    adjustMorale(g, -1);
    g.totals.complaints += 1;
    awardPoints(g, 2);
    log(
      g,
      `${c.text} Kunden får pengene tilbake (${fmtKr(c.refund)}), omdømme −${c.repLoss.toFixed(1).replace(".", ",")}. Du lærte noe: +2 fagpoeng.`,
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
  // Er et bytte av støping planlagt, kommer det ikke nye forespørsler på det gamle produktet (B-102)
  const leaving = g.pendingCastingSwitch ? castingType(g).product : null;
  const products = stats.products.filter((p) => p !== leaving);
  const eligible = CUSTOMERS.filter(
    (c) =>
      c.minStage <= g.stage &&
      c.maxStage >= g.stage &&
      c.products.some((p) => products.includes(p)) &&
      gradesFor(c).length > 0,
  );
  if (!eligible.length) return null;
  const customer = pick(g, eligible);
  const product = pick(
    g,
    customer.products.filter((p) => products.includes(p)),
  );
  let grade = pick(g, gradesFor(customer));
  // De fleste forespørsler gjelder kvaliteter verket kan lage med skrapet som er åpent. Noen få gjelder
  // kvaliteter man må forske fram skrap til – de viser hva som finnes (B-056)
  const canMake = (id: GradeId) => !!suggestRecipe(g, id, stats, "billig");
  if (!canMake(grade) && chance(g, 0.75)) {
    const makeable = gradesFor(customer).filter(canMake);
    if (makeable.length) grade = pick(g, makeable);
  }
  // Trender (B-255): når etterspørselen er høy, dras noen forespørsler mot det som er ettertraktet; når den er lav,
  // bort fra det. Bare det verket kan lage med skrapet som er åpent.
  // Bare forespørsler verket kan lage flyttes, så antallet det kan ta imot er det samme med og uten trend
  const t = g.market.trend;
  if (t && trendHits(t, product, grade) !== t.up && canMake(grade) && chance(g, TREND.bias)) {
    const options = eligible
      .flatMap((c) =>
        c.products
          .filter((p) => products.includes(p))
          .flatMap((p) => gradesFor(c).map((gr) => ({ customer: c, product: p, grade: gr }))),
      )
      .filter((o) => trendHits(t, o.product, o.grade) === t.up && canMake(o.grade));
    if (options.length) return pick(g, options);
  }
  return { customer, product, grade };
}

function makeOffer(g: GameState, stats: PlantStats): Contract | null {
  const picked = pickCustomer(g, stats);
  if (!picked) return null;
  const { customer, product, grade } = picked;
  const capacity = Math.max(0.1, productCapT(stats, product));
  // En kontrakt skal være et lite prosjekt: 1,5–4 døgns produksjon, ikke noe som er ferdig på sekunder
  // De første kontraktene i garasjen er små, så starten går fort og man ser at det virker (B-033)
  const firstOrders =
    g.stage === 0 && g.totals.contractsDone + g.contracts.filter((c) => c.status === "aktiv").length < 2;
  const workDays = firstOrders ? uniform(g, 0.4, 0.8) : uniform(g, CONTRACT_DAYS[0], CONTRACT_DAYS[1]);
  const tonnes = roundTonnes(Math.max(customer.minT, Math.min(customer.maxT, capacity * workDays)));
  // Lager verket mer enn markedet tar unna, blir prisen lavere (B-252); trenden i markedet gir mer eller mindre (B-255)
  const pricePerT = Math.round(
    productPrice(g, product, grade) *
      (1 + stats.priceBonus) *
      marketSaturation(stats.dailyProductT) *
      trendPriceFactor(g, product, grade) *
      uniform(g, 0.95, 1.1),
  );
  const hot = !!g.market.trend?.up && trendHits(g.market.trend, product, grade);
  const days = Math.min(
    30,
    Math.ceil(tonnes / (Math.min(capacity, realisticDailyT(g, stats)) * 0.6)) + randInt(g, 2, 4),
  );
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
    ...(hot ? { trend: true } : {}),
  };
}

/** Aldri flere åpne forespørsler enn dette samtidig */
const MAX_OPEN_OFFERS = 4;

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
  // Under sommerstansen (B-298) er salgskontoret også på ferie
  if (g.settings.pauseOffers || summerStop(g)) return;
  if (chance(g, (stats.offersPerDay * 0.6) / 24)) generateOffers(g, stats, 1);
}

function expireOffers(g: GameState, stats: PlantStats): void {
  for (const c of g.contracts) {
    // Landemerket venter til du svarer (B-218), også mens verket lager noe annet en stund
    if (c.status !== "tilbud" || c.landmark) continue;
    if (!stats.products.includes(c.product)) {
      // Verket har byttet støping og lager ikke produktet lenger: kunden spør noen andre (B-082)
      c.status = "misligholdt";
      c.closedDay = -1;
      log(
        g,
        `${c.customer} trakk forespørselen på ${PRODUCTS[c.product].name.toLowerCase()} – verket lager ikke det lenger.`,
        "info",
      );
    } else if (c.offerExpiresMin <= g.minute || c.deadlineDay < day(g)) {
      // En forespørsel med frist som alt er passert, kan ikke signeres (B-241: Salg viste «leveres innen −1 døgn»)
      c.status = "misligholdt";
      c.closedDay = -1;
      // Passet den verket (grønn på Salg)? Da får spilleren et råd hvis flere går ut (B-292)
      const a = assessOffer(g, stats, c);
      const fitted = a.canMake && a.recipeOk && !a.tight && !a.narrow;
      // Med salgsdirektøren på var det direktøren som lot den gå (B-312): den regner med det verket faktisk har laget
      // den siste uka og vil ha mer luft til fristen enn «grønn» på Salg. Si det, i stedet for «selv om den passet»
      const director = g.konsern?.director?.active === true;
      if (fitted && !director)
        g.missedOffers = [...(g.missedOffers ?? []).filter((m) => m > g.minute - MIN_PER_DAY), g.minute];
      log(
        g,
        fitted && director
          ? `Salgsdirektøren lot forespørselen fra ${c.customer} gå: for lite luft til fristen med det verket faktisk lager (${fmtT(directorDailyT(g, stats))} per døgn). Vil du ha den likevel, ta den selv under Salg.`
          : `Forespørselen fra ${c.customer} gikk ut uten svar${fitted ? ", selv om den passet verket" : ""}.`,
        "info",
      );
    }
  }
  g.contracts = g.contracts.filter((c) => c.closedDay !== -1);
}

/** En forespørsel ekstra, f.eks. fra salgsdirektørens kundenettverk (B-172). Aldri flere enn taket for åpne */
export function extraOffer(g: GameState, stats: PlantStats): void {
  generateOffers(g, stats, 1);
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
export const MAX_AGREEMENTS = [0, 0, 0, 2, 3];
/** Uker uten full leveranse før kunden sier opp avtalen */
export const AGREEMENT_MAX_MISSED = 2;

function makeAgreement(g: GameState, stats: PlantStats): Agreement | null {
  const picked = pickCustomer(g, stats);
  if (!picked) return null;
  const { customer, product, grade } = picked;
  // En fast del av det verket faktisk lager: en femdel til to femdeler av en ukes produksjon
  const weekly = Math.min(productCapT(stats, product), realisticDailyT(g, stats)) * 7;
  const weeklyT = roundTonnes(weekly * uniform(g, 0.2, 0.4));
  const weeks = randInt(g, 4, 10);
  const pricePerT = Math.round(
    productPrice(g, product, grade) *
      (1 + stats.priceBonus) *
      marketSaturation(stats.dailyProductT) *
      trendPriceFactor(g, product, grade) *
      uniform(g, 0.97, 1.04),
  );
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
    acceptedDay: today,
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
      `${a.customer} sa opp rammeavtalen etter ${AGREEMENT_MAX_MISSED} uker uten full leveranse. Omdømme −${a.bonusRep.toFixed(1).replace(".", ",")}.`,
      "bad",
    );
    return;
  }
  if (a.weeksDone + a.weeksMissed < a.weeks) return;
  a.status = "fullfort";
  a.closedDay = day(g);
  if (a.weeksMissed === 0) {
    countEvent(g, "avtaler_bonus");
    addIncome(g, "kontrakt", a.bonusKr);
    adjustReputation(g, a.bonusRep);
    awardPoints(g, 2 + g.stage);
    log(
      g,
      `Rammeavtalen med ${a.customer} er fullført, alle uker i tide! Bonus ${fmtKr(a.bonusKr)} og omdømme +${a.bonusRep.toFixed(1).replace(".", ",")}.`,
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
    if (a.status === "tilbud" && (a.offerExpiresMin <= g.minute || !stats.products.includes(a.product))) {
      a.status = "brutt";
      a.closedDay = -1;
      log(
        g,
        a.offerExpiresMin <= g.minute
          ? `Tilbudet om rammeavtale fra ${a.customer} gikk ut.`
          : `${a.customer} trakk tilbudet om rammeavtale – verket lager ikke ${PRODUCTS[a.product].name.toLowerCase()} lenger.`,
        "info",
      );
    }
    // Er et bytte av støping planlagt, kommer det ikke nye ukeleveranser på det gamle produktet (B-163). Ellers ble
    // byttet aldri gjort mens avtalen varte; avtalen avsluttes uten straff ved byttet (endStaleAgreements, B-040)
    const leaving = g.pendingCastingSwitch ? castingType(g).product : null;
    // Ingen ukeleveranser under sommerstansen (B-298): de kommer når verket er i gang igjen
    if (a.status === "aktiv" && a.weeksSent < a.weeks && a.nextDay <= today && a.product !== leaving && !summerStop(g))
      sendAgreementWeek(g, a);
  }
  g.agreements = g.agreements.filter(
    (a) => a.closedDay !== -1 && (a.status === "tilbud" || a.status === "aktiv" || (a.closedDay ?? 0) >= today - 10),
  );
  const max = MAX_AGREEMENTS[g.stage] ?? 0;
  const active = g.agreements.filter((a) => a.status === "aktiv").length;
  const open = g.agreements.some((a) => a.status === "tilbud");
  if (max > 0 && !open && active < max && !g.settings.pauseOffers && !summerStop(g) && chance(g, 0.2)) {
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

/** «by» er den som signerer, når det ikke er spilleren selv (f.eks. salgsdirektøren, B-117) */
export function acceptAgreement(g: GameState, id: number, by = "Du"): PurchaseResult {
  const a = g.agreements.find((x) => x.id === id);
  if (!a || a.status !== "tilbud") return { ok: false, message: "Tilbudet finnes ikke lenger." };
  a.status = "aktiv";
  log(g, `${by} signerte en rammeavtale med ${a.customer}: ${fmtT(a.weeklyT)} i uka i ${a.weeks} uker.`, "info");
  // Signert i sommerstansen (B-321): første uke kommer når ovnene går igjen, ikke med frist midt i ferien
  const stopLeft = summerStopDaysLeft(g);
  if (stopLeft > 0) a.nextDay = day(g) + stopLeft;
  else sendAgreementWeek(g, a);
  return { ok: true, message: "Rammeavtale signert." };
}

/** Andel av verdien av ukene som gjenstår, som betales i bot når du avbryter en rammeavtale (B-233) */
export const AGREEMENT_CANCEL_SHARE = 0.3;

/** Hva det koster å avbryte en rammeavtale nå: bot og omdømme (B-233) */
export function agreementCancelCost(a: Agreement): { kr: number; rep: number; weeks: number } {
  const weeks = Math.max(0, a.weeks - a.weeksDone - a.weeksMissed);
  return { kr: Math.round(weeks * a.weeklyT * a.pricePerT * AGREEMENT_CANCEL_SHARE), rep: a.bonusRep * 2, weeks };
}

/**
 * Avbryt en rammeavtale (B-233): kunden får ikke resten av ukene, og ukeleveransen i køen strykes. Det koster en stor
 * bot – 30 % av verdien av ukene som gjenstår – og dobbelt så mye omdømme som bonusen ville gitt.
 */
export function cancelAgreement(g: GameState, id: number): PurchaseResult {
  const a = g.agreements.find((x) => x.id === id);
  if (!a || a.status !== "aktiv") return { ok: false, message: "Avtalen er ikke aktiv." };
  const cost = agreementCancelCost(a);
  a.status = "brutt";
  a.closedDay = day(g);
  g.contracts = g.contracts.filter((c) => !(c.agreementId === a.id && c.status === "aktiv"));
  addCost(g, "bot", cost.kr);
  adjustReputation(g, -cost.rep);
  log(
    g,
    `Du avbrøt rammeavtalen med ${a.customer}. Bot ${fmtKr(cost.kr)} og omdømme −${cost.rep.toFixed(1).replace(".", ",")}.`,
    "bad",
  );
  return { ok: true, message: "Avtalen er avbrutt." };
}

export function declineAgreement(g: GameState, id: number): void {
  g.agreements = g.agreements.filter((a) => !(a.id === id && a.status === "tilbud"));
}

export function acceptContract(g: GameState, id: number, by = "Du"): PurchaseResult {
  const c = g.contracts.find((x) => x.id === id);
  if (!c || c.status !== "tilbud") return { ok: false, message: "Tilbudet finnes ikke lenger." };
  c.status = "aktiv";
  c.acceptedDay = day(g);
  if (by === "Salgsdirektøren") c.byDirector = true;
  // Spilleren svarer på forespørsler igjen: rådet om forespørsler som gikk ut, forsvinner (B-292)
  g.missedOffers = [];
  const others = g.contracts.filter((x) => x.status === "aktiv" && x.id !== c.id).map((x) => x.priority);
  // Et landemerke går først i køen (B-211): med salgsdirektøren var køen alltid full, og landemerket kom for sent
  c.priority = c.landmark ? Math.min(1, ...others) - 1 : Math.max(0, ...others) + 1;
  log(
    g,
    `${by} signerte med ${c.customer}: ${fmtT(c.tonnes)} ${PRODUCTS[c.product].name.toLowerCase()} (${GRADES[c.grade].name}) innen dag ${c.deadlineDay}.`,
    "info",
  );
  return { ok: true, message: "Kontrakt signert." };
}

/** Straffen for å avbryte en aktiv kontrakt: litt billigere enn å bomme på fristen, fordi kunden får vite det i tide (B-057) */
export function cancelPenalty(c: Contract): { bot: number; rep: number } {
  const remaining = Math.max(0, c.tonnes - c.delivered);
  return { bot: Math.round(remaining * c.penaltyPerT * 0.6), rep: Math.round(c.repLoss * 0.5 * 10) / 10 };
}

/** Avbryter en aktiv kontrakt mot bot og tapt omdømme (B-057) */
export function cancelContract(g: GameState, id: number): PurchaseResult {
  const c = g.contracts.find((x) => x.id === id && x.status === "aktiv");
  if (!c) return { ok: false, message: "Kontrakten finnes ikke lenger." };
  const { bot, rep } = cancelPenalty(c);
  addCost(g, "bot", bot);
  repLoss(g, rep, "sen");
  c.status = "misligholdt";
  c.closedDay = day(g);
  g.totals.contractsCancelled = (g.totals.contractsCancelled ?? 0) + 1;
  log(
    g,
    `Du avbrøt kontrakten med ${c.customer} (${fmtT(c.tonnes - c.delivered)} ulevert). Bot ${fmtKr(bot)}, omdømme −${rep.toFixed(1).replace(".", ",")}.`,
    "bad",
  );
  if (c.agreementId) agreementWeekClosed(g, c, false);
  return { ok: true, message: "Kontrakten er avbrutt." };
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
    "skiftleder",
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
        .filter((x) => x !== "murer" || g.stage >= 3)
        .filter((x) => x !== "skiftleder" || g.stage >= 3),
    );
  // Den nye skolen (B-336): søkerne er flinkere fra første dag
  const skill = Math.min(
    5,
    Math.max(
      1,
      Math.round((uniform(g, 0.6, 3.6) + (g.stage >= 3 ? 0.5 : 0) + (hasNeighbor(g, "skole") ? 0.4 : 0)) * 10) / 10,
    ),
  );
  return {
    id: g.nextWorkerId++,
    name: `${pick(g, FIRST_NAMES)} ${pick(g, LAST_NAMES)}`,
    role: r,
    skill,
    salary: normalSalary(g, r, skill),
    hiredDay: 0,
    born: bornAt(g, PENSION.candidateAge),
  };
}

/** Læretid for lærlinger i døgn, før fagprøven (B-163) */
export const APPRENTICE_DAYS = 30;
/** Ferdigheten som trengs for å bestå fagprøven, og døgn til neste forsøk ved stryk */
export const EXAM_SKILL = 1.6;
export const EXAM_RETRY_DAYS = 7;

/** Vanlig lønn for en rolle og ferdighet på dette nivået (samme som for nye kandidater) */
export function normalSalary(g: GameState, role: RoleId, skill: number): number {
  return Math.round(ROLES[role].salary * (0.8 + 0.1 * skill) * (1 + 0.05 * g.stage));
}

/**
 * Fagprøven (B-163): når læretida er over, går lærlingen opp til prøven. Består lærlingen, får den fagbrev, er ikke
 * lærling lenger og får vanlig lønn. Stryker den, tas prøven på nytt om en uke.
 */
export function apprenticeExams(g: GameState): void {
  const today = day(g);
  for (const w of g.workers) {
    if (w.apprenticeUntil === undefined || today < w.apprenticeUntil || isAbsent(g, w)) continue;
    const name = w.name.replace(/ \(lærling\)$/, "");
    if (w.skill >= EXAM_SKILL) {
      w.apprenticeUntil = undefined;
      w.name = name;
      w.skill = Math.min(5, w.skill + 0.2);
      w.salary = Math.max(w.salary, normalSalary(g, w.role, w.skill));
      adjustMorale(g, 1);
      awardPoints(g, 2);
      countEvent(g, "fagbrev");
      log(
        g,
        `${name} har bestått fagprøven og fått fagbrev! Nå er ${name} fagarbeider med vanlig lønn (${fmtKr(w.salary)} per døgn). +2 fagpoeng.`,
        "good",
      );
    } else {
      w.apprenticeUntil = today + EXAM_RETRY_DAYS;
      log(
        g,
        `${name} strøk på fagprøven og prøver igjen om ${EXAM_RETRY_DAYS} døgn. Folk lærer fortere med god trivsel og kurs.`,
        "info",
      );
    }
  }
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
  // Minst én søker til hver anbefalt støtterolle som mangler (B-210). Før kom f.eks. skiftlederen bare tilfeldig, så
  // anbefalingen var umulig å følge
  for (const a of supportAdvice(g)) {
    if (a.role === "allround" || a.have >= a.want) continue;
    if (!g.candidates.some((c) => c.role === a.role)) g.candidates.push(makeCandidate(g, a.role));
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
    if (f.spareProgress >= 1 || !unitType(g, i).arc) return;
    // Hele døgnets oppmuring gjøres i arbeidstida
    f.spareProgress = Math.min(1, f.spareProgress + (perDay * dt) / (MASON_HOURS * 60));
    if (f.spareProgress >= 1) log(g, `Murerne er ferdige: reservepotta til ovn ${i + 1} er klar.`, "good");
  });
}

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
  // Innleide vikarer til ledige plasser går hjem når tida er ute (B-050)
  if (g.tempCrew && g.tempCrew.untilMin <= g.minute) {
    g.tempCrew = null;
    const s = staffing(g);
    log(
      g,
      `De innleide vikarene har gått hjem. Verket går nå ${s.shifts} skift. Lei inn nye eller ansett under Folk.`,
      "event",
    );
  }
  const absent = g.workers.filter((w) => isAbsent(g, w));
  if (!absent.length) return;
  // Står hele verket, trengs ingen vikarer før ovnene skal i gang igjen (B-346). Timen før de starter, leies de inn
  // for dem som fortsatt er borte – av skiftlederen eller automatikken, som ellers
  if (plantRestartMin(g) !== null) return;
  // Skiftlederen dekker alt fravær med vikarer når spilleren har valgt det (B-211), også når skiftene går likevel.
  // Blir noen borte lenger enn vikarene er leid for, forlenger skiftlederen med én gang (B-233): før skjedde det først
  // når vikarene gikk hjem, og Folk viste imens at fraværet ikke var dekket
  if (g.settings.leaderTemps && shiftLeaderAtWork(g)) {
    const lastBack = Math.max(...absent.map((w) => w.absentUntil ?? 0));
    if (!tempsActive(g) || (g.tempsUntilMin ?? 0) < lastBack) bookTemps(g, daysUntilAllBack(g), true);
    return;
  }
  if (tempsActive(g)) return;
  const full = staffing(g, true).shifts;
  const now = staffing(g).shifts;
  if (now >= full) return;
  if (auto(g, "autoTemps")) {
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
      `${name} for strøm går ut om ${left === 1 ? "ett døgn" : "tre døgn"} (dag ${s.powerDealUntilDay}). ${auto(g, "powerAutoRenew") ? "Den fornyes av seg selv." : "Da går du tilbake til spotpris – velg ny avtale under Marked hvis du vil."}`,
      "event",
    );
  if (left > 0) return;
  if (auto(g, "powerAutoRenew")) {
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

/**
 * Fravær (B-031): ferie kommer automatisk med tre døgns varsel, og enkeltpersoner kan bli syke –
 * oftere når trivselen er lav eller verket går nattskift. Ledige avløsere dekker plassene.
 */
function updateAbsence(g: GameState, stats: PlantStats): void {
  if (!g.workers.length) return;
  const today = day(g);
  const vacationCap = Math.max(1, Math.floor(g.workers.length * 0.1));
  // Med 4- og 5-skift dekker de ekstra lagene fravær. Da står det bare i loggen, ikke som varsel – med mindre
  // fraværet gjør at verket mister et skift (B-083). «spare» = et lag mer enn de tre som trengs.
  const extraCrews = staffing(g, true).crews > 3;
  const kind = (spare: boolean): "info" | "event" => (extraCrews && spare ? "info" : "event");
  const onVacation = (from: number, until: number) =>
    g.workers.filter((w) => w.absentReason === "ferie" && w.absentFrom! < until && w.absentUntil! > from).length;
  // Fravær som er over, fjernes først, så varslene under regner med dem som faktisk er borte
  for (const w of g.workers) {
    if (w.absentUntil !== undefined && g.minute >= w.absentUntil) {
      // Ferdig med lederutviklingen (B-210): blir skiftleder, med skiftlederlønn
      if (w.absentReason === "lederkurs") {
        w.role = "skiftleder";
        w.salary = normalSalary(g, "skiftleder", w.skill);
        log(g, `${w.name} er ferdig med lederutviklingen og er nå skiftleder.`, "good");
      }
      w.absentFrom = w.absentUntil = w.absentReason = undefined;
    }
  }
  // Juleferie (B-298): ferie som går over jula, heter det
  const holiday = (from: number, until: number) => {
    for (let d = day(g, from); d <= day(g, until - 1); d++) if (isChristmas(d)) return "juleferie";
    return "ferie";
  };
  for (const w of g.workers) {
    if (w.absentReason === "ferie" && w.absentFrom !== undefined && Math.abs(w.absentFrom - g.minute) < 60)
      log(
        g,
        `${w.name} (${ROLES[w.role].name.toLowerCase()}) har ${holiday(w.absentFrom, w.absentUntil!)} fra i dag til dag ${day(g, w.absentUntil! - 1)}.`,
        kind(staffing(g).crews >= 3),
      );
    if (w.nextVacationDay === undefined) w.nextVacationDay = today + randInt(g, 17, 183);
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
      // Fellesferien (B-298) er ferien om sommeren: ingen egen ferie i de tre ukene
      const breakDay = [day(g, from), day(g, until - 1)].find((d) => inSummerBreak(d));
      if (g.stage >= SUMMER.fromStage && breakDay !== undefined) {
        w.nextVacationDay = summerStart(breakDay) + SUMMER.days + randInt(g, 1, 10);
        continue;
      }
      w.absentFrom = from;
      w.absentUntil = until;
      w.absentReason = "ferie";
      // Egen ferie 40 % sjeldnere etter fellesferien (B-298; var 100–140 døgn)
      w.nextVacationDay = day(g, until) + randInt(g, 167, 233);
      log(
        g,
        `${w.name} (${ROLES[w.role].name.toLowerCase()}) får ${holiday(from, until)} dag ${day(g, from)}–${day(g, until - 1)}.`,
        // Forhåndsvarsel: med ekstra lag bare i loggen; mister verket et skift, varsles det på selve dagen
        kind(true),
      );
      continue;
    }
    // Sykdom
    const risk =
      0.005 *
      (1 + Math.max(0, 60 - g.morale) / 60) *
      (nightExtra(g, stats.hours) > 0 ? 1.3 : 1) *
      crewBenefits(stats.crews, stats.hours).sick *
      (hasResearch(g, "ledelse") ? 0.7 : 1) *
      // Tett oppfølging fra en skiftleder på jobb (B-178)
      (shiftLeaderAtWork(g) ? SHIFT_LEADER_SICK : 1) *
      // Sykehuset (B-336): færre sykemeldinger
      (hasNeighbor(g, "sykehus") ? 0.8 : 1) *
      // Noen er oftere borte; en advarsel virker på dem (B-101)
      (oftenSick(w) && (w.warnedDay === undefined || today - w.warnedDay >= WARNING_DAYS) ? 2.0 : 0.75);
    // I sommerstansen har alle ferie (B-298), så ingen blir sykmeldt fra jobben (B-346)
    if (!busy && !summerStop(g) && chance(g, risk)) {
      const len = randInt(g, 1, 3);
      w.absentFrom = g.minute;
      w.absentUntil = g.minute + len * MIN_PER_DAY;
      w.absentReason = "syk";
      w.sickDays = [...(w.sickDays ?? []), today].slice(-12);
      log(
        g,
        `${w.name} (${ROLES[w.role].name.toLowerCase()}) er syk ${len === 1 ? "i dag" : `i ${len} døgn`}.`,
        kind(staffing(g).crews >= 3),
      );
    }
  }
}

/**
 * Noen ansatte er oftere borte enn andre (B-101). Det avgjøres av id-en, ikke av tilfeldighetsgeneratoren, så
 * resten av spillet trekker de samme tallene som før. Omtrent hver femte er «ofte syk».
 */
export function oftenSick(w: Worker): boolean {
  return ((w.id * 2654435761) >>> 0) % 100 < 20;
}
export const WARNING_DAYS = 90;
/** Sykdomsrisikoen med en skiftleder på jobb (B-178) */
export const SHIFT_LEADER_SICK = 0.85;

export function shiftLeaderAtWork(g: GameState): boolean {
  return g.workers.some((w) => w.role === "skiftleder" && !isAbsent(g, w));
}

/**
 * Skiftlederen følger opp fraværet hvert døgn (B-178): den som har vært syk tre ganger på 60 døgn og misbruker
 * egenmelding, får en advarsel – som advarselen spilleren kan gi under Folk → Fravær. Skiftlederen kjenner folka sine
 * og tar aldri samtalen med dem som faktisk var syke, så trivselen ikke går ned for det.
 */
function shiftLeaderFollowUp(g: GameState): void {
  const leader = g.workers.find((w) => w.role === "skiftleder" && !isAbsent(g, w));
  if (!leader) return;
  const today = day(g);
  for (const w of g.workers) {
    if (w === leader || !oftenSick(w) || sickSpells(g, w) < 3) continue;
    if (w.warnedDay !== undefined && today - w.warnedDay < WARNING_DAYS) continue;
    w.warnedDay = today;
    adjustMorale(g, -1);
    log(
      g,
      `Skiftleder ${leader.name} tok en samtale med ${workerLabel(w)} om fraværet. Egenmeldingene bør bli sjeldnere nå.`,
      "info",
    );
  }
}

/** Hvor mange ganger den ansatte har vært syk de siste døgnene */
export function sickSpells(g: GameState, w: Worker, days = 60): number {
  const today = day(g);
  return (w.sickDays ?? []).filter((d) => today - d < days).length;
}

/** Navn og stilling, f.eks. «Kari Berg (støper)», så spilleren ser hvilken plass som må fylles (B-066) */
export function workerLabel(w: Worker): string {
  return `${w.name} (${ROLES[w.role].name.toLowerCase()})`;
}

/** Hvem som sluttet, med stilling, og hva spilleren bør gjøre (B-066) */
export function quitText(ws: Worker[]): string {
  return `${ws.map(workerLabel).join(", ")} har sagt opp. Ansett ${ws.length === 1 ? "en ny" : "nye"} under Folk → Ansett.`;
}

/** Trivselen driver mot det normale, nattarbeid tærer, og misfornøyde folk slutter (B-026) */
function updateMorale(g: GameState, stats: PlantStats): void {
  if (!g.workers.length) return;
  // Ledelse og arbeidsmiljø løfter det normale nivået (B-085); lenge siden bonus senker det (B-159)
  g.morale += (moraleNormal(g) - g.morale) * 0.05;
  // Fire og fem skiftlag gir fridager i turnusen (B-073), men høyst 15 over normalnivået (B-159)
  liftMorale(g, crewBenefits(stats.crews, stats.hours).morale);
  if (nightExtra(g, stats.hours) > 0) adjustMorale(g, -1.5);
  if (g.morale < 35) {
    const quitters = g.workers.filter(() => chance(g, ((35 - g.morale) / 35) * 0.04));
    if (quitters.length) {
      g.workers = g.workers.filter((w) => !quitters.includes(w));
      log(g, `${quitText(quitters)} Trivselen er lav – gi bonus, send folk på kurs eller unngå nattskift.`, "bad");
    }
  }
}

let scheduledSwitch: (g: GameState) => void = () => {};
/** Planlagt bytte av støping (B-102) registreres fra actions.ts, så motoren slipper å importere den i ring */
export function setScheduledSwitch(fn: (g: GameState) => void): void {
  scheduledSwitch = fn;
}

function onHour(g: GameState, stats: PlantStats): void {
  // Varsel når kassa går tom og kassekreditten tas i bruk (B-033)
  if (g.cash < 0 && !g.inCredit) {
    g.inCredit = true;
    log(g, `Kassa er tom – du bruker nå kassekreditten (grense ${fmtKr(creditLimit(g, stats))}).`, "bad");
  } else if (g.cash >= 0) g.inCredit = false;
  maybeTip(g, stats);
  checkTemps(g);
  // Havari på renseanlegget (B-263)
  envHour(g, stats);
  // Reparatøren bytter slitte kokiller (B-351)
  mouldHour(g, stats);
  // Frost om vinteren (B-265)
  winterHour(g, stats);
  // Kapitlene forskningen krever, kommer i fagboka når forskningen blir synlig (B-025)
  for (const r of RESEARCH)
    if (r.reads && r.stage <= g.stage && (!r.konsern || g.konsern?.unlocked)) unlock(g, r.reads);
  checkMissions(g);
  checkChallenges(g);
  scheduledSwitch(g);
  checkWin(g);
  expireOffers(g, stats);
  trickleOffers(g, stats);
  deliverContracts(g);
  // Støpefeil håndteres automatisk etter valget (B-035)
  handleSeconds(g);
  if (auto(g, "autoSpot")) {
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
  // Automatisk innkjøp krever en planlegger (se B-021). Er planleggeren borte, går de faste bestillingene
  // videre (B-048)
  g.autoBuyNote = null;
  if ((auto(g, "autoBuy") || (g.specialists?.sen ?? 0) > g.minute) && plannerOrders(g)) autoBuy(g, stats);
}

/**
 * Kjøper skrap for et par døgns forbruk (planleggerens jobb, eller spillerens): etter reseptene til kvalitetene i
 * ordrekøen (B-171). Planleggeren holder seg innenfor døgngrensen, og bruker bare kassekreditten hvis spilleren
 * har tillatt det; ellers lar den lønn og faste kostnader for ett døgn ligge igjen i kassa (B-027).
 */
export function autoBuy(
  g: GameState,
  stats: PlantStats,
  opts: { credit: boolean; cap: number | null } = {
    credit: g.settings.autoBuyCredit,
    cap: g.settings.autoBuyMaxPerDay,
  },
): void {
  // Spilleren kan velge hvor mange tonn planleggeren skal holde på lager (B-271); ellers et par døgns forbruk
  const stockT = g.settings.autoBuyTargetT;
  const need = Math.max(
    stats.units.reduce((a, u) => a + u.sizeT, 0) * 2,
    stockT ? Math.min(stockT, stats.yardT) : (stats.dailyProductT / stats.castYield) * 1.1 * g.settings.autoBuyDays,
  );
  // Hvor mye av hver skraptype de neste døgnene trenger (B-171): kvalitetene i ordrekøen, i rekkefølge, til
  // innkjøpet er dekket. Er køen kort, fylles resten med det ovnene kjører nå (med flere kvaliteter samtidig, B-039)
  const demand = Object.fromEntries(SCRAP_IDS.map((id) => [id, 0])) as Record<ScrapId, number>;
  const addGrade = (grade: GradeId, t: number) => {
    const r = gradeRecipe(g, grade);
    const sum = SCRAP_IDS.reduce((a, id) => a + r[id], 0) || 1;
    for (const id of SCRAP_IDS) demand[id] += (t * r[id]) / sum;
  };
  let planned = 0;
  for (const c of ordersToMake(g)) {
    if (planned >= need) break;
    const t = Math.min((c.tonnes - c.delivered) / Math.max(0.5, stats.castYield), need - planned);
    addGrade(c.grade, t);
    planned += t;
  }
  if (planned < need)
    for (let i = 0; i < g.furnaces.length; i++) addGrade(furnaceGrade(g, i), (need - planned) / g.furnaces.length);
  // Returskrap kan ikke kjøpes: det som mangler av det, kjøpes som de andre typene i blandingen
  const buyableIds = SCRAP_IDS.filter((id) => demand[id] > 0 && SCRAP_TYPES[id].buyable && scrapUnlocked(g, id));
  const buyableSum = buyableIds.reduce((a, id) => a + demand[id], 0);
  const target = { ...demand };
  for (const id of SCRAP_IDS) {
    if (demand[id] <= 0 || buyableIds.includes(id)) continue;
    const gap = Math.max(0, demand[id] - g.scrap[id].t);
    if (buyableSum > 0) for (const b of buyableIds) target[b] += (gap * demand[b]) / buyableSum;
  }
  if (!buyableIds.length) return;
  // Snøstorm (B-279): ingen skrapbiler kommer fram, så planleggeren venter. Ingen «!» på Marked – spilleren kan ikke
  // gjøre noe med det; det står på Marked → Skrap og i loggen
  if (scrapBlocked(g)) return;
  // Hvorfor planleggeren ikke fikk kjøpt det resepten trenger, så spilleren kan se det (B-048)
  const note = (text: string, id: ScrapId) =>
    void (g.autoBuyNote = g.autoBuyNote ?? `${SCRAP_TYPES[id].name.toLowerCase()}: ${text}`);
  // Lageret fullt av skrap ingen resept i køen bruker? Planleggeren selger det, så det blir plass (B-171)
  if (g.settings.plannerSells !== false) {
    const missing = buyableIds.reduce(
      (a, id) => a + (g.scrap[id].t < target[id] * 0.6 ? target[id] - g.scrap[id].t : 0),
      0,
    );
    const free = stats.yardT - stats.yardUsed;
    // Planleggeren holder av plass (B-208): er lageret over 90 % fullt, selges det som ikke trengs, ned til 80 %, i én
    // omgang. Før solgte den bare det neste kjøp trengte, så lageret sto alltid fullt og innkjøpet kom for sent.
    const crowded = stats.yardUsed > stats.yardT * 0.9 ? stats.yardUsed - stats.yardT * 0.8 : 0;
    let toFree = Math.max(missing - free, crowded);
    if (toFree > stats.sizeT * 0.1) {
      const sold: string[] = [];
      let income = 0;
      // Returskrapet skrapklasseren bruker i innkjøpsperioden, beholdes
      const keep = (id: ScrapId) =>
        Math.max(demand[id] > 0 ? target[id] * 1.5 : 0, id === "retur" && hasGrader(g) ? need * RETURN_MAX_SHARE : 0);
      const surplus = SCRAP_IDS.map((id) => ({ id, t: g.scrap[id].t - keep(id) }))
        .filter((x) => x.t > stats.sizeT * 0.1 && !g.scrap[x.id].radioactive)
        .sort((a, b) => (demand[a.id] > 0 ? 1 : 0) - (demand[b.id] > 0 ? 1 : 0) || b.t - a.t);
      for (const x of surplus) {
        if (toFree <= 0) break;
        const t = Math.min(x.t, toFree);
        const before = g.cash;
        if (!sellScrap(g, x.id, t).ok) continue;
        income += g.cash - before;
        toFree -= t;
        sold.push(`${fmtT(t)} ${SCRAP_TYPES[x.id].name.toLowerCase()}`);
      }
      if (sold.length)
        log(
          g,
          `Planleggeren solgte ${joinAnd(sold)} som ingen resept i ordrekøen trenger, for å få plass til det som trengs (${fmtKr(income)}).`,
          "info",
        );
    }
  }
  for (const id of buyableIds) {
    const want = target[id];
    const stock = g.scrap[id].t;
    if (stock >= want * 0.6) continue;
    const s = computePlantStats(g);
    const reserve = stats.salaryPerDay + STAGES[g.stage].fixedPerDay;
    let money = opts.credit ? g.cash + creditLimit(g) * 0.9 : g.cash - reserve;
    if (opts.cap !== null) money = Math.min(money, opts.cap - (g.today.autoBuyKr ?? 0));
    const afford = Math.max(0, money / scrapPrice(g, id));
    const room = s.yardT - s.yardUsed;
    const amount = Math.min(want - stock, afford, room);
    if (amount <= stats.sizeT * 0.1) {
      if (want - stock > stats.sizeT * 0.1)
        note(
          room <= stats.sizeT * 0.1
            ? g.settings.plannerSells === false
              ? "skraplageret er fullt av annet skrap (la planleggeren selge det under Marked → Planlegger)"
              : "skraplageret er fullt av skrap som trengs i ordrekøen"
            : opts.cap !== null && opts.cap - (g.today.autoBuyKr ?? 0) <= scrapPrice(g, id) * stats.sizeT * 0.1
              ? "døgngrensen for innkjøp er brukt opp"
              : opts.credit
                ? "kassekreditten er brukt opp"
                : "det er ikke nok penger i kassa, og planleggeren har ikke lov til å bruke kassekreditten",
          id,
        );
      continue;
    }
    const before = g.cash;
    buyScrap(g, id, amount, s);
    g.today.autoBuyKr = (g.today.autoBuyKr ?? 0) + (before - g.cash);
  }
}

function walk(g: GameState, value: number, mean: number, pull: number, sd: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value + (mean - value) * pull + noise(g, sd)));
}

function onDay(g: GameState, stats: PlantStats): void {
  // Like partier på lageret slås sammen (B-353)
  compactLots(g);
  const today = day(g);
  // Effekttariff for døgnet som er slutt: betales for den høyeste effekten verket trakk
  if (g.today.peakMW) addCost(g, "nett", g.today.peakMW * PEAK_RATE_PER_MW);
  // Overskuddet fra datterverkene i konsernet (B-106)
  if (g.konsern?.plants.length || g.konsern?.director) konsernDay(g);
  {
    const t = g.today;
    const cast = (t.onGradeT ?? 0) + (t.offGradeT ?? 0) + (t.secondT ?? 0);
    if ((t.onGradeT ?? 0) > 0 && !t.offGradeT) countEvent(g, "rene_dogn");
    if (cast > 0 && (t.secondT ?? 0) / cast < 0.03) countEvent(g, "fine_stopedogn");
    if ((t.kwh ?? 0) > 0 && (t.costs.energi ?? 0) / t.kwh! < 0.7) countEvent(g, "billig_strom");
  }
  g.today.cashEnd = g.cash;
  g.history.push(roundDay(g.today));
  if (g.history.length > HISTORY_MAX) g.history.splice(0, g.history.length - HISTORY_MAX);
  g.today = newDay(today, g.cash);
  paidOutDayLog(g);

  updatePowerDeal(g, today);
  if (g.gridCut && g.minute >= g.gridCut.untilMin) g.gridCut = null;

  // Bot for gårsdagens utslipp (B-263)
  envDay(g);
  // Vinteren kommer og går (B-265), og fellesferien (B-298)
  calendarDay(g, stats);
  // Krig i verden (B-297): bare i konsernet
  const war = warDay(g);
  if (war) log(g, war.text, war.kind);
  // Faste kostnader
  // Under sommerstansen (B-298) har alle ferie med feriepenger som er opptjent gjennom året: ingen lønn de tre ukene
  if (!summerStop(g)) addCost(g, "lonn", stats.salaryPerDay);
  // Administrasjonen på storverket vokser med kapasiteten (B-305): 250 kr per tonn døgnkapasitet over 5 000 t
  // Mesterskapet «Konsernledelse» gir lavere administrasjon (B-328)
  addCost(g, "faste", STAGES[g.stage].fixedPerDay + adminPerDay(stats) * masteryFactor(g, "datterverk"));
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
  // Trender i markedet (B-255): bare kvaliteter og varer spilleren kan få forespørsler på
  const wantedGrades = g.settings.offerGrades ?? [];
  const trendGrades = GRADE_IDS.filter(
    (id) => GRADES[id].minStage <= g.stage && (!wantedGrades.length || wantedGrades.includes(id)),
  );
  const trendMsg = updateTrend(g, today, stats.products, trendGrades);
  if (trendMsg) log(g, trendMsg, "event");
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
    // Tørre perioder: prisen ligger høyt i flere uker, så en fastprisavtale lønner seg (B-105)
    if (m.powerDryDays > 0) {
      m.powerDryDays -= 1;
      if (m.powerDryDays === 0) log(g, "Det har regnet: strømprisen faller mot normalt igjen.", "info");
    } else if (chance(g, 0.012)) {
      m.powerDryDays = randInt(g, 12, 25);
      log(
        g,
        "Tørt og lite vann i magasinene: strømprisen blir høy de neste ukene. Fastpris kan lønne seg nå.",
        "event",
      );
    }
    m.powerFactor = walk(g, m.powerFactor, m.powerDryDays > 0 ? 1.7 : 1, 0.2, 0.11, 0.5, 2.2);
    if (chance(g, 0.05)) {
      m.powerSpikeDays = randInt(g, 2, 4);
      m.powerFactor = uniform(g, 2.2, 3.2);
      log(
        g,
        `Kulde og lite vind: strømprisen er ${m.powerFactor.toFixed(1).replace(".", ",")} ganger normalt de neste døgnene.`,
        "event",
      );
      if (stats.furnace.fuel === "strøm") unlock(g, "strom");
    }
  }
  m.spotSoldToday = {};

  // Kontrakter
  endStaleAgreements(g, stats);
  for (const c of g.contracts) {
    // Landemerker har ingen frist (B-218): de står i køen til de er levert
    if (c.status === "aktiv" && !c.landmark && c.deadlineDay < today) {
      const remaining = c.tonnes - c.delivered;
      const penalty = remaining * c.penaltyPerT;
      addCost(g, "bot", penalty);
      repLoss(g, c.repLoss, "sen");
      c.status = "misligholdt";
      c.closedDay = today;
      g.totals.contractsMissed = (g.totals.contractsMissed ?? 0) + 1;
      log(
        g,
        `Fristen til ${c.customer} gikk ut med ${fmtT(remaining)} ulevert. Bot ${fmtKr(penalty)}, omdømme −${c.repLoss.toFixed(1).replace(".", ",")}.${c.agreementId ? " Det var en ukeleveranse i rammeavtalen." : c.byDirector ? " Salgsdirektøren hadde signert den." : ""}`,
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
    const growth =
      (hasResearch(g, "opplaering") ? 0.04 : 0.025) *
      (0.5 + g.morale / 100) *
      crewBenefits(stats.crews, stats.hours).learn;
    // Bare de som er på jobb, blir flinkere av å jobbe
    for (const w of g.workers) if (!isAbsent(g, w)) w.skill = Math.min(5, w.skill + growth);
    if (stats.ownerWorks) g.ownerSkill = Math.min(4.5, g.ownerSkill + 0.04);
  }
  apprenticeExams(g);
  pensionMorning(g);
  updateMorale(g, stats);
  updateAbsence(g, stats);
  shiftLeaderFollowUp(g);
  // Sykdom settes her, etter timesjekken: sjekk vikarene med én gang, så skiftet ikke faller en time (B-053)
  checkTemps(g);
  refreshCandidates(g);
  if (!g.pendingDecision) maybeAdvisor(g);
  maybeCreateDecision(g);

  // Står verket fordi det ikke er råd til omforing, og lånet er fullt, er det slutt (B-033)
  const cantReline = g.furnaces.every((f) => (f.waitReason ?? "").includes("mangler penger til omforing"));
  if (cantReline && g.loan >= maxLoan(g) - 1) {
    g.stuckDays = (g.stuckDays ?? 0) + 1;
    if (g.stuckDays === 1)
      log(
        g,
        "Verket står: det er ikke råd til ny foring, og banken låner ikke ut mer. Skaff penger innen tre døgn.",
        "bad",
      );
    if (g.stuckDays >= 3) {
      g.gameOver = true;
      g.speed = 0;
      g.gameOverReason = "Ovnen trengte ny foring, men det var ikke penger til det, og banken ville ikke låne ut mer.";
      log(g, "Banken har begjært verket konkurs.", "bad");
    }
  } else g.stuckDays = 0;

  // Banken
  if (g.cash < -creditLimit(g)) {
    // Sommerstansen (B-349): verket kan ikke tjene penger i tre uker, så banken venter med å telle til ovnene går igjen.
    // Før ble spillere som hadde kjøpt skrap på kreditt rett før ferien, slått konkurs mens verket sto
    if (summerStop(g)) {
      if (summerStopDaysLeft(g) % 7 === 0)
        log(
          g,
          `Kassa er under kredittgrensen. Banken venter til sommerstansen er over – da har du ${BANKRUPTCY_DAYS - g.negativeDays} døgn på å komme under grensen. ${CREDIT_HELP}`,
          "bad",
        );
    } else {
      g.negativeDays += 1;
      if (g.negativeDays === 1 || g.negativeDays >= BANKRUPTCY_DAYS - 2) {
        log(
          g,
          `Banken er bekymret: du er over kredittgrensen (dag ${g.negativeDays} av ${BANKRUPTCY_DAYS}). ${CREDIT_HELP}`,
          "bad",
        );
      }
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
  checkWin(g);
}

/**
 * Seier: konsernverdi (egenkapital + datterverk) på 10 mrd. Sjekkes hver time, ikke bare ved midnatt (B-091, B-106)
 */
export function checkWin(g: GameState): void {
  // Det som er betalt ut over kassetaket, teller med (B-341): taket er like høyt som sluttmålet
  if (!g.won && !g.gameOver && g.stage === STAGES.length - 1 && valueCreated(g) >= WIN_CASH) {
    g.won = true;
    log(g, "Du har bygget et av landets største stålkonsern. Gratulerer!", "good");
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
  // Røyk og støv fra ovnene som går: det renseanlegget ikke tar, gir bot neste døgn (B-263)
  updateEmissions(g, stats, dt);
  updatePots(g, stats, dt);
  // Effekttoppen: effekten til ovnene som smelter samtidig (B-074: hver ovn sin effekt)
  const mw = g.furnaces.reduce((a, f, i) => a + (f.heat ? (stats.units[i]?.furnaceMW ?? stats.furnaceMW) : 0), 0);
  if (mw > (g.today.peakMW ?? 0)) g.today.peakMW = mw;
  updateCasting(g, stats, dt);
  updateRolling(g, stats, dt);
  processComplaints(g);
  // Byggeprosjekter i konsernet blir ferdige i ekte tid (B-209)
  if (g.konsern?.plants.length) finishKonsernProjects(g);

  const hourBefore = Math.floor(before / 60);
  const hourNow = Math.floor(g.minute / 60);
  if (hourNow !== hourBefore) {
    stats = computePlantStats(g);
    onHour(g, stats);
  }
  if (Math.floor(g.minute / MIN_PER_DAY) !== Math.floor(before / MIN_PER_DAY)) {
    onDay(g, computePlantStats(g));
  }
  // Taket for kassa: overskuddet betales ut til eierne (B-303)
  applyCashCap(g);
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
  /** Andel av stålet som gikk tapt ut slaggdøra eller over øsa (B-076) */
  lossFraction?: number;
  /** Poeng i kontrollrommet (B-175) */
  points?: number;
}

/** Legger en charge spilleren kjørte selv inn i produksjonen. */
export function completeManual(g: GameState, result: ManualResult | null): void {
  const req = g.pendingManual;
  if (!req) return;
  g.pendingManual = null;
  g.speed = req.resumeSpeed;
  const f = g.furnaces[req.furnace];
  const stats = unitView(computePlantStats(g), req.furnace);
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
    // Stål som rant ut slaggdøra eller over øsa, er tapt (B-076)
    liquidT: req.sizeT * req.metallicYield * (1 - (result.lossFraction ?? 0)),
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
  if ((result.stars ?? 0) >= 5) countEvent(g, "perfekte_charger");
  // En godt kjørt charge skal lønne seg (B-086): kunden betaler ekstra for stålet, og du lærer mer
  const stars = result.stars ?? 0;
  if (stars >= 4) {
    const share = stars >= 5 ? 0.06 : 0.03;
    const value = f.heat.liquidT * productPrice(g, castingType(g).product, req.grade);
    const bonus = Math.round(value * share);
    const fp = stars >= 5 ? 15 : 8;
    addIncome(g, "kontrakt", bonus);
    awardPoints(g, fp);
    if (stars >= 5) adjustReputation(g, 0.5);
    log(
      g,
      `${stars >= 5 ? "Perfekt charge" : "Godt kjørt"}! Stålet er så jevnt at kundene betaler ${Math.round(share * 100)} % ekstra: +${fmtKr(bonus)}, og du fikk ${fp} ekstra fagpoeng${stars >= 5 ? " og omdømme +0,5" : ""}.`,
      "good",
    );
  }
  if (result.ok) {
    adjustReputation(g, 0.5);
    log(
      g,
      `Du kjørte charge i ovn ${req.furnace + 1} selv: ${result.kwhPerT.toFixed(0)} kWh/t, P ${result.phosphorusPct.toFixed(3).replace(".", ",")} %. Innenfor krav – omdømme +0,5.`,
      "good",
    );
  } else {
    log(g, `Du kjørte charge i ovn ${req.furnace + 1} selv, med avvik: ${result.deviations.join("; ")}.`, "event");
  }
  if (result.points !== undefined && result.points > (g.controlBest ?? 0)) {
    if ((g.controlBest ?? 0) > 0)
      log(
        g,
        `Ny rekord i kontrollrommet: ${nf0.format(result.points)} poeng (før ${nf0.format(g.controlBest ?? 0)}).`,
        "good",
      );
    g.controlBest = result.points;
  }
  if ((result.lossFraction ?? 0) > 0.01)
    log(
      g,
      `${Math.round((result.lossFraction ?? 0) * 100)} % av stålet i chargen gikk tapt – i slaggen som kokte over, med slaggen du raket ut eller over øsa.`,
      "bad",
    );
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
  // Rundes ned (mot null), så 999,996 mill. ikke vises som 1 000,00 mill. (B-091)
  const down = (x: number) => Math.floor(x * 100) / 100;
  if (abs >= 1_000_000_000) return `${sign}${nf2.format(down(abs / 1_000_000_000))} mrd. kr`;
  if (abs >= 1_000_000) return `${sign}${nf2.format(down(abs / 1_000_000))} mill. kr`;
  return `${sign}${nf0.format(abs)} kr`;
}

/**
 * Kort form til toppfeltet (B-381): uten kassetak kan kassa bli tusenvis av milliarder. Fra 100 mrd. vises hele
 * milliarder uten desimaler, så tallet får plass på 320 px. Det nøyaktige beløpet står i detaljene (fmtKr).
 */
export function fmtKrCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs < 100_000_000_000) return fmtKr(v);
  return `${v < 0 ? "−" : ""}${nf0.format(Math.floor(abs / 1_000_000_000))} mrd. kr`;
}

export function fmtT(t: number): string {
  if (t < 1) return `${nf0.format(t * 1000)} kg`;
  if (t < 100) return `${nf1.format(t)} t`;
  return `${nf0.format(t)} t`;
}
