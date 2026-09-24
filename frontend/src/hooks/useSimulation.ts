import { useCallback, useEffect, useRef, useState } from "react";
import { EAFSimulation } from "../sim/eaf";
import { applyInstructorCommand, applyOperatorCommand } from "../sim/commands";
import { serializeState } from "../sim/serialize";
import { DEFAULT_TICK_HZ } from "../sim/constants";
import { readSessionConfig, type SessionConfig } from "../session";
import type { FurnaceState } from "../types";

export type ConnectionStatus = "lokal" | "connecting" | "open" | "closed" | "erstattet" | "feil";

const TICK_MS = 1000 / DEFAULT_TICK_HZ;
// Fanen kan bli strupet i bakgrunnen; da vil vi heller hoppe over tid enn å
// simulere et enormt sprang på ett steg
const MAX_ELAPSED_S = 2;
// Prosessmodellen er kalibrert med steg på 1 s. Ved høy tidsskalering deles
// hvert tick opp, så modellen oppfører seg likt uansett hastighet.
const MAX_SUBSTEP_S = 1;
// Relayen lukker med denne koden når en annen vert tar over rommet
const HOST_CLOSED_BY_TAKEOVER = 4000;

interface SimulationApi {
  state: FurnaceState | null;
  status: ConnectionStatus;
  statusDetail: string | null;
  session: SessionConfig;
  sendCommand: (action: string, payload?: Record<string, unknown>) => void;
  sendInstructor: (action: string, payload?: Record<string, unknown>) => void;
}

function missingRelayMessage(): string {
  return (
    "Flermaskin-modus trenger en relay. GitHub Pages kan ikke brukes til det – " +
    "start relayen på lokalnettet og åpn adressen den skriver ut."
  );
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
  const needsRelay = session.mode !== "lokal";
  const [status, setStatus] = useState<ConnectionStatus>(() => {
    if (!needsRelay) return "lokal";
    return session.relayUrl ? "connecting" : "feil";
  });
  const [statusDetail, setStatusDetail] = useState<string | null>(() =>
    needsRelay && !session.relayUrl ? missingRelayMessage() : null,
  );
  const wsRef = useRef<WebSocket | null>(null);

  // --- tilkobling til relay (vert og deltaker) ----------------------------
  useEffect(() => {
    if (!needsRelay || !session.relayUrl) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    const url = new URL(session.relayUrl);
    url.searchParams.set("rom", session.room);
    url.searchParams.set("rolle", session.mode === "vert" ? "vert" : "deltaker");

    const connect = () => {
      if (cancelled) return;
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch {
        // Typisk en https-side som prøver å åpne ws:// – nettleseren nekter det
        setStatus("feil");
        setStatusDetail(
          `Nettleseren nekter forbindelsen til ${session.relayUrl}. En side lastet over ` +
            "https kan ikke koble til en ukryptert relay – åpn appen fra relayens egen adresse.",
        );
        return;
      }
      wsRef.current = socket;
      setStatus("connecting");

      socket.onopen = () => {
        setStatus("open");
        setStatusDetail(null);
      };
      socket.onclose = (event) => {
        if (event.code === HOST_CLOSED_BY_TAKEOVER) {
          setStatus("erstattet");
          setStatusDetail("En annen vert har tatt over rommet. Denne ovnen deles ikke lenger.");
          return;
        }
        setStatus("closed");
        setStatusDetail(`Får ikke kontakt med relayen på ${url.host}. Prøver igjen…`);
        if (!cancelled) retryTimer = setTimeout(connect, 1500);
      };
      socket.onerror = () => socket.close();
      socket.onmessage = (event) => {
        let msg: {
          type?: string;
          action?: string;
          payload?: Record<string, unknown>;
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
  }, [sim, needsRelay, session.mode, session.relayUrl, session.room]);

  // --- simuleringsløkke ---------------------------------------------------
  useEffect(() => {
    if (!sim) return;

    let last = performance.now();

    const timer = setInterval(() => {
      const now = performance.now();
      const elapsedS = Math.min((now - last) / 1000, MAX_ELAPSED_S);
      last = now;

      const dtS = elapsedS * sim.state.timeScale;
      if (dtS > 0) {
        const substeps = Math.ceil(dtS / MAX_SUBSTEP_S);
        for (let i = 0; i < substeps; i++) sim.step(dtS / substeps);
      }

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

  return { state, status, statusDetail, session, sendCommand, sendInstructor };
}
