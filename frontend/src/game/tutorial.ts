/**
 * Veiledet start (B-027): noen få steg som viser det viktigste de første
 * minuttene. Hvert steg går videre av seg selv når spilleren har gjort det.
 * Erfarne spillere kan hoppe over hele veiledningen.
 */
import type { GameState } from "./types";

export interface TutorialStep {
  title: string;
  text: string;
  /** Fanen steget handler om, så den kan markeres */
  view?: "verket" | "marked" | "salg";
  /** Når steget er gjort. Uten done går steget videre med «Neste». */
  done?: (g: GameState) => boolean;
}

export const TUTORIAL: TutorialStep[] = [
  {
    title: "Velkommen til garasjen",
    text: "Du smelter skrap, støper det og selger til kunder. Denne veiledningen viser deg det viktigste. Spillet står på pause til du trykker «Neste».",
  },
  {
    title: "Ta en kontrakt",
    text: "Kundene sender forespørsler. Gå til Salg og trykk «Signer» på en forespørsel du rekker før fristen.",
    view: "salg",
    done: (g) => g.contracts.some((c) => c.status !== "tilbud"),
  },
  {
    title: "Kjøp skrap",
    text: "Ovnen trenger skrap. Gå til Marked og kjøp litt blandet eller tungt skrap.",
    view: "marked",
    done: (g) => (g.today.costs.skrap ?? 0) > 0 || g.history.some((d) => (d.costs.skrap ?? 0) > 0),
  },
  {
    title: "Se ovnen jobbe",
    text: "På Verket ser du hele kjeden: skraplager → ovn → støping → lager. Ovnen smelter av seg selv i arbeidstida. Står spillet på pause, trykk 1× øverst.",
    view: "verket",
    done: (g) => g.totals.heats >= 1,
  },
  {
    title: "Lever kontrakten",
    text: "Ferdig stål leveres av seg selv når det holder kvaliteten kunden vil ha. Leverer du i tide, stiger omdømmet. Se «Mål» på Verket: du trenger penger og omdømme for å flytte.",
    view: "verket",
    done: (g) => g.totals.contractsDone >= 1,
  },
  {
    title: "Les i fagboka",
    text: "Trykk på boka 📖 øverst. Der står det hvordan et stålverk virker. Du må lese for å kunne forske, og quizene gir fagpoeng.",
    done: (g) => g.readChapters.length >= 1,
  },
  {
    title: "Nå klarer du deg selv",
    text: "Tipsene øverst på Verket sier hva som haster. Nye faner og knapper dukker opp etter hvert som verket vokser. Lykke til!",
  },
];

/** Går videre i veiledningen når steget spilleren står på, er gjort. */
export function advanceTutorial(g: GameState): void {
  while (g.tutorial !== null) {
    const step = TUTORIAL[g.tutorial];
    if (!step) {
      g.tutorial = null;
      return;
    }
    if (!step.done?.(g)) return;
    g.tutorial += 1;
  }
}

/** «Neste» på et steg uten mål, eller «Ferdig» på siste steg */
export function nextTutorialStep(g: GameState): void {
  if (g.tutorial === null) return;
  // Første «Neste» setter spillet i gang
  if (g.tutorial === 0 && g.speed === 0) g.speed = 1;
  g.tutorial = g.tutorial + 1 < TUTORIAL.length ? g.tutorial + 1 : null;
  advanceTutorial(g);
}

export function skipTutorial(g: GameState): void {
  g.tutorial = null;
  if (g.speed === 0 && !g.pendingDecision) g.speed = 1;
}
