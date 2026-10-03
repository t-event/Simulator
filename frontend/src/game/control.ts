/**
 * Utbyttepolitikken og Kontroll (B-334, K6 og K7). Regelen står på serveren (`supabase/067_kontroll.sql`): politikken i
 * `pay_dividends`, Kontrollen i `company_control`. Her står tallene og ordene appen viser. Endres regelen, endres begge.
 * Fordelen i fornyelsesanbudet (B-334) er tatt bort i B-337: når konsesjonen går ut, stiller alle likt.
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
  { id: "ut", name: "Ta ut", keep: 0.3, about: "Alt til konsernkassa, ingenting til fondet." },
  {
    id: "balansert",
    name: "Balansert",
    keep: 0.5,
    about: "Litt mindre til kassa. Resten går til beredskapsfondet.",
  },
  { id: "forsvar", name: "Bygg beredskap", keep: 0.7, about: "Minst til kassa. Beredskapsfondet vokser raskt." },
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
  { key: "investering", name: "Investeringer i selskapet", max: 25, how: "Invester i selskapet (feltet under)." },
  {
    key: "region",
    name: "Egne verk i samme region",
    max: 10,
    how: "Ha flere datterverk i samme region som selskapet.",
  },
  {
    key: "eiertid",
    name: "Hvor lenge du har eid det",
    max: 10,
    how: "Kommer av seg selv: +1 for hver uke du eier det.",
  },
  {
    key: "fond",
    name: "Beredskapsfondet",
    max: 10,
    how: "Velg «Balansert» eller «Bygg beredskap» i utbyttepolitikken.",
  },
  { key: "belastning", name: "Mange selskaper å holde", max: 0, how: "" },
];

export type ControlTone = "ok" | "info" | "heat" | "bad";

/**
 * Kontrollen som ord: sterk (80+), god (60–79), middels (40–59), svak (under 40). «Presset» og «stabil» ble byttet ut
 * (B-370): «presset» ble lest som at noen prøvde å ta selskapet.
 */
export function controlWord(score: number): { word: string; tone: ControlTone } {
  if (score >= 80) return { word: "Sterk", tone: "ok" };
  if (score >= 60) return { word: "God", tone: "info" };
  if (score >= 40) return { word: "Middels", tone: "heat" };
  return { word: "Svak", tone: "bad" };
}

/** Én setning om hvor mer Kontroll er å hente: den delen som mangler mest */
export function controlAdvice(parts: Record<string, number>): string | null {
  return controlSteps(parts)[0]?.how ?? null;
}

/**
 * Det som kan gi mer Kontroll, med det som mangler mest først (B-370). Deler som nesten er fulle, er ikke med, og det
 * som kommer av seg selv (eiertiden), står sist. Fondet foreslås bare når politikken er «Ta ut»: med en annen politikk
 * vokser det alt, og det gir lite før det er stort i forhold til selskapet.
 */
export function controlSteps(
  parts: Record<string, number>,
  policy: PolicyId = "ut",
): { key: string; name: string; gap: number; how: string }[] {
  return CONTROL_PARTS.filter((p) => p.how && p.max > 0 && (p.key !== "fond" || policy === "ut"))
    .map((p) => ({ key: p.key, name: p.name, gap: p.max - (parts[p.key] ?? 0), how: p.how }))
    .filter((p) => p.gap >= 2)
    .sort((a, b) => +(a.key === "eiertid") - +(b.key === "eiertid") || b.gap - a.gap);
}

/** Delen «investeringer» som på serveren (`company_control`): 25 × (1 − e^(−investert / verdien)) */
export function investPart(invested: number, value: number): number {
  return 25 * (1 - Math.exp(-Math.max(0, invested) / Math.max(1, value)));
}

/** Kontrollen hvis eieren investerer `extra` til (forhåndsvisning i appen, B-370) */
export function controlAfterInvest(
  ctl: { score: number; parts: Record<string, number>; invested: number; value: number },
  extra: number,
): number {
  const before = ctl.parts.investering ?? 0;
  const after = Math.round(investPart(ctl.invested + extra, ctl.value) * 10) / 10;
  return Math.max(0, Math.min(100, Math.round(ctl.score - before + after)));
}

/**
 * Overtakelser (B-335, `068_overtakelser.sql`): bare strategiske selskaper, bud minst verdien, 72 timer forsvar, uten
 * tilfeldighet. Formlene speiler `takeover_attack_of` og `takeover_defense_of`. Budet teller inntil 10 × verdien, forsvaret
 * høyst 3 × verdien (B-337, `069`): eieren kan alltid miste selskapet til en aktiv angriper med stort nok bud. Tallene
 * for forsvaret og tilbakebetalingen her er regelsett 1; regelsett 2 (B-441) står i `TAKEOVER_V2`.
 */
