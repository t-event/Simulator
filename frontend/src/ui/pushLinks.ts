/** Varsel på mobilen (B-465): trykk på et varsel åpner riktig sted i spillet */
import { useEffect, useRef } from "react";
import { parsePushLink, takeLaunchLink, type PushLink } from "../net/push";

/**
 * Lenker fra varsler: når appen åpnes fra et varsel (`?varsel=`), eller får beskjed fra service workeren mens den er
 * åpen. Venter til spillet er lastet (`ready`), så lenken ikke går tapt på startskjermen: beskjeden lyttes etter hele
 * tida og huskes til spillet er åpnet med «Fortsett» (B-472).
 */
export function usePushLinks(onLink: (link: PushLink) => void, ready: boolean): void {
  // Siste versjon av handlingen (den bruker navigasjonen slik den er nå)
  const handler = useRef(onLink);
  const readyRef = useRef(ready);
  const pending = useRef<PushLink | null>(null);
  useEffect(() => {
    handler.current = onLink;
    readyRef.current = ready;
  });
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; link?: string } | null;
      if (d?.type !== "stalverk-varsel") return;
      const link = parsePushLink(d.link);
      if (!link) return;
      if (readyRef.current) handler.current(link);
      else pending.current = link;
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const first = takeLaunchLink() ?? pending.current;
    pending.current = null;
    if (first) handler.current(first);
  }, [ready]);
}
