/**
 * Flere spill i kontrollrommet (B-505): støpemaskinen og valseverket, i samme stil som chargen (B-175) – tre korte runder,
 * stjerner og poeng, og en leksjon når noe gikk galt. To slags runder:
 *
 *   - «hold»: hold en verdi i det grønne. Å holde inne skyver den én vei, å slippe den andre, med litt treghet.
 *     Hendelser underveis (en ny øse, en kald blokk) dytter verdien eller flytter det grønne.
 *   - «tid»: en markør går over en bane. Trykk når den er i det grønne – flere ganger, fortere og smalere for hver gang.
 *
 * Logikken holdes utenfor React, så testene og testspilleren kan spille uten nettleser. Spillene er trening i eget verk
 * (spilltid, B-323): fagpoeng og en liten fordel i drifta, ingen penger og ingenting mellom spillere.
 */
import { seededRandom } from "./chargeGame";
import type { IconName } from "../icons";

export type MiniId = "stoping" | "valsing";
export type MiniPhase = "klar" | "spill" | "ferdig";
export type MiniEvent = "hendelse" | "treff" | "bom" | "runde" | "ferdig";

/** En hendelse i en hold-runde: dytter verdien og/eller flytter det grønne, med et varsel litt før */
export interface HoldEvent {
  atS: number;
  text: string;
  /** Endring i verdien når hendelsen kommer (spres over et halvt sekund) */
  push?: number;
  /** Ny grønn sone fra nå av */
  band?: [number, number];
}

export interface HoldRound {
  kind: "hold";
  id: string;
  title: string;
  icon: IconName;
  what: string;
  how: string;
  /** Teksten på knappen man holder inne */
  holdLabel: string;
  unit: string;
  digits: number;
  min: number;
  max: number;
  start: number;
  band: [number, number];
  /** Fart (enheter per sekund) mens man holder inne, og mens man slipper (fortegnet gir retningen) */
  holdRate: number;
  releaseRate: number;
  inertiaS: number;
  durationS: number;
  events: HoldEvent[];
  /** Over/under det grønne med så mye regnes som farlig (gir egen tekst og trekk) */
  danger: number;
  dangerHigh: string;
  dangerLow: string;
  chapter: string;
  lesson: string;
}

export interface TimingRound {
  kind: "tid";
  id: string;
  title: string;
  icon: IconName;
  what: string;
  how: string;
  tapLabel: string;
  /** Antall trykk */
  count: number;
  /** Sekunder markøren bruker over hele banen: første og siste gang */
  passS: [number, number];
  /** Bredden på det grønne: første og siste gang (andel av banen) */
  zone: [number, number];
  /** Det grønne flytter seg litt fra gang til gang (andel av banen rundt midten 0,65) */
  zoneJitter: number;
  missText: string;
  chapter: string;
  lesson: string;
}

export type MiniRound = HoldRound | TimingRound;

export interface MiniLine {
  title: string;
  stars: number;
  text: string;
  chapter: string;
  lesson: string;
}

export interface MiniScore {
  lines: MiniLine[];
  rating: number;
  headline: string;
  points: number;
}

export interface MiniDef {
  id: MiniId;
  title: string;
  intro: string;
  rounds: (random: () => number) => MiniRound[];
}

const fmt = (v: number, d: number) => v.toFixed(d).replace(".", ",");

