/**
 * Prestasjoner og pynt (B-151): merkene på Verket og arket der pynten til anleggsbildet kjøpes for fagpoeng.
 */
import { SheetHead } from "./ds";
import { useState, useSyncExternalStore } from "react";
import {
  ACHIEVEMENT_BY_ID,
  ACHIEVEMENT_FAMILIES,
  ACHIEVEMENT_GROUPS,
  ACHIEVEMENTS,
  achievementShare,
  achievementsDone,
  familyAchievements,
  fmtGoal,
  hasAchievement,
  nextInFamily,
  type Achievement,
} from "../game/achievements";
import {
  buyCosmetic,
  COSMETICS,
  cosmeticBlocked,
  cosmeticListed,
  FACADE,
  ownsCosmetic,
  setCosmetic,
  type Cosmetic,
  type SeasonCtx,
} from "../game/cosmetics";
import { STAGES } from "../game/data";
import type { PlantStats } from "../game/plant";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card } from "./common";
import { PlantScene } from "./PlantScene";
import { Portal } from "./Portal";
import { Icon } from "./icons";
import { NeedsAccount } from "./Account";
import { useSeasonStatus } from "./useSeason";
import { getSession, onSessionChange } from "../net/supabase";

/**
 * Prestasjonskortet (B-232): øverst de tre merkene du er nærmest, så alle seriene gruppert (Produksjon, Kunder …) som
 * ruter med ikon, navn og trinn. Trykk på en serie for å se alle trinnene i den.
 */
