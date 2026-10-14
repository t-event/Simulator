/**
 * Verksjefer for datterverkene (B-488, docs/VERKSJEF-FORSLAG.md avsnitt 10): reglene speilet fra serveren
 * (supabase/152_verksjefer.sql, `config.world.managers`). Serveren avgjør alt – ansettelse, lønn, virkningen på
 * utbyttet og samtalene. Appen bruker dette til å vise tall før man velger, til testene og til simuleringen
 * (`npx tsx src/game/managerSim.ts`). Endres et tall her, endres det i SQL-en (og omvendt).
 */
import type { SisterType } from "./types";

export type Mandate = "lonnsomhet" | "vekst" | "stabilitet";
export type Trait = "forsiktig" | "aergjerrig" | "sparsom" | "lojal";

export interface ManagerStats {
  drift: number;
  okonomi: number;
  folk: number;
}

export const MANDATES: Mandate[] = ["lonnsomhet", "vekst", "stabilitet"];
export const TRAITS: Trait[] = ["forsiktig", "aergjerrig", "sparsom", "lojal"];

export const MANDATE_NAME: Record<Mandate, string> = {
  lonnsomhet: "Lønnsomhet",
  vekst: "Vekst",
  stabilitet: "Stabilitet",
};

export const MANDATE_ABOUT: Record<Mandate, string> = {
  lonnsomhet: "Mest mulig utbytte nå. Moderniseringer av verket koster 20 % mer og tar 25 % lenger.",
  vekst: "Billigere og raskere modernisering av verket, men 5 % mindre utbytte.",
  stabilitet: "Jevn drift: dårlige utfall i samtalene kommer halvparten så ofte. Gir lite mer i utbytte.",
};

export const TRAIT_NAME: Record<Trait, string> = {
  forsiktig: "Forsiktig",
  aergjerrig: "Ærgjerrig",
  sparsom: "Sparsom",
  lojal: "Lojal",
};

/** Hva verksjefen velger når du ikke svarer innen fristen */
export const TRAIT_ABOUT: Record<Trait, string> = {
  forsiktig: "velger det tryggeste når du ikke svarer",
  aergjerrig: "velger det som kan gi mest når du ikke svarer",
  sparsom: "velger det billigste når du ikke svarer",
  lojal: "velger det som passer mandatet når du ikke svarer",
};

/** Tallene (startverdier, B-488) – samme som `config.world.managers` */
export const MANAGERS = {
  salaryMin: 0.03,
  salaryMax: 0.06,
  sumMin: 6,
  sumMax: 10,
  vekstFactor: 0.95,
  lonnModCost: 1.2,
  lonnModTime: 1.25,
  severanceDays: 5,
  quarantineDays: 3,
  mandateDays: 7,
  callDeadlineH: 48,
  stabilityRisk: 0.5,
};

/** Lønnen som andel av verkets utbytte: 3 % (sum 6) til 6 % (sum 10) */
export function salaryShare(s: ManagerStats): number {
  const sum = s.drift + s.okonomi + s.folk;
  const t = Math.max(0, Math.min(1, (sum - MANAGERS.sumMin) / (MANAGERS.sumMax - MANAGERS.sumMin)));
  return Math.round((MANAGERS.salaryMin + (MANAGERS.salaryMax - MANAGERS.salaryMin) * t) * 10000) / 10000;
}

/** Faktoren på verkets del av utbyttet etter mandatet (før lønnen) */
export function mandateFactor(m: Mandate, s: ManagerStats): number {
  if (m === "lonnsomhet") return 0.92 + 0.04 * ((s.drift + s.okonomi) / 2);
  if (m === "vekst") return MANAGERS.vekstFactor;
  // 0,99–1,03 (B-488): spesifikasjonens 0,96 + 0,01 × Folk ga alltid minus, og V0 er ikke live – med en god Folk-verksjef
  // går Stabilitet omtrent i null, og fordelen er samtalene (halvparten så ofte dårlig utfall)
  return 0.98 + 0.01 * s.folk;
}

/** Netto andel av verkets utbytte: faktoren minus 1 minus lønnen (f.eks. +0,04 = 4 % mer) */
export function netShare(m: Mandate, s: ManagerStats): number {
  return mandateFactor(m, s) - 1 - salaryShare(s);
}

/** Pris og tid på en modernisering av verket etter mandatet (1 = som uten verksjef) */
export function modFactors(
  m: Mandate | null | undefined,
  s: ManagerStats | null | undefined,
): { cost: number; time: number } {
  if (!m || !s) return { cost: 1, time: 1 };
  if (m === "lonnsomhet") return { cost: MANAGERS.lonnModCost, time: MANAGERS.lonnModTime };
  if (m === "vekst") return { cost: 1 - (0.1 + 0.03 * s.drift), time: 1 - (0.1 + 0.04 * s.drift) };
  return { cost: 1, time: 1 };
}

