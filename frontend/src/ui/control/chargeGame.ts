/**
 * Kontrollrommet som spill (B-175): én charge i fire korte runder, under ett minutt til sammen.
 *
 *   1. Smelt  – hold inne for strøm og hold temperaturen i det grønne mens skrapkurvene kommer.
 *   2. Rens   – hold inne for oksygen til karbonet er i det grønne, men slipp når slaggen skummer for høyt.
 *   3. Slagg  – trykk på slaggklumpene før de synker, men ikke på det blanke stålet.
 *   4. Tapp   – tapp når temperaturen treffer, og fyll øsa til streken uten at den renner over.
 *
 * Hver runde gir 0–3 stjerner, poeng og kombo. Resultatet blir en vanlig charge i spillet (ManualResult). Logikken
 * holdes utenfor React, så testspilleren (balance.ts) og testene kan spille den uten nettleser.
 */
import type { ManualResult } from "../../game/engine";
import { GRADES } from "../../game/data";
import type { GradeId, ManualRequest } from "../../game/types";

export type RoundId = "smelt" | "rens" | "slagg" | "tapp";
export type Phase = "klar" | "spill" | "ferdig";
export type GameEvent = "kurv" | "kok" | "runde" | "ferdig" | "over" | "tappet";

export const ROUNDS: { id: RoundId; title: string; what: string; how: string }[] = [
  {
    id: "smelt",
    title: "Smelt skrapet",
    what: "Lysbuen smelter skrapet. For kaldt, og smeltingen går tregt. For varmt, og foringen slites.",
    how: "Hold inne for strøm, slipp for å kjøle. Følg med på skrapkurvene: en tung kurv kjøler badet, en lett varmer.",
  },
  {
    id: "rens",
    title: "Blås ut karbonet",
    what: "Oksygen brenner karbonet til gass. Da skummer slaggen – koker den over, går stål tapt.",
    how: "Hold inne for oksygen. Slipp når skummet nærmer seg kanten. Trykk «Ferdig» når karbonet er i det grønne.",
  },
  {
    id: "slagg",
    title: "Rak ut slaggen",
    what: "Fosforet ligger i slaggen. Blir slaggen liggende, går fosforet tilbake i stålet.",
    how: "Trykk på de grå slaggklumpene før de synker. Ikke ta det blanke stålet!",
  },
  {
    id: "tapp",
    title: "Tapp i øsa",
    what: "Stålet må være akkurat varmt nok, og øsa rommer bare så mye.",
    how: "Trykk «Tapp!» når temperaturen er i det grønne. Hold så inne for å helle – strålen renner litt etter at du slipper.",
  },
];

// ------------------------------------------------------------------ //
// Smelting
// ------------------------------------------------------------------ //
export const MELT_BAND: [number, number] = [1560, 1620];
const MELT_START_C = 1530;
const HEAT_C_S = 50;
/** Oksygenet slås på når halve skrapet er smeltet og gir ekstra varme (runden blir vanskeligere mot slutten) */
const OXY_HEAT_C_S = 18;
const COOL_C_S = 38;
const INERTIA_S = 0.35;
/** Sekunder det tar å smelte alt med badet i det grønne */
const MELT_S = 13;
const MELT_MAX_S = 30;
export const BUCKET_WARN_S = 1;
const BUCKET_EFFECT_S = 0.8;
const HEAVY_C = -55;
const LIGHT_C = 30;

// ------------------------------------------------------------------ //
// Rensing
// ------------------------------------------------------------------ //
const CARBON_RATE = 0.05;
const FOAM_DOWN = 0.42;
const BOIL_LOCK_S = 0.8;
const RENS_MAX_S = 25;

// ------------------------------------------------------------------ //
// Slagg
// ------------------------------------------------------------------ //
export const SLAG_S = 8;
const SLAG_LUMPS = 14;
const STEEL_BLOBS = 5;

// ------------------------------------------------------------------ //
// Tapping
// ------------------------------------------------------------------ //
export const TAP_OK_C = 8;
const TAP_LATE_C = 40;
export const LADLE_BAND: [number, number] = [0.93, 1];
const POUR_INERTIA_S = 0.25;
const FILL_S = 4.5;
const OVERFLOW_END = 1.06;
const TAPP_MAX_S = 20;

