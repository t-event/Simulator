/**
 * Utfordringer på storverket (B-090, B-232): noe å strekke seg etter når alt er kjøpt og forsket fram.
 *
 * B-232: Utfordringene er serier i trinn («Rekorddøgn I–V»). Bare trinnet du står på, er aktivt; når det er nådd,
 * starter neste med et høyere mål. Serier som teller hendelser (rene døgn, perfekte charger …), teller fra trinnet
 * startet, så hvert trinn krever nytt arbeid. Serier som måler en rekord (beste døgn, kWh per tonn …), måles mot det
 * du har klart. Tilstanden lagres i g.missions: trinn 1 har den gamle id-en («u-rekord»), de neste «u-rekord-2» osv.,
 * så gamle lagringer trenger ingen migrering.
 */
import { addIncome, adjustReputation, awardPoints, fmtKr, log } from "./engine";
import { staffing } from "./plant";
import { RESEARCH } from "./research";
import type { DayFinance, GameState } from "./types";

export interface Challenge {
  id: string;
  /** Serien utfordringen hører til */
  family: string;
  /** Trinn i serien, fra 1 */
  tier: number;
  icon: string;
  title: string;
  /** Kort forklaring på hvordan man klarer den */
  how: string;
  goal: number;
  /** Tellerverdi nå. Fremdrift = verdi − verdien da trinnet startet, eller verdien selv når absolute */
  value: (g: GameState) => number;
  absolute?: boolean;
  /** Lavere er bedre (f.eks. kWh per tonn) */
  lower?: boolean;
  unit?: string;
  /** Desimaler i tallene (f.eks. kundevurdering 9,2) */
  decimals?: number;
  fp: number;
  cash: number;
  rep?: number;
}

export interface ChallengeFamily {
  id: string;
  icon: string;
  name: string;
  how: string;
  /** Målene for hvert trinn */
  goals: number[];
  /** Hva målet på et trinn er, med vanlige ord */
  goalText: (goal: number) => string;
  value: (g: GameState) => number;
  absolute?: boolean;
  lower?: boolean;
  unit?: string;
  decimals?: number;
  /** Fagpoeng for første trinn; hvert trinn gir mer (se tierFp) */
  fp: number;
  /** Kroner for første trinn; dobles per trinn */
  cash: number;
  /** Omdømme ved siste trinn */
  rep?: number;
}

/** Nivået utfordringene starter på: storverket */
export const CHALLENGE_STAGE = 4;

const counter = (key: string) => (g: GameState) => g.counters[key] ?? 0;
const bestDay = (g: GameState) => Math.max(0, ...g.history.map((d) => d.producedT));
/** Beste døgn med minst 500 t, målt i kWh per tonn (0 hvis ingen) */
const bestKwh = (g: GameState) => {
  const days = g.history.filter((d) => d.producedT >= 500 && (d.kwh ?? 0) > 0).map((d) => d.kwh! / d.producedT);
  return days.length ? Math.min(...days) : 0;
};
const sum = (r: Partial<Record<string, number>>) => Object.values(r).reduce<number>((a, v) => a + (v ?? 0), 0);
/** Døgnresultat uten investeringer (kjøp av utstyr er ikke tap) */
const dayProfit = (d: DayFinance) => sum(d.income) - sum(d.costs) + (d.costs.investering ?? 0);
const bestProfit = (g: GameState) => Math.max(0, ...g.history.map(dayProfit));
/** Snittet av de siste 20 kundevurderingene; 0 før det finnes 20 */
const ratingAvg = (g: GameState) => (g.ratings.length >= 20 ? g.ratings.slice(-20).reduce((a, b) => a + b, 0) / 20 : 0);
const nf = (n: number, d = 0) =>
  n.toLocaleString("nb-NO", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/ /g, " ");
/** Kroner i måltekstene. Lages når fila lastes, så den kan ikke bruke fmtKr fra motoren (sirkulær import) */
const kroner = (n: number) => (n >= 1e9 ? `${nf(n / 1e9, n % 1e9 ? 1 : 0)} mrd. kr` : `${nf(n / 1e6)} mill. kr`);
const tonnes = (n: number) => (n >= 1e6 ? `${nf(n / 1e6, n % 1e6 ? 1 : 0)} mill. t` : `${nf(n)} t`);

