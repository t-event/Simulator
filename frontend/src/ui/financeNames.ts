/** Navn på inntekts- og kostnadspostene, og resultatet for et døgn (Verket → Økonomi, B-203) */
import type { CostCategory, DayFinance, IncomeCategory } from "../game/types";

export const COST_NAMES: Record<CostCategory, string> = {
  skrap: "Skrap",
  energi: "Strøm og energi",
  nett: "Effekttariff",
  forbruk: "Forbruksvarer (elektroder o.l.)",
  lonn: "Lønn",
  vedlikehold: "Vedlikehold",
  faste: "Faste kostnader",
  renter: "Renter",
  bot: "Bøter",
  konsern: "Konsernkostnader",
  investering: "Kjøp av utstyr, bygg og gaver",
  annet: "Annet",
};

export const INCOME_NAMES: Record<IncomeCategory, string> = {
  kontrakt: "Kontrakter",
  spot: "Salg på spot",
  konsern: "Utbytte fra datterverkene",
  annet: "Annet",
};

export function dayResult(d: DayFinance): number {
  const sum = (r: Partial<Record<string, number>>) => Object.values(r).reduce<number>((a, v) => a + (v ?? 0), 0);
  return sum(d.income) - sum(d.costs);
}
