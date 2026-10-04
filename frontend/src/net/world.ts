/**
 * Verden mellom spillerne (B-189): strategiske selskaper, anbud og konsernkassa. Alt avgjøres på serveren i ekte tid
 * (`world_status`, `place_bid` i supabase/030_skraplageret.sql); appen viser bare det serveren sier.
 */
import { fmtKr, log } from "../game/engine";
import type { GameState } from "../game/types";
import { rpc } from "./supabase";
import { nextWorldMidnight, realNow, worldDay } from "../game/clock";
import type { TreasuryStatus } from "./treasury";
import type { KonsernWorld } from "../game/konsernWorld";
import { parseKonsern } from "./konsern";
import { isRegion } from "../game/regions";
import type { RegionId } from "../game/types";
import { bidBack, type Buyout, type TakeoverRules } from "../game/control";

export interface Tender {
  id: number;
  opensAt: string;
  closesAt: string;
  minBid: number;
  maxBid: number;
  /** Eget bud, eller null. Andres bud er skjult til anbudet stenger. */
  myBid: number | null;
  /** Kallenavnene til alle som har bydd, sortert alfabetisk – uten beløp (B-210) */
  bidders: string[];
}

export interface TenderResult {
  id: number;
  closedAt: string;
  status: "avgjort" | "ingen bud";
  winner: string | null;
  won: boolean;
  winningBid: number | null;
  bidders: number;
  /** Likt høyeste bud – avgjort ved trekning */
  tie: boolean;
  myBid: number | null;
}

/** Selskapstypene serveren kjenner (B-189, B-253, B-256). Et selskap som er slått av, sendes ikke. */
export type CompanyType = "skraplager" | "slagg" | "verksted";

/** Navnet serveren bruker når det mangler */
const COMPANY_NAME: Record<CompanyType, string> = {
  skraplager: "Skraplageret",
  slagg: "Slagghåndteringen",
  verksted: "Mekanisk verksted",
};

/** Navnet på selskapstypen, brukt når serveren ikke sender et navn */
export function companyName(type: CompanyType): string {
  return COMPANY_NAME[type];
}

/** Typen fra serveren; ukjente typer vises som skraplageret (eldste regel) */
export function companyType(v: unknown): CompanyType {
  return v === "slagg" || v === "verksted" ? v : "skraplager";
}

/** Hva eieren tjener på, med vanlige ord – brukt i beskjeden om åpent anbud */
export const EARNS_FROM: Record<CompanyType, string> = {
  skraplager: "skrapet de andre spillerne bruker",
  slagg: "slaggen de andre spillerne lager",
  verksted: "vedlikeholdet og reparasjonene hos de andre spillerne",
};

export interface Company {
  id: number;
  type: CompanyType;
  name: string;
  owner: string | null;
  mine: boolean;
  concessionUntil: string | null;
  /** Vinneren av neste anbud, som tar over når konsesjonen går ut */
  nextOwner: string | null;
  nextMine: boolean;
  incomeYesterday: number | null;
  incomeMine: number;
  estimatePerDay: number;
  /** Anslaget med spillerens egen produksjon (B-443) – inntekten avhenger av eieren. null for eieren selv */
  estimateMine: number | null;
  tender: Tender | null;
  lastResult: TenderResult | null;
  /** Regionen på verdenskartet (B-333) */
  region: RegionId | null;
  /** Eierens Kontroll (B-334): summen 0–100, delene, selskapets verdi og investert i alt. Null uten eier */
  control: CompanyControl | null;
  /** Pågående forsøk på å overta selskapet (B-335), offentlig; forsvaret i kroner bare for eieren */
  takeover: Takeover | null;
  /** Om spilleren kan by på selskapet nå, og hva som skal til (null: ikke aktuelt – eier, uten eier, slått av) */
  takeoverWindow: TakeoverWindow | null;
  /** Forrige avgjorte forsøk */
  takeoverLast: TakeoverLast | null;
}

export interface Takeover {
  id: number;
  attacker: string;
  mineAttack: boolean;
  bid: number;
  /** Forsvarskapitalen – bare for eieren */
  defense: number | null;
  closesAt: string;
  attack: number;
  defenseScore: number;
  /** Regelsettet budet avgjøres etter (B-441): 1 for bud fra før 3.10.2026, 2 for nye */
  rules: TakeoverRules;
  /** Om spilleren kan by over i runden (B-442); null for eieren, den som byr og regelsett 1 */
  compete: { open: boolean; reason: string | null; minBid: number } | null;
  /** Spilleren hadde et bud i runden og ble overbudt (pengene er tilbake) */
  outbidMe: boolean;
}

