/**
 * Serverens klokke (B-314). Byggeprosjektene i konsernet går i ekte tid, og før gikk de etter telefonens klokke –
 * som kan stilles fram. Nå leses tidspunktet i svarene fra tjenesten (Date-headeren), og `realNow()` i spillmotoren
 * bruker serverens tid pluss det som har gått siden svaret. Uten nett brukes den siste kjente forskyvningen.
 */
import { setRealClock } from "../game/clock";

let offsetMs = 0;
let synced = false;

/** Tar imot Date-headeren fra et svar. Ugyldige eller manglende verdier gjør ingenting. */
export function syncServerClock(dateHeader: string | null | undefined, localNow = Date.now()): boolean {
  if (!dateHeader) return false;
  const server = Date.parse(dateHeader);
  if (!Number.isFinite(server)) return false;
  offsetMs = server - localNow;
  if (!synced) {
    synced = true;
    setRealClock(() => Date.now() + offsetMs);
  }
  return true;
}

/** Forskyvningen mellom serverens og telefonens klokke i ms (positiv: telefonen går bak) */
export function serverClockOffset(): number {
  return offsetMs;
}

/** Til tester: glem serveren og bruk telefonens klokke igjen */
export function resetServerClock(): void {
  offsetMs = 0;
  synced = false;
  setRealClock(() => Date.now());
}
