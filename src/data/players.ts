import type { PlayerCard, Rarity } from "../engine/types.ts";
import { COST_BY_RARITY } from "../engine/constants.ts";
import { RAW } from "./playerPool.ts";
import type { PlayerRating } from "./playerPool.ts";

const SLOTS_BY_RARITY: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
} as const satisfies Record<Rarity, number>;

/** GDD §4 overall → rarity band mapping. */
function deriveRarity(overall: number): Rarity {
  if (overall >= 92) return "legendary";
  if (overall >= 87) return "epic";
  if (overall >= 80) return "rare";
  return "common";
}

/**
 * GDD §4 position-to-stat derivation.
 * Returns [atk, def] from overall.
 */
function deriveStats(position: PlayerRating["position"], overall: number): [number, number] {
  switch (position) {
    case "FWD": return [overall, Math.round(overall * 0.55)];
    case "MID": return [Math.round(overall * 0.85), Math.round(overall * 0.78)];
    case "DEF": return [Math.round(overall * 0.55), overall];
    case "GK":  return [0, overall + 5];
  }
}

/**
 * GDD §7 GK save-quality bonus (flat xG-suppression per round).
 * Proportional to overall scaled to a small float range. // tunable
 */
function deriveSaveBonus(overall: number): number {
  return Math.round((overall / 100) * 10) / 100;
}

/**
 * Produces a stable slug id from player name and World Cup year.
 * Normalises accented characters and replaces whitespace/punctuation with hyphens.
 */
function slugify(name: string, worldCup: number): string {
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
function resolveId(slug: string, seen: Map<string, number>): string {
  const count = seen.get(slug) ?? 0;
  seen.set(slug, count + 1);
  return count === 0 ? slug : `${slug}-${count}`;
}

/** Derives a complete PlayerCard from a raw rating tuple (GDD §4). */
export function toPlayerCard(rating: PlayerRating, seenIds?: Map<string, number>): PlayerCard {
  const { name, nation, worldCup, position, overall } = rating;
  const rarity = deriveRarity(overall);
  const [atk, def] = deriveStats(position, overall);
  const slug = slugify(name, worldCup);
  const idMap = seenIds ?? new Map<string, number>();
  const id = resolveId(slug, idMap);

  const card: PlayerCard = {
    id,
    type: "player",
    name,
    nation,
    worldCup,
    position,
    overall,
    atk,
    def,
    cost: COST_BY_RARITY[rarity],
    rarity,
    slots: SLOTS_BY_RARITY[rarity],
  };

  if (position === "GK") {
    card.saveBonus = deriveSaveBonus(overall);
  }

  return card;
}

function buildPlayers(): PlayerCard[] {
  const seen = new Set<string>();
  const idMap = new Map<string, number>();
  const result: PlayerCard[] = [];

  for (const rating of RAW) {
    const dedupKey = `${rating.name}·${rating.worldCup}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    result.push(toPlayerCard(rating, idMap));
  }

  return result;
}

/** Full derived player pool — one card per unique (name, worldCup) pair. */
export const players: PlayerCard[] = buildPlayers();
