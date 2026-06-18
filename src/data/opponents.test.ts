import { describe, it, expect } from "vitest";
import { opponents } from "./opponents.ts";

/** The 22 mandatory Tier-S champions from GDD §13. */
const SECTION_13_CHAMPIONS: ReadonlyArray<{ nation: string; year: number }> = [
  { nation: "Uruguay",       year: 1930 },
  { nation: "Italy",         year: 1934 },
  { nation: "Italy",         year: 1938 },
  { nation: "Uruguay",       year: 1950 },
  { nation: "West Germany",  year: 1954 },
  { nation: "Brazil",        year: 1958 },
  { nation: "Brazil",        year: 1962 },
  { nation: "England",       year: 1966 },
  { nation: "Brazil",        year: 1970 },
  { nation: "West Germany",  year: 1974 },
  { nation: "Argentina",     year: 1978 },
  { nation: "Italy",         year: 1982 },
  { nation: "Argentina",     year: 1986 },
  { nation: "West Germany",  year: 1990 },
  { nation: "Brazil",        year: 1994 },
  { nation: "France",        year: 1998 },
  { nation: "Brazil",        year: 2002 },
  { nation: "Italy",         year: 2006 },
  { nation: "Spain",         year: 2010 },
  { nation: "Germany",       year: 2014 },
  { nation: "France",        year: 2018 },
  { nation: "Argentina",     year: 2022 },
];

describe("opponents — §13 champions completeness", () => {
  it("all 22 §13 champions are present in the pool", () => {
    for (const { nation, year } of SECTION_13_CHAMPIONS) {
      const found = opponents.find((t) => t.nation === nation && t.year === year);
      expect(found, `Missing champion: ${nation} ${year}`).toBeDefined();
    }
  });

  it("every champion has isChampion === true and tier === 'S'", () => {
    for (const { nation, year } of SECTION_13_CHAMPIONS) {
      const team = opponents.find((t) => t.nation === nation && t.year === year);
      expect(team!.isChampion, `${nation} ${year} isChampion`).toBe(true);
      expect(team!.tier, `${nation} ${year} tier`).toBe("S");
    }
  });
});

describe("opponents — tier coverage", () => {
  it("all tiers D through S are represented", () => {
    const tiers = new Set(opponents.map((t) => t.tier));
    expect(tiers.has("D")).toBe(true);
    expect(tiers.has("C")).toBe(true);
    expect(tiers.has("B")).toBe(true);
    expect(tiers.has("A")).toBe(true);
    expect(tiers.has("S")).toBe(true);
  });
});

describe("opponents — team id uniqueness", () => {
  it("no two teams share the same id", () => {
    const ids = opponents.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe("opponents — squad well-formedness", () => {
  for (const team of opponents) {
    it(`${team.nation} ${team.year}: squad ≥11 players and includes exactly ≥1 GK`, () => {
      expect(team.squad.length).toBeGreaterThanOrEqual(11);
      const gks = team.squad.filter((p) => p.position === "GK");
      expect(gks.length).toBeGreaterThanOrEqual(1);
    });

    it(`${team.nation} ${team.year}: player ids are unique within the squad`, () => {
      const ids = team.squad.map((p) => p.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  }
});
