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
 *   npx tsx src/game/programSim.ts --k1               # K-1 slik den foreslås bygget: ekte hendelser i regionene (B-389)
 *   npx tsx src/game/programSim.ts --k1-skann         # … med større hendelser og andre satsinger
 *   npx tsx src/game/programSim.ts --k1-drift         # Driftsytelse: opp ved høykonjunktur, ned før sjokk (B-390)
 *   npx tsx src/game/programSim.ts --k1-kost          # bidrag mot utbytte: hvem betaler hvor mye for å beskytte hva (B-391)
 *   npx tsx src/game/programSim.ts --k1-verdi         # Konsernverdi med og uten program, 90/180/365 dager (B-391)
 *   npx tsx src/game/programSim.ts --k1-verdi-skann   # … etter et år med lavere satser og sterkere vern (B-392)
 *   npx tsx src/game/programSim.ts --k1-etablering    # løpende kostnad mot etablering, sjelden og aktiv bytter (B-393)
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

/* ---------------------------------------------------------------------------------------------------------------
 * K-1 slik den er foreslått bygget (B-389): modell B med ekte hendelser i regionene, ikke plassholdere.
 *
 * Serveren har i dag ingen hendelser i konsernverdenen (utbyttet regnes fast av det lagrede spillet). Programmene
 * Teknologi, Robusthet og Driftsytelse trenger derfor et lite hendelseslag: strømsjokk og driftsuro i én region om gangen
 * (utbyttet fra verkene der går ned), og høykonjunktur (det går opp). Høykonjunkturen er satt så verden er nøytral i
 * snitt: uten programmer får spilleren like mye som uten hendelser, bare mer ujevnt. Hendelsene varsles to dager før.
 *
 * Budsjettet trekkes som andel av hver vanlige utbetaling (bidrag + utbytte før hendelser og programmer), så det aldri
 * kan mangle penger, og står verket stille (ingen utbetaling), står programmet stille også.
 * --------------------------------------------------------------------------------------------------------------- */

export type EventKind = "strom" | "uro" | "konjunktur";
export interface RegionEvent {
  region: number;
  kind: EventKind;
  warn: number;
  start: number;
  end: number;
}

export interface K1Model {
  regions: number;
  /** Snitt ekte dager mellom to hendelser i samme region */
  gapDays: number;
  warnDays: number;
  /** Andel av utbyttet i regionen som forsvinner, og hvor lenge */
  strom: { size: number; days: [number, number] };
  uro: { size: number; days: [number, number] };
  /** Lav / middels / høy: budsjett som andel av vanlig inntekt, og effekt som andel av full effekt */
  budget: [number, number, number];
  effect: [number, number, number];
  /** Teknologi (strømsjokk) og Robusthet (uro) på full effekt tar bort så stor del av tapet */
  protect: number;
  /** Driftsytelse gir så mange ganger budsjettet i ekstra inntekt, og hendelser rammer (1 + dette × effekt) hardere */
  driftGain: number;
  driftHarder: number;
  /** Variant som ikke er foreslått: Driftsytelse forsterker også høykonjunkturen (× effekt). 0 i forslaget */
  driftBoom: number;
  /** Høykonjunkturen varer så lenge */
  boomDays: [number, number];
  /**
   * Andelen av hendelsene som er høykonjunktur / driftsuro / strømsjokk, ellers og om vinteren (nov.–mars). Summen er 1.
   * Hyppigheten av hendelser er den samme hele året (`gapDays`); vinteren endrer bare hvilken type det blir.
   */
  mix: { normal: [number, number, number]; winter: [number, number, number] };
  establishDays: number;
  /** Etableringen koster så mange dager vanlig inntekt */
  establishIncomeDays: number;
  bindDays: number;
  /**
   * Hva programkostnaden (og etableringen og Driftsytelses ekstra) regnes av: normalt datterverksutbytte (eieren, B-392 –
   * programmene virker på datterverkene), eller bidrag + utbytte som før (bare for sammenligning)
   */
  costBase: "utbytte" | "inntekt";
}