export interface TakeoverWindow {
  open: boolean;
  reason: string | null;
  minBid: number;
  value: number;
  /** Når vernet for ny eier slutter */
  from: string | null;
  defenseNow: number;
  attackMin: number;
  /** Regelsettet et nytt bud avgjøres etter (B-441) */
  rules: TakeoverRules;
}

export interface TakeoverLast {
  status: "overtatt" | "avverget";
  attacker: string;
  bid: number;
  attack: number;
  defense: number;
  resolvedAt: string;
  mineAttack: boolean;
  mineOwner: boolean;
  /** Hva eieren fikk i konsernkassa da selskapet ble kjøpt (B-375) – bare for eieren */
  ownerPaid: number | null;
  rules: TakeoverRules;
}

export interface CompanyControl {
  score: number;
  parts: Record<string, number>;
  value: number;
  invested: number;
  /** Når eieren tok over (B-370): vernet de første dagene regnes av dette */
  since: string | null;
  /** Til når ingen kan legge inn oppkjøpsbud (vern, pause eller slutten av perioden), fra serveren (B-372) */
  protectedUntil: string | null;
  /** Eierens periode: hva hen får ved et oppkjøp regnes av dette (B-375). Null fra en eldre server */
  buyout: Buyout | null;
}

export interface WorldStatus {
  companies: Company[];
  /** Bryteren for overtakelser (B-335) */
  takeoversOn: boolean;
  treasury: TreasuryStatus;
  /** Utbyttet fra datterverkene (B-304): anslag per ekte dag nå, betalt for i går, og i alt */
  dividend: { perDay: number; fullPerDay: number; yesterday: number | null; total: number };
  /**
   * Hovedverkets konsernbidrag (B-318): en full dag nå (dempet), margin per tonn, tonn i en normal spilldag, siste
   * aktivitet (0,3–1), betalt for i går og i alt
   */
  contribution: {
    perDay: number;
    margin: number;
    normalT: number;
    activity: number | null;
    yesterday: number | null;
    total: number;
  };
  /** Konsernet på serveren (B-326): verkene, køen, nivået og kassa – null før serveren sender det */
  konsern: KonsernWorld | null;
}

type Row = Record<string, unknown>;
const num = (v: unknown): number => Number(v) || 0;
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

function parseTender(t: Row | null | undefined): Tender | null {
  if (!t) return null;
  return {
    id: num(t.id),
    opensAt: String(t.opens_at),
    closesAt: String(t.closes_at),
    minBid: num(t.min_bid),
    maxBid: num(t.max_bid),
    myBid: numOrNull(t.my_bid),
    bidders: Array.isArray(t.bidders) ? t.bidders.filter((x): x is string => typeof x === "string") : [],
  };
}

/**
 * Anbud avgjort før økonomien ble delt på 10 (B-311, 29.9.2026 kl. 04.44 norsk tid) er i gamle penger (B-374). Speiler
 * `bid_in_new_money` i `086_gamle_penger.sql`.
 */
export const OLD_MONEY_BEFORE = Date.parse("2026-09-29T02:44:52Z");

/** Et bud i dagens penger, og om det var i gamle penger */
export function bidInNewMoney(amount: number, closedAt: string): { now: number; old: boolean } {
  const old = Date.parse(closedAt) < OLD_MONEY_BEFORE;
  return { now: old ? amount / 10 : amount, old };
}

/** Beløpet slik appen viser det: gamle bud med dagens verdi i parentes */
export function fmtBid(amount: number, closedAt: string): string {
  const b = bidInNewMoney(amount, closedAt);
  return b.old ? `${fmtKr(amount)} (gamle penger, tilsvarer ${fmtKr(b.now)} nå)` : fmtKr(amount);
}

function parseResult(r: Row | null | undefined): TenderResult | null {
  if (!r) return null;
  return {
    id: num(r.id),
    closedAt: String(r.closed_at),
    status: r.status === "ingen bud" ? "ingen bud" : "avgjort",
    winner: str(r.winner),
    won: r.won === true,
    winningBid: numOrNull(r.winning_bid),
    bidders: num(r.bidders),
    tie: r.tie === true,
    myBid: numOrNull(r.my_bid),
  };
}

