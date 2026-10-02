/**
 * Privatmeldinger (B-421): hvem arket skal åpne en samtale med (fra «Send melding» på en profil), og hvor mange uleste
 * meldinger som venter (prikken på chatknappen). Arket selv er Skiftrapporten med fanen «Meldinger».
 */
let pending: { nick: string | null } | null = null;
let ver = 0;
let unread = 0;
/** Svar på rapporter (B-438): uleste fra admin til meg, og for eieren nye rapporter og svar */
let reports = { mine: 0, admin: 0 };
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

export function reportUnread(): { mine: number; admin: number } {
  return reports;
}

export function setReportUnread(r: { mine: number; admin: number }): void {
  if (r.mine === reports.mine && r.admin === reports.admin) return;
  reports = { mine: r.mine, admin: r.admin };
  emit();
}

/** Prikken og tallet på «Meldinger»: privatmeldinger og svar fra admin (og for eieren det som venter i adminpanelet) */
export function messagesBadge(): number {
  return unread + reports.mine + reports.admin;
}

export function onMessagesChange(l: () => void): () => void {
  listeners.add(l);
  return () => void listeners.delete(l);
}