export const K1: K1Model = {
  regions: 6,
  gapDays: 45,
  warnDays: 2,
  strom: { size: 0.4, days: [8, 12] },
  uro: { size: 0.35, days: [5, 9] },
  // Eierens valg (B-393): 0,5 / 1,5 / 4 % – foreløpig, justeres med skyggedataene fra V0 (1/3/8 % før, B-390)
  budget: [0.005, 0.015, 0.04],
  effect: [0.25, 0.6, 1],
  protect: 0.8,
  driftGain: 1.05,
  driftHarder: 0.5,
  driftBoom: 0,
  boomDays: [10, 16],
  // Strømsjokk er 25 % av hendelsene ellers og 40 % om vinteren: 1,6 ganger så vanlig, ikke dobbelt (B-391)
  mix: { normal: [0.5, 0.25, 0.25], winter: [0.4, 0.2, 0.4] },
  establishDays: 3,
  establishIncomeDays: 2,
  bindDays: 14,
  costBase: "utbytte",
};

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dag 1 = 2.10.2026; vinter er nov.–mars (flere strømsjokk, se `K1Model.mix`) */
function winter(d: number): boolean {
  const m = new Date(Date.UTC(2026, 9, 1 + d)).getUTCMonth();
  return m >= 10 || m <= 2;
}

/** Andelen av året som er vinter (nov.–mars) */
const WINTER_SHARE = 5 / 12;

/**
 * Størrelsen på høykonjunkturen regnet av hyppighetene og størrelsene i modellen – forventet verdi for verden, ikke
 * etterregnet av hendelsene som faktisk ble trukket (eieren, B-390: høykonjunktur er en verdenshendelse, ingen
 * kompensasjon). Serveren skal regne den på samme måte fra config.
 */
export function k1BoomSize(m: K1Model): number {
  const avg = (d: [number, number]) => (d[0] + d[1]) / 2;
  let bad = 0;
  let boom = 0;
  for (const [share, [pBoom, pUro, pStrom]] of [
    [1 - WINTER_SHARE, m.mix.normal],
    [WINTER_SHARE, m.mix.winter],
  ] as [number, [number, number, number]][]) {
    bad += share * (pStrom * m.strom.size * avg(m.strom.days) + pUro * m.uro.size * avg(m.uro.days));
    boom += share * pBoom * avg(m.boomDays);
  }
  return bad / boom;
}

/** Hendelsene i verden i `days` dager, og størrelsen på høykonjunkturen */
export function k1Events(m: K1Model, days: number, seed = 1): { events: RegionEvent[]; boom: number } {
  const rnd = mulberry(seed);
  const events: RegionEvent[] = [];
  for (let r = 0; r < m.regions; r++) {
    let d = 1 + Math.floor(rnd() * m.gapDays);
    while (d < days) {
      // Typen trekkes fra fordelingen i `mix` (ellers 50/25/25, vinter 40/20/40)
      const [pBoom, pUro] = winter(d) ? m.mix.winter : m.mix.normal;
      const x = rnd();
      const kind: EventKind = x < pBoom ? "konjunktur" : x < pBoom + pUro ? "uro" : "strom";
      const span = kind === "strom" ? m.strom.days : kind === "uro" ? m.uro.days : m.boomDays;
      const len = span[0] + Math.floor(rnd() * (span[1] - span[0] + 1));
      events.push({ region: r, kind, warn: d - m.warnDays, start: d, end: d + len });
      d += len + Math.floor(m.gapDays * (0.5 + rnd()));
    }
  }
  return { events, boom: k1BoomSize(m) };
}

type K1Program = "drift" | "robust" | "teknologi";
interface K1Slot {
  p: K1Program;
  lvl: Level;
  /** Satsingen fra i morgen (økning virker fra neste utbetaling) */
  next: Level;
  readyDay: number;
  lockedUntil: number;
}

export type K1Strategy =
  | "ingen"
  | "fast"
  | "forsikring"
  | "drift"
  | "drift-hoy"
  | "drift-lav"
  | "drift-boom"
  | "drift-flukt"
  | "tek-hoy"
  | "tek-varsel"
  | "bytter";
