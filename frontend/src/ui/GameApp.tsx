import { realNow } from "../game/clock";
import { layoutLocked, onLayoutLock } from "./layoutLock";
import { RecipeGuideCoach } from "./RecipeGuide";
import { isWinter } from "../game/calendar";
import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import "./game.css";
import { isElsewhere, onTabChange, playHere } from "../game/tabLock";
import { markChangelogSeen, unseenChangelog } from "../game/changelog";
import { ChangelogSheet } from "./Changelog";
import { STAGES, WIN_CASH } from "../game/data";
import { konsernReady, LEGENDS, WIN_TITLE } from "../game/konsern";
import { InstallTip } from "./InstallTip";
import { completeManual, unlock } from "../game/engine";
import { computePlantStats, day, energyPrice, idleOutsideHours, staffing } from "../game/plant";
import { useGame, type GameApi } from "../game/useGame";
import { resolveDecision } from "../game/decisions";
import { maxSpeed, researchForSpeed, researchOptions } from "../game/research";
import { masteryReady, requestManual, upgradeOptions } from "../game/actions";
import { buzz } from "./haptics";
import { nextTutorialStep, skipTutorial, TUTORIAL } from "../game/tutorial";
import type { GameState, LogEntry, LogLink } from "../game/types";
import { neighborHintDue } from "../game/building";
import { fmtClock, fmtKr, fmtKrCompact, fmtNum, fmtRep, fmtT } from "./format";
import { Handbook } from "./Handbook";
import { HelpSheet } from "./HelpNow";
import { Market } from "./Market";
import { Overview } from "./Overview";
import { hints, type Hint } from "./hints";
import { People } from "./People";
import { ResearchPage } from "./ResearchPage";
import { CloudDot, CloudFollow, IntroAccount, LoggedOutNotice } from "./Account";
import { SeasonPrompt, SeasonResultNotice, SeasonSync, SeasonTeaser } from "./Season";
import { DailySync } from "./Daily";
import { BadgeSync } from "./BadgeSync";
import { PendingControlSync } from "./Weekly";
import { GoalsPage, GoalsSheet } from "./Goals";
import { LeaderboardSheet } from "./Leaderboard";
import { ChatButton, ChatSheet } from "./Chat";
import { ProfileHost } from "./Profile";
import { messagesRequestVer, onMessagesChange } from "./messagesStore";
import { useDailyStatus } from "./useDaily";
import { missionBonusReady } from "../game/daily";
import { useSeasonStatus } from "./useSeason";
import { SettingsSheet } from "./Settings";
import { cloudConfigured } from "../net/config";
import type { BoardKind } from "../net/leaderboard";
import { getSession, userId } from "../net/supabase";
import { flush, leaving, onLocalSave } from "../net/sync";
import { newVersionAvailable, shouldReloadFor, UPDATE_CHECK_MS } from "../net/update";
import { pendingControl } from "../net/weekly";
import { loadGame, saveGame, setSaveListener } from "../game/save";
import { InboxSheet } from "./Inbox";
import { importantLog, markAllSeen, unseenCount } from "../game/inbox";
import { Sales } from "./Sales";
import { KonsernPage } from "./Konsern";
import { useOpenTender } from "./openTender";
import {
  applyCompanyIncome,
  applyDividendNews,
  applyTakeoverNews,
  applyTenderNotices,
  applyTenderResults,
  worldNews,
} from "../net/world";
import { applyKonsern, konsernDiffers } from "../net/konsern";
import { VIEWS, viewUnlocked, type View } from "./views";
import { ActivePlayers } from "./ActivePlayers";
import { Icon, type IconName } from "./icons";
import { isVerketTab } from "./verketTabs";
import type { OnTab } from "./tabMemory";
import { TitleArt } from "./TitleArt";

const NAV_ICON: Record<View, IconName> = {
  verket: "verket",
  marked: "market",
  salg: "sales",
  folk: "people",
  forskning: "research",
  konsern: "konsern",
  mal: "target",
};

// Kontrollrommet (spillet i fire runder) lastes først når det trengs
const ControlRoom = lazy(() => import("./control/ControlRoom").then((m) => ({ default: m.ControlRoom })));

const SPEED_OPTIONS = [
  { speed: 0, label: "Pause", title: "Pause" },
  { speed: 1, label: "1×", title: "Normal fart: ett døgn på to minutter" },
  { speed: 3, label: "3×", title: "Rask" },
  { speed: 10, label: "10×", title: "Veldig rask" },
];

function Intro({ api }: { api: GameApi }) {
  const { hasSave, startNew: onNew, continueSaved: onContinue } = api;
  // Et spill fra før slettes av et nytt spill, så vi spør alltid først – med konto erstattes også spillet på nett
  // (B-125, B-141). Alle nye spill starter med veiledningen (B-136)
  const [confirmNew, setConfirmNew] = useState(false);
  // Hvor langt det lagrede spillet har kommet, så «Fortsett» sier hva man fortsetter med (B-147)
  const [saved] = useState(() => (hasSave ? loadGame() : null));
  const startNew = () => {
    if (hasSave) setConfirmNew(true);
    else onNew(true);
  };
  return (
    <div className="g-intro">
      <div className="g-intro-card">
        <TitleArt />
        <h1>Stålverket</h1>
        <p className="g-intro-lead">Fra garasje til storverk.</p>
        {/* Den som har et spill, vet hva det går ut på – da står «Fortsett» alene øverst (B-411) */}
        {!hasSave && (
          <p className="g-intro-short">
            Smelt skrap, lever stål til kundene og bygg ut – fra en kald garasje til et storverk. Underveis lærer du
            hvordan et stålverk virker.
          </p>
        )}
        {saved && (
          <p className="g-intro-save">
            Ditt spill: <strong>{STAGES[saved.stage]?.name ?? "Garasje"}</strong> · dag {day(saved)} ·{" "}
            {fmtKr(Math.floor(saved.cash))}
          </p>
        )}
        <div className="g-intro-actions">
          {hasSave && (
            <button className="g-primary g-intro-main" onClick={onContinue}>
              Fortsett
            </button>
          )}
          <button className={hasSave ? "g-intro-new" : "g-primary g-intro-main"} onClick={startNew}>
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
        <ActivePlayers />
        <SeasonTeaser />
        <IntroAccount api={api} />
        <details className="g-details g-intro-more">
          <summary>
            <Icon name="book" /> Slik spiller du
          </summary>
          <p>
            Du har leid en kald garasje, fått tak i en liten, brukt induksjonsovn og har 25 000 kroner på konto. Naboen
            har gitt deg et tonn skrap. En veiledning viser deg de første stegene.
          </p>
          <ul>
            <li>Velg skrap med omhu: sporelementer kan bare tynnes ut, aldri fjernes.</li>
            <li>Lever riktig kvalitet i tide. Reklamasjoner og forsinkelser koster omdømme.</li>
            <li>Bygg ut til verksted, støperi, stålverk og storverk – og til slutt et konsern.</li>
            <li>Med lysbueovn kan du ta styringen og kjøre chargene selv i kontrollrommet.</li>
          </ul>
        </details>
        <InstallTip />
      </div>
    </div>
  );
}

