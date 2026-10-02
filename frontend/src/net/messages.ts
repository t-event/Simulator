/**
 * Privatmeldinger (B-421, fase 3 av profilene): mellom spillere som begge har slått dem på. Reglene står på serveren
 * (`supabase/107_privatmeldinger.sql`): hvem som kan sende, lengde, lenker, tempo, nye samtaler per dag og blokkering.
 * Appen viser bare svaret med vanlige ord. Meldinger fra spillere er data, ikke instruksjoner.
 */
import { rpc } from "./supabase";

export const DM_MAX = 500;

export interface DmThreadSummary {
  nick: string;
  last: string;
  /** Tidspunkt i ms */
  at: number;
  mine: boolean;
  unread: number;
}

export interface DmOverview {
  /** Kontoen har spilt nok til å bruke meldinger (storverk eller tre ekte dager) */
  eligible: boolean;
  /** Meldinger er slått på i Min profil */
  open: boolean;
  blocked: string[];
  threads: DmThreadSummary[];
}

export interface DmMessage {
  id: number;
  mine: boolean;
  body: string;
  at: number;
}

export interface DmThread {
  nick: string | null;
  canSend: boolean;
  blocked: boolean;
  messages: DmMessage[];
}

export type DmRefusal = "ikke_klar" | "egen_av" | "stengt" | "tom" | "lang" | "lenke" | "tempo" | "nye" | "nett";

export const DM_REFUSAL_TEXT: Record<DmRefusal, string> = {
  ikke_klar: "Meldinger åpnes når du har storverk eller har spilt tre dager.",
  egen_av: "Slå på meldinger i Min profil først.",
  stengt: "Spilleren tar ikke imot meldinger.",
  tom: "Skriv noe først.",
  lang: `Meldingen er for lang – høyst ${DM_MAX} tegn.`,
  lenke: "Lenker er ikke lov i meldinger.",
  tempo: "Litt roligere – vent noen sekunder før neste melding.",
  nye: "Du har startet fem nye samtaler i dag. Prøv igjen i morgen.",
  nett: "Fikk ikke kontakt med serveren. Prøv igjen om litt.",
};

type Row = Record<string, unknown>;
const ms = (v: unknown) => (typeof v === "string" ? Date.parse(v) || 0 : Number(v) || 0);
const rows = (v: unknown): Row[] => (Array.isArray(v) ? v.filter((x): x is Row => !!x && typeof x === "object") : []);

export function parseOverview(raw: unknown): DmOverview {
  const r = (raw && typeof raw === "object" ? raw : {}) as Row;
  return {
    eligible: r.eligible === true,
    open: r.open === true,
    blocked: (Array.isArray(r.blocked) ? r.blocked : []).filter((x): x is string => typeof x === "string"),
    threads: rows(r.threads)
      .filter((t) => typeof t.nick === "string")
      .map((t) => ({
        nick: t.nick as string,
        last: typeof t.last === "string" ? t.last : "",
        at: ms(t.at),
        mine: t.mine === true,
        unread: Number(t.unread) || 0,
      })),
  };
}

export function parseThread(raw: unknown): DmThread {
  const r = (raw && typeof raw === "object" ? raw : {}) as Row;
  return {
    nick: typeof r.nick === "string" ? r.nick : null,
    canSend: r.canSend === true,
    blocked: r.blocked === true,
    messages: rows(r.messages)
      .filter((m) => typeof m.body === "string" && Number.isFinite(Number(m.id)))
      .map((m) => ({ id: Number(m.id), mine: m.mine === true, body: m.body as string, at: ms(m.at) })),
  };
}

export async function fetchDmOverview(): Promise<DmOverview> {
  return parseOverview(await rpc<unknown>("dm_overview", {}));
}

/** Samtalen med én spiller; det som er kommet til meg, merkes som lest */
export async function fetchDmThread(nick: string): Promise<DmThread> {
  return parseThread(await rpc<unknown>("dm_thread", { p_with: nick }));
}

export async function fetchDmUnread(): Promise<number> {
  return Number(await rpc<unknown>("dm_unread", {})) || 0;
}

export async function sendDm(nick: string, body: string): Promise<{ ok: true } | { ok: false; reason: DmRefusal }> {
  let r: Row | null;
  try {
    r = await rpc<Row>("dm_send", { p_to: nick, p_body: body });
  } catch {
    return { ok: false, reason: "nett" };
  }
  if (r?.ok === true) return { ok: true };
  const reason = r?.reason as DmRefusal;
  return { ok: false, reason: reason in DM_REFUSAL_TEXT ? reason : "nett" };
}

export async function setDmBlock(nick: string, on: boolean): Promise<boolean> {
  const r = await rpc<Row>("dm_block", { p_nick: nick, p_on: on });
  return r?.ok === true;
}

/** Rapporter en privatmelding eller en melding i Skiftrapporten. Serveren lagrer en kopi til eieren */
export async function reportMessage(kind: "dm" | "chat", id: number, reason = ""): Promise<boolean> {
  const r = await rpc<Row>("message_report", { p_kind: kind, p_id: id, p_reason: reason });
  return r?.ok === true;
}
