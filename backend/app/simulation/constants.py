"""Prosessparametre for stålovnssimulatoren.

Verdiene er basert på metallurgikompendiet for Celsa Armeringsstål
(Biørnstad & Wiik Asheim, 2. utgave 2024) der kompendiet oppgir tall, og
ellers valgt for å gi plausibel dynamikk. Kilde er markert med [K] og
kapittelnummer der tallet kommer direkte fra kompendiet.
"""

# --- Termodynamikk stål ------------------------------------------------------
AMBIENT_TEMP_C = 25.0
CP_SOLID_STEEL_KJ_KG_K = 0.60
CP_LIQUID_STEEL_KJ_KG_K = 0.82
LATENT_HEAT_FUSION_KJ_KG = 272.0

# Likvidustemperatur som funksjon av karboninnhold.
# Tilpasset kompendiets tall [K 6.5]: TP26 (0,2 %C) -> 1504 °C, TP77 (0,8 %C) -> 1462 °C
LIQUIDUS_BASE_C = 1518.0
LIQUIDUS_PER_PCT_C = 70.0


def liquidus_temp_c(carbon_pct: float) -> float:
    return LIQUIDUS_BASE_C - LIQUIDUS_PER_PCT_C * carbon_pct


# Stålet tappes varmere enn likvidus fordi det taper varme i øsa og øseovnen
# trenger margin for legeringstilsats [K 5.1, 6.5]
TAP_SUPERHEAT_TARGET_C = 120.0
TAP_SUPERHEAT_WINDOW_C = 20.0
LADLE_TEMP_DROP_C_PER_MIN = 1.3  # [K 5.1] tommelfingerregel for temperaturfall i øse
BATH_TEMP_CRITICAL_C = 1720.0  # [K 5.1] for varmt stål sliter mye fortere på ildfast
# Ildfastslitasje: normal drift bruker opp potta over mange charger, mens
# overoppheting tærer den ned på minutter [K 5.1, 9.2]
REFRACTORY_BASE_WEAR_PER_S = 0.0000060
REFRACTORY_HOT_WEAR_PER_K_S = 0.0000033

# --- Ovn og charge -----------------------------------------------------------
CHARGE_SCRAP_MASS_KG = 92_000.0  # [K 3.4] en skrapkasse = en charge = ca. 92 tonn
HEEL_MASS_KG = 25_000.0  # stålsump som står igjen etter tapping [K 3.3, 9.1.1]
MAX_BATH_MASS_KG = 130_000.0
TAP_HOLE_DRAIN_KG_S = 450.0

# --- Conveyor og forvarming --------------------------------------------------
# Skrapet mates kontinuerlig inn via conveyor gjennom en vannkjølt forvarmingsdel
# som varmes av avgassen fra ovnen [K 3.1]
CONVEYOR_MAX_RATE_T_MIN = 3.5
OFFGAS_NOMINAL_TEMP_C = 800.0  # [K 3.1] avgass ligger rundt 800 °C
OFFGAS_MAX_TEMP_C = 1200.0  # [K 3.1] kan gå opp til 1200 °C
PREHEAT_MAX_TEMP_C = 550.0
PREHEAT_ENERGY_SAVING = 0.10  # [K 3.1] ca. 10 % mindre strøm enn korgkjøring
STATIC_SEAL_FALSE_AIR_PENALTY = 0.45  # tap av forvarmingseffekt ved falskluft [K 3.2]

# --- Elektrisk ---------------------------------------------------------------
TRANSFORMER_RATED_MVA = 90.0
TRANSFORMER_TAPS_V = [400, 480, 560, 620, 680, 740, 800, 870]
NUM_ELECTRODES = 3
ELECTRODE_MAX_CURRENT_KA = 70.0
ARC_POWER_FACTOR = 0.75
AER_GAIN = 0.35
MAX_ELECTRODE_SPEED_PCT_PER_S = 4.0

# --- Elektrodeslitasje [K 1.5.2] ---------------------------------------------
# Sideoksidasjon ~1/2, tippfordamping ~1/4, tippbrudd ~1/4 av forbruket
ELECTRODE_SIDE_OXIDATION_M_PER_H = 0.055
ELECTRODE_TIP_VAPORIZATION_M_PER_MWH = 0.0016
ELECTRODE_LENGTH_NEW_M = 6.0
ELECTRODE_MIN_LENGTH_M = 2.2  # under dette nærmer nippelen seg lysbuen -> bruddfare
ELECTRODE_COOLING_NOMINAL_PCT = 50.0

# --- Overslag [K 1.5.4] ------------------------------------------------------
# Overslag skjer når strømmen går andre veier enn ned i stålbadet. Risikoen øker
# med støv i hvelvet og med økt vannkjøling på elektrodene.
OVERSLAG_BASE_RISK_PER_S = 0.00004
OVERSLAG_COOLING_FACTOR = 2.5
OVERSLAG_DUST_FACTOR = 3.0
OVERSLAG_WATER_LEAK_PROBABILITY = 0.35  # sjanse for at overslag treffer vannkjølt element

