/**
 * Hendelseskort med valg, som hendelsene i Game Dev Tycoon.
 *
 * Omtrent ett kort hver fjerde dag. Spillet pauses til spilleren har valgt.
 * Hvert kort har en fristelse og en risiko, og lærer bort noe om hvordan et
 * stålverk drives.
 */
import { ROLES, SCRAP_TYPES, STAGES } from "./data";
import {
  acceptContract,
  addCost,
  addIncome,
  addScrapParti,
  adjustMorale,
  awardPoints,
  adjustReputation,
  APPRENTICE_DAYS,
  countEvent,
  fmtKr,
  fmtT,
  lateContracts,
  log,
  makeCandidate,
  quitText,
  scrapPrice,
  unlock,
  workerLabel,
} from "./engine";
import { computePlantStats, day, isAbsent, productPrice, satisfiedGrades } from "./plant";
import { chance, pick, rand, uniform } from "./random";
import { knowledgeCard } from "./knowledge";
import { realNow } from "./clock";
import type { Contract, Decision, GameState, RepCause, Worker } from "./types";

const DAILY_CHANCE = 0.25;

type Maker = (g: GameState) => Omit<Decision, "resumeSpeed"> | null;

const MAKERS: Record<string, Maker> = {
  billigparti: (g) => {
    const stats = computePlantStats(g);
    const t = Math.max(0.5, Math.round(stats.sizeT * 3 * 10) / 10);
    if (stats.yardT - stats.yardUsed < t) return null;
    const price = Math.round(scrapPrice(g, "blandet") * 0.5 * t);
    return {
      id: "billigparti",
      title: "Billig skrapparti",
      text: `En skraphandler du ikke kjenner tilbyr ${fmtT(t)} blandet skrap for ${fmtKr(price)} – halv pris. Han vil ikke si hvor det kommer fra.`,
      options: [
        {
          label: `Kjøp for ${fmtKr(price)}`,
          hint: "Billig, men ukjent skrap kan ha mye fosfor og kobber – eller verre.",
        },
        { label: "Nei takk" },
      ],
      data: { t, price },
    };
  },
  hasteordre: (g) => {
    const stats = computePlantStats(g);
    const product = stats.mainProduct;
    const t = Math.max(0.1, Math.round(stats.dailyProductT * uniform(g, 0.6, 1) * 10) / 10);
    if (stats.dailyProductT <= 0) return null;
    const pricePerT = Math.round(productPrice(g, product, "standard") * 1.35);
    return {
      id: "hasteordre",
      title: "Hasteordre",
      text: `En kunde har fått stopp i produksjonen og trenger ${fmtT(t)} i standardkvalitet innen to døgn. De betaler 35 % over vanlig pris.`,
      options: [
        { label: "Ta oppdraget", hint: "Rekker du det ikke, blir det bot og dårligere omdømme." },
        { label: "Avslå" },
      ],
      data: { t, pricePerT, product },
    };
  },
  lonnskrav: (g) => {
    if (g.workers.length < 5) return null;
    const cost = Math.round(g.workers.reduce((a, w) => a + w.salary, 0) * 0.04);
    return {
      id: "lonnskrav",
      title: "Lønnskrav",
      text: `De ansatte ber om 4 % lønnstillegg (${fmtKr(cost)} mer per døgn). De peker på at verket går godt.`,
      options: [
        { label: "Godta 4 %", hint: "Fornøyde folk blir, og lærer mer." },
        { label: "Mottilbud: 2 %", hint: "Kanskje de godtar – kanskje ikke." },
        { label: "Avslå", hint: "Noen kan komme til å slutte." },
      ],
      data: { cost },
    };
  },
  avis: (g) => ({
    id: "avis",
    title: "Lokalavisen ringer",
    text: "En journalist vil lage en reportasje om verket ditt.",
    options: [
      { label: "Si ja", hint: "Godt for omdømmet – med mindre det har vært bråk med kunder nylig." },
      { label: "Nei takk" },
    ],
    data: {
      recentComplaints: g.log.filter((e) => e.min > g.minute - 10 * 1440 && e.text.includes("reklamerer")).length,
    },
  }),
  messe: (g) => {
    // Med omdømme på topp gir en messe ingenting (B-171)
    if (g.stage < 1 || g.reputation >= 90) return null;
    const cost = 8_000 * (1 + g.stage) ** 2;
    return {
      id: "messe",
      title: "Bransjemesse",
      text: `Du er invitert til å stille ut på en bransjemesse. Stand og reise koster ${fmtKr(cost)}.`,
      options: [{ label: "Delta", hint: "Nye kunder og bedre omdømme." }, { label: "Stå over" }],
      data: { cost },
    };
  },
  laerling: (g) => {
    if (g.stage < 1 || g.workers.length >= STAGES[g.stage].staffCap) return null;
    return {
      id: "laerling",
      title: "Lærling",
      text: `Yrkesskolen spør om du kan ta inn en lærling. Lærlingen koster lite, men kan ikke så mye ennå. Etter ${APPRENTICE_DAYS} døgn går lærlingen opp til fagprøven og får fagbrev.`,
      options: [{ label: "Ta inn lærlingen", hint: "Billig arbeidskraft som blir flinkere." }, { label: "Ikke nå" }],
      data: {},
    };
  },
  tilsyn: (g) => {
    if (g.stage < 2) return null;
    const cost = 20_000 * g.stage ** 2;
    return {
      id: "tilsyn",
      title: "Tilsyn varslet",
      text: `Arbeidstilsynet kommer neste uke. En skikkelig opprydding og sikring koster ${fmtKr(cost)}.`,
      options: [
        { label: "Rydd og sikre", hint: "Trygt." },
        { label: "Ta sjansen", hint: `Kan gi bot på ${fmtKr(cost * 3)} og dårligere omdømme.` },
      ],
      data: { cost },
    };
  },
};

