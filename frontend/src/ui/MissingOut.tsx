/**
 * «Det går du glipp av» (B-212): spillere uten konto (også gjester) ser med egne tall hva en konto gir – plassen de
 * ville hatt på topplista, dagens belønning og bonus – i stedet for en liste med låste funksjoner. Ett kort, én knapp,
 * øverst på Mål. Topplista kan leses uten konto, så plassen regnes ut her i appen.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { missionBonus, streakReward, type Reward } from "../game/daily";
import { konsernEquity } from "../game/konsern";
import type { GameState } from "../game/types";
import { isGuest } from "../net/guest";
import { fetchLeaderboard } from "../net/leaderboard";
import { getSession, onSessionChange } from "../net/supabase";
import { Card } from "./common";
import { Button } from "./ds";
import { fmtKr } from "./format";
import { Icon } from "./icons";
import { useSeasonStatus } from "./useSeason";

function rewardText(r: Reward): string {
  return [r.cash > 0 && fmtKr(r.cash), r.fp > 0 && `${r.fp} fagpoeng`].filter(Boolean).join(" og ");
}

/** Hvilken plass spilleren ville hatt: 1 + antall med høyere verdi. Null hvis lista ikke kan hentes. */
function wouldBePlace(values: number[], mine: number): { place: number; of: number } {
  return { place: values.filter((v) => v > mine).length + 1, of: values.length + 1 };
}

function usePlace(g: GameState, season: number | null, enabled: boolean): { place: number; of: number } | null {
  const [values, setValues] = useState<number[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetchLeaderboard("verdi", season)
      .then((rows) => alive && setValues(rows.map((r) => r.value)))
      .catch(() => alive && setValues(null));
    return () => {
      alive = false;
    };
  }, [season, enabled]);
  const mine = konsernEquity(g);
  return values && mine > 0 ? wouldBePlace(values, mine) : null;
}

export function MissingOutCard({ g, onLogin }: { g: GameState; onLogin: () => void }) {
  const session = useSyncExternalStore(onSessionChange, getSession, getSession);
  const season = useSeasonStatus()?.current?.id ?? null;
  const place = usePlace(g, season, !session && g.tutorial === null);
  // Etter den veiledede starten (gradvis synlighet, B-180), og bare uten konto
  if (session || g.tutorial !== null) return null;
  const guest = isGuest();
  const items: [string, string][] = [];
  if (place)
    items.push([
      "Topplista",
      `Du ville vært nr. ${place.place} av ${place.of}${season ? " denne sesongen" : ""}, med kallenavnet ditt.`,
    ]);
  const week = [1, 2, 3, 4, 5, 6, 7].map((d) => streakReward(g, d));
  const weekSum = { cash: week.reduce((a, r) => a + r.cash, 0), fp: week.reduce((a, r) => a + r.fp, 0) };
  items.push(["Daglig belønning", `En uke på rad gir nå ${rewardText(weekSum)}.`]);
  items.push(["Dagens oppdrag", `Tre små oppdrag hver dag, med bonus: ${rewardText(missionBonus(g))}.`]);
  if (g.stage >= 1)
    items.push(["Ukens utfordring og sesongstigen", "Medaljer, ukekiste og pynt til verket for å spille jevnt."]);
  if (g.konsern?.unlocked)
    items.push(["Skraplageret og konsernkassa", "By på skraplageret og tjen på de andre spillernes skrapkjøp."]);
  items.push([
    "Spillet på flere enheter",
    guest
      ? "Spillet er lagret på nett som gjest, men bare denne enheten finner det. Med konto kan du spille videre hvor som helst."
      : "Nå finnes spillet bare på denne enheten. Med konto kan du spille videre hvor som helst.",
  ]);
  return (
    <Card title="Det går du glipp av" className="g-account-card g-missing-out">
      <ul className="g-account-list">
        {items.map(([name, why]) => (
          <li key={name}>
            <Icon name="lock" />
            <span>
              <strong>{name}.</strong> {why}
            </span>
          </li>
        ))}
      </ul>
      <p className="g-muted g-small-text">Kontoen er gratis, og spillet du har nå, følger med.</p>
      <Button variant="primary" icon="user" onClick={onLogin}>
        Opprett konto eller logg inn
      </Button>
    </Card>
  );
}