export const TAKEOVER = {
  attackW: 60,
  defenseW: 40,
  /** Forsvaret teller høyst 3 × verdien */
  cap: 3,
  /** Angriperens bud teller høyst 10 × verdien (B-337) */
  attackCap: 10,
  fundCap: 1,
  regionPer: 2.5,
  regionMax: 10,
  /** Eieren får aldri mer enn 85 % av budet (B-375) */
  toOwner: 0.85,
  /** … men ellers dagene hen mister og 85 % av det hen investerte i sin periode (B-375) */
  investBack: 0.85,
  failRefund: 0.9,
  defenseRefund: 0.95,
  defenseHours: 72,
  /** Ny eier er vernet de første dagene (`protect_days`) */
  protectDays: 3,
  /** Kjøperen eier selskapet minst så mange dager fra kjøpet (`config.world.concession_days`, `resolve_takeovers`) */
  ownDays: 14,
};

/** Angrepet: 60 × √(bud / V) × (0,5 + 0,5 × aktivitet) + 2,5 per egne verk i regionen (høyst 10); budet høyst 10 × V */
export function takeoverAttack(bid: number, value: number, activity: number, regionPlants: number): number {
  const t = TAKEOVER;
  const v = Math.max(1, value);
  const a = Math.min(1, Math.max(0, activity));
  return (
    t.attackW * Math.sqrt(Math.min(bid, t.attackCap * v) / v) * (0.5 + 0.5 * a) +
    Math.min(t.regionMax, t.regionPer * regionPlants)
  );
}

/**
 * Regelsettet et oppkjøpsbud avgjøres etter (B-441, `takeovers.rules`): 1 = slik det var til 3.10.2026 (bud som var lagt
 * inn da, avgjøres slik), 2 = alle nye bud.
 */
export type TakeoverRules = 1 | 2;

/**
 * Regelsett 2 (B-441, `123_oppkjop_v2.sql`): vinneren betaler, den som taper, får 75 % tilbake, motbudet teller som budet
 * (inntil 5 × V), Kontrollen gir høyst 20 poeng, fondet teller bare når det brukes, og 14 dagers pause etter et forsøk
 * som ikke lyktes. Budet teller fortsatt inntil 10 × V, så eieren kan alltid miste selskapet (B-337).
 */
export const TAKEOVER_V2 = {
  defenseW: 60,
  /** Motbudet teller høyst 5 × verdien */
  cap: 5,
  /** Kontroll 100 gir så mange poeng */
  controlMax: 20,
  /** Den som taper, mister så mye av pengene sine (går til ingen) */
  loseFee: 0.25,
  /** Dager uten nye bud etter et forsøk som ikke lyktes (`cooldown_days`) */
  pauseDays: 14,
  /** Et overbud fra en annen spiller må være minst 5 % og minst 1 mill. over budet som står (B-442, `takeover_min_raise`) */
  raiseStep: 0.05,
  raiseMin: 1_000_000,
  /** Kommer et bud de siste 12 timene, flyttes fristen til 12 timer etter budet (B-442, `extend_hours`) */
  extendHours: 12,
  /** Verdien er så mange dagers inntekt (`config.world.control.value_days`) */
  valueDays: 10,
  /** Minstebudet er aldri over så mange dagers inntekt (B-451, `min_bid_cap_days`) */
  minBidCapDays: 12,
};

/**
 * Minstebudet for et nytt oppkjøpsforsøk (B-451, speiler `takeover_min_bid`): det høyeste av 10 dagers inntekt og siste
 * anbudspris, men aldri over 12 dagers inntekt. Verdien (`company_value`) er det høyeste av 10 dagers inntekt og siste
 * anbudspris, så minstebudet kan regnes av verdien og inntekten alene. Uten inntektsanslag er det verdien, som før.
 * Verdien er fortsatt skalaen for budstyrke, motbud og Kontroll – bare minstebudet er begrenset.
 */
export function takeoverMinBid(value: number, perDay: number): number {
  const t = TAKEOVER_V2;
  if (perDay <= 0) return value;
  return Math.max(t.valueDays * perDay, Math.min(value, t.minBidCapDays * perDay));
}

