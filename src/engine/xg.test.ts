import { describe, it, expect } from "vitest";
import { xgAdd, addPressure, takeShot, previewConversion } from "./xg.ts";
import { BASE_CONVERSION, CONVERSION_CAP, MISS_DROP_FRAC, PRESSURE_FULL, PARK_THE_BUS_PENALTY } from "./constants.ts";
import type { PlayerState } from "./types.ts";
import type { Rng } from "./rng.ts";

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
    missStreak: 0,
    ...overrides,
  };
}

/** A stubbed Rng whose next() always returns a fixed roll. */
function fixedRng(roll: number): Rng {
  return { next: () => roll, shuffle: (a) => [...a] };
}

/** A stubbed Rng that returns the given rolls in sequence (then repeats the last). */
function seqRng(rolls: number[]): Rng {
  let i = 0;
  return { next: () => rolls[Math.min(i++, rolls.length - 1)]!, shuffle: (a) => [...a] };
}

describe("xgAdd (fill)", () => {
  it("returns XG_FLOOR (0.10) when ATK <= DEF", () => {
    expect(xgAdd(50, 50)).toBe(0.1);
    expect(xgAdd(30, 80)).toBe(0.1);
  });

  it("caps at XG_CAP (0.65) when delta is very large", () => {
    expect(xgAdd(1000, 0)).toBe(0.65);
  });

  it("honours a custom floor (Time Wasting → 0)", () => {
    expect(xgAdd(50, 50, 0)).toBe(0);
  });
});

describe("addPressure", () => {
  it("accumulates fill and clamps to PRESSURE_FULL", () => {
    const s = makeState({ xg: 0.3 });
    addPressure(s, 0.4);
    expect(s.xg).toBeCloseTo(0.7, 5);
    addPressure(s, 0.9);
    expect(s.xg).toBe(PRESSURE_FULL);
  });
});

describe("takeShot", () => {
  it("does not shoot below full without a forced shot", () => {
    const s = makeState({ xg: 0.6 });
    const out = takeShot(s, { round: 1, rng: fixedRng(0) });
    expect(out.took).toBe(false);
    expect(s.goals).toBe(0);
    expect(s.xg).toBeCloseTo(0.6, 5);
  });

  it("scores when the roll lands under P, emptying the meter", () => {
    const s = makeState({ xg: PRESSURE_FULL });
    const out = takeShot(s, { round: 4, rng: fixedRng(0.0) }); // 0 < P → goal
    expect(out.took).toBe(true);
    expect(out.scored).toBe(true);
    expect(s.goals).toBe(1);
    expect(s.xg).toBe(0);
    expect(s.scoredFirstAt).toBe(4);
    expect(s.missStreak).toBe(0);
  });

  it("misses when the roll exceeds P, dropping the meter and raising the streak", () => {
    const s = makeState({ xg: PRESSURE_FULL });
    const out = takeShot(s, { round: 2, rng: fixedRng(0.999) }); // 0.999 > P → miss
    expect(out.scored).toBe(false);
    expect(s.goals).toBe(0);
    expect(s.xg).toBeCloseTo(PRESSURE_FULL * (1 - MISS_DROP_FRAC), 5);
    expect(s.missStreak).toBe(1);
  });

  it("a forced shot fires below full at its conversion floor (Penalty)", () => {
    const s = makeState({ xg: 0.2 });
    // roll just under 0.78 → penalty converts; would NOT convert at the open-play base.
    const out = takeShot(s, { round: 3, rng: fixedRng(0.77), forceShot: true, convFloor: 0.78 });
    expect(out.took).toBe(true);
    expect(out.scored).toBe(true);
    expect(out.p).toBeCloseTo(0.78, 5);
  });
});

