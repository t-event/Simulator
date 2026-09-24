/**
 * Quiz i fagboka (B-025): to spørsmål per kapittel. Alt riktig første gang gir
 * fagpoeng. Svarer man feil, kan man prøve igjen neste døgn.
 */
import { awardPoints, log } from "./engine";
import { knowledgeCard } from "./knowledge";
import { day } from "./plant";
import type { GameState } from "./types";

export interface QuizQuestion {
  q: string;
  options: string[];
  /** Indeksen til riktig svar */
  correct: number;
  /** Forklaring som vises etter svaret */
  why: string;
}

export const QUIZ: Record<string, QuizQuestion[]> = {
  start: [
    {
      q: "Hva bestemmer hvor mye stål verket får levert?",
      options: ["Den største ovnen", "Den tregeste delen av kjeden", "Antall kunder"],
      correct: 1,
      why: "Kjeden går fra skraplager til kunde. Står ett ledd og venter, venter alle.",
    },
    {
      q: "Hva skjer hvis stålet ikke holder kravene til kunden?",
      options: ["Ingenting, kunden merker det ikke", "Det koster penger og omdømme", "Kunden betaler mer"],
      correct: 1,
      why: "Feil kvalitet gir reklamasjon: pengene tilbake og dårligere rykte.",
    },
  ],
  skrap: [
    {
      q: "Hvordan får du ned kobber og tinn i stålet?",
      options: ["Blåse inn oksygen", "Tynne ut med rent skrap eller råjern", "Varme stålet mer opp"],
      correct: 1,
      why: "Sporelementer går ikke i slaggen. Det eneste som hjelper, er å blande inn noe renere.",
    },
    {
      q: "Hvorfor er ikke det billigste skrapet alltid billigst?",
      options: [
        "Det har mer rust og skitt, og gir mindre stål og mer energibruk",
        "Det er tyngre å frakte",
        "Det smelter ikke",
      ],
      correct: 0,
      why: "Rust, jord og olje blir slagg og røyk, ikke stål – og de koster energi å varme opp.",
    },
  ],
  karbon: [
    {
      q: "Hvordan tar du karbon ut av stålet i en induksjonsovn?",
      options: ["Med oksygen", "Med kalk", "Det går ikke – det du putter inn, blir i stålet"],
      correct: 2,
      why: "Induksjonsovnen har verken oksygen eller slagg som kan brenne av karbon.",
    },
    {
      q: "Hva gir mer karbon i stålet?",
      options: ["Hardere og sterkere stål", "Mykere stål", "Stål som ruster mindre"],
      correct: 0,
      why: "Karbon gjør stålet hardere og sterkere, men vanskeligere å sveise og forme.",
    },
  ],
  induksjon: [
    {
      q: "Hva varmer stålet i en induksjonsovn?",
      options: ["En gassflamme", "Vekselstrøm i en vannkjølt spole", "Lysbuer fra elektroder"],
      correct: 1,
      why: "Spolen lager et magnetfelt som setter opp strøm i selve metallet, så det varmes innenfra.",
    },
    {
      q: "Kan induksjonsovnen fjerne fosfor?",
      options: ["Ja, lett", "Bare med råjern", "Nei, fosfor blir der det er"],
      correct: 2,
      why: "Fosfor krever en oksiderende, basisk slagg. Det har ikke induksjonsovnen.",
    },
  ],
  analyse: [
    {
      q: "Hva kan en håndholdt røntgenanalysator (XRF) ikke måle godt?",
      options: ["Kobber", "Karbon", "Nikkel"],
      correct: 1,
      why: "Røntgen ser tunge grunnstoffer. Lette grunnstoffer som karbon må måles med gnistspektrometer.",
    },
    {
      q: "Hvorfor lønner det seg å måle analysen?",
      options: [
        "Du leverer bare partier du vet holder kravet",
        "Stålet blir sterkere av å bli målt",
        "Kunden betaler for målingen",
      ],
      correct: 0,
      why: "Uten måling gjetter du, og et dårlig parti merkes først når kunden klager.",
    },
  ],
  stoping: [
    {
      q: "Hva skjer hvis stålet er for kaldt når det støpes?",
      options: ["Det blir sterkere", "Det kan fryse i innløpet", "Ingenting"],
      correct: 1,
      why: "Stålet trenger litt overheting for å renne ut i formen før det størkner.",
    },
    {
      q: "Hva skjer med innløp og kapp som ikke blir produkt?",
      options: ["Kastes", "Selges som skrap til andre", "Går tilbake som returskrap"],
      correct: 2,
      why: "Returskrapet er gratis og har kjent analyse – fint å bruke i neste charge.",
    },
  ],
  folk: [
    {
      q: "Hvor mange timer i døgnet går verket med tre skift?",
      options: ["8", "16", "24"],
      correct: 2,
      why: "Tre skift à 8 timer dekker hele døgnet.",
    },
    {
      q: "Når betales lønn?",
      options: ["Bare når verket går", "Hver dag, også når verket står", "Bare når en kontrakt leveres"],
      correct: 1,
      why: "Folk får lønn uansett. Et ekstra skift lønner seg bare hvis du får solgt det dere lager.",
    },
  ],
  ildfast: [
    {
      q: "Hva er billigst?",
      options: ["Planlagt omforing", "Å kjøre til foringen brenner gjennom", "Det koster det samme"],
      correct: 0,
      why: "Gjennombrenning gir lang stans, dyr reparasjon og tapt omdømme.",
    },
    {
      q: "Hva sliter mest på foringen?",
      options: ["Kaldt skrap", "For varmt stål og feil slagg", "Lang pause mellom chargene"],
      correct: 1,
      why: "Høy temperatur og aggressiv slagg spiser ildfaststeinen raskere.",
    },
  ],
  radioaktivitet: [
    {
      q: "Hvor kommer radioaktive kilder i skrap fra?",
      options: ["Gamle måleinstrumenter og medisinsk utstyr", "Rustent stål", "Aluminiumsbokser"],
      correct: 0,
      why: "Kilder fra industri og sykehus kan havne i skrapet hvis de ikke leveres riktig.",
    },
    {
      q: "Hva er det beste vernet?",
      options: ["Å smelte fort", "Å måle alt skrap i porten", "Å bruke bare billig skrap"],
      correct: 1,
      why: "En strålingsportal koster lite sammenlignet med en opprydding.",
    },
  ],
  strom: [
    {
      q: "Når er strømmen vanligvis billigst?",
      options: ["Om morgenen", "Om ettermiddagen", "Om natta"],
      correct: 2,
      why: "Om natta bruker folk og industri minst, så prisen er lavest.",
    },
    {
      q: "Hva er effekttariffen?",
      options: ["En avgift for døgnets høyeste effektuttak", "Prisen per kWh", "En bot for å bruke for lite strøm"],
      correct: 0,
      why: "Nettet må bygges for toppen. Kjører mange ovner samtidig, blir toppen – og regningen – større.",
    },
  ],
  lysbue: [
    {
      q: "Hva gjør skumslaggen?",
      options: ["Kjøler badet", "Legger seg rundt lysbuen og holder på varmen", "Fjerner kobber"],
      correct: 1,
      why: "Gassbobler får slaggen til å skumme opp rundt lysbuen, så mindre varme går til taket og veggene.",
    },
    {
      q: "Hvorfor tilsettes kalk?",
      options: ["For å gi en basisk slagg", "For å få mer karbon", "For å farge stålet"],
      correct: 0,
      why: "Basisk slagg skummer bedre og tar opp fosfor.",
    },
  ],
  fosfor: [
    {
      q: "Når går avfosforeringen best?",
      options: ["Ved høy temperatur", "Ved lav temperatur med nok FeO og kalk", "Uten slagg"],
      correct: 1,
      why: "Fosfor går til slaggen når det er kaldt nok, oksiderende og basisk.",
    },
    {
      q: "Hvorfor slagges det av før temperaturen kjøres opp?",
      options: ["Ellers går fosforet tilbake i stålet", "For å spare kalk", "For at ovnen skal bli lettere"],
      correct: 0,
      why: "Blir det varmt mens fosforrik slagg ligger i ovnen, går fosforet tilbake i stålet.",
    },
  ],
  oseovn: [
    {
      q: "Hva gjør øseovnen?",
      options: ["Smelter skrap", "Varmer, legerer og spyler stålet i øsa", "Valser stålet"],
      correct: 1,
      why: "Øseovnen finjusterer analyse og temperatur, så stålovnen kan konsentrere seg om å smelte.",
    },
    {
      q: "Hvorfor spyles stålet med argon?",
      options: ["For å gjøre det homogent", "For å kjøle det ned", "For å fjerne kobber"],
      correct: 0,
      why: "Argonbobler rører om, så temperatur og analyse blir lik i hele øsa.",
    },
  ],
  streng: [
    {
      q: "Hva er et strenggjennombrudd?",
      options: ["At skallet revner og stålet renner ut", "At strengen blir for lang", "At kokillen fryser"],
      correct: 0,
      why: "Skallet under kokillen er tynt. Revner det, renner flytende stål ut.",
    },
    {
      q: "Hvorfor gir strengstøping bedre utbytte enn blokkstøping?",
      options: ["Mindre topp og bunn å kappe bort", "Stålet blir tyngre", "Det brukes mindre strøm"],
      correct: 0,
      why: "Strengen er sammenhengende, så nesten alt blir produkt.",
    },
  ],
  valsing: [
    {
      q: "Hva skjer med emnene før valsing?",
      options: ["De kjøles ned", "De varmes opp igjen", "De males"],
      correct: 1,
      why: "Varmt stål er mykt nok til å valses ned til ferdig dimensjon.",
    },
    {
      q: "Hva får armeringsstål i siste stikk?",
      options: ["Ribber", "Rustbeskyttelse", "Hull"],
      correct: 0,
      why: "Ribbene gjør at stålet griper fast i betongen.",
    },
  ],
  omdomme: [
    {
      q: "Hva er verst for omdømmet?",
      options: ["Å avslå en forespørsel", "En reklamasjon", "Å levere tidlig"],
      correct: 1,
      why: "Ved en reklamasjon sender kunden stålet tilbake – og forteller det til andre.",
    },
    {
      q: "Hva skjer når omdømmet stiger?",
      options: ["Prisen på skrap går ned", "Større kunder begynner å spørre", "Lønna går opp"],
      correct: 1,
      why: "Gode leveranser gjør deg kjent, og større kunder tør å bestille.",
    },
  ],
};

