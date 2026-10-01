/**
 * Verket → Økonomi (UI-3a, B-203): resultatet per døgn som en enkel stolpegraf, og hvor pengene kom fra og gikk til.
 * Én serie (resultat), så ingen tegnforklaring: grønn over null, rød under, og fortegnet står i teksten.
 */
import type { DayFinance } from "../game/types";
import { dayResult } from "./financeNames";
import { fmtKr } from "./format";

const CHART_H = 120;

/** Resultat per døgn, siste inntil 30 døgn. Hver stolpe har verktøytips med dag og beløp */
export function ResultChart({ days }: { days: DayFinance[] }) {
  if (days.length < 2) return null;
  const values = days.map(dayResult);
  // Ett stort kjøp (et datterverk, en ny ovn) skal ikke gjøre alle de andre dagene flate: stolper over taket kappes
  // og får et bruddmerke. Beløpet står fortsatt i verktøytipset.
  const sorted = values.map(Math.abs).sort((a, b) => a - b);
  const typical = sorted[Math.floor(sorted.length * 0.8)] || 1;
  const cap = Math.max(typical * 2.5, 1);
  const shown = values.map((v) => Math.sign(v) * Math.min(Math.abs(v), cap));
  const pos = Math.max(0, ...shown);
  const neg = Math.max(0, ...shown.map((v) => -v));
  // Nullinja står der den må for at både overskudd og underskudd får plass
  const zero = neg === 0 ? CHART_H : pos === 0 ? 0 : (pos / (pos + neg)) * CHART_H;
  const scale = (pos + neg || 1) / CHART_H;
  const w = 100 / days.length;
  const best = values.indexOf(Math.max(...values));
  const worst = values.indexOf(Math.min(...values));
  const plus = values.filter((v) => v >= 0).length;
  // Snittet over de siste sju døgnene (B-310): skrap kjøpes i partier og kontrakter betales ved levering, så ett døgn
  // kan stå i minus selv om uka er i pluss. Snittet er tallet å styre etter
  const last7 = values.slice(-7);
  const avg7 = last7.reduce((a, v) => a + v, 0) / last7.length;
  return (
    <figure className="g-result-chart">
      <figcaption>
        Resultat per døgn, siste {days.length} døgn · {plus} i pluss, {days.length - plus} i minus ·{" "}
        <strong>
          snitt {avg7 >= 0 ? "+" : ""}
          {fmtKr(avg7)} per døgn
        </strong>{" "}
        (siste {last7.length})
      </figcaption>
      <svg
        viewBox={`0 0 100 ${CHART_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Resultat per døgn de siste ${days.length} døgnene. Best dag ${days[best].day}: ${fmtKr(values[best])}. Dårligst dag ${days[worst].day}: ${fmtKr(values[worst])}.`}
      >
        {values.map((v, i) => {
          const h = Math.max(Math.abs(shown[i]) / scale, 1);
          const y = v >= 0 ? zero - h : zero;
          const clipped = Math.abs(v) > cap;
          return (
            <g key={days[i].day}>
              <rect
                className={v >= 0 ? "is-plus" : "is-minus"}
                x={i * w + w * 0.14}
                width={w * 0.72}
                y={y}
                height={h}
                rx={0.6}
              >
                <title>
                  Dag {days[i].day}: {v >= 0 ? "+" : ""}
                  {fmtKr(v)}
                </title>
              </rect>
              {clipped && (
                <rect
                  className="g-result-break"
                  x={i * w}
                  width={w}
                  y={v >= 0 ? y + h * 0.18 : y + h * 0.78}
                  height={2.5}
                  aria-hidden="true"
                />
              )}
            </g>
          );
        })}
        <line className="g-result-zero" x1={0} x2={100} y1={zero} y2={zero} />
      </svg>
      <div className="g-result-axis">
        <span>Dag {days[0].day}</span>
        <span>Dag {days[days.length - 1].day}</span>
      </div>
    </figure>
  );
}

const BREAKDOWN_TOP = 3;

/** Poster sortert etter størrelse, med en stolpe som viser andelen av den største. De tre største står fremme – de er
 *  nesten hele summen – og resten bak «Alle poster» (B-412) */
export function Breakdown({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const list = rows.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
  if (!list.length) return null;
  const top = list[0].value;
  const total = list.reduce((a, r) => a + r.value, 0);
  const item = (r: { label: string; value: number }) => (
    <li key={r.label}>
      <span className="g-breakdown-label">{r.label}</span>
      <span className="g-breakdown-value">{fmtKr(r.value)}</span>
      <span className="g-breakdown-bar" aria-hidden="true">
        <span style={{ width: `${Math.max(2, (r.value / top) * 100)}%` }} />
      </span>
    </li>
  );
  // Én post til får stå fremme; en «Alle poster» med én rad er bare et ekstra trykk
  const shown = list.length > BREAKDOWN_TOP + 1 ? BREAKDOWN_TOP : list.length;
  const rest = list.slice(shown);
  return (
    <div className="g-breakdown">
      <h3 className="g-subhead">
        {title} <span className="g-muted">{fmtKr(total)}</span>
      </h3>
      <ul>{list.slice(0, shown).map(item)}</ul>
      {rest.length > 0 && (
        <details className="g-details g-breakdown-more">
          <summary>
            Alle poster ({rest.length} til, {fmtKr(rest.reduce((a, r) => a + r.value, 0))})
          </summary>
          <ul>{rest.map(item)}</ul>
        </details>
      )}
    </div>
  );
}
