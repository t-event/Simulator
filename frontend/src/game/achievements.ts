/**
 * Prestasjoner (B-151, B-232): merker for ting man har klart, fra første charge til Stållegende. De sjekkes hver time og
 * gir litt fagpoeng. Bare ditt eget spill, så ingen konto trengs (KONTO.md, regel 1).
 *
 * B-232: merkene er serier i trinn («Charger: 1 → 100 → 1 000 → …»), og de øverste trinnene er langt unna, så det
 * alltid er noe å jobbe mot. De gamle merkene har beholdt id-ene sine (lagrede merker og pynten som krever dem, virker).
 */
import { awardPoints, log } from "./engine";
import { konsernEquity } from "./konsern";
import { MASTERY_IDS, masteryLevel, masteryOpen } from "./mastery";
import { QUIZ } from "./quiz";
import { LANDMARKS } from "./landmarks";
import type { GameState } from "./types";
import type { IconName } from "../ui/icons";

export interface Achievement {
  id: string;
  icon: IconName;
  name: string;
  description: string;
  fp: number;
  /** Serien merket hører til */
  family: string;
  /** Trinn i serien, fra 1 */
  tier: number;
  /** Hvor langt man er kommet: [nå, mål] */
  progress: (g: GameState) => [number, number];
  /** Vises bare når merket er tatt (B-296) */
  hidden?: boolean;
}

export interface AchievementFamily {
  id: string;
  icon: IconName;
  name: string;
  /** Gruppen på kortet */
  group: AchievementGroup;
  value: (g: GameState) => number;
  tiers: { id: string; goal: number; name: string; description: string; fp: number }[];
  /** Vises bare for dem som har merket (B-296): kan ikke tjenes, bare gis */
  hidden?: boolean;
}

export type AchievementGroup = "Produksjon" | "Kunder" | "Kunnskap" | "Kontrollrom" | "Folk" | "Konsern" | "Æresmerker";

export const ACHIEVEMENT_GROUPS: AchievementGroup[] = [
  "Produksjon",
  "Kunder",
  "Kontrollrom",
  "Kunnskap",
  "Folk",
  "Konsern",
  "Æresmerker",
];

// Sesongkapitlet krever konto (sesong), så det teller ikke med i «Fagekspert» (B-161, KONTO.md regel 1)
const QUIZ_COUNT = Object.keys(QUIZ).filter((k) => k !== "sesong").length;
const quizzesDone = (g: GameState) => g.quizDone.filter((k) => k !== "sesong").length;
const masterySum = (g: GameState) => MASTERY_IDS.reduce((a, id) => a + masteryLevel(g, id), 0);
const sisters = (g: GameState) => g.konsern?.plants.length ?? 0;
const counter = (key: string) => (g: GameState) => g.counters[key] ?? 0;
const bestDay = (g: GameState) => Math.max(0, ...g.history.map((d) => d.producedT));
const today = (g: GameState) => Math.floor(g.minute / 1440) + 1;
const nf = (n: number) => n.toLocaleString("nb-NO").replace(/ /g, " ");

/** Kort vei til et trinn: [id, mål, navn, beskrivelse, fagpoeng] */
type T = [string, number, string, string, number];
function family(
  id: string,
  icon: IconName,
  name: string,
  group: AchievementGroup,
  value: (g: GameState) => number,
  tiers: T[],
): AchievementFamily {
  return {
    id,
    icon,
    name,
    group,
    value,
    tiers: tiers.map(([tid, goal, tname, description, fp]) => ({ id: tid, goal, name: tname, description, fp })),
  };
}

