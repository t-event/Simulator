/**
 * «Hva gjør jeg nå?» (B-283): et ark som alltid kan åpnes fra raden nederst (mobil) eller toppfeltet (PC). Det viser det
 * viktigste å gjøre med en knapp dit, hva hvert sted i verket gjør akkurat nå forklart med vanlige ord, og en kort
 * ordliste. Spillerne spurte hva «fp» var og hva de skulle trykke når noe røk (B-281); her står svaret samlet.
 */
import { scrapAlert, scrapStopHelp } from "../game/engine";
import type { PlantStats } from "../game/plant";
import type { GameState } from "../game/types";
import { Callout, SheetHead, StatusLine } from "./ds";
import { fmtT } from "./format";
import type { Hint } from "./hints";
import { hints } from "./hints";
import { furnaceState, statusOf } from "./plantStatus";
import { VIEWS, type View } from "./views";

interface Props {
  g: GameState;
  stats: PlantStats;
  go: (v: View, sub?: string) => void;
  onClose: () => void;
}

/** Hva spilleren skal gjøre når en ovn venter, med vanlige ord. Null når det ikke er noe å gjøre */
function furnaceHelp(g: GameState, text: string): string | null {
  if (/^Havari/.test(text)) return "Repareres av seg selv – du trenger ikke trykke på noe.";
  if (/^Planlagt stans/.test(text)) return "Vedlikehold som er satt i gang. Blir ferdig av seg selv.";
  if (/mangler penger til omforing/.test(text))
    return "Foringen må byttes, men kassa er tom. Selg stål under Salg, eller ta opp lån under Verket → Økonomi.";
  if (/Mangler skrap|Tomt for skrap/.test(text)) return scrapStopHelp(g);
  if (/Mangler folk/.test(text)) return "Det er ikke nok folk på skiftet. Ansett under Folk → Ansett.";
  if (/Utenfor arbeidstid/.test(text))
    return "Verket står utenfor skiftene. Flere skift (Folk → Skift) gir flere timer i drift.";
  if (/Strømprisen/.test(text)) return "Ovnen venter på billigere strøm. Grensen står under Marked → Strøm.";
  if (/Venter på støping/.test(text)) return "Støpingen er opptatt. Den tar stålet så snart den er ledig.";
  if (/renseanlegget/.test(text)) return "Renseanlegget har havari. Se Verket → Anlegg → Ovn.";
  if (text === "Klar") return "Starter så snart det er skrap og folk på jobb.";
  return null;
}

/** Hvor et råd tar deg, som tekst på knappen */
function hintButton(t: Hint): string {
  if (t.anchor) return "Vis på Verket";
  const view = VIEWS.find((v) => v.id === t.view);
  return view ? `Gå til ${view.label}` : "Gå dit";
}

const WORDS: [string, string][] = [
  ["Fagpoeng", "Poeng for å smelte, levere og ta quizene i fagboka. Brukes til forskning (kolben øverst)."],
  ["Charge", "Én ovnsfylling med skrap som smeltes."],
  ["Foring", "Mursteinene inni ovnen. Slites for hver charge og må byttes i tide."],
  ["Omdømme", "Hva kundene synes om verket. Stiger når du leverer i tide."],
  ["Ordrekø", "Kontraktene du har signert, i den rekkefølgen de lages."],
  ["C, P og Spor", "Karbon, fosfor og andre stoffer i stålet. Hver kvalitet har grenser (se Resept)."],
];

export function HelpSheet({ g, stats, go, onClose }: Props) {
  const tips = hints(g, stats);
  const run = (t: Hint) => {
    if (t.anchor) go("verket", t.anchor === "mal" ? "oversikt" : "anlegg");
    else if (t.view) go(t.view, t.sub);
    onClose();
  };
  const short = scrapAlert(g, stats);
  const active = g.contracts.filter((c) => c.status === "aktiv").length;
  const castText = g.castWait ?? (g.castQueue.length ? "Støper" : "Venter på stål");
  const storeFull = stats.storeUsed >= stats.storeT * 0.999;

  const rows: { name: string; text: string; help: string | null; to?: [View, string?] }[] = [
    {
      name: "Skrap",
      text: short.length ? "Mangler skrap" : `${fmtT(stats.yardUsed)} på lager`,
      help: short.length ? scrapStopHelp(g) : null,
      to: short.length ? ["marked", "skrap"] : undefined,
    },
    ...g.furnaces.map((_, i) => {
      const text = furnaceState(g, i).text;
      return { name: g.furnaces.length > 1 ? `Ovn ${i + 1}` : "Ovnen", text, help: furnaceHelp(g, text) };
    }),
    {
      name: "Støping",
      text: castText,
      help:
        castText === "Ferdigvarelageret er fullt" ? "Selg ledig stål under Salg → Lager, eller bygg ut lageret." : null,
      to: castText === "Ferdigvarelageret er fullt" ? ["salg", "lager"] : undefined,
    },
    {
      name: "Lager",
      text: storeFull ? "Fullt" : `${fmtT(stats.storeUsed)} av ${fmtT(stats.storeT)}`,
      help: storeFull ? "Trykk «Selg alt ledig stål» under Salg → Lager." : null,
      to: storeFull ? ["salg", "lager"] : undefined,
    },
    {
      name: "Kontrakter",
      text: active ? `${active} i arbeid` : "Ingen",
      help: active ? null : "Uten kontrakter selges stålet billig. Signer en forespørsel under Salg.",
      to: active ? undefined : ["salg"],
    },
  ];

  return (
    <div
      className="g-modal g-side-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Hva gjør jeg nå?"
      onClick={onClose}
    >
      <div className="g-modal-card g-help-sheet" onClick={(e) => e.stopPropagation()}>
        <SheetHead title="Hva gjør jeg nå?" icon="circle-help" onClose={onClose} />

        <h3 className="g-subhead">Det viktigste nå</h3>
        {tips.length ? (
          <ol className="g-help-todo">
            {tips.slice(0, 4).map((t) => (
              <li key={t.text}>
                <p>{t.text}</p>
                {(t.view || t.anchor) && (
                  <button className="g-small" onClick={() => run(t)}>
                    {hintButton(t)}
                  </button>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <Callout tone="ok">Ingenting du må gjøre akkurat nå – verket går av seg selv.</Callout>
        )}

        <h3 className="g-subhead">Slik står det til i verket</h3>
        <ul className="g-help-status">
          {rows.map((r) => (
            <li key={r.name}>
              <div className="g-help-row">
                <strong>{r.name}</strong>
                <StatusLine status={statusOf(r.text)} label={r.text} />
              </div>
              {r.help && <p className="g-muted g-small-text">{r.help}</p>}
              {r.to && (
                <button
                  className="g-small"
                  onClick={() => {
                    go(r.to![0], r.to![1]);
                    onClose();
                  }}
                >
                  Gå til {VIEWS.find((v) => v.id === r.to![0])?.label}
                </button>
              )}
            </li>
          ))}
        </ul>

        <details className="g-details">
          <summary>Ord i spillet</summary>
          <dl className="g-help-words">
            {WORDS.map(([w, d]) => (
              <div key={w}>
                <dt>{w}</dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </div>
  );
}
