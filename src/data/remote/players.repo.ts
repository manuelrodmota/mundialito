/**
 * Deck-builder query & filter API over the player_ratings table.
 * Default view: 2026 season, sorted by overall desc.
 * All functions are pure async — no React.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlayerCard, Position } from "../../engine/types.ts";
import type { Database, Tables } from "./database.types.ts";
import { getSupabaseClient } from "./client.ts";
import { ratingRowToPlayerCard } from "./mappers.ts";

type RatingRow = Tables<"player_ratings">;

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
const DEFAULT_LIMIT = 2000;
/** PostgREST caps a single response at ~1000 rows, so larger reads must page through. */
const PAGE_SIZE = 1000;

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
  const startOffset = filters.offset ?? 0;

  // Page through the PostgREST 1000-row cap until we have `limit` rows or the
  // season is exhausted — otherwise a season with >1000 players (e.g. 2026) is
  // silently truncated to the first page.
  const rows: RatingRow[] = [];
  let offset = startOffset;
  while (rows.length < limit) {
    const want = Math.min(PAGE_SIZE, limit - rows.length);
    let query = client
      .from("player_ratings")
      .select("*")
      .eq("season", season)
      .order("overall", { ascending: false })
      .range(offset, offset + want - 1);

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
    if (!data || data.length === 0) break;
    rows.push(...data);
    offset += data.length;
    if (data.length < want) break;
  }

  const seenIds = new Map<string, number>();
  const cards = rows.map((row) => ratingRowToPlayerCard(row, seenIds));

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
  // Page through all rows so editions beyond the first 1000-row page are not lost
  // (the latest season alone can exceed one page, which previously hid every older edition).
  const unique = new Set<number>();
  let offset = 0;
  for (;;) {
    const { data, error } = await client
      .from("player_ratings")
      .select("season")
      .order("season", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`fetchAvailableSeasons failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) unique.add(r.season);
    offset += data.length;
    if (data.length < PAGE_SIZE) break;
  }
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
  // Page through the season's rows (a season can exceed the 1000-row cap) so the
  // country dropdown lists every team, not just those in the first page.
  const unique = new Set<string>();
  let offset = 0;
  for (;;) {
    const { data, error } = await client
      .from("player_ratings")
      .select("team")
      .eq("season", season)
      .order("team")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`fetchTeamsForSeason failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const r of data) unique.add(r.team);
    offset += data.length;
    if (data.length < PAGE_SIZE) break;
  }
  return [...unique].sort();
}
