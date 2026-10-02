/**
 * Privatmeldinger (B-421): hvem arket skal åpne en samtale med (fra «Send melding» på en profil), og hvor mange uleste
 * meldinger som venter (prikken på chatknappen). Arket selv er Skiftrapporten med fanen «Meldinger».
 */
let pending: { nick: string | null } | null = null;
let ver = 0;
let unread = 0;
const listeners = new Set<() => void>();

const emit = () => {
  for (const l of listeners) l();
};

/** Åpne meldingene, med samtalen med `nick` (eller lista når den er null) */
export function openMessages(nick: string | null = null): void {
  pending = { nick };
  ver++;
  emit();
}

/** Øker for hver forespørsel – GameApp åpner arket når den endrer seg */
export function messagesRequestVer(): number {
  return ver;
}

/** Forespørselen som venter, én gang (arket velger fanen og samtalen) */
export function takeMessagesRequest(): { nick: string | null } | null {
  const p = pending;
  pending = null;
  return p;
}

export function dmUnread(): number {
  return unread;
}

export function setDmUnread(n: number): void {
  if (n === unread) return;
  unread = n;
  emit();
}

export function onMessagesChange(l: () => void): () => void {
  listeners.add(l);
  return () => void listeners.delete(l);
}
