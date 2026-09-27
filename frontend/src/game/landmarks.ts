/**
 * Landemerker (B-174): store byggeprosjekter som kommer som egne forespørsler – en bru, et stadion, en vindpark.
 * Det neste kommer når en ny virkelig dag begynner (mobilens klokke), så samlingen varer i uker, ikke minutter; et
 * spilldøgn går på 12 sekunder på 10×. Levert landemerke gir fagpoeng og omdømme, og står i samlingen på Verket.
 * Ingen fordel mot andre spillere utover vanlig kontraktspris, så ingen konto trengs (KONTO.md, regel 1).
 */
import { adjustReputation, awardPoints, fmtT, log, realisticDailyT } from "./engine";
import { computePlantStats, day, productCapT, productPrice } from "./plant";
import type { Contract, GameState } from "./types";

export interface Landmark {
  id: string;
  icon: string;
  name: string;
  /** Laveste nivå landemerket kan komme på */
  stage: number;
  /** Hvor mange døgns produksjon det trenger */
  days: number;
  fp: number;
  /** En setning om hva stålet brukes til */
  text: string;
}

export const LANDMARKS: Landmark[] = [
  {
    id: "benker",
    icon: "🪑",
    name: "Parkbenker til byparken",
    stage: 0,
    days: 1,
    fp: 5,
    text: "Benker av støpejern tåler vær og vind i hundre år.",
  },
  {
    id: "kumlokk",
    icon: "🕳️",
    name: "Kumlokk til hovedgata",
    stage: 1,
    days: 1.5,
    fp: 8,
    text: "Et kumlokk veier rundt 50 kg og må tåle tunge lastebiler hver dag.",
  },
  {
    id: "gjerde",
    icon: "⛓️",
    name: "Gjerde rundt kirkegården",
    stage: 1,
    days: 2,
    fp: 10,
    text: "Smidde og støpte gjerder har stått rundt kirkegårder i flere hundre år.",
  },
  {
    id: "fyrlykt",
    icon: "🗼",
    name: "Fyrlykt på skjæret",
    stage: 2,
    days: 2,
    fp: 12,
    text: "Et fyr må tåle salt sjøsprøyt – stålet males og vedlikeholdes jevnlig.",
  },
  {
    id: "gangbru",
    icon: "🌉",
    name: "Gangbru over elva",
    stage: 2,
    days: 2.5,
    fp: 15,
    text: "En gangbru i stål kan bygges ferdig på land og løftes på plass på én dag.",
  },
  {
    id: "kai",
    icon: "⚓",
    name: "Ny kai i havna",
    stage: 2,
    days: 3,
    fp: 18,
    text: "Spunt av stål rammes ned i havbunnen og holder på fyllmassene bak kaia.",
  },
  {
    id: "skole",
    icon: "🏫",
    name: "Ny skole i bygda",
    stage: 3,
    days: 2.5,
    fp: 20,
    text: "Bjelker og søyler i stål gir store, åpne rom uten vegger i veien.",
  },
  {
    id: "idrettshall",
    icon: "🏐",
    name: "Idrettshall",
    stage: 3,
    days: 3,
    fp: 22,
    text: "Takbjelkene i en hall må spenne over hele banen uten søyler i midten.",
  },
  {
    id: "sykehus",
    icon: "🏥",
    name: "Nytt sykehus",
    stage: 3,
    days: 3.5,
    fp: 25,
    text: "Et sykehus trenger tusenvis av tonn armering i betongen.",
  },
  {
    id: "tunnel",
    icon: "🚇",
    name: "T-banetunnel",
    stage: 3,
    days: 4,
    fp: 28,
    text: "Tunnelen sikres med bolter og nett av stål før den kles med betong.",
  },
  {
    id: "jernbanebru",
    icon: "🚆",
    name: "Jernbanebru",
    stage: 3,
    days: 4,
    fp: 30,
    text: "En jernbanebru må tåle både tunge tog og at stålet utvider seg i sola.",
  },
  {
    id: "stadion",
    icon: "⚽",
    name: "Fotballstadion",
    stage: 4,
    days: 3,
    fp: 35,
    text: "Taket over tribunene henger i stålkabler og fagverk.",
  },
  {
    id: "vindpark",
    icon: "🌬️",
    name: "Vindpark til havs",
    stage: 4,
    days: 3.5,
    fp: 40,
    text: "Hvert vindtårn til havs består av flere hundre tonn stål.",
  },
  {
    id: "hengebru",
    icon: "🌁",
    name: "Hengebru over fjorden",
    stage: 4,
    days: 4,
    fp: 45,
    text: "Hovedkablene i en hengebru er spunnet av tusenvis av tynne ståltråder.",
  },
  {
    id: "opera",
    icon: "🎭",
    name: "Operahus",
    stage: 4,
    days: 4,
    fp: 50,
    text: "Scenemaskineriet løfter tonnevis med kulisser på stålwirer.",
  },
  {
    id: "skyskraper",
    icon: "🏙️",
    name: "Skyskraper",
    stage: 4,
    days: 4.5,
    fp: 55,
    text: "Høye bygg står på et skjelett av stålsøyler som bærer alle etasjene.",
  },
  {
    id: "flyplass",
    icon: "✈️",
    name: "Ny flyplassterminal",
    stage: 4,
    days: 5,
    fp: 60,
    text: "Store glassfasader holdes oppe av slanke stålprofiler.",
  },
  {
    id: "kraftverk",
    icon: "💧",
    name: "Kraftverk i dammen",
    stage: 4,
    days: 5,
    fp: 65,
    text: "Rørgatene som leder vannet ned til turbinene er laget av tykke stålplater.",
  },
  {
    id: "cruiseskip",
    icon: "🚢",
    name: "Cruiseskip",
    stage: 4,
    days: 5.5,
    fp: 70,
    text: "Et stort skip bygges av stålseksjoner som sveises sammen i dokka.",
  },
  {
    id: "plattform",
    icon: "🛢️",
    name: "Plattform til havs",
    stage: 4,
    days: 6,
    fp: 75,
    text: "Understellet står på havbunnen og må tåle bølger på over 20 meter.",
  },
  {
    id: "torrdokk",
    icon: "🏗️",
    name: "Tørrdokk til verftet",
    stage: 4,
    days: 6,
    fp: 80,
    text: "Portene i en tørrdokk holder havet ute mens skipet bygges.",
  },
  {
    id: "motorvei",
    icon: "🛣️",
    name: "Motorvei med bruer",
    stage: 4,
    days: 6.5,
    fp: 85,
    text: "Rekkverk, skilt og bruer langs en motorvei trenger mye stål.",
  },
  {
    id: "rampe",
    icon: "🚀",
    name: "Oppskytningsrampe",
    stage: 4,
    days: 7,
    fp: 90,
    text: "Rampen må tåle flammene fra rakettmotorene i noen sekunder.",
  },
  {
    id: "arena",
    icon: "🏟️",
    name: "Olympisk arena",
    stage: 4,
    days: 7,
    fp: 95,
    text: "En arena for de store lekene bygges på få år – stål går fortest å montere.",
  },
  {
    id: "hurtigtog",
    icon: "🚄",
    name: "Høyhastighetsbane",
    stage: 4,
    days: 8,
    fp: 110,
    text: "Skinnene er av spesialstål som tåler tog i over 300 km/t.",
  },
  {
    id: "romstasjon",
    icon: "🛰️",
    name: "Modul til romstasjon",
    stage: 4,
    days: 8,
    fp: 120,
    text: "Rammen i en modul må være sterk, men så lett som mulig.",
  },
  {
    id: "verdensbru",
    icon: "🌐",
    name: "Verdens lengste bru",
    stage: 4,
    days: 10,
    fp: 150,
    text: "Den lengste brua i verden krever mer stål enn noe annet prosjekt du har levert.",
  },
];

