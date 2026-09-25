/**
 * Automatisk testspiller for balansering.
 *
 * Kjør med `npx tsx src/game/balance.ts` fra frontend/. Spilleren gjør det en
 * fornuftig menneskelig spiller ville gjort: kjøper skrap, tar kontrakter den
 * rekker, ansetter folk og bygger ut når det er råd. Skriptet sjekker at
 * progresjonen havner innenfor målene, og feiler ellers (brukes i CI).
 */
import {
  bonusCost,
  buyFpDeal,
  buyUpgrade,
  courseCost,
  fpDeal,
  keyUpgrade,
  doResearch,
  giveBonus,
  hire,
  requestReline,
  sendOnCourse,
  setPowerDeal,
  canWarn,
  warnAbsence,
  setRecipe,
  setTargetGrade,
  unitId,
  upgradeOptions,
} from "./actions";
import { resolveDecision } from "./decisions";
import {
  buyShared,
  buySister,
  KONSERN_SHARED,
  MAX_SISTERS,
  MODERNIZE_MAX,
  modernizeCost,
  modernizeSister,
  SISTER_TYPES,
  type SharedId,
} from "./konsern";
import { answerQuiz, QUIZ, quizAvailable } from "./quiz";
import { hasResearch, missingResearchFor, RESEARCH, researchOptions, scrapUnlocked } from "./research";
import { ADDONS, CASTINGS, FURNACES, SCRAP_IDS, STAGES } from "./data";
import {
  acceptAgreement,
  acceptContract,
  agreementLoadUntil,
  advance,
  CONTRACT_MARGIN,
  realisticDailyT,
  autoBuy,
  completeManual,
  newGame,
  TARGET_C,
} from "./engine";
import { EAFSimulation } from "../sim/eaf";
import { createSim } from "../ui/control/simSetup";
import { MELT_BAND, SimpleRunner, SLAG_DONE_KG } from "../ui/control/simpleRunner";
import { computePlantStats, day, fixedPriceAdvice, hasPlanner, satisfies } from "./plant";
declare const process: { argv: string[]; exitCode?: number; exit?: (code: number) => void };

import type { Crew, GameState, GradeId, ManualRequest, RoleId, ScrapId, SisterType } from "./types";

type Recipe = Partial<Record<ScrapId, number>>;

const PRESETS: Recipe[] = [
  { blandet: 50, tungt: 40, retur: 10 },
  { shredder: 50, tungt: 40, retur: 10 },
  { tungt: 60, rent: 30, retur: 10 },
  { rent: 70, tungt: 20, retur: 10 },
  { rent: 50, rajern: 40, retur: 10 },
];

function expectedFor(g: GameState, recipe: Recipe, grade: GradeId) {
  const stats = computePlantStats(g);
  const total = Object.values(recipe).reduce((a, b) => a + (b ?? 0), 0);
  const nominal: Record<ScrapId, { c: number; p: number; tramp: number; price: number }> = {
    blandet: { c: 0.15, p: 0.03, tramp: 0.3, price: 2500 },
    tungt: { c: 0.2, p: 0.02, tramp: 0.16, price: 3100 },
    shredder: { c: 0.1, p: 0.018, tramp: 0.22, price: 3300 },
    spon: { c: 0.3, p: 0.035, tramp: 0.35, price: 1700 },
    rent: { c: 0.08, p: 0.012, tramp: 0.05, price: 4200 },
    rajern: { c: 4, p: 0.05, tramp: 0.01, price: 5000 },
    retur: { c: 0.2, p: 0.02, tramp: 0.15, price: 0 },
  };
  let c = 0;
  let p = 0;
  let tramp = 0;
  let price = 0;
  for (const [id, w] of Object.entries(recipe) as [ScrapId, number][]) {
    c += (nominal[id].c * w) / total;
    p += (nominal[id].p * w) / total;
    tramp += (nominal[id].tramp * w) / total;
    price += (nominal[id].price * w) / total;
  }
  const target = TARGET_C[grade];
  const finalC = stats.furnace.decarb ? target : Math.max(c * 0.95, target);
  // Litt sikkerhetsmargin, slik en forsiktig spiller ville gjort uten full analyse
  const margin = stats.lab === 2 ? 1 : 0.85;
  const analysis = { c: finalC, p: (p * (1 - stats.dephos)) / margin, tramp: tramp / margin };
  return { ok: satisfies(analysis, grade), price };
}

function cheapestRecipe(g: GameState, grade: GradeId): Recipe | null {
  let best: Recipe | null = null;
  let bestPrice = Infinity;
  for (const r of PRESETS) {
    if (!SCRAP_IDS.every((id) => !r[id] || scrapUnlocked(g, id))) continue;
    const e = expectedFor(g, r, grade);
    if (e.ok && e.price < bestPrice) {
      best = r;
      bestPrice = e.price;
    }
  }
  return best;
}

/** Den sikreste resepten: minst forurensning, uansett pris (knappen «Sikrest») */
function safestRecipe(g: GameState, grade: GradeId): Recipe | null {
  const ok = PRESETS.filter(
    (r) => SCRAP_IDS.every((id) => !r[id] || scrapUnlocked(g, id)) && expectedFor(g, r, grade).ok,
  );
  const tramp = (r: Recipe) => (r.rent ?? 0) + (r.rajern ?? 0);
  return ok.sort((a, b) => tramp(b) - tramp(a))[0] ?? null;
}

/**
 * Noterer én gang per døgn hva som sperrer: flyttingen til neste nivå (penger eller omdømme), og om ny ovn eller
 * støping på dette nivået venter på forskning
 */