/** Karbonvinduet ovnen skal tappe på, i samme skala som prosessmodellen (se engine.completeManual) */
export function carbonWindow(grade: GradeId): [number, number] {
  return grade === "lavkarbon" ? [0.02, 0.05] : [0.04, 0.1];
}

export interface Target {
  id: number;
  kind: "slagg" | "stal";
  x: number;
  y: number;
  born: number;
  life: number;
  state: "venter" | "oppe" | "raket" | "sank";
}

export interface ScoreLine {
  title: string;
  stars: number;
  text: string;
  chapter: string;
  lesson: string;
}

export interface Score {
  lines: ScoreLine[];
  rating: number;
  headline: string;
  points: number;
  result: ManualResult;
}

const fmt = (v: number, d: number) => v.toFixed(d).replace(".", ",");

/**
 * Tilfeldigheter fra et frø (mulberry32, B-387): samme frø gir samme charge – skrapkurvene, karbonet, slaggklumpene og
 * tappingen. Ukens kontrollrom får frøene fra serveren; trening bruker egne frø.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Det spilleren gjorde (B-387): [runde, sekunder inn i runden (ms), handling, verdi]. Handlingene: «s» start, «h» hold
 * (1/0), «f» ferdig med rensingen, «r» rak klump (id), «t» tapp, «p» rett opp. Lagres med ukens forsøk, så topp 3 kan
 * etterprøves. Tak på antall, så loggen aldri blir stor.
 */
export type InputEntry = [number, number, string, number];
export const INPUT_LOG_MAX = 1500;

/** Én charge som spill. Alt endres gjennom metodene; grensesnittet leser feltene. */
export class ChargeGame {
  round = 0;
  phase: Phase = "klar";
  /** Sekunder i runden som spilles nå */
  t = 0;
  holding = false;
  points = 0;
  /** Kombo: poeng ganges med denne (1–5) */
  mult = 1;
  score: Score | null = null;
  /** Inndataene (B-387), med tak `INPUT_LOG_MAX` */
  readonly inputs: InputEntry[] = [];

  // Smelting
  temp = MELT_START_C;
  vel = 0;
  melted = 0;
  oxygen = false;
  bucket: { kind: "tung" | "lett"; inS: number } | null = null;
  private nextBucketS = 1.4;
  private bucketEffect: { left: number; rate: number } | null = null;
  private streakS = 0;
  meltS = 0;
  inBandS = 0;
  hotS = 0;
  coldS = 0;
  private roundPts = [0, 0, 0, 0];

  // Rensing
  readonly window: [number, number];
  carbon: number;
  foam = 0;
  boilovers = 0;
  lockS = 0;
  private burnS = 0;
  private readonly carbonRate: number;

  // Slagg
  targets: Target[] = [];
  raked = 0;
  steelRaked = 0;
  private hitStreak = 0;

  // Tapping
  tapStage: "varm" | "osa" = "varm";
  readonly tapTarget: number;
  tapTemp: number;
  tapDev: number | null = null;
  fill = 0;
  flow = 0;
  private readonly fillRate: number;
  private stillS = 0;

  readonly grade: GradeId;
  private readonly req: ManualRequest;
  private readonly random: () => number;

  constructor(req: ManualRequest, random: () => number = Math.random) {
    this.req = req;
    this.grade = req.grade;
    this.random = random;
    this.window = carbonWindow(req.grade);
    this.carbon = this.window[1] + 0.18 + random() * 0.06;
    this.carbonRate = CARBON_RATE * (0.85 + random() * 0.3);
    this.tapTarget = req.grade === "hoykarbon" ? 1600 : req.grade === "lavkarbon" ? 1650 : 1630;
    this.tapTemp = this.tapTarget - 75 - random() * 15;
    this.fillRate = (1 / FILL_S) * (0.9 + random() * 0.2);
  }