export const LANDMARK_BY_ID = Object.fromEntries(LANDMARKS.map((l) => [l.id, l])) as Record<string, Landmark>;

/** Dagens dato på mobilen (virkelig tid), som nøkkel: ett nytt landemerke per dag */
export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Neste landemerke verket kan få, eller null */
export function nextLandmark(g: GameState): Landmark | null {
  const done = new Set(g.landmarks?.done ?? []);
  return LANDMARKS.find((l) => !done.has(l.id) && l.stage <= g.stage) ?? null;
}

/** Kontrakten for landemerket som pågår, eller null */
export function landmarkContract(g: GameState): Contract | null {
  const id = g.landmarks?.contractId;
  return id ? (g.contracts.find((c) => c.id === id) ?? null) : null;
}

/** Hver time: gir neste landemerke når en ny dag er begynt, og belønningen når det er levert */
export function landmarkHour(g: GameState, today = todayKey()): void {
  const lm = g.landmarks;
  if (!lm) return;
  if (lm.contractId) {
    const c = landmarkContract(g);
    const l = c?.landmark ? LANDMARK_BY_ID[c.landmark] : undefined;
    if (c && l && c.status === "fullfort") {
      lm.done = [...lm.done, l.id];
      lm.contractId = null;
      awardPoints(g, l.fp);
      adjustReputation(g, 2);
      log(
        g,
        `🏛️ Landemerke levert: ${l.icon} ${l.name}! +${l.fp} fagpoeng og omdømme +2. ${l.text} Neste landemerke kommer i morgen.`,
        "good",
      );
    } else if (!c || c.status === "misligholdt") {
      // Avslått, gått ut eller ikke levert: det kommer igjen en annen dag
      lm.contractId = null;
    }
    return;
  }
  // Ikke under den veiledede starten, og ikke de første døgnene i et nytt spill
  if (lm.date === today || g.tutorial !== null || day(g) < 3) return;
  const next = nextLandmark(g);
  if (!next) return;
  const stats = computePlantStats(g);
  const product = stats.mainProduct;
  // Armering er begrenset av valseverket (B-217)
  const perDay = Math.min(productCapT(stats, product), realisticDailyT(g, stats));
  if (perDay <= 0) return;
  const tonnes = Math.max(0.5, Math.round(perDay * next.days * 10) / 10);
  const c: Contract = {
    id: g.nextContractId++,
    customer: `${next.icon} ${next.name}`,
    product,
    grade: "standard",
    tonnes,
    delivered: 0,
    pricePerT: Math.round(productPrice(g, product, "standard") * 1.25),
    deadlineDay: day(g) + Math.ceil(next.days * 1.8) + 3,
    // Står til du svarer, og har ingen frist når det er signert (B-218). deadlineDay brukes bare som anslag
    offerExpiresMin: g.minute + 1440 * 365,
    repGain: 2,
    repLoss: 3,
    penaltyPerT: Math.round(productPrice(g, product, "standard") * 0.3),
    status: "tilbud",
    closedDay: null,
    priority: 0,
    landmark: next.id,
  };
  g.contracts.push(c);
  lm.date = today;
  lm.contractId = c.id;
  log(
    g,
    `🏛️ Nytt landemerke: ${next.icon} ${next.name} trenger ${fmtT(tonnes)} stål i standardkvalitet. God pris, fagpoeng og omdømme – se Salg.`,
    "event",
  );
}