const MORE_MAKERS: Record<string, Maker> = {
  utkobling: (g) => {
    const stats = computePlantStats(g);
    if (stats.furnaceMW <= 0 || stats.hours <= 0) return null;
    const hours = 4;
    // Tapt produksjon de fire timene, og en godtgjørelse som noen ganger lønner seg og noen ganger ikke
    const lostT = stats.units.reduce((a, u) => a + ((hours * 60) / u.cycleMin) * u.sizeT * 0.9, 0);
    const pay =
      Math.round((lostT * productPrice(g, stats.mainProduct, "standard") * uniform(g, 0.25, 0.6)) / 100) * 100;
    // Penger betyr lite når kassa er full; fagpoeng betyr noe hele spillet (B-153). Mest i konsernet
    const fp = g.konsern?.unlocked ? 25 : g.stage >= 4 ? 12 : g.stage >= 3 ? 5 : 0;
    const mw = stats.units.reduce((a, u) => a + u.furnaceMW, 0);
    // Rekker ordrekøen fristene med og uten utkobling? Så slipper spilleren å gjette (B-104)
    const lateNow = lateContracts(g, stats).length;
    const lateWith = lateContracts(g, stats, lostT);
    const queued = g.contracts.filter((c) => c.status === "aktiv").length;
    const check =
      queued === 0
        ? "Du har ingen kontrakter i ordrekøen nå."
        : lateWith.length === lateNow
          ? lateNow === 0
            ? `Ordrekøen tåler det: alle ${queued} kontraktene rekker fristen også med utkoblingen.`
            : `${lateNow} av ${queued} kontrakter ser ut til å bli for sene uansett – utkoblingen gjør det ikke verre.`
          : `Med utkoblingen blir ${lateWith.length - lateNow} kontrakt${lateWith.length - lateNow === 1 ? "" : "er"} for sen (${lateWith
              .slice(0, 2)
              .map((c) => c.customer)
              .join(", ")}). Uten: ${lateNow === 0 ? "alle rekker fristen" : `${lateNow} for sene`}.`;
    return {
      id: "utkobling",
      title: "Nettselskapet ringer",
      text: `Strømnettet er hardt belastet. Nettselskapet ber deg koble ut ovnene (${mw.toFixed(1).replace(".", ",")} MW) i morgen kl. 07–11 og tilbyr ${fmtKr(pay)} for det${fp ? `, og ${fp} fagpoeng: dere lærer om fleksibelt strømforbruk sammen` : ""}. ${check}`,
      options: [
        {
          label: `Godta (${fmtKr(pay)}${fp ? ` + ${fp} fagpoeng` : ""})`,
          hint: `Ingen nye charger i fire timer – omtrent ${fmtT(lostT)} mindre stål.`,
        },
        {
          label: "Nei takk",
          hint:
            lateWith.length > lateNow
              ? "Anbefalt: utkoblingen ville gjort leveranser for sene."
              : "Har du dårlig tid med leveranser, er det tryggest å si nei.",
        },
      ],
      data: { pay, fp, from: day(g) * 1440 + 7 * 60, until: day(g) * 1440 + 11 * 60 },
    };
  },
  kurs: (g) => {
    const trainees = g.workers.filter((w) => w.role === "ovn" || w.role === "stoper" || w.role === "allround");
    if (g.stage < 1 || trainees.length < 2) return null;
    const cost = 3_000 * trainees.length * (1 + g.stage);
    return {
      id: "kurs",
      title: "Kurs for operatørene",
      text: `En leverandør tilbyr et kurs i smelting og støping for ${trainees.length} av dine folk. Det koster ${fmtKr(cost)}.`,
      options: [
        { label: "Send dem på kurs", hint: "Flinkere folk gir kortere charger og færre feil." },
        { label: "Ikke nå" },
      ],
      data: { cost },
    };
  },
  sykdom: (g) => {
    // Influensa: mange er borte samtidig (B-031)
    if (g.stage < 1 || g.workers.length < 6) return null;
    const healthy = g.workers.filter((w) => !isAbsent(g, w) && w.absentUntil === undefined);
    const n = Math.min(healthy.length, Math.max(2, Math.round(g.workers.length * uniform(g, 0.2, 0.35))));
    if (n < 2) return null;
    const sick = [...healthy].sort(() => rand(g) - 0.5).slice(0, n);
    const days = Math.round(uniform(g, 2, 4));
    const cost = Math.round(sick.reduce((a, w) => a + w.salary, 0) * 1.5 * days);
    return {
      id: "sykdom",
      title: "Influensa",
      text: `Influensaen har kommet til verket: ${n} av ${g.workers.length} ansatte er syke de neste ${days} døgnene. Avløsere kan dekke noen plasser, men neppe alle.`,
      options: [
        { label: `Lei inn vikarer (${fmtKr(cost)})`, hint: "Verket går som normalt." },
        {
          label: "Gå ned på skiftgangen",
          hint: "Verket kjører de skiftene det er folk til, til de syke er tilbake.",
        },
      ],
      data: { cost, days, ids: sick.map((w) => w.id).join(",") },
    };
  },
  naboklage: (g) => {
    // Er støyskjerm og filter satt opp på dette nivået, klager ikke naboene igjen før verket blir større (B-171)
    if (g.stage < 1 || (g.decisionFixed?.naboklage ?? -1) >= g.stage) return null;
    const cost = 20_000 * (1 + g.stage) ** 2;
    return {
      id: "naboklage",
      title: "Naboene klager",
      text: "Naboene klager på støy og støv fra verket, og har kontaktet kommunen.",
      options: [
        { label: `Sett opp støyskjerm og støvfilter (${fmtKr(cost)})`, hint: "Godt naboskap er godt omdømme." },
        { label: "Beklag og vent", hint: "Kan gå over – eller havne i avisen." },
      ],
      data: { cost },
    };
  },
  // Nye kort (B-171), så det ikke er de samme hele tida
  firmafest: (g) => {
    if (g.stage < 1 || g.workers.length < 4) return null;
    const cost = 300 * g.workers.length * (1 + g.stage);
    return {
      id: "firmafest",
      title: "Sommerfest",
      text: `De ansatte spør om det blir sommerfest i år. Mat, musikk og buss koster ${fmtKr(cost)}.`,
      options: [
        { label: `Arranger fest (${fmtKr(cost)})`, hint: "Trivselen går opp." },
        { label: "Ikke i år", hint: "Noen blir skuffet." },
      ],
      data: { cost },
    };
  },
  sponsor: (g) => {
    if (g.stage < 1 || g.reputation >= 95) return null;
    const cost = 5_000 * (1 + g.stage) ** 2;
    return {
      id: "sponsor",
      title: "Idrettslaget spør",
      text: `Det lokale idrettslaget trenger nye drakter og spør om verket vil sponse dem for ${fmtKr(cost)}. Mange av de ansatte har barn på laget.`,
      options: [
        { label: `Spons laget (${fmtKr(cost)})`, hint: "Godt for omdømmet og trivselen." },
        { label: "Nei takk" },
      ],
      data: { cost },
    };
  },
  soknad: (g) => {
    if (g.stage < 2) return null;
    const cost = 30_000 * g.stage ** 2;
    return {
      id: "soknad",
      title: "Innovasjonsmidler",
      text: `Det er utlyst støtte til å gjøre stålproduksjon grønnere. En god søknad tar tid for ingeniørene og koster ca. ${fmtKr(cost)}. Omtrent halvparten av søkerne får støtte.`,
      options: [
        {
          label: `Søk (${fmtKr(cost)})`,
          hint: `Får du støtte: ${fmtKr(cost * 4)} og fagpoeng. Ellers er pengene brukt.`,
        },
        { label: "Ikke nå" },
      ],
      data: { cost },
    };
  },
  pensjonist: (g) => {
    if (g.stage < 1 || g.workers.length >= STAGES[g.stage].staffCap) return null;
    const roles = g.workers.filter((w) => w.role === "ovn" || w.role === "stoper").map((w) => w.role);
    const role = roles.length ? pick(g, roles) : "allround";
    const w = makeCandidate(g, role);
    w.skill = 4.5;
    w.salary = Math.round(w.salary * 1.3);
    return {
      id: "pensjonist",
      title: "Erfaren fagarbeider",
      text: `${w.name} har jobbet 30 år på stålverk og er lei av å være pensjonist. Vil gjerne jobbe som ${ROLES[role].name.toLowerCase()} igjen, for ${fmtKr(w.salary)} per døgn – litt over vanlig lønn.`,
      options: [{ label: "Ansett", hint: "Svært flink fra første dag, og lærer opp de andre." }, { label: "Nei takk" }],
      data: { role, name: w.name, salary: w.salary },
    };
  },
  kobbertyveri: (g) => {
    // Ikke før støperiet: på verkstedet kunne tyveriet ta hele kassa (B-174)
    if (g.stage < 2) return null;
    // Kameraene er oppe på dette verket (B-210): tyvene holder seg unna til du flytter
    if ((g.decisionFixed?.kobbertyveri ?? -1) >= g.stage) return null;
    const cost = 15_000 * (1 + g.stage) ** 2;
    return {
      id: "kobbertyveri",
      title: "Kobbertyver i området",
      text: `Politiet varsler om tyver som stjeler kobberkabler fra industriområder. Kameraer og vakthold koster ${fmtKr(cost)}.`,
      options: [
        { label: `Sett opp kameraer (${fmtKr(cost)})`, hint: "Trygt." },
        { label: "Ta sjansen", hint: `Stjeler de kablene, kan reparasjonen koste ${fmtKr(cost * 2)}.` },
      ],
      data: { cost },
    };
  },
  studenter: (g) => {
    if (g.stage < 1) return null;
    return {
      id: "studenter",
      title: "Besøk fra fagskolen",
      text: "En klasse fra fagskolen vil se hvordan stål lages. Det tar litt tid for de ansatte, men elevene stiller gode spørsmål.",
      options: [{ label: "Vis dem rundt", hint: "Fagpoeng – og kanskje en ny søker." }, { label: "Ikke nå" }],
      data: {},
    };
  },
  video: (g) => {
    if (g.stage < 2) return null;
    const cost = 10_000 * g.stage ** 2;
    return {
      id: "video",
      title: "Video på nett",
      text: `En video av mørk røyk fra verket sprer seg på sosiale medier. Det var damp fra kjølevannet, men mange tror det er forurensning. En åpen dag og målinger koster ${fmtKr(cost)}.`,
      options: [
        { label: `Forklar og vis målingene (${fmtKr(cost)})`, hint: "Folk får vite hva det var." },
        { label: "Ignorer det", hint: "Det kan gå over – eller bli en sak." },
      ],
      data: { cost },
    };
  },
  utlandsordre: (g) => {
    const stats = computePlantStats(g);
    if (g.stage < 3 || stats.dailyProductT <= 0) return null;
    const product = stats.mainProduct;
    const t = Math.max(1, Math.round(stats.dailyProductT * uniform(g, 2.5, 4)));
    const pricePerT = Math.round(productPrice(g, product, "standard") * 1.15);
    return {
      id: "utlandsordre",
      title: "Stor ordre fra utlandet",
      text: `En kunde i utlandet vil ha ${fmtT(t)} i standardkvalitet innen ti døgn, og betaler 15 % over vanlig pris. En så stor ordre tar mye av kapasiteten.`,
      options: [{ label: "Ta ordren", hint: "God pris, men sjekk at ordrekøen tåler det." }, { label: "Avslå" }],
      data: { t, pricePerT, product },
    };
  },
  kundebesok: (g) => {
    if (g.stage < 2) return null;
    return {
      id: "kundebesok",
      title: "Kundebesøk",
      text: "En stor kunde vil se verket før de bestemmer seg for en ny leverandør.",
      options: [
        { label: "Vis dem rundt", hint: "Et ryddig verk kan gi en god kontrakt." },
        { label: "Ikke nå", hint: "Kunden finner en annen." },
      ],
      data: {},
    };
  },
  nestenulykke: (g) => {
    if (g.stage < 1) return null;
    const cost = 10_000 * (1 + g.stage) ** 2;
    return {
      id: "nestenulykke",
      title: "Nestenulykke",
      text: "Flytende stål sprutet ved tappingen og var nær ved å treffe en operatør.",
      options: [
        {
          label: `Kjøp verneutstyr og skjermer (${fmtKr(cost)})`,
          hint: "Ingen skal skades på jobb. Folk og kunder merker det.",
        },
        {
          label: "La det gå denne gangen",
          hint: "Folk merker at sikkerheten ikke prioriteres – og neste gang kan det gå verre.",
        },
      ],
      data: { cost },
    };
  },
};

