/**
 * Arcade matchmaking data layer over campaign_teams + player_ratings.
 * Provides deterministic, seedable opponent selection — no Math.random.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpponentTeam } from "../../engine/types.ts";
import type { Database, Tables } from "./database.types.ts";
import { getSupabaseClient } from "./client.ts";
import { campaignRowToOpponentTeam, ratingRowToPlayerCard } from "./mappers.ts";

type CampaignRow = Tables<"campaign_teams">;
type Locale = "en" | "es" | "pt";

/**
 * Fetches all campaign teams for a given difficulty level (1–5).
 * Note: 2026 has no campaign rows (tournament not yet concluded).
 */
export async function fetchCampaignTeamsByDifficulty(
  difficulty: number,
  client: SupabaseClient<Database> = getSupabaseClient(),
): Promise<CampaignRow[]> {
  const { data, error } = await client
    .from("campaign_teams")
    .select("*")
    .eq("difficulty", difficulty)
    .order("year");

  if (error) throw new Error(`fetchCampaignTeamsByDifficulty failed: ${error.message}`);
  return data ?? [];
}

/**
 * Deterministically picks one team from a list using a seeded RNG.
 * The RNG parameter accepts any () => number function (e.g. a mulberry32 rng.next).
 * Never calls Math.random — reproducible given the same seed.
 */
export function selectOpponent(
  teams: CampaignRow[],
  rng: () => number,
): CampaignRow | null {
  if (teams.length === 0) return null;
  const index = Math.floor(rng() * teams.length);
  return teams[index] ?? null;
}

/**
 * Resolves a campaign team to a full OpponentTeam with a fieldable lineup.
 * Joins campaign_teams → player_ratings for the same year and team name.
 * Falls back to an empty squad if no matching ratings are found.
 */
export async function resolveOpponentTeam(
  row: CampaignRow,
  locale: Locale = "en",
  client: SupabaseClient<Database> = getSupabaseClient(),
): Promise<OpponentTeam> {
  const { data: ratingRows, error } = await client
    .from("player_ratings")
    .select("*")
    .eq("season", row.year)
    .ilike("team", row.team)
    .order("overall", { ascending: false })
    .limit(20);

  if (error) throw new Error(`resolveOpponentTeam failed: ${error.message}`);

  const seenIds = new Map<string, number>();
  const squad = (ratingRows ?? []).map((r) => ratingRowToPlayerCard(r, seenIds));

  return campaignRowToOpponentTeam(row, squad, locale);
}

/**
 * Convenience: pick a random opponent from a difficulty tier and return
 * the fully resolved OpponentTeam in one call.
 */
export async function pickOpponentByDifficulty(
  difficulty: number,
  rng: () => number,
  locale: Locale = "en",
  client: SupabaseClient<Database> = getSupabaseClient(),
): Promise<OpponentTeam | null> {
  const candidates = await fetchCampaignTeamsByDifficulty(difficulty, client);
  const picked = selectOpponent(candidates, rng);
  if (!picked) return null;
  return resolveOpponentTeam(picked, locale, client);
}
