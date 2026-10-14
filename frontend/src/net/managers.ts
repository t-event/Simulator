/**
 * Verksjefene (B-488, supabase/152_verksjefer.sql): kandidater, ansettelse, mandat, avslutning og samtalene
 * («Verksjefen ringer»). Serveren avgjør alt og fører pengene i konsernkassa; appen viser svaret. Krever konto.
 */
import {
  CALL_CARD_BY_ID,
  MANDATES,
  setManagerModFactors,
  TRAITS,
  type Mandate,
  type ManagerStats,
  type Trait,
} from "../game/managers";
import { rpc, rpcFor, userId } from "./supabase";

export interface ManagerCandidate extends ManagerStats {
  slot: number;
  name: string;
  trait: Trait;
}

export interface PlantManager extends ManagerStats {
  plant: number;
  name: string;
  trait: Trait;
  mandate: Mandate;
  salary: number;
  /** Trivselen 0–100 (B-489); under 20 kommer «Tilbud fra en konkurrent» */
  loyalty: number;
  /** Når mandatet kan byttes igjen (ms) */
  mandateFrom: number;
}

export interface ManagerCall {
  id: number;
  plant: number;
  card: string;
  deadline: number;
  /** 0 eller 1 når den er avgjort */
  choice: number | null;
  chosenBy: "eier" | "verksjef" | null;
  outcome: "sikker" | "uhell" | null;
  cash: number;
  resolvedAt: number | null;
  manager: string | null;
}

export interface ManagerStatus {
  enabled: boolean;
  /** Hele konsernets utbytte per dag nå (før politikken) */
  perDay: number;
  /** Utbyttet per verk nå, per dag */
  plants: { plant: number; share: number; daily: number }[];
  candidates: ManagerCandidate[];
  managers: PlantManager[];
  /** Verk der verksjefen nylig ble avsluttet: ingen ny før `until` (ms) */
  quarantine: { plant: number; until: number }[];
  calls: ManagerCall[];
  /** Hva verksjefene ga eller kostet per betalt dag (kr) */
  days: { day: string; amount: number }[];
  effects: { plant: number; factor: number; until: string }[];
}

type Row = Record<string, unknown>;
const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Row[]) : []);
const int = (v: unknown): number => Math.floor(Number(v) || 0);
const num = (v: unknown): number => Number(v) || 0;
const star = (v: unknown): number => Math.max(1, Math.min(5, int(v)));
const time = (v: unknown): number => (typeof v === "string" ? Date.parse(v) || 0 : 0);
const trait = (v: unknown): Trait => (TRAITS.includes(v as Trait) ? (v as Trait) : "forsiktig");
const mandate = (v: unknown): Mandate => (MANDATES.includes(v as Mandate) ? (v as Mandate) : "lonnsomhet");
const stats = (r: Row): ManagerStats => ({ drift: star(r.drift), okonomi: star(r.okonomi), folk: star(r.folk) });

export function parseManagerStatus(r: Row | null | undefined): ManagerStatus {
  return {
    enabled: r?.enabled === true,
    perDay: num(r?.perDay),
    plants: arr(r?.plants).map((p) => ({ plant: int(p.plant), share: num(p.share), daily: num(p.daily) })),
    candidates: arr(r?.candidates).map((c) => ({
      slot: int(c.slot),
      name: String(c.name ?? "Kandidat"),
      trait: trait(c.trait),
      ...stats(c),
    })),
    managers: arr(r?.managers).map((m) => ({
      plant: int(m.plant),
      name: String(m.name ?? "Verksjef"),
      trait: trait(m.trait),
      mandate: mandate(m.mandate),
      salary: num(m.salary),
      loyalty: m.loyalty == null ? 60 : Math.max(0, Math.min(100, int(m.loyalty))),
      mandateFrom: time(m.mandateFrom),
      ...stats(m),
    })),
    quarantine: arr(r?.quarantine).map((q) => ({ plant: int(q.plant), until: time(q.until) })),
    calls: arr(r?.calls)
      .filter((c) => typeof c.card === "string" && c.card in CALL_CARD_BY_ID)
      .map((c) => ({
        id: int(c.id),
        plant: int(c.plant),
        card: c.card as string,
        deadline: time(c.deadline),
        choice: c.choice == null ? null : int(c.choice),
        chosenBy: c.chosenBy === "eier" || c.chosenBy === "verksjef" ? c.chosenBy : null,
        outcome: c.outcome === "sikker" || c.outcome === "uhell" ? c.outcome : null,
        cash: num(c.cash),
        resolvedAt: c.resolvedAt ? time(c.resolvedAt) : null,
        manager: typeof c.manager === "string" ? c.manager : null,
      })),
    days: arr(r?.days).map((d) => ({ day: String(d.day ?? ""), amount: num(d.amount) })),
    effects: arr(r?.effects).map((e) => ({
      plant: int(e.plant),
      factor: num(e.factor) || 1,
      until: String(e.until ?? ""),
    })),
  };
}

