/**
 * Sesongstigen (B-173): kortet på Verket. Poeng for hver dag med spill, dagens belønning, dagens oppdrag og topp 3 på
 * ukelista – regnet ut på serveren, så stigen følger virkelig tid og varer hele sesongen. Krever konto (KONTO.md).
 */
import { useEffect, useSyncExternalStore } from "react";
import { trackCosmetic } from "../game/cosmetics";
import {
  fetchSeasonTrack,
  onSeasonTrackChange,
  seasonTrack,
  setSeasonTrack,
  tierFp,
  TRACK_COSMETIC_TIERS,
  unclaimedTiers,
} from "../net/seasonTrack";
import { getSession, onSessionChange } from "../net/supabase";
import { isReconciled, onCloudStatus } from "../net/sync";
import { Bar, Card } from "./common";
import { Icon } from "./icons";

function useSession() {
  return useSyncExternalStore(onSessionChange, getSession, getSession);
}
function useReconciled() {
  return useSyncExternalStore(onCloudStatus, isReconciled, isReconciled);
}

export function SeasonTrackCard() {
  const session = useSession();
  const reconciled = useReconciled();
  const track = useSyncExternalStore(onSeasonTrackChange, seasonTrack, seasonTrack);
  const user = session?.user.id ?? null;

  // Status ved innlogging og hvert femte minutt; poeng kommer når spillet lagres og belønninger hentes
  useEffect(() => {
    if (!user || !reconciled) return;
    const load = () => void fetchSeasonTrack().then(setSeasonTrack, () => {});
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, [user, reconciled]);

  // Uten konto står Sesongstigen i det samlede kontokortet (AccountFeaturesCard, B-191)
  if (!session) return null;
  if (!track) return null;

  const unclaimed = unclaimedTiers(track);
  const fp = unclaimed.reduce((a, t) => a + tierFp(t), 0);
  // Pynten på stigen hører til sesongen (B-287)
  const gift = (t: number) => trackCosmetic(t, track.seasonId);
  const gifts = unclaimed.map(gift).filter((c) => c !== null);
  const top = track.tier >= track.maxTier;
  const inTier = track.points - track.tier * track.perTier;
  const nextGift = TRACK_COSMETIC_TIERS.find((t) => t > track.tier);
  const nextCosmetic = nextGift ? gift(nextGift) : null;

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
      {/* Hva stigen er, i én linje (B-290): en spiller lurte på det. Mer står i fagboka */}
      <p className="g-muted g-small-text">
        Du klatrer ved å spille litt hver dag: poeng for å spille, hente dagens belønning og ta dagens oppdrag. Hvert
        trinn gir fagpoeng, og hvert tiende gir pynt som bare finnes denne sesongen.
      </p>
      {unclaimed.length > 0 && (
        <div className="g-note g-week-chest">
          <span>
            <Icon name="star" />{" "}
            <strong>
              {unclaimed.length === 1 ? `Trinn ${unclaimed[0]} er nådd!` : `${unclaimed.length} trinn er nådd!`}
            </strong>{" "}
            +{fp} fagpoeng{gifts.length ? ` og ${gifts.map((c) => c.name).join(", ")}` : ""}. Hent med «Hent alt» øverst
            på Mål.
          </span>
        </div>
      )}
      {top ? (
        <p>Du er på toppen av stigen denne sesongen.</p>
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
          Neste pynt: {nextCosmetic.name} på trinn {nextGift} – finnes bare denne sesongen. Hvert trinn gir fagpoeng.
        </p>
      )}
    </Card>
  );
}
