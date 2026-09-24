/**
 * Felles oppsett for kontrollrommet: prosessmodellen startes med skrapet fra
 * spillets resept, og resultatet av chargen gjøres om til en spillcharge.
 */
import type { ManualResult } from "../../game/engine";
import type { GradeId, ManualRequest } from "../../game/types";
import { EAFSimulation } from "../../sim/eaf";
import { serializeState } from "../../sim/serialize";

/**
 * Spillets kvaliteter kjøres mot nærmeste tappevindu i prosessmodellen.
 * Høykarbon tappes som vanlig og legeres opp i øsa (se B-011).
 */
export const SIM_GRADE: Record<GradeId, string> = {
  enkel: "AR20",
  standard: "AR20",
  armering: "AR20",
  premium: "AR20",
  lavkarbon: "LK08",
  hoykarbon: "AR20",
};

export function createSim(request: ManualRequest, furnaceWear: number): EAFSimulation {
  const sim = new EAFSimulation();
  sim.startCharge(SIM_GRADE[request.grade]);
  // Skrapet fra spillets resept bestemmer fosforet som kommer inn
  sim.state.scrapPhosphorusPct = request.mix.p;
  sim.state.phosphorusPct = request.mix.p;
  sim.state.refractoryWear = Math.min(0.99, furnaceWear);
  return sim;
}

/** Gjør en ferdig tappet (eller gjennombrent) charge om til resultat for spillet. */
export function buildResult(sim: EAFSimulation, startWear: number, stars?: number): ManualResult {
  const snap = serializeState(sim);
  const tap = snap.last_tap_result;
  if (!tap || sim.state.refractoryWear >= 1) {
    return {
      carbonPct: sim.state.carbonPct,
      phosphorusPct: sim.state.phosphorusPct,
      tempDeviationC: 0,
      kwhPerT: snap.energy_per_tonne_kwh,
      // Nok til at spillet registrerer gjennombrenning
      wear: 1.2,
      minutes: sim.state.timeS / 60,
      ok: false,
      deviations: ["gjennombrenning"],
      stars: 0,
    };
  }
  return {
    carbonPct: tap.carbon_pct,
    phosphorusPct: tap.phosphorus_pct,
    tempDeviationC: tap.tap_temp_c - tap.target_temp_c,
    kwhPerT: snap.energy_per_tonne_kwh,
    wear: Math.max(0, sim.state.refractoryWear - startWear),
    minutes: sim.state.timeS / 60,
    ok: tap.ok,
    deviations: tap.deviations,
    stars,
  };
}

/** Kjører modellen fram i steg på maks 1 s, som den er kalibrert for. */
export function stepSim(sim: EAFSimulation, seconds: number, before?: (sim: EAFSimulation) => void): void {
  if (seconds <= 0) return;
  const n = Math.ceil(seconds / 1);
  for (let i = 0; i < n; i++) {
    before?.(sim);
    sim.step(seconds / n);
  }
}
