/**
 * Verden mellom spillerne (B-189): strategiske selskaper, anbud og konsernkassa. Alt avgjøres på serveren i ekte tid
 * (`world_status`, `place_bid` i supabase/030_skraplageret.sql); appen viser bare det serveren sier.
 */
import { rpc } from "./supabase";
import type { TreasuryStatus } from "./treasury";

export interface Tender {
  id: number;
  opensAt: string;
  closesAt: string;
  minBid: number;
  maxBid: number;
  /** Eget bud, eller null. Andres bud er skjult til anbudet stenger. */
  myBid: number | null;
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

export interface Company {
  id: number;
  type: "skraplager";
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
}

export interface WorldStatus {
  companies: Company[];
  treasury: TreasuryStatus;
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

export async function fetchWorldStatus(): Promise<WorldStatus> {
  const r = await rpc<{ companies?: Row[]; treasury?: Row }>("world_status", {});
  const t = r?.treasury ?? {};
  return {
    companies: (r?.companies ?? []).map((c) => ({
      id: num(c.id),
      type: "skraplager",
      name: String(c.name ?? "Skraplageret"),
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
    })),
    treasury: {
      balance: num(t.balance),
      limit: num(t.limit),
      used: num(t.used),
      left: num(t.left),
      freedAt: str(t.freed_at),
    },
  };
}

export type BidRefusal = "sperret" | "konsern" | "stengt" | "utenfor" | "kasse";
export type BidResult = { ok: true; bid: number; balance: number } | { ok: false; reason: BidRefusal };

export const BID_REFUSAL_TEXT: Record<BidRefusal, string> = {
  sperret: "Kontoen er sperret for bud mens topplista sjekker den.",
  konsern: "Du må ha et konsern for å by.",
  stengt: "Anbudet er stengt.",
  utenfor: "Budet må være mellom minste og høyeste bud.",
  kasse: "Det er ikke nok i konsernkassa. Flytt penger inn først.",
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
