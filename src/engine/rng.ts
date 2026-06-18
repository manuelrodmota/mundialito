/**
 * Deterministic seeded PRNG (mulberry32).
 * All engine and sim randomness flows through an RNG instance so results
 * are fully reproducible given the same seed.
 */
export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns a new array that is a shuffled copy of arr (Fisher-Yates). */
  shuffle<T>(arr: readonly T[]): T[];
}

/** Factory — create a seeded RNG from a 32-bit integer. */
export function makeRng(seed: number): Rng {
  let s = seed >>> 0;

  function next(): number {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function shuffle<T>(arr: readonly T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const tmp = a[i]!;
      a[i] = a[j]!;
      a[j] = tmp;
    }
    return a;
  }

  return { next, shuffle };
}