/** Alle lovlige kandidater: 1–5 stjerner, sum 6–10, aldri 5 på to egenskaper («ingen perfekt leder») */
export function legalStats(): ManagerStats[] {
  const out: ManagerStats[] = [];
  for (let drift = 1; drift <= 5; drift++)
    for (let okonomi = 1; okonomi <= 5; okonomi++)
      for (let folk = 1; folk <= 5; folk++) {
        const sum = drift + okonomi + folk;
        const fives = +(drift === 5) + +(okonomi === 5) + +(folk === 5);
        if (sum >= MANAGERS.sumMin && sum <= MANAGERS.sumMax && fives <= 1) out.push({ drift, okonomi, folk });
      }
  return out;
}

// ---------- Samtalene: «Verksjefen ringer» (V2) ----------

/** Virkning på verket: engangsbeløp (`cash`, dager av verkets utbytte) og/eller en tidsbegrenset faktor */
export interface CallEffect {
  /** Engangsbeløp i dager av verkets utbytte (negativt = koster) */
  cash?: number;
  /** Antall ekte dager faktoren varer */
  days?: number;
  /** Faktor på verkets utbytte i de dagene */
  factor?: number;
}

export interface CallOption {
  label: string;
  /** Hva verksjefen sier om valget */
  about: string;
  /** Hvilke trekk som velger dette selv: trygg, dristig, billig – og mandatet som passer */
  tags: ("trygg" | "dristig" | "billig")[];
  mandate: Mandate;
  /** Det som skjer */
  sure?: CallEffect;
  /** Med sjansen `chance` skjer `effect` i stedet for `sure` – alltid det dårlige utfallet; Stabilitet halverer sjansen */
  risk?: { chance: number; effect: CallEffect };
  /** Bare i «Tilbud fra en konkurrent» (V3): lønnstillegg eller at verksjefen slutter */
  special?: "raise" | "leave";
}

export interface CallCard {
  id: string;
  title: string;
  text: string;
  options: [CallOption, CallOption];
  /** Kommer ikke i den vanlige trekningen, bare når verksjefen trives dårlig (V3) */
  special?: boolean;
}

