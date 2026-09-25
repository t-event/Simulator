/**
 * Det spilleren kan gjøre: bygge ut, kjøpe utstyr, ansette, låne og styre produksjonen.
 */
import { ADDONS, CASTINGS, FURNACES, GRADES, PRODUCTS, ROLES, SCRAP_IDS, STAGES, stageRef, type Addon } from "./data";
import {
  addCost,
  adjustMorale,
  bookTemps,
  fmtKr,
  fmtT,
  log,
  newCandidates,
  orderQueue,
  startReline,
  maxLoan,
  newFurnaceUnit,
  unlock,
  type PurchaseResult,
} from "./engine";
import {
  castingType,
  day,
  daysUntilAllBack,
  staffing,
  gradeRecipe,
  fixedPowerOffer,
  furnaceType,
  has,
  isAbsent,
  POWER_BINDING_DAYS,
} from "./plant";
import { newGradesAt, startRecipeGuide } from "./recipeGuide";
import { hasResearch, missingResearchFor, RESEARCH, researchOptions, scrapUnlocked } from "./research";
import type { GameState, GradeId, PowerDeal, RoleId, ScrapId } from "./types";

export type UpgradeKind = "stage" | "furnace" | "casting" | "addon";

export interface UpgradeOption {
  id: string;
  kind: UpgradeKind;
  name: string;
  description: string;
  price: number;
  stage: number;
  owned: boolean;
  /** Kan kjøpes nå */
  available: boolean;
  /** Hvorfor det ikke kan kjøpes, eller hva som mangler */
  reason: string | null;
  /** Ikke synlig ennå (for høyt nivå); vises som et hint om hva som kommer */
  locked: boolean;
  /** Konsekvens spilleren bør vite om før kjøpet */
  warning?: string;
}

const fail = (message: string): PurchaseResult => ({ ok: false, message });

function addonPrice(g: GameState, addon: Addon): number {
  if (addon.id === "ovn2") return Math.max(100_000, Math.round(furnaceType(g).price * 0.7));
  return addon.price;
}

function addonBlocker(g: GameState, addon: Addon): string | null {
  if (addon.needsArc && !furnaceType(g).arc) return "Krever lysbueovn";
  if (addon.needsContinuous && !castingType(g).continuous) return "Krever strengstøping";
  for (const req of addon.requires ?? []) if (!has(g, req)) return `Krever ${nameOf(req)}`;
  return null;
}

function nameOf(id: string): string {
  return (
    ADDONS.find((a) => a.id === id)?.name ??
    FURNACES.find((f) => f.id === id)?.name ??
    CASTINGS.find((c) => c.id === id)?.name ??
    id
  ).toLowerCase();
}

function researchBlocker(g: GameState, id: string): string | null {
  const r = missingResearchFor(g, id);
  return r ? `Forsk fram: ${r.name}` : null;
}