/**
 * Automatisk oppdatering (B-148): ser etter en ny versjon hvert 5. minutt og når appen vises igjen. Finnes det en,
 * lagres spillet (også på nett), og siden lastes inn på nytt. Under en charge i kontrollrommet (også ukens), mens et
 * ukeresultat venter på å bli levert, eller mens man skriver i et felt, venter den.
 */
function AutoUpdate({ api }: { api: GameApi }) {
  const [found, setFound] = useState<string | null>(null);
  // Kom den gamle siden tilbake etter omlastingen (mellomlager), ber vi spilleren lukke og åpne appen
  const [stuck, setStuck] = useState(false);
  const busy = !!api.game?.pendingManual;
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    let alive = true;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const id = await newVersionAvailable(import.meta.env.BASE_URL);
      if (id && alive) setFound(id);
    };
    void check();
    const t = setInterval(() => void check(), UPDATE_CHECK_MS);
    const onShow = () => void check();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, []);
  const gameRef = useRef(api.game);
  useEffect(() => {
    gameRef.current = api.game;
  });
  useEffect(() => {
    if (!found || busy) return;
    let timer: ReturnType<typeof setTimeout>;
    const reload = async () => {
      const typing = document.activeElement?.matches("input, textarea, select");
      // Åpent kontrollrom (også ukens, som ikke stopper spillet) eller et ukeresultat som ikke er levert: vent (B-397).
      // Et tellende ukeforsøk er brukt når det startes, så en omlasting midt i ville kostet spilleren forsøket
      const controlOpen = !!document.querySelector(".control-room") || pendingControl(userId()) !== null;
      if (typing || controlOpen) {
        timer = setTimeout(() => void reload(), 5000);
        return;
      }
      if (!shouldReloadFor(found)) {
        setStuck(true);
        return;
      }
      if (gameRef.current) saveGame(gameRef.current);
      // Det som venter på å lagres på nett, sendes først (høyst tre sekunder)
      await Promise.race([flush(false).catch(() => {}), new Promise((r) => setTimeout(r, 3000))]);
      // Hent siden forbi mellomlageret først, så omlastingen får den nye versjonen
      await fetch(window.location.href, { cache: "reload" }).catch(() => {});
      window.location.reload();
    };
    // Et lite øyeblikk med beskjeden, så spilleren ser hvorfor siden lastes på nytt
    timer = setTimeout(() => void reload(), 1500);
    return () => clearTimeout(timer);
  }, [found, busy]);
  if (!found) return null;
  return (
    // Et trykk skjuler beskjeden (den kommer igjen ved neste sjekk hvis appen fortsatt er gammel)
    <div className="g-update" role="status" onClick={() => stuck && setFound(null)}>
      <Icon name="refresh" />{" "}
      {stuck
        ? "Ny versjon av spillet er klar – lukk appen og åpne den igjen"
        : `Ny versjon av spillet – ${busy ? "oppdaterer når chargen er ferdig" : "oppdaterer …"}`}
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
              ? "Du er med i sesongen: spill videre og hold plassen på topplista."
              : "Spill videre og la konsernet vokse. Vil du konkurrere med andre, kan du bli med i sesongen under Toppliste (pokalen)."}{" "}
            Utfordringene på storverket står under Verket.
          </p>
        )}
        {won && (
          <p>
            <Icon name="crown" /> Du har fått tittelen <strong>{WIN_TITLE}</strong>. Nye titler venter:{" "}
            {LEGENDS[0].title} når konsernet har {LEGENDS[0].need}, og flere etter det. Når all forskning er gjort,
            åpner <strong>mesterskapet</strong> under Forskning, så fagpoengene alltid har noe å gå til.
          </p>
        )}
        <div className="g-row">
          {won && onContinue && (
            <button className="g-primary" onClick={onContinue}>
              Spill videre
            </button>
          )}
          {/* Etter en seier ligger «Nytt spill» under tannhjulet med bekreftelse, så ingen sletter spillet ved et uhell */}
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

function DecisionCard({
  g,
  onChoose,
  onKeepSpeed,
}: {
  g: GameState;
  onChoose: (i: number) => void;
  onKeepSpeed: (keep: boolean) => void;
}) {
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
            // Primærknapp bare på tips med ett svar; et valg har ofte ikke ett riktig svar (B-406)
            <button
              key={o.label}
              className={tip && i === 0 ? "g-primary" : ""}
              disabled={!ready}
              onClick={() => onChoose(i)}
            >
              <strong>{o.label}</strong>
              {o.hint && <span>{o.hint}</span>}
            </button>
          ))}
        </div>
        {d.resumeSpeed > 1 && (
          // Farten etterpå (B-160): 1× som før (B-033), eller samme fart som før kortet. Valget huskes.
          <label className="g-toggle g-decision-speed">
            <input type="checkbox" checked={g.settings.keepSpeed} onChange={(e) => onKeepSpeed(e.target.checked)} />
            <span>
              Fortsett på {d.resumeSpeed}× etterpå
              <span className="g-toggle-hint g-muted">
                {g.settings.keepSpeed ? "Valget huskes til neste kort." : "Ellers går spillet videre på 1×."}
              </span>
            </span>
          </label>
        )}
      </div>
    </div>
  );
}

