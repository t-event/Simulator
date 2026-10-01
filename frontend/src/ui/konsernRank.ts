/**
 * Plassen på topplista «Konsernverdi» ved konsernverdien (B-410). Hentes fra serveren (`my_rank('konsern')`) når
 * Konsern → Oversikt vises, og huskes i fem minutter, så siden ikke spør på nytt ved hvert besøk.
 */
import { useEffect, useState } from "react";
import { fetchMyRank } from "../net/leaderboard";
import { userId } from "../net/supabase";

const KEEP_MS = 5 * 60_000;
let cache: { user: string; rank: number | null; at: number } | null = null;

/** Plassen fra minnet hvis den er fersk nok (lokalt mellomrom, derfor Date.now og ikke serverens klokke) */
function cached(user: string | null): number | null | undefined {
  return cache && cache.user === user && Date.now() - cache.at < KEEP_MS ? cache.rank : undefined;
}

export function useKonsernRank(enabled: boolean): number | null {
  const user = userId();
  const [rank, setRank] = useState<number | null>(() => cached(user) ?? null);
  useEffect(() => {
    if (!enabled || !user) return;
    if (cached(user) !== undefined) return;
    let alive = true;
    fetchMyRank("konsern").then(
      (r) => {
        cache = { user, rank: r, at: Date.now() };
        if (alive) setRank(r);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [enabled, user]);
  return enabled ? rank : null;
}
