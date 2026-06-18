import { describe, it, expect } from "vitest";
import { makeRng } from "./rng.ts";

describe("makeRng", () => {
  it("produces identical sequences for the same seed", () => {
    const a = makeRng(42);
    const b = makeRng(42);

    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it("produces different sequences for different seeds", () => {
    const a = makeRng(1);
    const b = makeRng(2);

    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());

    expect(seqA).not.toEqual(seqB);
  });

  it("next() returns values in [0, 1)", () => {
    const rng = makeRng(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("shuffle is deterministic for a fixed seed", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const a = makeRng(7);
    const b = makeRng(7);

    expect(a.shuffle(arr)).toEqual(b.shuffle(arr));
  });

  it("shuffle produces a permutation of the original array", () => {
    const arr = [10, 20, 30, 40, 50];
    const rng = makeRng(123);
    const result = rng.shuffle(arr);

    expect(result).toHaveLength(arr.length);
    expect([...result].sort((x, y) => x - y)).toEqual([...arr].sort((x, y) => x - y));
  });

  it("shuffle does not mutate the source array", () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    const rng = makeRng(0);
    rng.shuffle(arr);

    expect(arr).toEqual(copy);
  });
});