/** Kontrollen fra `company_control` (B-334) */
export function parseControl(r: Row | null | undefined): CompanyControl | null {
  if (!r || typeof r !== "object") return null;
  const parts: Record<string, number> = {};
  if (r.parts && typeof r.parts === "object")
    for (const [k, v] of Object.entries(r.parts as Row)) parts[k] = Number(v) || 0;
  return {
    score: Math.max(0, Math.min(100, num(r.score))),
    parts,
    value: num(r.value),
    invested: num(r.invested),
    since: typeof r.since === "string" ? r.since : null,
    protectedUntil: typeof r.protected_until === "string" ? r.protected_until : null,
    buyout:
      r.buyout && typeof r.buyout === "object"
        ? {
            perDay: num((r.buyout as Row).per_day),
            daysLeft: num((r.buyout as Row).days_left),
            investedKasse: num((r.buyout as Row).invested_kasse),
            investedFond: num((r.buyout as Row).invested_fond),
          }
        : null,
  };
}

export function parseTakeover(r: Row | null | undefined): Takeover | null {
  if (!r || typeof r !== "object") return null;
  return {
    id: num(r.id),
    attacker: str(r.attacker) ?? "Ukjent",
    mineAttack: r.mine_attack === true,
    bid: num(r.bid),
    defense: numOrNull(r.defense),
    closesAt: String(r.closes_at),
    attack: num(r.attack),
    defenseScore: num(r.defense_score),
    // Uten feltet er svaret fra før B-441, og da gjaldt regelsett 1
    rules: r.rules === 2 ? 2 : 1,
    compete: parseCompete(r.compete as Row | null),
    outbidMe: r.outbid_me === true,
  };
}

function parseCompete(r: Row | null | undefined): Takeover["compete"] {
  if (!r || typeof r !== "object") return null;
  return { open: r.open === true, reason: str(r.reason), minBid: num(r.min_bid) };
}

export function parseWindow(r: Row | null | undefined): TakeoverWindow | null {
  if (!r || typeof r !== "object") return null;
  return {
    open: r.open === true,
    reason: str(r.reason),
    minBid: num(r.min_bid),
    value: num(r.value),
    from: str(r.from),
    defenseNow: num(r.defense_now),
    attackMin: num(r.attack_min),
    rules: r.rules === 1 ? 1 : 2,
  };
}

export function parseTakeoverLast(r: Row | null | undefined): TakeoverLast | null {
  if (!r || typeof r !== "object") return null;
  return {
    status: r.status === "overtatt" ? "overtatt" : "avverget",
    attacker: str(r.attacker) ?? "Ukjent",
    bid: num(r.bid),
    attack: num(r.attack),
    defense: num(r.defense),
    resolvedAt: String(r.resolved_at),
    mineAttack: r.mine_attack === true,
    mineOwner: r.mine_owner === true,
    ownerPaid: numOrNull(r.owner_paid),
    rules: r.rules === 2 ? 2 : 1,
  };
}

type TakeoverResult = { ok: true } | { ok: false; reason: string };

async function takeoverCall(fn: string, args: Record<string, unknown>): Promise<TakeoverResult> {
  let r: Row | null;
  try {
    r = await rpc<Row>(fn, args);
  } catch {
    return { ok: false, reason: "nett" };
  }
  return r?.ok === true ? { ok: true } : { ok: false, reason: typeof r?.reason === "string" ? r.reason : "nett" };
}

/** Legg inn eller øk et bud på et selskap (B-335): betales fra konsernkassa med én gang */
/**
 * Legg inn, øk eller by over (B-335, B-442). `seen` er budet appen viste (B-443): har det endret seg på serveren siden,
 * avvises budet med «endret» i stedet for å bli noe annet enn spilleren bekreftet.
 */
export function bidTakeover(
  company: number,
  amount: number,
  seen: { bid: number; mine: boolean },
): Promise<TakeoverResult> {
  return takeoverCall("takeover_bid", {
    p_company: company,
    p_amount: Math.round(amount),
    p_seen_bid: Math.round(seen.bid),
    p_seen_mine: seen.mine,
  });
}

/** Forsvar selskapet ditt med kapital fra kassa eller fondet (B-335) */
export function defendTakeover(takeover: number, amount: number, source: "kasse" | "fond"): Promise<TakeoverResult> {
  return takeoverCall("takeover_defend", { p_takeover: takeover, p_amount: Math.round(amount), p_source: source });
}

