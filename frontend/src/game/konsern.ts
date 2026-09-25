/**
 * Konsernet (B-106): når storverket er ferdig bygget, kan spilleren kjøpe datterverk. De gir overskudd hver dag,
 * som svinger med markedet og av og til stopper opp. Sluttmålet er 10 mrd. i konsernverdi: egenkapital pluss
 * verdien av datterverkene.
 */
import { addCost, addIncome, fmtKr, log } from "./engine";
import { day } from "./plant";
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

/** Hvert døgn: overskuddet fra datterverkene, og av og til en stans (B-106) */
export function konsernDay(g: GameState): void {
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
