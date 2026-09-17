import type { EAFSimulation } from "./eaf";
import { getScenario } from "./scenarios";

/** Bruker en operatørkommando på ovnen.
 *
 * Samme dispatch brukes enten kommandoen kommer fra betjeningen i denne
 * nettleseren eller fra en annen maskin via relayen. */
export function applyOperatorCommand(
  sim: EAFSimulation,
  action: string,
  payload: Record<string, unknown> = {},
): void {
  const value = payload.value;
  switch (action) {
    case "set_power":
      sim.setPower(Boolean(value));
      break;
    case "set_transformer_tap":
      sim.setTransformerTap(Number(value));
      break;
    case "set_regulation_mode":
      sim.setRegulationMode(Number(payload.electrode ?? 0), value === "auto" ? "auto" : "manual");
      break;
    case "set_electrode_position":
      sim.setElectrodePosition(Number(payload.electrode ?? 0), Number(value));
      break;
    case "set_electrode_cooling":
      sim.setElectrodeCooling(Number(value));
      break;
    case "start_charge":
      sim.startCharge(payload.grade as string | undefined);
      break;
    case "set_conveyor":
      sim.setConveyor(Boolean(value));
      break;
    case "set_conveyor_rate":
      sim.setConveyorRate(Number(value));
      break;
    case "set_lime_rate":
      sim.setLimeRate(Number(value));
      break;
    case "set_dolomite_rate":
      sim.setDolomiteRate(Number(value));
      break;
    case "set_magnesite_rate":
      sim.setMagnesiteRate(Number(value));
      break;
    case "set_carbon_injection":
      sim.setCarbonInjection(Number(value));
      break;
    case "set_oxygen_flow":
      sim.setOxygenFlow(Number(value));
      break;
    case "set_slag_door":
      sim.setSlagDoor(Boolean(value));
      break;
    case "set_tilt":
      sim.setTilt(Number(value));
      break;
    case "vacuum_hvelv":
      sim.vacuumHvelv();
      break;
    case "start_tap":
      sim.startTap();
      break;
    case "finish_tap":
      sim.finishTap();
      break;
    case "ack_alarm":
      sim.ackAlarm(Number(payload.id ?? 0));
      break;
    case "set_time_scale":
      sim.setTimeScale(Number(value));
      break;
    case "reset":
      sim.reset();
      break;
    default:
      console.warn("ukjent operatørkommando:", action);
  }
}

export function applyInstructorCommand(
  sim: EAFSimulation,
  action: string,
  payload: Record<string, unknown> = {},
): void {
  switch (action) {
    case "inject_fault": {
      const { fault, ...rest } = payload as { fault: string } & Record<string, unknown>;
      sim.injectFault(fault, rest);
      break;
    }
    case "load_scenario": {
      const scenario = getScenario(String(payload.id ?? ""));
      if (!scenario) {
        console.warn("ukjent scenario:", payload.id);
        return;
      }
      sim.reset();
      sim.state.scenario = scenario.id;
      sim.startCharge(scenario.grade);
      for (const { fault, ...rest } of scenario.initialFaults) {
        sim.injectFault(fault, rest);
      }
      break;
    }
    default:
      console.warn("ukjent instruktørkommando:", action);
  }
}
