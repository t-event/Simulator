/**
 * Små, raske tester av spillmotoren (B-097). Kjøres med `npx tsx src/game/tests.ts` og i CI.
 * Hver test bygger sin egen tilstand, så de ikke er avhengige av lagrede filer.
 */
import {
  buildNeighbor,
  buyMastery,
  buyUpgrade,
  gateBlocker,
  doResearch,
  finishBigBuild,
  finishNeighbor,
  giveBonus,
  hireForWildcards,
  LEADER_COURSE_DAYS,
  leaderCourseBlock,
  leaderCourseCost,
  sendOnLeaderCourse,
  runScheduledSwitch,
  scheduleCastingSwitch,
  switchCashNeeded,
  SWITCH_WAIT_DAYS,
  setPowerDeal,
  upgradeOptions,
} from "./actions";
import { MASTERY, MASTERY_IDS, masteryCost, masteryEffect, masteryOpen } from "./mastery";
import {
  bidToTake,
  buyoutMax,
  buyoutPay,
  controlAdvice,
  controlAfterInvest,
  controlSteps,
  controlWord,
  defenseNeeded,
  investPart,
  policyLockedUntil,
  policySplit,
  protectedUntil,
  takeoverAttack,
  takeoverDefense,
} from "./control";
import {
  ACHIEVEMENT_BY_ID,
  ACHIEVEMENTS,
  applyServerBadges,
  visibleAchievements,
  visibleFamilies,
  achievementsDone,
  checkAchievements,
  hasAchievement,
  nextInFamily,
} from "./achievements";
import {
  buyCosmetic,
  COSMETIC_BY_ID,
  COSMETICS,
  cosmeticBlocked,
  cosmeticListed,
  cosmeticOn,
  FACADE,
  facadeColors,
  grantCosmetic,
  setCosmetic,
  trackCosmetic,
} from "./cosmetics";
import { CHALLENGES, checkChallenges, currentChallenge } from "./challenges";
import { TREND, trendPriceFactor, updateTrend } from "./trends";
import { ADDONS, CASTINGS, FURNACES, STAGES, WIN_CASH } from "./data";
import {
  advance,
  assessOffer,
  queueFit,
  queueMinutes,
  nextAgreementWeek,
  realisticDailyT,
  agreementCancelCost,
  cancelAgreement,
  checkWin,
  extraOffer,
  completeManual,
  fmtKr,
  log,
  makeCandidate,
  newGame,
  oftenSick,
  creditLimit,
  compactLots,
  ordersToMake,
} from "./engine";
import { logTopic, showToast, unseenCount } from "./inbox";
import { KNOWLEDGE, KNOWLEDGE_PARTS, readSeconds } from "./knowledge";
import {
  applyMissionBonus,
  applyStreakReward,
  AWAY_DAYS_PER_HOUR,
  AWAY_MAX_HOURS,
  awayReward,
  dayOfDrift,
  DRIFT_FLOOR,
  MISSION_BONUS,
  missionBonusReady,
  missionDone,
  missionProgress,
  pickMissions,
  missionBonus,
  startMissionDay,
  STREAK_REWARDS,
  streakReward,
} from "./daily";
import { applyWorldEvents, canJoinDirectly, joinSeason, SEASON_BONUS_FP, worldFactor, applySeasonTwist } from "./world";
import {
  ADMIN_FREE_T,
  ADMIN_PER_CAP_T,
  adminPerDay,
  dealPrice,
  energyPrice,
  marketSaturation,
  PRICE_BONUS_MAX,
  productPrice,
} from "./plant";
import {
  acceptContract,
  orderQueue,
  autoBuy,
  ensureCandidates,
  RETURN_MAX_SHARE,
  scrapAlert,
  scrapPrice,
  scrapShort,
  scrapSellPrice,
  sellScrap,
  spotQuota,
  takeScrap,
  adjustReputation,
} from "./engine";
import { buildDays, hasNeighbor, isBigPurchase, nextNeighbor, rampFactor } from "./building";
import {
  checkKonsernMilestones,
  kompleksOpen,
  LEGENDS,
  modernizeMax,
  titleOf,
  WIN_TITLE,
  directorPerDay,
  maxSisters,
  earnedOf,
  titleAboveEarned,
  moreSlotsText,
  sisterPrice,
  sisterSalePrice,
  SELL_SHARE,
  checkKonsernUnlock,
  konsernAdvice,
  directorLevel,
  nextDirectorUpgrade,
  upgradeDirector,
  konsernOptions,
  SISTER_NAMES,
  DIRECTOR_HIRE,
  DIRECTOR_PER_DAY,
  directorHour,
  fireDirector,
  hireDirector,
  KONSERN_UNLOCK_EQUITY,
  konsernDay,
  konsernEquity,
  konsernNetFor,
  konsernValue,
  worthwhileOptions,
  konsernReady,
  valueCreated,
  dividendInput,
  dividends,
  sisterDividend,
  MODERNIZE_GAIN,
  SISTER_TYPES,
  MODERNIZE_SHARE,
  sisterProfit,
  BUILD_HOURS,
  sisterValue,
  FLAGSHIP_MAX,
  flagshipBonus,
  MODERNIZE_HOURS,
  underConstruction,
  finishKonsernProjects,
  localCancel,
  localOrder,
  localSell,
  localMove,
  raiseLevel,
  nextLevelProgress,
  realNow,
  setRealClock,
} from "./konsern";
import {
  bonusGap,
  day,
  castingType,
  computePlantStats,
  satisfiedGrades,
  gradeRecipe,
  liftMorale,
  moraleNormal,
  productCapT,
  supportAdvice,
} from "./plant";
import { RESEARCH, researchOptions } from "./research";
import { migrate, parseSave } from "./save";
import { ageOf, PENSION, pensionDay, pensionMorning, pensionSoon, retireAgeOf } from "./pension";
import { dutyWorkers, presentWorkers as presentNow, wildcardUse as wildUse } from "./plant";
import { afterEmpireLoad, DIVIDEND, dividendParts, dividendPerDay, dividendToTreasury } from "./dividend";
import { ANY_CARD_REAL_MS, makeDecision, maybeCreateDecision, resolveDecision, SAME_CARD_REAL_MS } from "./decisions";
import { landmarkContract, landmarkHour } from "./landmarks";
import {
  addCost,
  apprenticeExams,
  APPRENTICE_DAYS,
  avgRating,
  EXAM_RETRY_DAYS,
  normalSalary,
  rateDelivery,
  recipeEstimate,
  ratingFactor,
} from "./engine";
import {
  crewPerShift,
  fireImpact,
  isAbsent,
  liningWearPerHeat,
  plantRestartMin,
  tempsActive,
  MAX_CREWS,
  specMargin,
  staffing,
  wildcardUse,
} from "./plant";
import { answerQuizQuestion, QUIZ, quizAvailable, quizReward } from "./quiz";
import { GRADES } from "./data";
import type {
  Agreement,
  Analysis,
  Contract,
  GameState,
  GradeId,
  ManualRequest,
  MasteryId,
  RoleId,
  SisterType,
} from "./types";
import {
  buildCost,
  cancelOrder,
  LADDER,
  ladderLevel,
  modMaxAt,
  placeOrder,
  sellPlant,
  settleWorld,
  worldLevel,
  earnedLevel,
  orderQuote,
  type OrderRequest,
  slotsAt,
  upgradeCostWorld,
  type KonsernWorld,
} from "./konsernWorld";
import { masteryGainPerDay } from "./masteryValue";
import {
  CLEANERS,
  DOWN_FINE_FACTOR,
  envBreakdown,
  envDay,
  envStartBlocked,
  FINE_PER_T,
  updateEmissions,
} from "./environment";
import {
  isWinter,
  monthOf,
  riskFactor,
  scrapBlocked,
  WINTER_DAYS,
  WINTER_FIXED,
  WINTER_POWER,
  WINTER_RISK,
  inSummerBreak,
  isChristmas,
  SUMMER,
  chooseSummer,
  summerStopDaysLeft,
  yearOf,
  YEAR_DAYS,
} from "./calendar";
import { MIN_PER_DAY } from "./data";
import { fmtDuration } from "../ui/format";
import { activeWar, WAR, warDay, warFactor } from "./war";
import { acceptAgreement, buyScrap, roundDay } from "./engine";
import { fixedPowerOffer, spotPowerPrice } from "./plant";
import { explosionChance, FATAL_DOWN_DAYS, fatalAccident, WINTER_EXPLOSION } from "./accidents";
import { freeStockT, sellAllFree } from "./engine";
import { leaderBonus, leaderBonusDue } from "./actions";
import { autoPlay, ChargeGame, INPUT_LOG_MAX, seededRandom } from "../ui/control/chargeGame";
import { hints } from "../ui/hints";
import { hasMoulds, MOULD, mouldCost, mouldHour, mouldRisk, mouldWear, replaceMoulds, wearMoulds } from "./mould";
import { applyCashCap, CASH_RESERVE, hasPaidOut, paidOutDayLog, paidOutTotal } from "./reserve";
import { trainingSeed, weeklyGrade, weeklyRequest } from "../ui/control/weekly";

declare const process: { exitCode?: number };

