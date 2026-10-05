/**
 * Det som kan hentes på Mål (B-415): dagens bonus, ukekista og trinn på sesongstigen. Før hadde hvert kort sin egen
 * «Hent»-knapp på to ulike faner; nå står én «Hent alt» øverst på Mål. Hentingen gjøres av serveren som før – her er
 * bare rekkefølgen og det som legges inn i spillet etterpå.
 */
import { COSMETIC_BY_ID, grantCosmetic, trackCosmetic } from "../game/cosmetics";
import {
  applyAwayReward,
  applyMissionBonus,
  applyStreakReward,
  missionBonus,
  missionBonusReady,
  type Reward,
} from "../game/daily";
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
import { REFERRAL_START } from "../net/referral";
import { userId } from "../net/supabase";
import { claimWeekChest, setWeeklyStatus, weeklyStatus, type WeeklyStatus } from "../net/weekly";
import { fmtKr } from "./format";

/**
 * Svar på en henting gjelder kontoen som ba om den (B-426). Byttes kontoen mens svaret er på vei, legges belønningen
 * ikke inn i det nye spillet, men tas vare på (localStorage) til den første kontoens spill er i gang igjen – serveren
 * har alt gitt den, og den kan ikke hentes på nytt.
 */
type Deferred =
  | { uid: string; kind: "away"; seconds: number; fp: number }
  | { uid: string; kind: "streak"; streak: number }
  | { uid: string; kind: "bonus"; day: string }
  | { uid: string; kind: "kiste"; fp: number }
  | { uid: string; kind: "stige"; fp: number; tiers: number[]; seasonId: number | null }
  | { uid: string; kind: "verv" }
  | { uid: string; kind: "vervet"; total: number; paid: number; reward: number };

const DEFERRED_KEY = "stalverk-ventende-belonninger-v1";

function readDeferred(): Deferred[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(DEFERRED_KEY) ?? "[]");
    return Array.isArray(v) ? (v as Deferred[]) : [];
  } catch {
    return [];
  }
}
function writeDeferred(list: Deferred[]): void {
  try {
    if (list.length) localStorage.setItem(DEFERRED_KEY, JSON.stringify(list.slice(-20)));
    else localStorage.removeItem(DEFERRED_KEY);
  } catch {
    // Privat modus: belønningen er tapt for denne kontoen, men havner aldri hos en annen
  }
}

/** Er spillet som er i gang nå, spillet til kontoen `uid`? */
function isMine(g: GameState, uid: string | null): boolean {
  return !!uid && userId() === uid && (!g.owner || g.owner === uid);
}

/** Legger inn belønningen i spillet hvis det fortsatt er kontoens, ellers tas den vare på. Gir true når den ble lagt inn */
function grant(act: GameApi["act"], d: Deferred): boolean {
  const done = act((gg) => {
    if (!isMine(gg, d.uid)) return false;
    applyDeferred(gg, d);
    return true;
  });
  if (!done) writeDeferred([...readDeferred(), d]);
  return done;
}

function applyDeferred(gg: GameState, d: Deferred): void {
  if (d.kind === "away") applyAwayReward(gg, d.seconds, d.fp, fmtKr);
  else if (d.kind === "streak") applyStreakReward(gg, d.streak, fmtKr);
  else if (d.kind === "bonus") {
    // En annen dag i spillet nå: bonusen gis, men dagens oppdrag merkes ikke som hentet
    if (gg.daily.date === d.day && !gg.daily.claimed) applyMissionBonus(gg, fmtKr);
    else {
      const r = missionBonus(gg);
      gg.cash += r.cash;
      awardPoints(gg, r.fp);
      log(gg, `Dagens bonus fra ${d.day}: ${fmtKr(r.cash)} og ${r.fp} fagpoeng.`, "good");
    }
  } else if (d.kind === "verv") {
    gg.cash += REFERRAL_START.cash;
    awardPoints(gg, REFERRAL_START.fp);
    log(
      gg,
      `Startpakken fra vennen som vervet deg: ${fmtKr(REFERRAL_START.cash)} og ${REFERRAL_START.fp} fagpoeng.`,
      "good",
    );
  } else if (d.kind === "vervet") {
    // Telleren gir prestasjonen «Verving» (B-459); den går aldri ned
    gg.counters.vervet = Math.max(gg.counters.vervet ?? 0, d.total);
    if (d.paid > 0)
      log(
        gg,
        `${d.paid === 1 ? "En venn du vervet, har" : `${d.paid} venner du vervet, har`} kommet godt i gang: ${fmtKr(d.paid * d.reward)} i konsernkassa.`,
        "good",
      );
  } else if (d.kind === "kiste") {
    awardPoints(gg, d.fp);
    log(gg, `Ukekista er åpnet: +${d.fp} fagpoeng.`, "good");
  } else {
    awardPoints(gg, d.fp);
    const got = d.tiers.map((t) => trackCosmetic(t, d.seasonId)).filter((c) => c !== null);
    for (const c of got) grantCosmetic(gg, c.id);
    log(
      gg,
      `Sesongstigen: ${d.tiers.length === 1 ? `trinn ${d.tiers[0]}` : `${d.tiers.length} trinn`} – +${d.fp} fagpoeng${got.length ? ` og ${got.map((c) => c.name).join(", ")}` : ""}.`,
      "good",
    );
  }
}

