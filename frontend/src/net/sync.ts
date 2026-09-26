/**
 * Lagring på nett (B-125). Spillet lagres lokalt som før; når man er logget inn, følger en kopi etter til
 * tabellen `saves`, høyst én gang i minuttet og når appen legges bort. Én gang per spilldøgn skrives også en
 * linje i `snapshots` (dag, kasse, konsernverdi, nivå) – tidslinja for toppliste og juksesperre.
 *
 * To nettlesere på samme konto (B-140): hver lagring på nett har et versjonsnummer. En nettleser lagrer bare over
 * versjonen den kjenner (`save_game`). Er spillet lagret fra en annen nettleser i mellomtiden, avvises lagringen
 * («conflict»), og appen henter det nyeste med `pullIfNewer` – det gjør den også hver gang appen vises igjen.
 *
 * Spillmotoren vet ingenting om dette: den kaller bare lytteren i save.ts.
 */
import { konsernEquity } from "../game/konsern";
import { migrate, saveGame } from "../game/save";
import { SAVE_VERSION } from "../game/engine";
import type { GameState } from "../game/types";
import { APP_VERSION, cloudConfigured } from "./config";
import { getSession, NetError, onSessionChange, rest, userId } from "./supabase";

export type CloudStatus =
  | { kind: "off" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "offline"; at: number | null }
  | { kind: "error"; message: string; at: number | null }
  /** Spillet på nett er lagret fra en annen nettleser siden sist: lagringen herfra ble avvist (B-140) */
  | { kind: "conflict" };

/** Minst så lenge mellom to vanlige lagringer på nett (B-141: var ett minutt, for sjeldent ved bytte av enhet) */
export const UPLOAD_INTERVAL_MS = 15_000;
/** Etter en handling fra spilleren lastes spillet opp etter så lang tid (flere handlinger samles) */
export const SOON_MS = 2_000;
/** Så ofte appen sjekker om spillet er lagret fra en annen enhet, mens den vises */
export const PULL_INTERVAL_MS = 20_000;

let status: CloudStatus = { kind: "off" };
/**
 * Er spillet her avklart mot kontoen (B-138)? Før koblingen ved innlogging er ferdig – eller mens spilleren velger
 * mellom spillet her og spillet på nett – lastes ingenting opp, og spillet kobles ikke til en sesong.
 */
let reconciled = false;
const listeners = new Set<() => void>();
let dirty: GameState | null = null;
let lastUpload = 0;
let lastSavedAt: number | null = null;
let lastSnapshotDay = -1;
let inFlight: Promise<void> | null = null;
let soonTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * Flere enheter åpne samtidig (B-143): bare enheten som spilles på, laster opp. Spilleminuttet i det som sist ble
 * lastet opp eller hentet, og om spilleren har gjort noe siden. En enhet som bare står åpen (på pause, eller i
 * bakgrunnen), laster ikke opp og tar ikke over fra den som spilles på.
 */
let syncedMinute = -1;
let actionPending = false;
function synced(g: GameState): void {
  syncedMinute = Math.floor(g.minute);
  actionPending = false;
}
function pageVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}
function changedSinceSync(g: GameState): boolean {
  return actionPending || Math.floor(g.minute) !== syncedMinute;
}
let clock: () => number = () => Date.now();
/** Versjonen av spillet på nett som spillet her bygger på (0: ingen lagring på nett ennå). null: ikke avklart. */
let knownRev: number | null = null;

const DEVICE_KEY = "stalverk-enhet-v1";
const REV_KEY = "stalverk-sky-v1";
let memDevice: string | null = null;

/** Merkelapp for denne nettleseren (tilfeldig, ingen personopplysninger) */
export function deviceId(): string {
  try {
    let d = localStorage.getItem(DEVICE_KEY);
    if (!d) {
      d = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      localStorage.setItem(DEVICE_KEY, d);
    }
    return d;
  } catch {
    memDevice ??= Math.random().toString(36).slice(2, 12);
    return memDevice;
  }
}

