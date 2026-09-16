import { useCallback, useEffect, useRef, useState } from "react";
import type { FurnaceState } from "../types";

const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ??
  `ws://${window.location.hostname}:8000/ws`;

export type ConnectionStatus = "connecting" | "open" | "closed";

export function useSimSocket() {
  const [state, setState] = useState<FurnaceState | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      if (cancelled) return;
      setStatus("connecting");
      socket = new WebSocket(WS_URL);
      wsRef.current = socket;

      socket.onopen = () => setStatus("open");
      socket.onclose = () => {
        setStatus("closed");
        if (!cancelled) retryTimer = setTimeout(connect, 1500);
      };
      socket.onerror = () => socket.close();
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "state") setState(msg as FurnaceState);
        } catch {
          // ignore malformed frame
        }
      };
    };

    connect();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback(
    (type: "command" | "instructor", action: string, payload: Record<string, unknown>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type, action, payload }));
      }
    },
    [],
  );

  const sendCommand = useCallback(
    (action: string, payload: Record<string, unknown> = {}) => send("command", action, payload),
    [send],
  );

  const sendInstructor = useCallback(
    (action: string, payload: Record<string, unknown> = {}) => send("instructor", action, payload),
    [send],
  );

  return { state, status, sendCommand, sendInstructor };
}
