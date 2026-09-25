/**
 * Logikken bak den enkle styringen: automatikk, steg og vurdering.
 *
 * Holdes utenfor React slik at den kan testes uten nettleser (se
 * `src/game/balance.ts`). Komponenten SimpleControl tegner bare tilstanden
 * herfra og kaller metodene når spilleren trykker.
 *
 * B-076: strøm og oksygen styres samtidig (også mens strømmen går), avslaggingen
 * stoppes av spilleren (for lenge = stål ut slaggdøra), og ved tapping må ovnen
 * rettes opp når øsa er full (for sent = øsa renner over).
 */
import type { ManualResult } from "../../game/engine";
import type { EAFSimulation } from "../../sim/eaf";
import { CHARGE_SCRAP_MASS_KG, HEEL_MASS_KG } from "../../sim/constants";
import { buildResult } from "./simSetup";

export type Step = "intro" | "smelt" | "rens" | "slagg" | "tapp" | "tapper" | "ferdig";

/** Simulerte sekunder per sekund på skjermen i hvert steg; hele chargen tar et par minutter. */
export const SPEED: Record<Step, number> = { intro: 0, smelt: 40, rens: 20, slagg: 20, tapp: 10, tapper: 8, ferdig: 0 };
/** Når det er lite slagg igjen, går avslaggingen saktere, så spilleren rekker å rette opp i det grønne (B-080) */
const SLAG_SLOW_BELOW_KG = 2500;
const SPEED_SLAG_END = 6;
/**
 * Strømnivået automatikken setter når et nytt steg starter (B-086). Rensingen starter med strømmen av: oksygenet gir
 * varme selv, og med strøm steg temperaturen før spilleren rakk å reagere (B-108).
 */
const RENS_START_LEVEL = 0;
const TAPP_START_LEVEL = 4;
/**
 * Trafo-tapp for strømnivå 1–5 (nivå 0 = strømmen av, B-079). De øverste nivåene gir nok strøm til å holde
 * smeltingen i det grønne uten oksygen til halve skrapet er smeltet, slik rådet sier (B-108).
 */
const POWER_TAPS = [0, 1, 2, 4, 6];
/** Karbon som blåses inn når spilleren slår på karbon i rensingen (kg/min, B-079) */
const CARBON_BOOST_KG_MIN = 120;
/** Under smeltingen holder automatikken karbonet over dette, også når oksygenet står på (B-079) */
const MELT_CARBON_FLOOR_PCT = 0.12;
const FEEDS = [1.8, 2.2, 2.45];
export const MELT_BAND: [number, number] = [1550, 1630];
/** Slagget er godt nok tippet ut under denne mengden */
export const SLAG_DONE_KG = 1200;
/** Under denne mengden slagg følger stålet med ut slaggdøra (B-076) */
export const SLAG_SPILL_KG = 500;
const STEEL_SPILL_KG_S = 150;
/** Øsa tar litt mindre enn det som kan tappes; resten blir igjen som sump om du retter opp i tide (B-076) */
const LADLE_SHARE = 0.94;
/** Grønt felt for hvor full øsa skal være når ovnen rettes opp */
export const LADLE_BAND: [number, number] = [0.93, 1];
/** Tapping: pluss/minus så mange grader fra målet gir full score */
export const TAP_TEMP_OK_C = 8;
const OXYGEN_MELT_NM3H = 2400;
const OXYGEN_REFINE_NM3H = 3000;

export const STEPS: { id: Step; title: string }[] = [
  { id: "smelt", title: "Smelt" },
  { id: "rens", title: "Rens" },
  { id: "slagg", title: "Slagg av" },
  { id: "tapp", title: "Tapp" },
];

interface Auto {
  level: number;
  feed: number;
  nextFeedS: number;
  oxygen: boolean;
  carbon: boolean;
  deslag: "nei" | "pagar" | "ferdig" | "hoppet";
  slagLeftKg: number;
  slagStartKg: number;
  steelSpilledKg: number;
  meltS: number;
  meltInBandS: number;
  tapStartKg: number;
  ladleCapKg: number;
  ladleKg: number;
  message: string | null;
}

