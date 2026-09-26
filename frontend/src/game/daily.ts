/**
 * Daglige ting som gir grunn til å komme tilbake (B-149): daglig belønning med en serie på sju dager, dagens oppdrag
 * og «mens du var borte». Alt dette krever konto: dagen og tida borte kommer fra serveren, så man ikke kan stille
 * klokka på mobilen (docs/KONTO.md). Her ligger bare spillreglene; net/daily.ts snakker med serveren.
 *
 * Belønningene måles i «døgns drift»: det verket tjener på et spilldøgn. Da betyr belønningen like mye i garasjen
 * som på storverket. Juksesperren på serveren (check_snapshot) gir plass til de samme døgnene (bonus_days).
 */
import { log } from "./engine";
import { konsernProfitPerDay } from "./konsern";
import { computePlantStats } from "./plant";
import { QUIZ } from "./quiz";
import { researchOptions } from "./research";
import type { DailyMission, GameState, MissionId } from "./types";

/** Laveste «døgns drift» per nivå, så belønningen betyr noe også når overskuddet er lite (garasje … storverk) */
export const DRIFT_FLOOR = [1_500, 6_000, 30_000, 200_000, 1_000_000];

/** Det verket tjener på et spilldøgn: snittet av de tre siste døgnene (hele konsernet), minst gulvet for nivået */
export function dayOfDrift(g: GameState): number {
  return Math.round(Math.max(DRIFT_FLOOR[g.stage] ?? DRIFT_FLOOR[0], konsernProfitPerDay(g)));
}

/**
 * Daglig belønning dag 1–7. Hopper man over en dag, starter serien på dag 1 igjen; etter dag 7 begynner en ny uke.
 * Døgnene må stemme med streak_days() i supabase/013_daglig.sql (juksesperren).
 */
export const STREAK_REWARDS: { fp: number; days: number }[] = [
  { fp: 1, days: 0 },
  { fp: 0, days: 0.5 },
  { fp: 2, days: 0 },
  { fp: 0, days: 1 },
  { fp: 3, days: 0 },
  { fp: 0, days: 1.5 },
  { fp: 5, days: 3 },
];

/** Bonus når alle dagens oppdrag er gjort (samme døgn som i claim_daily_missions() på serveren) */
export const MISSION_BONUS = { fp: 3, days: 1 };

/** «Mens du var borte»: døgns drift per time borte, høyst så mange timer, og minst så mange minutter for å telle */
export const AWAY_DAYS_PER_HOUR = 0.25;
export const AWAY_MAX_HOURS = 8;
export const AWAY_MIN_MINUTES = 30;

export interface Reward {
  cash: number;
  fp: number;
}

/** Hva dag `streak` (1–7) i serien gir nå */
export function streakReward(g: GameState, streak: number): Reward {
  const r = STREAK_REWARDS[Math.min(7, Math.max(1, streak)) - 1];
  return { cash: Math.round(r.days * dayOfDrift(g)), fp: r.fp };
}

function give(g: GameState, r: Reward): void {
  // Ikke bokført som inntekt: da ville neste belønning (snittet av overskuddet) vokst av seg selv
  g.cash += r.cash;
  g.researchPoints += r.fp;
}

function rewardText(r: Reward, fmtKr: (v: number) => string): string {
  return [r.cash > 0 && fmtKr(r.cash), r.fp > 0 && `${r.fp} fagpoeng`].filter(Boolean).join(" og ");
}

/** Gir dagens belønning (serveren har sagt hvilken dag i serien det er) */
export function applyStreakReward(g: GameState, streak: number, fmtKr: (v: number) => string): Reward {
  const r = streakReward(g, streak);
  give(g, r);
  log(g, `Daglig belønning, dag ${streak} av 7: ${rewardText(r, fmtKr)}.`, "good");
  return r;
}

/** Hva tida borte gir: døgns drift per time, høyst AWAY_MAX_HOURS timer. Under AWAY_MIN_MINUTES gir ingenting. */
export function awayReward(g: GameState, seconds: number): Reward {
  if (seconds < AWAY_MIN_MINUTES * 60) return { cash: 0, fp: 0 };
  const hours = Math.min(AWAY_MAX_HOURS, seconds / 3600);
  return { cash: Math.round(hours * AWAY_DAYS_PER_HOUR * dayOfDrift(g)), fp: 0 };
}