// ------------------------------------------------------------------ //
// Støpemaskinen
// ------------------------------------------------------------------ //
export const CASTING: MiniDef = {
  id: "stoping",
  title: "Støpemaskinen",
  intro:
    "Stålet fra øsa renner gjennom mellomkaret og ned i kokillen, der det størkner til en streng som kappes til emner.",
  rounds: (r) => [
    {
      kind: "hold",
      id: "kar",
      title: "Hold mellomkaret fullt",
      icon: "droplet",
      what: "Mellomkaret jevner ut strømmen fra øsa. For lite stål, og slagg følger med ned i kokillen. For mye, og det renner over.",
      how: "Hold inne for å åpne øsa, slipp for å stenge. Strengen tapper hele tiden.",
      holdLabel: "Åpne øsa",
      unit: "%",
      digits: 0,
      min: 0,
      max: 110,
      start: 45,
      band: [60, 80],
      holdRate: 22,
      releaseRate: -14,
      inertiaS: 0.45,
      durationS: 12,
      events: [{ atS: 5 + r() * 2.5, text: "Ny øse – strømmen stopper et øyeblikk", push: -18 }],
      danger: 12,
      dangerHigh: "Mellomkaret rant nesten over.",
      dangerLow: "Mellomkaret ble så lavt at slagg kunne følge med ned i kokillen.",
      chapter: "streng",
      lesson:
        "Mellomkaret er et lite basseng mellom øsa og kokillen. Et jevnt nivå gir jevn strøm i kokillen, og slaggen flyter oppå i stedet for å bli med stålet.",
    },
    {
      kind: "hold",
      id: "fart",
      title: "Støpefarten",
      icon: "gauge",
      what: "Skallet i kokillen må bli tykt nok før strengen slipper. For fort, og skallet revner – et strenggjennombrudd. For sakte, og verket lager mindre.",
      how: "Hold inne for å øke farten, slipp for å senke den. Følg det grønne: varmere stål trenger lavere fart.",
      holdLabel: "Øk farten",
      unit: "m/min",
      digits: 2,
      min: 0.4,
      max: 3.2,
      start: 1.2,
      band: [1.6, 2.0],
      holdRate: 0.55,
      releaseRate: -0.4,
      inertiaS: 0.5,
      durationS: 13,
      events: [
        { atS: 4 + r() * 1.5, text: "Varmere stål fra øsa – senk farten", band: [1.25, 1.6] },
        { atS: 8.5 + r() * 1.5, text: "Stålet er kaldere igjen – du kan øke", band: [1.8, 2.2] },
      ],
      danger: 0.25,
      dangerHigh: "Farten var så høy at skallet nesten revnet.",
      dangerLow: "Farten var så lav at strengen nesten frøs fast.",
      chapter: "streng",
      lesson:
        "Skallet størkner innenfra kokillens kobbervegger. Er stålet varmt, størkner det saktere, så farten må ned. Et gjennombrudd stopper støpemaskinen i timer.",
    },
    {
      kind: "tid",
      id: "kapp",
      title: "Kapp emnene",
      icon: "target",
      what: "Strengen kappes til emner i riktig lengde. For korte eller for lange emner blir kapp – stål som må smeltes om.",
      how: "Trykk «Kapp!» når merket på strengen er i det grønne.",
      tapLabel: "Kapp!",
      count: 6,
      passS: [2.4, 1.5],
      zone: [0.16, 0.09],
      zoneJitter: 0.12,
      missText: "Strengen gikk forbi – emnet ble for langt.",
      chapter: "streng",
      lesson:
        "Emnene kappes med skjærebrenner mens strengen går. Valseverket og kundene vil ha en fast lengde, så alt som er for kort eller for langt, blir returskrap.",
    },
  ],
};

