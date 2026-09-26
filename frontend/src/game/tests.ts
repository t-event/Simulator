/**
 * Små, raske tester av spillmotoren (B-097). Kjøres med `npx tsx src/game/tests.ts` og i CI.
 * Hver test bygger sin egen tilstand, så de ikke er avhengige av lagrede filer.
 */
import { buyMastery, doResearch, giveBonus, scheduleCastingSwitch, setPowerDeal, upgradeOptions } from "./actions";
import { MASTERY, masteryCost, masteryEffect, masteryOpen } from "./mastery";
import { achievementsDone, checkAchievements, hasAchievement } from "./achievements";
import { buyCosmetic, cosmeticBlocked, cosmeticOn, FACADE, facadeColors, setCosmetic } from "./cosmetics";
import { CHALLENGES, checkChallenges } from "./challenges";
import { ADDONS, CASTINGS, FURNACES, WIN_CASH } from "./data";
import { advance, assessOffer, checkWin, fmtKr, log, makeCandidate, newGame } from "./engine";
import { logTopic, showToast, unseenCount } from "./inbox";
import { KNOWLEDGE } from "./knowledge";
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
import {
  applyWorldEvents,
  canJoinDirectly,
  joinSeason,
  notJoinableReason,
  SEASON_BONUS_FP,
  worldFactor,
  applySeasonTwist,
} from "./world";
import { dealPrice, energyPrice, productPrice } from "./plant";
import { scrapPrice, spotQuota } from "./engine";
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
  konsernEquity,
  modernizeSister,
  SISTER_TYPES,
  sisterProfit,
} from "./konsern";
import { bonusGap, computePlantStats, liftMorale, moraleNormal, supportAdvice } from "./plant";
import { RESEARCH, researchOptions } from "./research";
import { parseSave } from "./save";
import { resolveDecision } from "./decisions";
import {
  apprenticeExams,
  APPRENTICE_DAYS,
  avgRating,
  EXAM_RETRY_DAYS,
  normalSalary,
  rateDelivery,
  ratingFactor,
} from "./engine";
import { specMargin } from "./plant";
import { QUIZ } from "./quiz";
import { GRADES } from "./data";
import type { Agreement, Analysis, Contract } from "./types";
import { EAFSimulation } from "../sim/eaf";
import { SimpleRunner } from "../ui/control/simpleRunner";

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
  const p = g.konsern.plants[0];
  const before = sisterProfit(g, p);
  assert(modernizeSister(g, p.id).ok && sisterProfit(g, p) > before, "moderniseringen ga ikke mer overskudd");
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
  const p = g.konsern.plants[0];
  const before = sisterProfit(g, p);
  assert(
    upgradeSister(g, p.id).ok && p.type === "storverk" && sisterProfit(g, p) > before * 3,
    "utbyggingen virket ikke",
  );
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

test("Et eldre nytt spill+ blir ikke med i sesongen direkte (B-140)", () => {
  const a = newGame(1);
  assert(canJoinDirectly(a), "et vanlig garasjespill skal kunne bli med");
  a.round = 2;
  assert(!canJoinDirectly(a) && notJoinableReason(a).includes("nytt spill+"), "nytt spill+ skulle holdes utenfor");
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

test("Kontrollrommet: oksygen går ikke i tappingen, strømmen kan slås av", () => {
  const sim = new EAFSimulation(3);
  sim.startCharge("AR20");
  const run = new SimpleRunner(sim, sim.state.refractoryWear, () => 0.5);
  run.start();
  run.changeLevel(-9);
  assert(run.level === 0, "strømmen kan ikke slås av");
  run.step = "tapp";
  run.setOxygen(true);
  assert(!run.blowing, "oksygen kan slås på i tappingen");
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

if (failed) {
  console.log(`\n${failed} test(er) feilet`);
  process.exitCode = 1;
} else {
  console.log("\nAlle tester OK");
}
