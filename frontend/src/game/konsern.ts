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
  awardPoints,
  committedT,
  fmtKr,
  log,
  realisticDailyT,
  recipeEstimate,
  unlock,
} from "./engine";
import { computePlantStats, day, gradeRecipe } from "./plant";
import { auto, hasResearch } from "./research";
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
/** Med forskningen «Større konsern» er det plass til flere (B-120) */
export const MAX_SISTERS_BIG = 8;

export function maxSisters(g: GameState): number {
  return hasResearch(g, "storkonsern") ? MAX_SISTERS_BIG : MAX_SISTERS;
}

/** Pris på et nytt datterverk, med oppkjøpsavdelingen (B-120) */
export function sisterPrice(g: GameState, type: SisterType): number {
  return SISTER_TYPES[type].price * (hasResearch(g, "oppkjop") ? 0.85 : 1);
}

/** Navn på datterverkene, i kjøpsrekkefølge (vanlige ord, ingen ekte steder) */
export const SISTER_NAMES = [
  "Elveverket",
  "Fjordverket",
  "Dalverket",
  "Havneverket",
  "Skogverket",
  "Fjellverket",
  "Kystverket",
  "Sletteverket",
];

/** Milepæler for konsernverdien på veien mot sluttmålet, med fagpoeng som belønning (B-119) */
export const KONSERN_MILESTONES = [2_000_000_000, 4_000_000_000, 6_000_000_000, 8_000_000_000];
export const MILESTONE_FP = 40;

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
  // Konsernforskningen (B-120)
  const research = (hasResearch(g, "konsernstyring") ? 1.1 : 1) * (hasResearch(g, "gronnkonsern") ? 1.1 : 1);
  return spec.profitPerDay * (1 + MODERNIZE_GAIN * p.level) * shared * research * g.market.steelFactor;
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

export function modernizeCost(p: SisterPlant, g?: GameState): number {
  return SISTER_TYPES[p.type].price * MODERNIZE_SHARE * (g && hasResearch(g, "standardverk") ? 0.75 : 1);
}

/** Å bygge ut et stålverk til storverk koster forskjellen i pris; moderniseringen starter på nytt (B-119) */
export function upgradeCost(g?: GameState): number {
  return (SISTER_TYPES.storverk.price - SISTER_TYPES.stalverk.price) * (g && hasResearch(g, "oppkjop") ? 0.85 : 1);
}

/** Overskudd per døgn et datterverk av en type og et nivå ville gitt nå */
function profitOf(g: GameState, type: SisterType, level: number): number {
  return sisterProfit(g, { id: 0, type, name: "", level, boughtDay: 0, downUntilDay: 0 });
}

/** Gjennomsnitt per døgn de siste tre døgnene for noen inntekts- eller kostnadsposter */
function recentPerDay(g: GameState, pick: (d: GameState["today"]) => number): number {
  const days = g.history.slice(-3);
  return days.length ? days.reduce((a, d) => a + pick(d), 0) / days.length : 0;
}

/** Omtrentlig overskudd per døgn for hele konsernet de siste døgnene (uten investeringer) */
export function konsernProfitPerDay(g: GameState): number {
  return recentPerDay(g, (d) => {
    const inc = Object.values(d.income).reduce<number>((a, b) => a + (b ?? 0), 0);
    const cost = Object.entries(d.costs)
      .filter(([k]) => k !== "investering")
      .reduce<number>((a, [, b]) => a + (b ?? 0), 0);
    return inc - cost;
  });
}

export interface KonsernOption {
  key: string;
  title: string;
  price: number;
  /** Omtrent hvor mye mer overskudd per døgn kjøpet gir */
  gain: number;
  /** Døgn før kjøpet har betalt seg */
  payback: number;
  /** Hvorfor det ikke kan kjøpes nå (utenom penger), eller null */
  blocked: string | null;
  run: (g: GameState) => { ok: boolean; message: string };
}

/**
 * Alle kjøp i konsernet med hva de gir per døgn og hvor fort de betaler seg (B-119). Brukes til «Neste steg»,
 * til å forklare hver knapp og av testspilleren.
 */
