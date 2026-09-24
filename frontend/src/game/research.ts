/**
 * Fagpoeng og forskning (inspirert av forskningspoengene i Game Dev Tycoon).
 *
 * Fagpoeng tjenes ved å produsere, levere, kjøre charger selv – og ved å gjøre
 * feil, fordi man lærer av dem. Forskning koster fagpoeng, skjer med en gang og
 * låser opp utstyr, forbedringer og kapitler i fagboka.
 */
import { STAGES } from "./data";
import { knowledgeCard } from "./knowledge";
import type { GameState, ScrapId } from "./types";

export interface Research {
  id: string;
  name: string;
  stage: number;
  cost: number;
  requires?: string[];
  /** Utstyr (ovner, støping, tillegg) som ikke kan kjøpes før dette er forsket fram */
  unlocks?: string[];
  /** Skraptyper som kan kjøpes etter dette (resten er låst fra start, se START_SCRAP) */
  scrap?: ScrapId[];
  /** Raskeste spillfart dette låser opp (3× eller 10×) */
  speed?: number;
  /** Kapittel i fagboka som må være lest før man kan forske (B-025) */
  reads?: string;
  /** Fagbokkapittel som låses opp */
  knowledge?: string;
  description: string;
  /** Kort tekst om hva det gir, vist på kortet */
  effect: string;
}

