/**
 * Ukens utfordring (B-152, supabase/016_ukens_utfordring.sql): en toppliste per liga og uke, regnet ut på serveren fra
 * tidslinja. Topp 3 får medalje og ukekiste med fagpoeng når uka er over (B-155). Krever konto for å være med;
 * lista kan leses uten.
 */
import { rpc, userId } from "./supabase";

export type WeekKind = "vekst" | "tonn" | "dager";
export type League = "bronse" | "solv" | "gull";

export const WEEK_KINDS: Record<WeekKind, { title: string; how: string }> = {
  vekst: { title: "Mest vekst i konsernverdi", how: "Få konsernverdien til å vokse mest mulig denne uka." },
  tonn: { title: "Flest tonn stål", how: "Produser mest mulig stål denne uka." },
  dager: { title: "Flest spilldøgn", how: "Hold verket i gang: flest døgn i spillet denne uka." },
};

export const LEAGUES: Record<League, string> = { bronse: "Bronseligaen", solv: "Sølvligaen", gull: "Gullligaen" };

/** Fagpoeng i ukekista etter plass (samme som i finish_weeks på serveren) */
export function chestFp(plass: number): number {
  // Bare topp 3 får kiste så lenge det er få spillere (B-155)
  return plass === 1 ? 100 : plass === 2 ? 75 : plass === 3 ? 50 : 0;
}

export interface WeeklyStatus {
  weekStart: string;
  endsAt: string;
  kind: WeekKind;
  league: League;
  plass: number | null;
  value: number | null;
  players: number;
  /** Kister som venter: fagpoeng til sammen, antall og beste plass */
  chest: { fp: number; count: number; best: number } | null;
  medals: { gold: number; silver: number; bronze: number };
}

interface StatusRow {
  week_start: string;
  ends_at: string;
  kind: string;
  league: string;
  plass: number | null;
  value: string | number | null;
  players: number;
  chest: { fp: number; count: number; best: number } | null;
  gold: number;
  silver: number;
  bronze: number;
}

function asKind(k: string): WeekKind {
  return k === "tonn" || k === "dager" ? k : "vekst";
}
function asLeague(l: string): League {
  return l === "solv" || l === "gull" ? l : "bronse";
}

export async function fetchWeeklyStatus(): Promise<WeeklyStatus | null> {
  if (!userId()) return null;
  const r = await rpc<StatusRow>("weekly_status", {});
  return {
    weekStart: r.week_start,
    endsAt: r.ends_at,
    kind: asKind(r.kind),
    league: asLeague(r.league),
    plass: r.plass ?? null,
    value: r.value === null || r.value === undefined ? null : Number(r.value),
    players: Number(r.players) || 0,
    chest: r.chest ? { fp: Number(r.chest.fp), count: Number(r.chest.count), best: Number(r.chest.best) } : null,
    medals: { gold: Number(r.gold) || 0, silver: Number(r.silver) || 0, bronze: Number(r.bronze) || 0 },
  };
}

export interface WeeklyRow {
  plass: number;
  nickname: string;
  value: number;
  isMe: boolean;
  /** Antall uker spilleren har vunnet */
  gold: number;
}

export async function fetchWeeklyBoard(league: League | null): Promise<WeeklyRow[]> {
  const rows = await rpc<{ plass: number; nickname: string; value: string | number; is_me: boolean; gold: number }[]>(
    "weekly_board",
    { p_league: league, lim: 20 },
  );
  return (rows ?? []).map((r) => ({
    plass: r.plass,
    nickname: r.nickname,
    value: Number(r.value),
    isMe: !!r.is_me,
    gold: Number(r.gold) || 0,
  }));
}

/** Åpner alle kister som venter. Gir fagpoengene (0 hvis de alt er hentet, f.eks. på en annen enhet). */
export async function claimWeekChest(): Promise<number> {
  return Number(await rpc<number>("claim_week_chest", {})) || 0;
}

/** Dager igjen av uka, rundet opp */
export function weekDaysLeft(s: WeeklyStatus, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(s.endsAt).getTime() - now) / 86_400_000));
}

// Siste status, så kortet og lista viser det samme
let status: WeeklyStatus | null = null;
const listeners = new Set<() => void>();
export function weeklyStatus(): WeeklyStatus | null {
  return status;
}
export function setWeeklyStatus(s: WeeklyStatus | null): void {
  status = s;
  for (const fn of listeners) fn();
}
export function onWeeklyChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
