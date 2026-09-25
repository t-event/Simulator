/**
 * Små, raske tester av spillmotoren (B-097). Kjøres med `npx tsx src/game/tests.ts` og i CI.
 * Hver test bygger sin egen tilstand, så de ikke er avhengige av lagrede filer.
 */
import { scheduleCastingSwitch } from "./actions";
import { CHALLENGES, checkChallenges } from "./challenges";
import { ADDONS, CASTINGS, FURNACES, WIN_CASH } from "./data";
import { advance, assessOffer, checkWin, fmtKr, log, newGame } from "./engine";
import { logTopic, showToast, unseenCount } from "./inbox";
import { KNOWLEDGE } from "./knowledge";
import {
  buySister,
  checkKonsernMilestones,
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
import { RESEARCH } from "./research";
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
  assert(konsernEquity(g) === g.cash + price * 0.8, "verket teller ikke 80 % mot konsernverdien");
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

test("Nytt spill+ gir bonus, vanlig nytt spill gjør det ikke", () => {
  const a = newGame(1);
  const b = newGame(1, 2);
  assert(b.cash > a.cash && b.researchPoints > a.researchPoints, "runde 2 fikk ingen bonus");
  assert(a.round === 1 && b.round === 2 && !b.winSeen, "feil runde eller winSeen");
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
  g.settings.toasts = "ingen";
  assert(!showToast(g, havari), "«ingen» viste et varsel");
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

if (failed) {
  console.log(`\n${failed} test(er) feilet`);
  process.exitCode = 1;
} else {
  console.log("\nAlle tester OK");
}