/** Lager kortet med denne id-en nå, eller null hvis det ikke passer (brukes av testene) */
export function makeDecision(g: GameState, id: string): Omit<Decision, "resumeSpeed"> | null {
  const all = { ...MAKERS, ...MORE_MAKERS };
  return all[id]?.(g) ?? null;
}

/** Samme kort kommer ikke igjen før det har gått så mange døgn */
const COOLDOWN_DAYS = 25;
/** Noen kort kom for ofte (B-171): nettselskapet, naboene og messa får lengre pause */
const CARD_COOLDOWN: Record<string, number> = { utkobling: 50, naboklage: 60, messe: 50, avis: 40, tilsyn: 40 };
/** Minst så mange døgn mellom to kort */
const MIN_GAP_DAYS = 2;
/**
 * Samme kort kommer ikke igjen før det har gått 20 minutter i ekte tid (B-210). Pausen i spilldøgn (25) var bare fem
 * minutter på 10×, så noen spillere fikk det samme kortet mange ganger på rad. På 10× er 20 minutter 100 spilldøgn;
 * på 1× og 3× endrer det nesten ingenting.
 */
export const SAME_CARD_REAL_MS = 20 * 60_000;

/** Kalles én gang per døgn. Lager av og til et nytt kort og pauser spillet. */
export function maybeCreateDecision(g: GameState): void {
  if (g.pendingDecision || g.pendingManual || g.gameOver || day(g) < 3) return;
  const today = day(g);
  const lastAny = Math.max(0, ...Object.values(g.decisionSeen));
  if (today - lastAny < MIN_GAP_DAYS) return;
  if (!chance(g, DAILY_CHANCE)) return;
  const all = { ...MAKERS, ...MORE_MAKERS };
  // Kort som ikke har vært vist på lenge, først de som aldri er vist
  const now = realNow();
  const ids = Object.keys(all).filter(
    (id) =>
      today - (g.decisionSeen[id] ?? -999) >= (CARD_COOLDOWN[id] ?? COOLDOWN_DAYS) &&
      now - (g.decisionSeenAt?.[id] ?? -Infinity) >= SAME_CARD_REAL_MS,
  );
  for (let tries = 0; tries < 6 && ids.length; tries++) {
    const id = pick(g, ids);
    const d = all[id](g);
    if (!d) {
      ids.splice(ids.indexOf(id), 1);
      continue;
    }
    g.decisionSeen[id] = today;
    g.decisionSeenAt = { ...g.decisionSeenAt, [id]: now };
    g.pendingDecision = { ...d, resumeSpeed: g.speed > 0 ? g.speed : 1 };
    g.speed = 0;
    return;
  }
}

