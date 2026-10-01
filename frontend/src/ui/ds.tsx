/**
 * Grunnkomponenter i designsystemet (B-187, B-191, docs/UI.md). Stilene står i ui/tokens.css.
 * Status og meldinger bruker alltid ikon + ord i tillegg til farge.
 * Kort, fremdriftslinje, nøkkeltall og underfaner finnes fra før i ui/common.tsx (Card, Bar, Stat, SubTabs) og bruker
 * de samme tokenene.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import type { Delta } from "./delta";

export type { Delta } from "./delta";

export type Tone = "neutral" | "ok" | "info" | "heat" | "critical";

/** Statusspråket for utstyr og ordre (UI.md 6.2) */
export type Status = "kjorer" | "venter" | "stopp" | "vedlikehold" | "feil" | "fullt" | "tomt" | "folk";

const STATUS: Record<Status, { label: string; icon: IconName; tone: Tone }> = {
  kjorer: { label: "Kjører", icon: "play", tone: "ok" },
  venter: { label: "Venter", icon: "clock", tone: "info" },
  stopp: { label: "Stopp", icon: "pause", tone: "neutral" },
  vedlikehold: { label: "Vedlikehold", icon: "wrench", tone: "heat" },
  feil: { label: "Feil", icon: "warning", tone: "critical" },
  fullt: { label: "Fullt", icon: "warehouse", tone: "heat" },
  tomt: { label: "Tomt", icon: "package", tone: "heat" },
  folk: { label: "Mangler folk", icon: "people", tone: "heat" },
};

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const s = STATUS[status];
  return (
    <span className={`ds-status is-${s.tone}`}>
      <Icon name={s.icon} />
      {label ?? s.label}
    </span>
  );
}

/** Kompakt status i en rute (produksjonslinja): ikon + ord i statusfargen, uten pille (B-195) */
export function StatusLine({ status, label }: { status: Status; label?: string }) {
  const s = STATUS[status];
  return (
    <span className={`ds-status-line is-${s.tone}`}>
      <Icon name={s.icon} />
      <span>{label ?? s.label}</span>
    </span>
  );
}

const CALLOUT_ICON: Record<Tone, IconName> = {
  neutral: "info",
  info: "info",
  ok: "ok",
  heat: "warning",
  critical: "error",
};

export function Callout({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className={`ds-callout is-${tone}`} role={tone === "critical" ? "alert" : undefined}>
      <Icon name={CALLOUT_ICON[tone]} />
      <div>{children}</div>
    </div>
  );
}

export function DeltaLine({ delta }: { delta: Delta }) {
  const tone = delta.dir === "flat" || delta.good === undefined ? "neutral" : delta.good ? "ok" : "critical";
  return (
    <span className={`ds-delta is-${tone}`} title={delta.long !== delta.text ? delta.long : undefined}>
      {delta.dir !== "flat" && <Icon name={delta.dir === "up" ? "trending-up" : "trending-down"} />}
      <span>{delta.text}</span>
    </span>
  );
}

/**
 * Nøkkeltallet øverst på en side (B-404): ett stort tall med etikett og en valgfri endring under, f.eks. resultatet i
 * går og hvordan det står seg mot døgnet før. Brukes på Økonomi og Konsern.
 */
export function Metric({
  label,
  value,
  tone,
  delta,
  title,
}: {
  label: string;
  value: ReactNode;
  /** Plus/minus farger tallet (resultat); uten er det nøytralt */
  tone?: "plus" | "minus";
  delta?: Delta | null;
  title?: string;
}) {
  return (
    <div className={`g-finance-result ds-metric${tone ? ` is-${tone}` : ""}`} title={title}>
      <span>{label}</span>
      <strong>{value}</strong>
      {delta && <DeltaLine delta={delta} />}
    </div>
  );
}

export type ButtonVariant = "primary" | "secondary" | "danger" | "link";

const BUTTON_CLASS: Record<ButtonVariant, string> = {
  primary: "g-primary",
  secondary: "",
  danger: "g-danger",
  link: "g-link",
};

/** Knapp i ett av de faste utseendene. Én primærknapp per område. */
export function Button({
  variant = "secondary",
  icon,
  className = "",
  children,
  ...rest
}: { variant?: ButtonVariant; icon?: IconName } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`ds-button ${BUTTON_CLASS[variant]} ${className}`.trim()} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

/**
 * Toppen på et ark (UI-4c, B-225): tittel, valgfrie handlinger og lukk som ikonknapp (44 px). Blir stående øverst når
 * arket rulles, så lukk alltid er innen rekkevidde.
 */
export function SheetHead({
  title,
  icon,
  onClose,
  className = "",
  children,
}: {
  title: ReactNode;
  icon?: IconName;
  onClose: () => void;
  className?: string;
  /** Mer i toppen, mellom tittelen og lukk (f.eks. kassa eller oppdater) */
  children?: ReactNode;
}) {
  return (
    <header className={`g-card-head ds-sheet-head ${className}`}>
      <h2>
        {icon && <Icon name={icon} />} {title}
      </h2>
      {children}
      <button className="g-icon-btn ds-sheet-close" onClick={onClose} aria-label="Lukk">
        <Icon name="close" />
      </button>
    </header>
  );
}
