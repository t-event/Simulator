/**
 * Oppkjøpssimulatoren (B-440): når lønner det seg å kjøpe, forsvare eller gi seg – med regelsett 1, kandidatene og
 * regelsett 2 som ble valgt (B-441, `TAKEOVER_V2`). Endrer ingen regler; den måler dem.
 *
 * Modellen (forenklet, uten tilfeldighet):
 * - Selskapet tjener `I` per ekte dag; verdien er V = 10 × I (minstebudet), som på serveren.
 * - Kjøperen eier selskapet i max(dager igjen, 14) dager hvis budet holder (`resolve_takeovers`). Det er hele gevinsten.
 * - Eieren får som i dag betalt for dagene hen mister (høyst 85 % av budet, `takeover_payout`). Det eieren taper på å bli
 *   kjøpt, er derfor dagene som er igjen minus betalingen, pluss en «eierverdi» E (dager) for det å beholde selskapet
 *   (sjansen i neste anbud, plass i regionen). E = 0 er den rent økonomiske eieren.
 * - Eieren svarer sist (motbudet kan legges inn helt til fristen) og velger det billigste motbudet som holder, hvis det
 *   koster mindre enn det hen taper på å bli kjøpt. Kjøperen ser det og velger det budet som gir mest (eller gir seg).
 *   Det er det strengeste for kjøperen; i praksis kan begge øke flere ganger, men utfallet blir det samme når begge
 *   regner riktig.
 * - «Plage»: hva eieren må betale for å avvise et minstebud, mot hva kjøperen taper på det. Pausen mellom forsøk avgjør
 *   hvor ofte det kan skje (forsøk per 30 dager = 30 / (3 dagers frist + pause)).
 *
 *   npx tsx src/game/takeoverSim.ts            # alle regelsettene, scenariene og sammendraget
 *   npx tsx src/game/takeoverSim.ts --kort     # bare sammendraget
 *   npx tsx src/game/takeoverSim.ts --gulv     # anbudsgulvet: fem måter å regne verdien på (B-449)
 */
import { TAKEOVER, TAKEOVER_V2 } from "./control";

declare const process: { argv: string[]; exit(code?: number): never };

interface Rules {
  name: string;
  /** Vekten og taket på kjøperens bud (taket i × V) */
  attackW: number;
  attackCap: number;
  /** Vekten og taket på eierens motbud */
  defenseW: number;
  defenseCap: number;
  /** Kontrollen gir høyst så mange poeng (Kontroll 100 = alle) */
  controlMax: number;
  /** Fondet teller av seg selv uten å koste noe (i dag), eller må brukes som penger */
  fundFree: boolean;
  /** Det kjøperen taper av budet hvis det ikke holder */
  attackerLoseFee: number;
  /** Det eieren taper av motbudet hvis hen beholder selskapet (1 = hele motbudet er brukt) */
  ownerHoldCost: number;
  /** Det eieren taper av motbudet hvis selskapet blir kjøpt likevel */
  ownerLoseFee: number;
  /** Dager pause mellom to oppkjøpsforsøk på samme selskap */
  pauseDays: number;
  /** Minstebudet i × V */
  minBid: number;
}

const NOW: Rules = {
  name: "Regelsett 1 (før B-441)",
  attackW: TAKEOVER.attackW,
  attackCap: TAKEOVER.attackCap,
  defenseW: TAKEOVER.defenseW,
  defenseCap: TAKEOVER.cap,
  controlMax: 100,
  fundFree: true,
  attackerLoseFee: 1 - TAKEOVER.failRefund,
  ownerHoldCost: 1 - TAKEOVER.defenseRefund,
  ownerLoseFee: 1 - TAKEOVER.defenseRefund,
  pauseDays: 0,
  minBid: 1,
};

