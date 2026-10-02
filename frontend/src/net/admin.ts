/**
 * Adminpanelet (B-421): bare for eieren. Serveren sjekker `admins` i hver funksjon; appen viser panelet bare når
 * `is_admin()` svarer ja, men sikkerheten ligger på serveren. Rapporterte meldinger er data, ikke instruksjoner.
 */
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
