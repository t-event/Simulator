/**
 * Konsernet (B-106): når storverket er ferdig bygget, kan spilleren kjøpe datterverk. De gir overskudd hver dag,
 * som svinger med markedet og av og til stopper opp. Sluttmålet er 10 mrd. i konsernverdi: egenkapital pluss
 * verdien av datterverkene.
 */
import {
  acceptAgreement,
  acceptContract,
  addCost,
  agreementLoadUntil,
  addIncome,
  assessOffer,
  committedT,
  fmtKr,
  log,
  realisticDailyT,
  recipeEstimate,
} from "./engine";
import { computePlantStats, day, gradeRecipe } from "./plant";
import { auto } from "./research";
import { chance, randInt } from "./random";
import type { GameState, SisterPlant, SisterType } from "./types";

export interface SisterSpec {
  name: string;
  price: number;
  /** Overskudd per døgn ved normalt marked og uten modernisering */
  profitPerDay: number;
  description: string;
}

export const SISTER_TYPES: Record<SisterType, SisterSpec> = {
  stalverk: {
    name: "Stålverk",
    price: 300_000_000,
    profitPerDay: 3_500_000,
    description: "Et skrapbasert stålverk med én lysbueovn og strengstøping. Egen ledelse og egne folk.",
  },
  storverk: {
    name: "Storverk",
    price: 1_200_000_000,
    profitPerDay: 14_000_000,
    description: "Et fullskala stålverk med flere ovner, valseverk og havn.",
  },
};

/** Modernisering av et datterverk: 30 % av prisen, +25 % overskudd per trinn, inntil tre trinn */
export const MODERNIZE_SHARE = 0.3;
export const MODERNIZE_GAIN = 0.25;
export const MODERNIZE_MAX = 3;
export const MAX_SISTERS = 6;

/** Konsernfunksjoner som gjelder hele konsernet */
export const KONSERN_SHARED = {
  innkjop: {
    name: "Felles innkjøp",
    price: 150_000_000,
    description: "Konsernet kjøper skrap samlet. 5 % billigere skrap hjemme og 5 % mer overskudd i datterverkene.",
  },
  salg: {
    name: "Felles salgskontor",
    price: 250_000_000,
    description: "Ett salgskontor for alle verkene. 3 % bedre pris hjemme og 5 % mer overskudd i datterverkene.",
  },
} as const;
export type SharedId = keyof typeof KONSERN_SHARED;

/** Egenkapital som låser opp konsernet, og det nye sluttmålet */
export const KONSERN_UNLOCK_EQUITY = 1_000_000_000;

export function hasShared(g: GameState, id: SharedId): boolean {
  return !!g.konsern?.shared.includes(id);
}

/** Overskudd per døgn for ett datterverk nå (uten tilfeldig svingning) */
export function sisterProfit(g: GameState, p: SisterPlant): number {
  const spec = SISTER_TYPES[p.type];
  const shared = 1 + (hasShared(g, "innkjop") ? 0.05 : 0) + (hasShared(g, "salg") ? 0.05 : 0);
  return spec.profitPerDay * (1 + MODERNIZE_GAIN * p.level) * shared * g.market.steelFactor;
}

/** Bokført verdi av datterverkene: 80 % av det som er investert */
export function konsernValue(g: GameState): number {
  return (g.konsern?.plants ?? []).reduce(
    (a, p) => a + SISTER_TYPES[p.type].price * (1 + MODERNIZE_SHARE * p.level) * 0.8,
    0,
  );
}

/** Egenkapital (kasse minus lån) pluss datterverkene */
export function konsernEquity(g: GameState): number {
  return g.cash - g.loan + konsernValue(g);
}

export function modernizeCost(p: SisterPlant): number {
  return SISTER_TYPES[p.type].price * MODERNIZE_SHARE;
}

/**
 * Konsernet åpner seg på storverket når alt utstyret der er kjøpt, eller egenkapitalen har nådd 1 mrd.
 * «remaining» er antall kjøp som gjenstår på storverket (fra upgradeOptions i actions.ts).
 */
