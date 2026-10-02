/**
 * Året i spillet (B-265): tolv måneder à 30 døgn. Dag 1 er 1. april, så den første vinteren kommer når verket er
 * etablert. Om vinteren (midten av november til midten av mars, 120 døgn, B-272) gir is, snø og kulde flere uhell: eksplosjoner i ovnen, havarier og
 * uforutsette hendelser.
 */
import { MIN_PER_DAY } from "./data";
import { addCost, adjustMorale, fmtKr, log } from "./engine";
import { day, has, hourOfDay, type PlantStats } from "./plant";
import { chance, uniform } from "./random";
import type { GameState } from "./types";

export const YEAR_DAYS = 360;
const MONTH_DAYS = 30;
/** Dag 1 er i april (måned nr. 3, der januar er 0) */
const START_MONTH = 3;

export const MONTHS = [
  "januar",
  "februar",
  "mars",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "desember",
];

/** Måneden (0 = januar) på en dag i spillet */
export function monthOf(d: number): number {
  return (START_MONTH + Math.floor((d - 1) / MONTH_DAYS)) % 12;
}

/** Dag i året (0 = 1. januar, 359 = 30. desember) */
export function dayOfYear(d: number): number {
  return (START_MONTH * MONTH_DAYS + d - 1) % YEAR_DAYS;
}

/** Vinteren varer 120 døgn: fra 15. november til og med 14. mars (B-272; var desember–februar, 90 døgn) */
const WINTER_FROM = 10 * MONTH_DAYS + 14;
const WINTER_TO = 2 * MONTH_DAYS + 14;
export const WINTER_DAYS = YEAR_DAYS - WINTER_FROM + WINTER_TO;

export function isWinter(g: GameState, d = day(g)): boolean {
  const n = dayOfYear(d);
  return n >= WINTER_FROM || n < WINTER_TO;
}

/** Hvor mye oftere havarier og uforutsette hendelser skjer: halvannen gang så ofte om vinteren */
export const WINTER_RISK = 1.5;

export function riskFactor(g: GameState): number {
  return (isWinter(g) ? WINTER_RISK : 1) * (summerTemps(g) ? SUMMER.tempRisk : 1);
}

/** Året i spillet (0 = det første), med år fra 1. januar */
export function yearOf(d: number): number {
  return Math.floor((START_MONTH * MONTH_DAYS + d - 1) / YEAR_DAYS);
}

/** Jula (B-298): fra 23. desember til og med 1. januar. Ferie da heter juleferie */
export function isChristmas(d: number): boolean {
  const n = dayOfYear(d);
  return n >= 11 * MONTH_DAYS + 22 || n === 0;
}

/**
 * Fellesferien (B-298): tre uker i juli (7.–27. juli). Et kort en uke før spør om verket skal ha sommerstans med
 * vedlikehold (ovnene står, men får ny foring og alle får ferie samtidig) eller gå videre med sommervikarer (dyrere
 * lønn og litt flere uhell). Fra støperiet, når det er ansatte.
 */
export const SUMMER = {
  /** Første dag (dag i året, 0 = 1. januar): 7. juli */
  from: 6 * MONTH_DAYS + 6,
  days: 21,
  /** Kortet kommer så mange døgn før */
  notice: 7,
  fromStage: 2,
  /** Sommervikarene: lønnen øker med denne andelen, og uhell skjer så mye oftere */
  tempExtra: 0.25,
  tempRisk: 1.25,
  /** Trivselen etter en sommerstans der alle fikk ferie samtidig */
  stansMorale: 5,
};

/** Er dagen i fellesferien? */
export function inSummerBreak(d: number): boolean {
  const n = dayOfYear(d);
  return n >= SUMMER.from && n < SUMMER.from + SUMMER.days;
}

/** Første dag i fellesferien i året dagen `d` ligger i */
export function summerStart(d: number): number {
  return d - dayOfYear(d) + SUMMER.from;
}

/** Går verket med sommervikarer akkurat nå? */
export function summerTemps(g: GameState, d = day(g)): boolean {
  return g.summer?.choice === "vikarer" && g.summer.year === yearOf(d) && inSummerBreak(d);
}

/** Har verket sommerstans akkurat nå? */
export function summerStop(g: GameState, d = day(g)): boolean {
  return g.summer?.choice === "stans" && g.summer.year === yearOf(d) && inSummerBreak(d);
}

