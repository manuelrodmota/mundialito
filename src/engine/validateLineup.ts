/**
 * WCC-012 — Per-round card cap & lineup validation (GDD v10 §6 / §17).
 *
 * Enforces the card cap (total player cards on board ≤ CARD_CAP(round))
 * and stamina budget (laneStamina(attack) + laneStamina(defense) ≤ maxStamina).
 * Applies the v10 star-core discount: when a lane has ≥1 premium, non-anchor
 * cards pay 50% of their cost (floor, min 1). All-common lanes pay full cost.
 * Tactical cards do not count toward the card cap (GDD §6 line 141).
 */

import type { Card, PlayerState } from "./types.ts";
import { CARD_CAP, COST_BY_RARITY, STAR_SYNERGY_DISCOUNT } from "./constants.ts";

/**
 * Computes the total stamina cost of a lane with the v10 star-core discount.
 * GDD §17 `laneStamina` lines 453-463.
 */
export function laneStamina(cards: Card[]): number {
  if (cards.length === 0) return 0;

  const playerCards = cards.filter((c) => c.type === "player");
  if (playerCards.length === 0) return 0;

  const hasPremium = playerCards.some((c) => c.rarity !== "common");

  if (!hasPremium) {
    return playerCards.reduce((sum, c) => sum + COST_BY_RARITY[c.rarity], 0);
  }

  let maxCost = -Infinity;
  let anchorIdx = -1;
  for (let i = 0; i < playerCards.length; i++) {
    const cost = COST_BY_RARITY[playerCards[i]!.rarity];
    if (cost > maxCost) {
      maxCost = cost;
      anchorIdx = i;
    }
  }

  let total = 0;
  for (let i = 0; i < playerCards.length; i++) {
    const base = COST_BY_RARITY[playerCards[i]!.rarity];
    if (i === anchorIdx) {
      total += base;
    } else {
      total += Math.max(1, Math.floor(base * STAR_SYNERGY_DISCOUNT));
    }
  }
  return total;
}

/**
 * Returns true when the committed board is within both the card cap and stamina budget.
 * GDD §17 `validLineup` lines 465-468.
 */
export function validLineup(state: PlayerState, round: number): boolean {
  const attackCards = state.board.attack
    .map((c) => c.card)
    .filter((c) => c.type === "player");
  const defenseCards = state.board.defense
    .map((c) => c.card)
    .filter((c) => c.type === "player");

  const totalPlayerCards = attackCards.length + defenseCards.length;
  if (totalPlayerCards > CARD_CAP(round)) return false;

  const staminaUsed = laneStamina(attackCards) + laneStamina(defenseCards);
  if (staminaUsed > state.stamina) return false;

  return true;
}
