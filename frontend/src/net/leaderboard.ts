/**
 * Topplista og kallenavnet (B-127). Serveren regner listene ut fra tidslinja (`snapshots`); appen sender aldri
 * inn poeng selv.
 */
import { rest, rpc, userId } from "./supabase";

export type BoardKind = "verdi" | "omdomme" | "storverk" | "ferdig";

export const BOARDS: { id: BoardKind; label: string; unit: "kr" | "rep" | "dager" }[] = [
  { id: "verdi", label: "Konsernverdi", unit: "kr" },
  { id: "storverk", label: "Raskest til storverk", unit: "dager" },
  { id: "ferdig", label: "Raskest til 10 mrd.", unit: "dager" },
  { id: "omdomme", label: "Omdømme", unit: "rep" },
];

export interface BoardRow {
  plass: number;
  nickname: string;
  value: number;
  day: number;
  is_me: boolean;
}

export interface Profile {
  nickname: string | null;
  flagged_at: string | null;
  flag_reason: string | null;
  banned: boolean;
}

export async function fetchLeaderboard(kind: BoardKind, lim = 50): Promise<BoardRow[]> {
  const rows = await rpc<{ plass: number; nickname: string; value: string | number; day: number; is_me: boolean }[]>(
    "leaderboard",
    { kind, lim },
  );
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

/** Min plass på lista, eller null hvis jeg ikke er med */
export async function fetchMyRank(kind: BoardKind): Promise<number | null> {
  if (!userId()) return null;
  const r = await rpc<number | null>("my_rank", { kind });
  return r ?? null;
}

export async function fetchProfile(): Promise<Profile | null> {
  if (!userId()) return null;
  const rows = await rest<Profile[]>("profiles?select=nickname,flagged_at,flag_reason,banned");
  return rows[0] ?? null;
}

/** Setter kallenavnet. Serveren sjekker lengde, tegn og at det er ledig; feil kommer som norsk melding. */
export async function setNickname(name: string): Promise<string> {
  return rpc<string>("set_nickname", { name });
}