  get roundId(): RoundId {
    return ROUNDS[Math.min(this.round, ROUNDS.length - 1)].id;
  }
  /** Om runden styres ved å holde inne (smelting, rensing, helling i øsa) */
  get holdRound(): boolean {
    const r = this.roundId;
    return r === "smelt" || r === "rens" || (r === "tapp" && this.tapStage === "osa");
  }

  private note(action: string, value = 0): void {
    if (this.inputs.length < INPUT_LOG_MAX) this.inputs.push([this.round, Math.round(this.t * 1000), action, value]);
  }

  start(): void {
    if (this.phase !== "klar") return;
    this.note("s");
    this.phase = "spill";
    this.t = 0;
    this.mult = 1;
    this.holding = false;
    if (this.roundId === "slagg") this.spawnTargets();
  }

  hold(on: boolean): void {
    const was = this.holding;
    this.holding = on && this.phase === "spill" && this.holdRound && this.lockS <= 0;
    if (this.holding !== was) this.note("h", this.holding ? 1 : 0);
  }

  /** Rensingen er ferdig (spilleren trykker «Ferdig») */
  finishRefining(): void {
    if (this.phase !== "spill" || this.roundId !== "rens") return;
    this.note("f");
    this.holding = false;
    this.endRound();
  }

  /** Raker ut en klump. Returnerer hva som ble truffet. */
  rake(id: number): Target["kind"] | null {
    if (this.phase !== "spill" || this.roundId !== "slagg") return null;
    const x = this.targets.find((o) => o.id === id && o.state === "oppe");
    if (!x) return null;
    this.note("r", id);
    x.state = "raket";
    if (x.kind === "slagg") {
      this.raked++;
      this.hitStreak++;
      this.mult = 1 + Math.min(4, Math.floor(this.hitStreak / 3));
      this.addPts(40 * this.mult);
    } else {
      this.steelRaked++;
      this.hitStreak = 0;
      this.mult = 1;
    }
    return x.kind;
  }

  /** Tapper nå (temperaturen er satt) og går over til å helle i øsa */
  tap(): void {
    if (this.phase !== "spill" || this.roundId !== "tapp" || this.tapStage !== "varm") return;
    this.note("t");
    this.tapDev = this.tapTemp - this.tapTarget;
    const ad = Math.abs(this.tapDev);
    this.addPts(Math.max(0, 300 - 15 * ad));
    this.tapStage = "osa";
  }

  /** Retter opp ovnen: ferdig med å helle */
  finishPour(): void {
    if (this.phase !== "spill" || this.roundId !== "tapp" || this.tapStage !== "osa") return;
    this.note("p");
    this.holding = false;
    this.endRound();
  }

  tick(dt: number): GameEvent | null {
    if (this.phase !== "spill" || dt <= 0) return null;
    this.t += dt;
    switch (this.roundId) {
      case "smelt":
        return this.tickMelt(dt);
      case "rens":
        return this.tickRefine(dt);
      case "slagg":
        return this.tickSlag(dt);
      case "tapp":
        return this.tickTap(dt);
    }
  }

