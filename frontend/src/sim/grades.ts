/**
 * Stålkvaliteter som kan kjøres i simulatoren.
 *
 * Kvalitetene er generiske eksempler som spenner ut det operatøren må kunne
 * håndtere: en vanlig armeringskvalitet, en lavkarbonkvalitet som krever mer
 * oksygen og gir høyere FeO i slaggen, og en høykarbonkvalitet som tappes
 * varmere ned mot en lavere likvidustemperatur.
 *
 * Karbonvinduene er det stålovnen skal tappe på, ikke ferdig analyse: karbon
 * legeres opp igjen ved tapping og på øseovnen. Tallet i koden er ferdig
 * karboninnhold i hundredeler.
 */
import type { SteelGrade } from "./state";

export const GRADES: SteelGrade[] = [
  {
    code: "AR20",
    name: "AR20 – armeringskvalitet",
    tapCarbonMinPct: 0.04,
    tapCarbonMaxPct: 0.1,
    phosphorusMaxPct: 0.035,
    finalCarbonPct: 0.2,
  },
  {
    code: "LK08",
    name: "LK08 – lavkarbon",
    tapCarbonMinPct: 0.02,
    tapCarbonMaxPct: 0.05,
    phosphorusMaxPct: 0.03,
    finalCarbonPct: 0.08,
  },
  {
    code: "HK80",
    name: "HK80 – høykarbon",
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
