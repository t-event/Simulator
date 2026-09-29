/**
 * Hva neste nivå i mesterskapet er verdt for akkurat dette verket (B-237), i kroner per døgn, regnet fra snittet av de
 * siste sju døgnene. Vises ved hvert prosjekt, så spilleren ser hvilket som lønner seg – prisene er satt etter det samme.
 */
import { masteryEffect, masteryLevel } from "./mastery";
import { adminPerDay, computePlantStats } from "./plant";
import type { GameState, MasteryId } from "./types";

function perDay(g: GameState, pick: (d: GameState["history"][number]) => number): number {
  const days = g.history.slice(-7);
  return days.length ? days.reduce((s, d) => s + pick(d), 0) / days.length : 0;
}

export function masteryGainPerDay(g: GameState, id: MasteryId): number {
  const level = masteryLevel(g, id);
  const now = masteryEffect(id, level);
  const next = masteryEffect(id, level + 1);
  // Inntekter som øker: dagens tall er alt ganget med (1 + nå); kostnader som synker: ganget med (1 − nå)
  const up = (amount: number) => (amount * (next - now)) / (1 + now);
  const down = (amount: number) => (amount * (next - now)) / (1 - now);
  switch (id) {
    case "pris":
      return up(perDay(g, (d) => (d.income?.kontrakt ?? 0) + (d.income?.spot ?? 0)));
    case "strom":
      return down(perDay(g, (d) => d.costs?.energi ?? 0));
    case "skrap":
      return down(perDay(g, (d) => d.costs?.skrap ?? 0));
    case "foring":
      return down(perDay(g, (d) => d.costs?.vedlikehold ?? 0));
    case "datterverk":
      // Administrasjonen på storverket (B-328), som står i posten «faste»: full administrasjon × det neste nivået gir
      return adminPerDay(computePlantStats(g)) * (next - now);
  }
}
