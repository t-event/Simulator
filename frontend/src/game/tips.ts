/**
 * Engangstips (B-033): korte forklaringer som dukker opp første gang noe viktig skjer,
 * som et kort med «Skjønner». Spillet går videre på 1× etterpå (se «tips-fart-ned», B-069).
 */
import { fmtKr } from "./engine";
import { isOpen, type PlantStats } from "./plant";
import { hasResearch } from "./research";
import type { Decision, GameState } from "./types";

type Tip = Omit<Decision, "resumeSpeed" | "options" | "data"> & { when: (g: GameState, stats: PlantStats) => boolean };

const TIPS: Tip[] = [
  {
    id: "tips-fart-ned",
    title: "Hvorfor gikk farten ned til 1×?",
    text: "Når det skjer noe du må ta stilling til – et hendelseskort, et havari eller et tips – setter spillet farten ned til 1×. Da raser du ikke videre på 10× mens verket har problemer, og du rekker å se hva som skjedde. Se over Verket, og trykk 3× eller 10× øverst igjen når alt er i orden.",
    when: (g) => (g.counters.fartNed ?? 0) > 0,
  },
  {
    id: "tips-natt",
    title: "Arbeidsdagen er over",
    text: "Verket står når ingen er på jobb. Trykk 3× eller 10× for å komme raskere til morgenen – med forskningen «Stødig drift» spoler spillet fram av seg selv om natta. Vil du lage mer stål, trenger du flere folk: når du har flyttet til verkstedet (neste nivå, se «Mål» på Verket), kan du ansette folk og kjøre flere skift under Folk. Med tre skift går verket døgnet rundt.",
    when: (g, s) => s.hours > 0 && s.hours < 24 && !isOpen(g, s.hours) && g.totals.heats >= 1,
  },
  {
    id: "tips-fart",
    title: "Nå kan du skru opp farten",
    text: "Med «Faste rutiner» kan du trykke 3× øverst, så går tida tre ganger så fort. Spillet setter farten tilbake til 1× når det kommer noe du må ta stilling til.",
    when: (g) => hasResearch(g, "rutiner"),
  },
  {
    id: "tips-foring",
    title: "Foringen slites",
    text: "Ovnen er foret med ildfast stein som slites for hver charge. Den byttes ikke av seg selv: trykk «Bytt foring» på Verket (knappen dukker opp når foringen er slitt) før den er 85 % slitt. Brenner den gjennom, blir det havari – dyrt, lang stans og tapt omdømme.",
    when: (g) => g.furnaces.some((f) => f.wear >= 0.55),
  },
  {
    id: "tips-skrap",
    title: "Skraplageret er tomt",
    text: "Ovnen står fordi det ikke er mer skrap. Gå til Marked og kjøp skrap etter resepten. Kjøp gjerne nok til et par døgn, så slipper verket å stå.",
    when: (g) => g.furnaces.some((f) => f.waitReason === "Tomt for skrap"),
  },
  {
    id: "tips-kreditt",
    title: "Kassa er tom",
    text: "Du bruker nå kassekreditten. Den er en buffer, ikke penger du har: blir du stående over kredittgrensen i en uke, går verket konkurs. Lever kontrakter, selg på spot, vent med innkjøp – eller ta opp et lån under Forskning → Bank.",
    when: (g) => g.cash < 0,
  },
];

/** Viser første tips som ikke er sett, hvis ikke et annet kort allerede venter. */
export function maybeTip(g: GameState, stats: PlantStats): void {
  if (g.pendingDecision || g.pendingManual || g.tutorial !== null) return;
  for (const t of TIPS) {
    if (g.tipsSeen.includes(t.id) || !t.when(g, stats)) continue;
    g.tipsSeen.push(t.id);
    const text = t.id === "tips-kreditt" ? `${t.text} (Grensen er nå ca. ${fmtKr(creditHint(g))}.)` : t.text;
    g.pendingDecision = {
      id: t.id,
      title: t.title,
      text,
      options: [{ label: "Skjønner" }],
      data: {},
      // Farten før tipset, så resolveDecision ser at den settes ned (B-069)
      resumeSpeed: g.speed > 0 ? g.speed : 1,
    };
    g.speed = 0;
    return;
  }
}

let creditHint: (g: GameState) => number = () => 0;
/** Kassekredittgrensen settes inn fra motoren, så tips.ts slipper å importere den i ring */
export function setCreditHint(fn: (g: GameState) => number): void {
  creditHint = fn;
}
