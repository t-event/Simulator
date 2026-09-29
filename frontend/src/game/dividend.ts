/**
 * Utbytte fra datterverkene i ekte tid (B-304, reform 2) – speiler `dividend_from_state` i
 * `supabase/051_utbytte_i_ekte_tid.sql`. Serveren regner utbyttet av det lagrede spillet én gang per ekte dag og betaler
 * det inn i konsernkassa. Lokal spillfart betyr ingenting: 10× gir like mye som 1×. Endres regelen, må SQL-en og denne
 * fila endres sammen, og testen med de faste tallene kjøres mot begge.
 *
 * Regelen for én spiller én ekte dag:
 * - hvert verk som er ferdig bygget, har et driftsresultat: grunntall etter type × (1 + 0,25 per trinn modernisering)
 *   × felles funksjoner (+5 % hver) × konsernforskning (+10 % hver)
 * - verket beholder 30 % til vedlikehold, lokal ledelse og reserve
 * - verkene stilles i rekke etter driftsresultat: det beste gir full andel, det neste 1/(1 + 0,1) osv.
 * - hjemmeverket er flaggskipet: inntil +20 % med omdømme 100 og bare stål som holdt kvaliteten de siste sju døgnene
 * - imperiebelastningen: over 10 mill. per dag vokser utbyttet bare med kvadratroten (14 komplekser gir ca. 3 ganger
 *   så mye som 3, ikke 5 ganger)
 * Tallene er en tidel av driftsresultatet per spilldøgn (B-311): fullt konsern ca. 30 mill. per ekte dag.
 * Ingen import av motoren, så tallene kan brukes av tester og av grensesnittet uten sirkler.
 */
import type { SisterType } from "./types";

export const DIVIDEND = {
  /**
   * Utbytte per ekte dag ved normalt marked, uten modernisering: en tidel av driftsresultatet per spilldøgn
   * (SISTER_TYPES.profitPerDay), så verden går i et menneskelig tempo (B-311: én milliard tar et fullt konsern ca. en
   * måned, som et ekte europeisk konsern)
   */
  base: { stalverk: 500_000, storverk: 2_000_000, kompleks: 6_000_000 } as Record<SisterType, number>,
  /** Mer per trinn modernisering (= MODERNIZE_GAIN) */
  levelGain: 0.25,
  /** Per felles funksjon (innkjøp, salg) */
  shared: 0.05,
  /** Per konsernprosjekt i forskningen (konsernstyring, gronnkonsern) */
  research: 0.1,
  /**
   * Mesterskapet «Konsernledelse» teller ikke lenger (B-328, valg A): fagpoeng er spilltid, og spilltid skal ikke gi
   * makt i ekte tid (B-323). Fordelen er flyttet til hjemmeverket (lavere administrasjon). Står som 0 for eldre tester
   */
  masteryMax: 0,
  masteryStep: 0.9,
  /** Del av driftsresultatet som blir igjen i verket */
  keep: 0.3,
  /** Hvor mye mindre som kan løftes opp for hvert verk nedover i rekken */
  decay: 0.1,
  /** Flaggskipet: inntil så mye mer med omdømme 100 og bare stål som holder kvaliteten */
  flagship: 0.2,
  /** Imperiebelastningen: over dette per dag vokser utbyttet med potensen `loadPower` (B-311: 10 mill.) */
  loadFrom: 10_000_000,
  loadPower: 0.5,
  /** Utbytte samles opp i høyst så mange ekte dager for den som ikke åpner spillet (serveren) */
  maxDays: 14,
};

export interface DividendPlant {
  type: SisterType;
  level: number;
  /** Bygges ennå: tjener ingenting */
  building: boolean;
}

export interface DividendInput {
  plants: DividendPlant[];
  /** Antall felles funksjoner (0–2) */
  shared: number;
  /** Antall konsernprosjekter forsket fram (0–2) */
  research: number;
  /** Nivå i mesterskapet «Konsernledelse» */
  mastery: number;
  /** Omdømmet hjemme, 0–100 */
  reputation: number;
  /** Andel av stålet hjemme som holdt kvaliteten de siste sju døgnene, 0–1 (0 uten produksjon) */
  quality: number;
}

/** Driftsresultatet per døgn i ett verk ved normalt marked */
export function plantProfit(p: DividendPlant, input: Pick<DividendInput, "shared" | "research" | "mastery">): number {
  if (p.building) return 0;
  const d = DIVIDEND;
  const mastery = 1 + d.masteryMax * (1 - d.masteryStep ** Math.max(0, input.mastery));
  return (
    d.base[p.type] *
    (1 + d.levelGain * p.level) *
    (1 + d.shared * input.shared) *
    (1 + d.research) ** input.research *
    mastery
  );
}

/** Flaggskipet: hvor mye mer (andel) hjemmeverket gir alle datterverkene */
export function flagshipOf(reputation: number, quality: number): number {
  return DIVIDEND.flagship * Math.min(1, Math.max(0, reputation / 100)) * Math.min(1, Math.max(0, quality));
}

/** Imperiebelastningen: uendret opp til grensen, så avtagende */
export function afterEmpireLoad(net: number): number {
  const { loadFrom, loadPower } = DIVIDEND;
  if (!(net > loadFrom) || loadFrom <= 0) return net;
  return loadFrom * (net / loadFrom) ** loadPower;
}

/** Det hvert verk gir før imperiebelastningen, i samme rekkefølge som `plants` */
export function dividendParts(input: DividendInput): number[] {
  const profits = input.plants.map((p) => plantProfit(p, input));
  const order = profits.map((_, i) => i).sort((a, b) => profits[b] - profits[a] || a - b);
  const flagship = 1 + flagshipOf(input.reputation, input.quality);
  const out = new Array<number>(input.plants.length).fill(0);
  order.forEach((i, r) => (out[i] = profits[i] * (1 - DIVIDEND.keep) * (1 / (1 + DIVIDEND.decay * r)) * flagship));
  return out;
}

/** Utbyttet til konsernkassa per ekte dag */
export function dividendPerDay(input: DividendInput): number {
  return afterEmpireLoad(dividendParts(input).reduce((a, b) => a + b, 0));
}

/** Det hvert verk gir etter imperiebelastningen (skalert likt), så tallene per verk stemmer med summen */
export function dividendShares(input: DividendInput): number[] {
  const parts = dividendParts(input);
  const sum = parts.reduce((a, b) => a + b, 0);
  const net = afterEmpireLoad(sum);
  return parts.map((p) => (sum > 0 ? (p * net) / sum : 0));
}