/** Den enklere modellen: vinneren betaler, samme vilkår ved tap, samme styrke for samme beløp, begrenset Kontroll */
function proposal(controlMax: number, fee: number, cap = 5, pauseDays = 7, minBid = 1, attackCap = cap): Rules {
  const caps = attackCap === cap ? `tak ${cap}V` : `tak ${attackCap}V/${cap}V`;
  return {
    name: `Ny: Kontroll ≤ ${controlMax}, tap ${Math.round(fee * 100)} %, ${caps}, pause ${pauseDays} d, min ${minBid}V`,
    attackW: 60,
    attackCap,
    defenseW: 60,
    defenseCap: cap,
    controlMax,
    fundFree: false,
    attackerLoseFee: fee,
    ownerHoldCost: 1,
    ownerLoseFee: fee,
    pauseDays,
    minBid,
  };
}

const RULES: Rules[] = [
  NOW,
  proposal(10, 0.1),
  proposal(20, 0.1),
  proposal(30, 0.1),
  proposal(20, 0.05),
  proposal(20, 0.1, 3),
  proposal(20, 0.25),
  proposal(20, 0.25, 5, 14),
  // Valgt (B-441): budet teller fortsatt inntil 10 × V, motbudet inntil 5 × V – eieren kan alltid miste selskapet (B-337)
  {
    ...proposal(
      TAKEOVER_V2.controlMax,
      TAKEOVER_V2.loseFee,
      TAKEOVER_V2.cap,
      TAKEOVER_V2.pauseDays,
      1,
      TAKEOVER.attackCap,
    ),
    name: "Regelsett 2 (B-441, gjelder nå)",
  },
  proposal(20, 0.25, 5, 14, 1.5),
  proposal(40, 0.25, 5, 14, 1.5),
];

interface Scenario {
  /** Inntekt per ekte dag */
  perDay: number;
  /** Eierens Kontroll (0–100) */
  control: number;
  /** Dager igjen av eierens periode når budet avgjøres */
  daysLeft: number;
  /** Det eieren har investert i perioden (betales 85 % tilbake ved oppkjøp) */
  invested: number;
  /** Beredskapsfondet */
  fund: number;
  /** Eierverdi i dager (se toppen) */
  ownerExtraDays: number;
  /** Kjøperens egne verk i regionen */
  regionPlants: number;
  /** Siste anbudspris (dagens penger): verdien er det høyeste av 10 dagers inntekt og den (`company_value`, B-443) */
  tenderFloor?: number;
}

/** Selskapets verdi og minstebudet, som `company_value`: 10 dagers inntekt, men aldri under siste anbudspris */
function valueOf(s: Scenario): number {
  return Math.max(10 * s.perDay, s.tenderFloor ?? 0);
}

const I = 19_100_000; // skraplageret 3.10.2026: verdien ca. 191 mill. = 10 dager

function attack(r: Rules, bid: number, v: number, regionPlants: number): number {
  return (
    r.attackW * Math.sqrt(Math.min(bid, r.attackCap * v) / v) +
    Math.min(TAKEOVER.regionMax, TAKEOVER.regionPer * regionPlants)
  );
}

function defense(r: Rules, s: Scenario, money: number, v: number): number {
  const fund = r.fundFree ? Math.min(s.fund, TAKEOVER.fundCap * v) : 0;
  return (s.control / 100) * r.controlMax + r.defenseW * Math.sqrt(Math.min(r.defenseCap * v, money + fund) / v);
}

/** Det billigste motbudet (kroner) som holder mot `att`, eller null hvis det ikke går */
function moneyToHold(r: Rules, s: Scenario, att: number, v: number): number | null {
  if (defense(r, s, 0, v) >= att) return 0;
  const fund = r.fundFree ? Math.min(s.fund, TAKEOVER.fundCap * v) : 0;
  const ctl = (s.control / 100) * r.controlMax;
  const need = v * ((att - ctl) / r.defenseW) ** 2 - fund;
  if (need + fund > r.defenseCap * v) return null;
  return Math.max(0, need);
}

