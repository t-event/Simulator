/** Valget Alle / Venner over topplista og ukelista (B-493); vises bare når vennelista har noen */
import type { FriendScope } from "./friendScope";
import { Icon } from "./icons";

export function FriendFilter({ value, onChange }: { value: FriendScope; onChange: (v: FriendScope) => void }) {
  return (
    <div className="g-subtabs g-board-friends" role="tablist" aria-label="Alle eller venner">
      <button
        role="tab"
        aria-selected={value === "alle"}
        className={value === "alle" ? "is-active" : ""}
        onClick={() => onChange("alle")}
      >
        Alle
      </button>
      <button
        role="tab"
        aria-selected={value === "venner"}
        className={value === "venner" ? "is-active" : ""}
        onClick={() => onChange("venner")}
      >
        <Icon name="user-check" /> Venner
      </button>
    </div>
  );
}
