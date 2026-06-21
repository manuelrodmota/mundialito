// GDD v10 §15 / §17 — every engine knob in one place.
// Changing a balance value means editing exactly this file.

import type { Rarity, Formation } from "./types.ts";

/** Rarity multiplier applied to each card's stat contribution. §17 */
export const RARITY_MULT: Record<Rarity, number> = {
  common: 1.0,
  rare: 1.1,
  epic: 1.2,
  legendary: 1.3,
} as const satisfies Record<Rarity, number>;

/** Per-round stamina cost to field a card (v10 gentle curve). §17 */
export const COST_BY_RARITY: Record<Rarity, number> = {
  common: 2,
  rare: 2,
  epic: 3,
  legendary: 4,
} as const satisfies Record<Rarity, number>;

/**
 * v10 diminishing-returns weights for lane stacking.
 * Sort contributions high→low then multiply by the corresponding weight.
 * Beyond index 5 a card contributes nothing. §17
 */
export const STACK_WEIGHTS = [1.0, 0.85, 0.7, 0.55, 0.4, 0.25] as const;

/**
 * v10 star-core stamina discount.
 * Non-anchor cards in a lane that contains ≥1 premium pay this fraction of
 * their cost (rounded down, minimum 1). All-common lanes receive no discount. §17
 */
export const STAR_SYNERGY_DISCOUNT = 0.5;

// xG scoring curve (v10.1-tuned — balance pass for scoring tempo).
// Raised floor + lower threshold convert the slowly-accumulating xG into goals
// faster, killing the "+0.05 grind" where balanced/defensive matchups stalled
// at the floor and dragged to extra time. See scripts/balanceSim.ts. §7 / §17
export const XG_FLOOR = 0.1;
export const XG_SLOPE = 180;
export const XG_CAP = 0.55;
/** xG that banks one goal (the meter crossing). v10.1: 0.80 (was an implicit 1.0). §7 */
export const GOAL_THRESHOLD = 0.8;
/**
 * v10.1 defense coefficient — how much of effective DEF is subtracted from the
 * opponent's ATK in the xG delta. <1.0 stops a stacked back line (bunkering
 * underdogs, defensive formations) from out-suppressing a star attack and
 * dragging matches to a 0–0 → extra-time grind. Defense still clearly suppresses
 * (a strong line concedes measurably less), just no longer to a standstill. §7 / §19.9
 */
export const DEF_COEFF = 0.9;

/** Per-round stamina budget. Ramps at R6 and R9. §15 / §17 */
export function STAMINA(round: number): number {
  return round <= 5 ? 8 : round <= 8 ? 10 : 12;
}

/** Maximum player cards fielded per round (attack + defense combined). §15 / §17 */
export function CARD_CAP(round: number): number {
  return round <= 5 ? 4 : round <= 8 ? 5 : 6;
}

/** ATK and DEF multipliers per formation. §15 */
export const FORMATIONS: Record<Formation, { atkMult: number; defMult: number }> = {
  offensive: { atkMult: 1.18, defMult: 0.82 },
  balanced: { atkMult: 1.0, defMult: 1.0 },
  defensive: { atkMult: 0.82, defMult: 1.18 },
} as const satisfies Record<Formation, { atkMult: number; defMult: number }>;

// Match structure. §15
export const MERCY_LEAD = 3;
export const ROUND_CAP = 10;
export const HALFTIME_ROUND = 5;
export const ET_ROUND_CAP = 5;
export const ET_XG_MULT = 2;

// Hand and tactical limits. §15
export const HAND_SIZE = 5;
export const TACTICALS_PER_HALF = 2;
export const RUN_TACTICAL_DECK_CAP = 4;

// Synergy bonuses. §15
export const CHEM_BONUS_ATK = 2;
export const CHEM_BONUS_DEF = 2;
export const STRIKE_BONUS_ATK = 5;
export const BACKLINE_BONUS_DEF = 8;
export const MIDFIELD_BONUS_STAMINA = 1;

// Captain's Pride bonus. §15
export const CAPTAIN_PRIDE_ATK = 2;
export const CAPTAIN_PRIDE_DEF = 2;

// Fatigue. §15
export const FATIGUE_MAX = 30;
export const FATIGUE_DIV = 60;
/** Fatigue gained per round of defending. §15 */
export const FATIGUE_GAIN = 3;
/** Fatigue lost per round of attacking (rest). §15 */
export const FATIGUE_LOSS = 3;

// Tactical xG values. §15
export const COUNTER_ATTACK_XG = 0.4;
export const MOMENTUM_XG = 0.1;
