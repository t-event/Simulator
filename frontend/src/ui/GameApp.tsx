import { RecipeGuideCoach } from "./RecipeGuide";
import { lazy, Suspense, useEffect, useState } from "react";
import "./game.css";
import { STAGES, WIN_CASH } from "../game/data";
import { InstallTip } from "./InstallTip";
import { completeManual, unlock } from "../game/engine";
import { computePlantStats, day, energyPrice, idleOutsideHours, staffing } from "../game/plant";
import { useGame, type GameApi } from "../game/useGame";
import { resolveDecision } from "../game/decisions";
import { maxSpeed, researchForSpeed, researchOptions } from "../game/research";
import { upgradeOptions } from "../game/actions";
import { buzz } from "./haptics";
import { nextTutorialStep, skipTutorial, TUTORIAL } from "../game/tutorial";
import type { GameState } from "../game/types";
import { fmtClock, fmtKr, fmtNum, fmtRep, fmtT } from "./format";
import { Handbook } from "./Handbook";
import { Market } from "./Market";
import { Overview } from "./Overview";
import { People } from "./People";
import { ResearchPage } from "./ResearchPage";
import { AccountCard, CloudDot, CloudFollow } from "./Account";
import { SeasonPrompt, SeasonResultNotice, SeasonSync, SeasonTeaser } from "./Season";
import { LeaderboardSheet } from "./Leaderboard";
import { useSeasonStatus } from "./useSeason";
import { SettingsSheet } from "./Settings";
import { getSession } from "../net/supabase";
import { leaving, onLocalSave } from "../net/sync";
import { saveGame, setSaveListener } from "../game/save";
import { InboxSheet } from "./Inbox";
import { unseenCount } from "../game/inbox";
import { Sales } from "./Sales";
import { VIEWS, viewUnlocked, type View } from "./views";

// Kontrollrommet drar med seg prosessmodellen og grafene; det lastes først når det trengs
const ControlRoom = lazy(() => import("./control/ControlRoom").then((m) => ({ default: m.ControlRoom })));

const SPEED_OPTIONS = [
  { speed: 0, label: "❚❚", title: "Pause" },
  { speed: 1, label: "1×", title: "Normal fart: ett døgn på to minutter" },
  { speed: 3, label: "3×", title: "Rask" },
  { speed: 10, label: "10×", title: "Veldig rask" },
];

function Intro({ api }: { api: GameApi }) {
  const { hasSave, startNew: onNew, continueSaved: onContinue } = api;
  // Et spill fra før slettes av et nytt spill, så vi spør alltid først – med konto erstattes også spillet på nett
  // (B-125, B-141). Alle nye spill starter med veiledningen (B-136)
  const [confirmNew, setConfirmNew] = useState(false);
  const startNew = () => {
    if (hasSave) setConfirmNew(true);
    else onNew(true);
  };
  return (
    <div className="g-intro">
      <div className="g-intro-card">
        <h1>Stålverket</h1>
        <p className="g-intro-lead">Fra garasje til storverk.</p>
        <p>
          Du har leid en kald garasje, fått tak i en liten, brukt induksjonsovn og har 25 000 kroner på konto. Naboen
          har ryddet låven og gitt deg et tonn skrap.
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
        <InstallTip />
        <SeasonTeaser />
        <div className="g-row g-intro-actions">
          {hasSave && (
            <button className="g-primary" onClick={onContinue}>
              Fortsett
            </button>
          )}
          <button className={hasSave ? "" : "g-primary"} onClick={startNew}>
            {hasSave ? "Nytt spill" : "Start spillet"}
          </button>
        </div>
        {confirmNew && (
          <div className="g-note g-intro-confirm">
            <p>
              {getSession()
                ? "Et nytt spill erstatter spillet som er lagret på kontoen din. Vil du det?"
                : "Et nytt spill sletter spillet du har i denne nettleseren. Vil du det?"}
            </p>
            <div className="g-row">
              <button className="g-danger" onClick={() => onNew(true)}>
                Ja, start nytt
              </button>
              <button onClick={() => setConfirmNew(false)}>Avbryt</button>
            </div>
          </div>
        )}
        <AccountCard api={api} />
      </div>
    </div>
  );
}

