/**
 * Mål (B-211, B-214): daglig belønning, dagens oppdrag, landemerker (B-218), ukens utfordring, sesongstigen,
 * utfordringer og prestasjoner samlet på én side. Før lå de nederst på Verket → Oversikt, og mange fant dem ikke.
 * PC: eget punkt i sidemenyen. Mobil: egen knapp ved varsellinja. Topplista er ikke her, men i arket bak pokalen (B-214).
 */
import { useState } from "react";
import {
  CHALLENGE_FAMILIES,
  CHALLENGE_STAGE,
  CHALLENGES,
  challengeProgress,
  challengeShare,
  challengesDone,
  currentChallenge,
  familyDone,
  familyTiers,
  type Challenge,
} from "../game/challenges";
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

/**
 * Utfordringer på storverket (B-090, B-232): serier i trinn. Øverst de som er nærmest å bli nådd, hver med mål,
 * fremdrift, belønning og trinnprikker; resten bak «Alle utfordringer». Serier som er helt ferdige, står samlet nederst.
 */
export function ChallengesCard({ g }: { g: GameState }) {
  if (g.stage < CHALLENGE_STAGE) return null;
  const active = CHALLENGE_FAMILIES.map((f) => currentChallenge(g, f.id))
    .filter((c): c is Challenge => !!c)
    .sort((a, b) => challengeShare(g, b) - challengeShare(g, a));
  const finished = CHALLENGE_FAMILIES.filter((f) => !currentChallenge(g, f.id));
  const done = challengesDone(g);
  const top = active.slice(0, 4);
  const rest = active.slice(4);
  return (
    <Card
      title="Utfordringer"
      right={<span className="g-muted g-small-text">{`${done} av ${CHALLENGES.length}`}</span>}
    >
      <Bar value={done / CHALLENGES.length} tone="ok" label="Utfordringer klart" />
      <p className="g-muted g-small-text">
        Hver serie har flere trinn. Når du klarer et trinn, får du belønningen, og neste trinn starter.
      </p>
      <ul className="g-challenges">
        {top.map((c) => (
          <ChallengeRow key={c.id} g={g} c={c} />
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="g-details">
          <summary>Alle utfordringer ({rest.length} til)</summary>
          <ul className="g-challenges">
            {rest.map((c) => (
              <ChallengeRow key={c.id} g={g} c={c} />
            ))}
          </ul>
        </details>
      )}
      {finished.length > 0 && (
        <p className="g-muted g-small-text">Helt ferdig: {finished.map((f) => `${f.icon} ${f.name}`).join(", ")}</p>
      )}
    </Card>
  );
}

function ChallengeRow({ g, c }: { g: GameState; c: Challenge }) {
  const tiers = familyTiers(c.family);
  const doneTiers = familyDone(g, c.family);
  const p = challengeProgress(g, c);
  const d = c.decimals ?? 0;
  const unit = c.unit === "kr" ? "" : ` ${c.unit ?? ""}`;
  const fmt = (n: number) => (c.unit === "kr" ? fmtKr(n) : fmtNum(d ? n : Math.floor(n), d));
  const progress = c.lower
    ? p > 0
      ? `Beste døgn: ${fmt(p)}${unit} · mål ${fmt(c.goal)}${unit}`
      : `Mål: under ${fmt(c.goal)}${unit}`
    : `${fmt(p)} av ${fmt(c.goal)}${unit}`;
  const reward = [c.fp ? `+${c.fp} fp` : "", c.cash ? fmtKr(c.cash) : "", c.rep ? `omdømme +${c.rep}` : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="g-challenge">
      <span className="g-challenge-icon" aria-hidden="true">
        {c.icon}
      </span>
      <div className="g-challenge-body">
        <div className="g-challenge-head">
          <strong>{c.title}</strong>
          {tiers.length > 1 && (
            <span className="g-tier-dots" aria-label={`Trinn ${doneTiers + 1} av ${tiers.length}`}>
              {tiers.map((t, i) => (
                <i key={t.id} className={i < doneTiers ? "is-done" : i === doneTiers ? "is-now" : ""} />
              ))}
            </span>
          )}
        </div>
        <Bar value={challengeShare(g, c)} tone="ok" label="Fremdrift" />
        <div className="g-challenge-meta">
          <span>{progress}</span>
          <span className="g-challenge-reward">{reward}</span>
        </div>
        <span className="g-muted g-small-text">{c.how}</span>
      </div>
    </li>
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