export const K1_STRATEGIES: Record<K1Strategy, string> = {
  ingen: "Uten programmer",
  fast: "Teknologi + Robusthet, middels hele tida",
  forsikring: "Teknologi + Robusthet på lav, høy ved varsel",
  drift: "Driftsytelse middels + Robusthet lav, høy ved varsel",
  "drift-hoy": "Driftsytelse høy + Teknologi lav, høy ved varsel",
  "drift-lav": "Driftsytelse lav + Teknologi lav, fast",
  "drift-boom": "Driftsytelse lav, høy ved varsel om høykonjunktur",
  "drift-flukt": "Driftsytelse høy, ned til lav ved varsel om sjokk/uro",
  "tek-hoy": "Bare Teknologi, høy hele tida",
  "tek-varsel": "Bare Teknologi, lav, høy ved varsel",
  bytter: "Ett program på høy, byttes til det varselet gjelder",
};

export interface K1Out {
  cash: Record<number, number>;
  /** Andel av inntekten som gikk til programmer (etablering og budsjett) */
  share: number;
  /** Tapt utbytte i hendelser uten programmer, og det programmene tok bort (negativt for Driftsytelse) */
  eventLoss: number;
  saved: number;
  driftExtra: number;
  /** Laveste inntekt i 14 dager, som andel av snittet for samme strategi (hvor ujevnt pengene kommer) */
  worst14: number;
  changes: number;
  /** Alt som ble brukt på programmer (etablering og budsjett) */
  spent: number;
  /** … av det til etablering (B-393: måles for seg) */
  establishSpent: number;
  /** Antall ganger et program ble byttet ut med et annet */
  swaps: number;
  /** Utbytte som kunne vært tapt i hendelsene programmene dekker (strømsjokk og uro), før programmene */
  exposed: number;
  /** … av det bare i strømsjokk (det Teknologi dekker) */
  exposedStrom: number;
  /** Ekstra tap fordi Driftsytelse var på da en hendelse traff */
  driftHarm: number;
  /** Varsler om sjokk/uro der spilleren ville ned med Driftsytelse, men var bundet */
  blocked: number;
}

