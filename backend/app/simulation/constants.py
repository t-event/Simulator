"""Physical constants and furnace design parameters for the EAF model.

Values are representative of a medium-size (~80-100 t) electric arc furnace
and are chosen for plausible dynamic behaviour rather than for matching any
single real installation.
"""

# --- Thermodynamics of steel scrap/bath -------------------------------------
AMBIENT_TEMP_C = 25.0
MELTING_POINT_C = 1520.0
TAP_TARGET_TEMP_C = 1640.0
CP_SOLID_STEEL_KJ_KG_K = 0.60
CP_LIQUID_STEEL_KJ_KG_K = 0.82
LATENT_HEAT_FUSION_KJ_KG = 272.0

# Enthalpy (relative to ambient) at which scrap is fully solid at melting point
H_SOLID_AT_MELT_KJ_KG = CP_SOLID_STEEL_KJ_KG_K * (MELTING_POINT_C - AMBIENT_TEMP_C)
# Enthalpy at which scrap is fully melted (all latent heat absorbed)
H_FULLY_MELTED_KJ_KG = H_SOLID_AT_MELT_KJ_KG + LATENT_HEAT_FUSION_KJ_KG

# --- Furnace / transformer ---------------------------------------------------
TRANSFORMER_RATED_MVA = 60.0
TRANSFORMER_TAPS_V = [400, 480, 560, 620, 680, 740, 800, 870]  # secondary line voltage per tap
NUM_ELECTRODES = 3
ELECTRODE_DIAMETER_MM = 610
ELECTRODE_MAX_CURRENT_KA = 65.0
ELECTRODE_CONSUMPTION_KG_PER_MWH = 1.6  # graphite consumption rate
ARC_POWER_FACTOR = 0.75

# Furnace capacity
MAX_BATH_MASS_KG = 100_000.0
BASKET_MASS_KG = 45_000.0  # typical scrap basket charge
MAX_BASKETS = 3

# --- Losses -------------------------------------------------------------------
# Nominal radiative + conductive loss through walls/roof at full temperature,
# reduced by a foamy-slag shielding factor.
NOMINAL_WALL_ROOF_LOSS_MW = 6.5
DOOR_OPEN_EXTRA_LOSS_MW = 3.0
OFFGAS_NOMINAL_LOSS_MW = 5.0

# --- Cooling water circuits -----------------------------------------------
CP_WATER_KJ_KG_K = 4.186
COOLING_CIRCUITS = {
    "roof": {"nominal_flow_lpm": 2800.0, "loss_share": 0.45},
    "wall_panels": {"nominal_flow_lpm": 3200.0, "loss_share": 0.55},
}
WATER_DENSITY_KG_L = 1.0

# --- Chemistry ------------------------------------------------------------
CARBON_START_PCT = 4.0  # typical carbon content of scrap/hot heel before refining
CARBON_TAP_TARGET_PCT = 0.08
DECARB_RATE_PCT_PER_NM3 = 0.017  # %C removed per Nm3 O2 (approx, simplified, tuned so a ~15 min oxygen blow takes carbon from ~4% to tap target)
CHEMICAL_ENERGY_PER_NM3_O2_MJ = 9.0  # exothermic energy released per Nm3 O2 used for decarb/post-combustion
BURNER_CHEMICAL_POWER_MW = 4.0  # oxy-fuel burner rated chemical power when on

# --- Electrode regulation ---------------------------------------------------
AER_GAIN = 0.35  # proportional gain of automatic electrode regulator
MAX_ELECTRODE_SPEED_PCT_PER_S = 4.0  # max hydraulic slew rate of electrode arm

# --- Simulation timing -------------------------------------------------------
DEFAULT_DT_S = 1.0
DEFAULT_TICK_HZ = 4  # wall-clock broadcast rate