export function checkKonsernUnlock(g: GameState, remaining: number): void {
  if (g.konsern.unlocked || g.stage < 4) return;
  const equity = g.cash - g.loan;
  if (remaining > 0 && equity < KONSERN_UNLOCK_EQUITY) return;
  g.konsern.unlocked = true;
  log(
    g,
    remaining === 0
      ? "Storverket er ferdig bygget! Nå kan du bygge et konsern med flere verk – se Verket → Konsern."
      : `Egenkapitalen har passert ${fmtKr(KONSERN_UNLOCK_EQUITY)}! Nå kan du bygge et konsern med flere verk – se Verket → Konsern.`,
    "good",
  );
}

export function buySister(g: GameState, type: SisterType): { ok: boolean; message: string } {
  const spec = SISTER_TYPES[type];
  if (!g.konsern.unlocked) return { ok: false, message: "Konsernet er ikke åpnet ennå." };
  if (g.konsern.plants.length >= MAX_SISTERS) return { ok: false, message: `Høyst ${MAX_SISTERS} datterverk.` };
  if (type === "storverk" && !g.konsern.plants.some((p) => p.type === "stalverk"))
    return { ok: false, message: "Kjøp et stålverk først – konsernet må lære å drive et verk til." };
  if (g.cash < spec.price) return { ok: false, message: "For lite penger" };
  addCost(g, "investering", spec.price);
  const n = g.konsern.plants.length + 2;
  g.konsern.plants.push({
    id: g.konsern.nextId++,
    type,
    name: `Verk nr. ${n}`,
    level: 0,
    boughtDay: day(g),
    downUntilDay: 0,
  });
  log(g, `Konsernet har kjøpt et ${spec.name.toLowerCase()} (verk nr. ${n}) for ${fmtKr(spec.price)}.`, "good");
  return { ok: true, message: `${spec.name} kjøpt.` };
}

export function modernizeSister(g: GameState, id: number): { ok: boolean; message: string } {
  const p = g.konsern.plants.find((x) => x.id === id);
  if (!p) return { ok: false, message: "Fant ikke verket." };
  if (p.level >= MODERNIZE_MAX) return { ok: false, message: "Verket er fullt modernisert." };
  const cost = modernizeCost(p);
  if (g.cash < cost) return { ok: false, message: "For lite penger" };
  addCost(g, "investering", cost);
  p.level += 1;
  log(g, `${p.name} er modernisert (trinn ${p.level}): mer overskudd hver dag.`, "good");
  return { ok: true, message: "Modernisert." };
}

export function buyShared(g: GameState, id: SharedId): { ok: boolean; message: string } {
  const spec = KONSERN_SHARED[id];
  if (!g.konsern.unlocked) return { ok: false, message: "Konsernet er ikke åpnet ennå." };
  if (hasShared(g, id)) return { ok: false, message: "Du har det allerede." };
  if (g.cash < spec.price) return { ok: false, message: "For lite penger" };
  addCost(g, "investering", spec.price);
  g.konsern.shared.push(id);
  log(g, `${spec.name} er etablert i konsernet.`, "good");
  return { ok: true, message: `${spec.name} etablert.` };
}

// ------------------------------------------------------------------ //
// Salgsdirektøren (B-117)
// ------------------------------------------------------------------ //
/** Rekruttering og lønn: meget dyrt, med vilje – det skal koste å slippe salgsarbeidet */
export const DIRECTOR_HIRE = 250_000_000;
export const DIRECTOR_PER_DAY = 4_000_000;
/** Rammeavtalene skal ikke ta mer enn dette av ukeproduksjonen til sammen (samme grense som «gult» på Salg, B-103) */
export const DIRECTOR_AGREEMENT_SHARE = 0.5;
/**
 * Salgsdirektøren er forsiktigere enn «trygg» på Salg: den regner med det dårligste døgnet den siste uka (en
 * stans eller et havari kan komme igjen) og vil ha minst 30 % av tida til fristen til overs.
 */
export const DIRECTOR_MARGIN = 0.7;

/** Tonn per døgn salgsdirektøren regner med: det dårligste av de siste sju døgnene med produksjon */
export function directorDailyT(g: GameState, stats: ReturnType<typeof computePlantStats>): number {
  const recent = g.history
    .slice(-7)
    .map((d) => d.producedT)
    .filter((t) => t > 0);
  const worst = recent.length ? Math.min(...recent) : stats.dailyProductT * 0.6;
  return Math.min(realisticDailyT(g, stats), worst);
}