  // ---------------------------------------------------------------- //
  private tickMelt(dt: number): GameEvent | null {
    let event: GameEvent | null = null;
    this.oxygen = this.melted >= 0.5;
    const target = this.holding ? HEAT_C_S + (this.oxygen ? OXY_HEAT_C_S : 0) : -COOL_C_S + (this.oxygen ? 8 : 0);
    this.vel += (target - this.vel) * Math.min(1, dt / INERTIA_S);
    this.temp += this.vel * dt;
    // Skrapkurvene: varsel først, så faller de i
    if (!this.bucket && this.t >= this.nextBucketS && this.melted < 0.92) {
      this.bucket = { kind: this.random() < 0.62 ? "tung" : "lett", inS: BUCKET_WARN_S };
    }
    if (this.bucket) {
      this.bucket.inS -= dt;
      if (this.bucket.inS <= 0) {
        const c = this.bucket.kind === "tung" ? HEAVY_C : LIGHT_C;
        this.bucketEffect = { left: BUCKET_EFFECT_S, rate: c / BUCKET_EFFECT_S };
        this.bucket = null;
        this.nextBucketS = this.t + 1.6 + this.random() * 1.3;
        event = "kurv";
      }
    }
    if (this.bucketEffect) {
      const d = Math.min(dt, this.bucketEffect.left);
      this.temp += this.bucketEffect.rate * d;
      this.bucketEffect.left -= d;
      if (this.bucketEffect.left <= 0) this.bucketEffect = null;
    }
    this.temp = Math.max(1450, Math.min(1760, this.temp));
    const t = this.temp;
    const inBand = t >= MELT_BAND[0] && t <= MELT_BAND[1];
    const f = t < MELT_BAND[0] - 40 ? 0.3 : t < MELT_BAND[0] ? 0.65 : inBand ? 1 : 1.2;
    this.melted = Math.min(1, this.melted + (f / MELT_S) * dt);
    this.meltS += dt;
    if (inBand) {
      this.inBandS += dt;
      this.streakS += dt;
      this.mult = 1 + Math.min(4, Math.floor(this.streakS / 1.5));
      this.addPts(20 * this.mult * dt);
    } else {
      this.streakS = 0;
      this.mult = 1;
    }
    if (t > MELT_BAND[1] + 15) this.hotS += dt;
    if (t < MELT_BAND[0] - 15) this.coldS += dt;
    if (this.melted >= 1 || this.t >= MELT_MAX_S) return this.endRound();
    return event;
  }

  private tickRefine(dt: number): GameEvent | null {
    let event: GameEvent | null = null;
    if (this.lockS > 0) {
      this.lockS -= dt;
      this.holding = false;
    }
    if (this.holding) {
      // Avkarbonisering går saktere når det er lite karbon igjen
      const rate = this.carbonRate * Math.min(1, 0.4 + this.carbon / 0.15);
      this.carbon = Math.max(0.01, this.carbon - rate * dt);
      this.foam += (0.12 + 0.3 * Math.min(1, this.carbon / 0.3)) * dt;
      if (this.carbon < this.window[0]) this.burnS += dt;
      if (this.foam >= 1) {
        this.boilovers++;
        this.foam = 0.6;
        this.lockS = BOIL_LOCK_S;
        this.holding = false;
        this.addPts(-100);
        event = "kok";
      }
    } else {
      this.foam = Math.max(0, this.foam - FOAM_DOWN * dt);
    }
    if (this.t >= RENS_MAX_S) return this.endRound();
    return event;
  }

  private spawnTargets(): void {
    const list: Target[] = [];
    let id = 0;
    for (let i = 0; i < SLAG_LUMPS; i++) {
      const born = 0.2 + (i / SLAG_LUMPS) * 6.6 + this.random() * 0.3;
      list.push({ id: id++, kind: "slagg", x: 0, y: 0, born, life: 1.7 - 0.6 * (born / 7), state: "venter" });
    }
    for (let i = 0; i < STEEL_BLOBS; i++) {
      const born = 0.8 + this.random() * 6.2;
      list.push({ id: id++, kind: "stal", x: 0, y: 0, born, life: 1.3, state: "venter" });
    }
    this.targets = list.sort((a, b) => a.born - b.born);
  }

  /** Legger klumpen der den ikke dekker en annen som er oppe */
  private place(x: Target): void {
    const up = this.targets.filter((o) => o.state === "oppe");
    for (let k = 0; k < 10; k++) {
      x.x = 0.14 + this.random() * 0.72;
      x.y = 0.2 + this.random() * 0.6;
      if (up.every((o) => Math.hypot(o.x - x.x, (o.y - x.y) * 0.7) > 0.2)) return;
    }
  }

  private tickSlag(_dt: number): GameEvent | null {
    for (const x of this.targets) {
      if (x.state === "venter" && this.t >= x.born) {
        this.place(x);
        x.state = "oppe";
      } else if (x.state === "oppe" && this.t >= x.born + x.life) {
        x.state = "sank";
        if (x.kind === "slagg") {
          this.hitStreak = 0;
          this.mult = 1;
        }
      }
    }
    if (this.t >= SLAG_S && this.targets.every((o) => o.state !== "oppe" && o.state !== "venter"))
      return this.endRound();
    return null;
  }

