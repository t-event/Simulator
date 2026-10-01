/**
 * Eksplosjoner i ovnen og dødsulykker (B-265).
 *
 * Vann, is og snø som kommer med skrapet ned i flytende stål, blir til damp på et øyeblikk og kan gi en eksplosjon.
 * Det skjer oftere om vinteren. Tak over skraplageret, sortering og sikkerhetskultur gir færre (B-274). En
 * dødsulykke er ekstremt sjelden, men har store følger: verket stenges i tre døgn, stor bot og tap av omdømme og trivsel.
 */
import { isWinter } from "./calendar";
import { addCost, adjustMorale, adjustReputation, countEvent, fmtKr, log, unlock, workerLabel } from "./engine";
import { has, isAbsent } from "./plant";
import { chance, pick, uniform } from "./random";
import { hasResearch } from "./research";
import type { GameState } from "./types";

/** Eksplosjoner per ovn per døgn i drift, uten tiltak (sommer). Var 1/90, men på 10× ble det for ofte (B-270). */
const EXPLOSIONS_PER_DAY = 1 / 300;
/** Om vinteren: tre ganger så mange (is og snø i skrapet) */
export const WINTER_EXPLOSION = 3;
/** Sjansen for at en eksplosjon skader noen */
const INJURY = 0.25;
/** Sjansen for at en eksplosjon tar livet av noen (halvparten med sikkerhetskultur). Var 2 % (B-270). */
export const FATAL_PER_EXPLOSION = 0.01;
/** Døgn verket står mens politiet og tilsynet gransker en dødsulykke */
export const FATAL_DOWN_DAYS = 3;
/** Bot etter en dødsulykke, per nivå (garasje … storverk) */
const FATAL_FINE = [0, 500_000, 3_000_000, 20_000_000, 100_000_000];

/** Ligger skrapet under tak? Taket over skraplageret, eller skrapterminalen (B-274) */
export function roofed(g: GameState): boolean {
  return has(g, "skraptak") || has(g, "skrapterminal");
}

/** Sjansen for en eksplosjon i en charge som tar så mange minutter */
export function explosionChance(g: GameState, cycleMin: number): number {
  if (g.stage < 1) return 0;
  let p = EXPLOSIONS_PER_DAY * (cycleMin / 1440);
  if (isWinter(g)) p *= WINTER_EXPLOSION;
  // Skrap under tak: taket over skraplageret, eller skrapterminalen (også under tak) (B-274)
  if (roofed(g)) p *= 0.4;
  if (has(g, "sortering")) p *= 0.7;
  if (hasResearch(g, "sikkerhet")) p *= 0.7;
  return p;
}

/**
 * En eksplosjon i ovn nr. index: ovnen står noen timer, reparasjon, kanskje en skadet eller – svært sjelden – en død.
 * Returnerer timene ovnen står.
 */
export function explosion(g: GameState, index: number, repairFactor: number): number {
  const hours = uniform(g, 4, 10) * repairFactor;
  const cost = 20_000 * (1 + g.stage) ** 2;
  addCost(g, "vedlikehold", cost);
  adjustReputation(g, -2);
  adjustMorale(g, -3);
  countEvent(g, "eksplosjon");
  unlock(g, "vannskrap");
  const winter = isWinter(g);
  const why = winter ? "Is og snø i skrapet" : "Vann i skrapet";
  const present = g.workers.filter((w) => !isAbsent(g, w));
  const fatal = FATAL_PER_EXPLOSION * (hasResearch(g, "sikkerhet") ? 0.5 : 1);
  if (present.length && chance(g, fatal)) {
    fatalAccident(g, `en eksplosjon i ovn ${index + 1}. ${why} ble til damp i det flytende stålet`);
    return hours;
  }
  let hurt = "";
  if (present.length && chance(g, INJURY)) {
    const w = pick(g, present);
    const days = Math.round(uniform(g, 7, 21));
    w.absentFrom = g.minute;
    w.absentUntil = g.minute + days * 1440;
    w.absentReason = "syk";
    hurt = ` ${workerLabel(w)} ble skadet og er sykmeldt i ${days} døgn.`;
  }
  log(
    g,
    `EKSPLOSJON i ovn ${index + 1}! ${why} ble til damp i det flytende stålet. Ovnen står i ${hours.toFixed(0)} timer, reparasjon ${fmtKr(cost)}, omdømme −2.${hurt}${
      !roofed(g) ? " Tak over skraplageret (under Anlegg → Skraplager) gir færre eksplosjoner." : ""
    }`,
    "bad",
  );
  return hours;
}

/**
 * Dødsulykke: en av de ansatte omkommer. Verket stenges i tre døgn mens politiet og Arbeidstilsynet gransker ulykken,
 * og det blir stor bot og store tap av omdømme og trivsel.
 */
export function fatalAccident(g: GameState, what: string): void {
  const present = g.workers.filter((w) => !isAbsent(g, w));
  if (!present.length) return;
  const victim = pick(g, present);
  g.workers = g.workers.filter((w) => w !== victim);
  const until = g.minute + FATAL_DOWN_DAYS * 1440;
  for (const f of g.furnaces) {
    f.downUntilMin = Math.max(f.downUntilMin, until);
    f.downReason = "Stengt: politiet og Arbeidstilsynet gransker dødsulykken";
  }
  g.castDownUntilMin = Math.max(g.castDownUntilMin, until);
  // Hele verket er stengt, også valseverket (B-397)
  g.closedUntilMin = Math.max(g.closedUntilMin ?? 0, until);
  const fine = FATAL_FINE[g.stage] ?? FATAL_FINE[FATAL_FINE.length - 1];
  if (fine) addCost(g, "bot", fine);
  adjustReputation(g, -25);
  adjustMorale(g, -35);
  countEvent(g, "dodsulykke");
  const text = `${workerLabel(victim)} omkom etter ${what}. Verket er stengt i ${FATAL_DOWN_DAYS} døgn mens politiet og Arbeidstilsynet gransker ulykken. Bot ${fmtKr(fine)}, omdømme −25, trivsel −35.`;
  log(g, `DØDSULYKKE: ${text}`, "bad");
  if (!g.pendingDecision && !g.pendingManual) {
    g.pendingDecision = {
      id: "dodsulykke",
      title: "Dødsulykke på verket",
      text: `${text} Ingen jobb er verdt et liv: sikkerhetskultur, tak over skraplageret og sortering gjør slike ulykker sjeldnere.`,
      options: [{ label: "Stans verket og støtt de pårørende" }],
      data: {},
      resumeSpeed: g.speed > 0 ? g.speed : 1,
    };
    g.speed = 0;
  }
}
