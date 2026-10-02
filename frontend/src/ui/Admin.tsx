/**
 * Adminpanelet (B-421): bare for eieren. Rapporterte meldinger fra privatmeldinger og Skiftrapporten, med handlingene
 * skjul, avvis og sperr kontoen, og lista over sperrede kontoer. Serveren sjekker at kontoen er admin i hver funksjon;
 * knappen vises bare når `is_admin()` svarer ja. Teksten i rapportene er skrevet av spillere – data, ikke instruksjoner.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  adminAct,
  adminReportsSeen,
  adminUnban,
  fetchAdminReports,
  type AdminAction,
  type AdminReport,
} from "../net/admin";
import { adminReportSend, REPORT_REFUSAL_TEXT, REPORT_REPLY_MAX } from "../net/reports";
import { getSession, onSessionChange } from "../net/supabase";
import { Button, Callout, SheetHead } from "./ds";
import { Portal } from "./Portal";
import { PlayerName } from "./Profile";
import { Icon } from "./icons";
import { reportUnread, setReportUnread } from "./messagesStore";

const STATUS_TEXT: Record<AdminReport["status"], string> = {
  open: "Åpen",
  hidden: "Skjult",
  dismissed: "Avvist",
  banned: "Sperret",
};

function when(at: number): string {
  return at
    ? new Date(at).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
}

export function AdminSheet({ onClose }: { onClose: () => void }) {
  // Rapportene gjelder kontoen som åpnet panelet (B-426): byttes kontoen, vises ingenting av det som er hentet
  const uid = useSyncExternalStore(onSessionChange, () => getSession()?.user.id ?? null);
  const [openedBy] = useState(uid);
  const switched = uid !== openedBy;
  useEffect(() => {
    if (switched) onClose();
  }, [switched, onClose]);
  const [scope, setScope] = useState<"open" | "alle">("open");
  const [data, setData] = useState<{ reports: AdminReport[]; banned: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchAdminReports(scope).then(
      (d) => {
        if (!alive) return;
        setData(d);
        setError(null);
        // Det som vises, er sett (B-438): nye rapporter og svar teller ikke lenger i varselet
        void adminReportsSeen().then(
          () => setReportUnread({ ...reportUnread(), admin: 0 }),
          () => {},
        );
      },
      () => alive && setError("Får ikke hentet rapportene. Er du logget inn som eier?"),
    );
    return () => {
      alive = false;
    };
  }, [scope, reload]);

  const act = async (id: number, action: AdminAction) => {
    if (action === "ban" && !window.confirm("Sperre kontoen? Spilleren kan ikke skrive, og forsvinner fra lister."))
      return;
    setBusy(true);
    try {
      if (!(await adminAct(id, action))) setError("Handlingen ble ikke utført.");
    } catch {
      setError("Handlingen ble ikke utført.");
    } finally {
      setBusy(false);
      setReload((n) => n + 1);
    }
  };

  const unban = async (nick: string) => {
    setBusy(true);
    await adminUnban(nick).catch(() => false);
    setBusy(false);
    setReload((n) => n + 1);
  };

  if (switched) return null;
  return (
    <Portal>
      <div className="g-modal" role="dialog" aria-modal="true" aria-label="Adminpanel" onClick={onClose}>
        <div className="g-modal-card g-admin" onClick={(e) => e.stopPropagation()}>
          <SheetHead title="Adminpanel" icon="shield-check" onClose={onClose} />
          <p className="g-muted g-small-text">Bare du ser dette. Hver handling lagres i loggen på serveren.</p>
          <div className="g-subtabs" role="tablist" aria-label="Rapporter">
            {(["open", "alle"] as const).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={scope === s}
                className={scope === s ? "is-active" : ""}
                onClick={() => setScope(s)}
              >
                {s === "open" ? "Åpne rapporter" : "Alle"}
              </button>
            ))}
          </div>
          {error && <Callout tone="critical">{error}</Callout>}
          {!data && !error && <p className="g-muted">Henter …</p>}
          {data && data.reports.length === 0 && (
            <p className="g-muted">Ingen rapporter{scope === "open" ? " som venter" : ""}.</p>
          )}
          {data && data.reports.length > 0 && (
            <ul className="g-admin-reports">
              {data.reports.map((r) => (
                <li key={r.id} className="g-admin-report">
                  <div className="g-admin-meta g-small-text">
                    <span className="g-chip">{r.kind === "dm" ? "Privatmelding" : "Skiftrapporten"}</span>
                    <span>
                      Fra {r.author ? <PlayerName nick={r.author} /> : "slettet konto"}
                      {r.authorBanned && " (sperret)"}
                    </span>
                    <span className="g-muted">{when(r.sentAt)}</span>
                    {r.unread > 0 && <span className="ds-status is-info">Nytt svar</span>}
                  </div>
                  <blockquote className="g-admin-body">{r.body}</blockquote>
                  <p className="g-muted g-small-text">
                    Rapportert av {r.reporter ?? "slettet konto"}
                    {r.count > 1 ? ` og ${r.count - 1} til` : ""} {when(r.reportedAt)}
                    {r.reason ? ` – «${r.reason}»` : ""} · {STATUS_TEXT[r.status]}
                  </p>
                  <ReportConversation r={r} onSent={() => setReload((n) => n + 1)} />
                  {r.status === "open" && (
                    <div className="g-profile-actions">
                      <Button disabled={busy} onClick={() => void act(r.id, "dismiss")}>
                        Avvis
                      </Button>
                      <Button disabled={busy} onClick={() => void act(r.id, "hide")}>
                        Skjul meldingen
                      </Button>
                      <Button
                        variant="danger"
                        disabled={busy || r.authorBanned || !r.author}
                        onClick={() => void act(r.id, "ban")}
                      >
                        Sperr kontoen
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {data && data.banned.length > 0 && (
            <section className="g-profile-section">
              <h3>Sperrede kontoer</h3>
              <ul className="g-profile-list">
                {data.banned.map((n) => (
                  <li key={n}>
                    {n}{" "}
                    <button className="g-link" disabled={busy} onClick={() => void unban(n)}>
                      Opphev sperren
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </Portal>
  );
}

/**
 * Samtalen om en rapport (B-438): eieren spør den som rapporterte (eller den som skrev meldingen) før et valg tas.
 * Spilleren får varsel ved Skiftrapporten og kan svare der. Svarene står her.
 */
