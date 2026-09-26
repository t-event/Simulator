/**
 * Sesonger og felles hendelser (B-129). Serveren eier sesongen; appen leser status og hendelser og legger
 * hendelsene på markedet i spillet. En liten butikk med lyttere, så flere kort kan vise det samme.
 */
import type { SeasonTwist, WorldEvent } from "../game/types";
import { cloudConfigured } from "./config";
import { rpc, userId } from "./supabase";

export interface Season {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string;
  /** Sesongens vri (B-152), eller null */
  twist?: SeasonTwist | null;
}

export interface SeasonStatus {
  current: Season | null;
  /** Spilleren var med i forrige sesong og får en pitteliten fordel i den nye */
  played_previous: boolean;
}

export async function fetchSeasonStatus(): Promise<SeasonStatus> {
  const s = await rpc<SeasonStatus>("season_status", {});
  const cur = s?.current ?? null;
  const t = cur?.twist;
  const twist = t
    ? { ...t, scrap: Number(t.scrap) || 1, steel: Number(t.steel) || 1, power: Number(t.power) || 1 }
    : null;
  return { current: cur ? { ...cur, twist } : null, played_previous: !!s?.played_previous };
}

/** Et sesongresultat for spilleren selv (B-143) */
export interface SeasonResult {
  seasonId: number;
  name: string;
  plass: number;
  /** Hvor mange som var med på lista i sesongen */
  players: number;
  equity: number;
  day: number;
  stage: number;
}

/** Spillerens egne sesongresultater, nyeste først. Tom uten innlogging. */
export async function fetchSeasonHistory(): Promise<SeasonResult[]> {
  if (!userId()) return [];
  const rows = await rpc<
    {
      season_id: number;
      name: string;
      plass: number;
      players: number;
      equity: string | number;
      day: number;
      stage: number;
    }[]
  >("season_history", {});
  return (rows ?? []).map((r) => ({
    seasonId: r.season_id,
    name: r.name,
    plass: r.plass,
    players: Number(r.players),
    equity: Number(r.equity),
    day: r.day,
    stage: Number(r.stage),
  }));
}

/** Nyeste sesongresultat spilleren har fått beskjed om, per konto (lagres i nettleseren) */
const RESULT_SEEN_KEY = "stalverk-sesongresultat-v1";
export function resultSeen(user: string): number {
  try {
    const v = JSON.parse(localStorage.getItem(RESULT_SEEN_KEY) ?? "null") as { user?: string; season?: number } | null;
    return v && v.user === user && typeof v.season === "number" ? v.season : 0;
  } catch {
    return 0;
  }
}
export function markResultSeen(user: string, season: number): void {
  try {
    localStorage.setItem(RESULT_SEEN_KEY, JSON.stringify({ user, season }));
  } catch {
    // Uten lagring i nettleseren kan beskjeden komme igjen neste gang
  }
}

interface EventRow {
  id: number;
  kind: string;
  title: string;
  text: string;
  scrap: string | number;
  steel: string | number;
  power: string | number;
  ends_at: string;
}

export async function fetchActiveEvents(): Promise<WorldEvent[]> {
  const rows = await rpc<EventRow[]>("active_events", {});
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    text: r.text,
    scrap: Number(r.scrap),
    steel: Number(r.steel),
    power: Number(r.power),
    until: r.ends_at,
  }));
}

/** Dager igjen av sesongen, rundet opp; 0 når den er over */
export function daysLeft(s: Season, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(s.ends_at).getTime() - now) / 86_400_000));
}

// ------------------------------------------------------------------ butikk

let status: SeasonStatus | null = null;
let events: WorldEvent[] = [];
let lastFetch = 0;
const listeners = new Set<() => void>();

export function seasonStatus(): SeasonStatus | null {
  return status;
}
export function worldEvents(): WorldEvent[] {
  return events;
}
export function onSeasonChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
function notify(): void {
  for (const fn of listeners) fn();
}

/** Henter sesong og hendelser, høyst hvert tiende minutt om ikke `force`. Feil ignoreres: alt på nett er valgfritt. */
export async function refreshSeason(force = false): Promise<void> {
  if (!cloudConfigured()) return;
  if (!force && Date.now() - lastFetch < 10 * 60_000) return;
  lastFetch = Date.now();
  const [s, e] = await Promise.all([fetchSeasonStatus().catch(() => null), fetchActiveEvents().catch(() => null)]);
  if (s) status = s;
  if (e) events = e;
  if (s || e) notify();
}

/** For tester og utlogging */
export function resetSeason(): void {
  status = null;
  events = [];
  lastFetch = 0;
  notify();
}