export interface Score {
  steps: { title: string; stars: number; text: string; chapter?: string; lesson?: string }[];
  rating: number;
  headline: string;
  result: ManualResult;
}

// ------------------------------------------------------------------ //
// Automatikken: alt spilleren ikke trenger å tenke på
// ------------------------------------------------------------------ //
/** Strømnivå 1–5 gir trafo-tapp, nivå 0 slår strømmen av */
function applyPower(sim: EAFSimulation, level: number): void {
  if (level <= 0) {
    if (sim.state.powerOn) sim.setPower(false);
    return;
  }
  sim.setTransformerTap(POWER_TAPS[level - 1]);
  if (!sim.state.powerOn) sim.setPower(true);
}

function automate(sim: EAFSimulation, step: Step, a: Auto, random: () => number): void {
  const s = sim.state;
  switch (step) {
    case "smelt":
      if (s.timeS >= a.nextFeedS) {
        const options = FEEDS.filter((f) => f !== a.feed);
        const next = options[Math.floor(random() * options.length)];
        a.message =
          next > a.feed
            ? "Tyngre skrap på vei inn – badet blir kaldere. Mer strøm?"
            : "Lettere skrap nå – badet blir varmere. Mindre strøm?";
        a.feed = next;
        a.nextFeedS = s.timeS + 240 + random() * 180;
      }
      sim.setConveyor(true);
      sim.setConveyorRate(a.feed);
      applyPower(sim, a.level);
      sim.setLimeRate(42);
      sim.setDolomiteRate(32);
      // Oksygen mens strømmen går: kjemisk varme og skummende slagg (B-076)
      sim.setOxygenFlow(a.oxygen ? OXYGEN_MELT_NM3H : 0);
      // Automatikken blåser inn mer karbon når oksygenet har brent det ned, så rensingen har noe å jobbe med
      sim.setCarbonInjection(s.carbonPct < MELT_CARBON_FLOOR_PCT ? CARBON_BOOST_KG_MIN : 28);
      break;
    case "rens":
      // Rensing med strømmen på: oksygen brenner karbon, strømmen holder temperaturen (B-076)
      sim.setConveyor(false);
      applyPower(sim, a.level);
      // Karbon kan blåses inn igjen hvis spilleren har blåst for lenge (B-079)
      sim.setCarbonInjection(a.carbon ? CARBON_BOOST_KG_MIN : 8);
      sim.setDolomiteRate(0);
      sim.setLimeRate(20);
      sim.setOxygenFlow(a.oxygen ? OXYGEN_REFINE_NM3H : 0);
      break;
    case "slagg":
      sim.setOxygenFlow(0);
      sim.setLimeRate(0);
      sim.setCarbonInjection(0);
      if (a.deslag === "pagar") {
        if (s.powerOn) sim.setPower(false);
        sim.setSlagDoor(true);
        sim.setTilt(-12);
      } else {
        sim.setSlagDoor(false);
        if (s.tiltDeg !== 0) sim.setTilt(0);
      }
      break;
    case "tapp":
      sim.setSlagDoor(false);
      if (s.tiltDeg !== 0) sim.setTilt(0);
      applyPower(sim, a.level);
      sim.setOxygenFlow(0);
      break;
    default:
      break;
  }
}

// ------------------------------------------------------------------ //
// Vurdering etter tapping
// ------------------------------------------------------------------ //
export const fmt = (v: number, d: number) => v.toFixed(d).replace(".", ",");

