/**
 * Konsernet (B-106): når storverket er ferdig bygget, kan spilleren kjøpe datterverk. De gir overskudd hver dag,
 * som svinger med markedet og av og til stopper opp. Sluttmålet er 10 mrd. i konsernverdi: egenkapital pluss
 * verdien av datterverkene.
 */
import {
  acceptAgreement,
  acceptContract,
  addCost,
  agreementWeeks,
  agreementLoadUntil,
  addIncome,
  assessOffer,
  awardPoints,
  committedT,
  extraOffer,
  fmtKr,
  log,
  queueFit,
  realisticDailyT,
  recipeEstimate,
  unlock,
} from "./engine";
import { computePlantStats, day, gradeRecipe, productCapT } from "./plant";
import { auto, hasResearch } from "./research";
import { masteryFactor } from "./mastery";
import { chance, randInt } from "./random";
import { realNow, setRealClock } from "./clock";
import type { GameState, SisterPlant, SisterProject, SisterType } from "./types";

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
    profitPerDay: 5_000_000,
    description: "Et skrapbasert stålverk med én lysbueovn og strengstøping. Egen ledelse og egne folk.",
  },
  storverk: {
    name: "Storverk",
    price: 1_200_000_000,
    profitPerDay: 20_000_000,
    description: "Et fullskala stålverk med flere ovner, valseverk og havn.",
  },
  kompleks: {
    name: "Stålkompleks",
    // Trimmet i B-209: 110 mill. per døgn til 60 mill., og prisen fulgte med, så verket fortsatt er verdt det det koster
    price: 3_600_000_000,
    profitPerDay: 60_000_000,
    description:
      "Flere storverk på ett sted med egen havn, eget kraftverk og valseverk for plater og profiler. Åpnes med tittelen Stålfyrste.",
  },
};

/**
 * Stålmilepæler etter sluttmålet (B-150): konsernet kan alltid vokse videre. Hver milepæl gir en tittel ved
 * kallenavnet, fagpoeng (til mesterskapet) og mer å bruke pengene på. Sluttmålet 10 mrd. gir tittelen Stålbaron.
 * Grensene er satt etter ekte stålselskaper (B-238): det mest verdifulle stålselskapet i verden er verdt noen hundre
 * milliarder kroner, og hele stålindustrien noen tusen. Før gikk titlene opp til en billiard – tusen ganger mer enn
 * all stålindustri i verden. `like` sier hva verdien kan sammenlignes med; tallene er runde og omtrentlige.
 * Samme grenser står i title_of() på serveren (041_realistiske_titler.sql).
 */
export const WIN_TITLE = "Stålbaron";
export const LEGENDS: { equity: number; title: string; fp: number; unlocks: string; like: string }[] = [
  {
    equity: 25_000_000_000,
    title: "Stålmagnat",
    fp: 150,
    unlocks: "Datterverkene kan moderniseres til trinn 4.",
    like: "et stort stålkonsern i ett land",
  },
  {
    equity: 50_000_000_000,
    title: "Stålfyrste",
    fp: 250,
    unlocks:
      "Stålkomplekser kan kjøpes, og det er plass til to datterverk til. Et kompleks tjener like mye som tre storverk – bytt ut de små verkene etter hvert.",
    like: "et av de store stålkonsernene i Europa",
  },
  {
    equity: 100_000_000_000,
    title: "Stålkonge",
    fp: 400,
    unlocks: "Datterverkene kan moderniseres til trinn 5.",
    like: "et av de største stålkonsernene i Europa",
  },
  {
    equity: 200_000_000_000,
    title: "Stålkeiser",
    fp: 700,
    unlocks: "Plass til to datterverk til.",
    like: "et av de ti største stålselskapene i verden",
  },
  {
    equity: 400_000_000_000,
    title: "Stållegende",
    fp: 1500,
    unlocks: "Du er en legende i stålverdenen.",
    like: "det mest verdifulle stålselskapet i verden",
  },
  // Flere titler etter Stållegende (B-173), grensene satt ned i B-238
  {
    equity: 750_000_000_000,
    title: "Stålgigant",
    fp: 2500,
    unlocks: "Plass til to datterverk til.",
    like: "nesten dobbelt så mye som noe stålselskap i verden",
  },
  {
    equity: 1_500_000_000_000,
    title: "Stålkolosse",
    fp: 4000,
    unlocks: "Datterverkene kan moderniseres til trinn 6.",
    like: "de fem største stålselskapene i verden til sammen",
  },
  {
    equity: 3_000_000_000_000,
    title: "Stålmyte",
    fp: 6000,
    unlocks: "Du er en myte i stålverdenen.",
    like: "over halvparten av all stålindustri i verden",
  },
  {
    equity: 5_000_000_000_000,
    title: "Stålikon",
    fp: 10000,
    unlocks: "Ingen har kommet lenger.",
    like: "hele stålindustrien i verden",
  },
];