function Celebration({ g, onClose }: { g: GameState; onClose: () => void }) {
  const stage = STAGES[g.celebrate ?? g.stage];
  const newGear = upgradeOptions(g).filter((o) => o.stage === stage.id && o.kind !== "stage");
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-labelledby="celebrate-title">
      <div className="g-modal-card g-celebrate">
        <div className="g-celebrate-burst" aria-hidden="true">
          <Icon name="party-popper" />
        </div>
        <h2 id="celebrate-title">Flyttedag: {stage.name}!</h2>
        <p>{stage.description}</p>
        {/* Én setning med det viktigste – tallene står på Verket (B-411) */}
        <p className="g-celebrate-line">
          {stage.id === 2 ? "Du er nå daglig leder – sørg for folk på alle plassene. " : ""}
          Plass til {stage.staffCap} ansatte
          {newGear.length > 0 ? " – og nytt utstyr å kjøpe under Anlegg" : ""}.
        </p>
        <button className="g-primary" onClick={onClose}>
          Sett i gang
        </button>
      </div>
    </div>
  );
}

/** Ny tittel i konsernet (B-150, B-325): Stålmagnat, Stålfyrste … med det den låser opp */
function LegendCelebration({ g, onClose }: { g: GameState; onClose: () => void }) {
  const l = LEGENDS[g.legendCelebrate ?? 0];
  const next = LEGENDS[(g.legendCelebrate ?? 0) + 1];
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-labelledby="legend-title">
      <div className="g-modal-card g-celebrate">
        <div className="g-celebrate-burst" aria-hidden="true">
          <Icon name="crown" />
        </div>
        <h2 id="legend-title">Ny tittel: {l.title}!</h2>
        <p>
          Konsernet har {l.need} – omtrent som {l.like}. Du får {l.fp} fagpoeng til mesterskapet under Forskning.
        </p>
        <p>{l.unlocks}</p>
        {next && (
          <p className="g-muted">
            Neste: {next.title} med {next.need}.
          </p>
        )}
        <button className="g-primary" onClick={onClose}>
          Videre
        </button>
      </div>
    </div>
  );
}

/** Knappen veiledningen ber om på hver side, som skal stå over boksen (B-260) */
const COACH_TARGET: Partial<Record<View, string>> = {
  marked: "button.g-buy",
  salg: ".g-offer-actions button",
};

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
  onResearch,
  onHelp,
  onChat,
  onKonsern,
  onLink,
  notice,
}: {
  g: GameState;
  api: GameApi;
  /** Konsernkassa i toppfeltet åpner Konsern → Industrien, der den brukes (B-340) */
  onKonsern: () => void;
  /** Et varsel med lenke (B-453) */
  onLink: (to: LogLink) => void;
  /** «Hva gjør jeg nå?» i varsellinja på PC (B-283) */
  onHelp: () => void;
  /** Skiftrapporten (B-338) */
  onChat: () => void;
  /** Fagpoengene i toppfeltet åpner Forskning (B-281) */
  onResearch: () => void;
  onBook: () => void;
  onSettings: () => void;
  onInbox: () => void;
  onBoard: () => void;
  /** Varsellinja i toppfeltet (PC). På mobil står den over menyen nederst (B-201) */
  notice: boolean;
}) {
  const stats = computePlantStats(g);
  const unread = g.knowledge.filter((k) => !g.readChapters.includes(k)).length;
  return (
    <header className="g-top">
      <div className="g-top-row">
        <div className="g-when">
          {/* «natt» står ved navnet, ikke ved klokka: der brøt den linja, og hele siden hoppet ned og opp (B-238) */}
          <div className="g-when-head">
            <strong>{STAGES[g.stage].name}</strong>
            {g.speed > 0 && idleOutsideHours(g, stats) && (
              <em className="g-ff" title="Verket står om natta – tida går fortere til arbeidsdagen starter">
                <Icon name="fast-forward" /> natt
              </em>
            )}
            {/* Vinter (B-265): flere uhell og eksplosjoner */}
            {isWinter(g) && (
              <em className="g-ff g-winter" title="Vinter: is og kulde gir flere uhell og eksplosjoner">
                <Icon name="snowflake" label="Vinter" />
              </em>
            )}
          </div>
          <span>
            {/* Dag og klokke brytes heller enn å kuttes når toppraden er trang (B-144) */}
            <span className="g-nw">Dag {day(g)} ·</span>{" "}
            <span className="g-nw">
              {fmtClock(g.minute)}
              <CloudDot />
            </span>
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
                {o.speed === 0 ? <Icon name="pause" className="g-speed-pause" /> : o.label}
                {locked && <Icon name="lock" className="g-speed-lock" />}
              </button>
            );
          })}
        </div>
        <button className="g-book g-top-book" onClick={onBook} aria-label="Fagboka">
          <Icon name="book" />
          <span className="hide-narrow"> Fagbok</span>
          {unread > 0 && <span className="g-badge">{unread}</span>}
        </button>
        <button className="g-book g-top-settings" onClick={onSettings} aria-label="Innstillinger">
          <Icon name="settings" />
        </button>
      </div>
      {/* Nøkkeltallene (B-192): ikon + tall på mobil, ord i tillegg når det er plass. Skjermlesere får alltid ordet */}
      <div className="g-top-row g-kpis">
        <Kpi
          icon="money"
          label="Kasse"
          className={`g-kpi-cash${g.cash < 0 ? " tone-critical" : ""}`}
          hint={Math.abs(g.cash) >= 100_000_000_000 ? `Kasse: ${fmtKr(Math.floor(g.cash))}` : undefined}
        >
          {/* Uten kassetak (B-381) kan tallet bli stort: kort form her, nøyaktig i hjelpeteksten og på Økonomi */}
          {fmtKrCompact(Math.floor(g.cash))}
        </Kpi>
        <Kpi icon="star" label="Omdømme" className="g-kpi-rep">
          {fmtRep(g.reputation)}
        </Kpi>
        <Kpi icon="power" label={stats.furnace.fuel === "gass" ? "Gass" : "Strøm"}>
          {fmtNum(energyPrice(g), 2)} kr/kWh
        </Kpi>
        {/* Konsernkassa (B-340): pengene på serveren som kjøper verk, byr i anbud og overtar selskaper. Bare med konto og
            konsern – ellers finnes den ikke ennå */}
        {g.konsern.treasury && (
          <Kpi
            icon="konsern"
            label="Konsernkassa"
            className="g-kpi-treasury"
            hint={`Konsernkassa: ${fmtKr(Math.floor(g.konsern.treasury.balance))}. Trykk for å se hva den brukes til`}
            onClick={onKonsern}
          >
            {fmtKr(Math.floor(g.konsern.treasury.balance))}
          </Kpi>
        )}
        {(g.researchPoints > 0 || g.researched.length > 0) && (
          <Kpi
            icon="research"
            label="Fagpoeng"
            className="g-kpi-fp"
            hint={`${Math.floor(g.researchPoints)} fagpoeng – brukes til forskning. Trykk for å se hva du kan forske på`}
            onClick={onResearch}
          >
            {Math.floor(g.researchPoints)}
          </Kpi>
        )}
        {/* Skiftrapporten (B-338) og «Hva gjør jeg nå?» (B-283) på smale mobiler: i varsellinja ble det for trangt under 380 px */}
        <ChatButton g={g} onClick={onChat} className="g-kpi g-kpi-btn g-chat-kpi" />
        <button
          className="g-kpi g-kpi-btn g-help-kpi"
          onClick={onHelp}
          aria-label="Hva gjør jeg nå?"
          title="Hva gjør jeg nå?"
        >
          <Icon name="circle-help" />
        </button>
      </div>
      {notice && (
        <NoticeRow
          g={g}
          api={api}
          onInbox={onInbox}
          onLink={onLink}
          onBoard={onBoard}
          onHelp={onHelp}
          onChat={onChat}
        />
      )}
    </header>
  );
}

