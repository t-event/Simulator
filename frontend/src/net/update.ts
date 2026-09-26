/**
 * Automatisk oppdatering (B-148): appen spør etter version.json (laget av bygget, se vite.config.ts) og sammenligner
 * med id-en den selv ble bygget med. Er den forskjellig, er en ny versjon publisert, og appen laster seg inn på nytt.
 */
export const BUILD_ID = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev";

/** Hvor ofte appen ser etter en ny versjon mens den er åpen */
export const UPDATE_CHECK_MS = 5 * 60_000;

/** Id-en til en annen versjon enn denne hvis den er publisert, ellers null (også uten nett og i utvikling) */
export async function newVersionAvailable(base: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  if (BUILD_ID === "dev") return null;
  try {
    // Unik adresse og no-store, så verken nettleseren eller service workeren svarer med en gammel kopi
    const res = await fetchImpl(`${base}version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const v = (await res.json()) as { id?: unknown };
    return typeof v.id === "string" && v.id !== BUILD_ID ? v.id : null;
  } catch {
    return null;
  }
}

const TRIED_KEY = "stalverk-oppdatert-v1";
/** GitHub Pages lar nettleseren bruke en lagret side i opptil 10 minutter */
const RETRY_MS = 10 * 60_000;

/**
 * Skal appen laste seg inn på nytt for å få versjonen `target`? Nei hvis den nettopp prøvde for samme versjon (da
 * kom den gamle siden tilbake fra et mellomlager) – ellers kunne den lastet inn på nytt om og om igjen.
 */
export function shouldReloadFor(target: string, now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(TRIED_KEY);
    const tried = raw ? (JSON.parse(raw) as { id: string; at: number }) : null;
    if (tried && tried.id === target && now - tried.at < RETRY_MS) return false;
    localStorage.setItem(TRIED_KEY, JSON.stringify({ id: target, at: now }));
  } catch {
    // Uten lagring prøver vi likevel én gang per side
  }
  return true;
}