/** Minste overbud på et bud som står (B-442, speiler `takeover_min_raise`) */
export function minOutbid(bid: number): number {
  const t = TAKEOVER_V2;
  return Math.round(bid + Math.max(t.raiseMin, Math.ceil(bid * t.raiseStep)));
}

/**
 * Forsvaret. Regelsett 1: Kontroll + 40 × √((motbud + fond, fondet høyst V) / V), høyst 3 × V. Regelsett 2: Kontroll / 5
 * + 60 × √(motbud / V), høyst 5 × V – fondet teller bare når det er lagt inn som motbud (da er det med i `defense`).
 */
export function takeoverDefense(
  control: number,
  defense: number,
  fund: number,
  value: number,
  rules: TakeoverRules,
): number {
  const v = Math.max(1, value);
  if (rules === 2) {
    const t = TAKEOVER_V2;
    const ctl = (Math.min(100, Math.max(0, control)) / 100) * t.controlMax;
    return ctl + t.defenseW * Math.sqrt(Math.min(t.cap * v, Math.max(0, defense)) / v);
  }
  const t = TAKEOVER;
  return (
    control + t.defenseW * Math.sqrt(Math.min(t.cap * v, defense + Math.min(Math.max(0, fund), t.fundCap * v)) / v)
  );
}

/**
 * Hvor stort bud en aktiv spiller uten egne verk i regionen trenger for å ta selskapet hvis eieren ikke setter inn noe
 * forsvar (B-370). Minst minstebudet (verdien, eller lavere med B-451), høyst 10 × verdien. Et tall eieren forstår bedre
 * enn poengene.
 */
export function bidToTake(
  control: number,
  fund: number,
  value: number,
  rules: TakeoverRules,
  minBid: number = value,
): number {
  const v = Math.max(1, value);
  const d = takeoverDefense(control, 0, fund, v, rules);
  const need = v * (d / TAKEOVER.attackW) ** 2;
  return Math.max(minBid, Math.min(need, TAKEOVER.attackCap * v));
}

/**
 * Hvor mye mer forsvar (kroner) eieren må sette inn for å stå imot et angrep som står nå (B-370): 0 hvis forsvaret alt
 * holder, null hvis det ikke går (angrepet er sterkere enn det største forsvaret). Litt over der det går – men likt
 * holder: serveren lar eieren beholde selskapet når angrep og forsvar står likt (`att > def` i `resolve_takeovers`, B-429).
 */
export function defenseNeeded(
  attack: number,
  control: number,
  defense: number,
  fund: number,
  value: number,
  rules: TakeoverRules,
): number | null {
  const v = Math.max(1, value);
  if (takeoverDefense(control, defense, fund, v, rules) >= attack) return 0;
  const w = rules === 2 ? TAKEOVER_V2.defenseW : TAKEOVER.defenseW;
  const cap = rules === 2 ? TAKEOVER_V2.cap : TAKEOVER.cap;
  const ctl = rules === 2 ? (Math.min(100, Math.max(0, control)) / 100) * TAKEOVER_V2.controlMax : control;
  // Taket sjekkes mot det som akkurat holder, ikke mot tallet med slingring (B-427): nær taket sa rådet før «går ikke»
  // om et motbud som vinner på serveren. Slingringen kuttes ved taket – alt under taket gir likevel et sterkere forsvar
  const exact = v * ((attack - ctl) / w) ** 2;
  if (exact > cap * v) return null;
  const total = Math.min(exact * 1.01, cap * v);
  const f = rules === 2 ? 0 : Math.min(Math.max(0, fund), TAKEOVER.fundCap * v);
  return Math.max(0, Math.ceil(total - defense - f));
}

/** Andelen kjøperen får tilbake når budet ikke holder (regelsett 1: 90 %, 2: 75 %) */
export function bidBack(rules: TakeoverRules): number {
  return rules === 2 ? 1 - TAKEOVER_V2.loseFee : TAKEOVER.failRefund;
}

/**
 * Andelen av motbudet eieren får tilbake (`takeover_refund`): regelsett 1 95 % uansett; regelsett 2 ingenting når
 * motbudet holder (det er brukt opp) og 75 % når selskapet blir kjøpt likevel
 */
export function defenseBack(rules: TakeoverRules, sold: boolean): number {
  if (rules === 1) return TAKEOVER.defenseRefund;
  return sold ? 1 - TAKEOVER_V2.loseFee : 0;
}

/** Det serveren sier om eierens periode (B-375, `company_control` → `buyout`) */
export interface Buyout {
  perDay: number;
  daysLeft: number;
  investedKasse: number;
  investedFond: number;
}