/** Varsellinja med pokalen ved siden av (B-134): i toppfeltet på PC, rett over menyen nederst på mobil (B-201) */
function NoticeRow({
  g,
  api,
  onInbox,
  onLink,
  onBoard,
  onHelp,
  onGoals,
  onChat,
  className = "",
}: {
  g: GameState;
  api: GameApi;
  onInbox: () => void;
  /** Et varsel med lenke fører rett dit (B-453): anbudet åpner Konsern → Industrien */
  onLink: (to: LogLink) => void;
  onBoard: () => void;
  /** «Hva gjør jeg nå?» (B-283) */
  onHelp: () => void;
  /** Mål (B-214): egen knapp på mobil som åpner et ark, som de to andre (B-286); på PC står Mål i sidemenyen */
  onGoals?: () => void;
  /** Skiftrapporten (B-338) */
  onChat: () => void;
  className?: string;
}) {
  return (
    <div className={`g-notice-row ${className}`.trim()}>
      <NoticeLine api={api} unseen={unseenCount(g)} latest={latestUnseen(g)} onOpen={onInbox} onLink={onLink} />
      <button
        className="g-book g-board-btn g-help-btn"
        onClick={onHelp}
        aria-label="Hva gjør jeg nå?"
        title="Hva gjør jeg nå?"
      >
        <Icon name="circle-help" />
      </button>
      {onGoals && <GoalsButton g={g} onClick={onGoals} />}
      <ChatButton g={g} onClick={onChat} />
      <button className="g-book g-board-btn" onClick={onBoard} aria-label="Toppliste" title="Toppliste">
        <Icon name="trophy" />
      </button>
    </div>
  );
}

/** Knappen til Mål (B-214), med en prikk når dagens belønning eller oppdragsbonusen kan hentes */
function GoalsButton({ g, onClick }: { g: GameState; onClick: () => void }) {
  const status = useDailyStatus();
  const ready = g.tutorial === null && !!status && (!status.claimed || (!g.daily.claimed && missionBonusReady(g)));
  return (
    <button
      className="g-book g-board-btn g-goals-btn"
      onClick={onClick}
      aria-label={ready ? "Mål – noe venter på deg" : "Mål: dagens oppdrag, uka og merker"}
      title="Mål"
    >
      <Icon name="target" />
      {ready && <span className="g-goals-dot" aria-hidden="true" />}
    </button>
  );
}

/** Er skjermen bred nok til PC-skallet (B-192)? Følger med når vinduet endrer størrelse */
function useIsPc(): boolean {
  const query = "(min-width: 900px)";
  const [pc, setPc] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    // Står skallet låst (et tellende forsøk i kontrollrommet, B-427), byttes det først når låsen slippes
    const on = () => {
      if (!layoutLocked()) setPc(mq.matches);
    };
    mq.addEventListener("change", on);
    const off = onLayoutLock(on);
    return () => {
      mq.removeEventListener("change", on);
      off();
    };
  }, []);
  return pc;
}

function Kpi({
  icon,
  label,
  className = "",
  children,
  onClick,
  hint,
}: {
  icon: IconName;
  label: string;
  className?: string;
  children: ReactNode;
  /** Kan trykkes (B-281): fagpoengene åpner Forskning, der det står hva de er og hvordan man får dem */
  onClick?: () => void;
  hint?: string;
}) {
  const body = (
    <>
      <Icon name={icon} />
      <em className="g-kpi-label">{label}</em>
      <strong>{children}</strong>
    </>
  );
  return onClick ? (
    <button
      type="button"
      className={`g-kpi g-kpi-btn ${className}`}
      title={hint ?? label}
      aria-label={hint}
      onClick={onClick}
    >
      {body}
    </button>
  ) : (
    <span className={`g-kpi ${className}`} title={hint ?? label}>
      {body}
    </span>
  );
}

const TOAST_ICON = { bad: "warning", event: "info", good: "check", info: "info" } as const satisfies Record<
  string,
  IconName
>;

