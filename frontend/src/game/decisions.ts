/**
 * Hendelseskort med valg, som hendelsene i Game Dev Tycoon.
 *
 * Omtrent ett kort hver fjerde dag. Spillet pauses til spilleren har valgt.
 * Hvert kort har en fristelse og en risiko, og lærer bort noe om hvordan et
 * stålverk drives.
 */
import { SCRAP_TYPES, STAGES } from "./data";
import { acceptContract, addCost, addScrapParti, adjustReputation, fmtKr, fmtT, log, makeCandidate, scrapPrice } from "./engine";
import { computePlantStats, day, productPrice } from "./plant";
import { chance, pick, uniform } from "./random";
import type { Contract, Decision, GameState } from "./types";

const DAILY_CHANCE = 0.25;

type Maker = (g: GameState) => Omit<Decision, "resumeSpeed"> | null;

const MAKERS: Record<string, Maker> = {
  billigparti: (g) => {
    const stats = computePlantStats(g);
    const t = Math.max(0.5, Math.round(stats.sizeT * 3 * 10) / 10);
    if (stats.yardT - stats.yardUsed < t) return null;
    const price = Math.round(scrapPrice(g, "blandet") * 0.5 * t);
    return {
      id: "billigparti",
      title: "Billig skrapparti",
      text: `En skraphandler du ikke kjenner tilbyr ${fmtT(t)} blandet skrap for ${fmtKr(price)} – halv pris. Han vil ikke si hvor det kommer fra.`,
      options: [
        { label: `Kjøp for ${fmtKr(price)}`, hint: "Billig, men ukjent skrap kan ha mye fosfor og kobber – eller verre." },
        { label: "Nei takk" },
      ],
      data: { t, price },
    };
  },
  hasteordre: (g) => {
    const stats = computePlantStats(g);
    const product = stats.mainProduct;
    const t = Math.max(0.1, Math.round(stats.dailyProductT * uniform(g, 0.6, 1) * 10) / 10);
    if (stats.dailyProductT <= 0) return null;
    const pricePerT = Math.round(productPrice(g, product, "standard") * 1.35);
    return {
      id: "hasteordre",
      title: "Hasteordre",
      text: `En kunde har fått stopp i produksjonen og trenger ${fmtT(t)} i standardkvalitet innen to dager. De betaler 35 % over vanlig pris.`,
      options: [
        { label: "Ta oppdraget", hint: "Rekker du det ikke, blir det bot og dårligere omdømme." },
        { label: "Avslå" },
      ],
      data: { t, pricePerT, product },
    };
  },
  lonnskrav: (g) => {
    if (g.workers.length < 5) return null;
    const cost = Math.round(g.workers.reduce((a, w) => a + w.salary, 0) * 0.04);
    return {
      id: "lonnskrav",
      title: "Lønnskrav",
      text: `De ansatte ber om 4 % lønnstillegg (${fmtKr(cost)} mer per dag). De peker på at verket går godt.`,
      options: [
        { label: "Godta", hint: "Fornøyde folk blir, og lærer mer." },
        { label: "Avslå", hint: "Noen kan komme til å slutte." },
      ],
      data: { cost },
    };
  },
  avis: (g) => ({
    id: "avis",
    title: "Lokalavisen ringer",
    text: "En journalist vil lage en reportasje om verket ditt.",
    options: [
      { label: "Si ja", hint: "Godt for omdømmet – med mindre det har vært bråk med kunder nylig." },
      { label: "Nei takk" },
    ],
    data: { recentComplaints: g.log.filter((e) => e.min > g.minute - 10 * 1440 && e.text.includes("reklamerer")).length },
  }),
  messe: (g) => {
    if (g.stage < 1) return null;
    const cost = 8_000 * (1 + g.stage) ** 2;
    return {
      id: "messe",
      title: "Bransjemesse",
      text: `Du er invitert til å stille ut på en bransjemesse. Stand og reise koster ${fmtKr(cost)}.`,
      options: [{ label: "Delta", hint: "Nye kunder og bedre omdømme." }, { label: "Stå over" }],
      data: { cost },
    };
  },
  laerling: (g) => {
    if (g.stage < 1 || g.workers.length >= STAGES[g.stage].staffCap) return null;
    return {
      id: "laerling",
      title: "Lærling",
      text: "Yrkesskolen spør om du kan ta inn en lærling. Lærlingen koster lite, men kan ikke så mye ennå.",
      options: [{ label: "Ta inn lærlingen", hint: "Billig arbeidskraft som blir flinkere." }, { label: "Ikke nå" }],
      data: {},
    };
  },
  tilsyn: (g) => {
    if (g.stage < 2) return null;
    const cost = 20_000 * g.stage ** 2;
    return {
      id: "tilsyn",
      title: "Tilsyn varslet",
      text: `Arbeidstilsynet kommer neste uke. En skikkelig opprydding og sikring koster ${fmtKr(cost)}.`,
      options: [
        { label: "Rydd og sikre", hint: "Trygt." },
        { label: "Ta sjansen", hint: `Kan gi bot på ${fmtKr(cost * 3)} og dårligere omdømme.` },
      ],
      data: { cost },
    };
  },
};