/** Samme kort og tall som `config.world.managers.cards` på serveren */
export const CALL_CARDS: CallCard[] = [
  {
    id: "foring",
    title: "Ovnen bør fores om",
    text: "Foringen i ovn 2 er slitt. Vi kan fore om nå, eller kjøre videre og håpe den holder.",
    options: [
      {
        label: "For om nå",
        about: "Koster omtrent én dags utbytte, men vi er trygge.",
        tags: ["trygg"],
        mandate: "stabilitet",
        sure: { cash: -1 },
      },
      {
        label: "Kjør videre",
        about: "Ingen kostnad nå, men 35 % sjanse for fem dager med halv drift.",
        tags: ["dristig", "billig"],
        mandate: "lonnsomhet",
        risk: { chance: 0.35, effect: { days: 5, factor: 0.5 } },
      },
    ],
  },
  {
    id: "lonn",
    title: "Lønnskrav",
    text: "Fagforeningen ber om 4 % mer i lønn. Sier vi nei, kan det bli en kort streik.",
    options: [
      {
        label: "Si ja",
        about: "Litt lavere utbytte de neste ti dagene.",
        tags: ["trygg"],
        mandate: "stabilitet",
        sure: { days: 10, factor: 0.97 },
      },
      {
        label: "Si nei",
        about: "Ingen kostnad nå, men 30 % sjanse for tre dager streik.",
        tags: ["dristig", "billig"],
        mandate: "lonnsomhet",
        risk: { chance: 0.3, effect: { days: 3, factor: 0.3 } },
      },
    ],
  },
  {
    id: "hastejobb",
    title: "Hastejobb",
    text: "En kunde vil ha en hastejobb til god pris. Da må vi utsette vedlikeholdet noen dager.",
    options: [
      {
        label: "Ta jobben",
        about: "Tre gode dager, men 30 % sjanse for at det går galt og gir seks svake dager i stedet.",
        tags: ["dristig"],
        mandate: "lonnsomhet",
        sure: { days: 3, factor: 1.25 },
        risk: { chance: 0.3, effect: { days: 6, factor: 0.9 } },
      },
      {
        label: "Si nei",
        about: "Vi holder planen.",
        tags: ["trygg", "billig"],
        mandate: "stabilitet",
      },
    ],
  },
  {
    id: "styring",
    title: "Ny styring av ovnene",
    text: "Leverandøren tilbyr et nytt styresystem for ovnene. Det koster nå, men gir mer i to uker.",
    options: [
      {
        label: "Kjøp det",
        about: "Koster to dagers utbytte, gir 15 % mer i 14 dager.",
        tags: ["dristig"],
        mandate: "vekst",
        sure: { cash: -2, days: 14, factor: 1.15 },
      },
      {
        label: "Vent",
        about: "Vi bruker ikke penger nå.",
        tags: ["trygg", "billig"],
        mandate: "lonnsomhet",
      },
    ],
  },
  {
    id: "laerling",
    title: "Lærlinger",
    text: "Vi kan ta inn et kull lærlinger. Det koster litt nå, men gjør skiftene sterkere.",
    options: [
      {
        label: "Ta dem inn",
        about: "Koster en halv dags utbytte, gir 6 % mer i ti dager.",
        tags: ["trygg"],
        mandate: "vekst",
        sure: { cash: -0.5, days: 10, factor: 1.06 },
      },
      {
        label: "Ikke nå",
        about: "Vi holder kostnadene nede.",
        tags: ["billig"],
        mandate: "lonnsomhet",
      },
    ],
  },
  {
    id: "strom",
    title: "Strømavtalen",
    text: "Strømavtalen må fornyes. Fastpris er trygt, spotpris kan gi mer – eller mindre.",
    options: [
      {
        label: "Fastpris",
        about: "Litt dyrere de neste ti dagene, men ingen overraskelser.",
        tags: ["trygg"],
        mandate: "stabilitet",
        sure: { days: 10, factor: 0.98 },
      },
      {
        label: "Spotpris",
        about: "Halvparten av gangene 6 % mer i ti dager, ellers 8 % mindre.",
        tags: ["dristig", "billig"],
        mandate: "lonnsomhet",
        sure: { days: 10, factor: 1.06 },
        risk: { chance: 0.5, effect: { days: 10, factor: 0.92 } },
      },
    ],
  },
  {
    id: "messe",
    title: "Kundemesse",
    text: "Det er en stor kundemesse neste uke. En stand koster litt, men gir nye ordrer.",
    options: [
      {
        label: "Bli med",
        about: "Koster en tredjedel av en dags utbytte, gir 6 % mer i sju dager.",
        tags: ["dristig"],
        mandate: "lonnsomhet",
        sure: { cash: -0.3, days: 7, factor: 1.06 },
      },
      {
        label: "Stå over",
        about: "Vi bruker ikke penger på det nå.",
        tags: ["trygg", "billig"],
        mandate: "stabilitet",
      },
    ],
  },
  {
    id: "skrapparti",
    title: "Billig skrapparti",
    text: "Et stort skrapparti er til salgs billig. Det binder penger, men gir god margin en uke.",
    options: [
      {
        label: "Kjøp partiet",
        about: "Koster én dags utbytte, gir 18 % mer i sju dager.",
        tags: ["dristig"],
        mandate: "vekst",
        sure: { cash: -1, days: 7, factor: 1.18 },
      },
      {
        label: "La det gå",
        about: "Vi kjøper som vanlig.",
        tags: ["trygg", "billig"],
        mandate: "stabilitet",
      },
    ],
  },
  {
    id: "vedlikehold",
    title: "Kranene trenger vedlikehold",
    text: "Traverskranene bør gås over. Vi kan stoppe litt nå, eller vente og håpe de holder.",
    options: [
      {
        label: "Stopp nå",
        about: "To dager med 30 % mindre drift mens kranene gås over.",
        tags: ["trygg"],
        mandate: "stabilitet",
        sure: { days: 2, factor: 0.7 },
      },
      {
        label: "Vent",
        about: "Ingen stans nå, men 30 % sjanse for fire dager med halv drift.",
        tags: ["dristig", "billig"],
        mandate: "lonnsomhet",
        risk: { chance: 0.3, effect: { days: 4, factor: 0.5 } },
      },
    ],
  },
  {
    id: "elektroder",
    title: "Billigere elektroder",
    text: "En ny leverandør tilbyr billigere elektroder, men de er ikke prøvd i ovnene våre.",
    options: [
      {
        label: "Prøv dem",
        about: "4 % mer i ti dager, men 25 % sjanse for at de knekker og gir tre dårlige dager.",
        tags: ["dristig", "billig"],
        mandate: "lonnsomhet",
        sure: { days: 10, factor: 1.04 },
        risk: { chance: 0.25, effect: { days: 3, factor: 0.6 } },
      },
      {
        label: "Bli med de gamle",
        about: "Vi vet hva vi har.",
        tags: ["trygg"],
        mandate: "stabilitet",
      },
    ],
  },
  {
    id: "kurs",
    title: "Sikkerhetskurs",
    text: "Verneombudet vil sende alle på sikkerhetskurs. Det koster litt, men gir færre stopp.",
    options: [
      {
        label: "Send alle på kurs",
        about: "Koster under en halv dags utbytte, gir 2 % mer i 14 dager.",
        tags: ["trygg"],
        mandate: "stabilitet",
        sure: { cash: -0.4, days: 14, factor: 1.02 },
      },
      {
        label: "Ikke nå",
        about: "Ingen kostnad, men 15 % sjanse for et uhell og to dager med halv drift.",
        tags: ["dristig", "billig"],
        mandate: "lonnsomhet",
        risk: { chance: 0.15, effect: { days: 2, factor: 0.5 } },
      },
    ],
  },
  {
    id: "stov",
    title: "Naboene klager på støv",
    text: "Naboene klager på støv fra skraplageret. Vi kan sette opp en støvduk nå, eller vente.",
    options: [
      {
        label: "Sett opp støvduk",
        about: "Koster under én dags utbytte.",
        tags: ["trygg"],
        mandate: "stabilitet",
        sure: { cash: -0.8 },
      },
      {
        label: "Vent",
        about: "Ingen kostnad nå, men 35 % sjanse for en bot på to dagers utbytte.",
        tags: ["dristig", "billig"],
        mandate: "lonnsomhet",
        risk: { chance: 0.35, effect: { cash: -2 } },
      },
    ],
  },
  {
    id: "eksport",
    title: "Eksportordre",
    text: "En kunde i utlandet vil ha en stor ordre levert raskt. Frakten er dyr hvis noe går galt.",
    options: [
      {
        label: "Ta ordren",
        about: "10 % mer i sju dager, men 35 % sjanse for at frakten slår feil: 5 % mindre i sju dager.",
        tags: ["dristig"],
        mandate: "vekst",
        sure: { days: 7, factor: 1.1 },
        risk: { chance: 0.35, effect: { days: 7, factor: 0.95 } },
      },
      {
        label: "Bli hjemme",
        about: "Vi leverer til de vanlige kundene.",
        tags: ["trygg", "billig"],
        mandate: "stabilitet",
      },
    ],
  },
  {
    id: "rabatt",
    title: "Storkunden vil ha rabatt",
    text: "Den største kunden vil ha 3 % rabatt de neste to ukene. Sier vi nei, kan de gå til en annen.",
    options: [
      {
        label: "Gi rabatt",
        about: "3 % mindre i 14 dager, men kunden blir.",
        tags: ["trygg"],
        mandate: "stabilitet",
        sure: { days: 14, factor: 0.97 },
      },
      {
        label: "Si nei",
        about: "Ingen rabatt, men 40 % sjanse for at kunden går: 8 % mindre i ti dager.",
        tags: ["dristig", "billig"],
        mandate: "lonnsomhet",
        risk: { chance: 0.4, effect: { days: 10, factor: 0.92 } },
      },
    ],
  },
  {
    id: "tilbud",
    title: "Tilbud fra en konkurrent",
    text: "Jeg har fått et tilbud fra en konkurrent. Jeg trives ikke så godt her lenger.",
    special: true,
    options: [
      {
        label: "Gi lønnstillegg",
        about: "Lønnen går opp 1 prosentpoeng, og verksjefen blir.",
        tags: ["trygg"],
        mandate: "stabilitet",
        special: "raise",
      },
      {
        label: "La verksjefen gå",
        about: "Verksjefen slutter i dag. Ingen sluttpakke, og du kan ansette en ny med én gang.",
        tags: ["dristig", "billig"],
        mandate: "lonnsomhet",
        special: "leave",
      },
    ],
  },
];

