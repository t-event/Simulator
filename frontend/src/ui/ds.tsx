/**
 * Grunnkomponenter i designsystemet (B-187, B-191, docs/UI.md). Stilene står i ui/tokens.css.
 * Status og meldinger bruker alltid ikon + ord i tillegg til farge.
 * Kort, fremdriftslinje, nøkkeltall og underfaner finnes fra før i ui/common.tsx (Card, Bar, Stat, SubTabs) og bruker
 * de samme tokenene.
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./icons";

export type Tone = "neutral" | "ok" | "info" | "heat" | "critical";

/** Statusspråket for utstyr og ordre (UI.md 6.2) */
export type Status = "kjorer" | "venter" | "stopp" | "vedlikehold" | "feil" | "fullt" | "tomt";

const STATUS: Record<Status, { label: string; icon: IconName; tone: Tone }> = {
  kjorer: { label: "Kjører", icon: "play", tone: "ok" },
  venter: { label: "Venter", icon: "clock", tone: "info" },
  stopp: { label: "Stopp", icon: "pause", tone: "neutral" },
  vedlikehold: { label: "Vedlikehold", icon: "wrench", tone: "heat" },
  feil: { label: "Feil", icon: "warning", tone: "critical" },
  fullt: { label: "Fullt", icon: "warehouse", tone: "heat" },
  tomt: { label: "Tomt", icon: "package", tone: "heat" },
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
