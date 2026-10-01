/**
 * Ukens utfordring (B-152, supabase/016 og 023): én toppliste per uke for alle (B-172), regnet ut på serveren fra
 * tidslinja. Topp 3 får medalje og ukekiste med fagpoeng når uka er over (B-155). Krever konto for å være med;
 * lista kan leses uten.
 */
import { rpc, userId } from "./supabase";

export type WeekKind = "vekst" | "tonn" | "dager" | "kontroll";
export type League = "bronse" | "solv" | "gull";

// Én liste for alle, målt i prosent, så små og store verk kan konkurrere (B-172)
export const WEEK_KINDS: Record<WeekKind, { title: string; how: string }> = {
  // Tatt bort fra uka 5.10.2026 (B-384): verdien i eget verk vokser med spillfarten. Står for resultatene fra før
  vekst: {
    title: "Størst vekst i konsernverdi",
    how: "Få konsernverdien til å vokse mest mulig i prosent denne uka (regnet fra minst 50 mill.). Du er med når spillet har vært lagret på nett minst to dager før uka.",
  },
  tonn: {
    title: "Mer stål enn før",
    how: "Lag mer stål per spilldøgn enn du gjorde uka før – tallet er farten denne uka i prosent av farten da. Du er med når spillet har vært lagret på nett minst to dager før uka.",
  },
  // Ukens kontrollrom (B-387): tre tellende forsøk med samme charger for alle, beste teller
  kontroll: {
    title: "Ukens kontrollrom",
    how: "Tre tellende charger i kontrollrommet – de samme for alle, i samme rekkefølge. Den beste teller. Et forsøk er brukt når du starter det. Du kan øve så mye du vil på ukens kvalitet uten at det teller.",
  },
  // Ekte dager, ikke spilldøgn (B-190): farten i spillet skal ikke avgjøre en konkurranse mellom spillere
  dager: {
    title: "Flest aktive dager",
    how: "Spill litt hver dag: flest dager denne uka med spillet ditt lagret på nett. Farten i spillet teller ikke. Likt antall dager gir delt plass.",
  },
};

/** Fagpoeng i ukekista etter plass (samme som i finish_weeks på serveren) */
export function chestFp(plass: number): number {
  // Bare topp 3 får kiste så lenge det er få spillere (B-155)
  return plass === 1 ? 100 : plass === 2 ? 75 : plass === 3 ? 50 : 0;
}

export interface WeeklyStatus {
  weekStart: string;
  endsAt: string;
  kind: WeekKind;
  league: League;
  plass: number | null;
  value: number | null;
  players: number;
  /** Kister som venter: fagpoeng til sammen, antall og beste plass */
  chest: { fp: number; count: number; best: number } | null;
  medals: { gold: number; silver: number; bronze: number };
  /** Ukens kontrollrom (B-387), bare i kontrollromsukene */
  control: WeeklyControl | null;
}

/** Forsøkene i ukens kontrollrom slik serveren ser dem */
export interface WeeklyControl {
  grade: string;
  attempts: number;
  used: number;
  best: number | null;
  /** Et startet forsøk som ikke er levert (fristen er ikke ute) */
  open: { id: number; attempt: number; deadline: string } | null;
}

interface StatusRow {
  week_start: string;
  ends_at: string;
  kind: string;
  league: string;
  plass: number | null;
  value: string | number | null;
  players: number;
  chest: { fp: number; count: number; best: number } | null;
  gold: number;
  silver: number;
  bronze: number;
  control?: {
    grade: string;
    attempts: number;
    used: number;
    best: number | null;
    open: { id: number; attempt: number; deadline: string } | null;
  } | null;
}

function asKind(k: string): WeekKind {
  return k === "tonn" || k === "dager" || k === "kontroll" ? k : "vekst";
}
function asLeague(l: string): League {
  return l === "solv" || l === "gull" ? l : "bronse";
}

export async function fetchWeeklyStatus(): Promise<WeeklyStatus | null> {
  if (!userId()) return null;
  const r = await rpc<StatusRow>("weekly_status", {});
  return {
    weekStart: r.week_start,
    endsAt: r.ends_at,
    kind: asKind(r.kind),
    league: asLeague(r.league),
    plass: r.plass ?? null,
    value: r.value === null || r.value === undefined ? null : Number(r.value),
    players: Number(r.players) || 0,
    chest: r.chest ? { fp: Number(r.chest.fp), count: Number(r.chest.count), best: Number(r.chest.best) } : null,
    medals: { gold: Number(r.gold) || 0, silver: Number(r.silver) || 0, bronze: Number(r.bronze) || 0 },
    control: r.control
      ? {
          grade: String(r.control.grade),
          attempts: Number(r.control.attempts) || 3,
          used: Number(r.control.used) || 0,
          best: r.control.best === null || r.control.best === undefined ? null : Number(r.control.best),
          open: r.control.open
            ? {
                id: Number(r.control.open.id),
                attempt: Number(r.control.open.attempt),
                deadline: r.control.open.deadline,
              }
            : null,
        }
      : null,
  };
}

