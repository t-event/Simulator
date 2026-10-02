/**
 * Konto og lagring på nett (B-125). Vises på startskjermen og under Innstillinger (tannhjulet).
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
  clearLoggedOut,
  loggedOutByServer,
  logoutReason,
  rememberPrefs,
  setRememberPrefs,
  deleteAccount,
  getSession,
  onSessionChange,
  recover,
  signIn,
  signOut,
  signUp,
  isTransient,
  updatePassword,
  verifyCode,
} from "../net/supabase";
import { openProfile } from "./profileStore";
import { AdminSheet } from "./Admin";
import { fetchIsAdmin } from "../net/admin";
import { fetchProfile, nicknameAvailable, nicknameProblem, setNickname as saveNickname } from "../net/leaderboard";
import { ACCOUNT_FEATURES, type AccountFeature } from "../net/features";
import { Card } from "./common";
import { Icon } from "./icons";
import { Button } from "./ds";
import {
  cloudStatus,
  fetchFeatures,
  flush,
  isReconciled,
  keepLocal,
  linkOnLogin,
  markReconciled,
  needsRelink,
  claim,
  onCloudStatus,
  PULL_INTERVAL_MS,
  pullIfNewer,
  resetCloud,
  type LinkDecision,
} from "../net/sync";

/** Lenkene fra e-posten (bekreftelse, nytt passord) leses inn før første tegning */
const authEvent = consumeAuthHash();
/** Kobling mot kontoen gjøres én gang per sidelasting – feilet den fordi tjenesten var nede, prøver CloudFollow igjen */
let linkedThisLoad = false;
/** Så ofte koblingen prøves igjen etter at tjenesten var nede (B-356) */
const RELINK_MS = 20_000;

/**
 * Beskjed når spilleren er logget ut av seg selv (økta ble avvist, f.eks. etter utlogging et annet sted før B-145).
 * Spillet her er beholdt; «Logg inn» åpner innstillingene.
 */
export function LoggedOutNotice({ onLogin }: { onLogin: () => void }) {
  const session = useSession();
  const [, setTick] = useState(0);
  const reason = session || !cloudConfigured() ? null : logoutReason();
  if (!reason) return null;
  const close = () => {
    clearLoggedOut();
    setTick((t) => t + 1);
  };
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-label="Du er logget ut">
      <div className="g-modal-card">
        <h2>Du er logget ut</h2>
        {reason === "server" ? (
          <p>
            Innloggingen på denne enheten var ikke lenger gyldig, for eksempel fordi du logget ut et annet sted. Spillet
            her er beholdt. Logg inn igjen, så lagres det på nett og du er med på topplista.
          </p>
        ) : (
          <>
            <p>
              Innloggingen ble borte her på enheten – serveren logget deg ikke ut.{" "}
              {rememberPrefs().remember
                ? "Det skjer når nettleserdata slettes, eller når spillet åpnes et annet sted: nettleseren og appen på hjemskjermen har hver sin innlogging."
                : "«Husk meg på denne enheten» var ikke på, så innloggingen ble slettet da appen ble lukket."}
            </p>
            <p>Spillet er trygt på kontoen. Logg inn igjen med «Husk meg» på, så holder du deg innlogget.</p>
          </>
        )}
        <div className="g-row">
          <button
            className="g-primary"
            onClick={() => {
              close();
              onLogin();
            }}
          >
            Logg inn
          </button>
          <button onClick={close}>Senere</button>
        </div>
      </div>
    </div>
  );
}

/**
 * Kontoen på startskjermen (B-147): én linje med en knapp som åpner kontokortet, så siden blir kort. Kortet er åpent
 * fra start når man kommer fra lenken i e-posten, eller når man ble logget ut av seg selv.
 */
export function IntroAccount({ api }: { api: GameApi }) {
  const session = useSession();
  const [open, setOpen] = useState(() => !!authEvent || loggedOutByServer());
  if (!cloudConfigured()) return null;
  return (
    <div className="g-intro-account">
      <div className="g-intro-account-head">
        <span>
          {session ? (
            <>
              <Icon name="cloud" /> Innlogget som <strong>{session.user.email || "…"}</strong>
            </>
          ) : (
            <>
              <strong>Konto</strong> <span className="g-muted">– lagre på nett og bli med på topplista</span>
            </>
          )}
        </span>
        <button className="g-small" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Skjul" : session ? "Konto" : "Logg inn"}
        </button>
      </div>
      {/* Kortet er alltid med (skjult når det er lukket): det kobler spillet til kontoen når siden lastes, og åpner
          seg selv når spilleren må velge noe (B-148) */}
      <div hidden={!open}>
        <AccountCard api={api} compact onAttention={() => setOpen(true)} />
      </div>
    </div>
  );
}