function EndScreen({
  g,
  onRestart,
  onContinue,
  inSeason,
}: {
  g: GameState;
  onRestart: () => void;
  onContinue?: () => void;
  /** Spillet er med i sesongen som pågår */
  inSeason?: boolean;
}) {
  const won = g.won && !g.gameOver;
  return (
    <div className="g-modal" role="dialog" aria-modal="true">
      <div className="g-modal-card">
        <h2>{won ? "Et stålkonsern!" : "Konkurs"}</h2>
        <p>
          {won
            ? `Du startet i en garasje og har bygget et stålkonsern med ${g.konsern.plants.length + 1} verk og en verdi på over ${fmtKr(WIN_CASH)}.`
            : `Banken har tatt over verket. ${g.gameOverReason ?? ""} Neste gang: hold av penger til skrap, lønn og vedlikehold når du investerer.`}
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
        {won && (
          <p className="g-muted">
            {inSeason
              ? "Du er med i sesongen: spill videre og hold plassen på topplista. Når neste sesong starter, begynner alle i garasjen igjen."
              : "Spill videre og la konsernet vokse. Vil du konkurrere med andre, kan du bli med i sesongen under 🏆 Toppliste – der starter alle i garasjen."}{" "}
            Utfordringene på storverket står under Verket.
          </p>
        )}
        <div className="g-row">
          {won && onContinue && (
            <button className="g-primary" onClick={onContinue}>
              Spill videre
            </button>
          )}
          {/* Etter en seier ligger «Nytt spill» under ⚙️ med bekreftelse, så ingen sletter spillet ved et uhell */}
          {!won && (
            <button className="g-primary" onClick={onRestart}>
              Nytt spill
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DecisionCard({ g, onChoose }: { g: GameState; onChoose: (i: number) => void }) {
  const d = g.pendingDecision!;
  // Knappene virker først etter et øyeblikk, så et trykk ment for noe annet ikke velger for deg (B-033)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(t);
  }, []);
  const tip = d.id.startsWith("tips-");
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-labelledby="decision-title">
      <div className="g-modal-card g-decision">
        <span className="g-decision-kicker">
          Dag {day(g)} · {tip ? "Tips" : "Et valg"}
        </span>
        <h2 id="decision-title">{d.title}</h2>
        <p>{d.text}</p>
        <div className="g-decision-options">
          {d.options.map((o, i) => (
            <button key={o.label} className={i === 0 ? "g-primary" : ""} disabled={!ready} onClick={() => onChoose(i)}>
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

/** Veiledet start: ett steg om gangen nederst på skjermen, og kan hoppes over (B-027) */
function Coach({ g, act }: { g: GameState; act: GameApi["act"] }) {
  const i = g.tutorial;
  if (i === null) return null;
  const step = TUTORIAL[i];
  if (!step) return null;
  const last = i === TUTORIAL.length - 1;
  return (
    <aside className="g-coach" aria-live="polite" aria-label="Veiledning">
      <div className="g-coach-head">
        <span className="g-muted">
          Veiledning {i + 1} av {TUTORIAL.length}
        </span>
        {!last && (
          <button className="g-link" onClick={() => act((gg) => skipTutorial(gg))}>
            Avslutt veiledningen
          </button>
        )}
      </div>
      <strong>{step.title}</strong>
      <p>{step.text}</p>
      {step.done ? (
        // Steg med et mål går videre av seg selv, men kan hoppes over ett og ett
        <button className="g-coach-skip" onClick={() => act((gg) => nextTutorialStep(gg))}>
          Hopp over steget
        </button>
      ) : (
        <button className="g-primary" onClick={() => act((gg) => nextTutorialStep(gg))}>
          {last ? "Ferdig" : "Neste"}
        </button>
      )}
    </aside>
  );
}

function TopBar({
  g,
  api,
  onBook,
  onSettings,
  onInbox,
  onBoard,
}: {
  g: GameState;
  api: GameApi;
  onBook: () => void;
  onSettings: () => void;
  onInbox: () => void;
  onBoard: () => void;
}) {
  const stats = computePlantStats(g);
  const unread = g.knowledge.filter((k) => !g.readChapters.includes(k)).length;
  const unseen = unseenCount(g);
  return (
    <header className="g-top">
      <div className="g-top-row">
        <div className="g-when">
          <strong>{STAGES[g.stage].name}</strong>
          <span>
            {/* Dag og klokke brytes heller enn å kuttes når toppraden er trang (B-144) */}
            <span className="g-nw">Dag {day(g)} ·</span>{" "}
            <span className="g-nw">
              {fmtClock(g.minute)}
              <CloudDot />
            </span>
            {g.speed > 0 && idleOutsideHours(g, stats) && (
              <em className="g-ff" title="Verket står om natta – tida går fortere til arbeidsdagen starter">
                {" "}
                ⏩ natt
              </em>
            )}
          </span>
        </div>
        <div className="g-speed" role="group" aria-label="Fart">
          {SPEED_OPTIONS.map((o) => {
            const locked = o.speed > maxSpeed(g);
            const research = researchForSpeed(o.speed);
            return (
              <button
                key={o.speed}
                className={`${g.speed === o.speed ? "is-active" : ""}${locked ? " is-locked" : ""}`}
                title={locked ? `Låses opp med forskning` : o.title}
                aria-label={locked ? `${o.title} (låst)` : o.title}
                aria-pressed={g.speed === o.speed}
                onClick={() =>
                  locked
                    ? api.act(() => ({
                        ok: false,
                        message: `${o.label} fart låses opp med forskningen «${research?.name}» når du har fagpoeng nok.`,
                      }))
                    : api.setSpeed(o.speed)
                }
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <button className="g-book" onClick={onBook} aria-label="Fagboka">
          <span aria-hidden="true">📖</span>
          <span className="hide-narrow"> Fagbok</span>
          {unread > 0 && <span className="g-badge">{unread}</span>}
        </button>
        <button className="g-book" onClick={onSettings} aria-label="Innstillinger">
          <span aria-hidden="true">⚙️</span>
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
        {(g.researchPoints > 0 || g.researched.length > 0) && (
          <span>
            <em>Fagpoeng</em> {Math.floor(g.researchPoints)}
          </span>
        )}
      </div>
      {/* 🏆 står ved varsellinja, ikke i toppraden: der er det ikke plass på en smal mobil (B-134) */}
      <div className="g-notice-row">
        <NoticeLine api={api} unseen={unseen} onOpen={onInbox} />
        <button className="g-book g-board-btn" onClick={onBoard} aria-label="Toppliste">
          <span aria-hidden="true">🏆</span>
        </button>
      </div>
    </header>
  );
}

const TOAST_ICON = { bad: "⚠", event: "•", good: "✓", info: "•" } as const;

/**
 * Varsellinja (B-116): en fast linje nederst i toppfeltet med bjella og det nyeste varselet. Den har alltid samme
 * høyde og ligger ikke oppå siden, så den kommer aldri i veien for knapper. Trykk åpner varsellista, ✕ fjerner
 * varselet. Svar på noe spilleren trykket på (f.eks. «For lite penger») står ikke i lista, så de vises helt.
 */
function NoticeLine({ api, unseen, onOpen }: { api: GameApi; unseen: number; onOpen: () => void }) {
  const t = api.toasts[0];
  const text = t
    ? t.text
    : unseen > 0
      ? // Tallet står på bjella; teksten gjentar det ikke (B-144)
        `${unseen === 1 ? "Nytt varsel" : "Nye varsler"} – trykk for å se`
      : "Ingen nye varsler";
  return (
    <div
      className={`g-notice${t ? ` toast-${t.kind}` : ""}${t && !t.fromLog ? " is-full" : ""}`}
      role="status"
      aria-live="polite"
    >
      <button
        className="g-notice-text"
        onClick={() => (t && !t.fromLog ? api.dismissToast(t.id) : onOpen())}
        aria-label={`Varsler${unseen ? ` (${unseen} nye)` : ""}: ${text}`}
      >
        <span className="g-notice-bell" aria-hidden="true">
          🔔{unseen > 0 && <span className="g-badge">{unseen > 99 ? "99+" : unseen}</span>}
        </span>
        <span className={`g-notice-msg${t ? "" : " is-idle"}`}>
          {t && <span aria-hidden="true">{TOAST_ICON[t.kind]} </span>}
          {text}
        </span>
      </button>
      {api.toastsWaiting > 0 && (
        <span className="g-toast-more" aria-label={`${api.toastsWaiting} varsler til`}>
          +{api.toastsWaiting}
        </span>
      )}
      {t && (
        <button className="g-toast-close" onClick={() => api.dismissToast(t.id)} aria-label="Fjern varselet">
          ✕
        </button>
      )}
    </div>
  );
}

export function GameApp() {
  const api = useGame();
  const { game: g, act } = api;
  const [view, setView] = useState<View>("verket");
  const [subTab, setSubTab] = useState<{ tab?: string; n: number }>({ n: 0 });
  const [bookOpen, setBookOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [bookChapter, setBookChapter] = useState<string | null>(null);
  // Beskjeden om at en sesong er over, vises før spørsmålet om neste sesong (B-143)
  const [resultOpen, setResultOpen] = useState(false);
  // Seiersskjermen vises én gang per spill; valget lagres i spillet (B-091)
  const winSeen = !!g?.winSeen;
  // Er spillet med i sesongen som pågår? Seiersskjermen forklarer da topplista i stedet for sesongene (B-141)
  const seasonStatus = useSeasonStatus();
  const seasonActive = !!seasonStatus?.current && g?.season === seasonStatus.current.id;

  // Mobil scroller i .g-main (B-137), bred skjerm i vinduet: begge settes til toppen ved bytte av fane
  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.querySelector(".g-main")?.scrollTo({ top: 0 });
  }, [view]);

  // Lagring på nett følger den lokale lagringen; når appen legges bort eller man går til et annet vindu, sendes det
  // som venter med én gang (B-125, B-141)
  useEffect(() => {
    setSaveListener(onLocalSave);
    const away = () => {
      if (!api.game) return;
      saveGame(api.game);
      void leaving(api.game, true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") away();
    };
    const onBlur = () => {
      if (!api.game) return;
      saveGame(api.game);
      void leaving(api.game, false);
    };
    window.addEventListener("pagehide", away);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      setSaveListener(null);
      window.removeEventListener("pagehide", away);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [api.game]);

  if (!g)
    return (
      <>
        <SeasonSync api={api} />
        <Intro api={api} />
      </>
    );

  const stats = computePlantStats(g);
  const shown: View = viewUnlocked(g, view) ? view : "verket";
  const go = (v: View, sub?: string) => {
    setView(v);
    // Åpner en bestemt underfane, f.eks. lageret under Salg (B-048)
    setSubTab((prev) => ({ tab: sub, n: prev.n + 1 }));
    if (!g.seenViews.includes(v)) act((gg) => void gg.seenViews.push(v));
  };
  /** Åpner fagboka på et kapittel (eller det første uleste) og merker det som lest */
  const openBook = (chapter?: string) => {
    const start = chapter ?? g.knowledge.find((k) => !g.readChapters.includes(k)) ?? null;
    act((gg) => {
      gg.unreadKnowledge = 0;
      // Et kapittel som forskningen ber om, skal alltid kunne leses, også før det er låst opp (B-036)
      if (start) unlock(gg, start);
      if (start && !gg.readChapters.includes(start)) gg.readChapters.push(start);
    });
    setBookChapter(start);
    setBookOpen(true);
  };

  const modalOpen =
    bookOpen ||
    settingsOpen ||
    boardOpen ||
    inboxOpen ||
    !!g.pendingManual ||
    !!g.pendingDecision ||
    g.celebrate !== null ||
    g.gameOver ||
    (g.won && !winSeen);

  return (
    <div className={`g-app${g.tutorial !== null || g.recipeGuide ? " has-coach" : ""}`}>
      <div className="g-behind" inert={modalOpen}>
        <div className="g-head">
          <TopBar
            g={g}
            api={api}
            onBook={() => openBook()}
            onSettings={() => setSettingsOpen(true)}
            onBoard={() => setBoardOpen(true)}
            onInbox={() => {
              api.clearToasts();
              setInboxOpen(true);
            }}
          />

          <nav className="g-nav" aria-label="Hovedmeny">
            {VIEWS.filter((v) => viewUnlocked(g, v.id)).map((v) => {
              const isNew = !g.seenViews.includes(v.id);
              const hint = g.tutorial !== null && TUTORIAL[g.tutorial]?.view === v.id && shown !== v.id;
              // Folk: «!» når verket står eller går færre skift enn det kunne, fordi folk mangler (B-071)
              const folkAlert =
                v.id === "folk" &&
                g.stage >= 1 &&
                (stats.shifts === 0 ||
                  stats.shifts < staffing(g, true).shifts ||
                  (g.stage >= 2 && stats.shifts < 3 && g.workers.length < STAGES[g.stage].staffCap));
              const badge =
                v.id === "salg"
                  ? g.contracts.filter((c) => c.status === "tilbud").length
                  : v.id === "forskning"
                    ? researchOptions(g).filter((r) => r.available).length
                    : 0;
              return (
                <button
                  key={v.id}
                  className={`${shown === v.id ? "is-active" : ""}${hint ? " is-hint" : ""}`}
                  aria-current={shown === v.id ? "page" : undefined}
                  onClick={() => go(v.id)}
                >
                  {v.label}
                  {isNew ? (
                    <span className="g-badge g-badge-new">Ny</span>
                  ) : folkAlert ? (
                    <span className="g-badge" aria-label="Mangler folk">
                      !
                    </span>
                  ) : (
                    badge > 0 && <span className="g-badge">{badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <main className="g-main">
          {shown === "verket" && <Overview g={g} stats={stats} act={act} go={go} openBook={openBook} />}
          {shown === "marked" && (
            <Market
              key={subTab.tab ? `marked-${subTab.n}` : "marked"}
              g={g}
              stats={stats}
              act={act}
              openTab={subTab.tab}
            />
          )}
          {shown === "salg" && (
            <Sales key={subTab.tab ? `salg-${subTab.n}` : "salg"} g={g} stats={stats} act={act} openTab={subTab.tab} />
          )}
          {shown === "folk" && <People g={g} stats={stats} act={act} />}
          {shown === "forskning" && <ResearchPage g={g} act={act} openBook={openBook} />}
        </main>
      </div>

      {!modalOpen && <Coach g={g} act={act} />}
      {!modalOpen && <RecipeGuideCoach g={g} act={act} go={go} />}

      {bookOpen && <Handbook g={g} act={act} initial={bookChapter} onClose={() => setBookOpen(false)} />}
      {inboxOpen && <InboxSheet g={g} act={act} onClose={() => setInboxOpen(false)} />}
      {boardOpen && (
        <LeaderboardSheet
          api={api}
          g={g}
          onClose={() => setBoardOpen(false)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {settingsOpen && (
        <SettingsSheet
          g={g}
          stats={stats}
          api={api}
          onQuit={() => {
            setSettingsOpen(false);
            api.quit();
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {g.pendingDecision && !g.pendingManual && (
        <DecisionCard
          key={`${g.pendingDecision.id}-${g.minute}`}
          g={g}
          onChoose={(i) => {
            const chapter = g.pendingDecision?.options[i]?.chapter;
            act((gg) => resolveDecision(gg, i));
            buzz(15);
            if (chapter) openBook(chapter);
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
            onDone={(result, chapter) => {
              act((gg) => completeManual(gg, result));
              // Fra resultatet kan man gå rett til kapitlet som forklarer det som gikk dårlig (B-088)
              if (chapter) openBook(chapter);
            }}
          />
        </Suspense>
      )}

      <SeasonSync api={api} />
      <CloudFollow api={api} />
      {!modalOpen && <SeasonResultNotice onOpen={setResultOpen} />}
      {!modalOpen && !resultOpen && <SeasonPrompt api={api} g={g} onOpenSettings={() => setSettingsOpen(true)} />}
      {g.gameOver && <EndScreen g={g} onRestart={api.quit} />}
      {g.won && !winSeen && !g.gameOver && (
        <EndScreen
          g={g}
          onRestart={api.quit}
          onContinue={() => act((gg) => void (gg.winSeen = true))}
          inSeason={seasonActive}
        />
      )}
    </div>
  );
}
