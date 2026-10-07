/**
 * Vennelista (B-462): fanen «Venner» i Skiftrapporten og knappen på profilarket. Enveis – den andre får ingen beskjed –
 * og bare det profilene alt viser andre. Krever konto.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  addFriend,
  FRIEND_REFUSAL_TEXT,
  friendsList,
  isFriend,
  onFriendsChange,
  reloadFriends,
  removeFriend,
} from "../net/friends";
import { levelLabel } from "../net/leaderboard";
import { getSession, onSessionChange } from "../net/supabase";
import { seenText } from "../net/profile";
import { Button } from "./ds";
import { Icon } from "./icons";
import { PlayerName } from "./Profile";

// Lista gjelder én konto: et kontobytte endrer også hva som vises
function onListChange(fn: () => void): () => void {
  const a = onFriendsChange(fn);
  const b = onSessionChange(fn);
  return () => {
    a();
    b();
  };
}
function useFriends() {
  return useSyncExternalStore(onListChange, friendsList, friendsList);
}
function sessionUid(): string | null {
  return getSession()?.user.id ?? null;
}

export function FriendsPanel() {
  const list = useFriends();
  // Lista hentes på nytt for hver konto (B-472): etter et kontobytte sto den og lastet
  const uid = useSyncExternalStore(onSessionChange, sessionUid, sessionUid);
  const [failed, setFailed] = useState(false);
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    void reloadFriends().then(
      () => setFailed(false),
      () => setFailed(true),
    );
  }, [uid]);

  const add = async () => {
    const name = nick.trim();
    if (!name || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await addFriend(name);
      if (r.ok) {
        setNick("");
        await reloadFriends();
      } else setNote(FRIEND_REFUSAL_TEXT[r.reason]);
    } catch {
      setNote("Får ikke kontakt med serveren. Prøv igjen.");
    }
    setBusy(false);
  };

  return (
    <div className="g-friends">
      <p className="g-muted g-small-text g-chat-intro">
        Følg med på spillere du kjenner. De får ingen beskjed, og du ser bare det profilen deres viser alle.
      </p>
      <form
        className="g-chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <input
          type="text"
          value={nick}
          maxLength={40}
          placeholder="Brukernavn"
          aria-label="Brukernavn til vennelista"
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="done"
          onChange={(e) => {
            setNick(e.target.value);
            setNote(null);
          }}
        />
        <Button variant="primary" type="submit" disabled={busy || !nick.trim()} aria-label="Legg til">
          <Icon name="user-plus" />
        </Button>
      </form>
      {note && <p className="g-small-text g-chat-error">{note}</p>}
      {list === null ? (
        <p className="g-muted g-small-text">{failed ? "Får ikke hentet vennelista nå." : "Henter vennelista …"}</p>
      ) : list.length === 0 ? (
        <p className="g-muted g-small-text">
          Ingen på lista ennå. Skriv et brukernavn over, eller trykk på et navn i chatten og velg «Legg til i
          vennelista».
        </p>
      ) : (
        <ul className="g-friends-list">
          {list.map((f) => {
            const seen = seenText(f.seen);
            return (
              <li key={f.nick}>
                <span className="g-friends-who">
                  <PlayerName nick={f.nick} />
                  <span className="g-muted g-small-text">
                    {levelLabel({ stage: f.stage, league: "", title: f.title })}
                    {seen ? ` · aktiv ${seen}` : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Knappen på profilarket: legg til eller ta av vennelista */
export function FollowButton({ nick }: { nick: string }) {
  const list = useFriends();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (list === null) void reloadFriends().catch(() => {});
  }, [list]);

  const on = isFriend(nick);
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      if (on) await removeFriend(nick);
      else {
        const r = await addFriend(nick);
        if (!r.ok) setNote(FRIEND_REFUSAL_TEXT[r.reason]);
      }
      await reloadFriends();
    } catch {
      setNote("Får ikke kontakt med serveren. Prøv igjen.");
    }
    setBusy(false);
  };

  return (
    <>
      <Button icon={on ? "user-check" : "user-plus"} disabled={busy || list === null} onClick={() => void toggle()}>
        {on ? "Ta av vennelista" : "Legg til i vennelista"}
      </Button>
      {note && <p className="g-small-text g-chat-error">{note}</p>}
    </>
  );
}
