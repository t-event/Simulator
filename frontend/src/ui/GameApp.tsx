import { lazy, Suspense, useEffect, useState } from "react";
import "./game.css";
import { STAGES, WIN_CASH } from "../game/data";
import { completeManual } from "../game/engine";
import { KNOWLEDGE, knowledgeCard } from "../game/knowledge";
import { computePlantStats, day, energyPrice } from "../game/plant";
import { useGame, type GameApi } from "../game/useGame";
import { resolveDecision } from "../game/decisions";
import { researchOptions } from "../game/research";
import { upgradeOptions } from "../game/actions";
import { buzz } from "./haptics";
import type { GameState } from "../game/types";
import { Build } from "./Build";
import { fmtClock, fmtKr, fmtNum, fmtRep, fmtT } from "./format";
import { Market } from "./Market";
import { Overview } from "./Overview";
import { People } from "./People";
import { Sales } from "./Sales";
import { VIEWS, type View } from "./views";

// Kontrollrommet drar med seg prosessmodellen og grafene; det lastes først når det trengs
const ControlRoom = lazy(() => import("./control/ControlRoom").then((m) => ({ default: m.ControlRoom })));

const SPEED_OPTIONS = [
  { speed: 0, label: "❚❚", title: "Pause" },
  { speed: 1, label: "1×", title: "Normal fart: ett døgn på to minutter" },
  { speed: 3, label: "3×", title: "Rask" },
  { speed: 10, label: "10×", title: "Veldig rask" },
];

