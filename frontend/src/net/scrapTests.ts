/**
 * B-188: skraplagerets inntekt kan ikke økes med lokal fart. Kjøres med `npx tsx src/net/scrapTests.ts` og i `npm test`.
 *
 * Testen simulerer det appen faktisk sender: spillet lagres på nett ca. hvert 15. sekund mens man spiller, og
 * tidslinja får et tall (spilldag, tonn laget i alt) når spilldagen har skiftet siden sist (`uploadSave` i sync.ts).
 * Tallet har også spillminuttet (`game_min`). Serveren setter tidspunktet. Samme fabrikk (like mange tonn per spilldøgn) spilles på 1×, 3× og 10×, i 5 minutter,
 * 1 time og 8 timer per ekte dag, med pause, uten nett og med en gammel lagring. Tabellen som skrives ut viser hvorfor
 * resultatet blir likt: taket er én normal spilldag per ekte dag, og en normal spilldag er like stor i alle farter.
 */
import { ProductionMeter, SCRAP_INCOME, scrapYardIncome, utcDay } from "./scrapIncome";

declare const process: { exitCode?: number };

/** Spillminutter per ekte sekund på 1× (GAME_MIN_PER_REAL_S i spillet) */
const GAME_MIN_PER_REAL_S = 12;
/** Appen lagrer på nett omtrent så ofte mens man spiller (UPLOAD_INTERVAL_MS) */
const UPLOAD_EVERY_S = 15;
/** Fabrikken: tonn stål per spilldøgn (et storverk som i spillet) */
const TONS_PER_GAME_DAY = 1540;
const DAY_MS = 86_400_000;
const START = Date.parse("2026-10-05T00:00:00Z");

/** Ett spill med fabrikk, lokal tilstand og det serveren har sett */
class Player {
  minute = 8 * 60;
  produced = 50_000;
  /** Skiftdrift: stål bare kl. 06–22, i hele charger på 60 t (som et stålverk med to skift) */
  readonly shifts: boolean;
  constructor(shifts = false) {
    this.shifts = shifts;
  }
  /** Tonn laget i alt ved spillminutt m med skiftdrift (hele charger, ingenting om natta) */
  private shiftTons(m: number): number {
    const days = Math.floor(m / 1440);
    const inDay = Math.min(Math.max((m % 1440) - 6 * 60, 0), 16 * 60);
    const cont = (days * 16 * 60 + inDay) * (TONS_PER_GAME_DAY / (16 * 60));
    return Math.floor(cont / 60) * 60;
  }
  lastSnapshotDay = -1;
  readonly meter = new ProductionMeter();
  /** Tall som ikke er sendt fordi det ikke var nett */
  private offline = false;

  day(): number {
    return Math.floor(this.minute / 1440) + 1;
  }

  /** Spill `seconds` ekte sekunder med farten `speed` (0 = pause), fra ekte tidspunkt `at` */
  play(at: number, seconds: number, speed: number, online = true): void {
    this.offline = !online;
    for (let t = 0; t < seconds; t += UPLOAD_EVERY_S) {
      const step = Math.min(UPLOAD_EVERY_S, seconds - t);
      const gameMin = step * speed * GAME_MIN_PER_REAL_S;
      if (this.shifts) this.produced += this.shiftTons(this.minute + gameMin) - this.shiftTons(this.minute);
      else this.produced += (gameMin / 1440) * TONS_PER_GAME_DAY;
      this.minute += gameMin;
      this.upload(at + (t + step) * 1000);
    }
  }

  /** Som uploadSave: tidslinja får et tall (med spillminuttet) når spilldagen har skiftet (bare med nett) */
  upload(at: number): void {
    if (this.offline) return;
    if (this.day() !== this.lastSnapshotDay) {
      this.meter.register(at, Math.floor(this.minute), this.produced);
      this.lastSnapshotDay = this.day();
    }
  }