/** Pynten for trinn som alt er hentet, men som spillet mangler (B-452: pynten på trinn 1 kom etter at trinnet ble hentet) */
export function missingTrackCosmetics(g: GameState, track: SeasonTrack): string[] {
  return track.claimed
    .map((t) => trackCosmetic(t, track.seasonId))
    .filter((c) => c !== null && !g.cosmetics.owned.includes(c.id))
    .map((c) => c!.id);
}

/**
 * Legger inn pynten for trinn som er hentet, uten nye fagpoeng (B-452). Bare i spillet til kontoen statusen gjelder
 * (B-426). Gir pynten som ble lagt inn.
 */
export function grantMissingTrackCosmetics(act: GameApi["act"], track: SeasonTrack): string[] {
  return act((gg) => {
    if (!isMine(gg, track.uid)) return [];
    const ids = missingTrackCosmetics(gg, track);
    for (const id of ids) grantCosmetic(gg, id);
    if (ids.length) {
      const names = ids.map((id) => COSMETIC_BY_ID[id]?.name ?? id).join(", ");
      log(gg, `Sesongstigen: ${names} for trinn du alt har hentet, er lagt til verket.`, "good");
    }
    return ids;
  });
}

/** Belønninger som ble hentet for denne kontoen mens et annet spill var i gang, legges inn nå */
export function applyWaitingRewards(act: GameApi["act"]): void {
  const uid = userId();
  if (!uid) return;
  const all = readDeferred();
  const mine = all.filter((d) => d.uid === uid);
  if (!mine.length) return;
  const left = all.filter((d) => d.uid !== uid);
  writeDeferred(left);
  for (const d of mine) grant(act, d);
}

/**
 * Tida borte (B-149) er hentet på serveren for kontoen `uid`: legg den inn i spillet hvis det fortsatt er kontoens.
 * Gir belønningen som ble lagt inn, eller null når den ble tatt vare på til senere.
 */
export function grantAway(act: GameApi["act"], uid: string, seconds: number, fp: number): Reward | null {
  let reward: Reward | null = null;
  const done = act((gg) => {
    if (!isMine(gg, uid)) return false;
    reward = applyAwayReward(gg, seconds, fp, fmtKr);
    return true;
  });
  if (!done) writeDeferred([...readDeferred(), { uid, kind: "away", seconds, fp }]);
  return reward;
}

/** Den daglige belønningen (dag `streak` i uka) er hentet for kontoen `uid` (B-429): som `grantAway` */
export function grantStreak(act: GameApi["act"], uid: string, streak: number): Reward | null {
  let reward: Reward | null = null;
  const done = act((gg) => {
    if (!isMine(gg, uid)) return false;
    reward = applyStreakReward(gg, streak, fmtKr);
    return true;
  });
  if (!done) writeDeferred([...readDeferred(), { uid, kind: "streak", streak }]);
  return reward;
}

/** Vennen er koblet til vervekoden på serveren (B-459): startpakken i spillet til kontoen `uid` */
export function grantReferralStart(act: GameApi["act"], uid: string): void {
  grant(act, { uid, kind: "verv" });
}

/** Vennene som har gitt belønning (B-459): telleren til prestasjonen, og varsel om dem serveren betalte nå */
export function grantReferralRewards(
  act: GameApi["act"],
  uid: string,
  total: number,
  paid: number,
  reward: number,
): void {
  const done = act((gg) => isMine(gg, uid) && (gg.counters.vervet ?? 0) >= total && paid === 0);
  if (done) return;
  grant(act, { uid, kind: "vervet", total, paid, reward });
}

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
  const uid = userId();
  const r = await claimDailyMissions();
  if (!uid) return;
  if (!r.already) grant(act, { uid, kind: "bonus", day: status.today });
  else act((gg) => void (isMine(gg, uid) && (gg.daily.claimed = true)));
  if (userId() === uid) setDailyStatus({ ...status, missionsClaimed: true });
}

/** Ukekista (flyttet fra WeeklyCard) */
export async function openWeekChest(act: GameApi["act"]): Promise<void> {
  const uid = userId();
  const fp = await claimWeekChest();
  if (!uid) return;
  if (fp > 0) grant(act, { uid, kind: "kiste", fp });
  const now = weeklyStatus();
  if (now && userId() === uid) setWeeklyStatus({ ...now, chest: null });
}

/** Alle trinn som er nådd på sesongstigen (flyttet fra SeasonTrackCard), med pynten som hører til sesongen */
export async function claimTrackTiers(act: GameApi["act"], seasonId: number | null): Promise<void> {
  const uid = userId();
  const r = await claimSeasonTiers();
  if (!uid) return;
  if (r.fp > 0 || r.tiers.length) grant(act, { uid, kind: "stige", fp: r.fp, tiers: r.tiers, seasonId });
  const track = await fetchSeasonTrack().catch(() => null);
  if (userId() === uid) setSeasonTrack(track);
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
