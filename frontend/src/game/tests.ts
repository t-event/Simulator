/**
 * Små, raske tester av spillmotoren (B-097). Kjøres med `npx tsx src/game/tests.ts` og i CI.
 * Hver test bygger sin egen tilstand, så de ikke er avhengige av lagrede filer.
 */
import {
  buyMastery,
  doResearch,
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
import { MASTERY, masteryCost, masteryEffect, masteryOpen } from "./mastery";
import {
  ACHIEVEMENT_BY_ID,
  ACHIEVEMENTS,
  achievementsDone,
  checkAchievements,
  hasAchievement,
  nextInFamily,
} from "./achievements";
import {
  buyCosmetic,
  cosmeticBlocked,
  cosmeticOn,
  FACADE,
  facadeColors,
  grantCosmetic,
  setCosmetic,
  trackCosmetic,
} from "./cosmetics";
import { CHALLENGES, checkChallenges, currentChallenge } from "./challenges";
import { ADDONS, CASTINGS, FURNACES, STAGES, WIN_CASH } from "./data";
import {
  advance,
  assessOffer,
  agreementCancelCost,
  cancelAgreement,
  checkWin,
  completeManual,
  fmtKr,
  log,
  makeCandidate,
  newGame,
  oftenSick,
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
  pickMissions,
  missionBonus,
  startMissionDay,
  STREAK_REWARDS,
  streakReward,
} from "./daily";
import { applyWorldEvents, canJoinDirectly, joinSeason, SEASON_BONUS_FP, worldFactor, applySeasonTwist } from "./world";
import { dealPrice, energyPrice, productPrice } from "./plant";
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
} from "./engine";
import {
  buySister,
  checkKonsernMilestones,
  checkLegends,
  kompleksOpen,
  LEGENDS,
  modernizeMax,
  titleOf,
  WIN_TITLE,
  directorPerDay,
  maxSisters,
  sisterPrice,
  checkKonsernUnlock,
  konsernAdvice,
  directorLevel,
  nextDirectorUpgrade,
  upgradeDirector,
  konsernOptions,
  SISTER_NAMES,
  upgradeSister,
  DIRECTOR_HIRE,
  DIRECTOR_PER_DAY,
  directorHour,
  fireDirector,
  hireDirector,
  KONSERN_UNLOCK_EQUITY,
  konsernDay,
  konsernCosts,
  konsernEquity,
  konsernNetFor,
  dividends,
  modernizeSister,
  SISTER_TYPES,
  sisterProfit,
  BUILD_HOURS,
  sisterValue,
  FLAGSHIP_MAX,
  flagshipBonus,
  MODERNIZE_HOURS,
  underConstruction,
  finishKonsernProjects,
  realNow,
  setRealClock,
} from "./konsern";
import {
  bonusGap,
  day,
  computePlantStats,
  gradeRecipe,
  liftMorale,
  moraleNormal,
  productCapT,
  supportAdvice,
} from "./plant";
import { RESEARCH, researchOptions } from "./research";
import { parseSave } from "./save";
import { makeDecision, maybeCreateDecision, resolveDecision, SAME_CARD_REAL_MS } from "./decisions";
import { landmarkContract, landmarkHour } from "./landmarks";
import {
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
  tempsActive,
  MAX_CREWS,
  specMargin,
  staffing,
  wildcardUse,
} from "./plant";
import { answerQuizQuestion, QUIZ, quizAvailable, quizReward } from "./quiz";
import { GRADES } from "./data";
import type { Agreement, Analysis, Contract, GameState, ManualRequest, RoleId } from "./types";
import { autoPlay, ChargeGame } from "../ui/control/chargeGame";
import { applyCashCap, CASH_RESERVE, reserveDayLog, reserveTotal } from "./reserve";

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
  assert(!buySister(g, "storverk").ok, "storverk kjøpt før et stålverk");
  assert(buySister(g, "stalverk").ok, "stålverket ble ikke kjøpt");
  const price = SISTER_TYPES.stalverk.price;
  assert(g.cash === 2_000_000_000 - price, "feil pris");
  // Et nytt verk er verdt det det koster (B-121): konsernverdien går ikke ned ved kjøpet
  assert(Math.abs(konsernEquity(g) - 2_000_000_000) < 1, `konsernverdien endret seg ved kjøpet: ${konsernEquity(g)}`);
  finishProjects(g);
  const p = g.konsern.plants[0];
  const before = sisterProfit(g, p);
  assert(modernizeSister(g, p.id).ok && sisterProfit(g, p) === before, "moderniseringen virket før den var ferdig");
  finishProjects(g);
  assert(sisterProfit(g, p) > before, "moderniseringen ga ikke mer overskudd");
  const income = g.today.income.konsern ?? 0;
  p.downUntilDay = 0;
  for (let i = 0; i < 20; i++) konsernDay(g);
  assert((g.today.income.konsern ?? 0) > income, "datterverket ga ikke overskudd");
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
  assert(konsernAdvice(g)?.key === "kjop-stalverk", `første råd: ${konsernAdvice(g)?.key}`);
  const storverk = konsernOptions(g).find((o) => o.key === "kjop-storverk")!;
  assert(!!storverk.blocked, "storverk kunne kjøpes før et stålverk");
  buySister(g, "stalverk");
  assert(g.konsern.plants[0].name === SISTER_NAMES[0], "datterverket fikk ikke navn");
  assert(!konsernOptions(g).find((o) => o.key === "kjop-storverk")!.blocked, "storverk sperret etter stålverk");
  // Seks stålverk: fullt, men et stålverk kan bygges ut til storverk
  for (let i = 0; i < 5; i++) buySister(g, "stalverk");
  assert(!!konsernOptions(g).find((o) => o.key === "kjop-storverk")!.blocked, "kunne kjøpe et sjuende verk");
  finishProjects(g);
  const p = g.konsern.plants[0];
  const before = sisterProfit(g, p);
  assert(upgradeSister(g, p.id).ok && p.type === "stalverk", "utbyggingen var ferdig med én gang");
  finishProjects(g);
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
  assert(g.researchPoints === fp - 3 * masteryCost("pris", 0), "trakk feil antall fagpoeng");
  assert(productPrice(g, "armering", null) > price * 1.009, "stålprisen gikk ikke opp");
  assert(scrapPrice(g, "blandet") < scrap && energyPrice(g) < power, "skrap eller strøm ble ikke billigere");
  // Hvert nivå koster mer og gir mindre, men aldri over maks
  assert(masteryCost("pris", 5) > masteryCost("pris", 4), "prisen stiger ikke");
  const gain = (l: number) => masteryEffect("pris", l + 1) - masteryEffect("pris", l);
  assert(gain(10) < gain(1) && masteryEffect("pris", 500) <= MASTERY.pris.max, "gevinsten avtar ikke");
  g.researchPoints = 0;
  assert(!buyMastery(g, "datterverk").ok, "kunne kjøpe uten fagpoeng");
});

