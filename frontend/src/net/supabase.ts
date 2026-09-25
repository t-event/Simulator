/**
 * En tynn klient mot Supabase (B-125): innlogging (GoTrue) og databasen (PostgREST) rett over fetch, uten
 * bibliotek. Økta ligger i localStorage og fornyes av seg selv. Alle feil kommer tilbake som norske meldinger.
 *
 * `fetch` kan byttes ut i tester (setFetch), så ingenting her trenger nett for å testes.
 */
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

export interface Session {
  access_token: string;
  refresh_token: string;
  /** Unix-sekunder */
  expires_at: number;
  user: { id: string; email: string };
}

const SESSION_KEY = "stalverk-konto-v1";
/** Fornyes når det er mindre enn dette igjen av økta */
const REFRESH_MARGIN_S = 60;

type Fetch = typeof fetch;
let fetchImpl: Fetch = (...args) => fetch(...args);
export function setFetch(f: Fetch): void {
  fetchImpl = f;
}

let session: Session | null = null;
let loaded = false;
const listeners = new Set<() => void>();

/** Abonner på endringer i innloggingen (logg inn, logg ut, fornyet økt) */
export function onSessionChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
function notify(): void {
  for (const fn of listeners) fn();
}

function persist(): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Privat modus: økta lever bare til siden lukkes
  }
}

export function getSession(): Session | null {
  if (!loaded) {
    loaded = true;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) session = JSON.parse(raw) as Session;
    } catch {
      session = null;
    }
  }
  return session;
}

export function setSession(s: Session | null): void {
  loaded = true;
  session = s;
  persist();
  notify();
}

/** Konto-id for den som er logget inn, eller null */
export function userId(): string | null {
  return getSession()?.user.id ?? null;
}

export class NetError extends Error {
  status: number;
  /** true når det er nettet som mangler, ikke tjenesten som sa nei */
  offline: boolean;
  constructor(message: string, status: number, offline = false) {
    super(message);
    this.status = status;
    this.offline = offline;
  }
}

/** Oversetter feilmeldingene fra tjenesten til noe spilleren forstår */
export function translateError(status: number, raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes("already registered") || t.includes("already been registered") || t.includes("already exists"))
    return "Det finnes alt en konto med denne e-posten. Logg inn i stedet.";
  if (t.includes("invalid login credentials") || t.includes("invalid_credentials")) return "Feil e-post eller passord.";
  if (t.includes("email not confirmed") || t.includes("email_not_confirmed"))
    return "E-posten er ikke bekreftet ennå. Sjekk innboksen (og søppelposten) og trykk på lenken.";
  if (t.includes("password") && (t.includes("at least") || t.includes("weak") || t.includes("short")))
    return "Passordet må ha minst 6 tegn.";
  if (t.includes("unable to validate email") || t.includes("invalid email") || t.includes("invalid format"))
    return "Skriv en gyldig e-postadresse.";
  if (t.includes("rate limit") || t.includes("too many") || status === 429)
    return "For mange forsøk på kort tid. Vent et par minutter og prøv igjen.";
  if (t.includes("signups not allowed") || t.includes("signup is disabled"))
    return "Det går ikke å opprette konto akkurat nå.";
  if (t.includes("session") && (t.includes("expired") || t.includes("not found") || t.includes("invalid")))
    return "Du er logget ut. Logg inn på nytt.";
  if (status >= 500) return "Tjenesten svarer ikke akkurat nå. Prøv igjen om litt.";
  return raw || `Noe gikk galt (${status}).`;
}

async function readError(res: Response): Promise<NetError> {
  let raw = "";
  try {
    const body = (await res.json()) as Record<string, unknown>;
    raw = String(body.msg ?? body.error_description ?? body.message ?? body.error ?? body.code ?? "");
  } catch {
    raw = "";
  }
  return new NetError(translateError(res.status, raw), res.status);
}

async function call(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetchImpl(url, init);
  } catch {
    throw new NetError("Ingen kontakt med nettet.", 0, true);
  }
}

