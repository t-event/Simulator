/**
 * Verden mellom spillerne (B-189): strategiske selskaper, anbud og konsernkassa. Alt avgjøres på serveren i ekte tid
 * (`world_status`, `place_bid` i supabase/030_skraplageret.sql); appen viser bare det serveren sier.
 */
import { fmtKr, log } from "../game/engine";
import type { GameState } from "../game/types";
import { rpc } from "./supabase";
import { nextWorldMidnight, worldDay } from "../game/clock";
import type { TreasuryStatus } from "./treasury";
import type { KonsernWorld } from "../game/konsernWorld";
import { parseKonsern } from "./konsern";
import { isRegion } from "../game/regions";
import type { RegionId } from "../game/types";

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
}

export interface CompanyControl {
  score: number;
  parts: Record<string, number>;
  value: number;
  invested: number;
  /** Når eieren tok over (B-370): vernet de første dagene regnes av dette */
  since: string | null;
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
  };
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
export function bidTakeover(company: number, amount: number): Promise<TakeoverResult> {
  return takeoverCall("takeover_bid", { p_company: company, p_amount: Math.round(amount) });
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
    const score = `(angrep ${Math.round(r.attack)} mot forsvar ${Math.round(r.defense)})`;
    if (r.mineAttack)
      log(
        g,
        r.status === "overtatt"
          ? `Du har overtatt ${name} ${score}! Du eier det resten av konsesjonen.`
          : `Forsøket på å overta ${name} ble avverget ${score}. ${fmtKr(Math.round(r.bid * 0.9))} er tilbake i konsernkassa.`,
        r.status === "overtatt" ? "good" : "event",
      );
    else
      log(
        g,
        r.status === "overtatt"
          ? `${r.attacker} har overtatt ${name} ${score}. Du fikk ${fmtKr(Math.round(r.bid * 0.85))} i konsernkassa.`
          : `Du avverget forsøket fra ${r.attacker} på å overta ${name} ${score}.`,
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

/**
 * Konsernverdien slik topplista regner den (B-320, speiler `konsern_value` i 063): konsernkassa + 60 × (utbytte +
 * bidrag for en full dag) − lån. Tallene kommer fra serveren; lånet er det i spillet (det samme som lagres).
 */
export function konsernValueOf(w: WorldStatus, loan: number): number {
  // Hele utbyttet, uansett utbyttepolitikk (B-334): det som holdes igjen, er fortsatt konsernets
  return w.treasury.balance + 60 * (w.dividend.fullPerDay + w.contribution.perDay) - Math.max(0, loan);
}

/**
 * Beskjeden om utbyttet fra datterverkene (B-304) og hovedverkets konsernbidrag (B-318): én gang per ekte dag, når
 * serveren har betalt for i går. Gir 1 hvis det ble skrevet noe.
 */
export function applyDividendNews(g: GameState, yesterday: number | null, now = Date.now(), contribution = 0): number {
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
export function timeLeft(iso: string, now = Date.now()): string {
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
  now = Date.now(),
): number {
  let n = 0;
  for (const c of [...companies].sort((a, b) => (a.lastResult?.id ?? 0) - (b.lastResult?.id ?? 0)))
    if (c.lastResult && applyTenderResult(g, c.name, c.lastResult, now)) n++;
  return n;
}

export function applyTenderResult(g: GameState, company: string, r: TenderResult, now = Date.now()): boolean {
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

/** Neste midnatt norsk tid – da betaler serveren inntekten for dagen som gikk (B-258, B-369) */
export function nextPayout(now = Date.now()): number {
  return nextWorldMidnight(now);
}

/** «i natt kl. 00:00» – når neste inntekt kommer, i spillerens egen tid */
export function firstPayout(now = Date.now()): string {
  const at = new Date(nextPayout(now));
  const time = at.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  const h = at.getHours();
  const word = h < 6 || h >= 22 ? "i natt" : new Date(now).toDateString() === at.toDateString() ? "i dag" : "i morgen";
  return `${word} kl. ${time}`;
}

/** Serverens dato for i går (norsk tid), «2026-09-28» – dagen `income_yesterday` gjelder */
export function yesterdayWorld(now = Date.now()): string {
  return worldDay(nextPayout(now) - 36 * 3_600_000);
}

/**
 * Beskjed til eieren når selskapet har betalt ut gårsdagens inntekt (B-258), én gang per selskap og dag. Gir hvor
 * mange beskjeder som ble gitt.
 */
export function applyCompanyIncome(
  g: GameState,
  companies: Pick<Company, "id" | "name" | "mine" | "incomeYesterday">[],
  now = Date.now(),
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

/** Er det noe nytt å si fra om (anbud, inntekt eller utbytte)? Så appen bare endrer spillet når det trengs */
export function worldNews(g: GameState, companies: Company[], now = Date.now(), dividendYesterday = 0): boolean {
  const day = yesterdayWorld(now);
  if (dividendYesterday > 0 && g.dividendSeen !== day) return true;
  return companies.some(
    (c) =>
      (c.lastResult?.id ?? 0) > (g.tenderSeen ?? 0) ||
      (c.mine && (c.incomeYesterday ?? 0) > 0 && g.companyIncomeSeen?.[String(c.id)] !== day) ||
      // Et avgjort forsøk på å overta der spilleren var med (B-335)
      (!!c.takeoverLast &&
        (c.takeoverLast.mineAttack || c.takeoverLast.mineOwner) &&
        c.takeoverLast.resolvedAt > (g.takeoverSeen ?? "")),
  );
}
