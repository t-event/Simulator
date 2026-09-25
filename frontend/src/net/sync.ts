/**
 * Lagring på nett (B-125). Spillet lagres lokalt som før; når man er logget inn, følger en kopi etter til
 * tabellen `saves`, høyst én gang i minuttet og når appen legges bort. Én gang per spilldøgn skrives også en
 * linje i `snapshots` (dag, kasse, konsernverdi, nivå) – tidslinja for toppliste og juksesperre.
 *
 * Spillmotoren vet ingenting om dette: den kaller bare lytteren i save.ts.
 */
import { konsernEquity } from "../game/konsern";
import { migrate, parseSave } from "../game/save";
import { SAVE_VERSION } from "../game/engine";
import type { GameState } from "../game/types";
import { APP_VERSION } from "./config";
import { getSession, NetError, rest, userId } from "./supabase";

export type CloudStatus =
  | { kind: "off" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "offline"; at: number | null }
  | { kind: "error"; message: string; at: number | null };

/** Minst så lenge mellom to lagringer på nett */
export const UPLOAD_INTERVAL_MS = 60_000;

let status: CloudStatus = { kind: "off" };
const listeners = new Set<() => void>();
let dirty: GameState | null = null;
let lastUpload = 0;
let lastSavedAt: number | null = null;
let lastSnapshotDay = -1;
let inFlight: Promise<void> | null = null;
let clock: () => number = () => Date.now();

export function setClock(fn: () => number): void {
  clock = fn;
}

export function cloudStatus(): CloudStatus {
  return status;
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
}

function dayOf(g: GameState): number {
  return Math.floor(g.minute / 1440) + 1;
}

/** Spillet på kontoen, eller null hvis kontoen ikke har noe spill ennå */
export async function fetchCloudSave(): Promise<GameState | null> {
  const rows = await rest<SaveRow[]>("saves?select=state,minute,day,updated_at");
  const row = rows[0];
  if (!row || !row.state || row.state.version !== SAVE_VERSION || typeof row.state.minute !== "number") return null;
  return migrate(row.state);
}

/** Laster opp spillet nå og merker det med kontoen. Kaster NetError. */
export async function uploadSave(g: GameState, keepalive = false): Promise<void> {
  const id = userId();
  if (!id) return;
  g.owner = id;
  const day = dayOf(g);
  await rest("saves", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: { user_id: id, state: g, minute: Math.floor(g.minute), day, client_version: APP_VERSION },
    keepalive,
  });
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
        client_version: APP_VERSION,
      },
      keepalive,
    });
    lastSnapshotDay = day;
  }
}

/** Kalles etter hver lokale lagring (save.ts). Laster opp når det er på tide. */
export function onLocalSave(g: GameState): void {
  if (!getSession()) return;
  // Et spill som tilhører en annen konto, skal ikke overskrive kontoens spill (B-125)
  if (g.owner && g.owner !== userId()) return;
  dirty = g;
  if (clock() - lastUpload >= UPLOAD_INTERVAL_MS) void flush();
}

/** Laster opp det som venter. Med `keepalive` når appen legges bort (fetch fullfører i bakgrunnen). */
export async function flush(keepalive = false): Promise<void> {
  if (!dirty || !getSession()) return;
  if (inFlight) return inFlight;
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
  dirty = null;
  lastUpload = 0;
  lastSavedAt = null;
  lastSnapshotDay = -1;
  setStatus({ kind: "off" });
}

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
 * - begge, samme konto → det som har kommet lengst i spilltid
 * - begge, det lokale uten konto → spilleren velger
 */
export async function linkOnLogin(local: GameState | null): Promise<LinkDecision> {
  const id = userId();
  if (!id) return { kind: "none" };
  const cloud = await fetchCloudSave();
  const mine = local && (local.owner === null || local.owner === id) ? local : null;
  if (!cloud) {
    if (!mine) return { kind: "none" };
    await uploadSave(mine);
    lastSavedAt = clock();
    lastUpload = lastSavedAt;
    setStatus({ kind: "saved", at: lastSavedAt });
    return { kind: "uploaded" };
  }
  if (!mine) {
    setStatus({ kind: "saved", at: clock() });
    return { kind: "cloud", cloud };
  }
  if (mine.owner === id) {
    if (cloud.minute > mine.minute) {
      setStatus({ kind: "saved", at: clock() });
      return { kind: "cloud", cloud };
    }
    await uploadSave(mine);
    lastSavedAt = clock();
    lastUpload = lastSavedAt;
    setStatus({ kind: "saved", at: lastSavedAt });
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
}

/** Sikkerhetskopier kan bare lastes inn på kontoen de tilhører (B-125). Gir feilmeldingen, eller null. */
export function backupOwnerError(text: string): string | null {
  const g = parseSave(text);
  if (!g) return "Fila er ikke et lagret spill.";
  if (g.owner && g.owner !== userId())
    return "Denne sikkerhetskopien tilhører en annen konto. Logg inn på den kontoen først.";
  return null;
}

/** Funksjonsbryterne i tabellen `config` (kan skru av lagring på nett uten ny publisering) */
export async function fetchFeatures(): Promise<Record<string, boolean>> {
  try {
    const rows = await rest<{ value: Record<string, boolean> }[]>("config?select=value&id=eq.features");
    return rows[0]?.value ?? {};
  } catch {
    return {};
  }
}
