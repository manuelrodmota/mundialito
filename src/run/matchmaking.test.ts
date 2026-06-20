import { describe, it, expect } from "vitest";
import { allowedTiersForStage, drawOpponent } from "./matchmaking.ts";
import { makeRng } from "../engine/rng.ts";
import { opponents } from "../data/opponents.ts";
import type { RunState } from "../engine/types.ts";

const ALL_STAGES: RunState["stage"][] = ["group", "r16", "qf", "sf", "final"];

describe("allowedTiersForStage", () => {
  it("group stage allows only D and C", () => {
    const tiers = allowedTiersForStage("group");
    expect(tiers).toEqual(expect.arrayContaining(["D", "C"]));
    expect(tiers).not.toContain("B");
    expect(tiers).not.toContain("A");
    expect(tiers).not.toContain("S");
  });

  it("r16 allows C and above (no D)", () => {
    const tiers = allowedTiersForStage("r16");
    expect(tiers).toContain("C");
    expect(tiers).toContain("B");
    expect(tiers).toContain("A");
    expect(tiers).toContain("S");
    expect(tiers).not.toContain("D");
  });

  it("qf allows B and above", () => {
    const tiers = allowedTiersForStage("qf");
    expect(tiers).toContain("B");
    expect(tiers).toContain("A");
    expect(tiers).toContain("S");
    expect(tiers).not.toContain("D");
    expect(tiers).not.toContain("C");
  });

  it("sf allows A and above", () => {
    const tiers = allowedTiersForStage("sf");
    expect(tiers).toContain("A");
    expect(tiers).toContain("S");
    expect(tiers).not.toContain("D");
    expect(tiers).not.toContain("C");
    expect(tiers).not.toContain("B");
  });

  it("final allows S only", () => {
    const tiers = allowedTiersForStage("final");
    expect(tiers).toEqual(["S"]);
  });
});

describe("drawOpponent", () => {
  it("group stage draws only D or C tier teams", () => {
    const rng = makeRng(42);
    for (let i = 0; i < 20; i++) {
      const opp = drawOpponent("group", [], rng);
      expect(["D", "C"]).toContain(opp.tier);
    }
  });

  it("r16 draws only C or higher tier teams", () => {
    const rng = makeRng(99);
    for (let i = 0; i < 20; i++) {
      const opp = drawOpponent("r16", [], rng);
      expect(["C", "B", "A", "S"]).toContain(opp.tier);
    }
  });

  it("qf draws only B or higher tier teams", () => {
    const rng = makeRng(123);
    for (let i = 0; i < 20; i++) {
      const opp = drawOpponent("qf", [], rng);
      expect(["B", "A", "S"]).toContain(opp.tier);
    }
  });

  it("sf draws only A or S tier teams", () => {
    const rng = makeRng(456);
    for (let i = 0; i < 20; i++) {
      const opp = drawOpponent("sf", [], rng);
      expect(["A", "S"]).toContain(opp.tier);
    }
  });

  it("final always draws a champion (isChampion=true)", () => {
    const rng = makeRng(777);
    for (let i = 0; i < 20; i++) {
      const opp = drawOpponent("final", [], rng);
      expect(opp.isChampion).toBe(true);
      expect(opp.tier).toBe("S");
    }
  });

  it("excludes already-defeated opponents", () => {
    const groupTeamIds = opponents
      .filter((t) => t.tier === "D" || t.tier === "C")
      .map((t) => t.id);

    const rng = makeRng(11);
    const allButOne = groupTeamIds.slice(0, groupTeamIds.length - 1);
    const drawn = drawOpponent("group", allButOne, rng);

    expect(drawn.id).toBe(groupTeamIds[groupTeamIds.length - 1]);
  });

  it("same seed produces identical draw (seeded reproducibility)", () => {
    const defeated = ["sau94"];
    const opp1 = drawOpponent("group", defeated, makeRng(9999));
    const opp2 = drawOpponent("group", defeated, makeRng(9999));
    expect(opp1.id).toBe(opp2.id);
  });

  it("different seeds may produce different draws", () => {
    const results = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      const opp = drawOpponent("final", [], makeRng(seed));
      results.add(opp.id);
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it("throws when no eligible opponent exists for the Final", () => {
    const allChampionIds = opponents
      .filter((t) => t.isChampion)
      .map((t) => t.id);

    expect(() =>
      drawOpponent("final", allChampionIds, makeRng(1)),
    ).toThrow("No eligible champion opponent for the Final");
  });

  it("throws when all candidates for a non-final stage are exhausted", () => {
    const allGroupIds = opponents
      .filter((t) => t.tier === "D" || t.tier === "C")
      .map((t) => t.id);

    expect(() =>
      drawOpponent("group", allGroupIds, makeRng(1)),
    ).toThrow('No eligible opponents for stage "group"');
  });

  it.each(ALL_STAGES)("drawOpponent is deterministic for stage %s", (stage) => {
    const a = drawOpponent(stage, [], makeRng(42));
    const b = drawOpponent(stage, [], makeRng(42));
    expect(a.id).toBe(b.id);
  });
});
