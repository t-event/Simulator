/**
 * Daglig belønning, dagens oppdrag og «mens du var borte» på serveren (B-149, supabase/013_daglig.sql). Dagen og tida
 * borte kommer fra serverens klokke; spillreglene står i game/daily.ts.
 */
import { rpc, userId } from "./supabase";

export interface DailyStatus {
  /** Norsk dato fra serveren, «2026-09-26» */
  today: string;
  /** Dagens belønning er hentet */
  claimed: boolean;
  /** Dagen i serien som ble hentet sist */
  streak: number;
  /** Dagen i serien som står for tur (1–7), eller den som er hentet i dag */
  next: number;
  missionsClaimed: boolean;
}

export async function fetchDailyStatus(): Promise<DailyStatus | null> {
  if (!userId()) return null;
  const r = await rpc<{ today: string; claimed: boolean; streak: number; next: number; missions_claimed: boolean }>(
    "daily_status",
    {},
  );
  return {
    today: r.today,
    claimed: !!r.claimed,
    streak: Number(r.streak),
    next: Number(r.next),
    missionsClaimed: !!r.missions_claimed,
  };
}

/** Henter dagens belønning. `already` betyr at den alt er hentet i dag (f.eks. på en annen enhet). */
export async function claimDailyReward(): Promise<{ already: boolean; streak: number }> {
  const r = await rpc<{ already: boolean; streak: number }>("claim_daily_reward", {});
  return { already: !!r.already, streak: Number(r.streak) };
}

export async function claimDailyMissions(): Promise<{ already: boolean }> {
  const r = await rpc<{ already: boolean }>("claim_daily_missions", {});
  return { already: !!r.already };
}

/** Sekunder borte siden forrige lagring eller henting (høyst åtte timer); 0 hvis ingenting å hente */
export async function claimAway(): Promise<number> {
  if (!userId()) return 0;
  return Number(await rpc<number>("claim_away", {})) || 0;
}

// Siste status fra serveren, så kortet på Verket og vinduet med belønningen viser det samme
let status: DailyStatus | null = null;
const listeners = new Set<() => void>();
export function dailyStatus(): DailyStatus | null {
  return status;
}
export function setDailyStatus(s: DailyStatus | null): void {
  status = s;
  for (const fn of listeners) fn();
}
export function onDailyChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