function noteWait(g: GameState, options: ReturnType<typeof upgradeOptions>): void {
  const list = waits.get(g);
  if (!list || list.at(-1)?.day === day(g)) return;
  const move = options.find((o) => o.kind === "stage");
  const on = !move
    ? "ferdig"
    : move.reason?.startsWith("Krever omdømme")
      ? "omdømme"
      : move.reason === "For lite penger"
        ? "penger"
        : "klar";
  const research = options.some(
    (o) =>
      (o.kind === "furnace" || o.kind === "casting") &&
      o.stage === g.stage &&
      !o.owned &&
      o.reason?.startsWith("Forsk fram"),
  );
  const fp = g.researchPoints + g.researched.reduce((a, id) => a + (RESEARCH.find((r) => r.id === id)?.cost ?? 0), 0);
  list.push({ day: day(g), stage: g.stage, on, research, fp });
}

function applyRecipe(g: GameState, r: Recipe): void {
  for (const id of SCRAP_IDS) setRecipe(g, id, r[id] ?? 0);
}

const RESEARCH_PRIORITY = [
  // Det som låser opp neste ovn og støping først – resten når det er råd
  "rutiner",
  "salgsrutiner",
  "stodig",
  "skrapkjop",
  "induksjon",
  "ordreplan",
  "nyskrap",
  "maskinforming",
  "blokkstoping",
  "lysbue",
  "strengstoping",
  "osemetallurgi",
  "valsing",
  "kundepleie",
  "energistyring",
  "vedlikeholdsplan",
  "innkjop",
  "bemanning",
  "stralevern",
  "rontgen",
  "opplaering",
  "spektrometri",
  "rajern",
  "hoyeffekt",
  "sikkerhet",
  "sortering",
  "ildfast",
  "skumslagg",
  "forvarming",
  "eksport",
  // Storverket (B-085)
  "prosessdata",
  "hoyhastighet",
  "skraplogistikk",
  "elektrodestyring",
  "kvalitetsledelse",
  "prediktivt",
  "ledelse",
  "produktutvikling",
  "gronnstal",
];

/** Spill der testspilleren venter med å bytte støping til kontraktene på det gamle produktet er levert */
const switching = new WeakSet<GameState>();

/**
 * Nybegynner (B-062): en spiller som ser innom hver tredje time, svarer riktig på halve quizen, forsker på det
 * billigste først, tar kontrakter litt optimistisk, bruker sikreste resept og kjøper utstyr uten plan.
 */
const novices = new WeakSet<GameState>();

/** Hva testspilleren venter på per døgn (penger, omdømme, forskning), til --vansker */
const waits = new WeakMap<GameState, { day: number; stage: number; on: string; research: boolean; fp: number }[]>();

/** Testspilleren holder to murere per lysbueovn */
const MASONS_BOT = 2;