/**
 * «X krever konto» med grunnen og en knapp til innloggingen (B-149). Brukes for alt i ACCOUNT_FEATURES, så teksten er
 * lik overalt (docs/KONTO.md, regel 6: funksjonen skjules ikke).
 */
export function NeedsAccount({ feature, onLogin }: { feature: AccountFeature; onLogin?: () => void }) {
  const f = ACCOUNT_FEATURES[feature];
  return (
    <p className="g-note g-needs-account">
      <Icon name="lock" /> <strong>{f.name}</strong> krever konto. {f.why}
      {onLogin && (
        <>
          {" "}
          <button className="g-link" onClick={onLogin}>
            Logg inn eller opprett konto
          </button>
        </>
      )}
    </p>
  );
}

/**
 * Ett kort for alt på samme sted som krever konto (B-191, KONTO-regel 6): i stedet for ett låst kort per funksjon
 * står de i én liste med én knapp. Vises bare uten konto, og bare med funksjonene spilleren har kommet til.
 */
export function AccountFeaturesCard({
  features,
  note,
  onLogin,
}: {
  features: AccountFeature[];
  note?: string;
  onLogin?: () => void;
}) {
  const session = useSession();
  if (session || features.length === 0) return null;
  return (
    <Card title="Med konto" className="g-account-card">
      <p className="g-muted">Spillet er ditt uten konto. Med en gratis konto får du også:</p>
      <ul className="g-account-list">
        {features.map((k) => (
          <li key={k}>
            <Icon name="lock" />
            <span>
              <strong>{ACCOUNT_FEATURES[k].name}.</strong> {ACCOUNT_FEATURES[k].why}
            </span>
          </li>
        ))}
      </ul>
      {note && <p className="g-muted g-small-text">{note}</p>}
      {onLogin && (
        <Button variant="primary" icon="user" onClick={onLogin}>
          Logg inn eller opprett konto
        </Button>
      )}
    </Card>
  );
}

/** Brukernavnet fra skjemaet til kontoen er bekreftet (B-214). Ligger i localStorage, så det tåler at appen lukkes */
const PENDING_NICK_KEY = "stalverk-nytt-brukernavn-v1";
function pendingNick(): string | null {
  try {
    return localStorage.getItem(PENDING_NICK_KEY);
  } catch {
    return null;
  }
}
function setPendingNick(n: string | null): void {
  try {
    if (n) localStorage.setItem(PENDING_NICK_KEY, n);
    else localStorage.removeItem(PENDING_NICK_KEY);
  } catch {
    // Privat modus: brukernavnet velges etterpå
  }
}

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
  // Samme bredde mens den lagrer (B-171): «…» bak skyen gjorde toppraden bredere, og klokka brøt til to linjer
  return (
    <em className={`g-cloud is-${s.kind}`} title={text} aria-label={text}>
      {" "}
      <Icon name={s.kind === "saved" || s.kind === "saving" ? "cloud" : "cloud-off"} />
    </em>
  );
}

/**
 * To nettlesere på samme konto (B-140): når appen vises igjen, eller en lagring ble avvist, hentes spillet fra nettet
 * hvis det er spilt videre et annet sted. Spilleren får beskjed, og spillet står på pause til man trykker videre.
 */
