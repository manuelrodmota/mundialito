import { describe, it, expect } from "vitest";
import {
  STAMINA,
  CARD_CAP,
  MERCY_LEAD,
  ET_ROUND_CAP,
  ET_XG_MULT,
  HAND_SIZE,
  TACTICALS_PER_HALF,
  RUN_TACTICAL_DECK_CAP,
  RARITY_MULT,
  COST_BY_RARITY,
  STACK_WEIGHTS,
  STAR_SYNERGY_DISCOUNT,
  XG_FLOOR,
  XG_SLOPE,
  XG_CAP,
  HALFTIME_ROUND,
  ROUND_CAP,
  FORMATIONS,
  CHEM_BONUS_ATK,
  CHEM_BONUS_DEF,
  STRIKE_BONUS_ATK,
  BACKLINE_BONUS_DEF,
  MIDFIELD_BONUS_STAMINA,
  CAPTAIN_PRIDE_ATK,
  CAPTAIN_PRIDE_DEF,
  FATIGUE_MAX,
  FATIGUE_DIV,
  COUNTER_ATTACK_XG,
  MOMENTUM_XG,
} from "./constants.ts";

describe("STAMINA", () => {
  it("returns 8 for rounds 1–5", () => {
    expect(STAMINA(1)).toBe(8);
    expect(STAMINA(5)).toBe(8);
  });

  it("returns 10 at R6 breakpoint through R8", () => {
    expect(STAMINA(6)).toBe(10);
    expect(STAMINA(8)).toBe(10);
  });

  it("returns 12 at R9 breakpoint and R10", () => {
    expect(STAMINA(9)).toBe(12);
    expect(STAMINA(10)).toBe(12);
  });
});

describe("CARD_CAP", () => {
  it("returns 4 for rounds 1–5", () => {
    expect(CARD_CAP(1)).toBe(4);
    expect(CARD_CAP(5)).toBe(4);
  });

  it("returns 5 at R6 breakpoint through R8", () => {
    expect(CARD_CAP(6)).toBe(5);
    expect(CARD_CAP(8)).toBe(5);
  });

  it("returns 6 at R9 breakpoint and R10", () => {
    expect(CARD_CAP(9)).toBe(6);
    expect(CARD_CAP(10)).toBe(6);
  });
});

describe("match structure constants", () => {
  it("has correct mercy lead threshold", () => {
    expect(MERCY_LEAD).toBe(3);
  });

  it("has correct round cap", () => {
    expect(ROUND_CAP).toBe(10);
  });

  it("has correct halftime round", () => {
    expect(HALFTIME_ROUND).toBe(5);
  });

  it("has correct ET round cap", () => {
    expect(ET_ROUND_CAP).toBe(5);
  });

  it("doubles xG in extra time", () => {
    expect(ET_XG_MULT).toBe(2);
  });
});

describe("hand and tactical limits", () => {
  it("draws up to 5 each round", () => {
    expect(HAND_SIZE).toBe(5);
  });

  it("caps tactical plays at 2 per half", () => {
    expect(TACTICALS_PER_HALF).toBe(2);
  });

  it("caps run tactical deck at 4", () => {
    expect(RUN_TACTICAL_DECK_CAP).toBe(4);
  });
});

describe("v10 balance knobs", () => {
  it("has correct rarity multipliers", () => {
    expect(RARITY_MULT.common).toBe(1.0);
    expect(RARITY_MULT.rare).toBe(1.1);
    expect(RARITY_MULT.epic).toBe(1.2);
    expect(RARITY_MULT.legendary).toBe(1.3);
  });

  it("has correct per-round field costs by rarity", () => {
    expect(COST_BY_RARITY.common).toBe(2);
    expect(COST_BY_RARITY.rare).toBe(2);
    expect(COST_BY_RARITY.epic).toBe(3);
    expect(COST_BY_RARITY.legendary).toBe(4);
  });

  it("has 6 stack weights with correct values", () => {
    expect(STACK_WEIGHTS).toHaveLength(6);
    expect(STACK_WEIGHTS[0]).toBe(1.0);
    expect(STACK_WEIGHTS[1]).toBe(0.85);
    expect(STACK_WEIGHTS[5]).toBe(0.25);
  });

  it("star synergy discount is 0.5", () => {
    expect(STAR_SYNERGY_DISCOUNT).toBe(0.5);
  });

  it("xG curve constants match v10 spec", () => {
    expect(XG_FLOOR).toBe(0.05);
    expect(XG_SLOPE).toBe(210);
    expect(XG_CAP).toBe(0.5);
  });
});

describe("formation multipliers", () => {
  it("offensive boosts attack and weakens defense", () => {
    expect(FORMATIONS.offensive.atkMult).toBe(1.25);
    expect(FORMATIONS.offensive.defMult).toBe(0.75);
  });

  it("balanced is neutral", () => {
    expect(FORMATIONS.balanced.atkMult).toBe(1.0);
    expect(FORMATIONS.balanced.defMult).toBe(1.0);
  });

  it("defensive weakens attack and boosts defense", () => {
    expect(FORMATIONS.defensive.atkMult).toBe(0.75);
    expect(FORMATIONS.defensive.defMult).toBe(1.25);
  });
});

describe("synergy and captain bonuses", () => {
  it("chemistry bonus is +2/+2", () => {
    expect(CHEM_BONUS_ATK).toBe(2);
    expect(CHEM_BONUS_DEF).toBe(2);
  });

  it("strike partnership gives +5 ATK", () => {
    expect(STRIKE_BONUS_ATK).toBe(5);
  });

  it("back line gives +8 DEF", () => {
    expect(BACKLINE_BONUS_DEF).toBe(8);
  });

  it("midfield engine gives +1 stamina", () => {
    expect(MIDFIELD_BONUS_STAMINA).toBe(1);
  });

  it("captain's pride is +2/+2", () => {
    expect(CAPTAIN_PRIDE_ATK).toBe(2);
    expect(CAPTAIN_PRIDE_DEF).toBe(2);
  });
});

describe("fatigue constants", () => {
  it("fatigue cap is 30", () => {
    expect(FATIGUE_MAX).toBe(30);
  });

  it("fatigue divisor is 60", () => {
    expect(FATIGUE_DIV).toBe(60);
  });
});

describe("tactical xG values", () => {
  it("counter-attack xG bonus is 0.40", () => {
    expect(COUNTER_ATTACK_XG).toBe(0.4);
  });

  it("momentum xG bonus is 0.10", () => {
    expect(MOMENTUM_XG).toBe(0.1);
  });
});