// ------------------------------------------------------------------ //
// Valseverket
// ------------------------------------------------------------------ //
export const ROLLING: MiniDef = {
  id: "valsing",
  title: "Valseverket",
  intro: "Emnene varmes opp igjen og presses gjennom valsepar, ett etter ett, til de er tynne armeringsstenger.",
  rounds: (r) => [
    {
      kind: "hold",
      id: "ovn",
      title: "Varm emnene",
      icon: "flame",
      what: "Emnet må være varmt nok til å kunne formes. For kaldt, og valsene slites eller stopper. For varmt, og overflaten brenner bort som glødeskall.",
      how: "Hold inne for å fyre, slipp for å la ovnen kjøle.",
      holdLabel: "Fyr",
      unit: "°C",
      digits: 0,
      min: 900,
      max: 1350,
      start: 1040,
      band: [1150, 1200],
      holdRate: 55,
      releaseRate: -35,
      inertiaS: 0.5,
      durationS: 12,
      events: [{ atS: 5 + r() * 2.5, text: "Kalde emner rett fra lageret kommer inn", push: -60 }],
      danger: 40,
      dangerHigh: "Emnene ble så varme at mye stål brant bort som glødeskall.",
      dangerLow: "Emnene ble så kalde at valsene kunne ha stoppet.",
      chapter: "valsing",
      lesson:
        "Stål er mykt nok til å valses ved 1 100–1 250 °C. Kaldere emner krever mer kraft og sliter valsene; varmere emner taper stål som glødeskall på overflaten.",
    },
    {
      kind: "tid",
      id: "valser",
      title: "Still valsene",
      icon: "sliders-horizontal",
      what: "Hvert valsepar gjør stangen litt tynnere. Står spalten feil, blir stangen feil dimensjon.",
      how: "Trykk «Still!» når merket er i det grønne – én gang for hvert valsepar.",
      tapLabel: "Still!",
      count: 5,
      passS: [2.2, 1.4],
      zone: [0.15, 0.08],
      zoneJitter: 0.14,
      missText: "Valseparet sto feil – stangen ble for tykk.",
      chapter: "valsing",
      lesson:
        "Stangen går gjennom mange valsepar på rad, og hvert par tar litt av tykkelsen. En feil spalte tidlig følger med hele veien, så dimensjonen blir feil.",
    },
    {
      kind: "hold",
      id: "kjol",
      title: "Kjøl stangen",
      icon: "wind",
      what: "Rett etter siste valsepar spyles stangen med vann. Overflaten blir hard, kjernen holder seg seig. For mye vann, og stangen blir sprø. For lite, og den blir myk.",
      how: "Hold inne for vannkjøling, slipp for å la varmen fra kjernen komme tilbake.",
      holdLabel: "Kjøl",
      unit: "°C",
      digits: 0,
      min: 350,
      max: 950,
      start: 860,
      band: [560, 640],
      holdRate: -95,
      releaseRate: 55,
      inertiaS: 0.45,
      durationS: 11,
      events: [{ atS: 4.5 + r() * 2, text: "En tykkere stang kommer – den holder mer varme", push: 70 }],
      danger: 60,
      dangerHigh: "Stangen ble for lite kjølt og blir for myk.",
      dangerLow: "Stangen ble kjølt så mye at den kan bli sprø.",
      chapter: "valsing",
      lesson:
        "Vannkjølingen gir armeringsstål en hard overflate og en seig kjerne. Da blir stangen sterk uten dyre legeringer – men bare når temperaturen etter kjølingen treffer.",
    },
  ],
};

export const MINI_DEFS: Record<MiniId, MiniDef> = { stoping: CASTING, valsing: ROLLING };

/** Én tidsrunde: hvor det grønne er og hvor fort markøren går, gang for gang */
interface Pass {
  center: number;
  width: number;
  passS: number;
}

/** Ett av spillene i kontrollrommet. Alt endres gjennom metodene; grensesnittet leser feltene. */
export class MiniGame {
  readonly def: MiniDef;
  readonly rounds: MiniRound[];
  round = 0;
  phase: MiniPhase = "klar";
  /** Sekunder i runden som spilles nå */
  t = 0;
  holding = false;
  points = 0;
  mult = 1;
  score: MiniScore | null = null;

  // Hold-runden
  value = 0;
  vel = 0;
  band: [number, number] = [0, 0];
  /** Hendelsen som kommer (varsel i ett sekund før den slår til), eller som nettopp kom */
  notice: { text: string; inS: number } | null = null;
  private nextEvent = 0;
  private pushLeft = 0;
  private pushRate = 0;
  private streakS = 0;
  private inBandS = 0;
  private highS = 0;
  private lowS = 0;
  /** Verdien har vært i det grønne: først da teller farlige verdier (starten er alltid utenfor) */
  private reached = false;

  // Tidsrunden
  pos = 0;
  pass = 0;
  passes: Pass[] = [];
  hits: number[] = [];
  /** Siste trykk: treff (0–1) eller bom, for å vise det et øyeblikk */
  lastTap: { quality: number; at: number } | null = null;

  private readonly results: { stars: number; text: string }[] = [];
  private readonly random: () => number;

  constructor(def: MiniDef, random: () => number = Math.random) {
    this.def = def;
    this.random = random;
    this.rounds = def.rounds(random);
    this.prepare();
  }

  get current(): MiniRound {
    return this.rounds[Math.min(this.round, this.rounds.length - 1)];
  }

