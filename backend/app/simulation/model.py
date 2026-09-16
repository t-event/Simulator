from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Phase(str, Enum):
    IDLE = "idle"
    CHARGING = "charging"
    BORE_IN = "bore_in"
    MELTING = "melting"
    REFINING = "refining"
    TAPPING = "tapping"
    TURNAROUND = "turnaround"


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
    position_pct: float = 0.0  # 0 = fully raised, 100 = fully lowered
    target_position_pct: float = 0.0
    current_ka: float = 0.0
    voltage_v: float = 0.0
    mode: RegulationMode = RegulationMode.AUTO
    consumed_m: float = 0.0
    length_m: float = 6.0
    broken: bool = False


@dataclass
class CoolingCircuitState:
    name: str
    flow_lpm: float
    nominal_flow_lpm: float
    delta_t_c: float = 0.0
    leaking: bool = False
    blocked_pct_loss: float = 0.0  # fraction of flow lost, 0..1


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
class FurnaceState:
    time_s: float = 0.0
    phase: Phase = Phase.IDLE
    power_on: bool = False
    time_scale: float = 1.0

    transformer_tap: int = 3
    total_power_mw: float = 0.0
    electrical_power_mw: float = 0.0
    chemical_power_mw: float = 0.0

    electrodes: list[ElectrodeState] = field(default_factory=list)

    baskets_charged: int = 0
    bath_mass_kg: float = 0.0
    bath_enthalpy_kj_per_kg: float = 0.0
    bath_temp_c: float = 25.0
    solid_fraction: float = 1.0
    carbon_pct: float = 0.0

    oxygen_flow_nm3h: float = 0.0
    carbon_injection_kg_min: float = 0.0
    burner_on: bool = False
    slag_foam_index: float = 0.0

    door_open: bool = False
    tilt_deg: float = 0.0

    offgas_temp_c: float = 25.0
    offgas_co_pct: float = 0.0

    cooling: dict[str, CoolingCircuitState] = field(default_factory=dict)

    energy_total_mwh: float = 0.0
    tap_to_tap_target_min: float = 45.0

    alarms: list[Alarm] = field(default_factory=list)
    next_alarm_id: int = 1

    scenario: Optional[str] = None