/**
 * Beskjed i loggen når et forsøk der spilleren var angriper eller eier, er avgjort (B-335). Husker det siste den har
 * skrevet om i `g.takeoverSeen` (tidspunktet).
 */
export function applyTakeoverNews(g: GameState, companies: Pick<Company, "name" | "takeoverLast">[]): number {
  let n = 0;
  for (const c of companies) {
    const r = c.takeoverLast;
    if (!r || !(r.mineAttack || r.mineOwner) || r.resolvedAt <= (g.takeoverSeen ?? "")) continue;
    g.takeoverSeen = r.resolvedAt;
    const name = c.name.toLowerCase();
    if (r.mineAttack)
      log(
        g,
        r.status === "overtatt"
          ? `Du kjøpte ${name}! Du eier det i 14 dager fra nå, og de første 3 dagene kan ingen by på det.`
          : `Oppkjøpsbudet ditt på ${name} holdt ikke – eieren sto sterkest. ${fmtKr(Math.round(r.bid * bidBack(r.rules)))} er tilbake i konsernkassa.`,
        r.status === "overtatt" ? "good" : "event",
      );
    else
      log(
        g,
        r.status === "overtatt"
          ? `${r.attacker} kjøpte ${name} fra deg. Du fikk ${r.ownerPaid !== null ? fmtKr(r.ownerPaid) : "betalt"} i konsernkassa for dagene du mistet og det du hadde investert.`
          : `Du beholdt ${name} – oppkjøpsbudet fra ${r.attacker} holdt ikke.`,
        r.status === "overtatt" ? "bad" : "good",
      );
    n++;
  }
  return n;
}

export type InvestRefusal = "belop" | "eier" | "kasse" | "sperret" | "nett";

export const INVEST_REFUSAL_TEXT: Record<InvestRefusal, string> = {
  belop: "Investeringen må være minst 1 mill.",
  eier: "Du kan bare investere i selskaper du eier.",
  kasse: "Det er ikke nok penger der.",
  sperret: "Kontoen er sperret mens topplista sjekker den.",
  nett: "Fikk ikke kontakt med serveren. Prøv igjen om litt.",
};

/** Invester i et selskap du eier (B-334): pengene blir i selskapet og gir Kontroll og mer inntekt */
export async function investInCompany(
  company: number,
  amount: number,
  source: "kasse" | "fond",
): Promise<{ ok: true; control: CompanyControl | null } | { ok: false; reason: InvestRefusal }> {
  let r: Row | null;
  try {
    r = await rpc<Row>("company_invest", { p_company: company, p_amount: Math.round(amount), p_source: source });
  } catch {
    return { ok: false, reason: "nett" };
  }
  if (r?.ok !== true) {
    const reason = r?.reason as InvestRefusal;
    return { ok: false, reason: reason in INVEST_REFUSAL_TEXT ? reason : "nett" };
  }
  return { ok: true, control: parseControl(r.control as Row | null) };
}

export async function fetchWorldStatus(): Promise<WorldStatus> {
  const r = await rpc<{
    companies?: Row[];
    treasury?: Row;
    dividend?: Row;
    contribution?: Row;
    konsern?: Row;
    takeovers_on?: boolean;
  }>("world_status", {});
  const t = r?.treasury ?? {};
  const d = r?.dividend ?? {};
  const c = r?.contribution ?? {};
  return {
    companies: (r?.companies ?? []).map((c) => ({
      id: num(c.id),
      type: companyType(c.type),
      name: String(c.name ?? COMPANY_NAME[companyType(c.type)]),
      owner: str(c.owner),
      mine: c.mine === true,
      concessionUntil: str(c.concession_until),
      nextOwner: str(c.next_owner),
      nextMine: c.next_mine === true,
      incomeYesterday: numOrNull(c.income_yesterday),
      incomeMine: num(c.income_mine),
      estimatePerDay: num(c.estimate_per_day),
      estimateMine: numOrNull(c.estimate_mine),
      tender: parseTender(c.tender as Row | null),
      lastResult: parseResult(c.last_result as Row | null),
      region: isRegion(c.region) ? c.region : null,
      control: parseControl(c.control as Row | null),
      takeover: parseTakeover(c.takeover as Row | null),
      takeoverWindow: parseWindow(c.takeover_window as Row | null),
      takeoverLast: parseTakeoverLast(c.takeover_last as Row | null),
    })),
    takeoversOn: r?.takeovers_on === true,
    treasury: {
      balance: num(t.balance),
      limit: num(t.limit),
      used: num(t.used),
      left: num(t.left),
      freedAt: str(t.freed_at),
    },
    dividend: {
      perDay: num(d.per_day),
      fullPerDay: d.full_per_day === undefined ? num(d.per_day) : num(d.full_per_day),
      yesterday: numOrNull(d.yesterday),
      total: num(d.total),
    },
    contribution: {
      perDay: num(c.per_day),
      margin: num(c.margin),
      normalT: num(c.normal_t),
      activity: numOrNull(c.activity),
      yesterday: numOrNull(c.yesterday),
      total: num(c.total),
    },
    konsern: parseKonsern(r?.konsern),
  };
}

