/** Varsellista (B-089): hvilke logglinjer som er viktige, og hvor mange som er nye. */
import type { GameState, LogEntry, LogTopic } from "./types";

/**
 * Temaene spilleren kan slå av og på for varsler på skjermen (B-115). Rekkefølgen er rekkefølgen i ⚙️, og
 * reglene prøves i rekkefølge: det første temaet som passer, gjelder.
 */
export const LOG_TOPICS: { id: LogTopic; label: string; hint: string; match: RegExp }[] = [
  {
    id: "fravaer",
    label: "Ferie og sykdom",
    hint: "Hvem som er syk eller har ferie, og vikarer",
    match: /\ber syk\b|\bsyke\b|\bferie\b|[Vv]ikar|er borte/,
  },
  {
    id: "havari",
    label: "Drift og havarier",
    hint: "Ovnen står, gjennombrenning, overslag, brudd, og skrap som sendes i retur",
    match:
      /HAVARI|[Oo]verslag|[Ee]lektrodebrudd|[Ss]trenggjennombrudd|[Ss]trengen grodde|[Vv]annlekkasje|[Oo]vnen står|radioaktiv|etter et havari|[Ll]ageret er fullt|[Ss]krapklasseren avviste|[Ss]trålingsportalen/,
  },
  {
    id: "okonomi",
    label: "Kasse og bank",
    hint: "Kassekreditt, banken og konkursfare",
    match: /[Kk]assa|[Kk]assekreditt|[Bb]anken|konkurs|kredittgrensen/,
  },
  {
    id: "fremgang",
    label: "Forskning, oppdrag og utbygging",
    hint: "Ferdig forskning, oppdrag, utfordringer, quiz, nytt utstyr, konsern og gode charger",
    match:
      /[Ff]orskning|[Oo]ppdrag|[Uu]tfordring|[Qq]uiz|[Ff]lyttet inn|er kjøpt|er installert|satt i drift|[Kk]onsern|[Mm]odernisert|[Mm]urerne er ferdige|[Ff]agpoeng|charge/,
  },
  {
    id: "salg",
    label: "Kunder og omdømme",
    hint: "Forespørsler, leveranser, frister, reklamasjoner, rammeavtaler, avis og messer",
    match: /[Kk]ontrakt|[Ff]orespørsel|[Rr]ammeavtale|[Rr]eklamer|[Ff]risten|[Kk]unde|[Ll]evert|[Mm]essen|[Aa]visen/,
  },
  {
    id: "marked",
    label: "Marked og strøm",
    hint: "Strømpris og strømavtaler, stål- og skrappriser, nettselskapet",
    match: /[Ss]trøm|[Ss]tålpris|[Mm]angel på|prisen|[Ff]astpris|[Nn]attariff|[Nn]ettselskap/,
  },
  {
    id: "folk",
    label: "Ansatte og trivsel",
    hint: "Oppsigelser, lønn, trivsel, lærlinger og hendelser med de ansatte",
    match:
      /[Ss]agt opp|[Aa]nsatt|[Tt]rivsel|[Ll]ønn|[Ll]ærling|[Kk]urs|[Aa]dvarsel|[Ss]kadet|[Ss]ikkerhet|[Tt]ilsyn|[Nn]abo/,
  },
];

/** Temaet til en logglinje; «annet» når ingen regel passer */
export function logTopic(text: string): LogTopic {
  return LOG_TOPICS.find((t) => t.match.test(text))?.id ?? "annet";
}

/** Skal varselet dukke opp på skjermen, etter valgene under ⚙️ (B-089, B-115)? */
export function showToast(g: GameState, e: Pick<LogEntry, "kind" | "text">): boolean {
  if (e.kind === "info") return false;
  const mode = g.settings.toasts ?? "alle";
  if (mode === "ingen" || (mode === "problemer" && e.kind !== "bad")) return false;
  // Problemer vises alltid når valget er «bare problemer»; ellers bestemmer temaene
  if (mode === "problemer") return true;
  return g.settings.toastTopics?.[logTopic(e.text)] !== false;
}

/** Viktige hendelser (ikke vanlig info) */
export function importantLog(g: GameState): LogEntry[] {
  return g.log.filter((e) => e.kind !== "info");
}

/**
 * Antall problemer og hendelser siden spilleren sist åpnet varsellista. Gode nyheter står i lista, men gir
 * ikke tall på bjella (B-107) – den skal bare rope når noe trenger oppmerksomhet.
 */
export function unseenCount(g: GameState): number {
  return importantLog(g).filter((e) => e.kind !== "good" && e.id > (g.inboxSeenId ?? 0)).length;
}
