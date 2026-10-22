/**
 * Verdenskartet (B-333): alle spilleres datterverk per region og de strategiske selskapene, fra `world_map()` i
 * supabase/066_verdenskartet.sql. Bare det topplista alt viser: kallenavn, tittel og antall verk per type. Regionmesteren
 * og styrken per konsern kommer fra supabase/151_regionmester.sql (B-487), fellesprosjektene fra 156 (B-508).
 */
import { isRegion, REGION_IDS } from "../game/regions";
import type { RegionId } from "../game/types";
import { companyType, type CompanyType } from "./world";
import { rpc } from "./supabase";

export interface MapPlayer {
  nick: string;
  title: string | null;
  mine: boolean;
  stalverk: number;
  storverk: number;
  kompleks: number;
  /** Verk som bygges i regionen nå */
  building: number;
  /** Styrken i regionen etter aktiviteten (B-487); 0 fra en eldre server */
  strength: number;
}

/** Regionmesteren (B-487): konsernet med sterkest verk i regionen */
export interface MapMaster {
  nick: string;
  strength: number;
  /** Når tittelen ble tatt (ms), 0 hvis ukjent */
  since: number;
  mine: boolean;
}

export interface MapCompany {
  id: number;
  type: CompanyType;
  name: string;
  owner: string | null;
  mine: boolean;
}

/** Fellesprosjektet som er åpent i regionen (B-508) */
export interface MapProject {
  id: number;
  name: string;
  goal: number;
  total: number;
}

/** Et fellesprosjekt som nådde målet: bygningen på kartet, med navnet til hovedbidragsyteren */
export interface MapBuilt {
  name: string;
  kind: string;
  nick: string;
  mine: boolean;
}

export interface MapRegion {
  id: RegionId;
  players: MapPlayer[];
  companies: MapCompany[];
  master: MapMaster | null;
  project: MapProject | null;
  built: MapBuilt[];
}

type Row = Record<string, unknown>;
const num = (v: unknown): number => Math.max(0, Math.floor(Number(v) || 0));
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const strength = (v: unknown): number => Math.max(0, Math.round((Number(v) || 0) * 10) / 10);

/** Svaret fra `world_map()`; alle seks regionene, i fast rekkefølge, også når serveren mangler noen */
export function parseWorldMap(r: Row | null | undefined): MapRegion[] {
  const rows = Array.isArray(r?.regions) ? (r.regions as Row[]) : [];
  return REGION_IDS.map((id) => {
    const row = rows.find((x) => isRegion(x?.id) && x.id === id);
    const players = Array.isArray(row?.players) ? (row.players as Row[]) : [];
    const companies = Array.isArray(row?.companies) ? (row.companies as Row[]) : [];
    const m = row?.master && typeof row.master === "object" ? (row.master as Row) : null;
    const pr = row?.project && typeof row.project === "object" ? (row.project as Row) : null;
    const built = Array.isArray(row?.built) ? (row.built as Row[]) : [];
    return {
      id,
      master: m
        ? {
            nick: str(m.nick) ?? "Ukjent",
            strength: strength(m.strength),
            since: typeof m.since === "string" ? Date.parse(m.since) || 0 : 0,
            mine: m.mine === true,
          }
        : null,
      players: players
        .map((p) => ({
          nick: str(p.nick) ?? "Ukjent",
          title: str(p.title),
          mine: p.mine === true,
          stalverk: num(p.stalverk),
          storverk: num(p.storverk),
          kompleks: num(p.kompleks),
          building: num(p.building),
          strength: strength(p.strength),
        }))
        .filter((p) => p.stalverk + p.storverk + p.kompleks > 0),
      companies: companies.map((c) => ({
        id: num(c.id),
        type: companyType(c.type),
        name: str(c.name) ?? "Selskap",
        owner: str(c.owner),
        mine: c.mine === true,
      })),
      project:
        pr && Number(pr.goal) > 0
          ? {
              id: num(pr.id),
              name: str(pr.name) ?? "Fellesprosjekt",
              goal: Number(pr.goal),
              total: Number(pr.total) || 0,
            }
          : null,
      built: built.map((b) => ({
        name: str(b.name) ?? "Fellesprosjekt",
        kind: str(b.kind) ?? "",
        nick: str(b.nick) ?? "Ukjent",
        mine: b.mine === true,
      })),
    };
  });
}

export async function fetchWorldMap(): Promise<MapRegion[]> {
  return parseWorldMap(await rpc<Row>("world_map", {}));
}

/** Styrken med høyst én desimal og komma (B-487) */
export function fmtStrength(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString("nb-NO", { maximumFractionDigits: 1 });
}

/** Hvor mye styrke du mangler for å ta tittelen (strengt mer enn mesteren), eller null når du er mesteren */
export function strengthGap(r: MapRegion): number | null {
  if (!r.master || r.master.mine) return null;
  const mine = r.players.find((p) => p.mine)?.strength ?? 0;
  return Math.max(0.1, Math.round((r.master.strength - mine + 0.1) * 10) / 10);
}