function payout(bid: number, s: Scenario): number {
  return Math.min(bid * TAKEOVER.toOwner, s.perDay * s.daysLeft + TAKEOVER.investBack * s.invested);
}

interface Outcome {
  /** Kjøperens beste bud, eller null (gir seg) */
  bid: number | null;
  /** Kjøperens resultat (kr) */
  buyer: number;
  /** Eierens resultat (kr), mot å ikke bli utfordret */
  owner: number;
  ownerHolds: boolean;
  /** Det dyreste budet kjøperen tjener på hvis eieren ikke svarer */
  breakEven: number;
  /** Eierens kostnad for å avvise et minstebud, og kjøperens tap på det */
  harassOwner: number | null;
  harassBuyer: number;
}

function simulate(r: Rules, s: Scenario): Outcome {
  const v = valueOf(s);
  const winDays = Math.max(s.daysLeft, TAKEOVER.ownDays);
  const gain = s.perDay * winDays;
  // Kjøperen prøver alle bud fra minstebudet til taket, og eieren svarer på hvert
  let best: Outcome = {
    bid: null,
    buyer: 0,
    owner: 0,
    ownerHolds: true,
    breakEven: gain,
    harassOwner: null,
    harassBuyer: 0,
  };
  for (let k = r.minBid; k <= r.attackCap; k += 0.01) {
    const bid = k * v;
    const att = attack(r, bid, v, s.regionPlants);
    const hold = moneyToHold(r, s, att, v);
    const lossIfBought = s.perDay * (s.daysLeft + s.ownerExtraDays) + TAKEOVER.investBack * s.invested - payout(bid, s);
    const holdCost = hold === null ? Infinity : hold * r.ownerHoldCost;
    // Holder Kontrollen alene (motbud 0), taper budet uansett – serveren regner Kontrollen automatisk (B-449)
    const holds = hold === 0 || (hold !== null && holdCost < lossIfBought);
    const buyer = holds ? -r.attackerLoseFee * bid : gain - bid;
    const owner = holds ? -holdCost : -lossIfBought;
    if (buyer > best.buyer) best = { ...best, bid, buyer, owner, ownerHolds: holds };
  }
  // Plage: et minstebud som eieren avviser
  const minAtt = attack(r, r.minBid * v, v, s.regionPlants);
  const minHold = moneyToHold(r, s, minAtt, v);
  best.harassOwner = minHold === null ? null : minHold * r.ownerHoldCost;
  best.harassBuyer = r.attackerLoseFee * r.minBid * v;
  return best;
}

const mill = (x: number) => `${Math.round(x / 1e6)}`;

function scenarios(extraDays: number, tenderFloor = 0): Scenario[] {
  const out: Scenario[] = [];
  for (const control of [20, 45, 62, 80])
    for (const daysLeft of [3, 7, 12])
      out.push({
        perDay: I,
        control,
        daysLeft,
        invested: 0,
        fund: 15_000_000,
        ownerExtraDays: extraDays,
        regionPlants: 1,
        tenderFloor,
      });
  return out;
}

/**
 * Anbudsgulvet (B-449): verdien V er det høyeste av 10 dagers inntekt og siste anbudspris (`company_value`). V er både
 * minstebudet og skalaen for budstyrke, motbud, Kontroll (investering og fond) og inntektsøkningen fra investeringer.
 * Alternativene endrer enten hele V eller bare minstebudet (E). Kjøperen regner med sitt eget anslag (`company_estimate_for`),
 * som kan være lavere eller høyere enn eierens.
 */
