/**
 * Simulering av verksjefene (B-488) mot akseptkriteriene i docs/VERKSJEF-FORSLAG.md avsnitt 10.6.
 * Kjør: npx tsx src/game/managerSim.ts
 * Regner med reglene i game/managers.ts (samme tall som serveren) og et fullt konsern på ca. 30 mill. per ekte dag.
 */
import {
  CALL_CARDS,
  legalStats,
  MANAGERS,
  MANDATES,
  MANDATE_NAME,
  modFactors,
  netShare,
  optionValue,
  salaryShare,
  traitChoice,
  TRAITS,
  type ManagerStats,
  type Mandate,
} from "./managers";

const pct = (x: number) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)} %`;
const mill = (x: number) => `${(x / 1e6).toFixed(1)} mill.`;
const all = legalStats();
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const draw = (): ManagerStats => all[Math.floor(rnd() * all.length)];
const best = (m: Mandate, n: number) => {
  let b = -1;
  for (let i = 0; i < n; i++) b = Math.max(b, netShare(m, draw()));
  return b;
};
const mean = (f: () => number, n = 20000) => {
  let s = 0;
  for (let i = 0; i < n; i++) s += f();
  return s / n;
};

console.log(`Lovlige kandidater: ${all.length} (sum 6–10, aldri 5 på to egenskaper)\n`);

console.log("1. Netto per mandat (faktor − 1 − lønn), andel av verkets utbytte:");
for (const m of MANDATES) {
  const avg = mean(() => netShare(m, draw()));
  const b3 = mean(() => best(m, 3));
  const b15 = mean(() => best(m, 15));
  const top = Math.max(...all.map((s) => netShare(m, s)));
  console.log(
    `   ${MANDATE_NAME[m].padEnd(11)} tilfeldig ${pct(avg)}, beste av 3 ${pct(b3)}, beste av 15 (5 dager) ${pct(b15)}, beste mulige ${pct(top)}`,
  );
}

const DIV = 30e6;
console.log(`\n2./4. Fullt konsern, ${mill(DIV)} per ekte dag i utbytte:`);
for (const n of [3, 15]) {
  const b = mean(() => best("lonnsomhet", n));
  console.log(`   Lønnsomhet på alle verk, beste av ${n}: ${mill(DIV * b)} per dag (${pct(b)})`);
}
const kompleksMod = 60e6 * 0.3 * 0.75;
for (const drift of [1, 3, 5]) {
  const f = modFactors("vekst", { drift, okonomi: 1, folk: 1 });
  console.log(
    `   Vekst, Drift ${drift}: modernisering av et kompleks ${mill(kompleksMod * f.cost)} i stedet for ${mill(kompleksMod)} (spart ${mill(kompleksMod * (1 - f.cost))}), ${Math.round(4 * f.time * 60)} min i stedet for 240`,
  );
}
const lf = modFactors("lonnsomhet", { drift: 3, okonomi: 3, folk: 3 });
console.log(`   Lønnsomhet: modernisering ${mill(kompleksMod * lf.cost)} og ${Math.round(4 * lf.time * 60)} min`);
const plantDiv = DIV / 14;
const vekstCost = mean(() => -netShare("vekst", draw())) * plantDiv;
console.log(
  `   Vekst koster ca. ${mill(vekstCost)} per dag per kompleks (utbytte og lønn) – lønner seg når verket moderniseres oftere enn hver ${((kompleksMod * 0.19) / vekstCost).toFixed(1)}. dag`,
);

console.log("\n3. Uten verksjef: faktor 1, ingen lønn, ingen virkning på moderniseringen (testen i tests.ts)");

console.log("\n5. Fisking (avslutt og ansett en ny):");
const s3 = { drift: 3, okonomi: 3, folk: 3 };
const sev = MANAGERS.severanceDays * salaryShare(s3);
const gap = MANAGERS.quarantineDays * Math.max(0, netShare("lonnsomhet", s3));
const gain = mean(() => best("lonnsomhet", 3)) - netShare("lonnsomhet", s3);
console.log(
  `   Sluttpakke ${sev.toFixed(2)} dager av verkets utbytte + ${MANAGERS.quarantineDays} dager uten verksjef; en bedre kandidat gir ${pct(gain)} per dag – tjent inn etter ca. ${Math.ceil((sev + gap) / Math.max(gain, 1e-6))} dager`,
);

console.log(
  "\nSamtalene: forventet verdi i dager av verkets utbytte (uten mandat / med Stabilitet), og hva trekkene velger:",
);
for (const c of CALL_CARDS) {
  const [a, b] = c.options;
  const choices = TRAITS.map((t) => `${t[0]}:${traitChoice(c, t, "lonnsomhet") ? "B" : "A"}`).join(" ");
  console.log(
    `   ${c.id.padEnd(10)} A «${a.label}» ${optionValue(a).toFixed(2)} / ${optionValue(a, "stabilitet").toFixed(2)}   B «${b.label}» ${optionValue(b).toFixed(2)} / ${optionValue(b, "stabilitet").toFixed(2)}   ${choices}`,
  );
}
const perWeek = 2.5;
const avgBest = mean(() => {
  const c = CALL_CARDS[Math.floor(rnd() * CALL_CARDS.length)];
  return Math.max(optionValue(c.options[0]), optionValue(c.options[1]));
});
console.log(
  `   Svarer du alltid best: ${avgBest.toFixed(2)} dager per samtale, ${perWeek} samtaler i uka ≈ ${pct((avgBest * perWeek) / 7 / 14)} av konsernets utbytte`,
);
