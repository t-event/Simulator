/**
 * «13 spillere aktive siste 24 timer» på startskjermen (B-408). Tallet kommer fra serveren og hentes når skjermen vises
 * og hvert femte minutt mens den står. Linja har fast plass også mens tallet hentes og hvis det feiler, så kortet (som er
 * midtstilt) ikke hopper.
 */
import { useEffect, useState } from "react";
import { cloudConfigured } from "../net/config";
import { activePlayersText, fetchActivePlayers } from "../net/leaderboard";
import { Icon } from "./icons";

const REFRESH_MS = 5 * 60_000;

export function ActivePlayers() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!cloudConfigured()) return;
    let alive = true;
    const load = () =>
      fetchActivePlayers().then(
        (n) => {
          if (alive && n !== null) setCount(n);
        },
        () => {},
      );
    void load();
    const t = setInterval(() => void load(), REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  if (!cloudConfigured()) return null;
  return (
    <p className="g-intro-active" aria-live="polite">
      {count !== null && count > 0 && (
        <>
          <Icon name="people" /> {activePlayersText(count)}
        </>
      )}
    </p>
  );
}
