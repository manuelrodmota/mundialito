import { describe, it, expect } from "vitest";
import { laneStamina, validLineup } from "./validateLineup.ts";
import type { Card, CardInPlay, PlayerCard, PlayerState } from "./types.ts";

function makePlayerCard(overrides: Partial<PlayerCard> & Pick<PlayerCard, "id" | "rarity">): PlayerCard {
  return {
    type: "player",
    name: overrides.id,
    nation: "Brazil",
    worldCup: 2022,
    position: "MID",
    overall: 80,
    atk: 70,
    def: 70,
    cost: 2,
    slots: 1,
    ...overrides,
  };
}

function wrap(card: PlayerCard): CardInPlay {
  return { card, lane: "attack", statuses: [], faceDown: false };
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

describe("laneStamina", () => {
  it("returns 0 for empty lane", () => {
    expect(laneStamina([])).toBe(0);
  });

  it("all-common lane: no discount (full COST_BY_RARITY)", () => {
    const cards: Card[] = [
      makePlayerCard({ id: "c1", rarity: "common" }),
      makePlayerCard({ id: "c2", rarity: "common" }),
    ];
    expect(laneStamina(cards)).toBe(2 + 2);
  });

  it("legendary anchor + two commons: anchor pays 4, commons pay max(1, floor(2*0.5))=1 each", () => {
    const cards: Card[] = [
      makePlayerCard({ id: "leg", rarity: "legendary" }),
      makePlayerCard({ id: "c1", rarity: "common" }),
      makePlayerCard({ id: "c2", rarity: "common" }),
    ];
    expect(laneStamina(cards)).toBe(4 + 1 + 1);
  });

  it("GDD DoD example: legendary anchor ATK + two commons + common in another lane", () => {
    const atkLane: Card[] = [
      makePlayerCard({ id: "leg", rarity: "legendary" }),
      makePlayerCard({ id: "c1", rarity: "common" }),
      makePlayerCard({ id: "c2", rarity: "common" }),
    ];
    const defLane: Card[] = [
      makePlayerCard({ id: "c3", rarity: "common" }),
    ];
    const atkCost = laneStamina(atkLane);
    const defCost = laneStamina(defLane);
    expect(atkCost + defCost).toBe(4 + 1 + 1 + 2);
  });

  it("epic anchor: pays 3, rare non-anchor pays max(1, floor(2*0.5))=1", () => {
    const cards: Card[] = [
      makePlayerCard({ id: "ep", rarity: "epic" }),
      makePlayerCard({ id: "r1", rarity: "rare" }),
    ];
    expect(laneStamina(cards)).toBe(3 + 1);
  });
});

describe("validLineup", () => {
  it("accepts a lineup within cap and stamina (R1)", () => {
    const atkCards = [
      wrap(makePlayerCard({ id: "l1", rarity: "legendary" })),
      wrap(makePlayerCard({ id: "c1", rarity: "common" })),
    ];
    const defCards = [
      wrap(makePlayerCard({ id: "c2", rarity: "common" })),
    ];
    const s = makeState({ board: { attack: atkCards, defense: defCards }, stamina: 8 });
    expect(validLineup(s, 1)).toBe(true);
  });

  it("rejects lineup over card cap (5 player cards at R1 where cap=4)", () => {
    const atkCards = Array.from({ length: 3 }, (_, i) =>
      wrap(makePlayerCard({ id: `a${i}`, rarity: "common" })),
    );
    const defCards = Array.from({ length: 2 }, (_, i) =>
      wrap(makePlayerCard({ id: `d${i}`, rarity: "common" })),
    );
    const s = makeState({ board: { attack: atkCards, defense: defCards }, stamina: 20 });
    expect(validLineup(s, 1)).toBe(false);
  });

  it("rejects lineup over stamina budget", () => {
    const atkCards = [
      wrap(makePlayerCard({ id: "l1", rarity: "legendary" })),
      wrap(makePlayerCard({ id: "l2", rarity: "legendary" })),
    ];
    const s = makeState({ board: { attack: atkCards, defense: [] }, stamina: 5 });
    expect(validLineup(s, 1)).toBe(false);
  });

  it("accepts exactly 4 common cards within 8 stamina at R1", () => {
    const atkCards = [
      wrap(makePlayerCard({ id: "c1", rarity: "common" })),
      wrap(makePlayerCard({ id: "c2", rarity: "common" })),
    ];
    const defCards = [
      wrap(makePlayerCard({ id: "c3", rarity: "common" })),
      wrap(makePlayerCard({ id: "c4", rarity: "common" })),
    ];
    const s = makeState({ board: { attack: atkCards, defense: defCards }, stamina: 8 });
    expect(validLineup(s, 1)).toBe(true);
  });

  it("card cap increases at R6: 5 cards is valid", () => {
    const atkCards = Array.from({ length: 3 }, (_, i) =>
      wrap(makePlayerCard({ id: `a${i}`, rarity: "common" })),
    );
    const defCards = Array.from({ length: 2 }, (_, i) =>
      wrap(makePlayerCard({ id: `d${i}`, rarity: "common" })),
    );
    const s = makeState({ board: { attack: atkCards, defense: defCards }, stamina: 10 });
    expect(validLineup(s, 6)).toBe(true);
  });
});
