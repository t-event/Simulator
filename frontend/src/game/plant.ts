/**
 * Utledede tall for anlegget: kapasitet, bemanning, skift og priser.
 *
 * Alt her regnes ut fra spilltilstanden hver gang det trengs, så tilstanden
 * aldri kan komme i utakt med utstyret spilleren faktisk har.
 */
import {
  ADDONS,
  CASTINGS,
  CREW_ROLES,
  FURNACES,
  GRADES,
  MIN_PER_DAY,
  PRODUCTS,
  SHIFT_START_HOUR,
  STAGES,
  type Addon,
  type CastingType,
  type FurnaceType,
  type Stage,
} from "./data";
import { hasResearch } from "./research";
import type { Analysis, Crew, GameState, GradeId, ProductId, RoleId } from "./types";

export const OWNER_SLOTS = 2;
export const OWNER_HOURS = 10;
const ROLLING_TPH = 45;

/** Valseverket bygges ut sammen med storverket, så det holder følge med fire strenger. */
export function rollingTph(g: GameState): number {
  return ROLLING_TPH * (g.stage >= 4 ? 2.5 : 1);
}
export const ROLLING_YIELD = 0.96;

export interface PlantStats {
  stage: Stage;
  furnace: FurnaceType;
  furnaceCount: number;
  casting: CastingType;
  lab: 0 | 1 | 2;
  sizeT: number;
  cycleMin: number;
  kwhPerT: number;
  dephos: number;
  castTph: number;
  castYield: number;
  crew: Crew;
  shifts: number;
  hours: number;
  ownerWorks: boolean;
  /** Det som mangler for å bemanne ett skift til (eller det første) */
  missing: Crew;
  staffCount: number;
  staffCap: number;
  yardT: number;
  storeT: number;
  yardUsed: number;
  storeUsed: number;
  salaryPerDay: number;
  /** Multiplikator på sannsynligheten for havarier */
  maintFactor: number;
  /** Multiplikator på reparasjonstid */
  repairFactor: number;
  crewSkill: number;
  /** Multiplikator på chargetid fra mannskapets ferdighet */
  skillFactor: number;
  products: ProductId[];
  mainProduct: ProductId;
  /** Anslått produksjon av ferdigvare per døgn ved full drift */
  dailyProductT: number;
  offersPerDay: number;
  priceBonus: number;
}

export function has(g: GameState, id: string): boolean {
  return g.owned.includes(id);
}

export function furnaceType(g: GameState): FurnaceType {
  return FURNACES.find((f) => f.id === g.furnaceType) ?? FURNACES[0];
}

export function castingType(g: GameState): CastingType {
  return CASTINGS.find((c) => c.id === g.castingType) ?? CASTINGS[0];
}

export function addCrew(target: Crew, add: Crew | undefined, times = 1): void {
  if (!add) return;
  for (const [role, n] of Object.entries(add) as [RoleId, number][]) {
    target[role] = (target[role] ?? 0) + n * times;
  }
}

export function rollingActive(g: GameState): boolean {
  return has(g, "valseverk") && g.settings.rolling;
}

/** Mannskap som trengs for å kjøre ett skift med det utstyret som står. */
export function crewPerShift(g: GameState): Crew {
  const crew: Crew = {};
  const f = furnaceType(g);
  addCrew(crew, f.crew, g.furnaceCount);
  addCrew(crew, castingType(g).crew);
  const scrapCrew = STAGES[g.stage].scrapCrew;
  if (scrapCrew > 0) addCrew(crew, { skrap: scrapCrew });
  for (const addon of ADDONS) {
    if (!has(g, addon.id) || !addon.crew) continue;
    if (addon.id === "valseverk" && !rollingActive(g)) continue;
    if (addon.id === "oseovn" && !f.arc) continue;
    addCrew(crew, addon.crew);
  }
  return crew;
}

function countRoles(g: GameState): Record<RoleId, number> {
  const counts = { allround: 0, ovn: 0, stoper: 0, skrap: 0, lab: 0, vedlikehold: 0, salg: 0, valse: 0 };
  for (const w of g.workers) counts[w.role] += 1;
  return counts;
}

/** Hvor mange plasser som ikke kan fylles for k skift. */
function deficit(crew: Crew, counts: Record<RoleId, number>, k: number, wildcards: number): Crew {
  const missing: Crew = {};
  let spare = wildcards;
  for (const role of CREW_ROLES) {
    const need = (crew[role] ?? 0) * k;
    const short = Math.max(0, need - counts[role]);
    const covered = Math.min(short, spare);
    spare -= covered;
    if (short - covered > 0) missing[role] = short - covered;
  }
  return missing;
}

