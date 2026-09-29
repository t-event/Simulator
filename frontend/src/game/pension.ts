/**
 * Alder og pensjon (B-357). Alle ansatte har en alder, som øker med ett år per spillår (360 døgn). De fleste går av med
 * pensjon ved 67; noen går av tidligere, fra 62 (som med AFP). Spilleren får beskjed en måned før, så det er tid til å
 * ansette en ny. Lærlinger er unge, søkerne mellom 20 og 59.
 */
import { YEAR_DAYS } from "./calendar";
import { ROLES } from "./data";
import { adjustMorale, countEvent, log } from "./engine";
import { day } from "./plant";
import { uniform } from "./random";
import type { GameState, Worker } from "./types";

export const PENSION = {
  /** Vanlig pensjonsalder */
  age: 67,
  /** Tidligste pensjonsalder (AFP) */
  earliest: 62,
  /** Døgn før pensjonen spilleren får beskjed */
  noticeDays: 30,
  /** Alder for nye søkere og lærlinger (fra og med, til) */
  candidateAge: [20, 60] as const,
  apprenticeAge: [17, 20] as const,
  /** Den erfarne pensjonisten fra hendelseskortet er 63–66 og jobber til 70 */
  returneeAge: [63, 67] as const,
  returneeRetire: 70,
};

/** Et fast, spredt tall fra id-en (lagrede spill uten alder får samme alder hver gang) */
function spread(id: number, salt: number): number {
  let x = (Math.imul(id + salt * 7919, 2654435761) >>> 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 0x100000000;
}

/** Fødselsdøgnet for en som er mellom `from` og `to` år (tilfeldig, med spillets terning) */
export function bornAt(g: GameState, [from, to]: readonly [number, number]): number {
  return day(g) - Math.floor(uniform(g, from, to) * YEAR_DAYS);
}

/** Alderen i hele år */
export function ageOf(w: Worker, today: number): number {
  return Math.floor((today - (w.born ?? today - 40 * YEAR_DAYS)) / YEAR_DAYS);
}

/** Alderen den ansatte går av med pensjon: halvparten ved 67, resten 62–66 */
export function retireAgeOf(w: Worker): number {
  if (w.retireAge) return w.retireAge;
  const r = Math.floor(spread(w.id, 2) * 10);
  return r < 5 ? PENSION.age : PENSION.earliest + (r - 5);
}

/** Døgnet den ansatte går av med pensjon */
export function pensionDay(w: Worker): number {
  return (w.born ?? 0) + retireAgeOf(w) * YEAR_DAYS;
}

/** Døgn til pensjonen, eller null hvis den er mer enn en måned unna (vises i lista over ansatte) */
export function pensionSoon(w: Worker, today: number): number | null {
  const left = pensionDay(w) - today;
  return left <= PENSION.noticeDays ? Math.max(0, left) : null;
}

/** Ansatte i lagrede spill fra før B-357 får en alder (22–59), fast ut fra id-en, så ingen går av det første året */
export function giveAge(w: Worker, today: number): void {
  if (w.born !== undefined) return;
  const apprentice = w.apprenticeUntil !== undefined;
  const age = apprentice ? 17 + spread(w.id, 1) * 3 : 22 + spread(w.id, 1) * 38;
  w.born = today - Math.floor(age * YEAR_DAYS);
}

/** Hver morgen: beskjed en måned før, og pensjon på dagen */
export function pensionMorning(g: GameState): void {
  const today = day(g);
  for (const w of [...g.workers]) {
    if (w.born === undefined) continue;
    const at = pensionDay(w);
    const role = ROLES[w.role].name.toLowerCase();
    if (today >= at) {
      g.workers = g.workers.filter((x) => x.id !== w.id);
      const years = Math.max(0, Math.floor((today - w.hiredDay) / YEAR_DAYS));
      adjustMorale(g, 1);
      countEvent(g, "pensjon");
      log(
        g,
        `${w.name} (${role}) går av med pensjon, ${ageOf(w, today)} år gammel${years >= 1 ? `, etter ${years} år på verket` : ""}. Takk for innsatsen!`,
        "info",
      );
    } else if (today >= at - PENSION.noticeDays && !w.pensionNotice) {
      w.pensionNotice = true;
      log(
        g,
        `${w.name} (${role}) går av med pensjon om ${at - today} døgn. Ansett en ny ${role} i tide, så skiftene går som før.`,
        "event",
      );
    }
  }
}
