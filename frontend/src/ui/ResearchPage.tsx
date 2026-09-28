import type { GameState } from "../game/types";
import type { GameApi } from "../game/useGame";
import { Research } from "./Research";

/** Forskning-fanen. Bank og innstillinger har flyttet til Verket → Økonomi og tannhjulet i toppen (B-072). */
export function ResearchPage({
  g,
  act,
  openBook,
}: {
  g: GameState;
  act: GameApi["act"];
  openBook: (chapter?: string) => void;
}) {
  return (
    <div className="g-grid g-research-page">
      <Research g={g} act={act} openBook={openBook} />
    </div>
  );
}