const isEmpty = (crew: Crew) => Object.values(crew).every((n) => !n);

export function staffing(g: GameState): {
  shifts: number;
  hours: number;
  ownerWorks: boolean;
  missing: Crew;
  crew: Crew;
} {
  const crew = crewPerShift(g);
  const counts = countRoles(g);
  const ownerWorks = g.stage <= 1;
  const wildcards = counts.allround + (ownerWorks ? OWNER_SLOTS : 0);
  let shifts = 0;
  for (let k = 1; k <= 3; k++) {
    if (isEmpty(deficit(crew, counts, k, wildcards))) shifts = k;
    else break;
  }
  const missing = shifts < 3 ? deficit(crew, counts, shifts + 1, wildcards) : {};
  let hours = 0;
  if (shifts > 0) hours = Math.min(24, (ownerWorks ? OWNER_HOURS : 8) + 8 * (shifts - 1));
  return { shifts, hours, ownerWorks, missing, crew };
}

export function isOpen(g: GameState, hours: number, minute = g.minute): boolean {
  if (hours >= 24) return true;
  if (hours <= 0) return false;
  const hourOfDay = (minute % MIN_PER_DAY) / 60;
  return (hourOfDay - SHIFT_START_HOUR + 24) % 24 < hours;
}

export function day(g: GameState, minute = g.minute): number {
  return Math.floor(minute / MIN_PER_DAY) + 1;
}

export function hourOfDay(g: GameState, minute = g.minute): number {
  return Math.floor((minute % MIN_PER_DAY) / 60);
}

const POWER_BASE = 0.85;
const GAS_PRICE = 0.62;
// Døgnprofil for strømprisen: billig om natta, topper morgen og ettermiddag
const HOURLY_PROFILE = [
  0.72, 0.7, 0.68, 0.68, 0.7, 0.78, 0.95, 1.2, 1.3, 1.22, 1.08, 1.0, 0.96, 0.94, 0.96, 1.02, 1.12, 1.28, 1.32, 1.2,
  1.05, 0.95, 0.85, 0.78,
];

export function powerPrice(g: GameState, minute = g.minute): number {
  return POWER_BASE * g.market.powerFactor * HOURLY_PROFILE[hourOfDay(g, minute)];
}

export function energyPrice(g: GameState, minute = g.minute): number {
  return furnaceType(g).fuel === "gass" ? GAS_PRICE : powerPrice(g, minute);
}