export const CALL_CARD_BY_ID: Record<string, CallCard> = Object.fromEntries(CALL_CARDS.map((c) => [c.id, c]));

/** Hvor mye et effektobjekt er verdt i dager av verkets utbytte */
export function effectDays(e: CallEffect | undefined): number {
  if (!e) return 0;
  return (e.cash ?? 0) + (e.days ?? 0) * ((e.factor ?? 1) - 1);
}

/** Forventet verdi av et valg i dager av verkets utbytte. Med Stabilitet er sjansen for det dårlige utfallet halvparten */
export function optionValue(o: CallOption, mandate: Mandate | null = null): number {
  const sure = effectDays(o.sure);
  if (!o.risk) return sure;
  const chance = mandate === "stabilitet" ? o.risk.chance * MANAGERS.stabilityRisk : o.risk.chance;
  return (1 - chance) * sure + chance * effectDays(o.risk.effect);
}

/** Valget verksjefen tar selv når fristen er ute, etter trekket */
export function traitChoice(card: CallCard, trait: Trait, mandate: Mandate): 0 | 1 {
  const pick = (tag: "trygg" | "dristig" | "billig"): 0 | 1 =>
    card.options[1].tags.includes(tag) && !card.options[0].tags.includes(tag) ? 1 : 0;
  if (card.special && trait === "lojal") return 0;
  if (trait === "forsiktig") return pick("trygg");
  if (trait === "aergjerrig") return pick("dristig");
  if (trait === "sparsom") return pick("billig");
  return card.options[1].mandate === mandate && card.options[0].mandate !== mandate ? 1 : 0;
}