export const CHALLENGE_FAMILIES: ChallengeFamily[] = [
  {
    id: "u-rekord",
    icon: "📈",
    name: "Rekorddøgn",
    how: "Alle ovnene i gang døgnet rundt, nok støping og fulle skift.",
    goals: [4500, 10_000, 20_000, 30_000, 40_000],
    goalText: (n) => `${tonnes(n)} stål på ett døgn`,
    value: bestDay,
    absolute: true,
    unit: "t",
    fp: 60,
    cash: 10_000_000,
  },
  {
    id: "u-strom",
    icon: "⚡",
    name: "Strømgjerrig",
    how: "Conveyor, transformator, varmegjenvinning, skumslagg – og god kjøring i kontrollrommet.",
    goals: [420, 380, 340, 300, 270, 250],
    goalText: (n) => `et døgn under ${nf(n)} kWh per tonn`,
    value: bestKwh,
    absolute: true,
    lower: true,
    unit: "kWh/t",
    fp: 60,
    cash: 8_000_000,
  },
  {
    id: "u-rene",
    icon: "✨",
    name: "Rent stål",
    how: "Døgn der alt stålet holder kvaliteten: riktig resept, måling av skrapet og godt folk.",
    goals: [30, 60, 120, 250, 500],
    goalText: (n) => `${nf(n)} døgn der alt stålet holder kvaliteten`,
    value: counter("rene_dogn"),
    unit: "døgn",
    fp: 50,
    cash: 6_000_000,
  },
  {
    id: "u-perfekt",
    icon: "⭐",
    name: "Perfekt kjøring",
    how: "Ta styringen selv i kontrollrommet og få 5 stjerner.",
    goals: [3, 10, 25, 60],
    goalText: (n) => `${nf(n)} perfekte charger i kontrollrommet`,
    value: counter("perfekte_charger"),
    unit: "charger",
    fp: 60,
    cash: 5_000_000,
  },
  {
    id: "u-avtaler",
    icon: "📑",
    name: "Pålitelig partner",
    how: "Lever hver uke i en rammeavtale i tide, så får du bonusen.",
    goals: [3, 8, 20, 50],
    goalText: (n) => `${nf(n)} rammeavtaler fullført med bonus`,
    value: counter("avtaler_bonus"),
    unit: "avtaler",
    fp: 50,
    cash: 8_000_000,
  },
  {
    id: "u-omdomme",
    icon: "🌟",
    name: "Best i bransjen",
    how: "Lever i tide, uten reklamasjoner, og fullfør rammeavtaler.",
    goals: [100],
    goalText: () => "omdømme 100",
    value: (g) => g.reputation,
    absolute: true,
    fp: 40,
    cash: 5_000_000,
  },
  {
    id: "u-skift",
    icon: "👷",
    name: "Døgnet rundt",
    how: "Ansett til fem fulle skiftlag under Folk.",
    goals: [5],
    goalText: () => "kjør 5-skift",
    value: (g) => staffing(g, true).crews,
    absolute: true,
    unit: "lag",
    fp: 40,
    cash: 3_000_000,
  },
  {
    id: "u-forskning",
    icon: "🔬",
    name: "Forskningssjef",
    how: "Alle prosjektene under Forskning.",
    goals: [RESEARCH.length],
    goalText: () => "forsk fram alt",
    value: (g) => g.researched.filter((id) => RESEARCH.some((r) => r.id === id)).length,
    absolute: true,
    unit: "prosjekter",
    fp: 0,
    cash: 20_000_000,
    rep: 5,
  },
  {
    id: "u-lever",
    icon: "🤝",
    name: "Leveransemaskin",
    how: "Lever kontrakter – egne og dem salgsdirektøren signerer.",
    goals: [50, 150, 400, 1000, 2500],
    goalText: (n) => `lever ${nf(n)} kontrakter`,
    value: counter("leveranser"),
    unit: "kontrakter",
    fp: 40,
    cash: 5_000_000,
  },
  {
    id: "u-tiavti",
    icon: "💯",
    name: "Fornøyde kunder",
    how: "Lever god kvalitet med god margin til kravene, og lever i tide.",
    goals: [10, 50, 200, 750],
    goalText: (n) => `${nf(n)} kunder som gir 10 av 10`,
    value: counter("tiavti"),
    unit: "kunder",
    fp: 50,
    cash: 5_000_000,
  },
  {
    id: "u-vurdering",
    icon: "🏅",
    name: "Kundenes førstevalg",
    how: "Snittet av de siste 20 kundevurderingene. Lever i tide og med god margin til kravene.",
    goals: [8, 8.5, 9, 9.5, 9.8],
    goalText: (n) => `snitt ${nf(n, 1)} av 10 fra kundene`,
    value: ratingAvg,
    absolute: true,
    unit: "i snitt",
    decimals: 1,
    fp: 50,
    cash: 5_000_000,
  },
  {
    id: "u-stope",
    icon: "🧊",
    name: "Feilfri støping",
    how: "Døgn med under 3 % støpefeil: godt vedlikehold, flinke støpere og riktig temperatur.",
    goals: [30, 100, 250, 500],
    goalText: (n) => `${nf(n)} døgn med nesten ingen støpefeil`,
    value: counter("fine_stopedogn"),
    unit: "døgn",
    fp: 40,
    cash: 5_000_000,
  },
  {
    id: "u-billig",
    icon: "💡",
    name: "Strømsmart",
    how: "Døgn med snittpris under 0,70 kr/kWh: kjør når strømmen er billig, og velg riktig strømavtale.",
    goals: [20, 60, 150, 300],
    goalText: (n) => `${nf(n)} døgn med billig strøm`,
    value: counter("billig_strom"),
    unit: "døgn",
    fp: 40,
    cash: 5_000_000,
  },
  {
    id: "u-tonn",
    icon: "⚖️",
    name: "Tonnasje",
    how: "Alt stålet verket lager, teller.",
    goals: [250_000, 1_000_000, 3_000_000, 10_000_000, 25_000_000],
    goalText: (n) => `produser ${tonnes(n)} stål`,
    value: (g) => g.totals.producedT,
    unit: "t",
    fp: 40,
    cash: 10_000_000,
  },
  {
    id: "u-charger",
    icon: "🔥",
    name: "Smelteverk",
    how: "Alle chargene i alle ovnene teller.",
    goals: [2000, 10_000, 30_000, 75_000],
    goalText: (n) => `smelt ${nf(n)} charger`,
    value: (g) => g.totals.heats,
    unit: "charger",
    fp: 40,
    cash: 5_000_000,
  },
  {
    id: "u-kontroll",
    icon: "🎮",
    name: "Mesterkjører",
    how: "Beste poengsum i kontrollrommet: strøm og oksygen i riktig rekkefølge, og rask tapping.",
    goals: [3500, 4000, 4300, 4500],
    goalText: (n) => `${nf(n)} poeng i kontrollrommet`,
    value: (g) => g.controlBest ?? 0,
    absolute: true,
    unit: "poeng",
    fp: 50,
    cash: 5_000_000,
  },
  {
    id: "u-gode",
    icon: "🎛️",
    name: "Stødig hånd",
    how: "Charger du kjører selv med minst 4 stjerner.",
    goals: [5, 20, 60, 150],
    goalText: (n) => `${nf(n)} charger med 4 stjerner eller mer`,
    value: counter("gode_charger"),
    unit: "charger",
    fp: 40,
    cash: 5_000_000,
  },
  {
    id: "u-overskudd",
    icon: "💹",
    name: "Gullgruve",
    how: "Beste døgn: inntekter minus kostnader (kjøp av utstyr teller ikke).",
    goals: [50_000_000, 250_000_000, 1_000_000_000, 3_000_000_000, 6_000_000_000],
    goalText: (n) => `${kroner(n)} i overskudd på ett døgn`,
    value: bestProfit,
    absolute: true,
    unit: "kr",
    fp: 50,
    cash: 0,
  },
  {
    id: "u-fagbrev",
    icon: "🎓",
    name: "Lærebedrift",
    how: "Folk som tar fagbrev: gi dem kurs og la dem jobbe lenge nok.",
    goals: [5, 15, 40],
    goalText: (n) => `${nf(n)} ansatte som tar fagbrev`,
    value: counter("fagbrev"),
    unit: "fagbrev",
    fp: 40,
    cash: 5_000_000,
  },
];

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/** Fagpoeng per trinn: første trinn som serien sier, så stigende */
function tierFp(base: number, tier: number): number {
  return base > 0 ? Math.round(base * (1 + 0.6 * (tier - 1))) : 0;
}

