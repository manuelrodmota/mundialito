/**
 * WCC-009 — Synergies & Captain's Pride (GDD v10 §9 / §15 / §17).
 *
 * Computes ATK/DEF deltas from chemistry bonuses and the Captain's Pride
 * bonus. Applied after rarityMult+laneStack in the effectiveStats fold order.
 */

import type { PlayerCard, CardInPlay } from "./types.ts";
import {
  CHEM_BONUS_ATK,
  CHEM_BONUS_DEF,
  STRIKE_BONUS_ATK,
  BACKLINE_BONUS_DEF,
  MIDFIELD_BONUS_STAMINA,
  CAPTAIN_PRIDE_ATK,
  CAPTAIN_PRIDE_DEF,
} from "./constants.ts";

export interface SynergyDeltas {
  atk: number;
  def: number;
  stamina: number;
}

/** Extracts only player cards from a mixed CardInPlay array. */
function playerCards(cards: CardInPlay[]): PlayerCard[] {
  return cards
    .map((c) => c.card)
    .filter((c): c is PlayerCard => c.type === "player");
}

/**
 * Computes all synergy ATK/DEF/stamina deltas for a board side (attack + defense combined).
 * GDD §15 line 317, §9, §17 lines 498-499.
 */
export function computeSynergies(
  allCards: CardInPlay[],
  captainId: string,
): SynergyDeltas {
  const players = playerCards(allCards);
  let atk = 0;
  let def = 0;
  let stamina = 0;

  const nations = players.map((p) => p.nation);
  const nationCounts: Map<string, number> = new Map();
  for (const n of nations) {
    nationCounts.set(n, (nationCounts.get(n) ?? 0) + 1);
  }

  const fwdCount = players.filter((p) => p.position === "FWD").length;
  const defCount = players.filter((p) => p.position === "DEF").length;
  const midCount = players.filter((p) => p.position === "MID").length;

  for (const [, count] of nationCounts) {
    if (count >= 3) {
      atk += CHEM_BONUS_ATK;
      def += CHEM_BONUS_DEF;
    }
  }

  if (fwdCount >= 2) {
    atk += STRIKE_BONUS_ATK;
  }

  if (defCount >= 3) {
    def += BACKLINE_BONUS_DEF;
  }

  if (midCount >= 2) {
    stamina += MIDFIELD_BONUS_STAMINA;
  }

  const captainPlayer = players.find((p) => p.id === captainId);
  if (captainPlayer) {
    const captainNation = captainPlayer.nation;
    const sameNationCount = players.filter(
      (p) => p.id !== captainId && p.nation === captainNation,
    ).length;
    if (sameNationCount > 0) {
      atk += CAPTAIN_PRIDE_ATK;
      def += CAPTAIN_PRIDE_DEF;
    }
  }

  return { atk, def, stamina };
}

/**
 * Per-card ATK synergy contribution.
 * Used by effectiveStats to compute the raw synergy bonus per player.
 * GDD §17 line 498 `atkSynergy(m, p)`.
 */
export function atkSynergy(allCards: CardInPlay[], captainId: string): number {
  return computeSynergies(allCards, captainId).atk;
}

/**
 * Per-card DEF synergy contribution.
 * GDD §17 line 499 `defSynergy(m, p)`.
 */
export function defSynergy(allCards: CardInPlay[], captainId: string): number {
  return computeSynergies(allCards, captainId).def;
}
