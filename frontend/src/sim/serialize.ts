import * as C from "./constants";
import type { EAFSimulation } from "./eaf";
import type { FurnaceState } from "../types";

const round = (value: number, decimals: number): number => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

/** Gjør intern ovnstilstand om til det flate formatet HMI-et leser. */
export function serializeState(sim: EAFSimulation): FurnaceState {
  const s = sim.state;
  const grade = s.grade;
  return {
    time_s: round(s.timeS, 1),
    phase: s.phase,
    power_on: s.powerOn,
    time_scale: s.timeScale,
    heat_number: s.heatNumber,
    grade: grade
      ? {
          code: grade.code,
          name: grade.name,
          tap_carbon_min_pct: grade.tapCarbonMinPct,
          tap_carbon_max_pct: grade.tapCarbonMaxPct,
          phosphorus_max_pct: grade.phosphorusMaxPct,
          final_carbon_pct: grade.finalCarbonPct,
        }
      : null,

    transformer_tap: s.transformerTap,
    electrical_power_mw: round(s.electricalPowerMw, 2),
    chemical_power_mw: round(s.chemicalPowerMw, 2),
    total_power_mw: round(s.electricalPowerMw + s.chemicalPowerMw, 2),
    electrodes: s.electrodes.map((e) => ({
      index: e.index,
      position_pct: round(e.positionPct, 1),
      target_position_pct: round(e.targetPositionPct, 1),
      current_ka: round(e.currentKa, 1),
      voltage_v: round(e.voltageV, 0),
      mode: e.mode,
      length_m: round(e.lengthM, 2),
      consumed_m: round(e.consumedM, 3),
      broken: e.broken,
    })),
    electrode_cooling_pct: s.electrodeCoolingPct,
    hvelv_dust_level: round(s.hvelvDustLevel, 3),

    liquid_mass_kg: round(s.liquidMassKg, 0),
    solid_scrap_kg: round(s.solidScrapKg, 0),
    bath_temp_c: round(s.bathTempC, 1),
    liquidus_c: round(sim.liquidusC, 1),
    tap_target_temp_c: round(sim.tapTargetTempC, 1),
    tap_window_c: C.TAP_SUPERHEAT_WINDOW_C,
    carbon_pct: round(s.carbonPct, 3),
    phosphorus_pct: round(s.phosphorusPct, 4),
    silicon_pct: round(s.siliconPct, 3),
    manganese_pct: round(s.manganesePct, 3),

    conveyor_running: s.conveyorRunning,
    conveyor_rate_t_min: round(s.conveyorRateTMin, 2),
    preheat_temp_c: round(s.preheatTempC, 0),
    static_seal_ok: s.staticSealOk,
    charge_remaining_kg: round(s.chargeRemainingKg, 0),
    scrap_charged_kg: round(s.scrapChargedKg, 0),
    charge_total_kg: C.CHARGE_SCRAP_MASS_KG,

    slag_mass_kg: round(sim.slagMassKg, 0),
    slag_pct: Object.fromEntries(
      Object.keys(s.slag).map((ox) => [ox, round(sim.slagPct(ox), 2)]),
    ),
    b2: round(sim.b2, 2),
    b3: round(sim.b3, 2),
    b2_target: C.B2_TARGET,
    b3_target: C.B3_TARGET,
    b2_window: C.B2_WINDOW,
    slag_foam_index: round(s.slagFoamIndex, 2),

    lime_rate_kg_min: s.limeRateKgMin,
    dolomite_rate_kg_min: s.dolomiteRateKgMin,
    magnesite_rate_kg_min: s.magnesiteRateKgMin,
    carbon_injection_kg_min: s.carbonInjectionKgMin,
    oxygen_flow_nm3h: s.oxygenFlowNm3h,
    lime_total_kg: round(s.limeTotalKg, 0),
    dolomite_total_kg: round(s.dolomiteTotalKg, 0),
    carbon_total_kg: round(s.carbonTotalKg, 0),
    oxygen_total_nm3: round(s.oxygenTotalNm3, 0),

    slag_door_open: s.slagDoorOpen,
    tilt_deg: round(s.tiltDeg, 1),
    slag_position_deg: C.SLAG_POSITION_DEG,
    tap_position_deg: C.TAP_POSITION_DEG,

    offgas_temp_c: round(s.offgasTempC, 0),
    offgas_co_pct: round(s.offgasCoPct, 2),
    cooling: Object.fromEntries(
      Object.entries(s.cooling).map(([name, c]) => [
        name,
        {
          flow_lpm: round(c.flowLpm, 0),
          nominal_flow_lpm: c.nominalFlowLpm,
          delta_t_c: round(c.deltaTC, 1),
          leaking: c.leaking,
        },
      ]),
    ),
    cooling_warning_dt: C.COOLING_DELTA_T_WARNING_C,
    cooling_critical_dt: C.COOLING_DELTA_T_CRITICAL_C,

    energy_total_mwh: round(s.energyTotalMwh, 2),
    refractory_wear: round(s.refractoryWear, 4),
    energy_per_tonne_kwh:
      s.scrapChargedKg > 1000
        ? round((s.energyTotalMwh * 1000) / (s.scrapChargedKg / 1000), 0)
        : 0,
    last_tap_result: s.lastTapResult,

    alarms: s.alarms
      .filter((a) => a.active || !a.ack)
      .map((a) => ({
        id: a.id,
        code: a.code,
        message: a.message,
        severity: a.severity,
        active: a.active,
        ack: a.ack,
        raised_at_s: round(a.raisedAtS, 1),
      })),
    scenario: s.scenario,
  };
}
