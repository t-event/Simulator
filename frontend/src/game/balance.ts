/**
 * Automatisk testspiller for balansering.
 *
 * Kjør med `npx tsx src/game/balance.ts` fra frontend/. Spilleren gjør det en
 * fornuftig menneskelig spiller ville gjort: kjøper skrap, tar kontrakter den
 * rekker, ansetter folk og bygger ut når det er råd. Skriptet sjekker at
 * progresjonen havner innenfor målene, og feiler ellers (brukes i CI).
 */
import { buyUpgrade, hire, setRecipe, setTargetGrade, upgradeOptions } from "./actions";
import { SCRAP_IDS, STAGES } from "./data";
import { acceptContract, advance, completeManual, newGame, TARGET_C } from "./engine";
import { EAFSimulation } from "../sim/eaf";
import { serializeState } from "../sim/serialize";
import { computePlantStats, day, satisfies } from "./plant";
declare const process: { argv: string[]; exitCode?: number; exit?: (code: number) => void };

import type { Crew, GameState, GradeId, RoleId, ScrapId } from "./types";

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
  const stats = computePlantStats(g);
  const today = day(g);

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
  const crewWorkers = g.workers.filter((w) => w.role !== "salg" && w.role !== "vedlikehold").length;
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
const DAYS = 200;
const targets = [
  { stage: 1, min: 4, max: 14 },
  { stage: 2, min: 20, max: 50 },
  { stage: 3, min: 50, max: 115 },
  { stage: 4, min: 100, max: 185 },
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
// Ta styringen: en charge kjørt i prosessmodellen skal komme tilbake som en vanlig charge
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
    const sim = new EAFSimulation(5);
    sim.startCharge("AR20");
    sim.state.scrapPhosphorusPct = req.mix.p;
    sim.state.phosphorusPct = req.mix.p;
    sim.setConveyor(true);
    sim.setConveyorRate(2.2);
    sim.setPower(true);
    sim.setTransformerTap(6);
    sim.setLimeRate(42);
    sim.setDolomiteRate(32);
    sim.setOxygenFlow(1700);
    sim.setCarbonInjection(28);
    let t = 0;
    while (sim.state.phase === "innsmelting" && t < 8000) {
      if (sim.state.bathTempC > 1620 && sim.state.transformerTap > 3) sim.setTransformerTap(3);
      else if (sim.state.bathTempC < 1570 && sim.state.transformerTap < 6) sim.setTransformerTap(6);
      sim.step(1);
      t++;
    }
    sim.setOxygenFlow(0);
    sim.setCarbonInjection(0);
    sim.setLimeRate(0);
    sim.setDolomiteRate(0);
    sim.setConveyor(false);
    sim.setPower(false);
    sim.setSlagDoor(true);
    sim.setTilt(-12);
    for (let i = 0; i < 420; i++) sim.step(1);
    sim.setTilt(0);
    sim.setSlagDoor(false);
    sim.setPower(true);
    sim.setTransformerTap(5);
    for (let i = 0; i < 3000 && sim.state.bathTempC < sim.tapTargetTempC; i++) sim.step(1);
    sim.startTap();
    for (let i = 0; i < 2000 && sim.state.phase === "tapping"; i++) sim.step(1);
    const snap = serializeState(sim);
    const tap = snap.last_tap_result!;
    const heatsBefore = g.totals.manualHeats;
    const repBefore = g.reputation;
    completeManual(g, {
      carbonPct: tap.carbon_pct,
      phosphorusPct: tap.phosphorus_pct,
      tempDeviationC: tap.tap_temp_c - tap.target_temp_c,
      kwhPerT: snap.energy_per_tonne_kwh,
      wear: 0.01,
      minutes: sim.state.timeS / 60,
      ok: tap.ok,
      deviations: tap.deviations,
    });
    advance(g, sim.state.timeS / 60 + 30);
    const ok =
      g.totals.manualHeats === heatsBefore + 1 && g.speed === speedBefore && tap.ok && g.reputation >= repBefore;
    console.log(
      `Ta styringen: tapping ${tap.ok ? "OK" : "avvik"}, ${snap.energy_per_tonne_kwh} kWh/t, P ${tap.phosphorus_pct}, ` +
        `manuelle charger ${g.totals.manualHeats}, fart etterpå ${g.speed} ${ok ? "OK" : "AVVIK"}`,
    );
    if (!ok) failed = true;
  }
}

if (failed) process.exitCode = 1;
