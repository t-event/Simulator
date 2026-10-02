/**
 * Profiler (B-419, fase 1): trykk på et brukernavn for å se spilleren – tittel, merker, konsernverdi og verk per region,
 * selskaper, sesonger og rekorder, og «sist aktiv» i grove trinn. Bare det serveren alt viser andre steder; aldri
 * konsernkassa eller kassa i eget verk. Krever konto (uten konto: NeedsAccount i arket, ikke skjult).
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { SISTER_TYPES } from "../game/konsern";
import { REGIONS } from "../game/regions";
import type { SisterType } from "../game/types";
import { BADGE_NAMES, levelLabel } from "../net/leaderboard";
import { fetchPlayerProfile, seenText, sinceText, type PlayerProfile, type ProfilePlant } from "../net/profile";
import { getSession, onSessionChange } from "../net/supabase";
import { NeedsAccount } from "./Account";
import { Callout, SheetHead } from "./ds";
import { fmtKr, fmtNum } from "./format";
import { Icon } from "./icons";
import { Place } from "./Place";
import { Portal } from "./Portal";
import { closeProfile, onProfileChange, openProfile, openProfileNick } from "./profileStore";

/** Et brukernavn som åpner profilen. `label` når teksten skal være noe annet enn navnet («Du», «Deg») */
export function PlayerName({ nick, label, className }: { nick: string; label?: string; className?: string }) {
  return (
    <button
      type="button"
      className={`g-player${className ? ` ${className}` : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        openProfile(nick);
      }}
      aria-label={`Se profilen til ${nick}`}
    >
      {label ?? nick}
    </button>
  );
}

/** Arket, montert én gang i GameApp */
export function ProfileHost({ onOpenSettings }: { onOpenSettings: () => void }) {
  const nick = useSyncExternalStore(onProfileChange, openProfileNick, openProfileNick);
  if (!nick) return null;
  return (
    <ProfileSheet
      key={nick}
      nick={nick}
      onClose={closeProfile}
      onOpenSettings={() => {
        closeProfile();
        onOpenSettings();
      }}
    />
  );
}

function ProfileSheet({
  nick,
  onClose,
  onOpenSettings,
}: {
  nick: string;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const [profile, setProfile] = useState<PlayerProfile | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    fetchPlayerProfile(nick).then(
      (p) => alive && setProfile(p),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [nick, session]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <Portal>
      <div
        className="g-modal g-profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Profilen til ${nick}`}
        onClick={onClose}
      >
        <div className="g-modal-card g-profile" onClick={(e) => e.stopPropagation()}>
          <SheetHead title={profile?.nick ?? nick} icon="user" onClose={onClose} />
          {profile && (
            <p className="g-profile-title">
              <strong>{levelLabel(profile)}</strong>
              {profile.me && <span className="g-muted"> · deg</span>}
            </p>
          )}
          {!session ? (
            <NeedsAccount feature="profiler" onLogin={onOpenSettings} />
          ) : failed ? (
            <Callout tone="critical">Får ikke hentet profilen nå. Prøv igjen om litt.</Callout>
          ) : profile === undefined ? (
            <p className="g-muted">Henter profilen …</p>
          ) : profile === null ? (
            <p className="g-muted">Fant ingen profil for {nick}.</p>
          ) : (
            <ProfileBody p={profile} />
          )}
        </div>
      </div>
    </Portal>
  );
}

function ProfileBody({ p }: { p: PlayerProfile }) {
  const seen = seenText(p.seen);
  const since = sinceText(p.since);
  const { storverkDay, ferdigDay, control } = p.records;
  const hasRecords = storverkDay !== null || ferdigDay !== null || (control ?? 0) > 0;
  return (
    <>
      {(seen || since) && (
        <p className="g-small-text g-muted g-profile-meta">
          {seen && <span>Sist aktiv {seen}</span>}
          {since && (
            <span>
              {seen ? "· " : ""}Med siden {since}
            </span>
          )}
        </p>
      )}
      {(p.badges.length > 0 || p.seasons.length > 0) && (
        <ul className="g-profile-chips">
          {p.seasons.map((s) => (
            <li key={s.name} className="g-chip">
              {s.plass <= 10 && <Icon name={s.plass === 1 ? "trophy" : "medal"} />} {s.name}: {s.plass}. plass
            </li>
          ))}
          {p.badges.map((b) => (
            <li key={b} className="g-chip">
              <Icon name="scroll-text" /> {BADGE_NAMES[b]}
            </li>
          ))}
        </ul>
      )}

      {p.konsern && (
        <section className="g-profile-section">
          <h3>Konsernet</h3>
          <div className="g-profile-stat">
            <span className="g-profile-rank">
              <Place plass={p.konsern.rank} />
              {p.konsern.rank > 3 && " plass"}
            </span>
            <span>
              <span className="g-muted g-small-text">Konsernverdi</span>
              <strong className="ds-display">{fmtKr(p.konsern.value)}</strong>
            </span>
          </div>
          <PlantsByRegion plants={p.konsern.plants} />
        </section>
      )}

      {p.companies.length > 0 && (
        <section className="g-profile-section">
          <h3>Eier</h3>
          <ul className="g-profile-list">
            {p.companies.map((c) => (
              <li key={c.name}>
                <Icon name="landmark" /> {c.name}
                {c.region && <span className="g-muted"> · {REGIONS.find((r) => r.id === c.region)?.name}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasRecords && (
        <section className="g-profile-section">
          <h3>Rekorder</h3>
          <ul className="g-profile-list">
            {storverkDay !== null && <li>Storverk på dag {fmtNum(storverkDay)}</li>}
            {ferdigDay !== null && <li>10 mrd. på dag {fmtNum(ferdigDay)}</li>}
            {(control ?? 0) > 0 && <li>Kontrollrommet: {fmtNum(control ?? 0)} poeng</li>}
          </ul>
        </section>
      )}

      {!p.konsern && p.companies.length === 0 && !hasRecords && (
        <p className="g-muted g-small-text">Har ikke bygd konsern ennå.</p>
      )}
    </>
  );
}

/** «Vestbukta: 3 stålkomplekser» med navnene under, i kartets rekkefølge */
function PlantsByRegion({ plants }: { plants: ProfilePlant[] }) {
  if (!plants.length) return <p className="g-muted g-small-text">Ingen datterverk ennå.</p>;
  const groups = REGIONS.map((r) => ({ region: r, plants: plants.filter((p) => p.region === r.id) })).filter(
    (x) => x.plants.length,
  );
  const unknown = plants.filter((p) => !p.region);
  if (unknown.length) groups.push({ region: { id: "nord", name: "Uten region", about: "" }, plants: unknown });
  return (
    <ul className="g-profile-regions">
      {groups.map(({ region, plants: ps }) => (
        <li key={region.name}>
          <strong>{region.name}</strong>
          <span className="g-muted g-small-text">{countText(ps)}</span>
          <span className="g-small-text">{ps.map((p) => `${p.name}${p.building ? " (bygges)" : ""}`).join(", ")}</span>
        </li>
      ))}
    </ul>
  );
}

const PLURAL: Record<SisterType, string> = { stalverk: "stålverk", storverk: "storverk", kompleks: "stålkomplekser" };

function countText(ps: ProfilePlant[]): string {
  const types: SisterType[] = ["kompleks", "storverk", "stalverk"];
  return types
    .map((t) => {
      const n = ps.filter((p) => p.type === t).length;
      if (!n) return null;
      return `${n} ${n === 1 ? SISTER_TYPES[t].name.toLowerCase() : PLURAL[t]}`;
    })
    .filter(Boolean)
    .join(", ");
}