interface FloorAlt {
  name: string;
  /** Skalaen (budstyrke, motbud, Kontroll, inntektsøkning) */
  scale: (i: number, t: number) => number;
  /** Minstebudet */
  minBid: (i: number, t: number) => number;
}
const capped = (days: number) => (i: number, t: number) => Math.max(10 * i, Math.min(t, days * i));
const today = (i: number, t: number) => Math.max(10 * i, t);
const tenDays = (i: number) => 10 * i;
const FLOOR_ALTS: FloorAlt[] = [
  { name: "A: i dag – det høyeste av 10 dager og anbudet", scale: today, minBid: today },
  { name: "B: anbudet teller høyst 14 dagers inntekt", scale: capped(14), minBid: capped(14) },
  { name: "C: anbudet teller høyst 12 dagers inntekt", scale: capped(12), minBid: capped(12) },
  { name: "D: bare 10 dagers inntekt", scale: tenDays, minBid: tenDays },
  { name: "E: minstebud 10 dager, skala som i dag", scale: today, minBid: tenDays },
  { name: "F: minstebud høyst 12 dager, skala som i dag", scale: today, minBid: capped(12) },
];

/** Kjøperens beste bud med alternativet, eller null: samme spill som `simulate`, men med kjøperens egen inntekt */
function floorSimulate(r: Rules, s: Scenario, alt: FloorAlt, buyerPerDay: number, t: number): Outcome {
  const v = alt.scale(s.perDay, t);
  const min = alt.minBid(s.perDay, t);
  const winDays = Math.max(s.daysLeft, TAKEOVER.ownDays);
  const gain = buyerPerDay * winDays;
  let best: Outcome = {
    bid: null,
    buyer: 0,
    owner: 0,
    ownerHolds: true,
    breakEven: gain,
    harassOwner: null,
    harassBuyer: 0,
  };
  for (let bid = min; bid <= r.attackCap * v; bid += 0.01 * v) {
    const att = attack(r, bid, v, s.regionPlants);
    const hold = moneyToHold(r, s, att, v);
    const lossIfBought = s.perDay * (s.daysLeft + s.ownerExtraDays) + TAKEOVER.investBack * s.invested - payout(bid, s);
    const holdCost = hold === null ? Infinity : hold * r.ownerHoldCost;
    // Holder Kontrollen alene (motbud 0), taper budet uansett – serveren regner Kontrollen automatisk (B-449)
    const holds = hold === 0 || (hold !== null && holdCost < lossIfBought);
    const buyer = holds ? -r.attackerLoseFee * bid : gain - bid;
    const owner = holds ? -holdCost : -lossIfBought;
    if (buyer > best.buyer) best = { ...best, bid, buyer, owner, ownerHolds: holds };
  }
  return best;
}

