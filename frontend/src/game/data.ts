/**
 * Datatabeller for spillet: skrap, kvaliteter, produkter, utstyr, roller og kunder.
 *
 * Tallene er oppfunnet for spillet. De er satt slik at retningen og
 * størrelsesordenen stemmer med vanlig stålverksdrift (energi per tonn,
 * utbytte, hvilke elementer som kan fjernes hvor), men de beskriver ikke noe
 * bestemt anlegg.
 */
import type { Crew, GradeId, ProductId, RoleId, ScrapId } from "./types";

// ------------------------------------------------------------------ //
// Tid
// ------------------------------------------------------------------ //
export const MIN_PER_DAY = 24 * 60;
/** Spillminutter per sekund ved 1x: ett døgn tar to minutter (se B-020) */
export const GAME_MIN_PER_REAL_S = 12;
export const SHIFT_START_HOUR = 6;
export const SPEEDS = [0, 1, 3, 10] as const;

export const START_CASH = 25_000;
export const START_REPUTATION = 0;
/** Så mange døgn på rad under kredittgrensen før banken tar over */
export const BANKRUPTCY_DAYS = 7;
export const LOAN_INTEREST_PER_DAY = 0.0004;
/** Sluttmålet: konsernverdi (egenkapital + datterverk) på 10 mrd. 1 mrd. åpner konsernet (B-106) */
export const WIN_CASH = 10_000_000_000;

// ------------------------------------------------------------------ //
// Skrap
// ------------------------------------------------------------------ //
export interface ScrapType {
  id: ScrapId;
  name: string;
  short: string;
  price: number; // kr/t
  /** Relativt energibehov ved smelting (tungt og kompakt skrap smelter langsommere) */
  energy: number;
  tramp: number;
  p: number;
  c: number;
  /** Andel rust, jord, olje og annet som ikke blir stål */
  dirt: number;
  /** Faren for radioaktive kilder per tonn (skjulte kilder i blandet skrap) */
  radioPerT: number;
  buyable: boolean;
  description: string;
}

export const SCRAP_TYPES: Record<ScrapId, ScrapType> = {
  blandet: {
    id: "blandet",
    name: "Blandet skrap",
    short: "Blandet",
    price: 2500,
    energy: 1.0,
    tramp: 0.3,
    p: 0.03,
    c: 0.15,
    dirt: 0.07,
    radioPerT: 0.00006,
    buyable: true,
    description: "Billig og tilgjengelig, men med mye sporelementer, fosfor og skitt. Kan skjule alt mulig.",
  },
  tungt: {
    id: "tungt",
    name: "Tungt skrap",
    short: "Tungt",
    price: 3100,
    energy: 1.04,
    tramp: 0.16,
    p: 0.02,
    c: 0.2,
    dirt: 0.03,
    radioPerT: 0.00002,
    buyable: true,
    description: "Bjelker, plater og rør. Rimelig rent, men store stykker bruker lengre tid på å smelte.",
  },
  shredder: {
    id: "shredder",
    name: "Shredderskrap",
    short: "Shredder",
    price: 3300,
    energy: 0.97,
    tramp: 0.22,
    p: 0.018,
    c: 0.1,
    dirt: 0.025,
    radioPerT: 0.00004,
    buyable: true,
    description: "Kvernet og magnetsortert. Jevn størrelse og god smelting, men kobber fra ledninger følger med.",
  },
  spon: {
    id: "spon",
    name: "Spon og dreieavfall",
    short: "Spon",
    price: 1700,
    energy: 1.1,
    tramp: 0.35,
    p: 0.035,
    c: 0.3,
    dirt: 0.12,
    radioPerT: 0.00001,
    buyable: true,
    description: "Svært billig, men oljete og luftig. Mye går tapt som slagg og røyk.",
  },
  rent: {
    id: "rent",
    name: "Rent nyskrap",
    short: "Rent",
    price: 4200,
    energy: 0.95,
    tramp: 0.05,
    p: 0.012,
    c: 0.06,
    dirt: 0.01,
    radioPerT: 0,
    buyable: true,
    description: "Stanse- og klippavfall fra industrien. Kjent analyse, lite sporelementer – brukes til å tynne ut.",
  },
  rajern: {
    id: "rajern",
    name: "Råjern",
    short: "Råjern",
    price: 5000,
    energy: 0.88,
    tramp: 0.01,
    p: 0.05,
    c: 4.0,
    dirt: 0.005,
    radioPerT: 0,
    buyable: true,
    description: "Nesten fritt for sporelementer, men med rundt 4 % karbon. Karbonet må brennes bort med oksygen.",
  },
  retur: {
    id: "retur",
    name: "Returskrap",
    short: "Retur",
    price: 0,
    energy: 0.97,
    tramp: 0.15,
    p: 0.02,
    c: 0.2,
    dirt: 0.01,
    radioPerT: 0,
    buyable: false,
    description: "Egne kapp, skoller og vrak. Gratis og kjent, og går rett tilbake i ovnen.",
  },
};

