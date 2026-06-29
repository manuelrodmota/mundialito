/**
 * DB row → PlayerCard / OpponentTeam mappers.
 * Uses the CSV's explicit attack/defense columns for atk/def,
 * and derives rarity/cost/slots from overall per GDD §4/§15.
 */

import type { PlayerCard, OpponentTeam, Tier, Formation } from "../../engine/types.ts";
import type { Tables } from "./database.types.ts";
import {
  SLOTS_BY_RARITY,
  deriveRarity,
  deriveSaveBonus,
  deriveCost,
  slugify,
  resolveId,
  mapPositionCode,
  derivePositionFromRatings,
  deriveStats,
} from "./derive.ts";

type RatingRow = Tables<"player_ratings">;
type CampaignRow = Tables<"campaign_teams">;

/**
 * A player_ratings row with an optional position_code. The column now lives on the
 * schema (populated by the import from the matched squad row), so a plain RatingRow
 * already carries it; this kept-for-compatibility alias keeps it optional for callers
 * (e.g. tests) that build rows without one — the mapper then falls back to the
 * ratings heuristic.
 */
export interface RatingRowWithPosition extends Omit<RatingRow, "position_code"> {
  position_code?: string | null;
}

/**
 * Maps a player_ratings DB row to a PlayerCard.
 * Uses explicit attack/defense from the CSV; derives rarity/slots/cost from overall.
 * Falls back to deriveStats when attack or defense is zero/missing.
 */
export function ratingRowToPlayerCard(
  row: RatingRowWithPosition,
  seenIds?: Map<string, number>,
): PlayerCard {
  const overall = row.overall;
  const rarity = deriveRarity(overall);

  const position = row.position_code
    ? mapPositionCode(row.position_code)
    : derivePositionFromRatings(row.attack, row.defense);

  const atk = row.attack > 0 ? row.attack : deriveStats(position, overall)[0];
  const def = row.defense > 0 ? row.defense : deriveStats(position, overall)[1];

  const slug = slugify(row.player, row.season);
  const idMap = seenIds ?? new Map<string, number>();
  const id = resolveId(slug, idMap);

  const card: PlayerCard = {
    id,
    cardId: row.id,
    type: "player",
    name: row.player,
    nation: row.team,
    worldCup: row.season,
    position,
    overall,
    atk,
    def,
    cost: deriveCost(rarity),
    rarity,
    slots: SLOTS_BY_RARITY[rarity],
  };

  if (position === "GK") {
    card.saveBonus = deriveSaveBonus(overall);
  }

  return card;
}

/** Derives average overall from a squad of PlayerCards. */
export function deriveStrengthFromCards(cards: PlayerCard[]): number {
  if (cards.length === 0) return 0;
  return Math.round(cards.reduce((sum, c) => sum + c.overall, 0) / cards.length);
}

/** Maps a finish string to an approximate Tier. */
function finishToTier(finish: string): Tier {
  const f = finish.toLowerCase();
  if (f.includes("champion")) return "S";
  if (f.includes("runner") || f === "2nd place") return "A";
  if (f.includes("3rd") || f.includes("third") || f.includes("semi")) return "B";
  if (f.includes("quarter") || f.includes("4th") || f.includes("r16")) return "C";
  return "D";
}

/** Maps a difficulty integer to a preferred Formation (heuristic). */
function difficultyToFormation(difficulty: number): Formation {
  if (difficulty >= 4) return "offensive";
  if (difficulty === 3) return "balanced";
  return "defensive";
}

/**
 * Builds an OpponentTeam from a campaign_teams row and the corresponding
 * player cards already mapped from player_ratings.
 */
export function campaignRowToOpponentTeam(
  row: CampaignRow,
  squad: PlayerCard[],
  locale: "en" | "es" | "pt" = "en",
): OpponentTeam {
  const tier = finishToTier(row.finish);
  const blurbKey = `description_${locale}` as const;
  const blurb = row[blurbKey] ?? row.description_en ?? undefined;

  return {
    id: `${row.team.toLowerCase().replace(/\s+/g, "-")}-${row.year}`,
    name: `${row.team} ${row.year}`,
    nation: row.team,
    year: row.year,
    tier,
    strength: deriveStrengthFromCards(squad),
    squad,
    preferredFormation: difficultyToFormation(row.difficulty),
    isChampion: tier === "S",
    ...(blurb ? { blurb } : {}),
  };
}