function botHour(g: GameState): void {
  // Hendelseskort: forsiktige valg, som en fornuftig spiller
  if (g.pendingDecision) {
    const d = g.pendingDecision;
    const safe: Record<string, number> = {
      billigparti: 1,
      hasteordre: 1,
      lonnskrav: 1,
      avis: 0,
      laerling: 0,
      tilsyn: 0,
      kurs: 0,
      sykdom: 0,
      naboklage: 0,
      kundebesok: 0,
      nestenulykke: 0,
      utkobling: 1,
    };
    // Messa bare når det er god råd
    const affordable = g.cash > Number(d.data.cost ?? 0) * 4;
    safe.messe = affordable ? 0 : 1;
    for (const id of ["kurs", "sykdom", "naboklage", "nestenulykke"]) if (!affordable) safe[id] = 1;
    safe.radgiver = affordable ? 0 : 2;
    resolveDecision(g, safe[d.id] ?? 1);
  }
  // Folk: bonus når trivselen er lav, kurs til de minst erfarne når det er god råd (B-026)
  const novice = novices.has(g);
  if (!novice && g.workers.length && g.morale < 50 && g.cash > bonusCost(g) * 5) giveBonus(g);
  // En fornuftig spiller gir advarsel til dem som ofte er borte (B-101)
  // Begge følger rådet på Verket om fastpris når strømprisen er høy (B-105)
  if (fixedPriceAdvice(g, computePlantStats(g).hours)) setPowerDeal(g, "fast");
  // Nybegynneren følger rådet på Verket om å gi advarsel
  for (const w of g.workers) if (canWarn(g, w)) warnAbsence(g, w.id);
  if (!novice && g.stage >= 2 && g.cash > courseCost(g) * 40) {
    const w = g.workers.find((x) => x.skill < 2.5 && (x.courseDay === undefined || day(g) - x.courseDay >= 30));
    if (w) sendOnCourse(g, w.id);
  }
  // Fagboka: testspilleren leser alle kapitler den får
  for (const k of g.knowledge) if (!g.readChapters.includes(k)) g.readChapters.push(k);
  // …og tar quizen, som en vanlig spiller. Omtrent tre av fire svar riktige (B-052)
  for (const k of g.knowledge) {
    const quiz = QUIZ[k];
    if (!quiz || !quizAvailable(g, k)) continue;
    const answers = quiz.map((q, i) =>
      novice
        ? i % 2 === 0
          ? q.correct
          : (q.correct + 1) % q.options.length
        : i === 0 || g.quizDone.length % 2 === 0
          ? q.correct
          : (q.correct + 1) % q.options.length,
    );
    answerQuiz(g, k, answers);
  }
  // Forskning: alt som er tilgjengelig, i tabellens rekkefølge
  // Forskning i prioritert rekkefølge, som en spiller som vet hva som gir mest: spar opp til det viktigste
  // Etter en radioaktiv kilde vil en fornuftig spiller ha strålingsportal (B-045)
  const priority = g.lastRadioDay !== undefined ? ["stralevern", ...RESEARCH_PRIORITY] : RESEARCH_PRIORITY;
  // Nybegynneren forsker på det utstyrskortene sier mangler («Forsk fram: …»), ellers på det billigste som er klart
  if (novice) {
    const wanted = upgradeOptions(g)
      .filter((o) => !o.owned && !o.locked && o.stage === g.stage && o.reason?.startsWith("Forsk fram"))
      .map((o) => missingResearchFor(g, o.baseId)?.id);
    const options = researchOptions(g);
    const want = options.find((x) => wanted.includes(x.id));
    const pick = want
      ? want.available
        ? want
        : undefined
      : options.filter((x) => x.available).sort((a, b) => a.cost - b.cost)[0];
    if (pick) doResearch(g, pick.id);
    // Står forskningen fast, følger nybegynneren hintet og kjøper et forskningssamarbeid når det er penger til overs (B-064)
    const key = keyUpgrade(g);
    const keyResearch = key?.reason?.startsWith("Forsk fram") ? missingResearchFor(g, key.baseId) : undefined;
    const need = keyResearch ? keyResearch.cost - g.researchPoints : 0;
    const deal = fpDeal(g);
    if (need > 0 && !deal.reason && g.cash > deal.price * 10) buyFpDeal(g);
  }
  for (const id of novice ? [] : priority) {
    const r = researchOptions(g).find((x) => x.id === id);
    if (!r || r.done || r.locked) continue;
    if (r.available) doResearch(g, r.id);
    else if (!r.reason?.startsWith("Krever")) break;
  }
  const stats = computePlantStats(g);
  const today = day(g);

  // Foring: bestill ny foring før den blir farlig tynn (skjer ikke av seg selv, B-022)
  g.furnaces.forEach((f, i) => {
    if (f.wear >= (novice ? 0.8 : 0.88) && !f.relineRequested && g.minute >= f.downUntilMin) requestReline(g, i);
  });

  // Kontrakter: ta de som kan lages og rekkes
  const active = g.contracts.filter((c) => c.status === "aktiv");
  let committed = active.reduce((a, c) => a + c.tonnes - c.delivered, 0);
  const activeGrades = new Set(active.map((c) => c.grade));
  for (const offer of g.contracts.filter((c) => c.status === "tilbud")) {
    if (!stats.products.includes(offer.product)) continue;
    // Skal støpingen byttes til et nytt produkt, tas ikke flere kontrakter på det gamle
    if (switching.has(g) && offer.product === stats.casting.product) continue;
    // Nybegynneren gjør som kortet sier: ingen nye kontrakter på det gamle produktet før byttet
    if (novice && offer.product === stats.casting.product && keyUpgrade(g)?.reason?.startsWith("Lever først")) continue;
    // Med valseverket i drift går alle emner til armering
    if (stats.products.includes("armering") && offer.product !== "armering") continue;
    if (!cheapestRecipe(g, offer.grade)) continue;
    // Lavkarbon bommer for ofte i lysbueovnen uten øseovn til at en forsiktig spiller tar det
    if (offer.grade === "lavkarbon" && stats.furnace.arc && !g.owned.includes("oseovn")) continue;
    // Smalt karbonvindu (armering) bommer også uten øseovn eller spektrometer
    if (offer.grade === "armering" && stats.furnace.arc && !g.owned.includes("oseovn") && stats.lab < 2) continue;
    // En kvalitet om gangen, som en enkel spiller ville kjørt
    if (activeGrades.size > 0 && !activeGrades.has(offer.grade)) continue;
    const days = offer.deadlineDay - today + 0.5;
    const recent = g.history.slice(-3);
    const produced = recent.length ? recent.reduce((a, d) => a + d.producedT, 0) / recent.length : stats.dailyProductT;
    const capacity = Math.min(stats.dailyProductT, Math.max(produced, stats.dailyProductT * 0.5));
    if (novice) {
      // Nybegynneren stoler på Salg: tar kontrakten når anslaget der er grønt
      const need = committed + agreementLoadUntil(g, offer.deadlineDay) + offer.tonnes;
      if (need / realisticDailyT(g, stats) > (offer.deadlineDay - today + 1) * CONTRACT_MARGIN) continue;
    } else if (committed + offer.tonnes > capacity * days * 0.7) continue;
    acceptContract(g, offer.id);
    committed += offer.tonnes;
    activeGrades.add(offer.grade);
  }
  // Rammeavtaler (B-040): tas når kvaliteten er grei og ukemengden er en liten del av produksjonen
  for (const a of g.agreements.filter((x) => x.status === "tilbud")) {
    if (!stats.products.includes(a.product) || !cheapestRecipe(g, a.grade)) continue;
    if (switching.has(g) && a.product === stats.casting.product) continue;
    if (stats.products.includes("armering") && a.product !== "armering") continue;
    if ((a.grade === "lavkarbon" || a.grade === "armering") && stats.furnace.arc && !g.owned.includes("oseovn"))
      continue;
    if (activeGrades.size > 0 && !activeGrades.has(a.grade)) continue;
    // Nybegynneren tar avtaler som Salg viser grønt (under 40 % av en ukes produksjon)
    if (a.weeklyT > realisticDailyT(g, stats) * 7 * (novice ? 0.4 : 0.35)) continue;
    acceptAgreement(g, a.id);
    activeGrades.add(a.grade);
  }
  const grade: GradeId = activeGrades.size ? [...activeGrades][0] : "standard";
  setTargetGrade(g, grade);
  const recipe = (novice ? safestRecipe(g, grade) : cheapestRecipe(g, grade)) ?? PRESETS[0];
  applyRecipe(g, recipe);

  g.settings.autoBuy = true;
  // Nybegynneren gjør det hintet sier når planleggeren ikke får kjøpt skrap fordi kassa er tom
  if (novice && g.autoBuyNote?.includes("kassekreditten")) g.settings.autoBuyCredit = true;
  // Uten planlegger kjøper testspilleren skrap selv, på samme måte som planleggeren ville gjort
  // Uten planlegger kjøper testspilleren selv, og strekker seg på kassekreditten når det trengs
  if (!hasPlanner(g) || !hasResearch(g, "innkjop")) autoBuy(g, stats, { credit: true, cap: null });
  g.settings.autoSpot = true;

  // Ansettelser: fyll opp manglende plasser, deretter selgere og reparatører
  const cap = STAGES[g.stage].staffCap;
  const missing: Crew = stats.missing;
  const wantShifts = g.stage >= 2 ? 3 : 2;
  if (stats.shifts < wantShifts) {
    for (const [role, n] of Object.entries(missing) as [RoleId, number][]) {
      for (let i = 0; i < n && g.workers.length < cap; i++) {
        const cand = g.candidates.find((c) => c.role === role) ?? g.candidates.find((c) => c.role === "allround");
        if (!cand) break;
        hire(g, cand.id);
      }
    }
  }
  const count = (r: RoleId) => g.workers.filter((w) => w.role === r).length;
  const crewTotal = Object.values(stats.crew).reduce((a, b) => a + (b ?? 0), 0) * 3;
  const crewWorkers = g.workers.filter(
    (w) =>
      w.role !== "salg" &&
      w.role !== "vedlikehold" &&
      w.role !== "planlegger" &&
      w.role !== "klasser" &&
      w.role !== "murer",
  ).length;
  const spare = cap - g.workers.length - Math.max(0, crewTotal - crewWorkers);
  if (
    spare > 0 &&
    g.stage >= 2 &&
    stats.shifts >= 2 &&
    count("salg") < Math.min(3, g.stage - 1) &&
    g.workers.length < cap
  ) {
    const c = g.candidates.find((x) => x.role === "salg");
    if (c) hire(g, c.id);
  }
  // Murere til reservepottene i lysbueovnen (B-030)
  if (spare > 0 && stats.furnace.arc && count("murer") < MASONS_BOT * g.furnaceCount && g.workers.length < cap) {
    const c = g.candidates.find((x) => x.role === "murer");
    if (c) hire(g, c.id);
  }
  // Skrapklasser når verket går flere skift, så chargene følger resepten (B-029)
  if (spare > 0 && g.stage >= 1 && stats.shifts >= 2 && count("klasser") < 1) {
    const c = g.candidates.find((x) => x.role === "klasser");
    if (c) hire(g, c.id);
  }
  if (spare > 0 && g.stage >= 2 && stats.shifts >= 2 && count("planlegger") < 1) {
    const c = g.candidates.find((x) => x.role === "planlegger");
    if (c) hire(g, c.id);
  }
  if (spare > 1 && g.stage >= 2 && stats.shifts >= 2 && count("vedlikehold") < g.stage - 1 && g.workers.length < cap) {
    const c = g.candidates.find((x) => x.role === "vedlikehold");
    if (c) hire(g, c.id);
  }

  // Utbygging: nytt nivå først, så det som gir mest på nåværende nivå
  const reserve = Math.max(5_000, stats.salaryPerDay * 5 + stats.dailyProductT * 6000);
  const perStage: string[][] = [
    [],
    ["induksjon1", "formlinje", "lager", "xrf", "portal", "salgskontor"],
    ["induksjon5", "blokk", "oes", "ovn2", "verksted", "sortering"],
    ["renseanlegg", "lysbue30", "streng1", "oseovn", "conveyor", "trafo", "valseverk", "elektroderegulering"],
    [
      "lysbue90",
      "streng4",
      "ovn3",
      "streng6",
      "streng2",
      "varmegjenvinning",
      "bruddvarsling",
      "panelvarsling",
      "skrapterminal",
      "havn",
      "vakuum",
      "valseverk2",
    ],
  ];
  // Ovnstyper og ovnsutstyr kjøpes per ovn (B-074): ovn 1 først, så de andre
  const perUnit = new Set([...FURNACES.map((f) => f.id), ...ADDONS.filter((a) => a.perFurnace).map((a) => a.id)]);
  const order = [
    ...(g.lastRadioDay !== undefined ? ["portal"] : []),
    ...perStage[g.stage],
    `stage${g.stage + 1}`,
  ].flatMap((id) => (perUnit.has(id) ? g.furnaces.map((_, i) => unitId(id, i)) : [id]));
  const options = upgradeOptions(g);
  noteWait(g, options);
  // Konsernet (B-106): når storverket er ferdig bygget, går overskuddet til datterverk, modernisering og felles funksjoner
  if (
    g.konsern.unlocked &&
    (g.cash > 1_500_000_000 || options.every((o) => o.owned || o.locked || o.kind === "stage"))
  ) {
    konsernBuy(g, Math.max(reserve, 100_000_000));
    return;
  }
  if (novice) {
    // Nybegynneren flytter når det går, ellers kjøper den det billigste den har råd til, uten plan
    // …men sparer til «Neste store steg» på målkortet når det bare er pengene som mangler
    const move = options.find((o) => o.kind === "stage" && o.available);
    const key = keyUpgrade(g, options);
    const keyBuy =
      key?.available && g.cash - key.price > reserve / 2 && !key.warning?.includes("penger til drift")
        ? key
        : undefined;
    const saving = !!key && (key.reason === "For lite penger" || (key.available && !keyBuy));
    const buy =
      move ??
      keyBuy ??
      (saving ? [] : options)
        .filter(
          (o) =>
            o.available &&
            !o.owned &&
            o.kind !== "stage" &&
            g.cash - o.price > reserve / 2 &&
            !o.warning?.includes("penger til drift"),
        )
        .sort((a, b) => a.price - b.price)[0];
    if (buy) buyUpgrade(g, buy.id);
    return;
  }
  for (const id of order) {
    const o = options.find((x) => x.id === id);
    if (!o || o.owned || o.locked) continue;
    // Ny støping med et annet produkt: lever ferdig kontraktene på det gamle først (B-062)
    // …men bare når det er råd til byttet; ellers tas kontrakter som før, så verket ikke lever av spot (B-070)
    const need = o.price * (o.price > 1_000_000 ? 1.3 : 1);
    if (o.reason?.startsWith("Lever først")) {
      if (g.cash - need >= reserve) {
        switching.add(g);
        break;
      }
      switching.delete(g);
      continue;
    }
    if (!o.available && o.reason !== "For lite penger") continue;
    // Store investeringer krever en buffer til skrap og lønn mens produksjonen tar seg opp
    if (g.cash - o.price * (o.price > 1_000_000 ? 1.3 : 1) < reserve) break;
    // Ny støping som gir et annet produkt: lever ferdig kontraktene på det gamle først
    const product = CASTINGS.find((c) => c.id === id)?.product;
    if (product && product !== stats.casting.product) {
      if (g.contracts.some((c) => c.status === "aktiv" && c.product !== product)) {
        switching.add(g);
        break;
      }
      switching.delete(g);
    }
    buyUpgrade(g, id);
    break;
  }
}