/** Versjonen denne nettleseren sist lagret eller hentet for kontoen, også etter omstart */
function storedRev(user: string): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(REV_KEY) ?? "null") as { user?: string; rev?: number } | null;
    return v && v.user === user && typeof v.rev === "number" ? v.rev : null;
  } catch {
    return null;
  }
}
function setKnownRev(user: string, rev: number): void {
  knownRev = rev;
  try {
    localStorage.setItem(REV_KEY, JSON.stringify({ user, rev }));
  } catch {
    // Uten lagring i nettleseren huskes versjonen bare til appen lukkes
  }
}

/** Lagringen ble avvist fordi spillet på nett er nyere (B-140) */
export class SaveConflictError extends Error {
  constructor() {
    super("Spillet på nett er lagret fra en annen enhet.");
    this.name = "SaveConflictError";
  }
}

export function setClock(fn: () => number): void {
  clock = fn;
}

export function cloudStatus(): CloudStatus {
  return status;
}
export function isReconciled(): boolean {
  return reconciled;
}
/** Spillet her er avklart mot kontoen: opplasting og sesong kan gå som normalt */
export function markReconciled(): void {
  reconciled = true;
  for (const fn of listeners) fn();
}
export function onCloudStatus(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
function setStatus(s: CloudStatus): void {
  status = s;
  for (const fn of listeners) fn();
}

interface SaveRow {
  state: GameState;
  minute: number;
  day: number;
  updated_at: string;
  rev?: number;
  device?: string | null;
}

/** Spillet på nett med versjon og hvilken nettleser som lagret det */
export interface CloudSave {
  game: GameState;
  rev: number;
  device: string | null;
}

function dayOf(g: GameState): number {
  return Math.floor(g.minute / 1440) + 1;
}

/** Spillet på kontoen med versjon, eller null hvis kontoen ikke har noe (brukbart) spill ennå */
export async function fetchCloudRow(): Promise<CloudSave | null> {
  const rows = await rest<SaveRow[]>("saves?select=state,minute,day,updated_at,rev,device");
  const row = rows[0];
  if (!row || !row.state || row.state.version !== SAVE_VERSION || typeof row.state.minute !== "number") return null;
  return { game: migrate(row.state), rev: Number(row.rev ?? 0), device: row.device ?? null };
}

/** Spillet på kontoen, eller null hvis kontoen ikke har noe spill ennå */
export async function fetchCloudSave(): Promise<GameState | null> {
  return (await fetchCloudRow())?.game ?? null;
}

/**
 * Laster opp spillet nå og merker det med kontoen. Lagrer bare over versjonen spillet her bygger på (B-140).
 * Kaster NetError, eller SaveConflictError hvis spillet på nett er lagret fra en annen nettleser i mellomtiden.
 */
export async function uploadSave(g: GameState, keepalive = false): Promise<void> {
  const id = userId();
  if (!id) return;
  g.owner = id;
  const day = dayOf(g);
  // Sesongen leses før første await, så lagringen og tidslinja får samme verdi
  const season = g.season;
  const rev = await rest<number | null>("rpc/save_game", {
    method: "POST",
    body: {
      p_state: g,
      p_minute: Math.floor(g.minute),
      p_day: day,
      p_client_version: APP_VERSION,
      p_season_id: season,
      p_device: deviceId(),
      p_base_rev: knownRev ?? 0,
    },
    keepalive,
  });
  if (rev === null || rev === undefined) throw new SaveConflictError();
  setKnownRev(id, Number(rev));
  synced(g);
  if (day !== lastSnapshotDay) {
    await rest("snapshots", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: {
        user_id: id,
        day,
        cash: Math.round(g.cash),
        equity: Math.round(konsernEquity(g)),
        stage: g.stage,
        reputation: Math.round(g.reputation * 10) / 10,
        season_id: season,
        client_version: APP_VERSION,
      },
      keepalive,
    });
    lastSnapshotDay = day;
  }
}

/**
 * Kalles etter hver lokale lagring (save.ts). Laster opp når det er på tide, eller om litt (`soon`) når spilleren
 * nettopp har gjort noe – da er det med når man bytter til en annen enhet (B-141).
 */
