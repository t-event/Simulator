/**
 * Konto og lagring på nett (B-125). Vises på startskjermen og under ⚙️ Innstillinger.
 * Logg inn, opprett konto, glemt passord, nytt passord, logg ut og slett konto – og kobling av det lokale spillet
 * til kontoen ved innlogging.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { loadGame, saveGame } from "../game/save";
import { cloudConfigured } from "../net/config";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import {
  consumeAuthHash,
  deleteAccount,
  getSession,
  onSessionChange,
  recover,
  signIn,
  signOut,
  signUp,
  updatePassword,
  verifyCode,
} from "../net/supabase";
import { fetchProfile, setNickname as saveNickname } from "../net/leaderboard";
import {
  cloudStatus,
  fetchFeatures,
  flush,
  isReconciled,
  keepLocal,
  linkOnLogin,
  markReconciled,
  onCloudStatus,
  pullIfNewer,
  resetCloud,
  type LinkDecision,
} from "../net/sync";

/** Lenkene fra e-posten (bekreftelse, nytt passord) leses inn før første tegning */
const authEvent = consumeAuthHash();
/** Kobling mot kontoen gjøres én gang per sidelasting */
let linkedThisLoad = false;

function useSession() {
  return useSyncExternalStore(onSessionChange, getSession, getSession);
}
function useCloudStatus() {
  return useSyncExternalStore(onCloudStatus, cloudStatus, cloudStatus);
}

function dayOf(g: GameState): number {
  return Math.floor(g.minute / 1440) + 1;
}

/** Liten sky i toppfeltet: er spillet lagret på nett? */
export function CloudDot() {
  const s = useCloudStatus();
  if (s.kind === "off") return null;
  const text =
    s.kind === "saved"
      ? `Lagret på nett kl. ${new Date(s.at).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}`
      : s.kind === "saving"
        ? "Lagrer på nett …"
        : s.kind === "offline"
          ? "Uten nett – lagres når nettet er tilbake"
          : s.kind === "conflict"
            ? "Spillet er lagret fra en annen enhet – henter det nyeste"
            : `Lagring på nett feilet: ${s.message}`;
  return (
    <em className={`g-cloud is-${s.kind}`} title={text} aria-label={text}>
      {" "}
      ☁{s.kind === "saved" ? "" : s.kind === "saving" ? "…" : "!"}
    </em>
  );
}

/**
 * To nettlesere på samme konto (B-140): når appen vises igjen, eller en lagring ble avvist, hentes spillet fra nettet
 * hvis det er spilt videre et annet sted. Spilleren får beskjed, og spillet står på pause til man trykker videre.
 */
export function CloudFollow({ api }: { api: GameApi }) {
  const session = useSession();
  const reconciled = useSyncExternalStore(onCloudStatus, isReconciled, isReconciled);
  const [pulled, setPulled] = useState<{ day: number; speed: number } | null>(null);
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  });

  useEffect(() => {
    if (!session || !reconciled) return;
    let busy = false;
    let last = 0;
    const pull = async (always = false) => {
      // Ikke oftere enn hvert femte sekund (fokus og synlighet kommer ofte samtidig)
      if (busy || (!always && Date.now() - last < 5000)) return;
      busy = true;
      last = Date.now();
      try {
        const newer = await pullIfNewer();
        if (newer) {
          const speed = newer.speed;
          apiRef.current.adopt(newer);
          setPulled({ day: dayOf(newer), speed });
        }
      } catch {
        // Uten nett: prøver igjen neste gang appen vises
      } finally {
        busy = false;
      }
    };
    void pull(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") void pull();
    };
    const off = onCloudStatus(() => {
      if (cloudStatus().kind === "conflict") void pull(true);
    });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      off();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [session, reconciled]);

  if (!pulled) return null;
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-label="Hentet fra nettet">
      <div className="g-modal-card">
        <h2>Hentet det nyeste spillet</h2>
        <p>
          Du har spilt videre på en annen enhet. Spillet her er byttet til det som er lagret på nett (dag {pulled.day}),
          så det du gjorde der, er med.
        </p>
        <div className="g-row">
          <button
            className="g-primary"
            onClick={() => {
              api.setSpeed(pulled.speed > 0 ? pulled.speed : 1);
              setPulled(null);
            }}
          >
            Spill videre
          </button>
        </div>
      </div>
    </div>
  );
}