export function simulateK1(
  pl: Player,
  weights: number[],
  strategy: K1Strategy,
  m: K1Model,
  world: { events: RegionEvent[]; boom: number },
  days = 730,
  checks: number[] = CHECK,
): K1Out {
  const income0 = pl.contribution + pl.dividend;
  // Grunnlaget for programkostnaden: normalt datterverksutbytte før hendelser og programmer (B-392)
  const base = m.costBase === "utbytte" ? pl.dividend : income0;
  let cash = pl.cashAtFull;
  let spent = 0;
  let income = 0;
  let eventLoss = 0;
  let lossStrom = 0;
  let saved = 0;
  let driftExtra = 0;
  let changes = 0;
  let driftHarm = 0;
  let blocked = 0;
  const warnedSeen = new Set<RegionEvent>();
  const window: number[] = [];
  let worst14 = Infinity;
  let gotSum = 0;
  let gotDays = 0;
  const cashAt: Record<number, number> = {};
  let slots: K1Slot[] = [];
  const eff = (p: K1Program, d: number) => {
    const s = slots.find((x) => x.p === p && d >= x.readyDay);
    return s ? m.effect[s.lvl - 1] : 0;
  };
  let establishSpent = 0;
  let swaps = 0;
  const start = (p: K1Program, lvl: Level, d: number) => {
    slots.push({ p, lvl, next: lvl, readyDay: d + m.establishDays, lockedUntil: d + m.bindDays });
    const cost = m.establishIncomeDays * base;
    cash -= cost;
    spent += cost;
    establishSpent += cost;
  };
  const guard = (p: K1Program): K1Program | null =>
    p === "teknologi" ? "teknologi" : p === "robust" ? "robust" : null;
  for (let d = 1; d <= days; d++) {
    if (d < pl.fullDay) {
      if (checks.includes(d)) cashAt[d] = cash;
      continue;
    }
    const active = world.events.filter((e) => weights[e.region] > 0 && d >= e.start && d < e.end);
    const warned = world.events.filter((e) => weights[e.region] >= 0.15 && d >= e.warn && d < e.end);
    // Strategiene
    if (strategy !== "ingen" && slots.length === 0) {
      const plan: Record<Exclude<K1Strategy, "ingen">, [K1Program, Level][]> = {
        fast: [
          ["teknologi", 2],
          ["robust", 2],
        ],
        forsikring: [
          ["teknologi", 1],
          ["robust", 1],
        ],
        drift: [
          ["drift", 2],
          ["robust", 1],
        ],
        "drift-hoy": [
          ["drift", 3],
          ["teknologi", 1],
        ],
        "drift-lav": [
          ["drift", 1],
          ["teknologi", 1],
        ],
        "drift-boom": [
          ["drift", 1],
          ["teknologi", 1],
        ],
        "drift-flukt": [
          ["drift", 3],
          ["teknologi", 1],
        ],
        "tek-hoy": [["teknologi", 3]],
        "tek-varsel": [["teknologi", 1]],
        bytter: [["teknologi", 3]],
      };
      for (const [p, l] of plan[strategy]) start(p, l, d);
    }
    // Driftsytelse etter varslene: opp ved høykonjunktur, eller ned før sjokk og uro (bindingen kan sperre)
    const drift = slots.find((s) => s.p === "drift");
    if (drift && strategy === "drift-boom") {
      const boom = warned.some((e) => e.kind === "konjunktur");
      if (boom && drift.next < 3) {
        drift.next = 3;
        drift.lockedUntil = d + m.bindDays;
        changes++;
      } else if (!boom && drift.next === 3 && d >= drift.lockedUntil) {
        drift.next = 1;
        drift.lockedUntil = d + m.bindDays;
        changes++;
      }
    }
    if (drift && strategy === "drift-flukt") {
      const bad = warned.filter((e) => e.kind !== "konjunktur");
      if (bad.length && drift.next > 1) {
        if (d >= drift.lockedUntil) {
          drift.next = 1;
          drift.lockedUntil = d + m.bindDays;
          changes++;
        } else
          for (const e of bad)
            if (!warnedSeen.has(e)) {
              warnedSeen.add(e);
              blocked++;
            }
      } else if (!bad.length && drift.next === 1 && d >= drift.lockedUntil) {
        drift.next = 3;
        drift.lockedUntil = d + m.bindDays;
        changes++;
      }
    }
    // Bytte av program: ett program på høy byttes til det som dekker varselet, når bindingen er ute (ny etablering)
    if (strategy === "bytter" && slots.length === 1 && d >= slots[0].lockedUntil) {
      const want: K1Program | null = warned.some((e) => e.kind === "strom" && d < e.start)
        ? "teknologi"
        : warned.some((e) => e.kind === "uro" && d < e.start)
          ? "robust"
          : null;
      if (want && want !== slots[0].p) {
        slots = [];
        start(want, 3, d);
        swaps++;
        changes++;
      }
    }
    // Teknologi og Robusthet opp ved varsel (i Driftsytelse-testene står Teknologi fast på lav, så de ikke blandes)
    if (strategy === "forsikring" || strategy === "drift" || strategy === "drift-hoy" || strategy === "tek-varsel") {
      for (const s of slots) {
        const g = guard(s.p);
        if (!g) continue;
        const kind: EventKind = g === "teknologi" ? "strom" : "uro";
        const threat = warned.some((e) => e.kind === kind);
        if (threat && s.next < 3) {
          s.next = 3;
          s.lockedUntil = d + m.bindDays;
          changes++;
        } else if (!threat && s.next === 3 && d >= s.lockedUntil) {
          s.next = 1;
          s.lockedUntil = d + m.bindDays;
          changes++;
        }
      }
    }
    // Dagens utbetaling
    let div = 0;
    let divNoProg = 0;
    for (let r = 0; r < m.regions; r++) {
      if (!weights[r]) continue;
      const e = active.find((x) => x.region === r);
      let f = 1;
      let f0 = 1;
      if (e?.kind === "konjunktur") {
        f0 = 1 + world.boom;
        f = 1 + world.boom * (1 + m.driftBoom * eff("drift", d));
      } else if (e) {
        const size = e.kind === "strom" ? m.strom.size : m.uro.size;
        const shield = m.protect * eff(e.kind === "strom" ? "teknologi" : "robust", d);
        f = 1 - size * (1 - shield) * (1 + m.driftHarder * eff("drift", d));
        driftHarm += pl.dividend * weights[r] * size * (1 - shield) * m.driftHarder * eff("drift", d);
        f0 = 1 - size;
        eventLoss += pl.dividend * weights[r] * size;
        if (e.kind === "strom") lossStrom += pl.dividend * weights[r] * size;
      }
      div += pl.dividend * weights[r] * Math.max(0, f);
      divNoProg += pl.dividend * weights[r] * f0;
    }
    saved += div - divNoProg;
    let cost = 0;
    let extra = 0;
    for (const s of slots) {
      if (d < s.readyDay) continue;
      cost += m.budget[s.lvl - 1] * base;
      if (s.p === "drift") extra += m.driftGain * m.budget[s.lvl - 1] * base;
    }
    driftExtra += extra;
    const got = pl.contribution + div + extra - cost;
    cash += got;
    gotSum += got;
    gotDays++;
    spent += cost;
    income += income0;
    window.push(got);
    if (window.length > 14) window.shift();
    if (window.length === 14)
      worst14 = Math.min(
        worst14,
        window.reduce((a, b) => a + b, 0),
      );
    for (const s of slots) s.lvl = s.next;
    slots = slots.filter((s) => s.lvl > 0);
    if (checks.includes(d)) cashAt[d] = cash;
  }
  return {
    cash: cashAt,
    spent,
    establishSpent,
    swaps,
    exposed: eventLoss,
    exposedStrom: lossStrom,
    share: spent / Math.max(1, income),
    eventLoss,
    saved,
    driftExtra,
    worst14: worst14 / Math.max(1, (14 * gotSum) / Math.max(1, gotDays)),
    changes,
    driftHarm,
    blocked,
  };
}

