/**
 * Fellesprosjektene på Konsern → Oversikt (B-508): prosjektet i regionene der du har verk, med målet, fristen, de tre som
 * har gitt mest (andel, aldri beløp) og et beløpsfelt med bekreftelse. Vises bare for kontoer med ferdige datterverk og
 * når serveren har slått prosjektene på (gradvis synlighet). Alt avgjøres på serveren (`project_give`).
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { regionName } from "../game/regions";
import { realNow } from "../game/clock";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import {
  fetchProjects,
  GIVE_REFUSAL_TEXT,
  giveToProject,
  type ProjectStatus,
  type RegionProject,
} from "../net/projects";
import { getSession, onSessionChange, userId } from "../net/supabase";
import { millions, millText } from "./amount";
import { isMine } from "./claims";
import { Bar, Card } from "./common";
import { Button } from "./ds";
import { fmtKr } from "./format";
import { Icon, type IconName } from "./icons";
import { MillInput } from "./MillInput";
import { PlayerName } from "./Profile";

type Act = GameApi["act"];

/** Ikonet til hver type prosjekt (navnet kommer fra serveren) */
const KIND_ICON: Record<string, IconName> = {
  kraftlinje: "zap",
  kai: "anchor",
  skrapterminal: "recycle",
  jernbane: "train-track",
  fagskole: "school",
  fjernvarme: "flame",
};

const pct = (x: number) => `${Math.floor(x * 100)} %`;

/** Tid til fristen med vanlige ord: «12 dager», «20 t» */
function fmtDeadline(ms: number): string {
  const h = Math.max(0, Math.floor(ms / 3_600_000));
  if (h >= 48) return `${Math.floor(h / 24)} dager`;
  if (h >= 1) return `${h} t`;
  return "under en time";
}

function useUser(): string | null {
  return useSyncExternalStore(onSessionChange, getSession, getSession)?.user.id ?? null;
}

