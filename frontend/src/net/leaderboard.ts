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
  /** bronse, solv eller gull (B-129) */
  league: string;
}

export const LEAGUE_NAMES: Record<string, string> = { bronse: "Bronse", solv: "Sølv", gull: "Gull" };

export interface Profile {
  nickname: string | null;
  flagged_at: string | null;
  flag_reason: string | null;
  banned: boolean;
}

/** `season` = sesongens id, eller null for «alle tider» */
export async function fetchLeaderboard(kind: BoardKind, season: number | null = null, lim = 50): Promise<BoardRow[]> {
  const rows = await rpc<
    { plass: number; nickname: string; value: string | number; day: number; is_me: boolean; league: string | null }[]
  >("leaderboard", { kind, lim, season });
  return rows.map((r) => ({ ...r, value: Number(r.value), league: r.league ?? "bronse" }));
}

/** Min plass på lista, eller null hvis jeg ikke er med */
export async function fetchMyRank(kind: BoardKind, season: number | null = null): Promise<number | null> {
  if (!userId()) return null;
  const r = await rpc<number | null>("my_rank", { kind, season });
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