export function AchievementsCard({ g, onOpenPynt }: { g: GameState; onOpenPynt: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const done = achievementsDone(g);
  const next = ACHIEVEMENT_FAMILIES.map((f) => nextInFamily(g, f.id))
    .filter((a): a is Achievement => !!a)
    .sort((a, b) => achievementShare(g, b) - achievementShare(g, a))
    .slice(0, 3);
  return (
    <Card
      title="Prestasjoner"
      right={
        <button className="g-small" onClick={onOpenPynt}>
          <Icon name="palette" /> Pynt
        </button>
      }
    >
      <div className="g-ach-total">
        <Bar value={done / ACHIEVEMENTS.length} tone="ok" label="Prestasjoner" />
        <span className="g-muted g-small-text">
          {done} av {ACHIEVEMENTS.length} merker
        </span>
      </div>
      {next.length > 0 && (
        <>
          <h3 className="g-subhead">Nærmest</h3>
          <ul className="g-ach-next">
            {next.map((a) => (
              <li key={a.id}>
                <span className="g-ach-next-icon" aria-hidden="true">
                  <Icon name={a.icon} />
                </span>
                <div>
                  <strong>{a.name}</strong>
                  <Bar value={achievementShare(g, a)} tone="ok" label="Fremdrift" />
                  <span className="g-muted g-small-text">
                    {progressText(g, a)} · +{a.fp} fagpoeng
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {ACHIEVEMENT_GROUPS.map((group) => {
        const fams = ACHIEVEMENT_FAMILIES.filter((f) => f.group === group);
        const all = fams.flatMap((f) => familyAchievements(f.id));
        const got = all.filter((a) => hasAchievement(g, a.id)).length;
        const open = fams.find((f) => f.id === picked);
        return (
          <section key={group} className="g-ach-group">
            <h3 className="g-subhead">
              {group}{" "}
              <span className="g-muted">
                {got}/{all.length}
              </span>
            </h3>
            <div className="g-ach-tiles" role="list">
              {fams.map((f) => {
                const tiers = familyAchievements(f.id);
                const n = tiers.filter((a) => hasAchievement(g, a.id)).length;
                return (
                  <button
                    key={f.id}
                    role="listitem"
                    className={`g-ach-tile${n > 0 ? " is-got" : ""}${n === tiers.length ? " is-full" : ""}${picked === f.id ? " is-picked" : ""}`}
                    aria-pressed={picked === f.id}
                    aria-label={`${f.name}: ${n} av ${tiers.length}`}
                    onClick={() => setPicked(picked === f.id ? null : f.id)}
                  >
                    <span className="g-ach-tile-icon" aria-hidden="true">
                      <Icon name={f.icon} />
                    </span>
                    <span className="g-ach-tile-name">{f.name}</span>
                    <span className="g-ach-tile-tier">
                      {n}/{tiers.length}
                    </span>
                  </button>
                );
              })}
            </div>
            {open && <FamilyDetail g={g} family={open.id} />}
          </section>
        );
      })}
      <p className="g-muted g-small-text">Merkene gir fagpoeng. Fagpoeng kan også brukes på pynt til verket.</p>
    </Card>
  );
}

function progressText(g: GameState, a: Achievement): string {
  const [now, goal] = a.progress(g);
  if (goal <= 1) return a.description;
  return `${a.description} ${fmtGoal(Math.min(now, goal))} av ${fmtGoal(goal)}.`;
}

/** Alle trinnene i en serie: klart (med dagen), neste (med fremdrift) og de som kommer */
function FamilyDetail({ g, family }: { g: GameState; family: string }) {
  const tiers = familyAchievements(family);
  const next = nextInFamily(g, family);
  return (
    <ol className="g-ach-detail">
      {tiers.map((a) => {
        const got = hasAchievement(g, a.id);
        return (
          <li key={a.id} className={got ? "is-done" : a.id === next?.id ? "is-now" : ""}>
            <div className="g-ach-detail-head">
              <strong>
                {got ? "✓ " : ""}
                {a.name}
              </strong>
              <span className="g-muted g-small-text">{got ? `dag ${g.achievements[a.id]}` : `+${a.fp} fagpoeng`}</span>
            </div>
            {a.id === next?.id && a.progress(g)[1] > 1 && (
              <Bar value={achievementShare(g, a)} tone="ok" label="Fremdrift" />
            )}
            <span className="g-muted g-small-text">{a.id === next?.id ? progressText(g, a) : a.description}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Én rad i «Pynt verket»: kjøp, på/av eller hvorfor den ikke kan kjøpes */
function PyntRow({ g, c, ctx, act }: { g: GameState; c: Cosmetic; ctx: SeasonCtx; act: GameApi["act"] }) {
  const owned = ownsCosmetic(g, c.id);
  const on = !!g.cosmetics.on.includes(c.id);
  const blocked = cosmeticBlocked(g, c.id, ctx);
  const hidden = g.stage < (c.minStage ?? 0);
  const need = c.needs ? ACHIEVEMENT_BY_ID[c.needs] : null;
  // Pynt fra en sesong som er over, får sesongen på seg – den finnes ikke lenger (B-287)
  const past = c.season && c.season !== ctx.season;
  return (
    <li className="g-pynt-item">
      <span className="g-pynt-icon" aria-hidden="true">
        {FACADE[c.id] ? (
          <span className="g-pynt-swatch" style={{ background: FACADE[c.id][0] }} />
        ) : (
          <Icon name={c.icon} />
        )}
      </span>
      <div className="g-pynt-text">
        <strong>{c.name}</strong>
        <span className="g-muted">
          {c.description}
          {hidden && ` Synes fra ${STAGES[c.minStage ?? 0].name.toLowerCase()}.`}
          {past && ` Fra sesong ${c.season}.`}
        </span>
      </div>
      {owned ? (
        <button
          className={on ? "g-small is-on" : "g-small"}
          aria-pressed={on}
          onClick={() => act((gg) => setCosmetic(gg, c.id, !on))}
        >
          {on ? "På" : "Av"}
        </button>
      ) : blocked === "season" ? (
        <span className="g-pynt-lock">
          <Icon name="lock" /> Sesongstigen, trinn {c.seasonTier}
        </span>
      ) : blocked === "needs" && need ? (
        <span className="g-pynt-lock">
          <Icon name="lock" /> Krever merket «{need.name}»
        </span>
      ) : blocked === "account" ? (
        <span className="g-pynt-lock">
          <Icon name="lock" /> Krever konto
        </span>
      ) : (
        <button
          className="g-small g-primary"
          disabled={blocked === "fp"}
          onClick={() => act((gg) => buyCosmetic(gg, c.id, ctx))}
        >
          {c.fp} fagpoeng
        </button>
      )}
    </li>
  );
}

export function PyntModal({
  g,
  stats,
  act,
  onClose,
}: {
  g: GameState;
  stats: PlantStats;
  act: GameApi["act"];
  onClose: () => void;
}) {
  // Sesongen og kontoen fra serveren (B-287): sesongpynten kan bare kjøpes mens sesongen pågår, og med konto
  const status = useSeasonStatus();
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const current = status?.current ?? null;
  const ctx: SeasonCtx = { season: current?.id ?? null, account: !!session };
  const seasonal = COSMETICS.filter((c) => c.season && c.season === ctx.season);
  const rest = COSMETICS.filter((c) => !(c.season && c.season === ctx.season) && cosmeticListed(g, c, ctx));
  return (
    <Portal>
      <div className="g-modal" role="dialog" aria-modal="true" aria-label="Pynt verket" onClick={onClose}>
        <div className="g-modal-card" onClick={(e) => e.stopPropagation()}>
          <SheetHead title="Pynt verket" icon="palette" onClose={onClose} />
          <div className="g-scene-wrap g-pynt-preview">
            <PlantScene g={g} stats={stats} />
          </div>
          <p className="g-muted">
            Pynten gjør bare verket finere – den gir ingen fordel. Du har{" "}
            <strong>{Math.floor(g.researchPoints)}</strong> fagpoeng.
          </p>
          {current && seasonal.length > 0 && (
            <>
              <h3 className="g-subhead">Bare i {current.name.toLowerCase()}</h3>
              <p className="g-muted g-small-text">
                Denne pynten forsvinner når sesongen er over, og kommer aldri tilbake. Det du har skaffet, beholder du.
              </p>
              {!ctx.account && <NeedsAccount feature="sesongpynt" />}
              <ul className="g-pynt-list">
                {seasonal.map((c) => (
                  <PyntRow key={c.id} g={g} c={c} ctx={ctx} act={act} />
                ))}
              </ul>
              <h3 className="g-subhead">Alltid</h3>
            </>
          )}
          <ul className="g-pynt-list">
            {rest.map((c) => (
              <PyntRow key={c.id} g={g} c={c} ctx={ctx} act={act} />
            ))}
          </ul>
        </div>
      </div>
    </Portal>
  );
}
