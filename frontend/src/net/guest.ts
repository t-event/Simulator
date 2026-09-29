/**
 * Gjestekonto (B-212). Spillere uten konto får en anonym konto i bakgrunnen, så spillet lagres på nett fra det andre
 * spilldøgnet. Gjesten får ikke gjøre noe mer (eierens beslutning): ingen toppliste, ingen daglig belønning, ingen
 * sesong. Serveren sperrer alt annet enn lagringen (`guest_gate` i supabase/035_gjestekonto.sql).
 *
 * Økta til gjesten ligger for seg selv, ikke som innlogging. Resten av appen ser derfor spilleren som «uten konto»
 * og viser hva man går glipp av. Logger spilleren inn eller oppretter konto, tar kontoen over gjesten
 * (`adoptGuest`, kalles fra linkOnLogin) og gjesten slettes. Spillet selv kobles til kontoen som før.
 *
 * Er anonyme kontoer slått av i Supabase, prøver appen igjen etter et døgn og gjør ellers ingenting.
 */
import type { GameState } from "../game/types";
import { APP_VERSION, cloudConfigured } from "./config";
import {
  getSession,
  isTransient,
  NetError,
  refreshSession,
  restAs,
  rpc,
  signInAnonymously,
  type Session,
} from "./supabase";

const GUEST_KEY = "stalverk-gjest-v1";
/** Når anonyme kontoer var slått av (ms), så appen ikke prøver ved hver lagring */
const OFF_KEY = "stalverk-gjest-av-v1";
const OFF_RETRY_MS = 24 * 3600_000;
/** Så ofte en gjest lagrer på nett */
export const GUEST_INTERVAL_MS = 60_000;
/** Gjesten lages først når spillet har kommet så langt (spilldøgn), så de som bare titter innom, ikke får konto */
export const GUEST_FROM_DAY = 2;

interface GuestState {
  session: Session;
  /** Versjonen av lagringen på nett (save_game, B-140) */
  rev: number;
}

let mem: GuestState | null = null;
let loaded = false;
let lastUpload = 0;
let inFlight: Promise<void> | null = null;
let clock: () => number = () => Date.now();

export function setGuestClock(fn: () => number): void {
  clock = fn;
}

function load(): GuestState | null {
  if (loaded) return mem;
  loaded = true;
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    mem = raw ? (JSON.parse(raw) as GuestState) : null;
  } catch {
    mem = null;
  }
  return mem;
}

function store(s: GuestState | null): void {
  mem = s;
  loaded = true;
  try {
    if (s) localStorage.setItem(GUEST_KEY, JSON.stringify(s));
    else localStorage.removeItem(GUEST_KEY);
  } catch {
    // Privat modus: gjesten lever bare til siden lukkes
  }
}

/** Glemmer gjesten her (kontoen på serveren blir liggende til den ryddes) */
export function forgetGuest(): void {
  store(null);
  lastUpload = 0;
}

/** Spiller man som gjest? (ikke logget inn, men med gjestekonto) */
export function isGuest(): boolean {
  return !getSession() && !!load();
}

function offRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(OFF_KEY) ?? 0);
    return at > 0 && clock() - at < OFF_RETRY_MS;
  } catch {
    return false;
  }
}

function markOff(): void {
  try {
    localStorage.setItem(OFF_KEY, String(clock()));
  } catch {
    // Privat modus
  }
}

/** Gyldig nøkkel for gjesten, fornyet om nødvendig. Null hvis gjesten er borte. */
async function guestToken(): Promise<string | null> {
  const s = load();
  if (!s) return null;
  if (s.session.expires_at - clock() / 1000 > 60) return s.session.access_token;
  try {
    const next = await refreshSession(s.session.refresh_token);
    store({ ...s, session: next });
    return next.access_token;
  } catch (e) {
    // Uten nett prøver vi igjen senere. Sier tjenesten nei, er gjesten død: en ny lages ved neste lagring
    if (e instanceof NetError && !e.offline && e.status >= 400 && e.status < 500 && e.status !== 429) forgetGuest();
    return null;
  }
}

/** Lager gjesten hvis den mangler. Gir true hvis det finnes en gjest etterpå. */
async function ensureGuest(): Promise<boolean> {
  if (load()) return true;
  if (offRecently()) return false;
  try {
    const session = await signInAnonymously();
    // Logget spilleren inn mens vi ventet, trengs ingen gjest
    if (getSession()) return false;
    store({ session, rev: 0 });
    return true;
  } catch (e) {
    // Anonyme kontoer er slått av (eller for mange forsøk): prøv igjen om et døgn
    if (e instanceof NetError && !e.offline) markOff();
    return false;
  }
}

/** Skal dette spillet lagres som gjest? Et spill som alt tilhører en konto, blir aldri gjest. */
function wantsGuest(g: GameState): boolean {
  return cloudConfigured() && !getSession() && !g.owner && Math.floor(g.minute / 1440) >= GUEST_FROM_DAY;
}

/** Kalles etter hver lokale lagring når ingen er logget inn (sync.ts). Laster opp høyst én gang i minuttet. */
export function onGuestSave(g: GameState, force = false): Promise<void> {
  if (!wantsGuest(g) || inFlight) return inFlight ?? Promise.resolve();
  if (!force && clock() - lastUpload < GUEST_INTERVAL_MS) return Promise.resolve();
  lastUpload = clock();
  inFlight = (async () => {
    try {
      if (!(await ensureGuest())) return;
      await upload(g);
    } catch {
      // Gjestelagringen er en ekstra: feil her skal aldri merkes i spillet
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

async function upload(g: GameState): Promise<void> {
  const token = await guestToken();
  const s = load();
  if (!token || !s || getSession()) return;
  const body = {
    p_state: g,
    p_minute: Math.floor(g.minute),
    p_day: Math.floor(g.minute / 1440),
    p_client_version: APP_VERSION,
    p_season_id: null,
    p_device: "gjest",
    p_base_rev: s.rev,
  };
  let rev = await restAs<number | null>(token, "rpc/save_game", { method: "POST", body });
  if (rev === null || rev === undefined) {
    // Versjonen her var gammel (f.eks. etter en feil): bygg videre på den som ligger der. Bare én fane spiller (B-176)
    const rows = await restAs<{ rev: number }[]>(token, "saves?select=rev", {});
    const cur = Number(rows[0]?.rev ?? 0);
    rev = await restAs<number | null>(token, "rpc/save_game", { method: "POST", body: { ...body, p_base_rev: cur } });
  }
  if (rev !== null && rev !== undefined) store({ ...s, rev: Number(rev) });
}

/**
 * Kontoen tar over gjesten (kalles med én gang etter innlogging, før spillet kobles til kontoen). Gjesten slettes på
 * serveren og glemmes her. Feil stopper aldri innloggingen.
 */
export async function adoptGuest(): Promise<void> {
  if (!load() || !getSession()) return;
  if (inFlight) await inFlight.catch(() => {});
  try {
    const token = await guestToken();
    if (!token) {
      forgetGuest();
      return;
    }
    const code = await restAs<string>(token, "rpc/guest_handover", { method: "POST", body: {} });
    await rpc("adopt_guest", { p_code: code });
    forgetGuest();
  } catch (e) {
    // Uten nett eller med tjenesten nede prøves det igjen ved neste kobling (B-356); ellers er gjesten ikke til å redde
    if (!isTransient(e)) forgetGuest();
  }
}