/** Tittelen spilleren har (den høyeste milepælen), eller null før sluttmålet */
export function titleOf(g: GameState): string | null {
  const n = g.konsern?.legends ?? 0;
  if (n > 0) return LEGENDS[n - 1].title;
  return g.won ? WIN_TITLE : null;
}

/** Høyeste moderniseringstrinn: 3, 4 med Stålmagnat, 5 med Stålkonge (B-150), 6 med Stålkolosse (B-173) */
export function modernizeMax(g: GameState): number {
  const n = g.konsern?.legends ?? 0;
  return MODERNIZE_MAX + (n >= 1 ? 1 : 0) + (n >= 3 ? 1 : 0) + (n >= 7 ? 1 : 0);
}

/** Stålkomplekser åpnes med tittelen Stålfyrste */
export function kompleksOpen(g: GameState): boolean {
  return (g.konsern?.legends ?? 0) >= 2;
}

/** Stålmilepælene etter sluttmålet: tittel, fagpoeng og en feiring */
export function checkLegends(g: GameState): void {
  const k = g.konsern;
  if (!k?.unlocked || !g.won) return;
  while (k.legends < LEGENDS.length && konsernEquity(g) >= LEGENDS[k.legends].equity) {
    const l = LEGENDS[k.legends];
    k.legends += 1;
    awardPoints(g, l.fp);
    g.legendCelebrate = k.legends - 1;
    log(
      g,
      `Ny tittel: ${l.title}! Konsernet er verdt over ${fmtKr(l.equity)}, omtrent som ${l.like}. +${l.fp} fagpoeng. ${l.unlocks}`,
      "good",
    );
  }
}

/** Modernisering av et datterverk: 30 % av prisen, +25 % overskudd per trinn, inntil tre trinn */
export const MODERNIZE_SHARE = 0.3;
export const MODERNIZE_GAIN = 0.25;
export const MODERNIZE_MAX = 3;
export const MAX_SISTERS = 6;
/** Med forskningen «Større konsern» er det plass til flere (B-120) */
export const MAX_SISTERS_BIG = 8;