export const EXPOSURES: [string, number[]][] = [
  ["spredt på seks regioner", [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6]],
  ["samlet i to regioner", [0.5, 0.5, 0, 0, 0, 0]],
];
const ONE_REGION: [string, number[]] = ["alt i én region", [1, 0, 0, 0, 0, 0]];

/**
 * Programkostnaden skal regnes av normalinntekten før hendelsen og trekkes for seg (eieren, B-391): samme konsern med
 * samme programmer skal betale nøyaktig like mye i en rolig verden som i en verden der alle regioner har strømsjokk hele
 * tida. Brukes av `npm test` (game/tests.ts).
 */
export function k1CostCheck(m: K1Model = K1): { calm: number; storm: number } {
  const pl: Player = { name: "test", fullDay: 1, contribution: 20e6, dividend: 30e6, cashAtFull: 0 };
  const w = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
  const storm: RegionEvent[] = w.map((_, r) => ({ region: r, kind: "strom", warn: -1, start: 1, end: 400 }));
  const calm = simulateK1(pl, w, "fast", m, { events: [], boom: 0 }, 365).spent;
  const stormy = simulateK1(pl, w, "fast", m, { events: storm, boom: k1BoomSize(m) }, 365).spent;
  return { calm, storm: stormy };
}

/**
 * Programkostnaden regnes av datterverksutbyttet (B-392): to konsern med samme datterverk betaler det samme, uansett hvor
 * stort bidraget fra hovedverket er. Brukes av `npm test`.
 */
