/**
 * Skiftrapporten (B-338): én felles chat for alle spillere med konto. Meldingene ligger på serveren
 * (`supabase/070_skiftrapporten.sql`); grensene (lengde, tempo, lenker) sjekkes der. Appen henter nye meldinger mens
 * arket er åpent, og ser av og til etter om noe nytt har kommet (prikken på knappen).
 */
import { rpc, userId } from "./supabase";

export interface ChatMessage {
  id: number;
  nick: string;
  mine: boolean;
  /** Hendelse fra spillet (anbud, overtakelse, ny tittel), skrevet av serveren (B-339) */
  event: boolean;
  body: string;
  /** Tidspunkt i ms (servertid) */
  at: number;
}

/** Lengste melding, samme som på serveren */
export const CHAT_MAX = 300;

export type ChatRefusal = "konto" | "sperret" | "navn" | "tom" | "lang" | "lenke" | "fort" | "likt" | "nett";

export const CHAT_REFUSAL_TEXT: Record<ChatRefusal, string> = {
  konto: "Skiftrapporten krever konto.",
  sperret: "Kontoen er sperret mens topplista sjekker den. Du kan lese, men ikke skrive.",
  navn: "Velg et brukernavn først, så de andre ser hvem som skriver.",
  tom: "Skriv noe først.",
  lang: `Meldingen er for lang – høyst ${CHAT_MAX} tegn.`,
  lenke: "Lenker er ikke lov i Skiftrapporten.",
  fort: "Litt roligere – vent noen sekunder før neste melding.",
  likt: "Du sendte akkurat den samme meldingen.",
  nett: "Fikk ikke kontakt med serveren. Prøv igjen om litt.",
};

type Row = Record<string, unknown>;

function parseMessage(r: Row): ChatMessage | null {
  const id = Number(r.id);
  const body = typeof r.body === "string" ? r.body : "";
  if (!Number.isFinite(id) || !body) return null;
  return {
    id,
    nick: typeof r.nick === "string" ? r.nick : "?",
    mine: r.mine === true,
    event: r.event === true,
    body,
    at: Number(r.at) || 0,
  };
}

/** Meldingene nyere enn `after` (0 = de siste), eldst først */
export async function fetchChat(after = 0): Promise<ChatMessage[]> {
  const rows = await rpc<Row[] | null>("chat_list", { p_after: after, p_limit: 60 });
  return (rows ?? []).map(parseMessage).filter((m): m is ChatMessage => m !== null);
}

/** Id-en til den nyeste meldingen, eller 0 */
export async function fetchChatLatest(): Promise<number> {
  const r = await rpc<number | string | null>("chat_latest", {});
  return Number(r) || 0;
}

export async function sendChat(body: string): Promise<{ ok: true; id: number } | { ok: false; reason: ChatRefusal }> {
  let r: Row | null;
  try {
    r = await rpc<Row>("chat_send", { p_body: body });
  } catch {
    return { ok: false, reason: "nett" };
  }
  if (r?.ok !== true) {
    const reason = r?.reason as ChatRefusal;
    return { ok: false, reason: reason in CHAT_REFUSAL_TEXT ? reason : "nett" };
  }
  return { ok: true, id: Number(r.id) || 0 };
}

export async function deleteChat(id: number): Promise<boolean> {
  try {
    const r = await rpc<Row>("chat_delete", { p_id: id });
    return r?.ok === true;
  } catch {
    return false;
  }
}

/** Legg nye meldinger til de gamle: uten dubletter, i rekkefølge, høyst `keep` */
export function mergeChat(old: ChatMessage[], fresh: ChatMessage[], keep = 200): ChatMessage[] {
  const byId = new Map(old.map((m) => [m.id, m]));
  for (const m of fresh) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id).slice(-keep);
}

/** Sist leste melding på denne enheten, per konto (en bekvemmelighet – ikke viktig om den blir borte) */
const SEEN_KEY = "stalverk-skiftrapport-sett";

export function chatSeen(): number {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, number>;
    return Number(all[userId() ?? ""]) || 0;
  } catch {
    return 0;
  }
}

export function markChatSeen(id: number): void {
  const uid = userId();
  if (!uid || id <= chatSeen()) return;
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}") as Record<string, number>;
    all[uid] = id;
    localStorage.setItem(SEEN_KEY, JSON.stringify(all));
  } catch {
    // Privat modus: prikken kommer igjen neste gang
  }
}