export const CHALLENGES: Challenge[] = CHALLENGE_FAMILIES.flatMap((f) =>
  f.goals.map((goal, i) => {
    const tier = i + 1;
    return {
      id: tier === 1 ? f.id : `${f.id}-${tier}`,
      family: f.id,
      tier,
      icon: f.icon,
      title: `${f.name}${f.goals.length > 1 ? ` ${ROMAN[i]}` : ""}: ${f.goalText(goal)}`,
      how: f.how,
      goal,
      value: f.value,
      absolute: f.absolute,
      lower: f.lower,
      unit: f.unit,
      decimals: f.decimals,
      fp: tierFp(f.fp, tier),
      cash: f.cash * 2 ** i,
      rep: tier === f.goals.length ? f.rep : undefined,
    };
  }),
);

const BY_FAMILY = new Map<string, Challenge[]>(CHALLENGE_FAMILIES.map((f) => [f.id, []]));
for (const c of CHALLENGES) BY_FAMILY.get(c.family)!.push(c);

/** Trinnene i en serie */
export function familyTiers(family: string): Challenge[] {
  return BY_FAMILY.get(family) ?? [];
}

/** Trinnet du står på i serien, eller null når alle er klart */
export function currentChallenge(g: GameState, family: string): Challenge | null {
  return familyTiers(family).find((c) => !g.missions[c.id]?.done) ?? null;
}

