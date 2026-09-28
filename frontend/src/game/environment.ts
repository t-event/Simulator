/**
 * Utslipp, renseanlegg og bøter (B-263).
 *
 * Ovnene gir røyk og støv som renseanlegget (røykgassrensingen) tar ut. Anlegget renser et visst antall tonn smeltet
 * stål i døgnet. Smelter ovnene mer enn det, eller står anlegget etter et havari, går resten urenset ut, og verket får
 * bot neste morgen. Systemet gjelder fra verket har et renseanlegg (påbudt for lysbueovnen); før det er ovnene små.
 */
import { ADDONS } from "./data";
import { addCost, adjustReputation, fmtKr, fmtT, log, unlock } from "./engine";
import { day, has, type PlantStats } from "./plant";
import { chance, uniform } from "./random";
import { riskFactor } from "./calendar";
import type { EnvState, GameState } from "./types";

/** Renseanleggene i rekkefølge: tonn smeltet stål de renser i døgnet, og om de har to linjer */
export const CLEANERS: { id: string; tpd: number; twoLines?: boolean }[] = [
  { id: "renseanlegg", tpd: 1_000 },
  { id: "rense2", tpd: 3_000 },
  { id: "rense3", tpd: 10_000, twoLines: true },
  { id: "rense4", tpd: 25_000, twoLines: true },
  { id: "rense5", tpd: 45_000, twoLines: true },
];

/** Bot per tonn stål smeltet uten full rensing */
export const FINE_PER_T = 1_000;
/** Kjører verket videre mens renseanlegget står, er boten dobbel: da slippes røyken ut med vilje */
export const DOWN_FINE_FACTOR = 2;
/** Fast del av boten per nivå (garasje … storverk) */
const FINE_BASE = [0, 0, 10_000, 25_000, 50_000];
/** Havarier i snitt per døgn med ovnene i gang (med vanlig vedlikehold) */
export const BREAKDOWN_PER_DAY = 1 / 30;
/** Timer en reparasjon tar (før verksted og reparatører) */
const REPAIR_HOURS = 10;

export function newEnv(): EnvState {
  return { downUntilMin: 0, onBreakdown: null, excessT: 0, downT: 0, finesKr: 0, lastFine: null };
}

/** Er miljøkravene i spill? Fra verket har renseanlegg (B-263). */
export function envActive(g: GameState): boolean {
  return has(g, "renseanlegg");
}

/** Det største renseanlegget verket har */
export function cleaner(g: GameState): (typeof CLEANERS)[number] | null {
  for (let i = CLEANERS.length - 1; i >= 0; i--) if (has(g, CLEANERS[i].id)) return CLEANERS[i];
  return null;
}

/** Neste renseanlegg som kan kjøpes (det store kjøpet når anlegget er for lite) */
export function nextCleaner(g: GameState): (typeof CLEANERS)[number] | null {
  const c = cleaner(g);
  return c ? (CLEANERS[CLEANERS.indexOf(c) + 1] ?? null) : null;
}

export function cleanerName(id: string): string {
  return ADDONS.find((a) => a.id === id)?.name ?? id;
}

/** Står renseanlegget etter et havari? */
export function envDown(g: GameState): boolean {
  return g.env.downUntilMin > g.minute;
}

/** Tonn i timen renseanlegget renser nå: halvparten med én linje ute, ingenting med én linje (B-263) */
export function cleanTph(g: GameState): number {
  const c = cleaner(g);
  if (!c) return 0;
  const full = c.tpd / 24;
  if (!envDown(g)) return full;
  return c.twoLines ? full / 2 : 0;
}

/** Tonn i timen ovn nr. i smelter mens den går (samme regning som meltTph i plant.ts) */
function unitTph(stats: PlantStats, i: number): number {
  const u = stats.units[i] ?? stats.units[0];
  return u ? (u.sizeT * 60 * 0.93) / u.cycleMin : 0;
}

