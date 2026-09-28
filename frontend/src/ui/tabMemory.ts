/**
 * Felles navigasjon (B-233): hver hovedmeny husker underfanen den sto på. GameApp holder minnet, sidene melder fra
 * når underfanen byttes. Et trykk på menyknappen til siden du alt står på, går til første underfane.
 */
import { useEffect } from "react";

export type OnTab = (tab: string) => void;

/** Melder fra til GameApp når underfanen byttes */
export function useReportTab(tab: string, onTab?: OnTab) {
  useEffect(() => {
    onTab?.(tab);
  }, [tab, onTab]);
}
