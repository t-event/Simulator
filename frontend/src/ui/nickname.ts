/**
 * Brukernavnet fra skjemaet til kontoen er bekreftet (B-214), og beskjeden når det er satt (B-463). Ligger i
 * localStorage, så det tåler at appen lukkes. Brukes av kontokortet og arket «Velg brukernavn».
 */
const PENDING_NICK_KEY = "stalverk-nytt-brukernavn-v1";

export function pendingNick(): string | null {
  try {
    return localStorage.getItem(PENDING_NICK_KEY);
  } catch {
    return null;
  }
}

export function setPendingNick(n: string | null): void {
  try {
    if (n) localStorage.setItem(PENDING_NICK_KEY, n);
    else localStorage.removeItem(PENDING_NICK_KEY);
  } catch {
    // Privat modus: brukernavnet velges i arket «Velg brukernavn» etterpå
  }
}

/**
 * Gis når brukernavnet er satt (detail: kontoen og navnet), så kontokortet og arket viser det med én gang. Gjelder bare
 * kontoen i `uid` (B-472): et sent svar for en annen konto skal ikke lukke arket eller vise navnet
 */
export const NICKNAME_EVENT = "stalverk-brukernavn";
export interface NicknameSet {
  uid: string;
  nick: string;
}
export function announceNickname(uid: string, nick: string): void {
  window.dispatchEvent(new CustomEvent<NicknameSet>(NICKNAME_EVENT, { detail: { uid, nick } }));
}
/** Navnet fra hendelsen, bare når den gjelder kontoen `uid` */
export function nicknameFrom(e: Event, uid: string | null): string | null {
  const d = (e as CustomEvent<NicknameSet>).detail;
  return d && typeof d.nick === "string" && !!uid && d.uid === uid ? d.nick : null;
}
