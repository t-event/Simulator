/**
 * Bare én fane spiller om gangen (B-176). To faner med samme spill går ikke dobbelt så fort – hver fane har sitt eget
 * spill i minnet – men de overskriver hverandres lagring, både her og på nett. Når spillet åpnes i en ny fane, lagrer
 * den gamle fanen og stopper; den viser da «Spillet er åpent i en annen fane» med knappen «Spill her».
 *
 * Fanene snakker sammen gjennom `storage`-hendelsen (virker i alle nettlesere): en fane som tar over, skriver sin id
 * under nøkkelen, og de andre fanene får beskjed.
 */
const KEY = "stalverk-fane";
const tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);

let elsewhere = false;
const listeners = new Set<() => void>();
let beforeRelease: (() => void) | null = null;

function notify(): void {
  for (const fn of listeners) fn();
}

/** Om spillet spilles i en annen fane nå (da skal denne fanen verken spille eller lagre) */
export function isElsewhere(): boolean {
  return elsewhere;
}

export function onTabChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Kalles rett før fanen gir fra seg spillet, så det siste blir lagret */
export function setBeforeRelease(fn: (() => void) | null): void {
  beforeRelease = fn;
}

/** Denne fanen spiller: de andre fanene lagrer og stopper */
export function claimTab(): void {
  elsewhere = false;
  try {
    localStorage.setItem(KEY, JSON.stringify({ id: tabId, t: Date.now() }));
  } catch {
    // Uten lagring i nettleseren kan fanene ikke snakke sammen; spillet virker likevel
  }
  notify();
}

/** Tar spillet tilbake til denne fanen og laster siden på nytt, så spillet hentes fra lagringen */
export function playHere(): void {
  claimTab();
  location.reload();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const v = JSON.parse(e.newValue) as { id?: string };
      if (!v.id || v.id === tabId || elsewhere) return;
    } catch {
      return;
    }
    beforeRelease?.();
    elsewhere = true;
    notify();
  });
}