export function k1BaseCheck(m: K1Model = K1): { small: number; large: number } {
  const w = [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
  const run = (contribution: number) =>
    simulateK1(
      { name: "test", fullDay: 1, contribution, dividend: 30e6, cashAtFull: 0 },
      w,
      "fast",
      m,
      { events: [], boom: 0 },
      365,
    ).spent;
  return { small: run(2e6), large: run(40e6) };
}

function mill(n: number): string {
  return (n / 1e6).toLocaleString("nb-NO", { maximumFractionDigits: 1 });
}

/**
 * Bidrag mot utbytte (B-391, B-392): hva programmene koster mot utbyttet de verner. Med det nye grunnlaget (utbyttet) er
 * prisen lik for samme datterverk, uansett hvor stort bidraget fra hovedverket er; det gamle grunnlaget vises til
 * sammenligning. «Kostnad per spart krone» og «kostnad / hendelsestap» er tallene skyggerapporten skal vise.
 */
function k1CostReport(m: K1Model, ps: Player[], seeds: number[]): void {
  console.log("Programkostnad mot utbyttet det verner. To år, snitt av verdenene:\n");
  for (const [ex, w] of [...EXPOSURES, ONE_REGION]) {
    console.log(`== ${ex}`);
    for (const pl of ps) {
      for (const costBase of ["utbytte", "inntekt"] as const) {
        const mm = { ...m, costBase };
        const base = costBase === "utbytte" ? pl.dividend : pl.contribution + pl.dividend;
        for (const st of ["tek-hoy", "fast", "forsikring"] as K1Strategy[]) {
          const rs = seeds.map((sd) => simulateK1(pl, w, st, mm, k1Events(mm, 730, sd)));
          const avg = (f: (r: K1Out) => number) => rs.reduce((a, r) => a + f(r), 0) / rs.length;
          const guarded = st === "tek-hoy" ? avg((r) => r.exposedStrom) : avg((r) => r.exposed);
          const perDay = st === "tek-hoy" ? mm.budget[2] * base : st === "fast" ? 2 * mm.budget[1] * base : null;
          console.log(
            `${pl.name.padEnd(8)} ${costBase === "utbytte" ? "nytt (utbytte)  " : "gammelt (inntekt)"} ${K1_STRATEGIES[st].padEnd(46)} bidrag ${mill(pl.contribution)} / utbytte ${mill(pl.dividend)} mill./dag${perDay === null ? "" : ` · ${mill(perDay)} mill./dag = ${Math.round((perDay / pl.dividend) * 1000) / 10} % av utbyttet`} · hendelsestap det verner mot ${mrd(guarded)} mrd. · spart ${mrd(avg((r) => r.saved))} · brukt ${mrd(avg((r) => r.spent))} mrd. · kostnad / hendelsestap ${(avg((r) => r.spent) / Math.max(1, guarded)).toFixed(1)} · kostnad per spart krone ${(
              avg((r) => r.spent) /
              Math.max(
                1,
                avg((r) => r.saved),
              )
            ).toFixed(1)}`,
          );
        }
      }
    }
    console.log("");
  }
}

/**
 * Konsernverdi med og uten program (B-391): samme konsern, samme hendelser. Konsernverdien er kassa + 60 × (normalt
 * utbytte + bidrag) − lån (`konsern_value`); hendelsene er ikke med i det normale utbyttet, så bare kassa skiller.
 */
function k1ValueReport(
  m: K1Model,
  ps: Player[],
  seeds: number[],
  strategies: K1Strategy[] = ["fast", "forsikring", "tek-hoy"],
  after = [90, 180, 365],
): void {
  console.log(`Konsernverdi etter ${after.join("/")} dager fra konsernet er fullt, ${seeds.length} verdener:\n`);
  for (const [ex, w] of [...EXPOSURES, ONE_REGION]) {
    console.log(`== ${ex}`);
    for (const pl of ps) {
      const checks = after.map((a) => pl.fullDay + a);
      const value = (r: K1Out, d: number) => r.cash[d] + 60 * (pl.contribution + pl.dividend);
      const a = seeds.map((sd) => simulateK1(pl, w, "ingen", m, k1Events(m, 730, sd), 730, checks));
      for (const st of strategies) {
        const b = seeds.map((sd) => simulateK1(pl, w, st, m, k1Events(m, 730, sd), 730, checks));
        const cells = checks.map((d, i) => {
          const va = a.map((r) => value(r, d));
          const vb = b.map((r) => value(r, d));
          const mean = (x: number[]) => x.reduce((p, q) => p + q, 0) / x.length;
          const ahead = vb.filter((v, k) => v > va[k]).length;
          // 10 % dårligste verden (4. dårligste av 40)
          const p10 = (x: number[]) => [...x].sort((p, q) => p - q)[Math.floor(x.length / 10)];
          return `${after[i]} d: ${Math.round((mean(vb) / mean(va) - 1) * 1000) / 10} %, B foran i ${ahead}/${seeds.length}, dårligste A ${mrd(Math.min(...va))} / B ${mrd(Math.min(...vb))}, 10 % dårligste A ${mrd(p10(va))} / B ${mrd(p10(vb))}`;
        });
        console.log(`${pl.name.padEnd(8)} ${K1_STRATEGIES[st].padEnd(46)} ${cells.join(" · ")}`);
      }
    }
    console.log("");
  }
}

/**
 * Løpende kostnad mot etablering (B-393): for en spiller som bytter sjelden og for en som reagerer aktivt på verden – med
 * satsene i config og med 1/3/8 % til sammenligning. Bare måling; etableringen (2 dagers utbytte) endres ikke.
 */
function k1EstablishReport(ps: Player[], seeds: number[]): void {
  console.log("Løpende kostnad mot etablering, to år, snitt av verdenene:\n");
  for (const [label, mm] of [
    ["0,5/1,5/4 % (config)", K1],
    ["1/3/8 %", { ...K1, budget: [0.01, 0.03, 0.08] as [number, number, number] }],
  ] as [string, K1Model][]) {
    console.log(`### ${label}`);
    for (const [ex, w] of [...EXPOSURES, ONE_REGION]) {
      for (const pl of ps)
        for (const st of ["fast", "forsikring", "tek-varsel", "bytter"] as K1Strategy[]) {
          const rs = seeds.map((sd) => simulateK1(pl, w, st, mm, k1Events(mm, 730, sd)));
          const avg = (f: (r: K1Out) => number) => rs.reduce((a, r) => a + f(r), 0) / rs.length;
          const est = avg((r) => r.establishSpent);
          const run = avg((r) => r.spent) - est;
          console.log(
            `${ex.padEnd(24)} ${K1_STRATEGIES[st].padEnd(52)} løpende ${mrd(run)} mrd. · etablering ${mrd(est)} mrd. (${Math.round((est / Math.max(1, est + run)) * 100)} % av alt) · programbytter ${Math.round(avg((r) => r.swaps))} · nivåendringer ${Math.round(avg((r) => r.changes - r.swaps))} · spart ${mrd(avg((r) => r.saved))} mrd.`,
          );
        }
    }
    console.log("");
  }
}

function k1Report(
  m: K1Model,
  ps: Player[],
  seeds: number[],
  strategies = Object.keys(K1_STRATEGIES) as K1Strategy[],
): void {
  for (const pl of ps) {
    for (const [ex, w] of EXPOSURES) {
      console.log(`== ${pl.name}, ${ex} (inntekt ${Math.round((pl.contribution + pl.dividend) / 1e6)} mill./dag)`);
      const none = seeds.map((sd) => simulateK1(pl, w, "ingen", m, k1Events(m, 730, sd)));
      const noneCash = none.reduce((a, r) => a + r.cash[730], 0) / seeds.length;
      const calm = simulateK1(pl, w, "ingen", m, { events: [], boom: 0 }).cash[730];
      const spread = none.map((r) => r.cash[730] - calm);
      console.log(
        `Nøytral i snitt? Uten hendelser ${mrd(calm)} mrd.; med hendelser snitt ${mrd(noneCash)} mrd. (verdenene fra ${mrd(Math.min(...spread))} til +${mrd(Math.max(...spread))} mrd.)`,
      );
      for (const st of strategies) {
        const rs = seeds.map((sd) => simulateK1(pl, w, st, m, k1Events(m, 730, sd)));
        const avg = (f: (r: K1Out) => number) => rs.reduce((a, r) => a + f(r), 0) / rs.length;
        console.log(
          `${K1_STRATEGIES[st].padEnd(52)} kasse 365/730 ${mrd(avg((r) => r.cash[365]))}/${mrd(avg((r) => r.cash[730]))} mrd. (${avg((r) => r.cash[730]) >= noneCash ? "+" : ""}${mrd(avg((r) => r.cash[730]) - noneCash)}) · brukt ${Math.round(avg((r) => r.share) * 100)} % · hendelsestap ${mrd(avg((r) => r.eventLoss))}, tatt bort ${mrd(avg((r) => r.saved))}${st.startsWith("drift") ? `, drift +${mrd(avg((r) => r.driftExtra))}, ekstra tap ${mrd(avg((r) => r.driftHarm))}` : ""} mrd.${st === "drift-flukt" ? ` · bundet ved ${Math.round(avg((r) => r.blocked))} varsler` : ""} · verste 14 dager ${Math.round(avg((r) => r.worst14) * 100)} % · endringer ${Math.round(avg((r) => r.changes))}`,
        );
      }
      console.log("");
    }
  }
}

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
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  if (args.includes("--k1")) {
    const w = k1Events(K1, 730, 1);
    const n = (k: EventKind) => w.events.filter((e) => e.kind === k).length;
    console.log(
      `K-1: hendelser i seks regioner (frø 1): ${n("strom")} strømsjokk (−${Math.round(K1.strom.size * 100)} %), ${n("uro")} driftsuro (−${Math.round(K1.uro.size * 100)} %), ${n("konjunktur")} høykonjunktur (+${Math.round(w.boom * 100)} %, satt så verden er nøytral). Snitt av ${seeds.length} frø.\n`,
    );
    k1Report(K1, ps, seeds);
    return;
  }
  if (args.includes("--k1-kost")) {
    k1CostReport(K1, ps, seeds);
    return;
  }
  if (args.includes("--k1-etablering")) {
    k1EstablishReport(ps.slice(1, 2), seeds);
    return;
  }
  if (args.includes("--k1-verdi-skann")) {
    const worlds = Array.from({ length: 40 }, (_, i) => i + 1);
    const variants: [string, K1Model][] = [
      ["1/3/8 %, effekt som i dag", { ...K1, budget: [0.01, 0.03, 0.08] }],
      ["0,5/1,5/4 %, effekt som i dag", { ...K1, budget: [0.005, 0.015, 0.04] }],
      [
        "1/3/8 %, sterkere vern (tar bort hele tapet på Høy, Lav 40 %)",
        { ...K1, budget: [0.01, 0.03, 0.08], protect: 1, effect: [0.4, 0.7, 1] },
      ],
      ["0,5/1,5/4 %, sterkere vern", { ...K1, budget: [0.005, 0.015, 0.04], protect: 1, effect: [0.4, 0.7, 1] }],
    ];
    for (const [label, mm] of variants) {
      console.log(`### ${label}`);
      k1ValueReport(mm, ps.slice(1, 2), worlds, ["fast", "forsikring", "tek-hoy", "tek-varsel"], [365]);
    }
    return;
  }
  if (args.includes("--k1-verdi")) {
    k1ValueReport(
      K1,
      ps,
      Array.from({ length: 40 }, (_, i) => i + 1),
    );
    return;
  }
  if (args.includes("--k1-drift")) {
    const drift: K1Strategy[] = ["ingen", "drift-lav", "drift-boom", "drift-flukt"];
    console.log("Driftsytelse slik den er foreslått (forsterker ikke høykonjunkturen):\n");
    k1Report(K1, ps.slice(1, 2), seeds, drift);
    console.log("Variant som IKKE er foreslått: Driftsytelse forsterker også høykonjunkturen med 50 % × effekt:\n");
    k1Report({ ...K1, driftBoom: 0.5 }, ps.slice(1, 2), seeds, drift);
    return;
  }
  if (args.includes("--k1-skann")) {
    for (const size of [0.4, 0.7])
      for (const budget of [
        [0.04, 0.12, 0.3],
        [0.01, 0.03, 0.08],
        [0.005, 0.015, 0.04],
      ] as [number, number, number][]) {
        const m = { ...K1, budget, strom: { ...K1.strom, size }, uro: { ...K1.uro, size: size * 0.875 } };
        console.log(
          `### hendelser −${Math.round(size * 100)} %, satsing ${budget.map((b) => `${Math.round(b * 100)} %`).join("/")}\n`,
        );
        k1Report(m, ps.slice(1, 2), seeds);
      }
    return;
  }
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
        // Andel av utbyttet, som overskriften sier (B-428) – før regnet den av hele inntekten (MODEL_B), som er --skann-inntekt
        const r = simulateB(pl, { ...MODEL_B, budget, base: "utbytte" }, { days: 730, reserve: 2e9 });
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
