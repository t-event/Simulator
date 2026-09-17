import type { Phase, RegulationMode, Severity, TapResult } from "../types";

/** TP-kvalitet med de kravene stålovnen skal levere på.
 *
 * Karbonvinduet er det stålovnen skal tappe på, ikke ferdig analyse: karbon
 * legeres opp igjen ved tapping og på øseovnen. */
export interface SteelGrade {
  code: string;
  name: string;
  tapCarbonMinPct: number;
  tapCarbonMaxPct: number;
  phosphorusMaxPct: number;
  finalCarbonPct: number;
}

export interface ElectrodeState {
  index: number;
  positionPct: number; // 0 = helt hevet, 100 = helt senket
  targetPositionPct: number;
  currentKa: number;
  voltageV: number;
  mode: RegulationMode;
  lengthM: number;
  consumedM: number;
  broken: boolean;
}

export interface CoolingCircuitState {
  name: string;
  flowLpm: number;
  nominalFlowLpm: number;
  deltaTC: number;
  leaking: boolean;
  flowLossFraction: number;
}

export interface Alarm {
  id: number;
  code: string;
  message: string;
  severity: Severity;
  active: boolean;
  ack: boolean;
  raisedAtS: number;
}

export interface SimState {
  timeS: number;
  phase: Phase;
  powerOn: boolean;
  timeScale: number;

  // Elektrisk
  transformerTap: number;
  electricalPowerMw: number;
  chemicalPowerMw: number;
  electrodes: ElectrodeState[];
  electrodeCoolingPct: number;
  hvelvDustLevel: number;

  // Metall
  liquidMassKg: number;
  solidScrapKg: number;
  bathTempC: number;
  scrapChargedKg: number;
  carbonPct: number;
  phosphorusPct: number;
  siliconPct: number;
  manganesePct: number;
  scrapPhosphorusPct: number;

  // Conveyor og forvarming
  conveyorRateTMin: number;
  conveyorRunning: boolean;
  preheatTempC: number;
  staticSealOk: boolean;
  chargeRemainingKg: number;

  // Slagg (masser i kg per oksid)
  slag: Record<string, number>;
  slagFoamIndex: number;

  // Tilsatser og injeksjon
  limeRateKgMin: number;
  dolomiteRateKgMin: number;
  magnesiteRateKgMin: number;
  carbonInjectionKgMin: number;
  oxygenFlowNm3h: number;
  limeTotalKg: number;
  dolomiteTotalKg: number;
  carbonTotalKg: number;
  oxygenTotalNm3: number;

  // Mekanisk
  slagDoorOpen: boolean;
  tiltDeg: number;

  // Avgass
  offgasTempC: number;
  offgasCoPct: number;

  cooling: Record<string, CoolingCircuitState>;

  // Produksjon
  grade: SteelGrade | null;
  energyTotalMwh: number;
  refractoryWear: number;
  heatNumber: number;
  lastTapResult: TapResult | null;

  alarms: Alarm[];
  nextAlarmId: number;
  scenario: string | null;
}
