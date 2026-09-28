/**
 * Året i spillet (B-265): tolv måneder à 30 døgn. Dag 1 er 1. april, så den første vinteren kommer når verket er
 * etablert. Om vinteren (midten av november til midten av mars, 120 døgn, B-272) gir is, snø og kulde flere uhell: eksplosjoner i ovnen, havarier og
 * uforutsette hendelser.
 */
import { addCost, fmtKr, log } from "./engine";
import { day, type PlantStats } from "./plant";
import { chance, uniform } from "./random";
import type { GameState } from "./types";

export const YEAR_DAYS = 360;
const MONTH_DAYS = 30;
/** Dag 1 er i april (måned nr. 3, der januar er 0) */
const START_MONTH = 3;

export const MONTHS = [
  "januar",
  "februar",
  "mars",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "desember",
];

/** Måneden (0 = januar) på en dag i spillet */
export function monthOf(d: number): number {
  return (START_MONTH + Math.floor((d - 1) / MONTH_DAYS)) % 12;
}

/** Dag i året (0 = 1. januar, 359 = 30. desember) */
export function dayOfYear(d: number): number {
  return (START_MONTH * MONTH_DAYS + d - 1) % YEAR_DAYS;
}

/** Vinteren varer 120 døgn: fra 15. november til og med 14. mars (B-272; var desember–februar, 90 døgn) */
const WINTER_FROM = 10 * MONTH_DAYS + 14;
const WINTER_TO = 2 * MONTH_DAYS + 14;
export const WINTER_DAYS = YEAR_DAYS - WINTER_FROM + WINTER_TO;

export function isWinter(g: GameState, d = day(g)): boolean {
  const n = dayOfYear(d);
  return n >= WINTER_FROM || n < WINTER_TO;
}

/** Hvor mye oftere havarier og uforutsette hendelser skjer: halvannen gang så ofte om vinteren */
export const WINTER_RISK = 1.5;

export function riskFactor(g: GameState): number {
  return isWinter(g) ? WINTER_RISK : 1;
}

/** Ved nytt døgn: beskjed når vinteren kommer og går */
export function calendarDay(g: GameState): void {
  const today = day(g);
  const now = isWinter(g, today);
  const was = isWinter(g, today - 1);
  if (now && !was)
    log(
      g,
      "Vinteren er kommet. Is og snø i skrapet kan gi eksplosjoner i ovnen, og kulden gir flere havarier og uhell. Tak over skraplageret og sortering gir færre eksplosjoner.",
      "event",
    );
  else if (!now && was) log(g, "Våren er kommet: færre uhell i verket.", "info");
}

/** Frost om vinteren (B-265): av og til fryser kjølevannet til støpemaskinen, og støpingen står noen timer */
export function winterHour(g: GameState, stats: PlantStats): void {
  if (!isWinter(g) || g.stage < 2 || stats.shifts === 0 || g.minute < g.castDownUntilMin) return;
  if (!chance(g, (1 / 30 / 24) * stats.maintFactor)) return;
  const hours = uniform(g, 3, 6) * stats.repairFactor;
  const cost = 10_000 * (1 + g.stage) ** 2;
  g.castDownUntilMin = g.minute + hours * 60;
  addCost(g, "vedlikehold", cost);
  log(
    g,
    `Frost: kjølevannsrørene til støpemaskinen frøs i natt. Støpingen står i ${hours.toFixed(0)} timer (reparasjon ${fmtKr(cost)}).`,
    "bad",
  );
}
