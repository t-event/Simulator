/**
 * Vennelista (B-462, supabase/132_venneliste.sql): spillere man følger, enveis – den andre får ingen beskjed. Lista viser
 * bare det profilene alt viser andre (nivå, tittel, sist aktiv i grove trinn). Krever konto.
 */
import type { Seen } from "./profile";
import { rpc, userId } from "./supabase";

export interface Friend {
  nick: string;
  stage: number;
  title: string | null;
  seen: Seen | null;
}

export type FriendRefusal = "gjest" | "ukjent" | "egen" | "fullt";

/** Forklaring med vanlige ord */
export const FRIEND_REFUSAL_TEXT: Record<FriendRefusal, string> = {
  gjest: "Vennelista krever konto.",
  ukjent: "Fant ingen spiller med det brukernavnet.",
  egen: "Det er deg.",
  fullt: "Vennelista er full (100 spillere). Ta noen av lista først.",
};

const SEEN = new Set(["idag", "igar", "uke", "maned", "lenge"]);

interface FriendRow {
  nick?: string | null;
  stage?: number | string | null;
  title?: string | null;
  seen?: string | null;
}

export function parseFriends(rows: unknown): Friend[] {
  if (!Array.isArray(rows)) return [];
  return (rows as FriendRow[])
    .filter((r) => r && typeof r.nick === "string" && r.nick.length > 0)
    .map((r) => ({
      nick: r.nick as string,
      stage: Number(r.stage) || 0,
      title: typeof r.title === "string" ? r.title : null,
      seen: r.seen && SEEN.has(r.seen) ? (r.seen as Seen) : null,
    }));
}

export async function fetchFriends(): Promise<Friend[]> {
  return parseFriends(await rpc<unknown>("follow_list", {}));
}

export async function addFriend(nick: string): Promise<{ ok: true } | { ok: false; reason: FriendRefusal }> {
  return rpc("follow_add", { p_nick: nick.trim() });
}

export async function removeFriend(nick: string): Promise<void> {
  await rpc("follow_remove", { p_nick: nick });
}

// Lista i minnet, for kontoen den gjelder (B-426): profilarket viser «På vennelista» uten et eget kall
let current: { uid: string; list: Friend[] } | null = null;
const listeners = new Set<() => void>();

export function friendsList(): Friend[] | null {
  return current && current.uid === userId() ? current.list : null;
}
export function setFriends(uid: string, list: Friend[]): void {
  current = { uid, list };
  for (const fn of listeners) fn();
}
export function onFriendsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Henter lista på nytt for kontoen som er innlogget */
export async function reloadFriends(): Promise<void> {
  const uid = userId();
  if (!uid) return;
  const list = await fetchFriends();
  if (userId() === uid) setFriends(uid, list);
}

export function isFriend(nick: string): boolean {
  const l = friendsList();
  return !!l && l.some((f) => f.nick.toLowerCase() === nick.toLowerCase());
}
