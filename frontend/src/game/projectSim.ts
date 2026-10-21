/**
 * Regionale fellesprosjekter (forslag, FELLESPROSJEKT-FORSLAG.md): hva modellene A–C betyr i ekte tid for spillerne i en
 * region. Ingenting her er bygget i spillet – simulatoren regner bare ut avveiningene, så eieren kan velge før noe lages
 * på serveren (B-180, B-190). Ingen tilfeldighet.
 *
 *   npx tsx src/game/projectSim.ts
 *
 * Forutsetninger (fra worldSim.ts og STATUS.md avsnitt 8, ferdig utbygde konsern): utbyttet er ca. 35 mill. per ekte dag
 * for et fullt konsern, og bidraget 5 (liten), 15 (middels) eller 30 (stor) mill. per dag. En spiller har en andel av
 * verkene sine i regionen (`share`). Et prosjekt gir sin fordel bare til verkene i regionen.
 */
declare const process: { argv: string[] };

export interface ProjectModel {
  id: string;
  name: string;
  /** Målet: så mange dager av utbyttet fra alle verkene i regionen */
  goalDays: number;
  /** Fordelen: så mye mer utbytte for verkene i regionen (andel) … */
  boost: number;
  /** … i så mange dager (Infinity = varig) */
  boostDays: number;
  /** Høyst så mange ferdige prosjekter teller samtidig i en region */
  stack: number;
  /** Frist i ekte dager, og andelen bidragsyterne får tilbake hvis målet ikke nås */
  deadlineDays: number;
  refund: number;
}

export const MODELS: ProjectModel[] = [
  {
    id: "A",
    name: "Varig, lite (+2 %, høyst 3)",
    goalDays: 20,
    boost: 0.02,
    boostDays: Infinity,
    stack: 3,
    deadlineDays: 21,
    refund: 0.5,
  },
  {
    id: "B",
    name: "Kort, større (+5 % i 90 dager)",
    goalDays: 8,
    boost: 0.05,
    boostDays: 90,
    stack: 1,
    deadlineDays: 21,
    refund: 0.5,
  },
  {
    id: "C",
    name: "Bare ære (titler, ingen penger)",
    goalDays: 4,
    boost: 0,
    boostDays: 0,
    stack: 1,
    deadlineDays: 21,
    refund: 0.5,
  },
];

export interface RegionPlayer {
  name: string;
  /** Utbytte per ekte dag for hele konsernet */
  dividend: number;
  /** Bidraget fra hovedverket per ekte dag */
  contribution: number;
  /** Andelen av verkene i regionen */
  share: number;
  /** Andelen av dagens inntekt spilleren legger i prosjektet (0 = gratispassasjer) */
  gives: number;
}

export interface ProjectOutcome {
  model: string;
  done: boolean;
  days: number;
  goal: number;
  /** Per spiller: betalt, fordel over ett år, netto (i dagers egen inntekt) */
  players: { name: string; paid: number; gain: number; netDays: number }[];
  /** Andelen av regionens inntekt i året som gikk til prosjektet */
  usedShare: number;
}

const income = (p: RegionPlayer) => p.dividend + p.contribution;

/** Ett prosjekt i en region, regnet dag for dag, og fordelen over ett år fra start */
export function runProject(m: ProjectModel, players: RegionPlayer[], yearDays = 365): ProjectOutcome {
  const regionDividend = players.reduce((a, p) => a + p.dividend * p.share, 0);
  const goal = m.goalDays * regionDividend;
  const paid = players.map(() => 0);
  let total = 0;
  let day = 0;
  while (total < goal && day < m.deadlineDays) {
    day++;
    players.forEach((p, i) => {
      const give = Math.min(income(p) * p.gives, goal - total);
      paid[i] += give;
      total += give;
    });
  }
  const done = total >= goal - 1e-6;
  const days = done ? day : m.deadlineDays;
  const boostDays = done ? Math.min(m.boostDays, yearDays - days) : 0;
  const rows = players.map((p, i) => {
    const cost = done ? paid[i] : paid[i] * (1 - m.refund);
    const gain = p.dividend * p.share * m.boost * boostDays;
    return { name: p.name, paid: cost, gain, netDays: (gain - cost) / income(p) };
  });
  const yearIncome = players.reduce((a, p) => a + income(p) * yearDays, 0);
  return { model: m.id, done, days, goal, players: rows, usedShare: rows.reduce((a, r) => a + r.paid, 0) / yearIncome };
}

/** Typiske regioner: tre store og to små som alle bidrar, og den samme med to gratispassasjerer */
export function regions(): { name: string; players: RegionPlayer[] }[] {
  const big = (name: string, gives: number): RegionPlayer => ({
    name,
    dividend: 35e6,
    contribution: 30e6,
    share: 0.5,
    gives,
  });
  const small = (name: string, gives: number): RegionPlayer => ({
    name,
    dividend: 35e6,
    contribution: 5e6,
    share: 0.3,
    gives,
  });
  return [
    {
      name: "Alle bidrar (25 %)",
      players: [
        big("Stor 1", 0.25),
        big("Stor 2", 0.25),
        big("Stor 3", 0.25),
        small("Liten 1", 0.25),
        small("Liten 2", 0.25),
      ],
    },
    {
      name: "To gratispassasjerer",
      players: [
        big("Stor 1", 0.25),
        big("Stor 2", 0.25),
        big("Stor 3", 0),
        small("Liten 1", 0.25),
        small("Liten 2", 0),
      ],
    },
    { name: "Bare én bidrar (50 %)", players: [big("Stor 1", 0.5), big("Stor 2", 0), small("Liten 1", 0)] },
  ];
}

function mill(n: number): string {
  return `${Math.round(n / 1e6).toLocaleString("nb-NO")} mill.`;
}

function main(): void {
  for (const m of MODELS) {
    console.log(
      `\n== Modell ${m.id}: ${m.name} – mål ${m.goalDays} dagers utbytte i regionen, frist ${m.deadlineDays} dager`,
    );
    for (const r of regions()) {
      const o = runProject(m, r.players);
      console.log(
        `  ${r.name}: ${o.done ? `ferdig dag ${o.days}` : `ikke ferdig (${Math.round(m.refund * 100)} % tilbake)`}, mål ${mill(o.goal)}, ${(o.usedShare * 100).toFixed(1)} % av regionens årsinntekt`,
      );
      for (const p of o.players)
        console.log(
          `    ${p.name.padEnd(8)} betalt ${mill(p.paid).padStart(12)}  fordel første år ${mill(p.gain).padStart(12)}  netto ${p.netDays >= 0 ? "+" : ""}${p.netDays.toFixed(1)} dagers inntekt`,
        );
    }
  }
}

if (process.argv[1]?.endsWith("projectSim.ts")) main();
