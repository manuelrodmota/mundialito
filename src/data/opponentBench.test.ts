import { describe, it, expect } from "vitest";
import type { OpponentTeam } from "../engine/types.ts";
import { buildOpponentBench } from "./opponentBench.ts";
import { opponents } from "./opponents.ts";
import { toPlayerCard } from "./players.ts";

const byId = (id: string) => {
  const team = opponents.find((o) => o.id === id);
  if (!team) throw new Error(`fixture opponent "${id}" not found`);
  return team;
};

describe("buildOpponentBench", () => {
  it("uses only the team's own commons when it already has enough", () => {
    const canada = byId("can22"); // Tier D, 9 squad commons
    const bench = buildOpponentBench(canada);
    const realCommons = canada.squad.filter((c) => c.rarity === "common");

    expect(bench).toEqual(realCommons);
    expect(bench.every((c) => c.nation === "Canada")).toBe(true);
  });

  it("never sources a card from another nation (the original bug)", () => {
    for (const team of opponents) {
      const bench = buildOpponentBench(team);
      expect(bench.every((c) => c.nation === team.nation)).toBe(true);
      expect(bench.every((c) => c.rarity === "common")).toBe(true);
    }
  });

  it("tops a short squad up to the sustain floor with own-nation reserves", () => {
    // Built from a fixture (not real data) so the partial top-up path stays covered
    // even though the shipped squads are now all either >=6 commons or all-premium.
    const realCommons = (["DEF", "MID", "FWD"] as const).map((pos, i) =>
      toPlayerCard({ name: `Reserve ${i}`, nation: "Testland", worldCup: 2000, position: pos, overall: 70 }),
    );
    const team: OpponentTeam = {
      id: "test", name: "Testland 2000", nation: "Testland", year: 2000, tier: "C",
      strength: 70, squad: realCommons, preferredFormation: "balanced", isChampion: false,
    };
    const bench = buildOpponentBench(team);

    expect(bench).toHaveLength(6); // HAND_SIZE (5) + 1
    expect(bench.every((c) => c.nation === "Testland")).toBe(true);
    expect(bench.every((c) => c.rarity === "common")).toBe(true);
    // The 3 real squad commons are preserved at the front; only the shortfall is synthesized.
    expect(bench.slice(0, 3)).toEqual(realCommons);
  });

  it("supplies an all-synthesized bench for an elite side with zero commons", () => {
    const france = byId("fra18"); // Tier S, 0 squad commons
    const bench = buildOpponentBench(france);

    expect(bench).toHaveLength(6);
    expect(bench.every((c) => c.nation === "France")).toBe(true);
    expect(bench.every((c) => c.rarity === "common")).toBe(true);
    expect(bench.every((c) => c.slots === 0)).toBe(true);
    // Tier-S reserves are still respectable (overall 78), just below the rare threshold.
    expect(bench.every((c) => c.overall === 78)).toBe(true);
  });

  it("emits collision-free ids across the whole bench", () => {
    const france = byId("fra18");
    const bench = buildOpponentBench(france);
    const ids = bench.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