/** Testspillerens konsernkjøp: felles salg og innkjøp når det er to verk, ellers nytt verk før modernisering */
function konsernBuy(g: GameState, reserve: number): void {
  const k = g.konsern;
  const free = g.cash - reserve;
  if (k.plants.length >= 1) {
    for (const id of ["salg", "innkjop"] as SharedId[]) {
      if (!k.shared.includes(id) && free >= KONSERN_SHARED[id].price) {
        buyShared(g, id);
        return;
      }
    }
  }
  if (k.plants.length < MAX_SISTERS) {
    const type: SisterType = k.plants.some((p) => p.type === "stalverk") ? "storverk" : "stalverk";
    if (free >= SISTER_TYPES[type].price) buySister(g, type);
    return;
  }
  const p = k.plants.filter((x) => x.level < MODERNIZE_MAX).sort((a, b) => modernizeCost(a) - modernizeCost(b))[0];
  if (p && free >= modernizeCost(p)) modernizeSister(g, p.id);
}

interface RunSummary {
  seed: number;
  stageDays: (number | null)[];
  bankrupt: boolean;
  final: GameState;
}

function run(seed: number, days: number, verbose: boolean, novice = process.argv.includes("--nybegynner")): RunSummary {
  const g = newGame(seed);
  if (novice) novices.add(g);
  const stageDays: (number | null)[] = [1, null, null, null, null];
  let lastDay = 0;
  let hour = 0;
  while (day(g) <= days && !g.gameOver) {
    if (!novice || hour++ % 3 === 0 || g.pendingDecision) botHour(g);
    const repBefore = g.reputation;
    const logBefore = g.log.at(-1)?.id ?? 0;
    advance(g, 60);
    if (process.argv.includes("--repdrop") && g.reputation < repBefore - 0.5)
      console.log(
        "REP",
        day(g),
        repBefore.toFixed(1),
        "->",
        g.reputation.toFixed(1),
        g.log
          .filter((e) => e.id > logBefore)
          .map((e) => e.text.slice(0, 90))
          .join(" || "),
      );
    if (g.stage > 0 && stageDays[g.stage] === null) stageDays[g.stage] = day(g);
    if (verbose && day(g) !== lastDay && (day(g) % 5 === 0 || day(g) < 10 || process.argv.includes("--finance"))) {
      lastDay = day(g);
      const s = computePlantStats(g);
      const y = g.history[g.history.length - 1];
      const inc = y ? Object.values(y.income).reduce((a, b) => a + (b ?? 0), 0) : 0;
      const cost = y
        ? Object.entries(y.costs)
            .filter(([k]) => k !== "investering")
            .reduce((a, [, b]) => a + (b ?? 0), 0)
        : 0;
      console.log(
        `dag ${String(day(g)).padStart(3)} ${STAGES[g.stage].name.padEnd(9)} kasse ${Math.round(g.cash).toLocaleString("nb-NO").padStart(12)}  omdømme ${g.reputation.toFixed(1).padStart(5)}  ` +
          `ansatte ${String(g.workers.length).padStart(3)} skift ${s.shifts}  ${s.furnace.id}/${s.casting.id}  kap ${s.dailyProductT.toFixed(1)} t/d  ` +
          `i går: prod ${(y?.producedT ?? 0).toFixed(1)} t, inn ${Math.round(inc).toLocaleString("nb-NO")}, drift ${Math.round(cost).toLocaleString("nb-NO")}  ` +
          (process.argv.includes("--finance") && y
            ? ` [${Object.entries(y.costs)
                .map(([k, v]) => `${k} ${Math.round((v ?? 0) / 1000)}k`)
                .join(", ")} | ${Object.entries(y.income)
                .map(([k, v]) => `${k} ${Math.round((v ?? 0) / 1000)}k`)
                .join(", ")}] `
            : "") +
          (y
            ? `kval ${Math.round(y.onGradeT ?? 0)}/${Math.round(y.offGradeT ?? 0)}/${Math.round(y.secondT ?? 0)} t  `
            : "") +
          `mål ${g.targetGrade}  vent: ${g.furnaces.map((f) => f.waitReason ?? "-").join("/")}${g.castWait ? " støp:" + g.castWait : ""}`,
      );
    }
  }
  return { seed, stageDays, bankrupt: g.gameOver, final: g };
}

