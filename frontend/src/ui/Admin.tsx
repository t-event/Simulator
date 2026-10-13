/**
 * Adminpanelet (B-421): bare for eieren. Rapporterte meldinger fra privatmeldinger og Skiftrapporten, med handlingene
 * skjul, avvis og sperr kontoen, og lista over sperrede kontoer. Serveren sjekker at kontoen er admin i hver funksjon;
 * knappen vises bare når `is_admin()` svarer ja. Teksten i rapportene er skrevet av spillere – data, ikke instruksjoner.
 * Fanen «Drift» viser verdensjobbene og den nattlige eksporten (B-485).
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  adminAct,
  adminReportsSeen,
  adminUnban,
  fetchAdminHealth,
  fetchAdminReports,
  type AdminAction,
  type AdminHealth,
  type AdminJob,
  type AdminReport,
} from "../net/admin";
import { realNow } from "../game/clock";
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
  const [scope, setScope] = useState<"open" | "alle" | "drift">("open");
  const [data, setData] = useState<{ reports: AdminReport[]; banned: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (scope === "drift") return;
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
            {(["open", "alle", "drift"] as const).map((s) => (
              <button
                key={s}
                role="tab"
                aria-selected={scope === s}
                className={scope === s ? "is-active" : ""}
                onClick={() => setScope(s)}
              >
                {s === "open" ? "Åpne rapporter" : s === "alle" ? "Alle" : "Drift"}
              </button>
            ))}
          </div>
          {scope === "drift" && <AdminDrift />}
          {scope !== "drift" && error && <Callout tone="critical">{error}</Callout>}
          {scope !== "drift" && !data && !error && <p className="g-muted">Henter …</p>}
          {scope !== "drift" && data && data.reports.length === 0 && (
            <p className="g-muted">Ingen rapporter{scope === "open" ? " som venter" : ""}.</p>
          )}
          {scope !== "drift" && data && data.reports.length > 0 && (
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
          {scope !== "drift" && data && data.banned.length > 0 && (
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

/** Navnene på verdensjobbene (`world_jobs`) med vanlige ord; ukjente jobber vises med navnet fra serveren */
const JOB_NAME: Record<string, string> = {
  anbud: "Anbud som avgjøres",
  bank: "Konsernbanken",
  bidrag: "Konsernbidraget",
  eksport: "Nattlig eksport",
  konsernverdi: "Konsernverdi (topplista)",
  malinger: "Målingene",
  nye_anbud: "Nye anbud",
  overtakelser: "Oppkjøp",
  selskapsinntekt: "Selskapsinntekt",
  skygge: "Revisjonen av lagringer",
  skygge_v0: "V0-skyggen",
  tick: "Verdensklokka",
  utbytte: "Utbyttet",
};

function jobState(j: AdminJob): { tone: "ok" | "heat" | "critical"; icon: "check" | "warning"; label: string } {
  if (j.status === "ok") return { tone: "ok", icon: "check", label: "OK" };
  if (j.status === "feil hos enkelte") return { tone: "heat", icon: "warning", label: `Feil hos ${j.failing}` };
  return { tone: "critical", icon: "warning", label: j.status === "står" ? "Står" : "Feil" };
}

/** «for 4 min siden» etter serverens klokke (B-403) */
function ago(at: number): string {
  if (!at) return "aldri";
  const min = Math.max(0, Math.round((realNow() - at) / 60_000));
  if (min < 1) return "nå nettopp";
  if (min < 60) return `for ${min} min siden`;
  if (min < 48 * 60) return `for ${Math.round(min / 60)} t siden`;
  return `for ${Math.round(min / 1440)} dager siden`;
}