// ------------------------------------------------------------------ //
// Rådgiveren (B-025): kommer når omdømmet faller flere ganger av samme grunn
// ------------------------------------------------------------------ //
const ADVICE: Record<RepCause, { chapter: string; title: string; text: string; specialist: string; effect: string }> = {
  reklamasjon: {
    chapter: "analyse",
    title: "Rådgiveren: kundene reklamerer",
    text: "Kundene har reklamert flere ganger på kort tid. Det betyr at stålet ikke holder analysen de betaler for. Oftest er resepten for nær grensene, eller du vet ikke sikkert hva som er i stålet fordi du ikke måler det. Trykk «Sikrest» under Verket → Resept, og skaff et analyseinstrument.",
    specialist: "Kvalitetsingeniør",
    effect: "Måler alt stål med spektrometer i ti døgn, så bare partier som holder kravet leveres.",
  },
  sen: {
    chapter: "omdomme",
    title: "Rådgiveren: leveransene kommer for sent",
    text: "Flere kontrakter har gått over fristen. Enten tar du på deg mer enn verket rekker, eller så produseres ting i feil rekkefølge. Sett kontraktene med kortest frist øverst i ordrekøen, og si nei til forespørsler du ikke rekker.",
    specialist: "Innleid planlegger",
    effect: "Sorterer ordrekøen etter frist og kjøper inn skrap i ti døgn.",
  },
  havari: {
    chapter: "ildfast",
    title: "Rådgiveren: for mange havarier",
    text: "Verket har hatt flere havarier på kort tid. En gjennombrent foring koster mange ganger en planlagt omforing. Bytt foringen før den er slitt, og vurder en vedlikeholdsplan.",
    specialist: "Vedlikeholdsspesialist",
    effect: "Bytter foringen i tide i ti døgn og går gjennom ovnene med en gang.",
  },
};