export function onLocalSave(g: GameState, soon = false): void {
  if (!cloudConfigured() || !getSession()) return;
  // Ingenting lastes opp før spillet her er avklart mot kontoen (B-138)
  if (!reconciled) return;
  // Et spill som tilhører en annen konto, skal ikke overskrive kontoens spill (B-125)
  if (g.owner && g.owner !== userId()) return;
  if (soon) actionPending = true;
  // Står enheten bare åpen – på pause, eller i bakgrunnen mens tida går – lastes ingenting opp (B-143)
  if (!actionPending && !(Math.floor(g.minute) !== syncedMinute && pageVisible())) return;
  dirty = g;
  if (soon) {
    soonTimer ??= setTimeout(() => {
      soonTimer = null;
      void flush();
    }, SOON_MS);
    return;
  }
  if (clock() - lastUpload >= UPLOAD_INTERVAL_MS) void flush();
}

/**
 * Spilleren forlater enheten (appen legges bort, eller et annet vindu tas i bruk): last opp det som er spilt her,
 * også om siden alt er skjult, så den andre enheten får det (B-143).
 */
export function leaving(g: GameState, keepalive = true): Promise<void> {
  if (cloudConfigured() && getSession() && reconciled && !(g.owner && g.owner !== userId()) && changedSinceSync(g))
    dirty = g;
  return flush(keepalive);
}

/**
 * Spilleren vil spille på denne enheten (B-143): lagre spillet her med én gang, så denne blir den som spilles på og
 * den andre settes på pause når den ser det. Gir false hvis den andre lagret i mellomtiden (hent og prøv igjen).
 */
export async function claim(g: GameState): Promise<boolean> {
  if (!cloudConfigured() || !getSession() || !reconciled) return true;
  if (inFlight) await inFlight;
  actionPending = true;
  dirty = g;
  await flush();
  return status.kind !== "conflict";
}