/** Taket på bidraget (config.world.contribution, speiler `contribution_amount`): over 30 mill. per dag vokser det med potensen 0,5 */
export const CONTRIBUTION_LOAD = { from: 30_000_000, power: 0.5 };

/**
 * Bidraget per dag ved en annen aktivitet enn full (B-417): regner tilbake fra bidraget for en full dag (etter taket) og
 * legger taket på igjen – som `contribution_amount(full_day, aktivitet)` på serveren.
 */
export function contributionAt(perDayFull: number, activity: number): number {
  const { from, power } = CONTRIBUTION_LOAD;
  const full = perDayFull > from ? from * (perDayFull / from) ** (1 / power) : perDayFull;
  const x = Math.max(0, full * activity);
  return x > from ? from * (x / from) ** power : x;
}

/**
 * Konsernverdien slik topplista regner den (B-320, speiler `konsern_value` i 104): konsernkassa + 60 × (utbytte +
 * bidrag) − lån hjemme − lån i konsernbanken. Bidraget regnes med aktiviteten i siste betalte bidrag (B-417) – før sto en spiller som ikke hadde
 * spilt på dager, med fullt bidrag. Serveren tar også med dagens produksjon så langt; den har ikke appen.
 */
export function konsernValueOf(w: WorldStatus, loan: number): number {
  // Hele utbyttet, uansett utbyttepolitikk (B-334): det som holdes igjen, er fortsatt konsernets
  const contribution = contributionAt(w.contribution.perDay, w.contribution.activity ?? 1);
  // Lånet i konsernbanken trekkes også fra (B-437, 121)
  return (
    w.treasury.balance +
    60 * (w.dividend.fullPerDay + contribution) -
    Math.max(0, loan) -
    Math.max(0, w.konsern?.bank?.loan ?? 0)
  );
}

/**
 * Beskjeden om utbyttet fra datterverkene (B-304) og hovedverkets konsernbidrag (B-318): én gang per ekte dag, når
 * serveren har betalt for i går. Gir 1 hvis det ble skrevet noe.
 */
export function applyDividendNews(g: GameState, yesterday: number | null, now = realNow(), contribution = 0): number {
  const day = yesterdayWorld(now);
  const div = yesterday && yesterday > 0 ? yesterday : 0;
  const bid = contribution > 0 ? contribution : 0;
  if (div + bid <= 0 || g.dividendSeen === day) return 0;
  g.dividendSeen = day;
  const text =
    bid > 0 && div > 0
      ? `Hovedverket betalte ${fmtKr(bid)} i konsernbidrag og datterverkene ${fmtKr(div)} i utbytte`
      : bid > 0
        ? `Hovedverket betalte ${fmtKr(bid)} i konsernbidrag`
        : `Datterverkene betalte ${fmtKr(div)} i utbytte`;
  log(g, `${text} til konsernkassa i går.`, "good");
  return 1;
}

export type BidRefusal = "sperret" | "konsern" | "stengt" | "utenfor" | "kasse";
export type BidResult = { ok: true; bid: number; balance: number } | { ok: false; reason: BidRefusal };

export const BID_REFUSAL_TEXT: Record<BidRefusal, string> = {
  sperret: "Kontoen er sperret for bud mens topplista sjekker den.",
  konsern: "Du må ha et konsern for å by.",
  stengt: "Anbudet er stengt.",
  utenfor: "Budet må være mellom minste og høyeste bud.",
  kasse: "Det er ikke nok i konsernkassa.",
};

