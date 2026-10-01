import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { fetchWorldStatus, type Company, type WorldStatus } from "../net/world";
import { getSession, onSessionChange } from "../net/supabase";
import { realNow } from "../game/clock";

/** Et åpent anbud spilleren ikke har bydd på: når det stenger, og hvilket selskap det gjelder (B-253) */
export type OpenTender = {
  closesAt: string;
  name: string;
  type: Company["type"];
  /** Noen prøver å overta et selskap du eier (B-335): angriperens kallenavn. Går foran anbudene */
  attacker?: string;
};

// Selskapskortene sier fra når et bud er lagt inn eller trukket, så merket i menyen følger med med én gang
const listeners = new Set<() => void>();

// Siste verdensstatus fra serveren (B-322): Konsern → Oversikt viser konsernverdien fra den, som topplista
let lastWorld: WorldStatus | null = null;
const worldListeners = new Set<() => void>();
function subscribeWorld(fn: () => void) {
  worldListeners.add(fn);
  return () => void worldListeners.delete(fn);
}
/** Den siste verdensstatusen som er hentet (hentes av GameApp hvert minutt med konto og åpnet konsern), eller null */
export function useLastWorld(): WorldStatus | null {
  return useSyncExternalStore(
    subscribeWorld,
    () => lastWorld,
    () => lastWorld,
  );
}
export function tenderChanged() {
  for (const l of listeners) l();
}

/**
 * Åpent anbud på et selskap (skraplageret, slagghåndteringen) som spilleren ikke har bydd på (B-226, B-253): gir «!» på Konsern i menyen, merke på underfanen
 * og en beskjed på Oversikt, så anbudet ikke ligger skjult. Hentes fra serveren bare med konto og åpnet konsern.
 */
export function useOpenTender(
  enabled: boolean,
  /** Hele verdensstatusen: avgjorte anbud (B-237, B-253) og utbyttet fra datterverkene (B-304); GameApp gir varsel */
  onResults?: (world: WorldStatus) => void,
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
            .filter((x) => x.tender && x.tender.myBid === null && Date.parse(x.tender.closesAt) > realNow())
            .sort((a, b) => Date.parse(a.tender!.closesAt) - Date.parse(b.tender!.closesAt))[0];
          // Et forsøk på å overta et selskap du eier, går foran (B-335)
          const hit = w.companies.find((x) => x.mine && x.takeover && !x.takeover.mineAttack);
          if (!alive) return;
          lastWorld = w;
          for (const l of worldListeners) l();
          setOpen(
            hit?.takeover
              ? { closesAt: hit.takeover.closesAt, name: hit.name, type: hit.type, attacker: hit.takeover.attacker }
              : c?.tender
                ? { closesAt: c.tender.closesAt, name: c.name, type: c.type }
                : null,
          );
          resultRef.current?.(w);
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