function scoreCharge(sim: EAFSimulation, a: Auto, startWear: number): Score {
  const tap = sim.state.lastTapResult;
  const grade = sim.state.grade;
  const overflowKg = Math.max(0, a.ladleKg - a.ladleCapKg);
  const lostKg = a.steelSpilledKg + overflowKg;
  const lossFraction = Math.min(0.5, lostKg / Math.max(1, a.tapStartKg - HEEL_MASS_KG || CHARGE_SCRAP_MASS_KG));
  if (!tap || !grade || sim.state.refractoryWear >= 1) {
    return {
      steps: [
        {
          title: "Foringen",
          stars: 0,
          text: "Stålet brant gjennom foringen. Det skjer når badet er altfor varmt for lenge.",
        },
      ],
      rating: 1,
      headline: "Gjennombrenning!",
      result: buildResult(sim, startWear, 0),
    };
  }
  const meltPct = a.meltS > 0 ? a.meltInBandS / a.meltS : 0;
  // Smeltingen er lang og matingen varierer, så kravet er lavere enn før (B-086)
  const s1 = meltPct >= 0.8 ? 3 : meltPct >= 0.6 ? 2 : meltPct >= 0.35 ? 1 : 0;
  const t1 =
    `Temperaturen var i det grønne ${Math.round(meltPct * 100)} % av tiden.` +
    (s1 < 3 ? " Følg med når skrapmatingen endrer seg, og juster strømmen." : "");

  const c = tap.carbon_pct;
  const inC = c >= grade.tapCarbonMinPct && c <= grade.tapCarbonMaxPct;
  const nearC = c >= grade.tapCarbonMinPct - 0.02 && c <= grade.tapCarbonMaxPct + 0.02;
  const s2 = inC ? 3 : nearC ? 2 : 1;
  const t2 =
    `Karbonet ble ${fmt(c, 3)} % (grønt: ${fmt(grade.tapCarbonMinPct, 2)}–${fmt(grade.tapCarbonMaxPct, 2)} %).` +
    (c > grade.tapCarbonMaxPct
      ? " For høyt – blås oksygen litt lenger neste gang."
      : c < grade.tapCarbonMinPct
        ? " For lavt – når karbonet er brukt opp, brenner oksygenet jern i stedet, og mer stål går tapt i slaggen."
        : "");

  const p = tap.phosphorus_pct;
  const pOk = p <= grade.phosphorusMaxPct;
  let s3 = 0;
  let t3: string;
  if (a.deslag !== "ferdig") {
    t3 = `Slagget ble ikke tippet ut. Når stålet varmes opp, går fosfor fra slagget tilbake i stålet. Fosfor ${fmt(p, 3)} % (maks ${fmt(grade.phosphorusMaxPct, 3)} %).`;
  } else {
    const clean = a.slagLeftKg <= SLAG_DONE_KG;
    s3 = a.steelSpilledKg > 4000 ? 0 : a.steelSpilledKg > 1500 ? 1 : clean && a.steelSpilledKg <= 300 && pOk ? 3 : 2;
    t3 =
      `${fmt(a.slagLeftKg / 1000, 1)} t slagg ble igjen (grønt: under ${fmt(SLAG_DONE_KG / 1000, 1)} t). Fosfor ${fmt(p, 3)} % (maks ${fmt(grade.phosphorusMaxPct, 3)} %).` +
      (a.steelSpilledKg > 300
        ? ` Du tippet for lenge: ${fmt(a.steelSpilledKg / 1000, 1)} t stål rant ut slaggdøra. Rett opp ovnen når slagget nesten er ute.`
        : !clean
          ? " Det ble igjen mye slagg – tipp litt lenger neste gang."
          : "");
  }

  const dev = tap.tap_temp_c - tap.target_temp_c;
  const ad = Math.abs(dev);
  const s4 = ad <= TAP_TEMP_OK_C ? 3 : ad <= 15 ? 2 : ad <= 30 ? 1 : 0;
  const t4 =
    `Tappet ved ${Math.round(tap.tap_temp_c)} °C, målet var ${Math.round(tap.target_temp_c)} °C.` +
    (dev > 15
      ? " For varmt koster strøm og sliter på foringen."
      : dev < -15
        ? " For kaldt kan stålet størkne i øsa og gi støpefeil."
        : "");

  const fill = a.ladleCapKg > 0 ? Math.min(a.ladleKg, a.ladleCapKg) / a.ladleCapKg : 0;
  const s5 =
    overflowKg > a.ladleCapKg * 0.015 ? 0 : overflowKg > 0 ? 1 : fill >= LADLE_BAND[0] ? 3 : fill >= 0.85 ? 2 : 1;
  const t5 =
    overflowKg > 0
      ? `Øsa rant over: ${fmt(overflowKg / 1000, 1)} t flytende stål på gulvet. Rett opp ovnen når øsa er full – det er farlig og dyrt.`
      : `Øsa ble ${Math.round(fill * 100)} % full (grønt: ${Math.round(LADLE_BAND[0] * 100)}–100 %).` +
        (fill < LADLE_BAND[0] ? " Resten ble igjen i ovnen – vent litt lenger før du retter opp." : "");

  const total = s1 + s2 + s3 + s4 + s5;
  const rating = total >= 14 ? 5 : total >= 11 ? 4 : total >= 8 ? 3 : total >= 5 ? 2 : 1;
  const headline = ["", "Det kan bli bedre", "Godt forsøk", "Bra kjørt!", "Veldig bra!", "Perfekt charge!"][rating];
  return {
    steps: [
      { title: "Smelting", stars: s1, text: t1, ...LESSONS.smelting },
      { title: "Rensing", stars: s2, text: t2, ...LESSONS.rensing },
      { title: "Avslagging", stars: s3, text: t3, ...LESSONS.avslagging },
      { title: "Tappetemperatur", stars: s4, text: t4, ...LESSONS.tapping },
      { title: "Øsa", stars: s5, text: t5, ...LESSONS.osa },
    ],
    rating,
    headline,
    result: { ...buildResult(sim, startWear, rating), lossFraction },
  };
}

