/**
 * Det som kan hentes på Mål (B-415): dagens bonus, ukekista og trinn på sesongstigen. Før hadde hvert kort sin egen
 * «Hent»-knapp på to ulike faner; nå står én «Hent alt» øverst på Mål. Hentingen gjøres av serveren som før – her er
 * bare rekkefølgen og det som legges inn i spillet etterpå.
 */
import { grantCosmetic, trackCosmetic } from "../game/cosmetics";
import { applyMissionBonus, missionBonus, missionBonusReady } from "../game/daily";
import { realNow, worldDay } from "../game/clock";
import { awardPoints, log } from "../game/engine";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { claimDailyMissions, dailyStatus, fetchDailyStatus, setDailyStatus, type DailyStatus } from "../net/daily";
import {
  claimSeasonTiers,
  fetchSeasonTrack,
  setSeasonTrack,
  tierFp,
  unclaimedTiers,
  type SeasonTrack,
} from "../net/seasonTrack";
import { claimWeekChest, setWeeklyStatus, weeklyStatus, type WeeklyStatus } from "../net/weekly";
import { fmtKr } from "./format";

export type ClaimId = "bonus" | "kiste" | "stige";

export interface Claimable {
  id: ClaimId;
  /** Kort tekst i lista over det som venter, f.eks. «Ukekista (300 fagpoeng)» */
  label: string;
}

/** Det som kan hentes nå, i den rekkefølgen det hentes: bonusen gir poeng på stigen, så den først */
export function claimables(
  g: GameState,
  daily: DailyStatus | null,
  weekly: WeeklyStatus | null,
  track: SeasonTrack | null,
): Claimable[] {
  const out: Claimable[] = [];
  if (daily && g.daily.date === daily.today && !g.daily.claimed && missionBonusReady(g)) {
    const b = missionBonus(g);
    out.push({
      id: "bonus",
      label: `Dagens bonus (${[b.cash > 0 && fmtKr(b.cash), b.fp > 0 && `${b.fp} fagpoeng`].filter(Boolean).join(" + ")})`,
    });
  }
  if (weekly?.chest) out.push({ id: "kiste", label: `Ukekista (${weekly.chest.fp} fagpoeng)` });
  if (track) {
    const tiers = unclaimedTiers(track);
    if (tiers.length)
      out.push({
        id: "stige",
        label: `${tiers.length === 1 ? `Trinn ${tiers[0]}` : `${tiers.length} trinn`} på sesongstigen (${tiers.reduce((a, t) => a + tierFp(t), 0)} fagpoeng)`,
      });
  }
  return out;
}

/** Dagens bonus for oppdragene (flyttet fra DailyCard) */
export async function claimMissionBonus(act: GameApi["act"]): Promise<void> {
  const status = dailyStatus();
  if (!status) return;
  // Har dagen skiftet siden oppdragene ble hentet, gjelder bonusen på serveren den nye dagen: hent dagens oppdrag i
  // stedet for å bruke opp morgendagens bonus på gårsdagens oppdrag (B-397)
  if (worldDay(realNow()) !== status.today) {
    const fresh = await fetchDailyStatus().catch(() => null);
    if (fresh) setDailyStatus(fresh);
    return;
  }
  const r = await claimDailyMissions();
  if (!r.already) act((gg) => void applyMissionBonus(gg, fmtKr));
  else act((gg) => void (gg.daily.claimed = true));
  setDailyStatus({ ...status, missionsClaimed: true });
}

/** Ukekista (flyttet fra WeeklyCard) */
export async function openWeekChest(act: GameApi["act"]): Promise<void> {
  const fp = await claimWeekChest();
  if (fp > 0)
    act((gg) => {
      awardPoints(gg, fp);
      log(gg, `Ukekista er åpnet: +${fp} fagpoeng.`, "good");
    });
  const now = weeklyStatus();
  if (now) setWeeklyStatus({ ...now, chest: null });
}

/** Alle trinn som er nådd på sesongstigen (flyttet fra SeasonTrackCard), med pynten som hører til sesongen */
export async function claimTrackTiers(act: GameApi["act"], seasonId: number | null): Promise<void> {
  const r = await claimSeasonTiers();
  if (r.fp > 0 || r.tiers.length)
    act((gg) => {
      awardPoints(gg, r.fp);
      const got = r.tiers.map((t) => trackCosmetic(t, seasonId)).filter((c) => c !== null);
      for (const c of got) grantCosmetic(gg, c.id);
      log(
        gg,
        `Sesongstigen: ${r.tiers.length === 1 ? `trinn ${r.tiers[0]}` : `${r.tiers.length} trinn`} – +${r.fp} fagpoeng${got.length ? ` og ${got.map((c) => c.name).join(", ")}` : ""}.`,
        "good",
      );
    });
  setSeasonTrack(await fetchSeasonTrack().catch(() => null));
}

/**
 * «Hent alt»: i rekkefølge, og stigen til slutt med fersk status – bonusen kan ha gitt et nytt trinn. Én feil stopper
 * ikke resten; hver henting er trygg å gjenta (serveren gir den bare én gang).
 */
export async function claimAll(act: GameApi["act"], items: Claimable[]): Promise<void> {
  const has = (id: ClaimId) => items.some((x) => x.id === id);
  if (has("bonus")) await claimMissionBonus(act).catch(() => {});
  if (has("kiste")) await openWeekChest(act).catch(() => {});
  const fresh = await fetchSeasonTrack().catch(() => null);
  if (fresh) setSeasonTrack(fresh);
  if (fresh && unclaimedTiers(fresh).length) await claimTrackTiers(act, fresh.seasonId).catch(() => {});
}
