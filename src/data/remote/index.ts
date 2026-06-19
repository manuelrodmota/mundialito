export { getSupabaseClient } from "./client.ts";
export type { Database, Tables, TablesInsert, TablesUpdate } from "./database.types.ts";
export {
  SLOTS_BY_RARITY,
  deriveRarity,
  deriveStats,
  deriveSaveBonus,
  deriveCost,
  slugify,
  resolveId,
  mapPositionCode,
  derivePositionFromRatings,
} from "./derive.ts";
export { ratingRowToPlayerCard, campaignRowToOpponentTeam, deriveStrengthFromCards } from "./mappers.ts";
export type { RatingRowWithPosition } from "./mappers.ts";
export { fetchPlayers, fetchAvailableSeasons, fetchTeamsForSeason } from "./players.repo.ts";
export type { PlayerFilters } from "./players.repo.ts";
export {
  fetchCampaignTeamsByDifficulty,
  selectOpponent,
  resolveOpponentTeam,
  pickOpponentByDifficulty,
} from "./opponents.repo.ts";
