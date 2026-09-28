/**
 * Underfanene i Verket. Står i GameApp, så en annen side kan åpne en bestemt underfane (B-192).
 * Konsern er egen hovedside med egne underfaner (B-226).
 */
export type VerketTab = "oversikt" | "anlegg" | "resept" | "okonomi";

export const VERKET_TABS: { id: VerketTab; label: string }[] = [
  { id: "oversikt", label: "Oversikt" },
  { id: "anlegg", label: "Anlegg" },
  // Resepten hører til produksjonen, ikke til markedet (B-199)
  { id: "resept", label: "Resept" },
  { id: "okonomi", label: "Økonomi" },
];

export function isVerketTab(t: string | undefined): t is VerketTab {
  return VERKET_TABS.some((x) => x.id === t);
}
