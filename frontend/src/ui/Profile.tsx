/**
 * Profiler (B-419, fase 1): trykk på et brukernavn for å se spilleren – tittel, merker, konsernverdi og verk per region,
 * selskaper, sesonger og rekorder, og «sist aktiv» i grove trinn. Bare det serveren alt viser andre steder; aldri
 * konsernkassa eller kassa i eget verk. Krever konto (uten konto: NeedsAccount i arket, ikke skjult).
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { ACHIEVEMENT_BY_ID, hasAchievement, visibleAchievements } from "../game/achievements";
import { COSMETIC_BY_ID } from "../game/cosmetics";
import { SISTER_TYPES } from "../game/konsern";
import { REGIONS } from "../game/regions";
import type { GameState, SisterType } from "../game/types";
import { BADGE_NAMES, levelLabel } from "../net/leaderboard";
import {
  BIO_MAX,
  fetchPlayerProfile,
  fetchProfileSettings,
  saveProfileSettings,
  seenText,
  sinceText,
  type PlayerProfile,
  type ProfilePlant,
  type ProfileSettings,
} from "../net/profile";
import { getSession, onSessionChange } from "../net/supabase";
import { NeedsAccount } from "./Account";
import { Button, Callout, SheetHead } from "./ds";
import { fmtKr, fmtNum } from "./format";
import { Icon } from "./icons";
import { Place } from "./Place";
import { Portal } from "./Portal";
import { openMessages } from "./messagesStore";
import { closeProfile, onProfileChange, openProfile, openProfileNick, profileStartsInEdit } from "./profileStore";

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
export function ProfileHost({ g, onOpenSettings }: { g: GameState; onOpenSettings: () => void }) {
  const nick = useSyncExternalStore(onProfileChange, openProfileNick, openProfileNick);
  if (!nick) return null;
  return (
    <ProfileSheet
      key={nick}
      g={g}
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
  g,
  nick,
  onClose,
  onOpenSettings,
}: {
  g: GameState;
  nick: string;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const [profile, setProfile] = useState<PlayerProfile | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(profileStartsInEdit);
  const [reload, setReload] = useState(0);

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
  }, [nick, session, reload]);

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
          ) : editing && profile.me ? (
            <ProfileEditor
              g={g}
              onDone={(saved) => {
                setEditing(false);
                if (saved) setReload((n) => n + 1);
              }}
            />
          ) : (
            <>
              <ProfileBody p={profile} />
              {!profile.me && profile.dm && (
                <div className="g-profile-actions">
                  <Button
                    variant="primary"
                    icon="message"
                    onClick={() => {
                      closeProfile();
                      openMessages(profile.nick);
                    }}
                  >
                    Send melding
                  </Button>
                </div>
              )}
              {profile.me && (
                <div className="g-profile-actions">
                  <Button icon="paint-roller" onClick={() => setEditing(true)}>
                    Rediger profilen
                  </Button>
                </div>
              )}
            </>
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
  const emblem = p.emblem ? COSMETIC_BY_ID[p.emblem] : undefined;
  const shown = p.showcase.map((id) => ACHIEVEMENT_BY_ID[id]).filter((a) => !!a);
  return (
    <>
      {(p.bio || emblem) && (
        <div className="g-profile-about">
          {emblem && (
            <span className="g-chip g-profile-emblem">
              <Icon name={emblem.icon} /> {emblem.name}
            </span>
          )}
          {p.bio && <p className="g-profile-bio">{p.bio}</p>}
        </div>
      )}
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

      {shown.length > 0 && (
        <section className="g-profile-section">
          <h3>Utvalgte prestasjoner</h3>
          <ul className="g-profile-list">
            {shown.map((a) => (
              <li key={a.id}>
                <Icon name={a.icon} /> <strong>{a.name}</strong>{" "}
                <span className="g-muted g-small-text">{a.description}</span>
              </li>
            ))}
          </ul>
        </section>
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

/**
 * Min profil (B-420): kort tekst, profilmerke (pynt du eier) og tre prestasjoner du har. Serveren sjekker alt på nytt
 * (`profile_update`) og sier nei til lenker og for lang tekst.
 */
function ProfileEditor({ g, onDone }: { g: GameState; onDone: (saved: boolean) => void }) {
  const [form, setForm] = useState<ProfileSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchProfileSettings().then(
      (s) => alive && setForm(s ?? { bio: "", emblem: null, showcase: [], dmOpen: false }),
      () => alive && setError("Får ikke hentet profilen nå. Prøv igjen om litt."),
    );
    return () => {
      alive = false;
    };
  }, []);

  if (!form) return error ? <Callout tone="critical">{error}</Callout> : <p className="g-muted">Henter profilen …</p>;
  const cosmetics = g.cosmetics.owned.map((id) => COSMETIC_BY_ID[id]).filter((c) => !!c);
  const achievements = visibleAchievements(g).filter((a) => hasAchievement(g, a.id));
  const toggle = (id: string) => {
    const on = form.showcase.includes(id);
    if (!on && form.showcase.length >= 3) return;
    setForm({ ...form, showcase: on ? form.showcase.filter((x) => x !== id) : [...form.showcase, id] });
  };
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveProfileSettings(form);
      onDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fikk ikke lagret profilen.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="g-profile-edit"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label className="g-field">
        <span>
          Om deg{" "}
          <span className="g-muted g-small-text">
            ({form.bio.length}/{BIO_MAX}, ingen lenker)
          </span>
        </span>
        <textarea
          rows={3}
          maxLength={BIO_MAX}
          value={form.bio}
          placeholder="F.eks. hva verket ditt er kjent for"
          onChange={(e) => {
            setError(null);
            setForm({ ...form, bio: e.target.value });
          }}
        />
      </label>
      {cosmetics.length > 0 && (
        <label className="g-field">
          Profilmerke
          <select value={form.emblem ?? ""} onChange={(e) => setForm({ ...form, emblem: e.target.value || null })}>
            <option value="">Ingen</option>
            {cosmetics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {achievements.length > 0 && (
        <fieldset className="g-profile-pick">
          <legend>
            Vis tre prestasjoner <span className="g-muted g-small-text">({form.showcase.length}/3)</span>
          </legend>
          <div className="g-chip-row">
            {achievements.map((a) => {
              const on = form.showcase.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`g-chip-btn${on ? " is-on" : ""}`}
                  aria-pressed={on}
                  disabled={!on && form.showcase.length >= 3}
                  onClick={() => toggle(a.id)}
                >
                  <Icon name={a.icon} /> {a.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {/* Privatmeldinger (B-421): av som standard */}
      <label className="g-toggle g-profile-dm">
        <input type="checkbox" checked={form.dmOpen} onChange={(e) => setForm({ ...form, dmOpen: e.target.checked })} />
        <span>
          Ta imot privatmeldinger
          <span className="g-muted g-small-text">
            {" "}
            – fra spillere som også har slått dem på. Du kan blokkere og rapportere.
          </span>
        </span>
      </label>
      {error && <Callout tone="critical">{error}</Callout>}
      <div className="g-profile-actions">
        <Button type="button" onClick={() => onDone(false)} disabled={busy}>
          Avbryt
        </Button>
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? "Lagrer …" : "Lagre"}
        </Button>
      </div>
    </form>
  );
}
