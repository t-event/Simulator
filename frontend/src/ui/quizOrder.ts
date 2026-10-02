/** Fast, men blandet rekkefølge på svaralternativene, så riktig svar ikke alltid står på samme plass */
export function answerOrder(q: string, n: number): number[] {
  // FNV-1a med blanding til slutt (B-428): før var nummeret siste tegn i en enkel sum, så rekkefølgen ble alltid
  // den opprinnelige – riktig svar sto på samme plass i alle spørsmålene
  const hash = (text: string) => {
    let h = 2166136261;
    for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    h ^= h >>> 15;
    h = Math.imul(h, 2246822507);
    h ^= h >>> 13;
    return h >>> 0;
  };
  return Array.from({ length: n }, (_, j) => j).sort((a, b) => hash(`${a}|${q}`) - hash(`${b}|${q}`));
}
