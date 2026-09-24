/**
 * Automatisk testspiller for balansering.
 *
 * Kjør med `npx tsx src/game/balance.ts` fra frontend/. Spilleren gjør det en
 * fornuftig menneskelig spiller ville gjort: kjøper skrap, tar kontrakter den
 * rekker, ansetter folk og bygger ut når det er råd. Skriptet sjekker at
 * progresjonen havner innenfor målene, og feiler ellers (brukes i CI).
 */
import { buyUpgrade, doResearch, hire, requestReline, setRecipe, setTargetGrade, upgradeOptions } from "./actions";
import { resolveDecision } from "./decisions";
import { researchOptions, scrapUnlocked } from "./research";
import { SCRAP_IDS, STAGES } from "./data";
import { acceptContract, advance, autoBuy, completeManual, newGame, TARGET_C } from "./engine";
import { EAFSimulation } from "../sim/eaf";
import { createSim } from "../ui/control/simSetup";
import { MELT_BAND, SimpleRunner } from "../ui/control/simpleRunner";
import { computePlantStats, day, hasPlanner, satisfies } from "./plant";
declare const process: { argv: string[]; exitCode?: number; exit?: (code: number) => void };

import type { Crew, GameState, GradeId, ManualRequest, RoleId, ScrapId } from "./types";

type Recipe = Partial<Record<ScrapId, number>>;

const PRESETS: Recipe[] = [
  { blandet: 50, tungt: 40, retur: 10 },
  { shredder: 50, tungt: 40, retur: 10 },
  { tungt: 60, rent: 30, retur: 10 },
  { rent: 70, tungt: 20, retur: 10 },
  { rent: 50, rajern: 40, retur: 10 },
];

function expectedFor(g: GameState, recipe: Recipe, grade: GradeId) {
  const stats = computePlantStats(g);
  const total = Object.values(recipe).reduce((a, b) => a + (b ?? 0), 0);
  const nominal: Record<ScrapId, { c: number; p: number; tramp: number; price: number }> = {
    blandet: { c: 0.15, p: 0.03, tramp: 0.3, price: 2500 },
    tungt: { c: 0.2, p: 0.02, tramp: 0.16, price: 3100 },
    shredder: { c: 0.1, p: 0.018, tramp: 0.22, price: 3300 },
    spon: { c: 0.3, p: 0.035, tramp: 0.35, price: 1700 },
    rent: { c: 0.08, p: 0.012, tramp: 0.05, price: 4200 },
    rajern: { c: 4, p: 0.05, tramp: 0.01, price: 5000 },
    retur: { c: 0.2, p: 0.02, tramp: 0.15, price: 0 },
  };
  let c = 0;
  let p = 0;
  let tramp = 0;
  let price = 0;
  for (const [id, w] of Object.entries(recipe) as [ScrapId, number][]) {
    c += (nominal[id].c * w) / total;
    p += (nominal[id].p * w) / total;
    tramp += (nominal[id].tramp * w) / total;
    price += (nominal[id].price * w) / total;
  }
  const target = TARGET_C[grade];
  const finalC = stats.furnace.decarb ? target : Math.max(c * 0.95, target);
  // Litt sikkerhetsmargin, slik en forsiktig spiller ville gjort uten full analyse
  const margin = stats.lab === 2 ? 1 : 0.85;
  const analysis = { c: finalC, p: (p * (1 - stats.dephos)) / margin, tramp: tramp / margin };
  return { ok: satisfies(analysis, grade), price };
}

function cheapestRecipe(g: GameState, grade: GradeId): Recipe | null {
  let best: Recipe | null = null;
  let bestPrice = Infinity;
  for (const r of PRESETS) {
    if (!SCRAP_IDS.every((id) => !r[id] || scrapUnlocked(g, id))) continue;
    const e = expectedFor(g, r, grade);
    if (e.ok && e.price < bestPrice) {
      best = r;
      bestPrice = e.price;
    }
  }
  return best;
}

function applyRecipe(g: GameState, r: Recipe): void {
  for (const id of SCRAP_IDS) setRecipe(g, id, r[id] ?? 0);
}

