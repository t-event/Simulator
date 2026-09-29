/**
 * Skraplagerets inntekt i ekte tid (B-185, B-188) – speiler `meter_register` og `scrap_counted_t` i
 * `supabase/029_produksjonsmaler.sql`. Brukes av testene (som viser at lokal fart ikke gir mer inntekt) og til å vise et
 * anslag i spillet. Endres regelen, må SQL-en og denne fila endres sammen.
 *
 * Regelen for én spiller én ekte dag (norsk dato, B-369):
 *   teller = min(nye tonn den dagen, normal fart × takdøgn) × skrap per tonn stål
 * - Nye tonn: bare tonn over det høyeste spilleren har hatt (en gammel lagring gir ikke de samme tonnene to ganger).
 * - Normal fart: tonn per spilldøgn over de siste tallene i tidslinja (flere hele spilldøgn) – verkets størrelse, ikke
 *   farten. Regnes med spillminuttene (`game_min`), ikke hele spilldager: tidslinja får tall midt i en spilldag, og med
 *   hele dager ble farten målt opptil 37 % for høy på 10×. Medianen av enkeltintervaller var for ujevn med skiftdrift
 *   (12 % forskjell). Begge deler ble funnet av testene i scrapTests.ts.
 */
import { worldDay } from "../game/clock";

export const SCRAP_INCOME = {
  /** Tonn skrap per tonn stål */
  scrapPerSteel: 1.1,
  /** Så mange normale spilldøgn teller per ekte dag */
  capGameDays: 1,
  /** Så mange tall fra tidslinja farten regnes over (ca. 7–9 spilldøgn) */
  rateWindow: 8,
  /** Kroner til skraplageret per tonn skrap som teller (standard; serveren leser config.world) */
  feePerT: 50,
};

/** Produksjonsmåleren for én spiller, slik serveren fører den */
export class ProductionMeter {
  season: number | null = null;
  hwm = 0;
  /** De siste tallene fra tidslinja: [spillminutt, tonn i alt] – bare framover i tid */
  points: [number, number][] = [];
  /** Nye tonn per ekte UTC-dag */
  readonly days = new Map<string, number>();
  private started = false;

  /** Et tall fra tidslinja: spillminutt (`game_min`), tonn laget i alt, og serverens tidspunkt */
  register(atMs: number, gameMin: number, produced: number, season: number | null = null): void {
    if (!this.started || season !== this.season) {
      this.started = true;
      this.season = season;
      this.hwm = produced;
      this.points = [[gameMin, produced]];
      return;
    }
    const gained = Math.max(0, produced - this.hwm);
    if (gained > 0) {
      const key = worldDay(atMs);
      this.days.set(key, (this.days.get(key) ?? 0) + gained);
    }
    const last = this.points[this.points.length - 1];
    // Framover i tid: legg til. Bakover (en gammel lagring): start målingen på nytt herfra
    if (last && gameMin > last[0] && produced >= last[1])
      this.points = [...this.points, [gameMin, produced] as [number, number]].slice(-SCRAP_INCOME.rateWindow);
    else if (!last || gameMin < last[0] || produced < last[1]) this.points = [[gameMin, produced]];
    this.hwm = Math.max(this.hwm, produced);
  }

  /** Tonn stål per spilldøgn over de siste tallene */
  normalRate(): number {
    if (this.points.length < 2) return 0;
    const [m0, p0] = this.points[0];
    const [m1, p1] = this.points[this.points.length - 1];
    return (p1 - p0) / ((m1 - m0) / 1440);
  }

  /** Nye tonn stål en ekte dag */
  gained(dayKey: string): number {
    return this.days.get(dayKey) ?? 0;
  }

  /** Tonn skrap som teller for skraplageret en ekte dag */
  countedT(dayKey: string): number {
    return Math.min(this.gained(dayKey), this.normalRate() * SCRAP_INCOME.capGameDays) * SCRAP_INCOME.scrapPerSteel;
  }
}

/** Inntekten til skraplageret en ekte dag: eierens egne tonn og flaggede spillere teller ikke */
export function scrapYardIncome(
  buyers: { meter: ProductionMeter; owner?: boolean; flagged?: boolean }[],
  dayKey: string,
  feePerT = SCRAP_INCOME.feePerT,
): number {
  return buyers.reduce((a, b) => a + (b.owner || b.flagged ? 0 : b.meter.countedT(dayKey) * feePerT), 0);
}
