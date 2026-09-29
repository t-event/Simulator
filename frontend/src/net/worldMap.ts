/**
 * Verdenskartet (B-333): alle spilleres datterverk per region og de strategiske selskapene, fra `world_map()` i
 * supabase/066_verdenskartet.sql. Bare det topplista alt viser: kallenavn, tittel og antall verk per type.
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
}

export interface MapCompany {
  id: number;
  type: CompanyType;
  name: string;
  owner: string | null;
  mine: boolean;
}

export interface MapRegion {
  id: RegionId;
  players: MapPlayer[];
  companies: MapCompany[];
}

type Row = Record<string, unknown>;
const num = (v: unknown): number => Math.max(0, Math.floor(Number(v) || 0));
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

/** Svaret fra `world_map()`; alle seks regionene, i fast rekkefølge, også når serveren mangler noen */
export function parseWorldMap(r: Row | null | undefined): MapRegion[] {
  const rows = Array.isArray(r?.regions) ? (r.regions as Row[]) : [];
  return REGION_IDS.map((id) => {
    const row = rows.find((x) => isRegion(x?.id) && x.id === id);
    const players = Array.isArray(row?.players) ? (row.players as Row[]) : [];
    const companies = Array.isArray(row?.companies) ? (row.companies as Row[]) : [];
    return {
      id,
      players: players
        .map((p) => ({
          nick: str(p.nick) ?? "Ukjent",
          title: str(p.title),
          mine: p.mine === true,
          stalverk: num(p.stalverk),
          storverk: num(p.storverk),
          kompleks: num(p.kompleks),
          building: num(p.building),
        }))
        .filter((p) => p.stalverk + p.storverk + p.kompleks > 0),
      companies: companies.map((c) => ({
        id: num(c.id),
        type: companyType(c.type),
        name: str(c.name) ?? "Selskap",
        owner: str(c.owner),
        mine: c.mine === true,
      })),
    };
  });
}

export async function fetchWorldMap(): Promise<MapRegion[]> {
  return parseWorldMap(await rpc<Row>("world_map", {}));
}
