import { describe, it, expect } from "vitest";
import { commitCard, revealBoards, intentOf, clearBoard } from "./board.ts";
import type { PlayerCard, PlayerState, TacticalCard } from "./types.ts";

function makePlayerCard(id: string): PlayerCard {
  return {
    id,
    type: "player",
    name: id,
    nation: "Brazil",
    worldCup: 2022,
    position: "MID",
    overall: 80,
    atk: 70,
    def: 70,
    cost: 2,
    rarity: "common",
    slots: 1,
  };
}

function makeTactical(id: string): TacticalCard {
  return {
    id,
    type: "tactical",
    name: id,
    category: "skill",
    cost: 1,
    slots: 1,
    rarity: "rare",
    effect: { kind: "tikiTaka" },
  };
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

describe("commitCard", () => {
  it("commits a player card face-down to the attack lane", () => {
    const card = makePlayerCard("p1");
    const s = makeState({ hand: [card] });
    const cip = commitCard(s, card, "attack");
    expect(cip.faceDown).toBe(true);
    expect(s.board.attack).toHaveLength(1);
    expect(s.hand).toHaveLength(0);
  });

  it("commits a tactical card face-up", () => {
    const tac = makeTactical("t1");
    const s = makeState({ hand: [tac] });
    const cip = commitCard(s, tac, "attack");
    expect(cip.faceDown).toBe(false);
    expect(s.board.attack).toHaveLength(1);
  });

  it("commits a player card to the defense lane", () => {
    const card = makePlayerCard("p1");
    const s = makeState({ hand: [card] });
    commitCard(s, card, "defense");
    expect(s.board.defense).toHaveLength(1);
    expect(s.board.attack).toHaveLength(0);
  });
});

describe("revealBoards", () => {
  it("flips all face-down player cards to face-up on both sides simultaneously", () => {
    const p1 = makePlayerCard("p1");
    const p2 = makePlayerCard("p2");
    const s0 = makeState({ hand: [p1] });
    const s1 = makeState({ hand: [p2] });
    commitCard(s0, p1, "attack");
    commitCard(s1, s1.hand[0]!, "defense");

    expect(s0.board.attack[0]!.faceDown).toBe(true);
    expect(s1.board.defense[0]!.faceDown).toBe(true);

    revealBoards(s0, s1);

    expect(s0.board.attack[0]!.faceDown).toBe(false);
    expect(s1.board.defense[0]!.faceDown).toBe(false);
  });
});

describe("intentOf", () => {
  it("exposes formation, card count, and staminaSpent — not card identities", () => {
    const card = makePlayerCard("secret-player");
    const s = makeState({ hand: [card], maxStamina: 8, stamina: 6 });
    commitCard(s, card, "attack");

    const intent = intentOf(s);
    expect(intent.formation).toBe("balanced");
    expect(intent.cardCount).toBe(1);
    expect(intent.visibleTacticals).toHaveLength(0);
  });

  it("includes face-up tacticals in visibleTacticals", () => {
    const tac = makeTactical("tac1");
    const s = makeState({ hand: [tac] });
    commitCard(s, tac, "attack");

    const intent = intentOf(s);
    expect(intent.visibleTacticals).toHaveLength(1);
    expect(intent.visibleTacticals[0]!.id).toBe("tac1");
  });

  it("does not expose card identities of face-down player cards", () => {
    const card = makePlayerCard("secret-id");
    const s = makeState({ hand: [card] });
    commitCard(s, card, "attack");

    const intent = intentOf(s);
    const intentStr = JSON.stringify(intent);
    expect(intentStr).not.toContain("secret-id");
  });
});

describe("clearBoard", () => {
  it("removes all cards from both lanes", () => {
    const p1 = makePlayerCard("p1");
    const p2 = makePlayerCard("p2");
    const s = makeState({ hand: [p1, p2] });
    commitCard(s, p1, "attack");
    commitCard(s, p2, "defense");
    clearBoard(s);
    expect(s.board.attack).toHaveLength(0);
    expect(s.board.defense).toHaveLength(0);
  });
});