function botHour(g: GameState): void {
  // Hendelseskort: forsiktige valg, som en fornuftig spiller
  if (g.pendingDecision) {
    const d = g.pendingDecision;
    const safe: Record<string, number> = { billigparti: 1, hasteordre: 1, lonnskrav: 1, avis: 0, laerling: 0, tilsyn: 0, kurs: 0, sykdom: 0, naboklage: 0, kundebesok: 0, nestenulykke: 0, utkobling: 1 };
    // Messa bare når det er god råd
    const affordable = g.cash > Number(d.data.cost ?? 0) * 4;
    safe.messe = affordable ? 0 : 1;
    for (const id of ["kurs", "sykdom", "naboklage", "nestenulykke"]) if (!affordable) safe[id] = 1;
    resolveDecision(g, safe[d.id] ?? 1);
  }
  // Forskning: alt som er tilgjengelig, i tabellens rekkefølge
  for (const r of researchOptions(g)) if (r.available) doResearch(g, r.id);
  const stats = computePlantStats(g);
  const today = day(g);

  // Foring: bestill ny foring før den blir farlig tynn (skjer ikke av seg selv, B-022)
  g.furnaces.forEach((f, i) => {
    if (f.wear >= 0.88 && !f.relineRequested && g.minute >= f.downUntilMin) requestReline(g, i);
  });

  // Kontrakter: ta de som kan lages og rekkes
  const active = g.contracts.filter((c) => c.status === "aktiv");
  let committed = active.reduce((a, c) => a + c.tonnes - c.delivered, 0);
  const activeGrades = new Set(active.map((c) => c.grade));
  for (const offer of g.contracts.filter((c) => c.status === "tilbud")) {
    if (!stats.products.includes(offer.product)) continue;
    // Med valseverket i drift går alle emner til armering
    if (stats.products.includes("armering") && offer.product !== "armering") continue;
    if (!cheapestRecipe(g, offer.grade)) continue;
    // En kvalitet om gangen, som en enkel spiller ville kjørt
    if (activeGrades.size > 0 && !activeGrades.has(offer.grade)) continue;
    const days = offer.deadlineDay - today + 0.5;
    const recent = g.history.slice(-3);
    const produced = recent.length ? recent.reduce((a, d) => a + d.producedT, 0) / recent.length : stats.dailyProductT;
    const capacity = Math.min(stats.dailyProductT, Math.max(produced, stats.dailyProductT * 0.5));
    if (committed + offer.tonnes > capacity * days * 0.7) continue;
    acceptContract(g, offer.id);
    committed += offer.tonnes;
    activeGrades.add(offer.grade);
  }
  const grade: GradeId = activeGrades.size ? [...activeGrades][0] : "standard";
  setTargetGrade(g, grade);
  const recipe = cheapestRecipe(g, grade) ?? PRESETS[0];
  applyRecipe(g, recipe);

  g.settings.autoBuy = true;
  // Uten planlegger kjøper testspilleren skrap selv, på samme måte som planleggeren ville gjort
  if (!hasPlanner(g)) autoBuy(g, stats);
  g.settings.autoSpot = true;

  // Ansettelser: fyll opp manglende plasser, deretter selgere og reparatører
  const cap = STAGES[g.stage].staffCap;
  const missing: Crew = stats.missing;
  const wantShifts = g.stage >= 2 ? 3 : 2;
  if (stats.shifts < wantShifts) {
    for (const [role, n] of Object.entries(missing) as [RoleId, number][]) {
      for (let i = 0; i < n && g.workers.length < cap; i++) {
        const cand = g.candidates.find((c) => c.role === role) ?? g.candidates.find((c) => c.role === "allround");
        if (!cand) break;
        hire(g, cand.id);
      }
    }
  }
  const count = (r: RoleId) => g.workers.filter((w) => w.role === r).length;
  const crewTotal = Object.values(stats.crew).reduce((a, b) => a + (b ?? 0), 0) * 3;
  const crewWorkers = g.workers.filter((w) => w.role !== "salg" && w.role !== "vedlikehold" && w.role !== "planlegger").length;
  const spare = cap - g.workers.length - Math.max(0, crewTotal - crewWorkers);
  if (
    spare > 0 &&
    g.stage >= 2 &&
    stats.shifts >= 2 &&
    count("salg") < Math.min(3, g.stage - 1) &&
    g.workers.length < cap
  ) {
    const c = g.candidates.find((x) => x.role === "salg");
    if (c) hire(g, c.id);
  }
  if (spare > 0 && g.stage >= 2 && stats.shifts >= 2 && count("planlegger") < 1) {
    const c = g.candidates.find((x) => x.role === "planlegger");
    if (c) hire(g, c.id);
  }
  if (spare > 1 && g.stage >= 2 && stats.shifts >= 2 && count("vedlikehold") < g.stage - 1 && g.workers.length < cap) {
    const c = g.candidates.find((x) => x.role === "vedlikehold");
    if (c) hire(g, c.id);
  }

  // Utbygging: nytt nivå først, så det som gir mest på nåværende nivå
  const reserve = Math.max(5_000, stats.salaryPerDay * 5 + stats.dailyProductT * 6000);
  const perStage: string[][] = [
    [],
    ["induksjon1", "formlinje", "lager", "xrf", "portal", "salgskontor"],
    ["induksjon5", "blokk", "oes", "ovn2", "verksted", "sortering"],
    ["renseanlegg", "lysbue30", "streng1", "oseovn", "conveyor", "trafo", "valseverk"],
    ["lysbue90", "streng4"],
  ];
  const order = [...perStage[g.stage], `stage${g.stage + 1}`];
  const options = upgradeOptions(g);
  for (const id of order) {
    const o = options.find((x) => x.id === id);
    if (!o || o.owned || o.locked) continue;
    if (!o.available && o.reason !== "For lite penger") continue;
    // Store investeringer krever en buffer til skrap og lønn mens produksjonen tar seg opp
    if (g.cash - o.price * (o.price > 1_000_000 ? 1.3 : 1) < reserve) break;
    buyUpgrade(g, id);
    break;
  }
}

