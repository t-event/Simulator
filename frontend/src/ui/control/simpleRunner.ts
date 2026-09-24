/**
 * Logikken bak den enkle styringen: automatikk, steg og vurdering.
 *
 * Holdes utenfor React slik at den kan testes uten nettleser (se
 * `src/game/balance.ts`). Komponenten SimpleControl tegner bare tilstanden
 * herfra og kaller metodene når spilleren trykker.
 */
import type { ManualResult } from "../../game/engine";
import type { EAFSimulation } from "../../sim/eaf";
import { CHARGE_SCRAP_MASS_KG } from "../../sim/constants";
import { buildResult } from "./simSetup";

export type Step = "intro" | "smelt" | "rens" | "slagg" | "tapp" | "tapper" | "ferdig";

/** Simulerte sekunder per sekund på skjermen i hvert steg; hele chargen tar et par minutter. */
export const SPEED: Record<Step, number> = { intro: 0, smelt: 40, rens: 20, slagg: 30, tapp: 10, tapper: 40, ferdig: 0 };
/** Trafo-tapp for strømnivå 1–5 */
const POWER_TAPS = [0, 1, 2, 3, 4];
const FEEDS = [1.8, 2.2, 2.45];
export const MELT_BAND: [number, number] = [1550, 1630];
export const SLAG_DONE_KG = 800;

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
  blowing: boolean;
  deslag: "nei" | "pagar" | "ferdig" | "hoppet";
  deslagStartS: number;
  meltS: number;
  meltInBandS: number;
  message: string | null;
}

export interface Score {
  steps: { title: string; stars: number; text: string }[];
  rating: number;
  headline: string;
  result: ManualResult;
}


// ------------------------------------------------------------------ //
// Automatikken: alt spilleren ikke trenger å tenke på
// ------------------------------------------------------------------ //
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
      sim.setTransformerTap(POWER_TAPS[a.level - 1]);
      if (!s.powerOn) sim.setPower(true);
      sim.setLimeRate(42);
      sim.setDolomiteRate(32);
      sim.setOxygenFlow(900);
      sim.setCarbonInjection(28);
      break;
    case "rens":
      sim.setConveyor(false);
      if (s.powerOn) sim.setPower(false);
      sim.setCarbonInjection(0);
      sim.setDolomiteRate(0);
      sim.setLimeRate(20);
      sim.setOxygenFlow(a.blowing ? 3000 : 0);
      break;
    case "slagg":
      sim.setOxygenFlow(0);
      sim.setLimeRate(0);
      if (a.deslag === "pagar") {
        if (s.powerOn) sim.setPower(false);
        sim.setSlagDoor(true);
        sim.setTilt(-12);
      }
      break;
    case "tapp":
      sim.setSlagDoor(false);
      if (s.tiltDeg !== 0) sim.setTilt(0);
      sim.setTransformerTap(3);
      if (!s.powerOn) sim.setPower(true);
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
  if (!tap || !grade || sim.state.refractoryWear >= 1) {
    return {
      steps: [{ title: "Foringen", stars: 0, text: "Stålet brant gjennom foringen. Det skjer når badet er altfor varmt for lenge." }],
      rating: 1,
      headline: "Gjennombrenning!",
      result: buildResult(sim, startWear, 0),
    };
  }
  const meltPct = a.meltS > 0 ? a.meltInBandS / a.meltS : 0;
  const s1 = meltPct >= 0.9 ? 3 : meltPct >= 0.7 ? 2 : meltPct >= 0.4 ? 1 : 0;
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
  const s3 = a.deslag === "ferdig" ? (pOk ? 3 : 2) : 0;
  const t3 =
    a.deslag === "ferdig"
      ? `Slagget med fosfor ble tippet ut før oppvarmingen. Fosfor ${fmt(p, 3)} % (maks ${fmt(grade.phosphorusMaxPct, 3)} %).`
      : `Slagget ble ikke tippet ut. Når stålet varmes opp, går fosfor fra slagget tilbake i stålet. Fosfor ${fmt(p, 3)} % (maks ${fmt(grade.phosphorusMaxPct, 3)} %).`;

  const dev = tap.tap_temp_c - tap.target_temp_c;
  const ad = Math.abs(dev);
  const s4 = ad <= 10 ? 3 : ad <= 20 ? 2 : ad <= 40 ? 1 : 0;
  const t4 =
    `Tappet ved ${Math.round(tap.tap_temp_c)} °C, målet var ${Math.round(tap.target_temp_c)} °C.` +
    (dev > 20
      ? " For varmt koster strøm og sliter på foringen."
      : dev < -20
        ? " For kaldt kan stålet størkne i øsa og gi støpefeil."
        : "");

  const total = s1 + s2 + s3 + s4;
  const rating = total >= 11 ? 5 : total >= 9 ? 4 : total >= 6 ? 3 : total >= 3 ? 2 : 1;
  const headline = ["", "Det kan bli bedre", "Godt forsøk", "Bra kjørt!", "Veldig bra!", "Perfekt charge!"][rating];
  return {
    steps: [
      { title: "Smelting", stars: s1, text: t1 },
      { title: "Rensing", stars: s2, text: t2 },
      { title: "Avslagging", stars: s3, text: t3 },
      { title: "Tapping", stars: s4, text: t4 },
    ],
    rating,
    headline,
    result: buildResult(sim, startWear, rating),
  };
}


