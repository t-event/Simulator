/**
 * Sesongstigen (B-173): kortet på Verket. Poeng for hver dag med spill, dagens belønning, dagens oppdrag og topp 3 på
 * ukelista – regnet ut på serveren, så stigen følger virkelig tid og varer hele sesongen. Krever konto (KONTO.md).
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { grantCosmetic, trackCosmetic } from "../game/cosmetics";
import { awardPoints, log } from "../game/engine";
import type { GameApi } from "../game/useGame";
import { claimSeasonTiers, fetchSeasonTrack, tierFp, TRACK_COSMETIC_TIERS, type SeasonTrack } from "../net/seasonTrack";
import { getSession, onSessionChange } from "../net/supabase";
import { isReconciled, onCloudStatus } from "../net/sync";
import { Bar, Card } from "./common";
import { buzz } from "./haptics";

function useSession() {
  return useSyncExternalStore(onSessionChange, getSession, getSession);
}
function useReconciled() {
  return useSyncExternalStore(onCloudStatus, isReconciled, isReconciled);
}

export function SeasonTrackCard({ act }: { act: GameApi["act"] }) {
  const session = useSession();
  const reconciled = useReconciled();
  const [track, setTrack] = useState<SeasonTrack | null>(null);
  const [busy, setBusy] = useState(false);
  const user = session?.user.id ?? null;

  // Status ved innlogging og hvert femte minutt; poeng kommer når spillet lagres og belønninger hentes
  useEffect(() => {
    if (!user || !reconciled) return;
    const load = () => void fetchSeasonTrack().then(setTrack, () => {});
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, [user, reconciled]);

  // Uten konto står Sesongstigen i det samlede kontokortet (AccountFeaturesCard, B-191)
  if (!session) return null;
  if (!track) return null;

  const unclaimed = Array.from({ length: track.tier }, (_, i) => i + 1).filter((t) => !track.claimed.includes(t));
  const fp = unclaimed.reduce((a, t) => a + tierFp(t), 0);
  const gifts = unclaimed.map(trackCosmetic).filter((c) => c !== null);
  const top = track.tier >= track.maxTier;
  const inTier = track.points - track.tier * track.perTier;
  const nextGift = TRACK_COSMETIC_TIERS.find((t) => t > track.tier);
  const nextCosmetic = nextGift ? trackCosmetic(nextGift) : null;

  const claim = async () => {
    setBusy(true);
    try {
      const r = await claimSeasonTiers();
      if (r.fp > 0 || r.tiers.length)
        act((gg) => {
          awardPoints(gg, r.fp);
          const got = r.tiers.map(trackCosmetic).filter((c) => c !== null);
          for (const c of got) grantCosmetic(gg, c.id);
          log(
            gg,
            `🪜 Sesongstigen: ${r.tiers.length === 1 ? `trinn ${r.tiers[0]}` : `${r.tiers.length} trinn`} – +${r.fp} fagpoeng${got.length ? ` og ${got.map((c) => `${c.icon} ${c.name}`).join(", ")}` : ""}.`,
            "good",
          );
        });
      buzz(40);
      setTrack(await fetchSeasonTrack());
    } finally {
      setBusy(false);
    }
  };

  const today: [boolean, string][] = [
    [track.playedToday, "spilt i dag (1)"],
    [track.rewardToday, "dagens belønning (2)"],
    [track.missionsToday, "dagens oppdrag (3)"],
  ];

  return (
    <Card
      title="Sesongstigen"
      right={
        <span className="g-muted">
          Trinn {track.tier} av {track.maxTier}
        </span>
      }
    >
      {unclaimed.length > 0 && (
        <div className="g-note g-week-chest">
          <span>
            🪜{" "}
            <strong>
              {unclaimed.length === 1 ? `Trinn ${unclaimed[0]} er nådd!` : `${unclaimed.length} trinn er nådd!`}
            </strong>{" "}
            +{fp} fagpoeng{gifts.length ? ` og ${gifts.map((c) => `${c.icon} ${c.name}`).join(", ")}` : ""}.
          </span>
          <button className="g-primary" disabled={busy} onClick={() => void claim()}>
            Hent
          </button>
        </div>
      )}
      {top ? (
        <p>Du er på toppen av stigen denne sesongen. 🏆</p>
      ) : (
        <>
          <Bar value={inTier / track.perTier} tone="ok" label={`Trinn ${track.tier + 1}`} />
          <p className="g-small-text">
            {inTier} av {track.perTier} poeng til trinn {track.tier + 1} ({track.points} poeng denne sesongen).
          </p>
        </>
      )}
      <p className="g-muted g-small-text">
        I dag: {today.map(([done, text]) => `${done ? "✓" : "○"} ${text}`).join(" · ")}. Topp 3 på ukelista gir 12, 9
        eller 7 poeng.
      </p>
      {nextCosmetic && (
        <p className="g-muted g-small-text">
          Neste pynt: {nextCosmetic.icon} {nextCosmetic.name} på trinn {nextGift}. Hvert trinn gir fagpoeng.
        </p>
      )}
    </Card>
  );
}
