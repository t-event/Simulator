/**
 * «Hent alt» øverst på Mål (B-415): én knapp for dagens bonus, ukekista og trinn på sesongstigen, når noe av det kan
 * hentes. Står ikke der når ingenting venter (gradvis synlighet). Krever konto, som det den henter.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { fetchSeasonTrack, onSeasonTrackChange, seasonTrack, setSeasonTrack } from "../net/seasonTrack";
import { getSession, onSessionChange } from "../net/supabase";
import { isReconciled, onCloudStatus } from "../net/sync";
import { fetchWeeklyStatus, onWeeklyChange, setWeeklyStatus, weeklyStatus } from "../net/weekly";
import { claimAll, claimables, grantMissingTrackCosmetics, missingTrackCosmetics } from "./claims";
import { Button } from "./ds";
import { buzz } from "./haptics";
import { Icon } from "./icons";
import { useDailyStatus } from "./useDaily";

export function ClaimAllBar({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const reconciled = useSyncExternalStore(onCloudStatus, isReconciled, isReconciled);
  const daily = useDailyStatus();
  const weekly = useSyncExternalStore(onWeeklyChange, weeklyStatus, weeklyStatus);
  const track = useSyncExternalStore(onSeasonTrackChange, seasonTrack, seasonTrack);
  const [busy, setBusy] = useState(false);
  const user = session?.user.id ?? null;

  // Ukekista og stigen vises på fanen «Uka». Statusen hentes på nytt hver gang Mål åpnes og når appen vises igjen
  // (B-428): før ble den bare hentet hvis den manglet, så en ny kiste eller et nytt trinn var skjult til «Uka» ble åpnet
  useEffect(() => {
    if (!user || !reconciled) return;
    const refresh = () => {
      void fetchWeeklyStatus().then(setWeeklyStatus, () => {});
      void fetchSeasonTrack().then(setSeasonTrack, () => {});
    };
    refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user, reconciled]);

  // Pynt for trinn som alt er hentet, men som spillet mangler (B-452), legges inn uten nye fagpoeng
  const missing = track ? missingTrackCosmetics(g, track).join(",") : "";
  useEffect(() => {
    if (track && missing) grantMissingTrackCosmetics(act, track);
  }, [act, track, missing]);

  if (!session) return null;
  const items = claimables(g, daily, weekly, track);
  if (!items.length) return null;
  const run = async () => {
    setBusy(true);
    try {
      await claimAll(act, items);
      buzz(40);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="g-claim-all" role="status">
      <Icon name="gift" />
      <div className="g-claim-all-text">
        <strong>Klar til å hente</strong>
        <ul className="g-small-text">
          {items.map((x) => (
            <li key={x.id}>{x.label}</li>
          ))}
        </ul>
      </div>
      <Button variant="primary" disabled={busy} onClick={() => void run()}>
        {items.length > 1 ? "Hent alt" : "Hent"}
      </Button>
    </div>
  );
}
