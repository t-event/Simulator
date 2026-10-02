/**
 * Profiler (B-419, fase 1): profilarket som åpnes når man trykker på et brukernavn. Serveren (`player_profile`, 105)
 * samler det den alt viser andre steder – tittel, merker, konsernverdi og verk per region, selskaper, sesonger og
 * rekorder – og «sist aktiv» i grove trinn. Aldri konsernkassa, kassa i eget verk eller fondet. Krever konto.
 */
import { companyName, companyType, type CompanyType } from "./world";
import { BADGE_NAMES } from "./leaderboard";
import { rpc } from "./supabase";
import { isRegion } from "../game/regions";
import type { RegionId, SisterType } from "../game/types";

/** Sist aktiv, i grove trinn (ekte dager i norsk tid) – aldri klokkeslett */
export type Seen = "idag" | "igar" | "uke" | "maned" | "lenge";

export interface ProfilePlant {
  name: string;
  type: SisterType;
  region: RegionId | null;
  level: number;
  building: boolean;
}

export interface PlayerProfile {
  nick: string;
  me: boolean;
  /** Dagen kontoen fikk brukernavn (ÅÅÅÅ-MM-DD), eller null */
  since: string | null;
  seen: Seen | null;
  stage: number;
  title: string | null;
  league: string;
  badges: string[];
  /** Bare for dem som står på lista «Konsernverdi» */
  konsern: { rank: number; value: number; plants: ProfilePlant[] } | null;
  companies: { name: string; type: CompanyType; region: RegionId | null }[];
  seasons: { name: string; plass: number }[];
  records: { storverkDay: number | null; ferdigDay: number | null; control: number | null };
}

const SEEN: Seen[] = ["idag", "igar", "uke", "maned", "lenge"];
const SISTER: SisterType[] = ["stalverk", "storverk", "kompleks"];

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const list = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];

/** Svaret fra serveren, tålt for manglende og ukjente felt. null = ingen profil (finnes ikke, sperret eller flagget) */
export function parseProfile(raw: unknown): PlayerProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const nick = str(r.nick);
  if (!nick) return null;
  const k = r.konsern && typeof r.konsern === "object" ? (r.konsern as Record<string, unknown>) : null;
  const rec = r.records && typeof r.records === "object" ? (r.records as Record<string, unknown>) : {};
  return {
    nick,
    me: r.me === true,
    since: str(r.since),
    seen: SEEN.includes(r.seen as Seen) ? (r.seen as Seen) : null,
    stage: num(r.stage) ?? 0,
    title: str(r.title),
    league: str(r.league) ?? "bronse",
    badges: (Array.isArray(r.badges) ? r.badges : []).filter(
      (b): b is string => typeof b === "string" && b in BADGE_NAMES,
    ),
    konsern:
      k && num(k.value) !== null
        ? {
            rank: num(k.rank) ?? 0,
            value: num(k.value) ?? 0,
            plants: list(k.plants).map((p) => ({
              name: str(p.name) ?? "Verk",
              type: SISTER.includes(p.type as SisterType) ? (p.type as SisterType) : "stalverk",
              region: isRegion(p.region) ? p.region : null,
              level: num(p.level) ?? 0,
              building: p.building === true,
            })),
          }
        : null,
    companies: list(r.companies).map((c) => ({
      name: str(c.name) ?? companyName(companyType(c.type)),
      type: companyType(c.type),
      region: isRegion(c.region) ? c.region : null,
    })),
    seasons: list(r.seasons)
      .map((s) => ({ name: str(s.name) ?? "Sesong", plass: num(s.plass) ?? 0 }))
      .filter((s) => s.plass > 0),
    records: { storverkDay: num(rec.storverkDay), ferdigDay: num(rec.ferdigDay), control: num(rec.control) },
  };
}

export async function fetchPlayerProfile(nick: string): Promise<PlayerProfile | null> {
  return parseProfile(await rpc<unknown>("player_profile", { p_nick: nick }));
}

/** «i dag», «i går» … – brukt som «Sist aktiv i dag» */
export function seenText(s: Seen | null): string | null {
  switch (s) {
    case "idag":
      return "i dag";
    case "igar":
      return "i går";
    case "uke":
      return "denne uka";
    case "maned":
      return "denne måneden";
    case "lenge":
      return "for over en måned siden";
    default:
      return null;
  }
}

/** «sep. 2026» fra ÅÅÅÅ-MM-DD */
export function sinceText(since: string | null): string | null {
  const m = since?.match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const months = ["jan.", "feb.", "mars", "april", "mai", "juni", "juli", "aug.", "sep.", "okt.", "nov.", "des."];
  return `${months[Number(m[2]) - 1] ?? ""} ${m[1]}`;
}
