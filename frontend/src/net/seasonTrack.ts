/**
 * Sesongstigen (B-173, supabase/024_sesongstigen.sql): poeng for hver dag med spill, dagens belønning, dagens oppdrag
 * og plassering på ukelista – alt regnet ut på serveren, så det følger virkelig tid og ikke kan jukses. 20 poeng per
 * trinn, 50 trinn. Hvert trinn gir fagpoeng; trinn 10, 20, 30, 40 og 50 gir pynt som bare finnes her.
 */
import { rpc, userId } from "./supabase";

export interface SeasonTrack {
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
  if (!userId()) return null;
  const r = await rpc<TrackRow>("season_track", {});
  if (!r || r.season_id === null) return null;
  return {
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

/** Trinn med pynt som bare finnes på stigen */
export const TRACK_COSMETIC_TIERS = [10, 20, 30, 40, 50];
