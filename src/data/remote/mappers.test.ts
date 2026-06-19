import { describe, it, expect } from "vitest";
import { ratingRowToPlayerCard, campaignRowToOpponentTeam, deriveStrengthFromCards } from "./mappers.ts";
import type { RatingRowWithPosition } from "./mappers.ts";
import type { Tables } from "./database.types.ts";

type CampaignRow = Tables<"campaign_teams">;

const BASE_RATING: RatingRowWithPosition = {
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
  position_code: "FW",
};

describe("ratingRowToPlayerCard — uses CSV explicit attack/defense", () => {
  it("uses CSV attack/defense directly", () => {
    const card = ratingRowToPlayerCard(BASE_RATING);
    expect(card.atk).toBe(88);
    expect(card.def).toBe(52);
  });

  it("derives correct rarity from overall 96 → legendary", () => {
    const card = ratingRowToPlayerCard(BASE_RATING);
    expect(card.rarity).toBe("legendary");
    expect(card.slots).toBe(3);
    expect(card.cost).toBe(4);
  });

  it("maps FW position_code → FWD", () => {
    const card = ratingRowToPlayerCard(BASE_RATING);
    expect(card.position).toBe("FWD");
  });

  it("player name and season become id via slugify", () => {
    const card = ratingRowToPlayerCard(BASE_RATING);
    expect(card.id).toContain("1950");
    expect(card.id).toContain("schiaffino");
  });

  it("type is always player", () => {
    const card = ratingRowToPlayerCard(BASE_RATING);
    expect(card.type).toBe("player");
  });
});

describe("ratingRowToPlayerCard — GK saveBonus", () => {
  const GK_RATING: RatingRowWithPosition = {
    ...BASE_RATING,
    id: 2,
    player: "Roque Máspoli",
    overall: 82,
    attack: 0,
    defense: 87,
    position_code: "GK",
  };

  it("GK has saveBonus", () => {
    const card = ratingRowToPlayerCard(GK_RATING);
    expect(card.saveBonus).toBeDefined();
    expect(card.saveBonus).toBeGreaterThan(0);
  });

  it("GK position is mapped correctly", () => {
    const card = ratingRowToPlayerCard(GK_RATING);
    expect(card.position).toBe("GK");
  });
});

describe("ratingRowToPlayerCard — position fallback (no position_code)", () => {
  it("falls back to heuristic when position_code is null", () => {
    const noPos: RatingRowWithPosition = { ...BASE_RATING, position_code: null };
    const card = ratingRowToPlayerCard(noPos);
    expect(card.position).toBeDefined();
    expect(["FWD", "MID", "DEF", "GK"]).toContain(card.position);
  });
});

describe("ratingRowToPlayerCard — id deduplication", () => {
  it("shared seenIds map prevents duplicate ids across rows", () => {
    const seen = new Map<string, number>();
    const c1 = ratingRowToPlayerCard(BASE_RATING, seen);
    const c2 = ratingRowToPlayerCard({ ...BASE_RATING, id: 99 }, seen);
    expect(c1.id).not.toBe(c2.id);
  });
});

describe("deriveStrengthFromCards", () => {
  it("returns average overall rounded to integer", () => {
    const cards = [
      ratingRowToPlayerCard({ ...BASE_RATING, overall: 96, attack: 88, defense: 52 }),
      ratingRowToPlayerCard({ ...BASE_RATING, id: 2, overall: 80, attack: 44, defense: 80, player: "Other" }),
    ];
    expect(deriveStrengthFromCards(cards)).toBe(88);
  });

  it("returns 0 for empty squad", () => {
    expect(deriveStrengthFromCards([])).toBe(0);
  });
});

describe("campaignRowToOpponentTeam", () => {
  const CAMPAIGN: CampaignRow = {
    id: 1,
    year: 1950,
    host_country: "Brazil",
    team: "Uruguay",
    finish: "Champion",
    difficulty: 5,
    description_en: "The Maracanazo.",
    description_es: "El Maracanazo.",
    description_pt: "O Maracanazo.",
  };

  it("builds an OpponentTeam with correct fields", () => {
    const squad = [ratingRowToPlayerCard(BASE_RATING)];
    const team = campaignRowToOpponentTeam(CAMPAIGN, squad);
    expect(team.nation).toBe("Uruguay");
    expect(team.year).toBe(1950);
    expect(team.isChampion).toBe(true);
    expect(team.tier).toBe("S");
    expect(team.squad).toHaveLength(1);
  });

  it("selects the locale blurb", () => {
    const squad = [ratingRowToPlayerCard(BASE_RATING)];
    const en = campaignRowToOpponentTeam(CAMPAIGN, squad, "en");
    const es = campaignRowToOpponentTeam(CAMPAIGN, squad, "es");
    expect(en.blurb).toBe("The Maracanazo.");
    expect(es.blurb).toBe("El Maracanazo.");
  });
});
