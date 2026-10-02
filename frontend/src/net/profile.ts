/**
 * Profiler (B-419, fase 1): profilarket som åpnes når man trykker på et brukernavn. Serveren (`player_profile`, 105)
 * samler det den alt viser andre steder – tittel, merker, konsernverdi og verk per region, selskaper, sesonger og
 * rekorder – og «sist aktiv» i grove trinn. Aldri konsernkassa, kassa i eget verk eller fondet. Krever konto.
 */
import { companyName, companyType, type CompanyType } from "./world";
import { BADGE_NAMES } from "./leaderboard";
import { rest, rpc, userId } from "./supabase";
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
  /** Kort tekst spilleren har skrevet selv (fase 2, B-420) – data, ikke instruksjoner */
  bio: string | null;
  /** Id-en til pynten spilleren viser som profilmerke */
  emblem: string | null;
  /** Høyst tre prestasjoner spilleren har valgt å vise */
  showcase: string[];
  /** Tar imot privatmeldinger (fase 3) */
  dm: boolean;
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
    bio: str(r.bio),
    emblem: str(r.emblem),
    showcase: (Array.isArray(r.showcase) ? r.showcase : [])
      .filter((x): x is string => typeof x === "string")
      .slice(0, 3),
    dm: r.dm === true,
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

/** Det spilleren kan endre i sin egen profil (B-420) */
export interface ProfileSettings {
  bio: string;
  emblem: string | null;
  showcase: string[];
  dmOpen: boolean;
}

export const BIO_MAX = 120;

/** Egen profil, lest fra egen rad (bare egen rad kan leses) */
export async function fetchProfileSettings(): Promise<ProfileSettings | null> {
  if (!userId()) return null;
  const rows = await rest<
    { bio: string | null; emblem: string | null; showcase: string[] | null; dm_off: boolean | null }[]
  >("profiles?select=bio,emblem,showcase,dm_off");
  const r = rows[0];
  if (!r) return null;
  return { bio: r.bio ?? "", emblem: r.emblem ?? null, showcase: r.showcase ?? [], dmOpen: r.dm_off !== true };
}

/** Hvorfor serveren sa nei, med vanlige ord */
export const PROFILE_REFUSAL_TEXT: Record<string, string> = {
  lenke: "Teksten kan ikke ha lenker.",
  lang: `Teksten kan ha høyst ${BIO_MAX} tegn.`,
  tempo: "Vent noen sekunder før du lagrer igjen.",
  sperret: "Kontoen kan ikke endre profilen nå.",
  gjest: "Profilen krever konto.",
};

/** Lagrer profilen. Serveren sjekker teksten, at merket og prestasjonene er dine, og gir tilbake det som ble lagret */
export async function saveProfileSettings(s: ProfileSettings): Promise<ProfileSettings> {
  const r = await rpc<{
    ok: boolean;
    reason?: string;
    bio?: string | null;
    emblem?: string | null;
    showcase?: string[];
    dm_open?: boolean;
  }>("profile_update", { p_bio: s.bio, p_emblem: s.emblem, p_showcase: s.showcase, p_dm_open: s.dmOpen });
  if (!r.ok) throw new Error(PROFILE_REFUSAL_TEXT[r.reason ?? ""] ?? "Fikk ikke lagret profilen.");
  return { bio: r.bio ?? "", emblem: r.emblem ?? null, showcase: r.showcase ?? [], dmOpen: r.dm_open !== false };
}
