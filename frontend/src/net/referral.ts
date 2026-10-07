/**
 * Verv en venn (B-459, supabase/131_verv_en_venn.sql). Lenken `…/Simulator/?verv=KODE` huskes på enheten til vennen
 * har laget konto; da kobles kontoen til koden på serveren (`referral_register`), og vennen får en startpakke i eget
 * spill. Den som vervet, får belønningen i konsernkassa først når vennen har spilt nok – det avgjør serveren.
 */
import { rpc, userId } from "./supabase";

const KEY = "stalverk-verv-v1";
/** Like lenge som serveren godtar en ny konto (`max_age_days`) */
const KEEP_MS = 14 * 24 * 3600_000;
const CODE_RE = /^[A-Z0-9]{4,12}$/;

/** Startpakken vennen får i eget spill (spilltid, B-323) */
export const REFERRAL_START = { cash: 50_000, fp: 25 } as const;

/** Leser `?verv=` fra adressen, husker koden og tar den bort fra adresselinja (kalles én gang ved oppstart) */
export function captureReferral(): void {
  try {
    const url = new URL(location.href);
    const raw = url.searchParams.get("verv");
    if (raw === null) return;
    const code = raw.trim().toUpperCase();
    if (CODE_RE.test(code)) localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
    url.searchParams.delete("verv");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
  } catch {
    // Privat modus eller en adresse som ikke kan leses: lenken virker som en vanlig lenke
  }
}

/** Koden fra en vervelenke som venter på at kontoen blir laget, eller null */
export function pendingReferral(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as { code?: unknown; at?: unknown } | null;
    if (!v || typeof v.code !== "string" || !CODE_RE.test(v.code)) return null;
    if (typeof v.at !== "number" || Date.now() - v.at > KEEP_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return v.code;
  } catch {
    return null;
  }
}

export function clearReferral(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ingenting å gjøre
  }
}

export type ReferralRefusal = "gjest" | "ukjent" | "egen" | "brukt" | "gammel" | "fullt";

export async function registerReferral(code: string): Promise<{ ok: true } | { ok: false; reason: ReferralRefusal }> {
  return rpc("referral_register", { p_code: code });
}

export interface ReferralFriend {
  nick: string | null;
  days: number;
  stage: number;
  rewarded: boolean;
}

export interface ReferralStatus {
  /** Kontoen statusen gjelder (B-426) */
  uid: string;
  code: string | null;
  cap: number;
  /** Plassene som er brukt – også av belønnede venner som har slettet kontoen (B-473) */
  used: number;
  reward: number;
  minDays: number;
  minStage: number;
  /** Belønninger serveren betalte i dette kallet */
  paidNow: number;
  friends: ReferralFriend[];
}

interface StatusRow {
  code: string | null;
  cap?: number | string;
  used?: number | string;
  reward?: number | string;
  min_days?: number | string;
  min_stage?: number | string;
  paid_now?: number | string;
  friends?: { nick: string | null; days: number | string; stage: number | string; rewarded: boolean }[];
}

/** Min kode og vennene mine. Serveren betaler belønningene som er klare, i samme kall */
export async function fetchReferral(): Promise<ReferralStatus | null> {
  const uid = userId();
  if (!uid) return null;
  const r = await rpc<StatusRow>("referral_my_code", {});
  return {
    uid,
    code: r.code ?? null,
    cap: Number(r.cap) || 5,
    // Eldre server uten `used`: vennene i lista
    used: r.used == null ? (r.friends ?? []).length : Number(r.used) || 0,
    reward: Number(r.reward) || 0,
    minDays: Number(r.min_days) || 3,
    minStage: Number(r.min_stage) || 2,
    paidNow: Number(r.paid_now) || 0,
    friends: (r.friends ?? []).map((f) => ({
      nick: f.nick ?? null,
      days: Number(f.days) || 0,
      stage: Number(f.stage) || 0,
      rewarded: !!f.rewarded,
    })),
  };
}

let current: ReferralStatus | null = null;
const listeners = new Set<() => void>();

export function referralStatus(): ReferralStatus | null {
  return current && current.uid === userId() ? current : null;
}
export function setReferral(s: ReferralStatus | null): void {
  current = s;
  for (const fn of listeners) fn();
}
export function onReferralChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Vervekoden til kontoen som er innlogget, når den er hentet – til lenken på delingsknappen */
export function referralCode(): string | null {
  return referralStatus()?.code ?? null;
}