/** Utbyttet et verk står for, som i `dividend_plant_shares`: grunnverdi × trinn, avtagende etter rekkefølgen */
export const PLANT_BASE: Record<SisterType, number> = { stalverk: 500_000, storverk: 2_000_000, kompleks: 6_000_000 };

// ---------- Moderniseringen etter mandatet i appen ----------

/**
 * Pris og tid på moderniseringen per verk etter verksjefen, fra serverens svar (`manager_status`). Serveren tar
 * prisen selv i `konsern_order`; dette er bare så Konsern viser samme pris. Tom = ingen verksjefer (eller ikke hentet).
 */
let modByPlant = new Map<number, { cost: number; time: number }>();

export function setManagerModFactors(list: { plant: number; mandate: Mandate; stats: ManagerStats }[]): void {
  modByPlant = new Map(list.map((m) => [m.plant, modFactors(m.mandate, m.stats)]));
}

export function managerModFactor(plant: number): { cost: number; time: number } {
  return modByPlant.get(plant) ?? { cost: 1, time: 1 };
}

// ---------- Trivsel (V3, B-489) ----------

/** Trivselen 0–100 (lojaliteten i VERKSJEF-FORSLAG.md avsnitt 6) – samme tall som `config.world.managers.loyalty` */
export const LOYALTY = {
  start: 60,
  quitBelow: 20,
  followAdvice: 3,
  rejectAdvice: -4,
  mandateSwitch: -8,
  raise: 0.01,
  raiseCap: 0.08,
  afterRaise: 55,
};

/** Hvor godt mandatet passer verksjefen: Lønnsomhet = snittet av Drift og Økonomi, Vekst = Drift, Stabilitet = Folk */
export function mandateFit(m: Mandate, s: ManagerStats): number {
  if (m === "lonnsomhet") return (s.drift + s.okonomi) / 2;
  if (m === "vekst") return s.drift;
  return s.folk;
}

/** Mandatet som passer verksjefen best (likt: Lønnsomhet før Vekst før Stabilitet) */
export function bestMandate(s: ManagerStats): Mandate {
  return MANDATES.reduce((a, b) => (mandateFit(b, s) > mandateFit(a, s) ? b : a));
}

/** Lojale verksjefer tar dårlige dager halvt så tungt (avrundet mot null, som `trunc` i SQL) */
function lojalAdjust(delta: number, trait: Trait): number {
  return trait === "lojal" && delta < 0 ? Math.trunc(delta / 2) : delta;
}

/** Endringen i trivsel per betalt utbyttedag: passformen minus 3, rundet (1 stjerne = −2, 3 = 0, 5 = +2) */
export function loyaltyDaily(m: Mandate, s: ManagerStats, trait: Trait): number {
  return lojalAdjust(Math.round(mandateFit(m, s) - 3), trait);
}

/** Endringen når eieren svarer selv: fulgte rådet (verksjefens eget valg) eller gikk mot det */
export function loyaltyAnswer(followed: boolean, trait: Trait): number {
  return lojalAdjust(followed ? LOYALTY.followAdvice : LOYALTY.rejectAdvice, trait);
}

export function loyaltySwitch(trait: Trait): number {
  return lojalAdjust(LOYALTY.mandateSwitch, trait);
}

/** Trivselen med vanlige ord (ingen tall å administrere, B-180) */
export function loyaltyWord(l: number): string {
  if (l >= 75) return "trives godt";
  if (l >= 45) return "trives";
  if (l >= LOYALTY.quitBelow + 5) return "misfornøyd";
  return "vil slutte";
}