interface RunSummary {
  seed: number;
  stageDays: (number | null)[];
  bankrupt: boolean;
  final: GameState;
}

function run(seed: number, days: number, verbose: boolean): RunSummary {
  const g = newGame(seed);
  const stageDays: (number | null)[] = [1, null, null, null, null];
  let lastDay = 0;
  while (day(g) <= days && !g.gameOver) {
    botHour(g);
    advance(g, 60);
    if (g.stage > 0 && stageDays[g.stage] === null) stageDays[g.stage] = day(g);
    if (verbose && day(g) !== lastDay && (day(g) % 5 === 0 || day(g) < 10 || process.argv.includes("--finance"))) {
      lastDay = day(g);
      const s = computePlantStats(g);
      const y = g.history[g.history.length - 1];
      const inc = y ? Object.values(y.income).reduce((a, b) => a + (b ?? 0), 0) : 0;
      const cost = y
        ? Object.entries(y.costs)
            .filter(([k]) => k !== "investering")
            .reduce((a, [, b]) => a + (b ?? 0), 0)
        : 0;
      console.log(
        `dag ${String(day(g)).padStart(3)} ${STAGES[g.stage].name.padEnd(9)} kasse ${Math.round(g.cash).toLocaleString("nb-NO").padStart(12)}  omdømme ${g.reputation.toFixed(1).padStart(5)}  ` +
          `ansatte ${String(g.workers.length).padStart(3)} skift ${s.shifts}  ${s.furnace.id}/${s.casting.id}  kap ${s.dailyProductT.toFixed(1)} t/d  ` +
          `i går: prod ${(y?.producedT ?? 0).toFixed(1)} t, inn ${Math.round(inc).toLocaleString("nb-NO")}, drift ${Math.round(cost).toLocaleString("nb-NO")}  ` +
          (process.argv.includes("--finance") && y
            ? ` [${Object.entries(y.costs)
                .map(([k, v]) => `${k} ${Math.round((v ?? 0) / 1000)}k`)
                .join(", ")} | ${Object.entries(y.income)
                .map(([k, v]) => `${k} ${Math.round((v ?? 0) / 1000)}k`)
                .join(", ")}] `
            : "") +
          `vent: ${g.furnaces.map((f) => f.waitReason ?? "-").join("/")}${g.castWait ? " støp:" + g.castWait : ""}`,
      );
    }
  }
  return { seed, stageDays, bankrupt: g.gameOver, final: g };
}