function OpenProject({
  p,
  s,
  busy,
  onGive,
}: {
  p: RegionProject;
  s: ProjectStatus;
  busy: boolean;
  onGive: (p: RegionProject, amount: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const left = Math.max(0, p.goal - p.total);
  const kr = Math.min(millions(amount), left);
  const tooSmall = kr > 0 && kr < Math.min(s.minGift, left);
  const tooBig = kr > s.balance;
  return (
    <section className="g-project">
      <h3 className="g-project-title">
        <Icon name={KIND_ICON[p.kind] ?? "landmark"} /> {p.name}{" "}
        <span className="g-muted">· {regionName(p.region)}</span>
      </h3>
      <Bar value={p.total / p.goal} tone="ok" label={`${fmtKr(p.total)} av ${fmtKr(p.goal)}`} />
      <p className="g-small-text g-muted">
        {pct(p.total / p.goal)} av målet · frist om {fmtDeadline(p.deadline - realNow())} ·{" "}
        {p.givers === 1 ? "1 konsern har gitt" : `${p.givers} konsern har gitt`}
      </p>
      {p.top.length > 0 && (
        <ol className="g-project-top">
          {p.top.map((t, i) => (
            <li key={i} className={t.mine ? "is-mine" : ""}>
              {t.mine ? <strong>Du</strong> : <PlayerName nick={t.nick} />}{" "}
              <span className="g-muted">{pct(t.share)}</span>
            </li>
          ))}
        </ol>
      )}
      {p.mine > 0 && (
        <p className="g-small-text">
          Du har gitt <strong>{fmtKr(p.mine)}</strong>
          {p.myRank ? ` og er nr. ${p.myRank}` : ""}
          {p.mine < p.goal * s.badgeShare ? ` – ${fmtKr(p.goal * s.badgeShare - p.mine)} til merket` : ""}.
        </p>
      )}
      <div className="g-row g-amount-row">
        <MillInput
          value={amount}
          onChange={(v) => {
            setAmount(v);
            setPending(null);
          }}
          placeholder={Math.max(s.minGift, Math.min(left, Math.ceil((p.goal * s.badgeShare) / 1e6) * 1e6))}
          label="Beløp i millioner kroner"
        />
        <button className="g-primary" disabled={busy || kr <= 0 || tooSmall || tooBig} onClick={() => setPending(kr)}>
          Gi
        </button>
      </div>
      {(tooSmall || tooBig) && (
        <p className="g-small-text g-bid-preview is-bad">
          {tooBig
            ? `Konsernkassa har ${fmtKr(s.balance)}.`
            : `Det minste du kan gi, er ${fmtKr(s.minGift)} – skriv ${millText(s.minGift)}.`}
        </p>
      )}
      {pending !== null && (
        <div className="g-confirm" role="alertdialog" aria-label="Bekreft">
          <p className="g-small-text">
            Gi <strong>{fmtKr(pending)}</strong> fra konsernkassa til «{p.name}»? Når målet nås, er pengene brukt. Nås
            det ikke innen fristen, får du halvparten tilbake.
          </p>
          <div className="g-row g-confirm-actions">
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => {
                onGive(p, pending);
                setPending(null);
                setAmount("");
              }}
            >
              Bekreft
            </Button>
            <Button onClick={() => setPending(null)}>Avbryt</Button>
          </div>
        </div>
      )}
    </section>
  );
}

function SettledProject({ p }: { p: RegionProject }) {
  const top = p.top[0];
  return (
    <section className="g-project is-settled">
      <h3 className="g-project-title">
        <Icon name={p.status === "ferdig" ? "check" : "clock"} /> {p.name}{" "}
        <span className="g-muted">· {regionName(p.region)}</span>
      </h3>
      {p.status === "ferdig" ? (
        <p className="g-small-text">
          Ferdig!{" "}
          {top &&
            (top.mine ? (
              <strong>Du er hovedbidragsyter.</strong>
            ) : (
              <>
                Hovedbidragsyter: <PlayerName nick={top.nick} />.
              </>
            ))}
          {p.myRank === 2 ? " Du ga nest mest." : ""}
          {p.mine > 0 && (p.myRank ?? 9) <= 2 && p.boostUntil && p.boostUntil > realNow()
            ? ` Regionmester-styrken din i ${regionName(p.region)} er høyere i ${fmtDeadline(p.boostUntil - realNow())} til.`
            : ""}
        </p>
      ) : (
        <p className="g-small-text">
          Nådde ikke målet ({pct(p.total / p.goal)}).
          {p.mine > 0 ? ` Du fikk ${fmtKr(p.refunded ?? p.mine / 2)} tilbake i konsernkassa.` : ""}
        </p>
      )}
    </section>
  );
}

/** Kortet på Konsern → Oversikt */
export function ProjectsCard({ g, act }: { g: GameState; act: Act }) {
  const user = useUser();
  const [s, setS] = useState<ProjectStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const hasPlants = g.konsern.plants.some((p) => p.project?.kind !== "bygg");
  const load = useCallback(() => {
    const uid = userId();
    return fetchProjects().then(
      (r) => uid === userId() && setS(r),
      () => {},
    );
  }, []);
  useEffect(() => {
    if (!user || !hasPlants) return;
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [user, hasPlants, load]);
  if (!user || !hasPlants || !s?.enabled) return null;
  const mine = (p: RegionProject) => s.myRegions.includes(p.region);
  const open = s.projects.filter((p) => p.status === "apen" && mine(p));
  const settled = s.projects.filter((p) => p.status !== "apen" && (mine(p) || p.mine > 0));
  const elsewhere = s.projects.filter((p) => p.status === "apen" && !mine(p));
  if (!open.length && !settled.length) return null;
  const give = async (p: RegionProject, amount: number) => {
    const uid = userId();
    setBusy(true);
    setMsg(null);
    const r = await giveToProject(p.id, amount);
    setBusy(false);
    if (!r.ok) {
      setMsg(GIVE_REFUSAL_TEXT[r.reason]);
      return;
    }
    // Kassa i spillet følger serverens svar, men bare i spillet til kontoen som ga (B-426)
    act((gg) => {
      if (isMine(gg, uid) && gg.konsern.treasury) gg.konsern.treasury = { ...gg.konsern.treasury, balance: r.balance };
    });
    setMsg(
      r.done ? `${fmtKr(r.amount)} gitt – «${p.name}» er ferdig!` : `${fmtKr(r.amount)} gitt til «${p.name}». Takk!`,
    );
    void load();
  };
  return (
    <div className="g-col g-konsern-projects-col">
      <Card title="Fellesprosjekter" className="g-konsern-projects">
        <p className="g-small-text g-muted">
          Konsernene i en region samler penger til et stort prosjekt. Den som gir mest, blir hovedbidragsyter og får{" "}
          {Math.round(s.boostTop1 * 100)} % mer regionmester-styrke der i {s.boostDays} dager (nr. to{" "}
          {Math.round(s.boostTop2 * 100)} %). Nås ikke målet innen fristen, får alle halvparten tilbake.
        </p>
        {msg && (
          <p className="g-small-text" role="status">
            {msg}
          </p>
        )}
        {open.map((p) => (
          <OpenProject key={p.id} p={p} s={s} busy={busy} onGive={(pp, a) => void give(pp, a)} />
        ))}
        {settled.map((p) => (
          <SettledProject key={p.id} p={p} />
        ))}
        {elsewhere.length > 0 && (
          <p className="g-small-text g-muted">
            Også åpne: {elsewhere.map((p) => `${p.name} (${regionName(p.region)})`).join(", ")}.
          </p>
        )}
      </Card>
    </div>
  );
}