/** Legg inn, endre eller trekk (0) et bud. Pengene holdes av i konsernkassa til anbudet er avgjort. */
export async function placeBid(tender: number, amount: number): Promise<BidResult> {
  const r = await rpc<Row>("place_bid", { p_tender: tender, p_amount: Math.floor(amount) });
  if (r?.ok !== true) return { ok: false, reason: (r?.reason as BidRefusal) ?? "stengt" };
  return { ok: true, bid: num(r.bid), balance: num(r.balance) };
}

/** «31 t» / «45 min» til et tidspunkt */
export function timeLeft(iso: string, now = realNow()): string {
  const ms = Date.parse(iso) - now;
  if (ms <= 0) return "nå";
  const h = Math.floor(ms / 3_600_000);
  return h >= 1 ? `${h} t` : `${Math.max(1, Math.round(ms / 60_000))} min`;
}

/**
 * Varsel om et avgjort anbud (B-237) til den som bydde: hvem som vant, med hvor mye, og at budet er tilbake i
 * konsernkassa. Gis én gang per anbud (`tenderSeen`), og bare for anbud som stengte de siste 14 dagene.
 */
/**
 * Resultatene for alle selskapene (B-253): i rekkefølge etter anbudet, så et nyere anbud på ett selskap ikke gjør at
 * et eldre på et annet regnes som sett før det har gitt varsel. Gir hvor mange varsler som ble gitt.
 */
export function applyTenderResults(
  g: GameState,
  companies: Pick<Company, "name" | "lastResult">[],
  now = realNow(),
): number {
  let n = 0;
  for (const c of [...companies].sort((a, b) => (a.lastResult?.id ?? 0) - (b.lastResult?.id ?? 0)))
    if (c.lastResult && applyTenderResult(g, c.name, c.lastResult, now)) n++;
  return n;
}

export function applyTenderResult(g: GameState, company: string, r: TenderResult, now = realNow()): boolean {
  if (r.id <= (g.tenderSeen ?? 0)) return false;
  g.tenderSeen = r.id;
  if (now - Date.parse(r.closedAt) > 14 * 86_400_000) return false;
  const name = company.toLowerCase();
  const tie = r.tie ? " (likt bud – avgjort ved trekning)" : "";
  if (r.won)
    log(
      g,
      `Du vant anbudet på ${name} med ${fmtKr(r.winningBid ?? r.myBid ?? 0)}${tie}! Du driver det de neste 14 dagene. Inntekten går til konsernkassa én gang i døgnet – den første ${firstPayout(now)}.`,
      "good",
    );
  else if (r.myBid !== null)
    log(
      g,
      `Anbudet på ${name} er avgjort: ${r.winner ?? "en annen"} vant med ${fmtKr(r.winningBid ?? 0)}${tie}. Budet ditt på ${fmtKr(r.myBid)} er tilbake i konsernkassa.`,
      "event",
    );
  // De som ikke bød, får vite hvem som eier selskapet nå (B-258) – uten beløp
  else if (r.status === "avgjort" && r.winner)
    log(g, `${company} har fått ny eier: ${r.winner} driver det de neste 14 dagene.`, "event");
  else return false;
  return true;
}

/** Hvor mange timer før anbudet stenger spilleren får det andre varselet (B-453) */
export const TENDER_LATE_H = 12;

/** Dagene vinneren av et anbud driver selskapet (konsesjonen) */
export const TENDER_DAYS = 14;

