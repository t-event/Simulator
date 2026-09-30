/**
 * Simulering av konsernprogrammene (B-388): to økonomiske modeller for K-1, sammenlignet før noe bygges
 * (KONSERNKAPITAL-FORSLAG.md, eierens svar B-387). Ingenting her brukes av spillet.
 *
 *   A – store permanente trinn: trinn 1–3 kjøpes (f.eks. 0,5 / 1,5 / 4 mrd.), to programmer aktive, et bytte taper alt.
 *   B – aktivt programbudsjett: programmet etableres i prosjektlinja (engangssum og noen dager), og koster så et løpende
 *       budsjett per ekte dag på lav, middels eller høy satsing. Bundet i minst `bindDays` før det kan endres.
 *
 * Inntekten per spillertype kommer fra verdenssimulatoren (`worldSim.ts`): dagen konsernet er ferdig utbygd, bidraget og
 * utbyttet. Programmene starter når konsernet er ferdig utbygd (før det brukes pengene på verk).
 *
 * Verden i simuleringen (fast, samme for alle modeller, ingen tilfeldighet):
 *   - strømkriser (Teknologi er verdt mye), urolige perioder (Robusthet er verdt mye), et nytt selskap åpner i en region
 *     (Marked er verdt mye i 60 dager), verksjefer finnes fra dag 180 (Arbeidsmiljø er verdt mer);
 *   - et oppkjøpsvindu hver 45. dag: har spilleren råd til et maksbud (1,7 mrd.) uten å selge noe?
 *
 * Programmenes verdi i penger er med vilje satt rundt null over tid (ingen er «riktig for alle hele tiden»): hvert
 * program er verdt mye i sin situasjon og lite ellers. Det de gir utenom penger (regional styrke, lojalitet,
 * Industrimakt), er ikke med i kronene – derfor er det spillerens valg, ikke en regnemaskin, som avgjør til slutt.
 *
 *   npx tsx src/game/programSim.ts            # begge modellene, alle spillertypene, 730 dager
 *   npx tsx src/game/programSim.ts --skann            # B med budsjett som andel av utbyttet
 *   npx tsx src/game/programSim.ts --skann-inntekt    # B med budsjett som andel av hele inntekten (anbefalt)
 */
import { MAX_BID, profiles, simulate } from "./worldSim";

declare const process: { argv: string[] };

export type ProgramId = "drift" | "robust" | "marked" | "teknologi" | "arbeid";
export const PROGRAMS: ProgramId[] = ["drift", "robust", "marked", "teknologi", "arbeid"];
export const PROGRAM_NAMES: Record<ProgramId, string> = {
  drift: "Driftsytelse",
  robust: "Robusthet",
  marked: "Marked og region",
  teknologi: "Teknologi",
  arbeid: "Arbeidsmiljø",
};

/** Hva som skjer i verden en gitt dag (samme tidslinje for alle spillere og modeller) */
export interface WorldDay {
  energyCrisis: boolean;
  unrest: boolean;
  newCompany: boolean;
  managers: boolean;
  takeoverWindow: boolean;
}

export function worldDay(d: number): WorldDay {
  const inRange = (ranges: [number, number][]) => ranges.some(([a, b]) => d >= a && d < b);
  return {
    energyCrisis: inRange([
      [100, 150],
      [330, 390],
      [560, 610],
    ]),
    unrest: inRange([
      [200, 240],
      [450, 490],
      [650, 690],
    ]),
    newCompany: inRange([
      [120, 180],
      [300, 360],
      [480, 540],
    ]),
    managers: d >= 180,
    takeoverWindow: d > 0 && d % 45 === 0,
  };
}

/**
 * Hva et program er verdt i kroner per dag som andel av utbyttet, ved full effekt (høy satsing / trinn 3). Negative tall
 * er ulemper (Driftsytelse gir mer, men tåler uro dårligere).
 */
