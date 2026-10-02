/**
 * Hvilken profil som er åpen (B-419). Navn kan trykkes på mange steder (topplista, kartet, Industrien, chatten,
 * ukelista); alle åpner samme ark, som står i GameApp (`ProfileHost`).
 */
let open: string | null = null;
let edit = false;
const listeners = new Set<() => void>();

/** `startEdit`: åpne rett i redigeringen (fra «Min profil» under innstillinger) */
export function openProfile(nick: string, startEdit = false): void {
  open = nick;
  edit = startEdit;
  for (const l of listeners) l();
}

export function closeProfile(): void {
  open = null;
  for (const l of listeners) l();
}

export function openProfileNick(): string | null {
  return open;
}

/** Skal arket starte i redigeringen? Leses én gang når arket åpnes */
export function profileStartsInEdit(): boolean {
  return edit;
}

export function onProfileChange(l: () => void): () => void {
  listeners.add(l);
  return () => void listeners.delete(l);
}
