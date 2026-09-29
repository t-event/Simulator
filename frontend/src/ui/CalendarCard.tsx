import { calendarAhead, dateText, hasSummerBreak, type CalendarItem } from "../game/calendar";
import { day } from "../game/plant";
import type { GameState } from "../game/types";
import { Card } from "./common";
import { Icon } from "./icons";

/** Hvor mange døgn stripa viser */
const STRIP_DAYS = 60;

const LABEL: Record<CalendarItem["kind"], string> = { ferie: "Fellesferie", vinter: "Vinter" };

/** «7.–27. juli» eller «15. nov.–14. mar.» */
function range(from: number, to: number): string {
  const a = dateText(from);
  const b = dateText(to);
  const [da, ma] = a.split(" ");
  const [db, mb] = b.split(" ");
  // Over to måneder med korte navn, så raden får plass på 320 px
  return ma === mb ? `${da.replace(".", "")}.–${db} ${mb}` : `${da} ${ma.slice(0, 3)}.–${db} ${mb.slice(0, 3)}.`;
}

function when(today: number, it: CalendarItem): string {
  if (today >= it.from) {
    const left = it.to - today + 1;
    return `nå · ${left} døgn igjen`;
  }
  const n = it.from - today;
  // Langt fram holder det med måneder (30 døgn), og raden får plass på 320 px
  return n === 1 ? "i morgen" : n >= 60 ? `om ${Math.round(n / 30)} mnd.` : `om ${n} døgn`;
}

/**
 * Kalenderen på Oversikt (B-321): fellesferien og vinteren med datoer og hvor lenge det er til, og en stripe over de
 * neste 60 døgnene, så spilleren kan planlegge ordrer fram til sommerstans. Vises når verket har fellesferie (nivå 2 og
 * folk) – før det er det ingenting å planlegge rundt.
 */
export function CalendarCard({ g }: { g: GameState }) {
  if (!hasSummerBreak(g)) return null;
  const today = day(g);
  const items = calendarAhead(g);
  const seg = (it: CalendarItem) => {
    const a = Math.max(it.from, today) - today;
    const b = Math.min(it.to + 1, today + STRIP_DAYS) - today;
    return b > a ? { left: (a / STRIP_DAYS) * 100, width: ((b - a) / STRIP_DAYS) * 100 } : null;
  };
  return (
    <Card title="Kalender" className="g-calendar" right={<span className="g-muted">{dateText(today)}</span>}>
      <div className="g-cal-strip" aria-hidden="true">
        {items.map((it) => {
          const s = seg(it);
          return s ? (
            <span
              key={it.kind}
              className={`g-cal-seg is-${it.kind}`}
              style={{ left: `${s.left}%`, width: `${s.width}%` }}
            />
          ) : null;
        })}
      </div>
      <div className="g-cal-scale g-muted" aria-hidden="true">
        <span>I dag</span>
        <span>om {STRIP_DAYS} døgn</span>
      </div>
      <ul className="g-cal-list">
        {items.map((it) => (
          <li key={it.kind} className={`is-${it.kind}`}>
            <Icon name={it.kind === "ferie" ? "sun" : "snowflake"} />
            <span className="g-cal-main">
              <strong>{LABEL[it.kind]}</strong> <span className="g-muted">{range(it.from, it.to)}</span>
            </span>
            <span className="g-cal-when">{when(today, it)}</span>
            <span className="g-cal-note g-muted">
              {it.note}
              {it.dueContracts > 0
                ? ` · ${it.dueContracts === 1 ? "1 kontrakt" : `${it.dueContracts} kontrakter`} med frist i ferien`
                : ""}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