export function programValue(p: ProgramId, w: WorldDay): number {
  switch (p) {
    case "drift":
      return w.unrest ? -0.1 : 0.14;
    case "robust":
      return w.unrest ? 0.45 : 0.02;
    case "marked":
      return w.newCompany ? 0.4 : 0.05;
    case "teknologi":
      return w.energyCrisis ? 0.5 : 0.04;
    case "arbeid":
      return (w.managers ? 0.08 : 0.03) + (w.unrest ? 0.1 : 0);
  }
}

export interface Player {
  name: string;
  fullDay: number;
  /** Inntekt per ekte dag når konsernet er fullt: bidrag og utbytte */
  contribution: number;
  dividend: number;
  /** Konsernkassa den dagen konsernet ble ferdig */
  cashAtFull: number;
}

export interface SimOut {
  cash: Record<number, number>;
  spent: number;
  income: number;
  /** Oppkjøpsvinduer der spilleren hadde råd til et maksbud, av alle vinduer etter at konsernet var fullt */
  bids: { can: number; of: number };
  switches: number;
  /** Andel av inntekten (etter fullt konsern) som gikk til programmer */
  share: number;
  /** Hvilke programmer som var aktive, dag for dag (for å se om valgene endrer seg) */
  timeline: string[];
}

const CHECK = [180, 365, 730];

/**
 * Modell A: store permanente trinn. Spilleren bruker programmene (for det de gir utenom penger) og kjøper neste trinn i
 * sine to programmer så snart kassa tåler det over krigskassa. Et bytte krever at det nye programmet kjøpes fra trinn 1
 * igjen; spilleren bytter bare når det nye programmet er verdt mer i resten av situasjonen enn det koster å bygge opp.
 */
export function simulateA(
  pl: Player,
  opt: { costs: [number, number, number]; effect: [number, number, number]; days: number; reserve: number },
): SimOut {
  const active = new Map<ProgramId, number>(); // program → trinn
  let cash = pl.cashAtFull;
  let spent = 0;
  let income = 0;
  let switches = 0;
  const cashAt: Record<number, number> = {};
  const bids = { can: 0, of: 0 };
  const timeline: string[] = [];
  // Snittverdien fra i dag og ut: A-spilleren binder seg lenge, så valget skjer på det gjennomsnittlige
  const avgFrom = (p: ProgramId, from: number, to: number) => {
    let s = 0;
    for (let d = from; d < to; d++) s += programValue(p, worldDay(d));
    return s / Math.max(1, to - from);
  };
  for (let d = 1; d <= opt.days; d++) {
    if (d >= pl.fullDay) {
      const w = worldDay(d);
      if (active.size === 0) {
        const pick = [...PROGRAMS].sort((a, b) => avgFrom(b, d, opt.days) - avgFrom(a, d, opt.days)).slice(0, 2);
        for (const p of pick) active.set(p, 0);
      }
      // Bytte: et program som ikke er aktivt, verdt mer de neste 60 dagene enn det koster å bygge det opp igjen
      for (const p of PROGRAMS) {
        if (active.has(p)) continue;
        const weakest = [...active].sort((a, b) => programValue(a[0], w) - programValue(b[0], w))[0];
        const gain =
          (avgFrom(p, d, Math.min(opt.days, d + 60)) - avgFrom(weakest[0], d, Math.min(opt.days, d + 60))) *
          opt.effect[2] *
          pl.dividend *
          60;
        const rebuild = opt.costs[0] + opt.costs[1] + opt.costs[2];
        if (gain > rebuild && cash - rebuild >= opt.reserve) {
          active.delete(weakest[0]);
          active.set(p, 0);
          switches++;
        }
      }
      // Kjøp neste trinn når kassa tåler det
      for (const [p, lvl] of active) {
        if (lvl >= 3) continue;
        const cost = opt.costs[lvl];
        if (cash - cost >= opt.reserve) {
          cash -= cost;
          spent += cost;
          active.set(p, lvl + 1);
        }
      }
      let value = 0;
      for (const [p, lvl] of active) if (lvl > 0) value += opt.effect[lvl - 1] * programValue(p, w) * pl.dividend;
      cash += pl.contribution + pl.dividend + value;
      income += pl.contribution + pl.dividend;
      if (w.takeoverWindow) {
        bids.of++;
        if (cash >= MAX_BID) bids.can++;
      }
      timeline.push([...active].map(([p, l]) => `${p}${l}`).join("+"));
    } else {
      timeline.push("");
    }
    if (CHECK.includes(d)) cashAt[d] = cash;
  }
  return { cash: cashAt, spent, income, bids, switches, share: spent / Math.max(1, income), timeline };
}

