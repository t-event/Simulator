import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_MIN_PER_REAL_S } from "./data";
import { advance, newGame, type PurchaseResult } from "./engine";
import { IDLE_NIGHT_SPEED, idleOutsideHours } from "./plant";
import { maxSpeed } from "./research";
import { advanceTutorial } from "./tutorial";
import { advanceRecipeGuide } from "./recipeGuide";
import { clearSave, loadGame, saveGame } from "./save";
import { showToast } from "./inbox";
import type { GameState, LogEntry } from "./types";

const TICK_MS = 200;
// En strupet bakgrunnsfane skal ikke hoppe over flere spilltimer på ett tick
const MAX_ELAPSED_S = 1;
const AUTOSAVE_MS = 5000;
/**
 * Ett varsel om gangen på én linje, så det ikke dekker knappene (B-114). Står det flere i kø, går hvert raskere,
 * så køen ikke henger etter spillet (B-098).
 */
/** Står flere i kø, går hvert varsel på litt over halve tida (B-115: tida velges under ⚙️) */
const TOAST_BUSY_SHARE = 0.6;
const MAX_TOASTS = 1;
const MAX_QUEUE = 12;

export interface Toast {
  id: number;
  text: string;
  kind: LogEntry["kind"];
  /** Fra loggen (står i varsellista bak 🔔), eller svar på noe spilleren trykket på */
  fromLog: boolean;
}

export interface GameApi {
  game: GameState | null;
  hasSave: boolean;
  toasts: Toast[];
  /** Varsler som venter i kø bak det som vises */
  toastsWaiting: number;
  /** Fjerner alle varsler, f.eks. når varsellista åpnes */
  clearToasts: () => void;
  /** Nytt spill, med eller uten veiledet start */
  startNew: (guided: boolean) => void;
  /** Nytt spill+ etter en seier: neste runde med bonus (B-090) */
  startNextRound: () => void;
  continueSaved: () => void;
  /** Kjører en handling på spillet og tegner på nytt. Resultatmeldinger vises som varsel. */
  act: <T>(fn: (g: GameState) => T) => T;
  setSpeed: (speed: number) => void;
  dismissToast: (id: number) => void;
  quit: () => void;
  /** Bytter til et spill fra nettet (B-125), på pause */
  adopt: (g: GameState) => void;
  /** Legger et spill fra nettet i den lokale lagringen uten å starte det, så «Fortsett» tar det (B-125) */
  stash: (g: GameState) => void;
}

