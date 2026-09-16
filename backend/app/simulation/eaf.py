"""Prosessmodell for stålovnen (lysbueovn med conveyor-mating).

Modellen følger prosessen slik den er beskrevet i metallurgikompendiet for
Celsa Armeringsstål: skrapet mates kontinuerlig inn på et flatt bad med
stålsump via en forvarmet conveyor, slagg bygges med kalk og dolomitt,
oksygen og karbon blåses inn gjennom KT-lansene, fosfor tas ut gjennom
slaggen, og chargen slagges av før temperaturen kjøres opp mot tapping.

Modellen er lumped-parameter: den gjengir riktig retning, rekkefølge og
størrelsesorden på de koblingene en operatør faktisk må håndtere, men er
ikke en termodynamisk nøyaktig gjengivelse av anlegget.
"""
from __future__ import annotations

import math
import random

from . import constants as C
from .grades import DEFAULT_GRADE, get_grade
from .model import (
    Alarm,
    CoolingCircuitState,
    ElectrodeState,
    FurnaceState,
    Phase,
    RegulationMode,
    Severity,
)

# Varmeovergang fra badet til umeltet skrap, MW per grad overheting
MELT_HEAT_TRANSFER_MW_PER_K = 1.0
MELT_CONTACT_REFERENCE_KG = 8000.0

# Støkiometri, Nm3 O2 per kg element
O2_NM3_PER_KG_SI = 0.80
O2_NM3_PER_KG_MN = 0.204
O2_NM3_PER_KG_FE = 0.200

# Oksidmasse per kg oksidert element
OXIDE_FACTOR = {
    "SiO2": 60.0 / 28.0,
    "MnO": 71.0 / 55.0,
    "FeO": 72.0 / 56.0,
    "P2O5": 142.0 / 62.0,
}

SLAG_OXIDES = ["CaO", "MgO", "SiO2", "Al2O3", "FeO", "MnO", "Cr2O3", "P2O5"]

# Likevektsnivå for fosfor i stålet under ideelle avfosforeringsforhold
P_EQUILIBRIUM_BASE_PCT = 0.006


