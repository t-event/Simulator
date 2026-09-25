/**
 * Sesonger og felles hendelser (B-129). Serveren eier sesongen; appen leser status og hendelser og legger
 * hendelsene på markedet i spillet. En liten butikk med lyttere, så flere kort kan vise det samme.
 */
import type { WorldEvent } from "../game/types";
import { cloudConfigured } from "./config";
import { rpc } from "./supabase";

export interface Season {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string;
}

export interface SeasonStatus {
  current: Season | null;
  /** Spilleren var med i forrige sesong og får en pitteliten fordel i den nye */
  played_previous: boolean;
}

export async function fetchSeasonStatus(): Promise<SeasonStatus> {
  const s = await rpc<SeasonStatus>("season_status", {});
  return { current: s?.current ?? null, played_previous: !!s?.played_previous };
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
