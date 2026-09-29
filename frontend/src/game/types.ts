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
  | "murer"
  | "skiftleder";
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
  /** Døgnet ovnen ble ferdig bygget om, så den kjøres inn (B-336); mangler når den går for fullt */
  rampFromDay?: number;
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
  /** Landemerket kontrakten gjelder (B-174) */
  landmark?: string;
  /** Forespørselen kom mens etterspørselen etter kvaliteten eller varen var høy (B-255) */
  trend?: boolean;
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
  /** «lederkurs»: på lederutvikling for å bli skiftleder (B-210) */
  absentReason?: "syk" | "ferie" | "lederkurs";
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
  | "konsern"
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
  /** Oppgraderinger (B-172): 0 ingen, 1 salgsteam, 2 kundenettverk, 3 eksportkontor */
  level?: number;
}

/** Datterverk i konsernet (B-106) */
export type SisterType = "stalverk" | "storverk" | "kompleks";
/** Mesterskap (B-150): forskning som kan tas om og om igjen */
export type MasteryId = "pris" | "strom" | "skrap" | "datterverk" | "foring";
export interface SisterPlant {
  id: number;
  type: SisterType;
  name: string;
  /** Moderniseringstrinn 0–3 */
  level: number;
  boughtDay: number;
  /** Står etter havari til denne dagen */
  downUntilDay: number;
  /** Bygging, utbygging eller modernisering som pågår, i ekte tid (B-209). Mangler i eldre lagringer */
  project?: SisterProject;
  /** Regionen på verdenskartet (B-333), satt av serveren. Mangler i eldre lagringer */
  region?: RegionId;
  /** Flyttet til en annen region – hvert verk kan flyttes én gang (B-333) */
  moved?: boolean;
}

/** Et stort kjøp under bygging (B-336): nok til å fullføre kjøpet når det er ferdig */
export interface BigBuild {
  id: string;
  baseId: string;
  unit?: number;
  kind: "furnace" | "casting" | "addon";
  name: string;
  price: number;
  stage: number;
  startMin: number;
  readyMin: number;
}

export type NeighborId = "idrettshall" | "kulturhus" | "bro" | "skole" | "sykehus" | "konserthus";

/** Utbyttepolitikken (B-334): hvor mye datterverkene holder igjen – 30, 50 eller 70 % */
export type PolicyId = "ut" | "balansert" | "forsvar";

/** Regionene i den oppdiktede verdenen (B-331, B-333); navnene står i `game/regions.ts` */
export type RegionId = "nord" | "jern" | "ost" | "sor" | "vest" | "oy";

/** Et byggeprosjekt i konsernet (B-209): tar ekte timer, uansett spillfart */
export interface SisterProject {
  kind: "bygg" | "utbygging" | "modernisering";
  /** Ekte tid (ms siden 1970) da prosjektet startet og blir ferdig */
  startedAt: number;
  readyAt: number;
}

/**
 * Et prosjekt i konsernkøen på serveren (B-326): betalt fra konsernkassa når det ble bestilt, bygges i rekkefølge.
 * Kopi av det serveren sier (`konsern_status`); appen viser den og starter prosjektene i takt med serveren.
 */