/** Trinn klart i en serie */
export function familyDone(g: GameState, family: string): number {
  return familyTiers(family).filter((c) => g.missions[c.id]?.done).length;
}

export function challengeProgress(g: GameState, c: Challenge): number {
  const st = g.missions[c.id];
  if (st?.done) return c.goal;
  const v = c.value(g);
  if (c.lower) return v;
  if (!st) return c.absolute ? Math.min(c.goal, v) : 0;
  return Math.min(c.goal, c.absolute ? v : v - st.base);
}

/** 0–1, for fremdriftsstolpen */
export function challengeShare(g: GameState, c: Challenge): number {
  const st = g.missions[c.id];
  if (st?.done) return 1;
  const p = challengeProgress(g, c);
  if (c.lower) return p > 0 ? Math.min(1, c.goal / p) : 0;
  return c.goal > 0 ? Math.max(0, p / c.goal) : 0;
}

function reached(g: GameState, c: Challenge): boolean {
  const p = challengeProgress(g, c);
  return c.lower ? p > 0 && p <= c.goal : p >= c.goal;
}

function rewardText(c: Challenge): string {
  return [c.fp ? `+${c.fp} fagpoeng` : "", c.cash ? fmtKr(c.cash) : "", c.rep ? `omdømme +${c.rep}` : ""]
    .filter(Boolean)
    .join(" og ");
}

/**
 * Starter trinnet du står på i hver serie og deler ut belønning for dem som er nådd. En rekord som alt holder flere
 * trinn, gir alle på en gang; mange på en gang gir én linje i loggen.
 */
export function checkChallenges(g: GameState): void {
  if (g.stage < CHALLENGE_STAGE) return;
  const fresh: Challenge[] = [];
  for (const f of CHALLENGE_FAMILIES) {
    for (;;) {
      const c = currentChallenge(g, f.id);
      if (!c) break;
      const st = g.missions[c.id];
      if (!st) {
        g.missions[c.id] = { base: c.absolute ? 0 : c.value(g), done: false };
        if (!c.absolute && !c.lower) break;
      }
      if (!reached(g, c)) break;
      g.missions[c.id].done = true;
      if (c.fp) awardPoints(g, c.fp);
      if (c.cash) addIncome(g, "annet", c.cash);
      if (c.rep) adjustReputation(g, c.rep);
      fresh.push(c);
    }
  }
  if (fresh.length === 0) return;
  if (fresh.length <= 2) for (const c of fresh) log(g, `Utfordring fullført: ${c.title}! ${rewardText(c)}.`, "good");
  else {
    const fp = fresh.reduce((a, c) => a + c.fp, 0);
    log(g, `${fresh.length} utfordringer fullført! +${fp} fagpoeng. Se dem under Mål → Merker.`, "good");
  }
}

export function challengesDone(g: GameState): number {
  return CHALLENGES.filter((c) => g.missions[c.id]?.done).length;
}
