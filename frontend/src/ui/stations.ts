import { upgradeOptions, type UpgradeOption } from "../game/actions";
import type { GameState } from "../game/types";

/** Stedet i anlegget et utstyr hører til. Utstyret kjøpes der det brukes (B-023). */
export type Station = "skrap" | "ovn" | "stoping" | "lager" | "kvalitet" | "vedlikehold";

export const STATION_NAMES: Record<Station, string> = {
  skrap: "Skraplager",
  ovn: "Ovn",
  stoping: "Støping og valsing",
  lager: "Lager og salg",
  kvalitet: "Kvalitet og analyse",
  vedlikehold: "Vedlikehold",
};

const ADDON_STATION: Record<string, Station> = {
  lager: "lager",
  salgskontor: "lager",
  portal: "skrap",
  sortering: "skrap",
  xrf: "kvalitet",
  oes: "kvalitet",
  verksted: "vedlikehold",
  ovn2: "ovn",
  renseanlegg: "ovn",
  oseovn: "ovn",
  conveyor: "ovn",
  trafo: "ovn",
  valseverk: "stoping",
};

function stationOf(o: UpgradeOption): Station | null {
  if (o.kind === "furnace") return "ovn";
  if (o.kind === "casting") return "stoping";
  if (o.kind === "addon") return ADDON_STATION[o.id] ?? "lager";
  return null;
}

/** Utstyr for et sted: det som finnes nå og på neste nivå (resten er ikke interessant ennå). */
export function stationOptions(g: GameState, station: Station): UpgradeOption[] {
  return upgradeOptions(g).filter((o) => stationOf(o) === station && o.stage <= g.stage + 1);
}

/** Utstyr i anlegget som kan kjøpes nå og som du har råd til – vises som merke på Anlegg (B-061) */
export function readyUpgrades(g: GameState): number {
  return upgradeOptions(g).filter((o) => stationOf(o) !== null && o.available && o.stage <= g.stage).length;
}