/**
 * Hva eieren får hvis selskapet blir kjøpt (B-375): inntekten for dagene som er igjen pluss 85 % av det hen investerte
 * fra kassa, høyst 85 % av budet. Det som ble investert fra beredskapsfondet, går tilbake til fondet (85 %), innenfor
 * samme tak. Speiler `takeover_payout` i `087_oppkjop_betaling.sql`.
 */
export function buyoutPay(bid: number, b: Buyout): { kasse: number; fond: number } {
  const t = TAKEOVER;
  const cap = Math.max(0, bid) * t.toOwner;
  const kasse = Math.min(
    cap,
    Math.max(0, b.perDay) * Math.max(0, b.daysLeft) + t.investBack * Math.max(0, b.investedKasse),
  );
  const fond = Math.max(0, Math.min(cap - kasse, t.investBack * Math.max(0, b.investedFond)));
  return { kasse: Math.round(kasse), fond: Math.round(fond) };
}

/**
 * Lønner budet seg (B-435)? Står budet sterkest når det avgjøres, eier kjøperen selskapet til konsesjonen går ut, men
 * minst `ownDays` dager fra kjøpet – bare til konsesjonen går ut hvis anbudet om neste periode alt er åpent (som
 * `resolve_takeovers`). Inntekten regnes med det selskapet tjener nå, så den er et anslag. Holder ikke budet, får
 * kjøperen 90 % (regelsett 1) eller 75 % (regelsett 2) tilbake.
 */
export function takeoverPayoff(p: {
  bid: number;
  perDay: number;
  /** Når budet avgjøres (ms) */
  decidedAt: number;
  /** Når eierens periode går ut (ms), eller null */
  concessionUntil: number | null;
  /** Anbudet om neste periode er åpent */
  renewalOpen: boolean;
  rules: TakeoverRules;
}): { days: number; income: number; net: number; back: number } {
  const day = 86_400_000;
  const left = p.concessionUntil === null ? 0 : Math.max(0, (p.concessionUntil - p.decidedAt) / day);
  const days = p.renewalOpen ? left : Math.max(left, TAKEOVER.ownDays);
  const income = Math.max(0, p.perDay) * days;
  return {
    days,
    income: Math.round(income),
    net: Math.round(income - Math.max(0, p.bid)),
    back: Math.round(Math.max(0, p.bid) * bidBack(p.rules)),
  };
}

/** Det mest eieren kan få i kassa ved et oppkjøp nå, uansett bud (dagene som er igjen og investeringene) */
export function buyoutMax(b: Buyout): number {
  return Math.round(
    Math.max(0, b.perDay) * Math.max(0, b.daysLeft) + TAKEOVER.investBack * Math.max(0, b.investedKasse),
  );
}

/** Når vernet for en ny eier slutter (ms), eller null hvis det er over. `since` er når eieren tok over */
export function protectedUntil(since: string | null | undefined, now: number): number | null {
  if (!since) return null;
  const until = Date.parse(since) + TAKEOVER.protectDays * 86_400_000;
  return Number.isFinite(until) && until > now ? until : null;
}

/** Hvorfor et bud ikke kan legges inn nå, med vanlige ord */
export const TAKEOVER_REASON: Record<string, string> = {
  pagar: "Noen har allerede lagt inn et oppkjøpsbud på selskapet.",
  ett: "Du har allerede et oppkjøpsbud på gang – ett om gangen.",
  vern: "Ny eier er vernet de 3 første dagene.",
  sent: "Konsesjonen går snart ut – vent på det nye anbudet.",
  pause: "Et oppkjøpsbud på selskapet holdt ikke nylig – 14 dagers pause før neste.",
  belop: "Budet er lavere enn minstebudet.",
  overbud: "Overbudet er for lite: det må være minst 5 % over budet som står, og gi et sterkere bud.",
  okning: "En økning må være minst 5 % over budet ditt.",
  svak: "Du kan ikke by over: selv det største budet ville vært svakere enn det som står (spill hver uke for et sterkere bud).",
  endret: "Budet har endret seg siden du så det. Sjekk tallene og prøv igjen.",
  kasse: "Det er ikke nok i konsernkassa.",
  eier: "Det går ikke med dette selskapet.",
  av: "Oppkjøp er ikke slått på ennå.",
  sperret: "Kontoen er sperret mens topplista sjekker den.",
  nett: "Fikk ikke kontakt med serveren. Prøv igjen om litt.",
};
