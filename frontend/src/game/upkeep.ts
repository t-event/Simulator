/**
 * Slitasje og fornyelse av storverket (B-455, V4 i VERKSKONTO-FORSLAG; B3 i B-331). Store anlegg slites over ca. 180
 * spilldøgn. Over halvveis slitt kommer havariene oftere. Fornyelsen koster en femdel av det utstyret kostet (ganget med
 * hvor slitt det er) og føres som investering, så den verken øker eller senker marginen i bidraget (B-318). Reparatøren
 * fornyer selv, som foringen og kokillene, når «Reparatøren bytter foringen» er på.
 */
import { addCost, fmtKr, log, type PurchaseResult } from "./engine";
import { ADDONS, CASTINGS, FURNACES } from "./data";
import { summerStop } from "./calendar";
import { presentWorkers, unitType } from "./plant";
import { auto } from "./research";
import type { GameState } from "./types";

export const UPKEEP = {
  /** Spilldøgn fra nytt til helt slitt */
  lifeDays: 180,
  /** Fra denne slitasjen kommer havariene oftere … */
  riskFrom: 0.5,
  /** … med så mye per 100 % slitasje over grensen (helt slitt: dobbelt så mange havarier) */
  riskSlope: 2,
  maxWear: 1.5,
  /** Rådet kommer her, og reparatøren fornyer her */
  warnAt: 0.6,
  autoAt: 0.7,
  /** Full fornyelse koster så stor del av det utstyret kostet */
  costShare: 0.2,
};

/** Bare storverket slites (B-455) */
export function hasUpkeep(g: GameState): boolean {
  return g.stage >= 4;
}

export function upkeepWear(g: GameState): number {
  return hasUpkeep(g) ? (g.upkeep?.wear ?? 0) : 0;
}

/** Hvor mye oftere ovnene havarerer med dagens slitasje */
export function upkeepRisk(g: GameState): number {
  return 1 + UPKEEP.riskSlope * Math.max(0, upkeepWear(g) - UPKEEP.riskFrom);
}

/** Hva utstyret på verket kostet: ovnene, støpingen og alt tilleggsutstyr som er kjøpt */
export function equipmentValue(g: GameState): number {
  const owned = new Set(g.owned);
  const items = [...CASTINGS, ...ADDONS].filter((x) => owned.has(x.id));
  const furnaces = g.furnaces.reduce((a, _, i) => a + unitType(g, i).price, 0);
  const extra = FURNACES.filter((f) => owned.has(f.id) && !g.furnaces.some((_, i) => unitType(g, i).id === f.id));
  return furnaces + [...items, ...extra].reduce((a, x) => a + x.price, 0);
}

/** Hva en fornyelse koster nå (mer jo mer slitt) */
export function renewCost(g: GameState): number {
  return Math.round(equipmentValue(g) * UPKEEP.costShare * Math.min(1, upkeepWear(g)));
}

/** Døgn til anlegget er helt slitt */
export function upkeepDaysLeft(g: GameState): number {
  return Math.max(0, (1 - upkeepWear(g)) * UPKEEP.lifeDays);
}

/** Hvert døgn: storverket slites litt (ikke i sommerstansen, da står det) */
export function upkeepDay(g: GameState): void {
  if (!hasUpkeep(g) || summerStop(g)) return;
  const u = (g.upkeep ??= { wear: 0 });
  const before = u.wear;
  u.wear = Math.min(UPKEEP.maxWear, u.wear + 1 / UPKEEP.lifeDays);
  if (before < UPKEEP.warnAt && u.wear >= UPKEEP.warnAt && !repairerRenews(g))
    log(
      g,
      "Storverket er begynt å bli slitt, og ovnene havarerer oftere. Forny anlegget under Anlegg → Vedlikehold.",
      "event",
    );
}

/** Fornyer anlegget: koster en femdel av utstyrets pris ganget med slitasjen, og gjør det som nytt */
export function renewPlant(g: GameState, byRepairer = false): PurchaseResult {
  if (!hasUpkeep(g)) return { ok: false, message: "Bare storverket må fornyes." };
  if (upkeepWear(g) < 0.05) return { ok: false, message: "Anlegget er som nytt." };
  const cost = renewCost(g);
  if (g.cash < cost) return { ok: false, message: "Du har ikke råd til å fornye anlegget nå." };
  addCost(g, "investering", cost);
  g.upkeep = { wear: 0 };
  log(g, `${byRepairer ? "Reparatøren fornyet" : "Du fornyet"} anlegget for ${fmtKr(cost)}. Det er som nytt.`, "info");
  return { ok: true, message: `Anlegget er fornyet for ${fmtKr(cost)}.` };
}

/** Reparatøren fornyer selv når han bytter foringen (samme bryter, B-351) */
export function repairerRenews(g: GameState): boolean {
  return auto(g, "autoReline") && presentWorkers(g).some((w) => w.role === "vedlikehold");
}

/** Hver time: reparatøren fornyer et slitt anlegg når det er penger til det */
export function upkeepHour(g: GameState): void {
  if (!hasUpkeep(g) || upkeepWear(g) < UPKEEP.autoAt || !repairerRenews(g)) return;
  if (g.cash >= renewCost(g) * 2) renewPlant(g, true);
}