export type Level = 0 | 1 | 2 | 3;
/** Budsjettet per dag som andel av utbyttet, og effekten som andel av full effekt, for lav / middels / høy */
export interface BudgetModel {
  budget: [number, number, number];
  effect: [number, number, number];
  establish: number;
  establishDays: number;
  bindDays: number;
  /** Hva budsjettet regnes av: utbyttet, eller hele inntekten i konsernkassa (bidrag + utbytte) */
  base?: "utbytte" | "inntekt";
}

/**
 * Modell B: aktivt budsjett. Spilleren har alltid to programmer. Når bindingen er ute, bytter hen det svakeste mot et
 * som er verdt mer i situasjonen nå (og som varer minst like lenge som bindingen), og velger satsing etter kassa:
 * høy hvis kassa tåler 60 dager med høy satsing over krigskassa, ellers middels, ellers lav.
 */
export function simulateB(pl: Player, m: BudgetModel, opt: { days: number; reserve: number; fixed?: Level }): SimOut {
  type Slot = { p: ProgramId; lvl: Level; readyDay: number; lockedUntil: number };
  let slots: Slot[] = [];
  let cash = pl.cashAtFull;
  let spent = 0;
  let income = 0;
  let switches = 0;
  const cashAt: Record<number, number> = {};
  const bids = { can: 0, of: 0 };
  const timeline: string[] = [];
  const lasts = (p: ProgramId, d: number) => {
    const v = programValue(p, worldDay(d));
    for (let k = 1; k < m.bindDays; k++) if (programValue(p, worldDay(d + k)) < v) return false;
    return true;
  };
  const baseKr = m.base === "inntekt" ? pl.contribution + pl.dividend : pl.dividend;
  const levelFor = (): Level => {
    if (opt.fixed) return opt.fixed;
    for (const lvl of [3, 2] as Level[]) if (cash - opt.reserve >= 60 * 2 * m.budget[lvl - 1] * baseKr) return lvl;
    return 1;
  };
  for (let d = 1; d <= opt.days; d++) {
    if (d >= pl.fullDay) {
      const w = worldDay(d);
      const ranked = [...PROGRAMS].sort((a, b) => programValue(b, w) - programValue(a, w));
      for (const p of ranked.slice(0, 2)) {
        if (slots.some((s) => s.p === p)) continue;
        const free = slots.length < 2;
        const weakest = slots
          .filter((s) => d >= s.lockedUntil && programValue(s.p, w) < programValue(p, w) && lasts(p, d))
          .sort((a, b) => programValue(a.p, w) - programValue(b.p, w))[0];
        if (!free && !weakest) continue;
        if (!free) {
          slots = slots.filter((s) => s !== weakest);
          switches++;
        }
        slots.push({ p, lvl: levelFor(), readyDay: d + m.establishDays, lockedUntil: d + m.bindDays });
        cash -= m.establish;
        spent += m.establish;
      }
      // Satsingen følger kassa når bindingen er ute
      for (const s of slots)
        if (d >= s.lockedUntil) {
          const lvl = levelFor();
          if (lvl !== s.lvl) {
            s.lvl = lvl;
            s.lockedUntil = d + m.bindDays;
          }
        }
      let value = 0;
      let cost = 0;
      for (const s of slots) {
        cost += m.budget[s.lvl - 1] * baseKr;
        if (d >= s.readyDay) value += m.effect[s.lvl - 1] * programValue(s.p, w) * pl.dividend;
      }
      cash += pl.contribution + pl.dividend + value - cost;
      spent += cost;
      income += pl.contribution + pl.dividend;
      if (w.takeoverWindow) {
        bids.of++;
        if (cash >= MAX_BID) bids.can++;
      }
      timeline.push(slots.map((s) => `${s.p}${s.lvl}`).join("+"));
    } else {
      timeline.push("");
    }
    if (CHECK.includes(d)) cashAt[d] = cash;
  }
  return { cash: cashAt, spent, income, bids, switches, share: spent / Math.max(1, income), timeline };
}

