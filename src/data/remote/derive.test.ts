import { describe, it, expect } from "vitest";
import {
  deriveRarity,
  deriveStats,
  deriveSaveBonus,
  deriveCost,
  SLOTS_BY_RARITY,
  slugify,
  resolveId,
  mapPositionCode,
  derivePositionFromRatings,
} from "./derive.ts";

describe("deriveRarity — GDD §4 boundaries", () => {
  it("overall < 80 → common", () => {
    expect(deriveRarity(75)).toBe("common");
    expect(deriveRarity(79)).toBe("common");
  });

  it("overall 80–86 → rare", () => {
    expect(deriveRarity(80)).toBe("rare");
    expect(deriveRarity(83)).toBe("rare");
    expect(deriveRarity(86)).toBe("rare");
  });

  it("overall 87–91 → epic", () => {
    expect(deriveRarity(87)).toBe("epic");
    expect(deriveRarity(89)).toBe("epic");
    expect(deriveRarity(91)).toBe("epic");
  });

  it("overall ≥ 92 → legendary", () => {
    expect(deriveRarity(92)).toBe("legendary");
    expect(deriveRarity(96)).toBe("legendary");
    expect(deriveRarity(99)).toBe("legendary");
  });
});

describe("deriveCost — COST_BY_RARITY", () => {
  it("common → 2", () => expect(deriveCost("common")).toBe(2));
  it("rare → 2", () => expect(deriveCost("rare")).toBe(2));
  it("epic → 3", () => expect(deriveCost("epic")).toBe(3));
  it("legendary → 4", () => expect(deriveCost("legendary")).toBe(4));
});

describe("SLOTS_BY_RARITY", () => {
  it("common → 0", () => expect(SLOTS_BY_RARITY["common"]).toBe(0));
  it("rare → 1", () => expect(SLOTS_BY_RARITY["rare"]).toBe(1));
  it("epic → 2", () => expect(SLOTS_BY_RARITY["epic"]).toBe(2));
  it("legendary → 3", () => expect(SLOTS_BY_RARITY["legendary"]).toBe(3));
});

describe("deriveStats — position stat derivation", () => {
  it("FWD: atk = overall, def = round(overall * 0.55)", () => {
    const [atk, def] = deriveStats("FWD", 90);
    expect(atk).toBe(90);
    expect(def).toBe(Math.round(90 * 0.55));
  });

  it("MID: atk = round(overall * 0.85), def = round(overall * 0.78)", () => {
    const [atk, def] = deriveStats("MID", 90);
    expect(atk).toBe(Math.round(90 * 0.85));
    expect(def).toBe(Math.round(90 * 0.78));
  });

  it("DEF: atk = round(overall * 0.55), def = overall", () => {
    const [atk, def] = deriveStats("DEF", 90);
    expect(atk).toBe(Math.round(90 * 0.55));
    expect(def).toBe(90);
  });

  it("GK: atk = 0, def = overall + 5", () => {
    const [atk, def] = deriveStats("GK", 90);
    expect(atk).toBe(0);
    expect(def).toBe(95);
  });
});

describe("deriveSaveBonus", () => {
  it("returns a positive float for overall > 0", () => {
    const bonus = deriveSaveBonus(90);
    expect(bonus).toBeGreaterThan(0);
    expect(bonus).toBeLessThanOrEqual(1);
  });
});

describe("slugify", () => {
  it("lowercases and replaces punctuation with hyphens", () => {
    expect(slugify("Juan Schiaffino", 1950)).toBe("juan-schiaffino-1950");
  });

  it("strips diacritics before slugifying", () => {
    expect(slugify("Ángel Di María", 2022)).toBe("angel-di-maria-2022");
  });

  it("appends the year", () => {
    expect(slugify("Pelé", 1970)).toContain("1970");
  });
});

describe("resolveId — collision avoidance", () => {
  it("first occurrence returns the base slug", () => {
    const seen = new Map<string, number>();
    expect(resolveId("pele-1970", seen)).toBe("pele-1970");
  });

  it("second occurrence appends -1", () => {
    const seen = new Map<string, number>();
    resolveId("pele-1970", seen);
    expect(resolveId("pele-1970", seen)).toBe("pele-1970-1");
  });
});

describe("mapPositionCode", () => {
  it("FW → FWD", () => expect(mapPositionCode("FW")).toBe("FWD"));
  it("MF → MID", () => expect(mapPositionCode("MF")).toBe("MID"));
  it("DF → DEF", () => expect(mapPositionCode("DF")).toBe("DEF"));
  it("GK → GK", () => expect(mapPositionCode("GK")).toBe("GK"));
  it("unknown defaults to MID", () => expect(mapPositionCode("unknown")).toBe("MID"));
});

describe("derivePositionFromRatings", () => {
  it("atk = 0 → GK", () => {
    expect(derivePositionFromRatings(0, 85)).toBe("GK");
  });

  it("low non-zero atk (real keeper) → GK", () => {
    // Real card-pool keepers have attack ~10–32, never 0 (the prior bug).
    expect(derivePositionFromRatings(11, 85)).toBe("GK"); // E. Martínez 2026
    expect(derivePositionFromRatings(20, 74)).toBe("GK"); // older-era keeper
    expect(derivePositionFromRatings(32, 54)).toBe("GK"); // low-rated keeper
  });

  it("low-attack defender (atk ≥ ceiling) → DEF, not GK", () => {
    // A defensive CB sits above the keeper attack floor (~40+), e.g. Bednarek.
    expect(derivePositionFromRatings(42, 78)).toBe("DEF");
  });

  it("atk much > def → FWD", () => {
    expect(derivePositionFromRatings(88, 50)).toBe("FWD");
  });

  it("def much > atk → DEF", () => {
    expect(derivePositionFromRatings(55, 90)).toBe("DEF");
  });

  it("balanced → MID", () => {
    expect(derivePositionFromRatings(80, 80)).toBe("MID");
  });
});