export function upgradeOptions(g: GameState): UpgradeOption[] {
  const out: UpgradeOption[] = [];
  const next = STAGES[g.stage + 1];
  if (next) {
    let reason: string | null = null;
    if (g.reputation < next.reputation) reason = `Krever omdømme ${next.reputation}`;
    else if (g.cash < next.price) reason = "For lite penger";
    out.push({
      id: `stage${next.id}`,
      kind: "stage",
      name: next.name,
      description: next.description,
      price: next.price,
      stage: next.id,
      owned: false,
      available: reason === null,
      reason,
      locked: false,
    });
  }
  const currentFurnace = furnaceType(g);
  for (const f of FURNACES) {
    if (f.id === "induksjon025") continue;
    const owned = f.id === currentFurnace.id;
    const outdated =
      f.stage < currentFurnace.stage || (f.stage === currentFurnace.stage && !owned && f.sizeT < currentFurnace.sizeT);
    if (outdated && !owned) continue;
    const price = f.price * g.furnaceCount;
    let reason: string | null = researchBlocker(g, f.id);
    for (const req of f.requires ?? []) if (!reason && !has(g, req)) reason = `Krever ${nameOf(req)}`;
    if (!reason && g.cash < price) reason = "For lite penger";
    out.push({
      id: f.id,
      kind: "furnace",
      name: g.furnaceCount > 1 ? `${f.name} (×${g.furnaceCount})` : f.name,
      description: f.description,
      price,
      stage: f.stage,
      owned,
      available: !owned && f.stage <= g.stage && reason === null,
      reason: owned ? null : reason,
      locked: f.stage > g.stage,
    });
  }
  const currentCasting = castingType(g);
  for (const c of CASTINGS) {
    if (c.id === "sandformer") continue;
    const owned = c.id === currentCasting.id;
    if (c.stage < currentCasting.stage && !owned) continue;
    let reason = researchBlocker(g, c.id);
    let warning: string | undefined;
    if (!owned && c.product !== currentCasting.product) {
      const old = PRODUCTS[currentCasting.product].name.toLowerCase();
      const remaining = g.contracts
        .filter((x) => x.status === "aktiv" && x.product === currentCasting.product)
        .reduce((a, x) => a + x.tonnes - x.delivered, 0);
      const inStock = g.lots
        .filter((l) => l.product === currentCasting.product && !l.second)
        .reduce((a, l) => a + l.t, 0);
      // Etter byttet kan det gamle produktet ikke lages. Kontrakter som ikke kan leveres fra lageret, ville gått
      // over fristen og tatt med seg omdømmet, så de må leveres først (B-062)
      const stuck = remaining - inStock;
      if (!reason && stuck > 0.05) reason = `Lever først kontraktene på ${old} (${fmtT(stuck)} igjen)`;
      warning =
        `Du går over fra ${old} til ${PRODUCTS[c.product].name.toLowerCase()} og kan ikke lage ${old} etterpå. Ikke ta flere kontrakter på ${old} før byttet.` +
        " Produksjonen øker kraftig – ha penger til skrap og kunder som tar imot.";
    }
    if (!reason && g.cash < c.price) reason = "For lite penger";
    out.push({
      id: c.id,
      kind: "casting",
      warning,
      name: c.name,
      description: c.description,
      price: c.price,
      stage: c.stage,
      owned,
      available: !owned && c.stage <= g.stage && reason === null,
      reason: owned ? null : reason,
      locked: c.stage > g.stage,
    });
  }
  for (const a of ADDONS) {
    const owned = has(g, a.id);
    const price = addonPrice(g, a);
    let reason = researchBlocker(g, a.id) ?? addonBlocker(g, a);
    if (!reason && g.cash < price) reason = "For lite penger";
    out.push({
      id: a.id,
      kind: "addon",
      name: a.name,
      description: a.description,
      price,
      stage: a.stage,
      owned,
      available: !owned && a.stage <= g.stage && reason === null,
      reason: owned ? null : reason,
      locked: a.stage > g.stage,
    });
  }
  // Et kjøp som tømmer kassa, stopper skrapinnkjøpet og dermed verket (B-062)
  const recent = g.history.slice(-3);
  const dailyCost = recent.length
    ? recent.reduce(
        (a, d) =>
          a +
          Object.entries(d.costs)
            .filter(([k]) => k !== "investering" && k !== "bot")
            .reduce((x, [, v]) => x + (v ?? 0), 0),
        0,
      ) / recent.length
    : 0;
  for (const o of out) {
    if (o.owned || o.locked || dailyCost <= 0 || o.price < dailyCost) continue;
    const left = (g.cash - o.price) / dailyCost;
    if (left >= 2) continue;
    const thin = `Etter kjøpet har du penger til drift i ${left < 1 ? "under ett døgn" : `bare ca. ${Math.floor(left)} døgn`}. Uten penger får du ikke kjøpt skrap, og verket stopper. Spar litt mer, eller ta opp lån under Forskning → Bank.`;
    o.warning = o.warning ? `${o.warning} ${thin}` : thin;
  }
  return out;
}

