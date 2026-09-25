/**
 * Tilstanden i stålverkspillet.
 *
 * Alt her er ren JSON, slik at hele spillet kan lagres i nettleseren og
 * lastes inn igjen uten omforming. Motoren endrer tilstanden på stedet.
 */

export type ScrapId = "blandet" | "tungt" | "shredder" | "spon" | "rent" | "rajern" | "retur";
export type ProductId = "stopegods" | "blokk" | "emne" | "armering";
export type GradeId = "enkel" | "standard" | "armering" | "lavkarbon" | "hoykarbon" | "premium";
export type RoleId =
  | "allround"
  | "ovn"
  | "stoper"
  | "skrap"
  | "lab"
  | "vedlikehold"
  | "salg"
  | "valse"
  | "planlegger"
  | "klasser"
  | "murer";
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
  /** Spillminuttet øsa kom i køen til støpemaskinen (B-046) */
  queuedMin?: number;
  /** Øsa startet en ny kvalitet midt i en sekvens, så overgangsemnene må skrapes (B-046) */
  transition?: boolean;
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
  /** Døgnet foringen sist ble byttet */
  lastRelineDay: number;
  /** Spilleren har bedt om ny foring; skjer så snart ovnen er tom */
  relineRequested: boolean;
  /** Lysbueovn: hvor langt murerne har kommet med å mure opp reservepotta, 0–1 (1 = klar) (B-030) */
  spareProgress: number;
  /** Kvaliteten denne ovnen lager hvis den skal lage en annen enn ovn 1; null = samme (B-039) */
  grade: GradeId | null;
  /** Hvorfor ovnen står og venter, for visning */
  waitReason: string | null;
  /** Ovnstypen til akkurat denne ovnen (B-074); mangler i gamle lagringer (migrate setter den) */
  type?: string;
  /** Utstyr på akkurat denne ovnen, f.eks. transformator og conveyor (B-074) */
  addons?: string[];
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
  /** Kunden har allerede reklamert og trukket omdømme for denne kontrakten (B-034) */
  complained?: boolean;
  /** Ukeleveranse i en rammeavtale (B-040) */
  agreementId?: number;
  id: number;
  customer: string;
  product: ProductId;
  grade: GradeId;
  tonnes: number;
  delivered: number;
  pricePerT: number;
  /** Dagnummer leveransen må være fullført innen (ved dagens slutt) */
  deadlineDay: number;
  /** Spillminuttet tilbudet avslås automatisk hvis det ikke er besvart */
  offerExpiresMin: number;
  repGain: number;
  repLoss: number;
  penaltyPerT: number;
  /** Plass i ordrekøen: lavest leveres og produseres først */
  priority: number;
  status: "tilbud" | "aktiv" | "fullfort" | "misligholdt";
  closedDay: number | null;
}

/**
 * Rammeavtale (B-040): kunden bestiller like mye hver uke i flere uker til fast pris.
 * Hver uke legges en vanlig kontrakt i ordrekøen.
 */
export interface Agreement {
  id: number;
  customer: string;
  product: ProductId;
  grade: GradeId;
  /** Tonn per uke */
  weeklyT: number;
  /** Fast pris per tonn i hele avtalen */
  pricePerT: number;
  weeks: number;
  /** Ukeleveranser lagt i ordrekøen så langt */
  weeksSent: number;
  weeksDone: number;
  weeksMissed: number;
  /** Dagen neste ukeleveranse legges i ordrekøen */
  nextDay: number;
  /** Bonus når alle ukene er levert i tide */
  bonusKr: number;
  bonusRep: number;
  status: "tilbud" | "aktiv" | "fullfort" | "brutt";
  offerExpiresMin: number;
  closedDay: number | null;
}