/** Kort forklaring og kapittel i fagboka for hvert steg, vist når steget gikk dårlig (B-088) */
const LESSONS: Record<string, { chapter: string; lesson: string }> = {
  smelting: {
    chapter: "lysbue",
    lesson:
      "Skrapet smelter jevnest når badet holdes like over smeltepunktet. For varmt sliter på foringen og koster strøm; for kaldt stopper smeltingen opp.",
  },
  rensing: {
    chapter: "karbon",
    lesson:
      "Oksygen brenner karbonet til CO-gass. Når karbonet er brukt opp, brenner oksygenet jern i stedet – da går stål tapt i slagget.",
  },
  avslagging: {
    chapter: "fosfor",
    lesson:
      "Fosforet samles i slagget. Tippes det ikke ut før oppvarmingen, går fosforet tilbake i stålet. Tipper du for lenge, renner stålet etter.",
  },
  tapping: {
    chapter: "ildfast",
    lesson:
      "Stålet må være varmt nok til å holde seg flytende helt fram til støpingen, men hver grad ekstra koster strøm og sliter på foringen.",
  },
  osa: {
    chapter: "oseovn",
    lesson: "Øsa rommer bare så mye. Litt stål skal bli igjen i ovnen (sumpen), for det hjelper neste charge å smelte.",
  },
};

export type RunnerEvent = "steg" | "ferdig" | "gjennombrenning" | "søl";

/** Én charge med enkel styring. Alle endringer skjer gjennom metodene. */
export class SimpleRunner {
  step: Step = "intro";
  score: Score | null = null;
  private a: Auto = {
    level: 4,
    feed: 2.2,
    nextFeedS: 300,
    oxygen: false,
    carbon: false,
    deslag: "nei",
    slagLeftKg: 0,
    slagStartKg: 0,
    steelSpilledKg: 0,
    meltS: 0,
    meltInBandS: 0,
    tapStartKg: 0,
    ladleCapKg: 0,
    ladleKg: 0,
    message: null,
  };

