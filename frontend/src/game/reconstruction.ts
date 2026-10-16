/**
 * Rekonstruksjon etter konkurs (B-495, modell B i docs/REKONSTRUKSJON-FORSLAG.md): banken selger det største, og verket
 * starter på nivået under i stedet for i garasjen.
 *
 * - Nivået går ett ned. Utstyr som hører til det tapte nivået, er solgt. Ovner og støping fra nivået under beholdes; er
 *   de fra det tapte nivået, står grunnversjonen for nivået der (den billigste).
 * - Forskning og mesterskap fra de siste 30 spilldøgnene tas tilbake, og fagpoeng kjøpt for penger i perioden trekkes
 *   fra. Utstyr fra perioden som beholdes, legges på gjelden med prisen – så «lån maks, kjøp det som beholdes, gå
 *   konkurs» ikke lønner seg.
 * - Lånet og minuset slettes mot en rekonstruksjonsgjeld på halvparten. Banken låner også ut startkassa (sju døgns
 *   lønn, faste kostnader og skrap for verket slik det blir), og den legges på gjelden. Gjelden betales med en andel av
 *   salget hvert døgn.
 * - Omdømmet halveres (høyst halvparten av det nivået under krever), lager og ordrer er borte, og folk som ikke får plass, slutter.
 * - Høyst én gang per 30 ekte dager (serverens klokke), og ikke før gjelden fra forrige gang er betalt. Ellers: nytt spill.
 *
 * Alt dette er spilltid i hovedverket (B-323). Konsernet, konsernkassa og alt på serveren er urørt.
 */
import { ADDONS, CASTINGS, FURNACES, START_CASH, STAGES, STAGE_DEFINITE } from "./data";
import { realNow } from "./clock";
import { addCost, fmtKr, log, newFurnaceUnit } from "./engine";
import { computePlantStats, day, isApprentice, unitType } from "./plant";
import type { GameState, MasteryId, RecentBuy, Worker } from "./types";

export const RECON = {
  /** Hvor mange spilldøgn bakover kjøp og forskning tas tilbake */
  rollbackDays: 30,
  /** Andel av lån og minus som blir rekonstruksjonsgjeld */
  debtShare: 0.5,
  /** Andel av salget (kontrakter og spot) som går til gjelden hvert døgn */
  revenueShare: 0.1,
  /** Omdømmet etter: halvparten, men høyst denne andelen av det nivået under krever */
  repShareOfStage: 0.5,
  /** Ekte dager mellom to rekonstruksjoner */
  realDays: 30,
  /** Kassa etter rekonstruksjonen: så mange døgn med lønn, faste kostnader og skrap for verket slik det blir */
  startDays: 7,
  /** Skrap per tonn stål i startkassa (et vanlig snitt av skrapprisene) */
  scrapPerT: 3_000,
};

const REAL_DAY_MS = 86_400_000;

/** Husker et kjøp (eller forskning) i 30 spilldøgn, så rekonstruksjonen kan ta det tilbake */
export function noteBuy(g: GameState, buy: Omit<RecentBuy, "day">): void {
  const today = day(g);
  const list = (g.recentBuys ?? []).filter((b) => b.day > today - RECON.rollbackDays);
  list.push({ ...buy, day: today });
  g.recentBuys = list;
}

export type ReconOption =
  | { ok: true; to: number; debt: number; cash: number; owed: number }
  | { ok: false; reason: string };

/** Kan verket rekonstrueres nå, og hva blir det? */
export function reconOption(g: GameState, now = realNow()): ReconOption {
  if (!g.gameOver) return { ok: false, reason: "Verket er ikke konkurs." };
  // Fra verkstedet er garasjen det eneste under – da er et nytt spill det samme, uten gjeld
  if (g.stage <= 1)
    return { ok: false, reason: "Under verkstedet er det bare garasjen, så banken starter deg på nytt der." };
  if ((g.recon?.debt ?? 0) > 0)
    return { ok: false, reason: "Gjelden fra forrige rekonstruksjon er ikke betalt, så banken vil ikke prøve igjen." };
  const last = g.recon?.times.at(-1);
  if (last && now - last.realAt < RECON.realDays * REAL_DAY_MS) {
    const left = Math.ceil((last.realAt + RECON.realDays * REAL_DAY_MS - now) / REAL_DAY_MS);
    return {
      ok: false,
      reason: `Banken rekonstruerer høyst én gang per ${RECON.realDays} dager. Neste gang om ${left} ${left === 1 ? "dag" : "dager"}.`,
    };
  }
  // Regnes på en kopi: verket slik det blir etter salget
  const copy = structuredClone(g);
  const { owed } = rollback(copy, g.stage - 1);
  rebuild(copy, g.stage - 1);
  const cash = startCash(copy);
  return { ok: true, to: copy.stage, debt: reconDebt(g) + cash + owed, cash, owed };
}