// ------------------------------------------------------------------------------------------------------------------
// Ukens kontrollrom (B-387, `094_ukens_kontrollrom.sql`)
// ------------------------------------------------------------------------------------------------------------------

export type ControlRefusal = "konto" | "sperret" | "uke" | "apen" | "brukt" | "nett" | "sent_i_uka";
export type SubmitRefusal = "ukjent" | "avbrutt" | "fort" | "sent" | "ugyldig" | "uke_slutt";

export const CONTROL_REFUSAL_TEXT: Record<ControlRefusal | SubmitRefusal, string> = {
  konto: "Ukens utfordring krever konto.",
  sperret: "Kontoen er sperret mens topplista sjekker den.",
  uke: "Denne uka er det en annen utfordring.",
  apen: "Du har et forsøk som ikke er levert. Lever det eller gi det opp først.",
  brukt: "Du har brukt alle forsøkene denne uka.",
  nett: "Fikk ikke kontakt med serveren. Forsøket er ikke startet.",
  sent_i_uka: "Uka er nesten over: det er ikke tid til et helt forsøk før lista låses ved midnatt.",
  ukjent: "Forsøket finnes ikke.",
  avbrutt: "Forsøket ble gitt opp.",
  fort: "Forsøket ble levert for fort.",
  sent: "Fristen for forsøket gikk ut (15 minutter).",
  ugyldig: "Resultatet kunne ikke godtas.",
  uke_slutt: "Uka var over før forsøket ble levert, og lista for uka er låst. Forsøket teller ikke.",
};

export interface ControlAttempt {
  id: number;
  attempt: number;
  seed: number;
  grade: string;
  left: number;
  deadline: string;
}

/** Starter et tellende forsøk. Forsøket er brukt fra nå av (også hvis appen lukkes). */
export async function startControlAttempt(): Promise<
  { ok: true; attempt: ControlAttempt } | { ok: false; reason: ControlRefusal; openId?: number }
> {
  try {
    const r = await rpc<Record<string, unknown>>("weekly_control_start", {});
    if (!r?.ok) {
      const reason = (typeof r?.reason === "string" ? r.reason : "nett") as ControlRefusal;
      return { ok: false, reason, openId: r?.attempt_id === undefined ? undefined : Number(r.attempt_id) };
    }
    return {
      ok: true,
      attempt: {
        id: Number(r.attempt_id),
        attempt: Number(r.attempt),
        seed: Number(r.seed),
        grade: String(r.grade),
        left: Number(r.left),
        deadline: String(r.deadline),
      },
    };
  } catch {
    return { ok: false, reason: "nett" };
  }
}

/** Et resultat som skal leveres (lagres i nettleseren til serveren har svart, B-387) */
export interface PendingControl {
  user: string;
  id: number;
  points: number;
  stars: number;
  log: unknown;
  deadline: string;
}

const PENDING_KEY = "stalverk-ukekontroll-v1";
/**
 * Kopi i minnet: virker lagringen i nettleseren ikke (full eller sperret), leveres resultatet likevel (B-397). Er den
 * satt i denne økta, er den alltid den nyeste og går foran det som ligger i nettleseren – ellers kunne et gammelt
 * resultat fra en annen konto skygge for et nytt som ikke ble lagret (B-399). `undefined` = ikke satt i denne økta.
 */
let memPending: PendingControl | null | undefined = undefined;
/** Om resultatet som venter, også ligger i nettleseren (overlever at appen lukkes) */
let durable = true;

function readPending(): PendingControl | null {
  if (memPending !== undefined) return memPending;
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    const p = raw ? (JSON.parse(raw) as PendingControl) : null;
    if (p && typeof p.id === "number") return p;
  } catch {
    // Ingenting å lese
  }
  return null;
}

/** Glemmer kopien i minnet, som når appen startes på nytt (tester) */
export function forgetPendingMemory(): void {
  memPending = undefined;
}