function floorReport(): void {
  const r = RULES.find((x) => x.name.startsWith("Regelsett 2"))!;
  const perDay = 20_000_000;
  const tenders = [250_000_000, 300_000_000, 400_000_000];
  const buyerFactors = [0.8, 1, 1.2];
  console.log(
    `Anbudsgulvet (B-449), regelsett 2. Eierens inntekt ${mill(perDay)} mill. per dag, kjøperen eier i 14 dager.`,
  );
  console.log("Tall i mill. kr. Kjøperens anslag 0,8 / 1,0 / 1,2 × eierens.\n");

  console.log("### Uten motbud: kjøperens overskudd ved minstebudet (14 dager × kjøperens inntekt − minstebud)");
  console.log("| Alternativ | Anbud | Minstebud | Kjøper 0,8 | Kjøper 1,0 | Kjøper 1,2 |");
  console.log("|---|---:|---:|---:|---:|---:|");
  for (const alt of FLOOR_ALTS)
    for (const t of tenders) {
      const min = alt.minBid(perDay, t);
      const cells = buyerFactors.map((f) => mill(14 * f * perDay - min));
      console.log(`| ${alt.name} | ${mill(t)} | ${mill(min)} | ${cells.join(" | ")} |`);
    }

  console.log(
    "\n### Med eierens motbud: oppkjøp som lønner seg (av 36 per kjøperanslag) og snittoverskudd for kjøperen",
  );
  console.log(
    "| Alternativ | Anbud | Lønner seg 0,8 | 1,0 | 1,2 | Snittoverskudd (når det lønner seg) | Eierens snitt når kjøpt |",
  );
  console.log("|---|---:|---:|---:|---:|---:|---:|");
  for (const alt of FLOOR_ALTS)
    for (const t of tenders) {
      const counts: string[] = [];
      let sumBuyer = 0;
      let nBuys = 0;
      let sumOwner = 0;
      let nSold = 0;
      for (const f of buyerFactors) {
        let n = 0;
        let total = 0;
        for (const extra of [0, 7, 14])
          for (const s0 of scenarios(extra)) {
            const s = { ...s0, perDay };
            total++;
            const o = floorSimulate(r, s, alt, f * perDay, t);
            if (o.bid === null) continue;
            n++;
            sumBuyer += o.buyer;
            nBuys++;
            if (!o.ownerHolds) {
              sumOwner += o.owner;
              nSold++;
            }
          }
        counts.push(`${n} av ${total}`);
      }
      console.log(
        `| ${alt.name} | ${mill(t)} | ${counts.join(" | ")} | ${nBuys ? mill(sumBuyer / nBuys) : "–"} | ${nSold ? mill(sumOwner / nSold) : "–"} |`,
      );
    }

  // Store forhold mellom gammel anbudspris og dagens inntekt (B-449): med skalaen som i dag (F) kan Kontrollen alene
  // fortsatt holde mot alt kjøperen tjener på. «Bud for å slå Kontrollen» er det minste budet som slår eierens Kontroll
  // uten motbud (Kontroll 80, ett verk i regionen) – over 14 dagers inntekt (280 mill.) lønner det seg ikke.
  const ratios = [12.5, 15, 20, 30, 50, 100, 300];
  console.log(
    "\n### Store forhold: gammel anbudspris i dager av dagens inntekt (20 mill./dag, kjøperen 1,0 × eierens)",
  );
  console.log(
    "| Alternativ | Anbud (dager) | Anbud | Minstebud | Bud for å slå Kontroll 80 alene | Lønner seg (av 36) | Kontroll alene holder mot minstebudet (av 36) |",
  );
  console.log("|---|---:|---:|---:|---:|---:|---:|");
  for (const alt of FLOOR_ALTS.filter((a) => /^(A|C|F)/.test(a.name)))
    for (const ratio of ratios) {
      const t = ratio * perDay;
      const v = alt.scale(perDay, t);
      const min = alt.minBid(perDay, t);
      const region = Math.min(TAKEOVER.regionMax, TAKEOVER.regionPer * 1);
      const ctl80 = (80 / 100) * r.controlMax;
      const beat = ctl80 <= region ? min : Math.max(min, v * ((ctl80 - region) / r.attackW) ** 2);
      let n = 0;
      let auto = 0;
      let total = 0;
      for (const extra of [0, 7, 14])
        for (const s0 of scenarios(extra)) {
          const s = { ...s0, perDay };
          total++;
          if (floorSimulate(r, s, alt, perDay, t).bid !== null) n++;
          if (defense(r, s, 0, v) >= attack(r, min, v, s.regionPlants)) auto++;
        }
      console.log(
        `| ${alt.name} | ${ratio} | ${mill(t)} | ${mill(min)} | ${beat > 14 * perDay ? `${mill(beat)} (over 280)` : mill(beat)} | ${n} av ${total} | ${auto} av ${total} |`,
      );
    }

  // Det V også styrer: Kontroll fra investering og fond, inntektsøkningen, og hvor mye motbudet og budet kan telle
  console.log("\n### Det andre verdien styrer (anbud 400 mill., investert 50 mill., fond 15 mill.)");
  console.log(
    "| Alternativ | Skala V | Kontroll fra investering (av 25) | Kontroll fra fondet (av 10) | Inntektsøkning | Motbud teller til | Bud teller til |",
  );
  console.log("|---|---:|---:|---:|---:|---:|---:|");
  for (const alt of FLOOR_ALTS) {
    const v = alt.scale(perDay, 400_000_000);
    const inv = 25 * (1 - Math.exp(-50_000_000 / v));
    const fund = 10 * (1 - Math.exp(-15_000_000 / (2 * v)));
    const boost = 25 * (1 - Math.exp(-50_000_000 / v));
    console.log(
      `| ${alt.name} | ${mill(v)} | ${inv.toFixed(1)} | ${fund.toFixed(1)} | +${boost.toFixed(1)} % | ${mill(r.defenseCap * v)} | ${mill(r.attackCap * v)} |`,
    );
  }
}

