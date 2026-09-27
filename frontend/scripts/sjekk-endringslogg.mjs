// Endringsloggen i spillet (B-179) skal dekke den nyeste beslutningen i docs/BESLUTNINGER.md som spillerne merker.
// Beslutninger med linja «Endringslogg: nei» (ingen endring i spillet, f.eks. ren planlegging, B-180) hoppes over.
// Kjøres av `npm test` (også i CI), så en ny beslutning uten linje i «Hva er nytt» stopper publiseringen.
import { readFileSync } from "node:fs";

const decisions = readFileSync(new URL("../../docs/BESLUTNINGER.md", import.meta.url), "utf8");
const changelog = readFileSync(new URL("../src/game/changelog.ts", import.meta.url), "utf8");
const sections = decisions.split(/^## /m).slice(1);
const visible = sections
  .map((s) => ({ b: Number((s.match(/^B-(\d+)/) ?? [])[1]), internal: /^Endringslogg:\s*nei\b/im.test(s) }))
  .filter((x) => Number.isFinite(x.b) && !x.internal)
  .map((x) => x.b);
const newestB = Math.max(...visible);
const first = changelog.match(/\bb:\s*(\d+)/);
const newestLog = first ? Number(first[1]) : 0;
if (newestLog < newestB) {
  console.log(
    `FEIL  Endringsloggen (src/game/changelog.ts) dekker B-${newestLog}, men nyeste beslutning spillerne merker er ` +
      `B-${newestB}. Legg til en oppføring øverst med det spillerne merker – eller merk beslutningen «Endringslogg: nei» ` +
      "hvis den ikke endrer noe i spillet.",
  );
  process.exitCode = 1;
} else {
  console.log(`Endringsloggen dekker B-${newestLog} (nyeste beslutning spillerne merker: B-${newestB})`);
}
