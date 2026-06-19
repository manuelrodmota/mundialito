import { describe, it, expect } from "vitest";
import { updateMomentum, resetMomentum } from "./momentum.ts";
import type { CardInPlay, PlayerCard, PlayerState } from "./types.ts";

function makePlayerCard(id: string): PlayerCard {
  return {
    id,
    type: "player",
    name: id,
    nation: "Brazil",
    worldCup: 2022,
    position: "FWD",
    overall: 80,
    atk: 70,
    def: 70,
    cost: 2,
    rarity: "common",
    slots: 1,
  };
}

function wrapCard(id: string): CardInPlay {
  return { card: makePlayerCard(id), lane: "attack", statuses: [], faceDown: false };
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

describe("updateMomentum — scoring trigger", () => {
  it("scoring immediately grants On Form on the first attacker", () => {
    const s = makeState({ board: { attack: [wrapCard("p1")], defense: [] } });
    updateMomentum(s, true);
    const firstAtk = s.board.attack[0]!;
    expect(firstAtk.statuses.some((st) => st.kind === "onform")).toBe(true);
  });

  it("scoring resets the momentum streak counter", () => {
    const s = makeState({
      momentum: 2,
      board: { attack: [wrapCard("p1")], defense: [] },
    });
    updateMomentum(s, true);
    expect(s.momentum).toBe(0);
  });

  it("On Form status has amount=0.10 and duration=1", () => {
    const s = makeState({ board: { attack: [wrapCard("p1")], defense: [] } });
    updateMomentum(s, true);
    const onForm = s.board.attack[0]!.statuses.find((st) => st.kind === "onform");
    expect(onForm?.amount).toBeCloseTo(0.1, 5);
    expect(onForm?.duration).toBe(1);
  });
});

describe("updateMomentum — high-pressure streak", () => {
  it("increments streak on attack-heavy round", () => {
    const s = makeState({
      board: {
        attack: [wrapCard("p1"), wrapCard("p2")],
        defense: [],
      },
    });
    updateMomentum(s, false);
    expect(s.momentum).toBe(1);
  });

  it("resets streak on non-attack-heavy round", () => {
    const s = makeState({
      momentum: 2,
      board: { attack: [wrapCard("p1")], defense: [wrapCard("p2"), wrapCard("p3")] },
    });
    updateMomentum(s, false);
    expect(s.momentum).toBe(0);
  });

  it("grants On Form after 3 consecutive high-pressure rounds and resets counter", () => {
    const s = makeState({
      momentum: 2,
      board: { attack: [wrapCard("p1"), wrapCard("p2")], defense: [] },
    });
    updateMomentum(s, false);
    expect(s.momentum).toBe(0);
    const onFormApplied = s.board.attack[0]!.statuses.some((st) => st.kind === "onform");
    expect(onFormApplied).toBe(true);
  });

  it("On Form bonus from streak is applied exactly once (single-shot)", () => {
    const s = makeState({
      momentum: 2,
      board: { attack: [wrapCard("p1"), wrapCard("p2")], defense: [] },
    });
    updateMomentum(s, false);
    const count = s.board.attack[0]!.statuses.filter((st) => st.kind === "onform").length;
    expect(count).toBe(1);
  });
});

describe("resetMomentum", () => {
  it("resets the momentum streak counter to 0", () => {
    const s = makeState({ momentum: 2 });
    resetMomentum(s);
    expect(s.momentum).toBe(0);
  });
});