if (process.argv.includes("--gulv")) {
  floorReport();
  process.exit(0);
}

const short = process.argv.includes("--kort");
console.log(`Oppkjøpssimulatoren (B-440). Selskapet tjener ${mill(I)} mill. per dag, verdien er ${mill(10 * I)} mill.`);
console.log("Tall i mill. kr. «Kjøp» = kjøperens beste bud; «gi deg» = ingen bud lønner seg.\n");

const summary: string[] = [];
for (const r of RULES) {
  for (const extra of [0, 7, 14]) {
    const rows = scenarios(extra).map((s) => ({ s, o: simulate(r, s) }));
    const buys = rows.filter((x) => x.o.bid !== null).length;
    const avgPrice = rows.filter((x) => x.o.bid !== null).reduce((a, x) => a + (x.o.bid ?? 0), 0) / Math.max(1, buys);
    const h = rows[6].o; // Kontroll 62 (aktiv eier), 3 dager igjen
    const attempts = 30 / (TAKEOVER.defenseHours / 24 + r.pauseDays);
    if (extra === 14 || r === NOW)
      summary.push(
        `| ${r.name} | ${extra} | ${buys} av ${rows.length} | ${buys ? mill(avgPrice) : "–"} | ${h.harassOwner === null ? "går ikke" : mill(h.harassOwner)} / ${mill(h.harassBuyer)} | ${attempts.toFixed(1)} |`,
      );
    else summary.push(`| ${r.name} | ${extra} | ${buys} av ${rows.length} | ${buys ? mill(avgPrice) : "–"} | | |`);
    if (short) continue;
    console.log(`### ${r.name}, eierverdi ${extra} dager`);
    console.log("| Kontroll | Dager igjen | Kjøperen | Kjøperens resultat | Eieren | Eierens resultat |");
    console.log("|---|---|---|---|---|---|");
    for (const { s, o } of rows)
      console.log(
        `| ${s.control} | ${s.daysLeft} | ${o.bid === null ? "gi deg" : `kjøp for ${mill(o.bid)}`} | ${mill(o.buyer)} | ${o.bid === null ? "beholder (ingen bud)" : o.ownerHolds ? "beholder" : "selger"} | ${mill(o.owner)} |`,
      );
    console.log("");
  }
}
// Anbudsgulvet (B-443): vant noen siste anbud dyrt, er verdien – og minstebudet – siste anbudspris
const FLOORS = [250_000_000, 350_000_000];
const chosen = RULES.find((r) => r.name.startsWith("Regelsett 2"))!;
for (const floor of FLOORS)
  for (const extra of [0, 7, 14]) {
    const rows = scenarios(extra, floor).map((s) => simulate(chosen, s));
    const buys = rows.filter((o) => o.bid !== null);
    const avg = buys.reduce((a, o) => a + (o.bid ?? 0), 0) / Math.max(1, buys.length);
    summary.push(
      `| ${chosen.name}, anbudsgulv ${mill(floor)} | ${extra} | ${buys.length} av ${rows.length} | ${buys.length ? mill(avg) : "–"} | | |`,
    );
  }

console.log("## Sammendrag");
console.log(
  "| Regel | Eierverdi (dager) | Oppkjøp som lønner seg | Snittpris | Plage: eierens kostnad / kjøperens tap (Kontroll 62) | Forsøk per 30 dager |",
);
console.log("|---|---|---|---|---|---|");
for (const line of summary) console.log(line);