  private prepare(): void {
    const r = this.current;
    this.t = 0;
    this.mult = 1;
    this.holding = false;
    if (r.kind === "hold") {
      this.value = r.start;
      this.vel = 0;
      this.band = [...r.band];
      this.notice = null;
      this.nextEvent = 0;
      this.pushLeft = 0;
      this.streakS = this.inBandS = this.highS = this.lowS = 0;
      this.reached = false;
    } else {
      this.pos = 0;
      this.pass = 0;
      this.hits = [];
      this.lastTap = null;
      this.passes = Array.from({ length: r.count }, (_, i) => {
        const k = r.count > 1 ? i / (r.count - 1) : 0;
        return {
          center: 0.65 + (this.random() - 0.5) * 2 * r.zoneJitter,
          width: r.zone[0] + (r.zone[1] - r.zone[0]) * k,
          passS: r.passS[0] + (r.passS[1] - r.passS[0]) * k,
        };
      });
    }
  }

  start(): void {
    if (this.phase !== "klar") return;
    this.phase = "spill";
  }

  hold(on: boolean): void {
    this.holding = on && this.phase === "spill" && this.current.kind === "hold";
  }

  /** Et trykk i tidsrunden. Gir treffet (0–1) eller null ved bom */
  tap(): number | null {
    const r = this.current;
    if (this.phase !== "spill" || r.kind !== "tid") return null;
    const p = this.passes[this.pass];
    const off = Math.abs(this.pos - p.center);
    const half = p.width / 2;
    const quality = off <= half ? 1 - (off / half) * 0.5 : 0;
    return this.registerTap(quality) > 0 ? quality : null;
  }

  private registerTap(quality: number): number {
    this.hits.push(quality);
    this.lastTap = { quality, at: this.t };
    if (quality > 0) {
      this.mult = Math.min(5, this.mult + 1);
      this.addPts(Math.round(60 * quality * this.mult));
    } else this.mult = 1;
    this.pass++;
    this.pos = 0;
    return quality;
  }

  tick(dt: number): MiniEvent | null {
    if (this.phase !== "spill" || dt <= 0) return null;
    this.t += dt;
    const r = this.current;
    return r.kind === "hold" ? this.tickHold(r, dt) : this.tickTiming(r, dt);
  }

  private tickHold(r: HoldRound, dt: number): MiniEvent | null {
    let event: MiniEvent | null = null;
    // Varsel ett sekund før hendelsen, så den kan møtes
    const next = r.events[this.nextEvent];
    if (next && this.t >= next.atS - 1 && (!this.notice || this.notice.text !== next.text))
      this.notice = { text: next.text, inS: next.atS - this.t };
    if (this.notice) this.notice.inS -= dt;
    if (next && this.t >= next.atS) {
      if (next.push) {
        this.pushLeft = 0.5;
        this.pushRate = next.push / 0.5;
      }
      if (next.band) this.band = [...next.band];
      this.nextEvent++;
      event = "hendelse";
    }
    if (this.notice && this.notice.inS < -1.5) this.notice = null;
    const target = this.holding ? r.holdRate : r.releaseRate;
    this.vel += (target - this.vel) * Math.min(1, dt / r.inertiaS);
    this.value += this.vel * dt;
    if (this.pushLeft > 0) {
      const d = Math.min(dt, this.pushLeft);
      this.value += this.pushRate * d;
      this.pushLeft -= d;
    }
    this.value = Math.max(r.min, Math.min(r.max, this.value));
    const [lo, hi] = this.band;
    if (this.value >= lo && this.value <= hi) {
      this.reached = true;
      this.inBandS += dt;
      this.streakS += dt;
      this.mult = 1 + Math.min(4, Math.floor(this.streakS / 1.5));
      this.addPts(20 * this.mult * dt);
    } else {
      this.streakS = 0;
      this.mult = 1;
    }
    if (this.reached && this.value > hi + r.danger) this.highS += dt;
    if (this.reached && this.value < lo - r.danger) this.lowS += dt;
    if (this.t >= r.durationS) return this.endRound();
    return event;
  }

  private tickTiming(r: TimingRound, dt: number): MiniEvent | null {
    // Siste trykk er gjort: runden er over (trykket selv avslutter den ikke, så grensesnittet rekker å vise treffet)
    if (this.pass >= r.count) return this.t - (this.lastTap?.at ?? 0) >= 0.4 ? this.endRound() : null;
    const p = this.passes[this.pass];
    this.pos += dt / p.passS;
    if (this.pos >= 1) {
      this.registerTap(0);
      return "bom";
    }
    return null;
  }

  private addPts(p: number): void {
    this.points = Math.max(0, this.points + p);
  }

