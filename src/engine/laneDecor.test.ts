import { describe, it, expect } from "vitest";
import { laneDecor, laneFx, laneStack } from "./effectiveStats.ts";
import { laneStamina } from "./validateLineup.ts";
import { RARITY_MULT } from "./constants.ts";
import type { PlayerCard } from "./types.ts";

function makePlayerCard(
  overrides: Partial<PlayerCard> & Pick<PlayerCard, "id" | "rarity">,
): PlayerCard {
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

describe("laneDecor", () => {
  it("returns [] for an empty lane", () => {
    expect(laneDecor([], "attack")).toEqual([]);
  });

  it("ranks contributions high→low and assigns STACK_WEIGHTS in that order", () => {
    const cards = [
      makePlayerCard({ id: "weak", rarity: "common", atk: 60 }),
      makePlayerCard({ id: "strong", rarity: "common", atk: 90 }),
    ];
    const decor = laneDecor(cards, "attack");
    // Returned in original order; the stronger card earns rank 0 (×1.00).
    expect(decor[0].rank).toBe(1);
    expect(decor[0].weight).toBe(0.85);
    expect(decor[1].rank).toBe(0);
    expect(decor[1].weight).toBe(1.0);
  });

  it("uses the defense stat for a defense lane", () => {
    const cards = [
      makePlayerCard({ id: "a", rarity: "common", atk: 90, def: 50 }),
      makePlayerCard({ id: "b", rarity: "common", atk: 50, def: 90 }),
    ];
    const decor = laneDecor(cards, "defense");
    expect(decor[0].contrib).toBe(50); // def, not atk
    expect(decor[1].contrib).toBe(90);
    expect(decor[1].rank).toBe(0); // b is the bigger DEF contributor
  });

  it("all-common lane: no star-core discount (everyone pays base, coreRole null)", () => {
    const cards = [
      makePlayerCard({ id: "c1", rarity: "common" }),
      makePlayerCard({ id: "c2", rarity: "common" }),
      makePlayerCard({ id: "c3", rarity: "common" }),
    ];
    const decor = laneDecor(cards, "attack");
    for (const d of decor) {
      expect(d.coreRole).toBeNull();
      expect(d.payCost).toBe(d.base); // base = COST_BY_RARITY.common = 2
      expect(d.base).toBe(2);
    }
  });

  it("premium-anchored lane: costliest is the anchor, others are half-price (min 1)", () => {
    const cards = [
      makePlayerCard({ id: "leg", rarity: "legendary" }), // base 4
      makePlayerCard({ id: "com", rarity: "common" }), // base 2 → support → max(1, floor(1)) = 1
    ];
    const decor = laneDecor(cards, "attack");
    expect(decor[0].coreRole).toBe("anchor");
    expect(decor[0].payCost).toBe(4); // anchor pays full
    expect(decor[1].coreRole).toBe("support");
    expect(decor[1].payCost).toBe(1); // floor(2 * 0.5) = 1
  });

  it("anchor tie-break keeps the first costliest card (rare support pays floor)", () => {
    const cards = [
      makePlayerCard({ id: "leg1", rarity: "legendary" }), // base 4 — first max → anchor
      makePlayerCard({ id: "leg2", rarity: "legendary" }), // base 4 — support → floor(4*0.5)=2
    ];
    const decor = laneDecor(cards, "attack");
    expect(decor[0].coreRole).toBe("anchor");
    expect(decor[1].coreRole).toBe("support");
    expect(decor[1].payCost).toBe(2);
  });

  it("a lone premium has nothing to discount (coreRole null at length 1)", () => {
    const decor = laneDecor([makePlayerCard({ id: "solo", rarity: "legendary" })], "attack");
    expect(decor[0].coreRole).toBeNull();
    expect(decor[0].payCost).toBe(decor[0].base);
  });

  it("payCost total matches laneStamina (no drift from resolution)", () => {
    const cards = [
      makePlayerCard({ id: "leg", rarity: "legendary" }),
      makePlayerCard({ id: "epic", rarity: "epic" }),
      makePlayerCard({ id: "com", rarity: "common" }),
    ];
    const decorTotal = laneDecor(cards, "attack").reduce((s, d) => s + d.payCost, 0);
    expect(decorTotal).toBe(laneStamina(cards));
  });

  it("effContrib sum matches laneStack (no drift from resolution)", () => {
    const cards = [
      makePlayerCard({ id: "a", rarity: "epic", atk: 88 }),
      makePlayerCard({ id: "b", rarity: "rare", atk: 75 }),
      makePlayerCard({ id: "c", rarity: "common", atk: 70 }),
    ];
    const decorEff = laneDecor(cards, "attack").reduce((s, d) => s + d.effContrib, 0);
    const raw = cards.map((c) => c.atk * RARITY_MULT[c.rarity]);
    expect(decorEff).toBeCloseTo(laneStack(raw), 6);
  });
});

describe("laneFx", () => {
  it("returns null for fewer than 2 cards", () => {
    expect(laneFx([], "attack")).toBeNull();
    expect(laneFx([makePlayerCard({ id: "x", rarity: "common" })], "attack")).toBeNull();
  });

  it("reports the diminishing-returns loss % for a stacked common lane", () => {
    const cards = [
      makePlayerCard({ id: "c1", rarity: "common", atk: 70 }),
      makePlayerCard({ id: "c2", rarity: "common", atk: 70 }),
    ];
    // raw = 140, eff = 70 + 70*0.85 = 129.5 → loss = 1 - 0.925 = 7.5%
    // (Math.round of the IEEE-754 result 7.4999… is 7 — matches the design formula exactly.)
    const fx = laneFx(cards, "attack")!;
    expect(fx.lossPct).toBe(7);
    expect(fx.starcore).toBe(false);
    expect(fx.saved).toBe(0);
  });

  it("reports star-core savings and the anchor flag", () => {
    const cards = [
      makePlayerCard({ id: "leg", rarity: "legendary", atk: 90 }),
      makePlayerCard({ id: "com", rarity: "common", atk: 70 }),
    ];
    const fx = laneFx(cards, "attack")!;
    expect(fx.starcore).toBe(true);
    expect(fx.saved).toBe(1); // common: base 2 → pays 1
    expect(fx.lossPct).toBeGreaterThan(0);
  });

  it("both levers can be active in the same lane", () => {
    const cards = [
      makePlayerCard({ id: "leg", rarity: "legendary", atk: 90 }),
      makePlayerCard({ id: "epic", rarity: "epic", atk: 85 }),
      makePlayerCard({ id: "com", rarity: "common", atk: 70 }),
    ];
    const fx = laneFx(cards, "attack")!;
    expect(fx.starcore).toBe(true);
    expect(fx.saved).toBeGreaterThan(0); // epic + common discounted
    expect(fx.lossPct).toBeGreaterThan(0); // 3 bodies → diminishing returns
  });
});
