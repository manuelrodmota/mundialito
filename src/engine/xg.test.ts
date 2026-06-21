import { describe, it, expect } from "vitest";
import { xgAdd, addXg } from "./xg.ts";
import type { PlayerState } from "./types.ts";

function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    goals: 0,
    xg: 0,
    fatigue: 0,
    scoredFirstAt: null,
    maxStamina: 8,
    stamina: 8,
    drawPile: [],
    hand: [],
    discard: [],
    locked: [],
    exiled: [],
    tacticalsThisHalf: 0,
    tacticSpent: 0,
    tacticBonus: 0,
    board: { attack: [], defense: [] },
    formation: "balanced",
    powers: [],
    captainId: "",
    momentum: 0,
    handOfGodUsed: false,
    ...overrides,
  };
}

describe("xgAdd", () => {
  it("returns XG_FLOOR (0.10) when ATK <= DEF", () => {
    expect(xgAdd(50, 50)).toBe(0.1);
    expect(xgAdd(30, 80)).toBe(0.1);
  });

  it("caps at XG_CAP (0.55) when delta is very large", () => {
    expect(xgAdd(1000, 0)).toBe(0.55);
  });

  it("computes correctly for delta=105 → 0.10 + 105/180 = 0.68 → capped at 0.55", () => {
    expect(xgAdd(105, 0)).toBe(0.55);
  });

  it("returns exact value before the cap kicks in (delta=54 → 0.10+0.30=0.40)", () => {
    expect(xgAdd(54, 0)).toBeCloseTo(0.4, 5);
  });

  it("returns 0.10 when delta is exactly 0", () => {
    expect(xgAdd(100, 100)).toBe(0.1);
  });

  it("is bounded: never below 0.10, never above 0.55", () => {
    for (const [a, d] of [[0, 9999], [100, 100], [9999, 0]]) {
      const v = xgAdd(a as number, d as number);
      expect(v).toBeGreaterThanOrEqual(0.1);
      expect(v).toBeLessThanOrEqual(0.55);
    }
  });
});

describe("addXg", () => {
  it("accumulates without scoring when xg < GOAL_THRESHOLD", () => {
    const s = makeState({ xg: 0.3 });
    addXg(s, 0.4, 1);
    expect(s.goals).toBe(0);
    expect(s.xg).toBeCloseTo(0.7, 5);
    expect(s.scoredFirstAt).toBeNull();
  });

  it("scores a goal on crossing GOAL_THRESHOLD (0.80) and carries the remainder", () => {
    const s = makeState({ xg: 0.8 });
    addXg(s, 0.5, 3);
    expect(s.goals).toBe(1);
    expect(s.xg).toBeCloseTo(0.5, 5); // 1.3 − 0.8
    expect(s.scoredFirstAt).toBe(3);
  });

  it("scores multiple goals in one add (multi-goal carry)", () => {
    const s = makeState({ xg: 0.0 });
    addXg(s, 2.5, 5); // 2.5 / 0.8 = 3 goals, carry 0.1
    expect(s.goals).toBe(3);
    expect(s.xg).toBeCloseTo(0.1, 5);
  });

  it("sets scoredFirstAt only on the first goal", () => {
    const s = makeState({ xg: 0.0 });
    addXg(s, 1.1, 2);
    addXg(s, 1.0, 4);
    expect(s.scoredFirstAt).toBe(2);
    expect(s.goals).toBe(2);
  });

  it("does not reset scoredFirstAt once set", () => {
    const s = makeState({ xg: 0.9, scoredFirstAt: 1, goals: 1 });
    addXg(s, 0.2, 7);
    expect(s.scoredFirstAt).toBe(1);
  });

  it("handles exact crossing (no remainder)", () => {
    const s = makeState({ xg: 0.3 });
    addXg(s, 0.5, 6); // 0.3 + 0.5 = 0.8 = exactly GOAL_THRESHOLD
    expect(s.goals).toBe(1);
    expect(s.xg).toBeCloseTo(0, 10);
  });
});
