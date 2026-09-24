/**
 * Oppdrag fra fagboka (B-025). Et oppdrag starter når spilleren har lest
 * kapitlet, og gir fagpoeng og penger når målet er nådd. Oppdragene øver på
 * det kapitlet forklarer.
 */
import { addIncome, awardPoints, fmtKr, log } from "./engine";
import { knowledgeCard } from "./knowledge";
import { has } from "./plant";
import type { GameState } from "./types";

export interface Mission {
  id: string;
  chapter: string;
  title: string;
  goal: number;
  /** Tellerverdi: fremdrift = verdi nå − verdi da oppdraget startet (eller verdien selv når absolute) */
  value: (g: GameState) => number;
  absolute?: boolean;
  unit?: string;
  fp: number;
  cash: number;
}

const counter = (key: string) => (g: GameState) => g.counters[key] ?? 0;

export const MISSIONS: Mission[] = [
  {
    id: "start",
    chapter: "start",
    title: "Lever tre kontrakter",
    goal: 3,
    value: counter("leveranser"),
    fp: 2,
    cash: 5_000,
  },
  {
    id: "skrap",
    chapter: "skrap",
    title: "To døgn der alt stålet holder kvaliteten",
    goal: 2,
    value: counter("rene_dogn"),
    unit: "døgn",
    fp: 3,
    cash: 10_000,
  },
  {
    id: "omdomme",
    chapter: "omdomme",
    title: "Nå omdømme 10",
    goal: 10,
    value: (g) => g.reputation,
    absolute: true,
    fp: 3,
    cash: 15_000,
  },
  {
    id: "ildfast",
    chapter: "ildfast",
    title: "Tre planlagte omforinger",
    goal: 3,
    value: counter("omforinger"),
    fp: 4,
    cash: 20_000,
  },
  {
    id: "stoping",
    chapter: "stoping",
    title: "Tre døgn med under 3 % støpefeil",
    goal: 3,
    value: counter("fine_stopedogn"),
    unit: "døgn",
    fp: 4,
    cash: 20_000,
  },
  {
    id: "folk",
    chapter: "folk",
    title: "Få en ansatt til tre stjerner",
    goal: 3,
    value: (g) => Math.floor(Math.max(0, ...g.workers.map((w) => w.skill)) * 10) / 10,
    absolute: true,
    unit: "stjerner",
    fp: 4,
    cash: 25_000,
  },
  {
    id: "radioaktivitet",
    chapter: "radioaktivitet",
    title: "Sett opp strålingsportal",
    goal: 1,
    value: (g) => (has(g, "portal") ? 1 : 0),
    absolute: true,
    fp: 3,
    cash: 0,
  },
  {
    id: "strom",
    chapter: "strom",
    title: "Tre døgn med strøm under 0,70 kr/kWh i snitt",
    goal: 3,
    value: counter("billig_strom"),
    unit: "døgn",
    fp: 8,
    cash: 60_000,
  },
  {
    id: "analyse",
    chapter: "analyse",
    title: "Fem døgn på rad der alt holder kvaliteten",
    goal: 5,
    value: counter("rene_dogn"),
    unit: "døgn",
    fp: 10,
    cash: 100_000,
  },
  {
    id: "lysbue",
    chapter: "lysbue",
    title: "Kjør tre charger selv i kontrollrommet",
    goal: 3,
    value: (g) => g.totals.manualHeats,
    fp: 15,
    cash: 250_000,
  },
  {
    id: "fosfor",
    chapter: "fosfor",
    title: "To charger med fire stjerner eller mer",
    goal: 2,
    value: counter("gode_charger"),
    fp: 20,
    cash: 400_000,
  },
];

export function missionFor(chapter: string): Mission | undefined {
  return MISSIONS.find((m) => m.chapter === chapter);
}

export function missionProgress(g: GameState, m: Mission): number {
  const st = g.missions[m.id];
  if (!st) return 0;
  if (st.done) return m.goal;
  const v = m.value(g);
  return Math.min(m.goal, m.absolute ? v : v - st.base);
}

/** Starter oppdrag for leste kapitler og deler ut belønning for de som er nådd. */
export function checkMissions(g: GameState): void {
  for (const m of MISSIONS) {
    if (!g.readChapters.includes(m.chapter)) continue;
    const st = g.missions[m.id];
    if (!st) {
      g.missions[m.id] = { base: m.value(g), done: false };
      continue;
    }
    if (st.done || missionProgress(g, m) < m.goal) continue;
    st.done = true;
    awardPoints(g, m.fp);
    if (m.cash > 0) addIncome(g, "annet", m.cash);
    log(
      g,
      `Oppdrag fra «${knowledgeCard(m.chapter)?.title}» fullført: ${m.title.toLowerCase()}. +${m.fp} fagpoeng${m.cash > 0 ? ` og ${fmtKr(m.cash)}` : ""}.`,
      "good",
    );
  }
}

/** Oppdrag som er i gang, for kortet på Verket */
export function activeMissions(g: GameState): Mission[] {
  return MISSIONS.filter((m) => g.missions[m.id] && !g.missions[m.id].done);
}
