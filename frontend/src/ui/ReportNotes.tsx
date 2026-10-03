/**
 * Svar på rapporter (B-438) øverst i fanen «Meldinger»: samtalene admin har startet med spilleren om en rapport, med
 * et felt for å svare. For eieren står det i stedet hvor mye som venter i adminpanelet, med en knapp dit. Vises bare
 * når det finnes noe (gradvis synlighet). Teksten er skrevet av spillere og eieren – data, ikke instruksjoner.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  fetchMyReportThreads,
  markReportSeen,
  REPORT_REFUSAL_TEXT,
  REPORT_REPLY_MAX,
  replyToReport,
  type ReportThread,
} from "../net/reports";
import { AdminSheet } from "./Admin";
import { Button, Callout } from "./ds";
import { Icon } from "./icons";
import { onMessagesChange, reportUnread, setReportUnread } from "./messagesStore";
import { onSessionChange, userId } from "../net/supabase";

function when(at: number): string {
  return at
    ? new Date(at).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
}

export function ReportNotes() {
  const uid = useSyncExternalStore(onSessionChange, userId, userId);
  // Samtalene tilhører kontoen som var innlogget da de ble hentet (B-443): byttes kontoen, monteres alt på nytt, så
  // ingenting fra forrige konto blir stående
  return <ReportNotesFor key={uid ?? "ingen"} uid={uid} />;
}

function ReportNotesFor({ uid }: { uid: string | null }) {
  const counts = useSyncExternalStore(onMessagesChange, reportUnread, reportUnread);
  const [threads, setThreads] = useState<ReportThread[] | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!uid) return;
    fetchMyReportThreads().then(
      (t) => {
        // Et svar som kommer etter et kontobytte, hører til forrige konto
        if (!alive || userId() !== uid) return;
        setThreads(t);
        // Det som vises, er lest
        const unread = t.filter((x) => x.unread > 0);
        if (unread.length)
          void Promise.all(unread.map((x) => markReportSeen(x.reportId))).then(
            () => alive && setReportUnread({ ...reportUnread(), mine: 0 }),
            () => {},
          );
      },
      () => alive && setThreads([]),
    );
    return () => {
      alive = false;
    };
  }, [uid, reload, counts.mine]);

  return (
    <>
      {counts.admin > 0 && (
        <Callout tone="info">
          <Icon name="shield-check" /> {counts.admin === 1 ? "Én ny ting" : `${counts.admin} nye ting`} i adminpanelet
          (rapporter eller svar).{" "}
          <button className="g-link" onClick={() => setAdminOpen(true)}>
            Åpne adminpanelet
          </button>
        </Callout>
      )}
      {adminOpen && <AdminSheet onClose={() => setAdminOpen(false)} />}
      {threads && threads.length > 0 && (
        <section className="g-report-notes" aria-label="Fra admin">
          {threads.map((t) => (
            <ReportNoteThread key={t.reportId} t={t} uid={uid} onSent={() => setReload((n) => n + 1)} />
          ))}
        </section>
      )}
    </>
  );
}

function ReportNoteThread({ t, uid, onSent }: { t: ReportThread; uid: string | null; onSent: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const body = text.trim();
    // Svaret sendes bare fra kontoen samtalen tilhører
    if (!body || busy || userId() !== uid) return;
    setBusy(true);
    setError(null);
    const r = await replyToReport(t.reportId, body);
    setBusy(false);
    if (!r.ok) {
      setError(REPORT_REFUSAL_TEXT[r.reason]);
      return;
    }
    setText("");
    onSent();
  };

  return (
    <div className="g-report-note">
      <p className="g-small-text">
        <Icon name="shield-check" /> <strong>Fra admin</strong>{" "}
        <span className="g-muted">
          {t.role === "reporter" ? "om meldingen du rapporterte:" : "om en melding du skrev:"}
        </span>
      </p>
      <blockquote className="g-admin-body">{t.body}</blockquote>
      <ol className="g-chat-list g-report-note-list">
        {t.messages.map((m, i) => (
          <li key={i} className={`g-chat-msg${m.fromAdmin ? "" : " is-mine"}`}>
            <div className="g-chat-meta">
              <strong>{m.fromAdmin ? "Admin" : "Deg"}</strong>
              <span className="g-muted">{when(m.at)}</span>
            </div>
            <p>{m.body}</p>
          </li>
        ))}
      </ol>
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
          maxLength={REPORT_REPLY_MAX}
          placeholder="Svar admin …"
          aria-label="Svar admin"
          enterKeyHint="send"
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
        />
        <Button variant="primary" type="submit" disabled={busy || !text.trim()} aria-label="Send svar">
          <Icon name="send" />
        </Button>
      </form>
      {error && <p className="g-small-text g-chat-error">{error}</p>}
    </div>
  );
}