export const RESEARCH: Research[] = [
  // Garasjen
  {
    id: "rutiner",
    name: "Faste rutiner",
    stage: 0,
    cost: 3,
    description: "Når du kan jobben, går den av seg selv mens du følger med.",
    effect: "Låser opp 3× fart",
    speed: 3,
  },
  {
    id: "skrapkjop",
    name: "Flere skrapleverandører",
    stage: 0,
    cost: 6,
    scrap: ["shredder", "spon"],
    description: "Skraphandleren har mer enn blandet og tungt skrap – hvis du vet hva du ber om.",
    effect: "Du kan kjøpe shredderskrap og spon",
  },
  {
    id: "stodig",
    name: "Stødig drift",
    stage: 0,
    cost: 10,
    requires: ["rutiner"],
    description: "Verket går jevnt nok til at du kan spole fram til noe skjer.",
    effect: "Låser opp 10× fart",
    speed: 10,
  },
  {
    id: "energistyring",
    name: "Energistyring",
    stage: 0,
    cost: 10,
    description: "Lokk på digelen, tettere ovn og riktig forvarming av skrapet.",
    effect: "5 % mindre energi per tonn",
  },
  {
    id: "kundepleie",
    name: "Kundepleie",
    stage: 0,
    cost: 12,
    unlocks: ["salgskontor"],
    description: "Ring kundene, følg opp leveransene og vær til å stole på.",
    effect: "Flere forespørsler og litt bedre priser. Åpner for salgskontor",
  },
  // Verkstedet
  {
    id: "induksjon",
    name: "Induksjonssmelting",
    stage: 1,
    cost: 20,
    unlocks: ["induksjon1", "induksjon5"],
    knowledge: "induksjon",
    description: "Smelting med vekselstrøm i en vannkjølt spole – rent, raskt og uten flamme.",
    effect: "Åpner for induksjonsovner",
  },
  {
    id: "maskinforming",
    name: "Maskinforming",
    stage: 1,
    cost: 12,
    unlocks: ["formlinje"],
    description: "Formmaskin og gjenbruk av formsand.",
    effect: "Åpner for formlinje",
  },
  {
    id: "rontgen",
    name: "Røntgenanalyse",
    stage: 1,
    cost: 15,
    unlocks: ["xrf"],
    knowledge: "analyse",
    description: "Røntgenfluorescens måler tunge elementer direkte på stålet.",
    effect: "Åpner for håndholdt analysator",
  },
  {
    id: "stralevern",
    name: "Strålevern",
    stage: 1,
    cost: 10,
    unlocks: ["portal"],
    knowledge: "radioaktivitet",
    description: "Hvordan radioaktive kilder havner i skrap, og hvordan de oppdages.",
    effect: "Åpner for strålingsportal",
  },
  {
    id: "nyskrap",
    name: "Rent nyskrap",
    stage: 1,
    cost: 10,
    scrap: ["rent"],
    description: "Avkapp fra fabrikker er rent og kjent, men koster mer. Det trengs til kvaliteter med strenge krav.",
    effect: "Du kan kjøpe rent nyskrap",
  },
  {
    id: "vedlikeholdsplan",
    name: "Vedlikeholdsplan",
    stage: 1,
    cost: 15,
    knowledge: "ildfast",
    description: "Planlagt stans er billigere enn havari. Bytt foringen før den er slitt, på faste dager.",
    effect: "Planlegg omforing hvert 4.–14. døgn",
  },
  {
    id: "opplaering",
    name: "Opplæringsprogram",
    stage: 1,
    cost: 25,
    knowledge: "folk",
    description: "Faste rutiner for opplæring og erfaringsoverføring.",
    effect: "Ansatte blir flinkere 60 % raskere",
  },
  // Støperiet
  {
    id: "blokkstoping",
    name: "Blokkstøping",
    stage: 2,
    cost: 90,
    unlocks: ["blokk"],
    knowledge: "stoping",
    description: "Støping i kokiller til blokker for smier og valseverk.",
    effect: "Åpner for blokkstøping",
  },
  {
    id: "spektrometri",
    name: "Spektrometri",
    stage: 2,
    cost: 120,
    unlocks: ["oes"],
    description: "Gnistspektrometer som måler hele analysen, også karbon og fosfor.",
    effect: "Åpner for spektrometer",
  },
  {
    id: "sortering",
    name: "Skrapsortering",
    stage: 2,
    cost: 75,
    unlocks: ["sortering"],
    knowledge: "skrap",
    description: "Plukke ut kobberledninger, motorer og skitt før skrapet går til ovnen.",
    effect: "Åpner for skrapsortering",
  },
  {
    id: "rajern",
    name: "Råjern",
    stage: 2,
    cost: 60,
    scrap: ["rajern"],
    description: "Råjern fra masovn er nesten fritt for kobber og tinn, og tynner ut sporelementene i resten av skrapet.",
    effect: "Du kan kjøpe råjern",
  },
  {
    id: "sikkerhet",
    name: "Sikkerhetskultur",
    stage: 2,
    cost: 90,
    unlocks: ["verksted"],
    description: "Risikovurderinger, forebyggende vedlikehold og orden på arbeidsplassen.",
    effect: "20 % færre havarier. Åpner for vedlikeholdsverksted",
  },
  {
    id: "ildfast",
    name: "Bedre ildfast",
    stage: 2,
    cost: 120,
    knowledge: "ildfast",
    description: "Bedre foringsmaterialer og riktig oppvarming av ny foring.",
    effect: "15 % mindre slitasje på foringen",
  },
  // Stålverket
  {
    id: "lysbue",
    name: "Lysbueteknikk",
    stage: 3,
    cost: 200,
    unlocks: ["lysbue30", "lysbue90", "renseanlegg"],
    knowledge: "lysbue",
    description: "Lysbuer fra grafittelektroder, oksygenlanser og basisk slagg.",
    effect: "Åpner for lysbueovner og røykgassrensing",
  },
  {
    id: "strengstoping",
    name: "Strengstøping",
    stage: 3,
    cost: 200,
    unlocks: ["streng1", "streng4"],
    knowledge: "streng",
    description: "Kontinuerlig støping gjennom en vannkjølt kokille.",
    effect: "Åpner for strengstøpemaskiner",
  },
  {
    id: "osemetallurgi",
    name: "Øsemetallurgi",
    stage: 3,
    cost: 200,
    requires: ["lysbue"],
    unlocks: ["oseovn"],
    knowledge: "oseovn",
    description: "Legering, oppvarming og spyling av stålet i øsa.",
    effect: "Åpner for øseovn",
  },
  {
    id: "forvarming",
    name: "Skrapforvarming",
    stage: 3,
    cost: 160,
    requires: ["lysbue"],
    unlocks: ["conveyor"],
    description: "Varm avgass forvarmer skrapet på vei inn i ovnen.",
    effect: "Åpner for conveyor med forvarming",
  },
  {
    id: "hoyeffekt",
    name: "Høyeffektdrift",
    stage: 3,
    cost: 160,
    requires: ["lysbue"],
    unlocks: ["trafo"],
    description: "Høyere spenning og lengre lysbue under skumslagg.",
    effect: "Åpner for større transformator",
  },
  {
    id: "skumslagg",
    name: "Skumslaggpraksis",
    stage: 3,
    cost: 200,
    requires: ["lysbue"],
    knowledge: "fosfor",
    description: "Riktig balanse av karbon, oksygen og kalk gir en slagg som skummer og holder på varmen.",
    effect: "6 % mindre strøm i lysbueovnen",
  },
  {
    id: "valsing",
    name: "Valseteknikk",
    stage: 3,
    cost: 240,
    requires: ["strengstoping"],
    unlocks: ["valseverk"],
    knowledge: "valsing",
    description: "Gjenoppvarming og valsing av emner til ferdig dimensjon.",
    effect: "Åpner for valseverk",
  },
  // Storverket
  {
    id: "eksport",
    name: "Eksportsertifisering",
    stage: 4,
    cost: 400,
    description: "Sertifiserte kvalitetssystemer som store utenlandske kunder krever.",
    effect: "Flere store forespørsler og 3 % bedre priser",
  },
];