/** Døgn igjen av sommerstansen, i dag medregnet (0 når verket ikke har stans), B-321 */
export function summerStopDaysLeft(g: GameState, d = day(g)): number {
  return summerStop(g, d) ? summerStart(d) + SUMMER.days - d : 0;
}

/** Får verket fellesferie (nivå og folk)? */
export function hasSummerBreak(g: GameState): boolean {
  return g.stage >= SUMMER.fromStage && g.workers.length > 0;
}

/** Datoen som tekst, f.eks. «7. juli» */
export function dateText(d: number): string {
  return `${(dayOfYear(d) % MONTH_DAYS) + 1}. ${MONTHS[monthOf(d)]}`;
}

/** Valget på kortet (eller av seg selv når kortet ikke ble besvart): gjelder fellesferien i år */
export function chooseSummer(g: GameState, choice: "stans" | "vikarer"): void {
  const today = day(g);
  // Ferien i år så lenge den ikke er over – også når verket først får ferie midt i den (B-427). Før ble valget da
  // ført på neste år: vikarlønn uten vikarer resten av ferien, og neste års valg ble hoppet over
  const start = today < summerStart(today) + SUMMER.days ? summerStart(today) : summerStart(today + YEAR_DAYS);
  g.summer = { year: yearOf(start), choice };
  const end = start + SUMMER.days - 1;
  log(
    g,
    choice === "stans"
      ? `Sommerstans i fellesferien: ovnene står fra ${dateText(start)} til og med ${dateText(end)} (dag ${start}–${end}). Alle får ferie samtidig, og ovnene får ny foring.`
      : `Sommervikarer i fellesferien: verket går som vanlig fra ${dateText(start)} til og med ${dateText(end)} (dag ${start}–${end}). Lønnen øker ca. ${Math.round(SUMMER.tempExtra * 100)} %, og det blir litt flere uhell.`,
    "info",
  );
}

/** Kontrakter med frist i fellesferien, til kortet */
function dueInBreak(g: GameState, start: number): number {
  return g.contracts.filter(
    (c) => c.status === "aktiv" && !c.landmark && c.deadlineDay >= start && c.deadlineDay < start + SUMMER.days,
  ).length;
}

/** Ved nytt døgn: kortet før fellesferien, stansen når den begynner, og vikarlønna hver dag (B-298) */
function summerDay(g: GameState, stats: PlantStats): void {
  const today = day(g);
  const start = summerStart(today);
  const chosen = g.summer?.year === yearOf(today);
  // Kortet en uke før, eller neste dag hvis et annet kort står
  if (hasSummerBreak(g) && !chosen && today >= start - SUMMER.notice && today < start) {
    if (g.pendingDecision || g.pendingManual) return;
    const due = dueInBreak(g, start);
    g.pendingDecision = {
      id: "fellesferie",
      title: "Fellesferie i juli",
      text: `Fra ${dateText(start)} har de fleste tre ukers fellesferie. Sommerstans: ovnene står i tre uker, men får ny foring og vedlikehold, og alle får ferie samtidig (feriepengene er alt opptjent, så du betaler ikke lønn). Men ingenting selges, og faste kostnader og renter går – ha penger på bok, og kjøp ikke mer skrap enn du trenger. Sommervikarer: verket går som vanlig, men lønnen øker ca. ${Math.round(SUMMER.tempExtra * 100)} %, og vikarene gjør flere feil.${due ? ` Ved stans får ${due === 1 ? "kontrakten" : `de ${due} kontraktene`} med frist i ferien tre uker lenger frist.` : ""}`,
      options: [
        {
          label: "Sommerstans med vedlikehold",
          hint: "Ingen produksjon og ingen lønn i tre uker. Ny foring og bedre trivsel.",
        },
        { label: "Sommervikarer", hint: "Full drift, men dyrere lønn og litt flere uhell." },
      ],
      data: {},
      resumeSpeed: g.speed > 0 ? g.speed : 1,
    };
    g.speed = 0;
    return;
  }
  if (!inSummerBreak(today) || !hasSummerBreak(g)) return;
  // Ble kortet aldri besvart, går verket med vikarer
  if (!chosen) chooseSummer(g, "vikarer");
  if (today === start && g.summer?.choice === "stans") {
    const until = (start + SUMMER.days - 1) * MIN_PER_DAY;
    for (const [i, f] of g.furnaces.entries()) {
      f.downUntilMin = Math.max(f.downUntilMin, until);
      f.downReason = "Planlagt stans: sommerstans";
      f.wear = 0;
      f.heatsOnLining = 0;
      f.lastRelineDay = today;
      if ((stats.units[i]?.furnace ?? stats.furnace).arc) f.spareProgress = 1;
    }
    // Kundene vet om fellesferien: fristene som ikke er gått ut, flyttes tre uker – også for forespørsler som venter på
    // svar (B-321), ellers kunne de tas i stansen med en frist verket ikke rakk
    let moved = 0;
    for (const c of g.contracts)
      if ((c.status === "aktiv" || c.status === "tilbud") && !c.landmark && c.deadlineDay >= start) {
        c.deadlineDay += SUMMER.days;
        if (c.status === "aktiv") moved++;
      }
    // Foringen etter hver ovn (B-427): før ble alle ovnene regnet som den største
    const cost = g.furnaces.reduce((a, _f, i) => a + (stats.units[i]?.furnace ?? stats.furnace).relineCost, 0);
    addCost(g, "vedlikehold", cost);
    adjustMorale(g, SUMMER.stansMorale);
    log(
      g,
      `Fellesferie: sommerstans i tre uker. Ovnene får ny foring og vedlikehold (${fmtKr(cost)}), og alle har ferie samtidig. Støpingen tar stålet som er smeltet.${moved ? ` Kundene vet om ferien: ${moved === 1 ? "én kontrakt har" : `${moved} kontrakter har`} fått frist tre uker senere.` : ""}`,
      "event",
    );
  }
  if (g.summer?.choice === "vikarer" && g.summer.year === yearOf(today)) {
    addCost(g, "lonn", stats.salaryPerDay * SUMMER.tempExtra);
    if (today === start)
      log(
        g,
        "Fellesferie: sommervikarene har tatt over. Verket går som vanlig, men lønnen er høyere og det blir litt flere uhell.",
        "event",
      );
  }
  if (today === start + SUMMER.days - 1) log(g, "Siste dag i fellesferien: i morgen er de faste tilbake.", "info");
}

