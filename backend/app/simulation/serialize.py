from __future__ import annotations

from .model import FurnaceState


def state_to_dict(s: FurnaceState) -> dict:
    return {
        "time_s": round(s.time_s, 1),
        "phase": s.phase.value,
        "power_on": s.power_on,
        "time_scale": s.time_scale,
        "transformer_tap": s.transformer_tap,
        "total_power_mw": round(s.total_power_mw, 2),
        "electrical_power_mw": round(s.electrical_power_mw, 2),
        "chemical_power_mw": round(s.chemical_power_mw, 2),
        "electrodes": [
            {
                "index": e.index,
                "position_pct": round(e.position_pct, 1),
                "target_position_pct": round(e.target_position_pct, 1),
                "current_ka": round(e.current_ka, 1),
                "voltage_v": round(e.voltage_v, 0),
                "mode": e.mode.value,
                "consumed_m": round(e.consumed_m, 3),
                "broken": e.broken,
            }
            for e in s.electrodes
        ],
        "baskets_charged": s.baskets_charged,
        "bath_mass_kg": round(s.bath_mass_kg, 0),
        "bath_temp_c": round(s.bath_temp_c, 1),
        "solid_fraction": round(s.solid_fraction, 3),
        "carbon_pct": round(s.carbon_pct, 3),
        "oxygen_flow_nm3h": s.oxygen_flow_nm3h,
        "carbon_injection_kg_min": s.carbon_injection_kg_min,
        "burner_on": s.burner_on,
        "slag_foam_index": round(s.slag_foam_index, 2),
        "door_open": s.door_open,
        "tilt_deg": s.tilt_deg,
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
        "energy_total_mwh": round(s.energy_total_mwh, 2),
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