const verbose = process.argv.includes("--verbose");
if (process.argv.includes("--dump")) {
  // Lager et lagret spill på et gitt nivå, til testing av grensesnittet
  const stage = Number(process.argv[process.argv.indexOf("--dump") + 1]);
  const g = newGame(7);
  while (g.stage < stage && day(g) < 400 && !g.gameOver) {
    botHour(g);
    advance(g, 60);
  }
  for (let i = 0; i < 24 * 4; i++) {
    botHour(g);
    advance(g, 60);
  }
  console.log(JSON.stringify(g));
  process.exit?.(0);
}
if (process.argv.includes("--research")) {
  // Når testspilleren forsker, og hvor mange fagpoeng den har liggende
  const g = newGame(Number(process.argv[process.argv.indexOf("--research") + 1]));
  let done = 0;
  while (day(g) <= 150) {
    botHour(g);
    advance(g, 60);
    if (g.researched.length > done) {
      done = g.researched.length;
      console.log(
        `dag ${day(g)} (${STAGES[g.stage].name}): ${g.researched[done - 1]} – ${Math.round(g.researchPoints)} FP igjen`,
      );
    }
  }
  console.log(`dag 150: ${Math.round(g.researchPoints)} FP ubrukt`);
  process.exit?.(0);
}
if (process.argv.includes("--kontrakter")) {
  // Hvor lang tid kontraktene tar fra signering til levering, per nivå (1 døgn = 1 minutt på 1×)
  const g = newGame(Number(process.argv[process.argv.indexOf("--kontrakter") + 1]));
  const started = new Map<number, number>();
  const spans: number[][] = [[], [], [], [], []];
  while (day(g) <= 150) {
    botHour(g);
    advance(g, 60);
    for (const c of g.contracts) {
      if (c.status === "aktiv" && !started.has(c.id)) started.set(c.id, g.minute);
      if (c.status === "fullfort" && started.has(c.id) && started.get(c.id)! >= 0) {
        spans[g.stage].push((g.minute - started.get(c.id)!) / 1440);
        started.set(c.id, -1);
      }
    }
  }
  spans.forEach((xs, i) => {
    if (!xs.length) return;
    const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
    console.log(
      `${STAGES[i].name.padEnd(9)} ${String(xs.length).padStart(3)} kontrakter, snitt ${avg.toFixed(1)} døgn (= ${avg.toFixed(1)} min på 1×)`,
    );
  });
  process.exit?.(0);
}
if (process.argv.includes("--sperrer")) {
  // Hva som holder igjen neste nivå: dagen penger holder, dagen omdømmet holder, og ubrukte fagpoeng
  for (const seed of [1, 2, 3, 4]) {
    const g = newGame(seed);
    const cashDay: (number | null)[] = [null, null, null, null, null];
    const repDay: (number | null)[] = [null, null, null, null, null];
    const fpAt: (number | null)[] = [null, null, null, null, null];
    while (day(g) <= 200 && g.stage < 4) {
      botHour(g);
      advance(g, 60);
      const next = STAGES[g.stage + 1];
      if (!next) break;
      if (cashDay[next.id] === null && g.cash >= next.price) cashDay[next.id] = day(g);
      if (repDay[next.id] === null && g.reputation >= next.reputation) repDay[next.id] = day(g);
      fpAt[g.stage] = Math.round(g.researchPoints);
    }
    console.log(
      `frø ${seed}: ` +
        [1, 2, 3, 4]
          .map((i) => `${STAGES[i].name}: penger dag ${cashDay[i] ?? "-"}, omdømme dag ${repDay[i] ?? "-"}`)
          .join(" | ") +
        ` | ubrukte FP ved slutten av hvert nivå: ${fpAt.join("/")}`,
    );
  }
  process.exit?.(0);
}
if (process.argv.includes("--replog")) {
  // Skriver ut alt som har påvirket omdømmet, for feilsøking av balansen
  const g = newGame(Number(process.argv[process.argv.indexOf("--replog") + 1]));
  const novice = process.argv.includes("--nybegynner");
  if (novice) novices.add(g);
  let seen = 0;
  let hour = 0;
  while (day(g) <= 200) {
    if (!novice || hour++ % 3 === 0 || g.pendingDecision) botHour(g);
    advance(g, 60);
    for (const e of g.log) {
      if (e.id <= seen) continue;
      if (/mdømme/.test(e.text) && e.kind === "bad") console.log(`dag ${Math.floor(e.min / 1440) + 1}: ${e.text}`);
    }
    seen = g.log.length ? g.log[g.log.length - 1].id : seen;
  }
  process.exit?.(0);
}
if (process.argv.includes("--vansker")) {
  // Hvor lett eller vanskelig hvert nivå er, for en flink spiller og en nybegynner (B-062)
  const pct = (n: number, of: number) => `${String(Math.round((100 * n) / Math.max(1, of))).padStart(3)} %`;
  const med = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN);
  const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("nb-NO") : "-");
  for (const profile of ["flink", "nybegynner"] as const) {
    type Row = {
      days: number;
      wait: Record<string, number>;
      research: number;
      fp: number;
      minCash: number;
      redDays: number;
      profit: number[];
      done: number;
      late: number;
      repGain: number;
    };
    const rows: Row[][] = [[], [], [], [], []];
    const wins: number[] = [];
    let bankrupt = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const g = newGame(seed);
      if (profile === "nybegynner") novices.add(g);
      waits.set(g, []);
      const cur: Row[] = [0, 1, 2, 3, 4].map(() => ({
        days: 0,
        wait: {},
        research: 0,
        fp: 0,
        minCash: Infinity,
        redDays: 0,
        profit: [],
        done: 0,
        late: 0,
        repGain: 0,
      }));
      let lastDay = 0;
      let hour = 0;
      while (day(g) <= 700 && !g.gameOver && !g.won) {
        if (profile === "flink" || hour % 3 === 0 || g.pendingDecision) botHour(g);
        const before = { done: g.totals.contractsDone, rep: g.reputation, stage: g.stage };
        const lateBefore = g.contracts.filter((c) => c.status === "misligholdt").length;
        advance(g, 60);
        hour++;
        const r = cur[g.stage];
        if (g.stage === before.stage) {
          r.done += g.totals.contractsDone - before.done;
          r.late += Math.max(0, g.contracts.filter((c) => c.status === "misligholdt").length - lateBefore);
          if (g.reputation > before.rep) r.repGain += g.reputation - before.rep;
        }
        r.minCash = Math.min(r.minCash, g.cash);
        if (day(g) !== lastDay) {
          lastDay = day(g);
          r.days++;
          if (g.cash < 0) r.redDays++;
          const y = g.history.at(-1);
          if (y) {
            const inc = Object.values(y.income).reduce((a, b) => a + (b ?? 0), 0);
            const cost = Object.entries(y.costs)
              .filter(([k]) => k !== "investering")
              .reduce((a, [, b]) => a + (b ?? 0), 0);
            r.profit.push(inc - cost);
          }
        }
      }
      const list = waits.get(g) ?? [];
      list.forEach((w, i) => {
        const r = cur[w.stage];
        r.wait[w.on] = (r.wait[w.on] ?? 0) + 1;
        if (w.research) r.research++;
        if (i > 0) r.fp += w.fp - list[i - 1].fp;
      });
      cur.forEach((r, i) => r.days && rows[i].push(r));
      if (g.won) wins.push(day(g));
      if (g.gameOver) bankrupt++;
    }
    console.log(
      `\n${profile.toUpperCase()}: ${bankrupt} av 6 konkurs, vant (10 mrd.) på dag ${wins.join(", ") || "-"}`,
    );
    console.log(
      "nivå       døgn | flytting sperres av: omdømme penger  klar | ny ovn/støping venter på forskning | FP/døgn | minste kasse  døgn i minus  resultat/døgn | levert/10 d  for sent/10 d  omdømme +/10 d",
    );
    rows.forEach((rs, i) => {
      if (!rs.length) return;
      const d = med(rs.map((r) => r.days));
      const share = (f: (r: Row) => number) => pct(med(rs.map((r) => f(r) / Math.max(1, r.days))) * 100, 100);
      console.log(
        `${STAGES[i].name.padEnd(9)} ${String(d).padStart(5)} |                    ${share((r) => r.wait["omdømme"] ?? 0)}  ${share((r) => r.wait.penger ?? 0)} ${share((r) => r.wait.klar ?? 0)} |                              ${share((r) => r.research)} | ${med(
          rs.map((r) => r.fp / r.days),
        )
          .toFixed(1)
          .padStart(7)} | ` +
          `${fmt(med(rs.map((r) => r.minCash))).padStart(12)}  ${String(med(rs.map((r) => r.redDays))).padStart(12)}  ${fmt(med(rs.map((r) => med(r.profit)))).padStart(13)} | ${med(
            rs.map((r) => (10 * r.done) / r.days),
          )
            .toFixed(1)
            .padStart(11)}  ${med(rs.map((r) => (10 * r.late) / r.days))
            .toFixed(1)
            .padStart(12)}  ${med(rs.map((r) => (10 * r.repGain) / r.days))
            .toFixed(1)
            .padStart(14)}`,
      );
    });
  }
  process.exit?.(0);
}
const seeds = process.argv.includes("--seed")
  ? [Number(process.argv[process.argv.indexOf("--seed") + 1])]
  : [1, 2, 3, 4, 5, 6];
