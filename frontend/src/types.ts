export type Phase =
  | "klar"
  | "innsmelting"
  | "raffinering"
  | "avslagging"
  | "tapping"
  | "klargjoring";

export type RegulationMode = "auto" | "manual";
export type Severity = "info" | "warning" | "critical";

export interface ElectrodeState {
  index: number;
  position_pct: number;
  target_position_pct: number;
  current_ka: number;
  voltage_v: number;
  mode: RegulationMode;
  length_m: number;
  consumed_m: number;
  broken: boolean;
}

export interface CoolingCircuitState {
  flow_lpm: number;
  nominal_flow_lpm: number;
  delta_t_c: number;
  leaking: boolean;
}

export interface Alarm {
  id: number;
  code: string;
  message: string;
  severity: Severity;
  active: boolean;
  ack: boolean;
  raised_at_s: number;
}

export interface Grade {
  code: string;
  name: string;
  tap_carbon_min_pct: number;
  tap_carbon_max_pct: number;
  phosphorus_max_pct: number;
  final_carbon_pct: number;
}

export interface TapResult {
  heat_number: number;
  grade: string;
  tap_temp_c: number;
  target_temp_c: number;
  carbon_pct: number;
  phosphorus_pct: number;
  feo_pct: number;
  b2: number;
  energy_mwh: number;
  deviations: string[];
  ok: boolean;
}

export interface FurnaceState {
  time_s: number;
  phase: Phase;
  power_on: boolean;
  time_scale: number;
  heat_number: number;
  grade: Grade | null;

  transformer_tap: number;
  electrical_power_mw: number;
  chemical_power_mw: number;
  total_power_mw: number;
  electrodes: ElectrodeState[];
  electrode_cooling_pct: number;
  hvelv_dust_level: number;

  liquid_mass_kg: number;
  solid_scrap_kg: number;
  bath_temp_c: number;
  liquidus_c: number;
  tap_target_temp_c: number;
  tap_window_c: number;
  carbon_pct: number;
  phosphorus_pct: number;
  silicon_pct: number;
  manganese_pct: number;

  conveyor_running: boolean;
  conveyor_rate_t_min: number;
  preheat_temp_c: number;
  static_seal_ok: boolean;
  charge_remaining_kg: number;
  scrap_charged_kg: number;
  charge_total_kg: number;

  slag_mass_kg: number;
  slag_pct: Record<string, number>;
  b2: number;
  b3: number;
  b2_target: number;
  b3_target: number;
  b2_window: number;
  slag_foam_index: number;

  lime_rate_kg_min: number;
  dolomite_rate_kg_min: number;
  magnesite_rate_kg_min: number;
  carbon_injection_kg_min: number;
  oxygen_flow_nm3h: number;
  lime_total_kg: number;
  dolomite_total_kg: number;
  carbon_total_kg: number;
  oxygen_total_nm3: number;

  slag_door_open: boolean;
  tilt_deg: number;
  slag_position_deg: number;
  tap_position_deg: number;

  offgas_temp_c: number;
  offgas_co_pct: number;
  cooling: Record<string, CoolingCircuitState>;
  cooling_warning_dt: number;
  cooling_critical_dt: number;

  energy_total_mwh: number;
  refractory_wear: number;
  energy_per_tonne_kwh: number;
  last_tap_result: TapResult | null;

  alarms: Alarm[];
}


export const PHASE_LABEL: Record<Phase, string> = {
  klar: "Klar",
  innsmelting: "Innsmelting",
  raffinering: "Raffinering",
  avslagging: "Avslagging",
  tapping: "Tapping",
  klargjoring: "Klargjøring",
};

export const COOLING_LABEL: Record<string, string> = {
  hvelv: "Hvelv",
  paneler: "Paneler",
  conveyor_hood: "Conveyor-hood",
};
