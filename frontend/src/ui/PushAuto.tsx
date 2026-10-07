/**
 * Varsler på for alle (B-467, eieren 5.10: «Skru på varsler for alle. Godtar ikke de varslinger er det ok»). Telefonen
 * må alltid spørre selv, og iPhone spør bare rett etter et trykk. Derfor: første trykk i spillet etter innlogging slår
 * på varsler med alle temaene (telefonen spør), én gang per konto og enhet. Har enheten alt gitt lov, skjer det uten
 * spørsmål. Den som har sagt nei eller slått av under Innstillinger, spørres ikke igjen.
 */
import { useEffect, useSyncExternalStore } from "react";
import { enablePush, markPushAutoDone, PUSH_KINDS, pushAutoWanted, pushPermission, pushState } from "../net/push";
import { getSession, onSessionChange, userId } from "../net/supabase";

export function PushAuto() {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const uid = session?.user.id ?? null;

  useEffect(() => {
    if (!uid || !pushAutoWanted(uid)) return;
    let alive = true;
    let stop = () => {};
    const all = PUSH_KINDS.map((k) => k.id);
    const waitForTap = () => {
      const onTap = () => {
        stop();
        if (userId() !== uid) return;
        // Ferdig når telefonen har svart (ja eller nei). Feiler nettet, prøves det igjen neste gang spillet åpnes – da
        // uten å spørre, siden lov alt er gitt (B-472)
        void enablePush(all).then(
          (r) => {
            if (r.ok || r.reason === "nektet" || r.reason === "støttes ikke") markPushAutoDone(uid);
          },
          () => undefined,
        );
      };
      document.addEventListener("click", onTap, { capture: true });
      stop = () => document.removeEventListener("click", onTap, { capture: true });
    };
    pushState().then(
      async (s) => {
        if (!alive || userId() !== uid) return;
        if (s.active) return markPushAutoDone(uid);
        if (pushPermission() === "granted") {
          // Lov er alt gitt på enheten: slå på uten å spørre, og bare vent på et trykk hvis det likevel ikke gikk
          const r = await enablePush(all).catch(() => null);
          if (!alive || userId() !== uid) return;
          if (r?.ok) return markPushAutoDone(uid);
        }
        waitForTap();
      },
      () => undefined,
    );
    return () => {
      alive = false;
      stop();
    };
  }, [uid]);

  return null;
}