/**
 * Det store neste steget på dette nivået: ny ovn eller støping som ikke er kjøpt, billigste først. Vises på
 * målkortet, så en ny spiller vet hva som gir mer produksjon (B-062).
 */
export function keyUpgrade(g: GameState, options = upgradeOptions(g)): UpgradeOption | null {
  return (
    options
      .filter((o) => (o.kind === "furnace" || o.kind === "casting") && !o.owned && !o.locked && o.stage <= g.stage)
      .sort((a, b) => a.price - b.price)[0] ?? null
  );
}

export function buyUpgrade(g: GameState, id: string): PurchaseResult {
  const option = upgradeOptions(g).find((o) => o.id === id);
  if (!option) return fail("Ukjent oppgradering.");
  if (option.owned) return fail("Du har den allerede.");
  if (option.locked) return fail(`Krever at du har flyttet til ${stageRef(option.stage, g.stage)}.`);
  if (!option.available) return fail(option.reason ?? "Kan ikke kjøpes nå.");
  addCost(g, "investering", option.price);

  switch (option.kind) {
    case "stage": {
      g.stage = option.stage;
      g.celebrate = g.stage;
      log(g, `Du har flyttet inn i ${STAGES[g.stage].name.toLowerCase()}!`, "good");
      // Søkere med en gang, også til de nye plassene (B-034)
      newCandidates(g);
      if (g.stage === 1) unlock(g, "folk");
      if (g.stage === 2)
        log(g, "Fra nå av er du daglig leder og står ikke lenger i produksjonen selv. Sørg for å ha nok folk.", "info");
      if (g.stage === 3) unlock(g, "strom");
      // Nye kvaliteter: vis hvordan man lager resepten (B-058)
      {
        const fresh = newGradesAt(g.stage);
        if (fresh.length) startRecipeGuide(g, fresh[0]);
      }
      break;
    }
    case "furnace": {
      g.furnaceType = id;
      for (const f of g.furnaces) {
        f.wear = 0;
        f.heatsOnLining = 0;
        f.lastRelineDay = day(g);
        f.spareProgress = 1;
      }
      const type = furnaceType(g);
      if (type.arc) {
        unlock(g, "lysbue");
        unlock(g, "fosfor");
        unlock(g, "karbon");
      } else {
        unlock(g, "induksjon");
        unlock(g, "karbon");
      }
      log(g, `${type.name} er installert.`, "good");
      break;
    }
    case "casting": {
      g.castingType = id;
      const type = castingType(g);
      if (type.continuous) unlock(g, "streng");
      else unlock(g, "stoping");
      log(g, `${type.name} er satt i drift.`, "good");
      break;
    }
    case "addon": {
      g.owned.push(id);
      if (id === "ovn2") {
        g.furnaceCount = 2;
        g.furnaces.push(newFurnaceUnit(day(g)));
      }
      if (id === "xrf" || id === "oes") unlock(g, "analyse");
      if (id === "portal") unlock(g, "radioaktivitet");
      if (id === "oseovn") unlock(g, "oseovn");
      if (id === "valseverk") unlock(g, "valsing");
      log(g, `${option.name} er kjøpt.`, "good");
      break;
    }
  }
  return { ok: true, message: `${option.name} kjøpt for ${fmtKr(option.price)}.` };
}

// ------------------------------------------------------------------ //
// Forskning
// ------------------------------------------------------------------ //
export function doResearch(g: GameState, id: string): PurchaseResult {
  const option = researchOptions(g).find((r) => r.id === id);
  if (!option) return fail("Ukjent forskning.");
  if (option.done) return fail("Det er allerede forsket fram.");
  if (!option.available) return fail(option.reason ?? "Kan ikke forskes på nå.");
  g.researchPoints -= option.cost;
  g.researched.push(id);
  if (option.knowledge) unlock(g, option.knowledge);
  log(g, `Forskning ferdig: ${option.name}. ${option.effect}.`, "good");
  return { ok: true, message: `${option.name} er forsket fram.` };
}

