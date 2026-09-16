"""Electric Arc Furnace process model.

Implements a lumped-parameter simulation of the main physical loops found in
a real EAF control room: electrical (transformer/electrode/arc), thermal
(energy balance & melting), metallurgical (decarburization, slag foaming),
auxiliary (cooling water, off-gas) and the tap-to-tap phase sequence.

The model favours plausible closed-loop dynamics and fault behaviour over
exact metallurgical accuracy, so it is well suited for operator training
(reading gauges/trends, reacting to alarms, following procedure) even though
absolute figures should not be treated as production-grade process data.
"""
from __future__ import annotations

import math
import random

from . import constants as C
from .model import (
    Alarm,
    CoolingCircuitState,
    ElectrodeState,
    FurnaceState,
    Phase,
    RegulationMode,
    Severity,
)


class EAFSimulation:
    def __init__(self, rng_seed: int | None = None) -> None:
        self.rng = random.Random(rng_seed)
        self.state = FurnaceState()
        self._reset_furnace()

    # ------------------------------------------------------------------ #
    # Setup / reset
    # ------------------------------------------------------------------ #
    def _reset_furnace(self) -> None:
        s = self.state
        s.time_s = 0.0
        s.phase = Phase.IDLE
        s.power_on = False
        s.transformer_tap = 3
        s.electrodes = [ElectrodeState(index=i) for i in range(C.NUM_ELECTRODES)]
        s.baskets_charged = 0
        s.bath_mass_kg = 0.0
        s.bath_enthalpy_kj_per_kg = 0.0
        s.bath_temp_c = C.AMBIENT_TEMP_C
        s.solid_fraction = 1.0
        s.carbon_pct = 0.0
        s.oxygen_flow_nm3h = 0.0
        s.carbon_injection_kg_min = 0.0
        s.burner_on = False
        s.slag_foam_index = 0.0
        s.door_open = False
        s.tilt_deg = 0.0
        s.offgas_temp_c = C.AMBIENT_TEMP_C
        s.offgas_co_pct = 0.0
        s.cooling = {
            name: CoolingCircuitState(
                name=name,
                flow_lpm=cfg["nominal_flow_lpm"],
                nominal_flow_lpm=cfg["nominal_flow_lpm"],
            )
            for name, cfg in C.COOLING_CIRCUITS.items()
        }
        s.energy_total_mwh = 0.0
        s.alarms = []
        s.next_alarm_id = 1

    # ------------------------------------------------------------------ #
    # Alarms
    # ------------------------------------------------------------------ #
    def _raise_alarm(self, code: str, message: str, severity: Severity) -> None:
        s = self.state
        for a in s.alarms:
            if a.code == code and a.active:
                return
        alarm = Alarm(
            id=s.next_alarm_id,
            code=code,
            message=message,
            severity=severity,
            raised_at_s=s.time_s,
        )
        s.next_alarm_id += 1
        s.alarms.append(alarm)

    def _clear_alarm(self, code: str) -> None:
        for a in self.state.alarms:
            if a.code == code and a.active:
                a.active = False

    def ack_alarm(self, alarm_id: int) -> None:
        for a in self.state.alarms:
            if a.id == alarm_id:
                a.ack = True

    # ------------------------------------------------------------------ #
    # Operator commands
    # ------------------------------------------------------------------ #
    def set_power(self, on: bool) -> None:
        s = self.state
        if on and s.phase in (Phase.IDLE, Phase.TURNAROUND):
            return  # must charge scrap before powering on
        if on and any(e.broken for e in s.electrodes):
            self._raise_alarm(
                "ELECTRODE_BROKEN_BLOCK",
                "Kan ikke starte lysbue: en eller flere elektroder er brukket",
                Severity.WARNING,
            )
            return
        s.power_on = on
        if on and s.phase == Phase.CHARGING:
            s.phase = Phase.BORE_IN
            s.transformer_tap = 1  # low tap while boring into scrap to protect roof

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

    def set_oxygen_flow(self, nm3h: float) -> None:
        self.state.oxygen_flow_nm3h = max(0.0, min(3000.0, nm3h))

    def set_carbon_injection(self, kg_min: float) -> None:
        self.state.carbon_injection_kg_min = max(0.0, min(60.0, kg_min))

    def set_burner(self, on: bool) -> None:
        self.state.burner_on = on

    def set_door_open(self, open_: bool) -> None:
        self.state.door_open = open_

    def set_tilt(self, deg: float) -> None:
        self.state.tilt_deg = max(-15.0, min(15.0, deg))

    def set_time_scale(self, scale: float) -> None:
        self.state.time_scale = max(0.0, min(60.0, scale))

    def charge_scrap(self) -> bool:
        s = self.state
        if s.phase not in (Phase.IDLE, Phase.CHARGING, Phase.TURNAROUND):
            return False
        if s.baskets_charged >= C.MAX_BASKETS:
            return False
        if s.power_on:
            return False  # roof must be off power for charging
        added_mass = min(C.BASKET_MASS_KG, C.MAX_BATH_MASS_KG - s.bath_mass_kg)
        if added_mass <= 0:
            return False
        # mixing new cold scrap lowers average specific enthalpy of the bath
        total_h = s.bath_enthalpy_kj_per_kg * s.bath_mass_kg
        s.bath_mass_kg += added_mass
        s.bath_enthalpy_kj_per_kg = total_h / s.bath_mass_kg if s.bath_mass_kg else 0.0
        if s.carbon_pct == 0.0:
            s.carbon_pct = C.CARBON_START_PCT
        s.baskets_charged += 1
        s.phase = Phase.CHARGING
        self._recompute_bath_temp()
        return True

    def start_tap(self) -> bool:
        s = self.state
        if s.phase != Phase.REFINING:
            return False
        if s.bath_temp_c < C.TAP_TARGET_TEMP_C - 40:
            self._raise_alarm(
                "TAP_LOW_TEMP",
                "Tapping startet under anbefalt temperatur",
                Severity.WARNING,
            )
        s.phase = Phase.TAPPING
        s.power_on = False
        return True

    def finish_tap(self) -> None:
        s = self.state
        s.phase = Phase.TURNAROUND
        s.bath_mass_kg = 0.0
        s.bath_enthalpy_kj_per_kg = 0.0
        s.bath_temp_c = C.AMBIENT_TEMP_C
        s.solid_fraction = 1.0
        s.carbon_pct = 0.0
        s.baskets_charged = 0
        s.slag_foam_index = 0.0
        s.tilt_deg = 0.0

    def reset(self) -> None:
        self._reset_furnace()

    # ------------------------------------------------------------------ #
    # Instructor / fault injection
    # ------------------------------------------------------------------ #
    def inject_fault(self, fault: str, **kwargs) -> None:
        s = self.state
        if fault == "electrode_break":
            idx = kwargs.get("electrode", self.rng.randrange(len(s.electrodes)))
            e = s.electrodes[idx]
            e.broken = True
            e.current_ka = 0.0
            self._raise_alarm(
                f"ELECTRODE_BREAK_{idx}",
                f"Elektrode {idx + 1} er brukket",
                Severity.CRITICAL,
            )
        elif fault == "water_leak":
            circuit = kwargs.get("circuit", "roof")
            if circuit in s.cooling:
                s.cooling[circuit].leaking = True
                s.cooling[circuit].blocked_pct_loss = float(kwargs.get("severity", 0.6))
        elif fault == "scrap_cave_in":
            for e in s.electrodes:
                if not e.broken:
                    e.position_pct = max(0.0, e.position_pct - self.rng.uniform(15, 30))
        elif fault == "clear_all":
            for e in s.electrodes:
                e.broken = False
            for c in s.cooling.values():
                c.leaking = False
                c.blocked_pct_loss = 0.0
            for a in s.alarms:
                a.active = False
        else:
            raise ValueError(f"unknown fault: {fault}")

    # ------------------------------------------------------------------ #
    # Simulation step
    # ------------------------------------------------------------------ #
    def step(self, dt_s: float) -> None:
        s = self.state
        s.time_s += dt_s

        if s.phase == Phase.CHARGING:
            # brief pause to represent bucket dump / roof swing before power-on
            pass

        self._update_electrodes(dt_s)
        self._update_electrical_power(dt_s)
        self._update_chemistry(dt_s)
        self._update_slag_foam(dt_s)
        self._update_thermal(dt_s)
        self._update_cooling(dt_s)
        self._update_offgas(dt_s)
        self._update_phase_logic(dt_s)
        self._update_alarms(dt_s)
        self._maybe_random_events(dt_s)

    # -- electrodes -----------------------------------------------------
    def _update_electrodes(self, dt_s: float) -> None:
        s = self.state
        for e in s.electrodes:
            if e.broken:
                e.position_pct = 0.0
                e.current_ka = 0.0
                e.voltage_v = 0.0
                continue

            if e.mode == RegulationMode.AUTO and s.power_on:
                # automatic electrode regulator seeks the position that gives
                # rated current for the current transformer tap
                target_current = C.ELECTRODE_MAX_CURRENT_KA * (0.5 + 0.5 * s.transformer_tap / (len(C.TRANSFORMER_TAPS_V) - 1))
                error = target_current - e.current_ka
                e.target_position_pct = max(0.0, min(100.0, e.target_position_pct + C.AER_GAIN * error * dt_s))
            elif not s.power_on:
                e.target_position_pct = 0.0

            max_step = C.MAX_ELECTRODE_SPEED_PCT_PER_S * dt_s
            delta = max(-max_step, min(max_step, e.target_position_pct - e.position_pct))
            e.position_pct += delta

            # electrode further down (higher position_pct) shortens the arc gap,
            # which draws more current at a somewhat lower arc voltage
            strike_threshold_pct = 5.0
            if s.power_on and e.position_pct > strike_threshold_pct:
                immersion = min(1.0, e.position_pct / 100.0)
                tap_voltage = C.TRANSFORMER_TAPS_V[s.transformer_tap]
                tap_voltage_norm = tap_voltage / C.TRANSFORMER_TAPS_V[-1]
                e.current_ka = C.ELECTRODE_MAX_CURRENT_KA * tap_voltage_norm * immersion
                e.voltage_v = (tap_voltage * (1.0 - 0.5 * immersion)) / math.sqrt(3)
            else:
                e.voltage_v = 0.0
                e.current_ka = 0.0

            e.consumed_m += (C.ELECTRODE_CONSUMPTION_KG_PER_MWH * max(e.current_ka, 0) / 1000.0) * dt_s / 3600.0

    # -- electrical power -------------------------------------------------
    def _update_electrical_power(self, dt_s: float) -> None:
        s = self.state
        total_mw = 0.0
        for e in s.electrodes:
            total_mw += math.sqrt(3) * e.voltage_v * e.current_ka * C.ARC_POWER_FACTOR / 1000.0
        s.electrical_power_mw = min(total_mw, C.TRANSFORMER_RATED_MVA)

        chem_mw = 0.0
        if s.burner_on and s.phase in (Phase.BORE_IN, Phase.MELTING):
            chem_mw += C.BURNER_CHEMICAL_POWER_MW
        if s.oxygen_flow_nm3h > 0 and s.solid_fraction < 0.9:
            chem_mw += s.oxygen_flow_nm3h * C.CHEMICAL_ENERGY_PER_NM3_O2_MJ / 3600.0
        s.chemical_power_mw = chem_mw
        s.total_power_mw = s.electrical_power_mw + s.chemical_power_mw
        s.energy_total_mwh += s.total_power_mw * dt_s / 3600.0

    # -- chemistry / decarburization -------------------------------------
    def _update_chemistry(self, dt_s: float) -> None:
        s = self.state
        if s.solid_fraction < 0.7 and s.oxygen_flow_nm3h > 0:
            removed = C.DECARB_RATE_PCT_PER_NM3 * s.oxygen_flow_nm3h * dt_s / 3600.0
            s.carbon_pct = max(0.0, s.carbon_pct - removed)
        if s.carbon_injection_kg_min > 0 and s.bath_mass_kg > 0:
            added_pct = (s.carbon_injection_kg_min * dt_s / 60.0) / s.bath_mass_kg * 100.0
            s.carbon_pct = min(C.CARBON_START_PCT * 1.5, s.carbon_pct + added_pct)

    def _update_slag_foam(self, dt_s: float) -> None:
        s = self.state
        growth = 0.0
        if s.carbon_injection_kg_min > 0 and s.solid_fraction < 0.3:
            growth += 0.02 * (s.carbon_injection_kg_min / 20.0)
        if s.oxygen_flow_nm3h > 0 and s.solid_fraction < 0.3:
            growth += 0.01 * (s.oxygen_flow_nm3h / 1000.0)
        decay = 0.01 + (0.05 if s.door_open else 0.0)
        s.slag_foam_index = max(0.0, min(1.0, s.slag_foam_index + (growth - decay) * dt_s))

    # -- thermal ----------------------------------------------------------
    def _update_thermal(self, dt_s: float) -> None:
        s = self.state
        if s.bath_mass_kg <= 0:
            return

        loss_shield = 1.0 - 0.5 * s.slag_foam_index  # foamy slag cuts radiative loss
        wall_loss_mw = C.NOMINAL_WALL_ROOF_LOSS_MW * loss_shield
        if s.door_open:
            wall_loss_mw += C.DOOR_OPEN_EXTRA_LOSS_MW
        if not s.power_on and s.phase not in (Phase.MELTING, Phase.REFINING, Phase.BORE_IN):
            wall_loss_mw *= 0.3

        offgas_loss_mw = C.OFFGAS_NOMINAL_LOSS_MW * (0.3 + 0.7 * (1.0 - s.solid_fraction)) if s.power_on else C.OFFGAS_NOMINAL_LOSS_MW * 0.2

        # wall/roof loss is physically carried away by the cooling water circuits
        available_for_bath_mw = max(0.0, s.total_power_mw - wall_loss_mw - offgas_loss_mw)

        delta_kj = available_for_bath_mw * 1000.0 * dt_s
        s.bath_enthalpy_kj_per_kg += delta_kj / s.bath_mass_kg
        s.bath_enthalpy_kj_per_kg = max(0.0, s.bath_enthalpy_kj_per_kg)
        self._recompute_bath_temp()

    def _recompute_bath_temp(self) -> None:
        s = self.state
        h = s.bath_enthalpy_kj_per_kg
        if h <= C.H_SOLID_AT_MELT_KJ_KG:
            s.bath_temp_c = C.AMBIENT_TEMP_C + h / C.CP_SOLID_STEEL_KJ_KG_K
            s.solid_fraction = 1.0
        elif h <= C.H_FULLY_MELTED_KJ_KG:
            melt_progress = (h - C.H_SOLID_AT_MELT_KJ_KG) / C.LATENT_HEAT_FUSION_KJ_KG
            s.bath_temp_c = C.MELTING_POINT_C
            s.solid_fraction = 1.0 - melt_progress
        else:
            superheat_kj = h - C.H_FULLY_MELTED_KJ_KG
            s.bath_temp_c = C.MELTING_POINT_C + superheat_kj / C.CP_LIQUID_STEEL_KJ_KG_K
            s.solid_fraction = 0.0

    # -- cooling water ------------------------------------------------------
    def _circuit_heat_removed_mw(self, circuit: CoolingCircuitState) -> float:
        share = C.COOLING_CIRCUITS[circuit.name]["loss_share"]
        return C.NOMINAL_WALL_ROOF_LOSS_MW * share

    def _update_cooling(self, dt_s: float) -> None:
        s = self.state
        for c in s.cooling.values():
            c.flow_lpm = c.nominal_flow_lpm * (1.0 - c.blocked_pct_loss)
            heat_removed_mw = self._circuit_heat_removed_mw(c) if s.power_on else self._circuit_heat_removed_mw(c) * 0.2
            mass_flow_kg_s = c.flow_lpm * C.WATER_DENSITY_KG_L / 60.0
            if mass_flow_kg_s > 0.01:
                c.delta_t_c = (heat_removed_mw * 1000.0) / (mass_flow_kg_s * C.CP_WATER_KJ_KG_K)
            else:
                c.delta_t_c = 99.0  # no flow -> runaway heating

    # -- off-gas -----------------------------------------------------------
    def _update_offgas(self, dt_s: float) -> None:
        s = self.state
        target_temp = 120.0
        if s.power_on:
            target_temp = 400.0 + 500.0 * (1.0 - s.solid_fraction) + (300.0 if s.door_open else 0.0)
        s.offgas_temp_c += (target_temp - s.offgas_temp_c) * min(1.0, dt_s / 30.0)

        target_co = 0.0
        if s.oxygen_flow_nm3h > 0 and s.solid_fraction < 0.5:
            target_co = min(25.0, s.oxygen_flow_nm3h / 80.0)
        s.offgas_co_pct += (target_co - s.offgas_co_pct) * min(1.0, dt_s / 20.0)

    # -- phase sequencing ----------------------------------------------------
    def _update_phase_logic(self, dt_s: float) -> None:
        s = self.state
        if s.phase == Phase.BORE_IN and s.bath_temp_c > 300.0:
            s.phase = Phase.MELTING
            s.transformer_tap = min(len(C.TRANSFORMER_TAPS_V) - 1, s.transformer_tap + 3)
        elif s.phase == Phase.MELTING and s.solid_fraction <= 0.02:
            s.phase = Phase.REFINING
        elif s.phase == Phase.CHARGING and s.baskets_charged > 0 and not s.power_on:
            pass  # waits for operator to power on -> bore_in

    # -- alarms --------------------------------------------------------------
    def _update_alarms(self, dt_s: float) -> None:
        s = self.state
        for c in s.cooling.values():
            code = f"COOLING_HIGH_DT_{c.name}"
            if c.delta_t_c > 25.0:
                self._raise_alarm(code, f"Høy temperaturstigning i kjølekrets '{c.name}' – fare for panelskade", Severity.CRITICAL)
            elif c.delta_t_c < 15.0:
                self._clear_alarm(code)

        if s.offgas_co_pct > 15.0:
            self._raise_alarm("OFFGAS_HIGH_CO", "Høyt CO-nivå i avgass – eksplosjonsfare", Severity.CRITICAL)
        elif s.offgas_co_pct < 10.0:
            self._clear_alarm("OFFGAS_HIGH_CO")

        if s.total_power_mw > C.TRANSFORMER_RATED_MVA * 0.98:
            self._raise_alarm("TRANSFORMER_OVERLOAD", "Transformator nær maksimal ytelse", Severity.WARNING)
        else:
            self._clear_alarm("TRANSFORMER_OVERLOAD")

        for e in s.electrodes:
            if e.broken:
                continue

    # -- random training events ------------------------------------------
    def _maybe_random_events(self, dt_s: float) -> None:
        s = self.state
        if s.phase == Phase.MELTING and s.power_on and s.solid_fraction > 0.15:
            if self.rng.random() < 0.0006 * dt_s:
                self.inject_fault("scrap_cave_in")
