/**
 * Hvilken profil som er åpen (B-419). Navn kan trykkes på mange steder (topplista, kartet, Industrien, chatten,
 * ukelista); alle åpner samme ark, som står i GameApp (`ProfileHost`).
 */
let open: string | null = null;
const listeners = new Set<() => void>();

export function openProfile(nick: string): void {
  open = nick;
  for (const l of listeners) l();
}

export function closeProfile(): void {
  open = null;
  for (const l of listeners) l();
}

export function openProfileNick(): string | null {
  return open;
}

export function onProfileChange(l: () => void): () => void {
  listeners.add(l);
  return () => void listeners.delete(l);
}
