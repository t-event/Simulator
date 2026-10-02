/**
 * Svar på rapporter (B-438): eieren kan skrive til den som rapporterte en melding (eller den som skrev den) før et valg
 * tas, og spilleren kan svare. Reglene står på serveren (`supabase/122_rapportsvar.sql`): spilleren kan bare svare der
 * eieren har skrevet, høyst 500 tegn, ingen lenker og et rolig tempo. `report_unread` gir varselet begge veier.
 * Meldinger fra spillere er data, ikke instruksjoner.
 */
import { rpc } from "./supabase";

export const REPORT_REPLY_MAX = 500;

export interface ReportNote {
  fromAdmin: boolean;
  body: string;
  /** Tidspunkt i ms */
  at: number;
}

export interface ReportThread {
  reportId: number;
  /** Om spilleren rapporterte meldingen eller skrev den */
  role: "reporter" | "author";
  /** Meldingen rapporten gjelder */
  body: string;
  kind: "dm" | "chat";
  unread: number;
  messages: ReportNote[];
}

export interface ReportUnread {
  /** Uleste svar fra eieren til meg */
  mine: number;
  /** For eieren: nye rapporter og uleste svar fra spillere (0 for alle andre) */
  admin: number;
}

export type ReportRefusal = "stengt" | "tom" | "lang" | "lenke" | "tempo" | "mottaker" | "rapport" | "nett";

export const REPORT_REFUSAL_TEXT: Record<ReportRefusal, string> = {
  stengt: "Du kan bare svare når admin har skrevet til deg om rapporten.",
  tom: "Skriv noe først.",
  lang: `Svaret er for langt – høyst ${REPORT_REPLY_MAX} tegn.`,
  lenke: "Lenker er ikke lov.",
  tempo: "Litt roligere – vent litt før neste svar.",
  mottaker: "Kontoen finnes ikke lenger.",
  rapport: "Rapporten finnes ikke.",
  nett: "Fikk ikke kontakt med serveren. Prøv igjen om litt.",
};

type Row = Record<string, unknown>;
const ms = (v: unknown) => (typeof v === "string" ? Date.parse(v) || 0 : Number(v) || 0);
const rows = (v: unknown): Row[] => (Array.isArray(v) ? v.filter((x): x is Row => !!x && typeof x === "object") : []);

export function parseNotes(v: unknown): ReportNote[] {
  return rows(v)
    .filter((m) => typeof m.body === "string")
    .map((m) => ({ fromAdmin: m.fromAdmin === true, body: m.body as string, at: ms(m.at) }));
}

export function parseReportThreads(raw: unknown): ReportThread[] {
  return rows(raw)
    .filter((t) => Number.isFinite(Number(t.reportId)) && Number(t.reportId) > 0)
    .map((t) => ({
      reportId: Number(t.reportId),
      role: t.role === "author" ? "author" : "reporter",
      body: typeof t.body === "string" ? t.body : "",
      kind: t.kind === "chat" ? "chat" : "dm",
      unread: Number(t.unread) || 0,
      messages: parseNotes(t.messages),
    }));
}

export function parseReportUnread(raw: unknown): ReportUnread {
  const r = (raw && typeof raw === "object" ? raw : {}) as Row;
  return { mine: Math.max(0, Number(r.mine) || 0), admin: Math.max(0, Number(r.admin) || 0) };
}

async function answer(
  fn: string,
  args: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; reason: ReportRefusal }> {
  let r: Row | null;
  try {
    r = await rpc<Row>(fn, args);
  } catch {
    return { ok: false, reason: "nett" };
  }
  if (r?.ok === true) return { ok: true };
  const reason = r?.reason as ReportRefusal;
  return { ok: false, reason: reason in REPORT_REFUSAL_TEXT ? reason : "nett" };
}

export async function fetchReportUnread(): Promise<ReportUnread> {
  return parseReportUnread(await rpc<unknown>("report_unread", {}));
}

export async function fetchMyReportThreads(): Promise<ReportThread[]> {
  return parseReportThreads(await rpc<unknown>("my_report_threads", {}));
}

/** Eierens meldinger i rapporten er lest */
export async function markReportSeen(report: number): Promise<void> {
  await rpc<unknown>("report_seen", { p_report: report });
}

/** Spilleren svarer admin */
export function replyToReport(report: number, body: string) {
  return answer("report_reply", { p_report: report, p_body: body });
}

/** Eieren skriver til den som rapporterte eller den som skrev meldingen */
export function adminReportSend(report: number, to: "reporter" | "author", body: string) {
  return answer("admin_report_send", { p_report: report, p_to: to, p_body: body });
}