/**
 * Kapitlet man må lese før hver forskning (B-025). Kapitlet kommer i fagboka så
 * snart forskningen er synlig, så lesing blir en del av å låse opp nye ting.
 */
const READS: Record<string, string> = {
  skrapkjop: "skrap",
  energistyring: "start",
  kundepleie: "omdomme",
  induksjon: "induksjon",
  maskinforming: "stoping",
  rontgen: "analyse",
  stralevern: "radioaktivitet",
  nyskrap: "skrap",
  vedlikeholdsplan: "ildfast",
  opplaering: "folk",
  blokkstoping: "stoping",
  spektrometri: "analyse",
  sortering: "skrap",
  rajern: "karbon",
  sikkerhet: "folk",
  ildfast: "ildfast",
  lysbue: "lysbue",
  strengstoping: "streng",
  osemetallurgi: "oseovn",
  forvarming: "lysbue",
  hoyeffekt: "strom",
  skumslagg: "fosfor",
  valsing: "valsing",
  eksport: "omdomme",
};
for (const r of RESEARCH) r.reads = READS[r.id];

/** Skraptypene man kan kjøpe fra start */
export const START_SCRAP: ScrapId[] = ["blandet", "tungt", "retur"];

export function scrapUnlocked(g: GameState, id: ScrapId): boolean {
  return START_SCRAP.includes(id) || RESEARCH.some((r) => r.scrap?.includes(id) && hasResearch(g, r.id));
}

/** Forskningen som låser opp en skraptype */
export function researchForScrap(id: ScrapId): Research | undefined {
  return RESEARCH.find((r) => r.scrap?.includes(id));
}

/** Raskeste fart spilleren har låst opp */
export function maxSpeed(g: GameState): number {
  return Math.max(1, ...RESEARCH.filter((r) => r.speed && hasResearch(g, r.id)).map((r) => r.speed!));
}

/** Forskningen som låser opp en fart */
export function researchForSpeed(speed: number): Research | undefined {
  return RESEARCH.find((r) => r.speed === speed);
}

export function hasResearch(g: GameState, id: string): boolean {
  return g.researched.includes(id);
}

/** Forskningen som låser opp et utstyr, hvis den ikke er gjort ennå. */
export function missingResearchFor(g: GameState, equipmentId: string): Research | undefined {
  return RESEARCH.find((r) => r.unlocks?.includes(equipmentId) && !hasResearch(g, r.id));
}

export interface ResearchOption extends Research {
  done: boolean;
  available: boolean;
  locked: boolean;
  reason: string | null;
}

export function researchOptions(g: GameState): ResearchOption[] {
  return RESEARCH.map((r) => {
    const done = hasResearch(g, r.id);
    const locked = r.stage > g.stage;
    let reason: string | null = null;
    if (locked) reason = `Krever ${STAGES[r.stage].name.toLowerCase()}`;
    else {
      const missing = (r.requires ?? []).find((id) => !hasResearch(g, id));
      if (missing) reason = `Krever ${RESEARCH.find((x) => x.id === missing)?.name.toLowerCase() ?? missing}`;
      else if (r.reads && !g.readChapters.includes(r.reads))
        reason = `Les «${knowledgeCard(r.reads)?.title ?? r.reads}» i fagboka først`;
      else if (g.researchPoints < r.cost) reason = `Mangler ${Math.ceil(r.cost - g.researchPoints)} fagpoeng`;
    }
    return { ...r, done, locked, available: !done && reason === null, reason: done ? null : reason };
  });
}