const ADVISOR_WINDOW_DAYS = 10;
const ADVISOR_COOLDOWN_DAYS = 20;
export const SPECIALIST_DAYS = 10;

export function specialistCost(g: GameState): number {
  return 15_000 * (1 + g.stage) ** 2;
}

/** Tre omdømmetap av samme grunn på ti døgn gir besøk av rådgiveren. */
export function maybeAdvisor(g: GameState): void {
  const today = day(g);
  for (const cause of Object.keys(ADVICE) as RepCause[]) {
    const recent = g.repLog.filter((r) => r.cause === cause && r.day > today - ADVISOR_WINDOW_DAYS).length;
    if (recent < 3) continue;
    if ((g.advisorSeen[cause] ?? -999) > today - ADVISOR_COOLDOWN_DAYS) continue;
    const a = ADVICE[cause];
    const cost = specialistCost(g);
    g.advisorSeen[cause] = today;
    // Har verket egne planleggere, hjelper ikke en innleid (B-223): da er det for mange ordrer, ikke feil rekkefølge
    const noHire = cause === "sen" && g.workers.some((w) => w.role === "planlegger");
    const book = { label: "Les om det i fagboka", hint: knowledgeCard(a.chapter)?.title, chapter: a.chapter };
    g.pendingDecision = {
      id: "radgiver",
      title: a.title,
      text: noHire
        ? "Flere kontrakter har gått over fristen. Planleggerne dine setter allerede kortest frist øverst, så verket har tatt på seg mer enn det rekker. Si nei til forespørsler du ikke rekker – og har du salgsdirektør, kan du slå av at den tar rammeavtaler (under Folk → Ansatte)."
        : a.text,
      options: noHire
        ? [book, { label: "Jeg ordner det selv" }]
        : [
            { label: `Lei inn ${a.specialist.toLowerCase()} (${fmtKr(cost)})`, hint: a.effect },
            book,
            { label: "Jeg ordner det selv" },
          ],
      data: { cause, cost, noHire: noHire ? 1 : 0 },
      resumeSpeed: g.speed > 0 ? g.speed : 1,
    };
    g.speed = 0;
    return;
  }
}

