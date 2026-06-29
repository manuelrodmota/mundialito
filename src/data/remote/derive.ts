/**
 * Pure derivation helpers shared by the static pool (src/data/players.ts)
 * and the remote Supabase repository layer.
 * All GDD §4/§15 rarity, cost, slot, and stat derivation lives here.
 */

import type { Rarity, Position } from "../../engine/types.ts";
import { COST_BY_RARITY } from "../../engine/constants.ts";

export const SLOTS_BY_RARITY: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
} as const satisfies Record<Rarity, number>;

/** GDD §4 overall → rarity band mapping. Legendary 90+ · Epic 87–89 · Rare 80–86 · Common <80. */
export function deriveRarity(overall: number): Rarity {
  if (overall >= 90) return "legendary";
  if (overall >= 87) return "epic";
  if (overall >= 80) return "rare";
  return "common";
}

/** GDD §4 position-to-stat derivation. Returns [atk, def] from overall. */
export function deriveStats(position: Position, overall: number): [number, number] {
  switch (position) {
    case "FWD": return [overall, Math.round(overall * 0.55)];
    case "MID": return [Math.round(overall * 0.85), Math.round(overall * 0.78)];
    case "DEF": return [Math.round(overall * 0.55), overall];
    case "GK":  return [0, overall + 5];
  }
}

/** GDD §7 GK save-quality bonus (flat xG-suppression per round). */
export function deriveSaveBonus(overall: number): number {
  return Math.round((overall / 100) * 10) / 100;
}

/** Derives the field-cost from rarity per GDD §15 COST_BY_RARITY. */
export function deriveCost(rarity: Rarity): number {
  return COST_BY_RARITY[rarity];
}

/**
 * Produces a stable slug id from player name and World Cup year.
 * Normalises accented characters and replaces whitespace/punctuation with hyphens.
 */
export function slugify(name: string, worldCup: number): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    worldCup
  );
}

/** Appends a numeric suffix when a slug collision is detected. */
export function resolveId(slug: string, seen: Map<string, number>): string {
  const count = seen.get(slug) ?? 0;
  seen.set(slug, count + 1);
  return count === 0 ? slug : `${slug}-${count}`;
}

/**
 * Maps squads.csv position_code (FW/MF/DF/GK) to the engine Position type.
 * Falls back to a heuristic based on atk/def when no position_code is available.
 */
export function mapPositionCode(code: string): Position {
  switch (code.toUpperCase()) {
    case "FW":
    case "FWD":
      return "FWD";
    case "MF":
    case "MID":
      return "MID";
    case "DF":
    case "DEF":
      return "DEF";
    case "GK":
      return "GK";
    default:
      return "MID";
  }
}

/**
 * Derives a Position heuristic from attack/defense ratings when no squad
 * position_code is available for a ratings-only player.
 *
 * Keepers in the card pool carry a very low attack (~10–35) against a defense ≈
 * their overall, while the lowest outfield attack is ~40+, so an attack floor
 * cleanly separates GKs from defenders. (The earlier `attack === 0` check never
 * matched real data — no rating has attack 0 — so every keeper fell through to
 * DEF.) Authoritative positions come from position_code when a rating matches a
 * squad row; this heuristic only covers the ~18% of ratings with no squad match.
 */
const GK_ATTACK_CEILING = 35;

export function derivePositionFromRatings(attack: number, defense: number): Position {
  if (attack <= GK_ATTACK_CEILING && defense > attack) return "GK";
  if (attack >= defense + 5) return "FWD";
  if (defense >= attack + 5) return "DEF";
  return "MID";
}
