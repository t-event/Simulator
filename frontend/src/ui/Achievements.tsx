/**
 * Prestasjoner og pynt (B-151): merkene på Verket og arket der pynten til anleggsbildet kjøpes for fagpoeng.
 */
import { useState } from "react";
import {
  ACHIEVEMENT_BY_ID,
  ACHIEVEMENTS,
  achievementShare,
  achievementsDone,
  hasAchievement,
  type Achievement,
} from "../game/achievements";
import { buyCosmetic, COSMETICS, cosmeticBlocked, ownsCosmetic, setCosmetic } from "../game/cosmetics";
import { STAGES } from "../game/data";
import type { PlantStats } from "../game/plant";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Bar, Card } from "./common";
import { fmtNum } from "./format";
import { PlantScene } from "./PlantScene";
import { Portal } from "./Portal";

/** Den som er nærmest å bli nådd – vises først */
function nextUp(g: GameState): Achievement | undefined {
  return ACHIEVEMENTS.filter((a) => !hasAchievement(g, a.id)).sort(
    (a, b) => achievementShare(g, b) - achievementShare(g, a),
  )[0];
}

function progressText(g: GameState, a: Achievement): string {
  const [now, goal] = a.progress(g);
  if (goal <= 1) return a.description;
  return `${a.description} ${fmtNum(Math.min(Math.floor(now), goal), 0)} av ${fmtNum(goal, 0)}.`;
}

export function AchievementsCard({ g, onOpenPynt }: { g: GameState; onOpenPynt: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const done = achievementsDone(g);
  const shown = (picked && ACHIEVEMENT_BY_ID[picked]) || nextUp(g);
  const shownDone = shown ? hasAchievement(g, shown.id) : false;
  return (
    <Card
      title={`Prestasjoner (${done} av ${ACHIEVEMENTS.length})`}
      right={
        <button className="g-small" onClick={onOpenPynt}>
          🎨 Pynt
        </button>
      }
    >
      <div className="g-badges" role="list">
        {ACHIEVEMENTS.map((a) => {
          const got = hasAchievement(g, a.id);
          return (
            <button
              key={a.id}
              role="listitem"
              className={`g-badge-tile${got ? " is-got" : ""}${shown?.id === a.id ? " is-picked" : ""}`}
              aria-label={`${a.name}${got ? " (klart)" : ""}`}
              aria-pressed={shown?.id === a.id}
              onClick={() => setPicked(a.id)}
            >
              <span aria-hidden="true">{a.icon}</span>
            </button>
          );
        })}
      </div>
      {shown && (
        <div className={`g-mission${shownDone ? " is-done" : ""}`}>
          <strong>
            {shown.icon} {shown.name}
            {shownDone ? ` ✓ (dag ${g.achievements[shown.id]})` : ""}
          </strong>
          {!shownDone && shown.progress(g)[1] > 1 && (
            <Bar value={achievementShare(g, shown)} tone="ok" label="Fremdrift" />
          )}
          <span className="g-muted">
            {shownDone ? shown.description : progressText(g, shown)} · {shown.fp} fagpoeng
          </span>
        </div>
      )}
      <p className="g-muted">
        Trykk på et merke for å se hva som skal til. Fagpoeng kan også brukes på pynt til verket.
      </p>
    </Card>
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
  return (
    <Portal>
      <div className="g-modal" role="dialog" aria-modal="true" aria-label="Pynt verket" onClick={onClose}>
        <div className="g-modal-card" onClick={(e) => e.stopPropagation()}>
          <header className="g-card-head">
            <h2>🎨 Pynt verket</h2>
            <button onClick={onClose} aria-label="Lukk">
              ✕
            </button>
          </header>
          <div className="g-scene-wrap g-pynt-preview">
            <PlantScene g={g} stats={stats} />
          </div>
          <p className="g-muted">
            Pynten gjør bare verket finere – den gir ingen fordel. Du har{" "}
            <strong>{Math.floor(g.researchPoints)}</strong> fagpoeng.
          </p>
          <ul className="g-pynt-list">
            {COSMETICS.map((c) => {
              const owned = ownsCosmetic(g, c.id);
              const on = !!g.cosmetics.on.includes(c.id);
              const blocked = cosmeticBlocked(g, c.id);
              const hidden = g.stage < (c.minStage ?? 0);
              const need = c.needs ? ACHIEVEMENT_BY_ID[c.needs] : null;
              return (
                <li key={c.id} className="g-pynt-item">
                  <span className="g-pynt-icon" aria-hidden="true">
                    {c.icon}
                  </span>
                  <div className="g-pynt-text">
                    <strong>{c.name}</strong>
                    <span className="g-muted">
                      {c.description}
                      {hidden && ` Synes fra ${STAGES[c.minStage ?? 0].name.toLowerCase()}.`}
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
                  ) : blocked === "needs" && need ? (
                    <span className="g-pynt-lock">
                      🔒 Krever {need.icon} {need.name}
                    </span>
                  ) : (
                    <button
                      className="g-small g-primary"
                      disabled={blocked === "fp"}
                      onClick={() => act((gg) => buyCosmetic(gg, c.id))}
                    >
                      {c.fp} fp
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Portal>
  );
}