class EAFSimulation:
    def __init__(self, rng_seed: int | None = None) -> None:
        self.rng = random.Random(rng_seed)
        self.state = FurnaceState()
        self._reset_furnace()

    # ------------------------------------------------------------------ #
    # Oppsett
    # ------------------------------------------------------------------ #
    def _reset_furnace(self) -> None:
        s = self.state
        s.time_s = 0.0
        s.phase = Phase.KLAR
        s.power_on = False
        s.transformer_tap = 3
        s.electrical_power_mw = 0.0
        s.chemical_power_mw = 0.0
        s.total_power_mw = 0.0
        s.electrodes = [
            ElectrodeState(index=i, length_m=C.ELECTRODE_LENGTH_NEW_M)
            for i in range(C.NUM_ELECTRODES)
        ]
        s.electrode_cooling_pct = C.ELECTRODE_COOLING_NOMINAL_PCT
        s.hvelv_dust_level = 0.1

        # Ovnen står med en stålsump fra forrige charge
        s.liquid_mass_kg = C.HEEL_MASS_KG
        s.solid_scrap_kg = 0.0
        s.bath_temp_c = 1560.0
        s.scrap_charged_kg = 0.0
        s.carbon_pct = C.CARBON_FROM_SCRAP_PCT
        s.phosphorus_pct = C.PHOSPHORUS_FROM_SCRAP_PCT
        s.scrap_phosphorus_pct = C.PHOSPHORUS_FROM_SCRAP_PCT
        s.silicon_pct = 0.15
        s.manganese_pct = 0.20

        s.conveyor_rate_t_min = 0.0
        s.conveyor_running = False
        s.preheat_temp_c = C.AMBIENT_TEMP_C
        s.static_seal_ok = True
        s.charge_remaining_kg = 0.0

        s.slag = {ox: 0.0 for ox in SLAG_OXIDES}
        s.slag["CaO"] = 900.0
        s.slag["MgO"] = 400.0
        s.slag["SiO2"] = 500.0
        s.slag["FeO"] = 700.0
        s.slag_foam_index = 0.0

        s.lime_rate_kg_min = 0.0
        s.dolomite_rate_kg_min = 0.0
        s.magnesite_rate_kg_min = 0.0
        s.carbon_injection_kg_min = 0.0
        s.oxygen_flow_nm3h = 0.0
        s.lime_total_kg = 0.0
        s.dolomite_total_kg = 0.0
        s.carbon_total_kg = 0.0
        s.oxygen_total_nm3 = 0.0

        s.slag_door_open = False
        s.tilt_deg = 0.0
        s.offgas_temp_c = 200.0
        s.offgas_co_pct = 0.0

        s.cooling = {
            name: CoolingCircuitState(
                name=name,
                flow_lpm=cfg["nominal_flow_lpm"],
                nominal_flow_lpm=cfg["nominal_flow_lpm"],
            )
            for name, cfg in C.COOLING_CIRCUITS.items()
        }

        s.grade = DEFAULT_GRADE
        s.energy_total_mwh = 0.0
        s.refractory_wear = 0.0
        s.heat_number = 0
        s.tap_started_s = None
        s.last_tap_result = None
        s.alarms = []
        s.next_alarm_id = 1

    # ------------------------------------------------------------------ #
    # Alarmer
    # ------------------------------------------------------------------ #
    def _raise_alarm(self, code: str, message: str, severity: Severity) -> None:
        s = self.state
        for a in s.alarms:
            if a.code == code and a.active:
                return
        s.alarms.append(
            Alarm(
                id=s.next_alarm_id,
                code=code,
                message=message,
                severity=severity,
                raised_at_s=s.time_s,
            )
        )
        s.next_alarm_id += 1

    def _clear_alarm(self, code: str) -> None:
        for a in self.state.alarms:
            if a.code == code and a.active:
                a.active = False

    def ack_alarm(self, alarm_id: int) -> None:
        for a in self.state.alarms:
            if a.id == alarm_id:
                a.ack = True

    # ------------------------------------------------------------------ #
    # Avledede prosessverdier
    # ------------------------------------------------------------------ #
    @property
    def slag_mass_kg(self) -> float:
        return sum(self.state.slag.values())

    def slag_pct(self, oxide: str) -> float:
        total = self.slag_mass_kg
        if total <= 0:
            return 0.0
        return 100.0 * self.state.slag.get(oxide, 0.0) / total

    @property
    def b2(self) -> float:
        sio2 = self.state.slag.get("SiO2", 0.0)
        if sio2 <= 0:
            return 0.0
        return self.state.slag.get("CaO", 0.0) / sio2

    @property
    def b3(self) -> float:
        denom = self.state.slag.get("SiO2", 0.0) + self.state.slag.get("Al2O3", 0.0)
        if denom <= 0:
            return 0.0
        return self.state.slag.get("CaO", 0.0) / denom

    @property
    def liquidus_c(self) -> float:
        return C.liquidus_temp_c(self.state.carbon_pct)

    @property
    def tap_target_temp_c(self) -> float:
        """Tappetemperatur styres av likvidus for ferdig kvalitet, ikke for badet slik det
        står nå, siden karbonet legeres opp igjen ved tapping og på øseovnen."""
        grade = self.state.grade or DEFAULT_GRADE
        return C.liquidus_temp_c(grade.final_carbon_pct) + C.TAP_SUPERHEAT_TARGET_C

    # ------------------------------------------------------------------ #
    # Operatørkommandoer
    # ------------------------------------------------------------------ #
    def set_power(self, on: bool) -> None:
        s = self.state
        if on:
            if any(e.broken for e in s.electrodes):
                self._raise_alarm(
                    "POWER_BLOCK_ELECTRODE",
                    "Kan ikke slå på lysbue: elektrode er brukket",
                    Severity.WARNING,
                )
                return
            if abs(s.tilt_deg) > 3.0:
                self._raise_alarm(
                    "POWER_BLOCK_TILT",
                    "Kan ikke slå på lysbue mens ovnen er tippet",
                    Severity.WARNING,
                )
                return
        s.power_on = on

    def set_transformer_tap(self, tap: int) -> None:
        self.state.transformer_tap = max(0, min(len(C.TRANSFORMER_TAPS_V) - 1, tap))

    def set_regulation_mode(self, electrode: int, mode: RegulationMode) -> None:
        if 0 <= electrode < len(self.state.electrodes):
            self.state.electrodes[electrode].mode = mode

    def set_electrode_position(self, electrode: int, position_pct: float) -> None:
        if 0 <= electrode < len(self.state.electrodes):
            e = self.state.electrodes[electrode]
            if e.mode == RegulationMode.MANUAL:
                e.target_position_pct = max(0.0, min(100.0, position_pct))

    def set_electrode_cooling(self, pct: float) -> None:
        self.state.electrode_cooling_pct = max(0.0, min(100.0, pct))

    def start_charge(self, grade_code: str | None = None) -> bool:
        """Start ny charge: en skrapkasse på ca. 92 tonn gjøres klar for conveyor."""
        s = self.state
        if s.phase not in (Phase.KLAR, Phase.KLARGJORING):
            return False
        grade = get_grade(grade_code) if grade_code else s.grade
        s.grade = grade or DEFAULT_GRADE
        s.charge_remaining_kg = C.CHARGE_SCRAP_MASS_KG
        s.scrap_charged_kg = 0.0
        s.heat_number += 1
        s.phase = Phase.INNSMELTING
        s.tap_started_s = None
        return True

    def set_conveyor(self, running: bool) -> None:
        self.state.conveyor_running = running

    def set_conveyor_rate(self, t_min: float) -> None:
        self.state.conveyor_rate_t_min = max(0.0, min(C.CONVEYOR_MAX_RATE_T_MIN, t_min))

    def set_lime_rate(self, kg_min: float) -> None:
        self.state.lime_rate_kg_min = max(0.0, min(C.LIME_MAX_KG_MIN, kg_min))

    def set_dolomite_rate(self, kg_min: float) -> None:
        self.state.dolomite_rate_kg_min = max(0.0, min(C.DOLOMITE_MAX_KG_MIN, kg_min))

    def set_magnesite_rate(self, kg_min: float) -> None:
        self.state.magnesite_rate_kg_min = max(0.0, min(C.MAGNESITE_MAX_KG_MIN, kg_min))

    def set_carbon_injection(self, kg_min: float) -> None:
        self.state.carbon_injection_kg_min = max(0.0, min(C.CARBON_INJECTION_MAX_KG_MIN, kg_min))

    def set_oxygen_flow(self, nm3h: float) -> None:
        self.state.oxygen_flow_nm3h = max(0.0, min(C.OXYGEN_MAX_NM3_H, nm3h))

    def set_slag_door(self, open_: bool) -> None:
        self.state.slag_door_open = open_

    def set_tilt(self, deg: float) -> None:
        s = self.state
        deg = max(C.SLAG_POSITION_DEG - 2, min(C.TAP_POSITION_DEG + 2, deg))
        if abs(deg) > 3.0 and s.power_on:
            self.set_power(False)
        s.tilt_deg = deg

    def vacuum_hvelv(self) -> bool:
        """Støvsuging av hvelvet reduserer faren for overslag. Krever at ovnen står."""
        s = self.state
        if s.power_on:
            self._raise_alarm(
                "VACUUM_BLOCKED",
                "Støvsuging av hvelv krever at lysbuen er av",
                Severity.WARNING,
            )
            return False
        s.hvelv_dust_level = 0.0
        return True

    def start_tap(self) -> bool:
        s = self.state
        if s.phase not in (Phase.RAFFINERING, Phase.AVSLAGGING):
            return False
        self.set_power(False)
        s.phase = Phase.TAPPING
        s.tilt_deg = C.TAP_POSITION_DEG
        s.tap_started_s = s.time_s
        if s.bath_temp_c < self.tap_target_temp_c - C.TAP_SUPERHEAT_WINDOW_C:
            self._raise_alarm(
                "TAP_COLD",
                f"Tappet kaldt: {s.bath_temp_c:.0f} °C mot mål {self.tap_target_temp_c:.0f} °C",
                Severity.WARNING,
            )
        if s.bath_temp_c > self.tap_target_temp_c + C.TAP_SUPERHEAT_WINDOW_C:
            self._raise_alarm(
                "TAP_HOT",
                f"Tappet varmt: {s.bath_temp_c:.0f} °C mot mål {self.tap_target_temp_c:.0f} °C – sliter på ildfast",
                Severity.WARNING,
            )
        return True

    def finish_tap(self) -> bool:
        """Avslutt tapping: ovnen tippes tilbake og gjøres klar for ny charge."""
        s = self.state
        if s.phase != Phase.TAPPING:
            return False
        s.last_tap_result = self._build_tap_result()
        s.tilt_deg = 0.0
        s.phase = Phase.KLARGJORING
        s.charge_remaining_kg = 0.0
        s.conveyor_running = False
        return True

    def _build_tap_result(self) -> dict:
        s = self.state
        grade = s.grade or DEFAULT_GRADE
        deviations = []
        if s.carbon_pct > grade.tap_carbon_max_pct:
            deviations.append(
                f"C {s.carbon_pct:.3f} % over tappevindu {grade.tap_carbon_max_pct:.2f} %"
            )
        elif s.carbon_pct < grade.tap_carbon_min_pct:
            deviations.append(
                f"C {s.carbon_pct:.3f} % under tappevindu {grade.tap_carbon_min_pct:.2f} % – overblåst"
            )
        if s.phosphorus_pct > grade.phosphorus_max_pct:
            deviations.append(
                f"P {s.phosphorus_pct:.4f} % over maks {grade.phosphorus_max_pct:.3f} %"
            )
        temp_dev = s.bath_temp_c - self.tap_target_temp_c
        if abs(temp_dev) > C.TAP_SUPERHEAT_WINDOW_C:
            deviations.append(f"Temperatur {temp_dev:+.0f} °C fra mål")
        return {
            "heat_number": s.heat_number,
            "grade": grade.code,
            "tap_temp_c": round(s.bath_temp_c, 1),
            "target_temp_c": round(self.tap_target_temp_c, 1),
            "carbon_pct": round(s.carbon_pct, 3),
            "phosphorus_pct": round(s.phosphorus_pct, 4),
            "feo_pct": round(self.slag_pct("FeO"), 1),
            "b2": round(self.b2, 2),
            "energy_mwh": round(s.energy_total_mwh, 2),
            "deviations": deviations,
            "ok": not deviations,
        }

    def set_time_scale(self, scale: float) -> None:
        self.state.time_scale = max(0.0, min(60.0, scale))

    def reset(self) -> None:
        self._reset_furnace()

    # ------------------------------------------------------------------ #
    # Instruktørstyrt feilinjeksjon
    # ------------------------------------------------------------------ #
    def inject_fault(self, fault: str, **kwargs) -> None:
        s = self.state
        if fault == "electrode_break":
            idx = int(kwargs.get("electrode", self.rng.randrange(len(s.electrodes))))
            e = s.electrodes[idx]
            e.broken = True
            e.current_ka = 0.0
            e.voltage_v = 0.0
            self._raise_alarm(
                f"ELECTRODE_BREAK_{idx}",
                f"Elektrode {idx + 1} er brukket",
                Severity.CRITICAL,
            )
            if s.power_on and all(el.broken for el in s.electrodes):
                s.power_on = False
        elif fault == "water_leak":
            circuit = kwargs.get("circuit", "hvelv")
            if circuit in s.cooling:
                s.cooling[circuit].leaking = True
                s.cooling[circuit].flow_loss_fraction = float(kwargs.get("severity", 0.6))
        elif fault == "overslag":
            self._trigger_overslag()
        elif fault == "static_seal":
            s.static_seal_ok = False
            self._raise_alarm(
                "STATIC_SEAL",
                "Static seal utett – falskluft reduserer forvarming av skrap",
                Severity.WARNING,
            )
        elif fault == "high_phosphorus_scrap":
            value = float(kwargs.get("value", 0.075))
            s.scrap_phosphorus_pct = value
            s.phosphorus_pct = value
        elif fault == "dusty_hvelv":
            s.hvelv_dust_level = 1.0
        elif fault == "new_pot":
            s.refractory_wear = 0.0
            self._clear_alarm("REFRACTORY_WEAR")
            self._clear_alarm("REFRACTORY_BREAKTHROUGH")
        elif fault == "clear_all":
            for e in s.electrodes:
                e.broken = False
            for c in s.cooling.values():
                c.leaking = False
                c.flow_loss_fraction = 0.0
            s.static_seal_ok = True
            s.refractory_wear = 0.0
            for a in s.alarms:
                a.active = False
        else:
            raise ValueError(f"ukjent feil: {fault}")

    def _trigger_overslag(self) -> None:
        """Overslag: strømmen finner vei utenom stålbadet [kompendiet 1.5.4]."""
        s = self.state
        self._raise_alarm(
            "OVERSLAG",
            "Overslag fra elektrode – strøm på avveie",
            Severity.CRITICAL,
        )
        if self.rng.random() < C.OVERSLAG_WATER_LEAK_PROBABILITY:
            circuit = self.rng.choice(list(s.cooling.keys()))
            s.cooling[circuit].leaking = True
            s.cooling[circuit].flow_loss_fraction = self.rng.uniform(0.4, 0.8)
            self._raise_alarm(
                f"OVERSLAG_LEAK_{circuit}",
                f"Overslag traff vannkjølt element i '{circuit}' – vannlekkasje, vurder akutt stans",
                Severity.CRITICAL,
            )

    # ------------------------------------------------------------------ #
    # Simuleringssteg
    # ------------------------------------------------------------------ #
    def step(self, dt_s: float) -> None:
        s = self.state
        s.time_s += dt_s

        self._update_conveyor(dt_s)
        self._update_electrodes(dt_s)
        self._update_power(dt_s)
        self._update_additions(dt_s)
        thermal_chem_mw = self._update_oxygen_chemistry(dt_s)
        self._update_carbon_injection(dt_s)
        melt_mw = self._update_melting(dt_s)
        self._update_dephosphorization(dt_s)
        self._update_slag_foam(dt_s)
        self._update_thermal(dt_s, chemical_mw=thermal_chem_mw, melt_mw=melt_mw)
        self._update_refractory(dt_s)
        self._update_drainage(dt_s)
        self._update_cooling(dt_s)
        self._update_offgas(dt_s)
        self._update_electrode_wear(dt_s)
        self._update_overslag_risk(dt_s)
        self._update_phase(dt_s)
        self._update_alarms(dt_s)

    # -- conveyor og forvarming ------------------------------------------
    def _update_conveyor(self, dt_s: float) -> None:
        s = self.state
        # Forvarmingsdelen henter varme fra avgassen. Lavere conveyorhastighet gir
        # lengre oppholdstid og varmere skrap [kompendiet 3.1/3.4].
        if s.conveyor_running and s.conveyor_rate_t_min > 0:
            speed_ratio = s.conveyor_rate_t_min / C.CONVEYOR_MAX_RATE_T_MIN
            residence_factor = 1.0 - 0.55 * speed_ratio
            offgas_factor = min(1.0, s.offgas_temp_c / C.OFFGAS_NOMINAL_TEMP_C)
            target_preheat = C.PREHEAT_MAX_TEMP_C * residence_factor * offgas_factor
            if not s.static_seal_ok:
                target_preheat *= 1.0 - C.STATIC_SEAL_FALSE_AIR_PENALTY
        else:
            target_preheat = C.AMBIENT_TEMP_C
        s.preheat_temp_c += (target_preheat - s.preheat_temp_c) * min(1.0, dt_s / 45.0)
        s.preheat_temp_c = max(C.AMBIENT_TEMP_C, s.preheat_temp_c)

        if not s.conveyor_running or s.charge_remaining_kg <= 0:
            return
        fed_kg = min(s.charge_remaining_kg, s.conveyor_rate_t_min * 1000.0 * dt_s / 60.0)
        if fed_kg <= 0:
            return
        s.charge_remaining_kg -= fed_kg
        s.scrap_charged_kg += fed_kg
        s.solid_scrap_kg += fed_kg

        # Skrapet bærer med seg oksider som havner i slaggen etterhvert som det smelter
        for oxide, yield_per_kg in C.SCRAP_OXIDE_YIELD.items():
            s.slag[oxide] = s.slag.get(oxide, 0.0) + fed_kg * yield_per_kg

    # -- elektroder --------------------------------------------------------
    def _update_electrodes(self, dt_s: float) -> None:
        s = self.state
        for e in s.electrodes:
            if e.broken:
                e.position_pct = 0.0
                e.current_ka = 0.0
                e.voltage_v = 0.0
                continue

            if e.mode == RegulationMode.AUTO and s.power_on:
                target_current = C.ELECTRODE_MAX_CURRENT_KA * (
                    0.5 + 0.5 * s.transformer_tap / (len(C.TRANSFORMER_TAPS_V) - 1)
                )
                error = target_current - e.current_ka
                e.target_position_pct = max(
                    0.0, min(100.0, e.target_position_pct + C.AER_GAIN * error * dt_s)
                )
            elif not s.power_on:
                e.target_position_pct = 0.0

            max_step = C.MAX_ELECTRODE_SPEED_PCT_PER_S * dt_s
            delta = max(-max_step, min(max_step, e.target_position_pct - e.position_pct))
            e.position_pct += delta

            # Lavere elektrode gir kortere lysbuegap, altså mer strøm ved noe lavere
            # lysbuespenning
            if s.power_on and e.position_pct > 5.0:
                immersion = min(1.0, e.position_pct / 100.0)
                tap_voltage = C.TRANSFORMER_TAPS_V[s.transformer_tap]
                tap_voltage_norm = tap_voltage / C.TRANSFORMER_TAPS_V[-1]
                e.current_ka = C.ELECTRODE_MAX_CURRENT_KA * tap_voltage_norm * immersion
                e.voltage_v = (tap_voltage * (1.0 - 0.5 * immersion)) / math.sqrt(3)
            else:
                e.current_ka = 0.0
                e.voltage_v = 0.0

    def _update_power(self, dt_s: float) -> None:
        s = self.state
        total_mw = sum(
            math.sqrt(3) * e.voltage_v * e.current_ka * C.ARC_POWER_FACTOR / 1000.0
            for e in s.electrodes
        )
        s.electrical_power_mw = min(total_mw, C.TRANSFORMER_RATED_MVA)
        s.energy_total_mwh += s.electrical_power_mw * dt_s / 3600.0

    # -- tilsatser ---------------------------------------------------------
    def _update_additions(self, dt_s: float) -> None:
        s = self.state
        minutes = dt_s / 60.0
        for rate, composition, total_attr in (
            (s.lime_rate_kg_min, C.LIME_COMPOSITION, "lime_total_kg"),
            (s.dolomite_rate_kg_min, C.DOLOMITE_COMPOSITION, "dolomite_total_kg"),
            (s.magnesite_rate_kg_min, C.MAGNESITE_COMPOSITION, None),
        ):
            if rate <= 0:
                continue
            added = rate * minutes
            for oxide, fraction in composition.items():
                s.slag[oxide] = s.slag.get(oxide, 0.0) + added * fraction
            if total_attr:
                setattr(s, total_attr, getattr(s, total_attr) + added)

    # -- oksygenkjemi ------------------------------------------------------
    def _update_oxygen_chemistry(self, dt_s: float) -> float:
        """Blåser oksygen og fordeler det på C, Si, Mn og Fe. Returnerer kjemisk effekt i MW."""
        s = self.state
        if s.oxygen_flow_nm3h <= 0 or s.liquid_mass_kg <= 0:
            s.chemical_power_mw = 0.0
            return 0.0

        nm3 = s.oxygen_flow_nm3h * dt_s / 3600.0
        s.oxygen_total_nm3 += nm3
        energy_mj = 0.0

        # Andelen av oksygenet som faktisk treffer karbon faller når badet er
        # karbonfattig, og da brennes mer jern -> FeO i slaggen stiger
        if s.carbon_pct >= C.CARBON_PCT_FOR_FULL_DECARB:
            decarb_eff = C.DECARB_EFFICIENCY_AT_HIGH_C
        else:
            ratio = max(0.0, s.carbon_pct / C.CARBON_PCT_FOR_FULL_DECARB)
            decarb_eff = C.DECARB_EFFICIENCY_AT_LOW_C + ratio * (
                C.DECARB_EFFICIENCY_AT_HIGH_C - C.DECARB_EFFICIENCY_AT_LOW_C
            )

        o2_to_carbon = nm3 * decarb_eff
        carbon_burned = min(
            o2_to_carbon / C.O2_NM3_PER_KG_CARBON,
            s.carbon_pct / 100.0 * s.liquid_mass_kg,
        )
        s.carbon_pct = max(0.0, s.carbon_pct - carbon_burned / s.liquid_mass_kg * 100.0)
        energy_mj += carbon_burned * C.ENERGY_C_TO_CO_MJ_PER_KG_C
        self._co_generation_kg_s = carbon_burned * (28.0 / 12.0) / max(dt_s, 1e-6)

        o2_rest = nm3 - o2_to_carbon

        # Ellingham-rekkefølge: silisium oksiderer først, så mangan, så jern
        si_available = s.silicon_pct / 100.0 * s.liquid_mass_kg
        si_burned = min(si_available, o2_rest * 0.35 / O2_NM3_PER_KG_SI)
        if si_burned > 0:
            s.silicon_pct = max(0.0, s.silicon_pct - si_burned / s.liquid_mass_kg * 100.0)
            s.slag["SiO2"] += si_burned * OXIDE_FACTOR["SiO2"]
            energy_mj += si_burned * C.ENERGY_SI_OXIDATION_MJ_PER_KG_SI
            o2_rest -= si_burned * O2_NM3_PER_KG_SI

        mn_available = s.manganese_pct / 100.0 * s.liquid_mass_kg
        mn_burned = min(mn_available, max(0.0, o2_rest) * 0.25 / O2_NM3_PER_KG_MN)
        if mn_burned > 0:
            s.manganese_pct = max(0.0, s.manganese_pct - mn_burned / s.liquid_mass_kg * 100.0)
            s.slag["MnO"] += mn_burned * OXIDE_FACTOR["MnO"]
            energy_mj += mn_burned * C.ENERGY_MN_OXIDATION_MJ_PER_KG_MN
            o2_rest -= mn_burned * O2_NM3_PER_KG_MN

        if o2_rest > 0:
            fe_burned = o2_rest / O2_NM3_PER_KG_FE
            fe_burned = min(fe_burned, s.liquid_mass_kg * 0.01)
            s.liquid_mass_kg -= fe_burned
            s.slag["FeO"] += fe_burned * OXIDE_FACTOR["FeO"]
            energy_mj += fe_burned * C.ENERGY_FE_OXIDATION_MJ_PER_KG_FE

        chemical_mw = energy_mj / max(dt_s, 1e-6)
        s.chemical_power_mw = chemical_mw
        s.energy_total_mwh += chemical_mw * dt_s / 3600.0
        return chemical_mw

    def _update_carbon_injection(self, dt_s: float) -> None:
        """Innblåst karbon reduserer FeO i slaggen til CO-gass og løser seg delvis i badet."""
        s = self.state
        if s.carbon_injection_kg_min <= 0:
            self._foam_co_kg_s = getattr(self, "_co_generation_kg_s", 0.0)
            return
        injected = s.carbon_injection_kg_min * dt_s / 60.0
        s.carbon_total_kg += injected

        # FeO + C -> Fe + CO. Reaksjonen bremser når slaggen er fattig på FeO,
        # slik at FeO-nivået finner en likevekt mot oksygeninnblåsingen.
        feo_available = s.slag.get("FeO", 0.0)
        reaction_fraction = 0.30 * min(1.0, self.slag_pct("FeO") / C.FEO_TARGET_PCT)
        c_for_slag = min(injected * reaction_fraction, feo_available * 12.0 / 72.0)
        feo_reduced = c_for_slag * 72.0 / 12.0
        s.slag["FeO"] = max(0.0, feo_available - feo_reduced)
        s.liquid_mass_kg += feo_reduced * 56.0 / 72.0
        co_from_slag = c_for_slag * 28.0 / 12.0

        # Bare en liten del av det innblåste karbonet løser seg i badet; resten
        # forbrennes i slagg og avgass
        c_dissolved = (injected - c_for_slag) * 0.15
        if s.liquid_mass_kg > 0:
            s.carbon_pct += c_dissolved / s.liquid_mass_kg * 100.0

        self._foam_co_kg_s = (
            getattr(self, "_co_generation_kg_s", 0.0) + co_from_slag / max(dt_s, 1e-6)
        )

    # -- smelting -----------------------------------------------------------
    def _update_melting(self, dt_s: float) -> float:
        """Flatbad-smelting: stålsumpen smelter skrapet som mates inn. Returnerer smelteeffekt i MW."""
        s = self.state
        if s.solid_scrap_kg <= 0 or s.liquid_mass_kg <= 0:
            return 0.0

        superheat = s.bath_temp_c - self.liquidus_c
        if superheat <= 0:
            return 0.0

        contact = min(1.0, s.solid_scrap_kg / MELT_CONTACT_REFERENCE_KG)
        melt_power_mw = MELT_HEAT_TRANSFER_MW_PER_K * superheat * contact

        energy_per_kg = (
            C.CP_SOLID_STEEL_KJ_KG_K * max(0.0, self.liquidus_c - s.preheat_temp_c)
            + C.LATENT_HEAT_FUSION_KJ_KG
        )
        melted_kg = min(s.solid_scrap_kg, melt_power_mw * 1000.0 * dt_s / energy_per_kg)
        s.solid_scrap_kg -= melted_kg
        s.liquid_mass_kg += melted_kg

        # Skrapet fortynner badet med sin egen kjemi
        if s.liquid_mass_kg > 0 and melted_kg > 0:
            frac = melted_kg / s.liquid_mass_kg
            s.carbon_pct += (C.CARBON_FROM_SCRAP_PCT - s.carbon_pct) * frac
            s.phosphorus_pct += (s.scrap_phosphorus_pct - s.phosphorus_pct) * frac
            s.silicon_pct += (0.15 - s.silicon_pct) * frac
            s.manganese_pct += (0.20 - s.manganese_pct) * frac

        return melted_kg * energy_per_kg / 1000.0 / max(dt_s, 1e-6)

    # -- avfosforering ------------------------------------------------------
    def _update_dephosphorization(self, dt_s: float) -> None:
        """Fosfor går mellom stål og slagg avhengig av FeO, basisitet og temperatur.

        Avfosforering favoriseres av oksiderende, basisk slagg og lav temperatur.
        Kjøres temperaturen opp mens den fosforrike slaggen fortsatt ligger i ovnen,
        går reaksjonen motsatt vei og fosforet kommer tilbake i stålet (fosforbom).
        """
        s = self.state
        if s.liquid_mass_kg <= 0:
            return

        feo_factor = min(2.0, self.slag_pct("FeO") / C.FEO_TARGET_PCT)
        basicity_factor = min(1.6, self.b2 / C.B2_TARGET) if self.b2 > 0 else 0.0
        temp_factor = math.exp((C.DEPHOS_TEMP_REFERENCE_C - s.bath_temp_c) / 65.0)
        drive = feo_factor * basicity_factor * temp_factor

        p_eq = P_EQUILIBRIUM_BASE_PCT / max(drive, 0.03)
        delta_pct = (s.phosphorus_pct - p_eq) * C.DEPHOS_RATE_CONSTANT * dt_s

        if delta_pct > 0:
            # Fosfor ut av stålet og opp i slaggen
            p_kg = delta_pct / 100.0 * s.liquid_mass_kg
            s.phosphorus_pct -= delta_pct
            s.slag["P2O5"] = s.slag.get("P2O5", 0.0) + p_kg * OXIDE_FACTOR["P2O5"]
        else:
            # Tilbakereaksjon: begrenset av hvor mye fosfor som faktisk ligger i slaggen
            p_in_slag_kg = s.slag.get("P2O5", 0.0) / OXIDE_FACTOR["P2O5"]
            wanted_kg = min(-delta_pct / 100.0 * s.liquid_mass_kg, p_in_slag_kg)
            if wanted_kg > 0:
                s.phosphorus_pct += wanted_kg / s.liquid_mass_kg * 100.0
                s.slag["P2O5"] -= wanted_kg * OXIDE_FACTOR["P2O5"]

    # -- skumslagg -----------------------------------------------------------
    def _update_slag_foam(self, dt_s: float) -> None:
        """Skumslagg krever CO-utvikling og riktig viskositet (B2 nær målet)."""
        s = self.state
        co_rate = getattr(self, "_foam_co_kg_s", 0.0)
        if self.slag_mass_kg < 500:
            viscosity_ok = 0.0
        else:
            viscosity_ok = math.exp(-(((self.b2 - C.B2_TARGET) / C.B2_WINDOW) ** 2))
        growth = 0.35 * min(1.0, co_rate / 1.2) * viscosity_ok
        decay = 0.02 + (0.06 if s.slag_door_open else 0.0)
        s.slag_foam_index = max(0.0, min(1.0, s.slag_foam_index + (growth - decay) * dt_s))

    # -- varmebalanse ---------------------------------------------------------
    def _update_thermal(self, dt_s: float, chemical_mw: float, melt_mw: float) -> None:
        s = self.state
        if s.liquid_mass_kg <= 0:
            return

        shield = 1.0 - C.FOAM_SHIELD_MAX_REDUCTION * s.slag_foam_index
        # Strålingstapet vokser kraftig med temperaturen
        radiation_factor = ((s.bath_temp_c + 273.0) / 1873.0) ** 3.5
        wall_loss_mw = C.NOMINAL_WALL_ROOF_LOSS_MW * shield * radiation_factor
        if s.slag_door_open:
            wall_loss_mw += C.DOOR_OPEN_EXTRA_LOSS_MW
        if not s.power_on:
            wall_loss_mw *= 0.45

        # Avgassen bærer med seg følbar varme, mest når det mates kaldt skrap.
        # Et varmere bad gir varmere avgass og dermed raskt økende tap.
        offgas_loss_mw = 2.0 + 3.5 * (1.0 if s.power_on else 0.2)
        if s.conveyor_running:
            offgas_loss_mw += 1.5
        superheat_over_target = s.bath_temp_c - self.tap_target_temp_c
        if superheat_over_target > 0:
            offgas_loss_mw += 0.09 * superheat_over_target

        net_mw = s.electrical_power_mw + chemical_mw - wall_loss_mw - offgas_loss_mw - melt_mw
        heat_capacity_kj_k = s.liquid_mass_kg * C.CP_LIQUID_STEEL_KJ_KG_K
        s.bath_temp_c += net_mw * 1000.0 * dt_s / heat_capacity_kj_k
        s.bath_temp_c = max(C.AMBIENT_TEMP_C, s.bath_temp_c)

    # -- ildfast ----------------------------------------------------------------
    def _update_refractory(self, dt_s: float) -> None:
        """Ildfasten slites av drift, og mye fortere når stålet er for varmt.

        Kjøres badet langt over tappetemperatur lenge nok, går det hull på potta
        og chargen må avbrytes.
        """
        s = self.state
        wear = 0.0
        if s.power_on:
            wear += C.REFRACTORY_BASE_WEAR_PER_S * dt_s
        excess = s.bath_temp_c - C.BATH_TEMP_CRITICAL_C
        if excess > 0:
            wear += C.REFRACTORY_HOT_WEAR_PER_K_S * excess * dt_s
        # Skumslagg beskytter steinen mot strålevarmen fra lysbuen
        wear *= 1.0 - 0.4 * s.slag_foam_index
        s.refractory_wear = min(1.0, s.refractory_wear + wear)

        if s.refractory_wear >= 1.0:
            self._raise_alarm(
                "REFRACTORY_BREAKTHROUGH",
                "Gjennombrenning i ovnspotta – chargen må avbrytes og potta byttes",
                Severity.CRITICAL,
            )
            s.power_on = False
            s.conveyor_running = False
        elif s.refractory_wear > 0.7:
            self._raise_alarm(
                "REFRACTORY_WEAR",
                f"Kraftig slitasje på ildfast ({s.refractory_wear * 100:.0f} %) – senk temperaturen",
                Severity.WARNING,
            )

    # -- tapping og avslagging -------------------------------------------------
    def _update_drainage(self, dt_s: float) -> None:
        s = self.state

        # Avslagging: ovnen tippes mot slaggdøra og slaggen renner ut
        if s.tilt_deg <= C.SLAG_POSITION_DEG + 1.0 and s.slag_door_open:
            drained = C.SLAG_DRAIN_KG_S * dt_s
            total = self.slag_mass_kg
            if total > 0:
                fraction = min(1.0, drained / total)
                for oxide in list(s.slag.keys()):
                    s.slag[oxide] *= 1.0 - fraction
                s.slag_foam_index *= 1.0 - fraction

        # Tapping: stålet renner i øsa, men stålsumpen blir igjen i ovnen
        if s.phase == Phase.TAPPING and s.tilt_deg >= C.TAP_POSITION_DEG - 1.0:
            tappable = max(0.0, s.liquid_mass_kg - C.HEEL_MASS_KG)
            if tappable > 0:
                s.liquid_mass_kg -= min(tappable, C.TAP_HOLE_DRAIN_KG_S * dt_s)

    # -- kjølevann ------------------------------------------------------------
    def _update_cooling(self, dt_s: float) -> None:
        s = self.state
        for c in s.cooling.values():
            c.flow_lpm = c.nominal_flow_lpm * (1.0 - c.flow_loss_fraction)
            share = C.COOLING_CIRCUITS[c.name]["loss_share"]
            heat_mw = C.NOMINAL_WALL_ROOF_LOSS_MW * share * (1.0 if s.power_on else 0.25)
            mass_flow_kg_s = c.flow_lpm * C.WATER_DENSITY_KG_L / 60.0
            if mass_flow_kg_s > 0.05:
                c.delta_t_c = heat_mw * 1000.0 / (mass_flow_kg_s * C.CP_WATER_KJ_KG_K)
            else:
                c.delta_t_c = 99.0

    # -- avgass ---------------------------------------------------------------
    def _update_offgas(self, dt_s: float) -> None:
        s = self.state
        if s.power_on:
            target = C.OFFGAS_NOMINAL_TEMP_C
            target += 250.0 * s.slag_foam_index * 0  # skumslagg holder varmen i badet
            if s.oxygen_flow_nm3h > 0:
                target += 250.0 * min(1.0, s.oxygen_flow_nm3h / C.OXYGEN_MAX_NM3_H)
            if s.slag_door_open:
                target += 150.0
            target = min(C.OFFGAS_MAX_TEMP_C, target)
        else:
            target = 200.0
        s.offgas_temp_c += (target - s.offgas_temp_c) * min(1.0, dt_s / 40.0)

        co_rate = getattr(self, "_foam_co_kg_s", 0.0)
        target_co = min(30.0, co_rate * 12.0)
        s.offgas_co_pct += (target_co - s.offgas_co_pct) * min(1.0, dt_s / 25.0)

    # -- elektrodeslitasje ------------------------------------------------------
    def _update_electrode_wear(self, dt_s: float) -> None:
        s = self.state
        cooling_benefit = 0.5 * (s.electrode_cooling_pct / 100.0)
        for e in s.electrodes:
            if e.broken:
                continue
            wear_m = 0.0
            if s.power_on:
                # Sideoksidasjon: oksygen reagerer med glødende elektrode, dempes av kjøling
                wear_m += C.ELECTRODE_SIDE_OXIDATION_M_PER_H * (1.0 - cooling_benefit) * dt_s / 3600.0
                # Tippfordamping: karbonet fordamper i lysbueområdet
                arc_mwh = (
                    math.sqrt(3) * e.voltage_v * e.current_ka * C.ARC_POWER_FACTOR / 1000.0
                ) * dt_s / 3600.0
                wear_m += C.ELECTRODE_TIP_VAPORIZATION_M_PER_MWH * arc_mwh
            e.length_m = max(0.0, e.length_m - wear_m)
            e.consumed_m += wear_m

            # Tippbrudd: når nippelen nærmer seg lysbuen sprekker tippen
            if e.length_m < C.ELECTRODE_MIN_LENGTH_M and s.power_on:
                risk = 0.0008 * dt_s * (C.ELECTRODE_MIN_LENGTH_M - e.length_m)
                if self.rng.random() < risk:
                    self.inject_fault("electrode_break", electrode=e.index)

    # -- overslag ---------------------------------------------------------------
    def _update_overslag_risk(self, dt_s: float) -> None:
        s = self.state
        if not s.power_on:
            return
        s.hvelv_dust_level = min(1.0, s.hvelv_dust_level + 0.00004 * dt_s)
        risk = (
            C.OVERSLAG_BASE_RISK_PER_S
            * (1.0 + C.OVERSLAG_COOLING_FACTOR * (s.electrode_cooling_pct / 100.0))
            * (1.0 + C.OVERSLAG_DUST_FACTOR * s.hvelv_dust_level)
            * dt_s
        )
        if self.rng.random() < risk:
            self._trigger_overslag()

    # -- faselogikk ---------------------------------------------------------------
    def _update_phase(self, dt_s: float) -> None:
        s = self.state
        if s.phase == Phase.INNSMELTING:
            if s.charge_remaining_kg <= 0 and s.solid_scrap_kg < 500:
                s.phase = Phase.RAFFINERING
        elif s.phase in (Phase.RAFFINERING, Phase.AVSLAGGING):
            deslagging = s.tilt_deg <= C.SLAG_POSITION_DEG + 1.0 and s.slag_door_open
            s.phase = Phase.AVSLAGGING if deslagging else Phase.RAFFINERING
        elif s.phase == Phase.TAPPING:
            if s.liquid_mass_kg <= C.HEEL_MASS_KG + 1.0:
                self.finish_tap()

    # -- alarmer ---------------------------------------------------------------
    def _update_alarms(self, dt_s: float) -> None:
        s = self.state
        for c in s.cooling.values():
            code = f"COOLING_HIGH_DT_{c.name}"
            if c.delta_t_c > C.COOLING_DELTA_T_CRITICAL_C:
                self._raise_alarm(
                    code,
                    f"Høy delta-T i kjølekrets '{c.name}' – fare for panelskade",
                    Severity.CRITICAL,
                )
            elif c.delta_t_c < C.COOLING_DELTA_T_WARNING_C:
                self._clear_alarm(code)

        if s.bath_temp_c > C.BATH_TEMP_CRITICAL_C:
            self._raise_alarm(
                "BATH_TOO_HOT",
                f"Badet er {s.bath_temp_c:.0f} °C – for varmt, sliter hardt på ildfast",
                Severity.CRITICAL,
            )
        elif s.bath_temp_c < C.BATH_TEMP_CRITICAL_C - 40:
            self._clear_alarm("BATH_TOO_HOT")

        if s.offgas_temp_c > C.OFFGAS_MAX_TEMP_C - 50:
            self._raise_alarm(
                "OFFGAS_HOT", "Høy avgasstemperatur – belaster renseanlegget", Severity.WARNING
            )
        elif s.offgas_temp_c < C.OFFGAS_MAX_TEMP_C - 200:
            self._clear_alarm("OFFGAS_HOT")

        if s.offgas_co_pct > 20.0:
            self._raise_alarm("OFFGAS_CO", "Høyt CO-nivå i avgass", Severity.WARNING)
        elif s.offgas_co_pct < 12.0:
            self._clear_alarm("OFFGAS_CO")

        # Slagg utenfor vindu gir dårlig skumming og økt slitasje på ildfast
        if self.slag_mass_kg > 1500:
            if self.b2 < C.B2_TARGET - C.B2_WINDOW:
                self._raise_alarm(
                    "SLAG_B2_LOW",
                    f"B2 {self.b2:.2f} er lav – for sur slagg, øk kalktilsats",
                    Severity.WARNING,
                )
                self._clear_alarm("SLAG_B2_HIGH")
            elif self.b2 > C.B2_TARGET + C.B2_WINDOW:
                self._raise_alarm(
                    "SLAG_B2_HIGH",
                    f"B2 {self.b2:.2f} er høy – stiv slagg, dårlig skumming",
                    Severity.WARNING,
                )
                self._clear_alarm("SLAG_B2_LOW")
            else:
                self._clear_alarm("SLAG_B2_LOW")
                self._clear_alarm("SLAG_B2_HIGH")

        grade = s.grade
        if grade and s.phase in (Phase.RAFFINERING, Phase.AVSLAGGING):
            if s.phosphorus_pct > grade.phosphorus_max_pct:
                self._raise_alarm(
                    "P_OVER_LIMIT",
                    f"Fosfor {s.phosphorus_pct:.4f} % over kravet for {grade.code}",
                    Severity.WARNING,
                )
            else:
                self._clear_alarm("P_OVER_LIMIT")

        # Lysbuen går uten skumslagg: stråler rett på ildfast og vannkjølte paneler
        if s.power_on and s.slag_foam_index < 0.15 and s.electrical_power_mw > 25:
            self._raise_alarm(
                "NO_FOAM",
                "Lysbue uten skumslagg – strålevarme mot ildfast, øk karbon/oksygen",
                Severity.WARNING,
            )
        elif s.slag_foam_index > 0.3 or not s.power_on:
            self._clear_alarm("NO_FOAM")

        for e in s.electrodes:
            code = f"ELECTRODE_SHORT_{e.index}"
            if not e.broken and e.length_m < C.ELECTRODE_MIN_LENGTH_M:
                self._raise_alarm(
                    code,
                    f"Elektrode {e.index + 1} er kort ({e.length_m:.1f} m) – bør skjøtes",
                    Severity.WARNING,
                )
            else:
                self._clear_alarm(code)
