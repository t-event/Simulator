/**
 * Verdenssimulatoren (B-380): hvordan konsernkassa og datterverkene utvikler seg i ekte tid for noen typiske spillere,
 * med de reglene som gjelder nå. Bruker de samme funksjonene som appen og testene: `konsernWorld.ts` (priser, kø,
 * plasser, trinn, nivåstigen – speiler `064`/`085`) og `dividend.ts` (utbyttet – speiler `051`/`067`). Bidraget fra
 * hovedverket regnes bare på serveren (B-318), så det gis som et fast tall per spillertype, kalibrert mot ekte tall
 * (`contribution_now` 30.9.2026: 2,5–47 mill. per ekte dag etter dempingen).
 *
 * Spilleren er en enkel og flink kjøper: hver ekte time fyller den køen (inntil 3) med det som betaler seg raskest
 * (pris delt på økningen i utbyttet), så lenge det betaler seg innen `MAX_PAYBACK_DAYS`. Det som ikke brukes, står i
 * konsernkassa – det er kapitalen som er ledig til anbud og oppkjøp.
 *
 *   npx tsx src/game/worldSim.ts              # alle spillertypene, 30/60/90/180 dager
 *   npx tsx src/game/worldSim.ts --dager 365  # lengre
 *
 * Ingen tilfeldighet: samme tall hver gang, så endringer i reglene kan sammenlignes.
 */
import { dividendPerDay, type DividendInput } from "./dividend";
import {
  LADDER,
  ladderLevel,
  modMaxAt,
  orderQuote,
  placeOrder,
  plannedPlants,
  settleWorld,
  slotsAt,
  type KonsernWorld,
  type OrderRequest,
} from "./konsernWorld";
import type { SisterPlant, SisterType } from "./types";

declare const process: { argv: string[] };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Kjøp som ikke betaler seg innen så mange ekte dager, venter (pengene står i kassa) */
export const MAX_PAYBACK_DAYS = 180;

export interface SimProfile {
  name: string;
  /** Bidraget fra hovedverket per ekte dag (etter dempingen) */
  contribution: number;
  researched: string[];
  /** Felles innkjøp og salgskontor (0–2) */
  shared: number;
  plants: SisterPlant[];
  balance: number;
  /** Gulvet (titlene fra før byttet) og nivået ved start */
  floor: number;
  level: number;
  /** Selskapsinntekt: inntekt per ekte dag når spilleren eier et selskap, andel av tida, og budet per konsesjon */
  company?: { perDay: number; share: number; bid: number };
}

export interface SimRow {
  day: number;
  balance: number;
  contribution: number;
  dividend: number;
  company: number;
  plants: string;
  queue: number;
  spent: number;
  earned: number;
  effective: number;
}

export interface SimResult {
  rows: SimRow[];
  /** Første ekte dag spilleren nådde hvert nivå i stigen (opptjent), eller null */
  levelDays: (number | null)[];
}

const FULL_RESEARCH = ["konsernstyring", "gronnkonsern", "oppkjop", "standardverk", "storkonsern"];

function plant(id: number, type: SisterType, level: number): SisterPlant {
  return { id, type, name: `Verk ${id}`, level, boughtDay: 0, downUntilDay: 0 };
}

function input(p: SimProfile, plants: SisterPlant[]): DividendInput {
  return {
    plants: plants.map((x) => ({ type: x.type, level: x.level, building: x.project?.kind === "bygg" })),
    shared: p.shared,
    research: ["konsernstyring", "gronnkonsern"].filter((r) => p.researched.includes(r)).length,
    mastery: 0,
    reputation: 100,
    quality: 1,
  };
}

/** Verkene etter en bestilling (bare til å regne gevinsten) */
function after(plants: SisterPlant[], req: OrderRequest, nextId: number): SisterPlant[] {
  if (req.kind === "bygg") return [...plants, plant(nextId, req.type, 0)];
  if (req.kind === "bytt") return [...plants.filter((x) => x.id !== req.plant), plant(nextId, "kompleks", 0)];
  return plants.map((x) =>
    x.id !== req.plant
      ? x
      : req.kind === "modernisering"
        ? { ...x, level: x.level + 1 }
        : { ...x, type: "storverk" as SisterType, level: 0 },
  );
}

