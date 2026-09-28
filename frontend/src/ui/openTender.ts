import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fetchWorldStatus, type Company } from "../net/world";
import { getSession, onSessionChange } from "../net/supabase";

/** Et åpent anbud spilleren ikke har bydd på: når det stenger, og hvilket selskap det gjelder (B-253) */
export type OpenTender = { closesAt: string; name: string; type: Company["type"] };

// Selskapskortene sier fra når et bud er lagt inn eller trukket, så merket i menyen følger med med én gang
const listeners = new Set<() => void>();
export function tenderChanged() {
  for (const l of listeners) l();
}

/**
 * Åpent anbud på et selskap (skraplageret, slagghåndteringen) som spilleren ikke har bydd på (B-226, B-253): gir «!» på Konsern i menyen, merke på underfanen
 * og en beskjed på Oversikt, så anbudet ikke ligger skjult. Hentes fra serveren bare med konto og åpnet konsern.
 */
export function useOpenTender(
  enabled: boolean,
  /** Siste avgjorte anbud for alle selskapene (B-237, B-253): GameApp gir varsel til den som bydde */
  onResults?: (companies: Company[]) => void,
): OpenTender | null {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const [open, setOpen] = useState<OpenTender | null>(null);
  const resultRef = useRef(onResults);
  useEffect(() => {
    resultRef.current = onResults;
  });
  useEffect(() => {
    if (!session || !enabled) return;
    let alive = true;
    const load = () =>
      fetchWorldStatus().then(
        (w) => {
          // Det som stenger først, av anbudene spilleren ikke har bydd på
          const c = w.companies
            .filter((x) => x.tender && x.tender.myBid === null && Date.parse(x.tender.closesAt) > Date.now())
            .sort((a, b) => Date.parse(a.tender!.closesAt) - Date.parse(b.tender!.closesAt))[0];
          if (!alive) return;
          setOpen(c?.tender ? { closesAt: c.tender.closesAt, name: c.name, type: c.type } : null);
          resultRef.current?.(w.companies);
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