export const SCRAP_IDS = Object.keys(SCRAP_TYPES) as ScrapId[];

// ------------------------------------------------------------------ //
// Kvaliteter og produkter
// ------------------------------------------------------------------ //
export interface GradeSpec {
  id: GradeId;
  name: string;
  cMin: number;
  cMax: number;
  pMax: number;
  trampMax: number;
  /** Prisfaktor mot standard */
  premium: number;
  /** Laveste nivå kundene begynner å spørre etter denne kvaliteten */
  minStage: number;
  description: string;
}

export const GRADES: Record<GradeId, GradeSpec> = {
  enkel: {
    id: "enkel",
    name: "Enkel",
    cMin: 0,
    cMax: 0.8,
    pMax: 0.05,
    trampMax: 0.5,
    premium: 0.9,
    minStage: 0,
    description: "Enkle konstruksjoner og gods uten særlige krav.",
  },
  standard: {
    id: "standard",
    name: "Standard",
    cMin: 0.05,
    cMax: 0.45,
    pMax: 0.04,
    trampMax: 0.3,
    premium: 1.0,
    minStage: 0,
    description: "Vanlig konstruksjonsstål.",
  },
  armering: {
    id: "armering",
    name: "Armering",
    cMin: 0.15,
    cMax: 0.3,
    pMax: 0.045,
    trampMax: 0.4,
    premium: 1.02,
    minStage: 2,
    description: "Armeringsstål tåler en del sporelementer, men karbonet må ligge riktig for sveisbarhet og styrke.",
  },
  lavkarbon: {
    id: "lavkarbon",
    name: "Lavkarbon",
    cMin: 0,
    cMax: 0.08,
    pMax: 0.025,
    trampMax: 0.2,
    premium: 1.12,
    minStage: 2,
    description:
      "Til kaldforming og tråd. Karbonet må være lavt: bruk rent skrap med lite karbon, eller en ovn som brenner karbonet ned med oksygen.",
  },
  hoykarbon: {
    id: "hoykarbon",
    name: "Høykarbon",
    cMin: 0.55,
    cMax: 0.9,
    pMax: 0.03,
    trampMax: 0.15,
    premium: 1.15,
    minStage: 1,
    description: "Fjærer, verktøy og slitedeler. Krever rent skrap og riktig karbon.",
  },
  premium: {
    id: "premium",
    name: "Premium",
    cMin: 0.1,
    cMax: 0.4,
    pMax: 0.02,
    trampMax: 0.1,
    premium: 1.28,
    minStage: 1,
    description: "Krevende kunder med strenge krav til fosfor og sporelementer.",
  },
};

export const GRADE_IDS = Object.keys(GRADES) as GradeId[];

export interface Product {
  id: ProductId;
  name: string;
  price: number; // kr/t, standardkvalitet og normalt marked
  /** Tonn per døgn markedet tar unna på spot før prisen faller */
  spotPerDay: number;
}

export const PRODUCTS: Record<ProductId, Product> = {
  stopegods: { id: "stopegods", name: "Støpegods", price: 13_500, spotPerDay: 2 },
  blokk: { id: "blokk", name: "Blokker", price: 7_400, spotPerDay: 60 },
  emne: { id: "emne", name: "Emner", price: 7_000, spotPerDay: 500 },
  armering: { id: "armering", name: "Armeringsstål", price: 8_300, spotPerDay: 600 },
};

export const SPOT_DISCOUNT = 0.78;

