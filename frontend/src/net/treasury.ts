/**
 * Konsernkassa på serveren (B-183): kroner i verden, som går i ekte tid. Penger flyttes inn fra spillet i et begrenset
 * tempo per ekte døgn. Serveren gjør hele overføringen (kassa i det lagrede spillet og konsernkassa i én transaksjon),
 * og appen gjør det samme med spillet sitt. Ingenting i spillet viser kassa ennå (fase 1B, RETNING.md).
 */
import type { GameState } from "../game/types";
import { rpc } from "./supabase";
import { adoptServerRev, currentRev, uploadSave } from "./sync";

export interface TreasuryStatus {
  balance: number;
  /** Hvor mye som kan flyttes inn per ekte døgn (rullerende 24 timer) */
  limit: number;
  used: number;
  left: number;
  /** Når den eldste overføringen i døgnet faller ut, og mer blir ledig; null hvis ingen */
  freedAt: string | null;
}

interface StatusRow {
  balance: number | string;
  limit: number | string;
  used: number | string;
  left: number | string;
  freed_at: string | null;
}

export async function fetchTreasury(): Promise<TreasuryStatus> {
  const r = await rpc<StatusRow>("treasury_status", {});
  return {
    balance: Number(r.balance) || 0,
    limit: Number(r.limit) || 0,
    used: Number(r.used) || 0,
    left: Number(r.left) || 0,
    freedAt: r.freed_at ?? null,
  };
}

/** Hvorfor serveren sa nei */
export type DepositRefusal = "belop" | "sperret" | "lagre_forst" | "konsern" | "kasse" | "grense";

export type DepositResult =
  | { ok: true; amount: number; balance: number; left: number }
  | { ok: false; reason: DepositRefusal; left?: number };

interface DepositRow {
  ok: boolean;
  reason?: DepositRefusal;
  rev?: number | string;
  amount?: number | string;
  balance?: number | string;
  left?: number | string;
}

/** Forklaring med vanlige ord til spilleren */
export const DEPOSIT_REFUSAL_TEXT: Record<DepositRefusal, string> = {
  belop: "Velg et beløp over null.",
  sperret: "Kontoen er sperret for overføringer mens topplista sjekker den.",
  lagre_forst: "Spillet ble lagret fra et annet sted i mellomtiden. Prøv igjen.",
  konsern: "Konsernkassa åpnes når du har et konsern.",
  kasse: "Så mye har du ikke – lånte penger kan ikke flyttes.",
  grense: "Du har flyttet så mye som kan flyttes dette døgnet.",
};

/** Det serveren har gjort med spillet på nett, gjøres også med spillet her */
export function applyTreasuryDeposit(g: GameState, amount: number): void {
  g.cash -= amount;
  g.treasuryOut = (g.treasuryOut ?? 0) + amount;
}

/**
 * Flytt penger fra spillet til konsernkassa. Lagrer først, så versjonen på nett er den spillet her bygger på.
 * Kaster NetError ved nettfeil.
 */
export async function depositToTreasury(g: GameState, amount: number): Promise<DepositResult> {
  await uploadSave(g);
  const r = await rpc<DepositRow>("deposit_to_treasury", {
    p_amount: Math.floor(amount),
    p_base_rev: currentRev() ?? 0,
  });
  if (!r?.ok)
    return { ok: false, reason: r?.reason ?? "lagre_forst", left: r?.left === undefined ? undefined : Number(r.left) };
  const amt = Number(r.amount) || 0;
  applyTreasuryDeposit(g, amt);
  adoptServerRev(Number(r.rev));
  return { ok: true, amount: amt, balance: Number(r.balance) || 0, left: Number(r.left) || 0 };
}
