/** Deterministisk pseudotilfeldig generator (mulberry32).
 *
 * Simuleringen bruker tilfeldighet til elektrodebrudd og overslag. En
 * seedbar generator gjør at en øvelse kan kjøres om igjen med nøyaktig
 * samme hendelsesforløp. */
export class Rng {
  private state: number;

  constructor(seed = Date.now() >>> 0) {
    this.state = seed >>> 0;
  }

  random(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  uniform(min: number, max: number): number {
    return min + this.random() * (max - min);
  }

  randrange(n: number): number {
    return Math.floor(this.random() * n);
  }

  choice<T>(items: T[]): T {
    return items[this.randrange(items.length)];
  }
}