/** Kalles én gang per døgn. Lager av og til et nytt kort og pauser spillet. */
export function maybeCreateDecision(g: GameState): void {
  if (g.pendingDecision || g.pendingManual || g.gameOver || day(g) < 3) return;
  if (!chance(g, DAILY_CHANCE)) return;
  const ids = Object.keys(MAKERS);
  for (let tries = 0; tries < 4; tries++) {
    const d = MAKERS[pick(g, ids)](g);
    if (!d) continue;
    g.pendingDecision = { ...d, resumeSpeed: g.speed > 0 ? g.speed : 1 };
    g.speed = 0;
    return;
  }
}

export function resolveDecision(g: GameState, option: number): void {
  const d = g.pendingDecision;
  if (!d) return;
  g.pendingDecision = null;
  g.speed = d.resumeSpeed;
  const yes = option === 0;
  const n = (k: string) => Number(d.data[k] ?? 0);
  switch (d.id) {
    case "billigparti":
      if (!yes) return;
      addCost(g, "skrap", n("price"));
      // Et ukjent parti er ofte dårlig, og kan skjule en strålekilde
      addScrapParti(g, "blandet", n("t"), {
        p: SCRAP_TYPES.blandet.p * uniform(g, 1.2, 2.6),
        tramp: SCRAP_TYPES.blandet.tramp * uniform(g, 1.1, 1.8),
        c: SCRAP_TYPES.blandet.c,
        dirt: SCRAP_TYPES.blandet.dirt * 1.5,
        radioactive: chance(g, 0.04),
      });
      log(g, `Du kjøpte ${fmtT(n("t"))} billig skrap av ukjent opprinnelse.`, "info");
      return;
    case "hasteordre": {
      if (!yes) return;
      const c: Contract = {
        id: g.nextContractId++,
        customer: pick(g, ["Maskinverksted i nød", "Entreprenør med dårlig tid", "Verft med forsinkelse"]),
        product: d.data.product as Contract["product"],
        grade: "standard",
        tonnes: n("t"),
        delivered: 0,
        pricePerT: n("pricePerT"),
        deadlineDay: day(g) + 2,
        offerExpiresDay: day(g),
        repGain: 1.5,
        repLoss: 3,
        penaltyPerT: Math.round(n("pricePerT") * 0.3),
        status: "tilbud",
        closedDay: null,
      };
      g.contracts.push(c);
      acceptContract(g, c.id);
      return;
    }
    case "lonnskrav":
      if (yes) {
        for (const w of g.workers) w.salary = Math.round(w.salary * 1.04);
        for (const w of g.workers) w.skill = Math.min(5, w.skill + 0.1);
        log(g, "De ansatte fikk lønnstillegg og er fornøyde.", "good");
      } else {
        const quitters = g.workers.filter(() => chance(g, 0.12)).slice(0, 3);
        g.workers = g.workers.filter((w) => !quitters.includes(w));
        log(
          g,
          quitters.length
            ? `Lønnskravet ble avslått. ${quitters.map((w) => w.name).join(", ")} sa opp.`
            : "Lønnskravet ble avslått. Stemningen er dårlig, men alle blir.",
          quitters.length ? "bad" : "info",
        );
      }
      return;
    case "avis":
      if (!yes) return;
      if (n("recentComplaints") > 0) {
        adjustReputation(g, -2);
        log(g, "Avisen skrev mest om reklamasjonene dine. Omdømme −2.", "bad");
      } else {
        adjustReputation(g, 2);
        log(g, "Avisen skrev en fin reportasje om verket. Omdømme +2.", "good");
      }
      return;
    case "messe":
      if (!yes) return;
      addCost(g, "annet", n("cost"));
      adjustReputation(g, 3);
      log(g, "Messen ga mange nye kontakter. Omdømme +3.", "good");
      return;
    case "laerling":
      if (!yes) return;
      {
        const w = makeCandidate(g, "allround");
        w.skill = 1;
        w.salary = Math.round(w.salary * 0.5);
        w.hiredDay = day(g);
        w.name = `${w.name} (lærling)`;
        g.workers.push(w);
        log(g, `${w.name} har begynt som lærling.`, "info");
      }
      return;
    case "tilsyn":
      if (yes) {
        addCost(g, "annet", n("cost"));
        log(g, "Tilsynet fant ingenting å utsette.", "good");
      } else if (chance(g, 0.5)) {
        addCost(g, "bot", n("cost") * 3);
        adjustReputation(g, -3);
        log(g, `Tilsynet fant mangler. Bot ${fmtKr(n("cost") * 3)} og omdømme −3.`, "bad");
      } else {
        log(g, "Tilsynet gikk bra denne gangen.", "info");
      }
      return;
  }
}