test("Stålmilepæler (B-150): titler etter sluttmålet, fagpoeng, flere verk og høyere modernisering", () => {
  const g = newGame(61);
  g.stage = 4;
  g.konsern.unlocked = true;
  g.won = false;
  g.cash = 30_000_000_000;
  checkLegends(g);
  assert(g.konsern.legends === 0 && titleOf(g) === null, "titler før sluttmålet");
  g.won = true;
  assert(titleOf(g) === WIN_TITLE, "mangler tittelen for sluttmålet");
  const fp = g.researchPoints;
  const sisters = maxSisters(g);
  checkLegends(g);
  assert(g.konsern.legends === 1 && titleOf(g) === LEGENDS[0].title, `fikk ${titleOf(g)}`);
  assert(g.researchPoints === fp + LEGENDS[0].fp && g.legendCelebrate === 0, "fagpoeng eller feiring mangler");
  assert(modernizeMax(g) === 4 && maxSisters(g) === sisters && !kompleksOpen(g), "Stålmagnat ga feil opplåsing");
  checkLegends(g);
  assert(g.konsern.legends === 1, "samme milepæl to ganger");
  g.cash = 120_000_000_000;
  checkLegends(g);
  assert(g.konsern.legends === 3 && titleOf(g) === "Stålkonge", `fikk ${titleOf(g)}`);
  assert(modernizeMax(g) === 5 && maxSisters(g) === sisters + 2 && kompleksOpen(g), "opplåsingen stemmer ikke");
  assert(buySister(g, "kompleks").ok && g.konsern.plants.some((p) => p.type === "kompleks"), "kjøp av kompleks");
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
    trackCosmetic(10)?.id === "sesongflagg" && trackCosmetic(50)?.id === "pokal" && !trackCosmetic(11),
    "pynt på feil trinn",
  );
  assert(cosmeticBlocked(g, "pokal") === "season", "stigepynt kunne kjøpes");
  grantCosmetic(g, "pokal");
  assert(g.cosmetics.owned.includes("pokal") && g.cosmetics.on.includes("pokal"), "pynten ble ikke gitt");
  g.stage = 4;
  g.konsern.unlocked = true;
  g.won = true;
  const before = maxSisters(g);
  g.cash = 6_000_000_000_000;
  checkLegends(g);
  assert(titleOf(g) === "Stålgigant" && maxSisters(g) === before + 6, `tittel ${titleOf(g)}, plass ${maxSisters(g)}`);
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
  g.cash = 100_000_000_000;
  while (g.konsern.plants.length < maxSisters(g)) assert(buySister(g, "stalverk").ok, "kjøp av stålverk");
  finishProjects(g);
  assert(!!konsernOptions(g).find((o) => o.key === "kjop-kompleks")!.blocked, "kompleks ikke sperret når fullt");
  // Med trimmen i B-209 kan modernisering av et stålverk betale seg litt raskere enn byttet, så rådet kan være begge
  const advice = konsernOptions(g).find((o) => o.key.startsWith("bytt-"));
  assert(!!advice && !advice.blocked, "ikke noe valg om å bytte til kompleks");
  assert(!!konsernAdvice(g), "ingen råd når konsernet er fullt");
  const n = g.konsern.plants.length;
  g.cash = 1_000_000;
  assert(!advice!.run(g).ok && g.konsern.plants.length === n, "solgte uten råd til komplekset");
  g.cash = 100_000_000_000;
  assert(advice!.run(g).ok, "byttet feilet");
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

test("Konsernøkonomien (B-181): driften står, utbyttet avtar nedover, kostnadene øker, og flere verk gir mer", () => {
  const g = newGame(81);
  g.stage = 4;
  g.konsern.unlocked = true;
  const plant = (id: number, level = 5) =>
    ({ id, type: "kompleks", name: `Verk ${id}`, level, boughtDay: 0, downUntilDay: 0 }) as const;
  // Et verk tjener like mye uansett hvor mange verk eieren har
  const one = [plant(1)];
  const many = Array.from({ length: 14 }, (_, i) => plant(i + 1));
  assert(sisterProfit(g, one[0]) === sisterProfit(g, many[0]), "driftsresultatet avhenger av antall verk");
  // Netto til morselskapet øker for hvert verk, men mindre og mindre (ikke lineært)
  let prev = 0;
  let prevStep = Infinity;
  for (let n = 1; n <= 14; n++) {
    const net = konsernNetFor(g, many.slice(0, n));
    assert(net > prev, `netto går ned ved ${n} verk`);
    assert(net - prev < prevStep + 1, `verk ${n} gir mer enn verket før`);
    prevStep = net - prev;
    prev = net;
  }
  assert(prev < 14 * konsernNetFor(g, one) * 0.75, "14 verk gir nesten 14 ganger så mye som ett");
  // Et nytt (umodernisert) verk trekker aldri ned utbyttet fra verkene man har
  const before = dividends(g, many.slice(0, 10));
  const after = dividends(g, [...many.slice(0, 10), plant(11, 0)]);
  assert(
    before.every((d, i) => Math.abs(after[i] - d) < 1),
    "et nytt verk senket utbyttet fra de gamle",
  );
  // Konsernkostnadene per verk øker med antall verk
  assert(konsernCosts(many) / 14 > konsernCosts(one), "konsernkostnaden per verk øker ikke");
  // Døgnet bokfører utbyttet som inntekt og konsernkostnadene som egen post
  g.konsern.plants = many.slice(0, 3).map((p) => ({ ...p }));
  g.market.steelFactor = 1;
  konsernDay(g);
  assert((g.today.costs.konsern ?? 0) > 0, "ingen konsernkostnader bokført");
  const expected = dividends(g, g.konsern.plants).reduce((a, b) => a + b, 0);
  const got = g.today.income.konsern ?? 0;
  assert(got > 0 && got <= expected * 2 + 1, `utbytte ${got}, ventet omtrent ${expected}`);
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

test("Bunden konsernreserve (B-193): kassa over grensen flyttes, ikke slettes, og kan ikke brukes", () => {
  const cap = CASH_RESERVE.softCap!;
  const g = newGame(193);
  g.stage = 4;
  g.konsern.unlocked = true;
  // Under grensen skjer ingenting, og reserven finnes ikke (vises ikke før den trengs)
  g.cash = cap - 1;
  assert(applyCashCap(g) === 0 && g.lockedReserve === null, "reserve før grensen");
  // Over grensen: overskuddet flyttes, konsernverdien er den samme
  g.cash = cap + 5e9;
  const eqBefore = konsernEquity(g);
  const logBefore = g.log.length;
  assert(applyCashCap(g) === 5e9, "feil beløp flyttet");
  assert(g.cash === cap && reserveTotal(g) === 5e9, `kasse ${g.cash}, reserve ${reserveTotal(g)}`);
  assert(Math.abs(konsernEquity(g) - eqBefore) < 1, "konsernverdien endret seg");
  assert(
    g.log.length === logBefore + 1 && /bunden konsernreserve/.test(g.log[g.log.length - 1].text),
    "ingen forklaring",
  );
  // Neste gang: ingen ny forklaring, beløpet legges til
  g.cash = cap + 1e9;
  applyCashCap(g);
  assert(reserveTotal(g) === 6e9 && g.log.length === logBefore + 1, "forklaringen kom to ganger");
  // Reserven kan ikke brukes: kjøp og konsernkassa ser bare kassa
  g.cash = 0;
  assert(!buySister(g, "stalverk").ok, "kjøpte med reserven");
  assert(Math.max(0, g.cash - g.loan) === 0, "reserven regnes som disponibel");
  // Døgnlinja oppsummerer og nullstiller
  g.lockedReserve!.movedToday = 2e9;
  reserveDayLog(g);
  assert(g.lockedReserve!.movedToday === 0 && /satt av/.test(g.log[g.log.length - 1].text), "ingen døgnlinje");
  // Motoren flytter overskuddet av seg selv
  g.cash = cap + 3e9;
  advance(g, 1);
  assert(g.cash <= cap && reserveTotal(g) >= 9e9, `motoren flyttet ikke: kasse ${g.cash}`);
  // Konkurs: banken ser reserven som sikkerhet
  g.cash = -1e12;
  g.lockedReserve!.total = 2e12;
  g.negativeDays = 0;
  for (let d = 0; d < 9; d++) advance(g, 1440);
  assert(!g.gameOver, "konkurs med reserve som dekker underskuddet");
  // Grensen kan slås av
  const saved = CASH_RESERVE.softCap;
  CASH_RESERVE.softCap = null;
  g.cash = cap * 3;
  assert(applyCashCap(g) === 0 && g.cash === cap * 3, "grensen virker når den er slått av");
  CASH_RESERVE.softCap = saved;
  // Gamle lagringer får reserven som null, og den overlever lagring
  const old = JSON.parse(JSON.stringify(g));
  delete old.lockedReserve;
  assert(parseSave(JSON.stringify(old))!.lockedReserve === null, "gammel lagring uten standardverdi");
  assert(
    parseSave(JSON.stringify(g))!.lockedReserve!.total === g.lockedReserve!.total,
    "reserven forsvant ved lagring",
  );
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
  const p = g.konsern.plants[0];
  // Under bygging: ikke noe utbytte, ingen konsernkostnader, men verdien teller (konsernverdien står stille)
  assert(p.project?.kind === "bygg" && underConstruction(p), "verket bygges ikke");
  assert(dividends(g, g.konsern.plants)[0] === 0 && konsernCosts(g.konsern.plants) === 0, "bygget verk tjener");
  assert(Math.abs(konsernEquity(g) - equity) < 1, "konsernverdien falt ved kjøpet");
  assert(!konsernOptions(g).some((o) => o.key === `mod-${p.id}`), "kunne modernisere et verk som bygges");
  // Spillfarten betyr ingenting: ett spilldøgn går, men ingen ekte tid
  advance(g, 1440);
  assert(!!p.project, "ble ferdig av spilltid");
  now += (BUILD_HOURS.stalverk - 0.5) * 3_600_000;
  assert(finishKonsernProjects(g) === 0 && !!p.project, "ble ferdig for tidlig");
  now += 3_600_000;
  assert(finishKonsernProjects(g) === 1 && !p.project, "ble ikke ferdig");
  assert(dividends(g, g.konsern.plants)[0] > 0, "ferdig verk ga ikke utbytte");
  // Modernisering: verket går som før, og verdien regnes som ferdig modernisert
  const before = sisterProfit(g, p);
  const value = sisterValue(g, p);
  assert(modernizeSister(g, p.id).ok, "moderniseringen startet ikke");
  assert(sisterProfit(g, p) === before && p.level === 0, "moderniseringen virket med én gang");
  assert(sisterValue(g, p) > value, "verdien regnes ikke som ferdig modernisert");
  assert(!modernizeSister(g, p.id).ok, "to prosjekter på samme verk");
  now += MODERNIZE_HOURS * 3_600_000;
  finishKonsernProjects(g);
  assert(p.level === 1 && sisterProfit(g, p) > before, "moderniseringen ble ikke ferdig");
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
    assert(!!k.emoji, `mangler emoji: ${k.id}`);
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

// Oppsummeringen står sist, så alle testene over teller med i exit-koden
if (failed) {
  console.log(`\n${failed} test(er) feilet`);
  process.exitCode = 1;
} else {
  console.log("\nAlle tester OK");
}