function Intro({ hasSave, onNew, onContinue }: { hasSave: boolean; onNew: () => void; onContinue: () => void }) {
  return (
    <div className="g-intro">
      <div className="g-intro-card">
        <h1>Stålverket</h1>
        <p className="g-intro-lead">Fra garasje til storverk.</p>
        <p>
          Du har leid en kald garasje, fått tak i en gassfyrt digelovn og har 25 000 kroner på konto. Naboen har ryddet
          låven og gitt deg et tonn skrap.
        </p>
        <p>
          Smelt skrap, støp gods og selg til kundene i bygda. Bygg ut til verksted, støperi og stålverk – og til slutt
          et storverk med hundrevis av ansatte, lysbueovner og strengstøping.
        </p>
        <ul>
          <li>Velg skrap med omhu: sporelementer kan bare tynnes ut, aldri fjernes.</li>
          <li>Lever riktig kvalitet i tide. Reklamasjoner og forsinkelser koster omdømme.</li>
          <li>Med lysbueovn kan du ta styringen og kjøre chargene selv i kontrollrommet.</li>
        </ul>
        <div className="g-row g-intro-actions">
          {hasSave && (
            <button className="g-primary" onClick={onContinue}>
              Fortsett
            </button>
          )}
          <button className={hasSave ? "" : "g-primary"} onClick={onNew}>
            {hasSave ? "Nytt spill" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Handbook({ g, onClose }: { g: GameState; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(g.knowledge[g.knowledge.length - 1] ?? null);
  const locked = KNOWLEDGE.length - g.knowledge.length;
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-label="Fagboka" onClick={onClose}>
      <div className="g-modal-card" onClick={(e) => e.stopPropagation()}>
        <header className="g-card-head">
          <h2>Fagboka</h2>
          <button onClick={onClose} aria-label="Lukk">
            ✕
          </button>
        </header>
        <p className="g-muted">
          Nye kapitler låses opp etter hvert som verket vokser og du møter nye utfordringer.
          {locked > 0 && ` ${locked} kapitler gjenstår.`}
        </p>
        <div className="g-handbook">
          {g.knowledge.map((id) => {
            const card = knowledgeCard(id);
            if (!card) return null;
            const isOpen = open === id;
            return (
              <article key={id} className={isOpen ? "is-open" : ""}>
                <button className="g-handbook-title" onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen}>
                  {card.title}
                </button>
                {isOpen && card.paragraphs.map((p) => <p key={p}>{p}</p>)}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EndScreen({ g, onRestart, onContinue }: { g: GameState; onRestart: () => void; onContinue?: () => void }) {
  const won = g.won && !g.gameOver;
  return (
    <div className="g-modal" role="dialog" aria-modal="true">
      <div className="g-modal-card">
        <h2>{won ? "Et storverk!" : "Konkurs"}</h2>
        <p>
          {won
            ? `Du startet i en garasje og har bygget et stålverk med ${g.workers.length} ansatte og over ${fmtKr(WIN_CASH)} i egenkapital.`
            : "Banken har tatt over verket. Neste gang: hold av penger til skrap og lønn når du investerer."}
        </p>
        <ul>
          <li>Dager: {day(g)}</li>
          <li>Produsert: {fmtT(g.totals.producedT)}</li>
          <li>
            Charger: {fmtNum(g.totals.heats)} (hvorav {g.totals.manualHeats} kjørt selv)
          </li>
          <li>Kontrakter levert: {g.totals.contractsDone}</li>
          <li>Reklamasjoner: {g.totals.complaints}</li>
        </ul>
        <div className="g-row">
          {won && onContinue && (
            <button className="g-primary" onClick={onContinue}>
              Spill videre
            </button>
          )}
          <button onClick={onRestart}>Nytt spill</button>
        </div>
      </div>
    </div>
  );
}

function DecisionCard({ g, onChoose }: { g: GameState; onChoose: (i: number) => void }) {
  const d = g.pendingDecision!;
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-labelledby="decision-title">
      <div className="g-modal-card g-decision">
        <span className="g-decision-kicker">Dag {day(g)} · Et valg</span>
        <h2 id="decision-title">{d.title}</h2>
        <p>{d.text}</p>
        <div className="g-decision-options">
          {d.options.map((o, i) => (
            <button key={o.label} className={i === 0 ? "g-primary" : ""} onClick={() => onChoose(i)}>
              <strong>{o.label}</strong>
              {o.hint && <span>{o.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Celebration({ g, onClose }: { g: GameState; onClose: () => void }) {
  const stage = STAGES[g.celebrate ?? g.stage];
  const newResearch = researchOptions(g).filter((r) => r.stage === stage.id);
  const newGear = upgradeOptions(g).filter((o) => o.stage === stage.id && o.kind !== "stage");
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-labelledby="celebrate-title">
      <div className="g-modal-card g-celebrate">
        <div className="g-celebrate-burst" aria-hidden="true">
          🎉
        </div>
        <h2 id="celebrate-title">Flyttedag: {stage.name}!</h2>
        <p>{stage.description}</p>
        <ul>
          <li>Plass til {stage.staffCap} ansatte</li>
          <li>Faste kostnader: {fmtKr(stage.fixedPerDay)} per døgn</li>
          <li>
            {Math.round(stage.yardT)} t skraplager og {Math.round(stage.storeT)} t ferdigvarelager
          </li>
          {newGear.length > 0 && <li>Nytt utstyr: {newGear.map((o) => o.name).join(", ")}</li>}
          {newResearch.length > 0 && <li>Ny forskning: {newResearch.map((r) => r.name).join(", ")}</li>}
          {stage.id === 2 && <li>Du er nå daglig leder – sørg for folk på alle plassene.</li>}
        </ul>
        <button className="g-primary" onClick={onClose}>
          Sett i gang
        </button>
      </div>
    </div>
  );
}

function TopBar({ g, api, onBook }: { g: GameState; api: GameApi; onBook: () => void }) {
  const stats = computePlantStats(g);
  return (
    <header className="g-top">
      <div className="g-top-row">
        <div className="g-when">
          <strong>{STAGES[g.stage].name}</strong>
          <span>
            Dag {day(g)} · {fmtClock(g.minute)}
          </span>
        </div>
        <div className="g-speed" role="group" aria-label="Fart">
          {SPEED_OPTIONS.map((o) => (
            <button
              key={o.speed}
              className={g.speed === o.speed ? "is-active" : ""}
              title={o.title}
              aria-label={o.title}
              aria-pressed={g.speed === o.speed}
              onClick={() => api.setSpeed(o.speed)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <button className="g-book" onClick={onBook} aria-label="Fagboka">
          <span aria-hidden="true">📖</span>
          <span className="hide-narrow"> Fagbok</span>
          {g.unreadKnowledge > 0 && <span className="g-badge">{g.unreadKnowledge}</span>}
        </button>
      </div>
      <div className="g-top-row g-kpis">
        <span className={g.cash < 0 ? "tone-critical" : ""}>
          <em>Kasse</em> {fmtKr(Math.floor(g.cash))}
        </span>
        <span>
          <em>Omdømme</em> {fmtRep(g.reputation)}
        </span>
        <span>
          <em>{stats.furnace.fuel === "gass" ? "Gass" : "Strøm"}</em> {fmtNum(energyPrice(g), 2)} kr/kWh
        </span>
        <span>
          <em>Fagpoeng</em> {Math.floor(g.researchPoints)}
        </span>
      </div>
    </header>
  );
}

export function GameApp() {
  const api = useGame();
  const { game: g, act } = api;
  const [view, setView] = useState<View>("verket");
  const [bookOpen, setBookOpen] = useState(false);
  const [winSeen, setWinSeen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  if (!g) return <Intro hasSave={api.hasSave} onNew={api.startNew} onContinue={api.continueSaved} />;

  const stats = computePlantStats(g);
  const go = (v: View) => setView(v);
  const openBook = () => {
    act((gg) => void (gg.unreadKnowledge = 0));
    setBookOpen(true);
  };

  const modalOpen =
    bookOpen || !!g.pendingManual || !!g.pendingDecision || g.celebrate !== null || g.gameOver || (g.won && !winSeen);

  return (
    <div className="g-app">
      <div className="g-behind" inert={modalOpen}>
        <div className="g-head">
          <TopBar g={g} api={api} onBook={openBook} />

          <nav className="g-nav" aria-label="Hovedmeny">
            {VIEWS.map((v) => {
              const badge =
                v.id === "salg"
                  ? g.contracts.filter((c) => c.status === "tilbud").length
                  : v.id === "bygg"
                    ? researchOptions(g).filter((r) => r.available).length
                    : 0;
              return (
                <button
                  key={v.id}
                  className={view === v.id ? "is-active" : ""}
                  aria-current={view === v.id ? "page" : undefined}
                  onClick={() => go(v.id)}
                >
                  {v.label}
                  {badge > 0 && <span className="g-badge">{badge}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <main className="g-main">
          {view === "verket" && <Overview g={g} stats={stats} act={act} go={go} />}
          {view === "marked" && <Market g={g} stats={stats} act={act} />}
          {view === "salg" && <Sales g={g} stats={stats} act={act} />}
          {view === "folk" && <People g={g} stats={stats} act={act} />}
          {view === "bygg" && <Build g={g} stats={stats} act={act} onQuit={api.quit} />}
        </main>
      </div>

      <div className="g-toasts" aria-live="polite">
        {api.toasts.map((t) => (
          <button key={t.id} className={`g-toast toast-${t.kind}`} onClick={() => api.dismissToast(t.id)}>
            {t.text}
          </button>
        ))}
      </div>

      {bookOpen && <Handbook g={g} onClose={() => setBookOpen(false)} />}

      {g.pendingDecision && !g.pendingManual && (
        <DecisionCard
          g={g}
          onChoose={(i) => {
            act((gg) => resolveDecision(gg, i));
            buzz(15);
          }}
        />
      )}

      {g.celebrate !== null && !g.pendingDecision && !g.pendingManual && (
        <Celebration g={g} onClose={() => act((gg) => void (gg.celebrate = null))} />
      )}

      {g.pendingManual && (
        <Suspense fallback={<div className="control-room g-loading">Åpner kontrollrommet …</div>}>
          <ControlRoom
            request={g.pendingManual}
            furnaceWear={g.furnaces[g.pendingManual.furnace]?.wear ?? 0}
            onDone={(result) => act((gg) => completeManual(gg, result))}
          />
        </Suspense>
      )}

      {g.gameOver && <EndScreen g={g} onRestart={api.quit} />}
      {g.won && !winSeen && !g.gameOver && <EndScreen g={g} onRestart={api.quit} onContinue={() => setWinSeen(true)} />}
    </div>
  );
}
