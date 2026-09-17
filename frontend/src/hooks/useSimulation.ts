import { useCallback, useEffect, useRef, useState } from "react";
import { EAFSimulation } from "../sim/eaf";
import { applyInstructorCommand, applyOperatorCommand } from "../sim/commands";
import { serializeState } from "../sim/serialize";
import { DEFAULT_TICK_HZ } from "../sim/constants";
import { readSessionConfig, type SessionConfig } from "../session";
import type { FurnaceState } from "../types";

export type ConnectionStatus = "lokal" | "connecting" | "open" | "closed";

const TICK_MS = 1000 / DEFAULT_TICK_HZ;
// Fanen kan bli strupet i bakgrunnen; da vil vi heller hoppe over tid enn å
// simulere et enormt sprang på ett steg
const MAX_STEP_S = 2;

interface SimulationApi {
  state: FurnaceState | null;
  status: ConnectionStatus;
  session: SessionConfig;
  sendCommand: (action: string, payload?: Record<string, unknown>) => void;
  sendInstructor: (action: string, payload?: Record<string, unknown>) => void;
}

export function useSimulation(): SimulationApi {
  const [session] = useState<SessionConfig>(() => readSessionConfig());

  // Simuleringen kjøres her i lokal- og vertsmodus. Deltakeren har ingen egen
  // ovn – den får tilstanden fra verten.
  const [sim] = useState<EAFSimulation | null>(() =>
    session.mode === "deltaker" ? null : new EAFSimulation(),
  );
  const [state, setState] = useState<FurnaceState | null>(() =>
    sim ? serializeState(sim) : null,
  );
  const [status, setStatus] = useState<ConnectionStatus>(
    session.mode === "deltaker" ? "connecting" : "lokal",
  );
  const wsRef = useRef<WebSocket | null>(null);

  // --- tilkobling til relay (vert og deltaker) ----------------------------
  useEffect(() => {
    if (session.mode === "lokal" || !session.relayUrl) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (cancelled) return;
      setStatus("connecting");
      const url = `${session.relayUrl}?rom=${encodeURIComponent(session.room)}&rolle=${
        session.mode === "vert" ? "vert" : "deltaker"
      }`;
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => setStatus("open");
      socket.onclose = () => {
        setStatus("closed");
        if (!cancelled) retryTimer = setTimeout(connect, 1500);
      };
      socket.onerror = () => socket.close();
      socket.onmessage = (event) => {
        let msg: { type?: string; action?: string; payload?: Record<string, unknown> } & {
          state?: FurnaceState;
        };
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (session.mode === "deltaker") {
          // Deltakeren viser bare det verten sender
          if (msg.type === "state" && msg.state) setState(msg.state);
          return;
        }
        // Verten tar imot kommandoer fra de andre maskinene
        if (!sim || !msg.action) return;
        if (msg.type === "command") applyOperatorCommand(sim, msg.action, msg.payload ?? {});
        else if (msg.type === "instructor")
          applyInstructorCommand(sim, msg.action, msg.payload ?? {});
      };
    };

    connect();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sim, session.mode, session.relayUrl, session.room]);

  // --- simuleringsløkke ---------------------------------------------------
  useEffect(() => {
    if (!sim) return;

    let last = performance.now();

    const timer = setInterval(() => {
      const now = performance.now();
      const elapsedS = Math.min((now - last) / 1000, MAX_STEP_S);
      last = now;

      const dtS = elapsedS * sim.state.timeScale;
      if (dtS > 0) sim.step(dtS);

      const snapshot = serializeState(sim);
      setState(snapshot);

      if (session.mode === "vert" && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "state", state: snapshot }));
      }
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [sim, session.mode]);

  const dispatch = useCallback(
    (type: "command" | "instructor", action: string, payload: Record<string, unknown>) => {
      if (sim) {
        if (type === "command") applyOperatorCommand(sim, action, payload);
        else applyInstructorCommand(sim, action, payload);
        setState(serializeState(sim));
        return;
      }
      // Deltaker: send til verten via relayen
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type, action, payload }));
      }
    },
    [sim],
  );

  const sendCommand = useCallback(
    (action: string, payload: Record<string, unknown> = {}) => dispatch("command", action, payload),
    [dispatch],
  );

  const sendInstructor = useCallback(
    (action: string, payload: Record<string, unknown> = {}) =>
      dispatch("instructor", action, payload),
    [dispatch],
  );

  return { state, status, session, sendCommand, sendInstructor };
}