/** Fristen for å levere er ute (med et minutts slingring for klokka) */
function expired(p: PendingControl, now: number): boolean {
  return Date.parse(p.deadline) + 60_000 < now;
}

/**
 * Resultatet som venter på å bli levert, for denne kontoen (`user`). Et resultat fra en annen konto på samme enhet
 * sperrer ingenting, og et resultat der fristen er ute, ryddes bort (B-397).
 */
export function pendingControl(user?: string | null, now = Date.now()): PendingControl | null {
  const p = readPending();
  if (!p) return null;
  if (expired(p, now)) {
    setPending(null);
    return null;
  }
  if (user !== undefined && p.user !== user) return null;
  return p;
}

/** Om resultatet som venter, ligger trygt i nettleseren, eller bare i minnet mens appen er åpen */
export function pendingIsDurable(): boolean {
  return durable;
}

function setPending(p: PendingControl | null): void {
  memPending = p;
  try {
    if (p) localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else localStorage.removeItem(PENDING_KEY);
    durable = true;
  } catch {
    durable = p === null;
  }
}

export type SubmitOutcome =
  | { kind: "levert"; points: number; best: number; left: number }
  | { kind: "venter" }
  | { kind: "avvist"; reason: SubmitRefusal };

/**
 * Leverer et forsøk. Resultatet lagres først i nettleseren (og i minnet), så det ikke går tapt ved en nettfeil: da
 * prøves det igjen (`flushPendingControl`) til fristen er ute. Serveren godtar samme innlevering flere ganger.
 */
export async function submitControlAttempt(p: PendingControl): Promise<SubmitOutcome> {
  setPending(p);
  return flushPendingControl();
}

/** Prøver å levere et resultat som venter. «venter» betyr at det skal prøves igjen senere. */
export async function flushPendingControl(now = Date.now()): Promise<SubmitOutcome> {
  const raw = readPending();
  if (raw && expired(raw, now)) {
    setPending(null);
    return raw.user === userId() ? { kind: "avvist", reason: "sent" } : { kind: "venter" };
  }
  const p = pendingControl(userId(), now);
  if (!p) return { kind: "venter" };
  try {
    const r = await rpc<Record<string, unknown>>("weekly_control_submit", {
      p_attempt: p.id,
      p_points: Math.round(p.points),
      p_stars: Math.round(p.stars),
      p_log: p.log ?? null,
    });
    if (r?.ok) {
      setPending(null);
      return { kind: "levert", points: Number(r.points), best: Number(r.best), left: Number(r.left) };
    }
    setPending(null);
    return { kind: "avvist", reason: (typeof r?.reason === "string" ? r.reason : "ugyldig") as SubmitRefusal };
  } catch {
    // Nettfeil eller tjenesten er nede: resultatet blir liggende og prøves igjen
    return { kind: "venter" };
  }
}

/** Gir opp et startet forsøk (teller 0) */
export async function abandonControlAttempt(id: number): Promise<void> {
  if (readPending()?.id === id) setPending(null);
  await rpc("weekly_control_abandon", { p_attempt: id });
}

export interface WeeklyRow {
  plass: number;
  nickname: string;
  value: number;
  isMe: boolean;
  /** Antall uker spilleren har vunnet */
  gold: number;
}

export async function fetchWeeklyBoard(league: League | null): Promise<WeeklyRow[]> {
  const rows = await rpc<{ plass: number; nickname: string; value: string | number; is_me: boolean; gold: number }[]>(
    "weekly_board",
    { p_league: league, lim: 20 },
  );
  return (rows ?? []).map((r) => ({
    plass: r.plass,
    nickname: r.nickname,
    value: Number(r.value),
    isMe: !!r.is_me,
    gold: Number(r.gold) || 0,
  }));
}

/** Åpner alle kister som venter. Gir fagpoengene (0 hvis de alt er hentet, f.eks. på en annen enhet). */
export async function claimWeekChest(): Promise<number> {
  return Number(await rpc<number>("claim_week_chest", {})) || 0;
}

/** Dager igjen av uka, rundet opp */
export function weekDaysLeft(s: WeeklyStatus, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(s.endsAt).getTime() - now) / 86_400_000));
}

// Siste status, så kortet og lista viser det samme
let status: WeeklyStatus | null = null;
const listeners = new Set<() => void>();
export function weeklyStatus(): WeeklyStatus | null {
  return status;
}
export function setWeeklyStatus(s: WeeklyStatus | null): void {
  status = s;
  for (const fn of listeners) fn();
}
export function onWeeklyChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
