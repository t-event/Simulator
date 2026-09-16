from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Phase(str, Enum):
    KLAR = "klar"
    INNSMELTING = "innsmelting"
    RAFFINERING = "raffinering"
    AVSLAGGING = "avslagging"
    TAPPING = "tapping"
    KLARGJORING = "klargjoring"


class RegulationMode(str, Enum):
    AUTO = "auto"
    MANUAL = "manual"


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class ElectrodeState:
    index: int
    position_pct: float = 0.0  # 0 = helt hevet, 100 = helt senket
    target_position_pct: float = 0.0
    current_ka: float = 0.0
    voltage_v: float = 0.0
    mode: RegulationMode = RegulationMode.AUTO
    length_m: float = 6.0
    consumed_m: float = 0.0
    broken: bool = False


@dataclass
class CoolingCircuitState:
    name: str
    flow_lpm: float
    nominal_flow_lpm: float
    delta_t_c: float = 0.0
    leaking: bool = False
    flow_loss_fraction: float = 0.0


@dataclass
class Alarm:
    id: int
    code: str
    message: str
    severity: Severity
    active: bool = True
    ack: bool = False
    raised_at_s: float = 0.0


@dataclass
class SteelGrade:
    """TP-kvalitet med de kravene stålovnen skal levere på.

    Karbonvinduet er det stålovnen skal tappe på, ikke ferdig analyse: karbon
    legeres opp igjen ved tapping og på øseovnen. Lavkarbonkvaliteter krever
    mer oksygen på stålovnen og gir høyere FeO i slaggen.
    """

    code: str
    name: str
    tap_carbon_min_pct: float
    tap_carbon_max_pct: float
    phosphorus_max_pct: float
    final_carbon_pct: float


@dataclass
class FurnaceState:
    time_s: float = 0.0
    phase: Phase = Phase.KLAR
    power_on: bool = False
    time_scale: float = 1.0

    # Elektrisk
    transformer_tap: int = 3
    electrical_power_mw: float = 0.0
    chemical_power_mw: float = 0.0
    total_power_mw: float = 0.0
    electrodes: list[ElectrodeState] = field(default_factory=list)
    electrode_cooling_pct: float = 50.0
    hvelv_dust_level: float = 0.0  # 0-1, bygges opp og fjernes ved støvsuging

    # Metall
    liquid_mass_kg: float = 0.0
    solid_scrap_kg: float = 0.0  # umeltet skrap som ligger i badet
    bath_temp_c: float = 25.0
    scrap_charged_kg: float = 0.0
    carbon_pct: float = 0.0
    phosphorus_pct: float = 0.0
    silicon_pct: float = 0.0
    manganese_pct: float = 0.0
    scrap_phosphorus_pct: float = 0.035  # fosfor i skrapet som mates inn

    # Conveyor og forvarming
    conveyor_rate_t_min: float = 0.0
    conveyor_running: bool = False
    preheat_temp_c: float = 25.0
    static_seal_ok: bool = True
    charge_remaining_kg: float = 0.0

    # Slagg (masser i kg per oksid)
    slag: dict[str, float] = field(default_factory=dict)
    slag_foam_index: float = 0.0

    # Tilsatser og injeksjon
    lime_rate_kg_min: float = 0.0
    dolomite_rate_kg_min: float = 0.0
    magnesite_rate_kg_min: float = 0.0
    carbon_injection_kg_min: float = 0.0
    oxygen_flow_nm3h: float = 0.0
    lime_total_kg: float = 0.0
    dolomite_total_kg: float = 0.0
    carbon_total_kg: float = 0.0
    oxygen_total_nm3: float = 0.0

    # Mekanisk
    slag_door_open: bool = False
    tilt_deg: float = 0.0

    # Avgass
    offgas_temp_c: float = 25.0
    offgas_co_pct: float = 0.0

    cooling: dict[str, CoolingCircuitState] = field(default_factory=dict)

    # Produksjon
    grade: Optional[SteelGrade] = None
    energy_total_mwh: float = 0.0
    refractory_wear: float = 0.0  # 0-1, akkumulert slitasje på ovnsstein
    heat_number: int = 0
    tap_started_s: Optional[float] = None
    last_tap_result: Optional[dict] = None

    alarms: list[Alarm] = field(default_factory=list)
    next_alarm_id: int = 1
    scenario: Optional[str] = None