export function computePlantStats(g: GameState): PlantStats {
  const stage = STAGES[g.stage];
  const furnace = furnaceType(g);
  const casting = castingType(g);
  const staff = staffing(g);

  const lab: 0 | 1 | 2 = has(g, "oes") ? 2 : has(g, "xrf") ? 1 : 0;

  // Ferdigheten til de som faktisk står i produksjonen
  const floor = g.workers.filter((w) => w.role !== "salg" && w.role !== "vedlikehold");
  const skills = floor.map((w) => w.skill);
  if (staff.ownerWorks) skills.push(g.ownerSkill, g.ownerSkill);
  const crewSkill = skills.length ? skills.reduce((a, b) => a + b, 0) / skills.length : g.ownerSkill;
  const skillFactor = 1.12 - 0.04 * crewSkill;

  let cycleMin = furnace.cycleMin * skillFactor;
  let kwhPerT = furnace.kwhPerT;
  if (furnace.arc && has(g, "conveyor")) {
    cycleMin *= 0.92;
    kwhPerT *= 0.88;
  }
  if (furnace.arc && has(g, "trafo")) {
    cycleMin *= 0.85;
    kwhPerT *= 1.02;
  }
  if (hasResearch(g, "energistyring")) kwhPerT *= 0.95;
  if (furnace.arc && hasResearch(g, "skumslagg")) kwhPerT *= 0.94;

  const repairers = g.workers.filter((w) => w.role === "vedlikehold").length;
  const repairCover = Math.min(1, repairers / Math.max(1, g.stage));
  let maintFactor = 1 - 0.35 * repairCover;
  let repairFactor = 1 - 0.3 * repairCover;
  if (has(g, "verksted")) {
    maintFactor *= 0.7;
    repairFactor *= 0.7;
  }
  if (hasResearch(g, "sikkerhet")) maintFactor *= 0.8;

  const sellers = g.workers.filter((w) => w.role === "salg").length;
  const offersPerDay =
    1.2 +
    0.6 * g.stage +
    (has(g, "salgskontor") ? 1 : 0) +
    Math.min(3, sellers) * 0.8 +
    (hasResearch(g, "kundepleie") ? 0.6 : 0) +
    (hasResearch(g, "eksport") ? 1 : 0);
  const priceBonus =
    (has(g, "salgskontor") ? 0.03 : 0) +
    Math.min(4, sellers) * 0.02 +
    g.reputation * 0.0008 +
    (hasResearch(g, "kundepleie") ? 0.02 : 0) +
    (hasResearch(g, "eksport") ? 0.03 : 0);

  const storeMult = has(g, "lager") ? 2 : 1;
  const yardUsed = Object.values(g.scrap).reduce((a, s) => a + s.t, 0);
  const storeUsed = g.lots.reduce((a, l) => a + l.t, 0);

  const salaryPerDay = g.workers.reduce((a, w) => a + w.salary, 0);

  const products: ProductId[] = [casting.product];
  if (rollingActive(g)) products.push("armering");
  const mainProduct = rollingActive(g) ? "armering" : casting.product;

  // Anslått døgnproduksjon: smeltekapasitet i åpningstida, begrenset av støping og valsing
  const heatsPerDay = staff.hours > 0 ? (staff.hours * 60) / cycleMin + 0.5 : 0;
  const liquidPerDay = heatsPerDay * furnace.sizeT * g.furnaceCount * 0.93;
  let productPerDay = Math.min(liquidPerDay, casting.tph * 24) * casting.yield;
  if (rollingActive(g)) productPerDay = Math.min(productPerDay, rollingTph(g) * Math.max(8, staff.hours)) * ROLLING_YIELD;

  return {
    stage,
    furnace,
    furnaceCount: g.furnaceCount,
    casting,
    lab,
    sizeT: furnace.sizeT,
    cycleMin,
    kwhPerT,
    dephos: furnace.dephos,
    castTph: casting.tph,
    castYield: casting.yield,
    crew: staff.crew,
    shifts: staff.shifts,
    hours: staff.hours,
    ownerWorks: staff.ownerWorks,
    missing: staff.missing,
    staffCount: g.workers.length,
    staffCap: stage.staffCap,
    yardT: stage.yardT * storeMult,
    storeT: stage.storeT * storeMult,
    yardUsed,
    storeUsed,
    salaryPerDay,
    maintFactor,
    repairFactor,
    crewSkill,
    skillFactor,
    products,
    mainProduct,
    dailyProductT: productPerDay,
    offersPerDay,
    priceBonus,
  };
}

// ------------------------------------------------------------------ //
// Kvalitet
// ------------------------------------------------------------------ //
export function satisfies(a: Analysis, grade: GradeId): boolean {
  const spec = GRADES[grade];
  return a.c >= spec.cMin && a.c <= spec.cMax && a.p <= spec.pMax && a.tramp <= spec.trampMax;
}

export function satisfiedGrades(a: Analysis): GradeId[] {
  return (Object.keys(GRADES) as GradeId[]).filter((id) => satisfies(a, id));
}

/** Ligger analysen så nær en grense at vanlig variasjon kan gi avvik? */
export function nearLimit(a: Analysis, grade: GradeId): boolean {
  const spec = GRADES[grade];
  const cSpan = spec.cMax - spec.cMin;
  return (
    a.p > spec.pMax * 0.85 ||
    a.tramp > spec.trampMax * 0.85 ||
    a.c > spec.cMax - cSpan * 0.1 ||
    (spec.cMin > 0 && a.c < spec.cMin + cSpan * 0.1)
  );
}

/** Hva som er galt med analysen mot kravet, i klartekst. */
export function gradeFailures(a: Analysis, grade: GradeId): string[] {
  const spec = GRADES[grade];
  const out: string[] = [];
  if (a.p > spec.pMax) out.push(`fosfor ${a.p.toFixed(3)} % over maks ${spec.pMax.toFixed(3)} %`);
  if (a.tramp > spec.trampMax)
    out.push(`sporelementer ${a.tramp.toFixed(2)} % over maks ${spec.trampMax.toFixed(2)} %`);
  if (a.c > spec.cMax) out.push(`karbon ${a.c.toFixed(2)} % over maks ${spec.cMax.toFixed(2)} %`);
  if (a.c < spec.cMin) out.push(`karbon ${a.c.toFixed(2)} % under min ${spec.cMin.toFixed(2)} %`);
  return out;
}

export function productPrice(g: GameState, product: ProductId, grade: GradeId | null): number {
  const base = PRODUCTS[product].price * g.market.steelFactor;
  return base * (grade ? GRADES[grade].premium : 1);
}

export function unlockedAddons(g: GameState): Addon[] {
  return ADDONS.filter((a) => a.stage <= g.stage);
}