export type ManagerRefusal =
  | "innlogging"
  | "gjest"
  | "sperret"
  | "av"
  | "konsern"
  | "mandat"
  | "verk"
  | "har"
  | "karantene"
  | "kandidat"
  | "ingen"
  | "uke"
  | "kasse"
  | "valg"
  | "ferdig"
  | "nett";

export const MANAGER_REFUSAL_TEXT: Record<ManagerRefusal, string> = {
  innlogging: "Logg inn for å ansette verksjefer.",
  gjest: "Verksjefer krever konto.",
  sperret: "Kontoen er sperret.",
  av: "Verksjefene er ikke åpnet ennå.",
  konsern: "Du trenger et datterverk først.",
  mandat: "Velg et mandat.",
  verk: "Verket er ikke ferdig bygget.",
  har: "Verket har alt en verksjef.",
  karantene: "Du avsluttet verksjefen her nylig. Verket kan få en ny om noen dager.",
  kandidat: "Kandidaten er ikke ledig lenger. Se dagens kandidater på nytt.",
  ingen: "Verket har ingen verksjef.",
  uke: "Mandatet kan bare byttes én gang i uka.",
  kasse: "Konsernkassa har ikke nok til sluttpakken.",
  valg: "Velg ett av svarene.",
  ferdig: "Saken er alt avgjort.",
  nett: "Fikk ikke kontakt med serveren. Prøv igjen.",
};

export type ManagerResult =
  | {
      ok: true;
      cost?: number;
      outcome?: "sikker" | "uhell";
      cash?: number;
      days?: number;
      factor?: number;
      special?: "raise" | "leave";
    }
  | { ok: false; reason: ManagerRefusal; cost?: number };

function result(r: Row | null | undefined): ManagerResult {
  if (r?.ok === true)
    return {
      ok: true,
      cost: num(r.cost),
      outcome: r.outcome === "uhell" ? "uhell" : r.outcome === "sikker" ? "sikker" : undefined,
      cash: num(r.cash),
      days: int(r.days),
      factor: num(r.factor) || 1,
      special: r.special === "raise" || r.special === "leave" ? r.special : undefined,
    };
  const reason =
    typeof r?.reason === "string" && r.reason in MANAGER_REFUSAL_TEXT ? (r.reason as ManagerRefusal) : "nett";
  return { ok: false, reason, cost: num(r?.cost) };
}

async function act(fn: string, args: Record<string, unknown>): Promise<ManagerResult> {
  const uid = userId();
  if (!uid) return { ok: false, reason: "innlogging" };
  try {
    const r = result(await rpcFor<Row>(uid, fn, args));
    if (userId() === uid) void reloadManagers();
    return r;
  } catch {
    return { ok: false, reason: "nett" };
  }
}

export const hireManager = (plant: number, slot: number, m: Mandate) =>
  act("manager_hire", { p_plant: plant, p_slot: slot, p_mandate: m });
export const setManagerMandate = (plant: number, m: Mandate) =>
  act("manager_set_mandate", { p_plant: plant, p_mandate: m });
export const dismissManager = (plant: number) => act("manager_dismiss", { p_plant: plant });
export const answerCall = (call: number, choice: 0 | 1) => act("manager_answer", { p_call: call, p_choice: choice });

// Status i minnet for kontoen den gjelder (B-426), så Konsern og prisen på moderniseringen ser det samme
let current: { uid: string; status: ManagerStatus } | null = null;
const listeners = new Set<() => void>();

export function managerStatus(): ManagerStatus | null {
  return current && current.uid === userId() ? current.status : null;
}
export function setManagerStatus(uid: string, status: ManagerStatus): void {
  current = { uid, status };
  setManagerModFactors(
    status.enabled ? status.managers.map((m) => ({ plant: m.plant, mandate: m.mandate, stats: m })) : [],
  );
  for (const fn of listeners) fn();
}
export function onManagersChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
export function clearManagers(): void {
  if (!current) return;
  current = null;
  setManagerModFactors([]);
  for (const fn of listeners) fn();
}

/** Henter statusen på nytt for kontoen som er innlogget */
export async function reloadManagers(): Promise<void> {
  const uid = userId();
  if (!uid) return clearManagers();
  const status = parseManagerStatus(await rpc<Row>("manager_status", {}));
  if (userId() === uid) setManagerStatus(uid, status);
}

/** Samtalen som venter på svar (høyst én) */
export function openCall(s: ManagerStatus | null): ManagerCall | null {
  return s?.calls.find((c) => c.resolvedAt == null) ?? null;
}