const verbose = process.argv.includes("--verbose");
if (process.argv.includes("--dump")) {
  // Lager et lagret spill på et gitt nivå, til testing av grensesnittet
  const stage = Number(process.argv[process.argv.indexOf("--dump") + 1]);
  const g = newGame(7);
  while (g.stage < stage && day(g) < 400) {
    botHour(g);
    advance(g, 60);
  }
  for (let i = 0; i < 24 * 4; i++) {
    botHour(g);
    advance(g, 60);
  }
  console.log(JSON.stringify(g));
  process.exit?.(0);
}
if (process.argv.includes("--research")) {
  // Når testspilleren forsker, og hvor mange fagpoeng den har liggende
  const g = newGame(Number(process.argv[process.argv.indexOf("--research") + 1]));
  let done = 0;
  while (day(g) <= 150) {
    botHour(g);
    advance(g, 60);
    if (g.researched.length > done) {
      done = g.researched.length;
      console.log(`dag ${day(g)} (${STAGES[g.stage].name}): ${g.researched[done - 1]} – ${Math.round(g.researchPoints)} FP igjen`);
    }
  }
  console.log(`dag 150: ${Math.round(g.researchPoints)} FP ubrukt`);
  process.exit?.(0);
}
if (process.argv.includes("--kontrakter")) {
  // Hvor lang tid kontraktene tar fra signering til levering, per nivå (1 døgn = 1 minutt på 1×)
  const g = newGame(Number(process.argv[process.argv.indexOf("--kontrakter") + 1]));
  const started = new Map<number, number>();
  const spans: number[][] = [[], [], [], [], []];
  while (day(g) <= 150) {
    botHour(g);
    advance(g, 60);
    for (const c of g.contracts) {
      if (c.status === "aktiv" && !started.has(c.id)) started.set(c.id, g.minute);
      if (c.status === "fullfort" && started.has(c.id) && started.get(c.id)! >= 0) {
        spans[g.stage].push((g.minute - started.get(c.id)!) / 1440);
        started.set(c.id, -1);
      }
    }
  }
  spans.forEach((xs, i) => {
    if (!xs.length) return;
    const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
    console.log(`${STAGES[i].name.padEnd(9)} ${String(xs.length).padStart(3)} kontrakter, snitt ${avg.toFixed(1)} døgn (= ${avg.toFixed(1)} min på 1×)`);
  });
  process.exit?.(0);
}
if (process.argv.includes("--sperrer")) {
  // Hva som holder igjen neste nivå: dagen penger holder, dagen omdømmet holder, og ubrukte fagpoeng
  for (const seed of [1, 2, 3, 4]) {
    const g = newGame(seed);
    const cashDay: (number | null)[] = [null, null, null, null, null];
    const repDay: (number | null)[] = [null, null, null, null, null];
    const fpAt: (number | null)[] = [null, null, null, null, null];
    while (day(g) <= 200 && g.stage < 4) {
      botHour(g);
      advance(g, 60);
      const next = STAGES[g.stage + 1];
      if (!next) break;
      if (cashDay[next.id] === null && g.cash >= next.price) cashDay[next.id] = day(g);
      if (repDay[next.id] === null && g.reputation >= next.reputation) repDay[next.id] = day(g);
      fpAt[g.stage] = Math.round(g.researchPoints);
    }
    console.log(
      `frø ${seed}: ` +
        [1, 2, 3, 4].map((i) => `${STAGES[i].name}: penger dag ${cashDay[i] ?? "-"}, omdømme dag ${repDay[i] ?? "-"}`).join(" | ") +
        ` | ubrukte FP ved slutten av hvert nivå: ${fpAt.join("/")}`,
    );
  }
  process.exit?.(0);
}
if (process.argv.includes("--replog")) {
  // Skriver ut alt som har påvirket omdømmet, for feilsøking av balansen
  const g = newGame(Number(process.argv[process.argv.indexOf("--replog") + 1]));
  let seen = 0;
  while (day(g) <= 200) {
    botHour(g);
    advance(g, 60);
    for (const e of g.log) {
      if (e.id <= seen) continue;
      if (/mdømme/.test(e.text) && e.kind === "bad") console.log(`dag ${Math.floor(e.min / 1440) + 1}: ${e.text}`);
    }
    seen = g.log.length ? g.log[g.log.length - 1].id : seen;
  }
  process.exit?.(0);
}
const seeds = process.argv.includes("--seed")
  ? [Number(process.argv[process.argv.indexOf("--seed") + 1])]
  : [1, 2, 3, 4, 5, 6];
const DAYS = 240;
const targets = [
  { stage: 1, min: 7, max: 20 },
  { stage: 2, min: 20, max: 50 },
  { stage: 3, min: 55, max: 120 },
  { stage: 4, min: 120, max: 220 },
];

let failed = false;
const results: RunSummary[] = [];
for (const seed of seeds) {
  const r = run(seed, DAYS, verbose && seed === seeds[0]);
  results.push(r);
  const t = r.final.totals;
  console.log(
    `seed ${seed}: nivådager ${r.stageDays.map((d) => d ?? "-").join(" / ")}  ` +
      `kasse ${Math.round(r.final.cash).toLocaleString("nb-NO")}  omdømme ${r.final.reputation.toFixed(0)}  ` +
      `charger ${t.heats}  produsert ${Math.round(t.producedT)} t  kontrakter ${t.contractsDone}  reklamasjoner ${t.complaints}` +
      (r.bankrupt ? "  KONKURS" : ""),
  );
}