/** Strømmen er dyrere om vinteren (B-279): spotpris og nattariff ganges med dette */
export const WINTER_POWER = 1.3;
/** Fastprisen man får tilbud om midt på vinteren: litt dyrere, men billigere enn spot. Avtal den før vinteren */
export const WINTER_FIXED = 1.15;

/** Hva strømprisen ganges med i timen `minute` (1 om sommeren) */
export function winterPowerFactor(g: GameState, minute = g.minute): number {
  return isWinter(g, day(g, minute)) ? WINTER_POWER : 1;
}

/** Snøstormer per døgn om vinteren (B-279): veien stenges, og skrapbilene kommer ikke fram */
export const SNOWSTORMS_PER_DAY = 1 / 15;

/** Er veien stengt av snø? */
export function roadClosed(g: GameState): boolean {
  return (g.snowUntilMin ?? 0) > g.minute;
}

/** Kommer ikke skrapet fram? Skrapterminalen får skrap med båt og tog, så den merker ikke snøstormen */
export function scrapBlocked(g: GameState): boolean {
  return roadClosed(g) && !has(g, "skrapterminal");
}

/** Timer til veien er åpen igjen (rundet opp) */
export function roadOpensInH(g: GameState): number {
  return Math.max(1, Math.ceil(((g.snowUntilMin ?? 0) - g.minute) / 60));
}

/** Hver time om vinteren: snøstorm som stenger veien, og beskjed når den er brøytet (B-279) */
function snowHour(g: GameState): void {
  if ((g.snowUntilMin ?? 0) > 0 && g.minute >= (g.snowUntilMin ?? 0)) {
    g.snowUntilMin = 0;
    if (!has(g, "skrapterminal")) log(g, "Veien er brøytet: skrapbilene kommer fram igjen.", "info");
  }
  if (!isWinter(g) || g.stage < 1 || roadClosed(g)) return;
  if (!chance(g, SNOWSTORMS_PER_DAY / 24)) return;
  const hours = uniform(g, 4, 12);
  g.snowUntilMin = g.minute + hours * 60;
  log(
    g,
    has(g, "skrapterminal")
      ? "Snøstorm: veiene er stengt, men skrapterminalen får skrap med båt og tog."
      : `Snøstorm: veien er stengt, og skrapbilene kommer ikke fram på ca. ${hours.toFixed(0)} timer. Ovnene bruker skrapet på lageret. Hold mer skrap på lager om vinteren.`,
    "event",
  );
}

