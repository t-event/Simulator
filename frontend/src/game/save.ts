/**
 * Lagring i nettleseren. Nettleseren kan nekte lagring (privat modus,
 * blokkerte data), så alle kall er pakket inn og spillet fungerer uten.
 */
import { grantResearchForOwned } from "./actions";
import { checkAchievements } from "./achievements";
import { RESEARCH } from "./research";
import { ADDONS } from "./data";

/** Forskning som ble lagt til med B-054; de andre automatikk-forskningene fantes fra før */
const NEW_AUTOMATION = ["salgsrutiner", "ordreplan", "innkjop", "bemanning"];
import { SAVE_VERSION } from "./engine";
import type { GameState } from "./types";

const KEY = "stalverk-spill-v1";

/**
 * Kalles etter hver lagring, så lagringen på nett kan følge etter (B-125). Settes fra net/sync.ts.
 * `soon`: spilleren har nettopp gjort noe, så lagringen på nett bør gå med en gang (B-141).
 */
let saveListener: ((g: GameState, soon?: boolean) => void) | null = null;
export function setSaveListener(fn: ((g: GameState, soon?: boolean) => void) | null): void {
  saveListener = fn;
}

export function saveGame(g: GameState, soon = false): boolean {
  let ok = false;
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
    ok = true;
  } catch {
    ok = false;
  }
  saveListener?.(g, soon);
  return ok;
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as GameState;
    if (g.version !== SAVE_VERSION || typeof g.minute !== "number") return null;
    return migrate(g);
  } catch {
    return null;
  }
}

/** Leser et lagret spill fra tekst (brukes av testene). Null hvis teksten ikke er et lagret spill. */
export function parseSave(text: string): GameState | null {
  try {
    const g = JSON.parse(text) as GameState;
    if (!g || g.version !== SAVE_VERSION || typeof g.minute !== "number") return null;
    return migrate(g);
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ingenting å gjøre: lagringen er utilgjengelig
  }
}

/**
 * Fyller inn felt som mangler i lagringer fra eldre versjoner av spillet.
 * Nye felt i GameState må få en standardverdi her (se B-013).
 */