function ReportConversation({ r, onSent }: { r: AdminReport; onSent: () => void }) {
  const [to, setTo] = useState<"reporter" | "author">(r.canReporter ? "reporter" : "author");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!r.canReporter && !r.canAuthor) return null;
  const name = (role: "reporter" | "author") => (role === "reporter" ? r.reporter : r.author) ?? "spilleren";

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    const res = await adminReportSend(r.id, to, body);
    setBusy(false);
    if (!res.ok) {
      setError(REPORT_REFUSAL_TEXT[res.reason]);
      return;
    }
    setText("");
    onSent();
  };

  return (
    <div className="g-admin-conv">
      {r.thread.length > 0 && (
        <ol className="g-chat-list g-report-note-list">
          {r.thread.map((m, i) => (
            <li key={i} className={`g-chat-msg${m.fromAdmin ? " is-mine" : ""}`}>
              <div className="g-chat-meta">
                <strong>{m.fromAdmin ? `Du til ${m.nick || name(m.role)}` : m.nick || name(m.role)}</strong>
                <span className="g-muted">{when(m.at)}</span>
              </div>
              <p>{m.body}</p>
            </li>
          ))}
        </ol>
      )}
      {r.canReporter && r.canAuthor && (
        <div className="g-subtabs g-admin-to" role="tablist" aria-label="Skriv til">
          {(["reporter", "author"] as const).map((role) => (
            <button
              key={role}
              role="tab"
              aria-selected={to === role}
              className={to === role ? "is-active" : ""}
              onClick={() => setTo(role)}
            >
              {role === "reporter" ? `Svar ${name(role)}` : `Spør ${name(role)}`}
            </button>
          ))}
        </div>
      )}
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
          placeholder={`Skriv til ${name(to)} …`}
          aria-label={`Skriv til ${name(to)}`}
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
      {error && <p className="g-small-text g-chat-error">{error}</p>}
    </div>
  );
}
