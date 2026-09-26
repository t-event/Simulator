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
  /** Dagen kontrakten ble signert (B-161); mangler i eldre lagringer */
  acceptedDay?: number;
  /** Minste margin til kravene i partiene som er levert, 0–1 (B-161) */
  qMargin?: number;
  /** Kundens vurdering 1–10 når kontrakten er levert (B-161) */
  rating?: number;
  /** Hvorfor kunden ga den karakteren, kort */
  ratingNote?: string;
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
  /** Dagene sykefraværene startet, de siste tolv (B-101) */
  sickDays?: number[];
  /** Dagen den ansatte sist fikk en advarsel om fravær (B-101) */
  warnedDay?: number;
  /** Lærling (B-163): døgnet lærlingen går opp til fagprøven. Mangler for dem som ikke er lærlinger */
  apprenticeUntil?: number;
}

/** Tema for varsler, så spilleren kan velge hva som dukker opp på skjermen (B-115) */
export type LogTopic = "fravaer" | "havari" | "okonomi" | "fremgang" | "salg" | "marked" | "folk" | "annet";

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
export type IncomeCategory = "kontrakt" | "spot" | "annet" | "konsern";

/** Salgsdirektøren i konsernet (B-117) */
export interface SalesDirector {
  hiredDay: number;
  /** Kontrakter og rammeavtaler signert siden ansettelsen */
  contracts: number;
  agreements: number;
  /** Tar også rammeavtaler, ikke bare vanlige kontrakter */
  agreementsOn: boolean;
  /** Skrudd på: signerer av seg selv. Av: gjør ingenting, men får fortsatt lønn (B-122) */
  active: boolean;
}

/** Datterverk i konsernet (B-106) */
export type SisterType = "stalverk" | "storverk" | "kompleks";
/** Mesterskap (B-150): forskning som kan tas om og om igjen */
export type MasteryId = "pris" | "strom" | "skrap" | "datterverk";
export interface SisterPlant {
  id: number;
  type: SisterType;
  name: string;
  /** Moderniseringstrinn 0–3 */
  level: number;
  boughtDay: number;
  /** Står etter havari til denne dagen */
  downUntilDay: number;
}

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
  /** Hva døgnets strøm ville kostet med hver avtale (B-105) */
  altEnergy?: Partial<Record<PowerDeal, number>>;
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
  /** Hvilke hendelser som vises i varsellinja (B-089): etter temaene, eller bare problemer. «Ingen» er fjernet (B-144) */
  toasts: "alle" | "problemer";
  /** Temaer som er slått av for varsler på skjermen; mangler et tema, vises det (B-115) */
  toastTopics: Partial<Record<LogTopic, boolean>>;
  /** Sekunder et varsel står på skjermen (B-115) */
  toastSeconds: number;
  /** Etter et kort fortsetter spillet på farten fra før (3× eller 10×) i stedet for 1× (B-160) */
  keepSpeed: boolean;
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

/** Felles hendelse i markedet fra serveren (B-129): ganger prisene så lenge den varer */
export interface WorldEvent {
  id: number;
  kind: string;
  title: string;
  text: string;
  scrap: number;
  steel: number;
  power: number;
  /** ISO-tidspunkt for når den slutter (ekte tid) */
  until: string;
}

/** Sesongens vri (B-152): gjelder hele sesongen, bare for spill som er med i den */
export interface SeasonTwist {
  id: string;
  title: string;
  text: string;
  scrap: number;
  steel: number;
  power: number;
}

export interface Market {
  steelFactor: number;
  scrapFactor: Record<ScrapId, number>;
  powerFactor: number;
  powerSpikeDays: number;
  /** Tørr periode: strømprisen ligger høyt i flere uker (B-105) */
  powerDryDays: number;
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
  /** Siste logglinje spilleren har sett i varsellista (B-089) */
  inboxSeenId: number;
  /** Runde: 1 for nye spill. 2+ finnes bare i eldre lagringer fra nytt spill+ (B-090), som er fjernet (B-141). */
  round: number;
  /** Spilleren har sett seiersskjermen og valgt å spille videre */
  winSeen: boolean;
  /** Plasser brukt i kursrunden som starter på dag «start» (B-100) */
  courseSeats: { start: number; used: number } | null;
  /** Støping som kjøpes av seg selv når ordrene på det gamle produktet er levert (B-102) */
  pendingCastingSwitch: string | null;
  /** Sist det ble varslet om fullt ferdigvarelager (spillminutt), så varselet ikke gjentas hele tida (B-118) */
  storeFullLogMin: number;
  /** Kontoen spillet er koblet til (konto-id fra innloggingen), eller null uten konto (B-125) */
  owner: string | null;
  /** Sesongen spillet er med i (B-129), eller null */
  season: number | null;
  /** Sesongen spilleren sist svarte på spørsmålet om, så det ikke stilles igjen */
  seasonPromptSeen: number | null;
  /** Sesongen en spiller uten konto sist fikk beskjed om at man må logge inn for å være med (B-131) */
  seasonLoginPromptSeen: number | null;
  /** Felles hendelser fra serveren som pågår nå, og hvilke spilleren alt har fått beskjed om (B-129) */
  world: { events: WorldEvent[]; seenEventIds: number[]; twist?: SeasonTwist | null };
  /** Konsernet (B-106) */
  konsern: {
    unlocked: boolean;
    plants: SisterPlant[];
    shared: string[];
    nextId: number;
    /** Salgsdirektøren som signerer kontrakter og rammeavtaler selv (B-117); null = ikke ansatt */
    director: SalesDirector | null;
    /** Antall milepæler for konsernverdien som er nådd (B-119) */
    milestones: number;
    /** Antall stålmilepæler etter sluttmålet som er nådd (25 mrd … 1 billion, B-150) */
    legends: number;
  };
  /** Mesterskap (B-150): nivå per prosjekt */
  mastery: Partial<Record<MasteryId, number>>;
  /** Ny tittel som skal feires (indeks i LEGENDS), eller null (B-150) */
  legendCelebrate: number | null;
  /** Prestasjoner (B-151): id → dagen den ble nådd */
  achievements: Record<string, number>;
  /** Pynt (B-151): kjøpt og slått på */
  cosmetics: { owned: string[]; on: string[] };
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
  /** Kundenes vurderinger av de siste leveransene, 1–10, nyeste sist (B-161) */
  ratings: number[];
  /** Dagens oppdrag (B-149): datoen (norsk dato fra serveren), oppdragene og om bonusen er hentet */
  daily: DailyState;
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

/** Et av dagens oppdrag (B-149): fremdriften er økningen i et tall i spillet fra `base` */
export type MissionId =
  | "kontrakter"
  | "tonn"
  | "selv"
  | "forsk"
  | "les"
  | "quiz"
  | "omdomme"
  // Sluttspillet (B-153)
  | "mester"
  | "verdi"
  | "datter";
export interface DailyMission {
  id: MissionId;
  /** Tallet ved dagens start */
  base: number;
  target: number;
}
export interface DailyState {
  date: string | null;
  missions: DailyMission[];
  claimed: boolean;
}