export const ACHIEVEMENT_FAMILIES: AchievementFamily[] = [
  // Produksjon
  family("nivå", "factory", "Fra garasje til storverk", "Produksjon", (g) => g.stage, [
    ["verksted", 1, "Ut av garasjen", "Flytt til et verksted.", 3],
    ["stoperi", 2, "Eget støperi", "Flytt til et støperi.", 5],
    ["stalverk", 3, "Ekte stålverk", "Flytt til et stålverk.", 10],
    ["storverk", 4, "Storverket", "Bygg ut til et storverk.", 20],
  ]),
  family("charger", "flame", "Charger", "Produksjon", (g) => g.totals.heats, [
    ["charge1", 1, "Første smelte", "Smelt den første chargen.", 2],
    ["charge100", 100, "Hundre charger", "Smelt 100 charger.", 5],
    ["charge1000", 1000, "Tusen charger", "Smelt 1 000 charger.", 15],
    ["charge10k", 10_000, "Ti tusen charger", "Smelt 10 000 charger.", 40],
    ["charge50k", 50_000, "Smelteverket", "Smelt 50 000 charger.", 60],
    ["charge150k", 150_000, "Evig glød", "Smelt 150 000 charger.", 90],
    ["charge300k", 300_000, "Ovnen som aldri sover", "Smelt 300 000 charger.", 150],
  ]),
  family("tonn", "weight", "Tonn stål", "Produksjon", (g) => g.totals.producedT, [
    ["tonn1k", 1000, "Tusen tonn", "Produser 1 000 tonn stål.", 5],
    ["tonn100k", 100_000, "Hundre tusen tonn", "Produser 100 000 tonn stål.", 15],
    ["tonn1m", 1_000_000, "En million tonn", "Produser 1 000 000 tonn stål.", 40],
    ["tonn10m", 10_000_000, "Ti millioner tonn", "Produser 10 millioner tonn stål.", 60],
    ["tonn50m", 50_000_000, "Stålfjellet", "Produser 50 millioner tonn stål.", 100],
    ["tonn100m", 100_000_000, "Hundre millioner tonn", "Produser 100 millioner tonn stål.", 150],
  ]),
  family("rekord", "trend-up", "Rekorddøgn", "Produksjon", bestDay, [
    ["rekord100", 100, "Hundre tonn", "Lag 100 tonn stål på ett døgn.", 3],
    ["rekord1k", 1000, "Tusen tonn på et døgn", "Lag 1 000 tonn stål på ett døgn.", 10],
    ["rekord10k", 10_000, "Ti tusen tonn på et døgn", "Lag 10 000 tonn stål på ett døgn.", 30],
    ["rekord25k", 25_000, "Døgnrekord", "Lag 25 000 tonn stål på ett døgn.", 60],
    ["rekord40k", 40_000, "Uslåelig døgn", "Lag 40 000 tonn stål på ett døgn.", 120],
  ]),
  family("rene", "sparkles", "Rene døgn", "Produksjon", counter("rene_dogn"), [
    ["rene30", 30, "Ren måned", "30 døgn der alt stålet holder kvaliteten.", 10],
    ["rene365", 365, "Rent år", "365 døgn der alt stålet holder kvaliteten.", 30],
    ["rene1000", 1000, "Tusen rene døgn", "1 000 døgn der alt stålet holder kvaliteten.", 60],
    ["rene2500", 2500, "Plettfri", "2 500 døgn der alt stålet holder kvaliteten.", 120],
  ]),
  family("foring", "brick-wall", "Omforinger", "Produksjon", counter("omforinger"), [
    ["foring10", 10, "Murerlaget", "Bytt foringen 10 ganger.", 5],
    ["foring100", 100, "Ildfast", "Bytt foringen 100 ganger.", 20],
    ["foring500", 500, "Tusen murstein", "Bytt foringen 500 ganger.", 50],
    ["foring1500", 1500, "Ovnens beste venn", "Bytt foringen 1 500 ganger.", 100],
  ]),
  // Kunder
  family("kontrakter", "sales", "Kontrakter", "Kunder", (g) => g.totals.contractsDone, [
    ["kontrakt1", 1, "Første kontrakt", "Lever en hel kontrakt.", 2],
    ["kontrakt50", 50, "Femti kontrakter", "Lever 50 kontrakter.", 10],
    ["kontrakt250", 250, "Fast leverandør", "Lever 250 kontrakter.", 30],
    ["kontrakt1000", 1000, "Tusen leveranser", "Lever 1 000 kontrakter.", 50],
    ["kontrakt3000", 3000, "Hele landets leverandør", "Lever 3 000 kontrakter.", 80],
    ["kontrakt6000", 6000, "Leverandør i verdensklasse", "Lever 6 000 kontrakter.", 150],
  ]),
  family("tiavti", "badge-check", "Ti av ti", "Kunder", counter("tiavti"), [
    ["tiavti", 1, "Ti av ti", "Få 10 av 10 fra en kunde.", 5],
    ["tiavti10", 10, "Kundefavoritt", "Få 10 av 10 fra ti kunder.", 10],
    ["tiavti100", 100, "Hundre fornøyde", "Få 10 av 10 fra 100 kunder.", 30],
    ["tiavti1000", 1000, "Tusen fornøyde", "Få 10 av 10 fra 1 000 kunder.", 80],
    ["tiavti3000", 3000, "Alle elsker verket", "Få 10 av 10 fra 3 000 kunder.", 150],
  ]),
  family("omdomme", "star", "Omdømme", "Kunder", (g) => Math.floor(g.reputation), [
    ["omdomme", 95, "Kundenes favoritt", "Nå omdømme 95.", 10],
    ["omdomme100", 100, "Best i bransjen", "Nå omdømme 100.", 20],
  ]),
  family("avtaler", "scroll-text", "Rammeavtaler", "Kunder", counter("avtaler_bonus"), [
    ["avtale1", 1, "Holdt ord", "Fullfør en rammeavtale med bonus.", 5],
    ["avtale10", 10, "Pålitelig", "Fullfør 10 rammeavtaler med bonus.", 20],
    ["avtale50", 50, "Langsiktig partner", "Fullfør 50 rammeavtaler med bonus.", 60],
    ["avtale150", 150, "Kundene kommer tilbake", "Fullfør 150 rammeavtaler med bonus.", 120],
  ]),
  family("landemerker", "landmark", "Landemerker", "Kunder", (g) => g.landmarks?.done.length ?? 0, [
    ["landemerke1", 1, "Byggmester", "Lever stål til et landemerke.", 10],
    ["landemerke5", 5, "Byens stål", "Lever stål til fem landemerker.", 30],
    ["landemerke15", 15, "Landets stål", "Lever stål til 15 landemerker.", 60],
    [
      "landemerkeAlle",
      LANDMARKS.length,
      "Alt står i vårt stål",
      `Lever stål til alle ${LANDMARKS.length} landemerkene.`,
      120,
    ],
  ]),
  // Kontrollrom
  family("selv", "sliders-horizontal", "Kjørt selv", "Kontrollrom", (g) => g.totals.manualHeats, [
    ["selv1", 1, "Ved spakene", "Kjør en charge selv i kontrollrommet.", 3],
    ["selv25", 25, "Erfaren smelter", "Kjør 25 charger selv.", 15],
    ["selv100", 100, "Smelteformann", "Kjør 100 charger selv.", 40],
    ["selv250", 250, "Kontrollromslegende", "Kjør 250 charger selv.", 80],
  ]),
  family("perfekt", "award", "Perfekte charger", "Kontrollrom", counter("perfekte_charger"), [
    ["perfekt1", 1, "Fem stjerner", "Få 5 stjerner i kontrollrommet.", 10],
    ["perfekt10", 10, "Stjernesmelter", "Få 5 stjerner ti ganger.", 30],
    ["perfekt50", 50, "Fullkommen", "Få 5 stjerner 50 ganger.", 80],
  ]),
  family("poeng", "gamepad-2", "Poengrekord", "Kontrollrom", (g) => g.controlBest ?? 0, [
    ["poeng3000", 3000, "God kjøring", "Få 3 000 poeng i kontrollrommet.", 10],
    ["poeng3800", 3800, "Skarp kjøring", "Få 3 800 poeng i kontrollrommet.", 25],
    // Id-ene beholdes (B-232), men grensene er senket (B-293): 4 500 var umulig, også for den flinke testspilleren
    ["poeng4200", 4100, "Mesterkjøring", "Få 4 100 poeng i kontrollrommet.", 50],
    ["poeng4500", 4250, "Rekordkjøring", "Få 4 250 poeng i kontrollrommet.", 100],
  ]),
  // Kunnskap
  family("quiz", "book-check", "Quiz", "Kunnskap", quizzesDone, [
    ["quiz5", 5, "Skoleflink", "Bestå fem quizer i fagboka.", 5],
    ["quizalle", QUIZ_COUNT, "Fagekspert", "Bestå alle quizene i fagboka.", 20],
  ]),
  family("forsk", "microscope", "Forskning", "Kunnskap", (g) => g.researched.length, [
    ["forsk10", 10, "Forsker", "Forsk fram ti ting.", 5],
    ["forsk25", 25, "Utviklingsleder", "Forsk fram 25 ting.", 15],
    // Id-en beholdes (B-232). Det finnes 48 prosjekter, så 50 var umulig (B-294); «Alt forsket fram» er egen prestasjon
    ["forsk50", 40, "Forskningssjef", "Forsk fram 40 ting.", 30],
  ]),
  family("alleforsk", "research", "Alt forsket fram", "Kunnskap", (g) => +masteryOpen(g), [
    ["alleforsk", 1, "Alt forsket fram", "Forsk fram alt, så mesterskapet åpner.", 30],
  ]),
  family("mester", "crown", "Mesterskap", "Kunnskap", masterySum, [
    ["mester10", 10, "Mester", "Ta ti nivåer i mesterskapet.", 25],
    ["mester50", 50, "Stormester", "Ta 50 nivåer i mesterskapet.", 60],
    ["mester100", 100, "Grandmester", "Ta 100 nivåer i mesterskapet.", 100],
    ["mester250", 250, "Evig student", "Ta 250 nivåer i mesterskapet.", 200],
  ]),
  // Folk
  family("folk", "hard-hat", "Ansatte", "Folk", (g) => g.workers.length, [
    ["folk5", 5, "Et lite lag", "Ha 5 ansatte.", 3],
    ["folk25", 25, "En hel arbeidsplass", "Ha 25 ansatte.", 10],
    ["folk100", 100, "Hjørnesteinsbedrift", "Ha 100 ansatte.", 25],
    ["folk250", 250, "Byens største arbeidsgiver", "Ha 250 ansatte.", 60],
  ]),
  family("fagbrev", "graduation-cap", "Fagbrev", "Folk", counter("fagbrev"), [
    ["fagbrev1", 1, "Første fagbrev", "En ansatt tar fagbrev.", 5],
    ["fagbrev10", 10, "Lærebedrift", "Ti ansatte tar fagbrev.", 20],
    ["fagbrev50", 50, "Fagskolen", "50 ansatte tar fagbrev.", 60],
  ]),
  family("dager", "calendar-check", "Dager i drift", "Folk", today, [
    ["dag100", 100, "Hundre dager", "Hold verket i gang i 100 døgn.", 5],
    ["dag365", 365, "Et år i drift", "Hold verket i gang i 365 døgn.", 15],
    ["dag1000", 1000, "Tusen døgn", "Hold verket i gang i 1 000 døgn.", 40],
    ["dag2000", 2000, "Institusjon", "Hold verket i gang i 2 000 døgn.", 80],
    ["dag3650", 3650, "Ti år", "Hold verket i gang i 3 650 døgn.", 150],
  ]),
  // Konsern. Merkene følger titlene (B-238); id-ene er beholdt, så verdi500 gis nå ved 200 mrd.
  family("verdi", "money", "Konsernverdi", "Konsern", (g) => konsernEquity(g), [
    ["milliard", 1e9, "Milliardær", "Få en konsernverdi på 1 milliard.", 20],
    ["baron", 1e10, "Stålbaron", "Nå sluttmålet: 10 milliarder.", 40],
    ["magnat", 2.5e10, "Stålmagnat", "Nå 25 milliarder.", 50],
    ["verdi100", 1e11, "Stålkonge", "Nå 100 milliarder.", 70],
    ["verdi500", 2e11, "Stålkeiser", "Nå 200 milliarder.", 90],
    ["legende", 4e11, "Stållegende", "Nå 400 milliarder.", 100],
  ]),
  family("datter", "konsern", "Datterverk", "Konsern", sisters, [
    ["datter1", 1, "Første datterverk", "Kjøp et datterverk i konsernet.", 10],
    ["datter3", 3, "Lite konsern", "Eie tre datterverk.", 15],
    ["datter5", 5, "Voksende konsern", "Eie fem datterverk.", 20],
    ["datter10", 10, "Stort konsern", "Eie ti datterverk.", 30],
  ]),
  family(
    "kompleks",
    "warehouse",
    "Stålkomplekser",
    "Konsern",
    (g) => g.konsern?.plants.filter((p) => p.type === "kompleks").length ?? 0,
    [
      ["kompleks1", 1, "Stålkompleks", "Eie et stålkompleks.", 30],
      ["kompleks3", 3, "Tungindustri", "Eie tre stålkomplekser.", 60],
      ["kompleks6", 6, "Industrimakt", "Eie seks stålkomplekser.", 120],
    ],
  ),
  family(
    "modern",
    "wrench",
    "Modernisering",
    "Konsern",
    (g) => Math.max(0, ...(g.konsern?.plants.map((p) => p.level) ?? [0])),
    [
      ["modern3", 3, "Moderne verk", "Moderniser et datterverk til trinn 3.", 15],
      ["modern5", 5, "Toppmoderne", "Moderniser et datterverk helt, til trinn 5.", 40],
    ],
  ),
  // Æresmerker (B-296): gis av serveren, vises bare for dem som har dem
  {
    ...family("reform", "scroll-text", "Reformveteran", "Æresmerker", (g) => +!!g.serverBadges?.includes("reform"), [
      ["reform", 1, "Reformveteran", "Var med da økonomireformen kom, og bygde videre etter den.", 25],
    ]),
    hidden: true,
  },
];

