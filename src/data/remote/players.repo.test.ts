import { describe, it, expect, vi } from "vitest";
import { fetchPlayers, fetchAvailableSeasons, fetchTeamsForSeason } from "./players.repo.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./database.types.ts";

type RatingRow = Tables<"player_ratings">;

function makeRow(overrides: Partial<RatingRow> = {}): RatingRow {
  return {
    id: 1,
    player: "Test Player",
    season: 2026,
    team: "Brazil",
    overall: 90,
    attack: 85,
    defense: 45,
    base_overall: 88,
    podium_finish: null,
    era_boost: null,
    rating_source: null,
    player_id: null,
    position_code: null,
    ...overrides,
  };
}

function mockClient(rows: RatingRow[]): SupabaseClient<Database> {
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: rows, error: null }),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };

  return {
    from: vi.fn().mockReturnValue(queryBuilder),
  } as unknown as SupabaseClient<Database>;
}

describe("fetchPlayers — default 2026 season", () => {
  it("queries season=2026 by default and maps rows to PlayerCards", async () => {
    const client = mockClient([makeRow()]);
    const cards = await fetchPlayers({}, client);
    expect(cards).toHaveLength(1);
    expect(cards[0].worldCup).toBe(2026);
    expect(cards[0].atk).toBe(85);
    expect(cards[0].def).toBe(45);
    expect(cards[0].type).toBe("player");
    expect(client.from).toHaveBeenCalledWith("player_ratings");
  });

  it("filters by position after mapping", async () => {
    const rows = [
      makeRow({ player: "FWD Player", attack: 90, defense: 44 }),
      makeRow({ id: 2, player: "GK Player", attack: 0, defense: 92 }),
    ];
    const client = mockClient(rows);
    const cards = await fetchPlayers({ position: "FWD" }, client);
    expect(cards.every((c) => c.position === "FWD")).toBe(true);
  });

  it("returns empty array when data is null", async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const client = { from: vi.fn().mockReturnValue(queryBuilder) } as unknown as SupabaseClient<Database>;
    const cards = await fetchPlayers({}, client);
    expect(cards).toEqual([]);
  });

  it("throws when Supabase returns an error", async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
    };
    const client = { from: vi.fn().mockReturnValue(queryBuilder) } as unknown as SupabaseClient<Database>;
    await expect(fetchPlayers({}, client)).rejects.toThrow("fetchPlayers failed");
  });
});

describe("fetchPlayers — season override", () => {
  it("queries the requested season", async () => {
    const client = mockClient([makeRow({ season: 1970 })]);
    const cards = await fetchPlayers({ season: 1970 }, client);
    expect(cards[0].worldCup).toBe(1970);
  });
});

describe("fetchAvailableSeasons", () => {
  it("returns deduplicated sorted seasons descending", async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [{ season: 2026 }, { season: 2022 }, { season: 2026 }, { season: 1970 }],
        error: null,
      }),
    };
    const client = { from: vi.fn().mockReturnValue(queryBuilder) } as unknown as SupabaseClient<Database>;
    const seasons = await fetchAvailableSeasons(client);
    expect(seasons).toEqual([2026, 2022, 1970]);
  });
});

describe("fetchTeamsForSeason", () => {
  it("returns deduplicated sorted team names", async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [{ team: "Brazil" }, { team: "Argentina" }, { team: "Brazil" }],
        error: null,
      }),
    };
    const client = { from: vi.fn().mockReturnValue(queryBuilder) } as unknown as SupabaseClient<Database>;
    const teams = await fetchTeamsForSeason(2026, client);
    expect(teams).toEqual(["Argentina", "Brazil"]);
  });
});