/** Det som betaler seg raskest nå, eller null */
function bestOrder(w: KonsernWorld, p: SimProfile): OrderRequest | null {
  const base = plannedPlants(w);
  const now = dividendPerDay(input(p, base));
  const reqs: OrderRequest[] = [
    { kind: "bygg", type: "stalverk" },
    { kind: "bygg", type: "storverk" },
    { kind: "bygg", type: "kompleks" },
  ];
  const seen = new Set<string>();
  for (const x of base) {
    const key = `${x.type}:${x.level}`;
    if (seen.has(key)) continue;
    seen.add(key);
    reqs.push({ kind: "modernisering", plant: x.id });
    if (x.type === "stalverk") reqs.push({ kind: "utbygging", plant: x.id });
    if (x.type !== "kompleks") reqs.push({ kind: "bytt", plant: x.id });
  }
  let best: { req: OrderRequest; payback: number } | null = null;
  for (const req of reqs) {
    const q = orderQuote(w, req, p.researched);
    if ("refusal" in q) continue;
    const net = q.cost - q.sale;
    if (q.cost > w.balance + q.sale) continue;
    const gain = dividendPerDay(input(p, after(base, req, w.nextId))) - now;
    if (!(gain > 0)) continue;
    const payback = Math.max(0, net) / gain;
    if (payback > MAX_PAYBACK_DAYS) continue;
    if (!best || payback < best.payback) best = { req, payback };
  }
  return best?.req ?? null;
}

function describe(plants: SisterPlant[]): string {
  const n = (t: SisterType) => plants.filter((x) => x.type === t && x.project?.kind !== "bygg").length;
  const done = plants.filter((x) => x.project?.kind !== "bygg");
  const avg = done.length ? done.reduce((a, x) => a + x.level, 0) / done.length : 0;
  return `${n("stalverk")} stål / ${n("storverk")} stor / ${n("kompleks")} kompl., snitt trinn ${avg.toFixed(1)}`;
}

export function simulate(p: SimProfile, days: number, checkpoints: number[]): SimResult {
  const w: KonsernWorld = {
    plants: p.plants.map((x) => ({ ...x })),
    orders: [],
    nextId: Math.max(0, ...p.plants.map((x) => x.id)) + 1,
    level: p.level,
    floor: p.floor,
    balance: p.balance,
  };
  const rows: SimRow[] = [];
  const levelDays: (number | null)[] = LADDER.map((_, i) => (ladderLevel(w.plants) > i ? 0 : null));
  let spent = 0;
  let companyToday = 0;
  for (let h = 0; h < days * 24; h++) {
    const now = h * HOUR;
    settleWorld(w, now);
    const earned = ladderLevel(w.plants);
    for (let i = 0; i < earned; i++) if (levelDays[i] === null) levelDays[i] = Math.ceil(now / DAY);
    // Fyll køen
    for (;;) {
      if (w.orders.length >= 3) break;
      const req = bestOrder(w, p);
      if (!req) break;
      const r = placeOrder(w, req, p.researched, now);
      if (!r.ok) break;
      spent += r.order.cost;
    }
    // Ved midnatt: bidrag, utbytte og selskapsinntekt for dagen som gikk
    if ((h + 1) % 24 === 0) {
      const day = (h + 1) / 24;
      const dividend = dividendPerDay(input(p, w.plants));
      companyToday = 0;
      if (p.company) {
        // Eier selskapet i perioder på 14 dager; betaler budet når en periode starter
        const period = 14 / p.company.share;
        const inPeriod = (day - 1) % period < 14;
        if (inPeriod) companyToday = p.company.perDay;
        if ((day - 1) % period === 0) w.balance -= p.company.bid;
      }
      w.balance += p.contribution + dividend + companyToday;
      if (checkpoints.includes(day))
        rows.push({
          day,
          balance: w.balance,
          contribution: p.contribution,
          dividend,
          company: companyToday,
          plants: describe(w.plants),
          queue: w.orders.length,
          spent,
          earned: ladderLevel(w.plants),
          effective: Math.max(w.level, w.floor, ladderLevel(w.plants)),
        });
    }
  }
  return { rows, levelDays };
}

