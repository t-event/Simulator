/**
 * Merker fra serveren (B-296): ting bare serveren vet om, f.eks. at spilleren ble berørt av økonomireformen.
 * Tom liste uten innlogging.
 */
import { rpc, userId } from "./supabase";

export async function fetchBadges(): Promise<string[]> {
  if (!userId()) return [];
  const r = await rpc<string[] | null>("my_badges", {});
  return Array.isArray(r) ? r.filter((x): x is string => typeof x === "string") : [];
}