// ------------------------------------------------------------------ //
// Nivåer (bygninger)
// ------------------------------------------------------------------ //
export interface Stage {
  id: number;
  name: string;
  price: number;
  reputation: number;
  staffCap: number;
  yardT: number;
  storeT: number;
  /** Skraphåndtering som trengs per skift */
  scrapCrew: number;
  /** Faste kostnader per døgn: husleie, forsikring, strøm til bygg (se B-018) */
  fixedPerDay: number;
  description: string;
}

/** Nivåene i bestemt form, til tekst som «når du har flyttet til støperiet» */
const STAGE_DEFINITE = ["garasjen", "verkstedet", "støperiet", "stålverket", "storverket"];

/**
 * Et nivå forklart for en ny spiller: «støperiet (nivå 3 av 5)», eller «verkstedet (neste nivå)» når det er
 * nivået rett etter det spilleren står på (B-060).
 */
export function stageRef(stage: number, current?: number): string {
  const name = STAGE_DEFINITE[stage] ?? "neste nivå";
  if (current !== undefined && stage === current + 1) return `${name} (neste nivå)`;
  return `${name} (nivå ${stage + 1} av ${STAGE_DEFINITE.length})`;
}

export const STAGES: Stage[] = [
  {
    id: 0,
    name: "Garasje",
    price: 0,
    reputation: 0,
    staffCap: 0,
    yardT: 6,
    storeT: 4,
    scrapCrew: 0,
    fixedPerDay: 200,
    description: "En kald garasje, en liten induksjonsovn og deg selv.",
  },
  {
    id: 1,
    name: "Verksted",
    price: 80_000,
    reputation: 5,
    staffCap: 4,
    yardT: 40,
    storeT: 30,
    scrapCrew: 0,
    fixedPerDay: 1500,
    description: "Leid verkstedhall med plass til en større induksjonsovn og et par ansatte.",
  },
  {
    id: 2,
    name: "Støperi",
    price: 750_000,
    reputation: 18,
    staffCap: 24,
    yardT: 600,
    storeT: 400,
    scrapCrew: 1,
    fixedPerDay: 8000,
    description: "Egen industritomt med skraplager, kran og plass til skiftarbeid.",
  },
  {
    id: 3,
    name: "Stålverk",
    price: 6_500_000,
    reputation: 40,
    staffCap: 70,
    yardT: 6000,
    storeT: 5000,
    scrapCrew: 2,
    fixedPerDay: 40000,
    description: "Smelteverk med tung strømforsyning og jernbanespor. Her kan lysbueovnen stå.",
  },
  {
    id: 4,
    name: "Storverk",
    price: 32_000_000,
    reputation: 65,
    staffCap: 220,
    yardT: 25000,
    storeT: 20000,
    scrapCrew: 4,
    fixedPerDay: 150000,
    description: "Et fullskala stålverk med skraphavn, egen kai og hundrevis av ansatte.",
  },
];

// ------------------------------------------------------------------ //
// Ovner
// ------------------------------------------------------------------ //
export interface FurnaceType {
  id: string;
  name: string;
  stage: number;
  price: number;
  sizeT: number;
  cycleMin: number;
  kwhPerT: number;
  fuel: "gass" | "strøm";
  /** Jern som går tapt til slagg (oksidasjon) */
  oxidationLoss: number;
  /** Andel av fosforet som tas ut i slaggen (0 = ingen avfosforering) */
  dephos: number;
  /** Kan brenne ut karbon med oksygen */
  decarb: boolean;
  /** Slitasje per charge. Satt så foringen blir 85 % slitt etter ca. 9 døgn døgnkontinuerlig drift (B-028) */
  wearPerHeat: number;
  relineCost: number;
  relineHours: number;
  crew: Crew;
  /** Tilsatser, elektroder og annet forbruk per tonn */
  consumablesPerT: number;
  requires?: string[];
  arc: boolean;
  description: string;
}

