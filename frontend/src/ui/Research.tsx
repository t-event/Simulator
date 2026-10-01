import { Fragment, type ReactNode } from "react";
import { buyFpDeal, buyMastery, doResearch, fpDeal } from "../game/actions";
import { MASTERY, MASTERY_IDS, masteryCost, masteryEffect, masteryLevel, masteryOpen } from "../game/mastery";
import { STAGES, stageRef } from "../game/data";
import { knowledgeCard } from "../game/knowledge";
import { RESEARCH_GROUPS, researchGroup, researchOptions, type ResearchOption } from "../game/research";
import type { GameState, MasteryId } from "../game/types";
import { masteryGainPerDay } from "../game/masteryValue";
import type { GameApi } from "../game/useGame";
import { Bar, Card } from "./common";
import { Icon } from "./icons";
import { fmtKr } from "./format";
import { buzz } from "./haptics";

/** Forskningssamarbeid: kjøp fagpoeng for penger når du står fast (B-064) */
function FpDeal({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const deal = fpDeal(g);
  if (deal.fp <= 0) return null;
  return (
    <div className="g-upgrade">
      <div className="g-contract-head">
        <strong>Forskningssamarbeid</strong>
        <span className="g-fp-cost">+{deal.fp} fagpoeng</span>
      </div>
      <p className="g-muted g-small-text">
        Leie inn forskere fra høyskolen. Kan brukes én gang i uka. Lønner seg når forskningen står fast og du har penger
        til overs.
      </p>
      <div className="g-row">
        <button
          className="g-primary g-small"
          disabled={!!deal.reason}
          onClick={() => {
            act((gg) => buyFpDeal(gg));
            buzz(20);
          }}
        >
          Kjøp for {fmtKr(deal.price)}
        </button>
        {deal.reason && <span className="g-muted">{deal.reason}</span>}
      </div>
    </div>
  );
}

/** Mesterskap (B-150): forskning som kan tas om og om igjen når all vanlig forskning er gjort */
function Mastery({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const open = masteryOpen(g);
  if (!open)
    return g.stage >= 4 ? (
      <p className="g-muted g-small-text">
        <Icon name="medal" /> <strong>Mesterskap:</strong> når all forskning er gjort (også konsernprosjektene), åpner
        forskning som kan tas om og om igjen. Da har fagpoengene alltid noe å gå til.
      </p>
    ) : null;
  const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")} %`;
  // Hva neste nivå gir per døgn, og hvilket som gir mest per fagpoeng (B-237)
  const gains = Object.fromEntries(MASTERY_IDS.map((id) => [id, masteryGainPerDay(g, id)])) as Record<
    MasteryId,
    number
  >;
  const best = MASTERY_IDS.reduce((a, b) =>
    gains[b] / masteryCost(b, masteryLevel(g, b)) > gains[a] / masteryCost(a, masteryLevel(g, a)) ? b : a,
  );
  return (
    <>
      <h3 className="g-subhead">
        <Icon name="medal" /> Mesterskap
      </h3>
      <p className="g-muted g-small-text">
        All forskning er gjort. Hvert prosjekt kan tas om og om igjen: hvert nivå koster mer, og gevinsten blir litt
        mindre for hvert nivå. Prisen følger hvor mye prosjektet er verdt, og tallet viser hva neste nivå gir på verket
        ditt nå.
      </p>
      <div className="g-upgrades">
        {MASTERY_IDS.map((id) => {
          const m = MASTERY[id];
          const level = masteryLevel(g, id);
          const cost = masteryCost(id, level);
          const can = g.researchPoints >= cost;
          const gain = gains[id];
          return (
            <div key={id} className="g-upgrade">
              <div className="g-contract-head">
                <strong>
                  {m.name} {level > 0 && <span className="g-muted">nivå {level}</span>}
                </strong>
                <span className="g-fp-cost">{cost} fagpoeng</span>
              </div>
              {gain > 0 && (
                <p className="g-mastery-gain">
                  Neste nivå gir ca. <strong>+{fmtKr(gain)}</strong> per døgn
                  {id === best && <span className="ds-status is-ok">Best nå</span>}
                </p>
              )}
              <p className="g-effect">
                Nå: {pct(masteryEffect(id, level))} {m.effect} · neste nivå: {pct(masteryEffect(id, level + 1))}
              </p>
              <p className="g-muted g-small-text">{m.description}</p>
              <div className="g-row">
                <button
                  className="g-primary g-small"
                  disabled={!can}
                  onClick={() => {
                    act((gg) => buyMastery(gg, id));
                    buzz(20);
                  }}
                >
                  Forsk nivå {level + 1}
                </button>
                {!can && (
                  <span className="g-muted g-small-text">Mangler {Math.ceil(cost - g.researchPoints)} fagpoeng</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * Prosjektene sortert etter hva de gir (B-413), med en liten overskrift for hver gruppe når lista er lang nok til at
 * det hjelper. Ellers ser 15–20 kort på støperiet helt like ut.
 */
function byGroup<T extends ResearchOption>(list: T[]): T[] {
  const order = (r: T) => RESEARCH_GROUPS.findIndex((x) => x.id === researchGroup(r));
  return [...list].sort((a, b) => order(a) - order(b));
}

function grouped<T extends ResearchOption>(list: T[], render: (r: T) => ReactNode, asItem = false): ReactNode {
  const sorted = byGroup(list);
  if (list.length <= 3 || new Set(sorted.map((r) => researchGroup(r))).size < 2) return sorted.map(render);
  return sorted.map((r, i) => {
    const group = researchGroup(r);
    const title = RESEARCH_GROUPS.find((x) => x.id === group)!.title;
    const first = i === 0 || researchGroup(sorted[i - 1]) !== group;
    return (
      <Fragment key={r.id}>
        {first &&
          (asItem ? <li className="g-research-group">{title}</li> : <h4 className="g-research-group">{title}</h4>)}
        {render(r)}
      </Fragment>
    );
  });
}

/** Forskning: fagpoeng brukes på å låse opp utstyr og forbedringer. */
export function Research({
  g,
  act,
  openBook,
}: {
  g: GameState;
  act: GameApi["act"];
  openBook: (chapter?: string) => void;
}) {
  const options = researchOptions(g);
  // Konsernforskningen står for seg, og venter til konsernet er åpnet (B-120)
  const konsernOpen = !!g.konsern?.unlocked;
  const current = options.filter((r) => !r.done && r.stage <= g.stage && !(r.konsern && !konsernOpen));
  const konsernLater = g.stage >= 4 && !konsernOpen ? options.filter((r) => r.konsern && !r.done) : [];
  // Klar nå: nok fagpoeng og kapitlet er lest. Nesten: mangler fagpoeng eller lesing. Neste nivå: bare navnet.
  const ready = current.filter((r) => r.available);
  const later = current.filter((r) => !r.available);
  const nextStage = options.filter((r) => !r.done && r.stage === g.stage + 1 && !r.konsern);
  const done = options.filter((r) => r.done);
  const card = (r: (typeof options)[number]) => (
    <div key={r.id} className="g-upgrade">
      <div className="g-contract-head">
        <strong>{r.name}</strong>
        <span className="g-fp-cost">{r.cost} fagpoeng</span>
      </div>
      <p className="g-effect">{r.effect}</p>
      <p className="g-muted g-small-text">{r.description}</p>
      <div className="g-row">
        {r.available ? (
          <button
            className="g-primary g-small"
            onClick={() => {
              act((gg) => doResearch(gg, r.id));
              buzz(20);
            }}
          >
            Forsk
          </button>
        ) : r.reads && !g.readChapters.includes(r.reads) ? (
          <button className="g-small" onClick={() => openBook(r.reads)}>
            <Icon name="book" /> Les «{knowledgeCard(r.reads)?.title ?? "kapitlet"}» først
          </button>
        ) : (
          r.reason && <span className="g-muted">{r.reason}</span>
        )}
      </div>
    </div>
  );
  return (
    <>
      {/* UI-3c (B-205): det du kan forske på i hovedkolonnen; fagpoeng, samarbeid og oversikt i sidekolonnen på PC */}
      <div className="g-col-wide g-research-main">
        <Card title="Forskning" className="g-research">
          {ready.length > 0 && (
            <>
              <h3 className="g-subhead">Klar til å forske ({ready.length})</h3>
              <div className="g-upgrades">{grouped(ready, card)}</div>
            </>
          )}
          {later.length > 0 && (
            <>
              <h3 className="g-subhead">Trenger mer fagpoeng eller lesing ({later.length})</h3>
              <ul className="g-research-later">
                {grouped(
                  later,
                  (r) => (
                    <li key={r.id}>
                      <div className="g-contract-head">
                        <strong>{r.name}</strong>
                        <span className="g-fp-cost">{r.cost} fagpoeng</span>
                      </div>
                      <span className="g-muted g-small-text">{r.effect}</span>
                      {/* Hvor nær du er (B-205): fagpoeng du har mot prisen */}
                      <Bar
                        value={Math.min(1, g.researchPoints / r.cost)}
                        tone="accent"
                        label={`Fagpoeng mot ${r.name}`}
                      />
                      {r.reads && !g.readChapters.includes(r.reads) ? (
                        // Mange prosjekter kan vente på samme kapittel (konsernet: ni). Knappen står bare på det første,
                        // så lista ikke blir ni like knapper (B-288)
                        byGroup(later).find((x) => x.reads === r.reads) === r ? (
                          <button className="g-small" onClick={() => openBook(r.reads)}>
                            <Icon name="book" /> Les «{knowledgeCard(r.reads)?.title ?? "kapitlet"}» først
                          </button>
                        ) : (
                          <span className="g-muted g-small-text">
                            Krever også «{knowledgeCard(r.reads)?.title ?? "kapitlet"}»
                          </span>
                        )
                      ) : (
                        r.reason && <span className="g-muted g-small-text">{r.reason}</span>
                      )}
                    </li>
                  ),
                  true,
                )}
              </ul>
            </>
          )}
          {ready.length === 0 && later.length === 0 && konsernLater.length === 0 && !masteryOpen(g) && (
            <p className="g-muted">Alt som finnes på dette nivået, er forsket fram.</p>
          )}
          <Mastery g={g} act={act} />
        </Card>
      </div>
      <div className="g-col g-research-side">
        <Card title="Fagpoeng">
          <p className="g-fp-hero">
            <Icon name="research" />
            <strong>{Math.floor(g.researchPoints)}</strong>
            <span>fagpoeng</span>
          </p>
          <details className="g-role-group">
            <summary>Slik får du fagpoeng</summary>
            <ul className="g-closed">
              <li>Hver charge ovnen smelter (større charger gir mer)</li>
              <li>Hver kontrakt du leverer ferdig, og rammeavtaler som holdes</li>
              <li>Quizene og oppdragene i fagboka</li>
              <li>
                Charger du kjører selv i kontrollrommet («Ta styringen» på Verket, med lysbueovn): opptil 21 for en
                perfekt charge
              </li>
              <li>Forskningssamarbeid (under): kjøp fagpoeng én gang i uka</li>
            </ul>
            <p className="g-muted">Les kapitlet i fagboka før du forsker.</p>
          </details>
          <div className="g-upgrades g-upgrades-single">
            <FpDeal g={g} act={act} />
          </div>
          {konsernLater.length > 0 && (
            <details className="g-role-group">
              <summary>Kommer når konsernet åpnes ({konsernLater.length})</summary>
              <p className="g-muted g-small-text">
                Konsernet åpnes når alt utstyret på storverket er kjøpt, eller egenkapitalen når 1 mrd. kr.
              </p>
              <ul className="g-closed">
                {konsernLater.map((r) => (
                  <li key={r.id}>
                    {r.name} – {r.effect.toLowerCase()}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {nextStage.length > 0 && (
            <details className="g-role-group">
              <summary>
                Kommer i {stageRef(Math.min(STAGES.length - 1, g.stage + 1), g.stage)} ({nextStage.length})
              </summary>
              <ul className="g-closed">
                {nextStage.map((r) => (
                  <li key={r.id}>
                    {r.name} – {r.effect.toLowerCase()}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {done.length > 0 && (
            <details className="g-role-group g-research-done">
              <summary>Forsket fram ({done.length})</summary>
              <ul className="g-closed">
                {done.map((r) => (
                  <li key={r.id} className="ok">
                    {r.name} – {r.effect.toLowerCase()}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      </div>
    </>
  );
}