  private tickTap(dt: number): GameEvent | null {
    if (this.tapStage === "varm") {
      // Temperaturen stiger fortere og fortere: trykk i tide
      this.tapTemp += (10 + 5 * this.t) * dt;
      if (this.tapTemp >= this.tapTarget + TAP_LATE_C) {
        this.tap();
        return "tappet";
      }
      return null;
    }
    const target = this.holding ? 1 : 0;
    this.flow += (target - this.flow) * Math.min(1, dt / POUR_INERTIA_S);
    if (!this.holding && this.flow < 0.01) this.flow = 0;
    const before = this.fill;
    this.fill += this.flow * this.fillRate * dt;
    if (before <= 1 && this.fill > 1) {
      this.addPts(-200);
      if (this.fill >= OVERFLOW_END || this.t >= TAPP_MAX_S) return this.endRound();
      return "over";
    }
    if (this.fill >= OVERFLOW_END || this.t >= TAPP_MAX_S) return this.endRound();
    // Fullt og strålen har stoppet: ovnen rettes opp av seg selv
    if (this.flow === 0 && this.fill >= LADLE_BAND[0]) {
      this.stillS += dt;
      if (this.stillS >= 0.6) return this.endRound();
    } else this.stillS = 0;
    return null;
  }

  private addPts(p: number): void {
    this.points = Math.max(0, this.points + p);
    this.roundPts[this.round] += p;
  }

  private endRound(): GameEvent {
    this.holding = false;
    if (this.roundId === "rens") {
      const [lo, hi] = this.window;
      const c = this.carbon;
      const mid = (lo + hi) / 2;
      if (c >= lo && c <= hi) this.addPts(300 + 200 * (1 - Math.abs(c - mid) / ((hi - lo) / 2)));
      else if (c >= lo - 0.02 && c <= hi + 0.02) this.addPts(100);
    }
    if (this.roundId === "tapp") {
      const f = this.fill;
      if (f <= 1 && f >= LADLE_BAND[0]) this.addPts(300 + (100 * (f - LADLE_BAND[0])) / (1 - LADLE_BAND[0]));
      else if (f <= 1 && f >= 0.85) this.addPts(150);
    }
    this.round++;
    this.t = 0;
    this.mult = 1;
    if (this.round >= ROUNDS.length) {
      this.score = this.buildScore();
      this.points = this.score.points;
      this.phase = "ferdig";
      return "ferdig";
    }
    this.phase = "klar";
    return "runde";
  }