/** Laster opp det som venter. Med `keepalive` når appen legges bort (fetch fullfører i bakgrunnen). */
export async function flush(keepalive = false): Promise<void> {
  // Er en lagring på vei, venter vi på den (det som er nytt, tas neste gang)
  if (inFlight) return inFlight;
  if (!dirty || !getSession()) return;
  const g = dirty;
  dirty = null;
  lastUpload = clock();
  setStatus({ kind: "saving" });
  inFlight = (async () => {
    try {
      await uploadSave(g, keepalive);
      lastSavedAt = clock();
      setStatus({ kind: "saved", at: lastSavedAt });
    } catch (e) {
      if (e instanceof SaveConflictError) {
        // Ikke prøv igjen: spillet her er eldre enn det på nett. Appen henter det nyeste (pullIfNewer).
        setStatus({ kind: "conflict" });
        return;
      }
      // Prøver igjen ved neste lagring
      dirty = dirty ?? g;
      if (e instanceof NetError && e.offline) setStatus({ kind: "offline", at: lastSavedAt });
      else setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e), at: lastSavedAt });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Nullstiller etter utlogging */
export function resetCloud(): void {
  if (soonTimer) clearTimeout(soonTimer);
  soonTimer = null;
  reconciled = false;
  knownRev = null;
  syncedMinute = -1;
  actionPending = false;
  dirty = null;
  lastUpload = 0;
  lastSavedAt = null;
  lastSnapshotDay = -1;
  setStatus({ kind: "off" });
}

// Logges spilleren ut av seg selv (økta avvist, eller utlogget i en annen fane), slås lagringen på nett av, så
// ☁ ikke står igjen i toppfeltet (B-145)
onSessionChange(() => {
  if (!getSession() && status.kind !== "off") resetCloud();
});

/** Hva som skal skje med spillet når man logger inn (B-125) */
export type LinkDecision =
  | { kind: "none" }
  | { kind: "uploaded" }
  | { kind: "cloud"; cloud: GameState }
  | { kind: "choose"; cloud: GameState; local: GameState };

/**
 * Kobler det lokale spillet til kontoen ved innlogging:
 * - ingen spill på nett, lokalt spill → lastes opp og merkes med kontoen
 * - spill på nett, ikke noe lokalt (eller det lokale tilhører en annen konto) → spillet fra nettet
 * - begge, samme konto → spillet på nett hvis det er lagret fra en annen nettleser siden denne sist lagret eller
 *   hentet (B-140), ellers spillet her. Uten kjent versjon (eldre utgave av appen): det som har kommet lengst.
 * - begge, det lokale uten konto → spilleren velger
 */
export async function linkOnLogin(local: GameState | null): Promise<LinkDecision> {
  const id = userId();
  reconciled = false;
  knownRev = null;
  if (!id) return { kind: "none" };
  const row = await fetchCloudRow();
  const stored = storedRev(id);
  const cloud = row?.game ?? null;
  knownRev = row ? row.rev : 0;
  const mine = local && (local.owner === null || local.owner === id) ? local : null;
  if (!cloud || !row) {
    if (!mine) {
      markReconciled();
      return { kind: "none" };
    }
    await uploadSave(mine);
    saveGame(mine);
    lastSavedAt = clock();
    lastUpload = lastSavedAt;
    setStatus({ kind: "saved", at: lastSavedAt });
    markReconciled();
    return { kind: "uploaded" };
  }
  if (!mine) {
    setKnownRev(id, row.rev);
    synced(cloud);
    setStatus({ kind: "saved", at: clock() });
    markReconciled();
    return { kind: "cloud", cloud };
  }
  if (mine.owner === id) {
    const cloudNewer = stored === null ? cloud.minute > mine.minute : row.rev !== stored && row.device !== deviceId();
    if (cloudNewer) {
      setKnownRev(id, row.rev);
      synced(cloud);
      setStatus({ kind: "saved", at: clock() });
      markReconciled();
      return { kind: "cloud", cloud };
    }
    await uploadSave(mine);
    saveGame(mine);
    lastSavedAt = clock();
    lastUpload = lastSavedAt;
    setStatus({ kind: "saved", at: lastSavedAt });
    markReconciled();
    return { kind: "uploaded" };
  }
  return { kind: "choose", cloud, local: mine };
}

/** Spilleren valgte å fortsette med det lokale spillet: det overskriver spillet på nett */
export async function keepLocal(local: GameState): Promise<void> {
  await uploadSave(local);
  lastSavedAt = clock();
  lastUpload = lastSavedAt;
  setStatus({ kind: "saved", at: lastSavedAt });
  markReconciled();
}

/**
 * Er spillet på nett lagret fra en annen nettleser siden spillet her sist ble lagret eller hentet (B-140)?
 * Gir i så fall spillet fra nettet, som appen bytter til. Kalles når appen vises igjen og når en lagring ble avvist.
 */
export async function pullIfNewer(): Promise<GameState | null> {
  const id = userId();
  if (!id || !reconciled || knownRev === null) return null;
  const rows = await rest<{ rev: number; device: string | null }[]>("saves?select=rev,device");
  const row = rows[0];
  if (!row || Number(row.rev) === knownRev) {
    if (status.kind === "conflict") setStatus({ kind: "saved", at: lastSavedAt ?? clock() });
    return null;
  }
  if (row.device === deviceId()) {
    // Lagret herfra (svaret kom ikke fram, f.eks. da appen ble lagt bort): spillet her er like nytt
    setKnownRev(id, Number(row.rev));
    if (status.kind === "conflict") setStatus({ kind: "saved", at: lastSavedAt ?? clock() });
    return null;
  }
  const full = await fetchCloudRow();
  if (!full) return null;
  setKnownRev(id, full.rev);
  synced(full.game);
  dirty = null;
  lastSavedAt = clock();
  setStatus({ kind: "saved", at: lastSavedAt });
  return full.game;
}

/** Funksjonsbryterne i tabellen `config` (kan skru av lagring på nett uten ny publisering) */
export async function fetchFeatures(): Promise<Record<string, boolean>> {
  if (!cloudConfigured()) return { cloud: false };
  try {
    const rows = await rest<{ value: Record<string, boolean> }[]>("config?select=value&id=eq.features");
    return rows[0]?.value ?? {};
  } catch {
    return {};
  }
}