export function applyAwayReward(g: GameState, seconds: number, fmtKr: (v: number) => string): Reward {
  const r = awayReward(g, seconds);
  if (r.cash > 0) {
    give(g, r);
    log(g, `Mens du var borte, holdt verket det gående og tjente ${fmtKr(r.cash)}.`, "good");
  }
  return r;
}

// ------------------------------------------------------------------ //
// Dagens oppdrag

interface MissionTemplate {
  /** Tallet i spillet oppdraget måler (fremdriften er økningen fra dagens start) */
  value: (g: GameState) => number;
  /** Kan spilleren gjøre dette nå? */
  eligible: (g: GameState) => boolean;
  target: (g: GameState) => number;
}

const TEMPLATES: Record<MissionId, MissionTemplate> = {
  kontrakter: {
    value: (g) => g.totals.contractsDone,
    eligible: () => true,
    target: (g) => (g.stage === 0 ? 1 : 2),
  },
  tonn: {
    value: (g) => g.totals.producedT,
    eligible: (g) => computePlantStats(g).dailyProductT > 0,
    // Omtrent tre døgns produksjon
    target: (g) => roundNice(computePlantStats(g).dailyProductT * 3),
  },
  selv: {
    value: (g) => g.totals.manualHeats,
    eligible: (g) => computePlantStats(g).furnace.arc,
    target: () => 1,
  },
  forsk: {
    value: (g) => g.researched.length,
    eligible: (g) => researchOptions(g).some((r) => r.available),
    target: () => 1,
  },
  les: {
    value: (g) => g.readChapters.length,
    eligible: (g) => g.knowledge.some((k) => !g.readChapters.includes(k)),
    target: () => 1,
  },
  quiz: {
    value: (g) => g.quizDone.length,
    eligible: (g) => g.knowledge.some((k) => !!QUIZ[k] && !g.quizDone.includes(k)),
    target: () => 1,
  },
  omdomme: {
    value: (g) => g.reputation,
    eligible: (g) => g.reputation <= 95,
    target: () => 2,
  },
};

export const MISSION_IDS = Object.keys(TEMPLATES) as MissionId[];

/** Rundet til et pent tall (1, 2, 5 … 10, 20, 50 …), minst 0,1 */
function roundNice(v: number): number {
  if (v <= 0.1) return 0.1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
}

/** Et tall fra datoen, så alle spillere får oppdragene i samme rekkefølge samme dag */
function seedOf(date: string): number {
  let h = 2166136261;
  for (const c of date) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Dagens tre oppdrag: samme rekkefølge for alle den dagen, men bare det spilleren kan gjøre på sitt nivå */
export function pickMissions(g: GameState, date: string): MissionId[] {
  let s = seedOf(date);
  const order = [...MISSION_IDS];
  for (let i = order.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order.filter((id) => TEMPLATES[id].eligible(g)).slice(0, 3);
}

/** Starter en ny dag med oppdrag (datoen er norsk dato fra serveren). Gjør ingenting hvis dagen alt er startet. */
export function startMissionDay(g: GameState, date: string, claimed: boolean): void {
  if (g.daily.date === date) {
    // Serveren vet best om bonusen alt er hentet (f.eks. på en annen enhet)
    if (claimed) g.daily.claimed = true;
    return;
  }
  g.daily = {
    date,
    claimed,
    missions: pickMissions(g, date).map((id) => ({
      id,
      base: TEMPLATES[id].value(g),
      target: TEMPLATES[id].target(g),
    })),
  };
}

/** Hvor langt spilleren har kommet på oppdraget (0 … target) */
export function missionProgress(g: GameState, m: DailyMission): number {
  return Math.min(m.target, Math.max(0, TEMPLATES[m.id].value(g) - m.base));
}

export function missionDone(g: GameState, m: DailyMission): boolean {
  return missionProgress(g, m) >= m.target - 1e-9;
}

/** Alle dagens oppdrag er gjort, og bonusen er ikke hentet */
export function missionBonusReady(g: GameState): boolean {
  return !g.daily.claimed && g.daily.missions.length > 0 && g.daily.missions.every((m) => missionDone(g, m));
}

export function missionBonus(g: GameState): Reward {
  return { cash: Math.round(MISSION_BONUS.days * dayOfDrift(g)), fp: MISSION_BONUS.fp };
}

export function applyMissionBonus(g: GameState, fmtKr: (v: number) => string): Reward {
  const r = missionBonus(g);
  give(g, r);
  g.daily.claimed = true;
  log(g, `Dagens oppdrag er gjort: ${rewardText(r, fmtKr)}.`, "good");
  return r;
}