export const FURNACES: FurnaceType[] = [
  {
    id: "induksjon025",
    name: "Liten induksjonsovn 250 kg",
    stage: 0,
    price: 0,
    sizeT: 0.25,
    cycleMin: 100,
    kwhPerT: 750,
    fuel: "strøm",
    oxidationLoss: 0.02,
    dephos: 0,
    decarb: false,
    wearPerHeat: 0.0072,
    relineCost: 5_000,
    relineHours: 4,
    crew: { ovn: 1 },
    consumablesPerT: 180,
    arc: false,
    description: "En brukt induksjonsovn som tar 250 kg. Smelter det du legger i – ikke mer, ikke mindre.",
  },
  {
    id: "induksjon1",
    name: "Induksjonsovn 1 t",
    stage: 1,
    price: 50_000,
    sizeT: 1,
    cycleMin: 70,
    kwhPerT: 650,
    fuel: "strøm",
    oxidationLoss: 0.015,
    dephos: 0,
    decarb: false,
    wearPerHeat: 0.0046,
    relineCost: 25_000,
    relineHours: 10,
    crew: { ovn: 1 },
    consumablesPerT: 120,
    arc: false,
    description: "Rask og ren smelting med lite tap, men ingen raffinering: fosfor og sporelementer blir der de er.",
  },
  {
    id: "induksjon5",
    name: "Induksjonsovn 5 t",
    stage: 2,
    price: 950_000,
    sizeT: 5,
    cycleMin: 80,
    kwhPerT: 600,
    fuel: "strøm",
    oxidationLoss: 0.015,
    dephos: 0,
    decarb: false,
    wearPerHeat: 0.0052,
    relineCost: 120_000,
    relineHours: 16,
    crew: { ovn: 1 },
    consumablesPerT: 110,
    arc: false,
    description: "Større induksjonsovn for skiftdrift. Fortsatt ingen raffinering.",
  },
  {
    id: "lysbue30",
    name: "Lysbueovn 30 t",
    stage: 3,
    price: 7_500_000,
    sizeT: 30,
    cycleMin: 75,
    kwhPerT: 440,
    fuel: "strøm",
    oxidationLoss: 0.045,
    dephos: 0.6,
    decarb: true,
    wearPerHeat: 0.0049,
    relineCost: 750_000,
    relineHours: 30,
    crew: { ovn: 3 },
    consumablesPerT: 200,
    requires: ["renseanlegg"],
    arc: true,
    description: "Lysbue, oksygenlanse og basisk slagg: nå kan fosfor og karbon tas ut. Krever røykgassrensing.",
  },
  {
    id: "lysbue90",
    name: "Lysbueovn 90 t",
    stage: 4,
    price: 22_000_000,
    sizeT: 90,
    cycleMin: 60,
    kwhPerT: 400,
    fuel: "strøm",
    oxidationLoss: 0.045,
    dephos: 0.65,
    decarb: true,
    wearPerHeat: 0.0039,
    relineCost: 1_800_000,
    relineHours: 36,
    crew: { ovn: 4 },
    consumablesPerT: 180,
    requires: ["renseanlegg"],
    arc: true,
    description: "Fullskala lysbueovn med flatt bad og stålsump.",
  },
];

// ------------------------------------------------------------------ //
// Støping
// ------------------------------------------------------------------ //
export interface CastingType {
  id: string;
  name: string;
  stage: number;
  price: number;
  product: ProductId;
  tph: number;
  yield: number;
  crew: Crew;
  costPerT: number;
  /** Grunnsannsynlighet for støpefeil per parti */
  defectRisk: number;
  continuous: boolean;
  description: string;
}