/** Ved nytt døgn: beskjed når vinteren kommer og går, og fellesferien (B-298) */
export function calendarDay(g: GameState, stats: PlantStats): void {
  summerDay(g, stats);
  const today = day(g);
  const now = isWinter(g, today);
  const was = isWinter(g, today - 1);
  if (now && !was)
    log(
      g,
      "Vinteren er kommet. Is og snø i skrapet kan gi eksplosjoner i ovnen, og kulden gir flere havarier og uhell. Strømmen blir ca. 30 % dyrere, og snøstorm kan stenge veien for skrapbilene – hold mer skrap på lager. Tak over skraplageret og sortering gir færre eksplosjoner.",
      "event",
    );
  else if (!now && was) log(g, "Våren er kommet: færre uhell i verket.", "info");
}

/** Frost om vinteren (B-265): av og til fryser kjølevannet til støpemaskinen, og støpingen står noen timer */
export function winterHour(g: GameState, stats: PlantStats): void {
  snowHour(g);
  if (!isWinter(g) || g.stage < 2 || stats.shifts === 0 || g.minute < g.castDownUntilMin) return;
  if (!chance(g, (1 / 30 / 24) * stats.maintFactor)) return;
  const hours = uniform(g, 3, 6) * stats.repairFactor;
  const cost = 10_000 * (1 + g.stage) ** 2;
  g.castDownUntilMin = g.minute + hours * 60;
  addCost(g, "vedlikehold", cost);
  // «I natt» bare om natta (B-277)
  const hour = hourOfDay(g);
  const when = hour < 7 || hour >= 22 ? "i natt" : "i kulda";
  log(
    g,
    `Frost: kjølevannsrørene til støpemaskinen frøs ${when}. Støpingen står i ${hours.toFixed(0)} timer (reparasjon ${fmtKr(cost)}).`,
    "bad",
  );
}

/** Noe som kommer i kalenderen (B-321): fellesferien og vinteren, med første og siste dag */
export interface CalendarItem {
  kind: "ferie" | "vinter";
  from: number;
  to: number;
  /** Hva som gjelder: valget for ferien, eller at kortet ikke er besvart ennå */
  note: string;
  /** Kontrakter med frist i perioden (bare ferien) */
  dueContracts: number;
}

/**
 * Det som kommer de neste `horizon` døgnene (standard: neste gang hver), eller pågår nå (B-321): så spilleren kan planlegge fram til
 * fellesferien og vinteren. Sortert etter når det begynner.
 */
export function calendarAhead(g: GameState, horizon = YEAR_DAYS): CalendarItem[] {
  const today = day(g);
  const items: CalendarItem[] = [];
  if (hasSummerBreak(g)) {
    let start = summerStart(today);
    if (start + SUMMER.days - 1 < today) start = summerStart(today + YEAR_DAYS);
    if (start <= today + horizon) {
      const chosen = g.summer?.year === yearOf(start) ? g.summer.choice : null;
      const due = g.contracts.filter(
        (c) => c.status === "aktiv" && !c.landmark && c.deadlineDay >= start && c.deadlineDay < start + SUMMER.days,
      ).length;
      items.push({
        kind: "ferie",
        from: start,
        to: start + SUMMER.days - 1,
        note:
          chosen === "stans"
            ? "Sommerstans: ovnene står, fristene flyttes tre uker"
            : chosen === "vikarer"
              ? "Sommervikarer: full drift, dyrere lønn"
              : today >= start
                ? "Sommervikarer: full drift, dyrere lønn"
                : `Velg stans eller vikarer ${today >= start - SUMMER.notice ? "nå" : `fra ${dateText(start - SUMMER.notice)}`}`,
        dueContracts: chosen === "stans" ? 0 : due,
      });
    }
  }
  // Vinteren: nå eller neste
  const n = dayOfYear(today);
  const winterStart = isWinter(g, today)
    ? today - (n >= WINTER_FROM ? n - WINTER_FROM : n + YEAR_DAYS - WINTER_FROM)
    : today + ((WINTER_FROM - n + YEAR_DAYS) % YEAR_DAYS);
  if (winterStart <= today + horizon)
    items.push({
      kind: "vinter",
      from: winterStart,
      to: winterStart + WINTER_DAYS - 1,
      note: "Is og kulde: flere uhell, dyrere strøm",
      dueContracts: 0,
    });
  return items.sort((a, b) => a.from - b.from);
}
