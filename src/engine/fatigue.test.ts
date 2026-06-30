import { describe, it, expect } from "vitest";
import { applyFatiguePenalty, fatigueDelta, resetFatigue, updateFatigue, recoverFatigueAtHalftime } from "./fatigue.ts";
import type { PlayerState, CardInPlay, PlayerCard } from "./types.ts";

function makeCardInPlay(): CardInPlay {
  const card: PlayerCard = {
    id: "p1",
    type: "player",
    name: "Player",
    nation: "Spain",
    worldCup: 2022,
    position: "DEF",
    overall: 70,
    atk: 60,
    def: 70,
    cost: 2,
    rarity: "common",
    slots: 1,
  };
  return { card, lane: "defense", statuses: [], faceDown: false };
}

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

describe("applyFatiguePenalty", () => {
  it("returns full DEF at F=0 (identity)", () => {
    expect(applyFatiguePenalty(100, 0)).toBe(100);
  });

  it("applies ×0.75 at F=15", () => {
    expect(applyFatiguePenalty(100, 15)).toBeCloseTo(75, 5);
  });

  it("applies ×0.50 at F=30 (max penalty)", () => {
    expect(applyFatiguePenalty(100, 30)).toBeCloseTo(50, 5);
  });
});

describe("fatigueDelta", () => {
  it("is positive when defense-heavy (more DEF cards than ATK)", () => {
    const defense = [makeCardInPlay(), makeCardInPlay()];
    const attack: CardInPlay[] = [];
    const delta = fatigueDelta(attack, defense, 0);
    expect(delta).toBeGreaterThan(0);
  });

  it("is negative when attack-heavy (more ATK cards than DEF)", () => {
    const attack = [makeCardInPlay(), makeCardInPlay()];
    const defense: CardInPlay[] = [];
    const delta = fatigueDelta(attack, defense, 5);
    expect(delta).toBeLessThan(0);
  });

  it("costs a little when balanced (an even split is no longer a free ride)", () => {
    const attack = [makeCardInPlay()];
    const defense = [makeCardInPlay()];
    const delta = fatigueDelta(attack, defense, 10); // balanced formation default → +2
    expect(delta).toBe(2);
  });

  it("is zero when the board is fully empty (idle — no cards fielded)", () => {
    const delta = fatigueDelta([], [], 10);
    expect(delta).toBe(0);
  });

  it("balanced cost scales with formation (offensive < balanced < defensive)", () => {
    const attack = [makeCardInPlay()];
    const defense = [makeCardInPlay()];
    expect(fatigueDelta(attack, defense, 10, 1, "offensive")).toBe(1); // 2 × 0.5
    expect(fatigueDelta(attack, defense, 10, 1, "balanced")).toBe(2);
    expect(fatigueDelta(attack, defense, 10, 1, "defensive")).toBe(3); // 2 × 1.5
  });

  it("clamps: delta is reduced when fatigue would exceed FATIGUE_MAX", () => {
    const defense = [makeCardInPlay(), makeCardInPlay()];
    const attack: CardInPlay[] = [];
    const delta = fatigueDelta(attack, defense, 30);
    expect(delta).toBe(0);
  });

  it("clamps: delta is reduced when fatigue would go below 0", () => {
    const attack = [makeCardInPlay(), makeCardInPlay()];
    const defense: CardInPlay[] = [];
    const delta = fatigueDelta(attack, defense, 0);
    expect(delta).toBe(0);
  });

  it("ramps up later in the match (defending tires faster in the 2nd half / ET)", () => {
    const defense = [makeCardInPlay(), makeCardInPlay()];
    const early = fatigueDelta([], defense, 0, 3, "balanced"); // R1–4 → +4
    const mid = fatigueDelta([], defense, 0, 5, "balanced"); // R5–6 → +5
    const late = fatigueDelta([], defense, 0, 7, "balanced"); // R7–8/ET → +6
    expect(early).toBe(4);
    expect(mid).toBe(5);
    expect(late).toBe(6);
  });

  it("scales with formation: defensive tires much more, offensive barely tires", () => {
    const defense = [makeCardInPlay(), makeCardInPlay()];
    const offensive = fatigueDelta([], defense, 0, 1, "offensive"); // 4 × 0.5 → 2
    const balanced = fatigueDelta([], defense, 0, 1, "balanced"); // 4 × 1.0 → 4
    const defensive = fatigueDelta([], defense, 0, 1, "defensive"); // 4 × 1.5 → 6
    expect(offensive).toBeLessThan(balanced);
    expect(defensive).toBeGreaterThan(balanced);
    expect(offensive).toBe(2);
    expect(defensive).toBe(6);
  });
});

describe("recoverFatigueAtHalftime", () => {
  it("recovers only part of fatigue (carries the rest into the 2nd half)", () => {
    const s = makeState({ fatigue: 20 });
    recoverFatigueAtHalftime(s);
    expect(s.fatigue).toBeGreaterThan(0); // not a full wipe
    expect(s.fatigue).toBeLessThan(20); // but some is shaken off
    expect(s.fatigue).toBe(12); // 20 × (1 − 0.4)
  });

  it("leaves zero fatigue at zero", () => {
    const s = makeState({ fatigue: 0 });
    recoverFatigueAtHalftime(s);
    expect(s.fatigue).toBe(0);
  });
});

describe("resetFatigue", () => {
  it("resets fatigue to 0 (full reset)", () => {
    const s = makeState({ fatigue: 20 });
    resetFatigue(s);
    expect(s.fatigue).toBe(0);
  });

  it("resets fatigue to 0 (extra time entry)", () => {
    const s = makeState({ fatigue: 30 });
    resetFatigue(s);
    expect(s.fatigue).toBe(0);
  });

  it("resets fatigue to 0 (Water Break tactical)", () => {
    const s = makeState({ fatigue: 15 });
    resetFatigue(s);
    expect(s.fatigue).toBe(0);
  });
});

describe("updateFatigue", () => {
  it("increases fatigue when defending", () => {
    const defense = [makeCardInPlay(), makeCardInPlay()];
    const s = makeState({ board: { attack: [], defense } });
    const before = s.fatigue;
    updateFatigue(s);
    expect(s.fatigue).toBeGreaterThan(before);
  });

  it("decreases fatigue when attacking (with non-zero starting fatigue)", () => {
    const attack = [makeCardInPlay(), makeCardInPlay()];
    const s = makeState({ fatigue: 10, board: { attack, defense: [] } });
    updateFatigue(s);
    expect(s.fatigue).toBeLessThan(10);
  });
});