/** Er en innleid spesialist for denne årsaken på jobb nå? */
export function specialistActive(g: GameState, cause: RepCause): boolean {
  return (g.specialists[cause] ?? 0) > g.minute;
}

export function resolveDecision(g: GameState, option: number): void {
  const d = g.pendingDecision;
  if (!d) return;
  g.pendingDecision = null;
  // Etter et kort går spillet videre på 1×, så man ikke raser videre på 10× (B-033) – med mindre spilleren har
  // valgt å fortsette i samme fart (B-160)
  const keep = g.settings.keepSpeed && d.resumeSpeed > 1;
  g.speed = d.resumeSpeed > 0 ? (keep ? d.resumeSpeed : 1) : 0;
  // Første gang farten settes ned fra 3× eller 10×, forklares det med et tips (B-069)
  if (d.resumeSpeed > 1 && !keep && d.id !== "tips-fart-ned") countEvent(g, "fartNed");
  const yes = option === 0;
  const n = (k: string) => Number(d.data[k] ?? 0);
  switch (d.id) {
    case "billigparti":
      if (!yes) return;
      addCost(g, "skrap", n("price"));
      // Et ukjent parti er ofte dårlig, og kan skjule en strålekilde
      addScrapParti(g, "blandet", n("t"), {
        p: SCRAP_TYPES.blandet.p * uniform(g, 1.2, 2.6),
        tramp: SCRAP_TYPES.blandet.tramp * uniform(g, 1.1, 1.8),
        c: SCRAP_TYPES.blandet.c,
        dirt: SCRAP_TYPES.blandet.dirt * 1.5,
        radioactive: chance(g, 0.04),
      });
      log(g, `Du kjøpte ${fmtT(n("t"))} billig skrap av ukjent opprinnelse.`, "info");
      return;
    case "hasteordre": {
      if (!yes) return;
      const c: Contract = {
        id: g.nextContractId++,
        customer: pick(g, ["Maskinverksted i nød", "Entreprenør med dårlig tid", "Verft med forsinkelse"]),
        product: d.data.product as Contract["product"],
        grade: "standard",
        tonnes: n("t"),
        delivered: 0,
        pricePerT: n("pricePerT"),
        deadlineDay: day(g) + 2,
        offerExpiresMin: g.minute,
        repGain: 1.5,
        repLoss: 3,
        penaltyPerT: Math.round(n("pricePerT") * 0.5),
        status: "tilbud",
        closedDay: null,
        priority: 0,
      };
      g.contracts.push(c);
      acceptContract(g, c.id);
      return;
    }
    case "lonnskrav":
      if (yes) {
        for (const w of g.workers) w.salary = Math.round(w.salary * 1.04);
        for (const w of g.workers) w.skill = Math.min(5, w.skill + 0.1);
        adjustMorale(g, 10);
        log(g, "De ansatte fikk lønnstillegg og er fornøyde.", "good");
      } else if (option === 1 && chance(g, 0.6)) {
        for (const w of g.workers) w.salary = Math.round(w.salary * 1.02);
        adjustMorale(g, 3);
        log(g, "De ansatte godtok mottilbudet på 2 %. Enighet uten bråk.", "good");
      } else if (option === 1) {
        for (const w of g.workers) w.salary = Math.round(w.salary * 1.03);
        const quitter = pick(g, g.workers);
        g.workers = g.workers.filter((w) => w !== quitter);
        adjustMorale(g, -5);
        log(g, `Mottilbudet ble for lavt. Dere møttes på 3 %, men ${quitText([quitter])}`, "bad");
      } else {
        adjustMorale(g, -15);
        const quitters = g.workers.filter(() => chance(g, 0.12)).slice(0, 3);
        g.workers = g.workers.filter((w) => !quitters.includes(w));
        log(
          g,
          quitters.length
            ? `Lønnskravet ble avslått. ${quitText(quitters)}`
            : "Lønnskravet ble avslått. Stemningen er dårlig, men alle blir.",
          quitters.length ? "bad" : "info",
        );
      }
      return;
    case "avis":
      if (!yes) return;
      if (n("recentComplaints") > 0) {
        adjustReputation(g, -2);
        log(g, "Avisen skrev mest om reklamasjonene dine. Omdømme −2.", "bad");
      } else {
        adjustReputation(g, 2);
        log(g, "Avisen skrev en fin reportasje om verket. Omdømme +2.", "good");
      }
      return;
    case "messe":
      if (!yes) return;
      addCost(g, "annet", n("cost"));
      adjustReputation(g, 3);
      log(g, "Messen ga mange nye kontakter. Omdømme +3.", "good");
      return;
    case "laerling":
      if (!yes) return;
      {
        const w = makeCandidate(g, "allround");
        w.skill = 1;
        w.salary = Math.round(w.salary * 0.5);
        w.hiredDay = day(g);
        w.name = `${w.name} (lærling)`;
        // Etter læretida går lærlingen opp til fagprøven og får fagbrev (B-163)
        w.apprenticeUntil = day(g) + APPRENTICE_DAYS;
        g.workers.push(w);
        log(g, `${w.name} har begynt som lærling. Fagprøven er om ${APPRENTICE_DAYS} døgn.`, "info");
      }
      return;
    case "kurs":
      if (!yes) return;
      addCost(g, "annet", n("cost"));
      for (const w of g.workers)
        if (w.role === "ovn" || w.role === "stoper" || w.role === "allround") w.skill = Math.min(5, w.skill + 0.4);
      adjustMorale(g, 5);
      log(g, "Operatørene er tilbake fra kurs og har lært mye.", "good");
      return;
    case "sykdom": {
      const ids = String(d.data.ids ?? "")
        .split(",")
        .map(Number);
      const until = g.minute + n("days") * 1440;
      for (const w of g.workers)
        if (ids.includes(w.id)) {
          w.absentFrom = g.minute;
          w.absentUntil = until;
          w.absentReason = "syk";
        }
      if (yes) {
        addCost(g, "lonn", n("cost"));
        g.tempsUntilMin = Math.max(g.tempsUntilMin ?? 0, until);
        log(g, "Vikarene holder verket i gang mens de syke er borte.", "info");
      } else {
        log(g, "Verket kjører med de folkene det har til de syke er tilbake.", "event");
      }
      return;
    }
    case "naboklage":
      if (yes) {
        addCost(g, "annet", n("cost"));
        adjustReputation(g, 1);
        g.decisionFixed = { ...(g.decisionFixed ?? {}), naboklage: g.stage };
        log(
          g,
          "Støyskjermen og filteret er på plass. Naboene er fornøyde, og klager ikke igjen før verket blir større. Omdømme +1.",
          "good",
        );
      } else if (chance(g, 0.5)) {
        adjustReputation(g, -3);
        log(g, "Naboklagene havnet i avisen. Omdømme −3.", "bad");
      } else {
        log(g, "Klagene stilnet av denne gangen.", "info");
      }
      return;
    case "firmafest":
      if (yes) {
        addCost(g, "annet", n("cost"));
        adjustMorale(g, 8);
        log(g, "Sommerfesten ble en suksess. Trivsel +8.", "good");
      } else {
        adjustMorale(g, -2);
        log(g, "Ingen sommerfest i år. Noen er skuffet (trivsel −2).", "info");
      }
      return;
    case "sponsor":
      if (!yes) return;
      addCost(g, "annet", n("cost"));
      adjustReputation(g, 2);
      adjustMorale(g, 2);
      log(g, "Laget spiller med verkets logo på draktene. Omdømme +2, trivsel +2.", "good");
      return;
    case "soknad":
      if (!yes) return;
      addCost(g, "annet", n("cost"));
      if (chance(g, 0.5)) {
        addIncome(g, "annet", n("cost") * 4);
        awardPoints(g, 5 + g.stage * 2);
        log(
          g,
          `Søknaden gikk gjennom! Verket får ${fmtKr(n("cost") * 4)} i støtte og ${5 + g.stage * 2} fagpoeng.`,
          "good",
        );
      } else {
        log(g, "Søknaden fikk avslag denne gangen.", "info");
      }
      return;
    case "pensjonist": {
      if (!yes || g.workers.length >= STAGES[g.stage].staffCap) return;
      const w = makeCandidate(g, d.data.role as Worker["role"]);
      w.name = String(d.data.name);
      w.skill = 4.5;
      w.salary = n("salary");
      w.hiredDay = day(g);
      g.workers.push(w);
      log(g, `${w.name} er tilbake i arbeid og deler gjerne av 30 års erfaring.`, "good");
      return;
    }
    case "kobbertyveri":
      if (yes) {
        addCost(g, "annet", n("cost"));
        g.decisionFixed = { ...(g.decisionFixed ?? {}), kobbertyveri: g.stage };
        log(g, "Kameraene er oppe. Tyvene holder seg unna så lenge verket står her.", "good");
      } else if (chance(g, 0.4)) {
        addCost(g, "vedlikehold", n("cost") * 2);
        log(g, `Tyver stjal kobberkabler i natt. Reparasjonen kostet ${fmtKr(n("cost") * 2)}.`, "bad");
      } else {
        log(g, "Tyvene gikk til et annet område denne gangen.", "info");
      }
      return;
    case "studenter":
      if (!yes) return;
      awardPoints(g, 2 + g.stage);
      adjustReputation(g, 1);
      if (chance(g, 0.3)) {
        g.candidates.push(makeCandidate(g));
        log(g, `Elevene lærte mye, og en av dem søkte jobb (se Folk → Ansett). +${2 + g.stage} fagpoeng.`, "good");
      } else log(g, `Elevene lærte mye, og de ansatte også. +${2 + g.stage} fagpoeng, omdømme +1.`, "good");
      return;
    case "video":
      if (yes) {
        addCost(g, "annet", n("cost"));
        adjustReputation(g, 1);
        log(g, "Målingene viste at det var damp. Folk syntes verket var åpent og ærlig. Omdømme +1.", "good");
      } else if (chance(g, 0.5)) {
        adjustReputation(g, -2);
        log(g, "Videoen ble en sak i lokalavisen. Omdømme −2.", "bad");
      } else {
        log(g, "Videoen ble glemt etter noen dager.", "info");
      }
      return;
    case "utlandsordre": {
      if (!yes) return;
      const c: Contract = {
        id: g.nextContractId++,
        customer: "Kunde i utlandet",
        product: d.data.product as Contract["product"],
        grade: "standard",
        tonnes: n("t"),
        delivered: 0,
        pricePerT: n("pricePerT"),
        deadlineDay: day(g) + 10,
        offerExpiresMin: g.minute,
        repGain: 2,
        repLoss: 3,
        penaltyPerT: Math.round(n("pricePerT") * 0.3),
        status: "tilbud",
        closedDay: null,
        priority: 0,
      };
      g.contracts.push(c);
      acceptContract(g, c.id);
      return;
    }
    case "kundebesok":
      if (!yes) return;
      adjustReputation(g, 1);
      g.bonusOffer = true;
      log(g, "Kunden var imponert. En god forespørsel kommer snart. Omdømme +1.", "good");
      return;
    case "nestenulykke":
      if (yes) {
        addCost(g, "annet", n("cost"));
        adjustMorale(g, 5);
        adjustReputation(g, 1);
        log(
          g,
          "Nytt verneutstyr og sprutskjermer er på plass. De ansatte er fornøyde (trivsel +5), omdømme +1.",
          "good",
        );
      } else if (chance(g, 0.35) && g.workers.length) {
        const hurt = pick(g, g.workers);
        g.workers = g.workers.filter((w) => w !== hurt);
        adjustMorale(g, -15);
        addCost(g, "bot", 50_000 * (1 + g.stage));
        adjustReputation(g, -4);
        log(
          g,
          `${workerLabel(hurt)} ble skadet ved tappingen og er sykmeldt på ubestemt tid. Bot fra tilsynet og omdømme −4. Ansett en ny under Folk → Ansett.`,
          "bad",
        );
      } else {
        adjustMorale(g, -5);
        adjustReputation(g, -1);
        log(g, "Det gikk bra denne gangen, men det snakkes om sikkerheten på verket. Trivsel −5, omdømme −1.", "bad");
      }
      return;
    case "radgiver": {
      if (!yes || n("noHire")) return;
      const cause = d.data.cause as RepCause;
      addCost(g, "annet", n("cost"));
      g.specialists[cause] = g.minute + SPECIALIST_DAYS * 1440;
      if (cause === "havari") for (const f of g.furnaces) if (f.wear > 0.5) f.relineRequested = true;
      if (cause === "reklamasjon") {
        // Kvalitetsingeniøren måler også stålet som ligger på lager, så dårlige partier ikke leveres (B-034)
        let held = 0;
        for (const lot of g.lots) {
          lot.known = { ...lot.analysis };
          lot.measured = { c: true, p: true, tramp: true };
          if (!satisfiedGrades(lot.analysis).length) held += lot.t;
        }
        log(
          g,
          `Kvalitetsingeniøren har målt alt på lager.${held > 0 ? ` ${fmtT(held)} holder ingen kvalitet og blir ikke levert.` : ""} Reklamasjoner på stål som alt er levert, kan fortsatt komme de neste døgnene.`,
          "info",
        );
      }
      log(g, `${ADVICE[cause].specialist} er leid inn i ${SPECIALIST_DAYS} døgn. ${ADVICE[cause].effect}`, "good");
      return;
    }
    case "utkobling":
      if (!yes) return;
      g.gridCut = { fromMin: n("from"), untilMin: n("until") };
      addIncome(g, "annet", n("pay"));
      awardPoints(g, n("fp"));
      unlock(g, "strom");
      log(
        g,
        `Avtalt utkobling i morgen kl. 07–11. Nettselskapet betalte ${fmtKr(n("pay"))}${n("fp") ? ` og ${n("fp")} fagpoeng` : ""}.`,
        "good",
      );
      return;
    case "tilsyn":
      if (yes) {
        addCost(g, "annet", n("cost"));
        log(g, "Tilsynet fant ingenting å utsette.", "good");
      } else if (chance(g, 0.5)) {
        addCost(g, "bot", n("cost") * 3);
        adjustReputation(g, -3);
        log(g, `Tilsynet fant mangler. Bot ${fmtKr(n("cost") * 3)} og omdømme −3.`, "bad");
      } else {
        log(g, "Tilsynet gikk bra denne gangen.", "info");
      }
      return;
  }
}
