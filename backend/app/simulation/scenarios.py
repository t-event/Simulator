"""Preset training scenarios for the instructor panel.

A scenario describes an optional set of faults to inject at furnace start,
plus a human-readable briefing shown to the trainee before the exercise.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Scenario:
    id: str
    name: str
    briefing: str
    initial_faults: list[dict]


SCENARIOS: list[Scenario] = [
    Scenario(
        id="normal_heat",
        name="Normal smelte",
        briefing="Kjør en komplett smelte fra charging til tapping uten forstyrrelser. Fokus på prosedyre og effektiv tap-til-tap-tid.",
        initial_faults=[],
    ),
    Scenario(
        id="water_leak",
        name="Kjølevannslekkasje",
        briefing="En lekkasje oppstår i takets kjølekrets under smelting. Overvåk delta-T og reager før panelet skades.",
        initial_faults=[{"fault": "water_leak", "circuit": "roof", "severity": 0.6}],
    ),
    Scenario(
        id="electrode_break",
        name="Elektrodebrudd",
        briefing="En elektrode brekker rett etter oppstart. Identifiser feilen og følg prosedyre for elektrodebytte.",
        initial_faults=[{"fault": "electrode_break", "electrode": 1}],
    ),
    Scenario(
        id="cave_in_drill",
        name="Skrapras-øvelse",
        briefing="Hyppige skrapras under smelting krever rask reaksjon fra elektroderegulatoren. Vurder om automatisk regulering håndterer det, eller om manuell inngripen trengs.",
        initial_faults=[],
    ),
]


def get_scenario(scenario_id: str) -> Scenario | None:
    return next((s for s in SCENARIOS if s.id == scenario_id), None)