/** Halvparten av lånet og minuset i kassa (startkassa kommer i tillegg) */
export function reconDebt(g: GameState): number {
  return Math.round(RECON.debtShare * (Math.max(0, g.loan) + Math.max(0, -g.cash)));
}

/** Startkassa for et verk som er bygget ned: sju døgns lønn, faste kostnader og skrap */
export function startCash(g: GameState): number {
  const stats = computePlantStats(g);
  const perDay = stats.salaryPerDay + STAGES[g.stage].fixedPerDay + stats.dailyProductT * RECON.scrapPerT;
  return Math.max(START_CASH, Math.round((RECON.startDays * perDay) / 1000) * 1000);
}

/** Den billigste ovnen eller støpingen på et nivå (grunnversjonen) */
function cheapest<T extends { stage: number; price: number; gate?: unknown }>(list: T[], stage: number): T {
  const at = list.filter((x) => x.stage <= stage && !x.gate);
  const same = at.filter((x) => x.stage === stage);
  return (same.length ? same : at).reduce((a, b) => (b.price < a.price ? b : a));
}

/**
 * De siste 30 døgnene: forskning, mesterskap og fagpoeng kjøpt for penger tas tilbake. Utstyr som beholdes (nivået
 * under), legges på gjelden med prisen – å ta det bort ville gitt et verk som ikke kan drives. Gir det som legges på.
 */
function rollback(g: GameState, to: number): { taken: number; owed: number } {
  const today = day(g);
  const recent = (g.recentBuys ?? []).filter((b) => b.day > today - RECON.rollbackDays).reverse();
  let taken = 0;
  let owed = 0;
  for (const b of recent) {
    if (b.kind === "research") {
      g.researched = g.researched.filter((r) => r !== b.id);
      taken++;
    } else if (b.kind === "mastery") {
      const id = b.id as MasteryId;
      g.mastery[id] = Math.max(0, (g.mastery[id] ?? 0) - 1);
      taken++;
    } else if (b.kind === "fp") {
      g.researchPoints = Math.max(0, g.researchPoints - (b.fp ?? 0));
      taken++;
    } else if ((b.stage ?? 0) <= to) owed += b.price ?? 0;
  }
  g.recentBuys = [];
  return { taken, owed };
}

