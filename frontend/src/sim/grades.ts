/**
 * TP-kvaliteter som kan kjøres i simulatoren.
 *
 * Ferdig karboninnhold for TP26 og TP77 er hentet fra kompendiet (kapittel 6.5),
 * der TP26 ligger rundt 0,2 %C med likvidus 1504 °C og TP77 rundt 0,8 %C med
 * likvidus 1462 °C. TP28 er omtalt som en lavkarbonkvalitet med mye oksygen.
 *
 * Karbonvinduene under er det stålovnen skal tappe på; resten legeres opp ved
 * tapping og på øseovnen (kompendiet kapittel 5.2).
 */
import type { SteelGrade } from "./state";

export const GRADES: SteelGrade[] = [
  {
    code: "TP26",
    name: "TP26 – armeringsstål",
    tapCarbonMinPct: 0.04,
    tapCarbonMaxPct: 0.1,
    phosphorusMaxPct: 0.035,
    finalCarbonPct: 0.2,
  },
  {
    code: "TP28",
    name: "TP28 – lavkarbon",
    tapCarbonMinPct: 0.02,
    tapCarbonMaxPct: 0.05,
    phosphorusMaxPct: 0.03,
    finalCarbonPct: 0.08,
  },
  {
    code: "TP77",
    name: "TP77 – høykarbon",
    tapCarbonMinPct: 0.25,
    tapCarbonMaxPct: 0.45,
    phosphorusMaxPct: 0.04,
    finalCarbonPct: 0.8,
  },
];

export const DEFAULT_GRADE = GRADES[0];

export function getGrade(code: string): SteelGrade | undefined {
  return GRADES.find((g) => g.code === code);
}
