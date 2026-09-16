from __future__ import annotations

from typing import TYPE_CHECKING

from . import constants as C

if TYPE_CHECKING:
    from .eaf import EAFSimulation


def state_to_dict(sim: "EAFSimulation") -> dict:
    s = sim.state
    grade = s.grade
    return {
        "time_s": round(s.time_s, 1),
        "phase": s.phase.value,
        "power_on": s.power_on,
        "time_scale": s.time_scale,
        "heat_number": s.heat_number,
        "grade": (
            {
                "code": grade.code,
                "name": grade.name,
                "tap_carbon_min_pct": grade.tap_carbon_min_pct,
                "tap_carbon_max_pct": grade.tap_carbon_max_pct,
                "phosphorus_max_pct": grade.phosphorus_max_pct,
                "final_carbon_pct": grade.final_carbon_pct,
            }
            if grade
            else None
        ),
        # Elektrisk
        "transformer_tap": s.transformer_tap,
        "electrical_power_mw": round(s.electrical_power_mw, 2),
        "chemical_power_mw": round(s.chemical_power_mw, 2),
        "total_power_mw": round(s.electrical_power_mw + s.chemical_power_mw, 2),
        "electrodes": [
            {
                "index": e.index,
                "position_pct": round(e.position_pct, 1),
                "target_position_pct": round(e.target_position_pct, 1),
                "current_ka": round(e.current_ka, 1),
                "voltage_v": round(e.voltage_v, 0),
                "mode": e.mode.value,
                "length_m": round(e.length_m, 2),
                "consumed_m": round(e.consumed_m, 3),
                "broken": e.broken,
            }
            for e in s.electrodes
        ],
        "electrode_cooling_pct": s.electrode_cooling_pct,
        "hvelv_dust_level": round(s.hvelv_dust_level, 3),
        # Metall
        "liquid_mass_kg": round(s.liquid_mass_kg, 0),
        "solid_scrap_kg": round(s.solid_scrap_kg, 0),
        "bath_temp_c": round(s.bath_temp_c, 1),
        "liquidus_c": round(sim.liquidus_c, 1),
        "tap_target_temp_c": round(sim.tap_target_temp_c, 1),
        "tap_window_c": C.TAP_SUPERHEAT_WINDOW_C,
        "carbon_pct": round(s.carbon_pct, 3),
        "phosphorus_pct": round(s.phosphorus_pct, 4),
        "silicon_pct": round(s.silicon_pct, 3),
        "manganese_pct": round(s.manganese_pct, 3),
        # Conveyor
        "conveyor_running": s.conveyor_running,
        "conveyor_rate_t_min": round(s.conveyor_rate_t_min, 2),
        "preheat_temp_c": round(s.preheat_temp_c, 0),
        "static_seal_ok": s.static_seal_ok,
        "charge_remaining_kg": round(s.charge_remaining_kg, 0),
        "scrap_charged_kg": round(s.scrap_charged_kg, 0),
        "charge_total_kg": C.CHARGE_SCRAP_MASS_KG,
        # Slagg
        "slag_mass_kg": round(sim.slag_mass_kg, 0),
        "slag_pct": {ox: round(sim.slag_pct(ox), 2) for ox in s.slag},
        "b2": round(sim.b2, 2),
        "b3": round(sim.b3, 2),
        "b2_target": C.B2_TARGET,
        "b3_target": C.B3_TARGET,
        "b2_window": C.B2_WINDOW,
        "slag_foam_index": round(s.slag_foam_index, 2),
        # Tilsatser
        "lime_rate_kg_min": s.lime_rate_kg_min,
        "dolomite_rate_kg_min": s.dolomite_rate_kg_min,
        "magnesite_rate_kg_min": s.magnesite_rate_kg_min,
        "carbon_injection_kg_min": s.carbon_injection_kg_min,
        "oxygen_flow_nm3h": s.oxygen_flow_nm3h,
        "lime_total_kg": round(s.lime_total_kg, 0),
        "dolomite_total_kg": round(s.dolomite_total_kg, 0),
        "carbon_total_kg": round(s.carbon_total_kg, 0),
        "oxygen_total_nm3": round(s.oxygen_total_nm3, 0),
        # Mekanisk
        "slag_door_open": s.slag_door_open,
        "tilt_deg": round(s.tilt_deg, 1),
        "slag_position_deg": C.SLAG_POSITION_DEG,
        "tap_position_deg": C.TAP_POSITION_DEG,
        # Avgass og kjøling
        "offgas_temp_c": round(s.offgas_temp_c, 0),
        "offgas_co_pct": round(s.offgas_co_pct, 2),
        "cooling": {
            name: {
                "flow_lpm": round(c.flow_lpm, 0),
                "nominal_flow_lpm": c.nominal_flow_lpm,
                "delta_t_c": round(c.delta_t_c, 1),
                "leaking": c.leaking,
            }
            for name, c in s.cooling.items()
        },
        "cooling_warning_dt": C.COOLING_DELTA_T_WARNING_C,
        "cooling_critical_dt": C.COOLING_DELTA_T_CRITICAL_C,
        "energy_total_mwh": round(s.energy_total_mwh, 2),
        "refractory_wear": round(s.refractory_wear, 4),
        "energy_per_tonne_kwh": (
            round(s.energy_total_mwh * 1000.0 / (s.scrap_charged_kg / 1000.0), 0)
            if s.scrap_charged_kg > 1000
            else 0
        ),
        "last_tap_result": s.last_tap_result,
        "alarms": [
            {
                "id": a.id,
                "code": a.code,
                "message": a.message,
                "severity": a.severity.value,
                "active": a.active,
                "ack": a.ack,
                "raised_at_s": round(a.raised_at_s, 1),
            }
            for a in s.alarms
            if a.active or not a.ack
        ],
        "scenario": s.scenario,
    }