// Merker som ble gitt med andre regler før B-232 beholdes, men nye gis etter tabellen over
const LEGACY_VALUE: Record<string, (g: GameState) => number> = {
  baron: (g) => (g.won ? 1e10 : konsernEquity(g)),
  magnat: (g) => ((g.konsern?.legends ?? 0) >= 1 ? 2.5e10 : konsernEquity(g)),
  legende: (g) => ((g.konsern?.legends ?? 0) >= 5 ? 4e11 : konsernEquity(g)),
};

export const ACHIEVEMENTS: Achievement[] = ACHIEVEMENT_FAMILIES.flatMap((f) =>
  f.tiers.map((t, i) => {
    const value = LEGACY_VALUE[t.id] ?? f.value;
    return {
      id: t.id,
      icon: f.icon,
      name: t.name,
      description: t.description,
      fp: t.fp,
      family: f.id,
      tier: i + 1,
      hidden: f.hidden,
      progress: (g: GameState) => [value(g), t.goal] as [number, number],
    };
  }),
);

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, Achievement>;

export function hasAchievement(g: GameState, id: string): boolean {
  return g.achievements?.[id] != null;
}

export function achievementsDone(g: GameState): number {
  return ACHIEVEMENTS.filter((a) => hasAchievement(g, a.id)).length;
}

