/**
 * Mål (B-211, B-214): daglig belønning, dagens oppdrag, landemerker (B-218), ukens utfordring, sesongstigen,
 * utfordringer og prestasjoner samlet på én side. Før lå de nederst på Verket → Oversikt, og mange fant dem ikke.
 * PC: eget punkt i sidemenyen. Mobil: egen knapp ved varsellinja. Topplista er ikke her, men i arket bak pokalen (B-214).
 */
import { useState } from "react";
import { CHALLENGE_STAGE, CHALLENGES, challengeProgress, challengeShare, challengesDone } from "../game/challenges";
import type { PlantStats } from "../game/plant";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { AchievementsCard, PyntModal } from "./Achievements";
import { Bar, Card, SubTabs } from "./common";
import { DailyCard } from "./Daily";
import { LandmarksCard } from "./Landmarks";
import { fmtKr, fmtNum } from "./format";
import { MissingOutCard } from "./MissingOut";
import { SeasonTrackCard } from "./SeasonTrack";
import { WeeklyCard } from "./Weekly";

export type GoalsTab = "idag" | "uke" | "prestasjoner";

function isGoalsTab(t: string | undefined): t is GoalsTab {
  return t === "idag" || t === "uke" || t === "prestasjoner";
}

/** Utfordringer på storverket (B-090): noe å strekke seg etter når alt er kjøpt */
export function ChallengesCard({ g }: { g: GameState }) {
  if (g.stage < CHALLENGE_STAGE) return null;
  return (
    <Card title={`Utfordringer (${challengesDone(g)} av ${CHALLENGES.length})`}>
      {CHALLENGES.map((c) => {
        const done = !!g.missions[c.id]?.done;
        const p = challengeProgress(g, c);
        return (
          <div key={c.id} className={`g-mission${done ? " is-done" : ""}`}>
            <strong>
              {done ? "✓ " : ""}
              {c.title}
            </strong>
            {!done && <Bar value={challengeShare(g, c)} tone="ok" label="Fremdrift" />}
            <span className="g-muted">
              {done
                ? "Klart!"
                : c.lower
                  ? p > 0
                    ? `Beste døgn: ${fmtNum(p, 0)} ${c.unit}. ${c.how}`
                    : c.how
                  : `${fmtNum(Math.floor(p), 0)} av ${fmtNum(c.goal, 0)} ${c.unit ?? ""}. ${c.how}`}
              {!done &&
                ` · ${[c.fp ? `${c.fp} fagpoeng` : "", c.cash ? fmtKr(c.cash) : "", c.rep ? `omdømme +${c.rep}` : ""].filter(Boolean).join(" og ")}`}
            </span>
          </div>
        );
      })}
    </Card>
  );
}

export function GoalsPage({
  g,
  stats,
  api,
  onOpenSettings,
  onSales,
  openTab,
}: {
  g: GameState;
  stats: PlantStats;
  api: GameApi;
  onOpenSettings: () => void;
  /** Landemerket tas på Salg (B-174) */
  onSales: () => void;
  openTab?: string;
}) {
  const act = api.act;
  const [tab, setTab] = useState<GoalsTab>(isGoalsTab(openTab) ? openTab : "idag");
  const [pynt, setPynt] = useState(false);
  // Ukens utfordring og sesongstigen først etter garasjen (gradvis synlighet, B-180). Korte navn, så alle fire får
  // plass på 320 px (B-212)
  const tabs: { id: GoalsTab; label: string }[] = [
    { id: "idag", label: "I dag" },
    ...(g.stage >= 1 ? [{ id: "uke" as const, label: "Uka" }] : []),
    { id: "prestasjoner", label: "Merker" },
  ];
  const shown = tabs.some((t) => t.id === tab) ? tab : "idag";
  const coaching = g.tutorial !== null;
  return (
    <div className={`g-grid g-goals is-${shown}`}>
      {pynt && <PyntModal g={g} stats={stats} act={act} onClose={() => setPynt(false)} />}
      <div className="g-col-wide">
        <SubTabs tabs={tabs} value={shown} onChange={setTab} label="Mål" />
        {coaching && shown !== "prestasjoner" && (
          <p className="g-muted">Dagens oppdrag og belønningene kommer når den veiledede starten er ferdig.</p>
        )}
        {shown === "idag" && !coaching && (
          <>
            <MissingOutCard g={g} onLogin={onOpenSettings} />
            <DailyCard g={g} act={act} />
            {/* Landemerket er også noe som kommer hver dag (B-218) */}
            <LandmarksCard g={g} onSales={onSales} />
          </>
        )}
        {shown === "uke" && !coaching && (
          <>
            <WeeklyCard act={act} />
            <SeasonTrackCard act={act} />
            <MissingOutCard g={g} onLogin={onOpenSettings} />
          </>
        )}
        {shown === "prestasjoner" && (
          <>
            <ChallengesCard g={g} />
            <AchievementsCard g={g} onOpenPynt={() => setPynt(true)} />
          </>
        )}
      </div>
    </div>
  );
}
