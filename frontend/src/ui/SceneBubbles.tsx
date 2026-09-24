/**
 * Flytende bobler over anlegget når noe blir produsert, solgt eller lært
 * (som design- og teknikkboblene i Game Dev Tycoon). Rent pynt: leser bare
 * spilltilstanden og viser forskjellen siden forrige titt.
 */
import { useEffect, useState } from "react";
import type { GameState } from "../game/types";
import { fmtKr, fmtT } from "./format";

interface Bubble {
  id: number;
  text: string;
  kind: "steel" | "money" | "fp";
  x: number;
}

const INTERVAL_MS = 700;
const LIFETIME_MS = 2200;
const MAX_BUBBLES = 8;

const sales = (g: GameState) => (g.today.income.kontrakt ?? 0) + (g.today.income.spot ?? 0);

export function SceneBubbles({ g }: { g: GameState }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    let nextId = 1;
    let last = { produced: g.totals.producedT, fp: g.researchPoints, sales: sales(g), day: g.today.day };
    const timer = setInterval(() => {
      const now = { produced: g.totals.producedT, fp: g.researchPoints, sales: sales(g), day: g.today.day };
      const fresh: Bubble[] = [];
      const add = (text: string, kind: Bubble["kind"]) =>
        fresh.push({ id: nextId++, text, kind, x: 15 + Math.random() * 70 });
      if (now.produced - last.produced > 0.001) add(`+${fmtT(now.produced - last.produced)}`, "steel");
      // Salget nullstilles ved midnatt; da sammenlignes det med null
      const sold = now.day === last.day ? now.sales - last.sales : now.sales;
      if (sold > 1) add(`+${fmtKr(sold)}`, "money");
      if (now.fp - last.fp >= 1) add(`+${Math.floor(now.fp - last.fp)} FP`, "fp");
      last = now;
      if (!fresh.length) return;
      setBubbles((b) => [...b, ...fresh].slice(-MAX_BUBBLES));
      const ids = new Set(fresh.map((f) => f.id));
      setTimeout(() => setBubbles((b) => b.filter((x) => !ids.has(x.id))), LIFETIME_MS);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [g]);

  return (
    <div className="g-bubbles" aria-hidden="true">
      {bubbles.map((b) => (
        <span key={b.id} className={`g-bubble bubble-${b.kind}`} style={{ left: `${b.x}%` }}>
          {b.text}
        </span>
      ))}
    </div>
  );
}