export const CASTINGS: CastingType[] = [
  {
    id: "sandformer",
    name: "Sandstøping",
    stage: 0,
    price: 0,
    product: "stopegods",
    tph: 0.5,
    yield: 0.8,
    crew: { stoper: 1 },
    costPerT: 800,
    defectRisk: 0.1,
    continuous: false,
    description:
      "Stålet støpes i former av sand som lages for hånd rundt en modell. Enkelt og billig, men mye av stålet havner i innløp og matere.",
  },
  {
    id: "formlinje",
    name: "Formlinje",
    stage: 1,
    price: 45_000,
    product: "stopegods",
    tph: 2,
    yield: 0.84,
    crew: { stoper: 1 },
    costPerT: 550,
    defectRisk: 0.07,
    continuous: false,
    description: "Formmaskin med gjenbruk av sand. Raskere og jevnere gods.",
  },
  {
    id: "blokk",
    name: "Blokkstøping",
    stage: 2,
    price: 600_000,
    product: "blokk",
    tph: 10,
    yield: 0.9,
    crew: { stoper: 2 },
    costPerT: 250,
    defectRisk: 0.06,
    continuous: false,
    description: "Stålet tappes i kokiller og størkner til blokker som selges til valseverk og smier.",
  },
  {
    id: "streng1",
    name: "Strengstøpemaskin, 1 streng",
    stage: 3,
    price: 5_500_000,
    product: "emne",
    tph: 32,
    yield: 0.955,
    crew: { stoper: 3 },
    costPerT: 160,
    defectRisk: 0.05,
    continuous: true,
    description: "Stålet renner fra fordeleren ned i en vannkjølt kokille og trekkes ut som en sammenhengende streng.",
  },
  {
    id: "streng4",
    name: "Strengstøpemaskin, 4 strenger",
    stage: 4,
    price: 16_000_000,
    product: "emne",
    tph: 110,
    yield: 0.97,
    crew: { stoper: 5 },
    costPerT: 130,
    defectRisk: 0.04,
    continuous: true,
    description: "Fire strenger i parallell holder følge med en stor lysbueovn.",
  },
  {
    id: "streng6",
    name: "Strengstøpemaskin, 6 strenger",
    stage: 4,
    price: 45_000_000,
    product: "emne",
    tph: 170,
    yield: 0.975,
    crew: { stoper: 7 },
    costPerT: 120,
    defectRisk: 0.035,
    continuous: true,
    description:
      "Seks strenger tar unna stålet fra tre store ovner. Uten flere ovner står strengene mye og venter (B-075).",
  },
];

// ------------------------------------------------------------------ //
// Tilleggsutstyr
// ------------------------------------------------------------------ //
export interface Addon {
  id: string;
  name: string;
  stage: number;
  price: number;
  crew?: Crew;
  /** Krever at ovnen er en lysbueovn */
  needsArc?: boolean;
  /** Kjøpes per ovn, ikke for hele verket (B-074) */
  perFurnace?: boolean;
  needsContinuous?: boolean;
  requires?: string[];
  description: string;
}

