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
    b: 195,
    date: "2026-09-27",
    title: "Roligere oversikt",
    items: [
      "Rådet under anleggsbildet er roligere, og flere råd samles under «Flere råd».",
      "Rutene i produksjonslinja viser status med ikon og farge: kjører, venter, står, mangler skrap, lager fullt.",
      "Boblene over verket samles til én om gangen, så det ikke blir kaos på 10×.",
    ],
  },
  {
    b: 194,
    date: "2026-09-27",
    title: "Topplista tåler store kjøp",
    items: ["Kjøper du mange verk eller moderniseringer på én gang, blir du ikke lenger tatt ut av topplista for det."],
  },
  {
    b: 192,
    date: "2026-09-27",
    title: "Ny meny på PC og mer plass på mobilen",
    items: [
      "På PC står menyen til venstre, og Konsern har fått sitt eget punkt der når konsernet er åpnet.",
      "Toppen på PC er én smal rad med tall, varsler og knapper – mer plass til selve verket.",
      "Oversikt, Anlegg og Økonomi står nå øverst på Verket, så du slipper å scrolle forbi bildet.",
      "Menyen nederst på mobilen har fått ikoner, og tallene øverst tar mindre plass.",
      "Fagboka, varslene, topplista og innstillingene åpnes fra høyre på PC, så du ser spillet bak.",
    ],
  },
  {
    b: 191,
    date: "2026-09-27",
    title: "Et ryddigere utseende – første steg",
    items: [
      "Faste farger og skriftstørrelser overalt: grønt betyr god drift, gult og oransje varme og advarsel, rødt bare feil.",
      "Overskrifter og store tall har fått en egen, tydelig skrift der sifrene står rett under hverandre.",
      "Nye, rolige ikoner i toppfeltet i stedet for emoji.",
      "Uten konto: ett kort som viser hva du får med konto, i stedet for tre.",
    ],
  },
  {
    b: 190,
    date: "2026-09-27",
    title: "Samme klokke for alle",
    items: [
      "Alle kan flytte like mye inn i konsernkassa: 100 mill. kr per døgn, uansett hvor stor kassa hjemme er.",
      "Ukens utfordring «dager» teller nå ekte dager du har spilt, ikke døgn i spillet. Likt antall gir delt plass.",
      "Spill så mye og så fort du vil hjemme – i verden mellom spillerne går alle på samme klokke.",
    ],
  },
  {
    b: 189,
    date: "2026-09-27",
    title: "Skraplageret – det første selskapet i verden",
    items: [
      "Har du et konsern, finner du Skraplageret på Konsern-fanen. Eieren tjener på skrapet de andre spillerne bruker.",
      "Det deles ut ved anbud i 48 timer. Budene er skjulte, høyeste bud vinner, og likt bud avgjøres ved trekning. Vinneren driver lageret i 14 dager.",
      "Bud betales fra konsernkassa. Du flytter penger dit fra kassa i spillet – et visst beløp per døgn.",
      "Farten i spillet gir ingen fordel: hver spiller teller høyst én vanlig dags skrapbruk per dag.",
    ],
  },
  {
    b: 186,
    date: "2026-09-27",
    title: "Økonomireformen",
    items: [
      "De aller største kassene er gjort mindre, så topplista kan sammenlignes igjen. Kasser under 250 mill. er ikke rørt.",
      "Verkene, forskningen, fagpoengene og rekordene i Hall of Fame står som før. Rekkefølgen mellom spillerne er den samme.",
    ],
  },
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
