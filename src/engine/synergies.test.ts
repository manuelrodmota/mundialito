import { describe, it, expect } from "vitest";
import { computeSynergies } from "./synergies.ts";
import type { CardInPlay, PlayerCard } from "./types.ts";

function makePlayerCard(
  overrides: Partial<PlayerCard> & Pick<PlayerCard, "id" | "nation" | "position">,
): PlayerCard {
  return {
    type: "player",
    name: overrides.id,
    worldCup: 2022,
    overall: 80,
    atk: 70,
    def: 70,
    cost: 3,
    rarity: "common",
    slots: 1,
    ...overrides,
  };
}

function wrap(card: PlayerCard): CardInPlay {
  return { card, lane: "attack", statuses: [], faceDown: false };
}

describe("computeSynergies — Chemistry (3+ same nation)", () => {
  it("grants +2 ATK, +2 DEF when 3 players share a nation", () => {
    const cards = [
      wrap(makePlayerCard({ id: "a", nation: "Brazil", position: "FWD" })),
      wrap(makePlayerCard({ id: "b", nation: "Brazil", position: "MID" })),
      wrap(makePlayerCard({ id: "c", nation: "Brazil", position: "DEF" })),
    ];
    const d = computeSynergies(cards, "none");
    expect(d.atk).toBe(2);
    expect(d.def).toBe(2);
  });

  it("does NOT grant chemistry bonus with only 2 same-nation players", () => {
    const cards = [
      wrap(makePlayerCard({ id: "a", nation: "Brazil", position: "FWD" })),
      wrap(makePlayerCard({ id: "b", nation: "Brazil", position: "MID" })),
      wrap(makePlayerCard({ id: "c", nation: "Argentina", position: "DEF" })),
    ];
    const d = computeSynergies(cards, "none");
    expect(d.atk).toBe(0);
    expect(d.def).toBe(0);
  });
});

describe("computeSynergies — Strike Partnership (2+ FWD)", () => {
  it("grants +5 ATK for 2+ FWD cards", () => {
    const cards = [
      wrap(makePlayerCard({ id: "a", nation: "France", position: "FWD" })),
      wrap(makePlayerCard({ id: "b", nation: "Germany", position: "FWD" })),
    ];
    const d = computeSynergies(cards, "none");
    expect(d.atk).toBe(5);
    expect(d.def).toBe(0);
  });

  it("does not grant strike bonus with only 1 FWD", () => {
    const cards = [
      wrap(makePlayerCard({ id: "a", nation: "France", position: "FWD" })),
      wrap(makePlayerCard({ id: "b", nation: "France", position: "MID" })),
    ];
    const d = computeSynergies(cards, "none");
    expect(d.atk).toBe(0);
  });
});

describe("computeSynergies — Back Line (3+ DEF)", () => {
  it("grants +8 DEF for 3+ DEF cards", () => {
    const cards = [
      wrap(makePlayerCard({ id: "a", nation: "Italy", position: "DEF" })),
      wrap(makePlayerCard({ id: "b", nation: "Spain", position: "DEF" })),
      wrap(makePlayerCard({ id: "c", nation: "France", position: "DEF" })),
    ];
    const d = computeSynergies(cards, "none");
    expect(d.def).toBe(8);
  });

  it("does not grant back line bonus with only 2 DEF", () => {
    const cards = [
      wrap(makePlayerCard({ id: "a", nation: "Italy", position: "DEF" })),
      wrap(makePlayerCard({ id: "b", nation: "Spain", position: "DEF" })),
    ];
    const d = computeSynergies(cards, "none");
    expect(d.def).toBe(0);
  });
});

describe("computeSynergies — Midfield Engine (2+ MID)", () => {
  it("grants +1 stamina for 2+ MID cards", () => {
    const cards = [
      wrap(makePlayerCard({ id: "a", nation: "Brazil", position: "MID" })),
      wrap(makePlayerCard({ id: "b", nation: "Spain", position: "MID" })),
    ];
    const d = computeSynergies(cards, "none");
    expect(d.stamina).toBe(1);
    expect(d.atk).toBe(0);
    expect(d.def).toBe(0);
  });

  it("does not grant midfield bonus with 1 MID", () => {
    const cards = [
      wrap(makePlayerCard({ id: "a", nation: "Brazil", position: "MID" })),
    ];
    const d = computeSynergies(cards, "none");
    expect(d.stamina).toBe(0);
  });
});

describe("computeSynergies — Captain's Pride", () => {
  it("grants +2/+2 when captain is fielded alongside same-nation teammate", () => {
    const cards = [
      wrap(makePlayerCard({ id: "cap1", nation: "Brazil", position: "FWD" })),
      wrap(makePlayerCard({ id: "p2", nation: "Brazil", position: "MID" })),
      wrap(makePlayerCard({ id: "p3", nation: "Germany", position: "DEF" })),
    ];
    const d = computeSynergies(cards, "cap1");
    expect(d.atk).toBeGreaterThanOrEqual(2);
    expect(d.def).toBeGreaterThanOrEqual(2);
  });

  it("does not grant Captain's Pride when captain has no same-nation teammates", () => {
    const cards = [
      wrap(makePlayerCard({ id: "cap1", nation: "Brazil", position: "FWD" })),
      wrap(makePlayerCard({ id: "p2", nation: "Germany", position: "MID" })),
    ];
    const d = computeSynergies(cards, "cap1");
    expect(d.atk).toBe(0);
    expect(d.def).toBe(0);
  });

  it("does not grant Captain's Pride when captain is not on the board", () => {
    const cards = [
      wrap(makePlayerCard({ id: "a", nation: "Brazil", position: "FWD" })),
      wrap(makePlayerCard({ id: "b", nation: "Brazil", position: "MID" })),
    ];
    const d = computeSynergies(cards, "absent-captain");
    expect(d.atk).toBe(0);
    expect(d.def).toBe(0);
  });

  it("stacks Captain's Pride with Chemistry when captain + nation mates >=3", () => {
    const cards = [
      wrap(makePlayerCard({ id: "cap1", nation: "Brazil", position: "FWD" })),
      wrap(makePlayerCard({ id: "p2", nation: "Brazil", position: "MID" })),
      wrap(makePlayerCard({ id: "p3", nation: "Brazil", position: "DEF" })),
    ];
    const d = computeSynergies(cards, "cap1");
    expect(d.atk).toBe(2 + 2);
    expect(d.def).toBe(2 + 2);
  });
});