/** Hvor stor del av røyken som går urenset ut når alle ovnene går (0 = alt renses) */
export function shortfall(g: GameState, stats: PlantStats): number {
  const c = cleaner(g);
  if (!c || stats.meltTph <= 0) return 0;
  return Math.max(0, 1 - c.tpd / 24 / stats.meltTph);
}

/** Hva ovnene gjør når renseanlegget står. Ikke valgt ennå: de stopper (det trygge). */
export function stopsOnBreakdown(g: GameState): boolean {
  return (g.env.onBreakdown ?? "stopp") === "stopp";
}

/**
 * Mens renseanlegget står og spilleren har valgt å stoppe, starter en ovn bare hvis det som er igjen av rensingen
 * (den andre linjen) holder også for den. Gir grunnen til at ovnen venter, eller null.
 */
export function envStartBlocked(g: GameState, stats: PlantStats, index: number): string | null {
  if (!envActive(g) || !envDown(g) || !stopsOnBreakdown(g)) return null;
  let load = unitTph(stats, index);
  g.furnaces.forEach((f, i) => {
    if (f.heat && i !== index) load += unitTph(stats, i);
  });
  return load > cleanTph(g) + 1e-9 ? "Venter på renseanlegget (havari)" : null;
}

/** Røyken fra ovnene som går nå, i dette tidssteget: det renseanlegget ikke tar, telles som utslipp */
export function updateEmissions(g: GameState, stats: PlantStats, dt: number): void {
  // Eldre lagringer får renseanleggene i første tidssteg, før noe telles
  if (g.env.grant) grantCleaners(g, stats);
  if (!envActive(g)) return;
  let load = 0;
  g.furnaces.forEach((f, i) => {
    if (f.heat) load += unitTph(stats, i);
  });
  if (load <= 0) return;
  const down = envDown(g);
  // Har spilleren valgt å stoppe, står ovnene som ikke får plass; chargene som alt var i gang, kjøres ferdig med
  // nødspjeldet (ingen bot for dem)
  if (down && stopsOnBreakdown(g)) return;
  const over = Math.max(0, load - cleanTph(g));
  if (over <= 0) return;
  const t = (over * dt) / 60;
  g.env.excessT += t;
  if (down) g.env.downT += t;
}

/**
 * Eldre lagringer (B-263): et verk som alt har ovner større enn renseanlegget, får anleggene som trengs, gratis, så
 * ingen får bot for noe de ikke kunne vite om.
 */
function grantCleaners(g: GameState, stats: PlantStats): void {
  g.env.grant = undefined;
  if (!envActive(g)) return;
  const needTpd = stats.meltTph * 24;
  const given: string[] = [];
  for (const c of CLEANERS) {
    if (!has(g, c.id)) {
      g.owned.push(c.id);
      given.push(cleanerName(c.id));
    }
    if (c.tpd >= needTpd) break;
  }
  if (given.length)
    log(
      g,
      `Nytt: miljøkrav for røyk og støv. Verket ditt har fått renseanlegg som holder for ovnene du har (${given.join(", ")}). Bygger du ut, må rensingen følge med – ellers blir det bot.`,
      "event",
    );
}

/** Hver time: havari på renseanlegget, og beskjed når det er reparert */
export function envHour(g: GameState, stats: PlantStats): void {
  if (!envActive(g)) return;
  if (g.env.downUntilMin > 0 && g.minute >= g.env.downUntilMin) {
    g.env.downUntilMin = 0;
    log(g, "Renseanlegget er reparert og renser røyken igjen.", "info");
  }
  const running = g.furnaces.some((f) => f.heat);
  if (!running || envDown(g)) return;
  // Oftere om vinteren (B-265)
  if (chance(g, (BREAKDOWN_PER_DAY / 24) * stats.maintFactor * riskFactor(g))) envBreakdown(g, stats);
}

/** Pris for å reparere renseanlegget: litt av prisen på anlegget */
function repairCost(g: GameState): number {
  const c = cleaner(g);
  const price = ADDONS.find((a) => a.id === c?.id)?.price ?? 1_500_000;
  return Math.max(50_000, Math.round(price * 0.02));
}