  /** Nettet er tilbake: appen lagrer med en gang */
  reconnect(at: number): void {
    this.offline = false;
    this.upload(at);
  }

  save(): { minute: number; produced: number } {
    return { minute: this.minute, produced: this.produced };
  }

  /** En gammel lagring legges inn (en annen nettleser, tilbakerulling) */
  restore(s: { minute: number; produced: number }): void {
    this.minute = s.minute;
    this.produced = s.produced;
    this.lastSnapshotDay = -1;
  }
}

let failed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`OK    ${name}`);
  } catch (e) {
    failed++;
    console.log(`FEIL  ${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
function assert(ok: unknown, msg: string): void {
  if (!ok) throw new Error(msg);
}
const fmt = (n: number) => Math.round(n).toLocaleString("nb-NO");
const dayKey = (i: number) => utcDay(START + i * DAY_MS);
/** Én normal spilldag i tonn skrap – taket per ekte dag */
const CAP = TONS_PER_GAME_DAY * SCRAP_INCOME.capGameDays * SCRAP_INCOME.scrapPerSteel;

interface Scenario {
  name: string;
  /** Hva spilleren gjør ekte dag i (0–6) */
  day: (p: Player, at: number, i: number) => void;
}

/** Spill samme økt hver dag kl. 18:00 UTC */
const daily =
  (minutes: number, speed: number): Scenario["day"] =>
  (p, at) =>
    p.play(at + 18 * 3600_000, minutes * 60, speed);

function run(s: Scenario, shifts = false): { p: Player; perDay: number[]; gained: number[]; gameDays: number[] } {
  const p = new Player(shifts);
  const perDay: number[] = [];
  const gained: number[] = [];
  const gameDays: number[] = [];
  // Dagen før: første tall fra tidslinja blir startpunktet (historien teller ikke)
  p.play(START - DAY_MS + 12 * 3600_000, 600, 1);
  for (let i = 0; i < 7; i++) {
    const before = p.minute;
    s.day(p, START + i * DAY_MS, i);
    gameDays.push((p.minute - before) / 1440);
    perDay.push(p.meter.countedT(dayKey(i)));
    gained.push(p.meter.gained(dayKey(i)));
  }
  return { p, perDay, gained, gameDays };
}

const honest: Scenario[] = [
  { name: "1× i 5 minutter per dag", day: daily(5, 1) },
  { name: "1× i 1 time per dag", day: daily(60, 1) },
  { name: "3× i 1 time per dag", day: daily(60, 3) },
  { name: "10× i 1 time per dag", day: daily(60, 10) },
  { name: "10× i 8 timer per dag", day: daily(480, 10) },
  {
    name: "10× i 1 time, men pause i 50 minutter",
    day: (p, at) => {
      p.play(at + 18 * 3600_000, 50 * 60, 0);
      p.play(at + 18 * 3600_000 + 50 * 60_000, 10 * 60, 10);
    },
  },
];

const results = honest.map((s) => ({ s, ...run(s) }));

console.log("\nSkraplageret – samme fabrikk (1 540 t stål per spilldøgn), 7 ekte dager:");
console.log("scenario                               spilldøgn/dag   nye tonn/dag   teller (t skrap)/dag   inntekt/dag");
for (const r of results) {
  const d = 3; // en vanlig dag midt i uka
  console.log(
    `${r.s.name.padEnd(38)} ${fmt(r.gameDays[d]).padStart(13)}   ${fmt(r.gained[d]).padStart(12)}   ${fmt(r.perDay[d]).padStart(20)}   ${fmt(r.perDay[d] * SCRAP_INCOME.feePerT).padStart(11)} kr`,
  );
}
console.log(
  `Hvorfor likt: taket er én normal spilldag per ekte dag = ${fmt(TONS_PER_GAME_DAY)} t × ${SCRAP_INCOME.scrapPerSteel} = ${fmt(CAP)} t skrap.\n` +
    "En normal spilldag er like mange tonn i alle farter; farten endrer bare hvor mange spilldøgn man rekker. Alle over\n" +
    "har spilt minst én spilldag, så alle treffer taket. Mer fart eller flere timer gir bare flere tonn over taket.\n",
);

test("Samme fabrikk gir samme inntekt på 1×, 3× og 10×, i 5 minutter eller 8 timer (B-188)", () => {
  for (const r of results)
    for (let i = 0; i < 7; i++)
      assert(
        Math.abs(r.perDay[i] - CAP) < 1e-6,
        `${r.s.name}, dag ${i + 1}: ${fmt(r.perDay[i])} t, ventet ${fmt(CAP)}`,
      );
});

test("Normal fart (tonn per spilldøgn) er lik i alle farter – den måler verket, ikke farten", () => {
  for (const r of results)
    assert(Math.abs(r.p.meter.normalRate() - TONS_PER_GAME_DAY) < 1e-6, `${r.s.name}: ${r.p.meter.normalRate()}`);
});

test("Flere spilldøgn gir flere nye tonn, men ikke mer som teller", () => {
  const slow = results.find((r) => r.s.name === "1× i 1 time per dag")!;
  const fast = results.find((r) => r.s.name === "10× i 8 timer per dag")!;
  assert(
    fast.gained[3] > slow.gained[3] * 50,
    `10× i 8 t laget ${fmt(fast.gained[3])} t, 1× i 1 t ${fmt(slow.gained[3])} t`,
  );
  assert(Math.abs(fast.perDay[3] - slow.perDay[3]) < 1e-6, "10× i 8 timer telte mer enn 1× i 1 time");
});

test("Skiftdrift og hele charger (stål bare på dagtid): 1× og 10× teller nesten likt, og 10× aldri mer", () => {
  const slow = run({ name: "1× skift", day: daily(60, 1) }, true);
  const fast = run({ name: "10× skift", day: daily(480, 10) }, true);
  for (let i = 1; i < 7; i++) {
    assert(
      Math.abs(fast.perDay[i] - slow.perDay[i]) <= CAP * 0.05,
      `dag ${i + 1}: ${fmt(fast.perDay[i])} mot ${fmt(slow.perDay[i])}`,
    );
    assert(fast.perDay[i] <= CAP * 1.05, `dag ${i + 1}: 10× telte ${fmt(fast.perDay[i])}, taket er ${fmt(CAP)}`);
  }
  console.log(
    `      skiftdrift: teller dag 4 på 1× (1 t) ${fmt(slow.perDay[3])} t, på 10× (8 t) ${fmt(fast.perDay[3])} t – taket ${fmt(CAP)} t`,
  );
});

test("Pause hele økta gir ingenting – bare spilldøgn som faktisk går, lager stål", () => {
  const r = run({ name: "pause", day: (p, at) => p.play(at + 18 * 3600_000, 3600, 0) });
  assert(
    r.perDay.every((v) => v === 0),
    `pause ga ${r.perDay.map(fmt).join(", ")}`,
  );
});

test("Borte en dag gir ingenting den dagen, og ingenting tas igjen senere", () => {
  const r = run({ name: "borte dag 3", day: (p, at, i) => i !== 2 && p.play(at + 18 * 3600_000, 3600, 10) });
  assert(r.perDay[2] === 0, `dag 3 ga ${fmt(r.perDay[2])}`);
  assert(Math.abs(r.perDay[3] - CAP) < 1e-6, `dag 4 ga ${fmt(r.perDay[3])}, ventet taket`);
});

test("Uten nett i tre dager: alt lastes opp på dag 4 og teller som én dag, ikke tre", () => {
  const r = run({
    name: "uten nett",
    day: (p, at, i) => {
      if (i < 3) p.play(at + 18 * 3600_000, 3600, 10, false);
      else {
        p.reconnect(at + 17 * 3600_000);
        p.play(at + 18 * 3600_000, 3600, 10);
      }
    },
  });
  assert(r.perDay[0] + r.perDay[1] + r.perDay[2] === 0, "dagene uten nett telte");
  assert(Math.abs(r.perDay[3] - CAP) < 1e-6, `dag 4 ga ${fmt(r.perDay[3])}, ventet ett tak`);
  console.log(
    `      uten nett: nye tonn dag 4 = ${fmt(r.gained[3])} (fire dagers spill), teller ${fmt(r.perDay[3])} = ett tak`,
  );
});

test("Gammel lagring: de samme tonnene teller ikke to ganger, og man får aldri mer enn taket", () => {
  let saved = { minute: 0, produced: 0 };
  const r = run({
    name: "gammel lagring",
    day: (p, at, i) => {
      if (i === 3) p.restore(saved); // dag 4: spillet fra slutten av dag 1 legges inn igjen
      p.play(at + 18 * 3600_000, 3600, 1);
      if (i === 0) saved = p.save();
    },
  });
  // Dag 1–3: 30 spilldøgn hver. Dag 4–5 spiller de samme dagene om igjen (under det høyeste): teller ikke.
  assert(r.perDay[3] === 0 && r.perDay[4] === 0, `gjentatte dager telte: ${fmt(r.perDay[3])}, ${fmt(r.perDay[4])}`);
  assert(
    r.perDay.every((v) => v <= CAP + 1e-6),
    "en dag ga mer enn taket",
  );
  assert(Math.abs(r.perDay[5] - CAP) < 1e-6, `dag 6 (forbi det høyeste igjen) ga ${fmt(r.perDay[5])}`);
  console.log(`      gammel lagring: teller per dag ${r.perDay.map(fmt).join(" · ")} (dag 4–5 spilles om igjen)`);
});

test("Gammel lagring som lastes opp midt på dagen, gir ikke ekstra (høyeste tonn står)", () => {
  const p = new Player();
  p.play(START - DAY_MS, 600, 1);
  const at = START + 18 * 3600_000;
  p.play(at, 3600, 10);
  const old = { minute: p.minute - 20 * 1440, produced: p.produced - 20 * TONS_PER_GAME_DAY };
  const before = p.meter.gained(dayKey(0));
  p.restore(old);
  p.play(at + 3600_000, 600, 10); // 50 spilldøgn: 20 av dem er de samme som før
  const after = p.meter.gained(dayKey(0));
  assert(Math.abs(after - before - 30 * TONS_PER_GAME_DAY) < 1e-6, `nye tonn økte med ${fmt(after - before)}`);
  assert(p.meter.countedT(dayKey(0)) <= CAP + 1e-6, "mer enn taket");
});

test("Størrelsen teller: et verk som lager dobbelt så mye per spilldøgn, teller dobbelt", () => {
  const small = new ProductionMeter();
  const big = new ProductionMeter();
  for (let d = 0; d <= 10; d++) {
    const at = START + d * 60_000;
    small.register(at, (100 + d) * 1440, 1_000 * d);
    big.register(at, (100 + d) * 1440, 2_000 * d);
  }
  const k = dayKey(0);
  assert(Math.abs(big.countedT(k) - 2 * small.countedT(k)) < 1e-6, `${big.countedT(k)} mot ${small.countedT(k)}`);
});

test("Eieren og flaggede spillere gir ikke skraplageret inntekt", () => {
  const a = new ProductionMeter();
  a.register(START, 1440, 0);
  a.register(START + 60_000, 2880, 1_000);
  const k = dayKey(0);
  const one = scrapYardIncome([{ meter: a }], k);
  assert(one > 0, "ingen inntekt");
  assert(scrapYardIncome([{ meter: a, owner: true }], k) === 0, "eierens egne tonn telte");
  assert(scrapYardIncome([{ meter: a, flagged: true }], k) === 0, "flagget spiller telte");
});

if (failed) {
  console.log(`\n${failed} skraplager-test(er) feilet`);
  process.exitCode = 1;
} else console.log("\nAlle skraplager-tester OK");
