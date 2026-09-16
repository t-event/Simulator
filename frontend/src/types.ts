export type Phase =
  | "idle"
  | "charging"
  | "bore_in"
  | "melting"
  | "refining"
  | "tapping"
  | "turnaround";

export type RegulationMode = "auto" | "manual";
export type Severity = "info" | "warning" | "critical";

export interface ElectrodeState {
  index: number;
  position_pct: number;
  target_position_pct: number;
  current_ka: number;
  voltage_v: number;
  mode: RegulationMode;
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

export interface FurnaceState {
  time_s: number;
  phase: Phase;
  power_on: boolean;
  time_scale: number;
  transformer_tap: number;
  total_power_mw: number;
  electrical_power_mw: number;
  chemical_power_mw: number;
  electrodes: ElectrodeState[];
  baskets_charged: number;
  bath_mass_kg: number;
  bath_temp_c: number;
  solid_fraction: number;
  carbon_pct: number;
  oxygen_flow_nm3h: number;
  carbon_injection_kg_min: number;
  burner_on: boolean;
  slag_foam_index: number;
  door_open: boolean;
  tilt_deg: number;
  offgas_temp_c: number;
  offgas_co_pct: number;
  cooling: Record<string, CoolingCircuitState>;
  energy_total_mwh: number;
  alarms: Alarm[];
  scenario: string | null;
}

export interface ScenarioInfo {
  id: string;
  name: string;
  briefing: string;
}

export const PHASE_LABEL: Record<Phase, string> = {
  idle: "Klar",
  charging: "Charging",
  bore_in: "Innboring",
  melting: "Smelting",
  refining: "Raffinering",
  tapping: "Tapping",
  turnaround: "Snuoperasjon",
};
