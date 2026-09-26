// Endringsloggen i spillet (B-179) skal dekke den nyeste beslutningen i docs/BESLUTNINGER.md.
// Kjøres av `npm test` (også i CI), så en ny beslutning uten linje i «Hva er nytt» stopper publiseringen.
import { readFileSync } from "node:fs";

const decisions = readFileSync(new URL("../../docs/BESLUTNINGER.md", import.meta.url), "utf8");
const changelog = readFileSync(new URL("../src/game/changelog.ts", import.meta.url), "utf8");
const newestB = Math.max(...[...decisions.matchAll(/^## B-(\d+)/gm)].map((m) => Number(m[1])));
const first = changelog.match(/\bb:\s*(\d+)/);
const newestLog = first ? Number(first[1]) : 0;
if (newestLog < newestB) {
  console.log(
    `FEIL  Endringsloggen (src/game/changelog.ts) dekker B-${newestLog}, men nyeste beslutning er B-${newestB}. ` +
      "Legg til en oppføring øverst med det spillerne merker.",
  );
  process.exitCode = 1;
} else {
  console.log(`Endringsloggen dekker B-${newestLog} (nyeste beslutning B-${newestB})`);
}
