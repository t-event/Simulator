/**
 * Kontrollrommet: spilleren tar styringen over én charge i lysbueovnen.
 *
 * Chargen kjøres i prosessmodellen med skrapet fra spillets resept. Standard
 * er den enkle styringen; ekspertmodus med hele HMI-et kan velges underveis
 * (bare én vei). Resultatet går tilbake til spillet som en vanlig charge.
 */
import { useState } from "react";
import type { ManualResult } from "../../game/engine";
import type { ManualRequest } from "../../game/types";
import { ExpertControl } from "./ExpertControl";
import { SimpleControl } from "./SimpleControl";
import { createSim } from "./simSetup";

interface Props {
  request: ManualRequest;
  furnaceWear: number;
  onDone: (result: ManualResult | null) => void;
}

export function ControlRoom({ request, furnaceWear, onDone }: Props) {
  const [sim] = useState(() => createSim(request, furnaceWear));
  const [startWear] = useState(() => sim.state.refractoryWear);
  const [mode, setMode] = useState<"enkel" | "ekspert">("enkel");

  if (mode === "ekspert") return <ExpertControl sim={sim} startWear={startWear} request={request} onDone={onDone} />;
  return (
    <SimpleControl
      sim={sim}
      startWear={startWear}
      request={request}
      onDone={onDone}
      onExpert={() => setMode("ekspert")}
    />
  );
}
