/**
 * Prosessparametre for stålovnssimulatoren.
 *
 * Verdiene er basert på metallurgikompendiet for Celsa Armeringsstål
 * (Biørnstad & Wiik Asheim, 2. utgave 2024) der kompendiet oppgir tall, og
 * ellers valgt for å gi plausibel dynamikk. Kilde er markert med [K] og
 * kapittelnummer der tallet kommer direkte fra kompendiet.
 */

// --- Termodynamikk stål -----------------------------------------------------
export const AMBIENT_TEMP_C = 25.0;
export const CP_SOLID_STEEL_KJ_KG_K = 0.6;
export const CP_LIQUID_STEEL_KJ_KG_K = 0.82;
export const LATENT_HEAT_FUSION_KJ_KG = 272.0;

// Likvidustemperatur som funksjon av karboninnhold.
// Tilpasset kompendiets tall [K 6.5]: TP26 (0,2 %C) -> 1504 °C, TP77 (0,8 %C) -> 1462 °C
export const LIQUIDUS_BASE_C = 1518.0;
export const LIQUIDUS_PER_PCT_C = 70.0;

export function liquidusTempC(carbonPct: number): number {
  return LIQUIDUS_BASE_C - LIQUIDUS_PER_PCT_C * carbonPct;
}

// Stålet tappes varmere enn likvidus fordi det taper varme i øsa og øseovnen
// trenger margin for legeringstilsats [K 5.1, 6.5]
export const TAP_SUPERHEAT_TARGET_C = 120.0;
export const TAP_SUPERHEAT_WINDOW_C = 20.0;
export const LADLE_TEMP_DROP_C_PER_MIN = 1.3; // [K 5.1]
export const BATH_TEMP_CRITICAL_C = 1720.0; // [K 5.1] for varmt stål sliter mye fortere på ildfast

// Ildfastslitasje: normal drift bruker opp potta over mange charger, mens
// overoppheting tærer den ned på minutter [K 5.1, 9.2]
export const REFRACTORY_BASE_WEAR_PER_S = 0.000006;
export const REFRACTORY_HOT_WEAR_PER_K_S = 0.0000033;

// --- Ovn og charge ----------------------------------------------------------
export const CHARGE_SCRAP_MASS_KG = 92_000.0; // [K 3.4] en skrapkasse = en charge
export const HEEL_MASS_KG = 25_000.0; // stålsump som står igjen etter tapping [K 3.3, 9.1.1]
export const TAP_HOLE_DRAIN_KG_S = 450.0;

// --- Conveyor og forvarming -------------------------------------------------
export const CONVEYOR_MAX_RATE_T_MIN = 3.5;
export const OFFGAS_NOMINAL_TEMP_C = 800.0; // [K 3.1]
export const OFFGAS_MAX_TEMP_C = 1200.0; // [K 3.1]
export const PREHEAT_MAX_TEMP_C = 550.0;
export const STATIC_SEAL_FALSE_AIR_PENALTY = 0.45; // [K 3.2]

// --- Elektrisk --------------------------------------------------------------
export const TRANSFORMER_RATED_MVA = 90.0;
export const TRANSFORMER_TAPS_V = [400, 480, 560, 620, 680, 740, 800, 870];
export const NUM_ELECTRODES = 3;
export const ELECTRODE_MAX_CURRENT_KA = 70.0;
export const ARC_POWER_FACTOR = 0.75;
export const AER_GAIN = 0.35;
export const MAX_ELECTRODE_SPEED_PCT_PER_S = 4.0;

// --- Elektrodeslitasje [K 1.5.2] -------------------------------------------
// Sideoksidasjon ~1/2, tippfordamping ~1/4, tippbrudd ~1/4 av forbruket
export const ELECTRODE_SIDE_OXIDATION_M_PER_H = 0.055;
export const ELECTRODE_TIP_VAPORIZATION_M_PER_MWH = 0.0016;
export const ELECTRODE_LENGTH_NEW_M = 6.0;
export const ELECTRODE_MIN_LENGTH_M = 2.2;
export const ELECTRODE_COOLING_NOMINAL_PCT = 50.0;

// --- Overslag [K 1.5.4] -----------------------------------------------------
export const OVERSLAG_BASE_RISK_PER_S = 0.00004;
export const OVERSLAG_COOLING_FACTOR = 2.5;
export const OVERSLAG_DUST_FACTOR = 3.0;
export const OVERSLAG_WATER_LEAK_PROBABILITY = 0.35;

// --- Tap og kjøling ---------------------------------------------------------
export const NOMINAL_WALL_ROOF_LOSS_MW = 7.5;
export const DOOR_OPEN_EXTRA_LOSS_MW = 3.0;
export const FOAM_SHIELD_MAX_REDUCTION = 0.45; // [K 4.3.2]