export function maxSisters(g: GameState): number {
  // Stålfyrste og Stålkeiser gir plass til to til hver (B-150)
  const n = g.konsern?.legends ?? 0;
  return (
    (hasResearch(g, "storkonsern") ? MAX_SISTERS_BIG : MAX_SISTERS) +
    (n >= 2 ? 2 : 0) +
    (n >= 4 ? 2 : 0) +
    (n >= 6 ? 2 : 0)
  );
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
  "Nesverket",
  "Sletteverket",
  "Øyverket",
  "Viksverket",
  "Bakkeverket",
  "Strandverket",
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

// ------------------------------------------------------------------ //
// Byggetid i ekte tid (B-209)
// ------------------------------------------------------------------ //
/**
 * Å bygge, bygge ut og modernisere datterverk tar ekte timer, uansett spillfart. Før betalte et stålkompleks seg på
 * 10–18 minutter på 10×, og hele konsernet var ferdig utbygd på noen timer. Nå er det døgnene som avgjør hvor fort
 * konsernet vokser, ikke fartsknappen.
 */
export const BUILD_HOURS: Record<SisterType, number> = { stalverk: 2, storverk: 6, kompleks: 12 };
export const UPGRADE_HOURS = 6;
export const MODERNIZE_HOURS = 4;
const HOUR_MS = 3_600_000;

// Klokka ligger i clock.ts, så også hendelseskortene kan bruke den (B-210)
export { realNow, setRealClock };

/** Et nytt verk som ikke er ferdig bygget: det tjener ingenting og har ingen ledelse ennå */
export function underConstruction(p: SisterPlant): boolean {
  return p.project?.kind === "bygg";
}

/** Verket slik det blir når prosjektet er ferdig */
export function plannedPlant(p: SisterPlant): SisterPlant {
  if (!p.project) return p;
  if (p.project.kind === "utbygging") return { ...p, type: "storverk", level: 0 };
  if (p.project.kind === "modernisering") return { ...p, level: p.level + 1 };
  return p;
}

/** Hva som pågår, med vanlige ord */
export function projectLabel(p: SisterPlant): string {
  const k = p.project?.kind;
  if (k === "bygg") return `Bygges (${SISTER_TYPES[p.type].name.toLowerCase()})`;
  if (k === "utbygging") return "Bygges ut til storverk";
  if (k === "modernisering") return `Moderniseres til trinn ${p.level + 1}`;
  return "";
}

/** Hvor langt prosjektet er kommet (0–1) */
export function projectProgress(p: SisterPlant, now = realNow()): number {
  const pr = p.project;
  if (!pr) return 1;
  return Math.min(1, Math.max(0, (now - pr.startedAt) / Math.max(1, pr.readyAt - pr.startedAt)));
}

function startProject(kind: SisterProject["kind"], hours: number): SisterProject {
  const now = realNow();
  return { kind, startedAt: now, readyAt: now + hours * HOUR_MS };
}

/** Fullfører prosjektene som er ferdige i ekte tid. Kalles fra spilløkka, også når spillet står på pause */
export function finishKonsernProjects(g: GameState): number {
  const now = realNow();
  let done = 0;
  for (const p of g.konsern?.plants ?? []) {
    if (!p.project || p.project.readyAt > now) continue;
    const kind = p.project.kind;
    const after = plannedPlant(p);
    p.type = after.type;
    p.level = after.level;
    delete p.project;
    done += 1;
    log(
      g,
      kind === "bygg"
        ? `${p.name} er ferdig bygget og i drift. Det gir ca. ${fmtKr(sisterProfit(g, p))} i overskudd per døgn.`
        : kind === "utbygging"
          ? `${p.name} er bygget ut til storverk! Overskuddet øker til ca. ${fmtKr(sisterProfit(g, p))} per døgn.`
          : `${p.name} er modernisert (trinn ${p.level}): mer overskudd hver dag.`,
      "good",
    );
  }
  return done;
}

/** Overskudd per døgn for ett datterverk nå (uten tilfeldig svingning) */
export function sisterProfit(g: GameState, p: SisterPlant): number {
  const spec = SISTER_TYPES[p.type];
  const shared = 1 + (hasShared(g, "innkjop") ? 0.05 : 0) + (hasShared(g, "salg") ? 0.05 : 0);
  // Konsernforskningen (B-120)
  const research = (hasResearch(g, "konsernstyring") ? 1.1 : 1) * (hasResearch(g, "gronnkonsern") ? 1.1 : 1);
  // Mesterskapet «Konsernledelse» (B-150)
  return (
    spec.profitPerDay *
    (1 + MODERNIZE_GAIN * p.level) *
    shared *
    research *
    masteryFactor(g, "datterverk") *
    g.market.steelFactor
  );
}

/**
 * Et verk er verdt det det tjener (B-121): omtrent 60 døgns overskudd ved normal stålpris. Da går konsernverdien
 * ikke ned når man kjøper et verk, og alt verket tjener etterpå, er gevinst. Et nytt verk er verdt det det koster.
 */
export const VALUE_DAYS = 60;

export function sisterValue(g: GameState, p: SisterPlant): number {
  // Verdien regnes som om prosjektet er ferdig (B-209): pengene er betalt, så konsernverdien faller ikke imens
  p = plannedPlant(p);
  const steel = g.market?.steelFactor || 1;
  // Uten mesterskapet (B-150): ellers hopper konsernverdien når man kjøper mange nivåer på en gang, og juksesperren
  // flagger det. Mesterskapet gir mer overskudd, og det kommer inn døgn for døgn.
  return (sisterProfit(g, p) / steel / masteryFactor(g, "datterverk")) * VALUE_DAYS;
}

// ------------------------------------------------------------------ //
// Utbytte og konsernkostnader (B-181)
// ------------------------------------------------------------------ //
/**
 * Et datterverk beholder driftsresultatet sitt – et godt drevet verk tjener like godt uansett hvor mange verk eieren
 * har. Men ikke alt kan løftes opp til morselskapet:
 * - en fast del blir igjen i verket til vedlikehold, lokal ledelse og arbeidskapital/reinvestering
 * - andelen av resten som kan løftes opp som utbytte, avtar når konsernet vokser
 * - konsernet har egne kostnader: ledelse per verk, og koordinering, reise og finansiering som øker med antall verk
 * Da er 14 verk fortsatt mye bedre enn 2, men overskuddet til morselskapet vokser ikke lineært.
 * Tallene er målt med `balance.ts --konsern` (3, 6, 10 og 14 moderniserte verk). Samlet i ett objekt så simulatoren
 * kan prøve andre tall.
 */
export const KONSERN_ECONOMY = {
  /** Del av driftsresultatet som blir igjen i verket (vedlikehold, lokal ledelse, arbeidskapital) */
  keepShare: 0.3,
  /** Hvor mye mindre av overskuddet som kan løftes opp for hvert verk nedover i rekken (sortert etter overskudd) */
  upstreamDecay: 0.1,
  /** Konsernledelse per verk og døgn, etter type */
  leadCost: { stalverk: 750_000, storverk: 3_000_000, kompleks: 10_000_000 } as Record<SisterType, number>,
  /** Koordinering, reise og finansiering: ledelseskostnaden per verk øker med så mye per verk utover det første */
  coordGrowth: 0.08,
  /**
   * Imperiebelastning (B-251): netto fra verkene over `loadFrom` per døgn vokser bare med potensen `loadPower` av det
   * verkene gir (0,5 = kvadratroten). 14 fullt moderniserte komplekser gir da ca. 0,24 mrd. per døgn i stedet for over
   * 1 mrd., og hvert nytt verk gir mindre enn det forrige – men alltid litt.
   */
  loadFrom: 50_000_000,
  loadPower: 0.5,
};

/** Netto fra verkene etter imperiebelastningen (B-251): uendret opp til grensen, så avtagende mot et tak */
export function afterEmpireLoad(net: number): number {
  const { loadFrom, loadPower } = KONSERN_ECONOMY;
  if (!(net > loadFrom) || loadFrom <= 0) return net;
  return loadFrom * (net / loadFrom) ** loadPower;
}

/**
 * Andelen av det verket har igjen, som kan løftes opp til morselskapet. Verkene stilles i rekke etter overskudd:
 * det beste gir full andel, det neste litt mindre, og så videre (rank 1 = best). Ledelsen strekker seg tynnere jo
 * flere verk den har, men et nytt verk trekker aldri ned utbyttet fra dem man har fra før.
 */
export function upstreamShare(rank: number): number {
  return 1 / (1 + KONSERN_ECONOMY.upstreamDecay * Math.max(0, rank - 1));
}

/** Utbytte til morselskapet per døgn fra hvert verk, i samme rekkefølge som `plants` (uten havari og rekorder) */
export function dividends(g: GameState, plants: SisterPlant[]): number[] {
  // Et verk som bygges, tjener ingenting ennå (B-209)
  const profits = plants.map((p) => (underConstruction(p) ? 0 : sisterProfit(g, p)));
  const order = profits.map((_, i) => i).sort((a, b) => profits[b] - profits[a] || a - b);
  const out = new Array<number>(plants.length);
  const flagship = 1 + flagshipBonus(g);
  order.forEach((i, r) => (out[i] = profits[i] * (1 - KONSERN_ECONOMY.keepShare) * upstreamShare(r + 1) * flagship));
  return out;
}

/**
 * Flaggskipet (B-209): går hjemmeverket godt, får datterverkene bedre ledelse og mer utbytte – inntil +20 % med
 * omdømme 100 og bare stål som holder kvaliteten de siste sju døgnene. Da lønner det seg fortsatt å drive verket godt.
 */
export const FLAGSHIP_MAX = 0.2;
export function flagshipBonus(g: GameState): number {
  const days = g.history.slice(-7);
  const good = days.reduce((a, d) => a + (d.onGradeT ?? 0), 0);
  const all = days.reduce((a, d) => a + (d.onGradeT ?? 0) + (d.offGradeT ?? 0) + (d.secondT ?? 0), 0);
  const quality = all > 0 ? good / all : 0;
  return FLAGSHIP_MAX * Math.min(1, Math.max(0, g.reputation / 100)) * quality;
}

/** Utbytte til morselskapet per døgn fra ett verk i konsernet */
export function sisterDividend(g: GameState, p: SisterPlant, plants = g.konsern.plants): number {
  const i = plants.indexOf(p);
  return i < 0 ? 0 : dividends(g, plants)[i];
}

/** Konsernkostnader per døgn: ledelse per verk ganger koordinering som øker med antall verk */
export function konsernCosts(plants: SisterPlant[]): number {
  // Verk som bygges, har ingen ledelse ennå (B-209)
  const running = plants.filter((p) => !underConstruction(p));
  if (!running.length) return 0;
  const coord = 1 + KONSERN_ECONOMY.coordGrowth * (running.length - 1);
  return running.reduce((a, p) => a + KONSERN_ECONOMY.leadCost[p.type], 0) * coord;
}

/** Netto til morselskapet per døgn med disse verkene i drift: utbytte minus konsernkostnader og imperiebelastning */
export function konsernNetFor(g: GameState, plants: SisterPlant[]): number {
  return afterEmpireLoad(dividends(g, plants).reduce((a, b) => a + b, 0) - konsernCosts(plants));
}

/** Imperiebelastningen per døgn (B-251): det som går bort fordi konsernet er stort, gitt utbytte og kostnader */
export function empireLoad(dividend: number, costs: number): number {
  const net = dividend - costs;
  return net - afterEmpireLoad(net);
}

/** Verdien av datterverkene til sammen */
export function konsernValue(g: GameState): number {
  return (g.konsern?.plants ?? []).reduce((a, p) => a + sisterValue(g, p), 0);
}

/** Egenkapital (kasse minus lån) pluss datterverkene. Det som er betalt ut til eierne (B-303), teller ikke */
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

function plantOf(type: SisterType, level: number, id = -1): SisterPlant {
  return { id, type, name: "", level, boughtDay: 0, downUntilDay: 0 };
}

/** Hvor mye mer morselskapet får per døgn hvis verkene byttes med disse (B-181): utbytte minus konsernkostnader */
function netGain(g: GameState, next: SisterPlant[]): number {
  return konsernNetFor(g, next) - konsernNetFor(g, g.konsern.plants);
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
  /** Ekte timer før det er ferdig (B-209); 0 for det som virker med én gang */
  hours: number;
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
    gain: netGain(g, [...k.plants, plantOf("stalverk", 0)]),
    blocked: full ? `Konsernet er fullt (${maxSisters(g)} datterverk) – bygg ut eller moderniser i stedet` : null,
    hours: BUILD_HOURS.stalverk,
    run: (gg) => buySister(gg, "stalverk"),
  });
  add({
    key: "kjop-storverk",
    title: "Kjøp et storverk",
    price: sisterPrice(g, "storverk"),
    gain: netGain(g, [...k.plants, plantOf("storverk", 0)]),
    blocked: full
      ? `Konsernet er fullt (${maxSisters(g)} datterverk) – bygg ut et stålverk til storverk i stedet`
      : !hasStalverk
        ? "Kjøp et stålverk først – konsernet må lære å drive et verk før det tar på seg et storverk"
        : null,
    hours: BUILD_HOURS.storverk,
    run: (gg) => buySister(gg, "storverk"),
  });
  // Stålkomplekset åpnes med tittelen Stålfyrste (B-150); før det vises det ikke
  if (kompleksOpen(g))
    add({
      key: "kjop-kompleks",
      title: "Kjøp et stålkompleks",
      price: sisterPrice(g, "kompleks"),
      gain: netGain(g, [...k.plants, plantOf("kompleks", 0)]),
      blocked: full
        ? `Konsernet er fullt (${maxSisters(g)} datterverk) – bytt et lite verk mot komplekset under «Dine verk»`
        : null,
      hours: BUILD_HOURS.kompleks,
      run: (gg) => buySister(gg, "kompleks"),
    });
  // Felles funksjoner: 5 % mer i alle datterverkene, og litt hjemme. Netto etter imperiebelastningen (B-251)
  const sisters = dividends(g, k.plants).reduce((a, b) => a + b, 0);
  const sharedNow = 1 + (hasShared(g, "innkjop") ? 0.05 : 0) + (hasShared(g, "salg") ? 0.05 : 0);
  const leadCosts = konsernCosts(k.plants);
  const sisterGain = Math.max(
    0,
    afterEmpireLoad((sisters * (sharedNow + 0.05)) / sharedNow - leadCosts) - afterEmpireLoad(sisters - leadCosts),
  );
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
      hours: 0,
      run: (gg) => buyShared(gg, id),
    });
  }
  for (const p of k.plants) {
    // Ett prosjekt om gangen per verk (B-209): mens det bygges, kan verket ikke bygges ut, moderniseres eller byttes
    if (p.project) continue;
    // Når konsernet er fullt, er et stålkompleks i stedet for et lite verk det som gir mest (B-170): det tjener like
    // mye som tre storverk, men tar bare én plass
    if (full && kompleksOpen(g) && p.type !== "kompleks")
      add({
        key: `bytt-${p.id}`,
        title: `Selg ${p.name} og kjøp et stålkompleks`,
        price: Math.max(0, sisterPrice(g, "kompleks") - sisterValue(g, p)),
        gain: netGain(
          g,
          k.plants.map((x) => (x === p ? plantOf("kompleks", 0, x.id) : x)),
        ),
        blocked: null,
        hours: BUILD_HOURS.kompleks,
        run: (gg) => swapForKompleks(gg, p.id),
      });
    if (p.type === "stalverk")
      add({
        key: `bygg-${p.id}`,
        title: `Bygg ut ${p.name} til storverk`,
        price: upgradeCost(g),
        gain: netGain(
          g,
          k.plants.map((x) => (x === p ? plantOf("storverk", 0, x.id) : x)),
        ),
        blocked: null,
        hours: UPGRADE_HOURS,
        run: (gg) => upgradeSister(gg, p.id),
      });
    if (p.level < modernizeMax(g))
      add({
        key: `mod-${p.id}`,
        title: `Moderniser ${p.name}`,
        price: modernizeCost(p, g),
        gain: netGain(
          g,
          k.plants.map((x) => (x === p ? plantOf(p.type, p.level + 1, x.id) : x)),
        ),
        blocked: null,
        hours: MODERNIZE_HOURS,
        run: (gg) => modernizeSister(gg, p.id),
      });
  }
  return out;
}