  // ---------------------------------------------------------------- //
  // Vurdering og resultat for spillet
  // ---------------------------------------------------------------- //
  private buildScore(): Score {
    const req = this.req;
    const spec = GRADES[req.grade];
    const lines: ScoreLine[] = [];

    const meltPct = this.meltS > 0 ? this.inBandS / this.meltS : 0;
    const s1 = meltPct >= 0.7 ? 3 : meltPct >= 0.5 ? 2 : meltPct >= 0.3 ? 1 : 0;
    lines.push({
      title: "Smelting",
      stars: s1,
      text:
        `Temperaturen var i det grønne ${Math.round(meltPct * 100)} % av tiden.` +
        (this.hotS > 2
          ? " Badet var ofte for varmt – det sliter på foringen."
          : this.coldS > 2
            ? " Badet var ofte for kaldt – smeltingen tok lengre tid og brukte mer strøm."
            : s1 < 3
              ? " Se på kurvene som kommer: slipp før en lett kurv, hold før en tung."
              : ""),
      chapter: "lysbue",
      lesson:
        "Skrapet smelter jevnest når badet holdes like over smeltepunktet. For varmt sliter på foringen og koster strøm; for kaldt stopper smeltingen opp.",
    });

    const [lo, hi] = this.window;
    const c = this.carbon;
    const inC = c >= lo && c <= hi;
    const nearC = c >= lo - 0.02 && c <= hi + 0.02;
    const s2 = Math.max(0, (inC ? 3 : nearC ? 2 : 1) - (this.boilovers > 0 ? 1 : 0));
    lines.push({
      title: "Rensing",
      stars: s2,
      text:
        `Karbonet ble ${fmt(c, 3)} % (grønt: ${fmt(lo, 2)}–${fmt(hi, 2)} %).` +
        (c > hi
          ? " For høyt – blås litt lenger."
          : c < lo
            ? " For lavt – da brenner oksygenet jern, og stål går tapt i slaggen."
            : "") +
        (this.boilovers > 0
          ? ` Slaggen kokte over ${this.boilovers === 1 ? "én gang" : `${this.boilovers} ganger`} – slipp før skummet når kanten.`
          : ""),
      chapter: "karbon",
      lesson:
        "Oksygen brenner karbonet til CO-gass, som får slaggen til å skumme. Når karbonet er brukt opp, brenner oksygenet jern i stedet.",
    });

    const r = this.raked / SLAG_LUMPS;
    const dephos = req.dephos ?? 0.6;
    const pFactor = Math.max(0.3, 0.55 + 0.55 * r - Math.min(0.2, this.hotS * 0.02));
    const p = Math.max(0.003, req.mix.p * (1 - Math.min(0.9, dephos * pFactor)));
    const pOk = p <= spec.pMax;
    const s3raw = r >= 0.85 ? 3 : r >= 0.65 ? 2 : r >= 0.4 ? 1 : 0;
    const s3 = this.steelRaked >= 3 ? Math.min(1, s3raw) : this.steelRaked > 0 ? Math.min(2, s3raw) : s3raw;
    lines.push({
      title: "Avslagging",
      stars: s3,
      text:
        `Du raket ut ${this.raked} av ${SLAG_LUMPS} slaggklumper. Fosfor ${fmt(p, 3)} % (maks ${fmt(spec.pMax, 3)} %).` +
        (this.steelRaked > 0 ? ` Du tok ${this.steelRaked} blanke klumper – det var stål.` : "") +
        (!pOk ? " Fosforet er for høyt for kvaliteten." : ""),
      chapter: "fosfor",
      lesson:
        "Fosforet samles i slaggen. Rakes den ikke ut før oppvarmingen, går fosforet tilbake i stålet. Raker du med stål, går stålet tapt.",
    });

    const dev = this.tapDev ?? TAP_LATE_C;
    const ad = Math.abs(dev);
    const s4 = ad <= TAP_OK_C ? 3 : ad <= 15 ? 2 : ad <= 30 ? 1 : 0;
    lines.push({
      title: "Tappetemperatur",
      stars: s4,
      text:
        `Tappet ved ${Math.round(this.tapTarget + dev)} °C, målet var ${this.tapTarget} °C.` +
        (dev > 15
          ? " For varmt koster strøm og sliter på foringen."
          : dev < -15
            ? " For kaldt kan stålet størkne i øsa."
            : ""),
      chapter: "ildfast",
      lesson:
        "Stålet må være varmt nok til å holde seg flytende helt fram til støpingen, men hver grad ekstra koster strøm og sliter på foringen.",
    });

    const over = Math.max(0, this.fill - 1);
    const fill = Math.min(1, this.fill);
    const s5 = over > 0.015 ? 0 : over > 0 ? 1 : fill >= LADLE_BAND[0] ? 3 : fill >= 0.85 ? 2 : 1;
    lines.push({
      title: "Øsa",
      stars: s5,
      text:
        over > 0
          ? `Øsa rant over med ${Math.round(over * 100)} % – flytende stål på gulvet. Slipp litt før streken.`
          : `Øsa ble ${Math.round(fill * 100)} % full (grønt: ${Math.round(LADLE_BAND[0] * 100)}–100 %).` +
            (fill < LADLE_BAND[0] ? " Resten ble igjen i ovnen." : ""),
      chapter: "oseovn",
      lesson:
        "Øsa rommer bare så mye. Litt stål skal bli igjen i ovnen (sumpen), for det hjelper neste charge å smelte.",
    });

    const total = lines.reduce((s, l) => s + l.stars, 0);
    const rating = total >= 14 ? 5 : total >= 11 ? 4 : total >= 8 ? 3 : total >= 5 ? 2 : 1;
    const headline = ["", "Det kan bli bedre", "Godt forsøk", "Bra kjørt!", "Veldig bra!", "Perfekt charge!"][rating];
    const points = Math.round(this.points + rating * 100);

    // Til spillet: samme skala som prosessmodellen ga før (se engine.completeManual)
    const coldFrac = this.meltS > 0 ? this.coldS / this.meltS : 0;
    const hotFrac = this.meltS > 0 ? this.hotS / this.meltS : 0;
    const baseKwh = req.kwhPerT ?? 420;
    const kwhPerT = baseKwh * (s1 === 3 ? 0.96 : 1) * (1 + 0.3 * coldFrac + 0.2 * hotFrac) + Math.max(0, dev) * 0.5;
    const wear = 0.01 * (0.9 + 2 * hotFrac + (dev > 15 ? 0.3 : 0) + this.boilovers * 0.1);
    const minutes = (req.cycleMin ?? 60) * Math.max(0.92, Math.min(1.4, this.meltS / MELT_S));
    const lossFraction = Math.min(
      0.5,
      this.boilovers * 0.004 + this.burnS * 0.01 + this.steelRaked * 0.005 + (over > 0 ? over : 0),
    );
    const carbonPct = c + (0.07 - (lo + hi) / 2);
    const deviations: string[] = [];
    if (!inC) deviations.push(c > hi ? "karbon for høyt" : "karbon for lavt");
    if (!pOk) deviations.push("fosfor for høyt");
    if (ad > 20) deviations.push(dev > 0 ? "tappet for varmt" : "tappet for kaldt");
    return {
      lines,
      rating,
      headline,
      points,
      result: {
        carbonPct,
        phosphorusPct: Math.round(p * 10000) / 10000,
        tempDeviationC: dev,
        kwhPerT,
        wear,
        minutes,
        ok: deviations.length === 0,
        deviations,
        stars: rating,
        lossFraction,
        points,
      },
    };
  }
}

