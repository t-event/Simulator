/**
 * Små, raske tester av spillmotoren (B-097). Kjøres med `npx tsx src/game/tests.ts` og i CI.
 * Hver test bygger sin egen tilstand, så de ikke er avhengige av lagrede filer.
 */
import { doResearch, scheduleCastingSwitch, setPowerDeal, upgradeOptions } from "./actions";
import { CHALLENGES, checkChallenges } from "./challenges";
import { ADDONS, CASTINGS, FURNACES, WIN_CASH } from "./data";
import { advance, assessOffer, checkWin, fmtKr, log, newGame } from "./engine";
import { logTopic, showToast, unseenCount } from "./inbox";
import { KNOWLEDGE } from "./knowledge";
import {
  applyWorldEvents,
  canJoinDirectly,
  joinSeason,
  notJoinableReason,
  SEASON_BONUS_FP,
  worldFactor,
} from "./world";
import { dealPrice, energyPrice, productPrice } from "./plant";
import { scrapPrice } from "./engine";
import {
  buySister,
  checkKonsernMilestones,
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
import { computePlantStats, supportAdvice } from "./plant";
import { RESEARCH, researchOptions } from "./research";
import { parseSave } from "./save";
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

if (failed) {
  console.log(`\n${failed} test(er) feilet`);
  process.exitCode = 1;
} else {
  console.log("\nAlle tester OK");
}
