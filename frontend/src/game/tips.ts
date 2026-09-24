/**
 * Engangstips (B-033): korte forklaringer som dukker opp første gang noe viktig skjer,
 * som et kort med «Skjønner». Spillet går videre på 1× etterpå.
 */
import { fmtKr } from "./engine";
import { isOpen, type PlantStats } from "./plant";
import { hasResearch } from "./research";
import type { Decision, GameState } from "./types";

type Tip = Omit<Decision, "resumeSpeed" | "options" | "data"> & { when: (g: GameState, stats: PlantStats) => boolean };

const TIPS: Tip[] = [
  {
    id: "tips-natt",
    title: "Arbeidsdagen er over",
    text: "Verket står når ingen er på jobb. Om natta, når ingenting skjer, spoler spillet fram til morgenen. Vil du lage mer stål, trenger du flere folk: i verkstedet kan du ansette folk og kjøre flere skift (Folk-fanen). Med tre skift går verket døgnet rundt.",
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
    text: "Ovnen er foret med ildfast stein som slites for hver charge. Den byttes ikke av seg selv: trykk «Bytt foring» i Vedlikehold-kortet på Verket før den er 85 % slitt. Brenner den gjennom, blir det havari – dyrt, lang stans og tapt omdømme.",
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
    text: "Du bruker nå kassekreditten. Den er en buffer, ikke penger du har: blir du stående over kredittgrensen i en uke, går verket konkurs. Lever kontrakter, selg på spot, vent med innkjøp – eller ta opp et lån i banken under Forskning.",
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
      resumeSpeed: 1,
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
