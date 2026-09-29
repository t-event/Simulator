/**
 * Utbyttepolitikken og Kontroll (B-334, K6 og K7). Regelen står på serveren (`supabase/067_kontroll.sql`): politikken i
 * `pay_dividends`, Kontrollen i `company_control`, fordelen i fornyelsesanbudet i `resolve_tenders`. Her står tallene
 * og ordene appen viser. Endres regelen, endres begge.
 */
import { dividendToTreasury } from "./dividend";
import type { PolicyId } from "./types";

export interface Policy {
  id: PolicyId;
  name: string;
  /** Andelen av driftsresultatet datterverkene holder igjen */
  keep: number;
  about: string;
}

export const POLICIES: Policy[] = [
  { id: "ut", name: "Ta ut", keep: 0.3, about: "Mest til konsernkassa. Som før." },
  {
    id: "balansert",
    name: "Balansert",
    keep: 0.5,
    about: "Litt mindre til kassa. Resten bygger et forsvarsfond.",
  },
  { id: "forsvar", name: "Bygg forsvar", keep: 0.7, about: "Minst til kassa. Fondet vokser raskt." },
];

/** Valget kan endres én gang per ekte uke */
export const POLICY_CHANGE_DAYS = 7;

export function policyOf(id: PolicyId | undefined): Policy {
  return POLICIES.find((p) => p.id === id) ?? POLICIES[0];
}

/** Hva utbyttet blir med politikken: til kassa og til fondet per ekte dag (`full` er utbyttet med 30 % igjen) */
export function policySplit(full: number, id: PolicyId): { kasse: number; fond: number } {
  const kasse = dividendToTreasury(full, policyOf(id).keep);
  return { kasse, fond: Math.max(0, full - kasse) };
}

/** Når politikken kan endres igjen (ekte tid, ms), eller null hvis den kan endres nå */
export function policyLockedUntil(changedAt: number | null | undefined, now: number): number | null {
  if (!changedAt) return null;
  const until = changedAt + POLICY_CHANGE_DAYS * 86_400_000;
  return until > now ? until : null;
}

/** Delene i Kontrollen, med vanlige ord, i fast rekkefølge */
export const CONTROL_PARTS: { key: string; name: string; max: number; how: string }[] = [
  { key: "eier", name: "Du eier selskapet", max: 30, how: "" },
  { key: "aktivitet", name: "Du har spilt den siste uka", max: 20, how: "Spill litt hver uke." },
  { key: "investering", name: "Investeringer i selskapet", max: 25, how: "Invester i selskapet." },
  { key: "region", name: "Egne verk i samme region", max: 10, how: "Bygg eller flytt verk til regionen." },
  { key: "eiertid", name: "Hvor lenge du har eid det", max: 10, how: "Kommer av seg selv, én per uke." },
  { key: "fond", name: "Forsvarsfondet", max: 10, how: "Hold igjen mer av utbyttet." },
  { key: "belastning", name: "Mange selskaper å holde", max: 0, how: "" },
];

export type ControlTone = "ok" | "info" | "heat" | "bad";

/** Kontrollen som ord: sterk (80+), stabil (60–79), presset (40–59), svak (under 40) */
export function controlWord(score: number): { word: string; tone: ControlTone } {
  if (score >= 80) return { word: "Sterk", tone: "ok" };
  if (score >= 60) return { word: "Stabil", tone: "info" };
  if (score >= 40) return { word: "Presset", tone: "heat" };
  return { word: "Svak", tone: "bad" };
}

/** Én setning om hvor mer Kontroll er å hente: den delen som mangler mest */
export function controlAdvice(parts: Record<string, number>): string | null {
  let best: { gap: number; how: string } | null = null;
  for (const p of CONTROL_PARTS) {
    if (!p.how || p.max <= 0) continue;
    const gap = p.max - (parts[p.key] ?? 0);
    if (gap >= 2 && (!best || gap > best.gap)) best = { gap, how: p.how };
  }
  return best?.how ?? null;
}

/** Fordelen i fornyelsesanbudet: budet teller Kontroll × 0,2 % mer, inntil 20 % */
export function renewalBonus(score: number): number {
  return Math.min(0.2, Math.max(0, score) * 0.002);
}

/**
 * Overtakelser (B-335, `068_overtakelser.sql`): bare strategiske selskaper, bud minst verdien, 72 timer forsvar, uten
 * tilfeldighet. Formlene speiler `takeover_attack_of` og `takeover_defense_of`.
 */
export const TAKEOVER = {
  attackW: 60,
  defenseW: 40,
  cap: 3,
  fundCap: 1,
  regionPer: 2.5,
  regionMax: 10,
  toOwner: 0.85,
  failRefund: 0.9,
  defenseRefund: 0.95,
  defenseHours: 72,
};

/** Angrepet: 60 × √(bud / V) × (0,5 + 0,5 × aktivitet) + 2,5 per egne verk i regionen (høyst 10); budet høyst 3 × V */
export function takeoverAttack(bid: number, value: number, activity: number, regionPlants: number): number {
  const t = TAKEOVER;
  const v = Math.max(1, value);
  const a = Math.min(1, Math.max(0, activity));
  return (
    t.attackW * Math.sqrt(Math.min(bid, t.cap * v) / v) * (0.5 + 0.5 * a) +
    Math.min(t.regionMax, t.regionPer * regionPlants)
  );
}

/** Forsvaret: Kontroll + 40 × √((forsvar + fond, fondet høyst V) / V); alt høyst 3 × V */
export function takeoverDefense(control: number, defense: number, fund: number, value: number): number {
  const t = TAKEOVER;
  const v = Math.max(1, value);
  return (
    control + t.defenseW * Math.sqrt(Math.min(t.cap * v, defense + Math.min(Math.max(0, fund), t.fundCap * v)) / v)
  );
}

/** Hvorfor et bud ikke kan legges inn nå, med vanlige ord */
export const TAKEOVER_REASON: Record<string, string> = {
  pagar: "Noen prøver allerede å overta selskapet.",
  ett: "Du har allerede et forsøk på gang – ett om gangen.",
  vern: "Ny eier er beskyttet de 3 første dagene.",
  sent: "Konsesjonen går snart ut – vent på det nye anbudet.",
  pause: "Selskapet ble forsøkt overtatt nylig – 14 dagers pause.",
  belop: "Budet må være minst verdien av selskapet.",
  kasse: "Det er ikke nok i konsernkassa.",
  eier: "Det går ikke med dette selskapet.",
  av: "Overtakelser er ikke slått på ennå.",
  sperret: "Kontoen er sperret mens topplista sjekker den.",
  nett: "Fikk ikke kontakt med serveren. Prøv igjen om litt.",
};
