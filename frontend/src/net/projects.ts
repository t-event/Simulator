/**
 * Regionale fellesprosjekter (B-508, supabase/156_fellesprosjekter.sql): ett prosjekt per region i ekte tid, med et mål
 * og en frist. Alle med ferdige verk i regionen kan gi fra konsernkassa. Når målet nås, er pengene brukt, og de som ga
 * mest, får merker og regionmester-styrke i 30 dager; når fristen går ut, kommer halvparten tilbake. Serveren avgjør
 * alt; appen viser svaret. Krever konto.
 */
import { isRegion } from "../game/regions";
import type { RegionId } from "../game/types";
import { rpc } from "./supabase";

export interface ProjectTop {
  nick: string;
  /** Andelen av målet (0–1) – andres beløp vises aldri */
  share: number;
  mine: boolean;
}

export interface RegionProject {
  id: number;
  region: RegionId;
  kind: string;
  name: string;
  goal: number;
  total: number;
  openedAt: number;
  deadline: number;
  status: "apen" | "ferdig" | "bom";
  settledAt: number | null;
  boostUntil: number | null;
  /** Det du har gitt (kr) */
  mine: number;
  /** Det du fikk tilbake da målet ikke ble nådd */
  refunded: number | null;
  givers: number;
  top: ProjectTop[];
  myRank: number | null;
}

export interface ProjectStatus {
  enabled: boolean;
  minGift: number;
  refund: number;
  boostTop1: number;
  boostTop2: number;
  boostDays: number;
  badgeShare: number;
  balance: number;
  /** Regionene der du har ferdige verk – bare der kan du gi */
  myRegions: RegionId[];
  projects: RegionProject[];
}

type Row = Record<string, unknown>;
const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Row[]) : []);
const num = (v: unknown): number => Number(v) || 0;
const time = (v: unknown): number => (typeof v === "string" ? Date.parse(v) || 0 : 0);
const timeOrNull = (v: unknown): number | null => (typeof v === "string" ? Date.parse(v) || null : null);
const status = (v: unknown): RegionProject["status"] => (v === "ferdig" || v === "bom" ? v : "apen");

export function parseProjectStatus(r: Row | null | undefined): ProjectStatus {
  return {
    enabled: r?.enabled === true,
    minGift: num(r?.min_gift) || 1_000_000,
    refund: r?.refund == null ? 0.5 : num(r.refund),
    boostTop1: r?.boost_top1 == null ? 0.25 : num(r.boost_top1),
    boostTop2: r?.boost_top2 == null ? 0.1 : num(r.boost_top2),
    boostDays: num(r?.boost_days) || 30,
    badgeShare: r?.badge_share == null ? 0.1 : num(r.badge_share),
    balance: num(r?.balance),
    myRegions: (Array.isArray(r?.my_regions) ? (r.my_regions as unknown[]) : []).filter(isRegion),
    projects: arr(r?.projects)
      .filter((p) => isRegion(p.region))
      .map((p) => ({
        id: num(p.id),
        region: p.region as RegionId,
        kind: String(p.kind ?? ""),
        name: String(p.name ?? "Fellesprosjekt"),
        goal: num(p.goal),
        total: num(p.total),
        openedAt: time(p.opened_at),
        deadline: time(p.deadline),
        status: status(p.status),
        settledAt: timeOrNull(p.settled_at),
        boostUntil: timeOrNull(p.boost_until),
        mine: num(p.mine),
        refunded: p.refunded == null ? null : num(p.refunded),
        givers: num(p.givers),
        top: arr(p.top).map((t) => ({ nick: String(t.nick ?? "Ukjent"), share: num(t.share), mine: t.mine === true })),
        myRank: p.my_rank == null ? null : num(p.my_rank),
      }))
      .filter((p) => p.goal > 0),
  };
}

export async function fetchProjects(): Promise<ProjectStatus> {
  return parseProjectStatus(await rpc<Row>("project_status", {}));
}

export type GiveRefusal = "av" | "sperret" | "ferdig" | "frist" | "lite" | "region" | "kassa" | "nett";

export const GIVE_REFUSAL_TEXT: Record<GiveRefusal, string> = {
  av: "Fellesprosjektene er ikke åpnet ennå.",
  sperret: "Kontoen kan ikke gi til fellesprosjekter nå.",
  ferdig: "Prosjektet er alt avgjort.",
  frist: "Fristen er ute. Prosjektet avgjøres i løpet av noen minutter.",
  lite: "Det minste du kan gi, er 1 mill. kr.",
  region: "Du trenger et ferdig verk i regionen for å gi til prosjektet der.",
  kassa: "Konsernkassa har ikke så mye.",
  nett: "Fikk ikke kontakt med serveren. Prøv igjen.",
};

export type GiveResult =
  | { ok: true; amount: number; done: boolean; balance: number }
  | { ok: false; reason: GiveRefusal };

/** Gi fra konsernkassa. Serveren tar aldri mer enn det som mangler til målet */
export async function giveToProject(project: number, amount: number): Promise<GiveResult> {
  let r: Row | null;
  try {
    r = await rpc<Row>("project_give", { p_project: project, p_amount: Math.round(amount) });
  } catch {
    return { ok: false, reason: "nett" };
  }
  if (r?.ok === true) return { ok: true, amount: num(r.amount), done: r.done === true, balance: num(r.balance) };
  const reason = typeof r?.reason === "string" && r.reason in GIVE_REFUSAL_TEXT ? (r.reason as GiveRefusal) : "nett";
  return { ok: false, reason };
}
