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
  tierPoints,
  TRACK_COSMETIC_TIERS,
  unclaimedTiers,
  type SeasonTrack,
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
  // Trinn 1 ved 6 poeng, trinn 2 ved 12, så 20 per trinn (B-452)
  const inTier = track.points - tierPoints(track.tier);
  const need = tierPoints(track.tier + 1) - tierPoints(track.tier);
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
        trinn gir fagpoeng, og trinn 1 og hvert tiende gir pynt som bare finnes denne sesongen.
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
          <Bar value={inTier / need} tone="ok" label={`Trinn ${track.tier + 1}`} />
          <p className="g-small-text">
            {inTier} av {need} poeng til trinn {track.tier + 1} ({track.points} poeng denne sesongen).
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

/**
 * Sesongstigen i én linje (B-452): premie som venter, eller hvor mange poeng som er igjen til neste trinn og hva det gir.
 * Står på Dagens oppdrag og i velkomstvinduet, så framgangen synes der spilleren alt er.
 */
export function SeasonNextLine({ track }: { track: SeasonTrack | null }) {
  if (!track) return null;
  const waiting = unclaimedTiers(track);
  if (waiting.length)
    return (
      <p className="g-small-text g-claim-ready">
        <Icon name="star" /> Sesongstigen:{" "}
        {waiting.length === 1 ? `trinn ${waiting[0]} er nådd` : `${waiting.length} trinn er nådd`} – hent premien øverst
        på Mål.
      </p>
    );
  if (track.tier >= track.maxTier) return null;
  const next = track.tier + 1;
  const left = Math.max(0, tierPoints(next) - track.points);
  const gift = trackCosmetic(next, track.seasonId);
  return (
    <p className="g-small-text g-muted">
      <Icon name="star" /> Sesongstigen: {left} poeng til trinn {next} – {tierFp(next)} fagpoeng
      {gift ? ` og ${gift.name}` : ""}.
    </p>
  );
}