  readonly sim: EAFSimulation;
  private readonly startWear: number;
  private readonly random: () => number;
  /** Utjevnet endring per sekund på skjermen, for hint som «stiger 1 °C/s» (B-080) */
  private tempRateS = 0;
  private slagRateS = 0;
  private rateStep: Step = "intro";

  constructor(sim: EAFSimulation, startWear: number, random: () => number = Math.random) {
    this.sim = sim;
    this.startWear = startWear;
    this.random = random;
  }

  get level(): number {
    return this.a.level;
  }
  /** Oksygenlansa er på (smelting, rensing og oppvarming) */
  get blowing(): boolean {
    return this.a.oxygen;
  }
  /** Karboninnblåsing er slått på i rensingen (B-079) */
  get carbonOn(): boolean {
    return this.a.carbon;
  }
  get deslag(): Auto["deslag"] {
    return this.a.deslag;
  }
  get message(): string | null {
    return this.a.message;
  }
  get melted(): number {
    const s = this.sim.state;
    return Math.max(
      0,
      Math.min(1, (CHARGE_SCRAP_MASS_KG - s.chargeRemainingKg - s.solidScrapKg) / CHARGE_SCRAP_MASS_KG),
    );
  }
  /** Temperaturendring i badet, °C per sekund på skjermen */
  get tempRate(): number {
    return this.tempRateS;
  }
  /** Hvor fort slagget renner ut, kg per sekund på skjermen */
  get slagRate(): number {
    return this.slagRateS;
  }
  /** Slagg i ovnen da spilleren begynte å tippe (kg) */
  get slagStartKg(): number {
    return this.a.slagStartKg;
  }
  /** Stål som har rent ut slaggdøra (kg) */
  get steelSpilledKg(): number {
    return this.a.steelSpilledKg;
  }
  /** Hvor full øsa er, 0–1 (over 1 = renner over) */
  get ladleFill(): number {
    return this.a.ladleCapKg > 0 ? this.a.ladleKg / this.a.ladleCapKg : 0;
  }

  start(): void {
    if (this.step === "intro") this.step = "smelt";
  }
  changeLevel(delta: number): void {
    this.a.level = Math.max(0, Math.min(5, this.a.level + delta));
  }
  /** Slår oksygenlansa av eller på. Virker mens strømmen går (B-076). */
  setOxygen(on: boolean): void {
    // Oksygen i smelting og rensing; ikke i tappingen, der skal badet bare varmes (B-093)
    this.a.oxygen = on && (this.step === "smelt" || this.step === "rens");
    // Oksygen og karbon motarbeider hverandre, så bare én av dem står på i rensingen
    if (this.a.oxygen) this.a.carbon = false;
  }
  /** Blåser inn karbon i rensingen når karbonet er blitt for lavt (B-079) */
  setCarbon(on: boolean): void {
    this.a.carbon = on && this.step === "rens";
    if (this.a.carbon) this.a.oxygen = false;
  }
  /** Beholdes for testspilleren: oksygen på/av i rensingen */
  setBlowing(on: boolean): void {
    this.setOxygen(on);
  }
  finishRefining(): void {
    if (this.step !== "rens") return;
    this.a.oxygen = false;
    this.a.carbon = false;
    this.step = "slagg";
  }
  /** Tipper ovnen mot slaggdøra. Spilleren må rette den opp selv (B-076). */
  startDeslag(): void {
    if (this.step !== "slagg" || this.a.deslag === "pagar") return;
    this.a.deslag = "pagar";
    this.a.slagStartKg = this.sim.slagMassKg;
  }
  /** Retter opp ovnen etter avslagging og går videre til oppvarming og tapping */
  stopDeslag(): void {
    if (this.step !== "slagg" || this.a.deslag !== "pagar") return;
    this.a.deslag = "ferdig";
    this.a.slagLeftKg = this.sim.slagMassKg;
    this.sim.setTilt(0);
    this.sim.setSlagDoor(false);
    this.a.level = TAPP_START_LEVEL;
    this.step = "tapp";
  }
  skipDeslag(): void {
    if (this.step !== "slagg" || this.a.deslag === "pagar") return;
    this.a.deslag = "hoppet";
    this.a.slagLeftKg = this.sim.slagMassKg;
    this.a.level = TAPP_START_LEVEL;
    this.step = "tapp";
  }
  tap(): boolean {
    const liquid = this.sim.state.liquidMassKg;
    if (this.step !== "tapp" || !this.sim.startTap()) return false;
    this.a.oxygen = false;
    this.a.tapStartKg = liquid;
    this.a.ladleCapKg = Math.max(1, (liquid - HEEL_MASS_KG) * LADLE_SHARE);
    this.a.ladleKg = 0;
    this.step = "tapper";
    return true;
  }
  /** Retter opp ovnen når øsa er full; resten blir igjen som sump (B-076) */
  stopTap(): void {
    if (this.step !== "tapper") return;
    this.sim.finishTap();
  }