function cloudLine(s: ReturnType<typeof cloudStatus>): string {
  switch (s.kind) {
    case "off":
      return "";
    case "saving":
      return "Lagrer på nett …";
    case "saved":
      return `Lagret på nett kl. ${new Date(s.at).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}.`;
    case "offline":
      return "Uten nett akkurat nå. Spillet lagres på nett så snart nettet er tilbake.";
    case "error":
      return `Lagring på nett feilet: ${s.message}`;
    case "conflict":
      return "Spillet er lagret fra en annen enhet siden sist. Det nyeste hentes.";
  }
}

/** confirm: skriv koden fra e-posten etter opprettelse. recoverCode: koden fra «glemt passord», så nytt passord. */
type Mode = "login" | "signup" | "forgot" | "reset" | "confirm" | "recoverCode";

/**
 * Kontokortet. `api` gir det spillet som kjører (hvis noe), og tar imot spillet fra nettet.
 * `onDone` kalles når noe er lastet inn, så innstillingene kan lukkes.
 */
export function AccountCard({ api, onDone }: { api: GameApi; onDone?: () => void }) {
  const session = useSession();
  const status = useCloudStatus();
  const [mode, setMode] = useState<Mode>(authEvent === "recovery" ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  // Kom man hit fra lenken i e-posten (Safari, ikke appen på hjemskjermen), kobles ikke noe spill før spilleren
  // sier at det er her man spiller (B-128)
  const [fromLink, setFromLink] = useState(authEvent === "signup");
  const [choose, setChoose] = useState<{ cloud: GameState; local: GameState } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cloudOn, setCloudOn] = useState(cloudConfigured());
  // Kallenavnet på topplista (B-127): undefined = ikke hentet ennå
  const [nickname, setNickname] = useState<string | null | undefined>(undefined);
  const [nickDraft, setNickDraft] = useState("");
  const [flagged, setFlagged] = useState(false);

  useEffect(() => {
    if (!session) {
      setNickname(undefined);
      return;
    }
    void fetchProfile()
      .then((p) => {
        setNickname(p?.nickname ?? null);
        setNickDraft(p?.nickname ?? "");
        setFlagged(!!p?.flagged_at || !!p?.banned);
      })
      .catch(() => setNickname(null));
  }, [session]);

  useEffect(() => {
    void fetchFeatures().then((f) => {
      if (f.cloud === false) setCloudOn(false);
    });
  }, []);

  /** Tar imot svaret fra koblingen og viser hva som skjedde */
  const apply = (d: LinkDecision) => {
    if (d.kind === "cloud") {
      if (api.game) api.adopt(d.cloud);
      else api.stash(d.cloud);
      setInfo(`Hentet spillet fra nettet (dag ${dayOf(d.cloud)}).`);
      onDone?.();
    } else if (d.kind === "uploaded") setInfo("Spillet er lagret på nett.");
    else if (d.kind === "choose") setChoose({ cloud: d.cloud, local: d.local });
    else setInfo("Kontoen har ikke noe spill ennå. Start et spill, så lagres det på nett.");
  };

  const link = async () => {
    linkedThisLoad = true;
    try {
      apply(await linkOnLogin(api.game ?? loadGame()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // Ved sidelasting med en økt fra før: hent spillet fra nettet før spilleren trykker «Fortsett»
  useEffect(() => {
    if (session && !linkedThisLoad && mode !== "reset" && !fromLink) void link();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, fromLink]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!cloudConfigured()) return null;
  if (!cloudOn && !session)
    return (
      <div className="g-account">
        <h3 className="g-subhead">Konto</h3>
        <p className="g-muted">Lagring på nett er slått av for øyeblikket. Spillet lagres i denne nettleseren.</p>
      </div>
    );

  if (choose)
    return (
      <div className="g-account">
        <h3 className="g-subhead">Hvilket spill vil du fortsette?</h3>
        <p>
          Kontoen din har et spill på nett (dag {dayOf(choose.cloud)}), og det ligger et spill her i nettleseren (dag{" "}
          {dayOf(choose.local)}). Det du ikke velger, blir borte.
        </p>
        <div className="g-row">
          <button
            className="g-primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (api.game) api.adopt(choose.cloud);
                else api.stash(choose.cloud);
                markReconciled();
                setChoose(null);
                setInfo(`Hentet spillet fra nettet (dag ${dayOf(choose.cloud)}).`);
                onDone?.();
              })
            }
          >
            Fra nettet (dag {dayOf(choose.cloud)})
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await keepLocal(choose.local);
                saveGame(choose.local);
                setChoose(null);
                setInfo("Spillet herfra er lagret på nett.");
              })
            }
          >
            Herfra (dag {dayOf(choose.local)})
          </button>
        </div>
        {error && <p className="g-account-error">{error}</p>}
      </div>
    );

  if (session && fromLink && mode !== "reset")
    return (
      <div className="g-account">
        <h3 className="g-subhead">E-posten er bekreftet</h3>
        <p>
          Kontoen <strong>{session.user.email}</strong> er klar. Lenken åpnet i nettleseren, og spillet på hjemskjermen
          har sin egen lagring.
        </p>
        <p className="g-muted">
          <strong>Spiller du fra hjemskjermen?</strong> Lukk denne siden og logg inn i appen der. Da blir spillet du har
          der, koblet til kontoen.
        </p>
        <div className="g-row">
          <button
            className="g-primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await signOut();
                resetCloud();
                setFromLink(false);
                setInfo("Du er logget ut her. Logg inn i appen du spiller i.");
              })
            }
          >
            Jeg spiller fra hjemskjermen
          </button>
          <button disabled={busy} onClick={() => setFromLink(false)}>
            Jeg spiller her i nettleseren
          </button>
        </div>
        {error && <p className="g-account-error">{error}</p>}
      </div>
    );

  if (session && mode !== "reset")
    return (
      <div className="g-account">
        <h3 className="g-subhead">Konto</h3>
        <p>
          Logget inn som <strong>{session.user.email || "…"}</strong>.{" "}
          <span className="g-muted">{cloudLine(status)}</span>
        </p>
        {info && <p className="g-account-info">{info}</p>}
        {error && <p className="g-account-error">{error}</p>}
        <form
          className="g-nick"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const n = await saveNickname(nickDraft);
              setNickname(n);
              setNickDraft(n);
              setInfo(`Kallenavnet «${n}» er lagret. Du er med på topplista under Verket → Økonomi.`);
            });
          }}
        >
          <label className="g-field">
            Kallenavn på topplista {nickname === null && <span className="g-muted">(ikke valgt ennå)</span>}
            <input
              type="text"
              maxLength={20}
              minLength={3}
              autoComplete="nickname"
              placeholder="3–20 tegn, vises for alle"
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value)}
            />
          </label>
          <button type="submit" disabled={busy || nickDraft.trim().length < 3 || nickDraft.trim() === nickname}>
            {nickname ? "Endre kallenavn" : "Bli med på topplista"}
          </button>
        </form>
        {flagged && (
          <p className="g-account-error">
            Kontoen er holdt utenfor topplista fordi spillet vokste raskere enn det som er mulig. Ta kontakt hvis du
            mener det er feil.
          </p>
        )}
        <div className="g-row">
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await flush(false);
                await signOut();
                resetCloud();
                setInfo("Du er logget ut. Spillet her i nettleseren er beholdt.");
              })
            }
          >
            Logg ut
          </button>
          <button disabled={busy} onClick={() => setMode("reset")}>
            Bytt passord
          </button>
          {confirmDelete ? (
            <>
              <button
                className="g-danger"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await deleteAccount();
                    resetCloud();
                    if (api.game) api.act((gg) => void (gg.owner = null));
                    setConfirmDelete(false);
                    setInfo("Kontoen er slettet. Spillet her i nettleseren er beholdt.");
                  })
                }
              >
                Ja, slett kontoen og alt på nett
              </button>
              <button disabled={busy} onClick={() => setConfirmDelete(false)}>
                Avbryt
              </button>
            </>
          ) : (
            <button className="g-link" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Slett konto…
            </button>
          )}
        </div>
        <p className="g-muted g-small-text">
          Vi lagrer e-posten din og spillet ditt, ingenting annet. «Slett konto» fjerner alt fra nettet.
        </p>
      </div>
    );

  if (mode === "reset")
    return (
      <div className="g-account">
        <h3 className="g-subhead">Nytt passord</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await updatePassword(password);
              setPassword("");
              setMode("login");
              setInfo("Passordet er endret.");
              if (!linkedThisLoad) await link();
            });
          }}
        >
          <label className="g-field">
            Nytt passord (minst 6 tegn)
            <input
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="g-account-error">{error}</p>}
          <div className="g-row">
            <button className="g-primary" type="submit" disabled={busy}>
              Lagre passord
            </button>
            {session && (
              <button type="button" disabled={busy} onClick={() => setMode("login")}>
                Avbryt
              </button>
            )}
          </div>
        </form>
      </div>
    );

  if (mode === "confirm" || mode === "recoverCode")
    return (
      <div className="g-account">
        <h3 className="g-subhead">{mode === "confirm" ? "Bekreft e-posten" : "Kode fra e-posten"}</h3>
        <p className="g-muted">
          Vi har sendt en e-post til <strong>{email.trim()}</strong> med en kode. Skriv den her, så skjer alt i appen du
          spiller i. Sjekk også søppelposten.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (mode === "confirm") {
                await verifyCode(email.trim(), code, "signup");
                setCode("");
                setPassword("");
                setMode("login");
                setInfo("E-posten er bekreftet, og du er logget inn.");
                await link();
              } else {
                await verifyCode(email.trim(), code, "recovery");
                setCode("");
                setMode("reset");
              }
            });
          }}
        >
          <label className="g-field">
            Kode
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6 sifre"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          {error && <p className="g-account-error">{error}</p>}
          <div className="g-row">
            <button className="g-primary" type="submit" disabled={busy || code.trim().length < 6}>
              {mode === "confirm" ? "Bekreft" : "Bruk koden"}
            </button>
            <button type="button" disabled={busy} onClick={() => setMode("login")}>
              Tilbake
            </button>
          </div>
        </form>
        <p className="g-muted g-small-text">
          {mode === "confirm"
            ? "Trykket du på lenken i e-posten i stedet? Da er kontoen bekreftet – gå tilbake og logg inn her."
            : "Fikk du ingen e-post? Gå tilbake og prøv «Glemt passord?» på nytt om noen minutter."}
        </p>
      </div>
    );

  const submit = () =>
    void run(async () => {
      const mail = email.trim();
      if (mode === "forgot") {
        await recover(mail);
        setCode("");
        setMode("recoverCode");
        return;
      }
      if (mode === "signup") {
        const r = await signUp(mail, password);
        if (r.needsConfirm) {
          setCode("");
          setMode("confirm");
          return;
        }
      } else {
        await signIn(mail, password);
      }
      setPassword("");
      await link();
    });

  return (
    <div className="g-account">
      <h3 className="g-subhead">Konto</h3>
      <p className="g-muted">
        Med konto lagres spillet på nett, så du kan fortsette på en annen mobil eller fra hjemskjermen, og du kan være
        med på topplista og i sesongen. Spillet du har her, kan kobles til kontoen: finnes det alt et spill på kontoen,
        får du velge hvilket du vil fortsette med.
      </p>
      {info && <p className="g-account-info">{info}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="g-field">
          E-post
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode !== "forgot" && (
          <label className="g-field">
            Passord{mode === "signup" ? " (minst 6 tegn)" : ""}
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {error && <p className="g-account-error">{error}</p>}
        <div className="g-row">
          <button className="g-primary" type="submit" disabled={busy}>
            {mode === "signup" ? "Opprett konto" : mode === "forgot" ? "Send kode" : "Logg inn"}
          </button>
          {mode === "login" && (
            <button type="button" disabled={busy} onClick={() => setMode("signup")}>
              Opprett konto
            </button>
          )}
          {mode !== "login" && (
            <button type="button" disabled={busy} onClick={() => setMode("login")}>
              Tilbake
            </button>
          )}
          {mode === "login" && (
            <button type="button" className="g-link" disabled={busy} onClick={() => setMode("forgot")}>
              Glemt passord?
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
