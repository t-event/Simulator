/** Underfanene i Verket. Står i GameApp, så sidemenyen på PC kan åpne Konsern direkte (B-192). */
export type VerketTab = "oversikt" | "anlegg" | "resept" | "okonomi" | "konsern";

export const VERKET_TABS: { id: VerketTab; label: string }[] = [
  { id: "oversikt", label: "Oversikt" },
  { id: "anlegg", label: "Anlegg" },
  // Resepten hører til produksjonen, ikke til markedet (B-199)
  { id: "resept", label: "Resept" },
  { id: "okonomi", label: "Økonomi" },
  { id: "konsern", label: "Konsern" },
];

export function isVerketTab(t: string | undefined): t is VerketTab {
  return VERKET_TABS.some((x) => x.id === t);
}
