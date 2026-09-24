/**
 * Fagpoeng og forskning (inspirert av forskningspoengene i Game Dev Tycoon).
 *
 * Fagpoeng tjenes ved å produsere, levere, kjøre charger selv – og ved å gjøre
 * feil, fordi man lærer av dem. Forskning koster fagpoeng, skjer med en gang og
 * låser opp utstyr, forbedringer og kapitler i fagboka.
 */
import { STAGES } from "./data";
import type { GameState } from "./types";

export interface Research {
  id: string;
  name: string;
  stage: number;
  cost: number;
  requires?: string[];
  /** Utstyr (ovner, støping, tillegg) som ikke kan kjøpes før dette er forsket fram */
  unlocks?: string[];
  /** Fagbokkapittel som låses opp */
  knowledge?: string;
  description: string;
  /** Kort tekst om hva det gir, vist på kortet */
  effect: string;
}

export const RESEARCH: Research[] = [
  // Garasjen
  {
    id: "energistyring",
    name: "Energistyring",
    stage: 0,
    cost: 6,
    description: "Lokk på digelen, tettere ovn og riktig forvarming av skrapet.",
    effect: "5 % mindre energi per tonn",
  },
  {
    id: "kundepleie",
    name: "Kundepleie",
    stage: 0,
    cost: 8,
    unlocks: ["salgskontor"],
    description: "Ring kundene, følg opp leveransene og vær til å stole på.",
    effect: "Flere forespørsler og litt bedre priser. Åpner for salgskontor",
  },
  // Verkstedet
  {
    id: "induksjon",
    name: "Induksjonssmelting",
    stage: 1,
    cost: 12,
    unlocks: ["induksjon1", "induksjon5"],
    knowledge: "induksjon",
    description: "Smelting med vekselstrøm i en vannkjølt spole – rent, raskt og uten flamme.",
    effect: "Åpner for induksjonsovner",
  },
  {
    id: "maskinforming",
    name: "Maskinforming",
    stage: 1,
    cost: 8,
    unlocks: ["formlinje"],
    description: "Formmaskin og gjenbruk av formsand.",
    effect: "Åpner for formlinje",
  },
  {
    id: "rontgen",
    name: "Røntgenanalyse",
    stage: 1,
    cost: 10,
    unlocks: ["xrf"],
    knowledge: "analyse",
    description: "Røntgenfluorescens måler tunge elementer direkte på stålet.",
    effect: "Åpner for håndholdt analysator",
  },
  {
    id: "stralevern",
    name: "Strålevern",
    stage: 1,
    cost: 6,
    unlocks: ["portal"],
    knowledge: "radioaktivitet",
    description: "Hvordan radioaktive kilder havner i skrap, og hvordan de oppdages.",
    effect: "Åpner for strålingsportal",
  },
  {
    id: "opplaering",
    name: "Opplæringsprogram",
    stage: 1,
    cost: 15,
    knowledge: "folk",
    description: "Faste rutiner for opplæring og erfaringsoverføring.",
    effect: "Ansatte blir flinkere 60 % raskere",
  },
  // Støperiet
  {
    id: "blokkstoping",
    name: "Blokkstøping",
    stage: 2,
    cost: 60,
    unlocks: ["blokk"],
    knowledge: "stoping",
    description: "Støping i kokiller til blokker for smier og valseverk.",
    effect: "Åpner for blokkstøping",
  },
  {
    id: "spektrometri",
    name: "Spektrometri",
    stage: 2,
    cost: 80,
    unlocks: ["oes"],
    description: "Gnistspektrometer som måler hele analysen, også karbon og fosfor.",
    effect: "Åpner for spektrometer",
  },
  {
    id: "sortering",
    name: "Skrapsortering",
    stage: 2,
    cost: 50,
    unlocks: ["sortering"],
    knowledge: "skrap",
    description: "Plukke ut kobberledninger, motorer og skitt før skrapet går til ovnen.",
    effect: "Åpner for skrapsortering",
  },
  {
    id: "sikkerhet",
    name: "Sikkerhetskultur",
    stage: 2,
    cost: 60,
    unlocks: ["verksted"],
    description: "Risikovurderinger, forebyggende vedlikehold og orden på arbeidsplassen.",
    effect: "20 % færre havarier. Åpner for vedlikeholdsverksted",
  },
  {
    id: "ildfast",
    name: "Bedre ildfast",
    stage: 2,
    cost: 80,
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
    cost: 150,
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
    cost: 120,
    requires: ["lysbue"],
    unlocks: ["conveyor"],
    description: "Varm avgass forvarmer skrapet på vei inn i ovnen.",
    effect: "Åpner for conveyor med forvarming",
  },
  {
    id: "hoyeffekt",
    name: "Høyeffektdrift",
    stage: 3,
    cost: 120,
    requires: ["lysbue"],
    unlocks: ["trafo"],
    description: "Høyere spenning og lengre lysbue under skumslagg.",
    effect: "Åpner for større transformator",
  },
  {
    id: "skumslagg",
    name: "Skumslaggpraksis",
    stage: 3,
    cost: 150,
    requires: ["lysbue"],
    knowledge: "fosfor",
    description: "Riktig balanse av karbon, oksygen og kalk gir en slagg som skummer og holder på varmen.",
    effect: "6 % mindre strøm i lysbueovnen",
  },
  {
    id: "valsing",
    name: "Valseteknikk",
    stage: 3,
    cost: 180,
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
    cost: 300,
    description: "Sertifiserte kvalitetssystemer som store utenlandske kunder krever.",
    effect: "Flere store forespørsler og 3 % bedre priser",
  },
];

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
      else if (g.researchPoints < r.cost) reason = `Mangler ${Math.ceil(r.cost - g.researchPoints)} fagpoeng`;
    }
    return { ...r, done, locked, available: !done && reason === null, reason: done ? null : reason };
  });
}
