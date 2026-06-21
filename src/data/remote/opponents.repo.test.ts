import { describe, it, expect, vi } from "vitest";
import { selectOpponent, fetchCampaignTeamsByDifficulty, resolveOpponentTeam } from "./opponents.repo.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./database.types.ts";

type CampaignRow = Tables<"campaign_teams">;
type RatingRow = Tables<"player_ratings">;

function makeCampaignRow(overrides: Partial<CampaignRow> = {}): CampaignRow {
  return {
    id: 1,
    year: 1950,
    host_country: "Brazil",
    team: "Uruguay",
    finish: "Champion",
    difficulty: 5,
    description_en: "The Maracanazo.",
    description_es: "El Maracanazo.",
    description_pt: "O Maracanazo.",
    ...overrides,
  };
}

function makeRatingRow(overrides: Partial<RatingRow> = {}): RatingRow {
  return {
    id: 1,
    player: "Juan Alberto Schiaffino",
    season: 1950,
    team: "Uruguay",
    overall: 96,
    attack: 88,
    defense: 52,
    base_overall: 91,
    podium_finish: "Champion",
    era_boost: 5.12,
    rating_source: "historical_estimate",
    player_id: null,
    position_code: null,
    ...overrides,
  };
}

describe("selectOpponent — deterministic selection", () => {
  const TEAMS = [
    makeCampaignRow({ id: 1, team: "Uruguay" }),
    makeCampaignRow({ id: 2, team: "Brazil" }),
    makeCampaignRow({ id: 3, team: "Argentina" }),
  ];

  it("returns the same team given the same seed twice", () => {
    const rng = () => 0.5;
    const first = selectOpponent(TEAMS, rng);
    const second = selectOpponent(TEAMS, rng);
    expect(first?.team).toBe(second?.team);
  });

  it("returns null for an empty list", () => {
    expect(selectOpponent([], () => 0.5)).toBeNull();
  });

  it("always picks a team from the provided list", () => {
    const teams = TEAMS.map((t) => t.team);
    for (let i = 0; i < 20; i++) {
      const picked = selectOpponent(TEAMS, () => Math.random());
      expect(teams).toContain(picked?.team);
    }
  });

  it("picks the first team when rng returns 0", () => {
    const picked = selectOpponent(TEAMS, () => 0);
    expect(picked?.team).toBe("Uruguay");
  });
});

describe("fetchCampaignTeamsByDifficulty — mock client", () => {
  it("queries difficulty=5 and returns rows", async () => {
    const rows = [makeCampaignRow()];
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };
    const client = { from: vi.fn().mockReturnValue(queryBuilder) } as unknown as SupabaseClient<Database>;
    const result = await fetchCampaignTeamsByDifficulty(5, client);
    expect(result).toHaveLength(1);
    expect(result[0].team).toBe("Uruguay");
    expect(client.from).toHaveBeenCalledWith("campaign_teams");
  });

  it("returns empty array when data is null", async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const client = { from: vi.fn().mockReturnValue(queryBuilder) } as unknown as SupabaseClient<Database>;
    const result = await fetchCampaignTeamsByDifficulty(5, client);
    expect(result).toEqual([]);
  });
});

describe("resolveOpponentTeam — locale blurb", () => {
  it("builds OpponentTeam with correct locale blurb", async () => {
    const campaignRow = makeCampaignRow();
    const ratingRows = [makeRatingRow()];

    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: ratingRows, error: null }),
    };
    const client = { from: vi.fn().mockReturnValue(queryBuilder) } as unknown as SupabaseClient<Database>;

    const team = await resolveOpponentTeam(campaignRow, "es", client);
    expect(team.blurb).toBe("El Maracanazo.");
    expect(team.nation).toBe("Uruguay");
    expect(team.year).toBe(1950);
    expect(team.squad).toHaveLength(1);
  });

  it("isChampion is true for Champion finish", async () => {
    const campaignRow = makeCampaignRow();
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const client = { from: vi.fn().mockReturnValue(queryBuilder) } as unknown as SupabaseClient<Database>;
    const team = await resolveOpponentTeam(campaignRow, "en", client);
    expect(team.isChampion).toBe(true);
    expect(team.tier).toBe("S");
  });
});
