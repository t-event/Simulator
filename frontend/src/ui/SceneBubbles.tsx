/**
 * Flytende bobler over anlegget når noe blir produsert, solgt eller lært (som design- og teknikkboblene i Game Dev
 * Tycoon). Rent pynt: leser bare spilltilstanden og viser forskjellen siden forrige titt.
 *
 * Regler (UI.md 7, B-195): høyst 3 synlige i faste baner, levetid 1,6 s. Det som skjer innen samme vindu (1 s, lengre
 * på 3× og 10×), slås sammen til én boble – «+18,7 mill. kr · +1 539 t · +3 fagpoeng». Er alle banene opptatt, venter
 * tallene og kommer med i neste boble, så ingenting blir borte. Med redusert bevegelse: en stille linje i stedet.
 */
import { useEffect, useState } from "react";
import type { GameState } from "../game/types";
import { fmtKr, fmtT } from "./format";

interface Bubble {
  id: number;
  text: string;
  kind: "steel" | "money" | "fp";
  lane: number;
}

const POLL_MS = 250;
const LIFETIME_MS = 1600;
/** Faste baner (prosent fra venstre) */
const LANES = [28, 50, 72];

const sales = (g: GameState) => (g.today.income.kontrakt ?? 0) + (g.today.income.spot ?? 0);
/** Lengre vindu når tida går fort, så 10× ikke blir kaos */
const windowMs = (speed: number) => (speed >= 10 ? 2000 : speed >= 3 ? 1400 : 1000);

function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function SceneBubbles({ g }: { g: GameState }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    const still = reducedMotion();
    let nextId = 1;
    let last = { produced: g.totals.producedT, fp: g.researchPoints, sales: sales(g), day: g.today.day };
    const pending = { t: 0, kr: 0, fp: 0 };
    let windowStart = Date.now();
    const visible = new Set<number>();
    const timer = setInterval(() => {
      const now = { produced: g.totals.producedT, fp: g.researchPoints, sales: sales(g), day: g.today.day };
      pending.t += Math.max(0, now.produced - last.produced);
      // Salget nullstilles ved midnatt; da sammenlignes det med null
      pending.kr += Math.max(0, now.day === last.day ? now.sales - last.sales : now.sales);
      pending.fp += Math.max(0, now.fp - last.fp);
      last = now;
      if (Date.now() - windowStart < windowMs(g.speed)) return;
      windowStart = Date.now();
      const parts: string[] = [];
      if (pending.kr > 1) parts.push(`+${fmtKr(pending.kr)}`);
      if (pending.t > 0.001) parts.push(`+${fmtT(pending.t)}`);
      if (pending.fp >= 1) parts.push(`+${Math.floor(pending.fp)} fagpoeng`);
      if (!parts.length) return;
      // Hver del holdes samlet (hardt mellomrom), så en lang boble brytes mellom delene på smale skjermer (B-248)
      const text = parts.map((x) => x.replace(/ /g, "\u00a0")).join(" · ");
      if (still) {
        setLine(text);
      } else {
        const lane = LANES.findIndex((_, i) => !visible.has(i));
        // Alle banene er opptatt: tallene venter til neste boble
        if (lane < 0) return;
        const kind: Bubble["kind"] = pending.kr > 1 ? "money" : pending.t > 0.001 ? "steel" : "fp";
        const id = nextId++;
        visible.add(lane);
        setBubbles((b) => [...b, { id, text, kind, lane }]);
        setTimeout(() => {
          visible.delete(lane);
          setBubbles((b) => b.filter((x) => x.id !== id));
        }, LIFETIME_MS);
      }
      pending.t = 0;
      pending.kr = 0;
      pending.fp -= Math.floor(pending.fp);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [g]);

  return (
    <div className="g-bubbles" aria-hidden="true">
      {bubbles.map((b) => (
        <span key={b.id} className={`g-bubble bubble-${b.kind}`} style={{ ["--lane" as string]: LANES[b.lane] / 100 }}>
          {b.text}
        </span>
      ))}
      {line && <span className="g-bubble-line">{line}</span>}
    </div>
  );
}
