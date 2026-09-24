/**
 * Valideringskjøring for prosessmodellen.
 *
 * Kjør med `npx tsx src/sim/validate.ts` fra frontend/. Tallene skal ligge
 * innenfor det som er vanlig for en lysbueovn i denne størrelsen: en normalt
 * kjørt charge på rundt 390 kWh/t og ca. 59 min tapp-til-tapp, med FeO rundt
 * 29 % og B2 rundt 1,7. Avvik her betyr at modellen har endret oppførsel.
 */
import { EAFSimulation } from "./eaf";
import { serializeState } from "./serialize";

interface RunResult {
  meltDoneS: number;
  tempAfterMelt: number;
  pAfterMelt: number;
  pAfterHeating: number;
  b2: number;
  feo: number;
  totalS: number;
  kwhPerTonne: number;
  tap: ReturnType<typeof serializeState>["last_tap_result"];
}

function runCharge(options: { deslagFirst: boolean; scrapP?: number; seed?: number }): RunResult {
  const sim = new EAFSimulation(options.seed ?? 11);
  sim.startCharge("AR20");
  if (options.scrapP) sim.injectFault("high_phosphorus_scrap", { value: options.scrapP });
  sim.setConveyor(true);
  sim.setConveyorRate(2.2);
  sim.setPower(true);
  sim.setTransformerTap(6);
  sim.setLimeRate(42);
  sim.setDolomiteRate(32);
  sim.setOxygenFlow(1700);
  sim.setCarbonInjection(28);

  let t = 0;
  // Innsmelting med enkel operatørregulering av effekt mot temperatur
  while (sim.state.phase === "innsmelting" && t < 8000) {
    if (sim.state.bathTempC > 1620 && sim.state.transformerTap > 3) sim.setTransformerTap(3);
    else if (sim.state.bathTempC < 1570 && sim.state.transformerTap < 6) sim.setTransformerTap(6);
    sim.step(1);
    t += 1;
  }
  const meltDoneS = t;
  const tempAfterMelt = sim.state.bathTempC;
  const pAfterMelt = sim.state.phosphorusPct;

  sim.setOxygenFlow(0);
  sim.setCarbonInjection(0);
  sim.setLimeRate(0);
  sim.setDolomiteRate(0);
  sim.setConveyor(false);

  const deslag = () => {
    sim.setPower(false);
    sim.setSlagDoor(true);
    sim.setTilt(-12);
    for (let i = 0; i < 420; i++) {
      sim.step(1);
      t += 1;
    }
    sim.setTilt(0);
    sim.setSlagDoor(false);
  };

  if (options.deslagFirst) deslag();

  sim.setPower(true);
  sim.setTransformerTap(5);
  let heat = 0;
  while (sim.state.bathTempC < sim.tapTargetTempC && heat < 3000) {
    sim.step(1);
    t += 1;
    heat += 1;
  }
  const pAfterHeating = sim.state.phosphorusPct;

  if (!options.deslagFirst) deslag();

  sim.setPower(false);
  sim.startTap();
  while (sim.state.phase === "tapping" && t < 20000) {
    sim.step(1);
    t += 1;
  }

  const d = serializeState(sim);
  return {
    meltDoneS,
    tempAfterMelt,
    pAfterMelt,
    pAfterHeating,
    b2: d.b2,
    feo: d.slag_pct.FeO ?? 0,
    totalS: t,
    kwhPerTonne: d.energy_per_tonne_kwh,
    tap: d.last_tap_result,
  };
}

const fmt = (n: number, d = 1) => n.toFixed(d);

console.log("=== Normal charge, riktig prosedyre (slagg av før oppvarming) ===");
const normal = runCharge({ deslagFirst: true });
console.log(`  Innsmelting ferdig:  ${fmt(normal.meltDoneS / 60, 0)} min, bad ${fmt(normal.tempAfterMelt, 0)} °C`);
console.log(`  Tapp-til-tapp:       ${fmt(normal.totalS / 60, 0)} min`);
console.log(`  Energi:              ${normal.kwhPerTonne} kWh/t   (forvarming sparer ca. 10 % mot korgkjøring)`);
console.log(`  Slagg:               FeO ${fmt(normal.feo)} %, B2 ${fmt(normal.b2, 2)}   (vanlig for basisk skumslagg: FeO 25-30 %, B2 1,6-2,0)`);
console.log(`  Fosfor:              ${fmt(normal.pAfterMelt, 4)} etter innsmelting -> ${fmt(normal.tap!.phosphorus_pct, 4)} tappet`);
console.log(`  Tapperesultat:       ${normal.tap!.ok ? "OK" : "AVVIK: " + normal.tap!.deviations.join("; ")}`);

console.log("\n=== Fosfor: prosedyrens betydning ===");
for (const [label, opts] of [
  ["Normal skrap, avslagg først", { deslagFirst: true }],
  ["Normal skrap, varme først", { deslagFirst: false }],
  ["Høyfosfor, avslagg først", { deslagFirst: true, scrapP: 0.085 }],
  ["Høyfosfor, varme først", { deslagFirst: false, scrapP: 0.085 }],
] as const) {
  const r = runCharge(opts);
  console.log(
    `  ${label.padEnd(30)} P ${fmt(r.pAfterMelt, 4)} -> etter oppvarming ${fmt(r.pAfterHeating, 4)} -> tappet ${fmt(r.tap!.phosphorus_pct, 4)}  ${r.tap!.ok ? "OK" : "AVVIK"}`,
  );
}

console.log("\n=== Overoppheting: ildfast ===");
{
  const sim = new EAFSimulation(5);
  sim.startCharge("AR20");
  sim.setConveyor(true);
  sim.setConveyorRate(2.2);
  sim.setPower(true);
  sim.setTransformerTap(7);
  sim.setLimeRate(40);
  sim.setDolomiteRate(34);
  sim.setOxygenFlow(1700);
  sim.setCarbonInjection(28);
  let warn: number | null = null;
  let fail: number | null = null;
  for (let i = 0; i < 8000; i++) {
    sim.step(1);
    const active = sim.state.alarms.filter((a) => a.active).map((a) => a.code);
    if (warn === null && active.includes("REFRACTORY_WEAR")) warn = i;
    if (active.includes("REFRACTORY_BREAKTHROUGH")) {
      fail = i;
      break;
    }
  }
  console.log(`  Bad stabiliserte på ${fmt(sim.state.bathTempC, 0)} °C`);
  console.log(`  Advarsel etter ${warn !== null ? fmt(warn / 60, 0) : "-"} min, gjennombrenning etter ${fail !== null ? fmt(fail / 60, 0) : "-"} min`);
}

console.log("\n=== Ildfastforbruk ved normal drift ===");
{
  const r = new EAFSimulation(11);
  r.startCharge("AR20");
  r.setConveyor(true);
  r.setConveyorRate(2.2);
  r.setPower(true);
  r.setTransformerTap(6);
  r.setLimeRate(42);
  r.setDolomiteRate(32);
  r.setOxygenFlow(1700);
  r.setCarbonInjection(28);
  let t = 0;
  while (r.state.phase === "innsmelting" && t < 8000) {
    if (r.state.bathTempC > 1620 && r.state.transformerTap > 3) r.setTransformerTap(3);
    else if (r.state.bathTempC < 1570 && r.state.transformerTap < 6) r.setTransformerTap(6);
    r.step(1);
    t += 1;
  }
  const wear = r.state.refractoryWear;
  console.log(`  ${fmt(wear * 100, 2)} % per charge  =>  ca. ${Math.round(1 / Math.max(wear, 1e-9))} charger per potte`);
}