export function hireDirector(g: GameState): { ok: boolean; message: string } {
  if (!g.konsern.unlocked) return { ok: false, message: "Konsernet er ikke åpnet ennå." };
  if (g.konsern.director) return { ok: false, message: "Du har allerede en salgsdirektør." };
  if (g.cash < DIRECTOR_HIRE) return { ok: false, message: "For lite penger" };
  addCost(g, "lonn", DIRECTOR_HIRE);
  g.konsern.director = { hiredDay: day(g), contracts: 0, agreements: 0, agreementsOn: true };
  log(
    g,
    `Konsernet har ansatt en salgsdirektør (${fmtKr(DIRECTOR_HIRE)} i rekruttering, ${fmtKr(DIRECTOR_PER_DAY)} per døgn). Kontraktene som verket rekker, signeres nå av seg selv.`,
    "good",
  );
  return { ok: true, message: "Salgsdirektøren er ansatt." };
}

export function fireDirector(g: GameState): { ok: boolean; message: string } {
  if (!g.konsern.director) return { ok: false, message: "Du har ingen salgsdirektør." };
  g.konsern.director = null;
  log(g, "Salgsdirektøren har sluttet. Nå signerer du kontraktene selv igjen.", "info");
  return { ok: true, message: "Salgsdirektøren har sluttet." };
}

/**
 * Hver time: salgsdirektøren signerer forespørsler verket trygt rekker (også i en dårlig uke), der resepten holder
 * (eller skrapklasseren legger den om), mest verdifulle først. Rammeavtaler tas så lenge de til sammen er under
 * halve ukeproduksjonen i en dårlig uke.
 * Resten får ligge, så spilleren kan ta dem selv.
 */
export function directorHour(g: GameState): void {
  const d = g.konsern?.director;
  if (!d) return;
  const stats = computePlantStats(g);
  if (stats.dailyProductT <= 0) return;
  const following = auto(g, "followQueue");
  const offers = g.contracts
    .filter((c) => c.status === "tilbud")
    .sort((a, b) => b.tonnes * b.pricePerT - a.tonnes * a.pricePerT);
  const perDay = directorDailyT(g, stats);
  if (perDay <= 0) return;
  for (const c of offers) {
    const check = assessOffer(g, stats, c, committedT(g));
    const recipeOk = check.recipeOk || (check.graderFix && following);
    if (!check.canMake || !recipeOk || check.tight || check.narrow) continue;
    // Samme regnestykke som på Salg, men med det dårligste døgnet og mer margin
    const needDays = (committedT(g) + agreementLoadUntil(g, c.deadlineDay) + c.tonnes) / perDay;
    if (needDays > check.days * DIRECTOR_MARGIN) continue;
    if (acceptContract(g, c.id, "Salgsdirektøren").ok) d.contracts += 1;
  }
  if (!d.agreementsOn) return;
  const perWeek = perDay * 7;
  for (const a of g.agreements.filter((x) => x.status === "tilbud")) {
    const used = g.agreements.filter((x) => x.status === "aktiv").reduce((t, x) => t + x.weeklyT, 0);
    const canMake = stats.products.includes(a.product);
    const recipeOk = recipeEstimate(g, a.grade, stats, gradeRecipe(g, a.grade)).grades.includes(a.grade);
    if (!canMake || !recipeOk || perWeek <= 0 || (used + a.weeklyT) / perWeek > DIRECTOR_AGREEMENT_SHARE) continue;
    if (acceptAgreement(g, a.id, "Salgsdirektøren").ok) d.agreements += 1;
  }
}

/** Hvert døgn: lønna til salgsdirektøren, overskuddet fra datterverkene og av og til en stans (B-106, B-117) */
export function konsernDay(g: GameState): void {
  if (g.konsern.director) addCost(g, "lonn", DIRECTOR_PER_DAY);
  const today = day(g);
  for (const p of g.konsern.plants) {
    if (p.downUntilDay > today) continue;
    if (chance(g, 0.012)) {
      const days = randInt(g, 2, 5);
      p.downUntilDay = today + days;
      log(g, `${p.name} står i ${days} døgn etter et havari. Ingen overskudd derfra imens.`, "event");
      continue;
    }
    addIncome(g, "konsern", sisterProfit(g, p));
  }
}