/** «søn. 5. okt., 10:38» – når anbudet stenger, i spillerens egen tid */
function closesText(iso: string): string {
  return new Date(iso).toLocaleString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Hvilket varsel om et åpent anbud som skal gis nå (B-453): 1 = det har åpnet, 2 = 12 timer igjen, 0 = ingen. Bare til
 * den som ikke har bydd, og hvert varsel bare én gang (`tenderNotice`). Åpner spilleren appen sent, kommer bare det andre.
 */
export function tenderNoticeDue(g: GameState, t: Tender, now = realNow()): 0 | 1 | 2 {
  const left = Date.parse(t.closesAt) - now;
  if (t.myBid !== null || left <= 0 || Date.parse(t.opensAt) > now) return 0;
  const want = left <= TENDER_LATE_H * 3_600_000 ? 2 : 1;
  return (g.tenderNotice?.[String(t.id)] ?? 0) >= want ? 0 : want;
}

/**
 * Varsel i varsellinja om åpne anbud (B-453): når anbudet åpner og når 12 timer er igjen, med lenke til selskapet
 * (Konsern → Industrien) og at den som taper, får hele budet tilbake. Anbud som er stengt, glemmes, så minnet ikke
 * vokser. Gir hvor mange varsler som ble gitt.
 */
export function applyTenderNotices(
  g: GameState,
  companies: Pick<Company, "type" | "name" | "tender">[],
  now = realNow(),
): number {
  g.tenderNotice ??= {};
  const open = new Set<string>();
  let n = 0;
  for (const c of companies) {
    const t = c.tender;
    if (!t || Date.parse(t.closesAt) <= now) continue;
    const key = String(t.id);
    open.add(key);
    const due = tenderNoticeDue(g, t, now);
    if (!due) continue;
    g.tenderNotice[key] = due;
    const back = "Taper du, får du hele budet tilbake.";
    log(
      g,
      due === 1
        ? `Anbud åpent: ${c.name} – eieren tjener på ${EARNS_FROM[c.type]} i ${TENDER_DAYS} dager. Byd innen ${closesText(t.closesAt)}. ${back}`
        : `Mindre enn ${TENDER_LATE_H} timer igjen av anbudet på ${c.name.toLowerCase()} (stenger ${closesText(t.closesAt)}). ${back}`,
      "event",
      "industri",
    );
    n++;
  }
  for (const k of Object.keys(g.tenderNotice)) if (!open.has(k)) delete g.tenderNotice[k];
  return n;
}

/** Neste midnatt norsk tid – da betaler serveren inntekten for dagen som gikk (B-258, B-369) */
export function nextPayout(now = realNow()): number {
  return nextWorldMidnight(now);
}

/** «i natt kl. 00:00» – når neste inntekt kommer, i spillerens egen tid */
export function firstPayout(now = realNow()): string {
  const at = new Date(nextPayout(now));
  const time = at.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  const h = at.getHours();
  const word = h < 6 || h >= 22 ? "i natt" : new Date(now).toDateString() === at.toDateString() ? "i dag" : "i morgen";
  return `${word} kl. ${time}`;
}

/** Serverens dato for i går (norsk tid), «2026-09-28» – dagen `income_yesterday` gjelder */
export function yesterdayWorld(now = realNow()): string {
  return worldDay(nextPayout(now) - 36 * 3_600_000);
}

/**
 * Beskjed til eieren når selskapet har betalt ut gårsdagens inntekt (B-258), én gang per selskap og dag. Gir hvor
 * mange beskjeder som ble gitt.
 */
export function applyCompanyIncome(
  g: GameState,
  companies: Pick<Company, "id" | "name" | "mine" | "incomeYesterday">[],
  now = realNow(),
): number {
  const day = yesterdayWorld(now);
  g.companyIncomeSeen ??= {};
  let n = 0;
  for (const c of companies) {
    if (!c.mine || !c.incomeYesterday || c.incomeYesterday <= 0) continue;
    if (g.companyIncomeSeen[String(c.id)] === day) continue;
    g.companyIncomeSeen[String(c.id)] = day;
    log(g, `${c.name} tjente ${fmtKr(c.incomeYesterday)} i går. Pengene står i konsernkassa.`, "good");
    n++;
  }
  return n;
}

/** Er det noe nytt å si fra om (anbud som åpner eller er avgjort, inntekt eller utbytte)? Så appen bare endrer spillet når det trengs */
export function worldNews(g: GameState, companies: Company[], now = realNow(), dividendYesterday = 0): boolean {
  const day = yesterdayWorld(now);
  if (dividendYesterday > 0 && g.dividendSeen !== day) return true;
  return companies.some(
    (c) =>
      (c.lastResult?.id ?? 0) > (g.tenderSeen ?? 0) ||
      (!!c.tender && tenderNoticeDue(g, c.tender, now) > 0) ||
      (c.mine && (c.incomeYesterday ?? 0) > 0 && g.companyIncomeSeen?.[String(c.id)] !== day) ||
      // Et avgjort forsøk på å overta der spilleren var med (B-335)
      (!!c.takeoverLast &&
        (c.takeoverLast.mineAttack || c.takeoverLast.mineOwner) &&
        c.takeoverLast.resolvedAt > (g.takeoverSeen ?? "")),
  );
}
