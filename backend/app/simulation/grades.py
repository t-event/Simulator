"""TP-kvaliteter som kan kjøres i simulatoren.

Ferdig karboninnhold for TP26 og TP77 er hentet fra kompendiet (kapittel 6.5),
der TP26 ligger rundt 0,2 %C med likvidus 1504 °C og TP77 rundt 0,8 %C med
likvidus 1462 °C. TP28 er omtalt som en lavkarbonkvalitet med mye oksygen.

Karbonvinduene under er det stålovnen skal tappe på; resten legeres opp ved
tapping og på øseovnen (kompendiet kapittel 5.2).
"""
from __future__ import annotations

from .model import SteelGrade

GRADES: list[SteelGrade] = [
    SteelGrade(
        code="TP26",
        name="TP26 – armeringsstål",
        tap_carbon_min_pct=0.04,
        tap_carbon_max_pct=0.10,
        phosphorus_max_pct=0.035,
        final_carbon_pct=0.20,
    ),
    SteelGrade(
        code="TP28",
        name="TP28 – lavkarbon",
        tap_carbon_min_pct=0.02,
        tap_carbon_max_pct=0.05,
        phosphorus_max_pct=0.030,
        final_carbon_pct=0.08,
    ),
    SteelGrade(
        code="TP77",
        name="TP77 – høykarbon",
        tap_carbon_min_pct=0.25,
        tap_carbon_max_pct=0.45,
        phosphorus_max_pct=0.040,
        final_carbon_pct=0.80,
    ),
]

DEFAULT_GRADE = GRADES[0]


def get_grade(code: str) -> SteelGrade | None:
    return next((g for g in GRADES if g.code == code), None)
