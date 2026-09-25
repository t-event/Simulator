/**
 * Små, raske tester av spillmotoren (B-097). Kjøres med `npx tsx src/game/tests.ts` og i CI.
 * Hver test bygger sin egen tilstand, så de ikke er avhengige av lagrede filer.
 */
import { CHALLENGES, checkChallenges } from "./challenges";
import { ADDONS, CASTINGS, FURNACES, WIN_CASH } from "./data";
import { advance, checkWin, fmtKr, newGame } from "./engine";
import { KNOWLEDGE } from "./knowledge";
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

test("Seier: 1 mrd. i egenkapital på storverket, lån trekkes fra", () => {
  const g = newGame(1);
  g.stage = 4;
  g.cash = WIN_CASH;
  g.loan = 1;
  checkWin(g);
  assert(!g.won, "vant med lån som tar egenkapitalen under 1 mrd.");
  g.loan = 0;
  checkWin(g);
  assert(g.won, "vant ikke med 1 mrd. og uten lån");
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
  const m = parseSave(JSON.stringify(g));
  assert(m, "lagringen kunne ikke leses");
  assert(m!.round === 1 && m!.winSeen === false && typeof m!.inboxSeenId === "number", "mangler standardverdi");
  assert(m!.settings.toasts === "alle", "mangler standard for varsler");
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
