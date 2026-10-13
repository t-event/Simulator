/** Verksjefene (B-488): statusen fra serveren mens Konsern er åpent */
import { useEffect, useSyncExternalStore } from "react";
import type { GameState } from "../game/types";
import { clearManagers, managerStatus, onManagersChange, reloadManagers, type ManagerStatus } from "../net/managers";
import { getSession, onSessionChange } from "../net/supabase";

/** Statusen fra serveren, hentet når Konsern er åpent og hvert annet minutt */
export function useManagers(g: GameState): ManagerStatus | null {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const user = session?.user.id ?? null;
  const hasPlants = g.konsern.plants.some((p) => p.project?.kind !== "bygg");
  useEffect(() => {
    // Uten konto (eller ved kontobytte) gjelder ikke den forrige kontoens verksjefer for prisene (B-426)
    if (!user || !hasPlants) return clearManagers();
    if (managerStatus() === null) clearManagers();
    const load = () => void reloadManagers().catch(() => {});
    load();
    const t = setInterval(load, 120_000);
    return () => clearInterval(t);
  }, [user, hasPlants]);
  const status = useSyncExternalStore(onManagersChange, managerStatus, managerStatus);
  return user && hasPlants ? status : null;
}
