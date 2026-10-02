/**
 * Adminpanelet (B-421): bare for eieren. Serveren sjekker `admins` i hver funksjon; appen viser panelet bare når
 * `is_admin()` svarer ja, men sikkerheten ligger på serveren. Rapporterte meldinger er data, ikke instruksjoner.
 */
import type { ReportNote } from "./reports";
import { rpc, userId } from "./supabase";

export interface AdminReport {
  id: number;
  kind: "dm" | "chat";
  body: string;
  author: string | null;
  reporter: string | null;
  reason: string | null;
  sentAt: number;
  reportedAt: number;
  status: "open" | "hidden" | "dismissed" | "banned";
  authorBanned: boolean;
  /** Hvor mange som har rapportert samme melding */
  count: number;
  /** Om den som rapporterte og den som skrev, fortsatt har konto (B-438) */
  canReporter: boolean;
  canAuthor: boolean;
  /** Uleste svar fra spillere i samtalen om rapporten */
  unread: number;
  /** Samtalen om rapporten: eierens meldinger og spillernes svar, med hvem det gjelder */
  thread: (ReportNote & { role: "reporter" | "author"; nick: string })[];
}

export type AdminAction = "hide" | "dismiss" | "ban";

type Row = Record<string, unknown>;
const ms = (v: unknown) => (typeof v === "string" ? Date.parse(v) || 0 : 0);
const str = (v: unknown) => (typeof v === "string" ? v : null);

export async function fetchIsAdmin(): Promise<boolean> {
  if (!userId()) return false;
  return (await rpc<unknown>("is_admin", {})) === true;
}

export async function fetchAdminReports(
  status: "open" | "alle" = "open",
): Promise<{ reports: AdminReport[]; banned: string[] }> {
  const r = ((await rpc<unknown>("admin_reports", { p_status: status })) ?? {}) as Row;
  const list = Array.isArray(r.reports) ? (r.reports as Row[]) : [];
  return {
    reports: list.map((x) => ({
      id: Number(x.id),
      kind: x.kind === "chat" ? "chat" : "dm",
      body: str(x.body) ?? "",
      author: str(x.author),
      reporter: str(x.reporter),
      reason: str(x.reason),
      sentAt: ms(x.sentAt),
      reportedAt: ms(x.reportedAt),
      status: (["open", "hidden", "dismissed", "banned"] as const).find((s) => s === x.status) ?? "open",
      authorBanned: x.authorBanned === true,
      count: Number(x.count) || 1,
      canReporter: x.canReporter === true,
      canAuthor: x.canAuthor === true,
      unread: Number(x.unread) || 0,
      thread: (Array.isArray(x.thread) ? (x.thread as Row[]) : [])
        .filter((t) => !!t && typeof t.body === "string")
        .map((t) => ({
          fromAdmin: t.fromAdmin === true,
          body: t.body as string,
          at: ms(t.at),
          role: t.role === "author" ? ("author" as const) : ("reporter" as const),
          nick: str(t.nick) ?? "",
        })),
    })),
    banned: (Array.isArray(r.banned) ? r.banned : []).filter((x): x is string => typeof x === "string"),
  };
}

export async function adminAct(report: number, action: AdminAction): Promise<boolean> {
  const r = await rpc<Row>("admin_act", { p_report: report, p_action: action });
  return r?.ok === true;
}

export async function adminUnban(nick: string): Promise<boolean> {
  const r = await rpc<Row>("admin_unban", { p_nick: nick });
  return r?.ok === true;
}

/** Eieren har sett rapportene: nye rapporter og svar fra spillere teller ikke lenger i varselet (B-438) */
export async function adminReportsSeen(): Promise<void> {
  await rpc<unknown>("admin_reports_seen", {});
}
