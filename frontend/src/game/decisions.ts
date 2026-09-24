/**
 * Hendelseskort med valg, som hendelsene i Game Dev Tycoon.
 *
 * Omtrent ett kort hver fjerde dag. Spillet pauses til spilleren har valgt.
 * Hvert kort har en fristelse og en risiko, og lærer bort noe om hvordan et
 * stålverk drives.
 */
import { SCRAP_TYPES, STAGES } from "./data";
import { acceptContract, addCost, addIncome, addScrapParti, adjustMorale, adjustReputation, fmtKr, fmtT, log, makeCandidate, scrapPrice, unlock } from "./engine";
import { computePlantStats, day, isAbsent, productPrice, satisfiedGrades } from "./plant";
import { chance, pick, rand, uniform } from "./random";
import { knowledgeCard } from "./knowledge";
import type { Contract, Decision, GameState, RepCause } from "./types";

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
      text: `De ansatte ber om 4 % lønnstillegg (${fmtKr(cost)} mer per døgn). De peker på at verket går godt.`,
      options: [
        { label: "Godta 4 %", hint: "Fornøyde folk blir, og lærer mer." },
        { label: "Mottilbud: 2 %", hint: "Kanskje de godtar – kanskje ikke." },
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

const MORE_MAKERS: Record<string, Maker> = {
  utkobling: (g) => {
    const stats = computePlantStats(g);
    if (stats.furnaceMW <= 0 || stats.hours <= 0) return null;
    const hours = 4;
    // Tapt produksjon de fire timene, og en godtgjørelse som noen ganger lønner seg og noen ganger ikke
    const lostT = ((hours * 60) / stats.cycleMin) * stats.sizeT * stats.furnaceCount * 0.9;
    const pay = Math.round((lostT * productPrice(g, stats.mainProduct, "standard") * uniform(g, 0.15, 0.45)) / 100) * 100;
    const mw = stats.furnaceMW * stats.furnaceCount;
    return {
      id: "utkobling",
      title: "Nettselskapet ringer",
      text: `Strømnettet er hardt belastet. Nettselskapet ber deg koble ut ovnene (${mw.toFixed(1).replace(".", ",")} MW) i morgen kl. 07–11 og tilbyr ${fmtKr(pay)} for det.`,
      options: [
        { label: `Godta (${fmtKr(pay)})`, hint: `Ingen nye charger i fire timer – omtrent ${fmtT(lostT)} mindre stål.` },
        { label: "Nei takk", hint: "Har du dårlig tid med leveranser, er det tryggest å si nei." },
      ],
      data: { pay, from: (day(g)) * 1440 + 7 * 60, until: day(g) * 1440 + 11 * 60 },
    };
  },
  kurs: (g) => {
    const trainees = g.workers.filter((w) => w.role === "ovn" || w.role === "stoper" || w.role === "allround");
    if (g.stage < 1 || trainees.length < 2) return null;
    const cost = 3_000 * trainees.length * (1 + g.stage);
    return {
      id: "kurs",
      title: "Kurs for operatørene",
      text: `En leverandør tilbyr et kurs i smelting og støping for ${trainees.length} av dine folk. Det koster ${fmtKr(cost)}.`,
      options: [{ label: "Send dem på kurs", hint: "Flinkere folk gir kortere charger og færre feil." }, { label: "Ikke nå" }],
      data: { cost },
    };
  },
  sykdom: (g) => {
    // Influensa: mange er borte samtidig (B-031)
    if (g.stage < 1 || g.workers.length < 6) return null;
    const healthy = g.workers.filter((w) => !isAbsent(g, w) && w.absentUntil === undefined);
    const n = Math.min(healthy.length, Math.max(2, Math.round(g.workers.length * uniform(g, 0.2, 0.35))));
    if (n < 2) return null;
    const sick = [...healthy].sort(() => rand(g) - 0.5).slice(0, n);
    const days = Math.round(uniform(g, 2, 4));
    const cost = Math.round(sick.reduce((a, w) => a + w.salary, 0) * 1.5 * days);
    return {
      id: "sykdom",
      title: "Influensa",
      text: `Influensaen har kommet til verket: ${n} av ${g.workers.length} ansatte er syke de neste ${days} døgnene. Allroundere kan dekke noen plasser, men neppe alle.`,
      options: [
        { label: `Lei inn vikarer (${fmtKr(cost)})`, hint: "Verket går som normalt." },
        {
          label: "Gå ned på skiftgangen",
          hint: "Verket kjører de skiftene det er folk til, til de syke er tilbake.",
        },
      ],
      data: { cost, days, ids: sick.map((w) => w.id).join(",") },
    };
  },
  naboklage: (g) => {
    if (g.stage < 1) return null;
    const cost = 20_000 * (1 + g.stage) ** 2;
    return {
      id: "naboklage",
      title: "Naboene klager",
      text: "Naboene klager på støy og støv fra verket, og har kontaktet kommunen.",
      options: [
        { label: `Sett opp støyskjerm og støvfilter (${fmtKr(cost)})`, hint: "Godt naboskap er godt omdømme." },
        { label: "Beklag og vent", hint: "Kan gå over – eller havne i avisen." },
      ],
      data: { cost },
    };
  },
  kundebesok: (g) => {
    if (g.stage < 2) return null;
    return {
      id: "kundebesok",
      title: "Kundebesøk",
      text: "En stor kunde vil se verket før de bestemmer seg for en ny leverandør.",
      options: [
        { label: "Vis dem rundt", hint: "Et ryddig verk kan gi en god kontrakt." },
        { label: "Ikke nå", hint: "Kunden finner en annen." },
      ],
      data: {},
    };
  },
  nestenulykke: (g) => {
    if (g.stage < 1) return null;
    const cost = 10_000 * (1 + g.stage) ** 2;
    return {
      id: "nestenulykke",
      title: "Nestenulykke",
      text: "Flytende stål sprutet ved tappingen og var nær ved å treffe en operatør.",
      options: [
        { label: `Kjøp verneutstyr og skjermer (${fmtKr(cost)})`, hint: "Ingen skal skades på jobb." },
        { label: "La det gå denne gangen", hint: "Neste gang kan det gå verre." },
      ],
      data: { cost },
    };
  },
};

/** Samme kort kommer ikke igjen før det har gått så mange døgn */
const COOLDOWN_DAYS = 25;
/** Minst så mange døgn mellom to kort */
const MIN_GAP_DAYS = 2;

/** Kalles én gang per døgn. Lager av og til et nytt kort og pauser spillet. */
export function maybeCreateDecision(g: GameState): void {
  if (g.pendingDecision || g.pendingManual || g.gameOver || day(g) < 3) return;
  const today = day(g);
  const lastAny = Math.max(0, ...Object.values(g.decisionSeen));
  if (today - lastAny < MIN_GAP_DAYS) return;
  if (!chance(g, DAILY_CHANCE)) return;
  const all = { ...MAKERS, ...MORE_MAKERS };
  // Kort som ikke har vært vist på lenge, først de som aldri er vist
  const ids = Object.keys(all).filter((id) => today - (g.decisionSeen[id] ?? -999) >= COOLDOWN_DAYS);
  for (let tries = 0; tries < 6 && ids.length; tries++) {
    const id = pick(g, ids);
    const d = all[id](g);
    if (!d) {
      ids.splice(ids.indexOf(id), 1);
      continue;
    }
    g.decisionSeen[id] = today;
    g.pendingDecision = { ...d, resumeSpeed: g.speed > 0 ? g.speed : 1 };
    g.speed = 0;
    return;
  }
}

// ------------------------------------------------------------------ //
// Rådgiveren (B-025): kommer når omdømmet faller flere ganger av samme grunn
// ------------------------------------------------------------------ //
const ADVICE: Record<RepCause, { chapter: string; title: string; text: string; specialist: string; effect: string }> = {
  reklamasjon: {
    chapter: "analyse",
    title: "Rådgiveren: kundene reklamerer",
    text: "Kundene har reklamert flere ganger på kort tid. Det betyr at stålet ikke holder analysen de betaler for. Oftest er resepten for nær grensene, eller du vet ikke sikkert hva som er i stålet fordi du ikke måler det. Prøv «Foreslå billigste resept» under Marked, og skaff et analyseinstrument.",
    specialist: "Kvalitetsingeniør",
    effect: "Måler alt stål med spektrometer i ti døgn, så bare partier som holder kravet leveres.",
  },
  sen: {
    chapter: "omdomme",
    title: "Rådgiveren: leveransene kommer for sent",
    text: "Flere kontrakter har gått over fristen. Enten tar du på deg mer enn verket rekker, eller så produseres ting i feil rekkefølge. Sett kontraktene med kortest frist øverst i ordrekøen, og si nei til forespørsler du ikke rekker.",
    specialist: "Innleid planlegger",
    effect: "Sorterer ordrekøen etter frist og kjøper inn skrap i ti døgn.",
  },
  havari: {
    chapter: "ildfast",
    title: "Rådgiveren: for mange havarier",
    text: "Verket har hatt flere havarier på kort tid. En gjennombrent foring koster mange ganger en planlagt omforing. Bytt foringen før den er slitt, og vurder en vedlikeholdsplan.",
    specialist: "Vedlikeholdsspesialist",
    effect: "Bytter foringen i tide i ti døgn og går gjennom ovnene med en gang.",
  },
};

const ADVISOR_WINDOW_DAYS = 10;
const ADVISOR_COOLDOWN_DAYS = 20;
export const SPECIALIST_DAYS = 10;

export function specialistCost(g: GameState): number {
  return 15_000 * (1 + g.stage) ** 2;
}

/** Tre omdømmetap av samme grunn på ti døgn gir besøk av rådgiveren. */
export function maybeAdvisor(g: GameState): void {
  const today = day(g);
  for (const cause of Object.keys(ADVICE) as RepCause[]) {
    const recent = g.repLog.filter((r) => r.cause === cause && r.day > today - ADVISOR_WINDOW_DAYS).length;
    if (recent < 3) continue;
    if ((g.advisorSeen[cause] ?? -999) > today - ADVISOR_COOLDOWN_DAYS) continue;
    const a = ADVICE[cause];
    const cost = specialistCost(g);
    g.advisorSeen[cause] = today;
    g.pendingDecision = {
      id: "radgiver",
      title: a.title,
      text: a.text,
      options: [
        { label: `Lei inn ${a.specialist.toLowerCase()} (${fmtKr(cost)})`, hint: a.effect },
        { label: "Les om det i fagboka", hint: knowledgeCard(a.chapter)?.title, chapter: a.chapter },
        { label: "Jeg ordner det selv" },
      ],
      data: { cause, cost },
      resumeSpeed: g.speed > 0 ? g.speed : 1,
    };
    g.speed = 0;
    return;
  }
}

/** Er en innleid spesialist for denne årsaken på jobb nå? */
export function specialistActive(g: GameState, cause: RepCause): boolean {
  return (g.specialists[cause] ?? 0) > g.minute;
}

export function resolveDecision(g: GameState, option: number): void {
  const d = g.pendingDecision;
  if (!d) return;
  g.pendingDecision = null;
  // Etter et kort går spillet videre på 1×, så man ikke raser videre på 10× (B-033)
  g.speed = d.resumeSpeed > 0 ? 1 : 0;
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
        offerExpiresMin: g.minute,
        repGain: 1.5,
        repLoss: 3,
        penaltyPerT: Math.round(n("pricePerT") * 0.5),
        status: "tilbud",
        closedDay: null,
        priority: 0,
      };
      g.contracts.push(c);
      acceptContract(g, c.id);
      return;
    }
    case "lonnskrav":
      if (yes) {
        for (const w of g.workers) w.salary = Math.round(w.salary * 1.04);
        for (const w of g.workers) w.skill = Math.min(5, w.skill + 0.1);
        adjustMorale(g, 10);
        log(g, "De ansatte fikk lønnstillegg og er fornøyde.", "good");
      } else if (option === 1 && chance(g, 0.6)) {
        for (const w of g.workers) w.salary = Math.round(w.salary * 1.02);
        adjustMorale(g, 3);
        log(g, "De ansatte godtok mottilbudet på 2 %. Enighet uten bråk.", "good");
      } else if (option === 1) {
        for (const w of g.workers) w.salary = Math.round(w.salary * 1.03);
        const quitter = pick(g, g.workers);
        g.workers = g.workers.filter((w) => w !== quitter);
        adjustMorale(g, -5);
        log(g, `Mottilbudet ble for lavt. Dere møttes på 3 %, men ${quitter.name} sa opp i protest.`, "bad");
      } else {
        adjustMorale(g, -15);
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
    case "kurs":
      if (!yes) return;
      addCost(g, "annet", n("cost"));
      for (const w of g.workers)
        if (w.role === "ovn" || w.role === "stoper" || w.role === "allround") w.skill = Math.min(5, w.skill + 0.4);
      adjustMorale(g, 5);
      log(g, "Operatørene er tilbake fra kurs og har lært mye.", "good");
      return;
    case "sykdom": {
      const ids = String(d.data.ids ?? "").split(",").map(Number);
      const until = g.minute + n("days") * 1440;
      for (const w of g.workers)
        if (ids.includes(w.id)) {
          w.absentFrom = g.minute;
          w.absentUntil = until;
          w.absentReason = "syk";
        }
      if (yes) {
        addCost(g, "lonn", n("cost"));
        g.tempsUntilMin = Math.max(g.tempsUntilMin ?? 0, until);
        log(g, "Vikarene holder verket i gang mens de syke er borte.", "info");
      } else {
        log(g, "Verket kjører med de folkene det har til de syke er tilbake.", "event");
      }
      return;
    }
    case "naboklage":
      if (yes) {
        addCost(g, "annet", n("cost"));
        adjustReputation(g, 1);
        log(g, "Støyskjermen og filteret er på plass. Naboene er fornøyde. Omdømme +1.", "good");
      } else if (chance(g, 0.5)) {
        adjustReputation(g, -3);
        log(g, "Naboklagene havnet i avisen. Omdømme −3.", "bad");
      } else {
        log(g, "Klagene stilnet av denne gangen.", "info");
      }
      return;
    case "kundebesok":
      if (!yes) return;
      adjustReputation(g, 1);
      g.bonusOffer = true;
      log(g, "Kunden var imponert. En god forespørsel kommer snart. Omdømme +1.", "good");
      return;
    case "nestenulykke":
      if (yes) {
        addCost(g, "annet", n("cost"));
        adjustMorale(g, 5);
        log(g, "Nytt verneutstyr og sprutskjermer er på plass.", "good");
      } else if (chance(g, 0.35) && g.workers.length) {
        const hurt = pick(g, g.workers);
        g.workers = g.workers.filter((w) => w !== hurt);
        adjustMorale(g, -15);
        addCost(g, "bot", 50_000 * (1 + g.stage));
        adjustReputation(g, -4);
        log(g, `${hurt.name} ble skadet ved tappingen og er sykmeldt på ubestemt tid. Bot fra tilsynet og omdømme −4.`, "bad");
      } else {
        log(g, "Det gikk bra denne gangen.", "info");
      }
      return;
    case "radgiver": {
      if (!yes) return;
      const cause = d.data.cause as RepCause;
      addCost(g, "annet", n("cost"));
      g.specialists[cause] = g.minute + SPECIALIST_DAYS * 1440;
      if (cause === "havari") for (const f of g.furnaces) if (f.wear > 0.5) f.relineRequested = true;
      if (cause === "reklamasjon") {
        // Kvalitetsingeniøren måler også stålet som ligger på lager, så dårlige partier ikke leveres (B-034)
        let held = 0;
        for (const lot of g.lots) {
          lot.known = { ...lot.analysis };
          lot.measured = { c: true, p: true, tramp: true };
          if (!satisfiedGrades(lot.analysis).length) held += lot.t;
        }
        log(
          g,
          `Kvalitetsingeniøren har målt alt på lager.${held > 0 ? ` ${fmtT(held)} holder ingen kvalitet og blir ikke levert.` : ""} Reklamasjoner på stål som alt er levert, kan fortsatt komme de neste døgnene.`,
          "info",
        );
      }
      log(g, `${ADVICE[cause].specialist} er leid inn i ${SPECIALIST_DAYS} døgn. ${ADVICE[cause].effect}`, "good");
      return;
    }
    case "utkobling":
      if (!yes) return;
      g.gridCut = { fromMin: n("from"), untilMin: n("until") };
      addIncome(g, "annet", n("pay"));
      unlock(g, "strom");
      log(g, `Avtalt utkobling i morgen kl. 07–11. Nettselskapet betalte ${fmtKr(n("pay"))}.`, "good");
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