# --- Tap og kjøling ----------------------------------------------------------
NOMINAL_WALL_ROOF_LOSS_MW = 7.5
DOOR_OPEN_EXTRA_LOSS_MW = 3.0
FOAM_SHIELD_MAX_REDUCTION = 0.45  # skumslagg isolerer lysbuen og reduserer strålevarme [K 4.3.2]

CP_WATER_KJ_KG_K = 4.186
WATER_DENSITY_KG_L = 1.0
COOLING_CIRCUITS = {
    "hvelv": {"nominal_flow_lpm": 3200.0, "loss_share": 0.40},
    "paneler": {"nominal_flow_lpm": 3600.0, "loss_share": 0.45},
    "conveyor_hood": {"nominal_flow_lpm": 1800.0, "loss_share": 0.15},
}
COOLING_DELTA_T_WARNING_C = 20.0
COOLING_DELTA_T_CRITICAL_C = 25.0

# --- Tilsatser [K 4.2] -------------------------------------------------------
# Brent kalk: ca. 95 wt% CaO. Brent dolomitt: minst 30 wt% MgO og 55 wt% CaO.
LIME_COMPOSITION = {"CaO": 0.95, "SiO2": 0.02, "MgO": 0.01, "Al2O3": 0.02}
DOLOMITE_COMPOSITION = {"CaO": 0.55, "MgO": 0.32, "SiO2": 0.05, "Al2O3": 0.03}
MAGNESITE_COMPOSITION = {"MgO": 0.90, "CaO": 0.03, "SiO2": 0.03, "Al2O3": 0.04}

LIME_MAX_KG_MIN = 250.0
DOLOMITE_MAX_KG_MIN = 120.0
MAGNESITE_MAX_KG_MIN = 80.0
CARBON_INJECTION_MAX_KG_MIN = 120.0  # antrasitt/gummigranulat via KT-lanser [K 4.2.2]
OXYGEN_MAX_NM3_H = 4500.0  # KT-lanser [K 4.2.4]

# --- Slaggmål [K 4.3.2] ------------------------------------------------------
B2_TARGET = 1.8  # CaO / SiO2
B3_TARGET = 1.25  # CaO / (SiO2 + Al2O3)
B2_WINDOW = 0.35
FEO_TARGET_PCT = 25.0  # typisk nivå, jf. slaggprøve TP26 med 28,8 % FeO [K 4.3.1]

# Oksider som følger med skrapet (smuss, rust, sand) og ildfastslitasje, kg per kg skrap.
# Nivåene er kalibrert slik at en normalt kjørt charge havner nær slaggprøven i
# kompendiet [K 4.3.1]: CaO 23,8 / MgO 7,8 / Al2O3 5,7 / Cr2O3 3,7 / MnO 7,1 /
# FeO 28,8 / SiO2 13,7 / P2O5 0,62 wt%.
SCRAP_OXIDE_YIELD = {
    "SiO2": 0.0120,
    "Al2O3": 0.0068,
    "MnO": 0.0030,
    "Cr2O3": 0.0044,
    "MgO": 0.0040,
    "CaO": 0.0010,
    "FeO": 0.0180,
}

# Anbefalte tilsatsrater for en normal charge, brukt som utgangspunkt i HMI
LIME_TYPICAL_KG_MIN = 45.0
DOLOMITE_TYPICAL_KG_MIN = 34.0

# --- Kjemi -------------------------------------------------------------------
CARBON_FROM_SCRAP_PCT = 0.45  # typisk C-nivå i badet ved innsmelting
PHOSPHORUS_FROM_SCRAP_PCT = 0.035  # [K 4.3.3] fosfor kommer inn med skrapet

# Oksygenforbruk og energi
O2_NM3_PER_KG_CARBON = 0.93  # C + 1/2 O2 -> CO
ENERGY_C_TO_CO_MJ_PER_KG_C = 9.2
ENERGY_FE_OXIDATION_MJ_PER_KG_FE = 4.8
ENERGY_SI_OXIDATION_MJ_PER_KG_SI = 28.0
ENERGY_MN_OXIDATION_MJ_PER_KG_MN = 7.0

# Fordeling av oksygen når karboninnholdet er lavt: mer går til jern, og FeO stiger
# [K 4.3.1] "Når vi produserer lavkarbonkvaliteter blåser vi inn mer oksygen ...
# og som resultat får vi høyere FeO%"
DECARB_EFFICIENCY_AT_HIGH_C = 0.85
DECARB_EFFICIENCY_AT_LOW_C = 0.25
CARBON_PCT_FOR_FULL_DECARB = 0.30

# Avfosforering [K 4.3.3]
DEPHOS_RATE_CONSTANT = 0.00060
DEPHOS_TEMP_REFERENCE_C = 1580.0
PHOSPHORUS_REVERSION_RATE = 0.0016

# --- Tipping -----------------------------------------------------------------
SLAG_POSITION_DEG = -12.0  # tipping mot slaggdør for avslagging [K 4.1]
TAP_POSITION_DEG = 14.0  # tipping mot øsedørken for tapping [K 4.1]
SLAG_DRAIN_KG_S = 28.0

# --- Simulering --------------------------------------------------------------
DEFAULT_TICK_HZ = 4