export const ADDONS: Addon[] = [
  {
    id: "lager",
    name: "Lagerhall",
    stage: 1,
    price: 35_000,
    description: "Dobbelt så mye plass til skrap og ferdigvare.",
  },
  {
    id: "xrf",
    name: "Håndholdt analysator",
    stage: 1,
    price: 30_000,
    description:
      "Røntgenfluorescens måler sporelementer som kobber, nikkel og krom direkte på stålet – men ikke karbon og fosfor.",
  },
  {
    id: "portal",
    name: "Strålingsportal",
    stage: 1,
    price: 90_000,
    description: "Måler alle skraplass når de kjøres inn på verket. Radioaktive kilder stoppes før de havner i ovnen.",
  },
  {
    id: "salgskontor",
    name: "Salgskontor",
    stage: 1,
    price: 60_000,
    description: "Flere forespørsler fra kunder og litt bedre betalt.",
  },
  {
    id: "oes",
    name: "Spektrometer",
    stage: 2,
    price: 450_000,
    description: "Gnistspektrometer i eget laboratorium: full analyse av hver charge, også karbon og fosfor.",
  },
  {
    id: "sortering",
    name: "Skrapsortering",
    stage: 2,
    price: 250_000,
    crew: { skrap: 1 },
    description: "Plukker ut kobberledninger, motorer og skitt før skrapet går til ovnen.",
  },
  {
    id: "verksted",
    name: "Vedlikeholdsverksted",
    stage: 2,
    price: 300_000,
    description: "Færre havarier og raskere reparasjoner, særlig med egne reparatører.",
  },
  {
    id: "ovn2",
    name: "Ovn nummer to",
    stage: 2,
    price: 0,
    description: "En ovn til av samme type. Dobbel smeltekapasitet, dobbelt mannskap.",
  },
  {
    id: "renseanlegg",
    name: "Røykgassrensing",
    stage: 3,
    price: 1_500_000,
    description: "Filteranlegg for avgass og støv. Påbudt for lysbueovn.",
  },
  {
    id: "oseovn",
    name: "Øseovn",
    stage: 3,
    price: 3_000_000,
    crew: { lab: 1 },
    needsArc: true,
    description:
      "Varmer og legerer stålet i øsa etter tapping: karbon treffer målet, og temperaturen til støping blir riktig.",
  },
  {
    id: "conveyor",
    name: "Conveyor med forvarming",
    stage: 3,
    price: 3_500_000,
    needsArc: true,
    perFurnace: true,
    description: "Mater skrapet kontinuerlig inn og forvarmer det med avgassen. Mindre strøm per tonn.",
  },
  {
    id: "trafo",
    name: "Større transformator",
    stage: 3,
    price: 2_500_000,
    needsArc: true,
    perFurnace: true,
    description: "Mer effekt i lysbuen gir kortere tapp-til-tapp.",
  },
  {
    id: "ovn3",
    name: "Ovn nr. 3",
    stage: 4,
    price: 0,
    requires: ["ovn2"],
    description:
      "En tredje ovn av samme type som ovn 1. Krever mer strøm, folk og støpekapasitet – se strengstøping med 6 strenger.",
  },
  {
    id: "vakuum",
    name: "Vakuumavgassing",
    stage: 4,
    price: 30_000_000,
    needsArc: true,
    requires: ["oseovn"],
    description: "Suger ut hydrogen og nitrogen av stålet i øsa. Renere stål som kundene betaler 5 % mer for.",
  },
  {
    id: "havn",
    name: "Havnekai",
    stage: 4,
    price: 40_000_000,
    description:
      "Egen kai for skip: stålet kan selges over hele Europa. Flere forespørsler, litt bedre priser og halvannen gang så stort ferdigvarelager.",
  },
  {
    id: "skrapterminal",
    name: "Skrapterminal med skrapsaks",
    stage: 4,
    price: 25_000_000,
    description: "Tar imot skrap på båt og tog og klipper det til ovnen. Dobbelt skraplager og 6 % billigere skrap.",
  },
  // Mot havarier når verket blir stort og kjører mange charger (B-094)
  {
    id: "elektroderegulering",
    name: "Hydraulisk elektroderegulering",
    stage: 3,
    price: 4_000_000,
    needsArc: true,
    perFurnace: true,
    description:
      "Elektrodene flyttes raskt og mykt, og brudd fanges opp før de skjer. 60 % færre elektrodebrudd og 30 % færre overslag.",
  },
  {
    id: "panelvarsling",
    name: "Paneler med lekkasjevarsling",
    stage: 4,
    price: 6_000_000,
    needsArc: true,
    perFurnace: true,
    description:
      "Tykkere kobberpaneler og følere som varsler lekkasjer. Halvparten så mange overslag, og de sjeldent slår hull i panelene.",
  },
  {
    id: "bruddvarsling",
    name: "Bruddvarsling i kokillen",
    stage: 3,
    price: 8_000_000,
    needsContinuous: true,
    description:
      "Temperaturfølere i kokillen ser når skallet er i ferd med å revne, og bremser strengen i tide. 60 % færre strenggjennombrudd.",
  },
  {
    id: "varmegjenvinning",
    name: "Varmegjenvinning",
    stage: 4,
    price: 20_000_000,
    needsArc: true,
    requires: ["renseanlegg"],
    description: "Varmen i avgassen blir til damp og strøm. Lysbueovnene bruker 8 % mindre strøm per tonn.",
  },
  {
    id: "streng2",
    name: "Strengstøpemaskin nr. 2",
    stage: 4,
    price: 40_000_000,
    needsContinuous: true,
    crew: { stoper: 3 },
    description:
      "En strengstøpemaskin til ved siden av den første, så støpingen holder følge med tre store ovner. Dobbel støpekapasitet.",
  },
  {
    id: "valseverk2",
    name: "Valseverk nr. 2",
    stage: 4,
    price: 35_000_000,
    requires: ["valseverk"],
    crew: { valse: 3 },
    description: "Et valseverk til, så valsingen holder følge når støpingen blir større. Dobbel valsekapasitet.",
  },
  {
    id: "valseverk",
    name: "Valseverk",
    stage: 3,
    price: 9_000_000,
    crew: { valse: 3 },
    needsContinuous: true,
    description: "Valser emner til armeringsstål, som betales bedre.",
  },
];

// ------------------------------------------------------------------ //
// Roller
// ------------------------------------------------------------------ //
export interface Role {
  id: RoleId;
  name: string;
  plural: string;
  salary: number; // kr per dag ved ferdighet 3
  description: string;
}

