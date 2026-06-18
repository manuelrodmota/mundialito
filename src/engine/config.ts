import type { Tuning } from "./types.ts";

/**
 * Default tuning knobs for the v8 match engine.
 * All engine magic numbers live here — changing any value and re-running
 * requires zero edits to engine.ts.
 *
 * Mirrored verbatim from engine8.js::DEF_T (GDD v8 §15).
 */
export const DEFAULT_TUNING = {
  // Win / match length
  mercyLead: 3,
  roundCap: 10,
  halftimeRound: 5,
  etRoundCap: 5,
  etXgMult: 2,

  // xG curve (GDD §7) — v10-tuned (was /150, 0.60)
  xgFloor: 0.05,
  xgSlope: 210,
  xgCap: 0.5,

  // Hand (GDD §6 v8)
  openingHand: 5,
  handSize: 5,
  handCap: 12,
  tacticalsPerHalf: 2,

  // Stamina / card cap ramps (GDD §6 v5)
  staminaPerRound: 8,
  slotBudget: 10,
  cardCapBase: 4,

  // Rarity multipliers (GDD §4)
  rarityMult: {
    common: 1.0,
    rare: 1.1,
    epic: 1.2,
    legendary: 1.3,
  },

  // Synergy bonuses
  prideBonus: 2,
  chemBonus: 2,
  formationSwing: 25,

  // Fatigue (GDD §8)
  fatigueMax: 30,
  fatigueDiv: 60,
  fatigueRate: 3,
  pressFatigue: 6,
  pressDef: 10,

  // Tactical xG values (GDD §12)
  counterXg: 0.40,
  momentumXg: 0.10,
  tikiTakaXg: 0.20,
  longBallXg: 0.45,
  penaltyXg: 0.85,
  hogXg: 1.0,

  // Defensive bonuses
  fortressDef: 8,
  gkSaveXg: 0.06,

  intent: true,

  // v10 balance pass — LOCKED from the Monte-Carlo sim (GDD v10 §15/§17). These were
  // experimental toggles while tuning; they are now the shipping defaults.
  stackWeights: [1.0, 0.85, 0.7, 0.55, 0.4, 0.25], // diminishing returns per lane (sorted desc)
  starSynergyDiscount: true, // lane with ≥1 premium: non-anchor cards half-price
  synergyDiscount: 0.5,
  synergyMinCost: 1,
  costByRarity: { common: 2, rare: 2, epic: 3, legendary: 4 }, // gentle per-round field cost
} satisfies Tuning;
