/**
 * Brukernavn er påkrevd for alle kontoer (B-463, eieren 5.10: «Man må ha brukernavn, om man har laget seg konto»).
 * Navnet velges i skjemaet når kontoen lages (B-214), men kunne bli borte: tatt av en annen mens spilleren ventet på
 * e-posten, eller ikke husket i privat modus. Da sto kontoen uten navn. Nå legger dette arket seg over spillet til et
 * navn er valgt – det kan ikke lukkes, bare logges ut fra.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { fetchProfile, nicknameAvailable, nicknameProblem, setNickname } from "../net/leaderboard";
import { getSession, onSessionChange, signOut, userId } from "../net/supabase";
import { flush, resetCloud } from "../net/sync";
import { announceNickname, NICKNAME_EVENT, nicknameFrom, pendingNick, setPendingNick } from "./nickname";
import { Button } from "./ds";
import { Icon } from "./icons";
import { Portal } from "./Portal";

export function NicknameGate() {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const uid = session?.user.id ?? null;
  // Kontoen som mangler navn (null = vet ikke ennå, eller den har navn); gjelder bare samme konto
  const [missingFor, setMissingFor] = useState<string | null>(null);
  const missing = !!uid && missingFor === uid;
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    void (async () => {
      const p = await fetchProfile().catch(() => undefined);
      if (!alive || p === undefined || userId() !== uid) return;
      if (!p || p.nickname) return;
      // Navnet fra skjemaet prøves først i det stille; arket vises bare når det ikke gikk
      const pending = pendingNick();
      if (pending) {
        try {
          const n = await setNickname(uid, pending);
          setPendingNick(null);
          announceNickname(uid, n);
          return;
        } catch {
          if (!alive || userId() !== uid) return;
          setPendingNick(null);
          setDraft(pending);
          setError(`«${pending}» ble tatt av en annen i mellomtiden. Velg et annet.`);
        }
      }
      if (alive && userId() === uid) setMissingFor(uid);
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  // Navnet kan også settes fra kontokortet – bare et navn for kontoen som mangler det, lukker arket (B-472)
  useEffect(() => {
    const done = (e: Event) => setMissingFor((m) => (nicknameFrom(e, m) ? null : m));
    window.addEventListener(NICKNAME_EVENT, done);
    return () => window.removeEventListener(NICKNAME_EVENT, done);
  }, []);

  if (!missing) return null;

  const save = async () => {
    const name = draft.trim();
    const problem = nicknameProblem(name);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!(await nicknameAvailable(name))) throw new Error("Brukernavnet er tatt. Velg et annet.");
      // Kontoen kan være byttet mens sjekken gikk: navnet sendes bare for kontoen arket gjaldt (B-472)
      if (!uid || userId() !== uid) return;
      const n = await setNickname(uid, name);
      if (userId() !== uid) return;
      setMissingFor(null);
      announceNickname(uid, n);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    try {
      await flush(false);
      await signOut();
      resetCloud();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Portal>
      <div className="g-modal g-nick-gate" role="dialog" aria-modal="true" aria-labelledby="nick-gate-title">
        <div className="g-modal-card">
          <header className="g-card-head ds-sheet-head">
            <h2 id="nick-gate-title">
              <Icon name="user" /> Velg brukernavn
            </h2>
          </header>
          <p>
            Alle kontoer har et brukernavn. Det står på topplista og ved meldingene dine, og andre kan finne deg med
            det.
          </p>
          <form
            className="g-nick"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <label className="g-field">
              Brukernavn
              <input
                type="text"
                maxLength={20}
                minLength={3}
                autoComplete="nickname"
                placeholder="3–20 tegn, vises for alle"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError(null);
                }}
              />
            </label>
            {error && <p className="g-account-error">{error}</p>}
            <Button variant="primary" type="submit" disabled={busy || draft.trim().length < 3}>
              Lagre brukernavnet
            </Button>
          </form>
          <button type="button" className="g-nick-gate-out" disabled={busy} onClick={() => void logout()}>
            Logg ut i stedet
          </button>
        </div>
      </div>
    </Portal>
  );
}
