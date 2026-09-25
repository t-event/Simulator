/**
 * Konto og lagring på nett (B-125). Vises på startskjermen og under ⚙️ Innstillinger.
 * Logg inn, opprett konto, glemt passord, nytt passord, logg ut og slett konto – og kobling av det lokale spillet
 * til kontoen ved innlogging.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
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
} from "../net/supabase";
import { fetchProfile, setNickname as saveNickname } from "../net/leaderboard";
import {
  cloudStatus,
  fetchFeatures,
  flush,
  keepLocal,
  linkOnLogin,
  onCloudStatus,
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
          : `Lagring på nett feilet: ${s.message}`;
  return (
    <em className={`g-cloud is-${s.kind}`} title={text} aria-label={text}>
      {" "}
      ☁{s.kind === "saved" ? "" : s.kind === "saving" ? "…" : "!"}
    </em>
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
  }
}

type Mode = "login" | "signup" | "forgot" | "reset";

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
  const [info, setInfo] = useState<string | null>(
    authEvent === "signup" ? "E-posten er bekreftet. Du er logget inn." : null,
  );
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
    if (session && !linkedThisLoad && mode !== "reset") void link();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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

  const submit = () =>
    void run(async () => {
      const mail = email.trim();
      if (mode === "forgot") {
        await recover(mail);
        setMode("login");
        setInfo("Vi har sendt en e-post med en lenke for å sette nytt passord. Sjekk også søppelposten.");
        return;
      }
      if (mode === "signup") {
        const r = await signUp(mail, password);
        if (r.needsConfirm) {
          setMode("login");
          setInfo("Kontoen er opprettet. Trykk på lenken i e-posten for å bekrefte den, og logg inn her etterpå.");
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
        Med konto lagres spillet på nett, så du kan fortsette på en annen mobil eller fra hjemskjermen – og du er med på
        topplista når den kommer. Spillet du har her, blir koblet til kontoen.
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
            {mode === "signup" ? "Opprett konto" : mode === "forgot" ? "Send lenke" : "Logg inn"}
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