const DAYS = 240;
const NOVICE_DAYS = 260;
const NOVICE_MAX_DAY = 240;
const targets = [
  { stage: 1, min: 7, max: 20 },
  { stage: 2, min: 20, max: 50 },
  { stage: 3, min: 55, max: 120 },
  { stage: 4, min: 120, max: 220 },
];

let failed = false;
const results: RunSummary[] = [];
for (const seed of seeds) {
  const r = run(seed, DAYS, verbose && seed === seeds[0]);
  results.push(r);
  const t = r.final.totals;
  console.log(
    `seed ${seed}: nivådager ${r.stageDays.map((d) => d ?? "-").join(" / ")}  ` +
      `kasse ${Math.round(r.final.cash).toLocaleString("nb-NO")}  omdømme ${r.final.reputation.toFixed(0)}  ` +
      `charger ${t.heats}  produsert ${Math.round(t.producedT)} t  kontrakter ${t.contractsDone}  reklamasjoner ${t.complaints}` +
      (r.bankrupt ? "  KONKURS" : ""),
  );
}

for (const target of targets) {
  const daysReached = results.map((r) => r.stageDays[target.stage]);
  const reached = daysReached.filter((d): d is number => d !== null).sort((a, b) => a - b);
  const median = reached.length === results.length ? reached[Math.floor(reached.length / 2)] : null;
  const ok = median !== null && median >= target.min && median <= target.max;
  if (!ok) failed = true;
  console.log(
    `${STAGES[target.stage].name.padEnd(9)} median dag ${median ?? "ikke nådd"} (mål ${target.min}–${target.max}) ${ok ? "OK" : "AVVIK"}`,
  );
}
if (results.some((r) => r.bankrupt)) {
  failed = true;
  console.log("AVVIK: testspilleren gikk konkurs");
}
// Nybegynneren (B-062) følger rådene i spillet. Den skal ikke gå konkurs, og skal nå storverket innen rimelig tid
if (!process.argv.includes("--seed") && !process.argv.includes("--nybegynner")) {
  const novice = [1, 2, 3, 4].map((seed) => run(seed, NOVICE_DAYS, false, true));
  const days = novice.map((r) => r.stageDays[4] ?? Infinity).sort((a, b) => a - b);
  const median = (days[1] + days[2]) / 2;
  const broke = novice.filter((r) => r.bankrupt).length;
  const ok = broke === 0 && median <= NOVICE_MAX_DAY;
  if (!ok) failed = true;
  console.log(
    `Nybegynner: storverket dag ${novice.map((r) => r.stageDays[4] ?? "-").join(" / ")} (median ${Number.isFinite(median) ? median : "ikke nådd"}, mål høyst ${NOVICE_MAX_DAY}), ${broke} konkurs ${ok ? "OK" : "AVVIK"}`,
  );
}
// Kontrollrommet: den enkle styringen skal kunne kjøres av en nybegynner som bare
// følger rådene på skjermen, og en slurvete kjøring skal gi dårlig karakter
type SimplePolicy = "nybegynner" | "slurvete";
function playSimple(policy: SimplePolicy, seed: number, req?: ManualRequest) {
  const sim = req ? createSim(req, 0) : new EAFSimulation(seed);
  if (!req) sim.startCharge("AR20");
  let r = seed;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const run = new SimpleRunner(sim, sim.state.refractoryWear, rnd);
  run.start();
  let real = 0;
  let lastAct = 0;
  while (run.step !== "ferdig" && real < 900) {
    run.tick(0.1);
    real += 0.1;
    // En person reagerer omtrent hvert andre sekund, men følger godt med når hen står klar med en knapp
    // (avslagging og tapping, B-076)
    const focused = run.step === "slagg" || run.step === "tapp" || run.step === "tapper";
    if (real - lastAct < (focused ? 0.5 : 2)) continue;
    lastAct = real;
    const t = sim.state.bathTempC;
    const g = sim.state.grade!;
    const target = sim.tapTargetTempC;
    if (run.step === "smelt" && policy === "nybegynner") {
      if (t < MELT_BAND[0] + 5) run.changeLevel(1);
      else if (t > MELT_BAND[1] - 5) run.changeLevel(-1);
      // Oksygen når halve skrapet er smeltet, som rådet på skjermen sier
      run.setOxygen(run.melted > 0.5);
    }
    if (run.step === "rens") {
      if (policy === "nybegynner" && sim.state.carbonPct > g.tapCarbonMaxPct - 0.015) {
        run.setOxygen(true);
        // Strømmen holder badet varmt, men ikke over tappetemperaturen
        if (t > target - 25) run.changeLevel(-1);
        else if (t < MELT_BAND[0]) run.changeLevel(1);
      } else if (policy === "nybegynner" && sim.state.carbonPct < g.tapCarbonMinPct + 0.005) {
        // Blåst for lenge: karbon inn igjen, som rådet på skjermen sier (B-079)
        run.setCarbon(true);
      } else {
        run.setOxygen(false);
        run.setCarbon(false);
        run.finishRefining();
      }
    }
    if (run.step === "slagg") {
      if (policy === "slurvete") run.skipDeslag();
      else if (run.deslag === "nei") run.startDeslag();
      else if (sim.slagMassKg < SLAG_DONE_KG) run.stopDeslag();
    }
    if (run.step === "tapp") {
      if (policy === "slurvete") {
        if (t > target + 35) run.tap();
      } else {
        if (t < target - 30) run.changeLevel(1);
        else if (t > target - 15 && run.level > 2) run.changeLevel(-1);
        if (t >= target - 6) run.tap();
      }
    }
    if (run.step === "tapper" && policy === "nybegynner" && run.ladleFill >= 0.95) run.stopTap();
  }
  return { score: run.score!, real };
}

