// Ingen emoji i appen (B-237): grensesnittet bruker ikonene i designsystemet (ui/icons.tsx, Lucide). Kjøres av
// `npm test` og i CI. Emoji i tekst fra serveren (f.eks. plasseringen på topplista) gjøres om til ikoner i appen.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const EMOJI = /\p{Extended_Pictographic}/u;
// Teksttegn som nyere Unicode (16) også regner som piktogrammer, men som ikke vises som emoji: stjerna i
// kontrollrommet (★) og menytegnet i hjemskjermtipset (☰). Fjernes før sjekken (B-502)
const TEXT_SYMBOLS = /[\u2605\u2630]/gu;
const found = [];
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|css|html|json|webmanifest)$/.test(f)) check(p);
  }
}
function check(p) {
  readFileSync(p, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (EMOJI.test(line.replace(TEXT_SYMBOLS, ""))) found.push(`${p}:${i + 1}: ${line.trim().slice(0, 80)}`);
    });
}
walk("src");
walk("public");
check("index.html");
if (found.length) {
  console.error(`Emoji i appen – bruk et ikon fra ui/icons.tsx i stedet (B-237):\n${found.join("\n")}`);
  process.exit(1);
}
console.log("Ingen emoji i appen");