export function useGame(): GameApi {
  const gameRef = useRef<GameState | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [, setVersion] = useState(0);
  const [hasSave, setHasSave] = useState(() => loadGame() !== null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastsWaiting, setWaiting] = useState(0);
  const lastLogId = useRef(0);
  const toastId = useRef(1);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // Varslene står i kø i stedet for å skyve hverandre bort, så de rekker å bli lest også på 10× (B-098)
  const visible = useRef<Toast[]>([]);
  const queue = useRef<Toast[]>([]);
  const pumpRef = useRef<() => void>(() => {});
  const removeToast = useCallback((id: number) => {
    if (!visible.current.some((x) => x.id === id)) return;
    visible.current = visible.current.filter((x) => x.id !== id);
    setToasts(visible.current);
    pumpRef.current();
  }, []);
  const pump = useCallback(() => {
    let changed = false;
    while (visible.current.length < MAX_TOASTS && queue.current.length) {
      const t = queue.current.shift()!;
      visible.current = [...visible.current, t];
      changed = true;
      const ms = (gameRef.current?.settings.toastSeconds ?? 6) * 1000;
      setTimeout(() => removeToast(t.id), queue.current.length ? ms * TOAST_BUSY_SHARE : ms);
    }
    if (changed) setToasts(visible.current);
    setWaiting(queue.current.length);
  }, [removeToast]);
  const clearToasts = useCallback(() => {
    queue.current = [];
    visible.current = [];
    setToasts([]);
    setWaiting(0);
  }, []);
  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  const pushToast = useCallback(
    (text: string, kind: Toast["kind"], fromLog = true) => {
      queue.current.push({ id: toastId.current++, text, kind, fromLog });
      // Blir køen lang, går de eldste ut herfra – de står fortsatt i varsellista bak 🔔
      if (queue.current.length > MAX_QUEUE) queue.current.splice(0, queue.current.length - MAX_QUEUE);
      pump();
    },
    [pump],
  );

  const begin = useCallback((g: GameState) => {
    gameRef.current = g;
    lastLogId.current = g.log.length ? g.log[g.log.length - 1].id : 0;
    setGame(g);
    saveGame(g);
    setHasSave(true);
  }, []);

  const startNew = useCallback(
    (guided: boolean) => {
      const g = newGame();
      if (guided) {
        g.tutorial = 0;
        g.speed = 0;
      }
      begin(g);
    },
    [begin],
  );
  const startNextRound = useCallback(() => {
    const round = (gameRef.current?.round ?? 1) + 1;
    begin(newGame(Date.now(), round));
  }, [begin]);
  const continueSaved = useCallback(() => {
    const g = loadGame();
    begin(g ?? newGame());
  }, [begin]);

  const adopt = useCallback(
    (g: GameState) => {
      g.speed = 0;
      begin(g);
    },
    [begin],
  );
  const stash = useCallback((g: GameState) => {
    saveGame(g);
    setHasSave(true);
  }, []);

  const quit = useCallback(() => {
    gameRef.current = null;
    clearSave();
    setHasSave(false);
    setGame(null);
  }, []);

  /** Nye hendelser i loggen vises som varsler; vanlig info bare i loggen. */
  const flushLog = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    for (const entry of g.log) {
      if (entry.id <= lastLogId.current) continue;
      // Spilleren velger under ⚙️ hva som skal dukke opp på skjermen; alt står uansett i varsellista (B-089, B-115)
      if (showToast(g, entry)) pushToast(entry.text, entry.kind);
    }
    if (g.log.length) lastLogId.current = g.log[g.log.length - 1].id;
  }, [pushToast]);

  const act = useCallback(
    <T>(fn: (g: GameState) => T): T => {
      const g = gameRef.current;
      if (!g) throw new Error("ingen spill");
      const result = fn(g);
      advanceTutorial(g);
      advanceRecipeGuide(g);
      const r = result as unknown as PurchaseResult | undefined;
      if (r && typeof r === "object" && "ok" in r && "message" in r && !r.ok) pushToast(r.message, "bad", false);
      flushLog();
      bump();
      return result;
    },
    [bump, flushLog, pushToast],
  );

  const setSpeed = useCallback(
    (speed: number) => {
      const g = gameRef.current;
      if (!g || g.gameOver || speed > maxSpeed(g)) return;
      g.speed = speed;
      bump();
    },
    [bump],
  );

  const dismissToast = removeToast;

  // Spilløkka
  useEffect(() => {
    if (!game) return;
    let last = performance.now();
    let lastSave = last;
    const timer = setInterval(() => {
      const g = gameRef.current;
      if (!g) return;
      const now = performance.now();
      const elapsed = Math.min((now - last) / 1000, MAX_ELAPSED_S);
      last = now;
      const wasRunning = g.speed > 0;
      if (g.speed > 0 && !g.pendingManual && !g.gameOver) {
        // Om natta, når verket står og ingenting skjer, går tida fortere (B-033)
        const boost = idleOutsideHours(g) ? IDLE_NIGHT_SPEED : 1;
        const gameMin = elapsed * g.speed * boost * GAME_MIN_PER_REAL_S;
        advance(g, gameMin);
        // Svarfristen på forespørsler og rammeavtaler går i vanlig tempo (1×) selv om du spoler, så du rekker å
        // svare på 3× og 10× (B-071)
        const factor = g.speed * boost;
        if (factor > 1) {
          const extra = gameMin * (1 - 1 / factor);
          for (const c of g.contracts) if (c.status === "tilbud") c.offerExpiresMin += extra;
          for (const a of g.agreements) if (a.status === "tilbud") a.offerExpiresMin += extra;
        }
        advanceTutorial(g);
        advanceRecipeGuide(g);
        flushLog();
      }
      if (now - lastSave > AUTOSAVE_MS) {
        saveGame(g);
        lastSave = now;
      }
      // Spar batteri: ikke tegn på nytt når spillet står på pause eller ikke vises
      // (men tegn når spillet nettopp stoppet, f.eks. for et hendelseskort)
      if (wasRunning && document.visibilityState !== "hidden") bump();
    }, TICK_MS);

    const saveNow = () => {
      if (gameRef.current) saveGame(gameRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    window.addEventListener("pagehide", saveNow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", saveNow);
      document.removeEventListener("visibilitychange", onVisibility);
      saveNow();
    };
  }, [game, bump, flushLog]);

  return {
    game,
    hasSave,
    toasts,
    toastsWaiting,
    clearToasts,
    startNew,
    startNextRound,
    continueSaved,
    act,
    setSpeed,
    dismissToast,
    quit,
    adopt,
    stash,
  };
}