export function CloudFollow({ api, onOpenSettings }: { api: GameApi; onOpenSettings?: () => void }) {
  const session = useSession();
  const reconciled = useSyncExternalStore(onCloudStatus, isReconciled, isReconciled);
  const [pulled, setPulled] = useState<{ day: number; speed: number; wasRunning: boolean } | null>(null);
  // Koblingen som ble prøvd igjen, fant to ulike spill: spilleren velger under Konto (B-356)
  const [mustChoose, setMustChoose] = useState(false);
  const apiRef = useRef(api);
  useEffect(() => {
    apiRef.current = api;
  });
  // Henting pågår, eller spilleren holder på å ta over her: da skal ikke en annen henting komme i veien
  const busyRef = useRef(false);

  /** «Spill her»: hent det nyeste fra den andre enheten, og lagre med én gang så den settes på pause (B-143) */
  const playHere = async (speed: number) => {
    busyRef.current = true;
    try {
      for (let i = 0; i < 3; i++) {
        const newer = await pullIfNewer().catch(() => null);
        if (newer) apiRef.current.adopt(newer);
        const g = apiRef.current.game;
        if (!g || (await claim(g).catch(() => true))) break;
      }
    } finally {
      busyRef.current = false;
    }
    apiRef.current.setSpeed(speed > 0 ? speed : 1);
    setPulled(null);
  };

  // Tjenesten var nede da siden ble lastet (B-356): koblingen mot kontoen prøves igjen til den lykkes. Før dette ble
  // ingenting lagret på nett før appen ble lastet på nytt – etter en driftsstans lagret ingen.
  useEffect(() => {
    if (!session || reconciled) return;
    let alive = true;
    const retry = async () => {
      if (!needsRelink() || busyRef.current || document.visibilityState !== "visible") return;
      busyRef.current = true;
      try {
        const g = apiRef.current.game;
        const d = await linkOnLogin(g ?? loadGame());
        linkedThisLoad = true;
        if (!alive) return;
        if (d.kind === "cloud") {
          apiRef.current.adopt(d.cloud);
          setPulled({ day: dayOf(d.cloud), speed: d.cloud.speed, wasRunning: false });
        } else if (d.kind === "choose") {
          // Kontokortet viser valget når det åpnes
          linkedThisLoad = false;
          setMustChoose(true);
        }
      } catch {
        // Fortsatt nede: prøver igjen om litt
      } finally {
        busyRef.current = false;
      }
    };
    const timer = setInterval(() => void retry(), RELINK_MS);
    const onVisible = () => void retry();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [session, reconciled]);

  useEffect(() => {
    if (!session || !reconciled) return;
    let last = 0;
    const pull = async (always = false) => {
      // Ikke oftere enn hvert femte sekund (fokus og synlighet kommer ofte samtidig)
      if (busyRef.current || (!always && Date.now() - last < 5000)) return;
      busyRef.current = true;
      last = Date.now();
      try {
        const newer = await pullIfNewer();
        if (newer) {
          const speed = newer.speed;
          // Gikk spillet her også? Da spilles det på to enheter samtidig, og denne settes på pause (B-143)
          const wasRunning = (apiRef.current.game?.speed ?? 0) > 0;
          apiRef.current.adopt(newer);
          setPulled((prev) => ({ day: dayOf(newer), speed, wasRunning: wasRunning || !!prev?.wasRunning }));
        }
      } catch {
        // Uten nett: prøver igjen neste gang appen vises
      } finally {
        busyRef.current = false;
      }
    };
    void pull(true);
    // Mens appen vises: sjekk jevnlig, så en annen enhet som står åpen ved siden av, også blir fanget opp (B-141)
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void pull(true);
    }, PULL_INTERVAL_MS);
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
      clearInterval(timer);
      off();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [session, reconciled]);

  if (mustChoose && !reconciled)
    return (
      <div className="g-modal" role="dialog" aria-modal="true" aria-label="Velg spill">
        <div className="g-modal-card">
          <h2>Hvilket spill vil du fortsette med?</h2>
          <p>
            Kontakten med serveren er tilbake, men spillet her og spillet på kontoen er forskjellige. Velg hvilket du
            vil fortsette med. Til da lagres spillet bare her.
          </p>
          <div className="g-row">
            {onOpenSettings && (
              <button
                className="g-primary"
                onClick={() => {
                  setMustChoose(false);
                  onOpenSettings();
                }}
              >
                Velg under Konto
              </button>
            )}
            <button onClick={() => setMustChoose(false)}>Senere</button>
          </div>
        </div>
      </div>
    );
  if (!pulled) return null;
  return (
    <div className="g-modal" role="dialog" aria-modal="true" aria-label="Hentet fra nettet">
      <div className="g-modal-card">
        <h2>{pulled.wasRunning ? "Spillet er i gang på en annen enhet" : "Hentet det nyeste spillet"}</h2>
        {pulled.wasRunning ? (
          <p>
            Du spiller på en annen enhet samtidig. Her er spillet satt på pause og byttet til det som er lagret derfra
            (dag {pulled.day}), så de to ikke skriver over hverandre. Trykker du «Spill her», fortsetter du på denne
            enheten, og den andre settes på pause.
          </p>
        ) : (
          <p>
            Du har spilt videre på en annen enhet. Spillet her er byttet til det som er lagret på nett (dag {pulled.day}
            ), så det du gjorde der, er med.
          </p>
        )}
        <div className="g-row">
          <button className="g-primary" onClick={() => void playHere(pulled.speed)}>
            {pulled.wasRunning ? "Spill her" : "Spill videre"}
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
export function AccountCard({
  api,
  onDone,
  compact,
  onAttention,
}: {
  api: GameApi;
  onDone?: () => void;
  /** På startskjermen: uten overskrift og innledning, de står allerede over (B-147) */
  compact?: boolean;
  /** Kalles når kortet viser noe spilleren må ta stilling til (valg av spill, feil, e-postlenken) */
  onAttention?: () => void;
}) {
  const session = useSession();
  const status = useCloudStatus();
  const [mode, setMode] = useState<Mode>(authEvent === "recovery" ? "reset" : "login");
  const [email, setEmail] = useState(() => rememberPrefs().email);
  const [password, setPassword] = useState("");
  // «Husk meg på denne enheten» (B-146): på som standard
  const [remember, setRemember] = useState(() => rememberPrefs().remember);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  // Kom man hit fra lenken i e-posten (Safari, ikke appen på hjemskjermen), kobles ikke noe spill før spilleren
  // sier at det er her man spiller (B-128)
  const [fromLink, setFromLink] = useState(authEvent === "signup");
  const [choose, setChoose] = useState<{ cloud: GameState; local: GameState } | null>(null);
  // «Herfra» trykket én gang når spillet her er eldre enn det på nett (B-259)
  const [confirmLocal, setConfirmLocal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cloudOn, setCloudOn] = useState(cloudConfigured());
  // Kallenavnet på topplista (B-127): undefined = ikke hentet ennå
  const [nickname, setNickname] = useState<string | null | undefined>(undefined);
  const [nickDraft, setNickDraft] = useState("");
  const [flagged, setFlagged] = useState(false);
  // Brukernavnet som velges når kontoen opprettes (B-214)
  const [newNick, setNewNick] = useState("");
  // Adminpanelet (B-421): knappen vises bare når serveren sier at kontoen er admin
  const [admin, setAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  useEffect(() => {
    if (!session) return setAdmin(false);
    let alive = true;
    fetchIsAdmin().then(
      (a) => alive && setAdmin(a),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session) {
      setNickname(undefined);
      return;
    }
    let alive = true;
    void fetchProfile()
      .then(async (p) => {
        if (!alive) return;
        setFlagged(!!p?.flagged_at || !!p?.banned);
        // Ny konto (B-214): brukernavnet fra skjemaet settes med én gang, så spilleren er med på topplista
        const pending = pendingNick();
        if (p && !p.nickname && pending) {
          setPendingNick(null);
          try {
            const n = await saveNickname(pending);
            if (!alive) return;
            setNickname(n);
            setNickDraft(n);
            setInfo(`Du er med på topplista som «${n}».`);
            return;
          } catch {
            if (!alive) return;
            setError(`Brukernavnet «${pending}» ble tatt i mellomtiden. Velg et annet under.`);
            setNickDraft(pending);
          }
        }
        setNickname(p?.nickname ?? null);
        if (p?.nickname) setNickDraft(p.nickname);
      })
      .catch(() => alive && setNickname(null));
    return () => {
      alive = false;
    };
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
      setError(
        isTransient(e)
          ? "Fikk ikke kontakt med serveren. Spillet lagres her, og det prøves igjen av seg selv."
          : e instanceof Error
            ? e.message
            : String(e),
      );
    }
  };

  // Ved sidelasting med en økt fra før: hent spillet fra nettet før spilleren trykker «Fortsett»
  useEffect(() => {
    if (session && !linkedThisLoad && mode !== "reset" && !fromLink) void link();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, fromLink]);

  useEffect(() => {
    if (choose || fromLink || error) onAttention?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choose, fromLink, error]);

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

  if (choose) {
    const behind = dayOf(choose.cloud) - dayOf(choose.local);
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
            onClick={() => {
              // Er spillet her mye eldre, spør vi én gang til (B-259): det på nett blir borte
              if (behind > 0 && !confirmLocal) return setConfirmLocal(true);
              void run(async () => {
                await keepLocal(choose.local);
                saveGame(choose.local);
                setChoose(null);
                setConfirmLocal(false);
                setInfo("Spillet herfra er lagret på nett.");
              });
            }}
          >
            {confirmLocal ? `Ja, bruk dag ${dayOf(choose.local)}` : `Herfra (dag ${dayOf(choose.local)})`}
          </button>
        </div>
        {confirmLocal && (
          <p className="g-account-error">
            Spillet her er {behind} døgn bak spillet på nett. Velger du det, blir dag {dayOf(choose.cloud)} borte.
          </p>
        )}
        {error && <p className="g-account-error">{error}</p>}
      </div>
    );
  }

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
        {!compact && <h3 className="g-subhead">Konto</h3>}
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
              setInfo(`Brukernavnet «${n}» er lagret. Du er med på topplista.`);
            });
          }}
        >
          <label className="g-field">
            Brukernavn på topplista {nickname === null && <span className="g-muted">(ikke valgt ennå)</span>}
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
            {nickname ? "Endre brukernavn" : "Bli med på topplista"}
          </button>
        </form>
        {/* Min profil (B-420): teksten, merket og prestasjonene andre ser når de trykker på brukernavnet */}
        {nickname && (
          <button type="button" onClick={() => openProfile(nickname, true)}>
            Min profil
          </button>
        )}
        {admin && (
          <button type="button" onClick={() => setAdminOpen(true)}>
            Adminpanel
          </button>
        )}
        {adminOpen && <AdminSheet onClose={() => setAdminOpen(false)} />}
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
                setRememberPrefs({ remember, email: email.trim() });
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
        // Brukernavnet er påkrevd og må være ledig før kontoen lages (B-214)
        const problem = nicknameProblem(newNick);
        if (problem) throw new Error(problem);
        if (!(await nicknameAvailable(newNick))) throw new Error("Brukernavnet er tatt. Velg et annet.");
        setPendingNick(newNick.trim());
        const r = await signUp(mail, password);
        if (r.needsConfirm) {
          setCode("");
          setMode("confirm");
          return;
        }
      } else {
        await signIn(mail, password);
      }
      setRememberPrefs({ remember, email: mail });
      setPassword("");
      await link();
    });

  return (
    <div className="g-account">
      {!compact && (
        <>
          <h3 className="g-subhead">Konto</h3>
          <p className="g-muted">
            Med konto lagres spillet på nett, så du kan fortsette på en annen mobil eller fra hjemskjermen, og du kan
            være med på topplista og i sesongen. Spillet du har her, kan kobles til kontoen: finnes det alt et spill på
            kontoen, får du velge hvilket du vil fortsette med.
          </p>
        </>
      )}
      {info && <p className="g-account-info">{info}</p>}
      {loggedOutByServer() && (
        <p className="g-note">
          Du ble logget ut på denne enheten, for eksempel fordi du logget ut et annet sted. Spillet her er beholdt –
          logg inn igjen, så fortsetter det på nett.
        </p>
      )}
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
            name="email"
            // «username» sammen med «current-password» gjør at mobilens passordlager kjenner igjen innloggingen
            autoComplete={mode === "signup" ? "email" : "username"}
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode === "signup" && (
          <label className="g-field">
            Brukernavn (vises på topplista)
            <input
              type="text"
              name="nickname"
              autoComplete="nickname"
              minLength={3}
              maxLength={20}
              required
              placeholder="3–20 tegn"
              value={newNick}
              onChange={(e) => setNewNick(e.target.value)}
            />
          </label>
        )}
        {mode !== "forgot" && (
          <label className="g-field">
            Passord{mode === "signup" ? " (minst 6 tegn)" : ""}
            <input
              type="password"
              name="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {mode !== "forgot" && (
          <label className="g-toggle">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span>
              Husk meg på denne enheten
              <small className="g-muted g-toggle-hint">
                {remember
                  ? "E-posten huskes, og du holdes innlogget. Passordet kan mobilen eller nettleseren huske for deg – spillet lagrer det ikke selv."
                  : "Du logges ut når appen lukkes, og e-posten glemmes."}
              </small>
            </span>
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