export function konsernOptions(g: GameState): KonsernOption[] {
  const k = g.konsern;
  const out: KonsernOption[] = [];
  const add = (o: Omit<KonsernOption, "payback">) =>
    out.push({ ...o, payback: o.gain > 0 ? o.price / o.gain : Infinity });
  const full = k.plants.length >= maxSisters(g);
  const hasStalverk = k.plants.some((p) => p.type === "stalverk");
  add({
    key: "kjop-stalverk",
    title: "Kjøp et stålverk",
    price: sisterPrice(g, "stalverk"),
    gain: profitOf(g, "stalverk", 0),
    blocked: full ? `Konsernet er fullt (${maxSisters(g)} datterverk) – bygg ut eller moderniser i stedet` : null,
    run: (gg) => buySister(gg, "stalverk"),
  });
  add({
    key: "kjop-storverk",
    title: "Kjøp et storverk",
    price: sisterPrice(g, "storverk"),
    gain: profitOf(g, "storverk", 0),
    blocked: full
      ? `Konsernet er fullt (${maxSisters(g)} datterverk) – bygg ut et stålverk til storverk i stedet`
      : !hasStalverk
        ? "Kjøp et stålverk først – konsernet må lære å drive et verk før det tar på seg et storverk"
        : null,
    run: (gg) => buySister(gg, "storverk"),
  });
  // Felles funksjoner: 5 % mer i alle datterverkene, og litt hjemme
  const sisters = k.plants.reduce((a, p) => a + profitOf(g, p.type, p.level), 0);
  const sharedNow = 1 + (hasShared(g, "innkjop") ? 0.05 : 0) + (hasShared(g, "salg") ? 0.05 : 0);
  const sisterGain = (sisters / sharedNow) * 0.05;
  const scrapPerDay = recentPerDay(g, (d) => d.costs.skrap ?? 0);
  const salesPerDay = recentPerDay(g, (d) => (d.income.kontrakt ?? 0) + (d.income.spot ?? 0));
  for (const id of Object.keys(KONSERN_SHARED) as SharedId[]) {
    if (hasShared(g, id)) continue;
    add({
      key: `felles-${id}`,
      title: KONSERN_SHARED[id].name,
      price: KONSERN_SHARED[id].price,
      gain: sisterGain + (id === "innkjop" ? scrapPerDay * 0.05 : salesPerDay * 0.03),
      blocked: null,
      run: (gg) => buyShared(gg, id),
    });
  }
  for (const p of k.plants) {
    if (p.type === "stalverk")
      add({
        key: `bygg-${p.id}`,
        title: `Bygg ut ${p.name} til storverk`,
        price: upgradeCost(g),
        gain: profitOf(g, "storverk", 0) - profitOf(g, "stalverk", p.level),
        blocked: null,
        run: (gg) => upgradeSister(gg, p.id),
      });
    if (p.level < MODERNIZE_MAX)
      add({
        key: `mod-${p.id}`,
        title: `Moderniser ${p.name}`,
        price: modernizeCost(p, g),
        gain: profitOf(g, p.type, p.level + 1) - profitOf(g, p.type, p.level),
        blocked: null,
        run: (gg) => modernizeSister(gg, p.id),
      });
  }
  return out;
}

/**
 * «Neste steg» på Konsern-fanen (B-119): kjøpet som har betalt seg raskest regnet fra i dag – tida det tar å spare
 * opp, pluss tida kjøpet bruker på å betale seg. Da foreslås ikke noe som ligger et halvt år fram i tid.
 */
export function konsernAdvice(g: GameState): KonsernOption | null {
  const score = (o: KonsernOption) => (daysToAfford(g, o.price) ?? o.payback * 2) + o.payback;
  return (
    konsernOptions(g)
      .filter((o) => !o.blocked && o.gain > 0)
      .sort((a, b) => score(a) - score(b))[0] ?? null
  );
}

/** Hvor mange døgn det tar å spare opp til et beløp med dagens overskudd; null hvis overskuddet er for lite */
export function daysToAfford(g: GameState, price: number): number | null {
  const missing = price - g.cash;
  if (missing <= 0) return 0;
  const perDay = konsernProfitPerDay(g);
  return perDay > 0 ? Math.ceil(missing / perDay) : null;
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
  unlock(g, "konsern");
  log(
    g,
    remaining === 0
      ? "Storverket er ferdig bygget! Nå kan du bygge et konsern med flere verk – se Verket → Konsern."
      : `Egenkapitalen har passert ${fmtKr(KONSERN_UNLOCK_EQUITY)}! Nå kan du bygge et konsern med flere verk – se Verket → Konsern. Nye prosjekter venter under Forskning.`,
    "good",
  );
}

