/**
 * Kontrollrommet: spilleren tar styringen over én charge i lysbueovnen.
 *
 * Chargen kjøres i prosessmodellen med skrapet fra spillets resept, med den enkle
 * styringen (B-077). Resultatet går tilbake til spillet som en vanlig charge.
 */
import { useState } from "react";
import type { ManualResult } from "../../game/engine";
import type { ManualRequest } from "../../game/types";
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
  return <SimpleControl sim={sim} startWear={startWear} request={request} onDone={onDone} />;
}
