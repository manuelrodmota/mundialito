/**
 * Deck-builder query & filter API over the player_ratings table.
 * Default view: 2026 season, sorted by overall desc.
 * All functions are pure async — no React.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlayerCard, Position } from "../../engine/types.ts";
import type { Database } from "./database.types.ts";
import { getSupabaseClient } from "./client.ts";
import { ratingRowToPlayerCard } from "./mappers.ts";

export interface PlayerFilters {
  season?: number;
  team?: string;
  position?: Position;
  overallMin?: number;
  overallMax?: number;
  limit?: number;
  offset?: number;
}

const DEFAULT_SEASON = 2026;
const DEFAULT_LIMIT = 100;

/**
 * Fetches players matching the given filters and maps them to PlayerCards.
 * Defaults to the 2026 season, sorted by overall descending.
 */
export async function fetchPlayers(
  filters: PlayerFilters = {},
  client: SupabaseClient<Database> = getSupabaseClient(),
): Promise<PlayerCard[]> {
  const season = filters.season ?? DEFAULT_SEASON;
  const limit = filters.limit ?? DEFAULT_LIMIT;
  const offset = filters.offset ?? 0;

  let query = client
    .from("player_ratings")
    .select("*")
    .eq("season", season)
    .order("overall", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.team) {
    query = query.ilike("team", filters.team);
  }

  if (filters.overallMin !== undefined) {
    query = query.gte("overall", filters.overallMin);
  }

  if (filters.overallMax !== undefined) {
    query = query.lte("overall", filters.overallMax);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`fetchPlayers failed: ${error.message}`);
  }

  if (!data) return [];

  const seenIds = new Map<string, number>();
  const cards = data.map((row) => ratingRowToPlayerCard(row, seenIds));

  if (filters.position) {
    return cards.filter((c) => c.position === filters.position);
  }

  return cards;
}

/**
 * Returns the distinct seasons (years) available in player_ratings,
 * sorted descending. Useful for the "switch edition" filter.
 */
export async function fetchAvailableSeasons(
  client: SupabaseClient<Database> = getSupabaseClient(),
): Promise<number[]> {
  const { data, error } = await client
    .from("player_ratings")
    .select("season")
    .order("season", { ascending: false });

  if (error) throw new Error(`fetchAvailableSeasons failed: ${error.message}`);
  if (!data) return [];

  const unique = new Set(data.map((r) => r.season));
  return [...unique].sort((a, b) => b - a);
}

/**
 * Returns the distinct team names for a given season.
 * Useful for the country/team filter dropdown.
 */
export async function fetchTeamsForSeason(
  season: number = DEFAULT_SEASON,
  client: SupabaseClient<Database> = getSupabaseClient(),
): Promise<string[]> {
  const { data, error } = await client
    .from("player_ratings")
    .select("team")
    .eq("season", season)
    .order("team");

  if (error) throw new Error(`fetchTeamsForSeason failed: ${error.message}`);
  if (!data) return [];

  const unique = new Set(data.map((r) => r.team));
  return [...unique].sort();
}