/** Merkene spilleren ser (B-296): skjulte merker bare når de er tatt */
export function visibleAchievements(g: GameState): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !a.hidden || hasAchievement(g, a.id));
}

/** Seriene spilleren ser (B-296) */
export function visibleFamilies(g: GameState): AchievementFamily[] {
  return ACHIEVEMENT_FAMILIES.filter((f) => !f.hidden || f.tiers.some((t) => hasAchievement(g, t.id)));
}

/** Tar inn merkene serveren gir (B-296) og deler dem ut med én gang. Gir true hvis noe var nytt */
export function applyServerBadges(g: GameState, badges: string[]): boolean {
  const fresh = badges.filter((b) => !(g.serverBadges ?? []).includes(b));
  if (!fresh.length) return false;
  g.serverBadges = [...(g.serverBadges ?? []), ...fresh];
  checkAchievements(g);
  return true;
}

/** Andel av målet (0–1) */
export function achievementShare(g: GameState, a: Achievement): number {
  const [now, goal] = a.progress(g);
  return goal > 0 ? Math.max(0, Math.min(1, now / goal)) : 0;
}

/** Merkene i en serie */
export function familyAchievements(family: string): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.family === family);
}

/** Neste merke i serien (det første du ikke har), eller null når alle er tatt */
export function nextInFamily(g: GameState, family: string): Achievement | null {
  return familyAchievements(family).find((a) => !hasAchievement(g, a.id)) ?? null;
}

/** Hver time: nye prestasjoner gir fagpoeng og en linje i loggen. Mange på en gang (gamle lagringer) gir én linje. */
export function checkAchievements(g: GameState): void {
  const fresh = ACHIEVEMENTS.filter((a) => !hasAchievement(g, a.id) && achievementShare(g, a) >= 1);
  if (fresh.length === 0) return;
  const day = today(g);
  let fp = 0;
  for (const a of fresh) {
    g.achievements[a.id] = day;
    fp += a.fp;
  }
  awardPoints(g, fp);
  if (fresh.length <= 2) for (const a of fresh) log(g, `Prestasjon: ${a.name}! +${a.fp} fagpoeng.`, "good");
  else log(g, `${fresh.length} nye prestasjoner! +${fp} fagpoeng. Se merkene under Mål → Merker.`, "good");
}

/** Tall til beskrivelser (brukes av kortet) */
export function fmtGoal(n: number): string {
  return nf(Math.floor(n));
}