/** Kjøp i konsernet som ikke er sperret og som kassa rekker til nå – tallet på Konsern i menyen og på Utvid (B-144, B-226) */
export function konsernReady(g: GameState): number {
  if (!g.konsern.unlocked) return 0;
  return konsernOptions(g).filter((o) => !o.blocked && g.cash >= o.price).length;
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
      ? "Storverket er ferdig bygget! Nå kan du bygge et konsern med flere verk – se Konsern i menyen."
      : `Egenkapitalen har passert ${fmtKr(KONSERN_UNLOCK_EQUITY)}! Nå kan du bygge et konsern med flere verk – se Konsern i menyen. Nye prosjekter venter under Forskning.`,
    "good",
  );
}

export function buySister(g: GameState, type: SisterType): { ok: boolean; message: string } {
  const spec = SISTER_TYPES[type];
  if (!g.konsern.unlocked) return { ok: false, message: "Konsernet er ikke åpnet ennå." };
  if (g.konsern.plants.length >= maxSisters(g)) return { ok: false, message: `Høyst ${maxSisters(g)} datterverk.` };
  if (type === "kompleks" && !kompleksOpen(g))
    return { ok: false, message: "Stålkomplekser åpnes med tittelen Stålfyrste (konsernverdi 50 mrd.)." };
  if (type === "storverk" && !g.konsern.plants.some((p) => p.type === "stalverk"))
    return { ok: false, message: "Kjøp et stålverk først – konsernet må lære å drive et verk til." };
  const price = sisterPrice(g, type);
  if (g.cash < price) return { ok: false, message: "For lite penger" };
  addCost(g, "investering", price);
  const used = new Set(g.konsern.plants.map((p) => p.name));
  const name = SISTER_NAMES.find((x) => !used.has(x)) ?? `Verk nr. ${g.konsern.plants.length + 2}`;
  g.konsern.plants.push({
    id: g.konsern.nextId++,
    type,
    name,
    level: 0,
    boughtDay: day(g),
    downUntilDay: 0,
    project: startProject("bygg", BUILD_HOURS[type]),
  });
  log(
    g,
    `Konsernet har kjøpt ${name}, et ${spec.name.toLowerCase()}, for ${fmtKr(price)}. Byggingen tar ${BUILD_HOURS[type]} timer (ekte tid, uansett spillfart). Deretter gir det ca. ${fmtKr(profitOf(g, type, 0))} i overskudd per døgn.`,
    "good",
  );
  return { ok: true, message: `${name} er kjøpt. Ferdig bygget om ${BUILD_HOURS[type]} timer.` };
}

