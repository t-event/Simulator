/**
 * «Bygg på nytt» (B-517): et frivillig valg for veteraner. Spilleren selger storverket og starter hjemmeverket i
 * garasjen igjen, med reisen fra garasje til storverk som det spillerne brukte mest tid på (retningsanalysen, B-515).
 * Ingen må: det er i stedet for en ny sesong med blanke ark, som eieren ikke ville ha.
 *
 * Det som blir stående:
 *   - konsernet, konsernkassa og selskapene – de ligger på serveren, og utbyttet betales videre fordi serveren teller
 *     det høyeste nivået verket har hatt (`konsern_stage`, 159);
 *   - prestasjoner, pynt, merker, fagboka med quiz og oppdrag, rekorder og Privat formue.
 * Det som starter på nytt: hjemmeverket, kassa hjemme, forskning, mesterskap, fagpoeng, folk, lager og kontrakter.
 * Bidraget til konsernkassa følger hjemmeverket, så det blir lite til storverket er bygget igjen.
 *
 * Startfordelen er liten med vilje: to forskninger gratis og 20 fagpoeng per gang (høyst 100). Prestasjonen «Bygget på
 * nytt» og rekorden «Raskest til storverk» (serveren tar den beste) er belønningen.
 */
import { STAGES } from "./data";
import { log, newGame } from "./engine";
import { masteryOpen } from "./mastery";
import type { GameState } from "./types";

export const REBUILD = {
  /** Forskning som er gjort fra start: 3× fart og flere skrapleverandører */
  freeResearch: ["rutiner", "skrapkjop"],
  fpPerTime: 20,
  fpMax: 100,
};

/** Kan spilleren bygge på nytt? Storverket, og enten sluttmålet nådd eller all forskning gjort */
export function canRebuild(g: GameState): boolean {
  return !g.gameOver && g.stage >= STAGES.length - 1 && (g.won || masteryOpen(g));
}

/** Fagpoengene den neste starten gir */
export function rebuildFp(times: number): number {
  return Math.min(REBUILD.fpMax, REBUILD.fpPerTime * times);
}

/**
 * Et nytt hjemmeverk i garasjen, med det som skal bli stående fra `old`. Nytt `gameId`, så serveren og appen ser at
 * det er et nytt spill (B-259), men `serverEdit` og `treasuryOut` følger med: serveren avviser lavere tall (B-211,
 * B-183).
 */
export function rebuildGame(old: GameState, seed = Date.now()): GameState {
  const g = newGame(seed);
  const times = (old.rebuilds ?? 0) + 1;
  g.rebuilds = times;
  g.tutorial = null;
  g.speed = 0;
  // Kontoen, sesongen og det serveren eier
  g.owner = old.owner;
  g.season = old.season;
  g.seasonPromptSeen = old.seasonPromptSeen;
  g.seasonLoginPromptSeen = old.seasonLoginPromptSeen;
  g.world = structuredClone(old.world);
  g.serverEdit = old.serverEdit;
  g.treasuryOut = old.treasuryOut;
  g.lockedReserve = old.lockedReserve ? structuredClone(old.lockedReserve) : old.lockedReserve;
  g.paidOut = old.paidOut ? structuredClone(old.paidOut) : old.paidOut;
  g.serverBadges = old.serverBadges ? [...old.serverBadges] : old.serverBadges;
  g.won = old.won;
  g.winSeen = old.winSeen;
  // Konsernet står; salgsdirektøren hørte til storverket hjemme og slutter
  g.konsern = { ...structuredClone(old.konsern), director: null };
  g.legendCelebrate = null;
  g.tenderSeen = old.tenderSeen;
  g.takeoverSeen = old.takeoverSeen;
  g.companyIncomeSeen = old.companyIncomeSeen;
  g.dividendSeen = old.dividendSeen;
  // Det spilleren har samlet og lært
  g.achievements = { ...old.achievements };
  g.cosmetics = structuredClone(old.cosmetics);
  g.counters = { ...old.counters, rebuilds: times };
  g.controlBest = old.controlBest;
  g.minis = old.minis ? structuredClone(old.minis) : old.minis;
  g.readChapters = [...old.readChapters];
  g.quizDone = structuredClone(old.quizDone);
  g.quizScores = structuredClone(old.quizScores);
  g.quizPartial = structuredClone(old.quizPartial);
  g.missions = structuredClone(old.missions);
  g.knowledge = [...old.knowledge];
  g.unreadKnowledge = 0;
  g.daily = structuredClone(old.daily);
  g.tipsSeen = [...old.tipsSeen];
  g.seenViews = [...old.seenViews];
  // Startfordelen
  for (const id of REBUILD.freeResearch) if (!g.researched.includes(id)) g.researched.push(id);
  g.researchPoints += rebuildFp(times);
  log(
    g,
    `Du har solgt storverket og bygger på nytt fra garasjen (${times}. gang). Konsernet, konsernkassa, merkene og pynten står. Startfordel: 3× fart, flere skrapleverandører og ${rebuildFp(times)} fagpoeng.`,
    "good",
  );
  return g;
}