describe("previewConversion (telegraph)", () => {
  it("is 0 when the meter is not full and no shot is forced", () => {
    expect(previewConversion(makeState({ xg: 0.5 }))).toBe(0);
  });

  it("equals the base conversion at a full meter with no modifiers", () => {
    expect(previewConversion(makeState({ xg: PRESSURE_FULL }))).toBeCloseTo(BASE_CONVERSION, 5);
  });

  it("adds the pity bonus per consecutive miss", () => {
    const base = previewConversion(makeState({ xg: PRESSURE_FULL }));
    const withPity = previewConversion(makeState({ xg: PRESSURE_FULL, missStreak: 2 }));
    expect(withPity).toBeGreaterThan(base);
  });

  it("never exceeds CONVERSION_CAP", () => {
    const p = previewConversion(makeState({ xg: PRESSURE_FULL, missStreak: 99 }), { convFloor: 0.99 });
    expect(p).toBeLessThanOrEqual(CONVERSION_CAP);
  });

  it("Park the Bus cuts an open-play shot's conversion by the penalty", () => {
    const base = previewConversion(makeState({ xg: PRESSURE_FULL }));
    const bussed = previewConversion(makeState({ xg: PRESSURE_FULL }), { busPenalty: PARK_THE_BUS_PENALTY });
    expect(bussed).toBeCloseTo(base - PARK_THE_BUS_PENALTY, 5);
  });

  it("a Snap Shot is a full open-play conversion even on a partial meter", () => {
    expect(previewConversion(makeState({ xg: 0.5 }), { snap: true })).toBeCloseTo(BASE_CONVERSION, 5);
  });
});

describe("v12 Park the Bus (takeShot)", () => {
  it("a full-meter shot that would score at the base is saved once the bus is parked", () => {
    // roll 0.6: under base 0.75 (goal) but over 0.55 once the bus cuts 0.20 (save).
    const noBus = makeState({ xg: PRESSURE_FULL });
    expect(takeShot(noBus, { round: 1, rng: fixedRng(0.6) }).scored).toBe(true);

    const bussed = makeState({ xg: PRESSURE_FULL });
    const out = takeShot(bussed, { round: 1, rng: fixedRng(0.6), busPenalty: PARK_THE_BUS_PENALTY });
    expect(out.scored).toBe(false);
    expect(out.busApplied).toBe(true);
  });

  it("a forced shot (Penalty) ignores the parked bus", () => {
    const s = makeState({ xg: 0.2 });
    const out = takeShot(s, { round: 1, rng: fixedRng(0.7), forceShot: true, convFloor: 0.78, busPenalty: PARK_THE_BUS_PENALTY });
    expect(out.scored).toBe(true); // 0.7 < 0.78, the bus didn't apply
    expect(out.busApplied).toBe(false);
  });
});

describe("v12 Snap Shot (takeShot)", () => {
  it("fires on a near-maxed attacking round and can score, emptying the meter", () => {
    // xgRound 0.65 (the cap) → snapChance 0.10; roll 0.05 triggers the snap, second roll 0.05 converts.
    const s = makeState({ xg: 0.5 });
    const out = takeShot(s, { round: 1, rng: seqRng([0.05, 0.05]), xgRound: 0.65 });
    expect(out.took).toBe(true);
    expect(out.snap).toBe(true);
    expect(out.scored).toBe(true);
    expect(s.xg).toBe(0);
  });

  it("a missed Snap Shot resets the meter to 0 WITHOUT raising the miss streak", () => {
    const s = makeState({ xg: 0.5, missStreak: 1 }); // below PRESSURE_FULL → a partial-meter snap, not a full shot
    const out = takeShot(s, { round: 1, rng: seqRng([0.05, 0.999]), xgRound: 0.65 });
    expect(out.snap).toBe(true);
    expect(out.scored).toBe(false);
    expect(s.xg).toBe(0);            // pressure spent
    expect(s.missStreak).toBe(1);    // untouched (not a full-meter miss)
  });

  it("does not fire below the snap threshold", () => {
    const s = makeState({ xg: 0.5 });
    const out = takeShot(s, { round: 1, rng: fixedRng(0.0), xgRound: 0.3 }); // snapChance 0
    expect(out.took).toBe(false);
    expect(s.xg).toBeCloseTo(0.5, 5);
  });

  it("respects the snapEnabled=false toggle (sim A/B baseline)", () => {
    const s = makeState({ xg: 0.5 });
    const out = takeShot(s, { round: 1, rng: fixedRng(0.0), xgRound: 0.6, snapEnabled: false });
    expect(out.took).toBe(false);
  });
});
