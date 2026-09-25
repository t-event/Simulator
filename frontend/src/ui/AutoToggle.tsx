import { AUTOMATION, automationUnlocked, RESEARCH, type AutomationKey } from "../game/research";
import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";

type BoolKey = Exclude<AutomationKey, "secondsAction">;

/** Navnet på forskningen som låser opp en automatikk */
function lockName(k: AutomationKey): string {
  return RESEARCH.find((r) => r.id === AUTOMATION[k])?.name ?? "forskning";
}

/** Låst automatikk: forklarer hva som må forskes fram (B-054) */
export function AutoLocked({ k, label }: { k: AutomationKey; label: string }) {
  return (
    <p className="g-locked-auto">
      🔒 {label} – forsk fram «{lockName(k)}».
    </p>
  );
}

/** Bryter for automatikk. Er den ikke forsket fram, vises en lås i stedet (B-054) */
export function AutoToggle({ g, act, k, label }: { g: GameState; act: GameApi["act"]; k: BoolKey; label: string }) {
  if (!automationUnlocked(g, k)) return <AutoLocked k={k} label={label} />;
  return (
    <label className="g-toggle">
      <input
        type="checkbox"
        checked={!!g.settings[k]}
        onChange={(e) => act((gg) => void (gg.settings[k] = e.target.checked))}
      />
      <span>{label}</span>
    </label>
  );
}
