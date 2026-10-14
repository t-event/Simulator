/**
 * Filteret «Venner» på topplista og ukelista (B-493): samme liste fra serveren, bare radene til dem du følger og deg
 * selv. Plassen er plassen på hele lista. Krever konto (vennelista gjør det, B-462).
 */
import { useEffect, useSyncExternalStore } from "react";
import { friendsList, onFriendsChange, reloadFriends, type Friend } from "../net/friends";
import { getSession, onSessionChange } from "../net/supabase";

export type FriendScope = "alle" | "venner";

/** Hele lista hentes når filteret står på Venner, så venner langt ned også kommer med (my_rank gjør det samme) */
export const FRIENDS_LIMIT = 100000;

/** Vennelista for kontoen som er innlogget; hentes én gang hvis den ikke er i minnet */
export function useFriendList(): Friend[] | null {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const list = useSyncExternalStore(onFriendsChange, friendsList, friendsList);
  const uid = session?.user.id ?? null;
  useEffect(() => {
    if (uid && friendsList() === null) void reloadFriends().catch(() => {});
  }, [uid]);
  return uid ? list : null;
}

/** Bare vennene og deg selv, i samme rekkefølge */
export function friendRows<T>(rows: T[], friends: Friend[], nick: (r: T) => string, isMe: (r: T) => boolean): T[] {
  const names = new Set(friends.map((f) => f.nick.toLowerCase()));
  return rows.filter((r) => isMe(r) || names.has(nick(r).toLowerCase()));
}