function headers(token?: string | null, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token ?? SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function toSession(body: Record<string, unknown>): Session {
  const user = body.user as { id: string; email?: string };
  const expiresIn = Number(body.expires_in ?? 3600);
  return {
    access_token: String(body.access_token),
    refresh_token: String(body.refresh_token),
    expires_at: Number(body.expires_at ?? Math.floor(Date.now() / 1000) + expiresIn),
    user: { id: user.id, email: user.email ?? "" },
  };
}

// ------------------------------------------------------------------ innlogging

/** Oppretter konto. Gir true hvis kontoen må bekreftes på e-post før man kan logge inn. */
export async function signUp(email: string, password: string): Promise<{ needsConfirm: boolean }> {
  const res = await call(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await readError(res);
  const body = (await res.json()) as Record<string, unknown>;
  if (body.access_token) {
    setSession(toSession(body));
    return { needsConfirm: false };
  }
  // Supabase svarer med en «falsk» bruker uten identiteter når e-posten alt er i bruk (for ikke å røpe det).
  const identities = (body.identities ?? (body.user as { identities?: unknown[] } | undefined)?.identities) as
    | unknown[]
    | undefined;
  if (Array.isArray(identities) && identities.length === 0)
    throw new NetError("Det finnes alt en konto med denne e-posten. Logg inn i stedet.", 422);
  return { needsConfirm: true };
}

export async function signIn(email: string, password: string): Promise<Session> {
  const res = await call(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw await readError(res);
  const s = toSession((await res.json()) as Record<string, unknown>);
  setSession(s);
  return s;
}

export async function signOut(): Promise<void> {
  const s = getSession();
  setSession(null);
  if (!s) return;
  try {
    await fetchImpl(`${SUPABASE_URL}/auth/v1/logout`, { method: "POST", headers: headers(s.access_token) });
  } catch {
    // Økta er borte lokalt uansett
  }
}

/** Sender e-post med lenke for å sette nytt passord */
export async function recover(email: string): Promise<void> {
  const res = await call(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw await readError(res);
}

export async function updatePassword(password: string): Promise<void> {
  const token = await getToken();
  if (!token) throw new NetError("Du er ikke logget inn.", 401);
  const res = await call(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw await readError(res);
}

/** Sletter kontoen med alt innhold (SQL-funksjonen delete_my_account, se supabase/001_grunnlag.sql) */
export async function deleteAccount(): Promise<void> {
  await rpc("delete_my_account", {});
  setSession(null);
}

let refreshing: Promise<string | null> | null = null;

/** Gyldig tilgangsnøkkel, fornyet om nødvendig. Null hvis ingen er logget inn eller økta er død. */
export async function getToken(): Promise<string | null> {
  const s = getSession();
  if (!s) return null;
  if (s.expires_at - Date.now() / 1000 > REFRESH_MARGIN_S) return s.access_token;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await call(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ refresh_token: s.refresh_token }),
        });
        if (!res.ok) {
          // Uten nett beholder vi økta og prøver igjen senere; sier tjenesten nei, er økta død
          if (res.status >= 400 && res.status < 500) setSession(null);
          return null;
        }
        const next = toSession((await res.json()) as Record<string, unknown>);
        setSession(next);
        return next.access_token;
      } catch {
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

/**
 * Bekreftelses- og «glemt passord»-lenkene fra e-posten lander på spillet med nøklene i adressen
 * (#access_token=…&type=recovery). Leser dem inn som økt og rydder adressen. Gir typen, eller null.
 */
export function consumeAuthHash(hash = typeof location !== "undefined" ? location.hash : ""): string | null {
  if (!hash.includes("access_token=")) return null;
  const p = new URLSearchParams(hash.replace(/^#/, ""));
  const access = p.get("access_token");
  const refresh = p.get("refresh_token");
  if (!access || !refresh) return null;
  const type = p.get("type") ?? "signup";
  const expiresIn = Number(p.get("expires_in") ?? 3600);
  let id = "";
  let email = "";
  try {
    const payload = JSON.parse(atob(access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      sub?: string;
      email?: string;
    };
    id = payload.sub ?? "";
    email = payload.email ?? "";
  } catch {
    return null;
  }
  setSession({
    access_token: access,
    refresh_token: refresh,
    expires_at: Number(p.get("expires_at") ?? Math.floor(Date.now() / 1000) + expiresIn),
    user: { id, email },
  });
  if (typeof history !== "undefined") history.replaceState(null, "", location.pathname + location.search);
  return type;
}

// ------------------------------------------------------------------ databasen

/** Spørring mot en tabell, med økta til den som er logget inn. `path` er f.eks. "saves?select=state". */
export async function rest<T>(
  path: string,
  init: { method?: string; body?: unknown; prefer?: string; keepalive?: boolean } = {},
): Promise<T> {
  const token = await getToken();
  const res = await call(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: headers(token, init.prefer ? { Prefer: init.prefer } : undefined),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    keepalive: init.keepalive,
  });
  if (!res.ok) throw await readError(res);
  if (res.status === 204 || res.headers.get("content-length") === "0") return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  return rest<T>(`rpc/${fn}`, { method: "POST", body: args });
}
