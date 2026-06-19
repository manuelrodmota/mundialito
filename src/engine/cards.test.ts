import { describe, it, expect } from "vitest";
import { drawToHand, refreshStamina, routeCard, returnLockedToDrawPile, buildOpeningHand, isPremium, isCommonPlayer } from "./cards.ts";
import { makeRng } from "./rng.ts";
import type { PlayerState, PlayerCard, TacticalCard } from "./types.ts";

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

function makeTactical(id: string, category: TacticalCard["category"] = "skill"): TacticalCard {
  return {
    id,
    type: "tactical",
    name: id,
    category,
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

describe("isPremium / isCommonPlayer", () => {
  it("common player is not premium", () => {
    const c = makePlayerCard({ id: "c", rarity: "common" });
    expect(isPremium(c)).toBe(false);
    expect(isCommonPlayer(c)).toBe(true);
  });

  it("legendary player is premium", () => {
    const c = makePlayerCard({ id: "l", rarity: "legendary" });
    expect(isPremium(c)).toBe(true);
    expect(isCommonPlayer(c)).toBe(false);
  });

  it("tactical is neither premium nor common player", () => {
    const t = makeTactical("t1");
    expect(isPremium(t)).toBe(false);
    expect(isCommonPlayer(t)).toBe(false);
  });
});

describe("drawToHand", () => {
  it("draws up to HAND_SIZE (5) from draw pile", () => {
    const cards = Array.from({ length: 8 }, (_, i) =>
      makePlayerCard({ id: `p${i}`, rarity: "common" }),
    );
    const s = makeState({ drawPile: cards });
    const rng = makeRng(42);
    drawToHand(s, rng);
    expect(s.hand).toHaveLength(5);
    expect(s.drawPile).toHaveLength(3);
  });

  it("reshuffles discard into draw when draw pile empties mid-draw", () => {
    const drawCards = [makePlayerCard({ id: "d1", rarity: "common" })];
    const discardCards = [
      makePlayerCard({ id: "dc1", rarity: "common" }),
      makePlayerCard({ id: "dc2", rarity: "common" }),
      makePlayerCard({ id: "dc3", rarity: "common" }),
      makePlayerCard({ id: "dc4", rarity: "common" }),
    ];
    const s = makeState({ drawPile: drawCards, discard: discardCards });
    const rng = makeRng(42);
    drawToHand(s, rng);
    expect(s.hand).toHaveLength(5);
    expect(s.discard).toHaveLength(0);
  });

  it("does not exceed HAND_SIZE if already at 5", () => {
    const cards = Array.from({ length: 5 }, (_, i) =>
      makePlayerCard({ id: `p${i}`, rarity: "common" }),
    );
    const s = makeState({ hand: cards, drawPile: [makePlayerCard({ id: "extra", rarity: "common" })] });
    const rng = makeRng(42);
    drawToHand(s, rng);
    expect(s.hand).toHaveLength(5);
  });

  it("stops gracefully when both draw and discard are empty", () => {
    const s = makeState();
    const rng = makeRng(42);
    drawToHand(s, rng);
    expect(s.hand).toHaveLength(0);
  });
});

describe("refreshStamina", () => {
  it("sets stamina to 8 at round 5", () => {
    const s = makeState();
    refreshStamina(s, 5);
    expect(s.stamina).toBe(8);
    expect(s.maxStamina).toBe(8);
  });

  it("sets stamina to 10 at round 6", () => {
    const s = makeState();
    refreshStamina(s, 6);
    expect(s.stamina).toBe(10);
  });

  it("sets stamina to 12 at round 9", () => {
    const s = makeState();
    refreshStamina(s, 9);
    expect(s.stamina).toBe(12);
  });

  it("applies pending tacticBonus and then clears it", () => {
    const s = makeState({ tacticBonus: 2 });
    refreshStamina(s, 1);
    expect(s.stamina).toBe(10);
    expect(s.tacticBonus).toBe(0);
  });
});

describe("routeCard", () => {
  it("routes common player to discard", () => {
    const s = makeState();
    const c = makePlayerCard({ id: "c1", rarity: "common" });
    routeCard(s, c);
    expect(s.discard).toContain(c);
    expect(s.locked).toHaveLength(0);
  });

  it("routes premium player to locked", () => {
    const s = makeState();
    const c = makePlayerCard({ id: "l1", rarity: "legendary" });
    routeCard(s, c);
    expect(s.locked).toContain(c);
    expect(s.discard).toHaveLength(0);
  });

  it("routes skill tactical to exiled", () => {
    const s = makeState();
    const t = makeTactical("t1", "skill");
    routeCard(s, t);
    expect(s.exiled).toContain(t);
    expect(s.powers).toHaveLength(0);
  });

  it("routes instant tactical to exiled", () => {
    const s = makeState();
    const t = makeTactical("t1", "instant");
    routeCard(s, t);
    expect(s.exiled).toContain(t);
  });

  it("routes power tactical to powers list", () => {
    const s = makeState();
    const t = makeTactical("t1", "power");
    routeCard(s, t);
    expect(s.powers).toContain(t);
    expect(s.exiled).toHaveLength(0);
  });
});

describe("returnLockedToDrawPile", () => {
  it("moves locked cards into draw pile and clears locked", () => {
    const locked = [
      makePlayerCard({ id: "l1", rarity: "legendary" }),
      makePlayerCard({ id: "l2", rarity: "epic" }),
    ];
    const s = makeState({ locked });
    const rng = makeRng(42);
    returnLockedToDrawPile(s, rng);
    expect(s.locked).toHaveLength(0);
    expect(s.drawPile).toHaveLength(2);
  });

  it("does nothing when locked is empty", () => {
    const s = makeState();
    const rng = makeRng(42);
    returnLockedToDrawPile(s, rng);
    expect(s.drawPile).toHaveLength(0);
  });
});

describe("buildOpeningHand", () => {
  it("builds a 5-card hand with captain included", () => {
    const captainCard = makePlayerCard({ id: "cap", rarity: "legendary" });
    const otherCards = Array.from({ length: 8 }, (_, i) =>
      makePlayerCard({ id: `p${i}`, rarity: "common" }),
    );
    const s = makeState({
      captainId: "cap",
      drawPile: [captainCard, ...otherCards],
    });
    const rng = makeRng(42);
    buildOpeningHand(s, rng);
    expect(s.hand).toHaveLength(5);
    const captainInHand = s.hand.some((c) => c.id === "cap");
    expect(captainInHand).toBe(true);
  });
});
