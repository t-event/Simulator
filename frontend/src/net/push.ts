/**
 * Varsel på mobilen (B-465, supabase/134_varsel_pa_mobilen.sql): abonnementet for denne enheten. Serveren sender varslene
 * (edge-funksjonen `push`); her slås de av og på, med temaene spilleren vil ha. Krever konto.
 *
 * iPhone og iPad: varsler virker bare når spillet er lagt på hjemskjermen (iOS 16.4 og nyere). I Safari ellers finnes
 * ikke `PushManager`, og kortet forklarer hva som skal til.
 */
import { onBeforeSignOut, rpc, userId } from "./supabase";

export type PushKind = "oppkjop" | "anbud" | "konsern" | "melding";

export const PUSH_KINDS: { id: PushKind; label: string; hint: string }[] = [
  { id: "oppkjop", label: "Oppkjøp", hint: "Noen byr på selskapet ditt, du er overbydd, fristen nærmer seg, utfallet" },
  { id: "anbud", label: "Anbud", hint: "Et anbud åpner, og hvem som vant" },
  { id: "konsern", label: "Byggeprosjekter", hint: "Et verk i konsernet er ferdig bygget eller modernisert" },
  { id: "melding", label: "Privatmeldinger", hint: "Noen har skrevet til deg (teksten vises ikke på låseskjermen)" },
];

export type PushSupport = "ja" | "hjemskjerm" | "nei";

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Kan denne nettleseren få varsler? «hjemskjerm» = iPhone/iPad i Safari: legg spillet på hjemskjermen først */
export function pushSupport(): PushSupport {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return "nei";
  if ("PushManager" in window && "Notification" in window) return "ja";
  return isIos() && !isStandalone() ? "hjemskjerm" : "nei";
}

export function pushPermission(): NotificationPermission | "ukjent" {
  return typeof Notification === "undefined" ? "ukjent" : Notification.permission;
}

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64.length + 3) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function b64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  // Service workeren registreres i main.tsx; i utviklingsserveren kan den mangle
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await registration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export interface PushState {
  active: boolean;
  kinds: PushKind[];
}

/** Står varsler på for denne enheten og kontoen? */
export async function pushState(): Promise<PushState> {
  const sub = await currentSubscription();
  if (!sub) return { active: false, kinds: PUSH_KINDS.map((k) => k.id) };
  const s = await rpc<{ active?: boolean; kinds?: string[] }>("push_status", { p_endpoint: sub.endpoint });
  return { active: !!s?.active, kinds: (s?.kinds ?? []).filter(isKind) };
}

function isKind(k: string): k is PushKind {
  return PUSH_KINDS.some((p) => p.id === k);
}

export type PushRefusal = "støttes ikke" | "nektet" | "ingen nøkkel" | "gjest" | "ugyldig";

export const PUSH_REFUSAL_TEXT: Record<PushRefusal, string> = {
  "støttes ikke": "Denne nettleseren kan ikke vise varsler.",
  nektet:
    "Varsler er slått av for spillet i innstillingene på telefonen. Slå dem på der (Varslinger), og prøv igjen her.",
  "ingen nøkkel": "Varslene er ikke klare på serveren ennå. Prøv igjen om litt.",
  gjest: "Varsler krever konto.",
  ugyldig: "Telefonen ga et abonnement serveren ikke kunne bruke. Prøv igjen.",
};

/** Slår på varsler (spør om lov første gang) eller lagrer nye temaer */
export async function enablePush(kinds: PushKind[]): Promise<{ ok: true } | { ok: false; reason: PushRefusal }> {
  if (pushSupport() !== "ja") return { ok: false, reason: "støttes ikke" };
  // Spør om lov før noe annet venter: iPhone viser spørsmålet bare rett etter et trykk (B-467)
  if (Notification.permission !== "granted") {
    const p = await Notification.requestPermission();
    if (p !== "granted") return { ok: false, reason: "nektet" };
  }
  const reg = await registration();
  if (!reg) return { ok: false, reason: "støttes ikke" };
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const key = await rpc<string | null>("push_public_key", {});
    if (!key) return { ok: false, reason: "ingen nøkkel" };
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  }
  const r = await rpc<{ ok: boolean; reason?: string }>("push_subscribe", {
    p_endpoint: sub.endpoint,
    p_p256dh: b64(sub.getKey("p256dh")),
    p_auth: b64(sub.getKey("auth")),
    p_kinds: kinds,
  });
  if (r?.ok) return { ok: true };
  return { ok: false, reason: r?.reason === "gjest" ? "gjest" : "ugyldig" };
}