/** Uten programmer: bare inntekten (samme utgangspunkt som modellene) */
export function simulateNone(pl: Player, days: number): SimOut {
  let cash = pl.cashAtFull;
  let income = 0;
  const cashAt: Record<number, number> = {};
  const bids = { can: 0, of: 0 };
  for (let d = 1; d <= days; d++) {
    if (d >= pl.fullDay) {
      cash += pl.contribution + pl.dividend;
      income += pl.contribution + pl.dividend;
      if (worldDay(d).takeoverWindow) {
        bids.of++;
        if (cash >= MAX_BID) bids.can++;
      }
    }
    if (CHECK.includes(d)) cashAt[d] = cash;
  }
  return { cash: cashAt, spent: 0, income, bids, switches: 0, share: 0, timeline: [] };
}

/** Spillertypene fra verdenssimulatoren: når konsernet er fullt, og inntekten da */
export function players(days = 730): Player[] {
  return profiles()
    .slice(0, 3)
    .map((p) => {
      const r = simulate(p, days, [days]);
      const fullDay = r.fullDay ?? days;
      const atFull = simulate(p, fullDay, [fullDay]).rows[0];
      return {
        name: p.name.split(" (")[0],
        fullDay,
        contribution: p.contribution,
        dividend: r.rows[r.rows.length - 1].dividend,
        cashAtFull: atFull?.balance ?? 0,
      };
    });
}

export const MODEL_A = {
  costs: [500e6, 1500e6, 4000e6] as [number, number, number],
  effect: [0.25, 0.6, 1] as [number, number, number],
  days: 730,
  reserve: 0,
};

/** Anbefalt utgangspunkt fra skanningen (B-388): budsjett som andel av hele inntekten, lav 4 % / middels 12 % / høy 30 % */
export const MODEL_B: BudgetModel = {
  budget: [0.04, 0.12, 0.3],
  effect: [0.25, 0.6, 1],
  establish: 150e6,
  establishDays: 3,
  bindDays: 14,
  base: "inntekt",
};