/** Banken selger det største: nivået ett ned, utstyret fra det tapte nivået, lager, ordrer og folk som ikke får plass */
function rebuild(g: GameState, to: number): void {
  const from = g.stage;
  const today = day(g);
  g.stage = to;
  g.owned = g.owned.filter((id) => (ADDONS.find((a) => a.id === id)?.stage ?? 0) <= to);
  const units = 1 + +g.owned.includes("ovn2") + +g.owned.includes("ovn3");
  const base = cheapest(FURNACES, to);
  g.furnaces = g.furnaces.slice(0, units).map((old, i) => {
    const type = unitType(g, i).stage <= to ? unitType(g, i) : base;
    const unit = newFurnaceUnit(today);
    unit.type = type.id;
    unit.addons = (old.addons ?? []).filter((id) => {
      const a = ADDONS.find((x) => x.id === id);
      return !!a && a.stage <= to && (!a.needsArc || type.arc);
    });
    return unit;
  });
  g.furnaceCount = g.furnaces.length;
  g.furnaceType = g.furnaces
    .map((f) => FURNACES.find((x) => x.id === f.type) ?? base)
    .reduce((a, b) => (b.stage > a.stage || (b.stage === a.stage && b.sizeT > a.sizeT) ? b : a)).id;
  const cast = CASTINGS.find((c) => c.id === g.castingType);
  if (!cast || cast.stage > to) g.castingType = cheapest(CASTINGS, to).id;
  g.castQueue = [];
  g.castProgressT = 0;
  g.castDownUntilMin = 0;
  g.castWait = null;
  g.lastCast = null;
  g.rollProgressT = 0;
  g.mould = undefined;
  g.pendingCastingSwitch = null;
  g.bigBuild = null;
  g.castingRampFromDay = undefined;

  // Lager og ordrer: banken har solgt lageret, kundene har gått
  for (const s of Object.values(g.scrap)) Object.assign(s, { t: 0, p: 0, tramp: 0, c: 0, dirt: 0, radioactive: false });
  g.lots = [];
  g.contracts = g.contracts.filter((c) => c.status !== "aktiv" && c.status !== "tilbud");
  g.agreements = g.agreements.filter((a) => a.status !== "aktiv" && a.status !== "tilbud");

  // Storverket er solgt: nabolaget, stiftelsen og slitasjen følger tomta
  if (from === STAGES.length - 1) {
    g.neighborhood = { built: [], building: null };
    g.foundation = undefined;
    g.upkeep = undefined;
  }

  // Folk som ikke får plass, slutter: hver rolle beholder sin andel, de flinkeste blir, lærlingene sist
  const cap = STAGES[to].staffCap;
  if (g.workers.length > cap) {
    const share = cap / g.workers.length;
    const rank = (a: Worker, b: Worker) => +isApprentice(a) - +isApprentice(b) || b.skill - a.skill;
    const byRole = new Map<string, Worker[]>();
    for (const w of g.workers) byRole.set(w.role, [...(byRole.get(w.role) ?? []), w]);
    const keep = new Set<Worker>();
    for (const list of byRole.values())
      for (const w of [...list].sort(rank).slice(0, Math.floor(list.length * share))) keep.add(w);
    for (const w of [...g.workers].sort(rank)) if (keep.size < cap) keep.add(w);
    g.workers = g.workers.filter((w) => keep.has(w));
  }
  g.candidates = [];
  g.tempCrew = null;
  g.courseSeats = null;
}

/** Rekonstruerer verket (B-495). Gjør ingenting og gir false hvis det ikke er lov nå */
export function reconstruct(g: GameState, now = realNow()): boolean {
  const opt = reconOption(g, now);
  if (!opt.ok) return false;
  const from = g.stage;
  const to = opt.to;
  const { taken } = rollback(g, to);
  rebuild(g, to);

  // Penger: lån og minus mot gjeld, startkassa lånt av banken, halvt omdømme
  g.loan = 0;
  g.cash = opt.cash;
  g.today.cashEnd = g.cash;
  // Kundene stoler ikke på et verk som nettopp gikk konkurs: halvparten, og høyst halvparten av det nivået under krever
  g.reputation = Math.round(Math.min(g.reputation / 2, STAGES[to].reputation * RECON.repShareOfStage));
  g.negativeDays = 0;
  g.stuckDays = 0;
  g.inCredit = false;
  g.gameOver = false;
  g.gameOverReason = undefined;
  g.pendingDecision = null;
  g.pendingManual = null;
  g.gridCut = null;
  g.speed = 0;
  g.recon = {
    debt: opt.debt,
    paid: 0,
    times: [...(g.recon?.times ?? []), { day: day(g), realAt: now, from, to }].slice(-10),
  };

  log(
    g,
    `Banken har rekonstruert verket: du driver videre i ${STAGE_DEFINITE[to]} med ${fmtKr(opt.cash)} i kassa. Utstyret fra ${STAGE_DEFINITE[from]} er solgt, omdømmet er halvert, og ${fmtKr(opt.debt)} i gjeld betales med ${Math.round(RECON.revenueShare * 100)} % av salget.`,
    "bad",
  );
  if (taken)
    log(
      g,
      `Kjøp og forskning fra de siste ${RECON.rollbackDays} døgnene før konkursen er tatt tilbake av banken.`,
      "bad",
    );
  return true;
}

/** Ved døgnskiftet: 10 % av gårsdagens salg går til rekonstruksjonsgjelden (som renter og avdrag) */
export function reconDay(g: GameState): void {
  const r = g.recon;
  if (!r || r.debt <= 0) return;
  const last = g.history.at(-1);
  const sales = (last?.income.kontrakt ?? 0) + (last?.income.spot ?? 0);
  const pay = Math.min(r.debt, Math.round(sales * RECON.revenueShare));
  if (pay <= 0) return;
  addCost(g, "renter", pay);
  r.debt -= pay;
  r.paid += pay;
  if (r.debt <= 0) log(g, `Rekonstruksjonsgjelden er betalt: ${fmtKr(r.paid)} i alt. Banken er fornøyd.`, "good");
}