export function envBreakdown(g: GameState, stats: PlantStats): void {
  const c = cleaner(g);
  if (!c) return;
  const hours = REPAIR_HOURS * stats.repairFactor * uniform(g, 0.7, 1.3);
  g.env.downUntilMin = g.minute + hours * 60;
  const cost = repairCost(g);
  addCost(g, "vedlikehold", cost);
  unlock(g, "miljo");
  const h = hours.toFixed(0);
  const what = c.twoLines
    ? `Havari på den ene linjen i renseanlegget (ca. ${h} t). Den andre renser halvparten.`
    : `Havari på renseanlegget: viften stoppet, og røyken blir ikke renset (ca. ${h} t).`;
  // Første gang spør et kort hva ovnene skal gjøre; valget gjelder senere havarier og kan endres under Anlegg → Ovn
  if (g.env.onBreakdown === null && !g.pendingDecision && !g.pendingManual) {
    g.pendingDecision = {
      id: "rensehavari",
      title: "Havari på renseanlegget",
      text: `${what} Går ovnene videre, slipper røyken ut, og myndighetene gir bot: ${fmtKr(FINE_PER_T * DOWN_FINE_FACTOR)} per tonn stål og tap av omdømme. Stopper du, taper du produksjon til det er reparert. Valget gjelder også senere havarier (du kan endre det under Anlegg → Ovn).`,
      options: [
        { label: "Stopp ovnene til det er reparert", hint: "Ingen bot. Chargene som er i gang, kjøres ferdig." },
        { label: "Kjør videre og ta boten", hint: "Full produksjon, men dobbel bot og tap av omdømme." },
        { label: "Les om renseanlegget i fagboka", chapter: "miljo" },
      ],
      data: { hours: Math.round(hours) },
      resumeSpeed: g.speed > 0 ? g.speed : 1,
    };
    g.speed = 0;
    return;
  }
  const policy = stopsOnBreakdown(g)
    ? c.twoLines
      ? " Ovnene som ikke får plass på den andre linjen, venter."
      : " Ovnene stopper til det er reparert."
    : " Ovnene går videre – det blir bot.";
  log(g, `${what} Reparasjon ${fmtKr(cost)}.${policy}`, "bad");
}

/** Valget på kortet ved første havari */
export function chooseBreakdownPolicy(g: GameState, option: number): void {
  if (option === 1) {
    g.env.onBreakdown = "kjor";
    log(g, "Ovnene går videre mens renseanlegget repareres. Boten kommer i morgen.", "info");
  } else {
    // Fagboka (valg 3) regnes som å stoppe, det trygge
    g.env.onBreakdown = "stopp";
    log(g, "Ovnene stopper til renseanlegget er reparert.", "info");
  }
}

/** Ved nytt døgn: bot for gårsdagens utslipp */
export function envDay(g: GameState): void {
  const t = g.env.excessT;
  const downT = Math.min(t, g.env.downT);
  g.env.excessT = 0;
  g.env.downT = 0;
  if (t < 0.5) return;
  const kr = Math.round(
    (t - downT) * FINE_PER_T + downT * FINE_PER_T * DOWN_FINE_FACTOR + (FINE_BASE[g.stage] ?? 50_000),
  );
  addCost(g, "bot", kr);
  g.env.finesKr += kr;
  g.env.lastFine = { day: day(g) - 1, t, kr };
  const rep = t >= 500 || downT > 0 ? 2 : 1;
  adjustReputation(g, -rep);
  unlock(g, "miljo");
  const next = nextCleaner(g);
  const why =
    downT >= t / 2
      ? " Ovnene gikk mens renseanlegget sto."
      : next
        ? ` Renseanlegget er for lite for ovnene: ${cleanerName(next.id)} (under Anlegg → Ovn) renser ${fmtT(next.tpd)} i døgnet.`
        : " Renseanlegget er for lite for ovnene.";
  log(
    g,
    `Bot for utslipp: ${fmtT(t)} stål ble smeltet i går uten at røyken ble renset. Bot ${fmtKr(kr)}, omdømme −${rep}.${why}`,
    "bad",
  );
}
