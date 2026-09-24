/**
 * Tilstanden i stålverkspillet.
 *
 * Alt her er ren JSON, slik at hele spillet kan lagres i nettleseren og
 * lastes inn igjen uten omforming. Motoren endrer tilstanden på stedet.
 */

export type ScrapId = "blandet" | "tungt" | "shredder" | "spon" | "rent" | "rajern" | "retur";
export type ProductId = "stopegods" | "blokk" | "emne" | "armering";
export type GradeId = "enkel" | "standard" | "armering" | "lavkarbon" | "hoykarbon" | "premium";
export type RoleId = "allround" | "ovn" | "stoper" | "skrap" | "lab" | "vedlikehold" | "salg" | "valse";
export type Crew = Partial<Record<RoleId, number>>;

/** Analyse av stål: karbon, fosfor og sporelementer (Cu+Sn+Ni+Cr+Mo), alle i vekt-%. */
export interface Analysis {
  c: number;
  p: number;
  tramp: number;
}

/** Skrap på lager av én type, med gjennomsnittlig innhold for det som ligger der. */
export interface ScrapStock {
  t: number;
  p: number;
  tramp: number;
  c: number;
  dirt: number;
  /** Mistenkelig parti som ikke er oppdaget: smelter du det, blir det dyrt */
  radioactive: boolean;
}

/** En charge som smelter i en ovn. */
export interface Heat {
  startMin: number;
  endMin: number;
  sizeT: number;
  liquidT: number;
  grade: GradeId;
  analysis: Analysis;
  /** Det analysen ser ut til å bli ut fra resepten, uten målinger */
  expected: Analysis;
  /** Temperaturstyringen var dårlig: gir feil ved støping */
  tempOff: boolean;
  manual: boolean;
  /** Radioaktivt parti gikk inn i ovnen */
  radioactive: boolean;
  energyKwh: number;
}

/** Flytende stål i øse som venter på støping. */
export interface LiquidBatch {
  t: number;
  grade: GradeId;
  analysis: Analysis;
  expected: Analysis;
  tempOff: boolean;
  manual: boolean;
}

export interface FurnaceUnit {
  wear: number;
  heat: Heat | null;
  /** Ferdig smeltet stål som ikke har kommet seg videre til støping */
  holding: LiquidBatch | null;
  downUntilMin: number;
  downReason: string | null;
  heatsOnLining: number;
  /** Hvorfor ovnen står og venter, for visning */
  waitReason: string | null;
}

/** Ferdigvare på lager. Like partier slås sammen. */
export interface Lot {
  id: number;
  product: ProductId;
  t: number;
  /** Faktisk analyse */
  analysis: Analysis;
  /** Det du vet om analysen: målt med det laboratoriet du har, ellers anslått fra resepten */
  known: Analysis;
  /** Hvilke deler av analysen som faktisk er målt */
  measured: { c: boolean; p: boolean; tramp: boolean };
  second: boolean;
  madeDay: number;
}

export interface Contract {
  id: number;
  customer: string;
  product: ProductId;
  grade: GradeId;
  tonnes: number;
  delivered: number;
  pricePerT: number;
  /** Dagnummer leveransen må være fullført innen (ved dagens slutt) */
  deadlineDay: number;
  offerExpiresDay: number;
  repGain: number;
  repLoss: number;
  penaltyPerT: number;
  status: "tilbud" | "aktiv" | "fullfort" | "misligholdt";
  closedDay: number | null;
}

export interface Complaint {
  dueMin: number;
  customer: string;
  text: string;
  refund: number;
  repLoss: number;
}

export interface Worker {
  id: number;
  name: string;
  role: RoleId;
  skill: number;
  salary: number;
  hiredDay: number;
}

export interface LogEntry {
  id: number;
  min: number;
  text: string;
  kind: "info" | "good" | "bad" | "event";
}

export type CostCategory =
  | "skrap"
  | "energi"
  | "forbruk"
  | "lonn"
  | "vedlikehold"
  | "renter"
  | "investering"
  | "bot"
  | "annet";
export type IncomeCategory = "kontrakt" | "spot" | "annet";

export interface DayFinance {
  day: number;
  income: Partial<Record<IncomeCategory, number>>;
  costs: Partial<Record<CostCategory, number>>;
  producedT: number;
  heats: number;
  cashEnd: number;
}

export interface Settings {
  autoReline: boolean;
  relineAt: number;
  /** Start ikke ny charge når strømprisen er over dette (kr/kWh). null = ingen grense */
  maxPowerPrice: number | null;
  autoBuy: boolean;
  /** Hvor mange dagers forbruk automatisk innkjøp skal holde på lager */
  autoBuyDays: number;
  autoSpot: boolean;
  rolling: boolean;
  /** Ta styringen på neste charge i lysbueovnen */
  manualNext: boolean;
}

export interface ManualRequest {
  furnace: number;
  sizeT: number;
  grade: GradeId;
  mix: Analysis;
  expectedMix: Analysis;
  energyFactor: number;
  metallicYield: number;
  radioactive: boolean;
  /** Farten spillet hadde før det ble satt på pause for kontrollrommet */
  resumeSpeed: number;
}

/** Et hendelseskort som venter på at spilleren velger. */
export interface Decision {
  id: string;
  title: string;
  text: string;
  options: { label: string; hint?: string }[];
  /** Tall kortet trenger når valget skal gjennomføres (mengde, pris …) */
  data: Record<string, number | string>;
  resumeSpeed: number;
}

export interface Market {
  steelFactor: number;
  scrapFactor: Record<ScrapId, number>;
  powerFactor: number;
  powerSpikeDays: number;
  spotSoldToday: Partial<Record<ProductId, number>>;
}

export interface GameState {
  version: number;
  rng: number;
  minute: number;
  speed: number;
  cash: number;
  loan: number;
  reputation: number;
  stage: number;
  owned: string[];
  furnaceType: string;
  furnaceCount: number;
  castingType: string;
  furnaces: FurnaceUnit[];
  castQueue: LiquidBatch[];
  castProgressT: number;
  castDownUntilMin: number;
  castWait: string | null;
  rollProgressT: number;
  scrap: Record<ScrapId, ScrapStock>;
  recipe: Record<ScrapId, number>;
  targetGrade: GradeId;
  lots: Lot[];
  nextLotId: number;
  contracts: Contract[];
  nextContractId: number;
  complaints: Complaint[];
  workers: Worker[];
  candidates: Worker[];
  nextWorkerId: number;
  ownerSkill: number;
  market: Market;
  settings: Settings;
  log: LogEntry[];
  nextLogId: number;
  today: DayFinance;
  history: DayFinance[];
  totals: { producedT: number; heats: number; manualHeats: number; contractsDone: number; complaints: number };
  negativeDays: number;
  gameOver: boolean;
  won: boolean;
  pendingManual: ManualRequest | null;
  /** Fagpoeng til forskning */
  researchPoints: number;
  researched: string[];
  pendingDecision: Decision | null;
  /** Nivået spilleren nettopp flyttet til, for feiring; null når det er sett */
  celebrate: number | null;
  /** Kunnskapskort spilleren har låst opp, i rekkefølge */
  knowledge: string[];
  unreadKnowledge: number;
}