export const CP_WATER_KJ_KG_K = 4.186;
export const WATER_DENSITY_KG_L = 1.0;
export const COOLING_CIRCUITS: Record<string, { nominalFlowLpm: number; lossShare: number }> = {
  hvelv: { nominalFlowLpm: 3200.0, lossShare: 0.4 },
  paneler: { nominalFlowLpm: 3600.0, lossShare: 0.45 },
  conveyor_hood: { nominalFlowLpm: 1800.0, lossShare: 0.15 },
};
export const COOLING_DELTA_T_WARNING_C = 20.0;
export const COOLING_DELTA_T_CRITICAL_C = 25.0;

// --- Tilsatser [K 4.2] ------------------------------------------------------
// Brent kalk: ca. 95 wt% CaO. Brent dolomitt: minst 30 wt% MgO og 55 wt% CaO.
export const LIME_COMPOSITION: Record<string, number> = {
  CaO: 0.95,
  SiO2: 0.02,
  MgO: 0.01,
  Al2O3: 0.02,
};
export const DOLOMITE_COMPOSITION: Record<string, number> = {
  CaO: 0.55,
  MgO: 0.32,
  SiO2: 0.05,
  Al2O3: 0.03,
};
export const MAGNESITE_COMPOSITION: Record<string, number> = {
  MgO: 0.9,
  CaO: 0.03,
  SiO2: 0.03,
  Al2O3: 0.04,
};

export const LIME_MAX_KG_MIN = 250.0;
export const DOLOMITE_MAX_KG_MIN = 120.0;
export const MAGNESITE_MAX_KG_MIN = 80.0;
export const CARBON_INJECTION_MAX_KG_MIN = 120.0; // [K 4.2.2]
export const OXYGEN_MAX_NM3_H = 4500.0; // [K 4.2.4]

// --- Slaggmål [K 4.3.2] -----------------------------------------------------
export const B2_TARGET = 1.8; // CaO / SiO2
export const B3_TARGET = 1.25; // CaO / (SiO2 + Al2O3)
export const B2_WINDOW = 0.35;
export const FEO_TARGET_PCT = 25.0; // jf. slaggprøve TP26 med 28,8 % FeO [K 4.3.1]

// Oksider som følger med skrapet (smuss, rust, sand) og ildfastslitasje, kg per kg skrap.
// Kalibrert slik at en normalt kjørt charge havner nær slaggprøven i kompendiet [K 4.3.1].
export const SCRAP_OXIDE_YIELD: Record<string, number> = {
  SiO2: 0.012,
  Al2O3: 0.0068,
  MnO: 0.003,
  Cr2O3: 0.0044,
  MgO: 0.004,
  CaO: 0.001,
  FeO: 0.018,
};

// Anbefalte tilsatsrater for en normal charge, brukt som utgangspunkt i HMI
export const LIME_TYPICAL_KG_MIN = 45.0;
export const DOLOMITE_TYPICAL_KG_MIN = 34.0;

// --- Kjemi ------------------------------------------------------------------
export const CARBON_FROM_SCRAP_PCT = 0.45;
export const PHOSPHORUS_FROM_SCRAP_PCT = 0.035; // [K 4.3.3]

export const O2_NM3_PER_KG_CARBON = 0.93; // C + 1/2 O2 -> CO
export const ENERGY_C_TO_CO_MJ_PER_KG_C = 9.2;
export const ENERGY_FE_OXIDATION_MJ_PER_KG_FE = 4.8;
export const ENERGY_SI_OXIDATION_MJ_PER_KG_SI = 28.0;
export const ENERGY_MN_OXIDATION_MJ_PER_KG_MN = 7.0;

// Fordeling av oksygen når karboninnholdet er lavt: mer går til jern, og FeO stiger [K 4.3.1]
export const DECARB_EFFICIENCY_AT_HIGH_C = 0.85;
export const DECARB_EFFICIENCY_AT_LOW_C = 0.25;
export const CARBON_PCT_FOR_FULL_DECARB = 0.3;

// Avfosforering [K 4.3.3]
export const DEPHOS_RATE_CONSTANT = 0.0006;
export const DEPHOS_TEMP_REFERENCE_C = 1580.0;

// --- Tipping ----------------------------------------------------------------
export const SLAG_POSITION_DEG = -12.0; // [K 4.1]
export const TAP_POSITION_DEG = 14.0; // [K 4.1]
export const SLAG_DRAIN_KG_S = 28.0;

// --- Simulering -------------------------------------------------------------
export const DEFAULT_TICK_HZ = 4;
