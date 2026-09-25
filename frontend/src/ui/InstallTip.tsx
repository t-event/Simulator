import { useEffect, useState } from "react";

/**
 * Legg til på hjemskjermen (B-071): da åpner spillet i fullskjerm uten nettleserlinjer.
 * Android/Chrome gir en «installer»-hendelse vi kan bruke til en knapp; iPhone/Safari har ingen slik. Oppskriften for
 * både iPhone og Android vises alltid, med den som passer telefonen først (B-136).
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Hendelsen kommer ofte før React har tegnet noe, så den fanges opp med en gang modulen lastes
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((fn) => fn());
  });
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone === true;
}

function platform(): "ios" | "android" | "annet" {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "annet";
}

export function InstallTip() {
  const [, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => void listeners.delete(fn);
  }, []);
  if (isStandalone()) return null;
  const os = platform();

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    setTick((n) => n + 1);
  };

  // Begge oppskriftene vises alltid (så man kan hjelpe andre), med den som passer denne telefonen først (B-136)
  const ios = (
    <li key="ios">
      <strong>iPhone og iPad (Safari):</strong> trykk Del-knappen (firkanten med pil opp) nederst eller øverst, bla ned
      og velg «Legg til på Hjem-skjerm». Trykk «Legg til».
    </li>
  );
  const android = (
    <li key="android">
      <strong>Android (Chrome):</strong> trykk menyen ⋮ øverst til høyre og velg «Installer app» eller «Legg til på
      startskjermen». Trykk «Installer» eller «Legg til».
      <br />
      <strong>Samsung Internet:</strong> trykk menyen ☰ nederst, velg «Legg til side på» og så «Startskjerm».
      <br />
      <strong>Firefox:</strong> trykk menyen ⋮ og velg «Installer» eller «Legg til på startskjermen».
    </li>
  );
  const steps = os === "android" ? [android, ios] : [ios, android];

  return (
    <div className="g-install">
      <p>
        <strong>📱 Spill i fullskjerm:</strong> legg spillet til på hjemskjermen, så åpner det som en app uten
        nettleserlinjer – og virker uten nett.
      </p>
      {deferred && (
        <button className="g-primary g-small" onClick={install}>
          Legg til på hjemskjermen
        </button>
      )}
      <details className="g-role-group" open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
        <summary>{deferred ? "Eller gjør det selv" : "Slik gjør du det"}</summary>
        <ul className="g-closed">
          {steps}
          <li>Start spillet fra ikonet på hjemskjermen etterpå.</li>
          <li>Logg inn i appen på hjemskjermen, så hentes spillet ditt fra nettet.</li>
        </ul>
      </details>
    </div>
  );
}
