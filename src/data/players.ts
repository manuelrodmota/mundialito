import type { PlayerCard } from "../engine/types.ts";
import { RAW } from "./playerPool.ts";
import type { PlayerRating } from "./playerPool.ts";
import {
  SLOTS_BY_RARITY,
  deriveRarity,
  deriveStats,
  deriveSaveBonus,
  deriveCost,
  slugify,
  resolveId,
} from "./remote/derive.ts";

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
    cost: deriveCost(rarity),
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
