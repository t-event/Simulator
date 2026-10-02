/**
 * Privatmeldinger (B-421): fanen «Meldinger» i Skiftrapporten. Lista over samtaler, og samtalen med én spiller med
 * blokkering og rapportering. Av som standard – spilleren slår dem på i Min profil. Alle grenser sjekkes på serveren.
 */
import { useEffect, useRef, useState } from "react";
import { realNow } from "../game/clock";
import { fetchProfile } from "../net/leaderboard";
import {
  DM_MAX,
  DM_REFUSAL_TEXT,
  fetchDmOverview,
  fetchDmThread,
  reportMessage,
  sendDm,
  setDmBlock,
  type DmOverview,
  type DmThread,
} from "../net/messages";
import { Button, Callout } from "./ds";
import { Icon } from "./icons";
import { setDmUnread } from "./messagesStore";
import { openProfile } from "./profileStore";
import { PlayerName } from "./Profile";

const POLL_MS = 5_000;

/** «14:02», «i går» eller «3. okt.» */
function shortWhen(at: number, now = realNow()): string {
  const d = new Date(at);
  const day = (x: Date) => x.toDateString();
  if (day(d) === day(new Date(now))) return d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  if (day(d) === day(new Date(now - 86_400_000))) return "i går";
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

export function DirectMessages({ startWith }: { startWith: string | null }) {
  const [nick, setNick] = useState<string | null>(startWith);
  const [overview, setOverview] = useState<DmOverview | null>(null);
  const [failed, setFailed] = useState(false);

  // Oversikten hentes når fanen åpnes og når man går tilbake fra en samtale
  useEffect(() => {
    if (nick) return;
    let alive = true;
    const load = () =>
      fetchDmOverview().then(
        (o) => {
          if (!alive) return;
          setOverview(o);
          setFailed(false);
          setDmUnread(o.threads.reduce((a, t) => a + t.unread, 0));
        },
        () => alive && setFailed(true),
      );
    void load();
    const t = window.setInterval(() => document.visibilityState === "visible" && void load(), POLL_MS * 3);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [nick]);

  if (nick) return <Conversation nick={nick} onBack={() => setNick(null)} />;
  if (!overview)
    return <p className="g-muted g-small-text">{failed ? "Får ikke hentet meldingene nå." : "Henter …"}</p>;
  return (
    <div className="g-dm">
      <DmStatus o={overview} />
      {overview.threads.length === 0 ? (
        <p className="g-muted g-small-text">
          Ingen samtaler ennå. Trykk på et brukernavn og «Send melding» for å skrive til noen.
        </p>
      ) : (
        <ul className="g-dm-threads">
          {overview.threads.map((t) => (
            <li key={t.nick}>
              <button className={`g-dm-thread${t.unread ? " is-unread" : ""}`} onClick={() => setNick(t.nick)}>
                <span className="g-map-avatar ds-display" aria-hidden="true">
                  {t.nick[0]}
                </span>
                <span className="g-dm-thread-main">
                  <span className="g-dm-thread-top">
                    <strong>{t.nick}</strong>
                    <span className="g-muted g-small-text">{shortWhen(t.at)}</span>
                  </span>
                  <span className="g-dm-thread-last g-small-text">
                    {t.mine ? "Du: " : ""}
                    {t.last}
                  </span>
                </span>
                {t.unread > 0 && (
                  <span className="g-tab-count" aria-label={`${t.unread} uleste`}>
                    {t.unread}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {overview.blocked.length > 0 && (
        <details className="g-details g-dm-blocked">
          <summary>Blokkert ({overview.blocked.length})</summary>
          <ul className="g-profile-list">
            {overview.blocked.map((n) => (
              <li key={n}>
                {n}{" "}
                <button
                  className="g-link"
                  onClick={() =>
                    void setDmBlock(n, false).then(() =>
                      setOverview((o) => (o ? { ...o, blocked: o.blocked.filter((x) => x !== n) } : o)),
                    )
                  }
                >
                  Opphev
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Hvorfor man ikke kan sende, og veien til bryteren i Min profil */
function DmStatus({ o }: { o: DmOverview }) {
  if (!o.eligible) return <Callout tone="info">Meldinger åpnes når du har storverk eller har spilt tre dager.</Callout>;
  if (o.open) return null;
  return (
    <Callout tone="info">
      Meldinger er av. Slå dem på i Min profil, så kan du sende og få meldinger.{" "}
      <button
        className="g-link"
        onClick={() => void fetchProfile().then((p) => p?.nickname && openProfile(p.nickname, true))}
      >
        Åpne Min profil
      </button>
    </Callout>
  );
}

function Conversation({ nick, onBack }: { nick: string; onBack: () => void }) {
  const [thread, setThread] = useState<DmThread | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<number>>(() => new Set());
  const listRef = useRef<HTMLOListElement>(null);

  const load = () =>
    fetchDmThread(nick).then(
      (t) => setThread(t),
      () => setError("Får ikke hentet samtalen nå."),
    );

  useEffect(() => {
    let alive = true;
    const run = () =>
      document.visibilityState === "visible" &&
      fetchDmThread(nick).then(
        (t) => alive && setThread(t),
        () => {},
      );
    void run();
    const t = window.setInterval(run, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [nick]);

  const count = thread?.messages.length ?? 0;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    const r = await sendDm(nick, body);
    setBusy(false);
    if (!r.ok) {
      setError(DM_REFUSAL_TEXT[r.reason]);
      return;
    }
    setText("");
    await load();
  };

  const block = async (on: boolean) => {
    if (await setDmBlock(nick, on).catch(() => false)) await load();
  };

  return (
    <div className="g-dm g-dm-conv">
      <div className="g-dm-conv-head">
        <button className="g-icon-btn" onClick={onBack} aria-label="Tilbake til samtalene">
          <Icon name="chevron-right" className="g-flip" />
        </button>
        <strong>
          <PlayerName nick={nick} />
        </strong>
        {thread && (
          <button className="g-link g-dm-block" onClick={() => void block(!thread.blocked)}>
            {thread.blocked ? "Opphev blokkering" : "Blokker"}
          </button>
        )}
      </div>
      <ol className="g-chat-list g-dm-list" ref={listRef} aria-live="polite">
        {!thread && <li className="g-muted g-small-text">Henter …</li>}
        {thread && thread.messages.length === 0 && (
          <li className="g-muted g-small-text">Ingen meldinger ennå. Skriv noe hyggelig.</li>
        )}
        {thread?.messages.map((m) => (
          <li key={m.id} className={`g-chat-msg${m.mine ? " is-mine" : ""}`}>
            <div className="g-chat-meta">
              <strong>{m.mine ? "Deg" : nick}</strong>
              <span className="g-muted">{shortWhen(m.at)}</span>
              {!m.mine &&
                (reported.has(m.id) ? (
                  <span className="g-muted g-small-text">Rapportert</span>
                ) : (
                  <button
                    className="g-link g-chat-del"
                    onClick={() =>
                      void reportMessage("dm", m.id).then(
                        (ok) => ok && setReported((s) => new Set(s).add(m.id)),
                        () => {},
                      )
                    }
                  >
                    Rapporter
                  </button>
                ))}
            </div>
            <p>{m.body}</p>
          </li>
        ))}
      </ol>
      {thread && !thread.canSend ? (
        <p className="g-muted g-small-text">
          {thread.blocked ? (
            "Du har blokkert spilleren. Opphev blokkeringen for å skrive."
          ) : (
            <>
              Du kan ikke skrive til spilleren nå: meldinger må være på hos begge, og åpnes når du har storverk eller
              har spilt tre dager.{" "}
              <button
                className="g-link"
                onClick={() => void fetchProfile().then((p) => p?.nickname && openProfile(p.nickname, true))}
              >
                Åpne Min profil
              </button>
            </>
          )}
        </p>
      ) : (
        <form
          className="g-chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            type="text"
            value={text}
            maxLength={DM_MAX}
            placeholder={`Skriv til ${nick} …`}
            aria-label="Melding"
            enterKeyHint="send"
            onChange={(e) => {
              setText(e.target.value);
              setError(null);
            }}
          />
          <Button variant="primary" type="submit" disabled={busy || !text.trim()} aria-label="Send">
            <Icon name="send" />
          </Button>
        </form>
      )}
      {error && <p className="g-small-text g-chat-error">{error}</p>}
      {text.length > DM_MAX - 60 && (
        <p className="g-muted g-small-text">
          {text.length} av {DM_MAX} tegn
        </p>
      )}
    </div>
  );
}
