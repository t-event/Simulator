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
 */
import { TAKEOVER, TAKEOVER_V2 } from "./control";

declare const process: { argv: string[] };

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
    const holds = hold !== null && holdCost < lossIfBought;
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
