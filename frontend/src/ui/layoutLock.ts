/**
 * Låser skallet (mobil eller PC) mens et tellende forsøk i ukens kontrollrom pågår (B-427). Krysset bredden 900 px –
 * f.eks. når et nettbrett snus – ble panelet som eier forsøket, montert på nytt: framdriften forsvant, forsøket kunne
 * telle null, og spillet ble stående på pause. Skallet byttes når låsen slippes.
 */
let locks = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

/** Låser skallet; gir funksjonen som slipper låsen */
export function lockLayout(): () => void {
  locks++;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks = Math.max(0, locks - 1);
    emit();
  };
}

export function layoutLocked(): boolean {
  return locks > 0;
}

export function onLayoutLock(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