export function quizReward(g: GameState): number {
  return 2 * (1 + g.stage);
}

export function quizAvailable(g: GameState, chapter: string): { ok: boolean; reason: string | null } {
  if (!QUIZ[chapter]) return { ok: false, reason: null };
  if (g.quizDone.includes(chapter)) return { ok: false, reason: "Bestått" };
  const failed = g.quizFailedDay[chapter];
  if (failed !== undefined && day(g) <= failed) return { ok: false, reason: "Du kan prøve igjen i morgen" };
  return { ok: true, reason: null };
}

/** Retter en quiz. Alt riktig gir fagpoeng; ellers kan man prøve igjen neste døgn. */
export function answerQuiz(g: GameState, chapter: string, answers: number[]): { passed: boolean; reward: number } {
  const quiz = QUIZ[chapter];
  if (!quiz || !quizAvailable(g, chapter).ok) return { passed: false, reward: 0 };
  const passed = quiz.every((q, i) => answers[i] === q.correct);
  if (!passed) {
    g.quizFailedDay[chapter] = day(g);
    return { passed, reward: 0 };
  }
  const reward = quizReward(g);
  g.quizDone.push(chapter);
  awardPoints(g, reward);
  log(g, `Quiz bestått: «${knowledgeCard(chapter)?.title}». +${reward} fagpoeng.`, "good");
  return { passed, reward };
}
