import { describe, it, expect } from "vitest";
import { atkOf, defOf, laneStack, laneMultiplier, cardLaneMult, applyFormation, computeEffectiveStats } from "./effectiveStats.ts";
import type { CardInPlay, PlayerCard, PlayerState } from "./types.ts";

function makePlayerCard(overrides: Partial<PlayerCard> & Pick<PlayerCard, "id">): PlayerCard {
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
    rarity: "common",
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

describe("atkOf / defOf", () => {
  it("applies rarityMult=1.3 for legendary (95 ATK → 123.5)", () => {
    const card = wrap(makePlayerCard({ id: "leg", atk: 95, def: 80, rarity: "legendary" }));
    expect(atkOf(card)).toBeCloseTo(95 * 1.3, 4);
  });

  it("applies rarityMult=1.0 for common (70 ATK → 70)", () => {
    const card = wrap(makePlayerCard({ id: "com", atk: 70, def: 70, rarity: "common" }));
    expect(atkOf(card)).toBe(70);
  });

  it("returns 0 for a tactical card", () => {
    const tac: CardInPlay = {
      card: {
        id: "tac",
        type: "tactical",
        name: "VAR",
        category: "instant",
        cost: 2,
        slots: 1,
        rarity: "rare",
        effect: { kind: "var" },
      },
      lane: "attack",
      statuses: [],
      faceDown: false,
    };
    expect(atkOf(tac)).toBe(0);
    expect(defOf(tac)).toBe(0);
  });

  it("applies Injured status flat penalty to both ATK and DEF", () => {
    const card = wrap(makePlayerCard({ id: "inj", atk: 80, def: 80, rarity: "common" }));
    card.statuses.push({ kind: "injured", amount: 15 });
    expect(atkOf(card)).toBeCloseTo(65, 5);
    expect(defOf(card)).toBeCloseTo(65, 5);
  });

  it("does not let stat go below 0 (heavily injured)", () => {
    const card = wrap(makePlayerCard({ id: "inj2", atk: 10, def: 10, rarity: "common" }));
    card.statuses.push({ kind: "injured", amount: 50 });
    expect(atkOf(card)).toBe(0);
    expect(defOf(card)).toBe(0);
  });
});

describe("laneStack", () => {
  it("returns 0 for empty lane", () => {
    expect(laneStack([])).toBe(0);
  });

  it("first card gets full weight (×1.0)", () => {
    expect(laneStack([100])).toBe(100);
  });

  it("sorts descending before applying weights", () => {
    const result = laneStack([30, 100, 60]);
    expect(result).toBeCloseTo(100 * 1.0 + 60 * 0.85 + 30 * 0.7, 3);
  });

  it("5-card lane: 5th card contributes only weight=0.40", () => {
    const result = laneStack([100, 90, 80, 70, 60]);
    const expected = 100 * 1.0 + 90 * 0.85 + 80 * 0.70 + 70 * 0.55 + 60 * 0.40;
    expect(result).toBeCloseTo(expected, 3);
  });

  it("6-card lane: 6th contributes weight=0.25", () => {
    const result = laneStack([100, 90, 80, 70, 60, 50]);
    const expected = 100 * 1.0 + 90 * 0.85 + 80 * 0.70 + 70 * 0.55 + 60 * 0.40 + 50 * 0.25;
    expect(result).toBeCloseTo(expected, 3);
  });

  it("7+ cards: beyond index 5 contributes 0 (smallest value gets no weight)", () => {
    const seven = laneStack([100, 90, 80, 70, 60, 50, 1]);
    const six = laneStack([100, 90, 80, 70, 60, 50]);
    expect(seven).toBeCloseTo(six, 3);
  });
});

describe("applyFormation (WCC-008)", () => {
  it("offensive: ATK ×1.18, DEF ×0.82 (v10.1 softened)", () => {
    const r = applyFormation(100, 100, "offensive");
    expect(r.atk).toBeCloseTo(118, 4);
    expect(r.def).toBeCloseTo(82, 4);
  });

  it("balanced: both ×1.0 (identity)", () => {
    const r = applyFormation(100, 100, "balanced");
    expect(r.atk).toBe(100);
    expect(r.def).toBe(100);
  });

  it("defensive: ATK ×0.82, DEF ×1.18 (v10.1 softened)", () => {
    const r = applyFormation(100, 100, "defensive");
    expect(r.atk).toBeCloseTo(82, 4);
    expect(r.def).toBeCloseTo(118, 4);
  });
});

describe("computeEffectiveStats integration", () => {
  it("empty board returns 0 ATK and 0 DEF", () => {
    const s = makeState();
    const { atkEff, defEff } = computeEffectiveStats(s);
    expect(atkEff).toBe(0);
    expect(defEff).toBe(0);
  });

  it("single common ATK card with balanced formation and 0 fatigue", () => {
    const card = wrap(makePlayerCard({ id: "p1", atk: 70, def: 70, rarity: "common" }));
    card.lane = "attack";
    const s = makeState({ board: { attack: [card], defense: [] } });
    const { atkEff } = computeEffectiveStats(s);
    expect(atkEff).toBeCloseTo(70, 4);
  });

  it("fatigue reduces DEF", () => {
    const def = wrap(makePlayerCard({ id: "p1", atk: 70, def: 80, rarity: "common" }));
    def.lane = "defense";
    const s = makeState({ fatigue: 30, board: { attack: [], defense: [def] } });
    const { defEff } = computeEffectiveStats(s);
    expect(defEff).toBeCloseTo(80 * 0.5, 4);
  });

  it("offensive formation boosts ATK and reduces DEF", () => {
    const atkCard = wrap(makePlayerCard({ id: "a", atk: 100, def: 80, rarity: "common" }));
    atkCard.lane = "attack";
    const defCard = wrap(makePlayerCard({ id: "d", atk: 80, def: 100, rarity: "common" }));
    defCard.lane = "defense";
    const s = makeState({
      formation: "offensive",
      board: { attack: [atkCard], defense: [defCard] },
    });
    const { atkEff, defEff } = computeEffectiveStats(s);
    expect(atkEff).toBeCloseTo(100 * 1.18, 4);
    expect(defEff).toBeCloseTo(100 * 0.82, 4);
  });
});

describe("v11 lane force-multiplier", () => {
  it("a LONE star gets no multiplier (alone it would just inflate its own stat)", () => {
    const leg = wrap(makePlayerCard({ id: "leg", atk: 90, rarity: "legendary" }));
    expect(laneMultiplier([leg])).toBe(1);
    const s = makeState({ board: { attack: [leg], defense: [] } });
    expect(computeEffectiveStats(s).atkEff).toBeCloseTo(90, 4); // base, no ×1.3
  });

  it("a paired star lifts the WHOLE lane by its tier (incl. its lanemate)", () => {
    const leg = wrap(makePlayerCard({ id: "leg", atk: 90, rarity: "legendary" }));
    const com = wrap(makePlayerCard({ id: "com", atk: 70, rarity: "common" }));
    expect(laneMultiplier([leg, com])).toBeCloseTo(1.3, 5);
    const s = makeState({ board: { attack: [leg, com], defense: [] } });
    // base lane stack (90 ×1.0 + 70 ×0.85) then ×1.3 — the common rides the legendary's boost.
    expect(computeEffectiveStats(s).atkEff).toBeCloseTo((90 + 70 * 0.85) * 1.3, 4);
  });

  it("with multiple stars the highest tier wins", () => {
    const epic = wrap(makePlayerCard({ id: "e", rarity: "epic" }));
    const rare = wrap(makePlayerCard({ id: "r", rarity: "rare" }));
    expect(laneMultiplier([epic, rare])).toBeCloseTo(1.2, 5);
  });

  it("a GOLD goalkeeper (overall ≥87) anchors at ×1.3 even in the epic band; outfielders don't", () => {
    const goldGk = makePlayerCard({ id: "gk", position: "GK", overall: 88, rarity: "epic" });
    const goldFwd = makePlayerCard({ id: "fw", position: "FWD", overall: 88, rarity: "epic" });
    expect(cardLaneMult(goldGk)).toBeCloseTo(1.3, 5);
    expect(cardLaneMult(goldFwd)).toBeCloseTo(1.2, 5);
    // A sub-gold keeper stays on its rarity.
    expect(cardLaneMult(makePlayerCard({ id: "gk2", position: "GK", overall: 85, rarity: "rare" }))).toBeCloseTo(1.1, 5);
  });
});