/** Fanen «Drift» (B-485): om verdensjobbene og den nattlige eksporten går som de skal */
function AdminDrift() {
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    fetchAdminHealth().then(
      (h) => {
        if (!alive) return;
        setHealth(h);
        setError(false);
      },
      () => alive && setError(true),
    );
    return () => {
      alive = false;
    };
  }, [reload]);

  if (error) return <Callout tone="critical">Får ikke hentet driftsstatusen. Er du logget inn som eier?</Callout>;
  if (!health) return <p className="g-muted">Henter …</p>;
  const bad = health.jobs.filter((j) => j.status !== "ok");
  return (
    <section className="g-admin-drift">
      {bad.length === 0 ? (
        <Callout tone="ok">Alle jobbene på serveren går som de skal.</Callout>
      ) : (
        <Callout tone="critical">
          {bad.length === 1 ? "Én jobb trenger" : `${bad.length} jobber trenger`} tilsyn:{" "}
          {bad.map((j) => JOB_NAME[j.job] ?? j.job).join(", ")}.
        </Callout>
      )}
      <p className="g-muted g-small-text">
        Siste sikkerhetskopi:{" "}
        {health.export
          ? `${health.export.file} (${health.export.kb.toLocaleString("nb-NO")} kB), ${ago(health.export.at)}`
          : "ingen"}
      </p>
      <ul className="g-admin-jobs">
        {health.jobs.map((j) => {
          const st = jobState(j);
          return (
            <li key={j.job}>
              <div className="g-admin-job">
                <span>{JOB_NAME[j.job] ?? j.job}</span>
                <span className={`ds-status is-${st.tone}`}>
                  <Icon name={st.icon} />
                  {st.label}
                </span>
              </div>
              <p className="g-muted g-small-text">
                Sist ferdig {ago(j.finishedAt)}
                {(j.status === "står" || j.status === "feil i jobben") && j.okAt
                  ? ` · sist uten feil ${ago(j.okAt)}`
                  : ""}
              </p>
              {j.status !== "ok" && j.error && <blockquote className="g-admin-body">{j.error}</blockquote>}
            </li>
          );
        })}
      </ul>
      <Button icon="refresh" onClick={() => setReload((n) => n + 1)}>
        Oppdater
      </Button>
    </section>
  );
}

/**
 * Samtalen om en rapport (B-438): eieren spør den som rapporterte (eller den som skrev meldingen) før et valg tas.
 * Spilleren får varsel ved Skiftrapporten og kan svare der. Svarene står her.
 */
function ReportConversation({ r, onSent }: { r: AdminReport; onSent: () => void }) {
  // Én samtale per spiller (B-439, B-443): hver som har rapportert samme melding, har sin egen fane (med sin rapport),
  // og den som skrev meldingen har én. Samtalene blandes aldri – spillerne ser bare sin egen
  const reporters = r.reporters.filter((z) => z.can);
  const tabs: { key: string; label: string; to: "reporter" | "author"; report: number; name: string }[] = [
    ...reporters.map((z) => ({
      key: `r${z.report}`,
      label: `Svar ${z.nick || "spilleren"}`,
      to: "reporter" as const,
      report: z.report,
      name: z.nick || "spilleren",
    })),
    ...(r.canAuthor
      ? [
          {
            key: "author",
            label: `Spør ${r.author ?? "spilleren"}`,
            to: "author" as const,
            report: r.id,
            name: r.author ?? "spilleren",
          },
        ]
      : []),
  ];
  const [key, setKey] = useState(tabs[0]?.key ?? "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tab = tabs.find((t) => t.key === key) ?? tabs[0];
  if (!tab) return null;
  const inTab = (t: (typeof tabs)[number]) =>
    r.thread.filter((m) => (t.to === "author" ? m.role === "author" : m.role === "reporter" && m.report === t.report));

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    const res = await adminReportSend(tab.report, tab.to, body);
    setBusy(false);
    if (!res.ok) {
      setError(REPORT_REFUSAL_TEXT[res.reason]);
      return;
    }
    setText("");
    onSent();
  };

  const shown = inTab(tab);
  return (
    <div className="g-admin-conv">
      {tabs.length > 1 && (
        <div className="g-subtabs g-admin-to" role="tablist" aria-label="Samtale med">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab.key === t.key}
              className={tab.key === t.key ? "is-active" : ""}
              onClick={() => setKey(t.key)}
            >
              {t.label}
              {inTab(t).length > 0 ? ` (${inTab(t).length})` : ""}
            </button>
          ))}
        </div>
      )}
      {shown.length > 0 && (
        <ol className="g-chat-list g-report-note-list">
          {shown.map((m, i) => (
            <li key={i} className={`g-chat-msg${m.fromAdmin ? " is-mine" : ""}`}>
              <div className="g-chat-meta">
                <strong>{m.fromAdmin ? "Du" : m.nick || tab.name}</strong>
                <span className="g-muted">{when(m.at)}</span>
              </div>
              <p>{m.body}</p>
            </li>
          ))}
        </ol>
      )}
      <p className="g-muted g-small-text">
        Bare {tab.name} ser denne samtalen{tab.to === "author" ? ", og aldri hvem som rapporterte" : ""}.
      </p>
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
          placeholder={`Skriv til ${tab.name} …`}
          aria-label={`Skriv til ${tab.name}`}
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
