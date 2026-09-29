/**
 * Konsernet på serveren (B-325, B-326): datterverkene kjøpes, bygges ut, moderniseres og selges fra konsernkassa, og
 * serveren holder verkene, køen og konsernnivået (`konsern_order`, `konsern_cancel`, `konsern_sell` og
 * `konsern_status` i supabase/064_konsern_i_ekte_tid.sql). Appen legger det serveren sier inn i spillet.
 */
import { applyWorld, finishKonsernProjects } from "../game/konsern";
import type { KonsernWorld, OrderRefusal, OrderRequest } from "../game/konsernWorld";
import { isRegion } from "../game/regions";
import type { GameState, KonsernOrder, PolicyId, RegionId, SisterPlant, SisterType } from "../game/types";
import { rpc } from "./supabase";

type Row = Record<string, unknown>;
const num = (v: unknown): number => Number(v) || 0;
const TYPES: SisterType[] = ["stalverk", "storverk", "kompleks"];
const typeOf = (v: unknown): SisterType => (TYPES.includes(v as SisterType) ? (v as SisterType) : "stalverk");

function parsePlant(p: Row): SisterPlant {
  const pr = p.project as Row | undefined;
  const kind = pr?.kind;
  return {
    id: num(p.id),
    type: typeOf(p.type),
    name: String(p.name ?? ""),
    level: num(p.level),
    boughtDay: num(p.boughtDay),
    downUntilDay: num(p.downUntilDay),
    ...(isRegion(p.region) ? { region: p.region } : {}),
    ...(p.moved === true ? { moved: true } : {}),
    ...(pr && (kind === "bygg" || kind === "utbygging" || kind === "modernisering")
      ? { project: { kind, startedAt: num(pr.startedAt), readyAt: num(pr.readyAt) } }
      : {}),
  };
}

function parseOrder(o: Row): KonsernOrder {
  const kind = o.kind === "modernisering" || o.kind === "utbygging" ? o.kind : "bygg";
  return {
    id: num(o.id),
    kind,
    plantId: num(o.plant_id),
    type: o.type ? typeOf(o.type) : null,
    name: typeof o.name === "string" ? o.name : null,
    cost: num(o.cost),
    startsAt: num(o.starts_at),
    readyAt: num(o.ready_at),
    status: o.status === "i gang" ? "i gang" : "kø",
    region: isRegion(o.region) ? o.region : null,
  };
}

/** Konsernet fra `konsern_status` */
export function parseKonsern(r: Row | null | undefined): KonsernWorld | null {
  if (!r) return null;
  return {
    plants: Array.isArray(r.plants) ? (r.plants as Row[]).map(parsePlant) : [],
    orders: Array.isArray(r.orders) ? (r.orders as Row[]).map(parseOrder) : [],
    nextId: Math.max(1, num(r.next_id)),
    level: num(r.level),
    floor: num(r.floor),
    balance: num(r.balance),
    ...(typeof r.policy === "string"
      ? {
          policy: {
            kind: r.policy === "balansert" || r.policy === "forsvar" ? r.policy : "ut",
            changedAt: r.policy_at === null || r.policy_at === undefined ? null : num(r.policy_at),
            fund: num(r.fund),
          },
        }
      : {}),
  };
}

/** Er det noe i serverens konsern som spillet ikke har? Så appen bare endrer spillet når det trengs */
export function konsernDiffers(g: GameState, w: KonsernWorld, perDay: number): boolean {
  const k = g.konsern;
  const plants = (ps: SisterPlant[]) =>
    JSON.stringify(
      ps.map((p) => [
        p.id,
        p.type,
        p.level,
        p.name,
        p.project?.kind ?? "",
        p.project?.readyAt ?? 0,
        p.region ?? "",
        p.moved === true,
      ]),
    );
  return (
    plants(k.plants) !== plants(w.plants) ||
    JSON.stringify((k.orders ?? []).map((o) => [o.id, o.status, o.region ?? null])) !==
      JSON.stringify(w.orders.map((o) => [o.id, o.status, o.region ?? null])) ||
    Math.max(w.level, w.floor) > k.legends ||
    k.treasury?.balance !== w.balance ||
    k.treasury?.perDay !== perDay ||
    (!!w.policy && JSON.stringify(k.policy ?? null) !== JSON.stringify(w.policy))
  );
}

/**
 * Legg serverens konsern inn i spillet. Først fullføres det appen selv vet er ferdig (så loggen får beskjeden), så tar
 * serveren over: verkene, køen, nivået og kassa. `perDay` er omtrent hva som kommer inn i konsernkassa per ekte dag.
 */
export function applyKonsern(g: GameState, w: KonsernWorld, perDay: number): void {
  finishKonsernProjects(g);
  g.konsern.treasury = { balance: w.balance, perDay };
  if (w.policy) g.konsern.policy = { ...w.policy };
  applyWorld(g, w);
}

export type KonsernResult = { ok: true; konsern: KonsernWorld | null } | { ok: false; reason: OrderRefusal };

async function call(fn: string, args: Record<string, unknown>): Promise<KonsernResult> {
  let r: Row | null;
  try {
    r = await rpc<Row>(fn, args);
  } catch {
    return { ok: false, reason: "nett" };
  }
  if (r?.ok !== true) return { ok: false, reason: (r?.reason as OrderRefusal) ?? "nett" };
  return { ok: true, konsern: parseKonsern(r.konsern as Row) };
}

/** Bestill et prosjekt: betales med én gang fra konsernkassa og legges sist i køen */
export function orderKonsern(req: OrderRequest): Promise<KonsernResult> {
  return call("konsern_order", {
    p_kind: req.kind,
    p_plant: req.kind === "bygg" ? null : req.plant,
    p_type: req.kind === "bygg" ? req.type : null,
    p_region: req.kind === "bygg" ? (req.region ?? null) : null,
  });
}

/** Avbestill det siste i køen før det har startet (full refusjon) */
export function cancelKonsern(order: number): Promise<KonsernResult> {
  return call("konsern_cancel", { p_order: order });
}

/** Velg utbyttepolitikk (B-334), én gang per ekte uke */
export function setPolicy(kind: PolicyId): Promise<KonsernResult> {
  return call("konsern_policy", { p_policy: kind });
}

/** Flytt et verk til en annen region, én gang per verk (B-333) */
export function moveKonsern(plant: number, region: RegionId): Promise<KonsernResult> {
  return call("konsern_move", { p_plant: plant, p_region: region });
}

/** Selg et verk uten prosjekt: 60 % av pris med trinn, til konsernkassa */
export function sellKonsern(plant: number): Promise<KonsernResult> {
  return call("konsern_sell", { p_plant: plant });
}
