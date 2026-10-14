/** Verksjefene (B-488): statusen fra serveren for den som er innlogget og har et ferdig datterverk */
import { useEffect, useSyncExternalStore } from "react";
import type { GameState } from "../game/types";
import { clearManagers, managerStatus, onManagersChange, reloadManagers, type ManagerStatus } from "../net/managers";
import { getSession, onSessionChange } from "../net/supabase";

/**
 * Hentes i hele appen (B-489), så en samtale som venter, gir «!» på Konsern og en linje i varsellinja: hvert 5. minutt
 * mens appen vises (statusen leser det lagrede spillet på serveren), og med én gang når Konsern åpnes (`onKonsern`).
 */
export function useManagers(g: GameState | null, onKonsern = false): ManagerStatus | null {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const user = session?.user.id ?? null;
  const hasPlants = !!g?.konsern.plants.some((p) => p.project?.kind !== "bygg");
  useEffect(() => {
    // Uten konto (eller ved kontobytte) gjelder ikke den forrige kontoens verksjefer for prisene (B-426)
    if (!user || !hasPlants) return clearManagers();
    if (managerStatus() === null) clearManagers();
    const load = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void reloadManagers().catch(() => {});
    };
    load();
    const t = setInterval(load, 300_000);
    const onShow = () => load();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [user, hasPlants]);
  // Konsern åpnes: hent på nytt, så kortet viser det siste
  useEffect(() => {
    if (onKonsern && user && hasPlants) void reloadManagers().catch(() => {});
  }, [onKonsern, user, hasPlants]);
  const status = useSyncExternalStore(onManagersChange, managerStatus, managerStatus);
  return user && hasPlants ? status : null;
}