export const ROLES: Record<RoleId, Role> = {
  allround: {
    id: "allround",
    name: "Avløser",
    plural: "Avløsere",
    salary: 1500,
    description:
      "Tar plassen til den som mangler på skiftet – ved ovnen, støpingen eller kranen – også når noen er syke eller har ferie. Blir ikke like god som en spesialist.",
  },
  ovn: {
    id: "ovn",
    name: "Ovnsoperatør",
    plural: "Ovnsoperatører",
    salary: 1900,
    description: "Kjører ovnen. Flinke operatører gir kortere charger og færre feil.",
  },
  stoper: {
    id: "stoper",
    name: "Støper",
    plural: "Støpere",
    salary: 1750,
    description: "Støper stålet. Flinke støpere gir færre støpefeil.",
  },
  skrap: {
    id: "skrap",
    name: "Kranfører",
    plural: "Kranførere",
    salary: 1650,
    description: "Håndterer skraplageret og setter sammen skrapkassene.",
  },
  lab: {
    id: "lab",
    name: "Øseovnsoperatør",
    plural: "Øseovnsoperatører",
    salary: 1900,
    description:
      "Kjører øseovnen: tar prøver, legerer øsa så stålet holder kravet, og sender det til støping med riktig temperatur. En slurvete operatør gir stål som må sperres, og for kaldt stål kan få strengen til å gro igjen.",
  },
  vedlikehold: {
    id: "vedlikehold",
    name: "Reparatør",
    plural: "Reparatører",
    salary: 1950,
    description: "Forebyggende vedlikehold gir færre havarier og raskere reparasjon.",
  },
  planlegger: {
    id: "planlegger",
    name: "Planlegger",
    plural: "Planleggere",
    salary: 2300,
    description:
      "Sorterer ordrekøen etter frist og kjøper skrap etter resepten (når «Ordreplanlegging» og «Innkjøpsplan» er forsket fram). Resepten må du eller skrapklasseren lage.",
  },
  klasser: {
    id: "klasser",
    name: "Skrapklasser",
    plural: "Skrapklassere",
    salary: 1800,
    description:
      "Kontrollerer skrapet som kommer inn og sørger for at hver charge får den blandingen resepten sier. Stopper dårlige partier før de tas imot, og legger om resepten når kvaliteten skifter og den gamle ikke holder.",
  },
  murer: {
    id: "murer",
    name: "Murer",
    plural: "Murere",
    salary: 1900,
    description:
      "Murer opp den ene potta til lysbueovnen med ny ildfast stein mens den andre er i bruk. Jobber dagtid (07–15), ikke skift. To murere klarer en potte på ca. fire døgn.",
  },
  salg: {
    id: "salg",
    name: "Selger",
    plural: "Selgere",
    salary: 2100,
    description: "Skaffer flere og bedre betalte kontrakter.",
  },
  valse: {
    id: "valse",
    name: "Valseoperatør",
    plural: "Valseoperatører",
    salary: 1850,
    description: "Kjører valseverket.",
  },
};

export const ROLE_IDS = Object.keys(ROLES) as RoleId[];
/** Roller som bemanner produksjonen per skift */
export const CREW_ROLES: RoleId[] = ["ovn", "stoper", "skrap", "lab", "valse"];

// ------------------------------------------------------------------ //
// Kunder
// ------------------------------------------------------------------ //
export interface CustomerType {
  name: string;
  minStage: number;
  maxStage: number;
  products: ProductId[];
  grades: GradeId[];
  /** Minste ordre kunden legger inn, og største den kan ta imot (tonn) */
  minT: number;
  maxT: number;
}

