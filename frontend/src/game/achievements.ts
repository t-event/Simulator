/**
 * Prestasjoner (B-151): merker for ting man har klart, fra første charge til Stållegende. De sjekkes hver time og gir
 * litt fagpoeng. Bare ditt eget spill, så ingen konto trengs (KONTO.md, regel 1).
 */
import { awardPoints, log } from "./engine";
import { konsernEquity } from "./konsern";
import { MASTERY_IDS, masteryLevel, masteryOpen } from "./mastery";
import { QUIZ } from "./quiz";
import type { GameState } from "./types";

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  description: string;
  fp: number;
  /** Hvor langt man er kommet: [nå, mål] */
  progress: (g: GameState) => [number, number];
}

// Sesongkapitlet krever konto (sesong), så det teller ikke med i «Fagekspert» (B-161, KONTO.md regel 1)
const QUIZ_COUNT = Object.keys(QUIZ).filter((k) => k !== "sesong").length;
const quizzesDone = (g: GameState) => g.quizDone.filter((k) => k !== "sesong").length;
const masterySum = (g: GameState) => MASTERY_IDS.reduce((a, id) => a + masteryLevel(g, id), 0);
const sisters = (g: GameState) => g.konsern?.plants.length ?? 0;

function count(
  id: string,
  icon: string,
  name: string,
  description: string,
  fp: number,
  goal: number,
  value: (g: GameState) => number,
): Achievement {
  return { id, icon, name, description, fp, progress: (g) => [value(g), goal] };
}

export const ACHIEVEMENTS: Achievement[] = [
  count("charge1", "🔥", "Første smelte", "Smelt den første chargen.", 2, 1, (g) => g.totals.heats),
  count("kontrakt1", "🤝", "Første kontrakt", "Lever en hel kontrakt.", 2, 1, (g) => g.totals.contractsDone),
  count("verksted", "🏠", "Ut av garasjen", "Flytt til et verksted.", 3, 1, (g) => g.stage),
  count("selv1", "🎛️", "Ved spakene", "Kjør en charge selv i kontrollrommet.", 3, 1, (g) => g.totals.manualHeats),
  count("charge100", "🔥", "Hundre charger", "Smelt 100 charger.", 5, 100, (g) => g.totals.heats),
  count("tonn1k", "⚖️", "Tusen tonn", "Produser 1 000 tonn stål.", 5, 1000, (g) => g.totals.producedT),
  count("stoperi", "🏭", "Eget støperi", "Flytt til et støperi.", 5, 2, (g) => g.stage),
  count("quiz5", "📖", "Skoleflink", "Bestå fem quizer i fagboka.", 5, 5, (g) => g.quizDone.length),
  count("forsk10", "🔬", "Forsker", "Forsk fram ti ting.", 5, 10, (g) => g.researched.length),
  count("kontrakt50", "🤝", "Femti kontrakter", "Lever 50 kontrakter.", 10, 50, (g) => g.totals.contractsDone),
  count("stalverk", "🏭", "Ekte stålverk", "Flytt til et stålverk.", 10, 3, (g) => g.stage),
  count("omdomme", "🌟", "Kundenes favoritt", "Nå omdømme 95.", 10, 95, (g) => Math.floor(g.reputation)),
  count("tiavti", "💯", "Ti av ti", "Få 10 av 10 fra en kunde.", 5, 1, (g) => g.counters.tiavti ?? 0),
  count("charge1000", "🔥", "Tusen charger", "Smelt 1 000 charger.", 15, 1000, (g) => g.totals.heats),
  count("tonn100k", "⚖️", "Hundre tusen tonn", "Produser 100 000 tonn stål.", 15, 100_000, (g) => g.totals.producedT),
  count("selv25", "🎛️", "Erfaren smelter", "Kjør 25 charger selv.", 15, 25, (g) => g.totals.manualHeats),
  count("quizalle", "🎓", "Fagekspert", "Bestå alle quizene i fagboka.", 20, QUIZ_COUNT, quizzesDone),
  count("storverk", "🏗️", "Storverket", "Bygg ut til et storverk.", 20, 4, (g) => g.stage),
  count("milliard", "💰", "Milliardær", "Få en konsernverdi på 1 milliard.", 20, 1e9, (g) => konsernEquity(g)),
  count("datter1", "🏢", "Første datterverk", "Kjøp et datterverk i konsernet.", 10, 1, sisters),
  count("kontrakt250", "🤝", "Fast leverandør", "Lever 250 kontrakter.", 30, 250, (g) => g.totals.contractsDone),
  count("alleforsk", "🧪", "Alt forsket fram", "Forsk fram alt, så mesterskapet åpner.", 30, 1, (g) => +masteryOpen(g)),
  count("datter10", "🏢", "Stort konsern", "Eie ti datterverk.", 30, 10, sisters),
  count("baron", "👑", "Stålbaron", "Nå sluttmålet: 10 milliarder.", 40, 1, (g) => +g.won),
  count("charge10k", "🔥", "Ti tusen charger", "Smelt 10 000 charger.", 40, 10_000, (g) => g.totals.heats),
  count("tonn1m", "⚖️", "En million tonn", "Produser 1 000 000 tonn stål.", 40, 1_000_000, (g) => g.totals.producedT),
  count("mester10", "🥋", "Mester", "Ta ti nivåer i mesterskapet.", 25, 10, masterySum),
  count("magnat", "👑", "Stålmagnat", "Nå 25 milliarder.", 50, 1, (g) => +((g.konsern?.legends ?? 0) >= 1)),
  count("mester50", "🥋", "Stormester", "Ta 50 nivåer i mesterskapet.", 60, 50, masterySum),
  count("legende", "🏆", "Stållegende", "Nå 1 billion.", 100, 1, (g) => +((g.konsern?.legends ?? 0) >= 5)),
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, Achievement>;

export function hasAchievement(g: GameState, id: string): boolean {
  return g.achievements?.[id] != null;
}

export function achievementsDone(g: GameState): number {
  return ACHIEVEMENTS.filter((a) => hasAchievement(g, a.id)).length;
}

/** Andel av målet (0–1) */
export function achievementShare(g: GameState, a: Achievement): number {
  const [now, goal] = a.progress(g);
  return goal > 0 ? Math.max(0, Math.min(1, now / goal)) : 0;
}

/** Hver time: nye prestasjoner gir fagpoeng og en linje i loggen. Mange på en gang (gamle lagringer) gir én linje. */
export function checkAchievements(g: GameState): void {
  const fresh = ACHIEVEMENTS.filter((a) => !hasAchievement(g, a.id) && achievementShare(g, a) >= 1);
  if (fresh.length === 0) return;
  const day = Math.floor(g.minute / 1440) + 1;
  let fp = 0;
  for (const a of fresh) {
    g.achievements[a.id] = day;
    fp += a.fp;
  }
  awardPoints(g, fp);
  if (fresh.length <= 2)
    for (const a of fresh) log(g, `🏅 Prestasjon: ${a.icon} ${a.name}! +${a.fp} fagpoeng.`, "good");
  else log(g, `🏅 ${fresh.length} nye prestasjoner! +${fp} fagpoeng. Se merkene på Verket.`, "good");
}