// ------------------------------------------------------------------ //
// Testspilleren: spiller som en flink spiller, eller slurvete
// ------------------------------------------------------------------ //
export type Policy = "flink" | "slurvete";

/** Spiller en hel charge. Den flinke reagerer som et menneske (ca. 0,2 s), den slurvete gjør nesten ingenting. */
export function autoPlay(game: ChargeGame, policy: Policy): { score: Score; seconds: number } {
  const dt = 1 / 30;
  let seconds = 0;
  let react = 0;
  let lastRake = 0;
  while (game.phase !== "ferdig" && seconds < 300) {
    if (game.phase === "klar") game.start();
    game.tick(dt);
    seconds += dt;
    react += dt;
    if (react < 0.2) continue;
    react = 0;
    if (policy === "slurvete") {
      if (game.roundId === "rens") game.finishRefining();
      if (game.roundId === "tapp" && game.tapStage === "osa") game.hold(true);
      continue;
    }
    const center = (MELT_BAND[0] + MELT_BAND[1]) / 2;
    switch (game.roundId) {
      case "smelt": {
        let future = game.temp + game.vel * 0.45;
        if (game.bucket && game.bucket.inS < 0.7) future += game.bucket.kind === "tung" ? HEAVY_C : LIGHT_C;
        game.hold(future < center);
        break;
      }
      case "rens": {
        const [lo, hi] = game.window;
        const mid = (lo + hi) / 2;
        if (game.carbon <= mid + 0.008) {
          game.hold(false);
          game.finishRefining();
        } else game.hold(game.foam < 0.82);
        break;
      }
      case "slagg": {
        const x = game.targets.find((o) => o.state === "oppe" && o.kind === "slagg" && game.t - o.born >= 0.35);
        if (x && game.t - lastRake >= 0.25) {
          game.rake(x.id);
          lastRake = game.t;
        }
        break;
      }
      case "tapp":
        if (game.tapStage === "varm") {
          if (game.tapTemp >= game.tapTarget - 4) game.tap();
        } else game.hold(game.fill < 0.905);
        break;
    }
  }
  return { score: game.score!, seconds };
}
