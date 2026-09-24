import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_MIN_PER_REAL_S } from "./data";
import { advance, newGame, type PurchaseResult } from "./engine";
import { clearSave, loadGame, saveGame } from "./save";
import type { GameState, LogEntry } from "./types";

const TICK_MS = 200;
// En strupet bakgrunnsfane skal ikke hoppe over flere spilltimer på ett tick
const MAX_ELAPSED_S = 1;
const AUTOSAVE_MS = 5000;
const TOAST_MS = 5000;

export interface Toast {
  id: number;
  text: string;
  kind: LogEntry["kind"];
}

export interface GameApi {
  game: GameState | null;
  hasSave: boolean;
  toasts: Toast[];
  startNew: () => void;
  continueSaved: () => void;
  /** Kjører en handling på spillet og tegner på nytt. Resultatmeldinger vises som varsel. */
  act: <T>(fn: (g: GameState) => T) => T;
  setSpeed: (speed: number) => void;
  dismissToast: (id: number) => void;
  quit: () => void;
}

export function useGame(): GameApi {
  const gameRef = useRef<GameState | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [, setVersion] = useState(0);
  const [hasSave, setHasSave] = useState(() => loadGame() !== null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastLogId = useRef(0);
  const toastId = useRef(1);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const pushToast = useCallback((text: string, kind: Toast["kind"]) => {
    const id = toastId.current++;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), TOAST_MS);
  }, []);

  const begin = useCallback((g: GameState) => {
    gameRef.current = g;
    lastLogId.current = g.log.length ? g.log[g.log.length - 1].id : 0;
    setGame(g);
    saveGame(g);
    setHasSave(true);
  }, []);

  const startNew = useCallback(() => begin(newGame()), [begin]);
  const continueSaved = useCallback(() => {
    const g = loadGame();
    begin(g ?? newGame());
  }, [begin]);

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
      if (entry.kind !== "info") pushToast(entry.text, entry.kind);
    }
    if (g.log.length) lastLogId.current = g.log[g.log.length - 1].id;
  }, [pushToast]);

  const act = useCallback(
    <T>(fn: (g: GameState) => T): T => {
      const g = gameRef.current;
      if (!g) throw new Error("ingen spill");
      const result = fn(g);
      const r = result as unknown as PurchaseResult | undefined;
      if (r && typeof r === "object" && "ok" in r && "message" in r && !r.ok) pushToast(r.message, "bad");
      flushLog();
      bump();
      return result;
    },
    [bump, flushLog, pushToast],
  );

  const setSpeed = useCallback(
    (speed: number) => {
      const g = gameRef.current;
      if (!g || g.gameOver) return;
      g.speed = speed;
      bump();
    },
    [bump],
  );

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

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
      if (g.speed > 0 && !g.pendingManual && !g.gameOver) {
        advance(g, elapsed * g.speed * GAME_MIN_PER_REAL_S);
        flushLog();
      }
      if (now - lastSave > AUTOSAVE_MS) {
        saveGame(g);
        lastSave = now;
      }
      bump();
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

  return { game, hasSave, toasts, startNew, continueSaved, act, setSpeed, dismissToast, quit };
}