/** Markerer forskning som gjort for utstyr spilleren allerede har (gamle lagringer). */
export function grantResearchForOwned(g: GameState): void {
  const owned = new Set([g.furnaceType, g.castingType, ...g.owned]);
  for (const r of RESEARCH) {
    if (hasResearch(g, r.id)) continue;
    if (r.unlocks?.some((id) => owned.has(id))) g.researched.push(r.id);
  }
}

// ------------------------------------------------------------------ //
// Folk
// ------------------------------------------------------------------ //
export function hire(g: GameState, candidateId: number): PurchaseResult {
  const c = g.candidates.find((x) => x.id === candidateId);
  if (!c) return fail("Søkeren har takket ja til en annen jobb.");
  const cap = STAGES[g.stage].staffCap;
  if (g.workers.length >= cap) {
    return fail(
      cap === 0
        ? "Det er ikke plass til ansatte i garasjen."
        : `Plass til ${cap} ansatte. Bygg ut for å ansette flere.`,
    );
  }
  g.candidates = g.candidates.filter((x) => x.id !== candidateId);
  g.workers.push({ ...c, hiredDay: day(g) });
  log(g, `${c.name} er ansatt.`, "info");
  return { ok: true, message: `${c.name} er ansatt.` };
}

/** Ansetter søkere til plassene som mangler for neste skift. Avløsere fyller hull. */
export function hireForMissing(g: GameState): PurchaseResult {
  const cap = STAGES[g.stage].staffCap;
  let hired = 0;
  for (let guard = 0; guard < 200 && g.workers.length < cap; guard++) {
    // Fravær teller ikke: syke og folk på ferie kommer tilbake, så de dekkes av vikarer, ikke nye ansatte
    const missing = staffing(g, true).missing;
    const roles = Object.entries(missing)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([r]) => r);
    if (!roles.length) break;
    const cand = g.candidates.find((c) => roles.includes(c.role)) ?? g.candidates.find((c) => c.role === "allround");
    if (!cand) break;
    if (!hire(g, cand.id).ok) break;
    hired += 1;
  }
  if (hired === 0) return fail("Ingen passende søkere akkurat nå. Nye kommer hver morgen.");
  return { ok: true, message: `Ansatte ${hired} ${hired === 1 ? "person" : "personer"}.` };
}

export function fire(g: GameState, workerId: number): PurchaseResult {
  const w = g.workers.find((x) => x.id === workerId);
  if (!w) return fail("Finner ikke den ansatte.");
  const severance = w.salary * 5;
  addCost(g, "lonn", severance);
  g.workers = g.workers.filter((x) => x.id !== workerId);
  log(g, `${w.name} har sluttet (sluttpakke ${fmtKr(severance)}).`, "info");
  return { ok: true, message: `${w.name} har sluttet.` };
}

// ------------------------------------------------------------------ //
// Produksjon
// ------------------------------------------------------------------ //
/** Endrer resepten for en kvalitet: verkets kvalitet (standard) eller en annen ovn sin (B-039) */
export function setRecipe(g: GameState, id: ScrapId, weight: number, grade: GradeId = g.targetGrade): void {
  if (weight > 0 && !scrapUnlocked(g, id)) return;
  const value = Math.max(0, Math.min(100, Math.round(weight)));
  if (grade !== g.targetGrade) {
    g.gradeRecipes[grade] = { ...gradeRecipe(g, grade), [id]: value };
    return;
  }
  g.recipe[id] = value;
  // Resepten huskes for kvaliteten som kjøres nå
  g.gradeRecipes[g.targetGrade] = { ...g.recipe };
}

/**
 * Endrer andelen til én skraptype med ±10 prosentpoeng. De andre typene i resepten krymper eller vokser
 * i samme forhold, så summen alltid er 100 % (B-035).
 */