export interface Complaint {
  /** Kontrakten reklamasjonen gjelder, så flere partier samles i én (B-034) */
  contractId?: number;
  deliveredDay?: number;
  tonnes?: number;
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
  /** Siste dag den ansatte var på kurs (B-026) */
  courseDay?: number;
  /** Fravær (B-031): fra og til spillminutt, og hvorfor */
  absentFrom?: number;
  absentUntil?: number;
  absentReason?: "syk" | "ferie";
  /** Døgnet neste ferie starter (varsles tre døgn før) */
  nextVacationDay?: number;
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
  | "faste"
  | "nett"
  | "annet";
export type IncomeCategory = "kontrakt" | "spot" | "annet";

export interface DayFinance {
  day: number;
  income: Partial<Record<IncomeCategory, number>>;
  costs: Partial<Record<CostCategory, number>>;
  producedT: number;
  heats: number;
  cashEnd: number;
  /** Tonn som holdt kvaliteten det ble laget for */
  onGradeT?: number;
  /** Tonn som bommet på analysen */
  offGradeT?: number;
  /** Tonn med støpefeil (sekunda) */
  secondT?: number;
  /** Overgangsemner skrapet ved kvalitetsbytte i strengstøpingen (B-046) */
  transitionT?: number;
  /** Kroner planleggeren har kjøpt skrap for i døgnet */
  autoBuyKr?: number;
  /** Strøm brukt i døgnet (kWh), for snittprisen */
  kwh?: number;
  /** Døgnets høyeste effektuttak (MW), grunnlaget for effekttariffen */
  peakMW?: number;
}

/** Hvorfor omdømmet falt: reklamasjon, sen levering eller havari */
export type RepCause = "reklamasjon" | "sen" | "havari";

export type PowerDeal = "spot" | "fast" | "natt";

export interface Settings {
  /** Reparatøren bytter foringen når den når relineAt (krever en reparatør) */
  autoReline: boolean;
  relineAt: number;
  /** Planlagt omforing hvert N. døgn (krever forskningen «Vedlikeholdsplan»); null = av */
  relinePlanDays: number | null;
  /** Strømavtale (B-024): spot, fastpris eller nattariff */
  powerDeal: PowerDeal;
  /** Avtalen kan ikke byttes før denne dagen (bindingstid) */
  powerDealUntilDay: number;
  /** Prisen i fastprisavtalen, kr/kWh */
  powerFixedPrice: number;
  /** Forny strømavtalen når bindingstida er ute; ellers tilbake til spotpris (B-042) */
  powerAutoRenew: boolean;
  /** Bare én ovn smelter om gangen, for å holde effekttoppen nede */
  onePeak: boolean;
  /** Spol fram når verket står utenfor arbeidstida og ingenting skjer (B-033) */
  skipIdleNights: boolean;
  /** Hva som skjer med støpefeil (2. sortering): selges på spot, smeltes om som returskrap, eller beholdes (B-035) */
  secondsAction: "spot" | "retur" | "behold";
  /** Skrapklasseren venter på riktig skrap i stedet for å fylle med annet (B-035) */
  graderStrict: boolean;
  /** Ikke ta imot nye forespørsler (B-034) */
  pauseOffers: boolean;
  /** Kvalitetene spilleren vil ha forespørsler på; tom = alle (B-042) */
  offerGrades: GradeId[];
  /** Rekkefølgen forespørslene vises i (B-042) */
  offerSort: "frist" | "verdi" | "pris" | "kvalitet";
  /** Lei inn vikarer av seg selv når fravær ellers ville kostet skift (B-039) */
  autoTemps: boolean;
  /** Klokketimen skiftene starter (6, 14 eller 22) */
  shiftStart: number;
  /** Start ikke ny charge når strømprisen er over dette (kr/kWh). null = ingen grense */
  maxPowerPrice: number | null;
  autoBuy: boolean;
  /** Hvor mange dagers forbruk automatisk innkjøp skal holde på lager */
  autoBuyDays: number;
  /** Planleggeren kan handle på kassekreditten (B-027) */
  autoBuyCredit: boolean;
  /** Største beløp planleggeren kan bruke på skrap per døgn; null = ingen grense */
  autoBuyMaxPerDay: number | null;
  autoSpot: boolean;
  rolling: boolean;
  /** Ta styringen på neste charge i lysbueovnen */
  manualNext: boolean;
  /** Ovnen kjører kvaliteten til øverste kontrakt i ordrekøen */
  followQueue: boolean;
  /** Med flere ovner: ovn 2 lager neste kvalitet i ordrekøen når den er en annen enn ovn 1 sin (B-039) */
  splitGrades: boolean;
  /** Planleggeren sorterer ordrekøen etter frist */
  plannerSorts: boolean;
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
  /** chapter: valget åpner fagboka på dette kapitlet */
  options: { label: string; hint?: string; chapter?: string }[];
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
  /** Hvorfor planleggeren sist ikke fikk kjøpt skrap resepten trenger, eller null (B-048) */
  autoBuyNote?: string | null;
  /** Kvaliteten strengstøpemaskinen sist støpte, og når den ble ferdig (B-046) */
  lastCast: { grade: GradeId; min: number } | null;
  castProgressT: number;
  castDownUntilMin: number;
  castWait: string | null;
  rollProgressT: number;
  scrap: Record<ScrapId, ScrapStock>;
  recipe: Record<ScrapId, number>;
  /** Resepten spilleren har laget for hver kvalitet; brukes når kvaliteten skifter */
  gradeRecipes: Partial<Record<GradeId, Record<ScrapId, number>>>;
  targetGrade: GradeId;
  lots: Lot[];
  nextLotId: number;
  contracts: Contract[];
  nextContractId: number;
  /** Rammeavtaler: tilbud, aktive og nylig avsluttede (B-040) */
  agreements: Agreement[];
  nextAgreementId: number;
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
  /** Dagen spilleren sist kjøpte fagpoeng gjennom et forskningssamarbeid (B-064), −1 hvis aldri */
  fpDealDay: number;
  researched: string[];
  pendingDecision: Decision | null;
  /** Dagen hvert hendelseskort sist ble vist, så de ikke gjentas for ofte */
  decisionSeen: Record<string, number>;
  /** Utgått (B-031): erstattet av fravær per ansatt. Beholdes for gamle lagringer. */
  sickUntilMin: number;
  /** Innleide vikarer dekker alle som er borte til dette spillminuttet (B-031) */
  tempsUntilMin: number;
  /** Gjennomgang av resepten for en ny kvalitet, og steget spilleren er på (B-058) */
  recipeGuide: { grade: GradeId; step: number } | null;
  /** Lagringen har fått automatikk-forskningen (B-054); gamle spill får den de hadde fra før */
  automationResearch?: boolean;
  /** Innleide vikarer til plasser verket mangler folk på, og hvor lenge (B-050) */
  tempCrew: { crew: Crew; untilMin: number } | null;
  /** Et kundebesøk har gitt en god forespørsel som kommer snart */
  bonusOffer: boolean;
  /** Avtalt utkobling fra nettselskapet: ingen nye charger i dette tidsrommet */
  gridCut: { fromMin: number; untilMin: number } | null;
  /** Fagboka (B-025): kapitler spilleren har åpnet, beståtte quizer og dagen en quiz sist ble feil */
  readChapters: string[];
  quizDone: string[];
  /** Antall riktige svar på hver quiz som er tatt (B-029) */
  quizScores: Record<string, number>;
  /** Oppdrag fra fagboka: telleren da oppdraget startet, og om det er fullført */
  missions: Record<string, { base: number; done: boolean }>;
  /** Tellere for oppdrag (planlagte omforinger, rene døgn …) */
  counters: Record<string, number>;
  /** Omdømmetap siste tid, med årsak, så rådgiveren kan se mønstre */
  repLog: { day: number; cause: RepCause }[];
  /** Dagen rådgiveren sist kom for hver årsak */
  advisorSeen: Record<string, number>;
  /** Innleide spesialister: årsak → spillminuttet de er ferdige */
  specialists: Record<string, number>;
  /** Steget i den veiledede starten; null = av eller ferdig (B-027) */
  tutorial: number | null;
  /** Trivselen blant de ansatte, 0–100 (B-026) */
  morale: number;
  /** Dagen det sist ble gitt bonus */
  lastBonusDay: number;
  /** Engangstips som er vist (B-033) */
  tipsSeen: string[];
  /** Hvorfor spillet er over, vist på sluttskjermen */
  gameOverReason?: string;
  /** Døgnet det sist kom en radioaktiv kilde med skrapet */
  lastRadioDay?: number;
  /** Kassa er under null, og spilleren har fått varsel om det */
  inCredit?: boolean;
  /** Døgn på rad der verket står fordi det ikke er råd til omforing og lånet er fullt */
  stuckDays?: number;
  /** Faner spilleren har sett (nye faner får et «Ny»-merke, B-023) */
  seenViews: string[];
  /** Nivået spilleren nettopp flyttet til, for feiring; null når det er sett */
  celebrate: number | null;
  /** Kunnskapskort spilleren har låst opp, i rekkefølge */
  knowledge: string[];
  unreadKnowledge: number;
}