/** Spillertypene (kalibrert mot ekte tall 30.9.2026; navnene er typer, ikke spillere) */
export function profiles(): SimProfile[] {
  const legacyPlants = [
    ...[1, 2, 3, 4].map((i) => plant(i, "kompleks", 5)),
    ...[5, 6, 7, 8, 9].map((i) => plant(i, "kompleks", 0)),
    ...[10, 11, 12].map((i) => plant(i, "stalverk", 0)),
  ];
  const legacy = {
    contribution: 22_500_000,
    researched: FULL_RESEARCH,
    shared: 2,
    plants: legacyPlants,
    balance: 47_000_000,
  };
  // Komplekser kjøpt med gulvet fra før, uten modernisering (opptjent nivå 0)
  const cheap = {
    contribution: 9_000_000,
    researched: FULL_RESEARCH,
    shared: 2,
    plants: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => plant(i, "kompleks", 0)),
    balance: 30_000_000,
  };
  return [
    {
      name: "Liten (ny, bidrag 5 mill./dag, uten «Større konsern»)",
      contribution: 5_000_000,
      researched: ["konsernstyring", "oppkjop", "standardverk"],
      shared: 2,
      plants: [],
      balance: 0,
      floor: 0,
      level: 0,
    },
    {
      name: "Middels (ny, bidrag 15 mill./dag)",
      contribution: 15_000_000,
      researched: FULL_RESEARCH,
      shared: 2,
      plants: [],
      balance: 0,
      floor: 0,
      level: 0,
    },
    {
      name: "Stor (ny, bidrag 30 mill./dag)",
      contribution: 30_000_000,
      researched: FULL_RESEARCH,
      shared: 2,
      plants: [],
      balance: 0,
      floor: 0,
      level: 0,
    },
    {
      name: "Stor + skraplager halve tida (15 mill./dag, bud 100 mill. per periode)",
      contribution: 30_000_000,
      researched: FULL_RESEARCH,
      shared: 2,
      plants: [],
      balance: 0,
      floor: 0,
      level: 0,
      company: { perDay: 15_000_000, share: 0.5, bid: 100_000_000 },
    },
    { name: "Etablert legacy (12 verk, gulv 6) – dagens regler", ...legacy, floor: 6, level: 6 },
    {
      name: "Etablert legacy – bare opptjent nivå (forslaget)",
      ...legacy,
      floor: 0,
      level: ladderLevel(legacyPlants),
    },
    { name: "Legacy med komplekser på trinn 0 (10 stk., gulv 3) – dagens regler", ...cheap, floor: 3, level: 3 },
    { name: "Legacy med komplekser på trinn 0 – bare opptjent nivå (forslaget)", ...cheap, floor: 0, level: 0 },
  ];
}

function mill(n: number): string {
  return (n / 1e6).toLocaleString("nb-NO", { maximumFractionDigits: 0 });
}

function main(): void {
  const args = process.argv.slice(2);
  const i = args.indexOf("--dager");
  const days = i >= 0 ? Number(args[i + 1]) : 180;
  const checkpoints = [30, 60, 90, 180, 365].filter((d) => d <= days);
  console.log(
    `Priser: stålverk ${mill(5e6)}, storverk ${mill(20e6)}, kompleks ${mill(60e6)} mill. · kø 3 · plasser ${slotsAt(0, false)}/${slotsAt(0, true)}+ · trinn ${modMaxAt(0)}–${modMaxAt(7)} · tilbakebetaling ≤ ${MAX_PAYBACK_DAYS} dager\n`,
  );
  for (const p of profiles()) {
    const r = simulate(p, days, checkpoints);
    console.log(`== ${p.name}`);
    console.log("dag | kasse | bidrag/d | utbytte/d | selskap/d | verk | kø | brukt | nivå (opptj./med gulv)");
    for (const row of r.rows)
      console.log(
        `${String(row.day).padStart(3)} | ${mill(row.balance).padStart(6)} | ${mill(row.contribution).padStart(3)} | ${mill(row.dividend).padStart(4)} | ${mill(row.company).padStart(3)} | ${row.plants} | ${row.queue} | ${mill(row.spent).padStart(6)} | ${row.earned}/${row.effective}`,
      );
    console.log(
      "Nivå nådd (ekte dag): " +
        LADDER.map((s, n) => `${s.title} ${r.levelDays[n] === null ? "–" : r.levelDays[n]}`).join(", ") +
        "\n",
    );
  }
}

if (process.argv[1]?.endsWith("worldSim.ts")) main();