/** Prøvevarsel (B-466): serveren sender «Varslene virker» til enhetene som står på, høyst ett per 10 minutter */
export type PushTestResult = { ok: true; devices: number } | { ok: false; reason: "av" | "nylig" };

export async function sendTestPush(): Promise<PushTestResult> {
  return rpc<PushTestResult>("push_test", {});
}

export const PUSH_TEST_TEXT: Record<"ok" | "av" | "nylig", string> = {
  ok: "Prøvevarselet er sendt. Det kommer innen et minutt – legg gjerne spillet bort så lenge.",
  av: "Slå på varsel på mobilen først.",
  nylig: "Du sendte et prøvevarsel nettopp. Vent noen minutter før du prøver igjen.",
};

/**
 * Varsler på for alle (B-467, eieren 5.10): første gang en innlogget spiller trykker i spillet på en enhet som kan få
 * varsler, spør telefonen om lov. Svaret huskes per konto og enhet – også «nei» og «slått av under Innstillinger» –
 * så det spørres bare én gang.
 */
const AUTO_KEY = "stalverk-varsel-auto-v1";

function autoSeen(): Record<string, true> {
  try {
    const v = JSON.parse(localStorage.getItem(AUTO_KEY) ?? "{}") as unknown;
    return v && typeof v === "object" ? (v as Record<string, true>) : {};
  } catch {
    return {};
  }
}

export function markPushAutoDone(uid: string): void {
  try {
    localStorage.setItem(AUTO_KEY, JSON.stringify({ ...autoSeen(), [uid]: true }));
  } catch {
    // Privat modus: da spørres det kanskje igjen neste gang, og det er greit
  }
}

/** Skal spillet slå på varsler for denne kontoen på denne enheten? */
export function pushAutoWanted(uid: string): boolean {
  return pushSupport() === "ja" && pushPermission() !== "denied" && !autoSeen()[uid];
}

/** Slår av varsler for denne enheten (på serveren og i nettleseren) */
export async function disablePush(): Promise<void> {
  const uid = userId();
  if (uid) markPushAutoDone(uid);
  const sub = await currentSubscription();
  if (!sub) return;
  await rpc("push_unsubscribe", { p_endpoint: sub.endpoint });
  await sub.unsubscribe().catch(() => false);
}

// Logger spilleren ut, skal ikke enheten få varsler for kontoen lenger (en delt telefon). Nettleserens abonnement står,
// så neste konto kan slå på varsler uten å spørre om lov igjen.
onBeforeSignOut(async () => {
  if (!userId()) return;
  const sub = await currentSubscription().catch(() => null);
  if (sub) await rpc("push_unsubscribe", { p_endpoint: sub.endpoint }).catch(() => undefined);
});

/** Lenken i et varsel: hvor appen skal gå når det trykkes på det (sw.js sender den hit) */
export type PushLink = { to: "industri" } | { to: "konsern" } | { to: "meldinger"; nick: string | null };

export function parsePushLink(link: string | null | undefined): PushLink | null {
  if (!link) return null;
  if (link === "industri" || link === "konsern") return { to: link };
  if (link === "meldinger" || link.startsWith("meldinger:")) {
    const nick = link.slice("meldinger:".length);
    return { to: "meldinger", nick: nick || null };
  }
  return null;
}

/** Leser `?varsel=` fra adressen (appen ble åpnet fra et varsel) og tar det bort fra adresselinja */
export function takeLaunchLink(): PushLink | null {
  if (typeof location === "undefined") return null;
  const url = new URL(location.href);
  const raw = url.searchParams.get("varsel");
  if (raw === null) return null;
  url.searchParams.delete("varsel");
  history.replaceState(null, "", url.pathname + url.search + url.hash);
  return parsePushLink(raw);
}
