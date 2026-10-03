/**
 * Sesongstigen (B-173, supabase/024_sesongstigen.sql): poeng for hver dag med spill, dagens belønning, dagens oppdrag
 * og plassering på ukelista – alt regnet ut på serveren, så det følger virkelig tid og ikke kan jukses. 50 trinn: trinn 1
 * ved 6 poeng, trinn 2 ved 12, deretter 20 poeng per trinn (B-452, `season_tier_of`). Hvert trinn gir fagpoeng; trinn 1,
 * 10, 20, 30, 40 og 50 gir pynt som bare finnes her.
 */
import { rpc, userId } from "./supabase";

export interface SeasonTrack {
  /** Kontoen statusen gjelder (B-452): pynt legges bare inn i spillet til samme konto */
  uid: string | null;
  seasonId: number | null;
  points: number;
  perTier: number;
  maxTier: number;
  tier: number;
  claimed: number[];
  playedToday: boolean;
  rewardToday: boolean;
  missionsToday: boolean;
}

interface TrackRow {
  season_id: number | null;
  points?: number;
  per_tier?: number;
  max_tier?: number;
  tier?: number;
  claimed?: number[];
  played_today?: boolean;
  reward_today?: boolean;
  missions_today?: boolean;
}

export async function fetchSeasonTrack(): Promise<SeasonTrack | null> {
  const uid = userId();
  if (!uid) return null;
  const r = await rpc<TrackRow>("season_track", {});
  if (!r || r.season_id === null) return null;
  return {
    uid,
    seasonId: r.season_id,
    points: Number(r.points) || 0,
    perTier: Number(r.per_tier) || 20,
    maxTier: Number(r.max_tier) || 50,
    tier: Number(r.tier) || 0,
    claimed: (r.claimed ?? []).map(Number),
    playedToday: !!r.played_today,
    rewardToday: !!r.reward_today,
    missionsToday: !!r.missions_today,
  };
}

/** Henter alle trinn som er nådd. Gir trinnene og fagpoengene (tomt hvis de alt er hentet, f.eks. på en annen enhet) */
export async function claimSeasonTiers(): Promise<{ tiers: number[]; fp: number }> {
  const r = await rpc<{ tiers: number[] | null; fp: number }>("claim_season_tiers", {});
  return { tiers: (r?.tiers ?? []).map(Number), fp: Number(r?.fp) || 0 };
}

/** Fagpoeng for et trinn (samme som på serveren) */
export function tierFp(tier: number): number {
  return 20 + 2 * tier;
}

/** Trinn med pynt som bare finnes på stigen (trinn 1 fra B-452) */
export const TRACK_COSMETIC_TIERS = [1, 10, 20, 30, 40, 50];

/** Poengene som trengs for et trinn (B-452, speiler `season_tier_points`): 6, 12, så 20 per trinn – 972 for trinn 50 */
export function tierPoints(tier: number): number {
  if (tier <= 0) return 0;
  if (tier === 1) return 6;
  return 12 + 20 * (tier - 2);
}

/** Trinnet for et antall poeng (B-452, speiler `season_tier_of`) */
export function tierOf(points: number, maxTier = 50): number {
  if (points < 6) return 0;
  if (points < 12) return 1;
  return Math.min(maxTier, 2 + Math.floor((points - 12) / 20));
}

// Siste status fra serveren (B-415), så kortet og «Hent alt» på Mål viser det samme
let track: SeasonTrack | null = null;
const listeners = new Set<() => void>();
export function seasonTrack(): SeasonTrack | null {
  return track;
}
export function setSeasonTrack(t: SeasonTrack | null): void {
  track = t;
  for (const fn of listeners) fn();
}
export function onSeasonTrackChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Trinn som er nådd, men ikke hentet */
export function unclaimedTiers(t: SeasonTrack): number[] {
  return Array.from({ length: t.tier }, (_, i) => i + 1).filter((n) => !t.claimed.includes(n));
}
