/**
 * Seedbar tilfeldighet (mulberry32) med tilstanden lagret i spillet.
 *
 * Tilstanden ligger i GameState.rng, så et lagret spill fortsetter med
 * nøyaktig samme hendelsesforløp, og testspilleren kan kjøres om igjen.
 */
import type { GameState } from "./types";

export function rand(g: GameState): number {
  g.rng = (g.rng + 0x6d2b79f5) >>> 0;
  let t = g.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function uniform(g: GameState, min: number, max: number): number {
  return min + rand(g) * (max - min);
}

export function randInt(g: GameState, min: number, max: number): number {
  return min + Math.floor(rand(g) * (max - min + 1));
}

export function pick<T>(g: GameState, items: readonly T[]): T {
  return items[Math.floor(rand(g) * items.length)];
}

export function chance(g: GameState, p: number): boolean {
  return rand(g) < p;
}

/** Tilnærmet normalfordelt støy (sum av tre uniforme). */
export function noise(g: GameState, sd: number): number {
  return (rand(g) + rand(g) + rand(g) - 1.5) * 2 * sd;
}