for (const target of targets) {
  const daysReached = results.map((r) => r.stageDays[target.stage]);
  const reached = daysReached.filter((d): d is number => d !== null).sort((a, b) => a - b);
  const median = reached.length === results.length ? reached[Math.floor(reached.length / 2)] : null;
  const ok = median !== null && median >= target.min && median <= target.max;
  if (!ok) failed = true;
  console.log(
    `${STAGES[target.stage].name.padEnd(9)} median dag ${median ?? "ikke nådd"} (mål ${target.min}–${target.max}) ${ok ? "OK" : "AVVIK"}`,
  );
}
if (results.some((r) => r.bankrupt)) {
  failed = true;
  console.log("AVVIK: testspilleren gikk konkurs");
}
// Kontrollrommet: den enkle styringen skal kunne kjøres av en nybegynner som bare
// følger rådene på skjermen, og en slurvete kjøring skal gi dårlig karakter
type SimplePolicy = "nybegynner" | "slurvete";
function playSimple(policy: SimplePolicy, seed: number, req?: ManualRequest) {
  const sim = req ? createSim(req, 0) : new EAFSimulation(seed);
  if (!req) sim.startCharge("AR20");
  let r = seed;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const run = new SimpleRunner(sim, sim.state.refractoryWear, rnd);
  run.start();
  let real = 0;
  let lastAct = 0;
  while (run.step !== "ferdig" && real < 900) {
    run.tick(0.1);
    real += 0.1;
    // En person reagerer omtrent hvert andre sekund
    if (real - lastAct < 2) continue;
    lastAct = real;
    const t = sim.state.bathTempC;
    const g = sim.state.grade!;
    if (run.step === "smelt" && policy === "nybegynner") {
      if (t < MELT_BAND[0] + 5) run.changeLevel(1);
      else if (t > MELT_BAND[1] - 5) run.changeLevel(-1);
    }
    if (run.step === "rens") {
      if (policy === "nybegynner" && sim.state.carbonPct > g.tapCarbonMaxPct - 0.015) run.setBlowing(true);
      else {
        run.setBlowing(false);
        run.finishRefining();
      }
    }
    if (run.step === "slagg") {
      if (policy === "slurvete") run.skipDeslag();
      else run.startDeslag();
    }
    if (run.step === "tapp" && (policy === "slurvete" ? t > sim.tapTargetTempC + 35 : t >= sim.tapTargetTempC - 12)) run.tap();
  }
  return { score: run.score!, real };
}

for (const seed of [1, 2, 3]) {
  const novice = playSimple("nybegynner", seed);
  const sloppy = playSimple("slurvete", seed);
  const ok = novice.score.rating >= 4 && sloppy.score.rating <= 2 && novice.real < 180;
  console.log(
    `Enkel styring, frø ${seed}: nybegynner ${novice.score.rating}★ på ${Math.round(novice.real)} s ` +
      `(${Math.round(novice.score.result.kwhPerT)} kWh/t), slurvete ${sloppy.score.rating}★ ` +
      `(${Math.round(sloppy.score.result.kwhPerT)} kWh/t) ${ok ? "OK" : "AVVIK"}`,
  );
  if (!ok) failed = true;
}

// Ta styringen i spillet: chargen skal komme tilbake som en vanlig charge
{
  const g = newGame(3);
  while (!computePlantStats(g).furnace.arc && day(g) < 300) {
    botHour(g);
    advance(g, 60);
  }
  g.settings.manualNext = true;
  const speedBefore = (g.speed = 3);
  for (let i = 0; i < 48 && !g.pendingManual; i++) {
    botHour(g);
    advance(g, 60);
  }
  const req = g.pendingManual;
  if (!req) {
    failed = true;
    console.log("AVVIK: ta styringen ga ingen charge å kjøre");
  } else {
    const { score } = playSimple("nybegynner", 7, req);
    const heatsBefore = g.totals.manualHeats;
    const fpBefore = g.researchPoints;
    completeManual(g, score.result);
    advance(g, score.result.minutes + 30);
    const ok =
      g.totals.manualHeats === heatsBefore + 1 && g.speed === speedBefore && g.researchPoints > fpBefore && score.rating >= 4;
    console.log(
      `Ta styringen i spillet: ${score.rating}★, P ${score.result.phosphorusPct}, ` +
        `manuelle charger ${g.totals.manualHeats}, fagpoeng +${Math.round(g.researchPoints - fpBefore)}, fart etterpå ${g.speed} ${ok ? "OK" : "AVVIK"}`,
    );
    if (!ok) failed = true;
  }
}

if (failed) process.exitCode = 1;
