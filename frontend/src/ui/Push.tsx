/**
 * Varsel på mobilen (B-465): bryteren under Innstillinger → Varsler og oppfordringen på selskapet du eier.
 * Krever konto. På iPhone/iPad bare når spillet er lagt på hjemskjermen.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  disablePush,
  enablePush,
  PUSH_KINDS,
  PUSH_REFUSAL_TEXT,
  pushPermission,
  pushState,
  pushSupport,
  type PushKind,
} from "../net/push";
import { getSession, onSessionChange, userId } from "../net/supabase";
import { NeedsAccount } from "./Account";
import { Button } from "./ds";

export function PushSettings() {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const uid = session?.user.id ?? null;
  const support = pushSupport();
  // Tilstanden gjelder bare kontoen den ble hentet for
  const [state, setState] = useState<{ uid: string; active: boolean; kinds: PushKind[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || support !== "ja") return;
    let alive = true;
    pushState().then(
      (s) => alive && userId() === uid && setState({ uid, ...s }),
      () => alive && setState({ uid, active: false, kinds: PUSH_KINDS.map((k) => k.id) }),
    );
    return () => {
      alive = false;
    };
  }, [uid, support]);

  if (!session) return <NeedsAccount feature="varsler" />;
  if (support === "hjemskjerm")
    return (
      <p className="g-muted g-small-text g-push-note">
        <strong>Varsel på mobilen:</strong> på iPhone og iPad må spillet ligge på hjemskjermen først. Trykk Del-knappen
        i Safari, velg «Legg til på Hjem-skjerm», og åpne spillet derfra. Så kan du slå på varsler her.
      </p>
    );
  if (support === "nei")
    return <p className="g-muted g-small-text g-push-note">Denne nettleseren kan ikke vise varsel på mobilen.</p>;

  const cur = state && state.uid === uid ? state : null;
  const blocked = pushPermission() === "denied";

  const save = async (active: boolean, kinds: PushKind[]) => {
    setBusy(true);
    setNote(null);
    try {
      if (!active) {
        await disablePush();
        if (userId() === uid) setState({ uid: uid!, active: false, kinds });
      } else {
        const r = await enablePush(kinds);
        if (userId() !== uid) return;
        if (r.ok) setState({ uid: uid!, active: true, kinds });
        else setNote(PUSH_REFUSAL_TEXT[r.reason]);
      }
    } catch {
      setNote("Får ikke kontakt med serveren. Prøv igjen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="g-push">
      <p className="g-muted g-small-text">
        Få beskjed på telefonen når noe skjer mens du er borte – for eksempel når noen byr på selskapet ditt. Gjelder
        denne enheten.
      </p>
      {blocked && <p className="g-small-text g-push-error">{PUSH_REFUSAL_TEXT.nektet}</p>}
      <label className="g-toggle">
        <input
          type="checkbox"
          checked={!!cur?.active}
          disabled={busy || !cur || (blocked && !cur.active)}
          onChange={(e) => void save(e.target.checked, cur?.kinds.length ? cur.kinds : PUSH_KINDS.map((k) => k.id))}
        />
        <span>Varsel på mobilen</span>
      </label>
      {cur?.active &&
        PUSH_KINDS.map((k) => (
          <label key={k.id} className="g-toggle g-push-kind">
            <input
              type="checkbox"
              checked={cur.kinds.includes(k.id)}
              disabled={busy}
              onChange={(e) =>
                void save(true, e.target.checked ? [...cur.kinds, k.id] : cur.kinds.filter((x) => x !== k.id))
              }
            />
            <span>
              {k.label}
              <small className="g-muted g-toggle-hint">{k.hint}</small>
            </span>
          </label>
        ))}
      {note && <p className="g-small-text g-push-error">{note}</p>}
    </div>
  );
}

/** Kort oppfordring der varsler betyr mest (selskapet du eier): vises bare når de kan slås på og ikke står på */
export function PushPrompt({ text }: { text: string }) {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const uid = session?.user.id ?? null;
  const [show, setShow] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    if (!uid || pushSupport() !== "ja" || pushPermission() === "denied") return;
    let alive = true;
    pushState().then(
      (s) => alive && userId() === uid && !s.active && setShow(uid),
      () => undefined,
    );
    return () => {
      alive = false;
    };
  }, [uid]);
  if (!uid || show !== uid) return null;
  const turnOn = async () => {
    setBusy(true);
    try {
      const r = await enablePush(PUSH_KINDS.map((k) => k.id));
      if (r.ok) setShow(null);
      else setNote(PUSH_REFUSAL_TEXT[r.reason]);
    } catch {
      setNote("Får ikke kontakt med serveren. Prøv igjen.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="g-push-prompt">
      <p className="g-small-text">{text}</p>
      <Button icon="bell" disabled={busy} onClick={() => void turnOn()}>
        Slå på varsel
      </Button>
      {note && <p className="g-small-text g-push-error">{note}</p>}
    </div>
  );
}