  private endRound(): MiniEvent {
    const r = this.current;
    this.holding = false;
    if (r.kind === "hold") {
      const share = this.inBandS / r.durationS;
      let stars = share >= 0.7 ? 3 : share >= 0.5 ? 2 : share >= 0.3 ? 1 : 0;
      const danger = this.highS + this.lowS;
      if (danger > 1) stars = Math.max(0, stars - 1);
      const text =
        `I det grønne ${Math.round(share * 100)} % av tiden.` +
        (this.highS > 1 ? ` ${r.dangerHigh}` : "") +
        (this.lowS > 1 ? ` ${r.dangerLow}` : "");
      this.results.push({ stars, text });
      this.addPts(stars * 100);
    } else {
      const good = this.hits.filter((q) => q > 0).length;
      const avg = this.hits.length ? this.hits.reduce((a, q) => a + q, 0) / this.hits.length : 0;
      const stars = good === r.count && avg >= 0.8 ? 3 : good >= r.count - 1 ? 2 : good >= r.count / 2 ? 1 : 0;
      const text =
        `${good} av ${r.count} i det grønne` +
        (good ? `, treffsikkerhet ${Math.round(avg * 100)} %.` : ".") +
        (good < r.count ? ` ${r.missText}` : "");
      this.results.push({ stars, text });
      this.addPts(stars * 100);
    }
    this.round++;
    if (this.round >= this.rounds.length) {
      this.score = this.buildScore();
      this.points = this.score.points;
      this.phase = "ferdig";
      return "ferdig";
    }
    this.phase = "klar";
    this.prepare();
    return "runde";
  }

  private buildScore(): MiniScore {
    const lines: MiniLine[] = this.rounds.map((r, i) => ({
      title: r.title,
      stars: this.results[i]?.stars ?? 0,
      text: this.results[i]?.text ?? "",
      chapter: r.chapter,
      lesson: r.lesson,
    }));
    const total = lines.reduce((a, l) => a + l.stars, 0);
    const rating = total >= 8 ? 5 : total >= 6 ? 4 : total >= 4 ? 3 : total >= 2 ? 2 : 1;
    const headline = ["", "Det kan bli bedre", "Godt forsøk", "Bra kjørt!", "Veldig bra!", "Perfekt!"][rating];
    return { lines, rating, headline, points: Math.round(this.points + rating * 100) };
  }
}

/** Tekst for verdien i en hold-runde, f.eks. «1,85 m/min» */
export function fmtValue(r: HoldRound, v: number): string {
  return `${fmt(v, r.digits)} ${r.unit}`;
}

/** Nytt spill fra et frø (trening: tilfeldig frø) */
export function newMiniGame(id: MiniId, seed?: number): MiniGame {
  return new MiniGame(MINI_DEFS[id], seed !== undefined ? seededRandom(seed) : undefined);
}

// ------------------------------------------------------------------ //
// Testspilleren: flink (reagerer som et menneske, ca. 0,15 s) eller slurvete (gjør nesten ingenting)
// ------------------------------------------------------------------ //
export function autoPlayMini(game: MiniGame, policy: "flink" | "slurvete"): { score: MiniScore; seconds: number } {
  const dt = 1 / 30;
  let seconds = 0;
  let react = 0;
  while (game.phase !== "ferdig" && seconds < 300) {
    if (game.phase === "klar") game.start();
    game.tick(dt);
    seconds += dt;
    react += dt;
    if (react < 0.15) continue;
    react = 0;
    const r = game.current;
    if (policy === "slurvete") {
      if (r.kind === "hold") game.hold(game.t % 4 < 2);
      continue;
    }
    if (r.kind === "hold") {
      const mid = (game.band[0] + game.band[1]) / 2;
      // Ser litt fram: hvor er verdien om et halvt sekund, og kommer det et dytt?
      let future = game.value + game.vel * 0.5;
      if (game.notice && game.notice.inS > 0 && game.notice.inS < 0.6) {
        const e = r.events.find((x) => x.text === game.notice!.text);
        if (e?.push) future += e.push;
      }
      // holdRate > 0: å holde øker verdien; < 0: å holde senker den
      game.hold(r.holdRate > 0 ? future < mid : future > mid);
    } else {
      // Et menneske trykker litt før: der markøren er når trykket kommer fram
      const p = game.passes[game.pass];
      if (p && game.pos + 0.1 / p.passS >= p.center) game.tap();
    }
  }
  return { score: game.score!, seconds };
}
