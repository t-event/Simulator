export type View = "verket" | "marked" | "salg" | "folk" | "bygg";

export const VIEWS: { id: View; label: string }[] = [
  { id: "verket", label: "Verket" },
  { id: "marked", label: "Marked" },
  { id: "salg", label: "Salg" },
  { id: "folk", label: "Folk" },
  { id: "bygg", label: "Bygg" },
];