export function migrate(g: GameState): GameState {
  const loose = g as Partial<GameState> & GameState;
  // Forskningslista må finnes før blokkene under som leser den (gamle lagringer fra før forskningen fantes)
  if (loose.researched === undefined) {
    loose.researched = [];
    // Utstyr spilleren alt har, skal ikke kreve forskning i ettertid
    grantResearchForOwned(g);
  }
  if (loose.researchPoints === undefined) loose.researchPoints = 0;
  if (loose.fpDealDay === undefined) loose.fpDealDay = -1;
  if (loose.pendingDecision === undefined) loose.pendingDecision = null;
  if (loose.celebrate === undefined) loose.celebrate = null;
  if (loose.decisionSeen === undefined) loose.decisionSeen = {};
  if (loose.gradeRecipes === undefined) loose.gradeRecipes = {};
  if (g.settings.powerDeal === undefined) {
    g.settings.powerDeal = "spot";
    g.settings.powerDealUntilDay = 0;
    g.settings.powerFixedPrice = 0;
    g.settings.onePeak = false;
    g.settings.shiftStart = 6;
  }
  if (loose.gridCut === undefined) loose.gridCut = null;
  if (loose.tutorial === undefined) loose.tutorial = null;
  // Gamle spillere har sett det meste; tipsene om natt og fart er likevel nyttige
  if (loose.tipsSeen === undefined) loose.tipsSeen = g.stage >= 1 ? ["tips-foring", "tips-skrap"] : [];
  if (g.settings.skipIdleNights === undefined) g.settings.skipIdleNights = true;
  if (g.settings.pauseOffers === undefined) g.settings.pauseOffers = false;
  if (g.settings.toasts === undefined) g.settings.toasts = "alle";
  // «Ingen» er fjernet nå som varsellinja har fast plass; nærmeste valg er «bare problemer» (B-144)
  if ((g.settings.toasts as string) === "ingen") g.settings.toasts = "problemer";
  if (g.settings.toastTopics === undefined) g.settings.toastTopics = {};
  if (g.settings.toastSeconds === undefined) g.settings.toastSeconds = 6;
  // Mesterskap og stålmilepæler (B-150)
  if (loose.mastery === undefined) loose.mastery = {};
  if (loose.legendCelebrate === undefined) loose.legendCelebrate = null;
  if (!loose.achievements) loose.achievements = {};
  if (!loose.cosmetics) loose.cosmetics = { owned: [], on: [] };
  // Dagens oppdrag (B-149)
  if (loose.daily === undefined) loose.daily = { date: null, missions: [], claimed: false };
  if (g.round === undefined) g.round = 1;
  // Seiersskjermen ble ikke lagret som sett før; et vunnet spill får den én gang til
  if (g.winSeen === undefined) g.winSeen = false;
  if (g.courseSeats === undefined) g.courseSeats = null;
  if (g.pendingCastingSwitch === undefined) g.pendingCastingSwitch = null;
  if (g.market.powerDryDays === undefined) g.market.powerDryDays = 0;
  if (g.konsern === undefined)
    g.konsern = { unlocked: false, plants: [], shared: [], nextId: 1, director: null, milestones: 0, legends: 0 };
  if (g.konsern.director === undefined) g.konsern.director = null;
  if (g.konsern.director && g.konsern.director.active === undefined) g.konsern.director.active = true;
  if (g.konsern.milestones === undefined) g.konsern.milestones = 0;
  if (g.konsern.legends === undefined) g.konsern.legends = 0;
  // «Kystverket» er navnet på en ekte etat; datterverket heter nå «Nesverket» (B-141)
  for (const p of g.konsern.plants) if (p.name === "Kystverket") p.name = "Nesverket";
  if (g.storeFullLogMin === undefined) g.storeFullLogMin = -1e9;
  // Gamle hendelser skal ikke telle som uleste i den nye varsellista (B-089)
  if (g.inboxSeenId === undefined) g.inboxSeenId = g.log.length ? g.log[g.log.length - 1].id : 0;
  // Før B-042 ble fastpris fornyet av seg selv; gamle spill beholder det
  if (g.settings.powerAutoRenew === undefined) g.settings.powerAutoRenew = g.settings.powerDeal === "fast";
  if (g.settings.offerGrades === undefined) g.settings.offerGrades = [];
  // Garasjen startet med gassfyrt digel før B-045; nå er det en liten induksjonsovn
  if (g.furnaceType === "digel") g.furnaceType = "induksjon025";
  if (loose.lastCast === undefined) loose.lastCast = null;
  if (loose.autoBuyNote === undefined) loose.autoBuyNote = null;
  if (g.settings.offerSort === undefined) g.settings.offerSort = "frist";
  // Rent nyskrap har lavere karbon fra B-043
  if (g.scrap.rent && g.scrap.rent.c > 0.06) g.scrap.rent.c = 0.06;
  if (g.settings.autoTemps === undefined) g.settings.autoTemps = false;
  if (g.settings.secondsAction === undefined) g.settings.secondsAction = "spot";
  if (g.settings.graderStrict === undefined) g.settings.graderStrict = true;
  if (loose.quizScores === undefined) {
    // Før B-029 kunne en quiz tas om igjen, og bare fullt hus ble lagret
    loose.quizScores = Object.fromEntries((g.quizDone ?? []).map((c) => [c, 2]));
    delete (loose as { quizFailedDay?: unknown }).quizFailedDay;
  }
  if (g.settings.autoBuyCredit === undefined) {
    // Før B-027 handlet planleggeren alltid på kreditt; nå må spilleren tillate det
    g.settings.autoBuyCredit = false;
    g.settings.autoBuyMaxPerDay = null;
  }
  if (loose.morale === undefined) {
    loose.morale = 70;
    loose.lastBonusDay = -99;
  }
  if (loose.readChapters === undefined) {
    // Fagboka (B-025): kapitler man allerede har, regnes som lest, så forskning ikke stopper opp
    loose.readChapters = [...g.knowledge];
    loose.quizDone = [];
    loose.quizScores = {};
    loose.missions = {};
    loose.counters = {};
    loose.repLog = [];
    loose.advisorSeen = {};
    loose.specialists = {};
  }
  if (loose.seenViews === undefined) {
    // Lagret før gradvis opplåsing (B-023): gi det spilleren allerede hadde tilgang til
    loose.seenViews = ["verket", "marked", "salg", "folk", "forskning"];
    for (const r of RESEARCH) {
      if (g.researched.includes(r.id)) continue;
      const used = r.scrap?.some((id) => g.recipe[id] > 0 || g.scrap[id].t > 0);
      if (r.speed || (r.scrap && (r.stage <= g.stage || used))) g.researched.push(r.id);
    }
  }
  if (g.settings.relinePlanDays === undefined) {
    // Automatisk omforing krever nå en reparatør eller en plan (B-022)
    g.settings.relinePlanDays = null;
    g.settings.autoReline = g.workers.some((w) => w.role === "vedlikehold");
  }
  for (const f of g.furnaces) if (f.relineRequested === undefined) f.relineRequested = false;
  // Før B-074 hadde alle ovnene samme type og utstyr; nå har hver ovn sin egen
  const perFurnace = ADDONS.filter((a) => a.perFurnace).map((a) => a.id);
  for (const f of g.furnaces) {
    if (f.type === undefined) f.type = g.furnaceType;
    if (f.addons === undefined) f.addons = g.owned.filter((id) => perFurnace.includes(id));
  }
  g.owned = g.owned.filter((id) => !perFurnace.includes(id));
  // Ovner kjøpt før B-038 fikk «byttet dag 1»: anslå dagen ut fra antall charger på foringen
  const today = Math.floor(g.minute / 1440) + 1;
  for (const f of g.furnaces)
    if (f.lastRelineDay === 1 && today > 3 && f.heatsOnLining !== undefined) {
      const perDay = Math.max(
        1,
        g.history.slice(-3).reduce((a, d) => a + d.heats, 0) /
          Math.max(1, g.history.slice(-3).length) /
          g.furnaces.length,
      );
      f.lastRelineDay = Math.max(1, today - Math.round(f.heatsOnLining / perDay));
    }
  // Reservepotte (B-030): gamle lagringer har en ferdig potte på lager
  for (const f of g.furnaces) if (f.spareProgress === undefined) f.spareProgress = 1;
  for (const f of g.furnaces) if (f.grade === undefined) f.grade = null;
  if (g.settings.splitGrades === undefined) g.settings.splitGrades = true;
  if (loose.agreements === undefined) loose.agreements = [];
  if (loose.nextAgreementId === undefined) loose.nextAgreementId = 1;
  for (const f of g.furnaces)
    if (f.lastRelineDay === undefined) f.lastRelineDay = Math.max(1, Math.floor(g.minute / 1440) + 1);
  if (g.settings.followQueue === undefined) g.settings.followQueue = true;
  if (g.settings.plannerSorts === undefined) g.settings.plannerSorts = true;
  const active = g.contracts.filter((c) => c.status === "aktiv").sort((a, b) => a.deadlineDay - b.deadlineDay);
  active.forEach((c, i) => {
    if (c.priority === undefined) c.priority = i + 1;
  });
  for (const c of g.contracts) if (c.priority === undefined) c.priority = 0;
  if (loose.sickUntilMin === undefined) loose.sickUntilMin = 0;
  if (loose.tempsUntilMin === undefined) loose.tempsUntilMin = 0;
  if (loose.tempCrew === undefined) loose.tempCrew = null;
  if (loose.recipeGuide === undefined) loose.recipeGuide = null;
  // Før B-054 var automatikken gratis. Gamle spill får forskningen for sitt nivå, så ingenting slutter å virke
  if (!loose.automationResearch) {
    for (const r of RESEARCH)
      if (NEW_AUTOMATION.includes(r.id) && r.stage <= g.stage && !g.researched.includes(r.id)) g.researched.push(r.id);
    loose.automationResearch = true;
  }
  if (loose.bonusOffer === undefined) loose.bonusOffer = false;
  if (loose.owner === undefined) loose.owner = null;
  if (loose.season === undefined) loose.season = null;
  if (loose.seasonPromptSeen === undefined) loose.seasonPromptSeen = null;
  if (loose.seasonLoginPromptSeen === undefined) loose.seasonLoginPromptSeen = null;
  if (loose.world === undefined) loose.world = { events: [], seenEventIds: [] };
  for (const c of g.contracts) {
    const old = c as typeof c & { offerExpiresDay?: number };
    if (c.offerExpiresMin === undefined) c.offerExpiresMin = ((old.offerExpiresDay ?? 0) + 0) * 1440;
  }
  // Fravær som bare er halvt satt (én av «fra» og «til» mangler) kan ikke tolkes: den ansatte regnes som på jobb
  for (const w of g.workers)
    if ((w.absentFrom === undefined) !== (w.absentUntil === undefined)) {
      w.absentFrom = w.absentUntil = w.absentReason = undefined;
    }
  // Prestasjoner (B-151) man alt har klart, vises med én gang, ikke først etter en spilltime
  checkAchievements(g);
  return g;
}