let failed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`OK    ${name}`);
  } catch (e) {
    failed++;
    console.log(`FEIL  ${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
function assert(ok: unknown, msg: string): void {
  if (!ok) throw new Error(msg);
}

/** Byggeprosjektene i konsernet går i ekte tid (B-209): testene spoler klokka 1 000 timer fram og fullfører dem */
function finishProjects(g: GameState): void {
  const now = realNow();
  setRealClock(() => now + 1000 * 3_600_000);
  finishKonsernProjects(g);
  setRealClock(() => Date.now());
}

/**
 * Konsernet i testene (B-326): verkene kjøpes fra konsernkassa, med samme regel som serveren (konsernWorld.ts). Kassa
 * får 50 mrd. hvis den mangler, så det er reglene og ikke pengene som prøves.
 */
function fund(g: GameState, balance = 50_000_000_000): void {
  g.konsern.treasury = { balance, perDay: 0 };
}
function buySister(g: GameState, type: SisterType) {
  if (!g.konsern.treasury) fund(g);
  return localOrder(g, { kind: "bygg", type });
}
function modernizeSister(g: GameState, id: number) {
  if (!g.konsern.treasury) fund(g);
  return localOrder(g, { kind: "modernisering", plant: id });
}
function upgradeSister(g: GameState, id: number) {
  if (!g.konsern.treasury) fund(g);
  return localOrder(g, { kind: "utbygging", plant: id });
}
const sellSister = (g: GameState, id: number) => localSell(g, id);
const plantById = (g: GameState, id: number) => g.konsern.plants.find((x) => x.id === id)!;
/** Lag verk rett i spillet: `n` stykker av typen på trinnet */
function givePlants(g: GameState, n: number, type: SisterType, level: number): void {
  g.konsern.plants = Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    type,
    name: `V${i + 1}`,
    level,
    boughtDay: 0,
    downUntilDay: 0,
  }));
  g.konsern.nextId = n + 1;
}

test("Beløp rundes ned, så et mål ikke ser nådd ut før det er det", () => {
  assert(fmtKr(999_996_000) === "999,99 mill. kr", `fikk ${fmtKr(999_996_000)}`);
  assert(fmtKr(1_000_000_000) === "1 mrd. kr", `fikk ${fmtKr(1_000_000_000)}`);
});

test("Seier: 10 mrd. i konsernverdi på storverket, lån trekkes fra", () => {
  const g = newGame(1);
  g.stage = 4;
  g.cash = WIN_CASH;
  g.loan = 1;
  checkWin(g);
  assert(!g.won, "vant med lån som tar verdien under målet");
  g.loan = 0;
  checkWin(g);
  assert(g.won, "vant ikke med nok penger og uten lån");
});

test("Konsernet: åpner seg på storverket, datterverk gir overskudd og teller mot sluttmålet", () => {
  const g = newGame(1);
  g.stage = 3;
  g.cash = KONSERN_UNLOCK_EQUITY;
  checkKonsernUnlock(g, 5);
  assert(!g.konsern.unlocked, "åpnet før storverket");
  g.stage = 4;
  g.cash = KONSERN_UNLOCK_EQUITY - 1;
  checkKonsernUnlock(g, 5);
  assert(!g.konsern.unlocked, "åpnet under 1 mrd. med utstyr igjen");
  checkKonsernUnlock(g, 0);
  assert(g.konsern.unlocked, "åpnet ikke når alt utstyret er kjøpt");
  g.cash = 2_000_000_000;
  // Uten konto finnes ikke konsernkassa (B-326): verkene kan ikke kjøpes
  assert(!localOrder(g, { kind: "bygg", type: "stalverk" }).ok && !g.konsern.plants.length, "kjøpte uten konto");
  fund(g, 1_000_000_000);
  assert(!buySister(g, "storverk").ok, "storverk kjøpt før et stålverk");
  assert(buySister(g, "stalverk").ok, "stålverket ble ikke kjøpt");
  const price = SISTER_TYPES.stalverk.price;
  // Betalt fra konsernkassa, ikke fra kassa hjemme (B-326)
  assert(g.konsern.treasury!.balance === 1_000_000_000 - price && g.cash === 2_000_000_000, "feil kasse eller pris");
  assert(konsernEquity(g) >= 2_000_000_000, `verdien falt ved kjøpet: ${konsernEquity(g)}`);
  finishProjects(g);
  const id = g.konsern.plants[0].id;
  const before = sisterProfit(g, plantById(g, id));
  assert(
    modernizeSister(g, id).ok && sisterProfit(g, plantById(g, id)) === before,
    "moderniseringen virket før den var ferdig",
  );
  finishProjects(g);
  const p = plantById(g, id);
  assert(sisterProfit(g, p) > before, "moderniseringen ga ikke mer overskudd");
  // Utbyttet går til konsernkassa på serveren (B-304), ikke inn i kassa hjemme
  p.downUntilDay = 0;
  for (let i = 0; i < 20; i++) konsernDay(g);
  assert(!(g.today.income.konsern ?? 0), "datterverket ga overskudd i kassa hjemme");
  assert(sisterDividend(g, p) > 0, "verket gir ikke utbytte til konsernkassa");
});

test("Salgsdirektøren: meget dyr, signerer bare trygge forespørsler, og lønna trekkes hvert døgn", () => {
  const g = newGame(1);
  g.cash = 1_000_000_000;
  assert(!hireDirector(g).ok, "kunne ansettes før konsernet var åpnet");
  g.konsern.unlocked = true;
  assert(hireDirector(g).ok && g.cash === 1_000_000_000 - DIRECTOR_HIRE, "feil rekrutteringskostnad");
  const stats = computePlantStats(g);
  const safe = g.contracts
    .filter((c) => c.status === "tilbud")
    .filter((c) => {
      const a = assessOffer(g, stats, c);
      return a.canMake && a.recipeOk && !a.tight && !a.narrow;
    }).length;
  directorHour(g);
  const signed = g.contracts.filter((c) => c.status === "aktiv").length;
  assert(signed <= safe && g.konsern.director!.contracts === signed, `signerte ${signed}, trygge ${safe}`);
  for (const c of g.contracts.filter((x) => x.status === "aktiv")) {
    const a = assessOffer(g, stats, { ...c, status: "tilbud" }, 0);
    assert(a.canMake && a.recipeOk, `signerte en kontrakt resepten ikke holder: ${c.grade}`);
  }
  // Skrudd av: signerer ingenting (B-122)
  g.konsern.director!.active = false;
  for (const c of g.contracts) if (c.status === "aktiv") c.status = "tilbud";
  directorHour(g);
  assert(g.contracts.filter((c) => c.status === "aktiv").length === 0, "salgsdirektøren signerte selv om den var av");
  g.konsern.director!.active = true;
  const before = g.today.costs.lonn ?? 0;
  konsernDay(g);
  assert((g.today.costs.lonn ?? 0) - before === DIRECTOR_PER_DAY, "lønna ble ikke trukket");
  assert(fireDirector(g).ok && g.konsern.director === null, "kunne ikke si opp");
});

test("Konsernet: neste steg, utbygging til storverk, milepæler og fullt konsern", () => {
  const g = newGame(1);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.cash = 5_000_000_000;
  fund(g, 5_000_000_000);
  assert(konsernAdvice(g)?.key === "kjop-stalverk", `første råd: ${konsernAdvice(g)?.key}`);
  const storverk = konsernOptions(g).find((o) => o.key === "kjop-storverk")!;
  assert(!!storverk.blocked, "storverk kunne kjøpes før et stålverk");
  buySister(g, "stalverk");
  assert(g.konsern.plants[0].name === SISTER_NAMES[0], "datterverket fikk ikke navn");
  // Køen (B-326): et storverk kan bestilles mens stålverket bygges, og starter når det er ferdig
  assert(!konsernOptions(g).find((o) => o.key === "kjop-storverk")!.blocked, "storverk sperret mens stålverket bygges");
  assert(buySister(g, "stalverk").ok && buySister(g, "stalverk").ok, "køen tok ikke tre");
  assert(!buySister(g, "stalverk").ok && g.konsern.orders.length === 3, "køen tok mer enn tre");
  assert(g.konsern.plants.filter((x) => x.project).length === 1, "mer enn ett prosjekt i gang");
  finishProjects(g);
  assert(g.konsern.plants.length === 3 && !g.konsern.orders.length, "køen ble ikke ferdig");
  // Seks stålverk: fullt, men et stålverk kan bygges ut til storverk
  for (let i = 0; i < 3; i++) {
    buySister(g, "stalverk");
    finishProjects(g);
  }
  assert(!!konsernOptions(g).find((o) => o.key === "kjop-storverk")!.blocked, "kunne kjøpe et sjuende verk");
  const id = g.konsern.plants[0].id;
  const before = sisterProfit(g, plantById(g, id));
  assert(upgradeSister(g, id).ok && plantById(g, id).type === "stalverk", "utbyggingen var ferdig med én gang");
  finishProjects(g);
  const p = plantById(g, id);
  assert(p.type === "storverk" && sisterProfit(g, p) > before * 3, "utbyggingen virket ikke");
  // Milepæler gir fagpoeng én gang
  const fp = g.researchPoints;
  checkKonsernMilestones(g);
  assert(g.konsern.milestones > 0 && g.researchPoints > fp, "ingen milepæl ved over 2 mrd.");
  const n = g.konsern.milestones;
  checkKonsernMilestones(g);
  assert(g.konsern.milestones === n, "milepælen ble gitt to ganger");
});

test("Konsernforskning: låst til konsernet åpnes, og gir effekt", () => {
  const g = newGame(1);
  g.stage = 4;
  g.researchPoints = 10_000;
  g.readChapters.push("konsern");
  const opt = () => researchOptions(g).find((r) => r.id === "konsernstyring")!;
  assert(opt().locked && !opt().available, "konsernforskning var åpen før konsernet");
  g.konsern.unlocked = true;
  g.cash = 5_000_000_000;
  buySister(g, "stalverk");
  finishProjects(g);
  const p = g.konsern.plants[0];
  const before = sisterProfit(g, p);
  const price = sisterPrice(g, "stalverk");
  assert(doResearch(g, "konsernstyring").ok, "kunne ikke forske på konsernstyring");
  assert(Math.abs(sisterProfit(g, p) / before - 1.1) < 1e-9, "konsernstyring ga ikke 10 %");
  doResearch(g, "oppkjop");
  assert(Math.abs(sisterPrice(g, "stalverk") / price - 0.85) < 1e-9, "oppkjøp ga ikke rabatt");
  doResearch(g, "storkonsern");
  assert(maxSisters(g) === 8, "større konsern ga ikke plass til 8");
  doResearch(g, "konsernledelse");
  assert(directorPerDay(g) === DIRECTOR_PER_DAY / 2, "lønna til direktøren ble ikke halvert");
  const fp = g.researchPoints;
  doResearch(g, "kunnskapsdeling");
  const after = g.researchPoints;
  konsernDay(g);
  assert(g.researchPoints >= after + 1 || p.downUntilDay > 0, `kunnskapsdeling ga ikke fagpoeng (${fp})`);
});

test("Nytt spill er alltid runde 1 uten bonus (nytt spill+ er fjernet, B-141)", () => {
  const a = newGame(1);
  assert(a.round === 1 && !a.winSeen && a.researchPoints === 0, "nytt spill skal starte likt for alle");
});

test("Alle spill blir med i sesongen som pågår, også videre til neste sesong (B-166, B-167)", () => {
  const a = newGame(1);
  assert(canJoinDirectly(a, 1), "et nytt spill skal kunne bli med");
  a.stage = 4;
  a.minute = 800 * 1440;
  a.round = 2;
  assert(canJoinDirectly(a, 1), "et spill som har kommet langt, skal også bli med");
  a.season = 1;
  assert(!canJoinDirectly(a, 1), "spillet er alt med i sesongen");
  assert(canJoinDirectly(a, 2), "spillet skal bli med videre til neste sesong");
});

test("Gamle lagringer får standardverdier for nye felt", () => {
  const g = newGame(1) as unknown as Record<string, unknown>;
  delete g.round;
  delete g.winSeen;
  delete g.inboxSeenId;
  delete (g.settings as Record<string, unknown>).toasts;
  delete g.konsern;
  const m = parseSave(JSON.stringify(g));
  assert(m, "lagringen kunne ikke leses");
  assert(m!.round === 1 && m!.winSeen === false && typeof m!.inboxSeenId === "number", "mangler standardverdi");
  assert(m!.settings.toasts === "alle", "mangler standard for varsler");
  assert(m!.konsern && !m!.konsern.unlocked && m!.konsern.plants.length === 0, "mangler standard for konsernet");
});

test("Forskning: unike id-er, krav og opplåsinger som finnes, kapitler som finnes", () => {
  const ids = new Set(RESEARCH.map((r) => r.id));
  assert(ids.size === RESEARCH.length, "dobbel forsknings-id");
  const equipment = new Set([...FURNACES, ...CASTINGS, ...ADDONS].map((x) => x.id));
  const chapters = new Set(KNOWLEDGE.map((k) => k.id));
  for (const r of RESEARCH) {
    for (const q of r.requires ?? []) assert(ids.has(q), `${r.id} krever ukjent ${q}`);
    for (const u of r.unlocks ?? []) assert(equipment.has(u), `${r.id} låser opp ukjent ${u}`);
    if (r.reads) assert(chapters.has(r.reads), `${r.id} ber om ukjent kapittel ${r.reads}`);
  }
  assert(RESEARCH.filter((r) => r.stage === 4).length >= 8, "for lite å forske på for storverket");
});

test("Forespørsler på et produkt verket ikke lager lenger, trekkes tilbake", () => {
  const g = newGame(3);
  g.stage = 2;
  g.castingType = "blokk";
  g.cash = 1e9;
  for (let i = 0; i < 20 * 24 && !g.contracts.some((c) => c.status === "tilbud" && c.product === "blokk"); i++) {
    g.pendingDecision = null;
    advance(g, 60);
  }
  assert(
    g.contracts.some((c) => c.status === "tilbud" && c.product === "blokk"),
    "fikk ingen forespørsel på blokker å teste med",
  );
  g.stage = 3;
  g.castingType = "streng1";
  g.pendingDecision = null;
  advance(g, 61);
  assert(!g.contracts.some((c) => c.status === "tilbud" && c.product === "blokk"), "blokk-forespørselen ble liggende");
});

test("Planlagt bytte av støping skjer av seg selv når det går", () => {
  const g = newGame(4);
  g.stage = 3;
  g.castingType = "blokk";
  g.cash = 1e9;
  g.researched.push("strengstoping");
  g.contracts = g.contracts.filter((c) => c.status !== "aktiv");
  scheduleCastingSwitch(g, "streng1");
  g.pendingDecision = null;
  advance(g, 61);
  assert(g.castingType === "streng1", `støpingen er fortsatt ${g.castingType}`);
  assert(g.pendingCastingSwitch === null, "byttet står fortsatt som planlagt");
});

test("Planlagt bytte venter til det er penger til drift etterpå (B-170)", () => {
  const g = newGame(4);
  g.stage = 3;
  g.castingType = "blokk";
  g.researched.push("strengstoping");
  g.contracts = g.contracts.filter((c) => c.status !== "aktiv");
  // Tre døgn med 1 mill. i drift: byttet skal la 3 mill. være igjen
  const costs = { skrap: 1_000_000 };
  g.history = [0, 1, 2].map(() => ({ ...structuredClone(g.today), costs }));
  const price = upgradeOptions(g).find((o) => o.id === "streng1")!.price;
  assert(Math.abs(switchCashNeeded(g, price) - (price + 3_000_000)) < 1, `trenger ${switchCashNeeded(g, price)}`);
  g.cash = price + 1_000_000;
  scheduleCastingSwitch(g, "streng1");
  runScheduledSwitch(g);
  assert(g.castingType === "blokk" && g.pendingCastingSwitch === "streng1", "byttet uten penger til drift");
  assert(!!g.switchWaitNoted, "ingen beskjed om at byttet venter");
  g.cash = price + 4_000_000;
  runScheduledSwitch(g);
  assert(g.castingType === "streng1" && g.pendingCastingSwitch === null, `støpingen er ${g.castingType}`);
  // B-171: kommer ikke pengene, avbestilles byttet etter noen døgn, så forespørslene kommer igjen
  const h = newGame(4);
  h.stage = 3;
  h.castingType = "blokk";
  h.researched.push("strengstoping");
  h.contracts = h.contracts.filter((c) => c.status !== "aktiv");
  h.cash = 1_000_000;
  scheduleCastingSwitch(h, "streng1");
  runScheduledSwitch(h);
  assert(h.pendingCastingSwitch === "streng1" && h.switchWaitDay !== null, "byttet venter ikke på penger");
  h.minute += SWITCH_WAIT_DAYS * 1440;
  runScheduledSwitch(h);
  assert(
    h.pendingCastingSwitch === null && h.log.some((l) => l.text.includes("avbestilt")),
    "byttet ble ikke avbestilt",
  );
});

test("Strengstøpemaskin nr. 2 dobler støpekapasiteten", () => {
  const g = newGame(1);
  g.stage = 4;
  g.castingType = "streng6";
  const before = computePlantStats(g).castTph;
  g.owned.push("streng2");
  const after = computePlantStats(g).castTph;
  assert(Math.abs(after - 2 * before) < 1e-6, `${before} → ${after}`);
});

test("Anbefalte støtteroller: to murere per lysbueovn", () => {
  const g = newGame(1);
  g.stage = 3;
  g.furnaces.forEach((f) => (f.type = "lysbue30"));
  const murer = supportAdvice(g).find((a) => a.role === "murer");
  assert(murer?.want === 2 * g.furnaces.length, `ønsket ${murer?.want}`);
});

test("Utfordringer starter på storverket og gir belønning når de nås", () => {
  const g = newGame(1);
  checkChallenges(g);
  assert(!g.missions["u-omdomme"], "startet før storverket");
  g.stage = 4;
  checkChallenges(g);
  g.reputation = 100;
  const fp = g.researchPoints;
  checkChallenges(g);
  assert(g.missions["u-omdomme"]?.done, "omdømme 100 ble ikke registrert");
  assert(g.researchPoints > fp, "ingen fagpoeng for utfordringen");
  assert(
    CHALLENGES.every((c) => c.goal > 0),
    "utfordring uten mål",
  );
});

test("Bjella teller problemer og hendelser, ikke gode nyheter", () => {
  const g = newGame(1);
  g.inboxSeenId = g.log.length ? g.log[g.log.length - 1].id : 0;
  log(g, "Noe bra", "good");
  log(g, "Noe galt", "bad");
  log(g, "Noe skjedde", "event");
  assert(unseenCount(g) === 2, `telte ${unseenCount(g)}`);
});

test("Anbefalte støtteroller: to skrapklassere og avløsere også med fem skiftlag", () => {
  const g = newGame(1);
  g.stage = 3;
  const klasser = supportAdvice(g).find((a) => a.role === "klasser");
  assert(klasser?.want === 2, `skrapklassere: ${klasser?.want}`);
  const allround = supportAdvice(g).find((a) => a.role === "allround");
  assert((allround?.want ?? 0) >= 1, "avløsere anbefales ikke");
});

test("Fullt ferdigvarelager: støpingen venter uten å samle opp framdrift", () => {
  const g = newGame(1);
  g.stage = 3;
  g.castingType = "streng1";
  g.workers = [];
  const stats = computePlantStats(g);
  // Lageret er nesten fullt, og to øser venter
  const lot = {
    product: "emne" as const,
    grade: "standard" as const,
    t: stats.storeT - 5,
    analysis: { c: 0.2, p: 0.02, tramp: 0.1 },
    known: { c: 0.2, p: 0.02, tramp: 0.1 },
    measured: { c: true, p: true, tramp: true },
    second: false,
    madeDay: 1,
  };
  g.lots = [{ ...lot, id: 1 }];
  const batch = {
    t: 30,
    grade: "standard" as const,
    analysis: lot.analysis,
    expected: lot.analysis,
    tempOff: false,
    manual: false,
    queuedMin: g.minute,
  };
  g.castQueue = [{ ...batch }, { ...batch }];
  advance(g, 240);
  assert(g.castWait === "Ferdigvarelageret er fullt", `ventet ikke: ${g.castWait}`);
  assert(g.castProgressT <= 1e-9, `framdriften samlet seg opp: ${g.castProgressT}`);
  // Spilleren får ett varsel med råd, ikke ett per tidssteg (B-118)
  const warnings = g.log.filter((e) => e.kind === "bad" && e.text.startsWith("Ferdigvarelageret er fullt"));
  assert(warnings.length === 1, `fikk ${warnings.length} varsler om fullt lager`);
  // Lageret tømmes: bare én øse støpes med en gang, den andre må vente på støpetida si
  g.lots = [];
  advance(g, 10);
  assert(g.castQueue.length === 2 && g.castProgressT > 0, "støpingen kom ikke i gang igjen");
  const before = g.lots.reduce((a, l) => a + l.t, 0);
  assert(before === 0, `støpte uten framdrift: ${before}`);
});

test("Varsler per tema: ferie kan slås av, problemer vises alltid med «bare problemer»", () => {
  const g = newGame(1);
  const ferie = { kind: "event" as const, text: "Kari Berg (støper) får ferie dag 12–15." };
  const havari = {
    kind: "bad" as const,
    text: "HAVARI: gjennombrenning i ovn 1! Flytende stål gikk gjennom foringen.",
  };
  assert(logTopic(ferie.text) === "fravaer" && logTopic(havari.text) === "havari", "feil tema");
  assert(showToast(g, ferie) && showToast(g, havari), "standard skal vise alt");
  g.settings.toastTopics = { fravaer: false };
  assert(!showToast(g, ferie) && showToast(g, havari), "ferie ble ikke skjult");
  g.settings.toasts = "problemer";
  g.settings.toastTopics = { havari: false };
  assert(!showToast(g, ferie) && showToast(g, havari), "«bare problemer» skal vise alle problemer");
  // «Ingen» er fjernet (B-144): gamle lagringer får «bare problemer»
  (g.settings as unknown as Record<string, unknown>).toasts = "ingen";
  assert(parseSave(JSON.stringify(g))!.settings.toasts === "problemer", "«ingen» ble ikke til «bare problemer»");
});

test("Kontrollrommet (B-175): hold virker bare i sine runder, stål i raka koster, rekorden lagres", () => {
  const g = newGame(3);
  const mix = { c: 0.3, p: 0.03, tramp: 0.2 };
  const req: ManualRequest = {
    furnace: 0,
    sizeT: 40,
    grade: "standard",
    mix,
    expectedMix: mix,
    energyFactor: 1,
    metallicYield: 0.92,
    radioactive: false,
    resumeSpeed: 1,
  };
  const game = new ChargeGame(req, () => 0.5);
  game.hold(true);
  assert(!game.holding, "kan holde inne før runden har startet");
  game.start();
  game.hold(true);
  assert(game.holding, "kan ikke holde inne for strøm i smeltingen");
  // Til avslaggingen: der er det trykk, ikke hold
  while (game.roundId === "smelt") if (game.tick(0.1) === "runde") game.start();
  game.finishRefining();
  game.start();
  assert(game.roundId === "slagg", `runden er ${game.roundId}`);
  game.hold(true);
  assert(!game.holding, "kan holde inne i avslaggingen");
  for (let i = 0; i < 40 && !game.targets.some((o) => o.state === "oppe" && o.kind === "stal"); i++) game.tick(0.1);
  const steel = game.targets.find((o) => o.state === "oppe" && o.kind === "stal");
  assert(steel && game.rake(steel.id) === "stal" && game.steelRaked === 1, "stålet ble ikke telt");
  // En hel flink charge gir resultat med poeng; completeManual lagrer rekorden
  const good = autoPlay(new ChargeGame(req, () => 0.3), "flink").score;
  assert(good.rating >= 4 && (good.result.points ?? 0) > 0, `flink fikk ${good.rating}★`);
  g.pendingManual = req;
  completeManual(g, good.result);
  assert(g.controlBest === good.points, "rekorden ble ikke lagret");
  assert(g.furnaces[0].heat?.manual, "chargen ble ikke lagt inn som manuell");
});

test("Skiftlederen (B-178) gir advarsel til den som misbruker egenmelding, ikke til den som var syk", () => {
  const g = newGame(5);
  g.stage = 3;
  g.minute = 100 * 1440 + 600;
  const make = (role: RoleId, often: boolean) => {
    let w = makeCandidate(g, role);
    while (oftenSick(w) !== often) w = makeCandidate(g, role);
    w.hiredDay = 1;
    g.workers.push(w);
    return w;
  };
  const leader = make("skiftleder", false);
  const shirker = make("ovn", true);
  const ill = make("ovn", false);
  shirker.sickDays = [90, 94, 98];
  ill.sickDays = [90, 94, 98];
  advance(g, 1440);
  assert(shirker.warnedDay !== undefined, "den som misbruker, fikk ingen advarsel");
  assert(ill.warnedDay === undefined, "den som var syk, fikk advarsel");
  assert(leader.warnedDay === undefined, "skiftlederen advarte seg selv");
  // Uten skiftleder skjer ingenting av seg selv
  g.workers = g.workers.filter((w) => w !== leader);
  shirker.warnedDay = undefined;
  advance(g, 1440);
  assert(shirker.warnedDay === undefined, "advarsel uten skiftleder");
});

test("En strømkrise gjør spot dyrere, men ikke en fastpris man alt har (B-141)", () => {
  const g = newGame(2);
  setPowerDeal(g, "fast");
  const fixed = energyPrice(g);
  const spot0 = dealPrice(g, "spot");
  applyWorldEvents(g, [
    { id: 9, kind: "stromkrise", title: "Strømkrise", text: "Dyr strøm.", scrap: 1, steel: 1, power: 1.5, until: "x" },
  ]);
  assert(Math.abs(energyPrice(g) - fixed) < 1e-9, "fastprisen ble ganget med hendelsen");
  assert(Math.abs(dealPrice(g, "spot") / spot0 - 1.5) < 1e-9, "spotprisen ble ikke ganget");
});

test("Felles hendelser ganger skrap-, stål- og strømpris, og logges én gang (B-129)", () => {
  const g = newGame(1);
  const scrap0 = scrapPrice(g, "blandet");
  const steel0 = productPrice(g, "stopegods", null);
  const power0 = energyPrice(g);
  const ev = {
    id: 7,
    kind: "skrapmangel",
    title: "Skrapmangel",
    text: "Dyrt skrap.",
    scrap: 1.2,
    steel: 1.1,
    power: 1.5,
    until: "2030-01-01T00:00:00Z",
  };
  applyWorldEvents(g, [ev]);
  assert(Math.abs(scrapPrice(g, "blandet") / scrap0 - 1.2) < 1e-9, "skrapprisen ble ikke ganget");
  assert(Math.abs(productPrice(g, "stopegods", null) / steel0 - 1.1) < 1e-9, "stålprisen ble ikke ganget");
  assert(
    Math.abs(energyPrice(g) / power0 - 1.5) < 1e-9,
    "strømprisen ble ikke ganget (gass skal ikke, men garasjen har induksjonsovn)",
  );
  assert(worldFactor(g, "scrap") === 1.2, "worldFactor");
  const logged = g.log.filter((e) => e.text.startsWith("Skrapmangel")).length;
  applyWorldEvents(g, [ev]);
  applyWorldEvents(g, []);
  applyWorldEvents(g, [ev]);
  assert(
    g.log.filter((e) => e.text.startsWith("Skrapmangel")).length === logged && logged === 1,
    "hendelsen skulle logges én gang",
  );
  applyWorldEvents(g, []);
  assert(scrapPrice(g, "blandet") === scrap0, "prisen skulle tilbake når hendelsen er over");
});

test("Sesongfordelen er pitteliten: 5 % kasse og 10 fagpoeng (B-129)", () => {
  const g = newGame(2);
  const cash = g.cash;
  joinSeason(g, 3, true);
  assert(g.season === 3 && g.seasonPromptSeen === 3, "sesongen ble ikke satt");
  assert(g.cash === Math.round(cash * 1.05) && g.researchPoints === SEASON_BONUS_FP, "fordelen stemmer ikke");
  const h = newGame(2);
  joinSeason(h, 3, false);
  assert(h.cash === cash && h.researchPoints === 0, "uten fordel skulle ingenting endres");
});

test("Utstyr som mangler forskning, sier «forsk fram», ikke at pengene er for få (B-144)", () => {
  const g = newGame(1);
  g.stage = 2;
  g.cash = 50_000;
  // Høye driftskostnader, så advarselen om tynn kasse ville slått til for alt
  const day = { day: 1, income: {}, costs: { skrap: 40_000 }, producedT: 0, heats: 0, cashEnd: 0 };
  g.history = [day, { ...day, day: 2 }, { ...day, day: 3 }];
  const blocked = upgradeOptions(g).filter((o) => o.reason?.startsWith("Forsk fram"));
  assert(blocked.length > 0, "fant ikke utstyr som mangler forskning");
  assert(
    blocked.every((o) => !o.warning),
    `advarsel på utstyr som mangler forskning: ${blocked.find((o) => o.warning)?.name}`,
  );
});

test("Daglig belønning (B-149): vokser gjennom uka og følger nivået", () => {
  const g = newGame(50);
  const unit = dayOfDrift(g);
  assert(unit === DRIFT_FLOOR[0], `garasjen skulle få gulvet, fikk ${unit}`);
  assert(STREAK_REWARDS.length === 7 && STREAK_REWARDS[6].days >= STREAK_REWARDS[5].days, "dag 7 skal være størst");
  const cash = g.cash;
  const fp = g.researchPoints;
  const r = applyStreakReward(g, 7, fmtKr);
  assert(r.cash === 3 * unit && g.cash === cash + r.cash && g.researchPoints === fp + 5, "dag 7 ga feil belønning");
  // Utenfor 1–7 brukes nærmeste dag
  assert(streakReward(g, 12).fp === 5 && streakReward(g, 0).fp === 1, "dag utenfor serien");
  // Storverket får mer (gulvet eller overskuddet)
  const big = newGame(50);
  big.stage = 4;
  assert(dayOfDrift(big) >= DRIFT_FLOOR[4], "storverket skulle få minst gulvet");
});

test("Mens du var borte (B-149): minst en halvtime, høyst åtte timer", () => {
  const g = newGame(51);
  const unit = dayOfDrift(g);
  assert(awayReward(g, 20 * 60).cash === 0, "20 minutter skulle ikke gi noe");
  assert(awayReward(g, 2 * 3600).cash === Math.round(2 * AWAY_DAYS_PER_HOUR * unit), "to timer ga feil");
  assert(
    awayReward(g, 30 * 3600).cash === Math.round(AWAY_MAX_HOURS * AWAY_DAYS_PER_HOUR * unit),
    "skulle stoppe på åtte timer",
  );
});

test("Dagens oppdrag (B-149): samme for alle samme dag, fremdrift fra dagens start, bonus én gang", () => {
  const a = newGame(52);
  const b = newGame(53);
  assert(pickMissions(a, "2026-09-26").join() === pickMissions(b, "2026-09-26").join(), "ulike oppdrag samme dag");
  const days = new Set(["2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29"].map((d) => pickMissions(a, d).join()));
  assert(days.size > 1, "samme oppdrag hver dag");
  // Garasjen kan ikke få «kjør en charge selv» (ingen lysbueovn)
  for (let d = 1; d <= 28; d++) assert(!pickMissions(a, `2026-10-${d}`).includes("selv"), "selv i garasjen");
  const g = newGame(54);
  g.totals.contractsDone = 5;
  startMissionDay(g, "2026-09-26", false);
  assert(g.daily.missions.length === 3, `fikk ${g.daily.missions.length} oppdrag`);
  // Gjør alt: fremdriften måles fra dagens start
  g.totals.contractsDone += 2;
  g.totals.producedT += 1000;
  g.reputation += 5;
  g.researched.push("x");
  g.readChapters.push("y");
  g.quizDone.push("z");
  assert(missionBonusReady(g), "alle oppdrag skulle være gjort");
  const cash = g.cash;
  applyMissionBonus(g, fmtKr);
  assert(
    g.cash === cash + Math.round(MISSION_BONUS.days * dayOfDrift(g)) && !missionBonusReady(g),
    "bonusen ble gitt feil",
  );
  // Samme dag igjen: ingenting nullstilles; ny dag: nye oppdrag
  startMissionDay(g, "2026-09-26", false);
  assert(g.daily.claimed, "samme dag skulle ikke nullstille");
  startMissionDay(g, "2026-09-27", false);
  assert(!g.daily.claimed && g.daily.date === "2026-09-27", "ny dag skulle gi nye oppdrag");
  // Hentet på en annen enhet: serveren sier fra
  startMissionDay(g, "2026-09-27", true);
  assert(g.daily.claimed, "bonus hentet et annet sted ble ikke merket");
});

test("Gamle lagringer får dagens oppdrag (B-149)", () => {
  const g = newGame(55) as unknown as Record<string, unknown>;
  delete g.daily;
  const m = parseSave(JSON.stringify(g));
  assert(m!.daily && m!.daily.date === null && m!.daily.missions.length === 0, "mangler standard for daily");
});

test("Mesterskap (B-150): åpner etter all forskning, stigende pris, avtagende gevinst, virker på prisene", () => {
  const g = newGame(60);
  g.stage = 4;
  g.researchPoints = 100_000;
  assert(!masteryOpen(g) && !buyMastery(g, "pris").ok, "mesterskapet skulle være stengt");
  g.researched = RESEARCH.map((r) => r.id);
  assert(masteryOpen(g), "mesterskapet åpnet ikke etter all forskning");
  const price = productPrice(g, "armering", null);
  const scrap = scrapPrice(g, "blandet");
  const power = energyPrice(g);
  const fp = g.researchPoints;
  assert(buyMastery(g, "pris").ok && buyMastery(g, "skrap").ok && buyMastery(g, "strom").ok, "kjøpet feilet");
  assert(
    g.researchPoints === fp - masteryCost("pris", 0) - masteryCost("skrap", 0) - masteryCost("strom", 0),
    "trakk feil antall fagpoeng",
  );
  assert(productPrice(g, "armering", null) > price * 1.009, "stålprisen gikk ikke opp");
  assert(scrapPrice(g, "blandet") < scrap && energyPrice(g) < power, "skrap eller strøm ble ikke billigere");
  // Hvert nivå koster mer og gir mindre, men aldri over maks
  assert(masteryCost("pris", 5) > masteryCost("pris", 4), "prisen stiger ikke");
  const gain = (l: number) => masteryEffect("pris", l + 1) - masteryEffect("pris", l);
  assert(gain(10) < gain(1) && masteryEffect("pris", 500) <= MASTERY.pris.max, "gevinsten avtar ikke");
  g.researchPoints = 0;
  assert(!buyMastery(g, "datterverk").ok, "kunne kjøpe uten fagpoeng");
});

test("Konsernnivåer (B-150, B-325): titler etter verkene, ikke kassa, med fagpoeng og opplåsing", () => {
  const g = newGame(61);
  g.stage = 4;
  g.konsern.unlocked = true;
  // Kassa gir ingen tittel lenger
  g.cash = 5_000_000_000_000;
  finishProjects(g);
  assert(g.konsern.legends === 0, "tittel av kassa");
  g.won = true;
  assert(titleOf(g) === WIN_TITLE, "mangler tittelen for sluttmålet");
  const fp = g.researchPoints;
  const sisters = maxSisters(g);
  // 3 storverk på trinn 3: Stålmagnat
  givePlants(g, 3, "storverk", 3);
  assert(nextLevelProgress(g)?.have === 3 && ladderLevel(g.konsern.plants) === 1, "nivået av verkene");
  raiseLevel(g, ladderLevel(g.konsern.plants));
  assert(g.konsern.legends === 1 && titleOf(g) === LEGENDS[0].title, `fikk ${titleOf(g)}`);
  assert(g.researchPoints === fp + LEGENDS[0].fp && g.legendCelebrate === 0, "fagpoeng eller feiring mangler");
  assert(modernizeMax(g) === 4 && maxSisters(g) === sisters && !kompleksOpen(g), "Stålmagnat ga feil opplåsing");
  raiseLevel(g, 1);
  assert(g.konsern.legends === 1 && g.researchPoints === fp + LEGENDS[0].fp, "samme nivå to ganger");
  // Nivået går aldri ned, heller ikke når verkene selges
  g.konsern.plants = [];
  raiseLevel(g, 0);
  assert(g.konsern.legends === 1, "nivået gikk ned");
  // To kompleks på trinn 3 hjelper ikke før Stålfyrste (i rekkefølge)
  givePlants(g, 2, "kompleks", 3);
  assert(ladderLevel(g.konsern.plants) === 0, "trinnene tas ikke i rekkefølge");
  // Stålfyrste og Stålkonge: kompleks, trinn 5 og to plasser til
  const mk = (id: number, type: SisterType, level: number) => ({
    id,
    type,
    name: "",
    level,
    boughtDay: 0,
    downUntilDay: 0,
  });
  g.konsern.plants = [1, 2, 3, 4].map((i) => mk(i, "storverk", 4)).concat([5, 6].map((i) => mk(i, "kompleks", 4)));
  g.konsern.nextId = 7;
  raiseLevel(g, ladderLevel(g.konsern.plants));
  assert(g.konsern.legends === 3 && titleOf(g) === "Stålkonge", `fikk ${titleOf(g)}`);
  assert(modernizeMax(g) === 5 && maxSisters(g) === sisters + 2 && kompleksOpen(g), "opplåsingen stemmer ikke");
  assert(buySister(g, "kompleks").ok, "kjøp av kompleks");
  finishProjects(g);
  assert(g.konsern.plants.filter((p) => p.type === "kompleks").length === 3, "komplekset ble ikke bygget");
  // Verk som bygges, teller ikke
  const building = [
    ...g.konsern.plants,
    { ...mk(99, "kompleks", 6), project: { kind: "bygg" as const, startedAt: 0, readyAt: 1 } },
  ];
  assert(ladderLevel(building) === ladderLevel(g.konsern.plants), "verk som bygges, teller");
});

test("Skrapinnkjøperen selger skrap ingen resept trenger når lageret er fullt (B-171)", () => {
  const g = newGame(81);
  g.stage = 3;
  const stats = computePlantStats(g);
  g.contracts = g.contracts.filter((c) => c.status !== "aktiv");
  // Lageret fullt av tungt skrap; resepten vil bare ha blandet skrap
  for (const id of Object.keys(g.scrap) as (keyof typeof g.scrap)[]) g.scrap[id].t = 0;
  g.scrap.tungt = { ...g.scrap.tungt, t: stats.yardT, p: 0.02, tramp: 0.16, c: 0.2, dirt: 0.03, radioactive: false };
  g.recipe = { rent: 0, spon: 0, retur: 0, tungt: 0, rajern: 0, blandet: 100, shredder: 0 };
  g.gradeRecipes[g.targetGrade] = { ...g.recipe };
  for (const f of g.furnaces) f.grade = null;
  g.cash = 1e9;
  autoBuy(g, computePlantStats(g), { credit: false, cap: null });
  assert(g.scrap.tungt.t < stats.yardT, "solgte ikke noe tungt skrap");
  assert(g.scrap.blandet.t > 0, `kjøpte ikke blandet skrap (${g.autoBuyNote})`);
  assert(
    g.log.some((l) => l.text.includes("Planleggeren solgte")),
    "ingen beskjed om salget",
  );
  // Uten lov til å selge står det fast, med en forklaring
  const h = newGame(81);
  h.stage = 3;
  for (const id of Object.keys(h.scrap) as (keyof typeof h.scrap)[]) h.scrap[id].t = 0;
  h.scrap.tungt.t = stats.yardT;
  h.recipe = { ...g.recipe };
  h.gradeRecipes[h.targetGrade] = { ...g.recipe };
  h.settings.plannerSells = false;
  h.cash = 1e9;
  autoBuy(h, computePlantStats(h), { credit: false, cap: null });
  assert(h.scrap.tungt.t === stats.yardT && !!h.autoBuyNote?.includes("selge"), `note: ${h.autoBuyNote}`);
  // Selg for hånd: 60 % av prisen
  const cash = h.cash;
  assert(sellScrap(h, "tungt", 100).ok, "salg feilet");
  assert(Math.abs(h.cash - cash - 100 * scrapSellPrice(h, "tungt")) < 1, "feil pris ved salg");
});

test("Skrapklasseren bruker renere skrap når returskrapet er tomt (B-171)", () => {
  const g = newGame(82);
  g.stage = 2;
  g.workers.push({ ...makeCandidate(g, "klasser"), hiredDay: 1 });
  for (const id of Object.keys(g.scrap) as (keyof typeof g.scrap)[]) g.scrap[id].t = 0;
  g.scrap.tungt.t = 8;
  g.scrap.rent = { ...g.scrap.rent, t: 50, p: 0.012, tramp: 0.05, c: 0.06, dirt: 0.01, radioactive: false };
  const recipe = { rent: 0, spon: 0, retur: 20, tungt: 80, rajern: 0, blandet: 0, shredder: 0 };
  // Tungt skrap til 80 %, men returskrapet mangler: rent skrap (renere) fyller inn
  const mix = takeScrap(g, 10, false, recipe);
  assert(mix !== null, "ovnen ble stående og vente på returskrap");
  assert(g.scrap.rent.t < 50, "brukte ikke rent skrap");
  assert(
    g.log.some((l) => l.text.includes("Skrapklasseren brukte")),
    "ingen beskjed om byttet",
  );
});

test("Hendelser (B-171): messe ikke med omdømme på topp, naboene klager ikke igjen etter skjermen, nye kort", () => {
  const g = newGame(83);
  g.stage = 3;
  g.reputation = 95;
  assert(makeDecision(g, "messe") === null, "messe med omdømme 95");
  g.reputation = 60;
  assert(makeDecision(g, "messe") !== null, "ingen messe med omdømme 60");
  const d = makeDecision(g, "naboklage")!;
  g.pendingDecision = { ...d, resumeSpeed: 1 };
  resolveDecision(g, 0);
  assert(makeDecision(g, "naboklage") === null, "naboene klaget igjen på samme nivå");
  g.stage = 4;
  assert(makeDecision(g, "naboklage") !== null, "naboene klager aldri igjen, heller ikke på et større verk");
  for (let i = 0; i < 6; i++) g.workers.push({ ...makeCandidate(g, "ovn"), hiredDay: 1 });
  // Den store utlandsordren kommer bare når verket produserer noe
  assert(makeDecision(g, "utlandsordre") === null, "utlandsordre uten produksjon");
  for (const id of ["firmafest", "sponsor", "soknad", "kobbertyveri", "studenter", "video"]) {
    const card = makeDecision(g, id);
    assert(!!card && card.options.length >= 2, `kortet ${id} mangler`);
    g.pendingDecision = { ...card!, resumeSpeed: 1 };
    resolveDecision(g, 0);
  }
});

test("Sesongstigen og nye titler (B-173): pynt på trinn 10–50, titler etter Stållegende", () => {
  const g = newGame(85);
  assert(
    trackCosmetic(10, 1)?.id === "sesongflagg" && trackCosmetic(50, 1)?.id === "pokal" && !trackCosmetic(11, 1),
    "pynt på feil trinn",
  );
  assert(cosmeticBlocked(g, "pokal") === "season", "stigepynt kunne kjøpes");
  grantCosmetic(g, "pokal");
  assert(g.cosmetics.owned.includes("pokal") && g.cosmetics.on.includes("pokal"), "pynten ble ikke gitt");
  g.stage = 4;
  g.konsern.unlocked = true;
  g.won = true;
  const before = maxSisters(g);
  // 8 kompleks på trinn 5 (B-325): Stålgigant, seks plasser til
  givePlants(g, 8, "kompleks", 5);
  raiseLevel(g, ladderLevel(g.konsern.plants));
  assert(titleOf(g) === "Stålgigant" && maxSisters(g) === before + 6, `tittel ${titleOf(g)}, plass ${maxSisters(g)}`);
});

test("Nivåstigen (B-325): ni titler i rekkefølge, og plasser og trinn følger nivået", () => {
  assert(LEGENDS.length === 9 && LADDER.length === 9, "ni titler");
  assert(
    LEGENDS.every((l) => l.like.length > 0 && l.need.length > 0),
    "mangler tekst",
  );
  assert(LEGENDS[0].title === "Stålmagnat" && LEGENDS[8].title === "Stålikon", "første eller siste tittel");
  // Fullt konsern: 14 kompleks på trinn 6 gir alle nivåene
  const full = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    type: "kompleks" as const,
    name: "",
    level: 6,
    boughtDay: 0,
    downUntilDay: 0,
  }));
  assert(ladderLevel(full) === 9, "fullt konsern ga ikke Stålikon");
  assert(ladderLevel(full.slice(0, 13)) === 8, "13 kompleks ga Stålikon");
  assert(slotsAt(0, true) === 8 && slotsAt(6, true) === 14 && slotsAt(9, false) === 12, "plassene");
  assert(modMaxAt(0) === 3 && modMaxAt(1) === 4 && modMaxAt(3) === 5 && modMaxAt(7) === 6, "trinnene");
});

test("Flere plasser for datterverk (B-367): forskningen, neste tittel, eller toppen", () => {
  const g = newGame(7);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.konsern.legends = 4;
  g.konsern.earned = 4;
  assert(/Større konsern.+2 til/.test(moreSlotsText(g)), moreSlotsText(g));
  g.researched.push("storkonsern");
  assert(maxSisters(g) === 12, `plass ${maxSisters(g)}`);
  assert(/Stålgigant \(8 stålkomplekser på trinn 5\).+2 til/.test(moreSlotsText(g)), moreSlotsText(g));
  g.konsern.legends = 6;
  g.konsern.earned = 6;
  assert(maxSisters(g) === 14 && /14 datterverk er det meste/.test(moreSlotsText(g)), moreSlotsText(g));
});

test("Landemerker (B-174): ett nytt per dag, belønning når det er levert", () => {
  // Garasjen: eieren står i produksjonen, så verket lager stål
  const g = newGame(86);
  g.tutorial = null;
  g.minute = 3 * 1440;
  landmarkHour(g, "2026-10-01");
  const c = landmarkContract(g);
  assert(!!c && c.landmark === "benker" && c.status === "tilbud", `fikk ${c?.landmark}`);
  // Salgsdirektøren lar landemerket stå: det tar spilleren selv (B-177)
  g.cash = 1_000_000_000;
  g.konsern.unlocked = true;
  hireDirector(g);
  directorHour(g);
  assert(c!.status === "tilbud", "salgsdirektøren tok landemerket");
  landmarkHour(g, "2026-10-01");
  assert(g.contracts.filter((x) => x.landmark).length === 1, "to landemerker samme dag");
  // Levert: fagpoeng, omdømme og i samlingen; neste kommer først neste dag
  const fp = g.researchPoints;
  c!.status = "fullfort";
  landmarkHour(g, "2026-10-01");
  assert(g.landmarks!.done.includes("benker") && g.researchPoints > fp, "ingen belønning");
  landmarkHour(g, "2026-10-01");
  assert(!landmarkContract(g), "nytt landemerke samme dag");
  // Kumlokket krever verkstedet: i garasjen kommer det ikke noe nytt
  landmarkHour(g, "2026-10-02");
  assert(!landmarkContract(g), "landemerke fra et høyere nivå");
  g.stage = 1;
  g.landmarks!.date = null;
  landmarkHour(g, "2026-10-03");
  assert(landmarkContract(g)?.landmark === "kumlokk", `neste: ${landmarkContract(g)?.landmark}`);
  // Ikke levert: kommer igjen en annen dag
  landmarkContract(g)!.status = "misligholdt";
  landmarkHour(g, "2026-10-03");
  landmarkHour(g, "2026-10-04");
  assert(landmarkContract(g)?.landmark === "kumlokk", "det samme landemerket kom ikke igjen");
});

test("Salgsdirektøren kan oppgraderes i tre trinn (B-172)", () => {
  const g = newGame(84);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.cash = 20_000_000_000;
  assert(!upgradeDirector(g).ok, "oppgraderte uten salgsdirektør");
  assert(hireDirector(g).ok, "kunne ikke ansette");
  for (let i = 0; i < 3; i++) assert(upgradeDirector(g).ok, `trinn ${i + 1} feilet`);
  assert(directorLevel(g) === 3 && nextDirectorUpgrade(g) === null, "feil nivå");
  assert(!upgradeDirector(g).ok, "kunne oppgradere forbi siste trinn");
});

test("Stålkompleks i stedet for et lite verk når konsernet er fullt (B-170)", () => {
  const g = newGame(63);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.won = true;
  g.konsern.legends = 2;
  g.konsern.earned = 2;
  fund(g);
  while (g.konsern.plants.length < maxSisters(g)) {
    assert(buySister(g, "stalverk").ok, "kjøp av stålverk");
    finishProjects(g);
  }
  assert(!!konsernOptions(g).find((o) => o.key === "kjop-kompleks")!.blocked, "kompleks ikke sperret når fullt");
  const advice = konsernOptions(g).find((o) => o.key.startsWith("bytt-"));
  assert(!!advice && !advice.blocked && advice.request?.kind === "bytt", "ikke noe valg om å bytte til kompleks");
  assert(!!konsernAdvice(g), "ingen råd når konsernet er fullt");
  // Prisen er komplekset minus salget av verket
  const small = g.konsern.plants.find((p) => `bytt-${p.id}` === advice!.key)!;
  assert(advice!.price === sisterPrice(g, "kompleks") - sisterSalePrice(g, small), `pris ${advice!.price}`);
  const n = g.konsern.plants.length;
  fund(g, 1_000_000);
  assert(!localOrder(g, advice!.request!).ok && g.konsern.plants.length === n, "solgte uten råd til komplekset");
  fund(g);
  assert(localOrder(g, advice!.request!).ok, "byttet feilet");
  assert(g.konsern.plants.length === n && g.konsern.plants.some((p) => p.type === "kompleks"), "byttet ga feil verk");
});

test("Gamle lagringer får mesterskap og stålmilepæler (B-150)", () => {
  const g = newGame(62) as unknown as Record<string, unknown>;
  delete g.mastery;
  delete g.legendCelebrate;
  delete (g.konsern as Record<string, unknown>).legends;
  const m = parseSave(JSON.stringify(g))!;
  assert(m.mastery && m.legendCelebrate === null && m.konsern.legends === 0, "mangler standardverdier");
});

test("Prestasjoner (B-151): gir fagpoeng én gang, og mange på en gang gir én logglinje", () => {
  const g = newGame(62);
  checkAchievements(g);
  assert(achievementsDone(g) === 0, "prestasjoner i et nytt spill");
  g.totals.heats = 1;
  const fp = g.researchPoints;
  checkAchievements(g);
  assert(hasAchievement(g, "charge1") && g.researchPoints === fp + 2, "første charge ga ikke prestasjon og 2 fagpoeng");
  checkAchievements(g);
  assert(g.researchPoints === fp + 2, "fagpoeng gitt to ganger");
  // En gammel lagring langt ute i spillet får alle på en gang, med én linje i loggen
  const old = newGame(63) as unknown as Record<string, unknown>;
  delete old.achievements;
  delete old.cosmetics;
  const m = parseSave(JSON.stringify(old))!;
  assert(!!m.achievements && Array.isArray(m.cosmetics.owned), "migrate ga ikke standardverdier");
  m.stage = 4;
  m.totals.heats = 2000;
  m.totals.contractsDone = 60;
  const lines = m.log.length;
  checkAchievements(m);
  assert(achievementsDone(m) >= 6 && m.log.length === lines + 1, "mange prestasjoner ga ikke én logglinje");
});

test("Pynt (B-151): kjøpes for fagpoeng, én fasade om gangen, noen krever prestasjon", () => {
  const g = newGame(64);
  g.researchPoints = 5;
  assert(!buyCosmetic(g, "flagg"), "kjøpte uten nok fagpoeng");
  g.researchPoints = 1000;
  assert(
    buyCosmetic(g, "flagg") && g.researchPoints === 990 && cosmeticOn(g, "flagg"),
    "flagget ble ikke kjøpt og slått på",
  );
  assert(!buyCosmetic(g, "flagg"), "kjøpte samme pynt to ganger");
  setCosmetic(g, "flagg", false);
  assert(!cosmeticOn(g, "flagg"), "flagget ble ikke slått av");
  buyCosmetic(g, "rod");
  buyCosmetic(g, "bla");
  assert(
    !cosmeticOn(g, "rod") && cosmeticOn(g, "bla") && facadeColors(g)?.[0] === FACADE.bla[0],
    "to fasader på samtidig",
  );
  assert(cosmeticBlocked(g, "statue") === "needs" && !buyCosmetic(g, "statue"), "statuen krever Stålbaron");
  g.achievements.baron = 100;
  assert(buyCosmetic(g, "statue"), "statuen kunne ikke kjøpes etter Stålbaron");
  buyCosmetic(g, "vind");
  assert(!cosmeticOn(g, "vind"), "vindmølla synes før stålverket");
});

test("Sesongens vri (B-152): gjelder bare spill i sesongen, ganges med prisene og logges én gang", () => {
  const g = newGame(65);
  const twist = { id: "skrapmangel", title: "Skrapmangel", text: "Dyrt skrap.", scrap: 1.15, steel: 1, power: 1 };
  const before = scrapPrice(g, "blandet");
  applySeasonTwist(g, 3, twist);
  assert(!g.world.twist && scrapPrice(g, "blandet") === before, "vrien virket på et spill utenfor sesongen");
  g.season = 3;
  const lines = g.log.length;
  applySeasonTwist(g, 3, twist);
  applySeasonTwist(g, 3, twist);
  assert(
    g.world.twist?.id === "skrapmangel" && g.log.length === lines + 1,
    "vrien ble ikke lagt inn og logget én gang",
  );
  assert(Math.abs(scrapPrice(g, "blandet") / before - 1.15) < 0.001, "skrapprisen fikk ikke vrien");
  applySeasonTwist(g, 4, twist);
  assert(!g.world.twist, "vrien ble værende etter at sesongen var over");
});

test("Dagens oppdrag i sluttspillet (B-153): større mål, nye oppdrag og flere fagpoeng", () => {
  const early = newGame(66);
  const late = newGame(67);
  late.stage = 4;
  late.konsern.unlocked = true;
  late.researched = RESEARCH.map((r) => r.id);
  late.reputation = 100;
  late.cash = 20_000_000_000;
  // Datterverk kjøpes fra konsernkassa (B-326): oppdraget kommer bare med konto
  late.konsern.treasury = { balance: 1_000_000_000, perDay: 10_000_000 };
  const seen = new Set<string>();
  for (let d = 1; d <= 28; d++) for (const id of pickMissions(late, `2026-10-${d}`)) seen.add(id);
  assert(seen.has("mester") && seen.has("verdi") && seen.has("datter"), `oppdrag i konsernet: ${[...seen]}`);
  assert(!seen.has("forsk") && !seen.has("omdomme"), "oppdrag som ikke kan gjøres");
  for (let d = 1; d <= 28; d++) assert(!pickMissions(early, `2026-10-${d}`).includes("verdi"), "verdi i garasjen");
  startMissionDay(late, "2026-11-02", false);
  const k = late.daily.missions.find((m) => m.id === "kontrakter");
  if (k) assert(k.target === 8, `kontrakter i konsernet: ${k.target}`);
  assert(missionBonus(late).fp > missionBonus(early).fp, "ikke flere fagpoeng i konsernet");
});

test("Stormodeller (B-154): låst til konsernet, sluttmålet og Stålmagnat; lengre charger, flere tonn og større marked", () => {
  const g = newGame(68);
  g.stage = 4;
  g.cash = 5_000_000_000;
  g.researched = RESEARCH.map((r) => r.id);
  g.owned.push("renseanlegg", "valseverk", "valseverk2");
  const opt = (id: string) => upgradeOptions(g).find((o) => o.baseId === id);
  assert(opt("lysbue150")?.locked && /konsernet/.test(opt("lysbue150")?.reason ?? ""), "150 t var ikke låst");
  g.konsern.unlocked = true;
  assert(opt("lysbue150")?.available && opt("streng8")?.available, "150 t eller 8 strenger åpnet ikke med konsernet");
  assert(opt("lysbue250")?.locked && opt("valseverk3")?.locked, "250 t eller valseverk 3 åpnet før sluttmålet");
  g.won = true;
  assert(opt("lysbue250")?.available && opt("valseverk3")?.available, "250 t åpnet ikke ved sluttmålet");
  assert(opt("likestrom420")?.locked, "420 t åpnet før Stålmagnat");
  g.konsern.legends = 1;
  assert(opt("likestrom420")?.available, "420 t åpnet ikke ved Stålmagnat");
  // Jo større ovn, jo lengre charge – men flere tonn i timen
  const big = ["lysbue30", "lysbue90", "lysbue150", "lysbue250", "likestrom420"].map(
    (id) => FURNACES.find((f) => f.id === id)!,
  );
  for (let i = 1; i < big.length; i++) {
    assert(big[i].cycleMin > big[i - 1].cycleMin, `${big[i].id} er ikke tregere enn ${big[i - 1].id}`);
    assert(big[i].sizeT / big[i].cycleMin > big[i - 1].sizeT / big[i - 1].cycleMin, `${big[i].id} gir ikke flere tonn`);
  }
  assert(Math.abs((420 / 70) * 60 - 360) < 1, "420-tonneren skal gi ca. 360 t i timen");
  const quota = spotQuota(g, "emne");
  g.furnaces.forEach((f) => (f.type = "likestrom420"));
  assert(spotQuota(g, "emne") > quota * 1.15, "markedet vokser ikke med stormodellene");
});

test("Støpingen holder følge med stormodellene (B-157): 2 × 8 strenger til 250 t, 3 maskiner til 420 t", () => {
  const g = newGame(69);
  g.stage = 4;
  g.researched = RESEARCH.map((r) => r.id);
  g.konsern.unlocked = true;
  g.won = true;
  g.konsern.legends = 1;
  g.owned.push("renseanlegg", "ovn2", "ovn3", "streng2", "valseverk", "valseverk2", "valseverk3");
  while (g.furnaces.length < 3) g.furnaces.push(JSON.parse(JSON.stringify(g.furnaces[0])));
  g.furnaceCount = 3;
  g.castingType = "streng8";
  for (const f of g.furnaces) f.addons = ["trafo", "conveyor"];
  // Flinke folk, så ovnene går så fort de kan
  g.ownerSkill = 5;
  for (const f of g.furnaces) f.type = "lysbue250";
  let s = computePlantStats(g);
  assert(s.castTph >= s.meltTph * 0.98, `250 t: smelter ${s.meltTph.toFixed(0)}, støper ${s.castTph.toFixed(0)}`);
  for (const f of g.furnaces) f.type = "likestrom420";
  s = computePlantStats(g);
  assert(s.castTph < s.meltTph, "420 t skal trenge maskin nr. 3");
  g.owned.push("streng3");
  s = computePlantStats(g);
  assert(
    s.castTph >= s.meltTph * 0.98,
    `420 t med 3 maskiner: smelter ${s.meltTph.toFixed(0)}, støper ${s.castTph.toFixed(0)}`,
  );
});

test("Trivsel (B-159): lenge siden bonus senker normalnivået fra stålverket, bonus løfter det igjen", () => {
  const g = newGame(70);
  g.stage = 2;
  g.workers.push(makeCandidate(g, "ovn"));
  g.minute = 200 * 1440;
  g.lastBonusDay = 0;
  assert(bonusGap(g) === 0, "gap før stålverket");
  g.stage = 3;
  assert(bonusGap(g) === 15, `gap etter 200 døgn: ${bonusGap(g)}`);
  g.lastBonusDay = 201 - 20;
  assert(bonusGap(g) === 3, `gap etter 20 døgn: ${bonusGap(g)}`);
  g.lastBonusDay = -99;
  g.cash = 1e9;
  assert(giveBonus(g).ok && bonusGap(g) === 0, "bonus fjernet ikke gapet");
  // Hverdagsglede løfter høyst 15 over normalnivået; bonus kan gå helt til 100
  g.lastBonusDay = -99;
  g.morale = 50;
  for (let i = 0; i < 200; i++) liftMorale(g, 0.5);
  assert(Math.abs(g.morale - (moraleNormal(g) + 15)) < 1e-9, `taket: ${g.morale} mot ${moraleNormal(g) + 15}`);
});

test("Fart etter kort (B-160): 1× som standard, samme fart hvis spilleren har valgt det", () => {
  const g = newGame(71);
  const card = (speed: number) => {
    g.pendingDecision = { id: "test", title: "", text: "", options: [{ label: "OK" }], data: {}, resumeSpeed: speed };
    g.speed = 0;
  };
  card(10);
  resolveDecision(g, 0);
  assert(g.speed === 1 && (g.counters.fartNed ?? 0) === 1, `standard: ${g.speed}`);
  g.settings.keepSpeed = true;
  card(10);
  resolveDecision(g, 0);
  assert(g.speed === 10 && g.counters.fartNed === 1, `samme fart: ${g.speed}`);
  card(3);
  resolveDecision(g, 0);
  assert(g.speed === 3, `3×: ${g.speed}`);
  const old = JSON.parse(JSON.stringify(g));
  delete old.settings.keepSpeed;
  assert(parseSave(JSON.stringify(old))!.settings.keepSpeed === false, "migrate gir standardverdi");
});

test("Kundevurdering (B-161): tid, margin og reklamasjon gir karakter 1–10", () => {
  const g = newGame(72);
  g.minute = 10 * 1440; // dag 11
  const c = {
    id: 999,
    customer: "Test",
    product: "blokk",
    grade: "standard",
    tonnes: 1,
    delivered: 1,
    pricePerT: 1,
    deadlineDay: 16,
    offerExpiresMin: 0,
    repGain: 1,
    repLoss: 1,
    penaltyPerT: 1,
    priority: 1,
    status: "aktiv",
    closedDay: null,
    acceptedDay: 10,
    qMargin: 0.5,
  } as Contract;
  assert(rateDelivery(g, c).score === 10, `i god tid og god margin: ${rateDelivery(g, c).score}`);
  c.deadlineDay = 11;
  c.acceptedDay = 8;
  c.qMargin = 0.02;
  assert(rateDelivery(g, c).score === 5, `siste liten og på kanten: ${rateDelivery(g, c).score}`);
  c.qMargin = 0.2;
  c.complained = true;
  assert(rateDelivery(g, c).score <= 3, "reklamasjon gir høyst 3");
  assert(ratingFactor(10) > ratingFactor(7) && Math.abs(ratingFactor(7) - 0.99) < 1e-9, "faktoren");
  g.ratings = [8, 9, 10];
  assert(avgRating(g) === 9, "snittet");
  // Margin: midt i karbonvinduet og lavt fosfor er god margin; over maks er under 0
  const spec = GRADES.standard;
  const mid = { c: (spec.cMin + spec.cMax) / 2, p: spec.pMax * 0.3, tramp: spec.trampMax * 0.3, s: 0 } as Analysis;
  assert(specMargin(mid, "standard") > 0.3, `midt i vinduet: ${specMargin(mid, "standard")}`);
  assert(specMargin({ ...mid, p: spec.pMax * 1.1 }, "standard") < 0, "over maks");
  const old = JSON.parse(JSON.stringify(g));
  delete old.ratings;
  assert(Array.isArray(parseSave(JSON.stringify(old))!.ratings), "migrate gir ratings");
});

test("Sesongquiz (B-161): finnes, men teller ikke i «Fagekspert»", () => {
  assert(QUIZ.sesong?.length === 2, "sesongkapitlet mangler quiz");
  const g = newGame(73);
  g.quizDone = Object.keys(QUIZ).filter((k) => k !== "sesong");
  checkAchievements(g);
  assert(hasAchievement(g, "quizalle"), "alle quizer uten sesong skal gi «Fagekspert»");
});

test("Lærling og fagbrev (B-163): fagprøve etter læretida, stryk gir ny prøve, bestått gir vanlig lønn", () => {
  const g = newGame(74);
  g.stage = 2;
  g.pendingDecision = { id: "laerling", title: "", text: "", options: [{ label: "Ja" }], data: {}, resumeSpeed: 1 };
  resolveDecision(g, 0);
  const w = g.workers.find((x) => x.name.endsWith("(lærling)"))!;
  assert(w && w.apprenticeUntil === 1 + APPRENTICE_DAYS, `fagprøvedag ${w?.apprenticeUntil}`);
  const lowPay = w.salary;
  // Før læretida er over: ingenting skjer
  g.minute = 10 * 1440;
  apprenticeExams(g);
  assert(w.apprenticeUntil !== undefined, "tok prøven for tidlig");
  // For lite ferdighet: stryk og ny prøve om en uke
  g.minute = APPRENTICE_DAYS * 1440;
  w.skill = 1.3;
  apprenticeExams(g);
  assert(w.apprenticeUntil === 1 + APPRENTICE_DAYS + EXAM_RETRY_DAYS, `ny prøve ${w.apprenticeUntil}`);
  // Nok ferdighet: fagbrev
  g.minute = (APPRENTICE_DAYS + EXAM_RETRY_DAYS) * 1440;
  w.skill = 1.9;
  apprenticeExams(g);
  assert(w.apprenticeUntil === undefined && !w.name.includes("lærling"), `ikke fagbrev: ${w.name}`);
  assert(w.salary > lowPay && w.salary === normalSalary(g, w.role, w.skill), `lønn ${lowPay} → ${w.salary}`);
  // Lærlinger fra gamle lagringer får en fagprøve
  const old = JSON.parse(JSON.stringify(g));
  old.workers.push({ ...old.workers[0], id: 999, name: "Gammel Lærling (lærling)", apprenticeUntil: undefined });
  const m = parseSave(JSON.stringify(old))!;
  assert(m.workers.find((x) => x.id === 999)?.apprenticeUntil !== undefined, "gammel lærling fikk ingen fagprøve");
});

test("Planlagt bytte av støping (B-163): rammeavtaler på det gamle produktet sender ikke nye uker", () => {
  const make = (planned: boolean) => {
    const g = newGame(75);
    g.stage = 2;
    const product = computePlantStats(g).casting.product;
    g.agreements.push({
      id: 1,
      customer: "Test",
      product,
      grade: "standard",
      weeklyT: 1,
      pricePerT: 1,
      weeks: 5,
      weeksSent: 1,
      weeksDone: 1,
      weeksMissed: 0,
      nextDay: 1,
      bonusKr: 0,
      bonusRep: 0,
      status: "aktiv",
      offerExpiresMin: 0,
      closedDay: null,
    } as Agreement);
    if (planned) g.pendingCastingSwitch = "streng1";
    advance(g, 1440);
    return g.contracts.filter((c) => c.agreementId === 1).length;
  };
  assert(make(false) === 1, "uten planlagt bytte skulle uka komme");
  assert(make(true) === 0, "planlagt bytte skulle stoppe nye uker");
});

test("Avløsere (B-164): de som står fast på plasser, teller ikke som ledige, og oppsigelse viser hva som mangler", () => {
  const g = newGame(76);
  g.stage = 3;
  g.castingType = "streng1";
  g.workers = [];
  const crew = crewPerShift(g);
  // Fullt for tre skift, bortsett fra to støpere; tre avløsere
  for (const [role, n] of Object.entries(crew) as [RoleId, number][])
    for (let i = 0; i < n * 3 - (role === "stoper" ? 2 : 0); i++) g.workers.push(makeCandidate(g, role));
  for (let i = 0; i < 3; i++) g.workers.push(makeCandidate(g, "allround"));
  assert(staffing(g, true).crews === 3, `lag: ${staffing(g, true).crews}`);
  const wild = wildcardUse(g);
  assert(wild.total === 3 && wild.tied === 2 && wild.spare === 1, `avløsere ${JSON.stringify(wild)}`);
  assert(wild.byRole.stoper === 2, "avløserne står ikke som støpere");
  const advice = supportAdvice(g).find((a) => a.role === "allround");
  assert(advice?.have === 1 && !!advice.note?.includes("støpere"), `anbefaling ${JSON.stringify(advice)}`);
  // Én ledig avløser kan sies opp uten at skiftene endres; sier man opp en til, mangler en støper
  const avl = g.workers.filter((w) => w.role === "allround");
  assert(fireImpact(g, avl[0].id).after === 3, "første avløser skulle kunne gå");
  g.workers = g.workers.filter((w) => w.id !== avl[0].id);
  const hit = fireImpact(g, avl[1].id);
  assert(hit.after < 3 && hit.missing.stoper === 1, `etter oppsigelse ${JSON.stringify(hit)}`);
  // B-170: «Ansett til plassene» tar søkere med rollen som mangler, og avløserne blir ledige
  g.candidates = [makeCandidate(g, "stoper"), makeCandidate(g, "stoper"), makeCandidate(g, "stoper")];
  g.candidates.push(makeCandidate(g, "murer"));
  const r = hireForWildcards(g);
  const after = wildcardUse(g);
  assert(r.ok && after.tied === 0 && after.spare === 2, `etter ansettelse ${JSON.stringify(after)}`);
  assert(g.candidates.length === 2 && g.candidates.some((c) => c.role === "murer"), "ansatte feil søkere");
  assert(!hireForWildcards(g).ok, "ansatte uten at noen avløser står fast");
});

test("Utbytte i ekte tid (B-304): samme regel som serveren, avtagende med størrelsen, og farten betyr ingenting", () => {
  const g = newGame(81);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.tutorial = null;
  g.pendingDecision = null;
  // Tallene i speilet er de samme som i spillet
  for (const t of ["stalverk", "storverk", "kompleks"] as const)
    assert(DIVIDEND.base[t] * 10 === SISTER_TYPES[t].profitPerDay, `grunntallet for ${t} i speilet (en tidel, B-311)`);
  assert(
    DIVIDEND.levelGain === MODERNIZE_GAIN && DIVIDEND.flagship === FLAGSHIP_MAX,
    "trinn eller flaggskip i speilet",
  );
  // Mesterskapet teller ikke i utbyttet (B-328)
  assert(DIVIDEND.masteryMax === 0, "mesterskapet i utbyttet");
  const plant = (id: number, level = 5) =>
    ({ id, type: "kompleks", name: `Verk ${id}`, level, boughtDay: 0, downUntilDay: 0 }) as const;
  const one = [plant(1)];
  const many = Array.from({ length: 14 }, (_, i) => plant(i + 1));
  // Driftsresultatet i et verk avhenger ikke av antall verk
  assert(sisterProfit(g, one[0]) === sisterProfit(g, many[0]), "driftsresultatet avhenger av antall verk");
  // Utbyttet øker for hvert verk, men mindre og mindre
  let prev = 0;
  let prevStep = Infinity;
  for (let n = 1; n <= 14; n++) {
    const net = konsernNetFor(g, many.slice(0, n));
    assert(net > prev, `utbyttet går ned ved ${n} verk`);
    assert(net - prev < prevStep + 1, `verk ${n} gir mer enn verket før`);
    prevStep = net - prev;
    prev = net;
  }
  assert(prev < 14 * konsernNetFor(g, one) * 0.5, "14 verk gir nesten 14 ganger så mye som ett");
  assert(prev > 3 * konsernNetFor(g, one), "14 verk gir ikke mer enn tre");
  // Et nytt (umodernisert) verk trekker aldri ned det de gamle gir før belastningen
  const before = dividendParts(dividendInput(g, many.slice(0, 10)));
  const after = dividendParts(dividendInput(g, [...many.slice(0, 10), plant(11, 0)]));
  assert(
    before.every((d, i) => Math.abs(after[i] - d) < 1),
    "et nytt verk senket utbyttet fra de gamle",
  );
  // Belastningen: uendret opp til grensen, så kvadratroten
  assert(afterEmpireLoad(4e6) === 4e6, "belastning på et lite konsern");
  assert(Math.abs(afterEmpireLoad(40e6) - 20e6) < 1, `kvadratroten over grensen: ${afterEmpireLoad(40e6)}`);
  // Faste tall (de samme kjøres mot SQL-en i supabase/051): fullt konsern, nytt konsern, og et som bygger
  const full = dividendPerDay({
    plants: Array.from({ length: 14 }, () => ({ type: "kompleks", level: 5, building: false })),
    shared: 2,
    research: 2,
    mastery: 23,
    reputation: 100,
    quality: 1,
  });
  // Uten mesterskapet (B-328): mastery står i inngangen, men teller ikke
  assert(Math.abs(full - 36_965_568.837) < 0.1, `fullt konsern: ${full.toFixed(3)}`);
  const small = dividendPerDay({
    plants: Array.from({ length: 3 }, () => ({ type: "storverk", level: 0, building: false })),
    shared: 0,
    research: 0,
    mastery: 0,
    reputation: 50,
    quality: 0.8,
  });
  assert(Math.abs(small - 4_146_545.455) < 0.1, `nytt konsern: ${small.toFixed(3)}`);
  const mixed = dividendPerDay({
    plants: [
      { type: "stalverk", level: 0, building: true },
      { type: "kompleks", level: 2, building: false },
    ],
    shared: 1,
    research: 0,
    mastery: 5,
    reputation: 100,
    quality: 0,
  });
  assert(Math.abs(mixed - 6_615_000) < 0.1, `konsern som bygger: ${mixed.toFixed(3)}`);
  assert(dividendPerDay({ plants: [], shared: 2, research: 2, mastery: 9, reputation: 100, quality: 1 }) === 0, "tomt");
  // Spillfarten og spilltida betyr ingenting: samme utbytte etter et spilldøgn på 10×
  g.konsern.plants = many.slice(0, 3).map((p) => ({ ...p }));
  const want = konsernNetFor(g, g.konsern.plants);
  g.speed = 3;
  advance(g, 1440);
  assert(Math.abs(konsernNetFor(g, g.konsern.plants) - want) < want * 0.01, "utbyttet fulgte spilltida");
  // Døgnet hjemme bokfører verken utbytte eller konsernkostnader lenger (B-304)
  g.today.costs = {};
  g.today.income = {};
  konsernDay(g);
  assert(!(g.today.income.konsern ?? 0) && !(g.today.costs.konsern ?? 0), "konsernet gikk inn i kassa hjemme");
});

test("Mesterskap «Holdbare ovnspotter» (B-165): foringen slites mindre for hvert nivå", () => {
  const g = newGame(77);
  g.researched = RESEARCH.map((r) => r.id);
  const before = liningWearPerHeat(g);
  g.researchPoints = 10_000;
  assert(buyMastery(g, "foring").ok && buyMastery(g, "foring").ok, "kunne ikke kjøpe");
  const after = liningWearPerHeat(g);
  assert(Math.abs(after / before - (1 - masteryEffect("foring", 2))) < 1e-9, `slitasje ${before} → ${after}`);
  assert(MASTERY.foring.max <= 0.3, "for stor gevinst");
});

test("Kassa uten tak (B-381): store tall blir i kassa, og Privat formue står fryst", () => {
  assert(CASH_RESERVE.softCap === null, "taket er ikke fjernet");
  const g = newGame(381);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.tutorial = null;
  g.pendingDecision = null;
  // En gammel utbetaling står som historikk
  g.paidOut = { total: 7e9, firstDay: 900, today: 3e8 };
  g.cash = 250e9;
  assert(applyCashCap(g) === 0 && g.cash === 250e9, `kassa ble tatt: ${g.cash}`);
  advance(g, 60);
  assert(g.cash > 200e9 && paidOutTotal(g) === 7e9, `formuen er ikke fryst: ${paidOutTotal(g)}`);
  // Kassa teller i konsernverdien, og sluttmålet regnes med den fryste formuen
  assert(konsernEquity(g) >= g.cash - 1, "kassa teller ikke i konsernverdien");
  assert(valueCreated(g) === konsernEquity(g) + 7e9, "sluttmålet mistet den fryste formuen");
  // Døgnlinja om utbetaling kommer ikke lenger, men dagens tall nullstilles
  const before = g.log.length;
  g.paidOut.today = 5e8;
  paidOutDayLog(g);
  assert(g.paidOut.today === 0 && g.log.length === before, "døgnlinja om utbetaling kom uten tak");
  // Store tall i kort form (toppfeltet) og nøyaktig (detaljene)
  assert(fmtKr(1.234e12).length <= 16, `for lang kort form: ${fmtKr(1.234e12)}`);
});

test("Taket for kassa (B-303, fjernet i B-381): mekanikken virker fortsatt hvis det slås på", () => {
  const cap = 10_000_000_000;
  const savedCap = CASH_RESERVE.softCap;
  CASH_RESERVE.softCap = cap;
  const g = newGame(193);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.tutorial = null;
  g.pendingDecision = null;
  // Under taket skjer ingenting, og utbetalingen finnes ikke (vises ikke før den trengs)
  g.cash = cap - 1;
  assert(applyCashCap(g) === 0 && g.paidOut === null && !hasPaidOut(g), "utbetaling før taket");
  // Over taket: overskuddet betales ut, konsernverdien er kassa pluss verkene
  g.cash = cap + 5e9;
  const logBefore = g.log.length;
  assert(applyCashCap(g) === 5e9, "feil beløp betalt ut");
  assert(g.cash === cap && paidOutTotal(g) === 5e9, `kasse ${g.cash}, utbetalt ${paidOutTotal(g)}`);
  assert(Math.abs(konsernEquity(g) - cap) < 1, `utbetalingen teller i konsernverdien: ${konsernEquity(g)}`);
  assert(
    g.log.length === logBefore + 1 && /flyttes nå til din private formue/.test(g.log[g.log.length - 1].text),
    "ingen forklaring",
  );
  // Neste gang: ingen ny forklaring, beløpet legges til
  g.cash = cap + 1e9;
  applyCashCap(g);
  assert(paidOutTotal(g) === 6e9 && g.log.length === logBefore + 1, "forklaringen kom to ganger");
  // Kan ikke brukes: kjøp og konsernkassa ser bare kassa
  g.cash = 0;
  fund(g, 0);
  assert(!buySister(g, "stalverk").ok, "kjøpte med det utbetalte");
  // Døgnlinja oppsummerer og nullstiller
  g.paidOut!.today = 2e9;
  paidOutDayLog(g);
  assert(
    g.paidOut!.today === 0 && /flyttet til din private formue i går/.test(g.log[g.log.length - 1].text),
    "ingen døgnlinje",
  );
  // Motoren betaler ut av seg selv
  g.cash = cap + 3e9;
  advance(g, 1);
  assert(g.cash <= cap && paidOutTotal(g) >= 9e9, `motoren betalte ikke ut: kasse ${g.cash}`);
  // Den gamle bundne reserven (B-193) regnes som utbetalt, og teller ikke i konsernverdien
  g.lockedReserve = { total: 2e12, firstDay: 1, movedToday: 0 };
  assert(paidOutTotal(g) === 2e12 + 9e9, "den gamle reserven teller ikke som utbetalt");
  assert(Math.abs(konsernEquity(g) - cap) < 1, "den gamle reserven teller i konsernverdien");
  // Konkurs: det utbetalte er ikke sikkerhet
  g.cash = -1e12;
  g.negativeDays = 0;
  for (let d = 0; d < 9 && !g.gameOver; d++) {
    g.pendingDecision = null;
    advance(g, 1440);
  }
  assert(g.gameOver, `ingen konkurs med det utbetalte som sikkerhet (${g.negativeDays} døgn over grensen)`);
  // Taket kan slås av (standarden fra B-381)
  const g2 = newGame(194);
  CASH_RESERVE.softCap = null;
  g2.cash = cap * 3;
  assert(applyCashCap(g2) === 0 && g2.cash === cap * 3, "taket virker når det er slått av");
  CASH_RESERVE.softCap = savedCap;
  // Gamle lagringer får feltet som null, og det overlever lagring
  const old = JSON.parse(JSON.stringify(g));
  delete old.paidOut;
  assert(parseSave(JSON.stringify(old))!.paidOut === null, "gammel lagring uten standardverdi");
  assert(parseSave(JSON.stringify(g))!.paidOut!.total === g.paidOut!.total, "utbetalingen forsvant ved lagring");
  // Merket for reform 2 gis fra serveren og vises bare for dem som har det
  assert(!visibleFamilies(g).some((f) => f.id === "reform2"), "serien vises for en som ikke har den");
  assert(applyServerBadges(g, ["reform2"]) && hasAchievement(g, "reform2"), "merket ble ikke gitt");
});

test("Plass til fem skiftlag og alle anbefalte støtteroller på et fullt utbygd storverk (B-207)", () => {
  const g = newGame(207);
  g.stage = STAGES.length - 1;
  // Største ovn og støping verket kan ha, tre ovner og alt tilleggsutstyr
  const biggest = <T extends { crew: Partial<Record<RoleId, number>> }>(list: T[]) =>
    list.reduce((a, b) =>
      Object.values(b.crew).reduce((x, y) => x + (y ?? 0), 0) > Object.values(a.crew).reduce((x, y) => x + (y ?? 0), 0)
        ? b
        : a,
    );
  const furnace = biggest(FURNACES.filter((f) => f.stage <= g.stage));
  g.furnaceType = furnace.id;
  g.castingType = biggest(CASTINGS.filter((c) => c.stage <= g.stage)).id;
  g.owned = ADDONS.filter((a) => a.stage <= g.stage && !a.perFurnace).map((a) => a.id);
  while (g.furnaces.length < 3) g.furnaces.push(structuredClone(g.furnaces[0]));
  g.furnaces.forEach((f) => (f.type = furnace.id));
  g.settings.rolling = true;
  g.researched.push("innkjop", "ordreplan");
  g.workers = [];
  for (const [role, n] of Object.entries(crewPerShift(g)) as [RoleId, number][])
    for (let i = 0; i < n * MAX_CREWS; i++) g.workers.push(makeCandidate(g, role));
  assert(staffing(g, true).crews === MAX_CREWS, `lag: ${staffing(g, true).crews}`);
  const support = supportAdvice(g).reduce((a, s) => a + Math.max(0, s.want - s.have), 0);
  const need = g.workers.length + support;
  assert(need <= STAGES[g.stage].staffCap, `trenger ${need}, plass til ${STAGES[g.stage].staffCap}`);
});

test("Skrapklasseren smelter om eget returskrap, og planleggeren holder av plass på lageret (B-208)", () => {
  const clean = { p: 0.006, tramp: 0.046, c: 0.2, dirt: 0.01, radioactive: false };
  const setup = () => {
    const g = newGame(208);
    g.stage = 3;
    g.workers.push({ ...makeCandidate(g, "klasser"), hiredDay: 1 });
    for (const id of Object.keys(g.scrap) as (keyof typeof g.scrap)[]) g.scrap[id].t = 0;
    g.scrap.rent = { ...g.scrap.rent, t: 500, p: 0.012, tramp: 0.05, c: 0.06, dirt: 0.01, radioactive: false };
    g.scrap.rajern = { ...g.scrap.rajern, t: 500, p: 0.05, tramp: 0.01, c: 4, dirt: 0.005, radioactive: false };
    // Lysbueovn: karbonet brennes av, så returens karbon betyr ikke noe
    g.furnaceType = "lysbue30";
    for (const f of g.furnaces) {
      f.grade = null;
      f.type = "lysbue30";
    }
    g.recipe = { rent: 90, spon: 0, retur: 0, tungt: 0, rajern: 10, blandet: 0, shredder: 0 };
    g.gradeRecipes[g.targetGrade] = { ...g.recipe };
    return g;
  };
  // Mye rent returskrap: en fjerdedel av chargen blir retur, i stedet for rent skrap. Råjernet (renere) står
  const g = setup();
  g.scrap.retur = { t: 1000, ...clean };
  takeScrap(g, 100, false, g.recipe);
  assert(Math.abs(1000 - g.scrap.retur.t - 100 * RETURN_MAX_SHARE) < 0.01, `retur brukt: ${1000 - g.scrap.retur.t}`);
  assert(Math.abs(500 - g.scrap.rajern.t - 10) < 0.01, `råjern brukt: ${500 - g.scrap.rajern.t}`);
  assert(Math.abs(500 - g.scrap.rent.t - 65) < 0.01, `rent brukt: ${500 - g.scrap.rent.t}`);
  // Induksjonsovnen brenner ikke av karbon: retur (0,2 % C) byttes ikke inn for rent skrap (0,06 % C)
  const ind = setup();
  ind.furnaceType = "induksjon5";
  for (const f of ind.furnaces) f.type = "induksjon5";
  ind.scrap.retur = { t: 1000, ...clean };
  takeScrap(ind, 100, false, ind.recipe);
  assert(ind.scrap.retur.t === 1000, "byttet inn returskrap med mer karbon i en induksjonsovn");
  // Skittent returskrap (fra en enkel kvalitet) byttes ikke inn for rent skrap
  const d = setup();
  d.scrap.retur = { t: 1000, ...clean, tramp: 0.3 };
  takeScrap(d, 100, false, d.recipe);
  assert(d.scrap.retur.t === 1000, "brukte skittent returskrap");
  // En resept som selv skal ha retur, får beholde det den trenger til to charger
  const r = setup();
  r.scrap.retur = { t: 30, ...clean };
  r.furnaces.push(structuredClone(r.furnaces[0]));
  r.furnaces[1].grade = "premium";
  r.gradeRecipes.premium = { rent: 60, spon: 0, retur: 10, tungt: 0, rajern: 30, blandet: 0, shredder: 0 };
  takeScrap(r, 100, false, r.recipe);
  // Premium trenger 10 % av 100 t til to charger = 20 t; bare det som er over, kan brukes
  assert(Math.abs(r.scrap.retur.t - 20) < 0.01, `tok returen premium-resepten trenger (${r.scrap.retur.t} t igjen)`);
  // Lageret over 90 % fullt av skrap ingen resept trenger: planleggeren selger ned til 80 % i én omgang
  const p = setup();
  p.workers.push({ ...makeCandidate(p, "planlegger"), hiredDay: 1 });
  p.researched = RESEARCH.map((r) => r.id);
  p.contracts = p.contracts.filter((c) => c.status !== "aktiv");
  const stats = computePlantStats(p);
  p.scrap.rajern.t = 0;
  p.scrap.rent.t = stats.yardT * 0.3;
  p.scrap.blandet = {
    ...p.scrap.blandet,
    t: stats.yardT * 0.65,
    p: 0.03,
    tramp: 0.3,
    c: 0.15,
    dirt: 0.07,
    radioactive: false,
  };
  p.cash = 1e9;
  autoBuy(p, computePlantStats(p), { credit: false, cap: null });
  // Minst det som trengs for å komme ned til 80 %, solgt i én omgang, og så kjøpt det resepten trenger
  const soldT = stats.yardT * 0.65 - p.scrap.blandet.t;
  assert(soldT >= stats.yardT * 0.15 - 1, `solgte bare ${Math.round(soldT)} t av ${Math.round(stats.yardT)} t lager`);
  assert(p.scrap.rajern.t > 0, `kjøpte ikke råjern (${p.autoBuyNote})`);
  assert(computePlantStats(p).yardUsed <= stats.yardT + 1e-6, "lageret er overfylt");
});

test("Konsernet bygger i ekte tid, verdien faller ikke imens, og flaggskipet gir mer utbytte (B-209)", () => {
  const g = newGame(209);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.cash = 5_000_000_000;
  let now = 1_000_000_000_000;
  setRealClock(() => now);
  const equity = konsernEquity(g);
  assert(buySister(g, "stalverk").ok, "kjøpet feilet");
  const id = g.konsern.plants[0].id;
  const p0 = plantById(g, id);
  // Under bygging: ikke noe utbytte, men verdien teller (verdien i spillet faller ikke)
  assert(p0.project?.kind === "bygg" && underConstruction(p0), "verket bygges ikke");
  assert(dividends(g, g.konsern.plants)[0] === 0, "bygget verk tjener");
  assert(konsernEquity(g) >= equity, "verdien falt ved kjøpet");
  // Spillfarten betyr ingenting: ett spilldøgn går, men ingen ekte tid
  advance(g, 1440);
  assert(!!plantById(g, id).project, "ble ferdig av spilltid");
  now += (BUILD_HOURS.stalverk - 0.5) * 3_600_000;
  assert(finishKonsernProjects(g) === 0 && !!plantById(g, id).project, "ble ferdig for tidlig");
  now += 3_600_000;
  assert(finishKonsernProjects(g) === 1 && !plantById(g, id).project, "ble ikke ferdig");
  assert(dividends(g, g.konsern.plants)[0] > 0, "ferdig verk ga ikke utbytte");
  // Modernisering: verket går som før, og verdien regnes som ferdig modernisert
  const before = sisterProfit(g, plantById(g, id));
  const value = sisterValue(g, plantById(g, id));
  assert(modernizeSister(g, id).ok, "moderniseringen startet ikke");
  const p = plantById(g, id);
  assert(sisterProfit(g, p) === before && p.level === 0, "moderniseringen virket med én gang");
  assert(sisterValue(g, p) > value, "verdien regnes ikke som ferdig modernisert");
  // Salg (B-307): 60 % av byggekostnaden (som modernisert), aldri verdien – kjøp og salg skal tape penger
  {
    const price = sisterPrice(g, "stalverk");
    const sale = sisterSalePrice(g, p);
    assert(Math.abs(sale - SISTER_TYPES.stalverk.price * (1 + MODERNIZE_SHARE) * SELL_SHARE) < 1, `salgssum ${sale}`);
    assert(sale < price && sale < sisterValue(g, p), `salg ${sale} lønner seg mot kjøp ${price}`);
    // Bonusene endrer verdien, men ikke salgssummen
    g.researched.push("konsernstyring", "gronnkonsern");
    g.konsern.shared.push("innkjop", "salg");
    assert(sisterSalePrice(g, p) === sale, "salgssummen fulgte bonusene");
    // Et verk med et prosjekt kan ikke selges; et verk uten kan, og pengene går til konsernkassa (B-326)
    assert(!sellSister(g, id).ok, "solgte et verk som moderniseres");
    const cash = g.cash;
    const kasse = g.konsern.treasury!.balance;
    g.konsern.plants.push({ id: 77, type: "stalverk", name: "Test", level: 0, boughtDay: 0, downUntilDay: 0 });
    assert(sellSister(g, 77).ok && g.cash === cash, "salget gikk til kassa hjemme");
    assert(Math.abs(g.konsern.treasury!.balance - kasse - SISTER_TYPES.stalverk.price * SELL_SHARE) < 1, "feil sum");
  }
  // To trinn på samme verk går i kø, det siste kan avbestilles før det starter
  assert(modernizeSister(g, id).ok, "kunne ikke legge neste trinn i køen");
  const last = g.konsern.orders.at(-1)!;
  const kasse = g.konsern.treasury!.balance;
  assert(localCancel(g, last.id).ok && g.konsern.treasury!.balance === kasse + last.cost, "avbestillingen");
  assert(!localCancel(g, g.konsern.orders[0].id).ok, "avbestilte et prosjekt som er i gang");
  now += MODERNIZE_HOURS * 3_600_000;
  finishKonsernProjects(g);
  assert(plantById(g, id).level === 1 && sisterProfit(g, plantById(g, id)) > before, "moderniseringen ble ikke ferdig");
  // Flaggskipet: omdømme 100 og bare stål som holder kvaliteten gir +20 %; ingen produksjon gir ingenting
  g.history = [];
  assert(flagshipBonus(g) === 0, "flaggskip uten produksjon");
  g.reputation = 100;
  g.history = [0, 1, 2].map((d) => ({ ...structuredClone(g.today), day: d, onGradeT: 100, offGradeT: 0, secondT: 0 }));
  assert(Math.abs(flagshipBonus(g) - FLAGSHIP_MAX) < 1e-9, `flaggskip ${flagshipBonus(g)}`);
  g.reputation = 50;
  g.history[0].secondT = 300;
  assert(Math.abs(flagshipBonus(g) - FLAGSHIP_MAX * 0.5 * 0.5) < 1e-9, `flaggskip ${flagshipBonus(g)}`);
  setRealClock(() => Date.now());
});

test("Søker til skiftleder, kameraer stopper tyvene, like kort i ekte tid og lederutvikling (B-210)", () => {
  // Anbefalt skiftleder: det finnes alltid en søker til rollen
  const g = newGame(210);
  g.stage = 3;
  g.castingType = "streng1";
  g.workers = [];
  for (const [role, n] of Object.entries(crewPerShift(g)) as [RoleId, number][])
    for (let i = 0; i < n * 3; i++) g.workers.push(makeCandidate(g, role));
  g.candidates = [];
  ensureCandidates(g);
  assert(
    g.candidates.some((c) => c.role === "skiftleder"),
    "ingen søker til skiftleder",
  );
  // Kameraer: tyverikortet kommer ikke igjen på samme verk, men på et nytt
  const d = makeDecision(g, "kobbertyveri")!;
  g.pendingDecision = { ...d, resumeSpeed: 1 };
  resolveDecision(g, 0);
  assert(makeDecision(g, "kobbertyveri") === null, "tyverikortet kom igjen etter kameraene");
  g.stage = 4;
  assert(makeDecision(g, "kobbertyveri") !== null, "tyverikortet kommer aldri på et nytt verk");
  // Samme kort ikke igjen på seks timer i ekte tid, uansett hvor mange spilldøgn som går
  let now = 5_000_000_000_000;
  setRealClock(() => now);
  const h = newGame(211);
  h.stage = 3;
  const seen: string[] = [];
  for (let d2 = 0; d2 < 400; d2++) {
    h.minute += 1440;
    h.pendingDecision = null;
    maybeCreateDecision(h);
    if (h.pendingDecision) seen.push((h.pendingDecision as { id: string }).id);
  }
  assert(seen.length > 0 && new Set(seen).size === seen.length, `samme kort to ganger: ${seen.join(", ")}`);
  now += SAME_CARD_REAL_MS;
  setRealClock(() => Date.now());
  // Lederutvikling: flink operatør, dyrt, borte lenge, blir skiftleder
  const w = g.workers.find((x) => x.role === "ovn")!;
  w.skill = 3.5;
  assert(!!leaderCourseBlock(g, w), "kunne sende en middels flink operatør");
  w.skill = 4.2;
  g.cash = 1e9;
  const cash = g.cash;
  assert(sendOnLeaderCourse(g, w.id).ok, "kurset startet ikke");
  assert(
    Math.abs(cash - g.cash - leaderCourseCost(g)) < 1 && isAbsent(g, w),
    "kurset kostet feil eller var ikke fravær",
  );
  // Hendelseskort stopper tida, så de ryddes bort underveis
  const run = (days: number) => {
    for (let h = 0; h < days * 24; h++) {
      g.pendingDecision = null;
      g.pendingManual = null;
      advance(g, 60);
    }
  };
  run(LEADER_COURSE_DAYS - 1);
  assert(w.role === "ovn", "ble skiftleder for tidlig");
  run(2);
  assert(w.role === "skiftleder" && !isAbsent(g, w), `ble ikke skiftleder (${w.role})`);
});

test("Landemerket går først i køen, og skiftlederen kan leie vikarer for alle som er borte (B-211)", () => {
  const g = newGame(212);
  g.stage = 3;
  for (const c of g.contracts) c.status = "tilbud";
  const [a, b] = g.contracts;
  acceptContract(g, a.id);
  acceptContract(g, b.id);
  const lm: Contract = { ...structuredClone(a), id: g.nextContractId++, landmark: "fyr", status: "tilbud" };
  g.contracts.push(lm);
  acceptContract(g, lm.id);
  assert(orderQueue(g)[0].id === lm.id, "landemerket står ikke først i køen");
  // Skiftlederen og vikarene
  g.workers = [];
  for (const [role, n] of Object.entries(crewPerShift(g)) as [RoleId, number][])
    for (let i = 0; i < n * 4; i++) g.workers.push(makeCandidate(g, role));
  g.workers.push(makeCandidate(g, "skiftleder"));
  const w = g.workers[0];
  w.absentFrom = g.minute;
  w.absentUntil = g.minute + 3 * 1440;
  w.absentReason = "syk";
  g.pendingDecision = null;
  advance(g, 60);
  assert(!tempsActive(g), "leide vikarer uten at det var valgt (fire lag dekker fraværet)");
  g.settings.leaderTemps = true;
  g.pendingDecision = null;
  advance(g, 60);
  assert(tempsActive(g), "skiftlederen leide ikke vikarer");
});

test("Valseverket rekker mindre enn støpingen (B-217): emnene teller med, og salgsdirektøren signerer avtaler igjen", () => {
  const g = newGame(217);
  g.stage = 4;
  g.owned.push("valseverk", "ovn2", "ovn3", "streng2", "streng3");
  g.furnaceCount = 3;
  g.furnaceType = "likestrom420";
  g.castingType = "streng8";
  g.settings.rolling = true;
  g.workers = [];
  for (const [role, n] of Object.entries(crewPerShift(g)) as [RoleId, number][])
    for (let i = 0; i < n * 5; i++) g.workers.push(makeCandidate(g, role));
  g.agreements = [];
  g.contracts = [];
  const stats = computePlantStats(g);
  assert(stats.products.includes("emne") && stats.products.includes("armering"), "verket lager ikke begge varene");
  assert(
    stats.rolledDailyT > 0 && stats.dailyProductT > stats.rolledDailyT * 2,
    "støpingen er ikke større enn valsingen",
  );
  assert(productCapT(stats, "armering") === stats.rolledDailyT, "armeringen er ikke begrenset av valseverket");
  assert(productCapT(stats, "emne") === stats.dailyProductT, "emnene er begrenset av valseverket");
  // Sju døgn med full drift, så salgsdirektøren regner med det verket faktisk lager
  for (let d = 0; d < 7; d++) g.history.push({ ...structuredClone(g.today), day: d, producedT: stats.dailyProductT });
  const grade = recipeEstimate(g, "standard", stats, gradeRecipe(g, "standard")).grades.at(-1)!;
  const week = stats.dailyProductT * 7;
  const agreement = (id: number, product: "emne" | "armering", weeklyT: number, status: "aktiv" | "tilbud") =>
    ({
      id,
      customer: "Test",
      product,
      grade,
      weeklyT,
      pricePerT: 1,
      weeks: 5,
      weeksSent: 1,
      weeksDone: 0,
      weeksMissed: 0,
      nextDay: 999,
      bonusKr: 0,
      bonusRep: 0,
      status,
      offerExpiresMin: g.minute + 2880,
      closedDay: null,
    }) as Agreement;
  g.cash = 1_000_000_000;
  g.konsern.unlocked = true;
  assert(hireDirector(g).ok, "kunne ikke ansette");
  // Før: døgnproduksjonen ble kuttet til valseverket, og to avtaler på til sammen en tredel av uka ble for mye
  g.agreements.push(
    agreement(1, "emne", Math.round(week * 0.18), "aktiv"),
    agreement(2, "emne", Math.round(week * 0.18), "tilbud"),
  );
  directorHour(g);
  assert(g.agreements.find((a) => a.id === 2)?.status === "aktiv", "salgsdirektøren signerte ikke emneavtalen");
  // Armering over det valseverket rekker, tas ikke, selv om verket har tonn nok
  g.agreements.push(agreement(3, "armering", Math.round(stats.rolledDailyT * 7 * 0.6), "tilbud"));
  directorHour(g);
  assert(g.agreements.find((a) => a.id === 3)?.status === "tilbud", "signerte mer armering enn valseverket rekker");
});

test("Landemerker går ikke ut (B-218): ingen svarfrist og ingen leveringsfrist", () => {
  const g = newGame(218);
  g.tutorial = null;
  g.minute = 3 * 1440;
  g.pendingDecision = null;
  landmarkHour(g, "2026-10-01");
  const c = landmarkContract(g)!;
  assert(!!c && c.status === "tilbud", "fikk ikke landemerket");
  // Svarfristen er passert: forespørselen står likevel
  c.offerExpiresMin = 0;
  advance(g, 60);
  assert(c.status === "tilbud" && g.contracts.includes(c), "forespørselen gikk ut");
  acceptContract(g, c.id);
  // Fristen er passert: kontrakten står i køen, uten bot
  c.deadlineDay = day(g) - 5;
  const bot = g.today.costs.bot ?? 0;
  g.pendingDecision = null;
  advance(g, 1440);
  assert(c.status !== "misligholdt", "landemerket ble misligholdt etter fristen");
  assert((g.today.costs.bot ?? 0) === 0 || (g.today.costs.bot ?? 0) === bot, "bot for et landemerke");
  assert(!assessOffer(g, computePlantStats(g), { ...c, status: "tilbud" }).tight, "landemerket vurderes som for sent");
});

test("Skrapvarselet (B-219): ikke når ovnen fyller opp med annet skrap, men når neste charge står fast", () => {
  const g = newGame(219);
  g.stage = 1;
  const stats = computePlantStats(g);
  g.recipe = { rent: 0, spon: 0, retur: 50, tungt: 50, rajern: 0, blandet: 0, shredder: 0 };
  for (const id of Object.keys(g.scrap) as (keyof typeof g.scrap)[]) g.scrap[id].t = 0;
  g.scrap.tungt.t = 1000;
  // Returskrapet er tomt og kan ikke kjøpes, men ovnen fyller opp med tungt skrap: ingen varsel
  assert(scrapShort(g, stats).includes("retur"), "returskrapet regnes ikke som tomt");
  assert(scrapAlert(g, stats).length === 0, "varslet selv om ovnen kan fylle opp med annet skrap");
  // Ingenting å fylle med: varsel
  g.scrap.tungt.t = 0.1;
  assert(scrapAlert(g, stats).includes("tungt"), "varslet ikke når neste charge står fast");
});

test("Valseverket får emner til armeringsordren øverst i køen (B-223), selv med en stor emneordre bak", () => {
  const setup = (rebarFirst: boolean) => {
    const g = newGame(223);
    g.stage = 4;
    g.owned.push("valseverk", "ovn2", "ovn3", "streng2", "streng3");
    g.furnaceCount = 3;
    g.furnaceType = "likestrom420";
    g.castingType = "streng8";
    g.settings.rolling = true;
    g.workers = [];
    for (const [role, n] of Object.entries(crewPerShift(g)) as [RoleId, number][])
      for (let i = 0; i < n * 5; i++) g.workers.push(makeCandidate(g, role));
    g.pendingDecision = null;
    g.contracts = [];
    g.agreements = [];
    const a = { c: 0.1, p: 0.01, tramp: 0.1 };
    g.lots = [
      {
        id: 1,
        product: "emne",
        t: 3000,
        analysis: a,
        known: a,
        measured: { c: true, p: true, tramp: true },
        second: false,
        madeDay: day(g),
      },
    ];
    const base = { delivered: 0, pricePerT: 1, deadlineDay: day(g) + 5, offerExpiresMin: 0, repGain: 0, repLoss: 0 };
    const more = { penaltyPerT: 0, status: "aktiv" as const, closedDay: null, acceptedDay: day(g) };
    g.contracts.push({
      ...base,
      ...more,
      id: 1,
      customer: "Emner",
      product: "emne",
      grade: "enkel",
      tonnes: 50_000,
      priority: 2,
    });
    if (rebarFirst)
      g.contracts.push({
        ...base,
        ...more,
        id: 2,
        customer: "Armering",
        product: "armering",
        grade: "enkel",
        tonnes: 1_000,
        priority: 1,
      });
    advance(g, 30);
    return (
      g.lots.filter((l) => l.product === "armering").reduce((t, l) => t + l.t, 0) +
      (g.contracts.find((c) => c.id === 2)?.delivered ?? 0)
    );
  };
  assert(setup(true) > 0, "valseverket valset ingenting selv om armeringsordren står øverst");
  assert(setup(false) === 0, "valseverket tok emner en emneordre venter på (uten armeringsordre foran)");
});

test("Valseverket valser bare kvaliteten armeringsordren trenger, og lar emneordrenes emner ligge (B-228)", () => {
  const g = newGame(228);
  g.stage = 4;
  g.owned.push("valseverk", "ovn2", "ovn3", "streng2", "streng3");
  g.furnaceCount = 3;
  g.furnaceType = "likestrom420";
  g.castingType = "streng8";
  g.settings.rolling = true;
  g.workers = [];
  for (const [role, n] of Object.entries(crewPerShift(g)) as [RoleId, number][])
    for (let i = 0; i < n * 5; i++) g.workers.push(makeCandidate(g, role));
  g.pendingDecision = null;
  g.agreements = [];
  const lav = { c: 0.03, p: 0.01, tramp: 0.1 };
  const arm = { c: 0.22, p: 0.02, tramp: 0.2 };
  const lot = (id: number, a: typeof lav) => ({
    id,
    product: "emne" as const,
    t: 3000,
    analysis: a,
    known: a,
    measured: { c: true, p: true, tramp: true },
    second: false,
    madeDay: day(g),
  });
  g.lots = [lot(1, lav), lot(2, arm)];
  const base = { delivered: 0, pricePerT: 1, deadlineDay: day(g) + 5, offerExpiresMin: 0, repGain: 0, repLoss: 0 };
  const more = { penaltyPerT: 0, status: "aktiv" as const, closedDay: null, acceptedDay: day(g) };
  g.contracts = [
    { ...base, ...more, id: 1, customer: "A", product: "armering", grade: "armering", tonnes: 1_000, priority: 1 },
    { ...base, ...more, id: 2, customer: "E", product: "emne", grade: "lavkarbon", tonnes: 50_000, priority: 2 },
  ];
  advance(g, 30);
  const lavLeft = g.lots.filter((l) => l.product === "emne" && l.known.c < 0.1).reduce((t, l) => t + l.t, 0);
  const emneGot = g.contracts.find((c) => c.id === 2)!.delivered;
  assert(Math.abs(lavLeft + emneGot - 3000) < 1, `lavkarbon-emner ble valset: ${lavLeft} + ${emneGot} av 3000`);
  const rebar = g.lots.filter((l) => l.product === "armering").reduce((t, l) => t + l.t, 0) + g.contracts[0].delivered;
  assert(rebar > 0, "valseverket valset ikke armeringsemnene");
});

test("En kontrakt regnes bare som dekket av partiene den selv får (B-228)", () => {
  const g = newGame(2281);
  g.pendingDecision = null;
  g.agreements = [];
  const a = { c: 0.1, p: 0.01, tramp: 0.1 };
  g.lots = [
    {
      id: 1,
      product: "emne",
      t: 100,
      analysis: a,
      known: a,
      measured: { c: true, p: true, tramp: true },
      second: false,
      madeDay: day(g),
    },
  ];
  const base = { delivered: 0, pricePerT: 1, deadlineDay: day(g) + 5, offerExpiresMin: 0, repGain: 0, repLoss: 0 };
  const more = { penaltyPerT: 0, status: "aktiv" as const, closedDay: null, acceptedDay: day(g) };
  g.contracts = [
    { ...base, ...more, id: 1, customer: "A", product: "emne", grade: "enkel", tonnes: 100, priority: 1 },
    { ...base, ...more, id: 2, customer: "B", product: "emne", grade: "enkel", tonnes: 100, priority: 2 },
  ];
  const ids = ordersToMake(g).map((c) => c.id);
  assert(ids.length === 1 && ids[0] === 2, `feil ordrer å lage: ${ids.join(",")}`);
});

test("Utfordringer i trinn (B-232): rekorder gir flere trinn på en gang, tellere starter på nytt per trinn", () => {
  const g = newGame(232);
  g.stage = 4;
  checkChallenges(g);
  assert(!!g.missions["u-rekord"] && !g.missions["u-rekord-2"], "trinn 2 startet før trinn 1");
  // En rekord som holder tre trinn, gir alle tre med én gang
  g.history = [{ ...g.history[0], day: 1, producedT: 21_000, income: {}, costs: {}, heats: 0, cashEnd: 0 }];
  checkChallenges(g);
  assert(
    g.missions["u-rekord"].done && g.missions["u-rekord-2"].done && g.missions["u-rekord-3"].done,
    "rekorden ga ikke tre trinn",
  );
  assert(!g.missions["u-rekord-4"]?.done && currentChallenge(g, "u-rekord")?.tier === 4, "trinn 4 er ikke neste");
  // En teller: trinn 2 teller fra trinn 1 ble nådd
  g.counters.rene_dogn = (g.counters.rene_dogn ?? 0) + 30;
  checkChallenges(g);
  assert(g.missions["u-rene"].done, "30 rene døgn ga ikke trinn 1");
  const base = g.missions["u-rene-2"]?.base;
  assert(base === g.counters.rene_dogn, `trinn 2 starter ikke fra nå: ${base}`);
  g.counters.rene_dogn += 59;
  checkChallenges(g);
  assert(!g.missions["u-rene-2"].done, "trinn 2 ble nådd for tidlig");
  g.counters.rene_dogn += 1;
  checkChallenges(g);
  assert(g.missions["u-rene-2"].done, "trinn 2 ble ikke nådd");
  assert(
    CHALLENGES.length >= 60 && new Set(CHALLENGES.map((c) => c.id)).size === CHALLENGES.length,
    "for få eller like id-er",
  );
});

test("Prestasjoner i trinn (B-232): de gamle merkene finnes, og det er mange flere", () => {
  const old = ["charge1", "kontrakt1", "verksted", "selv1", "charge100", "tonn1k", "stoperi", "quiz5", "forsk10"];
  const old2 = ["kontrakt50", "stalverk", "omdomme", "tiavti", "charge1000", "tonn100k", "selv25", "quizalle"];
  const old3 = ["storverk", "milliard", "datter1", "kontrakt250", "alleforsk", "datter10", "baron", "charge10k"];
  const old4 = ["tonn1m", "mester10", "magnat", "mester50", "legende"];
  const missing = [...old, ...old2, ...old3, ...old4].filter((id) => !ACHIEVEMENT_BY_ID[id]);
  assert(missing.length === 0, `mangler gamle merker: ${missing.join(", ")}`);
  assert(ACHIEVEMENTS.length >= 90, `for få merker: ${ACHIEVEMENTS.length}`);
  assert(new Set(ACHIEVEMENTS.map((a) => a.id)).size === ACHIEVEMENTS.length, "like id-er");
  // En erfaren spiller får ikke alle
  const g = newGame(2321);
  Object.assign(g.totals, { heats: 100_000, producedT: 27_000_000, contractsDone: 3500 });
  g.stage = 4;
  checkAchievements(g);
  assert(achievementsDone(g) < ACHIEVEMENTS.length * 0.8, `for mange merker på en gang: ${achievementsDone(g)}`);
  assert(nextInFamily(g, "charger")?.id === "charge150k", "neste charge-merke er feil");
});

test("Skiftlederen forlenger vikarene med én gang når noen blir borte lenger (B-233)", () => {
  const g = newGame(233);
  g.stage = 3;
  g.castingType = "streng1";
  g.workers = [];
  for (const [role, n] of Object.entries(crewPerShift(g)) as [RoleId, number][])
    for (let i = 0; i < n * 4; i++) g.workers.push(makeCandidate(g, role));
  g.workers.push(makeCandidate(g, "skiftleder"));
  g.settings.leaderTemps = true;
  const [a, b] = g.workers;
  a.absentFrom = g.minute;
  a.absentUntil = g.minute + 2 * 1440;
  a.absentReason = "syk";
  g.pendingDecision = null;
  advance(g, 60);
  assert(tempsActive(g), "skiftlederen leide ikke vikarer");
  const first = g.tempsUntilMin ?? 0;
  assert(first >= a.absentUntil, "vikarene dekker ikke hele fraværet");
  // En ny blir borte lenger enn vikarene er leid for: forlenges nå, ikke først når vikarene går hjem
  b.absentFrom = g.minute;
  b.absentUntil = g.minute + 5 * 1440;
  b.absentReason = "syk";
  g.pendingDecision = null;
  advance(g, 60);
  assert((g.tempsUntilMin ?? 0) >= b.absentUntil, "skiftlederen forlenget ikke vikarene");
  assert((g.tempsUntilMin ?? 0) < b.absentUntil + 1440, "skiftlederen leide vikarer for lenge");
});

test("Avbryte en rammeavtale (B-233): stor bot, omdømme ned, og uka i køen strykes", () => {
  const g = newGame(2331);
  g.stage = 2;
  const product = computePlantStats(g).casting.product;
  g.agreements.push({
    id: 7,
    customer: "Test",
    product,
    grade: "standard",
    weeklyT: 100,
    pricePerT: 8000,
    weeks: 10,
    weeksSent: 3,
    weeksDone: 2,
    weeksMissed: 0,
    nextDay: 30,
    bonusKr: 0,
    bonusRep: 3,
    status: "aktiv",
    offerExpiresMin: 0,
    closedDay: null,
  } as Agreement);
  const week = {
    ...structuredClone(g.contracts[0] ?? ({} as Contract)),
    id: g.nextContractId++,
    agreementId: 7,
    status: "aktiv",
  } as Contract;
  g.contracts.push(week);
  const cost = agreementCancelCost(g.agreements.at(-1)!);
  assert(cost.weeks === 8 && cost.kr === Math.round(8 * 100 * 8000 * 0.3), `feil bot: ${cost.kr}`);
  assert(cost.rep === 6, "omdømmestraffen er ikke dobbelt bonus");
  const cash = g.cash;
  g.reputation = 50;
  const rep = g.reputation;
  assert(cancelAgreement(g, 7).ok, "avtalen ble ikke avbrutt");
  assert(g.agreements.find((x) => x.id === 7)?.status === "brutt", "avtalen står ikke som brutt");
  assert(!g.contracts.some((c) => c.agreementId === 7 && c.status === "aktiv"), "uka står fortsatt i køen");
  assert(cash - g.cash === cost.kr, "bota ble ikke trukket");
  assert(g.reputation < rep, "omdømmet gikk ikke ned");
  assert(!cancelAgreement(g, 7).ok, "kunne avbryte samme avtale to ganger");
  advance(g, 7 * 1440);
  assert(!g.contracts.some((c) => c.agreementId === 7), "avbrutt avtale sendte en ny uke");
});

test("Fagboka (B-234): kort fortalt, korte sider med overskrift, og hvert kapittel i et tema", () => {
  const parts = KNOWLEDGE_PARTS.map((p) => p.id);
  for (const k of KNOWLEDGE) {
    assert(k.short.length > 20 && k.short.length < 160, `«Kort fortalt» mangler eller er for lang: ${k.id}`);
    assert(k.pages.length >= 2 && k.pages.every((p) => p.head && p.text), `sidene mangler overskrift: ${k.id}`);
    assert(
      k.pages.every((p) => p.text.split(/\s+/).length <= 90),
      `en side er for lang: ${k.id}`,
    );
    assert(parts.includes(k.part), `ukjent tema: ${k.id}`);
    assert(!!k.icon, `mangler ikon: ${k.id}`);
    assert(readSeconds(k) <= 90, `kapitlet tar for lang tid å lese: ${k.id}`);
  }
});

test("Quiz ett spørsmål om gangen (B-234): svaret står fast, og quizen kan ikke tas om", () => {
  const g = newGame(234);
  const q = QUIZ.start;
  const wrong = (i: number) => (q[i].correct + 1) % q[i].options.length;
  const fp = g.researchPoints;
  // Første svar feil: lagres med én gang
  assert(!answerQuizQuestion(g, "start", 0, wrong(0)).right, "feil svar ble regnet som riktig");
  assert(g.quizPartial.start?.length === 1, "svaret ble ikke lagret");
  // Kan ikke svare på nytt på samme spørsmål, eller hoppe over
  answerQuizQuestion(g, "start", 0, q[0].correct);
  answerQuizQuestion(g, "start", 5, 0);
  assert(g.quizPartial.start.length === 1 && g.quizPartial.start[0] === wrong(0), "svaret kunne endres");
  // Lagres og lastes på nytt midt i quizen (som å lukke boka)
  const loaded = parseSave(JSON.stringify(g))!;
  assert(loaded.quizPartial.start?.[0] === wrong(0), "påbegynt quiz ble ikke lagret");
  let r = answerQuizQuestion(loaded, "start", 1, q[1].correct);
  for (let i = 2; i < q.length; i++) r = answerQuizQuestion(loaded, "start", i, q[i].correct);
  assert(r.right && r.done !== null, "quizen ble ikke rettet etter siste svar");
  assert(r.done!.correct === q.length - 1, `feil antall riktige: ${r.done!.correct}`);
  assert(r.done!.reward === Math.floor((quizReward(loaded) * (q.length - 1)) / q.length), "feil fagpoeng");
  assert(loaded.researchPoints === fp + r.done!.reward, "fagpoengene ble ikke gitt");
  assert(!quizAvailable(loaded, "start") && !loaded.quizPartial.start, "quizen kan tas om igjen");
  // En gammel lagring uten feltet får en tom liste
  const old = JSON.parse(JSON.stringify(g));
  delete old.quizPartial;
  assert(!!parseSave(JSON.stringify(old))?.quizPartial, "gammel lagring fikk ikke quizPartial");
});

test("Mesterskap (B-237): prisen følger hvor mye prosjektet er verdt, og verdien per døgn kan regnes ut", () => {
  const b = (id: MasteryId) => MASTERY[id].base;
  assert(
    b("pris") > b("skrap") && b("skrap") > b("foring") && b("foring") > b("strom") && b("datterverk") === b("strom"),
    "prisene følger ikke verdien",
  );
  const g = newGame(2371);
  g.history.push({
    ...structuredClone(g.today),
    day: 1,
    income: { kontrakt: 100e6 },
    costs: { energi: 10e6, skrap: 50e6, vedlikehold: 5e6 },
  } as never);
  const v = (id: MasteryId) => masteryGainPerDay(g, id);
  assert(Math.abs(v("pris") - 100e6 * 0.01) < 1, `feil verdi for priser: ${v("pris")}`);
  assert(Math.abs(v("strom") - 10e6 * 0.015) < 1, `feil verdi for strøm: ${v("strom")}`);
  assert(v("datterverk") === 0, "administrasjon uten storverk skulle gi 0");
  for (const id of MASTERY_IDS) assert(Number.isFinite(v(id)) && v(id) >= 0, `ugyldig verdi: ${id}`);
  // B-328: «Konsernledelse» gir lavere administrasjon på storverket, ikke mer utbytte
  g.stage = 4;
  const admin = adminPerDay(computePlantStats(g));
  assert(Math.abs(v("datterverk") - admin * masteryEffect("datterverk", 1)) < 1, `datterverk ${v("datterverk")}`);
});

test("Sene leveranser (B-240): en ny kontrakt med kort frist som skyver en annen for sent, er ikke trygg", () => {
  const g = newGame(240);
  g.pendingDecision = null;
  g.agreements = [];
  const base = { delivered: 0, pricePerT: 1, offerExpiresMin: 0, repGain: 0, repLoss: 0, penaltyPerT: 0 };
  const more = { status: "aktiv" as const, closedDay: null, acceptedDay: day(g), product: "emne" as const };
  g.contracts = [
    { ...base, ...more, id: 1, customer: "Eldre", grade: "enkel", tonnes: 4000, deadlineDay: day(g) + 4, priority: 1 },
  ];
  const extra = [{ t: 2000, deadline: day(g) + 1, product: "emne" as const, customer: "Ny" }];
  // Uten planlegger går den nye bakerst i køen og skyver ingen
  assert(queueFit(g, 1000, extra).pushesLate === null, "skjøv en kontrakt uten planlegger");
  // Med planlegger som sorterer etter frist går den nye foran, og den eldre rekker ikke lenger
  g.specialists = { ...g.specialists, sen: g.minute + 100_000 };
  const fit = queueFit(g, 1000, extra);
  assert(fit.pushesLate === "Eldre" && fit.worst > 1, `ble ikke oppdaget: ${fit.pushesLate}, ${fit.worst}`);
  assert(queueFit(g, 1000, [{ ...extra[0], t: 500 }]).pushesLate === null, "en liten kontrakt regnes som for mye");
  const stats = computePlantStats(g);
  const offer = {
    ...g.contracts[0],
    id: 2,
    customer: "Ny",
    tonnes: 2000,
    deadlineDay: day(g) + 1,
    status: "tilbud" as const,
  };
  g.history = [0, 1, 2].map((d) => ({ ...structuredClone(g.today), day: d, producedT: 1000 }));
  g.contracts[0].tonnes = Math.round(realisticDailyT(g, stats) * 4.5);
  const check = assessOffer(g, stats, offer);
  assert(check.tight && check.pushesLate === "Eldre", `Salg sa trygg: tight ${check.tight}, ${check.pushesLate}`);
});

test("Valseverket får emner først (B-240), også når en stor emneordre står foran armeringen i køen", () => {
  const g = newGame(2401);
  g.stage = 4;
  g.owned.push("valseverk", "ovn2", "ovn3", "streng2", "streng3");
  g.furnaceCount = 3;
  g.furnaceType = "likestrom420";
  g.castingType = "streng8";
  g.settings.rolling = true;
  g.workers = [];
  for (const [role, n] of Object.entries(crewPerShift(g)) as [RoleId, number][])
    for (let i = 0; i < n * 5; i++) g.workers.push(makeCandidate(g, role));
  g.pendingDecision = null;
  g.agreements = [];
  const a = { c: 0.1, p: 0.01, tramp: 0.1 };
  g.lots = [
    {
      id: 1,
      product: "emne",
      t: 3000,
      analysis: a,
      known: a,
      measured: { c: true, p: true, tramp: true },
      second: false,
      madeDay: day(g),
    },
  ];
  const base = { delivered: 0, pricePerT: 1, deadlineDay: day(g) + 5, offerExpiresMin: 0, repGain: 0, repLoss: 0 };
  const more = { penaltyPerT: 0, status: "aktiv" as const, closedDay: null, acceptedDay: day(g) };
  g.contracts = [
    { ...base, ...more, id: 1, customer: "Emner", product: "emne", grade: "enkel", tonnes: 50_000, priority: 1 },
    { ...base, ...more, id: 2, customer: "Armering", product: "armering", grade: "enkel", tonnes: 1_000, priority: 2 },
  ];
  advance(g, 30);
  const rebar = g.lots.filter((l) => l.product === "armering").reduce((t, l) => t + l.t, 0) + g.contracts[1].delivered;
  assert(rebar > 0, "valseverket sto fordi emneordren foran tok alle emnene");
});

test("Ovnene fordeles etter hva som haster (B-240): alle lager kvaliteten som ellers kommer for sent", () => {
  const g = newGame(2402);
  g.stage = 4;
  g.owned.push("ovn2", "ovn3", "streng2", "streng3");
  g.furnaceCount = 3;
  while (g.furnaces.length < 3) g.furnaces.push(structuredClone(g.furnaces[0]));
  g.researched.push("ordreplan");
  g.settings.followQueue = true;
  g.settings.splitGrades = true;
  g.workers = [];
  for (const [role, n] of Object.entries(crewPerShift(g)) as [RoleId, number][])
    for (let i = 0; i < n * 5; i++) g.workers.push(makeCandidate(g, role));
  g.pendingDecision = null;
  g.agreements = [];
  g.lots = [];
  const perDay = realisticDailyT(g, computePlantStats(g));
  const base = { delivered: 0, pricePerT: 1, offerExpiresMin: 0, repGain: 0, repLoss: 0, penaltyPerT: 0 };
  const more = { status: "aktiv" as const, closedDay: null, acceptedDay: day(g), product: "emne" as const };
  const setQueue = (urgentT: number, days: number) => {
    // Partiene fra forrige runde skal ikke dekke den nye køen, og et hendelseskort skal ikke stoppe tida
    g.lots = [];
    g.pendingDecision = null;
    g.contracts = [
      {
        ...base,
        ...more,
        id: 1,
        customer: "Haster",
        grade: "enkel",
        tonnes: urgentT,
        deadlineDay: day(g) + days,
        priority: 1,
      },
      {
        ...base,
        ...more,
        id: 2,
        customer: "Senere",
        grade: "standard",
        tonnes: 500,
        deadlineDay: day(g) + 10,
        priority: 2,
      },
    ];
    advance(g, 60);
    return g.furnaces.map((f) => f.grade);
  };
  const urgent = setQueue(Math.round(perDay * 1.5), 1);
  assert(
    urgent.slice(1).every((x) => x === null),
    `ovn 2 og 3 lagde neste kvalitet selv om den første haster: ${urgent}`,
  );
  const calm = setQueue(Math.round(perDay * 1.5), 9);
  assert(
    calm.slice(1).some((x) => x === "standard"),
    `ingen ovn tok neste kvalitet når det var tid nok: ${calm}`,
  );
});

test("Markedet metter seg (B-252, B-305, B-308): full pris opp til 3 000 t i døgnet, lavere snittpris over, enda lavere over 20 000", () => {
  assert(marketSaturation(733) === 1 && marketSaturation(3_000) === 1, "små verk får lavere pris");
  // (3 000 + 7 000 × 0,5) / 10 000 = 0,65; (3 000 + 17 000 × 0,5) / 20 000 = 0,575 (B-310)
  assert(Math.abs(marketSaturation(10_000) - 0.65) < 1e-9, `faktor ${marketSaturation(10_000)} for 10 000 t`);
  assert(Math.abs(marketSaturation(20_000) - 0.575) < 1e-9, `faktor ${marketSaturation(20_000)} for 20 000 t`);
  const big = marketSaturation(34_721);
  // (3 000 + 17 000 × 0,5 + 14 721 × 0,45) / 34 721 = 0,522
  assert(big > 0.515 && big < 0.53, `faktor ${big} for 35 000 t i døgnet`);
  // Mer produksjon gir fortsatt mer omsetning totalt, bare mindre per tonn
  assert(34_721 * big > 20_000 * marketSaturation(20_000), "mer produksjon gir mindre omsetning");
  assert(marketSaturation(20_000) > big, "prisen faller ikke med mengden");
});

test("Toppen av hjemmeverket (B-305): salgsbonusene stopper på +25 %, og administrasjonen følger kapasiteten fra storverket", () => {
  const g = newGame(305);
  g.stage = 4;
  g.reputation = 100;
  g.owned.push("salgskontor", "havn", "vakuum");
  g.researched.push("kundepleie", "eksport", "produktutvikling", "gronnstal");
  for (let i = 0; i < 4; i++) g.workers.push({ ...g.workers[0], id: 900 + i, role: "selger" as never });
  const st = computePlantStats(g);
  assert(Math.abs(st.priceBonus - PRICE_BONUS_MAX) < 1e-9, `prisbonus ${st.priceBonus}`);
  // Administrasjonen: 250 kr per tonn døgnkapasitet over 5 000 t, bare på storverket – et nytt storverk merker ingenting
  assert(
    st.dailyProductT < ADMIN_FREE_T && adminPerDay(st) === 0,
    `administrasjon på et nytt storverk: ${adminPerDay(st)}`,
  );
  assert(adminPerDay({ stage: STAGES[3], dailyProductT: 20_000 }) === 0, "administrasjon før storverket");
  assert(adminPerDay({ stage: STAGES[4], dailyProductT: 31_000 }) === 13_000_000, "13 mill. på 31 000 t");
  assert(
    Math.abs(adminPerDay({ stage: STAGES[4], dailyProductT: 8_300 }) - ADMIN_PER_CAP_T * 3_300) < 1e-6,
    "1,65 mill. på 8 300 t",
  );
  // Stormodellene har dyrere forbruk (elektroder, ildfast, legeringer) enn 90-tonneren
  const cons = (id: string) => FURNACES.find((f) => f.id === id)!.consumablesPerT;
  assert(cons("lysbue90") === 180 && cons("lysbue150") >= 350 && cons("likestrom420") >= 400, "forbruk på toppen");
});

test("Trender i markedet (B-255): starter og slutter, drar forespørsler mot det som er ettertraktet, og gir bedre pris", () => {
  // Ingen trender i garasjen
  const g0 = newGame(255);
  assert(
    updateTrend(g0, 50, ["emne", "armering"], ["enkel", "standard"]) === null && !g0.market.trend,
    "trend i garasjen",
  );
  // Fra verkstedet: starter når pausen er over, varer noen døgn, og slutter med en beskjed
  const g = newGame(2551);
  g.stage = 1;
  g.market.nextTrendDay = 10;
  assert(updateTrend(g, 9, ["blokk"], ["enkel", "standard"]) === null, "startet før pausen var over");
  const start = updateTrend(g, 10, ["blokk"], ["enkel", "standard"]);
  const t = g.market.trend!;
  assert(start && t && t.untilDay >= 16 && t.untilDay <= 22, `start: ${start}, ${JSON.stringify(t)}`);
  assert(t.kind === "kvalitet", "trend på en vare verket bare lager én av");
  assert(/Etterspørselen etter/.test(start!), start!);
  const end = updateTrend(g, t.untilDay, ["blokk"], ["enkel", "standard"]);
  assert(end && !g.market.trend && (g.market.nextTrendDay ?? 0) > t.untilDay, `slutt: ${end}`);
  // Prisen: 12 % mer når det er ettertraktet, 10 % mindre når det er lite etterspurt, ellers uendret
  g.market.trend = { kind: "kvalitet", id: "standard", up: true, fromDay: 0, untilDay: 999 };
  assert(trendPriceFactor(g, "blokk", "standard") === TREND.priceUp, "pris opp");
  assert(trendPriceFactor(g, "blokk", "enkel") === 1, "pris på en annen kvalitet");
  // Forespørslene dras mot det som er ettertraktet (sammenlignet med uten trend, samme frø)
  const share = (trend: boolean) => {
    const h = newGame(2552);
    h.pendingDecision = null;
    h.market.trend = trend ? { kind: "kvalitet", id: "enkel", up: true, fromDay: 0, untilDay: 999 } : null;
    const stats = computePlantStats(h);
    let hit = 0;
    let n = 0;
    let tagged = 0;
    for (let i = 0; i < 200; i++) {
      h.contracts = [];
      extraOffer(h, stats);
      const c = h.contracts[0];
      if (!c) continue;
      n++;
      if (c.grade === "enkel") hit++;
      if (c.trend) tagged++;
    }
    return { share: hit / Math.max(1, n), tagged, n };
  };
  const without = share(false);
  const withTrend = share(true);
  assert(withTrend.share > without.share + 0.1, `andel ${without.share} uten, ${withTrend.share} med trend`);
  assert(without.tagged === 0 && withTrend.tagged > 0, `merket: ${without.tagged} / ${withTrend.tagged}`);
});

test("Vedlikehold i alt (B-256): bare vedlikehold og havarier telles, og gamle lagringer starter på 0", () => {
  const g = newGame(256);
  const cash = g.cash;
  addCost(g, "vedlikehold", 40_000);
  addCost(g, "skrap", 90_000);
  addCost(g, "vedlikehold", -5);
  assert(g.totals.maintKr === 40_000, `vedlikehold ${g.totals.maintKr}`);
  assert(g.cash === cash - 130_000, "kassa");
  const old = JSON.parse(JSON.stringify(g));
  delete old.totals.maintKr;
  assert(parseSave(JSON.stringify(old))?.totals.maintKr === 0, "gammel lagring");
});

test("Utslipp (B-263): for lite renseanlegg og havari gir bot; stopp gir ingen bot; to linjer renser halvparten", () => {
  const g = newGame(263);
  g.stage = 3;
  g.reputation = 50;
  const base = computePlantStats(g);
  // Én ovn på 90 t og 60 min: 83,7 t i timen mot 1 000 t i døgnet (41,7 t i timen)
  const stats = { ...base, units: [{ ...base.units[0], sizeT: 90, cycleMin: 60 }], meltTph: 83.7 };
  const heat = () => (g.furnaces[0].heat = { sizeT: 90 } as unknown as GameState["furnaces"][0]["heat"]);
  heat();
  // Uten renseanlegg (små ovner): ingen utslippsregnskap
  updateEmissions(g, stats, 60);
  assert(g.env.excessT === 0, "utslipp talt uten renseanlegg");
  g.owned.push("renseanlegg");
  updateEmissions(g, stats, 60);
  const over = 83.7 - 1000 / 24;
  assert(Math.abs(g.env.excessT - over) < 0.01, `for lite anlegg: ${g.env.excessT}`);
  const cash = g.cash;
  g.minute += 1440;
  envDay(g);
  const fine = Math.round(over * FINE_PER_T + 25_000);
  assert(Math.abs(cash - g.cash - fine) <= 1, `bot ${cash - g.cash}, ventet ${fine}`);
  assert(g.reputation === 49 && g.env.lastFine?.kr === fine && g.env.excessT === 0, "omdømme og siste bot");
  // Havari første gang: kortet spør, og ovnene stopper mens det står (ingen bot)
  envBreakdown(g, stats);
  assert(g.pendingDecision?.id === "rensehavari", "kortet kom ikke");
  resolveDecision(g, 0);
  assert(g.env.onBreakdown === "stopp", "valget ble ikke lagret");
  g.furnaces[0].heat = null;
  assert(envStartBlocked(g, stats, 0) !== null, "ovnen startet mens renseanlegget sto");
  heat();
  updateEmissions(g, stats, 60);
  assert(g.env.excessT === 0, "bot selv om ovnene stoppet");
  // Kjør videre: alt går urenset ut, dobbel bot
  g.env.onBreakdown = "kjor";
  assert(envStartBlocked(g, stats, 0) === null, "ovnen ble stoppet selv om spilleren valgte å kjøre");
  updateEmissions(g, stats, 60);
  assert(Math.abs(g.env.downT - 83.7) < 0.01, `utslipp under havari ${g.env.downT}`);
  const cash2 = g.cash;
  g.minute += 1440;
  envDay(g);
  assert(Math.abs(cash2 - g.cash - (83.7 * FINE_PER_T * DOWN_FINE_FACTOR + 25_000)) <= 1, "dobbel bot");
  // Neste havari: ikke noe kort, valget gjelder
  g.env.downUntilMin = 0;
  envBreakdown(g, stats);
  assert(!g.pendingDecision && g.env.downUntilMin > g.minute, "kortet kom igjen");
  // To linjer: halvparten renses mens den ene står
  g.owned.push("rense2", "rense3");
  g.env.onBreakdown = "stopp";
  const big = { ...stats, meltTph: 83.7 };
  g.furnaces[0].heat = null;
  const half = CLEANERS.find((c) => c.id === "rense3")!.tpd / 48;
  assert(half > 83.7 && envStartBlocked(g, big, 0) === null, "ovnen fikk ikke gå på den andre linjen");
});

test("Utslipp (B-263): gamle lagringer får renseanlegg som holder for ovnene de har", () => {
  const g = newGame(2631);
  g.stage = 4;
  g.owned.push("renseanlegg");
  const old = JSON.parse(JSON.stringify(g));
  delete old.env;
  const m = parseSave(JSON.stringify(old))!;
  assert(m.env.grant === true && m.env.onBreakdown === null, "standardverdi");
  const base = computePlantStats(m);
  const stats = { ...base, units: [{ ...base.units[0], sizeT: 90, cycleMin: 60 }], meltTph: 250 };
  updateEmissions(m, stats, 1);
  assert(["rense2", "rense3"].every((id) => m.owned.includes(id)) && !m.owned.includes("rense4"), `fikk ${m.owned}`);
  assert(!m.env.grant && m.env.excessT === 0, "overgangen ga bot");
});

test("Vinter (B-265, B-272): dag 1 er april, 120 døgn vinter fra midten av november, og da skjer uhell oftere", () => {
  const g = newGame(265);
  assert(monthOf(1) === 3 && monthOf(240) === 10 && monthOf(241) === 11, "månedene");
  // 15. november er dag 225, 14. mars er dag 344 (B-272)
  assert(!isWinter(g, 224) && isWinter(g, 225) && isWinter(g, 344) && !isWinter(g, 345), "vinteren");
  assert(isWinter(g, 225 + 360) && !isWinter(g, 345 + 360), "neste vinter");
  let n = 0;
  for (let d = 1; d <= 360; d++) if (isWinter(g, d)) n++;
  assert(n === 120 && WINTER_DAYS === 120, `vinteren varer ${n} døgn`);
  g.stage = 3;
  g.minute = 100 * 1440;
  const summer = explosionChance(g, 60);
  assert(riskFactor(g) === 1 && summer > 0, "sommer");
  g.minute = 250 * 1440;
  assert(riskFactor(g) === WINTER_RISK, "risikoen om vinteren");
  assert(Math.abs(explosionChance(g, 60) - summer * WINTER_EXPLOSION) < 1e-12, "eksplosjoner om vinteren");
  g.owned.push("skrapterminal");
  assert(explosionChance(g, 60) < summer * WINTER_EXPLOSION, "skrap under tak hjelper ikke");
  g.stage = 0;
  assert(explosionChance(g, 60) === 0, "eksplosjon i garasjen");
});

test("Dødsulykke (B-265): en ansatt omkommer, verket stenges i tre døgn, stor bot og tap", () => {
  const g = newGame(2651);
  g.stage = 3;
  g.reputation = 60;
  g.morale = 80;
  for (let i = 0; i < 4; i++) g.workers.push(makeCandidate(g, "ovn"));
  const before = g.workers.length;
  const cash = g.cash;
  fatalAccident(g, "en eksplosjon i ovn 1");
  assert(g.workers.length === before - 1, "ingen omkom");
  assert(
    g.furnaces.every((f) => f.downUntilMin >= g.minute + FATAL_DOWN_DAYS * 1440),
    "verket ble ikke stengt",
  );
  assert(g.castDownUntilMin >= g.minute + FATAL_DOWN_DAYS * 1440, "støpingen ble ikke stengt");
  assert(g.cash <= cash - 20_000_000 && g.reputation === 35 && g.morale === 45, "følgene");
  assert(g.pendingDecision?.id === "dodsulykke", "kortet kom ikke");
  resolveDecision(g, 0);
  // Uten ansatte skjer ingenting (eieren alene i garasjen)
  const alone = newGame(2652);
  alone.workers = [];
  fatalAccident(alone, "test");
  assert(!alone.pendingDecision && alone.furnaces[0].downUntilMin === 0, "ulykke uten ansatte");
});

test("Nestenulykke (B-266): kommer ikke igjen på samme nivå når verneutstyret er kjøpt", () => {
  const g = newGame(266);
  g.stage = 2;
  const d = makeDecision(g, "nestenulykke")!;
  assert(!!d, "kortet kom ikke");
  g.pendingDecision = { ...d, resumeSpeed: 1 };
  resolveDecision(g, 0);
  assert(makeDecision(g, "nestenulykke") === null, "kortet kom igjen på samme nivå");
  g.stage = 3;
  assert(makeDecision(g, "nestenulykke") !== null, "kortet kommer aldri igjen, heller ikke på et større verk");
});

test("Skiftlederen gir bonus (B-271): bare når valget er på, en skiftleder er på jobb og kassa har god råd", () => {
  const g = newGame(271);
  g.stage = 3;
  for (let i = 0; i < 3; i++) g.workers.push(makeCandidate(g, "ovn"));
  g.minute = 60 * 1440;
  g.lastBonusDay = 1;
  g.morale = 55;
  g.cash = 1e9;
  assert(!leaderBonusDue(g), "bonus uten skiftleder");
  g.workers.push(makeCandidate(g, "skiftleder"));
  assert(!leaderBonusDue(g), "bonus uten at valget er på");
  g.settings.leaderBonus = true;
  assert(leaderBonusDue(g), "ingen bonus når det er lenge siden og trivselen synker");
  leaderBonus(g);
  assert(g.morale === 70 && g.lastBonusDay === day(g), "bonusen ble ikke gitt");
  assert(!leaderBonusDue(g), "bonus to ganger samme uke");
  g.minute += 8 * 1440;
  g.morale = 90;
  assert(!leaderBonusDue(g), "bonus når trivselen er høy");
  g.morale = 30;
  g.cash = 0;
  assert(!leaderBonusDue(g), "bonus uten penger");
});

test("Planleggeren holder valgt mengde skrap på lager (B-271)", () => {
  const g = newGame(2711);
  g.stage = 3;
  g.contracts = g.contracts.filter((c) => c.status !== "aktiv");
  for (const id of Object.keys(g.scrap) as (keyof typeof g.scrap)[]) g.scrap[id].t = 0;
  g.cash = 1e9;
  const stats = computePlantStats(g);
  g.settings.autoBuyTargetT = Math.round(stats.yardT * 0.5);
  autoBuy(g, stats, { credit: false, cap: null });
  const total = Object.values(g.scrap).reduce((a, x) => a + x.t, 0);
  assert(Math.abs(total - g.settings.autoBuyTargetT) <= g.settings.autoBuyTargetT * 0.05, `på lager ${total}`);
});

test("Støpingen (B-273): bytter kvalitet med én gang når køen er full eller ingen ovn lager den gamle snart", () => {
  const g = newGame(273);
  g.stage = 4;
  g.owned.push("streng1", "oseovn", "ovn2", "ovn3");
  g.castingType = CASTINGS.find((c) => c.continuous && c.stage <= 4)!.id;
  const ladle = (grade: GradeId) => ({
    t: 30,
    grade,
    analysis: { c: 0.1, p: 0.01, tramp: 0.1 },
    expected: { c: 0.1, p: 0.01, tramp: 0.1 },
    tempOff: false,
    manual: false,
    queuedMin: g.minute,
  });
  g.minute = 10 * 1440;
  g.lastCast = { grade: "standard", min: g.minute - 5 };
  for (const f of g.furnaces) {
    f.heat = null;
    f.holding = null;
  }
  // Ingen ovn lager standard: bytt nå, med overgang
  g.castQueue = [ladle("armering")];
  g.castProgressT = 0;
  advance(g, 1);
  assert(!g.castWait?.startsWith("Venter med"), `ventet uten grunn: ${g.castWait}`);
  // En ovn blir ferdig med standard om 10 minutter og køen har plass: vent
  const h = newGame(2731);
  Object.assign(h, { stage: 4, castingType: g.castingType, owned: [...g.owned] });
  h.minute = 10 * 1440;
  h.lastCast = { grade: "standard", min: h.minute - 5 };
  h.castQueue = [ladle("armering")];
  h.castProgressT = 0;
  for (const f of h.furnaces) {
    f.heat = null;
    f.holding = null;
  }
  h.furnaces[0].heat = {
    ...ladle("standard"),
    startMin: h.minute - 40,
    endMin: h.minute + 10,
    sizeT: 30,
    liquidT: 28,
    radioactive: false,
    energyKwh: 0,
  } as unknown as GameState["furnaces"][0]["heat"];
  advance(h, 1);
  assert(!!h.castWait?.startsWith("Venter med"), `ventet ikke på chargen som snart er ferdig: ${h.castWait}`);
});

test("Tak over skraplageret, større ferdiglager og salg av alt ledig stål (B-274)", () => {
  const g = newGame(274);
  g.stage = 3;
  const bare = explosionChance(g, 60);
  g.owned.push("skraptak");
  assert(Math.abs(explosionChance(g, 60) - bare * 0.4) < 1e-12, "taket gir ikke færre eksplosjoner");
  const store = computePlantStats(g).storeT;
  g.owned.push("ferdiglager1", "ferdiglager2");
  assert(Math.abs(computePlantStats(g).storeT - store * 2.25) < 1e-6, "ferdiglageret ble ikke større");
  // Salg: bare det ingen kontrakt venter på
  g.contracts = g.contracts.filter((c) => c.status !== "aktiv");
  g.lots = [
    {
      id: 1,
      product: "emne",
      t: 120,
      grade: "standard",
      known: { c: 0.2, p: 0.01, tramp: 0.1 },
      analysis: { c: 0.2, p: 0.01, tramp: 0.1 },
      measured: true,
      madeDay: 1,
    } as unknown as GameState["lots"][0],
  ];
  assert(Math.abs(freeStockT(g) - 120) < 1e-6, `ledig ${freeStockT(g)}`);
  const cash = g.cash;
  assert(sellAllFree(g).ok && g.lots.length === 0 && g.cash > cash, "solgte ikke");
  assert(!sellAllFree(g).ok, "solgte fra et tomt lager");
});

test("Vinter (B-279): dyrere strøm, og snøstorm stenger veien for skrapbilene – ikke for skrapterminalen", () => {
  const g = newGame(279);
  g.stage = 2;
  g.cash = 10_000_000;
  // Samme klokkeslett sommer og vinter
  const summerMin = 100 * 1440 + 600;
  const winterMin = 250 * 1440 + 600;
  const ratio = spotPowerPrice(g, winterMin) / spotPowerPrice(g, summerMin);
  assert(Math.abs(ratio - WINTER_POWER) < 1e-9, `spot vinter/sommer ${ratio}`);
  g.minute = summerMin;
  const fixedSummer = fixedPowerOffer(g);
  g.minute = winterMin;
  assert(Math.abs(fixedPowerOffer(g) / fixedSummer - WINTER_FIXED) < 1e-9, "fastprisen om vinteren");
  assert(WINTER_FIXED < WINTER_POWER, "fastprisen skal beskytte mot vinterprisen");
  // Snøstorm: kjøp stoppes, og går igjen når veien er brøytet
  g.snowUntilMin = g.minute + 300;
  assert(scrapBlocked(g), "veien er ikke stengt");
  const t = g.scrap.tungt.t;
  const r = buyScrap(g, "tungt", 5);
  assert(!r.ok && r.message.includes("snøstorm") && g.scrap.tungt.t === t, `kjøpte under snøstorm: ${r.message}`);
  // Heller ingen skraphandler med et billig parti mens veien er stengt (B-289)
  assert(makeDecision(g, "billigparti") === null, "billig skrapparti under snøstorm");
  g.owned.push("skrapterminal");
  assert(!scrapBlocked(g) && buyScrap(g, "tungt", 5).ok, "skrapterminalen får ikke skrap under snøstorm");
  g.owned = g.owned.filter((id) => id !== "skrapterminal");
  g.minute = g.snowUntilMin;
  assert(!scrapBlocked(g) && buyScrap(g, "tungt", 5).ok, "veien ble ikke åpnet igjen");
});

test("Hendelseskort (B-284): minst tre minutter ekte tid mellom to kort, uansett fart", () => {
  let now = 6_000_000_000_000;
  setRealClock(() => now);
  const g = newGame(284);
  g.stage = 3;
  const count = (days: number) => {
    let n = 0;
    for (let d = 0; d < days; d++) {
      g.minute += 1440;
      g.pendingDecision = null;
      maybeCreateDecision(g);
      if (g.pendingDecision) n++;
    }
    return n;
  };
  // Klokka står stille (som mange spilldøgn på kort tid): bare ett kort
  assert(count(200) === 1, "flere kort uten at ekte tid gikk");
  now += ANY_CARD_REAL_MS - 1000;
  assert(count(50) === 0, "kort før pausen var over");
  now += 2000;
  assert(count(50) === 1, "ingen kort etter pausen");
  setRealClock(() => Date.now());
});

test("Sesongpynt (B-287): bare i sin sesong og med konto, beholdes etterpå, stigen gir sesongens pynt", () => {
  const g = newGame(287);
  g.researchPoints = 1000;
  const s1 = { season: 1, account: true };
  const nordlys = COSMETIC_BY_ID.nordlys;
  assert(cosmeticBlocked(g, "nordlys", { season: 1, account: false }) === "account", "sesongpynt uten konto");
  assert(cosmeticBlocked(g, "nordlys") === "over" && !buyCosmetic(g, "nordlys"), "sesongpynt uten sesong");
  assert(!cosmeticListed(g, nordlys, { season: 2, account: true }), "pynt fra en sesong som er over, vises");
  assert(cosmeticListed(g, nordlys, { season: 1, account: false }), "sesongens pynt vises ikke uten konto");
  assert(buyCosmetic(g, "nordlys", s1) && g.researchPoints === 940, "kjøp i sesongen virket ikke");
  // Neste sesong: pynten er din, og står fortsatt i lista
  assert(cosmeticListed(g, nordlys, { season: 2, account: true }) && cosmeticOn(g, "nordlys"), "pynten forsvant");
  // Pipa: gull og kobber kan ikke være på samtidig
  buyCosmetic(g, "kobberpipe", s1);
  g.cosmetics.owned.push("gullpipe");
  setCosmetic(g, "gullpipe", true);
  assert(cosmeticOn(g, "gullpipe") && !cosmeticOn(g, "kobberpipe"), "to piper på samtidig");
  // Stigen: pynten hører til sesongen; en sesong uten egen pynt gir bare fagpoeng
  assert(trackCosmetic(10, 1)?.id === "sesongflagg" && trackCosmetic(10, 3) === null, "stigepynt i feil sesong");
  // Sesong 2 har sin egen pynt (B-291): fem trinn på stigen og tre i butikken, som ikke vises i sesong 1
  assert(
    [10, 20, 30, 40, 50].every((t) => trackCosmetic(t, 2)?.season === 2) && trackCosmetic(10, 2)?.id !== "sesongflagg",
    "sesong 2 mangler stigepynt",
  );
  const s2 = COSMETICS.filter((c) => c.season === 2 && !c.seasonTier);
  assert(s2.length === 3 && s2.every((c) => !cosmeticListed(g, c, s1)), "sesong 2-pynt vises i sesong 1");
  assert(
    COSMETICS.every((c) => !c.season || c.icon),
    "sesongpynt uten ikon",
  );
});

test("Forespørsler som passet, men gikk ut (B-292): råd etter to, borte når du signerer", () => {
  const g = newGame(292);
  g.tutorial = null;
  g.pendingDecision = null;
  g.settings.pauseOffers = true;
  const offers = g.contracts.filter((c) => c.status === "tilbud");
  assert(offers.length >= 2, `for få forespørsler (${offers.length})`);
  const tips = () => hints(g, computePlantStats(g)).filter((t) => t.text.includes("gikk ut uten svar"));
  // Små og med god tid: de passer verket
  for (const c of offers) Object.assign(c, { tonnes: 0.1, deadlineDay: day(g) + 20, offerExpiresMin: g.minute + 30 });
  const keep = { ...offers[0], id: 99_292, offerExpiresMin: g.minute + 5000 };
  g.contracts.push(keep);
  advance(g, 60);
  assert((g.missedOffers ?? []).length === offers.length, `talte ${g.missedOffers?.length} av ${offers.length}`);
  assert(tips().length === 1 && tips()[0].view === "salg", "ingen råd om forespørsler som gikk ut");
  acceptContract(g, keep.id);
  assert(!(g.missedOffers ?? []).length && tips().length === 0, "rådet ble stående etter en signert kontrakt");
});

test("Salgsdirektøren lot den gå (B-312): ikke «passet verket» og ikke rådet når direktøren er på", () => {
  const g = newGame(312);
  g.tutorial = null;
  g.pendingDecision = null;
  g.settings.pauseOffers = true;
  g.konsern.unlocked = true;
  g.konsern.director = { hiredDay: day(g), contracts: 0, agreements: 0, agreementsOn: false, active: true, level: 0 };
  const stats = computePlantStats(g);
  const offers = g.contracts.filter((c) => c.status === "tilbud");
  assert(offers.length >= 2, `for få forespørsler (${offers.length})`);
  // Passer «grønn» på Salg (60 % av tida med 0,8 × kapasiteten), men ikke direktøren (0,6 × kapasiteten, 70 % av tida)
  const days = 21;
  const t = 0.6 * days * 0.8 * stats.dailyProductT;
  for (const c of offers)
    Object.assign(c, { tonnes: t / offers.length, deadlineDay: day(g) + days - 1, offerExpiresMin: g.minute + 30 });
  const before = g.log.length;
  advance(g, 60);
  assert(!(g.missedOffers ?? []).length, `forespørslene ble talt som forsømt (${g.missedOffers?.length})`);
  const texts = g.log.slice(before).map((l) => l.text);
  assert(
    texts.some((x) => x.startsWith("Salgsdirektøren lot forespørselen")),
    `ingen forklaring fra direktøren: ${texts.join(" | ")}`,
  );
  assert(!texts.some((x) => x.includes("selv om den passet verket")), "sa fortsatt «selv om den passet verket»");
  assert(!hints(g, computePlantStats(g)).some((h) => h.text.includes("gikk ut uten svar")), "rådet vises med direktør");
  // Én ovn om gangen på et verk med flere ovner gir et råd (B-312)
  g.furnaces.push({ ...g.furnaces[0], heat: null, waitReason: "Venter: bare én ovn smelter om gangen" });
  const tip = hints(g, computePlantStats(g)).find((h) => h.text.startsWith("Bare én ovn smelter om gangen"));
  assert(tip && tip.view === "marked" && tip.sub === "strom", "ingen råd om én ovn om gangen");
});

test("Poengmålene i kontrollrommet kan nås (B-293): den flinke testspilleren klarer toppen i minst hver femte runde", () => {
  const mix = { c: 0.3, p: 0.03, tramp: 0.2 };
  const scores: number[] = [];
  for (const grade of ["standard", "lavkarbon", "premium", "hoykarbon"] as const)
    for (let n = 1; n <= 12; n++) {
      let x = n * 9301 + grade.length * 49297;
      const rnd = () => (x = (x * 9301 + 49297) % 233280) / 233280;
      const req = {
        furnace: 0,
        sizeT: 40,
        grade,
        mix,
        expectedMix: mix,
        energyFactor: 1,
        metallicYield: 0.92,
        radioactive: false,
        resumeSpeed: 1,
        dephos: 0.62,
        kwhPerT: 420,
        cycleMin: 60,
      };
      scores.push(autoPlay(new ChargeGame(req, rnd), "flink").score.points);
    }
  const share = (t: number) => scores.filter((v) => v >= t).length / scores.length;
  const top = Math.max(...CHALLENGES.filter((c) => c.family === "u-kontroll").map((c) => c.goal));
  const g = newGame(293);
  const ach = Math.max(...ACHIEVEMENTS.filter((a) => a.family === "poeng").map((a) => a.progress(g)[1]));
  assert(share(top) >= 0.2, `utfordringen ${top} nås i bare ${Math.round(share(top) * 100)} % av rundene`);
  assert(share(ach) >= 0.2, `prestasjonen ${ach} nås i bare ${Math.round(share(ach) * 100)} % av rundene`);
});

test("Prestasjonene for forskning kan nås (B-294): ingen krever flere prosjekter enn det finnes", () => {
  const g = newGame(294);
  const most = Math.max(...ACHIEVEMENTS.filter((a) => a.family === "forsk").map((a) => a.progress(g)[1]));
  assert(most <= RESEARCH.length, `prestasjonen krever ${most}, men det finnes bare ${RESEARCH.length} prosjekter`);
});

test("Æresmerket for økonomireformen (B-296): gis fra serveren, skjult for alle andre", () => {
  const g = newGame(296);
  assert(!visibleAchievements(g).some((a) => a.id === "reform"), "merket vises for en som ikke har det");
  assert(!visibleFamilies(g).some((f) => f.id === "reform"), "serien vises for en som ikke har den");
  const fp = g.researchPoints;
  assert(applyServerBadges(g, ["reform"]) && hasAchievement(g, "reform"), "merket ble ikke gitt");
  assert(g.researchPoints === fp + 25, "fagpoengene for merket ble ikke gitt");
  assert(
    visibleAchievements(g).some((a) => a.id === "reform"),
    "merket vises ikke for den som har det",
  );
  assert(!applyServerBadges(g, ["reform"]), "samme merke ble gitt to ganger");
  // Serveren er fasit (B-312): et merke den har trukket, tas bort igjen med prestasjonen – fagpoengene står
  assert(applyServerBadges(g, ["reform2"]), "endringen ble ikke meldt");
  assert(!hasAchievement(g, "reform") && hasAchievement(g, "reform2"), "feil merke ble ikke tatt bort");
  assert(!(g.serverBadges ?? []).includes("reform"), "serverBadges beholdt det trukne merket");
  assert(g.researchPoints === fp + 50, "fagpoengene skulle stå");
  assert(!visibleFamilies(g).some((f) => f.id === "reform"), "serien vises fortsatt etter at merket er trukket");
  // Tom liste fra serveren tar bort alt
  assert(applyServerBadges(g, []) && !hasAchievement(g, "reform2"), "tom liste tok ikke bort merket");
  assert(!applyServerBadges(g, []), "ingen endring skal gi false");
  // Et gammelt spill uten feltet
  const old = newGame(297) as unknown as Record<string, unknown>;
  delete old.serverBadges;
  assert(Array.isArray(parseSave(JSON.stringify(old))!.serverBadges), "migrate ga ikke serverBadges");
});

test("Fellesferie (B-298): kort en uke før, sommerstans med vedlikehold og flyttede frister", () => {
  const g = newGame(298);
  g.tutorial = null;
  g.stage = 2;
  g.cash = 1e8;
  g.settings.pauseOffers = true;
  for (let i = 0; i < 6; i++) g.workers.push({ ...makeCandidate(g, "ovn"), hiredDay: 1 });
  // Dag 97 er 7. juli
  assert(inSummerBreak(97) && !inSummerBreak(96) && inSummerBreak(117) && !inSummerBreak(118), "feil dager for ferien");
  const toDay = (d: number) => {
    g.minute = (d - 1) * MIN_PER_DAY - 1;
    advance(g, 2);
  };
  const card = (): string | undefined => g.pendingDecision?.id;
  toDay(89);
  assert(card() !== "fellesferie", "kortet kom for tidlig");
  g.pendingDecision = null;
  toDay(90);
  assert(card() === "fellesferie", `ingen kort en uke før (${card()})`);
  resolveDecision(g, 0);
  assert(g.summer?.choice === "stans" && g.summer.year === yearOf(97), "valget ble ikke lagret");
  g.furnaces[0].wear = 0.7;
  const c = { ...g.contracts[0], id: 99_298, status: "aktiv" as const, deadlineDay: 100, tonnes: 5, delivered: 0 };
  g.contracts.push(c);
  g.pendingDecision = null;
  toDay(97);
  const f = g.furnaces[0];
  assert(f.downReason?.includes("sommerstans") === true && f.downUntilMin === 117 * MIN_PER_DAY, "ovnene står ikke");
  assert(f.wear === 0, "ovnen fikk ikke ny foring");
  assert(g.contracts.find((x) => x.id === 99_298)!.deadlineDay === 100 + SUMMER.days, "fristen ble ikke flyttet");
  assert(!(g.today.costs.lonn ?? 0), "lønn under sommerstansen");
  g.pendingDecision = null;
  toDay(118);
  assert(g.furnaces[0].downUntilMin <= g.minute, "ovnene står etter ferien");
  assert((g.today.costs.lonn ?? 0) > 0, "ingen lønn etter ferien");
});

test("Fellesferie (B-298): sommervikarer gir dyrere lønn og flere uhell; ubesvart kort gir vikarer", () => {
  const g = newGame(2981);
  g.tutorial = null;
  g.stage = 2;
  g.cash = 1e8;
  g.settings.pauseOffers = true;
  for (let i = 0; i < 6; i++) g.workers.push({ ...makeCandidate(g, "ovn"), hiredDay: 1 });
  g.minute = 96 * MIN_PER_DAY - 1;
  g.pendingDecision = null;
  advance(g, 2);
  assert(g.summer?.choice === "vikarer", "ubesvart kort ga ikke vikarer");
  const stats = computePlantStats(g);
  assert(
    Math.abs((g.today.costs.lonn ?? 0) - stats.salaryPerDay * (1 + SUMMER.tempExtra)) < 1,
    "vikarlønna stemmer ikke",
  );
  assert(Math.abs(riskFactor(g) - SUMMER.tempRisk) < 1e-9, "vikarene gir ikke flere uhell");
  assert(
    g.furnaces.every((f) => !f.downReason?.includes("sommerstans")),
    "ovnene står med vikarer",
  );
});

test("Ferie (B-298): 40 % sjeldnere, ikke i fellesferien, og juleferie heter juleferie", () => {
  assert(isChristmas(266) && isChristmas(271) && !isChristmas(260) && !isChristmas(272), "jula er feil");
  const g = newGame(2982);
  g.tutorial = null;
  g.stage = 2;
  g.settings.pauseOffers = true;
  for (let i = 0; i < 12; i++) g.workers.push({ ...makeCandidate(g, "ovn"), hiredDay: 1 });
  for (const w of g.workers) w.nextVacationDay = 999;
  const w = g.workers[0];
  w.nextVacationDay = 267;
  g.minute = 263 * MIN_PER_DAY - 1;
  g.pendingDecision = null;
  advance(g, 2);
  assert(w.absentReason === "ferie", "fikk ikke ferie");
  assert(
    g.log.some((l) => l.text.includes(w.name) && l.text.includes("juleferie")),
    "står ikke juleferie",
  );
  assert(w.nextVacationDay! - 267 >= 167, `neste ferie for tidlig (${w.nextVacationDay})`);
  // Egen ferie i fellesferien flyttes til etter den
  const v = g.workers[1];
  v.nextVacationDay = 100 + YEAR_DAYS;
  g.minute = (97 + YEAR_DAYS - 1) * MIN_PER_DAY - 1;
  g.pendingDecision = null;
  advance(g, 2);
  assert(v.absentReason !== "ferie" && v.nextVacationDay! >= 118 + YEAR_DAYS, "egen ferie i fellesferien");
});

test("Krig i verden (B-297): bare i konsernet, høyst én per år, dyrere strøm og flere forespørsler", () => {
  const g = newGame(297);
  g.tutorial = null;
  const run = (days: number) => {
    const starts: number[] = [];
    for (let d = 1; d <= days; d++) {
      g.minute = (d - 1) * MIN_PER_DAY;
      const before = g.war?.fromDay;
      warDay(g);
      if (g.war && g.war.fromDay !== before) starts.push(d);
    }
    return starts;
  };
  assert(run(3600).length === 0, "krig uten konsern");
  g.konsern.unlocked = true;
  const starts = run(3600);
  const years = starts.map(yearOf);
  assert(starts.length >= 2 && starts.length <= 10, `${starts.length} kriger på ti år`);
  assert(new Set(years).size === years.length, `to kriger samme år (${starts.join(", ")})`);
  const d = starts[0];
  g.minute = (d - 1) * MIN_PER_DAY;
  g.war = { year: yearOf(d), fromDay: d, untilDay: d + 29, strength: 1 };
  const base = computePlantStats({ ...g, war: null }).offersPerDay;
  assert(activeWar(g) !== null, "krigen er ikke i gang");
  assert(Math.abs(warFactor(g, "power") - (1 + WAR.power)) < 1e-9, "strømmen følger ikke krigen");
  assert(
    Math.abs(worldFactor(g, "power") / worldFactor({ ...g, war: null }, "power") - (1 + WAR.power)) < 1e-9,
    "worldFactor uten krig",
  );
  assert(
    Math.abs(computePlantStats(g).offersPerDay / base - (1 + WAR.demand)) < 1e-9,
    "forespørslene følger ikke krigen",
  );
  g.minute = (d + 30 - 1) * MIN_PER_DAY;
  assert(activeWar(g) === null && warFactor(g, "power") === 1, "krigen varte for lenge");
  const end = warDay(g);
  assert(end?.text.startsWith("Krigen er over") === true, "ingen beskjed når krigen er over");
  // Et gammelt spill uten feltene
  const old = newGame(2983) as unknown as Record<string, unknown>;
  delete old.war;
  delete old.summer;
  const back = parseSave(JSON.stringify(old))!;
  assert(back.war === null && back.summer === null, "migrate ga ikke war og summer");
});

test("Neste rammeavtale i «Produksjon nå» (B-316): tid til neste uke, kø og ledig tid", () => {
  const g = newGame(3160);
  g.minute = 10 * MIN_PER_DAY + 600; // dag 11 kl. 10
  assert(nextAgreementWeek(g) === null, "ingen avtale skal gi null");
  const a = (id: number, nextDay: number, product: Agreement["product"] = "emne") =>
    ({
      id,
      customer: "Test",
      product,
      grade: "standard",
      weeklyT: 100,
      pricePerT: 1,
      weeks: 5,
      weeksSent: 1,
      weeksDone: 0,
      weeksMissed: 0,
      nextDay,
      bonusKr: 0,
      bonusRep: 0,
      status: "aktiv",
      offerExpiresMin: 0,
      closedDay: null,
    }) as Agreement;
  g.agreements = [a(1, 14), a(2, 12), { ...a(3, 11), status: "tilbud" }, { ...a(4, 11), weeksSent: 5 }];
  const next = nextAgreementWeek(g)!;
  assert(next.agreement.id === 2, "valgte ikke den nærmeste aktive avtalen med uker igjen");
  assert(next.inMin === 11 * MIN_PER_DAY - g.minute, `feil tid til neste uke: ${next.inMin}`);
  g.agreements.push(a(5, 10));
  assert(nextAgreementWeek(g)!.inMin === 0, "en uke som venter (sommerstans), skal gi 0");
  // Et produkt verket skal slutte med, gir ingen nye uker (B-163)
  g.agreements = [a(6, 12, castingType(g).product)];
  g.pendingCastingSwitch = "annen";
  assert(nextAgreementWeek(g) === null, "avtale på produktet verket slutter med, ble telt");
  g.pendingCastingSwitch = null;
  const stats = computePlantStats(g);
  g.contracts = [];
  assert(queueMinutes(g, { ...stats, dailyProductT: 0 }) === Infinity, "verk som står, skal gi uendelig kø");
  assert(fmtDuration(30) === "under 1 t" && fmtDuration(14 * 60) === "14 t", "fmtDuration under et døgn");
  assert(fmtDuration(29 * 60) === "1 døgn 5 t" && fmtDuration(48 * 60) === "2 døgn", "fmtDuration over et døgn");
  assert(fmtDuration(Infinity) === "–", "fmtDuration uendelig");
});

test("Sommerstans (B-321): salgsdirektøren står, ventende forespørsler får ny frist, avtaler starter etter ferien", () => {
  const g = newGame(321);
  g.tutorial = null;
  g.stage = 2;
  g.cash = 1e8;
  g.settings.pauseOffers = true;
  for (let i = 0; i < 6; i++) g.workers.push({ ...makeCandidate(g, "ovn"), hiredDay: 1 });
  g.minute = 91 * MIN_PER_DAY;
  chooseSummer(g, "stans");
  g.pendingDecision = null;
  const offer = { ...g.contracts[0], id: 99_321, status: "tilbud" as const, deadlineDay: 100, tonnes: 5, delivered: 0 };
  offer.offerExpiresMin = 200 * MIN_PER_DAY;
  g.contracts.push(offer);
  g.minute = 96 * MIN_PER_DAY - 1;
  advance(g, 2);
  assert(summerStopDaysLeft(g) === SUMMER.days, `feil antall døgn igjen: ${summerStopDaysLeft(g)}`);
  const o = g.contracts.find((x) => x.id === 99_321)!;
  assert(
    o.status === "tilbud" && o.deadlineDay === 100 + SUMMER.days,
    `forespørselen fikk ikke ny frist (${o.deadlineDay})`,
  );
  // Salg regner med at ovnene står resten av ferien
  const check = assessOffer(g, computePlantStats(g), o);
  assert(check.days === o.deadlineDay - 97 + 1 - SUMMER.days, `feil antall døgn til fristen (${check.days})`);
  // Salgsdirektøren gjør ingenting i stansen
  g.konsern.director = { hiredDay: 1, contracts: 0, agreements: 0, agreementsOn: true, active: true };
  directorHour(g);
  assert(o.status === "tilbud" && g.konsern.director.contracts === 0, "salgsdirektøren tok en ordre i sommerstansen");
  // En rammeavtale signert i stansen får første uke når ovnene går igjen
  const a = {
    id: 321,
    customer: "Test",
    product: "emne",
    grade: "standard",
    weeklyT: 100,
    pricePerT: 1,
    weeks: 4,
    weeksSent: 0,
    weeksDone: 0,
    weeksMissed: 0,
    nextDay: 0,
    bonusKr: 0,
    bonusRep: 0,
    status: "tilbud",
    offerExpiresMin: g.minute + 2880,
    closedDay: null,
  } as Agreement;
  g.agreements.push(a);
  assert(acceptAgreement(g, 321).ok, "kunne ikke signere");
  assert(a.weeksSent === 0 && a.nextDay === 97 + SUMMER.days, `første uke kom i ferien (nextDay ${a.nextDay})`);
  assert(!g.contracts.some((c) => c.agreementId === 321), "ukeleveranse i køen midt i ferien");
});

test("Konsernet i ekte tid (B-326): priser, køen i rekkefølge, rabatt, bytte og salg som på serveren", () => {
  const H = 3_600_000;
  const t0 = 1_000_000_000_000;
  const w: KonsernWorld = { plants: [], orders: [], nextId: 1, level: 0, floor: 0, balance: 200_000_000 };
  // Storverk krever et verk først; stålverk koster 5 mill. (B-373)
  assert(!placeOrder(w, { kind: "bygg", type: "storverk" }, [], t0).ok, "storverk før første verk");
  const a = placeOrder(w, { kind: "bygg", type: "stalverk" }, [], t0);
  assert(
    a.ok && w.balance === 195_000_000 && w.plants.length === 1 && w.plants[0].project?.kind === "bygg",
    "første kjøp",
  );
  // Neste i køen starter når det forrige er ferdig
  const b = placeOrder(w, { kind: "bygg", type: "storverk" }, [], t0);
  assert(b.ok && b.order.startsAt === t0 + 2 * H && b.order.readyAt === t0 + 8 * H, "tidene i køen");
  const c = placeOrder(w, { kind: "modernisering", plant: 1 }, ["standardverk"], t0);
  assert(
    c.ok && c.order.cost === 1_125_000 && c.order.startsAt === t0 + 8 * H,
    `modernisering ${c.ok && c.order.cost}`,
  );
  const d = placeOrder(w, { kind: "bygg", type: "stalverk" }, [], t0);
  assert(!d.ok && d.reason === "ko_full", "køen tok mer enn tre");
  // Pengene er borte fra kassa med én gang (kan ikke brukes til bud)
  assert(w.balance === 200_000_000 - 5_000_000 - 20_000_000 - 1_125_000, `kassa ${w.balance}`);
  // Bare det siste kan avbestilles, og bare før det har startet
  assert(!cancelOrder(w, b.ok ? b.order.id : 0, t0).ok, "avbestilte et prosjekt midt i køen");
  assert(cancelOrder(w, c.ok ? c.order.id : 0, t0).ok && w.balance === 175_000_000, "avbestilling");
  // Ekte tid: stålverket ferdig etter 2 t, storverket etter 8 t
  const e1 = settleWorld(w, t0 + 3 * H);
  assert(e1.some((e) => e.kind === "ferdig" && e.plant.id === 1) && w.plants.length === 2, "første ble ikke ferdig");
  assert(!!w.plants[1].project && w.orders.length === 1, "storverket startet ikke");
  settleWorld(w, t0 + 9 * H);
  assert(w.plants.every((p) => !p.project) && !w.orders.length, "køen ble ikke tom");
  // Salg: 60 % av pris med trinn; et verk med noe i køen kan ikke selges
  placeOrder(w, { kind: "modernisering", plant: 2 }, [], t0 + 9 * H);
  assert(!sellPlant(w, 2, t0 + 9 * H).ok, "solgte et verk som moderniseres");
  const sold = sellPlant(w, 1, t0 + 9 * H);
  assert(sold.ok && sold.sale === 3_000_000, `salg ${sold.ok && sold.sale}`);
  settleWorld(w, t0 + 20 * H);
  // Oppkjøpsavdelingen: −15 % på kjøp og utbygging
  assert(buildCost("kompleks", ["oppkjop"]) === 51_000_000 && upgradeCostWorld(["oppkjop"]) === 12_750_000, "rabatt");
  // Bytte til kompleks krever Stålfyrste; prisen er komplekset minus salget
  const x: KonsernWorld = { plants: [], orders: [], nextId: 1, level: 2, floor: 0, balance: 250_000_000 };
  for (let i = 1; i <= 10; i++)
    x.plants.push({ id: i, type: "storverk", name: `V${i}`, level: 4, boughtDay: 0, downUntilDay: 0 });
  x.nextId = 11;
  assert(!placeOrder(x, { kind: "bygg", type: "kompleks" }, ["storkonsern"], t0).ok, "kjøpte et ellevte verk");
  const swap = placeOrder(x, { kind: "bytt", plant: 3 }, ["storkonsern"], t0);
  assert(swap.ok && swap.sale === Math.round(20_000_000 * 2.2 * 0.6), "byttet");
  assert(
    x.plants.length === 10 && !x.plants.some((p) => p.id === 3) && x.balance === 250_000_000 + 26_400_000 - 60_000_000,
    `kassa ${x.balance}`,
  );
  // Nivået går aldri under gulvet (titlene ved byttet)
  const y: KonsernWorld = { plants: [], orders: [], nextId: 1, level: 0, floor: 6, balance: 0 };
  settleWorld(y, t0);
  assert(y.level === 6, "gulvet holdt ikke");
});

test("Opptjent nivå (B-383): tittelen med gulvet står, men nye verk, trinn og komplekser følger verkene", () => {
  const t0 = Date.UTC(2026, 9, 1);
  // Som spiller A i dry-run: gulv 6, 12 verk, men verkene gir bare nivå 1 (3 storverk på trinn 3)
  const w: KonsernWorld = { plants: [], orders: [], nextId: 13, level: 6, floor: 6, earned: 1, balance: 1e12 };
  for (let i = 1; i <= 12; i++)
    w.plants.push({
      id: i,
      type: i <= 6 ? "kompleks" : "storverk",
      name: `V${i}`,
      level: i >= 7 && i <= 9 ? 3 : 0,
      boughtDay: 0,
      downUntilDay: 0,
    });
  assert(worldLevel(w) === 6 && earnedLevel(w) === 1, `tittel ${worldLevel(w)}, opptjent ${earnedLevel(w)}`);
  const big = ["storkonsern"];
  const q = (req: OrderRequest) => {
    const r = orderQuote(w, req, big);
    return "refusal" in r ? r.refusal : "ok";
  };
  assert(q({ kind: "bygg", type: "stalverk" }) === "fullt", "13. verk med plass til 8");
  assert(q({ kind: "bytt", plant: 12 }) === "niva", "bytte til kompleks uten opptjent nivå 2");
  assert(q({ kind: "modernisering", plant: 1 }) === "ok", "modernisering under opptjent trinn");
  assert(q({ kind: "modernisering", plant: 7 }) === "ok", "trinn 3 → 4 med opptjent nivå 1");
  w.plants[6].level = 4;
  assert(q({ kind: "modernisering", plant: 7 }) === "trinn", "trinn 4 → 5 uten opptjent nivå 3");
  // Ingenting tas bort: verkene og tittelen står etter et oppgjør
  settleWorld(w, t0);
  assert(w.plants.length === 12 && w.level === 6 && w.earned === 1, "noe ble tatt bort");
  // Opptjent nivå stiger med verkene (6 storverk på trinn 4 = nivå 2) og går aldri ned
  for (const p of w.plants.slice(6)) p.level = 4;
  settleWorld(w, t0);
  assert(w.earned === 2 && earnedLevel(w) === 2, `opptjent ${w.earned}`);
  // Nå kan de bytte, selv om de er over plassene (et bytte legger ikke til et verk), men ikke bygge nr. 13
  assert(q({ kind: "bytt", plant: 12 }) === "ok", "bytte over plassene");
  assert(q({ kind: "bygg", type: "kompleks" }) === "fullt", "13. verk med plass til 10");
  w.plants.forEach((p) => (p.level = 0));
  settleWorld(w, t0);
  assert(w.earned === 2, "opptjent nivå gikk ned");
  // I spillet: grensene følger opptjent nivå, tittelen følger legends
  const g = newGame(383);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.konsern.legends = 6;
  g.konsern.earned = 1;
  assert(titleOf(g) === LEGENDS[5].title, "tittelen forsvant");
  assert(earnedOf(g) === 1 && titleAboveEarned(g), "opptjent nivå i spillet");
  assert(maxSisters(g) === slotsAt(1, false) && modernizeMax(g) === 4 && !kompleksOpen(g), "grensene fulgte tittelen");
  // Gamle lagringer uten feltet får 0, og stigen verkene gir regnes med
  const old = JSON.parse(JSON.stringify(g));
  delete old.konsern.earned;
  assert(parseSave(JSON.stringify(old))!.konsern.earned === 0, "ingen standardverdi");
});

test("Ukens kontrollrom (B-387): samme frø gir samme charge, treningsfrø er andre, og inndataene logges", () => {
  const req = weeklyRequest(weeklyGrade("premium"));
  assert(req.grade === "premium" && weeklyGrade("tull") === "standard", "kvaliteten fra serveren");
  const play = (seed: number) => autoPlay(new ChargeGame(req, seededRandom(seed)), "flink");
  const a1 = play(123456);
  const a2 = play(123456);
  const b = play(654321);
  assert(a1.score.points === a2.score.points, `samme frø ga ${a1.score.points} og ${a2.score.points}`);
  // Ulike frø gir ulike charger (skrapkurvene og slaggklumpene kommer ulikt)
  const g1 = new ChargeGame(req, seededRandom(123456));
  const g2 = new ChargeGame(req, seededRandom(654321));
  assert(g1.carbon !== g2.carbon || g1.tapTemp !== g2.tapTemp, "ulike frø ga samme charge");
  assert(b.score.points > 0, "charge uten poeng");
  // Treningsfrø: innenfor området serverens frø ligger i, og tilfeldige
  const seeds = new Set(Array.from({ length: 50 }, () => trainingSeed()));
  assert(seeds.size > 45 && [...seeds].every((x) => x >= 1 && x < 2147483647), "treningsfrøene");
  // Inndataene: start, hold og tapp logges, med runde og tid, og loggen har tak
  const g = new ChargeGame(req, seededRandom(1));
  autoPlay(g, "flink");
  const acts = new Set(g.inputs.map((x) => x[2]));
  assert(acts.has("s") && acts.has("h") && acts.has("t") && acts.has("r"), `handlinger ${[...acts].join(",")}`);
  assert(
    g.inputs.every((x) => x.length === 4 && x[0] >= 0 && x[0] <= 3),
    "formatet på loggen",
  );
  assert(g.inputs.length <= INPUT_LOG_MAX && JSON.stringify(g.inputs).length < 32_000, "loggen er for stor");
});

// Oppsummeringen står sist, så alle testene over teller med i exit-koden
test("Verdenskartet (B-333): nye verk står der spilleren har færrest, kan velge region, bytte beholder, flytt én gang", () => {
  const g = newGame(333);
  g.stage = 4;
  g.konsern.unlocked = true;
  fund(g);
  // Første verk: ingen verk ennå, så første region i rekkefølgen
  assert(buySister(g, "stalverk").ok, "kjøpet");
  assert(g.konsern.orders[0].region === "nord", `standard ${g.konsern.orders[0].region}`);
  // Valgt region
  assert(localOrder(g, { kind: "bygg", type: "stalverk", region: "oy" }).ok, "kjøp med region");
  assert(g.konsern.orders[1].region === "oy", "valgt region");
  // Neste uten valg: der det er færrest (nord og øyene har ett hver i køen)
  assert(buySister(g, "stalverk").ok, "tredje kjøp");
  assert(g.konsern.orders[2].region === "jern", `tredje ${g.konsern.orders[2].region}`);
  finishProjects(g);
  const first = g.konsern.plants.find((p) => p.region === "nord")!;
  assert(!!first && g.konsern.plants.some((p) => p.region === "oy"), "verket fikk ikke regionen fra bestillingen");
  // Flytt én gang, ikke to
  assert(localMove(g, first.id, "sor").ok, "første flytt");
  assert(plantById(g, first.id).region === "sor" && plantById(g, first.id).moved === true, "flyttet");
  assert(!localMove(g, first.id, "vest").ok && plantById(g, first.id).region === "sor", "flyttet to ganger");
  // Et verk som byttes til kompleks, står der det sto
  g.konsern.legends = 3;
  g.konsern.earned = 3;
  const oy = g.konsern.plants.find((p) => p.region === "oy")!;
  assert(localOrder(g, { kind: "bytt", plant: oy.id }).ok, "bytte");
  const swap = g.konsern.orders.at(-1)!;
  assert(swap.type === "kompleks" && swap.region === "oy", `kompleks i ${swap.region}`);
  // Komplekset bygges nå (køen var tom): flyttes som et verk, én gang
  assert(localMove(g, swap.plantId, "vest").ok && plantById(g, swap.plantId).region === "vest", "flytt under bygging");
  // Står i køen: regionen kan velges fritt til det starter, også flere ganger
  assert(buySister(g, "stalverk").ok && g.konsern.orders.at(-1)!.status === "kø", "i køen");
  const queued = g.konsern.orders.at(-1)!.plantId;
  assert(localMove(g, queued, "ost").ok && localMove(g, queued, "sor").ok, "flytt i køen");
  assert(g.konsern.orders.at(-1)!.region === "sor", "regionen i køen");
});

test("Utbyttepolitikken og Kontroll (B-334): samme tall som serveren, fondet er det kassa får mindre", () => {
  // Faste tall fra dividend_to_treasury i 067 (kjørt mot databasen)
  const near = (a: number, b: number) => Math.abs(a - b) <= 1;
  assert(dividendToTreasury(37e6, 0.3) === 37e6, "30 % endrer ingenting");
  assert(near(dividendToTreasury(37e6, 0.5), 31_270_707), `50 %: ${dividendToTreasury(37e6, 0.5)}`);
  assert(near(dividendToTreasury(37e6, 0.7), 24_222_186), `70 %: ${dividendToTreasury(37e6, 0.7)}`);
  assert(near(dividendToTreasury(8e6, 0.5), 5_714_286), `under belastningen: ${dividendToTreasury(8e6, 0.5)}`);
  const s = policySplit(37e6, "forsvar");
  assert(near(s.kasse + s.fond, 37e6) && s.fond > s.kasse * 0.4, "fondet er det kassa får mindre");
  assert(policySplit(37e6, "ut").fond === 0, "ta ut gir ikke fond");
  // Ordene
  assert(controlWord(80).word === "Sterk" && controlWord(79).word === "God", "sterk/god");
  assert(controlWord(40).word === "Middels" && controlWord(39).word === "Svak", "middels/svak (B-370)");
  // Rådet peker på delen som mangler mest (investering, 25 poeng)
  assert(
    controlAdvice({ eier: 30, aktivitet: 20, investering: 0, region: 2.5, eiertid: 0, fond: 0 }) ===
      "Invester i selskapet (feltet under).",
    "rådet",
  );
  // Valget kan endres én gang per uke
  const now = Date.now();
  assert(policyLockedUntil(null, now) === null && policyLockedUntil(now - 8 * 86_400_000, now) === null, "fritt");
  assert(policyLockedUntil(now - 86_400_000, now) === now + 6 * 86_400_000, "låst i en uke");
});

test("Overtakelser (B-335): angrep og forsvar som på serveren, med tak", () => {
  const V = 436_459_811;
  const near = (a: number, b: number) => Math.abs(a - b) < 0.1;
  // Tallene fra SQL-testen: bud 600 mill., full aktivitet, 2 verk i regionen mot Kontroll 54 og 450 mill. i forsvar
  assert(near(takeoverAttack(600e6, V, 1, 2), 75.35), `angrep ${takeoverAttack(600e6, V, 1, 2)}`);
  assert(near(takeoverDefense(54, 450e6, 0, V), 94.62), `forsvar ${takeoverDefense(54, 450e6, 0, V)}`);
  assert(near(takeoverAttack(V, V, 1, 2), 65), "minstebudet");
  // Taket: budet teller høyst 10 × V (B-337), forsvaret høyst 3 × V, regionen høyst 10, fondet høyst V
  assert(near(takeoverAttack(100 * V, V, 1, 0), 60 * Math.sqrt(10)), "tak på budet");
  assert(near(takeoverDefense(100, 100 * V, 100 * V, V), 100 + 40 * Math.sqrt(3)), "tak på forsvaret");
  // B-337: eieren kan alltid miste selskapet – en aktiv angriper med 10 × V slår det sterkeste forsvaret (SQL: 189,74 mot 169,28)
  assert(takeoverAttack(10 * V, V, 1, 0) > takeoverDefense(100, 100 * V, 100 * V, V), "alltid mulig");
  assert(near(takeoverAttack(V, V, 1, 20) - takeoverAttack(V, V, 1, 0), 10), "tak på regionen");
  assert(near(takeoverDefense(50, 0, 10 * V, V), 90), "tak på fondet");
  // En passiv angriper har halv styrke
  assert(near(takeoverAttack(V, V, 0, 0), 30), "passiv angriper");
});

test("Kontrollen med vanlige ord (B-370): hva som skal til for å ta selskapet, investering og forsvar", () => {
  // Skraplageret 30.9: verdi 471,5 mill., 34,74 mill. investert (serveren: investering 1,8), fond 3,8 mill.
  const V = 471_485_385;
  assert(Math.abs(investPart(34.74e6, V) - 1.78) < 0.01, `investering ${investPart(34.74e6, V)}`);
  // Kontroll 54 og nesten ikke fond: minstebudet (verdien) er nok for en aktiv spiller
  assert(bidToTake(54, 3.8e6, V) === V, `bud ${bidToTake(54, 3.8e6, V)}`);
  // Kontroll 80 uten fond: (80 / 60)² × V
  assert(Math.abs(bidToTake(80, 0, V) - V * (80 / 60) ** 2) < 1, "bud ved 80");
  // Taket: høyst 10 × V
  assert(bidToTake(100, 100 * V, V) <= 10 * V, "tak");
  const ctl = { score: 54, parts: { investering: 1.8 }, invested: 34.74e6, value: V };
  assert(controlAfterInvest(ctl, 0) === 54, "uten investering");
  const after = controlAfterInvest(ctl, 300e6);
  assert(after === Math.round(54 - 1.8 + Math.round(investPart(334.74e6, V) * 10) / 10), `etter ${after}`);
  assert(after >= 64 && after <= 66, `etter 300 mill.: ${after}`);
  // Stegene: det som mangler mest først, fulle deler er ikke med
  const steps = controlSteps({ eier: 30, aktivitet: 20, investering: 1.8, region: 2.5, eiertid: 0, fond: 0 });
  assert(steps[0].key === "investering" && !steps.some((p) => p.key === "aktivitet"), steps.map((p) => p.key).join());
  assert(steps.at(-1)!.key === "eiertid" && steps.some((p) => p.key === "fond"), "eiertid sist, fondet med «Ta ut»");
  const parts = { eier: 30, aktivitet: 20, investering: 1.8, region: 2.5, eiertid: 0, fond: 0 };
  assert(!controlSteps(parts, "balansert").some((p) => p.key === "fond"), "fondet vokser alt");
  // Forsvaret: holder det alt, trengs 0; ellers et beløp som snur det; for sterkt angrep gir null
  assert(defenseNeeded(50, 54, 0, 0, V) === 0, "holder");
  const need = defenseNeeded(70, 54, 0, 0, V)!;
  assert(need > 0 && takeoverDefense(54, need, 0, V) > 70, `forsvar ${need}`);
  assert(defenseNeeded(189, 54, 0, 0, V) === null, "for sterkt");
  // Vernet: tre dager etter at eieren tok over
  const since = "2026-09-29T01:33:03Z";
  const t0 = Date.parse(since);
  assert(protectedUntil(since, t0 + 86_400_000) === t0 + 3 * 86_400_000, "vernet");
  assert(protectedUntil(since, t0 + 4 * 86_400_000) === null && protectedUntil(null, t0) === null, "over");
});

test("Byggetid og innkjøring (B-336): store kjøp bygges i spilltid, ett om gangen, og kjøres inn", () => {
  assert(buildDays(60e6) === 3 && buildDays(220e6) === 4 && buildDays(700e6) === 9 && buildDays(5e9) === 10, "døgnene");
  assert(rampFactor(undefined, 10) === 1 && rampFactor(10, 10) === 0.7 && rampFactor(10, 15) === 1, "innkjøringen");
  assert(
    !isBigPurchase({ kind: "stage", price: 1e9 }) && isBigPurchase({ kind: "addon", price: 5e7 }),
    "hva som er stort",
  );
  const g = newGame(336);
  g.stage = 4;
  g.cash = 50e9;
  g.researched = RESEARCH.map((r) => r.id);
  g.konsern.unlocked = true;
  g.won = true;
  // Kjøp alt det små først (røykgassrensing o.l.), så de store kjøpene åpner seg
  for (let i = 0; i < 60; i++) {
    const small = upgradeOptions(g).find((o) => o.available && o.kind !== "stage" && !isBigPurchase(o));
    if (!small || !buyUpgrade(g, small.id).ok) break;
  }
  const big = upgradeOptions(g).filter((o) => o.available && isBigPurchase(o));
  assert(big.length >= 2, `store kjøp: ${big.length}`);
  const first = big.find((o) => o.kind === "furnace") ?? big[0];
  assert(buyUpgrade(g, first.id).ok && g.bigBuild?.id === first.id, "bygget startet");
  if (first.kind === "furnace") assert(g.furnaces[first.unit ?? 0].downUntilMin >= g.bigBuild!.readyMin, "ovnen står");
  const second = upgradeOptions(g).find((o) => o.id !== first.id && isBigPurchase(o) && !o.owned)!;
  assert(!second.available && (second.reason ?? "").includes("ett stort prosjekt om gangen"), "ett om gangen");
  assert(upgradeOptions(g).find((o) => o.id === first.id)?.building === true, "vises som bygges");
  // Ikke ferdig før tida er ute
  assert(!finishBigBuild(g) && g.bigBuild, "for tidlig");
  g.minute = g.bigBuild!.readyMin;
  assert(finishBigBuild(g) && g.bigBuild === null, "ferdig");
  if (first.kind === "furnace") {
    const f = g.furnaces[first.unit ?? 0];
    assert(f.type === first.baseId && f.rampFromDay !== undefined && f.downUntilMin <= g.minute, "ovnen i drift");
  }
});

test("Nabolaget (B-336): bygges ett om gangen, i rekkefølge, og gir sine fordeler", () => {
  const g = newGame(3361);
  g.cash = 50e9;
  assert(!buildNeighbor(g).ok, "bare på storverket");
  g.stage = 4;
  const normal = moraleNormal(g);
  assert(buildNeighbor(g).ok && g.neighborhood.building?.id === "idrettshall", "første prosjekt");
  assert(!buildNeighbor(g).ok, "ett om gangen");
  g.minute = g.neighborhood.building!.readyMin;
  assert(finishNeighbor(g) && hasNeighbor(g, "idrettshall") && moraleNormal(g) === normal + 5, "idrettshallen");
  // Resten, så konserthuset
  for (let i = 0; i < 5; i++) {
    g.cash = 50e9;
    assert(buildNeighbor(g).ok, `prosjekt ${i + 2}`);
    g.minute = g.neighborhood.building!.readyMin;
    finishNeighbor(g);
  }
  assert(nextNeighbor(g) === null && g.neighborhood.built.length === 6, "alt bygget");
  g.reputation = 72;
  adjustReputation(g, -20);
  assert(g.reputation === 70, `gulvet: ${g.reputation}`);
  g.reputation = 50;
  adjustReputation(g, -10);
  assert(g.reputation === 40, "under gulvet fra før");
});

test("Kassetaket (B-341): det som er betalt ut til eierne, teller mot sluttmålet og stormodellene", () => {
  const g = newGame(341);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.cash = 9_999_500_000;
  checkWin(g);
  assert(!g.won, "uten utbetaling er 9,9995 mrd. ikke nok");
  g.paidOut = { total: 530_000_000, firstDay: 1, today: 0 };
  assert(valueCreated(g) === konsernEquity(g) + 530_000_000, "verdien med utbetalingene");
  checkWin(g);
  assert(g.won, "med utbetalingene er sluttmålet nådd");
  assert(gateBlocker(g, "baron") === null, "sluttmålet åpner stormodellene");
  assert((gateBlocker(g, "magnat") ?? "").includes("25 mrd."), "25 mrd. er ikke nådd");
  g.paidOut.total = 15_100_000_000;
  assert(gateBlocker(g, "magnat") === null, "15,1 mrd. utbetalt + 10 mrd. i kassa åpner de største ovnene");
  // Konsernverdien selv (topplistene) er uendret
  assert(konsernEquity(g) === g.cash - g.loan + konsernValue(g), "konsernverdien uten utbetalinger");
});

test("Konsern-merket (B-342): modernisering av et stålverk som kan bygges ut, teller ikke", () => {
  const g = newGame(342);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.konsern.treasury = { balance: 30_000_000, perDay: 40_000_000 };
  g.konsern.plants = [
    { id: 1, name: "A", type: "stalverk", level: 0, boughtDay: 1, downUntilDay: 0, region: "nord" },
    { id: 2, name: "B", type: "stalverk", level: 0, boughtDay: 1, downUntilDay: 0, region: "vest" },
  ];
  const all = konsernOptions(g);
  assert(
    all.some((o) => o.key === "mod-1" && !o.blocked && o.price <= 30_000_000),
    "moderniseringen finnes og er billig",
  );
  assert(!worthwhileOptions(all).some((o) => o.key.startsWith("mod-")), "men foreslås ikke før utbyggingen");
  const ready = konsernReady(g);
  assert(
    // Med prisene fra B-373 er også utbyggingen (15 mill.) innen rekkevidde; moderniseringen teller fortsatt ikke
    ready === all.filter((o) => /^(kjop|bygg)-/.test(o.key) && !o.blocked && o.price <= 30_000_000).length,
    `merket: ${ready}`,
  );
  assert(!konsernAdvice(g)?.key.startsWith("mod-"), "rådet foreslår ikke moderniseringen");
});

test("Skiftlederen leier ikke vikarer når hele verket står (B-346), men timen før ovnene starter", () => {
  const g = newGame(346);
  g.stage = 3;
  g.workers = [];
  for (const [role, n] of Object.entries(crewPerShift(g)) as [RoleId, number][])
    for (let i = 0; i < n * 3; i++) g.workers.push(makeCandidate(g, role));
  g.workers.push(makeCandidate(g, "skiftleder"));
  g.settings.leaderTemps = true;
  const w = g.workers[0];
  w.absentFrom = g.minute;
  w.absentUntil = g.minute + 5 * 1440;
  w.absentReason = "syk";
  // Alle ovnene står i to døgn (som i sommerstansen eller etter en dødsulykke)
  for (const f of g.furnaces) f.downUntilMin = g.minute + 2 * 1440;
  g.pendingDecision = null;
  advance(g, 60);
  assert(plantRestartMin(g) !== null, "verket står ikke");
  assert(!tempsActive(g), "skiftlederen leide vikarer mens verket sto");
  const cash = g.cash;
  // Ovnene starter om en halvtime: nå leies vikarene inn
  for (const f of g.furnaces) f.downUntilMin = g.minute + 30;
  g.pendingDecision = null;
  advance(g, 60);
  assert(tempsActive(g), "skiftlederen leide ikke vikarer da ovnene skulle i gang");
  assert(g.cash < cash, "vikarene kostet ingenting");
});

test("Banken venter i sommerstansen (B-349): ingen konkurs mens verket står, tellingen starter etter ferien", () => {
  const g = newGame(349);
  g.tutorial = null;
  g.stage = 2;
  g.settings.pauseOffers = true;
  for (let i = 0; i < 6; i++) g.workers.push({ ...makeCandidate(g, "ovn"), hiredDay: 1 });
  g.minute = 91 * MIN_PER_DAY;
  chooseSummer(g, "stans");
  g.pendingDecision = null;
  g.minute = 97 * MIN_PER_DAY;
  g.cash = -creditLimit(g) * 3;
  g.negativeDays = 2;
  for (let d = 0; d < 10; d++) {
    g.pendingDecision = null;
    advance(g, MIN_PER_DAY);
  }
  assert(!g.gameOver, "konkurs i sommerstansen");
  assert(g.negativeDays === 2, `banken telte i stansen (${g.negativeDays})`);
  assert(
    hints(g, computePlantStats(g)).some((h) => h.text.includes("under kredittgrensen")),
    "rådet mangler",
  );
  // Etter ferien teller banken videre
  g.minute = (97 + SUMMER.days + 1) * MIN_PER_DAY;
  g.cash = -creditLimit(g) * 3;
  g.pendingDecision = null;
  advance(g, MIN_PER_DAY);
  assert(g.negativeDays === 3, `banken teller ikke etter ferien (${g.negativeDays})`);
});

test("Kokillene (B-351): slites av støpingen, gir flere gjennombrudd, byttes for hånd og av reparatøren", () => {
  const g = newGame(351);
  g.stage = 3;
  g.owned.push("streng1");
  g.castingType = "streng1";
  let stats = computePlantStats(g);
  assert(hasMoulds(g), "strengstøping uten kokiller");
  assert(mouldWear(g) === 0 && mouldRisk(g) === 1, "nye kokiller skal ikke gi ekstra risiko");
  // Et døgns full støping sliter en tjuedel
  wearMoulds(g, stats.castTph * 24, stats);
  assert(Math.abs(mouldWear(g) - 1 / MOULD.lifeDays) < 1e-9, `slitasje etter ett døgn: ${mouldWear(g)}`);
  g.mould = { wear: 1, lastDay: 1 };
  assert(Math.abs(mouldRisk(g) - 1.75) < 1e-9, `risiko ved 100 %: ${mouldRisk(g)}`);
  assert(
    hints(g, stats).some((h) => h.text.includes("Kokillene")),
    "rådet om kokillene mangler",
  );
  const cash = g.cash;
  const r = replaceMoulds(g, stats);
  assert(r.ok && mouldWear(g) === 0, "byttet ikke kokillene");
  assert(g.cash === cash - mouldCost(g), "feil pris");
  assert(g.castDownUntilMin > g.minute, "støpingen sto ikke under byttet");
  // Reparatøren bytter når han bytter foringen
  g.mould = { wear: MOULD.autoAt + 0.01, lastDay: 1 };
  g.castDownUntilMin = 0;
  g.settings.autoReline = true;
  g.researched.push("vedlikeholdsplan");
  g.workers.push(makeCandidate(g, "vedlikehold"));
  stats = computePlantStats(g);
  mouldHour(g, stats);
  assert(mouldWear(g) === 0, "reparatøren byttet ikke kokillene");
  // Blokkstøping har ingen kokiller å slite på her
  const b = newGame(3511);
  wearMoulds(b, 100, computePlantStats(b));
  assert(!hasMoulds(b) && mouldWear(b) === 0, "blokkstøping fikk kokillesslitasje");
});

test("Dagens oppdrag «verdi» (B-352): utbetalt til eierne teller, så det kan gjøres med kassa på taket", () => {
  const g = newGame(352);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.paidOut = { total: 5_000_000_000, firstDay: 1, today: 0 };
  g.daily = { date: "2026-09-29", claimed: false, missions: [] };
  startMissionDay(g, "2026-09-30", false);
  g.daily.missions = [{ id: "verdi", base: valueCreated(g), target: 1_000_000_000, v: 2 }];
  const m = g.daily.missions[0];
  // Kassa står på taket: overskuddet betales ut, og konsernverdien står stille
  g.paidOut.total += 1_000_000_000;
  assert(missionDone(g, m), `oppdraget ble ikke gjort (${missionProgress(g, m)})`);
  // Et oppdrag startet før endringen får utbetalingen lagt til startverdien, så det ikke blir gjort av seg selv
  g.daily.missions = [{ id: "verdi", base: konsernEquity(g), target: 1_000_000_000 }];
  migrate(g);
  assert(
    missionProgress(g, g.daily.missions[0]) === 0,
    `gammelt oppdrag gjort av seg selv (${missionProgress(g, g.daily.missions[0])})`,
  );
});

test("Like partier på lageret slås sammen (B-353): færre partier, samme tonn og samme kvaliteter", () => {
  const g = newGame(353);
  g.minute = 400 * MIN_PER_DAY;
  g.lots = [];
  const a = { c: 0.2, p: 0.01, tramp: 0.1 };
  const measured = { c: true, p: true, tramp: true };
  for (let i = 0; i < 300; i++) {
    const x = { c: a.c + (i % 7) * 0.001, p: a.p, tramp: a.tramp };
    g.lots.push({
      id: i + 1,
      product: "armering",
      t: 10,
      analysis: x,
      known: x,
      measured,
      second: false,
      madeDay: 100 + i,
    });
  }
  // Et parti fra i dag og et annenrangs parti skal stå for seg
  g.lots.push({ id: 900, product: "armering", t: 5, analysis: a, known: a, measured, second: false, madeDay: 401 });
  g.lots.push({ id: 901, product: "armering", t: 5, analysis: a, known: a, measured, second: true, madeDay: 150 });
  const before = g.lots.reduce((s, l) => s + l.t, 0);
  const grades = satisfiedGrades(g.lots[0].known).join(",");
  compactLots(g);
  const after = g.lots.reduce((s, l) => s + l.t, 0);
  assert(g.lots.length === 3, `partier etter sammenslåing: ${g.lots.length}`);
  assert(Math.abs(before - after) < 1e-6, "tonn forsvant");
  assert(satisfiedGrades(g.lots[0].known).join(",") === grades, "kvalitetene endret seg");
  assert(
    g.lots[0].madeDay === 100 && g.lots.some((l) => l.id === 900) && g.lots.some((l) => l.second),
    "feil parti slått sammen",
  );
});

test("Lærlinger teller ikke i drifta før fagbrevet (B-357)", () => {
  const g = newGame(81);
  g.stage = 2;
  for (let i = 0; i < 4; i++) g.workers.push({ ...makeCandidate(g, "allround"), hiredDay: 1 });
  const before = wildUse(g).total;
  const crewsBefore = staffing(g, true).crews;
  g.pendingDecision = { id: "laerling", title: "", text: "", options: [{ label: "Ja" }], data: {}, resumeSpeed: 1 };
  resolveDecision(g, 0);
  const a = g.workers.find((x) => x.apprenticeUntil !== undefined)!;
  assert(a && a.role === "allround", "ingen lærling");
  assert(wildUse(g).total === before, `lærlingen telte som avløser: ${before} → ${wildUse(g).total}`);
  assert(staffing(g, true).crews === crewsBefore, "lærlingen ga flere skiftlag");
  assert(!presentNow(g).includes(a) && !dutyWorkers(g).includes(a), "lærlingen står på skiftet");
  // Med fagbrev teller den som vanlig
  g.minute = APPRENTICE_DAYS * 1440;
  a.skill = 2;
  apprenticeExams(g);
  assert(a.apprenticeUntil === undefined && wildUse(g).total === before + 1, "fagarbeideren teller ikke");
});

test("Alder og pensjon (B-357): søkere 20–59, lærlinger unge, beskjed en måned før, pensjon på dagen", () => {
  const g = newGame(82);
  g.stage = 2;
  const today = day(g);
  for (let i = 0; i < 200; i++) {
    const c = makeCandidate(g);
    const age = ageOf(c, today);
    assert(age >= PENSION.candidateAge[0] && age < PENSION.candidateAge[1], `søker ${age} år`);
    const r = retireAgeOf(c);
    assert(r >= PENSION.earliest && r <= PENSION.age, `pensjonsalder ${r}`);
  }
  g.pendingDecision = { id: "laerling", title: "", text: "", options: [{ label: "Ja" }], data: {}, resumeSpeed: 1 };
  resolveDecision(g, 0);
  const a = g.workers.find((x) => x.apprenticeUntil !== undefined)!;
  assert(ageOf(a, today) >= 17 && ageOf(a, today) <= 19, `lærling ${ageOf(a, today)} år`);
  // En ovnsoperatør som går av om 30 døgn
  const w = { ...makeCandidate(g, "ovn"), hiredDay: 1, retireAge: 67 };
  w.born = today + 30 - 67 * YEAR_DAYS;
  g.workers.push(w);
  pensionMorning(g);
  assert(w.pensionNotice && g.workers.includes(w), "ingen beskjed en måned før");
  assert(
    g.log.some((l) => l.text.includes("pensjon om 30 døgn")),
    "beskjeden står ikke i loggen",
  );
  assert(pensionSoon(w, today) === 30, `pensjon om ${pensionSoon(w, today)}`);
  g.minute += 29 * 1440;
  pensionMorning(g);
  assert(g.workers.includes(w), "gikk av for tidlig");
  g.minute += 1440;
  pensionMorning(g);
  assert(!g.workers.includes(w), "gikk ikke av med pensjon");
  assert(
    g.log.some((l) => l.text.includes("går av med pensjon, 67 år")),
    "ingen avskjed i loggen",
  );
  // Den erfarne pensjonisten jobber til 70
  const d = makeDecision(g, "pensjonist");
  if (d) {
    g.pendingDecision = { ...d, resumeSpeed: 1 };
    resolveDecision(g, 0);
    const back = g.workers.find((x) => x.retireAge === PENSION.returneeRetire);
    assert(back && ageOf(back, day(g)) >= 63 && ageOf(back, day(g)) <= 66, "pensjonisten har feil alder");
  }
  // Lagrede spill fra før: alle får en alder, og ingen går av det første året
  const old = JSON.parse(JSON.stringify(g));
  for (const x of old.workers) delete x.born;
  for (const x of old.candidates) delete x.born;
  old.workers.push({
    ...old.workers[0],
    id: 4242,
    name: "Gammel Lærling (lærling)",
    apprenticeUntil: 90,
    born: undefined,
  });
  const m = parseSave(JSON.stringify(old))!;
  const now = day(m);
  for (const x of [...m.workers, ...m.candidates]) {
    assert(x.born !== undefined, `${x.name} fikk ingen alder`);
    if (x.retireAge) continue;
    const age = ageOf(x, now);
    assert(age >= (x.apprenticeUntil !== undefined ? 17 : 22) && age <= 59, `${x.name} er ${age} år`);
    assert(pensionDay(x) - now > YEAR_DAYS, `${x.name} går av det første året`);
  }
  // Samme alder hver gang spillet lastes
  const again = parseSave(JSON.stringify(old))!;
  assert(
    again.workers.every((x, i) => x.born === m.workers[i].born),
    "alderen endret seg ved ny lasting",
  );
});

test("Døgnregnskapet i hele tall (B-358): nye døgn og eldre lagringer", () => {
  const r = roundDay({
    day: 3,
    kwh: 8783932.647,
    peakMW: 98.5234,
    costs: { nett: 1594093.52 },
    list: [0.123456, 1234.5],
  });
  assert(r.kwh === 8783933 && r.peakMW === 98.52 && r.costs.nett === 1594094, `rundet ${JSON.stringify(r)}`);
  assert(r.list[0] === 0.12 && r.list[1] === 1235 && r.day === 3, "lister og små tall");
  const g = newGame(83);
  g.history = [{ ...structuredClone(g.today), day: 1, kwh: 1234.567, cashEnd: 99.999 }];
  const m = parseSave(JSON.stringify(g))!;
  assert(
    m.history[0].kwh === 1235 && m.history[0].cashEnd === 100,
    `migrert ${m.history[0].kwh} ${m.history[0].cashEnd}`,
  );
});

test("Oppkjøp: eieren får dagene hen mister og det hen investerte, høyst 85 % av budet (B-375)", () => {
  // Samme tall som `select takeover_payout(...)` på serveren (087)
  const b = { perDay: 15e6, daysLeft: 10, investedKasse: 20e6, investedFond: 0 };
  let r = buyoutPay(154e6, b);
  assert(r.kasse === 130_900_000 && r.fond === 0, `taket ${JSON.stringify(r)}`);
  r = buyoutPay(1e9, { ...b, investedFond: 10e6 });
  assert(r.kasse === 167_000_000 && r.fond === 8_500_000, `stort bud ${JSON.stringify(r)}`);
  r = buyoutPay(100e6, { ...b, investedKasse: 0, investedFond: 10e6 });
  assert(r.kasse === 85_000_000 && r.fond === 0, `fondet innenfor taket ${JSON.stringify(r)}`);
  assert(buyoutMax(b) === 167_000_000, "mest mulig");
  // Et svært høyt bud gir ikke mer: penger kan ikke flyttes mellom spillere med oppkjøp
  assert(buyoutPay(10e9, b).kasse === buyoutPay(1e9, b).kasse, "budet over erstatningen forsvinner");
});

if (failed) {
  console.log(`\n${failed} test(er) feilet`);
  process.exitCode = 1;
} else {
  console.log("\nAlle tester OK");
}