for (const seed of [1, 2, 3]) {
  const novice = playSimple("nybegynner", seed);
  const sloppy = playSimple("slurvete", seed);
  const ok = novice.score.rating >= 4 && sloppy.score.rating <= 2 && novice.real < 180;
  console.log(
    `Enkel styring, frø ${seed}: nybegynner ${novice.score.rating}★ på ${Math.round(novice.real)} s ` +
      `(${Math.round(novice.score.result.kwhPerT)} kWh/t), slurvete ${sloppy.score.rating}★ ` +
      `(${Math.round(sloppy.score.result.kwhPerT)} kWh/t) ${ok ? "OK" : "AVVIK"}`,
  );
  if (!ok) failed = true;
}

// Ta styringen i spillet: chargen skal komme tilbake som en vanlig charge
{
  const g = newGame(3);
  while (!computePlantStats(g).furnace.arc && day(g) < 300) {
    botHour(g);
    advance(g, 60);
  }
  g.settings.manualNext = true;
  g.speed = 3;
  for (let i = 0; i < 48 && !g.pendingManual; i++) {
    botHour(g);
    advance(g, 60);
  }
  const req = g.pendingManual;
  if (!req) {
    failed = true;
    console.log("AVVIK: ta styringen ga ingen charge å kjøre");
  } else {
    const { score } = playSimple("nybegynner", 7, req);
    const heatsBefore = g.totals.manualHeats;
    const fpBefore = g.researchPoints;
    completeManual(g, score.result);
    advance(g, score.result.minutes + 30);
    const ok =
      g.totals.manualHeats === heatsBefore + 1 &&
      // Farten skal være den samme som da kontrollrommet åpnet (et hendelseskort i ventetida kan ha satt 1×)
      g.speed === req.resumeSpeed &&
      g.researchPoints > fpBefore &&
      score.rating >= 4;
    console.log(
      `Ta styringen i spillet: ${score.rating}★, P ${score.result.phosphorusPct}, ` +
        `manuelle charger ${g.totals.manualHeats}, fagpoeng +${Math.round(g.researchPoints - fpBefore)}, fart etterpå ${g.speed} ${ok ? "OK" : "AVVIK"}`,
    );
    if (!ok) failed = true;
  }
}

if (failed) process.exitCode = 1;