export function buySister(g: GameState, type: SisterType): { ok: boolean; message: string } {
  const spec = SISTER_TYPES[type];
  if (!g.konsern.unlocked) return { ok: false, message: "Konsernet er ikke åpnet ennå." };
  if (g.konsern.plants.length >= maxSisters(g)) return { ok: false, message: `Høyst ${maxSisters(g)} datterverk.` };
  if (type === "storverk" && !g.konsern.plants.some((p) => p.type === "stalverk"))
    return { ok: false, message: "Kjøp et stålverk først – konsernet må lære å drive et verk til." };
  const price = sisterPrice(g, type);
  if (g.cash < price) return { ok: false, message: "For lite penger" };
  addCost(g, "investering", price);
  const used = new Set(g.konsern.plants.map((p) => p.name));
  const name = SISTER_NAMES.find((x) => !used.has(x)) ?? `Verk nr. ${g.konsern.plants.length + 2}`;
  g.konsern.plants.push({ id: g.konsern.nextId++, type, name, level: 0, boughtDay: day(g), downUntilDay: 0 });
  log(
    g,
    `Konsernet har kjøpt ${name}, et ${spec.name.toLowerCase()}, for ${fmtKr(price)}. Det gir ca. ${fmtKr(profitOf(g, type, 0))} i overskudd per døgn.`,
    "good",
  );
  return { ok: true, message: `${name} er kjøpt.` };
}

/** Bygger ut et stålverk til et storverk (B-119) */
export function upgradeSister(g: GameState, id: number): { ok: boolean; message: string } {
  const p = g.konsern.plants.find((x) => x.id === id);
  if (!p || p.type !== "stalverk") return { ok: false, message: "Bare et stålverk kan bygges ut til storverk." };
  const cost = upgradeCost(g);
  if (g.cash < cost) return { ok: false, message: "For lite penger" };
  addCost(g, "investering", cost);
  p.type = "storverk";
  p.level = 0;
  log(
    g,
    `${p.name} er bygget ut til storverk! Overskuddet øker til ca. ${fmtKr(sisterProfit(g, p))} per døgn. Moderniseringen starter på nytt.`,
    "good",
  );
  return { ok: true, message: `${p.name} er bygget ut.` };
}

/** Milepæler for konsernverdien (B-119): fagpoeng og en god nyhet på veien mot 10 mrd. */
export function checkKonsernMilestones(g: GameState): void {
  const k = g.konsern;
  if (!k?.unlocked) return;
  while (k.milestones < KONSERN_MILESTONES.length && konsernEquity(g) >= KONSERN_MILESTONES[k.milestones]) {
    const value = KONSERN_MILESTONES[k.milestones];
    k.milestones += 1;
    awardPoints(g, MILESTONE_FP);
    log(
      g,
      `Milepæl: konsernet er verdt over ${fmtKr(value)}! +${MILESTONE_FP} fagpoeng. ${k.milestones < KONSERN_MILESTONES.length ? `Neste milepæl: ${fmtKr(KONSERN_MILESTONES[k.milestones])}.` : "Nå gjenstår bare sluttmålet."}`,
      "good",
    );
  }
}

export function modernizeSister(g: GameState, id: number): { ok: boolean; message: string } {
  const p = g.konsern.plants.find((x) => x.id === id);
  if (!p) return { ok: false, message: "Fant ikke verket." };
  if (p.level >= MODERNIZE_MAX) return { ok: false, message: "Verket er fullt modernisert." };
  const cost = modernizeCost(p, g);
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

/** Lønna til salgsdirektøren, halvert med «Profesjonell ledelse» (B-120) */
export function directorPerDay(g: GameState): number {
  return DIRECTOR_PER_DAY * (hasResearch(g, "konsernledelse") ? 0.5 : 1);
}
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
    `Konsernet har ansatt en salgsdirektør (${fmtKr(DIRECTOR_HIRE)} i rekruttering, ${fmtKr(directorPerDay(g))} per døgn). Kontraktene som verket rekker, signeres nå av seg selv.`,
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
  if (g.konsern.director) addCost(g, "lonn", directorPerDay(g));
  const today = day(g);
  for (const p of g.konsern.plants) {
    if (p.downUntilDay > today) continue;
    const maintained = hasResearch(g, "fellesvedlikehold");
    if (chance(g, 0.012 * (maintained ? 0.5 : 1))) {
      const days = maintained ? randInt(g, 1, 3) : randInt(g, 2, 5);
      p.downUntilDay = today + days;
      log(g, `${p.name} står i ${days} døgn etter et havari. Ingen overskudd derfra imens.`, "event");
      continue;
    }
    // Av og til går det ekstra godt: dobbelt overskudd det døgnet (B-119)
    const record = chance(g, 0.015);
    addIncome(g, "konsern", sisterProfit(g, p) * (record ? 2 : 1));
    // Kunnskapsdeling: hjemmeverket lærer av datterverkene som går (B-120)
    if (hasResearch(g, "kunnskapsdeling")) awardPoints(g, 1);
    if (record)
      log(
        g,
        `${p.name} satte produksjonsrekord og ga dobbelt overskudd i dag: ${fmtKr(sisterProfit(g, p) * 2)}.`,
        "good",
      );
  }
}
