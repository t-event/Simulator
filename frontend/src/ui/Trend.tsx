/**
 * Trenden i markedet (B-255): én linje med ikon – hva som er ettertraktet eller lite etterspurt, og hvor lenge. Vises
 * bare mens en trend varer (gradvis synlighet), under Marked → Stålpriser og over forespørslene under Salg.
 */
import { day } from "../game/plant";
import { TREND, trendName } from "../game/trends";
import type { GameState } from "../game/types";
import { Icon } from "./icons";

export function TrendNote({ g }: { g: GameState }) {
  const t = g.market.trend;
  if (!t) return null;
  const left = Math.max(1, t.untilDay - day(g));
  const pct = Math.round(Math.abs((t.up ? TREND.priceUp : TREND.priceDown) - 1) * 100);
  return (
    <p className={`g-trend ${t.up ? "is-up" : "is-down"}`}>
      <Icon name={t.up ? "trending-up" : "trending-down"} />
      <span>
        {t.up ? (
          <>
            <strong>Ettertraktet: {trendName(t)}.</strong> Flere forespørsler og ca. {pct} % bedre pris
          </>
        ) : (
          <>
            <strong>Lite etterspurt: {trendName(t)}.</strong> Færre forespørsler og ca. {pct} % lavere pris
          </>
        )}{" "}
        i {left} døgn til.
      </span>
    </p>
  );
}
