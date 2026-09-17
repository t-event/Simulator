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

function defaultRelayUrl(): string | null {
  const configured = import.meta.env.VITE_RELAY_URL as string | undefined;
  if (configured) return configured;
  // Under lokal utvikling ligger relayen typisk på samme maskin
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "ws://localhost:8080";
  }
  return null;
}

/** Leser sesjonsoppsettet fra URL-en, f.eks. ?modus=vert&rom=kurs1 */
export function readSessionConfig(): SessionConfig {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("modus");
  const mode: SessionMode = raw === "vert" || raw === "deltaker" ? raw : "lokal";
  const relayParam = params.get("relay");
  return {
    mode,
    relayUrl: relayParam ?? defaultRelayUrl(),
    room: params.get("rom") ?? DEFAULT_ROOM,
  };
}

export function sessionUrl(mode: SessionMode, room: string, relayUrl: string | null): string {
  const url = new URL(window.location.href);
  url.searchParams.set("modus", mode);
  url.searchParams.set("rom", room);
  if (relayUrl) url.searchParams.set("relay", relayUrl);
  return url.toString();
}
