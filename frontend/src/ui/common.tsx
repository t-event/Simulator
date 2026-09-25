import type { ReactNode } from "react";
import { GRADES } from "../game/data";
import { fmtNum } from "./format";
import type { Analysis, GradeId } from "../game/types";

export function Card({
  id,
  title,
  right,
  children,
  className = "",
}: {
  id?: string;
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`g-card ${className}`}>
      {(title || right) && (
        <header className="g-card-head">
          {title && <h2>{title}</h2>}
          {right && <div className="g-card-right">{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Bar({
  value,
  tone = "accent",
  label,
}: {
  value: number;
  tone?: "accent" | "ok" | "warning" | "critical";
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className="g-bar"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`g-bar-fill tone-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: "ok" | "warning" | "critical";
}) {
  return (
    <div className={`g-stat${tone ? ` tone-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function GradeChips({ grades, highlight }: { grades: GradeId[]; highlight?: GradeId }) {
  if (!grades.length) return <span className="g-muted">Ingen kvaliteter</span>;
  return (
    <span className="g-chips">
      {grades.map((id) => (
        <span key={id} className={`g-chip${id === highlight ? " is-hl" : ""}`} title={GRADES[id].description}>
          {GRADES[id].name}
        </span>
      ))}
    </span>
  );
}

export function AnalysisLine({ a, measured }: { a: Analysis; measured?: { c: boolean; p: boolean; tramp: boolean } }) {
  const mark = (m: boolean | undefined) => (measured ? (m ? "" : "≈") : "");
  return (
    <span className="g-analysis">
      <span title="Karbon">
        C {mark(measured?.c)}
        {fmtNum(a.c, 2)}
      </span>
      <span title="Fosfor">
        P {mark(measured?.p)}
        {fmtNum(a.p, 3)}
      </span>
      <span title="Sporelementer (Cu, Sn, Ni, Cr, Mo)">
        Spor {mark(measured?.tramp)}
        {fmtNum(a.tramp, 2)}
      </span>
    </span>
  );
}

export function GradeSpec({ id }: { id: GradeId }) {
  const s = GRADES[id];
  const c = s.cMin > 0 ? `C ${fmtNum(s.cMin, 2)}–${fmtNum(s.cMax, 2)}` : `C ≤ ${fmtNum(s.cMax, 2)}`;
  return (
    <span className="g-muted">
      {c} · P ≤ {fmtNum(s.pMax, 3)} · Spor ≤ {fmtNum(s.trampMax, 2)}
    </span>
  );
}

/** Underfaner øverst på en side, så sidene blir korte (B-044, B-051) */
export function SubTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; alert?: boolean }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className="g-subtabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          className={`${value === t.id ? "is-active" : ""}${t.alert ? " is-alert" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