export function nudgeRecipe(g: GameState, id: ScrapId, delta: number, grade: GradeId = g.targetGrade): void {
  if (delta > 0 && !scrapUnlocked(g, id)) return;
  const recipe = gradeRecipe(g, grade);
  const total = SCRAP_IDS.reduce((a, x) => a + recipe[x], 0) || 1;
  const shares = Object.fromEntries(SCRAP_IDS.map((x) => [x, (recipe[x] / total) * 100])) as Record<ScrapId, number>;
  const others = SCRAP_IDS.filter((x) => x !== id && shares[x] > 0);
  const othersTotal = others.reduce((a, x) => a + shares[x], 0);
  const target = Math.max(0, Math.min(100, Math.round((shares[id] + delta) / 10) * 10));
  // Kan ikke gi bort andel hvis ingen andre er med; da får returskrapet (eller første åpne type) resten
  if (othersTotal <= 0 && target < 100) {
    const fallback = SCRAP_IDS.find((x) => x !== id && scrapUnlocked(g, x));
    if (!fallback) return;
    others.push(fallback);
    shares[fallback] = 1;
  }
  const rest = 100 - target;
  const base = others.reduce((a, x) => a + shares[x], 0) || 1;
  const next = Object.fromEntries(SCRAP_IDS.map((x) => [x, 0])) as Record<ScrapId, number>;
  next[id] = target;
  for (const x of others) next[x] = Math.round((shares[x] / base) * rest);
  // Rett opp avrunding så summen blir nøyaktig 100
  const sum = SCRAP_IDS.reduce((a, x) => a + next[x], 0);
  if (sum !== 100) {
    const biggest = [...others].sort((a, b) => next[b] - next[a])[0] ?? id;
    next[biggest] += 100 - sum;
  }
  applyRecipe(g, next, grade);
}

/** Setter hele resepten på én gang (f.eks. et forslag) */
export function applyRecipe(g: GameState, recipe: Record<ScrapId, number>, grade: GradeId = g.targetGrade): void {
  for (const id of SCRAP_IDS) setRecipe(g, id, recipe[id] ?? 0, grade);
}

/** Kvaliteten en annen ovn enn ovn 1 skal lage; null = samme som ovn 1 (B-039) */
export function setFurnaceGrade(g: GameState, index: number, grade: GradeId | null): void {
  const f = g.furnaces[index];
  if (!f || index === 0 || (grade && !GRADES[grade])) return;
  f.grade = grade === g.targetGrade ? null : grade;
}

/**
 * Slår en kvalitet av eller på blant dem spilleren vil ha forespørsler på. Tom liste = alle.
 * Åpne forespørsler i kvaliteter som er valgt bort, avslås (B-042).
 */
export function toggleOfferGrade(g: GameState, grade: GradeId, open: GradeId[]): void {
  const current = g.settings.offerGrades.length ? g.settings.offerGrades : open;
  const next = current.includes(grade) ? current.filter((id) => id !== grade) : [...current, grade];
  // Alle eller ingen valgt betyr alle
  g.settings.offerGrades = next.length === 0 || open.every((id) => next.includes(id)) ? [] : next;
  const wanted = g.settings.offerGrades;
  if (wanted.length) g.contracts = g.contracts.filter((c) => c.status !== "tilbud" || wanted.includes(c.grade));
}

export function setTargetGrade(g: GameState, grade: GradeId): void {
  if (!GRADES[grade]) return;
  g.targetGrade = grade;
  const saved = g.gradeRecipes[grade];
  if (saved) g.recipe = { ...saved };
}

/** Ber om ny foring: straks hvis ovnen er tom, ellers så snart chargen er ferdig. */
export function requestReline(g: GameState, index: number): PurchaseResult {
  const f = g.furnaces[index];
  if (!f) return fail("Ukjent ovn.");
  if (!f.heat && !f.holding && g.minute >= f.downUntilMin) return startReline(g, index);
  f.relineRequested = !f.relineRequested;
  return {
    ok: true,
    message: f.relineRequested ? "Foringen byttes når chargen er ferdig." : "Omforingen er avbestilt.",
  };
}

