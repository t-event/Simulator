/** Hvordan denne nettleseren deltar i en øvelse.
 *
 * - `lokal`: simuleringen kjører her og deles ikke. Dette er standard, og
 *   det GitHub Pages bruker.
 * - `vert`: simuleringen kjører her, men tilstanden publiseres til relayen
 *   slik at en instruktør på en annen maskin kan følge med og gripe inn.
 * - `deltaker`: ingen simulering her – tilstanden kommer fra verten via
 *   relayen, og kommandoer sendes samme vei.
 */
export type SessionMode = "lokal" | "vert" | "deltaker";

export interface SessionConfig {
  mode: SessionMode;
  relayUrl: string | null;
  room: string;
}

const DEFAULT_ROOM = "stalovn";

/** Relayen serverer også appen, så standard er samme adresse som siden. På
 * GitHub Pages finnes ingen relay, og da må den oppgis eksplisitt. */
function defaultRelayUrl(): string | null {
  const configured = import.meta.env.VITE_RELAY_URL as string | undefined;
  if (configured) return configured;
  if (window.location.hostname.endsWith("github.io")) return null;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/relay`;
}

/** Leser sesjonsoppsettet fra URL-en, f.eks. ?modus=vert&rom=kurs1 */
export function readSessionConfig(): SessionConfig {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("modus");
  const mode: SessionMode = raw === "vert" || raw === "deltaker" ? raw : "lokal";
  return {
    mode,
    relayUrl: params.get("relay") ?? defaultRelayUrl(),
    room: params.get("rom") ?? DEFAULT_ROOM,
  };
}
