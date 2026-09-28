/**
 * Henter merkene fra serveren én gang per innlogging (B-296) og deler dem ut som prestasjoner i spillet.
 * Venter til spillet er avklart mot kontoen (B-138), så merket havner i riktig spill.
 */
import { useEffect, useSyncExternalStore } from "react";
import { applyServerBadges } from "../game/achievements";
import type { GameApi } from "../game/useGame";
import { fetchBadges } from "../net/badges";
import { cloudConfigured } from "../net/config";
import { getSession, onSessionChange } from "../net/supabase";
import { isReconciled, onCloudStatus } from "../net/sync";

export function BadgeSync({ api }: { api: GameApi }) {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const reconciled = useSyncExternalStore(onCloudStatus, isReconciled, isReconciled);
  const user = session?.user.id ?? null;
  const act = api.act;
  const hasGame = !!api.game;
  useEffect(() => {
    if (!cloudConfigured() || !user || !reconciled || !hasGame) return;
    let alive = true;
    fetchBadges()
      .then((badges) => {
        if (alive && badges.length) act((gg) => void applyServerBadges(gg, badges));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, reconciled, hasGame, act]);
  return null;
}