function mrd(n: number): string {
  return (n / 1e9).toLocaleString("nb-NO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function changes(t: string[]): number {
  let n = 0;
  for (let i = 1; i < t.length; i++) if (t[i] && t[i - 1] && t[i] !== t[i - 1]) n++;
  return n;
}

function main(): void {
  const args = process.argv.slice(2);
  const ps = players();
  if (args.includes("--skann-inntekt")) {
    console.log("B med budsjett som andel av hele inntekten (bidrag + utbytte) per program, binding 14 dager:\n");
    for (const budget of [
      [0.04, 0.12, 0.3],
      [0.05, 0.15, 0.4],
      [0.06, 0.18, 0.45],
    ] as [number, number, number][]) {
      for (const fixed of [2, 3] as Level[])
        for (const pl of ps) {
          const r = simulateB(pl, { ...MODEL_B, budget, base: "inntekt" }, { days: 730, reserve: 0, fixed });
          const perDay = (pl.contribution + pl.dividend) * (1 - 2 * budget[fixed - 1]);
          console.log(
            `${budget.map((b) => `${Math.round(b * 100)} %`).join("/")} ${fixed === 2 ? "to middels" : "to høy   "} ${pl.name.padEnd(8)} andel ${Math.round(r.share * 100)} % · kasse 180/365/730 ${mrd(r.cash[180])}/${mrd(r.cash[365])}/${mrd(r.cash[730])} mrd. · maksbud mulig ${r.bids.can}/${r.bids.of} · spare til ett maksbud: ${Math.round(MAX_BID / Math.max(1, perDay))} dager`,
          );
        }
      console.log("");
    }
    return;
  }
  if (args.includes("--skann")) {
    console.log("B med ulike satsinger (lav/middels/høy som andel av utbyttet per program), binding 14 dager:\n");
    for (const budget of [
      [0.03, 0.08, 0.18],
      [0.05, 0.12, 0.25],
      [0.07, 0.16, 0.32],
    ] as [number, number, number][]) {
      for (const pl of ps) {
        const r = simulateB(pl, { ...MODEL_B, budget }, { days: 730, reserve: 2e9 });
        console.log(
          `${budget.map((b) => `${Math.round(b * 100)} %`).join("/")} ${pl.name.padEnd(8)} andel ${Math.round(r.share * 100)} % · kasse 365/730 ${mrd(r.cash[365])}/${mrd(r.cash[730])} mrd. · maksbud mulig ${r.bids.can}/${r.bids.of} · endringer ${changes(r.timeline)}`,
        );
      }
    }
    return;
  }
  console.log(
    `Modell A: trinn ${MODEL_A.costs.map(mrd).join(" / ")} mrd., effekt ${MODEL_A.effect.join(" / ")}, to programmer kjøpt opp så fort kassa tåler det.`,
  );
  console.log(
    `Modell B: satsing ${MODEL_B.budget.map((b) => `${Math.round(b * 100)} %`).join(" / ")} av ${MODEL_B.base === "inntekt" ? "inntekten" : "utbyttet"} per dag, etablering ${mrd(MODEL_B.establish)} mrd. og ${MODEL_B.establishDays} dager, binding ${MODEL_B.bindDays} dager.\n`,
  );
  for (const pl of ps) {
    const none = simulateNone(pl, 730);
    const a = simulateA(pl, MODEL_A);
    const aKasse = simulateA(pl, { ...MODEL_A, reserve: 2e9 });
    const b = simulateB(pl, MODEL_B, { days: 730, reserve: 0 });
    const bKasse = simulateB(pl, MODEL_B, { days: 730, reserve: 2e9 });
    const bMid = simulateB(pl, MODEL_B, { days: 730, reserve: 0, fixed: 2 });
    const bHigh = simulateB(pl, MODEL_B, { days: 730, reserve: 0, fixed: 3 });
    console.log(
      `== ${pl.name}: ferdig utbygd dag ${pl.fullDay}, inntekt ${Math.round((pl.contribution + pl.dividend) / 1e6)} mill./dag (utbytte ${Math.round(pl.dividend / 1e6)})`,
    );
    for (const [label, r] of [
      ["Uten programmer", none],
      ["A (permanente trinn)", a],
      ["A med krigskasse 2 mrd.", aKasse],
      ["B, to på middels", bMid],
      ["B, to på høy", bHigh],
      ["B, satsing etter kassa", b],
      ["B med krigskasse 2 mrd.", bKasse],
    ] as [string, SimOut][]) {
      console.log(
        `${label.padEnd(24)} kasse 180/365/730: ${mrd(r.cash[180] ?? 0)} / ${mrd(r.cash[365])} / ${mrd(r.cash[730])} mrd. · brukt ${mrd(r.spent)} mrd. (${Math.round(r.share * 100)} % av inntekten) · maksbud mulig ${r.bids.can} av ${r.bids.of} vinduer · programendringer ${changes(r.timeline)}`,
      );
    }
    const firstYear = a.timeline.filter((x, i) => i < 365 && x).slice(-1)[0] ?? "–";
    console.log(`   A etter ett år: ${firstYear} (ingen bytter: ${a.switches === 0 ? "ja" : "nei"})`);
    const seen = new Set(b.timeline.filter(Boolean).flatMap((x) => x.split("+").map((y) => y.replace(/\d/, ""))));
    console.log(`   B brukte programmene: ${[...seen].map((x) => PROGRAM_NAMES[x as ProgramId]).join(", ")}\n`);
  }
}

if (process.argv[1]?.endsWith("programSim.ts")) main();
