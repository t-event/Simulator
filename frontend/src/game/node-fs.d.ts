// Bare testspilleren (balance.ts) leser og skriver filer (`--storovn-base`/`--storovn-dump`, B-305). Prosjektet har
// ingen Node-typer, så det lille som trengs av node:fs, erklæres her.
declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function writeFileSync(path: string, data: string): void;
}
