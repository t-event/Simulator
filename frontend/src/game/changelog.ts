/**
 * Endringsloggen i spillet (B-179): «Hva er nytt» vises én gang etter en oppdatering, og hele lista ligger under ⚙️.
 *
 * Nyeste først. Hver oppføring har det høyeste beslutningsnummeret (B-xxx) den dekker. `npm test` sjekker at den
 * nyeste oppføringen dekker den nyeste beslutningen i docs/BESLUTNINGER.md, så den ikke blir glemt.
 * Skriv for spillerne: kort, med vanlige ord, det de merker i spillet.
 */
export interface ChangelogEntry {
  /** Høyeste beslutningsnummer oppføringen dekker */
  b: number;
  date: string;
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    b: 182,
    date: "2026-09-27",
    title: "Konsernet gir utbytte, og Grunnleggeræraen",
    items: [
      "Datterverkene tjener like godt som før, men beholder en del til vedlikehold og reserve. Resten går til deg som utbytte.",
      "Et stort konsern koster: ledelse, reiser og koordinering. Flere verk gir fortsatt mer, men hvert nytt verk gir litt mindre enn det forrige.",
      "Konsern-fanen viser hva verkene tjener, hva de beholder, og hva konsernledelsen koster.",
      "Vi er i Grunnleggeræraen. «Alle tider» på topplista heter nå Hall of Fame.",
    ],
  },
  {
    b: 179,
    date: "2026-09-26",
    title: "Skiftledere, rettferdig spill og «Hva er nytt»",
    items: [
      "Nytt: skiftledere fra stålverket. De følger opp fraværet for deg – advarsel til dem som misbruker egenmelding, aldri til dem som faktisk var syke – og færre blir syke.",
      "Landemerkene tar du selv. Salgsdirektøren lar dem stå, og Salg viser dem med tall selv når direktøren er på.",
      "Bare én fane eller ett vindu spiller om gangen. Åpner du spillet et annet sted, lagrer det gamle vinduet og står stille.",
      "Topplistene sjekker at spilldøgnene går i vanlig fart. Utvidelser som får tida til å gå fortere, gir ingen fordel.",
      "Denne lista: etter en oppdatering ser du hva som er nytt. Hele lista ligger under ⚙️.",
    ],
  },
  {
    b: 175,
    date: "2026-09-26",
    title: "Nytt kontrollrom",
    items: [
      "«Ta styringen» er et kort spill i fire runder, under ett minutt: smelt, blås ut karbonet, rak ut slaggen og tapp.",
      "Poeng, kombo og rekord – og «Ta neste charge også».",
    ],
  },
  {
    b: 174,
    date: "2026-09-26",
    title: "Landemerker",
    items: [
      "Ett nytt landemerke per dag: bruer, stadioner, vindparker og mer. Lever dem og fyll samlingen på Verket.",
      "Kortet «Kobbertyver» kommer først fra støperiet og koster mindre.",
    ],
  },
  {
    b: 173,
    date: "2026-09-26",
    title: "Sesongstigen",
    items: [
      "Sesongstigen på Verket: poeng for spilte dager, dagens belønning, dagens oppdrag og topp 3 på ukelista. 50 trinn med fagpoeng og pynt.",
      "Fire nye titler etter Stållegende.",
    ],
  },
  {
    b: 172,
    date: "2026-09-26",
    title: "Varsler, ukeliste og salgsdirektør",
    items: [
      "Varsellinja viser det nyeste først, og ✕ fjerner alle varsler.",
      "Én ukeliste for alle, målt i prosent, så små verk kan slå store.",
      "Salgsdirektøren kan oppgraderes: salgsteam, kundenettverk og eksportkontor.",
    ],
  },
  {
    b: 171,
    date: "2026-09-26",
    title: "Skrap, reservepotter og flere hendelser",
    items: [
      "Planleggeren kjøper skrap til ordrene som kommer, og kan selge skrap du ikke trenger.",
      "Skrapklasseren bytter til annet skrap når returskrapet ikke rekker.",
      "Flere og mer varierte hendelser. Færre messer når omdømmet er høyt, og naboklager og nettselskapet sjeldnere.",
    ],
  },
];

const SEEN_KEY = "stalverk-nytt-sett";

/** Høyeste beslutningsnummer spilleren har sett i endringsloggen på denne enheten, eller null hvis aldri */
export function seenChangelog(): number | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function markChangelogSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, String(CHANGELOG[0].b));
  } catch {
    // Uten lagring vises lista igjen neste gang; det er ikke farlig
  }
}

/** Så mange oppføringer vises første gang for en spiller som har spilt før endringsloggen kom */
const FIRST_TIME_ENTRIES = 3;

/**
 * Oppføringene som er nye for spilleren. En ny spiller (uten lagret spill) skal ikke få lista: da merkes alt som sett.
 */
export function unseenChangelog(hadSave: boolean, seen = seenChangelog()): ChangelogEntry[] {
  if (seen === null) {
    if (!hadSave) {
      markChangelogSeen();
      return [];
    }
    return CHANGELOG.slice(0, FIRST_TIME_ENTRIES);
  }
  return CHANGELOG.filter((e) => e.b > seen);
}