/**
 * Varsellinja (B-116): en fast linje nederst i toppfeltet med bjella og det nyeste varselet. Den har alltid samme
 * høyde og ligger ikke oppå siden, så den kommer aldri i veien for knapper. Trykk åpner varsellista. Det nyeste
 * varselet vises alltid, og ✕ fjerner alle og nullstiller tallet på bjella (B-171). Svar på noe spilleren trykket på
 * (f.eks. «For lite penger») står ikke i lista, så de vises helt.
 */
/** Det nyeste varselet spilleren ikke har sett (samme utvalg som tallet på bjella), eller ingenting (B-202) */
function latestUnseen(g: GameState): LogEntry | undefined {
  const seen = g.inboxSeenId ?? 0;
  const list = importantLog(g);
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (e.id <= seen) break;
    if (e.kind !== "good") return e;
  }
  return undefined;
}

function NoticeLine({
  api,
  unseen,
  latest,
  onOpen,
  onLink,
}: {
  api: GameApi;
  unseen: number;
  latest?: LogEntry;
  onOpen: () => void;
  onLink: (to: LogLink) => void;
}) {
  const t = api.toasts[0];
  // Varselet om et åpent anbud fører rett til selskapet (B-453); det står fortsatt i varsellista
  const link = t ? (t.fromLog ? t.link : undefined) : unseen > 0 ? latest?.link : undefined;
  // Når varselet har gått ut av linja, står det nyeste usette varselet der fortsatt (B-202). Tallet står på bjella
  const kind = t?.kind ?? (unseen > 0 ? latest?.kind : undefined);
  const text = t ? t.text : unseen > 0 ? (latest?.text ?? "Nye varsler – trykk for å se") : "Ingen nye varsler";
  return (
    <div
      className={`g-notice${kind ? ` toast-${kind}` : ""}${t && !t.fromLog ? " is-full" : ""}`}
      role="status"
      aria-live="polite"
    >
      <button
        className="g-notice-text"
        onClick={() => {
          if (t && !t.fromLog) return api.dismissToast(t.id);
          if (!link) return onOpen();
          // Varselet er lest når spilleren har fulgt det; ellers fører neste trykk dit igjen i stedet for til lista
          const seen = t ? t.logId : latest?.id;
          if (t) api.dismissToast(t.id);
          if (seen) api.act((gg) => void (gg.inboxSeenId = Math.max(gg.inboxSeenId ?? 0, seen)));
          onLink(link);
        }}
        aria-label={
          link ? `${text} Trykk for å gå til selskapet.` : `Varsler${unseen ? ` (${unseen} nye)` : ""}: ${text}`
        }
      >
        <span className="g-notice-bell" aria-hidden="true">
          <Icon name="bell" />
          {unseen > 0 && <span className="g-badge">{unseen > 99 ? "99+" : unseen}</span>}
        </span>
        <span className={`g-notice-msg${kind ? "" : " is-idle"}`}>
          {/* Plassen til ikonet står også uten varsel (B-373), så teksten ikke skyves når et varsel kommer */}
          {kind ? (
            <Icon name={TOAST_ICON[kind]} className="g-notice-kind" />
          ) : (
            <span className="g-notice-kind is-empty" />
          )}
          {text}
        </span>
        {link && <Icon name="chevron-right" className="g-notice-go" />}
      </button>
      {/* Krysset fjerner alle varsler og tallet på bjella (B-171). Lista bak bjella har dem fortsatt */}
      {(t || unseen > 0) && (
        <button
          className="g-toast-close"
          onClick={() => {
            api.clearToasts();
            api.act((gg) => markAllSeen(gg));
          }}
          aria-label="Fjern alle varsler"
        >
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}

/** Spillet er åpnet i en annen fane (B-176): denne fanen står stille til spilleren tar det tilbake */
function OtherTab() {
  const elsewhere = useSyncExternalStore(onTabChange, isElsewhere, isElsewhere);
  if (!elsewhere) return null;
  return (
    <div className="g-modal" role="alertdialog" aria-modal="true" aria-label="Spillet er åpent i en annen fane">
      <div className="g-modal-card">
        <h2>Spillet er åpent et annet sted</h2>
        <p>
          Du har åpnet spillet i en annen fane eller et annet vindu. Bare ett vindu kan spille om gangen – ellers lagrer
          de over hverandre. Spillet er lagret, og står stille her.
        </p>
        <button className="g-primary g-wide-action" onClick={playHere}>
          Spill her
        </button>
      </div>
    </div>
  );
}

export function GameApp() {
  const api = useGame();
  const { game: g, act } = api;
  // «Hva er nytt» etter en oppdatering (B-179). Regnes ut én gang: en ny spiller uten lagret spill får ikke lista
  const [news, setNews] = useState(() => unseenChangelog(api.hasSave));
  const [view, setView] = useState<View>("verket");
  const [subTab, setSubTab] = useState<{ tab?: string; n: number }>({ n: 0 });
  // Underfanen hver hovedmeny sto på, så alle menyene husker den på samme måte (B-192, B-233)
  const [tabs, setTabs] = useState<Partial<Record<View, string>>>({});
  const onTab = useMemo(() => {
    const report =
      (v: View): OnTab =>
      (t) =>
        setTabs((p) => (p[v] === t ? p : { ...p, [v]: t }));
    return {
      verket: report("verket"),
      marked: report("marked"),
      salg: report("salg"),
      folk: report("folk"),
      konsern: report("konsern"),
      mal: report("mal"),
    };
  }, []);
  const [bookOpen, setBookOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // Mål er et ark på mobil (B-286), som hjelpen og topplista ved siden av; på PC en side i sidemenyen
  const [goalsOpen, setGoalsOpen] = useState(false);
  // Topplista er et eget ark bak pokalen igjen (B-214); Mål er en egen side
  const [boardOpen, setBoardOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // «Send melding» på en profil (B-421) åpner Skiftrapporten på fanen Meldinger
  const messagesVer = useSyncExternalStore(onMessagesChange, messagesRequestVer, messagesRequestVer);
  useEffect(() => {
    if (messagesVer > 0) setChatOpen(true);
  }, [messagesVer]);
  // Lista topplista åpner på: kontrollrommet når den åpnes fra resultatet der (B-295)
  const [boardKind, setBoardKind] = useState<BoardKind>("konsern");
  const [bookChapter, setBookChapter] = useState<string | null>(null);
  // Beskjeden om at en sesong er over, vises før spørsmålet om neste sesong (B-143)
  const [resultOpen, setResultOpen] = useState(false);
  // Seiersskjermen vises én gang per spill; valget lagres i spillet (B-091)
  const winSeen = !!g?.winSeen;
  // Er spillet med i sesongen som pågår? Seiersskjermen forklarer da topplista i stedet for sesongene (B-141)
  const seasonStatus = useSeasonStatus();
  const seasonActive = !!seasonStatus?.current && g?.season === seasonStatus.current.id;

  // Innholdet scroller i .g-main (B-137, B-192); vinduet holdes øverst (B-262). Begge settes til toppen ved bytte av fane
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

  // Pause på Salg (B-222): spillet står stille mens spilleren leser forespørslene, og går videre i samme fart når Salg
  // lukkes. Starter spilleren tida selv på Salg, blir den stående slik.
  const onSales = !!g && viewUnlocked(g, view) && view === "salg";
  const salesResume = useRef<number | null>(null);
  const [salesPaused, setSalesPaused] = useState(false);
  useEffect(() => {
    const gg = api.game;
    if (!gg) return;
    if (onSales) {
      if (gg.settings.pauseOnSales && gg.speed > 0 && !gg.gameOver) {
        salesResume.current = gg.speed;
        api.setSpeed(0);
        setSalesPaused(true);
      }
    } else if (salesResume.current !== null) {
      if (gg.speed === 0 && !gg.gameOver && !gg.pendingDecision && !gg.pendingManual) api.setSpeed(salesResume.current);
      salesResume.current = null;
      setSalesPaused(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSales]);
  const speedNow = g?.speed ?? 0;
  useEffect(() => {
    // Bare etter at pausen er satt (salesPaused), ellers ser farten fra før pausen ut som om spilleren startet tida
    if (onSales && salesPaused && speedNow > 0) {
      salesResume.current = null;
      setSalesPaused(false);
    }
  }, [onSales, salesPaused, speedNow]);

  // Varsellinja står over menyen nederst på mobil (B-201). Høyden følges, så veiledningen legger seg over den
  const isPc = useIsPc();
  // Varsel om avgjort anbud (B-237, B-258: også til dem som ikke bød), om inntekten til eieren og om utbyttet fra
  // datterverkene (B-304) én gang i døgnet; act er stabil, og hvert anbud gir én gang, i rekkefølge (B-253)
  const tender = useOpenTender(!!g?.konsern?.unlocked, (w) => {
    const yesterday = w.dividend.yesterday ?? 0;
    const contribution = w.contribution.yesterday ?? 0;
    // Konsernet på serveren (B-326): verkene, køen, nivået og kassa. Det som kommer inn per ekte dag, er utbyttet og
    // bidraget for en full dag – til «ca. N dager» ved knappene
    const perDay = w.dividend.perDay + w.contribution.perDay;
    if (g && w.konsern && konsernDiffers(g, w.konsern, perDay)) {
      const k = w.konsern;
      act((gg) => applyKonsern(gg, k, perDay));
    }
    if (g && worldNews(g, w.companies, realNow(), yesterday + contribution))
      act((gg) => {
        applyTenderResults(gg, w.companies);
        applyTenderNotices(gg, w.companies);
        applyTakeoverNews(gg, w.companies);
        applyCompanyIncome(gg, w.companies);
        applyDividendNews(gg, yesterday, realNow(), contribution);
      });
  });
  const appRef = useRef<HTMLDivElement>(null);
  const hasGame = !!g;
  useEffect(() => {
    const app = appRef.current;
    const bar = app?.querySelector<HTMLElement>(".g-notice-bar");
    if (!app || !bar || typeof ResizeObserver === "undefined") {
      app?.style.removeProperty("--notice-h");
      return;
    }
    const ro = new ResizeObserver(() => app.style.setProperty("--notice-h", `${bar.offsetHeight}px`));
    ro.observe(bar);
    return () => ro.disconnect();
  }, [isPc, hasGame]);

  // Veiledningen skal ikke dekke knappen den ber om (B-260). På en liten mobil lå boksen over alle kjøpeknappene i
  // steget «Kjøp skrap», så et trykk traff boksen og ingenting skjedde. Høyden måles, så siden alltid kan rulles fri,
  // og står spilleren på siden steget gjelder, rulles knappen opp over boksen
  const coachStep = g?.tutorial ?? null;
  const coachView = coachStep !== null ? TUTORIAL[coachStep]?.view : undefined;
  const pageNow = g && viewUnlocked(g, view) ? view : "verket";
  useEffect(() => {
    const app = appRef.current;
    const coach = app?.querySelector<HTMLElement>(".g-coach");
    if (!app || !coach || typeof ResizeObserver === "undefined") {
      app?.style.removeProperty("--coach-h");
      return;
    }
    const ro = new ResizeObserver(() => app.style.setProperty("--coach-h", `${coach.offsetHeight}px`));
    ro.observe(coach);
    const target = coachView === pageNow ? COACH_TARGET[pageNow] : undefined;
    const frame = requestAnimationFrame(() => {
      const main = app.querySelector<HTMLElement>(".g-main");
      const el = target
        ? [...(main?.querySelectorAll<HTMLElement>(target) ?? [])].find((e) => e.offsetParent !== null)
        : undefined;
      if (!main || !el) return;
      const covered = el.getBoundingClientRect().bottom - (coach.getBoundingClientRect().top - 12);
      if (covered > 0) main.scrollBy({ top: covered, behavior: "smooth" });
    });
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [coachStep, coachView, pageNow, hasGame]);

  if (!g)
    return (
      <>
        <SeasonSync api={api} />
        <AutoUpdate api={api} />
        <Intro api={api} />
        <OtherTab />
      </>
    );

  const stats = computePlantStats(g);
  // Mål er ingen side på mobil (B-286): ble vinduet smalt mens Mål var åpen, vises Verket
  const shown: View = viewUnlocked(g, view) && (isPc || view !== "mal") ? view : "verket";
  const konsernCanBuy = g.konsern.unlocked ? konsernReady(g) : 0;
  const go = (v: View, sub?: string) => {
    if (v === "mal" && !isPc) {
      if (sub) setTabs((p) => ({ ...p, mal: sub }));
      setGoalsOpen(true);
      return;
    }
    setGoalsOpen(false);
    setView(v);
    // Åpner en bestemt underfane, f.eks. lageret under Salg (B-048). Uten den: underfanen du sto på sist – men et nytt
    // trykk på menyen du alt står i, går til første underfane (B-233)
    const tab = sub ?? (v === shown ? undefined : tabs[v]);
    setTabs((p) => ({ ...p, [v]: tab }));
    setSubTab((prev) => ({ tab, n: prev.n + 1 }));
    if (!g.seenViews.includes(v)) act((gg) => void gg.seenViews.push(v));
  };
  // Rådene som peker til Marked eller Folk (det første per fane), og planleggeren som ikke får kjøpt skrap (B-202)
  const navAlerts = new Map<View, Hint>();
  for (const t of hints(g, stats)) if (t.view && !t.handled && !navAlerts.has(t.view)) navAlerts.set(t.view, t);
  if (!navAlerts.has("marked") && g.autoBuyNote)
    navAlerts.set("marked", { text: `Planleggeren får ikke kjøpt ${g.autoBuyNote}.`, view: "marked", sub: "skrap" });
  const openInbox = () => {
    api.clearToasts();
    setInboxOpen(true);
  };
  /** Et varsel med lenke (B-453): anbudet står under Konsern → Industrien */
  const openLink = (to: LogLink) => {
    setInboxOpen(false);
    if (to === "industri") go("konsern", "industri");
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
    helpOpen ||
    (goalsOpen && !isPc) ||
    settingsOpen ||
    inboxOpen ||
    boardOpen ||
    chatOpen ||
    !!g.pendingManual ||
    !!g.pendingDecision ||
    g.celebrate !== null ||
    g.legendCelebrate !== null ||
    g.gameOver ||
    (g.won && !winSeen);

  return (
    <div className={`g-app${g.tutorial !== null || g.recipeGuide ? " has-coach" : ""}`} ref={appRef}>
      <div className="g-behind" inert={modalOpen}>
        <div className="g-head">
          <TopBar
            g={g}
            api={api}
            notice={isPc}
            onBook={() => openBook()}
            onResearch={() => go("forskning")}
            onKonsern={() => go("konsern", "industri")}
            onLink={openLink}
            onHelp={() => setHelpOpen(true)}
            onChat={() => setChatOpen(true)}
            onSettings={() => setSettingsOpen(true)}
            onBoard={() => setBoardOpen(true)}
            onInbox={openInbox}
          />

          <nav className="g-nav" aria-label="Hovedmeny">
            {VIEWS.filter((v) => viewUnlocked(g, v.id)).map((v) => {
              const active = shown === v.id;
              const isNew = !g.seenViews.includes(v.id);
              const hint = g.tutorial !== null && TUTORIAL[g.tutorial]?.view === v.id && shown !== v.id;
              // Folk: «!» når verket står eller går færre skift enn det kunne, fordi folk mangler (B-071)
              const folkAlert =
                v.id === "folk" &&
                g.stage >= 1 &&
                (stats.shifts === 0 ||
                  stats.shifts < staffing(g, true).shifts ||
                  (g.stage >= 2 && stats.shifts < 3 && g.workers.length < STAGES[g.stage].staffCap));
              // Signerer salgsdirektøren for deg, trenger ikke Salg et tall (B-171) – bortsett fra landemerkene, som du
              // tar selv (B-177)
              const director = !!g.konsern?.director?.active;
              // Marked og Folk: «!» når et råd på Verket peker dit – samme regler som rådene (B-202)
              // Konsern: «!» når et anbud er åpent og du ikke har bydd (B-226, B-253)
              // Verket: «!» når kassa holder til et nabolagsbygg spilleren ikke vet om (B-455), til kortet er sett
              const nb = v.id === "verket" ? neighborHintDue(g) : null;
              const alertHint =
                v.id === "marked" || v.id === "folk"
                  ? navAlerts.get(v.id)
                  : nb
                    ? {
                        text: `Kassa holder til ${nb.project.name.toLowerCase()}`,
                        view: "verket" as View,
                        sub: "anlegg",
                      }
                    : v.id === "konsern" && tender
                      ? {
                          text: `Anbud på ${tender.name.toLowerCase()} er åpent`,
                          view: "konsern" as View,
                          sub: "industri",
                        }
                      : undefined;
              const badge =
                v.id === "salg"
                  ? g.contracts.filter((c) => c.status === "tilbud" && (!director || c.landmark)).length
                  : v.id === "forskning"
                    ? researchOptions(g).filter((r) => r.available).length + masteryReady(g)
                    : v.id === "konsern"
                      ? konsernCanBuy
                      : 0;
              return (
                <button
                  key={v.id}
                  className={`${active ? "is-active" : ""}${hint ? " is-hint" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => go(v.id, alertHint?.sub)}
                >
                  <Icon name={NAV_ICON[v.id]} className="g-nav-icon" />
                  <span className="g-nav-label">{v.label}</span>
                  {isNew ? (
                    <span className="g-badge g-badge-new">Ny</span>
                  ) : folkAlert || alertHint ? (
                    <span className="g-badge" aria-label={alertHint?.text ?? "Mangler folk"} title={alertHint?.text}>
                      !
                    </span>
                  ) : (
                    badge > 0 && <span className="g-badge">{badge}</span>
                  )}
                </button>
              );
            })}
            {/* Mål (B-211): eget punkt i sidemenyen på PC; på mobil pokalen ved varsellinja */}
            <button
              className={`g-nav-pc${shown === "mal" ? " is-active" : ""}`}
              aria-current={shown === "mal" ? "page" : undefined}
              onClick={() => go("mal")}
            >
              <Icon name="target" className="g-nav-icon" />
              <span className="g-nav-label">Mål</span>
            </button>
          </nav>
          {!isPc && (
            <NoticeRow
              className="g-notice-bar"
              g={g}
              api={api}
              onInbox={openInbox}
              onLink={openLink}
              onBoard={() => setBoardOpen(true)}
              onHelp={() => setHelpOpen(true)}
              onGoals={() => go("mal")}
              onChat={() => setChatOpen(true)}
            />
          )}
        </div>

        <main className="g-main">
          {shown === "verket" && (
            <Overview
              g={g}
              stats={stats}
              act={act}
              go={go}
              openBook={openBook}
              onOpenSettings={() => setSettingsOpen(true)}
              tab={isVerketTab(tabs.verket) ? tabs.verket : "oversikt"}
              setTab={onTab.verket}
            />
          )}
          {shown === "marked" && (
            <Market
              key={`marked-${subTab.n}`}
              g={g}
              stats={stats}
              act={act}
              openTab={subTab.tab}
              onTab={onTab.marked}
            />
          )}
          {shown === "salg" && (
            <Sales
              key={`salg-${subTab.n}`}
              g={g}
              stats={stats}
              act={act}
              openTab={subTab.tab}
              onTab={onTab.salg}
              paused={salesPaused}
            />
          )}
          {shown === "folk" && (
            <People key={`folk-${subTab.n}`} g={g} stats={stats} act={act} openTab={subTab.tab} onTab={onTab.folk} />
          )}
          {shown === "forskning" && <ResearchPage g={g} act={act} openBook={openBook} />}
          {shown === "konsern" && (
            <KonsernPage
              key={`konsern-${subTab.n}`}
              g={g}
              act={act}
              openTab={subTab.tab}
              onTab={onTab.konsern}
              tender={tender}
              openBook={openBook}
            />
          )}
          {shown === "mal" && (
            <GoalsPage
              key={`mal-${subTab.n}`}
              g={g}
              stats={stats}
              api={api}
              onOpenSettings={() => setSettingsOpen(true)}
              onSales={() => go("salg", "tilbud")}
              openTab={subTab.tab}
              onTab={onTab.mal}
            />
          )}
        </main>
      </div>

      {!modalOpen && <Coach g={g} act={act} />}
      {!modalOpen && <RecipeGuideCoach g={g} act={act} go={go} />}

      {bookOpen && <Handbook g={g} act={act} initial={bookChapter} onClose={() => setBookOpen(false)} />}
      {inboxOpen && <InboxSheet g={g} act={act} onClose={() => setInboxOpen(false)} onLink={openLink} />}
      {helpOpen && <HelpSheet g={g} stats={stats} go={go} onClose={() => setHelpOpen(false)} />}
      {goalsOpen && !isPc && (
        <GoalsSheet
          g={g}
          stats={stats}
          api={api}
          onClose={() => setGoalsOpen(false)}
          onOpenSettings={() => {
            setGoalsOpen(false);
            setSettingsOpen(true);
          }}
          onSales={() => go("salg", "tilbud")}
          openTab={tabs.mal}
          onTab={onTab.mal}
        />
      )}
      {boardOpen && (
        <LeaderboardSheet
          initialKind={boardKind}
          api={api}
          g={g}
          onClose={() => {
            setBoardOpen(false);
            setBoardKind("konsern");
          }}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {chatOpen && (
        <ChatSheet
          onClose={() => setChatOpen(false)}
          onOpenSettings={() => {
            setChatOpen(false);
            setSettingsOpen(true);
          }}
        />
      )}
      {/* Profilen til en spiller (B-419): åpnes ved å trykke på et brukernavn, over arket navnet stod i */}
      <ProfileHost g={g} onOpenSettings={() => setSettingsOpen(true)} />
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
          onKeepSpeed={(keep) => act((gg) => void (gg.settings.keepSpeed = keep))}
        />
      )}

      {g.legendCelebrate !== null && g.celebrate === null && !g.pendingDecision && !g.pendingManual && (
        <LegendCelebration g={g} onClose={() => act((gg) => void (gg.legendCelebrate = null))} />
      )}
      {g.celebrate !== null && !g.pendingDecision && !g.pendingManual && (
        <Celebration g={g} onClose={() => act((gg) => void (gg.celebrate = null))} />
      )}

      {g.pendingManual && (
        <Suspense fallback={<div className="control-room g-loading">Åpner kontrollrommet …</div>}>
          <ControlRoom
            request={g.pendingManual}
            best={g.controlBest ?? 0}
            onDone={(result, chapter, again) => {
              act((gg) => {
                completeManual(gg, result);
                // «Ta neste charge også» (B-175)
                if (again) requestManual(gg, true);
              });
              // Fra resultatet kan man gå rett til kapitlet som forklarer det som gikk dårlig (B-088)
              if (chapter) openBook(chapter);
            }}
            onBoard={
              cloudConfigured()
                ? (result) => {
                    act((gg) => completeManual(gg, result));
                    setBoardKind("kontroll");
                    setBoardOpen(true);
                  }
                : undefined
            }
          />
        </Suspense>
      )}

      <SeasonSync api={api} />
      <BadgeSync api={api} />
      <PendingControlSync />
      <AutoUpdate api={api} />
      <CloudFollow api={api} onOpenSettings={() => setSettingsOpen(true)} />
      <OtherTab />
      {/* Velkommen tilbake og daglig belønning (B-149): ikke oppå andre vinduer eller veiledningen */}
      {news.length > 0 && !modalOpen && !resultOpen && g.tutorial === null && (
        <ChangelogSheet
          entries={news}
          onClose={() => {
            markChangelogSeen();
            setNews([]);
          }}
        />
      )}
      <DailySync api={api} blocked={modalOpen || resultOpen || g.tutorial !== null || news.length > 0} />
      {!modalOpen && <LoggedOutNotice onLogin={() => setSettingsOpen(true)} />}
      {!modalOpen && <SeasonResultNotice onOpen={setResultOpen} />}
      {!modalOpen && !resultOpen && <SeasonPrompt api={api} g={g} onOpenSettings={() => setSettingsOpen(true)} />}
      {g.gameOver && <EndScreen g={g} onRestart={api.quit} />}
      {g.won && !winSeen && !g.gameOver && !g.pendingManual && (
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
