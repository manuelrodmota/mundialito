import { describe, it, expect } from "vitest";
import { toPlayerCard, players } from "./players.ts";
import type { PlayerRating } from "./playerPool.ts";

const FWD_RATING: PlayerRating = { name: "Test FWD", nation: "Brazil", worldCup: 2026, position: "FWD", overall: 90 };
const MID_RATING: PlayerRating = { name: "Test MID", nation: "Spain", worldCup: 2026, position: "MID", overall: 90 };
const DEF_RATING: PlayerRating = { name: "Test DEF", nation: "Germany", worldCup: 2026, position: "DEF", overall: 90 };
const GK_RATING: PlayerRating  = { name: "Test GK",  nation: "France", worldCup: 2026, position: "GK",  overall: 90 };

describe("toPlayerCard — position stat derivation (GDD §4)", () => {
  it("FWD: atk = overall, def = round(overall * 0.55)", () => {
    const card = toPlayerCard(FWD_RATING);
    expect(card.atk).toBe(90);
    expect(card.def).toBe(Math.round(90 * 0.55));
  });

  it("MID: atk = round(overall * 0.85), def = round(overall * 0.78)", () => {
    const card = toPlayerCard(MID_RATING);
    expect(card.atk).toBe(Math.round(90 * 0.85));
    expect(card.def).toBe(Math.round(90 * 0.78));
  });

  it("DEF: atk = round(overall * 0.55), def = overall", () => {
    const card = toPlayerCard(DEF_RATING);
    expect(card.atk).toBe(Math.round(90 * 0.55));
    expect(card.def).toBe(90);
  });

  it("GK: atk = 0, def = overall + 5", () => {
    const card = toPlayerCard(GK_RATING);
    expect(card.atk).toBe(0);
    expect(card.def).toBe(95);
  });

  it("GK has a saveBonus", () => {
    const card = toPlayerCard(GK_RATING);
    expect(card.saveBonus).toBeDefined();
    expect(card.saveBonus).toBeGreaterThan(0);
  });

  it("non-GK positions have no saveBonus", () => {
    expect(toPlayerCard(FWD_RATING).saveBonus).toBeUndefined();
    expect(toPlayerCard(MID_RATING).saveBonus).toBeUndefined();
    expect(toPlayerCard(DEF_RATING).saveBonus).toBeUndefined();
  });
});

describe("toPlayerCard — rarity / slots / cost derivation (GDD §4)", () => {
  it("common: overall 60–79 → rarity common, slots 0, cost 2", () => {
    const card = toPlayerCard({ name: "C", nation: "X", worldCup: 2026, position: "FWD", overall: 75 });
    expect(card.rarity).toBe("common");
    expect(card.slots).toBe(0);
    expect(card.cost).toBe(2);
  });

  it("rare: overall 80–86 → rarity rare, slots 1, cost 2", () => {
    const card = toPlayerCard({ name: "R", nation: "X", worldCup: 2026, position: "FWD", overall: 83 });
    expect(card.rarity).toBe("rare");
    expect(card.slots).toBe(1);
    expect(card.cost).toBe(2);
  });

  it("epic: overall 87–91 → rarity epic, slots 2, cost 3", () => {
    const card = toPlayerCard({ name: "E", nation: "X", worldCup: 2026, position: "FWD", overall: 89 });
    expect(card.rarity).toBe("epic");
    expect(card.slots).toBe(2);
    expect(card.cost).toBe(3);
  });

  it("legendary: overall 92–99 → rarity legendary, slots 3, cost 4", () => {
    const card = toPlayerCard({ name: "L", nation: "X", worldCup: 2026, position: "FWD", overall: 95 });
    expect(card.rarity).toBe("legendary");
    expect(card.slots).toBe(3);
    expect(card.cost).toBe(4);
  });

  it("rarity boundary at 80 is rare (not common)", () => {
    const card = toPlayerCard({ name: "B80", nation: "X", worldCup: 2026, position: "DEF", overall: 80 });
    expect(card.rarity).toBe("rare");
  });

  it("rarity boundary at 87 is epic (not rare)", () => {
    const card = toPlayerCard({ name: "B87", nation: "X", worldCup: 2026, position: "MID", overall: 87 });
    expect(card.rarity).toBe("epic");
  });

  it("rarity boundary at 92 is legendary (not epic)", () => {
    const card = toPlayerCard({ name: "B92", nation: "X", worldCup: 2026, position: "FWD", overall: 92 });
    expect(card.rarity).toBe("legendary");
  });
});

describe("players pool — determinism", () => {
  it("building the pool twice yields identical arrays", async () => {
    const { players: playersB } = await import("./players.ts");
    expect(players).toEqual(playersB);
  });

  it("all cards carry type = player", () => {
    for (const card of players) {
      expect(card.type).toBe("player");
    }
  });
});

describe("players pool — stable unique ids", () => {
  it("no two cards share the same id", () => {
    const ids = players.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe("players pool — size and rarity distribution", () => {
  it("contains more than 200 cards", () => {
    expect(players.length).toBeGreaterThan(200);
  });

  it("has cards in every rarity tier", () => {
    const rarities = new Set(players.map((c) => c.rarity));
    expect(rarities.has("common")).toBe(true);
    expect(rarities.has("rare")).toBe(true);
    expect(rarities.has("epic")).toBe(true);
    expect(rarities.has("legendary")).toBe(true);
  });

  it("has cards in every position", () => {
    const positions = new Set(players.map((c) => c.position));
    expect(positions.has("FWD")).toBe(true);
    expect(positions.has("MID")).toBe(true);
    expect(positions.has("DEF")).toBe(true);
    expect(positions.has("GK")).toBe(true);
  });
});

describe("players pool — known real-player derivation spot-checks", () => {
  it("Lionel Messi 2022 (overall 98) is legendary FWD with correct stats", () => {
    const messi = players.find((c) => c.name === "Lionel Messi" && c.worldCup === 2022);
    expect(messi).toBeDefined();
    expect(messi!.rarity).toBe("legendary");
    expect(messi!.atk).toBe(98);
    expect(messi!.def).toBe(Math.round(98 * 0.55));
    expect(messi!.slots).toBe(3);
    expect(messi!.cost).toBe(4);
  });

  it("Manuel Neuer 2014 (overall 92) is legendary GK with correct stats", () => {
    const neuer = players.find((c) => c.name === "Manuel Neuer" && c.worldCup === 2014);
    expect(neuer).toBeDefined();
    expect(neuer!.rarity).toBe("legendary");
    expect(neuer!.atk).toBe(0);
    expect(neuer!.def).toBe(97);
    expect(neuer!.saveBonus).toBeDefined();
  });
});