export interface KonsernOrder {
  id: number;
  kind: SisterProject["kind"];
  plantId: number;
  /** Typen for et nytt verk (bygg), ellers null */
  type: SisterType | null;
  /** Navnet på et nytt verk, ellers null */
  name: string | null;
  cost: number;
  /** Ekte tid (ms) da prosjektet starter og blir ferdig */
  startsAt: number;
  readyAt: number;
  status: "kø" | "i gang";
  boughtDay?: number;
  /** Regionen et nytt verk bygges i (B-333), ellers null eller mangler */
  region?: RegionId | null;
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
/** Utslipp fra ovnene (B-263): renseanlegget kan være for lite eller havarere, og da blir det bot */
export interface EnvState {
  /** Renseanlegget står etter et havari til dette spillminuttet (0 = i drift) */
  downUntilMin: number;
  /** Hva ovnene gjør når renseanlegget havarerer: stoppe eller kjøre videre. null = ikke valgt (kortet spør første gang) */
  onBreakdown: "stopp" | "kjor" | null;
  /** Tonn smeltet i dag uten at røyken ble renset */
  excessT: number;
  /** Av dem: tonn mens renseanlegget sto (havari) */
  downT: number;
  /** Alle bøter for utslipp til nå */
  finesKr: number;
  /** Siste bot: døgnet, tonnene og beløpet */
  lastFine: { day: number; t: number; kr: number } | null;
  /** Eldre lagringer: får renseanlegg som holder for ovnene de har, én gang (B-263) */
  grant?: boolean;
}

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
  /** Skiftlederen leier inn vikarer for alle som er borte, også når skiftene går likevel (B-211). Mangler = av */
  leaderTemps?: boolean;
  /** Skiftlederen gir alle bonus når det er lenge siden eller trivselen er lav (B-271). Mangler = av */
  leaderBonus?: boolean;
  /** Klokketimen skiftene starter (6, 14 eller 22) */
  shiftStart: number;
  /** Start ikke ny charge når strømprisen er over dette (kr/kWh). null = ingen grense */
  maxPowerPrice: number | null;
  autoBuy: boolean;
  /** Hvor mange dagers forbruk automatisk innkjøp skal holde på lager */
  autoBuyDays: number;
  /** Planleggeren holder så mange tonn skrap på lager i stedet for døgnforbruket (B-271). Mangler/null = automatisk */
  autoBuyTargetT?: number | null;
  /** Planleggeren kan handle på kassekreditten (B-027) */
  autoBuyCredit: boolean;
  /** Planleggeren selger skrap ingen resept i ordrekøen bruker, når lageret er for fullt til det som trengs (B-171) */
  plannerSells: boolean;
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
  /** Spillet står på pause mens Salg er åpen, og går videre på samme fart etterpå (B-222) */
  pauseOnSales: boolean;
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
  /** Ovnens avfosforering, strøm per tonn og smeltetid, så spillet i kontrollrommet gir samme skala (B-175) */
  dephos?: number;
  kwhPerT?: number;
  cycleMin?: number;
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

/** En trend i markedet (B-255): etterspørselen etter én kvalitet eller vare går opp eller ned i noen døgn */
export interface MarketTrend {
  kind: "kvalitet" | "vare";
  id: GradeId | ProductId;
  up: boolean;
  fromDay: number;
  untilDay: number;
}

export interface Market {
  steelFactor: number;
  scrapFactor: Record<ScrapId, number>;
  powerFactor: number;
  powerSpikeDays: number;
  /** Tørr periode: strømprisen ligger høyt i flere uker (B-105) */
  powerDryDays: number;
  spotSoldToday: Partial<Record<ProductId, number>>;
  /** Trenden nå, eller null (B-255) */
  trend?: MarketTrend | null;
  /** Første døgn en ny trend kan starte */
  nextTrendDay?: number;
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
  /** Dagen skrapklasseren sist byttet inn annet skrap (B-171), så loggen får det én gang per døgn */
  graderSubDay?: number;
  /** Kvaliteten strengstøpemaskinen sist støpte, og når den ble ferdig (B-046) */
  lastCast: { grade: GradeId; min: number } | null;
  castProgressT: number;
  castDownUntilMin: number;
  castWait: string | null;
  /** Kokillene i strengstøpingen: slitasje 0–1,5 og dagen de sist ble byttet (B-351). Mangler i eldre lagringer = nye */
  mould?: { wear: number; lastDay: number };
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
  totals: {
    producedT: number;
    heats: number;
    manualHeats: number;
    contractsDone: number;
    complaints: number;
    /** Kroner brukt på vedlikehold og havarier i alt – til det mekaniske verkstedet på serveren (B-256) */
    maintKr: number;
  };
  negativeDays: number;
  gameOver: boolean;
  won: boolean;
  pendingManual: ManualRequest | null;
  /** Beste poengsum i kontrollrommet (B-175) */
  controlBest?: number;
  /** Spillminutter som er spolt fram om natta (6×), så juksesperren kan regne ut hvor lang tid dagene minst tar (B-176) */
  boostMin?: number;
  /**
   * Kroner flyttet fra spillet til konsernkassa på serveren (B-183). Går aldri ned: serveren trekker kassa hvis et
   * spill med lavere tall lagres (en annen nettleser, en tilbakerulling), så pengene ikke kan dobles.
   */
  treasuryOut?: number;
  /**
   * Midlertidig bunden konsernreserve (B-193): det kassa ville hatt over den myke grensen. Kan ikke brukes eller
   * flyttes til konsernkassa, teller ikke som penger på bok, men i konsernverdien. null til første gang det skjer.
   */
  lockedReserve?: { total: number; firstDay: number; movedToday: number } | null;
  /**
   * Utbetalt til eierne (B-303): det kassa ville hatt over taket. Historikk som ikke teller i konsernverdien og ikke
   * kan brukes. Den gamle reserven regnes som utbetalt (`paidOutTotal`). null til første gang det skjer.
   */
  paidOut?: { total: number; firstDay: number; today: number } | null;
  /** Øker når serveren endrer spillet (B-211), f.eks. økonomireformen. En enhet med et eldre spill (lavere tall) får
   * ikke lagre over det; appen henter spillet fra nett i stedet. Mangler i eldre lagringer (= 0) */
  serverEdit?: number;
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
  /** Varselet om at et planlagt bytte venter på penger er gitt (B-170) */
  switchWaitNoted?: boolean;
  /** Dagen et planlagt bytte begynte å vente på penger (B-171), eller null */
  switchWaitDay?: number | null;
  /** Sist det ble varslet om fullt ferdigvarelager (spillminutt), så varselet ikke gjentas hele tida (B-118) */
  storeFullLogMin: number;
  /** Kontoen spillet er koblet til (konto-id fra innloggingen), eller null uten konto (B-125) */
  owner: string | null;
  /**
   * Hvilket spill dette er (B-259), tilfeldig ved nytt spill. Skiller en eldre kopi av samme spill fra et nytt spill,
   * så en gammel kopi på en enhet ikke kan lastes opp over spillet på nett. Eldre spill har ingen (sammenlignes da på
   * sesong) – den lages aldri i ettertid, for da ville to kopier av samme spill fått hver sin.
   */
  gameId?: string;
  /** Sesongen spillet er med i (B-129), eller null */
  season: number | null;
  /** Sesongen spilleren sist svarte på spørsmålet om, så det ikke stilles igjen */
  seasonPromptSeen: number | null;
  /** Det siste anbudsresultatet spilleren har fått varsel om (B-237), 0 hvis ingen */
  tenderSeen: number;
  /**
   * Et stort kjøp som bygges i spilltid (B-336): hva det er, og når det er ferdig (spillminutt). Null uten bygg.
   * Bare ett om gangen
   */
  bigBuild: BigBuild | null;
  /** Døgnet en ny støpemaskin ble ferdig, så den kjøres inn (B-336) */
  castingRampFromDay?: number;
  /** Nabolagsprosjektene (B-336): det som er bygget, og det som bygges nå */
  neighborhood: { built: NeighborId[]; building: { id: NeighborId; readyMin: number } | null };
  /** Siste avgjorte overtakelse spilleren har fått beskjed om (B-335), tidspunktet fra serveren; tom før første */
  takeoverSeen: string;
  /** Per selskap (id): den siste UTC-dagen eieren har fått beskjed om inntekten for (B-258) */
  companyIncomeSeen: Record<string, string>;
  /** Den siste UTC-dagen spilleren har fått beskjed om utbyttet fra datterverkene for (B-304), eller null */
  dividendSeen?: string | null;
  /** Utslipp, renseanlegget og bøter (B-263) */
  env: EnvState;
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
    /**
     * Konsernnivået (titlene): før B-325 etter verdien, nå fra serveren etter verkene (nivåstigen i konsernWorld.ts).
     * Går aldri ned.
     */
    legends: number;
    /** Køen av prosjekter på serveren (B-326), kopi av det serveren sier */
    orders: KonsernOrder[];
    /**
     * Konsernkassa sist serveren svarte (B-326): saldo og omtrent hva som kommer inn per ekte dag (bidrag og utbytte).
     * Bare til knappene og rådene; null uten konto
     */
    treasury: { balance: number; perDay: number } | null;
    /**
     * Utbyttepolitikken og forsvarsfondet (B-334), fra serveren: valget, når det sist ble endret (ekte tid, ms) og
     * fondet. Mangler uten konto og i eldre lagringer
     */
    policy?: { kind: PolicyId; changedAt: number | null; fund: number };
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
  /** Ekte tid (ms) da hvert kort sist ble vist (B-210): samme kort kommer ikke igjen på 20 minutter, uansett spillfart */
  decisionSeenAt?: Record<string, number>;
  /** Landemerker (B-174): levert, dagen det siste kom (mobilens dato) og kontrakten som pågår */
  landmarks?: { done: string[]; date: string | null; contractId: number | null };
  /** Hendelser som er ordnet for dette nivået, f.eks. støyskjerm mot naboklager (B-171) og kameraer mot kobbertyver
   * (B-210): nivået det ble gjort på */
  decisionFixed?: Record<string, number>;
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
  /** Svar på en quiz som er påbegynt (B-234): ett spørsmål om gangen, og svaret står fast når det er gitt */
  quizPartial: Record<string, number[]>;
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
  /** Veien er stengt av snøstorm til dette spillminuttet; skrapbilene kommer ikke fram (B-279) */
  snowUntilMin?: number;
  /** Spillminuttene da en forespørsel som passet verket, gikk ut uten svar (B-292). Tømmes når du signerer en kontrakt */
  missedOffers?: number[];
  /** Merker bare serveren vet om (B-296), f.eks. «reform» for dem som ble berørt av økonomireformen */
  serverBadges?: string[];
  /** Krig i verden (B-297): den siste krigen (også når den er over), så det blir høyst én per år. null = ingen ennå */
  war?: { year: number; fromDay: number; untilDay: number; strength: number } | null;
  /** Fellesferien (B-298): året det gjelder og valget – sommerstans eller sommervikarer. null = ikke valgt ennå */
  summer?: { year: number; choice: "stans" | "vikarer" } | null;
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
