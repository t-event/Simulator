/**
 * Grønt stål (B-506): klimaavtrykket i tonn CO₂ per tonn stål, og kunder som vil ha stål under et krav.
 *
 * Avtrykket er en avledet verdi, ikke en valuta (B-180). Det regnes for hver charge av tre ting:
 *   - Innsatsen: skrap har nesten ikke noe avtrykk (det er alt laget), råjern fra masovn har mye (koks), og jernsvamp
 *     redusert med hydrogen lite.
 *   - Strømmen: kWh per tonn × utslippet fra strømmen.
 *   - Det faste: elektrodene, kalken og gassen i brennerne.
 * Verket ser avtrykket når «Grønt stål» er forsket fram. Da kommer også noen forespørsler med CO₂-krav: samme pris,
 * og ekstra omdømme og en prestasjon når stålet holdt kravet. Ingen bot og ingen ny inntekt (B-305).
 *
 * Tallene er generiske og avrundede, til læring – ikke fra noe bestemt verk.
 */
import { SCRAP_IDS } from "./data";
import { hasResearch } from "./research";
import type { Contract, GameState, ScrapId } from "./types";

/** Tonn CO₂ per tonn innsats, fra der den ble laget (oppstrøms) */
export const SCRAP_CO2: Record<ScrapId, number> = {
  blandet: 0.03,
  tungt: 0.03,
  shredder: 0.04,
  spon: 0.03,
  rent: 0.02,
  rajern: 1.9,
  jernsvamp: 0.15,
  retur: 0,
};

export const GREEN = {
  /** Tonn CO₂ per kWh (30 g, ren nordisk strøm i snitt) */
  perKwh: 0.00003,
  /** Elektroder, kalk og gass i brennerne, tonn CO₂ per tonn stål */
  fixedPerT: 0.08,
  /** Kravet i en grønn forespørsel, tonn CO₂ per tonn stål */
  limit: 0.3,
  /** Andelen av forespørslene som er grønne (bare når «Grønt stål» er forsket fram) */
  share: 0.2,
  /** Ekstra omdømme når stålet holdt kravet (ganges med kontraktens vanlige omdømme) */
  repShare: 0.5,
  /** Vekten på den nyeste chargen i snittet */
  weight: 0.25,
};

/** Ser verket klimaavtrykket og grønne forespørsler? */
export function greenOn(g: GameState): boolean {
  return hasResearch(g, "gronnstal");
}

/** Avtrykket fra innsatsen i en resept (vektet med andelene), tonn CO₂ per tonn */
export function recipeInputCo2(recipe: Record<ScrapId, number>): number {
  const total = SCRAP_IDS.reduce((a, id) => a + (recipe[id] ?? 0), 0);
  if (total <= 0) return 0;
  return SCRAP_IDS.reduce((a, id) => a + ((recipe[id] ?? 0) / total) * SCRAP_CO2[id], 0);
}

/** Hele avtrykket for en charge: innsatsen, strømmen og det faste */
export function heatCo2(inputCo2: number, kwhPerT: number): number {
  return inputCo2 + kwhPerT * GREEN.perKwh + GREEN.fixedPerT;
}

/** En charge er startet: snittet av avtrykket flyttes mot den */
export function noteHeatCo2(g: GameState, co2: number): void {
  g.co2Now = g.co2Now === undefined ? co2 : g.co2Now * (1 - GREEN.weight) + co2 * GREEN.weight;
}

/** Tekst for et avtrykk, f.eks. «0,14 t CO₂ per tonn» */
export function fmtCo2(v: number): string {
  return `${v.toFixed(2).replace(".", ",")} t CO₂ per tonn`;
}

/** Snittet for det som er levert på en grønn kontrakt */
export function contractCo2(c: Contract): number | null {
  return c.co2Max !== undefined && c.delivered > 0 ? (c.co2Sum ?? 0) / c.delivered : null;
}