export type RunnerEvent = "steg" | "ferdig" | "gjennombrenning";

/** Én charge med enkel styring. Alle endringer skjer gjennom metodene. */
export class SimpleRunner {
  step: Step = "intro";
  score: Score | null = null;
  private a: Auto = {
    level: 4,
    feed: 2.2,
    nextFeedS: 300,
    blowing: false,
    deslag: "nei",
    deslagStartS: 0,
    meltS: 0,
    meltInBandS: 0,
    message: null,
  };

  readonly sim: EAFSimulation;
  private readonly startWear: number;
  private readonly random: () => number;

  constructor(sim: EAFSimulation, startWear: number, random: () => number = Math.random) {
    this.sim = sim;
    this.startWear = startWear;
    this.random = random;
  }

  get level(): number {
    return this.a.level;
  }
  get blowing(): boolean {
    return this.a.blowing;
  }
  get deslag(): Auto["deslag"] {
    return this.a.deslag;
  }
  get message(): string | null {
    return this.a.message;
  }
  get melted(): number {
    const s = this.sim.state;
    return Math.max(0, Math.min(1, (CHARGE_SCRAP_MASS_KG - s.chargeRemainingKg - s.solidScrapKg) / CHARGE_SCRAP_MASS_KG));
  }

  start(): void {
    if (this.step === "intro") this.step = "smelt";
  }
  changeLevel(delta: number): void {
    this.a.level = Math.max(1, Math.min(5, this.a.level + delta));
  }
  setBlowing(on: boolean): void {
    this.a.blowing = on && this.step === "rens";
  }
  finishRefining(): void {
    if (this.step !== "rens") return;
    this.a.blowing = false;
    this.step = "slagg";
  }
  startDeslag(): void {
    if (this.step !== "slagg" || this.a.deslag === "pagar") return;
    this.a.deslag = "pagar";
    this.a.deslagStartS = this.sim.state.timeS;
  }
  skipDeslag(): void {
    if (this.step !== "slagg" || this.a.deslag === "pagar") return;
    this.a.deslag = "hoppet";
    this.step = "tapp";
  }
  tap(): boolean {
    if (this.step !== "tapp" || !this.sim.startTap()) return false;
    this.step = "tapper";
    return true;
  }

  /** Kjører modellen fram for så mange sekunder på skjermen. Returnerer hva som skjedde. */
  tick(realSeconds: number): RunnerEvent | null {
    const st = this.step;
    const a = this.a;
    const sim = this.sim;
    const seconds = realSeconds * SPEED[st];
    const n = Math.ceil(seconds);
    for (let i = 0; i < n; i++) {
      const dt = seconds / n;
      automate(sim, st, a, this.random);
      sim.step(dt);
      if (st === "smelt") {
        a.meltS += dt;
        const t = sim.state.bathTempC;
        if (t >= MELT_BAND[0] && t <= MELT_BAND[1]) a.meltInBandS += dt;
      }
    }
    if (sim.state.refractoryWear >= 1 && st !== "ferdig") {
      this.score = scoreCharge(sim, a, this.startWear);
      this.step = "ferdig";
      return "gjennombrenning";
    }
    if (st === "smelt" && sim.state.phase !== "innsmelting") {
      a.message = null;
      this.step = "rens";
      return "steg";
    }
    if (st === "slagg" && a.deslag === "pagar") {
      if (sim.slagMassKg < SLAG_DONE_KG || sim.state.timeS - a.deslagStartS > 480) {
        a.deslag = "ferdig";
        sim.setTilt(0);
        sim.setSlagDoor(false);
        this.step = "tapp";
        return "steg";
      }
    }
    if (st === "tapper" && sim.state.phase !== "tapping") {
      this.score = scoreCharge(sim, a, this.startWear);
      this.step = "ferdig";
      return "ferdig";
    }
    return null;
  }
}
