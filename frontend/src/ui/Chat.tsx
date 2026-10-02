/**
 * Skiftrapporten (B-338): felles chat for alle spillere med konto. Hendelser fra spillet (anbud, overtakelser, nye
 * titler) står i samme liste, skrevet av serveren (B-339). Knappen står ved varsellinja (prikk når noe nytt har
 * kommet), og arket henter nye meldinger hvert 5. sekund mens det er åpent. Uten konto vises hva den er, med knapp til
 * innlogging (B-149).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  CHAT_MAX,
  CHAT_REFUSAL_TEXT,
  chatCache,
  chatSeen,
  deleteChat,
  fetchChat,
  fetchChatLatest,
  markChatSeen,
  mergeChat,
  saveChatCache,
  sendChat,
  type ChatMessage,
} from "../net/chat";
import { fetchProfile } from "../net/leaderboard";
import { getSession, onSessionChange } from "../net/supabase";
import type { GameState } from "../game/types";
import { realNow } from "../game/clock";
import { NeedsAccount } from "./Account";
import { fetchDmUnread, reportMessage } from "../net/messages";
import { SubTabs } from "./common";
import { Callout, SheetHead } from "./ds";
import { DirectMessages } from "./Messages";
import { messagesBadge, onMessagesChange, setDmUnread, setReportUnread, takeMessagesRequest } from "./messagesStore";
import { fetchReportUnread } from "../net/reports";
import { PlayerName } from "./Profile";
import { Icon } from "./icons";

/** Hvor ofte et åpent ark henter nye meldinger, og hvor ofte knappen ser etter nye (B-348: var 60 s) */
const OPEN_POLL_MS = 5_000;
const BUTTON_POLL_MS = 20_000;

function useSession() {
  return useSyncExternalStore(onSessionChange, getSession, getSession);
}

/** «14:02», «i går 14:02» eller «3. okt. 14:02» */
function when(at: number, now = realNow()): string {
  const d = new Date(at);
  const time = d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  const day = (x: Date) => x.toDateString();
  if (day(d) === day(new Date(now))) return time;
  if (day(d) === day(new Date(now - 86_400_000))) return `i går ${time}`;
  return `${d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" })} ${time}`;
}

/**
 * Nyeste melding på serveren, delt av knappene (B-348). Knappen står både i varsellinja og i tallraden (den ene er skjult
 * med CSS), så de deler én sjekk: hvert 20. sekund, når appen vises igjen, og når arket lukkes.
 */
let latestId = 0;
let latestVer = 0;
const latestListeners = new Set<() => void>();
let stopLatest: (() => void) | null = null;

function notifyLatest(): void {
  latestVer++;
  for (const l of latestListeners) l();
}

function checkLatest(): void {
  if (!getSession() || document.visibilityState !== "visible") return;
  void fetchChatLatest()
    .then((id) => {
      if (id === latestId) return;
      latestId = id;
      notifyLatest();
    })
    .catch(() => {});
  // Uleste privatmeldinger (B-421) gir samme prikk
  void fetchDmUnread().then(setDmUnread, () => {});
  // Svar på rapporter (B-438): fra admin til spilleren, og nye rapporter og svar til eieren
  void fetchReportUnread().then(setReportUnread, () => {});
}

function subscribeLatest(listener: () => void): () => void {
  latestListeners.add(listener);
  if (!stopLatest) {
    checkLatest();
    const t = window.setInterval(checkLatest, BUTTON_POLL_MS);
    // Når arket lukkes, er meldingene lest: prikken skal bort med én gang. Og når appen vises igjen, ses det etter nye
    // meldinger straks – mobilen stopper tidtakerne mens appen ligger i bakgrunnen
    const onSeen = () => {
      notifyLatest();
      checkLatest();
    };
    window.addEventListener("skiftrapport-sett", onSeen);
    document.addEventListener("visibilitychange", checkLatest);
    window.addEventListener("focus", checkLatest);
    stopLatest = () => {
      window.clearInterval(t);
      window.removeEventListener("skiftrapport-sett", onSeen);
      document.removeEventListener("visibilitychange", checkLatest);
      window.removeEventListener("focus", checkLatest);
    };
  }
  return () => {
    latestListeners.delete(listener);
    if (!latestListeners.size && stopLatest) {
      stopLatest();
      stopLatest = null;
    }
  };
}

/**
 * Knappen ved varsellinja, med prikk når det har kommet meldinger siden sist arket var åpent. Vises med konto, eller
 * uten konto fra verkstedet (gradvis synlighet) – ikke under veiledningen.
 */