/** Flytter en aktiv kontrakt opp (−1) eller ned (+1) i ordrekøen. */
export function moveInQueue(g: GameState, id: number, dir: -1 | 1): void {
  const queue = orderQueue(g);
  const i = queue.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= queue.length) return;
  [queue[i], queue[j]] = [queue[j], queue[i]];
  queue.forEach((c, k) => (c.priority = k + 1));
}

export function recipeShares(g: GameState): Record<ScrapId, number> {
  const total = SCRAP_IDS.reduce((a, id) => a + g.recipe[id], 0);
  return Object.fromEntries(SCRAP_IDS.map((id) => [id, total > 0 ? g.recipe[id] / total : 0])) as Record<
    ScrapId,
    number
  >;
}

export function requestManual(g: GameState, on: boolean): PurchaseResult {
  if (!furnaceType(g).arc) return fail("Du kan bare ta styringen over en lysbueovn.");
  g.settings.manualNext = on;
  return { ok: true, message: on ? "Du tar styringen på neste charge." : "Automatikken kjører videre." };
}

// ------------------------------------------------------------------ //
// Bank
// ------------------------------------------------------------------ //
export function borrow(g: GameState, amount: number): PurchaseResult {
  const room = maxLoan(g) - g.loan;
  const a = Math.min(amount, room);
  if (a <= 0) return fail("Banken vil ikke låne deg mer nå.");
  g.loan += a;
  g.cash += a;
  log(g, `Du tok opp lån på ${fmtKr(a)}.`, "info");
  return { ok: true, message: `Lånte ${fmtKr(a)}.` };
}

export function repay(g: GameState, amount: number): PurchaseResult {
  const a = Math.min(amount, g.loan, Math.max(0, g.cash));
  if (a <= 0) return fail("Ingenting å betale ned.");
  g.loan -= a;
  g.cash -= a;
  log(g, `Du betalte ned ${fmtKr(a)} på lånet.`, "info");
  return { ok: true, message: `Betalte ned ${fmtKr(a)}.` };
}

// ------------------------------------------------------------------ //
// Strøm og skift (B-024)
// ------------------------------------------------------------------ //
export const POWER_DEAL_NAMES: Record<PowerDeal, string> = { spot: "Spotpris", fast: "Fastpris", natt: "Nattariff" };

export function setPowerDeal(g: GameState, deal: PowerDeal): PurchaseResult {
  const s = g.settings;
  if (deal === s.powerDeal) return { ok: true, message: "" };
  if (s.powerDeal !== "spot" && day(g) < s.powerDealUntilDay)
    return fail(`Du er bundet av ${POWER_DEAL_NAMES[s.powerDeal].toLowerCase()} til dag ${s.powerDealUntilDay}.`);
  s.powerDeal = deal;
  s.powerDealUntilDay = deal === "spot" ? 0 : day(g) + POWER_BINDING_DAYS;
  if (deal === "fast") s.powerFixedPrice = fixedPowerOffer(g);
  log(
    g,
    deal === "spot"
      ? "Ny strømavtale: spotpris. Du betaler børsprisen time for time."
      : deal === "fast"
        ? `Ny strømavtale: fastpris ${s.powerFixedPrice.toFixed(2).replace(".", ",")} kr/kWh i ${POWER_BINDING_DAYS} døgn.`
        : `Ny strømavtale: nattariff i ${POWER_BINDING_DAYS} døgn. Billig strøm 22–06, dyrere på dagen.`,
    "info",
  );
  unlock(g, "strom");
  return { ok: true, message: `${POWER_DEAL_NAMES[deal]} er avtalt.` };
}

export const SHIFT_STARTS = [6, 14, 22];

export function setShiftStart(g: GameState, hour: number): void {
  if (SHIFT_STARTS.includes(hour)) g.settings.shiftStart = hour;
}

// ------------------------------------------------------------------ //
// Trivsel og kurs (B-026)
// ------------------------------------------------------------------ //
export const BONUS_COOLDOWN_DAYS = 7;
export const COURSE_COOLDOWN_DAYS = 10;

/** Bonus til alle: to dagers lønn, trivselen +15. Én gang i uka. */
export function bonusCost(g: GameState): number {
  return Math.round(g.workers.reduce((a, w) => a + w.salary, 0) * 2);
}

