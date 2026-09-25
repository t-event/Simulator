/**
 * Utfordringer på storverket (B-090): noe å strekke seg etter når alt er kjøpt og forsket fram.
 * Hver utfordring gir fagpoeng og penger. Tilstanden lagres i g.missions med id-er som starter
 * på «u-», så gamle lagringer trenger ingen migrering.
 */
import { addIncome, adjustReputation, awardPoints, fmtKr, log } from "./engine";
import { staffing } from "./plant";
import { RESEARCH } from "./research";
import type { GameState } from "./types";

export interface Challenge {
  id: string;
  title: string;
  /** Kort forklaring på hvordan man klarer den */
  how: string;
  goal: number;
  /** Tellerverdi nå. Fremdrift = verdi − verdien da utfordringen startet, eller verdien selv når absolute */
  value: (g: GameState) => number;
  absolute?: boolean;
  /** Lavere er bedre (f.eks. kWh per tonn) */
  lower?: boolean;
  unit?: string;
  fp: number;
  cash: number;
  rep?: number;
}

/** Nivået utfordringene starter på: storverket */
export const CHALLENGE_STAGE = 4;

const counter = (key: string) => (g: GameState) => g.counters[key] ?? 0;
const bestDay = (g: GameState) => Math.max(0, ...g.history.map((d) => d.producedT));
/** Beste døgn med minst 500 t, målt i kWh per tonn (0 hvis ingen) */
const bestKwh = (g: GameState) => {
  const days = g.history.filter((d) => d.producedT >= 500 && (d.kwh ?? 0) > 0).map((d) => d.kwh! / d.producedT);
  return days.length ? Math.min(...days) : 0;
};

export const CHALLENGES: Challenge[] = [
  {
    id: "u-rekord",
    title: "Rekorddøgn: 4 500 t stål",
    how: "Tre ovner, seks strenger og døgnet rundt med fulle skift.",
    goal: 4500,
    value: bestDay,
    absolute: true,
    unit: "t",
    fp: 60,
    cash: 10_000_000,
  },
  {
    id: "u-strom",
    title: "Et døgn under 420 kWh per tonn",
    how: "Conveyor, transformator, varmegjenvinning og forskningen på strøm og skumslagg.",
    goal: 420,
    value: bestKwh,
    absolute: true,
    lower: true,
    unit: "kWh/t",
    fp: 60,
    cash: 8_000_000,
  },
  {
    id: "u-rene",
    title: "30 døgn der alt stålet holder kvaliteten",
    how: "Riktig resept, måling av skrapet og godt folk.",
    goal: 30,
    value: counter("rene_dogn"),
    unit: "døgn",
    fp: 50,
    cash: 6_000_000,
  },
  {
    id: "u-perfekt",
    title: "Tre perfekte charger i kontrollrommet",
    how: "Ta styringen selv og få 5 stjerner.",
    goal: 3,
    value: counter("perfekte_charger"),
    unit: "charger",
    fp: 60,
    cash: 5_000_000,
  },
  {
    id: "u-avtaler",
    title: "Fullfør tre rammeavtaler med bonus",
    how: "Lever hver uke i tide.",
    goal: 3,
    value: counter("avtaler_bonus"),
    unit: "avtaler",
    fp: 50,
    cash: 8_000_000,
  },
  {
    id: "u-omdomme",
    title: "Omdømme 100",
    how: "Lever i tide, uten reklamasjoner, og fullfør rammeavtaler.",
    goal: 100,
    value: (g) => g.reputation,
    absolute: true,
    fp: 40,
    cash: 5_000_000,
  },
  {
    id: "u-skift",
    title: "Kjør 5-skift",
    how: "Ansett til fem fulle skiftlag under Folk.",
    goal: 5,
    value: (g) => staffing(g, true).crews,
    absolute: true,
    unit: "lag",
    fp: 40,
    cash: 3_000_000,
  },
  {
    id: "u-forskning",
    title: "Forsk fram alt",
    how: "Alle prosjektene under Forskning.",
    goal: RESEARCH.length,
    value: (g) => g.researched.filter((id) => RESEARCH.some((r) => r.id === id)).length,
    absolute: true,
    unit: "prosjekter",
    fp: 0,
    cash: 20_000_000,
    rep: 5,
  },
];

export function challengeProgress(g: GameState, c: Challenge): number {
  const st = g.missions[c.id];
  if (!st) return 0;
  if (st.done) return c.goal;
  const v = c.value(g);
  if (c.lower) return v;
  return Math.min(c.goal, c.absolute ? v : v - st.base);
}

/** 0–1, for fremdriftsstolpen */
export function challengeShare(g: GameState, c: Challenge): number {
  const st = g.missions[c.id];
  if (st?.done) return 1;
  const p = challengeProgress(g, c);
  if (c.lower) return p > 0 ? Math.min(1, c.goal / p) : 0;
  return c.goal > 0 ? p / c.goal : 0;
}

function reached(g: GameState, c: Challenge): boolean {
  const p = challengeProgress(g, c);
  return c.lower ? p > 0 && p <= c.goal : p >= c.goal;
}

/** Starter utfordringene på storverket og deler ut belønning for dem som er nådd */
export function checkChallenges(g: GameState): void {
  if (g.stage < CHALLENGE_STAGE) return;
  for (const c of CHALLENGES) {
    const st = g.missions[c.id];
    if (!st) {
      g.missions[c.id] = { base: c.absolute ? 0 : c.value(g), done: false };
      continue;
    }
    if (st.done || !reached(g, c)) continue;
    st.done = true;
    if (c.fp) awardPoints(g, c.fp);
    if (c.cash) addIncome(g, "annet", c.cash);
    if (c.rep) adjustReputation(g, c.rep);
    const rewards = [c.fp ? `+${c.fp} fagpoeng` : "", c.cash ? fmtKr(c.cash) : "", c.rep ? `omdømme +${c.rep}` : ""]
      .filter(Boolean)
      .join(" og ");
    log(g, `Utfordring klart: ${c.title.toLowerCase()}! ${rewards}.`, "good");
  }
}

export function challengesDone(g: GameState): number {
  return CHALLENGES.filter((c) => g.missions[c.id]?.done).length;
}