export const CUSTOMERS: CustomerType[] = [
  {
    name: "Smia i bygda",
    minStage: 0,
    maxStage: 1,
    products: ["stopegods"],
    grades: ["enkel", "standard"],
    minT: 0.15,
    maxT: 4,
  },
  { name: "Gårdbruker", minStage: 0, maxStage: 1, products: ["stopegods"], grades: ["enkel"], minT: 0.1, maxT: 3 },
  {
    name: "Båtforeningen",
    minStage: 0,
    maxStage: 1,
    products: ["stopegods"],
    grades: ["standard"],
    minT: 0.1,
    maxT: 3,
  },
  {
    name: "Hagemøbelsnekker",
    minStage: 0,
    maxStage: 2,
    products: ["stopegods"],
    grades: ["enkel", "standard"],
    minT: 0.2,
    maxT: 5,
  },
  {
    name: "Maskinverksted",
    minStage: 1,
    maxStage: 2,
    products: ["stopegods"],
    grades: ["standard", "hoykarbon"],
    minT: 0.5,
    maxT: 60,
  },
  {
    name: "Kommunens driftsavdeling",
    minStage: 1,
    maxStage: 2,
    products: ["stopegods"],
    grades: ["enkel", "standard"],
    minT: 1,
    maxT: 60,
  },
  {
    name: "Pumpefabrikk",
    minStage: 1,
    maxStage: 3,
    products: ["stopegods"],
    grades: ["standard", "premium"],
    minT: 1,
    maxT: 80,
  },
  {
    name: "Smedbedrift",
    minStage: 2,
    maxStage: 3,
    products: ["blokk"],
    grades: ["standard", "hoykarbon"],
    minT: 15,
    maxT: 400,
  },
  {
    name: "Verft",
    minStage: 2,
    maxStage: 4,
    products: ["blokk", "emne"],
    grades: ["standard", "premium"],
    minT: 30,
    maxT: 1500,
  },
  {
    name: "Valseverk i Sverige",
    minStage: 2,
    maxStage: 4,
    products: ["blokk", "emne"],
    grades: ["standard", "armering", "lavkarbon"],
    minT: 50,
    maxT: 2000,
  },
  {
    name: "Byggevarekjede",
    minStage: 3,
    maxStage: 4,
    products: ["armering"],
    grades: ["armering"],
    minT: 200,
    maxT: 4000,
  },
  {
    name: "Armeringsgrossist",
    minStage: 3,
    maxStage: 4,
    products: ["armering", "emne"],
    grades: ["armering"],
    minT: 300,
    maxT: 5000,
  },
  { name: "Trådtrekkeri", minStage: 3, maxStage: 4, products: ["emne"], grades: ["lavkarbon"], minT: 200, maxT: 3000 },
  { name: "Fjærfabrikk", minStage: 3, maxStage: 4, products: ["emne"], grades: ["hoykarbon"], minT: 100, maxT: 2000 },
  {
    name: "Offshoreleverandør",
    minStage: 3,
    maxStage: 4,
    products: ["emne", "blokk"],
    grades: ["premium"],
    minT: 150,
    maxT: 3000,
  },
  {
    name: "Eksportkunde",
    minStage: 4,
    maxStage: 4,
    products: ["emne", "armering"],
    grades: ["standard", "armering", "lavkarbon", "premium"],
    minT: 1000,
    maxT: 15000,
  },
  {
    name: "Bilindustrien",
    minStage: 4,
    maxStage: 4,
    products: ["emne"],
    grades: ["lavkarbon", "premium"],
    minT: 800,
    maxT: 10000,
  },
];

// ------------------------------------------------------------------ //
// Navn til ansatte
// ------------------------------------------------------------------ //
export const FIRST_NAMES = [
  "Anne",
  "Per",
  "Kari",
  "Ola",
  "Ingrid",
  "Lars",
  "Silje",
  "Jonas",
  "Hanne",
  "Erik",
  "Mona",
  "Arild",
  "Tone",
  "Geir",
  "Line",
  "Trond",
  "Nina",
  "Stian",
  "Hilde",
  "Rune",
  "Sara",
  "Tor",
  "Marit",
  "Kjell",
  "Ida",
  "Bjørn",
  "Linn",
  "Espen",
  "Grete",
  "Ali",
  "Fatima",
  "Tomasz",
  "Agnieszka",
  "Mikael",
  "Aisha",
  "Jan",
  "Wenche",
  "Sindre",
  "Eva",
  "Omar",
];

export const LAST_NAMES = [
  "Hansen",
  "Johansen",
  "Olsen",
  "Larsen",
  "Andersen",
  "Pedersen",
  "Nilsen",
  "Kristiansen",
  "Jensen",
  "Karlsen",
  "Berg",
  "Haugen",
  "Hagen",
  "Eriksen",
  "Bakken",
  "Dahl",
  "Lund",
  "Moen",
  "Solberg",
  "Strand",
  "Nowak",
  "Ahmed",
  "Lie",
  "Aas",
  "Holm",
];