  /** Kjører modellen fram for så mange sekunder på skjermen. Returnerer hva som skjedde. */
  tick(realSeconds: number): RunnerEvent | null {
    const st = this.step;
    const a = this.a;
    const sim = this.sim;
    const slow = st === "slagg" && a.deslag === "pagar" && sim.slagMassKg < SLAG_SLOW_BELOW_KG;
    const seconds = realSeconds * (slow ? SPEED_SLAG_END : SPEED[st]);
    const n = Math.ceil(seconds);
    const t0 = sim.state.bathTempC;
    const slag0 = sim.slagMassKg;
    let event: RunnerEvent | null = null;
    for (let i = 0; i < n; i++) {
      const dt = seconds / n;
      automate(sim, st, a, this.random);
      sim.step(dt);
      if (st === "smelt") {
        a.meltS += dt;
        const t = sim.state.bathTempC;
        if (t >= MELT_BAND[0] && t <= MELT_BAND[1]) a.meltInBandS += dt;
      }
      // For lite slagg igjen: stålet følger med ut slaggdøra
      if (st === "slagg" && a.deslag === "pagar" && sim.slagMassKg < SLAG_SPILL_KG) {
        const spill = Math.min(STEEL_SPILL_KG_S * dt, Math.max(0, sim.state.liquidMassKg - HEEL_MASS_KG));
        sim.state.liquidMassKg -= spill;
        if (a.steelSpilledKg === 0 && spill > 0) event = "søl";
        a.steelSpilledKg += spill;
      }
      if (st === "tapper" && sim.state.phase === "tapping") a.ladleKg = a.tapStartKg - sim.state.liquidMassKg;
    }
    if (realSeconds > 0) {
      // Nytt steg: start trenden på nytt, ellers henger den igjen fra forrige steg
      const k = st !== this.rateStep ? 1 : Math.min(1, realSeconds / 0.8);
      this.rateStep = st;
      this.tempRateS += ((sim.state.bathTempC - t0) / realSeconds - this.tempRateS) * k;
      this.slagRateS += ((slag0 - sim.slagMassKg) / realSeconds - this.slagRateS) * k;
    }
    if (sim.state.refractoryWear >= 1 && st !== "ferdig") {
      this.score = scoreCharge(sim, a, this.startWear);
      this.step = "ferdig";
      return "gjennombrenning";
    }
    if (st === "smelt" && sim.state.phase !== "innsmelting") {
      a.message = null;
      // Rensingen starter med strømmen av: oksygenet gir mye varme selv (B-086, B-108)
      a.level = RENS_START_LEVEL;
      this.step = "rens";
      return "steg";
    }
    if (st === "tapper" && sim.state.phase !== "tapping") {
      a.ladleKg = Math.max(a.ladleKg, a.tapStartKg - sim.state.liquidMassKg);
      this.score = scoreCharge(sim, a, this.startWear);
      this.step = "ferdig";
      return "ferdig";
    }
    return event;
  }
}