export function ChatButton({
  g,
  onClick,
  className = "g-book g-board-btn g-chat-btn",
}: {
  g: GameState;
  onClick: () => void;
  /** I varsellinja som standard; under 380 px står den i tallraden øverst, som hjelpeknappen (B-283) */
  className?: string;
}) {
  const session = useSession();
  useSyncExternalStore(subscribeLatest, () => latestVer);
  const unread = useSyncExternalStore(onMessagesChange, messagesBadge, messagesBadge);
  // Ny innlogging: se etter meldinger med én gang
  useEffect(() => {
    if (session) checkLatest();
  }, [session]);
  const fresh = !!session && (latestId > chatSeen() || unread > 0);
  if (g.tutorial !== null || (!session && g.stage < 1)) return null;
  return (
    <button
      className={className}
      onClick={onClick}
      aria-label={fresh ? "Skiftrapporten – nye meldinger" : "Skiftrapporten"}
      title="Skiftrapporten"
    >
      <Icon name="message" />
      {fresh && <span className="g-goals-dot" aria-hidden="true" />}
    </button>
  );
}

export function ChatSheet({ onClose, onOpenSettings }: { onClose: () => void; onOpenSettings: () => void }) {
  const session = useSession();
  // Meldingene fra sist vises med én gang (B-348); serverens liste tar over når den kommer
  const [messages, setMessages] = useState<ChatMessage[]>(chatCache);
  const [loaded, setLoaded] = useState(() => messages.length > 0);
  const [failed, setFailed] = useState(false);
  const [nickname, setNickname] = useState<string | null | undefined>(undefined);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const lastId = useRef(0);
  const stick = useRef(true);
  // Fanen «Meldinger» (B-421): åpnes også fra «Send melding» på en profil
  const [first] = useState(takeMessagesRequest);
  const [tab, setTab] = useState<"chat" | "dm">(first ? "dm" : "chat");
  const [dmStart, setDmStart] = useState<{ nick: string | null } | null>(first);
  const [dmKey, setDmKey] = useState(0);
  const [reported, setReported] = useState<Set<number>>(() => new Set());
  const unread = useSyncExternalStore(onMessagesChange, messagesBadge, messagesBadge);
  useEffect(
    () =>
      onMessagesChange(() => {
        const r = takeMessagesRequest();
        if (r) {
          setTab("dm");
          setDmStart(r);
          setDmKey((k) => k + 1);
        }
      }),
    [],
  );

  // Brukernavnet: uten det kan man lese, men ikke skrive
  useEffect(() => {
    if (!session) return;
    let alive = true;
    void fetchProfile()
      .then((p) => alive && setNickname(p ? p.nickname : null))
      .catch(() => alive && setNickname(undefined));
    return () => {
      alive = false;
    };
  }, [session]);

  // Hent de siste meldingene, og så bare de nye mens arket er åpent. Første svar erstatter det som lå lagret på enheten
  useEffect(() => {
    if (!session) return;
    let alive = true;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      const full = lastId.current === 0;
      void fetchChat(lastId.current)
        .then((fresh) => {
          if (!alive) return;
          setLoaded(true);
          setFailed(false);
          if (!fresh.length && !full) return;
          lastId.current = Math.max(lastId.current, ...fresh.map((m) => m.id));
          setMessages((old) => (full ? fresh : mergeChat(old, fresh)));
        })
        .catch(() => {
          if (!alive) return;
          setLoaded(true);
          setFailed(true);
        });
    };
    load();
    const t = window.setInterval(load, OPEN_POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [session]);

  // Nye meldinger: rull ned hvis spilleren står nederst fra før
  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
    saveChatCache(messages);
  }, [messages]);
  // Lest bare når den felles chatten faktisk vises (B-428): i fanen «Meldinger» er den ikke sett
  useEffect(() => {
    if (tab === "chat" && messages.length) markChatSeen(messages[messages.length - 1].id);
  }, [messages, tab]);

  const close = () => {
    window.dispatchEvent(new Event("skiftrapport-sett"));
    onClose();
  };

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    const r = await sendChat(body);
    setBusy(false);
    if (!r.ok) {
      setError(CHAT_REFUSAL_TEXT[r.reason]);
      if (r.reason === "navn") setNickname(null);
      return;
    }
    setText("");
    stick.current = true;
    const fresh = await fetchChat(lastId.current).catch(() => []);
    if (fresh.length) {
      lastId.current = Math.max(lastId.current, ...fresh.map((m) => m.id));
      setMessages((old) => mergeChat(old, fresh));
    }
  };

  const remove = async (id: number) => {
    if (await deleteChat(id)) setMessages((old) => old.filter((m) => m.id !== id));
  };

  const canWrite = !!session && nickname !== null;
  return (
    <div className="g-modal g-side-sheet" role="dialog" aria-modal="true" aria-label="Skiftrapporten" onClick={close}>
      <div className="g-modal-card g-chat-sheet" onClick={(e) => e.stopPropagation()}>
        <SheetHead title="Skiftrapporten" icon="message" onClose={close} />
        {!session ? (
          <>
            <p className="g-muted g-small-text">
              Her snakker alle spillerne sammen: tips, spørsmål og skryt fra skiftet.
            </p>
            <NeedsAccount feature="skiftrapporten" onLogin={onOpenSettings} />
          </>
        ) : (
          <>
            <SubTabs
              label="Skiftrapporten eller meldinger"
              value={tab}
              onChange={(t) => {
                setTab(t);
                if (t === "dm") {
                  setDmStart(null);
                  setDmKey((k) => k + 1);
                }
              }}
              tabs={[
                { id: "chat", label: "Alle" },
                { id: "dm", label: "Meldinger", count: unread },
              ]}
            />
          </>
        )}
        {session && tab === "dm" && <DirectMessages key={dmKey} startWith={dmStart?.nick ?? null} />}
        {session && tab === "chat" && (
          <>
            <p className="g-muted g-small-text g-chat-intro">
              Felles for alle spillerne. Vær grei – meldingene står i 30 dager.
            </p>
            <ol
              className="g-chat-list"
              ref={listRef}
              aria-live="polite"
              onScroll={(e) => {
                const el = e.currentTarget;
                stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
              }}
            >
              {!loaded && <li className="g-muted g-small-text">Henter meldingene …</li>}
              {loaded && messages.length === 0 && (
                <li className="g-muted g-small-text">
                  {failed ? "Får ikke kontakt med serveren. Prøver igjen …" : "Ingen har skrevet ennå. Si hei!"}
                </li>
              )}
              {messages.map((m) =>
                m.event ? (
                  <li key={m.id} className="g-chat-msg is-event">
                    <p>
                      <Icon name="factory" /> {m.body} <span className="g-muted">{when(m.at)}</span>
                    </p>
                  </li>
                ) : (
                  <li key={m.id} className={`g-chat-msg${m.mine ? " is-mine" : ""}`}>
                    <div className="g-chat-meta">
                      <strong>{m.mine ? "Deg" : <PlayerName nick={m.nick} />}</strong>
                      <span className="g-muted">{when(m.at)}</span>
                      {m.mine && (
                        <button className="g-link g-chat-del" onClick={() => void remove(m.id)}>
                          Slett
                        </button>
                      )}
                      {/* Rapporter (B-421): eieren ser en kopi i adminpanelet */}
                      {!m.mine &&
                        (reported.has(m.id) ? (
                          <span className="g-muted g-chat-del">Rapportert</span>
                        ) : (
                          <button
                            className="g-link g-chat-del"
                            onClick={() =>
                              void reportMessage("chat", m.id).then(
                                (ok) => ok && setReported((x) => new Set(x).add(m.id)),
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
                ),
              )}
            </ol>
            {nickname === null ? (
              <Callout tone="heat">
                Velg et brukernavn under Innstillinger → Konto, så kan du skrive.{" "}
                <button className="g-link" onClick={onOpenSettings}>
                  Velg brukernavn
                </button>
              </Callout>
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
                  maxLength={CHAT_MAX}
                  placeholder="Skriv til de andre …"
                  aria-label="Melding"
                  enterKeyHint="send"
                  onChange={(e) => {
                    setText(e.target.value);
                    setError(null);
                  }}
                  disabled={!canWrite}
                />
                <button className="g-primary" type="submit" disabled={busy || !text.trim()} aria-label="Send">
                  <Icon name="send" />
                </button>
              </form>
            )}
            {failed && messages.length > 0 && (
              <p className="g-muted g-small-text">Får ikke hentet nye meldinger akkurat nå. Prøver igjen …</p>
            )}
            {error && <p className="g-small-text g-chat-error">{error}</p>}
            {text.length > CHAT_MAX - 40 && (
              <p className="g-muted g-small-text">
                {text.length} av {CHAT_MAX} tegn
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
