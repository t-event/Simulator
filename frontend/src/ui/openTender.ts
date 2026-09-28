import { useEffect, useState, useSyncExternalStore } from "react";
import { fetchWorldStatus } from "../net/world";
import { getSession, onSessionChange } from "../net/supabase";

export type OpenTender = { closesAt: string };

// Kortet «Skraplageret» sier fra når et bud er lagt inn eller trukket, så merket i menyen følger med med én gang
const listeners = new Set<() => void>();
export function tenderChanged() {
  for (const l of listeners) l();
}

/**
 * Åpent anbud på skraplageret som spilleren ikke har bydd på (B-226): gir «!» på Konsern i menyen, merke på underfanen
 * og en beskjed på Oversikt, så anbudet ikke ligger skjult. Hentes fra serveren bare med konto og åpnet konsern.
 */
export function useOpenTender(enabled: boolean): OpenTender | null {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const [open, setOpen] = useState<OpenTender | null>(null);
  useEffect(() => {
    if (!session || !enabled) return;
    let alive = true;
    const load = () =>
      fetchWorldStatus().then(
        (w) => {
          const t = w.companies
            .map((c) => c.tender)
            .find((x) => x && x.myBid === null && Date.parse(x.closesAt) > Date.now());
          if (alive) setOpen(t ? { closesAt: t.closesAt } : null);
        },
        () => {},
      );
    void load();
    const timer = setInterval(() => void load(), 60_000);
    listeners.add(load);
    return () => {
      alive = false;
      clearInterval(timer);
      listeners.delete(load);
    };
  }, [session, enabled]);
  return session && enabled ? open : null;
}
