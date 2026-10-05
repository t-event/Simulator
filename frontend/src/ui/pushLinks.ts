/** Varsel på mobilen (B-465): trykk på et varsel åpner riktig sted i spillet */
import { useEffect, useRef } from "react";
import { parsePushLink, takeLaunchLink, type PushLink } from "../net/push";

/**
 * Lenker fra varsler: når appen åpnes fra et varsel (`?varsel=`), eller får beskjed fra service workeren mens den er
 * åpen. Venter til spillet er lastet (`ready`), så lenken fra adressen ikke går tapt på startskjermen.
 */
export function usePushLinks(onLink: (link: PushLink) => void, ready: boolean): void {
  // Siste versjon av handlingen (den bruker navigasjonen slik den er nå)
  const handler = useRef(onLink);
  useEffect(() => {
    handler.current = onLink;
  });
  useEffect(() => {
    if (!ready) return;
    const first = takeLaunchLink();
    if (first) handler.current(first);
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; link?: string } | null;
      if (d?.type !== "stalverk-varsel") return;
      const link = parsePushLink(d.link);
      if (link) handler.current(link);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [ready]);
}
