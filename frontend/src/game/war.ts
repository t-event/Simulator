/**
 * Krig i verden (B-297): bare for dem som har åpnet konsernet (gradvis synlighet). Høyst én krig per år i spillet, og
 * ikke hvert år. Krigen gjør strømmen dyrere, men etterspørselen etter stål øker: flere forespørsler og bedre pris. Jo
 * sterkere den er, jo lenger varer den. Ren logikk – motoren skriver beskjedene.
 */
import { yearOf } from "./calendar";
import { day } from "./plant";
import { chance, uniform } from "./random";
import type { GameState } from "./types";

export const WAR = {
  /** Sjansen per døgn for krig i et år uten krig: omtrent annethvert år */
  perDay: 1 / 520,
  /** Hvor mye strømmen, stålprisen og forespørslene øker ved full styrke (styrken er 0,5–1) */
  power: 0.8,
  steel: 0.15,
  demand: 0.5,
  /** Døgn krigen varer: 20 + 40 × styrken */
  baseDays: 20,
  extraDays: 40,
  /** Døgn fra en krig er slutt til en ny kan starte (i tillegg til nytt år) */
  gap: 60,
};

/** Krigen som pågår nå, eller null */
export function activeWar(g: GameState, d = day(g)): NonNullable<GameState["war"]> | null {
  const w = g.war;
  return w && d >= w.fromDay && d <= w.untilDay ? w : null;
}

/** Hva prisen ganges med mens krigen pågår (1 ellers) */
export function warFactor(g: GameState, key: "scrap" | "steel" | "power" | "demand"): number {
  const w = activeWar(g);
  if (!w) return 1;
  if (key === "power") return 1 + WAR.power * w.strength;
  if (key === "steel") return 1 + WAR.steel * w.strength;
  if (key === "demand") return 1 + WAR.demand * w.strength;
  return 1;
}

/** Prosent over normalt, som tekst i beskjedene */
export function warPct(g: GameState, key: "steel" | "power" | "demand"): number {
  return Math.round((warFactor(g, key) - 1) * 100);
}

/** Ved nytt døgn: kanskje krig, eller beskjed om at den er slutt. Gir teksten som skal i loggen, eller null */
export function warDay(g: GameState): { text: string; kind: "event" | "info" } | null {
  if (!g.konsern?.unlocked) return null;
  const today = day(g);
  const w = g.war;
  if (w && today === w.untilDay + 1)
    return { text: "Krigen er over: strømprisen og etterspørselen etter stål er tilbake til normalt.", kind: "info" };
  if (w && (yearOf(today) <= w.year || today <= w.untilDay + WAR.gap)) return null;
  if (!chance(g, WAR.perDay)) return null;
  const strength = uniform(g, 0.5, 1);
  const days = Math.round(WAR.baseDays + WAR.extraDays * strength);
  g.war = { year: yearOf(today), fromDay: today, untilDay: today + days - 1, strength };
  return {
    text: `Krig i verden: gass og olje blir dyrere, og strømprisen stiger ca. ${warPct(g, "power")} %. Samtidig trengs det mer stål: ca. ${warPct(g, "demand")} % flere forespørsler og ${warPct(g, "steel")} % bedre pris. Det varer i ca. ${days} døgn. Fastpris på strøm kan lønne seg nå.`,
    kind: "event",
  };
}
