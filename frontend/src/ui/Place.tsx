/**
 * Plassering på en liste (B-237): medalje i gull, sølv eller bronse for de tre første, ellers plassnummeret. Erstatter
 * medaljetegnene, så topplistene bruker ikonene i designsystemet.
 */
import { Icon } from "./icons";

const MEDAL = ["gull", "solv", "bronse"] as const;

export function Place({ plass }: { plass: number }) {
  if (plass < 1 || plass > 3) return <>{plass}.</>;
  return (
    <span className={`g-place is-${MEDAL[plass - 1]}`} role="img" aria-label={`${plass}. plass`}>
      <Icon name="medal" />
    </span>
  );
}