/** Selger et datterverk for det det er verdt (B-121), f.eks. for å få råd til et storverk */
export function sellSister(g: GameState, id: number): { ok: boolean; message: string } {
  const p = g.konsern.plants.find((x) => x.id === id);
  if (!p) return { ok: false, message: "Fant ikke verket." };
  const value = sisterValue(g, p);
  g.konsern.plants = g.konsern.plants.filter((x) => x.id !== id);
  addIncome(g, "konsern", value);
  log(g, `Konsernet har solgt ${p.name} for ${fmtKr(value)}.`, "info");
  return { ok: true, message: `${p.name} er solgt.` };
}

/** Selger et lite verk og kjøper et stålkompleks på plassen (B-170). Kassa må rekke før noe selges */
export function swapForKompleks(g: GameState, id: number): { ok: boolean; message: string } {
  const p = g.konsern.plants.find((x) => x.id === id);
  if (!p || p.type === "kompleks") return { ok: false, message: "Fant ikke verket." };
  if (!kompleksOpen(g)) return buySister(g, "kompleks");
  if (g.cash + sisterValue(g, p) < sisterPrice(g, "kompleks")) return { ok: false, message: "For lite penger" };
  sellSister(g, id);
  return buySister(g, "kompleks");
}

/** Bygger ut et stålverk til et storverk (B-119) */
export function upgradeSister(g: GameState, id: number): { ok: boolean; message: string } {
  const p = g.konsern.plants.find((x) => x.id === id);
  if (!p || p.type !== "stalverk") return { ok: false, message: "Bare et stålverk kan bygges ut til storverk." };
  if (p.project) return { ok: false, message: `${projectLabel(p)} – vent til det er ferdig.` };
  const cost = upgradeCost(g);
  if (g.cash < cost) return { ok: false, message: "For lite penger" };
  addCost(g, "investering", cost);
  p.project = startProject("utbygging", UPGRADE_HOURS);
  log(
    g,
    `${p.name} bygges ut til storverk. Det tar ${UPGRADE_HOURS} timer (ekte tid), og verket går som før imens. Moderniseringen starter på nytt.`,
    "good",
  );
  return { ok: true, message: `${p.name} bygges ut. Ferdig om ${UPGRADE_HOURS} timer.` };
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
  if (p.level >= modernizeMax(g)) return { ok: false, message: "Verket er fullt modernisert." };
  if (p.project) return { ok: false, message: `${projectLabel(p)} – vent til det er ferdig.` };
  const cost = modernizeCost(p, g);
  if (g.cash < cost) return { ok: false, message: "For lite penger" };
  addCost(g, "investering", cost);
  p.project = startProject("modernisering", MODERNIZE_HOURS);
  log(
    g,
    `${p.name} moderniseres til trinn ${p.level + 1}. Det tar ${MODERNIZE_HOURS} timer (ekte tid), og verket går som før imens.`,
    "good",
  );
  return { ok: true, message: `Moderniseringen er i gang. Ferdig om ${MODERNIZE_HOURS} timer.` };
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

/**
 * Tonn per døgn salgsdirektøren regner med: det dårligste av de siste sju døgnene med produksjon. Med salgsteam
 * (B-172) snittet av dem.
 */
export function directorDailyT(g: GameState, stats: ReturnType<typeof computePlantStats>): number {
  const recent = g.history
    .slice(-7)
    .map((d) => d.producedT)
    .filter((t) => t > 0);
  const typical = recent.length
    ? directorLevel(g) >= 1
      ? recent.reduce((a, b) => a + b, 0) / recent.length
      : Math.min(...recent)
    : stats.dailyProductT * 0.6;
  return Math.min(realisticDailyT(g, stats), typical);
}
/**
 * Andelen av valseverkets kapasitet salgsdirektøren regner med (B-240). Valseverket får emnene sammen med emneordrene og
 * står av og til, så det valser ikke alt det kan: på et fullt storverk ble det 60–70 % av kapasiteten.
 */
export const ROLLING_PLAN_SHARE = 0.7;
/** Hvor mye av tida til fristen salgsdirektøren bruker, per oppgradering (B-172; 0,85 → 0,75 i B-228) */
const DIRECTOR_MARGINS = [DIRECTOR_MARGIN, 0.75, 0.75, 0.75];

/** Oppgraderinger av salgsdirektøren (B-172): brukeren så at den av og til ikke hadde noen ordrer */
export const DIRECTOR_UPGRADES: { name: string; price: number; text: string }[] = [
  {
    name: "Salgsteam",
    price: 500_000_000,
    text: "Regner med et vanlig døgn i stedet for det dårligste, trenger mindre luft til fristen og tar også ordrer der resepten er nær grensen.",
  },
  {
    name: "Kundenettverk",
    price: 2_000_000_000,
    text: "Skaffer flere forespørsler selv når ordrekøen er kort, så verket ikke står uten ordrer.",
  },
  {
    name: "Eksportkontor",
    price: 8_000_000_000,
    text: "Forhandler 5 % bedre pris på kontraktene den signerer, og tar rammeavtaler opp til 70 % av ukeproduksjonen.",
  },
];

export function directorLevel(g: GameState): number {
  return g.konsern?.director?.level ?? 0;
}

/** Neste oppgradering av salgsdirektøren, eller null når alt er kjøpt */
export function nextDirectorUpgrade(g: GameState): (typeof DIRECTOR_UPGRADES)[number] | null {
  return g.konsern?.director ? (DIRECTOR_UPGRADES[directorLevel(g)] ?? null) : null;
}

export function upgradeDirector(g: GameState): { ok: boolean; message: string } {
  const d = g.konsern.director;
  if (!d) return { ok: false, message: "Du har ingen salgsdirektør." };
  const up = nextDirectorUpgrade(g);
  if (!up) return { ok: false, message: "Salgsdirektøren har alt." };
  if (g.cash < up.price) return { ok: false, message: "For lite penger" };
  addCost(g, "investering", up.price);
  d.level = directorLevel(g) + 1;
  log(g, `Salgsdirektøren har fått ${up.name.toLowerCase()}: ${up.text}`, "good");
  return { ok: true, message: `${up.name} er på plass.` };
}

export function hireDirector(g: GameState): { ok: boolean; message: string } {
  if (!g.konsern.unlocked) return { ok: false, message: "Konsernet er ikke åpnet ennå." };
  if (g.konsern.director) return { ok: false, message: "Du har allerede en salgsdirektør." };
  if (g.cash < DIRECTOR_HIRE) return { ok: false, message: "For lite penger" };
  addCost(g, "lonn", DIRECTOR_HIRE);
  g.konsern.director = { hiredDay: day(g), contracts: 0, agreements: 0, agreementsOn: true, active: true, level: 0 };
  log(
    g,
    `Du har ansatt en salgsdirektør (${fmtKr(DIRECTOR_HIRE)} i rekruttering, ${fmtKr(directorPerDay(g))} per døgn). Kontraktene som verket rekker, signeres nå av seg selv.`,
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
  if (!d || !d.active) return;
  const stats = computePlantStats(g);
  if (stats.dailyProductT <= 0) return;
  const following = auto(g, "followQueue");
  const perDay = directorDailyT(g, stats);
  if (perDay <= 0) return;
  const level = directorLevel(g);
  // Kundenettverket skaffer en forespørsel til når ordrekøen er kortere enn to døgns produksjon (B-172)
  if (level >= 2 && committedT(g) < perDay * 2 && chance(g, 0.25)) extraOffer(g, stats);
  const offers = g.contracts
    // Landemerkene tar spilleren selv (B-177): de er en samling, ikke vanlig salg
    .filter((c) => c.status === "tilbud" && !c.landmark)
    .sort((a, b) => b.tonnes * b.pricePerT - a.tonnes * a.pricePerT);
  // Et landemerke som venter på svar, går først i køen når du tar det (B-211): salgsdirektøren holder av plass til det
  const landmarkT = g.contracts.filter((c) => c.status === "tilbud" && c.landmark).reduce((a, c) => a + c.tonnes, 0);
  const margin = DIRECTOR_MARGINS[level] ?? DIRECTOR_MARGIN;
  for (const c of offers) {
    const check = assessOffer(g, stats, c, committedT(g) + landmarkT);
    const recipeOk = check.recipeOk || (check.graderFix && following);
    if (!check.canMake || !recipeOk || check.tight || (check.narrow && level < 1)) continue;
    // Samme regnestykke som på Salg, men med det dårligste døgnet og mer margin
    let needDays = (committedT(g) + landmarkT + agreementLoadUntil(g, c.deadlineDay) + c.tonnes) / perDay;
    // Armering må også rekkes av valseverket (B-217)
    if (c.product === "armering" && stats.rolledDailyT > 0) {
      const load = committedT(g, "armering") + agreementLoadUntil(g, c.deadlineDay, "armering") + c.tonnes;
      needDays = Math.max(needDays, load / Math.min(perDay, productCapT(stats, "armering")));
    }
    if (needDays > check.days * margin) continue;
    // …og ingen kontrakt i køen skal bli for sen (B-240): med frist-sortering går en kontrakt med kort frist foran de
    // andre, og da ble eldre kontrakter for sene selv om den nye rakk
    const extra = [{ t: c.tonnes, deadline: c.deadlineDay, product: c.product, customer: c.customer }];
    if (queueFit(g, perDay, extra, { front: landmarkT }).worst > margin) continue;
    // Valseverket får emnene sammen med emneordrene, så direktøren regner med ROLLING_PLAN_SHARE av kapasiteten der
    if (c.product === "armering" && stats.rolledDailyT > 0) {
      const rollPerDay = Math.min(perDay, productCapT(stats, "armering")) * ROLLING_PLAN_SHARE;
      if (queueFit(g, rollPerDay, extra, { product: "armering" }).worst > margin) continue;
    }
    // Eksportkontoret forhandler bedre pris (B-172)
    if (level >= 3) c.pricePerT = Math.round(c.pricePerT * 1.05);
    if (acceptContract(g, c.id, "Salgsdirektøren").ok) d.contracts += 1;
  }
  if (!d.agreementsOn) return;
  const share = level >= 3 ? 0.7 : DIRECTOR_AGREEMENT_SHARE;
  const perWeek = perDay * 7;
  for (const a of g.agreements.filter((x) => x.status === "tilbud")) {
    const active = g.agreements.filter((x) => x.status === "aktiv");
    const used = active.reduce((t, x) => t + x.weeklyT, 0);
    const canMake = stats.products.includes(a.product);
    const recipeOk = recipeEstimate(g, a.grade, stats, gradeRecipe(g, a.grade)).grades.includes(a.grade);
    if (!canMake || !recipeOk || perWeek <= 0 || (used + a.weeklyT) / perWeek > share) continue;
    // Første uke legges i køen med én gang, med frist om seks døgn: den må passe med kontraktene som alt er der (B-240)
    const weeks = agreementWeeks(a, day(g));
    if (queueFit(g, perDay, weeks).worst > margin) continue;
    // Armering: samme andel av det valseverket rekker (B-217)
    if (a.product === "armering" && stats.rolledDailyT > 0) {
      const usedArm = active.filter((x) => x.product === "armering").reduce((t, x) => t + x.weeklyT, 0);
      const rollPerDay = Math.min(perDay, productCapT(stats, "armering")) * ROLLING_PLAN_SHARE;
      if ((usedArm + a.weeklyT) / (rollPerDay * 7) > share) continue;
      if (queueFit(g, rollPerDay, weeks, { product: "armering" }).worst > margin) continue;
    }
    if (acceptAgreement(g, a.id, "Salgsdirektøren").ok) d.agreements += 1;
  }
}

/** Hvert døgn: lønna til salgsdirektøren, overskuddet fra datterverkene og av og til en stans (B-106, B-117) */
export function konsernDay(g: GameState): void {
  if (g.konsern.director) addCost(g, "lonn", directorPerDay(g));
  // Konsernledelse, koordinering, reise og finansiering (B-181) – også for verk som står etter et havari
  const costs = konsernCosts(g.konsern.plants);
  if (costs > 0) addCost(g, "konsern", costs);
  const today = day(g);
  const div = dividends(g, g.konsern.plants);
  let paid = 0;
  g.konsern.plants.forEach((p, i) => {
    if (p.downUntilDay > today || underConstruction(p)) return;
    const maintained = hasResearch(g, "fellesvedlikehold");
    if (chance(g, 0.012 * (maintained ? 0.5 : 1))) {
      const days = maintained ? randInt(g, 1, 3) : randInt(g, 2, 5);
      p.downUntilDay = today + days;
      log(g, `${p.name} står i ${days} døgn etter et havari. Ingen overskudd derfra imens.`, "event");
      return;
    }
    // Av og til går det ekstra godt: dobbelt overskudd det døgnet (B-119)
    const record = chance(g, 0.015);
    // Utbytte til morselskapet (B-181): verket beholder vedlikehold, ledelse og reserve, og andelen avtar nedover i rekken
    addIncome(g, "konsern", div[i] * (record ? 2 : 1));
    paid += div[i] * (record ? 2 : 1);
    // Kunnskapsdeling: hjemmeverket lærer av datterverkene som går (B-120)
    if (hasResearch(g, "kunnskapsdeling")) awardPoints(g, 1);
    if (record) log(g, `${p.name} satte produksjonsrekord og ga dobbelt utbytte i dag: ${fmtKr(div[i] * 2)}.`, "good");
  });
  // Imperiebelastningen (B-251) bokføres sammen med konsernkostnadene
  const load = empireLoad(paid, costs);
  if (load > 0) addCost(g, "konsern", load);
}