export function giveBonus(g: GameState): PurchaseResult {
  if (!g.workers.length) return fail("Du har ingen ansatte.");
  if (day(g) - g.lastBonusDay < BONUS_COOLDOWN_DAYS)
    return fail(`Bonus kan gis igjen dag ${g.lastBonusDay + BONUS_COOLDOWN_DAYS}.`);
  const cost = bonusCost(g);
  addCost(g, "lonn", cost);
  g.lastBonusDay = day(g);
  adjustMorale(g, 15);
  log(g, `Alle ansatte fikk bonus (${fmtKr(cost)}). Trivselen stiger.`, "good");
  return { ok: true, message: "Bonus utbetalt." };
}

export function courseCost(g: GameState): number {
  return 3_000 * (1 + g.stage);
}

/** Kurs for én ansatt: ferdighet +0,6 og litt bedre trivsel. */
export function sendOnCourse(g: GameState, workerId: number): PurchaseResult {
  const w = g.workers.find((x) => x.id === workerId);
  if (!w) return fail("Fant ikke den ansatte.");
  if (w.skill >= 5) return fail(`${w.name} kan alt kurset lærer bort.`);
  if (w.courseDay !== undefined && day(g) - w.courseDay < COURSE_COOLDOWN_DAYS)
    return fail(`${w.name} var nylig på kurs. Neste mulighet dag ${w.courseDay + COURSE_COOLDOWN_DAYS}.`);
  addCost(g, "annet", courseCost(g));
  w.skill = Math.min(5, w.skill + 0.6);
  w.courseDay = day(g);
  adjustMorale(g, 1);
  log(g, `${w.name} har vært på kurs og er blitt flinkere.`, "good");
  return { ok: true, message: "Kurs gjennomført." };
}

// ------------------------------------------------------------------ //
// Vikarer (B-031)
// ------------------------------------------------------------------ //
/** Innleie til plassene som mangler for neste skift: halvannen gang lønna, teller ikke mot antall ansatte (B-050) */
export function hiredCrewCost(g: GameState, days: number): number {
  const missing = staffing(g, true).missing;
  return Math.round(
    Object.entries(missing).reduce((a, [r, n]) => a + ROLES[r as RoleId].salary * (n ?? 0), 0) * 1.5 * days,
  );
}

export function hireTempCrew(g: GameState, days: number): PurchaseResult {
  // Plasser ingen har (fravær dekkes av vikarer for fravær)
  const missing = Object.entries(staffing(g, true).missing).filter(([, n]) => (n ?? 0) > 0);
  if (!missing.length) return fail("Det mangler ingen på skiftene.");
  const cost = hiredCrewCost(g, days);
  addCost(g, "lonn", cost);
  const crew: Record<string, number> = {};
  const old = g.tempCrew && g.tempCrew.untilMin > g.minute ? g.tempCrew.crew : {};
  for (const [r, n] of Object.entries(old)) crew[r] = n ?? 0;
  for (const [r, n] of missing) crew[r] = (crew[r] ?? 0) + (n ?? 0);
  g.tempCrew = { crew, untilMin: g.minute + days * 1440 };
  const who = missing.map(
    ([r, n]) => `${n} ${(n === 1 ? ROLES[r as RoleId].name : ROLES[r as RoleId].plural).toLowerCase()}`,
  );
  log(g, `Innleide vikarer (${who.join(", ")}) er på plass i ${days} døgn (${fmtKr(cost)}).`, "info");
  return { ok: true, message: "Vikarene er på plass." };
}

/** Vikarer i et antall døgn, eller til alle som er borte nå, er tilbake (days = null) */
export function hireTemps(g: GameState, days: number | null): PurchaseResult {
  if (!g.workers.some((w) => isAbsent(g, w))) return fail("Ingen er borte akkurat nå.");
  bookTemps(g, days ?? daysUntilAllBack(g));
  return { ok: true, message: "Vikarene er på plass." };
}
