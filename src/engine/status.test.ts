import { describe, it, expect } from "vitest";
import {
  statusMods,
  isRedCarded,
  isBooked,
  applySecondBooking,
  addStatus,
  tickStatuses,
  onFormXgBonus,
  removeStatus,
} from "./status.ts";
import type { CardInPlay, PlayerCard } from "./types.ts";

function makeCard(statuses: CardInPlay["statuses"] = []): CardInPlay {
  const card: PlayerCard = {
    id: "p1",
    type: "player",
    name: "Test Player",
    nation: "Brazil",
    worldCup: 2022,
    position: "MID",
    overall: 80,
    atk: 70,
    def: 70,
    cost: 3,
    rarity: "common",
    slots: 1,
  };
  return { card, lane: "attack", statuses: [...statuses], faceDown: false };
}

describe("statusMods", () => {
  it("returns identity mods for a card with no statuses", () => {
    const mods = statusMods(makeCard());
    expect(mods.atkMult).toBe(1);
    expect(mods.defMult).toBe(1);
    expect(mods.atkFlat).toBe(0);
    expect(mods.defFlat).toBe(0);
  });

  it("Pressed applies DEF −10 flat penalty", () => {
    const card = makeCard([{ kind: "pressed", amount: 10, duration: 1 }]);
    const mods = statusMods(card);
    expect(mods.defFlat).toBe(-10);
    expect(mods.atkFlat).toBe(0);
  });

  it("Injured applies ATK and DEF −15 flat penalty", () => {
    const card = makeCard([{ kind: "injured", amount: 15 }]);
    const mods = statusMods(card);
    expect(mods.atkFlat).toBe(-15);
    expect(mods.defFlat).toBe(-15);
  });

  it("Booked, Red, and OnForm have no direct stat impact in statusMods", () => {
    const card = makeCard([
      { kind: "booked" },
      { kind: "red" },
      { kind: "onform", amount: 0.1 },
    ]);
    const mods = statusMods(card);
    expect(mods.atkFlat).toBe(0);
    expect(mods.defFlat).toBe(0);
    expect(mods.atkMult).toBe(1);
  });
});

describe("isBooked / isRedCarded", () => {
  it("detects booking", () => {
    const card = makeCard([{ kind: "booked" }]);
    expect(isBooked(card)).toBe(true);
    expect(isRedCarded(card)).toBe(false);
  });

  it("detects red card", () => {
    const card = makeCard([{ kind: "red" }]);
    expect(isRedCarded(card)).toBe(true);
    expect(isBooked(card)).toBe(false);
  });

  it("returns false on clean card", () => {
    const card = makeCard();
    expect(isBooked(card)).toBe(false);
    expect(isRedCarded(card)).toBe(false);
  });
});

describe("applySecondBooking", () => {
  it("converts booked → red and returns true", () => {
    const card = makeCard([{ kind: "booked" }]);
    const result = applySecondBooking(card);
    expect(result).toBe(true);
    expect(isBooked(card)).toBe(false);
    expect(isRedCarded(card)).toBe(true);
  });

  it("returns false when card has no booking", () => {
    const card = makeCard();
    expect(applySecondBooking(card)).toBe(false);
    expect(isRedCarded(card)).toBe(false);
  });
});

describe("addStatus", () => {
  it("adds a status to the card's list", () => {
    const card = makeCard();
    addStatus(card, { kind: "booked" });
    expect(card.statuses).toHaveLength(1);
    expect(card.statuses[0]?.kind).toBe("booked");
  });

  it("stores a copy of the status (immutable input)", () => {
    const card = makeCard();
    const s = { kind: "injured" as const, amount: 15 };
    addStatus(card, s);
    s.amount = 99;
    expect(card.statuses[0]?.amount).toBe(15);
  });
});

describe("tickStatuses", () => {
  it("removes a status when its duration reaches 0", () => {
    const card = makeCard([{ kind: "pressed", amount: 10, duration: 1 }]);
    tickStatuses(card);
    expect(card.statuses).toHaveLength(0);
  });

  it("decrements duration but keeps status while above 0", () => {
    const card = makeCard([{ kind: "pressed", amount: 10, duration: 2 }]);
    tickStatuses(card);
    expect(card.statuses).toHaveLength(1);
    expect(card.statuses[0]?.duration).toBe(1);
  });

  it("preserves statuses without a duration", () => {
    const card = makeCard([{ kind: "injured", amount: 15 }]);
    tickStatuses(card);
    expect(card.statuses).toHaveLength(1);
  });
});

describe("onFormXgBonus", () => {
  it("returns 0.10 when card has onform status", () => {
    const card = makeCard([{ kind: "onform", amount: 0.1 }]);
    expect(onFormXgBonus(card)).toBeCloseTo(0.1, 5);
  });

  it("returns 0 when no onform status", () => {
    const card = makeCard();
    expect(onFormXgBonus(card)).toBe(0);
  });
});

describe("removeStatus", () => {
  it("removes a status by kind", () => {
    const card = makeCard([{ kind: "booked" }, { kind: "pressed", duration: 2 }]);
    removeStatus(card, "booked");
    expect(card.statuses).toHaveLength(1);
    expect(card.statuses[0]?.kind).toBe("pressed");
  });

  it("does nothing when status not present", () => {
    const card = makeCard([{ kind: "injured" }]);
    removeStatus(card, "booked");
    expect(card.statuses).toHaveLength(1);
  });
});
